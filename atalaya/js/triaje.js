/* Atalaya 360° · Triaje por áreas de la auditoría integral
   Un solo cálculo para la auditoría (js/intervencion/core.js), el tablero y las prioridades (js/prioridad.js) y la cartera
   (js/grupo.js): el nivel de cada área sale de los datos guardados de la auditoría (síntomas, hallazgos, verificaciones y
   constantes), o del que haya fijado el consultor, sin necesidad de abrir su página.
   No por el número de síntomas, sino por los principios de la empresa: primero la liquidez (poder pagar), después la
   rentabilidad (ganar con lo que se hace: precios, margen, operaciones) y después el crecimiento; la organización
   (gobierno, personas, información, tiempo) sostiene las tres. Dentro de cada principio pesan la gravedad, lo verificado
   y lo que dicen las constantes.
   A.triaje.prioArea(st, area) · nivelAuto(st, area) · nivel(st, area) · areas(st) · global(st) */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  // Áreas en el orden de la auditoría (A.intervDatos.AREAS) y capa de prioridades en la que cuentan
  const AREAS = [['gob', 'Dirección y gobierno', 'estructura'], ['fin', 'Finanzas y caja', 'liquidez'], ['com', 'Clientes y ventas', 'rentabilidad'], ['ope', 'Operaciones y procesos', 'rentabilidad'], ['per', 'Personas y equipos', 'estructura'], ['inf', 'Información y datos', 'estructura'], ['tie', 'Proyectos y tiempo', 'estructura'], ['leg', 'Legal y societario', 'liquidez']].map(([id, n, capa]) => ({ id, n, capa }));
  const PRINCIPIO = { fin: { p: 'liquidez', o: 0, w: 1.5, c: 'pulso' }, leg: { p: 'liquidez', o: 0, w: 1.1, c: 'temperatura' }, ope: { p: 'rentabilidad', o: 1, w: 1.2, c: 'respiracion' }, com: { p: 'rentabilidad', o: 1, w: 1.2, c: '' }, gob: { p: 'organizacion', o: 3, w: 1, c: 'reflejos' }, per: { p: 'organizacion', o: 3, w: 1, c: 'dependencia' }, tie: { p: 'organizacion', o: 3, w: 0.9, c: 'tension' }, inf: { p: 'organizacion', o: 3, w: 0.9, c: '' } };
  const PRIN_N = { liquidez: 'Liquidez: que la empresa pueda pagar', rentabilidad: 'Rentabilidad: que gane dinero con lo que hace', crecimiento: 'Crecimiento', organizacion: 'Organización: lo que sostiene la liquidez, la rentabilidad y el crecimiento' };
  const CONST_N = { tension: 'Tensión', temperatura: 'Temperatura', pulso: 'Pulso de caja', respiracion: 'Respiración', dependencia: 'Dependencia', reflejos: 'Reflejos' };
  const constN = (id) => { const D = A.intervDatos; const c = D && D.CONSTANTES ? D.CONSTANTES.find((x) => x.id === id) : null; return c ? c.n : CONST_N[id]; };
  const ids = () => (A.intervDatos && A.intervDatos.AREAS ? A.intervDatos.AREAS.map((a) => a.id) : AREAS.map((a) => a.id));

  const sintomasDe = (st, aid) => ((st && st.sintomas) || []).filter((s) => s.area === aid);
  const desvDe = (st, aid) => Object.values(((st && st.verifica) || {})[aid] || {}).filter((x) => x && x.e === 'desv').length;
  const prioArea = (st, aid) => {
    const P0 = PRINCIPIO[aid] || { p: 'organizacion', o: 3, w: 1, c: '' }, ss = sintomasDe(st, aid), gs = ss.map((s) => +s.gravedad || 3).sort((a, b) => b - a), hs = ((st && st.hallazgos) || []).filter((h) => h.area === aid), dv = desvDe(st, aid);
    const motivo = [];
    if (!gs.length && !hs.length && !dv) return { p: P0.p, o: P0.o, score: 0, n: '', motivo };
    const media = gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : 0;
    const ev = (gs[0] || 0) * 1.5 + media + Math.min(gs.length, 4) * 0.5 + dv * 3 + hs.reduce((a, h) => a + (+h.gravedad || 3), 0);
    const cv = P0.c ? +((st && st.constantes) || {})[P0.c] || 0 : 0, boost = cv >= 4 ? 4 : cv === 3 ? 1.5 : 0;
    const score = Math.round((ev * P0.w + boost) * 10) / 10;
    motivo.push(PRIN_N[P0.p]);
    if (gs.length) motivo.push(`${gs.length} ${gs.length === 1 ? 'síntoma' : 'síntomas'}, el más grave de ${gs[0]}/5 (media ${media.toLocaleString('es-ES', { maximumFractionDigits: 1 })})`);
    if (dv) motivo.push(`${dv} ${dv === 1 ? 'desviación verificada' : 'desviaciones verificadas'}`);
    if (cv) motivo.push(`${constN(P0.c)} ${cv}/5`);
    const n = gs.some((g) => g >= 5) || (aid === 'fin' && cv >= 4) || score >= 11 ? 'stop' : score >= 6 ? 'warn' : 'ok';
    return { p: P0.p, o: P0.o, score, n, motivo };
  };
  const nivelAuto = (st, aid) => prioArea(st, aid).n;
  // El nivel que ha fijado el consultor manda sobre el calculado
  const nivel = (st, aid) => (st && st.areas && st.areas[aid] && st.areas[aid].nivel) || nivelAuto(st, aid);
  // Niveles de todas las áreas en el orden de la auditoría (lo que core.js guarda en «triajeAreas»)
  const niveles = (st) => ids().map((id) => nivel(st, id) || '');
  const areas = (st) => AREAS.map((a) => Object.assign({}, a, { st: nivel(st, a.id) || '' }));
  const global = (st) => { const n = niveles(st); return n.includes('stop') ? 'stop' : n.includes('warn') ? 'warn' : n.includes('ok') ? 'ok' : ''; };
  A.triaje = { AREAS, PRINCIPIO, PRIN_N, sintomasDe, desvDe, prioArea, nivelAuto, nivel, niveles, areas, global };
})();
