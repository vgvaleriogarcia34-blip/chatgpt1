/* Atalaya · Landing en el espacio
   1) Fondo: el mismo universo del puesto de mando (estrellas en capas, galaxia, nebulosas y polvo cercano).
      Al bajar por la página la cámara avanza entre las estrellas; el ratón inclina la vista.
   2) Todo flota: tarjetas, cifras, planes, pasos y preguntas son piezas en 3D a distintas profundidades.
      Se mecen solas, se inclinan con el ratón y se acercan cuando el cursor llega a ellas.
   3) Titulares con volumen: cada palabra flota en su propio plano y el titular gira con el ratón.
   Las posiciones se calculan sobre la maqueta sin transformar, así nada tiembla al pasar por encima. */
(function () {
  const A = window.Atalaya || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(pointer: fine)').matches;
  if (!document.body.classList.contains('lp')) return;

  /* ---------- Titulares: cada palabra en su plano ---------- */
  function partir(h) {
    if (h.dataset.w3d) return; h.dataset.w3d = '1';
    let k = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/); if (parts.length === 1 && !parts[0]) return;
          const frag = document.createDocumentFragment();
          parts.forEach((p) => { if (!p) return; if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p)); else { const s = document.createElement('span'); s.className = 'w3d'; s.style.setProperty('--i', k++); s.textContent = p; frag.appendChild(s); } });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(h);
    h.classList.add('t3d');
  }
  if (!reduce) $$('.lp-h1, .lp-h2').forEach(partir);

  /* ---------- Piezas flotantes ---------- */
  const SEL_CARD = '.lp-pains > .lp-card, .lp-duo > .lp-card, .lp-stats, .lp-steps > li, #plans > .plan, .lp-compare, .faq > details, .lp-final, .lp-demo-cta, #mods > .lp-mod, .lp-kicker, .lp-per, .lp-ways > .lp-card, .lp-team > .lp-card, .lp-case, .lp-band, .lp-seq, .lp-origen';
  const SEL_TYPE = '.lp-h1, .lp-h2';
  const items = [];
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  function collect() {
    $$(SEL_CARD + ', ' + SEL_TYPE).forEach((el) => {
      if (el._f3) return;
      const type = el.matches(SEL_TYPE);
      // Cada pieza tiene su profundidad y su postura de reposo: unas más cerca, otras más lejos y algo giradas
      const f = { el, type, d: rnd() * 2 - 1, rx0: (rnd() - 0.5) * (type ? 4 : 7), ry0: (rnd() - 0.5) * (type ? 6 : 10), ph: rnd() * 6.28, c: { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0 }, h: null, lifted: false };
      el._f3 = f; el.classList.add('f3d'); items.push(f);
    });
    measure();
  }
  // Posición en la página sin transformaciones (offsetTop/offsetLeft no las tienen en cuenta)
  function measure() {
    items.forEach((f) => {
      let x = 0, y = 0, n = f.el;
      while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      f.h = { x, y, w: f.el.offsetWidth, h: f.el.offsetHeight };
    });
  }
  // Piezas que se crean después (módulos del explorador al cambiar de área, planes)
  if ('MutationObserver' in window) { const mo = new MutationObserver(() => { for (let i = items.length - 1; i >= 0; i--) if (!items[i].el.isConnected) items.splice(i, 1); collect(); }); ['#mods', '#plans'].forEach((s) => { const n = $(s); if (n) mo.observe(n, { childList: true }); }); }
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  setInterval(measure, 1500); // por si cambia la maqueta (preguntas abiertas, gráficos)
  document.addEventListener('toggle', measure, true);

  let px = -9999, py = -9999, mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });
  document.addEventListener('pointerleave', () => { px = py = -9999; tmx = tmy = 0; });

  function frame(dt, t) {
    const k = 1 - Math.exp(-dt * 7);
    mx += (tmx - mx) * k; my += (tmy - my) * k;
    const vh = innerHeight, sy = scrollY;
    for (const f of items) {
      const h = f.h; if (!h) continue;
      const top = h.y - sy;
      if (top > vh + 200 || top + h.h < -200) continue; // fuera de la vista: no se toca
      const cy = top + h.h / 2, sf = Math.max(-1, Math.min(1, (cy - vh / 2) / vh));
      // Cercanía del cursor al rectángulo de reposo (no al transformado): estable, sin temblores
      let p = 0, lx = 0.5, ly = 0.5;
      if (fino && px > -999) {
        const dx = px - Math.max(h.x, Math.min(px, h.x + h.w)), dy = py - Math.max(top, Math.min(py, top + h.h));
        const dist = Math.hypot(dx, dy); p = Math.max(0, 1 - dist / (f.type ? 160 : 230)); p = p * p * (3 - 2 * p);
        lx = Math.max(0, Math.min(1, (px - h.x) / h.w)); ly = Math.max(0, Math.min(1, (py - top) / h.h));
      }
      const bob = Math.sin(t * 0.7 + f.ph) * (f.type ? 3 : 6), depth = 0.6 + 0.4 * f.d;
      const T = f.type
        ? { tx: -mx * 14 * depth, ty: -my * 8 + bob, tz: 10 + p * 30, rx: f.rx0 - my * 10 - sf * 6, ry: f.ry0 + mx * 14 }
        : { tx: -mx * 26 * depth, ty: -my * 16 * depth + bob, tz: f.d * 45 + p * 95, rx: f.rx0 * (1 - p) - sf * 7 - my * 5 + (0.5 - ly) * 9 * p, ry: f.ry0 * (1 - p) + mx * 7 + (lx - 0.5) * 11 * p };
      const c = f.c;
      for (const key in T) c[key] += (T[key] - c[key]) * k;
      f.el.style.transform = `perspective(1300px) translate3d(${c.tx.toFixed(2)}px, ${c.ty.toFixed(2)}px, ${c.tz.toFixed(1)}px) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg)`;
      if (!f.type) {
        const on = p > 0.85;
        if (on) { f.el.style.setProperty('--mx', lx * 100 + '%'); f.el.style.setProperty('--my', ly * 100 + '%'); }
        if (on !== f.lifted) { f.lifted = on; f.el.classList.toggle('lifted', on); }
      }
    }
  }

  /* ---------- Fondo: universo en 3D ---------- */
  let draw3d = null;
  function space() {
    const T = window.THREE, cv = $('#lpSpace'); if (!T || !cv) return;
    let r; try { r = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return; }
    const small = Math.min(innerWidth, innerHeight) < 700;
    r.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); r.setClearColor(0x000000, 0);
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 3000);
    const tex = (size, f) => { const c = document.createElement('canvas'); c.width = c.height = size; f(c.getContext('2d'), size); return new T.CanvasTexture(c); };
    const glow = (R, G, B) => tex(128, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, `rgba(${R},${G},${B},1)`); g.addColorStop(0.25, `rgba(${R},${G},${B},0.45)`); g.addColorStop(1, `rgba(${R},${G},${B},0)`); x.fillStyle = g; x.fillRect(0, 0, s, s); });
    const dot = tex(64, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
    const sprite = (map, sc, op) => { const s = new T.Sprite(new T.SpriteMaterial({ map, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(sc, sc, 1); return s; };
    const pts = (pos, col, size, op) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); return new T.Points(g, new T.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending })); };
    // Un túnel de estrellas a lo largo del recorrido de la cámara: al bajar por la página se viaja entre ellas
    const LEN = 1400;
    [[small ? 1800 : 4200, 1.3, 0.9], [small ? 500 : 1100, 1.9, 0.7]].forEach(([n, size, op]) => {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, rr = 60 + Math.pow(Math.random(), 0.6) * 240;
        pos.set([Math.cos(a) * rr, Math.sin(a) * rr * 0.7, 80 - Math.random() * LEN], i * 3);
        const q = Math.random(), c = q < 0.15 ? [1, 0.85, 0.6] : q < 0.3 ? [0.65, 0.78, 1] : [0.92, 0.92, 1], b = 0.45 + Math.random() * 0.55;
        col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
      }
      scene.add(pts(pos, col, size, op));
    });
    // Galaxias y nebulosas repartidas en profundidad
    const galaxy = (z, x, y, R, rot) => {
      const n = small ? 5000 : 11000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), a = new T.Color(0xffd79a), m = new T.Color(0xc58cff), e = new T.Color(0x4f7dff);
      for (let i = 0; i < n; i++) { const r = Math.pow(Math.random(), 1.7) * R, ang = ((i % 4) / 4) * 6.283 + r * (4.5 / R) + (Math.random() - 0.5) * (0.5 + r / R), sp = (Math.random() - 0.5) * (R * 0.04 + r * 0.12); pos.set([Math.cos(ang) * r + sp, (Math.random() - 0.5) * R * 0.04, Math.sin(ang) * r + sp], i * 3); const c = r < R * 0.35 ? a.clone().lerp(m, r / (R * 0.35)) : m.clone().lerp(e, (r - R * 0.35) / (R * 0.65)); const b = 0.5 + Math.random() * 0.5; col.set([c.r * b, c.g * b, c.b * b], i * 3); }
      const g = new T.Group(); g.add(pts(pos, col, 1.4, 0.65)); g.add(sprite(glow(255, 214, 150), R * 0.45, small ? 0.35 : 0.55)); g.add(sprite(glow(255, 180, 110), R * 1.1, 0.2));
      g.position.set(x, y, z); g.rotation.set(...rot); scene.add(g); return g;
    };
    const gals = [galaxy(-360, 230, -20, 140, [1.1, 0.2, 0.4]), galaxy(-900, 300, 70, 200, [0.9, -0.3, -0.5]), galaxy(-1500, 260, -60, 260, [1.2, 0.1, 0.9])];
    [[60, 90, 200, -120, 30, -200, 300, 0.22], [200, 70, 255, 160, -60, -520, 360, 0.18], [40, 160, 190, -140, -40, -760, 340, 0.18], [212, 150, 80, 120, 70, -1050, 380, 0.14], [90, 60, 180, -60, -90, -1300, 520, 0.22]].forEach(([R, G, B, x, y, z, s, o]) => { const sp = sprite(glow(R, G, B), s, o); sp.position.set(x, y, z); sp.material.rotation = Math.random() * 3; scene.add(sp); });
    // Dos mundos lejanos que acompañan el recorrido: el dorado (simulador) y el azul (sistema estratégico)
    const orb = (c1, c2, x, y, z, s) => { const m = new T.Mesh(new T.SphereGeometry(s, 32, 24), new T.MeshBasicMaterial({ color: c1 })); m.position.set(x, y, z); scene.add(m); const g = sprite(glow(...c2), s * 5, 0.55); g.position.copy(m.position); scene.add(g); return m; };
    const wGold = orb(0xd4ae64, [255, 205, 130], 105, 34, -300, 6), wBlue = orb(0x6fa8ff, [110, 160, 255], 125, -30, -700, 7);
    // Polvo cercano: pasa junto a la cámara y da sensación de avance
    const dn = small ? 260 : 600, dpos = new Float32Array(dn * 3), dcol = new Float32Array(dn * 3).fill(0.55);
    for (let i = 0; i < dn; i++) dpos.set([(Math.random() - 0.5) * 140, (Math.random() - 0.5) * 90, 60 - Math.random() * LEN], i * 3);
    scene.add(pts(dpos, dcol, 0.5, 0.5));

    const size = () => { r.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
    size(); addEventListener('resize', size);
    document.body.classList.add('space3d');
    let cz = 60;
    draw3d = (dt, t) => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight), prog = scrollY / max;
      const tz = 60 - prog * (LEN - 260);
      cz += (tz - cz) * (1 - Math.exp(-dt * 3));
      cam.position.set(mx * 14 + Math.sin(t * 0.1) * 3, -my * 9 + Math.cos(t * 0.13) * 2, cz);
      cam.lookAt(mx * 4, -my * 3, cz - 100);
      cam.rotation.z = Math.sin(prog * 3.1) * 0.06;
      gals.forEach((g, i) => { g.rotation.z += dt * (0.01 + i * 0.004); });
      wGold.rotation.y += dt * 0.2; wBlue.rotation.y -= dt * 0.15;
      r.render(scene, cam);
    };
  }
  // Three.js solo se descarga cuando la página ya se ha mostrado
  const startSpace = () => { if (reduce) return; (A.loadThree ? A.loadThree() : Promise.resolve(window.THREE)).then(space).catch(() => { /* se queda el cielo plano */ }); };
  if (document.readyState === 'complete') setTimeout(startSpace, 200); else addEventListener('load', () => setTimeout(startSpace, 200));

  /* ---------- Bucle único ---------- */
  if (reduce) return;
  collect();
  let last = performance.now(), visible = !document.hidden;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; last = performance.now(); });
  (function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)), t = now / 1000; last = now;
    frame(dt, t);
    if (draw3d) draw3d(dt, t);
  })(last);
})();
