/* Atalaya · Gráficos SVG (caja por escenario, mapa de riesgos, tornado, radar, deuda) */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const C = (A.charts = {});
  const NS = 'http://www.w3.org/2000/svg';
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  A.SERIES = ['--s1', '--s2', '--s3', '--s4', '--s5'];
  A.seriesColor = (i) => css(A.SERIES[i % 5]);
  /* Un color por escenario, el mismo en la portada, el simulador y el informe. Los colores de estado
     (--go, --warn, --serious, --stop) quedan para lecturas de estado, nunca para escenarios */
  A.SCENARIO_VAR = { base: '--s1', pesimista: '--s4', estres: '--s2', optimista: '--s3', hipotesis: '--s5' };
  A.scenarioColor = (k) => css(A.SCENARIO_VAR[k] || '--s5');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  C.esc = esc;
  const STATE_COLOR = { ok: '--go', warn: '--warn', stop: '--stop' };
  A.stateColor = (s) => css(STATE_COLOR[s] || '--muted');

  /* ---- Tooltip de hover compartido ---- */
  let tipEl;
  C.tip = function (html, x, y) {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'float-card hover'; document.body.appendChild(tipEl); }
    tipEl.innerHTML = html; tipEl.hidden = false;
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let left = x + 16, top = y + 16;
    if (left + w > innerWidth - 8) left = x - w - 16;
    if (top + h > innerHeight - 8) top = y - h - 16;
    tipEl.style.left = Math.max(8, left) + 'px'; tipEl.style.top = Math.max(8, top) + 'px';
  };
  C.hideTip = () => { if (tipEl) tipEl.hidden = true; };
  /* El tooltip de hover no debe quedarse pegado en pantallas táctiles ni al desplazarse */
  addEventListener('scroll', () => C.hideTip(), { passive: true });
  addEventListener('hashchange', () => { C.hideTip(); C.closePop(); });

  /* ---- Ventana explicativa que se abre al pulsar (con X, Escape o clic fuera) ---- */
  let popEl, popAt = 0;
  C.pop = function (html, anchor) {
    if (!popEl) {
      popEl = document.createElement('div'); popEl.className = 'float-card pop-card'; popEl.setAttribute('role', 'dialog');
      document.body.appendChild(popEl);
      document.addEventListener('pointerdown', (e) => { if (!popEl.hidden && Date.now() - popAt > 80 && !popEl.contains(e.target) && !(e.target.closest && e.target.closest('[data-term]'))) C.closePop(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') C.closePop(); });
    }
    popEl.innerHTML = `<button class="icon-btn close" aria-label="Cerrar">×</button>${html}`;
    popEl.querySelector('.close').onclick = C.closePop;
    popEl.hidden = false; popAt = Date.now();
    const r = anchor.getBoundingClientRect(), w = popEl.offsetWidth, h = popEl.offsetHeight;
    let left = Math.min(innerWidth - w - 12, Math.max(12, r.left));
    let top = r.bottom + 8;
    if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 8);
    if (top + h > innerHeight - 12) top = Math.max(12, innerHeight - h - 12);
    popEl.style.left = left + 'px'; popEl.style.top = top + 'px';
    popEl.querySelector('.close').focus({ preventScroll: true });
  };
  C.closePop = () => { if (popEl) popEl.hidden = true; };

  /* ---- Ejes: marcas redondas que incluyen el cero y una por debajo cuando hay negativos ---- */
  const niceTicks = (min, max, n) => {
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (!(max > min)) max = min + (Math.abs(min) || 1);
    n = Math.max(2, n || 5);
    const span = max - min, mag = Math.pow(10, Math.floor(Math.log10(span / n)));
    const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => span / s <= n) || mag * 10;
    const lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step;
    const ticks = [];
    for (let k = 0, v = lo; v <= hi + step * 1e-6 && k < 40; k++, v = lo + k * step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
    return { ticks, lo, hi: hi > lo ? hi : lo + step, step };
  };
  C.niceTicks = niceTicks;
  /* Una sola unidad por eje (€, k€ o M€) y los decimales que pide el paso */
  const nfd = {};
  const nfD = (d) => nfd[d] || (nfd[d] = new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' }));
  const minus = (t) => String(t).replace(/^-/, '−');
  C.axisEur = (ticks, step) => {
    const a = Math.max(0, ...ticks.map((t) => Math.abs(t)));
    const [div, u] = a >= 1e6 ? [1e6, ' M€'] : a >= 1e4 ? [1e3, ' k€'] : [1, ' €'];
    const s = Math.abs(step || 1) / div; let d = 0;
    while (d < 2 && Math.abs(Math.round(s * Math.pow(10, d)) - s * Math.pow(10, d)) > 1e-6) d++;
    return (v) => (Math.abs(v) < 1e-9 ? nfD(d).format(0) : minus(nfD(d).format(v / div))) + u;
  };
  /* Ancho aproximado de un texto (mono a 10,5 px por defecto) para reservar márgenes */
  const tw = (t, px, k) => String(t).length * (px || 10.5) * (k || 0.62);
  C.textWidth = tw;
  const YEARS = [0, 11, 23, 35, 47, 59];
  const yearLbl = (i) => (i === 0 ? 'mes 1' : 'año ' + Math.round((i + 1) / 12));

  /* ---- Ancho del viewBox según el contenedor: en móvil el texto conserva su tamaño.
     Un único observador para todos los gráficos; cada gráfico se vuelve a dibujar al cambiar de ancho ---- */
  const fits = new Map();
  let fitT = 0;
  C.width = (el, max, min) => { const w = el ? el.clientWidth : 0; return w > 0 ? Math.round(Math.max(min || 360, Math.min(max, w))) : max; };
  const fitCheck = () => {
    clearTimeout(fitT);
    fitT = setTimeout(() => fits.forEach((f, el) => {
      if (!el.isConnected) { fits.delete(el); if (ro) ro.unobserve(el); return; }
      const w = C.width(f.of ? f.of() : el, f.max, f.min);
      if (Math.abs(w - f.W) > 16) { try { f.fn(); } catch (e) { /* el gráfico se redibuja en el siguiente render */ } }
    }), 160);
  };
  const ro = window.ResizeObserver ? new ResizeObserver(fitCheck) : null;
  if (!ro) addEventListener('resize', fitCheck);
  C.fit = (el, max, fn, o) => {
    o = o || {};
    const W = C.width(o.of ? o.of() : el, max, o.min);
    if (ro && !fits.has(el)) ro.observe(el);
    fits.set(el, { fn, W, max, min: o.min, of: o.of });
    return W;
  };

  /* ---- Caja por escenario (opts.mode: 'liquidez' por defecto o 'neta') ---- */
  C.cash = function (el, legendEl, series, opts) {
    opts = opts || {};
    const W = C.fit(el, 900, () => C.cash(el, legendEl, series, opts)), narrow = W < 600, Hh = narrow ? 300 : 330;
    const neta = opts.mode === 'neta', target = neta ? 0 : opts.target || 0;
    const visible = series.filter((s) => !s.hidden);
    let mn = Math.min(0, target), mx = Math.max(0, target);
    visible.forEach((s) => s.data.forEach((v) => { if (isFinite(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v); } }));
    const { ticks, lo, hi, step } = niceTicks(mn, mx, narrow ? 4 : 5);
    const fy = C.axisEur(ticks, step);
    const nameW = Math.max(0, ...visible.map((s) => tw(s.name)));
    const m = { l: Math.max(40, ...ticks.map((t) => tw(fy(t)) + 14)), r: Math.max(30, Math.min(narrow ? 78 : 100, nameW + 16)), t: 14, b: 30 };
    const n = series[0].data.length;
    const x = (i) => m.l + (i / (n - 1)) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (Hh - m.t - m.b);
    const minOf = (s) => { let im = 0; s.data.forEach((v, i) => { if (v < s.data[im]) im = i; }); return im; };
    const qual = neta ? 'Caja neta' : 'Liquidez';
    const resumen = `${qual} mensual a ${n} meses por escenario. ` + visible.map((s) => { const im = minOf(s); return `${s.name}${s.active ? ' (activo)' : ''}: mínimo ${A.fmt.eur(s.data[im])} en el mes ${im + 1}`; }).join('; ') + '.';
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" tabindex="0" aria-label="${esc(resumen)}"><title>${esc(resumen)}</title><g class="grid">`;
    ticks.forEach((t) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 8}" y="${y(t) + 3}" text-anchor="end">${fy(t)}</text>`; });
    YEARS.filter((i) => i < n).forEach((i) => { svg += `<text x="${x(i)}" y="${Hh - 8}" text-anchor="middle">${yearLbl(i)}</text>`; });
    svg += `</g>`;
    if (opts.start) svg += `<line x1="${x(opts.start - 1)}" x2="${x(opts.start - 1)}" y1="${m.t}" y2="${Hh - m.b}" style="stroke:var(--line-strong)" stroke-dasharray="2 4"/><text x="${x(opts.start - 1) + 6}" y="${m.t + 10}">inversión</text>`;
    svg += `<line class="zero" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;
    if (!neta && opts.target) svg += `<line class="target" x1="${m.l}" x2="${W - m.r}" y1="${y(opts.target)}" y2="${y(opts.target)}"/>`;
    // área sutil bajo el escenario activo
    visible.forEach((s) => {
      const pts = s.data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      if (s.active) svg += `<polygon points="${x(0)},${y(Math.max(lo, 0))} ${pts} ${x(n - 1)},${y(Math.max(lo, 0))}" fill="${s.color}" opacity="0.08"/>`;
      svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="${s.active ? 2.6 : 1.6}" stroke-linejoin="round" opacity="${s.active ? 1 : 0.75}"/>`;
    });
    // Punto más bajo del escenario activo, marcado y rotulado dentro del área del gráfico
    const act = visible.find((sr) => sr.active);
    if (act) {
      const im = minOf(act), v = act.data[im], vx = x(im), vy = y(v), izq = vx > m.l + (W - m.l - m.r) * 0.55;
      const ty = vy + 18 > Hh - m.b - 4 || im > n * 0.85 ? vy - 12 : vy + 18;
      svg += `<circle cx="${vx}" cy="${vy}" r="6" fill="none" style="stroke:var(${v < 0 ? '--stop' : '--gold'})" stroke-width="2.5"/><text x="${vx + (izq ? -10 : 10)}" y="${ty}" text-anchor="${izq ? 'end' : 'start'}" style="fill:var(--fg);font-weight:600">${neta ? 'caja neta mínima' : 'mínimo'}: ${A.fmt.eur(v)} · mes ${im + 1}</text>`;
    }
    // etiquetas directas al final: separación mínima y siempre dentro del área del gráfico
    const top = m.t + 4, bot = Hh - m.b - 2;
    const ends = visible.map((s) => ({ s, yy: Math.max(top, Math.min(bot, y(s.data[n - 1]))) })).sort((a, b) => a.yy - b.yy);
    for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 13) ends[i].yy = ends[i - 1].yy + 13;
    for (let i = ends.length - 1; i >= 0; i--) { const lim = i === ends.length - 1 ? bot : ends[i + 1].yy - 13; if (ends[i].yy > lim) ends[i].yy = lim; }
    ends.forEach((e) => { svg += `<circle cx="${x(n - 1)}" cy="${y(e.s.data[n - 1])}" r="3.5" fill="${e.s.color}" style="stroke:var(--deep)" stroke-width="2"/><text x="${x(n - 1) + 8}" y="${e.yy + 3}" style="fill:var(--fg)">${esc(e.s.name)}</text>`; });
    svg += `<line class="tip-line" x1="0" x2="0" y1="${m.t}" y2="${Hh - m.b}" visibility="hidden"/>`;
    svg += `<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${Hh - m.t - m.b}" fill="transparent" class="hit"/></svg>`;
    el.innerHTML = svg;
    const s = el.querySelector('svg'), hit = el.querySelector('.hit'), cross = el.querySelector('.tip-line');
    const show = (i, cx, cy) => {
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
      const rows = visible.map((sr) => ({ sr, v: sr.data[i] })).sort((a, b) => b.v - a.v)
        .map((o) => `<dt><span class="sw" style="background:${o.sr.color}"></span>${esc(o.sr.name)}</dt><dd style="color:${o.v < 0 ? 'var(--stop)' : 'inherit'}">${A.fmt.eur(o.v)}</dd>`).join('');
      C.tip(`<h5>Mes ${i + 1} · ${qual.toLowerCase()}</h5><dl>${rows}</dl>`, cx, cy);
    };
    const hide = () => { cross.setAttribute('visibility', 'hidden'); C.hideTip(); };
    hit.addEventListener('pointermove', (ev) => {
      const r = s.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      show(Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1)))), ev.clientX, ev.clientY);
    });
    hit.addEventListener('pointerleave', hide);
    // Teclado: flechas para recorrer los meses con el foco en el gráfico
    let ki = act ? minOf(act) : 0;
    const kshow = () => { const r = s.getBoundingClientRect(); show(ki, r.left + (x(ki) / W) * r.width, r.top + r.height * 0.3); };
    s.addEventListener('focus', kshow); s.addEventListener('blur', hide);
    s.addEventListener('keydown', (ev) => {
      const d = { ArrowRight: 1, ArrowLeft: -1, PageUp: 12, PageDown: -12 }[ev.key];
      if (d) ki = Math.max(0, Math.min(n - 1, ki + d)); else if (ev.key === 'Home') ki = 0; else if (ev.key === 'End') ki = n - 1; else return;
      ev.preventDefault(); kshow();
    });
    if (legendEl) {
      legendEl.innerHTML = series.map((sr, i) => `<button aria-pressed="${!sr.hidden}" data-i="${i}"><i style="background:${sr.color}"></i>${esc(sr.name)}</button>`).join('') +
        `<span class="small"><svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" style="stroke:var(--stop)" stroke-width="2" stroke-dasharray="3 4"/></svg> ${neta ? 'línea roja de puntos: 0 €. Por debajo, la empresa vive de la póliza' : 'línea roja de puntos: 0 €. Por debajo falta dinero, aun usando la póliza'}</span>` +
        (!neta && opts.target ? `<span class="small"><svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" style="stroke:var(--gold)" stroke-width="2" stroke-dasharray="6 4"/></svg> línea dorada discontinua: la liquidez mínima que exiges (${A.fmt.eur(opts.target)}), tu meta</span>` : '') +
        `<span class="small"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" style="stroke:var(--gold)" stroke-width="2"/></svg> círculo: el mes más tenso del escenario activo${neta ? ' en caja neta' : ''}</span>`;
      legendEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { opts.onToggle && opts.onToggle(+b.dataset.i); }));
    }
  };

  /* ---- Mapa de riesgos ---- */
  C.riskMatrix = function (el, risks, onClick) {
    const W = C.fit(el, 440, () => C.riskMatrix(el, risks, onClick)), Hh = 360, m = { l: 46, r: 12, t: 10, b: 40 };
    const cw = (W - m.l - m.r) / 5, ch = (Hh - m.t - m.b) / 5, dx = Math.min(22, cw * 0.34);
    const lv = (v) => Math.max(1, Math.min(5, Math.round(+v) || 1));
    const rojos = risks.filter((r) => lv(r.prob) * lv(r.impacto) >= 15).length;
    const resumen = `Mapa de riesgos: ${risks.length} riesgo${risks.length === 1 ? '' : 's'} por probabilidad e impacto, ${rojos} en la zona roja.`;
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(resumen)}"><title>${esc(resumen)}</title>`;
    for (let p = 1; p <= 5; p++) for (let i = 1; i <= 5; i++) {
      const lvl = p * i;
      const col = lvl >= 15 ? '--stop' : lvl >= 8 ? '--warn' : '--go';
      svg += `<rect x="${m.l + (i - 1) * cw + 1}" y="${m.t + (5 - p) * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" style="fill:var(${col})" opacity="${0.05 + lvl / 25 * 0.16}"/>`;
    }
    for (let k = 1; k <= 5; k++) {
      svg += `<text x="${m.l + (k - 0.5) * cw}" y="${Hh - m.b + 16}" text-anchor="middle">${k}</text>`;
      svg += `<text x="${m.l - 10}" y="${m.t + (5 - k + 0.5) * ch + 3}" text-anchor="end">${k}</text>`;
    }
    svg += `<text x="${m.l + (W - m.l - m.r) / 2}" y="${Hh - 4}" text-anchor="middle">impacto en caja →</text>`;
    svg += `<text transform="translate(16 ${m.t + (Hh - m.t - m.b) / 2}) rotate(-90)" text-anchor="middle">probabilidad →</text>`;
    // Agrupa por celda: hasta 6 círculos; si hay más, 5 y una cifra con los restantes
    const cells = {};
    risks.forEach((r, idx) => { const k = lv(r.prob) + '-' + lv(r.impacto); (cells[k] = cells[k] || []).push(idx); });
    Object.keys(cells).forEach((k) => {
      const [p, im] = k.split('-').map(Number), list = cells[k], shown = list.length > 6 ? list.slice(0, 5) : list;
      const pos = (j) => [m.l + (im - 0.5) * cw + ((j % 3) - 1) * dx, m.t + (5 - p + 0.5) * ch + (Math.floor(j / 3) - 0.3) * 22];
      shown.forEach((idx, j) => {
        const r = risks[idx], [cx, cy] = pos(j);
        svg += `<g class="rk" data-i="${idx}" tabindex="0" role="button" aria-label="${esc(`${idx + 1}. ${r.nombre}`)}" style="cursor:pointer"><title>${esc(`${idx + 1}. ${r.nombre}`)}</title><circle cx="${cx}" cy="${cy}" r="11" style="fill:var(${STATE_COLOR[r.estado] || '--muted'});stroke:var(--deep)" stroke-width="2"/><text x="${cx}" y="${cy + 3.5}" text-anchor="middle" style="fill:#05060a;font-weight:600">${idx + 1}</text></g>`;
      });
      if (list.length > 6) {
        const resto = list.slice(5), [cx, cy] = pos(5), nombres = resto.map((i) => `${i + 1}. ${risks[i].nombre}`).join(' · ');
        svg += `<g class="rk-more" aria-label="${esc('Y ' + resto.length + ' más: ' + nombres)}"><title>${esc(nombres)}</title><circle cx="${cx}" cy="${cy}" r="11" style="fill:var(--raise);stroke:var(--line-strong)" stroke-width="1.5"/><text x="${cx}" y="${cy + 3.5}" text-anchor="middle" style="fill:var(--fg);font-weight:600">+${resto.length}</text></g>`;
      }
    });
    el.innerHTML = svg + '</svg>';
    el.querySelectorAll('.rk').forEach((g) => {
      const r = risks[+g.dataset.i];
      const html = () => `<h5>${+g.dataset.i + 1}. ${esc(r.nombre)}</h5><dl><dt>Probabilidad</dt><dd>${lv(r.prob)}/5</dd><dt>Impacto</dt><dd>${lv(r.impacto)}/5</dd></dl><p>${esc(r.mitigacion)}</p>`;
      g.addEventListener('pointermove', (ev) => C.tip(html(), ev.clientX, ev.clientY));
      g.addEventListener('pointerleave', C.hideTip);
      g.addEventListener('focus', () => { const b = g.getBoundingClientRect(); C.tip(html(), b.right, b.top); });
      g.addEventListener('blur', C.hideTip);
      g.addEventListener('click', (ev) => onClick && onClick(r, ev));
      g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); C.hideTip(); onClick && onClick(r, { target: g, clientX: 0, clientY: 0 }); } });
    });
  };

  /* ---- Tornado ---- */
  C.tornado = function (el, sens) {
    const W = C.fit(el, 460, () => C.tornado(el, sens)), rowH = 40, narrow = W < 420;
    const fs = 11.5, nmax = Math.max(0, ...sens.rows.map((r) => tw(r.nombre, fs, 0.55)));
    const m = { l: Math.round(Math.min(W * 0.42, Math.max(80, nmax + 18))), r: 20, t: 22, b: 24 };
    const maxCh = Math.floor((m.l - 18) / (fs * 0.55));
    const Hh = m.t + m.b + sens.rows.length * rowH;
    let mn = sens.base, mx = sens.base;
    sens.rows.forEach((r) => { mn = Math.min(mn, r.lo, r.hi); mx = Math.max(mx, r.lo, r.hi); });
    const pad = (mx - mn) * 0.08 || 1000;
    const { ticks, lo, hi, step } = niceTicks(mn - pad, mx + pad, narrow ? 3 : 4);
    const fx = C.axisEur(ticks, step);
    const x = (v) => m.l + ((v - lo) / (hi - lo)) * (W - m.l - m.r);
    const top = sens.rows.slice().sort((a, b) => Math.abs(b.hi - b.lo) - Math.abs(a.hi - a.lo))[0];
    const resumen = `Sensibilidad de la liquidez mínima, hoy ${A.fmt.eur(sens.base)}.` + (top ? ` La variable que más la mueve es ${top.nombre}: de ${A.fmt.eur(Math.min(top.lo, top.hi))} a ${A.fmt.eur(Math.max(top.lo, top.hi))}.` : '');
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(resumen)}"><title>${esc(resumen)}</title><g class="grid">`;
    ticks.forEach((t) => { svg += `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t - 6}" y2="${Hh - m.b}"/><text x="${x(t)}" y="${Hh - 8}" text-anchor="middle">${fx(t)}</text>`; });
    svg += `</g>`;
    sens.rows.forEach((r, i) => {
      const yy = m.t + i * rowH + 8, h = rowH - 16;
      const worse = Math.min(r.lo, r.hi), better = Math.max(r.lo, r.hi);
      const nom = r.nombre.length > maxCh ? r.nombre.slice(0, Math.max(1, maxCh - 1)) + '…' : r.nombre;
      svg += `<text x="${m.l - 10}" y="${yy + h / 2 + 4}" text-anchor="end" style="fill:var(--fg);font-family:var(--font-body);font-size:${fs}px">${nom !== r.nombre ? `<title>${esc(r.nombre)}</title>` : ''}${esc(nom)}</text>`;
      if (worse < sens.base) svg += `<rect class="tb" data-i="${i}" x="${x(worse)}" y="${yy}" width="${Math.max(1, x(sens.base) - x(worse))}" height="${h}" rx="3" style="fill:var(--serious)"/>`;
      if (better > sens.base) svg += `<rect class="tb" data-i="${i}" x="${x(sens.base) + 1}" y="${yy}" width="${Math.max(1, x(better) - x(sens.base) - 1)}" height="${h}" rx="3" style="fill:var(--go)"/>`;
    });
    const bx = x(sens.base), lbl = 'actual ' + A.fmt.eur(sens.base), lw = tw(lbl) / 2;
    svg += `<line x1="${bx}" x2="${bx}" y1="${m.t - 10}" y2="${Hh - m.b}" style="stroke:var(--gold)" stroke-width="1.5"/><text x="${Math.max(m.l + lw, Math.min(W - m.r - lw, bx))}" y="${m.t - 10}" text-anchor="middle" style="fill:var(--gold-soft)">${lbl}</text>`;
    el.innerHTML = svg + '</svg>' + `<div class="chart-legend small" style="margin-top:6px"><span><i style="background:var(--serious)"></i> empeora</span><span><i style="background:var(--go)"></i> mejora</span></div>`;
    el.querySelectorAll('.tb').forEach((b) => {
      const r = sens.rows[+b.dataset.i];
      b.addEventListener('pointermove', (ev) => C.tip(`<h5>${esc(r.nombre)}</h5><dl><dt>Caso adverso</dt><dd>${A.fmt.eur(Math.min(r.lo, r.hi))}</dd><dt>Caso favorable</dt><dd>${A.fmt.eur(Math.max(r.lo, r.hi))}</dd><dt>Rango</dt><dd>${A.fmt.eur(Math.abs(r.hi - r.lo))}</dd></dl>`, ev.clientX, ev.clientY));
      b.addEventListener('pointerleave', C.hideTip);
    });
  };

  /* ---- Radar del sistema humano ---- */
  C.radar = function (el, dims) {
    const S = 340, c = S / 2, R = 96, n = dims.length;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v]; };
    const resumen = 'Radar de preparación del equipo: ' + dims.map((d) => `${d.corto} ${Math.round(d.score)}/100`).join(', ') + '. Referencia: 70.';
    // viewBox más ancho que el radar para que las etiquetas laterales no se corten
    let svg = `<svg viewBox="-70 0 480 340" role="img" aria-label="${esc(resumen)}"><title>${esc(resumen)}</title>`;
    [0.25, 0.5, 0.75, 1].forEach((k) => { svg += `<polygon points="${dims.map((_, i) => pt(i, k).join(',')).join(' ')}" fill="none" style="stroke:var(--line)"/>`; });
    dims.forEach((d, i) => { const [x2, y2] = pt(i, 1); svg += `<line x1="${c}" y1="${c}" x2="${x2}" y2="${y2}" style="stroke:var(--line)"/>`; });
    svg += `<polygon points="${dims.map((_, i) => pt(i, 0.7).join(',')).join(' ')}" fill="none" style="stroke:var(--go)" stroke-dasharray="3 4" opacity="0.7"/>`;
    svg += `<polygon points="${dims.map((d, i) => pt(i, d.score / 100).join(',')).join(' ')}" style="fill:var(--gold);stroke:var(--gold)" fill-opacity="0.18" stroke-width="2"/>`;
    dims.forEach((d, i) => {
      const [px, py] = pt(i, d.score / 100);
      const st = d.score >= 70 ? 'ok' : d.score >= 50 ? 'warn' : 'stop';
      svg += `<circle cx="${px}" cy="${py}" r="4.5" style="fill:var(${STATE_COLOR[st]});stroke:var(--deep)" stroke-width="2"/>`;
      const [lx, ly] = pt(i, 1.2);
      const anchor = Math.abs(lx - c) < 10 ? 'middle' : lx > c ? 'start' : 'end';
      svg += `<text x="${lx}" y="${ly + 4}" text-anchor="${anchor}" style="font-family:var(--font-body);font-size:13.5px;fill:var(--fg)">${esc(d.corto)}</text>`;
    });
    el.innerHTML = svg + '</svg>';
  };

  /* ---- EBITDA mensual frente a servicio de deuda ---- */
  C.debt = function (el, res) {
    const W = C.fit(el, 900, () => C.debt(el, res)), narrow = W < 600, Hh = 220;
    const eb = res.w.ebitda, debt = res.w.debt, n = eb.length;
    let mn = 0, mx = 0;
    eb.forEach((v, i) => { mn = Math.min(mn, v); mx = Math.max(mx, v, debt[i]); });
    const { ticks, lo, hi, step } = niceTicks(mn, mx, narrow ? 3 : 4);
    const fy = C.axisEur(ticks, step);
    const m = { l: Math.max(40, ...ticks.map((t) => tw(fy(t)) + 14)), r: 20, t: 12, b: 28 };
    const bw = (W - m.l - m.r) / n;
    const x = (i) => m.l + i * bw;
    const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (Hh - m.t - m.b);
    const bajo = eb.map((v, i) => v < debt[i]).reduce((a, b, i) => (b ? a.concat(i + 1) : a), []);
    const resumen = `EBITDA mensual frente al servicio de la deuda a ${n} meses. ` + (bajo.length ? `En ${bajo.length} meses el EBITDA no cubre la cuota; el primero es el mes ${bajo[0]}.` : 'El EBITDA cubre la cuota todos los meses.');
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(resumen)}"><title>${esc(resumen)}</title><g class="grid">`;
    ticks.forEach((t) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 8}" y="${y(t) + 3}" text-anchor="end">${fy(t)}</text>`; });
    YEARS.filter((i) => i < n).forEach((i) => { svg += `<text x="${x(i) + bw / 2}" y="${Hh - 8}" text-anchor="middle">${yearLbl(i)}</text>`; });
    svg += '</g>';
    eb.forEach((v, i) => {
      const top = y(Math.max(0, v)), bot = y(Math.min(0, v));
      svg += `<rect class="db" data-i="${i}" x="${x(i) + 1}" y="${top}" width="${Math.max(1, bw - 2)}" height="${Math.max(1, bot - top)}" rx="1.5" style="fill:var(${v >= debt[i] ? '--go' : '--serious'})" opacity="0.85"/>`;
    });
    svg += `<polyline points="${debt.map((v, i) => `${x(i) + bw / 2},${y(v)}`).join(' ')}" fill="none" style="stroke:var(--gold)" stroke-width="2"/>`;
    svg += `<rect class="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${Hh - m.t - m.b}" fill="transparent"/>`;
    el.innerHTML = svg + '</svg>' + `<div class="chart-legend small" style="margin-top:8px"><span><i style="background:var(--go)"></i> EBITDA del mes que cubre la cuota</span><span><i style="background:var(--serious)"></i> EBITDA por debajo de la cuota</span><span><i style="background:var(--gold)"></i> servicio total de deuda</span></div>`;
    const s = el.querySelector('svg');
    el.querySelector('.hit').addEventListener('pointermove', (ev) => {
      const r = s.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.floor((((ev.clientX - r.left) / r.width) * W - m.l) / bw)));
      C.tip(`<h5>Mes ${i + 1}</h5><dl><dt>EBITDA</dt><dd>${A.fmt.eur(eb[i])}</dd><dt>Servicio de deuda</dt><dd>${A.fmt.eur(debt[i])}</dd><dt>Personas en plantilla</dt><dd>${A.fmt.num(res.w.heads[i])}</dd><dt>Caja</dt><dd>${A.fmt.eur(res.w.cash[i])}</dd></dl>`, ev.clientX, ev.clientY);
    });
    el.querySelector('.hit').addEventListener('pointerleave', C.hideTip);
  };

  /* ---- Mini línea ---- */
  C.spark = function (data, color, zero) {
    const W = 160, Hh = 30;
    let mn = Math.min(...data), mx = Math.max(...data);
    if (zero) { mn = Math.min(mn, 0); }
    const x = (i) => (i / (data.length - 1)) * W, y = (v) => 2 + (1 - (v - mn) / (mx - mn || 1)) * (Hh - 4);
    const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    let s = `<svg class="spark" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" aria-hidden="true">`;
    if (zero && mn < 0) s += `<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" style="stroke:var(--stop)" stroke-dasharray="2 3" opacity="0.7"/>`;
    s += `<polygon points="0,${Hh} ${pts} ${W},${Hh}" fill="${color}" opacity="0.12"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
    return s + '</svg>';
  };

  /* ---- Anillo de dimensión ---- */
  C.ring = function (value, max, color, label) {
    const r = 38, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, value / max));
    return `<svg viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="${r}" fill="none" style="stroke:var(--line)" stroke-width="6" opacity="0.6"/>` +
      `<circle cx="46" cy="46" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 46 46)"/>` +
      `<text x="46" y="51" text-anchor="middle" style="font-family:var(--font-data);font-size:15px;fill:var(--fg)">${label}</text></svg>`;
  };
})();
