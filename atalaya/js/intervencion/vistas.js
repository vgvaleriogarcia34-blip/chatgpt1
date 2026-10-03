/* Atalaya 360° · Auditoría integral · síntomas y causas, triaje, auditoría y desviaciones del ecosistema */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { D, $, $$, esc, norm, uid, pl, ST_N, TRIAJE, guardar, toast, sintomasDe, desvDe, nivel, nivelAuto, causasOrdenadas, veinte, sugerirCausa, asegurarCausa, ruta, render, ir, VISTAS } = V.int;
  const S = () => V.int.st();
  const COL = { ok: '#2fb24a', warn: '#e8a33b', stop: '#e04848' };
  const opArea = (sel) => D.AREAS.map((a) => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.n)}</option>`).join('');
  const chipSt = (st, t) => `<span class="iv-st ${st || ''}">${esc(t || ST_N[st] || 'Sin datos')}</span>`;

  /* ---------- Síntomas y causas ---------- */
  const pareto = (l) => {
    if (!l.length) return '';
    const tot = l.reduce((a, x) => a + x.base, 0) || 1, W = 560, H = 170, bw = Math.min(46, (W - 40) / l.length - 6), v20 = veinte();
    let acc = 0; const pts = [];
    const bars = l.map((x, i) => { acc += x.base; const h = (x.base / l[0].base) * (H - 40), X = 30 + i * (bw + 6); pts.push([X + bw / 2, H - 20 - (acc / tot) * (H - 40)]); return `<rect x="${X}" y="${H - 20 - h}" width="${bw}" height="${h}" rx="3" fill="${v20.has(x.c.id) ? '#c9f24d' : '#4a5363'}"><title>${esc(x.c.t)}</title></rect><text x="${X + bw / 2}" y="${H - 6}" text-anchor="middle" class="iv-rt">${i + 1}</text>`; }).join('');
    return `<svg class="iv-pareto" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pareto de causas">${bars}<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#e8a33b" stroke-width="1.6"/><line x1="30" x2="${W - 10}" y1="${H - 20 - 0.8 * (H - 40)}" y2="${H - 20 - 0.8 * (H - 40)}" stroke="rgba(232,163,59,.4)" stroke-dasharray="4 4"/><text x="${W - 10}" y="${H - 24 - 0.8 * (H - 40)}" text-anchor="end" class="iv-rt">80 %</text></svg>`;
  };
  VISTAS.sintomas = (host) => {
    const ST = S(), l = causasOrdenadas(), v20 = veinte(), sinCausa = ST.sintomas.filter((s) => !s.causa).length;
    const opCausa = (sel) => `<option value="">— sin causa —</option>${ST.causas.map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.t)}</option>`).join('')}<option value="__nueva">+ Nueva causa…</option>`;
    host.innerHTML = `<section class="glass pad stack"><div class="row"><div class="eyebrow">Síntomas</div><span class="spacer"></span>${sinCausa ? `<button class="btn solid small" id="ivProp">Proponer causas (${sinCausa} sin causa)</button>` : ''}</div>
        <p class="small muted" style="margin:0">El síntoma es lo que se ve y se oye; la causa, lo que lo produce. Varios síntomas suelen venir de una misma causa: enlázalos y la prioridad sale sola.</p>
        <div class="iv-add"><input class="input" id="ivSN" placeholder="Nuevo síntoma: «los pedidos salen tarde los lunes»"><select class="input" id="ivSA">${opArea('ope')}</select><button class="btn small" id="ivSAdd">Añadir</button></div>
        ${ST.sintomas.length ? `<div class="table-wrap"><table class="iv-tab"><thead><tr><th style="text-align:left">Síntoma y cita</th><th>Área</th><th>Gravedad</th><th style="text-align:left">Causa</th><th></th></tr></thead><tbody>${ST.sintomas.map((s) => `<tr data-s="${s.id}"><td style="text-align:left"><input class="input iv-st-t" data-k="t" value="${esc(s.t)}">${s.cita ? `<small class="iv-ej">«${esc(s.cita)}»</small>` : ''}</td><td><select class="input" data-k="area">${opArea(s.area)}</select></td><td><select class="input iv-n" data-k="gravedad">${[1, 2, 3, 4, 5].map((g) => `<option ${+s.gravedad === g ? 'selected' : ''}>${g}</option>`).join('')}</select></td><td><select class="input" data-k="causa">${opCausa(s.causa)}</select></td><td><button class="icon-btn" data-del aria-label="Quitar">×</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Aún no hay síntomas. Apúntalos desde el guion, la captura en directo o la transcripción.</p>'}</section>
      <div class="grid iv-two"><section class="glass pad stack"><div class="eyebrow">Causas priorizadas · el 20 % que da el 80 %</div>
          ${l.length ? `${pareto(l)}<ol class="iv-causas">${l.map((x, i) => `<li class="${v20.has(x.c.id) ? 'veinte' : ''}" data-c="${x.c.id}"><div class="row"><span class="iv-cn2">${i + 1}</span><b>${esc(x.c.t)}</b><span class="spacer"></span>${v20.has(x.c.id) ? '<span class="iv-st ok">20 %</span>' : ''}</div>
            <small class="muted">${esc((D.area(x.c.area) || {}).n || '')} · explica ${pl(x.ss.length, 'síntoma', 'síntomas')} · peso ${x.base.toFixed(1).replace('.', ',')} · ${x.c.estado === 'confirmada' ? 'confirmada' : 'hipótesis'}</small>
            <div class="iv-g3"><label class="small">Esfuerzo para resolverla<select class="input" data-ce="esfuerzo">${[1, 2, 3, 4, 5].map((g) => `<option value="${g}" ${+x.c.esfuerzo === g ? 'selected' : ''}>${g} · ${['muy bajo', 'bajo', 'medio', 'alto', 'muy alto'][g - 1]}</option>`).join('')}</select></label><label class="small">Estado<select class="input" data-ce="estado"><option value="hipotesis" ${x.c.estado === 'hipotesis' ? 'selected' : ''}>Hipótesis</option><option value="confirmada" ${x.c.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option><option value="descartada">Descartada</option></select></label></div>
            <details><summary class="small">Cinco porqués</summary>${[0, 1, 2, 3, 4].map((k) => `<input class="input iv-pq" data-pq="${k}" value="${esc((x.c.porques || [])[k] || '')}" placeholder="${k + 1}. ¿Por qué…?">`).join('')}</details></li>`).join('')}</ol>`
          : '<p class="small muted" style="margin:0">Enlaza los síntomas a sus causas (o pulsa «Proponer causas») para priorizarlas.</p>'}</section>
        <section class="glass pad stack"><div class="eyebrow">Cómo se prioriza</div><p class="small" style="margin:0">Cada causa pesa la suma de la gravedad de los síntomas que explica (los de áreas en urgencias pesan un 30 % más), corregida por el esfuerzo de resolverla (cada punto de esfuerzo resta peso, sin dejar que una causa fácil pase por delante de una que explica mucho más). En verde lima, el grupo de causas que, juntas, explican el 80 % de la gravedad: ahí empieza la intervención.</p>
          <p class="small muted" style="margin:0">Las causas son hipótesis hasta la auditoría integral: allí se confirman o se descartan con datos.</p>
          ${ST.causas.filter((c) => c.estado === 'descartada').length ? `<div class="eyebrow">Descartadas</div><ul class="small" style="margin:0;padding-left:18px">${ST.causas.filter((c) => c.estado === 'descartada').map((c) => `<li>${esc(c.t)} <button class="btn ghost small" data-rec="${c.id}">Recuperar</button></li>`).join('')}</ul>` : ''}</section></div>`;
    const add = () => { const t = $('#ivSN', host).value.trim(); if (!t) return; S().sintomas.push({ id: uid(), t, cita: '', area: $('#ivSA', host).value, patron: '', gravedad: 3, origen: 'manual' }); render(); };
    $('#ivSAdd', host).onclick = add; $('#ivSN', host).onkeydown = (e) => { if (e.key === 'Enter') add(); };
    const pr = $('#ivProp', host); if (pr) pr.onclick = () => { let n = 0; S().sintomas.filter((s) => !s.causa).forEach((s) => { const c = sugerirCausa(s); if (c) { s.causa = asegurarCausa(c).id; n++; } }); render(); toast(n ? `${pl(n, 'síntoma enlazado', 'síntomas enlazados')} a su causa probable. Revísalo: son hipótesis.` : 'No hay una causa clara para estos síntomas: créala a mano.'); };
    $$('tr[data-s]', host).forEach((tr) => {
      const s = S().sintomas.find((x) => x.id === tr.dataset.s);
      $$('[data-k]', tr).forEach((i) => (i.onchange = () => {
        const k = i.dataset.k;
        if (k === 'causa' && i.value === '__nueva') { const t = prompt('Nombre de la causa (lo que produce el síntoma):', ''); if (!t) { i.value = s.causa || ''; return; } const c = { id: uid(), ref: null, t, area: s.area, patron: s.patron, esfuerzo: 3, estado: 'hipotesis', porques: [] }; S().causas.push(c); s.causa = c.id; }
        else s[k] = k === 'gravedad' ? +i.value : i.value;
        if (k === 't') { guardar(); return; } render();
      }));
      $('[data-del]', tr).onclick = () => { S().sintomas = S().sintomas.filter((x) => x !== s); render(); };
    });
    $$('.iv-causas li', host).forEach((li) => {
      const c = S().causas.find((x) => x.id === li.dataset.c);
      $$('[data-ce]', li).forEach((i) => (i.onchange = () => { c[i.dataset.ce] = i.dataset.ce === 'esfuerzo' ? +i.value : i.value; render(); }));
      $$('[data-pq]', li).forEach((i) => (i.oninput = () => { c.porques = c.porques || []; c.porques[+i.dataset.pq] = i.value; guardar(); }));
    });
    $$('[data-rec]', host).forEach((b) => (b.onclick = () => { S().causas.find((c) => c.id === b.dataset.rec).estado = 'hipotesis'; render(); }));
  };

  /* ---------- Triaje y hoja de ruta ---------- */
  const enlaces = (a) => [].concat((a.est || []).map((m) => { const mod = A.strat && A.strat.mod ? A.strat.mod(m) : null; return `<a class="chip" href="estrategia.html#${m}">${esc(mod ? mod.nombre : m)}</a>`; }), (a.per || []).map((m) => `<a class="chip" href="personas.html#${m}">${esc({ organigrama: 'Organigrama', 'lid-modelo': 'Liderazgo a medida', personas: 'Plantilla', puestos: 'Puestos', encaje: 'Encaje persona-puesto', equipos: 'Equipos' }[m] || m)}</a>`), a.sim ? ['<a class="chip" href="app.html#riesgos">Simulador · semáforos</a>'] : [], a.mesa ? ['<a class="chip" href="mesa.html#agenda">Mesa · agenda</a>'] : []).join('');
  VISTAS.triaje = (host) => {
    const ST = S(), r = ruta();
    const col = (k) => r.filter((x) => (x.n || 'ok') === k);
    host.innerHTML = `<section class="glass pad stack"><div class="eyebrow">Triaje: cada síntoma a su área</div><p class="small" style="margin:0">El color de cada área sale de la gravedad de sus síntomas; puedes corregirlo con tu criterio. Las áreas en urgencias se auditan primero y a fondo.</p>
        <div class="iv-triaje">${['stop', 'warn', 'ok'].map((k) => `<div class="iv-tcol ${k}"><div class="iv-th"><b>${TRIAJE[k].n}</b><small>${TRIAJE[k].d}</small></div>${col(k).map((x) => `<div class="iv-tcard" style="--c:${x.a.c}"><b>${esc(x.a.n)}</b><small>${pl(x.ss.length, 'síntoma', 'síntomas')} · ${pl(x.cs.length, 'causa', 'causas')}</small></div>`).join('') || '<small class="muted">—</small>'}</div>`).join('')}</div></section>
      <section class="glass pad stack"><div class="row"><div class="eyebrow">Áreas</div><span class="spacer"></span><button class="btn small" data-inf="guia">Guía del auditor</button><button class="btn ghost small" data-inf="primera">Informe de la primera sesión</button><button class="btn ghost small" id="ivCrearAud">Programar la auditoría integral</button></div>
        <div class="iv-areas">${D.AREAS.map((a) => { const n = nivel(a.id), auto = nivelAuto(a.id), ss = sintomasDe(a.id), cs = ST.causas.filter((c) => c.area === a.id && c.estado !== 'descartada'); return `<div class="iv-area" style="--c:${a.c}" data-a="${a.id}"><div class="row"><b>${esc(a.n)}</b><span class="spacer"></span>${chipSt(n, n ? TRIAJE[n].n : 'Sin datos')}</div><small class="muted">${esc(a.d)}</small>
          <label class="small">Triaje<select class="input" data-nv><option value="">Automático${auto ? ' (' + TRIAJE[auto].n.toLowerCase() + ')' : ''}</option>${['stop', 'warn', 'ok'].map((k) => `<option value="${k}" ${(ST.areas[a.id] || {}).nivel === k ? 'selected' : ''}>${TRIAJE[k].n}</option>`).join('')}</select></label>
          ${ss.length ? `<small><b>Síntomas:</b> ${ss.slice(0, 3).map((s) => esc(s.t)).join(' · ')}${ss.length > 3 ? '…' : ''}</small>` : ''}${cs.length ? `<small><b>Hipótesis:</b> ${cs.map((c) => esc(c.t)).join(' · ')}</small>` : ''}
          <div class="iv-links"><small class="muted">Derivar a:</small>${enlaces(a)}</div><textarea class="input" rows="2" data-nt placeholder="Nota del consultor para esta área">${esc((ST.areas[a.id] || {}).nota || '')}</textarea></div>`; }).join('')}</div></section>
      <section class="glass pad stack"><div class="eyebrow">Hoja de ruta de la auditoría integral</div>${r.length ? `<ol class="iv-hr">${r.map((x, i) => `<li><div class="row"><b>${i + 1}. ${esc(x.a.n)}</b>${chipSt(x.n, x.n ? TRIAJE[x.n].n : '')}<span class="spacer"></span><small class="muted">${x.n === 'stop' ? 'A fondo · 60-90 min' : x.n === 'warn' ? 'Revisión · 30-45 min' : 'Comprobación · 15 min'}</small></div><small>Verificar: ${(D.VERIFICA[x.a.id] || []).slice(0, 3).map(esc).join(' · ')}${x.cs.length ? ' · Confirmar: ' + x.cs.map((c) => esc(c.t)).join('; ') : ''}</small></li>`).join('')}</ol>` : '<p class="small muted" style="margin:0">Apunta síntomas para que salga la hoja de ruta.</p>'}</section>`;
    $$('.iv-area', host).forEach((d) => { const aid = d.dataset.a; ST.areas[aid] = ST.areas[aid] || {}; $('[data-nv]', d).onchange = (e) => { ST.areas[aid].nivel = e.target.value; render(); }; $('[data-nt]', d).oninput = (e) => { ST.areas[aid].nota = e.target.value; guardar(); }; });
    $$('[data-inf]', host).forEach((b) => (b.onclick = () => V.informes[b.dataset.inf]()));
    $('#ivCrearAud', host).onclick = () => { if (!ST.sesiones.some((x) => x.tipo === 'auditoria')) ST.sesiones.push({ id: uid(), tipo: 'auditoria', fecha: V.int.sumar(ST.sesion.fecha, 7), hora: '09:00', dur: 180, obj: 'Auditoría integral: verificar por áreas la hoja de ruta y confirmar o descartar las causas.', acta: '', acuerdos: [] }); render(); ir('sesiones'); toast('Sesión de auditoría integral programada a una semana: ajusta la fecha.'); };
  };

  /* ---------- Auditoría integral: verificación por áreas ---------- */
  VISTAS.auditoria = (host) => {
    const ST = S(), r = ruta(), areas = r.length ? r.map((x) => x.a) : D.AREAS;
    host.innerHTML = `<section class="glass pad stack"><p class="small" style="margin:0">La auditoría integral se hace en el orden de la hoja de ruta. En cada área: revisa la documentación y los datos, marca cada verificación y confirma o descarta las causas. Los módulos del sistema estratégico, el simulador y personas y equipos sirven para medir: ábrelos desde cada área.</p></section>
      ${areas.map((a) => { const v = ST.verifica[a.id] || {}, cs = ST.causas.filter((c) => c.area === a.id), hs = ST.hallazgos.filter((h) => h.area === a.id), n = nivel(a.id); return `<section class="glass pad stack iv-aud" data-a="${a.id}" style="--c:${a.c}"><div class="row"><h3 class="iv-bt">${esc(a.n)}</h3>${chipSt(n, n ? TRIAJE[n].n : 'Sin datos')}<span class="spacer"></span><small class="muted">${Object.values(v).filter((x) => x && x.e && x.e !== 'pend').length}/${(D.VERIFICA[a.id] || []).length} verificadas · ${pl(desvDe(a.id), 'desviación', 'desviaciones')}</small></div>
        <div class="table-wrap"><table class="iv-tab"><tbody>${(D.VERIFICA[a.id] || []).map((q, i) => `<tr data-i="${i}"><td style="text-align:left">${esc(q)}</td><td><select class="input" data-e>${Object.keys(D.ESTADOS_V).map((k) => `<option value="${k}" ${((v[i] || {}).e || 'pend') === k ? 'selected' : ''}>${D.ESTADOS_V[k]}</option>`).join('')}</select></td><td style="width:40%"><input class="input" data-nota value="${esc((v[i] || {}).nota || '')}" placeholder="Evidencia o hallazgo"></td></tr>`).join('')}</tbody></table></div>
        ${cs.length ? `<div><b class="small">Causas a confirmar</b><ul class="iv-cc">${cs.map((c) => `<li data-c="${c.id}"><span>${esc(c.t)}</span><span class="row"><button class="btn small ${c.estado === 'confirmada' ? 'solid' : 'ghost'}" data-cf="confirmada">Confirmada</button><button class="btn small ghost" data-cf="${c.estado === 'descartada' ? 'hipotesis' : 'descartada'}">${c.estado === 'descartada' ? 'Recuperar' : 'Descartar'}</button></span></li>`).join('')}</ul></div>` : ''}
        <div><b class="small">Hallazgos</b>${hs.length ? `<ul class="iv-cc">${hs.map((h) => `<li data-h="${h.id}"><span>${esc(h.t)} <small class="muted">· gravedad ${h.gravedad}${h.origen === 'ecosistema' ? ' · del ecosistema' : ''}</small></span><button class="icon-btn" data-hx aria-label="Quitar">×</button></li>`).join('')}</ul>` : ''}<div class="iv-add"><input class="input" data-hn placeholder="Nuevo hallazgo de la auditoría"><select class="input iv-n" data-hg>${[1, 2, 3, 4, 5].map((g) => `<option ${g === 3 ? 'selected' : ''}>${g}</option>`).join('')}</select><button class="btn small" data-ha>Añadir</button></div></div>
        <div class="iv-links"><small class="muted">Medir con:</small>${enlaces(a)}</div></section>`; }).join('')}`;
    $$('.iv-aud', host).forEach((sec) => {
      const aid = sec.dataset.a; ST.verifica[aid] = ST.verifica[aid] || {};
      $$('tr[data-i]', sec).forEach((tr) => { const i = tr.dataset.i, o = (ST.verifica[aid][i] = ST.verifica[aid][i] || {}); $('[data-e]', tr).onchange = (e) => { o.e = e.target.value; render(); }; $('[data-nota]', tr).oninput = (e) => { o.nota = e.target.value; guardar(); }; });
      $$('[data-c]', sec).forEach((li) => $$('[data-cf]', li).forEach((b) => (b.onclick = () => { ST.causas.find((c) => c.id === li.dataset.c).estado = b.dataset.cf; render(); })));
      $$('[data-h]', sec).forEach((li) => ($('[data-hx]', li).onclick = () => { ST.hallazgos = ST.hallazgos.filter((h) => h.id !== li.dataset.h); render(); }));
      $('[data-ha]', sec).onclick = () => { const t = $('[data-hn]', sec).value.trim(); if (!t) return; const h = { id: uid(), t, area: aid, gravedad: +$('[data-hg]', sec).value, origen: 'auditoria' }; const c = sugerirCausa(h); if (c) h.causa = asegurarCausa(c).id; ST.hallazgos.push(h); render(); };
    });
  };

  /* ---------- Desviaciones del ecosistema ---------- */
  const AREA_DE_MOD = {}; D.AREAS.forEach((a) => (a.est || []).forEach((m) => { if (!AREA_DE_MOD[m]) AREA_DE_MOD[m] = a.id; }));
  const areaDePunto = (mundo, x) => { if (mundo === 'simulador') return 'fin'; if (mundo === 'mesa') return x.zona === 'metas' ? 'gob' : 'tie'; if (mundo === 'personas') return 'per'; return AREA_DE_MOD[x.zona] || (/abc|client|venta|precio/i.test(x.t) ? 'com' : /plan|objetiv/i.test(x.t) ? 'gob' : 'inf'); };
  VISTAS.ecosistema = (host) => {
    const ST = S();
    host.innerHTML = `<section class="glass pad stack"><div class="eyebrow">Volcar las desviaciones del ecosistema</div><p class="small" style="margin:0">Lo que ya miden el simulador, el sistema estratégico, personas y equipos y la mesa de trabajo de esta empresa: semáforos en rojo, datos que faltan, objetivos vencidos, agenda que no se cumple. Cada punto va a su área y se puede volcar como hallazgo de la auditoría integral. Para que esté al día, abre antes el simulador y el sistema estratégico.</p><div class="row"><button class="btn solid" id="ivVolcar">Leer el ecosistema</button><span class="small muted" id="ivVm">${ST.volcado ? 'Última lectura: ' + new Date(ST.volcado.fecha).toLocaleString('es-ES') : ''}</span></div></section><div id="ivVol"></div>`;
    const pintar = (u) => {
      const box = $('#ivVol', host); if (!u) { box.innerHTML = ''; return; }
      const ya = new Set(ST.hallazgos.map((h) => norm(h.t)));
      const pts = Object.keys(u.mundos).flatMap((k) => u.mundos[k].puntos.filter((x) => x.st !== 'ok').map((x) => Object.assign({ mundo: k, area: areaDePunto(k, x), mn: u.mundos[k].n }, x)));
      box.innerHTML = `<section class="glass pad stack"><div class="row"><div class="eyebrow">Notas del ecosistema</div><span class="spacer"></span>${Object.keys(u.mundos).map((k) => `<span class="chip">${esc(u.mundos[k].n)}: <b>${u.mundos[k].nota == null ? '—' : String(u.mundos[k].nota.toFixed(1)).replace('.', ',')}</b></span>`).join('')}</div>
        ${pts.length ? `<div class="row"><b class="small">${pl(pts.length, 'desviación', 'desviaciones')}</b><span class="spacer"></span><button class="btn small" id="ivVolT">Volcar las marcadas como hallazgos</button></div>
        ${D.AREAS.map((a) => { const l = pts.filter((x) => x.area === a.id); return l.length ? `<div class="iv-volg" style="--c:${a.c}"><b>${esc(a.n)}</b><ul class="iv-sug">${l.map((x) => `<li><label><input type="checkbox" data-vp="${pts.indexOf(x)}" ${ya.has(norm(x.t)) ? 'disabled' : x.st === 'stop' ? 'checked' : ''}><span><b>${x.st === 'stop' ? '● ' : '○ '}${esc(x.t)}</b><small>${esc(x.mn)}${x.d ? ' · ' + esc(x.d) : ''}${ya.has(norm(x.t)) ? ' · ya volcado' : ''}</small></span></label></li>`).join('')}</ul></div>` : ''; }).join('')}` : '<p class="small muted" style="margin:0">Sin desviaciones: abre los mundos para calcular sus notas.</p>'}</section>`;
      const b = $('#ivVolT', box); if (b) b.onclick = () => { let n = 0; $$('[data-vp]', box).filter((c) => c.checked && !c.disabled).forEach((c) => { const x = pts[+c.dataset.vp]; const h = { id: uid(), t: x.t, area: x.area, gravedad: x.st === 'stop' ? 4 : 2, origen: 'ecosistema', mundo: x.mundo }; const cz = sugerirCausa(h); if (cz) h.causa = asegurarCausa(cz).id; ST.hallazgos.push(h); n++; }); render(); toast(`${pl(n, 'hallazgo volcado', 'hallazgos volcados')} a la auditoría integral.`); };
    };
    $('#ivVolcar', host).onclick = async (e) => {
      if (!A.nota || !A.nota.calcular) return toast('No se puede leer el ecosistema desde aquí.');
      e.target.disabled = true; e.target.textContent = 'Leyendo…';
      try { const u = await A.nota.calcular(); ST.volcado = { fecha: new Date().toISOString(), global: u.global }; V.ultimoVolcado = u; guardar(); pintar(u); $('#ivVm', host).textContent = 'Leído ahora · nota global de la empresa ' + (u.global == null ? '—' : String(u.global.toFixed(1)).replace('.', ',')); } catch (x) { toast(x.message); }
      e.target.disabled = false; e.target.textContent = 'Volver a leer';
    };
    if (V.ultimoVolcado) pintar(V.ultimoVolcado);
  };
})();
