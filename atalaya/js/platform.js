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
  /* Planes. «empresas» es el límite de empresas o sociedades de la cuenta; Grupos cobra por tramos según cuántas tenga.
     Pago anual: un 30 % de descuento sobre el precio mensual, pagando el año por adelantado. */
  const PLANES = {
    esencial: { nombre: 'Esencial', precio: 49, periodo: 'mes', empresas: 1, para: 'Para estudiar una inversión', incluye: ['Simulador de inversión y crecimiento', 'Horizonte 3D y cinco escenarios', 'Semáforos con horquillas y plan de corrección', 'Informe de decisión', '1 empresa'] },
    profesional: { nombre: 'Profesional', precio: 129, periodo: 'mes', empresas: 1, destacado: true, para: 'Para diagnosticar tu empresa y decidir', incluye: ['Todo lo de Esencial', 'Sistema estratégico completo: 21 módulos, zona de origen de datos e informes 360', 'Análisis de cuentas de varios años', 'Asistente con voz', '1 empresa'] },
    consultora: { nombre: 'Consultora', precio: 349, periodo: 'mes', empresas: 15, para: 'Para consultores y asesorías', incluye: ['Todo lo de Profesional', 'Personas y equipos: DISC, aportaciones al equipo, eneagrama, encaje persona-puesto, liderazgo y tablillas de entrenamiento', 'Hasta 15 empresas cliente, cada una con su ficha y sus datos por separado', 'Mapa de empresas y vista de cartera de clientes', 'Acompañamiento en la puesta en marcha'] },
    // Grupos se contrata a medida con el equipo: no se publica precio. Los tramos quedan como referencia interna de administración
    grupos: { nombre: 'Grupos', precio: 690, periodo: 'mes', empresas: Infinity, grupo: true, aMedida: true, para: 'Para holdings y grupos familiares', tramos: [{ hasta: 5, precio: 690, n: 'De 1 a 5 sociedades' }, { hasta: 10, precio: 970, n: 'De 6 a 10 sociedades' }, { hasta: Infinity, precio: 1790, n: 'Más de 10 sociedades' }], incluye: ['Todo lo de Profesional, en cada sociedad del grupo', 'Estructuras de holding: sociedad dominante, filiales y participaciones, con su mapa', 'Vista de grupo: consolidado con eliminaciones intragrupo, comparativa y tesorería entre sociedades', 'Informes del grupo e informe 360 de cada sociedad', 'Plan estratégico de toda la corporación: objetivos de la holding en cascada a cada sociedad', 'Sociedades sin límite y acompañamiento de nuestro equipo'] }
  };
  const DTO_ANUAL = 0.30;
  const PRUEBA_DIAS = 14;

  const P = (A.platform = { mode: 'local', user: null, PLANES, PRUEBA_DIAS, DTO_ANUAL });
  const r2 = (x) => Math.round(x * 100) / 100;
  /* Precio de un plan: mensual o anual (−30 %); en Grupos, según el tramo de sociedades */
  P.precio = function (plan, periodo, n, pactada) {
    const p = PLANES[plan] || PLANES.profesional;
    // Plan a medida con cuota pactada por la administración: manda la cuota acordada (mensual)
    if (pactada > 0) return periodo === 'anual' ? { periodo: 'anual', base: pactada, mes: pactada, total: r2(pactada * 12), ahorro: 0, tramo: null, pactada: true } : { periodo: 'mensual', base: pactada, mes: pactada, total: pactada, ahorro: 0, tramo: null, pactada: true };
    const t = p.tramos ? p.tramos.find((x) => (n || 1) <= x.hasta) || p.tramos[p.tramos.length - 1] : null;
    const base = t ? t.precio : p.precio;
    if (periodo === 'anual') { const mes = r2(base * (1 - DTO_ANUAL)); return { periodo: 'anual', base, mes, total: r2(mes * 12), ahorro: r2(base * 12 - mes * 12), tramo: t }; }
    return { periodo: 'mensual', base, mes: base, total: base, ahorro: 0, tramo: t };
  };
  // Cómo se enseña una cuota: en anual, la cuota del año (12 meses con el 30 % de descuento), no una mensual rebajada
  P.cuota = (pr) => (pr.periodo === 'anual'
    ? { importe: pr.total, unidad: '/año', detalle: `12 × ${P.eur(pr.base)} = ${P.eur(r2(pr.base * 12))} − 30 % · ahorras ${P.eur(pr.ahorro)}` }
    : { importe: pr.mes, unidad: '/mes', detalle: '' });
  // Importes con punto de miles también en cifras de cuatro dígitos (1.083,60 €)
  P.eur = (x) => { const neg = x < 0, v = Math.abs(x), d = v % 1 ? 2 : 0; const [e, f] = v.toFixed(d).split('.'); return (neg ? '−' : '') + e.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f ? ',' + f : '') + ' €'; };

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
    const u = { id: uid(), nombre: (d.nombre || '').trim(), email, empresa: (d.empresa || '').trim(), telefono: (d.telefono || '').trim(), plan: PLANES[d.plan] ? d.plan : 'profesional', periodo: d.periodo === 'anual' ? 'anual' : 'mensual',
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
    ['nombre', 'empresa', 'telefono'].forEach((k) => { if (patch[k] !== undefined) u[k] = patch[k]; });
    if (patch.plan && PLANES[patch.plan] && patch.plan !== u.plan) { (u.cambiosPlan = u.cambiosPlan || []).push({ de: u.plan, a: patch.plan, fecha: new Date().toISOString() }); u.plan = patch.plan; }
    if (patch.periodo === 'mensual' || patch.periodo === 'anual') u.periodo = patch.periodo;
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
    await P.empresas.cargar();
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
  /* ---------- Varias empresas por cuenta ----------
     La empresa activa se recuerda en el navegador. La primera («principal») usa las claves de siempre, así los datos
     anteriores siguen donde estaban; las demás llevan su identificador: atalaya.v1@id en el navegador y simulador--id
     en el servidor. El registro de empresas se guarda como un dato más de la cuenta («empresas»). */
  const ACT = 'atalaya.empresa.activa';
  const SCOPED = ['simulador', 'estrategia', 'personas', 'consultor', 'agenda', 'nota', 'libro', 'intervencion'];
  P.empresaId = () => LS.get(ACT) || 'principal';
  P.k = (base, id) => { id = id || P.empresaId(); return id === 'principal' ? base : base + '@' + id; };
  const dk = (key, id) => { id = id || P.empresaId(); return SCOPED.includes(key) && id !== 'principal' ? key + '--' + id : key; };
  P.limiteEmpresas = (u) => { u = u || P.user; const p = PLANES[(u && u.plan) || 'profesional'] || PLANES.profesional; return p.empresas; };
  /* Cuenta con datos reales: se activa al empezar una empresa por la auditoría (al subir sus transcripciones).
     Desde entonces ningún mundo usa los datos de ejemplo: los que no tienen datos subidos se quedan a cero y los piden. */
  P.modoReal = () => { const e = P.empresas && P.empresas.activa && P.empresas.activa(); return !!(e && e.datosReales); };
  P.activarModoReal = async (origen) => {
    const e = P.empresas && P.empresas.activa && P.empresas.activa(); if (!e || e.datosReales) return false;
    await P.empresas.editar(e.id, { datosReales: true, datosRealesDesde: new Date().toISOString().slice(0, 10), datosRealesTs: new Date().toISOString(), datosRealesOrigen: origen || 'auditoria' });
    // El simulador guardado de ejemplo se pone a cero (los demás mundos se vacían al abrirlos)
    try { const sim = await P.loadData('simulador'); if (A.simEsEjemplo(sim)) await P.saveData('simulador', A.simVacio(e.nombre && e.nombre !== 'Mi empresa' ? e.nombre : '', (sim && sim.sector) || e.sector || 'industria')); } catch (x) { /* sin simulador */ }
    try { window.dispatchEvent(new CustomEvent('atalaya:modoreal', { detail: e })); } catch (x) { /* sin eventos */ }
    return true;
  };
  // Volver a permitir los datos de ejemplo en los mundos que aún no tienen datos (los datos reales subidos se conservan)
  P.desactivarModoReal = async () => { const e = P.empresas && P.empresas.activa && P.empresas.activa(); if (!e || !e.datosReales) return false; await P.empresas.editar(e.id, { datosReales: false }); try { window.dispatchEvent(new CustomEvent('atalaya:modoreal', { detail: e })); } catch (x) { /* sin eventos */ } return true; };
  // Simulación a cero (sin datos de ejemplo), a la espera de las cuentas de la empresa
  A.simVacio = (nombre, sector) => ({ empresaNombre: nombre || '', ejemplo: false, sinDatos: true, proyecto: '', sector: sector || 'industria',
    empresa: { ventas: 0, margen: 0, personal: 0, plantilla: 0, fijos: 0, caja: 0, deudaViva: 0, cuotaDeuda: 0, fondosPropios: 0, polizaLimite: 0, polizaDispuesta: 0, dso: 0, dio: 0, dpo: 0, crecimiento: 0 },
    inversion: { importe: 0, pctFin: 0, incVentas: 0, contrataciones: 0, fijosNuevos: 0, aportacion: 0, lineas: [] },
    humano: { mandos: 0, mandosFormados: 0, dependencia: 0, procesos: 0, rotacion: 0, clima: 0, polivalencia: 0, absentismo: 0, horasExtra: 0, sucesion: 0 },
    opciones: [], hipotesis: [] });
  A.simEsEjemplo = (s) => !s || !s.empresa || (s.ejemplo !== false && !s.sinDatos);
  P.esGrupo = (u) => { u = u || P.user; return !!(u && PLANES[u.plan] && (PLANES[u.plan].grupo || PLANES[u.plan].empresas > 1)); };
  let REG = null;
  P.empresas = {
    async cargar() {
      if (REG) return REG;
      const r = await P.loadData('empresas');
      REG = r && Array.isArray(r.lista) && r.lista.length ? r : { lista: [{ id: 'principal', nombre: (P.user && P.user.empresa) || 'Mi empresa', rol: 'holding', participacion: 100, alta: new Date().toISOString() }] };
      // Si el navegador recuerda una empresa que no es de esta cuenta, se vuelve a la principal
      if (!REG.lista.some((e) => e.id === P.empresaId())) { LS.set(ACT, 'principal'); location.reload(); }
      return REG;
    },
    lista: () => (REG ? REG.lista : []),
    activa: () => (REG ? REG.lista.find((e) => e.id === P.empresaId()) || REG.lista[0] : null),
    // En el servidor el alta de empresas se comprueba: si el plan no lo permite, el error llega aquí
    async guardar() { await P.ready; if (P.mode === 'server') { await api('/data/empresas', { method: 'PUT', body: JSON.stringify(REG) }); return; } await P.saveData('empresas', REG); },
    async crear(d) {
      await P.empresas.cargar();
      const lim = P.limiteEmpresas();
      if (REG.lista.length >= lim) throw new Error(lim === 1 ? 'Tu plan incluye una empresa. Para trabajar con varias, pasa a Consultora (empresas cliente) o a Grupos (sociedades de un grupo).' : `Tu plan incluye hasta ${lim} empresas.`);
      const e = Object.assign({}, d, { id: 'e' + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 4), nombre: (d.nombre || '').trim() || 'Nueva empresa', rol: d.rol || (P.user && PLANES[P.user.plan] && PLANES[P.user.plan].grupo ? 'filial' : 'cliente'), participacion: d.participacion != null && d.participacion !== '' ? +d.participacion : 100, alta: new Date().toISOString() });
      REG.lista.push(e);
      try { await P.empresas.guardar(); } catch (x) { REG.lista = REG.lista.filter((y) => y.id !== e.id); throw x; }
      return e;
    },
    async editar(id, cambios) { await P.empresas.cargar(); const e = REG.lista.find((x) => x.id === id); if (!e) return; Object.assign(e, cambios); await P.empresas.guardar(); return e; },
    async borrar(id) {
      await P.empresas.cargar();
      if (id === 'principal') throw new Error('La empresa principal no se puede borrar.');
      REG.lista = REG.lista.filter((x) => x.id !== id); await P.empresas.guardar();
      for (const k of SCOPED) { await P.saveData(k + '--' + id, null); LS.del(P.k({ simulador: 'atalaya.v1', estrategia: 'atalaya.estrategia.v1', personas: 'atalaya.personas.v1', consultor: 'atalaya.consultor.v1', agenda: 'atalaya.agenda.v1', nota: 'atalaya.nota.v1', libro: 'atalaya.libro.v1', intervencion: 'atalaya.intervencion.v1' }[k], id)); }
      if (P.empresaId() === id) LS.set(ACT, 'principal');
    },
    cambiar(id) { LS.set(ACT, id); location.reload(); }
  };
  /* Datos de otra empresa de la cuenta (vista de grupo) */
  P.loadDataOf = async function (key, id) {
    await P.ready;
    const k = dk(key, id);
    if (P.mode === 'server') { try { const r = await api('/data/' + encodeURIComponent(k)); return r && r.data; } catch (e) { return null; } }
    const s = L.session(); return s ? LS.get(`atalaya.data.${s.id}.${k}`) : null;
  };

  P.saveData = async function (key, obj) {
    await P.ready;
    key = dk(key);
    if (P.mode === 'server') { try { await api('/data/' + encodeURIComponent(key), { method: 'PUT', body: JSON.stringify(obj) }); } catch (e) { /* se queda en local */ } return; }
    const s = L.session(); if (s) LS.set(`atalaya.data.${s.id}.${key}`, obj);
  };
  P.loadData = async function (key) {
    await P.ready;
    key = dk(key);
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
    /* Solicitudes de contacto (plan Grupos a medida) */
    async contactos() { await P.ready; if (P.mode === 'server') return (await api('/admin/contactos')).contactos || []; needAdmin(); return LS.get('atalaya.contactos') || []; },
    /* La administración pone una contraseña nueva a un usuario */
    async setPassword(id, password) {
      await P.ready;
      if (String(password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
      if (P.mode === 'server') return api('/admin/users/' + id + '/password', { method: 'POST', body: JSON.stringify({ password }) });
      needAdmin();
      const users = L.users(); const u = users.find((x) => x.id === id); if (!u) throw new Error('Usuario no encontrado');
      u.salt = uid(); u.hash = await hash(u.salt + password); delete u.reset; delete u.solicitudReset; u.passwordCambiada = new Date().toISOString(); L.save(users);
      return { ok: true };
    },
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
    /* Concede un plan a medida (Grupos) a quien lo pidió: crea la cuenta si no existe y devuelve la invitación */
    async conceder(d) {
      await P.ready;
      const base = location.href.replace(/[^/]*([?#].*)?$/, '') + 'acceso.html#reset=';
      if (P.mode === 'server') { const r = await api('/admin/conceder', { method: 'POST', body: JSON.stringify(d) }); return Object.assign(r, { link: r.token ? base + r.token : null }); }
      needAdmin();
      const email = String(d.email || '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Correo no válido');
      const users = L.users(); let u = users.find((x) => x.email === email), creado = false;
      if (!u) { const salt = uid(); u = { id: uid(), nombre: (d.nombre || '').trim(), email, empresa: (d.empresa || '').trim(), telefono: (d.telefono || '').trim(), rol: 'cliente', alta: new Date().toISOString(), ultimoAcceso: null, sesiones: 0, uso: {}, salt, hash: await hash(salt + uid() + uid()) }; users.push(u); creado = true; }
      const meses = Math.max(1, Math.min(36, +d.meses || (d.periodo === 'anual' ? 12 : 1))), venc = new Date(); venc.setMonth(venc.getMonth() + meses);
      Object.assign(u, { plan: PLANES[d.plan] ? d.plan : 'grupos', periodo: d.periodo === 'anual' ? 'anual' : 'mensual', estado: 'activo', pagado: true, venceAcceso: venc.toISOString(), cuotaPactada: +d.cuota || null, concedido: new Date().toISOString() });
      let link = null;
      if (creado) { const token = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, '0')).join(''); u.reset = { hash: await hash(token), exp: new Date(Date.now() + 7 * 864e5).toISOString() }; link = base + token; }
      L.save(users);
      const cs = LS.get('atalaya.contactos') || []; cs.forEach((c) => { if (String(c.email).toLowerCase() === email) c.atendido = new Date().toISOString(); }); LS.set('atalaya.contactos', cs);
      return { user: publicUser(u), creado, link, minutos: creado ? 7 * 24 * 60 : 0, enviado: false };
    },
    async list() {
      await P.ready;
      if (P.mode === 'server') return (await api('/admin/users')).users;
      needAdmin(); return L.users().map((u) => { const r = LS.get(`atalaya.data.${u.id}.empresas`); return Object.assign(publicUser(u), { empresas: r && Array.isArray(r.lista) ? r.lista.length : 1 }); });
    },
    async update(id, patch) {
      await P.ready;
      if (P.mode === 'server') return (await api('/admin/users/' + id, { method: 'PATCH', body: JSON.stringify(patch) })).user;
      needAdmin();
      const users = L.users(); const u = users.find((x) => x.id === id); if (!u) throw new Error('Usuario no encontrado');
      ['estado', 'pagado', 'plan', 'periodo', 'venceAcceso', 'nota'].forEach((k) => { if (patch[k] !== undefined) u[k] = patch[k]; });
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
  /* ---------- Qué incluye cada plan y cambio de plan ----------
     Una sola fuente para toda la aplicación: qué mundos abre cada plan, cuántas empresas admite y qué vista
     de conjunto tiene. El cambio de plan se hace dentro de la aplicación (no desde la página comercial):
     en la prueba es libre y al momento; con el acceso activado también es inmediato y la diferencia de cuota
     se ajusta en el siguiente cobro. Para bajar a un plan con menos empresas, antes hay que borrar las que sobran. */
  P.puede = (f, u) => {
    u = u || P.user; const k = (u && u.plan) || 'profesional', pl = PLANES[k] || PLANES.profesional;
    if (f === 'estrategia') return k !== 'esencial';
    if (f === 'varias') return pl.empresas > 1;
    if (f === 'grupo') return !!pl.grupo;
    if (f === 'cartera') return k === 'consultora';
    // Personas y equipos (y su liderazgo) es exclusivo del plan Consultora
    if (f === 'personas') return k === 'consultora';
    // Informes en dos partes (para la empresa y cuaderno interno del consultor)
    if (f === 'consultor') return k === 'consultora';
    // La auditoría integral (primera sesión, auditoría e intervención) es la herramienta del consultor
    if (f === 'intervencion') return k === 'consultora';
    return true;
  };
  P.PLAN_RESUMEN = {
    esencial: { mundos: 'Simulador de inversión', empresas: '1 empresa', vista: '—' },
    profesional: { mundos: 'Simulador y sistema estratégico', empresas: '1 empresa', vista: '—' },
    consultora: { mundos: 'Simulador, sistema estratégico y personas y equipos', empresas: 'Hasta 15 empresas cliente', vista: 'Cartera de clientes' },
    grupos: { mundos: 'Simulador y sistema estratégico', empresas: 'Sociedades sin límite', vista: 'Vista de grupo con consolidado' }
  };
  P.cambiarPlan = async function (plan, periodo) {
    if (!PLANES[plan]) throw new Error('Plan no válido');
    await P.empresas.cargar();
    const n = P.empresas.lista().length, lim = PLANES[plan].empresas;
    if (n > lim) throw new Error(`Tienes ${n} empresas dadas de alta y ${PLANES[plan].nombre} admite ${lim}. Borra antes las que no necesites (desde el mapa de empresas) y vuelve a intentarlo.`);
    const antes = P.user && P.user.plan;
    const u = await P.updateMe({ plan, periodo: periodo || (P.user && P.user.periodo) || 'mensual' });
    // La principal pasa a holding o a cliente según el nuevo plan, para que el mapa tenga sentido
    if (PLANES[plan].grupo !== (PLANES[antes] || {}).grupo) { const pr = P.empresas.lista().find((e) => e.id === 'principal'); if (pr && !pr.rolFijado) { pr.rol = PLANES[plan].grupo ? 'holding' : (plan === 'consultora' ? 'cliente' : 'holding'); try { await P.empresas.guardar(); } catch (x) { /* se corrige en el mapa */ } } }
    return u;
  };
  /* ---------- Contactar con el equipo (planes a medida) ---------- */
  P.contactar = async function (d) {
    await P.ready;
    const c = Object.assign({ fecha: new Date().toISOString() }, d);
    if (P.mode === 'server') return api('/contacto', { method: 'POST', body: JSON.stringify(c) });
    const l = LS.get('atalaya.contactos') || []; l.unshift(c); LS.set('atalaya.contactos', l.slice(0, 300)); return { ok: true };
  };
  P.formContacto = function (opts) {
    opts = opts || {};
    const u = P.user || {}, ses = opts.tipo === 'sesion';
    const back = document.createElement('div'); back.className = 'ef-back';
    back.innerHTML = `<form class="ef-card glass" role="dialog" aria-modal="true" aria-label="Contactar con nuestro equipo" style="width:min(600px,100%)">
      <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
      ${ses ? `<div class="eyebrow">Business Avance · sesión de 60 minutos</div>
      <h3 style="margin:0;font-family:var(--font-display);font-weight:700;font-size:1.5rem">Traiga sus objetivos</h3>
      <p class="small muted" style="margin:0">Una sesión de 60 minutos con la dirección de Business Avance: si sus objetivos son alcanzables con la estructura que tiene hoy, cuánto le cuestan hoy los problemas que ve y qué retorno puede esperar. Sin coste y sin propuesta comercial.</p>` : `<div class="eyebrow">Plan Grupos · a medida</div>
      <h3 style="margin:0;font-family:var(--font-display);font-weight:500;font-size:1.5rem">Hablemos de tu grupo</h3>
      <p class="small muted" style="margin:0">El plan Grupos se ajusta a cada holding o grupo familiar: número de sociedades, estructura y acompañamiento. Déjanos tus datos y nuestro equipo te llama para preparar la propuesta.</p>`}
      <div class="ef-grid">
        <label><span>Nombre</span><input class="input" name="nombre" required value="${escH(u.nombre || '')}"></label>
        <label><span>Correo</span><input class="input" name="email" type="email" required value="${escH(u.email || '')}"></label>
        <label><span>Teléfono</span><input class="input" name="telefono" value="${escH(u.telefono || '')}"></label>
        <label><span>${ses ? 'Empresa' : 'Grupo o sociedad dominante'}</span><input class="input" name="empresa" value="${escH(u.empresa || '')}"></label>
        <label><span>${ses ? 'Personas en plantilla' : 'Número de sociedades'}</span><input class="input" name="sociedades" type="number" min="1" placeholder="${ses ? 'Por ejemplo, 60' : 'Por ejemplo, 4'}"></label>
        <label class="ef-wide"><span>${ses ? 'Sus objetivos' : 'Qué necesitas'}</span><textarea class="input" name="mensaje" rows="3" placeholder="${ses ? 'Qué quiere conseguir este año: margen, crecimiento, inversión, equipo…' : 'Estructura del grupo, qué quieres consolidar, plazos…'}"></textarea></label>
      </div>
      <p class="small" data-msg style="margin:0"></p>
      <div class="row"><button class="btn solid" type="submit">${ses ? 'Solicitar la sesión' : 'Enviar a nuestro equipo'}</button><button type="button" class="btn ghost" data-cancel>Cancelar</button></div>
    </form>`;
    document.body.appendChild(back);
    const f = back.querySelector('form'), close = () => back.remove();
    back.querySelector('.ef-x').onclick = close; f.querySelector('[data-cancel]').onclick = close;
    back.addEventListener('click', (ev) => { if (ev.target === back) close(); });
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const d = { plan: opts.plan || 'grupos', origen: opts.origen || location.pathname.split('/').pop(), cuenta: u.id || null };
      ['nombre', 'email', 'telefono', 'empresa', 'sociedades', 'mensaje'].forEach((k) => { d[k] = f[k].value.trim(); });
      try { await P.contactar(d); f.innerHTML = `<button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button><div class="eyebrow">Recibido</div><h3 style="margin:0;font-family:var(--font-display);font-weight:500;font-size:1.5rem">Gracias, ${escH(d.nombre.split(' ')[0])}</h3><p>${ses ? `La dirección de Business Avance le escribirá a ${escH(d.email)}${d.telefono ? ' o le llamará al ' + escH(d.telefono) : ''} para fijar la sesión.` : `Nuestro equipo te contactará en ${escH(d.email)}${d.telefono ? ' o en el ' + escH(d.telefono) : ''} para preparar la propuesta del plan Grupos.`}</p><div class="row"><button type="button" class="btn solid" data-ok>Cerrar</button></div>`; f.querySelector('.ef-x').onclick = close; f.querySelector('[data-ok]').onclick = close; }
      catch (x) { f.querySelector('[data-msg]').textContent = x.message; }
    };
  };
  P.panelPlanes = function (opts) {
    opts = opts || {};
    const u = P.user; if (!u) return;
    const acc = P.accessOf(u); let periodo = u.periodo || 'mensual';
    const n = P.empresas.lista().length || 1;
    const back = document.createElement('div'); back.className = 'ef-back';
    const draw = () => {
      back.innerHTML = `<div class="ef-card pl-card glass" role="dialog" aria-modal="true" aria-label="Mi plan">
        <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
        <div class="eyebrow">Mi plan</div>
        <h3 style="margin:0;font-family:var(--font-display);font-weight:500;font-size:1.6rem">Ahora tienes <em>${PLANES[u.plan] ? PLANES[u.plan].nombre : u.plan}</em> · pago ${(u.periodo || 'mensual') === 'anual' ? 'anual' : 'mensual'}</h3>
        <p class="small" style="margin:0">Tu cuota: <b>${(() => { const c = P.cuota(P.precio(u.plan, u.periodo, n, u.cuotaPactada)); return P.eur(c.importe) + c.unidad; })()}</b></p>
        <p class="small muted" style="margin:0">${acc.motivo === 'prueba' ? `Estás en la prueba gratuita (quedan ${acc.diasPrueba} días). Puedes cambiar de plan cuando quieras sin coste: la prueba sigue contando desde tu alta.` : acc.motivo === 'pagado' ? 'Tu acceso está activado. El cambio se aplica al momento y la diferencia de cuota se ajusta en tu siguiente cobro; te lo confirmaremos por correo.' : 'Elige el plan que quieres activar.'}${opts.motivo ? `<br><b style="color:var(--gold-soft)">${opts.motivo}</b>` : ''}</p>
        <div class="seg" style="margin:0;justify-self:start"><button data-per="mensual" aria-pressed="${periodo === 'mensual'}">Pago mensual</button><button data-per="anual" aria-pressed="${periodo === 'anual'}">Pago anual · −30 %</button></div>
        ${periodo === 'anual' ? '<p class="small muted" style="margin:0">Cuota anual: se paga el año por adelantado y equivale a doce meses con un 30 % de descuento.</p>' : ''}
        <div class="pl-grid">${Object.keys(PLANES).map((k) => {
          const pl = PLANES[k], pr = P.precio(k, periodo, k === 'grupos' ? Math.max(1, n) : 1), r = P.PLAN_RESUMEN[k], cur = k === u.plan;
          const bloq = n > pl.empresas;
          return `<div class="pl-it ${cur ? 'on' : ''} ${opts.destacar === k ? 'dest' : ''}">
            <div class="row"><b>${pl.nombre}</b>${cur ? '<span class="em-act">tu plan</span>' : ''}</div>
            ${pl.aMedida ? '<div class="pl-precio" style="font-size:1.1rem">Precio a medida</div><div class="small muted">Lo preparamos con nuestro equipo según tus sociedades</div>' : (() => { const c = P.cuota(pr); return `<div class="pl-precio">${pl.tramos && n <= 1 ? '<small>desde </small>' : ''}${P.eur(c.importe)}<small>${c.unidad}</small></div>${c.detalle ? `<div class="small muted">${c.detalle}</div>` : ''}`; })()}
            <div class="small muted">${pl.para || ''}</div>
            <ul class="small"><li>${r.mundos}</li><li>${r.empresas}</li>${r.vista !== '—' ? `<li>${r.vista}</li>` : ''}</ul>
            ${pl.aMedida && !cur ? '<button class="btn solid small" data-contacto>Contactar con nuestro equipo</button>' : cur ? (periodo !== (u.periodo || 'mensual') ? `<button class="btn solid small" data-plan="${k}">Pasar a pago ${periodo}</button>` : '<button class="btn ghost small" disabled>Es tu plan</button>') : bloq ? `<p class="small" style="color:var(--warn);margin:0">Tienes ${n} empresas y este plan admite ${pl.empresas}. Para bajar, antes hay que borrar ${n - pl.empresas}.</p><a class="btn ghost small" href="portal.html#empresas">Ir al mapa de empresas</a>` : `<button class="btn ${PLANES[k].precio > (PLANES[u.plan] || {}).precio ? 'solid' : 'ghost'} small" data-plan="${k}">${PLANES[k].precio > (PLANES[u.plan] || {}).precio ? 'Subir' : 'Bajar'} a ${pl.nombre}</button>`}
          </div>`;
        }).join('')}</div>
        <p class="small" data-msg style="margin:0"></p>
        <p class="small muted" style="margin:0">Los datos de cada empresa se conservan siempre al cambiar de plan.</p>
      </div>`;
      back.querySelector('.ef-x').onclick = () => back.remove();
      back.querySelectorAll('[data-per]').forEach((b) => b.onclick = () => { periodo = b.dataset.per; draw(); });
      back.querySelectorAll('[data-contacto]').forEach((b) => b.onclick = () => { back.remove(); P.formContacto({ plan: 'grupos', origen: 'mi-plan' }); });
      back.querySelectorAll('[data-plan]').forEach((b) => b.onclick = async () => {
        const k = b.dataset.plan, msg = back.querySelector('[data-msg]');
        try { await P.cambiarPlan(k, periodo); const c = P.cuota(P.precio(k, periodo, n)); msg.style.color = 'var(--go)'; msg.textContent = `Hecho: ahora tienes ${PLANES[k].nombre} con pago ${periodo}: ${P.eur(c.importe)}${c.unidad}.`; setTimeout(() => { if (opts.onCambio) opts.onCambio(k); else location.reload(); }, 700); }
        catch (x) { msg.style.color = 'var(--stop)'; msg.textContent = x.message; }
      });
    };
    draw();
    back.addEventListener('click', (ev) => { if (ev.target === back) back.remove(); });
    const esc = (ev) => { if (ev.key === 'Escape') { back.remove(); removeEventListener('keydown', esc); } };
    addEventListener('keydown', esc);
    document.body.appendChild(back);
  };

  /* ---------- Ficha y mapa de empresas ----------
     Cada empresa de la cuenta tiene una ficha (forma jurídica, CIF, año de constitución, sector, actividad,
     provincia, plantilla, socios y su porcentaje y, en un grupo, de qué sociedad depende y con qué participación).
     El mapa es el primer paso del puesto de mando: se elige la empresa y después se entra en los mundos. */
  P.FORMAS = ['Sociedad limitada (S.L.)', 'Sociedad anónima (S.A.)', 'Autónomo', 'Sociedad cooperativa', 'Sociedad laboral', 'Comunidad de bienes', 'Otra'];
  const escH = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PAL = ['#c9f24d', '#3987e5', '#199e70', '#d55181', '#d95926', '#9b7bff'];
  const sectores = () => ((window.Atalaya || {}).SECTORS) || null;
  P.fichaCompleta = (e) => {
    const k = ['forma', 'cif', 'constitucion', 'sector', 'actividad', 'provincia', 'plantilla'];
    const ok = k.filter((x) => e[x] != null && e[x] !== '').length + (e.socios && e.socios.length ? 1 : 0) + (e.nombre && e.nombre !== 'Mi empresa' && e.nombre !== 'Nueva empresa' ? 1 : 0);
    return Math.round(ok / (k.length + 2) * 100);
  };
  P.fichaEmpresa = function (e, opts) {
    opts = opts || {};
    const u = P.user, plan = PLANES[(u && u.plan) || 'profesional'] || PLANES.profesional, grupo = !!plan.grupo;
    const d = Object.assign({ nombre: '', forma: P.FORMAS[0], cif: '', constitucion: '', sector: '', actividad: '', provincia: '', plantilla: '', socios: [], rol: grupo ? 'filial' : (e && e.id === 'principal' ? 'holding' : 'cliente'), matriz: '', participacion: 100, contacto: '' }, e || {});
    const S = sectores(), lista = P.empresas.lista();
    const holdings = lista.filter((x) => x.rol === 'holding' && (!e || x.id !== e.id));
    return new Promise((resolve) => {
      const back = document.createElement('div'); back.className = 'ef-back';
      const socioRow = (s) => `<div class="ef-socio"><input class="input" data-sn placeholder="Nombre del socio o sociedad" value="${escH(s.nombre)}"><input class="input" data-sp type="number" min="0" max="100" step="0.01" value="${s.pct != null ? s.pct : ''}" placeholder="%"><button type="button" class="icon-btn" data-sdel aria-label="Quitar socio">×</button></div>`;
      back.innerHTML = `<form class="ef-card glass" role="dialog" aria-modal="true" aria-label="Ficha de la empresa">
        <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
        <div class="eyebrow">${opts.nuevo ? (grupo ? 'Nueva sociedad' : 'Nueva empresa') : 'Ficha de la empresa'}</div>
        <label class="ef-name"><span>Nombre o razón social</span><input name="nombre" required value="${escH(d.nombre === 'Mi empresa' ? '' : d.nombre)}" placeholder="Por ejemplo: Transportes Ruiz, S.L."></label>
        <div class="ef-grid">
          <label><span>Forma jurídica</span><select class="input" name="forma">${P.FORMAS.map((f) => `<option ${f === d.forma ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
          <label><span>CIF o NIF</span><input class="input" name="cif" value="${escH(d.cif)}" placeholder="B12345678"></label>
          <label><span>Año de constitución</span><input class="input" name="constitucion" type="number" min="1850" max="${new Date().getFullYear()}" value="${escH(d.constitucion)}" placeholder="2008"></label>
          <label><span>Sector</span>${S ? `<select class="input" name="sector"><option value="">Elegir…</option>${Object.keys(S).map((k) => `<option value="${k}" ${k === d.sector ? 'selected' : ''}>${S[k].nombre}</option>`).join('')}</select>` : `<input class="input" name="sector" value="${escH(d.sector)}">`}</label>
          <label class="ef-wide"><span>A qué se dedica</span><input class="input" name="actividad" value="${escH(d.actividad)}" placeholder="Fabricación de envases de cartón para la industria alimentaria"></label>
          <label><span>Provincia</span><input class="input" name="provincia" value="${escH(d.provincia)}" placeholder="Valencia"></label>
          <label><span>Personas en plantilla</span><input class="input" name="plantilla" type="number" min="0" value="${escH(d.plantilla)}"></label>
          ${!grupo && d.rol === 'cliente' ? `<label class="ef-wide"><span>Persona de contacto</span><input class="input" name="contacto" value="${escH(d.contacto)}" placeholder="Nombre, cargo y teléfono"></label>` : ''}
        </div>
        ${grupo ? `<h4>En el grupo</h4><div class="ef-grid">
          <label><span>Papel</span><select class="input" name="rol"><option value="holding" ${d.rol === 'holding' ? 'selected' : ''}>Holding · sociedad dominante</option><option value="filial" ${d.rol !== 'holding' ? 'selected' : ''}>Filial o participada</option></select></label>
          <label data-fil><span>Depende de</span><select class="input" name="matriz"><option value="">${holdings.length ? 'Elegir la sociedad dominante…' : 'Primero da de alta la holding'}</option>${holdings.map((h) => `<option value="${h.id}" ${h.id === d.matriz ? 'selected' : ''}>${escH(h.nombre)}</option>`).join('')}</select></label>
          <label data-fil><span>% que tiene la dominante</span><input class="input" name="participacion" type="number" min="0" max="100" step="0.01" value="${escH(d.participacion)}"></label>
        </div>` : ''}
        <h4>Socios y porcentaje</h4>
        <p class="small muted" style="margin:0">Quién es dueño de la empresa y en qué proporción: personas, familias o sociedades. Sirve para la valoración, la sucesión y la vista de grupo.</p>
        <div class="ef-socios">${(d.socios.length ? d.socios : [{ nombre: '', pct: '' }]).map(socioRow).join('')}</div>
        <div class="row"><button type="button" class="btn ghost small" data-sadd>Añadir socio</button><span class="small" data-stot></span></div>
        <h4>Datos con los que se trabaja</h4>
        <div class="ef-datos">
          <label class="ef-modo"><input type="radio" name="modoDatos" value="ejemplo" ${d.datosReales ? '' : 'checked'}><span><b>Trabajar con datos ficticios</b><small>Sirven de ejemplo para conocer la herramienta: los mundos sin datos muestran una empresa ficticia.</small></span></label>
          <label class="ef-modo"><input type="radio" name="modoDatos" value="real" ${d.datosReales ? 'checked' : ''}><span><b>Trabajar con datos reales</b><small>Solo cuenta lo que se adjunta: transcripciones y documentación. Cada mundo con el que no se haya trabajado se pone a cero y pide sus datos; lo ya trabajado se conserva.</small></span></label>
          ${d.datosReales && d.datosRealesDesde ? `<small class="muted">Con datos reales desde el ${new Date(d.datosRealesDesde + 'T12:00:00').toLocaleDateString('es-ES')}.</small>` : ''}
        </div>
        <p class="small" data-msg style="color:var(--stop)"></p>
        <div class="row"><button class="btn solid" type="submit">${opts.nuevo ? 'Dar de alta' : 'Guardar la ficha'}</button><button type="button" class="btn ghost" data-cancel>Cancelar</button></div>
      </form>`;
      document.body.appendChild(back);
      const f = back.querySelector('form');
      const tot = () => { const t = Array.from(f.querySelectorAll('[data-sp]')).reduce((a, x) => a + (parseFloat(x.value) || 0), 0); const el = f.querySelector('[data-stot]'); el.textContent = t ? `Suman ${String(Math.round(t * 100) / 100).replace('.', ',')} %${Math.abs(t - 100) > 0.01 ? ' (deberían sumar 100 %)' : ''}` : ''; el.style.color = t && Math.abs(t - 100) > 0.01 ? 'var(--warn)' : 'var(--muted)'; };
      const bindSoc = () => { f.querySelectorAll('[data-sdel]').forEach((b) => b.onclick = () => { b.parentElement.remove(); tot(); }); f.querySelectorAll('[data-sp]').forEach((x) => x.oninput = tot); };
      bindSoc(); tot();
      f.querySelector('[data-sadd]').onclick = () => { f.querySelector('.ef-socios').insertAdjacentHTML('beforeend', socioRow({ nombre: '', pct: '' })); bindSoc(); };
      const filVis = () => { const r = f.rol; f.querySelectorAll('[data-fil]').forEach((x) => { x.hidden = r && r.value === 'holding'; }); };
      if (f.rol) { f.rol.onchange = filVis; filVis(); }
      const close = (v) => { back.remove(); resolve(v); };
      back.querySelector('.ef-x').onclick = () => close(null); f.querySelector('[data-cancel]').onclick = () => close(null);
      back.addEventListener('click', (ev) => { if (ev.target === back) close(null); });
      setTimeout(() => f.nombre.focus(), 30);
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const socios = Array.from(f.querySelectorAll('.ef-socio')).map((r) => ({ nombre: r.querySelector('[data-sn]').value.trim(), pct: parseFloat(r.querySelector('[data-sp]').value) })).filter((s) => s.nombre || isFinite(s.pct)).map((s) => ({ nombre: s.nombre || 'Socio', pct: isFinite(s.pct) ? s.pct : null }));
        const v = (n) => (f[n] ? f[n].value.trim() : undefined);
        const datos = { nombre: v('nombre'), forma: v('forma'), cif: v('cif').toUpperCase(), constitucion: v('constitucion') ? +v('constitucion') : '', sector: v('sector'), actividad: v('actividad'), provincia: v('provincia'), plantilla: v('plantilla') ? +v('plantilla') : '', socios };
        if (f.contacto) datos.contacto = v('contacto');
        const quiereReal = (f.querySelector('[name=modoDatos]:checked') || {}).value === 'real', cambiaModo = quiereReal !== !!d.datosReales;
        if (opts.nuevo && quiereReal) Object.assign(datos, { datosReales: true, datosRealesDesde: new Date().toISOString().slice(0, 10), datosRealesTs: new Date().toISOString(), datosRealesOrigen: 'ficha' });
        if (f.rol) { datos.rol = v('rol'); datos.matriz = datos.rol === 'holding' ? '' : v('matriz'); datos.participacion = datos.rol === 'holding' ? 100 : +(v('participacion') || 100); }
        if (!opts.nuevo && cambiaModo && !confirm(quiereReal ? `¿Trabajar con datos reales en ${datos.nombre || 'esta empresa'}?\n\nNingún mundo usará datos de ejemplo: los que no se hayan trabajado se ponen a cero y piden sus datos (transcripciones y documentación). Lo ya trabajado se conserva.` : `¿Volver a permitir datos ficticios en ${datos.nombre || 'esta empresa'}?\n\nLos datos reales ya subidos se conservan; los mundos sin datos podrán mostrar el ejemplo.`)) return;
        try { const r = opts.nuevo ? await P.empresas.crear(datos) : await P.empresas.editar(e.id, datos);
          if (!opts.nuevo && cambiaModo) { const act = P.empresas.activa(); if (act && act.id === e.id) { if (quiereReal) await P.activarModoReal('ficha'); else await P.desactivarModoReal(); setTimeout(() => location.reload(), 50); } else await P.empresas.editar(e.id, quiereReal ? { datosReales: true, datosRealesDesde: new Date().toISOString().slice(0, 10), datosRealesTs: new Date().toISOString(), datosRealesOrigen: 'ficha' } : { datosReales: false }); }
          try { window.dispatchEvent(new CustomEvent('atalaya:empresa', { detail: r })); } catch (x) { /* sin eventos */ } close(r); }
        catch (x) { f.querySelector('[data-msg]').textContent = x.message; }
      };
    });
  };
  /* ---------- Borrado seguro de una empresa ----------
     Dos pasos: un aviso de todo lo que se pierde y, si se confirma, la contraseña de la cuenta.
     No usa las ventanas del navegador (confirm), que algunos entornos bloquean sin avisar. */
  P.verificarPassword = async function (pw) {
    await P.ready;
    if (P.mode === 'server') { const r = await api('/me/verificar', { method: 'POST', body: JSON.stringify({ password: pw }) }); return !!(r && r.ok); }
    const u = L.find((L.session() || {}).id); return !!(u && u.hash === await hash(u.salt + pw));
  };
  P.borrarEmpresaSeguro = function (e) {
    return new Promise((resolve) => {
      const lista = P.empresas.lista(), hijas = lista.filter((x) => x.matriz === e.id);
      const grupo = !!(PLANES[(P.user || {}).plan] || {}).grupo;
      const back = document.createElement('div'); back.className = 'ef-back';
      const close = (v) => { back.remove(); removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (ev) => { if (ev.key === 'Escape') close(false); };
      addEventListener('keydown', onKey);
      const paso1 = () => {
        back.innerHTML = `<div class="ef-card del-card glass" role="alertdialog" aria-modal="true" aria-label="Borrar empresa">
          <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
          <div class="eyebrow" style="color:var(--stop)">Borrado definitivo</div>
          <h3 class="del-t">¿Seguro que quieres borrar «${escH(e.nombre)}»?</h3>
          <p>Si sigues adelante <b>perderás toda la información de esta ${grupo ? 'sociedad' : 'empresa'}</b> y no se podrá recuperar:</p>
          <ul class="small"><li>su ficha (forma jurídica, CIF, socios…);</li><li>sus datos del simulador de inversión: cifras, inversiones, escenarios e hipótesis;</li><li>su sistema estratégico: módulos, zona de origen, diagnósticos 360, objetivos, planes de acción y cortes de evolución;</li><li>su lugar en ${grupo ? 'la vista de grupo, los préstamos entre sociedades y los objetivos en cascada' : 'la cartera de clientes'}.</li></ul>
          ${hijas.length ? `<p class="small" style="color:var(--warn)">Es la sociedad dominante de ${hijas.map((h) => '«' + escH(h.nombre) + '»').join(', ')}: quedarán sin sociedad dominante hasta que les asignes otra.</p>` : ''}
          <p class="small muted">Piénsalo dos veces. Si solo quieres bajar de plan, recuerda que el plan Consultora o Grupos conserva todas tus empresas.</p>
          <div class="row"><button class="btn solid" data-no>No, conservarla</button><button class="btn del-btn" data-si>Sí, quiero borrarla</button></div>
        </div>`;
        back.querySelector('.ef-x').onclick = () => close(false);
        back.querySelector('[data-no]').onclick = () => close(false);
        back.querySelector('[data-si]').onclick = paso2;
        setTimeout(() => back.querySelector('[data-no]').focus(), 30);
      };
      const paso2 = () => {
        back.innerHTML = `<form class="ef-card del-card glass" role="alertdialog" aria-modal="true" aria-label="Confirmar con la contraseña">
          <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
          <div class="eyebrow" style="color:var(--stop)">Último paso</div>
          <h3 class="del-t">Confirma con tu contraseña</h3>
          <p class="small">Para borrar «${escH(e.nombre)}» y todos sus datos, escribe la contraseña con la que entras en Atalaya.</p>
          <input class="input" type="password" name="pw" autocomplete="current-password" placeholder="Contraseña" required>
          <p class="small" data-msg style="color:var(--stop);margin:0"></p>
          <div class="row"><button type="button" class="btn solid" data-no>Cancelar</button><button type="submit" class="btn del-btn">Borrar definitivamente</button></div>
        </form>`;
        const f = back.querySelector('form');
        back.querySelector('.ef-x').onclick = () => close(false);
        f.querySelector('[data-no]').onclick = () => close(false);
        setTimeout(() => f.pw.focus(), 30);
        f.onsubmit = async (ev) => {
          ev.preventDefault();
          const msg = f.querySelector('[data-msg]'); msg.textContent = '';
          try {
            if (!(await P.verificarPassword(f.pw.value))) { msg.textContent = 'La contraseña no es correcta. No se ha borrado nada.'; f.pw.select(); return; }
            await P.empresas.borrar(e.id);
            for (const h of hijas) { try { await P.empresas.editar(h.id, { matriz: '' }); } catch (x) { /* se corrige en la ficha */ } }
            close(true);
          } catch (x) { msg.textContent = x.message; }
        };
      };
      back.addEventListener('click', (ev) => { if (ev.target === back) close(false); });
      document.body.appendChild(back); paso1();
    });
  };

  P.mapaEmpresas = function (host, opts) {
    opts = opts || {};
    const u = P.user, plan = PLANES[(u && u.plan) || 'profesional'] || PLANES.profesional, grupo = !!plan.grupo, lim = P.limiteEmpresas(u);
    const lista = P.empresas.lista(), act = P.empresas.activa(), S = sectores();
    const anio = new Date().getFullYear();
    const card = (e) => {
      const i = lista.indexOf(e), pc = P.fichaCompleta(e);
      const soc = (e.socios || []).filter((s) => s.pct > 0);
      return `<div class="em-card ${e.id === act.id ? 'on' : ''}" data-id="${e.id}">
        <div class="em-top"><i style="background:${PAL[i % PAL.length]}"></i><b>${escH(e.nombre)}</b>${e.id === act.id ? '<span class="em-act">activa</span>' : ''}</div>
        <div class="em-meta">${[e.forma && e.forma.replace(/ \(.*\)/, ''), e.cif].filter(Boolean).map(escH).join(' · ') || '<span class="muted">Sin forma jurídica ni CIF</span>'}</div>
        <div class="em-meta">${e.constitucion ? `Constituida en ${e.constitucion} · ${anio - e.constitucion} años` : '<span class="muted">Año de constitución sin indicar</span>'}</div>
        <div class="em-meta">${[e.sector && S && S[e.sector] ? S[e.sector].nombre : e.sector, e.provincia, e.plantilla !== '' && e.plantilla != null ? e.plantilla + ' personas' : ''].filter(Boolean).map(escH).join(' · ') || '<span class="muted">Sector y plantilla sin indicar</span>'}</div>
        ${grupo && e.rol !== 'holding' ? `<div class="em-meta">Filial · ${e.participacion != null ? e.participacion : 100} % de ${escH((lista.find((x) => x.id === e.matriz) || {}).nombre || 'la holding')}</div>` : ''}
        ${soc.length ? `<div class="em-socios" title="${escH(soc.map((s) => `${s.nombre}: ${s.pct} %`).join(' · '))}">${soc.map((s, k) => `<span style="width:${s.pct}%;background:${PAL[(k + 2) % PAL.length]}"></span>`).join('')}</div><div class="em-meta small">${soc.slice(0, 3).map((s) => `${escH(s.nombre)} ${String(s.pct).replace('.', ',')} %`).join(' · ')}${soc.length > 3 ? ' …' : ''}</div>` : '<div class="em-meta muted">Socios sin indicar</div>'}
        <div class="em-prog" title="Ficha completa al ${pc} %"><span style="width:${pc}%"></span></div>
        <div class="em-btns"><button class="btn solid small" data-enter="${e.id}">${e.id === act.id ? 'Seguir con esta' : 'Entrar con esta'}</button><button class="btn ghost small" data-ficha="${e.id}">Ficha${pc < 100 ? ` · ${pc} %` : ''}</button>${e.id !== 'principal' ? `<button class="icon-btn" data-del="${e.id}" aria-label="Borrar ${escH(e.nombre)}" title="Borrar">×</button>` : ''}</div>
      </div>`;
    };
    const nueva = lista.length < lim ? `<button class="em-card em-new" data-new><b>+</b><span>${grupo ? 'Añadir una sociedad' : lim > 1 ? 'Dar de alta una empresa cliente' : ''}</span><small>${isFinite(lim) ? `${lista.length} de ${lim}` : `${lista.length} sociedades`}</small></button>` : (lim === 1 ? '' : `<div class="em-card em-new" style="cursor:default"><span class="small muted">Has llegado a las ${lim} empresas de tu plan.</span></div>`);
    let cuerpo;
    if (grupo) {
      const hold = lista.filter((e) => e.rol === 'holding');
      const sueltas = lista.filter((e) => e.rol !== 'holding' && !hold.some((h) => h.id === e.matriz));
      cuerpo = hold.map((h, i) => {
        const hijos = lista.filter((e) => e.rol !== 'holding' && (e.matriz === h.id || (i === 0 && sueltas.includes(e))));
        return `<div class="em-arbol"><div class="em-raiz">${card(h)}</div>${hijos.length ? `<div class="em-hijos">${hijos.map(card).join('')}</div>` : ''}</div>`;
      }).join('') + (hold.length ? '' : `<div class="em-grid">${lista.map(card).join('')}</div>`) + `<div class="em-grid">${nueva}</div>`;
    } else cuerpo = `<div class="em-grid">${lista.map(card).join('')}${nueva}</div>`;
    const titulo = grupo ? 'Mapa del grupo' : lim > 1 ? 'Tus empresas cliente' : 'Tu empresa';
    const lede = grupo ? 'Cada sociedad con su ficha: la holding arriba y sus filiales debajo, con el porcentaje que tiene. Elige con cuál quieres trabajar.' : lim > 1 ? 'Cada empresa cliente con su ficha y sus datos separados. Elige con cuál quieres trabajar o da de alta una nueva.' : 'Revisa la ficha de tu empresa: el nombre, la forma jurídica, el año de constitución y los socios aparecen en todo Atalaya y en los informes.';
    host.innerHTML = `<div class="em-head"><div><div class="eyebrow">${opts.paso ? 'Paso 1 · ' : ''}${titulo}</div><p class="small muted" style="margin:4px 0 0">${lede}</p></div>${opts.cerrar ? '<button class="btn ghost small" data-cerrar>Ir a los mundos →</button>' : ''}</div>${cuerpo}
      ${lim === 1 ? '<div class="row small" style="margin:0"><span class="muted">¿Trabajas con varias empresas?</span><button class="btn ghost small" data-planes="consultora">Pasar a Consultora (empresas cliente)</button><button class="btn ghost small" data-planes="grupos">Pasar a Grupos (holding y filiales)</button></div>' : ''}`;
    host.querySelectorAll('[data-planes]').forEach((b) => b.onclick = () => P.panelPlanes({ destacar: b.dataset.planes, motivo: 'Al cambiar, el mapa te dejará dar de alta más empresas al momento.' }));
    const redraw = () => P.mapaEmpresas(host, opts);
    host.querySelectorAll('[data-enter]').forEach((b) => b.onclick = () => { const id = b.dataset.enter; if (opts.onEnter) opts.onEnter(id); else P.empresas.cambiar(id); });
    host.querySelectorAll('[data-ficha]').forEach((b) => b.onclick = async () => { const r = await P.fichaEmpresa(lista.find((x) => x.id === b.dataset.ficha)); if (r) redraw(); });
    host.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { const e = lista.find((x) => x.id === b.dataset.del); if (!(await P.borrarEmpresaSeguro(e))) return; if (e.id === act.id) location.reload(); else redraw(); });
    const nb = host.querySelector('[data-new]'); if (nb) nb.onclick = async () => { const r = await P.fichaEmpresa(null, { nuevo: true }); if (r) redraw(); };
    const cb = host.querySelector('[data-cerrar]'); if (cb && opts.onCerrar) cb.onclick = opts.onCerrar;
  };

  P.mountAccount = function (el) {
    if (!el) return;
    const u = P.user; if (!u) { el.innerHTML = ''; return; }
    const acc = P.accessOf(u);
    const ini = (u.nombre || u.email).split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
    el.innerHTML = `<button class="acc-btn" aria-haspopup="true" aria-expanded="false" title="${u.email}"><span>${ini}</span></button>
      <div class="acc-menu glass" hidden>
        <div class="acc-head"><b>${(u.nombre || u.email).replace(/</g, '&lt;')}</b><small>${u.email}</small><small>Plan ${PLANES[u.plan] ? PLANES[u.plan].nombre : u.plan} · ${acc.motivo === 'prueba' ? `prueba: quedan ${acc.diasPrueba} días` : 'acceso activo'}</small>${P.mode === 'local' ? '<small class="demo">Modo demostración: datos solo en este navegador</small>' : ''}</div>
        <a href="portal.html">Inicio · elegir herramienta</a>${P.esGrupo(u) ? `<a href="grupo.html">${PLANES[u.plan] && PLANES[u.plan].grupo ? 'Vista de grupo' : 'Cartera de clientes'}</a>` : ''}<a href="app.html">Simulador de inversión</a><a href="estrategia.html">Sistema estratégico</a><a href="personas.html">Personas y equipos</a>${P.puede && P.puede('intervencion', u) ? '<a href="intervencion.html">Auditoría integral</a>' : ''}<a href="mesa.html">Mesa de trabajo</a><a href="libro.html">Libro corporativo</a><a href="manual.html">Manual de uso</a><a href="index.html">Página de Atalaya</a><button data-real title="Con datos reales ningún mundo usa los datos de ejemplo: lo que no se haya subido queda a cero y se pide">${P.modoReal() ? 'Datos reales: activados · ningún dato de ejemplo' : 'Datos de ejemplo permitidos · pasar a datos reales'}</button><button data-conex>Conexiones: IA, grabadora y calendario</button><button data-planes>Mi plan: ${PLANES[u.plan] ? PLANES[u.plan].nombre : u.plan} · cambiar</button><button data-pw>Cambiar contraseña</button><button data-logout>Cerrar sesión</button>
        <form data-pwform hidden class="stack" style="padding:8px 12px 12px"><input class="input" type="password" name="actual" placeholder="Contraseña actual" autocomplete="current-password" required><input class="input" type="password" name="nueva" placeholder="Nueva (mín. 8 caracteres)" autocomplete="new-password" minlength="8" required><button class="btn solid" type="submit">Guardar</button><small data-pwmsg></small></form>
      </div>`;
    // Selector de empresa o sociedad (planes con varias empresas, o si ya hay más de una)
    const lista = P.empresas.lista(), act = P.empresas.activa(), lim = P.limiteEmpresas(u);
    const plan = PLANES[u.plan] || PLANES.profesional, grupo = !!plan.grupo;
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    if (act && lim === 1 && lista.length <= 1) {
      const sel = document.createElement('div'); sel.className = 'emp';
      sel.innerHTML = `<button class="emp-btn" title="Ficha de la empresa"><i style="background:#c9f24d"></i><span>${esc(act.nombre === 'Mi empresa' ? 'Ficha de mi empresa' : act.nombre)}</span><b>✎</b></button>`;
      el.prepend(sel);
      sel.querySelector('.emp-btn').onclick = async (e) => { e.stopPropagation(); const r = await P.fichaEmpresa(act); if (r) P.mountAccount(el); };
    }
    if (act && (lim > 1 || lista.length > 1)) {
      const sel = document.createElement('div'); sel.className = 'emp';
      const pal = ['#c9f24d', '#3987e5', '#199e70', '#d55181', '#d95926', '#9b7bff'];
      sel.innerHTML = `<button class="emp-btn" aria-haspopup="true" title="Cambiar de ${grupo ? 'sociedad' : 'empresa'}"><i style="background:${pal[lista.indexOf(act) % pal.length]}"></i><span>${esc(act.nombre)}</span><b>▾</b></button>
        <div class="emp-menu glass" hidden>
          <div class="acc-head"><b>${grupo ? 'Sociedades del grupo' : 'Empresas cliente'}</b><small>${lista.length}${isFinite(lim) ? ' de ' + lim : ''}${grupo ? ' · plan a medida' : ''}</small></div>
          <div class="emp-list">${lista.map((e, i) => `<div class="emp-it ${e.id === act.id ? 'on' : ''}"><button data-emp="${e.id}"><i style="background:${pal[i % pal.length]}"></i><span><b>${esc(e.nombre)}</b><small>${e.rol === 'holding' ? 'Holding · sociedad dominante' : e.rol === 'filial' ? `Filial · ${e.participacion != null ? e.participacion : 100} %` : e.id === 'principal' ? 'Principal' : 'Cliente'}</small></span></button>${e.id !== 'principal' ? `<button class="icon-btn" data-empdel="${e.id}" title="Borrar" aria-label="Borrar ${esc(e.nombre)}">×</button>` : ''}<button class="icon-btn" data-empren="${e.id}" title="Ficha de la empresa" aria-label="Ficha de ${esc(e.nombre)}">✎</button></div>`).join('')}</div>
          <a class="emp-group" href="portal.html#empresas">Mapa de ${grupo ? 'sociedades' : 'empresas'} y fichas →</a>
          ${lista.length < lim ? `<form class="emp-new stack" data-empnew><input class="input" name="nombre" placeholder="Nombre de la ${grupo ? 'sociedad' : 'empresa'}" required>${grupo ? '<div class="row"><select class="input" name="rol"><option value="filial">Filial</option><option value="holding">Holding</option></select><input class="input" name="participacion" type="number" min="0" max="100" value="100" title="% de participación" style="width:90px"></div>' : ''}<button class="btn solid" type="submit">Añadir ${grupo ? 'sociedad' : 'empresa'}</button><small class="muted" data-empmsg></small></form>` : `<p class="small muted" style="padding:8px 12px">Has llegado al máximo de tu plan.</p>`}
          <a class="emp-group" href="grupo.html">${grupo ? 'Vista de grupo →' : 'Cartera de clientes →'}</a>
        </div>`;
      el.prepend(sel);
      const eb = sel.querySelector('.emp-btn'), em = sel.querySelector('.emp-menu');
      eb.onclick = (e) => { e.stopPropagation(); em.hidden = !em.hidden; };
      em.addEventListener('click', (e) => e.stopPropagation());
      document.addEventListener('click', () => { em.hidden = true; });
      sel.querySelectorAll('[data-emp]').forEach((x) => x.onclick = () => { if (x.dataset.emp !== act.id) P.empresas.cambiar(x.dataset.emp); });
      sel.querySelectorAll('[data-empren]').forEach((x) => x.onclick = async () => { em.hidden = true; const e = lista.find((y) => y.id === x.dataset.empren); const r = await P.fichaEmpresa(e); if (r) P.mountAccount(el); });
      sel.querySelectorAll('[data-empdel]').forEach((x) => x.onclick = async () => { const e = lista.find((y) => y.id === x.dataset.empdel); em.hidden = true; if (!(await P.borrarEmpresaSeguro(e))) return; if (e.id === act.id) location.reload(); else P.mountAccount(el); });
      const nf = sel.querySelector('[data-empnew]');
      if (nf) nf.onsubmit = async (e) => { e.preventDefault(); try { const ne = await P.empresas.crear({ nombre: nf.nombre.value, rol: nf.rol ? nf.rol.value : undefined, participacion: nf.participacion ? nf.participacion.value : undefined }); P.empresas.cambiar(ne.id); } catch (x) { nf.querySelector('[data-empmsg]').textContent = x.message; } };
    }
    const b = el.querySelector('.acc-btn'), m = el.querySelector('.acc-menu');
    b.onclick = (e) => { e.stopPropagation(); m.hidden = !m.hidden; b.setAttribute('aria-expanded', !m.hidden); };
    document.addEventListener('click', (e) => { if (!el.contains(e.target)) m.hidden = true; });
    el.querySelector('[data-logout]').onclick = P.logout;
    el.querySelector('[data-planes]').onclick = () => { m.hidden = true; P.panelPlanes(); };
    el.querySelector('[data-real]').onclick = async () => {
      m.hidden = true; const on = P.modoReal(), e = P.empresas.activa(), n = (e && e.nombre) || 'esta empresa';
      if (!on && !confirm(`¿Trabajar con datos reales en ${n}?\n\nNingún mundo usará datos de ejemplo: lo que no se haya subido se queda a cero y se piden sus datos. Los datos ya subidos se conservan.`)) return;
      if (on && !confirm(`¿Volver a permitir datos de ejemplo en ${n}?\n\nLos datos reales ya subidos se conservan; los mundos sin datos podrán mostrar el ejemplo.`)) return;
      if (on) await P.desactivarModoReal(); else await P.activarModoReal('cuenta');
      location.reload();
    };
    el.querySelector('[data-conex]').onclick = () => { m.hidden = true; const go = () => A.conexiones.abrir('claude'); if (A.conexiones) return go(); const sc = document.createElement('script'); sc.src = 'js/conexiones.js'; sc.onload = go; document.head.appendChild(sc); };
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
      stars.forEach((s) => { g.fillStyle = `rgba(245,243,238,${s.a})`; g.beginPath(); g.arc(s.x * W, ((s.y * H * 1.6 - sy * 0.5) % H + H) % H, s.r, 0, 6.283); g.fill(); });
      for (let k = 0; k < 16; k++) {
        const base = H * 0.25 + k * (H * 0.06) - (sy % (H * 0.06));
        g.beginPath();
        for (let x = 0; x <= W; x += 14) {
          const y = base + Math.sin(x * 0.0042 + k * 0.6 + t * 0.00012) * 26 + Math.sin(x * 0.011 - k * 0.35 + t * 0.00008) * 9 + Math.cos((x + sy * 2) * 0.0019 + k) * 30;
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.strokeStyle = `rgba(160,168,180,${0.03 + (k % 4 === 0 ? 0.035 : 0)})`;
        g.lineWidth = k % 4 === 0 ? 1.1 : 0.7;
        g.stroke();
      }
    };
    size(); addEventListener('resize', size);
    if (reduce) { draw(0); addEventListener('scroll', () => draw(0), { passive: true }); }
    else { const loop = (t) => { draw(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  };
})();
