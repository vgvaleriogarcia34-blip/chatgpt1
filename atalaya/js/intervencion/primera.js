/* Atalaya 360° · Auditoría integral · Informe de la primera sesión, razonado
   · Solo lo dicho por la empresa: lo que dice el consultor no se toma como síntoma ni como respuesta.
   · Solo las transcripciones de la sesión (las de otras fechas o documentos previos no entran).
   · Cada síntoma es la carencia que delatan sus palabras, con la frase, de qué se hablaba y la fuente.
   · Cada área del triaje lleva su hipótesis de causa y el motivo de su prioridad (liquidez, rentabilidad,
     crecimiento y organización), no el número de síntomas.
   · Cada hipótesis se baja a tierra: qué quiere decir en esta empresa, en qué frases se apoya, cómo se
     comprobará y qué la descartaría.
   · Cada constante explica de dónde sale. Los objetivos llevan su plantilla SMART e hitos comprobables. */
(function () {
  const A = window.Atalaya, V = A.interv, E = A.intervEscucha;
  const { D, $, $$, esc, norm, uid, sumar, fCorta, fLarga, pl, guardar, toast, empresa, render, VISTAS, cte, ST_N, TRIAJE, causasOrdenadas, veinte, ruta, monitor, sugerirCausa, asegurarCausa, prioArea, PRIN_N, smartObj, fraseObj } = V.int;
  const S = () => V.int.st();
  const I = () => A.informe;
  const P = () => A.platform;

  /* ---------- Quién habla y de qué sesión ---------- */
  const clientesDe = (tr) => new Set(tr.clientes && tr.clientes.length ? tr.clientes : (tr.hablantes && tr.hablantes[0] ? [tr.hablantes[0].n] : []));
  const nombreConsultor = () => S().sesion.consultor || (P() && P().user && P().user.nombre) || '';
  const deSesion = () => {
    const l = S().transcripciones.filter((t) => (t.momento || 'primera') === 'primera' && t.usar !== false); if (!l.length) return [];
    const f = S().sesion.fecha, mismo = l.filter((t) => t.fecha === f); if (mismo.length) return mismo;
    const u = l.map((t) => t.fecha || '').sort().pop(); return l.filter((t) => (t.fecha || '') === u);
  };
  const pregCorta = (t) => { const q = (String(t).match(/¿[^?]+\?/g) || []).pop() || String(t).split(/(?<=[.!?])\s/)[0]; return q.length > 120 ? q.slice(0, 117).replace(/\s\S*$/, '') + '…' : q; };
  // Dónde se dijo una frase: transcripción, si la dijo la empresa y a qué pregunta respondía
  const localizar = (cita) => {
    const k = norm(cita).replace(/[«»"…]/g, '').slice(0, 60).trim(); if (k.length < 8) return null;
    for (const tr of S().transcripciones) { const set = clientesDe(tr), tu = tr.turnos || [];
      for (let j = 0; j < tu.length; j++) if (norm(tu[j].t).includes(k)) { let q = ''; for (let i = j - 1; i >= 0 && i >= j - 3; i--) if (!set.has(tu[i].h)) { q = tu[i].t; break; } return { tr, j, cliente: set.has(tu[j].h), quien: tu[j].h, pregunta: q ? pregCorta(q) : '' }; } }
    return null;
  };
  const fuenteDe = (s) => { if (s.origen === 'documentacion') return s.de || 'Documentación de la cuenta'; const l = s.cita ? localizar(s.cita) : null; if (l) return `${l.tr.nombre}${l.tr.fecha ? ' · ' + fCorta(l.tr.fecha) : ''} · ${l.quien}`; return s.origen === 'transcripcion' ? 'Transcripción' : 'Notas del consultor en la sesión'; };
  const conContexto = (s) => { if (!s.cita) return '—'; const l = localizar(s.cita); return '«' + s.cita.replace(/^[«"]|[»"]$/g, '') + '»' + (l && l.pregunta ? ` (hablábamos de: ${l.pregunta})` : ''); };

  // Repasa las transcripciones: separa al consultor, quita lo que dijo él de los síntomas y redacta el síntoma como carencia
  const revisar = () => {
    const ST = S(); let cambio = false, quitados = 0;
    ST.transcripciones.forEach((tr) => {
      if (tr.clientesManual || !E.consultorDe) return;
      const cons = E.consultorDe(tr, nombreConsultor()); if (!cons) return;
      const cl = tr.hablantes.filter((h) => h.n !== cons).map((h) => h.n);
      if (JSON.stringify(cl) !== JSON.stringify(tr.clientes || [])) { tr.clientes = cl; tr.analisis = E.analizar({ turnos: tr.turnos, hablantes: tr.hablantes }, cl); cambio = true; }
    });
    const antes = ST.sintomas.length;
    ST.sintomas = ST.sintomas.filter((s) => { if (s.origen !== 'transcripcion' || !s.cita) return true; const l = localizar(s.cita); return !l || l.cliente; });
    quitados = antes - ST.sintomas.length;
    ST.sintomas.forEach((s) => { if (!s.cita || !s.patron) return; const t = norm(s.t).replace(/…$/, '').slice(0, 40); if (t && norm(s.cita).includes(t)) { const c = E.carencia(s.patron, s.cita); if (c) { s.t = c; cambio = true; } } });
    if (cambio && V.cruce) { try { V.cruce.responderGuion(); V.cruce.aConstantes(false); } catch (e) { /* sin cruce */ } }
    // Toda área con síntomas lleva su hipótesis de causa
    ST.sintomas.forEach((s) => { if (s.causa && ST.causas.some((c) => c.id === s.causa)) return; const ref = sugerirCausa(s); if (ref) { s.causa = asegurarCausa(ref).id; cambio = true; } });
    D.AREAS.forEach((a) => {
      const ss = ST.sintomas.filter((s) => s.area === a.id); if (!ss.length || ST.causas.some((c) => c.area === a.id && c.estado !== 'descartada')) return;
      const fr = {}; ss.forEach((s) => { if (s.patron) fr[s.patron] = (fr[s.patron] || 0) + 1; });
      const pat = Object.keys(fr).sort((x, y) => fr[y] - fr[x])[0];
      const ref = D.CAUSAS.find((c) => c.area === a.id && c.patron === pat) || D.CAUSAS.find((c) => c.area === a.id); if (!ref) return;
      const c = asegurarCausa(ref); ss.forEach((s) => { if (!s.causa) s.causa = c.id; }); cambio = true;
    });
    if (cambio || quitados) guardar();
    return { cambio, quitados };
  };

  /* ---------- Hipótesis bajadas a tierra ---------- */
  const UMBRAL = { 'el stock': 'punto de pedido y stock máximo por referencia', 'los pedidos': 'punto de pedido y cantidad mínima', 'los precios': 'margen mínimo por producto y por cliente', 'la inversión': 'criterio de inversión: plazo máximo de recuperación, caja mínima después de invertir y rentabilidad mínima exigida', 'la maquinaria': 'criterio de inversión y de renovación: plazo de recuperación, uso mínimo y coste de mantenimiento admisible', 'la caja': 'caja mínima y regla de cuándo se usa la póliza', 'los cobros': 'días máximos de cobro y cuándo se reclama o se corta el servicio', 'los plazos': 'plazo máximo de entrega y cuándo se avisa al cliente', 'la calidad': 'tasa de fallos admisible y cuándo se para la producción', 'las entregas': 'plazo de entrega comprometido y margen de retraso admisible', 'las decisiones': 'importe a partir del cual decide la dirección y no la persona que lo lleva' };
  const CAUSA_TXT = {
    'gob-mando': { q: 'Quien decide en el día a día no es quien tiene el poder formal (firma, administración) o una decisión se cambia después por otra persona.', no: 'Que el órgano de administración y quien decide coincidan y las decisiones no se revoquen.' },
    'gob-cuello': { q: 'No hay un segundo nivel que decida: las preguntas y las decisiones suben al empresario, que se convierte en el cuello de botella.', no: 'Que haya responsables que resuelven sin consultarle y su agenda no se vaya en operativa.' },
    'gob-rumbo': { q: 'No hay objetivos escritos ni alineados con lo que quiere la empresa: sin ese marco, cada decisión se toma sin criterio común.', no: 'Que existan objetivos escritos, conocidos por el equipo y revisados.' },
    'fin-margen': { q: 'Se vende y se trabaja, pero no se sabe con números qué cliente, producto u obra deja dinero y cuál lo pierde.', no: 'Que exista un margen por cliente y producto que se revise al menos cada trimestre.' },
    'fin-caja': { q: 'La tesorería no se prevé: se paga y se cobra según llega y la póliza tapa los huecos.', no: 'Que haya una previsión de caja a varias semanas que se cumple sin tirar de la póliza.' },
    'fin-carga': { q: 'La deuda y sus cuotas pesan más de lo que el negocio genera de forma recurrente.', no: 'Que el resultado operativo cubra con holgura las cuotas de la deuda.' },
    'com-concentracion': { q: 'Una parte grande de las ventas depende de pocos clientes, con el riesgo y la pérdida de poder de negociación que eso supone.', no: 'Que ningún cliente pese más del 20-25 % de las ventas.' },
    'com-precio': { q: 'Los precios no se revisan con un margen mínimo como referencia; se fijan por costumbre o por la competencia.', no: 'Que exista una política de precios con margen mínimo y revisiones periódicas.' },
    'com-proceso': { q: 'No hay un proceso comercial: las ventas llegan por inercia o boca a boca, sin seguimiento de ofertas.', no: 'Que haya embudo comercial, seguimiento de ofertas y responsable.' },
    'ope-metodo': { q: 'El cómo se hace el trabajo no está escrito: vive en la cabeza de algunas personas y se aprende por imitación.', no: 'Que los procesos clave estén escritos y se usen para formar y revisar.' },
    'ope-umbral': { q: 'No hay cifras escritas que digan cuándo actuar, pedir, parar o decir que no: se decide a ojo.', no: 'Que existan umbrales escritos y se respeten.' },
    'ope-capacidad': { q: 'La carga de trabajo supera la capacidad en algún punto del proceso y se tapa con horas extra.', no: 'Que la capacidad medida cubra la demanda sin horas extra continuas.' },
    'per-puestos': { q: 'Las funciones de cada puesto no están definidas: las personas hacen de todo y los mandos no saben qué decide cada uno.', no: 'Que haya fichas de puesto conocidas y firmadas.' },
    'per-clave': { q: 'Hay personas sin las que la empresa se para y nadie que pueda sustituirlas.', no: 'Que cada persona clave tenga un suplente formado.' },
    'per-clima': { q: 'Desmotivación, conflicto o rotación que restan capacidad y método.', no: 'Que la rotación y las bajas estén en niveles normales del sector.' },
    'inf-cuadro': { q: 'Las decisiones se toman de oído porque la información llega tarde (a final de año, por la gestoría) o no se lee.', no: 'Que haya un cuadro de mando que se lee cada semana o cada mes.' },
    'inf-comunicacion': { q: 'Lo importante se comunica por pasillo y mensajería, sin reuniones con acta ni acuerdos escritos.', no: 'Que existan reuniones con orden del día, acta y responsables.' },
    'tie-proyectos': { q: 'Hay proyectos abiertos sin fecha de cierre ni responsable, que se alargan y consumen tiempo y dinero.', no: 'Que cada proyecto tenga fecha, responsable y estado revisado.' },
    'tie-agenda': { q: 'La agenda del empresario se la come la operativa: no le queda tiempo para dirigir.', no: 'Que el empresario tenga tiempo reservado y respetado para dirigir.' },
    'leg-societario': { q: 'Socios, avales, poderes o herencia sin ordenar: un riesgo patrimonial o de bloqueo.', no: 'Que pactos, poderes y avales estén ordenados (con validación jurídica externa).' },
    'leg-cumplimiento': { q: 'Hay requerimientos, inspecciones o litigios con plazo que no se están gestionando.', no: 'Que cada expediente tenga responsable y fecha (con validación jurídica externa).' }
  };
  const PROY = /\b(proyecto|obra|nave|maquina|ampliacion|reforma|pagina web|la web|tienda|inversion|programa|erp|software|certificacion|furgoneta|camion|local|linea nueva|nueva linea|expansion|franquicia|exportar|exportacion)\w*/;
  const proyectos = () => {
    const out = []; deSesion().forEach((tr) => { const set = clientesDe(tr), tu = tr.turnos || [];
      tu.forEach((u, j) => { if (!set.has(u.h)) return; (String(u.t).match(/[^.!?]+[.!?]*/g) || []).forEach((fr) => { const nf = norm(fr), m = nf.match(PROY); if (!m || !/(pendiente|quiero|queremos|vamos a|tenemos que|cuando se pueda|ya veremos|nuev[oa]|proyecto|empezar|abrir|comprar|invertir|ampliar|montar|hacer la|hacer el)/.test(nf)) return;
        out.push({ tema: m[0], cita: fr.trim(), tr, pregunta: (() => { for (let i = j - 1; i >= 0 && i >= j - 3; i--) if (!set.has(tu[i].h)) return pregCorta(tu[i].t); return ''; })(), fecha: /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|20\d\d|semana que viene|el mes que viene)/.test(nf), resp: /(lo lleva|se encarga|responsable|encargad[oa] de)/.test(nf) }); }); }); });
    return out.slice(0, 10);
  };
  const enEstaEmpresa = (c, ss) => {
    const temas = [...new Set(ss.map((s) => E.temaDe(s.cita || s.t)).filter(Boolean))];
    if (!temas.length) return '';
    let t = `Se ha visto al hablar de ${temas.join(', ')}.`;
    if (c.patron === 'limite' || c.ref === 'ope-umbral' || c.ref === 'com-precio' || c.ref === 'fin-caja') { const u = temas.filter((x) => UMBRAL[x]); if (u.length) t += ` El umbral que falta («el stop») sería: ${u.map((x) => UMBRAL[x]).join('; ')}. Definirlo por escrito es lo que permitiría decir sí o no sin depender del criterio de cada momento.`; }
    return t;
  };

  /* ---------- Constantes: de dónde sale cada lectura ---------- */
  const LEX = () => ({ tension: [].concat(D.LEXICO.emocion.w, D.LEXICO.obligacion.w), temperatura: D.LEXICO.urgencia.w, dependencia: D.LEXICO.centralizacion.w,
    pulso: ['pagar', 'pagos', 'nominas', 'banco', 'poliza', 'cobrar', 'cobros', 'impago', 'caja', 'liquidez', 'deuda', 'prestamo', 'descubierto', 'justos'],
    respiracion: ['no llegamos', 'no damos abasto', 'horas extra', 'saturad', 'agotad', 'quemad', 'sobrecarga', 'faltan manos', 'no tengo gente', 'a tope', 'desbordad', 'no me da la vida'],
    reflejos: ['ya veremos', 'no se', 'depende', 'lo pensare', 'mas adelante', 'cuando se pueda', 'esperar', 'dudas', 'no me decido', 'lo dejamos', 'lo cambia', 'al final decido'] });
  const apoyos = (id) => {
    const ws = (LEX()[id] || []).map(norm), out = [], usadas = new Set();
    deSesion().forEach((tr) => { const set = clientesDe(tr), tu = tr.turnos || []; tu.forEach((u, j) => { if (!set.has(u.h)) return; (String(u.t).match(/[^.!?]+[.!?]*/g) || []).forEach((fr) => { const nf = norm(fr), w = ws.filter((x) => x !== 'solo' && nf.includes(x)); if (!w.length || (V.objSmart && V.objSmart.esContrato({ dice: fr }))) return; w.forEach((x) => usadas.add(x)); if (out.length < 3) { let q = ''; for (let i = j - 1; i >= 0 && i >= j - 3; i--) if (!set.has(tu[i].h)) { q = pregCorta(tu[i].t); break; } out.push({ cita: fr.trim(), tr, pregunta: q }); } }); }); });
    return { citas: out, palabras: [...usadas] };
  };
  const razonConstante = (c) => {
    const v = cte(c.id), O = S().cteOrigen || {}; if (!v) return 'Sin tomar: se valorará en la próxima sesión.';
    const ap = apoyos(c.id), orig = O[c.id] === 'lenguaje' ? `Primera valoración por el lenguaje de la sesión${ap.palabras.length ? `: el empresario usa expresiones como ${ap.palabras.slice(0, 5).map((w) => '«' + w + '»').join(', ')}` : ''}; queda por confirmar con él.` : 'Valorada por el consultor con lo observado y escuchado en la sesión.';
    const ej = ap.citas.slice(0, 2).map((x) => `«${x.cita}» (${x.tr.nombre}${x.pregunta ? `; a la pregunta «${x.pregunta}»` : ''})`).join(' · ');
    return `${orig}${ej ? ' Lo respalda: ' + ej + '.' : ' No hay frases en la transcripción que lo respalden: conviene contrastarlo en la próxima sesión.'}`;
  };

  /* ---------- Hitos de los objetivos ---------- */
  const HITOS = {
    horas: ['Listar las tareas que hoy hace él y decidir cuáles delega', 'Nombrar a quién delega cada bloque de tareas', 'Reservar en la agenda el tiempo de dirección y de venta', 'Medir las horas en operativa: mitad del camino', 'Meta de horas alcanzada y sostenida durante un mes'],
    beneficio: ['Calcular el margen real por cliente y producto', 'Decidir los precios y costes que se corrigen', 'Aplicar los cambios de precio y de coste', 'Cierre trimestral con el beneficio sobre ventas', 'Meta de beneficio alcanzada en el cierre'],
    cobros: ['Listar clientes por días de cobro y deuda vencida', 'Fijar por escrito las nuevas condiciones de cobro', 'Seguimiento semanal de vencidos con responsable', 'Plazo medio de cobro a mitad del camino', 'Plazo medio de cobro en la meta'],
    equipo: ['Escribir las fichas de puesto de los responsables', 'Nombrar y comunicar a los responsables', 'Delegar las decisiones del día a día con límites', 'Revisión: decisiones que ya no suben al empresario'],
    caja: ['Previsión de tesorería a 13 semanas', 'Fijar la caja mínima y la regla de uso de la póliza', 'Revisión semanal de la previsión', 'Un trimestre sin disponer de la póliza'],
    ventas: ['Plan comercial con clientes objetivo', 'Agenda comercial semanal del empresario', 'Seguimiento de ofertas y conversión', 'Ventas a mitad del camino', 'Meta de ventas alcanzada'],
    procesos: ['Elegir los 3 procesos clave', 'Escribir el primero con quien lo hace', 'Formar al equipo y aplicarlo', 'Revisar y escribir los siguientes'],
    gobierno: ['Escribir qué se decide en el día, en el mes y en dirección', 'Conversación con la familia o los socios', 'Firmar el acuerdo de gobierno', 'Primera reunión de dirección con acta'],
    personal: ['Decidir las semanas de descanso del año', 'Dejar cubiertas sus funciones durante la ausencia', 'Primera semana sin llamadas', 'Revisión: qué falló y qué se corrige']
  };
  const proponerHitos = (o) => {
    const ts = HITOS[o.tema] || ['Escribir la situación de partida y el indicador de hoy', 'Primera acción con responsable', 'Revisión intermedia del indicador', 'Meta alcanzada y comprobada'];
    const ini = S().sesion.fecha || V.int.hoy(), fin = o.fecha || sumar(ini, 180), dias = Math.max(ts.length * 7, Math.round((new Date(fin) - new Date(ini)) / 864e5));
    return ts.map((t, i) => ({ id: uid(), t, fecha: sumar(ini, Math.round(dias * (i + 1) / ts.length)), resp: o.responsable || 'Empresario', hecho: '' }));
  };
  const estadoHito = (h) => (h.hecho ? 'ok' : h.fecha && h.fecha < V.int.hoy() ? 'stop' : 'warn');
  const EST_H = { ok: 'Hecho', stop: 'Fuera de plazo', warn: 'En plazo' };

  /* ---------- El informe de la primera sesión ---------- */
  V.informes.primera = () => {
    const In = I(); In.reset(); revisar();
    const ST = S(); ST.informes = ST.informes || {}; ST.informes.primera = new Date().toISOString(); guardar();
    const trs = deSesion(), ids = new Set(trs.map((t) => t.id)), otras = ST.transcripciones.filter((t) => !ids.has(t.id));
    const sesionSint = ST.sintomas.filter((s) => { if (s.origen === 'documentacion') return false; if (s.origen !== 'transcripcion') return true; if (s.tr) return ids.has(s.tr); const l = s.cita ? localizar(s.cita) : null; return !l || ids.has(l.tr.id); });
    const r = ruta(), l = causasOrdenadas(), v20 = veinte();
    const cita = (sesionSint.find((s) => s.cita && s.cita.split(' ').length > 6) || {}).cita;
    let h = In.cover({ empresa: empresa(), tipo: 'Auditoría integral', kicker: 'Primera sesión', titulo: 'Lo que hemos escuchado', subtitulo: `Sesión del ${fLarga(ST.sesion.fecha)}${ST.sesion.asistentes ? ' · ' + ST.sesion.asistentes : ''}${trs.length ? ' · ' + pl(trs.length, 'transcripción', 'transcripciones') : ''}` });
    const top = r[0];
    h += In.summary('En pocas palabras', `${cita ? `<p><i>«${esc(cita)}»</i></p>` : ''}<p>De la sesión salen ${pl(sesionSint.length, 'síntoma', 'síntomas')} en ${pl(r.length, 'área', 'áreas')}, con ${pl(l.length, 'hipótesis de causa', 'hipótesis de causa')}. ${top ? `Empezamos por <b>${esc(top.a.n.toLowerCase())}</b> (${esc(TRIAJE[top.n] ? TRIAJE[top.n].n.toLowerCase() : 'sin triaje')}) porque es un tema de ${esc(PRIN_N[top.pr.p].toLowerCase().replace(': ', ' (') + ')')}${top.pr.motivo.length > 1 ? ', con ' + esc(top.pr.motivo.slice(1).join(' y ').toLowerCase()) : ''}.` : ''} El orden no sale del número de síntomas sino de los principios de la empresa: primero la liquidez, después la rentabilidad, después el crecimiento, con la organización como base de las tres.</p>`);
    // 1. Objetivos
    const so = V.objSmart ? V.objSmart.seccion(In) : ''; if (so) h += In.section('Sus objetivos', so, 'Lo que usted quiere conseguir para la empresa, en objetivos SMART: específicos, medibles, que dependen de usted, rentables y con fecha. Solo figuran como objetivos los que cumplen las cinco condiciones.');
    // 2. Constantes razonadas
    h += In.section('Las constantes de la empresa', `<div class="pdf-keep" style="max-width:560px;margin:0 0 10px">${monitor()}</div>` + In.table(['Constante', 'Lectura', 'Estado', 'De dónde sale'], D.CONSTANTES.map((c) => [c.n + ' · ' + c.q.toLowerCase(), cte(c.id) ? cte(c.id) + '/5 · ' + c.e[cte(c.id) - 1] : 'Sin tomar', cte(c.id) ? { h: In.pill(D.nivelConst(cte(c.id)), ST_N[D.nivelConst(cte(c.id))]) } : '—', razonConstante(c)])), 'Como en una consulta: cada línea es una constante (1 = bien, 5 = grave). Al lado, de dónde sale la lectura y la frase que la respalda.');
    // 3. Lo que hemos escuchado: síntoma (carencia), sus palabras con contexto, fuente y área
    if (sesionSint.length) h += In.section('Lo que hemos escuchado', In.table(['Síntoma', 'Sus palabras (y de qué hablábamos)', 'Fuente', 'Área'], sesionSint.slice(0, 24).map((s) => [s.t, conContexto(s), fuenteDe(s), (D.area(s.area) || {}).n || ''])), 'El síntoma es la carencia que delatan sus palabras; la frase es la prueba. Solo se recoge lo que dijo la empresa, no lo que dijo el consultor.');
    // 4. Lo más significativo
    const sig = []; r.forEach((x) => { const s = x.ss.filter((y) => sesionSint.includes(y)).sort((a, b) => (+b.gravedad || 3) - (+a.gravedad || 3))[0]; if (s && sig.length < 5) sig.push(s); });
    if (sig.length) h += In.section('Lo más significativo', sig.map((s) => { const p = s.patron ? D.patron(s.patron) : null, lc = s.cita ? localizar(s.cita) : null; return `<div class="pdf-keep" style="margin:0 0 10px;padding:8px 10px;border-left:3px solid #c48a00;background:#faf9f5"><b>${esc(s.t)}</b> · ${esc((D.area(s.area) || {}).n || '')}<br>${s.cita ? `<i>«${esc(s.cita)}»</i>${lc && lc.pregunta ? ` <span class="rp-muted">(a la pregunta «${esc(lc.pregunta)}»)</span>` : ''}<br>` : ''}${p ? `<span>Qué nos dice: ${esc(p.vacio)}</span><br><span class="rp-muted">Lo que cuesta si sigue así: ${esc(p.cuesta)}</span>` : ''}</div>`; }).join(''), 'Un síntoma por área, el de más peso.');
    // 5. Triaje razonado
    if (r.length) {
      h += In.section('Triaje por áreas', In.table(['Área', 'Triaje', 'Por qué', 'Síntomas', 'Hipótesis de causa'], r.map((x) => { const ls = [...new Set(x.ss.map((s) => s.t))]; return [x.a.n, x.n ? { h: In.pill(x.n, TRIAJE[x.n].n) } : '—', x.pr.motivo.join(' · '), `${x.ss.length}: ${ls.slice(0, 4).join('; ')}${ls.length > 4 ? '…' : ''}`, x.cs.map((c) => c.t).join(' · ') || 'Por definir en la auditoría']; })), 'Urgencias: cerrar en 0-14 días. Preferente: este trimestre. Programable: sin urgencia.');
      const pares = []; r.forEach((x, i) => r.slice(i + 1).forEach((y) => { if (y.pr.o < x.pr.o && pares.length < 3) pares.push([x, y]); }));
      h += In.section('Por qué este orden', `<p>Las áreas se ordenan por los principios de la empresa, no por el número de síntomas: <b>1) liquidez</b> (que la empresa pueda pagar: caja, deuda, cobros y criterios de inversión), <b>2) rentabilidad</b> (que gane dinero con lo que hace: precios, margen y operaciones) y <b>3) crecimiento</b>; la <b>organización</b> (gobierno, personas, información y tiempo) es la base que sostiene las tres. Dentro de cada principio pesan la gravedad de lo escuchado, lo verificado y las constantes.</p><ol>${r.map((x) => `<li><b>${esc(x.a.n)}</b> · ${esc(x.n ? TRIAJE[x.n].n : '—')}: ${esc(x.pr.motivo.join('; '))}.</li>`).join('')}</ol>${pares.map(([x, y]) => `<p>${esc(y.a.n)} va por detrás de ${esc(x.a.n.toLowerCase())} aunque su principio va antes (${esc(PRIN_N[y.pr.p].split(':')[0].toLowerCase())}) porque su lectura es de ${esc(y.n ? TRIAJE[y.n].n.toLowerCase() : 'sin triaje')} frente a ${esc(x.n ? TRIAJE[x.n].n.toLowerCase() : '—')}: ${esc(y.pr.motivo.slice(1).join('; ') || 'tiene menos señales')}. ${esc(y.pr.p === 'liquidez' ? 'Si en la auditoría se confirma tensión de caja (pulso de 4 o más) o una desviación en la deuda o los cobros, pasa por delante.' : y.pr.p === 'rentabilidad' ? 'Si la auditoría confirma pérdida de margen o una desviación en sus datos, pasa por delante.' : 'Si la auditoría confirma que bloquea a las demás áreas, pasa por delante.')}</p>`).join('')}`);
    }
    // 6. Hipótesis bajadas a tierra
    if (l.length) h += In.section('Hipótesis de causa, razonadas', l.slice(0, 7).map((x) => {
      const c = x.c, t = CAUSA_TXT[c.ref] || {}, ss = x.ss.length ? x.ss : ST.sintomas.filter((s) => s.area === c.area), ver = (D.VERIFICA[c.area] || []).slice(0, 3), pr = c.ref === 'tie-proyectos' ? proyectos() : [];
      return `<div class="pdf-keep" style="margin:0 0 12px"><p style="margin:0 0 4px"><b>${v20.has(c.id) ? '★ ' : ''}${esc(c.t)}</b> · ${esc((D.area(c.area) || {}).n || '')} · ${esc(PRIN_N[prioArea(c.area).p].split(':')[0])}</p>`
        + (t.q ? `<p style="margin:0 0 4px">Qué queremos decir: ${esc(t.q)}</p>` : '')
        + (enEstaEmpresa(c, ss) ? `<p style="margin:0 0 4px">En esta empresa: ${esc(enEstaEmpresa(c, ss))}</p>` : '')
        + (ss.length ? `<p style="margin:0 0 2px">Por qué lo pensamos (fuentes):</p><ul style="margin:0 0 4px">${ss.slice(0, 4).map((s) => `<li>${esc(s.t)}: ${esc(conContexto(s))} — ${esc(fuenteDe(s))}</li>`).join('')}</ul>` : '')
        + (pr.length ? `<p style="margin:0 0 2px">Proyectos y temas que salieron en la sesión:</p>${In.table(['Proyecto o tema', 'Lo que dijo', 'Dónde', '¿Fecha?', '¿Responsable?'], pr.map((p) => [p.tema, '«' + p.cita + '»' + (p.pregunta ? ` (a la pregunta «${p.pregunta}»)` : ''), p.tr.nombre, p.fecha ? 'Sí' : 'No', p.resp ? 'Sí' : 'No']))}` : '')
        + `<p style="margin:0" class="rp-muted">Cómo lo comprobaremos: ${esc(ver.join('; ') || 'en la auditoría integral')}.${t.no ? ' Lo descartaría: ' + esc(t.no.charAt(0).toLowerCase() + t.no.slice(1)) : ''}</p></div>`;
    }).join(''), 'Son hipótesis de trabajo: cada una dice qué significa aquí, en qué frases se apoya y cómo se va a comprobar. Si los datos no la confirman, se descarta.');
    // 7. Por dónde empezar
    if (l.length) h += In.section('Por dónde empezar', In.table(['Causa', 'Principio', 'Por qué aquí', 'Prioridad'], l.slice(0, 8).map((x) => { const pa = prioArea(x.c.area); return [x.c.t, PRIN_N[pa.p].split(':')[0], `Explica ${pl(x.ss.length, 'síntoma', 'síntomas')}${x.ss.length ? ' (' + [...new Set(x.ss.map((s) => (D.area(s.area) || {}).n))].join(', ') + ')' : ''}; área en ${(TRIAJE[V.int.nivel(x.c.area)] || { n: 'sin triaje' }).n.toLowerCase()}${v20.has(x.c.id) ? '; está en el 20 % de causas que explica el 80 % de la gravedad' : ''}`, v20.has(x.c.id) ? { h: In.pill('stop', 'Primero') } : 'Después']; })), 'Primero lo que protege la liquidez, después la rentabilidad y después el crecimiento; entre causas del mismo principio, la que más explica con menos esfuerzo.');
    // 8. Siguiente paso
    const pedir = [...new Set(l.slice(0, 5).flatMap((x) => (D.VERIFICA[x.c.area] || []).slice(0, 2)))];
    h += In.section('Siguiente paso: la auditoría integral', `<p>En la auditoría integral comprobaremos estas hipótesis en el orden anterior: ${r.slice(0, 4).map((x) => x.a.n.toLowerCase()).join(', ') || 'las áreas de la empresa'}. Para prepararla necesitamos:</p><ul>${pedir.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>`);
    // 9. Plantilla de objetivos SMART con hitos
    const objs = (ST.objetivos || []).filter((o) => (o.dice || o.especifica) && !(V.objSmart && V.objSmart.esContrato(o)));
    const fila = (n, v) => [n, v || '______________________________'];
    h += In.section('Plantilla de objetivos SMART para la próxima sesión', objs.map((o, i) => { const sm = smartObj(o), hs = (o.hitos && o.hitos.length) ? o.hitos : proponerHitos(o); return `<div class="pdf-keep" style="margin:0 0 12px"><p style="margin:0 0 4px"><b>O${i + 1} · ${esc(o.especifica || o.dice)}</b> <span class="rp-muted">(${sm.map((y) => (y.ok ? '✓' : '☐') + ' ' + y.k).join('  ')})</span></p>${In.table(['Campo', 'Anotación'], [fila('Lo que quiere, con sus palabras', o.dice), fila('Qué hará él (verbo + qué)', o.especifica), fila('Indicador · hoy → meta · unidad', o.indicador ? `${o.indicador}: ${o.actual || '___'} → ${o.valor || '___'} ${o.unidad || ''}` : ''), fila('Fecha límite · responsable', o.fecha ? fLarga(o.fecha) + (o.responsable ? ' · ' + o.responsable : '') : ''), fila('¿Depende solo de él?', o.solo ? 'Sí' : '☐ Sí  ☐ No → reformular'), fila('Qué gana la empresa (con cifra)', o.beneficio), fila('Qué le cuesta', o.contras), fila('¿Compensa?', o.merece === 'si' ? 'Sí' : '☐ Sí  ☐ No')])}${In.table(['☐', 'Hito', 'Fecha', 'Responsable'], hs.map((x) => [x.hecho ? '☑' : '☐', x.t, x.fecha ? fCorta(x.fecha) : '___', x.resp || '___']))}</div>`; }).join('') + `<div class="pdf-keep"><p style="margin:0 0 4px"><b>Objetivo nuevo</b></p>${In.table(['Campo', 'Anotación'], ['Lo que quiere, con sus palabras', 'Qué hará él (verbo + qué)', 'Indicador · hoy → meta · unidad', 'Fecha límite · responsable', '¿Depende solo de él?', 'Qué gana la empresa (con cifra)', 'Qué le cuesta', '¿Compensa?', 'Hitos (qué, para cuándo, quién)'].map((n) => fila(n, '')))}</div>`, 'Para cerrar los objetivos con él: se completan los campos que faltan y cada objetivo se parte en hitos con fecha y responsable que se marcan en cada sesión de seguimiento.');
    // 10. Las transcripciones de la sesión y sus respuestas
    if (trs.length) {
      const c1 = V.cruce && V.cruce.conjunta ? V.cruce.conjunta('primera') : null, R = ST.sesion.respuestas || {};
      h += In.section('Las transcripciones de la sesión', In.table(['Transcripción', 'Fecha', 'Empresa', 'Consultor', 'Palabras de la empresa', 'Huecos con cita'], trs.map((t) => { const set = clientesDe(t); return [t.nombre, fCorta(t.fecha), [...set].join(', '), t.hablantes.filter((x) => !set.has(x.n)).map((x) => x.n).join(', ') || '—', t.analisis ? t.analisis.palabras.toLocaleString('es-ES') + ' · ' + t.analisis.pctCliente + ' %' : '—', t.analisis ? t.analisis.huecos.filter((x) => x.peso).length + ' de 7' : '—']; })) + (otras.length ? `<p class="rp-muted">No entran en este informe (son de otra fecha o documentación anterior): ${otras.map((t) => esc(t.nombre)).join(', ')}.</p>` : '') + (c1 && trs.length > 1 ? `<p>En conjunto, la empresa habla el ${Math.round(c1.pctMedia)} % del tiempo.</p>` : ''));
      const filas = D.GUION.flatMap((b) => b.p.map((p, i) => { const k = b.id + ':' + i, x = R[k]; return x && (!x.tr || ids.has(x.tr)) ? [p.q, x.t] : null; })).filter(Boolean);
      if (filas.length) h += In.section('Sus respuestas', In.table(['Pregunta', 'Lo que dijo la empresa'], filas.slice(0, 24)));
    }
    h += In.foot('Informe de la primera sesión de la auditoría integral. Las causas son hipótesis de trabajo hasta su verificación; las cuestiones jurídicas requieren validación externa.');
    In.open({ titulo: 'Primera sesión · ' + empresa(), html: h, clave: 'iv:primera' });
  };

  /* ---------- Seguimiento: los hitos de cada objetivo ---------- */
  const seg0 = V.informes.seguimiento;
  if (seg0) V.informes.seguimiento = () => {
    const In = I(), op = In.open;
    In.open = (cfg) => { In.open = op; const objs = (S().objetivos || []).filter((o) => (o.hitos || []).length);
      if (objs.length) { const sec = In.section('Hitos de los objetivos', objs.map((o, i) => `<p style="margin:6px 0 2px"><b>O${i + 1} · ${esc(o.especifica || o.dice)}</b> · ${o.hitos.filter((x) => x.hecho).length}/${o.hitos.length} hechos</p>` + In.table(['', 'Hito', 'Fecha', 'Responsable', 'Estado'], o.hitos.map((x) => [x.hecho ? '☑' : '☐', x.t, x.fecha ? fCorta(x.fecha) : '—', x.resp || '—', { h: In.pill(estadoHito(x), EST_H[estadoHito(x)]) }]))).join(''), 'Cada hito se marca en la sesión en que se comprueba: así se ve si la empresa avanza en tiempo y forma.'); cfg.html = cfg.html.replace(/<footer class="rp-foot"/, sec + '<footer class="rp-foot"'); }
      return op(cfg); };
    try { return seg0(); } finally { In.open = op; }
  };

  /* ---------- En el guion: hitos de cada objetivo con su casilla ---------- */
  const guion0 = VISTAS.guion;
  VISTAS.guion = (host) => {
    revisar();
    guion0(host);
    $$('.iv-obj', host).forEach((d) => {
      const o = (S().objetivos || []).find((x) => x.id === d.dataset.o); if (!o) return;
      const box = document.createElement('div'); box.className = 'iv-hitos stack';
      const pinta = () => {
        const hs = o.hitos || [];
        box.innerHTML = `<div class="row"><b class="small">5 · Hitos (lo que se comprueba en cada sesión)</b><span class="spacer"></span><button class="btn ghost small" data-hp>${hs.length ? 'Volver a proponer' : 'Proponer hitos'}</button><button class="btn ghost small" data-ha>Añadir hito</button></div>
          ${hs.map((x, i) => `<div class="row iv-hito ${estadoHito(x)}"><input type="checkbox" data-hh="${i}" ${x.hecho ? 'checked' : ''} aria-label="Hito cumplido"><input class="input" data-ht="${i}" value="${esc(x.t)}" style="flex:1 1 220px"><input class="input" type="date" data-hf="${i}" value="${esc(x.fecha || '')}"><input class="input" data-hr="${i}" value="${esc(x.resp || '')}" placeholder="Responsable" style="width:130px"><small class="muted">${EST_H[estadoHito(x)]}${x.hecho ? ' · ' + fCorta(x.hecho) : ''}</small><button class="icon-btn" data-hd="${i}" aria-label="Quitar el hito">×</button></div>`).join('') || '<small class="muted">Sin hitos: propónlos y ajústalos con él.</small>'}`;
        $('[data-hp]', box).onclick = () => { o.hitos = proponerHitos(o); guardar(); pinta(); };
        $('[data-ha]', box).onclick = () => { (o.hitos = o.hitos || []).push({ id: uid(), t: '', fecha: '', resp: o.responsable || '', hecho: '' }); guardar(); pinta(); };
        $$('[data-hh]', box).forEach((c) => (c.onchange = () => { o.hitos[+c.dataset.hh].hecho = c.checked ? V.int.hoy() : ''; guardar(); pinta(); }));
        [['ht', 't'], ['hf', 'fecha'], ['hr', 'resp']].forEach(([a, k]) => $$(`[data-${a}]`, box).forEach((c) => (c.onchange = () => { o.hitos[+c.dataset[a]][k] = c.value; guardar(); })));
        $$('[data-hd]', box).forEach((b) => (b.onclick = () => { o.hitos.splice(+b.dataset.hd, 1); guardar(); pinta(); }));
      };
      pinta();
      const ref = d.querySelector('.iv-ofr'); if (ref) ref.before(box); else d.appendChild(box);
    });
  };
  // Al sacar objetivos de las transcripciones, cada uno llega con sus hitos propuestos
  if (V.objSmart) { const ap0 = V.objSmart.aplicar; V.objSmart.aplicar = async (lista) => { (lista || []).forEach((o) => { if (!o.hitos) o.hitos = proponerHitos(o); }); return ap0(lista); }; }
  V.primera = { revisar, localizar, deSesion, proponerHitos, proyectos };
})();
