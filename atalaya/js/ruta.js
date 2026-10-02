/* Atalaya · Recorrido del simulador
   1) Mapa de capas: cada capítulo es una ventana flotante en 3D que deja ver un fragmento real de su contenido.
      Se ordenan en pila, abanico, círculo o línea; al pasar por encima se elevan y al pulsarlas se abren.
   2) Hoja de ruta: seis fases siempre visibles y un capítulo cada vez (anterior / siguiente), en lugar de un
      desplazamiento infinito. «Ver todo seguido» devuelve la página completa. */
(function () {
  const A = window.Atalaya, F = A.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };

  const FASES = [
    { k: 'vista', n: 'Visión general', ids: ['puente'] },
    { k: 'empresa', n: 'Tu empresa', ids: ['empresa', 'historia'] },
    { k: 'mov', n: 'El movimiento', ids: ['inversion'] },
    { k: 'ensayo', n: 'Ensayar el futuro', ids: ['horizonte', 'escenarios', 'riesgos'] },
    { k: 'cambio', n: 'Lo que cambia', ids: ['tamano', 'humano', 'estructuras'] },
    { k: 'decidir', n: 'Decidir', ids: ['plan', 'informe'] }
  ];
  const CAP = {
    puente: ['Puente de mando', '¿Cómo está todo de un vistazo?'],
    empresa: ['La empresa hoy', '¿Cómo es tu empresa ahora mismo?'],
    historia: ['Historia y cuentas', '¿De dónde viene? Tus cuentas de otros años.'],
    inversion: ['La inversión', '¿Qué quieres hacer y cómo lo pagas?'],
    horizonte: ['Horizonte 3D', '¿Qué pasa si cambian dos cosas a la vez?'],
    escenarios: ['Escenarios', '¿Y si sale peor, o mejor?'],
    riesgos: ['Semáforos y riesgos', '¿Qué hay que vigilar?'],
    tamano: ['Nuevo tamaño', '¿Cómo será la empresa después?'],
    humano: ['Sistema humano', '¿Está el equipo preparado?'],
    estructuras: ['Estructuras', '¿Hay otra forma de hacerlo?'],
    plan: ['Meta y plan', '¿Qué tocar para llegar a la meta?'],
    informe: ['Informe', 'El dossier para decidir.'],
    diccionario: ['Diccionario', 'Los conceptos, explicados en llano.']
  };
  const ORDEN = FASES.flatMap((f) => f.ids).concat(['diccionario']);
  const faseDe = (id) => FASES.findIndex((f) => f.ids.includes(id));
  const visit = new Set(LS.get('atalaya.ruta.visto') || []);

  /* Estado en vivo de cada capítulo, en una frase corta */
  function estado(id) {
    const c = A.appCtx ? A.appCtx() : null; if (!c || !c.state) return null;
    const s = c.state, r = c.ctx && c.ctx.active;
    const st = (k) => (k === 'go' ? 'ok' : k);
    try {
      switch (id) {
        case 'puente': return r ? { t: r.verdict.titulo, st: st(r.verdict.key) } : null;
        case 'empresa': return { t: `${F.eur(s.empresa.ventas)} de ventas · ${s.empresa.plantilla} personas` };
        case 'historia': return s.historico && s.historico.anios && s.historico.anios.length ? { t: `${s.historico.anios.length} años de cuentas cargados`, st: 'ok' } : { t: 'Sin cuentas cargadas (opcional)' };
        case 'inversion': return r ? { t: `${F.eur(s.inversion.importe)} · ${r.dim.clase.toLowerCase()}` } : null;
        case 'escenarios': return r ? { t: `Liquidez mínima ${F.eur(r.cajaRef)}`, st: r.cajaRef < 0 ? 'stop' : r.cajaRef < s.meta.cajaMin ? 'warn' : 'ok' } : null;
        case 'riesgos': { if (!r || !r.lights) return null; const red = r.lights.filter((l) => l.estado === 'stop').length, amb = r.lights.filter((l) => l.estado === 'warn').length; return { t: red ? `${red} en rojo · ${amb} en ámbar` : amb ? `${amb} en ámbar, ninguno en rojo` : 'Todo en verde', st: red ? 'stop' : amb ? 'warn' : 'ok' }; }
        case 'tamano': return r ? { t: `${F.eur(r.tamano.antes.ventas)} → ${F.eur(r.tamano.despues.ventas)}` } : null;
        case 'humano': return r && r.humano ? { t: `Preparación ${Math.round(r.humano.score)}/100`, st: r.humano.score >= 70 ? 'ok' : r.humano.score >= 50 ? 'warn' : 'stop' } : null;
        case 'estructuras': return { t: A.STRUCTURES[s.estructura].nombre };
        case 'plan': if (!r || !r.metas) return null; { const ok = r.metas.filter((m) => m.ok).length; return { t: `${ok} de ${r.metas.length} metas cumplidas`, st: ok === r.metas.length ? 'ok' : ok >= r.metas.length - 1 ? 'warn' : 'stop' }; }
        case 'informe': return { t: 'Listo para generar' };
        case 'horizonte': return { t: 'Terreno en 3D de todas las combinaciones' };
        default: return null;
      }
    } catch (e) { return null; }
  }

  /* ---------- Modo capítulo ---------- */
  let modo = LS.get('atalaya.ruta.modo') || 'capitulo';
  let actual = null;
  const sections = () => ORDEN.map((id) => document.getElementById(id)).filter(Boolean);
  // Cualquier salto a un elemento (semáforo, dato, asistente, barra lateral) abre antes su capítulo
  const nativeSIV = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (o) {
    if (document.body.classList.contains('ch-mode')) {
      const sec = this.matches && this.matches('section.chapter') ? this : this.closest && this.closest('section.chapter');
      if (sec && sec.id && sec.id !== actual) { show(sec.id, true); if (sec === this) { scrollTo({ top: 0 }); return; } }
    }
    return nativeSIV.call(this, o);
  };

  function show(id, quiet) {
    if (!document.getElementById(id)) return;
    actual = id; visit.add(id); LS.set('atalaya.ruta.visto', Array.from(visit));
    document.body.classList.add('ch-mode');
    sections().forEach((s) => s.classList.toggle('ch-on', s.id === id));
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sin historial */ }
    drawBar(); drawNext();
    if (!quiet) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // Los gráficos y el 3D se recalculan al hacerse visibles
    setTimeout(() => dispatchEvent(new Event('resize')), 60);
  }
  function seguido() {
    modo = 'seguido'; LS.set('atalaya.ruta.modo', modo);
    document.body.classList.remove('ch-mode'); sections().forEach((s) => s.classList.remove('ch-on'));
    $('#rutaBar').hidden = true; $$('.ch-next').forEach((x) => x.remove());
    closeMap(); setTimeout(() => dispatchEvent(new Event('resize')), 60);
  }
  function capitulos(id) { modo = 'capitulo'; LS.set('atalaya.ruta.modo', modo); $('#rutaBar').hidden = false; show(id || actual || 'puente'); }

  /* Hoja de ruta superior */
  function drawBar() {
    const bar = $('#rutaBar'); if (!bar) return;
    const i = ORDEN.indexOf(actual), prev = ORDEN[i - 1], next = ORDEN[i + 1];
    bar.innerHTML = `<button class="rb-map" id="rbMap" title="Ver todas las capas"><i></i><i></i><i></i><span>Mapa</span></button>
      <ol class="rb-fases">${FASES.map((f, fi) => { const done = f.ids.every((x) => visit.has(x)); const on = f.ids.includes(actual); return `<li class="${on ? 'on' : ''} ${done ? 'done' : ''}"><span class="rb-fn">${fi + 1}</span><span class="rb-name">${f.n}</span><span class="rb-steps">${f.ids.map((x) => `<button data-go="${x}" class="${x === actual ? 'on' : ''} ${visit.has(x) ? 'seen' : ''}" title="${esc(CAP[x][0])}" aria-label="${esc(CAP[x][0])}"></button>`).join('')}</span></li>`; }).join('')}</ol>
      <div class="rb-nav">${prev ? `<button data-go="${prev}" class="rb-prev" title="${esc(CAP[prev][0])}">←</button>` : ''}<span class="rb-cur"><small>${faseDe(actual) >= 0 ? esc(FASES[faseDe(actual)].n) : 'Herramienta'}</small><b>${esc(CAP[actual][0])}</b></span>${next ? `<button data-go="${next}" class="rb-next" title="${esc(CAP[next][0])}">→</button>` : ''}</div>`;
    $('#rbMap', bar).onclick = () => openMap();
    $$('[data-go]', bar).forEach((b) => b.onclick = () => show(b.dataset.go));
  }
  /* Botón grande al final de cada capítulo hacia el siguiente */
  function drawNext() {
    $$('.ch-next').forEach((x) => x.remove());
    const sec = document.getElementById(actual); const i = ORDEN.indexOf(actual), next = ORDEN[i + 1]; if (!sec) return;
    const d = document.createElement('div'); d.className = 'ch-next';
    d.innerHTML = `${ORDEN[i - 1] ? `<button class="btn ghost" data-go="${ORDEN[i - 1]}">← ${esc(CAP[ORDEN[i - 1]][0])}</button>` : '<span></span>'}<button class="btn ghost" data-map>Ver el mapa</button>${next ? `<button class="btn solid" data-go="${next}">Siguiente: ${esc(CAP[next][0])} →</button>` : '<span></span>'}`;
    sec.appendChild(d);
    $$('[data-go]', d).forEach((b) => b.onclick = () => show(b.dataset.go));
    $('[data-map]', d).onclick = () => openMap();
  }

  /* ---------- Mapa de capas en 3D ---------- */
  let layout = LS.get('atalaya.ruta.layout') || (innerWidth < 760 ? 'linea' : 'pila');
  let foco = 0, hot = null, faseHot = null;
  const LAYOUTS = [['pila', 'Pila'], ['abanico', 'Abanico'], ['circulo', 'Círculo'], ['linea', 'Línea']];
  function openMap() {
    const ov = $('#rutaMap'); ov.hidden = false; document.body.style.overflow = 'hidden';
    foco = Math.max(0, ORDEN.indexOf(actual));
    const ch = A.appCtx ? A.appCtx() : null;
    ov.innerHTML = `<div class="rm-head">
        <div><div class="rm-kicker">Simulador de inversión · tu recorrido</div><h2>Todo el camino, <em>capa a capa</em></h2>
        <p>Seis fases, de cómo es tu empresa hoy a la decisión. Pasa por encima de una capa para ver qué hay dentro y púlsala para entrar.</p></div>
        <div class="rm-tools"><div class="seg" id="rmLay">${LAYOUTS.map(([k, n]) => `<button data-l="${k}" aria-pressed="${k === layout}">${n}</button>`).join('')}</div>
        <button class="btn ghost" id="rmAll">Ver todo seguido</button>${actual ? '<button class="icon-btn" id="rmX" aria-label="Cerrar el mapa">×</button>' : ''}</div></div>
      <ol class="rm-fases">${FASES.map((f, fi) => `<li data-f="${fi}"><b>${fi + 1}</b><span>${f.n}</span><small>${f.ids.filter((x) => visit.has(x)).length}/${f.ids.length}</small></li>`).join('')}</ol>
      <div class="rm-stage" id="rmStage"><div class="rm-world" id="rmWorld">${ORDEN.map((id, i) => {
        const e = estado(id), fi = faseDe(id);
        return `<button class="rm-card f${fi < 0 ? 'x' : fi}" data-i="${i}" data-id="${id}" aria-label="${esc(CAP[id][0])}: ${esc(CAP[id][1])}">
          <span class="rm-float"><span class="rm-chrome"><i></i><i></i><i></i><b>${String(i + 1).padStart(2, '0')} · ${esc(CAP[id][0])}</b>${visit.has(id) ? '<em title="Visitado">✓</em>' : ''}</span>
          <span class="rm-prev" data-prev="${id}"></span>
          <span class="rm-info"><small>${fi >= 0 ? `Fase ${fi + 1} · ${esc(FASES[fi].n)}` : 'Herramienta'}</small><b>${esc(CAP[id][0])}</b><span>${esc(CAP[id][1])}</span>${e ? `<span class="rm-st ${e.st || ''}">${esc(e.t)}</span>` : ''}<span class="rm-open">Abrir →</span></span></span></button>`;
      }).join('')}</div></div>
      <p class="rm-hint">${layout === 'circulo' || layout === 'linea' ? 'Arrastra, usa la rueda o las flechas para recorrer las capas · ' : ''}Intro abre la capa · Esc cierra el mapa</p>`;
    // Fragmentos reales de cada capítulo como vista previa
    $$('[data-prev]', ov).forEach((p) => {
      const sec = document.getElementById(p.dataset.prev); if (!sec) return;
      const c = sec.cloneNode(true);
      c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id')); c.removeAttribute('id');
      c.querySelectorAll('canvas, script, .ch-next, input[type="file"]').forEach((x) => x.remove());
      c.classList.remove('ch-on'); c.classList.add('rm-clone');
      p.appendChild(c);
    });
    $$('#rmLay button', ov).forEach((b) => b.onclick = () => { layout = b.dataset.l; LS.set('atalaya.ruta.layout', layout); $$('#rmLay button', ov).forEach((x) => x.setAttribute('aria-pressed', x === b)); place(); $('.rm-hint', ov).textContent = (layout === 'circulo' || layout === 'linea' ? 'Arrastra, usa la rueda o las flechas para recorrer las capas · ' : '') + 'Intro abre la capa · Esc cierra el mapa'; });
    $('#rmAll', ov).onclick = seguido;
    const x = $('#rmX', ov); if (x) x.onclick = closeMap;
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
      li.addEventListener('click', () => { const id = FASES[+li.dataset.f].ids[0]; foco = ORDEN.indexOf(id); if (layout === 'pila' || layout === 'abanico') abrir(foco); else place(); });
    });
    // Inclinación del espacio con el ratón, arrastre y rueda
    const stage = $('#rmStage', ov), world = $('#rmWorld', ov);
    stage.onpointermove = (e) => { if (reduce) return; const r = stage.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; world.style.setProperty('--tx', (-py * 8).toFixed(2) + 'deg'); world.style.setProperty('--ty', (px * 10).toFixed(2) + 'deg'); if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) dragged = true; const step = layout === 'circulo' ? 90 : 140; const nf = Math.max(0, Math.min(ORDEN.length - 1, drag.f - Math.round(dx / step))); if (nf !== foco) { foco = nf; place(); } } };
    let drag = null, dragged = false;
    stage.onpointerdown = (e) => { drag = { x: e.clientX, f: foco }; dragged = false; };
    addEventListener('pointerup', () => { drag = null; setTimeout(() => { dragged = false; }, 0); }, { once: false });
    stage.onwheel = (e) => { if (layout === 'pila' || layout === 'abanico') return; e.preventDefault(); foco = Math.max(0, Math.min(ORDEN.length - 1, foco + (e.deltaY + e.deltaX > 0 ? 1 : -1))); place(); };
    ov.onkeydown = (e) => {
      if (e.key === 'Escape' && actual) closeMap();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { foco = Math.min(ORDEN.length - 1, foco + 1); hot = foco; place(); cards[foco].focus({ preventScroll: true }); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { foco = Math.max(0, foco - 1); hot = foco; place(); cards[foco].focus({ preventScroll: true }); e.preventDefault(); }
    };
    place();
    setTimeout(() => (cards[foco] || cards[0]).focus({ preventScroll: true }), 50);
  }
  function closeMap() { const ov = $('#rutaMap'); if (!ov || ov.hidden) return; ov.hidden = true; ov.innerHTML = ''; document.body.style.overflow = ''; hot = null; }

  /* Posición de cada capa según el ordenamiento elegido */
  function place() {
    const cards = $$('#rutaMap .rm-card'); const n = cards.length; if (!n) return;
    const W = innerWidth, small = W < 760;
    const cw = small ? 250 : 330, gap = small ? 150 : 210;
    cards.forEach((c, i) => {
      let tf = '', z = 0, op = 1;
      const isHot = hot === i, inFase = faseHot !== null && faseDe(ORDEN[i]) === faseHot, dim = faseHot !== null && !inFase;
      if (layout === 'pila') {
        // Las capas de detrás quedan más altas y lejos: asoma su barra de título, como carpetas apiladas
        const k = i, lift = isHot && i > 0 ? -(small ? 90 : 130) : 0;
        tf = `translate3d(${(i % 2 ? 1 : -1) * 5}px, ${-k * (small ? 16 : 24) + lift + (small ? 110 : 160)}px, ${-k * 45 + (isHot ? 220 : 0)}px)`;
        z = 100 - k + (isHot ? 100 : 0);
      } else if (layout === 'abanico') {
        const a = (i - (n - 1) / 2) * (small ? 9 : 8.5);
        tf = `rotateZ(${a}deg) translate3d(0, ${isHot ? -90 : 0}px, ${i * 2 + (isHot ? 120 : 0)}px)`;
        z = isHot ? 200 : 100 - Math.abs(i - (n - 1) / 2);
      } else if (layout === 'circulo') {
        const step = 360 / n, a = (i - foco) * step, R = Math.max(small ? 420 : 640, (n * (cw + 30)) / (2 * Math.PI));
        tf = `rotateY(${a}deg) translateZ(${R}px) translateZ(${isHot ? 60 : 0}px) translateY(${isHot ? -24 : 0}px)`;
        const cos = Math.cos((a * Math.PI) / 180); op = 0.25 + 0.75 * Math.max(0, cos); z = Math.round(100 + cos * 100);
      } else {
        const d = i - foco, s = Math.sign(d);
        tf = d === 0 ? `translate3d(0, ${isHot ? -14 : 0}px, 160px)` : `translate3d(${d * (gap * 0.55) + s * gap * 0.6}px, 0, ${-Math.abs(d) * 40}px) rotateY(${-s * 55}deg)`;
        op = Math.abs(d) > 5 ? 0 : 1; z = 100 - Math.abs(d);
      }
      c.style.transform = tf;
      c.style.zIndex = z;
      c.style.opacity = dim ? Math.min(op, 0.25) : op;
      c.classList.toggle('hot', isHot || (inFase && faseHot !== null));
      c.classList.toggle('foco', i === foco && (layout === 'circulo' || layout === 'linea'));
    });
    $$('#rutaMap .rm-fases li').forEach((li) => li.classList.toggle('on', +li.dataset.f === (hot !== null ? faseDe(ORDEN[hot]) : faseHot)));
    const st = $('#rutaMap .rm-stage'); if (st) st.dataset.layout = layout;
  }

  /* Abrir una capa: la ventana se agranda hasta ocupar la pantalla y aparece el capítulo */
  function abrir(i) {
    const id = ORDEN[i]; const card = $(`#rutaMap .rm-card[data-i="${i}"]`);
    if (reduce || !card) { closeMap(); capitulos(id); return; }
    card.classList.add('opening');
    const r = card.getBoundingClientRect();
    const sx = innerWidth / r.width, sy = innerHeight / r.height;
    card.style.transition = 'transform 0.55s cubic-bezier(.2,.8,.2,1), opacity 0.55s';
    card.style.transform = `translate3d(${innerWidth / 2 - (r.left + r.width / 2)}px, ${innerHeight / 2 - (r.top + r.height / 2)}px, 300px) scale(${Math.max(sx, sy) * 0.85})`;
    $('#rutaMap').classList.add('leaving');
    setTimeout(() => { closeMap(); $('#rutaMap').classList.remove('leaving'); capitulos(id); }, 520);
  }

  /* ---------- Arranque ---------- */
  function init() {
    if (!document.getElementById('puente')) return;
    const bar = document.createElement('nav'); bar.id = 'rutaBar'; bar.className = 'ruta-bar'; bar.setAttribute('aria-label', 'Hoja de ruta del simulador'); document.body.appendChild(bar);
    const ov = document.createElement('div'); ov.id = 'rutaMap'; ov.className = 'ruta-map'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Mapa de capas del simulador'); document.body.appendChild(ov);
    const rb = document.getElementById('rutaBtn'); if (rb) rb.onclick = () => openMap();
    const h = location.hash.replace('#', '');
    if (modo === 'seguido') { bar.hidden = true; return; }
    if (ORDEN.includes(h)) { show(h, true); return; }
    show('puente', true);
    // Al entrar se ve primero todo el recorrido (una vez por sesión)
    let first = true; try { first = !sessionStorage.getItem('atalaya.ruta.intro'); sessionStorage.setItem('atalaya.ruta.intro', '1'); } catch (e) { /* sin almacenamiento */ }
    if (first) setTimeout(openMap, 700);
  }
  A.ruta = { openMap, show, seguido, capitulos };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
