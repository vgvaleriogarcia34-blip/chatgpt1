/* Atalaya · Motor financiero
 * Proyección mensual a 60 meses de la empresa con y sin la inversión:
 * ventas, margen bruto, personal, fijos, EBITDA, impuestos, circulante,
 * servicio de deuda y caja. Sobre esa proyección se calculan dimensión,
 * retorno, coberturas, nuevo tamaño operativo, semáforos, riesgos,
 * preparación del sistema humano, estructuras societarias y plan de corrección.
 */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const H = 60;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  A.clamp = clamp;
  A.clone = clone;
  A.HORIZON = H;

  /* ---------- Escenarios ---------- */
  A.SCENARIOS = [
    { key: 'estres', nombre: 'Estrés', desc: 'Mitad de la venta prevista, rampa 6 meses tarde, sobrecoste del 20 %, cobros +30 días y tipos +2 pp.',
      mods: { ventasF: 0.5, retraso: 6, margenDelta: -5, sobrecoste: 20, dsoDelta: 30, tipoDelta: 2 } },
    { key: 'pesimista', nombre: 'Pesimista', desc: 'El 70 % de la venta prevista, 3 meses de retraso y algo de erosión de margen.',
      mods: { ventasF: 0.7, retraso: 3, margenDelta: -3, sobrecoste: 10, dsoDelta: 15, tipoDelta: 1 } },
    { key: 'base', nombre: 'Base', desc: 'El plan tal como lo ha planteado la dirección.',
      mods: { ventasF: 1, retraso: 0, margenDelta: 0, sobrecoste: 0, dsoDelta: 0, tipoDelta: 0 } },
    { key: 'optimista', nombre: 'Optimista', desc: 'Un 15 % más de venta, rampa un mes antes y mejor margen.',
      mods: { ventasF: 1.15, retraso: -1, margenDelta: 1.5, sobrecoste: 0, dsoDelta: -5, tipoDelta: 0 } },
    { key: 'hipotesis', nombre: 'Hipótesis', desc: 'Tu escenario: ajusta cada palanca a mano.', mods: null }
  ];
  A.scenarioMods = (state, key) => {
    const sc = A.SCENARIOS.find((s) => s.key === key) || A.SCENARIOS[2];
    return sc.mods || state.custom;
  };

  /* ---------- Hipótesis (shocks) ---------- */
  A.SHOCKS = {
    cliente: { nombre: 'Pérdida de un cliente relevante', unidad: '% ventas', desc: 'Cae la venta total desde ese mes.' },
    ventas: { nombre: 'Caída temporal de ventas', unidad: '% ventas', desc: 'Bache de demanda durante el periodo.' },
    margen: { nombre: 'Subida de materias primas', unidad: 'pp margen', desc: 'El margen bruto baja durante el periodo.' },
    tipos: { nombre: 'Subida de tipos de interés', unidad: 'pp', desc: 'El préstamo nuevo encarece desde ese mes.' },
    cobro: { nombre: 'Alargamiento de cobros', unidad: 'días', desc: 'Clientes que pagan más tarde.' },
    salarios: { nombre: 'Revisión salarial / convenio', unidad: '% coste', desc: 'Sube el coste de personal desde ese mes.' },
    puntual: { nombre: 'Gasto extraordinario', unidad: 'miles €', desc: 'Un pago único: avería, sanción, litigio.' }
  };

  /* ---------- Estructuras societarias ---------- */
  A.STRUCTURES = {
    directa: {
      nombre: 'Inversión directa', corto: 'Directa',
      desc: 'La sociedad operativa invierte y se endeuda. Rápida y sencilla, pero todo el riesgo queda dentro.',
      setup: 0, control: 100, aislamiento: 15, complejidad: 10, fiscal: 70
    },
    leasing: {
      nombre: 'Leasing / renting', corto: 'Leasing',
      desc: 'Financiación del 100 % del activo con cuota desde el primer mes. No consume caja de entrada, pero cuesta más.',
      setup: 0, control: 100, aislamiento: 25, complejidad: 15, fiscal: 75
    },
    filial: {
      nombre: 'Nueva sociedad filial', corto: 'Filial',
      desc: 'La actividad nueva nace en una filial. Aísla el riesgo y facilita dar entrada a terceros más adelante.',
      setup: 3, control: 100, aislamiento: 75, complejidad: 45, fiscal: 65
    },
    patrimonial: {
      nombre: 'Patrimonial + alquiler', corto: 'Patrimonial',
      desc: 'Una sociedad patrimonial de los socios compra el activo y lo alquila a la operativa. La operativa no se endeuda.',
      setup: 4, control: 100, aislamiento: 85, complejidad: 60, fiscal: 60
    },
    socio: {
      nombre: 'Entrada de socio inversor', corto: 'Socio',
      desc: 'Un inversor financiero aporta la mitad de la inversión a cambio de participación en el negocio nuevo.',
      setup: 6, control: 65, aislamiento: 40, complejidad: 55, fiscal: 70
    },
    jv: {
      nombre: 'Joint venture industrial', corto: 'Joint venture',
      desc: 'Un socio del sector comparte inversión, venta y riesgo al 50 %. Aporta canal y acelera la rampa.',
      setup: 6, control: 50, aislamiento: 70, complejidad: 75, fiscal: 65
    }
  };

  /* Líneas de la inversión: cada activo (máquina, vehículo, nave…) con su importe, su mes, su vida útil y,
     si se quiere, su propia financiación. Sin líneas, la inversión es un único bloque. El importe total
     (inversion.importe) manda: las líneas se reparten en proporción, así las palancas que lo escalan siguen valiendo. */
  A.LINEA_TIPOS = {
    maquinaria: { n: 'Maquinaria o equipos', vida: 10 },
    vehiculo: { n: 'Vehículos', vida: 6 },
    nave: { n: 'Nave, local o terreno', vida: 30 },
    obra: { n: 'Obra o reforma', vida: 15 },
    tecnologia: { n: 'Tecnología y software', vida: 4 },
    otro: { n: 'Otro activo', vida: 8 }
  };
  A.lineasActivas = (state) => ((state.inversion && state.inversion.lineas) || []).filter((l) => l.activa !== false && l.importe > 0);
  function structureParams(state, mods) {
    const inv = state.inversion;
    const st = state.estructura;
    const sob = 1 + (mods.sobrecoste || 0) / 100;
    const importeTotal = inv.importe * sob;
    const p = {
      importeTotal, share: 1, setup: A.STRUCTURES[st].setup, rampaF: 1,
      pctFin: inv.pctFin / 100, tipo: inv.tipo + (mods.tipoDelta || 0), plazo: inv.plazo, carencia: inv.carencia,
      aportacion: inv.aportacion || 0, alquiler: 0, extraFijos: 0, depreciable: importeTotal, ownerShare: 1,
      depositoInicial: 0
    };
    if (st === 'patrimonial') { p.alquiler = (importeTotal * 0.075) / 12; p.pctFin = 0; p.depreciable = 0; p.extraFijos = 6000; p.aportacion = 0; }
    else if (st === 'filial') p.extraFijos = 18000;
    else if (st === 'socio') { p.aportacion += importeTotal * 0.5; p.ownerShare = 0.65; p.extraFijos = 12000; }
    else if (st === 'jv') { p.share = 0.5; p.rampaF = 0.7; p.extraFijos = 15000; p.importeTotal = importeTotal * 0.5; p.depreciable = p.importeTotal; }
    // Tramos: uno por línea (o uno solo con los datos generales)
    const L = A.lineasActivas(state), base = L.reduce((a, l) => a + l.importe, 0);
    const src = L.length ? L.map((l) => ({ nombre: l.nombre, peso: l.importe / base, mes: l.mes || inv.mesInicio, vida: l.vida || inv.vidaUtil, fin: l.fin || null }))
      : [{ nombre: 'Inversión', peso: 1, mes: inv.mesInicio, vida: inv.vidaUtil, fin: null }];
    const jv = st === 'jv' ? 0.5 : 1;
    p.tramos = src.map((t) => {
      const f = t.fin || {};
      let pct = (f.pctFin != null ? f.pctFin : inv.pctFin) / 100, tipo = (f.tipo != null ? f.tipo : inv.tipo) + (mods.tipoDelta || 0);
      let plazo = f.plazo != null ? f.plazo : inv.plazo, car = f.carencia != null ? f.carencia : inv.carencia;
      if (st === 'leasing') { pct = 1; tipo += 1.5; plazo = Math.min(plazo, 7); car = 0; }
      else if (st === 'filial') pct = Math.max(0, pct - 0.1);
      else if (st === 'socio') pct = Math.min(pct, 0.5);
      const capex = st === 'patrimonial' ? 0 : inv.importe * sob * t.peso * jv;
      return { nombre: t.nombre, mes: Math.max(1, Math.round(t.mes)) + p.setup, vida: Math.max(1, t.vida), capex, loan: capex * pct, pct, tipo, plazo, carencia: car, dep: st === 'patrimonial' ? 0 : capex };
    });
    p.capexOperativa = p.tramos.reduce((a, t) => a + t.capex, 0);
    p.loan = p.tramos.reduce((a, t) => a + t.loan, 0);
    if (st !== 'patrimonial') p.depreciable = p.capexOperativa;
    p.pctFin = p.capexOperativa ? p.loan / p.capexOperativa : 0;
    // Valor contable que queda a los cinco años (para el valor residual del proyecto)
    p.resid5 = p.tramos.reduce((a, t) => a + Math.max(0, t.dep * (1 - 5 / t.vida)), 0);
    return p;
  }

  /* ---------- Simulación mensual ---------- */
  A.simulate = function (state, mods, opts) {
    opts = opts || {};
    const e = state.empresa, inv = state.inversion, sec = A.SECTORS[state.sector];
    const noInv = !!opts.noInv;
    const p = structureParams(state, mods);
    const shocks = (state.hipotesis || []).filter((h) => h.activo);
    const start = inv.mesInicio + p.setup;
    const delay = mods.retraso || 0;
    const rampa = Math.max(1, inv.rampa * p.rampaF, ((state.humano || {}).curva || 0) * 0.75);
    const mgBase = e.margen / 100;
    const mgNew = (inv.margenNuevo + (mods.margenDelta || 0)) / 100;
    const t = e.impuesto / 100;
    const amp = sec.estacionalidad, pico = sec.pico;
    const seas = (m) => 1 + amp * Math.cos((2 * Math.PI * (((m - 1) % 12) + 1 - pico)) / 12);
    const growth = (m) => Math.pow(1 + e.crecimiento / 100, (m - 1) / 12);

    // Préstamos nuevos (uno por línea): calendario francés con carencia de intereses
    const T = (noInv ? [] : p.tramos).map((t) => {
      const n = Math.max(1, Math.round(t.plazo * 12)), car = clamp(Math.round(t.carencia), 0, n - 1), rBase = t.tipo / 100 / 12, amortN = n - car;
      const cuota = t.loan > 0 ? (rBase > 0 ? (t.loan * rBase) / (1 - Math.pow(1 + rBase, -amortN)) : t.loan / amortN) : 0;
      return Object.assign({}, t, { n, car, rBase, cuota, bal: 0, mesesPagados: 0 });
    });
    const L = T.reduce((a, t) => a + t.loan, 0);
    const cuotaFr = T.reduce((a, t) => a + t.cuota, 0);
    const mesAport = T.length ? Math.min(...T.map((t) => t.mes)) : start;
    // Deuda existente
    const rE = 0.045 / 12;
    let balE = e.deudaViva;

    const shockAt = (tipo, m) => shocks.filter((s) => s.tipo === tipo && m >= s.mes && m < s.mes + s.duracion)
      .reduce((a, s) => a + s.magnitud, 0);
    const shockFrom = (tipo, m) => shocks.filter((s) => s.tipo === tipo && m >= s.mes).reduce((a, s) => a + s.magnitud, 0);

    const out = { sales: [], newSales: [], gross: [], staff: [], fixed: [], ebitda: [], tax: [], dwc: [], wc: [],
      cfo: [], debt: [], newDebtPay: [], interestNew: [], cash: [], heads: [], loanBal: [], debtTotal: [], dep: [], capex: [],
      banco: [], poliza: [], liquidez: [], costePoliza: [], fijoMes: [] };

    const wcOf = (sales, cogs, dso) => (sales * 12 * dso) / 365 + (cogs * 12 * e.dio) / 365 - (cogs * 12 * e.dpo) / 365;
    const s0 = (e.ventas / 12) * seas(12) / Math.pow(1 + e.crecimiento / 100, 1 / 12);
    let wcPrev = wcOf(s0, s0 * (1 - mgBase), e.dso);
    let cash = e.caja;
    // Póliza de crédito: se dispone cuando la caja baja del mínimo operativo y se devuelve con los excedentes
    const polLim = Math.max(0, e.polizaLimite || 0);
    let polD = Math.min(polLim, Math.max(0, e.polizaDispuesta || 0));
    const minOp = (e.personal + e.fijos) / 24;
    const hum = state.humano || {};
    let loanBal = 0;
    let ebtYTD = 0, taxPaidYTD = 0;

    for (let m = 1; m <= H; m++) {
      const g = growth(m), sz = seas(m);
      let base = (e.ventas / 12) * g * sz;
      let nw = 0, r = 0;
      if (!noInv) {
        const k = m - (start + delay);
        r = k >= 0 ? clamp((k + 1) / rampa, 0, 1) : 0;
        nw = (e.ventas / 12) * (inv.incVentas / 100) * (mods.ventasF || 1) * p.share * r * g * sz;
      }
      const vs = (shockFrom('cliente', m) + shockAt('ventas', m)) / 100;
      base *= 1 - vs; nw *= 1 - vs;
      const sales = base + nw;
      const mgS = shockAt('margen', m) / 100;
      const gross = base * (mgBase - mgS) + nw * (mgNew - mgS);
      const salInfl = Math.pow(1.025, Math.floor((m - 1) / 12)) * (1 + shockFrom('salarios', m) / 100);
      let heads = e.plantilla;
      let staff = (e.personal / 12) * salInfl;
      if (!noInv) {
        // Las contrataciones siguen el plan: si la venta se retrasa, el coste de personal ya está dentro
        const hireStart = start - inv.anticipo;
        const rPlan = clamp((m - start + 1) / rampa, 0, 1);
        if (m >= hireStart) {
          const nh = inv.contrataciones * p.share * Math.min(1, 0.5 + 0.5 * rPlan);
          heads += nh;
          staff += (nh * inv.salario / 12) * salInfl * (1 + (hum.absentismo || 0) / 100);
        }
      }
      // Coste de selección e incorporación de las nuevas personas (pago único al inicio de la contratación)
      let seleccion = 0;
      if (!noInv && m === Math.max(1, start - inv.anticipo)) seleccion = inv.contrataciones * p.share * (hum.costeSeleccion || 0);
      let fixed = e.fijos / 12 * Math.pow(1.02, Math.floor((m - 1) / 12));
      if (!noInv && m >= start) fixed += (inv.fijosNuevos * p.share) / 12 + p.extraFijos / 12 + p.alquiler;
      const oneOff = shockAt('puntual', m) > 0 ? shocks.filter((s) => s.tipo === 'puntual' && s.mes === m).reduce((a, s) => a + s.magnitud * 1000, 0) : 0;
      const ebitda = gross - staff - fixed - oneOff - seleccion;
      // Coste de la póliza del mes (intereses sobre lo dispuesto + comisión sobre lo no dispuesto)
      const costePol = polD * ((e.polizaTipo || 0) / 100 / 12) + (polLim - polD) * ((e.polizaComision || 0) / 100 / 12);

      // Amortización contable de cada línea desde que entra en servicio
      let dep = 0;
      T.forEach((t) => { if (m >= t.mes) dep += t.dep / (t.vida * 12); });

      // Préstamos nuevos
      let intNew = 0, prinNew = 0, capex = 0, inflow = 0;
      if (!noInv && m === mesAport) inflow += p.aportacion;
      T.forEach((t) => {
        if (m === t.mes) { capex += t.capex; inflow += t.loan; t.bal = t.loan; }
        else if (m > t.mes && t.bal > 0.5) {
          t.mesesPagados++;
          const i = t.bal * (t.tipo + shockFrom('tipos', m)) / 100 / 12;
          let pr = 0;
          if (t.mesesPagados > t.car) pr = Math.min(t.bal, t.cuota - t.bal * t.rBase);
          t.bal -= pr; intNew += i; prinNew += pr;
        }
      });
      loanBal = T.reduce((a, t) => a + t.bal, 0);
      // Deuda existente
      let intE = 0, prinE = 0;
      if (balE > 0.5) {
        intE = balE * rE;
        prinE = Math.min(balE, Math.max(0, e.cuotaDeuda - intE));
        balE -= prinE;
      }

      // Impuesto de sociedades (devengo anual liquidado mes a mes sobre la base acumulada)
      if ((m - 1) % 12 === 0) { ebtYTD = 0; taxPaidYTD = 0; }
      ebtYTD += ebitda - dep - intNew - intE - costePol;
      const taxDue = Math.max(0, ebtYTD) * t;
      const tax = taxDue - taxPaidYTD;
      taxPaidYTD = taxDue;

      // Circulante
      const dso = e.dso + (noInv ? 0 : mods.dsoDelta || 0) * (nw > 0 ? nw / sales : 0) + shockAt('cobro', m);
      const wc = wcOf(sales, sales - gross, dso);
      const dwc = wc - wcPrev;
      wcPrev = wc;

      const cfo = ebitda - tax - dwc;
      const debt = intNew + prinNew + intE + prinE;
      cash += cfo - debt - capex + inflow - costePol;
      if (cash < minOp && polD < polLim) { const d = Math.min(minOp - cash, polLim - polD); polD += d; cash += d; }
      else if (cash > minOp && polD > 0) { const d = Math.min(polD, cash - minOp); polD -= d; cash -= d; }

      out.sales.push(sales); out.newSales.push(nw); out.gross.push(gross); out.staff.push(staff); out.fixed.push(fixed + oneOff);
      out.ebitda.push(ebitda); out.tax.push(tax); out.dwc.push(dwc); out.wc.push(wc); out.cfo.push(cfo - costePol); out.debt.push(debt);
      out.newDebtPay.push(intNew + prinNew); out.interestNew.push(intNew); out.cash.push(cash - polD); out.heads.push(heads);
      out.banco.push(cash); out.poliza.push(polD); out.liquidez.push(cash + polLim - polD); out.costePoliza.push(costePol);
      out.fijoMes.push(staff + fixed + debt);
      out.loanBal.push(loanBal); out.debtTotal.push(loanBal + balE); out.dep.push(dep); out.capex.push(capex - inflow);
    }
    out.params = p;
    out.start = start;
    out.cuotaNueva = cuotaFr;
    out.cuotaCarencia = T.reduce((a, t) => a + t.loan * t.rBase, 0);
    out.tramos = T.map((t) => ({ nombre: t.nombre, mes: t.mes, capex: t.capex, loan: t.loan, cuota: t.cuota, plazo: t.plazo, tipo: t.tipo, carencia: t.carencia, vida: t.vida }));
    out.loan = L;
    out.polLim = polLim;
    out.mods = mods;
    return out;
  };

  /* ---------- Métricas ---------- */
  const sum = (a, i, j) => { let s = 0; for (let k = i; k < j && k < a.length; k++) s += a[k]; return s; };
  A.sum = sum;

  function irr(flows) {
    let lo = -0.99, hi = 1.0;
    const npv = (r) => flows.reduce((a, f, i) => a + f / Math.pow(1 + r, i), 0);
    if (npv(lo) * npv(hi) > 0) return null;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  A.analyze = function (state, mods) {
    const w = A.simulate(state, mods);
    const b = A.simulate(state, mods, { noInv: true });
    const e = state.empresa, inv = state.inversion, sec = A.SECTORS[state.sector], meta = state.meta;
    const p = w.params;
    const start = w.start;
    const iStart = start - 1;

    const ebitdaActual = e.ventas * e.margen / 100 - e.personal - e.fijos;
    const inversion = p.importeTotal;

    // Retorno del proyecto: flujo operativo incremental acumulado frente a la inversión
    // Flujo incremental para quien invierte: en la patrimonial el alquiler se queda en el grupo de los socios;
    // con socio inversor, los socios actuales ponen su parte y reciben su porcentaje
    const inc = w.cfo.map((v, i) => (v - b.cfo[i] + (state.estructura === 'patrimonial' && i >= iStart ? p.alquiler * (1 - e.impuesto / 100) : 0)) * p.ownerShare);
    let acc = 0, payback = null;
    const own = state.estructura === 'socio' ? Math.max(0, inversion - (p.aportacion - (inv.aportacion || 0))) : inversion;
    for (let i = iStart; i < H; i++) {
      acc += inc[i];
      if (acc >= own && payback === null) payback = i - iStart + 1;
    }
    if (payback === null) {
      const avg = sum(inc, H - 12, H) / 12;
      payback = avg > 0 ? H - iStart + (own - acc) / avg : Infinity;
    }

    // Retorno de caja para la propiedad: cuándo la caja con inversión supera a la caja sin ella
    const delta = w.cash.map((v, i) => v - b.cash[i]);
    let lastNeg = -1;
    for (let i = 0; i < H; i++) if (delta[i] < -1) lastNeg = i;
    let paybackCaja;
    if (lastNeg < 0) paybackCaja = 0;
    else if (lastNeg < H - 1) paybackCaja = lastNeg + 1 - iStart + 1;
    else {
      const slope = (delta[H - 1] - delta[H - 13]) / 12;
      paybackCaja = slope > 0 ? H - iStart + -delta[H - 1] / slope : Infinity;
    }

    // VAN y TIR anuales del flujo incremental (5 años + valor residual contable)
    const flows = [-own];
    const lastAvg = sum(inc, H - 12, H) / 12;
    const sumExt = (i, j) => sum(inc, i, Math.min(j, H)) + Math.max(0, j - Math.max(i, H)) * lastAvg; // más allá del horizonte se prolonga el último año
    for (let y = 0; y < 5; y++) flows.push(sumExt(iStart + y * 12, iStart + y * 12 + 12));
    const resid = (p.resid5 != null ? p.resid5 : Math.max(0, p.depreciable * (1 - 5 / inv.vidaUtil))) * p.ownerShare;
    flows[5] += resid + (sum(inc, H - 12, H) * 0.5);
    const wacc = 0.08;
    const van = flows.reduce((a, f, i) => a + f / Math.pow(1 + wacc, i), 0);
    const tir = inversion > 0 ? irr(flows) : null;
    if (!(inversion > 0)) payback = 0;

    // Caja
    let cajaMin = Infinity, mesCajaMin = 0;
    w.cash.forEach((c, i) => { if (c < cajaMin) { cajaMin = c; mesCajaMin = i + 1; } });
    const mesesNegativos = w.cash.filter((c) => c < 0).length;
    const colchon = 2 * (e.personal + e.fijos) / 12;
    // Liquidez disponible = caja en banco + parte libre de la póliza
    let liquidezMin = Infinity, mesLiqMin = 0, cajaMax = -Infinity, mesCajaMax = 0, polizaMax = 0, mesPolMax = 0;
    w.liquidez.forEach((c, i) => { if (c < liquidezMin) { liquidezMin = c; mesLiqMin = i + 1; } });
    w.cash.forEach((c, i) => { if (c > cajaMax) { cajaMax = c; mesCajaMax = i + 1; } });
    w.poliza.forEach((c, i) => { if (c > polizaMax) { polizaMax = c; mesPolMax = i + 1; } });
    const contarPoliza = state.meta.contarPoliza !== false;
    const cajaRef = contarPoliza ? liquidezMin : cajaMin;
    const mesCajaRef = contarPoliza ? mesLiqMin : mesCajaMin;
    // Meses de colchón: cuántos meses de nóminas, fijos y cuotas cubre la liquidez de cada mes
    const colchonSerie = w.fijoMes.map((f, i) => (contarPoliza ? w.liquidez[i] : w.cash[i]) / Math.max(1, f));
    let colMin = Infinity, mesColMin = 0, colMax = -Infinity, mesColMax = 0;
    colchonSerie.forEach((c, i) => { if (c < colMin) { colMin = c; mesColMin = i + 1; } if (c > colMax) { colMax = c; mesColMax = i + 1; } });
    const mesesBajoUno = colchonSerie.filter((c) => c < 1).length;
    const costePolizaTotal = sum(w.costePoliza, 0, H);

    // DSCR por año desde el arranque
    const dscrYears = [];
    for (let y = 0; y < 4; y++) {
      const a = iStart + y * 12, z = a + 12;
      if (z > H) break;
      const ds = sum(w.debt, a, z);
      dscrYears.push(ds > 0 ? (sum(w.ebitda, a, z) - sum(w.tax, a, z)) / ds : 99);
    }
    const dscrMin = dscrYears.length ? Math.min(...dscrYears) : 99;

    // Endeudamiento neto / EBITDA a 12 y 24 meses del arranque
    const dfnAt = (i) => {
      i = clamp(i, 11, H - 1);
      const eb = sum(w.ebitda, i - 11, i + 1);
      return eb > 0 ? (w.debtTotal[i] - w.cash[i]) / eb : 99;
    };
    const deudaEbitda = Math.max(dfnAt(iStart + 12), dfnAt(iStart + 24));
    const deudaEbitdaPre = ebitdaActual > 0 ? (e.deudaViva - e.caja) / ebitdaActual : 99;

    // Año de crucero: 12 meses una vez completada la rampa
    const cruise0 = clamp(start + Math.max(0, w.mods.retraso || 0) + Math.ceil(inv.rampa * p.rampaF), 1, H - 11) - 1;
    const yr = (arr) => sum(arr, cruise0, cruise0 + 12);
    const yb = (arr) => sum(arr, 0, 12);
    const ventasCrucero = yr(w.sales);
    // División segura: con ventas o plantilla a cero los ratios valen 0 en lugar de NaN
    const dv = (a, b) => (b && isFinite(b) && isFinite(a) ? a / b : 0);
    const tamano = {
      antes: {
        ventas: yb(b.sales), margen: dv(yb(b.gross), yb(b.sales)) * 100, ebitda: yb(b.ebitda),
        ebitdaPct: dv(yb(b.ebitda), yb(b.sales)) * 100, plantilla: e.plantilla,
        pesoSalarial: dv(yb(b.staff), yb(b.sales)) * 100, ventasEmpleado: dv(yb(b.sales), e.plantilla),
        equilibrio: dv(yb(b.staff) + yb(b.fixed), dv(yb(b.gross), yb(b.sales)))
      },
      despues: {
        ventas: ventasCrucero, margen: dv(yr(w.gross), ventasCrucero) * 100, ebitda: yr(w.ebitda),
        ebitdaPct: dv(yr(w.ebitda), ventasCrucero) * 100, plantilla: w.heads[cruise0 + 11],
        pesoSalarial: dv(yr(w.staff), ventasCrucero) * 100, ventasEmpleado: dv(ventasCrucero, w.heads[cruise0 + 11]),
        equilibrio: dv(yr(w.staff) + yr(w.fixed), dv(yr(w.gross), ventasCrucero))
      },
      mesCrucero: cruise0 + 1
    };

    // Presión de circulante adicional
    let wcPeak = 0;
    w.wc.forEach((v, i) => { wcPeak = Math.max(wcPeak, v - b.wc[i]); });

    // Peso de la cuota
    const cuotaTotal = w.cuotaNueva + e.cuotaDeuda;
    const ebitdaMesCrucero = yr(w.ebitda) / 12;
    const cuotaSobreEbitda = ebitdaMesCrucero > 0 ? cuotaTotal / ebitdaMesCrucero * 100 : 999;

    const dim = {
      inversion,
      sobreVentas: e.ventas > 0 ? inversion / e.ventas : 99,
      sobreEbitda: ebitdaActual > 0 ? inversion / ebitdaActual : 99,
      sobreFondos: inversion / Math.max(1, e.fondosPropios),
      sobreCaja: inversion / Math.max(1, e.caja)
    };
    dim.clase = dim.sobreVentas < 0.15 ? 'Táctica' : dim.sobreVentas < 0.4 ? 'Relevante' : dim.sobreVentas < 0.8 ? 'Estratégica' : 'Transformacional';

    const res = {
      w, b, p, start, dim, payback, paybackCaja, van, tir, flows, cajaMin, mesCajaMin, mesesNegativos, colchon,
      cajaFinal: w.cash[H - 1], cajaFinalSin: b.cash[H - 1], dscrYears, dscrMin, deudaEbitda, deudaEbitdaPre,
      liquidezMin, mesLiqMin, cajaMax, mesCajaMax, polizaMax, mesPolMax, polLim: w.polLim, cajaRef, mesCajaRef, contarPoliza,
      colchonSerie, colMin, mesColMin, colMax, mesColMax, mesesBajoUno, costePolizaTotal,
      tamano, wcPeak, cuotaNueva: w.cuotaNueva, cuotaCarencia: w.cuotaCarencia, cuotaTotal, cuotaSobreEbitda,
      ebitdaActual, loan: w.loan, ownOutlay: p.capexOperativa - w.loan - p.aportacion
    };
    res.humano = A.humanReadiness(state, res);
    res.lights = A.lights(state, res);
    res.verdict = A.verdict(res.lights);
    res.metas = A.checkTargets(state, res);
    return res;
  };

  /* ---------- Sistema operativo humano ----------
   * Nueve dimensiones. Cada una explica qué mide, por qué importa al crecer y su referencia sana.
   */
  A.HUMAN_VARS = [
    { p: 'humano.mandos', l: 'Mandos intermedios', min: 0, max: 60, step: 1, u: 'pers.', d: 'Personas que dirigen equipos y deciden sin consultar al fundador. Un responsable sostiene bien entre 7 y 14 personas según el sector.' },
    { p: 'humano.mandosFormados', l: 'Mandos formados en gestión', min: 0, max: 100, step: 5, u: '%', d: 'Parte de los mandos con formación en dirección de personas. Un buen técnico ascendido sin formación suele convertirse en cuello de botella.' },
    { p: 'humano.dependencia', l: 'Dependencia del fundador', min: 0, max: 100, step: 5, u: '/100', d: '0: la organización decide sola. 100: todo pasa por una persona. Por encima de 60, la agenda del fundador marca la velocidad de crecimiento.' },
    { p: 'humano.procesos', l: 'Procesos documentados', min: 0, max: 100, step: 5, u: '%', d: 'Parte de los procesos críticos escritos y transmisibles. Por debajo del 50 %, cada incorporación depende de quién le enseñe.' },
    { p: 'humano.rotacion', l: 'Rotación anual', min: 0, max: 60, step: 1, u: '%', d: 'Personas que se van al año sobre la plantilla. Por encima del 15 %, el conocimiento se escapa más rápido de lo que se documenta.' },
    { p: 'humano.clima', l: 'Clima laboral (eNPS)', min: -100, max: 100, step: 5, u: 'pts', d: 'Recomendarían trabajar aquí: % promotores menos % detractores. Positivo es sano; negativo anticipa rotación.' },
    { p: 'humano.tiempoContratacion', l: 'Meses para contratar', min: 0, max: 12, step: 1, u: 'meses', d: 'Tiempo medio desde que abres un proceso hasta que la persona se incorpora.' },
    { p: 'humano.costeSeleccion', l: 'Coste de selección por persona', min: 0, max: 20000, step: 250, u: '€', d: 'Anuncios, consultora, horas de entrevista y alta. Se paga una vez al incorporar y entra en la caja.' },
    { p: 'humano.curva', l: 'Meses hasta productividad plena', min: 0, max: 18, step: 1, u: 'meses', d: 'Tiempo que tarda una persona nueva en rendir al 100 %. Si es más largo que la rampa comercial, frena la rampa.' },
    { p: 'humano.formacion', l: 'Formación anual por persona', min: 0, max: 80, step: 2, u: 'horas', d: 'Horas de formación al año. Menos de 20 horas suele indicar que se aprende solo por imitación.' },
    { p: 'humano.sucesion', l: 'Puestos clave con sustituto', min: 0, max: 100, step: 5, u: '%', d: 'Parte de los puestos críticos con una segunda persona capaz de cubrirlos. Por debajo del 50 %, una baja larga para la operación.' },
    { p: 'humano.polivalencia', l: 'Polivalencia', min: 0, max: 100, step: 5, u: '%', d: 'Parte de la plantilla capaz de hacer al menos dos puestos. Amortigua picos y ausencias sin contratar.' },
    { p: 'humano.absentismo', l: 'Absentismo', min: 0, max: 20, step: 0.5, u: '%', d: 'Horas pagadas no trabajadas. Encarece cada contratación nueva en la misma proporción.' },
    { p: 'humano.horasExtra', l: 'Horas extra sobre jornada', min: 0, max: 30, step: 1, u: '%', d: 'Señal de saturación. Por encima del 8 %, el equipo actual no tiene holgura para absorber más trabajo ni para formar a los nuevos.' }
  ];

  A.humanReadiness = function (state, res) {
    const e = state.empresa, inv = state.inversion, sec = A.SECTORS[state.sector];
    const h = Object.assign({ mandosFormados: 50, clima: 10, costeSeleccion: 3000, curva: 4, formacion: 16, sucesion: 40, polivalencia: 30, absentismo: 4, horasExtra: 5 }, state.humano);
    const nuevas = Math.round(inv.contrataciones * (res ? res.p.share : 1));
    const total = e.plantilla + nuevas;
    const mandosNecesarios = Math.ceil(total / sec.span);
    const gapMandos = Math.max(0, mandosNecesarios - h.mandos);
    const crec = nuevas / Math.max(1, e.plantilla);
    const start = res ? res.start : inv.mesInicio;
    const hireStart = start - inv.anticipo;
    const mesReclutar = hireStart - h.tiempoContratacion;
    const rampa = inv.rampa;
    const C = (v) => clamp(v, 0, 100);
    const dims = [
      { key: 'mando', corto: 'Mando', nombre: 'Estructura de mando', vars: ['humano.mandos', 'humano.mandosFormados'],
        score: C(100 - gapMandos * 28 - Math.max(0, 50 - h.mandosFormados) * 0.6),
        lectura: (gapMandos ? `Con ${total} personas y ${sec.span} por responsable necesitas ${mandosNecesarios} mandos; tienes ${h.mandos}. ` : `${h.mandos} mandos cubren ${total} personas. `) + `${h.mandosFormados} % formados en gestión.` },
      { key: 'absorcion', corto: 'Absorción', nombre: 'Capacidad de absorción', vars: ['inversion.contrataciones', 'humano.horasExtra'],
        score: C(100 - Math.max(0, crec - 0.12) * 220 - Math.max(0, h.horasExtra - 8) * 4),
        lectura: `La plantilla crece un ${Math.round(crec * 100)} % con un equipo que hoy hace un ${h.horasExtra} % de horas extra. Quien está saturado no puede formar a quien llega.` },
      { key: 'fundador', corto: 'Fundador', nombre: 'Independencia del fundador', vars: ['humano.dependencia'],
        score: C(100 - h.dependencia),
        lectura: h.dependencia > 60 ? 'Las decisiones pasan por una sola persona: será el cuello de botella del crecimiento.' : 'Hay delegación real: el crecimiento no depende de una agenda.' },
      { key: 'procesos', corto: 'Procesos', nombre: 'Procesos documentados', vars: ['humano.procesos'],
        score: C(h.procesos * 1.15),
        lectura: h.procesos < 50 ? 'Gran parte del «cómo se hace» vive en la cabeza de las personas. Los nuevos tardarán más en rendir.' : 'Los procesos están escritos: la incorporación es replicable.' },
      { key: 'estabilidad', corto: 'Estabilidad', nombre: 'Estabilidad y clima', vars: ['humano.rotacion', 'humano.clima'],
        score: C(100 - Math.max(0, h.rotacion - 6) * 4 + Math.min(0, h.clima) * 0.4),
        lectura: `Rotación del ${h.rotacion} % y eNPS de ${h.clima}. Cada salida en plena rampa reinicia una curva de aprendizaje.` },
      { key: 'reclutamiento', corto: 'Reclutamiento', nombre: 'Tiempo de reclutamiento', vars: ['humano.tiempoContratacion', 'inversion.anticipo'],
        score: mesReclutar >= 1 ? 100 : C(100 + (mesReclutar - 1) * 25),
        lectura: mesReclutar >= 1 ? `Debes abrir los procesos de selección en el mes ${mesReclutar}.` : `Para tener a la gente en el mes ${hireStart} tendrías que haber empezado hace ${1 - mesReclutar} meses.` },
      { key: 'aprendizaje', corto: 'Aprendizaje', nombre: 'Aprendizaje y formación', vars: ['humano.curva', 'humano.formacion'],
        score: C(100 - Math.max(0, h.curva - rampa) * 10 - Math.max(0, 20 - h.formacion) * 2),
        lectura: h.curva > rampa ? `Las personas nuevas tardan ${h.curva} meses en rendir y la rampa comercial es de ${rampa}: la rampa real se alarga.` : `La curva de aprendizaje (${h.curva} meses) cabe dentro de la rampa.` },
      { key: 'sucesion', corto: 'Sucesión', nombre: 'Sucesión y polivalencia', vars: ['humano.sucesion', 'humano.polivalencia'],
        score: C(h.sucesion * 0.65 + h.polivalencia * 0.55),
        lectura: `${h.sucesion} % de puestos clave con sustituto y ${h.polivalencia} % de polivalencia. Una baja larga en un puesto sin sustituto para la operación.` },
      { key: 'carga', corto: 'Carga', nombre: 'Carga y absentismo', vars: ['humano.absentismo', 'humano.horasExtra'],
        score: C(100 - Math.max(0, h.absentismo - 3) * 7 - Math.max(0, h.horasExtra - 5) * 4),
        lectura: `Absentismo del ${h.absentismo} %: cada contratación cuesta un ${h.absentismo} % más. ${h.horasExtra > 8 ? 'El equipo está saturado.' : 'Hay holgura razonable.'}` }
    ];
    const weights = { mando: 0.16, absorcion: 0.12, fundador: 0.14, procesos: 0.13, estabilidad: 0.09, reclutamiento: 0.1, aprendizaje: 0.1, sucesion: 0.09, carga: 0.07 };
    const score = dims.reduce((a, d) => a + d.score * weights[d.key], 0);
    const acciones = [];
    if (gapMandos) acciones.push({ que: `Incorporar o promocionar ${gapMandos} mando${gapMandos > 1 ? 's' : ''} intermedio${gapMandos > 1 ? 's' : ''}`, cuando: Math.max(1, hireStart - 3), coste: gapMandos * inv.salario * 1.35 });
    if (h.mandosFormados < 50) acciones.push({ que: 'Programa de formación en dirección de equipos para los mandos', cuando: 1, coste: h.mandos * 1800 });
    if (h.dependencia > 60) acciones.push({ que: 'Mapa de decisiones: qué decide quién, con qué límites de importe', cuando: 1, coste: 0 });
    if (h.procesos < 50) acciones.push({ que: `Documentar los procesos críticos hasta el 60 % (hoy ${h.procesos} %)`, cuando: 1, coste: 12000 });
    if (crec > 0.3) acciones.push({ que: 'Plan de acogida de 30-60-90 días con tutor asignado', cuando: Math.max(1, hireStart - 1), coste: 4000 });
    if (h.rotacion > 15 || h.clima < 0) acciones.push({ que: 'Plan de retención de perfiles clave antes del arranque', cuando: 1, coste: 15000 });
    if (h.sucesion < 50) acciones.push({ que: 'Nombrar y formar sustitutos para los puestos críticos', cuando: 2, coste: 6000 });
    if (h.horasExtra > 8) acciones.push({ que: 'Reducir horas extra antes de crecer: contratar el primer refuerzo antes del arranque', cuando: Math.max(1, hireStart - 2), coste: inv.salario / 4 });
    if (h.curva > rampa) acciones.push({ que: `Acortar la curva de aprendizaje de ${h.curva} a ${rampa} meses con manuales y formación en puesto`, cuando: Math.max(1, hireStart - 1), coste: 5000 });
    if (mesReclutar < 1) acciones.push({ que: `Abrir ya la selección o retrasar el arranque ${1 - mesReclutar} meses`, cuando: 1, coste: 0 });
    else acciones.push({ que: `Abrir selección de ${nuevas} perfiles`, cuando: mesReclutar, coste: nuevas * h.costeSeleccion });
    const costePreparacion = acciones.reduce((a, x) => a + x.coste, 0);
    return { score, dims, acciones, total, nuevas, mandosNecesarios, gapMandos, crec, mesReclutar, hireStart, costePreparacion, h };
  };

  /* ---------- Semáforos ----------
   * Cada indicador define su valor, su sentido (mejor alto o bajo), los umbrales de verde y ámbar,
   * y las variables con las que se corrige: directas (lo mueven al instante) e indirectas (lo mueven a través de otra magnitud).
   */
  const V = (path, nombre) => ({ path, nombre });
  A.LIGHT_DEFS = [
    { key: 'liquidez', nombre: 'Liquidez', better: 1,
      value: (r) => r.cajaRef, fmt: (v) => A.fmt.eur(v),
      ok: (s, r) => Math.max(s.meta.cajaMin, r.colchon), warn: () => 0,
      que: 'El punto más bajo de dinero disponible en los próximos 60 meses (caja más póliza libre si así lo has elegido).',
      lectura: (r) => r.cajaRef < 0 ? `En el mes ${r.mesCajaRef} faltarían ${A.fmt.eur(-r.cajaRef)}: la inversión rompe la tesorería si no se refuerza la financiación.` : `El punto más bajo llega en el mes ${r.mesCajaRef}, con ${A.fmt.num(Math.max(0, r.colMin))} meses de colchón.`,
      directas: [V('empresa.caja', 'Caja disponible'), V('empresa.polizaLimite', 'Límite de la póliza'), V('inversion.pctFin', 'Parte financiada'), V('inversion.aportacion', 'Aportación de socios'), V('inversion.carencia', 'Carencia'), V('inversion.plazo', 'Plazo del préstamo')],
      indirectas: [V('empresa.dso', 'Días de cobro'), V('empresa.dio', 'Días de stock'), V('empresa.dpo', 'Días de pago'), V('inversion.incVentas', 'Venta nueva (más venta inmoviliza más circulante)'), V('inversion.anticipo', 'Anticipo de contratación'), V('inversion.importe', 'Importe de la inversión')],
      consejo: 'Primero alarga plazo y carencia o amplía la póliza (no cuesta margen). Si no basta, cobra antes y paga más tarde. Solo después recorta o fasea la inversión.' },
    { key: 'cobertura', nombre: 'Cobertura de deuda', better: 1,
      value: (r) => r.dscrMin, fmt: (v) => A.fmt.x(v),
      ok: (s) => s.meta.dscrMin, warn: () => 1,
      que: 'Cuántas veces lo que genera el negocio paga las cuotas de todos los préstamos en el peor año.',
      lectura: (r) => r.dscrMin < 1 ? 'En algún año el negocio no genera lo suficiente para pagar las cuotas: habría que tirar de caja o de póliza.' : 'El negocio genera lo suficiente para pagar las cuotas.',
      directas: [V('inversion.plazo', 'Plazo del préstamo'), V('inversion.carencia', 'Carencia'), V('inversion.tipo', 'Tipo de interés'), V('inversion.pctFin', 'Parte financiada')],
      indirectas: [V('inversion.margenNuevo', 'Margen de la actividad nueva'), V('inversion.incVentas', 'Venta nueva'), V('inversion.fijosNuevos', 'Fijos nuevos'), V('inversion.contrataciones', 'Contrataciones')],
      consejo: 'Un plazo más largo baja la cuota de inmediato. Mejorar margen o contener fijos sube lo que genera el negocio.' },
    { key: 'endeudamiento', nombre: 'Endeudamiento', better: -1,
      value: (r) => r.deudaEbitda, fmt: (v) => A.fmt.x(v) + ' EBITDA',
      ok: (s) => s.meta.deudaEbitdaMax, warn: (s) => s.meta.deudaEbitdaMax + 1,
      que: 'Años de beneficio operativo que harían falta para devolver toda la deuda neta.',
      lectura: (r) => `La deuda neta equivale a ${A.fmt.x(r.deudaEbitda)} el EBITDA en los dos primeros años tras invertir.`,
      directas: [V('inversion.pctFin', 'Parte financiada'), V('inversion.aportacion', 'Aportación de socios'), V('inversion.importe', 'Importe de la inversión'), V('empresa.deudaViva', 'Deuda actual')],
      indirectas: [V('inversion.margenNuevo', 'Margen nuevo'), V('inversion.incVentas', 'Venta nueva'), V('empresa.personal', 'Coste de personal')],
      consejo: 'Menos deuda (más aportación o inversión por fases) o más EBITDA. Cuidado: bajar la deuda suele castigar la liquidez.' },
    { key: 'retorno', nombre: 'Retorno', better: -1,
      value: (r) => Math.min(r.payback, 600), fmt: (v) => A.fmt.months(v),
      ok: (s) => s.meta.paybackMax * 12, warn: (s) => s.inversion.vidaUtil * 12,
      que: 'Tiempo que tarda el flujo que genera la inversión en devolver lo invertido.',
      lectura: (r, s) => r.payback > s.inversion.vidaUtil * 12 ? 'No se recupera dentro de la vida útil del activo: el proyecto destruye valor.' : `Se recupera en ${A.fmt.months(r.payback)}.`,
      directas: [V('inversion.importe', 'Importe'), V('inversion.incVentas', 'Venta nueva'), V('inversion.margenNuevo', 'Margen nuevo'), V('inversion.fijosNuevos', 'Fijos nuevos'), V('inversion.contrataciones', 'Contrataciones')],
      indirectas: [V('inversion.rampa', 'Meses de rampa'), V('empresa.dso', 'Días de cobro'), V('inversion.salario', 'Coste por persona')],
      consejo: 'La financiación no acorta el retorno: solo lo hacen más margen, más venta, menos coste o menos inversión.' },
    { key: 'rentabilidad', nombre: 'Rentabilidad', better: 1,
      value: (r) => (r.tir === null ? -1 : r.tir * 100), fmt: (v) => (v <= -1 ? 'TIR n/d' : 'TIR ' + A.fmt.pct(v)),
      ok: (s) => s.inversion.tipo + 4, warn: () => 8,
      que: 'Rentabilidad anual del proyecto (TIR) comparada con lo que cuesta el dinero.',
      lectura: (r, s) => `Verde exige superar el tipo del préstamo más 4 puntos (${A.fmt.pct(s.inversion.tipo + 4)}); por debajo del 8 % el proyecto no cubre el coste de oportunidad.`,
      directas: [V('inversion.margenNuevo', 'Margen nuevo'), V('inversion.incVentas', 'Venta nueva'), V('inversion.importe', 'Importe')],
      indirectas: [V('inversion.rampa', 'Meses de rampa'), V('inversion.vidaUtil', 'Vida útil'), V('inversion.fijosNuevos', 'Fijos nuevos')],
      consejo: 'Revisa el precio y el mix de la actividad nueva antes que la financiación.' },
    { key: 'dimension', nombre: 'Dimensión', better: -1,
      value: (r) => r.dim.sobreEbitda, fmt: (v) => A.fmt.x(v) + ' EBITDA',
      ok: () => 4, warn: () => 7,
      que: 'Cuántos años de beneficio operativo actual cuesta la inversión.',
      lectura: (r) => `Inversión ${r.dim.clase.toLowerCase()}: ${A.fmt.pct(r.dim.sobreVentas * 100)} de la venta actual.`,
      directas: [V('inversion.importe', 'Importe de la inversión')],
      indirectas: [V('empresa.personal', 'Coste de personal (sube el EBITDA si baja)'), V('empresa.margen', 'Margen actual'), V('empresa.fijos', 'Otros gastos fijos')],
      consejo: 'Si la dimensión está en rojo, divide la inversión en fases que se paguen unas con otras.' },
    { key: 'circulante', nombre: 'Circulante', better: -1,
      value: (r) => r.wcPeak, fmt: (v) => A.fmt.eur(v),
      ok: (s, r) => 0.5 * Math.max(1, s.empresa.caja + (r.polLim || 0)), warn: (s, r) => Math.max(1, s.empresa.caja + (r.polLim || 0)),
      que: 'Dinero extra que se queda atrapado en clientes y almacén por vender más.',
      lectura: (r) => `En el pico, el crecimiento inmoviliza ${A.fmt.eur(r.wcPeak)} en clientes y stock.`,
      directas: [V('empresa.dso', 'Días de cobro'), V('empresa.dio', 'Días de stock'), V('empresa.dpo', 'Días de pago')],
      indirectas: [V('inversion.incVentas', 'Venta nueva'), V('inversion.rampa', 'Meses de rampa'), V('inversion.margenNuevo', 'Margen nuevo')],
      consejo: 'Cada 10 días menos de cobro libera aproximadamente la venta de 10 días. Es la palanca más barata.' },
    { key: 'salarial', nombre: 'Peso salarial', better: -1,
      value: (r) => r.tamano.despues.pesoSalarial, fmt: (v) => A.fmt.pct(v),
      ok: (s) => s.meta.pesoSalarialMax, warn: (s) => s.meta.pesoSalarialMax + 4,
      que: 'Coste de personal sobre ventas en el año de crucero.',
      lectura: (r, s) => `Referencia del sector: ${A.SECTORS[s.sector].pesoSalarialMax} %.`,
      directas: [V('inversion.contrataciones', 'Contrataciones'), V('inversion.salario', 'Coste por persona'), V('empresa.personal', 'Coste de personal actual')],
      indirectas: [V('inversion.incVentas', 'Venta nueva'), V('humano.absentismo', 'Absentismo'), V('humano.curva', 'Curva de aprendizaje')],
      consejo: 'Contrata al ritmo de la venta real, no del plan, y mide ventas por persona cada trimestre.' },
    { key: 'margen', nombre: 'Margen bruto', better: 1,
      value: (r) => r.tamano.despues.margen - r.tamano.antes.margen, fmt: (v) => (v >= 0 ? '+' : '') + A.fmt.pp(v),
      ok: () => -1, warn: () => -4,
      que: 'Cuánto cambia el margen bruto total al sumar la actividad nueva.',
      lectura: (r) => `Margen en crucero ${A.fmt.pct(r.tamano.despues.margen)} frente a ${A.fmt.pct(r.tamano.antes.margen)} hoy.`,
      directas: [V('inversion.margenNuevo', 'Margen de la actividad nueva'), V('empresa.margen', 'Margen actual')],
      indirectas: [V('inversion.incVentas', 'Peso de la venta nueva en el total')],
      consejo: 'Crecer con menos margen solo compensa si la venta adicional cubre de sobra los fijos nuevos.' },
    { key: 'humano', nombre: 'Sistema humano', better: 1,
      value: (r) => r.humano.score, fmt: (v) => Math.round(v) + '/100',
      ok: () => 70, warn: () => 50,
      que: 'Preparación de la organización para sostener el nuevo tamaño.',
      lectura: (r) => r.humano.dims.slice().sort((a, b) => a.score - b.score).slice(0, 2).map((d) => `${d.nombre}: ${Math.round(d.score)}`).join(' · ') + ' son los puntos débiles.',
      directas: [V('humano.mandos', 'Mandos intermedios'), V('humano.procesos', 'Procesos documentados'), V('humano.dependencia', 'Dependencia del fundador'), V('humano.sucesion', 'Puestos clave con sustituto')],
      indirectas: [V('inversion.contrataciones', 'Contrataciones'), V('inversion.anticipo', 'Anticipo de contratación'), V('humano.rotacion', 'Rotación'), V('humano.formacion', 'Horas de formación')],
      consejo: 'Nombra responsables antes del arranque y escribe los procesos críticos: son baratos y decisivos.' }
  ];
  A.lightState = (def, v, s, r) => {
    const ok = def.ok(s, r), wr = def.warn(s, r);
    if (def.better > 0) return v >= ok ? 'ok' : v >= wr ? 'warn' : 'stop';
    return v <= ok ? 'ok' : v <= wr ? 'warn' : 'stop';
  };
  /* Texto de la horquilla de cada color */
  A.lightRanges = (def, s, r) => {
    const ok = def.ok(s, r), wr = def.warn(s, r), f = def.fmt;
    if (def.better > 0) return { ok: `≥ ${f(ok)}`, warn: `de ${f(wr)} a ${f(ok)}`, stop: `< ${f(wr)}` };
    return { ok: `≤ ${f(ok)}`, warn: `de ${f(ok)} a ${f(wr)}`, stop: `> ${f(wr)}` };
  };
  A.lights = function (state, r) {
    return A.LIGHT_DEFS.map((d) => {
      const v = d.value(r, state);
      return { key: d.key, nombre: d.nombre, estado: A.lightState(d, v, state, r), valor: d.fmt(v), v, lectura: d.lectura(r, state), rangos: A.lightRanges(d, state, r), def: d };
    });
  };

  A.verdict = function (lights) {
    const stops = lights.filter((l) => l.estado === 'stop').length;
    const warns = lights.filter((l) => l.estado === 'warn').length;
    const liq = lights.find((l) => l.key === 'liquidez').estado;
    if (liq === 'stop' || stops >= 3) return { key: 'stop', titulo: 'Rediseñar antes de mover', texto: 'La estructura actual no soporta el movimiento tal como está planteado.' };
    if (stops >= 1 || warns >= 4) return { key: 'warn', titulo: 'Avanzar con condiciones', texto: 'El movimiento es viable si se corrigen antes los puntos en rojo y ámbar.' };
    if (warns >= 1) return { key: 'go', titulo: 'Avanzar vigilando', texto: 'La empresa puede afrontarlo desde su rentabilidad; hay que vigilar los ámbar.' };
    return { key: 'go', titulo: 'Avanzar', texto: 'La empresa puede afrontar la inversión sin romper liquidez.' };
  };

  /* ---------- Metas ---------- */
  A.checkTargets = function (state, r) {
    const m = state.meta;
    return [
      { key: 'cajaMin', nombre: r.contarPoliza ? 'Liquidez mínima' : 'Caja mínima', objetivo: m.cajaMin, valor: r.cajaRef, ok: r.cajaRef >= m.cajaMin, gap: (m.cajaMin - r.cajaRef) / Math.max(50000, Math.abs(m.cajaMin)), f: A.fmt.eur },
      { key: 'payback', nombre: 'Recuperación', objetivo: m.paybackMax * 12, valor: r.payback, ok: r.payback <= m.paybackMax * 12, gap: (Math.min(r.payback, 240) - m.paybackMax * 12) / (m.paybackMax * 12), f: A.fmt.months },
      { key: 'dscr', nombre: 'Cobertura deuda', objetivo: m.dscrMin, valor: r.dscrMin, ok: r.dscrMin >= m.dscrMin, gap: (m.dscrMin - r.dscrMin) / m.dscrMin, f: A.fmt.x },
      { key: 'deuda', nombre: 'Deuda / EBITDA', objetivo: m.deudaEbitdaMax, valor: r.deudaEbitda, ok: r.deudaEbitda <= m.deudaEbitdaMax, gap: (Math.min(r.deudaEbitda, 20) - m.deudaEbitdaMax) / m.deudaEbitdaMax, f: A.fmt.x },
      { key: 'salarial', nombre: 'Peso salarial', objetivo: m.pesoSalarialMax, valor: r.tamano.despues.pesoSalarial, ok: r.tamano.despues.pesoSalarial <= m.pesoSalarialMax, gap: (r.tamano.despues.pesoSalarial - m.pesoSalarialMax) / m.pesoSalarialMax, f: A.fmt.pct }
    ];
  };
  const shortfall = (metas) => metas.reduce((a, t) => a + (t.ok ? 0 : Math.max(0.0001, t.gap)), 0);

  /* ---------- Riesgos y sensibilidad ---------- */
  A.SENSITIVITIES = [
    { key: 'ventas', nombre: 'Venta nueva ±20 %', lo: { ventasF: -0.2 }, hi: { ventasF: 0.2 } },
    { key: 'retraso', nombre: 'Rampa ±3 meses', lo: { retraso: 3 }, hi: { retraso: -2 } },
    { key: 'margen', nombre: 'Margen nuevo ±3 pp', lo: { margenDelta: -3 }, hi: { margenDelta: 3 } },
    { key: 'cobro', nombre: 'Cobro ±20 días', lo: { dsoDelta: 20 }, hi: { dsoDelta: -20 } },
    { key: 'sobrecoste', nombre: 'Sobrecoste +15 / −5 %', lo: { sobrecoste: 15 }, hi: { sobrecoste: -5 } },
    { key: 'tipos', nombre: 'Tipo de interés ±2 pp', lo: { tipoDelta: 2 }, hi: { tipoDelta: -2 } }
  ];

  A.sensitivity = function (state, mods, metric) {
    metric = metric || 'cajaRef';
    const baseR = A.analyze(state, mods);
    const pick = (r) => r[metric];
    const apply = (d) => {
      const m = Object.assign({}, mods);
      Object.keys(d).forEach((k) => { m[k] = (m[k] || 0) + d[k]; });
      if (d.ventasF !== undefined) m.ventasF = (mods.ventasF || 1) * (1 + d.ventasF);
      return m;
    };
    return {
      base: pick(baseR),
      rows: A.SENSITIVITIES.map((s) => ({ key: s.key, nombre: s.nombre, lo: pick(A.analyze(state, apply(s.lo))), hi: pick(A.analyze(state, apply(s.hi))) }))
        .sort((a, b) => Math.abs(b.hi - b.lo) - Math.abs(a.hi - a.lo))
    };
  };

  A.risks = function (state, res, sens) {
    const ref = Math.max(res.colchon, state.meta.cajaMin, 50000);
    const impactOf = (drop) => clamp(Math.ceil((drop / ref) * 4), 1, 5);
    const byKey = Object.fromEntries(sens.rows.map((r) => [r.key, r]));
    const inv = state.inversion, h = state.humano, e = state.empresa;
    const R = [
      { key: 'ventas', nombre: 'La venta nueva no llega', prob: clamp(Math.round(1 + inv.incVentas / 25), 1, 5), impacto: impactOf(sens.base - byKey.ventas.lo),
        mitigacion: 'Precomprometer clientes ancla o pedidos marco antes de firmar la inversión.' },
      { key: 'retraso', nombre: 'Retraso en la puesta en marcha', prob: clamp(Math.round(1 + inv.rampa / 4), 1, 5), impacto: impactOf(sens.base - byKey.retraso.lo),
        mitigacion: 'Penalizaciones al proveedor por retraso y carencia del préstamo alineada con la rampa.' },
      { key: 'margen', nombre: 'Erosión de margen', prob: clamp(Math.round(2 + (e.margen - inv.margenNuevo) / 4), 1, 5), impacto: impactOf(sens.base - byKey.margen.lo),
        mitigacion: 'Cláusulas de revisión de precio y cierre de compras de materia prima a plazo.' },
      { key: 'cobro', nombre: 'Tensión de cobros', prob: clamp(Math.round(e.dso / 30), 1, 5), impacto: impactOf(sens.base - byKey.cobro.lo),
        mitigacion: 'Línea de factoring o confirming preparada antes de la rampa; política de crédito por cliente.' },
      { key: 'sobrecoste', nombre: 'Sobrecoste de la inversión', prob: 3, impacto: impactOf(sens.base - byKey.sobrecoste.lo),
        mitigacion: 'Presupuesto cerrado llave en mano y partida de contingencia del 10 %.' },
      { key: 'tipos', nombre: 'Subida de tipos', prob: 2, impacto: impactOf(sens.base - byKey.tipos.lo),
        mitigacion: 'Tipo fijo o cobertura (swap/cap) sobre al menos el 60 % del préstamo.' },
      { key: 'mando', nombre: 'Falta de capacidad de gestión', prob: clamp(Math.round(1 + res.humano.gapMandos * 1.5 + (h.dependencia > 60 ? 1 : 0)), 1, 5), impacto: clamp(Math.round(2 + res.humano.crec * 4), 1, 5),
        mitigacion: 'Nombrar responsables de la nueva actividad antes del arranque, con objetivos y autonomía de gasto.' },
      { key: 'talento', nombre: 'Fuga de personas clave', prob: clamp(Math.round(h.rotacion / 6), 1, 5), impacto: clamp(Math.round(1 + (100 - h.procesos) / 30), 1, 5),
        mitigacion: 'Pactos de permanencia y documentación del conocimiento crítico.' }
    ];
    R.forEach((r) => { r.nivel = r.prob * r.impacto; r.estado = r.nivel >= 15 ? 'stop' : r.nivel >= 8 ? 'warn' : 'ok'; });
    return R.sort((a, b) => b.nivel - a.nivel);
  };

  /* ---------- Estructuras: misma meta, distintos tiempos ---------- */
  A.compareStructures = function (state, mods) {
    return Object.keys(A.STRUCTURES).map((k) => {
      const s = clone(state);
      s.estructura = k;
      const r = A.analyze(s, mods);
      const st = A.STRUCTURES[k];
      const mesPleno = r.tamano.mesCrucero;
      const enPlazo = mesPleno <= state.meta.plazoObjetivo;
      const metasOk = r.metas.filter((t) => t.ok).length;
      // Encaje: de 0 a 100, la suma de seis criterios con su peso máximo
      const desglose = [
        { n: 'Liquidez', d: 'mantiene la caja por encima de tu meta (25), solo por encima de cero (12) o se queda sin ella (0)', v: r.cajaRef >= state.meta.cajaMin ? 25 : r.cajaRef >= 0 ? 12 : 0, max: 25 },
        { n: 'Plazo', d: `llega al tamaño pleno antes del mes ${state.meta.plazoObjetivo} (20) o después (8)`, v: enPlazo ? 20 : 8, max: 20 },
        { n: 'Control', d: 'parte del negocio nuevo que sigue en manos de los socios actuales', v: st.control * 0.15, max: 15 },
        { n: 'Aislamiento del riesgo', d: 'cuánto protege a la empresa actual si lo nuevo sale mal', v: st.aislamiento * 0.15, max: 15 },
        { n: 'Sencillez', d: 'menos sociedades, trámites y costes de gestión', v: (100 - st.complejidad) * 0.1, max: 10 },
        { n: 'Metas cumplidas', d: 'cada una de tus cinco metas que cumple suma 3', v: metasOk * 3, max: 15 }
      ];
      const score = clamp(desglose.reduce((a, x) => a + x.v, 0), 0, 100);
      return { key: k, ...st, r, mesPleno, enPlazo, metasOk, score, desglose };
    }).sort((a, b) => b.score - a.score);
  };

  /* Qué significa cada vehículo para esta empresa, con sus cifras */
  A.STRUCT_GLOSA = {
    encaje: 'Puntuación de 0 a 100 de lo bien que encaja el vehículo con tus objetivos: liquidez (hasta 25), plazo (20), control (15), aislamiento del riesgo (15), sencillez (10) y metas cumplidas (15). Por encima de 70 encaja bien; entre 50 y 70, con matices; por debajo de 50, no conviene. La estrella marca el de mejor encaje.',
    control: 'Parte del negocio nuevo, y de las decisiones sobre él, que sigue en manos de los socios actuales. 100 % es que decides tú solo; 65 % es que entra un socio con el 35 %; 50 % es que lo compartes a medias.',
    pleno: 'Mes en que lo nuevo llega al 100 % de la venta prevista: el arranque, más el tiempo de montar el vehículo (notaría, registro, negociación con el socio) y la rampa comercial. No es el mes en que se recupera la inversión.',
    metas: 'Cuántas de tus cinco metas (liquidez mínima, recuperación, cobertura de la deuda, deuda sobre EBITDA y peso salarial) cumple este vehículo en el escenario activo. Las fijas en «Meta y plan».',
    marcha: 'Tiempo orientativo para tener el vehículo funcionando: constituir sociedades, escrituras, registro y financiación.'
  };
  A.structCaso = function (state, s) {
    const F = A.fmt, r = s.r, p = r.p, inv = state.inversion;
    const L = A.lineasActivas(state), que = L.length ? L.map((l) => l.nombre.toLowerCase()).join(', ') : 'el activo';
    const cuota = r.cuotaNueva, pl = (y) => String(y).replace('.', ',');
    switch (s.key) {
      case 'directa': return `Tu empresa compra ${que} por ${F.eur(p.capexOperativa)}, pide ${F.eur(r.loan)} al banco a ${pl(inv.plazo)} años (cuota de ${F.eur(cuota)} al mes tras ${inv.carencia} meses de carencia) y pone ${F.eur(Math.max(0, p.capexOperativa - r.loan - p.aportacion))} de su caja.`;
      case 'leasing': return `Una entidad compra ${que} y te lo cede: no pagas entrada, pagas ${F.eur(cuota)} al mes durante ${pl(Math.min(inv.plazo, 7))} años desde el primer mes. Al final puedes quedártelo por el valor residual. Cuesta algo más que un préstamo, pero no consume caja de entrada.`;
      case 'filial': return `Creáis una sociedad filial, 100 % de tu empresa, que compra ${que} por ${F.eur(p.capexOperativa)} y pide ${F.eur(r.loan)} de préstamo. Si lo nuevo sale mal, el golpe se queda en la filial; a cambio, son unos ${F.eur(p.extraFijos)} al año más de gestión y conviene pactar bien las garantías que pida el banco.`;
      case 'patrimonial': return `Una sociedad patrimonial de los socios compra ${que} por ${F.eur(inv.importe)} (con su propio préstamo o con aportaciones de los socios) y se lo alquila a tu empresa por unos ${F.eur(p.alquiler)} al mes (un 7,5 % anual del valor). Tu empresa no compra ni se endeuda: solo paga el alquiler, que es gasto. El activo queda fuera del riesgo del negocio.`;
      case 'socio': return `Un inversor aporta la mitad de la inversión (${F.eur(inv.importe * 0.5)}) a cambio del 35 % del negocio nuevo. Necesitas menos deuda y menos caja, pero repartes beneficio y decisiones: los socios actuales conservan el 65 %.`;
      case 'jv': return `Un socio del sector pone la mitad (${F.eur(inv.importe * 0.5)}) y compartís al 50 % ventas, beneficios y decisiones. Aporta clientes y oficio, por eso la rampa es más corta; a cambio, solo te quedas con la mitad de lo nuevo.`;
      default: return '';
    }
  };

  /* ---------- Plan de corrección (búsqueda de palancas) ---------- */
  A.LEVERS = [
    { key: 'polizaLimite', step: 10000, path: ['empresa', 'polizaLimite'], nombre: 'Contratar o ampliar la póliza de crédito', esfuerzo: 1, max: (s) => Math.max(150000, Math.round((s.empresa.polizaLimite || 0) * 2)), unidad: '€', resp: 'Dirección financiera', soloPoliza: true },
    { key: 'pctFin', step: 1, path: ['inversion', 'pctFin'], nombre: 'Financiar más parte de la inversión', esfuerzo: 1, max: (s) => 90, unidad: '%', resp: 'Dirección financiera' },
    { key: 'plazo', step: 0.5, path: ['inversion', 'plazo'], nombre: 'Alargar el plazo del préstamo', esfuerzo: 1, max: (s) => 12, unidad: 'años', resp: 'Dirección financiera' },
    { key: 'carencia', step: 1, path: ['inversion', 'carencia'], nombre: 'Negociar carencia alineada con la rampa', esfuerzo: 1, max: (s) => 24, unidad: 'meses', resp: 'Dirección financiera' },
    { key: 'dso', step: 1, path: ['empresa', 'dso'], nombre: 'Reducir el plazo de cobro', esfuerzo: 2, max: (s) => Math.max(0, Math.round(s.empresa.dso * 0.6)), unidad: 'días', resp: 'Administración y comercial' },
    { key: 'dpo', step: 1, path: ['empresa', 'dpo'], nombre: 'Alargar el plazo de pago a proveedores', esfuerzo: 2, max: (s) => s.empresa.dpo + 30, unidad: 'días', resp: 'Compras' },
    { key: 'anticipo', step: 1, path: ['inversion', 'anticipo'], nombre: 'Escalonar las contrataciones', esfuerzo: 2, max: (s) => -2, unidad: 'meses de anticipo', resp: 'Personas' },
    { key: 'fijosNuevos', step: 1000, path: ['inversion', 'fijosNuevos'], nombre: 'Recortar los fijos nuevos', esfuerzo: 2, max: (s) => Math.round(s.inversion.fijosNuevos * 0.5), unidad: '€/año', resp: 'Dirección general' },
    { key: 'margenNuevo', step: 0.5, path: ['inversion', 'margenNuevo'], nombre: 'Mejorar margen (precio y compras)', esfuerzo: 3, max: (s) => s.inversion.margenNuevo + 5, unidad: '%', resp: 'Comercial y compras' },
    { key: 'importe', step: 10000, path: ['inversion', 'importe'], nombre: 'Fasear la inversión por tramos', esfuerzo: 3, max: (s) => Math.round(s.inversion.importe * 0.65), unidad: '€', resp: 'Dirección general' },
    { key: 'aportacion', step: 10000, path: ['inversion', 'aportacion'], nombre: 'Aportación de capital de los socios', esfuerzo: 4, max: (s) => Math.round(s.inversion.importe * 0.4), unidad: '€', resp: 'Propiedad' }
  ];
  const roundStep = (v, st) => Math.round(v / st) * st;
  const getP = (s, path) => s[path[0]][path[1]];
  const setP = (s, path, v) => { s[path[0]][path[1]] = v; };

  A.correctionPlan = function (state, mods) {
    const r0 = A.analyze(state, mods);
    const failing = r0.metas.filter((t) => !t.ok);
    if (!failing.length) return { ok: true, acciones: [], antes: r0, despues: r0, alcanzado: true, individuales: [] };

    // Primero: ¿qué metas son alcanzables moviendo todas las palancas a la vez?
    const tope = clone(state);
    A.LEVERS.forEach((lv) => { if (!(lv.soloPoliza && state.meta.contarPoliza === false)) setP(tope, lv.path, lv.max(state)); });
    const rTope = A.analyze(tope, mods);
    const inalcanzables = rTope.metas.filter((t) => !t.ok).map((t) => t.key);
    const cuenta = (metas) => metas.filter((t) => inalcanzables.indexOf(t.key) < 0);
    const evalS = (s) => { const r = A.analyze(s, mods); const ms = cuenta(r.metas); return { r, sf: shortfall(ms), ok: ms.every((t) => t.ok) }; };
    const STEPS = 12;
    const valuesFor = (s, lv) => {
      const a = getP(s, lv.path), b = lv.max(state);
      const arr = [];
      for (let i = 1; i <= STEPS; i++) arr.push(a + (b - a) * (i / STEPS));
      return arr.map((v) => roundStep(v, lv.step));
    };

    // Cada palanca por separado: ¿basta sola?
    const individuales = A.LEVERS.filter((lv) => !(lv.soloPoliza && state.meta.contarPoliza === false)).map((lv) => {
      const cur = getP(state, lv.path);
      if (Math.abs(lv.max(state) - cur) < 1e-6) return null;
      let best = null;
      for (const v of valuesFor(state, lv)) {
        const s = clone(state); setP(s, lv.path, v);
        const ev = evalS(s);
        if (!best || ev.sf < best.sf) best = { v, sf: ev.sf };
        if (ev.ok) return { lv, desde: cur, hasta: v, basta: true };
      }
      return { lv, desde: cur, hasta: best.v, basta: false, mejora: shortfall(cuenta(r0.metas)) - best.sf };
    }).filter(Boolean);

    // Plan combinado: en cada ronda se elige la palanca con más mejora por unidad de esfuerzo
    let s = clone(state);
    let cur = evalS(s);
    const usadas = [];
    const libres = A.LEVERS.filter((lv) => !(lv.soloPoliza && state.meta.contarPoliza === false)).filter((lv) => Math.abs(lv.max(state) - getP(state, lv.path)) > 1e-6);
    for (let ronda = 0; ronda < A.LEVERS.length && !cur.ok; ronda++) {
      let best = null;
      for (const lv of libres) {
        if (usadas.some((u) => u.lv === lv)) continue;
        let cand = null;
        for (const v of valuesFor(s, lv)) {
          const t = clone(s); setP(t, lv.path, v);
          const ev = evalS(t);
          if (ev.ok) { cand = { v, ev }; break; }
          if (!cand || ev.sf < cand.ev.sf - 1e-6) cand = { v, ev };
        }
        if (!cand) continue;
        const gain = cur.sf - cand.ev.sf;
        if (gain < Math.max(0.01, cur.sf * 0.03)) continue; // mejoras marginales no justifican una acción
        const score = (gain * (cand.ev.ok ? 1.25 : 1)) / lv.esfuerzo;
        if (!best || score > best.score) best = { lv, v: cand.v, ev: cand.ev, score };
      }
      if (!best) break;
      const from = getP(s, best.lv.path);
      setP(s, best.lv.path, best.v);
      usadas.push({ lv: best.lv, desde: from, hasta: best.v, antes: cur.r, despues: best.ev.r });
      cur = best.ev;
    }
    usadas.sort((a, b) => a.lv.esfuerzo - b.lv.esfuerzo);
    // Repaso inverso: devolver cada palanca al mínimo que mantiene lo conseguido
    {
      const target = cur.sf;
      for (let i = usadas.length - 1; i >= 0; i--) {
        const u = usadas[i];
        const vals = [];
        for (let k = 0; k <= STEPS; k++) vals.push(u.desde + (u.hasta - u.desde) * (k / STEPS));
        for (const v0 of vals) {
          const v = roundStep(v0, u.lv.step);
          const t = clone(s); setP(t, u.lv.path, v);
          const ev = evalS(t);
          if (ev.ok === cur.ok && ev.sf <= target + 1e-4) { setP(s, u.lv.path, v); u.hasta = v; cur = ev; break; }
        }
      }
      usadas.forEach((u, i) => { if (Math.abs(u.hasta - u.desde) < 1e-6) u.drop = true; });
    }
    const acciones = usadas.filter((u) => !u.drop);
    // Impacto incremental recalculado en orden
    let acc = clone(state), prev = r0;
    acciones.forEach((u) => { setP(acc, u.lv.path, u.hasta); const r = A.analyze(acc, mods); u.antes = prev; u.despues = r; prev = r; });
    const inalc = r0.metas.filter((t) => inalcanzables.indexOf(t.key) >= 0);
    return { ok: false, alcanzado: cur.ok && !inalc.length, parcial: cur.ok && inalc.length > 0, inalcanzables: inalc, acciones, antes: r0, despues: cur.r, estadoFinal: s, individuales, failing };
  };

  /* ---------- Superficie 3D ---------- */
  A.AXES = {
    incVentas: { nombre: 'Venta nueva', path: ['inversion', 'incVentas'], min: 5, max: 100, unidad: '%' },
    margenNuevo: { nombre: 'Margen nuevo', path: ['inversion', 'margenNuevo'], min: (s) => Math.max(5, s.inversion.margenNuevo - 15), max: (s) => Math.min(90, s.inversion.margenNuevo + 15), unidad: '%' },
    pctFin: { nombre: 'Parte financiada', path: ['inversion', 'pctFin'], min: 0, max: 100, unidad: '%' },
    plazo: { nombre: 'Plazo del préstamo', path: ['inversion', 'plazo'], min: 2, max: 12, unidad: 'años' },
    rampa: { nombre: 'Meses de rampa', path: ['inversion', 'rampa'], min: 2, max: 24, unidad: 'meses' },
    dso: { nombre: 'Días de cobro', path: ['empresa', 'dso'], min: 0, max: 150, unidad: 'días' },
    importe: { nombre: 'Inversión', path: ['inversion', 'importe'], min: (s) => s.inversion.importe * 0.3, max: (s) => s.inversion.importe * 1.8, unidad: '€' },
    contrataciones: { nombre: 'Contrataciones', path: ['inversion', 'contrataciones'], min: 0, max: (s) => Math.max(10, s.inversion.contrataciones * 2.5), unidad: 'pers.' }
  };
  A.METRICS = {
    cajaMin: { nombre: 'Liquidez mínima', f: (r) => r.cajaRef, fmt: (v) => A.fmt.eur(v), better: 1, threshold: (s) => s.meta.cajaMin, warn: () => 0 },
    payback: { nombre: 'Recuperación (meses)', f: (r) => Math.min(r.payback, 180), fmt: (v) => A.fmt.months(v), better: -1, threshold: (s) => s.meta.paybackMax * 12, warn: (s) => s.inversion.vidaUtil * 12 },
    dscrMin: { nombre: 'Cobertura de deuda', f: (r) => Math.min(r.dscrMin, 6), fmt: (v) => A.fmt.x(v), better: 1, threshold: (s) => s.meta.dscrMin, warn: () => 1 },
    van: { nombre: 'VAN del proyecto', f: (r) => r.van, fmt: (v) => A.fmt.eur(v), better: 1, threshold: (s) => s.inversion.importe * 0.1, warn: () => 0 }
  };
  A.axisRange = (s, ax) => {
    const a = A.AXES[ax];
    const mn = typeof a.min === 'function' ? a.min(s) : a.min;
    const mx = typeof a.max === 'function' ? a.max(s) : a.max;
    return [mn, mx];
  };
  A.surface = function (state, mods, ax, ay, metric, N) {
    N = N || 22;
    const [x0, x1] = A.axisRange(state, ax), [y0, y1] = A.axisRange(state, ay);
    const M = A.METRICS[metric];
    const grid = [];
    let mn = Infinity, mx = -Infinity;
    for (let j = 0; j < N; j++) {
      const row = [];
      for (let i = 0; i < N; i++) {
        const s = clone(state);
        const xv = x0 + (x1 - x0) * (i / (N - 1));
        const yv = y0 + (y1 - y0) * (j / (N - 1));
        setP(s, A.AXES[ax].path, xv);
        setP(s, A.AXES[ay].path, yv);
        const r = A.analyze(s, mods);
        const v = M.f(r);
        mn = Math.min(mn, v); mx = Math.max(mx, v);
        row.push({ x: xv, y: yv, v, estado: r.verdict.key, cajaMin: r.cajaRef, payback: r.payback, dscr: r.dscrMin });
      }
      grid.push(row);
    }
    return { grid, N, x0, x1, y0, y1, mn, mx, ax, ay, metric,
      cx: getP(state, A.AXES[ax].path), cy: getP(state, A.AXES[ay].path) };
  };

  /* ---------- Formato ---------- */
  const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  A.fmt = {
    eur: (v) => {
      if (!isFinite(v)) return '—';
      const a = Math.abs(v), sg = v < 0 ? '−' : '';
      if (a >= 1e6) return sg + nf1.format(a / 1e6) + ' M€';
      if (a >= 1e4) return sg + nf0.format(a / 1e3) + ' k€';
      return sg + nf0.format(a) + ' €';
    },
    eurFull: (v) => (isFinite(v) ? nf0.format(Math.round(v)) + ' €' : '—'),
    pct: (v) => (isFinite(v) ? nf1.format(v) + ' %' : '—'),
    pp: (v) => (isFinite(v) ? nf1.format(v) + ' pp' : '—'),
    x: (v) => (!isFinite(v) || v >= 99 ? '—' : nf1.format(v) + '×'),
    num: (v) => (isFinite(v) ? nf0.format(v) : '—'),
    months: (v) => {
      if (!isFinite(v) || v > 600) return 'No recupera';
      const m = Math.round(v);
      if (m < 24) return m + ' meses';
      return nf1.format(m / 12) + ' años';
    }
  };
})();
