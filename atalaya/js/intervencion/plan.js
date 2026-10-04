/* Atalaya 360° · Auditoría integral · plan de intervención, sesiones, envío a la mesa e informes */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { D, $, $$, esc, norm, uid, hoy, sumar, fCorta, fLarga, pl, ST_N, TRIAJE, guardar, toast, empresa, sintomasDe, nivel, global, cte, causasOrdenadas, veinte, ruta, render, ir, VISTAS, smartObj, evalObj, fraseObj, monitor } = V.int;
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
      acciones.push(Object.assign({ id: uid(), linea: L.id, t: x.t, f: x.f, sem: x.sem, ent: x.ent, quien: x.resp, responsable: '', fecha: sumar(ini, (f.sem[0] - 1) * 7 + x.sem * 7 + i), estado: 'pendiente', causas: ataca, clave }, old ? { id: old.id, responsable: old.responsable, fecha: old.fecha, estado: old.estado, enviada: old.enviada, pasos: old.pasos, kpis: old.kpis, notas: old.notas } : {}));
    }));
    // Acciones de las causas propias (sin plantilla): una por causa, en la fase 2
    activas.filter((c) => !c.ref).forEach((c) => { const t = 'Resolver: ' + c.t; const old = prev.get(t); acciones.push(Object.assign({ id: uid(), linea: lineaDeArea(c.area), t, f: 2, sem: 4, ent: 'Artefacto que cierra la causa', quien: 'consultor', responsable: '', fecha: sumar(ini, 7 * 9), estado: 'pendiente', causas: [], clave: v20.has(c.id) }, old ? { id: old.id, responsable: old.responsable, fecha: old.fecha, estado: old.estado, enviada: old.enviada, pasos: old.pasos, kpis: old.kpis, notas: old.notas } : {})); });
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

  /* ---------- Detalle de una acción: pasos, indicadores, entregable, responsable y notas ---------- */
  const abiertas = new Set();
  const asegurarDetalle = (a) => {
    if (!Array.isArray(a.pasos) || !a.pasos.length) a.pasos = D.pasos(a).map((t) => ({ t, hecho: false }));
    if (!Array.isArray(a.kpis)) a.kpis = (D.KPIS[a.linea] || []).slice(0, 1).map((n) => ({ n, actual: '', meta: '' }));
    if (a.notas == null) a.notas = '';
  };
  const causasDeAccion = (a) => { const ST = S(); return ST.causas.filter((c) => (c.ref && (a.causas || []).includes(c.ref)) || a.t === 'Resolver: ' + c.t); };
  const detalleHTML = (a) => {
    asegurarDetalle(a);
    const cs = causasDeAccion(a), hechos = a.pasos.filter((p) => p.hecho).length, sug = (D.KPIS[a.linea] || []).filter((n) => !a.kpis.some((k) => k.n === n));
    return `<div class="iv-det">
      <div class="iv-dg">
        <div class="stack"><div class="eyebrow">Por qué esta acción</div><p class="small" style="margin:0">${cs.length ? 'Ataca ' + cs.map((c) => `<b>${esc(c.t)}</b>${veinte().has(c.id) ? ' (del 20 % que más pesa)' : ''}`).join(' y ') + '.' : 'Es una acción base de la línea «' + esc((D.linea(a.linea) || {}).n) + '»: sin ella el resto no se sostiene.'}</p>
          <label class="small">Entregable que la cierra<input class="input" data-k="ent" value="${esc(a.ent)}"></label>
          <label class="small">Quién la lleva<select class="input" data-k="quien"><option value="empresa" ${a.quien === 'empresa' ? 'selected' : ''}>La hace la empresa</option><option value="consultor" ${a.quien !== 'empresa' ? 'selected' : ''}>La lidera el consultor</option></select></label>
          <label class="small">Fase<select class="input" data-k="f">${D.FASES.map((F) => `<option value="${F.id}" ${+a.f === F.id ? 'selected' : ''}>${F.id} · ${esc(F.n)}</option>`).join('')}</select></label></div>
        <div class="stack"><div class="row"><div class="eyebrow">Pasos</div><span class="spacer"></span><small class="muted">${hechos}/${a.pasos.length}</small></div>
          <ol class="iv-pas">${a.pasos.map((p, i) => `<li data-p="${i}"><input type="checkbox" data-ph ${p.hecho ? 'checked' : ''} aria-label="Paso hecho"><input class="input" data-pt value="${esc(p.t)}"><button class="icon-btn" data-pd aria-label="Quitar el paso">×</button></li>`).join('')}</ol>
          <button class="btn ghost small" data-pn>Añadir un paso</button></div>
        <div class="stack"><div class="eyebrow">Indicadores (KPI)</div>
          ${a.kpis.length ? `<table class="iv-kt"><thead><tr><th>Indicador</th><th>Hoy</th><th>Meta</th><th></th></tr></thead><tbody>${a.kpis.map((k, i) => `<tr data-ki="${i}"><td><input class="input" data-kk="n" value="${esc(k.n)}"></td><td><input class="input" data-kk="actual" value="${esc(k.actual)}"></td><td><input class="input" data-kk="meta" value="${esc(k.meta)}"></td><td><button class="icon-btn" data-kd aria-label="Quitar el indicador">×</button></td></tr>`).join('')}</tbody></table>` : '<p class="small muted" style="margin:0">Sin indicadores.</p>'}
          ${sug.length ? `<div class="iv-fil row"><small class="muted">Propuestos:</small>${sug.map((n) => `<button class="chip" data-ks="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>` : ''}
          <button class="btn ghost small" data-kn>Indicador propio</button></div>
      </div>
      <label class="small">Notas y acuerdos<textarea class="input" rows="2" data-k="notas" placeholder="Qué se ha decidido, qué falta, con quién hablar">${esc(a.notas)}</textarea></label>
      <div class="row"><button class="btn small" data-amesa>${a.enviada ? 'Actualizar en la mesa de trabajo' : 'Enviar esta acción a la mesa'}</button><small class="muted">Llega a la bandeja de la empresa con su responsable y su fecha.</small></div></div>`;
  };
  const wireDetalle = (li, a) => {
    const det = $('.iv-det', li); if (!det) return;
    $$('.iv-pas li', det).forEach((x) => { const p = a.pasos[+x.dataset.p];
      $('[data-ph]', x).onchange = (e) => { p.hecho = e.target.checked; if (a.pasos.every((y) => y.hecho)) a.estado = 'hecha'; else if (a.pasos.some((y) => y.hecho) && a.estado === 'pendiente') a.estado = 'curso'; render(); };
      $('[data-pt]', x).oninput = (e) => { p.t = e.target.value; guardar(); };
      $('[data-pd]', x).onclick = () => { a.pasos.splice(+x.dataset.p, 1); render(); }; });
    $('[data-pn]', det).onclick = () => { a.pasos.push({ t: '', hecho: false }); render(); const l = $$(`[data-a="${a.id}"] .iv-pas [data-pt]`); if (l.length) l[l.length - 1].focus(); };
    $$('[data-ki]', det).forEach((tr) => { const k = a.kpis[+tr.dataset.ki]; $$('[data-kk]', tr).forEach((i) => (i.oninput = () => { k[i.dataset.kk] = i.value; guardar(); })); $('[data-kd]', tr).onclick = () => { a.kpis.splice(+tr.dataset.ki, 1); render(); }; });
    $$('[data-ks]', det).forEach((b) => (b.onclick = () => { a.kpis.push({ n: b.dataset.ks, actual: '', meta: '' }); render(); }));
    $('[data-kn]', det).onclick = () => { a.kpis.push({ n: '', actual: '', meta: '' }); render(); };
    $$('.iv-det > label [data-k], .iv-dg [data-k]', det).forEach((i) => (i.onchange = i.oninput = () => { a[i.dataset.k] = i.dataset.k === 'f' ? +i.value : i.value; if (i.tagName === 'SELECT') render(); else guardar(); }));
    $('[data-amesa]', det).onclick = async () => { const n = await aMesa([a]); render(); toast(n ? 'Acción enviada a la mesa de trabajo.' : 'Actualizada en la mesa de trabajo.'); };
  };

  /* ---------- Hoja de ruta visual: del punto A (hoy) al punto B (destino) ---------- */
  const datosRuta = () => {
    const ST = S(), ini = ST.plan.inicio || hoy(), acc = ST.plan.acciones, g = global(), urg = ruta().filter((x) => x.n === 'stop'), top = causasOrdenadas().filter((x) => veinte().has(x.c.id)).slice(0, 3);
    const fases = D.FASES.map((F) => { const l = acc.filter((a) => +a.f === F.id); return { F, desde: sumar(ini, (F.sem[0] - 1) * 7), hasta: sumar(ini, F.sem[1] * 7 - 1), n: l.length, hechas: l.filter((a) => a.estado === 'hecha').length, hitos: l.slice().sort((a, b) => (b.clave ? 1 : 0) - (a.clave ? 1 : 0) || a.fecha.localeCompare(b.fecha)).slice(0, 3).map((a) => a.ent && a.ent !== '—' ? a.ent : a.t) }; });
    const objs = (ST.objetivos || []).filter((o) => o.especifica || o.dice).slice(0, 3).map((o) => fraseObj(o));
    const A0 = { titulo: !g ? 'Sin triaje todavía' : g === 'stop' ? `${pl(urg.length, 'área', 'áreas')} en urgencias` : g === 'warn' ? 'Atención preferente' : 'Estable', lineas: top.length ? top.map((x) => x.c.t) : ['Completa la primera sesión para ver el punto de partida'], ctes: D.CONSTANTES.filter((c) => cte(c.id)).map((c) => `${c.n} ${cte(c.id)}/5`) };
    const B = { lineas: objs.length ? objs : ['La empresa funciona una semana sin el empresario en la operativa', 'Cada tarea crítica con responsable, cada límite con número, cada método escrito y cada decisión con dato'], fecha: sumar(ini, D.FASES[D.FASES.length - 1].sem[1] * 7) };
    return { A: A0, fases, B };
  };
  const rutaAB = () => {
    const r = datosRuta(), hoyF = hoy();
    return `<div class="iv-ab" role="img" aria-label="Hoja de ruta del punto A al punto B">
      <div class="iv-abp a"><span class="iv-abl">A</span><small>Hoy · punto de partida</small><b>${esc(r.A.titulo)}</b><ul>${r.A.lineas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>${r.A.ctes.length ? `<small class="muted">${esc(r.A.ctes.join(' · '))}</small>` : ''}</div>
      <div class="iv-abr">${r.fases.map((f) => { const act = hoyF >= f.desde && hoyF <= f.hasta, pas = hoyF > f.hasta; return `<div class="iv-abf ${act ? 'on' : ''} ${pas ? 'pas' : ''}"><span class="iv-cn">${f.F.id}</span><b>${esc(f.F.n)}</b><small>${fCorta(f.desde)} → ${fCorta(f.hasta)} · sem. ${f.F.sem[0]}-${f.F.sem[1]}</small><div class="iv-prog"><span style="width:${f.n ? Math.round((f.hechas / f.n) * 100) : 0}%"></span></div><ul>${f.hitos.map((h) => `<li>${esc(h)}</li>`).join('') || '<li class="muted">Sin acciones</li>'}</ul></div>`; }).join('')}</div>
      <div class="iv-abp b"><span class="iv-abl">B</span><small>Destino · ${fLarga(r.B.fecha)}</small><b>Objetivos alcanzados</b><ul>${r.B.lineas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></div>`;
  };
  // Versión para el informe en papel (estilos en línea, colores para fondo claro)
  const rutaABDoc = () => {
    const r = datosRuta(), td = 'padding:8px 10px;vertical-align:top;border:1px solid #d9d6cc;font-size:11px;line-height:1.35';
    const lis = (l) => `<ul style="margin:4px 0 0;padding-left:14px">${l.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
    return `<table class="pdf-keep" style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>
      <td style="${td};background:#fbeaea;width:18%"><div style="font:700 18px sans-serif;color:#c02f2f">A</div><b>Hoy</b><br>${esc(r.A.titulo)}${lis(r.A.lineas)}</td>
      ${r.fases.map((f) => `<td style="${td};background:#f5f3ee"><div style="font:700 10px sans-serif;color:#7d828c;text-transform:uppercase;letter-spacing:.08em">Fase ${f.F.id} · sem. ${f.F.sem[0]}-${f.F.sem[1]}</div><b>${esc(f.F.n)}</b><br><span style="color:#7d828c">${fCorta(f.desde)} → ${fCorta(f.hasta)}</span>${lis(f.hitos)}</td>`).join('')}
      <td style="${td};background:#e9f5ec;width:18%"><div style="font:700 18px sans-serif;color:#1d8a37">B</div><b>Destino</b><br><span style="color:#7d828c">${fLarga(r.B.fecha)}</span>${lis(r.B.lineas)}</td></tr></table>
      <p style="font-size:10px;color:#7d828c;margin:6px 0 0">De izquierda a derecha: la situación de hoy, las cuatro fases con sus hitos (entregables clave) y el destino. Las fechas son orientativas.</p>`;
  };

  /* ---------- Plan de intervención ---------- */
  VISTAS.plan = (host) => {
    const ST = S(), acc = ST.plan.acciones, vista = V.int.get('vistaPlan'), hechas = acc.filter((a) => a.estado === 'hecha').length;
    const fila = (a) => { const ab = abiertas.has(a.id), ps = Array.isArray(a.pasos) ? a.pasos : []; return `<li class="iv-acc ${a.estado} ${a.clave ? 'clave' : ''} ${ab ? 'abierta' : ''}" data-a="${a.id}"><input type="checkbox" data-hecha ${a.estado === 'hecha' ? 'checked' : ''} aria-label="Hecha"><button class="iv-at" data-abrir aria-expanded="${ab}" title="${ab ? 'Cerrar el detalle' : 'Ver pasos, indicadores y responsable'}"><b>${a.clave ? '★ ' : ''}${esc(a.t)}</b><small>${esc((D.linea(a.linea) || {}).n)} · Entregable: ${esc(a.ent)} · ${a.quien === 'empresa' ? 'La hace la empresa' : 'La lidera el consultor'}${ps.length ? ` · ${ps.filter((p) => p.hecho).length}/${ps.length} pasos` : ''}${(a.kpis || []).length ? ` · ${pl(a.kpis.length, 'indicador', 'indicadores')}` : ''}${a.enviada ? ' · en la mesa' : ''}</small><span class="iv-ver">${ab ? 'Cerrar ▴' : 'Ver el plan de la acción ▾'}</span></button>
      <input class="input" data-k="responsable" value="${esc(a.responsable)}" placeholder="Responsable"><input class="input" type="date" data-k="fecha" value="${esc(a.fecha)}"><select class="input" data-k="estado">${Object.keys(EST_A).map((k) => `<option value="${k}" ${a.estado === k ? 'selected' : ''}>${EST_A[k]}</option>`).join('')}</select><button class="icon-btn" data-del aria-label="Quitar">×</button>${ab ? detalleHTML(a) : ''}</li>`; };
    host.innerHTML = `<section class="glass pad stack"><div class="row"><div><div class="eyebrow">Plan de intervención</div><small class="muted">${acc.length ? `${pl(acc.length, 'acción', 'acciones')} · ${hechas} hechas · desde el ${fLarga(ST.plan.inicio)}` : 'Se genera con las causas priorizadas, el triaje y los hallazgos de la auditoría integral.'}</small></div><span class="spacer"></span>
        <label class="small">Inicio<input class="input" type="date" id="ivIni" value="${esc(ST.plan.inicio || hoy())}"></label><button class="btn solid" id="ivGen">${acc.length ? 'Regenerar el plan' : 'Generar el plan'}</button></div>
        ${acc.length ? `<div class="iv-prog"><span style="width:${Math.round((hechas / acc.length) * 100)}%"></span></div>
        <div class="row iv-fil"><span class="small muted">Ver por</span><button class="chip" aria-pressed="${vista === 'fase'}" data-vp="fase">Fases</button><button class="chip" aria-pressed="${vista === 'linea'}" data-vp="linea">Líneas de trabajo</button><span class="spacer"></span><button class="btn small" id="ivMesa">Enviar las tareas de la empresa a la mesa</button><button class="btn ghost small" id="ivMetas">Crear metas SMART en la mesa</button><button class="btn ghost small" id="ivSesGen">Generar las sesiones</button></div><p class="small muted" style="margin:0">Toca una acción para desplegar su plan: pasos, indicadores, entregable, responsable y notas. Las fechas son orientativas: se ajustan en cada sesión.</p>` : ''}</section>
      ${acc.length ? `<section class="glass pad stack"><div class="row"><div class="eyebrow">Hoja de ruta · del punto A al punto B</div><span class="spacer"></span><small class="muted">La fase en curso, resaltada</small></div>${rutaAB()}</section>` : ''}
      ${acc.length ? (vista === 'linea'
        ? D.LINEAS.filter((L) => acc.some((a) => a.linea === L.id)).map((L) => `<section class="glass pad stack"><div class="row"><h3 class="iv-bt">${esc(L.n)}</h3><span class="spacer"></span><small class="muted">${acc.filter((a) => a.linea === L.id && a.estado === 'hecha').length}/${acc.filter((a) => a.linea === L.id).length}</small></div><ul class="iv-accs">${acc.filter((a) => a.linea === L.id).map(fila).join('')}</ul></section>`).join('')
        : D.FASES.map((F) => { const l = acc.filter((a) => +a.f === F.id); return `<section class="glass pad stack iv-fase"><div class="row"><span class="iv-cn">${F.id}</span><div><h3 class="iv-bt">${esc(F.n)}</h3><small class="muted">${esc(F.d)} · Semanas ${F.sem[0]}-${F.sem[1]} · ${esc(D.RITMOS[ritmo(F.id)] || F.ritmo)}</small></div><span class="spacer"></span><small class="muted">${l.filter((a) => a.estado === 'hecha').length}/${l.length}</small></div>${l.length ? `<ul class="iv-accs">${l.map(fila).join('')}</ul>` : '<p class="small muted" style="margin:0">Sin acciones en esta fase.</p>'}</section>`; }).join(''))
      + `<section class="glass pad stack"><div class="eyebrow">Añadir una acción</div><div class="iv-add"><input class="input" id="ivAN" placeholder="Acción concreta"><select class="input" id="ivAL">${D.LINEAS.map((L) => `<option value="${L.id}">${esc(L.n)}</option>`).join('')}</select><select class="input iv-n" id="ivAF">${D.FASES.map((F) => `<option value="${F.id}">${F.id}</option>`).join('')}</select><button class="btn small" id="ivAAdd">Añadir</button></div></section>` : ''}`;
    $('#ivIni', host).onchange = (e) => { ST.plan.inicio = e.target.value; guardar(); };
    $('#ivGen', host).onclick = () => { if (!ST.causas.length && !ST.hallazgos.length) return toast('Primero hacen falta causas (primera sesión) o hallazgos (auditoría integral).'); generar(); render(); toast('Plan generado: revisa responsables y fechas.'); };
    $$('[data-vp]', host).forEach((b) => (b.onclick = () => { V.int.set('vistaPlan', b.dataset.vp); render(); }));
    const m = $('#ivMesa', host); if (m) m.onclick = async () => { const n = await aMesa(acc.filter((a) => a.quien === 'empresa' && a.estado !== 'hecha')); render(); toast(n ? `${pl(n, 'tarea enviada', 'tareas enviadas')} a la mesa de trabajo de la empresa.` : 'Ya estaban en la mesa.'); };
    const mt = $('#ivMetas', host); if (mt) mt.onclick = async () => { const n = await metasMesa(); toast(n ? `${pl(n, 'meta creada', 'metas creadas')} en la mesa de trabajo, una por cada causa del 20 %.` : 'Las metas ya estaban creadas.'); };
    const sg = $('#ivSesGen', host); if (sg) sg.onclick = () => { generarSesiones(); ir('sesiones', { ver: true }); toast('Calendario de sesiones generado.'); };
    $$('.iv-acc', host).forEach((li) => {
      const a = acc.find((x) => x.id === li.dataset.a);
      $('[data-hecha]', li).onchange = (e) => { a.estado = e.target.checked ? 'hecha' : 'pendiente'; render(); };
      $('[data-abrir]', li).onclick = () => { if (abiertas.has(a.id)) abiertas.delete(a.id); else abiertas.add(a.id); render(); };
      $$(':scope > [data-k]', li).forEach((i) => (i.onchange = () => { a[i.dataset.k] = i.value; if (i.dataset.k === 'estado') render(); else guardar(); }));
      $(':scope > [data-del]', li).onclick = (e) => { if (!e.target.dataset.conf) { e.target.dataset.conf = 1; e.target.textContent = '¿?'; e.target.title = 'Pulsa otra vez para quitarla'; return; } ST.plan.acciones = acc.filter((x) => x !== a); render(); };
      wireDetalle(li, a);
    });
    const ad = $('#ivAAdd', host); if (ad) ad.onclick = () => { const t = $('#ivAN', host).value.trim(); if (!t) return; const f = +$('#ivAF', host).value; const a = { id: uid(), linea: $('#ivAL', host).value, t, f, sem: 2, ent: '—', quien: 'consultor', responsable: '', fecha: sumar(ST.plan.inicio || hoy(), (D.FASES[f - 1].sem[0] + 1) * 7), estado: 'pendiente', causas: [], clave: false }; ST.plan.acciones.push(a); abiertas.add(a.id); render(); };
  };

  /* ---------- Sesiones: ritmo configurable por fase, día y hora ---------- */
  const RITMO_DEF = { 1: 7, 2: 14, 3: 14, 4: 28 };
  const ritmo = (f) => { const r = S().plan.ritmo || {}; return +r[f] || RITMO_DEF[f]; };
  const diaSem = () => { const ST = S(); return +ST.plan.dia || (new Date((ST.plan.inicio || hoy()) + 'T12:00:00').getDay() || 1); };
  const alDia = (fecha, dia) => { const d = new Date(fecha + 'T12:00:00'); const dif = (dia - d.getDay() + 7) % 7; d.setDate(d.getDate() + dif); return d.toISOString().slice(0, 10); };
  const generarSesiones = () => {
    const ST = S(), ini = ST.plan.inicio || hoy(), hora = ST.plan.hora || '09:00', dia = diaSem(), prev = ST.sesiones.filter((s) => s.acta || (s.acuerdos || []).length || ['contacto', 'auditoria'].includes(s.tipo));
    if (!prev.some((s) => s.tipo === 'contacto')) prev.unshift({ id: uid(), tipo: 'contacto', fecha: ST.sesion.fecha, hora: '', dur: 60, obj: 'Primera sesión: escuchar, recoger sus objetivos, tomar constantes y hacer el triaje.', acta: '', acuerdos: [] });
    if (!prev.some((s) => s.tipo === 'auditoria')) prev.push({ id: uid(), tipo: 'auditoria', fecha: alDia(sumar(ST.sesion.fecha, 7), dia), hora, dur: 180, obj: 'Auditoría integral según la hoja de ruta.', acta: '', acuerdos: [] });
    const nuevas = [{ id: uid(), tipo: 'arranque', fecha: alDia(ini, dia), hora, dur: 120, obj: 'Presentar el plan de intervención, nombrar responsables y firmar las primeras decisiones.', f: 1 }];
    D.FASES.forEach((F) => {
      const paso = ritmo(F.id), fin = sumar(ini, F.sem[1] * 7); let d = alDia(sumar(ini, (F.sem[0] - 1) * 7 + (F.id === 1 ? 7 : 0)), dia);
      while (d < fin) { const ult = sumar(d, paso) >= fin; nuevas.push({ id: uid(), tipo: ult ? 'revision' : F.id === 1 ? 'trabajo' : 'seguimiento', fecha: d, hora, dur: F.id === 1 ? 120 : 90, obj: (ult ? 'Revisión de la fase «' + F.n + '»: qué se ha cerrado y qué no. ' : '') + F.d, f: F.id }); d = sumar(d, paso); }
    });
    ST.sesiones = prev.concat(nuevas.filter((n) => !prev.some((p) => p.fecha === n.fecha))).map((s) => Object.assign({ acta: '', acuerdos: [] }, s)).sort((a, b) => a.fecha.localeCompare(b.fecha));
    guardar();
  };
  const puntosSesion = (s) => { const ST = S(), sig = ST.sesiones[ST.sesiones.indexOf(s) + 1]; const hasta = sig ? sig.fecha : sumar(s.fecha, 14); return ST.plan.acciones.filter((a) => a.estado !== 'hecha' && a.fecha <= hasta && (!s.f || a.f <= s.f)).slice(0, 10); };
  const checkSesion = (s) => { const base = ['Revisar las acciones vencidas y sus responsables', 'Indicadores del cuadro de mando: qué ha cambiado', 'Agenda del empresario: horas liberadas para su 20 %']; if (s.tipo === 'auditoria') return ruta().flatMap((x) => (D.VERIFICA[x.a.id] || []).slice(0, 2)); if (s.tipo === 'revision') base.push('Prueba: ¿qué tareas ya no pasan por el empresario?'); if ((S().objetivos || []).length) base.push('Objetivos del empresario: avance de cada indicador'); return base; };
  const evento = (s) => ({ id: s.id, titulo: (D.TIPOS_SESION[s.tipo] || 'Sesión') + ' · ' + empresa(), fecha: s.fecha, hora: s.hora || '09:00', dur: +s.dur || 90, detalle: (s.obj || '') + '\n\nOrden del día:\n' + puntosSesion(s).map((a) => '· ' + a.t).join('\n') + '\n\n(Atalaya 360°: las fechas del plan son orientativas)' });
  let guiaCal = false;
  VISTAS.sesiones = (host) => {
    const ST = S(), sel = ST.sesiones.find((x) => x.id === V.int.get('sesSel')) || ST.sesiones.find((x) => x.fecha >= hoy()) || ST.sesiones[0];
    const C = A.calendario, prov = C ? C.proveedor() : '';
    host.innerHTML = `<section class="glass pad stack"><div class="row"><div><div class="eyebrow">Ritmo de las sesiones</div><small class="muted">Se aplica al generar o regenerar el calendario. Las sesiones con acta o acuerdos se conservan.</small></div><span class="spacer"></span>${C ? `<button class="btn ${prov ? 'ghost' : 'solid'} small" id="ivCal">${prov ? 'Calendario: ' + esc(C.NOMBRES[prov].split(' (')[0]) + ' · cambiar' : 'Conectar mi calendario'}</button>` : ''}</div>
        <div class="iv-ritmo">${D.FASES.map((F) => `<label class="small">${F.id} · ${esc(F.n)} <span class="muted">(sem. ${F.sem[0]}-${F.sem[1]})</span><select class="input" data-rit="${F.id}">${Object.keys(D.RITMOS).map((k) => `<option value="${k}" ${ritmo(F.id) === +k ? 'selected' : ''}>${D.RITMOS[k]}</option>`).join('')}</select></label>`).join('')}
          <label class="small">Día de la semana<select class="input" id="ivDia">${Object.keys(D.DIAS).map((k) => `<option value="${k}" ${diaSem() === +k ? 'selected' : ''}>${D.DIAS[k]}</option>`).join('')}</select></label><label class="small">Hora<input class="input" type="time" id="ivHora" value="${esc(ST.plan.hora || '09:00')}"></label></div>
        <p class="small muted" style="margin:0">Recomendación: semanal al ordenar (hay urgencias y decisiones que firmar), quincenal al dar claridad y transformar (la empresa necesita tiempo para ejecutar entre sesiones) y mensual al consolidar. Si entre sesiones no se avanza, no subas la frecuencia: revisa responsables y la mesa de trabajo. ${ST.sesiones.length ? `<b>${pl(ST.sesiones.length, 'sesión', 'sesiones')}</b> en el calendario.` : ''}</p></section>
      <div class="grid iv-two"><section class="glass pad stack"><div class="row"><div class="eyebrow">Sesiones con la empresa</div><span class="spacer"></span><button class="btn small" id="ivSGen">${ST.sesiones.length > 2 ? 'Regenerar con este ritmo' : 'Generar desde el plan'}</button><button class="btn ghost small" id="ivSN">Nueva sesión</button>${C && prov === 'ics' ? '<button class="btn ghost small" id="ivIcs">Todas en .ics</button>' : ''}</div>
        ${ST.sesiones.length ? `<ol class="iv-sesl">${ST.sesiones.map((s) => `<li class="${s === sel ? 'on' : ''} ${s.fecha < hoy() ? 'pasada' : ''}" data-s="${s.id}"><span class="iv-sf">${fCorta(s.fecha)}${s.hora ? '<br>' + esc(s.hora) : ''}</span><span><b>${esc(D.TIPOS_SESION[s.tipo] || s.tipo)}</b><small>${esc((s.obj || '').slice(0, 90))}</small></span>${s.acta ? '<i class="iv-ok" title="Con acta">●</i>' : ''}</li>`).join('')}</ol>` : '<p class="small muted" style="margin:0">Genera las sesiones desde el plan de intervención o crea una.</p>'}
        <div id="ivIcsBox"></div></section>
      <section class="glass pad stack">${sel ? `<div class="row"><div class="eyebrow">${esc(D.TIPOS_SESION[sel.tipo] || 'Sesión')} · ${fLarga(sel.fecha)}</div><span class="spacer"></span>${C ? (prov === 'ics' ? '<button class="btn small" id="ivUnIcs">Añadir a mi calendario (.ics)</button>' : `<a class="btn small" id="ivAddCal" target="_blank" rel="noopener" href="${esc(C.enlace(evento(sel), prov || 'google'))}">Añadir a ${esc(prov ? C.NOMBRES[prov].split(' (')[0].split(' /')[0] : 'mi calendario')}</a>`) : ''}</div>
        <div class="iv-g3"><label class="small">Tipo<select class="input" data-k="tipo">${Object.keys(D.TIPOS_SESION).map((k) => `<option value="${k}" ${sel.tipo === k ? 'selected' : ''}>${D.TIPOS_SESION[k]}</option>`).join('')}</select></label><label class="small">Fecha<input class="input" type="date" data-k="fecha" value="${esc(sel.fecha)}"></label><label class="small">Hora<input class="input" type="time" data-k="hora" value="${esc(sel.hora || '')}"></label><label class="small">Duración (min)<input class="input" type="number" min="15" step="15" data-k="dur" value="${esc(sel.dur || 90)}"></label></div>
        <label class="small">Objetivo<textarea class="input" rows="2" data-k="obj">${esc(sel.obj || '')}</textarea></label>
        <div><b class="small">Orden del día (acciones que vencen hasta la siguiente sesión)</b><ul class="small" style="margin:4px 0 0;padding-left:18px">${puntosSesion(sel).map((a) => `<li>${a.clave ? '★ ' : ''}${esc(a.t)} <span class="muted">· ${fCorta(a.fecha)}${a.responsable ? ' · ' + esc(a.responsable) : ''}</span></li>`).join('') || '<li class="muted">Sin acciones pendientes en este tramo.</li>'}</ul></div>
        <div><b class="small">Qué chequear</b><ul class="small" style="margin:4px 0 0;padding-left:18px">${checkSesion(sel).map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
        <label class="small">Acta y observaciones<textarea class="input" rows="4" data-k="acta" placeholder="Qué se ha visto, qué ha cambiado, qué preocupa">${esc(sel.acta || '')}</textarea></label>
        <div><b class="small">Acuerdos</b>${(sel.acuerdos || []).map((a, i) => `<div class="iv-g3 iv-acu" data-i="${i}"><input class="input" data-ak="t" value="${esc(a.t)}" placeholder="Acuerdo"><input class="input" data-ak="resp" value="${esc(a.resp || '')}" placeholder="Responsable"><input class="input" type="date" data-ak="fecha" value="${esc(a.fecha || '')}"></div>`).join('')}<div class="row"><button class="btn ghost small" id="ivAcuN">Añadir acuerdo</button><span class="spacer"></span><button class="btn small" id="ivAcuM">Llevar los acuerdos a la mesa</button><button class="btn ghost small" id="ivSDel">Borrar la sesión</button></div></div>` : '<p class="small muted">Sin sesiones.</p>'}</section></div>`;
    // Primera vez: elegir el calendario, con su guía
    if (C && !prov && !guiaCal && ST.sesiones.length) { guiaCal = true; let visto = ''; try { visto = localStorage.getItem('atalaya.calendario.guia'); localStorage.setItem('atalaya.calendario.guia', '1'); } catch (e) { /* nada */ } if (!visto) setTimeout(() => A.conexiones.abrir('calendario'), 300); }
    const cb = $('#ivCal', host); if (cb) cb.onclick = () => A.conexiones.abrir('calendario');
    $$('[data-rit]', host).forEach((x) => (x.onchange = () => { ST.plan.ritmo = Object.assign({}, ST.plan.ritmo, { [x.dataset.rit]: +x.value }); guardar(); toast('Ritmo guardado. Pulsa «Regenerar con este ritmo» para aplicarlo.'); }));
    $('#ivDia', host).onchange = (e) => { ST.plan.dia = +e.target.value; guardar(); toast('Día guardado. Pulsa «Regenerar con este ritmo» para aplicarlo.'); };
    $('#ivHora', host).onchange = (e) => { ST.plan.hora = e.target.value; guardar(); };
    $('#ivSGen', host).onclick = () => { if (!ST.plan.acciones.length) return toast('Genera antes el plan de intervención.'); generarSesiones(); render(); toast('Sesiones generadas con el ritmo elegido.'); };
    $('#ivSN', host).onclick = () => { const s = { id: uid(), tipo: 'seguimiento', fecha: hoy(), hora: ST.plan.hora || '09:00', dur: 90, obj: '', acta: '', acuerdos: [] }; ST.sesiones.push(s); ST.sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha)); V.int.set('sesSel', s.id); render(); };
    const icsBox = (txt) => { const b = $('#ivIcsBox', host); b.innerHTML = `<div class="ms-propc"><small>Si la descarga no empieza (en algunos visores está bloqueada), copia este texto en un archivo «sesiones.ics» y ábrelo con tu calendario.</small><textarea class="input" rows="4" readonly>${esc(txt)}</textarea><div class="row"><button class="btn ghost small" id="ivIcsCp">Copiar</button></div></div>`; $('#ivIcsCp', b).onclick = async () => { try { await navigator.clipboard.writeText(txt); toast('Copiado.'); } catch (e) { $('textarea', b).select(); } }; };
    const ib = $('#ivIcs', host); if (ib) ib.onclick = () => { const l = ST.sesiones.filter((s) => s.fecha >= hoy() && s.hora); if (!l.length) return toast('No hay sesiones futuras con hora.'); icsBox(C.descargarIcs(l.map(evento), 'sesiones-' + norm(empresa()).replace(/[^a-z0-9]+/g, '-'))); };
    $$('.iv-sesl li', host).forEach((li) => (li.onclick = () => { V.int.set('sesSel', li.dataset.s); render(); }));
    if (!sel) return;
    const u1 = $('#ivUnIcs', host); if (u1) u1.onclick = () => icsBox(C.descargarIcs([evento(sel)], 'sesion-' + sel.fecha));
    $$('[data-k]', host).forEach((i) => (i.oninput = () => { sel[i.dataset.k] = i.value; guardar(); }));
    $$('[data-k=fecha], [data-k=hora], [data-k=tipo]', host).forEach((i) => (i.onchange = () => { sel[i.dataset.k] = i.value; ST.sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha)); render(); }));
    $$('.iv-acu', host).forEach((d) => $$('[data-ak]', d).forEach((i) => (i.oninput = () => { sel.acuerdos[+d.dataset.i][i.dataset.ak] = i.value; guardar(); })));
    $('#ivAcuN', host).onclick = () => { sel.acuerdos = sel.acuerdos || []; sel.acuerdos.push({ t: '', resp: '', fecha: sumar(sel.fecha, 14) }); render(); };
    $('#ivAcuM', host).onclick = async () => { if (!A.mesa || !A.mesa.enviar) return; const n = await A.mesa.enviar((sel.acuerdos || []).filter((a) => a.t).map((a, i) => ({ t: a.t, resp: a.resp, fecha: a.fecha, mundo: 'intervencion', origen: 'Acuerdo de la sesión del ' + fCorta(sel.fecha), oid: 'iv-acu:' + sel.id + ':' + i, impacto: 4 }))); toast(n ? `${pl(n, 'acuerdo enviado', 'acuerdos enviados')} a la mesa de trabajo.` : 'No hay acuerdos nuevos.'); };
    $('#ivSDel', host).onclick = (e) => { if (!e.target.dataset.conf) { e.target.dataset.conf = 1; e.target.textContent = '¿Seguro?'; return; } ST.sesiones = ST.sesiones.filter((x) => x !== sel); V.int.set('sesSel', null); render(); };
  };
  document.addEventListener('atalaya:calendario', () => { if (location.hash === '#sesiones') render(); });

  /* ---------- Informes ---------- */
  const I = () => A.informe;
  const cover = (o) => I().cover(Object.assign({ empresa: empresa(), tipo: 'Auditoría integral' }, o));
  const citaClave = () => { const ST = S(); const t = ST.transcripciones.find((x) => x.ia && x.ia.cita_clave); if (t) return t.ia.cita_clave; const s = ST.sintomas.find((x) => x.cita && x.cita.split(' ').length > 5); return s ? s.cita : ''; };
  const tablaConst = () => I().table(['Constante', 'Lectura', 'Estado'], D.CONSTANTES.map((c) => [c.n + ' · ' + c.q.toLowerCase(), cte(c.id) ? c.e[cte(c.id) - 1] : 'Sin tomar', cte(c.id) ? { h: I().pill(D.nivelConst(cte(c.id)), ST_N[D.nivelConst(cte(c.id))]) } : '—']));
  const tablaTriaje = () => I().table(['Área', 'Triaje', 'Síntomas', 'Hipótesis de causa'], ruta().map((x) => [x.a.n, x.n ? { h: I().pill(x.n, TRIAJE[x.n].n) } : '—', String(x.ss.length), x.cs.map((c) => c.t).join(' · ') || '—']));
  const tablaObjetivos = () => { const l = (S().objetivos || []).filter((o) => o.dice || o.especifica); return l.length ? I().table(['#', 'Lo que quiere (sus palabras)', 'Objetivo SMART', 'Indicador', 'Beneficio', 'SMART'], l.map((o, i) => { const sm = smartObj(o), ev = evalObj(o); return ['O' + (i + 1), o.dice ? '«' + o.dice + '»' : '—', fraseObj(o) || '—', o.indicador ? `${o.indicador}: ${o.actual || '?'} → ${o.valor || '?'} ${o.unidad || ''}` : '—', { h: I().pill(ev.st, ST_N[ev.st]) }, sm.filter((y) => y.ok).length + '/5']; })) + l.filter((o) => (o.como || '').trim()).map((o) => `<p style="margin:8px 0 2px"><b>Cómo se alcanzará ${'O' + (l.indexOf(o) + 1)}:</b></p><ul style="margin:0">${o.como.split('\n').filter((t) => t.trim()).map((t) => `<li>${esc(t.trim())}</li>`).join('')}</ul>`).join('') : ''; };
  const notaFechas = () => I().callout('<b>Sobre las fechas.</b> Todas las fechas de este documento son orientativas: se han calculado desde el inicio previsto y el ritmo de sesiones acordado, y se revisarán y ajustarán en cada sesión de seguimiento según el avance real de la empresa.', 'warn');
  const marca = (k) => { const ST = S(); ST.informes = ST.informes || {}; ST.informes[k] = new Date().toISOString(); guardar(); };
  const linea = (n) => '<span style="display:inline-block;width:100%;border-bottom:1px dotted #b9b5a8;height:16px"></span>'.repeat(n || 2);
  V.informes = {
    // Para la empresa: lo escuchado, sus objetivos, las constantes, el triaje, las prioridades y el siguiente paso
    primera() {
      const In = I(); In.reset(); marca('primera');
      const ST = S(), l = causasOrdenadas(), v20 = veinte(), cita = citaClave();
      let h = cover({ kicker: 'Primera sesión', titulo: 'Lo que hemos escuchado', subtitulo: `Sesión del ${fLarga(ST.sesion.fecha)}${ST.sesion.asistentes ? ' · ' + ST.sesion.asistentes : ''}` });
      h += In.summary('En pocas palabras', `${cita ? `<p><i>«${esc(cita)}»</i></p>` : ''}<p>Hemos tomado las constantes de la empresa y escuchado ${pl(ST.sintomas.length, 'síntoma', 'síntomas')}. Detrás hay ${pl(l.length, 'causa probable', 'causas probables')}; ${v20.size ? `${pl(v20.size, 'de ellas explica', 'de ellas explican')} la mayor parte de lo que pasa y por ahí conviene empezar.` : ''} Son hipótesis: la auditoría integral las confirmará con datos.</p>`);
      if (tablaObjetivos()) h += In.section('Sus objetivos', tablaObjetivos(), 'Lo que usted quiere conseguir, convertido en objetivos SMART: específicos, medibles, que dependen de usted, rentables y con fecha.');
      h += In.section('Las constantes de la empresa', `<div class="pdf-keep" style="max-width:560px;margin:0 0 10px">${monitor()}</div>` + tablaConst(), 'Como en una consulta: cada línea es una constante. Cuanto más rápido y alto late, más tensión hay en ese punto (1 = bien, 5 = grave).');
      if (ruta().length) h += In.section('Triaje por áreas', tablaTriaje(), 'Urgencias: cerrar en 0-14 días. Preferente: este trimestre. Programable: sin urgencia.');
      if (ST.sintomas.length) h += In.section('Lo que hemos escuchado', In.table(['Síntoma', 'Sus palabras', 'Área'], ST.sintomas.slice(0, 20).map((s) => [s.t, s.cita ? '«' + s.cita + '»' : '—', (D.area(s.area) || {}).n || ''])));
      if (l.length) h += In.section('Por dónde empezar', In.table(['Causa probable', 'Explica', 'Prioridad'], l.slice(0, 8).map((x) => [x.c.t, pl(x.ss.length, 'síntoma', 'síntomas'), v20.has(x.c.id) ? { h: In.pill('stop', 'El 20 % que más pesa') } : 'Después'])));
      h += In.section('Siguiente paso: la auditoría integral', `<p>En la auditoría integral revisaremos a fondo, en este orden, ${ruta().slice(0, 4).map((x) => x.a.n.toLowerCase()).join(', ') || 'las áreas de la empresa'}. Para prepararla necesitamos:</p><ul>${ruta().slice(0, 4).flatMap((x) => (D.VERIFICA[x.a.id] || []).slice(0, 2)).map((q) => `<li>${esc(q)}</li>`).join('')}</ul>`);
      h += In.foot('Informe de la primera sesión de la auditoría integral. Las causas son hipótesis de trabajo hasta su verificación.');
      In.open({ titulo: 'Primera sesión · ' + empresa(), html: h, clave: 'iv:primera' });
    },
    // Interno: pautas y preguntas de la sesión para rellenar, y la hoja de ruta completa del auditor
    guia() {
      const In = I(); In.reset(); marca('guia');
      const ST = S(), r = ruta(), l = causasOrdenadas(), v20 = veinte(), s = ST.sesion;
      const res = ST.transcripciones.flatMap((t) => (t.analisis ? t.analisis.resig : []).map((x) => ({ dice: x.cita, quiere: x.quiere, pregunta: x.pregunta })).concat(t.ia && t.ia.resignificaciones ? t.ia.resignificaciones : []));
      let h = cover({ kicker: 'Uso interno del consultor', titulo: 'Guía del auditor', subtitulo: 'Hoja de preguntas de la primera sesión y hoja de ruta de la auditoría integral' });
      h += In.callout('<b>Documento interno.</b> No se entrega a la empresa. Llévalo a la primera sesión: pregunta, marca y anota. Después sube la transcripción a Atalaya y el expediente se completa solo (síntomas, causas, triaje y hoja de ruta).', 'warn');
      h += In.section('Antes de la sesión', `<ul><li>Confirma una hora sin interrupciones y, si puede ser, fuera del despacho del empresario.</li><li>Pide permiso para grabar y explica para qué: «para escucharte a ti y no a mis notas».</li><li>Lleva esta hoja impresa; la grabadora hace el resto.</li><li>Regla de la sesión: hoy se escucha, no se juzga ni se dan soluciones. Apunta frases literales.</li><li>Fíjate en lo que repite, lo que minimiza y lo que coloca fuera («el banco», «la gente»): ahí suele estar el síntoma.</li></ul>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:6px"><tr><td style="padding:4px 0;width:33%">Empresa: <b>${esc(empresa())}</b></td><td style="width:33%">Fecha: ${s.fecha ? fLarga(s.fecha) : '____/____/______'}</td><td>Asistentes: ${esc(s.asistentes) || '____________________'}</td></tr></table>`);
      let min = 0;
      D.GUION.forEach((b) => { const ini = min; min += b.min;
        h += In.section(`${String(ini).padStart(2, '0')}-${String(min).padStart(2, '0')} min · ${b.n}`, `<p class="rp-muted" style="margin:0 0 6px">${esc(b.obj)}</p>` + b.p.map((p, i) => { const k = b.id + ':' + i, nota = (s.notas || {})[k]; return `<div class="pdf-keep" style="margin:0 0 10px"><p style="margin:0"><b>${s.hechas && s.hechas[k] ? '☑' : '☐'} ${esc(p.q)}</b></p><p class="rp-muted" style="margin:2px 0 4px;font-size:10.5px">Qué escuchar: ${esc(p.oye)}${p.area ? ' · ' + esc(D.area(p.area).n) : ''}</p>${nota ? `<p style="margin:0;font-style:italic">«${esc(nota)}»</p>` : linea(2)}</div>`; }).join('')
          + (b.id === 'objetivos' ? `<div class="pdf-keep" style="margin-top:8px"><b>Plantilla del objetivo (una por objetivo)</b>${In.table(['Campo', 'Anotación'], [['Lo que quiere, con sus palabras', ''], ['Qué hará él (verbo + qué)', ''], ['Indicador · hoy → meta · unidad', ''], ['Fecha límite · responsable', ''], ['¿Depende solo de él?', '☐ Sí  ☐ No → reformular'], ['Qué gana (con cifra) · qué le cuesta', ''], ['¿Merece la pena?', '☐ Sí  ☐ No'], ['Cómo lo va a alcanzar (acciones semanales)', '']].map((x) => [x[0], { h: x[1] ? esc(x[1]) : linea(1) }]))}</div>` : ''));
      });
      h += In.section('Al terminar: constantes vitales', In.table(['Constante', 'Pregunta', '1', '2', '3', '4', '5'], D.CONSTANTES.map((c) => [c.n, c.q, ...[1, 2, 3, 4, 5].map((v) => (cte(c.id) === v ? '●' : '○'))])), '1 = bien · 5 = grave. Puntúa con lo que has visto y oído; luego compáralo con lo que lee Atalaya en la transcripción.');
      if (r.length || l.length) {
        h += In.section('Constantes y triaje', tablaConst() + (r.length ? tablaTriaje() : ''));
        if (l.length) h += In.section('Hipótesis priorizadas (20/80)', In.table(['#', 'Causa', 'Área', 'Explica', 'Esfuerzo', 'Estado'], l.map((x, i) => [String(i + 1), (v20.has(x.c.id) ? '★ ' : '') + x.c.t, (D.area(x.c.area) || {}).n || '', pl(x.ss.length, 'síntoma', 'síntomas'), String(x.c.esfuerzo), x.c.estado])), 'Las marcadas con ★ forman el 20 % que explica el 80 % de la gravedad.');
        r.forEach((x, i) => {
          const pats = [...new Set(x.ss.map((s2) => s2.patron).filter(Boolean))].map((p) => D.patron(p));
          h += In.section(`${i + 1}. ${x.a.n} · ${x.n ? TRIAJE[x.n].n : ''}`, `<p>${esc(x.a.d)} ${x.n === 'stop' ? 'Auditar a fondo (60-90 min).' : x.n === 'warn' ? 'Revisión (30-45 min).' : 'Comprobación (15 min).'}</p>`
            + (x.ss.length ? In.table(['Síntoma', 'Cita'], x.ss.map((s2) => [s2.t, s2.cita ? '«' + s2.cita + '»' : '—'])) : '')
            + In.table(['Verificar', 'Documentación'], (D.VERIFICA[x.a.id] || []).map((q) => [q, 'Pedir antes de la sesión']))
            + (pats.length ? In.table(['Hueco', 'Pregunta', 'Artefacto que lo cierra'], pats.map((p) => [p.n, p.q, p.artefacto])) : '')
            + `<p><b>Medir con Atalaya:</b> ${[].concat((x.a.est || []).map((m) => 'sistema estratégico · ' + ((A.strat && A.strat.mod && A.strat.mod(m)) || { nombre: m }).nombre), (x.a.per || []).length ? ['personas y equipos'] : [], x.a.sim ? ['simulador de inversión'] : []).join(', ')}.</p>`);
        });
      } else h += In.callout('Cuando subas la transcripción y apuntes los síntomas, esta guía añadirá la hoja de ruta de la auditoría integral: hipótesis priorizadas, qué verificar y pedir en cada área y las preguntas para resignificar.');
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
    // Para la empresa: el plan completo, con hoja de ruta, desgloses, indicadores, responsables y calendario
    plan() {
      const In = I(); In.reset();
      const ST = S(), acc = ST.plan.acciones, v20 = veinte();
      if (!acc.length) return toast('Genera antes el plan de intervención.');
      marca('plan');
      const ini = ST.plan.inicio || hoy(), fin = sumar(ini, D.FASES[D.FASES.length - 1].sem[1] * 7), emp = acc.filter((a) => a.quien === 'empresa').length, lineas = D.LINEAS.filter((L) => acc.some((a) => a.linea === L.id));
      const resp = (a) => a.responsable || (a.quien === 'empresa' ? 'Empresa (por asignar)' : 'Consultor');
      let h = cover({ kicker: 'Plan de intervención', titulo: 'Plan de trabajo con la empresa', subtitulo: `${pl(acc.length, 'acción', 'acciones')} en ${D.FASES.length} fases y ${pl(lineas.length, 'línea', 'líneas')} de trabajo · del ${fLarga(ini)} al ${fLarga(fin)}` });
      h += In.summary('Resumen ejecutivo', `<p>El plan ataca primero ${pl(v20.size, 'la causa', 'las causas')} que más pesan: ${ST.causas.filter((c) => v20.has(c.id)).map((c) => c.t.toLowerCase()).join('; ') || '—'}. Cada acción tiene responsable, fecha, pasos, indicadores y un entregable concreto que cierra un hueco de la empresa: un responsable con nombre, un límite con número, un método escrito, un dato que se lee o una fecha en el calendario.</p>`
        + In.kpis([{ k: 'Acciones', v: String(acc.length), d: `${acc.filter((a) => a.clave).length} clave (★)` }, { k: 'Las lleva la empresa', v: String(emp), d: `${acc.length - emp} lidera el consultor` }, { k: 'Duración', v: `${D.FASES[D.FASES.length - 1].sem[1]} semanas`, d: `${fCorta(ini)} → ${fCorta(fin)}` }, { k: 'Sesiones', v: String(ST.sesiones.length || '—'), d: ST.sesiones.length ? 'con orden del día' : 'por generar' }]));
      h += notaFechas();
      h += In.section('Hoja de ruta: del punto A al punto B', rutaABDoc());
      if (tablaObjetivos()) h += In.section('Los objetivos de la empresa', tablaObjetivos(), 'El punto B: lo que el empresario quiere conseguir, en formato SMART.');
      h += In.section('Resumen por línea de trabajo', In.table(['Línea', 'Acciones', 'Clave', 'Fases', 'Entregables', 'Hasta'], lineas.map((L) => { const l = acc.filter((a) => a.linea === L.id); return [L.n, String(l.length), String(l.filter((a) => a.clave).length), [...new Set(l.map((a) => +a.f))].sort().join(', '), l.map((a) => a.ent).filter((e) => e && e !== '—').slice(0, 3).join(' · ') || '—', fCorta(l.reduce((m, a) => (a.fecha > m ? a.fecha : m), ''))]; })));
      D.FASES.forEach((F) => {
        const l = acc.filter((a) => +a.f === F.id); if (!l.length) return;
        h += In.section(`Fase ${F.id} · ${F.n}`, `<p>${esc(F.d)} Semanas ${F.sem[0]}-${F.sem[1]} (${fCorta(sumar(ini, (F.sem[0] - 1) * 7))} → ${fCorta(sumar(ini, F.sem[1] * 7 - 1))}) · ${esc((D.RITMOS[ritmo(F.id)] || F.ritmo).toLowerCase())}.</p>`
          + In.table(['Acción', 'Línea', 'Entregable', 'Responsable', 'Fecha'], l.map((a) => [(a.clave ? '★ ' : '') + a.t, (D.linea(a.linea) || {}).n, a.ent, resp(a), fCorta(a.fecha)]))
          + l.filter((a) => a.clave || (a.pasos || []).length).slice(0, 6).map((a) => { const ps = (a.pasos && a.pasos.length) ? a.pasos : D.pasos(a).map((t) => ({ t })); return `<div class="pdf-keep" style="margin:8px 0;padding:8px 10px;border-left:3px solid ${a.clave ? '#c48a00' : '#c8c4b6'};background:#faf9f5"><b>${a.clave ? '★ ' : ''}${esc(a.t)}</b><br><span style="font-size:10.5px;color:#7d828c">Responsable: ${esc(resp(a))} · Fecha: ${fCorta(a.fecha)} · Entregable: ${esc(a.ent)}</span><ol style="margin:4px 0 0;font-size:11px">${ps.map((p) => `<li>${p.hecho ? '☑' : '☐'} ${esc(p.t)}</li>`).join('')}</ol>${(a.kpis || []).length ? `<p style="margin:4px 0 0;font-size:11px"><b>Indicadores:</b> ${a.kpis.map((k) => `${esc(k.n)}${k.meta ? ` (${esc(k.actual || '?')} → ${esc(k.meta)})` : ''}`).join(' · ')}</p>` : ''}</div>`; }).join(''));
      });
      const kp = acc.flatMap((a) => (a.kpis && a.kpis.length ? a.kpis : (D.KPIS[a.linea] || []).slice(0, 1).map((n) => ({ n, actual: '', meta: '' }))).map((k) => ({ L: (D.linea(a.linea) || {}).n, k }))).filter((x, i, arr) => x.k.n && arr.findIndex((y) => y.k.n === x.k.n) === i);
      if (kp.length) h += In.section('Indicadores de seguimiento', In.table(['Línea', 'Indicador', 'Hoy', 'Meta'], kp.map((x) => [x.L, x.k.n, x.k.actual || '—', x.k.meta || 'Por fijar'])), 'Se revisan en cada sesión. Los que no tienen meta se fijan en la sesión de arranque.');
      const rs = {}; acc.forEach((a) => { const r = resp(a); (rs[r] = rs[r] || []).push(a); });
      h += In.section('Matriz de responsables', In.table(['Responsable', 'Acciones', 'Clave', 'Próxima fecha', 'Primera acción'], Object.keys(rs).map((r) => { const l = rs[r].filter((a) => a.estado !== 'hecha').sort((a, b) => a.fecha.localeCompare(b.fecha)); return [r, String(rs[r].length), String(rs[r].filter((a) => a.clave).length), l[0] ? fCorta(l[0].fecha) : '—', l[0] ? l[0].t : 'Todo hecho']; })));
      if (ST.sesiones.length) h += In.section('Calendario de sesiones', In.table(['Fecha', 'Sesión', 'Objetivo'], ST.sesiones.map((s) => [fCorta(s.fecha) + (s.hora ? ' · ' + s.hora : ''), D.TIPOS_SESION[s.tipo] || s.tipo, s.obj || '—'])), 'Fechas orientativas: se confirman de una sesión a la siguiente.');
      const dec = acc.filter((a) => +a.f === 1 && a.quien === 'empresa').slice(0, 3);
      if (dec.length) h += In.section('Decisiones para firmar', dec.map((a, i) => `<div class="rp-callout pdf-keep"><b>Decisión ${i + 1}.</b> ${esc(a.t)}.<br><br>Firma: ______________________ &nbsp; Cargo: ______________ &nbsp; Fecha: ____/____/______</div>`).join(''));
      h += In.foot('Plan de intervención de la auditoría integral. Las fechas son orientativas y se ajustan en las sesiones de seguimiento.');
      In.open({ titulo: 'Plan de intervención · ' + empresa(), html: h, clave: 'iv:plan' });
    }
  };
  VISTAS.informes = (host) => {
    const ST = S(), card = (k, t, d, para) => `<div class="glass pad stack iv-inf"><div class="eyebrow">${para}</div><h3 class="iv-bt">${t}</h3><p class="small" style="margin:0">${d}</p><div class="row"><button class="btn solid small" data-inf="${k}">Abrir el informe</button>${ST.informes && ST.informes[k] ? `<small class="muted">Último: ${new Date(ST.informes[k]).toLocaleDateString('es-ES')}</small>` : ''}</div></div>`;
    host.innerHTML = `<div class="grid iv-four">${card('primera', 'Informe de la primera sesión', 'Lo que hemos escuchado, con sus palabras; sus objetivos SMART, el monitor de constantes, el triaje, por dónde empezar y qué necesitamos para la auditoría integral.', 'Para la empresa')}${card('guia', 'Guía del auditor', 'Hoja de preguntas de la primera sesión para rellenar, plantilla de objetivos y, con la transcripción, la hoja de ruta completa de la auditoría integral.', 'Interno del consultor')}${card('propuesta', 'Propuesta comercial', 'Dossier de propuesta con su situación, lo que obtiene, el protocolo de trabajo, el coste de no hacerlo, la inversión con su retorno y la forma de pago (por hitos o por cuotas con parte variable).', 'Para la empresa')}${card('auditoria', 'Informe de la auditoría integral', 'Verificaciones por área, evidencias, hallazgos (también los del ecosistema) y causas confirmadas.', 'Para la empresa')}${card('plan', 'Plan de intervención', 'Hoja de ruta del punto A al B, resumen por línea, fases con pasos e indicadores, matriz de responsables, calendario de sesiones y decisiones para firmar. Fechas orientativas.', 'Para la empresa')}</div>
      <section class="glass pad stack"><p class="small" style="margin:0">Todos se descargan en PDF con el membrete y se pueden añadir al libro corporativo de la empresa desde su barra. El plan de trabajo de la empresa se sigue en la <a href="mesa.html">mesa de trabajo</a>: envía allí las tareas y las metas desde «Plan de intervención».</p></section>`;
    $$('[data-inf]', host).forEach((b) => (b.onclick = () => V.informes[b.dataset.inf]()));
  };
})();
