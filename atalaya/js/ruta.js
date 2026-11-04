/* Atalaya · Recorrido del simulador
   1) Menú: el archivador común (js/archivador.js), por fases: Mundo → Fase → Módulo (cada capítulo es un paso).
      Seis fases numeradas con sus capítulos, la ruta «Empresa › Simulador de inversión › N. Fase › Capítulo» con
      hermanos, «Abiertos», los capítulos de la fase como pestañas y, al pie, el recorrido completo y
      «← anterior · Paso N de 12 · Siguiente →». Un capítulo cada vez, en lugar de un desplazamiento infinito.
      El estado de cada paso es «visitado» (el simulador no tiene otro criterio de hecho); el estado en vivo de cada
      capítulo (veredicto, liquidez, semáforos…) se lee al pasar por encima de su nombre.
      El diccionario queda fuera del recorrido: entrada aparte al final del archivador y en el buscador.
   2) Mapa de capas: cada capítulo es una ventana flotante en 3D que deja ver un fragmento real de su contenido.
      Ya no es el menú ni se abre solo: solo con app.html#mapa (lo enlaza el tablero general; lo abre js/prioridad.js).
      Desde el mapa, «Ver todo seguido» devuelve la página completa; al elegir un capítulo se vuelve a uno cada vez. */
