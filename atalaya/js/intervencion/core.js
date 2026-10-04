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
  const vacio = () => ({ v: 1, sesion: { fecha: hoy(), consultor: '', asistentes: '', notas: {}, hechas: {} }, constantes: {}, areas: {}, objetivos: [], transcripciones: [], sintomas: [], causas: [], verifica: {}, hallazgos: [], plan: { inicio: '', acciones: [] }, sesiones: [], volcado: null, informes: {} });
  let ST = null, tab = 'guion', patSel = 'responsable', trSel = null, sesSel = null, vistaPlan = 'fase';
  const guardar = (() => { let t; return () => { clearTimeout(t); t = setTimeout(guardarYa, 500); }; })();
  async function guardarYa() { try { localStorage.setItem(LSK(), JSON.stringify(ST)); } catch (e) { /* sin almacenamiento */ } if (P() && P().saveData) { try { await P().saveData('intervencion', ST); } catch (e) { /* se queda en local */ } } }
  async function cargar() {
    let st = null; try { st = JSON.parse(localStorage.getItem(LSK())); } catch (e) { st = null; }
    if (P() && P().loadData) { try { const r = await P().loadData('intervencion'); if (r) st = r; } catch (e) { /* local */ } }
    st = Object.assign(vacio(), st || {});
    ['objetivos', 'transcripciones', 'sintomas', 'causas', 'hallazgos', 'sesiones'].forEach((k) => { if (!Array.isArray(st[k])) st[k] = []; });
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
  const capa = (k) => ({ guion: 1, constantes: 1, escucha: 1, sintomas: 1, triaje: 1, propuesta: 1, auditoria: 2, ecosistema: 2, plan: 3, sesiones: 3, informes: 3 }[k]);

  /* ---------- Pestañas y recorrido ---------- */
  const TABS = [
    ['guion', 'Guion de la sesión', 'Primera sesión'], ['constantes', 'Constantes vitales', 'Primera sesión'], ['escucha', 'Escucha y transcripción', 'Primera sesión'], ['sintomas', 'Síntomas y causas', 'Primera sesión'], ['triaje', 'Triaje y hoja de ruta', 'Primera sesión'], ['propuesta', 'Propuesta comercial', 'Primera sesión'],
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
    if (k === 'propuesta') return !!(ST.propuesta && ST.propuesta.generada && ST.informes && ST.informes.propuesta);
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
    $('#ivRuta').insertAdjacentHTML('beforeend', `<p class="iv-leyenda"><span><i class="iv-dot ok"></i> paso hecho</span><span><i class="iv-dot"></i> pendiente</span><span><i class="iv-dot on"></i> donde estás</span><span>Toca un punto o un grupo para ir allí. Los pasos se pueden hacer en cualquier orden.</span></p>`);
    $('#ivTabs').innerHTML = grupos.map((g) => `<button class="iv-tg" data-t="${TABS.find((t) => t[2] === g)[0]}" title="Ir al primer paso de «${g}»">${g}</button>${TABS.filter((t) => t[2] === g).map(([k, n]) => `<button role="tab" data-t="${k}" aria-selected="${k === tab}">${n}${hecho(k) ? ' <i class="iv-ok" title="Paso hecho" aria-label="hecho">●</i>' : ''}</button>`).join('')}`).join('');
    $$('#ivTabs [data-t], #ivRuta [data-t]').forEach((b) => (b.onclick = () => ir(b.dataset.t)));
  }
  // ver: lleva la vista hasta la pantalla del paso (desde la portada o desde Anterior/Siguiente)
  const ir = (k, o) => { tab = k; try { history.replaceState(null, '', '#' + k); } catch (e) { /* nada */ } render(); const t = $('#ivRuta'); if (t && ((o && o.ver) || scrollY > t.offsetTop)) scrollTo({ top: t.offsetTop - 80, behavior: 'smooth' }); };
  const PASO_TXT = {
    guion: 'Durante la sesión: sigue el guion, recoge sus objetivos y apunta frases literales. Queda hecho al marcar la mitad de las preguntas.',
    constantes: 'Al terminar la sesión: puntúa del 1 al 5 las seis constantes con lo que has visto y oído.',
    escucha: 'Sube la transcripción de la grabadora (o pega el texto) y revisa lo que delata su lenguaje.',
    sintomas: 'Pasa los síntomas, enlaza cada uno con su causa y mira qué 20 % de las causas explica el 80 %.',
    triaje: 'Confirma el triaje de cada área (urgencias, preferente o programable): de aquí sale la hoja de ruta de la auditoría.',
    propuesta: 'Prepara la propuesta comercial desde la primera sesión: valor en juego, precio, protocolo y forma de pago. Queda hecho al abrir el dossier.',
    auditoria: 'Con la documentación delante, verifica cada punto de las áreas de la hoja de ruta y anota los hallazgos.',
    ecosistema: 'Trae las desviaciones que ya detecta el resto de Atalaya (estrategia, personas, simulador y mesa).',
    plan: 'Genera el plan por fases y líneas. Toca cada acción para ver sus pasos, indicadores y responsable.',
    sesiones: 'Elige el ritmo de las sesiones, genéralas y añádelas a tu calendario.',
    informes: 'Abre y descarga los informes para la empresa y la guía interna del auditor.'
  };
  /* Recorrido guiado: «Paso N de 10» arriba y Anterior/Siguiente al pie de cada pantalla */
  const pasos = (host) => {
    const i = TABS.findIndex((t) => t[0] === tab), T = TABS[i], prev = TABS[i - 1], next = TABS[i + 1];
    host.insertAdjacentHTML('afterbegin', `<div class="iv-paso"><span class="iv-pnum">Paso ${i + 1} de ${TABS.length}</span><span class="muted">${esc(T[2])}</span><b>${esc(T[1])}</b>${hecho(tab) ? '<span class="iv-st ok">Hecho</span>' : ''}<p>${esc(PASO_TXT[tab] || '')}</p></div>`);
    host.insertAdjacentHTML('beforeend', `<nav class="iv-pasos" aria-label="Recorrido paso a paso">${prev ? `<button class="btn ghost" data-paso="${prev[0]}">← ${esc(prev[1])}</button>` : '<span></span>'}<span class="iv-pn">${TABS.map((t) => `<i class="${hecho(t[0]) ? 'ok' : ''} ${t[0] === tab ? 'on' : ''}"></i>`).join('')}</span>${next ? `<button class="btn solid" data-paso="${next[0]}">Siguiente: ${esc(next[1])} →</button>` : '<span></span>'}</nav>`);
    $$('[data-paso]', host).forEach((b) => (b.onclick = () => ir(b.dataset.paso, { ver: true })));
  };
  /* Ampliar un recuadro para leerlo mejor; otro clic (o Esc) lo devuelve a su sitio */
  let maxIdx = -1;
  const recuadros = () => $$('#ivPanel .glass.pad');
  const ampliar = (sec, on) => {
    recuadros().forEach((x) => { if (x !== sec && x.classList.contains('iv-max')) ampliar(x, false); });
    sec.classList.toggle('iv-max', on); document.body.classList.toggle('iv-maxon', on);
    const b = sec.querySelector(':scope > .iv-amp'); if (b) { b.textContent = on ? '×' : '⤢'; b.title = on ? 'Volver a su sitio (Esc)' : 'Ampliar para leer mejor'; b.setAttribute('aria-label', b.title); }
    maxIdx = on ? recuadros().indexOf(sec) : -1;
    if (on) { sec.scrollTop = 0; b && b.focus(); } else if (b) b.focus({ preventScroll: true });
  };
  const botonesAmpliar = () => recuadros().forEach((sec, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'iv-amp'; b.textContent = '⤢'; b.title = 'Ampliar para leer mejor'; b.setAttribute('aria-label', b.title);
    b.onclick = (e) => { e.stopPropagation(); ampliar(sec, !sec.classList.contains('iv-max')); };
    sec.prepend(b);
    const cab = sec.querySelector(':scope > .eyebrow, :scope > .row .eyebrow, :scope > .row h3, :scope > h3');
    if (cab) { cab.classList.add('iv-cab'); cab.title = 'Ampliar o volver'; cab.onclick = () => ampliar(sec, !sec.classList.contains('iv-max')); }
    if (i === maxIdx) ampliar(sec, true);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && maxIdx >= 0 && !document.querySelector('.modal-back, .rp-back')) { const s = recuadros()[maxIdx]; if (s) ampliar(s, false); else { maxIdx = -1; document.body.classList.remove('iv-maxon'); } } });
  V.ir = ir;
  const VISTAS = {};
  function render() {
    pintarTabs();
    const host = $('#ivPanel'), y = scrollY;
    const prevTab = host.dataset.tab; if (prevTab !== tab) { maxIdx = -1; document.body.classList.remove('iv-maxon'); } host.dataset.tab = tab;
    try { VISTAS[tab](host); pasos(host); botonesAmpliar(); } catch (e) { host.innerHTML = `<div class="alert stop">No se pudo mostrar: ${esc(e.message)}</div>`; console.error(e); }
    if (maxIdx < 0) document.body.classList.remove('iv-maxon');
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
      acciones: [(() => { const sig = TABS.find((t) => !hecho(t[0])) || TABS[TABS.length - 1], i = TABS.indexOf(sig); return { t: i === 0 && !Object.keys(ST.sesion.hechas || {}).length ? 'Empezar: guion de la primera sesión' : `Seguir · paso ${i + 1}: ${sig[1].toLowerCase()}`, cls: 'solid', fn: () => ir(sig[0], { ver: true }) }; })(), { t: 'Hoja de preguntas para la sesión', cls: 'ghost', fn: () => V.informes.guia() }],
      veredicto: { kicker: 'Triaje de la empresa', st: g || 'warn', titulo: !g ? 'Sin constantes todavía' : g === 'stop' ? `${pl(urg.length, 'área', 'áreas')} en urgencias` : g === 'warn' ? 'Atención preferente este trimestre' : 'Estable: intervención programable', texto: top ? `Causa con más peso: ${top.c.t}. Cada franja es un área: toca para ver su triaje.` : 'Cada franja es un área de la empresa. Escucha la sesión y anota los síntomas para colorearlas.',
        luces: D.AREAS.map((a) => ({ n: a.n, v: (TRIAJE[nivel(a.id)] || { n: 'Sin datos' }).n, st: nivel(a.id) || null, fn: () => ir('triaje', { ver: true }) })) },
      kpis: D.CONSTANTES.filter((c) => ['tension', 'temperatura', 'pulso', 'dependencia'].includes(c.id)).map((c) => ({ k: c.n, v: cte(c.id) ? cte(c.id) + '/5' : '—', d: c.q.toLowerCase(), st: cte(c.id) ? D.nivelConst(cte(c.id)) : null, fn: () => ir('constantes', { ver: true }) })) };
    hero.innerHTML = A.heroMundo.html(hc); A.heroMundo.wire(hero, hc);
  }

  /* ---------- Objetivos del empresario (en la primera sesión) ----------
     Lo que quiere con sus palabras → objetivo SMART que depende de él, con su beneficio pesado y cómo lo va a alcanzar.
     Misma estructura que las metas de la mesa de trabajo, adonde se envía con un clic. */
  const CUANT = /\d[\d.,]*\s*(€|eur|euros|k€|mil|millones|%|horas?|h\b|d[ií]as?|semanas?|meses|minutos|clientes|pedidos|unidades|visitas|puntos)/i;
  const TERCEROS = /\b(que (los |las )?(clientes|bancos?|proveedores|empleados|trabajadores|equipo|mercado|ventas?)|que me (paguen|compren|llamen)|que suba[n]? (las )?ventas|que el banco)\b/i;
  const smartObj = (o) => [
    { k: 'E', n: 'Específico', ok: (o.especifica || '').trim().split(/\s+/).length >= 4 && /^\s*\S+(ar|er|ir)(se|lo|la|le)?\b/i.test(o.especifica || ''), h: 'Una frase que empieza por un verbo de lo que hará él.' },
    { k: 'M', n: 'Medible', ok: !!((o.indicador || '').trim() && String(o.valor || '').trim()), h: 'Indicador y valor meta (y, si puede, desde dónde parte).' },
    { k: 'A', n: 'Depende de él', ok: !!o.solo && !TERCEROS.test((o.especifica || '') + ' ' + (o.dice || '')), h: 'Que dependa solo de quien lo ejecuta, no de clientes, bancos o terceros.' },
    { k: 'R', n: 'Rentable', ok: evalObj(o).st === 'ok', h: 'Beneficio cuantificado, contras anotados y confirmado que compensa.' },
    { k: 'T', n: 'Con fecha', ok: !!o.fecha, h: 'Fecha límite.' }
  ];
  const evalObj = (o) => {
    const b = (o.beneficio || '').trim();
    if (!b) return { st: 'stop', t: 'Sin beneficio definido: ¿qué gana la empresa si lo consigue?' };
    if (o.merece === 'no') return { st: 'stop', t: 'Él mismo dice que no compensa: replantearlo o descartarlo.' };
    const q = CUANT.test(b), ok = q && (o.contras || '').trim() && o.merece === 'si';
    return ok ? { st: 'ok', t: 'Beneficio claro y pesado frente a lo que cuesta.' } : { st: 'warn', t: q ? 'Beneficio cuantificado: falta anotar lo que cuesta y confirmar que compensa.' : 'Beneficio poco concreto: póngalo en euros, horas o clientes.' };
  };
  const fraseObj = (o) => { const q = (o.especifica || o.dice || '').trim().replace(/[.\s]+$/, ''); if (!q) return ''; return `${q}${o.valor ? `, ${o.actual ? 'pasando de ' + o.actual + ' a ' : 'hasta '}${o.valor} ${o.unidad || ''}`.replace(/\s+$/, '') : ''}${o.fecha ? ', antes del ' + fLarga(o.fecha) : ''}${o.beneficio ? ', para ' + o.beneficio.charAt(0).toLowerCase() + o.beneficio.slice(1).replace(/[.\s]+$/, '') : ''}.`; };
  const objNuevo = () => ({ id: uid(), dice: '', especifica: '', indicador: '', actual: '', valor: '', unidad: '', fecha: '', responsable: '', solo: false, beneficio: '', contras: '', merece: '', como: '' });
  const objetivosHTML = () => `<div class="iv-objs" id="ivObjs"><div class="row"><div><div class="eyebrow">Objetivos del empresario</div><small class="muted">Que los ponga él. Tú le ayudas a que sean SMART y a decir cómo los va a alcanzar.</small></div><span class="spacer"></span><button class="btn small" id="ivObjN">Añadir un objetivo</button></div>
    ${(ST.objetivos || []).map((o, i) => { const sm = smartObj(o), ev = evalObj(o); return `<div class="iv-obj" data-o="${o.id}"><div class="row"><b class="iv-oid">O${i + 1}</b><span class="iv-smart">${sm.map((y) => `<i class="${y.ok ? 'ok' : ''}" title="${esc(y.n + ': ' + y.h)}">${y.k}</i>`).join('')}</span><span class="ms-luz ${ev.st}" title="${esc(ev.t)}"></span><small class="muted iv-oev">${esc(ev.t)}</small><span class="spacer"></span><button class="icon-btn" data-odel aria-label="Quitar el objetivo">×</button></div>
      <label class="small">1 · Lo que quiere, con sus palabras<textarea class="input" rows="2" data-ok="dice" placeholder="«Quiero dejar de apagar fuegos y que la empresa gane dinero de verdad»">${esc(o.dice)}</textarea></label>
      <label class="small">2 · Qué hará él (empieza por un verbo y depende de él)<input class="input" data-ok="especifica" value="${esc(o.especifica)}" placeholder="Dedicar las mañanas del lunes a dirigir y delegar la operativa del almacén"></label>
      <div class="iv-g3"><label class="small">Indicador<input class="input" data-ok="indicador" value="${esc(o.indicador)}" placeholder="Horas en operativa por semana"></label><label class="small">Hoy<input class="input" data-ok="actual" value="${esc(o.actual)}" placeholder="45"></label><label class="small">Meta<input class="input" data-ok="valor" value="${esc(o.valor)}" placeholder="20"></label><label class="small">Unidad<input class="input" data-ok="unidad" value="${esc(o.unidad)}" placeholder="horas"></label><label class="small">Fecha límite<input class="input" type="date" data-ok="fecha" value="${esc(o.fecha)}"></label><label class="small">Responsable<input class="input" data-ok="responsable" value="${esc(o.responsable)}" placeholder="El empresario"></label></div>
      <label class="iv-inl small"><input type="checkbox" data-ok="solo" ${o.solo ? 'checked' : ''}> Depende solo de él (no de clientes, banco ni terceros)</label>
      <div class="iv-g3"><label class="small">3 · Qué gana (beneficio, con cifra)<input class="input" data-ok="beneficio" value="${esc(o.beneficio)}" placeholder="25 horas a la semana para vender y dirigir"></label><label class="small">Qué le cuesta (tiempo, dinero, renuncias)<input class="input" data-ok="contras" value="${esc(o.contras)}" placeholder="Formar a un encargado: 3 meses"></label><label class="small">¿Merece la pena?<select class="input" data-ok="merece"><option value="">Sin decidir</option><option value="si" ${o.merece === 'si' ? 'selected' : ''}>Sí, compensa</option><option value="no" ${o.merece === 'no' ? 'selected' : ''}>No compensa</option></select></label></div>
      <label class="small">4 · Cómo lo va a alcanzar (una acción por línea, con lo que hará cada semana)<textarea class="input" rows="3" data-ok="como" placeholder="Escribir la lista de tareas que hoy hace y debería delegar&#10;Nombrar encargado de almacén y traspasarle tareas&#10;Bloquear en la agenda los lunes de 9 a 13">${esc(o.como)}</textarea></label>
      <p class="iv-ofr small"><span class="muted">El objetivo en una frase:</span> <b data-ofr>${esc(fraseObj(o) || '—')}</b></p>
      <div class="row"><button class="btn ghost small" data-omej>Mejorar la redacción</button><button class="btn small" data-omesa>${o.enviada ? 'Actualizar en la mesa' : 'Llevar a la mesa como meta SMART'}</button>${o.enviada ? '<small class="muted">En la mesa de trabajo</small>' : ''}</div><div data-oprop></div></div>`; }).join('') || '<p class="small muted" style="margin:0">Aún no hay objetivos. Pregunta qué quiere conseguir y apúntalo con sus palabras.</p>'}</div>`;
  const mejorarObj = async (box, o) => {
    box.innerHTML = '<p class="small muted" style="margin:0">Analizando el objetivo…</p>';
    const reglas = [];
    if (TERCEROS.test((o.especifica || '') + ' ' + (o.dice || ''))) reglas.push('Depende de otros: escríbelo como lo que hará él para provocarlo («presentar 10 ofertas al mes a clientes actuales»).');
    if (o.especifica && !/^\s*\S+(ar|er|ir)(se|lo|la|le)?\b/i.test(o.especifica)) reglas.push('Empieza por un verbo de acción suyo.');
    if (!o.indicador || !o.valor) reglas.push('Ponle número: indicador, valor de hoy y valor meta.');
    if (!o.fecha) reglas.push('Ponle fecha límite.');
    if (!CUANT.test(o.beneficio || '')) reglas.push('Cuantifica el beneficio en euros, horas o clientes.');
    if (!(o.como || '').trim()) reglas.push('Escribe al menos tres acciones con las que lo va a alcanzar.');
    let j = null;
    if (A.ia) {
      const v = await A.ia.asegurar('Mejorar la redacción del objetivo');
      if (v) { try { j = await A.ia.json(`Eres consultor de pymes. Un empresario ha dicho este objetivo en la primera sesión. Ayúdale a convertirlo en un objetivo SMART que dependa solo de él (no de clientes, bancos ni terceros), con beneficio cuantificado y un plan de cómo alcanzarlo. Respeta lo que quiere; no inventes cifras que no estén: si faltan, déjalas vacías. Devuelve JSON: {"especifica":"frase que empieza por un verbo de lo que hará él","indicador":"","actual":"","valor":"","unidad":"","beneficio":"","como":"3-5 acciones, una por línea","motivo":"en una frase qué has cambiado y por qué"}.\nObjetivo: ${JSON.stringify(o)}`); } catch (e) { j = null; } }
    }
    const prop = j ? Object.fromEntries(['especifica', 'indicador', 'actual', 'valor', 'unidad', 'beneficio', 'como'].filter((k) => j[k] && String(j[k]).trim() && String(j[k]) !== String(o[k] || '')).map((k) => [k, String(j[k]).trim()])) : {};
    const nom = { especifica: 'Qué hará', indicador: 'Indicador', actual: 'Hoy', valor: 'Meta', unidad: 'Unidad', beneficio: 'Beneficio', como: 'Cómo lo alcanzará' };
    box.innerHTML = `<div class="ms-propc"><div class="eyebrow">${j ? 'Propuesta de redacción (con Claude)' : 'Cómo mejorarlo'}</div>${j && j.motivo ? `<p class="small" style="margin:0">${esc(j.motivo)}</p>` : ''}
      ${Object.keys(prop).length ? `<table class="ms-tab"><tbody>${Object.keys(prop).map((k) => `<tr><td class="small muted" style="text-align:left;width:130px">${nom[k]}</td><td style="text-align:left;white-space:pre-line"><s class="muted small">${esc(o[k] || '—')}</s><br><b>${esc(prop[k])}</b></td></tr>`).join('')}</tbody></table><div class="row"><button class="btn solid small" data-ousar>Usar esta redacción</button><button class="btn ghost small" data-onp>Descartar</button></div>` : ''}
      ${!j ? (reglas.length ? `<ul class="small" style="margin:0;padding-left:18px">${reglas.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : '<p class="small" style="margin:0">El objetivo ya está bien definido.</p>') : ''}</div>`;
    const u = $('[data-ousar]', box); if (u) u.onclick = () => { Object.assign(o, prop); guardar(); render(); toast('Redacción actualizada: compruébala con el empresario.'); };
    const d = $('[data-onp]', box); if (d) d.onclick = () => { box.innerHTML = ''; };
  };
  const objAMesa = async (o, i) => {
    if (!A.mesa || !A.mesa.cargar) return toast('La mesa de trabajo no está disponible aquí.');
    const st = await A.mesa.cargar(), oid = 'iv-obj:' + o.id; let m = st.metas.find((x) => x.oid === oid);
    const datos = { objetivo: o.dice || o.especifica, especifica: o.especifica, indicador: o.indicador, actual: o.actual, valor: o.valor, unidad: o.unidad, fecha: o.fecha, responsable: o.responsable, solo: !!o.solo, beneficio: o.beneficio, contras: o.contras, merece: o.merece, acciones: (o.como || '').split('\n').map((t) => t.trim()).filter(Boolean).map((t) => ({ t, fecha: '', revisada: '', hecha: '' })) };
    if (m) Object.assign(m, datos);
    else { m = Object.assign({ id: 'm' + Date.now().toString(36), oid, creada: hoy(), area: 'Dirección', medios: false, beneficios: '', perdidas: '', pros: '', obstaculos: [{ o: '', s: '' }], seguimiento: 'En las sesiones de la intervención con el consultor', valores: '', afirmacion: '', prioridad: i + 1, plazo: 'corto', tangible: true, estado: 'activa' }, datos); st.metas.push(m); }
    await A.mesa.guardarYa(st); o.enviada = true; guardar(); render();
    toast('Objetivo en la mesa de trabajo como meta SMART, con su plan de acción.');
  };
  const wireObjetivos = (host) => {
    const n = $('#ivObjN', host); if (n) n.onclick = () => { ST.objetivos.push(objNuevo()); render(); const l = $$('.iv-obj', host); const u = l[l.length - 1]; if (u) { u.scrollIntoView({ block: 'center' }); $('[data-ok=dice]', u).focus(); } };
    $$('.iv-obj', host).forEach((d) => {
      const o = ST.objetivos.find((x) => x.id === d.dataset.o), i = ST.objetivos.indexOf(o);
      const refrescar = () => { const sm = smartObj(o), ev = evalObj(o); $('.iv-smart', d).innerHTML = sm.map((y) => `<i class="${y.ok ? 'ok' : ''}" title="${esc(y.n + ': ' + y.h)}">${y.k}</i>`).join(''); $('.ms-luz', d).className = 'ms-luz ' + ev.st; $('.iv-oev', d).textContent = ev.t; $('[data-ofr]', d).textContent = fraseObj(o) || '—'; };
      $$('[data-ok]', d).forEach((x) => (x.oninput = x.onchange = () => { o[x.dataset.ok] = x.type === 'checkbox' ? x.checked : x.value; guardar(); refrescar(); }));
      $('[data-odel]', d).onclick = (e) => { if (!e.target.dataset.conf) { e.target.dataset.conf = 1; e.target.textContent = '¿?'; e.target.title = 'Pulsa otra vez para quitarlo'; return; } ST.objetivos = ST.objetivos.filter((x) => x !== o); render(); };
      $('[data-omej]', d).onclick = () => mejorarObj($('[data-oprop]', d), o);
      $('[data-omesa]', d).onclick = () => objAMesa(o, i);
    });
  };

  /* ================= CAPA 1 · PRIMERA SESIÓN ================= */
  let reloj = null, t0 = null;
  VISTAS.guion = (host) => {
    const s = ST.sesion, hechas = Object.keys(s.hechas || {}).filter((k) => s.hechas[k]).length;
    let min = 0;
    host.innerHTML = `<div class="glass pad stack"><div class="row iv-ses"><div class="iv-sesd"><div class="eyebrow">Primera sesión · una hora</div><p class="small" style="margin:4px 0 0">Hoy se escucha, no se juzga. Apunta las frases literales: son la materia prima del diagnóstico. Lo que el empresario repite, minimiza o coloca fuera suele ser el síntoma; la causa está detrás.</p></div>
        <div class="iv-reloj"><b id="ivReloj">${t0 ? '' : '00:00'}</b><small id="ivBloque">${t0 ? '' : 'Sin empezar'}</small><button class="btn ${t0 ? '' : 'solid'} small" id="ivCrono">${t0 ? 'Parar' : 'Empezar la sesión'}</button></div></div>
      <div class="row iv-fil"><button class="btn ghost small" id="ivHoja">Hoja de preguntas para imprimir</button><a class="btn ghost small" href="manual.html#iv-guion">Las preguntas en el manual</a><span class="small muted">Lleva la hoja a la sesión, pregunta y anota; después sube la transcripción y se completa el expediente.</span></div>
      <div class="iv-g3"><label class="small">Fecha<input class="input" type="date" data-s="fecha" value="${esc(s.fecha)}"></label><label class="small">Consultor<input class="input" data-s="consultor" value="${esc(s.consultor)}" placeholder="Tu nombre"></label><label class="small">Asistentes<input class="input" data-s="asistentes" value="${esc(s.asistentes)}" placeholder="Empresario, socio, gerente…"></label></div>
      <div class="iv-prog"><span style="width:${Math.round((hechas / nPreg()) * 100)}%"></span></div><small class="muted">${hechas} de ${nPreg()} preguntas hechas</small></div>
      ${D.GUION.map((b) => { const ini = min; min += b.min; return `<section class="glass pad stack iv-bloque" data-b="${b.id}"><div class="row"><span class="iv-min">${String(ini).padStart(2, '0')}–${String(min).padStart(2, '0')} min</span><h3 class="iv-bt">${esc(b.n)}</h3><span class="spacer"></span><small class="muted">${esc(b.obj)}</small></div>
        <ol class="iv-preg">${b.p.map((p, i) => { const k = b.id + ':' + i; return `<li class="${s.hechas[k] ? 'hecha' : ''}" data-q="${k}"><label class="iv-qh"><input type="checkbox" data-h ${s.hechas[k] ? 'checked' : ''}><b>${esc(p.q)}</b></label><small class="iv-oye">Qué escuchar: ${esc(p.oye)}${p.area ? ` · <span class="iv-ar" style="--c:${D.area(p.area).c}">${esc(D.area(p.area).n)}</span>` : ''}</small><textarea class="input" rows="2" data-n placeholder="Frases literales y observaciones">${esc(s.notas[k] || '')}</textarea><div class="row"><button class="btn ghost small" data-sin>Apuntar como síntoma</button></div></li>`; }).join('')}</ol>${b.id === 'objetivos' ? objetivosHTML() : ''}</section>`; }).join('')}`;
    $$('[data-s]', host).forEach((i) => (i.oninput = () => { s[i.dataset.s] = i.value; guardar(); }));
    $('#ivHoja', host).onclick = () => V.informes.guia();
    wireObjetivos(host);
    $$('.iv-preg > li', host).forEach((li) => {
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
    const HH = D.CONSTANTES.length * (H + 12);
    return `<svg class="iv-monitor" viewBox="-10 -8 ${W + 20} ${HH + 12}" role="img" aria-label="Monitor de constantes vitales" style="background:#04110a;border-radius:12px"><rect x="-10" y="-8" width="${W + 20}" height="${HH + 12}" rx="12" fill="#04110a"/>${D.CONSTANTES.map((c, i) => {
      const v = cte(c.id), y = i * (H + 12) + H / 2 + 4, col = v ? { ok: '#2fb24a', warn: '#e8a33b', stop: '#e04848' }[D.nivelConst(v)] : '#4a5363';
      const amp = v ? 3 + v * 1.6 : 1, paso = v ? 52 - v * 6 : 60; let d = `M110,${y}`; for (let x = 110; x < W - 50; x += paso) d += ` L${x + paso * 0.35},${y} L${x + paso * 0.45},${y - amp * 2} L${x + paso * 0.55},${y + amp} L${x + paso * 0.62},${y}`;
      return `<text x="0" y="${y + 4}" class="iv-mt" fill="#9fb4a6" style="font:600 11px sans-serif">${esc(c.n)}</text><path d="${d} L${W - 50},${y}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/><text x="${W - 4}" y="${y + 5}" text-anchor="end" class="iv-mv" fill="${col}" style="font:600 12px monospace">${v ? v + '/5' : '—'}</text>`; }).join('')}</svg>`;
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
        <div class="iv-capt"><div class="eyebrow">Captura en directo</div><p class="small muted" style="margin:0">Durante la sesión: escribe o dicta la frase tal cual la dice, toca el hueco que delata y pulsa Apuntar (o Ctrl + Intro). Va directa a «Síntomas y causas».</p>
        <textarea class="input" id="ivCap" rows="3" placeholder="«Eso lo llevo yo en la cabeza; si no estoy, se para»"></textarea>
        <div class="iv-pats" role="radiogroup" aria-label="Hueco que delata">${D.PATRONES.map((p, i) => `<button type="button" class="chip" role="radio" data-pat="${p.id}" aria-pressed="${p.id === patSel}" title="${esc(p.q)}">${esc(p.n)}</button>`).join('')}</div>
        <div class="row"><button class="btn solid" id="ivCapB">Apuntar la frase</button>${(window.SpeechRecognition || window.webkitSpeechRecognition) ? '<button class="btn ghost" id="ivCapV">Dictar</button>' : ''}<span class="spacer"></span><small class="muted">${pl(ST.sintomas.filter((x) => x.origen === 'directo').length, 'frase apuntada', 'frases apuntadas')}</small></div>
        ${ST.sintomas.filter((x) => x.origen === 'directo').slice(-3).reverse().map((x) => `<small class="iv-ej">«${esc(x.cita)}» · ${esc((D.patron(x.patron) || {}).n || '')}</small>`).join('')}</div></section>
      <section class="glass pad stack">${tr ? `<div class="row"><div><div class="eyebrow">${esc(tr.nombre)}</div><small class="muted">${pl(tr.turnos.length, 'intervención', 'intervenciones')} · ${an ? `el empresario habla el ${an.pctCliente} % (${an.palabras} palabras)` : ''}</small></div><span class="spacer"></span><button class="btn ghost small" id="ivTrDel">Quitar</button></div>
        <div class="small">¿Quién es el empresario? ${tr.hablantes.map((h) => `<label class="iv-inl"><input type="checkbox" data-hab="${esc(h.n)}" ${tr.clientes.includes(h.n) ? 'checked' : ''}> ${esc(h.n)} <span class="muted">(${h.palabras})</span></label>`).join('')}</div>
        ${an ? `<div class="iv-kp">${[
          ['Huecos con cita', an.huecos.filter((h) => h.peso).length + '/7', 'ivSecHuecos', 'Buscamos siete huecos de definición en la empresa: responsable, límite, método, puesto, dato, fecha y mando. La cifra dice cuántos aparecen en lo que dice el empresario respaldados por al menos una frase literal suya. 5/7 significa que cinco de los siete asoman en la sesión.'],
          ['Yo / nosotros', an.yo + '/' + an.nos, 'ivSecComo', 'Cuántas veces habla en singular («yo hago», «me llaman») frente al plural («hacemos», «nuestro equipo»). Mucho más «yo» que «nosotros» suele indicar que la empresa gira a su alrededor: dependencia del empresario.'],
          ['Resignificar', String(an.resig.length), 'ivSecResig', 'Frases suyas que suelen esconder otra cosa («no tengo tiempo», «la gente no se implica»). Para cada una verás lo que puede estar diciendo de verdad y la pregunta para confirmarlo con él.'],
          ['Síntomas sugeridos', String(an.sugeridos.length), 'ivSecSug', 'Problemas concretos detectados en sus frases, cada uno con su cita. Marca los que compartes y pásalos a «Síntomas y causas» para buscarles la causa.']
        ].map(([n, v, id, q]) => `<div class="iv-kpi" data-ir="${id}" role="button" tabindex="0" title="Ir a la sección"><span>${n} <button class="iv-q" type="button" aria-label="Qué significa «${n}»" data-q="${esc(q)}">?</button></span><b>${v}</b><small>Ver →</small></div>`).join('')}</div><p class="iv-qpop small" id="ivQpop" hidden></p>
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
    $$('[data-pat]', host).forEach((b) => (b.onclick = () => { patSel = b.dataset.pat; $$('[data-pat]', host).forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
    $('#ivCap', host).onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('#ivCapB', host).click(); } };
    const dv = $('#ivCapV', host); if (dv && A.docs && A.docs.dictate) dv.onclick = async () => { dv.disabled = true; dv.textContent = 'Escuchando…'; try { const t = await A.docs.dictate(); const c = $('#ivCap', host); c.value = (c.value ? c.value + ' ' : '') + t; c.focus(); } catch (x) { toast(x.message); } dv.disabled = false; dv.textContent = 'Dictar'; };
    $$('.iv-kpi', host).forEach((k) => { const go = () => { const d = document.getElementById(k.dataset.ir); if (d) { d.scrollIntoView({ behavior: 'smooth', block: 'start' }); d.classList.add('iv-flash'); setTimeout(() => d.classList.remove('iv-flash'), 1600); } }; k.onclick = go; k.onkeydown = (e) => { if (e.key === 'Enter') go(); }; });
    $$('.iv-q', host).forEach((q) => (q.onclick = (e) => { e.stopPropagation(); const p = $('#ivQpop', host); const mismo = !p.hidden && p.dataset.de === q.dataset.q; p.hidden = mismo; p.dataset.de = q.dataset.q; p.innerHTML = `<b>${esc(q.closest('span').firstChild.textContent.trim())}.</b> ${esc(q.dataset.q)}`; }));
    $('#ivCapB', host).onclick = () => { const t = $('#ivCap', host).value.trim(); if (!t) return toast('Escribe o dicta primero la frase.'); const p = D.patron(patSel); ST.sintomas.push({ id: uid(), t: p.vacio.split(';')[0].replace(/\.$/, ''), cita: t, area: E.areaDe(t, p.area), patron: p.id, gravedad: 3, origen: 'directo' }); render(); toast('Apuntado en «Síntomas y causas».'); setTimeout(() => { const c = $('#ivCap'); if (c) c.focus({ preventScroll: true }); }, 50); };
    if (!tr) return;
    $('#ivTrDel', host).onclick = (e) => { if (!e.target.dataset.ok) { e.target.dataset.ok = 1; e.target.textContent = '¿Seguro?'; return; } ST.transcripciones = ST.transcripciones.filter((x) => x !== tr); trSel = null; render(); };
    $$('[data-hab]', host).forEach((c) => (c.onchange = () => { tr.clientes = $$('[data-hab]', host).filter((x) => x.checked).map((x) => x.dataset.hab); tr.analisis = E.analizar({ turnos: tr.turnos, hablantes: tr.hablantes }, tr.clientes); render(); }));
    wireAnalisis(host, tr);
    const ia = $('#ivIA', host); if (ia) ia.onclick = async () => {
      ia.disabled = true; $('#ivIAm', host).textContent = 'Leyendo la sesión… puede tardar un minuto.';
      try {
        const texto = tr.turnos.map((x) => `${x.h}: ${x.t}`).join('\n');
        const r = await E.conIA(texto, `El empresario es: ${tr.clientes.join(', ') || 'quien más habla'}. Empresa: ${empresa()}.`);
        if (!r) { $('#ivIAm', host).innerHTML = 'Falta la conexión con la API de Claude. <a href="#" id="ivCx">Ver cómo conectarla</a>. El análisis de abajo funciona sin conexión.'; const cx = $('#ivCx', host); if (cx) cx.onclick = (e) => { e.preventDefault(); A.conexiones && A.conexiones.abrir('claude'); }; ia.disabled = false; return; }
        tr.ia = r; render(); toast('Lectura en profundidad lista: revisa y añade lo que compartas.');
      } catch (x) { $('#ivIAm', host).textContent = 'No se pudo: ' + x.message; ia.disabled = false; }
    };
  };
  const analisisHTML = (tr) => {
    const an = tr.analisis, ya = new Set(ST.sintomas.map((s) => norm(s.cita)));
    const max = Math.max(1, ...an.lenguaje.map((l) => l.por1000));
    return `${tr.ia ? iaHTML(tr) : ''}
      <section class="glass pad stack" id="ivSecHuecos"><div class="eyebrow">Los huecos que delata su lenguaje</div><div class="iv-huecos">${an.huecos.map((h) => { const p = D.patron(h.id); return `<div class="iv-hueco ${h.peso ? (h.peso >= 3 ? 'stop' : 'warn') : ''}"><div class="row"><b>${esc(p.n)}</b><span class="spacer"></span><span class="iv-cnt">${h.peso || '—'}</span></div><small class="muted">${esc(p.q)}</small>${h.citas.length ? `<ul>${h.citas.slice(0, 3).map((c) => `<li>«${esc(c.cita)}»</li>`).join('')}</ul>` : '<p class="small muted" style="margin:4px 0 0">No observado en la sesión.</p>'}</div>`; }).join('')}</div></section>
      <div class="grid iv-two"><section class="glass pad stack" id="ivSecComo"><div class="eyebrow">Cómo habla</div>${an.lenguaje.map((l) => `<div class="iv-lx"><div class="row"><b>${esc(l.n)}</b><span class="spacer"></span><small class="muted">${l.cuenta} · ${String(l.por1000).replace('.', ',')} por mil palabras</small></div><div class="iv-bar"><span style="width:${(l.por1000 / max) * 100}%"></span></div><small class="muted">${esc(l.d)}</small>${l.ejemplos[0] ? `<small class="iv-ej">«${esc(l.ejemplos[0])}»</small>` : ''}</div>`).join('')}
          <div class="iv-lx"><div class="row"><b>«Yo» frente a «nosotros»</b><span class="spacer"></span><small class="muted">${an.yo} / ${an.nos}</small></div><small class="muted">${an.yo > an.nos * 2 ? 'Habla mucho más en primera persona: la empresa gira alrededor de él.' : 'Equilibrado: habla de la empresa como un equipo.'}</small></div></section>
        <section class="glass pad stack"><div class="eyebrow">Palabras que más repite</div><div class="iv-pal">${an.repite.map((x) => `<span class="chip">${esc(x.w)} <small>${x.n}</small></span>`).join('') || '<span class="small muted">Sin repeticiones destacadas.</span>'}</div><p class="small muted" style="margin:0">Pregunta qué quiere decir exactamente con cada una: la misma palabra puede significar cosas distintas para él y para su equipo.</p>
          <div class="eyebrow" id="ivSecResig">Lo que dice y lo que quiere decir</div>${an.resig.length ? `<div class="iv-resig">${an.resig.map((r) => `<div><small class="muted">Dice</small><b>«${esc(r.cita)}»</b><small class="muted">Puede estar diciendo</small><p>${esc(r.quiere)}</p><small class="muted">Pregunta para confirmarlo</small><p class="iv-pq">${esc(r.pregunta)}</p></div>`).join('')}</div>` : '<p class="small muted" style="margin:0">No hay frases tipo para resignificar en esta transcripción.</p>'}</section></div>
      <section class="glass pad stack" id="ivSecSug"><div class="row"><div class="eyebrow">Síntomas sugeridos</div><span class="spacer"></span><button class="btn small" id="ivSugTodo">Añadir todos los marcados</button></div><p class="small muted" style="margin:0">Cada uno con su cita literal. Marca los que compartes; después los enlazarás a su causa.</p>
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
  V.int = { smartObj, evalObj, fraseObj, monitor, D, E, $, $$, esc, norm, uid, hoy, sumar, fCorta, fLarga, pl, ST_N, TRIAJE, guardar, guardarYa, toast, empresa, sintomasDe, desvDe, nivel, nivelAuto, global, cte, causaDe, pesoCausa, causasOrdenadas, veinte, sugerirCausa, asegurarCausa, ruta, render, ir, VISTAS, st: () => ST, set: (k, v) => { if (k === 'sesSel') sesSel = v; if (k === 'vistaPlan') vistaPlan = v; }, get: (k) => (k === 'sesSel' ? sesSel : k === 'vistaPlan' ? vistaPlan : null) };

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
