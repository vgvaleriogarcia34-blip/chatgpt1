/* Atalaya · Informes profesionales
   Marco común para todos los informes: portada, resumen ejecutivo, bandas de indicadores, tablas,
   semáforos, riesgos y hallazgos, con maquetación de documento (A4 al imprimir) y versión en texto. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const I = (A.informe = {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const ST = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo', go: 'Verde' };
  I.esc = esc;
  I.fecha = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  I.ref = (tipo) => 'AT-' + String(tipo || 'INF').slice(0, 3).toUpperCase() + '-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Date.now()).slice(-4);
  I.pill = (st, t) => `<span class="rp-pill rp-${st === 'go' ? 'ok' : st}">${esc(t || ST[st] || '')}</span>`;

  /* ---------- Marca blanca: la ficha de la firma del consultor ----------
     Una por cuenta y para todas sus empresas: se guarda en el registro de empresas de la cuenta (dato «empresas», que ya
     viaja al servidor), dentro de la ficha de la empresa principal (campo «firma»). La edita «Ficha de su firma» en la
     propuesta comercial. Sin ficha, los documentos llevan solo «Atalaya 360°»; con ficha, la firma es la marca y, si se
     quiere, un discreto «Elaborado con Atalaya 360°» al pie. Antes la ficha vivía en el navegador (atalaya.firma[@id]):
     se lee de ahí mientras no se guarde la nueva, sin el nombre que ponía por defecto la versión anterior. */
  const PL = () => A.platform;
  const AT = 'Atalaya 360°';
  let fMemo = null, fT = null;
  const principal = () => { const P = PL(), l = P && P.empresas && P.empresas.lista ? P.empresas.lista() : []; return l.find((e) => e && e.id === 'principal'); };
  const leerFirma = () => {
    if (fMemo) return Object.assign({}, fMemo);
    const e = principal(); if (e && e.firma && typeof e.firma === 'object') return Object.assign({}, e.firma);
    let v = null; const P = PL();
    [P && P.k ? P.k('atalaya.firma') : '', 'atalaya.firma'].filter(Boolean).forEach((k) => { if (!v) try { v = JSON.parse(localStorage.getItem(k)); } catch (x) { v = null; } });
    v = v && typeof v === 'object' ? v : {};
    if (v.nombre === 'Business Avance' && (!v.lema || v.lema === 'Consultoría para pymes')) delete v.nombre; // el valor por defecto de antes, no una elección
    return v;
  };
  // Guarda la ficha (se agrupan las pulsaciones): al instante para esta página y, tras una pausa, en la cuenta
  const guardarFirma = (f) => {
    fMemo = Object.assign({}, f); clearTimeout(fT);
    return new Promise((ok) => { fT = setTimeout(async () => {
      const P = PL();
      try { if (P && P.empresas && P.empresas.editar) await P.empresas.editar('principal', { firma: fMemo }); else localStorage.setItem('atalaya.firma', JSON.stringify(fMemo)); ok(true); }
      catch (x) { if (P && P.toast) P.toast('No se pudo guardar la ficha de la firma: ' + ((x && x.message) || 'error')); ok(false); }
    }, 600); });
  };
  // Contraste WCAG de un color frente al blanco (el color de acento debe leerse sobre el papel: 4,5 o más)
  const lum = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return null; return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0); };
  I.contraste = (hex) => { const L = lum(hex); return L == null ? 0 : 1.05 / (L + 0.05); };
  I.colorOk = (hex) => I.contraste(hex) >= 4.5;
  A.firma = () => {
    const f = leerFirma(), nombre = String(f.nombre || '').trim();
    return { propia: !!nombre, nombre: nombre || AT, lema: f.lema || '', consultor: f.consultor || '', cargo: f.cargo || '', razonSocial: f.razon || '', cif: f.cif || '', direccion: f.direccion || '', ciudad: f.ciudad || '', email: f.email || '', tel: f.tel || '',
      contacto: [f.email, f.tel].filter(Boolean).join(' · '), descripcion: f.descripcion || '', logo: /^data:image\/(png|jpe?g|webp);base64,/.test(f.logo || '') ? f.logo : '', color: I.colorOk(f.color) ? f.color : '', elaborado: f.elaborado !== false,
      portada: /^data:image\/(png|jpe?g|webp);base64,/.test(f.portada || '') ? f.portada : '' };
  };
  A.firma.leer = leerFirma;
  A.firma.guardar = guardarFirma;
  // Marca en texto (pies y PDF) y la coletilla discreta
  I.marcaTxt = () => A.firma().nombre;
  I.elaborado = () => { const F = A.firma(); return F.propia && F.elaborado ? 'Elaborado con ' + AT : ''; };
  // Color de acento de la firma en los títulos de los informes (una hoja de estilo que se rehace si cambia)
  I.estilo = () => {
    const c = A.firma().color; let st = document.getElementById('rpFirmaCss');
    if (!c) { if (st) st.remove(); return; }
    if (!st) { st = document.createElement('style'); st.id = 'rpFirmaCss'; document.head.appendChild(st); }
    const css = `.paper.rp .rp-kicker,.paper.rp .lb-secp span,.paper.rp .rp-sec:not(.rp-abre)>h2 .rp-n,.paper.rp .rp-fig-t,.pp-hl b{color:${c}}.paper.rp thead th,.pp-t thead th{background:${c}!important;color:#fff!important}.paper.rp .rp-foot{border-top-color:${c}}.pp-f{background:${c}!important}.pp-f b{color:#fff!important}.pp-band{border-left-color:${c}!important}`;
    if (st.textContent !== css) st.textContent = css;
  };
  /* Membrete: la firma (con su logotipo si lo tiene) o, sin ficha, Atalaya 360° */
  I.membrete = () => {
    I.estilo();
    const F = A.firma();
    if (!F.propia) return `<span class="rp-mb"><b class="rp-at">Atalaya <i>360°</i></b></span>`;
    const w = F.nombre.split(/\s+/), k = w.length > 1 ? Math.ceil(w.length / 2) : 1;
    return `<span class="rp-mb">${F.logo ? `<img src="${F.logo}" alt="" style="height:28px;width:auto;max-width:130px;object-fit:contain;background:#fff;border-radius:3px;padding:2px">` : ''}<b class="rp-ba">${esc(w.slice(0, k).join(' '))}${w.length > 1 ? `<i>${esc(w.slice(k).join(' '))}</i>` : ''}</b></span>`;
  };
  /* Los capítulos guardados (libro corporativo) llevan el membrete de su momento: se ponen con la marca de hoy */
  I.remarcar = (html) => {
    const t = document.createElement('template'); t.innerHTML = String(html || '');
    const mb = document.createElement('template'); mb.innerHTML = I.membrete();
    t.content.querySelectorAll('.rp-mb').forEach((x) => x.replaceWith(mb.content.firstElementChild.cloneNode(true)));
    const W = document.createTreeWalker(t.content, NodeFilter.SHOW_TEXT), M = I.marcaTxt();
    for (let n = W.nextNode(); n; n = W.nextNode()) if (n.nodeValue.includes('Business Avance · Atalaya 360°')) n.nodeValue = n.nodeValue.replace(/Business Avance · Atalaya 360°/g, M);
    const d = document.createElement('div'); d.appendChild(t.content); return d.innerHTML;
  };
  /* Portada: franja de marca, tipo de documento, título, ficha y referencia */
  I.cover = (o) => `<header class="rp-cover">
      <div class="rp-brand">${I.membrete()}<span>${esc(o.tipo || 'Informe')}</span></div>
      <div class="rp-cover-body">
        <div class="rp-kicker">${esc(o.kicker || o.tipo || 'Informe')}</div>
        <h1>${esc(o.titulo)}</h1>
        ${o.subtitulo ? `<p class="rp-subtitle">${esc(o.subtitulo)}</p>` : ''}
        <dl class="rp-meta">
          <div><dt>Empresa</dt><dd>${esc(o.empresa || '—')}</dd></div>
          ${o.sector ? `<div><dt>Sector</dt><dd>${esc(o.sector)}</dd></div>` : ''}
          <div><dt>Fecha</dt><dd>${esc(I.fecha())}</dd></div>
          ${o.ambito ? `<div><dt>Ámbito</dt><dd>${esc(o.ambito)}</dd></div>` : ''}
          ${o.periodo ? `<div><dt>Periodo analizado</dt><dd>${esc(o.periodo)}</dd></div>` : ''}
          <div><dt>Referencia</dt><dd>${esc(o.ref || I.ref(o.tipo))}</dd></div>
        </dl>
      </div>
    </header>`;
  /* Resumen ejecutivo destacado */
  I.summary = (titulo, html, st) => `<section class="rp-summary${st ? ' rp-s-' + (st === 'go' ? 'ok' : st) : ''}"><div class="rp-kicker">${esc(titulo || 'Resumen ejecutivo')}</div>${html}</section>`;
  /* Sección numerada */
  let n = 0;
  I.reset = () => { n = 0; };
  I.setN = (k) => { n = k; };
  I.section = (titulo, html, lede) => { n++; return `<section class="rp-sec"><h2><span class="rp-n">${String(n).padStart(2, '0')}</span>${esc(titulo)}</h2>${lede ? `<p class="rp-lede">${lede}</p>` : ''}${html}</section>`; };
  /* Banda de indicadores */
  I.kpis = (list) => (list && list.length ? `<div class="rp-kpis">${list.map((k) => `<div class="rp-kpi${k.st ? ' rp-k-' + k.st : ''}"><span>${esc(k.k)}</span><b>${k.v}</b>${k.st ? I.pill(k.st) : ''}${k.d ? `<small>${k.d}</small>` : ''}</div>`).join('')}</div>` : '');
  /* Tabla: cabeceras y filas (texto o HTML ya escapado con {h}) */
  I.table = (heads, rows, opts) => {
    opts = opts || {};
    const cell = (c, i) => { const v = c && typeof c === 'object' && 'h' in c ? c.h : esc(c); const num = opts.num && opts.num.includes(i); return `<td${num ? ' class="rp-num"' : ''}>${v}</td>`; };
    return `<div class="rp-tw"><table class="rp-table"><thead><tr>${heads.map((h, i) => `<th${opts.num && opts.num.includes(i) ? ' class="rp-num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length}" class="rp-empty">Sin información disponible.</td></tr>`}</tbody></table></div>`;
  };
  I.risks = (R) => (R && R.length ? I.table(['Riesgo', 'Prob.', 'Impacto', 'Nivel', 'Mitigación'], R.map((r) => [r.nombre, r.prob + '/5', r.impacto + '/5', { h: I.pill(r.estado, String(r.nivel)) }, r.mitigacion || '']), { num: [1, 2] }) : '<p class="rp-muted">No se han identificado riesgos relevantes.</p>');
  I.findings = (Fi, fmt) => (Fi && Fi.length ? I.table(['Hallazgo', 'Acción recomendada', 'Impacto anual', 'Plazo'], Fi.map((f) => [f.hallazgo, f.accion, fmt ? fmt(f.impactoEUR || 0) : f.impactoEUR, (f.plazo || 90) + ' días']), { num: [2, 3] }) : '<p class="rp-muted">No se han identificado hallazgos con impacto económico cuantificable.</p>');
  I.callout = (html, tipo) => `<div class="rp-callout${tipo ? ' rp-c-' + tipo : ''}">${html}</div>`;
  I.foot = (txt) => `<footer class="rp-foot"><span>${esc(I.marcaTxt())} · ${esc(I.fecha())}</span><span>${esc(txt || 'Las cifras son estimaciones elaboradas con la información facilitada por la empresa. La fiscalidad y las decisiones societarias deben validarse con sus asesores.')}</span>${I.elab()}</footer>`;
  // Coletilla del pie (en su propia línea, más pequeña)
  I.elab = () => (I.elaborado() ? `<span class="rp-elab" style="font-size:0.64rem;letter-spacing:0.04em;opacity:0.75">${esc(I.elaborado())}</span>` : '');

  /* ---------- Maquetación editorial: rejilla de dos columnas, notas al margen, gráficos e imágenes ----------
     Cada sección (.rp-sec) se compone en dos columnas: una estrecha a la izquierda (24 %) con las notas al margen
     y la principal (73 %) con el texto, las tablas y los gráficos, separadas por un filete vertical. El rótulo de la
     sección («SECCIÓN 01») va sobre el título. La primera sección de cada documento abre con una banda de imagen y el
     título encima; algunas de las siguientes llevan una pequeña imagen en el margen. Las imágenes son composiciones
     abstractas en SVG con la paleta de la marca, generadas de forma determinista a partir del título (sin archivos ni
     fotos externas); si la firma ha subido una foto de portada (ficha de la firma), la banda de apertura la usa.
     Todo lo hace I.maquetar sobre el documento ya pintado, así que vale para todos los informes sin tocar su contenido:
     las entradillas (.rp-lede) pasan al margen y las tablas que no caben en la columna principal toman el ancho entero.
     Notas propias: I.nota(texto) delante del bloque al que acompaña, o la opción «nota» de I.donut, I.barras e
     I.columnas. En pantallas estrechas el margen se apila encima de su bloque. */
  // Paleta de gráficos para papel, derivada de la marca: oliva, pizarra, lima, arena y sus tonos. Los colores de estado
  // (verde, ámbar, rojo) se reservan para estados. Todas las cifras van además escritas junto al gráfico.
  I.PAL = ['#6e7d14', '#4a5470', '#a6c13a', '#b8955a', '#2b3040', '#8e98b3', '#cfdc86', '#dcc69f'];
  I.ST_C = { ok: '#2e8a45', go: '#2e8a45', warn: '#c48a00', stop: '#c0392f' };
  const colorDe = (d, i, o) => d.c || (d.st && I.ST_C[d.st]) || (o && o.color) || I.PAL[i % I.PAL.length];
  const numTxt = (v) => (Math.round(v * 10) / 10).toLocaleString('es-ES');
  I.nota = (t, o) => `<aside class="rp-nota">${o && o.html ? t : esc(t)}</aside>`;
  const figura = (o, cuerpo, alt) => `${o.nota ? I.nota(o.nota) : ''}<figure class="rp-fig${o.ancho ? ' rp-ancho' : ''}">${o.titulo ? `<figcaption class="rp-fig-t">${esc(o.titulo)}</figcaption>` : ''}${cuerpo}${alt ? `<p class="rp-alt">${esc(alt)}</p>` : ''}${o.pie ? `<p class="rp-fig-pie">${esc(o.pie)}</p>` : ''}</figure>`;
  /* Anillo con leyenda. datos: [{ k, v, c?, st?, t? (cifra ya formateada) }]; o: { titulo, nota, pie, fmt, centro, centroTxt } */
  I.donut = (datos, o) => {
    o = o || {}; const L = (datos || []).filter((d) => d && +d.v > 0); if (L.length < 2) return '';
    const tot = L.reduce((s, d) => s + +d.v, 0), fmt = o.fmt || numTxt, R = 78, r = 50, C = 80;
    const pt = (a, rr) => `${(C + rr * Math.cos(a)).toFixed(2)} ${(C + rr * Math.sin(a)).toFixed(2)}`;
    let a = -Math.PI / 2;
    const arcos = L.map((d, i) => { const f = d.v / tot, a1 = a + f * 2 * Math.PI, g = f > 0.5 ? 1 : 0;
      const p = `<path d="M${pt(a, R)} A${R} ${R} 0 ${g} 1 ${pt(a1, R)} L${pt(a1, r)} A${r} ${r} 0 ${g} 0 ${pt(a, r)} Z" fill="${colorDe(d, i, o)}" stroke="#fff" stroke-width="1.5"/>`; a = a1; return p; }).join('');
    const pct = (v) => Math.round((v / tot) * 1000) / 10;
    return figura(o, `<div class="rp-donut"><div class="rp-donut-g"><svg viewBox="0 0 160 160" width="150" height="150" role="img" aria-label="${esc((o.titulo || 'Distribución') + ': ' + L.map((d) => d.k + ' ' + (d.t || fmt(+d.v))).join(', '))}">${arcos}</svg>${o.centro != null ? `<span class="rp-donut-c"><b>${esc(o.centro)}</b>${o.centroTxt ? `<small>${esc(o.centroTxt)}</small>` : ''}</span>` : ''}</div>
      <ul class="rp-leg${L.length > 5 ? ' rp-leg-2' : ''}">${L.map((d, i) => `<li><i style="background:${colorDe(d, i, o)}"></i><span>${esc(d.k)}<i class="rp-dp">:</i></span> <b>${esc(d.t || fmt(+d.v))}</b> <em><i class="rp-dp">(</i>${numTxt(pct(+d.v))} %<i class="rp-dp">)</i></em></li>`).join('')}</ul></div>`);
  };
  /* Barras horizontales. datos: [{ k, v, c?, st?, t? }]; o: { titulo, nota, pie, fmt, fmtEje, max, meta, metaTxt, color, eje } */
  const pasos = (mn, mx) => { const sp = mx - mn || 1, e = Math.pow(10, Math.floor(Math.log10(sp / 4))), m = [1, 2, 2.5, 5, 10].find((k) => sp / (k * e) <= 5) || 10, st = m * e; const t = [], hi = Math.ceil(mx / st - 1e-9) * st; for (let v = Math.floor(mn / st + 1e-9) * st; v <= hi + 1e-9; v += st) t.push((Math.round(v * 1e6) / 1e6) || 0); return t; };
  const corto = (v) => { const a = Math.abs(v); return a >= 1e6 ? numTxt(v / 1e6) + ' M' : a >= 1e4 ? numTxt(v / 1e3) + ' k' : numTxt(v); };
  I.barras = (datos, o) => {
    o = o || {}; const L = (datos || []).filter((d) => d && d.v != null && isFinite(+d.v)); if (!L.length) return '';
    const fmt = o.fmt || numTxt, vs = L.map((d) => +d.v), mn = Math.min(0, ...vs), mx = Math.max(0, o.max || 0, o.meta || 0, ...vs);
    const tk = o.eje === false ? [] : pasos(mn, mx), lo = Math.min(mn, tk[0] != null ? tk[0] : mn), hi = Math.max(mx, tk.length ? tk[tk.length - 1] : mx), sp = hi - lo || 1, X = (v) => ((v - lo) / sp) * 100;
    const rejilla = tk.map((t) => `<line x1="${X(t).toFixed(2)}" x2="${X(t).toFixed(2)}" y1="0" y2="10" stroke="${t === 0 ? '#9a9688' : '#e2dfd5'}" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('');
    const meta = o.meta != null ? `<line x1="${X(o.meta).toFixed(2)}" x2="${X(o.meta).toFixed(2)}" y1="0" y2="10" stroke="#0b0d13" stroke-width="1.5" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/>` : '';
    const filas = L.map((d, i) => { const v = +d.v, x0 = X(Math.min(0, v)), w = Math.max(0.4, Math.abs(X(v) - X(0)));
      return `<div class="rp-hb"><span class="rp-hb-k">${esc(d.k)}<i class="rp-dp">:</i></span> <span class="rp-hb-t"><svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">${rejilla}<rect x="${x0.toFixed(2)}" y="1.5" width="${w.toFixed(2)}" height="7" fill="${colorDe(d, i, o)}"/>${meta}</svg></span> <b class="rp-hb-v">${esc(d.t || fmt(v))}</b></div>`; }).join('');
    const eje = tk.length ? `<div class="rp-hb rp-hb-ax" aria-hidden="true"><span></span><span class="rp-hb-t">${tk.map((t) => `<i style="left:${X(t).toFixed(2)}%">${esc((o.fmtEje || corto)(t))}</i>`).join('')}</span><b></b></div>` : '';
    return figura(o, `<div class="rp-hbars">${filas}${eje}</div>${o.meta != null && o.metaTxt ? `<p class="rp-fig-pie"><i class="rp-meta-l"></i>${esc(o.metaTxt)}</p>` : ''}`);
  };
  /* Columnas agrupadas (evolución por años). cats: ['2022', …]; series: [{ n, v: [..], c? }]; o: { titulo, nota, pie, fmt, fmtEje } */
  I.columnas = (cats, series, o) => {
    o = o || {}; const S = (series || []).filter((s) => s && s.v && s.v.some((x) => x != null && isFinite(x))); if (!S.length || !cats || !cats.length) return '';
    const fmt = o.fmt || numTxt, W = 560, H = 210, top = 18, bot = 26, l = 48, all = S.flatMap((s) => s.v.filter((x) => x != null && isFinite(x)));
    const tk = pasos(Math.min(0, ...all), Math.max(0, ...all)), lo = tk[0], hi = tk[tk.length - 1], Y = (v) => top + (1 - (v - lo) / (hi - lo || 1)) * (H - top - bot);
    const gw = (W - l - 8) / cats.length, bw = Math.min(26, (gw * 0.72) / S.length);
    const ejes = tk.map((t) => `<line x1="${l}" x2="${W - 4}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="${t === 0 ? '#9a9688' : '#e2dfd5'}" stroke-width="${t === 0 ? 1 : 0.7}"/><text x="${l - 6}" y="${(Y(t) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#6e7480">${esc((o.fmtEje || corto)(t))}</text>`).join('');
    const barras = cats.map((c, i) => { const x0 = l + i * gw + (gw - bw * S.length) / 2;
      return S.map((s, j) => { const v = s.v[i]; if (v == null || !isFinite(v)) return ''; const y = Y(Math.max(0, v)), h = Math.max(0.8, Math.abs(Y(v) - Y(0))), col = s.c || I.PAL[j % I.PAL.length];
        return `<rect x="${(x0 + j * bw + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"/>`; }).join('') + `<text x="${(l + i * gw + gw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10.5" fill="#4f5560">${esc(c)}</text>`; }).join('');
    const alt = S.map((s) => `${s.n}: ${cats.map((c, i) => `${c} ${s.v[i] == null ? '—' : fmt(s.v[i])}`).join(', ')}`).join('. ') + '.';
    return figura(o, `<svg class="rp-cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc((o.titulo || 'Evolución') + '. ' + alt)}">${ejes}${barras}</svg><ul class="rp-leg rp-leg-h">${S.map((s, j) => `<li><i style="background:${s.c || I.PAL[j % I.PAL.length]}"></i><span>${esc(s.n)}</span></li>`).join('')}</ul>`, alt);
  };

  /* Imágenes de apertura: composiciones abstractas deterministas (curvas de nivel, ondas o geometría) */
  const hashS = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const azar = (sd) => () => { sd = (sd + 0x6d2b79f5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const curva = (ps) => { const n = ps.length; let d = `M${ps[0][0].toFixed(1)} ${ps[0][1].toFixed(1)}`; for (let i = 0; i < n; i++) { const p0 = ps[(i - 1 + n) % n], p1 = ps[i], p2 = ps[(i + 1) % n], p3 = ps[(i + 2) % n]; d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; } return d + 'Z'; };
  I.visual = (semilla, o) => {
    o = o || {}; const W = o.w || 640, H = o.h || 220, osc = !!o.oscuro, h = hashS(semilla), R = azar(h), tipo = o.tipo || ['topo', 'ondas', 'geo'][h % 3];
    const fondo = osc ? '#10131a' : '#ecebe3', l1 = osc ? '#c9f24d' : '#6e7d14', l2 = osc ? '#8a9a2a' : '#4a5470', acento = osc ? '#c9f24d' : '#a6c13a';
    let g = '';
    if (tipo === 'topo') {
      const cs = [[W * (0.74 + R() * 0.18), H * (0.14 + R() * 0.3)], [W * (0.12 + R() * 0.3), H * (0.65 + R() * 0.5)]];
      cs.forEach(([cx, cy], k) => { const f0 = R() * 6.3, f1 = R() * 6.3, f2 = R() * 6.3, n = k ? 9 : 16, paso = H * (k ? 0.11 : 0.075);
        for (let j = 1; j <= n; j++) { const rr = paso * j, ps = [];
          for (let q = 0; q < 24; q++) { const a = (q / 24) * Math.PI * 2, f = 1 + 0.2 * Math.sin(a * 2 + f0 + j * 0.22) + 0.09 * Math.sin(a * 3 + f1 - j * 0.1) + 0.05 * Math.sin(a * 5 + f2 - j * 0.35); ps.push([cx + Math.cos(a) * rr * f * 1.7, cy + Math.sin(a) * rr * f]); }
          const fuerte = j % 5 === 0;
          g += `<path d="${curva(ps)}" fill="none" stroke="${fuerte ? l1 : l2}" stroke-width="${fuerte ? 1.3 : 0.75}" opacity="${osc ? (fuerte ? 0.9 : 0.55) : (fuerte ? 0.75 : 0.45)}"/>`; } });
      const [ax, ay] = cs[0]; g += `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${(H * 0.045).toFixed(1)}" fill="${acento}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${(H * 0.09).toFixed(1)}" fill="none" stroke="${acento}" stroke-width="1" opacity="0.7"/>`;
    } else if (tipo === 'ondas') {
      const n = 22, amp = H * (0.05 + R() * 0.06), fr = 1.2 + R() * 2.2, fa = R() * 6.3;
      for (let j = 0; j < n; j++) { const y0 = (j / (n - 1)) * H * 1.1 - H * 0.05; let d = `M0 ${y0.toFixed(1)}`;
        for (let x = 0; x <= W; x += W / 40) d += ` L${x.toFixed(1)} ${(y0 + Math.sin((x / W) * Math.PI * fr + fa + j * 0.35) * amp * (0.4 + j / n)).toFixed(1)}`;
        g += `<path d="${d}" fill="none" stroke="${j % 5 === 2 ? l1 : l2}" stroke-width="${j % 5 === 2 ? 1.6 : 0.8}" opacity="${j % 5 === 2 ? 0.85 : 0.42}"/>`; }
      g += `<circle cx="${(W * (0.8 + R() * 0.12)).toFixed(1)}" cy="${(H * (0.16 + R() * 0.14)).toFixed(1)}" r="${(H * 0.12).toFixed(1)}" fill="${acento}" opacity="${osc ? 0.9 : 0.75}"/>`;
    } else {
      const t = Math.max(H / 3, 46), cols = Math.ceil(W / t), fil = Math.ceil(H / t), pal = osc ? ['#c9f24d', '#8a9a2a', '#2b3040', '#4a5470', '#1b1f2a'] : ['#6e7d14', '#a6c13a', '#4a5470', '#dcc69f', '#d9d6cc'];
      for (let i = 0; i < cols; i++) for (let j = 0; j < fil; j++) { const x = i * t, y = j * t, k = Math.floor(R() * 6), c = pal[Math.floor(R() * pal.length)], op = osc ? 0.75 : 0.8;
        if (R() < 0.38) continue;
        if (k === 0) g += `<circle cx="${(x + t / 2).toFixed(1)}" cy="${(y + t / 2).toFixed(1)}" r="${(t * 0.4).toFixed(1)}" fill="${c}" opacity="${op}"/>`;
        else if (k === 1) g += `<path d="M${x} ${y + t} A${t} ${t} 0 0 1 ${x + t} ${y}L${x + t} ${y + t}Z" fill="${c}" opacity="${op}"/>`;
        else if (k === 2) g += `<path d="M${x} ${y}L${x + t} ${y}L${x} ${y + t}Z" fill="${c}" opacity="${op}"/>`;
        else if (k === 3) g += `<circle cx="${(x + t / 2).toFixed(1)}" cy="${(y + t / 2).toFixed(1)}" r="${(t * 0.32).toFixed(1)}" fill="none" stroke="${c}" stroke-width="2" opacity="${op}"/>`;
        else if (k === 4) g += `<rect x="${x + t * 0.15}" y="${y + t * 0.42}" width="${t * 0.7}" height="${t * 0.16}" fill="${c}" opacity="${op}"/>`;
        else g += `<path d="M${x} ${y} A${t} ${t} 0 0 0 ${x + t} ${y + t}L${x} ${y + t}Z" fill="${c}" opacity="${op}"/>`; }
    }
    return `<svg class="rp-visual" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="${W}" height="${H}" fill="${fondo}"/>${g}</svg>`;
  };
  // Cifras: celdas que son un número (con su unidad) se alinean a la derecha con dígitos tabulares
  const NUM_RE = /^[−\-+]?\s?\d[\d.,\s]*\s?(€|k€|M€|%|x|×|veces|días|meses|años|pts|h|ud\.?|\/\d+)?$/i;
  const alinearCifras = (t) => {
    if (t.closest('.pp-page') || t.dataset.rpNum) return; t.dataset.rpNum = '1';
    const filas = Array.from(t.tBodies).flatMap((b) => Array.from(b.rows)); if (!filas.length) return;
    const n = Math.max(...filas.map((r) => r.cells.length));
    for (let i = 1; i < n; i++) {
      const cs = filas.map((r) => r.cells[i]).filter((c) => c && c.colSpan === 1 && c.textContent.trim() && c.textContent.trim() !== '—');
      if (!cs.length || cs.some((c) => c.querySelector('.rp-pill, .pill, ul, ol'))) continue;
      if (cs.filter((c) => NUM_RE.test(c.textContent.trim())).length / cs.length < 0.8) continue;
      filas.forEach((r) => { const c = r.cells[i]; if (c && c.colSpan === 1) c.classList.add('rp-num'); });
      const hr = t.tHead && t.tHead.rows[0]; if (hr && hr.cells[i] && hr.cells.length === n) hr.cells[i].classList.add('rp-num');
    }
  };
  /* Compone un documento ya pintado (pantalla o marco de impresión). Se puede llamar varias veces: lo ya hecho no se repite
     y el ancho de las tablas se vuelve a medir. */
  I.maquetar = (root) => {
    if (!root || !root.querySelectorAll) return root;
    const doc = root.ownerDocument || document, F = A.firma();
    root.classList.add('rp-ed');
    root.querySelectorAll('table').forEach(alinearCifras);
    // Las secciones de cada documento (un libro reúne varios): la primera abre con la banda de imagen
    let orden = 0;
    root.querySelectorAll('.rp-cover, .rp-sec').forEach((s) => {
      if (s.closest('.pp-page')) return;
      if (s.classList.contains('rp-cover')) { orden = 0; return; }
      if (s.parentElement && s.parentElement.closest('.rp-sec')) return;
      orden++;
      if (s.classList.contains('rp-g')) return;
      s.classList.add('rp-g');
      const h2 = Array.from(s.children).find((x) => x.tagName === 'H2'); if (!h2) return;
      const nEl = h2.querySelector('.rp-n'), nTxt = nEl ? nEl.textContent.trim() : '';
      if (nEl) nEl.dataset.k = /^\d+$/.test(nTxt) ? 'Sección ' : /anexo/i.test(h2.textContent) || s.classList.contains('rp-anexo') ? 'Anexo ' : 'Sección ';
      const semilla = (h2.textContent || '') + orden;
      // El contenido va a la columna principal; las entradillas, al margen
      const col = doc.createElement('div'); col.className = 'rp-col';
      while (s.firstChild) col.appendChild(s.firstChild);
      s.appendChild(col);
      Array.from(col.children).forEach((x) => { if (x.classList.contains('rp-lede') && x.tagName === 'P') x.classList.add('rp-nota'); });
      if (orden === 1 && !s.classList.contains('rp-anexo')) {
        s.classList.add('rp-abre');
        const b = doc.createElement('div'); b.className = 'rp-banda';
        b.innerHTML = F.portada ? `<img class="rp-visual" src="${F.portada}" alt="">` : I.visual(semilla, { oscuro: true, w: 900, h: 240, tipo: ['topo', 'ondas'][hashS(semilla) % 2] });
        const tinte = doc.createElement('span'); tinte.className = 'rp-tinte'; tinte.setAttribute('aria-hidden', 'true'); b.appendChild(tinte);
        b.appendChild(h2); s.insertBefore(b, col);
      } else if (orden % 2 === 1 && !s.classList.contains('rp-anexo')) {
        const v = doc.createElement('div'); v.className = 'rp-nota rp-vis'; v.setAttribute('aria-hidden', 'true');
        v.innerHTML = I.visual(semilla, { w: 300, h: 220 });
        h2.after(v);
      }
    });
    root.querySelectorAll('.lb-secp').forEach((s) => {
      if (s.querySelector(':scope > .lb-vis')) return;
      const v = doc.createElement('div'); v.className = 'lb-vis'; v.setAttribute('aria-hidden', 'true');
      v.innerHTML = I.visual('libro' + (s.textContent || '').slice(0, 60), { oscuro: true, w: 900, h: 320, tipo: 'topo' }); s.prepend(v);
    });
    I.anchos(root);
    return root;
  };
  // Tablas y bloques que no caben en la columna principal pasan a todo el ancho (y su nota, encima)
  I.anchos = (root) => {
    const bloqueTablas = Array.from(root.querySelectorAll('.rp-col > .rp-block .rp-tw, .rp-col > .rp-block .table-wrap')).filter((w) => { const bl = w.closest('.rp-block'); return w.parentElement === bl || Math.abs(w.parentElement.clientWidth - bl.clientWidth) < 3; });
    Array.from(root.querySelectorAll('.rp-col > .rp-tw, .rp-col > .table-wrap, .rp-col > table, .rp-col > .rp-block, .rp-col > .chart')).concat(bloqueTablas).forEach((w) => {
      if (w.classList.contains('rp-ancho-fijo')) return;
      w.classList.remove('rp-ancho'); const pv = w.previousElementSibling; if (pv) pv.classList.remove('rp-nota-arriba');
      for (let x = w.previousElementSibling; x && x.classList.contains('rp-nota'); x = x.previousElementSibling) x.classList.remove('rp-vis-fuera');
      const t = w.tagName === 'TABLE' ? w : w.querySelector('table, svg');
      const cols = t && t.tagName === 'TABLE' && t.rows[0] ? t.rows[0].cells.length : 0;
      const bloque = w.classList.contains('rp-block');
      const ancho = bloque ? !w.querySelector('.rp-tw, .table-wrap') && w.scrollWidth > w.clientWidth + 2 : (cols >= 7) || (t && t.scrollWidth > w.clientWidth + 2) || w.scrollWidth > w.clientWidth + 2;
      if (!ancho) return;
      w.classList.add('rp-ancho');
      const prev = w.previousElementSibling; if (prev && prev.classList.contains('rp-nota') && !prev.classList.contains('rp-vis')) prev.classList.add('rp-nota-arriba');
      // Si el bloque ancho abre la sección, la imagen del margen dejaría un hueco: se retira
      for (let x = w.previousElementSibling; x && x.classList.contains('rp-nota'); x = x.previousElementSibling) if (x.classList.contains('rp-vis')) x.classList.add('rp-vis-fuera');
    });
    I.sinHuecos(root);
  };

  /* La imagen del margen es decoración: nunca empuja la columna principal. Hay hueco si, con la imagen, algo del texto
     principal (o el final de la sección) baja respecto a sin ella: un bloque ancho que tiene que dejarla atrás, un
     contenedor que no se parte y la abraza (al preparar el PDF) o una sección más corta que la imagen. Primero se saca
     del contenedor; si aun así empuja, se retira. Solo con la imagen al margen (en pantallas estrechas va apilada). */
  I.sinHuecos = (root) => {
    root.querySelectorAll('.rp-col .rp-vis:not(.rp-vis-fuera)').forEach((v) => {
      const col = v.closest('.rp-col'), view = v.ownerDocument.defaultView;
      if (!col || !view || view.getComputedStyle(v).float === 'none' || !v.offsetHeight) return;
      const marca = () => Array.from(col.querySelectorAll(':scope > *, :scope > .rp-keep > *')).filter((x) => !x.classList.contains('rp-nota') && !x.classList.contains('rp-keep')).map((x) => Math.round(x.getBoundingClientRect().top)).concat(Math.round(col.getBoundingClientRect().height)).join(',');
      const empuja = () => { const con = marca(); v.style.display = 'none'; const sin = marca(); v.style.display = ''; return con !== sin; };
      if (!empuja()) return;
      const k = v.parentElement; if (k.classList.contains('rp-keep')) { k.after(v); if (!empuja()) return; }
      v.classList.add('rp-vis-fuera');
    });
  };

  /* Convierte un bloque de la aplicación en contenido de informe: valores en lugar de campos, sin botones */
  I.fromDom = (node) => {
    const c = node.cloneNode(true);
    c.querySelectorAll('button, .btn, .icon-btn, input[type="file"], textarea[data-paste], [data-msg], .seg, .tabs, .hint, label.btn, .dsug, .ogedit, #ogEdit, .rj, .rj-host, datalist, .kpis, .eyebrow, .lede').forEach((x) => x.remove());
    c.querySelectorAll('select').forEach((s) => { const t = document.createElement('span'); t.textContent = s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : ''; s.replaceWith(t); });
    c.querySelectorAll('input').forEach((i) => { const t = document.createElement('span'); t.textContent = i.type === 'checkbox' ? (i.checked ? 'Sí' : 'No') : i.type === 'range' ? '' : i.value; if (i.type === 'range') i.remove(); else i.replaceWith(t); });
    c.querySelectorAll('textarea').forEach((i) => { const t = document.createElement('p'); t.textContent = i.value; i.replaceWith(t); });
    c.querySelectorAll('table').forEach((t) => { t.classList.add('rp-table'); const w = document.createElement('div'); w.className = 'rp-tw'; t.parentNode.insertBefore(w, t); w.appendChild(t); });
    c.querySelectorAll('[style*="cursor"]').forEach((x) => { x.style.cursor = ''; });
    c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
    // Fuera las instrucciones de uso de la pantalla («Toca…», «Pulsa…»): en papel no tienen sentido
    c.querySelectorAll('p, small, span').forEach((x) => { if (!x.children.length && /^(Toca|Toque|Pulsa|Pulse|Pasa (el ratón|por encima)|Pase (el ratón|por encima)|Arrastra|Arrastre|Elige|Elija|Escribe|Escriba|Di, por ejemplo|Diga, por ejemplo)/.test(x.textContent.trim())) x.remove(); });
    return c.innerHTML;
  };

  /* ---------- PDF con texto: impresión del navegador ----------
     El documento se copia a un marco oculto con css/print.css y se imprime con el navegador («Guardar como PDF»).
     Así el PDF lleva texto real (se puede seleccionar, buscar y copiar), los gráficos siguen siendo vectoriales y pesa
     poco. Antes se pintaba cada página como una imagen (html2pdf): texto no seleccionable, tablas anchas cortadas y
     libros de decenas de megas. La página la pone el CSS: A4, márgenes, membrete en cada hoja (logotipo y nombre de la
     firma o Atalaya 360°, con el título) y pie (marca, fecha, «Documento confidencial», «Elaborado con Atalaya 360°» y
     número de página). Los informes paginados (cada .pp-page es ya una hoja A4 con su cabecera) se imprimen a sangre.
     Antes de imprimir se ajustan las tablas anchas a la página (letra menor o, si no basta, en dos bloques de columnas)
     y se aligeran las imágenes grandes. */
  const slug = (t) => String(t || 'informe').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 70);
  const MM = 96 / 25.4, ANCHO = Math.floor((210 - 2 * 12) * MM); // ancho útil de la hoja A4 con 12 mm de margen (px)
  const cssTxt = (t) => '"' + String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ') + '"';
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  // Imagen a un tamaño razonable: el logotipo, a 4 veces su alto en el membrete; las demás, como mucho 1600 px de lado
  const cargarImg = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im.naturalWidth ? im : null); im.onerror = () => ok(null); im.src = src; });
  const reducir = async (src, maxW, maxH, peso) => {
    const im = await cargarImg(src); if (!im) return { src, w: 0, h: 0 };
    const w0 = im.naturalWidth, h0 = im.naturalHeight, k = Math.min(1, maxW / w0, maxH / h0);
    if (k >= 1 && src.length < (peso || 2e5)) return { src, w: w0, h: h0 };
    const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    try {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.drawImage(im, 0, 0, w, h);
      const png = /^data:image\/png/.test(src) && g.getImageData(0, 0, w, h).data.some((v, i) => i % 4 === 3 && v < 250); // con transparencias se queda en PNG
      const out = cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.86);
      return out.length < src.length ? { src: out, w, h } : { src, w: w0, h: h0 };
    } catch (e) { return { src, w: w0, h: h0 }; }
  };
  // La hoja: A4, márgenes, membrete y pie con la marca de la firma (todo como texto del PDF)
  const hojaCss = (titulo, logo) => {
    const F = A.firma(), c = F.color || '#55610f', elab = I.elaborado();
    const marca = (F.propia ? F.nombre : AT).toUpperCase().slice(0, 50);
    const img = logo && logo.h ? `image-set(url(${cssTxt(logo.src)}) ${Math.max(1, logo.h / 26).toFixed(2)}x) "  " ` : '';
    const fuera = '@top-left { content: none; } @top-right { content: none; } @bottom-left { content: none; } @bottom-right { content: none; }';
    return `@page { size: A4; margin: 17mm 12mm 15mm;
  @top-left { content: ${img}${cssTxt(marca)}; font: 700 8pt Archivo, 'Libre Franklin', Arial, sans-serif; letter-spacing: 0.06em; color: ${c}; vertical-align: middle; }
  @top-right { content: ${cssTxt(String(titulo).slice(0, 90))}; font: 400 7.5pt 'Libre Franklin', Arial, sans-serif; color: #5d626c; vertical-align: middle; text-align: right; }
  @bottom-left { content: ${cssTxt(F.nombre + ' · ' + I.fecha() + ' · Documento confidencial' + (elab ? ' · ' + elab : ''))}; font: 400 7pt 'Libre Franklin', Arial, sans-serif; color: #6e7480; border-top: 0.3mm solid ${c}; vertical-align: top; padding-top: 2mm; }
  @bottom-right { content: counter(page) " / " counter(pages); font: 600 7pt 'IBM Plex Mono', monospace; color: #6e7480; border-top: 0.3mm solid ${c}; vertical-align: top; padding-top: 2mm; text-align: right; }
}
@page :first { @top-left { content: none; } @top-right { content: none; } }
@page pp { margin: 0; ${fuera} }`;
  };
  /* Tablas que no caben en el ancho de la hoja: primero letra menor y celdas que se envuelven; si aun así no caben,
     se parten en dos (o más) bloques de columnas que repiten la primera. Las tablas cortas no se parten entre hojas. */
  const ajustarTablas = (doc, ancho) => {
    doc.querySelectorAll('table').forEach((t) => {
      if (t.closest('.pp-page')) return;
      const filas = t.rows.length;
      if (filas <= 16) t.classList.add('pdf-keep');
      t.querySelectorAll('td').forEach((c) => { const x = c.textContent.trim(); if (x.length <= 14 && !c.querySelector('.rp-pill, .pill')) c.classList.add('pdf-nw'); });
      const caja0 = t.closest('.rp-tw, .table-wrap') || t.parentElement, lim = Math.min(ancho, (caja0 && caja0.clientWidth) || ancho);
      const cabe = () => t.offsetWidth <= lim + 1;
      if (cabe()) return;
      t.classList.add('pdf-estrecha');
      // Si aún no cabe, las cifras cortas también pueden partirse
      if (!cabe()) t.querySelectorAll('td.pdf-nw').forEach((c) => c.classList.remove('pdf-nw'));
      if (cabe() || t.querySelector('[colspan], [rowspan]')) return;
      const n = t.rows[0] ? t.rows[0].cells.length : 0; if (n < 4) return;
      const anchos = Array.from(t.rows[0].cells).map((c) => c.getBoundingClientRect().width), primera = anchos[0];
      // Grupos de columnas que caben junto a la primera
      const grupos = []; let g = [], w = primera;
      for (let i = 1; i < n; i++) { if (g.length && w + anchos[i] > lim * 0.97) { grupos.push(g); g = []; w = primera; } g.push(i); w += anchos[i]; }
      if (g.length) grupos.push(g);
      if (grupos.length < 2) return;
      const caja = t.parentElement && /\b(rp-tw|table-wrap)\b/.test(t.parentElement.className) ? t.parentElement : t;
      const frag = document.createDocumentFragment();
      grupos.forEach((cols, k) => {
        const c = t.cloneNode(true); c.classList.add('pdf-keep');
        Array.from(c.rows).forEach((r) => { for (let i = r.cells.length - 1; i > 0; i--) if (cols.indexOf(i) < 0) r.deleteCell(i); });
        const env = caja === t ? document.createElement('div') : caja.cloneNode(false); env.classList.add('pdf-bloque'); env.removeAttribute('id');
        const tt = document.createElement('span'); tt.className = 'pdf-bloque-t'; tt.textContent = `Columnas ${k + 1} de ${grupos.length}`;
        env.appendChild(tt); env.appendChild(c); frag.appendChild(env);
      });
      caja.replaceWith(frag);
    });
  };
  /* El título de una sección no se queda solo al pie de la hoja: se agrupa con sus notas y con el primer bloque que
     le sigue (si ese bloque cabe en media hoja) en un contenedor que no se parte. */
  const cabeceras = (root) => {
    root.querySelectorAll('.rp-col').forEach((col) => {
      if (col.querySelector(':scope > .rp-keep')) return;
      Array.from(col.children).filter((h, i) => (h.tagName === 'H2' && i === 0) || h.tagName === 'H3' || h.tagName === 'H4').forEach((h) => {
        if (h.parentElement !== col) return; // ya va con el título de la sección
        const grupo = [h]; let x = h.nextElementSibling;
        while (x && x.classList.contains('rp-nota')) { grupo.push(x); x = x.nextElementSibling; }
        // El título de la sección arrastra el primer apartado (su rótulo y su primer bloque): así nunca queda solo al pie
        if (h.tagName === 'H2' && x && /^H[34]$/.test(x.tagName)) { grupo.push(x); x = x.nextElementSibling; while (x && x.classList.contains('rp-nota')) { grupo.push(x); x = x.nextElementSibling; } }
        if (x && !/^H[234]$/.test(x.tagName) && x.offsetHeight < 520) grupo.push(x);
        if (grupo.length < 2) return;
        const k = root.ownerDocument.createElement('div'); k.className = 'rp-keep';
        col.insertBefore(k, h); grupo.forEach((y) => k.appendChild(y));
      });
      // Las notas al margen van en la misma hoja que el gráfico o la tabla que explican
      Array.from(col.children).forEach((n) => {
        if (!n.isConnected || n.parentElement !== col || !n.classList.contains('rp-nota') || n.classList.contains('rp-vis') || (n.previousElementSibling && n.previousElementSibling.classList.contains('rp-nota'))) return;
        const grupo = [n]; let x = n.nextElementSibling;
        while (x && x.classList.contains('rp-nota')) { grupo.push(x); x = x.nextElementSibling; }
        if (!x || /^H[234]$/.test(x.tagName) || x.offsetHeight > 520) return;
        grupo.push(x);
        const k = root.ownerDocument.createElement('div'); k.className = 'rp-keep';
        col.insertBefore(k, n); grupo.forEach((y) => k.appendChild(y));
      });
    });
    I.sinHuecos(root);
  };
  /* Prepara el documento para imprimir y devuelve el marco con él cargado. o: { titulo, paginado } */
  I.pdfMarco = async (paper, o) => {
    o = o || {};
    const doc = paper.cloneNode(true); doc.removeAttribute('id'); doc.style.zoom = ''; doc.style.width = ''; doc.classList.remove('pdf-doc');
    const pag = !!(o.paginado || doc.querySelector(':scope > .pp-page'));
    if (pag) doc.classList.add('pp-doc');
    doc.querySelectorAll('button, .ci-add, .ci-del, script, .no-print').forEach((x) => x.remove()); // .no-print: notas de trabajo que se ven en pantalla y no van al documento
    // Los campos del cuaderno se imprimen como texto
    doc.querySelectorAll('textarea, input, select').forEach((i) => { const v = i.tagName === 'SELECT' ? (i.options[i.selectedIndex] || {}).text : i.type === 'checkbox' ? (i.checked ? '☑' : '☐') : i.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(i.value) ? new Date(i.value + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : i.value; const t = document.createElement(i.tagName === 'TEXTAREA' ? 'div' : 'span'); t.className = 'pdf-campo'; t.textContent = v || (i.type === 'checkbox' ? '' : '—'); i.replaceWith(t); });
    // Imágenes: el logotipo de la firma, una sola vez y a su tamaño; las fotos grandes, aligeradas
    const F = A.firma(), memo = {};
    const logo = F.logo ? await reducir(F.logo, 600, 104, 6e4) : null;
    if (logo) memo[F.logo] = logo.src;
    for (const im of Array.from(doc.querySelectorAll('img[src^="data:"]'))) {
      const s = im.getAttribute('src');
      if (!(s in memo)) memo[s] = s.length > 2e5 ? (await reducir(s, 1600, 1600)).src : s;
      if (memo[s] !== s) im.setAttribute('src', memo[s]);
    }
    // Hojas de estilo de la página, la de impresión y la de la hoja
    const estilos = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((x) => x.outerHTML).join('\n');
    const titulo = o.titulo || 'Informe';
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><base href="${esc(document.baseURI)}"><title>${esc(slug(titulo))}</title>
${estilos}
<link rel="stylesheet" href="css/print.css">
<style id="pdfHoja">${hojaCss(titulo, logo)}</style></head><body class="pdf-print"><div class="pdf-sheet"></div></body></html>`;
    document.querySelectorAll('iframe.pdf-marco').forEach((x) => x.remove());
    const fr = document.createElement('iframe'); fr.className = 'pdf-marco'; fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = `position:fixed;left:-20000px;top:0;width:${pag ? 794 : ANCHO}px;height:1200px;border:0;opacity:0;pointer-events:none`;
    document.body.appendChild(fr);
    await new Promise((ok) => { fr.onload = ok; fr.srcdoc = html; });
    const d = fr.contentDocument;
    d.querySelector('.pdf-sheet').appendChild(d.importNode(doc, true));
    // Hojas de estilo, fuentes e imágenes cargadas antes de medir y de imprimir
    await Promise.all(Array.from(d.querySelectorAll('link[rel="stylesheet"]')).map((l) => (l.sheet ? 0 : new Promise((ok) => { l.onload = l.onerror = ok; setTimeout(ok, 4000); }))));
    if (d.fonts && d.fonts.ready) await Promise.race([d.fonts.ready, esperar(4000)]);
    await Promise.all(Array.from(d.images).map((im) => (im.complete ? 0 : new Promise((ok) => { im.onload = im.onerror = ok; setTimeout(ok, 4000); }))));
    if (!pag) { I.maquetar(d.querySelector('.paper')); ajustarTablas(d.querySelector('.paper'), ANCHO); cabeceras(d.querySelector('.paper')); }
    return fr;
  };
  // Aviso con los pasos para guardar el PDF, encima del documento en pantalla
  const aviso = (paper) => {
    const ov = paper && paper.closest('.report-overlay'); if (!ov) return;
    let h = ov.querySelector('.rp-hint.pdf-aviso');
    if (!h) { h = document.createElement('p'); h.className = 'rp-hint pdf-aviso'; h.setAttribute('role', 'status'); paper.parentNode.insertBefore(h, paper); }
    h.innerHTML = 'Se abre la ventana de impresión del navegador. En <b>Destino</b> elija <b>Guardar como PDF</b> y pulse <b>Guardar</b>. Si arriba o abajo aparecen la dirección web o la fecha del navegador, desmarque <b>Encabezados y pies de página</b> en «Más ajustes». El PDF lleva el texto real: se puede buscar y copiar.';
  };
  I.pdf = async (paper, o) => {
    o = o || {};
    const b = o.boton, t0 = b && b.textContent;
    if (b) { b.disabled = true; b.textContent = 'Preparando PDF…'; }
    try {
      aviso(paper);
      const fr = await I.pdfMarco(paper, o), w = fr.contentWindow;
      if (b) { b.disabled = false; b.textContent = t0; }
      const quitar = () => setTimeout(() => fr.remove(), 1000);
      w.addEventListener('afterprint', quitar);
      w.focus(); w.print();
    } catch (e) {
      alert('No se pudo preparar el PDF: ' + ((e && e.message) || 'error') + '. Puede usar «Imprimir» del navegador con el informe abierto.');
    } finally {
      if (b) { b.disabled = false; b.textContent = t0; }
    }
  };

  /* Abre el informe en pantalla con barra de acciones */
  I.open = (o) => {
    let ov = document.getElementById('report');
    if (!ov) { ov = document.createElement('div'); ov.id = 'report'; ov.className = 'report-overlay'; document.body.appendChild(ov); }
    ov.hidden = false; document.body.style.overflow = 'hidden';
    ov.innerHTML = `<div class="report-bar"><b class="rb-title">${esc(o.barra || o.titulo || 'Informe')}</b>${o.barExtra || ''}<span class="spacer"></span>
      <button class="btn" id="rpPdf">Descargar PDF</button>${inFrame ? '' : '<button class="btn ghost" id="rpPrint">Imprimir</button>'}<button class="btn ghost" id="rpCopy">Copiar texto</button><button class="btn solid" id="rpClose">Cerrar</button></div>
      <article class="paper rp" id="paper">${o.html}</article>
      `;
    I.estilo();
    const close = () => { ov.hidden = true; document.body.style.overflow = ''; if (o.onClose) o.onClose(); };
    ov.querySelector('#rpClose').onclick = close;
    ov.onkeydown = (e) => { if (e.key === 'Escape') close(); };
    const pr = ov.querySelector('#rpPrint'); if (pr) pr.onclick = (e) => I.pdf(ov.querySelector('#paper'), { titulo: o.barra || o.titulo, boton: e.currentTarget, paginado: o.paginado });
    ov.querySelector('#rpPdf').onclick = (e) => I.pdf(ov.querySelector('#paper'), { titulo: o.barra || o.titulo, boton: e.currentTarget, paginado: o.paginado });
    ov.querySelector('#rpCopy').onclick = (e) => {
      const sinNotas = (p) => { p.classList.add('rp-copiando'); setTimeout(() => p.classList.remove('rp-copiando'), 0); const ocultas = Array.from(p.querySelectorAll('.no-print, .rp-vis, .rp-banda > .rp-visual, .rp-fig svg, .rp-hb-ax, .rp-donut-c')).map((x) => [x, x.style.display]); ocultas.forEach(([x]) => { x.style.display = 'none'; }); const tx = p.innerText; ocultas.forEach(([x, d]) => { x.style.display = d; }); return tx; };
      const t = o.texto || sinNotas(ov.querySelector('#paper'));
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { e.target.textContent = 'Copiado'; }, () => { e.target.textContent = 'No se pudo copiar'; });
    };
    if (o.after) o.after(ov.querySelector('#paper'));
    if (!o.paginado) I.maquetar(ov.querySelector('#paper'));
    ov.scrollTop = 0;
    return ov;
  };
})();
