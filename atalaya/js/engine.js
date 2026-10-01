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

  function structureParams(state, mods) {
    const inv = state.inversion;
    const st = state.estructura;
    const importeTotal = inv.importe * (1 + (mods.sobrecoste || 0) / 100);
    const p = {
      importeTotal, share: 1, setup: A.STRUCTURES[st].setup, rampaF: 1,
      pctFin: inv.pctFin / 100, tipo: inv.tipo + (mods.tipoDelta || 0), plazo: inv.plazo, carencia: inv.carencia,
      aportacion: inv.aportacion || 0, alquiler: 0, extraFijos: 0, depreciable: importeTotal, ownerShare: 1,
      depositoInicial: 0
    };
    if (st === 'leasing') {
      p.pctFin = 1; p.tipo += 1.5; p.plazo = Math.min(inv.plazo, 7); p.carencia = 0;
    } else if (st === 'filial') {
      p.extraFijos = 18000; p.pctFin = Math.max(0, p.pctFin - 0.1);
    } else if (st === 'patrimonial') {
      p.alquiler = (importeTotal * 0.075) / 12; p.pctFin = 0; p.depreciable = 0; p.extraFijos = 6000;
      p.ownCapex = 0;
    } else if (st === 'socio') {
      p.aportacion += importeTotal * 0.5; p.pctFin = Math.min(p.pctFin, 0.5); p.ownerShare = 0.65; p.extraFijos = 12000;
    } else if (st === 'jv') {
      p.share = 0.5; p.rampaF = 0.7; p.extraFijos = 15000; p.importeTotal = importeTotal * 0.5; p.depreciable = p.importeTotal;
    }
    if (st === 'patrimonial') p.capexOperativa = 0; else p.capexOperativa = p.importeTotal;
    p.loan = st === 'patrimonial' ? 0 : p.capexOperativa * p.pctFin;
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
    const rampa = Math.max(1, inv.rampa * p.rampaF);
    const mgBase = e.margen / 100;
    const mgNew = (inv.margenNuevo + (mods.margenDelta || 0)) / 100;
    const t = e.impuesto / 100;
    const amp = sec.estacionalidad, pico = sec.pico;
    const seas = (m) => 1 + amp * Math.cos((2 * Math.PI * (((m - 1) % 12) + 1 - pico)) / 12);
    const growth = (m) => Math.pow(1 + e.crecimiento / 100, (m - 1) / 12);

    // Préstamo nuevo: calendario francés con carencia de intereses
    const L = noInv ? 0 : p.loan;
    const n = Math.max(1, Math.round(p.plazo * 12));
    const car = clamp(Math.round(p.carencia), 0, n - 1);
    const rBase = p.tipo / 100 / 12;
    const amortN = n - car;
    const cuotaFr = L > 0 ? (rBase > 0 ? (L * rBase) / (1 - Math.pow(1 + rBase, -amortN)) : L / amortN) : 0;
    // Deuda existente
    const rE = 0.045 / 12;
    let balE = e.deudaViva;

    const shockAt = (tipo, m) => shocks.filter((s) => s.tipo === tipo && m >= s.mes && m < s.mes + s.duracion)
      .reduce((a, s) => a + s.magnitud, 0);
    const shockFrom = (tipo, m) => shocks.filter((s) => s.tipo === tipo && m >= s.mes).reduce((a, s) => a + s.magnitud, 0);

    const out = { sales: [], newSales: [], gross: [], staff: [], fixed: [], ebitda: [], tax: [], dwc: [], wc: [],
      cfo: [], debt: [], newDebtPay: [], interestNew: [], cash: [], heads: [], loanBal: [], debtTotal: [], dep: [], capex: [] };

    const wcOf = (sales, cogs, dso) => (sales * 12 * dso) / 365 + (cogs * 12 * e.dio) / 365 - (cogs * 12 * e.dpo) / 365;
    const s0 = (e.ventas / 12) * seas(12) / Math.pow(1 + e.crecimiento / 100, 1 / 12);
    let wcPrev = wcOf(s0, s0 * (1 - mgBase), e.dso);
    let cash = e.caja;
    let loanBal = 0;
    let loanMonth = 0;
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
        const hireStart = start + delay - inv.anticipo;
        if (m >= hireStart) {
          const nh = inv.contrataciones * p.share * Math.min(1, 0.5 + 0.5 * r);
          heads += nh;
          staff += (nh * inv.salario / 12) * salInfl;
        }
      }
      let fixed = e.fijos / 12 * Math.pow(1.02, Math.floor((m - 1) / 12));
      if (!noInv && m >= start) fixed += (inv.fijosNuevos * p.share) / 12 + p.extraFijos / 12 + p.alquiler;
      const oneOff = shockAt('puntual', m) > 0 ? shocks.filter((s) => s.tipo === 'puntual' && s.mes === m).reduce((a, s) => a + s.magnitud * 1000, 0) : 0;
      const ebitda = gross - staff - fixed - oneOff;

      // Amortización contable
      const dep = !noInv && m >= start ? p.depreciable / (inv.vidaUtil * 12) : 0;

      // Préstamo nuevo
      let intNew = 0, prinNew = 0, capex = 0, inflow = 0;
      if (!noInv && m === start) {
        capex = p.capexOperativa;
        inflow = L + p.aportacion;
        loanBal = L;
      }
      if (!noInv && m > start && loanBal > 0.5) {
        loanMonth++;
        const rm = (p.tipo + shockFrom('tipos', m)) / 100 / 12;
        intNew = loanBal * rm;
        if (loanMonth > car) {
          prinNew = Math.min(loanBal, cuotaFr - loanBal * rBase);
        }
        loanBal -= prinNew;
      }
      // Deuda existente
      let intE = 0, prinE = 0;
      if (balE > 0.5) {
        intE = balE * rE;
        prinE = Math.min(balE, Math.max(0, e.cuotaDeuda - intE));
        balE -= prinE;
      }

      // Impuesto de sociedades (devengo anual liquidado mes a mes sobre la base acumulada)
      if ((m - 1) % 12 === 0) { ebtYTD = 0; taxPaidYTD = 0; }
      ebtYTD += ebitda - dep - intNew - intE;
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
      cash += cfo - debt - capex + inflow;

      out.sales.push(sales); out.newSales.push(nw); out.gross.push(gross); out.staff.push(staff); out.fixed.push(fixed + oneOff);
      out.ebitda.push(ebitda); out.tax.push(tax); out.dwc.push(dwc); out.wc.push(wc); out.cfo.push(cfo); out.debt.push(debt);
      out.newDebtPay.push(intNew + prinNew); out.interestNew.push(intNew); out.cash.push(cash); out.heads.push(heads);
      out.loanBal.push(loanBal); out.debtTotal.push(loanBal + balE); out.dep.push(dep); out.capex.push(capex - inflow);
    }
    out.params = p;
    out.start = start;
    out.cuotaNueva = cuotaFr;
    out.cuotaCarencia = L * rBase;
    out.loan = L;
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
    const inc = w.cfo.map((v, i) => (v - b.cfo[i]) * p.ownerShare - (i === iStart ? 0 : 0));
    const incAlquiler = 0;
    let acc = 0, payback = null;
    const own = state.estructura === 'patrimonial' ? inversion : inversion; // la patrimonial la pagan los socios
    for (let i = iStart; i < H; i++) {
      acc += inc[i] - incAlquiler;
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
    const flows = [-inversion * p.ownerShare];
    for (let y = 0; y < 5; y++) flows.push(sum(inc, iStart + y * 12, iStart + y * 12 + 12));
    const resid = Math.max(0, p.depreciable * (1 - 5 / inv.vidaUtil)) * p.ownerShare;
    flows[5] += resid + (sum(inc, H - 12, H) * 0.5);
    const wacc = 0.08;
    const van = flows.reduce((a, f, i) => a + f / Math.pow(1 + wacc, i), 0);
    const tir = irr(flows);

    // Caja
    let cajaMin = Infinity, mesCajaMin = 0;
    w.cash.forEach((c, i) => { if (c < cajaMin) { cajaMin = c; mesCajaMin = i + 1; } });
    const mesesNegativos = w.cash.filter((c) => c < 0).length;
    const colchon = 2 * (e.personal + e.fijos) / 12;

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
    const tamano = {
      antes: {
        ventas: yb(b.sales), margen: yb(b.gross) / yb(b.sales) * 100, ebitda: yb(b.ebitda),
        ebitdaPct: yb(b.ebitda) / yb(b.sales) * 100, plantilla: e.plantilla,
        pesoSalarial: yb(b.staff) / yb(b.sales) * 100, ventasEmpleado: yb(b.sales) / e.plantilla,
        equilibrio: (yb(b.staff) + yb(b.fixed)) / (yb(b.gross) / yb(b.sales))
      },
      despues: {
        ventas: ventasCrucero, margen: yr(w.gross) / ventasCrucero * 100, ebitda: yr(w.ebitda),
        ebitdaPct: yr(w.ebitda) / ventasCrucero * 100, plantilla: w.heads[cruise0 + 11],
        pesoSalarial: yr(w.staff) / ventasCrucero * 100, ventasEmpleado: ventasCrucero / w.heads[cruise0 + 11],
        equilibrio: (yr(w.staff) + yr(w.fixed)) / (yr(w.gross) / ventasCrucero)
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
      sobreVentas: inversion / e.ventas,
      sobreEbitda: ebitdaActual > 0 ? inversion / ebitdaActual : 99,
      sobreFondos: inversion / Math.max(1, e.fondosPropios),
      sobreCaja: inversion / Math.max(1, e.caja)
    };
    dim.clase = dim.sobreVentas < 0.15 ? 'Táctica' : dim.sobreVentas < 0.4 ? 'Relevante' : dim.sobreVentas < 0.8 ? 'Estratégica' : 'Transformacional';

    const res = {
      w, b, p, start, dim, payback, paybackCaja, van, tir, flows, cajaMin, mesCajaMin, mesesNegativos, colchon,
      cajaFinal: w.cash[H - 1], cajaFinalSin: b.cash[H - 1], dscrYears, dscrMin, deudaEbitda, deudaEbitdaPre,
      tamano, wcPeak, cuotaNueva: w.cuotaNueva, cuotaCarencia: w.cuotaCarencia, cuotaTotal, cuotaSobreEbitda,
      ebitdaActual, loan: w.loan, ownOutlay: p.capexOperativa - w.loan - p.aportacion
    };
    res.humano = A.humanReadiness(state, res);
    res.lights = A.lights(state, res);
    res.verdict = A.verdict(res.lights);
    res.metas = A.checkTargets(state, res);
    return res;
  };

  /* ---------- Sistema operativo humano ---------- */
  A.humanReadiness = function (state, res) {
    const e = state.empresa, inv = state.inversion, h = state.humano, sec = A.SECTORS[state.sector];
    const nuevas = Math.round(inv.contrataciones * (res ? res.p.share : 1));
    const total = e.plantilla + nuevas;
    const mandosNecesarios = Math.ceil(total / sec.span);
    const gapMandos = Math.max(0, mandosNecesarios - h.mandos);
    const crec = nuevas / Math.max(1, e.plantilla);
    const start = res ? res.start : inv.mesInicio;
    const hireStart = start - inv.anticipo;
    const mesReclutar = hireStart - h.tiempoContratacion;
    const dims = [
      { key: 'mando', corto: 'Mando', nombre: 'Estructura de mando', score: clamp(100 - gapMandos * 28, 0, 100),
        lectura: gapMandos ? `Con ${total} personas y una amplitud razonable de ${sec.span} por responsable necesitas ${mandosNecesarios} mandos; tienes ${h.mandos}.` : `${h.mandos} mandos cubren ${total} personas con holgura.` },
      { key: 'absorcion', corto: 'Absorción', nombre: 'Capacidad de absorción', score: clamp(100 - Math.max(0, crec - 0.12) * 220, 0, 100),
        lectura: `La plantilla crece un ${Math.round(crec * 100)} %. Por encima del 30 % la cultura y la calidad se resienten si no hay acogida estructurada.` },
      { key: 'fundador', corto: 'Fundador', nombre: 'Independencia del fundador', score: clamp(100 - h.dependencia, 0, 100),
        lectura: h.dependencia > 60 ? 'Las decisiones pasan por una sola persona: será el cuello de botella del crecimiento.' : 'Hay delegación real; el crecimiento no depende de una agenda.' },
      { key: 'procesos', corto: 'Procesos', nombre: 'Procesos documentados', score: clamp(h.procesos, 0, 100),
        lectura: h.procesos < 50 ? 'Gran parte del cómo se hace vive en la cabeza de las personas. Los nuevos tardarán más en rendir.' : 'Los procesos están escritos: la incorporación es replicable.' },
      { key: 'rotacion', corto: 'Estabilidad', nombre: 'Estabilidad del equipo', score: clamp(100 - Math.max(0, h.rotacion - 6) * 4, 0, 100),
        lectura: `Rotación anual del ${h.rotacion} %. Cada salida en plena rampa retrasa la curva de aprendizaje.` },
      { key: 'reclutamiento', corto: 'Reclutamiento', nombre: 'Tiempo de reclutamiento', score: mesReclutar >= 1 ? 100 : clamp(100 + (mesReclutar - 1) * 25, 0, 100),
        lectura: mesReclutar >= 1 ? `Debes abrir los procesos de selección en el mes ${mesReclutar}.` : `Para tener a la gente en el mes ${hireStart} tendrías que haber empezado a reclutar hace ${1 - mesReclutar} meses.` }
    ];
    const weights = { mando: 0.22, absorcion: 0.16, fundador: 0.2, procesos: 0.18, rotacion: 0.1, reclutamiento: 0.14 };
    const score = dims.reduce((a, d) => a + d.score * weights[d.key], 0);
    const acciones = [];
    if (gapMandos) acciones.push({ que: `Incorporar o promocionar ${gapMandos} mando${gapMandos > 1 ? 's' : ''} intermedio${gapMandos > 1 ? 's' : ''}`, cuando: Math.max(1, hireStart - 3), coste: gapMandos * inv.salario * 1.35 });
    if (h.dependencia > 60) acciones.push({ que: 'Mapa de decisiones: qué decide quién, con qué límites de importe', cuando: 1, coste: 0 });
    if (h.procesos < 50) acciones.push({ que: `Documentar los procesos críticos hasta el 60 % (hoy ${h.procesos} %)`, cuando: 1, coste: 12000 });
    if (crec > 0.3) acciones.push({ que: 'Plan de acogida de 30-60-90 días con tutor asignado', cuando: Math.max(1, hireStart - 1), coste: 4000 });
    if (h.rotacion > 15) acciones.push({ que: 'Plan de retención de perfiles clave antes del arranque', cuando: 1, coste: 15000 });
    if (mesReclutar < 1) acciones.push({ que: `Abrir ya la selección o retrasar el arranque ${1 - mesReclutar} meses`, cuando: 1, coste: 0 });
    else acciones.push({ que: `Abrir selección de ${nuevas} perfiles`, cuando: mesReclutar, coste: nuevas * 2500 });
    return { score, dims, acciones, total, nuevas, mandosNecesarios, gapMandos, crec, mesReclutar, hireStart };
  };

  /* ---------- Semáforos ---------- */
  A.lights = function (state, r) {
    const meta = state.meta, sec = A.SECTORS[state.sector], inv = state.inversion;
    const L = [];
    const add = (key, nombre, estado, valor, lectura) => L.push({ key, nombre, estado, valor, lectura });
    const fmt = A.fmt;
    add('liquidez', 'Liquidez', r.cajaMin >= Math.max(meta.cajaMin, r.colchon) ? 'ok' : r.cajaMin >= 0 ? 'warn' : 'stop',
      fmt.eur(r.cajaMin), r.cajaMin < 0 ? `La caja entra en negativo en el mes ${r.mesCajaMin}: sin financiación adicional, la inversión rompe la tesorería.` : `El punto más bajo de caja llega en el mes ${r.mesCajaMin}.`);
    add('cobertura', 'Cobertura de deuda', r.dscrMin >= meta.dscrMin ? 'ok' : r.dscrMin >= 1 ? 'warn' : 'stop',
      `DSCR ${fmt.x(r.dscrMin)}`, r.dscrMin < 1 ? 'El negocio no genera suficiente para pagar la deuda en al menos un año.' : 'El flujo operativo cubre el servicio de la deuda.');
    add('endeudamiento', 'Endeudamiento', r.deudaEbitda <= meta.deudaEbitdaMax ? 'ok' : r.deudaEbitda <= meta.deudaEbitdaMax + 1 ? 'warn' : 'stop',
      `${fmt.x(r.deudaEbitda)} EBITDA`, 'Deuda financiera neta sobre EBITDA en los dos primeros años tras el arranque.');
    add('retorno', 'Retorno', r.payback <= meta.paybackMax * 12 ? 'ok' : r.payback <= inv.vidaUtil * 12 ? 'warn' : 'stop',
      fmt.months(r.payback), r.payback > inv.vidaUtil * 12 ? 'La inversión no se recupera dentro de su vida útil.' : 'Meses para recuperar la inversión con el flujo operativo que genera.');
    add('rentabilidad', 'Rentabilidad', r.tir !== null && r.tir > (inv.tipo / 100) + 0.04 ? 'ok' : r.van > 0 ? 'warn' : 'stop',
      r.tir === null ? 'TIR n/d' : `TIR ${fmt.pct(r.tir * 100)}`, 'Compara la rentabilidad del proyecto con el coste de la deuda más una prima de riesgo.');
    add('dimension', 'Dimensión', r.dim.sobreVentas < 0.4 && r.dim.sobreEbitda < 4 ? 'ok' : r.dim.sobreVentas < 0.8 && r.dim.sobreEbitda < 7 ? 'warn' : 'stop',
      `${fmt.x(r.dim.sobreEbitda)} EBITDA`, `Inversión ${r.dim.clase.toLowerCase()}: ${fmt.pct(r.dim.sobreVentas * 100)} de la venta actual.`);
    add('circulante', 'Circulante', r.wcPeak < 0.5 * Math.max(1, state.empresa.caja) ? 'ok' : r.wcPeak < state.empresa.caja ? 'warn' : 'stop',
      fmt.eur(r.wcPeak), 'Caja extra que se queda atrapada en clientes y stock por vender más.');
    const ps = r.tamano.despues.pesoSalarial;
    add('salarial', 'Peso salarial', ps <= meta.pesoSalarialMax ? 'ok' : ps <= meta.pesoSalarialMax + 4 ? 'warn' : 'stop',
      fmt.pct(ps), `Personal sobre ventas en el año de crucero. Referencia del sector: ${sec.pesoSalarialMax} %.`);
    const dm = r.tamano.despues.margen - r.tamano.antes.margen;
    add('margen', 'Margen bruto', dm >= -1 ? 'ok' : dm >= -4 ? 'warn' : 'stop',
      fmt.pct(r.tamano.despues.margen), dm < 0 ? `Baja ${fmt.pp(-dm)} respecto a hoy: el crecimiento diluye margen.` : 'El crecimiento no diluye el margen.');
    add('humano', 'Sistema humano', r.humano.score >= 70 ? 'ok' : r.humano.score >= 50 ? 'warn' : 'stop',
      `${Math.round(r.humano.score)}/100`, 'Preparación de la organización para absorber el nuevo tamaño.');
    return L;
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
      { key: 'cajaMin', nombre: 'Caja mínima', objetivo: m.cajaMin, valor: r.cajaMin, ok: r.cajaMin >= m.cajaMin, gap: (m.cajaMin - r.cajaMin) / Math.max(50000, Math.abs(m.cajaMin)), f: A.fmt.eur },
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
    metric = metric || 'cajaMin';
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
      const score = clamp(
        (r.cajaMin >= state.meta.cajaMin ? 25 : r.cajaMin >= 0 ? 12 : 0) +
        (enPlazo ? 20 : 8) + st.control * 0.15 + st.aislamiento * 0.15 + (100 - st.complejidad) * 0.1 +
        metasOk * 3, 0, 100);
      return { key: k, ...st, r, mesPleno, enPlazo, metasOk, score };
    }).sort((a, b) => b.score - a.score);
  };

  /* ---------- Plan de corrección (búsqueda de palancas) ---------- */
  A.LEVERS = [
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
    A.LEVERS.forEach((lv) => setP(tope, lv.path, lv.max(state)));
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
    const individuales = A.LEVERS.map((lv) => {
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
    const libres = A.LEVERS.filter((lv) => Math.abs(lv.max(state) - getP(state, lv.path)) > 1e-6);
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
    pctFin: { nombre: '% financiado', path: ['inversion', 'pctFin'], min: 0, max: 100, unidad: '%' },
    plazo: { nombre: 'Plazo préstamo', path: ['inversion', 'plazo'], min: 2, max: 12, unidad: 'años' },
    rampa: { nombre: 'Meses de rampa', path: ['inversion', 'rampa'], min: 2, max: 24, unidad: 'meses' },
    dso: { nombre: 'Días de cobro', path: ['empresa', 'dso'], min: 0, max: 150, unidad: 'días' },
    importe: { nombre: 'Inversión', path: ['inversion', 'importe'], min: (s) => s.inversion.importe * 0.3, max: (s) => s.inversion.importe * 1.8, unidad: '€' },
    contrataciones: { nombre: 'Contrataciones', path: ['inversion', 'contrataciones'], min: 0, max: (s) => Math.max(10, s.inversion.contrataciones * 2.5), unidad: 'pers.' }
  };
  A.METRICS = {
    cajaMin: { nombre: 'Caja mínima', f: (r) => r.cajaMin, fmt: (v) => A.fmt.eur(v), better: 1, threshold: (s) => s.meta.cajaMin, warn: () => 0 },
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
        row.push({ x: xv, y: yv, v, estado: r.verdict.key, cajaMin: r.cajaMin, payback: r.payback, dscr: r.dscrMin });
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
