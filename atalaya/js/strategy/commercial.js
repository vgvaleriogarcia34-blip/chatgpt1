/* Atalaya · Sistema estratégico · Comercial: ABC y ABC′, margen de contribución y escenarios de palancas,
   pipeline comercial, marketing y expansión territorial */
(function () {
  const A = window.Atalaya, F = A.fmt, S = A.strat;
  const { $, $$, esc, css } = S;

  /* ABC: A hasta el 80 % acumulado, B hasta el 95 %, C el resto */
  S.abc = function (items, key) {
    const tot = items.reduce((a, x) => a + Math.max(0, x[key]), 0) || 1;
    let acc = 0; const cls = new Map();
    items.slice().sort((a, b) => b[key] - a[key]).forEach((x) => { const before = acc; acc += Math.max(0, x[key]) / tot; cls.set(x, before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C'); });
    return cls;
  };
  const CROSS = {
    AA: ['Estratégicos', 'Protégelos: servicio prioritario, contratos a largo y precios cuidados.'],
    AB: ['Grandes y correctos', 'Busca subir margen con servicios añadidos.'],
    AC: ['Te hacen grande, no rico', 'Renegocia precio, rappels y coste de servirles; fija mínimos de pedido.'],
    BA: ['Rentables en crecimiento', 'Invierte en crecer con ellos: son tus próximos A.'],
    BB: ['Cartera media', 'Mantén con coste comercial contenido.'],
    BC: ['Margen débil', 'Revisa tarifas y condiciones.'],
    CA: ['Joyas pequeñas', 'Mucho margen y poco volumen: dales más gama.'],
    CB: ['Ocasionales', 'Atiéndelos por canales de bajo coste.'],
    CC: ['Revisar', 'Probablemente cuesta más servirles de lo que aportan: canal digital o precio mínimo.']
  };

  /* ---------- Ventas, clientes y productos (ABC y ABC′) ---------- */
  S.defaults.comercial = {
    ejemplo: true,
    clientes: [
      { nombre: 'Distribuciones Norte', ventas: 820000, costeVariable: 610000, dias: 90 }, { nombre: 'Grupo Levante', ventas: 640000, costeVariable: 380000, dias: 75 },
      { nombre: 'Industrias Sur', ventas: 510000, costeVariable: 300000, dias: 60 }, { nombre: 'Cadena Centro', ventas: 430000, costeVariable: 330000, dias: 120 },
      { nombre: 'Talleres Ebro', ventas: 310000, costeVariable: 170000, dias: 45 }, { nombre: 'Montajes Duero', ventas: 260000, costeVariable: 150000, dias: 60 },
      { nombre: 'Ferretería Atlántica', ventas: 220000, costeVariable: 115000, dias: 30 }, { nombre: 'Exportaciones Mar', ventas: 190000, costeVariable: 104000, dias: 75 },
      { nombre: 'Construcciones Pirineo', ventas: 150000, costeVariable: 112000, dias: 120 }, { nombre: 'Cliente web', ventas: 120000, costeVariable: 58000, dias: 0 },
      { nombre: 'Pequeños clientes (agrupados)', ventas: 350000, costeVariable: 210000, dias: 45 }, { nombre: 'Mantenimientos varios', ventas: 200000, costeVariable: 95000, dias: 30 }
    ],
    productos: [
      { nombre: 'Línea estándar', unidades: 42000, precio: 38, cv: 25, capacidad: 50000, elasticidad: -1.4 },
      { nombre: 'Línea premium', unidades: 9000, precio: 96, cv: 52, capacidad: 12000, elasticidad: -0.8 },
      { nombre: 'Piezas a medida', unidades: 3100, precio: 210, cv: 118, capacidad: 4000, elasticidad: -0.6 },
      { nombre: 'Recambios', unidades: 26000, precio: 14, cv: 6.5, capacidad: 40000, elasticidad: -0.5 },
      { nombre: 'Servicio técnico (horas)', unidades: 5200, precio: 55, cv: 28, capacidad: 6500, elasticidad: -0.7 },
      { nombre: 'Línea económica', unidades: 21000, precio: 22, cv: 18.5, capacidad: 30000, elasticidad: -2.1 }
    ],
    palancas: { precio: 0, volumen: 0, costeVariable: 0, fijos: 0, mix: 0 }, escenariosGuardados: [],
    oportunidades: [
      { cliente: 'Grupo Levante', importe: 180000, etapa: 'Propuesta', prob: 50, cierre: '', comercial: 'Marta' },
      { cliente: 'Hoteles Bahía', importe: 95000, etapa: 'Cualificada', prob: 25, cierre: '', comercial: 'Luis' },
      { cliente: 'Industrias Sur', importe: 120000, etapa: 'Negociación', prob: 70, cierre: '', comercial: 'Marta' },
      { cliente: 'Nuevo distribuidor Portugal', importe: 260000, etapa: 'Contacto', prob: 10, cierre: '', comercial: 'Luis' },
      { cliente: 'Cadena Centro (ampliación)', importe: 75000, etapa: 'Propuesta', prob: 40, cierre: '', comercial: 'Ana' }
    ],
    objetivoAnual: 0,
    canales: [
      { canal: 'Ferias del sector', inversion: 38000, leads: 140, oportunidades: 32, clientes: 7, ticket: 42000, margen: 36, recurrencia: 4 },
      { canal: 'Comercial directo', inversion: 95000, leads: 260, oportunidades: 70, clientes: 15, ticket: 30000, margen: 34, recurrencia: 5 },
      { canal: 'Web y buscadores', inversion: 18000, leads: 520, oportunidades: 48, clientes: 22, ticket: 5500, margen: 42, recurrencia: 3 },
      { canal: 'Prescriptores', inversion: 12000, leads: 45, oportunidades: 20, clientes: 6, ticket: 26000, margen: 38, recurrencia: 4 },
      { canal: 'Redes sociales', inversion: 9000, leads: 300, oportunidades: 12, clientes: 3, ticket: 4000, margen: 40, recurrencia: 2 }
    ],
    zonas: [
      { zona: 'Valencia', mercado: 9000000, cuota: 6, competencia: 3, apertura: 280000, fijos: 160000, margen: 35, rampa: 12 },
      { zona: 'Madrid', mercado: 22000000, cuota: 3, competencia: 5, apertura: 450000, fijos: 260000, margen: 33, rampa: 18 },
      { zona: 'Zaragoza', mercado: 5000000, cuota: 8, competencia: 2, apertura: 180000, fijos: 110000, margen: 36, rampa: 9 },
      { zona: 'Norte de Portugal', mercado: 7000000, cuota: 4, competencia: 3, apertura: 320000, fijos: 150000, margen: 31, rampa: 15 }
    ]
  };
  const C = () => S.state.comercial;
  const cliRows = () => C().clientes.map((c) => Object.assign(c, { mc: S.num(c.ventas) - S.num(c.costeVariable) }));
  function analisisClientes() {
    const L = cliRows();
    const abcV = S.abc(L, 'ventas'), abcM = S.abc(L, 'mc');
    const tot = L.reduce((a, c) => a + S.num(c.ventas), 0) || 1;
    const sorted = L.slice().sort((a, b) => b.ventas - a.ventas);
    const top1 = S.pct(sorted[0] ? sorted[0].ventas : 0, tot), top5 = S.pct(sorted.slice(0, 5).reduce((a, c) => a + c.ventas, 0), tot);
    const hhi = L.reduce((a, c) => a + Math.pow((c.ventas / tot) * 100, 2), 0);
    return { L, abcV, abcM, tot, top1, top5, hhi, sorted };
  }
  /* HHI y su lectura en lenguaje claro */
  S.hhi = (vals) => { const t = vals.reduce((a, v) => a + Math.max(0, v), 0) || 1; return vals.reduce((a, v) => a + Math.pow((Math.max(0, v) / t) * 100, 2), 0); };
  S.miles = (n) => Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' });
  S.hhiSt = (h) => (h > 2500 ? 'stop' : h > 1500 ? 'warn' : 'ok');
  S.hhiCtx = (h, mayor, pesoMayor, quien) => {
    const eq = Math.max(1, Math.round(10000 / Math.max(1, h)));
    const nivel = h > 2500 ? 'alta: dependes de muy pocos' : h > 1500 ? 'moderada: hay dependencia de los mayores' : 'baja: la cartera está repartida';
    return `Tu índice es ${S.miles(h)}, concentración ${nivel}. Equivale a depender de unos ${eq} ${quien} del mismo tamaño. ${mayor ? `El mayor, ${mayor}, pesa el ${F.pct(pesoMayor)}: ${pesoMayor > 25 ? 'perderlo pondría en riesgo la caja y el margen' : pesoMayor > 15 ? 'su pérdida se notaría mucho; conviene tener un plan de sustitución' : 'su pérdida sería asumible'}.` : ''}`;
  };
  /* Pareto genérico: barras por elemento coloreadas por clase ABC y línea de % acumulado */
  function pareto(host, sorted, val, cls, tip, aria) {
    const tot = sorted.reduce((s, x) => s + Math.max(0, val(x)), 0) || 1;
    const W = 520, Hh = 220, m = { l: 50, r: 34, t: 10, b: 40 }, n = sorted.length, bw = (W - m.l - m.r) / Math.max(1, n);
    const mx = Math.max(1, ...sorted.map(val));
    let acc = 0; const pts = [];
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(aria)}"><g class="grid">${[0, 0.5, 1].map((k) => `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + (1 - k) * (Hh - m.t - m.b)}" y2="${m.t + (1 - k) * (Hh - m.t - m.b)}"/><text x="${m.l - 6}" y="${m.t + (1 - k) * (Hh - m.t - m.b) + 3}" text-anchor="end">${F.eur(mx * k)}</text><text x="${W - m.r + 4}" y="${m.t + (1 - k) * (Hh - m.t - m.b) + 3}">${k * 100} %</text>`).join('')}</g>`;
    sorted.forEach((c, i) => { const h = (Math.max(0, val(c)) / mx) * (Hh - m.t - m.b); const cl = cls(c); svg += `<rect class="pb" data-i="${i}" x="${m.l + i * bw + 1}" y="${Hh - m.b - h}" width="${Math.max(1, bw - 2)}" height="${h}" rx="2" fill="${cl === 'A' ? css('--s3') : cl === 'B' ? css('--s4') : css('--s2')}"/>`; acc += Math.max(0, val(c)); pts.push(`${m.l + i * bw + bw / 2},${m.t + (1 - acc / tot) * (Hh - m.t - m.b)}`); });
    svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="${css('--gold')}" stroke-width="2"/><line x1="${m.l}" x2="${W - m.r}" y1="${m.t + 0.2 * (Hh - m.t - m.b)}" y2="${m.t + 0.2 * (Hh - m.t - m.b)}" class="target"/></svg>`;
    host.innerHTML = svg + `<div class="chart-legend small"><span><i style="background:${css('--s3')}"></i> A</span><span><i style="background:${css('--s4')}"></i> B</span><span><i style="background:${css('--s2')}"></i> C</span><span><i style="background:${css('--gold')};height:2px"></i> % acumulado (línea del 80 %)</span></div>`;
    $$('.pb', host).forEach((b) => { const c = sorted[+b.dataset.i]; b.addEventListener('pointermove', (ev) => A.charts.tip(tip(c), ev.clientX, ev.clientY)); b.addEventListener('pointerleave', A.charts.hideTip); });
  }
  const matrix = (items, abcV, abcM, rowLbl, colLbl, val) => `<div class="matrix3"><div></div>${['A', 'B', 'C'].map((m) => `<div class="h">${m}′ ${colLbl}</div>`).join('')}
    ${['A', 'B', 'C'].map((v) => `<div class="h">${v} ${rowLbl}</div>` + ['A', 'B', 'C'].map((m) => { const l = items.filter((c) => abcV.get(c) === v && abcM.get(c) === m); const k = CROSS[v + m]; return `<div class="c" data-cell="${v}${m}" style="border-color:${v + m === 'AC' || v + m === 'CC' ? 'rgba(224,72,72,.45)' : v + m === 'AA' || v + m === 'CA' || v + m === 'BA' ? 'rgba(47,178,74,.45)' : 'var(--line)'}"><small>${k[0]}</small><b>${l.length}</b><small>${F.eur(l.reduce((s, c) => s + val(c), 0))}</small></div>`; }).join('')).join('')}</div>`;

  function analisisProductos() {
    const L = C().productos.map((p) => Object.assign(p, { ventas: S.num(p.unidades) * S.num(p.precio), mc: S.num(p.unidades) * (S.num(p.precio) - S.num(p.cv)) }));
    const tot = L.reduce((a, p) => a + p.ventas, 0) || 1;
    return { L, tot, abcV: S.abc(L, 'ventas'), abcM: S.abc(L, 'mc'), sorted: L.slice().sort((a, b) => b.ventas - a.ventas), hhi: S.hhi(L.map((p) => p.ventas)) };
  }
  function renderProductos(body) {
    const a = analisisProductos();
    const mcT = a.L.reduce((s, p) => s + p.mc, 0);
    body.innerHTML = `<p class="small muted">Los productos se editan en «Margen de contribución». Aquí se ordenan por venta (ABC) y por margen (ABC′).</p>
      ${S.kpiTiles([
        { k: 'Ventas por producto', v: F.eur(a.tot), d: `${a.L.length} líneas` },
        { k: 'Primer producto', v: F.pct(S.pct(a.sorted[0] ? a.sorted[0].ventas : 0, a.tot)), d: a.sorted[0] ? a.sorted[0].nombre : '' },
        { k: 'Concentración (HHI)', v: S.miles(a.hhi), st: S.hhiSt(a.hhi), d: 'toca para ver qué significa', info: 'Concentración (HHI)', exp: S.hhiCtx(a.hhi, a.sorted[0] && a.sorted[0].nombre, S.pct(a.sorted[0] ? a.sorted[0].ventas : 0, a.tot), 'productos') },
        { k: 'Margen de contribución', v: F.pct(S.pct(mcT, a.tot)), info: 'Margen de contribución', exp: `${F.eur(mcT)} al año entre todos los productos.` }
      ])}
      <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Matriz ABC (ventas) × ABC′ (margen)</h4>${matrix(a.L, a.abcV, a.abcM, 'ventas', 'margen', (c) => c.ventas)}<p class="small" id="abcRead">Toca una casilla.</p></div>
        <div class="glass pad stack"><h4>Pareto de ventas por producto</h4><div class="chart" id="abcPareto"></div></div></div>
      <div class="glass pad mt table-wrap"><table><thead><tr><th style="text-align:left">Producto</th><th>Ventas</th><th>Margen</th><th>MC %</th><th>ABC / ABC′</th><th style="text-align:left">Qué hacer</th></tr></thead><tbody>${a.sorted.map((p) => `<tr><td style="text-align:left">${esc(p.nombre)}</td><td>${F.eur(p.ventas)}</td><td>${F.eur(p.mc)}</td><td>${F.pct(S.pct(p.mc, p.ventas))}</td><td><span class="abc ${a.abcV.get(p)}">${a.abcV.get(p)}</span> <span class="abc ${a.abcM.get(p)}">${a.abcM.get(p)}′</span></td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${CROSS[a.abcV.get(p) + a.abcM.get(p)][1]}</td></tr>`).join('')}</tbody></table></div>`;
    $$('[data-cell]', body).forEach((c) => c.onclick = () => { const k = c.dataset.cell, l = a.L.filter((x) => a.abcV.get(x) === k[0] && a.abcM.get(x) === k[1]); $('#abcRead', body).innerHTML = `<b>${CROSS[k][0]}.</b> ${CROSS[k][1]}<br>${l.map((x) => esc(x.nombre)).join(', ') || 'Ningún producto.'}`; });
    pareto($('#abcPareto', body), a.sorted, (c) => c.ventas, (c) => a.abcV.get(c), (c) => `<h5>${esc(c.nombre)}</h5><dl><dt>Ventas</dt><dd>${F.eur(c.ventas)}</dd><dt>Margen</dt><dd>${F.eur(c.mc)}</dd></dl>`, 'Pareto de ventas por producto');
  }
  function renderProveedores(body) {
    if (!S.comprasAnalisis) { body.innerHTML = '<p class="small muted">Módulo de compras no disponible.</p>'; return; }
    const c = S.comprasAnalisis();
    const sorted = c.R.slice().sort((a, b) => b.imp - a.imp);
    const hhi = S.hhi(c.R.map((p) => S.num(p.compras)));
    const top3 = sorted.slice(0, 3).reduce((a, p) => a + p.imp * 100, 0);
    const unicos = c.R.filter((p) => S.num(p.alternativas) <= 1);
    body.innerHTML = `${S.state.compras.ejemplo ? '<p class="small muted">Datos de ejemplo: los proveedores se editan en la tabla de abajo o en el módulo Compras.</p>' : ''}
      ${S.kpiTiles([
        { k: 'Compras anuales', v: F.eur(c.tot), d: `${c.R.length} proveedores` },
        { k: 'Primer proveedor', v: F.pct(sorted[0] ? sorted[0].imp * 100 : 0), st: sorted[0] && sorted[0].imp > 0.3 ? 'stop' : sorted[0] && sorted[0].imp > 0.2 ? 'warn' : 'ok', d: sorted[0] ? sorted[0].nombre : '' },
        { k: 'Tres primeros', v: F.pct(top3), st: top3 > 75 ? 'warn' : 'ok' },
        { k: 'Concentración de compras (HHI)', v: S.miles(hhi), st: S.hhiSt(hhi), d: 'toca para ver qué significa', info: 'Concentración de compras', exp: S.hhiCtx(hhi, sorted[0] && sorted[0].nombre, sorted[0] ? sorted[0].imp * 100 : 0, 'proveedores') },
        { k: 'Sin alternativa', v: unicos.length, st: unicos.length ? 'warn' : 'ok', d: unicos.map((p) => p.nombre).join(', ') || 'todos tienen sustituto' }
      ])}
      <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Pareto de compras</h4><div class="chart" id="abcPareto"></div></div>
        <div class="glass pad stack"><h4>Clase ABC y Kraljic</h4><div class="table-wrap"><table><thead><tr><th style="text-align:left">Proveedor</th><th>Peso</th><th>ABC</th><th style="text-align:left">Kraljic</th><th style="text-align:left">Qué hacer</th></tr></thead><tbody>${sorted.map((p) => `<tr><td style="text-align:left">${esc(p.nombre)}</td><td>${F.pct(p.imp * 100)}</td><td><span class="abc ${p.abc}">${p.abc}</span></td><td style="text-align:left">${p.q}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${S.KQ[p.q]}</td></tr>`).join('')}</tbody></table></div></div></div>
      <div class="glass pad mt" id="prvTable"></div>`;
    pareto($('#abcPareto', body), sorted, (p) => S.num(p.compras), (p) => p.abc, (p) => `<h5>${esc(p.nombre)}</h5><dl><dt>Compras</dt><dd>${F.eur(S.num(p.compras))}</dd><dt>Peso</dt><dd>${F.pct(p.imp * 100)}</dd><dt>Kraljic</dt><dd>${p.q}</dd></dl>`, 'Pareto de compras por proveedor');
    S.comprasTabla($('#prvTable', body));
  }

  S.register({
    id: 'ventas', nombre: 'ABC y concentración', grupo: 'Comercial',
    render(host) {
      const vista = S.state.comercial.vistaABC || 'clientes';
      host.innerHTML = `${S.section('Análisis ABC y ABC′', 'El ABC ordena por lo que facturan (o por lo que te compras, en proveedores); el ABC′ (ABC prima) por el margen de contribución que dejan. Cruzarlos enseña a quién proteger, con quién renegociar y a quién atender por un canal más barato. Toca cualquier indicador con «?» para ver qué significa y cómo leer tu dato.')}
        <div class="tabs" role="tablist" id="abcTabs">${[['clientes', 'Clientes'], ['productos', 'Productos'], ['proveedores', 'Proveedores y compras']].map(([k, l]) => `<button role="tab" data-v="${k}" aria-selected="${k === vista}">${l}</button>`).join('')}</div>
        <div id="abcBody" class="stack"></div>`;
      $$('#abcTabs button', host).forEach((b) => b.onclick = () => { S.state.comercial.vistaABC = b.dataset.v; S.save(); S.rerender(); });
      const body = $('#abcBody', host);
      if (vista === 'productos') return renderProductos(body);
      if (vista === 'proveedores') return renderProveedores(body);
      const a = analisisClientes();
      body.innerHTML = `${C().ejemplo ? '<p class="small muted">Datos de ejemplo: importa tu listado de ventas por cliente (Excel, CSV o PDF) o escríbelo en la tabla de abajo.</p>' : ''}
        ${S.kpiTiles([
          { k: 'Ventas de la cartera', v: F.eur(a.tot), d: `${a.L.length} clientes` },
          { k: 'Primer cliente', v: F.pct(a.top1), st: a.top1 > 25 ? 'stop' : a.top1 > 15 ? 'warn' : 'ok', d: 'de la facturación' },
          { k: 'Cinco primeros', v: F.pct(a.top5), st: a.top5 > 70 ? 'warn' : 'ok' },
          { k: 'Concentración (HHI)', v: S.miles(a.hhi), st: S.hhiSt(a.hhi), d: 'toca para ver qué significa', info: 'Concentración (HHI)', exp: S.hhiCtx(a.hhi, a.sorted[0] && a.sorted[0].nombre, a.top1, 'clientes') },
          { k: 'Margen de contribución', v: F.pct(S.pct(a.L.reduce((s, c) => s + c.mc, 0), a.tot)), info: 'Margen de contribución', exp: 'Margen medio de la cartera después de los costes variables de servir a cada cliente.' }
        ])}
        <div class="grid cols-2 mt">
          <div class="glass pad stack"><h4>Matriz ABC (ventas) × ABC′ (margen)</h4>${matrix(a.L, a.abcV, a.abcM, 'ventas', 'margen', (c) => c.ventas)}
            <p class="small" id="abcRead">Toca una casilla para ver qué clientes hay y qué hacer con ellos.</p></div>
          <div class="glass pad stack"><h4>Pareto de ventas</h4><div class="chart" id="abcPareto"></div></div>
        </div>
        <div class="glass pad mt" id="cliTable"></div>`;
      $$('[data-cell]', body).forEach((c) => c.onclick = () => { const k = c.dataset.cell, l = a.L.filter((x) => a.abcV.get(x) === k[0] && a.abcM.get(x) === k[1]); $('#abcRead', body).innerHTML = `<b>${CROSS[k][0]}.</b> ${CROSS[k][1]}<br>${l.map((x) => esc(x.nombre)).join(', ') || 'Ningún cliente.'}`; });
      pareto($('#abcPareto', body), a.sorted, (c) => c.ventas, (c) => a.abcV.get(c), (c) => `<h5>${esc(c.nombre)}</h5><dl><dt>Ventas</dt><dd>${F.eur(c.ventas)}</dd><dt>Margen</dt><dd>${F.eur(c.mc)} (${F.pct(S.pct(c.mc, c.ventas))})</dd><dt>ABC / ABC′</dt><dd>${a.abcV.get(c)} / ${a.abcM.get(c)}′</dd></dl>`, 'Pareto de ventas por cliente');
      S.etable($('#cliTable', body), {
        titulo: 'Clientes', rows: C().clientes, onChange: () => { C().ejemplo = false; S.save(); S.rerender(); }, nuevo: () => ({ nombre: '', ventas: 0, costeVariable: 0, dias: 60 }),
        cols: [
          { k: 'nombre', l: 'Cliente', type: 'text', syn: ['cliente', 'nombre', 'razon social'] },
          { k: 'ventas', l: 'Ventas', type: 'num', syn: ['ventas', 'facturacion', 'importe', 'base imponible'] },
          { k: 'costeVariable', l: 'Coste variable', type: 'num', syn: ['coste', 'coste variable', 'coste de ventas'] },
          { k: 'dias', l: 'Días de cobro', type: 'num', syn: ['dias', 'plazo de cobro', 'dso'] },
          { k: 'mc', l: 'Margen contrib.', calc: (r) => F.eur(S.num(r.ventas) - S.num(r.costeVariable)) },
          { k: 'pmc', l: 'MC %', calc: (r) => F.pct(S.pct(S.num(r.ventas) - S.num(r.costeVariable), S.num(r.ventas))) },
          { k: 'abc', l: 'ABC / ABC′', calc: (r) => { const x = analisisClientes(); const c = x.L.find((y) => y === r); return c ? `<span class="abc ${x.abcV.get(c)}">${x.abcV.get(c)}</span> <span class="abc ${x.abcM.get(c)}">${x.abcM.get(c)}′</span>` : ''; } }
        ]
      });
    },
    kpis() { const a = analisisClientes(); return [{ k: 'Peso del primer cliente', v: F.pct(a.top1), st: a.top1 > 25 ? 'stop' : a.top1 > 15 ? 'warn' : 'ok' }, { k: 'Clientes «grandes no rentables»', v: a.L.filter((c) => a.abcV.get(c) === 'A' && a.abcM.get(c) === 'C').length, st: a.L.some((c) => a.abcV.get(c) === 'A' && a.abcM.get(c) === 'C') ? 'warn' : 'ok' }]; },
    risks() {
      const a = analisisClientes(), R = [];
      if (a.top1 > 15) R.push(S.mkRisk(`Dependencia de ${a.sorted[0].nombre} (${F.pct(a.top1)} de las ventas)`, 3, a.top1 > 25 ? 5 : 4, 'Diversificar cartera y blindar contrato con el cliente principal.'));
      const lentos = a.L.filter((c) => c.dias > 90 && a.abcV.get(c) === 'A');
      if (lentos.length) R.push(S.mkRisk(`Clientes A que pagan a más de 90 días (${lentos.length})`, 3, 3, 'Negociar plazos o usar factoring sin recurso con ellos.'));
      return R;
    },
    findings() {
      const a = analisisClientes();
      return a.L.filter((c) => a.abcV.get(c) === 'A' && a.abcM.get(c) === 'C').map((c) => ({ hallazgo: `${c.nombre} factura mucho con poco margen (${F.pct(S.pct(c.mc, c.ventas))}).`, accion: 'Renegociar precio, rappels y coste de servicio.', impactoEUR: c.ventas * 0.03, tipo: 'ebitda', plazo: 90 }));
    }
  });

  /* ---------- Margen de contribución sobre la demanda (cuadro operativo funcional) ---------- */
  function mcModel(lev) {
    lev = lev || C().palancas;
    const P = C().productos;
    const base = P.map((p) => ({ p, u: S.num(p.unidades), precio: S.num(p.precio), cv: S.num(p.cv) }));
    const fijos = S.sim.empresa.personal + S.sim.empresa.fijos;
    const mcU = base.map((b) => b.precio - b.cv);
    const avgMcPct = base.reduce((a, b) => a + (b.precio - b.cv) * b.u, 0) / Math.max(1, base.reduce((a, b) => a + b.precio * b.u, 0));
    const est = base.map((b) => {
      const precio = b.precio * (1 + lev.precio / 100);
      const cv = b.cv * (1 + lev.costeVariable / 100);
      const mixF = 1 + (lev.mix / 100) * ((b.precio - b.cv) / b.precio - avgMcPct) * 4; // el mix desplaza volumen hacia lo de más margen
      const demanda = b.u * (1 + lev.volumen / 100) * (1 + S.num(b.p.elasticidad) * lev.precio / 100) * Math.max(0, mixF);
      const u = Math.max(0, Math.min(S.num(b.p.capacidad) || Infinity, demanda));
      return { nombre: b.p.nombre, u, precio, cv, ventas: u * precio, mc: u * (precio - cv), limitado: demanda > (S.num(b.p.capacidad) || Infinity), demanda };
    });
    const sum = (arr, k) => arr.reduce((a, x) => a + x[k], 0);
    const actual = base.map((b) => ({ nombre: b.p.nombre, u: b.u, precio: b.precio, cv: b.cv, ventas: b.u * b.precio, mc: b.u * (b.precio - b.cv) }));
    const fijosE = fijos * (1 + lev.fijos / 100);
    const res = (arr, fx) => ({ ventas: sum(arr, 'ventas'), mc: sum(arr, 'mc'), fijos: fx, baii: sum(arr, 'mc') - fx, equilibrio: fx / Math.max(1e-9, sum(arr, 'mc') / Math.max(1, sum(arr, 'ventas'))), seguridad: 1 - (fx / Math.max(1e-9, sum(arr, 'mc') / Math.max(1, sum(arr, 'ventas')))) / Math.max(1, sum(arr, 'ventas')) });
    // Descomposición del cambio de margen: precio, volumen, mix y coste
    const efPrecio = est.reduce((a, x, i) => a + x.u * (x.precio - actual[i].precio), 0);
    const efCoste = -est.reduce((a, x, i) => a + x.u * (x.cv - actual[i].cv), 0);
    const totU0 = sum(actual, 'u'), totU1 = sum(est, 'u');
    const mcMedioU = sum(actual, 'mc') / Math.max(1, totU0);
    const efVolumen = (totU1 - totU0) * mcMedioU;
    const efMix = sum(est, 'mc') - sum(actual, 'mc') - efPrecio - efCoste - efVolumen;
    return { actual, est, A0: res(actual, fijos), A1: res(est, fijosE), efectos: { precio: efPrecio, volumen: efVolumen, mix: efMix, coste: efCoste, fijos: -(fijosE - fijos) } };
  }
  S.levers = () => C().palancas;
  S.setLever = (k, v) => { if (!(k in C().palancas)) throw new Error('Palanca no válida'); const before = mcModel().A1.baii; C().palancas[k] = Number(v); S.save(); if (S.mod('margen')) S.rerender(); const after = mcModel().A1.baii; return { palanca: k, valor: v, resultadoAntes: F.eur(before), resultadoAhora: F.eur(after) }; };
  S.register({
    id: 'margen', nombre: 'Margen y demanda', grupo: 'Comercial',
    render(host) {
      const L = C().palancas;
      const lv = [['precio', 'Precio', -15, 15, 0.5], ['volumen', 'Esfuerzo comercial (volumen)', -20, 30, 1], ['costeVariable', 'Coste variable (compras)', -15, 15, 0.5], ['fijos', 'Costes fijos', -20, 20, 1], ['mix', 'Mix hacia productos de más margen', 0, 30, 1]];
      host.innerHTML = `${S.section('Cuadro operativo: margen de contribución sobre la demanda', 'Compara lo que deja la demanda actual con lo que dejaría tu estrategia. Mueve las palancas: el volumen reacciona al precio según la elasticidad de cada producto y se limita a la capacidad. El efecto se descompone en precio, volumen, mix y coste.')}
        <div id="mcKpis"></div>
        <div class="grid cols-2 mt">
          <div class="glass pad stack"><h4>Palancas de la estrategia</h4><div class="lever-grid">${lv.map(([k, n, mn, mx, st]) => `<div class="field"><div class="top"><label for="lv_${k}">${n}</label><span class="num" id="lvv_${k}">${L[k] >= 0 ? '+' : ''}${L[k]} %</span></div><input type="range" id="lv_${k}" min="${mn}" max="${mx}" step="${st}" value="${L[k]}" style="--p:${((L[k] - mn) / (mx - mn)) * 100}%"></div>`).join('')}</div>
            <div class="row"><input class="input" id="lvName" placeholder="Nombre de la estrategia" style="flex:1"><button class="btn" id="lvSave">Guardar escenario</button><button class="btn ghost" id="lvReset">Volver a cero</button></div></div>
          <div class="glass pad stack"><h4>De dónde sale el cambio de resultado</h4><div id="mcEf"></div></div>
        </div>
        <div class="glass pad mt stack"><h4>Por producto</h4><div class="table-wrap" id="mcProd"></div></div>
        <div id="mcSaved"></div>
        <div class="glass pad mt" id="prodTable"></div>`;
      const paint = () => {
        const M = mcModel();
        $('#mcKpis', host).innerHTML = S.kpiTiles([
          { k: 'Margen de contribución', v: F.eur(M.A1.mc), d: `hoy ${F.eur(M.A0.mc)}`, st: M.A1.mc >= M.A0.mc ? 'ok' : 'warn', info: 'Margen de contribución' },
          { k: 'Resultado operativo', v: F.eur(M.A1.baii), d: `hoy ${F.eur(M.A0.baii)}`, st: M.A1.baii >= M.A0.baii ? 'ok' : 'stop' },
          { k: 'Punto de equilibrio', v: F.eur(M.A1.equilibrio), d: `hoy ${F.eur(M.A0.equilibrio)}`, info: 'Punto de equilibrio' },
          { k: 'Margen de seguridad', v: F.pct(M.A1.seguridad * 100), st: M.A1.seguridad > 0.15 ? 'ok' : M.A1.seguridad > 0 ? 'warn' : 'stop', d: 'cuánto pueden caer las ventas sin pérdidas' }
        ]);
        $('#mcEf', host).innerHTML = S.hbars([{ n: 'Efecto precio', v: M.efectos.precio }, { n: 'Efecto volumen', v: M.efectos.volumen }, { n: 'Efecto mix', v: M.efectos.mix }, { n: 'Efecto coste variable', v: M.efectos.coste }, { n: 'Efecto costes fijos', v: M.efectos.fijos }].map((x) => Object.assign(x, { c: x.v >= 0 ? css('--s1') : css('--s2') })), (v) => (v >= 0 ? '+' : '') + F.eur(v)) +
          `<p class="small">Resultado: ${F.eur(M.A0.baii)} → <b>${F.eur(M.A1.baii)}</b> (${M.A1.baii - M.A0.baii >= 0 ? '+' : ''}${F.eur(M.A1.baii - M.A0.baii)}).</p>`;
        $('#mcProd', host).innerHTML = `<table><thead><tr><th>Producto</th><th>Unidades hoy</th><th>Unidades estrategia</th><th>Precio</th><th>MC unitario</th><th>MC %</th><th>MC total</th><th>Capacidad</th></tr></thead><tbody>
          ${M.est.map((x, i) => `<tr><td>${esc(x.nombre)}</td><td>${F.num(M.actual[i].u)}</td><td>${F.num(x.u)}</td><td>${F.eurFull(x.precio)}</td><td>${F.eurFull(x.precio - x.cv)}</td><td>${F.pct(S.pct(x.precio - x.cv, x.precio))}</td><td>${F.eur(x.mc)}</td><td>${x.limitado ? '<span class="state st-warn">al límite</span>' : 'holgura'}</td></tr>`).join('')}</tbody></table>`;
        const G = C().escenariosGuardados;
        $('#mcSaved', host).innerHTML = G.length ? `<div class="glass pad mt stack"><h4>Escenarios estratégicos guardados</h4><div class="table-wrap"><table><thead><tr><th>Estrategia</th><th>Precio</th><th>Volumen</th><th>Coste var.</th><th>Fijos</th><th>Mix</th><th>Ventas</th><th>Resultado</th><th></th></tr></thead><tbody>${G.map((e, i) => { const m = mcModel(e.palancas); return `<tr><td>${esc(e.nombre)}</td>${['precio', 'volumen', 'costeVariable', 'fijos', 'mix'].map((k) => `<td>${e.palancas[k]} %</td>`).join('')}<td>${F.eur(m.A1.ventas)}</td><td>${F.eur(m.A1.baii)}</td><td><button class="btn ghost" data-load="${i}">Cargar</button><button class="icon-btn" data-del="${i}" aria-label="Borrar">×</button></td></tr>`; }).join('')}</tbody></table></div></div>` : '';
        $$('[data-load]', host).forEach((b) => b.onclick = () => { Object.assign(L, G[+b.dataset.load].palancas); S.save(); S.rerender(); });
        $$('[data-del]', host).forEach((b) => b.onclick = () => { G.splice(+b.dataset.del, 1); S.save(); paint(); });
      };
      paint();
      lv.forEach(([k, , mn, mx]) => { const r = $('#lv_' + k, host); r.oninput = () => { L[k] = +r.value; $('#lvv_' + k, host).textContent = `${L[k] >= 0 ? '+' : ''}${L[k]} %`; r.style.setProperty('--p', ((L[k] - mn) / (mx - mn)) * 100 + '%'); paint(); S.save(); }; });
      $('#lvSave', host).onclick = () => { C().escenariosGuardados.push({ nombre: $('#lvName', host).value || 'Estrategia ' + (C().escenariosGuardados.length + 1), palancas: Object.assign({}, L) }); S.save(); paint(); };
      $('#lvReset', host).onclick = () => { Object.keys(L).forEach((k) => { L[k] = 0; }); S.save(); S.rerender(); };
      S.etable($('#prodTable', host), {
        titulo: 'Productos y demanda', rows: C().productos, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ nombre: '', unidades: 0, precio: 0, cv: 0, capacidad: 0, elasticidad: -1 }),
        cols: [{ k: 'nombre', l: 'Producto', type: 'text', syn: ['producto', 'articulo', 'referencia', 'familia'] }, { k: 'unidades', l: 'Demanda (uds/año)', type: 'num', syn: ['unidades', 'cantidad', 'demanda'] }, { k: 'precio', l: 'Precio medio', type: 'num', syn: ['precio', 'pvp', 'precio medio'] }, { k: 'cv', l: 'Coste variable unitario', type: 'num', syn: ['coste', 'coste unitario', 'coste variable'] }, { k: 'capacidad', l: 'Capacidad (uds/año)', type: 'num', syn: ['capacidad'] }, { k: 'elasticidad', l: 'Elasticidad precio', type: 'num', syn: ['elasticidad'] }]
      });
    },
    kpis() { const M = mcModel(); return [{ k: 'Margen de seguridad', v: F.pct(M.A0.seguridad * 100), st: M.A0.seguridad > 0.15 ? 'ok' : M.A0.seguridad > 0 ? 'warn' : 'stop' }, { k: 'Mejora de la estrategia', v: F.eur(M.A1.baii - M.A0.baii), st: M.A1.baii >= M.A0.baii ? 'ok' : 'warn' }]; },
    risks() { const M = mcModel(); const lim = M.est.filter((x) => x.limitado); return lim.length ? [S.mkRisk(`Capacidad al límite en ${lim.map((x) => x.nombre).join(', ')}`, 3, 3, 'La demanda supera la capacidad: subir precio en esas líneas o ampliar capacidad (ver simulador).')] : []; },
    findings() {
      const M = mcModel(); const out = [];
      M.actual.forEach((x) => { if (x.precio > 0 && (x.precio - x.cv) / x.precio < 0.2) out.push({ hallazgo: `${x.nombre} deja solo un ${F.pct(S.pct(x.precio - x.cv, x.precio))} de margen de contribución.`, accion: 'Subir precio o rediseñar el coste; si no, limitarlo a pedidos que arrastren otros productos.', impactoEUR: x.ventas * 0.03, tipo: 'ebitda', plazo: 90 }); });
      return out;
    }
  });

  /* ---------- Pipeline comercial ---------- */
  const ETAPAS = ['Contacto', 'Cualificada', 'Propuesta', 'Negociación', 'Ganada', 'Perdida'];
  S.register({
    id: 'comercial', nombre: 'Pipeline comercial', grupo: 'Comercial',
    render(host) {
      const O = C().oportunidades.filter((o) => o.etapa !== 'Perdida');
      const objetivo = S.num(C().objetivoAnual) || S.sim.empresa.ventas * (S.sim.empresa.crecimiento / 100 + 0.1);
      const abiertas = O.filter((o) => o.etapa !== 'Ganada');
      const pipe = abiertas.reduce((a, o) => a + S.num(o.importe), 0), pond = abiertas.reduce((a, o) => a + S.num(o.importe) * S.num(o.prob) / 100, 0);
      const ganada = O.filter((o) => o.etapa === 'Ganada').reduce((a, o) => a + S.num(o.importe), 0);
      const porCom = {}; O.forEach((o) => { porCom[o.comercial || 'Sin asignar'] = (porCom[o.comercial || 'Sin asignar'] || 0) + S.num(o.importe) * S.num(o.prob) / 100; });
      host.innerHTML = `${S.section('Pipeline comercial', 'Las oportunidades abiertas, su probabilidad y la previsión ponderada frente al objetivo de venta nueva del año.')}
        ${S.kpiTiles([
          { k: 'Pipeline abierto', v: F.eur(pipe), d: `${abiertas.length} oportunidades` },
          { k: 'Previsión ponderada', v: F.eur(pond) },
          { k: 'Ganado', v: F.eur(ganada) },
          { k: 'Cobertura del objetivo', v: F.x(pipe / Math.max(1, objetivo - ganada)), st: pipe >= (objetivo - ganada) * 3 ? 'ok' : pipe >= (objetivo - ganada) * 1.5 ? 'warn' : 'stop', d: `objetivo de venta nueva ${F.eur(objetivo)}; lo sano es 3×` }
        ])}
        <div class="row mt"><label class="small">Objetivo anual de venta nueva <input class="input" id="obj" style="width:130px" value="${C().objetivoAnual || ''}" placeholder="${Math.round(objetivo)}"></label></div>
        <div class="kanban mt">${ETAPAS.slice(0, 5).map((e) => { const l = O.filter((o) => o.etapa === e); return `<div class="col"><h4>${e}</h4><b class="num">${F.eur(l.reduce((a, o) => a + S.num(o.importe), 0))}</b>${l.map((o) => `<p class="small">${esc(o.cliente)} · ${F.eur(o.importe)} · ${o.prob} %</p>`).join('')}</div>`; }).join('')}</div>
        <div class="glass pad mt stack"><h4>Previsión ponderada por comercial</h4>${S.hbars(Object.keys(porCom).map((k) => ({ n: k, v: porCom[k] })), F.eur)}</div>
        <div class="glass pad mt" id="opTable"></div>`;
      $('#obj', host).onchange = (e) => { C().objetivoAnual = S.num(e.target.value); S.save(); S.rerender(); };
      S.etable($('#opTable', host), {
        titulo: 'Oportunidades', rows: C().oportunidades, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ cliente: '', importe: 0, etapa: 'Contacto', prob: 10, cierre: '', comercial: '' }),
        cols: [{ k: 'cliente', l: 'Cliente', type: 'text', syn: ['cliente', 'cuenta', 'empresa'] }, { k: 'importe', l: 'Importe', type: 'num', syn: ['importe', 'valor', 'amount'] }, { k: 'etapa', l: 'Etapa', type: 'select', opts: ETAPAS }, { k: 'prob', l: 'Probabilidad %', type: 'num', syn: ['probabilidad', 'prob'] }, { k: 'cierre', l: 'Cierre previsto', type: 'date', syn: ['cierre', 'fecha'] }, { k: 'comercial', l: 'Comercial', type: 'text', syn: ['comercial', 'vendedor', 'propietario'] }],
        dictar: (t) => { const v = A.docs.parseAmount(t); if (!isFinite(v)) return null; return { cliente: t.split(/\d/)[0].replace(/oportunidad( con| de)?/i, '').trim() || t, importe: v, etapa: 'Contacto', prob: 10, cierre: '', comercial: '' }; }
      });
    },
    kpis() { const O = C().oportunidades.filter((o) => !['Ganada', 'Perdida'].includes(o.etapa)); const p = O.reduce((a, o) => a + S.num(o.importe) * S.num(o.prob) / 100, 0); return [{ k: 'Previsión ponderada', v: F.eur(p) }]; },
    risks() { const O = C().oportunidades.filter((o) => !['Ganada', 'Perdida'].includes(o.etapa)); const pipe = O.reduce((a, o) => a + S.num(o.importe), 0); const inc = S.sim.inversion.incVentas / 100 * S.sim.empresa.ventas; return pipe < inc ? [S.mkRisk('El pipeline no cubre la venta nueva que exige la inversión', 4, 4, `Hace falta ${F.eur(inc)} de venta nueva; el pipeline abierto suma ${F.eur(pipe)}. Precomprometer clientes antes de invertir.`)] : []; }
  });

  /* ---------- Marketing ---------- */
  S.register({
    id: 'marketing', nombre: 'Marketing', grupo: 'Comercial',
    render(host) {
      const R = C().canales.map((c) => { const inv = S.num(c.inversion), cli = S.num(c.clientes); const cac = cli ? inv / cli : Infinity; const ltv = S.num(c.ticket) * S.num(c.margen) / 100 * S.num(c.recurrencia); return Object.assign({}, c, { cpl: S.num(c.leads) ? inv / S.num(c.leads) : 0, conv: S.pct(cli, S.num(c.leads)), cac, ltv, ratio: cac ? ltv / cac : 0, roi: inv ? (cli * S.num(c.ticket) * S.num(c.margen) / 100 - inv) / inv : 0 }); });
      const inv = R.reduce((a, c) => a + S.num(c.inversion), 0), cli = R.reduce((a, c) => a + S.num(c.clientes), 0);
      const best = R.slice().sort((a, b) => b.ratio - a.ratio);
      host.innerHTML = `${S.section('Marketing', 'Lo que cuesta conseguir un cliente en cada canal (CAC) frente a lo que deja a lo largo de la relación (LTV). Por encima de 3 veces, el canal merece más presupuesto.')}
        ${S.kpiTiles([{ k: 'Inversión anual', v: F.eur(inv) }, { k: 'Clientes nuevos', v: F.num(cli) }, { k: 'CAC medio', v: F.eur(inv / Math.max(1, cli)), info: 'CAC' }, { k: 'Mejor canal', v: best[0] ? best[0].canal : '—', d: best[0] ? `LTV/CAC ${F.x(best[0].ratio)}` : '' }])}
        <div class="glass pad mt stack"><h4>Rendimiento por canal</h4><div class="table-wrap"><table><thead><tr><th>Canal</th><th>Coste por lead</th><th>Conversión</th><th>CAC</th><th>LTV</th><th>LTV/CAC</th><th>ROI 1.er año</th></tr></thead><tbody>${R.map((c) => `<tr><td>${esc(c.canal)}</td><td>${F.eur(c.cpl)}</td><td>${F.pct(c.conv)}</td><td>${F.eur(c.cac)}</td><td>${F.eur(c.ltv)}</td><td><span class="state st-${c.ratio >= 3 ? 'ok' : c.ratio >= 1.5 ? 'warn' : 'stop'}">${F.x(c.ratio)}</span></td><td>${F.pct(c.roi * 100)}</td></tr>`).join('')}</tbody></table></div>
        ${best.length > 1 ? `<p class="small">Reasignar un 20 % del presupuesto de <b>${esc(best[best.length - 1].canal)}</b> a <b>${esc(best[0].canal)}</b> aportaría unos ${F.num(Math.round(S.num(best[best.length - 1].inversion) * 0.2 / Math.max(1, best[0].cac)))} clientes más al año con el mismo gasto.</p>` : ''}</div>
        <div class="glass pad mt" id="chTable"></div>`;
      S.etable($('#chTable', host), {
        titulo: 'Canales', rows: C().canales, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ canal: '', inversion: 0, leads: 0, oportunidades: 0, clientes: 0, ticket: 0, margen: S.sim.empresa.margen, recurrencia: 3 }),
        cols: [{ k: 'canal', l: 'Canal', type: 'text' }, { k: 'inversion', l: 'Inversión', type: 'num' }, { k: 'leads', l: 'Contactos', type: 'num', syn: ['leads'] }, { k: 'oportunidades', l: 'Oportunidades', type: 'num' }, { k: 'clientes', l: 'Clientes', type: 'num' }, { k: 'ticket', l: 'Venta media anual', type: 'num', syn: ['ticket'] }, { k: 'margen', l: 'Margen %', type: 'num' }, { k: 'recurrencia', l: 'Años de relación', type: 'num' }]
      });
    },
    kpis() { const c = C().canales; const inv = c.reduce((a, x) => a + S.num(x.inversion), 0), cl = c.reduce((a, x) => a + S.num(x.clientes), 0); return [{ k: 'CAC medio', v: F.eur(inv / Math.max(1, cl)) }]; },
    findings() { return C().canales.filter((c) => { const cac = S.num(c.inversion) / Math.max(1, S.num(c.clientes)); const ltv = S.num(c.ticket) * S.num(c.margen) / 100 * S.num(c.recurrencia); return ltv / cac < 1.5; }).map((c) => ({ hallazgo: `El canal ${c.canal} no recupera lo que cuesta captar cada cliente.`, accion: 'Reducir o rediseñar el canal y mover el presupuesto al de mejor LTV/CAC.', impactoEUR: S.num(c.inversion) * 0.4, tipo: 'ebitda', plazo: 90 })); }
  });

  /* ---------- Expansión territorial ---------- */
  S.register({
    id: 'expansion', nombre: 'Expansión territorial', grupo: 'Estrategia',
    render(host) {
      const Z = C().zonas.map((z) => { const ventas = S.num(z.mercado) * S.num(z.cuota) / 100; const ebitda = ventas * S.num(z.margen) / 100 - S.num(z.fijos); const pay = ebitda > 0 ? S.num(z.apertura) / ebitda + S.num(z.rampa) / 24 : Infinity; const score = Math.max(0, Math.min(100, (ebitda > 0 ? 40 : 0) + Math.max(0, 30 - (isFinite(pay) ? pay * 6 : 30)) + (5 - S.num(z.competencia)) * 6)); return Object.assign({}, z, { ventas, ebitda, pay, score }); }).sort((a, b) => b.score - a.score);
      host.innerHTML = `${S.section('Expansión territorial', 'Compara zonas candidatas por mercado, cuota alcanzable, competencia, inversión de apertura y recuperación. La mejor puedes enviarla al simulador para comprobar si la empresa la soporta sin romper la tesorería.')}
        <div class="glass pad stack"><h4>Ranking de zonas</h4><div class="table-wrap"><table><thead><tr><th>#</th><th>Zona</th><th>Ventas objetivo</th><th>EBITDA anual</th><th>Recuperación</th><th>Competencia</th><th>Atractivo</th><th></th></tr></thead><tbody>${Z.map((z, i) => `<tr><td>${i + 1}</td><td>${esc(z.zona)}</td><td>${F.eur(z.ventas)}</td><td style="color:${z.ebitda < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(z.ebitda)}</td><td>${isFinite(z.pay) ? F.months(z.pay * 12) : 'No recupera'}</td><td>${z.competencia}/5</td><td><span class="state st-${z.score >= 60 ? 'ok' : z.score >= 35 ? 'warn' : 'stop'}">${Math.round(z.score)}</span></td><td><button class="btn ghost" data-sim="${i}">Probar en el simulador</button></td></tr>`).join('')}</tbody></table></div><p class="small" id="exMsg"></p></div>
        <div class="glass pad mt" id="zTable"></div>`;
      $$('[data-sim]', host).forEach((b) => b.onclick = () => {
        const z = Z[+b.dataset.sim], inv = S.sim.inversion;
        inv.importe = S.num(z.apertura); inv.incVentas = Math.round(S.pct(z.ventas, S.sim.empresa.ventas)); inv.fijosNuevos = S.num(z.fijos); inv.rampa = S.num(z.rampa); inv.margenNuevo = S.num(z.margen);
        S.sim.proyecto = 'Apertura en ' + z.zona; S.saveSim();
        const r = S.analysis('base'), p = S.analysis('pesimista');
        $('#exMsg', host).innerHTML = `Simulador actualizado con <b>${esc(z.zona)}</b>: veredicto «${r.verdict.titulo}», liquidez mínima ${F.eur(r.cajaRef)} (pesimista ${F.eur(p.cajaRef)}). <a href="app.html" style="color:var(--gold)">Abrir el simulador</a>`;
      });
      S.etable($('#zTable', host), {
        titulo: 'Zonas candidatas', rows: C().zonas, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ zona: '', mercado: 0, cuota: 3, competencia: 3, apertura: 0, fijos: 0, margen: S.sim.empresa.margen, rampa: 12 }),
        cols: [{ k: 'zona', l: 'Zona', type: 'text' }, { k: 'mercado', l: 'Mercado (€/año)', type: 'num' }, { k: 'cuota', l: 'Cuota alcanzable %', type: 'num' }, { k: 'competencia', l: 'Competencia 1-5', type: 'num' }, { k: 'apertura', l: 'Inversión de apertura', type: 'num' }, { k: 'fijos', l: 'Fijos anuales', type: 'num' }, { k: 'margen', l: 'Margen %', type: 'num' }, { k: 'rampa', l: 'Meses de rampa', type: 'num' }]
      });
    },
    kpis() { const z = C().zonas.map((x) => S.num(x.mercado) * S.num(x.cuota) / 100 * S.num(x.margen) / 100 - S.num(x.fijos)); return [{ k: 'Zonas rentables', v: `${z.filter((v) => v > 0).length} de ${z.length}` }]; },
    risks() { return C().zonas.filter((x) => S.num(x.competencia) >= 5).map((x) => S.mkRisk(`Competencia muy intensa en ${x.zona}`, 3, 3, 'Entrar con una propuesta diferenciada o por un socio local.')); }
  });
})();