(function () {
  const A = window.Atalaya, F = A.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Se ha llegado a un capítulo concreto con su ancla (app.html#empresa): una apertura del mapa que llegue tarde no lo tapa
  let anclaPedida = false;
  let arch = null; // archivador común: el menú del simulador
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };

  const FASES = [
    { k: 'vista', n: 'Visión general', ids: ['puente'] },
    { k: 'empresa', n: 'Su empresa', ids: ['empresa', 'historia'] },
    { k: 'mov', n: 'El movimiento', ids: ['inversion'] },
    { k: 'ensayo', n: 'Ensayar el futuro', ids: ['horizonte', 'escenarios', 'riesgos'] },
    { k: 'cambio', n: 'Lo que cambia', ids: ['tamano', 'humano', 'estructuras'] },
    { k: 'decidir', n: 'Decidir', ids: ['plan', 'informe'] }
  ];
  const CAP = {
    puente: ['Puente de mando', '¿Cómo está todo de un vistazo?'],
    empresa: ['La empresa hoy', '¿Cómo es su empresa ahora mismo?'],
    historia: ['Historia y cuentas', '¿De dónde viene? Sus cuentas de otros años.'],
    inversion: ['La inversión', '¿Qué quiere hacer y cómo lo paga?'],
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
  const APARTE = ['diccionario']; // fuera del recorrido: no cuenta como paso
  const ORDEN = FASES.flatMap((f) => f.ids).concat(APARTE);
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

  /* ---------- Modo capítulo ----------
     Siempre se entra capítulo a capítulo; «Ver todo seguido» (desde el mapa) dura hasta elegir otro capítulo. */
  let modo = 'capitulo';
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

  // Historial: cada capítulo abierto es una entrada (atrás y adelante recorren lo visitado); al entrar y al
  // volver con atrás se sustituye la entrada en lugar de añadir otra
  let arrancado = false;
  const marcar = (id, sustituir) => {
    if (location.hash === '#' + id) return;
    try { if (sustituir || !arrancado) history.replaceState(null, '', '#' + id); else history.pushState(null, '', '#' + id); } catch (e) { /* sin historial */ }
  };
  function show(id, quiet, sustituir) {
    if (!document.getElementById(id)) return;
    actual = id; visit.add(id); LS.set('atalaya.ruta.visto', Array.from(visit));
    document.body.classList.add('ch-mode');
    sections().forEach((s) => s.classList.toggle('ch-on', s.id === id));
    marcar(id, sustituir); arrancado = true;
    closeMap();
    // Un solo pie (recorrido completo y anterior · siguiente): el del capítulo abierto
    $$('main > section.chapter > :is(.ar-pie, .ar-recorrido)').forEach((x) => { if (x.parentNode.id !== id) x.remove(); });
    if (arch) arch.refrescar();
    if (A.cosmos) { const fi = faseDe(id); A.cosmos.go(id, [0xecd6a6, 0x3987e5, 0xd4ae64, 0xd55181, 0x199e70, 0xd95926][fi] || 0x9ba4ba); }
    if (!quiet) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // Los gráficos y el 3D se recalculan al hacerse visibles
    setTimeout(() => dispatchEvent(new Event('resize')), 60);
  }
  // Ver todo seguido: todos los capítulos en una página; sin pie de paso (el archivador sigue abriendo capítulos)
  function seguido() {
    modo = 'seguido';
    document.body.classList.remove('ch-mode'); sections().forEach((s) => s.classList.remove('ch-on'));
    $$('main .ar-pie, main .ar-recorrido, .ch-next').forEach((x) => x.remove());
    closeMap(); setTimeout(() => dispatchEvent(new Event('resize')), 60);
  }
  function capitulos(id) { modo = 'capitulo'; show(id || actual || 'puente'); }

  /* ---------- Archivador: fases y capítulos ---------- */
  // El estado en vivo acompaña a la pregunta de cada capítulo (se ve al pasar por encima de su nombre)
  const pregunta = (id) => { const e = estado(id); return CAP[id][1] + (e && e.t ? ' · Ahora: ' + e.t : ''); };
  const areasArch = () => FASES.map((f) => ({ k: f.k, n: f.n, modulos: f.ids.map((id) => ({ k: id, n: CAP[id][0], pregunta: pregunta(id) })) }));
  // Sin criterio de «hecho» en el simulador: verde = capítulo ya visitado, ámbar = el abierto
  const estadoArch = (k) => (k === actual ? 'curso' : visit.has(k) ? 'hecho' : '');
  function montarArch() {
    if (!A.archivador || arch) return;
    document.body.classList.add('sim-arch');
    arch = A.archivador.montar({
      mundo: 'sim', secuencial: true, recorrido: true, hechoN: 'visitado',
      areas: areasArch, aparte: APARTE.map((id) => ({ k: id, n: CAP[id][0], pregunta: CAP[id][1] })),
      actual: () => actual, ir: (k) => capitulos(k), estado: estadoArch,
      antes: document.getElementById('puente'),
      panel: () => (document.body.classList.contains('ch-mode') ? document.getElementById(actual) : null)
    });
    // El botón de las áreas (carpeta) va junto al de los mundos: la barra del simulador ya lleva escenarios, veredicto y nota
    const bar = $('.topbar'), cp = bar && $('.ar-carp', bar);
    const colocar = () => { const ref = $('.bm-wrap', bar) || $('.brand', bar); if (cp && ref && ref.nextElementSibling !== cp) ref.after(cp); };
    colocar(); setTimeout(colocar, 1500); setTimeout(colocar, 4000);
    if (A.buscador) A.buscador.acciones.push({ n: 'Ver todo el simulador seguido', d: 'Simulador de inversión · todos los capítulos en una página', c: '#d4ae64', ir: seguido });
  }

  /* ---------- Mapa de capas en 3D ---------- */
  let layout = LS.get('atalaya.ruta.layout') || (innerWidth < 760 ? 'linea' : 'pila');
  let foco = 0, hot = null, faseHot = null;
  const LAYOUTS = [['pila', 'Pila'], ['abanico', 'Abanico'], ['circulo', 'Círculo'], ['linea', 'Línea']];
  let salida = 0; // pequeña espera al salir de una capa: evita que suba y baje sin parar
  // Textos de ayuda según el dispositivo: con el dedo no hay «pasar por encima» ni rueda
  const tactil = () => !!(A.platform && A.platform.tactil && A.platform.tactil());
  const pista = () => (tactil() ? (layout === 'circulo' || layout === 'linea' ? 'Deslice para recorrer las capas · toque una para abrirla' : 'Toque una capa para abrirla')
    : (layout === 'circulo' || layout === 'linea' ? 'Arrastre, use la rueda o las flechas para recorrer las capas · ' : '') + 'Intro abre la capa · Esc cierra el mapa');
  // Sin las cifras de la empresa, lo primero es cargarlas: la acción clave va en la cabecera del mapa
  const sinDatos = () => { const c = A.appCtx ? A.appCtx() : null; return !!(c && c.state && c.state.empresa && !(c.state.empresa.ventas > 0)); };
  function openMap() {
    const ov = $('#rutaMap'); ov.hidden = false; document.body.style.overflow = 'hidden';
    foco = Math.max(0, ORDEN.indexOf(actual));
    const vacia = sinDatos();
    if (!actual) show('puente', true);
    ov.innerHTML = `<div class="rm-head">
        <div><div class="rm-kicker">Simulador de inversión · su recorrido</div><h2>Todo el camino, <em>capa a capa</em></h2>
        <p>Seis fases, de cómo es su empresa hoy a la decisión. ${tactil() ? 'Toque una capa para entrar.' : 'Pase por encima de una capa para ver qué hay dentro y púlsela para entrar.'}</p>
        ${vacia ? '<div class="rm-clave" role="group" aria-label="Para empezar"><b>Para empezar, faltan las cifras de su empresa.</b><button class="btn solid small" data-clave="cuentas">Cargar mis cuentas</button><button class="btn small" data-clave="preguntas">Responder unas preguntas</button></div>' : ''}</div>
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
      <p class="rm-hint">${pista()}</p>`;
    // Fragmentos reales de cada capítulo como vista previa
    $$('[data-prev]', ov).forEach((p) => {
      const sec = document.getElementById(p.dataset.prev); if (!sec) return;
      const c = sec.cloneNode(true);
      c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id')); c.removeAttribute('id');
      c.querySelectorAll('canvas, script, .ch-next, .ar-pie, .ar-recorrido, input[type="file"]').forEach((x) => x.remove());
      c.classList.remove('ch-on'); c.classList.add('rm-clone');
      p.appendChild(c);
    });
    $$('#rmLay button', ov).forEach((b) => b.onclick = () => { layout = b.dataset.l; LS.set('atalaya.ruta.layout', layout); $$('#rmLay button', ov).forEach((x) => x.setAttribute('aria-pressed', x === b)); place(); $('.rm-hint', ov).textContent = pista(); });
    $$('[data-clave]', ov).forEach((b) => b.onclick = () => { closeMap(); if (b.dataset.clave === 'cuentas') capitulos('empresa'); else preguntas(); });
    $('#rmAll', ov).onclick = seguido;
    const x = $('#rmX', ov); if (x) x.onclick = closeMap;
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
      let tf = '', z = 0, op = 1, up = '';
      const isHot = hot === i, inFase = faseHot !== null && faseDe(ORDEN[i]) === faseHot, dim = faseHot !== null && !inFase;
      if (layout === 'pila') {
        // Las capas de detrás quedan más altas y lejos: asoma su barra de título, como carpetas apiladas
        const k = i;
        tf = `translate3d(${(i % 2 ? 1 : -1) * 5}px, ${-k * (small ? 16 : 24) + (small ? 110 : 160)}px, ${-k * 45}px)`; up = i > 0 ? `0 ${small ? -90 : -130}px 220px` : '0 0 220px';
        z = 100 - k + (isHot ? 100 : 0);
      } else if (layout === 'abanico') {
        const a = (i - (n - 1) / 2) * (small ? 9 : 8.5);
        tf = `rotateZ(${a}deg) translate3d(0, 0, ${i * 2}px)`; up = '0 -90px 120px';
        z = isHot ? 200 : 100 - Math.abs(i - (n - 1) / 2);
      } else if (layout === 'circulo') {
        const step = 360 / n, a = (i - foco) * step, R = Math.max(small ? 420 : 640, (n * (cw + 30)) / (2 * Math.PI));
        tf = `rotateY(${a}deg) translateZ(${R}px)`; up = '0 -24px 60px';
        const cos = Math.cos((a * Math.PI) / 180); op = 0.25 + 0.75 * Math.max(0, cos); z = Math.round(100 + cos * 100);
      } else {
        const d = i - foco, s = Math.sign(d);
        up = '0 -14px 40px';
        tf = d === 0 ? 'translate3d(0, 0, 160px)' : `translate3d(${d * (gap * 0.55) + s * gap * 0.6}px, 0, ${-Math.abs(d) * 40}px) rotateY(${-s * 55}deg)`;
        op = Math.abs(d) > 5 ? 0 : 1; z = 100 - Math.abs(d);
      }
      c.style.transform = tf; c.firstElementChild.style.translate = isHot ? up : '';
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

  /* Responder las preguntas de la empresa: el botón del capítulo «La empresa hoy» las abre cuando el simulador ya ha arrancado */
  function preguntas() {
    capitulos('empresa');
    let n = 0; const intento = () => { const b = document.getElementById('qEmpresa'); if (b && document.querySelector('#account .acc-btn')) b.click(); else if (++n < 40) setTimeout(intento, 250); };
    setTimeout(intento, 100);
  }

  /* ---------- Arranque ---------- */
  function init() {
    if (!document.getElementById('puente')) return;
    montarArch();
    const ov = document.createElement('div'); ov.id = 'rutaMap'; ov.className = 'ruta-map'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Mapa de capas del simulador'); document.body.appendChild(ov);
    // Atrás y adelante del navegador dentro del simulador: se vuelve al capítulo de esa entrada
    const alVolver = () => { if (!document.body.classList.contains('ch-mode')) return; const k = location.hash.replace('#', ''); anclaPedida = k !== 'mapa' && ORDEN.includes(k); if (k === 'mapa') { openMap(); return; } closeMap(); const d = ORDEN.includes(k) ? k : !k ? 'puente' : null; if (d && d !== actual) show(d, false, true); };
    addEventListener('popstate', alVolver); addEventListener('hashchange', alVolver);
    const h = location.hash.replace('#', '');
    // app.html#preguntas: entrada desde la primera visita
    if (h === 'preguntas') { preguntas(); return; }
    if (ORDEN.includes(h)) { anclaPedida = true; show(h, true); return; }
    show('puente', true);
    // El mapa ya no se abre solo al entrar: solo con app.html#mapa (lo abre js/prioridad.js; si no, aquí)
    if (h === 'mapa') setTimeout(() => { if (!anclaPedida && $('#rutaMap').hidden) openMap(); }, 2500);
  }
  // La apertura desde fuera (app.html#mapa, js/prioridad.js) llega con retraso: no tapa un capítulo pedido después
  A.ruta = { openMap: () => { if (!anclaPedida) openMap(); }, closeMap, show, seguido, capitulos, FASES, CAP, APARTE, actual: () => (document.body.classList.contains('ch-mode') ? actual : null) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
