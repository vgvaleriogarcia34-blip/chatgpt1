/* Atalaya 360° · Empresa modelo
   Valdenorte Estructuras y Montajes, S.L.: una empresa ficticia completa que alimenta todos los mundos con los mismos datos.
   Una sola fuente (años, clientes, productos, proveedores, personas, puestos y equipos) y un generador por mundo:
   A.modelo.generar('simulador' | 'estrategia' | 'personas' | 'agenda' | 'consultor' | 'libro' | 'intervencion').
   Las fechas de trabajo (tareas, cobros, sesiones) se calculan respecto a hoy para que la empresa esté siempre «viva».
   El nombre, las personas y las cifras son inventados: cualquier parecido con una empresa real es casual. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const M = (A.modelo = A.modelo || {});
  M.ID = 'modelo';

  /* ---------- Utilidades ---------- */
  const rnd = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r0 = (x) => Math.round(x);
  const dia = (n, base) => { const d = base ? new Date(base + 'T12:00:00') : new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const hoy = () => dia(0);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let n = 0; const id = (p) => p + (++n).toString(36) + 'm';

  /* ================= DATOS MAESTROS ================= */
  const EMPRESA = {
    id: 'modelo', modelo: true, nombre: 'Valdenorte Estructuras y Montajes, S.L.', forma: 'Sociedad limitada (S.L.)', cif: 'B00000000',
    constitucion: 1996, sector: 'industria', actividad: 'Fabricación y montaje de estructuras metálicas, carpintería metálica y calderería ligera para industria, agroalimentación y obra pública',
    provincia: 'Asturias', plantilla: 33, rol: 'holding', participacion: 100,
    socios: [{ nombre: 'Ramón Valdés', pct: 60 }, { nombre: 'Javier Valdés', pct: 20 }, { nombre: 'Lucía Valdés', pct: 20 }],
    datosReales: true, datosRealesDesde: '2021-01-01', datosRealesTs: '2021-01-01T00:00:00.000Z', datosRealesOrigen: 'modelo'
  };
  M.EMPRESA = EMPRESA;

  // Cinco años de cuentas. La deuda a corto (con la póliza) cuadra el balance: crece porque la caja se va en financiar a los clientes
  const ANIOS = [
    { anio: 2021, ventas: 3200000, margen: 48, personal: 960000, otrosGastos: 290000, amortizacion: 120000, gastosFinancieros: 22000, dividendos: 40000, plantilla: 26, dso: 68, dio: 55, dpo: 60, inmovilizado: 1100000, tesoreria: 420000, deudaLP: 420000 },
    { anio: 2022, ventas: 3750000, margen: 45, personal: 1070000, otrosGastos: 310000, amortizacion: 125000, gastosFinancieros: 24000, dividendos: 40000, plantilla: 28, dso: 72, dio: 62, dpo: 58, inmovilizado: 1120000, tesoreria: 330000, deudaLP: 380000 },
    { anio: 2023, ventas: 4100000, margen: 46, personal: 1180000, otrosGastos: 330000, amortizacion: 135000, gastosFinancieros: 30000, dividendos: 50000, plantilla: 30, dso: 77, dio: 66, dpo: 55, inmovilizado: 1180000, tesoreria: 290000, deudaLP: 450000 },
    { anio: 2024, ventas: 4380000, margen: 47, personal: 1270000, otrosGastos: 350000, amortizacion: 140000, gastosFinancieros: 34000, dividendos: 60000, plantilla: 31, dso: 81, dio: 70, dpo: 52, inmovilizado: 1200000, tesoreria: 240000, deudaLP: 400000 },
    { anio: 2025, ventas: 4620000, margen: 46, personal: 1360000, otrosGastos: 370000, amortizacion: 150000, gastosFinancieros: 41000, dividendos: 60000, plantilla: 33, dso: 86, dio: 74, dpo: 50, inmovilizado: 1220000, tesoreria: 160000, deudaLP: 350000 }
  ];
  const historico = () => {
    let fp = 1450000;
    return ANIOS.map((a, i) => {
      const costeVentas = r0(a.ventas * (1 - a.margen / 100)), ebitda = a.ventas - costeVentas - a.personal - a.otrosGastos;
      const bai = ebitda - a.amortizacion - a.gastosFinancieros, impuestos = r0(Math.max(0, bai) * 0.25), beneficio = bai - impuestos;
      if (i) fp = fp + r0(ANIOS[i - 1]._ben) - ANIOS[i - 1].dividendos; a._ben = beneficio;
      const clientes = r0(a.ventas * a.dso / 365), existencias = r0(costeVentas * a.dio / 365), proveedores = r0(costeVentas * a.dpo / 365);
      const deudaCP = r0(a.inmovilizado + existencias + clientes + a.tesoreria - fp - a.deudaLP - proveedores);
      return { anio: a.anio, ventas: a.ventas, costeVentas, personal: a.personal, otrosGastos: a.otrosGastos, amortizacion: a.amortizacion, gastosFinancieros: a.gastosFinancieros, impuestos, beneficio: r0(beneficio), dividendos: a.dividendos, plantilla: a.plantilla,
        inmovilizado: a.inmovilizado, existencias, clientes, tesoreria: a.tesoreria, fondosPropios: r0(fp), deudaLP: a.deudaLP, deudaCP, proveedores };
    });
  };
  M.ANIOS = ANIOS;
  M.historico = historico;

  // Clientes de 2025 (suman las ventas del año). El primero concentra el 31 %
  const CLIENTES = [
    ['Agroindustrial Valle Verde', 1432000, 0.57, 95, 'Agroalimentación'], ['Puertos y Obras del Norte', 520000, 0.50, 90, 'Obra pública'],
    ['Planta Química Rivero', 410000, 0.46, 75, 'Industria'], ['Cooperativa Láctea del Valle', 352000, 0.52, 60, 'Agroalimentación'],
    ['Ingeniería Montaña', 298000, 0.49, 80, 'Industria'], ['Construcciones Lavandera', 276000, 0.60, 120, 'Construcción'],
    ['Naves Agrícolas del Oriente', 232000, 0.55, 60, 'Agroalimentación'], ['Ayuntamientos de la comarca', 214000, 0.58, 110, 'Obra pública'],
    ['Talleres Navia', 168000, 0.48, 45, 'Industria'], ['Energías del Caudal', 156000, 0.44, 60, 'Industria'],
    ['Particulares y pequeños clientes', 380000, 0.63, 30, 'Varios'], ['Mantenimientos varios', 182000, 0.40, 30, 'Industria']
  ];
  // Líneas de negocio: montajes y mantenimiento dejan margen; la carpintería metálica apenas cubre costes
  const LINEAS = [
    { nombre: 'Estructuras metálicas', unidades: 62, precio: 31500, cv: 17300, capacidad: 75, elasticidad: -0.7 },
    { nombre: 'Montajes industriales', unidades: 410, precio: 2350, cv: 1100, capacidad: 480, elasticidad: -0.5 },
    { nombre: 'Carpintería metálica', unidades: 640, precio: 1280, cv: 1050, capacidad: 800, elasticidad: -1.6 },
    { nombre: 'Calderería ligera', unidades: 150, precio: 2600, cv: 1480, capacidad: 190, elasticidad: -0.8 },
    { nombre: 'Mantenimiento industrial (nueva)', unidades: 2900, precio: 58, cv: 27, capacidad: 5200, elasticidad: -0.6 },
    { nombre: 'Naves modulares en kit (nueva)', unidades: 4, precio: 38000, cv: 24500, capacidad: 12, elasticidad: -0.9 }
  ];
  const PROVEEDORES = [
    ['Siderúrgica Cantábrica', 1020000, 60, 2, 5, 4, 91], ['Aceros Laminados del Norte', 486000, 45, 3, 4, 4, 94],
    ['Galvanizados Siero', 212000, 30, 1, 5, 3, 82], ['Pinturas Industriales Nalón', 96000, 60, 4, 2, 4, 97],
    ['Tornillería y Anclajes Astur', 84000, 90, 2, 3, 4, 93], ['Grúas y Elevación Occidente', 118000, 30, 2, 4, 3, 86],
    ['Transportes Pajares', 74000, 30, 5, 2, 3, 89], ['Gases Técnicos del Norte', 46000, 60, 3, 3, 4, 98]
  ];

  // Personas: [nombre, puesto, área, jefe (índice), coste anual, DISC D/I/S/C o null si no ha hecho el test]
  const PERSONAS = [
    ['Ramón Valdés', 'Gerente y fundador', 'Dirección', null, 72000, [82, 55, 20, 35]],
    ['Javier Valdés', 'Director comercial', 'Comercial', 0, 54000, [60, 78, 30, 25]],
    ['Lucía Valdés', 'Responsable de administración y finanzas', 'Administración', 0, 50000, [35, 30, 55, 80]],
    ['Andrés Prieto', 'Jefe de taller', 'Producción', 0, 46000, [70, 25, 45, 50]],
    ['Marta Cuesta', 'Jefa de oficina técnica', 'Oficina técnica', 0, 47000, [40, 35, 40, 85]],
    ['Iván Fernández', 'Jefe de montajes', 'Montajes', 0, 45000, [65, 50, 35, 40]],
    ['Sara Menéndez', 'Comercial técnica', 'Comercial', 1, 36000, [45, 75, 50, 35]],
    ['Diego Álvarez', 'Comercial de mantenimiento', 'Comercial', 1, 34000, [55, 65, 40, 30]],
    ['Elena Suárez', 'Administrativa contable', 'Administración', 2, 28000, [20, 40, 75, 70]],
    ['Paula García', 'Administrativa de compras', 'Administración', 2, 27000, [30, 45, 70, 60]],
    ['Rubén Díaz', 'Delineante proyectista', 'Oficina técnica', 4, 33000, [30, 30, 55, 80]],
    ['Nuria Rodríguez', 'Técnica de calidad y prevención', 'Oficina técnica', 4, 32000, [35, 40, 60, 75]],
    ['Óscar Martínez', 'Encargado de soldadura', 'Producción', 3, 34000, [60, 30, 50, 45]],
    ['Luis Gutiérrez', 'Soldador oficial 1.ª', 'Producción', 12, 29000, [40, 35, 65, 50]],
    ['Héctor López', 'Soldador oficial 1.ª', 'Producción', 12, 29000, [35, 45, 60, 40]],
    ['Manuel Sánchez', 'Soldador oficial 2.ª', 'Producción', 12, 26000, [30, 40, 70, 45]],
    ['Adrián Pérez', 'Calderero oficial 1.ª', 'Producción', 3, 29000, [45, 30, 55, 60]],
    ['Javier Iglesias', 'Operario de corte y plegado', 'Producción', 3, 25000, null],
    ['Marcos Vázquez', 'Operario de corte y plegado', 'Producción', 3, 25000, null],
    ['Tomás Rubio', 'Pintor industrial', 'Producción', 3, 25500, null],
    ['Alberto Castro', 'Carpintero metálico', 'Producción', 3, 26000, [35, 50, 60, 40]],
    ['Sergio Blanco', 'Carpintero metálico', 'Producción', 3, 25500, null],
    ['Jorge Moreno', 'Aprendiz de taller', 'Producción', 12, 19000, null],
    ['Pablo Fuente', 'Montador oficial 1.ª', 'Montajes', 5, 30000, [55, 45, 50, 35]],
    ['Raúl Ortega', 'Montador oficial 1.ª', 'Montajes', 5, 30000, [50, 55, 45, 30]],
    ['Carlos Herrero', 'Montador oficial 2.ª', 'Montajes', 5, 27000, null],
    ['Daniel Peña', 'Montador oficial 2.ª', 'Montajes', 5, 27000, null],
    ['Fernando Gil', 'Gruista y conductor', 'Montajes', 5, 27500, null],
    ['Alejandro Ramos', 'Técnico de mantenimiento', 'Mantenimiento', 7, 29000, [40, 45, 60, 55]],
    ['Víctor Santos', 'Técnico de mantenimiento', 'Mantenimiento', 7, 28000, null],
    ['Cristina Nieto', 'Mozo de almacén y expediciones', 'Logística', 9, 23000, null],
    ['Hugo Lorenzo', 'Conductor de reparto', 'Logística', 9, 24000, null],
    ['Beatriz Arias', 'Recepción y atención al cliente', 'Administración', 2, 23500, [30, 70, 65, 40]]
  ];
  M.PERSONAS = PERSONAS;

  /* ---------- Cifras para contar el beneficio de cada mundo (paseo virtual) ---------- */
  M.cifras = () => {
    const H = historico(), u = H[H.length - 1], p = H[0];
    const ebitda = (h) => h.ventas - h.costeVentas - h.personal - h.otrosGastos;
    const totCli = CLIENTES.reduce((a, c) => a + c[1], 0);
    const carp = LINEAS[2], carpMc = (carp.precio - carp.cv) * carp.unidades, mont = LINEAS[1], montPct = Math.round((mont.precio - mont.cv) / mont.precio * 100), carpPct = Math.round((carp.precio - carp.cv) / carp.precio * 100);
    const cajaDso = r0(u.ventas * (ANIOS[4].dso - 65) / 365);
    const sinDisc = PERSONAS.filter((x) => !x[5]).length;
    return {
      ventas0: p.ventas, ventas: u.ventas, cagr: Math.round((Math.pow(u.ventas / p.ventas, 1 / 4) - 1) * 1000) / 10,
      ebitda: ebitda(u), ebitdaPct: Math.round(ebitda(u) / u.ventas * 1000) / 10, ebitda0Pct: Math.round(ebitda(p) / p.ventas * 1000) / 10,
      dso0: ANIOS[0].dso, dso: ANIOS[4].dso, cajaDso, deudaCP: u.deudaCP, deudaCP0: p.deudaCP, tesoreria: u.tesoreria, tesoreria0: p.tesoreria,
      top: CLIENTES[0][0], topPct: Math.round(CLIENTES[0][1] / totCli * 100), nClientes: CLIENTES.length,
      carpPct, montPct, carpMc, plantilla: u.plantilla, plantilla0: p.plantilla, sinDisc, nPersonas: PERSONAS.length,
      inversion: 1200000, incVentas: 1100000, contrataciones: 6, acero: PROVEEDORES[0][1] + PROVEEDORES[1][1]
    };
  };

  /* ================= GENERADORES POR MUNDO ================= */

  /* ---------- Simulador ---------- */
  function simulador() {
    const H = historico(), u = H[H.length - 1];
    const d = A.defaultState ? A.defaultState() : {};
    return Object.assign(d, {
      empresaNombre: EMPRESA.nombre, ejemplo: false, sinDatos: false, modelo: true,
      proyecto: 'Línea de corte láser y plegado con ampliación de nave', sector: 'industria',
      empresa: { ventas: u.ventas, margen: ANIOS[4].margen, personal: u.personal, plantilla: u.plantilla, fijos: u.otrosGastos, caja: u.tesoreria, deudaViva: u.deudaLP + u.deudaCP, cuotaDeuda: 9500,
        fondosPropios: u.fondosPropios, polizaLimite: 400000, polizaDispuesta: 260000, polizaTipo: 5.8, polizaComision: 0.5, dso: ANIOS[4].dso, dio: ANIOS[4].dio, dpo: ANIOS[4].dpo, crecimiento: 6, impuesto: 25 },
      inversion: { importe: 1200000, pctFin: 75, tipo: 5.4, plazo: 7, carencia: 6, mesInicio: 4, aportacion: 0, incVentas: 24, rampa: 10, margenNuevo: 44, contrataciones: 6, salario: 32000, anticipo: 2, fijosNuevos: 95000, vidaUtil: 12,
        lineas: [
          { id: 'lm1', tipo: 'maquinaria', nombre: 'Corte láser de fibra 6 kW', importe: 650000, mes: 4, vida: 12, activa: true, fin: null },
          { id: 'lm2', tipo: 'maquinaria', nombre: 'Plegadora CNC 220 t', importe: 280000, mes: 4, vida: 12, activa: true, fin: null },
          { id: 'lm3', tipo: 'nave', nombre: 'Ampliación de nave (900 m²)', importe: 270000, mes: 2, vida: 30, activa: true, fin: { pctFin: 80, tipo: 4.9, plazo: 12, carencia: 12 } }
        ] },
      opciones: [{ nombre: 'Láser en leasing y nave con préstamo', inversion: { importe: 1200000, pctFin: 90, tipo: 6.1, plazo: 5, carencia: 0, mesInicio: 4, aportacion: 0, incVentas: 24, rampa: 10, margenNuevo: 44, contrataciones: 6, salario: 32000, anticipo: 2, fijosNuevos: 95000, vidaUtil: 12, lineas: [] } }],
      humano: { mandos: 4, mandosFormados: 25, dependencia: 80, procesos: 30, rotacion: 9, clima: 6, tiempoContratacion: 4, costeSeleccion: 3200, curva: 6, formacion: 10, sucesion: 15, polivalencia: 30, absentismo: 4.8, horasExtra: 12 },
      meta: { cajaMin: 200000, paybackMax: 6, dscrMin: 1.25, deudaEbitdaMax: 3, pesoSalarialMax: 30, plazoObjetivo: 24, contarPoliza: true },
      estructura: 'directa', escenario: 'base',
      hipotesis: [{ id: 'hm1', tipo: 'cliente', mes: 9, duracion: 6, magnitud: 30, activo: false }, { id: 'hm2', tipo: 'cobro', mes: 3, duracion: 12, magnitud: 15, activo: false }],
      historico: { ejemplo: false, anios: H }
    });
  }

  /* ---------- Sistema estratégico ---------- */
  function estrategia() {
    const R = rnd(7), totCli = CLIENTES.reduce((a, c) => a + c[1], 0);
    const clientes = CLIENTES.map((c) => ({ nombre: c[0], ventas: c[1], costeVariable: r0(c[1] * c[2]), dias: c[3] }));
    // Facturas pendientes de cobro (suman lo que dice el balance) y cobros de los últimos doce meses
    const H = historico(), pend = H[H.length - 1].clientes;
    const partidas = [], hist = []; let k = 1;
    CLIENTES.forEach((c) => {
      const cuota = c[1] / totCli * pend, nF = Math.max(1, Math.round(cuota / 26000));
      for (let i = 0; i < nF; i++) { const em = -r0(10 + R() * (c[3] + 40)); partidas.push({ cliente: c[0], factura: 'F25-' + String(k++).padStart(4, '0'), emision: dia(em), vencimiento: dia(em + c[3]), importe: r0(cuota / nF) }); }
      for (let m = 1; m <= 12; m++) { const em = -30 * m - 60; hist.push({ cliente: c[0], emision: dia(em), cobro: dia(em + c[3] + r0(R() * 25)), importe: r0(c[1] / 12) }); }
    });
    const quinc = (n, c, t, imp, cat) => ({ fecha: dia(n), concepto: c, tipo: t, categoria: cat, importe: imp, recurrente: 'no' });
    const movs = [
      { fecha: dia(5), concepto: 'Nóminas', tipo: 'salida', categoria: 'Nóminas', importe: 86000, recurrente: 'mensual' },
      { fecha: dia(12), concepto: 'Seguridad Social', tipo: 'salida', categoria: 'Seguridad Social', importe: 29500, recurrente: 'mensual' },
      { fecha: dia(8), concepto: 'Cuota del préstamo de la plegadora antigua', tipo: 'salida', categoria: 'Cuotas de préstamos', importe: 9500, recurrente: 'mensual' },
      quinc(9, 'Cobro certificación Agroindustrial Valle Verde (nave de envasado)', 'entrada', 186000, 'Cobros de clientes'),
      quinc(16, 'Pago a Siderúrgica Cantábrica (perfiles y chapa)', 'salida', 94000, 'Proveedores'),
      quinc(20, 'IVA del trimestre', 'salida', 71000, 'Impuestos'),
      quinc(24, 'Cobro Puertos y Obras del Norte (pasarela del muelle)', 'entrada', 64000, 'Cobros de clientes'),
      quinc(31, 'Pago a Galvanizados Siero', 'salida', 21000, 'Proveedores'),
      quinc(38, 'Cobro Planta Química Rivero (soportes de tubería)', 'entrada', 48000, 'Cobros de clientes'),
      quinc(45, 'Pago fraccionado del Impuesto sobre Sociedades', 'salida', 18000, 'Impuestos'),
      quinc(52, 'Renovación de seguros de responsabilidad civil y flota', 'salida', 14500, 'Otros pagos')
    ];
    const nodos = organigrama();
    const plan = {
      mision: 'Fabricar y montar estructuras metálicas a medida, en plazo y con seguridad, para que la industria del norte pueda crecer sin parar su actividad.',
      vision: 'En 2030, ser la referencia del norte peninsular en estructuras y mantenimiento industrial, con un 12 % de EBITDA, ingresos recurrentes por encima del 20 % y una dirección que no dependa de una sola persona.',
      propuesta: 'Ingeniería, taller y montaje en una sola mano, con plazo comprometido y mantenimiento posterior.',
      valores: [
        { valor: 'Seguridad ante todo', conducta: 'Ningún montaje empieza sin plan de seguridad firmado y revisado en obra.', ambito: 'personas', peso: 5 },
        { valor: 'Palabra cumplida', conducta: 'El plazo que se da al cliente se cumple; si hay riesgo, se avisa antes de que pase.', ambito: 'clientes', peso: 5 },
        { valor: 'Caja antes que volumen', conducta: 'No aceptamos obras que no podamos financiar ni plazos de cobro por encima de 90 días.', ambito: 'finanzas', peso: 4 },
        { valor: 'Oficio que se enseña', conducta: 'Cada oficial forma a un aprendiz y documenta cómo trabaja.', ambito: 'personas', peso: 4 }
      ],
      dafoItems: {
        d: [{ t: 'Todo pasa por el fundador: precios, compras grandes y plazos', i: 5 }, { t: 'Días de cobro al alza (de 68 a 86)', i: 5 }, { t: 'Un cliente concentra el 31 % de las ventas', i: 4 }, { t: 'Carpintería metálica con margen muy bajo', i: 3 }, { t: 'Compras de acero sin criterio ni previsión', i: 3 }],
        a: [{ t: 'Volatilidad del precio del acero', i: 4 }, { t: 'Retrasos de pago de la obra pública', i: 3 }, { t: 'Escasez de soldadores y montadores cualificados', i: 4 }],
        f: [{ t: 'Ingeniería, taller y montaje en la misma empresa', i: 5 }, { t: 'Treinta años de reputación en la industria regional', i: 4 }, { t: 'Equipo de montaje con experiencia en plantas en marcha', i: 4 }],
        o: [{ t: 'Contratos de mantenimiento recurrente con las plantas de los clientes', i: 5 }, { t: 'Naves modulares en kit para el sector agrario', i: 4 }, { t: 'Corte láser propio: menos subcontratación y plazos más cortos', i: 4 }, { t: 'Zonas cercanas: León, Cantabria y Galicia', i: 3 }]
      },
      came: [
        { cruce: 'FO', tipo: 'Explotar', accion: 'Ofrecer contrato de mantenimiento a los diez primeros clientes al entregar cada obra', area: 'Comercial', impacto: 5, encaje: {} },
        { cruce: 'DO', tipo: 'Corregir', accion: 'Cobrar por certificaciones mensuales en obras de más de 60.000 €', area: 'Finanzas', impacto: 5, encaje: {} },
        { cruce: 'DA', tipo: 'Afrontar', accion: 'Nombrar un segundo en el taller y documentar los precios de referencia', area: 'Dirección', impacto: 4, encaje: {} },
        { cruce: 'FA', tipo: 'Mantener', accion: 'Acuerdo anual de precio y volumen con dos acerías', area: 'Compras', impacto: 4, encaje: {} }
      ],
      objetivos: [
        { id: 'om1', nombre: 'Caja sin tensiones', indicador: 'Días medios de cobro', actual: 86, meta: 65, fecha: dia(270) },
        { id: 'om2', nombre: 'Crecer con ingresos recurrentes', indicador: 'Ventas de mantenimiento sobre el total (%)', actual: 4, meta: 15, fecha: dia(450) },
        { id: 'om3', nombre: 'Dirección que no dependa de una persona', indicador: 'Decisiones delegadas con criterio escrito', actual: 1, meta: 8, fecha: dia(360) }
      ],
      areas: [
        { macro: 'om1', area: 'Finanzas', objetivo: 'Cobrar por certificaciones', kpi: 'Obras con certificación mensual (%)', actual: 20, meta: 90 },
        { macro: 'om1', area: 'Comercial', objetivo: 'Reducir peso del primer cliente', kpi: 'Peso del primer cliente (%)', actual: 31, meta: 22 },
        { macro: 'om2', area: 'Comercial', objetivo: 'Vender contratos de mantenimiento', kpi: 'Contratos firmados', actual: 3, meta: 15 },
        { macro: 'om3', area: 'Dirección', objetivo: 'Segundo nivel en taller y montajes', kpi: 'Responsables con suplente', actual: 0, meta: 3 }
      ],
      acciones: [
        { area: 'Finanzas', accion: 'Pasar las obras grandes a certificaciones mensuales', responsable: 'Lucía Valdés', inicio: dia(-20), fin: dia(25), estado: 'En marcha' },
        { area: 'Comercial', accion: 'Revisar tarifas de carpintería metálica (margen mínimo 25 %)', responsable: 'Javier Valdés', inicio: dia(-10), fin: dia(-2), estado: 'Pendiente' },
        { area: 'Comercial', accion: 'Lanzar la oferta de mantenimiento a los diez primeros clientes', responsable: 'Diego Álvarez', inicio: dia(5), fin: dia(60), estado: 'Pendiente' },
        { area: 'Dirección', accion: 'Nombrar suplente del jefe de taller', responsable: 'Ramón Valdés', inicio: dia(-30), fin: dia(15), estado: 'Pendiente' },
        { area: 'Compras', accion: 'Punto de pedido y stock mínimo para los diez perfiles más usados', responsable: 'Paula García', inicio: dia(0), fin: dia(40), estado: 'Pendiente' },
        { area: 'Operaciones', accion: 'Estudio de la línea de corte láser y plegado', responsable: 'Marta Cuesta', inicio: dia(-45), fin: dia(30), estado: 'En marcha' }
      ]
    };
    const areasPer = [];
    PERSONAS.forEach((p) => { let a = areasPer.find((x) => x.area === p[2]); if (!a) { a = { area: p[2], personas: 0, coste: 0, absentismo: 0, rotacion: 0, vacantes: 0, formacion: 0 }; areasPer.push(a); } a.personas++; a.coste += p[4]; });
    const AUX = { Producción: [6.2, 12, 2, 8], Montajes: [5, 10, 1, 10], Comercial: [2, 15, 0, 14], Administración: [3, 5, 0, 8], 'Oficina técnica': [2.5, 6, 0, 20], Mantenimiento: [3.5, 8, 1, 12], Logística: [5.5, 18, 0, 4], Dirección: [1, 0, 0, 6] };
    areasPer.forEach((a) => { a.coste = r0(a.coste / a.personas * 1.32); const x = AUX[a.area] || [3, 8, 0, 8]; a.absentismo = x[0]; a.rotacion = x[1]; a.vacantes = x[2]; a.formacion = x[3]; });
    return {
      modelo: true,
      comercial: { ejemplo: false, clientes, productos: clone(LINEAS), palancas: { precio: 0, volumen: 0, costeVariable: 0, fijos: 0, mix: 0 }, escenariosGuardados: [],
        oportunidades: [
          { cliente: 'Agroindustrial Valle Verde (mantenimiento anual)', importe: 96000, etapa: 'Negociación', prob: 70, cierre: dia(30), comercial: 'Diego Álvarez' },
          { cliente: 'Cooperativa Láctea del Valle (ampliación de cámaras)', importe: 240000, etapa: 'Propuesta', prob: 45, cierre: dia(60), comercial: 'Javier Valdés' },
          { cliente: 'Explotaciones Ganaderas de León (nave modular)', importe: 76000, etapa: 'Cualificada', prob: 30, cierre: dia(75), comercial: 'Sara Menéndez' },
          { cliente: 'Puertos y Obras del Norte (refuerzo de muelle)', importe: 310000, etapa: 'Propuesta', prob: 35, cierre: dia(90), comercial: 'Javier Valdés' },
          { cliente: 'Conservera de la costa (mantenimiento)', importe: 54000, etapa: 'Contacto', prob: 15, cierre: dia(120), comercial: 'Diego Álvarez' },
          { cliente: 'Planta Química Rivero (pasarelas)', importe: 132000, etapa: 'Negociación', prob: 60, cierre: dia(40), comercial: 'Sara Menéndez' }
        ],
        objetivoAnual: 5300000,
        canales: [
          { canal: 'Comercial directo y prescriptores', inversion: 96000, leads: 120, oportunidades: 54, clientes: 14, ticket: 68000, margen: 46, recurrencia: 5 },
          { canal: 'Licitaciones de obra pública', inversion: 22000, leads: 40, oportunidades: 18, clientes: 4, ticket: 52000, margen: 38, recurrencia: 2 },
          { canal: 'Web y buscadores', inversion: 14000, leads: 260, oportunidades: 30, clientes: 11, ticket: 9500, margen: 41, recurrencia: 2 },
          { canal: 'Ferias agrarias', inversion: 18000, leads: 90, oportunidades: 16, clientes: 3, ticket: 38000, margen: 36, recurrencia: 1 }
        ],
        zonas: [
          { zona: 'León', mercado: 14000000, cuota: 2, competencia: 3, apertura: 160000, fijos: 120000, margen: 40, rampa: 12 },
          { zona: 'Cantabria', mercado: 11000000, cuota: 3, competencia: 3, apertura: 140000, fijos: 110000, margen: 41, rampa: 10 },
          { zona: 'Galicia', mercado: 26000000, cuota: 1, competencia: 4, apertura: 260000, fijos: 170000, margen: 38, rampa: 18 },
          { zona: 'Norte de Portugal', mercado: 18000000, cuota: 1, competencia: 4, apertura: 300000, fijos: 180000, margen: 35, rampa: 20 }
        ] },
      cobros: { ejemplo: false, corte: hoy(), partidas, historico: hist, tasas: [0, 1, 5, 15, 35, 75] },
      compras: { ejemplo: false, ahorroObjetivo: 4, proveedores: PROVEEDORES.map((p) => ({ nombre: p[0], compras: p[1], plazo: p[2], alternativas: p[3], criticidad: p[4], calidad: p[5], puntualidad: p[6] })) },
      tiempos: { ejemplo: false, personas: [
        { nombre: 'Óscar Martínez', rol: 'Encargado de soldadura', costeHora: 22 }, { nombre: 'Pablo Fuente', rol: 'Montador oficial 1.ª', costeHora: 20 },
        { nombre: 'Andrés Prieto', rol: 'Jefe de taller', costeHora: 30 }, { nombre: 'Marta Cuesta', rol: 'Jefa de oficina técnica', costeHora: 31 }, { nombre: 'Ramón Valdés', rol: 'Gerente', costeHora: 48 }
      ], registros: (() => { const reg = [], f = dia(-3), add = (p, k, h, t) => reg.push({ fecha: f, persona: p, tarea: t, categoria: k, horas: h });
        add('Óscar Martínez', 'produccion', 30, 'Soldadura de pórticos'); add('Óscar Martínez', 'esperas', 5, 'Esperar chapa cortada fuera'); add('Óscar Martínez', 'retrabajo', 4, 'Repasar soldaduras rechazadas'); add('Óscar Martínez', 'reuniones', 2, 'Reunión de taller');
        add('Pablo Fuente', 'produccion', 28, 'Montaje en planta del cliente'); add('Pablo Fuente', 'esperas', 7, 'Esperar grúa y permisos de obra'); add('Pablo Fuente', 'gestion', 3, 'Partes de trabajo');
        add('Andrés Prieto', 'produccion', 10, 'Supervisión de taller'); add('Andrés Prieto', 'gestion', 16, 'Planificar órdenes y buscar material'); add('Andrés Prieto', 'reuniones', 8, 'Reuniones con gerencia'); add('Andrés Prieto', 'retrabajo', 6, 'Incidencias de calidad');
        add('Marta Cuesta', 'produccion', 22, 'Planos y despieces'); add('Marta Cuesta', 'retrabajo', 8, 'Cambios de planos por modificaciones del cliente'); add('Marta Cuesta', 'reuniones', 6, 'Reuniones de obra');
        add('Ramón Valdés', 'gestion', 18, 'Presupuestos y compras de acero'); add('Ramón Valdés', 'comercial', 10, 'Visitas a clientes grandes'); add('Ramón Valdés', 'reuniones', 9, 'Resolver dudas del taller'); add('Ramón Valdés', 'retrabajo', 5, 'Repasar presupuestos de otros');
        return reg; })(), timers: {} },
      tesoreria: { semanas: 13, saldoInicial: H[H.length - 1].tesoreria, colchonDias: 20, escenario: 'base', movimientos: movs },
      impuestos: { tipoIS: 25, iva: 21, pctVentasIVA: 92, pctComprasIVA: 96, pctFijosIVA: 70, irpf: 15, ssEmpresa: 31.5, ssTrabajador: 6.5, alquiler: 0, ibi: 9200, mesIBI: 9, iae: 5400, mesIAE: 10, mensual: false, cuotaAnterior: null, idi: 0, payout: 30, escenario: 'base', inversiones: null },
      mercado: { perfil: { actividad: EMPRESA.actividad, region: 'Asturias y provincias limítrofes', productos: LINEAS.map((l) => l.nombre).join(', '), clientes: 'Industria agroalimentaria, química, energía, obra pública y sector agrario' },
        analisis: null,
        indicadores: [
          { ambito: 'Costes', indicador: 'Precio del acero estructural', valor: 'Variable trimestre a trimestre', tendencia: 'inestable', impacto: 'negativo', palanca: 'Acuerdos anuales con dos acerías', fuente: 'Supuesto del caso de ejemplo', fecha: hoy() },
          { ambito: 'Demanda', indicador: 'Inversión industrial en la región', valor: 'Proyectos de ampliación en agroalimentación', tendencia: 'al alza', impacto: 'positivo', palanca: 'Mantenimiento y naves modulares', fuente: 'Supuesto del caso de ejemplo', fecha: hoy() },
          { ambito: 'Personas', indicador: 'Oferta de soldadores y montadores', valor: 'Escasa', tendencia: 'a la baja', impacto: 'negativo', palanca: 'Escuela interna de oficio', fuente: 'Supuesto del caso de ejemplo', fecha: hoy() }
        ],
        targets: [{ target: 'Agroalimentación', peso: 45, ciclo: 'estable', riesgo: 2 }, { target: 'Industria química y energía', peso: 25, ciclo: 'cíclico', riesgo: 3 }, { target: 'Obra pública', peso: 16, ciclo: 'licitaciones', riesgo: 4 }, { target: 'Particulares y agrario', peso: 14, ciclo: 'estacional', riesgo: 3 }],
        tipologias: LINEAS.slice(0, 4).map((l, i) => ({ tipologia: l.nombre, peso: [42, 21, 18, 8][i], ciclo: 'proyecto', riesgo: [3, 2, 4, 3][i] })),
        competidores: [{ nombre: 'Competidor regional de estructuras (A)', posicion: 'Precio bajo, sin montaje propio', amenaza: 3 }, { nombre: 'Grupo nacional de montajes (B)', posicion: 'Gran obra, poco interés en pymes', amenaza: 2 }, { nombre: 'Talleres pequeños de carpintería', posicion: 'Precio muy agresivo en carpintería', amenaza: 4 }] },
      logistica: { pedidosMes: 140, transporte: 74000, almacen: 38000, personal: 47000, aTiempo: 84, completos: 91, rotacion: 4.9,
        rutas: [{ ruta: 'Taller → obras de Asturias central', pedidos: 70, km: 35, coste: 95, aTiempo: 90 }, { ruta: 'Taller → occidente y Galicia', pedidos: 25, km: 160, coste: 310, aTiempo: 76 }, { ruta: 'Taller → León y Cantabria', pedidos: 20, km: 150, coste: 290, aTiempo: 80 }, { ruta: 'Recogida en galvanizado', pedidos: 25, km: 22, coste: 70, aTiempo: 72 }] },
      personas: { areas: areasPer, organigrama: { nodos, trazos: [] } },
      plan,
      inversores: { lista: [], fecha: '' },
      origen: { archivos: [], cargado: (() => { const c = (archivo, filas) => ({ fecha: hoy(), archivo: archivo + ' (empresa modelo)', filas }); return {
          cuentas: c('Cuentas anuales 2021-2025', 5), ventas: c('Ventas por cliente 2025', CLIENTES.length), productos: c('Líneas de negocio', LINEAS.length), compras: c('Compras por proveedor 2025', PROVEEDORES.length),
          plantilla: c('Plantilla', PERSONAS.length), pipeline: c('Oportunidades abiertas', 6), tiempos: c('Partes de horas de una semana', 18), banco: c('Movimientos previstos de tesorería', 11),
          cartera: c('Facturas pendientes de cobro', 43), cobros: c('Cobros de los últimos doce meses', CLIENTES.length * 12), marketing: c('Canales comerciales', 4), documentos: c('Documentos de contexto', 2) }; })(),
        docs: [
          { nombre: 'Borrador de protocolo familiar.txt', fecha: hoy(), chars: 900, temas: ['plan'], texto: 'Borrador de protocolo familiar de Valdenorte. Objetivo: ordenar la sucesión del fundador en un plazo de cinco años. Javier Valdés asumirá la dirección comercial y la general a partir de 2028; Lucía Valdés, la dirección financiera. Las decisiones de inversión por encima de 150.000 € requieren acuerdo de los tres socios. Se creará un consejo de familia que se reunirá dos veces al año. Pendiente: reglas de incorporación de la tercera generación y política de dividendos.' },
          { nombre: 'Estudio previo de la línea de corte láser.txt', fecha: hoy(), chars: 700, temas: ['expansion'], texto: 'Estudio previo de la inversión en corte láser y plegado. Hoy se subcontrata el corte de chapa por unos 210.000 € al año, con plazos de una a dos semanas. Con láser propio se ahorra la subcontratación, se acortan plazos y se puede ofrecer el kit de naves modulares. Inversión estimada 1,2 millones de euros con la ampliación de nave. Riesgos: financiación del circulante con días de cobro altos y falta de operarios cualificados para la máquina.' }
        ], series: {}, manual: {} }
    };
  }

  /* ---------- Organigrama (para el sistema estratégico) ---------- */
  function organigrama() {
    const NW = 150, nodos = [], idx = (i) => 'om' + i;
    const jefes = new Set(PERSONAS.map((p) => p[3]).filter((x) => x != null));
    PERSONAS.forEach((p, i) => { if (i === 0 || jefes.has(i) || p[3] === 0) nodos.push({ id: idx(i), puesto: p[1], persona: p[0], area: p[2], jefe: p[3] == null ? null : idx(p[3]), x: 0, y: 0 }); });
    // Los equipos sin mando se agrupan bajo su responsable
    const grupos = {};
    PERSONAS.forEach((p, i) => { if (nodos.some((x) => x.id === idx(i))) return; const k = p[3]; (grupos[k] = grupos[k] || []).push(p); });
    Object.keys(grupos).forEach((k) => { const g = grupos[k]; nodos.push({ id: 'oe' + k, puesto: 'Equipo de ' + String(PERSONAS[k][2]).toLowerCase(), persona: `${g.length} persona${g.length > 1 ? 's' : ''}`, area: PERSONAS[k][2], jefe: idx(k), x: 0, y: 0, equipo: g.length }); });
    const hijos = (id) => nodos.filter((x) => x.jefe === id); let col = 0;
    const colocar = (nd, nv) => { const hs = hijos(nd.id); nd.y = 40 + nv * 120; if (!hs.length) { nd.x = 30 + col * (NW + 22); col++; return; } hs.forEach((h) => colocar(h, nv + 1)); const xs = hs.map((h) => h.x); nd.x = (Math.min(...xs) + Math.max(...xs)) / 2; };
    colocar(nodos[0], 0);
    return nodos;
  }

  /* ---------- Personas y equipos ---------- */
  function personas() {
    const R = rnd(11), pid = (i) => 'pm' + i, qid = (k) => 'qm' + k;
    const TIPO = (p) => /Gerente|Director|Responsable/.test(p) ? 'direccion' : /Comercial/.test(p) ? 'comercial' : /Administrativ|Recepción/.test(p) ? 'administracion' : /Jef|Encargad/.test(p) ? 'mando' : /calidad/.test(p) ? 'calidad' : /Delineante|Técnic/.test(p) ? 'tecnico' : 'produccion';
    const PERFIL_PUESTO = { direccion: { D: 75, I: 55, S: 30, C: 50 }, comercial: { D: 55, I: 80, S: 35, C: 30 }, administracion: { D: 25, I: 40, S: 70, C: 75 }, mando: { D: 65, I: 45, S: 45, C: 55 }, calidad: { D: 35, I: 30, S: 55, C: 85 }, tecnico: { D: 35, I: 30, S: 55, C: 80 }, produccion: { D: 40, I: 35, S: 65, C: 55 } };
    const puestos = [], vistos = {};
    PERSONAS.forEach((p) => { const nom = p[1].replace(/ oficial.*$/, ''); if (vistos[nom]) return; const t = TIPO(p[1]); vistos[nom] = qid(puestos.length);
      puestos.push({ id: vistos[nom], nombre: nom, area: p[2], tipo: t, mision: '', disc: PERFIL_PUESTO[t], roles: [], critico: /Gerente|Jefe de taller|Jefe de montajes|Jefa de oficina|Encargado/.test(p[1]), sucesor: '' }); });
    const ROLES = ['cerebro', 'investigador', 'coordinador', 'impulsor', 'monitor', 'cohesionador', 'implementador', 'finalizador', 'especialista'];
    const ps = PERSONAS.map((p, i) => {
      const o = { id: pid(i), nombre: p[0], puestoId: vistos[p[1].replace(/ oficial.*$/, '')], area: p[2], responsable: p[3] == null ? '' : pid(p[3]), alta: dia(-365 * (1 + (i % 9)) - i * 17), consentimiento: true };
      if (p[5]) {
        const [D, I, S, C] = p[5]; o.disc = { D, I, S, C, fecha: dia(-60 - i), origen: 'modelo' };
        const sc = {}; ROLES.forEach((r) => { sc[r] = r0(20 + R() * 40); });
        if (D > 60) sc.impulsor += 30; if (I > 60) { sc.investigador += 25; sc.cohesionador += 10; } if (S > 60) { sc.cohesionador += 25; sc.implementador += 15; } if (C > 70) { sc.especialista += 25; sc.finalizador += 20; sc.monitor += 10; }
        ROLES.forEach((r) => { sc[r] = Math.min(100, sc[r]); }); o.roles = { scores: sc, fecha: o.disc.fecha, origen: 'modelo' };
        const tipo = D > 70 ? 8 : I > 70 ? 7 : C > 75 ? 1 : S > 65 ? 9 : D > 55 ? 3 : 6, es = {}; for (let k = 1; k <= 9; k++) es[k] = r0(25 + R() * 35); es[tipo] = 85;
        o.enea = { scores: es, tipo, ala: tipo === 9 ? 1 : tipo + 1, fecha: o.disc.fecha, origen: 'modelo' };
      }
      return o;
    });
    // Tareas y acuerdos de liderazgo del jefe de taller (la persona clave sin segundo)
    ps[3].tareas = [{ id: 'tm1', nombre: 'Planificar las órdenes de la semana', alta: dia(-40), acuerdo: { fecha: dia(-30), estilo: 'entrenar', freq: 'semanal', siguiente: dia(4), lider: 'Ramón Valdés', colab: 'Andrés Prieto', revision: dia(4) } }];
    puestos.forEach((q) => { if (q.critico && /taller/i.test(q.nombre)) q.sucesor = ps[12].id; });
    const equipos = [
      { id: 'eqm1', nombre: 'Comité de dirección', objetivo: 'Decidir con criterio escrito y sin cuellos de botella', miembros: [0, 1, 2, 3, 4, 5].map(pid) },
      { id: 'eqm2', nombre: 'Taller', objetivo: 'Fabricar en plazo con cero rechazos de soldadura', miembros: [3, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(pid) },
      { id: 'eqm3', nombre: 'Montajes', objetivo: 'Montar sin accidentes y sin esperas en obra', miembros: [5, 23, 24, 25, 26, 27].map(pid) },
      { id: 'eqm4', nombre: 'Mantenimiento industrial (nueva línea)', objetivo: 'Llegar a 15 contratos anuales', miembros: [7, 28, 29, 1].map(pid) }
    ];
    return { v: 1, modelo: true, personas: ps, puestos, equipos, envios: [] };
  }

  /* ---------- Mesa de trabajo ---------- */
  function agenda() {
    const T = (t, o) => Object.assign({ id: id('t'), t, entrada: dia(-7), tipo: 'importante', estado: 'pendiente', impacto: 3, esfuerzo: 2, clave: false, fecha: '', hora: '', dur: 60, area: '', resp: 'Ramón Valdés', mundo: '', origen: 'modelo' }, o);
    const tareas = [
      T('Llamar a Agroindustrial Valle Verde por la certificación vencida de 186.000 €', { tipo: 'imperativa', impacto: 5, esfuerzo: 1, clave: true, fecha: dia(0), hora: '09:00', dur: 30, area: 'Finanzas', resp: 'Lucía Valdés' }),
      T('Decidir quién es el suplente del jefe de taller', { impacto: 5, esfuerzo: 2, clave: true, fecha: dia(2), hora: '12:00', dur: 60, area: 'Dirección' }),
      T('Revisar la oferta de la plegadora CNC', { impacto: 4, esfuerzo: 2, fecha: dia(3), hora: '10:00', dur: 90, area: 'Operaciones', resp: 'Marta Cuesta' }),
      T('Preparar la propuesta de mantenimiento para los diez primeros clientes', { impacto: 5, esfuerzo: 3, clave: true, fecha: dia(5), hora: '09:30', dur: 120, area: 'Comercial', resp: 'Diego Álvarez' }),
      T('Subir tarifas de carpintería metálica', { tipo: 'importante', impacto: 4, esfuerzo: 2, fecha: dia(-3), area: 'Comercial', resp: 'Javier Valdés', aplazada: 2 }),
      T('Pedir tres precios de acero para el primer trimestre', { tipo: 'delegada', impacto: 3, esfuerzo: 1, fecha: dia(6), area: 'Compras', resp: 'Paula García' }),
      T('Revisar partes de horas de montajes', { tipo: 'seguimiento', impacto: 2, esfuerzo: 1, fecha: dia(1), hora: '17:00', dur: 30, area: 'Operaciones', resp: 'Iván Fernández' }),
      T('Firmar el plan de seguridad de la obra del muelle', { tipo: 'imperativa', impacto: 4, esfuerzo: 1, fecha: dia(1), hora: '08:30', dur: 30, area: 'Operaciones' }),
      T('Contestar al banco sobre la ampliación de la póliza', { tipo: 'imperativa', impacto: 4, esfuerzo: 1, fecha: dia(-1), area: 'Finanzas', resp: 'Lucía Valdés' }),
      T('Reunión de familia: borrador del protocolo', { impacto: 4, esfuerzo: 2, fecha: dia(9), hora: '18:00', dur: 90, area: 'Dirección' })
    ];
    tareas[8].estado = 'pendiente';
    const meta = (o) => Object.assign({ id: id('m'), creada: dia(-20), estado: 'activa', prioridad: 'alta', plazo: 'medio', tangible: true, solo: true, obstaculos: [], acciones: [], seguimiento: 'semanal', valores: '', afirmacion: '', medios: '', pros: '', contras: '', beneficios: '', perdidas: '', merece: 'si' }, o);
    const metas = [
      meta({ area: 'Finanzas', objetivo: 'Cobrar antes', especifica: 'Bajar los días medios de cobro de 86 a 65 cobrando por certificaciones mensuales', indicador: 'Días medios de cobro', actual: 86, valor: 65, unidad: 'días', fecha: dia(270), responsable: 'Lucía Valdés', beneficio: 'Liberar unos 265.000 € de caja y dejar de usar la póliza', contras: 'Negociar con los clientes grandes', obstaculos: [{ o: 'El primer cliente no acepta certificaciones', s: 'Ofrecer descuento del 0,5 % por pago a 30 días' }], acciones: [{ t: 'Cláusula de certificación en todos los presupuestos de más de 60.000 €', fecha: dia(10), revisada: false, hecha: false }, { t: 'Reclamar cada viernes lo vencido', fecha: dia(4), revisada: false, hecha: true }] }),
      meta({ area: 'Comercial', objetivo: 'Ingresos recurrentes', especifica: 'Firmar 15 contratos anuales de mantenimiento industrial', indicador: 'Contratos firmados', actual: 3, valor: 15, unidad: 'contratos', fecha: dia(450), responsable: 'Diego Álvarez', beneficio: 'Unos 600.000 € al año con un 50 % de margen y menos dependencia de obra nueva', acciones: [{ t: 'Catálogo de servicios de mantenimiento', fecha: dia(15), revisada: false, hecha: false }] }),
      meta({ area: 'Dirección', objetivo: 'Que el taller no dependa de una persona', especifica: 'Nombrar y formar un suplente del jefe de taller que planifique solo la semana', indicador: 'Semanas planificadas por el suplente', actual: 0, valor: 8, unidad: 'semanas', fecha: dia(180), responsable: 'Ramón Valdés', beneficio: 'Ramón libera unas 9 horas a la semana para vender y dirigir', acciones: [{ t: 'Elegir suplente entre los encargados', fecha: dia(2), revisada: false, hecha: false }] })
    ];
    const reuniones = [{ id: id('r'), titulo: 'Comité de dirección', fecha: dia(1), hora: '08:00', dur: 60, lugar: 'Sala de reuniones', proposito: 'Revisar caja, obras en curso y decisiones de la semana', puntos: [{ hora: '08:00', tema: 'Caja a 13 semanas', resp: 'Lucía Valdés' }, { hora: '08:20', tema: 'Obras en curso y retrasos', resp: 'Iván Fernández' }, { hora: '08:40', tema: 'Ofertas abiertas', resp: 'Javier Valdés' }], acta: [] }];
    const repetitivas = [
      { id: id('rp'), t: 'Revisar la caja a 13 semanas', freq: 'semanal', hora: '08:00', dias: [1], clave: true, dur: 30, hechas: {} },
      { id: id('rp'), t: 'Reclamar lo vencido a clientes', freq: 'semanal', hora: '10:00', dias: [5], clave: true, dur: 45, hechas: {} },
      { id: id('rp'), t: 'Cierre del mes con la gestoría', freq: 'mensual', hora: '09:00', dia: 5, clave: false, dur: 120, hechas: {} }
    ];
    const delegaciones = [{ id: id('d'), tarea: 'Planificar las órdenes de taller de la semana', a: 'Óscar Martínez', mio: 'Revisar el plan el lunes', suyo: 'Proponer el plan el viernes', pasos: [{ t: 'Acompañarle dos semanas', fecha: dia(7), hecho: false }, { t: 'Que lo haga solo con revisión', fecha: dia(21), hecho: false }], seguimiento: 'semanal', progreso: 20 }];
    return { v: 1, modelo: true, tareas, repetitivas, metas, semana: [], reuniones, delegaciones, descartadas: [], logros: { [dia(-2)]: 'Cobrados 64.000 € de Puertos y Obras del Norte' } };
  }

  /* ---------- Cuaderno del consultor y libro ---------- */
  const consultor = () => ({ modelo: true, ficha: { nombre: 'Elena Ríos', firma: 'Consultora de ejemplo', contacto: '' }, cuadernos: {} });
  const libro = () => ({ v: 1, modelo: true, titulo: 'Libro corporativo de Valdenorte', intro: 'Quiénes somos, cómo trabajamos y hacia dónde vamos: el libro que reúne los informes de todos los mundos de Atalaya para la familia, el equipo directivo y los nuevos mandos.', secciones: [{ id: 'intervencion', t: 'Diagnóstico e intervención' }, { id: 'simulador', t: 'Inversión y crecimiento' }, { id: 'estrategia', t: 'Estrategia y gestión' }, { id: 'personas', t: 'Personas y equipos' }, { id: 'mesa', t: 'Cómo nos organizamos' }], caps: [] });

  /* ---------- Auditoría integral ---------- */
  // Las conversaciones se guardan en texto y la propia auditoría las lee al abrirla (síntomas, constantes y guion)
  const TR_PRIMERA = `Elena Ríos: Gracias por recibirme. Antes de empezar, ¿qué tendría que pasar en esta hora para que diga que ha merecido la pena?
Ramón Valdés: Pues salir sabiendo por dónde empezar, porque vendemos más que nunca y cada mes estamos más justos de caja.
Elena Ríos: ¿Qué quiere conseguir con la empresa en los próximos doce meses?
Ramón Valdés: Quiero que la empresa funcione sin que yo esté encima de todo y poder dejarla ordenada para mis hijos. Y quiero meter el láser, que lo necesitamos.
Elena Ríos: ¿Cómo sabe si este mes ha ganado dinero?
Ramón Valdés: No lo sé hasta que la gestoría cierra el trimestre. Lo veo cuando miro el banco, y el banco cada vez está peor aunque facturemos más.
Lucía Valdés: Los clientes grandes nos pagan a noventa o a ciento veinte días y nosotros pagamos el acero a sesenta. La póliza la tenemos casi siempre dispuesta.
Elena Ríos: ¿Quién decide los precios de las ofertas?
Ramón Valdés: Todo pasa por mí. Los precios los hago yo, las compras grandes las hago yo y los plazos también. Me llaman para todo, hasta para saber qué perfil se corta.
Javier Valdés: Yo hago ofertas pero al final mi padre las repasa todas. No hay una tabla de precios, cada uno calcula a su manera.
Elena Ríos: ¿Y el stock de acero cómo se controla?
Ramón Valdés: El stock lo pedimos cuando se ve que va faltando. A veces compramos caro porque hay prisa y otras veces tenemos perfiles parados meses.
Elena Ríos: ¿Qué pasa en el taller cuando usted no está?
Andrés Prieto: Si falta Ramón o falto yo, el taller se para. No tengo segundo. Planifico la semana de memoria y lo que está en mi cabeza no lo sabe nadie más.
Elena Ríos: ¿Cómo va la carga de trabajo del equipo?
Andrés Prieto: No damos abasto. Hacemos horas extra todas las semanas y aun así los montajes se retrasan esperando la chapa que cortamos fuera.
Elena Ríos: ¿Qué líneas le dejan más dinero?
Javier Valdés: Los montajes y el mantenimiento dejan margen. La carpintería metálica la hacemos por tener al cliente, pero no sé si ganamos algo con ella.
Elena Ríos: ¿Hay algún cliente que pese mucho?
Lucía Valdés: Agroindustrial Valle Verde es casi un tercio de la facturación. Si un año para sus obras, nos hunde.
Elena Ríos: ¿Qué decisiones están pendientes?
Ramón Valdés: Lo del láser lo vamos dejando, ya veremos. Y lo de la sucesión, igual. Lo hablamos en las comidas pero no lo dejamos por escrito.
Elena Ríos: Para cerrar, ¿a qué se compromete antes de la próxima sesión?
Ramón Valdés: A elegir quién puede ser el segundo del taller y a que Lucía me traiga la lista de lo que nos deben.`;
  const TR_COMERCIAL = `Elena Ríos: Le presento la propuesta: auditoría integral y seis meses de intervención por fases.
Ramón Valdés: ¿Y cuánto cuesta y cuándo veo resultados?
Elena Ríos: La primera fase es ordenar la caja y los cobros; los primeros resultados en ocho semanas.
Ramón Valdés: Me parece bien si empezamos por la caja. Lo firmo si el pago va por hitos.
Elena Ríos: De acuerdo, por hitos. Le envío el contrato esta semana.
Ramón Valdés: Perfecto, adelante.`;
  const TR_TRABAJO = `Elena Ríos: Revisemos los acuerdos de la última sesión. ¿Qué se ha hecho?
Ramón Valdés: Hemos elegido a Óscar como segundo del taller. Ya planifica él los lunes y yo solo reviso.
Lucía Valdés: Hemos cobrado las facturas vencidas de Puertos y Obras del Norte y ahora reclamamos todos los viernes.
Elena Ríos: ¿Qué ha cambiado en su semana?
Ramón Valdés: Ya no estoy en el taller todo el día. He liberado unas nueve horas a la semana para visitar clientes.
Javier Valdés: He preparado la tabla de precios de carpintería con un margen mínimo, todavía no la hemos aplicado.
Elena Ríos: Acuerdos para la próxima sesión: aplicar la tabla de precios y enviar la oferta de mantenimiento a los diez primeros clientes.
Javier Valdés: Hecho. La tabla de precios la aplico este mes.`;

  function intervencion() {
    const f0 = dia(-42), f1 = dia(-35), f2 = dia(-14);
    return {
      v: 1, modelo: true,
      sesion: { fecha: f0, consultor: 'Elena Ríos', asistentes: 'Ramón Valdés, Javier Valdés, Lucía Valdés, Andrés Prieto', notas: {}, hechas: {} },
      constantes: { tension: 4, temperatura: 3, pulso: 4, respiracion: 4, dependencia: 5, reflejos: 3 },
      areas: {},
      objetivos: [
        { id: 'oim1', dice: 'Que la empresa funcione sin que yo esté encima de todo', especifica: 'Delegar la planificación del taller y los precios de referencia en un segundo nivel', indicador: 'Decisiones delegadas con criterio escrito', actual: 1, valor: 8, unidad: 'decisiones', fecha: dia(140), responsable: 'Ramón Valdés', solo: true, beneficio: 'Nueve horas semanales para vender y dirigir', contras: 'Aceptar que otros decidan', merece: 'si', como: 'Suplente en taller y tabla de precios', hitos: [{ id: 'hm1', t: 'Suplente del taller nombrado', resp: 'Ramón Valdés', fecha: dia(-20), hecho: true }, { id: 'hm2', t: 'Tabla de precios aprobada', resp: 'Javier Valdés', fecha: dia(20), hecho: false }] },
        { id: 'oim2', dice: 'Dejar de ir justos de caja aunque facturemos más', especifica: 'Bajar los días de cobro de 86 a 65', indicador: 'Días medios de cobro', actual: 86, valor: 65, unidad: 'días', fecha: dia(230), responsable: 'Lucía Valdés', solo: false, beneficio: 'Liberar caja y no depender de la póliza', contras: 'Negociar con el primer cliente', merece: 'si', como: 'Certificaciones mensuales y reclamación semanal', hitos: [{ id: 'hm3', t: 'Lista de lo vencido por cliente', resp: 'Lucía Valdés', fecha: dia(-30), hecho: true }, { id: 'hm4', t: 'Certificaciones en todas las obras grandes', resp: 'Lucía Valdés', fecha: dia(40), hecho: false }] }
      ],
      transcripciones: [], sintomas: [], causas: [], verifica: {},
      hallazgos: [
        { id: 'hlm1', t: 'El 62 % de lo pendiente de cobro está vencido en los tres primeros clientes', area: 'fin', gravedad: 5, origen: 'auditoria' },
        { id: 'hlm2', t: 'No hay escandallo actualizado de carpintería metálica: el precio no cubre el coste en 4 de cada 10 trabajos', area: 'com', gravedad: 4, origen: 'auditoria' },
        { id: 'hlm3', t: 'Subcontratación de corte de chapa por unos 210.000 € al año con plazos de una a dos semanas', area: 'ope', gravedad: 3, origen: 'auditoria' },
        { id: 'hlm4', t: 'Sin plan de sucesión escrito ni protocolo familiar firmado', area: 'gob', gravedad: 4, origen: 'auditoria' }
      ],
      plan: { inicio: dia(-30), acciones: [] },
      sesiones: [
        { id: 'sm1', tipo: 'contacto', fecha: f0, hora: '10:00', dur: 60, obj: 'Primera sesión: triaje', acta: '', acuerdos: [{ t: 'Elegir suplente del taller', resp: 'Ramón Valdés', fecha: dia(-28), hecho: true }, { t: 'Lista de lo vencido por cliente', resp: 'Lucía Valdés', fecha: dia(-30), hecho: true }] },
        { id: 'sm2', tipo: 'auditoria', fecha: f1, hora: '09:00', dur: 240, obj: 'Auditoría integral por áreas', acta: '', acuerdos: [] },
        { id: 'sm3', tipo: 'seguimiento', fecha: f2, hora: '10:00', dur: 90, obj: 'Seguimiento: caja y taller', acta: '', acuerdos: [] },
        { id: 'sm4', tipo: 'seguimiento', fecha: dia(7), hora: '10:00', dur: 90, obj: 'Seguimiento: precios y mantenimiento', acta: '', acuerdos: [] },
        { id: 'sm5', tipo: 'seguimiento', fecha: dia(21), hora: '10:00', dur: 90, obj: 'Seguimiento: decisión del láser', acta: '', acuerdos: [] }
      ],
      volcado: null, informes: {}, documentacion: [],
      // Pendiente de leer por la propia auditoría al abrirla
      __modelo: { textos: [{ nombre: 'Primera sesión ' + f0, fecha: f0, momento: 'primera', texto: TR_PRIMERA }, { nombre: 'Conversación comercial ' + dia(-38), fecha: dia(-38), momento: 'comercial', texto: TR_COMERCIAL }, { nombre: 'Sesión de trabajo ' + f2, fecha: f2, momento: 'intervencion', texto: TR_TRABAJO }] }
    };
  }

  const GEN = { simulador, estrategia, personas, agenda, consultor, libro, intervencion };
  M.MUNDOS = Object.keys(GEN);
  M.generar = (key) => (GEN[key] ? GEN[key]() : null);
})();
