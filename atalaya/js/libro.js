/* Atalaya 360° · Libro corporativo
   Reúne los informes de todos los mundos en un libro de la empresa: portada, introducción propia, índice
   interactivo por secciones y capítulos, lector, y descarga en PDF del libro completo o de una sección.
   Las secciones se pueden renombrar, crear, ordenar y vaciar; cada capítulo se incluye o no, se mueve de
   sección y se ordena. «Recoger todos los informes» recorre los mundos del plan y genera sus informes.
   Menú: el archivador común (js/archivador.js) con un área «Secciones»: cada sección del libro es un módulo con su #
   (libro.html#estrategia); la columna de la izquierda es la ficha de la sección abierta. */
(function () {
  const A = window.Atalaya, L = A.libro;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const P = () => A.platform;
  const MUNDO_N = { intervencion: 'Auditoría integral', simulador: 'Simulador de inversión', estrategia: 'Sistema estratégico', personas: 'Personas y equipos', mesa: 'Mesa de trabajo', tablero: 'Tablero general', cartera: 'Cartera de clientes' };
  const URL = { intervencion: 'intervencion.html', simulador: 'app.html', estrategia: 'estrategia.html', personas: 'personas.html', mesa: 'mesa.html', tablero: 'tablero.html', cartera: 'grupo.html' };
  const fCorta = (s) => (s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  let lib = null, sel = null, empresa = 'Mi empresa', firmas = {};
  /* Archivador común (js/archivador.js): un área «Secciones» cuyos módulos son las secciones del libro (las de defecto,
     las que cree o renombre el usuario y, si se recogieron, el tablero y la cartera). La columna de la izquierda ya no
     repite la lista de secciones: es la ficha de la sección abierta, con sus capítulos (las vistas del módulo) y las
     acciones de siempre (incluir, ↑ ↓, renombrar, mover la sección, verla sola) y, plegados, los ajustes del libro. */
  let secAct = null, arch = null, arrancado = false, volviendo = false, ajustes = false;
  const esSec = (k) => !!(lib && lib.secciones.some((x) => x.id === k));
  const areasArch = () => [{ k: 'secciones', n: 'Secciones', modulos: lib.secciones.map((x) => { const n = capsDe(x.id).filter((c) => c.incl).length; return { k: x.id, n: (x.t || '').trim() || 'Sección sin nombre', pregunta: n ? `${n} capítulo${n === 1 ? '' : 's'} en el libro` : 'Sin capítulos en el libro', cuenta: n || null, cuentaT: n ? `${n} capítulo${n === 1 ? '' : 's'} en el libro` : '' }; }) }];
  const marcarHash = () => { if (!secAct || location.hash === '#' + secAct) return; try { if (arrancado && !volviendo) history.pushState(null, '', '#' + secAct); else history.replaceState(null, '', '#' + secAct); } catch (e) { /* sin historial */ } };
  // Abre una sección: su primer capítulo del libro (o el primero que tenga) en el lector
  const irSec = (k, o) => {
    if (!esSec(k)) return;
    secAct = k; const cs = lib.caps.filter((c) => c.sec === k); const f = cs.find((c) => c.incl) || cs[0]; sel = f ? f.id : null;
    pintar();
    const t = $('.ar-cab'); if (t && o && o.ver) { const y = t.getBoundingClientRect().top + scrollY - 84; if (scrollY > y) scrollTo({ top: Math.max(0, y) }); }
  };
  /* Estado de un capítulo: desactualizado si los datos de su mundo han cambiado desde que se generó (firma distinta);
     antiguo si tiene más de 30 días o no tiene fecha válida */
  const fechaOk = (c) => c.fecha && isFinite(new Date(c.fecha).getTime());
  const viejo = (c) => !fechaOk(c) || Date.now() - new Date(c.fecha).getTime() > 30 * 864e5;
  // Lo que usa el capítulo (los datos de su mundo y las cifras del simulador que toma) ha cambiado: js/libro-comun.js
  const cambiado = (c) => (L.cambiado ? L.cambiado(c, firmas[c.mundo]) : !!(c.firma && firmas[c.mundo] && c.firma !== firmas[c.mundo]));
  const estadoCap = (c) => (cambiado(c) ? 'cambiado' : viejo(c) ? (fechaOk(c) ? 'viejo' : 'sinfecha') : 'ok');
  const EST_T = { cambiado: 'desactualizado: han cambiado los datos de su mundo o las cifras del simulador que usa', viejo: 'de hace más de un mes', sinfecha: 'sin fecha', ok: 'al día' };
  const calcFirmas = async () => { const ms = [...new Set(lib.caps.map((c) => c.mundo).filter(Boolean))]; const out = {}; for (const m of ms) out[m] = { v2: L.firma ? await L.firma(m) : null, v1: lib.caps.some((c) => c.mundo === m && c.firma && !/^v2\./.test(c.firma)) && L.firmaV1 ? await L.firmaV1(m) : null }; firmas = out; };
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
  // Solo se numeran las secciones con capítulos en el libro: una sección vacía no ocupa número
  const secNum = () => { const m = {}; let i = 0; lib.secciones.forEach((s) => { if (capsDe(s.id).some((c) => c.incl)) m[s.id] = ++i; }); return m; };
  const numeracion = () => { const m = {}, sn = secNum(); lib.secciones.forEach((s) => { let j = 0; if (sn[s.id]) capsDe(s.id).forEach((c) => { if (c.incl) m[c.id] = `${sn[s.id]}.${++j}`; }); }); return m; };

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
      const i = secNum()[s.id];
      h += `<section class="lb-secp"><span>Sección ${i}</span><h2>${esc(s.t)}</h2>${(s.intro || '').trim() ? `<p>${esc(s.intro)}</p>` : ''}<ol>${capsDe(s.id).filter((c) => c.incl).map((c) => `<li>${num[c.id]} · ${esc(c.t)}</li>`).join('')}</ol></section>`;
      capsDe(s.id).filter((c) => c.incl).forEach((c) => { h += `<section class="lb-cap ${esc(c.cls || '')}" id="lbc-${c.id}"><div class="lb-caph"><span>${num[c.id]}</span>${esc(c.t)}</div>${encajar(I.remarcar(c.html), c.cls)}</section>`; });
    });
    h += I.foot('Libro corporativo de ' + empresa + '. Cada capítulo es el informe de su mundo en la fecha indicada en el índice.');
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
    if (!esSec(secAct)) { const x = sel && lib.caps.find((y) => y.id === sel); secAct = x && esSec(x.sec) ? x.sec : ((lib.secciones.find((y) => capsDe(y.id).some((c) => c.incl)) || lib.secciones[0]) || {}).id || null; }
    // El capítulo del lector es de la sección abierta
    if (sel && (lib.caps.find((y) => y.id === sel) || {}).sec !== secAct) sel = null;
    if (!sel) { const cs = capsDe(secAct), f = cs.find((x) => x.incl) || cs[0]; sel = f ? f.id : null; }
    const c = sel && lib.caps.find((x) => x.id === sel), sA = lib.secciones.find((x) => x.id === secAct);
    host.innerHTML = `<div class="lb-main">
      <aside class="glass pad stack lb-idx" aria-label="Capítulos de la sección">
        <div class="eyebrow">Sección${secNum()[secAct] ? ' ' + secNum()[secAct] : ''} · sus capítulos</div>
        <ol class="lb-secs">${lib.secciones.filter((s) => s.id === secAct).map((s) => { const cs = capsDe(s.id), sn = secNum()[s.id]; return `<li class="lb-sec" data-s="${s.id}">
          <div class="lb-sech"><span class="lb-n">${sn || '—'}</span><input class="input lb-sect" value="${esc(s.t)}" aria-label="Nombre de la sección"><span class="lb-acc"><button class="icon-btn" data-su title="Subir la sección" aria-label="Subir">↑</button><button class="icon-btn" data-sd title="Bajar la sección" aria-label="Bajar">↓</button>${cs.some((x) => x.incl) ? '<button class="icon-btn" data-spdf title="Ver o descargar solo esta sección" aria-label="Solo esta sección">⤓</button>' : ''}${cs.length ? '' : '<button class="icon-btn" data-sx title="Quitar la sección vacía" aria-label="Quitar">×</button>'}</span></div>
          ${cs.length ? `<ol class="lb-caps">${cs.map((x) => `<li class="lb-c ${x.id === sel ? 'on' : ''} ${x.incl ? '' : 'fuera'}" data-c="${x.id}"><input type="checkbox" data-in ${x.incl ? 'checked' : ''} aria-label="Incluir en el libro"><button class="lb-ct" data-ver><span>${num[x.id] || '—'}</span>${esc(x.t)}<small>${esc(MUNDO_N[x.mundo] || '')} · ${fCorta(x.fecha)}${estadoCap(x) !== 'ok' ? ` · <b class="lb-st ${estadoCap(x)}">${esc(estadoCap(x) === 'cambiado' ? 'desactualizado' : EST_T[estadoCap(x)])}</b>` : ''}</small></button><span class="lb-acc"><button class="icon-btn" data-cu aria-label="Subir">↑</button><button class="icon-btn" data-cd aria-label="Bajar">↓</button></span></li>`).join('')}</ol>` : '<p class="small muted lb-vacia">Sin capítulos. Mueva aquí capítulos de otra sección o añada informes desde los mundos.</p>'}
        </li>`; }).join('')}</ol>
        <p class="small muted" style="margin:0">Marque los capítulos que van al libro y ordénelos con ↑ ↓. En la cabecera de la sección, ↑ ↓ la mueven en el libro y ⤓ la abre sola para verla o descargarla. Las secciones están en el archivador.</p>
        <details class="lb-ajustes"${ajustes ? ' open' : ''}><summary>Ajustes del libro</summary><div class="stack">
          <label class="small">Título<input class="input" id="lbTit" value="${esc(lib.titulo)}" placeholder="Libro corporativo de ${esc(empresa)}"></label>
          <label class="small">Introducción (sus palabras, va antes del índice)<textarea class="input" id="lbIntro" rows="3" placeholder="Para qué sirve este libro, a quién va dirigido y cómo usarlo.">${esc(lib.intro)}</textarea></label>
          <div class="row"><button class="btn ghost small" id="lbSecN">Nueva sección</button></div>
          <div class="stack lb-extra"><div class="eyebrow">Al recoger, incluir también</div>${extrasPosibles().map((k) => `<label class="small row" style="gap:8px"><input type="checkbox" data-extra="${k}" ${(lib.recogerExtra || {})[k] ? 'checked' : ''}> ${esc(MUNDO_N[k])}</label>`).join('')}</div>
        </div></details>
      </aside>
      <section class="lb-read" aria-live="polite">${c ? `<div class="glass pad row lb-rbar"><div><div class="eyebrow">${num[c.id] ? 'Capítulo ' + num[c.id] : 'No incluido en el libro'} · ${esc(MUNDO_N[c.mundo] || '')}</div><h2 class="lb-rt">${esc(c.t)}</h2><small class="muted">Actualizado el ${fCorta(c.fecha)}</small>${cambiado(c) ? `<p class="small lb-aviso" style="margin:4px 0 0">Los datos de ${esc(MUNDO_N[c.mundo] || 'su mundo')} han cambiado desde que se generó este capítulo. Vuelva a abrir el informe en su mundo y pulse «Añadir al libro», o use «Recoger todos los informes».</p>` : ''}</div><span class="spacer"></span>
          <label class="small">Sección<select class="input" id="lbMover">${lib.secciones.map((s) => `<option value="${s.id}" ${s.id === c.sec ? 'selected' : ''}>${esc(s.t)}</option>`).join('')}</select></label>
          <a class="btn ghost small" href="${URL[c.mundo] || 'portal.html'}">Ir a su mundo</a><button class="btn ghost small" id="lbQuitar">Quitar del libro</button></div>
        <div class="lb-paperwrap"><article class="paper rp ${esc(c.cls || '')} lb-paper">${A.informe.remarcar(c.html)}</article></div>`
        : lib.caps.length ? `<div class="glass pad stack lb-empty"><div class="eyebrow">${esc((sA && sA.t) || 'Sección')} · sin capítulos</div><p style="margin:0">Esta sección todavía no tiene capítulos. Abra el informe de su mundo y pulse <b>Añadir al libro</b>, use <b>Recoger todos los informes</b> o mueva aquí un capítulo de otra sección desde el lector («Sección»).</p><div class="row"><button class="btn solid" id="lbRecoger2">Recoger todos los informes</button></div></div>`
        : `<div class="glass pad stack lb-empty"><div class="eyebrow">El libro está vacío</div><p style="margin:0">Cada informe que abra en el simulador, el sistema estratégico, personas y equipos o la mesa de trabajo tiene el botón <b>Añadir al libro</b>. También puede pulsar <b>Recoger todos los informes</b>: la aplicación recorre los mundos de su plan, genera sus informes y vuelve aquí.</p><div class="row"><button class="btn solid" id="lbRecoger2">Recoger todos los informes</button></div></div>`}</section></div>`;
    // Libro
    $('#lbTit', host).oninput = (e) => { lib.titulo = e.target.value; guardar(); };
    $('#lbIntro', host).oninput = (e) => { lib.intro = e.target.value; guardar(); };
    host.querySelectorAll('[data-extra]').forEach((x) => (x.onchange = () => { lib.recogerExtra = Object.assign({}, lib.recogerExtra || {}, { [x.dataset.extra]: x.checked }); guardar(); }));
    $('#lbSecN', host).onclick = () => { const id = 's' + Date.now().toString(36); lib.secciones.push({ id, t: 'Nueva sección' }); guardar(); irSec(id); const t = $('.lb-sect', host); if (t) { t.focus(); t.select(); } };
    $('.lb-ajustes', host).ontoggle = (e) => { ajustes = e.target.open; };
    const r2 = $('#lbRecoger2', host); if (r2) r2.onclick = recoger;
    // Secciones
    $$('.lb-sec', host).forEach((li) => {
      const s = lib.secciones.find((x) => x.id === li.dataset.s);
      $('.lb-sect', li).oninput = (e) => { s.t = e.target.value; guardar(); };
      $('.lb-sect', li).onchange = () => pintar();
      $('[data-su]', li).onclick = () => { mover(lib.secciones, s, -1); guardar(); pintar(); };
      $('[data-sd]', li).onclick = () => { mover(lib.secciones, s, 1); guardar(); pintar(); };
      const sp = $('[data-spdf]', li); if (sp) sp.onclick = () => verLibro(s.id);
      const sx = $('[data-sx]', li); if (sx) sx.onclick = () => { lib.secciones = lib.secciones.filter((x) => x !== s); if (!lib.secciones.length) lib.secciones = L.vacio().secciones; secAct = null; guardar(); pintar(); };
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
      $('#lbMover', host).onchange = (e) => { c.sec = e.target.value; secAct = c.sec; guardar(); pintar(); }; // el lector sigue al capítulo
      $('#lbQuitar', host).onclick = (e) => { if (!e.target.dataset.ok) { e.target.dataset.ok = 1; e.target.textContent = '¿Seguro? Toque otra vez'; return; } lib.caps = lib.caps.filter((y) => y !== c); sel = null; guardar(); pintar(); };
    }
    ajustarLector();
    pintarHero();
    marcarHash();
    if (arch) arch.refrescar();
  }
  /* Las hojas A4 (794 px) de los informes paginados se escalan al ancho del lector, sin recortes */
  const ajustarLector = () => { const w = $('.lb-paperwrap'), a = w && $('.lb-paper.pp-doc', w); if (!a) return; a.style.width = '794px'; a.style.zoom = Math.min(1, (w.clientWidth - 2) / 794); };
  addEventListener('resize', ajustarLector);
  // Capítulos opcionales de la recogida: el tablero general y, con Consultora o Grupos, la cartera
  const extrasPosibles = () => ['tablero'].concat(P() && P().esGrupo && P().user && P().esGrupo(P().user) ? ['cartera'] : []);
  const extras = () => { const o = lib.recogerExtra || {}; return extrasPosibles().filter((k) => o[k]); };
  const recoger = () => {
    const m = mundosPlan().concat(extras());

    L.recogerTodo(m);
  };
  function pintarHero() {
    const hero = $('#lbHero'); if (!hero || !A.heroMundo) return;
    const inc = incluidos(), ult = lib.caps.reduce((a, c) => (c.fecha > a ? c.fecha : a), '');
    const malos = inc.filter((c) => estadoCap(c) !== 'ok'), camb = inc.filter(cambiado).length;
    // Franja: primero los capítulos del libro y luego los que están fuera; como mucho 40
    const orden = inc.concat(lib.caps.filter((c) => !c.incl)), vis = orden.slice(0, 40);
    const hc = { kicker: 'Libro corporativo', titulo: 'El libro de <em>la empresa</em>', lede: 'Todos los informes del ecosistema reunidos en un solo documento: con su portada, su índice y sus secciones, para consultarlo, compartirlo y guardarlo como el manual de la empresa.',
      empresa, datos: [['Capítulos', String(lib.caps.length)], ['En el libro', String(inc.length)], ['Secciones', String(lib.secciones.length)], ['Actualizado', ult ? fCorta(ult) : '—']],
      acciones: [{ t: 'Recoger todos los informes', cls: 'solid', fn: recoger }, { t: 'Ver el libro completo', fn: () => verLibro() }, { t: 'Descargar en PDF', cls: 'ghost', fn: () => { verLibro(); setTimeout(() => { const b = document.getElementById('rpPdf'); if (b) b.click(); }, 400); } }],
      // Libro vacío: «Sin empezar», en gris (no es un fallo)
      veredicto: { kicker: 'Estado del libro', st: !inc.length ? null : malos.length ? 'warn' : 'ok', nulo: 'fuera del libro',
        titulo: !inc.length ? 'Sin empezar' : camb ? `${camb} capítulo${camb === 1 ? '' : 's'} desactualizado${camb === 1 ? '' : 's'}` : malos.length ? `${malos.length} capítulo${malos.length === 1 ? '' : 's'} de hace más de un mes` : 'Libro al día',
        texto: !inc.length ? 'El libro aún no tiene capítulos. Pulse «Recoger todos los informes»: solo se incluyen los mundos y módulos que tienen datos, sin páginas vacías.' : `Cada franja es un capítulo: verde si está al día; ámbar si los datos de su mundo han cambiado desde que se generó, si tiene más de un mes o si no tiene fecha; gris si está fuera del libro. Tóquela para leerlo.${orden.length > vis.length ? ` Se muestran ${vis.length} de ${orden.length}.` : ''}`,
        luces: vis.map((c) => ({ n: c.t, v: fCorta(c.fecha) + (c.incl ? (estadoCap(c) !== 'ok' ? ' · ' + EST_T[estadoCap(c)] : '') : ' · fuera del libro'), st: !c.incl ? null : estadoCap(c) === 'ok' ? 'ok' : 'warn', fn: () => { sel = c.id; secAct = c.sec; pintar(); $('.lb-read').scrollIntoView({ behavior: 'smooth' }); } })) } };
    hero.innerHTML = A.heroMundo.html(hc); A.heroMundo.wire(hero, hc);
    // Sin capítulos no hay nada que descargar
    const pdf = hero.querySelector('[data-hm-a="2"]'); if (pdf && !inc.length) { pdf.disabled = true; pdf.title = 'El libro no tiene capítulos todavía'; }
  }

  A.libroPagina = {
    areasArch: () => (lib ? areasArch() : []),
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
      { const h = location.hash.replace('#', ''); if (esSec(h)) secAct = h; }
      if (A.archivador) arch = A.archivador.montar({ mundo: 'libro', areas: areasArch, actual: () => secAct, ir: (k) => irSec(k, { ver: true }), antes: $('#lbHero'), portada: () => $('#lbHero'), panel: () => $('#lbPanel') });
      pintar(); arrancado = true;
      // Atrás y adelante del navegador recorren las secciones visitadas; un # en la misma página abre su sección
      const alVolver = () => { const k = location.hash.replace('#', ''); if (esSec(k) && k !== secAct) { volviendo = true; try { irSec(k); } finally { volviendo = false; } } };
      addEventListener('popstate', alVolver); addEventListener('hashchange', alVolver);
      // Firma actual de los datos de cada mundo: marca los capítulos desactualizados
      await calcFirmas(); pintar();
    }
  };
})();
