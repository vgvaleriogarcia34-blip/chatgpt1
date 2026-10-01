/* Atalaya · Sistema estratégico · Operaciones: compras, logística, gestor de tiempos, Lean y personas */
(function () {
  const A = window.Atalaya, F = A.fmt, S = A.strat;
  const { $, $$, esc, css } = S;

  /* =========================================================
     Compras y proveedores
     ========================================================= */
  S.defaults.compras = { ejemplo: true, ahorroObjetivo: 3, proveedores: [
    { nombre: 'Aceros del Norte', compras: 720000, plazo: 60, alternativas: 2, criticidad: 5, calidad: 4, puntualidad: 92 },
    { nombre: 'Componentes Iber', compras: 410000, plazo: 45, alternativas: 4, criticidad: 3, calidad: 4, puntualidad: 96 },
    { nombre: 'Electrónica Levante', compras: 260000, plazo: 30, alternativas: 1, criticidad: 5, calidad: 3, puntualidad: 81 },
    { nombre: 'Embalajes Duero', compras: 140000, plazo: 60, alternativas: 6, criticidad: 2, calidad: 4, puntualidad: 97 },
    { nombre: 'Transportes Ruta', compras: 120000, plazo: 30, alternativas: 5, criticidad: 2, calidad: 3, puntualidad: 88 },
    { nombre: 'Tornillería Industrial', compras: 60000, plazo: 90, alternativas: 1, criticidad: 4, calidad: 4, puntualidad: 90 }
  ] };
  function compras() {
    const L = S.state.compras.proveedores; const tot = L.reduce((a, p) => a + S.num(p.compras), 0) || 1;
    const abc = S.abc(L, 'compras');
    const R = L.map((p) => { const imp = S.num(p.compras) / tot; const riesgo = S.num(p.criticidad) + (S.num(p.alternativas) <= 1 ? 2 : 0) + (S.num(p.calidad) < 3 ? 1 : 0) + (S.num(p.puntualidad) < 85 ? 1 : 0); const q = imp >= 0.15 ? (riesgo >= 5 ? 'Estratégico' : 'Apalancado') : (riesgo >= 5 ? 'Cuello de botella' : 'No crítico'); return Object.assign({}, p, { imp, riesgo, q, abc: abc.get(p) }); });
    const dpo = L.reduce((a, p) => a + S.num(p.plazo) * S.num(p.compras), 0) / tot;
    return { R, tot, dpo, top: R.slice().sort((a, b) => b.imp - a.imp)[0] };
  }
  S.comprasAnalisis = compras;
  const KQ = S.KQ = { 'Estratégico': 'Alianza a largo plazo, planificación conjunta y plan B documentado.', 'Apalancado': 'Negocia: concentra volumen, pide ofertas y revisa precio cada año.', 'Cuello de botella': 'Asegura el suministro: stock de seguridad, contratos y un segundo proveedor.', 'No crítico': 'Automatiza y simplifica: catálogos, pedidos agrupados, menos tiempo de gestión.' };
  S.comprasTabla = (el) => { const CO = S.state.compras; S.etable(el, {
    titulo: 'Proveedores', rows: CO.proveedores, onChange: () => { CO.ejemplo = false; S.save(); S.rerender(); }, nuevo: () => ({ nombre: '', compras: 0, plazo: 60, alternativas: 2, criticidad: 3, calidad: 4, puntualidad: 95 }),
    cols: [{ k: 'nombre', l: 'Proveedor', type: 'text', syn: ['proveedor', 'nombre', 'acreedor'] }, { k: 'compras', l: 'Compras anuales', type: 'num', syn: ['compras', 'importe', 'gasto'] }, { k: 'plazo', l: 'Días de pago', type: 'num', syn: ['plazo', 'dias'] }, { k: 'alternativas', l: 'Alternativas', type: 'num' }, { k: 'criticidad', l: 'Criticidad 1-5', type: 'num' }, { k: 'calidad', l: 'Calidad 1-5', type: 'num' }, { k: 'puntualidad', l: 'Entregas a tiempo %', type: 'num', syn: ['puntualidad', 'otif'] },
      { k: 'q', l: 'Kraljic', calc: (r) => { const x = compras().R.find((p) => p.nombre === r.nombre); return x ? x.q : ''; } }]
  }); };
  S.register({
    id: 'compras', nombre: 'Compras', grupo: 'Operaciones',
    render(host) {
      const c = compras(), CO = S.state.compras;
      const apal = c.R.filter((p) => p.q === 'Apalancado' || p.q === 'Estratégico').reduce((a, p) => a + S.num(p.compras), 0);
      const ahorro = apal * CO.ahorroObjetivo / 100;
      host.innerHTML = `${S.section('Compras y proveedores', 'Matriz de Kraljic (el ABC de proveedores y la concentración de compras también están en «ABC y concentración»): cruza cuánto pesa cada proveedor en tu gasto con lo arriesgado que es su suministro, para saber dónde negociar y dónde asegurar.')}
        ${CO.ejemplo ? '<p class="small muted">Datos de ejemplo.</p>' : ''}
        ${S.kpiTiles([
          { k: 'Compras anuales', v: F.eur(c.tot) },
          { k: 'Primer proveedor', v: F.pct(c.top ? c.top.imp * 100 : 0), st: c.top && c.top.imp > 0.3 ? 'warn' : 'ok', d: c.top ? c.top.nombre : '' },
          { k: 'Concentración de compras (HHI)', v: F.num(Math.round(S.hhi ? S.hhi(c.R.map((p) => S.num(p.compras))) : 0)), st: S.hhi ? S.hhiSt(S.hhi(c.R.map((p) => S.num(p.compras)))) : null, info: 'Concentración de compras', exp: S.hhiCtx ? S.hhiCtx(S.hhi(c.R.map((p) => S.num(p.compras))), c.top && c.top.nombre, c.top ? c.top.imp * 100 : 0, 'proveedores') : '' },
          { k: 'Plazo medio de pago', v: Math.round(c.dpo) + ' días', info: 'Días de pago', exp: 'Media de los días de pago ponderada por lo que compras a cada proveedor.' },
          { k: 'Ahorro alcanzable', v: F.eur(ahorro), d: `negociando un ${CO.ahorroObjetivo} % en apalancados y estratégicos`, st: 'ok' }
        ])}
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Matriz de Kraljic</h4><div class="matrix3" style="grid-template-columns:80px repeat(2,minmax(0,1fr))"><div></div><div class="h">Riesgo bajo</div><div class="h">Riesgo alto</div>
          <div class="h">Peso alto</div>${['Apalancado', 'Estratégico'].map((q) => `<div class="c" data-q="${q}"><small>${q}</small><b>${c.R.filter((p) => p.q === q).length}</b><small>${F.eur(c.R.filter((p) => p.q === q).reduce((a, p) => a + S.num(p.compras), 0))}</small></div>`).join('')}
          <div class="h">Peso bajo</div>${['No crítico', 'Cuello de botella'].map((q) => `<div class="c" data-q="${q}"><small>${q}</small><b>${c.R.filter((p) => p.q === q).length}</b><small>${F.eur(c.R.filter((p) => p.q === q).reduce((a, p) => a + S.num(p.compras), 0))}</small></div>`).join('')}</div><p class="small" id="kqRead">Toca un cuadrante.</p></div>
          <div class="glass pad stack"><h4>Peso de cada proveedor</h4>${S.hbars(c.R.slice().sort((a, b) => b.imp - a.imp).map((p) => ({ n: p.nombre, v: p.imp * 100, c: p.q === 'Cuello de botella' || p.q === 'Estratégico' ? css('--s2') : css('--s1') })), (v) => F.pct(v))}
          <label class="small">Ahorro objetivo en la negociación <input class="input" id="ahObj" style="width:60px" value="${CO.ahorroObjetivo}"> %</label></div></div>
        <div class="glass pad mt" id="prvTable"></div>`;
      $$('[data-q]', host).forEach((b) => b.onclick = () => { const q = b.dataset.q; $('#kqRead', host).innerHTML = `<b>${q}.</b> ${KQ[q]}<br>${c.R.filter((p) => p.q === q).map((p) => esc(p.nombre)).join(', ') || 'Ninguno.'}`; });
      $('#ahObj', host).onchange = (e) => { CO.ahorroObjetivo = S.num(e.target.value); S.save(); S.rerender(); };
      S.comprasTabla($('#prvTable', host));
    },
    kpis() { const c = compras(); return [{ k: 'Dependencia del primer proveedor', v: F.pct(c.top ? c.top.imp * 100 : 0), st: c.top && c.top.imp > 0.3 ? 'warn' : 'ok' }]; },
    risks() { return compras().R.filter((p) => p.q === 'Cuello de botella' || (p.q === 'Estratégico' && S.num(p.alternativas) <= 1)).map((p) => S.mkRisk(`Suministro de ${p.nombre} sin alternativa`, S.num(p.alternativas) <= 1 ? 4 : 3, Math.min(5, S.num(p.criticidad)), KQ[p.q])); },
    findings() { const c = compras(), CO = S.state.compras; const apal = c.R.filter((p) => p.q === 'Apalancado' || p.q === 'Estratégico').reduce((a, p) => a + S.num(p.compras), 0); return apal ? [{ hallazgo: `${F.eur(apal)} de compras concentradas en proveedores negociables.`, accion: `Ronda de negociación con objetivo de ahorro del ${CO.ahorroObjetivo} %.`, impactoEUR: apal * CO.ahorroObjetivo / 100, tipo: 'ebitda', plazo: 90 }] : []; }
  });

  /* =========================================================
     Logística
     ========================================================= */
  S.defaults.logistica = { pedidosMes: 900, transporte: 21000, almacen: 9000, personal: 14000, aTiempo: 91, completos: 95, rotacion: 6, rutas: [
    { ruta: 'Zona centro', pedidos: 380, km: 4200, coste: 7600, aTiempo: 95 }, { ruta: 'Zona norte', pedidos: 260, km: 6900, coste: 8200, aTiempo: 86 }, { ruta: 'Exportación', pedidos: 60, km: 9800, coste: 5200, aTiempo: 83 }
  ] };
  function logi() {
    const L = S.state.logistica; const cm = S.num(L.transporte) + S.num(L.almacen) + S.num(L.personal);
    const ventasMes = S.sim.empresa.ventas / 12;
    return { cm, cpp: cm / Math.max(1, S.num(L.pedidosMes)), pct: S.pct(cm, ventasMes), otif: S.num(L.aTiempo) * S.num(L.completos) / 100 };
  }
  S.register({
    id: 'logistica', nombre: 'Logística', grupo: 'Operaciones',
    render(host) {
      const L = S.state.logistica, l = logi();
      host.innerHTML = `${S.section('Logística', 'Coste de servir cada pedido, nivel de servicio (OTIF: a tiempo y completo) y rendimiento por ruta.')}
        ${S.kpiTiles([{ k: 'Coste logístico mensual', v: F.eur(l.cm), d: `${F.pct(l.pct)} de las ventas`, st: l.pct > 10 ? 'warn' : 'ok' }, { k: 'Coste por pedido', v: F.eurFull(Math.round(l.cpp)) }, { k: 'OTIF', v: F.pct(l.otif), st: l.otif >= 92 ? 'ok' : l.otif >= 85 ? 'warn' : 'stop', info: 'OTIF' }, { k: 'Rotación del stock', v: L.rotacion + ' veces/año', d: `${Math.round(365 / Math.max(1, L.rotacion))} días de stock` }])}
        <div class="glass pad mt"><h4>Datos del mes</h4><div class="lever-grid">${[['pedidosMes', 'Pedidos al mes'], ['transporte', 'Coste de transporte (€/mes)'], ['almacen', 'Coste de almacén (€/mes)'], ['personal', 'Personal logístico (€/mes)'], ['aTiempo', 'Entregas a tiempo (%)'], ['completos', 'Pedidos completos (%)'], ['rotacion', 'Rotación del stock (veces/año)']].map(([k, n]) => `<div class="field"><div class="top"><label for="lg_${k}">${n}</label><span class="val"><input class="fnum" id="lg_${k}" value="${L[k]}"></span></div></div>`).join('')}</div></div>
        <div class="glass pad mt" id="rtTable"></div>`;
      $$('[id^="lg_"]', host).forEach((i) => i.onchange = () => { L[i.id.slice(3)] = S.num(i.value); S.save(); S.rerender(); });
      S.etable($('#rtTable', host), { titulo: 'Rutas', rows: L.rutas, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ ruta: '', pedidos: 0, km: 0, coste: 0, aTiempo: 95 }),
        cols: [{ k: 'ruta', l: 'Ruta', type: 'text' }, { k: 'pedidos', l: 'Pedidos/mes', type: 'num' }, { k: 'km', l: 'Km/mes', type: 'num' }, { k: 'coste', l: 'Coste/mes', type: 'num' }, { k: 'aTiempo', l: 'A tiempo %', type: 'num' }, { k: 'cpp', l: 'Coste por pedido', calc: (r) => F.eurFull(Math.round(S.num(r.coste) / Math.max(1, S.num(r.pedidos)))) }, { k: 'cpk', l: '€/km', calc: (r) => (S.num(r.coste) / Math.max(1, S.num(r.km))).toFixed(2).replace('.', ',') }] });
    },
    kpis() { const l = logi(); return [{ k: 'OTIF', v: F.pct(l.otif), st: l.otif >= 92 ? 'ok' : l.otif >= 85 ? 'warn' : 'stop' }, { k: 'Coste logístico s/ventas', v: F.pct(l.pct), st: l.pct > 10 ? 'warn' : 'ok' }]; },
    risks() { const l = logi(); return l.otif < 88 ? [S.mkRisk('Nivel de servicio logístico bajo (OTIF)', 4, 3, 'Revisar rutas con peor puntualidad y causas de pedidos incompletos.')] : []; },
    findings() { const L = S.state.logistica; return L.rutas.filter((r) => S.num(r.aTiempo) < 88).map((r) => ({ hallazgo: `La ruta ${r.ruta} entrega a tiempo solo el ${r.aTiempo} %.`, accion: 'Replanificar la ruta, consolidar cargas o cambiar de transportista.', impactoEUR: S.num(r.coste) * 12 * 0.08, tipo: 'ebitda', plazo: 90 })); }
  });

  /* =========================================================
     Gestor de tiempos: tiempo ligado a facturación frente al sistema interno
     ========================================================= */
  const CATS_T = A.CATS_TIEMPO;
  const BENCH = { servicios: 72, tecnologia: 70, industria: 80, construccion: 78, hosteleria: 75, salud: 75, logistica: 78, distribucion: 72, retail: 70, agro: 78 };
  S.defaults.tiempos = { ejemplo: true, personas: [
    { nombre: 'Laura', rol: 'Producción', costeHora: 24 }, { nombre: 'Pedro', rol: 'Producción', costeHora: 22 }, { nombre: 'Marta', rol: 'Comercial', costeHora: 30 },
    { nombre: 'Javier', rol: 'Jefe de planta', costeHora: 34 }, { nombre: 'Elena', rol: 'Administración', costeHora: 23 }
  ], registros: [], timers: {} };
  (function seedTiempos() {
    const reg = []; const add = (p, k, h, t) => reg.push({ fecha: new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10), persona: p, tarea: t, categoria: k, horas: h });
    add('Laura', 'produccion', 29, 'Órdenes de fabricación'); add('Laura', 'esperas', 4, 'Esperar material'); add('Laura', 'retrabajo', 3, 'Rehacer piezas'); add('Laura', 'reuniones', 2, 'Reunión de turno');
    add('Pedro', 'produccion', 31, 'Montaje'); add('Pedro', 'esperas', 5, 'Buscar herramientas'); add('Pedro', 'reuniones', 2, 'Reunión de turno');
    add('Marta', 'comercial', 22, 'Visitas y ofertas'); add('Marta', 'gestion', 10, 'Pedidos y seguimiento en hojas'); add('Marta', 'reuniones', 6, 'Reuniones internas');
    add('Javier', 'produccion', 12, 'Supervisión en línea'); add('Javier', 'gestion', 14, 'Planificación y partes'); add('Javier', 'reuniones', 10, 'Reuniones'); add('Javier', 'retrabajo', 4, 'Resolver incidencias');
    add('Elena', 'gestion', 34, 'Facturación y contabilidad'); add('Elena', 'reuniones', 3, 'Reuniones'); add('Elena', 'retrabajo', 3, 'Corregir albaranes');
    S.defaults.tiempos.registros = reg;
  })();
  function tiempos() {
    const T = S.state.tiempos;
    const per = T.personas.map((p) => { const R = T.registros.filter((r) => r.persona === p.nombre); const by = {}; CATS_T.forEach((c) => { by[c.k] = R.filter((r) => r.categoria === c.k).reduce((a, r) => a + S.num(r.horas), 0); }); const tot = Object.values(by).reduce((a, b) => a + b, 0); const fact = CATS_T.filter((c) => c.fact).reduce((a, c) => a + by[c.k], 0); return { p, by, tot, fact, util: S.pct(fact, tot), coste: tot * S.num(p.costeHora), costeNoFact: (tot - fact) * S.num(p.costeHora), waste: CATS_T.filter((c) => c.waste).reduce((a, c) => a + by[c.k], 0) }; });
    const tot = per.reduce((a, x) => a + x.tot, 0), fact = per.reduce((a, x) => a + x.fact, 0), waste = per.reduce((a, x) => a + x.waste, 0);
    const bench = BENCH[S.sim.sector] || 72;
    const semanas = 46;
    const factAnual = fact * semanas; // los registros representan una semana tipo
    const ventasHora = factAnual ? S.sim.empresa.ventas / factAnual : 0;
    return { per, tot, fact, waste, util: S.pct(fact, tot), bench, costeNoFact: per.reduce((a, x) => a + x.costeNoFact, 0) * semanas, costeWaste: per.reduce((a, x) => a + x.waste * S.num(x.p.costeHora), 0) * semanas, ventasHora };
  }
  S.register({
    id: 'tiempos', nombre: 'Gestor de tiempos', grupo: 'Operaciones',
    render(host) {
      const T = S.state.tiempos, t = tiempos();
      const ganancia = Math.max(0, (t.bench - t.util) / 100) * t.tot * 46;
      host.innerHTML = `${S.section('Gestor de tiempos', 'Dónde se va el tiempo del equipo: cuánto está ligado directamente a producir lo que se factura y genera margen, y cuánto consume el sistema interno (gestión, reuniones, errores, esperas). Registra las tareas con el cronómetro, a mano, dictándolas o importando un listado.')}
        ${T.ejemplo ? '<p class="small muted">Registros de ejemplo de una semana tipo.</p>' : ''}
        ${S.kpiTiles([
          { k: 'Tiempo ligado a facturación', v: F.pct(t.util), st: t.util >= t.bench ? 'ok' : t.util >= t.bench - 10 ? 'warn' : 'stop', d: `referencia del sector: ${t.bench} %`, info: 'Tiempo facturable' },
          { k: 'Horas registradas', v: F.num(t.tot), d: `${F.num(t.fact)} facturables` },
          { k: 'Coste del tiempo interno', v: F.eur(t.costeNoFact), d: 'al año, extrapolando la semana tipo' },
          { k: 'Coste de errores y esperas', v: F.eur(t.costeWaste), st: t.waste / Math.max(1, t.tot) > 0.08 ? 'warn' : 'ok', d: 'desperdicio puro' },
          { k: 'Ventas por hora facturable', v: F.eurFull(Math.round(t.ventasHora)) }
        ])}
        ${ganancia > 0 ? S.note(`Si el tiempo ligado a facturación llegara al ${t.bench} % de tu sector, liberarías unas <b>${F.num(Math.round(ganancia))} horas al año</b>: el equivalente a ${(ganancia / 1700).toFixed(1).replace('.', ',')} personas que podrían producir sin contratar.`) : ''}
        <div class="grid cols-2 mt">
          <div class="glass pad stack"><div class="row"><h4>Reloj de tareas</h4><span class="spacer"></span><button class="btn ghost" id="tmFloat">${S.relojAbierto && S.relojAbierto() ? 'Quitar el flotante' : 'Dejar flotante'}</button><button class="btn" id="tmPip">Sacar del navegador</button></div>
            <p class="small muted">Cada persona elige su nombre y pulsa el tipo de tiempo en el que está: al pulsar otro, el tramo anterior se guarda solo. «Dejar flotante» lo mantiene a la vista mientras usas cualquier módulo; «Sacar del navegador» lo pone en una ventana pequeña siempre visible, encima de cualquier programa, aunque minimices.</p>
            <div id="tmClock"></div>
            <div class="row"><button class="btn ghost" id="tmV">Dictar un registro</button><span class="small" id="tmMsg">Di, por ejemplo: «Marta, dos horas de reuniones internas».</span></div></div>
          <div class="glass pad stack"><h4>Distribución del tiempo</h4>${S.hbars(CATS_T.map((c) => ({ n: c.n, v: t.per.reduce((a, x) => a + x.by[c.k], 0), c: c.fact ? css('--s3') : c.waste ? css('--s2') : c.ventas ? css('--s1') : css('--faint') })), (v) => F.num(v) + ' h')}</div>
        </div>
        <div class="glass pad mt stack"><h4>Por persona</h4><div class="table-wrap"><table><thead><tr><th>Persona</th><th>Rol</th><th>Horas</th><th>Facturable</th><th>Interno</th><th>Errores y esperas</th><th>Coste interno/semana</th></tr></thead><tbody>${t.per.map((x) => `<tr><td>${esc(x.p.nombre)}</td><td>${esc(x.p.rol)}</td><td>${F.num(x.tot)}</td><td><span class="state st-${x.util >= t.bench ? 'ok' : x.util >= t.bench - 15 ? 'warn' : 'stop'}">${F.pct(x.util)}</span></td><td>${F.num(x.tot - x.fact)} h</td><td>${F.num(x.waste)} h</td><td>${F.eur(x.costeNoFact)}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="grid cols-2 mt"><div class="glass pad" id="tpPers"></div><div class="glass pad" id="tpReg"></div></div>`;
      const msg = (m) => { $('#tmMsg', host).textContent = m; };
      A.relojNormaliza(T);
      const hc = $('#tmClock', host); hc.classList.add('rj-host'); A.reloj.mount(hc, S.relojStore, {});
      $('#tmFloat', host).onclick = () => { S.relojFlotante(!S.relojAbierto()); S.rerender(); };
      $('#tmPip', host).onclick = () => S.relojFuera();
      $('#tmV', host).onclick = async () => {
        msg('Escuchando…');
        try {
          const txt = await A.docs.dictate(); const n = txt.toLowerCase();
          const p = T.personas.find((x) => n.includes(x.nombre.toLowerCase()));
          const h = A.docs.parseAmount(n.replace(/media hora/, '0,5')) || (/media hora/.test(n) ? 0.5 : NaN);
          const c = CATS_T.find((x) => n.includes(x.n.toLowerCase().split(' ')[0])) || (/(reunion)/.test(n) ? CATS_T[3] : /(error|repet|rehac)/.test(n) ? CATS_T[4] : /(esper|busc|despla)/.test(n) ? CATS_T[5] : /(cliente|venta|oferta|visita)/.test(n) ? CATS_T[1] : /(factur|contab|papel|gesti)/.test(n) ? CATS_T[2] : CATS_T[0]);
          if (!p || !isFinite(h)) throw new Error(`No lo he entendido: «${txt}». Di el nombre, las horas y la tarea.`);
          T.registros.push({ fecha: new Date().toISOString().slice(0, 10), persona: p.nombre, tarea: txt, categoria: c.k, horas: h }); T.ejemplo = false; S.save(); S.rerender();
        } catch (e) { msg(e.message); }
      };
      S.etable($('#tpPers', host), { titulo: 'Equipo', rows: T.personas, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ nombre: '', rol: '', costeHora: 22 }), cols: [{ k: 'nombre', l: 'Persona', type: 'text', syn: ['nombre', 'empleado', 'persona'] }, { k: 'rol', l: 'Rol', type: 'text', syn: ['puesto', 'rol', 'categoria'] }, { k: 'costeHora', l: 'Coste/hora', type: 'num', syn: ['coste hora', 'coste'] }] });
      S.etable($('#tpReg', host), { titulo: 'Registros de tiempo', rows: T.registros, onChange: () => { T.ejemplo = false; S.save(); S.rerender(); }, nuevo: () => ({ fecha: new Date().toISOString().slice(0, 10), persona: T.personas[0] ? T.personas[0].nombre : '', tarea: '', categoria: 'produccion', horas: 1 }),
        cols: [{ k: 'fecha', l: 'Fecha', type: 'date', syn: ['fecha', 'dia'] }, { k: 'persona', l: 'Persona', type: 'select', opts: T.personas.map((p) => p.nombre), syn: ['persona', 'empleado', 'nombre'] }, { k: 'tarea', l: 'Tarea', type: 'text', syn: ['tarea', 'actividad', 'descripcion'] }, { k: 'categoria', l: 'Tipo', type: 'select', opts: CATS_T.map((c) => ({ v: c.k, l: c.n })), syn: ['tipo', 'categoria'] }, { k: 'horas', l: 'Horas', type: 'num', syn: ['horas', 'tiempo', 'duracion'] }] });
    },
    kpis() { const t = tiempos(); return [{ k: 'Tiempo ligado a facturación', v: F.pct(t.util), st: t.util >= t.bench ? 'ok' : t.util >= t.bench - 10 ? 'warn' : 'stop' }, { k: 'Coste de errores y esperas', v: F.eur(t.costeWaste) }]; },
    risks() { const t = tiempos(); return t.util < t.bench - 10 ? [S.mkRisk('Demasiado tiempo del equipo se va en el sistema interno', 4, 3, 'Simplificar gestión, reuniones y retrabajos antes de contratar más personas.')] : []; },
    findings() { const t = tiempos(); const out = []; if (t.costeWaste > 0) out.push({ hallazgo: `Errores, esperas y búsquedas consumen ${F.eur(t.costeWaste)} al año en horas.`, accion: 'Atacar las tres causas principales con acciones Lean (5S, estándares, kit de material).', impactoEUR: t.costeWaste * 0.5, tipo: 'ebitda', plazo: 90 }); t.per.filter((x) => x.by.reuniones > x.tot * 0.15).forEach((x) => out.push({ hallazgo: `${x.p.nombre} dedica el ${F.pct(S.pct(x.by.reuniones, x.tot))} a reuniones internas.`, accion: 'Agenda fija, reuniones de 15 minutos y decisiones delegadas.', impactoEUR: x.by.reuniones * 0.4 * S.num(x.p.costeHora) * 46, tipo: 'ebitda', plazo: 30 })); return out; }
  });

  /* =========================================================
     Lean manufacturing adaptado al sector
     ========================================================= */
  const PROC = {
    industria: [['Recepción de material', 4, 1, 120, 300], ['Corte y mecanizado', 6, 4, 60, 150], ['Montaje', 9, 6, 45, 80], ['Control de calidad', 3, 1, 30, 40], ['Embalaje y expedición', 3, 2, 240, 200]],
    distribucion: [['Recepción y ubicación', 5, 2, 180, 400], ['Preparación de pedidos', 8, 5, 60, 120], ['Verificación', 2, 1, 30, 60], ['Carga', 3, 2, 120, 80], ['Reparto', 25, 20, 0, 0]],
    hosteleria: [['Toma de comanda', 2, 1, 3, 0], ['Preparación previa', 4, 3, 5, 10], ['Cocinado', 9, 7, 4, 4], ['Emplatado', 2, 1.5, 3, 2], ['Servicio en sala', 2, 1, 2, 0], ['Cobro y recogida', 3, 1, 6, 0]],
    retail: [['Recepción de mercancía', 6, 2, 240, 300], ['Reposición en tienda', 4, 2, 120, 150], ['Atención al cliente', 8, 6, 3, 0], ['Cobro', 2, 1, 4, 0], ['Postventa', 10, 4, 1440, 5]],
    construccion: [['Planificación de la partida', 120, 60, 1440, 0], ['Acopio de materiales', 90, 20, 2880, 10], ['Ejecución', 480, 400, 240, 0], ['Inspección', 60, 30, 1440, 0], ['Certificación y factura', 90, 20, 4320, 0]],
    servicios: [['Captación y diagnóstico', 120, 60, 2880, 0], ['Propuesta', 180, 90, 4320, 0], ['Planificación', 60, 20, 1440, 0], ['Ejecución del servicio', 900, 760, 2880, 0], ['Revisión de calidad', 120, 60, 1440, 0], ['Facturación', 30, 5, 2880, 0]],
    tecnologia: [['Requisitos', 240, 120, 2880, 0], ['Diseño', 360, 240, 1440, 0], ['Desarrollo', 1800, 1500, 1440, 0], ['Pruebas', 480, 300, 2880, 0], ['Despliegue', 120, 60, 1440, 0]],
    agro: [['Recepción de campo', 3, 1, 180, 500], ['Clasificación', 4, 3, 60, 200], ['Lavado y procesado', 5, 4, 30, 120], ['Envasado', 3, 2.5, 60, 150], ['Cámara y expedición', 2, 1, 720, 400]],
    salud: [['Cita y recepción', 5, 2, 0, 0], ['Espera', 0, 0, 25, 0], ['Consulta o tratamiento', 25, 22, 5, 0], ['Pruebas', 15, 10, 20, 0], ['Cobro y alta', 5, 1, 8, 0]],
    logistica: [['Recepción de orden', 10, 3, 60, 0], ['Planificación de ruta', 15, 8, 30, 0], ['Carga', 25, 15, 60, 0], ['Transporte', 180, 160, 0, 0], ['Entrega', 15, 10, 20, 0], ['Cierre y retorno', 20, 5, 240, 0]]
  };
  const WASTES = [
    ['Transporte', 'Mover material o documentos de un sitio a otro sin añadir valor.'], ['Inventario', 'Stock o trabajo a medias acumulado entre etapas.'], ['Movimientos', 'Personas que se desplazan, buscan o se agachan de más.'], ['Esperas', 'Personas o máquinas paradas esperando material, información o aprobación.'],
    ['Sobreproceso', 'Hacer más de lo que el cliente valora: revisiones dobles, informes que nadie lee.'], ['Sobreproducción', 'Producir antes o más de lo que se ha pedido.'], ['Defectos', 'Errores, retrabajos, devoluciones y reclamaciones.'], ['Talento no aprovechado', 'No escuchar las ideas de quien hace el trabajo.']
  ];
  const S5 = ['Clasificar (seiri)', 'Ordenar (seiton)', 'Limpiar (seiso)', 'Estandarizar (seiketsu)', 'Disciplina (shitsuke)'];
  function leanDefault(sector) {
    const isMin = ['construccion', 'servicios', 'tecnologia'].includes(sector);
    const demandaDia = isMin ? 2 : sector === 'hosteleria' ? 180 : sector === 'salud' ? 40 : 400, minutosDia = isMin ? 8 * 60 * 6 : 2 * 450;
    const takt = minutosDia / demandaDia;
    return { sector, demandaDia, minutosDia, pasos: (PROC[sector] || PROC.industria).map(([n, c, va, esp, inv], i) => ({ nombre: n, ciclo: c, va, espera: esp, inventario: inv, puestos: Math.max(1, Math.ceil((c / 0.72) / takt) - (i === 2 ? 1 : 0)), maquina: !isMin && /(corte|mecaniz|montaje|envas|lavado|procesado|cocin)/i.test(n), disp: 88, rend: 85, cal: 97 })), desperdicios: WASTES.map(() => 2), cincoS: S5.map(() => 2), kaizen: [{ idea: 'Kit de material preparado por orden', desperdicio: 'Esperas', horasMes: 30, coste: 1500, estado: 'Propuesta' }, { idea: 'Tablero visual de producción diaria', desperdicio: 'Sobreproducción', horasMes: 12, coste: 400, estado: 'En marcha' }] };
  }
  S.defaults.lean = null;
  function lean() {
    if (!S.state.lean || S.state.lean.sector !== S.sim.sector && S.state.lean.auto) S.state.lean = Object.assign(leanDefault(S.sim.sector), { auto: true });
    const L = S.state.lean;
    const takt = S.num(L.minutosDia) / Math.max(1, S.num(L.demandaDia));
    const P = L.pasos.map((p) => { const oee = p.maquina ? (S.num(p.disp) / 100) * (S.num(p.rend) / 100) * (S.num(p.cal) / 100) : 1; const cicloEf = S.num(p.ciclo) / Math.max(1, S.num(p.puestos)) / Math.max(0.05, oee); return Object.assign({}, p, { oee, cicloEf, capDia: S.num(L.minutosDia) / Math.max(0.01, cicloEf) }); });
    const cuello = P.reduce((a, b) => (b.cicloEf > a.cicloEf ? b : a), P[0] || { cicloEf: 0 });
    const lead = P.reduce((a, p) => a + S.num(p.ciclo) + S.num(p.espera) + S.num(p.inventario) * takt, 0);
    const va = P.reduce((a, p) => a + S.num(p.va), 0);
    const maqs = P.filter((p) => p.maquina);
    const oeeMed = maqs.length ? maqs.reduce((a, p) => a + p.oee, 0) / maqs.length : null;
    const personas = P.reduce((a, p) => a + S.num(p.puestos), 0);
    const producido = Math.min(S.num(L.demandaDia), cuello.capDia || 0);
    return { L, takt, P, cuello, lead, va, eficiencia: S.pct(va, lead), oeeMed, productividad: producido / Math.max(1, personas * S.num(L.minutosDia) / 60 / (P.length ? 1 : 1)), capacidad: cuello.capDia, producido };
  }
  S.register({
    id: 'lean', nombre: 'Lean', grupo: 'Operaciones',
    render(host) {
      const l = lean(), L = l.L;
      const gap = l.cuello.cicloEf > l.takt;
      const topW = L.desperdicios.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v).slice(0, 3);
      const fmtMin = (m) => (m >= 1440 ? (m / 1440).toFixed(1).replace('.', ',') + ' días' : m >= 120 ? (m / 60).toFixed(1).replace('.', ',') + ' h' : String(Math.round(m * 10) / 10).replace('.', ',') + ' min');
      host.innerHTML = `${S.section('Lean: productividad de persona, máquina, proceso y flujo', `Mapa del flujo de valor de tu proceso principal con la plantilla del sector «${A.SECTORS[L.sector].nombre}». Calcula el ritmo que pide el cliente (takt), el cuello de botella, la eficiencia de las máquinas (OEE), el tiempo total del flujo y cuánto de ese tiempo añade valor. Ajusta cada paso a tu realidad.`)}
        ${S.kpiTiles([
          { k: 'Takt time', v: fmtMin(l.takt), d: 'ritmo que pide la demanda', info: 'Takt time' },
          { k: 'Cuello de botella', v: esc(l.cuello.nombre || '—'), st: gap ? 'stop' : 'ok', d: `${fmtMin(l.cuello.cicloEf || 0)} por unidad${gap ? ' · no llega al takt' : ''}` },
          { k: 'OEE medio', v: l.oeeMed === null ? '—' : F.pct(l.oeeMed * 100), st: l.oeeMed === null ? null : l.oeeMed >= 0.75 ? 'ok' : l.oeeMed >= 0.6 ? 'warn' : 'stop', d: 'clase mundial: 85 %', info: 'OEE' },
          { k: 'Tiempo total del flujo', v: fmtMin(l.lead), d: 'desde que entra hasta que sale', info: 'Lead time' },
          { k: 'Tiempo que añade valor', v: F.pct(l.eficiencia), st: l.eficiencia >= 25 ? 'ok' : l.eficiencia >= 10 ? 'warn' : 'stop', d: fmtMin(l.va) }
        ])}
        ${gap ? S.note(`El paso «${esc(l.cuello.nombre)}» necesita ${fmtMin(l.cuello.cicloEf)} por unidad y la demanda pide una cada ${fmtMin(l.takt)}: solo puedes servir ${F.num(Math.round(l.capacidad))} de ${F.num(L.demandaDia)} al día. Opciones: añadir un puesto, subir su OEE o reducir su tiempo de ciclo (SMED, estándar de trabajo).`) : S.note(`El proceso puede servir hasta ${F.num(Math.round(l.capacidad))} unidades al día frente a una demanda de ${F.num(L.demandaDia)}: hay ${F.pct(S.pct(l.capacidad - L.demandaDia, L.demandaDia))} de holgura en el cuello de botella (${esc(l.cuello.nombre)}).`)}
        <div class="glass pad mt stack"><div class="row"><h4>Mapa del flujo de valor</h4><span class="spacer"></span><label class="small">Plantilla <select class="input" id="lnSec">${Object.keys(A.SECTORS).map((k) => `<option value="${k}" ${k === L.sector ? 'selected' : ''}>${A.SECTORS[k].nombre}</option>`).join('')}</select></label>
          <label class="small">Demanda/día <input class="input" id="lnDem" style="width:80px" value="${L.demandaDia}"></label><label class="small">Minutos disponibles/día <input class="input" id="lnMin" style="width:80px" value="${L.minutosDia}"></label></div>
          <div class="chart" id="vsm"></div></div>
        <div class="glass pad mt" id="lnSteps"></div>
        <div class="grid cols-2 mt">
          <div class="glass pad stack"><h4>Los 8 desperdicios</h4><p class="small muted">Puntúa de 0 (no existe) a 5 (constante) cuánto aparece cada uno.</p>${WASTES.map((w, i) => `<div class="field"><div class="top"><label for="wd${i}" title="${esc(w[1])}">${w[0]}</label><span class="num">${L.desperdicios[i]}</span></div><input type="range" id="wd${i}" min="0" max="5" step="1" value="${L.desperdicios[i]}" style="--p:${L.desperdicios[i] * 20}%"><p class="fdesc">${w[1]}</p></div>`).join('')}
            <p class="small">Prioridad: ${topW.map((x) => `<b>${WASTES[x.i][0]}</b>`).join(', ')}.</p></div>
          <div class="glass pad stack"><h4>Auditoría 5S</h4>${S5.map((n, i) => `<div class="field"><div class="top"><label for="s5${i}">${n}</label><span class="num">${L.cincoS[i]}/5</span></div><input type="range" id="s5${i}" min="0" max="5" step="1" value="${L.cincoS[i]}" style="--p:${L.cincoS[i] * 20}%"></div>`).join('')}
            <p class="small">Puntuación 5S: <b>${Math.round(L.cincoS.reduce((a, b) => a + b, 0) / 25 * 100)} %</b>. Por debajo del 60 %, empieza por clasificar y ordenar el puesto del cuello de botella.</p></div>
        </div>
        <div class="glass pad mt" id="kzTable"></div>`;
      // Mapa del flujo de valor (VSM simplificado)
      const W = 900, Hh = 190, n = l.P.length, bw = Math.min(150, (W - 40) / Math.max(1, n) - 30);
      let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Mapa del flujo de valor">`;
      l.P.forEach((p, i) => {
        const x = 20 + i * ((W - 40) / n), isC = p === l.cuello;
        svg += `<rect x="${x}" y="20" width="${bw}" height="70" rx="8" fill="${css('--panel-solid')}" stroke="${isC ? css('--stop') : css('--line-strong')}" stroke-width="${isC ? 2 : 1}"/><text x="${x + bw / 2}" y="40" text-anchor="middle" style="fill:${css('--fg')};font-family:var(--font-body);font-size:11px">${esc(p.nombre.length > 22 ? p.nombre.slice(0, 21) + '…' : p.nombre)}</text>
          <text x="${x + bw / 2}" y="58" text-anchor="middle">ciclo ${fmtMin(p.ciclo)}</text><text x="${x + bw / 2}" y="74" text-anchor="middle">${p.maquina ? 'OEE ' + Math.round(p.oee * 100) + ' %' : p.puestos + ' puesto' + (p.puestos > 1 ? 's' : '')}</text>`;
        if (i < n - 1) { const x2 = x + bw, mid = (x2 + 20 + (i + 1) * ((W - 40) / n)) / 2; svg += `<path d="M${mid - 9},118 L${mid + 9},118 L${mid},102 Z" fill="${css('--warn')}" opacity="0.8"/><text x="${mid}" y="134" text-anchor="middle">${fmtMin(S.num(p.espera))}</text>${S.num(p.inventario) ? `<text x="${mid}" y="148" text-anchor="middle">${F.num(p.inventario)} uds</text>` : ''}<line x1="${x2}" x2="${x2 + 24}" y1="55" y2="55" stroke="${css('--gold')}" stroke-width="1.5"/>`; }
      });
      svg += `<line x1="20" x2="${W - 20}" y1="${Hh - 22}" y2="${Hh - 22}" stroke="${css('--line')}"/><text x="20" y="${Hh - 6}">Valor añadido ${fmtMin(l.va)} de ${fmtMin(l.lead)} (${F.pct(l.eficiencia)}) · triángulo: espera e inventario entre pasos · borde rojo: cuello de botella</text></svg>`;
      $('#vsm', host).innerHTML = svg;
      $('#lnSec', host).onchange = (e) => { S.state.lean = Object.assign(leanDefault(e.target.value), { auto: false }); S.save(); S.rerender(); };
      $('#lnDem', host).onchange = (e) => { L.demandaDia = S.num(e.target.value); L.auto = false; S.save(); S.rerender(); };
      $('#lnMin', host).onchange = (e) => { L.minutosDia = S.num(e.target.value); L.auto = false; S.save(); S.rerender(); };
      L.desperdicios.forEach((_, i) => { const r = $('#wd' + i, host); r.oninput = () => { const n = r.closest('.field').querySelector('.num'); if (n) n.textContent = r.value; }; r.onchange = (e) => { L.desperdicios[i] = +e.target.value; L.auto = false; S.save(); S.rerender(); }; });
      L.cincoS.forEach((_, i) => { const r = $('#s5' + i, host); r.oninput = () => { const n = r.closest('.field').querySelector('.num'); if (n) n.textContent = r.value + '/5'; }; r.onchange = (e) => { L.cincoS[i] = +e.target.value; L.auto = false; S.save(); S.rerender(); }; });
      S.etable($('#lnSteps', host), { titulo: 'Pasos del proceso', rows: L.pasos, onChange: () => { L.auto = false; S.save(); S.rerender(); }, nuevo: () => ({ nombre: '', ciclo: 5, va: 3, espera: 30, inventario: 0, puestos: 1, maquina: false, disp: 90, rend: 90, cal: 98 }),
        cols: [{ k: 'nombre', l: 'Paso', type: 'text' }, { k: 'ciclo', l: 'Ciclo (min/ud)', type: 'num' }, { k: 'va', l: 'Valor añadido (min)', type: 'num' }, { k: 'espera', l: 'Espera después (min)', type: 'num' }, { k: 'inventario', l: 'Stock intermedio (uds)', type: 'num' }, { k: 'puestos', l: 'Puestos en paralelo', type: 'num' }, { k: 'maquina', l: 'Máquina', type: 'bool' }, { k: 'disp', l: 'Disponibilidad %', type: 'num' }, { k: 'rend', l: 'Rendimiento %', type: 'num' }, { k: 'cal', l: 'Calidad %', type: 'num' }] });
      S.etable($('#kzTable', host), { titulo: 'Mejoras kaizen', rows: L.kaizen, onChange: () => { L.auto = false; S.save(); S.rerender(); }, nuevo: () => ({ idea: '', desperdicio: 'Esperas', horasMes: 0, coste: 0, estado: 'Propuesta' }),
        cols: [{ k: 'idea', l: 'Mejora', type: 'text' }, { k: 'desperdicio', l: 'Desperdicio', type: 'select', opts: WASTES.map((w) => w[0]) }, { k: 'horasMes', l: 'Horas ahorradas/mes', type: 'num' }, { k: 'coste', l: 'Coste', type: 'num' }, { k: 'estado', l: 'Estado', type: 'select', opts: ['Propuesta', 'En marcha', 'Hecha'] }, { k: 'roi', l: 'Ahorro anual', calc: (r) => F.eur(S.num(r.horasMes) * 12 * 25) }] });
    },
    kpis() { const l = lean(); return [{ k: 'OEE medio', v: l.oeeMed === null ? '—' : F.pct(l.oeeMed * 100), st: l.oeeMed === null ? null : l.oeeMed >= 0.75 ? 'ok' : l.oeeMed >= 0.6 ? 'warn' : 'stop' }, { k: 'Tiempo que añade valor', v: F.pct(l.eficiencia), st: l.eficiencia >= 25 ? 'ok' : l.eficiencia >= 10 ? 'warn' : 'stop' }, { k: 'Capacidad frente a demanda', v: F.pct(S.pct(l.capacidad, l.L.demandaDia)), st: l.capacidad >= l.L.demandaDia ? 'ok' : 'stop' }]; },
    risks() { const l = lean(); const R = []; if (l.capacidad < l.L.demandaDia) R.push(S.mkRisk(`Cuello de botella en ${l.cuello.nombre}`, 5, 4, 'Añadir capacidad o mejorar su OEE antes de vender más.')); if (l.oeeMed !== null && l.oeeMed < 0.6) R.push(S.mkRisk('Máquinas poco eficientes (OEE bajo)', 4, 3, 'Mantenimiento preventivo, SMED en cambios de formato y control de calidad en origen.')); return R; },
    findings() {
      const l = lean(); const out = [];
      const hora = 25;
      const kz = l.L.kaizen.filter((k) => k.estado !== 'Hecha').reduce((a, k) => a + S.num(k.horasMes) * 12 * hora, 0);
      if (kz) out.push({ hallazgo: `Mejoras kaizen pendientes con ${F.num(l.L.kaizen.filter((k) => k.estado !== 'Hecha').reduce((a, k) => a + S.num(k.horasMes), 0))} horas al mes de ahorro.`, accion: 'Lanzar las mejoras pendientes con responsable y fecha.', impactoEUR: kz, tipo: 'ebitda', plazo: 90 });
      if (l.oeeMed !== null && l.oeeMed < 0.75) out.push({ hallazgo: `OEE medio del ${F.pct(l.oeeMed * 100)}.`, accion: 'Plan de OEE: paradas, microparadas y calidad en las máquinas del flujo.', impactoEUR: S.sim.empresa.ventas * S.sim.empresa.margen / 100 * (0.75 - l.oeeMed) * 0.3, tipo: 'ebitda', plazo: 180 });
      return out;
    }
  });

  /* =========================================================
     Personas
     ========================================================= */
  S.defaults.personas = { areas: [
    { area: 'Producción', personas: 16, coste: 31000, absentismo: 5.5, rotacion: 14, vacantes: 2, formacion: 10 },
    { area: 'Comercial', personas: 4, coste: 42000, absentismo: 2, rotacion: 20, vacantes: 1, formacion: 16 },
    { area: 'Oficina técnica', personas: 3, coste: 38000, absentismo: 2.5, rotacion: 8, vacantes: 0, formacion: 24 },
    { area: 'Administración', personas: 3, coste: 29000, absentismo: 3, rotacion: 6, vacantes: 0, formacion: 8 },
    { area: 'Logística', personas: 2, coste: 27000, absentismo: 6, rotacion: 18, vacantes: 1, formacion: 6 }
  ] };
  S.register({
    id: 'personas', nombre: 'Personas', grupo: 'Operaciones',
    render(host) {
      const R = S.state.personas.areas; const tot = R.reduce((a, x) => a + S.num(x.personas), 0) || 1;
      const h = A.humanReadiness(S.sim, S.analysis());
      const w = (k) => R.reduce((a, x) => a + S.num(x[k]) * S.num(x.personas), 0) / tot;
      host.innerHTML = `${S.section('Personas', 'Plantilla por áreas, coste, absentismo, rotación y vacantes, junto con la preparación del sistema humano para el crecimiento que calcula el simulador.')}
        ${S.kpiTiles([{ k: 'Plantilla', v: F.num(tot) }, { k: 'Coste medio', v: F.eur(w('coste')) }, { k: 'Absentismo medio', v: F.pct(w('absentismo')), st: w('absentismo') > 5 ? 'warn' : 'ok', info: 'Absentismo' }, { k: 'Rotación media', v: F.pct(w('rotacion')), st: w('rotacion') > 15 ? 'warn' : 'ok', info: 'Rotación' }, { k: 'Preparación para crecer', v: Math.round(h.score) + '/100', st: h.score >= 70 ? 'ok' : h.score >= 50 ? 'warn' : 'stop' }])}
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Sistema humano (del simulador)</h4>${S.hbars(h.dims.map((d) => ({ n: d.nombre, v: d.score, c: d.score >= 70 ? css('--go') : d.score >= 50 ? css('--warn') : css('--stop') })), (v) => Math.round(v))}<a class="btn ghost" href="app.html#humano">Ajustar en el simulador</a></div>
          <div class="glass pad stack"><h4>Lo que necesita para estarlo</h4><div class="timeline">${h.acciones.slice().sort((a, b) => a.cuando - b.cuando).map((a) => `<div class="ev"><div class="when">MES ${a.cuando}${a.coste ? ' · ' + F.eur(a.coste) : ''}</div><div>${esc(a.que)}</div></div>`).join('')}</div></div></div>
        <div class="glass pad mt stack" id="ogHost"></div>
        <div class="glass pad mt" id="arTable"></div>`;
      if (S.orgChart) S.orgChart($('#ogHost', host));
      S.etable($('#arTable', host), { titulo: 'Áreas', rows: R, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ area: '', personas: 0, coste: 30000, absentismo: 4, rotacion: 10, vacantes: 0, formacion: 12 }),
        cols: [{ k: 'area', l: 'Área', type: 'text', syn: ['area', 'departamento'] }, { k: 'personas', l: 'Personas', type: 'num' }, { k: 'coste', l: 'Coste medio anual', type: 'num' }, { k: 'absentismo', l: 'Absentismo %', type: 'num' }, { k: 'rotacion', l: 'Rotación %', type: 'num' }, { k: 'vacantes', l: 'Vacantes', type: 'num' }, { k: 'formacion', l: 'Formación h/año', type: 'num' }] });
    },
    kpis() { const R = S.state.personas.areas; const tot = R.reduce((a, x) => a + S.num(x.personas), 0) || 1; const rot = R.reduce((a, x) => a + S.num(x.rotacion) * S.num(x.personas), 0) / tot; return [{ k: 'Rotación media', v: F.pct(rot), st: rot > 15 ? 'warn' : 'ok' }, { k: 'Preparación para crecer', v: Math.round(A.humanReadiness(S.sim, S.analysis()).score) + '/100' }]; },
    risks() {
      const R = S.state.personas.areas.filter((x) => S.num(x.rotacion) > 15).map((x) => S.mkRisk(`Rotación alta en ${x.area} (${x.rotacion} %)`, 4, 3, 'Entrevistas de salida, plan de carrera y revisión salarial selectiva.'));
      if (S.orgAnalisis) { const o = S.orgAnalisis(); o.saturados.forEach((n) => R.push(S.mkRisk(`${n.puesto}: ${o.span(n)} personas a cargo`, 3, 3, 'Crear un mando intermedio o repartir el equipo: por encima de 10 personas un responsable deja de poder dirigir.'))); }
      return R;
    },
    findings() { return S.state.personas.areas.filter((x) => S.num(x.absentismo) > 5).map((x) => ({ hallazgo: `Absentismo del ${x.absentismo} % en ${x.area}.`, accion: 'Analizar causas, turnos y clima; plan de bienestar.', impactoEUR: S.num(x.personas) * S.num(x.coste) * (S.num(x.absentismo) - 4) / 100, tipo: 'ebitda', plazo: 180 })); }
  });
})();
