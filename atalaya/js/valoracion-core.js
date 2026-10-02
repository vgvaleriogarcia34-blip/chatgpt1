/* Atalaya · Valoración orientativa de una empresa (la usan el sistema estratégico y la vista de grupo)
   Dos métodos sobre los datos del simulador, con el escenario sin la inversión como «hoy»:
   · Múltiplo de EBITDA del sector, corregido por tamaño y por los factores que un comprador descuenta.
   · Descuento de los flujos de caja libre de los cinco años proyectados, con valor residual.
   El valor de las acciones es el valor de la empresa menos la deuda neta. Es una estimación para decidir y
   conversar (sucesión, socios, grupo); no sustituye a una valoración profesional. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  // Múltiplos EV/EBITDA orientativos para pymes españolas por sector (operaciones privadas, no cotizadas)
  A.MULTIPLOS = { industria: 5.5, distribucion: 5, hosteleria: 4.5, retail: 4.5, construccion: 4, servicios: 6, tecnologia: 8, agro: 5.5, salud: 7, logistica: 5.5 };
  const sum = (a, i0, i1) => { let t = 0; for (let i = i0; i < i1 && i < a.length; i++) t += a[i] || 0; return t; };

  /* Flujo de caja libre anual de una serie mensual del motor: EBITDA − impuestos − variación de circulante − inversión */
  function fcfAnual(w) { return [0, 1, 2, 3, 4].map((y) => sum(w.ebitda, y * 12, y * 12 + 12) - sum(w.tax, y * 12, y * 12 + 12) - sum(w.dwc || [], y * 12, y * 12 + 12) - sum(w.capex || [], y * 12, y * 12 + 12)); }
  function dcf(fl, wacc, g) {
    let v = 0; fl.forEach((f, i) => { v += f / Math.pow(1 + wacc, i + 1); });
    const tv = fl[4] * (1 + g) / Math.max(0.01, wacc - g);
    return v + tv / Math.pow(1 + wacc, 5);
  }

  /* sim: estado del simulador · o: { multiplo, wacc (%), g (%), pesoMult (%), ajustes: { dueno, concentracion, cuentas, crecimiento }, noOperativos, contingencias } */
  A.valorar = function (sim, o) {
    o = o || {};
    const s = Object.assign(A.defaultState(), sim);
    const r = A.analyze(s, A.scenarioMods(s, s.escenario || 'base'));
    const em = s.empresa, an = r.tamano.antes;
    const ebitda = an.ebitda, ventas = an.ventas;
    const base = o.multiplo != null && o.multiplo !== '' ? +o.multiplo : (A.MULTIPLOS[s.sector] || 5);
    // Ajustes del múltiplo: lo que un comprador o un socio descuenta (o premia)
    const aj = [];
    const tam = ventas < 2e6 ? -1 : ventas < 1e7 ? -0.5 : 0;
    if (tam) aj.push({ k: 'tamano', n: ventas < 2e6 ? 'Empresa pequeña (menos de 2 M€ de ventas)' : 'Pyme (menos de 10 M€ de ventas)', v: tam, fijo: true });
    const A0 = o.ajustes || {};
    if (A0.dueno) aj.push({ k: 'dueno', n: 'Depende de la propiedad: sin relevo ni mandos que decidan', v: -0.75 });
    if (A0.concentracion) aj.push({ k: 'concentracion', n: 'Clientes concentrados (el primero pesa más de un 20 %)', v: -0.5 });
    if (A0.cuentas) aj.push({ k: 'cuentas', n: 'Cuentas sin auditar o sin histórico fiable', v: -0.25 });
    if (A0.recurrencia) aj.push({ k: 'recurrencia', n: 'Ingresos recurrentes o contratos plurianuales', v: 0.75 });
    if (em.crecimiento >= 10) aj.push({ k: 'crecimiento', n: 'Crecimiento sostenido superior al 10 %', v: 0.5, fijo: true });
    const mult = Math.max(1.5, base + aj.reduce((a, x) => a + x.v, 0));
    const deudaNeta = (em.deudaViva || 0) + (em.polizaDispuesta || 0) - (em.caja || 0);
    const extra = (+o.noOperativos || 0) - (+o.contingencias || 0);
    const evM = Math.max(0, ebitda) * mult;
    const wacc = (o.wacc != null && o.wacc !== '' ? +o.wacc : 12) / 100, g = (o.g != null && o.g !== '' ? +o.g : 2) / 100;
    const flHoy = fcfAnual(r.b), flPlan = fcfAnual(r.w);
    const evD = Math.max(0, dcf(flHoy, wacc, g));
    const pm = (o.pesoMult != null && o.pesoMult !== '' ? +o.pesoMult : 50) / 100;
    const eqM = evM - deudaNeta + extra, eqD = evD - deudaNeta + extra;
    const central = pm * eqM + (1 - pm) * eqD;
    // Con la inversión del simulador: EBITDA de crucero y deuda nueva
    const inv = s.inversion && s.inversion.importe > 0;
    const deudaNueva = inv ? s.inversion.importe * (s.inversion.pctFin || 0) / 100 : 0;
    const evInv = Math.max(0, r.tamano.despues.ebitda) * mult;
    const eqInvM = evInv - (deudaNeta + deudaNueva) + extra;
    const evDInv = Math.max(0, dcf(flPlan, wacc, g));
    const eqInv = pm * eqInvM + (1 - pm) * (evDInv - deudaNeta + extra);
    return { sector: s.sector, ventas, ebitda, ebitdaPct: an.ebitdaPct, base, ajustes: aj, mult, deudaNeta, extra, evM, evD, eqM, eqD, central, min: Math.min(eqM, eqD), max: Math.max(eqM, eqD), patrimonio: em.fondosPropios || 0, wacc: wacc * 100, g: g * 100, pesoMult: pm * 100, flHoy, flPlan, inv, eqInv, deltaInv: inv ? eqInv - central : 0, ebitdaCrucero: r.tamano.despues.ebitda, deudaNueva, r };
  };
})();
