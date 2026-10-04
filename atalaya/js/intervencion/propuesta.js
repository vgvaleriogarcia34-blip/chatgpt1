/* Atalaya 360° · Auditoría integral · Propuesta comercial
   Sale de la primera sesión: lo escuchado, los objetivos del empresario, las causas del 20 % y el plan.
   Dos modelos que se combinan:
   · Proyecto llave en mano: pasos con entregable, precio cerrado y pago por hitos.
   · Programa de implantación: cuotas fijas y, si se pacta, un componente variable ligado a objetivos
     que dependen al 100 % de la empresa (cada parte asume su responsabilidad).
   El precio se plantea por valor: la inversión es una parte pequeña del valor que se genera o de la
   pérdida que se evita, y el retorno se enseña con sus supuestos.
   El dossier se maqueta en hojas A4 (portada, índice, situación, riesgo, lo que obtienen, protocolo,
   equipo, llave en mano, coste de no hacerlo, inversión, objetivos, siguiente paso y contraportada). */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { D, E, $, $$, esc, uid, hoy, sumar, fLarga, pl, guardar, toast, empresa, causasOrdenadas, veinte, ruta, render, VISTAS, fraseObj, evalObj } = V.int;
  const S = () => V.int.st();
  const P = () => A.platform;

  /* ---------- Formato ---------- */
  // «1.500.000» y «1.500,50» son miles; «1.5» o «1,5» son decimales
  const num = (v) => { const t = String(v == null ? '' : v).trim().replace(/\s|€|%/g, ''); const n = /^-?\d+\.\d{1,2}$/.test(t) ? parseFloat(t) : parseFloat(t.replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  // Separador de miles también en cuatro cifras (7.500 €), como en los documentos de referencia
  const eur = (n, dec) => { const v = Math.abs(+n || 0).toFixed(dec ? 2 : 0).split('.'); return ((+n || 0) < 0 ? '−' : '') + v[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (v[1] ? ',' + v[1] : '') + ' €'; };
  const corto = (n) => (n >= 1e6 ? (n / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' M€' : n >= 1e4 ? Math.round(n / 1000).toLocaleString('es-ES') + '.000 €' : eur(n));
  const xx = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString('es-ES') + '×';
  const redondea = (n, a) => Math.round(n / (a || 500)) * (a || 500);
  const mesAnio = (s) => new Date((s || hoy()) + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);

  /* ---------- Ficha de la firma (una por consultor, para todas sus propuestas) ---------- */
  const FK = () => (P() && P().k ? P().k('atalaya.firma') : 'atalaya.firma');
  const firma = () => {
    let f = {}; try { f = JSON.parse(localStorage.getItem(FK())) || {}; } catch (e) { f = {}; }
    const u = (P() && P().user) || {};
    return Object.assign({ nombre: 'Business Avance', lema: 'Consultoría para pymes', descripcion: 'Consultoría para la empresa: gobierno, finanzas, equipos y claridad en las decisiones que sostienen el negocio.', consultor: u.nombre || '', cargo: 'Director del proyecto', razon: '', cif: '', direccion: '', ciudad: '', email: u.email || '', tel: '' }, f);
  };
  const ponFirma = (f) => { try { localStorage.setItem(FK(), JSON.stringify(f)); } catch (e) { /* sin almacenamiento */ } };
  const marca = (f, cls) => { const w = String(f.nombre || '').trim().split(/\s+/); const a = w.length > 1 ? w.slice(0, Math.ceil(w.length / 2)).join(' ') : w[0] || '', b = w.length > 1 ? w.slice(Math.ceil(w.length / 2)).join(' ') : ''; return `<div class="pc-marca ${cls || ''}"><b>${esc(a)}${b ? `<i>${cls === 'mini' ? ' ' : '<br>'}${esc(b)}</i>` : ''}</b><span>${esc(f.lema)}${/™$/.test(f.lema || '') ? '' : ''}</span></div>`; };

  /* ---------- Textos de partida ---------- */
  const CONSEC = { responsable: 'Todo sube al empresario y los fallos no tienen dueño.', limite: 'Se decide a ojo y el coste aparece tarde.', metodo: 'La calidad depende de quién lo haga ese día.', puesto: 'Personas desbordadas y mandos sin autoridad.', dato: 'Se decide de oído y se corrige tarde.', fecha: 'Proyectos que no se cierran nunca.', mando: 'Decisiones que se revocan en el pasillo.' };
  const GANA = { responsable: ['Autonomía', 'Elimina el cuello de botella en el empresario.'], limite: ['Control', 'Elimina las decisiones a ojo.'], metodo: ['Método', 'Elimina la dependencia de la memoria.'], puesto: ['Equipo con funciones', 'Elimina el «hace de todo».'], dato: ['Decisiones con dato', 'Elimina la información tardía.'], fecha: ['Proyectos que se cierran', 'Elimina lo pendiente sin fecha.'], mando: ['Gobierno claro', 'Elimina el mando difuso.'] };
  const RIESGO_TIPO = [
    { r: 'Dependencia del empresario', q: 'Si falta unas semanas, la operativa y las decisiones se paran.', imp: 'Ventas y servicio en riesgo durante la ausencia' },
    { r: 'Crecimiento sin estructura', q: 'Más volumen con los mismos huecos: más errores, más horas y menos margen.', imp: 'Margen que se pierde en reprocesos y urgencias' },
    { r: 'Tensión de caja', q: 'Sin previsión, los pagos se descubren tarde y se financian caro.', imp: 'Coste financiero evitable y decisiones forzadas' },
    { r: 'Personas clave', q: 'Quien sostiene la operativa se cansa o se va con el conocimiento.', imp: 'Meses para recuperar el nivel de servicio' },
    { r: 'Lo que no tiene precio', q: 'Desgaste del empresario, de la familia y del equipo.', imp: 'Irreversible' }
  ];
  const vacia = () => ({
    v: 1, tipo: 'llave', generada: '', t1: 'Proyecto de', t2: 'transformación', subtitulo: '', alcance: '', duracion: '', ciudad: '', fecha: hoy(), validez: 30, cifra: '',
    idx: { a: 'Que la empresa trabaje', b: 'para sus socios,', c: 'y no al revés.', texto: '' },
    sit: { h1: 'Hoy, la empresa depende', h2: 'de muy pocas manos.', intro: '', items: [] },
    riesgo: { on: true, h1: 'Lo que nadie ha escrito se decide', h2: 'en el peor momento.', intro: 'Es la secuencia habitual cuando una empresa crece sin ordenar sus huecos. Escenario ilustrativo.', linea: [], stats: [] },
    obtienen: { h1: 'Un sistema que funciona', h2: 'sin depender de nadie.', intro: '', items: [], resultado: '' },
    pasos: { h1: 'Un plan por pasos.', h2: 'Un solo interlocutor.', intro: '', items: [], regla: 'Primero se decide; después se escribe.' },
    equipo: { on: false, h1: 'Un solo equipo.', h2: 'Un solo responsable.', intro: '', items: [], nota: '' },
    valor: { on: true, filas: [{ k: 'Interlocutores', sep: 'Varios profesionales que la empresa debe encontrar y coordinar', con: 'Uno. Respondemos de todo' }, { k: 'Coherencia', sep: 'Cada uno ve su parte y las piezas pueden contradecirse', con: 'Todo se diseña a la vez, sobre un mismo diagnóstico' }, { k: 'Precio', sep: 'Honorarios abiertos que crecen con cada consulta', con: 'Precio cerrado y conocido desde el primer día' }, { k: 'Plazo', sep: 'Depende de la agenda de cada profesional', con: 'Un solo calendario' }, { k: 'Resultado', sep: 'Documentos sueltos', con: 'Un sistema completo, implantado y en uso' }] },
    coste: { on: true, h1: 'No hacerlo también', h2: 'tiene precio.', intro: '', riesgos: [], modo: 'beneficio', valorEmpresa: '', vMin: '', vMax: '', pMin: '60', pMax: '80', supuestos: '' },
    inv: { precio: '', auto: true, hitos: [{ t: 'A la aceptación', pct: 40 }, { t: 'A mitad del proyecto', pct: 30 }, { t: 'A la entrega final', pct: 30 }], notaHitos: 'El diagnóstico del primer paso queda en manos de la empresa aunque decida no continuar.', incluye: 'Honorarios de todo el equipo del proyecto\nPreparación de la documentación y acompañamiento en la implantación', noIncluye: 'IVA\nGastos de terceros (notaría, registros, tasas), según arancel oficial\nSeguimiento posterior, opcional', descuentos: [], variable: { on: false, pct: 40 }, cuotas: { n: 10, modo: 'dec', inicio: '' }, objetivos: [] },
    cierre: { h1: 'Empieza con una', h2: 'conversación.', texto: 'Una vez aceptada la propuesta, fijamos la reunión de arranque: presentamos el calendario, acordamos la confidencialidad y abrimos el diagnóstico.', cta: 'Confirmar la reunión de arranque', firmantes: 'Por la empresa' }
  });

  /* ---------- Preparar la propuesta desde la primera sesión ---------- */
  const preparar = () => {
    const ST = S(), pr = Object.assign(vacia(), ST.propuesta || {}), v20 = veinte(), cs = causasOrdenadas(), objs = (ST.objetivos || []).filter((o) => o.especifica || o.dice);
    const f = firma(); pr.ciudad = pr.ciudad || f.ciudad;
    const o1 = objs[0];
    if (o1) { pr.t1 = 'Que la empresa'; pr.t2 = 'trabaje para usted'; }
    pr.subtitulo = o1 ? `${cap(fraseObj(o1).replace(/\.$/, ''))}. Un plan con pasos, responsables y fechas para conseguirlo.` : `Ordenar ${cs.slice(0, 2).map((x) => x.c.t.toLowerCase()).join(' y ') || 'la dirección, los procesos y la información'} para que la empresa crezca sin depender de una sola persona.`;
    pr.alcance = ruta().slice(0, 3).map((x) => x.a.n).join(' · ') || 'Dirección, procesos y equipo';
    const acc = ST.plan.acciones || [];
    const sem = acc.length ? D.FASES.filter((F) => acc.some((a) => +a.f === F.id)).reduce((m, F) => Math.max(m, F.sem[1]), 0) : 24;
    pr.duracion = sem <= 18 ? `${Math.max(2, Math.round(sem / 4.3))} a ${Math.round(sem / 4.3) + 2} meses` : `${Math.round(sem / 4.3)} meses`;
    // Situación: las causas que más pesan, con lo que dice el empresario y lo que provocan
    pr.sit.items = cs.slice(0, 6).map((x) => { const s = x.ss.find((y) => y.cita) || {}; return { t: x.c.t + '.', d: s.cita ? `«${s.cita}»` : (D.area(x.c.area) || {}).d || '', c: CONSEC[x.c.patron] || 'Coste oculto en horas, margen y desgaste.' }; });
    pr.sit.intro = `Mientras el empresario sostiene la empresa con sus horas, el equilibrio aguanta. Pero la memoria y el esfuerzo de una persona no escalan. Estos son los ${pr.sit.items.length || 'principales'} problemas que ya existen, aunque todavía no se hayan manifestado del todo.`;
    // Lo que ocurre si no se actúa
    pr.riesgo.linea = [{ cuando: 'Hoy', que: cs[0] ? `${cs[0].c.t}. Todo funciona mientras quien lo sostiene esté presente.` : 'Todo funciona mientras quien lo sostiene esté presente.' }, { cuando: 'Mes 3', que: 'Llega más volumen o una baja. Los huecos se notan: urgencias, reprocesos y decisiones a última hora.' }, { cuando: 'Mes 6', que: 'El margen se resiente sin que nadie sepa exactamente dónde. La caja se tensa.' }, { cuando: 'Año 1', que: 'Se contratan más personas para tapar el desorden. Más coste, la misma dependencia.' }, { cuando: 'Año 2', que: 'Se crece en facturación, no en empresa. El empresario sigue siendo imprescindible.' }];
    // Lo que obtienen: sus objetivos primero, después lo que cierra cada hueco
    const items = objs.slice(0, 3).map((o) => ({ t: cap((o.especifica || o.dice).replace(/[.\s]+$/, '')), elimina: o.beneficio ? 'Gana: ' + o.beneficio.replace(/[.\s]+$/, '') + '.' : 'Su objetivo, convertido en un plan.', d: o.indicador ? `${o.indicador}: de ${o.actual || '?'} a ${o.valor || '?'} ${o.unidad || ''}${o.fecha ? ', antes del ' + fLarga(o.fecha) : ''}.` : (o.como ? lines(o.como)[0] + '.' : '') }));
    [...new Set(cs.map((x) => x.c.patron).filter(Boolean))].forEach((p) => { if (items.length < 6 && GANA[p]) items.push({ t: GANA[p][0], elimina: GANA[p][1], d: (D.patron(p) || {}).artefacto || '' }); });
    pr.obtienen.items = items;
    pr.obtienen.intro = 'El proyecto no se queda en un informe. Deja implantado un sistema que la empresa mantiene sola: responsables con nombre, límites con número, métodos escritos, datos que se leen y fechas que se cumplen.';
    pr.obtienen.resultado = 'Una empresa que funciona con sus responsables, sus reglas y su cuadro de mando, y un empresario que dirige en lugar de apagar fuegos.';
    // Protocolo: una etapa por fase del plan (o las fases tipo)
    const fases = D.FASES.filter((F) => !acc.length || acc.some((a) => +a.f === F.id));
    pr.pasos.items = [{ t: 'Diagnóstico 360', d: 'Entrevistas con el empresario y los responsables, verificación por áreas y confirmación de las causas con datos.', cuando: 'Semanas 1-3', quien: 'Dirección del proyecto, empresa', ent: 'Diagnóstico y hoja de ruta' }].concat(fases.map((F) => { const l = acc.filter((a) => +a.f === F.id), clave = l.filter((a) => a.clave).concat(l.filter((a) => !a.clave)).slice(0, 3); return { t: F.n, d: F.d + (clave.length ? ' ' + clave.map((a) => a.t.split(':')[0]).join('; ') + '.' : ''), cuando: `Semanas ${F.sem[0]}-${F.sem[1]}`, quien: [...new Set(l.map((a) => (D.linea(a.linea) || {}).n).filter(Boolean))].slice(0, 3).join(', ') || 'Dirección del proyecto', ent: clave.map((a) => a.ent).filter((e) => e && e !== '—').slice(0, 2).join(' · ') || F.d.split(':')[0], imp: '' }; }));
    pr.pasos.intro = 'Dirigimos el proyecto y somos la única voz ante la empresa. Cada etapa tiene su entregable y nada avanza sin que la dirección lo haya validado.';
    pr.pasos.regla = 'Nada se implanta sin que antes lo haya decidido la dirección, y nada se da por cerrado sin evidencia de que se usa. Primero se decide; después se escribe.';
    pr.equipo.items = [{ n: f.nombre, rol: 'Dirección del proyecto', d: 'Dirige el proceso, facilita los acuerdos y responde ante la empresa de principio a fin.', pasos: 'Todos los pasos' }, { n: 'La dirección de la empresa', rol: 'Socios y responsables', d: 'Aportan su visión, deciden y ejecutan. Nada se implanta sin su acuerdo previo.', pasos: 'Todos los pasos' }];
    // Coste de no hacerlo
    pr.coste.riesgos = RIESGO_TIPO.map((x) => Object.assign({}, x));
    pr.coste.intro = 'Esto es lo que puede costar seguir como hasta ahora. Las cifras son orientativas y se afinan en el diagnóstico.';
    // Objetivos para el componente variable (si se pacta): los suyos, formulados sobre lo que depende de la empresa
    pr.inv.objetivos = objs.slice(0, 4).map((o, i, l) => ({ t: cap((o.especifica || o.dice).replace(/[.\s]+$/, '')), peso: Math.round(100 / l.length) + (i === 0 ? 100 - Math.round(100 / l.length) * l.length : 0), accion: lines(o.como).join('\n') || 'Ejecutar y registrar las acciones del plan', tramos: tramosTipo() }));
    pr.cifra = pr.cifra || '';
    pr.generada = new Date().toISOString();
    ST.propuesta = pr; guardar();
  };
  const tramosTipo = () => ['Sistema diseñado: alcance, responsable, frecuencia, checklist y evidencia definidos.', 'Implantadas al menos la mitad de las acciones acordadas.', 'Implantado el 80 % o más y sostenido durante el periodo mínimo.', 'Todas las acciones bajo control de la empresa ejecutadas, acreditadas y sostenidas.'];
  const DEPENDE = /\b(ventas?|vender|factur|margen|rentabilidad|beneficio|ingresos|clientes? (compren|paguen|nuevos)|financiaci[oó]n|subvenci[oó]n|que el banco|precio de mercado)\b/i;

  /* ---------- Cálculos económicos ---------- */
  const precioPasos = (pr) => pr.pasos.items.reduce((a, x) => a + num(x.imp), 0);
  const precio = (pr) => (pr.inv.auto && precioPasos(pr) ? precioPasos(pr) : num(pr.inv.precio));
  const neto = (pr) => Math.max(0, precio(pr) - pr.inv.descuentos.reduce((a, x) => a + num(x.imp), 0));
  const retorno = (pr) => {
    const c = pr.coste, p = neto(pr) || precio(pr), a = num(c.vMin) * num(c.pMin) / 100, b = num(c.vMax) * num(c.pMax) / 100, med = (a + b) / 2;
    if (!p || !med) return null;
    const r = { a, b, med, min: a / p, max: b / p, centro: med / p, pctEmp: num(c.valorEmpresa) ? (p / num(c.valorEmpresa)) * 100 : null, recom: redondea(med / 6), rango: [redondea(med / 10), redondea(med / 5)] };
    r.st = r.centro >= 5 ? 'ok' : r.centro >= 3 ? 'warn' : 'stop';
    return r;
  };
  const cuotas = (pr) => {
    const N = neto(pr), fijo = pr.inv.variable.on ? N * (1 - pr.inv.variable.pct / 100) : N, n = Math.max(1, +pr.inv.cuotas.n || 1);
    const ini = pr.inv.cuotas.inicio || (pr.fecha || hoy()).slice(0, 7);
    const mes = (i) => { const [y, m] = ini.split('-').map(Number); const d = new Date(y, m - 1 + i, 1); return cap(MESES[d.getMonth()]) + ' ' + d.getFullYear(); };
    let l;
    if (pr.inv.cuotas.modo === 'dec' && n > 1) { const d = Math.max(50, Math.round((fijo / n) * 0.0625 / 50) * 50), a1 = Math.ceil((fijo + (d * n * (n - 1)) / 2) / n / 100) * 100; l = Array.from({ length: n }, (_, i) => a1 - i * d); }
    else l = Array.from({ length: n }, () => Math.floor((fijo / n) * 100) / 100);
    const suma = l.slice(0, -1).reduce((a, x) => a + x, 0); l[n - 1] = Math.round((fijo - suma) * 100) / 100;
    return { fijo, variable: N - fijo, lista: l.map((v, i) => ({ mes: mes(i), v })) };
  };

  /* ================= DIMENSIÓN DE LA EMPRESA Y VALOR DE LA INVERSIÓN =================
     Con el tamaño de la empresa (facturación, margen, plantilla, horas del empresario, coste financiero)
     y sus objetivos, se estima lo que aporta el proyecto cada año por palancas, con una rampa de
     implantación, y se calcula el plazo de recuperación, la rentabilidad a cinco años, el múltiplo,
     la TIR y el VAN. Dos escenarios: base y conservador (prudencia). */
  const PALANCAS = [
    { id: 'horas', n: 'Horas del empresario liberadas', d: 'Horas a la semana que deja de dedicar a operativa y pasa a dirigir o vender, valoradas a lo que vale su hora.', q: '¿Cuántas horas a la semana dejará de dedicar a la operativa?', campos: [['horas', 'Horas/semana liberadas'], ['valorHora', 'Valor de su hora (€)']], calc: (p, d) => num(p.horas) * 46 * num(p.valorHora || d.valorHora) },
    { id: 'margen', n: 'Mejora del margen', d: 'Puntos de margen que se recuperan con precios revisados, margen por cliente y producto y menos descuentos.', q: '¿Cuántos puntos de margen se pueden recuperar?', campos: [['puntos', 'Puntos de margen']], calc: (p, d) => num(d.ventas) * num(p.puntos) / 100 },
    { id: 'productividad', n: 'Productividad del equipo', d: 'Parte del coste de personal que hoy se pierde en reprocesos, esperas, urgencias y tareas sin método.', q: '¿Qué parte del tiempo del equipo se recupera?', campos: [['pct', '% del coste de personal']], calc: (p, d) => costePersonal(d) * num(p.pct) / 100 },
    { id: 'financiero', n: 'Coste financiero y tesorería', d: 'Intereses, comisiones y recargos que se evitan con previsión de caja y deuda ajustada.', q: '¿Qué parte del coste financiero se puede ahorrar?', campos: [['pct', '% de ahorro']], calc: (p, d) => num(d.financiero) * num(p.pct) / 100 },
    { id: 'crecimiento', n: 'Crecimiento que la estructura permite', d: 'Venta adicional que la empresa puede atender con orden, valorada a su margen de contribución.', q: '¿Cuánta venta adicional podrá atender sin romperse?', campos: [['pct', '% de venta adicional'], ['contrib', 'Margen de contribución (%)']], calc: (p, d) => num(d.ventas) * num(p.pct) / 100 * num(p.contrib || d.margen) / 100 },
    { id: 'riesgo', n: 'Riesgo evitado', d: 'Pérdida que se evita (dependencia, personas clave, sucesión, litigio), repartida en cinco años y ponderada por su probabilidad.', q: '¿Qué pérdida se evita y con qué probabilidad en cinco años?', campos: [['perdida', 'Pérdida evitable (€)'], ['prob', 'Probabilidad en 5 años (%)']], calc: (p) => num(p.perdida) * num(p.prob) / 100 / 5 }
  ];
  const costePersonal = (d) => num(d.personal) || num(d.plantilla) * num(d.costePersona);
  const dimVacia = () => ({ ventas: '', margen: '', ebitda: '', plantilla: '', costePersona: '32000', personal: '', horasEmp: '', valorHora: '60', financiero: '', crecimiento: '', multiplo: '5', rampa: [40, 80, 100, 100, 100], prudencia: 60, tasa: 8, palancas: Object.fromEntries(PALANCAS.map((x) => [x.id, { on: false }])), origen: '' });
  const dimDe = (pr) => { pr.dim = Object.assign(dimVacia(), pr.dim || {}); pr.dim.palancas = Object.assign(dimVacia().palancas, pr.dim.palancas || {}); return pr.dim; };
  // Datos del simulador de la empresa (si no son de ejemplo)
  const traerSimulador = async (d) => {
    let st = null; const Pl = P();
    try { if (Pl && Pl.loadData) st = await Pl.loadData('simulador'); } catch (e) { st = null; }
    if (!st) { try { st = JSON.parse(localStorage.getItem(Pl && Pl.k ? Pl.k('atalaya.v1') : 'atalaya.v1')); } catch (e) { st = null; } }
    const e = st && st.empresa; if (!e || st.ejemplo) return false;
    if (num(e.ventas)) d.ventas = String(Math.round(num(e.ventas)));
    if (num(e.margen)) d.margen = String(num(e.margen));
    if (num(e.personal)) d.personal = String(Math.round(num(e.personal)));
    if (num(e.plantilla)) d.plantilla = String(num(e.plantilla));
    if (num(e.crecimiento)) d.crecimiento = String(num(e.crecimiento));
    if (num(e.ventas) && num(e.margen)) d.ebitda = String(Math.round(num(e.ventas) * num(e.margen) / 100 - num(e.personal) - num(e.fijos)));
    d.origen = 'simulador'; return true;
  };
  // Palancas propuestas a partir de los objetivos del empresario y de las causas que más pesan
  const proponerPalancas = (d) => {
    const ST = S(), refs = new Set(causasOrdenadas().map((x) => x.c.ref).filter(Boolean)), pal = d.palancas, objs = ST.objetivos || [], usadas = [];
    const pon = (id, v, por) => { pal[id] = Object.assign({}, pal[id], v, { on: true }); usadas.push(por); };
    const oh = objs.find((o) => /hora/i.test((o.unidad || '') + ' ' + (o.indicador || '')) && num(o.actual) > num(o.valor));
    if (oh) pon('horas', { horas: String(num(oh.actual) - num(oh.valor)), valorHora: d.valorHora }, 'su objetivo «' + (oh.especifica || oh.dice) + '»');
    else if (refs.has('gob-cuello') || refs.has('tie-agenda') || num(d.horasEmp)) pon('horas', { horas: String(Math.max(6, Math.round(num(d.horasEmp) * 0.3) || 10)), valorHora: d.valorHora }, 'todo pasa por el empresario');
    if (refs.has('fin-margen') || refs.has('com-precio') || objs.some((o) => /margen|precio/i.test(o.especifica + o.dice))) pon('margen', { puntos: '1,5' }, 'margen y precios sin control');
    if ([...refs].some((r) => /^ope-|per-puestos|inf-/.test(r))) pon('productividad', { pct: '3' }, 'procesos y puestos sin método');
    if ((refs.has('fin-caja') || refs.has('fin-carga')) && num(d.financiero)) pon('financiero', { pct: '20' }, 'tesorería y deuda');
    if (num(d.crecimiento) || objs.some((o) => /crec|vend|client/i.test(o.especifica + o.dice))) pon('crecimiento', { pct: String(Math.min(15, num(d.crecimiento) || 10)), contrib: d.margen }, 'el crecimiento que quiere');
    const c = S().propuesta && S().propuesta.coste; if (c && c.modo === 'perdida' && num(c.vMin)) pon('riesgo', { perdida: String(Math.round((num(c.vMin) + num(c.vMax || c.vMin)) / 2)), prob: String(Math.round((num(c.pMin) + num(c.pMax || c.pMin)) / 2)) }, 'el riesgo del coste de no hacerlo');
    return usadas;
  };
  const mesesDur = (pr) => { const m = String(pr.duracion || '').match(/(\d+)(?:\D+(\d+))?\s*mes/); return m ? +(m[2] || m[1]) : 6; };
  // Salidas de caja de la inversión, mes a mes (mes 0 = aceptación)
  const pagos = (pr) => {
    const out = Array(61).fill(0), N = neto(pr) || precio(pr);
    if (!N) return out;
    if (pr.tipo === 'programa') { const cu = cuotas(pr); cu.lista.forEach((x, i) => { out[Math.min(60, i)] += x.v; }); if (pr.inv.variable.on) out[Math.min(60, cu.lista.length)] += cu.variable; }
    else { const h = pr.inv.hitos.length ? pr.inv.hitos : [{ pct: 100 }], dur = mesesDur(pr); h.forEach((x, i) => { out[Math.min(60, i === 0 ? 0 : Math.round((dur * i) / (h.length - 1 || 1)))] += (N * num(x.pct)) / 100; }); }
    return out;
  };
  const tir = (flujos) => { const van = (r) => flujos.reduce((a, f, i) => a + f / Math.pow(1 + r, i), 0); let lo = -0.99, hi = 1; if (van(lo) * van(hi) > 0) return null; for (let k = 0; k < 120; k++) { const m = (lo + hi) / 2; if (van(lo) * van(m) <= 0) hi = m; else lo = m; } return (lo + hi) / 2; };
  const valorInversion = (pr) => {
    const d = dimDe(pr), inv = pagos(pr), I = inv.reduce((a, x) => a + x, 0);
    const lista = PALANCAS.map((x) => { const p = d.palancas[x.id] || {}; return { x, p, v: p.on ? Math.max(0, x.calc(p, d)) : 0 }; });
    const B = lista.reduce((a, l) => a + l.v, 0);
    const esc = (f) => {
      const anual = d.rampa.map((r) => (B * num(r) / 100) * f), flujos = Array(61).fill(0);
      for (let m = 1; m <= 60; m++) flujos[m] = anual[Math.floor((m - 1) / 12)] / 12;
      const neto = flujos.map((b, m) => b - inv[m]); let acc = 0, pay = null; neto.forEach((x, m) => { acc += x; if (pay == null && m > 0 && acc >= 0) pay = m; });
      const suma = anual.reduce((a, x) => a + x, 0), r = tir(neto), rm = Math.pow(1 + num(d.tasa) / 100, 1 / 12) - 1;
      return { anual, suma, pay, roi: I ? (suma - I) / I : null, mult: I ? suma / I : null, tir: r == null ? null : Math.pow(1 + r, 12) - 1, van: neto.reduce((a, x, i) => a + x / Math.pow(1 + rm, i), 0), acumulado: anual.map((_, y) => anual.slice(0, y + 1).reduce((a, x) => a + x, 0) - inv.slice(0, (y + 1) * 12 + 1).reduce((a, x) => a + x, 0)) };
    };
    const base = esc(1), cons = esc(num(d.prudencia) / 100);
    // Semáforo: cuántas veces devuelve la inversión en cinco años (escenario base); el conservador se enseña al lado
    const st = !I || !B ? null : base.mult >= 5 ? 'ok' : base.mult >= 3 ? 'warn' : 'stop';
    return { d, lista, B, I, base, cons, st, pctVentas: num(d.ventas) ? (I / num(d.ventas)) * 100 : null, pctEbitda: num(d.ebitda) > 0 ? (I / num(d.ebitda)) * 100 : null, valorCreado: B * num(d.multiplo) };
  };
  const meses = (m) => (m == null ? 'más de 5 años' : m <= 1 ? 'el primer mes' : m < 24 ? m + ' meses' : (m / 12).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' años');
  const pct0 = (x) => (x == null ? '—' : Math.round(x * 100).toLocaleString('es-ES') + ' %');
  const tirTxt = (x) => (x == null ? '—' : x > 3 ? 'más del 300 %' : pct0(x));
  // Gráfica a cinco años: barras del beneficio anual y línea del neto acumulado (inversión descontada)
  const grafica5 = (vi, tema) => {
    const W = 640, H = 230, L = 60, Rr = 20, T = 18, Bt = 36, e = vi.base, c2 = vi.cons, max = Math.max(1, ...e.anual, ...e.acumulado.map(Math.abs)), min = Math.min(0, ...e.acumulado, -vi.I);
    const y = (v) => T + (H - T - Bt) * (1 - (v - min) / (max - min)), bw = (W - L - Rr) / 5;
    const col = tema === 'claro' ? { t: '#5d626c', g: '#d6d3c8', b: '#6e7d14', b2: '#c9cdb0', l: '#0b0d13' } : { t: '#9aa1ab', g: 'rgba(255,255,255,.12)', b: '#c9f24d', b2: 'rgba(201,242,77,.35)', l: '#f3f2ee' };
    const pts = e.acumulado.map((v, i) => [L + bw * i + bw / 2, y(v)]);
    return `<svg viewBox="0 0 ${W} ${H}" class="pc-g5" role="img" aria-label="Beneficio anual y neto acumulado a cinco años"><line x1="${L}" x2="${W - Rr}" y1="${y(0)}" y2="${y(0)}" stroke="${col.g}"/>${[max, min].filter((v) => v).map((v) => `<text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="${col.t}">${corto(v).replace(' €', '')}</text>`).join('')}
      ${e.anual.map((v, i) => `<rect x="${L + bw * i + bw * 0.2}" y="${y(Math.max(v, 0))}" width="${bw * 0.28}" height="${Math.abs(y(v) - y(0))}" fill="${col.b}"/><rect x="${L + bw * i + bw * 0.5}" y="${y(Math.max(c2.anual[i], 0))}" width="${bw * 0.28}" height="${Math.abs(y(c2.anual[i]) - y(0))}" fill="${col.b2}"/><text x="${L + bw * i + bw / 2}" y="${H - 16}" text-anchor="middle" font-size="11" fill="${col.t}">Año ${i + 1}</text>`).join('')}
      <polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${col.l}" stroke-width="2"/>${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${col.l}"/>`).join('')}
      <g font-size="10" fill="${col.t}"><rect x="${L}" y="${H - 8}" width="10" height="6" fill="${col.b}"/><text x="${L + 14}" y="${H - 2}">Beneficio anual (base)</text><rect x="${L + 150}" y="${H - 8}" width="10" height="6" fill="${col.b2}"/><text x="${L + 164}" y="${H - 2}">Conservador</text><line x1="${L + 260}" x2="${L + 276}" y1="${H - 5}" y2="${H - 5}" stroke="${col.l}" stroke-width="2"/><text x="${L + 280}" y="${H - 2}">Neto acumulado (inversión descontada)</text></g></svg>`;
  };
  const dimHTML = (pr) => {
    const vi = valorInversion(pr), d = vi.d, e = vi.base, c = vi.cons;
    const q = (k, l, ph, t) => `<label class="small">${l}<input class="input" ${t ? `type="${t}"` : ''} data-dm="${k}" value="${esc(d[k])}" placeholder="${esc(ph || '')}"></label>`;
    return `<section class="glass pad stack pc-dim"><div class="row"><div><div class="eyebrow">Dimensión de la empresa y valor de la inversión</div><small class="muted">Lo que aporta el proyecto según el tamaño de la empresa y sus objetivos: plazo de recuperación y rentabilidad a cinco años.</small></div><span class="spacer"></span>${vi.st ? `<span class="iv-st ${vi.st}">${vi.st === 'ok' ? 'Alto valor' : vi.st === 'warn' ? 'Valor justo' : 'No compensa'}</span>` : ''}</div>
      <div class="eyebrow">Preguntas para dimensionar ${d.origen === 'simulador' ? '<span class="muted">· datos del simulador</span>' : ''}</div>
      <div class="iv-g3">${q('ventas', '¿Cuánto factura al año? (€)', '1.500.000')}${q('margen', '¿Qué margen bruto deja? (%)', '35')}${q('ebitda', '¿Qué beneficio operativo (EBITDA) hace al año? (€)', '120.000')}${q('plantilla', '¿Cuántas personas trabajan?', '18')}${q('costePersona', '¿Coste medio por persona al año? (€)', '32.000')}${q('personal', 'O el coste total de personal (€)', '')}${q('horasEmp', '¿Horas a la semana del empresario en operativa?', '45')}${q('valorHora', '¿Cuánto vale una hora suya dirigiendo o vendiendo? (€)', '60')}${q('financiero', '¿Cuánto paga al año en intereses y comisiones? (€)', '18.000')}${q('crecimiento', '¿Cuánto quiere crecer al año? (%)', '10')}${q('multiplo', '¿A cuántas veces el EBITDA se valoraría la empresa?', '5')}</div>
      <div class="row"><button class="btn ghost small" id="pcSim">Traer los datos del simulador</button><button class="btn small" id="pcPal">Proponer las palancas desde sus objetivos y causas</button></div>
      <div class="eyebrow">Palancas de valor (al año, en régimen)</div>
      <div class="pc-pals">${vi.lista.map(({ x, p, v }) => `<div class="pc-pal ${p.on ? 'on' : ''}"><label class="iv-inl"><input type="checkbox" data-pon="${x.id}" ${p.on ? 'checked' : ''}> <b>${esc(x.n)}</b></label><small class="muted">${esc(x.q)} ${esc(x.d)}</small>${p.on ? `<div class="iv-g3">${x.campos.map(([k, l]) => `<label class="small">${l}<input class="input" data-pv="${x.id}.${k}" value="${esc(p[k] != null ? p[k] : '')}" placeholder="${esc(k === 'valorHora' ? d.valorHora : k === 'contrib' ? d.margen : '')}"></label>`).join('')}</div><b class="pc-pal-v">${eur(v)} al año</b>` : ''}</div>`).join('')}</div>
      <div class="iv-g3"><label class="small">Rampa de implantación (% del efecto, años 1 a 5)<input class="input" data-dm="rampa" value="${esc(d.rampa.join(' / '))}"></label><label class="small">Escenario conservador (% del base)<input class="input" type="number" data-dm="prudencia" value="${esc(d.prudencia)}"></label><label class="small">Tasa para el VAN (%)<input class="input" type="number" data-dm="tasa" value="${esc(d.tasa)}"></label></div>
      ${vi.B && vi.I ? `<div class="pc-roi-ed"><div><small>Valor que aporta al año</small><b>${eur(vi.B)}</b><span>en régimen · ${vi.pctVentas != null ? (vi.B / num(d.ventas) * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' % de la facturación' : ''}</span></div><div><small>Inversión</small><b>${eur(vi.I)}</b><span>${vi.pctVentas != null ? vi.pctVentas.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' % de la facturación' : ''}${vi.pctEbitda != null ? ' · ' + Math.round(vi.pctEbitda) + ' % del EBITDA' : ''}</span></div><div class="${vi.st}"><small>Recupera la inversión</small><b>${meses(e.pay)}</b><span>conservador: ${meses(c.pay)}</span></div><div class="${vi.st}"><small>Rentabilidad a 5 años</small><b>${pct0(e.roi)}</b><span>conservador: ${pct0(c.roi)} · cada euro devuelve ${(c.mult || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })}–${(e.mult || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })} €</span></div><div><small>TIR · VAN (${d.tasa} %)</small><b>${tirTxt(e.tir)}</b><span>VAN ${eur(e.van)} · conservador ${eur(c.van)}</span></div><div><small>Valor de empresa creado</small><b>${corto(vi.valorCreado)}</b><span>${d.multiplo} × la mejora anual del beneficio</span></div></div>
        ${grafica5(vi)}
        <div class="table-wrap"><table class="ms-tab"><thead><tr><th style="text-align:left">Año</th><th>Beneficio (base)</th><th>Conservador</th><th>Neto acumulado</th></tr></thead><tbody>${e.anual.map((v, i) => `<tr><td style="text-align:left">Año ${i + 1} · rampa ${d.rampa[i]} %</td><td>${eur(v)}</td><td>${eur(c.anual[i])}</td><td>${eur(e.acumulado[i])}</td></tr>`).join('')}<tr><td style="text-align:left"><b>Total 5 años</b></td><td><b>${eur(e.suma)}</b></td><td><b>${eur(c.suma)}</b></td><td><b>${eur(e.acumulado[4])}</b></td></tr></tbody></table></div>
        ${vi.st === 'warn' ? '<div class="alert small">Devuelve entre tres y cinco veces la inversión en cinco años: es rentable, pero conviene reforzar el valor (objetivos más ambiciosos, más palancas) o ajustar el alcance para llegar a cinco veces o más.</div>' : ''}${vi.st === 'stop' ? '<div class="alert warn small">Con estos objetivos y este tamaño, el proyecto no devuelve al menos tres veces la inversión en cinco años. Si los objetivos son pequeños, la propuesta no es rentable para el cliente: plantee objetivos mayores o ajuste el alcance.</div>' : ''}
        <div class="row"><button class="btn ghost small" id="pcDimV">Usar estos valores en «Valor y precio»</button><label class="iv-inl small"><input type="checkbox" data-dm="enDossier" ${d.enDossier !== false ? 'checked' : ''}> Incluir la hoja «La inversión, en números» en el dossier</label></div>`
        : `<p class="small muted" style="margin:0">${!vi.I ? 'Fija el precio en «Valor y precio» para calcular el retorno. ' : ''}${!vi.B ? 'Responde a las preguntas y activa las palancas que aplican (o pulsa «Proponer las palancas»).' : ''}</p>`}</section>`;
  };
  const wireDim = (host, pr) => {
    const d = dimDe(pr), sec = $('.pc-dim', host); if (!sec) return;
    $$('[data-dm]', sec).forEach((i) => { const k = i.dataset.dm; i.onchange = () => { if (k === 'rampa') { const r = i.value.split(/[\/,;\s]+/).map(num).filter((x) => x >= 0).slice(0, 5); while (r.length < 5) r.push(r[r.length - 1] || 100); d.rampa = r; } else if (k === 'enDossier') d.enDossier = i.checked; else d[k] = i.value; guardar(); render(); }; });
    $$('[data-pon]', sec).forEach((c) => (c.onchange = () => { d.palancas[c.dataset.pon] = Object.assign({}, d.palancas[c.dataset.pon], { on: c.checked }); guardar(); render(); }));
    $$('[data-pv]', sec).forEach((i) => (i.onchange = () => { const [id, k] = i.dataset.pv.split('.'); d.palancas[id][k] = i.value; guardar(); render(); }));
    $('#pcSim', sec).onclick = async () => { const ok = await traerSimulador(d); guardar(); render(); toast(ok ? 'Datos traídos del simulador: revísalos.' : 'El simulador no tiene datos reales de esta empresa todavía.'); };
    $('#pcPal', sec).onclick = () => { const u = proponerPalancas(d); guardar(); render(); toast(u.length ? 'Palancas propuestas por: ' + u.join('; ') + '. Ajusta las cifras con el empresario.' : 'No hay objetivos ni causas suficientes: activa las palancas a mano.'); };
    const uv = $('#pcDimV', sec); if (uv) uv.onclick = () => { const vi = valorInversion(pr); Object.assign(pr.coste, { modo: 'beneficio', vMin: String(Math.round(vi.cons.suma)), vMax: String(Math.round(vi.base.suma)), pMin: '100', pMax: '100', supuestos: `Valor a cinco años según el tamaño de la empresa y sus objetivos: ${vi.lista.filter((l) => l.v).map((l) => l.x.n.toLowerCase() + ' ' + eur(l.v) + '/año').join('; ')}; rampa ${d.rampa.join('/')} %; escenario conservador al ${d.prudencia} %.` }); guardar(); render(); toast('Valor a cinco años llevado a «Valor y precio».'); };
  };
  // Hoja del dossier: la inversión, en números
  const hojaNumeros = (pr, pieT) => {
    const vi = valorInversion(pr), d = vi.d, e = vi.base, c = vi.cons;
    if (!vi.B || !vi.I || d.enDossier === false) return null;
    return (n, s) => hoja('pc-light', kick(`${s} · La inversión, en números`) + tit('Una inversión que', `se paga en ${meses(e.pay)}.`) + `<p class="pc-lede">Estimación con el tamaño de la empresa y sus objetivos. El proyecto aporta unos ${eur(vi.B)} al año cuando está implantado${num(d.ventas) ? `, el ${(vi.B / num(d.ventas) * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} % de la facturación` : ''}. La inversión es de ${eur(vi.I)}${vi.pctVentas != null ? `, el ${vi.pctVentas.toLocaleString('es-ES', { maximumFractionDigits: 1 })} % de la facturación de un año` : ''}.</p>
      <div class="pc-roi four"><div><small>Recupera la inversión</small><b>${meses(e.pay)}</b><p>Conservador: ${meses(c.pay)}.</p></div><div><small>Rentabilidad a 5 años</small><b>${pct0(e.roi)}</b><p>Conservador: ${pct0(c.roi)}.</p></div><div><small>Cada euro invertido</small><b>${(e.mult || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })} €</b><p>Conservador: ${(c.mult || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })} €.</p></div><div class="on"><small>Valor de empresa creado</small><b>${corto(vi.valorCreado)}</b><p>${d.multiplo} veces la mejora anual del beneficio.</p></div></div>
      <div class="pdf-keep" style="margin-top:16px">${grafica5(vi, 'claro')}</div>
      <table class="pc-riesgos" style="margin-top:8px"><thead><tr><th>De dónde sale el valor</th><th>Cálculo</th><th>Al año</th></tr></thead><tbody>${vi.lista.filter((l) => l.v).map((l) => `<tr><th>${esc(l.x.n)}</th><td>${esc(l.x.campos.map(([k, lb]) => lb + ': ' + (l.p[k] || (k === 'valorHora' ? d.valorHora : k === 'contrib' ? d.margen : '—'))).join(' · '))}</td><td>${eur(l.v)}</td></tr>`).join('')}</tbody></table>
      <p class="pc-nota">Rampa de implantación ${d.rampa.join(' / ')} % en los años 1 a 5; escenario conservador al ${d.prudencia} % del base; TIR ${tirTxt(e.tir)} y VAN al ${d.tasa} % de ${eur(e.van)}. Cifras orientativas con los datos facilitados por la empresa; se revisan en el diagnóstico. No son una garantía de resultado.</p>`, { t: pieT, n });
  };

  /* ================= EL DOSSIER (hojas A4) ================= */
  const globo = (o) => { const cx = o.cx, cy = o.cy, r = o.r; let s = `<svg class="pc-art" viewBox="0 0 794 1123" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="pg${o.id}" cx="${cx / 794}" cy="${cy / 1123}" r="0.5"><stop offset="0" stop-color="${o.c}" stop-opacity="0.22"/><stop offset="1" stop-color="${o.c}" stop-opacity="0"/></radialGradient></defs><rect width="794" height="1123" fill="url(#pg${o.id})"/><g fill="none" stroke="${o.c}" stroke-opacity="0.32" stroke-width="0.8"><circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    for (let i = 1; i < 6; i++) s += `<ellipse cx="${cx}" cy="${cy}" rx="${r * Math.cos((i * Math.PI) / 12)}" ry="${r}"/><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * Math.sin((i * Math.PI) / 12)}" stroke-opacity="0.16"/>`;
    s += `<path d="M${cx - r * 1.6},${cy + r * 0.7} Q${cx},${cy - r * 1.4} ${cx + r * 1.7},${cy - r * 0.2}" stroke-opacity="0.5"/><path d="M${cx - r * 1.4},${cy - r * 0.3} Q${cx + r * 0.2},${cy + r * 1.3} ${cx + r * 1.5},${cy + r * 0.9}" stroke-opacity="0.35"/></g><g fill="${o.c}">`;
    for (let i = 0; i < 46; i++) { const a = (i * 137.5 * Math.PI) / 180, rr = r * Math.sqrt(((i * 7) % 46) / 46); s += `<circle cx="${(cx + Math.cos(a) * rr).toFixed(1)}" cy="${(cy + Math.sin(a) * rr * 0.92).toFixed(1)}" r="${i % 7 ? 1.1 : 2.2}" opacity="${i % 7 ? 0.5 : 0.9}"/>`; }
    return s + '</g></svg>';
  };
  const ciudad = (c) => { let s = `<svg class="pc-art" viewBox="0 0 794 1123" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="pcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0.09"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><g fill="url(#pcg)" stroke="${c}" stroke-opacity="0.12" stroke-width="0.6">`; let x = 0, k = 3; while (x < 794) { k = (k * 9301 + 49297) % 233280; const w = 18 + (k % 40), h = 60 + (k % 200); s += `<rect x="${x}" y="${1123 - h - 90}" width="${w}" height="${h + 90}"/>`; x += w + 4; } return s + '</g></svg>'; };
  const grafica = (c) => { const pts = [[60, 330], [140, 300], [210, 310], [290, 260], [360, 270], [440, 210], [520, 220], [600, 160], [680, 120], [760, 70]]; return `<svg class="pc-art" viewBox="0 0 794 1123" aria-hidden="true"><g stroke="${c}" stroke-opacity="0.12">${Array.from({ length: 14 }, (_, i) => `<line x1="0" y1="${40 + i * 80}" x2="794" y2="${40 + i * 80}"/>`).join('')}</g><polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-opacity="0.45" stroke-width="2"/>${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${c}" fill-opacity="0.55"/>`).join('')}</svg>`; };
  const tit = (h1, h2, o) => `<h2 class="pc-h ${o && o.big ? 'big' : ''}">${esc(h1)}${h2 ? `<br><span class="pc-o">${esc(h2)}</span>` : ''}</h2><i class="pc-rule"></i>`;
  const kick = (t) => `<div class="pc-k">${esc(t)}</div>`;
  const hoja = (cls, inner, pie, art) => `<section class="pp-page pc-page ${cls}">${art || ''}<div class="pc-in">${inner}</div>${pie !== false ? `<footer class="pc-foot"><span>${esc(pie.t)}</span><b>${pie.n}</b></footer>` : ''}</section>`;

  const dossier = (pr) => {
    const f = firma(), emp = empresa(), r = retorno(pr), prog = pr.tipo === 'programa', N = neto(pr), PR = precio(pr), cu = cuotas(pr);
    const pieT = `${f.nombre} · Dossier de propuesta comercial · ${pr.t1} ${pr.t2}`.toUpperCase();
    const secciones = []; // { id, t (índice), hojas: [fn(n, sec) => html] }
    const sec = (id, t, hojas) => secciones.push({ id, t, hojas });
    // 01 Situación
    if (pr.sit.items.length) sec('sit', 'La situación actual', [(n, s) => hoja('pc-light', kick(`${s} · La situación actual`) + tit(pr.sit.h1, pr.sit.h2) + (pr.sit.intro ? `<p class="pc-lede">${esc(pr.sit.intro)}</p>` : '') + `<ol class="pc-probs">${pr.sit.items.slice(0, 6).map((x, i) => `<li><b class="pc-n">${String(i + 1).padStart(2, '0')}</b><div><h4>${esc(x.t)}</h4><p>${esc(x.d)}</p></div><div class="pc-cons"><small>Consecuencia</small><span>${esc(x.c)}</span></div></li>`).join('')}</ol>`, { t: pieT, n })]);
    // 02 Lo que ocurre si no se hace
    if (pr.riesgo.on && pr.riesgo.linea.length) sec('riesgo', 'Lo que ocurre sin actuar', [(n, s) => hoja('pc-dark', kick(`${s} · Lo que ocurre sin actuar`) + tit(pr.riesgo.h1, pr.riesgo.h2) + `<p class="pc-lede">${esc(pr.riesgo.intro)}</p><dl class="pc-linea">${pr.riesgo.linea.slice(0, 6).map((x) => `<dt>${esc(x.cuando)}</dt><dd>${esc(x.que)}</dd>`).join('')}</dl>` + (pr.riesgo.stats.filter((x) => x.v && x.fuente).length ? `<div class="pc-band">${pr.riesgo.stats.filter((x) => x.v && x.fuente).slice(0, 2).map((x) => `<div><b>${esc(x.v)}</b><span>${esc(x.t)}</span><small>Fuente: ${esc(x.fuente)}</small></div>`).join('')}</div>` : ''), { t: pieT, n }, ciudad('#c9f24d'))]);
    // 03 Lo que obtienen
    if (pr.obtienen.items.length) sec('obt', 'Lo que obtienen', [(n, s) => hoja('pc-dark', kick(`${s} · Lo que obtienen`) + tit(pr.obtienen.h1, pr.obtienen.h2) + (pr.obtienen.intro ? `<p class="pc-lede">${esc(pr.obtienen.intro)}</p>` : '') + `<div class="pc-cards">${pr.obtienen.items.slice(0, 6).map((x, i) => `<div class="pc-card"><small>${String(i + 1).padStart(2, '0')}</small><h4>${esc(x.t)}</h4><em>${esc(x.elimina)}</em><p>${esc(x.d)}</p></div>`).join('')}</div>` + (pr.obtienen.resultado ? `<div class="pc-res"><small>Resultado final</small><p>${esc(pr.obtienen.resultado)}</p></div>` : ''), { t: pieT, n }, grafica('#c9f24d'))]);
    // 04 Protocolo de trabajo (cuatro pasos por hoja)
    const ps = pr.pasos.items, grupos = [], tam = Math.ceil(ps.length / Math.max(1, Math.ceil(ps.length / 4))); for (let i = 0; i < ps.length; i += tam) grupos.push(ps.slice(i, i + tam));
    if (ps.length) sec('pasos', 'El protocolo de trabajo', grupos.map((g, gi) => (n, s) => hoja('pc-dark', kick(`${s} · El protocolo de trabajo · pasos ${String(gi * tam + 1).padStart(2, '0')} a ${String(gi * tam + g.length).padStart(2, '0')}`) + (gi === 0 ? tit(pr.pasos.h1, pr.pasos.h2) + (pr.pasos.intro ? `<p class="pc-lede">${esc(pr.pasos.intro)}</p>` : '') : tit('Lo acordado se convierte en', 'un sistema que se usa.')) + `<div class="pc-steps">${g.map((x, i) => `<div class="pc-step"><b class="pc-sn">${String(gi * tam + i + 1).padStart(2, '0')}</b><div><div class="pc-sh"><h4>${esc(x.t)}</h4><span>${esc(x.cuando)}</span></div><p>${esc(x.d)}</p>${x.quien ? `<div class="pc-tags">${String(x.quien).split(',').map((q) => q.trim()).filter(Boolean).map((q) => `<span>${esc(q)}</span>`).join('')}</div>` : ''}${x.ent ? `<div class="pc-ent"><b>Entregable</b> · ${esc(x.ent)}</div>` : ''}</div></div>`).join('')}</div>` + (gi === grupos.length - 1 && pr.pasos.regla ? `<div class="pc-res"><small>La regla del proceso</small><p>${esc(pr.pasos.regla)}</p></div>` : ''), { t: pieT, n }, grafica('#c9f24d'))));
    // 05 Equipo
    if (pr.equipo.on && pr.equipo.items.length) sec('equipo', 'El equipo', [(n, s) => hoja('pc-light', kick(`${s} · El equipo`) + tit(pr.equipo.h1, pr.equipo.h2) + (pr.equipo.intro ? `<p class="pc-lede">${esc(pr.equipo.intro)}</p>` : '') + `<div class="pc-cards light">${pr.equipo.items.slice(0, 6).map((x) => `<div class="pc-card"><small>${esc(x.pasos)}</small><h4>${esc(x.n)}</h4><em>${esc(x.rol)}</em><p>${esc(x.d)}</p></div>`).join('')}</div>` + (pr.equipo.nota ? `<div class="pc-res"><small>Cómo trabaja el equipo</small><p>${esc(pr.equipo.nota)}</p></div>` : ''), { t: pieT, n })]);
    // 06 El valor del llave en mano
    const hecho = ps.map((x) => x.ent).filter(Boolean).slice(0, 9);
    if (pr.valor.on) sec('valor', prog ? 'El valor del acompañamiento' : 'El valor del llave en mano', [(n, s) => hoja('pc-light', kick(`${s} · ${prog ? 'El valor del acompañamiento' : 'El valor del llave en mano'}`) + tit('Un solo encargo.', 'Todo resuelto.') + `<p class="pc-lede">Lo habitual es contratar por separado cada parte y coordinarla uno mismo. Un único encargo cambia esa ecuación.</p><table class="pc-cmp"><thead><tr><th></th><th>Por separado</th><th>Con ${esc(f.nombre)}</th></tr></thead><tbody>${pr.valor.filas.map((x) => `<tr><th>${esc(x.k)}</th><td>${esc(x.sep)}</td><td>${esc(x.con)}</td></tr>`).join('')}</tbody></table>${hecho.length ? `<div class="pc-k" style="margin-top:22px">Qué queda hecho al terminar</div><ol class="pc-hecho">${hecho.map((x, i) => `<li><small>${String(i + 1).padStart(2, '0')}</small>${esc(x)}</li>`).join('')}</ol>` : ''}`, { t: pieT, n })]);
    // 07 El coste de no hacerlo
    if (pr.coste.on && (pr.coste.riesgos.length || r)) sec('coste', 'El coste de no hacerlo', [(n, s) => hoja('pc-light', kick(`${s} · El coste de no hacerlo`) + tit(pr.coste.h1, pr.coste.h2) + `<p class="pc-lede">${esc(pr.coste.intro)}${num(pr.coste.valorEmpresa) ? ` Valor estimado de la empresa: ${corto(num(pr.coste.valorEmpresa))}.` : ''}</p>${pr.coste.riesgos.length ? `<table class="pc-riesgos"><thead><tr><th>Riesgo</th><th>Qué ocurre</th><th>Impacto estimado</th></tr></thead><tbody>${pr.coste.riesgos.slice(0, 6).map((x) => `<tr><th>${esc(x.r)}</th><td>${esc(x.q)}</td><td>${esc(x.imp)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${r ? `<div class="pc-k" style="margin-top:20px">Retorno de la inversión</div><div class="pc-roi"><div><small>Inversión</small><b>${eur(N || PR)}</b><p>${r.pctEmp ? `En torno al ${r.pctEmp.toLocaleString('es-ES', { maximumFractionDigits: 1 })} % del valor de la empresa. ` : ''}${prog ? 'Cuotas durante el programa.' : 'Precio cerrado, pagado por hitos.'}</p></div><div><small>${pr.coste.modo === 'perdida' ? 'Pérdida en el escenario adverso' : 'Valor que genera'}</small><b>${corto(num(pr.coste.vMin))}–${corto(num(pr.coste.vMax))}</b><p>Entre ${xx(num(pr.coste.vMin) / (N || PR))} y ${xx(num(pr.coste.vMax) / (N || PR))} la inversión.</p></div><div class="on"><small>Retorno esperado</small><b>${xx(r.min)}–${xx(r.max)}</b><p>${pr.coste.modo === 'perdida' ? 'Pérdida evitada, ponderada por la probabilidad de que el escenario adverso llegue.' : 'Valor generado, ponderado por la probabilidad de alcanzarlo.'}</p></div></div>
      <p class="pc-nota">Estimación orientativa que se afinará en el diagnóstico. Supuestos: ${pr.coste.modo === 'perdida' ? 'pérdida' : 'valor generado'} entre ${corto(num(pr.coste.vMin))} y ${corto(num(pr.coste.vMax))}; probabilidad del ${num(pr.coste.pMin)} al ${num(pr.coste.pMax)} %.${pr.coste.supuestos ? ' ' + esc(pr.coste.supuestos) : ''}</p>` : ''}`, { t: pieT, n })]);
    // La inversión, en números (dimensión de la empresa, retorno y rentabilidad a cinco años)
    const hn = hojaNumeros(pr, pieT); if (hn) sec('numeros', 'La inversión, en números', [hn]);
    // 08 La inversión
    const desglose = ps.filter((x) => num(x.imp));
    sec('inv', 'La inversión', [(n, s) => hoja('pc-dark', kick(`${s} · La inversión`) + (prog ? tit('Un programa completo.', pr.inv.variable.on ? `${100 - pr.inv.variable.pct} % fijo, ${pr.inv.variable.pct} % por objetivos.` : 'Cuotas durante el programa.') : tit('Llave en mano.', 'Un precio cerrado, pagado por hitos.'))
      + `<div class="pc-precio"><b>${eur(N || PR, prog && (N % 1))}</b><span>+ IVA<br>${prog ? 'Programa integral' : 'Llave en mano'}<br>${esc(pr.duracion || '')}</span></div>`
      + (prog && pr.inv.descuentos.length ? `<table class="pc-desg"><tr><td></td><td>Precio del programa integral</td><td>${eur(PR, 1)}</td></tr>${pr.inv.descuentos.map((x) => `<tr><td></td><td>(−) ${esc(x.t)}</td><td>− ${eur(num(x.imp), 1)}</td></tr>`).join('')}<tr class="tot"><td></td><td>Precio neto a abonar</td><td>${eur(N, 1)}</td></tr></table>` : desglose.length ? `<table class="pc-desg">${desglose.map((x) => `<tr><td>${String(ps.indexOf(x) + 1).padStart(2, '0')}</td><td>${esc(x.t)}${x.ent ? ': ' + esc(x.ent.toLowerCase()) : ''}</td><td>${eur(num(x.imp))}</td></tr>`).join('')}<tr class="tot"><td></td><td>Total</td><td>${eur(PR)}</td></tr></table>` : '')
      + `<div class="pc-2"><div><div class="pc-k">Forma de pago</div>${prog ? `<table class="pc-pago"><tr><td>Componente fijo · ${pr.inv.cuotas.n} cuotas</td><td>${pr.inv.variable.on ? 100 - pr.inv.variable.pct + ' % · ' : ''}${eur(cu.fijo, 1)}</td></tr>${pr.inv.variable.on ? `<tr><td>Componente por objetivos · al cierre</td><td>${pr.inv.variable.pct} % · ${eur(cu.variable, 1)}</td></tr>` : ''}</table><table class="pc-pago mini">${cu.lista.map((x) => `<tr><td>${esc(x.mes)}</td><td>${eur(x.v, 1)}</td></tr>`).join('')}</table>` : `<table class="pc-pago">${pr.inv.hitos.map((x) => `<tr><td>${esc(x.t)}</td><td>${num(x.pct)} % · ${eur(((N || PR) * num(x.pct)) / 100)}</td></tr>`).join('')}</table>${pr.inv.notaHitos ? `<p class="pc-nota">${esc(pr.inv.notaHitos)}</p>` : ''}`}</div>
        <div><div class="pc-k">Incluye</div><ul class="pc-ul">${lines(pr.inv.incluye).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="pc-k" style="margin-top:12px;opacity:.7">No incluye</div><ul class="pc-ul">${lines(pr.inv.noIncluye).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      <div class="pc-meta"><span>Duración: ${esc(pr.duracion || '—')}</span><span>Validez de la propuesta: ${+pr.validez || 30} días</span></div>`, { t: pieT, n })].concat(prog && pr.inv.variable.on && pr.inv.objetivos.length ? variableHojas(pr, f, emp, pieT, cu) : []));
    // 09 Siguiente paso
    sec('cierre', 'El siguiente paso', [(n, s) => hoja('pc-dark pc-cierre', marca(f, 'mini') + kick(`${s} · El siguiente paso`) + tit(pr.cierre.h1, pr.cierre.h2) + `<p class="pc-lede big">${esc(pr.cierre.texto)}</p><div class="pc-cta">${esc(pr.cierre.cta)} →</div>
      <div class="pc-k" style="margin-top:auto">Aceptación de la propuesta</div><div class="pc-firmas">${lines(pr.cierre.firmantes).concat([f.nombre]).map((x) => `<div><span></span><small>${esc(x)}</small></div>`).join('')}</div>
      <div class="pc-datos"><div><small>Firma</small>${esc(f.razon || f.nombre)}${f.cif ? '<br>CIF ' + esc(f.cif) : ''}</div><div><small>Oficina</small>${esc(f.direccion || '—')}${f.ciudad ? '<br>' + esc(f.ciudad) : ''}</div><div><small>Contacto</small>${f.email ? `<u>${esc(f.email)}</u>` : ''}${f.tel ? `<br><u>${esc(f.tel)}</u>` : ''}${f.consultor ? `<br>${esc(f.consultor)}` : ''}</div></div>`, { t: `${f.nombre} · ${f.lema}`.toUpperCase(), n }, ciudad('#c9f24d'))]);

    // Numeración: portada 1, índice 2, después las hojas
    let pg = 3; secciones.forEach((x, i) => { x.num = String(i + 1).padStart(2, '0'); x.pag = pg; pg += x.hojas.length; });
    const cifra = pr.cifra || (r ? Math.round(r.centro) + '×' : '360');
    const portada = hoja('pc-dark pc-portada', `${marca(f)}<div class="pc-anio">Dossier<br>${(pr.fecha || hoy()).slice(0, 4)}</div><div class="pc-pbot">${kick('Dossier de propuesta comercial')}<h1 class="pc-t1">${esc(pr.t1)}<br><span>${esc(pr.t2)}.</span></h1><i class="pc-rule"></i><p class="pc-sub">${esc(pr.subtitulo)}</p><div class="pc-tri"><div><small>Preparado para</small><b>${esc(emp)}</b></div><div><small>Alcance</small><b>${esc(pr.alcance)}</b></div><div><small>Duración</small><b>${esc(pr.duracion)}</b></div></div><div class="pc-pf"><span>${esc((pr.ciudad ? pr.ciudad + ' · ' : '') + mesAnio(pr.fecha))}</span><span>Documento confidencial</span></div></div>`, false, globo({ id: 'a', cx: 640, cy: 470, r: 260, c: '#c9f24d' }));
    const indice = hoja('pc-dark', `${marca(f, 'mini')}${kick(`${pr.tipo === 'programa' ? 'Programa de implantación' : 'Proyecto llave en mano'} · ${emp}`)}<h2 class="pc-h big">${esc(pr.idx.a)}<br><span class="pc-o">${esc(pr.idx.b)}</span><br><span class="pc-l">${esc(pr.idx.c)}</span></h2><i class="pc-rule"></i><p class="pc-lede" style="max-width:430px">${esc(pr.idx.texto || pr.subtitulo)}</p><div class="pc-k" style="margin-top:auto">Contenido</div><ol class="pc-idx">${secciones.map((x) => `<li><small>${x.num}</small><b>${esc(x.t)}</b><span>${String(x.pag).padStart(2, '0')}</span></li>`).join('')}</ol>`, { t: pieT, n: '02' }, `<div class="pc-cifra" aria-hidden="true" style="font-size:${String(cifra).length > 3 ? 150 : String(cifra).length > 2 ? 190 : 250}px"><span>${esc(cifra)}</span><span>${esc(cifra)}</span></div>`);
    const contra = hoja('pc-dark pc-contra', `<div class="pc-cbig">${marca(f, 'grande')}<i class="pc-rule"></i><p class="pc-lede big">${esc(f.descripcion)}</p><div class="pc-tri two">${f.email ? `<div><small>Correo</small><u>${esc(f.email)}</u></div>` : ''}${f.tel ? `<div><small>Teléfono</small><u>${esc(f.tel)}</u></div>` : ''}</div></div><div class="pc-pf"><span>${esc([f.razon || f.nombre, f.cif && 'CIF ' + f.cif, f.direccion, f.ciudad].filter(Boolean).join(' · '))}</span><span>${esc(mesAnio(pr.fecha))}</span></div>`, false, globo({ id: 'b', cx: 560, cy: 420, r: 300, c: '#c9f24d' }) + ciudad('#c9f24d'));
    return portada + indice + secciones.map((x) => x.hojas.map((h, i) => h(String(x.pag + i).padStart(2, '0'), x.num)).join('')).join('') + contra;
  };

  /* Componente variable: reglas, escala y una ficha por objetivo */
  const variableHojas = (pr, f, emp, pieT, cu) => {
    const ob = pr.inv.objetivos, V0 = cu.variable, tot = neto(pr) || precio(pr);
    const h1 = (n, s) => hoja('pc-light', kick(`${s} · El componente por objetivos`) + tit(`El ${pr.inv.variable.pct} % se gana`, 'con lo que depende de usted.') + `<p class="pc-lede">El ${pr.inv.variable.pct} % del precio neto (${eur(V0, 1)}) queda reservado como componente variable y se liquida al cierre según la ejecución acreditada de los objetivos validados por ambas partes en la primera intervención. No es un importe adicional: forma parte del precio.</p>
      <div class="pc-callout"><b>Control total por la empresa.</b> Cada objetivo se formula sobre conductas, tareas, decisiones y registros que dependen exclusivamente de ${esc(emp)}. Quedan fuera como condición de cobro los resultados que dependen de terceros o del mercado: ventas, márgenes, rentabilidad, financiación, respuesta de clientes o proveedores y plazos ajenos.</div>
      <div class="pc-k" style="margin-top:14px">Responsabilidades</div><table class="pc-riesgos two"><thead><tr><th>${esc(f.nombre)}</th><th>${esc(emp)}</th></tr></thead><tbody><tr><td>Diseñar indicadores y checklists.</td><td>Ejecutar las acciones acordadas.</td></tr><tr><td>Dar indicaciones y acompañamiento.</td><td>Asignar responsables y recursos internos.</td></tr><tr><td>Revisar evidencias y alertar de desviaciones.</td><td>Registrar semanalmente las evidencias.</td></tr><tr><td>Proponer acciones correctoras.</td><td>Corregir incumplimientos y sostener el sistema.</td></tr></tbody></table>
      <div class="pc-k" style="margin-top:14px">Atribución de responsabilidad</div><table class="pc-riesgos pc-fix"><colgroup><col style="width:44%"><col style="width:18%"><col style="width:38%"></colgroup><thead><tr><th>Situación</th><th>Responsable</th><th>Efecto económico</th></tr></thead><tbody><tr><th>La empresa ejecuta el plan, pero el efecto no llega por el mercado o por terceros.</th><td>Ninguna de las partes.</td><td>El objetivo se reconoce como cumplido y es pagadero.</td></tr><tr><th>La empresa no ejecuta, retrasa o no acredita las acciones, con instrucciones y plazo suficientes.</th><td>La empresa.</td><td>No penaliza al consultor: la parte afectada se reconoce a efectos de pago.</td></tr><tr><th>El consultor no entrega, entrega tarde o con material insuficiente.</th><td>${esc(f.nombre)}.</td><td>La parte afectada no se devenga y reduce la liquidación.</td></tr></tbody></table><p class="pc-nota">Cada parte asume plenamente su responsabilidad. Ninguna puede cambiar después los criterios para trasladar a la otra una responsabilidad propia.</p>`, { t: pieT, n });
    const h2 = (n, s) => hoja('pc-light', kick(`${s} · Escala, evidencias y objetivos`) + tit('Se mide lo ejecutado,', 'no lo que opina nadie.') + `<table class="pc-riesgos pc-tramos"><thead><tr><th>Nivel</th><th>Avance</th><th>Criterio</th></tr></thead><tbody>${[['0', '0 %', 'Sin línea base, responsable, checklist ni evidencia.']].concat(tramosTipo().map((t, i) => [String(i + 1), (i + 1) * 25 + ' %', t])).map((x) => `<tr><th>${x[0]}</th><td>${x[1]}</td><td>${esc(x[2])}</td></tr>`).join('')}</tbody></table>
      <div class="pc-k" style="margin-top:14px">Objetivos propuestos para validar</div><table class="pc-riesgos"><thead><tr><th>Objetivo</th><th>Peso</th><th>Sobre el precio</th><th>Importe</th></tr></thead><tbody>${ob.map((o) => `<tr><th>${esc(o.t)}</th><td>${num(o.peso)} %</td><td>${((num(o.peso) * pr.inv.variable.pct) / 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %</td><td>${eur((V0 * num(o.peso)) / 100, 1)}</td></tr>`).join('')}</tbody></table>
      <div class="pc-callout"><b>Liquidación.</b> Porcentaje reconocido de cada objetivo = avance acreditado + parte no ejecutada atribuible a la empresa + parte afectada por factores externos (máximo 100 %). Importe variable = ${eur(V0, 1)} × Σ (peso × porcentaje reconocido). <i>Ejemplo:</i> un objetivo al 75 % cuyo 25 % restante no se ejecutó por decisión de la empresa se reconoce al 100 %; si el 25 % faltó porque el consultor no entregó el material, se reconoce el 75 %.</div>
      <p class="pc-nota">Los objetivos son una propuesta: en la primera intervención la empresa puede validarlos, modificarlos o sustituirlos por otros que cumplan las mismas reglas. Las ponderaciones suman el 100 % del componente variable. Cláusulas a revisar por el asesor jurídico de cada parte antes de firmar.</p>`, { t: pieT, n });
    const fichas = []; for (let i = 0; i < ob.length; i += 2) fichas.push(ob.slice(i, i + 2));
    return [h1, h2].concat(fichas.map((g) => (n, s) => hoja('pc-light', kick(`${s} · Ficha de objetivos`) + g.map((o) => `<div class="pc-obj"><div class="pc-sh"><h4>${esc(o.t)}</h4><span>${num(o.peso)} % del variable · ${eur((V0 * num(o.peso)) / 100, 1)}</span></div><div class="pc-k">Acciones verificables</div><ul class="pc-ul dark">${lines(o.accion).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><table class="pc-riesgos pc-tramos"><thead><tr><th>Tramo</th><th>Indicador</th></tr></thead><tbody>${(o.tramos || tramosTipo()).map((t, i) => `<tr><th>${(i + 1) * 25} %</th><td>${esc(t)}</td></tr>`).join('')}</tbody></table><p class="pc-nota">No se mide si la empresa vende más. Se mide si ejecuta el cambio y lo acredita.</p></div>`).join(''), { t: pieT, n })));
  };

  V.informes.propuesta = () => {
    const ST = S(); if (!ST.propuesta || !ST.propuesta.generada) preparar();
    const pr = ST.propuesta; ST.informes = ST.informes || {}; ST.informes.propuesta = new Date().toISOString(); guardar();
    A.informe.open({ titulo: 'Propuesta comercial · ' + empresa(), barra: 'Propuesta comercial · ' + empresa(), html: dossier(pr), paginado: true, clave: 'iv:propuesta', after: (paper) => { paper.classList.add('pp-doc', 'pc-doc'); const z = () => { paper.style.zoom = Math.min(1, (innerWidth - 24) / 794); }; z(); addEventListener('resize', z); } });
  };

  /* ================= DOCUMENTOS Y FUENTES =================
     Borradores, propuestas anteriores, dossieres hechos a mano, notas o transcripciones que no se pasaron
     por la escucha: se adjuntan aquí y se fusionan con lo que ya sabe la auditoría (sesión, triaje,
     objetivos, plan). Con Claude se redacta la fusión completa; sin él, se recogen precio, duración,
     pasos, hitos de pago e incluye/no incluye por reglas. */
  const TIPOS_ADJ = { borrador: 'Borrador de propuesta', anterior: 'Propuesta anterior', dossier: 'Dossier o informe hecho a mano', notas: 'Notas o análisis previo', transcripcion: 'Transcripción o grabación', otro: 'Otro documento' };
  const FUENTES_S = { transcripciones: 'Transcripciones y lectura en profundidad', triaje: 'Constantes, síntomas, causas y triaje', objetivos: 'Objetivos del empresario', plan: 'Plan de intervención y sesiones' };
  const adj = () => { const ST = S(); if (!Array.isArray(ST.pcAdj)) ST.pcAdj = []; return ST.pcAdj; };
  const fuentesS = () => { const ST = S(); ST.pcFuentes = Object.assign({ transcripciones: true, triaje: true, objetivos: true, plan: true }, ST.pcFuentes || {}); return ST.pcFuentes; };
  const MAXDOC = 60000;
  const tipoPorNombre = (n) => (/propuesta|oferta|presupuesto/i.test(n) ? (/borrador|draft|v\d/i.test(n) ? 'borrador' : 'anterior') : /dossier|informe/i.test(n) ? 'dossier' : /transcrip|plaud|acta|srt|vtt/i.test(n) ? 'transcripcion' : /nota|analisis|análisis|triaje/i.test(n) ? 'notas' : 'otro');
  const fuentesHTML = () => {
    const l = adj(), fs = fuentesS(), ST = S(), fu = ST.propuesta && ST.propuesta.fusion;
    return `<section class="glass pad stack pc-fuentes"><div class="row"><div><div class="eyebrow">Documentos y fuentes</div><small class="muted">Adjunta borradores, propuestas anteriores, dossieres hechos a mano, notas o una transcripción que no pasó por la escucha. Se fusionan con lo que ya sabe la auditoría.</small></div></div>
      ${l.length ? `<ul class="pc-adj">${l.map((d) => `<li data-d="${d.id}"><input type="checkbox" data-du ${d.usar !== false ? 'checked' : ''} aria-label="Usar este documento"><div><b>${esc(d.nombre)}</b><small class="muted">${fLarga(d.fecha)} · ${(d.texto || '').length.toLocaleString('es-ES')} caracteres${d.recortado ? ' (recortado)' : ''}</small></div><select class="input" data-dt>${Object.keys(TIPOS_ADJ).map((k) => `<option value="${k}" ${d.tipo === k ? 'selected' : ''}>${TIPOS_ADJ[k]}</option>`).join('')}</select><button class="btn ghost small" data-dv>Ver</button><button class="icon-btn" data-dd aria-label="Quitar el documento">×</button><pre class="pc-adj-v" hidden>${esc((d.texto || '').slice(0, 3000))}${(d.texto || '').length > 3000 ? '\n…' : ''}</pre></li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">Aún no hay documentos adjuntos.</p>'}
      <div class="row"><label class="btn small iv-file">Adjuntar documentos<input type="file" id="pcFile" multiple accept=".txt,.md,.docx,.pdf,.srt,.vtt,.json,.csv" hidden></label><span class="small muted">Word, PDF, texto o subtítulos. O pega el texto:</span></div>
      <textarea class="input" id="pcPega" rows="3" placeholder="Pega aquí un borrador, unas notas o la propuesta que se envió por correo"></textarea>
      <div class="row"><input class="input" id="pcPegaN" placeholder="Nombre (p. ej. Borrador de junio)" style="flex:1;min-width:0"><button class="btn ghost small" id="pcPegaB">Añadir el texto</button></div>
      <div class="pc-fs"><span class="small muted">Fusionar también con:</span>${Object.keys(FUENTES_S).map((k) => `<label class="iv-inl small"><input type="checkbox" data-fs="${k}" ${fs[k] ? 'checked' : ''}> ${FUENTES_S[k]}</label>`).join('')}</div>
      <div class="row"><button class="btn ${ST.propuesta && ST.propuesta.generada ? '' : 'solid'}" id="pcFus" ${l.some((d) => d.usar !== false) ? '' : 'disabled'}>Fusionar los documentos en la propuesta</button><small class="muted">Con Claude conectado se redacta la fusión completa; si no, se recogen precio, duración, pasos, hitos e incluye/no incluye.</small></div>
      ${fu ? `<div class="pc-fu small"><b>Última fusión · ${fLarga(fu.fecha.slice(0, 10))}${fu.ia ? ' · con Claude' : ' · por reglas'}</b><br>Fuentes: ${esc(fu.fuentes.join(' · '))}${fu.tomado && fu.tomado.length ? `<br>Se ha tomado: ${esc(fu.tomado.join(', '))}` : ''}${fu.notas ? `<br>${esc(fu.notas)}` : ''}</div>` : ''}</section>`;
  };
  const wireFuentes = (host) => {
    const l = adj();
    const f = $('#pcFile', host); if (f) f.onchange = async (e) => {
      const files = [...e.target.files]; let n = 0;
      for (const fl of files) { try { const t = String(await E.leerArchivo(fl) || '').trim(); if (!t) { toast(`«${fl.name}» no tiene texto legible.`); continue; } l.push({ id: uid(), nombre: fl.name.replace(/\.[^.]+$/, ''), tipo: tipoPorNombre(fl.name), fecha: hoy(), texto: t.slice(0, MAXDOC), recortado: t.length > MAXDOC, usar: true }); n++; } catch (x) { toast(`«${fl.name}»: ${x.message}`); } }
      guardar(); render(); if (n) toast(`${pl(n, 'documento adjuntado', 'documentos adjuntados')}. Pulsa «Fusionar» para llevarlo a la propuesta.`);
    };
    const pb = $('#pcPegaB', host); if (pb) pb.onclick = () => { const t = $('#pcPega', host).value.trim(); if (!t) return toast('Pega primero el texto.'); const nm = $('#pcPegaN', host).value.trim() || 'Texto pegado ' + fLarga(hoy()); l.push({ id: uid(), nombre: nm, tipo: tipoPorNombre(nm), fecha: hoy(), texto: t.slice(0, MAXDOC), recortado: t.length > MAXDOC, usar: true }); guardar(); render(); };
    $$('.pc-adj li', host).forEach((li) => { const d = l.find((x) => x.id === li.dataset.d); if (!d) return;
      $('[data-du]', li).onchange = (e) => { d.usar = e.target.checked; guardar(); render(); };
      $('[data-dt]', li).onchange = (e) => { d.tipo = e.target.value; guardar(); };
      $('[data-dv]', li).onclick = () => { const v = $('.pc-adj-v', li); v.hidden = !v.hidden; };
      $('[data-dd]', li).onclick = (e) => { if (!e.target.dataset.conf) { e.target.dataset.conf = 1; e.target.textContent = '¿?'; e.target.title = 'Pulsa otra vez para quitarlo'; return; } S().pcAdj = l.filter((x) => x !== d); guardar(); render(); }; });
    $$('[data-fs]', host).forEach((c) => (c.onchange = () => { fuentesS()[c.dataset.fs] = c.checked; guardar(); }));
    const fb = $('#pcFus', host); if (fb) fb.onclick = async () => { fb.disabled = true; fb.textContent = 'Fusionando…'; try { await fusionar(); } catch (x) { toast('No se pudo fusionar: ' + x.message); } render(); };
  };

  /* Lectura por reglas de un documento comercial */
  const importes = (s) => [...String(s).matchAll(/(\d{1,3}(?:[.\s]\d{3})+|\d{3,})(?:,(\d{1,2}))?\s*(?:€|eur(?:os)?\b)/gi)].map((m) => parseFloat(m[1].replace(/[.\s]/g, '') + '.' + (m[2] || '0')));
  const extraerReglas = (txt) => {
    // Los PDF maquetados separan a veces los dígitos («0 1», «0 3 – 0 4»): se juntan antes de leer
    const L = String(txt).replace(/\r/g, '').split('\n').map((x) => x.replace(/\s+/g, ' ').trim().replace(/^(\d) (\d)\b/, '$1$2').replace(/^(\d{2}) ?[–-] ?(\d) (\d)\b/, '$1-$2$3')).filter(Boolean), r = {};
    // El precio: la línea «Total» manda; si no hay, las de precio o inversión que no sean un rango de riesgos
    const totL = L.filter((x) => /^total\b/i.test(x)).flatMap(importes), kwL = L.filter((x) => /\b(precio|inversi[oó]n|honorarios|importe)\b/i.test(x) && !/\d\s*[–-]\s*\d/.test(x)).flatMap(importes), tot = totL.length ? totL : kwL;
    if (tot.length) r.precio = Math.max(...tot);
    const dur = String(txt).match(/(?:duraci[oó]n|plazo|periodo)[^\n]{0,40}?(\d{1,2})\s*(?:a\s*(\d{1,2})\s*)?mes(?:es)?/i) || String(txt).match(/\b(\d{1,2})\s*(?:a\s*(\d{1,2})\s*)?meses\b/i);
    if (dur) r.duracion = dur[2] ? `${dur[1]} a ${dur[2]} meses` : `${dur[1]} meses`;
    const hit = L.filter((x) => /\d{1,3}\s*%/.test(x) && /(aceptaci|firma|inicio|arranque|entrega|mitad|final|cierre|inscripci|hito|sesi[oó]n de acuerdo)/i.test(x)).map((x) => ({ t: cap(x.replace(/\d{1,3}\s*%.*$/, '').replace(/[·:|\-–]+\s*$/, '').trim()) || 'Hito', pct: +x.match(/(\d{1,3})\s*%/)[1] }));
    if (hit.length >= 2 && hit.reduce((a, x) => a + x.pct, 0) === 100) r.hitos = hit;
    const pas = L.map((x) => x.match(/^(?:paso\s*)?(\d{1,2}(?:-\d{1,2})?)[.)\-–:]?\s+([A-ZÁÉÍÓÚÑ].{5,160})$/)).filter(Boolean).map((m) => { const im = importes(m[2]); return { t: m[2].replace(/\s*\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?\s*(?:€|eur(?:os)?).*$/i, '').replace(/[·:|]+\s*$/, '').trim(), d: '', cuando: (m[2].match(/semanas?\s*\d+(?:\s*[-–a]\s*\d+)?/i) || [''])[0], quien: '', ent: '', imp: im.length ? String(im[im.length - 1]) : '' }; });
    // Preferimos el desglose con importes; sin él, las líneas numeradas que no son un índice (acaban en número de página)
    const conImp = pas.filter((x) => num(x.imp)), cand = conImp.length >= 2 ? conImp : pas.filter((x, i) => !/\s\d{1,3}$/.test(x.t) && !/^(la|el|lo|los|las)\s/i.test(x.t) || /semana/i.test(x.cuando));
    const vistos = new Set(); const pasos = cand.filter((x) => x.t.length > 4 && !vistos.has(x.t) && vistos.add(x.t)).slice(0, 10);
    if (pasos.length >= 2) r.pasos = pasos;
    const bloque = (re, stop) => { const i = L.findIndex((x) => re.test(x)); if (i < 0) return ''; const out = []; for (let j = i + 1; j < L.length && out.length < 8; j++) { if (stop.test(L[j]) || /^[A-ZÁÉÍÓÚÑ ]{6,}$/.test(L[j])) break; out.push(L[j].replace(/^[•\-·*]\s*/, '')); } return out.join('\n'); };
    const inc = bloque(/^incluye\b/i, /^no incluye|^forma de pago|^validez|^duraci/i), noi = bloque(/^no incluye\b/i, /^forma de pago|^validez|^duraci|^incluye/i);
    if (inc) r.incluye = inc; if (noi) r.noIncluye = noi;
    const t = L.find((x) => x.length > 8 && x.length < 70 && !/confidencial|página|^\d|propuesta comercial$/i.test(x)); if (t) r.titulo = t;
    return r;
  };
  const fusionar = async () => {
    const ST = S(); if (!ST.propuesta || !ST.propuesta.generada) preparar();
    const pr = ST.propuesta, docs = adj().filter((d) => d.usar !== false), fs = fuentesS(), tomado = [];
    if (!docs.length) return toast('Marca al menos un documento.');
    const v = A.ia ? await A.ia.via() : null;
    let ia = null;
    if (v) {
      const ctx = {};
      if (fs.objetivos) ctx.objetivos = (ST.objetivos || []).map((o) => ({ dice: o.dice, smart: fraseObj(o), beneficio: o.beneficio, como: o.como }));
      if (fs.triaje) { ctx.causas = causasOrdenadas().slice(0, 8).map((x) => ({ causa: x.c.t, citas: x.ss.map((s) => s.cita).filter(Boolean).slice(0, 2) })); ctx.triaje = ruta().map((x) => ({ area: x.a.n, nivel: x.n })); ctx.constantes = ST.constantes; }
      if (fs.transcripciones) ctx.lecturas = ST.transcripciones.map((t) => (t.ia ? { resumen: t.ia.resumen, cita: t.ia.cita_clave, alertas: t.ia.alertas } : { huecos: t.analisis && t.analisis.huecos.filter((h) => h.peso).map((h) => h.id) })).slice(0, 4);
      if (fs.plan) { ctx.plan = (ST.plan.acciones || []).filter((a) => a.clave).slice(0, 12).map((a) => ({ t: a.t, fase: a.f, entregable: a.ent })); ctx.sesiones = ST.sesiones.length; }
      let presu = 110000; const textos = docs.map((d) => { const t = d.texto.slice(0, Math.max(4000, Math.floor(presu / docs.length))); return `### ${TIPOS_ADJ[d.tipo] || 'Documento'}: ${d.nombre} (${d.fecha})\n${t}`; }).join('\n\n');
      try {
        ia = await A.ia.json(`Eres consultor de pymes y preparas una propuesta comercial para ${empresa()}. Fusiona los documentos adjuntos (borradores, propuestas anteriores, dossieres hechos a mano, notas o transcripciones) con lo que ya sabe la auditoría. Reglas: respeta los precios, pasos y condiciones que figuren en los documentos salvo que la información de la auditoría sea más reciente y los contradiga (dilo en "notas"); no inventes cifras: si un dato no aparece, déjalo vacío; los importes como números sin símbolo; de usted, frases cortas, sin superlativos; habla de valor y de lo que obtiene la empresa. Si hay parte variable por objetivos, cada objetivo debe depender al 100 % de la empresa (nunca de ventas, márgenes o terceros). Devuelve JSON con lo que puedas rellenar: {"tipo":"llave|programa","t1":"","t2":"","subtitulo":"","alcance":"","duracion":"","idx":{"a":"","b":"","c":"","texto":""},"sit":{"h1":"","h2":"","intro":"","items":[{"t":"","d":"","c":""}]},"riesgo":{"linea":[{"cuando":"","que":""}]},"obtienen":{"intro":"","items":[{"t":"","elimina":"","d":""}],"resultado":""},"pasos":{"intro":"","items":[{"t":"","d":"","cuando":"","quien":"","ent":"","imp":0}],"regla":""},"coste":{"modo":"beneficio|perdida","vMin":0,"vMax":0,"pMin":0,"pMax":0,"valorEmpresa":0,"supuestos":"","riesgos":[{"r":"","q":"","imp":""}]},"inv":{"precio":0,"hitos":[{"t":"","pct":0}],"incluye":"una línea por punto","noIncluye":"","descuentos":[{"t":"","imp":0}],"variable":{"on":false,"pct":0},"objetivos":[{"t":"","peso":0,"accion":"una por línea"}]},"notas":"en dos frases: qué has tomado de cada fuente y qué contradicciones has resuelto"}.\n\nLo que sabe la auditoría: ${JSON.stringify(ctx).slice(0, 25000)}\n\nDocumentos:\n${textos}`, { max: 16000 });
      } catch (x) { ia = null; toast('Claude no ha podido fusionar (' + x.message + '): se usan las reglas.'); }
    }
    if (ia) {
      const pon = (dst, src, ruta) => Object.keys(src || {}).forEach((k) => { const v2 = src[k], p2 = ruta ? ruta + '.' + k : k; if (v2 == null || v2 === '' || v2 === 0 && !/pct|peso/.test(k)) return; if (Array.isArray(v2)) { if (v2.length && dst[k] !== undefined) { dst[k] = v2.map((x) => (typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([a, b]) => [a, b == null ? '' : typeof b === 'number' ? String(b) : b])) : x)); tomado.push(p2); } } else if (typeof v2 === 'object') { if (dst[k] && typeof dst[k] === 'object') pon(dst[k], v2, p2); } else if (k in dst) { dst[k] = typeof v2 === 'number' && typeof dst[k] !== 'number' && typeof dst[k] !== 'boolean' ? String(v2) : v2; tomado.push(p2); } });
      const { notas } = ia; delete ia.notas;
      pon(pr, ia, '');
      if (ia.inv && num(ia.inv.precio)) pr.inv.auto = pr.pasos.items.some((x) => num(x.imp)) && Math.abs(precioPasos(pr) - num(ia.inv.precio)) < 1;
      (pr.inv.objetivos || []).forEach((o) => { if (!o.tramos) o.tramos = tramosTipo(); });
      pr.fusion = { fecha: new Date().toISOString(), ia: true, fuentes: docs.map((d) => d.nombre).concat(Object.keys(fs).filter((k) => fs[k]).map((k) => FUENTES_S[k].toLowerCase())), tomado: [...new Set(tomado.map((x) => NOMBRE_CAMPO(x)))], notas: notas || '' };
    } else {
      const r = docs.reduce((acc, d) => Object.assign(acc, Object.fromEntries(Object.entries(extraerReglas(d.texto)).filter(([k]) => !(k in acc)))), {});
      if (r.precio) { pr.inv.precio = String(r.precio); pr.inv.auto = false; tomado.push('precio (' + eur(r.precio) + ')'); }
      if (r.duracion) { pr.duracion = r.duracion; tomado.push('duración'); }
      if (r.pasos) { pr.pasos.items = r.pasos; if (r.pasos.some((x) => num(x.imp))) pr.inv.auto = true; tomado.push(pl(r.pasos.length, 'paso', 'pasos')); }
      if (r.hitos) { pr.inv.hitos = r.hitos; tomado.push('hitos de pago'); }
      if (r.incluye) { pr.inv.incluye = r.incluye; tomado.push('incluye'); }
      if (r.noIncluye) { pr.inv.noIncluye = r.noIncluye; tomado.push('no incluye'); }
      pr.fusion = { fecha: new Date().toISOString(), ia: false, fuentes: docs.map((d) => d.nombre), tomado, notas: v ? '' : 'Sin conexión con Claude: los textos de situación, beneficios y riesgos se han preparado con la sesión. Conecta Claude para redactar la fusión completa.' };
    }
    guardar();
    toast(tomado.length ? `Fusión hecha: ${pr.fusion.tomado.slice(0, 6).join(', ')}${pr.fusion.tomado.length > 6 ? '…' : ''}. Revísalo antes de enviar.` : 'No se ha encontrado nada que tomar de los documentos. Revísalos o conecta Claude.');
  };
  const NOMBRE_CAMPO = (p) => ({ t1: 'título', t2: 'título', subtitulo: 'subtítulo', alcance: 'alcance', duracion: 'duración', tipo: 'modelo', 'sit.items': 'situación', 'sit.intro': 'situación', 'riesgo.linea': 'riesgo', 'obtienen.items': 'beneficios', 'obtienen.resultado': 'resultado', 'pasos.items': 'pasos', 'pasos.regla': 'regla del proceso', 'inv.precio': 'precio', 'inv.hitos': 'hitos de pago', 'inv.incluye': 'incluye', 'inv.noIncluye': 'no incluye', 'inv.descuentos': 'descuentos', 'inv.objetivos': 'objetivos variables', 'inv.variable.on': 'parte variable', 'inv.variable.pct': 'parte variable', 'coste.riesgos': 'coste de no hacerlo' }[p.replace(/^\./, '')] || (p.replace(/^\./, '').startsWith('coste.') ? 'valor y retorno' : p.replace(/^\./, '').split('.')[0]));

  /* ================= EDITOR ================= */
  const ruta1 = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const pon1 = (o, p, v) => { const k = p.split('.'), u = k.pop(); ruta1(o, k.join('.'))[u] = v; };
  const campo = (p, label, val, o) => `<label class="small ${o && o.cls ? o.cls : ''}">${label}${o && o.area ? `<textarea class="input" rows="${o.rows || 2}" data-p="${p}" placeholder="${esc((o && o.ph) || '')}">${esc(val)}</textarea>` : `<input class="input" ${o && o.type ? `type="${o.type}"` : ''} data-p="${p}" value="${esc(val)}" placeholder="${esc((o && o.ph) || '')}">`}</label>`;
  const lista = (p, arr, cols, add) => `<div class="pc-ed-l" data-l="${p}">${arr.map((x, i) => `<div class="pc-ed-r" style="grid-template-columns:${cols.map((c) => c.w || '1fr').join(' ')} auto">${cols.map((c) => c.area ? `<textarea class="input" rows="2" data-p="${p}.${i}.${c.k}" placeholder="${esc(c.ph)}">${esc(x[c.k])}</textarea>` : `<input class="input" data-p="${p}.${i}.${c.k}" value="${esc(x[c.k])}" placeholder="${esc(c.ph)}">`).join('')}<button class="icon-btn" data-ldel="${p}" data-i="${i}" aria-label="Quitar">×</button></div>`).join('')}<button class="btn ghost small" data-ladd="${p}">${add}</button></div>`;
  const NUEVO = { 'sit.items': { t: '', d: '', c: '' }, 'riesgo.linea': { cuando: '', que: '' }, 'riesgo.stats': { v: '', t: '', fuente: '' }, 'obtienen.items': { t: '', elimina: '', d: '' }, 'pasos.items': { t: '', d: '', cuando: '', quien: '', ent: '', imp: '' }, 'equipo.items': { n: '', rol: '', d: '', pasos: '' }, 'valor.filas': { k: '', sep: '', con: '' }, 'coste.riesgos': { r: '', q: '', imp: '' }, 'inv.hitos': { t: '', pct: '' }, 'inv.descuentos': { t: '', imp: '' }, 'inv.objetivos': { t: '', peso: '', accion: '', tramos: null } };
  let abierto = 'base';
  VISTAS.propuesta = (host) => {
    const ST = S();
    if (!ST.propuesta || !ST.propuesta.generada) {
      host.innerHTML = `<section class="glass pad stack"><div class="eyebrow">Propuesta comercial</div><h3 class="iv-bt">De la primera sesión a la propuesta</h3><p style="margin:0">Con lo escuchado, los objetivos del empresario, las causas que más pesan y el plan, se prepara la propuesta comercial: un dossier con su situación, lo que obtiene, el protocolo de trabajo, el coste de no hacerlo, la inversión y el siguiente paso.</p>
        <ul class="small" style="margin:0;padding-left:18px"><li><b>Se habla de valor, no de precio:</b> la inversión es una parte pequeña del valor que se genera o de la pérdida que se evita, y el retorno se enseña con sus supuestos.</li><li><b>Dos modelos:</b> proyecto llave en mano (precio cerrado, pago por hitos) o programa de implantación (cuotas y, si se pacta, una parte variable por objetivos que dependen al 100 % de la empresa).</li><li>Todo es editable antes de enviarlo.</li></ul>
        <div class="row"><button class="btn solid" id="pcPrep">Preparar la propuesta desde la primera sesión</button><small class="muted">${pl((ST.objetivos || []).length, 'objetivo', 'objetivos')} · ${pl(causasOrdenadas().length, 'causa', 'causas')} · ${pl((ST.plan.acciones || []).length, 'acción del plan', 'acciones del plan')}</small></div></section>`;
      host.insertAdjacentHTML('beforeend', fuentesHTML());
      $('#pcPrep', host).onclick = () => { preparar(); render(); toast('Propuesta preparada: revisa el precio y los textos.'); };
      wireFuentes(host);
      return;
    }
    const pr = ST.propuesta, r = retorno(pr), f = firma(), N = neto(pr), PR = precio(pr), cu = cuotas(pr), prog = pr.tipo === 'programa';
    const sumaPeso = pr.inv.objetivos.reduce((a, o) => a + num(o.peso), 0), malos = pr.inv.objetivos.filter((o) => DEPENDE.test(o.t + ' ' + o.accion));
    const bloque = (id, t, d, html) => `<section class="glass pad stack pc-ed ${abierto === id ? 'on' : ''}" data-b="${id}"><button class="pc-ed-h" data-ab="${id}" aria-expanded="${abierto === id}"><b>${t}</b><small>${d}</small><span>${abierto === id ? '▴' : '▾'}</span></button>${abierto === id ? html : ''}</section>`;
    host.innerHTML = `<section class="glass pad stack"><div class="row"><div><div class="eyebrow">Propuesta comercial</div><small class="muted">Preparada el ${fLarga(pr.generada.slice(0, 10))} · ${prog ? 'programa de implantación' : 'proyecto llave en mano'} · ${PR ? eur(N || PR) + ' + IVA' : 'precio por fijar'}</small></div><span class="spacer"></span><button class="btn ghost small" id="pcIA">Redactar los textos con Claude</button><button class="btn ghost small" id="pcRe">Volver a preparar</button><button class="btn solid" id="pcVer">Ver el dossier</button></div>
        <div class="pc-modelo" role="radiogroup">${[['llave', 'Proyecto llave en mano', 'Pasos con entregable, precio cerrado y pago por hitos.'], ['programa', 'Programa de implantación', 'Jornadas y seguimiento durante meses, cuotas y, si se pacta, un variable por objetivos.']].map(([k, t, d]) => `<button role="radio" aria-checked="${pr.tipo === k}" data-tipo="${k}"><b>${t}</b><small>${d}</small></button>`).join('')}</div></section>
      ${fuentesHTML()}
      <section class="glass pad stack pc-valor"><div class="row"><div><div class="eyebrow">Valor y precio</div><small class="muted">La regla: la inversión es una parte pequeña de lo que se juega la empresa.</small></div><span class="spacer"></span>${r ? `<span class="iv-st ${r.st}">Retorno ${xx(r.min)}–${xx(r.max)}</span>` : ''}</div>
        <div class="iv-g3"><label class="small">Qué se mide<select class="input" data-p="coste.modo"><option value="beneficio" ${pr.coste.modo !== 'perdida' ? 'selected' : ''}>Valor que genera (beneficio)</option><option value="perdida" ${pr.coste.modo === 'perdida' ? 'selected' : ''}>Pérdida que evita (riesgo)</option></select></label>${campo('coste.vMin', pr.coste.modo === 'perdida' ? 'Pérdida mínima (€)' : 'Valor mínimo (€)', pr.coste.vMin, { ph: '400000' })}${campo('coste.vMax', pr.coste.modo === 'perdida' ? 'Pérdida máxima (€)' : 'Valor máximo (€)', pr.coste.vMax, { ph: '1200000' })}${campo('coste.pMin', 'Probabilidad mínima (%)', pr.coste.pMin)}${campo('coste.pMax', 'Probabilidad máxima (%)', pr.coste.pMax)}${campo('coste.valorEmpresa', 'Valor de la empresa (€, opcional)', pr.coste.valorEmpresa, { ph: '3000000' })}</div>
        <div class="iv-g3">${campo('inv.precio', 'Precio del proyecto (€, sin IVA)', pr.inv.auto && precioPasos(pr) ? String(precioPasos(pr)) : pr.inv.precio, { ph: '37000' })}<label class="iv-inl small"><input type="checkbox" data-p="inv.auto" ${pr.inv.auto ? 'checked' : ''}> Sumar los importes de los pasos</label>${campo('validez', 'Validez (días)', pr.validez)}</div>
        ${r ? `<div class="pc-roi-ed"><div><small>Inversión</small><b>${eur(N || PR)}</b>${r.pctEmp ? `<span>${r.pctEmp.toLocaleString('es-ES', { maximumFractionDigits: 1 })} % del valor de la empresa</span>` : ''}</div><div><small>${pr.coste.modo === 'perdida' ? 'Pérdida evitada esperada' : 'Valor esperado'}</small><b>${corto(r.a)}–${corto(r.b)}</b><span>ponderado por la probabilidad</span></div><div class="${r.st}"><small>Retorno esperado</small><b>${xx(r.min)}–${xx(r.max)}</b><span>${r.st === 'ok' ? 'Alto valor: la propuesta se sostiene sola.' : r.st === 'warn' ? 'Justo: refuerza el valor o ajusta el alcance.' : 'No es rentable para el cliente con estos objetivos.'}</span></div></div>
          <p class="small" style="margin:0">Precio recomendado para un retorno de unas 6 veces: <b>${eur(r.recom)}</b> (entre ${eur(r.rango[0])} para 10× y ${eur(r.rango[1])} para 5×). <button class="btn ghost small" id="pcRec">Usar ${eur(r.recom)}</button> ${pr.pasos.items.length ? '<button class="btn ghost small" id="pcRep">Repartir el precio entre los pasos</button>' : ''}</p>
          ${r.st === 'stop' ? `<div class="alert warn small">Con estos objetivos el retorno no compensa la inversión. Si los objetivos del empresario son pequeños, esta propuesta no es rentable para él: ayúdale a plantear objetivos mayores (en el guion, «Objetivos del empresario») o reduce el alcance.</div>` : ''}` : `<p class="small muted" style="margin:0">Pon el valor en juego y el precio para ver el retorno. Ejemplo de referencia: 37.000 € frente a una pérdida evitada de 0,66 a 1,8 M€ con una probabilidad del 20 al 25 % da un retorno de 3,5 a 12 veces.</p>`}
        ${campo('coste.supuestos', 'Supuestos que se citan en el dossier', pr.coste.supuestos, { area: true, ph: 'Valor de la empresa de 3 a 4 M€; descuento por venta forzada del 20 al 40 %…' })}</section>
      ${dimHTML(pr)}
      ${bloque('base', 'Portada e índice', esc(pr.t1 + ' ' + pr.t2), `<div class="iv-g3">${campo('t1', 'Título · primera línea', pr.t1)}${campo('t2', 'Título · segunda línea (en color)', pr.t2)}${campo('alcance', 'Alcance', pr.alcance)}${campo('duracion', 'Duración', pr.duracion)}${campo('ciudad', 'Ciudad', pr.ciudad)}${campo('fecha', 'Fecha', pr.fecha, { type: 'date' })}</div>${campo('subtitulo', 'Subtítulo de la portada', pr.subtitulo, { area: true })}<div class="iv-g3">${campo('idx.a', 'Índice · titular', pr.idx.a)}${campo('idx.b', 'Índice · en contorno', pr.idx.b)}${campo('idx.c', 'Índice · en color', pr.idx.c)}${campo('cifra', 'Cifra decorativa (opcional)', pr.cifra, { ph: r ? xx(r.centro) : '360' })}</div>${campo('idx.texto', 'Índice · texto', pr.idx.texto, { area: true, ph: pr.subtitulo })}`)}
      ${bloque('sit', 'La situación actual', pl(pr.sit.items.length, 'problema', 'problemas') + ' · de las causas que más pesan', `<div class="iv-g3">${campo('sit.h1', 'Titular', pr.sit.h1)}${campo('sit.h2', 'Titular · en contorno', pr.sit.h2)}</div>${campo('sit.intro', 'Entradilla', pr.sit.intro, { area: true })}${lista('sit.items', pr.sit.items, [{ k: 't', ph: 'Problema' }, { k: 'd', ph: 'Explicación o cita', area: true }, { k: 'c', ph: 'Consecuencia' }], 'Añadir un problema')}<small class="muted">Máximo seis en el dossier.</small>`)}
      ${bloque('riesgo', 'Lo que ocurre sin actuar', pr.riesgo.on ? pl(pr.riesgo.linea.length, 'momento', 'momentos') : 'Oculta', `<label class="iv-inl small"><input type="checkbox" data-p="riesgo.on" ${pr.riesgo.on ? 'checked' : ''}> Incluir esta hoja</label><div class="iv-g3">${campo('riesgo.h1', 'Titular', pr.riesgo.h1)}${campo('riesgo.h2', 'Titular · en contorno', pr.riesgo.h2)}</div>${campo('riesgo.intro', 'Entradilla', pr.riesgo.intro, { area: true })}${lista('riesgo.linea', pr.riesgo.linea, [{ k: 'cuando', ph: 'Mes 3', w: '120px' }, { k: 'que', ph: 'Qué ocurre' }], 'Añadir un momento')}<div class="eyebrow">Datos de contexto (solo se muestran con su fuente)</div>${lista('riesgo.stats', pr.riesgo.stats, [{ k: 'v', ph: '30 %', w: '90px' }, { k: 't', ph: 'de las empresas familiares…' }, { k: 'fuente', ph: 'Fuente y año' }], 'Añadir un dato')}`)}
      ${bloque('obtienen', 'Lo que obtienen', pl(pr.obtienen.items.length, 'beneficio', 'beneficios') + ' · sus objetivos primero', `<div class="iv-g3">${campo('obtienen.h1', 'Titular', pr.obtienen.h1)}${campo('obtienen.h2', 'Titular · en contorno', pr.obtienen.h2)}</div>${campo('obtienen.intro', 'Entradilla', pr.obtienen.intro, { area: true })}${lista('obtienen.items', pr.obtienen.items, [{ k: 't', ph: 'Beneficio' }, { k: 'elimina', ph: 'Elimina…' }, { k: 'd', ph: 'Explicación', area: true }], 'Añadir un beneficio')}${campo('obtienen.resultado', 'Resultado final', pr.obtienen.resultado, { area: true })}`)}
      ${bloque('pasos', 'El protocolo de trabajo', pl(pr.pasos.items.length, 'paso', 'pasos') + (precioPasos(pr) ? ' · ' + eur(precioPasos(pr)) : ''), `<div class="iv-g3">${campo('pasos.h1', 'Titular', pr.pasos.h1)}${campo('pasos.h2', 'Titular · en contorno', pr.pasos.h2)}</div>${campo('pasos.intro', 'Entradilla', pr.pasos.intro, { area: true })}${lista('pasos.items', pr.pasos.items, [{ k: 't', ph: 'Paso' }, { k: 'd', ph: 'Qué se hace', area: true }, { k: 'cuando', ph: 'Semanas 1-3', w: '110px' }, { k: 'quien', ph: 'Quién (separado por comas)' }, { k: 'ent', ph: 'Entregable' }, { k: 'imp', ph: '€', w: '90px' }], 'Añadir un paso')}${campo('pasos.regla', 'La regla del proceso', pr.pasos.regla, { area: true })}`)}
      ${bloque('equipo', 'El equipo y el valor del encargo', (pr.equipo.on ? pl(pr.equipo.items.length, 'perfil', 'perfiles') : 'Equipo oculto') + ' · comparativa', `<label class="iv-inl small"><input type="checkbox" data-p="equipo.on" ${pr.equipo.on ? 'checked' : ''}> Incluir la hoja del equipo (cuando intervienen varios especialistas)</label>${lista('equipo.items', pr.equipo.items, [{ k: 'n', ph: 'Nombre o perfil' }, { k: 'rol', ph: 'Área' }, { k: 'd', ph: 'Qué hace', area: true }, { k: 'pasos', ph: 'Pasos' }], 'Añadir un perfil')}${campo('equipo.nota', 'Cómo trabaja el equipo', pr.equipo.nota, { area: true })}<label class="iv-inl small"><input type="checkbox" data-p="valor.on" ${pr.valor.on ? 'checked' : ''}> Incluir la comparativa «por separado» frente a «con nosotros»</label>${lista('valor.filas', pr.valor.filas, [{ k: 'k', ph: 'Concepto', w: '130px' }, { k: 'sep', ph: 'Por separado' }, { k: 'con', ph: 'Con nosotros' }], 'Añadir una fila')}`)}
      ${bloque('coste', 'El coste de no hacerlo', pl(pr.coste.riesgos.length, 'riesgo', 'riesgos'), `<label class="iv-inl small"><input type="checkbox" data-p="coste.on" ${pr.coste.on ? 'checked' : ''}> Incluir esta hoja</label><div class="iv-g3">${campo('coste.h1', 'Titular', pr.coste.h1)}${campo('coste.h2', 'Titular · en contorno', pr.coste.h2)}</div>${campo('coste.intro', 'Entradilla', pr.coste.intro, { area: true })}${lista('coste.riesgos', pr.coste.riesgos, [{ k: 'r', ph: 'Riesgo', w: '150px' }, { k: 'q', ph: 'Qué ocurre', area: true }, { k: 'imp', ph: 'Impacto estimado' }], 'Añadir un riesgo')}`)}
      ${bloque('inv', 'La inversión y la forma de pago', PR ? `${eur(N || PR, prog)} · ${prog ? pr.inv.cuotas.n + ' cuotas' + (pr.inv.variable.on ? ' · ' + pr.inv.variable.pct + ' % por objetivos' : '') : pr.inv.hitos.length + ' hitos'}` : 'Precio por fijar', (prog ? `<div class="eyebrow">Descuentos sobre el precio</div>${lista('inv.descuentos', pr.inv.descuentos, [{ k: 't', ph: 'Inversión ya realizada, beca…' }, { k: 'imp', ph: '€', w: '110px' }], 'Añadir un descuento')}
          <div class="iv-g3">${campo('inv.cuotas.n', 'Número de cuotas', pr.inv.cuotas.n, { type: 'number' })}<label class="small">Cuotas<select class="input" data-p="inv.cuotas.modo"><option value="dec" ${pr.inv.cuotas.modo === 'dec' ? 'selected' : ''}>Decrecientes (más al principio)</option><option value="igual" ${pr.inv.cuotas.modo !== 'dec' ? 'selected' : ''}>Iguales</option></select></label>${campo('inv.cuotas.inicio', 'Primera cuota', pr.inv.cuotas.inicio || (pr.fecha || hoy()).slice(0, 7), { type: 'month' })}</div>
          <p class="small" style="margin:0">Fijo: <b>${eur(cu.fijo, 1)}</b> en ${cu.lista.length} cuotas (${cu.lista.slice(0, 3).map((x) => eur(x.v, 1)).join(', ')}${cu.lista.length > 3 ? '…' : ''})${pr.inv.variable.on ? ` · Variable: <b>${eur(cu.variable, 1)}</b> al cierre` : ''}.</p>
          <div class="pc-var"><label class="iv-inl small"><input type="checkbox" data-p="inv.variable.on" ${pr.inv.variable.on ? 'checked' : ''}> <b>Parte del precio vinculada a objetivos</b> (excepcional, para cerrar cuando el cliente lo pide)</label>${pr.inv.variable.on ? `${campo('inv.variable.pct', 'Porcentaje variable (%)', pr.inv.variable.pct, { type: 'number' })}
            <p class="small muted" style="margin:0">Regla: cada objetivo depende al 100 % de lo que haga la empresa (tareas, decisiones, registros), nunca de ventas, márgenes, clientes, bancos ni terceros. Si la empresa no ejecuta, cobra igual; solo se descuenta lo que no se consiga por un incumplimiento del consultor. Los pesos suman el 100 % del variable.</p>
            ${lista('inv.objetivos', pr.inv.objetivos, [{ k: 't', ph: 'Objetivo (lo que hará la empresa)' }, { k: 'peso', ph: 'Peso %', w: '80px' }, { k: 'accion', ph: 'Acciones verificables, una por línea', area: true }], 'Añadir un objetivo')}
            ${sumaPeso !== 100 ? `<div class="alert warn small">Los pesos suman ${sumaPeso} %: deben sumar 100 %.</div>` : ''}${malos.length ? `<div class="alert stop small">Depende de terceros: ${malos.map((o) => '«' + esc(o.t) + '»').join(', ')}. Reformúlalo sobre lo que hará la empresa (por ejemplo, «registrar y revisar cada semana…» en lugar de «vender más»).</div>` : ''}` : ''}</div>`
          : `<div class="eyebrow">Pago por hitos</div>${lista('inv.hitos', pr.inv.hitos, [{ k: 't', ph: 'Momento' }, { k: 'pct', ph: '%', w: '80px' }], 'Añadir un hito')}${pr.inv.hitos.reduce((a, x) => a + num(x.pct), 0) !== 100 ? `<div class="alert warn small">Los hitos suman ${pr.inv.hitos.reduce((a, x) => a + num(x.pct), 0)} %: deben sumar 100 %.</div>` : ''}${campo('inv.notaHitos', 'Nota bajo la forma de pago', pr.inv.notaHitos, { area: true })}`)
          + `<div class="iv-g3">${campo('inv.incluye', 'Incluye (una línea por punto)', pr.inv.incluye, { area: true, rows: 4 })}${campo('inv.noIncluye', 'No incluye', pr.inv.noIncluye, { area: true, rows: 4 })}</div>`)}
      ${bloque('cierre', 'El siguiente paso y la firma', esc(pr.cierre.cta), `<div class="iv-g3">${campo('cierre.h1', 'Titular', pr.cierre.h1)}${campo('cierre.h2', 'Titular · en contorno', pr.cierre.h2)}${campo('cierre.cta', 'Llamada a la acción', pr.cierre.cta)}</div>${campo('cierre.texto', 'Texto', pr.cierre.texto, { area: true })}${campo('cierre.firmantes', 'Firman por la empresa (uno por línea)', pr.cierre.firmantes, { area: true })}`)}
      ${bloque('firma', 'Ficha de tu firma', esc(f.nombre) + ' · para todas tus propuestas', `<div class="iv-g3">${['nombre:Nombre comercial', 'lema:Lema', 'consultor:Consultor', 'cargo:Cargo', 'razon:Razón social', 'cif:CIF', 'direccion:Dirección', 'ciudad:Ciudad', 'email:Correo', 'tel:Teléfono o WhatsApp'].map((x) => { const [k, l] = x.split(':'); return `<label class="small">${l}<input class="input" data-f="${k}" value="${esc(f[k])}"></label>`; }).join('')}</div><label class="small">Descripción de la contraportada<textarea class="input" rows="2" data-f="descripcion">${esc(f.descripcion)}</textarea></label>`)}`;
    // Eventos
    $('#pcVer', host).onclick = () => V.informes.propuesta();
    wireFuentes(host);
    wireDim(host, pr);
    $('#pcRe', host).onclick = (e) => { if (!e.target.dataset.conf) { e.target.dataset.conf = 1; e.target.textContent = '¿Seguro? Se rehace desde la sesión'; return; } const tipo = pr.tipo, inv = pr.inv, coste = pr.coste; ST.propuesta = null; preparar(); Object.assign(ST.propuesta, { tipo }); ST.propuesta.inv = Object.assign(inv, { objetivos: ST.propuesta.inv.objetivos }); ST.propuesta.coste = Object.assign(ST.propuesta.coste, { modo: coste.modo, vMin: coste.vMin, vMax: coste.vMax, pMin: coste.pMin, pMax: coste.pMax, valorEmpresa: coste.valorEmpresa, supuestos: coste.supuestos }); render(); };
    $$('[data-tipo]', host).forEach((b) => (b.onclick = () => { pr.tipo = b.dataset.tipo; if (pr.tipo === 'programa' && !pr.duracion) pr.duracion = '10 meses'; guardar(); render(); }));
    $$('[data-ab]', host).forEach((b) => (b.onclick = () => { abierto = abierto === b.dataset.ab ? '' : b.dataset.ab; render(); }));
    $$('[data-p]', host).forEach((i) => {
      const fin = i.type === 'checkbox' || i.tagName === 'SELECT' || ['number', 'month', 'date'].includes(i.type) || /^(coste\.(v|p)|inv\.precio|inv\.variable|validez)/.test(i.dataset.p) || /\.(imp|peso|pct)$/.test(i.dataset.p);
      const set = () => { let v = i.type === 'checkbox' ? i.checked : i.value; if (i.dataset.p === 'inv.precio' && pr.inv.auto) pr.inv.auto = false; if (/inv\.(cuotas\.n|variable\.pct)$/.test(i.dataset.p)) v = +v || 0; pon1(pr, i.dataset.p, v); guardar(); };
      i.oninput = () => { set(); }; if (fin) i.onchange = () => { set(); render(); };
    });
    $$('[data-ladd]', host).forEach((b) => (b.onclick = () => { const p = b.dataset.ladd, n = Object.assign({}, NUEVO[p]); if (p === 'inv.objetivos') n.tramos = tramosTipo(); ruta1(pr, p).push(n); guardar(); render(); }));
    $$('[data-ldel]', host).forEach((b) => (b.onclick = () => { ruta1(pr, b.dataset.ldel).splice(+b.dataset.i, 1); guardar(); render(); }));
    $$('[data-f]', host).forEach((i) => (i.oninput = () => { const ff = firma(); ff[i.dataset.f] = i.value; ponFirma(ff); }));
    const rec = $('#pcRec', host); if (rec) rec.onclick = () => { pr.inv.precio = String(r.recom); pr.inv.auto = false; guardar(); render(); toast('Precio aplicado. Repártelo entre los pasos si quieres desglosarlo.'); };
    const rep = $('#pcRep', host); if (rep) rep.onclick = () => { const tot = num(pr.inv.precio) || PR; if (!tot) return toast('Pon antes el precio.'); const pesos = pr.pasos.items.map((x) => { const m = String(x.cuando).match(/(\d+)\D+(\d+)/); return m ? +m[2] - +m[1] + 1 : 2; }); const sp = pesos.reduce((a, x) => a + x, 0); let acc = 0; pr.pasos.items.forEach((x, i) => { const v = i === pesos.length - 1 ? tot - acc : redondea((tot * pesos[i]) / sp); x.imp = String(v); acc += v; }); pr.inv.auto = true; guardar(); render(); toast('Precio repartido según la duración de cada paso.'); };
    $('#pcIA', host).onclick = async (e) => {
      const b = e.currentTarget; const v = A.ia ? await A.ia.asegurar('Redactar la propuesta comercial') : null; if (!v) return toast('Sin conexión con Claude: los textos se quedan como están. Puedes conectarlo en «Conexiones».');
      b.disabled = true; b.textContent = 'Redactando…';
      try {
        const ctx = { empresa: empresa(), objetivos: (ST.objetivos || []).map((o) => ({ dice: o.dice, smart: fraseObj(o), beneficio: o.beneficio })), causas: causasOrdenadas().slice(0, 6).map((x) => ({ causa: x.c.t, citas: x.ss.map((s) => s.cita).filter(Boolean).slice(0, 2) })), resumen: (ST.transcripciones.find((t) => t.ia) || {}).ia, tipo: pr.tipo };
        const j = await A.ia.json(`Eres consultor de pymes y escribes la propuesta comercial que sale de la primera sesión con un empresario. Tono: de usted, directo, frases cortas, sin superlativos ni promesas de resultados, sin cifras inventadas. No hables de precio: habla del valor y de lo que la empresa obtiene. Los titulares son de dos partes: la segunda es el remate que se destaca. Devuelve JSON: {"t1":"","t2":"","subtitulo":"","idx":{"a":"","b":"","c":"","texto":""},"sit":{"h1":"","h2":"","intro":"","items":[{"t":"problema en una frase","d":"explicación con sus palabras","c":"consecuencia"}]},"riesgo":{"h1":"","h2":"","linea":[{"cuando":"Mes 3","que":""}]},"obtienen":{"h1":"","h2":"","intro":"","items":[{"t":"","elimina":"Elimina …","d":""}],"resultado":""}}. Máximo 6 problemas, 5 momentos y 6 beneficios.\nContexto: ${JSON.stringify(ctx).slice(0, 30000)}`);
        if (j) { ['t1', 't2', 'subtitulo'].forEach((k) => { if (j[k]) pr[k] = j[k]; }); ['idx', 'sit', 'riesgo', 'obtienen'].forEach((k) => { if (j[k]) Object.keys(j[k]).forEach((x) => { if (j[k][x] && (!Array.isArray(j[k][x]) || j[k][x].length)) pr[k][x] = j[k][x]; }); }); guardar(); render(); toast('Textos redactados: revísalos antes de enviar.'); }
      } catch (x) { toast('No se pudo: ' + x.message); }
      b.disabled = false; b.textContent = 'Redactar los textos con Claude';
    };
  };
  V.propuesta = { valorInversion, preparar, dossier, retorno, cuotas, precio, neto, firma };
})();
