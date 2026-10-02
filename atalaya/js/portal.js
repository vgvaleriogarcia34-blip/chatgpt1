/* Atalaya · Puesto de mando 3D
   Una galaxia con dos mundos: el simulador de inversión (planeta dorado con cinco lunas, una por escenario)
   y el sistema estratégico (núcleo azul con 21 módulos en órbita, agrupados por áreas). Se navega arrastrando,
   con la rueda, pellizcando o con el teclado; al elegir un mundo la cámara vuela hacia él y se abre la herramienta. */
(function () {
  const A = window.Atalaya, P = A.platform;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const DEST = { sim: 'app.html', est: 'estrategia.html', man: 'manual.html' };
  const NOMBRE = { sim: 'Simulador de inversión', est: 'Sistema estratégico', man: 'Manual' };
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } } };

  let entering = false;
  function enter(w) {
    if (entering || !DEST[w]) return;
    // Esencial incluye solo el simulador: el sistema estratégico se ofrece, no se abre
    if (w === 'est' && P.user && !P.puede('estrategia')) { P.panelPlanes({ destacar: 'profesional', motivo: 'El sistema estratégico está incluido desde el plan Profesional. Tu plan Esencial incluye el simulador de inversión.' }); return; }
    entering = true;
    LS.set('atalaya.ultimo', w);
    if (scene && !reduce) { flyTo(w); setTimeout(() => $('#warp').classList.add('on'), 650); setTimeout(() => { location.href = DEST[w]; }, 1350); }
    else location.href = DEST[w];
  }
  $$('[data-w]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); enter(b.dataset.w); }));

  /* ---------- Cuenta y saludo ---------- */
  (async () => {
    const ok = await P.guard(); if (!ok) return;
    P.mountAccount($('#account'));
    // Planes con varias empresas: acceso a la vista de grupo o a la cartera desde el puesto de mando
    if (P.esGrupo && P.esGrupo()) {
      const g = !!(P.PLANES[P.user.plan] || {}).grupo, ea = P.empresas.activa();
      $('.pt-dock').insertAdjacentHTML('beforeend', `<a class="pt-grp" href="grupo.html"><i class="d-grp"></i><span><b>${g ? 'Vista de grupo' : 'Cartera de clientes'}</b><small>${P.empresas.lista().length} ${g ? 'sociedades' : 'empresas'}${ea ? ' · ahora en ' + ea.nombre.replace(/</g, '&lt;') : ''}</small></span></a>`);
    }
    // Paso 1: el mapa de empresas. En planes con varias empresas se elige antes de entrar en los mundos;
    // con una sola, se enseña mientras la ficha esté a medias. Siempre se puede volver desde la barra de empresa.
    const SS = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } } };
    const act = P.empresas.activa(), multi = P.limiteEmpresas() > 1 || P.empresas.lista().length > 1;
    const cerrarPaso = () => { document.body.classList.remove('paso-emp'); $('#empPaso').hidden = true; SS.set('atalaya.emp.elegida', P.empresaId()); pintarBarra(); };
    const abrirPaso = () => {
      document.body.classList.add('paso-emp'); $('#empPaso').hidden = false; $('#empBar').hidden = true;
      P.mapaEmpresas($('#empMapa'), { paso: true, cerrar: true, onCerrar: cerrarPaso, onEnter: (id) => { SS.set('atalaya.emp.elegida', id); if (id !== P.empresaId()) P.empresas.cambiar(id); else cerrarPaso(); } });
    };
    function pintarBarra() {
      const e = P.empresas.activa(), b = $('#empBar'); if (!e) return;
      const g = !!(P.PLANES[P.user.plan] || {}).grupo;
      b.hidden = false;
      b.innerHTML = `<span class="small muted">Trabajando en</span><b>${e.nombre.replace(/</g, '&lt;')}</b><span class="small muted">${[e.forma && e.forma.replace(/ \(.*\)/, ''), e.constitucion && 'desde ' + e.constitucion].filter(Boolean).join(' · ')}</span><button class="btn ghost small" data-cambiar>${multi ? (g ? 'Cambiar de sociedad' : 'Cambiar de empresa') : 'Ver la ficha'}</button>`;
      b.querySelector('[data-cambiar]').onclick = abrirPaso;
    }
    addEventListener('atalaya:empresa', () => { P.mountAccount($('#account')); if (!$('#empPaso').hidden) return; pintarBarra(); });
    // Esencial: el mundo del sistema estratégico se ve, pero marcado como incluido desde Profesional
    if (!P.puede('estrategia')) $$('[data-w="est"]').forEach((x) => { x.classList.add('pt-lock'); const q = x.querySelector('.pt-q, small'); if (q) q.textContent = 'Incluido desde el plan Profesional · toca para ver los planes'; });
    // Desde la página comercial con la sesión abierta: abrir el cambio de plan con el elegido
    const hp = (location.hash.match(/^#plan-(esencial|profesional|consultora|grupos)/) || [])[1];
    if (hp) { try { history.replaceState(null, '', location.pathname); } catch (e) { /* sin historial */ } setTimeout(() => P.panelPlanes({ destacar: hp, motivo: hp !== P.user.plan ? `Has elegido ${P.PLANES[hp].nombre}. Cámbialo aquí: se aplica al momento y conservas todos tus datos.` : '' }), 300); }
    if (location.hash === '#empresas' || (multi && !SS.get('atalaya.emp.elegida')) || (!multi && P.fichaCompleta(act) < 40 && !SS.get('atalaya.emp.elegida'))) abrirPaso(); else pintarBarra();
    const n = (P.user && (P.user.nombre || '').split(/\s+/)[0]) || '';
    if (n) $('#hello').textContent = 'Hola, ' + n;
    const u = LS.get('atalaya.ultimo');
    if (u && NOMBRE[u] && u !== 'man') { const l = $('#last'); l.hidden = false; l.innerHTML = `<a href="${DEST[u]}">Seguir en ${NOMBRE[u]} →</a>`; l.querySelector('a').onclick = (e) => { e.preventDefault(); enter(u); }; }
  })();

  /* ---------- Escena ---------- */
  let scene = null, flyTo = () => {};
  const T = window.THREE;
  const canvas = $('#space');
  let renderer = null;
  try { if (T) renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
  if (!renderer) { document.body.classList.add('no3d'); $('#hint').textContent = 'Elige una herramienta para empezar.'; return; }

  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x02040b, 1);
  scene = new T.Scene();
  scene.fog = new T.FogExp2(0x02040b, 0.0026);
  const camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000);

  // Texturas generadas en un canvas (no se carga ninguna imagen externa)
  const tex = (size, draw) => { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new T.CanvasTexture(c); t.needsUpdate = true; return t; };
  const glow = (r, g, b) => tex(128, (x, s) => { const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.25, `rgba(${r},${g},${b},0.45)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, s, s); });
  const dot = tex(64, (x, s) => { const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, s, s); });
  const sprite = (map, color, scale, opacity) => { const m = new T.SpriteMaterial({ map, color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false }); const sp = new T.Sprite(m); sp.scale.set(scale, scale, 1); return sp; };
  const pointsMat = (size, opacity) => new T.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true });

  /* Capas de estrellas a distintas distancias: dan profundidad al moverse */
  const starLayers = [];
  [[small ? 1600 : 3200, 260, 1.1, 0.9], [small ? 1200 : 2400, 420, 1.8, 0.8], [small ? 500 : 900, 650, 3.2, 0.7]].forEach(([n, R, size, op]) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = R * (0.7 + Math.random() * 0.3), s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
      const k = Math.random(); const c = k < 0.15 ? [1, 0.85, 0.6] : k < 0.3 ? [0.65, 0.78, 1] : [0.92, 0.92, 1];
      const b = 0.5 + Math.random() * 0.5; col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    const p = new T.Points(g, pointsMat(size, op)); scene.add(p); starLayers.push(p);
  });

  /* Galaxia espiral al fondo */
  const galaxy = new T.Group();
  {
    const n = small ? 14000 : 32000, arms = 4, R = 150;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const core = new T.Color(0xffd79a), mid = new T.Color(0xc58cff), edge = new T.Color(0x4f7dff);
    for (let i = 0; i < n; i++) {
      const r = Math.pow(Math.random(), 1.7) * R, arm = i % arms;
      const ang = (arm / arms) * Math.PI * 2 + r * 0.045 + (Math.random() - 0.5) * (0.5 + r / R);
      const sp = (Math.random() - 0.5) * (6 + r * 0.12);
      pos.set([Math.cos(ang) * r + sp, (Math.random() - 0.5) * (8 - r * 0.045) * (Math.random() < 0.5 ? 1 : 0.4), Math.sin(ang) * r + sp], i * 3);
      const c = r < R * 0.35 ? core.clone().lerp(mid, r / (R * 0.35)) : mid.clone().lerp(edge, (r - R * 0.35) / (R * 0.65));
      const b = 0.55 + Math.random() * 0.45; col.set([c.r * b, c.g * b, c.b * b], i * 3);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    galaxy.add(new T.Points(g, pointsMat(1.25, 0.85)));
    galaxy.add(sprite(glow(255, 214, 150), 0xffffff, 70, 0.9));
    galaxy.add(sprite(glow(255, 180, 110), 0xffffff, 160, 0.35));
  }
  galaxy.position.set(10, -45, -260); galaxy.rotation.set(1.05, 0.2, 0.35);
  scene.add(galaxy);

  /* Nebulosas: manchas de color que dan volumen al fondo */
  const nebulas = [];
  [[60, 90, 200, -40, 20, -320, 260, 0.3], [200, 70, 255, 120, -30, -380, 300, 0.22], [40, 160, 190, -180, -60, -300, 240, 0.2], [212, 150, 80, 160, 80, -260, 200, 0.14], [90, 60, 180, -60, -110, -420, 360, 0.25], [30, 70, 160, 0, 40, -520, 520, 0.3]].forEach(([r, g, b, x, y, z, s, o]) => {
    const sp = sprite(glow(r, g, b), 0xffffff, s, o); sp.position.set(x, y, z); sp.material.rotation = Math.random() * Math.PI; scene.add(sp); nebulas.push(sp);
  });

  /* Luces */
  scene.add(new T.AmbientLight(0x3a4466, 0.9));
  const sun = new T.PointLight(0xffe2b0, 1.6, 0, 2); sun.position.set(-30, 25, 40); scene.add(sun);
  const rim = new T.PointLight(0x6f9bff, 1.2, 0, 2); rim.position.set(35, -10, -10); scene.add(rim);

  /* ---------- Mundo 1: simulador de inversión ---------- */
  const W = {};
  // En pantallas verticales (móvil) los mundos se apilan; en horizontales quedan a izquierda y derecha
  const portrait = innerHeight > innerWidth * 1.1;
  const SIM_POS = portrait ? new T.Vector3(0, 7.5, 0) : new T.Vector3(-10, 0.5, 0), EST_POS = portrait ? new T.Vector3(0, -8.5, 0) : new T.Vector3(10, -0.5, 0);
  {
    const g = new T.Group(); g.position.copy(SIM_POS);
    const map = tex(512, (x, s) => {
      const gr = x.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#5c3f10'); gr.addColorStop(0.5, '#d4ae64'); gr.addColorStop(1, '#4a320c'); x.fillStyle = gr; x.fillRect(0, 0, s, s);
      for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,236,190' : '70,46,12'},${0.06 + Math.random() * 0.12})`; const y = Math.random() * s; x.fillRect(0, y, s, 2 + Math.random() * 14); }
      for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(255,248,220,${Math.random() * 0.12})`; x.beginPath(); x.arc(Math.random() * s, Math.random() * s, Math.random() * 6, 0, 7); x.fill(); }
    });
    const planet = new T.Mesh(new T.SphereGeometry(3, 64, 48), new T.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.25, emissive: 0x3a2706, emissiveIntensity: 0.6 }));
    planet.rotation.z = 0.35; g.add(planet);
    const atm = sprite(glow(255, 205, 130), 0xffffff, 13, 0.55); g.add(atm);
    // Anillo de partículas
    const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 4.4 + Math.random() * 1.8 + (Math.random() < 0.2 ? 0.8 : 0); pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.12, Math.sin(a) * r], i * 3); const b = 0.5 + Math.random() * 0.5; col.set([1 * b, 0.84 * b, 0.55 * b], i * 3); }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(pos, 3)); rg.setAttribute('color', new T.BufferAttribute(col, 3));
    const ring = new T.Points(rg, pointsMat(0.09, 0.9)); ring.rotation.set(1.2, 0, 0.25); g.add(ring);
    // Cinco lunas: los escenarios
    const SC = [0xe04848, 0xd95926, 0x3987e5, 0x199e70, 0xd55181];
    const moons = SC.map((c, i) => {
      const pivot = new T.Group(); pivot.rotation.set(0.3 + i * 0.35, i * 1.1, 0.2 * i); g.add(pivot);
      const r = 6.6 + i * 0.75;
      const orbit = new T.Mesh(new T.TorusGeometry(r, 0.012, 6, 160), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.28 })); orbit.rotation.x = Math.PI / 2; pivot.add(orbit);
      const m = new T.Mesh(new T.SphereGeometry(0.28 + (i === 2 ? 0.12 : 0), 20, 16), new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7 }));
      const hold = new T.Group(); hold.add(m); m.position.x = r; pivot.add(hold);
      const gl = sprite(glow(255, 255, 255), c, 1.6, 0.8); gl.position.x = r; hold.add(gl);
      return { hold, speed: 0.25 + i * 0.07 };
    });
    const hit = new T.Mesh(new T.SphereGeometry(6.5, 16, 12), new T.MeshBasicMaterial({ visible: false })); g.add(hit);
    scene.add(g);
    W.sim = { g, planet, ring, moons, hit, atm, label: $('.pt-world[data-w="sim"]'), r: 3, side: -1 };
  }

  /* ---------- Mundo 2: sistema estratégico ---------- */
  {
    const g = new T.Group(); g.position.copy(EST_POS);
    const coreMat = new T.MeshStandardMaterial({ color: 0x9cc4ff, emissive: 0x2c5fd0, emissiveIntensity: 1.1, roughness: 0.3, metalness: 0.4 });
    const core = new T.Mesh(new T.IcosahedronGeometry(1.6, 2), coreMat); g.add(core);
    const shell = new T.Mesh(new T.IcosahedronGeometry(2.6, 1), new T.MeshBasicMaterial({ color: 0x6fa8ff, wireframe: true, transparent: true, opacity: 0.35 })); g.add(shell);
    const atm = sprite(glow(110, 160, 255), 0xffffff, 12, 0.65); g.add(atm);
    // 21 módulos en tres órbitas, de color por área
    const AREAS = [['Visión', 0xd4ae64, 4], ['Finanzas', 0x199e70, 5], ['Comercial', 0x3987e5, 4], ['Operaciones', 0xd95926, 5], ['Estrategia', 0xd55181, 3]];
    const nodes = [], linePos = [];
    const shells = [new T.Group(), new T.Group(), new T.Group()];
    shells.forEach((s, i) => { s.rotation.set(0.5 + i * 0.6, i * 0.9, 0.25 * i); g.add(s); });
    let k = 0;
    AREAS.forEach(([n, color, count]) => {
      for (let j = 0; j < count; j++, k++) {
        const sh = shells[k % 3], r = 4.6 + (k % 3) * 1.25, a = (k / 21) * Math.PI * 2 * 3 + (k % 3) * 0.4;
        const m = new T.Mesh(new T.OctahedronGeometry(0.32, 0), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, flatShading: true }));
        m.position.set(Math.cos(a) * r, Math.sin(a * 0.5) * 0.6, Math.sin(a) * r); sh.add(m);
        const gl = sprite(glow(255, 255, 255), color, 1.4, 0.7); gl.position.copy(m.position); sh.add(gl);
        nodes.push({ m, sh });
      }
    });
    // Conexiones entre los módulos y el núcleo (se recalculan cada fotograma)
    const lineGeo = new T.BufferGeometry(); const lp = new Float32Array(21 * 2 * 3); lineGeo.setAttribute('position', new T.BufferAttribute(lp, 3));
    const lines = new T.LineSegments(lineGeo, new T.LineBasicMaterial({ color: 0x86b4ff, transparent: true, opacity: 0.22, blending: T.AdditiveBlending })); g.add(lines);
    const ringOrbits = shells.map((s, i) => { const t = new T.Mesh(new T.TorusGeometry(4.6 + i * 1.25, 0.01, 6, 160), new T.MeshBasicMaterial({ color: 0x86b4ff, transparent: true, opacity: 0.2 })); t.rotation.x = Math.PI / 2; s.add(t); return t; });
    const hit = new T.Mesh(new T.SphereGeometry(6.8, 16, 12), new T.MeshBasicMaterial({ visible: false })); g.add(hit);
    scene.add(g);
    W.est = { g, core, shell, shells, nodes, lines, lp, hit, atm, label: $('.pt-world[data-w="est"]'), r: 2.6, side: 1, ringOrbits };
  }

  /* Luna del manual */
  {
    const g = new T.Group();
    const m = new T.Mesh(new T.SphereGeometry(0.7, 24, 18), new T.MeshStandardMaterial({ color: 0xcfd6e6, roughness: 0.9, emissive: 0x222a3a, emissiveIntensity: 0.6 }));
    g.add(m); g.add(sprite(glow(220, 230, 255), 0xffffff, 3, 0.4));
    const hit = new T.Mesh(new T.SphereGeometry(1.4, 10, 8), new T.MeshBasicMaterial({ visible: false })); g.add(hit);
    scene.add(g);
    W.man = { g, hit, label: $('.pt-moon'), r: 0.7 };
  }

  /* Corriente de datos entre los dos mundos: comparten la misma información */
  const curve = portrait ? new T.CatmullRomCurve3([SIM_POS.clone().add(new T.Vector3(0, -3, 0)), new T.Vector3(4.5, -0.5, -3), EST_POS.clone().add(new T.Vector3(0, 3, 0))]) : new T.CatmullRomCurve3([SIM_POS.clone().add(new T.Vector3(3, 0, 0)), new T.Vector3(0, 4.5, -3), EST_POS.clone().add(new T.Vector3(-3, 0, 0))]);
  const flowN = 220, flowPos = new Float32Array(flowN * 3), flowCol = new Float32Array(flowN * 3), flowT = new Float32Array(flowN);
  for (let i = 0; i < flowN; i++) { flowT[i] = Math.random(); const gold = Math.random() < 0.5; flowCol.set(gold ? [1, 0.85, 0.55] : [0.55, 0.72, 1], i * 3); }
  const flowGeo = new T.BufferGeometry(); flowGeo.setAttribute('position', new T.BufferAttribute(flowPos, 3)); flowGeo.setAttribute('color', new T.BufferAttribute(flowCol, 3));
  scene.add(new T.Points(flowGeo, pointsMat(0.22, 0.9)));
  scene.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(80)), new T.LineBasicMaterial({ color: 0xd4ae64, transparent: true, opacity: 0.12 })));

  /* Polvo cercano que pasa junto a la cámara */
  const dustN = small ? 300 : 700, dustPos = new Float32Array(dustN * 3), dustCol = new Float32Array(dustN * 3).fill(0.6);
  for (let i = 0; i < dustN; i++) dustPos.set([(Math.random() - 0.5) * 120, (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 120], i * 3);
  const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3)); dustGeo.setAttribute('color', new T.BufferAttribute(dustCol, 3));
  scene.add(new T.Points(dustGeo, pointsMat(0.18, 0.45)));

  /* ---------- Cámara: órbita con inercia ---------- */
  const view = { theta: 0, phi: 1.32, radius: portrait ? 50 : small ? 44 : 34, tTheta: 0, tPhi: 1.32, tRadius: portrait ? 50 : small ? 44 : 34, target: new T.Vector3(0, 0, 0), tTarget: new T.Vector3(0, 0, 0) };
  let focus = null, hover = null, drag = null, lastMove = performance.now(), flying = null;
  const setFocus = (w) => {
    focus = w;
    $$('.pt-world').forEach((el) => el.classList.toggle('on', el.dataset.w === w));
    $$('.pt-dock button').forEach((el) => el.classList.toggle('on', el.dataset.w === w));
    view.tTarget.copy(w ? W[w].g.position.clone().multiplyScalar(0.45) : new T.Vector3());
    if (w && !portrait) view.tTheta = w === 'sim' ? -0.32 : w === 'est' ? 0.32 : view.tTheta;
  };
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, th: view.tTheta, ph: view.tPhi, moved: false }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('drag'); });
  canvas.addEventListener('pointermove', (e) => {
    lastMove = performance.now();
    mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    view.tTheta = drag.th - dx * 0.006; view.tPhi = Math.max(0.55, Math.min(2.35, drag.ph - dy * 0.005));
  });
  canvas.addEventListener('pointerup', () => { canvas.classList.remove('drag'); if (drag && !drag.moved) { if (hover) enter(hover); else setFocus(null); } drag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.tRadius = Math.max(16, Math.min(80, view.tRadius * (1 + Math.sign(e.deltaY) * 0.1))); lastMove = performance.now(); }, { passive: false });
  // Pellizco en pantallas táctiles
  const touches = new Map(); let pinch = null;
  canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 2) { const [a, b] = e.touches; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), r: view.tRadius }; } }, { passive: true });
  canvas.addEventListener('touchmove', (e) => { if (pinch && e.touches.length === 2) { const [a, b] = e.touches; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); view.tRadius = Math.max(16, Math.min(80, pinch.r * pinch.d / d)); } }, { passive: true });
  canvas.addEventListener('touchend', () => { pinch = null; touches.clear(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') setFocus('sim');
    else if (e.key === 'ArrowRight' || e.key === 'd') setFocus('est');
    else if (e.key === 'ArrowUp' || e.key === 'w') view.tRadius = Math.max(16, view.tRadius * 0.9);
    else if (e.key === 'ArrowDown' || e.key === 's') view.tRadius = Math.min(80, view.tRadius * 1.1);
    else if (e.key === 'Enter' && focus) enter(focus);
    else if (e.key === '1') enter('sim');
    else if (e.key === '2') enter('est');
    else return;
    lastMove = performance.now();
  });
  // Pasar por encima de las etiquetas o del panel inferior también ilumina el mundo
  $$('[data-w]').forEach((b) => { b.addEventListener('pointerenter', () => { hoverLabel = b.dataset.w; }); b.addEventListener('pointerleave', () => { hoverLabel = null; }); b.addEventListener('focus', () => setFocus(b.dataset.w)); });
  let hoverLabel = null;

  flyTo = (w) => {
    const to = W[w].g.position.clone();
    const dir = camera.position.clone().sub(to).normalize();
    flying = { from: camera.position.clone(), to: to.clone().add(dir.multiplyScalar(W[w].r * 1.6)), look: to, t0: performance.now(), fov0: camera.fov };
    $('#intro').style.opacity = 0; $$('.pt-world, .pt-moon, .pt-dock, .pt-hint, .pt-last').forEach((el) => { el.style.opacity = 0; el.style.pointerEvents = 'none'; });
  };

  /* ---------- Bucle ---------- */
  const ray = new T.Raycaster(), mouse = new T.Vector2(-9, -9), tmp = new T.Vector3();
  const clock = new T.Clock();
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);

  function placeLabel(w, offX) {
    const o = W[w]; if (!o.label) return;
    tmp.copy(o.g.position); tmp.project(camera);
    const behind = tmp.z > 1;
    const x = (tmp.x * 0.5 + 0.5) * innerWidth, y = (-tmp.y * 0.5 + 0.5) * innerHeight;
    const d = camera.position.distanceTo(o.g.position);
    const narrow = innerWidth < 760;
    let lx, ly;
    if (w === 'man') { lx = x - o.label.offsetWidth / 2; ly = y + 18; }
    else if (narrow) { lx = w === 'sim' ? x + 30 : x - o.label.offsetWidth - 30; ly = y - o.label.offsetHeight / 2; }
    else { lx = x + offX * (Math.min(220, 2600 / d) + (offX < 0 ? o.label.offsetWidth : 0)); ly = y - o.label.offsetHeight / 2; }
    lx = Math.max(12, Math.min(innerWidth - o.label.offsetWidth - 12, lx)); ly = Math.max(narrow ? 200 : 140, Math.min(innerHeight - o.label.offsetHeight - (narrow ? 150 : 130), ly));
    o.label.style.transform = `translate(${lx}px, ${ly}px)`;
    o.label.style.visibility = behind ? 'hidden' : 'visible';
    o.label.classList.toggle('far', d > (portrait ? 64 : 46));
  }

  function frame() {
    const t = clock.getElapsedTime();
    // Deriva lenta cuando no se toca nada
    if (!reduce && !drag && !flying && performance.now() - lastMove > 4000) view.tTheta += 0.0009;
    view.theta += (view.tTheta - view.theta) * 0.06; view.phi += (view.tPhi - view.phi) * 0.06; view.radius += (view.tRadius - view.radius) * 0.06;
    view.target.lerp(view.tTarget, 0.04);
    if (flying) {
      const k = Math.min(1, (performance.now() - flying.t0) / 1300), e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(flying.from, flying.to, e);
      camera.fov = flying.fov0 + e * 40; camera.updateProjectionMatrix();
      camera.lookAt(flying.look);
      starLayers.forEach((s, i) => { s.scale.setScalar(1 + e * (0.6 + i * 0.4)); });
    } else {
      const par = reduce ? 0 : 1;
      camera.position.set(
        view.target.x + view.radius * Math.sin(view.phi) * Math.sin(view.theta) + mouse.x * 1.2 * par,
        view.target.y + view.radius * Math.cos(view.phi) + mouse.y * 0.8 * par,
        view.target.z + view.radius * Math.sin(view.phi) * Math.cos(view.theta));
      camera.lookAt(view.target);
    }
    const sp = reduce ? 0.2 : 1;
    // Animación de los mundos
    const S = W.sim, E = W.est;
    S.planet.rotation.y = t * 0.12 * sp; S.ring.rotation.z = 0.25 + t * 0.03 * sp;
    S.moons.forEach((m) => { m.hold.rotation.y = t * m.speed * sp; });
    E.core.rotation.y = t * 0.3 * sp; E.core.rotation.x = t * 0.12 * sp; E.shell.rotation.y = -t * 0.08 * sp;
    E.shells.forEach((s, i) => { s.rotation.y = i * 0.9 + t * (0.12 + i * 0.05) * sp * (i % 2 ? -1 : 1); });
    E.nodes.forEach((n, i) => { n.m.rotation.y = t * 1.2; n.m.getWorldPosition(tmp); E.g.worldToLocal(tmp); E.lp.set([0, 0, 0, tmp.x, tmp.y, tmp.z], i * 6); });
    E.lines.geometry.attributes.position.needsUpdate = true;
    if (portrait) W.man.g.position.set(-7 + Math.cos(t * 0.15 * sp) * 1.5, -0.5 + Math.sin(t * 0.4) * 0.6, Math.sin(t * 0.15 * sp) * 3 - 4);
    else W.man.g.position.set(Math.cos(t * 0.15 * sp) * 4, 7 + Math.sin(t * 0.4) * 0.6, Math.sin(t * 0.15 * sp) * 4 - 6);
    for (let i = 0; i < flowN; i++) { flowT[i] = (flowT[i] + 0.0016 * sp * (0.6 + (i % 5) * 0.15)) % 1; const p = curve.getPoint(flowT[i]); flowPos.set([p.x + Math.sin(i) * 0.25, p.y + Math.cos(i * 1.3) * 0.25, p.z], i * 3); }
    flowGeo.attributes.position.needsUpdate = true;
    galaxy.rotation.y += 0.0004 * sp;
    nebulas.forEach((n, i) => { n.material.rotation += 0.0003 * (i % 2 ? 1 : -1) * sp; });
    starLayers.forEach((s, i) => { s.rotation.y += 0.00005 * (i + 1) * sp; s.material.opacity = 0.65 + Math.sin(t * (0.6 + i * 0.3) + i) * 0.15; });

    // Selección con el ratón
    if (!flying) {
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects([S.hit, E.hit, W.man.hit]);
      const h = hits.length ? (hits[0].object === S.hit ? 'sim' : hits[0].object === E.hit ? 'est' : 'man') : null;
      hover = hoverLabel || h;
      canvas.classList.toggle('hover', !!h && !drag);
      ['sim', 'est'].forEach((w) => {
        const on = hover === w || focus === w;
        const target = on ? 1.14 : 1; const g = W[w].g; g.scale.setScalar(g.scale.x + (target - g.scale.x) * 0.1);
        W[w].atm.material.opacity += ((on ? 0.95 : w === 'sim' ? 0.55 : 0.65) - W[w].atm.material.opacity) * 0.1;
        W[w].label.classList.toggle('on', on);
      });
      placeLabel('sim', -1); placeLabel('est', 1); placeLabel('man', 0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  // Entrada: la cámara llega desde lejos
  if (!reduce) { view.radius = 120; view.phi = 1.0; }
  requestAnimationFrame(frame);
})();
