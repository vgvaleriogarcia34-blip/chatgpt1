/* Atalaya · Plataforma: cuentas, control de acceso, uso y datos por usuario.
 *
 * Dos modos:
 *  - «server»: hay un servidor Atalaya (carpeta server/) que responde en /api. Cuentas, sesiones,
 *    horas de uso y datos se guardan en el servidor. Es el modo para comercializar.
 *  - «local»: no hay servidor (por ejemplo, abriendo los ficheros o en una vista previa). Todo se guarda
 *    solo en este navegador. Sirve para demostraciones: no protege nada de verdad.
 */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* Planes comerciales. Precios de ejemplo: ajústalos aquí y en server/config.json. */
  const PLANES = {
    esencial: { nombre: 'Esencial', precio: 49, periodo: 'mes', incluye: ['Simulador de inversión y crecimiento', 'Horizonte 3D y cinco escenarios', 'Semáforos con horquillas y plan de corrección', 'Informe de decisión', '1 empresa'] },
    profesional: { nombre: 'Profesional', precio: 129, periodo: 'mes', destacado: true, incluye: ['Todo lo de Esencial', 'Sistema estratégico: ABC, margen de contribución, presupuesto y desviaciones', 'Análisis de cuentas de varios años', 'Asistente con voz', 'Hasta 3 empresas'] },
    consultora: { nombre: 'Consultora', precio: 349, periodo: 'mes', incluye: ['Todo lo de Profesional', 'Hasta 15 empresas cliente', 'Gestor de usuarios para tu equipo', 'Acompañamiento en la puesta en marcha'] }
  };
  const PRUEBA_DIAS = 14;

  const P = (A.platform = { mode: 'local', user: null, PLANES, PRUEBA_DIAS });

  async function hash(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0; return 'x' + h; }
  }
  async function api(path, opts) {
    const r = await fetch('/api' + path, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, opts || {}));
    let body = null; try { body = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) throw new Error((body && body.error) || 'Error del servidor (' + r.status + ')');
    return body;
  }
  P.api = api;

  P.ready = (async () => {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch('/api/health', { signal: ctl.signal, credentials: 'same-origin' });
      clearTimeout(t);
      const j = r.ok ? await r.json() : null;
      if (j && j.atalaya) { P.mode = 'server'; P.serverInfo = j; }
    } catch (e) { /* sin servidor: modo local */ }
    return P.mode;
  })();

  /* ---------- Acceso ---------- */
  P.accessOf = function (u) {
    if (!u) return { ok: false, motivo: 'sin-sesion' };
    if (u.estado === 'bloqueado') return { ok: false, motivo: 'bloqueado' };
    const now = Date.now();
    if (u.pagado && (!u.venceAcceso || new Date(u.venceAcceso).getTime() > now)) return { ok: true, motivo: 'pagado' };
    const finPrueba = new Date(u.alta).getTime() + PRUEBA_DIAS * 864e5;
    if (!u.pagado && finPrueba > now) return { ok: true, motivo: 'prueba', diasPrueba: Math.ceil((finPrueba - now) / 864e5) };
    return { ok: false, motivo: 'pago' };
  };

  /* ---------- Modo local ---------- */
  const L = {
    users: () => { const l = LS.get('atalaya.users') || []; if (l.some((u) => u.rol === 'admin')) { l.forEach((u) => { if (u.rol === 'admin') { u.rol = 'cliente'; u.pagado = true; u.venceAcceso = null; u.estado = 'activo'; } }); LS.set('atalaya.users', l); } return l; },
    save: (u) => LS.set('atalaya.users', u),
    session: () => LS.get('atalaya.session'),
    find: (id) => L.users().find((u) => u.id === id)
  };
  const publicUser = (u) => { if (!u) return null; const c = Object.assign({}, u); delete c.hash; delete c.salt; delete c.reset; return c; };

  P.register = async function (d) {
    await P.ready;
    if (!d.email || !d.password || d.password.length < 8) throw new Error('Escribe un correo y una contraseña de al menos 8 caracteres.');
    if (P.mode === 'server') { const r = await api('/register', { method: 'POST', body: JSON.stringify(d) }); P.user = r.user; return r.user; }
    const users = L.users();
    const email = d.email.trim().toLowerCase();
    if (users.some((u) => u.email === email)) throw new Error('Ya hay una cuenta con ese correo. Entra con tu contraseña.');
    const salt = uid();
    const u = { id: uid(), nombre: (d.nombre || '').trim(), email, empresa: (d.empresa || '').trim(), telefono: (d.telefono || '').trim(), plan: PLANES[d.plan] ? d.plan : 'profesional',
      rol: 'cliente', estado: 'prueba', pagado: false, venceAcceso: null, alta: new Date().toISOString(), ultimoAcceso: new Date().toISOString(),
      sesiones: 1, uso: {}, salt, hash: await hash(salt + d.password) };
    users.push(u); L.save(users); LS.set('atalaya.session', { id: u.id });
    P.user = publicUser(u);
    return P.user;
  };
  P.login = async function (email, password) {
    await P.ready;
    if (P.mode === 'server') { const r = await api('/login', { method: 'POST', body: JSON.stringify({ email, password }) }); P.user = r.user; return r.user; }
    const users = L.users();
    const u = users.find((x) => x.email === String(email || '').trim().toLowerCase());
    if (!u || u.hash !== await hash(u.salt + password)) throw new Error('Correo o contraseña incorrectos.');
    u.ultimoAcceso = new Date().toISOString(); u.sesiones = (u.sesiones || 0) + 1; L.save(users);
    LS.set('atalaya.session', { id: u.id });
    P.user = publicUser(u);
    return P.user;
  };
  P.logout = async function () {
    await P.ready;
    if (P.mode === 'server') { try { await api('/logout', { method: 'POST' }); } catch (e) { /* ya cerrada */ } }
    LS.del('atalaya.session'); P.user = null;
    location.href = 'acceso.html';
  };
  P.me = async function () {
    await P.ready;
    if (P.mode === 'server') { try { const r = await api('/me'); P.user = r.user; } catch (e) { P.user = null; } return P.user; }
    const s = L.session(); P.user = s ? publicUser(L.find(s.id)) : null; return P.user;
  };
  P.updateMe = async function (patch) {
    await P.ready;
    if (P.mode === 'server') { const r = await api('/me', { method: 'PATCH', body: JSON.stringify(patch) }); P.user = r.user; return r.user; }
    const users = L.users(); const u = users.find((x) => x.id === (L.session() || {}).id); if (!u) return null;
    ['nombre', 'empresa', 'telefono', 'plan'].forEach((k) => { if (patch[k] !== undefined) u[k] = patch[k]; });
    L.save(users); P.user = publicUser(u); return P.user;
  };

  /* ---------- Contraseñas: cambio y recuperación ---------- */
  P.changePassword = async function (actual, nueva) {
    await P.ready;
    if (String(nueva || '').length < 8) throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
    if (P.mode === 'server') return api('/me/password', { method: 'POST', body: JSON.stringify({ actual, nueva }) });
    const users = L.users(); const u = users.find((x) => x.id === (L.session() || {}).id); if (!u) throw new Error('Inicia sesión.');
    if (u.hash !== await hash(u.salt + actual)) throw new Error('La contraseña actual no es correcta.');
    u.salt = uid(); u.hash = await hash(u.salt + nueva); L.save(users); return { ok: true };
  };
  /* Pide un enlace de recuperación. En el servidor se envía por correo (o lo ve la administración si no hay correo configurado). */
  P.forgot = async function (email) {
    await P.ready;
    if (P.mode === 'server') return api('/password/olvido', { method: 'POST', body: JSON.stringify({ email }) });
    const users = L.users(); const u = users.find((x) => x.email === String(email || '').trim().toLowerCase());
    if (u) { u.solicitudReset = new Date().toISOString(); L.save(users); }
    return { ok: true, correo: false, local: true };
  };
  P.resetPassword = async function (token, password) {
    await P.ready;
    if (String(password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    if (P.mode === 'server') { const r = await api('/password/restablecer', { method: 'POST', body: JSON.stringify({ token, password }) }); P.user = r.user; return r.user; }
    const th = await hash(token); const users = L.users();
    const u = users.find((x) => x.reset && x.reset.hash === th && new Date(x.reset.exp).getTime() > Date.now());
    if (!u) throw new Error('El enlace no es válido o ha caducado. Pide uno nuevo.');
    u.salt = uid(); u.hash = await hash(u.salt + password); delete u.reset; delete u.solicitudReset; L.save(users);
    LS.set('atalaya.session', { id: u.id }); P.user = publicUser(u); return P.user;
  };

  /* Protege las páginas de la aplicación. Devuelve true si se puede seguir. */
  P.guard = async function () {
    const u = await P.me();
    const acc = P.accessOf(u);
    if (!acc.ok) { location.href = 'acceso.html' + (acc.motivo === 'sin-sesion' ? '' : '#' + acc.motivo); return false; }
    P.access = acc;
    startHeartbeat();
    return true;
  };

  /* ---------- Horas de uso ---------- */
  let hb = null;
  function startHeartbeat() {
    if (hb) return;
    const beat = async () => {
      if (document.visibilityState !== 'visible') return;
      if (P.mode === 'server') { try { await api('/heartbeat', { method: 'POST' }); } catch (e) { /* reintenta en el siguiente */ } return; }
      const users = L.users(); const u = users.find((x) => x.id === (L.session() || {}).id); if (!u) return;
      u.uso = u.uso || {}; u.uso[today()] = (u.uso[today()] || 0) + 1; u.ultimoAcceso = new Date().toISOString(); L.save(users);
    };
    hb = setInterval(beat, 60000);
  }

  /* ---------- Datos del usuario ---------- */
  P.saveData = async function (key, obj) {
    await P.ready;
    if (P.mode === 'server') { try { await api('/data/' + encodeURIComponent(key), { method: 'PUT', body: JSON.stringify(obj) }); } catch (e) { /* se queda en local */ } return; }
    const s = L.session(); if (s) LS.set(`atalaya.data.${s.id}.${key}`, obj);
  };
  P.loadData = async function (key) {
    await P.ready;
    if (P.mode === 'server') { try { const r = await api('/data/' + encodeURIComponent(key)); return r && r.data; } catch (e) { return null; } }
    const s = L.session(); return s ? LS.get(`atalaya.data.${s.id}.${key}`) : null;
  };

  /* ---------- Administración ----------
     El gestor de usuarios tiene su propia contraseña: no pertenece a ninguna cuenta de usuario. */
  const SS = { get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }, del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } } };
  const localAdminOk = () => { const s = SS.get('atalaya.adminSession'); return !!(LS.get('atalaya.admin') && s && s.exp > Date.now()); };
  P.adminAuth = {
    async status() {
      await P.ready;
      if (P.mode === 'server') return api('/admin/estado');
      return { configurado: !!LS.get('atalaya.admin'), sesion: localAdminOk(), correo: false, local: true };
    },
    async setup(codigo, password) {
      await P.ready;
      if (String(password || '').length < 10) throw new Error('La contraseña de administración debe tener al menos 10 caracteres.');
      if (P.mode === 'server') return api('/admin/configurar', { method: 'POST', body: JSON.stringify({ codigo, password }) });
      if (LS.get('atalaya.admin')) throw new Error('La administración ya está configurada.');
      const salt = uid(); LS.set('atalaya.admin', { salt, hash: await hash(salt + password) });
      SS.set('atalaya.adminSession', { exp: Date.now() + 12 * 3600e3 }); return { ok: true };
    },
    async login(password) {
      await P.ready;
      if (P.mode === 'server') return api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      const a = LS.get('atalaya.admin');
      if (!a || a.hash !== await hash(a.salt + password)) throw new Error('Contraseña de administración incorrecta.');
      SS.set('atalaya.adminSession', { exp: Date.now() + 12 * 3600e3 }); return { ok: true };
    },
    async logout() {
      await P.ready;
      if (P.mode === 'server') { try { await api('/admin/logout', { method: 'POST' }); } catch (e) { /* ya cerrada */ } }
      SS.del('atalaya.adminSession');
    },
    async change(actual, nueva) {
      await P.ready;
      if (String(nueva || '').length < 10) throw new Error('La nueva contraseña debe tener al menos 10 caracteres.');
      if (P.mode === 'server') return api('/admin/password', { method: 'POST', body: JSON.stringify({ actual, nueva }) });
      const a = LS.get('atalaya.admin');
      if (!a || a.hash !== await hash(a.salt + actual)) throw new Error('La contraseña actual no es correcta.');
      const salt = uid(); LS.set('atalaya.admin', { salt, hash: await hash(salt + nueva) }); return { ok: true };
    }
  };
  const needAdmin = () => { if (P.mode !== 'server' && !localAdminOk()) throw new Error('Entra con la contraseña de administración.'); };
  P.admin = {
    /* Genera un enlace de recuperación de contraseña para un usuario (caduca en 60 minutos) */
    async resetLink(id, enviar) {
      await P.ready;
      const base = location.href.replace(/[^/]*([?#].*)?$/, '') + 'acceso.html#reset=';
      if (P.mode === 'server') { const r = await api('/admin/users/' + id + '/reset', { method: 'POST', body: JSON.stringify({ enviar: !!enviar }) }); return { link: base + r.token, minutos: r.minutos, enviado: r.enviado }; }
      needAdmin();
      const token = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, '0')).join('');
      const users = L.users(); const u = users.find((x) => x.id === id); if (!u) throw new Error('Usuario no encontrado');
      u.reset = { hash: await hash(token), exp: new Date(Date.now() + 60 * 60e3).toISOString() }; delete u.solicitudReset; L.save(users);
      return { link: base + token, minutos: 60, enviado: false };
    },
    async list() {
      await P.ready;
      if (P.mode === 'server') return (await api('/admin/users')).users;
      needAdmin(); return L.users().map(publicUser);
    },
    async update(id, patch) {
      await P.ready;
      if (P.mode === 'server') return (await api('/admin/users/' + id, { method: 'PATCH', body: JSON.stringify(patch) })).user;
      needAdmin();
      const users = L.users(); const u = users.find((x) => x.id === id); if (!u) throw new Error('Usuario no encontrado');
      ['estado', 'pagado', 'plan', 'venceAcceso', 'nota'].forEach((k) => { if (patch[k] !== undefined) u[k] = patch[k]; });
      if (patch.pagado === true && u.estado === 'prueba') u.estado = 'activo';
      if (patch.registrarPago) { u.pagos = u.pagos || []; u.pagos.push(Object.assign({ fecha: new Date().toISOString() }, patch.registrarPago)); }
      L.save(users); return publicUser(u);
    },
    async remove(id) {
      await P.ready;
      if (P.mode === 'server') return api('/admin/users/' + id, { method: 'DELETE' });
      needAdmin(); L.save(L.users().filter((u) => u.id !== id));
    }
  };
  P.usageMinutes = (u, days) => {
    const uso = u.uso || {}; let total = 0;
    const lim = days ? Date.now() - days * 864e5 : 0;
    Object.keys(uso).forEach((d) => { if (!days || new Date(d).getTime() >= lim) total += uso[d]; });
    return total;
  };

  /* ---------- Cabecera de cuenta ---------- */
  P.mountAccount = function (el) {
    if (!el) return;
    const u = P.user; if (!u) { el.innerHTML = ''; return; }
    const acc = P.accessOf(u);
    const ini = (u.nombre || u.email).split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
    el.innerHTML = `<button class="acc-btn" aria-haspopup="true" aria-expanded="false" title="${u.email}"><span>${ini}</span></button>
      <div class="acc-menu glass" hidden>
        <div class="acc-head"><b>${(u.nombre || u.email).replace(/</g, '&lt;')}</b><small>${u.email}</small><small>Plan ${PLANES[u.plan] ? PLANES[u.plan].nombre : u.plan} · ${acc.motivo === 'prueba' ? `prueba: quedan ${acc.diasPrueba} días` : 'acceso activo'}</small>${P.mode === 'local' ? '<small class="demo">Modo demostración: datos solo en este navegador</small>' : ''}</div>
        <a href="app.html">Simulador de inversión</a><a href="estrategia.html">Sistema estratégico</a><a href="manual.html">Manual de uso</a><a href="index.html">Página de Atalaya</a><button data-pw>Cambiar contraseña</button><button data-logout>Cerrar sesión</button>
        <form data-pwform hidden class="stack" style="padding:8px 12px 12px"><input class="input" type="password" name="actual" placeholder="Contraseña actual" autocomplete="current-password" required><input class="input" type="password" name="nueva" placeholder="Nueva (mín. 8 caracteres)" autocomplete="new-password" minlength="8" required><button class="btn solid" type="submit">Guardar</button><small data-pwmsg></small></form>
      </div>`;
    const b = el.querySelector('.acc-btn'), m = el.querySelector('.acc-menu');
    b.onclick = (e) => { e.stopPropagation(); m.hidden = !m.hidden; b.setAttribute('aria-expanded', !m.hidden); };
    document.addEventListener('click', (e) => { if (!el.contains(e.target)) m.hidden = true; });
    el.querySelector('[data-logout]').onclick = P.logout;
    const pf = el.querySelector('[data-pwform]');
    el.querySelector('[data-pw]').onclick = (e) => { e.stopPropagation(); pf.hidden = !pf.hidden; };
    pf.onsubmit = async (e) => {
      e.preventDefault(); const msg = pf.querySelector('[data-pwmsg]');
      try { await P.changePassword(pf.actual.value, pf.nueva.value); msg.textContent = 'Contraseña cambiada.'; msg.style.color = 'var(--go)'; pf.reset(); } catch (x) { msg.textContent = x.message; msg.style.color = 'var(--stop)'; }
    };
  };

  /* ---------- Fondo animado compartido ---------- */
  A.sky = function () {
    const cv = document.getElementById('sky'); if (!cv) return;
    const g = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W, H;
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + 0.2, a: Math.random() * 0.5 + 0.15 }));
    const size = () => { const dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const draw = (t) => {
      g.clearRect(0, 0, W, H);
      const sy = scrollY * 0.18;
      stars.forEach((s) => { g.fillStyle = `rgba(236,214,166,${s.a})`; g.beginPath(); g.arc(s.x * W, ((s.y * H * 1.6 - sy * 0.5) % H + H) % H, s.r, 0, 6.283); g.fill(); });
      for (let k = 0; k < 16; k++) {
        const base = H * 0.25 + k * (H * 0.06) - (sy % (H * 0.06));
        g.beginPath();
        for (let x = 0; x <= W; x += 14) {
          const y = base + Math.sin(x * 0.0042 + k * 0.6 + t * 0.00012) * 26 + Math.sin(x * 0.011 - k * 0.35 + t * 0.00008) * 9 + Math.cos((x + sy * 2) * 0.0019 + k) * 30;
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.strokeStyle = `rgba(212,174,100,${0.035 + (k % 4 === 0 ? 0.045 : 0)})`;
        g.lineWidth = k % 4 === 0 ? 1.1 : 0.7;
        g.stroke();
      }
    };
    size(); addEventListener('resize', size);
    if (reduce) { draw(0); addEventListener('scroll', () => draw(0), { passive: true }); }
    else { const loop = (t) => { draw(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  };
})();
