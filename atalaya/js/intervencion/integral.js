/* Atalaya 360° · Auditoría integral · Objetivos SMART desde las transcripciones e informe integral
   · Objetivos: se sacan de lo que dice el empresario en las transcripciones de primera sesión del día
     (lo que quiere, cómo lo mediría, para cuándo y qué gana), uno por tema, con indicador y beneficio.
     Las condiciones del contrato o de la propuesta (componente variable, honorarios, pagos…) no son
     objetivos de la empresa y se descartan. Cada objetivo se comprueba con las cinco letras SMART:
     solo los que cumplen las cinco figuran como objetivos; el resto se señala como «por trabajar».
   · Informe integral: la foto completa de la empresa en cada momento (transcripciones, constantes,
     nota de cada mundo, objetivos, datos del simulador, del sistema estratégico, de personas y de la
     mesa, triaje, verificaciones, hallazgos, causas, plan y sesiones). Se rehace cada vez que se abre. */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { D, $, esc, norm, uid, sumar, fCorta, fLarga, pl, guardar, toast, empresa, render, VISTAS, cte, fraseObj, smartObj, evalObj, ST_N, TRIAJE, causasOrdenadas, veinte, ruta, monitor } = V.int;
  const S = () => V.int.st();
  const I = () => A.informe;
  const P = () => A.platform;

  /* ---------- Lectura del lenguaje ---------- */
  const DESEO = /\b(quiero|quisiera|queremos|quisi[eé]ramos|me gustar[ií]a|nos gustar[ií]a|necesito|necesitamos|mi objetivo|nuestro objetivo|el objetivo (es|ser[ií]a)|aspiro|aspiramos|mi sue[ñn]o|me encantar[ií]a|tengo que conseguir|tenemos que conseguir|mi meta|lo que busco|lo que buscamos|mi idea es|la idea es)\b/i;
  const MIDE = /\b(si paso de|si pasamos de|pasar de|bajar de|subir de|llegar a|cerrar el a[ñn]o con|facturar|reducir|tener un)\b/i;
  // Condiciones del contrato o de la propuesta comercial: no son objetivos de la empresa
  const CONTRATO = /(componente variable|parte variable|el variable\b|honorari|contrato|cl[aá]usula|propuesta (comercial|econ[oó]mica)|pago (condicionado|variable|fijo)|condicionante|tramo (variable|fijo)|la consultor[ií]a (cobra|factura)|tarifa de la|firmar la propuesta|precio de la intervenci|importe de la intervenci|solo podr[aá] reducirse)/i;
  const URGE = /\b(no aguanto|me quemo|no puedo seguir|no podemos seguir|tengo que cambiar|no quiero otro a[ñn]o|me juego|vale la pena|merece la pena|compensa|lo necesito ya|es ahora o nunca)\b/i;
  const NUM = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };
  // Pasa los números escritos con letras a cifras («cincuenta horas» → «50 horas», «dos millones» → «2000000»)
  const cifras = (t) => norm(t).replace(/\bpor ciento\b/g, '%').replace(/\b[a-z]+\b/g, (w) => (w in NUM ? String(NUM[w]) : w))
    .replace(/\b(\d0) y (\d)\b/g, (m, a, b) => String(+a + +b)).replace(/\b(\d00) (\d{1,2})\b/g, (m, a, b) => String(+a + +b)).replace(/(\d+) mil\b/g, (m, n) => String(+n * 1000)).replace(/(\d+(?:[.,]\d+)?) millon(es)?\b/g, (m, n) => String(Math.round(parseFloat(n.replace(',', '.')) * 1e6)));
  const nums = (t) => (cifras(t).match(/\d+(?:[.,]\d+)?/g) || []).map((x) => parseFloat(x.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')));

  /* ---------- Temas de objetivo: indicador, unidad, redacción SMART y beneficio ---------- */
  const fmtE = (n) => Math.round(n).toLocaleString('es-ES') + ' €';
  const TEMAS = [
    { id: 'horas', k: ['horas', 'taller', 'operativa', 'apagar fuegos', 'dependa de mi', 'todo pasa por mi', 'delegar', 'dedicarme a', 'dirigir', 'estar encima', 'agenda'], ind: 'Horas del empresario en la operativa por semana', u: 'horas', solo: true,
      esp: 'Delegar la operativa y dedicar ese tiempo a dirigir y vender', ben: (o) => (o.actual && o.valor ? `${(+o.actual - +o.valor)} horas a la semana para dirigir y vender` : ''), coste: 'Formar a un encargado y traspasarle tareas: de 3 a 6 meses de acompañamiento' },
    { id: 'beneficio', k: ['beneficio', 'ganar dinero', 'gane dinero', 'rentab', 'margen', 'ganamos', 'ganancia'], ind: 'Beneficio neto sobre ventas', u: '%', solo: true,
      esp: 'Llevar el beneficio neto de la empresa a un porcentaje fijado sobre las ventas', ben: (o, x) => (o.valor ? (x.ventas ? `${o.valor} % sobre ${fmtE(x.ventas)} de ventas: unos ${fmtE(x.ventas * o.valor / 100)} de beneficio al año` : `${o.valor} % de beneficio neto sobre las ventas`) : ''), coste: 'Revisar precios y costes por cliente y producto; sostener las decisiones' },
    { id: 'ventas', k: ['facturar', 'facturacion', 'ventas', 'vender mas', 'crecer', 'clientes nuevos', 'mercado'], ind: 'Ventas anuales', u: '€', solo: false,
      esp: 'Aumentar las ventas con un plan comercial que dirija él', ben: (o) => (o.actual && o.valor ? `${fmtE(+o.valor - +o.actual)} más de ventas al año` : ''), coste: 'Tiempo comercial del empresario y, si hace falta, un comercial' },
    { id: 'caja', k: ['caja', 'poliza', 'nominas', 'tesoreria', 'vamos justos', 'ir justos', 'liquidez'], ind: 'Meses del año sin disponer de la póliza', u: 'meses', solo: true,
      esp: 'Planificar la tesorería a 13 semanas y dejar de depender de la póliza', ben: (o, x) => (x.poliza ? `Hasta ${fmtE(x.poliza * 0.06)} al año en intereses y comisiones de la póliza` : ''), coste: 'Una hora a la semana para la previsión de caja' },
    { id: 'cobros', k: ['cobrar', 'cobros', 'pagan tarde', 'no pagan', 'impagados', 'plazo de cobro'], ind: 'Plazo medio de cobro', u: 'días', solo: true,
      esp: 'Reducir el plazo medio de cobro con condiciones y seguimiento de cobros', ben: (o, x) => (x.ventas && o.actual && o.valor ? `${fmtE(x.ventas * (+o.actual - +o.valor) / 365)} de caja liberada` : ''), coste: 'Renegociar condiciones con algunos clientes' },
    { id: 'equipo', k: ['equipo', 'encargado', 'responsables', 'mandos', 'la gente', 'plantilla', 'personas'], ind: 'Responsables con funciones escritas y delegadas', u: 'personas', solo: true,
      esp: 'Nombrar responsables con funciones escritas y delegar en ellos las decisiones del día a día', ben: () => '', coste: 'Tiempo para definir puestos y acompañar a los responsables' },
    { id: 'procesos', k: ['orden', 'procesos', 'metodo', 'a su manera', 'siempre se ha hecho', 'organizacion', 'organizar'], ind: 'Procesos clave escritos y en uso', u: 'procesos', solo: true,
      esp: 'Escribir y poner en marcha los procesos clave de la empresa', ben: () => '', coste: 'Unas horas por proceso con quien lo hace' },
    { id: 'gobierno', k: ['mi padre', 'relevo', 'sucesion', 'familia en la empresa', 'socio', 'socios', 'quien decide'], ind: 'Acuerdo de gobierno firmado', u: 'acuerdo', solo: false,
      esp: 'Acordar y firmar con la familia o los socios quién decide qué', ben: () => '', coste: 'Conversaciones difíciles con la familia o los socios' },
    { id: 'personal', k: ['vacaciones', 'familia', 'mi mujer', 'mi marido', 'mis hijos', 'estres', 'descansar', 'calidad de vida'], ind: 'Semanas de vacaciones al año sin llamadas del trabajo', u: 'semanas', solo: true,
      esp: 'Recuperar tiempo personal y de descanso sin que la empresa se pare', ben: () => '', coste: 'Que la empresa funcione sin él: equipo y procesos' }
  ];
  const temaDe = (t) => { const n = norm(t); let mejor = null, sc = 0; TEMAS.forEach((T) => { const s = T.k.filter((k) => n.includes(norm(k))).length; if (s > sc) { sc = s; mejor = T; } }); return mejor; };
  const UNID = { horas: /horas?/, '%': /(%|por ciento)/, '€': /(€|euros?|millon|mil\b)/, meses: /mes(es)?/, 'días': /d[ií]as?/, personas: /(personas|responsables|mandos)/, semanas: /semanas?/ };
  // Lee hoy → meta de una frase («si paso de 50 horas a 20», «cerrar el año con un 10 % de beneficio»)
  const medida = (frase, T) => {
    const c = cifras(frase), m = c.match(/(?:pas[oa]r?|pasamos|bajar|bajamos|subir|subimos|de)\s+(?:de\s+)?(?:unas?\s+|unos?\s+)?(\d+(?:[.,]\d+)?)\s*([a-z%€]*)[^\d]{0,60}?\ba\s+(?:unas?\s+|unos?\s+)?(\d+(?:[.,]\d+)?)/);
    if (m) return { actual: m[1].replace(',', '.'), valor: m[3].replace(',', '.') };
    const n = nums(frase); if (!n.length) return null;
    if (T && UNID[T.u] && !UNID[T.u].test(c)) return null;
    return { valor: String(n[n.length - 1]) };
  };
  // Fecha límite que se dice en la conversación («en los próximos doce meses», «este año», «en dos años»)
  const fechaDe = (t, base) => {
    const c = cifras(t); let m = c.match(/(?:proximos|en|dentro de)\s+(?:los\s+)?(\d+)\s+(meses|mes|anos|ano|semanas)/);
    if (m) { const n = +m[1], u = m[2]; return sumar(base, u.startsWith('sem') ? n * 7 : u.startsWith('mes') ? Math.round(n * 30.4) : n * 365); }
    if (/\b(un|1) ano\b/.test(c)) return sumar(base, 365);
    if (/(este ano|cerrar el ano|cerramos el ano|final de ano|fin de ano)/.test(c)) return base.slice(0, 4) + '-12-31';
    m = c.match(/\b(?:antes de|para)\s+(?:el\s+)?(20\d\d)\b/); if (m) return m[1] + '-12-31';
    return '';
  };

  /* ---------- Extraer los objetivos de las transcripciones del día ---------- */
  const transDelDia = () => {
    const l = S().transcripciones.filter((t) => (t.momento || 'primera') === 'primera' && t.usar !== false); if (!l.length) return [];
    const f = l.map((t) => t.fecha || '').sort().pop(); return f ? l.filter((t) => (t.fecha || '') === f) : l;
  };
  const clientesDe = (tr) => new Set(tr.clientes && tr.clientes.length ? tr.clientes : (tr.hablantes && tr.hablantes[0] ? [tr.hablantes[0].n] : []));
  const frases = (t) => (String(t).match(/[^.!?¿¡\n]+[.!?]*/g) || []).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 3);
  const contexto = async () => {
    let ventas = 0, poliza = 0;
    try { const sim = await P().loadData('simulador'); if (sim && sim.empresa && !(A.simEsEjemplo && A.simEsEjemplo(sim))) { ventas = +sim.empresa.ventas || 0; poliza = +sim.empresa.polizaLimite || 0; } } catch (e) { /* sin datos */ }
    return { ventas, poliza };
  };
  const extraer = (x) => {
    const trs = transDelDia(), base = (trs[0] && trs[0].fecha) || S().sesion.fecha || V.int.hoy(), por = {}, descartes = [];
    let fechaG = '', urge = '';
    trs.forEach((tr) => {
      const set = clientesDe(tr), tu = tr.turnos || [];
      tu.forEach((u, j) => {
        if (!set.has(u.h)) { const f = fechaDe(u.t, base); if (f && /(conseguir|objetivo|quieres|quiere|meta)/i.test(u.t)) fechaG = fechaG || f; return; }
        const prev = tu.slice(Math.max(0, j - 2), j).filter((y) => !set.has(y.h)).map((y) => y.t).join(' ');
        const preguntaObj = /(conseguir|objetivo|quieres|quiere|c[oó]mo sabr[ií]as|qu[eé] n[uú]mero|para cu[aá]ndo|qu[eé] ganar)/i.test(prev);
        let enDeseo = false;
        frases(u.t).forEach((fr) => {
          if (URGE.test(fr) && !urge) urge = fr;
          const f = fechaDe(fr, base); if (f && (preguntaObj || DESEO.test(fr))) fechaG = fechaG || f;
          const deseo = DESEO.test(fr) || (enDeseo && /^(y\s+)?que\s/i.test(fr)) || (preguntaObj && /(conseguir|quiero|que la empresa|dejar de|llegar a|pasar de|paso de)/i.test(fr));
          const mide = MIDE.test(fr) && nums(fr).length;
          if (!deseo && !mide) { enDeseo = false; return; }
          if (CONTRATO.test(fr)) { descartes.push(fr); return; }
          enDeseo = deseo;
          // Una frase puede llevar varios objetivos: «…de 50 horas a 20, y si cerramos el año con un 10 % de beneficio»
          const pzs = fr.split(/,\s*y\s+|\s+y\s+que\s+|;\s*/i);
          pzs.forEach((pz) => {
            const T = temaDe(pz); if (!T) return;
            const o = por[T.id] || (por[T.id] = { T, dice: [], med: null, fecha: '' });
            const dc = pzs.length > 1 && pz.split(/\s+/).length >= 4 ? pz.trim().replace(/^(y\s+)?/i, '').replace(/^\w/, (c) => c.toUpperCase()) : fr; if (deseo && !o.dice.includes(dc)) o.dice.push(dc);
            const md = mide || /\d/.test(cifras(pz)) ? medida(pz, T) : null; if (md && (!o.med || (md.actual && !o.med.actual))) o.med = md;
            const fl = fechaDe(pz, base); if (fl) o.fecha = fl;
          });
        });
      });
    });
    const lista = Object.values(por).filter((o) => o.dice.length || o.med).map((o) => {
      const T = o.T, ob = { id: uid(), auto: 'reglas', tema: T.id, dice: (o.dice.join(' ') || '').slice(0, 300), especifica: T.esp, indicador: T.ind, actual: o.med && o.med.actual ? o.med.actual : '', valor: o.med ? o.med.valor : '', unidad: T.u, fecha: o.fecha || fechaG, responsable: '', solo: T.solo && !/\b(que (los |las )?(clientes|bancos?|proveedores)|que el banco)\b/i.test(o.dice.join(' ')), beneficio: '', contras: T.coste ? T.coste + ' (estimado: confírmalo con él)' : '', merece: urge ? 'si' : '', mereceCita: urge, como: '' };
      ob.beneficio = T.ben(ob, x) || '';
      return ob;
    });
    // Primero los que tienen medida y, entre ellos, los que más ha repetido
    lista.sort((a, b) => (+!!b.valor - +!!a.valor) || (b.dice.length - a.dice.length));
    return { lista: lista.slice(0, 6), descartes, trs: trs.length };
  };
  const firma = (o) => JSON.stringify([o.especifica, o.indicador, o.actual, o.valor, o.unidad, o.fecha, o.solo, o.beneficio, o.contras, o.merece, o.como]);
  const esContrato = (o) => CONTRATO.test((o.dice || '') + ' ' + (o.especifica || ''));
  // Mete los objetivos en el expediente: sustituye los que puso Atalaya y nadie ha tocado y quita las condiciones del contrato sin trabajar
  const aplicar = async (lista) => {
    const ST = S(), r0 = ST.sesion.respuestas && ST.sesion.respuestas['objetivos:0'];
    const intacto = (o) => (o.auto && o.firma === firma(o)) || (!o.especifica && !o.indicador && r0 && (o.dice || '').slice(0, 60) === (r0.t || '').slice(0, 60));
    const antes = ST.objetivos.length;
    ST.objetivos = ST.objetivos.filter((o) => !(esContrato(o) && !o.especifica) && !intacto(o));
    const quitados = antes - ST.objetivos.length;
    let n = 0;
    lista.forEach((o) => { if (ST.objetivos.some((x) => x.tema === o.tema || norm(x.indicador || '') === norm(o.indicador))) return; o.firma = firma(o); ST.objetivos.push(o); n++; });
    ST.objetivosLeidos = new Date().toISOString(); guardar();
    return { n, quitados };
  };
  const desdeTranscripciones = async () => { const x = await contexto(), r = extraer(x); const a = await aplicar(r.lista); return Object.assign(a, { descartes: r.descartes.length, trs: r.trs }); };
  const conClaude = async () => {
    const v = A.ia ? await A.ia.asegurar('Sacar los objetivos SMART de las transcripciones') : null; if (!v) return null;
    const trs = transDelDia(); if (!trs.length) return null; const x = await contexto();
    const texto = trs.map((t) => `### ${t.nombre} (${t.fecha})\n` + (t.turnos || []).map((u) => `${u.h}: ${u.t}`).join('\n')).join('\n\n').slice(0, 120000);
    const j = await A.ia.json(`Eres consultor de pymes. De las transcripciones de la primera sesión con el empresario, saca sus objetivos principales para la empresa (de 2 a 6), con lo que él dijo. No incluyas condiciones del contrato ni de la propuesta comercial del consultor (componente variable, honorarios, pagos, cláusulas): no son objetivos de la empresa. Para cada objetivo: "dice" (cita literal), "especifica" (empieza por un verbo en infinitivo y describe lo que hará él), "indicador", "actual" y "valor" (números, si los dijo o se deducen), "unidad", "fecha" (AAAA-MM-DD, si la dijo; la sesión es del ${trs[0].fecha || V.int.hoy()}), "solo" (true si depende solo de él), "beneficio" (lo que gana la empresa, con cifra si se puede${x.ventas ? `; las ventas anuales son ${x.ventas} €` : ''}), "contras" (lo que le cuesta) y "merece" ("si" solo si él dijo que compensa o que no puede seguir igual; si no, ""). Devuelve JSON: {"objetivos":[...],"descartados":["condiciones del contrato que encontraste"]}.\n\nTranscripciones:\n${texto}`, { max: 8000 });
    const lista = ((j && j.objetivos) || []).filter((o) => o && (o.dice || o.especifica) && !esContrato(o)).slice(0, 6).map((o) => { const T = temaDe((o.especifica || '') + ' ' + (o.dice || '') + ' ' + (o.indicador || '')); return { id: uid(), auto: 'claude', tema: (T && T.id) || 'c' + uid(), dice: String(o.dice || '').slice(0, 300), especifica: o.especifica || '', indicador: o.indicador || '', actual: o.actual != null ? String(o.actual) : '', valor: o.valor != null ? String(o.valor) : '', unidad: o.unidad || '', fecha: /^\d{4}-\d{2}-\d{2}$/.test(o.fecha || '') ? o.fecha : '', responsable: '', solo: !!o.solo, beneficio: o.beneficio || '', contras: o.contras || '', merece: o.merece === 'si' ? 'si' : '', como: '' }; });
    // Con Claude se sustituyen también los que sacaron las reglas y nadie ha tocado
    const ST = S(); ST.objetivos = ST.objetivos.filter((o) => !(o.auto === 'reglas' && o.firma === firma(o)));
    return aplicar(lista);
  };

  /* ---------- Clasificación SMART para los informes ---------- */
  const clasificar = () => {
    const l = (S().objetivos || []).filter((o) => (o.dice || o.especifica) && !esContrato(o));
    const fuera = (S().objetivos || []).filter((o) => (o.dice || o.especifica) && esContrato(o));
    const conSm = l.map((o) => ({ o, sm: smartObj(o) }));
    return { smart: conSm.filter((x) => x.sm.every((y) => y.ok)), trabajar: conSm.filter((x) => !x.sm.every((y) => y.ok)), fuera };
  };
  const seccionObjetivos = (In) => {
    const c = clasificar(); if (!c.smart.length && !c.trabajar.length && !c.fuera.length) return '';
    const letras = (sm) => sm.map((y) => (y.ok ? '✓ ' : '✗ ') + y.k).join('  ');
    let h = '';
    h += c.smart.length ? In.table(['#', 'Objetivo SMART', 'Indicador · hoy → meta', 'Beneficio', 'Fecha', 'E M A R T'], c.smart.map((x, i) => ['O' + (i + 1), fraseObj(x.o), `${x.o.indicador}: ${x.o.actual || '?'} → ${x.o.valor} ${x.o.unidad || ''}`, x.o.beneficio, fLarga(x.o.fecha), letras(x.sm)]))
      : In.callout('Todavía ningún objetivo cumple las cinco condiciones SMART. Los que ha planteado están abajo, con lo que falta para cerrarlos.', 'warn');
    if (c.trabajar.length) h += `<h4 style="margin:14px 0 6px">Objetivos que hay que trabajar</h4><p class="rp-muted" style="margin:0 0 6px">Los ha planteado, pero aún no cumplen las cinco condiciones. No se dan por objetivos hasta cerrarlos en la próxima sesión.</p>`
      + In.table(['Lo que dijo', 'Propuesta de objetivo', 'Indicador · hoy → meta', 'Beneficio', 'Qué falta'], c.trabajar.map((x) => [x.o.dice ? '«' + x.o.dice + '»' : '—', x.o.especifica || '—', x.o.indicador ? `${x.o.indicador}: ${x.o.actual || '?'} → ${x.o.valor || '?'} ${x.o.unidad || ''}` : '—', x.o.beneficio || 'Sin cuantificar', x.sm.filter((y) => !y.ok).map((y) => `${y.n}: ${y.h.charAt(0).toLowerCase() + y.h.slice(1)}`).join(' ')]));
    if (c.fuera.length) h += `<p class="rp-muted" style="margin:10px 0 0">Las condiciones del contrato o de la propuesta (por ejemplo, el componente variable) no son objetivos de la empresa y no figuran aquí.</p>`;
    return h;
  };
  V.objSmart = { extraer, aplicar, desdeTranscripciones, conClaude, clasificar, seccion: seccionObjetivos, esContrato };

  // Al procesar transcripciones de primera sesión se sacan también los objetivos
  const proc0 = V.cruce.procesar;
  V.cruce.procesar = (nuevas) => {
    const r = proc0(nuevas);
    if (nuevas.some((t) => (t.momento || 'primera') === 'primera')) desdeTranscripciones().then((a) => { if (a.n || a.quitados) { render(); toast(`${pl(a.n, 'objetivo sacado', 'objetivos sacados')} de las transcripciones del día${a.quitados ? ' (quitadas las condiciones del contrato)' : ''}: revísalos en el guion.`); } }).catch((e) => console.error(e));
    return r;
  };

  // En el guion, junto a los objetivos: sacarlos de las transcripciones (por reglas o con Claude)
  const guion0 = VISTAS.guion;
  VISTAS.guion = (host) => {
    guion0(host);
    const box = $('#ivObjs', host); if (!box) return;
    const c = clasificar(), bar = document.createElement('div'); bar.className = 'row iv-objx';
    bar.innerHTML = `<small class="muted">${c.smart.length} SMART · ${c.trabajar.length} por trabajar${c.fuera.length ? ` · ${c.fuera.length} condición del contrato (no cuenta como objetivo)` : ''}</small><span class="spacer"></span><button class="btn ghost small" id="ivObjT">Sacar de las transcripciones del día</button><button class="btn ghost small" id="ivObjC">Sacar con Claude</button>`;
    const row = box.querySelector('.row'); if (row) row.after(bar); else box.prepend(bar);
    box.querySelectorAll('.iv-obj').forEach((d) => { const o = S().objetivos.find((x) => x.id === d.dataset.o); if (o && esContrato(o)) { const t = document.createElement('p'); t.className = 'small iv-sinr'; t.textContent = 'Esto es una condición del contrato o de la propuesta, no un objetivo de la empresa: no figura en los informes. Quítalo o reescríbelo como objetivo suyo.'; d.querySelector('.row').after(t); } else if (o && o.auto && o.firma === firma(o)) { const t = document.createElement('small'); t.className = 'iv-autot media'; t.textContent = `Sacado de la transcripción${o.auto === 'claude' ? ' con Claude' : ''}: confírmalo con él${o.mereceCita ? ` · compensa: «${o.mereceCita}»` : ''}`; d.querySelector('.row').appendChild(t); } });
    $('#ivObjT', bar).onclick = async () => { const a = await desdeTranscripciones(); render(); toast(a.trs ? `${pl(a.n, 'objetivo nuevo', 'objetivos nuevos')}${a.quitados ? `; ${pl(a.quitados, 'quitado', 'quitados')} (sin tocar o condiciones del contrato)` : ''}.` : 'No hay transcripciones de primera sesión.'); };
    $('#ivObjC', bar).onclick = async (e) => { e.target.disabled = true; e.target.textContent = 'Leyendo…'; try { const a = await conClaude(); if (!a) toast('Sin conexión con Claude o sin transcripciones: usa «Sacar de las transcripciones del día».'); else { render(); toast(`${pl(a.n, 'objetivo', 'objetivos')} con Claude.`); } } catch (x) { toast('No se pudo: ' + x.message); } e.target.disabled = false; e.target.textContent = 'Sacar con Claude'; };
  };

  /* ================= INFORME INTEGRAL: LA FOTO COMPLETA ================= */
  const cargar = async (k) => { try { return await P().loadData(k); } catch (e) { return null; } };
  const kpiSim = (sim) => {
    if (!sim || !sim.empresa || (A.simEsEjemplo && A.simEsEjemplo(sim)) || !(+sim.empresa.ventas > 0)) return null;
    const e = sim.empresa, ebitda = e.ventas * (e.margen || 0) / 100 - (e.personal || 0) - (e.fijos || 0);
    return [['Ventas anuales', fmtE(e.ventas)], ['Margen bruto', (e.margen || 0) + ' %'], ['Coste de personal', fmtE(e.personal || 0) + ` (${Math.round((e.personal || 0) / e.ventas * 100)} % de las ventas)`], ['Gastos fijos', fmtE(e.fijos || 0)], ['Resultado operativo aproximado (EBITDA)', fmtE(ebitda) + ` (${Math.round(ebitda / e.ventas * 1000) / 10} %)`], ['Caja', fmtE(e.caja || 0)], ['Deuda viva', fmtE(e.deudaViva || 0)], ['Póliza: límite / dispuesto', `${fmtE(e.polizaLimite || 0)} / ${fmtE(e.polizaDispuesta || 0)}`], ['Plazos de cobro · existencias · pago', `${e.dso || 0} · ${e.dio || 0} · ${e.dpo || 0} días`], ['Plantilla', String(e.plantilla || 0)]];
  };
  V.informes.auditoria = async () => {
    const In = I(); In.reset();
    const ST = S(); ST.informes = ST.informes || {}; ST.informes.auditoria = new Date().toISOString(); guardar();
    toast('Preparando la foto completa…');
    const [sim, mesa, nota, cuenta, datos] = await Promise.all([cargar('simulador'), cargar('agenda'), A.nota && A.nota.calcular ? A.nota.calcular().catch(() => null) : null, V.cruce.leerCuenta ? V.cruce.leerCuenta().catch(() => null) : null, V.cruce.estadoDatos ? V.cruce.estadoDatos().catch(() => null) : null]);
    const r = ruta(), l = causasOrdenadas(), v20 = veinte(), conf = ST.causas.filter((c) => c.estado === 'confirmada'), desc = ST.causas.filter((c) => c.estado === 'descartada');
    const c1 = V.cruce.conjunta ? V.cruce.conjunta('primera') : null, trs = ST.transcripciones, oc = clasificar(), ahora = new Date();
    const fuentes = [trs.length ? pl(trs.length, 'transcripción', 'transcripciones') : '', ...(cuenta ? cuenta.fuentes : [])].filter(Boolean);
    let h = In.cover({ empresa: empresa(), tipo: 'Auditoría integral', kicker: 'Auditoría integral · foto completa', titulo: 'La empresa hoy, con todos sus datos', subtitulo: `Actualizado el ${fLarga(ahora.toISOString().slice(0, 10))} a las ${ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · ${fuentes.join(' · ') || 'sin fuentes todavía'}` });
    const nRojo = nota ? Object.values(nota.mundos).reduce((a, m) => a + m.puntos.filter((x) => x.st === 'stop').length, 0) : 0;
    h += In.summary('En pocas palabras', `<p>Este informe recoge todo lo que sabemos de la empresa en este momento y se rehace cada vez que se abre: lo escuchado en las sesiones, las constantes, la nota de cada mundo, sus objetivos, los datos de finanzas, clientes, personas y la mesa de trabajo, el triaje, lo verificado en la auditoría y el plan.</p>`
      + In.kpis([{ k: 'Nota de la empresa', v: nota && nota.global != null ? String(nota.global).replace('.', ',') + '/10' : '—', d: pl(nRojo, 'punto en rojo', 'puntos en rojo') }, { k: 'Constantes', v: D.CONSTANTES.filter((c) => cte(c.id)).length + '/' + D.CONSTANTES.length, d: ST_N[V.int.global()] ? 'Estado ' + ST_N[V.int.global()].toLowerCase() : 'sin tomar' }, { k: 'Síntomas · causas', v: `${ST.sintomas.length} · ${l.length}`, d: pl(conf.length, 'causa confirmada', 'causas confirmadas') }, { k: 'Objetivos SMART', v: String(oc.smart.length), d: `${oc.trabajar.length} por trabajar` }]));
    // Datos reales pendientes
    if (datos) { const falta = Object.keys(datos).filter((k) => !datos[k].ok); if (falta.length) h += In.callout(`<b>Datos que faltan.</b> ${falta.map((k) => ({ simulador: 'Finanzas (simulador)', estrategia: 'Clientes, ventas y operaciones (sistema estratégico)', personas: 'Personas y equipos' })[k] + ': ' + datos[k].det.toLowerCase()).join(' · ')}. El informe se completa en cuanto se suban.`, 'warn'); }
    // Termómetros: nota de cada mundo
    if (nota && Object.keys(nota.mundos).length) h += In.section('Nota de cada mundo', In.table(['Mundo', 'Nota', 'En rojo', 'En ámbar', 'Lo más urgente'], Object.keys(nota.mundos).map((k) => { const m = nota.mundos[k], ro = m.puntos.filter((x) => x.st === 'stop'); return [m.n, m.nota != null ? String(m.nota).replace('.', ',') + '/10' : '—', String(ro.length), String(m.puntos.filter((x) => x.st === 'warn').length), ro.slice(0, 3).map((x) => x.t).join(' · ') || '—']; })), 'Cada mundo puntúa sus comprobaciones del 1 al 10: verde suma, ámbar suma la mitad y rojo no suma.');
    // Constantes vitales
    const O = ST.cteOrigen || {}, Lg = ST.cteLenguaje || (c1 && c1.est) || {};
    h += In.section('Constantes vitales', `<div class="pdf-keep" style="max-width:560px;margin:0 0 10px">${monitor()}</div>` + In.table(['Constante', 'Lectura', 'Estado', 'Por el lenguaje', 'Valorada por'], D.CONSTANTES.map((c) => [c.n, cte(c.id) ? c.e[cte(c.id) - 1] : 'Sin tomar', cte(c.id) ? { h: In.pill(D.nivelConst(cte(c.id)), ST_N[D.nivelConst(cte(c.id))]) } : '—', Lg[c.id] ? String(Lg[c.id]) : '—', O[c.id] === 'lenguaje' ? 'Lenguaje (por confirmar)' : cte(c.id) ? 'Consultor' : '—'])), '1 = bien, 5 = grave.');
    // Lo escuchado
    if (trs.length) {
      const R = ST.sesion.respuestas || {}, nPreg = D.GUION.reduce((a, b) => a + b.p.length, 0);
      h += In.section('Lo escuchado en las sesiones', In.table(['Transcripción', 'Momento', 'Fecha', 'Palabras', 'Habla el empresario', 'Huecos con cita'], trs.map((t) => [t.nombre, (t.momento || 'primera') === 'primera' ? 'Primera sesión' : 'Intervención', fCorta(t.fecha), t.analisis ? t.analisis.palabras.toLocaleString('es-ES') : '—', t.analisis ? t.analisis.pctCliente + ' %' : '—', t.analisis ? t.analisis.huecos.filter((x) => x.peso).length + '/7' : '—']))
        + (c1 ? `<p>Media de ${pl(c1.n, 'transcripción', 'transcripciones')} de primera sesión: habla el empresario el ${Math.round(c1.pctMedia)} % del tiempo; yo/nosotros ${Math.round(c1.yoMedia)}/${Math.round(c1.nosMedia)}; huecos que más se repiten: ${c1.an.huecos.filter((x) => x.peso).sort((a, b) => b.peso - a.peso).slice(0, 4).map((x) => x.n.toLowerCase() + ' (' + x.peso + ')').join(', ') || '—'}.</p>` : '')
        + `<p>Guion: ${Object.keys(R).length} de ${nPreg} preguntas con respuesta${(ST.sesion.sinRespuesta || []).length ? `; ${ST.sesion.sinRespuesta.length} sin respuesta, para la próxima sesión` : ''}.</p>`);
      const cit = ST.sintomas.filter((s) => s.cita).slice(0, 12);
      if (cit.length) h += In.section('Sus palabras', In.table(['Síntoma', 'Lo que dijo', 'Área', 'Origen'], cit.map((s) => [s.t, '«' + s.cita + '»', (D.area(s.area) || {}).n || '', s.origen === 'documentacion' ? s.de || 'Documentación' : s.origen === 'transcripcion' ? 'Transcripción' : 'Consultor'])));
    }
    // Objetivos
    const so = seccionObjetivos(In); if (so) h += In.section('Sus objetivos', so, 'Lo que el empresario quiere conseguir, comprobado con las cinco condiciones SMART: específico, medible, que depende de él, rentable y con fecha.');
    // Datos de los otros mundos
    const ks = kpiSim(sim); if (ks) h += In.section('Finanzas y caja (simulador)', In.table(['Dato', 'Valor'], ks));
    if (cuenta) { const filas = D.AREAS.flatMap((a) => { const o = cuenta.out[a.id]; return o.datos.map((d) => [a.n, d.k, String(d.v), d.st ? { h: In.pill(d.st, ST_N[d.st] || d.st) } : '—']).concat(o.docs.map((d) => [a.n, 'Documento', d.n, '—'])); }); if (filas.length) h += In.section('Lo que dicen los demás mundos, por áreas', In.table(['Área', 'Dato', 'Valor', 'Estado'], filas.slice(0, 60)), 'Sistema estratégico (clientes, ventas, cobros, documentos subidos), personas y equipos, y los puntos en rojo de las notas.'); }
    if (mesa && (Array.isArray(mesa.metas) || Array.isArray(mesa.tareas))) { const mt = (mesa.metas || []).filter((m) => m.estado !== 'archivada'), ta = mesa.tareas || [], hechas = ta.filter((t) => t.estado === 'hecha').length; if (mt.length || ta.length) h += In.section('Mesa de trabajo', In.kpis([{ k: 'Metas activas', v: String(mt.filter((m) => m.estado !== 'cumplida').length), d: pl(mt.filter((m) => m.estado === 'cumplida').length, 'cumplida', 'cumplidas') }, { k: 'Tareas', v: String(ta.length), d: `${hechas} hechas · ${ta.length - hechas} abiertas` }]) + (mt.length ? In.table(['Meta', 'Indicador', 'Fecha'], mt.slice(0, 10).map((m) => [m.especifica || m.objetivo || '—', m.indicador ? `${m.indicador}: ${m.actual || '?'} → ${m.valor || '?'} ${m.unidad || ''}` : '—', m.fecha ? fCorta(m.fecha) : '—'])) : '')); }
    // Triaje
    if (r.length) h += In.section('Triaje por áreas', In.table(['Área', 'Triaje', 'Síntomas', 'Hipótesis de causa'], r.map((x) => [x.a.n, x.n ? { h: In.pill(x.n, TRIAJE[x.n].n) } : '—', String(x.ss.length), x.cs.map((c) => c.t).join(' · ') || '—'])), 'Urgencias: 0-14 días. Preferente: este trimestre. Programable: sin urgencia.');
    // Verificaciones, evidencias y hallazgos por área
    r.forEach((x) => { const v = ST.verifica[x.a.id] || {}; const filas = (D.VERIFICA[x.a.id] || []).map((q, i) => [q, D.ESTADOS_V[(v[i] || {}).e || 'pend'], (v[i] || {}).nota || '—']); const hs = ST.hallazgos.filter((hh) => hh.area === x.a.id); const dc = cuenta && cuenta.out[x.a.id]; h += In.section('Verificación · ' + x.a.n, In.table(['Verificación', 'Estado', 'Evidencia'], filas) + (hs.length ? In.table(['Hallazgo', 'Gravedad', 'Origen'], hs.map((hh) => [hh.t, String(hh.gravedad), hh.origen === 'ecosistema' ? 'Ecosistema Atalaya' : 'Auditoría'])) : '') + (dc && dc.datos.length ? `<p class="rp-muted" style="margin:6px 0 0">Datos de la cuenta: ${dc.datos.map((d) => esc(d.k + ' ' + d.v)).join(' · ')}</p>` : '')); });
    // Causas
    if (l.length) h += In.section('Causas', In.table(['Causa', 'Área', 'Explica', 'Estado', 'Prioridad'], l.map((x) => [x.c.t, (D.area(x.c.area) || {}).n || '', pl(x.ss.length, 'síntoma', 'síntomas'), x.c.estado === 'confirmada' ? { h: In.pill('stop', 'Confirmada') } : x.c.estado === 'descartada' ? 'Descartada' : 'Hipótesis', v20.has(x.c.id) ? '★ El 20 % que más pesa' : '—'])), `${pl(conf.length, 'confirmada', 'confirmadas')}, ${pl(desc.length, 'descartada', 'descartadas')} y ${l.length - conf.length - desc.length} por verificar.`);
    // Plan y sesiones
    const acc = (ST.plan && ST.plan.acciones) || [];
    if (acc.length) { const est = (e) => acc.filter((a) => (a.estado || 'pendiente') === e).length; h += In.section('Plan de intervención', In.kpis([{ k: 'Acciones', v: String(acc.length), d: `${acc.filter((a) => a.clave).length} clave` }, { k: 'Hechas', v: String(est('hecha')), d: `${est('en curso')} en curso` }, { k: 'Pendientes', v: String(est('pendiente')), d: acc.filter((a) => a.estado !== 'hecha' && a.fecha && a.fecha < V.int.hoy()).length + ' con la fecha pasada' }])); }
    const ses = ST.sesiones.filter((s) => s.tipo !== 'contacto'); if (ses.length) h += In.section('Sesiones', In.table(['Fecha', 'Sesión', 'Acuerdos', 'Avances', 'Acta'], ses.map((s) => [fCorta(s.fecha), D.TIPOS_SESION[s.tipo] || s.tipo, String((s.acuerdos || []).length), String((s.avances || []).length), s.acta ? 'Sí' : '—'])));
    h += In.foot('Informe integral de la auditoría. Recoge los datos de todos los mundos de la empresa en el momento en que se abre; las causas sin verificar son hipótesis de trabajo.');
    In.open({ titulo: 'Auditoría integral · ' + empresa(), html: h, clave: 'iv:auditoria' });
  };
  // La tarjeta del informe integral explica que recoge todo
  const inf0 = VISTAS.informes;
  VISTAS.informes = (host) => { inf0(host); const b = host.querySelector('[data-inf="auditoria"]'); const card = b && b.closest('.iv-inf'); const p = card && card.querySelector('p'); if (p) p.textContent = 'La foto completa de la empresa desde el primer día: transcripciones, constantes, nota de cada mundo, objetivos SMART, finanzas, clientes, personas, mesa de trabajo, triaje, verificaciones, hallazgos, causas, plan y sesiones. Se actualiza cada vez que se abre.'; };
})();
