/* Atalaya 360° · Libro corporativo
   Reúne los informes de todos los mundos en un libro de la empresa: portada, introducción propia, índice
   interactivo por secciones y capítulos, lector, y descarga en PDF del libro completo o de una sección.
   Las secciones se pueden renombrar, crear, ordenar y vaciar; cada capítulo se incluye o no, se mueve de
   sección y se ordena. «Recoger todos los informes» recorre los mundos del plan y genera sus informes. */
(function () {
  const A = window.Atalaya, L = A.libro;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const P = () => A.platform;
  const MUNDO_N = { intervencion: 'Auditoría integral', simulador: 'Simulador de inversión', estrategia: 'Sistema estratégico', personas: 'Personas y equipos', mesa: 'Mesa de trabajo' };
  const URL = { intervencion: 'intervencion.html', simulador: 'app.html', estrategia: 'estrategia.html', personas: 'personas.html', mesa: 'mesa.html' };
  const fCorta = (s) => (s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  let lib = null, sel = null, empresa = 'Mi empresa';
  const guardar = (() => { let t; return () => { clearTimeout(t); t = setTimeout(async () => { try { await L.guardar(lib); } catch (e) { toast(e.message); } }, 400); }; })();
  const toast = (t) => { $$('.ms-toast').forEach((x) => x.remove()); const d = document.createElement('div'); d.className = 'alert ok ms-toast lb-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 6000); };
  const capsDe = (sid) => lib.caps.filter((c) => c.sec === sid);
  const incluidos = () => lib.secciones.flatMap((s) => capsDe(s.id).filter((c) => c.incl));
  const mundosPlan = () => ['intervencion', 'simulador', 'estrategia', 'personas', 'mesa'].filter((k) => !P() || !P().puede || (k === 'estrategia' ? P().puede('estrategia') : k === 'personas' ? P().puede('personas') : k === 'intervencion' ? P().puede('intervencion') : true));
  const mover = (arr, x, d) => { const i = arr.indexOf(x), j = i + d; if (i < 0 || j < 0 || j >= arr.length) return; arr.splice(i, 1); arr.splice(j, 0, x); };
  const moverCap = (c, d) => { // dentro de su sección
    const hermanos = capsDe(c.sec), i = hermanos.indexOf(c), otro = hermanos[i + d]; if (!otro) return;
    const a = lib.caps.indexOf(c), b = lib.caps.indexOf(otro); lib.caps[a] = otro; lib.caps[b] = c;
  };
  const numeracion = () => { const m = {}; lib.secciones.forEach((s, i) => { let j = 0; capsDe(s.id).forEach((c) => { if (c.incl) m[c.id] = `${i + 1}.${++j}`; }); }); return m; };

  /* ---------- Componer el libro (o una sección) ---------- */
  // Las hojas de los informes paginados se encajan en la página del libro
  const encajar = (html, cls) => {
    if (!/pp-doc/.test(cls || '')) return html;
    const t = document.createElement('template'); t.innerHTML = html;
    t.content.querySelectorAll('.pp-page').forEach((pg) => { const w = document.createElement('div'); w.className = 'lb-pp'; pg.replaceWith(w); w.appendChild(pg); });
    const d = document.createElement('div'); d.appendChild(t.content); return d.innerHTML;
  };
  const componer = (soloSec) => {
    const I = A.informe; I.reset();
    const secs = lib.secciones.filter((s) => (!soloSec || s.id === soloSec) && capsDe(s.id).some((c) => c.incl));
    const num = numeracion(), n = secs.reduce((a, s) => a + capsDe(s.id).filter((c) => c.incl).length, 0);
    const titulo = soloSec ? (lib.secciones.find((s) => s.id === soloSec) || {}).t : (lib.titulo || 'Libro corporativo');
    let h = I.cover({ tipo: 'Libro corporativo', kicker: soloSec ? 'Libro corporativo · sección' : 'Libro corporativo', titulo, subtitulo: `${n} capítulo${n === 1 ? '' : 's'} en ${secs.length} sección${secs.length === 1 ? '' : 'es'}`, empresa });
    if (!soloSec && (lib.intro || '').trim()) h += `<section class="lb-intro"><h2>Introducción</h2>${lib.intro.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</section>`;
    h += `<section class="lb-indice"><h2>Índice</h2><ol>${secs.map((s) => `<li><b>${esc(s.t)}</b><ol>${capsDe(s.id).filter((c) => c.incl).map((c) => `<li><a href="#lbc-${c.id}"><span>${num[c.id]}</span>${esc(c.t)}</a><em>${esc(MUNDO_N[c.mundo] || '')} · ${fCorta(c.fecha)}</em></li>`).join('')}</ol></li>`).join('')}</ol></section>`;
    secs.forEach((s) => {
      const i = lib.secciones.indexOf(s) + 1;
      h += `<section class="lb-secp"><span>Sección ${i}</span><h2>${esc(s.t)}</h2>${(s.intro || '').trim() ? `<p>${esc(s.intro)}</p>` : ''}<ol>${capsDe(s.id).filter((c) => c.incl).map((c) => `<li>${num[c.id]} · ${esc(c.t)}</li>`).join('')}</ol></section>`;
      capsDe(s.id).filter((c) => c.incl).forEach((c) => { h += `<section class="lb-cap ${esc(c.cls || '')}" id="lbc-${c.id}"><div class="lb-caph"><span>${num[c.id]}</span>${esc(c.t)}</div>${encajar(c.html, c.cls)}</section>`; });
    });
    h += I.foot('Libro corporativo de ' + empresa + ' generado con Atalaya 360°. Cada capítulo es el informe de su mundo en la fecha indicada en el índice.');
    return { h, titulo };
  };
  const verLibro = (soloSec) => {
    if (!incluidos().length) return toast('El libro no tiene capítulos incluidos. Añada informes desde cada mundo o pulse «Recoger todos los informes».');
    const { h, titulo } = componer(soloSec);
    A.informe.open({ titulo: (soloSec ? 'Sección · ' : '') + titulo, barra: (soloSec ? 'Sección · ' + titulo : 'Libro corporativo · ' + empresa), html: h,
      after(paper) { paper.classList.add('lb-doc'); paper.querySelectorAll('.lb-indice a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); const t = paper.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth' }); })); } });
  };

  /* ---------- Pantalla ---------- */
  function pintar() {
    const host = $('#lbPanel'), num = numeracion();
    if (sel && !lib.caps.some((c) => c.id === sel)) sel = null;
    if (!sel) { const f = incluidos()[0] || lib.caps[0]; sel = f ? f.id : null; }
    const c = sel && lib.caps.find((x) => x.id === sel);
    host.innerHTML = `<div class="lb-main">
      <aside class="glass pad stack lb-idx" aria-label="Índice del libro">
        <div class="eyebrow">Su libro</div>
        <label class="small">Título<input class="input" id="lbTit" value="${esc(lib.titulo)}" placeholder="Libro corporativo de ${esc(empresa)}"></label>
        <label class="small">Introducción (sus palabras, va antes del índice)<textarea class="input" id="lbIntro" rows="3" placeholder="Para qué sirve este libro, a quién va dirigido y cómo usarlo.">${esc(lib.intro)}</textarea></label>
        <div class="row"><div class="eyebrow">Índice</div><span class="spacer"></span><button class="btn ghost small" id="lbSecN">Nueva sección</button></div>
        <ol class="lb-secs">${lib.secciones.map((s, i) => { const cs = capsDe(s.id); return `<li class="lb-sec" data-s="${s.id}">
          <div class="lb-sech"><span class="lb-n">${i + 1}</span><input class="input lb-sect" value="${esc(s.t)}" aria-label="Nombre de la sección"><span class="lb-acc"><button class="icon-btn" data-su title="Subir la sección" aria-label="Subir">↑</button><button class="icon-btn" data-sd title="Bajar la sección" aria-label="Bajar">↓</button>${cs.some((x) => x.incl) ? '<button class="icon-btn" data-spdf title="Ver o descargar solo esta sección" aria-label="Solo esta sección">⤓</button>' : ''}${cs.length ? '' : '<button class="icon-btn" data-sx title="Quitar la sección vacía" aria-label="Quitar">×</button>'}</span></div>
          ${cs.length ? `<ol class="lb-caps">${cs.map((x) => `<li class="lb-c ${x.id === sel ? 'on' : ''} ${x.incl ? '' : 'fuera'}" data-c="${x.id}"><input type="checkbox" data-in ${x.incl ? 'checked' : ''} aria-label="Incluir en el libro"><button class="lb-ct" data-ver><span>${num[x.id] || '—'}</span>${esc(x.t)}<small>${esc(MUNDO_N[x.mundo] || '')} · ${fCorta(x.fecha)}</small></button><span class="lb-acc"><button class="icon-btn" data-cu aria-label="Subir">↑</button><button class="icon-btn" data-cd aria-label="Bajar">↓</button></span></li>`).join('')}</ol>` : '<p class="small muted lb-vacia">Sin capítulos. Mueva aquí capítulos de otra sección o añada informes desde los mundos.</p>'}
        </li>`; }).join('')}</ol>
        <p class="small muted" style="margin:0">Marque los capítulos que van al libro. ↑ ↓ ordenan; ⤓ abre solo esa sección para verla o descargarla.</p>
      </aside>
      <section class="lb-read" aria-live="polite">${c ? `<div class="glass pad row lb-rbar"><div><div class="eyebrow">${num[c.id] ? 'Capítulo ' + num[c.id] : 'No incluido en el libro'} · ${esc(MUNDO_N[c.mundo] || '')}</div><h2 class="lb-rt">${esc(c.t)}</h2><small class="muted">Actualizado el ${fCorta(c.fecha)}</small></div><span class="spacer"></span>
          <label class="small">Sección<select class="input" id="lbMover">${lib.secciones.map((s) => `<option value="${s.id}" ${s.id === c.sec ? 'selected' : ''}>${esc(s.t)}</option>`).join('')}</select></label>
          <a class="btn ghost small" href="${URL[c.mundo] || 'portal.html'}">Ir a su mundo</a><button class="btn ghost small" id="lbQuitar">Quitar del libro</button></div>
        <div class="lb-paperwrap"><article class="paper rp ${esc(c.cls || '')} lb-paper">${c.html}</article></div>`
        : `<div class="glass pad stack lb-empty"><div class="eyebrow">El libro está vacío</div><p style="margin:0">Cada informe que abra en el simulador, el sistema estratégico, personas y equipos o la mesa de trabajo tiene el botón <b>Añadir al libro</b>. También puede pulsar <b>Recoger todos los informes</b>: la aplicación recorre los mundos de su plan, genera sus informes y vuelve aquí.</p><div class="row"><button class="btn solid" id="lbRecoger2">Recoger todos los informes</button></div></div>`}</section></div>`;
    // Libro
    $('#lbTit', host).oninput = (e) => { lib.titulo = e.target.value; guardar(); };
    $('#lbIntro', host).oninput = (e) => { lib.intro = e.target.value; guardar(); };
    $('#lbSecN', host).onclick = () => { lib.secciones.push({ id: 's' + Date.now().toString(36), t: 'Nueva sección' }); guardar(); pintar(); };
    const r2 = $('#lbRecoger2', host); if (r2) r2.onclick = recoger;
    // Secciones
    $$('.lb-sec', host).forEach((li) => {
      const s = lib.secciones.find((x) => x.id === li.dataset.s);
      $('.lb-sect', li).oninput = (e) => { s.t = e.target.value; guardar(); };
      $('.lb-sect', li).onchange = () => pintar();
      $('[data-su]', li).onclick = () => { mover(lib.secciones, s, -1); guardar(); pintar(); };
      $('[data-sd]', li).onclick = () => { mover(lib.secciones, s, 1); guardar(); pintar(); };
      const sp = $('[data-spdf]', li); if (sp) sp.onclick = () => verLibro(s.id);
      const sx = $('[data-sx]', li); if (sx) sx.onclick = () => { lib.secciones = lib.secciones.filter((x) => x !== s); if (!lib.secciones.length) lib.secciones = L.vacio().secciones; guardar(); pintar(); };
    });
    // Capítulos
    $$('.lb-c', host).forEach((li) => {
      const x = lib.caps.find((y) => y.id === li.dataset.c);
      $('[data-in]', li).onchange = (e) => { x.incl = e.target.checked; guardar(); pintar(); };
      $('[data-ver]', li).onclick = () => { sel = x.id; pintar(); if (innerWidth < 980) $('.lb-read').scrollIntoView({ behavior: 'smooth' }); };
      $('[data-cu]', li).onclick = () => { moverCap(x, -1); guardar(); pintar(); };
      $('[data-cd]', li).onclick = () => { moverCap(x, 1); guardar(); pintar(); };
    });
    if (c) {
      $('#lbMover', host).onchange = (e) => { c.sec = e.target.value; guardar(); pintar(); };
      $('#lbQuitar', host).onclick = (e) => { if (!e.target.dataset.ok) { e.target.dataset.ok = 1; e.target.textContent = '¿Seguro? Toque otra vez'; return; } lib.caps = lib.caps.filter((y) => y !== c); sel = null; guardar(); pintar(); };
    }
    pintarHero();
  }
  const recoger = () => {
    const m = mundosPlan();
    if (!confirm(`La aplicación va a abrir ${m.map((k) => MUNDO_N[k].toLowerCase()).join(', ')} y generar sus informes para el libro. Tarda unos segundos por mundo. ¿Seguimos?`)) return;
    L.recogerTodo(m);
  };
  function pintarHero() {
    const hero = $('#lbHero'); if (!hero || !A.heroMundo) return;
    const inc = incluidos(), ult = lib.caps.reduce((a, c) => (c.fecha > a ? c.fecha : a), '');
    const viejo = (c) => Date.now() - new Date(c.fecha).getTime() > 30 * 864e5;
    const hc = { kicker: 'Libro corporativo', titulo: 'El libro de <em>la empresa</em>', lede: 'Todos los informes del ecosistema reunidos en un solo documento: con su portada, su índice y sus secciones, para consultarlo, compartirlo y guardarlo como el manual de la empresa.',
      empresa, datos: [['Capítulos', String(lib.caps.length)], ['En el libro', String(inc.length)], ['Secciones', String(lib.secciones.length)], ['Actualizado', ult ? fCorta(ult) : '—']],
      acciones: [{ t: 'Recoger todos los informes', cls: 'solid', fn: recoger }, { t: 'Ver el libro completo', fn: () => verLibro() }, { t: 'Descargar en PDF', cls: 'ghost', fn: () => { verLibro(); setTimeout(() => { const b = document.getElementById('rpPdf'); if (b) b.click(); }, 400); } }],
      veredicto: { kicker: 'Estado del libro', st: !inc.length ? 'stop' : inc.some(viejo) ? 'warn' : 'ok', titulo: !inc.length ? 'Aún sin capítulos' : inc.some(viejo) ? 'Hay capítulos de hace más de un mes' : 'Libro al día', texto: 'Cada franja es un capítulo: verde si está al día, ámbar si tiene más de un mes. Tóquela para leerlo.',
        luces: lib.caps.slice(0, 40).map((c) => ({ n: c.t, v: fCorta(c.fecha), st: !c.incl ? 'stop' : viejo(c) ? 'warn' : 'ok', fn: () => { sel = c.id; pintar(); $('.lb-read').scrollIntoView({ behavior: 'smooth' }); } })) } };
    hero.innerHTML = A.heroMundo.html(hc); A.heroMundo.wire(hero, hc);
  }

  A.libroPagina = {
    async start() {
      A.sky && A.sky();
      const Pl = P();
      if (Pl) { const ok = await Pl.guard(); if (!ok) return; Pl.mountAccount($('#account')); if (Pl.empresas) { await Pl.empresas.cargar(); const e = Pl.empresas.activa(); if (e && e.nombre) empresa = e.nombre; } }
      lib = await L.cargar();
      // Al volver de recoger los informes de los mundos
      if (location.hash === '#recogido') {
        const q = L.resultadoCola(); history.replaceState(null, '', 'libro.html');
        if (q && q.hechos) toast('Informes recogidos: ' + Object.keys(q.hechos).map((k) => `${MUNDO_N[k]} ${typeof q.hechos[k] === 'number' ? q.hechos[k] : '(' + q.hechos[k] + ')'}`).join(' · ') + '.');
      }
      pintar();
    }
  };
})();
