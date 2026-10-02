/* Atalaya · Página comercial: portada 3D, tarjetas que se elevan, demo interactiva con el motor real,
   explorador del sistema estratégico y planes */
(function () {
  // Acceso oculto a la administración: dirección de la página terminada en #admin (no hay enlace visible)
  const goAdmin = () => { if (location.hash === '#admin') location.replace('admin.html'); };
  goAdmin(); addEventListener('hashchange', goAdmin);
  const A = window.Atalaya, F = A.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(pointer: fine)').matches;
  A.sky();

  /* Three.js compartido (fondo del espacio y ecosistema): se descarga una sola vez y bajo demanda */
  let threeP = null;
  A.loadThree = () => threeP || (threeP = window.THREE ? Promise.resolve(window.THREE) : new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.onload = () => (window.THREE ? ok(window.THREE) : ko(new Error('Sin 3D'))); s.onerror = ko; document.head.appendChild(s); }));

  /* ---------- Cursor: botones magnéticos y halo (la flotación de las tarjetas está en space.js) ---------- */
  if (fino && !reduce) {
    // Botones magnéticos
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
    // Halo dorado que sigue al cursor
    const g = $('#glow');
    addEventListener('pointermove', (e) => { g.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`; g.style.opacity = 1; }, { passive: true });
  }

  /* ---------- Portada: panel 3D que gira con el ratón ---------- */
  const h3d = $('#h3d'), art = $('#heroArt');
  if (fino && !reduce) {
    art.addEventListener('pointermove', (e) => {
      const r = art.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      h3d.style.transform = `rotateX(${10 - y * 16}deg) rotateY(${-16 + x * 26}deg)`;
    });
    art.addEventListener('pointerleave', () => { h3d.style.transform = ''; });
  }

  /* ---------- Motor ---------- */
  const base = A.defaultState();
  const SC = [['base', '--s1', 'Base'], ['pesimista', '--s2', 'Pesimista'], ['optimista', '--s3', 'Optimista'], ['estres', '--s5', 'Estrés']];
  const lineChart = (host, series, opts) => {
    opts = opts || {};
    const W = opts.w || 600, H = opts.h || 220, m = { l: opts.axis ? 58 : 6, r: 8, t: 10, b: opts.axis ? 24 : 6 };
    const all = series.flatMap((s) => s.data).concat([0]); const mx = Math.max(...all), mn = Math.min(...all);
    const X = (i, n) => m.l + (i / (n - 1)) * (W - m.l - m.r), Y = (v) => m.t + (1 - (v - mn) / (mx - mn || 1)) * (H - m.t - m.b);
    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(opts.aria || 'Liquidez por escenario')}">`;
    if (opts.axis) { [mn, (mn + mx) / 2, mx].forEach((v) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" class="lp-grid"/><text x="${m.l - 6}" y="${Y(v) + 3}" text-anchor="end" class="lp-ax">${F.eur(v)}</text>`; }); [0, 12, 24, 36, 48, 59].forEach((i) => { svg += `<text x="${X(i, 60)}" y="${H - 6}" text-anchor="middle" class="lp-ax">${i === 0 ? 'mes 1' : i === 59 ? 'mes 60' : 'mes ' + i}</text>`; }); }
    if (mn < 0) svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" class="lp-zero"/>`;
    series.forEach((s, k) => {
      const pts = s.data.map((v, i) => `${X(i, s.data.length).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      if (k === 0) svg += `<polygon points="${m.l},${Y(Math.max(0, mn))} ${pts} ${W - m.r},${Y(Math.max(0, mn))}" fill="${s.c}" opacity="0.1"/>`;
      svg += `<polyline points="${pts}" fill="none" stroke="${s.c}" stroke-width="${k === 0 ? 2.6 : 1.6}" stroke-linejoin="round" vector-effect="non-scaling-stroke" class="lp-line"/>`;
    });
    if (opts.hover) svg += `<line id="${host.id}X" class="lp-cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/><rect class="lp-hit" x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent"/>`;
    host.innerHTML = svg + '</svg>';
    if (opts.hover) {
      const hit = $('.lp-hit', host), cross = $('#' + host.id + 'X', host);
      hit.addEventListener('pointermove', (ev) => {
        const r = host.getBoundingClientRect(), i = Math.max(0, Math.min(59, Math.round(((ev.clientX - r.left) / r.width * W - m.l) / (W - m.l - m.r) * 59)));
        cross.setAttribute('x1', X(i, 60)); cross.setAttribute('x2', X(i, 60)); cross.setAttribute('visibility', 'visible');
        A.charts.tip(`<h5>Mes ${i + 1}</h5><dl>${series.map((s) => `<dt><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.c}"></i> ${esc(s.n)}</dt><dd style="color:${s.data[i] < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(s.data[i])}</dd>`).join('')}</dl>`, ev.clientX, ev.clientY);
      });
      hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); A.charts.hideTip(); });
    }
  };

  // Portada con números reales del motor
  (function hero() {
    const rs = SC.slice(0, 3).map(([k, c, n]) => ({ r: A.analyze(base, A.scenarioMods(base, k)), c: css(c), n }));
    lineChart($('#hChart'), rs.map((x) => ({ n: x.n, c: x.c, data: x.r.w.liquidez })), { w: 420, h: 150 });
    $('#hLights').innerHTML = rs[0].r.lights.map((l) => `<i class="hd ${l.estado}" title="${esc(l.nombre)}"></i>`).join('');
    const v = rs[0].r.verdict; $('#hVerdict').className = 'verdict-pill v-' + v.key; $('#hVerdict span:last-child').textContent = v.titulo;
  })();
  // Miniaturas de las dos herramientas
  (function minis() {
    const r = A.analyze(base, A.scenarioMods(base, 'base'));
    $('#miniSim').innerHTML = `<div class="lp-mini-row">${r.lights.map((l) => `<span class="lp-chip ${l.estado}">${esc(l.nombre)}</span>`).join('')}</div>`;
    const areas = [['Finanzas', 78, 'ok'], ['Comercial', 61, 'warn'], ['Operaciones', 72, 'ok'], ['Personas', 54, 'warn'], ['Mercado', 46, 'stop']];
    $('#miniStrat').innerHTML = areas.map(([n, v, st]) => `<div class="lp-area"><span>${n}</span><span class="lp-track"><b style="width:${v}%;background:var(--${st === 'ok' ? 'go' : st})"></b></span><b class="num">${v}</b></div>`).join('');
  })();

  /* ---------- Demo interactiva ---------- */
  let escDemo = 'base', raf = 0;
  $('#dScen').innerHTML = SC.map(([k, , n]) => `<button data-s="${k}" aria-pressed="${k === escDemo}">${n}</button>`).join('');
  $$('#dScen button').forEach((b) => b.onclick = () => { escDemo = b.dataset.s; $$('#dScen button').forEach((x) => x.setAttribute('aria-pressed', x === b)); schedule(); });
  const ctrls = ['dInv', 'dFin', 'dVen', 'dDso', 'dPla'];
  const prev = {};
  const animateNum = (el, to, fmt) => {
    const from = prev[el.id] === undefined ? to : prev[el.id]; prev[el.id] = to;
    if (reduce || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 380); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  function demo() {
    const s = A.clone(base);
    s.inversion.importe = +$('#dInv').value; s.inversion.pctFin = +$('#dFin').value; s.inversion.incVentas = +$('#dVen').value;
    s.empresa.dso = +$('#dDso').value; s.inversion.plazo = +$('#dPla').value;
    $('#dInvV').textContent = F.eur(s.inversion.importe); $('#dFinV').textContent = s.inversion.pctFin + ' %'; $('#dVenV').textContent = '+' + s.inversion.incVentas + ' %';
    $('#dDsoV').textContent = s.empresa.dso + ' días'; $('#dPlaV').textContent = s.inversion.plazo + ' años';
    ctrls.forEach((id) => { const r = $('#' + id); r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%'); });
    const runs = SC.map(([k, c, n]) => ({ k, n, c: css(c), r: A.analyze(s, A.scenarioMods(s, k)) }));
    const cur = runs.find((x) => x.k === escDemo), r = cur.r, v = r.verdict;
    $('#dVerdict').innerHTML = `<span class="lp-vlbl">Veredicto · ${esc(cur.n.toLowerCase())}</span><div class="verdict-pill v-${v.key}"><span class="dot"></span>${esc(v.titulo)}</div><p class="small muted">${esc(v.texto)}</p>`;
    $('#dKpis').innerHTML = `<div class="tilt" data-k><span>Liquidez mínima</span><b id="kLiq" style="color:${r.cajaRef < 0 ? 'var(--stop)' : 'inherit'}"></b><small>mes ${r.mesCajaRef}</small></div>
      <div class="tilt" data-k><span>Cuota mensual nueva</span><b id="kCuo"></b><small>tras ${s.inversion.carencia} meses de carencia</small></div>
      <div class="tilt" data-k><span>Recuperación</span><b id="kPay"></b><small>de la inversión</small></div>
      <div class="tilt" data-k><span>Colchón mínimo</span><b id="kCol"></b><small>meses de gastos cubiertos</small></div>`;
    animateNum($('#kLiq'), r.cajaRef, F.eur); animateNum($('#kCuo'), r.cuotaNueva, F.eur);
    $('#kPay').textContent = F.months(r.payback); animateNum($('#kCol'), Math.max(0, r.colMin), (x) => x.toFixed(1).replace('.', ','));
    lineChart($('#dChart'), [cur].concat(runs.filter((x) => x !== cur)).map((x) => ({ n: x.n, c: x.c, data: x.r.w.liquidez })), { w: 720, h: 240, axis: true, hover: true });
    $('#dLegend').innerHTML = runs.map((x) => `<span><i style="background:${x.c}"></i>${x.n}${x.r.cajaRef < 0 ? ' · <b style="color:var(--stop)">falta caja</b>' : ''}</span>`).join('');
    $('#dLights').innerHTML = r.lights.map((l, i) => `<button class="lp-light ${l.estado}" data-i="${i}"><i></i><span>${esc(l.nombre)}</span><b>${esc(l.valor)}</b></button>`).join('');
    $$('#dLights .lp-light').forEach((b) => {
      const l = r.lights[+b.dataset.i];
      const show = () => { $('#dLightRead').innerHTML = `<b>${esc(l.nombre)}: ${esc(l.valor)}.</b> ${esc(l.lectura)} <span class="lp-rng"><i class="ok"></i>${esc(l.rangos.ok)} <i class="warn"></i>${esc(l.rangos.warn)} <i class="stop"></i>${esc(l.rangos.stop)}</span>`; };
      b.addEventListener('pointerenter', show); b.addEventListener('focus', show); b.addEventListener('click', show);
    });
  }
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(demo); };
  ctrls.forEach((id) => $('#' + id).addEventListener('input', schedule));
  demo();

  /* ---------- Explorador del sistema estratégico ---------- */
  const MODS = {
    'Visión': [['Cuadro de mando', 'Salud global de la empresa, riesgos de todas las áreas y mejoras con su impacto anual.', 'Salud 72/100'], ['Plan de empresa', 'Misión, valores con peso, DAFO con tus datos y CAME que lo convierte en acciones.', '9 acciones'], ['Informe de auditoría', 'Diagnóstico 360 y planes de trabajo de macro a micro y de micro a macro.', '9 capítulos']],
    'Finanzas': [['Flujo del dinero', 'Dónde ha ido cada euro del beneficio: clientes, stock, inversión, bancos o socios.', '31 % llega al banco'], ['Impuestos', 'Calendario de pagos, movimientos legales de ahorro y escenarios fiscales de la inversión.', '−48 k€ en 5 años'], ['Tesorería semanal', 'Entradas y salidas a 13, 26 o 52 semanas, con la semana más tensa marcada.', 'Semana 9 en ámbar'], ['Presupuesto', 'Propuestas con cuatro métodos, partidas detalladas y desviaciones en € y %.', 'Ventas al 95 %']],
    'Comercial': [['ABC y concentración', 'Clientes, productos y proveedores por venta y por margen, con el HHI explicado.', 'HHI 1.180'], ['Margen y demanda', 'Precio, volumen, mix y coste: cómo cambia el margen con cada palanca.', '+62 k€ con +3 % precio'], ['Pipeline comercial', 'Oportunidades por etapa y previsión ponderada frente al objetivo.', '41 % del objetivo'], ['Marketing', 'Coste de conseguir un cliente frente a lo que deja en toda la relación.', 'LTV/CAC 4,2×']],
    'Operaciones': [['Compras', 'Matriz de Kraljic, ahorro negociable y proveedores sin alternativa.', '2 sin alternativa'], ['Logística', 'Coste por pedido, OTIF y rendimiento por ruta.', 'OTIF 91 %'], ['Gestor de tiempos', 'Reloj de tareas flotante y tiempo facturable frente al sistema interno.', '64 % facturable'], ['Lean', 'Takt, cuello de botella, OEE, flujo de valor, 5S y kaizen por sector.', 'OEE 68 %'], ['Personas', 'Plantilla, rotación, preparación para crecer y organigrama dibujable.', '3 niveles']],
    'Estrategia': [['Expansión territorial', 'Zonas comparadas por mercado, competencia y recuperación; la mejor va al simulador.', 'Zaragoza primero'], ['Mercado y riesgos', 'Datos macro 2026 de fuentes oficiales, competencia y riesgos por cliente y producto.', 'Euríbor 3,25 %']]
  };
  let grp = 'Finanzas';
  const drawMods = () => {
    $('#grpSeg').innerHTML = Object.keys(MODS).map((g) => `<button role="tab" data-g="${g}" aria-pressed="${g === grp}">${g}</button>`).join('');
    $$('#grpSeg button').forEach((b) => b.onclick = () => { grp = b.dataset.g; drawMods(); });
    $('#mods').innerHTML = MODS[grp].map(([n, d, k]) => `<article class="tilt lp-mod" data-tilt><h3>${n}</h3><p>${d}</p><span class="lp-kpi">${k}</span></article>`).join('');
  };
  drawMods();

  /* ---------- Cifras que cuentan al entrar en pantalla ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const to = +e.target.dataset.count, t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 900); e.target.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    $$('[data-count]').forEach((el) => io.observe(el));
  }

  /* ---------- Planes ---------- */
  const P = A.platform.PLANES;
  // Precio mensual o anual (−30 %); Grupos, por tramos de sociedades
  let periodo = 'mensual';
  const drawPlans = () => {
    // Con la sesión abierta, los botones de los planes llevan a cambiar de plan dentro de la aplicación
    const conSesion = (() => { try { const ss = JSON.parse(localStorage.getItem('atalaya.session')); const us = JSON.parse(localStorage.getItem('atalaya.users') || '[]'); const x = ss && us.find((y) => y.id === ss.id); return x ? x.plan : (A.platform.user && A.platform.user.plan) || null; } catch (e) { return null; } })();
    $('#plans').innerHTML = Object.keys(P).map((k) => {
      const p = P[k], pr = A.platform.precio(k, periodo, 1);
      return `<article class="glass plan tilt ${p.destacado ? 'top' : ''} ${p.grupo ? 'grp' : ''}" data-tilt>
        ${p.destacado ? '<span class="tag">El más elegido</span>' : p.grupo ? '<span class="tag">Holdings y grupos</span>' : ''}
        <h3>${p.nombre}</h3><p class="small muted plan-para">${p.para || ''}</p>
        <div class="price">${p.tramos ? '<small>desde</small>' : ''}<b>${A.platform.eur(A.platform.cuota(pr).importe)}</b><span>${A.platform.cuota(pr).unidad}</span></div>
        <p class="small plan-bill">${periodo === 'anual' ? A.platform.cuota(pr).detalle : '&nbsp;'}</p>
        ${p.tramos ? `<ul class="tramos">${p.tramos.map((t) => `<li><span>${t.n}</span><b>${A.platform.eur(A.platform.cuota(A.platform.precio(k, periodo, t.hasta === Infinity ? 11 : t.hasta)).importe)}${periodo === 'anual' ? '/año' : ''}</b></li>`).join('')}</ul>` : ''}
        <ul>${p.incluye.map((x) => `<li>${x}</li>`).join('')}</ul>
        <a class="btn ${p.destacado ? 'solid' : ''}" href="acceso.html#alta-${k}${periodo === 'anual' ? '-anual' : ''}">${conSesion ? (conSesion === k ? 'Es tu plan · entrar' : `Cambiar a ${p.nombre}`) : `Probar ${p.nombre}`}</a></article>`;
    }).join('');
    $$('#perSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.per === periodo));
  };
  $$('#perSeg button').forEach((b) => b.onclick = () => { periodo = b.dataset.per; drawPlans(); });
  drawPlans();

  // Barra fija en móvil a partir de la portada
  const sticky = $('.lp-sticky');
  addEventListener('scroll', () => sticky.classList.toggle('on', scrollY > innerHeight * 0.8), { passive: true });

  // Si ya hay sesión, «Entrar» lleva directo a la aplicación
  A.platform.me().then((u) => { if (u) $$('a[href="acceso.html"]').forEach((a) => { a.href = 'portal.html'; a.textContent = 'Abrir Atalaya'; }); });
})();
