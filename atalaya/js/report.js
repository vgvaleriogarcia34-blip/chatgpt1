/* Atalaya · Generador de informes por escenario con plan de corrección */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const R = (A.report = {});
  const f = () => A.fmt;
  const pill = (st, txt) => (A.informe ? A.informe.pill(st, txt) : `<span class="pill p-${st}">${txt}</span>`);
  const stTxt = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  const vKey = { go: 'ok', warn: 'warn', stop: 'stop' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  R.narrative = function (state, r, scName) {
    const F = f();
    const e = state.empresa;
    const parts = [];
    parts.push(`En el escenario ${scName.toLowerCase()}, la inversión de ${F.eur(r.dim.inversion)} es ${r.dim.clase.toLowerCase()} para una empresa que hoy factura ${F.eur(e.ventas)}: equivale a ${F.x(r.dim.sobreEbitda)} su EBITDA actual y al ${F.pct(r.dim.sobreFondos * 100)} de sus fondos propios.`);
    const liq = r.contarPoliza ? 'liquidez (caja más póliza disponible)' : 'caja';
    parts.push(r.cajaRef < 0
      ? `La tesorería se rompe: la ${liq} cae hasta ${F.eur(r.cajaRef)} en el mes ${r.mesCajaRef}. La empresa no puede afrontar el movimiento solo con su rentabilidad tal como está planteado.`
      : `La tesorería no se rompe: el punto más bajo de ${liq} es ${F.eur(r.cajaRef)} en el mes ${r.mesCajaRef}, con ${String(Math.round(r.colMin * 10) / 10).replace('.', ',')} meses de colchón${r.cajaRef < state.meta.cajaMin ? `, por debajo del mínimo exigido de ${F.eur(state.meta.cajaMin)}` : ''}.`);
    if (r.polLim) parts.push(r.polizaMax > 1 ? `La póliza de crédito de ${F.eur(r.polLim)} llega a usarse hasta ${F.eur(r.polizaMax)} (mes ${r.mesPolMax}) y cuesta ${F.eur(r.costePolizaTotal)} en cinco años.` : `La póliza de crédito de ${F.eur(r.polLim)} no llega a usarse; mantenerla disponible cuesta ${F.eur(r.costePolizaTotal)} en comisiones en cinco años.`);
    parts.push(`La cuota del préstamo nuevo será de ${F.eur(r.cuotaNueva)} al mes${r.cuotaCarencia > 0 && state.inversion.carencia > 0 ? ` (${F.eur(r.cuotaCarencia)} durante la carencia)` : ''}; junto a la deuda existente consume el ${F.pct(r.cuotaSobreEbitda)} del EBITDA mensual en crucero.`);
    parts.push(`El proyecto recupera la inversión en ${F.months(r.payback)} con su flujo operativo, y la caja de la propiedad vuelve al nivel que habría tenido sin invertir en ${F.months(r.paybackCaja)}.`);
    const d = r.tamano;
    parts.push(`La empresa pasa de ${F.eur(d.antes.ventas)} a ${F.eur(d.despues.ventas)} de venta anual y de ${F.num(d.antes.plantilla)} a ${F.num(d.despues.plantilla)} personas; el peso salarial queda en ${F.pct(d.despues.pesoSalarial)} y el margen bruto en ${F.pct(d.despues.margen)}.`);
    parts.push(`La preparación del sistema humano es de ${Math.round(r.humano.score)} sobre 100${r.humano.gapMandos ? `, con ${r.humano.gapMandos} mando${r.humano.gapMandos > 1 ? 's' : ''} intermedio${r.humano.gapMandos > 1 ? 's' : ''} por cubrir` : ''}.`);
    return parts;
  };

  R.build = function (state, ctx, opts) {
    const F = f();
    const r = ctx.active;
    const sc = A.SCENARIOS.find((s) => s.key === state.escenario);
    const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const sec = A.SECTORS[state.sector];
    const inc = opts.scenarios;
    let h = '';
    const I = A.informe;
    h += I.cover({ tipo: 'Informe de decisión', kicker: 'Decisión de inversión', titulo: state.proyecto, subtitulo: `Estructura: ${A.STRUCTURES[state.estructura].nombre} · Escenario de referencia: ${sc.nombre}`, empresa: state.empresaNombre, sector: sec.nombre });
    h += I.summary('Veredicto', `<h3 class="rp-verdict">${esc(r.verdict.titulo)} ${pill(vKey[r.verdict.key], stTxt[vKey[r.verdict.key]])}</h3><p>${r.verdict.texto}</p>`, vKey[r.verdict.key]);

    h += `<h2><span class="rp-n">01</span>Resumen ejecutivo</h2>`;
    h += R.narrative(state, r, sc.nombre).map((p) => `<p>${p}</p>`).join('');

    h += `<h2><span class="rp-n">02</span>Dimensión de la inversión</h2><div class="cols">
      <div><span>Inversión total</span><b>${F.eur(r.dim.inversion)}</b></div>
      <div><span>Sobre ventas</span><b>${F.pct(r.dim.sobreVentas * 100)}</b></div>
      <div><span>Años de EBITDA</span><b>${F.x(r.dim.sobreEbitda)}</b></div>
      <div><span>Sobre fondos propios</span><b>${F.pct(r.dim.sobreFondos * 100)}</b></div>
      <div><span>Préstamo</span><b>${F.eur(r.loan)}</b></div>
      <div><span>Cuota mensual</span><b>${F.eur(r.cuotaNueva)}</b></div></div>`;

    h += `<h2><span class="rp-n">03</span>Escenarios</h2><div class="table-wrap"><table><thead><tr><th>Escenario</th><th>Liquidez mín.</th><th>Mes</th><th>Colchón mín.</th><th>Caja a 5 años</th><th>Recuperación</th><th>DSCR mín.</th><th>Deuda/EBITDA</th><th>VAN</th><th>Veredicto</th></tr></thead><tbody>`;
    ctx.all.filter((x) => inc.indexOf(x.key) >= 0).forEach((x) => {
      const q = x.r;
      h += `<tr><td>${x.nombre}</td><td>${F.eur(q.cajaRef)}</td><td>${q.mesCajaRef}</td><td>${String(Math.round(q.colMin * 10) / 10).replace('.', ',')} m</td><td>${F.eur(q.cajaFinal)}</td><td>${F.months(q.payback)}</td><td>${F.x(q.dscrMin)}</td><td>${F.x(q.deudaEbitda)}</td><td>${F.eur(q.van)}</td><td>${pill(vKey[q.verdict.key], q.verdict.titulo)}</td></tr>`;
    });
    h += `</tbody></table></div><div class="chart" id="repCash" style="margin-top:14px"></div>`;
    ctx.all.filter((x) => inc.indexOf(x.key) >= 0).forEach((x) => { h += `<p><b>${x.nombre}.</b> ${x.desc}</p>`; });

    h += `<h2><span class="rp-n">04</span>Semáforos de movimiento</h2><div class="table-wrap"><table><thead><tr><th>Indicador</th><th>Lectura</th><th>Estado</th><th>Verde</th><th>Ámbar</th><th>Rojo</th><th style="text-align:left">Cómo corregirlo</th></tr></thead><tbody>`;
    r.lights.forEach((l) => { h += `<tr><td>${l.nombre}</td><td>${l.valor}</td><td>${pill(l.estado, stTxt[l.estado])}</td><td>${l.rangos.ok}</td><td>${l.rangos.warn}</td><td>${l.rangos.stop}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body);min-width:200px">${l.lectura} ${l.def.consejo}</td></tr>`; });
    h += `</tbody></table></div>`;

    const t = r.tamano;
    h += `<h2><span class="rp-n">05</span>Nuevo tamaño operativo</h2><p>Comparación entre los próximos doce meses sin el proyecto y el año de crucero (desde el mes ${t.mesCrucero}).</p><div class="table-wrap"><table><thead><tr><th>Magnitud</th><th>Hoy</th><th>Crucero</th></tr></thead><tbody>
      <tr><td>Ventas</td><td>${F.eur(t.antes.ventas)}</td><td>${F.eur(t.despues.ventas)}</td></tr>
      <tr><td>Margen bruto</td><td>${F.pct(t.antes.margen)}</td><td>${F.pct(t.despues.margen)}</td></tr>
      <tr><td>EBITDA</td><td>${F.eur(t.antes.ebitda)} (${F.pct(t.antes.ebitdaPct)})</td><td>${F.eur(t.despues.ebitda)} (${F.pct(t.despues.ebitdaPct)})</td></tr>
      <tr><td>Plantilla</td><td>${F.num(t.antes.plantilla)}</td><td>${F.num(t.despues.plantilla)}</td></tr>
      <tr><td>Peso salarial</td><td>${F.pct(t.antes.pesoSalarial)}</td><td>${F.pct(t.despues.pesoSalarial)}</td></tr>
      <tr><td>Ventas por persona</td><td>${F.eur(t.antes.ventasEmpleado)}</td><td>${F.eur(t.despues.ventasEmpleado)}</td></tr>
      <tr><td>Punto de equilibrio</td><td>${F.eur(t.antes.equilibrio)}</td><td>${F.eur(t.despues.equilibrio)}</td></tr></tbody></table></div>`;

    h += `<h2><span class="rp-n">06</span>Riesgos</h2><div class="table-wrap"><table><thead><tr><th>Riesgo</th><th>Prob.</th><th>Impacto</th><th>Nivel</th><th style="text-align:left">Mitigación</th></tr></thead><tbody>`;
    ctx.risks.forEach((k) => { h += `<tr><td>${k.nombre}</td><td>${k.prob}</td><td>${k.impacto}</td><td>${pill(k.estado, k.nivel)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${k.mitigacion}</td></tr>`; });
    h += `</tbody></table></div>`;

    const hu = r.humano;
    h += `<h2><span class="rp-n">07</span>Sistema operativo humano</h2><p>Preparación: <b>${Math.round(hu.score)}/100</b>. Plantilla final de ${hu.total} personas, ${hu.nuevas} incorporaciones (+${Math.round(hu.crec * 100)} %).</p><ul>`;
    hu.dims.forEach((d) => { h += `<li><b>${d.nombre} (${Math.round(d.score)}).</b> ${d.lectura}</li>`; });
    h += `</ul><h3>Lo que necesita para estarlo</h3><ul>`;
    hu.acciones.slice().sort((a, b) => a.cuando - b.cuando).forEach((a) => { h += `<li>Mes ${a.cuando}: ${a.que}${a.coste ? ` (coste estimado ${F.eur(a.coste)})` : ''}.</li>`; });
    h += `</ul>`;

    h += `<h2><span class="rp-n">08</span>Estructura societaria</h2><div class="table-wrap"><table><thead><tr><th>Vehículo</th><th>Encaje</th><th>Liquidez mínima</th><th>Recuperación</th><th>Tamaño pleno</th><th>Control</th><th>Metas</th></tr></thead><tbody>`;
    ctx.structs.forEach((s) => { h += `<tr><td>${s.nombre}${s.key === state.estructura ? ' (actual)' : ''}</td><td>${Math.round(s.score)}</td><td>${F.eur(s.r.cajaRef)}</td><td>${F.months(s.r.payback)}</td><td>mes ${s.mesPleno} ${s.enPlazo ? '' : '(fuera de plazo)'}</td><td>${s.control} %</td><td>${s.metasOk}/5</td></tr>`; });
    h += `</tbody></table></div><p>Mejor encaje para tus objetivos: <b>${ctx.structs[0].nombre}</b>. ${ctx.structs[0].desc}</p>`;

    const P = ctx.plan;
    h += `<h2><span class="rp-n">09</span>Plan de corrección hacia la posición meta</h2>`;
    h += `<div class="table-wrap"><table><thead><tr><th>Meta</th><th>Objetivo</th><th>Hoy</th><th>Tras el plan</th></tr></thead><tbody>`;
    P.antes.metas.forEach((m, i) => { const d = P.despues.metas[i]; h += `<tr><td>${m.nombre}</td><td>${m.f(m.objetivo)}</td><td>${pill(m.ok ? 'ok' : 'stop', m.f(m.valor))}</td><td>${pill(d.ok ? 'ok' : 'stop', d.f(d.valor))}</td></tr>`; });
    h += `</tbody></table></div>`;
    if (P.ok) h += `<p>El escenario ${sc.nombre.toLowerCase()} ya cumple todas las metas. No hace falta corregir; mantén la vigilancia de los semáforos en ámbar.</p>`;
    else {
      if (P.acciones.length) {
        h += `<h3>Acciones, de la más sencilla a la más costosa</h3><ol>`;
        P.acciones.forEach((a) => { h += `<li><b>${a.lv.nombre}:</b> de ${R.lv(a.lv, a.desde)} a ${R.lv(a.lv, a.hasta)}. Responsable: ${a.lv.resp}. Liquidez mínima ${F.eur(a.antes.cajaRef)} → ${F.eur(a.despues.cajaRef)}.</li>`; });
        h += `</ol>`;
      }
      if (P.inalcanzables && P.inalcanzables.length) h += `<p><b>No alcanzable solo con palancas:</b> ${P.inalcanzables.map((m) => m.nombre.toLowerCase()).join(', ')}. Exige rediseñar el proyecto (otra estructura, otro tamaño de inversión o revisar la tesis comercial).</p>`;
      h += `<h3>Hoja de ruta</h3><table><thead><tr><th>Horizonte</th><th style="text-align:left">Qué hacer</th></tr></thead><tbody>`;
      const fin = P.acciones.filter((a) => a.lv.esfuerzo === 1).map((a) => a.lv.nombre.toLowerCase());
      const ops = P.acciones.filter((a) => a.lv.esfuerzo === 2).map((a) => a.lv.nombre.toLowerCase());
      const est = P.acciones.filter((a) => a.lv.esfuerzo >= 3).map((a) => a.lv.nombre.toLowerCase());
      const hum = hu.acciones.filter((a) => a.cuando <= 3).map((a) => a.que.toLowerCase());
      h += `<tr><td>0-30 días</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${[...fin.map((x) => 'Negociar con la banca: ' + x), ...hum].join('. ') || 'Validar supuestos con la dirección.'}.</td></tr>`;
      h += `<tr><td>30-90 días</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${ops.length ? 'Implantar: ' + ops.join(', ') : 'Revisar circulante y estructura de costes.'}. Cuadro de mando mensual con los diez semáforos.</td></tr>`;
      h += `<tr><td>90-180 días</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${est.length ? 'Decidir: ' + est.join(', ') : 'Confirmar el calendario de inversión y contratación.'}. Revisar el escenario con datos reales de los primeros meses.</td></tr>`;
      h += `</tbody></table>`;
    }

    const e = state.empresa, inv = state.inversion;
    h += `<h2><span class="rp-n">10</span>Supuestos</h2><div class="table-wrap"><table><tbody>
      <tr><td>Ventas actuales</td><td>${F.eur(e.ventas)}</td><td>Margen bruto</td><td>${F.pct(e.margen)}</td></tr>
      <tr><td>Personal</td><td>${F.eur(e.personal)}</td><td>Otros fijos</td><td>${F.eur(e.fijos)}</td></tr>
      <tr><td>Caja</td><td>${F.eur(e.caja)}</td><td>Deuda viva</td><td>${F.eur(e.deudaViva)}</td></tr>
      <tr><td>Cobro / stock / pago</td><td>${e.dso} / ${e.dio} / ${e.dpo} días</td><td>Crecimiento orgánico</td><td>${F.pct(e.crecimiento)}</td></tr>
      <tr><td>Inversión</td><td>${F.eur(inv.importe)}</td><td>Financiado</td><td>${inv.pctFin} % a ${inv.plazo} años, ${F.pct(inv.tipo)}, carencia ${inv.carencia} m</td></tr>
      <tr><td>Venta nueva en crucero</td><td>+${inv.incVentas} %</td><td>Rampa</td><td>${inv.rampa} meses desde el mes ${inv.mesInicio}</td></tr>
      <tr><td>Margen actividad nueva</td><td>${F.pct(inv.margenNuevo)}</td><td>Contrataciones</td><td>${inv.contrataciones} × ${F.eur(inv.salario)}</td></tr>
      <tr><td>Hipótesis activas</td><td colspan="3" style="text-align:left;font-family:var(--font-body)">${(state.hipotesis || []).filter((x) => x.activo).map((x) => `${A.SHOCKS[x.tipo].nombre} (mes ${x.mes}, ${x.magnitud} ${A.SHOCKS[x.tipo].unidad})`).join('; ') || 'Ninguna'}</td></tr>
      </tbody></table></div>`;
    h += `<footer class="rp-foot"><span>Atalaya · Documento generado el ${A.informe ? A.informe.fecha() : ""}</span><span>Proyección mensual a 60 meses con impuesto de sociedades del ${e.impuesto} %, calendario de préstamo francés y circulante calculado sobre días de cobro, stock y pago. Es una herramienta de anticipación: las cifras dependen de los supuestos introducidos y no sustituyen el asesoramiento financiero, fiscal ni legal.</span></footer>`;
    return h;
  };

  R.lv = function (lv, v) {
    const F = f();
    if (lv.unidad === '€' || lv.unidad === '€/año') return F.eur(v) + (lv.unidad === '€/año' ? '/año' : '');
    return `${String(Math.round(v * 10) / 10).replace('.', ',')} ${lv.unidad}`;
  };

  R.text = function (state, ctx) {
    const r = ctx.active, F = f();
    const sc = A.SCENARIOS.find((s) => s.key === state.escenario);
    let t = `ATALAYA · ${state.empresaNombre} · ${state.proyecto}\nVeredicto (${sc.nombre}): ${r.verdict.titulo}. ${r.verdict.texto}\n\n`;
    t += R.narrative(state, r, sc.nombre).join('\n') + '\n\nSemáforos:\n';
    r.lights.forEach((l) => { t += `- ${l.nombre}: ${l.valor} (${stTxt[l.estado]})\n`; });
    if (!ctx.plan.ok && ctx.plan.acciones.length) {
      t += '\nPlan de corrección:\n';
      ctx.plan.acciones.forEach((a, i) => { t += `${i + 1}. ${a.lv.nombre}: de ${R.lv(a.lv, a.desde)} a ${R.lv(a.lv, a.hasta)} (${a.lv.resp})\n`; });
    }
    return t;
  };
})();
