// Atalaya · Genera server/demo-semilla.json: los datos con los que la cuenta de demostración se restablece cada noche.
// Uso: cd atalaya/server && node generar-semilla-demo.mjs   (solo hace falta volver a lanzarlo si se cambian estas empresas)
//
// Las empresas son ficticias: nombres inventados que no aparecen en ningún documento del repositorio (comprobado con grep), sin NIF. Las cifras salen de la misma estructura que la empresa modelo
// (js/modelo/datos.js): cinco años de cuentas con su balance cuadrado y un simulador con un proyecto de inversión.
// Las fechas de trabajo (sesiones, tareas) se guardan relativas al día del restablecimiento: «@d+7» es dentro de siete
// días y «@t-3» un instante de hace tres días. El servidor las convierte al restablecer (restablecerDemo en server.mjs).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url)), WEB = path.resolve(AQUI, '..');
const ctx = { window: {}, console };
ctx.window.window = ctx.window; vm.createContext(ctx);
['js/sectors.js', 'js/engine.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8'), ctx, { filename: f }));
const A = ctx.window.Atalaya;
const r0 = (x) => Math.round(x);

/* Cinco años de cuentas con el balance cuadrado (la deuda a corto cuadra el balance, como en la empresa modelo) */
function historico(c) {
  let fp = c.fp0;
  return c.anios.map((a, i) => {
    const [anio, ventas, margen, personal, otrosGastos, amortizacion, gastosFinancieros, plantilla, dso, dio, dpo, inmovilizado, tesoreria0, deudaLP] = a;
    const costeVentas = r0(ventas * (1 - margen / 100)), ebitda = ventas - costeVentas - personal - otrosGastos;
    const bai = ebitda - amortizacion - gastosFinancieros, impuestos = r0(Math.max(0, bai) * 0.25), beneficio = r0(bai - impuestos);
    if (i) { const p = c._prev; fp = fp + p.beneficio - p.dividendos; }
    const dividendos = beneficio > 0 ? r0(beneficio * (c.reparto || 0.2) / 1000) * 1000 : 0;
    const clientes = r0(ventas * dso / 365), existencias = r0(costeVentas * dio / 365), proveedores = r0(costeVentas * dpo / 365);
    let tesoreria = tesoreria0, deudaCP = r0(inmovilizado + existencias + clientes + tesoreria - fp - deudaLP - proveedores);
    if (deudaCP < 0) { tesoreria -= deudaCP; deudaCP = 0; } // sin deuda a corto: lo que sobra es caja
    const h = { anio, ventas, costeVentas, personal, otrosGastos, amortizacion, gastosFinancieros, impuestos, beneficio, dividendos, plantilla, inmovilizado, existencias, clientes, tesoreria, fondosPropios: r0(fp), deudaLP, deudaCP, proveedores };
    c._prev = h; c._ultimo = Object.assign({ margen, dso, dio, dpo }, h);
    return h;
  });
}
function simulador(c) {
  const H = historico(c), u = c._ultimo, s = A.defaultState();
  A.applySector(s, c.sector);
  return Object.assign(s, {
    empresaNombre: c.nombre, ejemplo: false, sinDatos: false, proyecto: c.proyecto, sector: c.sector,
    empresa: Object.assign(s.empresa, { ventas: u.ventas, margen: u.margen, personal: u.personal, plantilla: u.plantilla, fijos: u.otrosGastos, caja: u.tesoreria, deudaViva: u.deudaLP + u.deudaCP, cuotaDeuda: c.cuotaDeuda,
      fondosPropios: u.fondosPropios, polizaLimite: c.poliza[0], polizaDispuesta: c.poliza[1], dso: u.dso, dio: u.dio, dpo: u.dpo, crecimiento: c.crecimiento }),
    inversion: Object.assign(s.inversion, c.inversion, { lineas: [] }),
    humano: Object.assign(s.humano, c.humano || {}),
    hipotesis: [], opciones: [], escenario: 'base',
    historico: { ejemplo: false, anios: H }
  });
}
// Fecha relativa (días desde el restablecimiento) e instante relativo
const d = (n) => `@d${n >= 0 ? '+' : ''}${n}`, t = (n) => `@t${n >= 0 ? '+' : ''}${n}`;
// Auditoría integral: sesiones con fecha relativa y punto del recorrido en que va cada cliente
function intervencion(c) {
  const ses = (c.sesiones || []).map(([dias, tipo, obj, hora, acta], i) => ({ id: `${c.id}s${i + 1}`, tipo, fecha: d(dias), hora: hora || '10:00', dur: tipo === 'auditoria' ? 240 : 90, obj, acta: acta || '', acuerdos: [] }));
  const rec = { ultimo: { tab: c.tab, fecha: d(-2) }, propuesta: c.etapa >= 2 ? { estado: c.etapa >= 3 ? 'aceptada' : 'presentada', fecha: d(-60), motivo: '' } : { estado: 'borrador', fecha: '', motivo: '' },
    servicios: { s1: { contratado: c.etapa >= 3, estado: c.etapa >= 4 ? 'entregado' : c.etapa >= 3 ? 'curso' : '' }, s2: { contratado: c.etapa >= 4, estado: c.etapa >= 4 ? 'entregado' : '' }, s3: { contratado: c.etapa >= 4, estado: c.etapa >= 4 ? 'curso' : '', meses: 6 } } };
  return { v: 1, sesiones: ses, recorrido: rec, triajeAreas: c.triaje || [] };
}
// Mesa de trabajo: unas pocas tareas con fecha relativa (alguna atrasada, para que la cartera operativa tenga pendientes)
function agenda(c) {
  const tareas = (c.tareas || []).map(([dias, txt, estado], i) => ({ id: `${c.id}t${i + 1}`, t: txt, fecha: d(dias), entrada: d(dias - 10), tipo: 'imperativa', estado: estado || 'pendiente', impacto: 3, esfuerzo: 2, area: 'Dirección', mundo: 'mesa' }));
  return { v: 1, tareas, repetitivas: [], metas: [], semana: [], reuniones: [], delegaciones: [], descartadas: [], logros: {} };
}
const ficha = (c, extra) => Object.assign({ id: c.id, nombre: c.nombre, forma: 'Sociedad limitada (S.L.)', cif: '', constitucion: c.constitucion, sector: c.sector, actividad: c.actividad, provincia: c.provincia, plantilla: c._ultimo.plantilla, socios: [], rol: 'cliente', participacion: 100, alta: t(-200), datosReales: true, datosRealesDesde: '2021-01-01', datosRealesTs: '2021-01-01T00:00:00.000Z', datosRealesOrigen: 'demostracion' }, extra || {});
// Una fila por año: [año, ventas, margen %, personal, otros gastos, amortización, gastos financieros, plantilla, días de cobro, de stock, de pago, inmovilizado, tesorería, deuda a largo]
const fila = (anio, v, m, pe, o, am, gf, pl, dso, dio, dpo, inm, tes, dlp) => [anio, v, m, pe, o, am, gf, pl, dso, dio, dpo, inm, tes, dlp];

