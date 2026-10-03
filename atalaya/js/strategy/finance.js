/* Atalaya · Sistema estratégico · Finanzas: flujo del dinero, impuestos, tesorería semanal y presupuesto */
(function () {
  const A = window.Atalaya, F = A.fmt, S = A.strat;
  const { $, $$, esc, css } = S;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const now = new Date();
  const y0 = now.getFullYear(), m0 = now.getMonth(); // el mes 1 del simulador es el mes actual
  const engineIdx = (d) => Math.max(0, Math.min(59, (d.getFullYear() - y0) * 12 + d.getMonth() - m0));
  const lastDay = (y, m) => new Date(y, m + 1, 0);
  const fd = (d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

  /* =========================================================
     1. Auditoría del flujo del dinero
     ========================================================= */
  S.register({
    id: 'dinero', nombre: 'Flujo del dinero', grupo: 'Finanzas',
    render(host) {
      const H = S.sim.historico;
      const an = A.fin.analyze(H);
      if (!H || !H.anios || H.anios.length < 2) {
        host.innerHTML = `${S.section('Auditoría del flujo del dinero', 'Responde a la pregunta «he ganado dinero, ¿dónde está?». Necesita el balance y la cuenta de resultados de al menos dos años.')}
          <div class="glass pad stack"><p class="small">Tres formas de cargar los datos: escribirlos a mano en la rejilla de abajo (lo más rápido si tienes las cuentas a la vista), adjuntar las cuentas anuales en PDF, Excel o Word, o cargar el ejemplo para ver cómo funciona.</p><div class="row"><label class="btn" for="mfFile">Adjuntar cuentas</label><input type="file" id="mfFile" hidden multiple accept=".xlsx,.xls,.ods,.csv,.tsv,.txt,.md,.pdf,.docx"><button class="btn ghost" id="mfEx">Cargar ejemplo</button></div><p class="small" id="mfMsg"></p></div>
          <div class="glass pad mt" id="mfGrid"></div>`;
        A.fin.mountGrid($('#mfGrid', host), H, { empresa: S.sim.empresa, onSave: (h) => { S.sim.historico = h; S.saveSim(); S.rerender(); } });
        $('#mfEx', host).onclick = () => { S.sim.historico = A.fin.example(); S.saveSim(); S.rerender(); };
        $('#mfFile', host).onchange = async (e) => {
          const anios = [];
          for (const f of e.target.files) { try { const r = await A.fin.fromFile(f); r.anios.forEach((a) => { const t = anios.find((x) => x.anio === a.anio); if (t) Object.assign(t, a); else anios.push(a); }); } catch (x) { $('#mfMsg', host).textContent = f.name + ': ' + x.message; } }
          if (anios.length) { S.sim.historico = { anios: anios.sort((a, b) => a.anio - b.anio) }; S.saveSim(); S.rerender(); }
        };
        return;
      }
      const flows = H.anios.slice(1).map((_, i) => A.fin.moneyFlow(H, i + 1));
      const last = flows[flows.length - 1];
      const tot = (k) => flows.reduce((s, f) => s + (f.items.find((x) => x.k === k) || { v: 0 }).v, 0);
      const bnTot = flows.reduce((s, f) => s + f.beneficio, 0), cajaTot = flows.reduce((s, f) => s + f.cajaReal, 0);
      host.innerHTML = `${S.section('Auditoría del flujo del dinero', 'Dónde ha ido a parar cada euro declarado como beneficio. Se calcula con el estado de origen y aplicación de fondos: lo que genera el negocio, lo que se queda atrapado en clientes y almacén, lo que se invierte, lo que se devuelve a los bancos y lo que se reparte.')}
        <div class="row">${H.ejemplo ? '<span class="small muted">Datos de ejemplo.</span>' : ''}${H.aviso ? `<span class="small" style="color:var(--warn)">${esc(H.aviso)}</span>` : ''}<span class="spacer"></span><button class="btn" id="mfEdit">${H.ejemplo ? 'Escribir mis datos' : 'Editar los datos'}</button><button class="btn ghost" id="mfClear">Borrar y empezar de nuevo</button></div>
        <div class="glass pad" id="mfGrid" hidden></div>
        ${S.kpiTiles([
          { k: `Beneficio ${flows[0].previo + 1}-${last.anio}`, v: F.eur(bnTot), info: 'Beneficio', d: 'suma de los años analizados' },
          { k: 'Variación de caja', v: F.eur(cajaTot), st: cajaTot < bnTot * 0.25 ? 'warn' : 'ok', d: `${Math.round(S.pct(cajaTot, bnTot))} % del beneficio llegó al banco` },
          { k: 'Atrapado en circulante', v: F.eur(-(tot('clientes') + tot('existencias') + tot('proveedores'))), st: -(tot('clientes') + tot('existencias')) > bnTot * 0.4 ? 'warn' : 'ok', info: 'Circulante' },
          { k: 'Invertido en activos', v: F.eur(-tot('inversion')) },
          { k: 'A bancos y socios', v: F.eur(-(Math.min(0, tot('deuda')) + tot('dividendos'))), d: 'devolución de deuda y dividendos' }
        ])}
        <div class="glass pad mt stack"><h4>Lectura del último año</h4><p>${last.lectura.join(' ')}</p></div>
        <div class="glass pad mt stack"><h4>Del beneficio a la caja, año a año</h4><div class="table-wrap"><table><thead><tr><th>Concepto</th>${flows.map((f) => `<th>${f.anio}</th>`).join('')}<th>Total</th></tr></thead><tbody>
          ${last.items.map((it) => `<tr><td title="${esc(it.d)}">${esc(it.n)}</td>${flows.map((f) => { const x = f.items.find((y) => y.k === it.k); return `<td style="color:${x.v < 0 ? 'var(--serious)' : 'inherit'}">${F.eur(x.v)}</td>`; }).join('')}<td><b>${F.eur(tot(it.k))}</b></td></tr>`).join('')}
          <tr><td><b>Variación de la caja</b></td>${flows.map((f) => `<td><b>${F.eur(f.cajaReal)}</b></td>`).join('')}<td><b>${F.eur(cajaTot)}</b></td></tr></tbody></table></div></div>
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>De cada 100 € generados en ${last.anio}</h4>${S.hbars(last.destinos.map((d) => ({ n: d.n, v: d.pct })), (v) => Math.round(v) + ' €')}</div>
        <div class="glass pad stack"><h4>Qué hacer</h4><ul class="small">${findingsDinero().map((f) => `<li><b>${esc(f.hallazgo)}</b> ${esc(f.accion)}</li>`).join('') || '<li>El dinero fluye de forma sana.</li>'}</ul></div></div>
        <div class="glass pad mt"><h4>Políticas de gobierno</h4>${an.politicas.map((p) => `<div class="policy"><span class="state st-${p.estado}">${S.stName[p.estado]}</span><div><b>${p.nombre}</b><p class="small">${p.lectura} <span class="muted">${p.recomendacion}</span></p></div></div>`).join('')}</div>`;
      $('#mfEdit', host).onclick = () => { const g = $('#mfGrid', host); g.hidden = false; A.fin.mountGrid(g, H, { empresa: S.sim.empresa, onSave: (h) => { S.sim.historico = h; S.saveSim(); S.rerender(); }, onCancel: () => { g.hidden = true; } }); g.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
      let armed = false;
      $('#mfClear', host).onclick = (ev) => { if (!armed) { armed = true; ev.target.textContent = 'Pulsa otra vez para borrar'; return; } S.sim.historico = null; S.saveSim(); S.rerender(); };
    },
    kpis() {
      const mf = A.fin.moneyFlow(S.sim.historico); if (!mf) return [];
      return [{ k: 'Beneficio que llega a caja', v: Math.round(S.pct(mf.cajaReal, mf.beneficio)) + ' %', st: mf.cajaReal < mf.beneficio * 0.25 ? 'warn' : 'ok' }, { k: 'Atrapado en circulante', v: F.eur(mf.atrapado), st: mf.atrapado > mf.beneficio * 0.4 ? 'warn' : 'ok' }];
    },
    risks() {
      const an = A.fin.analyze(S.sim.historico); if (!an) return [];
      return an.politicas.filter((p) => p.estado !== 'ok').map((p) => S.mkRisk(p.nombre, p.estado === 'stop' ? 4 : 3, 3, p.recomendacion));
    },
    findings: () => findingsDinero()
  });
  function findingsDinero() {
    const mf = A.fin.moneyFlow(S.sim.historico); if (!mf) return [];
    const out = [];
    const cli = mf.items.find((x) => x.k === 'clientes').v, ex = mf.items.find((x) => x.k === 'existencias').v;
    if (cli < -mf.beneficio * 0.15) out.push({ hallazgo: `Los clientes retienen ${F.eur(-cli)} más que el año anterior.`, accion: 'Revisar plazos y límites de crédito, y reclamar los vencidos.', impactoEUR: -cli * 0.5, tipo: 'caja', plazo: 90 });
    if (ex < -mf.beneficio * 0.15) out.push({ hallazgo: `El stock creció ${F.eur(-ex)}.`, accion: 'Liquidar referencias sin rotación y ajustar compras a la demanda.', impactoEUR: -ex * 0.4, tipo: 'caja', plazo: 90 });
    const otros = mf.items.find((x) => x.k === 'otros').v;
    if (Math.abs(otros) > Math.abs(mf.beneficio) * 0.15) out.push({ hallazgo: `${F.eur(Math.abs(otros))} sin explicar en otras partidas del balance.`, accion: 'Revisar con la gestoría saldos con Hacienda, otros deudores y acreedores.', impactoEUR: 0, tipo: 'caja', plazo: 30 });
    return out;
  }

  /* =========================================================
     2. Impuestos: calendario global y marco de reducción
     ========================================================= */
  S.defaults.impuestos = { tipoIS: 25, iva: 21, pctVentasIVA: 100, pctComprasIVA: 95, pctFijosIVA: 70, irpf: 15, ssEmpresa: 31.5, ssTrabajador: 6.5, alquiler: 3000, ibi: 6000, mesIBI: 9, iae: 4500, mesIAE: 10, mensual: false, cuotaAnterior: null, idi: 0, payout: null, escenario: 'base', inversiones: null };
  function taxCalc() {
    const T = S.state.impuestos, e = S.sim.empresa;
    const r = S.analysis(T.escenario), w = r.w;
    const bruto = (m) => w.staff[m] / (1 + T.ssEmpresa / 100);
    const cogs = (m) => w.sales[m] - w.gross[m];
    const fij = (m) => w.fixed[m];
    const H = S.sim.historico && S.sim.historico.anios;
    const isPrev = T.cuotaAnterior !== null && T.cuotaAnterior !== '' ? +T.cuotaAnterior : H && H.length && isFinite(H[H.length - 1].impuestos) ? H[H.length - 1].impuestos : w.tax.slice(0, 12).reduce((a, b) => a + b, 0);
    const iva = T.iva / 100;
    const ivaRep = (m) => w.sales[m] * (T.pctVentasIVA / 100) * iva;
    const ivaSop = (m) => (cogs(m) * (T.pctComprasIVA / 100) + fij(m) * (T.pctFijosIVA / 100) + (m === r.start - 1 ? r.p.capexOperativa : 0)) * iva;
    const pagos = [];
    const add = (fecha, modelo, concepto, importe, nota) => { if (fecha >= new Date(y0, m0, 1) && fecha < new Date(y0 + 1, m0, 1)) pagos.push({ fecha, modelo, concepto, importe: Math.round(importe), nota }); };
    // Meses del simulador → fechas reales
    const idxOf = (y, m) => (y - y0) * 12 + m - m0; // índice 0-based del mes
    const sumRange = (fn, y, mFrom, mTo) => { let s = 0; for (let mm = mFrom; mm <= mTo; mm++) { const i = idxOf(y, mm); s += i >= 0 && i < 60 ? fn(i) : fn(Math.max(0, Math.min(59, i < 0 ? i + 12 : i))); } return s; };
    for (let k = 0; k < 13; k++) {
      const y = y0 + Math.floor((m0 + k) / 12), m = (m0 + k) % 12;
      // Seguridad Social del mes anterior: último día del mes
      const prevI = idxOf(y, m - 1);
      add(lastDay(y, m), 'TC', 'Seguridad Social (cuotas del mes anterior)', bruto(Math.max(0, Math.min(59, prevI < 0 ? 0 : prevI))) * (T.ssEmpresa + T.ssTrabajador) / 100);
      const trim = { 0: [y - 1, 9, 11, 'T4'], 3: [y, 0, 2, 'T1'], 6: [y, 3, 5, 'T2'], 9: [y, 6, 8, 'T3'] }[m];
      if (trim && !T.mensual) {
        const [ty, a, b, tn] = trim, day = m === 0 ? 30 : 20;
        const liq = sumRange(ivaRep, ty, a, b) - sumRange(ivaSop, ty, a, b);
        add(new Date(y, m, day), '303', `IVA ${tn} ${ty}`, Math.max(0, liq), liq < 0 ? `Saldo a compensar o devolver: ${F.eur(-liq)}` : '');
        add(new Date(y, m, day), '111', `Retenciones de trabajo ${tn}`, sumRange(bruto, ty, a, b) * T.irpf / 100);
        if (T.alquiler) add(new Date(y, m, day), '115', `Retenciones de alquiler ${tn}`, T.alquiler * 3 * 0.19);
      }
      if (T.mensual) {
        const pi = Math.max(0, idxOf(y, m - 1));
        const liq = ivaRep(pi) - ivaSop(pi);
        add(new Date(y, m, m === 0 ? 30 : 20), '303', `IVA mensual ${MESES[(m + 11) % 12]}`, Math.max(0, liq), liq < 0 ? `A devolver: ${F.eur(-liq)}` : '');
        add(new Date(y, m, m === 0 ? 30 : 20), '111', `Retenciones de trabajo ${MESES[(m + 11) % 12]}`, bruto(pi) * T.irpf / 100);
        if (T.alquiler) add(new Date(y, m, m === 0 ? 30 : 20), '115', `Retenciones de alquiler ${MESES[(m + 11) % 12]}`, T.alquiler * 0.19);
      }
      if (m === 3 || m === 9 || m === 11) add(new Date(y, m, 20), '202', `Pago fraccionado del Impuesto sobre Sociedades (${m === 3 ? '1.º' : m === 9 ? '2.º' : '3.º'})`, isPrev * 0.18);
      if (m === 6) add(new Date(y, m, 25), '200', `Impuesto sobre Sociedades ${y - 1} (declaración anual)`, Math.max(0, isPrev - isPrev * 0.18 * 3), 'Cuota del año menos los tres pagos fraccionados');
      if (m === T.mesIAE - 1 && T.iae && e.ventas >= 1e6) add(new Date(y, m, 20), 'IAE', 'Impuesto de Actividades Económicas', T.iae, 'Fecha según tu ayuntamiento');
      if (m === T.mesIBI - 1 && T.ibi) add(new Date(y, m, 20), 'IBI', 'Impuesto de Bienes Inmuebles', T.ibi, 'Fecha según tu ayuntamiento');
      if (m === 0) add(new Date(y, 0, 30), '390/190/180', 'Resúmenes anuales informativos (sin pago)', 0, 'Declaraciones informativas');
    }
    pagos.sort((a, b) => a.fecha - b.fecha);
    const anual = pagos.reduce((s, p) => s + p.importe, 0);
    const porModelo = {}; pagos.forEach((p) => { porModelo[p.modelo] = (porModelo[p.modelo] || 0) + p.importe; });
    const ebitda12 = w.ebitda.slice(0, 12).reduce((a, b) => a + b, 0);
    return { pagos, anual, porModelo, isPrev, r, ebitda12, ventas12: w.sales.slice(0, 12).reduce((a, b) => a + b, 0) };
  }
  S.taxCalc = taxCalc;

  /* Palancas legales de optimización fiscal. Estimaciones orientativas: la normativa cambia y debe validarla el asesor. */
  const LEVERS_FISCALES = [
    { id: 'capitalizacion', cat: 'Resultados', nombre: 'Reserva de capitalización', tipo: 'Ahorro definitivo', ref: 'art. 25 LIS',
      como: 'Reduce la base imponible en un porcentaje del aumento de fondos propios (beneficio que no se reparte). Desde 2025 el porcentaje general es mayor y crece si aumenta la plantilla.',
      req: 'Mantener el aumento de fondos propios 3 años y dotar una reserva indisponible. Límite sobre la base imponible.',
      est: (c) => Math.min(0.2 * c.retenido, 0.1 * c.bi) * c.t },
    { id: 'nivelacion', cat: 'Resultados', nombre: 'Reserva de nivelación', tipo: 'Diferimiento', ref: 'art. 105 LIS',
      como: 'Las empresas de reducida dimensión pueden minorar hasta el 10 % de la base imponible y compensarlo con pérdidas de los 5 años siguientes.', req: 'Cifra de negocios inferior a 10 M€. Límite de 1 M€.',
      est: (c) => (c.ventas < 1e7 ? Math.min(0.1 * c.bi, 1e6) * c.t : 0) },
    { id: 'aceleracion', cat: 'Inversión', nombre: 'Amortización acelerada de la inversión', tipo: 'Diferimiento', ref: 'art. 103 LIS',
      como: 'Las empresas de reducida dimensión pueden amortizar el activo nuevo al doble del ritmo de tablas: pagan menos impuesto en los primeros años.', req: 'Inmovilizado material nuevo; empresa de reducida dimensión.',
      est: (c) => (c.ventas < 1e7 ? Math.min(c.bi, c.dep) * c.t : 0) },
    { id: 'momento', cat: 'Inversión', nombre: 'Poner la inversión en funcionamiento antes del cierre', tipo: 'Diferimiento', ref: 'criterio contable',
      como: 'La amortización empieza cuando el activo entra en funcionamiento. Adelantarlo al ejercicio actual adelanta el gasto deducible.', req: 'Activo realmente en funcionamiento antes del 31 de diciembre.',
      est: (c) => (c.dep / 12) * 3 * c.t },
    { id: 'idi', cat: 'Inversión', nombre: 'Deducción por I+D e innovación tecnológica', tipo: 'Ahorro definitivo', ref: 'art. 35 LIS',
      como: 'Una parte del gasto en investigación, desarrollo e innovación se descuenta directamente de la cuota. Puede blindarse con un informe motivado.', req: 'Proyectos que cumplan la definición legal; documentación técnica.',
      est: (c) => Math.min(0.25 * c.idi, 0.25 * c.cuota) },
    { id: 'consolidacion', cat: 'Societario', nombre: 'Consolidación fiscal del grupo', tipo: 'Ahorro temporal', ref: 'arts. 55-75 LIS',
      como: 'Si el proyecto va en una filial con pérdidas al principio, esas pérdidas compensan en el mismo año los beneficios de la matriz.', req: 'Participación de al menos el 75 % y mayoría de votos.',
      est: (c) => c.perdidasProyecto * c.t },
    { id: 'holding', cat: 'Societario', nombre: 'Holding para reinvertir dividendos', tipo: 'Diferimiento', ref: 'art. 21 LIS',
      como: 'Los dividendos que suben de la operativa a una holding están exentos al 95 %; los socios no tributan hasta que el dinero llega a ellos, y la holding puede reinvertir.', req: 'Participación mínima del 5 % durante un año; sustancia en la holding.',
      est: (c) => c.dividendos * 0.95 * 0.21 },
    { id: 'patrimonial', cat: 'Societario', nombre: 'Separar inmuebles en una patrimonial', tipo: 'Planificación', ref: 'operaciones vinculadas, art. 18 LIS',
      como: 'El alquiler a la operativa es gasto deducible y protege el patrimonio; facilita la sucesión. No reduce impuestos por sí solo si el alquiler es de mercado.', req: 'Alquiler a precio de mercado documentado.', est: () => 0 },
    { id: 'ivacaja', cat: 'Tesorería fiscal', nombre: 'Criterio de caja del IVA', tipo: 'Liquidez', ref: 'arts. 163 decies y ss. LIVA',
      como: 'Ingresas el IVA cuando cobras, no cuando facturas. Mejora la caja si cobras a plazo.', req: 'Volumen de operaciones inferior a 2 M€.',
      est: (c) => (c.ventas < 2e6 ? (c.ventas * c.dso / 365) * c.iva : 0) },
    { id: 'redeme', cat: 'Tesorería fiscal', nombre: 'Devolución mensual del IVA (REDEME)', tipo: 'Liquidez', ref: 'art. 30 RIVA',
      como: 'Si soportas más IVA del que cobras (por ejemplo, el año de la inversión), te lo devuelven cada mes en lugar de esperar al final del año.', req: 'Inscripción en el registro; presentación mensual con el SII.',
      est: (c) => c.ivaInversion * 0.5 },
    { id: 'aplazamiento', cat: 'Tesorería fiscal', nombre: 'Aplazar o fraccionar deudas tributarias', tipo: 'Liquidez', ref: 'art. 65 LGT',
      como: 'Puedes pedir aplazar el pago de impuestos en meses tensos de tesorería, con intereses de demora.', req: 'Sin garantías hasta el umbral vigente (50.000 €); no aplicable a retenciones en ciertos casos.',
      est: (c) => Math.min(50000, c.picoImpuestos) },
    { id: 'flexible', cat: 'Personas', nombre: 'Retribución flexible', tipo: 'Ahorro para la plantilla', ref: 'art. 42 LIRPF',
      como: 'Seguro médico, formación, transporte o guardería pagados por la empresa tributan menos para el trabajador: más salario neto con el mismo coste.', req: 'Política escrita y límites por concepto.', est: (c) => c.plantilla * 500 * 0.3 },
    { id: 'bonificaciones', cat: 'Personas', nombre: 'Bonificaciones a la contratación', tipo: 'Ahorro definitivo', ref: 'normativa de empleo vigente',
      como: 'Algunas contrataciones (colectivos concretos, conversión a indefinido) reducen las cuotas de Seguridad Social.', req: 'Consultar los programas vigentes con la gestoría laboral.', est: () => 0 }
  ];
  function levelCtx(escKey) {
    const T = S.state.impuestos, e = S.sim.empresa;
    const r = S.analysis(escKey);
    const t = T.tipoIS / 100;
    const cuota = r.w.tax.slice(0, 12).reduce((a, b) => a + b, 0);
    const bi = cuota / t;
    const payout = T.payout !== null && T.payout !== '' ? +T.payout / 100 : 0.4;
    const bn = bi - cuota;
    const inc = r.w.ebitda.map((v, i) => v - r.b.ebitda[i]).slice(0, 24).filter((v) => v < 0).reduce((a, b) => a + b, 0);
    const tc = taxCalc();
    return { t, cuota, bi, retenido: Math.max(0, bn * (1 - payout)), dividendos: Math.max(0, bn * payout), ventas: e.ventas, dep: S.sim.inversion.importe / S.sim.inversion.vidaUtil, idi: +T.idi || 0, perdidasProyecto: -inc, dso: e.dso, iva: T.iva / 100, ivaInversion: S.sim.inversion.importe * T.iva / 100, plantilla: e.plantilla, picoImpuestos: Math.max(0, ...tc.pagos.map((p) => p.importe)) };
  }
  /* ---------- Escenarios fiscales de inversión ----------
     Compara cómo cambia el Impuesto sobre Sociedades según cómo y cuándo se hace la inversión.
     Simplificación orientativa de la Ley 27/2014 (LIS): tablas de amortización, art. 103 (amortización acelerada ERD),
     art. 102 (libertad de amortización con creación de empleo), art. 106 (leasing), art. 35 (I+D+i) y deducibilidad de intereses. */
  const ACTIVOS = {
    maquinaria: { n: 'Maquinaria', coef: 12 }, instalaciones: { n: 'Instalaciones', coef: 10 }, edificio: { n: 'Edificio industrial', coef: 3 },
    informatica: { n: 'Equipos informáticos', coef: 25 }, software: { n: 'Software', coef: 33 }, vehiculos: { n: 'Vehículos', coef: 16 }, mobiliario: { n: 'Mobiliario', coef: 10 }
  };
  const METODOS = { lineal: 'Lineal según tablas', acelerada: 'Acelerada ×2 (empresa de reducida dimensión)', libertad: 'Libertad de amortización con empleo' };
  const FORMAS = { compra: 'Compra (con o sin préstamo)', leasing: 'Leasing', renting: 'Renting' };
  const nuevoEscFiscal = (n, o) => Object.assign({ nombre: n, importe: S.sim.inversion.importe, activo: 'maquinaria', mes: 6, metodo: 'lineal', forma: 'compra', pctFin: S.sim.inversion.pctFin, tipo: S.sim.inversion.tipo, plazo: S.sim.inversion.plazo, idiPct: 0, empleo: 0 }, o || {});
  function fiscalInversion(x, ctx) {
    const t = ctx.t, erd = ctx.ventas < 1e7;
    const imp = S.num(x.importe), act = ACTIVOS[x.activo] || ACTIVOS.maquinaria, coef = act.coef / 100;
    // Horizonte: toda la vida fiscal del activo, para que el valor actual compare escenarios completos
    const H = Math.min(40, Math.max(6, Math.ceil(1 / coef) + 2, Math.ceil(S.num(x.plazo)) + 2));
    const frac1 = Math.max(1, Math.min(12, 13 - S.num(x.mes))) / 12;
    const avisos = [];
    let metodo = x.metodo;
    if (metodo === 'acelerada' && !erd) { avisos.push('La amortización acelerada solo es para empresas con menos de 10 M€ de cifra de negocios: se calcula lineal.'); metodo = 'lineal'; }
    if (metodo === 'libertad' && (!erd || !S.num(x.empleo))) { avisos.push('La libertad de amortización con empleo exige ser empresa de reducida dimensión y aumentar la plantilla media (y mantenerla 2 años): se calcula lineal.'); metodo = 'lineal'; }
    const gasto = Array(H).fill(0), interes = Array(H).fill(0), deduc = Array(H).fill(0);
    if (x.forma === 'renting') {
      const r = (S.num(x.tipo) + 1.5) / 100, n = Math.max(1, S.num(x.plazo));
      const cuota = imp * r / (1 - Math.pow(1 + r, -n));
      for (let k = 0; k < Math.min(H, n + 1); k++) gasto[k] = cuota * (k === 0 ? frac1 : k === n ? 1 - frac1 : 1);
    } else {
      // Amortización fiscal
      let pend = imp;
      const ritmo = x.forma === 'leasing' ? coef * (erd ? 3 : 2) : metodo === 'acelerada' ? coef * 2 : coef;
      if (metodo === 'libertad') { const lib = Math.min(pend, 120000 * S.num(x.empleo)); gasto[0] += lib; pend -= lib; }
      for (let k = 0; k < H && pend > 0.5; k++) { const a = Math.min(pend, imp * ritmo * (k === 0 ? frac1 : 1)); gasto[k] += a; pend -= a; }
      // Intereses de la financiación (préstamo o leasing): deducibles mientras no superen 1 M€ o el 30 % del beneficio operativo
      const fin = x.forma === 'leasing' ? imp : imp * S.num(x.pctFin) / 100, r = S.num(x.tipo) / 100, n = Math.max(1, S.num(x.plazo));
      if (fin > 0 && r > 0) { let bal = fin; const c = fin * r / (1 - Math.pow(1 + r, -n)); for (let k = 0; k < Math.min(H, n + 1) && bal > 0.5; k++) { const f = k === 0 ? frac1 : 1; const i = bal * r * f; interes[k] = i; bal = Math.max(0, bal - (c * f - i)); } }
    }
    // Deducción por I+D+i (25 % I+D; se toma como media prudente el 20 % si mezcla innovación), con límite del 25 % de la cuota
    let credito = imp * S.num(x.idiPct) / 100 * 0.2;
    const base0 = ctx.bi, cuota0 = Math.max(0, base0 * t);
    const filas = [];
    let acum = 0, bin = 0;
    for (let k = 0; k < H; k++) {
      // Si el gasto supera el beneficio, la base negativa se compensa en los años siguientes
      let bi = base0 - gasto[k] - interes[k];
      if (bi < 0) { bin -= bi; bi = 0; } else { const c = Math.min(bin, bi); bin -= c; bi -= c; }
      let cuota = bi * t;
      const d = Math.min(credito, cuota * 0.25); credito -= d; cuota -= d; deduc[k] = d;
      const ahorro = cuota0 - cuota; acum += ahorro;
      filas.push({ anio: y0 + k, gasto: gasto[k], interes: interes[k], deduc: d, cuota, ahorro, acum });
    }
    const va = filas.reduce((a, f, k) => a + f.ahorro / Math.pow(1.05, k), 0);
    if (gasto.some((g, k) => g + interes[k] > base0)) avisos.push('Algún año el gasto deducible supera el beneficio: la base negativa se compensa en los años siguientes (se ahorra igual, pero más tarde).');
    if (credito > 1) avisos.push(`Quedan ${F.eur(credito)} de deducción de I+D+i pendientes: se pueden aplicar en los 15-18 años siguientes.`);
    if (x.forma === 'renting') avisos.push('En renting no hay activo en balance: toda la cuota es gasto deducible, pero incluye el margen de la compañía de renting.');
    if (x.forma === 'leasing') avisos.push(`El leasing permite deducir la recuperación del coste hasta ${erd ? 'el triple' : 'el doble'} del coeficiente de tablas.`);
    return { filas, va, ahorro5: filas.slice(0, 5).reduce((a, f) => a + f.ahorro, 0), ahorro1: filas[0].ahorro, total: acum, avisos, erd };
  }
  S.fiscalInversion = fiscalInversion;

  S.register({
    id: 'impuestos', nombre: 'Impuestos', grupo: 'Finanzas',
    render(host) {
      const T = S.state.impuestos;
      const tc = taxCalc();
      const ESC = ['estres', 'pesimista', 'base', 'optimista'];
      const ctxs = Object.fromEntries(ESC.map((k) => [k, levelCtx(k)]));
      const byMonth = Array.from({ length: 12 }, (_, k) => { const y = y0 + Math.floor((m0 + k) / 12), m = (m0 + k) % 12; return { l: MESES[m] + ' ' + String(y).slice(2), v: tc.pagos.filter((p) => p.fecha.getFullYear() === y && p.fecha.getMonth() === m).reduce((a, p) => a + p.importe, 0) }; });
      const presion = S.pct(tc.anual, tc.ventas12);
      if (!Array.isArray(T.inversiones)) T.inversiones = [nuevoEscFiscal('Compra con préstamo · lineal'), nuevoEscFiscal('Compra · amortización acelerada', { metodo: 'acelerada' }), nuevoEscFiscal('Leasing', { forma: 'leasing', mes: 3 }), nuevoEscFiscal('Compra en marzo · 20 % de I+D+i', { mes: 3, metodo: 'acelerada', idiPct: 20 })];
      const ctxFiscal = levelCtx(T.escenario);
      const fis = T.inversiones.map((x) => ({ r: fiscalInversion(x, ctxFiscal) }));
      const bestVA = Math.max(...fis.map((f) => f.r.va)); fis.forEach((f) => { f.best = fis.length > 1 && f.r.va === bestVA && bestVA > 0; });
      host.innerHTML = `${S.section('Impuestos', 'Cuadro global de impuestos y cotizaciones de los próximos 12 meses con sus fechas de pago (calendario general de la Agencia Tributaria y la Seguridad Social), y un marco de movimientos legales para reducir o aplazar la factura fiscal en cada escenario.')}
        ${S.kpiTiles([
          { k: 'Pagos en 12 meses', v: F.eur(tc.anual), d: `${F.pct(presion)} de las ventas` },
          { k: 'Impuesto sobre Sociedades', v: F.eur((tc.porModelo['202'] || 0) + (tc.porModelo['200'] || 0)), d: `cuota de referencia ${F.eur(tc.isPrev)}`, info: 'Pago fraccionado' },
          { k: 'IVA a ingresar', v: F.eur(tc.porModelo['303'] || 0), info: 'IVA' },
          { k: 'Seguridad Social', v: F.eur(tc.porModelo.TC || 0) },
          { k: 'Retenciones', v: F.eur((tc.porModelo['111'] || 0) + (tc.porModelo['115'] || 0)), info: 'Retenciones' }
        ])}
        <div class="grid cols-2 mt">
          <div class="glass pad stack"><h4>Pagos por mes</h4><div class="chart" id="txChart"></div></div>
          <div class="glass pad stack"><h4>Supuestos</h4><div class="lever-grid" id="txIn"></div></div>
        </div>
        <div class="glass pad mt stack"><h4>Calendario de pagos</h4><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Modelo</th><th style="text-align:left">Concepto</th><th>Importe</th><th style="text-align:left">Nota</th></tr></thead><tbody>${tc.pagos.map((p) => `<tr><td>${fd(p.fecha)} ${p.fecha.getFullYear()}</td><td>${p.modelo}</td><td style="text-align:left;font-family:var(--font-body)">${esc(p.concepto)}</td><td>${p.importe ? F.eurFull(p.importe) : '—'}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body);color:var(--muted)">${esc(p.nota || '')}</td></tr>`).join('')}</tbody></table></div>
          <p class="small muted">Calendario general para empresas con ejercicio coincidente con el año natural. Las fechas exactas pueden moverse si caen en festivo. Los importes son estimaciones a partir de los datos del simulador (escenario ${T.escenario}).</p></div>
        <div class="glass pad mt stack"><h4>Marco estratégico para reducir la factura fiscal</h4>
          <p class="small">Movimientos legales agrupados por tipo, con una estimación del efecto anual en cada escenario del simulador. «Ahorro definitivo» reduce el impuesto; «diferimiento» lo retrasa (mejora la caja hoy); «liquidez» adelanta dinero sin cambiar el impuesto.</p>
          <div class="table-wrap"><table><thead><tr><th style="text-align:left">Movimiento</th><th>Tipo</th>${ESC.map((k) => `<th>${A.SCENARIOS.find((s) => s.key === k).nombre}</th>`).join('')}<th style="text-align:left">Cómo funciona</th></tr></thead><tbody>
          ${['Resultados', 'Inversión', 'Societario', 'Tesorería fiscal', 'Personas'].map((cat) => `<tr><td colspan="${3 + ESC.length}" style="text-align:left;color:var(--gold)">${cat}</td></tr>` + LEVERS_FISCALES.filter((l) => l.cat === cat).map((l) => `<tr><td style="text-align:left;font-family:var(--font-body)"><b>${l.nombre}</b><br><span class="muted small">${l.ref}</span></td><td style="font-family:var(--font-body)">${l.tipo}</td>${ESC.map((k) => { const v = l.est(ctxs[k]); return `<td>${v > 0 ? F.eur(v) : '—'}</td>`; }).join('')}<td style="text-align:left;white-space:normal;font-family:var(--font-body);min-width:280px">${l.como} <span class="muted">Requisito: ${l.req}</span></td></tr>`).join('')).join('')}
          </tbody></table></div>
          <p class="note">Estimaciones orientativas para preparar la reunión con tu asesor fiscal. Los porcentajes y umbrales cambian con cada reforma: confirma la normativa vigente antes de aplicar cualquier movimiento.</p></div>
        <div class="glass pad mt stack"><h4>Escenarios fiscales de la inversión</h4>
          <p class="small">Plantea la misma inversión de varias formas (compra, leasing o renting; amortización lineal, acelerada o con libertad por empleo; fecha de puesta en marcha; parte de I+D+i) y compara cuánto Impuesto sobre Sociedades ahorra cada una año a año. La base de partida es el beneficio previsto del escenario ${esc(T.escenario)} (${F.eur(ctxFiscal.bi)} de base imponible al ${T.tipoIS} %).</p>
          <div id="txInv"></div>
          <div class="table-wrap mt"><table><thead><tr><th style="text-align:left">Escenario</th>${[0, 1, 2, 3, 4].map((k) => `<th>${y0 + k}</th>`).join('')}<th>5 años</th><th>Toda la vida</th><th>Valor actual</th></tr></thead><tbody>
            ${fis.map((f, i) => `<tr><td style="text-align:left;font-family:var(--font-body)">${f.best ? '<span class="state st-ok">Mejor</span> ' : ''}${esc(T.inversiones[i].nombre || 'Escenario ' + (i + 1))}</td>${f.r.filas.slice(0, 5).map((x) => `<td>${F.eur(x.ahorro)}</td>`).join('')}<td><b>${F.eur(f.r.ahorro5)}</b></td><td>${F.eur(f.r.total)}</td><td>${F.eur(f.r.va)}</td></tr>`).join('')}
          </tbody></table></div>
          <div class="chart" id="txInvChart"></div>
          ${fis.some((f) => f.r.avisos.length) ? `<ul class="small">${fis.map((f, i) => f.r.avisos.map((a) => `<li><b>${esc(T.inversiones[i].nombre)}:</b> ${esc(a)}</li>`).join('')).join('')}</ul>` : ''}
          <p class="note">El ahorro por amortización es sobre todo un adelanto: a lo largo de la vida del activo se deduce lo mismo, pero pagar menos los primeros años mejora la caja justo cuando la inversión la consume. Por eso se compara también en valor actual (descontado al 5 %). La deducción por I+D+i y los intereses sí son ahorro definitivo. ${fis[0] && !fis[0].r.erd ? 'Tu cifra de negocios supera los 10 M€: no aplican los incentivos de empresa de reducida dimensión.' : ''}</p>
        </div>`;
      S.vbars($('#txChart', host), byMonth.map((x) => x.l), [{ n: 'Impuestos y cotizaciones', data: byMonth.map((x) => x.v), c: css('--gold') }], F.eur, { aria: 'Pagos de impuestos por mes', h: 220 });
      const inputs = [['tipoIS', 'Tipo del Impuesto sobre Sociedades', '%'], ['iva', 'Tipo de IVA', '%'], ['pctVentasIVA', 'Ventas con IVA', '%'], ['pctComprasIVA', 'Compras con IVA', '%'], ['pctFijosIVA', 'Gastos fijos con IVA', '%'], ['irpf', 'Retención media de nóminas', '%'], ['ssEmpresa', 'Seguridad Social a cargo empresa', '%'], ['ssTrabajador', 'Seguridad Social del trabajador', '%'], ['alquiler', 'Alquiler mensual con retención', '€'], ['ibi', 'IBI anual', '€'], ['mesIBI', 'Mes del IBI', '1-12'], ['iae', 'IAE anual', '€'], ['mesIAE', 'Mes del IAE', '1-12'], ['cuotaAnterior', 'Cuota del IS del año anterior', '€'], ['idi', 'Gasto anual en I+D+i', '€'], ['payout', 'Beneficio que se reparte', '%']];
      $('#txIn', host).innerHTML = inputs.map(([k, l, u]) => `<div class="field"><div class="top"><label for="tx_${k}">${l}</label><span class="val"><input class="fnum" id="tx_${k}" value="${T[k] === null ? '' : String(T[k]).replace('.', ',')}" placeholder="auto"><span class="u">${u}</span></span></div></div>`).join('') +
        `<div class="field"><div class="top"><label for="tx_esc">Escenario</label><select id="tx_esc" class="input">${A.SCENARIOS.filter((s) => s.key !== 'hipotesis').map((s) => `<option value="${s.key}" ${s.key === T.escenario ? 'selected' : ''}>${s.nombre}</option>`).join('')}</select></div></div>
         <div class="field"><div class="top"><label for="tx_men">Declaración mensual (gran empresa o SII)</label><input type="checkbox" id="tx_men" ${T.mensual ? 'checked' : ''}></div></div>`;
      inputs.forEach(([k]) => { $('#tx_' + k, host).onchange = (e) => { const v = e.target.value.trim(); T[k] = v === '' ? null : S.num(v); S.save(); S.rerender(); }; });
      $('#tx_esc', host).onchange = (e) => { T.escenario = e.target.value; S.save(); S.rerender(); };
      $('#tx_men', host).onchange = (e) => { T.mensual = e.target.checked; S.save(); S.rerender(); };
      S.etable($('#txInv', host), { titulo: 'Escenarios', rows: T.inversiones, onChange: () => { S.save(); S.rerender(); }, nuevo: () => nuevoEscFiscal('Escenario ' + (T.inversiones.length + 1)),
        cols: [{ k: 'nombre', l: 'Nombre', type: 'text' }, { k: 'importe', l: 'Importe €', type: 'num' }, { k: 'activo', l: 'Activo', type: 'select', opts: Object.keys(ACTIVOS).map((k) => ({ v: k, l: ACTIVOS[k].n })) },
          { k: 'mes', l: 'Mes de puesta en marcha (1-12)', type: 'num' }, { k: 'forma', l: 'Forma', type: 'select', opts: Object.keys(FORMAS).map((k) => ({ v: k, l: FORMAS[k] })) }, { k: 'metodo', l: 'Amortización', type: 'select', opts: Object.keys(METODOS).map((k) => ({ v: k, l: METODOS[k] })) },
          { k: 'pctFin', l: '% financiado', type: 'num' }, { k: 'tipo', l: 'Interés %', type: 'num' }, { k: 'plazo', l: 'Plazo (años)', type: 'num' }, { k: 'idiPct', l: '% que es I+D+i', type: 'num' }, { k: 'empleo', l: 'Aumento de plantilla', type: 'num' }] });
      if (fis.length) S.vbars($('#txInvChart', host), [0, 1, 2, 3, 4].map((k) => String(y0 + k)), fis.map((f, i) => ({ n: T.inversiones[i].nombre || 'Escenario ' + (i + 1), data: f.r.filas.slice(0, 5).map((x) => x.ahorro), c: A.seriesColor(i) })), F.eur, { aria: 'Ahorro fiscal por año y escenario', h: 220 });
    },
    kpis() { const tc = taxCalc(); return [{ k: 'Impuestos 12 meses', v: F.eur(tc.anual) }, { k: 'Presión sobre ventas', v: F.pct(S.pct(tc.anual, tc.ventas12)) }]; },
    risks() {
      const tc = taxCalc(); const mx = tc.pagos.reduce((a, p) => (p.importe > a.importe ? p : a), { importe: 0 });
      const caja = S.sim.empresa.caja;
      return mx.importe > caja * 0.3 ? [S.mkRisk(`Pago fiscal concentrado: ${mx.concepto} (${fd(mx.fecha)})`, 3, mx.importe > caja * 0.6 ? 5 : 3, 'Provisiona cada mes la parte proporcional o solicita aplazamiento.')] : [];
    },
    findings() {
      const c = levelCtx('base');
      return LEVERS_FISCALES.filter((l) => l.tipo === 'Ahorro definitivo').map((l) => ({ l, v: l.est(c) })).filter((x) => x.v > 1000).map((x) => ({ hallazgo: `Movimiento fiscal disponible: ${x.l.nombre}.`, accion: x.l.como.split('.')[0] + '. Validar con el asesor.', impactoEUR: x.v, tipo: 'ebitda', plazo: 180 }));
    }
  });

  /* =========================================================
     3. Tesorería por semanas
     ========================================================= */
  S.defaults.tesoreria = { semanas: 13, saldoInicial: null, colchonDias: 15, escenario: 'base', movimientos: [
    { fecha: isoPlus(9), concepto: 'Cobro extraordinario de subvención (ejemplo)', tipo: 'entrada', categoria: 'Otros cobros', importe: 18000, recurrente: 'no' },
    { fecha: isoPlus(23), concepto: 'Renovación de seguros (ejemplo)', tipo: 'salida', categoria: 'Otros pagos', importe: 9500, recurrente: 'no' }
  ] };
  function isoPlus(d) { return new Date(Date.now() + d * 864e5).toISOString().slice(0, 10); }
  const CATS_IN = ['Cobros de clientes', 'Otros cobros', 'Financiación recibida'];
  const CATS_OUT = ['Proveedores', 'Nóminas', 'Seguridad Social', 'Impuestos', 'Cuotas de préstamos', 'Gastos fijos', 'Inversiones', 'Otros pagos'];
  function cashWeeks() {
    const Ts = S.state.tesoreria, T = S.state.impuestos, e = S.sim.empresa;
    // Los extractos bancarios traen importes con signo: los negativos son salidas
    Ts.movimientos.forEach((m) => { if (S.num(m.importe) < 0) { m.importe = -S.num(m.importe); m.tipo = 'salida'; if (CATS_IN.includes(m.categoria)) m.categoria = 'Otros pagos'; } });
    const r = S.analysis(Ts.escenario), w = r.w;
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // lunes
    const N = Ts.semanas;
    const weeks = Array.from({ length: N }, (_, i) => { const a = new Date(+start + i * 7 * 864e5); return { a, b: new Date(+a + 7 * 864e5), inn: {}, out: {}, items: [] }; });
    const end = weeks[N - 1].b;
    const put = (d, tipo, cat, v, concepto) => { if (!(v > 0.5)) return; const wk = weeks.find((x) => d >= x.a && d < x.b); if (!wk) return; const bag = tipo === 'entrada' ? wk.inn : wk.out; bag[cat] = (bag[cat] || 0) + v; if (concepto) wk.items.push({ d, tipo, cat, v, concepto }); };
    const iva = T.iva / 100;
    for (let d = new Date(start); d < end; d = new Date(+d + 864e5)) {
      const cobroMes = engineIdx(new Date(+d - e.dso * 864e5)), pagoMes = engineIdx(new Date(+d - e.dpo * 864e5));
      const dim = lastDay(d.getFullYear(), d.getMonth()).getDate();
      put(d, 'entrada', 'Cobros de clientes', (w.sales[cobroMes] / dim) * (1 + iva * T.pctVentasIVA / 100));
      put(d, 'salida', 'Proveedores', ((w.sales[pagoMes] - w.gross[pagoMes]) / dim) * (1 + iva * T.pctComprasIVA / 100));
      const i = engineIdx(d);
      if (d.getDate() === 1) put(d, 'salida', 'Gastos fijos', w.fixed[i] * (1 + iva * T.pctFijosIVA / 100), 'Gastos fijos del mes');
      if (d.getDate() === 5) put(d, 'salida', 'Cuotas de préstamos', w.debt[i], 'Cuotas de préstamos');
      if (d.getDate() === dim) {
        const bruto = w.staff[i] / (1 + T.ssEmpresa / 100);
        put(d, 'salida', 'Nóminas', bruto * (1 - T.irpf / 100 - T.ssTrabajador / 100), 'Nóminas netas');
      }
      if (i === r.start - 1 && d.getDate() === 15 && r.p.capexOperativa) put(d, 'salida', 'Inversiones', r.p.capexOperativa - r.loan - r.p.aportacion, 'Parte de la inversión pagada con caja propia');
    }
    taxCalc().pagos.forEach((p) => put(p.fecha, 'salida', p.modelo === 'TC' ? 'Seguridad Social' : 'Impuestos', p.importe, `${p.modelo} · ${p.concepto}`));
    Ts.movimientos.forEach((mv) => {
      const d0 = new Date(mv.fecha); if (isNaN(d0)) return;
      const step = mv.recurrente === 'semanal' ? 7 : mv.recurrente === 'mensual' ? 'm' : 0;
      let d = new Date(d0); let guard = 0;
      while (d < end && guard++ < 60) {
        if (d >= start) put(d, mv.tipo, mv.categoria || (mv.tipo === 'entrada' ? 'Otros cobros' : 'Otros pagos'), S.num(mv.importe), mv.concepto);
        if (!step) break; d = step === 7 ? new Date(+d + 7 * 864e5) : new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }
    });
    let saldo = Ts.saldoInicial !== null && Ts.saldoInicial !== '' ? +Ts.saldoInicial : e.caja;
    const colchon = (e.personal + e.fijos) / 365 * Ts.colchonDias;
    weeks.forEach((wk) => { wk.tin = Object.values(wk.inn).reduce((a, b) => a + b, 0); wk.tout = Object.values(wk.out).reduce((a, b) => a + b, 0); wk.ini = saldo; saldo += wk.tin - wk.tout; wk.fin = saldo; wk.conPoliza = saldo + (e.polizaLimite || 0) - (e.polizaDispuesta || 0); wk.st = wk.fin < 0 ? (wk.conPoliza < 0 ? 'stop' : 'warn') : wk.fin < colchon ? 'warn' : 'ok'; });
    return { weeks, colchon };
  }
  S.cashWeeks = cashWeeks;
  S.register({
    id: 'tesoreria', nombre: 'Tesorería semanal', grupo: 'Finanzas',
    render(host) {
      const Ts = S.state.tesoreria, e = S.sim.empresa;
      const { weeks, colchon } = cashWeeks();
      const minW = weeks.reduce((a, b) => (b.fin < a.fin ? b : a));
      const tin = weeks.reduce((a, b) => a + b.tin, 0), tout = weeks.reduce((a, b) => a + b.tout, 0);
      const lbl = (wk) => fd(wk.a);
      host.innerHTML = `${S.section('Tesorería por semanas', `Entradas y salidas previstas semana a semana. Se construye sola con los datos del simulador (cobros según tus días de cobro, pagos a proveedores según tus días de pago, nóminas a fin de mes, Seguridad Social, impuestos del calendario fiscal y cuotas de préstamos), y le sumas los movimientos que conozcas: a mano, dictados o importando el extracto del banco.`)}
        ${S.kpiTiles([
          { k: 'Saldo inicial', v: F.eur(weeks[0].ini) },
          { k: 'Entradas', v: F.eur(tin), d: `${Ts.semanas} semanas` },
          { k: 'Salidas', v: F.eur(tout) },
          { k: 'Semana más tensa', v: F.eur(minW.fin), st: minW.st, d: 'semana del ' + lbl(minW) },
          { k: 'Saldo final', v: F.eur(weeks[weeks.length - 1].fin), st: weeks[weeks.length - 1].st }
        ])}
        <div class="row mt"><div class="seg" style="margin:0" id="tsN">${[13, 26, 52].map((n) => `<button data-n="${n}" aria-pressed="${n === Ts.semanas}">${n} semanas</button>`).join('')}</div>
          <label class="small">Saldo inicial <input class="input" id="tsIni" style="width:120px" value="${Ts.saldoInicial === null ? '' : Ts.saldoInicial}" placeholder="${Math.round(e.caja)}"></label>
          <label class="small">Colchón mínimo <input class="input" id="tsCol" style="width:60px" value="${Ts.colchonDias}"> días de gastos (${F.eur(colchon)})</label>
          <label class="small">Escenario <select class="input" id="tsEsc">${A.SCENARIOS.filter((s) => s.key !== 'hipotesis').map((s) => `<option value="${s.key}" ${s.key === Ts.escenario ? 'selected' : ''}>${s.nombre}</option>`).join('')}</select></label></div>
        <div class="glass pad mt"><div class="chart" id="tsChart"></div></div>
        <div class="glass pad mt stack"><h4>Cuadro semanal</h4><div class="table-wrap"><table class="tsTable"><thead><tr><th>Concepto</th>${weeks.map((wk) => `<th>${lbl(wk)}</th>`).join('')}</tr></thead><tbody>
          <tr><td><b>Saldo inicial</b></td>${weeks.map((wk) => `<td>${F.eur(wk.ini)}</td>`).join('')}</tr>
          <tr><td colspan="${weeks.length + 1}" style="text-align:left;color:var(--go)">Entradas</td></tr>
          ${CATS_IN.map((c) => `<tr><td>${c}</td>${weeks.map((wk) => `<td>${wk.inn[c] ? F.eur(wk.inn[c]) : ''}</td>`).join('')}</tr>`).join('')}
          <tr><td colspan="${weeks.length + 1}" style="text-align:left;color:var(--serious)">Salidas</td></tr>
          ${CATS_OUT.map((c) => `<tr><td>${c}</td>${weeks.map((wk) => `<td>${wk.out[c] ? F.eur(wk.out[c]) : ''}</td>`).join('')}</tr>`).join('')}
          <tr><td><b>Flujo neto</b></td>${weeks.map((wk) => `<td style="color:${wk.tin - wk.tout < 0 ? 'var(--serious)' : 'var(--go)'}">${F.eur(wk.tin - wk.tout)}</td>`).join('')}</tr>
          <tr><td><b>Saldo final</b></td>${weeks.map((wk) => `<td><b>${F.eur(wk.fin)}</b></td>`).join('')}</tr>
          <tr><td>Con póliza disponible</td>${weeks.map((wk) => `<td class="calc">${F.eur(wk.conPoliza)}</td>`).join('')}</tr>
          <tr><td>Estado</td>${weeks.map((wk) => `<td><i class="dotc ${wk.st}"></i></td>`).join('')}</tr>
        </tbody></table></div></div>
        <div class="glass pad mt" id="tsMov"></div>`;
      const W = weeks.map(lbl);
      S.vbars($('#tsChart', host), W, [{ n: 'Entradas', data: weeks.map((x) => x.tin), c: css('--s3') }, { n: 'Salidas', data: weeks.map((x) => -x.tout), c: css('--s2') }], F.eur, { line: { n: 'Saldo final', data: weeks.map((x) => x.fin), c: css('--gold') }, aria: 'Tesorería semanal' });
      $$('#tsN button', host).forEach((b) => b.onclick = () => { Ts.semanas = +b.dataset.n; S.save(); S.rerender(); });
      $('#tsIni', host).onchange = (ev) => { Ts.saldoInicial = ev.target.value.trim() === '' ? null : S.num(ev.target.value); S.save(); S.rerender(); };
      $('#tsCol', host).onchange = (ev) => { Ts.colchonDias = S.num(ev.target.value) || 15; S.save(); S.rerender(); };
      $('#tsEsc', host).onchange = (ev) => { Ts.escenario = ev.target.value; S.save(); S.rerender(); };
      S.etable($('#tsMov', host), {
        titulo: 'Movimientos conocidos', rows: Ts.movimientos, onChange: () => { S.save(); S.rerender(); },
        nuevo: () => ({ fecha: isoPlus(7), concepto: '', tipo: 'salida', categoria: 'Otros pagos', importe: 0, recurrente: 'no' }),
        cols: [
          { k: 'fecha', l: 'Fecha', type: 'date', syn: ['fecha', 'f. valor', 'fecha valor', 'dia'] },
          { k: 'concepto', l: 'Concepto', type: 'text', syn: ['concepto', 'descripcion', 'detalle'] },
          { k: 'tipo', l: 'Tipo', type: 'select', opts: [{ v: 'entrada', l: 'Entrada' }, { v: 'salida', l: 'Salida' }] },
          { k: 'categoria', l: 'Categoría', type: 'select', opts: CATS_IN.concat(CATS_OUT) },
          { k: 'importe', l: 'Importe', type: 'num', syn: ['importe', 'cantidad', 'euros'] },
          { k: 'recurrente', l: 'Repite', type: 'select', opts: [{ v: 'no', l: 'No' }, { v: 'semanal', l: 'Cada semana' }, { v: 'mensual', l: 'Cada mes' }] }
        ],
        dictar: (t) => {
          const v = A.docs.parseAmount(t); if (!isFinite(v)) return null;
          const d = A.docs.parseDate(t) || new Date(Date.now() + 7 * 864e5);
          const entrada = /(cobro|cobrar|ingreso|entrada|nos pagan|recibir)/i.test(t);
          return { fecha: d.toISOString().slice(0, 10), concepto: t, tipo: entrada ? 'entrada' : 'salida', categoria: entrada ? 'Otros cobros' : 'Otros pagos', importe: Math.abs(v), recurrente: /cada mes|mensual/i.test(t) ? 'mensual' : /cada semana|semanal/i.test(t) ? 'semanal' : 'no' };
        }
      });
    },
    kpis() { const { weeks } = cashWeeks(); const mn = weeks.reduce((a, b) => (b.fin < a.fin ? b : a)); return [{ k: 'Saldo mínimo 13 semanas', v: F.eur(mn.fin), st: mn.st }]; },
    risks() { const { weeks } = cashWeeks(); const neg = weeks.filter((w) => w.st !== 'ok'); return neg.length ? [S.mkRisk(`${neg.length} semanas con tesorería por debajo del colchón`, 4, neg.some((w) => w.st === 'stop') ? 5 : 3, 'Adelanta cobros, negocia fechas de pago o amplía la póliza antes de esas semanas.')] : []; }
  });

  /* =========================================================
     4. Presupuesto y desviaciones
     ========================================================= */
  /* Estructura detallada del presupuesto: cada grupo se reparte en partidas con un peso típico */
  const GRUPOS = { ventas: 'Ventas', variable: 'Costes variables', personal: 'Personal', fijos: 'Gastos fijos' };
  const PARTIDAS = {
    variable: [['Compras de materiales y mercaderías', 0.75], ['Transportes y portes', 0.12], ['Subcontratación y trabajos externos', 0.08], ['Comisiones de venta', 0.05]],
    personal: [['Producción y operaciones', 0.52], ['Comercial y atención al cliente', 0.16], ['Técnico e ingeniería', 0.12], ['Dirección y administración', 0.20]],
    fijos: [['Alquileres', 0.22], ['Suministros (luz, agua, gas)', 0.17], ['Mantenimiento y reparaciones', 0.12], ['Seguros', 0.06], ['Servicios profesionales (asesoría, auditoría)', 0.10], ['Marketing y publicidad', 0.09], ['Tecnología y software', 0.08], ['Viajes y vehículos', 0.06], ['Otros gastos', 0.10]]
  };
  const METODOS_P = {
    historico: { n: 'Histórico + crecimiento', d: 'Parte del último año (datos del simulador), aplica el crecimiento de ventas, la inflación a los gastos y la revisión salarial al personal.' },
    escenario: { n: 'Desde un escenario del simulador', d: 'Toma mes a mes las ventas y costes del escenario elegido, con el efecto de la inversión (rampa, contrataciones, nuevos fijos).' },
    objetivo: { n: 'Para alcanzar un EBITDA objetivo', d: 'Mantiene los gastos (con inflación) y calcula la venta necesaria para llegar al EBITDA que fijes.' },
    cero: { n: 'Base cero', d: 'Crea la estructura de partidas vacía para justificar cada euro desde cero.' }
  };
  S.defaults.presupuesto = { anio: y0, versiones: null, activa: null, reales: null, params: { metodo: 'historico', crecimiento: null, ipc: 3.6, salarios: 3.5, ebitdaObj: 12, escenario: 'base' } };
  const sum = (a) => a.reduce((x, y) => x + (+y || 0), 0);
  const uidP = () => 'l' + Math.random().toString(36).slice(2, 8);
  function seasonality() {
    const sec = A.SECTORS[S.sim.sector];
    const w = Array.from({ length: 12 }, (_, m) => 1 + sec.estacionalidad * Math.cos((2 * Math.PI * (m + 1 - sec.pico)) / 12));
    const t = sum(w); return w.map((x) => x / t);
  }
  /* Genera una versión del presupuesto con el método elegido */
  function generar(prm, anio) {
    const e = S.sim.empresa, sz = seasonality(), plano = Array(12).fill(1 / 12);
    const crec = prm.crecimiento === null || prm.crecimiento === '' || prm.crecimiento === undefined ? e.crecimiento : S.num(prm.crecimiento);
    const ipc = S.num(prm.ipc) / 100, sal = S.num(prm.salarios) / 100;
    let ventasM, varM, persM, fijM;
    if (prm.metodo === 'escenario') {
      const r = S.analysis(prm.escenario || 'base'), w = r.w;
      const at = (arr, m) => { const i = (anio - y0) * 12 + m - m0; return i >= 0 && i < 60 ? arr[i] : null; };
      ventasM = sz.map((f, m) => { const v = at(w.sales, m); return v === null ? e.ventas * f : v; });
      varM = ventasM.map((v, m) => { const g = at(w.gross, m); return g === null ? v * (1 - e.margen / 100) : at(w.sales, m) - g; });
      persM = plano.map((f, m) => { const v = at(w.staff, m); return v === null ? e.personal * f : v; });
      fijM = plano.map((f, m) => { const v = at(w.fixed, m); return v === null ? e.fijos * f : v; });
    } else {
      const pers = e.personal * (1 + sal), fij = e.fijos * (1 + ipc);
      let ventas = e.ventas * (1 + crec / 100);
      const mv = e.margen / 100;
      if (prm.metodo === 'objetivo') { const obj = S.num(prm.ebitdaObj) / 100; ventas = mv - obj > 0.01 ? (pers + fij) / (mv - obj) : ventas; }
      ventasM = sz.map((f) => ventas * f); varM = ventasM.map((v) => v * (1 - mv));
      persM = plano.map((f) => pers * f); fijM = plano.map((f) => fij * f);
    }
    const z = prm.metodo === 'cero';
    const mk = (grupo, nombre, meses) => ({ id: uidP(), grupo, nombre, meses: meses.map((v) => (z ? 0 : Math.round(v))) });
    const prods = (S.state.comercial && S.state.comercial.productos) || [];
    const pv = prods.map((p) => S.num(p.unidades) * S.num(p.precio)), tv = sum(pv);
    const lineas = [];
    if (tv > 0 && prods.length <= 8) prods.forEach((p, i) => lineas.push(mk('ventas', 'Ventas · ' + p.nombre, ventasM.map((v) => v * pv[i] / tv))));
    else lineas.push(mk('ventas', 'Ventas', ventasM));
    PARTIDAS.variable.forEach(([n, f]) => lineas.push(mk('variable', n, varM.map((v) => v * f))));
    PARTIDAS.personal.forEach(([n, f]) => lineas.push(mk('personal', n, persM.map((v) => v * f))));
    PARTIDAS.fijos.forEach(([n, f]) => lineas.push(mk('fijos', n, fijM.map((v) => v * f))));
    const nombre = `${METODOS_P[prm.metodo].n}${prm.metodo === 'historico' ? ` (${crec >= 0 ? '+' : ''}${String(crec).replace('.', ',')} %)` : prm.metodo === 'objetivo' ? ` (${prm.ebitdaObj} %)` : prm.metodo === 'escenario' ? ` (${(A.SCENARIOS.find((x) => x.key === prm.escenario) || {}).nombre || ''})` : ''}`;
    return { id: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), nombre, metodo: prm.metodo, creada: new Date().toISOString(), lineas };
  }
  function ensure() {
    const B = S.state.presupuesto;
    B.params = Object.assign({ metodo: 'historico', crecimiento: null, ipc: 3.6, salarios: 3.5, ebitdaObj: 12, escenario: 'base' }, B.params || {});
    if (!Array.isArray(B.versiones) || !B.versiones.length) { const v = generar(B.params, B.anio); v.nombre = 'Presupuesto inicial · ' + v.nombre; B.versiones = [v]; B.activa = v.id; }
    if (!B.versiones.some((v) => v.id === B.activa)) B.activa = B.versiones[0].id;
    const V = B.versiones.find((v) => v.id === B.activa);
    // Reales por partida (se conservan al cambiar de versión, enlazados por nombre de partida)
    if (!B.reales || Array.isArray(B.reales)) {
      const old = Array.isArray(B.reales) ? B.reales : null; B.reales = {};
      const cerrados = B.anio === y0 ? m0 : B.anio < y0 ? 12 : 0;
      const gk = { ventas: 'ventas', variable: 'costeVariable', personal: 'personal', fijos: 'fijos' };
      V.lineas.forEach((l, j) => {
        const totG = (m) => sum(V.lineas.filter((x) => x.grupo === l.grupo).map((x) => x.meses[m]));
        B.reales[l.nombre] = l.meses.map((v, m) => {
          if (old && old[m] && old[m][gk[l.grupo]] !== undefined && old[m][gk[l.grupo]] !== null && old[m][gk[l.grupo]] !== '') return Math.round(S.num(old[m][gk[l.grupo]]) * (totG(m) ? v / totG(m) : 0));
          if (!old && m < cerrados) return Math.round(v * (l.grupo === 'ventas' ? 0.9 + ((m * 37 + j * 7) % 11) / 100 : l.grupo === 'personal' ? 1.03 : 0.95 + ((m * 13 + j * 5) % 9) / 100));
          return null;
        });
      });
      B.ejemplo = !old;
    }
    return V;
  }
  function budget() {
    const B = S.state.presupuesto, V = ensure();
    const G = (g, src, m) => sum(V.lineas.filter((l) => l.grupo === g).map((l) => (src === 'p' ? l.meses[m] : S.num((B.reales[l.nombre] || [])[m]))));
    const rows = Array.from({ length: 12 }, (_, m) => {
      const has = V.lineas.some((l) => l.grupo === 'ventas' && (B.reales[l.nombre] || [])[m] !== null && (B.reales[l.nombre] || [])[m] !== undefined && (B.reales[l.nombre] || [])[m] !== '');
      const p = { ventas: G('ventas', 'p', m), costeVariable: G('variable', 'p', m), personal: G('personal', 'p', m), fijos: G('fijos', 'p', m) };
      const r = has ? { ventas: G('ventas', 'r', m), costeVariable: G('variable', 'r', m), personal: G('personal', 'r', m), fijos: G('fijos', 'r', m) } : {};
      return { m, p, r, has, pE: p.ventas - p.costeVariable - p.personal - p.fijos, rE: has ? r.ventas - r.costeVariable - r.personal - r.fijos : null };
    });
    const done = rows.filter((x) => x.has);
    const ytd = (k, src) => done.reduce((a, x) => a + (src === 'p' ? (k === 'ebitda' ? x.pE : x.p[k]) : (k === 'ebitda' ? x.rE : S.num(x.r[k]))), 0);
    const ratio = ytd('ventas', 'p') ? ytd('ventas', 'r') / ytd('ventas', 'p') : 1;
    const escEq = ratio >= 1.05 ? 'optimista' : ratio >= 0.97 ? 'base' : ratio >= 0.85 ? 'pesimista' : 'estres';
    const cierreVentas = ytd('ventas', 'r') + rows.filter((x) => !x.has).reduce((a, x) => a + x.p.ventas * ratio, 0);
    const ventasAnual = sum(rows.map((x) => x.p.ventas));
    return { V, rows, done, ytd, ratio, escEq, cierreVentas, ventasAnual };
  }
  S.budget = budget;
  const fmt0 = (v) => (v === null || v === undefined || v === '' ? '' : new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v));
  const pctTxt = (v) => (isFinite(v) ? (Math.round(v * 10) / 10).toLocaleString('es-ES') + ' %' : '—');

  /* Rejilla editable de partidas × meses: todas las casillas de partidas se editan; las filas de total se calculan solas */
  function grid(host, V, getter, setter, opts) {
    const lin = V.lineas;
    const venta = (m) => sum(lin.filter((l) => l.grupo === 'ventas').map((l) => S.num(getter(l, m))));
    const ventaT = sum(MESES.map((_, m) => venta(m)));
    const tot = (g, m) => sum(lin.filter((l) => l.grupo === g).map((l) => S.num(getter(l, m))));
    const ebitda = (m) => tot('ventas', m) - tot('variable', m) - tot('personal', m) - tot('fijos', m);
    const lineRow = (l) => { const t = sum(MESES.map((_, m) => S.num(getter(l, m)))); return `<tr><td class="pname">${opts.editNames ? `<input class="gcell txt" data-name="${l.id}" value="${esc(l.nombre)}">` : esc(l.nombre)}</td>${MESES.map((_, m) => `<td><input class="gcell" data-l="${l.id}" data-m="${m}" inputmode="decimal" value="${fmt0(getter(l, m))}" aria-label="${esc(l.nombre)} ${MESES_L[m]}"></td>`).join('')}<td><input class="gcell gtot" data-tot="${l.id}" value="${fmt0(t)}" title="Escribe un total anual y se reparte entre los meses" aria-label="${esc(l.nombre)} total anual"></td><td class="calc">${l.grupo === 'ventas' ? pctTxt(S.pct(t, ventaT)) + ' del total' : pctTxt(S.pct(t, ventaT))}</td>${opts.editNames ? `<td><button class="icon-btn" data-dell="${l.id}" aria-label="Quitar partida">×</button></td>` : ''}</tr>`; };
    const totRow = (n, f, strong) => { const t = sum(MESES.map((_, m) => f(m))); return `<tr class="gsum${strong ? ' strong' : ''}"><td class="pname">${n}</td>${MESES.map((_, m) => `<td>${fmt0(f(m))}</td>`).join('')}<td>${fmt0(t)}</td><td>${pctTxt(S.pct(t, ventaT))}</td>${opts.editNames ? '<td></td>' : ''}</tr>`; };
    host.innerHTML = `<div class="etable table-wrap"><table class="bgrid"><thead><tr><th style="text-align:left">Partida</th>${MESES.map((m) => `<th>${m}</th>`).join('')}<th>Total año</th><th>% s/ventas</th>${opts.editNames ? '<th></th>' : ''}</tr></thead><tbody>
      ${Object.keys(GRUPOS).map((g) => `<tr class="ghead"><td colspan="${opts.editNames ? 16 : 15}">${GRUPOS[g]}${opts.editNames ? ` <button class="btn ghost" data-addl="${g}" style="padding:2px 8px;font-size:.7rem;margin-left:8px">+ partida</button>` : ''}</td></tr>${lin.filter((l) => l.grupo === g).map(lineRow).join('')}${totRow('Total ' + GRUPOS[g].toLowerCase(), (m) => tot(g, m))}${g === 'variable' ? totRow('Margen bruto', (m) => tot('ventas', m) - tot('variable', m)) : ''}`).join('')}
      ${totRow('EBITDA', ebitda, true)}</tbody></table></div>
      <p class="hint">Todas las casillas blancas se pueden escribir, incluido el total anual (se reparte entre los meses con el mismo patrón). Las filas sombreadas son totales y se calculan solas. Puedes pegar un bloque desde Excel en cualquier casilla.</p>`;
    const L = (id) => lin.find((l) => l.id === id);
    $$('input[data-l]', host).forEach((inp) => {
      inp.addEventListener('change', () => { const v = inp.value.trim() === '' ? null : S.num(inp.value); setter(L(inp.dataset.l), +inp.dataset.m, v); opts.onChange(); });
      inp.addEventListener('paste', (ev) => {
        const t = (ev.clipboardData || window.clipboardData).getData('text'); if (!/[\t\n]/.test(t.trim())) return;
        ev.preventDefault();
        const ids = lin.map((l) => l.id), i0 = ids.indexOf(inp.dataset.l), m0p = +inp.dataset.m;
        t.split(/\r?\n/).filter((x) => x.trim() !== '').forEach((ln, i) => ln.split('\t').forEach((c, j) => { const l = L(ids[i0 + i]); if (l && m0p + j < 12 && c.trim() !== '') setter(l, m0p + j, S.num(c)); }));
        opts.onChange();
      });
    });
    $$('input[data-tot]', host).forEach((inp) => inp.addEventListener('change', () => {
      const l = L(inp.dataset.tot), nuevo = S.num(inp.value), act = sum(MESES.map((_, m) => S.num(getter(l, m))));
      const pat = act > 0 ? MESES.map((_, m) => S.num(getter(l, m)) / act) : (l.grupo === 'ventas' ? seasonality() : Array(12).fill(1 / 12));
      MESES.forEach((_, m) => setter(l, m, Math.round(nuevo * pat[m]))); opts.onChange();
    }));
    $$('input[data-name]', host).forEach((inp) => inp.addEventListener('change', () => { const l = L(inp.dataset.name); const old = l.nombre; l.nombre = inp.value.trim() || old; if (opts.onRename) opts.onRename(old, l.nombre); opts.onChange(); }));
    $$('[data-dell]', host).forEach((b) => b.onclick = () => { V.lineas = V.lineas.filter((l) => l.id !== b.dataset.dell); opts.onChange(); });
    $$('[data-addl]', host).forEach((b) => b.onclick = () => { V.lineas.push({ id: uidP(), grupo: b.dataset.addl, nombre: 'Nueva partida', meses: Array(12).fill(0) }); opts.onChange(); });
  }

  S.register({
    id: 'presupuesto', nombre: 'Presupuesto', grupo: 'Finanzas',
    render(host) {
      const B = S.state.presupuesto, b = budget(), V = b.V, prm = B.params;
      const tab = host.dataset.tab || 'ppto';
      const periodo = host.dataset.periodo || 'ytd';
      // Desviaciones por partida en el periodo elegido
      const PER = [['ytd', 'Acumulado del año'], ['anio', 'Año completo']].concat([0, 1, 2, 3].map((q) => ['t' + q, 'Trimestre ' + (q + 1)])).concat(MESES_L.map((n, m) => ['m' + m, n[0].toUpperCase() + n.slice(1)]));
      const meses = periodo === 'ytd' ? b.done.map((x) => x.m) : periodo === 'anio' ? MESES.map((_, m) => m) : periodo[0] === 't' ? [0, 1, 2].map((k) => +periodo[1] * 3 + k) : [+periodo.slice(1)];
      const conReal = meses.filter((m) => b.rows[m].has);
      const pL = (l, ms) => sum(ms.map((m) => l.meses[m])), rL = (l, ms) => sum(ms.map((m) => S.num((B.reales[l.nombre] || [])[m])));
      const vP = sum(V.lineas.filter((l) => l.grupo === 'ventas').map((l) => pL(l, conReal))), vR = sum(V.lineas.filter((l) => l.grupo === 'ventas').map((l) => rL(l, conReal)));
      const devRow = (n, p, r, ingreso, cls) => { const d = r - p, dp = S.pct(d, Math.abs(p)); const good = ingreso ? d >= 0 : d <= 0; const st = Math.abs(dp) < 3 ? 'ok' : good ? 'ok' : Math.abs(dp) < 8 ? 'warn' : 'stop'; return `<tr class="${cls || ''}"><td class="pname">${n}</td><td>${F.eur(p)}</td><td>${conReal.length ? F.eur(r) : '—'}</td><td style="color:${conReal.length ? A.stateColor(st) : 'inherit'}">${conReal.length ? (d >= 0 ? '+' : '') + F.eur(d) : '—'}</td><td style="color:${conReal.length ? A.stateColor(st) : 'inherit'}">${conReal.length ? (dp >= 0 ? '+' : '') + pctTxt(dp) : '—'}</td><td>${pctTxt(S.pct(p, vP))}</td><td>${conReal.length ? pctTxt(S.pct(r, vR)) : '—'}</td><td>${conReal.length ? ((S.pct(r, vR) - S.pct(p, vP)) >= 0 ? '+' : '') + (Math.round((S.pct(r, vR) - S.pct(p, vP)) * 10) / 10).toLocaleString('es-ES') + ' pp' : '—'}</td></tr>`; };
      const grp = (g) => V.lineas.filter((l) => l.grupo === g);
      const gP = (g) => sum(grp(g).map((l) => pL(l, conReal))), gR = (g) => sum(grp(g).map((l) => rL(l, conReal)));
      const ebP = gP('ventas') - gP('variable') - gP('personal') - gP('fijos'), ebR = gR('ventas') - gR('variable') - gR('personal') - gR('fijos');
      const devTable = `<div class="table-wrap"><table class="bdev"><thead><tr><th style="text-align:left">Partida</th><th>Presupuesto</th><th>Real</th><th>Desviación €</th><th>Desviación %</th><th>% s/ventas ppto.</th><th>% s/ventas real</th><th>Diferencia de peso</th></tr></thead><tbody>
        ${Object.keys(GRUPOS).map((g) => `<tr class="ghead"><td colspan="8">${GRUPOS[g]}</td></tr>${grp(g).map((l) => devRow(esc(l.nombre), pL(l, conReal), rL(l, conReal), g === 'ventas')).join('')}${devRow('Total ' + GRUPOS[g].toLowerCase(), gP(g), gR(g), g === 'ventas', 'gsum')}`).join('')}
        ${devRow('EBITDA', ebP, ebR, true, 'gsum strong')}</tbody></table></div>`;
      const cmp = B.versiones.map((v) => { const t = (g) => sum(v.lineas.filter((l) => l.grupo === g).map((l) => sum(l.meses))); const ve = t('ventas'); return { v, ve, va: t('variable'), pe: t('personal'), fi: t('fijos'), eb: ve - t('variable') - t('personal') - t('fijos') }; });
      host.innerHTML = `${S.section('Presupuesto y desviaciones', 'Genera propuestas de presupuesto con distintos métodos, ajústalas partida a partida y compáralas. Después introduce el real de cada mes y Atalaya mide la desviación en euros, en porcentaje y en peso sobre las ventas, por mes, trimestre o año, te dice a qué escenario se parece la realidad y proyecta el cierre.')}
        ${B.ejemplo ? '<p class="small muted">Los reales son de ejemplo: sustitúyelos por los tuyos en la pestaña «Reales».</p>' : ''}
        ${S.kpiTiles([
          { k: 'Ventas acumuladas', v: F.eur(b.ytd('ventas', 'r')), d: `presupuesto ${F.eur(b.ytd('ventas', 'p'))} · ${pctTxt(S.pct(b.ytd('ventas', 'r') - b.ytd('ventas', 'p'), b.ytd('ventas', 'p')))}`, st: b.ratio >= 0.97 ? 'ok' : b.ratio >= 0.9 ? 'warn' : 'stop' },
          { k: 'EBITDA acumulado', v: F.eur(b.ytd('ebitda', 'r')), d: `presupuesto ${F.eur(b.ytd('ebitda', 'p'))}`, st: b.ytd('ebitda', 'r') >= b.ytd('ebitda', 'p') * 0.95 ? 'ok' : 'warn', info: 'EBITDA' },
          { k: 'La realidad se parece a', v: A.SCENARIOS.find((s) => s.key === b.escEq).nombre, d: `ventas al ${Math.round(b.ratio * 100)} % de lo previsto`, st: b.escEq === 'base' || b.escEq === 'optimista' ? 'ok' : b.escEq === 'pesimista' ? 'warn' : 'stop' },
          { k: 'Cierre proyectado', v: F.eur(b.cierreVentas), d: `presupuesto ${F.eur(b.ventasAnual)}` }
        ])}
        <div class="glass pad mt stack"><div class="row"><h4>Generar una propuesta de presupuesto</h4><span class="spacer"></span><span class="small muted">Cada propuesta se guarda como una versión</span></div>
          <div class="pmethods">${Object.keys(METODOS_P).map((k) => `<label class="pm ${prm.metodo === k ? 'on' : ''}"><input type="radio" name="pvMet" value="${k}" ${prm.metodo === k ? 'checked' : ''}><b>${METODOS_P[k].n}</b><small>${METODOS_P[k].d}</small></label>`).join('')}</div>
          <div class="lever-grid">
            ${prm.metodo === 'historico' ? `<label class="small">Crecimiento de ventas (%)<input class="input" id="pv_crecimiento" value="${prm.crecimiento === null ? '' : String(prm.crecimiento).replace('.', ',')}" placeholder="${String(S.sim.empresa.crecimiento).replace('.', ',')} (del simulador)"></label>` : ''}
            ${prm.metodo === 'objetivo' ? `<label class="small">EBITDA objetivo (% sobre ventas)<input class="input" id="pv_ebitdaObj" value="${String(prm.ebitdaObj).replace('.', ',')}"></label>` : ''}
            ${prm.metodo === 'escenario' ? `<label class="small">Escenario<select class="input" id="pv_escenario">${A.SCENARIOS.map((x) => `<option value="${x.key}" ${x.key === prm.escenario ? 'selected' : ''}>${x.nombre}</option>`).join('')}</select></label>` : ''}
            ${prm.metodo === 'historico' || prm.metodo === 'objetivo' ? `<label class="small">Inflación de gastos (%)<input class="input" id="pv_ipc" value="${String(prm.ipc).replace('.', ',')}" title="Previsión del Banco de España para 2026: 3,6 %"></label><label class="small">Revisión salarial (%)<input class="input" id="pv_salarios" value="${String(prm.salarios).replace('.', ',')}"></label>` : ''}
          </div>
          <div class="row"><button class="btn solid" id="pvGen">Generar propuesta</button><span class="small muted">Se añade como versión nueva; la actual no se pierde.</span></div></div>

        <div class="glass pad mt stack"><div class="row"><h4>Versiones</h4><span class="spacer"></span><label class="small">Versión de trabajo <select class="input" id="pvVer">${B.versiones.map((v) => `<option value="${v.id}" ${v.id === B.activa ? 'selected' : ''}>${esc(v.nombre)}</option>`).join('')}</select></label><button class="btn ghost" id="pvDup">Duplicar</button><button class="btn ghost" id="pvRen">Renombrar</button>${B.versiones.length > 1 ? '<button class="btn ghost" id="pvDel">Eliminar</button>' : ''}</div>
          <div class="table-wrap"><table><thead><tr><th style="text-align:left">Versión</th><th>Ventas</th><th>Costes variables</th><th>Personal</th><th>Gastos fijos</th><th>EBITDA</th><th>% EBITDA</th></tr></thead><tbody>${cmp.map((c) => `<tr${c.v.id === B.activa ? ' style="background:rgba(201, 242, 77, .06)"' : ''}><td style="text-align:left;font-family:var(--font-body)">${c.v.id === B.activa ? '● ' : ''}${esc(c.v.nombre)}</td><td>${F.eur(c.ve)}</td><td>${F.eur(c.va)}</td><td>${F.eur(c.pe)}</td><td>${F.eur(c.fi)}</td><td>${F.eur(c.eb)}</td><td>${pctTxt(S.pct(c.eb, c.ve))}</td></tr>`).join('')}</tbody></table></div></div>

        <div class="row mt"><div class="seg" style="margin:0" id="pvTab">${[['ppto', 'Presupuesto'], ['real', 'Reales'], ['desv', 'Desviaciones']].map(([k, l]) => `<button data-t="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div><span class="spacer"></span>
          <button class="btn" id="pvSim">Llevar la desviación al escenario «Hipótesis» del simulador</button></div>
        ${tab === 'desv' ? `<div class="glass pad mt stack"><div class="row"><h4>Presupuesto frente a real</h4><span class="spacer"></span><label class="small">Periodo <select class="input" id="pvPer">${PER.map(([k, l]) => `<option value="${k}" ${k === periodo ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
            <p class="small muted">${conReal.length ? `Se comparan los meses con datos reales del periodo (${conReal.map((m) => MESES[m]).join(', ')}).` : 'Este periodo aún no tiene datos reales.'} «% s/ventas» es el peso de cada partida sobre las ventas; la diferencia de peso, en puntos (pp), enseña qué gasto ha crecido más que la venta.</p>${devTable}</div>
          <div class="glass pad mt"><div class="chart" id="pvChart"></div></div>`
        : `<div class="glass pad mt stack"><h4>${tab === 'ppto' ? 'Presupuesto · ' + esc(V.nombre) : 'Reales por partida y mes'}</h4><div id="pvGrid"></div></div>`}`;
      // Generador
      $$('input[name="pvMet"]', host).forEach((r) => r.onchange = () => { prm.metodo = r.value; S.save(); S.rerender(); });
      ['crecimiento', 'ebitdaObj', 'ipc', 'salarios'].forEach((k) => { const el = $('#pv_' + k, host); if (el) el.onchange = () => { prm[k] = el.value.trim() === '' && k === 'crecimiento' ? null : S.num(el.value); S.save(); }; });
      const es = $('#pv_escenario', host); if (es) es.onchange = () => { prm.escenario = es.value; S.save(); };
      $('#pvGen', host).onclick = () => { const v = generar(prm, B.anio); B.versiones.push(v); B.activa = v.id; host.dataset.tab = 'ppto'; S.save(); S.rerender(); };
      $('#pvVer', host).onchange = (e) => { B.activa = e.target.value; S.save(); S.rerender(); };
      $('#pvDup', host).onclick = () => { const c = A.clone(V); c.id = 'v' + Date.now().toString(36); c.nombre = V.nombre + ' (copia)'; c.lineas.forEach((l) => { l.id = uidP(); }); B.versiones.push(c); B.activa = c.id; S.save(); S.rerender(); };
      $('#pvRen', host).onclick = () => { const h = $('#pvRen', host); const inp = document.createElement('input'); inp.className = 'input'; inp.value = V.nombre; h.replaceWith(inp); inp.focus(); inp.onchange = () => { V.nombre = inp.value.trim() || V.nombre; S.save(); S.rerender(); }; };
      const dl = $('#pvDel', host); if (dl) { let armed = false; dl.onclick = () => { if (!armed) { armed = true; dl.textContent = 'Pulsa otra vez para eliminar'; return; } B.versiones = B.versiones.filter((v) => v.id !== V.id); B.activa = B.versiones[0].id; S.save(); S.rerender(); }; }
      $$('#pvTab button', host).forEach((bt) => bt.onclick = () => { host.dataset.tab = bt.dataset.t; S.rerender(); });
      const per = $('#pvPer', host); if (per) per.onchange = () => { host.dataset.periodo = per.value; S.rerender(); };
      $('#pvSim', host).onclick = () => { S.sim.custom.ventasF = Math.round(b.ratio * 100) / 100; S.sim.escenario = 'hipotesis'; S.saveSim(); $('#pvSim', host).textContent = 'Hecho: abre el simulador para verlo'; };
      if (tab === 'desv') S.vbars($('#pvChart', host), MESES, [{ n: 'Ventas presupuestadas', data: b.rows.map((x) => x.p.ventas), c: css('--s1') }, { n: 'Ventas reales', data: b.rows.map((x) => (x.has ? S.num(x.r.ventas) : 0)), c: css('--gold') }], F.eur, { aria: 'Ventas presupuestadas y reales', line: { n: 'EBITDA real', data: b.rows.map((x) => (x.has ? x.rE : 0)), c: css('--s3') } });
      else if (tab === 'ppto') grid($('#pvGrid', host), V, (l, m) => l.meses[m], (l, m, v) => { l.meses[m] = v === null ? 0 : v; }, { editNames: true, onChange: () => { S.save(); S.rerender(); }, onRename: (o, n) => { if (B.reales[o] && !B.reales[n]) { B.reales[n] = B.reales[o]; } } });
      else grid($('#pvGrid', host), V, (l, m) => (B.reales[l.nombre] || [])[m], (l, m, v) => { B.reales[l.nombre] = B.reales[l.nombre] || Array(12).fill(null); B.reales[l.nombre][m] = v; }, { onChange: () => { B.ejemplo = false; S.save(); S.rerender(); } });
    },
    kpis() { const b = budget(); return [{ k: 'Ventas frente a presupuesto', v: Math.round(b.ratio * 100) + ' %', st: b.ratio >= 0.97 ? 'ok' : b.ratio >= 0.9 ? 'warn' : 'stop' }, { k: 'Escenario equivalente', v: A.SCENARIOS.find((s) => s.key === b.escEq).nombre }]; },
    risks() {
      const b = budget(), B = S.state.presupuesto, R = [];
      if (b.ratio < 0.95) R.push(S.mkRisk('Las ventas reales van por debajo del presupuesto', 4, b.ratio < 0.85 ? 5 : 3, 'Revisa el plan comercial y lleva la desviación al simulador para ver el efecto en la inversión.'));
      const ms = b.done.map((x) => x.m);
      b.V.lineas.filter((l) => l.grupo !== 'ventas').forEach((l) => { const p = sum(ms.map((m) => l.meses[m])), r = sum(ms.map((m) => S.num((B.reales[l.nombre] || [])[m]))); if (p > 0 && r > p * 1.12 && r - p > 5000) R.push(S.mkRisk(`${l.nombre}: ${pctTxt(S.pct(r - p, p))} sobre presupuesto`, 3, r - p > 30000 ? 4 : 2, 'Analiza la causa de la desviación y corrige o actualiza el presupuesto.')); });
      return R;
    },
    findings() { const b = budget(); const gap = b.ventasAnual - b.cierreVentas; return gap > 0 ? [{ hallazgo: `El cierre proyectado queda ${F.eur(gap)} por debajo del presupuesto de ventas.`, accion: 'Plan comercial de recuperación en clientes A y oportunidades abiertas.', impactoEUR: gap * (S.sim.empresa.margen / 100), tipo: 'ebitda', plazo: 90 }] : []; }
  });
})();
