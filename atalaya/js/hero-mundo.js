/* Atalaya · Portada de cada mundo
   La misma cara que el puente de mando del simulador: titular grande con la parte clave calada, ficha de la empresa,
   tarjeta de veredicto con su franja de semáforos y fila de indicadores con su gráfica.
   A.heroMundo.html(cfg) devuelve el bloque; A.heroMundo.wire(host, cfg) conecta botones y semáforos.
   cfg = { kicker, titulo (HTML con <em>), lede, empresa, sector, datos[[k,v]], acciones[{t, cls, fn}],
           veredicto { kicker, st, titulo, texto, luces[{n, st, v, fn}], nulo (rótulo de las franjas sin estado), enlace{t, fn} }, kpis[{k, v, d, st, serie[] | barras[{n, v, c}], max, fn}] } */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COL = { ok: '#2fb24a', warn: '#e8a33b', stop: '#e04848' };
  const NOM = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  const num = (v) => (isFinite(+v) ? +v : 0); // valores sin dato (NaN, texto) cuentan como cero
  const spark = (serie, st) => {
    serie = (serie || []).map(num);
    if (serie.length < 2) return '';
    const mx = Math.max(...serie, 0), mn = Math.min(...serie, 0), W = 120, Hh = 30, rg = mx - mn;
    const Y = (v) => (rg ? Hh - 2 - ((v - mn) / rg) * (Hh - 4) : Hh - 2), y0 = Y(0).toFixed(1); // la base es el cero
    const pts = serie.map((v, i) => [(i / (serie.length - 1)) * W, Y(v)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const c = st ? COL[st] : '#c9f24d';
    return `<svg class="spark" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L${W},${y0} L0,${y0} Z" fill="${c}" fill-opacity="0.16"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.6"/></svg>`;
  };
  /* Barras pequeñas. max (opcional): el valor que llena la barra (100 para porcentajes, el total posible…);
     sin él, la barra mayor. Un cero se ve como una marca de 1 px, no como dato; los negativos bajan desde el cero. */
  const barras = (serie, st, max) => {
    if (!serie || !serie.length) return '';
    const vs = serie.map((x) => num(x.v)), mn = Math.min(0, ...vs), mx = Math.max(num(max), ...vs), rg = mx - mn || 1, base = (-mn / rg) * 100;
    return `<div class="hm-bars" aria-hidden="true">${serie.map((x, i) => { const v = vs[i], h = (Math.abs(v) / rg) * 100, abajo = v < 0 ? base - h : base; return `<i style="height:${v ? h.toFixed(1) + '%' : '1px'};${abajo ? `position:relative;bottom:${abajo.toFixed(1)}%;` : ''}${v ? '' : 'opacity:0.35;'}background:${x.c || (st ? COL[st] : '#c9f24d')}" title="${esc(x.n || '')}${x.n ? ': ' : ''}${esc(x.v == null ? '' : x.v)}"></i>`; }).join('')}</div>`;
  };
  /* Titular de módulo con la última palabra calada, como en el simulador («Cuadro de <em>mando</em>») */
  A.tituloCalado = (t) => { const w = String(t || '').trim().split(' '); if (w.length < 2) return esc(t); const ult = w.pop(); return esc(w.join(' ')) + ' <em>' + esc(ult) + '</em>'; };
  const H = (A.heroMundo = {});
  H.html = (c) => {
    const v = c.veredicto, L = (v && v.luces) || [];
    const n = (s) => L.filter((l) => l.st === s).length;
    return `<div class="hero hm-hero">
      <div>
        <div class="eyebrow">${esc(c.kicker)}</div>
        <h1 class="mt">${c.titulo}</h1>
        <p class="lede">${esc(c.lede)}</p>
        <div class="glass id-card hm-id">
          <div class="hm-emp"><span>Empresa</span><b>${esc(c.empresa || 'Mi empresa')}</b>${c.sector ? `<small>${esc(c.sector)}</small>` : ''}</div>
          ${c.datos && c.datos.length ? `<div class="hm-datos">${c.datos.map(([k, x]) => `<div><span>${esc(k)}</span><b>${esc(x)}</b></div>`).join('')}</div>` : ''}
          ${c.acciones && c.acciones.length ? `<div class="row id-actions">${c.acciones.map((a, i) => `<button class="btn ${a.cls || ''}" data-hm-a="${i}">${esc(a.t)}</button>`).join('')}</div>` : ''}
        </div>
      </div>
      ${v ? `<div class="glass verdict-card hm-ver"><div class="row"><h4>${esc(v.kicker)}</h4><span class="spacer"></span>${v.st ? `<span class="state st-${v.st}">${NOM[v.st]}</span>` : ''}</div>
        <div class="big">${esc(v.titulo)}</div><p class="muted small" style="margin:0">${esc(v.texto)}</p>
        ${L.length ? `<div class="bar" role="group" aria-label="Semáforos">${L.map((l, i) => { const t = `${esc(l.n)}${l.v ? ': ' + esc(l.v) : ''} (${l.st ? NOM[l.st].toLowerCase() : esc(v.nulo || 'sin datos')})`; return `<span data-hm-l="${i}" ${l.fn ? 'role="button" tabindex="0"' : 'role="img"'} aria-label="${t}" style="background:${COL[l.st] || '#3a4150'};opacity:${l.st === 'ok' ? 0.6 : l.st ? 0.95 : 0.35}" title="${t}"></span>`; }).join('')}</div>
        <div class="row small muted" style="margin-top:8px;justify-content:space-between"><span>${n('ok')} verdes · ${n('warn')} ámbar · ${n('stop')} rojos${L.length - n('ok') - n('warn') - n('stop') ? ` · ${L.length - n('ok') - n('warn') - n('stop')} ${esc(v.nulo || 'sin datos')}` : ''}</span>${v.enlace ? `<a href="#" data-hm-link style="color:var(--gold)">${esc(v.enlace.t)}</a>` : ''}</div>` : ''}</div>` : ''}
    </div>
    ${c.kpis && c.kpis.length ? `<div class="kpis hm-kpis">${c.kpis.map((k, i) => `<button class="kpi" data-hm-k="${i}"><div class="k"><span>${esc(k.k)}</span>${k.st ? `<span class="state st-${k.st}">${NOM[k.st]}</span>` : ''}</div><div class="v">${esc(k.v)}</div>${k.d ? `<div class="d">${esc(k.d)}</div>` : ''}${k.barras ? barras(k.barras, k.st, k.max) : spark(k.serie, k.st)}</button>`).join('')}</div>` : ''}`;
  };
  H.wire = (host, c) => {
    host.querySelectorAll('[data-hm-a]').forEach((b) => (b.onclick = () => c.acciones[+b.dataset.hmA].fn()));
    host.querySelectorAll('[data-hm-l]').forEach((b) => { const l = c.veredicto.luces[+b.dataset.hmL]; if (l.fn) { b.onclick = l.fn; b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); l.fn(); } }; } else b.style.cursor = 'default'; });
    host.querySelectorAll('[data-hm-k]').forEach((b) => { const k = c.kpis[+b.dataset.hmK]; if (k.fn) b.onclick = k.fn; else b.style.cursor = 'default'; });
    const ln = host.querySelector('[data-hm-link]'); if (ln) ln.onclick = (e) => { e.preventDefault(); c.veredicto.enlace.fn(); };
    if (A.cosmos && A.cosmos.type3d) try { A.cosmos.type3d(host); } catch (e) { /* sin volumen */ }
  };
})();
