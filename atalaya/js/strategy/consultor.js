/* Atalaya · Sistema estratégico · Diagnóstico e informe 360 de cada módulo
   Dentro de cada módulo, un panel «Llevarlo a la operativa» con cinco pestañas:
   · Qué es: propósito, el módulo a su máxima expresión, lo que añadiría un consultor y la cadencia de seguimiento.
   · Lo que falta: los datos que el módulo necesita y si ya están aterrizados (zona de origen o a mano).
   · Preguntas: el diagnóstico de cómo se gestiona hoy; cada respuesta débil genera una acción.
   · Objetivos: las metas que fija el empresario (indicador, valor actual, meta, fecha y responsable).
   · Plan de acción: lo que sale de las respuestas, los objetivos, los hallazgos, los riesgos y los datos que faltan,
     ordenado a 30, 60 y 90 días, con estado y responsable editables, y enviable al plan de empresa.
   El informe 360 recoge todo: foto actual, madurez, objetivos, plan de acción y cómo llevarlo a la operativa. */
(function () {
  const A = window.Atalaya, S = A.strat, F = A.fmt;
  const { $, $$, esc } = S;
  const D = (id) => A.C360 && A.C360[id];
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  S.defaults.c360 = {};
  const st360 = (id) => { const c = S.state.c360 || (S.state.c360 = {}); return c[id] || (c[id] = { r: {}, obj: [], plan: {}, notas: '' }); };
  S.c360 = st360;

  /* ---------- Valores actuales de los indicadores ---------- */
  const parseKpi = (v) => {
    const t = String(v == null ? '' : v).replace(/<[^>]+>/g, '').trim(); if (!t) return null;
    const m = t.match(/-?[\d.]+(?:,\d+)?|-?\d+(?:\.\d+)?/); if (!m) return null;
    let n = m[0]; n = /,/.test(n) ? n.replace(/\./g, '').replace(',', '.') : /\.\d{3}(\D|$)/.test(n) ? n.replace(/\./g, '') : n; let x = parseFloat(n);
    if (/M€/.test(t)) x *= 1e6; else if (/k€/.test(t)) x *= 1e3;
    return isFinite(x) ? x : null;
  };
  const FN = {
    salud() { const k = S.allKpis().filter((x) => x.st); return k.length ? Math.round(k.reduce((a, x) => a + (x.st === 'ok' ? 100 : x.st === 'warn' ? 55 : 15), 0) / k.length) : null; },
    riesgosAltos() { return S.allRisks().filter((r) => r.estado === 'stop').length; }
  };
  function actual(modId, o) {
    try {
      if (o.fn && FN[o.fn]) return FN[o.fn]();
      const m = S.mod(modId); if (!m || !m.kpis) return null;
      const k = m.kpis().find((x) => x.k === (o.kpi || o.k)); return k ? parseKpi(k.v) : null;
    } catch (e) { return null; }
  }
  const fmtV = (v, u) => (v == null || v === '' ? '—' : u === '€' ? F.eur(v) : u === '%' ? F.pct(v) : F.num(v) + (u && !/^(riesgos|clientes|zonas)$/.test(u) ? ' ' + u : ''));

  /* ---------- Madurez ---------- */
  function madurez(id) {
    const d = D(id), r = st360(id).r; if (!d) return null;
    const val = (q) => { const v = r[q.id]; if (v == null || v === '') return null; return q.tipo === 'escala' ? (v - 1) / 4 * 100 : (v === q.malo ? 0 : 100); };
    const dims = {}; let tot = 0, n = 0;
    d.preguntas.forEach((q) => { const v = val(q); if (v == null) return; (dims[q.dim] = dims[q.dim] || []).push(v); tot += v; n++; });
    return { score: n ? Math.round(tot / n) : null, resp: n, total: d.preguntas.length, dims: Object.keys(dims).map((k) => ({ dim: k, v: Math.round(dims[k].reduce((a, b) => a + b, 0) / dims[k].length) })) };
  }

  /* ---------- Plan de acción ---------- */
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const PRI = { Alta: 0, Media: 1, Baja: 2 };
  function plan(id) {
    const d = D(id), c = st360(id), m = S.mod(id); if (!d || !m) return [];
    const out = [];
    const add = (x) => { if (!x.accion || out.some((y) => y.accion === x.accion)) return; out.push(Object.assign({ resp: d.resp, prio: 'Media', plazo: 60 }, x)); };
    // 1. Datos que faltan: sin ellos el diagnóstico es parcial
    S.needStatus(id).filter((n) => !n.ok).forEach((n) => add({ id: 'd:' + n.i, accion: `Aterrizar el dato: ${n.t}`, origen: 'Datos que faltan', prio: 'Alta', plazo: 15, resp: 'Administración', kpi: 'Datos del módulo completos' }));
    // 2. Respuestas del empresario
    d.preguntas.forEach((q) => {
      const v = c.r[q.id]; if (v == null || v === '') return;
      const bad = q.tipo === 'escala' ? v <= 3 : v === q.malo; if (!bad) return;
      add({ id: 'q:' + q.id, accion: q.accion.t, origen: `Diagnóstico · ${q.dim}`, motivo: q.q, prio: q.tipo === 'escala' ? (v <= 2 ? 'Alta' : 'Media') : 'Alta', plazo: q.accion.plazo, resp: q.accion.resp, kpi: q.accion.kpi });
    });
    // 3. Objetivos que fija el empresario
    c.obj.forEach((o, i) => {
      if (o.meta === '' || o.meta == null) return;
      const dias = o.fecha ? Math.max(7, Math.round((new Date(o.fecha) - Date.now()) / 864e5)) : 180;
      add({ id: 'o:' + i, accion: `${o.dir === 'bajar' ? 'Bajar' : 'Subir'} «${o.k}» de ${fmtV(o.actual, o.u)} a ${fmtV(+o.meta, o.u)}${o.fecha ? ' antes del ' + new Date(o.fecha).toLocaleDateString('es-ES') : ''}`, origen: 'Objetivo del empresario', prio: 'Alta', plazo: dias, resp: o.resp || d.resp, kpi: o.k });
    });
    // 4. Hallazgos con impacto y 5. riesgos del módulo
    let Fi = [], R = []; try { Fi = m.findings ? m.findings() : []; } catch (e) { /* sin hallazgos */ } try { R = m.risks ? m.risks() : []; } catch (e) { /* sin riesgos */ }
    Fi.forEach((f) => add({ id: 'f:' + hash(f.accion || ''), accion: f.accion, origen: 'Hallazgo en tus datos', motivo: f.hallazgo, prio: (f.impactoEUR || 0) > 20000 ? 'Alta' : 'Media', plazo: f.plazo || 90, impacto: f.impactoEUR || 0 }));
    R.filter((r) => r.estado !== 'ok' && r.mitigacion).forEach((r) => add({ id: 'r:' + hash(r.nombre), accion: r.mitigacion, origen: 'Riesgo', motivo: r.nombre, prio: r.estado === 'stop' ? 'Alta' : 'Media', plazo: r.estado === 'stop' ? 30 : 60 }));
    out.forEach((x) => { const ov = c.plan[x.id] || {}; x.estado = ov.estado || 'Pendiente'; if (ov.resp) x.resp = ov.resp; if (ov.fecha) x.fecha = ov.fecha; x.h = x.plazo <= 30 ? 0 : x.plazo <= 60 ? 1 : x.plazo <= 90 ? 2 : 3; });
    out.sort((a, b) => a.h - b.h || PRI[a.prio] - PRI[b.prio] || (b.impacto || 0) - (a.impacto || 0));
    return out;
  }
  const HOR = ['Primeros 30 días', 'De 31 a 60 días', 'De 61 a 90 días', 'Más de 90 días'];
  S.plan360 = plan; S.madurez360 = madurez;

  /* ---------- Panel en cada módulo ---------- */
  let abierto = null, pest = {};
  function panel(id) {
    const d = D(id), host = $('#stPanel'); if (!d || !host) return;
    const old = $('.c360', host); if (old) old.remove();
    const c = st360(id), need = S.needStatus(id), falta = need.filter((n) => !n.ok), mz = madurez(id), P = plan(id);
    const tab = pest[id] || (falta.length ? 'falta' : mz.resp < mz.total ? 'preguntas' : 'plan');
    const box = document.createElement('section'); box.className = 'c360 glass'; box.dataset.mod = id;
    const isOpen = abierto === id;
    box.innerHTML = `<button class="c3-top" aria-expanded="${isOpen}"><span class="c3-orb" aria-hidden="true"></span><span class="c3-tt"><b>Llevar «${esc(S.mod(id).nombre)}» a la operativa</b><small>Diagnóstico 360: datos, preguntas, objetivos y plan de acción para el informe</small></span><span class="spacer"></span>
        <span class="c3-chips"><span class="c3-chip ${falta.length ? 'warn' : 'ok'}">${falta.length ? (falta.length === 1 ? 'Falta 1 dato' : `Faltan ${falta.length} datos`) : 'Datos completos'}</span><span class="c3-chip ${mz.resp === mz.total ? 'ok' : ''}">Preguntas ${mz.resp}/${mz.total}</span><span class="c3-chip">${pl(c.obj.filter((o) => o.meta !== '' && o.meta != null).length, 'objetivo', 'objetivos')}</span><span class="c3-chip">${pl(P.length, 'acción', 'acciones')}</span></span><i class="c3-arrow" aria-hidden="true">▾</i></button>
      ${falta.length && !isOpen ? `<div class="c3-falta">Falta por aterrizar: ${falta.slice(0, 3).map((n) => `<b>${esc(n.t)}</b>`).join(' · ')}${falta.length > 3 ? '…' : ''} <button class="btn ghost" data-origen>Subir en Origen</button></div>` : ''}
      <div class="c3-body" ${isOpen ? '' : 'hidden'}>
        <div class="tabs c3-tabs" role="tablist">${[['que', 'Qué es'], ['falta', `Lo que falta${falta.length ? ` (${falta.length})` : ''}`], ['preguntas', `Preguntas ${mz.resp}/${mz.total}`], ['objetivos', 'Objetivos'], ['plan', `Plan de acción (${P.length})`]].map(([k, l]) => `<button role="tab" data-p="${k}" aria-selected="${k === tab}">${l}</button>`).join('')}</div>
        <div class="c3-pane">${pane(id, tab)}</div>
        <div class="c3-foot"><span class="small muted">${mz.resp < mz.total ? `Responde las preguntas: el plan de acción y el informe salen de tus respuestas.` : 'Diagnóstico completo.'}</span><span class="spacer"></span><button class="btn solid" data-rep>Generar informe 360</button></div>
      </div>`;
    const head = $('.hm-kpis', host) || $('.st-head', host); if (head) head.after(box); else host.prepend(box);
    wire(box, id);
  }
  function pane(id, tab) {
    const d = D(id), c = st360(id);
    if (tab === 'que') return `<div class="c3-grid"><div><h5>Qué pretendemos trabajar</h5><p>${esc(d.proposito)}</p><h5>El módulo a su máxima expresión</h5><ul>${d.maxima.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h5>Lo que añadiría un consultor para llevarlo a la operativa</h5><ul>${d.consultor.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><h5>Cadencia de seguimiento</h5><table class="c3-tab"><tbody>${d.cadencia.map(([f, q, w]) => `<tr><td><b>${esc(f)}</b></td><td>${esc(q)}</td><td class="muted">${esc(w)}</td></tr>`).join('')}</tbody></table></div></div>`;
    if (tab === 'falta') {
      const need = S.needStatus(id);
      return `<p class="small muted">Lo que este módulo necesita para darte un diagnóstico real. Súbelo en la zona de origen (se reparte solo) o, si ya lo has metido a mano en este módulo, márcalo.</p>
        <div class="c3-need">${need.map((n) => `<div class="c3-n ${n.ok ? 'ok' : ''}"><i>${n.ok ? '✓' : '!'}</i><div><b>${esc(n.t)}</b><span class="small muted">${n.ok ? esc(n.via) : esc((A.C360_TIPOS[n.tipo] || {}).d || '')}</span></div><span class="spacer"></span>${n.ok && !n.manual ? '' : `<label class="small"><input type="checkbox" data-man="${n.i}" ${n.manual ? 'checked' : ''}> Lo he metido a mano</label>`}${n.ok ? '' : '<button class="btn ghost" data-origen>Subir en Origen</button>'}</div>`).join('')}</div>`;
    }
    if (tab === 'preguntas') {
      const ESC = ['Nada o casi nada', 'Poco', 'A medias', 'Bastante', 'Sistemático y medido'];
      return `<p class="small muted">Contesta con sinceridad cómo se trabaja hoy. Cada respuesta débil se convierte en una acción del plan, con responsable y plazo.</p>
        <ol class="c3-qs">${d.preguntas.map((q) => { const v = c.r[q.id]; return `<li><div class="c3-q"><span class="c3-dim">${esc(q.dim)}</span><span>${esc(q.q)}</span></div>
          <div class="c3-a">${q.tipo === 'escala' ? [1, 2, 3, 4, 5].map((n) => `<button data-q="${q.id}" data-v="${n}" aria-pressed="${v === n}" title="${ESC[n - 1]}">${n}</button>`).join('') + `<small class="muted">${v ? ESC[v - 1] : '1 = nada · 5 = sistemático'}</small>` : ['si', 'no'].map((n) => `<button data-q="${q.id}" data-v="${n}" aria-pressed="${v === n}">${n === 'si' ? 'Sí' : 'No'}</button>`).join('')}
          ${v != null && v !== '' && (q.tipo === 'escala' ? v <= 3 : v === q.malo) ? `<span class="c3-gen">→ ${esc(q.accion.t)}</span>` : ''}</div></li>`; }).join('')}</ol>
        <label class="field"><span class="small muted">Notas del empresario (aparecen en el informe)</span><textarea class="input" data-notas rows="3" placeholder="Contexto, prioridades, limitaciones, lo que ya se ha intentado…">${esc(c.notas || '')}</textarea></label>`;
    }
    if (tab === 'objetivos') {
      const sug = d.objetivos.filter((o) => !c.obj.some((x) => x.k === o.k));
      return `<p class="small muted">Fija tus metas: el valor actual sale de tus datos (puedes corregirlo). Cada objetivo con meta se convierte en una acción del plan y se sigue en el informe.</p>
        ${sug.length ? `<div class="row c3-sug">${sug.map((o) => `<button class="btn ghost" data-sug="${esc(o.k)}">+ ${esc(o.k)}</button>`).join('')}</div>` : ''}
        <div class="table-wrap"><table class="c3-obj"><thead><tr><th style="text-align:left">Indicador</th><th>Actual</th><th>Meta</th><th>Fecha</th><th style="text-align:left">Responsable</th><th></th></tr></thead><tbody>
        ${c.obj.map((o, i) => `<tr><td style="text-align:left"><input class="txt" data-o="${i}" data-k="k" value="${esc(o.k)}"><small class="muted">${o.dir === 'bajar' ? '↓ bajar' : '↑ subir'}${o.u ? ' · ' + esc(o.u) : ''}</small></td><td><input data-o="${i}" data-k="actual" value="${o.actual == null ? '' : esc(o.actual)}"></td><td><input data-o="${i}" data-k="meta" value="${o.meta == null ? '' : esc(o.meta)}" placeholder="${o.sug != null ? esc(o.sug) : ''}"></td><td><input type="date" data-o="${i}" data-k="fecha" value="${esc(o.fecha || '')}"></td><td style="text-align:left"><input class="txt" data-o="${i}" data-k="resp" value="${esc(o.resp || '')}" placeholder="${esc(d.resp)}"></td><td><button class="icon-btn" data-delo="${i}" aria-label="Quitar objetivo">×</button></td></tr>`).join('') || '<tr><td colspan="6" class="small muted" style="text-align:left">Añade un objetivo sugerido o uno propio.</td></tr>'}
        </tbody></table></div><button class="btn ghost" data-newo>Añadir objetivo propio</button>`;
    }
    const P = plan(id);
    if (!P.length) return '<p class="small muted">Todavía no hay acciones: responde las preguntas, fija objetivos o carga los datos que faltan.</p>';
    return `<p class="small muted">Cada acción viene de algo concreto: un dato que falta, una respuesta, un objetivo, un hallazgo o un riesgo. Cambia el estado, el responsable o la fecha y se guarda.</p>
      ${HOR.map((h, hi) => { const L = P.filter((x) => x.h === hi); return L.length ? `<h5>${h}</h5><div class="c3-acts">${L.map((x) => `<div class="c3-act p-${x.prio.toLowerCase()} ${x.estado === 'Hecha' ? 'done' : ''}"><div><b>${esc(x.accion)}</b><span class="small muted">${esc(x.origen)}${x.motivo ? ' · ' + esc(x.motivo) : ''}${x.impacto ? ' · ' + F.eur(x.impacto) + ' al año' : ''}${x.kpi ? ' · Se mide con: ' + esc(x.kpi) : ''}</span></div>
        <div class="c3-ctl"><span class="c3-pri">${x.prio}</span><select data-pe="${esc(x.id)}">${['Pendiente', 'En curso', 'Hecha'].map((e) => `<option ${e === x.estado ? 'selected' : ''}>${e}</option>`).join('')}</select><input class="txt" data-pr="${esc(x.id)}" value="${esc(x.resp)}" aria-label="Responsable"><input type="date" data-pf="${esc(x.id)}" value="${esc(x.fecha || '')}" aria-label="Fecha"></div></div>`).join('')}</div>` : ''; }).join('')}
      <div class="row mt"><button class="btn ghost" data-toplan>Enviar al plan de empresa</button><span data-mesa></span><span class="small" data-plmsg></span></div>`;
  }
  function refresh(box, id, tab) { if (tab) pest[id] = tab; abierto = id; const y = scrollY; panel(id); scrollTo({ top: y }); }
  function wire(box, id) {
    const c = st360(id), d = D(id);
    $('.c3-top', box).onclick = () => { abierto = abierto === id ? null : id; const y = scrollY; panel(id); scrollTo({ top: y }); };
    $$('[data-origen]', box).forEach((b) => b.onclick = (e) => { e.stopPropagation(); S.show('origen'); });
    $$('[data-p]', box).forEach((b) => b.onclick = () => refresh(box, id, b.dataset.p));
    $$('[data-man]', box).forEach((b) => b.onchange = () => { S.needMark(id, +b.dataset.man, b.checked); refresh(box, id); });
    $$('[data-q]', box).forEach((b) => b.onclick = () => { const v = /^\d$/.test(b.dataset.v) ? +b.dataset.v : b.dataset.v; c.r[b.dataset.q] = c.r[b.dataset.q] === v ? null : v; S.save(); refresh(box, id); });
    const nt = $('[data-notas]', box); if (nt) nt.onchange = () => { c.notas = nt.value; S.save(); };
    $$('[data-sug]', box).forEach((b) => b.onclick = () => { const o = d.objetivos.find((x) => x.k === b.dataset.sug); c.obj.push({ k: o.k, u: o.u, dir: o.dir, actual: actual(id, o), meta: '', sug: o.sug, fecha: '', resp: '', kpi: o.kpi, fn: o.fn }); S.save(); refresh(box, id); });
    const no = $('[data-newo]', box); if (no) no.onclick = () => { c.obj.push({ k: 'Nuevo objetivo', u: '', dir: 'subir', actual: '', meta: '', fecha: '', resp: '' }); S.save(); refresh(box, id); };
    $$('[data-o]', box).forEach((inp) => inp.onchange = () => { const o = c.obj[+inp.dataset.o]; const k = inp.dataset.k; o[k] = (k === 'actual' || k === 'meta') ? (inp.value.trim() === '' ? '' : S.num(inp.value)) : inp.value; S.save(); if (k === 'meta' || k === 'fecha') refresh(box, id); });
    $$('[data-delo]', box).forEach((b) => b.onclick = () => { c.obj.splice(+b.dataset.delo, 1); S.save(); refresh(box, id); });
    const setP = (k, f) => (inp) => inp.onchange = () => { const x = c.plan[inp.dataset[k]] || (c.plan[inp.dataset[k]] = {}); x[f] = inp.value; S.save(); if (f === 'estado') refresh(box, id); };
    $$('[data-pe]', box).forEach(setP('pe', 'estado')); $$('[data-pr]', box).forEach(setP('pr', 'resp')); $$('[data-pf]', box).forEach(setP('pf', 'fecha'));
    const ms = $('[data-mesa]', box); if (ms && A.mesa && A.mesa.boton) { const m = S.mod(id); ms.appendChild(A.mesa.boton(() => plan(id).filter((x) => x.estado !== 'Hecha').map((x) => ({ t: x.accion, resp: x.resp || '', area: 'Estrategia', fecha: x.fecha || new Date(Date.now() + (x.plazo || 90) * 864e5).toISOString().slice(0, 10), mundo: 'estrategia', origen: `${(m && m.nombre) || id} · ${x.origen}`, oid: 'est:360:' + id + ':' + x.id, impacto: x.prio === 'Alta' ? 5 : x.prio === 'Media' ? 3 : 2, clave: x.prio === 'Alta' })))); }
    const tp = $('[data-toplan]', box); if (tp) tp.onclick = () => {
      const pl = S.state.plan; if (!pl || !Array.isArray(pl.acciones)) return;
      const area = S.mod(id).grupo === 'Visión' ? 'Dirección' : S.mod(id).grupo; let n = 0;
      plan(id).forEach((x) => { if (pl.acciones.some((a) => a.accion === x.accion)) return; pl.acciones.push({ area, accion: x.accion, responsable: x.resp || '', inicio: new Date().toISOString().slice(0, 10), fin: x.fecha || new Date(Date.now() + x.plazo * 864e5).toISOString().slice(0, 10), estado: x.estado === 'Hecha' ? 'Hecha' : 'Pendiente' }); n++; });
      S.save(); $('[data-plmsg]', box).textContent = n ? `${n} acciones añadidas al plan de empresa.` : 'Ya estaban todas en el plan de empresa.';
    };
    const rp = $('[data-rep]', box); if (rp) rp.onclick = () => S.report360(S.mod(id));
  }
  S.onShowExtra = (S.onShowExtra || []).concat([(id) => { if (D(id)) panel(id); }]);

  /* ---------- Informe 360 ---------- */
  S.report360 = function (m) {
    const I = A.informe, d = D(m.id); if (!d) return S.moduleReport(m);
    I.reset();
    const P = S.reportParts(m), c = st360(m.id), mz = madurez(m.id), need = S.needStatus(m.id), falta = need.filter((n) => !n.ok), PL = plan(m.id);
    const o = S.origen ? S.origen() : { docs: [], archivos: [] };
    const docs = (o.docs || []).filter((x) => !x.temas || !x.temas.length || x.temas.includes(m.id));
    const objs = c.obj.filter((x) => x.meta !== '' && x.meta != null);
    const altas = PL.filter((x) => x.prio === 'Alta' && x.estado !== 'Hecha');
    const scs = [P.sc, mz.score].filter((x) => x != null); const nota = scs.length ? Math.round(scs.reduce((a, b) => a + b, 0) / scs.length) : null;
    const stG = nota === null ? null : nota >= 70 ? 'ok' : nota >= 50 ? 'warn' : 'stop';
    const resumen = `<p><b>${esc(m.nombre)}${nota === null ? '' : `: ${nota}/100 ${I.pill(stG)}`}.</b> ${P.sc !== null ? `Los indicadores dan ${P.sc}/100` : 'Sin indicadores con semáforo'}${mz.score !== null ? ` y la madurez de la gestión, ${mz.score}/100 (${mz.resp} de ${mz.total} preguntas respondidas)` : ' y aún no se ha respondido el diagnóstico'}. ${falta.length ? `${falta.length === 1 ? 'Falta 1 dato' : `Faltan ${falta.length} datos`} por aterrizar, así que parte del análisis usa datos de ejemplo o estimados.` : 'Los datos necesarios están cargados.'} ${objs.length ? `El empresario ha fijado ${objs.length} objetivo${objs.length > 1 ? 's' : ''}.` : ''}</p>
      <p><b>${pl(PL.length, 'acción', 'acciones')}</b> en el plan, ${altas.length} de prioridad alta.${altas[0] ? ` Lo primero: ${esc(altas[0].accion)}` : ''}</p>`;
    const needT = I.table(['Dato', 'Estado', 'Fuente'], need.map((n) => [n.t, { h: I.pill(n.ok ? 'ok' : 'warn', n.ok ? 'Aterrizado' : 'Falta') }, n.ok ? n.via : (A.C360_TIPOS[n.tipo] || {}).d || '']));
    const dimT = mz.dims.length ? `<div class="rp-bars">${mz.dims.map((x) => `<div class="rp-bar"><span>${esc(x.dim)}</span><i><b style="width:${x.v}%"></b></i><em>${x.v}</em></div>`).join('')}</div>` : '';
    const ESC = ['1 · Nada', '2 · Poco', '3 · A medias', '4 · Bastante', '5 · Sistemático'];
    const qT = I.table(['Área', 'Pregunta', 'Respuesta', 'Lectura'], d.preguntas.map((q) => { const v = c.r[q.id]; const has = v != null && v !== ''; const bad = has && (q.tipo === 'escala' ? v <= 3 : v === q.malo); return [q.dim, q.q, has ? (q.tipo === 'escala' ? ESC[v - 1] : v === 'si' ? 'Sí' : 'No') : 'Sin responder', { h: has ? I.pill(bad ? (q.tipo === 'escala' && v <= 2 || q.tipo === 'sino' ? 'stop' : 'warn') : 'ok', bad ? 'Genera acción' : 'Bien') : '<span class="rp-muted">—</span>' }]; }));
    const objT = objs.length ? I.table(['Indicador', 'Actual', 'Meta', 'Brecha', 'Fecha', 'Responsable'], objs.map((x) => { const a = +x.actual, mt = +x.meta; const gap = isFinite(a) && x.actual !== '' ? mt - a : null; return [x.k, fmtV(x.actual === '' ? null : x.actual, x.u), fmtV(mt, x.u), gap == null ? '—' : (gap > 0 ? '+' : '') + fmtV(gap, x.u), x.fecha ? new Date(x.fecha).toLocaleDateString('es-ES') : '—', x.resp || d.resp]; }), { num: [1, 2, 3] }) : I.callout('Todavía no se han fijado objetivos. En el panel «Llevar a la operativa» → Objetivos tienes los sugeridos para este módulo.', 'warn');
    const planH = PL.length ? HOR.map((h, hi) => { const L = PL.filter((x) => x.h === hi); return L.length ? `<h3>${h}</h3>` + I.table(['Prioridad', 'Acción', 'Por qué', 'Responsable', 'Se mide con', 'Estado'], L.map((x) => [{ h: I.pill(x.prio === 'Alta' ? 'stop' : x.prio === 'Media' ? 'warn' : 'ok', x.prio) }, x.accion, x.origen + (x.motivo ? ': ' + x.motivo : '') + (x.impacto ? ` (${F.eur(x.impacto)} al año)` : ''), x.resp || '', x.kpi || '—', x.estado])) : ''; }).join('') : '<p class="rp-muted">Sin acciones todavía.</p>';
    const cadT = I.table(['Frecuencia', 'Qué se revisa', 'Quién'], d.cadencia);
    const html = I.cover({ tipo: 'Informe 360', kicker: 'Sistema estratégico · ' + m.grupo, titulo: m.nombre, subtitulo: d.pregunta, empresa: S.sim.empresaNombre, sector: A.SECTORS[S.sim.sector].nombre })
      + I.summary('Resumen ejecutivo', resumen, stG)
      + I.section('Qué pretendemos trabajar', `<p>${esc(d.proposito)}</p><h3>El módulo a su máxima expresión</h3><ul>${d.maxima.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)
      + I.section('Datos de partida', needT + (docs.length ? `<h3>Documentación de contexto</h3><ul>${docs.map((x) => `<li><b>${esc(x.nombre)}</b> <span class="rp-muted">· ${F.num(x.chars)} caracteres</span></li>`).join('')}</ul>` : '') + (falta.length ? I.callout(`<b>Para completar el diagnóstico:</b> ${falta.map((n) => esc(n.t)).join(' · ')}. Súbelo en la zona de origen y vuelve a generar el informe.`, 'warn') : ''), 'Lo que este módulo necesita y de dónde ha salido cada dato.')
      + I.section('Foto actual', (P.tiles.length ? I.kpis(P.tiles) : '') + (P.detalle || '<p class="rp-muted">Sin análisis disponible.</p>'))
      + (() => { const ev = S.evolucionDe && S.evolucionDe(m.id); if (!ev || !ev.rows.length) return ''; const fd = (x) => new Date(x.fecha).toLocaleDateString('es-ES'); const sp = (st) => (st ? I.pill(st, S.stName[st]) : ''); return I.section('Evolución', I.table(['Indicador', fd(ev.a), fd(ev.b)], ev.rows.map((r) => [r.k, { h: `${esc(r.ta)} ${sp(r.sa)}` }, { h: `${esc(r.tb)} ${sp(r.sb)}` }])), `Del primer corte del diagnóstico guardado (${esc(ev.a.etiqueta)}) al último (${esc(ev.b.etiqueta)}).`); })()
      + I.section('Madurez de la gestión', (mz.score !== null ? `<p>Madurez global: <b>${mz.score}/100</b>. Por áreas de gestión:</p>${dimT}` : I.callout('El diagnóstico está sin responder: el plan de acción se apoya solo en los datos. Responde las preguntas del panel para completarlo.', 'warn')) + qT, 'Cómo se gestiona hoy, según las respuestas del empresario. Cada respuesta débil genera una acción.')
      + I.section('Objetivos', objT)
      + I.section('Riesgos', I.risks(P.R), 'Nivel = probabilidad × impacto (de 1 a 25). Verde por debajo de 8, ámbar hasta 14, rojo desde 15.')
      + I.section('Hallazgos y mejoras', I.findings(P.Fi, F.eur))
      + I.section('Plan de acción', planH, 'Ordenado por plazo y prioridad. Cada acción indica de dónde sale y con qué indicador se medirá.')
      + I.section('Cómo llevarlo a la operativa', `<h3>Lo que añadiría un consultor</h3><ul>${d.consultor.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><h3>Cadencia de seguimiento</h3>${cadT}`)
      + (c.notas ? I.section('Notas del empresario', `<p>${esc(c.notas).replace(/\n/g, '<br>')}</p>`) : '')
      + I.section('Próximos pasos', `<ol class="rp-steps">${(altas.length ? altas : PL).slice(0, 5).map((x) => `<li><b>${esc(x.accion)}</b> <span class="rp-muted">${esc(x.resp || '')} · ${x.fecha ? new Date(x.fecha).toLocaleDateString('es-ES') : 'en ' + x.plazo + ' días'}</span></li>`).join('') || '<li>Responder el diagnóstico y fijar objetivos.</li>'}</ol>`)
      + I.foot();
    const ordenados = (altas.length ? altas.concat(PL.filter((x) => !altas.includes(x))) : PL).filter((x) => x.estado !== 'Hecha');
    const abrir = A.consultorInf ? A.consultorInf.abrir : I.open;
    abrir({ titulo: 'Informe 360 · ' + m.nombre, html, clave: 'est:' + m.id, ctx: {
      titulo: m.nombre, tipo: 'Informe 360', empresa: S.sim.empresaNombre, sector: A.SECTORS[S.sim.sector].nombre,
      pasos: ordenados.slice(0, 10).map((x) => ({ q: x.accion, c: x.origen + (x.motivo ? ': ' + x.motivo : ''), quien: x.resp, cuando: x.fecha || new Date(Date.now() + (x.plazo || 60) * 864e5).toISOString().slice(0, 10), s: x.kpi && x.kpi !== '—' ? x.kpi : 'Acción cerrada en el plan de empresa' })),
      seguimiento: d.cadencia.map((r) => [r[0], r[1], r[2]]),
      datos: [['Nota del área', nota === null ? '—' : nota + '/100'], ['Indicadores', P.sc === null ? '—' : P.sc + '/100'], ['Madurez de la gestión', mz.score === null ? 'Sin responder' : mz.score + '/100'], ['Datos que faltan', String(falta.length)], ['Riesgos', String(P.R.length)], ['Acciones en el plan', PL.length + ' (' + altas.length + ' de prioridad alta)'], ['Notas del empresario', c.notas ? c.notas.slice(0, 200) : '—']]
    } });
  };
})();
