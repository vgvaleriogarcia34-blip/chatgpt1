/* Atalaya · Recorrido de Personas y equipos
   El mismo lenguaje que el simulador y el sistema estratégico: los grupos son las fases y cada herramienta, una capa.
   1) Mapa de capas en 3D (pila, abanico, círculo o línea) con un fragmento real de cada herramienta y su estado en vivo.
   2) Hoja de ruta fija: grupos, herramienta actual, anterior / siguiente. «Ver pestañas» vuelve a la barra clásica. */
(function () {
  const A = window.Atalaya, S = A.personas;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };

  const Q = new Proxy({}, { get: (o, id) => (S.mod(id) || {}).pregunta || '' });
  const AREA = { 'Visión': 'La plantilla de un vistazo', 'Herramientas': 'Conocer a cada persona', 'Estructura': 'Puestos, organigrama y talento', 'Equipos': 'Cómo funcionan juntos', 'Liderazgo': 'Cómo se dirige cada tarea', 'Desarrollo': 'Entrenar y documentar' };
  const FASES = () => S.GRUPOS.map((g) => ({ n: g, ids: S.modules.filter((m) => m.grupo === g).map((m) => m.id) })).filter((f) => f.ids.length);
  const ORDEN = () => FASES().flatMap((f) => f.ids);
  const faseDe = (id) => FASES().findIndex((f) => f.ids.includes(id));
  const nombre = (id) => (S.mod(id) || {}).nombre || id;
  const visit = new Set(LS.get('atalaya.rutaper.visto') || []);
  let modo = LS.get('atalaya.rutaper.modo') || 'capitulo';
  const snap = new Map(); // última vista real de cada herramienta
  const hash0 = location.hash.replace('#', ''); // a dónde se quería llegar al entrar

  /* Estado en vivo de cada herramienta, en una frase corta */
  function estado(id) {
    const st = S.state; if (!st) return null;
    const ps = st.personas, n = ps.length, c = (f) => ps.filter(f).length;
    const frac = (k, t) => ({ t: `${k} de ${n} ${t}`, st: !n ? '' : k === n ? 'ok' : k ? 'warn' : 'stop' });
    try {
      switch (id) {
        case 'panorama': return n ? { t: `${n} persona${n > 1 ? 's' : ''} · ${st.puestos.length} puestos` } : { t: 'Empieza por la plantilla', st: 'warn' };
        case 'personas': return n ? { t: `${c((p) => p.consentimiento)} de ${n} con consentimiento`, st: c((p) => p.consentimiento) === n ? 'ok' : 'warn' } : null;
        case 'disc': return n ? frac(c((p) => p.disc), 'con DISC') : null;
        case 'roles': return n ? frac(c((p) => p.roles && p.roles.scores), 'con aportaciones') : null;
        case 'eneagrama': return n ? frac(c((p) => p.enea && p.enea.tipo), 'con eneagrama') : null;
        case 'identidad': return n ? frac(c((p) => S.identidad && S.identidad(p)), 'con perfil de identidad') : null;
        case 'envios': { const e = (st.envios || []).filter((x) => x.estado !== 'completado').length; return { t: e ? `${e} envío${e > 1 ? 's' : ''} pendiente${e > 1 ? 's' : ''}` : 'Sin envíos pendientes' }; }
        case 'puestos': return { t: `${st.puestos.length} puesto${st.puestos.length === 1 ? '' : 's'} definido${st.puestos.length === 1 ? '' : 's'}` };
        case 'encaje': { const r = S.resumen(); return r.encMedio != null ? { t: `Encaje medio ${r.encMedio} %`, st: r.encMedio >= 75 ? 'ok' : r.encMedio >= 55 ? 'warn' : 'stop' } : { t: 'Sin puestos con perfil' }; }
        case 'organigrama': { if (!n) return null; const e = S.estructura(), g = e.avisos.filter((a) => a.st === 'stop').length; return { t: `${e.niveles} niveles · ${e.mandos.length} mandos${g ? ` · ${g} alerta${g > 1 ? 's' : ''}` : ''}`, st: g ? 'stop' : e.avisos.some((a) => a.st === 'warn') ? 'warn' : 'ok' }; }
        case 'talento': return n ? frac(c((p) => S.caja(p)), 'valorados') : null;
        case 'equipos': return { t: `${st.equipos.length} equipo${st.equipos.length === 1 ? '' : 's'}` };
        case 'lid-modelo': case 'lid-estilo': return S.lideres ? { t: `${S.lideres().filter((p) => p.lid && p.lid.estilo).length} líderes con test de estilo` } : null;
        case 'lid-mapa': { if (!S.lideres) return null; const f = S.lideres().flatMap((p) => S.mapaMando(p)), d = f.filter((x) => x.des && x.des.st !== 'ok').length; return { t: `${f.filter((x) => x.nv).length} tareas valoradas · ${d} desajuste${d === 1 ? '' : 's'}`, st: d ? 'warn' : f.some((x) => x.nv) ? 'ok' : '' }; }
        default: return null;
      }
    } catch (e) { return null; }
  }

  /* ---------- Hoja de ruta ---------- */
  function drawBar() {
    const bar = $('#rutaBar'); if (!bar) return;
    const O = ORDEN(), F = FASES(), actual = S.current();
    const i = O.indexOf(actual), prev = O[i - 1], next = O[i + 1], fi = faseDe(actual);
    bar.innerHTML = `<button class="rb-map" id="rbMap" title="Ver todas las capas"><i></i><i></i><i></i><span>Mapa</span></button>
      <ol class="rb-fases">${F.map((f, k) => { const done = f.ids.every((x) => visit.has(x)); const on = f.ids.includes(actual); return `<li class="${on ? 'on' : ''} ${done ? 'done' : ''}"><span class="rb-fn">${k + 1}</span><span class="rb-name">${esc(f.n)}</span><span class="rb-steps">${f.ids.map((x) => `<button data-go="${x}" class="${x === actual ? 'on' : ''} ${visit.has(x) ? 'seen' : ''}" title="${esc(nombre(x))}" aria-label="${esc(nombre(x))}"></button>`).join('')}</span></li>`; }).join('')}</ol>
      <div class="rb-nav">${prev ? `<button data-go="${prev}" class="rb-prev" title="${esc(nombre(prev))}">←</button>` : ''}<span class="rb-cur"><small>${fi >= 0 ? esc(F[fi].n) : ''}</small><b>${esc(nombre(actual))}</b></span>${next ? `<button data-go="${next}" class="rb-next" title="${esc(nombre(next))}">→</button>` : ''}</div>`;
    $('#rbMap', bar).onclick = () => openMap();
    $$('[data-go]', bar).forEach((b) => b.onclick = () => S.show(b.dataset.go));
    // Debajo de la barra: los módulos del área activa, como pestañas cortas
    const sub = $('#rutaSub');
    if (sub && fi >= 0) {
      sub.innerHTML = `<span class="rs-area">${esc(F[fi].n)} · ${esc(AREA[F[fi].n] || '')}</span>${F[fi].ids.map((x) => `<button data-go="${x}" aria-current="${x === actual}">${esc(nombre(x))}</button>`).join('')}<span class="spacer"></span><button class="rs-tabs" data-tabs>Ver pestañas</button>`;
      $$('[data-go]', sub).forEach((b) => b.onclick = () => S.show(b.dataset.go));
      $('[data-tabs]', sub).onclick = pestanas;
    }
  }
  function drawNext() {
    $$('#pePanel .ch-next').forEach((x) => x.remove());
    const panel = $('#pePanel'); const O = ORDEN(), i = O.indexOf(S.current()); if (!panel || i < 0) return;
    const prev = O[i - 1], next = O[i + 1];
    const d = document.createElement('div'); d.className = 'ch-next';
    d.innerHTML = `${prev ? `<button class="btn ghost" data-go="${prev}">← ${esc(nombre(prev))}</button>` : '<span></span>'}<button class="btn ghost" data-map>Ver el mapa</button>${next ? `<button class="btn solid" data-go="${next}">Siguiente: ${esc(nombre(next))} →</button>` : '<span></span>'}`;
    panel.appendChild(d);
    $$('[data-go]', d).forEach((b) => b.onclick = () => S.show(b.dataset.go));
    $('[data-map]', d).onclick = () => openMap();
  }
  function pestanas() {
    modo = 'pestanas'; LS.set('atalaya.rutaper.modo', modo);
    document.body.classList.remove('est-ruta'); $$('#pePanel .ch-next').forEach((x) => x.remove()); closeMap(); tabMapa();
  }
  // En modo pestañas, la primera pestaña abre el mapa (en el móvil no hay botón en la cabecera)
  function tabMapa() {
    const t = $('#peTabs'); if (!t || $('.tab-mapa', t)) return;
    t.insertAdjacentHTML('afterbegin', '<button class="tab-mapa" title="Mapa de capas y recorrido por grupos">▦ Mapa</button><span class="tabsep" aria-hidden="true"></span>');
    $('.tab-mapa', t).onclick = () => openMap();
  }
  function recorrido() { modo = 'capitulo'; LS.set('atalaya.rutaper.modo', modo); document.body.classList.add('est-ruta'); drawBar(); drawNext(); }

  /* Cada vez que se muestra un módulo */
  const COL = { 'Visión': 0xc9f24d, 'Herramientas': 0x9b7cf0, 'Estructura': 0x2fb4a0, 'Equipos': 0x3987e5, 'Liderazgo': 0xe0794a, 'Desarrollo': 0xd55181 };
  S.onShow = (id, keep) => {
    // Cada grupo vive en su galaxia, de su color, como en los otros dos mundos
    if (A.cosmos && !keep) try { const m = S.mod(id); A.cosmos.go(id, COL[m && m.grupo] || 0xc9f24d); } catch (e) { /* sin 3D */ }
    // Cada módulo vive en su propia galaxia, del color de su área; los titulares flotan con volumen
    visit.add(id); LS.set('atalaya.rutaper.visto', Array.from(visit));
    // Se guarda su aspecto real para el mapa (cuando los gráficos ya están dibujados)
    setTimeout(() => { if (S.current() === id) snap.set(id, clonar($('#pePanel'))); }, keep ? 50 : 400);
    if (modo !== 'capitulo') return;
    drawBar(); drawNext();
  };

  function clonar(src) {
    if (!src) return null;
    const c = src.cloneNode(true);
    c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id')); c.removeAttribute('id');
    c.querySelectorAll('script, .ch-next, .st-repbar, input[type="file"]').forEach((x) => x.remove());
    // Los canvas no se copian con su dibujo: se sustituyen por la imagen
    const orig = src.querySelectorAll('canvas'), cop = c.querySelectorAll('canvas');
    cop.forEach((cv, k) => { try { const img = document.createElement('img'); img.src = orig[k].toDataURL(); img.style.width = orig[k].style.width || orig[k].width + 'px'; cv.replaceWith(img); } catch (e) { cv.remove(); } });
    c.className = 'st-panel rm-clone';
    return c;
  }
  /* Los módulos que aún no se han abierto se dibujan fuera de la vista solo para el mapa */
  function preRender(ids) {
    if (!ids.length) return;
    const off = document.createElement('div'); off.className = 'rm-off'; off.setAttribute('aria-hidden', 'true');
    document.body.appendChild(off);
    ids.forEach((id) => {
      const m = S.mod(id); const h = document.createElement('section'); h.className = 'st-panel'; off.appendChild(h);
      try { m.render(h); snap.set(id, clonar(h)); } catch (e) { /* sin vista previa */ }
    });
    off.querySelectorAll('*').forEach((el) => { if (el._rjTick) clearInterval(el._rjTick); });
    off.remove();
    if (A.charts) A.charts.hideTip();
  }

  /* ---------- Mapa de capas ---------- */
  let layout = LS.get('atalaya.rutaper.layout') || (innerWidth < 760 ? 'linea' : 'abanico');
  let foco = 0, hot = null, faseHot = null, drag = null, dragged = false;
  const LAYOUTS = [['pila', 'Pila'], ['abanico', 'Abanico'], ['circulo', 'Círculo'], ['linea', 'Línea']];
  const hint = () => (layout === 'circulo' || layout === 'linea' ? 'Arrastra, usa la rueda o las flechas para recorrer las capas · ' : '') + 'Intro abre la capa · Esc cierra el mapa';
  let salida = 0; // pequeña espera al salir de una capa: evita que suba y baje sin parar
  function openMap() {
    const ov = $('#rutaMap'); const O = ORDEN(), F = FASES();
    // La vista actual se guarda al momento; las demás se preparan una vez
    const cur = S.current(); if (cur) snap.set(cur, clonar($('#pePanel')));
    preRender(O.filter((id) => !snap.has(id)));
    ov.hidden = false; document.body.style.overflow = 'hidden';
    foco = Math.max(0, O.indexOf(cur));
    ov.innerHTML = `<div class="rm-head">
        <div><div class="rm-kicker">Personas y equipos · tu recorrido</div><h2>Todo el equipo humano, <em>capa a capa</em></h2>
        <p>${F.length} grupos y ${O.length} herramientas. Cada ventana enseña lo que hay dentro y su estado con tus datos. Pasa por encima para elevarla y púlsala para entrar.</p></div>
        <div class="rm-tools"><div class="seg" id="rmLay">${LAYOUTS.map(([k, n]) => `<button data-l="${k}" aria-pressed="${k === layout}">${n}</button>`).join('')}</div>
        <button class="btn ghost" id="rmAll">${modo === 'capitulo' ? 'Ver pestañas' : 'Recorrido por grupos'}</button><button class="icon-btn" id="rmX" aria-label="Cerrar el mapa">×</button></div></div>
      <ol class="rm-fases n${F.length}">${F.map((f, k) => `<li data-f="${k}"><b>${k + 1}</b><span>${esc(f.n)}</span><small>${f.ids.filter((x) => visit.has(x)).length}/${f.ids.length}</small></li>`).join('')}</ol>
      <div class="rm-stage" id="rmStage"><div class="rm-world" id="rmWorld">${O.map((id, i) => {
        const e = estado(id), fi = faseDe(id);
        return `<button class="rm-card e${fi}" data-i="${i}" data-id="${id}" aria-label="${esc(nombre(id))}: ${esc(Q[id] || '')}">
          <span class="rm-float"><span class="rm-chrome"><i></i><i></i><i></i><b>${String(i + 1).padStart(2, '0')} · ${esc(nombre(id))}</b>${visit.has(id) ? '<em title="Visitado">✓</em>' : ''}</span>
          <span class="rm-prev" data-prev="${id}"></span>
          <span class="rm-info"><small>${esc(F[fi].n)}</small><b>${esc(nombre(id))}</b><span>${esc(Q[id] || '')}</span>${e ? `<span class="rm-st ${e.st || ''}">${esc(e.t)}</span>` : ''}<span class="rm-open">Abrir →</span></span></span></button>`;
      }).join('')}</div></div>
      <p class="rm-hint">${hint()}</p>`;
    $$('[data-prev]', ov).forEach((p) => { const c = snap.get(p.dataset.prev); if (c) p.appendChild(c.cloneNode(true)); });
    $$('#rmLay button', ov).forEach((b) => b.onclick = () => { layout = b.dataset.l; LS.set('atalaya.rutaper.layout', layout); $$('#rmLay button', ov).forEach((x) => x.setAttribute('aria-pressed', x === b)); place(); $('.rm-hint', ov).textContent = hint(); });
    $('#rmAll', ov).onclick = () => (modo === 'capitulo' ? pestanas() : (recorrido(), closeMap()));
    $('#rmX', ov).onclick = closeMap;
    const cards = $$('.rm-card', ov);
    cards.forEach((c) => {
      c.addEventListener('pointerenter', () => { clearTimeout(salida); if (hot !== +c.dataset.i) { hot = +c.dataset.i; place(); } });
      c.addEventListener('pointerleave', () => { clearTimeout(salida); salida = setTimeout(() => { if (hot === +c.dataset.i) { hot = null; place(); } }, 140); });
      c.addEventListener('focus', () => { foco = +c.dataset.i; hot = foco; place(); });
      c.addEventListener('click', () => { if (dragged) return; abrir(+c.dataset.i); });
    });
    $$('.rm-fases li', ov).forEach((li) => {
      li.addEventListener('pointerenter', () => { faseHot = +li.dataset.f; place(); });
      li.addEventListener('pointerleave', () => { faseHot = null; place(); });
      li.addEventListener('click', () => { foco = O.indexOf(F[+li.dataset.f].ids[0]); if (layout === 'pila' || layout === 'abanico') abrir(foco); else place(); });
    });
    const stage = $('#rmStage', ov), world = $('#rmWorld', ov);
    stage.onpointermove = (e) => {
      if (reduce) return;
      const r = stage.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      world.style.setProperty('--tx', (-py * 8).toFixed(2) + 'deg'); world.style.setProperty('--ty', (px * 10).toFixed(2) + 'deg');
      if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) dragged = true; const step = layout === 'circulo' ? 90 : 140; const nf = Math.max(0, Math.min(O.length - 1, drag.f - Math.round(dx / step))); if (nf !== foco) { foco = nf; place(); } }
    };
    stage.onpointerdown = (e) => { drag = { x: e.clientX, f: foco }; dragged = false; };
    stage.onwheel = (e) => { if (layout === 'pila' || layout === 'abanico') return; e.preventDefault(); foco = Math.max(0, Math.min(O.length - 1, foco + (e.deltaY + e.deltaX > 0 ? 1 : -1))); place(); };
    ov.onkeydown = (e) => {
      if (e.key === 'Escape') closeMap();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { foco = Math.min(O.length - 1, foco + 1); hot = foco; place(); cards[foco].focus({ preventScroll: true }); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { foco = Math.max(0, foco - 1); hot = foco; place(); cards[foco].focus({ preventScroll: true }); e.preventDefault(); }
    };
    place();
    setTimeout(() => (cards[foco] || cards[0]).focus({ preventScroll: true }), 50);
  }
  addEventListener('pointerup', () => { drag = null; setTimeout(() => { dragged = false; }, 0); });
  function closeMap() { const ov = $('#rutaMap'); if (!ov || ov.hidden) return; ov.hidden = true; ov.innerHTML = ''; document.body.style.overflow = ''; hot = null; faseHot = null; }

  function place() {
    const cards = $$('#rutaMap .rm-card'); const n = cards.length; if (!n) return;
    const O = ORDEN(), small = innerWidth < 760;
    const cw = small ? 250 : 330, gap = small ? 150 : 210;
    cards.forEach((c, i) => {
      let tf = '', z = 0, op = 1, up = '';
      const isHot = hot === i, inFase = faseHot !== null && faseDe(O[i]) === faseHot, dim = faseHot !== null && !inFase;
      if (layout === 'pila') {
                tf = `translate3d(${(i % 2 ? 1 : -1) * 5}px, ${-i * (small ? 12 : 17) + (small ? 120 : 170)}px, ${-i * 38}px)`; up = i > 0 ? `0 ${small ? -90 : -130}px 220px` : '0 0 220px';
        z = 100 - i + (isHot ? 100 : 0);
      } else if (layout === 'abanico') {
        const a = (i - (n - 1) / 2) * (small ? 5.5 : 6);
        tf = `rotateZ(${a}deg) translate3d(0, 0, ${i * 2}px)`; up = '0 -90px 120px';
        z = isHot ? 200 : 100 - Math.abs(i - (n - 1) / 2);
      } else if (layout === 'circulo') {
        const step = 360 / n, a = (i - foco) * step, R = Math.max(small ? 520 : 760, (n * (cw + 30)) / (2 * Math.PI));
        tf = `rotateY(${a}deg) translateZ(${R}px)`; up = '0 -24px 60px';
        const cos = Math.cos((a * Math.PI) / 180); op = 0.2 + 0.8 * Math.max(0, cos); z = Math.round(100 + cos * 100);
      } else {
        const d = i - foco, s = Math.sign(d);
        up = '0 -14px 40px';
        tf = d === 0 ? 'translate3d(0, 0, 160px)' : `translate3d(${d * (gap * 0.55) + s * gap * 0.6}px, 0, ${-Math.abs(d) * 40}px) rotateY(${-s * 55}deg)`;
        op = Math.abs(d) > 5 ? 0 : 1; z = 100 - Math.abs(d);
      }
      c.style.transform = tf; c.firstElementChild.style.translate = isHot ? up : ''; c.style.zIndex = z; c.style.opacity = dim ? Math.min(op, 0.25) : op;
      c.classList.toggle('hot', isHot || inFase);
      c.classList.toggle('foco', i === foco && (layout === 'circulo' || layout === 'linea'));
    });
    $$('#rutaMap .rm-fases li').forEach((li) => li.classList.toggle('on', +li.dataset.f === (hot !== null ? faseDe(O[hot]) : faseHot)));
    const st = $('#rutaMap .rm-stage'); if (st) st.dataset.layout = layout;
  }

  function abrir(i) {
    const id = ORDEN()[i]; const card = $(`#rutaMap .rm-card[data-i="${i}"]`);
    const go = () => { closeMap(); if (modo !== 'capitulo') recorrido(); S.show(id); };
    if (reduce || !card) { go(); return; }
    card.classList.add('opening');
    const r = card.getBoundingClientRect();
    card.style.transition = 'transform 0.55s cubic-bezier(.2,.8,.2,1), opacity 0.55s';
    card.style.transform = `translate3d(${innerWidth / 2 - (r.left + r.width / 2)}px, ${innerHeight / 2 - (r.top + r.height / 2)}px, 300px) scale(${Math.max(innerWidth / r.width, innerHeight / r.height) * 0.85})`;
    $('#rutaMap').classList.add('leaving');
    setTimeout(() => { $('#rutaMap').classList.remove('leaving'); go(); }, 520);
  }

  /* ---------- Arranque: lo llama el núcleo después de abrir el primer módulo ---------- */
  S.onStart = () => {
    const bar = document.createElement('nav'); bar.id = 'rutaBar'; bar.className = 'ruta-bar est'; bar.setAttribute('aria-label', 'Hoja de ruta de personas y equipos'); document.body.appendChild(bar);
    const sub = document.createElement('div'); sub.id = 'rutaSub'; sub.className = 'ruta-sub'; $('#pePanel').before(sub);
    const ov = document.createElement('div'); ov.id = 'rutaMap'; ov.className = 'ruta-map'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Mapa de capas de personas y equipos'); document.body.appendChild(ov);
    const rb = $('#rutaBtn'); if (rb) rb.onclick = () => openMap();
    if (modo === 'capitulo') recorrido(); else tabMapa();
    // Al entrar se ve primero todo el recorrido (una vez por sesión), salvo si se llega a un módulo concreto
    let first = true; try { first = !sessionStorage.getItem('atalaya.rutaper.intro'); sessionStorage.setItem('atalaya.rutaper.intro', '1'); } catch (e) { /* sin almacenamiento */ }
    if (first && modo === 'capitulo' && !S.mod(hash0)) setTimeout(openMap, 800);
  };
  A.rutaPer = { openMap, closeMap, recorrido, pestanas };
})();
