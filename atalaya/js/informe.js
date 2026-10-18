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
      contacto: [f.email, f.tel].filter(Boolean).join(' · '), descripcion: f.descripcion || '', logo: /^data:image\/(png|jpe?g|webp);base64,/.test(f.logo || '') ? f.logo : '', color: I.colorOk(f.color) ? f.color : '', elaborado: f.elaborado !== false };
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
    const css = `.paper.rp .rp-kicker,.paper.rp .lb-secp span{color:${c}}.paper.rp h2 .rp-n{background:${c}}.paper.rp h2,.paper.rp .rp-foot{border-top-color:${c}}.pp-f{background:${c}!important}.pp-f b{color:#fff!important}.pp-band{border-left-color:${c}!important}`;
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
    return `<div class="rp-tw"><table class="rp-table"><thead><tr>${heads.map((h, i) => `<th${opts.num && opts.num.includes(i) ? ' class="rp-num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length}" class="rp-empty">Sin datos.</td></tr>`}</tbody></table></div>`;
  };
  I.risks = (R) => (R && R.length ? I.table(['Riesgo', 'Prob.', 'Impacto', 'Nivel', 'Mitigación'], R.map((r) => [r.nombre, r.prob + '/5', r.impacto + '/5', { h: I.pill(r.estado, String(r.nivel)) }, r.mitigacion || '']), { num: [1, 2] }) : '<p class="rp-muted">Sin riesgos relevantes con los datos actuales.</p>');
  I.findings = (Fi, fmt) => (Fi && Fi.length ? I.table(['Hallazgo', 'Acción recomendada', 'Impacto anual', 'Plazo'], Fi.map((f) => [f.hallazgo, f.accion, fmt ? fmt(f.impactoEUR || 0) : f.impactoEUR, (f.plazo || 90) + ' días']), { num: [2, 3] }) : '<p class="rp-muted">Sin hallazgos con impacto económico con los datos actuales.</p>');
  I.callout = (html, tipo) => `<div class="rp-callout${tipo ? ' rp-c-' + tipo : ''}">${html}</div>`;
  I.foot = (txt) => `<footer class="rp-foot"><span>${esc(I.marcaTxt())} · Documento generado el ${esc(I.fecha())}</span><span>${esc(txt || 'Las cifras son estimaciones a partir de los datos introducidos. La fiscalidad y las decisiones societarias deben validarse con los asesores de la empresa.')}</span>${I.elab()}</footer>`;
  // Coletilla del pie (en su propia línea, más pequeña)
  I.elab = () => (I.elaborado() ? `<span class="rp-elab" style="font-size:0.64rem;letter-spacing:0.04em;opacity:0.75">${esc(I.elaborado())}</span>` : '');

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
      const cabe = () => t.offsetWidth <= ancho + 1;
      if (cabe()) return;
      t.classList.add('pdf-estrecha');
      if (cabe() || t.querySelector('[colspan], [rowspan]')) return;
      const n = t.rows[0] ? t.rows[0].cells.length : 0; if (n < 4) return;
      const anchos = Array.from(t.rows[0].cells).map((c) => c.getBoundingClientRect().width), primera = anchos[0];
      // Grupos de columnas que caben junto a la primera
      const grupos = []; let g = [], w = primera;
      for (let i = 1; i < n; i++) { if (g.length && w + anchos[i] > ancho * 0.97) { grupos.push(g); g = []; w = primera; } g.push(i); w += anchos[i]; }
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
  /* Prepara el documento para imprimir y devuelve el marco con él cargado. o: { titulo, paginado } */
  I.pdfMarco = async (paper, o) => {
    o = o || {};
    const doc = paper.cloneNode(true); doc.removeAttribute('id'); doc.style.zoom = ''; doc.style.width = ''; doc.classList.remove('pdf-doc');
    const pag = !!(o.paginado || doc.querySelector(':scope > .pp-page'));
    if (pag) doc.classList.add('pp-doc');
    doc.querySelectorAll('button, .ci-add, .ci-del, script').forEach((x) => x.remove());
    // Los campos del cuaderno se imprimen como texto
    doc.querySelectorAll('textarea, input, select').forEach((i) => { const v = i.tagName === 'SELECT' ? (i.options[i.selectedIndex] || {}).text : i.type === 'checkbox' ? (i.checked ? '☑' : '☐') : i.value; const t = document.createElement(i.tagName === 'TEXTAREA' ? 'div' : 'span'); t.className = 'pdf-campo'; t.textContent = v || (i.type === 'checkbox' ? '' : '—'); i.replaceWith(t); });
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
    if (!pag) ajustarTablas(d.querySelector('.paper'), ANCHO);
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
      const t = o.texto || ov.querySelector('#paper').innerText;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { e.target.textContent = 'Copiado'; }, () => { e.target.textContent = 'No se pudo copiar'; });
    };
    if (o.after) o.after(ov.querySelector('#paper'));
    ov.scrollTop = 0;
    return ov;
  };
})();
