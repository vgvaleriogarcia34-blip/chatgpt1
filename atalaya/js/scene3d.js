/* Atalaya · Escena 3D (Three.js r128)
 * Dos vistas: «Paisaje» (superficie de una métrica sobre dos variables) y
 * «Trayectorias» (caja de los cinco escenarios como cortinas en el tiempo).
 */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const S = (A.scene = {});
  let THREE_ = null, renderer, scene, camera, root, ray, mouse, canvas, stage;
  let cam = { theta: -0.75, phi: 0.98, radius: 21, target: null };
  let dragging = false, last = null, idleT = 0, visible = true, hoverMeshes = [], labels = [], current = null, onPick = null, pulse = null;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  S.init = function (opts) {
    stage = document.getElementById('stage');
    canvas = document.getElementById('three');
    onPick = opts.onPick;
    if (!window.THREE) {
      stage.insertAdjacentHTML('beforeend', '<div class="fallback">La vista 3D necesita conexión para cargar su motor gráfico. El resto del simulador funciona igual.</div>');
      return false;
    }
    THREE_ = window.THREE;
    try {
      renderer = new THREE_.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
      stage.insertAdjacentHTML('beforeend', '<div class="fallback">Este navegador no permite WebGL. El resto del simulador funciona igual.</div>');
      return false;
    }
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    scene = new THREE_.Scene();
    scene.fog = new THREE_.Fog(0x070c1b, 22, 46);
    camera = new THREE_.PerspectiveCamera(42, 1, 0.1, 200);
    cam.target = new THREE_.Vector3(0, 1.2, 0);
    scene.add(new THREE_.AmbientLight(0x8fa3d6, 0.55));
    const d = new THREE_.DirectionalLight(0xffffff, 0.75); d.position.set(6, 12, 8); scene.add(d);
    const g = new THREE_.PointLight(0xd4ae64, 0.9, 40); g.position.set(-8, 6, -6); scene.add(g);
    ray = new THREE_.Raycaster(); mouse = new THREE_.Vector2();
    bindControls();
    new ResizeObserver(resize).observe(stage);
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(stage);
    resize();
    loop();
    return true;
  };

  function resize() {
    if (!renderer) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    cam.radius = Math.max(cam.radius, w < 600 ? 34 : 19);
    camera.updateProjectionMatrix();
  }

  function bindControls() {
    canvas.addEventListener('pointerdown', (e) => { dragging = true; last = { x: e.clientX, y: e.clientY, t: Date.now(), sx: e.clientX, sy: e.clientY }; canvas.setPointerCapture(e.pointerId); idleT = 0; });
    canvas.addEventListener('pointerup', (e) => {
      dragging = false;
      const moved = last && Math.hypot(e.clientX - last.sx, e.clientY - last.sy);
      if (moved < 5) pick(e, true);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (dragging && last) {
        cam.theta -= (e.clientX - last.x) * 0.006;
        cam.phi = Math.max(0.25, Math.min(1.45, cam.phi - (e.clientY - last.y) * 0.005));
        last.x = e.clientX; last.y = e.clientY; idleT = 0;
        A.charts.hideTip();
      } else pick(e, false);
    });
    canvas.addEventListener('pointerleave', () => A.charts.hideTip());
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.radius = Math.max(8, Math.min(34, cam.radius * (1 + Math.sign(e.deltaY) * 0.08))); idleT = 0; }, { passive: false });
  }

  function pick(e, click) {
    if (!hoverMeshes.length) return;
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(hoverMeshes, false)[0];
    if (!hit) { A.charts.hideTip(); canvas.style.cursor = 'grab'; return; }
    canvas.style.cursor = 'pointer';
    const info = hit.object.userData.read(hit.point);
    if (!info) return;
    if (click && onPick) { A.charts.hideTip(); onPick(info, e); }
    else A.charts.tip(info.html, e.clientX, e.clientY);
  }

  function clear() {
    if (root) { scene.remove(root); root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    root = new THREE_.Group(); scene.add(root);
    hoverMeshes = []; labels.forEach((l) => l.el.remove()); labels = []; pulse = null;
  }
  function label(text, pos, cls) {
    const el = document.createElement('div');
    el.className = 'label3d ' + (cls || ''); el.textContent = text; stage.appendChild(el);
    labels.push({ el, pos: pos.clone() });
  }
  const col = (hex) => new THREE_.Color(hex);

  function floor(size) {
    const grid = new THREE_.GridHelper(size, 12, 0x6b5a36, 0x1f2a48);
    grid.material.transparent = true; grid.material.opacity = 0.5;
    root.add(grid);
  }
  function plane(y, color, opacity, w, d) {
    const m = new THREE_.Mesh(new THREE_.PlaneGeometry(w, d), new THREE_.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE_.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; root.add(m); return m;
  }

  /* ---------- Paisaje ---------- */
  S.surface = function (sf, state) {
    if (!renderer) return;
    current = { mode: 'surface', sf };
    clear();
    const N = sf.N, SZ = 10, HMAX = 4.2;
    const M = A.METRICS[sf.metric];
    const thr = M.threshold(state), wrn = M.warn(state);
    let lo = Math.min(sf.mn, thr, wrn), hi = Math.max(sf.mx, thr, wrn);
    if (hi - lo < 1e-6) hi = lo + 1;
    const hOf = (v) => ((v - lo) / (hi - lo)) * HMAX;
    const good = col(css('--go')), mid = col(css('--warn')), bad = col(css('--stop'));
    const colorOf = (v) => {
      const better = M.better;
      const okv = better > 0 ? v >= thr : v <= thr;
      const wv = better > 0 ? v >= wrn : v <= wrn;
      if (okv) return good.clone();
      if (wv) { // mezcla entre ámbar y verde según cercanía al umbral
        const t = Math.abs(thr - wrn) > 1e-9 ? Math.abs(v - wrn) / Math.abs(thr - wrn) : 0.5;
        return mid.clone().lerp(good, Math.min(1, t) * 0.45);
      }
      return bad.clone();
    };
    const pos = new Float32Array(N * N * 3), cols = new Float32Array(N * N * 3), idx = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, c = sf.grid[j][i];
      pos[k * 3] = -SZ / 2 + (SZ * i) / (N - 1);
      pos[k * 3 + 1] = hOf(c.v);
      pos[k * 3 + 2] = SZ / 2 - (SZ * j) / (N - 1);
      const cc = colorOf(c.v); cols[k * 3] = cc.r; cols[k * 3 + 1] = cc.g; cols[k * 3 + 2] = cc.b;
      if (i < N - 1 && j < N - 1) { const a = k, b = k + 1, d = k + N, e = k + N + 1; idx.push(a, d, b, b, d, e); }
    }
    const geo = new THREE_.BufferGeometry();
    geo.setAttribute('position', new THREE_.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE_.BufferAttribute(cols, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mesh = new THREE_.Mesh(geo, new THREE_.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15, side: THREE_.DoubleSide, transparent: true, opacity: 0.92 }));
    root.add(mesh);
    const wire = new THREE_.LineSegments(new THREE_.WireframeGeometry(geo), new THREE_.LineBasicMaterial({ color: 0xecd6a6, transparent: true, opacity: 0.12 }));
    root.add(wire);
    floor(SZ + 2);
    // Plano umbral (meta) y suelo 0 si procede
    plane(hOf(thr), 0xd4ae64, 0.1, SZ, SZ);
    if (lo < 0 && hi > 0 && (sf.metric === 'cajaMin' || sf.metric === 'van')) plane(hOf(0), 0xe04848, 0.08, SZ, SZ);
    // Marcador de la posición actual
    const fx = (sf.cx - sf.x0) / (sf.x1 - sf.x0), fy = (sf.cy - sf.y0) / (sf.y1 - sf.y0);
    const gi = Math.max(0, Math.min(N - 1, fx * (N - 1))), gj = Math.max(0, Math.min(N - 1, fy * (N - 1)));
    const cell = sf.grid[Math.round(gj)][Math.round(gi)];
    const mx = -SZ / 2 + SZ * Math.max(0, Math.min(1, fx)), mz = SZ / 2 - SZ * Math.max(0, Math.min(1, fy)), my = hOf(cell.v);
    const pin = new THREE_.Mesh(new THREE_.CylinderGeometry(0.02, 0.02, my + 1.2, 6), new THREE_.MeshBasicMaterial({ color: 0xecd6a6 }));
    pin.position.set(mx, (my + 1.2) / 2, mz); root.add(pin);
    const ball = new THREE_.Mesh(new THREE_.SphereGeometry(0.2, 24, 16), new THREE_.MeshStandardMaterial({ color: 0xd4ae64, emissive: 0x6b4d17, roughness: 0.3, metalness: 0.6 }));
    ball.position.set(mx, my + 1.2, mz); root.add(ball);
    const ring = new THREE_.Mesh(new THREE_.RingGeometry(0.3, 0.36, 40), new THREE_.MeshBasicMaterial({ color: 0xd4ae64, transparent: true, opacity: 0.7, side: THREE_.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(mx, my + 0.02, mz); root.add(ring); pulse = ring;
    label('Tu plan', new THREE_.Vector3(mx, my + 1.65, mz), 'axis');
    // Ejes
    const ax = A.AXES[sf.ax], ay = A.AXES[sf.ay];
    const fmtA = (a, v) => a.unidad === '€' ? A.fmt.eur(v) : `${A.fmt.num(v)} ${a.unidad}`;
    label(ax.nombre, new THREE_.Vector3(0, -0.2, SZ / 2 + 1.5), 'axis');
    label(fmtA(ax, sf.x0), new THREE_.Vector3(-SZ / 2, -0.2, SZ / 2 + 0.8));
    label(fmtA(ax, sf.x1), new THREE_.Vector3(SZ / 2, -0.2, SZ / 2 + 0.8));
    label(ay.nombre, new THREE_.Vector3(-SZ / 2 - 1.6, -0.2, 0), 'axis');
    label(fmtA(ay, sf.y0), new THREE_.Vector3(-SZ / 2 - 0.9, -0.2, SZ / 2));
    label(fmtA(ay, sf.y1), new THREE_.Vector3(-SZ / 2 - 0.9, -0.2, -SZ / 2));
    label('meta ' + M.fmt(thr), new THREE_.Vector3(SZ / 2 + 0.9, hOf(thr), SZ / 2), '');
    mesh.userData.read = (p) => {
      const i = Math.round(((p.x + SZ / 2) / SZ) * (N - 1)), j = Math.round(((SZ / 2 - p.z) / SZ) * (N - 1));
      if (i < 0 || j < 0 || i >= N || j >= N) return null;
      const c = sf.grid[j][i];
      const st = { go: 'Avanzar', warn: 'Con condiciones', stop: 'Rediseñar' }[c.estado];
      return {
        cell: c, ax: sf.ax, ay: sf.ay,
        html: `<h5>${st}</h5><div class="fv">${M.fmt(c.v)}</div><dl><dt>${ax.nombre}</dt><dd>${fmtA(ax, c.x)}</dd><dt>${ay.nombre}</dt><dd>${fmtA(ay, c.y)}</dd><dt>Caja mínima</dt><dd>${A.fmt.eur(c.cajaMin)}</dd><dt>Recuperación</dt><dd>${A.fmt.months(c.payback)}</dd><dt>Cobertura</dt><dd>${A.fmt.x(c.dscr)}</dd></dl><p>Haz clic para fijar esta combinación.</p>`
      };
    };
    hoverMeshes.push(mesh);
    cam.target.set(0, 1.4, 0);
  };

  /* ---------- Trayectorias ---------- */
  S.trajectories = function (list, state) {
    if (!renderer) return;
    current = { mode: 'traj' };
    clear();
    const LEN = 13, n = list[0].data.length, HMAX = 3.6;
    let mx = 1;
    list.forEach((s) => s.data.forEach((v) => { mx = Math.max(mx, Math.abs(v)); }));
    const target = state.meta.cajaMin;
    mx = Math.max(mx, Math.abs(target));
    const hOf = (v) => (v / mx) * HMAX;
    const xOf = (i) => -LEN / 2 + (LEN * i) / (n - 1);
    const lanes = list.length;
    const red = col(css('--stop'));
    list.forEach((s, k) => {
      const z = -((lanes - 1) * 1.3) / 2 + k * 1.3;
      const pos = new Float32Array(n * 2 * 3), cols = new Float32Array(n * 2 * 3), idx = [];
      const c0 = col(s.color);
      for (let i = 0; i < n; i++) {
        const v = s.data[i], h = hOf(v), cc = v < 0 ? red : c0;
        pos.set([xOf(i), 0, z, xOf(i), h, z], i * 6);
        cols.set([cc.r * 0.35, cc.g * 0.35, cc.b * 0.35, cc.r, cc.g, cc.b], i * 6);
        if (i < n - 1) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
      }
      const geo = new THREE_.BufferGeometry();
      geo.setAttribute('position', new THREE_.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE_.BufferAttribute(cols, 3));
      geo.setIndex(idx);
      const mesh = new THREE_.Mesh(geo, new THREE_.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: s.active ? 0.62 : 0.32, side: THREE_.DoubleSide, depthWrite: false }));
      root.add(mesh);
      const lg = new THREE_.BufferGeometry().setFromPoints(s.data.map((v, i) => new THREE_.Vector3(xOf(i), hOf(v), z)));
      root.add(new THREE_.Line(lg, new THREE_.LineBasicMaterial({ color: c0, transparent: true, opacity: s.active ? 1 : 0.7 })));
      label(s.name, new THREE_.Vector3(LEN / 2 + 0.9, hOf(s.data[n - 1]), z), s.active ? 'axis' : '');
      mesh.userData.read = (p) => {
        const i = Math.max(0, Math.min(n - 1, Math.round(((p.x + LEN / 2) / LEN) * (n - 1))));
        const v = s.data[i];
        return { traj: true, html: `<h5>${s.name} · mes ${i + 1}</h5><div class="fv" style="color:${v < 0 ? css('--stop') : 'inherit'}">${A.fmt.eur(v)}</div><p>${v < 0 ? 'Caja negativa: necesitarías financiación adicional este mes.' : v < target ? 'Por debajo de tu caja mínima objetivo.' : 'Por encima de tu caja mínima objetivo.'}</p>` };
      };
      hoverMeshes.push(mesh);
    });
    const depth = lanes * 1.3 + 0.6;
    plane(0, 0xe04848, 0.1, LEN, depth);
    plane(hOf(target), 0xd4ae64, 0.08, LEN, depth);
    floor(16);
    for (let y = 0; y <= 5; y++) label(y === 0 ? 'hoy' : 'año ' + y, new THREE_.Vector3(xOf(Math.min(n - 1, y * 12)), -0.35, depth / 2 + 0.4));
    label('suelo de liquidez 0 €', new THREE_.Vector3(-LEN / 2 - 1.6, 0, depth / 2), '');
    label('meta ' + A.fmt.eur(target), new THREE_.Vector3(-LEN / 2 - 1.6, hOf(target), -depth / 2), '');
    cam.target.set(0, 0.6, 0);
  };

  function loop() {
    requestAnimationFrame(loop);
    if (!visible || !renderer) return;
    idleT++;
    if (!dragging && !reduce && idleT > 180) cam.theta += 0.0012;
    const t = cam.target;
    camera.position.set(t.x + cam.radius * Math.sin(cam.phi) * Math.sin(cam.theta), t.y + cam.radius * Math.cos(cam.phi), t.z + cam.radius * Math.sin(cam.phi) * Math.cos(cam.theta));
    camera.lookAt(t);
    if (pulse && !reduce) { const k = 1 + ((performance.now() / 900) % 1) * 1.8; pulse.scale.set(k, k, k); pulse.material.opacity = 0.8 * (1 - (k - 1) / 1.8); }
    renderer.render(scene, camera);
    const w = stage.clientWidth, h = stage.clientHeight;
    labels.forEach((l) => {
      const v = l.pos.clone().project(camera);
      const hidden = v.z > 1;
      l.el.style.display = hidden ? 'none' : '';
      l.el.style.left = ((v.x + 1) / 2) * w + 'px';
      l.el.style.top = ((1 - v.y) / 2) * h + 'px';
    });
  }
})();
