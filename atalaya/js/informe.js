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
     viaja al servidor), dentro de la ficha de la empresa principal (campo «firma»). La edita «Ficha de tu firma» en la
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
    c.querySelectorAll('p, small, span').forEach((x) => { if (!x.children.length && /^(Toca|Pulsa|Pasa (el ratón|por encima)|Arrastra|Elige|Escribe|Di, por ejemplo)/.test(x.textContent.trim())) x.remove(); });
    return c.innerHTML;
  };

  /* ---------- Descarga en PDF con el mismo estilo ----------
     Se copia el documento a un lienzo fuera de pantalla con ancho de A4 y se pasa a PDF (html2pdf).
     Cada página lleva el membrete (la firma del consultor o Atalaya 360°), el título y el número de página.
     Los informes paginados (cada .pp-page es ya una hoja A4 con su cabecera) se pasan hoja a hoja. */
  const H2P = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  let cargando = null;
  const cargar = () => cargando || (cargando = new Promise((ok, ko) => { if (window.html2pdf) return ok(); const sc = document.createElement('script'); sc.src = H2P; sc.onload = () => ok(); sc.onerror = () => { cargando = null; ko(new Error('No se pudo cargar el generador de PDF')); }; document.head.appendChild(sc); }));
  const slug = (t) => String(t || 'informe').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 70);
  /* Documentos largos (el libro corporativo): el navegador no puede pintar más de unos 16.000 px de alto en un solo
     lienzo, así que se parten en trozos que empiezan en página nueva (secciones, capítulos, hojas) o, si un
     capítulo es muy largo, por sus partes. Cada trozo se pinta aparte y se añade al mismo PDF. */
  const MAXT = 9000;
  const partir = (doc) => {
    const out = []; let cur = null, h = 0;
    const nuevo = () => { cur = document.createElement('div'); cur.className = doc.className + ' pdf-trozo'; doc.parentNode.appendChild(cur); out.push(cur); h = 0; };
    // Un rótulo suelto (menos de 120 px) se queda con lo que le sigue, aunque empiece página
    const meter = (el, alto, corte) => { if (!cur || (h > 0 && ((corte && h > 120) || h + alto > MAXT))) nuevo(); cur.appendChild(el); h += alto; };
    const CORTE = '.lb-secp, .lb-cap, .lb-pp';
    const repartir = (el) => {
      const alto = el.offsetHeight, corte = el.matches(CORTE);
      if (alto <= MAXT || el.children.length < 2) { meter(el, alto, corte); return; }
      // Se reparte por sus partes, cada una dentro de una copia vacía de su envoltorio (conserva las clases)
      Array.from(el.children).map((x) => [x, x.offsetHeight]).forEach(([x, ah], i) => {
        const env = el.cloneNode(false); env.removeAttribute('id'); env.appendChild(x);
        if (ah > MAXT && x.children.length > 1) { const tmp = document.createElement('div'); tmp.className = 'pdf-tmp'; doc.appendChild(tmp); tmp.appendChild(env); repartir(env); tmp.remove(); return; }
        meter(env, ah, (i === 0 && corte) || x.matches(CORTE));
      });
    };
    Array.from(doc.children).map((x) => x).forEach(repartir);
    doc.remove();
    return out;
  };
  I.pdf = async (paper, o) => {
    o = o || {};
    const b = o.boton, t0 = b && b.textContent;
    if (b) { b.disabled = true; b.textContent = 'Preparando PDF…'; }
    const host = document.createElement('div'); host.className = 'pdf-host';
    const doc = paper.cloneNode(true); doc.removeAttribute('id'); doc.classList.add('pdf-doc'); doc.style.zoom = '';
    if (o.paginado || doc.querySelector(':scope > .pp-page')) doc.classList.add('pdf-pag');
    doc.querySelectorAll('button, .ci-add, .ci-del').forEach((x) => x.remove());
    // Los campos del cuaderno se imprimen como texto
    doc.querySelectorAll('textarea, input, select').forEach((i) => { const v = i.tagName === 'SELECT' ? (i.options[i.selectedIndex] || {}).text : i.type === 'checkbox' ? (i.checked ? '☑' : '☐') : i.value; const t = document.createElement(i.tagName === 'TEXTAREA' ? 'div' : 'span'); t.className = 'pdf-campo'; t.textContent = v || (i.type === 'checkbox' ? '' : '—'); i.replaceWith(t); });
    host.appendChild(doc); document.body.appendChild(host);
    try {
      await cargar();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const pag = doc.classList.contains('pdf-pag');
      const titulo = o.titulo || 'Informe';
      const opt = {
        margin: pag ? 0 : [17, 0, 15, 0], filename: slug(titulo) + '.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#f5f3ee', scrollX: 0, scrollY: 0 },
        jsPDF: pag ? { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] } : { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: pag ? { mode: [] } : { mode: ['css', 'legacy'], avoid: ['tr', 'h2', 'h3', '.rp-kpi', '.rp-callout', '.rp-summary', '.rp-bar', 'svg', '.pdf-keep', 'li'] }
      };
      let w;
      const trozos = !pag && doc.offsetHeight > MAXT * 1.4 ? partir(doc) : null;
      if (trozos && trozos.length > 1) {
        if (b) b.textContent = `Preparando PDF… (0 de ${trozos.length})`;
        w = window.html2pdf().set(opt).from(trozos[0]).toPdf();
        trozos.slice(1).forEach((el, i) => { w = w.get('pdf').then((pd) => { pd.addPage(); if (b) b.textContent = `Preparando PDF… (${i + 1} de ${trozos.length})`; }).from(el).toContainer().toCanvas().toPdf(); });
      } else w = window.html2pdf().set(opt).from(doc).toPdf();
      const pdf = await w.get('pdf');
      const n = pdf.internal.getNumberOfPages();
      // Marca de la cabecera y del pie: la firma (con su logotipo) o Atalaya 360°
      const F = A.firma(), marcaPdf = F.propia ? F.nombre.toUpperCase() : 'ATALAYA 360°', elab = I.elaborado();
      const lg = !pag && F.logo ? await new Promise((ok) => { const im = new Image(); im.onload = () => ok(im.naturalWidth && im.naturalHeight ? { w: Math.min(28, (7 * im.naturalWidth) / im.naturalHeight), h: 7 } : null); im.onerror = () => ok(null); im.src = F.logo; }) : null;
      for (let i = 1; i <= n; i++) {
        pdf.setPage(i);
        if (!pag) { pdf.setFillColor(245, 243, 238); pdf.rect(0, 0, 210, 17, 'F'); pdf.rect(0, 282, 210, 15, 'F'); }
        if (!pag && i > 1) {
          pdf.setFillColor(5, 6, 10); pdf.rect(0, 0, 210, 11, 'F');
          let x0 = 10;
          if (lg) { try { pdf.setFillColor(255, 255, 255); pdf.rect(9, 1.5, lg.w + 2, lg.h + 1, 'F'); pdf.addImage(F.logo, /^data:image\/png/.test(F.logo) ? 'PNG' : /webp/.test(F.logo) ? 'WEBP' : 'JPEG', 10, 2, lg.w, lg.h); x0 = 14 + lg.w; } catch (x) { x0 = 10; } }
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(201, 242, 77); pdf.text(marcaPdf.slice(0, 50), x0, 7);
          pdf.setFont('helvetica', 'normal'); pdf.setTextColor(200, 196, 182); pdf.text(String(titulo).slice(0, 80), 200, 7, { align: 'right' });
        }
        if (!pag) {
          pdf.setDrawColor(110, 125, 20); pdf.setLineWidth(0.4); pdf.line(10, 284, 200, 284);
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(110, 116, 128);
          pdf.text(F.nombre + ' · ' + I.fecha() + ' · Documento confidencial' + (elab ? ' · ' + elab : ''), 10, 289);
          pdf.text(`${i} / ${n}`, 200, 289, { align: 'right' });
        }
      }
      try { await w.save(); } catch (x) { window.open(pdf.output('bloburl'), '_blank'); }
    } catch (e) {
      alert((e && e.message) || 'No se pudo generar el PDF.');
    } finally {
      host.remove();
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
    const pr = ov.querySelector('#rpPrint'); if (pr) pr.onclick = () => window.print();
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