/* ---------- Empresas ficticias ---------- */
const DESPACHO = { id: 'principal', nombre: 'Despacho Demostración Consultores, S.L.', sector: 'servicios', actividad: 'Consultoría de dirección y acompañamiento a pymes familiares', provincia: 'Madrid', constitucion: 2012, fp0: 180000,
  anios: [fila(2021, 420000, 92, 250000, 70000, 8000, 1500, 5, 45, 0, 30, 40000, 60000, 0), fila(2022, 465000, 92, 268000, 74000, 8000, 1200, 5, 47, 0, 30, 42000, 70000, 0), fila(2023, 510000, 92, 290000, 79000, 9000, 900, 6, 50, 0, 30, 45000, 75000, 0), fila(2024, 560000, 92, 318000, 84000, 9000, 600, 6, 52, 0, 30, 48000, 82000, 0), fila(2025, 610000, 93, 345000, 88000, 10000, 400, 7, 55, 0, 30, 52000, 95000, 0)],
  proyecto: 'Incorporar un consultor sénior', cuotaDeuda: 0, poliza: [60000, 0], crecimiento: 6,
  inversion: { importe: 30000, pctFin: 0, tipo: 5, plazo: 5, carencia: 0, mesInicio: 2, aportacion: 0, incVentas: 22, rampa: 6, margenNuevo: 90, contrataciones: 1, salario: 52000, anticipo: 1, fijosNuevos: 12000, vidaUtil: 5 } };
