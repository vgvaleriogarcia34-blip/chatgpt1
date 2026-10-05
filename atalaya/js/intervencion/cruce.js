/* Atalaya 360° · Auditoría integral · Cruce de transcripciones y documentación de la cuenta
   · Varias transcripciones a la vez, cada una marcada como primera sesión (antes de la propuesta) o
     sesión de intervención (después de la aceptación), con su vista conjunta y las medias.
   · De las de primera sesión: síntomas a la foto, primera valoración de las constantes por el lenguaje
     y respuestas a las preguntas del guion (las que no aparecen se señalan para revisarlas).
   · Triaje: la documentación que ya está en la cuenta (simulador, sistema estratégico, personas y los
     documentos subidos) se lee por áreas y se mete en la hoja.
   · De las de intervención: acta, acuerdos y avances de cada objetivo para su sesión; los objetivos
     alimentan el orden del día de las sesiones siguientes y el informe de seguimiento.
   Se engancha a las vistas existentes (escucha, guion, constantes, triaje, plan, sesiones e informes). */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { D, E, $, $$, esc, norm, uid, hoy, sumar, fCorta, fLarga, pl, guardar, toast, empresa, render, ir, VISTAS, cte, fraseObj } = V.int;
  const S = () => V.int.st();
  const P = () => A.platform;
  const MOMENTO = { primera: 'Primera sesión · antes de la propuesta', intervencion: 'Sesión de intervención · tras la aceptación' };

  /* ================= TRANSCRIPCIONES ================= */
  const parecido = (a, b) => { const A1 = new Set(palabras(a)), B1 = palabras(b); if (!A1.size) return 0; return B1.filter((w) => A1.has(w)).length / A1.size; };
  const VACIAS = new Set('para como cuando donde quien quienes cual cuales sobre entre desde hasta tiene tienen hacer hace haces estas estan esta este esto eso esos esas porque pero tambien todo todos todas mucho muchos poco cosa cosas tienes vamos puede pueden seria sería ahora antes despues después aqui aquí empresa tuyo tuya hemos habeis habéis decir dime cuentame cuéntame'.split(' '));
  const palabras = (t) => norm(t).split(/[^a-zñ]+/).filter((w) => w.length > 3 && !VACIAS.has(w));
  const clientesDe = (tr) => new Set(tr.clientes && tr.clientes.length ? tr.clientes : (tr.hablantes[0] ? [tr.hablantes[0].n] : []));
  // ¿Primera sesión o intervención? Por lo que se dice y por el punto en que está la cuenta
  const adivinarMomento = (tr) => {
    const t = norm(tr.turnos.map((x) => x.t).join(' ')), ST = S();
    const marcas = ['como acordamos', 'la semana pasada', 'la ultima sesion', 'el plan', 'avance', 'avances', 'hemos hecho', 'tareas que', 'seguimiento', 'objetivo', 'el panel', 'la mesa de trabajo'].reduce((a, w) => a + (t.split(w).length - 1), 0);
    if (marcas >= 4) return 'intervencion';
    const aceptada = ST.propuesta && ST.propuesta.generada && ST.plan.acciones.length;
    return aceptada && ST.transcripciones.some((x) => x !== tr && (x.momento || 'primera') === 'primera') ? 'intervencion' : 'primera';
  };
  const nuevaTr = (nombre, texto, fecha) => {
    const p = E.parse(texto); if (!p.turnos.length) return null;
    const clientes = E.clientePorDefecto(p.hablantes, S().sesion.consultor || (A.platform && A.platform.user && A.platform.user.nombre) || '', p);
    const t = { id: uid(), nombre: nombre || 'Sesión ' + fCorta(hoy()), fecha: fecha || hoy(), turnos: p.turnos, hablantes: p.hablantes, clientes };
    t.analisis = E.analizar(p, clientes); t.momento = adivinarMomento(t);
    S().transcripciones.push(t); return t;
  };
  const fechaDelNombre = (n) => { const m = String(n).match(/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/) || String(n).match(/(\d{2})[-_.](\d{2})[-_.](20\d{2})/); if (!m) return ''; return m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`; };

  /* Constantes estimadas por el lenguaje (las que no estima la escucha, por frecuencia de palabras) */
  const LEX_CTE = {
    pulso: ['pagar', 'pago', 'pagos', 'nominas', 'nómina', 'banco', 'poliza', 'póliza', 'cobrar', 'cobros', 'impago', 'impagos', 'caja', 'liquidez', 'deuda', 'prestamo', 'préstamo', 'descubierto'],
    respiracion: ['no llegamos', 'no damos abasto', 'horas extra', 'saturad', 'agotad', 'quemad', 'sobrecarga', 'faltan manos', 'no tengo gente', 'a tope', 'desbordad'],
    reflejos: ['ya veremos', 'no se', 'no lo se', 'depende', 'lo pensare', 'mas adelante', 'cuando se pueda', 'esperar', 'dudas', 'no me decido', 'lo dejamos']
  };
  const estimar = (tr) => {
    const set = clientesDe(tr), txt = norm(tr.turnos.filter((x) => set.has(x.h)).map((x) => x.t).join(' ')), tot = Math.max(1, txt.split(/\s+/).length);
    const out = Object.assign({}, (tr.analisis && tr.analisis.estimadas) || {});
    Object.keys(LEX_CTE).forEach((k) => { const n = LEX_CTE[k].reduce((a, w) => a + (txt.split(w).length - 1), 0), por1000 = (n / tot) * 1000; out[k] = Math.max(1, Math.min(5, Math.round(1 + (por1000 / 8) * 4))); });
    return out;
  };
  const deMomento = (m) => S().transcripciones.filter((t) => (t.momento || 'primera') === m && t.usar !== false);
  // Vista conjunta: todas las transcripciones de un momento como si fueran una (las medias quedan ponderadas por lo que habla el empresario)
  const conjunta = (m) => {
    const l = deMomento(m); if (!l.length) return null;
    const turnos = l.flatMap((t) => { const set = clientesDe(t); return t.turnos.map((x) => ({ h: set.has(x.h) ? '__cliente' : '__otro', t: x.t })); });
    const an = E.analizar({ turnos, hablantes: [{ n: '__cliente', palabras: 1 }, { n: '__otro', palabras: 0 }] }, ['__cliente']);
    const est = {}; D.CONSTANTES.forEach((c) => { const v = l.map((t) => estimar(t)[c.id]).filter(Boolean); if (v.length) est[c.id] = Math.round(v.reduce((a, x) => a + x, 0) / v.length); });
    const media = (f) => l.reduce((a, t) => a + f(t), 0) / l.length;
    return { n: l.length, an, est, palabras: l.reduce((a, t) => a + ((t.analisis && t.analisis.palabras) || 0), 0), huecosMedia: media((t) => (t.analisis ? t.analisis.huecos.filter((h) => h.peso).length : 0)), yoMedia: media((t) => (t.analisis ? t.analisis.yo : 0)), nosMedia: media((t) => (t.analisis ? t.analisis.nos : 0)), pctMedia: media((t) => (t.analisis ? t.analisis.pctCliente : 0)) };
  };

  /* Síntomas a la foto */
  const aSintomas = (tr) => {
    const ST = S(), ya = new Set(ST.sintomas.map((s) => norm(s.cita || s.t))); let n = 0;
    ((tr.analisis && tr.analisis.sugeridos) || []).forEach((s) => { if (ya.has(norm(s.cita))) return; ya.add(norm(s.cita)); ST.sintomas.push(Object.assign({ id: uid(), gravedad: 3 }, s, { origen: 'transcripcion', tr: tr.id })); n++; });
    return n;
  };
  /* Primera valoración de las constantes: rellena las vacías con la media del lenguaje */
  const aConstantes = (forzar) => {
    const ST = S(), c = conjunta('primera'); if (!c) return 0; ST.cteOrigen = ST.cteOrigen || {}; ST.cteLenguaje = c.est; let n = 0;
    D.CONSTANTES.forEach((k) => { if (c.est[k.id] && (forzar || !cte(k.id) || ST.cteOrigen[k.id] === 'lenguaje')) { if (ST.constantes[k.id] !== c.est[k.id]) n++; ST.constantes[k.id] = c.est[k.id]; ST.cteOrigen[k.id] = 'lenguaje'; } });
    return n;
  };
  /* Respuestas a las preguntas del guion desde las transcripciones */
  const responderGuion = () => {
    const ST = S(), s = ST.sesion, trs = deMomento('primera'); s.respuestas = s.respuestas || {}; s.notas = s.notas || {}; s.hechas = s.hechas || {};
    let n = 0; const sin = [];
    D.GUION.forEach((b) => b.p.forEach((p, i) => {
      const k = b.id + ':' + i; if (s.respuestas[k] && s.respuestas[k].origen === 'claude') return;
      let mejor = null;
      trs.forEach((tr) => {
        const set = clientesDe(tr);
        // 1. El consultor hizo una pregunta parecida: la respuesta es lo que dice después el empresario
        tr.turnos.forEach((x, j) => { if (set.has(x.h)) return; const sc = parecido(p.q, x.t); if (sc >= 0.34 && (!mejor || sc + 1 > mejor.sc)) { const resp = tr.turnos.slice(j + 1, j + 4).filter((y) => set.has(y.h)).slice(0, 2).map((y) => y.t).join(' '); if (resp.split(/\s+/).length >= 4) mejor = { sc: sc + 1, t: resp, tr: tr.id, conf: 'alta' }; } });
        // 2. Si no, lo que dice el empresario que más encaja con la pregunta y lo que hay que escuchar
        if (!mejor || mejor.conf !== 'alta') { const claves = [...new Set(palabras(p.q + ' ' + p.oye))]; tr.turnos.filter((x) => set.has(x.h)).forEach((x) => { const w = new Set(palabras(x.t)), sc = claves.filter((c) => w.has(c)).length; if (sc >= 3 && (!mejor || sc / 10 > mejor.sc)) mejor = { sc: sc / 10, t: x.t, tr: tr.id, conf: sc >= 5 ? 'media' : 'baja' }; }); }
      });
      if (mejor) {
        const corto = mejor.t.length > 420 ? mejor.t.slice(0, 417).replace(/\s\S*$/, '') + '…' : mejor.t;
        s.respuestas[k] = { t: corto, tr: mejor.tr, conf: mejor.conf, origen: 'transcripcion' };
        if (!s.notas[k] || s.auto && s.auto[k]) { s.notas[k] = '«' + corto + '»'; s.auto = s.auto || {}; s.auto[k] = true; }
        s.hechas[k] = true; n++;
      } else { if (s.respuestas[k] && s.respuestas[k].origen === 'transcripcion') delete s.respuestas[k]; sin.push(k); }
    }));
    s.sinRespuesta = sin;
    // Los objetivos no salen de una sola respuesta: los saca V.objSmart de todo lo que dice el empresario en las transcripciones del día
    return { n, sin };
  };
  const responderConClaude = async () => {
    const v = A.ia ? await A.ia.asegurar('Responder el guion desde la transcripción') : null; if (!v) return null;
    const ST = S(), trs = deMomento('primera'); if (!trs.length) return null;
    const preguntas = D.GUION.flatMap((b) => b.p.map((p, i) => ({ k: b.id + ':' + i, q: p.q })));
    const texto = trs.map((t) => `### ${t.nombre} (${t.fecha})\n` + t.turnos.map((x) => `${x.h}: ${x.t}`).join('\n')).join('\n\n').slice(0, 120000);
    const j = await A.ia.json(`Eres consultor de pymes. Con las transcripciones de la primera sesión con el empresario, responde cada pregunta del guion con lo que él dijo, aunque la pregunta no se hiciera con esas palabras: busca la parte de la conversación que encaja con lo que pregunta. Respuesta breve en tercera persona y una cita literal que la respalde. Si no hay nada que responda una pregunta, no la incluyas. Devuelve JSON: {"respuestas":[{"k":"","respuesta":"","cita":""}]}.\nPreguntas: ${JSON.stringify(preguntas)}\n\nTranscripciones:\n${texto}`, { max: 16000 });
    const s = ST.sesion; s.respuestas = s.respuestas || {}; s.auto = s.auto || {}; let n = 0;
    ((j && j.respuestas) || []).forEach((r) => { if (!r.k || !r.respuesta) return; s.respuestas[r.k] = { t: r.respuesta, cita: r.cita || '', conf: 'alta', origen: 'claude' }; if (!s.notas[r.k] || s.auto[r.k]) { s.notas[r.k] = r.respuesta + (r.cita ? ` — «${r.cita}»` : ''); s.auto[r.k] = true; } s.hechas[r.k] = true; n++; });
    const todas = preguntas.map((x) => x.k); s.sinRespuesta = todas.filter((k) => !s.respuestas[k]);
    return n;
  };

  /* Sesiones de intervención: acta, acuerdos y avances de los objetivos */
  const objetivosVivos = () => { const ST = S(), l = (ST.objetivos || []).filter((o) => o.especifica || o.dice).map((o, i) => ({ id: 'o:' + o.id, n: 'O' + (i + 1), t: o.especifica || o.dice, ind: o.indicador, actual: o.actual, valor: o.valor, unidad: o.unidad, como: o.como })); const pr = ST.propuesta; if (pr && pr.inv && pr.inv.variable && pr.inv.variable.on) (pr.inv.objetivos || []).forEach((o, i) => { if (o.t && !l.some((x) => norm(x.t) === norm(o.t))) l.push({ id: 'v:' + i, n: 'V' + (i + 1), t: o.t, ind: '', como: o.accion, peso: o.peso, tramos: o.tramos }); }); return l; };
  const sesionPara = (tr) => {
    const ST = S(); let s = ST.sesiones.find((x) => x.id === tr.sesion);
    if (!s) s = ST.sesiones.filter((x) => x.tipo !== 'contacto').sort((a, b) => Math.abs(new Date(a.fecha) - new Date(tr.fecha)) - Math.abs(new Date(b.fecha) - new Date(tr.fecha)))[0];
    if (!s || Math.abs(new Date(s.fecha) - new Date(tr.fecha)) > 9 * 864e5) { s = { id: uid(), tipo: 'seguimiento', fecha: tr.fecha, hora: '09:00', dur: 90, obj: 'Sesión de intervención (desde la transcripción «' + tr.nombre + '»).', acta: '', acuerdos: [] }; ST.sesiones.push(s); ST.sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha)); }
    tr.sesion = s.id; return s;
  };
  const frasesDe = (t) => (String(t).match(/[^.!?¿¡\n]+[.!?]*/g) || []).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 4);
  const extraerIntervencion = (tr) => {
    const s = sesionPara(tr), todo = tr.turnos.map((x) => ({ h: x.h, f: frasesDe(x.t) })).flatMap((x) => x.f.map((f) => ({ h: x.h, f })));
    const RE_ACU = /\b(vamos a|queda(mos)? en|acordamos|te encargas|se encarga|para el (lunes|martes|miercoles|miércoles|jueves|viernes|dia|día|proximo|próximo)|antes del|la semana que viene|hay que|tienes que|tiene que|me comprometo|lo dejamos)\b/i;
    const RE_AV = /\b(ya (esta|está|tenemos|hemos)|hemos (hecho|terminado|conseguido|implantado|empezado)|funciona|se ha (hecho|cerrado)|lo tenemos|completad|terminad)\b/i;
    const RE_BLQ = /\b(no (hemos|he) podido|no ha dado tiempo|bloquead|pendiente|se ha retrasado|no se ha hecho|falta|problema)\b/i;
    const acuerdos = [...new Set(todo.filter((x) => RE_ACU.test(x.f)).map((x) => x.f))].slice(0, 10);
    const avances = [...new Set(todo.filter((x) => RE_AV.test(x.f)).map((x) => x.f))].slice(0, 8);
    const bloqueos = [...new Set(todo.filter((x) => RE_BLQ.test(x.f)).map((x) => x.f))].slice(0, 6);
    const objs = objetivosVivos().map((o) => { const k = [...new Set(palabras(o.t + ' ' + (o.ind || '') + ' ' + (o.como || '')))]; const men = todo.filter((x) => { const w = new Set(palabras(x.f)); return k.filter((c) => w.has(c)).length >= 2; }).map((x) => x.f).slice(0, 3); return { id: o.id, n: o.n, t: o.t, men }; }).filter((o) => o.men.length);
    s.acuerdos = s.acuerdos || []; const ya = new Set(s.acuerdos.map((a) => norm(a.t)));
    acuerdos.forEach((a) => { if (!ya.has(norm(a))) s.acuerdos.push({ t: a.length > 160 ? a.slice(0, 157) + '…' : a, resp: '', fecha: sumar(s.fecha, 14), tr: tr.id }); });
    s.avances = (s.avances || []).filter((x) => x.tr !== tr.id).concat(objs.map((o) => ({ oid: o.id, n: o.n, t: o.t, texto: o.men.join(' '), tr: tr.id })));
    const resumen = `Desde «${tr.nombre}» (${fLarga(tr.fecha)}): ${pl(avances.length, 'avance', 'avances')}, ${pl(acuerdos.length, 'acuerdo', 'acuerdos')} y ${pl(bloqueos.length, 'bloqueo', 'bloqueos')}.${avances.length ? '\nAvances: ' + avances.slice(0, 4).join(' ') : ''}${bloqueos.length ? '\nBloqueos: ' + bloqueos.slice(0, 3).join(' ') : ''}`;
    if (!String(s.acta || '').includes('Desde «' + tr.nombre + '»')) s.acta = (s.acta ? s.acta + '\n\n' : '') + resumen;
    tr.extraido = new Date().toISOString();
    return { s, acuerdos: acuerdos.length, avances: objs.length };
  };

  /* Datos reales: al subir las transcripciones de una empresa, ningún mundo usa ya los datos de ejemplo */
  const aDatosReales = async () => {
    const p = P(); if (!p || !p.activarModoReal) return false;
    const nueva = await p.activarModoReal('auditoria');
    try {
      const sim = await p.loadData('simulador');
      if (A.simEsEjemplo && A.simEsEjemplo(sim) && A.simVacio) { const e = p.empresas.activa(); await p.saveData('simulador', A.simVacio(e && e.nombre !== 'Mi empresa' ? e.nombre : '', (sim && sim.sector) || (e && e.sector) || 'industria')); }
    } catch (x) { /* sin simulador */ }
    if (nueva) toast('Empresa en datos reales: los mundos sin datos subidos se quedan a cero y piden sus datos.');
    return nueva;
  };
  const MUNDOS_DATOS = [
    { id: 'simulador', n: 'Simulador (finanzas y caja)', href: 'app.html#empresa', pide: 'Cuentas anuales o balance y cuenta de resultados' },
    { id: 'estrategia', n: 'Sistema estratégico (clientes, ventas, compras, cobros…)', href: 'estrategia.html#origen', pide: 'Listado de clientes y ventas, compras, cobros y tesorería' },
    { id: 'personas', n: 'Personas y equipos', href: 'personas.html', pide: 'Plantilla, puestos y equipos' }
  ];
  const estadoDatos = async () => {
    const sim = await cargar('simulador', 'atalaya.v1'), est = await cargar('estrategia', 'atalaya.estrategia.v1'), per = await cargar('personas', 'atalaya.personas.v1');
    const simOk = !!(sim && sim.empresa && sim.ejemplo === false && !sim.sinDatos && +sim.empresa.ventas > 0);
    const mods = est ? Object.keys(est).filter((k) => !['origen', 'evolucion', 'impuestos', 'valoracion', 'lean', 'sim'].includes(k) && est[k] && typeof est[k] === 'object' && est[k].ejemplo === false && !est[k].__vacio) : [];
    const docs = est && est.origen && Array.isArray(est.origen.docs) ? est.origen.docs.length : 0;
    const nPer = per && Array.isArray(per.personas) ? per.personas.length : 0;
    return { simulador: { ok: simOk, det: simOk ? 'Cuentas cargadas' : 'A cero: faltan las cuentas' }, estrategia: { ok: docs > 0 || mods.length > 0, det: docs ? pl(docs, 'documento subido', 'documentos subidos') : mods.length ? pl(mods.length, 'módulo con datos', 'módulos con datos') : 'A cero: faltan los datos' }, personas: { ok: nPer > 0, det: nPer ? pl(nPer, 'persona', 'personas') : 'Sin personas dadas de alta' } };
  };
  const tarjetaDatos = (host) => {
    if (!P() || !P().modoReal || !P().modoReal()) return;
    const sec = document.createElement('section'); sec.className = 'glass pad stack iv-reales'; sec.innerHTML = '<div class="eyebrow">Datos reales de la empresa</div><small class="muted">Leyendo…</small>';
    host.prepend(sec);
    estadoDatos().then((st) => {
      const falta = MUNDOS_DATOS.filter((m) => !st[m.id].ok).length;
      sec.innerHTML = `<div class="row"><div><div class="eyebrow">Datos reales de la empresa</div><small class="muted">Esta empresa trabaja con datos reales${P().empresas.activa().datosRealesDesde ? ' desde el ' + fLarga(P().empresas.activa().datosRealesDesde) : ''}: ningún mundo usa los datos de ejemplo. ${falta ? `Faltan datos en ${pl(falta, 'mundo', 'mundos')}; pídeselos a la empresa y súbelos.` : 'Todos los mundos tienen datos subidos.'}</small></div></div>
        <ul class="iv-dl">${MUNDOS_DATOS.map((m) => `<li class="${st[m.id].ok ? 'ok' : 'stop'}"><span>${st[m.id].ok ? '✓' : '○'} <a href="${m.href}">${esc(m.n)}</a>${st[m.id].ok ? '' : ` · <small>pedir: ${esc(m.pide)}</small>`}</span><b>${esc(st[m.id].det)}</b></li>`).join('')}</ul>`;
    }).catch(() => sec.remove());
  };

  /* Procesar lo nuevo: cada transcripción según su momento */
  const procesar = (nuevas) => {
    aDatosReales().then((n) => { if (n) render(); });
    let sin = 0, ctes = 0, resp = null; const ses = [];
    // Primero las de primera sesión (síntomas, constantes, guion y sus objetivos); después las de intervención, que ya ven los objetivos
    nuevas.filter((t) => (t.momento || 'primera') === 'primera').forEach((t) => { sin += aSintomas(t); });
    if (nuevas.some((t) => (t.momento || 'primera') === 'primera')) { ctes = aConstantes(false); resp = responderGuion(); }
    nuevas.filter((t) => t.momento === 'intervencion').forEach((t) => ses.push(extraerIntervencion(t)));
    guardar();
    const partes = [];
    if (sin) partes.push(pl(sin, 'síntoma nuevo', 'síntomas nuevos') + ' en la foto');
    if (ctes) partes.push(pl(ctes, 'constante valorada', 'constantes valoradas') + ' por el lenguaje');
    if (resp) partes.push(`${resp.n} de ${resp.n + resp.sin.length} preguntas del guion con respuesta${resp.sin.length ? ` (${resp.sin.length} sin respuesta)` : ''}`);
    ses.forEach((x) => partes.push(`sesión del ${fCorta(x.s.fecha)}: ${pl(x.acuerdos, 'acuerdo', 'acuerdos')} y avances de ${pl(x.avances, 'objetivo', 'objetivos')}`));
    return partes;
  };

  /* ---------- Vista: escucha con varias transcripciones ---------- */
  const escucha0 = VISTAS.escucha;
  VISTAS.escucha = (host) => {
    escucha0(host);
    tarjetaDatos(host);
    const ST = S(), f = $('#ivFile', host);
    if (f) { f.multiple = true; const lab = f.closest('label'); if (lab && lab.firstChild && lab.firstChild.nodeType === 3) lab.firstChild.textContent = 'Subir archivos (uno o varios)';
      f.onchange = async (e) => { const files = [...e.target.files], nuevas = []; for (const fl of files) { try { const t = nuevaTr(fl.name.replace(/\.[^.]+$/, ''), await E.leerArchivo(fl), fechaDelNombre(fl.name)); if (t) nuevas.push(t); else toast(`«${fl.name}»: no tiene texto.`); } catch (x) { toast(`«${fl.name}»: ${x.message}`); } } if (!nuevas.length) return; const r = V.cruce.procesar(nuevas); render(); toast(`${pl(nuevas.length, 'transcripción analizada', 'transcripciones analizadas')}${r.length ? ': ' + r.join('; ') : ''}. Revisa el momento de cada una.`); }; }
    const ta = $('#ivTrAdd', host); if (ta) { const o = ta.onclick; ta.onclick = () => { const n0 = ST.transcripciones.length; o(); const nuevas = S().transcripciones.slice(n0); if (nuevas.length) { const r = V.cruce.procesar(nuevas); render(); if (r.length) toast(r.join('; ') + '.'); } }; }
    if (!ST.transcripciones.length) return;
    const c1 = conjunta('primera'), c2 = deMomento('intervencion');
    const sec = document.createElement('section'); sec.className = 'glass pad stack iv-cuenta';
    sec.innerHTML = `<div class="row"><div><div class="eyebrow">Transcripciones de la cuenta</div><small class="muted">Marca el momento de cada una: las de primera sesión alimentan la foto, las constantes y el guion; las de intervención, el acta y los acuerdos de su sesión y el seguimiento de los objetivos.</small></div><span class="spacer"></span><button class="btn small" id="ivReap">Volver a aplicar a síntomas, constantes y guion</button></div>
      <div class="table-wrap"><table class="ms-tab"><thead><tr><th style="text-align:left">Transcripción</th><th>Fecha</th><th>Momento</th><th>Palabras del cliente</th><th>Huecos</th><th>Yo / nosotros</th><th>Sesión</th><th>En medias</th></tr></thead><tbody>${ST.transcripciones.map((t) => `<tr data-tr="${t.id}"><td style="text-align:left"><b>${esc(t.nombre)}</b></td><td><input class="input" type="date" data-tk="fecha" value="${esc(t.fecha)}"></td><td><select class="input" data-tk="momento">${Object.keys(MOMENTO).map((k) => `<option value="${k}" ${(t.momento || 'primera') === k ? 'selected' : ''}>${k === 'primera' ? 'Primera sesión' : 'Intervención'}</option>`).join('')}</select></td><td>${t.analisis ? t.analisis.palabras.toLocaleString('es-ES') + ' · ' + t.analisis.pctCliente + ' %' : '—'}</td><td>${t.analisis ? t.analisis.huecos.filter((h) => h.peso).length + '/7' : '—'}</td><td>${t.analisis ? t.analisis.yo + '/' + t.analisis.nos : '—'}</td><td>${(t.momento || 'primera') === 'intervencion' ? `<select class="input" data-tk="sesion"><option value="">Automática</option>${ST.sesiones.filter((x) => x.tipo !== 'contacto').map((x) => `<option value="${x.id}" ${t.sesion === x.id ? 'selected' : ''}>${fCorta(x.fecha)} · ${esc(D.TIPOS_SESION[x.tipo] || x.tipo)}</option>`).join('')}</select>` : '—'}</td><td><input type="checkbox" data-tk="usar" ${t.usar !== false ? 'checked' : ''}></td></tr>`).join('')}</tbody></table></div>
      ${c1 ? `<div class="eyebrow">Vista conjunta · ${pl(c1.n, 'transcripción', 'transcripciones')} de primera sesión</div><div class="iv-kp"><div><span>Palabras del empresario</span><b>${c1.palabras.toLocaleString('es-ES')}</b></div><div><span>Huecos con cita (conjunto)</span><b>${c1.an.huecos.filter((h) => h.peso).length}/7</b></div><div><span>Huecos por sesión (media)</span><b>${c1.huecosMedia.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</b></div><div><span>Yo / nosotros (media)</span><b>${Math.round(c1.yoMedia)}/${Math.round(c1.nosMedia)}</b></div><div><span>Habla el empresario (media)</span><b>${Math.round(c1.pctMedia)} %</b></div></div>
        <div class="small"><b>Constantes por el lenguaje (media):</b> ${D.CONSTANTES.map((c) => `${esc(c.n)} ${c1.est[c.id] || '—'}`).join(' · ')}</div>
        <div class="small"><b>Huecos que más se repiten:</b> ${c1.an.huecos.filter((h) => h.peso).sort((a, b) => b.peso - a.peso).slice(0, 4).map((h) => `${esc(h.n)} (${h.peso})`).join(' · ') || '—'}</div>` : ''}
      ${c2.length ? `<div class="small"><b>${pl(c2.length, 'sesión de intervención', 'sesiones de intervención')}:</b> ${c2.map((t) => `${esc(t.nombre)} → ${(() => { const s = ST.sesiones.find((x) => x.id === t.sesion); return s ? 'sesión del ' + fCorta(s.fecha) : 'sin vincular'; })()}${t.extraido ? '' : ' (sin extraer)'}`).join(' · ')} <button class="btn ghost small" id="ivExtInt">Extraer acta, acuerdos y avances</button></div>` : ''}`;
    const ancla = host.querySelector(':scope > .grid'); if (ancla && ancla.nextSibling) host.insertBefore(sec, ancla.nextSibling); else host.appendChild(sec);
    $$('tr[data-tr]', sec).forEach((tr) => { const t = ST.transcripciones.find((x) => x.id === tr.dataset.tr); $$('[data-tk]', tr).forEach((i) => (i.onchange = () => { const k = i.dataset.tk; t[k] = i.type === 'checkbox' ? i.checked : i.value; if (k === 'momento' && t.momento === 'intervencion' && !t.extraido) extraerIntervencion(t); if (k === 'sesion') { t.extraido = null; extraerIntervencion(t); } guardar(); render(); })); });
    $('#ivReap', sec).onclick = () => { const r = []; let n = 0; deMomento('primera').forEach((t) => (n += aSintomas(t))); if (n) r.push(pl(n, 'síntoma nuevo', 'síntomas nuevos')); const c = aConstantes(false); if (c) r.push(pl(c, 'constante', 'constantes') + ' por el lenguaje'); const g = responderGuion(); r.push(`${g.n} preguntas con respuesta, ${g.sin.length} sin respuesta`); guardar(); render(); toast(r.join('; ') + '.'); };
    const ei = $('#ivExtInt', sec); if (ei) ei.onclick = () => { const r = deMomento('intervencion').map((t) => extraerIntervencion(t)); guardar(); render(); toast(r.map((x) => `sesión del ${fCorta(x.s.fecha)}: ${pl(x.acuerdos, 'acuerdo', 'acuerdos')}`).join('; ') + '.'); };
  };

  /* ---------- Vista: guion con las respuestas de la transcripción ---------- */
  const guion0 = VISTAS.guion;
  VISTAS.guion = (host) => {
    guion0(host);
    const ST = S(), s = ST.sesion, R = s.respuestas || {}, sin = s.sinRespuesta || [], hay = deMomento('primera').length;
    if (!hay && !Object.keys(R).length) return;
    const nPreg = D.GUION.reduce((a, b) => a + b.p.length, 0), con = Object.keys(R).length;
    const card = document.createElement('section'); card.className = 'glass pad stack iv-desde';
    const qtext = (k) => { const [b, i] = k.split(':'); const bl = D.GUION.find((x) => x.id === b); return bl ? bl.p[+i].q : k; };
    card.innerHTML = `<div class="row"><div><div class="eyebrow">Respuestas desde la transcripción</div><small class="muted">${con} de ${nPreg} preguntas con respuesta en ${pl(hay, 'transcripción', 'transcripciones')} de primera sesión. Las respuestas se escriben en las notas de cada pregunta (marcadas «De la transcripción») y puedes corregirlas.</small></div><span class="spacer"></span><button class="btn small" id="ivGRe">Volver a responder</button><button class="btn ghost small" id="ivGIA">Responder con Claude</button></div>
      ${sin.length ? `<div class="iv-sinr"><b>Sin respuesta en la transcripción (${sin.length}).</b> ¿Lo trabajaste antes con ellos o en otra conversación? Si es así, apúntalo; si no, pregúntalo en la próxima sesión.<ul>${sin.map((k) => `<li><a href="#" data-goq="${k}">${esc(qtext(k))}</a></li>`).join('')}</ul></div>` : '<p class="small" style="margin:0">Todas las preguntas tienen respuesta en la transcripción.</p>'}`;
    const first = host.querySelector(':scope > .glass'); if (first && first.nextSibling) host.insertBefore(card, first.nextSibling); else host.prepend(card);
    $$('.iv-preg > li', host).forEach((li) => { const k = li.dataset.q, r = R[k]; const tag = document.createElement('small'); if (r) { tag.className = 'iv-autot ' + r.conf; tag.textContent = `De la transcripción${r.origen === 'claude' ? ' · con Claude' : ''} · confianza ${r.conf}`; } else if (sin.includes(k)) { tag.className = 'iv-autot sin'; tag.textContent = 'Sin respuesta en la transcripción: ¿lo trabajaste antes con ellos?'; } else return; const oye = li.querySelector('.iv-oye'); (oye || li.firstChild).after(tag); });
    $$('[data-goq]', card).forEach((a) => (a.onclick = (e) => { e.preventDefault(); const li = host.querySelector(`.iv-preg > li[data-q="${a.dataset.goq}"]`); if (li) { li.scrollIntoView({ behavior: 'smooth', block: 'center' }); li.classList.add('iv-flash'); setTimeout(() => li.classList.remove('iv-flash'), 1600); const t = li.querySelector('[data-n]'); if (t) t.focus({ preventScroll: true }); } }));
    $('#ivGRe', card).onclick = () => { const r = responderGuion(); guardar(); render(); toast(`${r.n} preguntas con respuesta; ${r.sin.length} sin respuesta.`); };
    $('#ivGIA', card).onclick = async (e) => { e.target.disabled = true; e.target.textContent = 'Respondiendo…'; try { const n = await responderConClaude(); if (n == null) toast('Sin conexión con Claude: se mantienen las respuestas por reglas.'); else { guardar(); render(); toast(`${n} preguntas respondidas con Claude.`); } } catch (x) { toast('No se pudo: ' + x.message); } e.target.disabled = false; e.target.textContent = 'Responder con Claude'; };
  };

  /* ---------- Vista: constantes con la primera valoración por el lenguaje ---------- */
  const const0 = VISTAS.constantes;
  VISTAS.constantes = (host) => {
    const0(host);
    const ST = S(), c = conjunta('primera'), O = ST.cteOrigen || {};
    $$('.iv-cte', host).forEach((d) => { const id = d.dataset.c; if (O[id] === 'lenguaje' && cte(id)) { const t = document.createElement('small'); t.className = 'iv-autot media'; t.textContent = `Primera valoración por el lenguaje (${c ? 'media de ' + pl(c.n, 'transcripción', 'transcripciones') : 'transcripción'}): confírmala o corrígela`; d.querySelector('.row').appendChild(t); } $$('[data-v]', d).forEach((b) => b.addEventListener('click', () => { ST.cteOrigen = ST.cteOrigen || {}; ST.cteOrigen[id] = 'consultor'; guardar(); setTimeout(() => V.render(), 0); })); });
    if (c) { const box = document.createElement('div'); box.className = 'row iv-fil'; box.innerHTML = `<small class="muted">Lenguaje (media de ${pl(c.n, 'transcripción', 'transcripciones')}): ${D.CONSTANTES.map((k) => `${esc(k.n)} ${c.est[k.id] || '—'}`).join(' · ')}</small><span class="spacer"></span><button class="btn ghost small" id="ivCteL">Aplicar a todas</button>`; const sec = host.querySelector('.iv-cte'); if (sec) sec.before(box); $('#ivCteL', host).onclick = () => { aConstantes(true); guardar(); render(); toast('Constantes valoradas por el lenguaje: confírmalas una a una.'); }; }
  };

  /* ================= TRIAJE: DOCUMENTACIÓN DE LA CUENTA ================= */
  const loc = (k) => { try { return JSON.parse(localStorage.getItem(P() && P().k ? P().k(k) : k)); } catch (e) { return null; } };
  const cargar = async (clave, ls) => { let r = null; try { if (P() && P().loadData) r = await P().loadData(clave); } catch (e) { r = null; } return r || loc(ls); };
  const AREA_MOD = {}; D.AREAS.forEach((a) => (a.est || []).forEach((m) => { if (!AREA_MOD[m]) AREA_MOD[m] = a.id; }));
  const eur = (n) => Math.round(+n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
  const leerCuenta = async () => {
    const out = Object.fromEntries(D.AREAS.map((a) => [a.id, { datos: [], sintomas: [], docs: [] }])), fuentes = [];
    const add = (a, k, v, st) => out[a].datos.push({ k, v, st });
    const sint = (a, t, cita, grav, de) => out[a].sintomas.push({ t, cita, gravedad: grav, de });
    // Simulador: la foto económica
    const sim = await cargar('simulador', 'atalaya.v1'), e = sim && sim.empresa;
    if (e && !sim.ejemplo && num(e.ventas)) {
      fuentes.push('simulador');
      const ebitda = num(e.ventas) * num(e.margen) / 100 - num(e.personal) - num(e.fijos), de = ebitda > 0 ? (num(e.deudaViva) - num(e.caja)) / ebitda : null, mesCaja = (num(e.personal) + num(e.fijos)) / 12;
      add('fin', 'Facturación', eur(e.ventas)); add('fin', 'Margen bruto', num(e.margen) + ' %'); add('fin', 'EBITDA estimado', eur(ebitda), ebitda <= 0 ? 'stop' : ebitda / num(e.ventas) < 0.05 ? 'warn' : 'ok');
      if (num(e.deudaViva)) add('fin', 'Deuda / EBITDA', de == null ? '—' : de.toFixed(1).replace('.', ',') + ' veces', de == null || de > 4 ? 'stop' : de > 3 ? 'warn' : 'ok');
      if (num(e.caja) && mesCaja) add('fin', 'Caja', `${eur(e.caja)} · ${(num(e.caja) / mesCaja).toFixed(1).replace('.', ',')} meses de costes`, num(e.caja) < mesCaja ? 'stop' : num(e.caja) < 2 * mesCaja ? 'warn' : 'ok');
      if (num(e.plantilla)) add('per', 'Plantilla (simulador)', num(e.plantilla) + ' personas');
      if (ebitda <= 0) sint('fin', 'El negocio no genera EBITDA positivo', `EBITDA estimado ${eur(ebitda)}`, 5, 'Simulador');
      else if (de != null && de > 3) sint('fin', 'Cargas financieras que el negocio no genera', `Deuda neta de ${de.toFixed(1).replace('.', ',')} veces el EBITDA`, de > 4 ? 5 : 4, 'Simulador');
      if (num(e.caja) && mesCaja && num(e.caja) < mesCaja) sint('fin', 'Tesorería por debajo de un mes de costes', `Caja de ${eur(e.caja)} frente a ${eur(mesCaja)} al mes`, 4, 'Simulador');
    }
    // Sistema estratégico: clientes, documentos y módulos
    const est = await cargar('estrategia', 'atalaya.estrategia.v1');
    const com = est && est.comercial;
    if (com && !com.ejemplo && Array.isArray(com.clientes) && com.clientes.length) {
      fuentes.push('sistema estratégico · clientes');
      const cl = com.clientes.filter((c) => num(c.ventas)).sort((a, b) => num(b.ventas) - num(a.ventas)), tot = cl.reduce((a, c) => a + num(c.ventas), 0) || 1, p1 = num(cl[0].ventas) / tot * 100, p3 = cl.slice(0, 3).reduce((a, c) => a + num(c.ventas), 0) / tot * 100;
      const bajos = cl.filter((c) => num(c.ventas) && (num(c.ventas) - num(c.costeVariable)) / num(c.ventas) < 0.1), dias = cl.reduce((a, c) => a + num(c.dias) * num(c.ventas), 0) / tot;
      add('com', 'Clientes', String(cl.length)); add('com', 'Peso del primer cliente', Math.round(p1) + ' %', p1 > 30 ? 'stop' : p1 > 20 ? 'warn' : 'ok'); add('com', 'Peso de los tres primeros', Math.round(p3) + ' %', p3 > 60 ? 'stop' : p3 > 45 ? 'warn' : 'ok');
      if (bajos.length) add('com', 'Clientes con margen < 10 %', String(bajos.length), bajos.length > 2 ? 'stop' : 'warn');
      if (dias) add('fin', 'Días medios de cobro (ponderados)', Math.round(dias) + ' días', dias > 90 ? 'stop' : dias > 60 ? 'warn' : 'ok');
      if (p1 > 20) sint('com', 'Dependencia de pocos clientes', `${cl[0].nombre} pesa el ${Math.round(p1)} % de la venta; los tres primeros, el ${Math.round(p3)} %`, p1 > 30 ? 4 : 3, 'Sistema estratégico · clientes');
      if (bajos.length) sint('com', 'Clientes que apenas dejan margen', `${bajos.slice(0, 3).map((c) => c.nombre).join(', ')}${bajos.length > 3 ? '…' : ''}: margen de contribución por debajo del 10 %`, 3, 'Sistema estratégico · clientes');
      if (dias > 75) sint('fin', 'Cobros lentos que tensan la caja', `Plazo medio de cobro ponderado de ${Math.round(dias)} días`, 3, 'Sistema estratégico · clientes');
    }
    const inv = est && est.inversores && Array.isArray(est.inversores.lista) ? est.inversores.lista : [];
    if (inv.length) { const tot = inv.reduce((a, x) => a + num(x.aportacion), 0); fuentes.push('inversores'); add('fin', 'Inversores (acreedores, no plantilla)', `${inv.length} · ${Math.round(tot).toLocaleString('es-ES')} € aportados`); const r = inv.filter((x) => x.rentabilidad != null && num(x.rentabilidad)); if (r.length) add('fin', 'Rentabilidad pactada media con inversores', (Math.round(r.reduce((a, x) => a + num(x.rentabilidad), 0) / r.length * 10) / 10).toLocaleString('es-ES') + ' %'); }
    const docs = (est && est.origen && Array.isArray(est.origen.docs)) ? est.origen.docs : [];
    if (docs.length) fuentes.push(pl(docs.length, 'documento subido', 'documentos subidos'));
    docs.forEach((d) => {
      const areas = [...new Set((d.temas || []).map((m) => AREA_MOD[m]).filter(Boolean))]; const txt = String(d.texto || '');
      const fr = frasesDe(txt).slice(0, 600);
      // Señales del documento: frases que encajan con causas tipo (con su cita)
      const vistas = new Set();
      // Una frase sobre inversores (acreedores) no es una señal de personas y equipos (trabajadores con nómina)
      D.CAUSAS.forEach((c) => { const f = fr.find((x) => c.k.filter((k) => norm(x).includes(norm(k))).length >= 2 && !(c.area === 'per' && E.rolDe && E.rolDe(x) === 'inversor')); if (f && !vistas.has(f) && out[c.area].sintomas.filter((s) => s.de === d.nombre).length < 3) { vistas.add(f); sint(c.area, c.n, f.length > 200 ? f.slice(0, 197) + '…' : f, 3, d.nombre); } });
      (areas.length ? areas : [...new Set(D.CAUSAS.filter((c) => fr.some((x) => c.k.some((k) => norm(x).includes(norm(k))))).map((c) => c.area))].slice(0, 2)).forEach((a) => out[a].docs.push({ n: d.nombre, fecha: d.fecha, chars: d.chars }));
    });
    // Personas y equipos
    if (!P() || !P().puede || P().puede('personas')) {
      const per = await cargar('personas', 'atalaya.personas.v1');
      if (per && Array.isArray(per.personas) && per.personas.length) {
        fuentes.push('personas y equipos');
        const ps = per.personas, pu = per.puestos || [], sinPuesto = ps.filter((p) => !p.puesto && !p.puestoId), sinTit = pu.filter((x) => !ps.some((p) => p.puesto === x.id || p.puestoId === x.id || p.puesto === x.nombre));
        add('per', 'Trabajadores (plantilla con nómina)', String(ps.length)); add('per', 'Puestos definidos', String(pu.length), pu.length ? 'ok' : 'warn'); if (per.equipos) add('per', 'Equipos', String((per.equipos || []).length));
        if (sinPuesto.length) { add('per', 'Personas sin puesto', String(sinPuesto.length), 'warn'); sint('per', 'Puestos sin definir y personas sin funciones', `${pl(sinPuesto.length, 'persona', 'personas')} sin puesto asignado (${sinPuesto.slice(0, 3).map((p) => p.nombre).join(', ')})`, 3, 'Personas y equipos'); }
        if (sinTit.length && pu.length) add('per', 'Puestos sin titular', String(sinTit.length), 'warn');
      }
    }
    // Lo que ya marca la nota de cada mundo (en rojo o ámbar)
    if (A.nota && A.nota.calcular) { try { const u = await A.nota.calcular(); Object.keys(u.mundos || {}).forEach((k) => { if (k === 'intervencion') return; (u.mundos[k].puntos || []).filter((x) => x.st === 'stop').slice(0, 8).forEach((x) => { const a = k === 'simulador' ? 'fin' : k === 'personas' ? 'per' : k === 'mesa' ? 'tie' : AREA_MOD[x.zona] || 'inf'; if (!out[a].datos.some((d) => d.k === x.t)) out[a].datos.push({ k: x.t, v: u.mundos[k].n, st: 'stop' }); }); }); if (Object.keys(u.mundos || {}).length) fuentes.push('notas de los mundos'); } catch (x) { /* sin nota */ } }
    return { out, fuentes, fecha: new Date().toISOString() };
  };
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; };
  let cuenta = null;
  const meterEnTriaje = (sel) => {
    const ST = S(), ya = new Set(ST.sintomas.map((s) => norm(s.cita || s.t))); let n = 0;
    D.AREAS.forEach((a) => {
      const o = cuenta.out[a.id];
      o.sintomas.forEach((s, i) => { if (sel && !sel.has(a.id + ':' + i)) return; if (ya.has(norm(s.cita))) return; ya.add(norm(s.cita)); ST.sintomas.push({ id: uid(), t: s.t, cita: s.cita, area: a.id, patron: '', gravedad: s.gravedad, origen: 'documentacion', de: s.de }); n++; });
      if (o.datos.length) { ST.areas[a.id] = ST.areas[a.id] || {}; const linea = 'Datos de la cuenta: ' + o.datos.map((d) => d.k + ' ' + d.v).join(' · ') + (o.docs.length ? ' · Documentos: ' + o.docs.map((d) => d.n).join(', ') : ''); const nota = (ST.areas[a.id].nota || '').replace(/Datos de la cuenta:[^\n]*/g, '').trim(); ST.areas[a.id].nota = (nota ? nota + '\n' : '') + linea; }
    });
    ST.cuentaLeida = { fecha: cuenta.fecha, fuentes: cuenta.fuentes };
    guardar(); return n;
  };
  const triaje0 = VISTAS.triaje;
  VISTAS.triaje = (host) => {
    triaje0(host);
    tarjetaDatos(host);
    const ST = S(), sec = document.createElement('section'); sec.className = 'glass pad stack iv-doccta';
    const pinta = () => {
      const c = cuenta;
      sec.innerHTML = `<div class="row"><div><div class="eyebrow">Documentación de la cuenta</div><small class="muted">Lo que ya está en los otros mundos de esta empresa (simulador, sistema estratégico con sus clientes y documentos subidos, personas y equipos, y lo que marcan en rojo sus notas), ordenado por áreas. Las señales se meten en el triaje como síntomas con su dato y el resumen va a la nota de cada área.</small></div><span class="spacer"></span><button class="btn ${c ? 'ghost' : 'solid'} small" id="ivCta">${c ? 'Volver a leer' : 'Leer la documentación de la cuenta'}</button></div>
        ${c ? `<small class="muted">Fuentes: ${esc(c.fuentes.join(' · ') || 'ninguna con datos reales todavía')}${ST.cuentaLeida ? ' · última vez metida en el triaje: ' + fLarga(ST.cuentaLeida.fecha.slice(0, 10)) : ''}</small>
          <div class="iv-areas">${D.AREAS.map((a) => { const o = c.out[a.id]; if (!o.datos.length && !o.sintomas.length && !o.docs.length) return ''; return `<div class="iv-area" style="--c:${a.c}"><b>${esc(a.n)}</b>${o.datos.length ? `<ul class="iv-dl">${o.datos.map((d) => `<li class="${d.st || ''}"><span>${esc(d.k)}</span><b>${esc(d.v)}</b></li>`).join('')}</ul>` : ''}${o.docs.length ? `<small class="muted">Documentos: ${o.docs.map((d) => esc(d.n)).join(', ')}</small>` : ''}${o.sintomas.length ? `<ul class="iv-sug">${o.sintomas.map((s, i) => `<li><label><input type="checkbox" data-cs="${a.id}:${i}" ${ST.sintomas.some((x) => norm(x.cita) === norm(s.cita)) ? 'disabled' : 'checked'}><span><b>${esc(s.t)}</b><small>«${esc(s.cita)}» · ${esc(s.de)}</small></span></label></li>`).join('')}</ul>` : ''}</div>`; }).join('') || '<p class="small muted">Esta empresa aún no tiene datos reales en los otros mundos.</p>'}</div>
          <div class="row"><button class="btn solid small" id="ivCtaM">Meter en el triaje</button><small class="muted">Añade las señales marcadas como síntomas y escribe los datos en la nota de cada área.</small></div>` : ''}`;
      $('#ivCta', sec).onclick = async (e) => { e.target.disabled = true; e.target.textContent = 'Leyendo…'; try { cuenta = await leerCuenta(); } catch (x) { toast(x.message); } pinta(); };
      const m = $('#ivCtaM', sec); if (m) m.onclick = () => { const sel = new Set($$('[data-cs]', sec).filter((x) => x.checked && !x.disabled).map((x) => x.dataset.cs)); const n = meterEnTriaje(sel); render(); toast(`${pl(n, 'síntoma de la documentación', 'síntomas de la documentación')} en el triaje y datos en la nota de cada área.`); };
    };
    pinta();
    const ancla = host.querySelector(':scope > .glass'); if (ancla && ancla.nextSibling) host.insertBefore(sec, ancla.nextSibling); else host.appendChild(sec);
  };

  /* ================= PLAN Y SESIONES DESDE LOS OBJETIVOS ================= */
  const puntoDe = (o) => `${o.n} · ${o.t}${o.ind ? ` — revisar ${o.ind}${o.actual || o.valor ? ` (hoy ${o.actual || '?'} → meta ${o.valor || '?'} ${o.unidad || ''})` : ''}` : ''}${o.peso ? ` — tramo alcanzado y evidencias (${o.peso} % del variable)` : ''}`;
  const avancesDe = (oid) => S().sesiones.flatMap((s) => (s.avances || []).filter((a) => a.oid === oid).map((a) => Object.assign({ fecha: s.fecha }, a))).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const prepararSesiones = (n) => {
    const ST = S(), objs = objetivosVivos(), fut = ST.sesiones.filter((s) => s.fecha >= hoy() && s.tipo !== 'contacto').slice(0, n || 4); let k = 0;
    fut.forEach((s) => { s.puntos = s.puntos || []; objs.forEach((o) => { const t = puntoDe(o); if (!s.puntos.some((p) => p.oid === o.id)) { s.puntos.push({ t, oid: o.id }); k++; } }); const pend = (s.acuerdosPrevios = ST.sesiones.filter((x) => x.fecha < s.fecha).flatMap((x) => (x.acuerdos || []).filter((a) => a.t && !a.hecho)).slice(-5).map((a) => a.t)); pend.forEach((t) => { if (!s.puntos.some((p) => p.t === 'Acuerdo pendiente: ' + t)) { s.puntos.push({ t: 'Acuerdo pendiente: ' + t }); k++; } }); });
    guardar(); return { k, ses: fut.length };
  };
  const plan0 = VISTAS.plan;
  VISTAS.plan = (host) => {
    plan0(host);
    const objs = objetivosVivos(); if (!objs.length) return;
    const sec = document.createElement('section'); sec.className = 'glass pad stack';
    sec.innerHTML = `<div class="row"><div><div class="eyebrow">Seguimiento de los objetivos</div><small class="muted">Los objetivos que se pusieron encima de la mesa guían las sesiones: su revisión entra en el orden del día y los avances salen de las transcripciones de intervención.</small></div><span class="spacer"></span><button class="btn small" id="ivPrepS">Preparar el orden del día de las próximas sesiones</button></div>
      <ul class="iv-hr">${objs.map((o) => { const av = avancesDe(o.id); return `<li><div class="row"><b>${esc(o.n)} · ${esc(o.t)}</b><span class="spacer"></span><small class="muted">${o.ind ? esc(o.ind) + (o.actual || o.valor ? ` · ${esc(o.actual || '?')} → ${esc(o.valor || '?')} ${esc(o.unidad || '')}` : '') : o.peso ? o.peso + ' % del variable' : ''}</small></div>${av.length ? `<small><b>Último avance (${fCorta(av[0].fecha)}):</b> «${esc(av[0].texto.slice(0, 220))}»</small>` : '<small class="muted">Sin avances registrados todavía.</small>'}</li>`; }).join('')}</ul>`;
    const nav = host.querySelector(':scope > .glass:last-of-type'); host.appendChild(sec);
    $('#ivPrepS', sec).onclick = () => { const r = prepararSesiones(4); if (!r.ses) return toast('No hay sesiones futuras: genéralas en «Sesiones y seguimiento».'); render(); toast(`${pl(r.k, 'punto añadido', 'puntos añadidos')} al orden del día de ${pl(r.ses, 'sesión', 'sesiones')}.`); };
  };
  const ses0 = VISTAS.sesiones;
  VISTAS.sesiones = (host) => {
    ses0(host);
    const ST = S(), sel = ST.sesiones.find((x) => x.id === V.int.get('sesSel')) || ST.sesiones.find((x) => x.fecha >= hoy()) || ST.sesiones[0]; if (!sel) return;
    const objs = objetivosVivos(), trs = ST.transcripciones.filter((t) => t.sesion === sel.id);
    const sec = document.createElement('section'); sec.className = 'glass pad stack';
    sec.innerHTML = `<div class="row"><div><div class="eyebrow">Sesión del ${fLarga(sel.fecha)} · desde los objetivos y las transcripciones</div></div><span class="spacer"></span>${objs.length ? '<button class="btn small" id="ivSObj">Añadir la revisión de los objetivos</button>' : ''}</div>
      <div><b class="small">Orden del día añadido</b>${(sel.puntos || []).length ? `<ul class="small iv-pts">${sel.puntos.map((p, i) => `<li>${esc(p.t)} <button class="icon-btn" data-pd="${i}" aria-label="Quitar">×</button></li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">Sin puntos añadidos. Añade la revisión de los objetivos o prepara el orden del día desde el plan.</p>'}<div class="iv-add"><input class="input" id="ivSP" placeholder="Otro punto para el orden del día"><button class="btn ghost small" id="ivSPa">Añadir</button></div></div>
      ${(sel.avances || []).length ? `<div><b class="small">Avances de los objetivos</b><ul class="small iv-pts">${sel.avances.map((a) => `<li><b>${esc(a.n)}</b> · ${esc(a.t)}: «${esc(a.texto.slice(0, 260))}»</li>`).join('')}</ul></div>` : ''}
      <div><b class="small">Transcripciones de esta sesión</b> ${trs.length ? trs.map((t) => `<span class="chip">${esc(t.nombre)}</span>`).join(' ') + ' <button class="btn ghost small" id="ivSExt">Extraer de nuevo</button>' : '<span class="small muted">Ninguna. Súbela en «Escucha y transcripción» y márcala como sesión de intervención.</span>'}</div>`;
    host.appendChild(sec);
    const so = $('#ivSObj', sec); if (so) so.onclick = () => { sel.puntos = sel.puntos || []; let n = 0; objs.forEach((o) => { if (!sel.puntos.some((p) => p.oid === o.id)) { sel.puntos.push({ t: puntoDe(o), oid: o.id }); n++; } }); guardar(); render(); toast(`${pl(n, 'objetivo', 'objetivos')} en el orden del día.`); };
    $$('[data-pd]', sec).forEach((b) => (b.onclick = () => { sel.puntos.splice(+b.dataset.pd, 1); guardar(); render(); }));
    $('#ivSPa', sec).onclick = () => { const t = $('#ivSP', sec).value.trim(); if (!t) return; sel.puntos = sel.puntos || []; sel.puntos.push({ t }); guardar(); render(); };
    const se = $('#ivSExt', sec); if (se) se.onclick = () => { trs.forEach((t) => extraerIntervencion(t)); guardar(); render(); toast('Acta, acuerdos y avances actualizados.'); };
  };

  /* ================= INFORMES ================= */
  const I = () => A.informe;
  // Añade secciones al final de un informe existente, antes de su pie
  const ampliar = (k, extra) => { const o = V.informes[k]; V.informes[k] = (...a) => { const In = I(), op = In.open; In.open = (cfg) => { In.open = op; try { const h = extra(In); if (h) cfg.html = cfg.html.replace(/<footer class="rp-foot"/, h + '<footer class="rp-foot"'); } catch (e) { console.error(e); } return op(cfg); }; try { return o(...a); } finally { In.open = op; } }; };
  ampliar('primera', (In) => {
    const ST = S(), l = deMomento('primera'); if (!l.length) return '';
    const c = conjunta('primera'), s = ST.sesion, R = s.respuestas || {};
    let h = In.section('Lo que hemos escuchado en las sesiones', In.table(['Sesión', 'Fecha', 'Palabras del empresario', 'Huecos con cita'], l.map((t) => [t.nombre, fCorta(t.fecha), t.analisis ? t.analisis.palabras.toLocaleString('es-ES') : '—', t.analisis ? t.analisis.huecos.filter((x) => x.peso).length + ' de 7' : '—'])) + (c ? `<p>En conjunto, el empresario habla el ${Math.round(c.pctMedia)} % del tiempo y deja ver ${c.an.huecos.filter((x) => x.peso).length} de los siete huecos de definición; los que más se repiten: ${c.an.huecos.filter((x) => x.peso).sort((a, b) => b.peso - a.peso).slice(0, 3).map((x) => x.n.toLowerCase()).join(', ') || '—'}.</p>` : ''));
    const filas = D.GUION.flatMap((b) => b.p.map((p, i) => [p.q, R[b.id + ':' + i] ? R[b.id + ':' + i].t : (s.notas || {})[b.id + ':' + i] || '—'])).filter((x) => x[1] !== '—');
    if (filas.length) h += In.section('Sus respuestas', In.table(['Pregunta', 'Lo que dijo'], filas.slice(0, 24)));
    return h;
  });
  ampliar('guia', (In) => { const s = S().sesion; if (!(s.sinRespuesta || []).length) return ''; const q = (k) => { const [b, i] = k.split(':'); const bl = D.GUION.find((x) => x.id === b); return bl ? bl.p[+i].q : k; }; return In.section('Preguntas sin respuesta en la transcripción', `<p>Revisa si se trabajaron antes con ellos; si no, inclúyelas en la próxima sesión.</p><ul>${s.sinRespuesta.map((k) => `<li>☐ ${esc(q(k))}</li>`).join('')}</ul>`); });
  V.informes.seguimiento = () => {
    const In = I(); In.reset(); const ST = S(), pas = ST.sesiones.filter((s) => s.fecha <= hoy() && (s.acta || (s.acuerdos || []).length || (s.avances || []).length)), fut = ST.sesiones.filter((s) => s.fecha > hoy()).slice(0, 3), objs = objetivosVivos(), trs = deMomento('intervencion');
    ST.informes = ST.informes || {}; ST.informes.seguimiento = new Date().toISOString(); guardar();
    let h = In.cover({ empresa: empresa(), tipo: 'Auditoría integral', kicker: 'Seguimiento de la intervención', titulo: 'Dónde estamos y qué sigue', subtitulo: `${pl(pas.length, 'sesión', 'sesiones')} con acta · ${pl(trs.length, 'transcripción', 'transcripciones')} de intervención · ${pl(objs.length, 'objetivo', 'objetivos')}` });
    h += In.summary('En pocas palabras', `<p>${objs.length ? `Seguimos ${pl(objs.length, 'objetivo', 'objetivos')}: ${objs.map((o) => o.n + ' ' + o.t.toLowerCase()).join('; ')}.` : 'Aún no hay objetivos registrados.'} ${pas.length ? `En las sesiones se han cerrado ${pl(pas.reduce((a, s) => a + (s.acuerdos || []).length, 0), 'acuerdo', 'acuerdos')}.` : ''}</p>`);
    if (objs.length) h += In.section('Los objetivos y su avance', In.table(['Objetivo', 'Indicador', 'Último avance', 'Fecha'], objs.map((o) => { const av = avancesDe(o.id)[0]; return [o.n + ' · ' + o.t, o.ind ? `${o.ind}: ${o.actual || '?'} → ${o.valor || '?'} ${o.unidad || ''}` : o.peso ? o.peso + ' % del variable' : '—', av ? '«' + av.texto.slice(0, 200) + '»' : 'Sin avances registrados', av ? fCorta(av.fecha) : '—']; })));
    pas.forEach((s) => { h += In.section(`Sesión del ${fLarga(s.fecha)} · ${D.TIPOS_SESION[s.tipo] || s.tipo}`, (s.acta ? `<p style="white-space:pre-line">${esc(s.acta)}</p>` : '') + ((s.acuerdos || []).length ? In.table(['Acuerdo', 'Responsable', 'Fecha'], s.acuerdos.map((a) => [a.t, a.resp || '—', fCorta(a.fecha)])) : '') + ((s.avances || []).length ? In.table(['Objetivo', 'Avance'], s.avances.map((a) => [a.n + ' · ' + a.t, a.texto.slice(0, 260)])) : '')); });
    if (fut.length) h += In.section('Próximas sesiones', In.table(['Fecha', 'Sesión', 'Orden del día'], fut.map((s) => [fCorta(s.fecha) + (s.hora ? ' · ' + s.hora : ''), D.TIPOS_SESION[s.tipo] || s.tipo, ((s.puntos || []).map((p) => p.t).concat(s.obj ? [s.obj] : [])).slice(0, 6).join(' · ') || '—'])), 'Fechas orientativas: se confirman de una sesión a la siguiente.');
    h += In.foot('Informe de seguimiento de la intervención. Los avances proceden de las transcripciones y actas de las sesiones.');
    In.open({ titulo: 'Seguimiento · ' + empresa(), html: h, clave: 'iv:seguimiento' });
  };
  const inf0 = VISTAS.informes;
  VISTAS.informes = (host) => {
    inf0(host);
    const g = host.querySelector('.iv-four'); if (!g) return;
    const ST = S(), d = document.createElement('div'); d.className = 'glass pad stack iv-inf';
    d.innerHTML = `<div class="eyebrow">Para la empresa</div><h3 class="iv-bt">Informe de seguimiento</h3><p class="small" style="margin:0">Objetivos y su último avance, acta, acuerdos y avances de cada sesión de intervención (desde sus transcripciones) y el orden del día de las próximas sesiones.</p><div class="row"><button class="btn solid small" data-inf2="seguimiento">Abrir el informe</button>${ST.informes && ST.informes.seguimiento ? `<small class="muted">Último: ${new Date(ST.informes.seguimiento).toLocaleDateString('es-ES')}</small>` : ''}</div>`;
    g.appendChild(d); $('[data-inf2]', d).onclick = () => V.informes.seguimiento();
  };

  V.cruce = { procesar, aDatosReales, estadoDatos, conjunta, responderGuion, aConstantes, extraerIntervencion, leerCuenta, prepararSesiones, nuevaTr };
})();
