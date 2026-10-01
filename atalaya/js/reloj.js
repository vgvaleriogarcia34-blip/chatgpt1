/* Atalaya · Reloj de tareas
   Componente reutilizable del gestor de tiempos: esfera con el tiempo en marcha, persona, tarea y un botón por
   tipo de tiempo (al pulsar otro tipo se cierra el tramo anterior y empieza el nuevo). Puede montarse dentro del
   módulo, flotando sobre la aplicación, en una ventana siempre visible (Picture-in-Picture) o en reloj.html.
   store = { get() → estado de tiempos, commit() → guardar } */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  A.CATS_TIEMPO = [
    { k: 'produccion', n: 'Producción o servicio al cliente', c: 'Producción', fact: true },
    { k: 'comercial', n: 'Comercial y atención a clientes', c: 'Comercial', fact: false, ventas: true },
    { k: 'gestion', n: 'Gestión y administración', c: 'Gestión', fact: false },
    { k: 'reuniones', n: 'Reuniones internas', c: 'Reuniones', fact: false },
    { k: 'retrabajo', n: 'Retrabajos y errores', c: 'Errores', fact: false, waste: true },
    { k: 'esperas', n: 'Esperas, búsquedas y desplazamientos', c: 'Esperas', fact: false, waste: true },
    { k: 'formacion', n: 'Formación', c: 'Formación', fact: false }
  ];
  const CATS = A.CATS_TIEMPO;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hoy = () => new Date().toISOString().slice(0, 10);
  const hms = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((x) => String(x).padStart(2, '0')).join(':'); };
  const hm = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };
  const tone = (c) => (c.fact ? 'var(--go)' : c.waste ? 'var(--stop)' : c.ventas ? 'var(--s1)' : 'var(--gold)');

  /* Normaliza el estado: varias personas pueden tener su reloj en marcha a la vez */
  A.relojNormaliza = (T) => {
    if (!T) return T;
    T.timers = T.timers || {};
    if (T.timer) { if (T.timer.persona) T.timers[T.timer.persona] = { categoria: T.timer.categoria, tarea: T.timer.tarea, inicio: T.timer.inicio }; T.timer = null; }
    T.registros = T.registros || []; T.personas = T.personas || [];
    return T;
  };
  /* Cierra el tramo en marcha de una persona y lo guarda como registro */
  A.relojParar = (T, persona) => {
    const t = T.timers[persona]; if (!t) return null;
    const h = Math.max(1 / 60, (Date.now() - t.inicio) / 3600e3);
    const r = { fecha: new Date(t.inicio).toISOString().slice(0, 10), persona, tarea: t.tarea || 'Sin descripción', categoria: t.categoria, horas: Math.round(h * 100) / 100 };
    T.registros.push(r); delete T.timers[persona]; T.ejemplo = false;
    return r;
  };

  A.reloj = {
    mount(root, store, opts) {
      opts = opts || {};
      const doc = root.ownerDocument, win = doc.defaultView;
      if (root._rjTick) win.clearInterval(root._rjTick);
      let persona = root.dataset.persona || '';
      const draw = () => {
        const T = A.relojNormaliza(store.get());
        if (!T) { root.innerHTML = '<p class="small muted">Sin datos de tiempos.</p>'; return; }
        if (!T.personas.length) { root.innerHTML = '<p class="small">Añade primero a las personas del equipo en el <b>Gestor de tiempos</b>.</p>'; return; }
        if (!T.personas.some((p) => p.nombre === persona)) persona = (Object.keys(T.timers)[0] && T.personas.some((p) => p.nombre === Object.keys(T.timers)[0])) ? Object.keys(T.timers)[0] : T.personas[0].nombre;
        root.dataset.persona = persona;
        const run = T.timers[persona];
        const cat = run && CATS.find((c) => c.k === run.categoria);
        const R = T.registros.filter((r) => r.persona === persona && r.fecha === hoy());
        const totHoy = R.reduce((a, r) => a + (+r.horas || 0), 0) + (run ? (Date.now() - run.inicio) / 3600e3 : 0);
        const factHoy = R.filter((r) => (CATS.find((c) => c.k === r.categoria) || {}).fact).reduce((a, r) => a + (+r.horas || 0), 0) + (run && cat && cat.fact ? (Date.now() - run.inicio) / 3600e3 : 0);
        const ticks = Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * 2 * Math.PI, r1 = i % 5 ? 84 : 78; return `<line x1="${100 + Math.sin(a) * r1}" y1="${100 - Math.cos(a) * r1}" x2="${100 + Math.sin(a) * 90}" y2="${100 - Math.cos(a) * 90}" class="${i % 5 ? 'tk' : 'tk5'}"/>`; }).join('');
        root.innerHTML = `<div class="rj${opts.compact ? ' compact' : ''}">
          <div class="rj-row"><label class="rj-lbl" for="rjP">Persona</label><select id="rjP" class="input">${T.personas.map((p) => `<option value="${esc(p.nombre)}" ${p.nombre === persona ? 'selected' : ''}>${T.timers[p.nombre] ? '● ' : ''}${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="rj-dial"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="94" class="rj-face"/>${ticks}
            <circle cx="100" cy="100" r="70" class="rj-track"/><circle cx="100" cy="100" r="70" class="rj-arc" id="rjArc" style="stroke:${cat ? tone(cat) : 'transparent'}" stroke-dasharray="0 440" transform="rotate(-90 100 100)"/>
            <line id="rjHand" x1="100" y1="100" x2="100" y2="16" class="rj-hand" style="stroke:${cat ? tone(cat) : 'var(--faint)'}"/><circle cx="100" cy="100" r="4" class="rj-pin"/></svg>
            <div class="rj-center"><b id="rjTime">${run ? hms(Date.now() - run.inicio) : '00:00:00'}</b><span>${run ? esc(cat ? cat.c : '') : 'parado'}</span></div></div>
          <input id="rjT" class="input" placeholder="¿En qué estás? (tarea)" value="${esc(run ? run.tarea : root.dataset.tarea || '')}">
          <div class="rj-cats">${CATS.map((c) => `<button data-c="${c.k}" class="${run && run.categoria === c.k ? 'on' : ''}" title="${esc(c.n)}"><i style="background:${tone(c)}"></i>${c.c}</button>`).join('')}</div>
          <div class="rj-row"><button class="btn ${run ? '' : 'solid'}" id="rjGo">${run ? 'Parar' : 'Empezar'}</button><span class="rj-today">Hoy: <b>${hm(totHoy)}</b>${totHoy ? ` · ${Math.round((factHoy / totHoy) * 100)} % facturable` : ''}</span></div>
          ${!opts.compact && R.length ? `<ul class="rj-list">${R.slice(-4).reverse().map((r) => `<li><i style="background:${tone(CATS.find((c) => c.k === r.categoria) || CATS[0])}"></i>${esc(r.tarea)} <span>${hm(+r.horas || 0)}</span></li>`).join('')}</ul>` : ''}
          <p class="rj-msg" id="rjMsg"></p></div>`;
        const $ = (s) => root.querySelector(s);
        $('#rjP').onchange = (e) => { persona = e.target.value; root.dataset.persona = persona; draw(); };
        $('#rjT').oninput = (e) => { root.dataset.tarea = e.target.value; };
        $('#rjT').onchange = (e) => { const T2 = A.relojNormaliza(store.get()); if (T2.timers[persona]) { T2.timers[persona].tarea = e.target.value; store.commit('tarea'); } };
        const empezar = (k) => {
          const T2 = A.relojNormaliza(store.get());
          if (T2.timers[persona]) A.relojParar(T2, persona);
          T2.timers[persona] = { categoria: k, tarea: $('#rjT').value.trim() || (CATS.find((c) => c.k === k) || {}).n, inicio: Date.now() };
          root.dataset.ultima = k; store.commit('start'); draw();
        };
        root.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { const T2 = A.relojNormaliza(store.get()); if (T2.timers[persona] && T2.timers[persona].categoria === b.dataset.c) return; empezar(b.dataset.c); });
        $('#rjGo').onclick = () => {
          const T2 = A.relojNormaliza(store.get());
          if (T2.timers[persona]) { const r = A.relojParar(T2, persona); store.commit('stop'); draw(); const m = root.querySelector('#rjMsg'); if (m && r) m.textContent = `Guardado: ${r.tarea} · ${hm(r.horas)}`; }
          else empezar(root.dataset.ultima || 'produccion');
        };
      };
      const tick = () => {
        if (!root.isConnected) { win.clearInterval(root._rjTick); return; }
        const T = store.get(); const run = T && T.timers && T.timers[persona];
        const t = root.querySelector('#rjTime'), hand = root.querySelector('#rjHand'), arc = root.querySelector('#rjArc');
        if (!t) return;
        const ms = run ? Date.now() - run.inicio : 0;
        t.textContent = hms(ms);
        const sec = (ms / 1000) % 60, a = (sec / 60) * 2 * Math.PI;
        hand.setAttribute('x2', 100 + Math.sin(a) * 84); hand.setAttribute('y2', 100 - Math.cos(a) * 84);
        const frac = run ? ((ms / 60000) % 60) / 60 : 0; arc.setAttribute('stroke-dasharray', `${(frac * 440).toFixed(1)} 440`);
      };
      draw(); tick();
      root._rjTick = win.setInterval(tick, 1000);
      root._rjRedraw = draw;
      A.reloj.roots.add(root);
      return { redraw: draw };
    },
    roots: new Set(),
    /* Redibuja todos los relojes abiertos (pestaña, flotante y ventana aparte) tras un cambio */
    redrawAll() { A.reloj.roots.forEach((r) => { if (!r.isConnected) A.reloj.roots.delete(r); else if (r._rjRedraw) r._rjRedraw(); }); },
    /* Ventana siempre visible fuera del navegador (Chrome y Edge de escritorio) */
    async pip(store, onClose) {
      if (!('documentPictureInPicture' in window)) throw new Error('sin-pip');
      const w = await window.documentPictureInPicture.requestWindow({ width: 330, height: 560 });
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => w.document.head.appendChild(n.cloneNode(true)));
      w.document.documentElement.setAttribute('style', document.documentElement.getAttribute('style') || '');
      w.document.body.className = 'rj-window';
      w.document.title = 'Reloj de tareas · Atalaya';
      const root = w.document.createElement('div'); w.document.body.appendChild(root);
      A.reloj.mount(root, store, {});
      w.addEventListener('pagehide', () => { if (onClose) onClose(); });
      return w;
    }
  };
})();