const CLIENTES = [
  { id: 'dc1', nombre: 'Mecanizados Brezovia, S.L.', sector: 'industria', actividad: 'Mecanizado de precisión y montaje de componentes para maquinaria agrícola', provincia: 'Valladolid', constitucion: 1989, fp0: 1100000,
    anios: [fila(2021, 2900000, 45, 820000, 260000, 110000, 26000, 24, 70, 58, 62, 1300000, 310000, 520000), fila(2022, 3150000, 45, 880000, 275000, 115000, 28000, 25, 72, 60, 60, 1320000, 280000, 480000), fila(2023, 3380000, 44, 930000, 290000, 120000, 31000, 26, 74, 62, 58, 1360000, 260000, 520000), fila(2024, 3520000, 44, 980000, 300000, 125000, 34000, 27, 76, 64, 56, 1380000, 230000, 470000), fila(2025, 3700000, 44, 1030000, 315000, 130000, 36000, 28, 78, 66, 55, 1400000, 210000, 430000)],
    proyecto: 'Centro de mecanizado de cinco ejes', cuotaDeuda: 8200, poliza: [300000, 120000], crecimiento: 4,
    inversion: { importe: 680000, pctFin: 80, tipo: 5.2, plazo: 7, carencia: 6, mesInicio: 3, aportacion: 0, incVentas: 14, rampa: 9, margenNuevo: 44, contrataciones: 3, salario: 33000, anticipo: 2, fijosNuevos: 40000, vidaUtil: 12 },
    etapa: 4, tab: 'sesiones', triaje: ['warn', 'ok', 'warn'], sesiones: [[-75, 'contacto', 'Primera sesión: triaje'], [-50, 'auditoria', 'Auditoría integral por áreas', '09:00', 'Revisión de las cinco áreas con la dirección y el jefe de taller.'], [-20, 'seguimiento', 'Seguimiento: compras y plazos', '10:00', 'Acordado el calendario de compras de acero.'], [2, 'seguimiento', 'Seguimiento: decisión del centro de mecanizado']],
    tareas: [[-4, 'Pedir tres ofertas del centro de cinco ejes'], [6, 'Revisar el plan de cobros con administración']] },
  { id: 'dc2', nombre: 'Distribuciones Quintavela, S.L.', sector: 'distribucion', actividad: 'Distribución mayorista de alimentación y bebidas a hostelería', provincia: 'Toledo', constitucion: 2001, fp0: 900000,
    anios: [fila(2021, 6100000, 21, 520000, 330000, 60000, 38000, 21, 48, 35, 50, 600000, 240000, 300000), fila(2022, 6700000, 21, 560000, 350000, 62000, 40000, 22, 52, 37, 50, 620000, 200000, 280000), fila(2023, 7200000, 20, 600000, 370000, 65000, 45000, 23, 56, 40, 48, 650000, 160000, 330000), fila(2024, 7650000, 20, 640000, 390000, 68000, 52000, 24, 60, 42, 46, 670000, 120000, 290000), fila(2025, 8100000, 20, 690000, 410000, 70000, 61000, 25, 58, 40, 45, 690000, 260000, 260000)],
    proyecto: 'Nuevo almacén refrigerado', cuotaDeuda: 6500, poliza: [600000, 480000], crecimiento: 5,
    inversion: { importe: 950000, pctFin: 80, tipo: 5.8, plazo: 8, carencia: 6, mesInicio: 4, aportacion: 0, incVentas: 18, rampa: 8, margenNuevo: 18, contrataciones: 4, salario: 27000, anticipo: 2, fijosNuevos: 90000, vidaUtil: 20 },
    etapa: 3, tab: 'auditoria', triaje: ['stop', 'warn', 'warn'], sesiones: [[-30, 'contacto', 'Primera sesión: triaje'], [-9, 'auditoria', 'Auditoría integral por áreas', '09:00'], [5, 'seguimiento', 'Seguimiento: días de cobro y póliza']],
    tareas: [[-6, 'Listado de clientes con vencidos de más de 60 días'], [-1, 'Enviar las cuentas de 2025 cerradas'], [9, 'Preparar la reunión con el banco']] },
  { id: 'dc3', nombre: 'Hostal Rural Fontelar, S.L.', sector: 'hosteleria', actividad: 'Alojamiento rural con restaurante y celebraciones', provincia: 'Cáceres', constitucion: 2008, fp0: 420000,
    anios: [fila(2021, 690000, 70, 260000, 160000, 45000, 14000, 14, 3, 8, 30, 980000, 60000, 560000), fila(2022, 910000, 69, 300000, 175000, 46000, 15000, 16, 3, 8, 30, 990000, 95000, 520000), fila(2023, 1040000, 68, 330000, 185000, 47000, 17000, 17, 3, 8, 30, 1000000, 120000, 480000), fila(2024, 1110000, 68, 355000, 195000, 48000, 18000, 18, 3, 8, 30, 1010000, 140000, 440000), fila(2025, 1180000, 67, 380000, 205000, 50000, 18000, 18, 3, 8, 30, 1020000, 165000, 400000)],
    proyecto: 'Seis habitaciones nuevas y sala de celebraciones', cuotaDeuda: 5200, poliza: [80000, 0], crecimiento: 3,
    inversion: { importe: 420000, pctFin: 70, tipo: 5.0, plazo: 10, carencia: 12, mesInicio: 5, aportacion: 60000, incVentas: 26, rampa: 6, margenNuevo: 66, contrataciones: 4, salario: 23000, anticipo: 1, fijosNuevos: 38000, vidaUtil: 25 },
    etapa: 2, tab: 'propuesta', triaje: ['ok', 'warn'], sesiones: [[-12, 'contacto', 'Primera sesión: triaje'], [9, 'trabajo', 'Presentar la propuesta de auditoría']],
    tareas: [[3, 'Enviar la propuesta de la auditoría integral']] },
  { id: 'dc4', nombre: 'Construcciones Arcolaz, S.L.', sector: 'construccion', actividad: 'Rehabilitación de edificios y obra nueva residencial', provincia: 'Córdoba', constitucion: 1997, fp0: 700000,
    anios: [fila(2021, 4300000, 40, 1080000, 260000, 50000, 30000, 38, 95, 30, 85, 420000, 280000, 350000), fila(2022, 4100000, 39, 1060000, 270000, 50000, 34000, 37, 102, 32, 82, 420000, 210000, 380000), fila(2023, 3900000, 38, 1020000, 275000, 48000, 39000, 35, 108, 34, 80, 410000, 150000, 400000), fila(2024, 3750000, 37, 990000, 280000, 46000, 44000, 33, 112, 36, 78, 400000, 95000, 420000), fila(2025, 3600000, 36, 960000, 285000, 45000, 49000, 32, 118, 38, 75, 390000, 60000, 440000)],
    proyecto: 'Maquinaria propia para dejar de alquilarla', cuotaDeuda: 7400, poliza: [500000, 470000], crecimiento: 0,
    inversion: { importe: 380000, pctFin: 100, tipo: 6.5, plazo: 5, carencia: 0, mesInicio: 2, aportacion: 0, incVentas: 6, rampa: 6, margenNuevo: 20, contrataciones: 2, salario: 30000, anticipo: 1, fijosNuevos: 25000, vidaUtil: 8 },
    etapa: 4, tab: 'plan', triaje: ['stop', 'stop', 'warn'], sesiones: [[-95, 'contacto', 'Primera sesión: triaje'], [-70, 'auditoria', 'Auditoría integral por áreas', '09:00', 'Obras con margen negativo en dos de cinco promociones.'], [-35, 'arranque', 'Arranque del acompañamiento', '10:00', 'Regla de oro: ninguna obra sin presupuesto revisado.'], [-8, 'seguimiento', 'Seguimiento: margen por obra'], [1, 'revision', 'Revisión de fase: tesorería a 13 semanas']],
    tareas: [[-10, 'Cerrar el margen real de las tres últimas obras'], [-3, 'Renegociar la póliza con el banco'], [4, 'Previsión de tesorería a 13 semanas']] },
  { id: 'dc5', nombre: 'Bodegas Vallemiro, S.L.', sector: 'agro', actividad: 'Elaboración y crianza de vino con denominación de origen', provincia: 'Burgos', constitucion: 1984, fp0: 2300000,
    anios: [fila(2021, 2400000, 58, 520000, 380000, 160000, 30000, 19, 80, 420, 70, 2600000, 350000, 900000), fila(2022, 2550000, 58, 545000, 395000, 165000, 31000, 19, 82, 430, 70, 2650000, 330000, 850000), fila(2023, 2700000, 57, 570000, 410000, 170000, 33000, 20, 84, 440, 70, 2700000, 300000, 800000), fila(2024, 2850000, 57, 595000, 425000, 175000, 35000, 21, 85, 450, 70, 2750000, 290000, 760000), fila(2025, 3000000, 57, 620000, 440000, 180000, 36000, 21, 86, 455, 70, 2800000, 280000, 720000)],
    proyecto: 'Nave de crianza y tienda para enoturismo', cuotaDeuda: 14000, poliza: [450000, 220000], crecimiento: 4,
    inversion: { importe: 1100000, pctFin: 70, tipo: 4.9, plazo: 12, carencia: 12, mesInicio: 6, aportacion: 330000, incVentas: 15, rampa: 12, margenNuevo: 60, contrataciones: 3, salario: 28000, anticipo: 2, fijosNuevos: 60000, vidaUtil: 30 },
    etapa: 3, tab: 'documentacion', triaje: ['warn', 'ok', 'ok'], sesiones: [[-40, 'contacto', 'Primera sesión: triaje'], [-15, 'trabajo', 'Recogida de documentación'], [12, 'auditoria', 'Auditoría integral por áreas', '09:00']],
    tareas: [[-2, 'Inventario valorado de existencias en barrica'], [7, 'Plan comercial del enoturismo']] },
  { id: 'dc6', nombre: 'Clínica Nervola Salud, S.L.', sector: 'salud', actividad: 'Clínica de especialidades, fisioterapia y diagnóstico por imagen', provincia: 'Málaga', constitucion: 2014, fp0: 520000,
    anios: [fila(2021, 1350000, 82, 690000, 240000, 70000, 12000, 22, 25, 5, 35, 650000, 180000, 280000), fila(2022, 1480000, 82, 750000, 255000, 72000, 11000, 24, 25, 5, 35, 660000, 210000, 240000), fila(2023, 1620000, 81, 810000, 270000, 74000, 10000, 25, 26, 5, 35, 680000, 250000, 200000), fila(2024, 1760000, 81, 870000, 285000, 76000, 9000, 27, 26, 5, 35, 700000, 290000, 160000), fila(2025, 1900000, 81, 930000, 300000, 78000, 8000, 28, 27, 5, 35, 720000, 330000, 120000)],
    proyecto: 'Resonancia magnética propia', cuotaDeuda: 4100, poliza: [120000, 0], crecimiento: 6,
    inversion: { importe: 750000, pctFin: 70, tipo: 5.1, plazo: 7, carencia: 6, mesInicio: 4, aportacion: 0, incVentas: 22, rampa: 8, margenNuevo: 78, contrataciones: 3, salario: 38000, anticipo: 1, fijosNuevos: 70000, vidaUtil: 10 },
    etapa: 1, tab: 'escucha', triaje: ['ok'], sesiones: [[4, 'contacto', 'Primera sesión: triaje']], tareas: [] }
];
/* Grupo empresarial (vista del plan Grupos): una holding con tres filiales y operaciones entre ellas */
const GRUPO = [
  Object.assign({}, CLIENTES[0], { id: 'principal', nombre: 'Grupo Teralba Industrial, S.L.', actividad: 'Sociedad dominante: dirección, administración y servicios a las filiales', rol: 'holding' }),
  Object.assign({}, CLIENTES[1], { id: 'dg1', nombre: 'Teralba Distribución, S.L.', rol: 'filial', participacion: 100 }),
  Object.assign({}, CLIENTES[4], { id: 'dg2', nombre: 'Teralba Agroalimentaria, S.L.', rol: 'filial', participacion: 80 }),
  Object.assign({}, CLIENTES[2], { id: 'dg3', nombre: 'Teralba Turismo Rural, S.L.', rol: 'filial', participacion: 60 })
];

