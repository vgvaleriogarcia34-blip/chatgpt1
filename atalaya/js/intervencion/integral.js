/* Atalaya 360° · Auditoría integral · Objetivos SMART desde las transcripciones e informe integral
   · Objetivos: se sacan de lo que dice el empresario en las transcripciones de primera sesión del día
     (lo que quiere, cómo lo mediría, para cuándo y qué gana), uno por tema, con indicador y beneficio.
     Las condiciones del contrato o de la propuesta (componente variable, honorarios, pagos…) no son
     objetivos de la empresa y se descartan. Cada objetivo se comprueba con las cinco letras SMART:
     solo los que cumplen las cinco figuran como objetivos; el resto se señala como «por trabajar».
   · Informe integral: el diagnóstico de la empresa como dossier (resumen ejecutivo, situación
     económico-financiera, diagnóstico por áreas, riesgos y oportunidades, recomendaciones, hoja de
     ruta y anexo de metodología, fuentes y limitaciones). El sujeto es la empresa: lo que no se ha
     podido analizar se dice en el anexo, no como estado de la aplicación. */
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
    { id: 'beneficio', k: ['beneficio', 'ganar dinero', 'gane dinero', 'rentab*', 'margen', 'ganamos', 'ganancia'], ind: 'Beneficio neto sobre ventas', u: '%', solo: true,
      esp: 'Llevar el beneficio neto de la empresa a un porcentaje fijado sobre las ventas', ben: (o, x) => (o.valor ? (x.ventas ? `${o.valor} % sobre ${fmtE(x.ventas)} de ventas: unos ${fmtE(x.ventas * o.valor / 100)} de beneficio al año` : `${o.valor} % de beneficio neto sobre las ventas`) : ''), coste: 'Revisar precios y costes por cliente y producto; sostener las decisiones' },
    { id: 'ventas', k: ['facturar*', 'facturacion', 'ventas', 'vender mas', 'crecer*', 'clientes nuevos', 'mercado'], ind: 'Ventas anuales', u: '€', solo: false,
      esp: 'Aumentar las ventas con un plan comercial que dirija él', ben: (o) => (o.actual && o.valor ? `${fmtE(+o.valor - +o.actual)} más de ventas al año` : ''), coste: 'Tiempo comercial del empresario y, si hace falta, un comercial' },
    { id: 'caja', k: ['caja', 'poliza', 'nominas', 'tesoreria', 'vamos justos', 'ir justos', 'liquidez'], ind: 'Meses del año sin disponer de la póliza', u: 'meses', solo: true,
      esp: 'Planificar la tesorería a 13 semanas y dejar de depender de la póliza', ben: (o, x) => (x.poliza ? `Hasta ${fmtE(x.poliza * 0.06)} al año en intereses y comisiones de la póliza` : ''), coste: 'Una hora a la semana para la previsión de caja' },
    { id: 'cobros', k: ['cobrar*', 'cobros', 'pagan tarde', 'no pagan', 'impagad*', 'plazo de cobro'], ind: 'Plazo medio de cobro', u: 'días', solo: true,
      esp: 'Reducir el plazo medio de cobro con condiciones y seguimiento de cobros', ben: (o, x) => (x.ventas && o.actual && o.valor ? `${fmtE(x.ventas * (+o.actual - +o.valor) / 365)} de caja liberada` : ''), coste: 'Renegociar condiciones con algunos clientes' },
    { id: 'equipo', k: ['equipo', 'encargado', 'responsables', 'mandos', 'la gente', 'plantilla', 'personas'], ind: 'Responsables con funciones escritas y delegadas', u: 'personas', solo: true,
      esp: 'Nombrar responsables con funciones escritas y delegar en ellos las decisiones del día a día', ben: () => '', coste: 'Tiempo para definir puestos y acompañar a los responsables' },
    { id: 'procesos', k: ['orden', 'procesos', 'metodo', 'a su manera', 'siempre se ha hecho', 'organizacion', 'organiz*'], ind: 'Procesos clave escritos y en uso', u: 'procesos', solo: true,
      esp: 'Escribir y poner en marcha los procesos clave de la empresa', ben: () => '', coste: 'Unas horas por proceso con quien lo hace' },
    { id: 'gobierno', k: ['mi padre', 'relevo', 'sucesion', 'familia en la empresa', 'socio', 'socios', 'quien decide'], ind: 'Acuerdo de gobierno firmado', u: 'acuerdo', solo: false,
      esp: 'Acordar y firmar con la familia o los socios quién decide qué', ben: () => '', coste: 'Conversaciones difíciles con la familia o los socios' },
    { id: 'personal', k: ['vacaciones', 'familia', 'mi mujer', 'mi marido', 'mis hijos', 'estres', 'descansar', 'calidad de vida'], ind: 'Semanas de vacaciones al año sin llamadas del trabajo', u: 'semanas', solo: true,
      esp: 'Recuperar tiempo personal y de descanso sin que la empresa se pare', ben: () => '', coste: 'Que la empresa funcione sin él: equipo y procesos' },
    { id: 'gastos', k: ['gastos', 'costes', 'coste', 'gastamos', 'compras', 'ahorr*'], ind: 'Gastos de estructura anuales', u: '€', solo: true,
      esp: 'Revisar y recortar los gastos de estructura partida a partida', ben: () => '', coste: 'Renegociar contratos y renunciar a algunos gastos' },
    { id: 'actividad', k: ['llamar', 'llamadas', 'visitar', 'visitas', 'ofertas', 'presupuestos', 'presentar'], ind: 'Acciones comerciales por semana', u: 'acciones', solo: true,
      esp: 'Hacer cada semana un número fijo de acciones comerciales', ben: () => '', coste: 'Horas de agenda comercial cada semana' }
  ];
  const temaDe = (t) => { const n = norm(t); let mejor = null, sc = 0; TEMAS.forEach((T) => { const s = D.kwCuenta(n, T.k); if (s > sc) { sc = s; mejor = T; } }); return mejor; };
  const UNID = { horas: /horas?/, '%': /(%|por ciento)/, '€': /(€|euros?|millon|mil\b)/, meses: /mes(es)?/, 'días': /d[ií]as?/, personas: /(personas|responsables|mandos)/, semanas: /semanas?/ };
  /* ---------- Lectura de la M (cifra meta) y de la T (fecha límite) en lo que dice ---------- */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES = '(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)';
  // Cifras limpias: «500.000 €» → 500000, «un millón y medio» → 1500000, «dos horas» → 2 horas
  const cifrasF = (t) => cifras(norm(String(t || '')).replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1').replace(/\bmedio millon\b/g, '500000').replace(/\b(un|una) (millon|mil)\b/g, '1 $2'))
    .replace(/(\d+) y medio\b/g, (m, n) => String(+n >= 1e6 ? +n + 5e5 : +n + 0.5)).replace(/(\d+),(\d+) (millones|mil)/g, (m, e, d) => String(Math.round(parseFloat(e + '.' + d) * (m.includes('mil ') && !m.includes('millon') ? 1e3 : 1e6))));
  // Expresiones de tiempo: no son la cifra meta y no forman parte de «qué hará»
  const TIEMPO = [
    /\b(?:en|durante|dentro de|en menos de|antes de|(?:los |las )?proxim[oa]s)\s+(?:los\s+|las\s+|unos\s+|unas\s+)?\d+\s+(?:meses|mes|anos|ano|semanas|semana|dias|dia)\b/g,
    /\b(?:antes de(?:l)?|para(?: el)?|hasta(?: el)?|a (?:partir|finales|final) de(?:l)?|desde|en|el|del)?\s*(?:\d{1,2}\s+de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+20\d\d)?\b/g,
    /\b(?:antes de(?:l)?|para(?: el)?|hasta(?: el)?|en|el|del)?\s*\d{1,2}[\/-]\d{1,2}[\/-]20\d\d\b/g,
    /\b(?:antes de(?:l)?|para(?: el)?|hasta(?: el)?|en|a final(?:es)? de(?:l)?|al cierre de(?:l)?)?\s*(?:el\s+|ano\s+)?20\d\d\b/g,
    /\b(?:antes de(?:l)?|para(?: el)?|hasta(?: el)?|en|a final(?:es)? de(?:l)?|durante)?\s*(?:este|esta|el|la|del|de la)?\s*(?:primer|segundo|tercer|cuarto|1|2|3|4|proximo|proxima)?\s*(?:trimestre|semestre|verano|navidad|navidades|fin de mes|final de mes|final del mes|ano que viene|mes que viene|semana que viene|proximo ano|proximo mes|proxima semana|fin de ano|final de ano|final del ano|este ano|ano)\b(?:\s+que viene)?/g
  ];
  const quitarTiempo = (c) => TIEMPO.reduce((x, re) => x.replace(re, ' '), c).replace(/\s{2,}/g, ' ').trim();
  const NUMRE = '(\\d+(?:[.,]\\d+)?)';
  const NO_UNIDAD = /^(de|a|al|y|o|por|cada|veces|en|del|la|el|los|las|mas|menos|que|con)$/;
  // Hoy → meta y unidad de una frase: «de 90 a 60 días», «del 25 al 32 %», «a la mitad», «a cero», «3 tiendas», «500000 €»
  const cantidad = (frase) => {
    const c = quitarTiempo(cifrasF(frase)), n = (x) => String(parseFloat(String(x).replace(',', '.')));
    const uni = (u) => { u = (u || '').trim(); if (!u || NO_UNIDAD.test(u)) return ''; if (/^(%|por ciento)$/.test(u)) return '%'; if (/^(€|euros?)$/.test(u)) return '€'; return u === 'dias' ? 'días' : u; };
    let m = c.match(new RegExp('\\b(?:de|del|desde|pasar de|pasando de|paso de)\\s+(?:un |una |el |la )?' + NUMRE + '\\s*(%|€|[a-z]+)?\\s+(?:a|al|hasta|hasta el)\\s+(?:un |una |el |la )?' + NUMRE + '\\s*(%|€|[a-z]+)?'));
    if (m) return { actual: n(m[1]), valor: n(m[3]), unidad: uni(m[4]) || uni(m[2]) };
    if (/\ba la mitad\b/.test(c)) return { valor: '50', unidad: '% de lo actual' };
    if (/\b(el doble|duplicar)\b/.test(c)) return { valor: '200', unidad: '% de lo actual' };
    if (/\b(a|en) (cero|0)\b/.test(c)) return { valor: '0', unidad: '', cero: true };
    m = c.match(new RegExp(NUMRE + '\\s*(%|€|[a-z]+)?')); if (!m) return null;
    // «2 millones», «medio millón», «30 mil» sin unidad: son euros
    return { valor: n(m[1]), unidad: uni(m[2]) || (/\b(millon|millones|mil)\b/.test(norm(frase)) ? '€' : '') };
  };
  const medida = (frase, T) => {
    const q = cantidad(frase); if (!q) return null;
    if (!q.unidad && T && UNID[T.u] && !UNID[T.u].test(cifrasF(frase))) return null;
    return q;
  };
  // Fecha límite: el plazo que dice («en 15 días», «antes del verano», «este trimestre», «hasta diciembre», «el 15/03/2027»)
  const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, new Date(y, m, 0).getDate())).padStart(2, '0')}`;
  const fechaDe = (t, base) => {
    const c = cifrasF(t), b = new Date(base + 'T12:00:00'), Y = b.getFullYear(), M = b.getMonth() + 1;
    const prox = (mes, dia) => { const y = mes < M || (mes === M && dia && dia < b.getDate()) ? Y + 1 : Y; return ymd(y, mes, dia || 31); };
    let m = c.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d\d)\b/); if (m) return ymd(+m[3], +m[2], +m[1]);
    m = c.match(new RegExp('\\b(\\d{1,2})\\s+de\\s+' + MES + '(?:\\s+(?:de|del)\\s+(20\\d\\d))?\\b')); if (m) { const mes = MESES.indexOf(m[2] === 'setiembre' ? 'septiembre' : m[2]) + 1; return m[3] ? ymd(+m[3], mes, +m[1]) : prox(mes, +m[1]); }
    m = c.match(/(?:proxim[oa]s|en|dentro de|durante|en menos de|antes de)\s+(?:los\s+|las\s+|unos\s+|unas\s+)?(\d+)\s+(dias|dia|semanas|semana|meses|mes|anos|ano)\b/);
    if (m) { const k = +m[1], u = m[2]; return sumar(base, u.startsWith('dia') ? k : u.startsWith('sem') ? k * 7 : u.startsWith('mes') ? Math.round(k * 30.4) : k * 365); }
    if (/\b(la semana que viene|la proxima semana)\b/.test(c)) return sumar(base, 7);
    if (/\b(fin de mes|final de mes|final del mes|este mes)\b/.test(c)) return ymd(Y, M, 31);
    if (/\b(el mes que viene|el proximo mes)\b/.test(c)) return M === 12 ? ymd(Y + 1, 1, 31) : ymd(Y, M + 1, 31);
    if (/\bverano\b/.test(c)) return prox(6, 21);
    if (/\bnavidad(es)?\b/.test(c)) return prox(12, 24);
    m = c.match(/\b(primer|segundo|tercer|cuarto|1|2|3|4|este|proximo)\s+(trimestre|semestre)\b/);
    if (m) { const tri = m[2] === 'trimestre', paso = tri ? 3 : 6, actual = Math.ceil(M / paso), idx = { primer: 1, segundo: 2, tercer: 3, cuarto: 4, 1: 1, 2: 2, 3: 3, 4: 4 }[m[1]];
      let k = m[1] === 'este' ? actual : m[1] === 'proximo' ? actual + 1 : idx, y = Y; if (k > 12 / paso) { k -= 12 / paso; y++; } if (idx && idx < actual) y++; return ymd(y, k * paso, 31); }
    if (/\b(un|1) ano\b/.test(c)) return sumar(base, 365);
    m = c.match(/\b(?:antes de|para|en|hasta|a final(?:es)? de|al cierre de)\s+(?:el\s+)?(?:ano\s+)?(20\d\d)\b/) || c.match(/\b(20\d\d)\b/); if (m) return m[1] + '-12-31';
    if (/\b(el ano que viene|el proximo ano)\b/.test(c)) return (Y + 1) + '-12-31';
    if (/(este ano|cerrar el ano|cerramos el ano|final de ano|final del ano|fin de ano)/.test(c)) return Y + '-12-31';
    // Meses: manda el que va tras «hasta / antes de / para»; si no, el último que se nombra
    const meses = [...c.matchAll(new RegExp('(?:\\b(hasta|antes de|para|a finales de|a final de)\\s+(?:el\\s+mes\\s+de\\s+)?)?\\b' + MES + '(?:\\s+(?:de|del)\\s+(20\\d\\d))?\\b', 'g'))];
    if (meses.length) { const x = meses.find((y) => y[1]) || meses[meses.length - 1], mes = MESES.indexOf(x[2] === 'setiembre' ? 'septiembre' : x[2]) + 1; return x[3] ? ymd(+x[3], mes, 31) : prox(mes); }
    return '';
  };
  // Objetivos de hito (se hace o no se hace): contratar, abrir, firmar… sin cifra
  const HITO = /^(contratar|abrir|nombrar|firmar|implantar|lanzar|instalar|crear|escribir|montar|cerrar|delegar|formalizar|aprobar|dejar de|incorporar|sustituir|digitalizar)\b/;
  const ARTIC = /^(el|la|los|las|un|una|unos|unas|de|del|con|a|al|en|y|para|por|mis|mi|su|sus|nuestro|nuestra|nuestros|nuestras)\s+/i;
  // Qué se mide, a partir de «qué hará»: el objeto sin verbo, sin cifras y sin tiempo («Abrir 3 tiendas nuevas» → «Tiendas nuevas»)
  const objeto = (esp) => {
    let x = String(esp || '').replace(/^\s*\S+\s*/, '').replace(/^de\s+/i, '');
    x = x.replace(/\b(?:(?:un|una|medio|\d[\d.,]*)\s+)?(?:mill[oó]n|millones|mil)(?:\s+y\s+medio)?\b/gi, ' ').replace(new RegExp('(^|\\s)(' + Object.keys(NUM).join('|') + ')(?=\\s)', 'gi'), ' ');
    x = x.replace(/\b(?:de|del|desde)\s+(?:un |una |el |la )?\d[\d.,]*\s*\S*\s+(?:a|al|hasta)\s+(?:un |una |el |la )?\d[\d.,]*\s*(?:%|€|euros?)?/gi, ' ')
      .replace(/\b(?:a la mitad|el doble|a cero)\b/gi, ' ').replace(/\b(?:un |una |el |la |al |a |en |hasta |con )?\d[\d.,]*\s*(?:%|€|euros?|millones|mil)?/gi, ' ')
      .replace(/(?:^|\s)(?:el|este|al|del|cada)\s+a[ñn]o(?=\s|$)/gi, ' ').replace(/\b(?:antes|después|despues)\s+de(?:l)?\b.*$/i, ' ').replace(/\b(?:este|esta|el pr[oó]ximo|la pr[oó]xima)\s+(?:a[ñn]o|mes|trimestre|semestre|semana)\b/gi, ' ').replace(/\b(?:en|para|a partir de|desde|hasta)\s+(?:el\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|verano|navidad)\b.*$/i, ' ')
      .replace(/\s{2,}/g, ' ').trim();
    for (let i = 0; i < 4; i++) x = x.replace(ARTIC, '').replace(/\s+(de|del|con|a|al|en|y|para|por|el|la|un|una)$/i, '').trim();
    return x ? x.charAt(0).toUpperCase() + x.slice(1) : '';
  };
  // Lee una frase del empresario y saca lo que ya trae de SMART: qué hará, indicador, hoy → meta, unidad, fecha y si depende de él
  const leerFrase = (frase, base) => {
    const t = String(frase || '').trim(); if (!t) return {};
    const T = temaDe(t), r = {}, q = cantidad(t), f = fechaDe(t, base || V.int.hoy());
    const sinDeseo = t.replace(/^\s*(yo\s+)?(quiero|quisiera|me gustar[ií]a|necesito|mi objetivo es|el objetivo es|mi meta es|tengo que conseguir|aspiro a)\s+/i, '').replace(/[.\s]+$/, '');
    if (sinDeseo !== t.replace(/[.\s]+$/, '') && /^\S+(ar|er|ir)(se|lo|la|le|me)?\b/i.test(sinDeseo)) r.especifica = sinDeseo.charAt(0).toUpperCase() + sinDeseo.slice(1);
    else if (/^\s*\S+(ar|er|ir)(se|lo|la|le|me)?\b/i.test(t) && t.split(/\s+/).length >= 4) r.especifica = t.replace(/[.\s]+$/, '');
    // La fecha va en su campo: se quita del «qué hará» (y el «de X a Y», que la frase final ya dice con hoy → meta)
    if (r.especifica) r.especifica = r.especifica.replace(/\s+(?:de|del|desde)\s+(?:unas?\s+|unos?\s+|el\s+|la\s+)?\d[\d.,]*\s*\S*\s+(?:a|al|hasta)\s+(?:unas?\s+|unos?\s+|el\s+|la\s+)?\d[\d.,]*(?:\s*(?:%|€|horas?|d[ií]as?|semanas?|meses|euros?))?/i, '')
      .replace(/,?\s+(?:antes de(?:l)?|para(?: el)?|hasta(?: el)?|a (?:partir|finales|final) de(?:l)?|en|dentro de|durante|desde|el)\s+(?:(?:\d{1,2}\s+de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de(?:l)?\s+20\d\d)?(?:\s+hasta\s+\S+)?|\d{1,2}[\/-]\d{1,2}[\/-]20\d\d|20\d\d|(?:\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta)\s+(?:meses|mes|a[ñn]os?|semanas?|d[ií]as?)|(?:el\s+|la\s+|este\s+|esta\s+)?(?:primer\s+|segundo\s+|tercer\s+|cuarto\s+|pr[oó]ximo\s+|pr[oó]xima\s+)?(?:trimestre|semestre|verano|navidad(?:es)?|fin de mes|final de(?:l)? mes|final de(?:l)? a[ñn]o|fin de a[ñn]o|a[ñn]o que viene|mes que viene|semana que viene))\b/gi, '')
      .replace(/\s+(?:este|esta)\s+(?:a[ñn]o|mes|trimestre|semestre|semana)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    const nt = norm(t), uf = q && q.unidad;
    // Indicador: el del tema si su unidad encaja con la de la frase; si no, lo que se mide según la propia frase
    // Si la frase nombra lo que se mide con dos palabras o más («margen bruto», «horas diarias a vender»), manda la frase
    const encaja = T && q && !q.cero && (!uf || uf === T.u), ob = q ? objeto(r.especifica || t) : '';
    if (q) { r.indicador = ob.split(/\s+/).length >= 2 ? ob : encaja ? T.ind : ob || (T && T.ind) || ''; r.unidad = uf || (encaja && r.indicador === T.ind ? T.u : ''); if (q.actual) r.actual = q.actual; r.valor = q.valor; }
    else if (r.especifica && HITO.test(norm(r.especifica)) && !(V.int.VAGO && V.int.VAGO.test(norm(r.especifica)))) { r.indicador = (objeto(r.especifica) || r.especifica) + ' (hecho / no hecho)'; r.valor = 'Hecho'; r.unidad = 'hito'; }
    // Depende de él si dice lo que hará él (verbo suyo), no habla de otros y no es solo un resultado que decide el mercado
    const RESULTADO = /^(vender|facturar|crecer|captar|conseguir (mas )?clientes|tener (\d+ )?clientes|que )/;
    r.solo = !!r.especifica && !(V.int.TERCEROS && V.int.TERCEROS.test(t)) && !(V.int.VAGO && V.int.VAGO.test(norm(r.especifica))) && (T ? T.solo && !RESULTADO.test(norm(r.especifica)) : !RESULTADO.test(norm(r.especifica)));
    if (f) r.fecha = f;
    if (T && r.indicador === T.ind && T.ben) { const bn = T.ben(Object.assign({}, r), {}); if (bn) r.beneficio = bn; }
    void nt;
    return r;
  };

  /* ---------- Extraer los objetivos de las transcripciones del día ---------- */
  const transDelDia = () => {
    const l = S().transcripciones.filter((t) => (t.momento || 'primera') === 'primera' && t.usar !== false); if (!l.length) return [];
    const f = l.map((t) => t.fecha || '').sort().pop(); return f ? l.filter((t) => (t.fecha || '') === f) : l;
  };
  const clientesDe = (tr) => new Set(tr.clientes && tr.clientes.length ? tr.clientes : (tr.hablantes && tr.hablantes[0] ? [tr.hablantes[0].n] : []));
  const frases = (t) => D.frases(t, { min: 3 });
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
        const preguntaObj = /(conseguir|objetivo|quieres|quiere|c[oó]mo sabr[ií]as?|qu[eé] n[uú]mero|para cu[aá]ndo|qu[eé] ganar)/i.test(prev);
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
      const T = o.T, ob = { id: uid(), auto: 'reglas', tema: T.id, dice: (o.dice.join(' ') || '').slice(0, 300), especifica: T.esp, indicador: T.ind, actual: o.med && o.med.actual ? o.med.actual : '', valor: o.med ? o.med.valor : '', unidad: T.u, fecha: o.fecha || fechaG, responsable: '', solo: T.solo && !/\b(que (los |las )?(clientes|bancos?|proveedores)|que el banco)\b/i.test(o.dice.join(' ')), beneficio: '', contras: T.coste ? T.coste + ' (estimado: confírmelo con él)' : '', merece: urge ? 'si' : '', mereceCita: urge, como: '' };
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
  // Qué le falta a cada objetivo, dicho a la empresa (en usted)
  const FALTA_U = { E: 'escribir en una frase, empezando por un verbo, lo que hará usted.', M: 'fijar el indicador y el valor meta (y desde dónde parte).', A: 'que dependa solo de usted, no de clientes, bancos o terceros.', R: 'cuantificar lo que gana la empresa, anotar lo que cuesta y confirmar que compensa.', T: 'poner una fecha límite.' };
  const seccionObjetivos = (In) => {
    const c = clasificar(); if (!c.smart.length && !c.trabajar.length && !c.fuera.length) return '';
    const letras = (sm) => sm.map((y) => (y.ok ? '✓ ' : '✗ ') + y.k).join('  ');
    let h = '';
    h += c.smart.length ? In.table(['#', 'Objetivo SMART', 'Indicador · hoy → meta', 'Beneficio', 'Fecha', 'S M A R T'], c.smart.map((x, i) => ['O' + (i + 1), fraseObj(x.o), `${x.o.indicador}: ${x.o.actual || 'por medir'} → ${x.o.valor} ${x.o.unidad || ''}`, x.o.beneficio, fLarga(x.o.fecha), letras(x.sm)]))
      : In.callout('Todavía ningún objetivo cumple las cinco condiciones SMART. Los que ha planteado están abajo, con lo que falta para cerrarlos.', 'warn');
    if (c.trabajar.length) h += `<h4 style="margin:14px 0 6px">Objetivos que hay que trabajar</h4><p class="rp-muted" style="margin:0 0 6px">Los ha planteado, pero aún no cumplen las cinco condiciones. No se dan por objetivos hasta cerrarlos en la próxima sesión.</p>`
      + In.table(['Lo que dijo', 'Propuesta de objetivo', 'Indicador · hoy → meta', 'Beneficio', 'Qué falta'], c.trabajar.map((x) => [x.o.dice ? '«' + x.o.dice + '»' : '—', x.o.especifica || '—', x.o.indicador ? `${x.o.indicador}: ${x.o.actual || 'por medir'} → ${x.o.valor || 'por fijar'} ${x.o.unidad || ''}` : '—', x.o.beneficio || 'Por cuantificar', x.sm.filter((y) => !y.ok).map((y) => `${String(y.n).replace(/de él$/, 'de usted')}: ${FALTA_U[y.k] || y.h}`).join(' ')]));
    if (c.fuera.length) h += `<p class="rp-muted" style="margin:10px 0 0">Las condiciones del contrato o de la propuesta (por ejemplo, el componente variable) no son objetivos de la empresa y no figuran aquí.</p>`;
    return h;
  };
  V.objSmart = { leerFrase, cifrasF, extraer, aplicar, desdeTranscripciones, conClaude, clasificar, seccion: seccionObjetivos, esContrato };

  // Al procesar transcripciones de primera sesión se sacan también los objetivos
  const proc0 = V.cruce.procesar;
  V.cruce.procesar = (nuevas) => {
    const r = proc0(nuevas);
    if (nuevas.some((t) => (t.momento || 'primera') === 'primera')) desdeTranscripciones().then((a) => { if (a.n || a.quitados) { render(); toast(`${pl(a.n, 'objetivo sacado', 'objetivos sacados')} de las transcripciones del día${a.quitados ? ' (quitadas las condiciones del contrato)' : ''}: revíselos en el guion.`); } }).catch((e) => console.error(e));
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
    box.querySelectorAll('.iv-obj').forEach((d) => { const o = S().objetivos.find((x) => x.id === d.dataset.o); if (o && esContrato(o)) { const t = document.createElement('p'); t.className = 'small iv-sinr'; t.textContent = 'Esto es una condición del contrato o de la propuesta, no un objetivo de la empresa: no figura en los informes. Quítelo o reescríbalo como objetivo suyo.'; d.querySelector('.row').after(t); } else if (o && o.auto && o.firma === firma(o)) { const t = document.createElement('small'); t.className = 'iv-autot media'; t.textContent = `Sacado de la transcripción${o.auto === 'claude' ? ' con Claude' : ''}: confírmelo con él${o.mereceCita ? ` · compensa: «${o.mereceCita}»` : ''}`; d.querySelector('.row').appendChild(t); } });
    $('#ivObjT', bar).onclick = async () => { const a = await desdeTranscripciones(); render(); toast(a.trs ? `${pl(a.n, 'objetivo nuevo', 'objetivos nuevos')}${a.quitados ? `; ${pl(a.quitados, 'quitado', 'quitados')} (sin tocar o condiciones del contrato)` : ''}.` : 'No hay transcripciones de primera sesión.'); };
    $('#ivObjC', bar).onclick = async (e) => { e.target.disabled = true; e.target.textContent = 'Leyendo…'; try { const a = await conClaude(); if (!a) toast('Sin conexión con Claude o sin transcripciones: use «Sacar de las transcripciones del día».'); else { render(); toast(`${pl(a.n, 'objetivo', 'objetivos')} con Claude.`); } } catch (x) { toast('No se pudo: ' + x.message); } e.target.disabled = false; e.target.textContent = 'Sacar con Claude'; };
  };

  /* ================= INFORME INTEGRAL: LA FOTO COMPLETA ================= */
  const cargar = async (k) => { try { return await P().loadData(k); } catch (e) { return null; } };
  /* ---------- Informe de la auditoría integral: diagnóstico de la empresa ----------
     Dossier para la empresa: conclusión primero, situación con evidencia, diagnóstico por áreas, riesgos y
     oportunidades, recomendaciones, hoja de ruta y un anexo con metodología, fuentes y limitaciones.
     El sujeto es la empresa: lo que no se ha podido analizar se dice en el anexo, en una línea. */
  const ORIGEN_N = ['Simulador de inversión', 'Sistema estratégico', 'Personas y equipos', 'Mesa de trabajo'];
  const dec1 = (v) => (Math.round(v * 10) / 10).toLocaleString('es-ES');
  const eurA = (v) => (v < 0 ? '−' : '') + Math.round(Math.abs(+v || 0)).toLocaleString('es-ES') + ' €';
  const fDia = (f) => (f ? new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const fMes = (f) => (f ? new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : '—');
  const minus = (t) => { t = String(t || ''); return t.charAt(0).toLowerCase() + t.slice(1); };
  const sinPunto = (t) => String(t || '').replace(/[.\s]+$/, '');
  const aUsted = (t) => String(t || '').replace(/\s*\((estimado|estimada)[^)]*\)/gi, '').replace(/todo pasa por él/gi, 'todo pasa por una persona').replace(/\bdel empresario\b/g, 'de la dirección').replace(/\bal empresario\b/g, 'a la dirección').replace(/\bEl empresario\b/g, 'La dirección').replace(/\bel empresario\b/g, 'la dirección');
  // Los indicadores que llegan de los otros análisis se pasan a lenguaje de empresa; lo que no son datos reales de la empresa no entra
  const limpiarDatos = (datos, est) => {
    const ind = [], riesgos = [];
    (datos || []).forEach((d) => {
      const v = String(d.v), origen = ORIGEN_N.includes(v) ? v : '';
      if (/datos de ejemplo|datos aterrizados/i.test(d.k)) return;
      if (!origen) { ind.push({ k: d.k.replace(/\s*\(simulador\)/i, ''), v: v.replace(/\s*\((simulador|ficha de la empresa|personas y equipos[^)]*)\)/i, ''), st: d.st || '' }); return; }
      if (est && ((origen === ORIGEN_N[0] && !est.simulador.ok) || (origen === ORIGEN_N[1] && !est.estrategia.ok) || (origen === ORIGEN_N[2] && !est.personas.ok))) return;
      let m;
      if ((m = /^Riesgo alto: (.+)$/.exec(d.k))) { riesgos.push(m[1]); return; }
      if ((m = /^Veredicto de la inversión: (.+)$/.exec(d.k))) { ind.push({ k: 'Inversión en estudio: conclusión del análisis', v: m[1], st: 'stop' }); return; }
      m = /^En rojo: (.+?) \((.+)\)$/.exec(d.k) || /^En rojo: (.+)$/.exec(d.k);
      const k = m ? m[1] : d.k;
      if (origen === ORIGEN_N[0]) ind.push({ k: k + ' de la inversión en estudio', v: (m && m[2]) || 'Nivel crítico', st: 'stop' });
      else if (!ind.some((x) => norm(x.k) === norm(k))) ind.push({ k, v: 'Nivel crítico', st: 'stop' });
    });
    return { ind, riesgos };
  };
  const hT = (t) => { const m = /^En rojo: (.+)$/.exec(String(t || '')); return m ? m[1] + ': nivel crítico' : String(t || ''); };
  V.informes.auditoria = async () => {
    const In = I(); In.reset();
    const ST = S(); ST.informes = ST.informes || {}; ST.informes.auditoria = new Date().toISOString(); guardar();
    toast('Preparando el informe…');
    const SV = V.servicios || {};
    const [sim, mesa, cuenta, est, c0, d360] = await Promise.all([cargar('simulador'), cargar('agenda'), V.cruce.leerCuenta ? V.cruce.leerCuenta().catch(() => null) : null, V.cruce.estadoDatos ? V.cruce.estadoDatos().catch(() => null) : null, A.cifras && A.cifras.actual ? A.cifras.actual().catch(() => null) : null, SV.datos360 ? SV.datos360().catch(() => null) : null]);
    const hoyD = V.int.hoy(), r = ruta(), l = causasOrdenadas(), v20 = veinte(), conf = ST.causas.filter((x) => x.estado === 'confirmada');
    const trs = ST.transcripciones.filter((t) => (t.momento || 'primera') !== 'comercial'), FN = (V.cruce && V.cruce.FASE_N) || {}, F360 = (ST.recorrido && ST.recorrido.foto360) || {};
    const c = c0 && !c0.sinDatos && !c0.ejemplo && c0.ventas > 0 ? c0 : null, sem = c ? A.cifras.semaforos(c) : [], luzDe = (k) => sem.find((x) => x.k === k);
    const Y = sim && sim.historico && !sim.historico.ejemplo && SV.aniosDe ? SV.aniosDe(sim) : [], an = c && Y.length >= 2 && SV.analisisDinero ? SV.analisisDinero(Y) : null;
    const pill = (st, t) => (st ? { h: In.pill(st, t || ST_N[st] || '') } : '—');
    const porArea = {}; D.AREAS.forEach((a) => { porArea[a.id] = limpiarDatos(cuenta && cuenta.out[a.id] ? cuenta.out[a.id].datos : [], est); });
    const indDe = (a, k) => (porArea[a].ind.find((x) => x.k === k) || null);
    const p1 = indDe('com', 'Peso del primer cliente'), p3 = indDe('com', 'Peso de los tres primeros');
    const acc = (ST.plan && ST.plan.acciones) || [], oc = clasificar(), top = r[0];
    const cts = D.CONSTANTES.filter((x) => cte(x.id)), crit = cts.filter((x) => cte(x.id) >= 4);
    const a0 = an ? an.F[0].anio : null, a1 = an ? an.F[an.F.length - 1].anio : null;
    const ambito = [c ? 'finanzas y caja' : '', ...r.map((x) => x.a.n.toLowerCase())].filter((x, i, arr) => x && arr.indexOf(x) === i);
    const periodo = an ? `ejercicios ${Y[0].anio}-${a1}` : c && c.anio ? `ejercicio ${c.anio}` : '';
    let h = In.cover({ empresa: empresa(), tipo: 'Auditoría integral', kicker: 'Informe de diagnóstico', titulo: 'Diagnóstico integral de la empresa', subtitulo: [`Situación a ${fLarga(hoyD)}`, ambito.length ? 'Ámbito: ' + ambito.slice(0, 6).join(', ') : '', periodo ? 'Periodo analizado: ' + periodo : ''].filter(Boolean).join(' · ') });

    /* Resumen ejecutivo: la conclusión primero y de tres a cinco mensajes, cada uno con su cifra */
    const sinNada = !c && !r.length && !l.length && !cts.length && !oc.smart.length && !oc.trabajar.length;
    const rojo = sem.filter((x) => x.st === 'stop');
    const lead = sinNada ? 'A la fecha de este informe no se dispone de información económica ni de entrevistas con la dirección que permitan emitir un diagnóstico. El anexo detalla la información necesaria para elaborarlo.'
      : an && an.cajaAc < 0 && an.benAc > 0 ? 'La empresa gana dinero, pero no lo convierte en caja. La prioridad es la liquidez: cobrar antes y dejar de financiar el crecimiento con la tesorería.'
      : rojo.length ? 'La situación económica exige actuar a corto plazo. ' + rojo.map((x) => x.d).filter(Boolean).join(' ')
      : top ? `La prioridad de la empresa está en ${top.a.n.toLowerCase()}${top.cs[0] ? ': ' + minus(sinPunto(top.cs[0].t)) : ''}.`
      : c && sem.length && sem.every((x) => x.st === 'ok') ? 'Las magnitudes económicas analizadas están dentro de los umbrales de referencia.' : '';
    const msgs = [];
    if (an && !(an.cajaAc < 0 && an.benAc > 0)) msgs.push(an.lect[0]);
    if (an && an.cajaAc < 0 && an.benAc > 0) msgs.push(`Entre ${a0} y ${a1} el beneficio acumulado fue de ${eurA(an.benAc)} y la caja bajó ${eurA(Math.abs(an.cajaAc))}${an.atrAc > 0 ? `; ${eurA(an.atrAc)} quedaron retenidos en clientes y existencias` : ''}.`);
    if (c && c.ebitda != null) msgs.push(`Las ventas anuales son de ${eurA(c.ventas)} y el beneficio del negocio (EBITDA), de ${eurA(c.ebitda)}: el ${dec1(c.ebitdaPct)} % de las ventas.`);
    if (c && c.mesesCaja != null) msgs.push(`La caja de ${eurA(c.caja)} cubre ${dec1(c.mesesCaja)} meses de costes${c.deudaEbitda != null ? ` y la deuda neta equivale a ${dec1(c.deudaEbitda)} veces el EBITDA` : ''}.`);
    if (p1) msgs.push(`El primer cliente concentra el ${p1.v} de las ventas${p3 ? ` y los tres primeros, el ${p3.v}` : ''}.`);
    if (l.length) msgs.push(`El diagnóstico identifica ${pl(l.length, 'causa', 'causas')} de fondo${conf.length ? `, ${conf.length} de ellas ${conf.length === 1 ? 'confirmada' : 'confirmadas'} con evidencia` : ', pendientes de contraste documental'}${top ? `. El área prioritaria es ${top.a.n.toLowerCase()}` : ''}.`);
    if (acc.length) msgs.push(`Se proponen ${pl(acc.length, 'acción', 'acciones')}, ${acc.filter((a) => a.clave).length} de ellas prioritarias, con horizonte en ${fMes(acc.reduce((m, a) => (a.fecha > m ? a.fecha : m), ''))}.`);
    const kp = c ? [{ k: 'Ventas anuales', v: eurA(c.ventas), d: c.anio ? 'Ejercicio ' + c.anio : '' }, { k: 'Beneficio del negocio (EBITDA)', v: c.ebitda == null ? '—' : eurA(c.ebitda), d: c.ebitdaPct == null ? '' : dec1(c.ebitdaPct) + ' % de las ventas', st: (luzDe('ebitda') || {}).st }, { k: 'Caja', v: c.caja == null ? '—' : eurA(c.caja), d: c.mesesCaja == null ? '' : dec1(c.mesesCaja) + ' meses de costes', st: (luzDe('caja') || {}).st }, { k: 'Deuda neta / EBITDA', v: c.deudaEbitda == null ? '—' : dec1(c.deudaEbitda) + ' veces', d: c.deuda == null ? '' : 'Deuda bancaria de ' + eurA(c.deuda), st: (luzDe('deudaEbitda') || {}).st }]
      : r.length ? [{ k: 'Áreas con prioridad alta', v: String(r.filter((x) => x.n === 'stop').length), d: `de ${r.length} analizadas` }, { k: 'Causas identificadas', v: String(l.length), d: pl(conf.length, 'confirmada', 'confirmadas') }, { k: 'Objetivos de la dirección', v: String(oc.smart.length + oc.trabajar.length), d: oc.smart.length ? pl(oc.smart.length, 'definido', 'definidos') + ' por completo' : 'en definición' }] : [];
    h += In.summary('Resumen ejecutivo', (lead ? `<p><b>${esc(lead)}</b></p>` : '') + (msgs.length ? `<ul>${msgs.slice(0, 5).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''), sinNada ? '' : rojo.length || (an && an.st === 'stop') ? 'stop' : '') + In.kpis(kp);

    /* Situación económico-financiera */
    if (c) {
      const e = sim.empresa || {}, eco = (d360 && d360.economica) || [], fin = (d360 && d360.financiero) || [], de = (lista, k) => lista.find((x) => x.k.indexOf(k) === 0);
      const pe = de(eco, 'Punto de equilibrio'), mb = de(eco, 'Margen bruto'), pp = de(eco, 'Peso del personal'), dc = de(fin, 'Deuda a corto'), au = de(fin, 'Autonomía');
      const filas = [['Ventas anuales', eurA(c.ventas), '—']];
      if (c.margen != null) filas.push(['Margen bruto', dec1(c.margen) + ' %', pill(mb && mb.st)]);
      if (c.personal != null) filas.push(['Coste de personal', `${eurA(c.personal)} (${dec1(c.personal / c.ventas * 100)} % de las ventas)`, pill(pp && pp.st)]);
      if (c.fijos != null) filas.push(['Gastos fijos', `${eurA(c.fijos)} (${dec1(c.fijos / c.ventas * 100)} % de las ventas)`, '—']);
      if (c.ebitda != null) filas.push(['Beneficio del negocio (EBITDA)', `${eurA(c.ebitda)} (${dec1(c.ebitdaPct)} % de las ventas)`, pill((luzDe('ebitda') || {}).st)]);
      if (pe) filas.push(['Punto de equilibrio', pe.v + (c.ventas ? ` (las ventas lo superan en un ${dec1((c.ventas - parseFloat(String(pe.v).replace(/[^\d]/g, ''))) / c.ventas * 100)} %)` : ''), pill(pe.st)]);
      if (c.caja != null) filas.push(['Caja', eurA(c.caja) + (c.mesesCaja != null ? ` (${dec1(c.mesesCaja)} meses de costes)` : ''), pill((luzDe('caja') || {}).st)]);
      if (c.deuda != null) filas.push(['Deuda bancaria', eurA(c.deuda), '—']);
      if (c.deudaEbitda != null) filas.push(['Deuda neta / EBITDA', dec1(c.deudaEbitda) + ' veces', pill((luzDe('deudaEbitda') || {}).st)]);
      if (dc && dc.v !== '—') filas.push(['Deuda a corto plazo sobre el total', dc.v, pill(dc.st)]);
      if (au && au.v !== '—') filas.push(['Autonomía financiera (fondos propios / activo)', au.v, pill(au.st)]);
      if (+e.polizaLimite > 0) filas.push(['Póliza de crédito', `${eurA(e.polizaDispuesta || 0)} dispuestos de ${eurA(e.polizaLimite)} (${Math.round((e.polizaDispuesta || 0) / e.polizaLimite * 100)} %)`, pill((e.polizaDispuesta || 0) / e.polizaLimite > 0.8 ? 'stop' : (e.polizaDispuesta || 0) / e.polizaLimite > 0.5 ? 'warn' : 'ok')]);
      if (+e.dso > 0) filas.push(['Plazos de cobro · existencias · pago', `${e.dso || 0} · ${e.dio || 0} · ${e.dpo || 0} días`, '—']);
      const rent = c.ebitda == null ? '' : c.ebitda <= 0 ? 'El negocio no genera resultado operativo' : c.ebitdaPct < 5 ? `El margen operativo es estrecho (EBITDA del ${dec1(c.ebitdaPct)} % de las ventas)` : `El negocio es rentable (EBITDA del ${dec1(c.ebitdaPct)} % de las ventas)`;
      const liq = c.mesesCaja == null ? '' : c.mesesCaja < 1 ? 'la caja no cubre un mes de costes' : c.mesesCaja < 2 ? `la caja cubre solo ${dec1(c.mesesCaja)} meses de costes` : `la caja cubre ${dec1(c.mesesCaja)} meses de costes`;
      const titulo = an && an.cajaAc < 0 && an.benAc > 0 ? `La empresa ganó ${eurA(an.benAc)} entre ${a0} y ${a1}, pero la caja bajó ${eurA(Math.abs(an.cajaAc))}` : rent && liq ? `${rent}${(c.ebitda > 0) === (c.mesesCaja >= 2) ? ' y ' : ', pero '}${liq}` : rent || 'Situación económico-financiera';
      const notas = ['caja', 'economica', 'financiero'].map((k) => (F360[k] || {}).nota).filter(Boolean);
      h += In.section(titulo, In.table(['Magnitud', 'Valor', 'Valoración'], filas)
        + (sem.filter((x) => x.d).length ? `<p style="margin:8px 0 2px"><b>Qué significa para la empresa</b></p><ul style="margin:0">${sem.filter((x) => x.d).map((x) => `<li>${esc(x.t)} (${esc(x.v)}): ${esc(minus(x.d))}</li>`).join('')}</ul>` : '')
        + (an ? `<h4 style="margin:14px 0 6px">Beneficio frente a caja, ${a0}-${a1}</h4><ul style="margin:0 0 8px">${an.lect.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` + In.table(['Año', 'Beneficio', 'Variación de caja', 'Retenido en clientes y existencias', 'Inversión', 'Variación de deuda', 'Días de cobro'], an.F.map((x) => [String(x.anio), eurA(x.bn), eurA(x.caja), eurA(x.atrapado), eurA(x.capex), eurA(x.deuda), x.dso ? String(Math.round(x.dso)) : '—']), { num: [1, 2, 3, 4, 5, 6] }) : '')
        + (notas.length ? `<p style="margin:10px 0 2px"><b>Valoración del consultor</b></p>${notas.map((t) => `<p style="margin:0 0 4px">${esc(t)}</p>`).join('')}` : ''),
        `Cifras ${c.anio ? 'del ejercicio ' + c.anio : 'facilitadas por la empresa'}${an ? `, con la evolución desde ${Y[0].anio}` : ''}.`);
    }

    /* Señales de la dirección y la organización (valoración cualitativa de las entrevistas) */
    if (cts.length) h += In.section(crit.length ? `${crit.length === 1 ? 'Una' : crit.length} de las ${cts.length} señales de la dirección ${crit.length === 1 ? 'está' : 'están'} en nivel crítico: ${crit.map((x) => x.n.toLowerCase()).join(', ')}` : 'Las señales de la dirección no muestran tensiones críticas',
      `<div class="pdf-keep" style="max-width:560px;margin:0 0 10px">${monitor('claro')}</div>` + In.table(['Señal', 'Qué mide', 'Lectura', 'Nivel'], cts.map((x) => [x.n, aUsted(minus(x.q)), cte(x.id) + '/5 · ' + aUsted(x.e[cte(x.id) - 1]), pill(D.nivelConst(cte(x.id)))])),
      'Valoración cualitativa a partir de las entrevistas con la dirección, de 1 (situación favorable) a 5 (situación grave).');

    /* Diagnóstico por áreas: conclusión en el título, evidencia y lo que significa */
    const PRIO = { stop: 'alta (actuar en un plazo de 0 a 14 días)', warn: 'media (resolver este trimestre)', ok: 'baja (programable)' }, NOTA_A = { com: 'abc', ope: 'operativo' };
    const yaFin = /^(Facturación|Margen bruto|Beneficio del negocio|Años de beneficio|Caja|Deuda)/;
    const pendV = [], riesgosOp = [];
    const areas = r.map((x) => x.a.id).concat(D.AREAS.map((a) => a.id)).filter((id, i, arr) => arr.indexOf(id) === i);
    areas.forEach((id) => {
      const a = D.area(id), x = r.find((y) => y.a.id === id), ss = x ? x.ss : [], cs = l.filter((y) => y.c.area === id).map((y) => y.c);
      const ind = porArea[id].ind.filter((d) => !(id === 'fin' && c && yaFin.test(d.k)) && !(d.k === 'Plantilla' && porArea[id].ind.some((y) => /^Trabajadores/.test(y.k)))), hs = ST.hallazgos.filter((hh) => hh.area === id).sort((p, q) => (+q.gravedad || 0) - (+p.gravedad || 0));
      porArea[id].riesgos.forEach((t) => riesgosOp.push({ t, a: a.n }));
      const v = ST.verifica[id] || {}, vs = (D.VERIFICA[id] || []).map((q, i) => ({ q, e: (v[i] || {}).e || 'pend', nota: (v[i] || {}).nota || '' }));
      const hechas = vs.filter((y) => y.e === 'ok' || y.e === 'desv');
      if (x && vs.some((y) => y.e === 'pend')) pendV.push(`${a.n}: ${vs.filter((y) => y.e === 'pend').map((y) => minus(y.q)).join('; ')}`);
      const nota = (F360[NOTA_A[id]] || {}).nota;
      if (!ss.length && !cs.length && !ind.length && !hs.length && !hechas.length && !nota) return;
      const cc = cs.find((y) => y.estado === 'confirmada'), peor = ind.find((d) => d.st === 'stop');
      const concl = cc ? minus(sinPunto(cc.t)) : hs.length ? minus(sinPunto(hT(hs[0].t))) : cs.length ? minus(sinPunto(cs[0].t)) + ' (hipótesis por contrastar)' : peor ? minus(peor.k) + (peor.v && peor.v !== 'Nivel crítico' ? ' de ' + peor.v : ' en nivel crítico') : ind.some((d) => d.st === 'warn') ? 'indicadores que conviene vigilar' : 'sin incidencias relevantes';
      const mc = cc || cs.find((y) => y.estado !== 'descartada'), ct = mc && mc.ref && V.primeraInterno && V.primeraInterno.causaTxt ? V.primeraInterno.causaTxt(mc.ref) : null, pt = mc && mc.patron && !(mc.patron === 'limite' && id !== 'ope') ? D.patron(mc.patron) : null;
      const signif = [ct && ct.q, pt && pt.cuesta].filter(Boolean).join(' '), citas = ss.filter((s) => s.cita).slice(0, 3);
      h += In.section(`${a.n}: ${concl}`,
        (x && x.n ? `<p><b>Prioridad ${esc(PRIO[x.n])}.</b> ${x.pr && PRIN_A[x.pr.p] ? esc(PRIN_A[x.pr.p]) : ''}</p>` : '')
        + (ind.length ? In.table(['Indicador', 'Valor', 'Valoración'], ind.map((d) => [d.k, d.v, pill(d.st)])) : '')
        + (hs.length ? In.table(['Hallazgo', 'Gravedad', 'Fuente'], hs.map((hh) => [hT(hh.t), (hh.gravedad || '—') + '/5', hh.origen === 'ecosistema' ? 'Datos de la empresa' : 'Comprobación documental'])) : '')
        + (hechas.length ? In.table(['Comprobación realizada', 'Resultado', 'Evidencia'], hechas.map((y) => [y.q, pill(y.e === 'ok' ? 'ok' : 'stop', y.e === 'ok' ? 'Conforme' : 'Desviación'), y.nota || '—'])) : '')
        + (citas.length ? `<p style="margin:8px 0 2px"><b>Lo que dice la dirección</b></p><ul style="margin:0">${citas.map((s) => `<li><i>«${esc(s.cita.replace(/^[«"]|[»"]$/g, ''))}»</i></li>`).join('')}</ul>` : '')
        + (cs.length ? `<p style="margin:8px 0 2px"><b>Causas</b></p><ul style="margin:0">${cs.map((y) => `<li>${esc(y.t)} · ${y.estado === 'confirmada' ? 'confirmada' : y.estado === 'descartada' ? 'descartada' : 'hipótesis por contrastar'}</li>`).join('')}</ul>` : '')
        + (signif ? `<p style="margin:8px 0 0"><b>Qué significa para la empresa:</b> ${esc(aUsted(signif))}</p>` : '')
        + (nota ? `<p style="margin:8px 0 0"><b>Valoración del consultor:</b> ${esc(nota)}</p>` : ''));
    });

    /* Causas de fondo */
    if (l.length) h += In.section(`${pl(l.length, 'causa de fondo explica', 'causas de fondo explican')} lo observado${conf.length ? `; ${conf.length === 1 ? 'una está confirmada' : conf.length + ' están confirmadas'}` : ''}`,
      In.table(['Causa', 'Área', 'Síntomas que explica', 'Estado', 'Prioridad'], l.map((x) => [x.c.t, (D.area(x.c.area) || {}).n || '', String(x.ss.length), x.c.estado === 'confirmada' ? { h: In.pill('stop', 'Confirmada') } : x.c.estado === 'descartada' ? 'Descartada' : 'Hipótesis', v20.has(x.c.id) ? 'Alta' : 'Media'])),
      'Prioridad alta: las causas que concentran la mayor parte de la gravedad observada.');

    /* Riesgos y oportunidades */
    const riesgos = [];
    sem.filter((x) => x.st !== 'ok' && x.d).forEach((x) => riesgos.push([sinPunto(x.d), `${x.t}: ${x.v}`, x.st]));
    if (p1 && p1.st && p1.st !== 'ok') riesgos.push(['Concentración de las ventas en pocos clientes', `El primer cliente representa el ${p1.v}${p3 ? ' y los tres primeros, el ' + p3.v : ''}`, p1.st]);
    riesgosOp.forEach((x) => riesgos.push([x.t, 'Análisis de ' + x.a.toLowerCase(), 'stop']));
    ST.hallazgos.filter((hh) => +hh.gravedad >= 4).forEach((hh) => riesgos.push([hT(hh.t), (hh.origen === 'ecosistema' ? 'Datos de la empresa · ' : 'Comprobación documental · ') + ((D.area(hh.area) || {}).n || ''), +hh.gravedad >= 5 ? 'stop' : 'warn']));
    crit.forEach((x) => riesgos.push([aUsted(x.e[cte(x.id) - 1]), `Entrevistas con la dirección · ${x.n.toLowerCase()} ${cte(x.id)}/5`, cte(x.id) >= 5 ? 'stop' : 'warn']));
    const opos = [];
    if (an) { const f0 = an.F[0], u = an.F[an.F.length - 1]; if (f0.dso && u.dso && u.dso - f0.dso > 7 && u.ventas) opos.push(`Volver al plazo de cobro de ${f0.anio} (${Math.round(f0.dso)} días frente a los ${Math.round(u.dso)} actuales) liberaría en torno a ${eurA((u.dso - f0.dso) * u.ventas / 365)} de caja.`); }
    oc.smart.concat(oc.trabajar).forEach((y) => { if (y.o.beneficio && !/^sin cuantificar/i.test(y.o.beneficio)) opos.push(`${sinPunto(y.o.especifica || y.o.dice)}: ${minus(sinPunto(aUsted(y.o.beneficio)))}.`); });
    if (riesgos.length || opos.length) h += In.section('Riesgos y oportunidades',
      (riesgos.length ? In.table(['Riesgo', 'Evidencia', 'Nivel'], riesgos.slice(0, 12).map((x) => [x[0], x[1], pill(x[2], x[2] === 'stop' ? 'Alto' : 'Medio')])) : '')
      + (opos.length ? `<p style="margin:10px 0 2px"><b>Oportunidades</b></p><ul style="margin:0">${opos.slice(0, 5).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''));

    /* Objetivos de la dirección */
    const so = seccionObjetivos(In); if (so) h += In.section('Los objetivos de la dirección', so, 'Lo que la dirección quiere conseguir, contrastado con cinco condiciones: específico, medible, que depende de la propia empresa, rentable y con fecha.');

    /* Recomendaciones priorizadas */
    const resp = (a) => a.responsable || (a.quien === 'empresa' ? 'Dirección de la empresa' : 'Equipo consultor');
    const ENT = { '—': '', 'Artefacto que cierra la causa': 'Causa resuelta y documentada' };
    if (acc.length) {
      const rec = acc.filter((a) => a.estado !== 'hecha').sort((p, q) => (+!!q.clave - +!!p.clave) || p.f - q.f || p.fecha.localeCompare(q.fecha)).slice(0, 8);
      if (rec.length) h += In.section('Recomendaciones priorizadas', In.table(['#', 'Recomendación', 'Resultado esperado', 'Responsable', 'Plazo'], rec.map((a, i) => [String(i + 1), a.t.replace(/^Corregir: (.)/, (m, x) => 'Corregir la desviación: ' + x.toLowerCase()).replace(/^Resolver: (.)/, (m, x) => 'Resolver: ' + x.toLowerCase()), [a.ent in ENT ? ENT[a.ent] : a.ent].concat((a.kpis || []).filter((k) => k.n && k.meta).map((k) => `${k.n}: ${k.actual || '—'} → ${k.meta}`)).filter(Boolean).join(' · ') || '—', resp(a), fDia(a.fecha) + (a.fecha && a.fecha < hoyD ? ' (con retraso)' : '')])),
        'Ordenadas por el principio que protegen: primero la liquidez, después la rentabilidad y después el crecimiento, con la organización como base de las tres.');
    } else if (l.length) h += In.section('Recomendaciones priorizadas', In.table(['#', 'Causa que hay que resolver', 'Primer paso', 'Área'], l.filter((x) => x.c.estado !== 'descartada').slice(0, 6).map((x, i) => [String(i + 1), x.c.t, x.c.estado === 'confirmada' ? 'Definir la acción correctora, con responsable y fecha' : 'Contrastarla con: ' + minus((D.VERIFICA[x.c.area] || ['la documentación del área'])[0]), (D.area(x.c.area) || {}).n || ''])),
      'Ordenadas por el principio que protegen: primero la liquidez, después la rentabilidad y después el crecimiento.');

    /* Hoja de ruta y próximos pasos */
    const fut = ST.sesiones.filter((s) => s.fecha >= hoyD).slice(0, 4), metas = mesa && Array.isArray(mesa.metas) ? mesa.metas.filter((m) => m.estado !== 'archivada' && m.estado !== 'cumplida' && (m.especifica || m.objetivo)) : [];
    let hr = '';
    if (acc.length) {
      const hechas = acc.filter((a) => a.estado === 'hecha').length, tarde = acc.filter((a) => a.estado !== 'hecha' && a.fecha && a.fecha < hoyD).length;
      hr += In.table(['Fase', 'Qué se consigue', 'Periodo', 'Acciones', 'Hitos'], D.FASES.map((F) => { const la = acc.filter((a) => +a.f === F.id); if (!la.length) return null; const fs = la.map((a) => a.fecha).sort(); return [`${F.id}. ${F.n}`, aUsted(F.d), fs[0] === fs[fs.length - 1] ? fDia(fs[0]) : `${fDia(fs[0])} → ${fDia(fs[fs.length - 1])}`, String(la.length), la.filter((a) => a.clave).map((a) => (a.ent in ENT ? ENT[a.ent] : a.ent)).filter(Boolean).filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 3).join(' · ') || '—']; }).filter(Boolean));
      if (hechas || tarde) hr += `<p style="margin:6px 0 0">A la fecha de este informe, ${hechas} de las ${acc.length} acciones están completadas${tarde ? ` y ${tarde} ${tarde === 1 ? 'supera' : 'superan'} la fecha prevista` : ''}.</p>`;
    }
    if (fut.length) hr += `<p style="margin:10px 0 2px"><b>Próximas sesiones de trabajo</b></p>` + In.table(['Fecha', 'Sesión', 'Objetivo'], fut.map((s) => [fDia(s.fecha), D.TIPOS_SESION[s.tipo] || s.tipo, aUsted(s.obj) || '—']));
    if (metas.length) hr += `<p style="margin:10px 0 2px"><b>Metas en curso</b></p>` + In.table(['Meta', 'Indicador', 'Fecha'], metas.slice(0, 8).map((m) => [m.especifica || m.objetivo, m.indicador ? `${m.indicador}: ${m.actual || 'por medir'} → ${m.valor || 'por fijar'} ${m.unidad || ''}` : '—', m.fecha ? fDia(m.fecha) : '—']));
    if (!hr) hr = `<ol>${[!trs.length ? 'Sesión de diagnóstico con la dirección: situación, prioridades y objetivos.' : '', !c ? 'Análisis económico-financiero con las cuentas de los últimos ejercicios.' : '', l.some((x) => x.c.estado !== 'confirmada' && x.c.estado !== 'descartada') ? 'Contraste documental de las hipótesis por áreas.' : '', 'Plan de actuación con responsables, fechas y resultados esperados.'].filter(Boolean).map((t) => `<li>${t}</li>`).join('')}</ol>`;
    h += In.section('Hoja de ruta y próximos pasos', hr, acc.length ? 'Las fechas son orientativas y se revisan en cada sesión de seguimiento.' : '');

    /* Anexo: metodología, fuentes y limitaciones */
    const docs = [...new Set(D.AREAS.flatMap((a) => (cuenta && cuenta.out[a.id] ? cuenta.out[a.id].docs : []).map((d) => String(d.n).replace(/\.(txt|pdf|docx?|xlsx?|csv|md)$/i, ''))))];
    const fu = [];
    if (trs.length) fu.push(['Entrevistas con la dirección', trs.map((t) => `${FN[t.momento || 'primera'] || 'Sesión'} (${fDia(t.fecha)})`).join('; ')]);
    if (c) fu.push(['Información económico-financiera', an ? `Cuentas de los ejercicios ${Y[0].anio} a ${a1}` : c.anio ? `Cuentas del ejercicio ${c.anio}` : 'Cifras facilitadas por la empresa']);
    if (est && est.estrategia.ok && porArea.com.ind.length) fu.push(['Clientes y ventas', 'Relación de clientes con sus ventas, márgenes y plazos de cobro']);
    if (est && est.personas.ok) fu.push(['Plantilla y organización', 'Relación de personas, puestos y equipos']);
    if (docs.length) fu.push(['Documentos aportados por la empresa', docs.join('; ')]);
    const lim = [];
    if (!trs.length) lim.push('No se han mantenido todavía entrevistas con la dirección: el informe no recoge sus prioridades ni sus objetivos.');
    if (!c) lim.push('No se ha dispuesto de las cuentas de la empresa (balance y cuenta de resultados): el informe no incluye análisis económico-financiero.');
    else if (!an) lim.push('No se ha dispuesto de cuentas de al menos dos ejercicios: no se analiza la evolución del beneficio frente a la caja.');
    if (est && !est.estrategia.ok) lim.push('No se ha dispuesto de la relación de clientes, ventas, compras y cobros: no se analizan la concentración de clientes ni el margen por cliente.');
    if (est && !est.personas.ok) lim.push('No se ha dispuesto de la plantilla con sus puestos y equipos: el análisis de la organización se basa en las entrevistas.');
    if (pendV.length) lim.push('Queda por contrastar documentalmente: ' + pendV.join('. ') + '.');
    const hip = l.filter((x) => x.c.estado !== 'confirmada' && x.c.estado !== 'descartada').length; if (hip) lim.push(`${hip === 1 ? 'Una de las causas es una hipótesis' : hip + ' de las causas son hipótesis'} de trabajo: se ${hip === 1 ? 'confirma o descarta' : 'confirman o descartan'} con la documentación anterior.`);
    lim.push('Las cifras proceden de la información facilitada por la empresa y no han sido auditadas. Las cuestiones fiscales, laborales y societarias requieren la validación de los asesores de la empresa.');
    h += In.section('Anexo: metodología, fuentes y limitaciones',
      `<p><b>Metodología.</b> El diagnóstico combina las entrevistas con la dirección, el análisis de las cuentas y de los datos de clientes, operaciones y plantilla, y la comprobación documental por áreas. Las áreas se ordenan por el principio que protegen: primero la liquidez (que la empresa pueda pagar), después la rentabilidad (que gane dinero con lo que hace) y después el crecimiento; la organización sostiene las tres. Una causa se da por confirmada solo cuando la documentación la respalda.</p>`
      + (fu.length ? `<p style="margin:8px 0 2px"><b>Fuentes</b></p>` + In.table(['Fuente', 'Detalle'], fu) : '')
      + `<p style="margin:8px 0 2px"><b>Alcance y limitaciones</b></p><ul style="margin:0">${lim.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`);
    h += In.foot('Informe de diagnóstico de la auditoría integral. Las causas no confirmadas son hipótesis de trabajo; las cifras proceden de la información facilitada por la empresa.');
    In.open({ titulo: 'Auditoría integral · ' + empresa(), html: h, clave: 'iv:auditoria' });
  };
  const PRIN_A = { liquidez: 'Afecta a la liquidez: a que la empresa pueda pagar.', rentabilidad: 'Afecta a la rentabilidad: a que la empresa gane dinero con lo que hace.', crecimiento: 'Afecta al crecimiento.', organizacion: 'Afecta a la organización, que sostiene la liquidez, la rentabilidad y el crecimiento.' };
  // La tarjeta del informe integral explica que recoge todo
  const inf0 = VISTAS.informes;
  VISTAS.informes = (host) => { inf0(host); const b = host.querySelector('[data-inf="auditoria"]'); const card = b && b.closest('.iv-inf'); const p = card && card.querySelector('p'); if (p) p.textContent = 'El diagnóstico de la empresa, con la conclusión primero: resumen ejecutivo con sus cifras, situación económico-financiera, diagnóstico por áreas con su evidencia, riesgos y oportunidades, recomendaciones priorizadas, hoja de ruta y un anexo de fuentes y limitaciones. Se rehace con los datos del día.'; };
})();
