/* Atalaya · Portada de cada mundo
   La misma cara que el puente de mando del simulador: titular grande con la parte clave calada, ficha de la empresa,
   tarjeta de veredicto con su franja de semáforos y fila de indicadores con su gráfica.
   A.heroMundo.html(cfg) devuelve el bloque; A.heroMundo.wire(host, cfg) conecta botones y semáforos.
   cfg = { kicker, titulo (HTML con <em>), lede, empresa, sector, datos[[k,v]], acciones[{t, cls, fn}],
           veredicto { kicker, st, titulo, texto, luces[{n, st, v, fn}], enlace{t, fn} }, kpis[{k, v, d, st, serie[], fn}] } */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COL = { ok: '#2fb24a', warn: '#e8a33b', stop: '#e04848' };
  const NOM = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  const spark = (serie, st) => {
    if (!serie || serie.length < 2) return '';
    const mx = Math.max(...serie, 1), mn = Math.min(...serie, 0), W = 120, Hh = 30;
    const pts = serie.map((v, i) => [(i / (serie.length - 1)) * W, Hh - 2 - ((v - mn) / (mx - mn || 1)) * (Hh - 4)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const c = st ? COL[st] : '#c9f24d';
    return `<svg class="spark" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L${W},${Hh} L0,${Hh} Z" fill="${c}" fill-opacity="0.16"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.6"/></svg>`;
  };
  const barras = (serie, st) => {
    if (!serie || !serie.length) return '';
    const mx = Math.max(...serie.map((x) => x.v), 1);
    return `<div class="hm-bars" aria-hidden="true">${serie.map((x) => `<i style="height:${Math.max(6, (x.v / mx) * 100)}%;background:${x.c || (st ? COL[st] : '#c9f24d')}" title="${esc(x.n || '')}"></i>`).join('')}</div>`;
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
        ${L.length ? `<div class="bar" aria-label="Semáforos">${L.map((l, i) => `<span data-hm-l="${i}" style="background:${COL[l.st] || '#3a4150'};opacity:${l.st === 'ok' ? 0.6 : l.st ? 0.95 : 0.35}" title="${esc(l.n)}${l.v ? ': ' + esc(l.v) : ''}"></span>`).join('')}</div>
        <div class="row small muted" style="margin-top:8px;justify-content:space-between"><span>${n('ok')} verdes · ${n('warn')} ámbar · ${n('stop')} rojos</span>${v.enlace ? `<a href="#" data-hm-link style="color:var(--gold)">${esc(v.enlace.t)}</a>` : ''}</div>` : ''}</div>` : ''}
    </div>
    ${c.kpis && c.kpis.length ? `<div class="kpis hm-kpis">${c.kpis.map((k, i) => `<button class="kpi" data-hm-k="${i}"><div class="k"><span>${esc(k.k)}</span>${k.st ? `<span class="state st-${k.st}">${NOM[k.st]}</span>` : ''}</div><div class="v">${esc(k.v)}</div>${k.d ? `<div class="d">${esc(k.d)}</div>` : ''}${k.barras ? barras(k.barras, k.st) : spark(k.serie, k.st)}</button>`).join('')}</div>` : ''}`;
  };
  H.wire = (host, c) => {
    host.querySelectorAll('[data-hm-a]').forEach((b) => (b.onclick = () => c.acciones[+b.dataset.hmA].fn()));
    host.querySelectorAll('[data-hm-l]').forEach((b) => { const l = c.veredicto.luces[+b.dataset.hmL]; if (l.fn) b.onclick = l.fn; else b.style.cursor = 'default'; });
    host.querySelectorAll('[data-hm-k]').forEach((b) => { const k = c.kpis[+b.dataset.hmK]; if (k.fn) b.onclick = k.fn; else b.style.cursor = 'default'; });
    const ln = host.querySelector('[data-hm-link]'); if (ln) ln.onclick = (e) => { e.preventDefault(); c.veredicto.enlace.fn(); };
    if (A.cosmos && A.cosmos.type3d) try { A.cosmos.type3d(host); } catch (e) { /* sin volumen */ }
  };
})();
