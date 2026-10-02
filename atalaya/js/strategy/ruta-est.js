/* Atalaya · Recorrido del sistema estratégico
   El mismo lenguaje que el simulador: las cinco áreas son las fases y los 18 módulos, las capas.
   1) Mapa de capas en 3D (pila, abanico, círculo o línea) con un fragmento real de cada módulo y su estado en vivo.
   2) Hoja de ruta fija: áreas, módulo actual, anterior / siguiente. «Ver pestañas» vuelve a la barra clásica. */
(function () {
  const A = window.Atalaya, S = A.strat;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };

  // Pregunta que responde cada módulo: el empresario sabe para qué entra
  const Q = {
    tablero: '¿Cómo está toda la empresa de un vistazo?', plan: '¿A dónde vamos y con qué valores?', auditoria: 'El diagnóstico completo, de lo micro a lo macro.',
    dinero: '¿Por qué el beneficio no llega a la caja?', impuestos: '¿Cuánto y cuándo pagaré a Hacienda?', tesoreria: '¿Llego a fin de mes, semana a semana?', presupuesto: '¿Qué espero ganar y gastar este año?',
    ventas: '¿Quién me compra y cuánto dependo de él?', margen: '¿Qué precio y qué volumen me convienen?', comercial: '¿Qué ventas tengo en camino?', marketing: '¿Qué me rinde cada euro de marketing?',
    compras: '¿De quién dependo para comprar?', logistica: '¿Cuánto me cuesta mover y guardar?', tiempos: '¿En qué se va el tiempo del equipo?', lean: '¿Dónde se pierde valor en el proceso?', personas: '¿Está bien organizado el equipo?',
    expansion: '¿Dónde y cómo crecer?', mercado: '¿Qué pasa fuera que me afecta?'
  };
  const AREA = { 'Visión': 'Dónde estamos y a dónde vamos', 'Finanzas': 'El dinero', 'Comercial': 'Los clientes', 'Operaciones': 'El día a día', 'Estrategia': 'El entorno y el crecimiento' };
  const FASES = () => S.GROUPS.map((g) => ({ n: g, ids: S.modules.filter((m) => m.grupo === g).map((m) => m.id) }));
  const ORDEN = () => FASES().flatMap((f) => f.ids);
  const faseDe = (id) => FASES().findIndex((f) => f.ids.includes(id));
  const nombre = (id) => (S.mod(id) || {}).nombre || id;
  const visit = new Set(LS.get('atalaya.rutaest.visto') || []);
  let modo = LS.get('atalaya.rutaest.modo') || 'capitulo';
  const snap = new Map(); // última vista real de cada módulo
  const hash0 = location.hash.replace('#', ''); // a dónde se quería llegar al entrar

  /* Estado en vivo: el indicador más comprometido del módulo y sus riesgos */
  function estado(id) {
    const m = S.mod(id); if (!m) return null;
    let k = [], r = [];
    try { k = m.kpis ? m.kpis() : []; } catch (e) { /* sin indicadores */ }
    try { r = m.risks ? m.risks() : []; } catch (e) { /* sin riesgos */ }
    const rank = { stop: 3, warn: 2, ok: 1 };
    const peor = k.slice().sort((a, b) => (rank[b.st] || 0) - (rank[a.st] || 0))[0];
    const altos = r.filter((x) => x.estado === 'stop').length;
    if (peor) return { t: `${peor.k}: ${String(peor.v).replace(/<[^>]+>/g, '')}`, st: altos ? 'stop' : peor.st || '' };
    if (r.length) return { t: `${r.length} riesgo${r.length > 1 ? 's' : ''}${altos ? `, ${altos} alto${altos > 1 ? 's' : ''}` : ''}`, st: altos ? 'stop' : 'warn' };
    return null;
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
    $$('#stPanel .ch-next').forEach((x) => x.remove());
    const panel = $('#stPanel'); const O = ORDEN(), i = O.indexOf(S.current()); if (!panel || i < 0) return;
    const prev = O[i - 1], next = O[i + 1];
    const d = document.createElement('div'); d.className = 'ch-next';
    d.innerHTML = `${prev ? `<button class="btn ghost" data-go="${prev}">← ${esc(nombre(prev))}</button>` : '<span></span>'}<button class="btn ghost" data-map>Ver el mapa</button>${next ? `<button class="btn solid" data-go="${next}">Siguiente: ${esc(nombre(next))} →</button>` : '<span></span>'}`;
    panel.appendChild(d);
    $$('[data-go]', d).forEach((b) => b.onclick = () => S.show(b.dataset.go));
    $('[data-map]', d).onclick = () => openMap();
  }
  function pestanas() {
    modo = 'pestanas'; LS.set('atalaya.rutaest.modo', modo);
    document.body.classList.remove('est-ruta'); $$('#stPanel .ch-next').forEach((x) => x.remove()); closeMap(); tabMapa();
  }
  // En modo pestañas, la primera pestaña abre el mapa (en el móvil no hay botón en la cabecera)
  function tabMapa() {
    const t = $('#stTabs'); if (!t || $('.tab-mapa', t)) return;
    t.insertAdjacentHTML('afterbegin', '<button class="tab-mapa" title="Mapa de capas y recorrido por áreas">▦ Mapa</button><span class="tabsep" aria-hidden="true"></span>');
    $('.tab-mapa', t).onclick = () => openMap();
  }
  function recorrido() { modo = 'capitulo'; LS.set('atalaya.rutaest.modo', modo); document.body.classList.add('est-ruta'); drawBar(); drawNext(); }

  /* Cada vez que se muestra un módulo */
  S.onShow = (id, keep) => {
    visit.add(id); LS.set('atalaya.rutaest.visto', Array.from(visit));
    // Se guarda su aspecto real para el mapa (cuando los gráficos ya están dibujados)
    setTimeout(() => { if (S.current() === id) snap.set(id, clonar($('#stPanel'))); }, keep ? 50 : 400);
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
    A.charts.hideTip();
  }

  /* ---------- Mapa de capas ---------- */
  let layout = LS.get('atalaya.rutaest.layout') || (innerWidth < 760 ? 'linea' : 'abanico');
  let foco = 0, hot = null, faseHot = null, drag = null, dragged = false;
  const LAYOUTS = [['pila', 'Pila'], ['abanico', 'Abanico'], ['circulo', 'Círculo'], ['linea', 'Línea']];
  const hint = () => (layout === 'circulo' || layout === 'linea' ? 'Arrastra, usa la rueda o las flechas para recorrer las capas · ' : '') + 'Intro abre la capa · Esc cierra el mapa';
  function openMap() {
    const ov = $('#rutaMap'); const O = ORDEN(), F = FASES();
    // La vista actual se guarda al momento; las demás se preparan una vez
    const cur = S.current(); if (cur) snap.set(cur, clonar($('#stPanel')));
    preRender(O.filter((id) => !snap.has(id)));
    ov.hidden = false; document.body.style.overflow = 'hidden';
    foco = Math.max(0, O.indexOf(cur));
    ov.innerHTML = `<div class="rm-head">
        <div><div class="rm-kicker">Sistema estratégico · tu recorrido</div><h2>Toda la empresa, <em>capa a capa</em></h2>
        <p>Cinco áreas y dieciocho módulos. Cada ventana enseña lo que hay dentro y su estado con tus datos. Pasa por encima para elevarla y púlsala para entrar.</p></div>
        <div class="rm-tools"><div class="seg" id="rmLay">${LAYOUTS.map(([k, n]) => `<button data-l="${k}" aria-pressed="${k === layout}">${n}</button>`).join('')}</div>
        <button class="btn ghost" id="rmAll">${modo === 'capitulo' ? 'Ver pestañas' : 'Recorrido por áreas'}</button><button class="icon-btn" id="rmX" aria-label="Cerrar el mapa">×</button></div></div>
      <ol class="rm-fases n5">${F.map((f, k) => `<li data-f="${k}"><b>${k + 1}</b><span>${esc(f.n)}</span><small>${f.ids.filter((x) => visit.has(x)).length}/${f.ids.length}</small></li>`).join('')}</ol>
      <div class="rm-stage" id="rmStage"><div class="rm-world" id="rmWorld">${O.map((id, i) => {
        const e = estado(id), fi = faseDe(id);
        return `<button class="rm-card e${fi}" data-i="${i}" data-id="${id}" aria-label="${esc(nombre(id))}: ${esc(Q[id] || '')}">
          <span class="rm-float"><span class="rm-chrome"><i></i><i></i><i></i><b>${String(i + 1).padStart(2, '0')} · ${esc(nombre(id))}</b>${visit.has(id) ? '<em title="Visitado">✓</em>' : ''}</span>
          <span class="rm-prev" data-prev="${id}"></span>
          <span class="rm-info"><small>${esc(F[fi].n)}</small><b>${esc(nombre(id))}</b><span>${esc(Q[id] || '')}</span>${e ? `<span class="rm-st ${e.st || ''}">${esc(e.t)}</span>` : ''}<span class="rm-open">Abrir →</span></span></span></button>`;
      }).join('')}</div></div>
      <p class="rm-hint">${hint()}</p>`;
    $$('[data-prev]', ov).forEach((p) => { const c = snap.get(p.dataset.prev); if (c) p.appendChild(c.cloneNode(true)); });
    $$('#rmLay button', ov).forEach((b) => b.onclick = () => { layout = b.dataset.l; LS.set('atalaya.rutaest.layout', layout); $$('#rmLay button', ov).forEach((x) => x.setAttribute('aria-pressed', x === b)); place(); $('.rm-hint', ov).textContent = hint(); });
    $('#rmAll', ov).onclick = () => (modo === 'capitulo' ? pestanas() : (recorrido(), closeMap()));
    $('#rmX', ov).onclick = closeMap;
    const cards = $$('.rm-card', ov);
    cards.forEach((c) => {
      c.addEventListener('pointerenter', () => { hot = +c.dataset.i; place(); });
      c.addEventListener('pointerleave', () => { hot = null; place(); });
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
      let tf = '', z = 0, op = 1;
      const isHot = hot === i, inFase = faseHot !== null && faseDe(O[i]) === faseHot, dim = faseHot !== null && !inFase;
      if (layout === 'pila') {
        const lift = isHot && i > 0 ? -(small ? 90 : 130) : 0;
        tf = `translate3d(${(i % 2 ? 1 : -1) * 5}px, ${-i * (small ? 12 : 17) + lift + (small ? 120 : 170)}px, ${-i * 38 + (isHot ? 220 : 0)}px)`;
        z = 100 - i + (isHot ? 100 : 0);
      } else if (layout === 'abanico') {
        const a = (i - (n - 1) / 2) * (small ? 5.5 : 6);
        tf = `rotateZ(${a}deg) translate3d(0, ${isHot ? -90 : 0}px, ${i * 2 + (isHot ? 120 : 0)}px)`;
        z = isHot ? 200 : 100 - Math.abs(i - (n - 1) / 2);
      } else if (layout === 'circulo') {
        const step = 360 / n, a = (i - foco) * step, R = Math.max(small ? 520 : 760, (n * (cw + 30)) / (2 * Math.PI));
        tf = `rotateY(${a}deg) translateZ(${R}px) translateZ(${isHot ? 60 : 0}px) translateY(${isHot ? -24 : 0}px)`;
        const cos = Math.cos((a * Math.PI) / 180); op = 0.2 + 0.8 * Math.max(0, cos); z = Math.round(100 + cos * 100);
      } else {
        const d = i - foco, s = Math.sign(d);
        tf = d === 0 ? `translate3d(0, ${isHot ? -14 : 0}px, 160px)` : `translate3d(${d * (gap * 0.55) + s * gap * 0.6}px, 0, ${-Math.abs(d) * 40}px) rotateY(${-s * 55}deg)`;
        op = Math.abs(d) > 5 ? 0 : 1; z = 100 - Math.abs(d);
      }
      c.style.transform = tf; c.style.zIndex = z; c.style.opacity = dim ? Math.min(op, 0.25) : op;
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
    const bar = document.createElement('nav'); bar.id = 'rutaBar'; bar.className = 'ruta-bar est'; bar.setAttribute('aria-label', 'Hoja de ruta del sistema estratégico'); document.body.appendChild(bar);
    const sub = document.createElement('div'); sub.id = 'rutaSub'; sub.className = 'ruta-sub'; $('#stPanel').before(sub);
    const ov = document.createElement('div'); ov.id = 'rutaMap'; ov.className = 'ruta-map'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Mapa de capas del sistema estratégico'); document.body.appendChild(ov);
    const rb = $('#rutaBtn'); if (rb) rb.onclick = () => openMap();
    if (modo === 'capitulo') recorrido(); else tabMapa();
    // Al entrar se ve primero todo el recorrido (una vez por sesión), salvo si se llega a un módulo concreto
    let first = true; try { first = !sessionStorage.getItem('atalaya.rutaest.intro'); sessionStorage.setItem('atalaya.rutaest.intro', '1'); } catch (e) { /* sin almacenamiento */ }
    if (first && modo === 'capitulo' && !S.mod(hash0)) setTimeout(openMap, 800);
  };
  A.rutaEst = { openMap, closeMap, recorrido, pestanas };
})();
