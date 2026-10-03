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

  /* Membrete corporativo: Business Avance y la plataforma Atalaya 360° */
  I.membrete = () => `<span class="rp-mb"><b class="rp-ba">Business<i>Avance</i></b><em class="rp-sep"></em><b class="rp-at">Atalaya <i>360°</i></b></span>`;
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
  I.foot = (txt) => `<footer class="rp-foot"><span>Business Avance · Atalaya 360° · Documento generado el ${esc(I.fecha())}</span><span>${esc(txt || 'Las cifras son estimaciones a partir de los datos introducidos. La fiscalidad y las decisiones societarias deben validarse con los asesores de la empresa.')}</span></footer>`;

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
     Cada página lleva el membrete (Business Avance · Atalaya 360°), el título y el número de página.
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
      for (let i = 1; i <= n; i++) {
        pdf.setPage(i);
        if (!pag) { pdf.setFillColor(245, 243, 238); pdf.rect(0, 0, 210, 17, 'F'); pdf.rect(0, 282, 210, 15, 'F'); }
        if (!pag && i > 1) {
          pdf.setFillColor(5, 6, 10); pdf.rect(0, 0, 210, 11, 'F');
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(201, 242, 77); pdf.text('BUSINESS AVANCE  ·  ATALAYA 360°', 10, 7);
          pdf.setFont('helvetica', 'normal'); pdf.setTextColor(200, 196, 182); pdf.text(String(titulo).slice(0, 80), 200, 7, { align: 'right' });
        }
        if (!pag) {
          pdf.setDrawColor(110, 125, 20); pdf.setLineWidth(0.4); pdf.line(10, 284, 200, 284);
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(110, 116, 128);
          pdf.text('Business Avance · Atalaya 360° · ' + I.fecha() + ' · Documento confidencial', 10, 289);
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
