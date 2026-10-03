/* Atalaya 360° · Auditoría integral (plan Consultora)
   Tres capas:
   1. Primera sesión (una hora, como un triaje): guion, constantes vitales, escucha de la transcripción,
      síntomas y causas con prioridad 20/80, triaje por áreas y hoja de ruta de la auditoría integral.
   2. Auditoría integral: verificación por áreas y desviaciones volcadas del resto del ecosistema.
   3. Intervención: plan por fases y líneas de trabajo, sesiones y seguimiento, envío a la mesa de trabajo
      e informes (para la empresa e internos del consultor). */
(function () {
  const A = window.Atalaya, D = A.intervDatos, E = A.intervEscucha;
  const V = (A.interv = A.interv || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const P = () => A.platform;
  const LSK = () => (P() && P().k ? P().k('atalaya.intervencion.v1') : 'atalaya.intervencion.v1');
  const uid = () => 'i' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
  const hoy = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const sumar = (s, n) => { const d = new Date((s || hoy()) + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const fCorta = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—');
  const fLarga = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const ST_N = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  const TRIAJE = { stop: { n: 'Urgencias', d: 'Cerrar ya: de 0 a 14 días' }, warn: { n: 'Preferente', d: 'Este trimestre' }, ok: { n: 'Programable', d: 'Sin urgencia' } };

  /* ---------- Estado ---------- */
  const vacio = () => ({ v: 1, sesion: { fecha: hoy(), consultor: '', asistentes: '', notas: {}, hechas: {} }, constantes: {}, areas: {}, transcripciones: [], sintomas: [], causas: [], verifica: {}, hallazgos: [], plan: { inicio: '', acciones: [] }, sesiones: [], volcado: null, informes: {} });
  let ST = null, tab = 'guion', trSel = null, sesSel = null, vistaPlan = 'fase';
  const guardar = (() => { let t; return () => { clearTimeout(t); t = setTimeout(guardarYa, 500); }; })();
  async function guardarYa() { try { localStorage.setItem(LSK(), JSON.stringify(ST)); } catch (e) { /* sin almacenamiento */ } if (P() && P().saveData) { try { await P().saveData('intervencion', ST); } catch (e) { /* se queda en local */ } } }
  async function cargar() {
    let st = null; try { st = JSON.parse(localStorage.getItem(LSK())); } catch (e) { st = null; }
    if (P() && P().loadData) { try { const r = await P().loadData('intervencion'); if (r) st = r; } catch (e) { /* local */ } }
    st = Object.assign(vacio(), st || {});
    ['transcripciones', 'sintomas', 'causas', 'hallazgos', 'sesiones'].forEach((k) => { if (!Array.isArray(st[k])) st[k] = []; });
    st.sesion = Object.assign(vacio().sesion, st.sesion || {}); st.plan = Object.assign(vacio().plan, st.plan || {});
    return st;
  }
  V.estado = () => ST;
  const empresa = () => { const e = P() && P().empresas && P().empresas.activa(); return (e && e.nombre) || 'Mi empresa'; };
  const toast = (t) => { $$('.iv-toast').forEach((x) => x.remove()); const d = document.createElement('div'); d.className = 'alert ok iv-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 6000); };

  /* ---------- Cálculos ---------- */
  const sintomasDe = (aid) => ST.sintomas.filter((s) => s.area === aid);
  const desvDe = (aid) => Object.values(ST.verifica[aid] || {}).filter((x) => x && x.e === 'desv').length;
  const nivelAuto = (aid) => {
    const ss = sintomasDe(aid), g = ss.reduce((a, s) => a + (+s.gravedad || 3), 0) + desvDe(aid) * 3 + ST.hallazgos.filter((h) => h.area === aid).reduce((a, h) => a + (+h.gravedad || 3), 0);
    if (!g) return '';
    return g >= 10 || ss.some((s) => +s.gravedad >= 5) ? 'stop' : g >= 4 ? 'warn' : 'ok';
  };
  const nivel = (aid) => (ST.areas[aid] && ST.areas[aid].nivel) || nivelAuto(aid);
  const global = () => { const n = D.AREAS.map((a) => nivel(a.id)); return n.includes('stop') ? 'stop' : n.includes('warn') ? 'warn' : n.includes('ok') ? 'ok' : ''; };
  const cte = (id) => +ST.constantes[id] || 0;
  // Causas: peso = suma de gravedades de los síntomas que explica (las de áreas en urgencias pesan más) ÷ esfuerzo
  const causaDe = (c) => (c.ref ? D.causa(c.ref) : null);
  const pesoCausa = (c) => { const ss = ST.sintomas.filter((s) => s.causa === c.id), base = ss.reduce((a, s) => a + (+s.gravedad || 3) * (nivel(s.area) === 'stop' ? 1.3 : 1), 0) + ST.hallazgos.filter((h) => h.causa === c.id).reduce((a, h) => a + (+h.gravedad || 3), 0); return { ss, base, score: base / (1 + ((+c.esfuerzo || 3) - 1) * 0.25) }; };
  const causasOrdenadas = () => ST.causas.filter((c) => c.estado !== 'descartada').map((c) => Object.assign({ c }, pesoCausa(c))).sort((a, b) => b.score - a.score);
  // El 20 %: las causas de mayor peso que, juntas, explican el 80 % de la gravedad de los síntomas
  const veinte = () => { const l = causasOrdenadas(), tot = l.reduce((a, x) => a + x.base, 0); let acc = 0; const out = []; for (const x of l) { if (tot && acc / tot >= 0.8) break; acc += x.base; out.push(x.c.id); } return new Set(out.slice(0, Math.max(1, Math.ceil(l.length * 0.35)))); };
  // Causa sugerida para un síntoma: misma área y patrón, y palabras en común
  const sugerirCausa = (s) => {
    const f = norm(s.t + ' ' + (s.cita || ''));
    let mejor = null, pt = 0;
    D.CAUSAS.forEach((c) => { let p = (c.area === s.area ? 3 : 0) + (c.patron === s.patron ? 2 : 0); c.k.forEach((k) => { if (f.includes(norm(k))) p += 3; }); if (p > pt) { pt = p; mejor = c; } });
    return pt >= 3 ? mejor : null;
  };
  const asegurarCausa = (ref) => { let c = ST.causas.find((x) => x.ref === ref.id); if (!c) { c = { id: uid(), ref: ref.id, t: ref.n, area: ref.area, patron: ref.patron, esfuerzo: ref.esfuerzo, estado: 'hipotesis', porques: ['', '', ''] }; ST.causas.push(c); } return c; };
  const ruta = () => D.AREAS.map((a) => ({ a, n: nivel(a.id), ss: sintomasDe(a.id), cs: ST.causas.filter((c) => c.area === a.id && c.estado !== 'descartada') })).filter((x) => x.n || x.ss.length).sort((x, y) => ({ stop: 0, warn: 1, ok: 2, '': 3 }[x.n] - { stop: 0, warn: 1, ok: 2, '': 3 }[y.n]) || y.ss.length - x.ss.length);
  const capa = (k) => ({ guion: 1, constantes: 1, escucha: 1, sintomas: 1, triaje: 1, auditoria: 2, ecosistema: 2, plan: 3, sesiones: 3, informes: 3 }[k]);

  /* ---------- Pestañas y recorrido ---------- */
  const TABS = [
    ['guion', 'Guion de la sesión', 'Primera sesión'], ['constantes', 'Constantes vitales', 'Primera sesión'], ['escucha', 'Escucha y transcripción', 'Primera sesión'], ['sintomas', 'Síntomas y causas', 'Primera sesión'], ['triaje', 'Triaje y hoja de ruta', 'Primera sesión'],
    ['auditoria', 'Verificación por áreas', 'Auditoría integral'], ['ecosistema', 'Desviaciones del ecosistema', 'Auditoría integral'],
    ['plan', 'Plan de intervención', 'Intervención'], ['sesiones', 'Sesiones y seguimiento', 'Intervención'], ['informes', 'Informes', 'Intervención']
  ];
  const nPreg = () => D.GUION.reduce((a, b) => a + b.p.length, 0);
  const hecho = (k) => {
    if (k === 'guion') return Object.keys(ST.sesion.hechas || {}).filter((x) => ST.sesion.hechas[x]).length >= nPreg() / 2;
    if (k === 'constantes') return D.CONSTANTES.every((c) => cte(c.id));
    if (k === 'escucha') return ST.transcripciones.length > 0;
    if (k === 'sintomas') return ST.sintomas.length >= 3 && ST.sintomas.every((s) => s.causa);
    if (k === 'triaje') return ruta().length > 0 && ruta().every((x) => x.n);
    if (k === 'auditoria') { const r = ruta(); const tot = r.reduce((a, x) => a + (D.VERIFICA[x.a.id] || []).length, 0), rev = r.reduce((a, x) => a + Object.values(ST.verifica[x.a.id] || {}).filter((v) => v && v.e && v.e !== 'pend').length, 0); return tot > 0 && rev / tot >= 0.5; }
    if (k === 'ecosistema') return !!ST.volcado;
    if (k === 'plan') return ST.plan.acciones.length > 0;
    if (k === 'sesiones') return ST.sesiones.length > 1;
    if (k === 'informes') return Object.keys(ST.informes || {}).length > 0;
    return false;
  };
  function pintarTabs() {
    const grupos = ['Primera sesión', 'Auditoría integral', 'Intervención'];
    $('#ivRuta').innerHTML = grupos.map((g, i) => { const ts = TABS.filter((t) => t[2] === g), h = ts.filter((t) => hecho(t[0])).length; return `<div class="iv-capa ${ts.some((t) => t[0] === tab) ? 'on' : ''}"><span class="iv-cn">${i + 1}</span><div><b>${g}</b><span class="iv-dots">${ts.map((t) => `<button class="iv-dot ${hecho(t[0]) ? 'ok' : ''} ${t[0] === tab ? 'on' : ''}" data-t="${t[0]}" title="${esc(t[1])}${hecho(t[0]) ? ' · hecho' : ''}" aria-label="${esc(t[1])}"></button>`).join('')}</span></div><small>${h}/${ts.length}</small></div>`; }).join('<span class="iv-flecha" aria-hidden="true">→</span>');
    $('#ivTabs').innerHTML = grupos.map((g) => `<span class="iv-tg">${g}</span>${TABS.filter((t) => t[2] === g).map(([k, n]) => `<button role="tab" data-t="${k}" aria-selected="${k === tab}">${n}${hecho(k) ? ' <i class="iv-ok" aria-label="hecho">●</i>' : ''}</button>`).join('')}`).join('');
    $$('#ivTabs [data-t], #ivRuta [data-t]').forEach((b) => (b.onclick = () => ir(b.dataset.t)));
  }
  const ir = (k) => { tab = k; try { history.replaceState(null, '', '#' + k); } catch (e) { /* nada */ } render(); const t = $('#ivTabs'); if (t && scrollY > t.offsetTop) scrollTo({ top: t.offsetTop - 90, behavior: 'smooth' }); };
  V.ir = ir;
  const VISTAS = {};
  function render() {
    pintarTabs();
    const host = $('#ivPanel'), y = scrollY;
    try { VISTAS[tab](host); } catch (e) { host.innerHTML = `<div class="alert stop">No se pudo mostrar: ${esc(e.message)}</div>`; console.error(e); }
    scrollTo({ top: y });
    pintarHero();
    guardar();
  }
  V.render = () => render();

  /* ---------- Portada ---------- */
  function pintarHero() {
    const hero = $('#ivHero'); if (!hero || !A.heroMundo) return;
    const g = global(), r = ruta(), urg = r.filter((x) => x.n === 'stop'), top = causasOrdenadas()[0];
    const fase = ST.plan.acciones.length ? (D.FASES.find((f) => ST.plan.acciones.some((a) => a.f === f.id && a.estado !== 'hecha')) || D.FASES[3]).n : capa(tab) === 1 ? 'Primera sesión' : 'Auditoría';
    const hc = { kicker: 'Auditoría integral', titulo: '¿Dónde le duele <em>de verdad</em> a la empresa?', lede: 'Como en un triaje: se toman las constantes, se escucha al empresario, se separan los síntomas de las causas y cada uno va a su área. De aquí sale la hoja de ruta de la auditoría integral y, después, el plan de intervención completo.',
      empresa: empresa(), datos: [['Síntomas', String(ST.sintomas.length)], ['Causas', String(ST.causas.filter((c) => c.estado !== 'descartada').length)], ['Áreas en urgencias', String(urg.length)], ['Fase', fase]],
      acciones: [{ t: ST.transcripciones.length || Object.keys(ST.sesion.hechas || {}).length ? 'Seguir con la primera sesión' : 'Empezar la primera sesión', cls: 'solid', fn: () => ir(!Object.keys(ST.sesion.hechas || {}).length ? 'guion' : !ST.transcripciones.length ? 'escucha' : 'sintomas') }, { t: 'Subir la transcripción', fn: () => ir('escucha') }, { t: 'Guía del auditor', cls: 'ghost', fn: () => V.informes.guia() }],
      veredicto: { kicker: 'Triaje de la empresa', st: g || 'warn', titulo: !g ? 'Sin constantes todavía' : g === 'stop' ? `${pl(urg.length, 'área', 'áreas')} en urgencias` : g === 'warn' ? 'Atención preferente este trimestre' : 'Estable: intervención programable', texto: top ? `Causa con más peso: ${top.c.t}. Cada franja es un área: toca para ver su triaje.` : 'Cada franja es un área de la empresa. Escucha la sesión y anota los síntomas para colorearlas.',
        luces: D.AREAS.map((a) => ({ n: a.n, v: (TRIAJE[nivel(a.id)] || { n: 'Sin datos' }).n, st: nivel(a.id) || null, fn: () => ir('triaje') })) },
      kpis: D.CONSTANTES.filter((c) => ['tension', 'temperatura', 'pulso', 'dependencia'].includes(c.id)).map((c) => ({ k: c.n, v: cte(c.id) ? cte(c.id) + '/5' : '—', d: c.q.toLowerCase(), st: cte(c.id) ? D.nivelConst(cte(c.id)) : null, fn: () => ir('constantes') })) };
    hero.innerHTML = A.heroMundo.html(hc); A.heroMundo.wire(hero, hc);
  }

  /* ================= CAPA 1 · PRIMERA SESIÓN ================= */
  let reloj = null, t0 = null;
  VISTAS.guion = (host) => {
    const s = ST.sesion, hechas = Object.keys(s.hechas || {}).filter((k) => s.hechas[k]).length;
    let min = 0;
    host.innerHTML = `<div class="glass pad stack"><div class="row iv-ses"><div class="iv-sesd"><div class="eyebrow">Primera sesión · una hora</div><p class="small" style="margin:4px 0 0">Hoy se escucha, no se juzga. Apunta las frases literales: son la materia prima del diagnóstico. Lo que el empresario repite, minimiza o coloca fuera suele ser el síntoma; la causa está detrás.</p></div>
        <div class="iv-reloj"><b id="ivReloj">${t0 ? '' : '00:00'}</b><small id="ivBloque">${t0 ? '' : 'Sin empezar'}</small><button class="btn ${t0 ? '' : 'solid'} small" id="ivCrono">${t0 ? 'Parar' : 'Empezar la sesión'}</button></div></div>
      <div class="iv-g3"><label class="small">Fecha<input class="input" type="date" data-s="fecha" value="${esc(s.fecha)}"></label><label class="small">Consultor<input class="input" data-s="consultor" value="${esc(s.consultor)}" placeholder="Tu nombre"></label><label class="small">Asistentes<input class="input" data-s="asistentes" value="${esc(s.asistentes)}" placeholder="Empresario, socio, gerente…"></label></div>
      <div class="iv-prog"><span style="width:${Math.round((hechas / nPreg()) * 100)}%"></span></div><small class="muted">${hechas} de ${nPreg()} preguntas hechas</small></div>
      ${D.GUION.map((b) => { const ini = min; min += b.min; return `<section class="glass pad stack iv-bloque" data-b="${b.id}"><div class="row"><span class="iv-min">${String(ini).padStart(2, '0')}–${String(min).padStart(2, '0')} min</span><h3 class="iv-bt">${esc(b.n)}</h3><span class="spacer"></span><small class="muted">${esc(b.obj)}</small></div>
        <ol class="iv-preg">${b.p.map((p, i) => { const k = b.id + ':' + i; return `<li class="${s.hechas[k] ? 'hecha' : ''}" data-q="${k}"><label class="iv-qh"><input type="checkbox" data-h ${s.hechas[k] ? 'checked' : ''}><b>${esc(p.q)}</b></label><small class="iv-oye">Qué escuchar: ${esc(p.oye)}${p.area ? ` · <span class="iv-ar" style="--c:${D.area(p.area).c}">${esc(D.area(p.area).n)}</span>` : ''}</small><textarea class="input" rows="2" data-n placeholder="Frases literales y observaciones">${esc(s.notas[k] || '')}</textarea><div class="row"><button class="btn ghost small" data-sin>Apuntar como síntoma</button></div></li>`; }).join('')}</ol></section>`; }).join('')}`;
    $$('[data-s]', host).forEach((i) => (i.oninput = () => { s[i.dataset.s] = i.value; guardar(); }));
    $$('.iv-preg li', host).forEach((li) => {
      const k = li.dataset.q, [b, i] = k.split(':'), p = D.GUION.find((x) => x.id === b).p[+i];
      $('[data-h]', li).onchange = (e) => { s.hechas[k] = e.target.checked; li.classList.toggle('hecha', e.target.checked); guardar(); pintarTabs(); };
      $('[data-n]', li).oninput = (e) => { s.notas[k] = e.target.value; if (e.target.value && !s.hechas[k]) { s.hechas[k] = true; $('[data-h]', li).checked = true; li.classList.add('hecha'); } guardar(); };
      $('[data-sin]', li).onclick = () => { const t = (s.notas[k] || '').trim(); if (!t) return toast('Escribe primero lo que ha dicho.'); ST.sintomas.push({ id: uid(), t: t.length > 140 ? t.slice(0, 137) + '…' : t, cita: t, area: p.area || E.areaDe(t, 'gob'), patron: p.patron || '', gravedad: 3, origen: 'guion' }); guardar(); toast('Síntoma apuntado. Lo verás en «Síntomas y causas».'); pintarTabs(); };
    });
    const tick = () => { if (!t0) return; const m = Math.floor((Date.now() - t0) / 60000), sg = Math.floor((Date.now() - t0) / 1000) % 60; const r = $('#ivReloj'); if (!r) return; r.textContent = `${String(m).padStart(2, '0')}:${String(sg).padStart(2, '0')}`; let acc = 0; const b = D.GUION.find((x) => (acc += x.min) > m) || D.GUION[D.GUION.length - 1]; $('#ivBloque').textContent = m >= 60 ? 'Tiempo cumplido' : 'Ahora: ' + b.n; $$('.iv-bloque').forEach((x) => x.classList.toggle('ahora', x.dataset.b === b.id)); };
    $('#ivCrono', host).onclick = () => { if (t0) { t0 = null; clearInterval(reloj); } else { t0 = Date.now(); clearInterval(reloj); reloj = setInterval(tick, 1000); } render(); };
    tick();
  };

  /* Monitor de constantes: una línea de pulso por constante, con su color */
  const monitor = () => {
    const W = 560, H = 22;
    return `<svg class="iv-monitor" viewBox="0 0 ${W} ${D.CONSTANTES.length * (H + 12)}" role="img" aria-label="Monitor de constantes vitales">${D.CONSTANTES.map((c, i) => {
      const v = cte(c.id), y = i * (H + 12) + H / 2 + 4, col = v ? { ok: '#2fb24a', warn: '#e8a33b', stop: '#e04848' }[D.nivelConst(v)] : '#4a5363';
      const amp = v ? 3 + v * 1.6 : 1, paso = v ? 52 - v * 6 : 60; let d = `M110,${y}`; for (let x = 110; x < W - 50; x += paso) d += ` L${x + paso * 0.35},${y} L${x + paso * 0.45},${y - amp * 2} L${x + paso * 0.55},${y + amp} L${x + paso * 0.62},${y}`;
      return `<text x="0" y="${y + 4}" class="iv-mt">${esc(c.n)}</text><path d="${d} L${W - 50},${y}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/><text x="${W - 4}" y="${y + 5}" text-anchor="end" class="iv-mv" fill="${col}">${v ? v + '/5' : '—'}</text>`; }).join('')}</svg>`;
  };
  /* Radar de áreas: gravedad de los síntomas por área */
  const radar = () => {
    const R = 120, cx = 160, cy = 150, n = D.AREAS.length, val = D.AREAS.map((a) => Math.min(1, (sintomasDe(a.id).reduce((x, s) => x + (+s.gravedad || 3), 0) + desvDe(a.id) * 3) / 15));
    const pt = (i, r) => [cx + Math.sin((i / n) * 2 * Math.PI) * r, cy - Math.cos((i / n) * 2 * Math.PI) * r];
    return `<svg class="iv-radar" viewBox="0 0 320 300" role="img" aria-label="Mapa de síntomas por área">${[0.33, 0.66, 1].map((k) => `<polygon points="${D.AREAS.map((a, i) => pt(i, R * k).join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.12)"/>`).join('')}
      <polygon points="${val.map((v, i) => pt(i, R * Math.max(0.04, v)).join(',')).join(' ')}" fill="rgba(224,72,72,.22)" stroke="#e04848" stroke-width="1.6"/>
      ${D.AREAS.map((a, i) => { const [x, y] = pt(i, R + 16), st = nivel(a.id); return `<circle cx="${pt(i, R)[0]}" cy="${pt(i, R)[1]}" r="5" fill="${st ? { ok: '#2fb24a', warn: '#e8a33b', stop: '#e04848' }[st] : '#4a5363'}"/><text x="${x}" y="${y}" text-anchor="middle" class="iv-rt">${esc(a.n.split(' ')[0])}</text>`; }).join('')}</svg>`;
  };
  V.radar = radar; V.monitor = monitor;
  VISTAS.constantes = (host) => {
    const est = (ST.transcripciones[ST.transcripciones.length - 1] || {}).analisis;
    host.innerHTML = `<div class="grid iv-two"><section class="glass pad stack"><div class="eyebrow">Constantes vitales</div><p class="small" style="margin:0">Tómalas al final de la sesión con lo que has visto y oído. ${est ? 'La marca blanca es la estimación que sale de su lenguaje en la transcripción: si no coincide con la tuya, pregunta por qué.' : 'Si subes la transcripción, verás también la estimación que sale de su lenguaje.'}</p>
        ${D.CONSTANTES.map((c) => `<div class="iv-cte" data-c="${c.id}"><div class="row"><b>${esc(c.n)}</b><small class="muted">${esc(c.q)}</small></div><div class="iv-esc">${c.e.map((t, i) => `<button class="iv-e ${cte(c.id) === i + 1 ? 'on ' + D.nivelConst(i + 1) : ''} ${est && est.estimadas && est.estimadas[c.id] === i + 1 ? 'est' : ''}" data-v="${i + 1}" title="${esc(t)}"><span>${i + 1}</span><small>${esc(t)}</small></button>`).join('')}</div></div>`).join('')}</section>
      <section class="glass pad stack"><div class="eyebrow">Monitor</div>${monitor()}<div class="eyebrow">Síntomas por área</div>${radar()}<p class="small muted" style="margin:0">El mapa crece con la gravedad de los síntomas apuntados en cada área; el punto de cada vértice es su triaje.</p></section></div>`;
    $$('.iv-cte', host).forEach((d) => $$('[data-v]', d).forEach((b) => (b.onclick = () => { ST.constantes[d.dataset.c] = +b.dataset.v; render(); })));
  };

  /* ---------- Escucha ---------- */
  VISTAS.escucha = (host) => {
    const tr = trSel && ST.transcripciones.find((x) => x.id === trSel) || ST.transcripciones[ST.transcripciones.length - 1];
    if (tr) trSel = tr.id;
    const an = tr && tr.analisis;
    host.innerHTML = `<div class="grid iv-two"><section class="glass pad stack"><div class="eyebrow">Transcripción de la sesión</div>
        <p class="small" style="margin:0">Sube el archivo de la grabadora o de la herramienta de actas (texto, SRT, VTT, Word o PDF) o pega el texto. Se separa quién habla y se lee lo que dice el empresario: los huecos que delata, cómo habla, lo que quiere decir de verdad y los síntomas, cada uno con su cita.</p>
        <div class="row"><label class="btn solid small iv-file">Subir archivo<input type="file" id="ivFile" accept=".txt,.md,.srt,.vtt,.docx,.pdf,.json" hidden></label><span class="small muted">o pega el texto:</span></div>
        <textarea class="input" id="ivPega" rows="5" placeholder="Ana: Pues mira, todo pasa por mí…&#10;Consultor: ¿Y si faltas dos semanas?…"></textarea>
        <div class="row"><input class="input" id="ivTrN" placeholder="Nombre (p. ej. Primera sesión con Ana)" style="flex:1"><button class="btn small" id="ivTrAdd">Analizar el texto pegado</button></div>
        ${ST.transcripciones.length ? `<div class="row iv-fil">${ST.transcripciones.map((x) => `<button class="chip" aria-pressed="${x.id === trSel}" data-tr="${x.id}">${esc(x.nombre)} · ${fCorta(x.fecha)}</button>`).join('')}</div>` : ''}
        <div class="eyebrow">Captura en directo</div><p class="small muted" style="margin:0">Durante la sesión, apunta frases literales y el hueco que delatan.</p>
        <div class="iv-g3"><input class="input" id="ivCap" placeholder="«Eso lo llevo en la cabeza»"><select class="input" id="ivCapP">${D.PATRONES.map((p) => `<option value="${p.id}">${esc(p.n)}</option>`).join('')}</select><button class="btn small" id="ivCapB">Apuntar</button></div></section>
      <section class="glass pad stack">${tr ? `<div class="row"><div><div class="eyebrow">${esc(tr.nombre)}</div><small class="muted">${pl(tr.turnos.length, 'intervención', 'intervenciones')} · ${an ? `el empresario habla el ${an.pctCliente} % (${an.palabras} palabras)` : ''}</small></div><span class="spacer"></span><button class="btn ghost small" id="ivTrDel">Quitar</button></div>
        <div class="small">¿Quién es el empresario? ${tr.hablantes.map((h) => `<label class="iv-inl"><input type="checkbox" data-hab="${esc(h.n)}" ${tr.clientes.includes(h.n) ? 'checked' : ''}> ${esc(h.n)} <span class="muted">(${h.palabras})</span></label>`).join('')}</div>
        ${an ? `<div class="iv-kp"><div><span>Huecos con cita</span><b>${an.huecos.filter((h) => h.peso).length}/7</b></div><div><span>Yo / nosotros</span><b>${an.yo}/${an.nos}</b></div><div><span>Resignificar</span><b>${an.resig.length}</b></div><div><span>Síntomas sugeridos</span><b>${an.sugeridos.length}</b></div></div>
          <div class="row"><button class="btn solid small" id="ivIA">Lectura en profundidad con Claude</button><span class="small muted" id="ivIAm">Lee el contexto completo: lo que dice y lo que no dice.</span></div>` : ''}` : '<div class="eyebrow">Sin transcripción</div><p class="small muted" style="margin:0">Cuando subas la transcripción, aquí verás el análisis.</p>'}</section></div>
      ${an ? analisisHTML(tr) : ''}`;
    // Cargar
    const nuevo = (nombre, texto) => {
      const p = E.parse(texto); if (!p.turnos.length) return toast('No se ha encontrado texto en la transcripción.');
      const clientes = E.clientePorDefecto(p.hablantes, ST.sesion.consultor);
      const t = { id: uid(), nombre: nombre || 'Sesión ' + fCorta(hoy()), fecha: hoy(), turnos: p.turnos, hablantes: p.hablantes, clientes };
      t.analisis = E.analizar(p, clientes); ST.transcripciones.push(t); trSel = t.id; render();
      toast(`Transcripción analizada: ${pl(t.analisis.sugeridos.length, 'síntoma sugerido', 'síntomas sugeridos')}.`);
    };
    $('#ivFile', host).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { nuevo(f.name.replace(/\.[^.]+$/, ''), await E.leerArchivo(f)); } catch (x) { toast(x.message); } };
    $('#ivTrAdd', host).onclick = () => { const t = $('#ivPega', host).value.trim(); if (!t) return toast('Pega primero el texto.'); nuevo($('#ivTrN', host).value.trim(), t); };
    $$('[data-tr]', host).forEach((b) => (b.onclick = () => { trSel = b.dataset.tr; render(); }));
    $('#ivCapB', host).onclick = () => { const t = $('#ivCap', host).value.trim(); if (!t) return; const p = D.patron($('#ivCapP', host).value); ST.sintomas.push({ id: uid(), t: p.vacio.split(';')[0].replace(/\.$/, ''), cita: t, area: E.areaDe(t, p.area), patron: p.id, gravedad: 3, origen: 'directo' }); $('#ivCap', host).value = ''; guardar(); toast('Apuntado en «Síntomas y causas».'); pintarTabs(); };
    if (!tr) return;
    $('#ivTrDel', host).onclick = (e) => { if (!e.target.dataset.ok) { e.target.dataset.ok = 1; e.target.textContent = '¿Seguro?'; return; } ST.transcripciones = ST.transcripciones.filter((x) => x !== tr); trSel = null; render(); };
    $$('[data-hab]', host).forEach((c) => (c.onchange = () => { tr.clientes = $$('[data-hab]', host).filter((x) => x.checked).map((x) => x.dataset.hab); tr.analisis = E.analizar({ turnos: tr.turnos, hablantes: tr.hablantes }, tr.clientes); render(); }));
    wireAnalisis(host, tr);
    const ia = $('#ivIA', host); if (ia) ia.onclick = async () => {
      ia.disabled = true; $('#ivIAm', host).textContent = 'Leyendo la sesión… puede tardar un minuto.';
      try {
        const texto = tr.turnos.map((x) => `${x.h}: ${x.t}`).join('\n');
        const r = await E.conIA(texto, `El empresario es: ${tr.clientes.join(', ') || 'quien más habla'}. Empresa: ${empresa()}.`);
        if (!r) { $('#ivIAm', host).textContent = 'Claude no está disponible aquí: con el servidor de Atalaya y su clave, o desde el visor de Claude, se activa. El análisis de abajo funciona sin conexión.'; ia.disabled = false; return; }
        tr.ia = r; render(); toast('Lectura en profundidad lista: revisa y añade lo que compartas.');
      } catch (x) { $('#ivIAm', host).textContent = 'No se pudo: ' + x.message; ia.disabled = false; }
    };
  };
  const analisisHTML = (tr) => {
    const an = tr.analisis, ya = new Set(ST.sintomas.map((s) => norm(s.cita)));
    const max = Math.max(1, ...an.lenguaje.map((l) => l.por1000));
    return `${tr.ia ? iaHTML(tr) : ''}
      <section class="glass pad stack"><div class="eyebrow">Los huecos que delata su lenguaje</div><div class="iv-huecos">${an.huecos.map((h) => { const p = D.patron(h.id); return `<div class="iv-hueco ${h.peso ? (h.peso >= 3 ? 'stop' : 'warn') : ''}"><div class="row"><b>${esc(p.n)}</b><span class="spacer"></span><span class="iv-cnt">${h.peso || '—'}</span></div><small class="muted">${esc(p.q)}</small>${h.citas.length ? `<ul>${h.citas.slice(0, 3).map((c) => `<li>«${esc(c.cita)}»</li>`).join('')}</ul>` : '<p class="small muted" style="margin:4px 0 0">No observado en la sesión.</p>'}</div>`; }).join('')}</div></section>
      <div class="grid iv-two"><section class="glass pad stack"><div class="eyebrow">Cómo habla</div>${an.lenguaje.map((l) => `<div class="iv-lx"><div class="row"><b>${esc(l.n)}</b><span class="spacer"></span><small class="muted">${l.cuenta} · ${String(l.por1000).replace('.', ',')} por mil palabras</small></div><div class="iv-bar"><span style="width:${(l.por1000 / max) * 100}%"></span></div><small class="muted">${esc(l.d)}</small>${l.ejemplos[0] ? `<small class="iv-ej">«${esc(l.ejemplos[0])}»</small>` : ''}</div>`).join('')}
          <div class="iv-lx"><div class="row"><b>«Yo» frente a «nosotros»</b><span class="spacer"></span><small class="muted">${an.yo} / ${an.nos}</small></div><small class="muted">${an.yo > an.nos * 2 ? 'Habla mucho más en primera persona: la empresa gira alrededor de él.' : 'Equilibrado: habla de la empresa como un equipo.'}</small></div></section>
        <section class="glass pad stack"><div class="eyebrow">Palabras que más repite</div><div class="iv-pal">${an.repite.map((x) => `<span class="chip">${esc(x.w)} <small>${x.n}</small></span>`).join('') || '<span class="small muted">Sin repeticiones destacadas.</span>'}</div><p class="small muted" style="margin:0">Pregunta qué quiere decir exactamente con cada una: la misma palabra puede significar cosas distintas para él y para su equipo.</p>
          <div class="eyebrow">Lo que dice y lo que quiere decir</div>${an.resig.length ? `<div class="iv-resig">${an.resig.map((r) => `<div><small class="muted">Dice</small><b>«${esc(r.cita)}»</b><small class="muted">Puede estar diciendo</small><p>${esc(r.quiere)}</p><small class="muted">Pregunta para confirmarlo</small><p class="iv-pq">${esc(r.pregunta)}</p></div>`).join('')}</div>` : '<p class="small muted" style="margin:0">No hay frases tipo para resignificar en esta transcripción.</p>'}</section></div>
      <section class="glass pad stack"><div class="row"><div class="eyebrow">Síntomas sugeridos</div><span class="spacer"></span><button class="btn small" id="ivSugTodo">Añadir todos los marcados</button></div><p class="small muted" style="margin:0">Cada uno con su cita literal. Marca los que compartes; después los enlazarás a su causa.</p>
        <ul class="iv-sug">${an.sugeridos.map((s, i) => `<li><label><input type="checkbox" data-sg="${i}" ${ya.has(norm(s.cita)) ? 'disabled' : 'checked'}><span><b>«${esc(s.t)}»</b><small>${esc(s.hueco || '')} · ${esc(D.area(s.area).n)}${ya.has(norm(s.cita)) ? ' · ya añadido' : ''}</small></span></label></li>`).join('') || '<li class="small muted">Sin sugerencias: añade síntomas a mano en «Síntomas y causas».</li>'}</ul></section>`;
  };
  const iaHTML = (tr) => {
    const r = tr.ia || {}, ya = new Set(ST.sintomas.map((s) => norm(s.cita)));
    return `<section class="glass pad stack iv-ia"><div class="eyebrow">Lectura en profundidad · Claude</div>${r.cita_clave ? `<blockquote class="iv-cita">«${esc(r.cita_clave)}»</blockquote>` : ''}${r.resumen ? `<p style="margin:0">${esc(r.resumen)}</p>` : ''}
      ${(r.alertas || []).length ? `<div class="alert stop small">Alertas: ${r.alertas.map(esc).join(' · ')}</div>` : ''}
      ${(r.resignificaciones || []).length ? `<div class="iv-resig">${r.resignificaciones.map((x) => `<div><small class="muted">Dice</small><b>«${esc(x.dice)}»</b><small class="muted">Quiere decir</small><p>${esc(x.quiere)}</p><small class="muted">Pregunta</small><p class="iv-pq">${esc(x.pregunta)}</p></div>`).join('')}</div>` : ''}
      ${(r.sintomas || []).length ? `<div class="row"><b>Síntomas</b><span class="spacer"></span><button class="btn small" id="ivIASin">Añadir los marcados</button></div><ul class="iv-sug">${r.sintomas.map((s, i) => `<li><label><input type="checkbox" data-isg="${i}" ${ya.has(norm(s.cita)) ? 'disabled' : 'checked'}><span><b>${esc(s.t)}</b><small>«${esc(s.cita)}» · ${esc((D.area(s.area) || {}).n || s.area)} · gravedad ${esc(s.gravedad)}</small></span></label></li>`).join('')}</ul>` : ''}
      ${(r.causas || []).length ? `<div class="row"><b>Causas probables</b><span class="spacer"></span><button class="btn ghost small" id="ivIACau">Añadirlas como hipótesis</button></div><ol class="small" style="margin:0;padding-left:18px">${r.causas.map((c) => `<li><b>${esc(c.t)}</b> · ${esc((D.area(c.area) || {}).n || '')}${(c.explica || []).length ? ` — explica: ${c.explica.map(esc).join('; ')}` : ''}</li>`).join('')}</ol>` : ''}
      ${r.constantes ? `<div class="row"><small class="muted">Constantes leídas: ${D.CONSTANTES.map((c) => `${c.n} ${r.constantes[c.id] || '—'}`).join(' · ')}</small><span class="spacer"></span><button class="btn ghost small" id="ivIACte">Usarlas en las constantes vacías</button></div>` : ''}
      ${(r.preguntas_pendientes || []).length ? `<div><b class="small">Para la auditoría integral</b><ul class="small" style="margin:4px 0 0;padding-left:18px">${r.preguntas_pendientes.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>` : ''}</section>`;
  };
  const wireAnalisis = (host, tr) => {
    const b = $('#ivSugTodo', host); if (b) b.onclick = () => { let n = 0; $$('[data-sg]', host).filter((c) => c.checked && !c.disabled).forEach((c) => { const s = tr.analisis.sugeridos[+c.dataset.sg]; ST.sintomas.push(Object.assign({ id: uid(), gravedad: 3 }, s)); n++; }); render(); toast(`${pl(n, 'síntoma añadido', 'síntomas añadidos')}.`); };
    const r = tr.ia; if (!r) return;
    const s1 = $('#ivIASin', host); if (s1) s1.onclick = () => { let n = 0; $$('[data-isg]', host).filter((c) => c.checked && !c.disabled).forEach((c) => { const s = r.sintomas[+c.dataset.isg]; ST.sintomas.push({ id: uid(), t: s.t, cita: s.cita, area: D.area(s.area) ? s.area : E.areaDe(s.cita, 'gob'), patron: D.patron(s.patron) ? s.patron : '', gravedad: Math.min(5, Math.max(1, +s.gravedad || 3)), origen: 'claude' }); n++; }); render(); toast(`${pl(n, 'síntoma añadido', 'síntomas añadidos')}.`); };
    const c1 = $('#ivIACau', host); if (c1) c1.onclick = () => { r.causas.forEach((c) => { if (!ST.causas.some((x) => norm(x.t) === norm(c.t))) ST.causas.push({ id: uid(), ref: null, t: c.t, area: D.area(c.area) ? c.area : 'gob', patron: '', esfuerzo: 3, estado: 'hipotesis', porques: ['', '', ''] }); }); render(); toast('Causas añadidas como hipótesis en «Síntomas y causas».'); };
    const k1 = $('#ivIACte', host); if (k1) k1.onclick = () => { D.CONSTANTES.forEach((c) => { if (!ST.constantes[c.id] && r.constantes[c.id]) ST.constantes[c.id] = Math.min(5, Math.max(1, +r.constantes[c.id])); }); render(); toast('Constantes completadas: revísalas en «Constantes vitales».'); };
  };

  /* La lógica de síntomas, triaje, auditoría, plan, sesiones e informes está en vistas.js */
  V.int = { D, E, $, $$, esc, norm, uid, hoy, sumar, fCorta, fLarga, pl, ST_N, TRIAJE, guardar, guardarYa, toast, empresa, sintomasDe, desvDe, nivel, nivelAuto, global, cte, causaDe, pesoCausa, causasOrdenadas, veinte, sugerirCausa, asegurarCausa, ruta, render, ir, VISTAS, st: () => ST, set: (k, v) => { if (k === 'sesSel') sesSel = v; if (k === 'vistaPlan') vistaPlan = v; }, get: (k) => (k === 'sesSel' ? sesSel : k === 'vistaPlan' ? vistaPlan : null) };

  /* ---------- Arranque ---------- */
  V.start = async () => {
    A.sky && A.sky();
    const Pl = P();
    if (Pl) {
      const ok = await Pl.guard(); if (!ok) return; Pl.mountAccount($('#account'));
      if (A.assistant) A.assistant.init({ page: 'intervencion' });
      if (Pl.puede && !Pl.puede('intervencion')) {
        $('#ivTabs').innerHTML = ''; $('#ivRuta').innerHTML = '';
        $('#ivPanel').innerHTML = `<div class="glass pad stack" style="max-width:740px;margin:40px auto"><div class="eyebrow">Auditoría integral</div><h2>Incluida en el plan <em>Consultora</em></h2><p>La auditoría integral es la herramienta del consultor para entrar en una empresa: la primera sesión como un triaje (constantes, escucha y síntomas), la hoja de ruta de la auditoría integral y el plan de intervención completo con sus sesiones.</p><div class="row"><button class="btn solid" id="ivPlanes">Ver el plan Consultora</button></div></div>`;
        $('#ivPlanes').onclick = () => Pl.panelPlanes({ destacar: 'consultora' });
        return;
      }
      if (Pl.empresas) await Pl.empresas.cargar();
    }
    ST = await cargar();
    const h = location.hash.replace('#', ''); if (VISTAS[h]) tab = h;
    render();
    V.listo = true;
  };
})();
