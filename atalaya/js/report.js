/* Atalaya · Informe de decisión de inversión
   Dossier para la dirección y la propiedad: la conclusión primero (resumen ejecutivo con sus cifras), el diagnóstico con
   títulos que son conclusiones, riesgos y oportunidades cuantificados, recomendaciones con impacto, responsable y plazo,
   hoja de ruta y un anexo con supuestos, metodología, fuentes y limitaciones. El sujeto es siempre la empresa.
   Sin inversión definida, el documento se limita a la situación de partida y a su proyección; lo que no puede
   analizarse se omite y se dice en «Alcance y limitaciones». */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const R = (A.report = {});
  const f = () => A.fmt;
  const pill = (st, txt) => (A.informe ? A.informe.pill(st, txt) : `<span class="pill p-${st}">${txt}</span>`);
  const stTxt = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  const vKey = { go: 'ok', warn: 'warn', stop: 'stop' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dec = (v, n) => String(Math.round(v * Math.pow(10, n == null ? 1 : n)) / Math.pow(10, n == null ? 1 : n)).replace('.', ',').replace('-', '−');
  const min = (t) => { t = String(t || ''); return t.charAt(0).toLowerCase() + t.slice(1); };
  const may = (t) => { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); };
  const lista = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]);
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const signo = (v, fn) => (v > 0 ? '+' : '') + fn(v);
  const NUM = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
  const TD = 'style="text-align:left;white-space:normal;font-family:var(--font-body)"';

  /* ---------- Lecturas de apoyo ---------- */
  const sinInversion = (state) => { const v = state.inversion || {}; return !(+v.importe > 0 || (v.lineas || []).some((l) => +l.importe > 0)); };
  const sinEquipo = (state) => { const h = state.humano || {}, ks = A.simVacio ? Object.keys(A.simVacio().humano) : Object.keys(h); return !ks.some((k) => +h[k] > 0); };
  const LUZ_INV = ['dimension', 'retorno', 'rentabilidad', 'circulante', 'margen'];
  const NOMBRE_LUZ = { humano: 'Preparación de la organización' };
  const luces = (state, r) => r.lights.filter((l) => !(sinInversion(state) && LUZ_INV.indexOf(l.key) >= 0) && !(l.key === 'humano' && sinEquipo(state))).map((l) => Object.assign({}, l, { nombre: NOMBRE_LUZ[l.key] || l.nombre }));
  const CONCLUSION = {
    'Rediseñar antes de mover': 'La operación debe rediseñarse antes de comprometer la inversión',
    'Avanzar con condiciones': 'La inversión es viable si antes se corrigen los indicadores en rojo y en ámbar',
    'Avanzar vigilando': 'La empresa puede afrontar la inversión, con seguimiento de los indicadores en ámbar',
    'Avanzar': 'La empresa puede afrontar la inversión sin comprometer su liquidez'
  };
  const CORTA = { 'Rediseñar antes de mover': 'Rediseñar', 'Avanzar con condiciones': 'Avanzar con condiciones', 'Avanzar vigilando': 'Avanzar con seguimiento', 'Avanzar': 'Avanzar' };
  // Meta de referencia del plan: la primera que hoy no se cumple
  const metaRef = (P) => { const i = Math.max(0, P.antes.metas.findIndex((m) => !m.ok)); return [P.antes.metas[i], P.despues.metas[i]]; };
  // Sin inversión, la lectura de los indicadores no habla de la inversión
  const SIN_INV = {
    liquidez: (r, F) => [r.cajaRef < 0 ? `En el mes ${r.mesCajaRef} faltarían ${F.eur(-r.cajaRef)}: la empresa necesita reforzar su financiación.` : null, 'Alargar el plazo de la deuda o ampliar la póliza no cuesta margen. Si no basta, conviene cobrar antes y pagar más tarde.'],
    endeudamiento: () => [null, 'Se corrige con menos deuda o con más beneficio del negocio. Reducir deuda con caja suele castigar la liquidez.']
  };
  // Sin inversión y sin medidas de financiación o circulante que basten: qué hacer con cada meta que no se cumple
  const REC_META = {
    cajaMin: ['Reforzar la financiación a largo plazo: alargar el vencimiento de la deuda o ampliar la póliza de crédito, y aportar fondos propios si no basta', 'Dirección financiera y propiedad', '0-30 días'],
    dscr: ['Rebajar la cuota anual con una refinanciación a mayor plazo y elevar el flujo del negocio (margen y gastos fijos)', 'Dirección financiera', '30-90 días'],
    deuda: ['Reducir la deuda neta o aumentar el EBITDA antes de asumir deuda nueva', 'Dirección general', '90-180 días'],
    salarial: ['Ajustar la plantilla al ritmo real de las ventas y medir las ventas por persona cada trimestre', 'Dirección general', '90-180 días']
  };
  const conclusion = (state, r, L) => {
    const rojos = L.filter((l) => l.estado === 'stop');
    if (!sinInversion(state)) return CONCLUSION[r.verdict.titulo] || r.verdict.titulo;
    return r.cajaRef < 0 ? 'La empresa necesita reforzar su liquidez antes de plantear una inversión' : rojos.length ? `La empresa parte con ${pl(rojos.length, 'indicador', 'indicadores')} en rojo que ${rojos.length === 1 ? 'condiciona' : 'condicionan'} su capacidad de inversión` : 'La empresa parte de una posición financiera que admite estudiar una inversión';
  };
  const PLAZO = (esf) => (esf <= 1 ? '0-30 días' : esf === 2 ? '30-90 días' : '90-180 días');
  // Qué supone cada sensibilidad, en adverso y en favorable (las magnitudes son las del análisis de sensibilidad)
  const SENS = {
    ventas: ['La venta nueva queda un 20 % por debajo de la prevista', 'La venta nueva supera en un 20 % la prevista'],
    retraso: ['La puesta en marcha se retrasa tres meses', 'La rampa comercial se adelanta dos meses'],
    margen: ['El margen de la actividad nueva baja 3 puntos', 'El margen de la actividad nueva mejora 3 puntos'],
    cobro: ['Los clientes pagan 20 días más tarde', 'Los clientes pagan 20 días antes'],
    sobrecoste: ['La inversión cuesta un 15 % más de lo presupuestado', 'La inversión se cierra un 5 % por debajo del presupuesto'],
    tipos: ['El tipo de interés sube 2 puntos', 'El tipo de interés baja 2 puntos']
  };
  const descEscenario = (x, state) => {
    if (x.key !== 'hipotesis') return x.desc;
    const h = (state.hipotesis || []).filter((q) => q.activo).map((q) => `${min(A.SHOCKS[q.tipo].nombre)} en el mes ${q.mes} (${q.magnitud} ${A.SHOCKS[q.tipo].unidad})`);
    return 'Escenario propio de la dirección, con sus hipótesis de venta, plazos y márgenes' + (h.length ? ' y las siguientes contingencias: ' + lista(h) + '.' : '.');
  };
  const fuentes = (state) => {
    const H = state.historico && !state.historico.ejemplo && Array.isArray(state.historico.anios) ? state.historico.anios.map((y) => y.anio).filter(Boolean).sort() : [];
    const cu = H.length ? `Cuentas de ${H.length === 1 ? 'el ejercicio ' + H[0] : 'los ejercicios ' + H[0] + ' a ' + H[H.length - 1]} y cifras` : 'Cifras';
    const fe = state.fechaCifras ? ` (actualizadas el ${new Date(state.fechaCifras).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })})` : '';
    return `${cu} de partida facilitadas por la dirección de la empresa${fe}. Los umbrales de referencia sectorial corresponden al perfil tipo del sector ${min(A.SECTORS[state.sector].nombre)}.`;
  };

  /* ---------- Mensajes clave: cada uno con su cifra ---------- */
  R.claves = function (state, ctx) {
    const F = f(), r = ctx.active, e = state.empresa, k = [], sinInv = sinInversion(state);
    const liq = r.contarPoliza ? 'liquidez (caja más póliza disponible)' : 'caja';
    if (sinInv) k.push(`<b>Punto de partida.</b> La empresa factura ${F.eur(e.ventas)} con un EBITDA de ${F.eur(r.tamano.antes.ebitda)} (${F.pct(r.tamano.antes.ebitdaPct)} de las ventas), ${F.eur(e.caja)} de caja y ${F.eur(e.deudaViva)} de deuda financiera.`);
    if (!sinInv) k.push(`<b>Dimensión.</b> La inversión de ${F.eur(r.dim.inversion)} es ${r.dim.clase.toLowerCase()} para una empresa que factura ${F.eur(e.ventas)}: equivale a ${isFinite(r.dim.sobreEbitda) ? F.x(r.dim.sobreEbitda) + ' su resultado bruto de explotación (EBITDA) actual' : 'un EBITDA actual que no es positivo'} y al ${F.pct(r.dim.sobreFondos * 100)} de sus fondos propios.`);
    k.push(r.cajaRef < 0
      ? `<b>Liquidez.</b> La tesorería no resiste: la ${liq} cae hasta ${F.eur(r.cajaRef)} en el mes ${r.mesCajaRef}. ${sinInv ? 'La empresa necesita reforzar su financiación aunque no invierta.' : 'La empresa no puede afrontar la operación con su rentabilidad y su financiación actuales.'}`
      : `<b>Liquidez.</b> La tesorería resiste: el punto más bajo de ${liq} es ${F.eur(r.cajaRef)} en el mes ${r.mesCajaRef}, equivalente a ${dec(r.colMin)} meses de gastos${r.cajaRef < state.meta.cajaMin ? `, por debajo del mínimo de ${F.eur(state.meta.cajaMin)} que se ha fijado la dirección` : ''}.`);
    if (!sinInv) k.push(`<b>Deuda.</b> El préstamo nuevo de ${F.eur(r.loan)} supone una cuota de ${F.eur(r.cuotaNueva)} al mes${r.cuotaCarencia > 0 && state.inversion.carencia > 0 ? ` (${F.eur(r.cuotaCarencia)} durante la carencia)` : ''}. Con la deuda existente, las cuotas absorben ${isFinite(r.cuotaSobreEbitda) ? 'el ' + F.pct(r.cuotaSobreEbitda) + ' del EBITDA mensual' : 'un EBITDA que no es positivo'} una vez alcanzado el régimen de crucero; el negocio cubre las cuotas ${F.x(r.dscrMin)} en el peor año y la deuda neta llega a ${F.x(r.deudaEbitda)} el EBITDA.`);
    else k.push(`<b>Deuda.</b> El negocio cubre las cuotas de su deuda ${F.x(r.dscrMin)} en el peor año y la deuda neta equivale a ${F.x(r.deudaEbitda)} el EBITDA.`);
    if (!sinInv) k.push(`<b>Retorno.</b> El proyecto recupera la inversión en ${min(F.months(r.payback))}${r.tir != null ? `, con una rentabilidad anual (TIR) del ${F.pct(r.tir * 100)}` : ''} y un valor actual neto (VAN) de ${F.eur(r.van)}. La caja de la empresa vuelve al nivel que tendría sin invertir en ${min(F.months(r.paybackCaja))}.`);
    if (!sinInv) { const d = r.tamano; k.push(`<b>Nuevo tamaño.</b> La empresa pasa de ${F.eur(d.antes.ventas)} a ${F.eur(d.despues.ventas)} de venta anual y de ${F.num(d.antes.plantilla)} a ${F.num(d.despues.plantilla)} personas; el peso salarial queda en el ${F.pct(d.despues.pesoSalarial)} y el margen bruto en el ${F.pct(d.despues.margen)}.`); }
    if (!sinEquipo(state)) k.push(`<b>Organización.</b> La preparación de la organización para sostener ${sinInv ? 'su tamaño' : 'el nuevo tamaño'} es de ${Math.round(r.humano.score)} sobre 100${r.humano.gapMandos ? `, con ${pl(r.humano.gapMandos, 'mando intermedio', 'mandos intermedios')} por cubrir` : ''}.`);
    const P = ctx.plan;
    if (P) {
      const [a0, d0] = metaRef(P), ok = P.despues.metas.filter((m) => m.ok).length;
      if (P.ok) k.push(`<b>Metas.</b> La empresa cumple las ${P.antes.metas.length} metas financieras que se ha fijado la dirección sin medidas correctoras.`);
      else if (P.acciones.length) k.push(`<b>Plan de corrección.</b> ${may(NUM[P.acciones.length] || String(P.acciones.length))} ${P.acciones.length === 1 ? 'medida' : 'medidas'} (${lista(P.acciones.map((a) => min(a.lv.nombre)))}) ${P.acciones.length === 1 ? 'lleva' : 'llevan'} la ${min(a0.nombre)} de ${a0.f(a0.valor)} a ${d0.f(d0.valor)} y ${ok === P.despues.metas.length ? (P.acciones.length === 1 ? 'permite' : 'permiten') + ' cumplir todas las metas' : `${P.acciones.length === 1 ? 'deja' : 'dejan'} cumplidas ${ok} de las ${P.despues.metas.length} metas`}.`);
      else k.push(`<b>Metas.</b> ${may(lista(P.antes.metas.filter((m) => !m.ok).map((m) => min(m.nombre))))} no ${P.antes.metas.filter((m) => !m.ok).length === 1 ? 'alcanza' : 'alcanzan'} el objetivo de la dirección y no se ${P.antes.metas.filter((m) => !m.ok).length === 1 ? 'corrige' : 'corrigen'} con medidas de financiación y de circulante.`);
    }
    return k;
  };
  // Versión en texto de los mensajes clave (para copiar)
  R.narrative = function (state, r, scName, ctx) {
    const t = document.createElement('div');
    return R.claves(state, ctx || { active: r }).map((h) => { t.innerHTML = h; return t.textContent; });
  };

  R.build = function (state, ctx, opts) {
    opts = opts || {};
    const F = f(), I = A.informe, r = ctx.active, e = state.empresa, inv = state.inversion;
    const sc = A.SCENARIOS.find((s) => s.key === state.escenario);
    const sec = A.SECTORS[state.sector];
    const inc = opts.scenarios || A.SCENARIOS.map((s) => s.key);
    const sinInv = sinInversion(state), sinEq = sinEquipo(state), ej = !!opts.ejemplo;
    const empresa = ej ? (opts.nombreEjemplo || 'Empresa de ejemplo, S.L.') : (state.empresaNombre || 'La empresa');
    const L = luces(state, r), rojos = L.filter((l) => l.estado === 'stop'), ambar = L.filter((l) => l.estado === 'warn');
    // Sin inversión los escenarios coinciden: se informa una sola proyección, la de referencia
    const esc0 = sinInv ? ctx.all.filter((x) => x.key === state.escenario) : ctx.all.filter((x) => inc.indexOf(x.key) >= 0);
    const hoy = new Date(), mes0 = hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const P = ctx.plan, hu = r.humano, t = r.tamano;
    let h = '';
    I.reset();
    // En papel, la portada y el resumen fluyen: un resumen largo sigue en la hoja siguiente sin arrastrar la ficha
    const fluye = (x, cls, st) => x.replace(`class="${cls}`, `style="${st}" class="${cls}`);
    h += fluye(I.cover({ tipo: ej ? 'Caso ilustrativo' : sinInv ? 'Informe de situación' : 'Informe de decisión', kicker: sinInv ? 'Situación financiera de partida' : 'Decisión de inversión',
      titulo: sinInv ? 'Situación de partida y capacidad de inversión' : (state.proyecto || 'Proyecto de inversión'),
      subtitulo: sinInv ? 'Proyección de la empresa a cinco años sin inversión' : `Vehículo analizado: ${min(A.STRUCTURES[state.estructura].nombre)}`,
      empresa, sector: sec.nombre,
      ambito: sinInv ? 'Liquidez, deuda y costes de la empresa' : 'Viabilidad financiera y organizativa de la inversión',
      periodo: `60 meses desde ${mes0} · escenario ${min(sc.nombre)}` }), 'rp-cover"', 'break-after:auto;page-break-after:auto');

    /* Resumen ejecutivo: la conclusión primero */
    const vk = vKey[r.verdict.key];
    const concl = conclusion(state, r, L);
    const vkS = sinInv ? (r.cajaRef < 0 || rojos.length ? 'stop' : ambar.length ? 'warn' : 'ok') : vk;
    h += fluye(I.summary('Resumen ejecutivo', `<h3 class="rp-verdict">${esc(concl)} ${pill(vkS, stTxt[vkS])}</h3>
      <p>${sinInv ? `${esc(empresa)} factura ${F.eur(e.ventas)} al año.` : `${esc(empresa)} estudia invertir ${F.eur(r.dim.inversion)} en «${esc(state.proyecto || 'el proyecto')}».`} En el escenario ${min(sc.nombre)}, ${rojos.length ? `${pl(rojos.length, 'indicador', 'indicadores')} de ${L.length} ${rojos.length === 1 ? 'queda' : 'quedan'} en rojo (${lista(rojos.map((l) => min(l.nombre)))})` : `ninguno de los ${L.length} indicadores queda en rojo`}${ambar.length ? ` y ${ambar.length} en ámbar (${lista(ambar.map((l) => min(l.nombre)))})` : ''}.</p>
      <ul>${R.claves(state, ctx).map((x) => `<li>${x}</li>`).join('')}</ul>`, vkS), 'rp-summary', 'break-inside:auto;page-break-inside:auto');
    if (ej) h += I.callout(`<b>Caso ilustrativo.</b> Las cifras de este documento corresponden a una empresa industrial tipo de ${F.eur(e.ventas)} de ventas que estudia una línea de producción. No proceden de las cuentas de ninguna empresa real.`, 'info');

    /* 01 · Situación de partida */
    const ebPct = t.antes.ebitdaPct;
    const dias = (v) => `${dec(v, 0)} días`;
    // Fila con referencia sectorial y diferencia (solo donde el perfil del sector la tiene)
    const filaRef = (n, v, rf, fn, fd, pre) => `<tr><td>${n}</td><td>${fn(v)}</td><td>${rf > 0 ? (pre || '') + fn(rf) : '—'}</td><td>${rf > 0 ? signo(v - rf, fd) : '—'}</td></tr>`;
    const fila1 = (n, v) => `<tr><td>${n}</td><td>${v}</td><td>—</td><td>—</td></tr>`;
    const dDias = (v) => `${dec(v, 0)} días`;
    h += I.section(`${ej ? 'La empresa' : esc(empresa)} factura ${F.eur(e.ventas)} con un EBITDA de ${F.eur(t.antes.ebitda)} (${F.pct(ebPct)} de las ventas)`,
      `<div class="table-wrap"><table><thead><tr><th>Magnitud</th><th>Empresa</th><th>Referencia del sector</th><th>Diferencia</th></tr></thead><tbody>
      ${fila1('Ventas (próximos doce meses, sin inversión)', F.eur(t.antes.ventas))}
      ${filaRef('Margen bruto', t.antes.margen, sec.margen, F.pct, F.pp)}
      ${fila1('EBITDA', `${F.eur(t.antes.ebitda)} (${F.pct(ebPct)})`)}
      ${fila1('Plantilla', `${F.num(t.antes.plantilla)} personas`)}
      ${filaRef('Peso salarial sobre ventas', t.antes.pesoSalarial, sec.pesoSalarialMax, F.pct, F.pp, 'máx. ')}
      ${fila1('Punto de equilibrio', F.eur(t.antes.equilibrio))}
      ${fila1('Caja', F.eur(e.caja))}
      ${fila1('Deuda financiera viva', F.eur(e.deudaViva))}
      ${r.deudaEbitdaPre >= 99 ? fila1('Deuda neta sobre EBITDA', 'No calculable (EBITDA no positivo)') : filaRef('Deuda neta sobre EBITDA', r.deudaEbitdaPre, sec.deudaEbitdaMax, F.x, F.x, 'máx. ')}
      ${filaRef('Plazo de cobro a clientes', e.dso, sec.dso, dias, dDias)}
      ${filaRef('Rotación de existencias', e.dio, sec.dio, dias, dDias)}
      ${filaRef('Plazo de pago a proveedores', e.dpo, sec.dpo, dias, dDias)}</tbody></table></div>`,
      `Punto de partida de la proyección. ${e.dso + e.dio - e.dpo > 0 ? `El ciclo de caja es de ${dec(e.dso + e.dio - e.dpo, 0)} días: la empresa financia ese plazo entre que paga a sus proveedores y cobra de sus clientes.` : 'La empresa cobra antes de pagar: su ciclo de caja no consume financiación.'}`);

    /* 02 · Dimensión */
    if (!sinInv) h += I.section(`La inversión de ${F.eur(r.dim.inversion)} equivale a ${isFinite(r.dim.sobreEbitda) ? F.x(r.dim.sobreEbitda) + ' el EBITDA actual' : F.pct(r.dim.sobreVentas * 100) + ' de las ventas'} y al ${F.pct(r.dim.sobreFondos * 100)} de los fondos propios`,
      `<div class="cols">
      <div><span>Inversión total</span><b>${F.eur(r.dim.inversion)}</b></div>
      <div><span>Sobre ventas</span><b>${F.pct(r.dim.sobreVentas * 100)}</b></div>
      <div><span>Veces el EBITDA actual</span><b>${F.x(r.dim.sobreEbitda)}</b></div>
      <div><span>Sobre fondos propios</span><b>${F.pct(r.dim.sobreFondos * 100)}</b></div>
      <div><span>Préstamo nuevo</span><b>${F.eur(r.loan)}</b></div>
      <div><span>Cuota mensual</span><b>${F.eur(r.cuotaNueva)}</b></div></div>
      <p>La empresa financia el ${inv.pctFin} % con un préstamo a ${dec(inv.plazo)} años al ${F.pct(inv.tipo)}${inv.carencia > 0 ? `, con ${inv.carencia} meses de carencia` : ''}, y aporta ${F.eur(Math.max(0, r.ownOutlay))} de su caja. ${r.polLim ? (r.polizaMax > 1 ? `La póliza de crédito de ${F.eur(r.polLim)} llega a utilizarse hasta ${F.eur(r.polizaMax)} (mes ${r.mesPolMax}) y cuesta ${F.eur(r.costePolizaTotal)} en cinco años.` : `La póliza de crédito de ${F.eur(r.polLim)} no llega a utilizarse; mantenerla disponible cuesta ${F.eur(r.costePolizaTotal)} en comisiones en cinco años.`) : ''}</p>`,
      `Por su peso sobre las ventas (${F.pct(r.dim.sobreVentas * 100)}), es una inversión ${r.dim.clase.toLowerCase()}.`);

    /* 03 · Escenarios */
    const rotos = esc0.filter((x) => x.r.cajaRef < 0), nE = esc0.length;
    const titEsc = sinInv ? (r.cajaRef < 0 ? `Sin invertir, la liquidez queda en negativo: faltarían ${F.eur(-r.cajaRef)} en el mes ${r.mesCajaRef}` : `Sin invertir, la liquidez se mantiene positiva: su mínimo es de ${F.eur(r.cajaRef)} en el mes ${r.mesCajaRef}`) : !nE ? 'Escenarios' : !rotos.length ? `La liquidez se mantiene positiva en los ${NUM[nE] || nE} escenarios analizados` : rotos.length === nE ? (nE === 1 ? `La liquidez queda en negativo en el escenario ${min(rotos[0].nombre)}` : `La liquidez queda en negativo en los ${NUM[nE] || nE} escenarios analizados`) : `La liquidez queda en negativo en ${rotos.length} de ${nE} escenarios: ${lista(rotos.map((x) => min(x.nombre)))}`;
    let he = `<div class="table-wrap"><table><thead><tr><th>Escenario</th><th>Liquidez mínima</th><th>Mes</th><th>Meses de gastos cubiertos</th><th>Caja a 5 años</th>${sinInv ? '' : '<th>Recuperación</th>'}<th>Cobertura de cuotas (DSCR mín.)</th><th>Deuda neta / EBITDA</th>${sinInv ? '' : '<th>Valor actual neto (VAN)</th><th>Conclusión</th>'}</tr></thead><tbody>`;
    esc0.forEach((x) => { const q = x.r; he += `<tr><td>${x.nombre}</td><td>${F.eur(q.cajaRef)}</td><td>${q.mesCajaRef}</td><td>${dec(q.colMin)}</td><td>${F.eur(q.cajaFinal)}</td>${sinInv ? '' : `<td>${F.months(q.payback)}</td>`}<td>${F.x(q.dscrMin)}</td><td>${F.x(q.deudaEbitda)}</td>${sinInv ? '' : `<td>${F.eur(q.van)}</td><td>${pill(vKey[q.verdict.key], CORTA[q.verdict.titulo] || q.verdict.titulo)}</td>`}</tr>`; });
    he += `</tbody></table></div><div class="chart" id="repCash" style="margin-top:14px"></div>`;
    if (!sinInv) he += `<p><b>Qué supone cada escenario.</b></p><ul>${esc0.map((x) => `<li><b>${x.nombre}.</b> ${esc(descEscenario(x, state))}</li>`).join('')}</ul>`;
    const peor = esc0.slice().sort((a, b) => a.r.cajaRef - b.r.cajaRef)[0];
    h += I.section(titEsc, he, sinInv ? `Proyección de la empresa a cinco años con su actividad actual. Los meses se cuentan desde ${mes0} (mes 1 = el mes siguiente).` : nE ? `${rotos.length ? `${nE > 1 ? `En el peor caso (${min(peor.nombre)}) faltarían` : 'Faltarían'} ${F.eur(-peor.r.cajaRef)} en el mes ${peor.r.mesCajaRef}.` : `${nE > 1 ? `En el peor caso (${min(peor.nombre)}) la` : 'La'} liquidez mínima es de ${F.eur(peor.r.cajaRef)} en el mes ${peor.r.mesCajaRef}.`} Los meses se cuentan desde ${mes0} (mes 1 = el mes siguiente).` : '');

    /* 04 · Indicadores de decisión */
    const titLuz = rojos.length ? `${may(NUM[rojos.length] || String(rojos.length))} de los ${NUM[L.length] || L.length} indicadores de decisión ${rojos.length === 1 ? 'está' : 'están'} en rojo: ${lista(rojos.map((l) => min(l.nombre)))}` : ambar.length ? `Ningún indicador de decisión está en rojo; ${ambar.length === 1 ? 'uno requiere' : (NUM[ambar.length] || ambar.length) + ' requieren'} seguimiento` : `Los ${NUM[L.length] || L.length} indicadores de decisión están en verde`;
    h += I.section(titLuz, `<div class="table-wrap"><table><thead><tr><th>Indicador</th><th>Valor</th><th>Estado</th><th>Umbral verde</th><th>Umbral rojo</th><th style="text-align:left">Lectura e implicación</th></tr></thead><tbody>${L.map((l) => `<tr><td>${l.nombre}</td><td>${l.valor}</td><td>${pill(l.estado, stTxt[l.estado])}</td><td>${l.rangos.ok}</td><td>${l.rangos.stop}</td><td ${TD.replace('"', '"min-width:200px;')}>${(sinInv && SIN_INV[l.key] && SIN_INV[l.key](r, F)[0]) || l.lectura}${l.estado !== 'ok' ? ' ' + (sinInv && SIN_INV[l.key] ? SIN_INV[l.key](r, F)[1] : l.def.consejo) : ''}</td></tr>`).join('')}</tbody></table></div>`,
      `Valores en el escenario ${min(sc.nombre)}. Entre el umbral verde y el rojo, el indicador está en ámbar.`);

    /* 05 · Nuevo tamaño */
    if (!sinInv) {
      const fila = (n, a, d, fn, dif) => `<tr><td>${n}</td><td>${fn(a)}</td><td>${fn(d)}</td><td>${dif}</td></tr>`;
      const pc = (a, d) => (a ? signo((d / a - 1) * 100, F.pct) : '—'), pt = (a, d) => signo(d - a, F.pp);
      h += I.section(`La empresa pasaría de ${F.eur(t.antes.ventas)} a ${F.eur(t.despues.ventas)} de ventas y de ${F.num(t.antes.plantilla)} a ${F.num(t.despues.plantilla)} personas`,
        `<div class="table-wrap"><table><thead><tr><th>Magnitud</th><th>Hoy</th><th>Régimen de crucero</th><th>Variación</th></tr></thead><tbody>
        ${fila('Ventas', t.antes.ventas, t.despues.ventas, F.eur, pc(t.antes.ventas, t.despues.ventas))}
        ${fila('Margen bruto', t.antes.margen, t.despues.margen, F.pct, pt(t.antes.margen, t.despues.margen))}
        <tr><td>EBITDA</td><td>${F.eur(t.antes.ebitda)} (${F.pct(t.antes.ebitdaPct)})</td><td>${F.eur(t.despues.ebitda)} (${F.pct(t.despues.ebitdaPct)})</td><td>${t.antes.ebitda > 0 ? pc(t.antes.ebitda, t.despues.ebitda) : '—'}</td></tr>
        ${fila('Plantilla', t.antes.plantilla, t.despues.plantilla, F.num, signo(t.despues.plantilla - t.antes.plantilla, F.num) + ' personas')}
        ${fila('Peso salarial', t.antes.pesoSalarial, t.despues.pesoSalarial, F.pct, pt(t.antes.pesoSalarial, t.despues.pesoSalarial))}
        ${fila('Ventas por persona', t.antes.ventasEmpleado, t.despues.ventasEmpleado, F.eur, pc(t.antes.ventasEmpleado, t.despues.ventasEmpleado))}
        ${fila('Punto de equilibrio', t.antes.equilibrio, t.despues.equilibrio, F.eur, pc(t.antes.equilibrio, t.despues.equilibrio))}</tbody></table></div>
        <p><b>Implicación.</b> El punto de equilibrio sube a ${F.eur(t.despues.equilibrio)}: la empresa necesita vender ${F.eur(Math.max(0, t.despues.equilibrio - t.antes.equilibrio))} más al año solo para cubrir la nueva estructura de costes. En el pico, el crecimiento inmoviliza ${F.eur(r.wcPeak)} adicionales en clientes y existencias.</p>`,
        `Comparación entre los próximos doce meses sin el proyecto y el primer año completo a pleno rendimiento (desde el mes ${t.mesCrucero}).`);
    }

    /* 06 · Organización */
    if (!sinEq) {
      const deb = hu.dims.slice().sort((a, b) => a.score - b.score).slice(0, 2);
      h += I.section(`La organización alcanza ${Math.round(hu.score)} sobre 100 de preparación; sus puntos críticos son ${lista(deb.map((d) => min(d.nombre)))}`,
        `<div class="table-wrap"><table><thead><tr><th>Dimensión</th><th>Puntuación</th><th style="text-align:left">Lectura</th></tr></thead><tbody>${hu.dims.map((d) => `<tr><td>${d.nombre}</td><td>${pill(d.score >= 70 ? 'ok' : d.score >= 50 ? 'warn' : 'stop', String(Math.round(d.score)))}</td><td ${TD}>${d.lectura}</td></tr>`).join('')}</tbody></table></div>`,
        `Plantilla final de ${hu.total} personas${hu.nuevas ? `, con ${pl(hu.nuevas, 'incorporación', 'incorporaciones')} (+${Math.round(hu.crec * 100)} %)` : ''}. Puntuación de 0 a 100 por dimensión: verde desde 70, rojo por debajo de 50.`);
    }

    /* 07 · Vehículo societario */
    const best = ctx.structs && ctx.structs[0], act = ctx.structs && ctx.structs.find((s) => s.key === state.estructura);
    if (!sinInv && best) {
      h += I.section(best.key === state.estructura ? `El vehículo analizado (${min(best.nombre)}) es el de mejor encaje: ${Math.round(best.score)} sobre 100` : `Vehículo de mejor encaje: ${min(best.nombre)}, con ${Math.round(best.score)} sobre 100; el analizado (${min(act.nombre)}) obtiene ${Math.round(act.score)}`,
        `<div class="table-wrap"><table><thead><tr><th>Vehículo</th><th>Encaje (0-100)</th><th>Liquidez mínima</th><th>Recuperación</th><th>Tamaño pleno</th><th>Control de los socios actuales</th><th>Metas cumplidas</th></tr></thead><tbody>${ctx.structs.map((s) => `<tr><td>${s.nombre}${s.key === state.estructura ? ' (analizado)' : ''}</td><td>${Math.round(s.score)}</td><td>${F.eur(s.r.cajaRef)}</td><td>${F.months(s.r.payback)}</td><td>mes ${s.mesPleno}${s.enPlazo ? '' : ' (fuera de plazo)'}</td><td>${s.control} %</td><td>${s.metasOk} de 5</td></tr>`).join('')}</tbody></table></div>
        <p><b>${best.nombre}.</b> ${A.structCaso ? A.structCaso(state, best) : best.desc}</p>${best.key !== state.estructura ? `<p><b>Implicación.</b> Con este vehículo la liquidez mínima sería de ${F.eur(best.r.cajaRef)}, frente a ${F.eur(act.r.cajaRef)} con ${min(act.nombre)}, y los socios actuales conservarían el ${best.control} % del negocio nuevo.</p>` : ''}`,
        'Seis formas de articular la misma inversión, ordenadas por su encaje con los objetivos de la dirección. El anexo B explica cómo se calcula cada columna.');
    }

    /* 08 · Riesgos y oportunidades */
    if (!sinInv && ctx.risks) {
      const S = ctx.sens ? Object.fromEntries(ctx.sens.rows.map((x) => [x.key, x])) : {}, base = ctx.sens ? ctx.sens.base : 0;
      const rk = ctx.risks.filter((k) => !(sinEq && (k.key === 'mando' || k.key === 'talento')));
      const top = rk[0];
      let hr = `<div class="table-wrap"><table><thead><tr><th>Riesgo</th><th>Probabilidad (1-5)</th><th>Impacto (1-5)</th><th>Nivel</th><th>Efecto en la liquidez mínima</th><th style="text-align:left">Supuesto y mitigación</th></tr></thead><tbody>${rk.map((k) => `<tr><td>${k.nombre}</td><td>${k.prob}</td><td>${k.impacto}</td><td>${pill(k.estado, k.nivel)}</td><td>${S[k.key] ? (S[k.key].lo - base < -500 ? signo(S[k.key].lo - base, F.eur) : 'No la reduce') : 'No cuantificado'}</td><td ${TD}>${S[k.key] ? '<b>Supuesto:</b> ' + min(SENS[k.key][0]) + '. ' : ''}${k.mitigacion}</td></tr>`).join('')}</tbody></table></div>`;
      const op = Object.keys(SENS).filter((k) => S[k] && S[k].hi - base > 500).sort((a, b) => (S[b].hi - base) - (S[a].hi - base)).map((k) => [SENS[k][1], signo(S[k].hi - base, F.eur) + ' de liquidez mínima']);
      const opt = ctx.all.find((x) => x.key === 'optimista'), bs = ctx.all.find((x) => x.key === 'base');
      if (opt && bs) op.push(['Se cumple el escenario optimista (un 15 % más de venta, rampa un mes antes y mejor margen)', `VAN de ${F.eur(opt.r.van)} frente a ${F.eur(bs.r.van)} en el base; caja a cinco años de ${F.eur(opt.r.cajaFinal)} frente a ${F.eur(bs.r.cajaFinal)}`]);
      if (best && act && best.key !== state.estructura && best.r.cajaRef > act.r.cajaRef) op.push([`Articular la inversión mediante ${min(best.nombre)}`, signo(best.r.cajaRef - act.r.cajaRef, F.eur) + ' de liquidez mínima']);
      if (op.length) hr += `<h3>Oportunidades</h3><div class="table-wrap"><table><thead><tr><th style="text-align:left">Si…</th><th style="text-align:left">Efecto estimado</th></tr></thead><tbody>${op.map((o) => `<tr><td ${TD}>${o[0]}</td><td ${TD}>${o[1]}</td></tr>`).join('')}</tbody></table></div>`;
      h += I.section(top ? `Riesgos y oportunidades: el riesgo principal es «${min(top.nombre)}»${S[top.key] && S[top.key].lo - base < -500 ? `, que restaría ${F.eur(Math.abs(S[top.key].lo - base))} a la liquidez mínima` : ''}` : 'Riesgos y oportunidades', hr,
        `Nivel = probabilidad × impacto (rojo desde 15, ámbar desde 8). El efecto se mide sobre la liquidez mínima del escenario ${min(sc.nombre)} (${F.eur(base)}).`);
    }

    /* 09 · Recomendaciones */
    const orgAcc = sinEq ? [] : hu.acciones.slice().sort((a, b) => a.cuando - b.cuando);
    let hrec = '', titRec = 'Recomendaciones';
    if (P) {
      const [a0, d0] = metaRef(P);
      const metas = P.antes.metas.map((m, i) => [m, P.despues.metas[i]]).filter(([m]) => !(sinInv && m.key === 'payback'));
      if (P.ok) { titRec = `La empresa cumple sus ${NUM[metas.length] || metas.length} metas financieras: no hacen falta medidas correctoras`; hrec += `<p>En el escenario ${min(sc.nombre)} se cumplen todas las metas fijadas por la dirección. La recomendación es ${sinInv ? 'mantener' : 'avanzar y mantener'} el seguimiento mensual de los indicadores${ambar.length ? `, en particular de ${lista(ambar.map((l) => min(l.nombre)))}` : ''}.</p>`; }
      else {
        titRec = P.acciones.length ? `${may(NUM[P.acciones.length] || String(P.acciones.length))} ${P.acciones.length === 1 ? 'medida lleva' : 'medidas llevan'} la ${min(a0.nombre)} de ${a0.f(a0.valor)} a ${d0.f(d0.valor)}` : (sinInv ? 'Recomendación: corregir la rentabilidad y la financiación antes de plantear una inversión' : 'Las metas no se alcanzan con ajustes: el proyecto exige un rediseño');
        if (!sinInv) hrec += `<p><b>Recomendación.</b> ${r.verdict.key === 'stop' ? 'No comprometer la inversión en los términos actuales. Aplicar antes las medidas siguientes y revisar la decisión con sus resultados.' : r.verdict.key === 'warn' ? 'Avanzar solo una vez aplicadas las medidas siguientes.' : 'Avanzar con la inversión y aplicar las medidas siguientes para cumplir las metas pendientes.'}</p>`;
        if (P.acciones.length) hrec += `<div class="table-wrap"><table><thead><tr><th>N.º</th><th style="text-align:left">Recomendación</th><th>De</th><th>A</th><th>Impacto en la liquidez mínima</th><th>Responsable</th><th>Plazo</th></tr></thead><tbody>${P.acciones.map((a, i) => `<tr><td>${i + 1}</td><td ${TD}>${a.lv.nombre}</td><td>${R.lv(a.lv, a.desde)}</td><td>${R.lv(a.lv, a.hasta)}</td><td>${signo(a.despues.cajaRef - a.antes.cajaRef, F.eur)} (hasta ${F.eur(a.despues.cajaRef)})</td><td>${a.lv.resp}</td><td>${PLAZO(a.lv.esfuerzo)}</td></tr>`).join('')}</tbody></table></div><p class="rp-muted">Ordenadas de la más sencilla a la más costosa. El impacto de cada una se mide una vez aplicadas las anteriores.</p>`;
        if (sinInv && !P.acciones.length) {
          const pend = metas.filter(([m]) => !m.ok && REC_META[m.key]);
          if (pend.length) hrec += `<p><b>Recomendación.</b> Aplazar cualquier decisión de inversión hasta corregir ${pend.length === 1 ? 'la meta pendiente' : 'las ' + (NUM[pend.length] || pend.length) + ' metas pendientes'}.</p><div class="table-wrap"><table><thead><tr><th>N.º</th><th style="text-align:left">Recomendación</th><th>Meta que corrige</th><th>Brecha que debe cerrar</th><th>Responsable</th><th>Plazo de inicio</th></tr></thead><tbody>${pend.map(([m], i) => `<tr><td>${i + 1}</td><td ${TD}>${REC_META[m.key][0]}</td><td>${m.nombre}</td><td>de ${m.f(m.valor)} a ${m.f(m.objetivo)}</td><td>${REC_META[m.key][1]}</td><td>${REC_META[m.key][2]}</td></tr>`).join('')}</tbody></table></div>`;
        }
        if (P.inalcanzables && P.inalcanzables.length) hrec += `<p><b>Metas que no se alcanzan ${P.acciones.length ? 'con estas medidas' : 'solo con medidas de financiación y de circulante'}:</b> ${lista(P.inalcanzables.map((m) => min(m.nombre)))}. ${sinInv ? 'Exigen actuar sobre la rentabilidad del negocio (margen y gastos fijos) o reforzar los fondos propios antes de plantear una inversión.' : 'Exigen rediseñar el proyecto: otro vehículo, otro tamaño de inversión o una revisión de la tesis comercial.'}</p>`;
      }
      hrec += `<h3>${P.acciones.length && !P.ok ? 'Efecto conjunto sobre las metas de la dirección' : 'Metas de la dirección'}</h3><div class="table-wrap"><table><thead><tr><th>Meta</th><th>Objetivo</th><th>Situación prevista</th>${P.acciones.length ? '<th>Con las recomendaciones</th>' : ''}</tr></thead><tbody>${metas.map(([m, d]) => `<tr><td>${m.nombre}</td><td>${m.f(m.objetivo)}</td><td>${pill(m.ok ? 'ok' : 'stop', m.f(m.valor))}</td>${P.acciones.length ? `<td>${pill(d.ok ? 'ok' : 'stop', d.f(d.valor))}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
      if (!sinInv && best && act && best.key !== state.estructura) hrec += `<p><b>Vehículo.</b> Las medidas anteriores mantienen el vehículo analizado (${min(act.nombre)}). Conviene estudiar además la alternativa de mejor encaje (${min(best.nombre)}), que obtiene ${Math.round(best.score)} sobre 100 frente a ${Math.round(act.score)} y deja la liquidez mínima en ${F.eur(best.r.cajaRef)}.</p>`;
    }
    if (orgAcc.length) hrec += `<h3>Medidas de organización</h3><div class="table-wrap"><table><thead><tr><th style="text-align:left">Medida</th><th>Coste estimado</th><th>Responsable</th><th>Inicio</th></tr></thead><tbody>${orgAcc.map((a) => `<tr><td ${TD}>${a.que}</td><td>${a.coste ? F.eur(a.coste) : 'Sin coste externo'}</td><td>Dirección general</td><td>Mes ${a.cuando}</td></tr>`).join('')}</tbody></table></div><p class="rp-muted">Coste estimado conjunto: ${F.eur(orgAcc.reduce((s, a) => s + (a.coste || 0), 0))}.</p>`;
    if (hrec) h += I.section(titRec, hrec, P && !P.ok ? `Medidas calculadas sobre el escenario ${min(sc.nombre)}${sinInv ? '' : ' y el vehículo analizado (' + min(A.STRUCTURES[state.estructura].nombre) + ')'}.` : '');

    /* 10 · Hoja de ruta */
    const acc = P && !P.ok ? P.acciones : [];
    const fin = acc.filter((a) => a.lv.esfuerzo <= 1).map((a) => min(a.lv.nombre)), ops = acc.filter((a) => a.lv.esfuerzo === 2).map((a) => min(a.lv.nombre)), est = acc.filter((a) => a.lv.esfuerzo >= 3).map((a) => min(a.lv.nombre));
    const org = (a, b) => orgAcc.filter((x) => x.cuando >= a && x.cuando <= b).map((x) => min(x.que));
    const pendR = sinInv && P && !P.ok && !P.acciones.length ? P.antes.metas.filter((m) => !m.ok && REC_META[m.key]) : [];
    const recR = (pz) => pendR.filter((m) => REC_META[m.key][2] === pz).map((m) => min(REC_META[m.key][0]));
    const frase = (xs) => xs.filter(Boolean).map((x) => may(x).replace(/\.$/, '') + '.').join(' ');
    const ruta = [
      ['0-30 días', frase([fin.length ? 'Negociar con las entidades financieras: ' + lista(fin) : '', ...recR('0-30 días'), ...org(0, 1), !fin.length && !org(0, 1).length && !recR('0-30 días').length ? 'Validar los supuestos de este informe con la dirección' : '']), fin.length ? 'Condiciones de financiación confirmadas por escrito' : 'Supuestos validados y responsables nombrados'],
      ['30-90 días', frase([ops.length ? 'Implantar: ' + lista(ops) : 'Revisar el circulante y la estructura de costes', ...recR('30-90 días'), ...org(2, 3), 'Poner en marcha el seguimiento mensual de los indicadores de decisión']), 'Primer cierre mensual con los indicadores de decisión'],
      ['90-180 días', frase([...recR('90-180 días'), est.length ? 'Decidir: ' + lista(est) : sinInv ? (pendR.length ? 'Valorar un proyecto de inversión solo con las metas ya cumplidas' : 'Definir el proyecto de inversión y su financiación') : 'Confirmar el calendario de inversión y de contratación', ...org(4, 6), 'Revisar la proyección con las cifras reales de los primeros meses']), sinInv ? (pendR.length ? 'Metas de liquidez y deuda revisadas con cifras reales' : 'Proyecto de inversión definido y cuantificado') : 'Decisión definitiva de inversión con cifras reales']
    ];
    h += I.section('Hoja de ruta: tres hitos en 180 días', `<div class="table-wrap"><table><thead><tr><th>Horizonte</th><th style="text-align:left">Actuaciones</th><th style="text-align:left">Hito de control</th></tr></thead><tbody>${ruta.map((x) => `<tr><td>${x[0]}</td><td ${TD}>${x[1]}</td><td ${TD}>${x[2]}</td></tr>`).join('')}</tbody></table></div>`);

    /* Anexos */
    h += `<h2><span class="rp-n">A</span>Anexo A · Supuestos de la proyección</h2><div class="table-wrap"><table><tbody>
      <tr><td>Ventas actuales</td><td>${F.eur(e.ventas)}</td><td>Margen bruto</td><td>${F.pct(e.margen)}</td></tr>
      <tr><td>Gastos de personal</td><td>${F.eur(e.personal)}</td><td>Otros gastos fijos</td><td>${F.eur(e.fijos)}</td></tr>
      <tr><td>Caja</td><td>${F.eur(e.caja)}</td><td>Deuda viva</td><td>${F.eur(e.deudaViva)}</td></tr>
      <tr><td>Cobro / existencias / pago</td><td>${e.dso} / ${e.dio} / ${e.dpo} días</td><td>Crecimiento orgánico anual</td><td>${F.pct(e.crecimiento)}</td></tr>
      ${sinInv ? '' : `<tr><td>Inversión</td><td>${F.eur(r.dim.inversion)}</td><td>Financiación</td><td>${inv.pctFin} % a ${dec(inv.plazo)} años, ${F.pct(inv.tipo)}, carencia de ${inv.carencia} meses</td></tr>
      <tr><td>Venta nueva a pleno rendimiento</td><td>+${inv.incVentas} %</td><td>Rampa comercial</td><td>${inv.rampa} meses desde el mes ${inv.mesInicio}</td></tr>
      <tr><td>Margen de la actividad nueva</td><td>${F.pct(inv.margenNuevo)}</td><td>Contrataciones</td><td>${inv.contrataciones} × ${F.eur(inv.salario)}</td></tr>`}
      <tr><td>Metas de la dirección</td><td colspan="3" ${TD}>Liquidez mínima de ${F.eur(state.meta.cajaMin)}${sinInv ? '' : `; recuperación en ${dec(state.meta.paybackMax)} años como máximo`}; cobertura de cuotas de ${F.x(state.meta.dscrMin)} como mínimo; deuda neta de ${F.x(state.meta.deudaEbitdaMax)} el EBITDA como máximo; peso salarial del ${F.pct(state.meta.pesoSalarialMax)} como máximo.</td></tr>
      <tr><td>Contingencias incluidas</td><td colspan="3" ${TD}>${(state.hipotesis || []).filter((x) => x.activo).map((x) => `${A.SHOCKS[x.tipo].nombre} (mes ${x.mes}, ${x.magnitud} ${A.SHOCKS[x.tipo].unidad})`).join('; ') || 'Ninguna'}</td></tr>
      </tbody></table></div>`;
    const G = A.STRUCT_GLOSA || {};
    const lim = [
      'Las cifras son proyecciones: dependen de los supuestos del anexo A y cambian si cambian estos. No son una previsión contable ni una garantía de resultado.',
      'El análisis no sustituye el asesoramiento financiero, fiscal ni legal. La fiscalidad de cada vehículo societario y las garantías bancarias deben contrastarse con los asesores de la empresa.',
      sinInv ? 'La empresa no ha definido todavía un proyecto de inversión: el documento no valora retorno, rentabilidad, nuevo tamaño ni vehículo societario.' : '',
      sinEq ? 'No se ha dispuesto de información sobre la organización (mandos, rotación, procesos y carga de trabajo): el análisis no valora la preparación del equipo ni los riesgos de gestión y de talento.' : '',
      !sinInv && inc.length < A.SCENARIOS.length ? `El análisis de escenarios se limita a ${lista(esc0.map((x) => min(x.nombre)))}.` : '',
      ej ? 'Caso ilustrativo: las cifras de partida son las de una empresa industrial tipo y no proceden de cuentas reales.' : ''
    ].filter(Boolean);
    h += `<h2><span class="rp-n">B</span>Anexo B · Metodología, fuentes y limitaciones</h2>
      <h3>Metodología</h3><ul>
      <li>Proyección mensual a 60 meses de ventas, márgenes, gastos, circulante, deuda y caja, con impuesto de sociedades del ${e.impuesto} %, préstamos con cuota constante (sistema francés) y circulante calculado sobre los días de cobro, existencias y pago.</li>
      ${sinInv ? '' : '<li>La proyección se repite con y sin la inversión, y en cinco escenarios (estrés, pesimista, base, optimista y el propio de la dirección). Los riesgos se cuantifican con un análisis de sensibilidad sobre la liquidez mínima.</li>'}
      <li>Unidades: k€ son miles de euros (150 k€ = 150.000 €) y M€, millones (4,2 M€ = 4.200.000 €). EBITDA es el resultado bruto de explotación, antes de amortizaciones, intereses e impuestos. DSCR es el número de veces que el flujo del negocio cubre las cuotas de la deuda.</li>
      ${sinInv ? '' : `<li><b>Encaje del vehículo.</b> Puntuación de 0 a 100: liquidez (hasta 25), plazo (20), control (15), aislamiento del riesgo (15), sencillez (10) y metas cumplidas (15). Por encima de 70 encaja bien; entre 50 y 70, con matices; por debajo de 50, no conviene. <b>Control:</b> parte del negocio nuevo, y de las decisiones sobre él, que conservan los socios actuales. <b>Tamaño pleno:</b> ${min(G.pleno || '')} <b>Metas cumplidas:</b> cuántas de las cinco metas de la dirección (liquidez mínima, recuperación, cobertura de las cuotas, deuda sobre EBITDA y peso salarial) cumple cada vehículo en el escenario ${min(sc.nombre)}.</li>`}
      </ul><h3>Fuentes</h3><p>${ej ? 'Cifras de una empresa industrial tipo, elaboradas como caso ilustrativo. ' + esc(fuentes(state).split('. ').slice(1).join('. ')) : esc(fuentes(state))}</p>
      <h3>Alcance y limitaciones</h3><ul>${lim.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    h += I.foot('Documento confidencial para la dirección y la propiedad de la empresa. Las cifras son proyecciones sujetas a los supuestos del anexo A.');
    return h;
  };

  R.lv = function (lv, v) {
    const F = f();
    if (lv.unidad === '€' || lv.unidad === '€/año') return F.eur(v) + (lv.unidad === '€/año' ? '/año' : '');
    return `${String(Math.round(v * 10) / 10).replace('.', ',')} ${lv.unidad}`;
  };

  /* Resumen ejecutivo en texto (para copiar y enviar) */
  R.text = function (state, ctx, opts) {
    opts = opts || {};
    const r = ctx.active, sinInv = sinInversion(state);
    const sc = A.SCENARIOS.find((s) => s.key === state.escenario);
    const empresa = opts.ejemplo ? (opts.nombreEjemplo || 'Empresa de ejemplo, S.L.') + ' (caso ilustrativo)' : (state.empresaNombre || 'La empresa');
    const L = luces(state, r);
    let t = `${empresa} · ${sinInv ? 'Situación de partida y capacidad de inversión' : state.proyecto || 'Proyecto de inversión'}\nResumen ejecutivo · ${A.informe ? A.informe.fecha() : ''} · Escenario ${min(sc.nombre)}\n\n`;
    t += `Conclusión: ${conclusion(state, r, L)}.\n\n`;
    t += R.narrative(state, r, sc.nombre, ctx).map((x) => '- ' + x).join('\n') + '\n\nIndicadores de decisión:\n';
    L.forEach((l) => { t += `- ${l.nombre}: ${l.valor} (${stTxt[l.estado]})\n`; });
    if (ctx.plan && !ctx.plan.ok && ctx.plan.acciones.length) {
      t += '\nRecomendaciones:\n';
      ctx.plan.acciones.forEach((a, i) => { t += `${i + 1}. ${a.lv.nombre}: de ${R.lv(a.lv, a.desde)} a ${R.lv(a.lv, a.hasta)}. Responsable: ${a.lv.resp}. Plazo: ${PLAZO(a.lv.esfuerzo)}.\n`; });
    }
    return t;
  };
})();
