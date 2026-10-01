/* Atalaya · Gráficos SVG (caja por escenario, mapa de riesgos, tornado, radar, deuda) */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const C = (A.charts = {});
  const NS = 'http://www.w3.org/2000/svg';
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  A.SERIES = ['--s1', '--s2', '--s3', '--s4', '--s5'];
  A.seriesColor = (i) => css(A.SERIES[i % 5]);
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

  const niceTicks = (min, max, n) => {
    const span = max - min || 1;
    const step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || mag * 10;
    const t = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) t.push(v);
    return { ticks: t, lo: Math.min(min, t[0]), hi: Math.max(max, t[t.length - 1]) };
  };

  /* ---- Caja por escenario ---- */
  C.cash = function (el, legendEl, series, opts) {
    opts = opts || {};
    const W = 900, Hh = 330, m = { l: 62, r: 86, t: 14, b: 30 };
    const visible = series.filter((s) => !s.hidden);
    let mn = Math.min(0, opts.target || 0), mx = 0;
    visible.forEach((s) => s.data.forEach((v) => { mn = Math.min(mn, v); mx = Math.max(mx, v); }));
    const { ticks, lo, hi } = niceTicks(mn, mx, 5);
    const n = series[0].data.length;
    const x = (i) => m.l + (i / (n - 1)) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (Hh - m.t - m.b);
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Caja mensual por escenario"><g class="grid">`;
    ticks.forEach((t) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 8}" y="${y(t) + 3}" text-anchor="end">${A.fmt.eur(t)}</text>`; });
    for (let yr = 0; yr <= 5; yr++) { const i = Math.min(n - 1, yr * 12); svg += `<text x="${x(i)}" y="${Hh - 8}" text-anchor="middle">${yr === 0 ? 'mes 1' : 'año ' + yr}</text>`; }
    svg += `</g>`;
    if (opts.start) svg += `<line x1="${x(opts.start - 1)}" x2="${x(opts.start - 1)}" y1="${m.t}" y2="${Hh - m.b}" stroke="${css('--line-strong')}" stroke-dasharray="2 4"/><text x="${x(opts.start - 1) + 6}" y="${m.t + 10}">inversión</text>`;
    svg += `<line class="zero" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;
    if (opts.target) svg += `<line class="target" x1="${m.l}" x2="${W - m.r}" y1="${y(opts.target)}" y2="${y(opts.target)}"/>`;
    // área sutil bajo el escenario activo
    visible.forEach((s) => {
      const pts = s.data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      if (s.active) {
        svg += `<polygon points="${x(0)},${y(Math.max(lo, 0))} ${pts} ${x(n - 1)},${y(Math.max(lo, 0))}" fill="${s.color}" opacity="0.08"/>`;
      }
      svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="${s.active ? 2.6 : 1.6}" stroke-linejoin="round" opacity="${s.active ? 1 : 0.75}"/>`;
    });
    // etiquetas directas al final (con separación mínima)
    const ends = visible.map((s) => ({ s, yy: y(s.data[n - 1]) })).sort((a, b) => a.yy - b.yy);
    for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 13) ends[i].yy = ends[i - 1].yy + 13;
    ends.forEach((e) => { svg += `<circle cx="${x(n - 1)}" cy="${y(e.s.data[n - 1])}" r="3.5" fill="${e.s.color}" stroke="${css('--deep')}" stroke-width="2"/><text x="${x(n - 1) + 8}" y="${e.yy + 3}" style="fill:${css('--fg')}">${e.s.name}</text>`; });
    svg += `<line class="tip-line" id="cashCross" x1="0" x2="0" y1="${m.t}" y2="${Hh - m.b}" visibility="hidden"/>`;
    svg += `<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${Hh - m.t - m.b}" fill="transparent" class="hit"/></svg>`;
    el.innerHTML = svg;
    const s = el.querySelector('svg'), hit = el.querySelector('.hit'), cross = el.querySelector('#cashCross');
    hit.addEventListener('pointermove', (ev) => {
      const r = s.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1))));
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
      const rows = visible.map((sr) => ({ sr, v: sr.data[i] })).sort((a, b) => b.v - a.v)
        .map((o) => `<dt><span class="sw" style="background:${o.sr.color}"></span>${o.sr.name}</dt><dd style="color:${o.v < 0 ? css('--stop') : 'inherit'}">${A.fmt.eur(o.v)}</dd>`).join('');
      C.tip(`<h5>Mes ${i + 1}</h5><dl>${rows}</dl>`, ev.clientX, ev.clientY);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); C.hideTip(); });
    if (legendEl) {
      legendEl.innerHTML = series.map((sr, i) => `<button aria-pressed="${!sr.hidden}" data-i="${i}"><i style="background:${sr.color}"></i>${sr.name}</button>`).join('') +
        `<span class="small"><i style="background:${css('--stop')};width:14px;height:2px;display:inline-block;vertical-align:middle"></i> suelo 0 €</span>` +
        (opts.target ? `<span class="small"><i style="background:${css('--gold')};width:14px;height:2px;display:inline-block;vertical-align:middle"></i> caja mínima objetivo</span>` : '');
      legendEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { opts.onToggle && opts.onToggle(+b.dataset.i); }));
    }
  };

  /* ---- Mapa de riesgos ---- */
  C.riskMatrix = function (el, risks, onClick) {
    const W = 440, Hh = 360, m = { l: 46, r: 12, t: 10, b: 40 };
    const cw = (W - m.l - m.r) / 5, ch = (Hh - m.t - m.b) / 5;
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Matriz de riesgos">`;
    for (let p = 1; p <= 5; p++) for (let i = 1; i <= 5; i++) {
      const lvl = p * i;
      const col = lvl >= 15 ? css('--stop') : lvl >= 8 ? css('--warn') : css('--go');
      svg += `<rect x="${m.l + (i - 1) * cw + 1}" y="${m.t + (5 - p) * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" fill="${col}" opacity="${0.05 + lvl / 25 * 0.16}"/>`;
    }
    for (let k = 1; k <= 5; k++) {
      svg += `<text x="${m.l + (k - 0.5) * cw}" y="${Hh - m.b + 16}" text-anchor="middle">${k}</text>`;
      svg += `<text x="${m.l - 10}" y="${m.t + (5 - k + 0.5) * ch + 3}" text-anchor="end">${k}</text>`;
    }
    svg += `<text x="${m.l + (W - m.l - m.r) / 2}" y="${Hh - 4}" text-anchor="middle">impacto en caja →</text>`;
    svg += `<text transform="translate(12 ${m.t + (Hh - m.t - m.b) / 2}) rotate(-90)" text-anchor="middle">probabilidad →</text>`;
    const cell = {};
    risks.forEach((r, idx) => {
      const k = r.prob + '-' + r.impacto; const j = cell[k] = (cell[k] || 0) + 1;
      const cx = m.l + (r.impacto - 0.5) * cw + ((j - 1) % 3 - 1) * 22;
      const cy = m.t + (5 - r.prob + 0.5) * ch + (Math.floor((j - 1) / 3) - 0.3) * 22;
      svg += `<g class="rk" data-i="${idx}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="11" fill="${A.stateColor(r.estado)}" stroke="${css('--deep')}" stroke-width="2"/><text x="${cx}" y="${cy + 3.5}" text-anchor="middle" style="fill:${css('--abyss')};font-weight:600">${idx + 1}</text></g>`;
    });
    el.innerHTML = svg + '</svg>';
    el.querySelectorAll('.rk').forEach((g) => {
      const r = risks[+g.dataset.i];
      g.addEventListener('pointermove', (ev) => C.tip(`<h5>${+g.dataset.i + 1}. ${r.nombre}</h5><dl><dt>Probabilidad</dt><dd>${r.prob}/5</dd><dt>Impacto</dt><dd>${r.impacto}/5</dd></dl><p>${r.mitigacion}</p>`, ev.clientX, ev.clientY));
      g.addEventListener('pointerleave', C.hideTip);
      g.addEventListener('click', (ev) => onClick && onClick(r, ev));
    });
  };

  /* ---- Tornado ---- */
  C.tornado = function (el, sens) {
    const W = 460, rowH = 40, m = { l: 140, r: 20, t: 22, b: 24 };
    const Hh = m.t + m.b + sens.rows.length * rowH;
    let mn = sens.base, mx = sens.base;
    sens.rows.forEach((r) => { mn = Math.min(mn, r.lo, r.hi); mx = Math.max(mx, r.lo, r.hi); });
    const pad = (mx - mn) * 0.08 || 1000;
    const { ticks, lo, hi } = niceTicks(mn - pad, mx + pad, 4);
    const x = (v) => m.l + ((v - lo) / (hi - lo)) * (W - m.l - m.r);
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Sensibilidad de la caja mínima"><g class="grid">`;
    ticks.forEach((t) => { svg += `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t - 6}" y2="${Hh - m.b}"/><text x="${x(t)}" y="${Hh - 8}" text-anchor="middle">${A.fmt.eur(t)}</text>`; });
    svg += `</g>`;
    sens.rows.forEach((r, i) => {
      const yy = m.t + i * rowH + 8, h = rowH - 16;
      const worse = Math.min(r.lo, r.hi), better = Math.max(r.lo, r.hi);
      svg += `<text x="${m.l - 10}" y="${yy + h / 2 + 4}" text-anchor="end" style="fill:${css('--fg')};font-family:var(--font-body);font-size:11.5px">${r.nombre}</text>`;
      if (worse < sens.base) svg += `<rect class="tb" data-i="${i}" x="${x(worse)}" y="${yy}" width="${Math.max(1, x(sens.base) - x(worse))}" height="${h}" rx="3" fill="${css('--s2')}"/>`;
      if (better > sens.base) svg += `<rect class="tb" data-i="${i}" x="${x(sens.base) + 1}" y="${yy}" width="${Math.max(1, x(better) - x(sens.base) - 1)}" height="${h}" rx="3" fill="${css('--s1')}"/>`;
    });
    svg += `<line x1="${x(sens.base)}" x2="${x(sens.base)}" y1="${m.t - 10}" y2="${Hh - m.b}" stroke="${css('--gold')}" stroke-width="1.5"/><text x="${x(sens.base)}" y="${m.t - 10}" text-anchor="middle" style="fill:${css('--gold-soft')}">actual ${A.fmt.eur(sens.base)}</text>`;
    el.innerHTML = svg + '</svg>' + `<div class="chart-legend small" style="margin-top:6px"><span><i style="background:${css('--s2')}"></i> empeora</span><span><i style="background:${css('--s1')}"></i> mejora</span></div>`;
    el.querySelectorAll('.tb').forEach((b) => {
      const r = sens.rows[+b.dataset.i];
      b.addEventListener('pointermove', (ev) => C.tip(`<h5>${r.nombre}</h5><dl><dt>Caso adverso</dt><dd>${A.fmt.eur(Math.min(r.lo, r.hi))}</dd><dt>Caso favorable</dt><dd>${A.fmt.eur(Math.max(r.lo, r.hi))}</dd><dt>Rango</dt><dd>${A.fmt.eur(Math.abs(r.hi - r.lo))}</dd></dl>`, ev.clientX, ev.clientY));
      b.addEventListener('pointerleave', C.hideTip);
    });
  };

  /* ---- Radar del sistema humano ---- */
  C.radar = function (el, dims) {
    const S = 340, c = S / 2, R = 96, n = dims.length;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v]; };
    let svg = `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="Radar de preparación del equipo">`;
    [0.25, 0.5, 0.75, 1].forEach((k) => { svg += `<polygon points="${dims.map((_, i) => pt(i, k).join(',')).join(' ')}" fill="none" stroke="${css('--line')}"/>`; });
    dims.forEach((d, i) => { const [x2, y2] = pt(i, 1); svg += `<line x1="${c}" y1="${c}" x2="${x2}" y2="${y2}" stroke="${css('--line')}"/>`; });
    svg += `<polygon points="${dims.map((_, i) => pt(i, 0.7).join(',')).join(' ')}" fill="none" stroke="${css('--go')}" stroke-dasharray="3 4" opacity="0.7"/>`;
    svg += `<polygon points="${dims.map((d, i) => pt(i, d.score / 100).join(',')).join(' ')}" fill="${css('--gold')}" fill-opacity="0.18" stroke="${css('--gold')}" stroke-width="2"/>`;
    dims.forEach((d, i) => {
      const [px, py] = pt(i, d.score / 100);
      const st = d.score >= 70 ? 'ok' : d.score >= 50 ? 'warn' : 'stop';
      svg += `<circle cx="${px}" cy="${py}" r="4.5" fill="${A.stateColor(st)}" stroke="${css('--deep')}" stroke-width="2"/>`;
      const [lx, ly] = pt(i, 1.2);
      const anchor = Math.abs(lx - c) < 10 ? 'middle' : lx > c ? 'start' : 'end';
      svg += `<text x="${lx}" y="${ly + 4}" text-anchor="${anchor}" style="font-family:var(--font-body);font-size:13.5px;fill:${css('--fg')}">${d.corto}</text>`;
    });
    el.innerHTML = svg + '</svg>';
  };

  /* ---- EBITDA mensual frente a servicio de deuda ---- */
  C.debt = function (el, res) {
    const W = 900, Hh = 220, m = { l: 62, r: 20, t: 12, b: 28 };
    const eb = res.w.ebitda, debt = res.w.debt, n = eb.length;
    let mn = 0, mx = 0;
    eb.forEach((v, i) => { mn = Math.min(mn, v); mx = Math.max(mx, v, debt[i]); });
    const { ticks, lo, hi } = niceTicks(mn, mx, 4);
    const bw = (W - m.l - m.r) / n;
    const x = (i) => m.l + i * bw;
    const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (Hh - m.t - m.b);
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="EBITDA mensual y servicio de la deuda"><g class="grid">`;
    ticks.forEach((t) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 8}" y="${y(t) + 3}" text-anchor="end">${A.fmt.eur(t)}</text>`; });
    for (let yr = 0; yr <= 5; yr++) svg += `<text x="${x(Math.min(n - 1, yr * 12)) + bw / 2}" y="${Hh - 8}" text-anchor="middle">${yr === 0 ? 'mes 1' : 'año ' + yr}</text>`;
    svg += '</g>';
    eb.forEach((v, i) => {
      const top = y(Math.max(0, v)), bot = y(Math.min(0, v));
      const cover = v >= debt[i];
      svg += `<rect class="db" data-i="${i}" x="${x(i) + 1}" y="${top}" width="${Math.max(1, bw - 2)}" height="${Math.max(1, bot - top)}" rx="1.5" fill="${cover ? css('--s1') : css('--serious')}" opacity="0.85"/>`;
    });
    svg += `<polyline points="${debt.map((v, i) => `${x(i) + bw / 2},${y(v)}`).join(' ')}" fill="none" stroke="${css('--gold')}" stroke-width="2"/>`;
    svg += `<rect class="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${Hh - m.t - m.b}" fill="transparent"/>`;
    el.innerHTML = svg + '</svg>' + `<div class="chart-legend small" style="margin-top:8px"><span><i style="background:${css('--s1')}"></i> EBITDA del mes que cubre la cuota</span><span><i style="background:${css('--serious')}"></i> EBITDA por debajo de la cuota</span><span><i style="background:${css('--gold')}"></i> servicio total de deuda</span></div>`;
    const s = el.querySelector('svg');
    el.querySelector('.hit').addEventListener('pointermove', (ev) => {
      const r = s.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.floor((((ev.clientX - r.left) / r.width) * W - m.l) / bw)));
      C.tip(`<h5>Mes ${i + 1}</h5><dl><dt>EBITDA</dt><dd>${A.fmt.eur(eb[i])}</dd><dt>Servicio de deuda</dt><dd>${A.fmt.eur(debt[i])}</dd><dt>Plantilla</dt><dd>${A.fmt.num(res.w.heads[i])}</dd><dt>Caja</dt><dd>${A.fmt.eur(res.w.cash[i])}</dd></dl>`, ev.clientX, ev.clientY);
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
    if (zero && mn < 0) s += `<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="${css('--stop')}" stroke-dasharray="2 3" opacity="0.7"/>`;
    s += `<polygon points="0,${Hh} ${pts} ${W},${Hh}" fill="${color}" opacity="0.12"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
    return s + '</svg>';
  };

  /* ---- Anillo de dimensión ---- */
  C.ring = function (value, max, color, label) {
    const r = 38, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, value / max));
    return `<svg viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="6"/>` +
      `<circle cx="46" cy="46" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 46 46)"/>` +
      `<text x="46" y="51" text-anchor="middle" style="font-family:var(--font-data);font-size:15px;fill:${css('--fg')}">${label}</text></svg>`;
  };
})();
