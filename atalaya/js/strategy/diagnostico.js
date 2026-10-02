/* Atalaya · Sistema estratégico · Tres módulos de diagnóstico
   Atalaya analiza, diagnostica y evalúa; no gestiona el día a día ni sustituye al ERP.
   · Cobros y morosidad: auditoría de la cartera de clientes a una fecha de corte (antigüedad de saldos,
     comportamiento real de pago, caja atrapada y deterioro estimado). No es una herramienta para reclamar.
   · Valoración de la empresa: cuánto vale hoy y cuánto sube con el plan (múltiplos y flujos descontados).
   · Evolución: cortes de diagnóstico guardados en el tiempo para ver si la empresa mejora o empeora. */
(function () {
  const A = window.Atalaya, S = A.strat, F = A.fmt;
  const { $, $$, esc } = S;
  const DAY = 864e5;
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const fecha = (v) => { if (!v) return null; const t = String(v); let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]); const d = new Date(t); return isNaN(d) ? null : d; };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  /* =====================================================================
     1. COBROS Y MOROSIDAD · auditoría de la cartera
     ===================================================================== */
  S.defaults.cobros = { ejemplo: true, corte: '', partidas: [], historico: [], tasas: [0, 1, 5, 15, 35, 75] };
  const TR = [['No vencido', -Infinity, 0], ['1-30 días', 1, 30], ['31-60 días', 31, 60], ['61-90 días', 61, 90], ['91-180 días', 91, 180], ['Más de 180 días', 181, Infinity]];
  const TRC = ['#2fb24a', '#9fbf3a', '#fab219', '#e8862a', '#e05a48', '#b8202a'];
  // Cartera de ejemplo coherente con los clientes de ejemplo (solo mientras no se carguen datos reales)
  function semilla() {
    const C = S.state.cobros; if (!C.ejemplo || C.partidas.length) return;
    const cli = (S.state.comercial.clientes || []).slice().sort((a, b) => b.ventas - a.ventas).slice(0, 9);
    const t0 = Date.now(), retr = [5, 40, 0, 95, 15, 0, 210, 20, 60];
    let n = 1000;
    cli.forEach((c, i) => { const plazo = S.num(c.dias) || 60, mes = S.num(c.ventas) / 12; [0, 1, 2].forEach((k) => { const venceHace = retr[i] - k * 30; const venc = new Date(t0 - venceHace * DAY); const emi = new Date(+venc - plazo * DAY); if (venceHace < -plazo) return; C.partidas.push({ cliente: c.nombre, factura: 'F' + n++, emision: iso(emi), vencimiento: iso(venc), importe: Math.round(mes * (0.6 + ((i + k) % 3) * 0.25)) }); }); });
    cli.forEach((c, i) => { const plazo = S.num(c.dias) || 60, extra = [8, 25, 2, 55, 10, 0, 90, 12, 30][i]; [1, 2, 3, 4].forEach((k) => { const emi = new Date(t0 - (k * 45 + plazo + extra + 30) * DAY); C.historico.push({ cliente: c.nombre, emision: iso(emi), cobro: iso(new Date(+emi + (plazo + extra) * DAY)), importe: Math.round(S.num(c.ventas) / 12) }); }); });
  }
  S.cobrosAnalisis = function () {
    const C = S.state.cobros; semilla();
    const corte = fecha(C.corte) || new Date(), tasas = C.tasas || S.defaults.cobros.tasas;
    const tr = TR.map((t, i) => ({ n: t[0], imp: 0, n2: 0, tasa: tasas[i] || 0 }));
    const by = new Map();
    let pend = 0;
    C.partidas.forEach((p) => {
      const imp = S.num(p.importe); if (!imp) return; pend += imp;
      const v = fecha(p.vencimiento) || fecha(p.emision); const dv = v ? Math.floor((corte - v) / DAY) : 0;
      const i = TR.findIndex((t) => dv >= t[1] && dv <= t[2]); const b = tr[i < 0 ? 0 : i]; b.imp += imp; b.n2++;
      const k = String(p.cliente || 'Sin cliente').trim(); const c = by.get(k) || { cliente: k, pend: 0, venc: 0, mas90: 0, maxRetraso: 0 };
      c.pend += imp; if (dv > 0) c.venc += imp; if (dv > 90) c.mas90 += imp; c.maxRetraso = Math.max(c.maxRetraso, dv); by.set(k, c);
    });
    // Comportamiento real de pago: días entre la factura y el cobro, ponderados por importe
    const hist = new Map();
    C.historico.forEach((h) => { const e = fecha(h.emision), c = fecha(h.cobro), imp = S.num(h.importe) || 1; if (!e || !c) return; const k = String(h.cliente || '').trim(); const x = hist.get(k) || { d: 0, w: 0, n: 0 }; x.d += (c - e) / DAY * imp; x.w += imp; x.n++; hist.set(k, x); });
    const pact = new Map((S.state.comercial.clientes || []).map((c) => [String(c.nombre).trim(), S.num(c.dias)]));
    const L = Array.from(by.values()).map((c) => { const h = hist.get(c.cliente); return Object.assign(c, { pactado: pact.has(c.cliente) ? pact.get(c.cliente) : null, real: h ? Math.round(h.d / h.w) : null, cobros: h ? h.n : 0 }); }).sort((a, b) => b.venc - a.venc || b.pend - a.pend);
    const venc = tr.slice(1).reduce((a, t) => a + t.imp, 0), mas90 = tr.slice(4).reduce((a, t) => a + t.imp, 0);
    const deterioro = tr.reduce((a, t) => a + t.imp * t.tasa / 100, 0), deducible = tr[4].imp + tr[5].imp; // más de 6 meses vencido: deducible en el Impuesto sobre Sociedades (con matices)
    const ventas = S.sim.empresa.ventas || 1, dsoReal = pend / ventas * 365;
    const pw = (S.state.comercial.clientes || []).reduce((a, c) => a + S.num(c.ventas), 0);
    const dsoPact = pw ? (S.state.comercial.clientes || []).reduce((a, c) => a + S.num(c.dias) * S.num(c.ventas), 0) / pw : S.sim.empresa.dso;
    const top = L[0], concVenc = venc && top ? top.venc / venc * 100 : 0;
    const realMedio = (() => { let d = 0, w = 0; hist.forEach((x) => { d += x.d; w += x.w; }); return w ? d / w : null; })();
    const cajaLib = Math.min(venc, Math.max(0, ventas / 365 * ((realMedio != null ? realMedio : dsoReal) - dsoPact))); // nunca más que lo ya vencido
    return { corte, tr, L, pend, venc, mas90, deterioro, deducible, dsoReal, dsoPact, cajaLib, concVenc, top, realMedio, ejemplo: C.ejemplo };
  };
  S.register({
    id: 'cobros', nombre: 'Cobros y morosidad', grupo: 'Finanzas',
    render(host) {
      const C = S.state.cobros, a = S.cobrosAnalisis();
      const mx = Math.max(1, ...a.tr.map((t) => t.imp));
      host.innerHTML = `${S.section('Auditoría de la cartera de clientes', 'Una foto a una fecha de corte de lo que deben los clientes: cuánto está vencido y desde cuándo, cómo pagan de verdad frente a lo pactado, cuánta caja hay atrapada y qué deterioro habría que reconocer. Es diagnóstico: sirve para decidir políticas de crédito y condiciones, no para gestionar el cobro del día a día (eso lo hace tu ERP).')}
        ${a.ejemplo ? '<p class="small muted">Datos de ejemplo. Sube en la zona de origen el listado de facturas pendientes (cliente, factura, vencimiento, importe) y, si lo tienes, el de cobros del último año (cliente, fecha de factura, fecha de cobro, importe).</p>' : ''}
        <div class="row"><label class="small">Fecha de corte <input type="date" class="input" id="cbCorte" value="${esc(C.corte || iso(a.corte))}"></label><span class="small muted">Normalmente, el último cierre de mes.</span></div>
        ${S.kpiTiles([
          { k: 'Pendiente de cobro', v: F.eur(a.pend), d: `${a.L.length} clientes · ${F.num(Math.round(a.dsoReal))} días de venta` },
          { k: 'Vencido', v: F.pct(a.pend ? a.venc / a.pend * 100 : 0), st: a.venc / Math.max(1, a.pend) > 0.3 ? 'stop' : a.venc / Math.max(1, a.pend) > 0.15 ? 'warn' : 'ok', d: F.eur(a.venc) },
          { k: 'Más de 90 días', v: F.eur(a.mas90), st: a.mas90 / Math.max(1, a.pend) > 0.1 ? 'stop' : a.mas90 > 0 ? 'warn' : 'ok', d: F.pct(a.pend ? a.mas90 / a.pend * 100 : 0) + ' de la cartera' },
          { k: 'Días reales de cobro', v: a.realMedio == null ? F.num(Math.round(a.dsoReal)) : F.num(Math.round(a.realMedio)), st: (a.realMedio || a.dsoReal) > a.dsoPact + 15 ? 'warn' : 'ok', d: `pactado de media: ${F.num(Math.round(a.dsoPact))} días` },
          { k: 'Caja atrapada', v: F.eur(a.cajaLib), st: a.cajaLib > S.sim.empresa.caja * 0.3 ? 'warn' : null, d: 'si se cobrara al plazo pactado' },
          { k: 'Deterioro estimado', v: F.eur(a.deterioro), d: `${F.eur(a.deducible)} con más de 6 meses` }
        ])}
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Antigüedad de los saldos</h4>
          <div class="stack">${a.tr.map((t, i) => `<div class="mfrow"><span>${t.n}</span><span class="track"><b style="width:${t.imp / mx * 100}%;background:${TRC[i]}"></b></span><span class="num" style="min-width:90px">${F.eur(t.imp)}</span></div>`).join('')}</div>
          <p class="small muted">Deterioro aplicado por tramo: ${a.tr.map((t) => `${t.n.toLowerCase()} ${t.tasa} %`).join(' · ')}. Son porcentajes de prudencia de consultor; ajústalos a tu experiencia.</p></div>
          <div class="glass pad stack"><h4>Lectura de auditoría</h4><ul class="small">
            <li>${a.venc ? `El <b>${F.pct(a.venc / a.pend * 100)}</b> de lo pendiente ya ha vencido.` : 'No hay saldos vencidos a la fecha de corte.'}</li>
            ${a.top && a.top.venc ? `<li><b>${esc(a.top.cliente)}</b> concentra el ${F.pct(a.concVenc)} de lo vencido (${F.eur(a.top.venc)}, retraso máximo ${a.top.maxRetraso} días).</li>` : ''}
            <li>Se cobra a <b>${F.num(Math.round(a.realMedio || a.dsoReal))} días</b> frente a ${F.num(Math.round(a.dsoPact))} pactados. Cobrar al plazo liberaría unos <b>${F.eur(a.cajaLib)}</b> de caja.</li>
            ${a.deducible ? `<li>${F.eur(a.deducible)} llevan más de 6 meses vencidos: su deterioro puede ser deducible en el Impuesto sobre Sociedades si se cumplen los requisitos. Revísalo con tu asesor.</li>` : ''}
            <li>Úsalo para decidir: límites de crédito por cliente, condiciones de pago por segmento ABC, seguro de crédito o factoring, y si conviene seguir vendiendo a plazo a los clientes que más se retrasan.</li></ul></div></div>
        <div class="glass pad stack mt"><h4>Cartera por cliente</h4><div class="table-wrap"><table><thead><tr><th style="text-align:left">Cliente</th><th>Pendiente</th><th>Vencido</th><th>Más de 90 días</th><th>Retraso máximo</th><th>Plazo pactado</th><th>Pago real</th><th>Desvío</th></tr></thead><tbody>
          ${a.L.slice(0, 25).map((c) => { const dv = c.real != null && c.pactado != null ? c.real - c.pactado : null; return `<tr><td style="text-align:left">${esc(c.cliente)}</td><td>${F.eur(c.pend)}</td><td>${c.venc ? F.eur(c.venc) : '—'}</td><td style="color:${c.mas90 ? 'var(--stop)' : 'inherit'}">${c.mas90 ? F.eur(c.mas90) : '—'}</td><td>${c.maxRetraso > 0 ? c.maxRetraso + ' días' : '—'}</td><td>${c.pactado != null ? c.pactado + ' días' : '—'}</td><td>${c.real != null ? c.real + ' días' : '—'}</td><td>${dv == null ? '—' : `<span class="state st-${dv > 30 ? 'stop' : dv > 10 ? 'warn' : 'ok'}">${dv > 0 ? '+' : ''}${dv} días</span>`}</td></tr>`; }).join('')}
        </tbody></table></div></div>
        <details class="glass pad mt"><summary><b>Datos de partida</b> <span class="small muted">· facturas pendientes y cobros del último año</span></summary><div id="cbPend" class="mt"></div><div id="cbHist" class="mt"></div></details>`;
      $('#cbCorte', host).onchange = (e) => { C.corte = e.target.value; S.save(); S.rerender(); };
      const ch = () => { C.ejemplo = false; S.save(); S.rerender(); };
      S.etable($('#cbPend', host), { titulo: 'Facturas pendientes de cobro', rows: C.partidas, onChange: ch, nuevo: () => ({ cliente: '', factura: '', emision: hoyISO(), vencimiento: hoyISO(), importe: 0 }), cols: [{ k: 'cliente', l: 'Cliente', type: 'text', syn: ['cliente', 'razon social', 'deudor'] }, { k: 'factura', l: 'Factura', type: 'text', syn: ['factura', 'numero', 'documento'] }, { k: 'emision', l: 'Emisión', type: 'date', syn: ['fecha factura', 'emision', 'fecha'] }, { k: 'vencimiento', l: 'Vencimiento', type: 'date', syn: ['vencimiento', 'fecha vencimiento', 'vto'] }, { k: 'importe', l: 'Importe pendiente', type: 'num', syn: ['pendiente', 'importe pendiente', 'saldo', 'importe'] }] });
      S.etable($('#cbHist', host), { titulo: 'Cobros del último año (para medir cómo pagan)', rows: C.historico, onChange: ch, nuevo: () => ({ cliente: '', emision: '', cobro: '', importe: 0 }), cols: [{ k: 'cliente', l: 'Cliente', type: 'text', syn: ['cliente'] }, { k: 'emision', l: 'Fecha factura', type: 'date', syn: ['fecha factura', 'emision'] }, { k: 'cobro', l: 'Fecha de cobro', type: 'date', syn: ['fecha cobro', 'cobro', 'fecha pago'] }, { k: 'importe', l: 'Importe', type: 'num', syn: ['importe', 'cobrado'] }] });
    },
    kpis() { const a = S.cobrosAnalisis(); return [{ k: 'Vencido sobre pendiente', v: F.pct(a.pend ? a.venc / a.pend * 100 : 0), st: a.venc / Math.max(1, a.pend) > 0.3 ? 'stop' : a.venc / Math.max(1, a.pend) > 0.15 ? 'warn' : 'ok' }, { k: 'Saldos de más de 90 días', v: F.eur(a.mas90), st: a.mas90 / Math.max(1, a.pend) > 0.1 ? 'stop' : a.mas90 > 0 ? 'warn' : 'ok' }, { k: 'Días reales de cobro', v: F.num(Math.round(a.realMedio || a.dsoReal)), st: (a.realMedio || a.dsoReal) > a.dsoPact + 15 ? 'warn' : 'ok' }]; },
    risks() { const a = S.cobrosAnalisis(), R = []; if (a.mas90 / Math.max(1, a.pend) > 0.1) R.push(S.mkRisk(`Saldos de clientes con más de 90 días: ${F.eur(a.mas90)}`, 4, a.mas90 > S.sim.empresa.caja * 0.3 ? 5 : 3, 'Revisar el crédito a esos clientes, valorar seguro de crédito y reconocer el deterioro.')); if (a.concVenc > 40 && a.top) R.push(S.mkRisk(`Lo vencido se concentra en ${a.top.cliente} (${F.pct(a.concVenc)})`, 3, 4, 'Limitar el riesgo con ese cliente: garantías, anticipos o límite de crédito.')); return R; },
    findings() { const a = S.cobrosAnalisis(), Fi = []; const tipo = (S.sim.empresa.polizaTipo || 5) / 100; if (a.cajaLib > 10000) Fi.push({ hallazgo: `Se cobra a ${Math.round(a.realMedio || a.dsoReal)} días frente a ${Math.round(a.dsoPact)} pactados: ${F.eur(a.cajaLib)} de caja atrapada`, accion: 'Revisar la política de crédito: plazos por segmento, límites y condiciones a los clientes que más se desvían.', impactoEUR: Math.round(a.cajaLib * tipo), plazo: 60 }); if (a.deterioro > 5000) Fi.push({ hallazgo: `Deterioro estimado de la cartera: ${F.eur(a.deterioro)}`, accion: 'Reconocer el deterioro en las cuentas y valorar su deducibilidad con el asesor.', impactoEUR: 0, plazo: 30 }); return Fi; }
  });

  /* =====================================================================
     2. VALORACIÓN DE LA EMPRESA
     ===================================================================== */
  S.defaults.valoracion = { multiplo: '', wacc: 12, g: 2, pesoMult: 50, realizacion: 50, ajustes: null, noOperativos: 0, contingencias: 0, socio: 0, participacion: 25 };
  const V = () => S.state.valoracion;
  // Factores de descuento que se detectan solos con los datos (el empresario puede cambiarlos)
  function ajustesAuto() {
    const c = S.state.c360 || {}, r = (id, q) => c[id] && c[id].r ? c[id].r[q] : null;
    let top1 = 0; try { const k = S.mod('ventas').kpis().find((x) => x.k === 'Peso del primer cliente'); top1 = parseFloat(String(k.v).replace(',', '.')) || 0; } catch (e) { /* sin dato */ }
    return { dueno: r('personas', 'e1') === 'no' || r('plan', 'p5') === 'no' || (r('personas', 'e6') != null && r('personas', 'e6') <= 2), concentracion: top1 > 20, cuentas: !(S.sim.historico && !S.sim.historico.ejemplo), recurrencia: false };
  }
  S.valoracionCalc = function () {
    const v = V(); const aj = Object.assign(ajustesAuto(), v.ajustes || {});
    const R = A.valorar(S.sim, { multiplo: v.multiplo, wacc: v.wacc, g: v.g, pesoMult: v.pesoMult, ajustes: aj, noOperativos: v.noOperativos, contingencias: v.contingencias });
    // Puente: hoy → mejoras de margen → menos riesgo → inversión → con el plan
    const Fi = S.allFindings ? S.allFindings() : [];
    const mejora = Fi.reduce((a, f) => a + (f.impactoEUR || 0), 0) * (S.num(v.realizacion) / 100);
    const pasoMejora = mejora * R.mult;
    const penal = R.ajustes.filter((x) => !x.fijo && x.v < 0).reduce((a, x) => a + x.v, 0);
    const pasoRiesgo = -penal * Math.max(0, R.ebitda + mejora);
    const pasoInv = R.inv ? Math.max(-R.central, R.deltaInv) : 0;
    const final = R.central + pasoMejora + pasoRiesgo + pasoInv;
    return Object.assign(R, { aj, mejora, pasoMejora, pasoRiesgo, pasoInv, final, subida: R.central > 0 ? (final / R.central - 1) * 100 : null });
  };
  S.register({
    id: 'valoracion', nombre: 'Valoración de la empresa', grupo: 'Estrategia',
    render(host) {
      const v = V(), R = S.valoracionCalc();
      const puente = [['Valor hoy', R.central, 'base'], ['Mejoras de margen detectadas', R.pasoMejora, 'paso'], ['Menos riesgo para un comprador', R.pasoRiesgo, 'paso'], ['La inversión del simulador', R.pasoInv, 'paso'], ['Valor con el plan', R.final, 'base']];
      const mxP = Math.max(1, ...puente.map((p) => Math.abs(p[1])));
      const pct = v.participacion || 25, socio = S.num(v.socio);
      host.innerHTML = `${S.section('Cuánto vale la empresa y cuánto puede valer', 'Valoración orientativa por dos caminos: el múltiplo de EBITDA que se paga en tu sector y el descuento de la caja que generará la empresa en los próximos cinco años. Después, cuánto sube si se aplican las mejoras detectadas, se reducen los riesgos que descuenta un comprador y se hace la inversión. Sirve para la sucesión, la entrada o salida de socios y la estrategia del grupo; no sustituye a una valoración profesional.')}
        ${S.kpiTiles([
          { k: 'Valor de las acciones', v: F.eur(R.central), st: R.central < 0 ? 'stop' : R.central < R.patrimonio ? 'warn' : 'ok', d: `entre ${F.eur(R.min)} y ${F.eur(R.max)}` },
          { k: 'Valor de la empresa', v: F.eur(R.evM), d: `${R.mult.toFixed(1).replace('.', ',')} × EBITDA de ${F.eur(R.ebitda)}` },
          R.deudaNeta >= 0 ? { k: 'Deuda neta', v: F.eur(R.deudaNeta), d: 'deuda bancaria y póliza menos caja' } : { k: 'Caja neta', v: F.eur(-R.deudaNeta), d: 'la caja supera a la deuda: suma al valor' },
          { k: 'Con el plan', v: F.eur(R.final), st: R.final > R.central ? 'ok' : null, d: R.subida == null ? '' : `${R.subida >= 0 ? '+' : ''}${F.pct(R.subida)} sobre hoy` },
          { k: 'Fondos propios contables', v: F.eur(R.patrimonio), d: R.central < R.patrimonio ? 'el mercado pagaría menos que lo que dicen los libros' : 'el valor supera a los libros' }
        ])}
        <div class="grid cols-2 mt">
          <div class="glass pad stack"><h4>De hoy al valor con el plan</h4><div class="vl-bridge">${puente.map(([n, x, t]) => `<div class="vl-row ${t}"><span>${n}</span><i><b style="width:${Math.abs(x) / mxP * 100}%;background:${t === 'base' ? 'var(--gold)' : x >= 0 ? 'var(--go)' : 'var(--stop)'}"></b></i><em>${t === 'paso' && x > 0 ? '+' : ''}${F.eur(x)}</em></div>`).join('')}</div>
            <p class="small muted">Mejoras: el ${v.realizacion} % de las mejoras anuales detectadas en todos los módulos (${F.eur(R.mejora)} de EBITDA), por el múltiplo. Menos riesgo: el múltiplo que se recupera al corregir los factores marcados abajo.</p>
            <label class="field"><span class="small">Parte de las mejoras que crees realista conseguir (%)</span><input class="input" data-v="realizacion" value="${v.realizacion}"></label></div>
          <div class="glass pad stack"><h4>Los dos métodos</h4><div class="table-wrap"><table><thead><tr><th style="text-align:left">Método</th><th>Empresa</th><th>Acciones</th></tr></thead><tbody>
            <tr><td style="text-align:left">Múltiplo de EBITDA (${R.mult.toFixed(1).replace('.', ',')}×)</td><td>${F.eur(R.evM)}</td><td>${F.eur(R.eqM)}</td></tr>
            <tr><td style="text-align:left">Flujos de caja descontados (${F.num(R.wacc)} %)</td><td>${F.eur(R.evD)}</td><td>${F.eur(R.eqD)}</td></tr>
            <tr><td style="text-align:left"><b>Central (${R.pesoMult} % múltiplo)</b></td><td></td><td><b>${F.eur(R.central)}</b></td></tr></tbody></table></div>
            <div class="chart" id="vlFcf"></div></div>
        </div>
        <div class="grid cols-2 mt">
          <div class="glass pad stack"><h4>Lo que suma o resta al múltiplo</h4><p class="small muted">Múltiplo de partida del sector: ${R.base.toFixed(1).replace('.', ',')}×. Atalaya marca lo que detecta en tus datos; cámbialo si no es así.</p>
            ${R.ajustes.filter((x) => x.fijo).map((x) => `<div class="vl-aj"><span>${esc(x.n)}</span><b class="${x.v < 0 ? 'neg' : 'pos'}">${x.v > 0 ? '+' : ''}${String(x.v).replace('.', ',')}×</b></div>`).join('')}
            ${[['dueno', 'Depende de la propiedad: sin relevo ni mandos que decidan', -0.75], ['concentracion', 'Clientes concentrados (el primero pesa más de un 20 %)', -0.5], ['cuentas', 'Cuentas sin auditar o sin histórico fiable', -0.25], ['recurrencia', 'Ingresos recurrentes o contratos plurianuales', 0.75]].map(([k, n, d]) => `<label class="vl-aj"><span><input type="checkbox" data-aj="${k}" ${R.aj[k] ? 'checked' : ''}> ${n}</span><b class="${d < 0 ? 'neg' : 'pos'}">${d > 0 ? '+' : ''}${String(d).replace('.', ',')}×</b></label>`).join('')}
            <div class="lever-grid">${[['multiplo', 'Múltiplo de partida (vacío = sector)', R.base], ['wacc', 'Tasa de descuento (%)', v.wacc], ['g', 'Crecimiento a largo plazo (%)', v.g], ['pesoMult', 'Peso del múltiplo en el central (%)', v.pesoMult], ['noOperativos', 'Activos no necesarios para el negocio (€)', v.noOperativos], ['contingencias', 'Contingencias o pasivos ocultos (€)', v.contingencias]].map(([k, l, ph]) => `<label class="field"><span class="small">${l}</span><input class="input" data-v="${k}" value="${v[k] === '' || v[k] == null ? '' : v[k]}" placeholder="${ph}"></label>`).join('')}</div></div>
          <div class="glass pad stack"><h4>Para qué sirve este valor</h4>
            <p class="small"><b>Entrada de un socio.</b> Si un socio aporta <input class="input vl-in" data-v="socio" value="${socio || ''}" placeholder="300.000"> €, sobre el valor de hoy tendría el <b>${socio ? F.pct(socio / (Math.max(1, R.central) + socio) * 100) : '—'}</b> de la empresa después de su aportación.</p>
            <p class="small"><b>Sucesión o venta de una parte.</b> El <input class="input vl-in" data-v="participacion" value="${pct}"> % vale hoy unos <b>${F.eur(R.central * pct / 100)}</b> y con el plan unos <b>${F.eur(R.final * pct / 100)}</b>. Es la base para pactos entre socios, herencias o protocolos familiares.</p>
            <p class="small"><b>Grupo.</b> En la vista de grupo cada sociedad muestra su valor y el valor atribuible a la holding.</p>
            <p class="small muted">Estimación con los datos cargados: un comprador ajustaría por su propio análisis (due diligence), la calidad del beneficio y las sinergias.</p></div>
        </div>`;
      S.vbars($('#vlFcf', host), ['Año 1', 'Año 2', 'Año 3', 'Año 4', 'Año 5'], [{ n: 'Caja libre sin la inversión', data: R.flHoy, c: S.css('--s1') }, { n: 'Con la inversión', data: R.flPlan, c: S.css('--s3') }], F.eur, { h: 170, aria: 'Caja libre anual' });
      $$('[data-v]', host).forEach((inp) => inp.onchange = () => { const k = inp.dataset.v; v[k] = inp.value.trim() === '' ? (k === 'multiplo' ? '' : 0) : S.num(inp.value); S.save(); S.rerender(); });
      $$('[data-aj]', host).forEach((inp) => inp.onchange = () => { v.ajustes = Object.assign({}, v.ajustes || {}, { [inp.dataset.aj]: inp.checked }); S.save(); S.rerender(); });
    },
    kpis() { const R = S.valoracionCalc(); return [{ k: 'Valor de las acciones', v: F.eur(R.central), st: R.central < 0 ? 'stop' : R.central < R.patrimonio ? 'warn' : 'ok' }, { k: 'Subida con el plan', v: R.subida == null ? '—' : F.pct(R.subida) }]; },
    risks() { const R = S.valoracionCalc(), L = []; if (R.central < 0) L.push(S.mkRisk('La deuda neta supera el valor del negocio', 4, 5, 'Reducir deuda o mejorar el EBITDA antes de cualquier operación societaria.')); else if (R.central < R.patrimonio * 0.8) L.push(S.mkRisk('El negocio vale menos que sus fondos propios contables', 3, 3, 'Revisar rentabilidad sobre activos: hay activos que no generan EBITDA suficiente.')); return L; },
    findings() { return []; }
  });

  /* =====================================================================
     3. EVOLUCIÓN · cortes de diagnóstico en el tiempo
     ===================================================================== */
  S.defaults.evolucion = { cortes: [] };
  const RANK = { ok: 3, warn: 2, stop: 1 };
  const num = (v) => { const t = String(v == null ? '' : v).replace(/<[^>]+>/g, ''); const m = t.match(/-?[\d.]+(?:,\d+)?/); if (!m) return null; let n = m[0]; n = /,/.test(n) ? n.replace(/\./g, '').replace(',', '.') : /\.\d{3}(\D|$)/.test(n) ? n.replace(/\./g, '') : n; let x = parseFloat(n); if (/M€/.test(t)) x *= 1e6; else if (/k€/.test(t)) x *= 1e3; return isFinite(x) ? x : null; };
  function corte(etiqueta) {
    const K = S.allKpis().filter((k) => !['evolucion', 'tablero'].includes(k.mod));
    const R = S.allRisks(), Fi = S.allFindings();
    const st = K.filter((k) => k.st); const salud = st.length ? Math.round(st.reduce((a, k) => a + (k.st === 'ok' ? 100 : k.st === 'warn' ? 55 : 15), 0) / st.length) : null;
    const areas = {}; S.GROUPS.forEach((g) => { const l = K.filter((k) => (S.mod(k.mod) || {}).grupo === g && k.st); if (l.length) areas[g] = Math.round(l.reduce((a, k) => a + (k.st === 'ok' ? 100 : k.st === 'warn' ? 55 : 15), 0) / l.length); });
    let acc = { total: 0, hechas: 0 }, mad = {};
    Object.keys(A.C360 || {}).forEach((id) => { if (!A.C360[id] || !S.mod(id)) return; try { const P = S.plan360(id); acc.total += P.length; acc.hechas += P.filter((x) => x.estado === 'Hecha').length; const m = S.madurez360(id); if (m && m.score != null) mad[id] = m.score; } catch (e) { /* módulo sin plan */ } });
    let verdict = null; try { verdict = S.analysis().verdict.titulo; } catch (e) { /* sin simulador */ }
    return { fecha: new Date().toISOString(), etiqueta: etiqueta || 'Corte automático', salud, areas, riesgosAltos: R.filter((r) => r.estado === 'stop').length, riesgos: R.length, mejora: Fi.reduce((a, f) => a + (f.impactoEUR || 0), 0), acc, mad, verdict, kpis: K.map((k) => ({ mod: k.mod, k: k.k, v: num(k.v), t: String(k.v).replace(/<[^>]+>/g, ''), st: k.st || null })) };
  }
  S.corteDiagnostico = (etiqueta) => { const E = S.state.evolucion; E.cortes = E.cortes || []; E.cortes.push(corte(etiqueta)); E.cortes = E.cortes.slice(-48); S.save(); };
  // Un corte automático al mes, la primera vez que se abre el sistema estratégico ese mes
  let autoHecho = false;
  S.onShowExtra = (S.onShowExtra || []).concat([() => {
    if (autoHecho) return; autoHecho = true;
    setTimeout(() => { try { const E = S.state.evolucion; const ult = (E.cortes || []).slice(-1)[0]; const mes = new Date().toISOString().slice(0, 7); if (!ult || ult.fecha.slice(0, 7) !== mes) S.corteDiagnostico('Corte automático de ' + new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })); } catch (e) { console.error(e); } }, 1500);
  }]);
  let sel = { desde: null, hasta: null };
  S.register({
    id: 'evolucion', nombre: 'Evolución', grupo: 'Visión',
    render(host) {
      const E = S.state.evolucion, C = E.cortes || [];
      const fd = (c) => new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      if (C.length < 2) {
        host.innerHTML = `${S.section('Evolución del diagnóstico', 'La foto de hoy dice cómo está la empresa; la película dice si mejora. Cada mes Atalaya guarda un corte del diagnóstico (indicadores, semáforos, riesgos, mejoras, madurez y plan de acción) y aquí se comparan.')}
          <div class="glass pad stack"><p>${C.length ? `Hay <b>un corte</b> guardado (${esc(C[0].etiqueta)}, ${fd(C[0])}). Con el segundo verás la comparación.` : 'Todavía no hay cortes guardados.'}</p><p class="small muted">Se guarda uno automático al mes. Puedes guardar uno ahora, por ejemplo antes y después de cargar las cuentas o de aplicar un cambio, para medir su efecto.</p>
          <div class="row"><input class="input" id="evTag" placeholder="Nombre del corte (opcional)"><button class="btn solid" id="evSave">Guardar corte ahora</button></div></div>`;
        $('#evSave', host).onclick = () => { S.corteDiagnostico($('#evTag', host).value.trim() || 'Corte manual'); S.rerender(); };
        return;
      }
      const iD = sel.desde != null && C[sel.desde] ? sel.desde : 0, iH = sel.hasta != null && C[sel.hasta] ? sel.hasta : C.length - 1;
      const a = C[iD], b = C[iH];
      const delta = (x, y, inv) => { if (x == null || y == null) return ''; const d = y - x; if (!d) return '<span class="muted">=</span>'; const good = inv ? d < 0 : d > 0; return `<span style="color:${good ? 'var(--go)' : 'var(--stop)'}">${d > 0 ? '▲' : '▼'} ${F.num(Math.abs(Math.round(d)))}</span>`; };
      // Indicadores comparables: mismo módulo y nombre en los dos cortes
      const rows = b.kpis.map((kb) => { const ka = a.kpis.find((x) => x.mod === kb.mod && x.k === kb.k); if (!ka) return null; const sa = RANK[ka.st] || 0, sb = RANK[kb.st] || 0; return { mod: kb.mod, k: kb.k, ta: ka.t, tb: kb.t, sa: ka.st, sb: kb.st, dir: sb && sa ? sb - sa : 0, cambio: ka.t !== kb.t }; }).filter(Boolean);
      const mejoran = rows.filter((r) => r.dir > 0), empeoran = rows.filter((r) => r.dir < 0), cambian = rows.filter((r) => !r.dir && r.cambio);
      host.innerHTML = `${S.section('Evolución del diagnóstico', 'Compara dos cortes del diagnóstico: qué semáforos han mejorado o empeorado, cómo se mueve la salud de cada área, los riesgos, las mejoras pendientes y el avance del plan de acción.')}
        <div class="row"><label class="small">Desde <select class="input" id="evA">${C.map((c, i) => `<option value="${i}" ${i === iD ? 'selected' : ''}>${esc(fd(c))} · ${esc(c.etiqueta)}</option>`).join('')}</select></label><label class="small">Hasta <select class="input" id="evB">${C.map((c, i) => `<option value="${i}" ${i === iH ? 'selected' : ''}>${esc(fd(c))} · ${esc(c.etiqueta)}</option>`).join('')}</select></label><span class="spacer"></span><input class="input" id="evTag" placeholder="Nombre del corte"><button class="btn" id="evSave">Guardar corte ahora</button></div>
        <div class="kpis" style="margin-top:0">${[['Salud global', a.salud, b.salud, '/100'], ['Riesgos altos', a.riesgosAltos, b.riesgosAltos, '', true], ['Mejoras pendientes (€/año)', a.mejora, b.mejora, '€', true], ['Acciones hechas', a.acc.hechas, b.acc.hechas, ` de ${b.acc.total}`]].map(([k, x, y, u, inv]) => `<div class="kpi"><div class="k"><span>${k}</span></div><div class="v">${u === '€' ? F.eur(y) : (y == null ? '—' : F.num(y)) + (u && u !== '€' ? u : '')}</div><div class="d">${u === '€' ? F.eur(x) : x == null ? '—' : F.num(x)} antes · ${delta(x, y, inv)}</div></div>`).join('')}</div>
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Salud global en el tiempo</h4><div class="chart" id="evChart"></div></div>
          <div class="glass pad stack"><h4>Salud por área</h4><div class="table-wrap"><table><thead><tr><th style="text-align:left">Área</th><th>${esc(fd(a))}</th><th>${esc(fd(b))}</th><th>Cambio</th></tr></thead><tbody>${S.GROUPS.map((g) => `<tr><td style="text-align:left">${g}</td><td>${a.areas[g] != null ? a.areas[g] : '—'}</td><td>${b.areas[g] != null ? b.areas[g] : '—'}</td><td>${delta(a.areas[g], b.areas[g])}</td></tr>`).join('')}</tbody></table></div>
          <p class="small muted">Veredicto del simulador: ${esc(a.verdict || '—')} → <b>${esc(b.verdict || '—')}</b></p></div></div>
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Mejoran (${mejoran.length})</h4>${lista(mejoran)}</div><div class="glass pad stack"><h4>Empeoran (${empeoran.length})</h4>${lista(empeoran)}</div></div>
        ${cambian.length ? `<div class="glass pad stack mt"><h4>Cambian sin cambiar de semáforo (${cambian.length})</h4>${lista(cambian)}</div>` : ''}
        <div class="glass pad stack mt"><h4>Cortes guardados</h4><div class="table-wrap"><table><thead><tr><th style="text-align:left">Fecha</th><th style="text-align:left">Nombre</th><th>Salud</th><th>Riesgos altos</th><th>Mejoras €/año</th><th>Acciones hechas</th><th></th></tr></thead><tbody>${C.map((c, i) => `<tr><td style="text-align:left">${esc(fd(c))}</td><td style="text-align:left">${esc(c.etiqueta)}</td><td>${c.salud == null ? '—' : c.salud}</td><td>${c.riesgosAltos}</td><td>${F.eur(c.mejora)}</td><td>${c.acc.hechas}/${c.acc.total}</td><td><button class="icon-btn" data-evdel="${i}" aria-label="Borrar corte">×</button></td></tr>`).join('')}</tbody></table></div></div>`;
      function lista(L) { return L.length ? `<div class="table-wrap"><table><tbody>${L.slice(0, 20).map((r) => `<tr><td style="text-align:left"><b>${esc(r.k)}</b><br><span class="small muted">${esc((S.mod(r.mod) || {}).nombre || r.mod)}</span></td><td>${esc(r.ta)} ${r.sa ? `<span class="state st-${r.sa}">${S.stName[r.sa]}</span>` : ''}</td><td>→</td><td>${esc(r.tb)} ${r.sb ? `<span class="state st-${r.sb}">${S.stName[r.sb]}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Ninguno.</p>'; }
      S.vbars($('#evChart', host), C.map((c) => new Date(c.fecha).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })), [{ n: 'Salud global', data: C.map((c) => c.salud || 0), c: S.css('--gold') }], (x) => F.num(Math.round(x)), { h: 190, line: { n: 'Riesgos altos ×10', data: C.map((c) => c.riesgosAltos * 10), c: S.css('--stop') }, aria: 'Salud global por corte' });
      $('#evA', host).onchange = (e) => { sel.desde = +e.target.value; S.rerender(); };
      $('#evB', host).onchange = (e) => { sel.hasta = +e.target.value; S.rerender(); };
      $('#evSave', host).onclick = () => { S.corteDiagnostico($('#evTag', host).value.trim() || 'Corte manual'); sel = { desde: null, hasta: null }; S.rerender(); };
      $$('[data-evdel]', host).forEach((bt) => bt.onclick = () => { C.splice(+bt.dataset.evdel, 1); sel = { desde: null, hasta: null }; S.save(); S.rerender(); });
    }
  });
  /* Evolución de los indicadores de un módulo (para su informe 360) */
  S.evolucionDe = (modId) => { const C = (S.state.evolucion || {}).cortes || []; if (C.length < 2) return null; const a = C[0], b = C[C.length - 1]; return { a, b, rows: b.kpis.filter((k) => k.mod === modId).map((kb) => { const ka = a.kpis.find((x) => x.mod === modId && x.k === kb.k); return ka ? { k: kb.k, ta: ka.t, tb: kb.t, sa: ka.st, sb: kb.st } : null; }).filter(Boolean) }; };
})();
