/* Atalaya · Sistema estratégico · núcleo
 * Estado compartido, módulos, tablas editables con importación de documentos y dictado,
 * cuadro de mando cruzado, riesgos agregados y API para el asistente.
 */
(function () {
  const A = window.Atalaya, F = A.fmt;
  const S = (A.strat = { modules: [], state: null, sim: null });
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  S.$ = $; S.$$ = $$; S.esc = esc; S.css = css;
  // Claves de la empresa activa (la principal conserva las de siempre)
  const PK = (k) => (A.platform && A.platform.k ? A.platform.k(k) : k);
  const LSK = PK('atalaya.estrategia.v1'), SIMK = PK('atalaya.v1');
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };
  const stName = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  S.stName = stName;
  S.num = (v) => { const n = typeof v === 'number' ? v : A.fin.parseNum(v); return isFinite(n) ? n : 0; };
  S.pct = (a, b) => (b ? (a / b) * 100 : 0);

  /* ---------- Módulos ---------- */
  S.register = (m) => { if (m.first) S.modules.unshift(m); else S.modules.push(m); };
  S.mod = (id) => S.modules.find((m) => m.id === id);
  S.defaults = {};
  S.save = (() => { let t; return () => { LS.set(LSK, S.state); clearTimeout(t); t = setTimeout(() => A.platform && A.platform.saveData('estrategia', S.state), 1200); S.refreshKpis(); }; })();
  S.saveSim = () => { LS.set(SIMK, S.sim); A.platform && A.platform.saveData('simulador', S.sim); };

  /* Datos de la empresa que vienen del simulador */
  S.empresa = () => S.sim.empresa;
  S.analysis = (esc) => A.analyze(S.sim, A.scenarioMods(S.sim, esc || S.sim.escenario || 'base'));
  S.baseYear = () => {
    const e = S.sim.empresa;
    return { ventas: e.ventas, costeVentas: e.ventas * (1 - e.margen / 100), personal: e.personal, fijos: e.fijos, ebitda: e.ventas * e.margen / 100 - e.personal - e.fijos };
  };

  /* ---------- Componentes ---------- */
  S.kpiTiles = (list) => `<div class="kpis" style="margin-top:0">${list.map((t) => `<div class="kpi" ${t.info ? `data-term="${esc(t.info)}" data-val="${esc(String(t.v).replace(/<[^>]+>/g, ''))}" data-st="${t.st || ''}" data-ctx="${esc(t.exp || '')}" tabindex="0" role="button" aria-label="${esc(t.k)}: qué significa"` : ''}><div class="k"><span>${t.k}</span>${t.st ? `<span class="state st-${t.st}">${stName[t.st]}</span>` : ''}</div><div class="v">${t.v}</div>${t.d ? `<div class="d">${t.d}</div>` : ''}</div>`).join('')}</div>`;
  S.note = (html) => `<div class="note">${html}</div>`;
  S.section = (title, lede, inner) => `<div class="eyebrow">${title}</div>${lede ? `<p class="lede">${lede}</p>` : ''}${inner || ''}`;

  /* Tabla editable genérica.
     cols: [{k, l, type: 'text'|'num'|'select'|'date'|'bool', opts, syn: [sinónimos para importar], calc(row) → texto, w}] */
  S.etable = function (host, cfg) {
    const { cols, rows, onChange, nuevo, titulo, dictar } = cfg;
    const id = 'et' + Math.random().toString(36).slice(2, 7);
    const head = `<tr>${cols.map((c) => `<th style="${c.type === 'text' ? 'text-align:left' : ''}">${c.l}</th>`).join('')}<th></th></tr>`;
    const cell = (c, r, i) => {
      if (c.calc) return `<td class="calc">${c.calc(r, i)}</td>`;
      const v = r[c.k] == null ? '' : r[c.k];
      if (c.type === 'select') return `<td><select data-i="${i}" data-k="${c.k}" class="input">${c.opts.map((o) => `<option value="${esc(o.v || o)}" ${(o.v || o) === v ? 'selected' : ''}>${esc(o.l || o)}</option>`).join('')}</select></td>`;
      if (c.type === 'bool') return `<td style="text-align:center"><input type="checkbox" data-i="${i}" data-k="${c.k}" ${v ? 'checked' : ''}></td>`;
      const shown = c.type === 'num' && v !== '' ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(v) : v;
      return `<td><input data-i="${i}" data-k="${c.k}" class="${c.type === 'text' ? 'txt' : ''}" ${c.type === 'date' ? 'type="date"' : ''} value="${esc(shown)}" aria-label="${esc(c.l)}"></td>`;
    };
    host.innerHTML = `<div class="row" style="margin-bottom:8px">${titulo ? `<h4>${titulo}</h4>` : ''}<span class="spacer"></span>
        <button class="btn ghost" data-act="add">Añadir fila</button>
        <label class="btn ghost" for="${id}f">Importar documento</label><input type="file" id="${id}f" hidden accept=".xlsx,.xls,.ods,.csv,.tsv,.txt,.md,.pdf,.docx">
        <button class="btn ghost" data-act="paste">Pegar</button>${dictar ? '<button class="btn ghost" data-act="voice">Dictar</button>' : ''}</div>
      <textarea class="input" data-paste hidden rows="4" style="width:100%" placeholder="Pega aquí filas copiadas de Excel con su cabecera"></textarea>
      <p class="small" data-msg></p>
      <div class="etable table-wrap"><table><thead>${head}</thead><tbody>${rows.map((r, i) => `<tr>${cols.map((c) => cell(c, r, i)).join('')}<td><button class="icon-btn" data-del="${i}" aria-label="Eliminar fila">×</button></td></tr>`).join('')}</tbody></table></div>`;
    const msg = (t, err) => { $('[data-msg]', host).innerHTML = `<span style="color:${err ? 'var(--stop)' : 'var(--go)'}">${esc(t)}</span>`; };
    $$('input[data-k], select[data-k]', host).forEach((inp) => inp.addEventListener('change', () => {
      const c = cols.find((x) => x.k === inp.dataset.k), r = rows[+inp.dataset.i];
      r[c.k] = c.type === 'num' ? S.num(inp.value) : c.type === 'bool' ? inp.checked : inp.value;
      onChange();
    }));
    $$('[data-del]', host).forEach((b) => b.onclick = () => { rows.splice(+b.dataset.del, 1); onChange(); });
    $('[data-act="add"]', host).onclick = () => { rows.push(nuevo ? nuevo() : {}); onChange(); };
    const schema = Object.fromEntries(cols.filter((c) => !c.calc).map((c) => [c.k, [c.l].concat(c.syn || [])]));
    const ingest = (table, origen) => {
      const objs = A.docs.mapTable(table, schema).map((o) => { const r = nuevo ? nuevo() : {}; cols.forEach((c) => { if (o[c.k] !== undefined) r[c.k] = c.type === 'num' ? S.num(o[c.k]) : c.type === 'bool' ? /^(s[ií]|x|1|true)$/i.test(String(o[c.k]).trim()) : String(o[c.k]).trim(); }); return r; });
      if (!objs.length) throw new Error('No hay filas con datos.');
      rows.push(...objs); onChange(); msg(`${origen}: ${objs.length} filas añadidas.`);
    };
    $('#' + id + 'f', host).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      msg('Leyendo ' + f.name + '…');
      try {
        const doc = await A.docs.read(f);
        let done = false, err = null;
        for (const h of doc.hojas) { try { ingest(h.rows, f.name); done = true; break; } catch (x) { err = x; } }
        if (!done) {
          const forma = `{"filas":[{${cols.filter((c) => !c.calc).map((c) => `"${c.k}":${c.type === 'num' ? 'número' : 'texto'}`).join(',')}}]}`;
          const ai = await A.docs.aiExtract(doc.texto, titulo || 'tabla', forma).catch(() => null);
          if (ai && Array.isArray(ai.filas) && ai.filas.length) { ai.filas.forEach((o) => { const r = nuevo ? nuevo() : {}; cols.forEach((c) => { if (o[c.k] !== undefined && o[c.k] !== null) r[c.k] = c.type === 'num' ? S.num(o[c.k]) : o[c.k]; }); rows.push(r); }); onChange(); msg(`${f.name}: ${ai.filas.length} filas extraídas con IA.`); }
          else throw err || new Error('No he reconocido la tabla.');
        }
      } catch (x) { msg(x.message, true); }
      e.target.value = '';
    };
    $('[data-act="paste"]', host).onclick = () => { const t = $('[data-paste]', host); t.hidden = !t.hidden; if (!t.hidden) t.focus(); };
    $('[data-paste]', host).onchange = (e) => { try { ingest(A.docs.textToRows(e.target.value), 'Tabla pegada'); } catch (x) { msg(x.message, true); } };
    const vb = $('[data-act="voice"]', host);
    if (vb) vb.onclick = async () => { msg('Escuchando…'); try { const t = await A.docs.dictate(); const r = dictar(t); if (!r) throw new Error('No lo he entendido: «' + t + '»'); rows.push(r); onChange(); msg('Añadido: «' + t + '»'); } catch (x) { msg(x.message, true); } };
  };

  /* Gráfico de barras horizontal sencillo */
  S.hbars = (items, fmt, color) => {
    const mx = Math.max(1, ...items.map((i) => Math.abs(i.v)));
    return `<div class="stack">${items.map((i) => `<div class="mfrow"><span>${esc(i.n)}</span><span class="track"><b style="width:${(Math.abs(i.v) / mx) * 100}%;background:${i.c || color || css('--gold')}"></b></span><span class="num" style="min-width:70px">${fmt(i.v)}</span></div>`).join('')}</div>`;
  };
  /* Barras verticales con tooltip */
  S.vbars = (host, labels, series, fmt, opts) => {
    opts = opts || {};
    const W = 900, Hh = opts.h || 220, m = { l: 62, r: 10, t: 10, b: 26 };
    const all = series.flatMap((s) => s.data).concat(opts.line ? opts.line.data : []); const mx = Math.max(1, ...all), mn = Math.min(0, ...all);
    const y = (v) => m.t + (1 - (v - mn) / (mx - mn)) * (Hh - m.t - m.b);
    const gw = (W - m.l - m.r) / labels.length, bw = (gw * 0.8) / series.length;
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(opts.aria || 'Gráfico')}"><g class="grid">`;
    [0, 0.25, 0.5, 0.75, 1].forEach((k) => { const v = mn + (mx - mn) * k; svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v)}</text>`; });
    svg += '</g>';
    labels.forEach((l, i) => {
      series.forEach((s, j) => { const v = s.data[i]; const top = y(Math.max(0, v)), bot = y(Math.min(0, v)); svg += `<rect class="vb" data-i="${i}" x="${m.l + i * gw + gw * 0.1 + j * bw}" y="${top}" width="${Math.max(1, bw - 2)}" height="${Math.max(1, bot - top)}" rx="2" fill="${s.c}"/>`; });
      if (labels.length <= 16 || i % Math.ceil(labels.length / 13) === 0) svg += `<text x="${m.l + i * gw + gw / 2}" y="${Hh - 8}" text-anchor="middle">${esc(l)}</text>`;
    });
    if (opts.line) { svg += `<polyline points="${opts.line.data.map((v, i) => `${m.l + i * gw + gw / 2},${y(v)}`).join(' ')}" fill="none" stroke="${opts.line.c}" stroke-width="2"/>`; }
    host.innerHTML = svg + '</svg>' + `<div class="chart-legend small">${series.map((s) => `<span><i style="background:${s.c}"></i> ${esc(s.n)}</span>`).join('')}${opts.line ? `<span><i style="background:${opts.line.c};height:2px"></i> ${esc(opts.line.n)}</span>` : ''}</div>`;
    $$('.vb', host).forEach((b) => { const i = +b.dataset.i; b.addEventListener('pointermove', (ev) => A.charts.tip(`<h5>${esc(labels[i])}</h5><dl>${series.map((s) => `<dt>${esc(s.n)}</dt><dd>${fmt(s.data[i])}</dd>`).join('')}${opts.line ? `<dt>${esc(opts.line.n)}</dt><dd>${fmt(opts.line.data[i])}</dd>` : ''}</dl>`, ev.clientX, ev.clientY)); b.addEventListener('pointerleave', A.charts.hideTip); });
  };
  S.riskBlock = (risks) => (risks.length ? `<div class="risklist">${risks.map((r) => `<div class="risk"><span class="state st-${r.estado}">${r.nivel}</span><div><b>${esc(r.nombre)}</b><p>${esc(r.mitigacion || '')}</p></div><span class="src">${esc(r.fuente || '')}</span></div>`).join('')}</div>` : '<p class="small muted">Sin riesgos relevantes con los datos actuales.</p>');
  S.mkRisk = (nombre, prob, impacto, mitigacion, fuente) => { const nivel = prob * impacto; return { nombre, prob, impacto, nivel, estado: nivel >= 15 ? 'stop' : nivel >= 8 ? 'warn' : 'ok', mitigacion, fuente }; };

  /* Ficha explicativa de un término: qué es, cómo se calcula, cómo se lee, tu dato y cómo mejorarlo */
  S.termHTML = (g, cur) => {
    cur = cur || {};
    const list = (a) => `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    const vars = (a) => a.map((k) => esc(A.fieldLabel(k))).join(', ');
    return `<h5>${esc(g.t)}</h5><span class="hint">${esc(g.cat || '')}</span>
      <p>${esc(g.d)}</p>
      ${g.f ? `<h6>Cómo se calcula</h6><div class="formula" style="margin-top:2px;border:0;padding:0">${esc(g.f)}</div>` : ''}
      ${g.lee ? `<h6>Cómo se lee</h6>${Array.isArray(g.lee) ? list(g.lee) : `<p>${esc(g.lee)}</p>`}` : ''}
      ${cur.valor ? `<div class="now"><b>Tu dato: ${esc(cur.valor)}</b>${cur.st ? ` · <span class="state st-${cur.st}">${stName[cur.st]}</span>` : ''}${cur.ctx ? `<p style="margin-top:6px">${esc(cur.ctx)}</p>` : ''}</div>` : ''}
      ${g.ej ? `<h6>Ejemplo</h6><p>${esc(g.ej)}</p>` : ''}
      ${g.mejora ? `<h6>Cómo mejorarlo</h6>${list(g.mejora)}` : ''}
      ${(g.dir && g.dir.length) || (g.ind && g.ind.length) ? `<h6>Qué lo mueve</h6><p>${g.dir && g.dir.length ? `Directas: ${vars(g.dir)}. ` : ''}${g.ind && g.ind.length ? `Indirectas: ${vars(g.ind)}.` : ''}</p>` : ''}`;
  };

  /* ---------- Navegación ---------- */
  const GROUPS = ['Visión', 'Finanzas', 'Comercial', 'Operaciones', 'Estrategia'];
  let current = 'tablero';
  function buildTabs() {
    const host = $('#stTabs');
    host.innerHTML = GROUPS.map((g) => S.modules.filter((m) => m.grupo === g).map((m) => `<button role="tab" data-t="${m.id}" aria-selected="${m.id === current}">${m.nombre}</button>`).join('')).join('<span class="tabsep" aria-hidden="true"></span>');
    $$('button', host).forEach((b) => b.onclick = () => show(b.dataset.t));
  }
  function show(id, keep) {
    if (!S.mod(id)) return;
    current = id;
    $$('#stTabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === id));
    const sel = $(`#stTabs button[data-t="${id}"]`); if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
    const panel = $('#stPanel');
    panel.innerHTML = '';
    A.charts.hideTip(); A.charts.closePop();
    const m = S.mod(id);
    try { m.render(panel); } catch (e) { panel.innerHTML = `<div class="alert stop">No se pudo mostrar este módulo: ${esc(e.message)}</div>`; console.error(e); }
    // Cada módulo puede generar su informe
    // Cabecera del módulo: área, nombre con volumen, la pregunta que responde y sus informes
    if (A.informe && !panel.querySelector('.alert.stop')) {
      const D = A.C360 && A.C360[id];
      const r360 = D && S.report360;
      panel.insertAdjacentHTML('afterbegin', `<div class="st-repbar st-head"><div class="st-hd"><span class="st-kick">${esc(m.grupo)}</span><h2 class="st-title">${esc(m.nombre)}</h2>${D && D.pregunta ? `<p class="st-q">${esc(D.pregunta)}</p>` : ''}</div><span class="spacer"></span>${id === 'auditoria' && S.auditReport ? '<button class="btn" id="stAudit">Informe de auditoría</button>' : ''}${id !== 'origen' ? `<button class="btn ${r360 ? 'solid' : ''}" id="stReport">${r360 ? 'Informe 360' : 'Generar informe'}</button>` : ''}</div>`);
      const rb = $('#stReport', panel); if (rb) rb.onclick = () => (r360 ? S.report360(m) : S.moduleReport(m));
      const ab = $('#stAudit', panel); if (ab) ab.onclick = () => S.auditReport();
    }
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sin historial */ }
    // Al recalcular el mismo módulo se conserva la posición: solo se sube al cambiar de módulo
    if (keep) { const y = keep.y; scrollTo({ top: y }); requestAnimationFrame(() => scrollTo({ top: y })); } else scrollTo({ top: 0 });
    if (S.onShow) try { S.onShow(id, !!keep); } catch (e) { console.error(e); }
  }
  S.show = show;
  S.GROUPS = GROUPS;

  /* ---------- Informe de un módulo ---------- */
  /* Piezas comunes de los informes: indicadores, riesgos, hallazgos y el análisis detallado del módulo en pantalla */
  S.reportParts = function (m) {
    const I = A.informe, panel = $('#stPanel');
    const tiles = $$('.kpi', panel).map((t) => ({ k: (t.querySelector('.k span') || {}).textContent || '', v: (t.querySelector('.v') || {}).innerHTML || '', st: (t.querySelector('.state') || { className: '' }).className.replace(/.*st-(\w+).*/, '$1') || null, d: (t.querySelector('.d') || {}).textContent || '' })).map((k) => Object.assign(k, { st: ['ok', 'warn', 'stop'].includes(k.st) ? k.st : null }));
    let R = [], Fi = []; try { R = m.risks ? m.risks().map((r) => r) : []; } catch (e) { /* sin riesgos */ } try { Fi = m.findings ? m.findings() : []; } catch (e) { /* sin hallazgos */ }
    R.sort((a, b) => b.nivel - a.nivel); Fi.sort((a, b) => (b.impactoEUR || 0) - (a.impactoEUR || 0));
    const lede = ($('.lede', panel) || {}).textContent || '';
    const conSt = tiles.filter((t) => t.st), sc = conSt.length ? Math.round(conSt.reduce((a, t) => a + (t.st === 'ok' ? 100 : t.st === 'warn' ? 55 : 15), 0) / conSt.length) : null;
    const st = sc === null ? null : sc >= 70 ? 'ok' : sc >= 50 ? 'warn' : 'stop';
    const blocks = $$('.glass', panel).filter((g) => !g.parentElement.closest('.glass') && !g.closest('.c360'));
    const detalle = blocks.map((g) => { const t = (g.querySelector('h4') || {}).textContent || ''; const c = g.cloneNode(true); const h = c.querySelector('h4'); if (h) h.remove(); const body = I.fromDom(c).trim(); return body.replace(/<[^>]+>/g, '').trim() ? `<div class="rp-block">${t ? `<h3>${esc(t)}</h3>` : ''}${body}</div>` : ''; }).join('');
    return { tiles, R, Fi, lede, sc, st, detalle };
  };
  S.moduleReport = function (m) {
    const I = A.informe, panel = $('#stPanel');
    I.reset();
    const tiles = $$('.kpi', panel).map((t) => ({ k: (t.querySelector('.k span') || {}).textContent || '', v: (t.querySelector('.v') || {}).innerHTML || '', st: (t.querySelector('.state') || { className: '' }).className.replace(/.*st-(\w+).*/, '$1') || null, d: (t.querySelector('.d') || {}).textContent || '' })).map((k) => Object.assign(k, { st: ['ok', 'warn', 'stop'].includes(k.st) ? k.st : null }));
    let R = [], Fi = []; try { R = m.risks ? m.risks().map((r) => r) : []; } catch (e) { /* sin riesgos */ } try { Fi = m.findings ? m.findings() : []; } catch (e) { /* sin hallazgos */ }
    R.sort((a, b) => b.nivel - a.nivel); Fi.sort((a, b) => (b.impactoEUR || 0) - (a.impactoEUR || 0));
    const lede = ($('.lede', panel) || {}).textContent || '';
    const conSt = tiles.filter((t) => t.st), sc = conSt.length ? Math.round(conSt.reduce((a, t) => a + (t.st === 'ok' ? 100 : t.st === 'warn' ? 55 : 15), 0) / conSt.length) : null;
    const st = sc === null ? null : sc >= 70 ? 'ok' : sc >= 50 ? 'warn' : 'stop';
    const impacto = Fi.reduce((a, f) => a + (f.impactoEUR || 0), 0);
    const rojos = tiles.filter((t) => t.st === 'stop').map((t) => t.k.toLowerCase());
    const resumen = `<p><b>${esc(m.nombre)}${sc === null ? '' : `: ${sc}/100 ${I.pill(st)}`}.</b> ${tiles.length} indicadores analizados${rojos.length ? `, ${rojos.length} en rojo (${esc(rojos.join(', '))})` : ', ninguno en rojo'}. ${R.length ? `${R.length} riesgo${R.length > 1 ? 's' : ''} identificado${R.length > 1 ? 's' : ''}, el principal: ${esc(R[0].nombre.toLowerCase())}.` : 'Sin riesgos relevantes.'} ${Fi.length ? `Las mejoras detectadas suman <b>${F.eur(impacto)}</b> al año.` : ''}</p>${Fi[0] ? `<p><b>Prioridad:</b> ${esc(Fi[0].accion)}</p>` : R[0] ? `<p><b>Prioridad:</b> ${esc(R[0].mitigacion || '')}</p>` : ''}`;
    // Detalle: cada bloque del módulo convertido en contenido de informe
    const blocks = $$('.glass', panel).filter((g) => !g.parentElement.closest('.glass') && !g.closest('.c360'));
    const detalle = blocks.map((g) => { const t = (g.querySelector('h4') || {}).textContent || ''; const c = g.cloneNode(true); const h = c.querySelector('h4'); if (h) h.remove(); const body = I.fromDom(c).trim(); return body.replace(/<[^>]+>/g, '').trim() ? `<div class="rp-block">${t ? `<h3>${esc(t)}</h3>` : ''}${body}</div>` : ''; }).join('');
    const pasos = Fi.slice(0, 3).map((f) => `<li><b>${esc(f.accion)}</b> <span class="rp-muted">${esc(f.hallazgo)} · ${F.eur(f.impactoEUR || 0)} al año · ${f.plazo || 90} días</span></li>`).concat(R.slice(0, 3).map((r) => `<li><b>${esc(r.mitigacion || '')}</b> <span class="rp-muted">Riesgo: ${esc(r.nombre)}</span></li>`));
    const html = I.cover({ tipo: 'Informe de área', kicker: 'Sistema estratégico · ' + m.grupo, titulo: m.nombre, subtitulo: lede, empresa: S.sim.empresaNombre, sector: A.SECTORS[S.sim.sector].nombre })
      + I.summary('Resumen ejecutivo', resumen, st)
      + (tiles.length ? I.section('Indicadores', I.kpis(tiles)) : '')
      + (detalle ? I.section('Análisis detallado', detalle) : '')
      + I.section('Riesgos', I.risks(R), 'Nivel = probabilidad × impacto (de 1 a 25). Verde por debajo de 8, ámbar hasta 14, rojo desde 15.')
      + I.section('Hallazgos y mejoras', I.findings(Fi, F.eur))
      + (pasos.length ? I.section('Próximos pasos', `<ol class="rp-steps">${pasos.join('')}</ol>`) : '')
      + I.foot();
    I.open({ titulo: 'Informe · ' + m.nombre, html });
  };
  S.current = () => current;

  /* ---------- Reloj de tareas: flotante en la aplicación o fuera del navegador ---------- */
  S.relojStore = {
    get: () => S.state && S.state.tiempos,
    commit: () => { S.save(); if (current === 'tiempos') S.rerender(); A.reloj.redrawAll(); }
  };
  const FLK = 'atalaya.reloj.flotante';
  S.relojAbierto = () => !!$('#rjFloat');
  S.relojFlotante = (abrir) => {
    const ya = $('#rjFloat');
    try { localStorage.setItem(FLK, abrir ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
    if (!abrir) { if (ya) ya.remove(); return; }
    if (ya) return;
    const box = document.createElement('div'); box.id = 'rjFloat'; box.className = 'rj-float glass';
    box.innerHTML = '<div class="rj-bar"><b>Reloj de tareas</b><span class="spacer"></span><button class="icon-btn" data-out title="Sacar del navegador" aria-label="Sacar del navegador">⧉</button><button class="icon-btn" data-min aria-label="Minimizar">–</button><button class="icon-btn" data-x aria-label="Cerrar">×</button></div><div class="rj-host"></div>';
    document.body.appendChild(box);
    let pos = null; try { pos = JSON.parse(localStorage.getItem(FLK + '.pos')); } catch (e) { /* nada */ }
    if (pos) { box.style.left = Math.min(innerWidth - 120, pos.x) + 'px'; box.style.top = Math.min(innerHeight - 60, pos.y) + 'px'; box.style.right = 'auto'; box.style.bottom = 'auto'; }
    A.reloj.mount(box.querySelector('.rj-host'), S.relojStore, { compact: true });
    box.querySelector('[data-x]').onclick = () => { S.relojFlotante(false); if (current === 'tiempos') S.rerender(); };
    box.querySelector('[data-min]').onclick = () => box.classList.toggle('min');
    box.querySelector('[data-out]').onclick = () => S.relojFuera();
    const bar = box.querySelector('.rj-bar');
    bar.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('button')) return;
      const r = box.getBoundingClientRect(), dx = ev.clientX - r.left, dy = ev.clientY - r.top; bar.setPointerCapture(ev.pointerId);
      const mv = (e) => { const x = Math.max(0, Math.min(innerWidth - r.width, e.clientX - dx)), y = Math.max(0, Math.min(innerHeight - 40, e.clientY - dy)); Object.assign(box.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' }); };
      const up = () => { bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); const b = box.getBoundingClientRect(); try { localStorage.setItem(FLK + '.pos', JSON.stringify({ x: b.left, y: b.top })); } catch (e) { /* nada */ } };
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up);
    });
  };
  /* Fuera del navegador: ventana siempre visible si el navegador lo permite; si no, ventana aparte; si tampoco, flotante */
  S.relojFuera = async () => {
    try { await A.reloj.pip(S.relojStore, () => { if (current === 'tiempos') S.rerender(); }); return; } catch (e) { /* sin Picture-in-Picture */ }
    const w = window.open('reloj.html', 'atalayaReloj', 'width=340,height=600');
    if (!w) S.relojFlotante(true);
  };
  S.rerender = () => { const ae = document.activeElement; const fid = ae && ae.id && host0().contains(ae) ? ae.id : null; show(current, { y: scrollY }); if (fid) { const el = document.getElementById(fid); if (el) el.focus({ preventScroll: true }); } };
  const host0 = () => $('#stPanel');
  S.refreshKpis = () => { /* el cuadro de mando se recalcula al abrirse */ };

  /* ---------- Cuadro de mando cruzado ---------- */
  S.allKpis = () => S.modules.filter((m) => m.kpis).flatMap((m) => { try { return m.kpis().map((k) => Object.assign({ mod: m.id, area: m.nombre }, k)); } catch (e) { return []; } });
  S.allRisks = () => S.modules.filter((m) => m.risks).flatMap((m) => { try { return m.risks().map((r) => Object.assign({ fuente: m.nombre, mod: m.id }, r)); } catch (e) { return []; } }).sort((a, b) => b.nivel - a.nivel);
  S.allFindings = () => S.modules.filter((m) => m.findings).flatMap((m) => { try { return m.findings().map((f) => Object.assign({ area: m.nombre, mod: m.id }, f)); } catch (e) { return []; } });

  S.register({
    id: 'tablero', nombre: 'Cuadro de mando', grupo: 'Visión',
    render(host) {
      const k = S.allKpis(), R = S.allRisks(), Fi = S.allFindings();
      const areas = Array.from(new Set(k.map((x) => x.area)));
      const score = (list) => { const s = list.filter((x) => x.st); return s.length ? Math.round(s.reduce((a, x) => a + (x.st === 'ok' ? 100 : x.st === 'warn' ? 55 : 15), 0) / s.length) : null; };
      const global = score(k);
      const impacto = Fi.reduce((a, f) => a + (f.impactoEUR || 0), 0);
      host.innerHTML = `<div class="eyebrow">Cuadro de mando</div><h2>La empresa <em>de un vistazo</em></h2>
        <p class="lede">Todos los indicadores de todas las áreas, con su semáforo. Toca un área para ir a su módulo. Los riesgos y las oportunidades de mejora se suman aquí desde cada sección.</p>
        ${S.kpiTiles([
          { k: 'Salud global', v: global === null ? '—' : global + '/100', st: global === null ? null : global >= 70 ? 'ok' : global >= 50 ? 'warn' : 'stop', d: `${k.filter((x) => x.st === 'stop').length} indicadores en rojo` },
          { k: 'Riesgos altos', v: R.filter((r) => r.estado === 'stop').length, st: R.some((r) => r.estado === 'stop') ? 'stop' : 'ok', d: `${R.length} riesgos identificados` },
          { k: 'Mejora identificada', v: F.eur(impacto), d: `${Fi.length} hallazgos con impacto anual` },
          { k: 'Veredicto de inversión', v: S.analysis().verdict.titulo, d: 'del simulador · escenario ' + (S.sim.escenario || 'base') }
        ])}
        <div class="areas mt">${areas.map((a) => { const l = k.filter((x) => x.area === a); const sc = score(l); return `<button class="glass area" data-mod="${l[0].mod}"><div class="row"><b>${a}</b><span class="spacer"></span>${sc === null ? '' : `<span class="state st-${sc >= 70 ? 'ok' : sc >= 50 ? 'warn' : 'stop'}">${sc}</span>`}</div>${l.slice(0, 4).map((x) => `<div class="arow"><span>${x.k}</span><b class="num">${x.v}</b>${x.st ? `<i class="dotc ${x.st}"></i>` : '<i></i>'}</div>`).join('')}</button>`; }).join('')}</div>
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Mapa de riesgos de todas las áreas</h4><div class="chart" id="tbRisk"></div></div><div class="glass pad stack"><h4>Riesgos principales</h4>${S.riskBlock(R.slice(0, 8))}</div></div>
        <div class="glass pad mt stack"><h4>Mayores oportunidades de mejora</h4>${Fi.length ? `<div class="table-wrap"><table><thead><tr><th>Área</th><th style="text-align:left">Hallazgo</th><th>Impacto anual</th><th style="text-align:left">Acción</th><th>Plazo</th></tr></thead><tbody>${Fi.sort((a, b) => (b.impactoEUR || 0) - (a.impactoEUR || 0)).slice(0, 12).map((f) => `<tr><td>${esc(f.area)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(f.hallazgo)}</td><td>${F.eur(f.impactoEUR || 0)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(f.accion)}</td><td>${f.plazo} días</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Completa los módulos para ver oportunidades.</p>'}</div>`;
      $$('.area', host).forEach((b) => b.onclick = () => show(b.dataset.mod));
      A.charts.riskMatrix($('#tbRisk', host), R.slice(0, 14), () => {});
    }
  });

  /* ---------- API del asistente ---------- */
  function apiFor() {
    return {
      summary() {
        return {
          pagina: 'Sistema estratégico', moduloActual: S.mod(current).nombre,
          indicadores: S.allKpis().map((k) => ({ area: k.area, indicador: k.k, valor: k.v, estado: k.st ? stName[k.st] : '' })),
          riesgos: S.allRisks().slice(0, 12).map((r) => ({ area: r.fuente, riesgo: r.nombre, nivel: r.nivel, mitigacion: r.mitigacion })),
          hallazgos: S.allFindings().slice(0, 15).map((f) => ({ area: f.area, hallazgo: f.hallazgo, impactoAnual: F.eur(f.impactoEUR || 0), accion: f.accion })),
          palancas: S.levers ? S.levers() : {}, modulos: S.modules.map((m) => ({ id: m.id, nombre: m.nombre }))
        };
      },
      levers: ['precio', 'volumen', 'costeVariable', 'fijos', 'mix'],
      setLever(k, v) { if (!S.setLever) throw new Error('Palancas no disponibles'); return S.setLever(k, v); },
      goTo(id) { const m = S.mod(id) || S.modules.find((x) => x.nombre.toLowerCase().includes(String(id).toLowerCase())); if (m) { show(m.id); return { ok: true, modulo: m.nombre }; } return { ok: false }; }
    };
  }

  /* ---------- Arranque ---------- */
  S.start = async function () {
    A.sky();
    S.sim = LS.get(SIMK);
    const P = A.platform;
    if (P) {
      const ok = await P.guard(); if (!ok) return;
      P.mountAccount($('#account'));
      const remoteSim = await P.loadData('simulador'); if (remoteSim && remoteSim.empresa) S.sim = remoteSim;
    }
    if (!S.sim || !S.sim.empresa) { S.sim = A.defaultState(); const ea = P && P.empresas && P.empresas.activa(); if (ea) S.sim.empresaNombre = ea.nombre; }
    S.sim = Object.assign(A.defaultState(), S.sim);
    S.state = LS.get(LSK) || null;
    if (P) { const remote = await P.loadData('estrategia'); if (remote) S.state = remote; }
    S.state = Object.assign({}, A.clone(S.defaults), S.state || {});
    Object.keys(S.defaults).forEach((k) => { if (S.state[k] === undefined) S.state[k] = A.clone(S.defaults[k]); });
    buildTabs();
    const h = location.hash.replace('#', '');
    show(S.mod(h) ? h : 'tablero');
    addEventListener('hashchange', () => { const k = location.hash.replace('#', ''); if (S.mod(k) && k !== current) show(k); });
    if (S.onStart) try { S.onStart(); } catch (e) { console.error(e); }
    if (A.assistant) A.assistant.init({ api: apiFor(), page: 'estrategia' });
    try { if (localStorage.getItem('atalaya.reloj.flotante') === '1') S.relojFlotante(true); } catch (e) { /* sin almacenamiento */ }
    // El reloj de reloj.html escribe en el mismo almacenamiento: se recoge aquí
    addEventListener('storage', (e) => {
      if (e.key !== LSK || !e.newValue) return;
      try { const n = JSON.parse(e.newValue); if (n && n.tiempos) { S.state.tiempos = n.tiempos; if (current === 'tiempos') S.rerender(); A.reloj.redrawAll(); } } catch (x) { /* ignorar */ }
    });
    const openTerm = (t) => {
      const key = t.dataset.term.toLowerCase();
      const g = A.GLOSSARY.find((x) => x.t.toLowerCase() === key) || A.GLOSSARY.find((x) => x.t.toLowerCase().startsWith(key)) || A.GLOSSARY.find((x) => x.t.toLowerCase().includes(key));
      if (g) A.charts.pop(S.termHTML(g, { valor: t.dataset.val, st: t.dataset.st, ctx: t.dataset.ctx }), t);
    };
    document.addEventListener('click', (e) => { const t = e.target.closest('[data-term]'); if (t) openTerm(t); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.term) openTerm(e.target); });
  };
})();
