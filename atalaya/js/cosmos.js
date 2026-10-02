/* Atalaya · Universo detrás de cada pantalla
   El mismo espacio del puesto de mando y de la página comercial, ahora detrás de cada capítulo del simulador,
   de cada módulo del sistema estratégico y de cada sección del manual.
   · Cada pantalla tiene su propia galaxia, siempre en el mismo lugar del universo y del color de su área.
     Al cambiar de módulo la cámara viaja hasta ella.
   · Dentro de la pantalla, al bajar, la cámara se adentra un poco; el ratón inclina la vista.
   · Los titulares flotan con volumen, palabra a palabra.
   API: Atalaya.cosmos.go(clave, color)  ·  Atalaya.cosmos.type3d(raíz) */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(pointer: fine)').matches;
  const small = Math.min(innerWidth, innerHeight) < 700;

  A.loadThree = A.loadThree || (() => {
    let p = null;
    return () => p || (p = window.THREE ? Promise.resolve(window.THREE) : new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.onload = () => (window.THREE ? ok(window.THREE) : ko(new Error('Sin 3D'))); s.onerror = ko; document.head.appendChild(s); }));
  })();

  /* ---------- Titulares con volumen ---------- */
  function type3d(root) {
    if (reduce) return;
    $$('h1, h2', root || document).forEach((h) => {
      if (h.dataset.w3d || h.closest('.paper, .rp, .ruta-map, .rm-clone, .modal, dialog, .pt-intro, .lp-main')) return;
      h.dataset.w3d = '1';
      let k = 0;
      const walk = (node) => Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/); const frag = document.createDocumentFragment();
          parts.forEach((p) => { if (!p) return; if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p)); else { const s = document.createElement('span'); s.className = 'w3d'; s.style.setProperty('--i', k++); s.textContent = p; frag.appendChild(s); } });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !/^(BR|SVG|BUTTON|INPUT|SELECT)$/.test(n.tagName)) walk(n);
      });
      walk(h); h.classList.add('t3d');
    });
  }

  /* ---------- Escena ---------- */
  const st = { ready: false, key: null, color: 0xd4ae64 };
  let T, renderer, scene, cam, canvas, stations = new Map(), flight = null, camPos, camLook, mx = 0, my = 0, tmx = 0, tmy = 0, busyUntil = 0;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rndOf = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  function build() {
    T = window.THREE;
    canvas = document.createElement('canvas'); canvas.id = 'cosmos'; canvas.setAttribute('aria-hidden', 'true');
    const sky = $('#sky'); if (sky) sky.after(canvas); else document.body.prepend(canvas);
    try { renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' }); } catch (e) { canvas.remove(); return false; }
    renderer.setPixelRatio(Math.min(1.25, devicePixelRatio || 1)); renderer.setClearColor(0x000000, 0);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);
    // Fondo común: una esfera de estrellas muy grande, en tres capas
    [[small ? 2200 : 5000, 1.4, 0.9, 900], [small ? 900 : 2000, 2.2, 0.75, 700], [small ? 300 : 700, 3, 0.6, 500]].forEach(([n, size, op, R]) => {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, th = Math.random() * 6.283, r = R * (0.75 + Math.random() * 0.25), s = Math.sqrt(1 - u * u); pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3); const q = Math.random(), c = q < 0.15 ? [1, 0.85, 0.6] : q < 0.3 ? [0.65, 0.78, 1] : [0.92, 0.92, 1], b = 0.45 + Math.random() * 0.55; col.set([c[0] * b, c[1] * b, c[2] * b], i * 3); }
      scene.add(pts(pos, col, size, op));
    });
    camPos = new T.Vector3(0, 0, 60); camLook = new T.Vector3(0, 0, 0);
    size(); addEventListener('resize', size);
    addEventListener('pointermove', (e) => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; busy(800); }, { passive: true });
    addEventListener('scroll', () => busy(900), { passive: true });
    document.body.classList.add('cosmos3d');
    st.ready = true;
    return true;
  }
  let dot, glowCache = {};
  function tex(size, f) { const c = document.createElement('canvas'); c.width = c.height = size; f(c.getContext('2d'), size); return new T.CanvasTexture(c); }
  function glow(r, g, b) { const k = r + ',' + g + ',' + b; return glowCache[k] || (glowCache[k] = tex(128, (x, s) => { const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, `rgba(${k},1)`); gr.addColorStop(0.25, `rgba(${k},0.45)`); gr.addColorStop(1, `rgba(${k},0)`); x.fillStyle = gr; x.fillRect(0, 0, s, s); })); }
  function pts(pos, col, size, op) {
    dot = dot || tex(64, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    return new T.Points(g, new T.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending }));
  }
  function sprite(map, sc, op) { const s = new T.Sprite(new T.SpriteMaterial({ map, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(sc, sc, 1); return s; }
  function size() { if (!renderer) return; renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); busy(300); }
  const busy = (ms) => { busyUntil = Math.max(busyUntil, performance.now() + ms); };

  /* Una galaxia por pantalla: posición fija (según su nombre) y color de su área */
  function station(key, color) {
    if (stations.has(key)) return stations.get(key);
    const R = rndOf(hash(key)), idx = stations.size;
    const ang = R() * 6.283, rad = 260 + R() * 260, y = (R() - 0.5) * 220;
    const center = new T.Vector3(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
    const c = new T.Color(color), core = c.clone().lerp(new T.Color(0xffffff), 0.55), edge = c.clone().lerp(new T.Color(0x4f7dff), 0.35);
    const n = small ? 3500 : 7000, Rg = 70 + R() * 40, arms = 2 + Math.floor(R() * 3);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = Math.pow(Math.random(), 1.6) * Rg, a = ((i % arms) / arms) * 6.283 + r * (4 / Rg) + (Math.random() - 0.5) * (0.45 + r / Rg), sp = (Math.random() - 0.5) * (Rg * 0.04 + r * 0.12);
      pos.set([Math.cos(a) * r + sp, (Math.random() - 0.5) * Rg * 0.05, Math.sin(a) * r + sp], i * 3);
      const cc = r < Rg * 0.35 ? core.clone().lerp(c, r / (Rg * 0.35)) : c.clone().lerp(edge, (r - Rg * 0.35) / (Rg * 0.65)); const b = 0.45 + Math.random() * 0.55;
      col.set([cc.r * b, cc.g * b, cc.b * b], i * 3);
    }
    const g = new T.Group(); g.add(pts(pos, col, 1.25, 0.8));
    const rgb = [Math.round(core.r * 255), Math.round(core.g * 255), Math.round(core.b * 255)];
    g.add(sprite(glow(...rgb), Rg * 0.55, 0.6)); g.add(sprite(glow(Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)), Rg * 1.5, 0.18));
    // Una nebulosa propia y un par de satélites dan volumen a cada sitio
    const neb = sprite(glow(Math.round(edge.r * 255), Math.round(edge.g * 255), Math.round(edge.b * 255)), Rg * 3, 0.12); neb.position.set(-Rg, Rg * 0.4, -Rg); g.add(neb);
    g.position.copy(center); g.rotation.set(0.9 + R() * 0.5, R() * 3, (R() - 0.5) * 0.8);
    scene.add(g);
    // Desde dónde se mira: la galaxia queda a la derecha y al fondo, sin tapar el contenido
    const dir = center.clone().normalize();
    const side = new T.Vector3(-dir.z, 0, dir.x).normalize();
    const eye = center.clone().sub(dir.clone().multiplyScalar(Rg * 3.2)).add(side.clone().multiplyScalar(-Rg * 1.4)).add(new T.Vector3(0, Rg * 0.5, 0));
    const s = { key, g, center, eye, look: center.clone().add(side.clone().multiplyScalar(-Rg * 0.9)), idx };
    stations.set(key, s); return s;
  }

  function go(key, color) {
    st.key = key; st.color = color || st.color;
    if (!st.ready) return;
    const s = station(key, st.color);
    if (reduce || !flight && camPos.distanceTo(s.eye) < 1) { camPos.copy(s.eye); camLook.copy(s.look); busy(300); return; }
    flight = { from: camPos.clone(), fromLook: camLook.clone(), to: s.eye.clone(), toLook: s.look.clone(), t0: performance.now(), dur: camPos.distanceTo(s.eye) > 5 ? 1700 : 300 };
    busy(flight.dur + 400);
  }

  let frame = 0, last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (!st.ready || document.hidden) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    // Sin movimiento, el universo se mueve a menos fotogramas: deja la máquina para el trabajo
    frame++; if (now > busyUntil && frame % 3) return;
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    if (flight) {
      const k = Math.min(1, (now - flight.t0) / flight.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      // Trayectoria curva: se separa del plano para que el viaje se note
      camPos.lerpVectors(flight.from, flight.to, e).add(new T.Vector3(0, Math.sin(e * Math.PI) * 60, 0));
      camLook.lerpVectors(flight.fromLook, flight.toLook, e);
      if (k >= 1) flight = null;
    }
    const sc = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    const fwd = camLook.clone().sub(camPos).normalize();
    cam.position.copy(camPos).add(fwd.multiplyScalar(sc * 70)).add(new T.Vector3(mx * 18, -my * 12, 0));
    cam.lookAt(camLook.x + mx * 6, camLook.y - my * 4, camLook.z);
    stations.forEach((s) => { s.g.rotation.y += dt * (s.key === st.key ? 0.05 : 0.02) * (fino ? 1 : 0.6); });
    renderer.render(scene, cam);
  }

  /* Páginas sin módulos (simulador en modo seguido, manual): la galaxia sigue a la sección que se lee */
  function autoSections() {
    if (!('IntersectionObserver' in window)) return;
    const secs = $$('main section[id]'); if (!secs.length) return;
    const io = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (vis && !document.body.classList.contains('ch-mode') && vis.target.id !== st.key) go(vis.target.id, A.cosmos.colorFor(vis.target.id));
    }, { threshold: [0.25, 0.5] });
    secs.forEach((s) => io.observe(s));
  }

  const PAL = [0xd4ae64, 0x199e70, 0x3987e5, 0xd95926, 0xd55181, 0x9b7bff];
  A.cosmos = {
    go, type3d,
    colorFor: (key) => PAL[hash(String(key)) % PAL.length],
    get ready() { return st.ready; }
  };

  function start() {
    type3d(document.querySelector('main'));
    if (reduce) return;
    A.loadThree().then(() => {
      if (!build()) return;
      const first = st.key || (location.hash.replace('#', '') || document.title);
      go(first, st.key ? st.color : A.cosmos.colorFor(first));
      camPos.copy(flight ? flight.to : camPos); camLook.copy(flight ? flight.toLook : camLook); flight = null; // la primera vez se aparece ya allí
      autoSections();
      requestAnimationFrame(loop);
    }).catch(() => { /* sin 3D: se queda el cielo plano */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 150)); else setTimeout(start, 150);
})();