function plan(empresas, conIv) {
  const out = {}, lista = [];
  empresas.forEach((c) => {
    const cc = JSON.parse(JSON.stringify(c)), sim = simulador(cc), suf = c.id === 'principal' ? '' : '--' + c.id;
    out['simulador' + suf] = sim;
    lista.push(ficha(cc, c.rol ? { rol: c.rol, participacion: c.participacion != null ? c.participacion : 100, matriz: c.rol === 'filial' ? 'principal' : '' } : c.id === 'principal' ? { rol: 'holding' } : {}));
    if (conIv && c.id !== 'principal') { out['intervencion' + suf] = intervencion(c); out['agenda' + suf] = agenda(c); }
  });
  out.empresas = { inicio: { eleccion: 'luego' }, lista };
  return out;
}
const semilla = {
  version: 1,
  nota: 'Datos de la cuenta de demostración (ficticios). Se generan con server/generar-semilla-demo.mjs. «@d+N» y «@t+N» son fechas relativas al día del restablecimiento.',
  planes: {
    consultora: plan([DESPACHO].concat(CLIENTES), true),
    grupos: Object.assign(plan(GRUPO, false), { grupo: { elim: { ventas: 420000, margen: 35000, prestamos: 250000 }, objetivos: [], tes: { prestamos: [{ de: 'principal', a: 'dg3', importe: 250000, interes: 3, contrato: true }], resp: {} } } }),
    profesional: plan([CLIENTES[0]].map((c) => Object.assign({}, c, { id: 'principal' })), false),
    esencial: plan([CLIENTES[0]].map((c) => Object.assign({}, c, { id: 'principal' })), false)
  }
};
// Comprobación: el veredicto del simulador de cada empresa (para que la cartera tenga verdes, ámbar y rojos)
for (const [p, datos] of Object.entries(semilla.planes)) {
  const v = Object.entries(datos).filter(([k]) => k.startsWith('simulador')).map(([k, s]) => { const st = Object.assign(A.defaultState(), JSON.parse(JSON.stringify(s))); let r = null; try { r = A.analyze(st, A.scenarioMods(st, 'base')); } catch (e) { return `${k}: error ${e.message}`; } return `${s.empresaNombre}: ${r.verdict.titulo}`; });
  console.log(`${p}:\n  ${v.join('\n  ')}`);
}
const dest = path.join(AQUI, 'demo-semilla.json');
fs.writeFileSync(dest, JSON.stringify(semilla, null, 1) + '\n');
console.log(`\n${dest}: ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
