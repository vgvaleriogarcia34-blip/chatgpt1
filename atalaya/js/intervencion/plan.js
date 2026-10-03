/* Atalaya 360° · Auditoría integral · plan de intervención, sesiones, envío a la mesa e informes */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { D, $, $$, esc, norm, uid, hoy, sumar, fCorta, fLarga, pl, ST_N, TRIAJE, guardar, toast, empresa, sintomasDe, nivel, cte, causasOrdenadas, veinte, ruta, render, ir, VISTAS } = V.int;
  const S = () => V.int.st();
  const EST_A = { pendiente: 'Pendiente', curso: 'En curso', hecha: 'Hecha' };

  /* ---------- Generar el plan ---------- */
  // Entran las acciones base de cada línea y las que atacan alguna causa activa (confirmada o, si aún no hay auditoría, hipótesis)
  const generar = () => {
    const ST = S(), ini = ST.plan.inicio || hoy(); ST.plan.inicio = ini;
    const activas = ST.causas.filter((c) => c.estado !== 'descartada'), refs = new Set(activas.map((c) => c.ref).filter(Boolean)), v20 = veinte();
    const lineasConCausa = new Set(activas.map((c) => (D.causa(c.ref) || {}).linea).filter(Boolean));
    const prev = new Map(ST.plan.acciones.map((a) => [a.t, a]));
    const acciones = [];
    D.LINEAS.forEach((L) => L.a.forEach((x, i) => {
      const ataca = (x.causa || []).filter((c) => refs.has(c));
      const base = !x.causa && (['gobierno', 'diccionario', 'libro', 'informacion'].includes(L.id) || lineasConCausa.has(L.id));
      if (!ataca.length && !base) return;
      const f = D.FASES.find((y) => y.id === x.f), clave = ataca.some((r) => { const c = activas.find((z) => z.ref === r); return c && v20.has(c.id); });
      const old = prev.get(x.t);
      acciones.push(Object.assign({ id: uid(), linea: L.id, t: x.t, f: x.f, sem: x.sem, ent: x.ent, quien: x.resp, responsable: '', fecha: sumar(ini, (f.sem[0] - 1) * 7 + x.sem * 7 + i), estado: 'pendiente', causas: ataca, clave }, old ? { id: old.id, responsable: old.responsable, fecha: old.fecha, estado: old.estado, enviada: old.enviada } : {}));
    }));
    // Acciones de las causas propias (sin plantilla): una por causa, en la fase 2
    activas.filter((c) => !c.ref).forEach((c) => { const t = 'Resolver: ' + c.t; const old = prev.get(t); acciones.push(Object.assign({ id: uid(), linea: lineaDeArea(c.area), t, f: 2, sem: 4, ent: 'Artefacto que cierra la causa', quien: 'consultor', responsable: '', fecha: sumar(ini, 7 * 9), estado: 'pendiente', causas: [], clave: v20.has(c.id) }, old ? { id: old.id, responsable: old.responsable, fecha: old.fecha, estado: old.estado, enviada: old.enviada } : {})); });
    // Hallazgos graves de la auditoría sin causa que los cubra
    ST.hallazgos.filter((h) => +h.gravedad >= 4 && !h.causa).forEach((h) => { const t = 'Corregir: ' + h.t; if (!acciones.some((a) => a.t === t)) acciones.push({ id: uid(), linea: lineaDeArea(h.area), t, f: 1, sem: 2, ent: 'Desviación corregida', quien: 'empresa', responsable: '', fecha: sumar(ini, 14), estado: 'pendiente', causas: [], clave: true }); });
    ST.plan.acciones = acciones.sort((a, b) => a.f - b.f || a.fecha.localeCompare(b.fecha));
    ST.plan.generado = new Date().toISOString();
  };
  const lineaDeArea = (a) => ({ gob: 'gobierno', fin: 'finanzas', com: 'comercial', ope: 'procesos', per: 'equipos', inf: 'informacion', tie: 'protocolos', leg: 'gobierno' }[a] || 'organizacion');

  /* ---------- Envío a la mesa de trabajo ---------- */
  const aMesa = async (acc) => {
    if (!A.mesa || !A.mesa.enviar) return toast('La mesa de trabajo no está disponible aquí.');
    const n = await A.mesa.enviar(acc.map((a) => ({ t: a.t, area: (D.linea(a.linea) || {}).n, mundo: 'intervencion', origen: 'Plan de intervención · ' + (D.linea(a.linea) || {}).n + ' · ' + a.ent, oid: 'iv:' + a.id, fecha: a.fecha, resp: a.responsable, impacto: a.clave ? 5 : 3, esfuerzo: 3, clave: !!a.clave })));
    acc.forEach((a) => (a.enviada = true)); guardar(); return n;
  };
  // Una meta SMART en la mesa por cada causa del 20 %, ya con su plan de acción
  const metasMesa = async () => {
    if (!A.mesa || !A.mesa.cargar) return 0;
    const ST = S(), st = await A.mesa.cargar(), v20 = veinte(); let n = 0;
    ST.causas.filter((c) => v20.has(c.id)).forEach((c) => {
      const oid = 'iv-meta:' + c.id; if (st.metas.some((m) => m.oid === oid)) return;
      const acc = ST.plan.acciones.filter((a) => (c.ref && a.causas.includes(c.ref)) || a.t === 'Resolver: ' + c.t);
      const fin = acc.reduce((m, a) => (a.fecha > m ? a.fecha : m), '');
      st.metas.push({ id: 'm' + Date.now().toString(36) + n, oid, creada: hoy(), area: (D.area(c.area) || {}).n || '', objetivo: 'Cerrar la causa: ' + c.t, especifica: acc[0] ? acc[0].t : '', indicador: '', actual: '', valor: '', unidad: '', fecha: fin, responsable: '', medios: false, solo: false, beneficio: '', beneficios: '', perdidas: '', pros: '', contras: '', obstaculos: [{ o: '', s: '' }], acciones: acc.map((a) => ({ t: a.t, fecha: a.fecha, revisada: '', hecha: a.estado === 'hecha' ? hoy() : '' })), seguimiento: 'En las sesiones de seguimiento con el consultor', valores: '', merece: '', afirmacion: '', prioridad: st.metas.length + 1, plazo: 'corto', tangible: true, estado: 'activa' });
      n++;
    });
    if (n) await A.mesa.guardarYa(st);
    return n;
  };

  /* ---------- Plan de intervención ---------- */
  VISTAS.plan = (host) => {
    const ST = S(), acc = ST.plan.acciones, vista = V.int.get('vistaPlan'), hechas = acc.filter((a) => a.estado === 'hecha').length;
    const fila = (a) => `<li class="iv-acc ${a.estado} ${a.clave ? 'clave' : ''}" data-a="${a.id}"><input type="checkbox" data-hecha ${a.estado === 'hecha' ? 'checked' : ''} aria-label="Hecha"><div class="iv-at"><b>${a.clave ? '★ ' : ''}${esc(a.t)}</b><small>${esc((D.linea(a.linea) || {}).n)} · Entregable: ${esc(a.ent)} · ${a.quien === 'empresa' ? 'La hace la empresa' : 'La lidera el consultor'}${a.enviada ? ' · en la mesa' : ''}</small></div>
      <input class="input" data-k="responsable" value="${esc(a.responsable)}" placeholder="Responsable"><input class="input" type="date" data-k="fecha" value="${esc(a.fecha)}"><select class="input" data-k="estado">${Object.keys(EST_A).map((k) => `<option value="${k}" ${a.estado === k ? 'selected' : ''}>${EST_A[k]}</option>`).join('')}</select><button class="icon-btn" data-del aria-label="Quitar">×</button></li>`;
    host.innerHTML = `<section class="glass pad stack"><div class="row"><div><div class="eyebrow">Plan de intervención</div><small class="muted">${acc.length ? `${pl(acc.length, 'acción', 'acciones')} · ${hechas} hechas · desde el ${fLarga(ST.plan.inicio)}` : 'Se genera con las causas priorizadas, el triaje y los hallazgos de la auditoría integral.'}</small></div><span class="spacer"></span>
        <label class="small">Inicio<input class="input" type="date" id="ivIni" value="${esc(ST.plan.inicio || hoy())}"></label><button class="btn solid" id="ivGen">${acc.length ? 'Regenerar el plan' : 'Generar el plan'}</button></div>
        ${acc.length ? `<div class="iv-prog"><span style="width:${Math.round((hechas / acc.length) * 100)}%"></span></div>
        <div class="row iv-fil"><span class="small muted">Ver por</span><button class="chip" aria-pressed="${vista === 'fase'}" data-vp="fase">Fases</button><button class="chip" aria-pressed="${vista === 'linea'}" data-vp="linea">Líneas de trabajo</button><span class="spacer"></span><button class="btn small" id="ivMesa">Enviar las tareas de la empresa a la mesa</button><button class="btn ghost small" id="ivMetas">Crear metas SMART en la mesa</button><button class="btn ghost small" id="ivSesGen">Generar las sesiones</button></div>` : ''}</section>
      ${acc.length ? (vista === 'linea'
        ? D.LINEAS.filter((L) => acc.some((a) => a.linea === L.id)).map((L) => `<section class="glass pad stack"><div class="row"><h3 class="iv-bt">${esc(L.n)}</h3><span class="spacer"></span><small class="muted">${acc.filter((a) => a.linea === L.id && a.estado === 'hecha').length}/${acc.filter((a) => a.linea === L.id).length}</small></div><ul class="iv-accs">${acc.filter((a) => a.linea === L.id).map(fila).join('')}</ul></section>`).join('')
        : D.FASES.map((F) => { const l = acc.filter((a) => a.f === F.id); return `<section class="glass pad stack iv-fase"><div class="row"><span class="iv-cn">${F.id}</span><div><h3 class="iv-bt">${esc(F.n)}</h3><small class="muted">${esc(F.d)} · Semanas ${F.sem[0]}-${F.sem[1]} · ${esc(F.ritmo)}</small></div><span class="spacer"></span><small class="muted">${l.filter((a) => a.estado === 'hecha').length}/${l.length}</small></div>${l.length ? `<ul class="iv-accs">${l.map(fila).join('')}</ul>` : '<p class="small muted" style="margin:0">Sin acciones en esta fase.</p>'}</section>`; }).join(''))
      + `<section class="glass pad stack"><div class="eyebrow">Añadir una acción</div><div class="iv-add"><input class="input" id="ivAN" placeholder="Acción concreta"><select class="input" id="ivAL">${D.LINEAS.map((L) => `<option value="${L.id}">${esc(L.n)}</option>`).join('')}</select><select class="input iv-n" id="ivAF">${D.FASES.map((F) => `<option value="${F.id}">${F.id}</option>`).join('')}</select><button class="btn small" id="ivAAdd">Añadir</button></div></section>` : ''}`;
    $('#ivIni', host).onchange = (e) => { ST.plan.inicio = e.target.value; guardar(); };
    $('#ivGen', host).onclick = () => { if (!ST.causas.length && !ST.hallazgos.length) return toast('Primero hacen falta causas (primera sesión) o hallazgos (auditoría integral).'); generar(); render(); toast('Plan generado: revisa responsables y fechas.'); };
    $$('[data-vp]', host).forEach((b) => (b.onclick = () => { V.int.set('vistaPlan', b.dataset.vp); render(); }));
    const m = $('#ivMesa', host); if (m) m.onclick = async () => { const n = await aMesa(acc.filter((a) => a.quien === 'empresa' && a.estado !== 'hecha')); render(); toast(n ? `${pl(n, 'tarea enviada', 'tareas enviadas')} a la mesa de trabajo de la empresa.` : 'Ya estaban en la mesa.'); };
    const mt = $('#ivMetas', host); if (mt) mt.onclick = async () => { const n = await metasMesa(); toast(n ? `${pl(n, 'meta creada', 'metas creadas')} en la mesa de trabajo, una por cada causa del 20 %.` : 'Las metas ya estaban creadas.'); };
    const sg = $('#ivSesGen', host); if (sg) sg.onclick = () => { generarSesiones(); ir('sesiones'); toast('Calendario de sesiones generado.'); };
    $$('.iv-acc', host).forEach((li) => {
      const a = acc.find((x) => x.id === li.dataset.a);
      $('[data-hecha]', li).onchange = (e) => { a.estado = e.target.checked ? 'hecha' : 'pendiente'; render(); };
      $$('[data-k]', li).forEach((i) => (i.onchange = () => { a[i.dataset.k] = i.value; if (i.dataset.k === 'estado') render(); else guardar(); }));
      $('[data-del]', li).onclick = () => { ST.plan.acciones = acc.filter((x) => x !== a); render(); };
    });
    const ad = $('#ivAAdd', host); if (ad) ad.onclick = () => { const t = $('#ivAN', host).value.trim(); if (!t) return; const f = +$('#ivAF', host).value; ST.plan.acciones.push({ id: uid(), linea: $('#ivAL', host).value, t, f, sem: 2, ent: '—', quien: 'consultor', responsable: '', fecha: sumar(ST.plan.inicio || hoy(), (D.FASES[f - 1].sem[0] + 1) * 7), estado: 'pendiente', causas: [], clave: false }); render(); };
  };

  /* ---------- Sesiones ---------- */
  const generarSesiones = () => {
    const ST = S(), ini = ST.plan.inicio || hoy(), prev = ST.sesiones.filter((s) => s.acta || (s.acuerdos || []).length || ['contacto', 'auditoria'].includes(s.tipo));
    if (!prev.some((s) => s.tipo === 'contacto')) prev.unshift({ id: uid(), tipo: 'contacto', fecha: ST.sesion.fecha, hora: '', dur: 60, obj: 'Primera sesión: escuchar, tomar constantes y hacer el triaje.', acta: '', acuerdos: [] });
    if (!prev.some((s) => s.tipo === 'auditoria')) prev.push({ id: uid(), tipo: 'auditoria', fecha: sumar(ST.sesion.fecha, 7), hora: '09:00', dur: 180, obj: 'Auditoría integral según la hoja de ruta.', acta: '', acuerdos: [] });
    const nuevas = [{ id: uid(), tipo: 'arranque', fecha: ini, hora: '09:00', dur: 120, obj: 'Presentar el plan de intervención, nombrar responsables y firmar las primeras decisiones.', f: 1 }];
    D.FASES.forEach((F) => { const paso = F.id === 1 ? 7 : F.id === 4 ? 28 : 14; for (let d = (F.sem[0] - 1) * 7 + (F.id === 1 ? 7 : 0); d < F.sem[1] * 7; d += paso) nuevas.push({ id: uid(), tipo: d + paso >= F.sem[1] * 7 ? 'revision' : F.id === 1 ? 'trabajo' : 'seguimiento', fecha: sumar(ini, d), hora: '09:00', dur: F.id === 1 ? 120 : 90, obj: (d + paso >= F.sem[1] * 7 ? 'Revisión de la fase «' + F.n + '»: qué se ha cerrado y qué no. ' : '') + F.d, f: F.id }); });
    ST.sesiones = prev.concat(nuevas.filter((n) => !prev.some((p) => p.fecha === n.fecha))).map((s) => Object.assign({ acta: '', acuerdos: [] }, s)).sort((a, b) => a.fecha.localeCompare(b.fecha));
    guardar();
  };
  const puntosSesion = (s) => { const ST = S(), sig = ST.sesiones[ST.sesiones.indexOf(s) + 1]; const hasta = sig ? sig.fecha : sumar(s.fecha, 14); return ST.plan.acciones.filter((a) => a.estado !== 'hecha' && a.fecha <= hasta && (!s.f || a.f <= s.f)).slice(0, 10); };
  const checkSesion = (s) => { const base = ['Revisar las acciones vencidas y sus responsables', 'Indicadores del cuadro de mando: qué ha cambiado', 'Agenda del empresario: horas liberadas para su 20 %']; if (s.tipo === 'auditoria') return ruta().flatMap((x) => (D.VERIFICA[x.a.id] || []).slice(0, 2)); if (s.tipo === 'revision') base.push('Prueba: ¿qué tareas ya no pasan por el empresario?'); return base; };
  VISTAS.sesiones = (host) => {
    const ST = S(), sel = ST.sesiones.find((x) => x.id === V.int.get('sesSel')) || ST.sesiones.find((x) => x.fecha >= hoy()) || ST.sesiones[0];
    host.innerHTML = `<div class="grid iv-two"><section class="glass pad stack"><div class="row"><div class="eyebrow">Sesiones con la empresa</div><span class="spacer"></span><button class="btn small" id="ivSGen">${ST.sesiones.length > 2 ? 'Regenerar desde el plan' : 'Generar desde el plan'}</button><button class="btn ghost small" id="ivSN">Nueva sesión</button><button class="btn ghost small" id="ivIcs">Calendario (.ics)</button></div>
        ${ST.sesiones.length ? `<ol class="iv-sesl">${ST.sesiones.map((s) => `<li class="${s === sel ? 'on' : ''} ${s.fecha < hoy() ? 'pasada' : ''}" data-s="${s.id}"><span class="iv-sf">${fCorta(s.fecha)}</span><span><b>${esc(D.TIPOS_SESION[s.tipo] || s.tipo)}</b><small>${esc((s.obj || '').slice(0, 90))}</small></span>${s.acta ? '<i class="iv-ok">●</i>' : ''}</li>`).join('')}</ol>` : '<p class="small muted" style="margin:0">Genera las sesiones desde el plan de intervención o crea una.</p>'}</section>
      <section class="glass pad stack">${sel ? `<div class="iv-g3"><label class="small">Tipo<select class="input" data-k="tipo">${Object.keys(D.TIPOS_SESION).map((k) => `<option value="${k}" ${sel.tipo === k ? 'selected' : ''}>${D.TIPOS_SESION[k]}</option>`).join('')}</select></label><label class="small">Fecha<input class="input" type="date" data-k="fecha" value="${esc(sel.fecha)}"></label><label class="small">Hora<input class="input" type="time" data-k="hora" value="${esc(sel.hora || '')}"></label></div>
        <label class="small">Objetivo<textarea class="input" rows="2" data-k="obj">${esc(sel.obj || '')}</textarea></label>
        <div><b class="small">Orden del día (acciones que vencen hasta la siguiente sesión)</b><ul class="small" style="margin:4px 0 0;padding-left:18px">${puntosSesion(sel).map((a) => `<li>${a.clave ? '★ ' : ''}${esc(a.t)} <span class="muted">· ${fCorta(a.fecha)}${a.responsable ? ' · ' + esc(a.responsable) : ''}</span></li>`).join('') || '<li class="muted">Sin acciones pendientes en este tramo.</li>'}</ul></div>
        <div><b class="small">Qué chequear</b><ul class="small" style="margin:4px 0 0;padding-left:18px">${checkSesion(sel).map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
        <label class="small">Acta y observaciones<textarea class="input" rows="4" data-k="acta" placeholder="Qué se ha visto, qué ha cambiado, qué preocupa">${esc(sel.acta || '')}</textarea></label>
        <div><b class="small">Acuerdos</b>${(sel.acuerdos || []).map((a, i) => `<div class="iv-g3 iv-acu" data-i="${i}"><input class="input" data-ak="t" value="${esc(a.t)}" placeholder="Acuerdo"><input class="input" data-ak="resp" value="${esc(a.resp || '')}" placeholder="Responsable"><input class="input" type="date" data-ak="fecha" value="${esc(a.fecha || '')}"></div>`).join('')}<div class="row"><button class="btn ghost small" id="ivAcuN">Añadir acuerdo</button><span class="spacer"></span><button class="btn small" id="ivAcuM">Llevar los acuerdos a la mesa</button><button class="btn ghost small" id="ivSDel">Borrar la sesión</button></div></div>` : '<p class="small muted">Sin sesiones.</p>'}</section></div>`;
    $('#ivSGen', host).onclick = () => { if (!ST.plan.acciones.length) return toast('Genera antes el plan de intervención.'); generarSesiones(); render(); };
    $('#ivSN', host).onclick = () => { const s = { id: uid(), tipo: 'seguimiento', fecha: hoy(), hora: '09:00', dur: 90, obj: '', acta: '', acuerdos: [] }; ST.sesiones.push(s); ST.sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha)); V.int.set('sesSel', s.id); render(); };
    $('#ivIcs', host).onclick = () => ics(ST.sesiones.filter((s) => s.fecha >= hoy() && s.hora));
    $$('.iv-sesl li', host).forEach((li) => (li.onclick = () => { V.int.set('sesSel', li.dataset.s); render(); }));
    if (!sel) return;
    $$('[data-k]', host).forEach((i) => (i.onchange = i.oninput = () => { sel[i.dataset.k] = i.value; guardar(); if (i.type === 'date' && i.dataset.k === 'fecha' && i.onchange === i.oninput) { /* nada */ } }));
    $$('.iv-acu', host).forEach((d) => $$('[data-ak]', d).forEach((i) => (i.oninput = () => { sel.acuerdos[+d.dataset.i][i.dataset.ak] = i.value; guardar(); })));
    $('#ivAcuN', host).onclick = () => { sel.acuerdos = sel.acuerdos || []; sel.acuerdos.push({ t: '', resp: '', fecha: sumar(sel.fecha, 14) }); render(); };
    $('#ivAcuM', host).onclick = async () => { if (!A.mesa || !A.mesa.enviar) return; const n = await A.mesa.enviar((sel.acuerdos || []).filter((a) => a.t).map((a, i) => ({ t: a.t, resp: a.resp, fecha: a.fecha, mundo: 'intervencion', origen: 'Acuerdo de la sesión del ' + fCorta(sel.fecha), oid: 'iv-acu:' + sel.id + ':' + i, impacto: 4 }))); toast(n ? `${pl(n, 'acuerdo enviado', 'acuerdos enviados')} a la mesa de trabajo.` : 'No hay acuerdos nuevos.'); };
    $('#ivSDel', host).onclick = (e) => { if (!e.target.dataset.ok) { e.target.dataset.ok = 1; e.target.textContent = '¿Seguro?'; return; } ST.sesiones = ST.sesiones.filter((x) => x !== sel); V.int.set('sesSel', null); render(); };
  };
  const ics = (l) => {
    if (!l.length) return toast('No hay sesiones futuras con hora.');
    const z = (n) => String(n).padStart(2, '0'), f = (s, h, mas) => { const d = new Date(s + 'T' + (h || '09:00') + ':00'); d.setMinutes(d.getMinutes() + (mas || 0)); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}T${z(d.getHours())}${z(d.getMinutes())}00`; };
    const txt = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Business Avance//Atalaya 360//ES\r\n${l.map((s) => `BEGIN:VEVENT\r\nUID:${s.id}@atalaya360\r\nDTSTAMP:${f(hoy(), '00:00')}\r\nDTSTART:${f(s.fecha, s.hora)}\r\nDTEND:${f(s.fecha, s.hora, +s.dur || 90)}\r\nSUMMARY:${(D.TIPOS_SESION[s.tipo] || 'Sesión') + ' · ' + empresa()}\r\nDESCRIPTION:${String(s.obj || '').replace(/[,;\n]/g, ' ')}\r\nEND:VEVENT`).join('\r\n')}\r\nEND:VCALENDAR`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = 'sesiones-' + norm(empresa()).replace(/[^a-z0-9]+/g, '-') + '.ics'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 100);
  };

  /* ---------- Informes ---------- */
  const I = () => A.informe;
  const cover = (o) => I().cover(Object.assign({ empresa: empresa(), tipo: 'Auditoría integral' }, o));
  const citaClave = () => { const ST = S(); const t = ST.transcripciones.find((x) => x.ia && x.ia.cita_clave); if (t) return t.ia.cita_clave; const s = ST.sintomas.find((x) => x.cita && x.cita.split(' ').length > 5); return s ? s.cita : ''; };
  const tablaConst = () => I().table(['Constante', 'Lectura', 'Estado'], D.CONSTANTES.map((c) => [c.n + ' · ' + c.q.toLowerCase(), cte(c.id) ? c.e[cte(c.id) - 1] : 'Sin tomar', cte(c.id) ? { h: I().pill(D.nivelConst(cte(c.id)), ST_N[D.nivelConst(cte(c.id))]) } : '—']));
  const tablaTriaje = () => I().table(['Área', 'Triaje', 'Síntomas', 'Hipótesis de causa'], ruta().map((x) => [x.a.n, x.n ? { h: I().pill(x.n, TRIAJE[x.n].n) } : '—', String(x.ss.length), x.cs.map((c) => c.t).join(' · ') || '—']));
  const marca = (k) => { const ST = S(); ST.informes = ST.informes || {}; ST.informes[k] = new Date().toISOString(); guardar(); };
  V.informes = {
    // Para la empresa: lo escuchado, las constantes, el triaje, las prioridades y el siguiente paso
    primera() {
      const In = I(); In.reset(); marca('primera');
      const ST = S(), l = causasOrdenadas(), v20 = veinte(), cita = citaClave();
      let h = cover({ kicker: 'Primera sesión', titulo: 'Lo que hemos escuchado', subtitulo: `Sesión del ${fLarga(ST.sesion.fecha)}${ST.sesion.asistentes ? ' · ' + ST.sesion.asistentes : ''}` });
      h += In.summary('En pocas palabras', `${cita ? `<p><i>«${esc(cita)}»</i></p>` : ''}<p>Hemos tomado las constantes de la empresa y escuchado ${pl(ST.sintomas.length, 'síntoma', 'síntomas')}. Detrás hay ${pl(l.length, 'causa probable', 'causas probables')}; ${v20.size ? `${pl(v20.size, 'de ellas explica', 'de ellas explican')} la mayor parte de lo que pasa y por ahí conviene empezar.` : ''} Son hipótesis: la auditoría integral las confirmará con datos.</p>`);
      h += In.section('Las constantes de la empresa', tablaConst());
      if (ruta().length) h += In.section('Triaje por áreas', tablaTriaje(), 'Urgencias: cerrar en 0-14 días. Preferente: este trimestre. Programable: sin urgencia.');
      if (ST.sintomas.length) h += In.section('Lo que hemos escuchado', In.table(['Síntoma', 'Sus palabras', 'Área'], ST.sintomas.slice(0, 20).map((s) => [s.t, s.cita ? '«' + s.cita + '»' : '—', (D.area(s.area) || {}).n || ''])));
      if (l.length) h += In.section('Por dónde empezar', In.table(['Causa probable', 'Explica', 'Prioridad'], l.slice(0, 8).map((x) => [x.c.t, pl(x.ss.length, 'síntoma', 'síntomas'), v20.has(x.c.id) ? { h: In.pill('stop', 'El 20 % que más pesa') } : 'Después'])));
      h += In.section('Siguiente paso: la auditoría integral', `<p>En la auditoría integral revisaremos a fondo, en este orden, ${ruta().slice(0, 4).map((x) => x.a.n.toLowerCase()).join(', ') || 'las áreas de la empresa'}. Para prepararla necesitamos:</p><ul>${ruta().slice(0, 4).flatMap((x) => (D.VERIFICA[x.a.id] || []).slice(0, 2)).map((q) => `<li>${esc(q)}</li>`).join('')}</ul>`);
      h += In.foot('Informe de la primera sesión de la auditoría integral. Las causas son hipótesis de trabajo hasta su verificación.');
      In.open({ titulo: 'Primera sesión · ' + empresa(), html: h, clave: 'iv:primera' });
    },
    // Interno: la hoja de ruta completa del auditor
    guia() {
      const In = I(); In.reset(); marca('guia');
      const ST = S(), r = ruta(), l = causasOrdenadas(), v20 = veinte();
      const res = ST.transcripciones.flatMap((t) => (t.analisis ? t.analisis.resig : []).map((x) => ({ dice: x.cita, quiere: x.quiere, pregunta: x.pregunta })).concat(t.ia && t.ia.resignificaciones ? t.ia.resignificaciones : []));
      let h = cover({ kicker: 'Uso interno del consultor', titulo: 'Guía del auditor', subtitulo: 'Hoja de ruta de la auditoría integral y análisis de intervención' });
      h += In.callout('<b>Documento interno.</b> No se entrega a la empresa. Ordena qué auditar, en qué orden, con qué hipótesis y qué preguntar para confirmar o descartar cada causa.', 'warn');
      h += In.section('Constantes y triaje', tablaConst() + (r.length ? tablaTriaje() : ''));
      if (l.length) h += In.section('Hipótesis priorizadas (20/80)', In.table(['#', 'Causa', 'Área', 'Explica', 'Esfuerzo', 'Estado'], l.map((x, i) => [String(i + 1), (v20.has(x.c.id) ? '★ ' : '') + x.c.t, (D.area(x.c.area) || {}).n || '', pl(x.ss.length, 'síntoma', 'síntomas'), String(x.c.esfuerzo), x.c.estado])), 'Las marcadas con ★ forman el 20 % que explica el 80 % de la gravedad.');
      r.forEach((x, i) => {
        const pats = [...new Set(x.ss.map((s) => s.patron).filter(Boolean))].map((p) => D.patron(p));
        h += In.section(`${i + 1}. ${x.a.n} · ${x.n ? TRIAJE[x.n].n : ''}`, `<p>${esc(x.a.d)} ${x.n === 'stop' ? 'Auditar a fondo (60-90 min).' : x.n === 'warn' ? 'Revisión (30-45 min).' : 'Comprobación (15 min).'}</p>`
          + (x.ss.length ? In.table(['Síntoma', 'Cita'], x.ss.map((s) => [s.t, s.cita ? '«' + s.cita + '»' : '—'])) : '')
          + In.table(['Verificar', 'Documentación'], (D.VERIFICA[x.a.id] || []).map((q) => [q, 'Pedir antes de la sesión']))
          + (pats.length ? In.table(['Hueco', 'Pregunta', 'Artefacto que lo cierra'], pats.map((p) => [p.n, p.q, p.artefacto])) : '')
          + `<p><b>Medir con Atalaya:</b> ${[].concat((x.a.est || []).map((m) => 'sistema estratégico · ' + ((A.strat && A.strat.mod && A.strat.mod(m)) || { nombre: m }).nombre), (x.a.per || []).length ? ['personas y equipos'] : [], x.a.sim ? ['simulador de inversión'] : []).join(', ')}.</p>`);
      });
      if (res.length) h += In.section('Lo que dice y lo que quiere decir', In.table(['Dice', 'Puede estar diciendo', 'Pregunta para confirmarlo'], res.slice(0, 14).map((x) => ['«' + x.dice + '»', x.quiere, x.pregunta])));
      const pend = ST.transcripciones.flatMap((t) => (t.ia && t.ia.preguntas_pendientes) || []);
      if (pend.length) h += In.section('Preguntas pendientes para la auditoría', `<ul>${pend.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>`);
      h += In.section('Señales de alarma durante la intervención', `<ul><li>El empresario pide resultados en semanas sobre causas de fondo: recordar el orden (primero ordenar, después dar claridad).</li><li>Las decisiones se revocan en el pasillo: volver al acuerdo de gobierno.</li><li>Las tareas de la empresa no avanzan entre sesiones: revisar responsables y la mesa de trabajo.</li><li>Aparece una urgencia con plazo (inspección, banco, litigio): tratarla aparte y con profesional externo.</li></ul>`);
      h += In.foot('Guía del auditor · uso interno del consultor.');
      In.open({ titulo: 'Guía del auditor · ' + empresa(), html: h, clave: 'iv:guia' });
    },
    auditoria() {
      const In = I(); In.reset(); marca('auditoria');
      const ST = S(), r = ruta();
      let h = cover({ kicker: 'Auditoría integral', titulo: 'Resultado de la auditoría integral', subtitulo: `${pl(ST.hallazgos.length, 'hallazgo', 'hallazgos')} · ${pl(ST.causas.filter((c) => c.estado === 'confirmada').length, 'causa confirmada', 'causas confirmadas')}` });
      h += In.summary('Resumen', `<p>Se han revisado ${pl(r.length, 'área', 'áreas')} en el orden del triaje. ${ST.causas.filter((c) => c.estado === 'confirmada').length ? 'Las causas confirmadas son: ' + ST.causas.filter((c) => c.estado === 'confirmada').map((c) => c.t.toLowerCase()).join('; ') + '.' : 'Aún no hay causas confirmadas.'}</p>`);
      r.forEach((x) => { const v = ST.verifica[x.a.id] || {}; const filas = (D.VERIFICA[x.a.id] || []).map((q, i) => [q, D.ESTADOS_V[(v[i] || {}).e || 'pend'], (v[i] || {}).nota || '—']); const hs = ST.hallazgos.filter((hh) => hh.area === x.a.id); h += In.section(x.a.n, In.table(['Verificación', 'Estado', 'Evidencia'], filas) + (hs.length ? In.table(['Hallazgo', 'Gravedad', 'Origen'], hs.map((hh) => [hh.t, String(hh.gravedad), hh.origen === 'ecosistema' ? 'Ecosistema Atalaya' : 'Auditoría'])) : '')); });
      h += In.foot('Informe de la auditoría integral.');
      In.open({ titulo: 'Auditoría integral · ' + empresa(), html: h, clave: 'iv:auditoria' });
    },
    plan() {
      const In = I(); In.reset(); marca('plan');
      const ST = S(), acc = ST.plan.acciones, v20 = veinte();
      if (!acc.length) return toast('Genera antes el plan de intervención.');
      let h = cover({ kicker: 'Plan de intervención', titulo: 'El plan de trabajo con la empresa', subtitulo: `${pl(acc.length, 'acción', 'acciones')} en ${D.FASES.length} fases · inicio el ${fLarga(ST.plan.inicio)}` });
      h += In.summary('Qué vamos a hacer', `<p>El plan ataca primero ${pl(v20.size, 'la causa', 'las causas')} que más pesan: ${ST.causas.filter((c) => v20.has(c.id)).map((c) => c.t.toLowerCase()).join('; ') || '—'}. Cada acción tiene responsable, fecha y un entregable concreto que cierra un hueco de la empresa: un responsable con nombre, un límite con número, un método escrito, un dato que se lee o una fecha en el calendario.</p>`);
      D.FASES.forEach((F) => { const l = acc.filter((a) => a.f === F.id); if (l.length) h += In.section(`Fase ${F.id} · ${F.n}`, `<p>${esc(F.d)} Semanas ${F.sem[0]}-${F.sem[1]} · ${F.ritmo.toLowerCase()}.</p>` + In.table(['Acción', 'Línea', 'Entregable', 'Responsable', 'Fecha'], l.map((a) => [(a.clave ? '★ ' : '') + a.t, (D.linea(a.linea) || {}).n, a.ent, a.responsable || (a.quien === 'empresa' ? 'Empresa' : 'Consultor'), fCorta(a.fecha)]))); });
      if (ST.sesiones.length) h += In.section('Calendario de sesiones', In.table(['Fecha', 'Sesión', 'Objetivo'], ST.sesiones.map((s) => [fCorta(s.fecha) + (s.hora ? ' · ' + s.hora : ''), D.TIPOS_SESION[s.tipo] || s.tipo, s.obj || '—'])));
      const dec = acc.filter((a) => a.f === 1 && a.quien === 'empresa').slice(0, 3);
      if (dec.length) h += In.section('Decisiones para firmar', dec.map((a, i) => `<div class="rp-callout"><b>Decisión ${i + 1}.</b> ${esc(a.t)}.<br><br>Firma: ______________________ &nbsp; Cargo: ______________ &nbsp; Fecha: ____/____/______</div>`).join(''));
      h += In.foot('Plan de intervención de la auditoría integral.');
      In.open({ titulo: 'Plan de intervención · ' + empresa(), html: h, clave: 'iv:plan' });
    }
  };
  VISTAS.informes = (host) => {
    const ST = S(), card = (k, t, d, para) => `<div class="glass pad stack iv-inf"><div class="eyebrow">${para}</div><h3 class="iv-bt">${t}</h3><p class="small" style="margin:0">${d}</p><div class="row"><button class="btn solid small" data-inf="${k}">Abrir el informe</button>${ST.informes && ST.informes[k] ? `<small class="muted">Último: ${new Date(ST.informes[k]).toLocaleDateString('es-ES')}</small>` : ''}</div></div>`;
    host.innerHTML = `<div class="grid iv-four">${card('primera', 'Informe de la primera sesión', 'Lo que hemos escuchado, con sus palabras; constantes, triaje, por dónde empezar y qué necesitamos para la auditoría integral.', 'Para la empresa')}${card('guia', 'Guía del auditor', 'Hoja de ruta completa de la auditoría integral: hipótesis priorizadas, qué verificar y pedir en cada área, preguntas para resignificar y señales de alarma.', 'Interno del consultor')}${card('auditoria', 'Informe de la auditoría integral', 'Verificaciones por área, evidencias, hallazgos (también los del ecosistema) y causas confirmadas.', 'Para la empresa')}${card('plan', 'Plan de intervención', 'Fases, líneas de trabajo, acciones con responsable y fecha, calendario de sesiones y decisiones para firmar.', 'Para la empresa')}</div>
      <section class="glass pad stack"><p class="small" style="margin:0">Todos se descargan en PDF con el membrete y se pueden añadir al libro corporativo de la empresa desde su barra. El plan de trabajo de la empresa se sigue en la <a href="mesa.html">mesa de trabajo</a>: envía allí las tareas y las metas desde «Plan de intervención».</p></section>`;
    $$('[data-inf]', host).forEach((b) => (b.onclick = () => V.informes[b.dataset.inf]()));
  };
})();
