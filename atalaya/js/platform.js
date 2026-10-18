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
    // Si el navegador se queda sin sitio no se calla: se avisa en la banda de guardado (lo demás, sin almacenamiento, se ignora)
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { if (lleno(e)) sinSitio(); return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
  };
  const lleno = (e) => !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
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
  /* Versión de la aplicación (va en las copias de datos) */
  P.VERSION = '2.1.0';
  /* Pago al terminar la prueba. Vacío: se ofrece «Le enviaremos el enlace de pago» con el formulario de solicitud.
     PAGO_URLS admite un enlace por plan ('profesional') o por plan y periodo ('profesional-anual'); manda el más concreto. */
  P.PAGO_URL = '';
  P.PAGO_URLS = { esencial: '', profesional: '', consultora: '' };
  P.pagoUrl = (plan, periodo) => P.PAGO_URLS[plan + '-' + (periodo || 'mensual')] || P.PAGO_URLS[plan] || P.PAGO_URL || '';
  /* Contacto directo (pantalla de pago y avisos). El correo, vacío hasta que se configure */
  P.CONTACTO = { telefono: '+34 678 447 296', email: '', web: 'https://businessavance.es', respuesta: 'en 24 horas laborables' };
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
    if (!r.ok) throw Object.assign(new Error((body && body.error) || 'Error del servidor (' + r.status + ')'), { status: r.status, body });
    // Cada respuesta buena es una ocasión para reenviar lo que quedó pendiente
    if (hayPend && !reenviando) setTimeout(reenviar, 0);
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
    // La prueba dura PRUEBA_DIAS desde el alta, o hasta «pruebaHasta» si la administración la ha ampliado (como en el servidor)
    const finPrueba = Math.max(new Date(u.alta).getTime() + PRUEBA_DIAS * 864e5, Date.parse(u.pruebaHasta) || 0);
    if (!u.pagado && finPrueba > now) return { ok: true, motivo: 'prueba', diasPrueba: Math.ceil((finPrueba - now) / 864e5), finPrueba };
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
    if (!d.email || !d.password || d.password.length < 8) throw new Error('Escriba un correo y una contraseña de al menos 8 caracteres.');
    if (P.mode === 'server') { const r = await api('/register', { method: 'POST', body: JSON.stringify(d) }); P.user = r.user; return r.user; }
    const users = L.users();
    const email = d.email.trim().toLowerCase();
    if (users.some((u) => u.email === email)) throw new Error('Ya hay una cuenta con ese correo. Entre con su contraseña.');
    const salt = uid();
    const u = { id: uid(), nombre: (d.nombre || '').trim(), email, empresa: (d.empresa || '').trim(), telefono: (d.telefono || '').trim(), plan: PLANES[d.plan] ? d.plan : 'profesional', periodo: d.periodo === 'anual' ? 'anual' : 'mensual',
      rol: 'cliente', estado: 'prueba', pagado: false, venceAcceso: null, alta: new Date().toISOString(), ultimoAcceso: new Date().toISOString(),
      sesiones: 1, uso: {}, salt, hash: await hash(salt + d.password) };
    users.push(u); L.save(users); LS.set('atalaya.session', { id: u.id });
    P.user = publicUser(u);
    return P.user;
  };
  /* codigo: el de la aplicación de autenticación (o uno de recuperación) si la cuenta tiene el segundo factor.
     Si falta o no vale, el error lleva segundoFactor: true para que la pantalla de acceso lo pida. */
  P.login = async function (email, password, codigo) {
    await P.ready;
    if (P.mode === 'server') {
      try { const r = await api('/login', { method: 'POST', body: JSON.stringify(Object.assign({ email, password }, codigo ? { codigo } : {})) }); P.user = r.user; return r.user; }
      catch (e) { if (e.body && e.body.segundoFactor) e.segundoFactor = true; throw e; }
    }
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
    if (!u) throw new Error('El enlace no es válido o ha caducado. Pida uno nuevo.');
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
    if (P.mode === 'server' && pendientes().length) { hayPend = true; programar(); setTimeout(reenviar, 0); }
    await P.empresas.cargar();
    prepararMapa();
    P.esperarPago();
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
  /* ---------- Empresa modelo ----------
     Valdenorte (js/modelo/datos.js): una empresa ficticia completa que vive solo en este navegador. No se guarda en el
     servidor ni cuenta para el límite del plan. Sus datos se crean de la fuente común la primera vez que un mundo los pide y
     se pueden tocar y restablecer. Desde su ficha se conecta o desconecta cada mundo y se elige con qué plan se enseña. */
  const MID = 'modelo';
  const MBASE = { simulador: 'atalaya.v1', estrategia: 'atalaya.estrategia.v1', personas: 'atalaya.personas.v1', consultor: 'atalaya.consultor.v1', agenda: 'atalaya.agenda.v1', nota: 'atalaya.nota.v1', libro: 'atalaya.libro.v1', intervencion: 'atalaya.intervencion.v1' };
  const MUNDO_DE = { simulador: 'simulador', estrategia: 'estrategia', consultor: 'estrategia', personas: 'personas', agenda: 'agenda', libro: 'libro', intervencion: 'intervencion' };
  const MK = (k) => `atalaya.modelo.${(P.user && P.user.id) || 'anon'}.${k}`;
  const M_FICHA = { id: MID, modelo: true, nombre: 'Valdenorte Estructuras y Montajes, S.L.', rol: 'holding', participacion: 100, datosReales: true, datosRealesDesde: '2021-01-01', datosRealesTs: '2021-01-01T00:00:00.000Z', datosRealesOrigen: 'modelo' };
  P.modelo = {
    ID: MID,
    MUNDOS: [
      { k: 'simulador', n: 'Simulador de inversión', f: null, href: 'app.html' }, { k: 'estrategia', n: 'Sistema estratégico', f: 'estrategia', href: 'estrategia.html' },
      { k: 'personas', n: 'Personas y equipos', f: 'personas', href: 'personas.html' }, { k: 'intervencion', n: 'Auditoría integral', f: 'intervencion', href: 'intervencion.html' },
      { k: 'agenda', n: 'Mesa de trabajo', f: null, href: 'mesa.html' }, { k: 'libro', n: 'Libro corporativo', f: null, href: 'libro.html' }
    ],
    activa: () => P.empresaId() === MID,
    cfg() { const c = LS.get(MK('cfg')) || {}; c.con = Object.assign({ simulador: true, estrategia: true, personas: true, intervencion: true, agenda: true, libro: true }, c.con || {}); c.plan = c.plan || ''; c.ficha = c.ficha || {}; return c; },
    guardarCfg(c) { LS.set(MK('cfg'), c); P.modelo.limpiarEspejos(); },
    // Mundos que abre un plan (para conectar la empresa modelo «como» ese plan)
    mundosDe(plan) { const u = { plan }; return P.modelo.MUNDOS.filter((m) => !m.f || P.puede(m.f, u, true)).map((m) => m.k); },
    conectado(key) { const m = MUNDO_DE[key]; return !m || P.modelo.cfg().con[m] !== false; },
    leer(key) {
      if (!P.modelo.conectado(key)) return null;
      let v = LS.get(MK('d.' + key));
      if (v == null && A.modelo && A.modelo.generar) { v = A.modelo.generar(key); if (v != null) LS.set(MK('d.' + key), v); }
      return v == null ? null : v;
    },
    guardar(key, obj) {
      if (!P.modelo.conectado(key)) return;
      // Sin la fuente cargada no se guarda nada nuevo: así una página sin la empresa modelo no la sustituye por datos de ejemplo
      if (LS.get(MK('d.' + key)) == null && !(A.modelo && A.modelo.generar) && key !== 'nota') return;
      if (obj == null) LS.del(MK('d.' + key)); else LS.set(MK('d.' + key), obj);
    },
    limpiarEspejos(keys) { (keys || Object.keys(MBASE)).forEach((k) => LS.del(P.k(MBASE[k], MID))); },
    restablecer(keys) { (keys || Object.keys(MBASE)).forEach((k) => LS.del(MK('d.' + k))); P.modelo.limpiarEspejos(keys); },
    /* Vuelta del paseo virtual. Antes de empezar se apunta a qué empresa volver y cómo estaba configurada la empresa modelo
       (en la sesión de la pestaña y, por si se cierra la ventana, en el navegador con una marca de tiempo que el paseo
       renueva). Al terminar o abandonar el paseo, la siguiente página que se carga lo deja todo como estaba y lo dice. */
    vuelta: {
      apuntar() {
        if (ssGet(VSS)) return; // ya hay un paseo en marcha en esta pestaña: se conserva la vuelta original
        const c = P.modelo.cfg(), v = { emp: P.empresaId(), cfg: { plan: c.plan, con: Object.assign({}, c.con) }, ts: Date.now() };
        ssSet(VSS, v); LS.set(VK(), v);
      },
      // El paseo sigue vivo en esta pestaña: renueva la marca para que otra pestaña no lo deshaga
      vivo() { const v = ssGet(VSS) || LS.get(VK()); if (!v) return; v.ts = Date.now(); ssSet(VSS, v); LS.set(VK(), v); },
      pendiente: () => ssGet(VSS) || LS.get(VK()),
      // Restaura empresa activa y configuración. quedarse: se sigue con la empresa modelo, pero con la configuración de antes
      restaurar(quedarse) {
        const v = P.modelo.vuelta.pendiente(); try { sessionStorage.removeItem(VSS); } catch (e) { /* sin almacenamiento */ } LS.del(VK());
        if (!v) return null;
        const c = P.modelo.cfg(); c.plan = (v.cfg && v.cfg.plan) || ''; if (v.cfg && v.cfg.con) c.con = Object.assign(c.con, v.cfg.con); P.modelo.guardarCfg(c);
        const l = REG ? REG.lista : [], id = quedarse ? MID : (l.some((e) => e.id === v.emp) ? v.emp : 'principal');
        LS.set(ACT, id);
        const e = l.find((x) => x.id === id);
        // El aviso se enseña al cargar la página siguiente (la vuelta suele terminar en una recarga)
        ssSet('atalaya.aviso', id === MID ? (quedarse ? 'Sigue con la empresa modelo, con los mundos y el plan que tenía antes del paseo.' : 'Ha vuelto a la empresa modelo, con los mundos y el plan que tenía antes del paseo.') : `Ha vuelto a su empresa: ${(e && e.nombre) || 'Mi empresa'}`);
        return id;
      }
    }
  };
  const VSS = 'atalaya.paseo.volver', VK = () => `atalaya.paseo.volver.${(P.user && P.user.id) || 'anon'}`;
  const ssGet = (k) => { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  // ¿Hay que deshacer un paseo? Si no está activo en esta pestaña y, o bien lo empezó esta pestaña, o nadie lo renueva desde hace 90 s
  const vueltaPendiente = () => { const v = P.modelo.vuelta.pendiente(); if (!v || ssGet('atalaya.paseo')) return false; return !!ssGet(VSS) || Date.now() - (v.ts || 0) > 90e3; };
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
      // La empresa modelo siempre está en la lista (al final), con lo que se haya tocado de su ficha
      REG.lista = REG.lista.filter((e) => e && !e.modelo);
      REG.lista.push(Object.assign({}, (A.modelo && A.modelo.EMPRESA) || M_FICHA, P.modelo.cfg().ficha, { id: MID, modelo: true, datosReales: true, datosRealesTs: M_FICHA.datosRealesTs }));
      // Un paseo virtual terminado o abandonado: se vuelve a la empresa y a la configuración de antes
      if (vueltaPendiente()) P.modelo.vuelta.restaurar();
      // Si el navegador recuerda una empresa que no es de esta cuenta, se vuelve a la principal
      if (!REG.lista.some((e) => e.id === P.empresaId())) { LS.set(ACT, 'principal'); location.reload(); return REG; }
      const av = ssGet('atalaya.aviso'); if (av) { try { sessionStorage.removeItem('atalaya.aviso'); } catch (x) { /* sin almacenamiento */ } P.toast(av, 6000); }
      return REG;
    },
    lista: () => (REG ? REG.lista : []),
    // Las empresas de verdad (sin la empresa modelo): cuentan para el límite del plan
    reales: () => (REG ? REG.lista.filter((e) => !e.modelo) : []),
    activa: () => (REG ? REG.lista.find((e) => e.id === P.empresaId()) || REG.lista[0] : null),
    // En el servidor el alta de empresas se comprueba: si el plan no lo permite, el error llega aquí
    async guardar() { await P.ready; const out = Object.assign({}, REG, { lista: REG.lista.filter((e) => !e.modelo) }); if (P.mode === 'server') { await api('/data/empresas', { method: 'PUT', body: JSON.stringify(out) }); return; } await P.saveData('empresas', out); },
    async crear(d) {
      await P.empresas.cargar();
      const lim = P.limiteEmpresas();
      if (P.empresas.reales().length >= lim) throw new Error(lim === 1 ? 'Tu plan incluye una empresa. Para trabajar con varias, pasa a Consultora (empresas cliente) o a Grupos (sociedades de un grupo).' : `Tu plan incluye hasta ${lim} empresas.`);
      const e = Object.assign({}, d, { id: 'e' + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 4), nombre: (d.nombre || '').trim() || 'Nueva empresa', rol: d.rol || (P.user && PLANES[P.user.plan] && PLANES[P.user.plan].grupo ? 'filial' : 'cliente'), participacion: d.participacion != null && d.participacion !== '' ? +d.participacion : 100, alta: new Date().toISOString() });
      REG.lista.push(e);
      try { await P.empresas.guardar(); } catch (x) { REG.lista = REG.lista.filter((y) => y.id !== e.id); throw x; }
      return e;
    },
    async editar(id, cambios) {
      await P.empresas.cargar(); const e = REG.lista.find((x) => x.id === id); if (!e) return;
      if (e.modelo) { const c = Object.assign({}, cambios); ['datosReales', 'datosRealesDesde', 'datosRealesTs', 'datosRealesOrigen', 'id', 'modelo'].forEach((k) => delete c[k]); Object.assign(e, c); const cf = P.modelo.cfg(); cf.ficha = Object.assign(cf.ficha, c); LS.set(MK('cfg'), cf); return e; }
      Object.assign(e, cambios); await P.empresas.guardar(); return e;
    },
    async borrar(id) {
      await P.empresas.cargar();
      if (id === 'principal') throw new Error('La empresa principal no se puede borrar.');
      if (id === MID) throw new Error('La empresa modelo no se borra: desde su ficha se desconecta de los mundos o se restablece.');
      REG.lista = REG.lista.filter((x) => x.id !== id); await P.empresas.guardar();
      for (const k of SCOPED) { await P.saveData(k + '--' + id, null); LS.del(P.k({ simulador: 'atalaya.v1', estrategia: 'atalaya.estrategia.v1', personas: 'atalaya.personas.v1', consultor: 'atalaya.consultor.v1', agenda: 'atalaya.agenda.v1', nota: 'atalaya.nota.v1', libro: 'atalaya.libro.v1', intervencion: 'atalaya.intervencion.v1' }[k], id)); }
      if (P.empresaId() === id) LS.set(ACT, 'principal');
    },
    cambiar(id) { LS.set(ACT, id); location.reload(); }
  };
  /* Datos de otra empresa de la cuenta (vista de grupo) */
  P.loadDataOf = async function (key, id) {
    await P.ready;
    if ((id || P.empresaId()) === MID && SCOPED.includes(key)) return P.modelo.leer(key);
    const k = dk(key, id);
    if (P.mode === 'server') { const pd = leerPend(k); if (pd) return pd.v; try { const r = await api('/data/' + encodeURIComponent(k)); return r && r.data; } catch (e) { return null; } }
    const s = L.session(); return s ? LS.get(`atalaya.data.${s.id}.${k}`) : null;
  };

  /* Escribir un dato de otra empresa de la cuenta (vista de grupo) sin cambiar la empresa activa: «key» para la principal,
     «key--id» para las demás. Mismo trato que saveData: en el servidor, si falla, queda pendiente y se reenvía. */
  P.saveDataOf = async function (key, id, obj) {
    await P.ready;
    id = id || P.empresaId();
    if (id === MID && SCOPED.includes(key)) { P.modelo.guardar(key, obj); return; }
    const k = dk(key, id);
    if (P.mode === 'server') {
      try { await api('/data/' + encodeURIComponent(k), { method: 'PUT', body: JSON.stringify(obj) }); quitarPend(k); }
      catch (e) { ponerPend(k, obj, e); }
      return;
    }
    const s = L.session(); if (s) LS.set(`atalaya.data.${s.id}.${k}`, obj);
  };
  P.saveData = async function (key, obj) {
    await P.ready;
    if (P.empresaId() === MID && SCOPED.includes(key)) { P.modelo.guardar(key, obj); return; }
    key = dk(key);
    if (P.mode === 'server') {
      // Si el servidor no lo recibe, se queda una copia en este navegador marcada como pendiente y se reenvía después
      try { await api('/data/' + encodeURIComponent(key), { method: 'PUT', body: JSON.stringify(obj) }); quitarPend(key); }
      catch (e) { ponerPend(key, obj, e); }
      return;
    }
    const s = L.session(); if (s) LS.set(`atalaya.data.${s.id}.${key}`, obj);
  };
  P.loadData = async function (key) {
    await P.ready;
    if (P.empresaId() === MID && SCOPED.includes(key)) return P.modelo.leer(key);
    key = dk(key);
    if (P.mode === 'server') {
      // Una copia pendiente es más nueva que lo que tiene el servidor (no llegó a guardarse): manda la copia
      const pd = leerPend(key); if (pd) { setTimeout(reenviar, 0); return pd.v; }
      try { const r = await api('/data/' + encodeURIComponent(key)); return r && r.data; } catch (e) { return null; }
    }
    const s = L.session(); return s ? LS.get(`atalaya.data.${s.id}.${key}`) : null;
  };

  /* ---------- Guardado pendiente (modo servidor) ----------
     Cada dato que el servidor no acepta (sin conexión, sesión caducada, prueba terminada, plan, tamaño, cupo) se guarda en
     este navegador con la clave atalaya.pend.<usuario>.<dato> (el dato ya lleva la empresa). Se reenvía con la siguiente
     respuesta buena del servidor, cada 60 s y al recuperar la conexión. Una sola banda avisa y se va actualizando. */
  const PK = (key) => `atalaya.pend.${(P.user && P.user.id) || 'anon'}.${key}`;
  let hayPend = false, reenviando = false, tReint = null, ultimoMotivo = '';
  const pendientes = () => { const pre = PK(''), out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(pre) === 0) out.push(k.slice(pre.length)); } } catch (e) { /* sin almacenamiento */ } return out; };
  const leerPend = (key) => { try { return JSON.parse(localStorage.getItem(PK(key))); } catch (e) { return null; } };
  const quitarPend = (key) => { try { localStorage.removeItem(PK(key)); } catch (e) { /* sin almacenamiento */ } };
  const motivoDe = (e) => {
    const st = e && e.status;
    if (!st) return 'no hay conexión con el servidor';
    if (st === 401) return 'su sesión ha caducado; vuelva a entrar con su correo y su contraseña';
    if (st === 402) return 'su periodo de prueba ha terminado o su acceso necesita activarse';
    if (st === 403) return 'su plan no permite guardar estos datos' + (e.message ? ` (${e.message.replace(/\.$/, '')})` : '');
    if (st === 409) return 'la sesión abierta en este navegador es de otra cuenta';
    if (st === 413) return 'los datos son demasiado grandes para guardarlos de una vez';
    if (st === 429) return 'se ha alcanzado el límite de guardados por ahora';
    return `el servidor ha respondido con un error (${st})`;
  };
  function ponerPend(key, obj, e) {
    let ok = true;
    try { localStorage.setItem(PK(key), JSON.stringify({ v: obj, ts: Date.now(), st: (e && e.status) || 0 })); } catch (x) { ok = false; }
    hayPend = true; programar();
    avisoFallo(e, ok);
  }
  function programar() {
    if (!tReint) tReint = setInterval(() => { if (pendientes().length) reenviar(); else { clearInterval(tReint); tReint = null; } }, 60000);
  }
  addEventListener('online', () => { if (hayPend) reenviar(); });
  function avisoFallo(e, copia) {
    const mot = motivoDe(e);
    banda(`<b>No se ha podido guardar en el servidor:</b> ${escH(mot)}. ${copia === false ? 'Tampoco queda sitio en este navegador para conservar la copia: no cierre esta página y libere espacio antes de seguir.' : 'Sus cambios se conservan en este navegador y se reenviarán.'}`,
      { tipo: e && e.status === 401 ? 'stop' : 'warn', clave: 'srv:' + mot, reintentar: true, entrar: !!(e && (e.status === 401 || e.status === 409)) });
    ultimoMotivo = mot;
  }
  /* Reenvía lo pendiente. Antes comprueba que la sesión sigue siendo de este usuario: así nunca se guarda en otra cuenta. */
  async function reenviar() {
    if (reenviando || P.mode !== 'server' || !P.user) return;
    const ks = pendientes(); hayPend = ks.length > 0; if (!ks.length) return;
    reenviando = true;
    try {
      const me = await api('/me');
      if (!me || !me.user || me.user.id !== P.user.id) throw Object.assign(new Error('Otra cuenta'), { status: 409 });
      for (const k of ks) {
        const pd = leerPend(k); if (!pd) continue;
        await api('/data/' + encodeURIComponent(k), { method: 'PUT', body: JSON.stringify(pd.v) });
        // Solo se quita si no ha llegado otra versión mientras se enviaba
        const ya = leerPend(k); if (ya && ya.ts === pd.ts) quitarPend(k);
      }
      hayPend = pendientes().length > 0;
      if (!hayPend) { ultimoMotivo = ''; banda('Sus cambios pendientes ya están guardados en el servidor.', { tipo: 'ok', clave: 'ok', dura: 5000 }); }
    } catch (e) { avisoFallo(e, true); }
    finally { reenviando = false; }
  }
  P.pendientes = () => pendientes().length;
  P.reenviar = reenviar;
  /* Sin sitio en el navegador (modo local o copias de la empresa modelo) */
  function sinSitio() {
    banda('<b>No se ha podido guardar en este navegador:</b> el almacenamiento está lleno. Los últimos cambios no se han guardado; libere espacio (por ejemplo, borrando empresas o archivos que ya no use) y vuelva a intentarlo.', { tipo: 'stop', clave: 'lleno' });
  }
  /* Banda de aviso: una sola, que se actualiza. Si la persona la cierra, no vuelve a salir hasta que cambie el motivo. */
  let bandaOculta = '';
  function banda(html, o) {
    o = o || {};
    const pon = () => {
      let b = document.getElementById('atGuardado');
      if (!html) { if (b) b.remove(); return; }
      if (o.clave && bandaOculta === o.clave) return;
      if (!b) { b = document.createElement('div'); b.id = 'atGuardado'; b.className = 'at-aviso'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite'); document.body.appendChild(b); }
      b.dataset.tipo = o.tipo || 'warn'; b.dataset.clave = o.clave || '';
      b.innerHTML = `<span class="at-aviso-t">${html}</span>${o.entrar ? '<a class="btn ghost small" href="acceso.html" target="_blank" rel="noopener">Entrar de nuevo</a>' : ''}${o.reintentar ? '<button type="button" class="btn ghost small" data-reint>Reintentar ahora</button>' : ''}<button type="button" class="icon-btn at-aviso-x" aria-label="Ocultar el aviso">×</button>`;
      const rb = b.querySelector('[data-reint]'); if (rb) rb.onclick = () => { rb.disabled = true; rb.textContent = 'Reintentando…'; reenviar().then(() => { if (rb.isConnected) { rb.disabled = false; rb.textContent = 'Reintentar ahora'; } }); };
      b.querySelector('.at-aviso-x').onclick = () => { bandaOculta = o.clave || ''; b.remove(); };
      if (o.dura) setTimeout(() => { if (b.isConnected && b.dataset.clave === (o.clave || '')) b.remove(); }, o.dura);
    };
    if (o.clave !== bandaOculta) bandaOculta = '';
    if (document.body) pon(); else document.addEventListener('DOMContentLoaded', pon, { once: true });
  }
  P.banda = banda;
  /* Aviso breve abajo (se va solo) */
  P.toast = function (msg, ms) {
    const pon = () => {
      let t = document.getElementById('atToast');
      if (!t) { t = document.createElement('div'); t.id = 'atToast'; t.className = 'toast at-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
      t.textContent = msg; clearTimeout(t._t); t._t = setTimeout(() => t.remove(), ms || 5000);
    };
    if (document.body) pon(); else document.addEventListener('DOMContentLoaded', pon, { once: true });
  };

  /* ---------- Copia de los datos de la cuenta: descargar e importar ----------
     Una copia es un JSON con todo lo que la cuenta guarda: el registro de empresas («empresas»), la vista de grupo
     («grupo») y, de cada empresa real, sus datos por mundo (SCOPED; las que no son la principal llevan «--id»).
     La empresa modelo no va en la copia: es ficticia y vive solo en este navegador.
     Importar nunca sustituye nada sin avisar: se enseña un resumen y, si la cuenta ya tiene datos, solo se ofrece
     «Reemplazar todo» con una confirmación expresa. */
  const COPIA = 'atalaya-copia';
  const RE_CLAVE = /^(?:(empresas|grupo)|(simulador|estrategia|personas|consultor|agenda|nota|libro|intervencion)(?:--([a-z0-9_-]{1,40}))?)$/i;
  // Datos que el servidor solo guarda en algunos planes (como CLAVES en server/server.mjs)
  const FUNCION_DE = { estrategia: 'estrategia', personas: 'personas', intervencion: 'intervencion', consultor: 'consultor', grupo: 'varias' };
  const NOMBRE_DATO = { empresas: 'registro de empresas', grupo: 'vista de grupo', simulador: 'simulador de inversión', estrategia: 'sistema estratégico', personas: 'personas y equipos', consultor: 'cuaderno del consultor', agenda: 'mesa de trabajo', nota: 'nota de la empresa', libro: 'libro corporativo', intervencion: 'auditoría integral' };
  async function leerCrudo(k) {
    if (P.mode === 'server') { const pd = leerPend(k); if (pd) return pd.v; const r = await api('/data/' + encodeURIComponent(k)); return r ? r.data : null; }
    const s = L.session(); return s ? LS.get(`atalaya.data.${s.id}.${k}`) : null;
  }
  async function escribirCrudo(k, v) {
    if (P.mode === 'server') { await api('/data/' + encodeURIComponent(k), { method: 'PUT', body: JSON.stringify(v) }); quitarPend(k); return; }
    const s = L.session(); if (!s) throw new Error('Inicie sesión.');
    if (v == null) { LS.del(`atalaya.data.${s.id}.${k}`); return; }
    if (!LS.set(`atalaya.data.${s.id}.${k}`, v)) throw new Error('No queda sitio en este navegador.');
  }
  const idsDe = (emp) => { const l = emp && Array.isArray(emp.lista) ? emp.lista.filter((e) => e && e.id && !e.modelo) : []; return l.length ? l.map((e) => e.id) : ['principal']; };
  const clavesDe = (ids) => ['empresas', 'grupo'].concat(...ids.map((id) => SCOPED.map((k) => (id === 'principal' ? k : k + '--' + id))));
  /* Lee todo lo de la cuenta (sin pasar por la empresa activa ni por la empresa modelo) */
  P.leerCuenta = async function () {
    await P.ready;
    const emp = await leerCrudo('empresas'), datos = {};
    for (const k of clavesDe(idsDe(emp))) { const v = k === 'empresas' ? emp : await leerCrudo(k); if (v != null) datos[k] = v; }
    return { empresas: emp, datos };
  };
  P.exportarDatos = async function () {
    await P.ready;
    const u = P.user || {}, { empresas: emp, datos } = await P.leerCuenta();
    const lista = emp && Array.isArray(emp.lista) ? emp.lista.filter((e) => e && !e.modelo) : [{ id: 'principal', nombre: u.empresa || 'Mi empresa' }];
    // Sin registro guardado todavía: la copia lleva el de siempre (solo la principal) para poder importarse
    if (!datos.empresas) datos.empresas = { lista: lista.map((e) => Object.assign({ rol: 'holding', participacion: 100 }, e)) };
    const copia = { formato: COPIA, version: 1, app: 'Atalaya 360°', appVersion: P.VERSION, fecha: new Date().toISOString(), modo: P.mode,
      cuenta: { email: u.email || '', nombre: u.nombre || '', plan: u.plan || '', periodo: u.periodo || '' },
      empresas: lista.map((e) => ({ id: e.id, nombre: e.nombre || '' })), claves: Object.keys(datos), datos };
    const blob = new Blob([JSON.stringify(copia, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = `atalaya-copia-${(u.email || 'cuenta').split('@')[0].replace(/[^\w.-]+/g, '_')}-${today()}.json`; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
    return { claves: copia.claves.length, empresas: copia.empresas.length, bytes: blob.size };
  };
  // Mensaje claro si la copia no se puede leer (por ejemplo, el servidor no deja leer con la prueba terminada)
  P.motivoCopia = (e) => (e && e.status === 402 ? 'Con el acceso sin activar el servidor no permite leer sus datos desde aquí. Escríbanos o llámenos y le enviaremos una copia completa ' + P.CONTACTO.respuesta + '.' : e && e.status === 401 ? 'Su sesión ha caducado: vuelva a entrar para descargar sus datos.' : 'No se han podido leer sus datos' + (e && e.message ? ` (${e.message.replace(/\.$/, '')})` : '') + '.');
  P.descargarDatos = async function (msgEl) {
    const di = (t, c) => { if (msgEl) { msgEl.textContent = t; msgEl.style.color = c || ''; } else P.toast(t, 7000); };
    di('Preparando la copia…');
    try { const r = await P.exportarDatos(); di(`Copia descargada: ${r.empresas} ${r.empresas === 1 ? 'empresa' : 'empresas'} y ${r.claves} ${r.claves === 1 ? 'dato' : 'datos'} (${Math.max(1, Math.round(r.bytes / 1024))} KB). Guárdela en un lugar seguro.`, 'var(--go)'); return r; }
    catch (e) { di(P.motivoCopia(e), 'var(--stop)'); return null; }
  };
  /* Comprueba una copia leída de un archivo. Devuelve { ok, errores, avisos, resumen, escribir } */
  P.validarCopia = function (c) {
    const errores = [], avisos = [];
    if (!c || typeof c !== 'object' || c.formato !== COPIA || !c.datos || typeof c.datos !== 'object' || Array.isArray(c.datos)) return { ok: false, errores: ['El archivo no es una copia de datos de Atalaya.'] };
    const emp = c.datos.empresas;
    if (!emp || !Array.isArray(emp.lista) || !emp.lista.some((e) => e && e.id === 'principal')) errores.push('La copia no tiene un registro de empresas válido (falta la empresa principal).');
    const ids = idsDe(emp), escribir = {}, otras = [];
    Object.keys(c.datos).forEach((k) => {
      const m = RE_CLAVE.exec(k);
      if (!m) { otras.push(k); return; }
      if (m[3] && !ids.includes(m[3])) { avisos.push(`Se ignora un dato de una empresa que no está en el registro (${k}).`); return; }
      const base = m[1] || m[2], f = FUNCION_DE[base];
      if (P.mode === 'server' && f && c.datos[k] != null && !P.puede(f, P.user, true)) { avisos.push(`No se importa ${NOMBRE_DATO[base]}${m[3] ? ' de una empresa' : ''}: no está incluido en su plan actual.`); return; }
      escribir[k] = c.datos[k];
    });
    if (otras.length) avisos.push(`Se ignoran ${otras.length} datos que esta versión no reconoce.`);
    const reales = emp && Array.isArray(emp.lista) ? emp.lista.filter((e) => e && !e.modelo) : [], lim = P.limiteEmpresas();
    if (reales.length > lim) errores.push(`La copia tiene ${reales.length} empresas y su plan admite ${lim}. Cambie antes de plan (menú de la cuenta · Mi plan) y vuelva a importarla.`);
    if (emp && Array.isArray(emp.lista)) escribir.empresas = Object.assign({}, emp, { lista: reales });
    const resumen = { fecha: c.fecha || '', email: (c.cuenta && c.cuenta.email) || '', plan: (c.cuenta && c.cuenta.plan) || '', version: c.appVersion || '', empresas: reales.map((e) => e.nombre || e.id), claves: Object.keys(escribir).length };
    return { ok: !errores.length, errores, avisos, resumen, escribir };
  };
  /* Escribe una copia validada sustituyendo todo lo de la cuenta. Primero el registro de empresas (el servidor comprueba
     que cada empresa exista), luego cada dato y, al final, se borra lo que la cuenta tenía y la copia no trae. */
  P.reemplazarCuenta = async function (escribir) {
    await P.ready;
    const antes = await P.leerCuenta(), fallos = [];
    const idsAntes = idsDe(antes.empresas), idsNuevos = idsDe(escribir.empresas);
    if (escribir.empresas && !escribir.empresas.inicio) escribir.empresas.inicio = { eleccion: 'importada', fecha: new Date().toISOString() };
    const orden = ['empresas'].concat(Object.keys(escribir).filter((k) => k !== 'empresas'));
    for (const k of orden) { try { await escribirCrudo(k, escribir[k]); } catch (e) { fallos.push({ k, msg: e.message }); if (k === 'empresas') return { ok: false, fallos }; } }
    for (const k of Object.keys(antes.datos)) if (!(k in escribir)) { try { await escribirCrudo(k, null); } catch (e) { fallos.push({ k, msg: e.message }); } }
    // Copias locales de cada mundo (espejos del navegador) y pendientes: fuera, para que manden los datos importados
    idsAntes.concat(idsNuevos).forEach((id) => SCOPED.forEach((k) => { LS.del(P.k(MBASE[k], id)); quitarPend(id === 'principal' ? k : k + '--' + id); }));
    quitarPend('empresas'); quitarPend('grupo');
    LS.set(ACT, 'principal'); REG = null;
    return { ok: !fallos.length, fallos };
  };
  P.importarDatos = function () {
    const back = document.createElement('div'); back.className = 'ef-back';
    const close = () => { back.remove(); removeEventListener('keydown', onKey); };
    const onKey = (ev) => { if (ev.key === 'Escape') close(); };
    addEventListener('keydown', onKey);
    back.addEventListener('click', (ev) => { if (ev.target === back) close(); });
    const fecha = (s) => { const d = new Date(s); return isNaN(d) ? 'sin fecha' : d.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }); };
    const paso1 = () => {
      back.innerHTML = `<div class="ef-card glass cp-card" role="dialog" aria-modal="true" aria-label="Importar una copia de datos">
        <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
        <div class="eyebrow">Importar una copia</div>
        <h3 class="cp-t">Elija el archivo de copia</h3>
        <p class="small muted" style="margin:0">Es el archivo .json que se obtiene con «Descargar todos mis datos». Antes de escribir nada verá un resumen de lo que contiene.</p>
        <label class="cp-file"><span>Archivo de copia</span><input type="file" accept=".json,application/json" data-file></label>
        <p class="small" data-msg role="alert" style="margin:0;color:var(--stop)"></p>
        <div class="row"><button type="button" class="btn ghost" data-cancel>Cancelar</button></div>
      </div>`;
      back.querySelector('.ef-x').onclick = close; back.querySelector('[data-cancel]').onclick = close;
      const inp = back.querySelector('[data-file]'), msg = back.querySelector('[data-msg]');
      inp.onchange = () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        if (f.size > 60 * 1048576) { msg.textContent = 'El archivo es demasiado grande para ser una copia de Atalaya.'; return; }
        const rd = new FileReader();
        rd.onload = async () => {
          let c = null; try { c = JSON.parse(rd.result); } catch (e) { msg.textContent = 'El archivo no se puede leer: no es un JSON válido.'; return; }
          const v = P.validarCopia(c); if (!v.ok) { msg.textContent = v.errores.join(' '); return; }
          msg.textContent = 'Comprobando los datos actuales de su cuenta…'; msg.style.color = '';
          let actual = null; try { actual = await P.leerCuenta(); } catch (e) { msg.style.color = 'var(--stop)'; msg.textContent = P.motivoCopia(e); return; }
          paso2(v, actual, f.name);
        };
        rd.onerror = () => { msg.textContent = 'No se ha podido leer el archivo.'; };
        rd.readAsText(f);
      };
      setTimeout(() => inp.focus(), 30);
    };
    const paso2 = (v, actual, nombre) => {
      const r = v.resumen, conDatos = Object.keys(actual.datos).some((k) => k !== 'empresas') || idsDe(actual.empresas).length > 1;
      const nAct = idsDe(actual.empresas).length;
      back.innerHTML = `<form class="ef-card glass cp-card" role="dialog" aria-modal="true" aria-label="Resumen de la copia">
        <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
        <div class="eyebrow">Resumen de la copia</div>
        <h3 class="cp-t">${escH(nombre)}</h3>
        <dl class="cp-res">
          <dt>Fecha de la copia</dt><dd>${escH(fecha(r.fecha))}</dd>
          <dt>Cuenta de origen</dt><dd>${escH(r.email || 'sin indicar')}${r.plan && PLANES[r.plan] ? ' · plan ' + PLANES[r.plan].nombre : ''}${r.version ? ' · versión ' + escH(r.version) : ''}</dd>
          <dt>Empresas</dt><dd>${r.empresas.length}: ${r.empresas.map(escH).join(', ')}</dd>
          <dt>Datos que se importan</dt><dd>${r.claves}</dd>
        </dl>
        ${v.avisos.length ? `<ul class="small cp-avisos">${v.avisos.map((a) => `<li>${escH(a)}</li>`).join('')}</ul>` : ''}
        ${conDatos ? `<div class="cp-peligro"><p class="small" style="margin:0"><b>Su cuenta ya tiene datos</b> (${nAct} ${nAct === 1 ? 'empresa' : 'empresas'} y ${Object.keys(actual.datos).length} datos guardados). Importar la copia <b>reemplaza todo</b>: los datos actuales se sustituyen por los de la copia y no se pueden recuperar. Le recomendamos descargar antes una copia de lo que tiene ahora.</p>
          <button type="button" class="btn ghost small" data-bak>Descargar antes mis datos actuales</button>
          <label class="small cp-ok"><input type="checkbox" data-ok> Entiendo que se reemplazan todos los datos actuales de la cuenta.</label></div>`
          : '<p class="small muted" style="margin:0">Su cuenta no tiene datos guardados todavía: se cargará el contenido de la copia.</p>'}
        <p class="small" data-msg role="alert" style="margin:0"></p>
        <div class="row"><button class="btn ${conDatos ? 'del-btn' : 'solid'}" type="submit" ${conDatos ? 'disabled' : ''}>${conDatos ? 'Reemplazar todo' : 'Importar la copia'}</button><button type="button" class="btn ghost" data-otro>Elegir otro archivo</button><button type="button" class="btn ghost" data-cancel>Cancelar</button></div>
      </form>`;
      const f = back.querySelector('form'), msg = f.querySelector('[data-msg]'), sb = f.querySelector('[type=submit]');
      back.querySelector('.ef-x').onclick = close; f.querySelector('[data-cancel]').onclick = close; f.querySelector('[data-otro]').onclick = paso1;
      const ok = f.querySelector('[data-ok]'); if (ok) ok.onchange = () => { sb.disabled = !ok.checked; };
      const bk = f.querySelector('[data-bak]'); if (bk) bk.onclick = () => P.descargarDatos(msg);
      f.onsubmit = async (ev) => {
        ev.preventDefault(); if (conDatos && !(ok && ok.checked)) return;
        sb.disabled = true; msg.style.color = ''; msg.textContent = 'Importando…';
        try {
          const res = await P.reemplazarCuenta(v.escribir);
          if (!res.ok && res.fallos.some((x) => x.k === 'empresas')) { msg.style.color = 'var(--stop)'; msg.textContent = 'No se ha importado nada: ' + res.fallos[0].msg; sb.disabled = false; return; }
          back.innerHTML = `<div class="ef-card glass cp-card" role="dialog" aria-modal="true" aria-label="Copia importada">
            <div class="eyebrow">${res.ok ? 'Copia importada' : 'Copia importada en parte'}</div>
            <h3 class="cp-t">${res.ok ? 'Sus datos ya están cargados' : 'Algunos datos no se han podido importar'}</h3>
            ${res.ok ? `<p class="small muted" style="margin:0">${r.empresas.length} ${r.empresas.length === 1 ? 'empresa' : 'empresas'} y ${r.claves} datos. La aplicación se abre de nuevo con la empresa principal.</p>` : `<ul class="small">${res.fallos.map((x) => `<li>${escH(NOMBRE_DATO[x.k.split('--')[0]] || x.k)}: ${escH(x.msg)}</li>`).join('')}</ul>`}
            <div class="row"><a class="btn solid" href="portal.html">Ir al puesto de mando</a></div>
          </div>`;
        } catch (e) { msg.style.color = 'var(--stop)'; msg.textContent = e.message; sb.disabled = false; }
      };
    };
    document.body.appendChild(back); paso1();
  };

  /* ---------- Fin de la prueba: aviso y activación ----------
     Desde el día 10 de la prueba, una banda bajo la cabecera de cada mundo dice cuántos días quedan y deja activar el
     plan o descargar los datos. Hasta los tres últimos días se puede ocultar hasta el día siguiente; en los tres
     últimos vuelve en cada página. */
  P.avisoPrueba = function () {
    const u = P.user, acc = P.accessOf(u), viejo = document.getElementById('atPrueba');
    if (!u || acc.motivo !== 'prueba' || acc.diasPrueba > PRUEBA_DIAS - 9) { if (viejo) viejo.remove(); return; }
    const n = acc.diasPrueba, urge = n <= 3, KO = `atalaya.prueba.oculta.${u.id}`;
    if (!urge && LS.get(KO) === today()) { if (viejo) viejo.remove(); return; }
    if (urge && ssGet(KO)) { if (viejo) viejo.remove(); return; }
    const b = viejo || document.createElement('div'); b.id = 'atPrueba'; b.className = 'at-prueba' + (urge ? ' urge' : ''); b.setAttribute('role', 'status');
    b.innerHTML = `<span class="at-prueba-t"><b>Su prueba termina en ${n} ${n === 1 ? 'día' : 'días'}</b><span class="at-prueba-p"> · plan ${escH((PLANES[u.plan] || {}).nombre || u.plan)}</span></span><button type="button" class="btn solid small" data-act>Activar ahora</button><button type="button" class="btn ghost small" data-exp>Descargar mis datos</button><button type="button" class="icon-btn at-prueba-x" aria-label="${urge ? 'Ocultar el aviso en esta página' : 'Ocultar el aviso hasta mañana'}">×</button>`;
    b.querySelector('[data-act]').onclick = () => P.activarAhora();
    b.querySelector('[data-exp]').onclick = () => P.descargarDatos();
    b.querySelector('.at-prueba-x').onclick = () => { if (urge) ssSet(KO, 1); else LS.set(KO, today()); b.remove(); };
    const colocar = () => { const tb = document.querySelector('.topbar, .pt-top'), r = tb && tb.getBoundingClientRect(); b.style.top = (r && r.bottom > 0 ? Math.round(r.bottom + 8) : 12) + 'px'; };
    if (!viejo) { document.body.appendChild(b); addEventListener('resize', colocar); }
    colocar(); setTimeout(colocar, 400);
  };
  /* Contenido de la activación (pantalla de acceso con la prueba terminada y ventana «Activar ahora») */
  /* Pago en línea: Checkout para pagar el plan y portal del cliente para tarjeta, facturas y cambios. Devuelven la dirección. */
  /* ---------- Verificación en dos pasos de la cuenta (opcional; solo con servidor) ----------
     Alta: el servidor da un secreto, se añade a la aplicación de autenticación y se confirma con el primer código;
     entonces se ven una sola vez los códigos de recuperación. Baja: contraseña y un código. */
  P.dosPasos = function (alCambiar) {
    const u = P.user; if (!u || P.mode !== 'server') return;
    const back = document.createElement('div'); back.className = 'ef-back';
    const cerrar = () => { back.remove(); document.removeEventListener('keydown', esc2); };
    const esc2 = (e) => { if (e.key === 'Escape') cerrar(); };
    const card = (html) => { back.innerHTML = `<div class="ef-card glass df-card" role="dialog" aria-modal="true" aria-labelledby="dfT"><button class="icon-btn" data-x aria-label="Cerrar" style="position:absolute;right:12px;top:12px">×</button>${html}</div>`; back.querySelector('[data-x]').onclick = cerrar; };
    const err = (f, x) => { const m = f.querySelector('[data-msg]'); m.style.color = 'var(--stop)'; m.textContent = x.message; f.querySelector('[type=submit]').disabled = false; };
    if (u.dosPasos) {
      card(`<div class="eyebrow">Verificación en dos pasos</div><h3 id="dfT" class="pa-t">Desactivar</h3>
        <p class="small muted" style="margin:0">Para desactivarla escriba su contraseña y un código de su aplicación (o uno de recuperación).</p>
        <form class="stack" data-f><input class="input" type="password" name="password" placeholder="Contraseña" autocomplete="current-password" required><input class="input" name="codigo" placeholder="Código" inputmode="numeric" autocomplete="one-time-code" required><button class="btn solid" type="submit">Desactivar</button><small data-msg role="status"></small></form>`);
      const f = back.querySelector('[data-f]');
      f.onsubmit = async (e) => { e.preventDefault(); f.querySelector('[type=submit]').disabled = true; try { const r = await api('/me/2fa/desactivar', { method: 'POST', body: JSON.stringify({ password: f.password.value, codigo: f.codigo.value.trim() }) }); P.user = r.user; cerrar(); P.toast('Verificación en dos pasos desactivada.'); if (alCambiar) alCambiar(); } catch (x) { err(f, x); } };
    } else {
      card('<p class="small muted" style="margin:0">Preparando…</p>');
      api('/me/2fa/iniciar', { method: 'POST', body: '{}' }).then((r) => {
        card(`<div class="eyebrow">Verificación en dos pasos</div><h3 id="dfT" class="pa-t">Proteger su cuenta con un código</h3>
          <ol class="small" style="margin:0;padding-left:18px;display:grid;gap:6px"><li>Abra su aplicación de autenticación (por ejemplo, la de su teléfono) y añada una cuenta con esta clave:<br><code class="df-clave">${escH(r.secretoAgrupado)}</code><br><a class="small" href="${escH(r.uri)}">Abrir en la aplicación de este dispositivo</a></li><li>Escriba el código de 6 cifras que le muestra.</li></ol>
          <form class="stack" data-f><input class="input" name="codigo" placeholder="Código de 6 cifras" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required><button class="btn solid" type="submit">Activar</button><small data-msg role="status"></small></form>`);
        const f = back.querySelector('[data-f]');
        f.onsubmit = async (e) => {
          e.preventDefault(); f.querySelector('[type=submit]').disabled = true;
          try {
            const a = await api('/me/2fa/activar', { method: 'POST', body: JSON.stringify({ codigo: f.codigo.value.trim() }) }); P.user = a.user;
            card(`<div class="eyebrow">Verificación en dos pasos</div><h3 id="dfT" class="pa-t">Activada</h3>
              <p class="small" style="margin:0">Desde ahora, al entrar se le pedirá un código. <b>Guarde estos códigos de recuperación</b> en un lugar seguro: cada uno sirve una vez si no tiene el teléfono a mano. No se volverán a mostrar.</p>
              <pre class="df-codigos">${a.codigos.map(escH).join('\n')}</pre>
              <div class="row"><button class="btn" data-copiar>Copiar los códigos</button><button class="btn solid" data-ok>Hecho</button></div>`);
            back.querySelector('[data-copiar]').onclick = (ev) => { try { navigator.clipboard.writeText(a.codigos.join('\n')); ev.target.textContent = 'Copiados'; } catch (x) { /* sin portapapeles */ } };
            back.querySelector('[data-ok]').onclick = () => { cerrar(); if (alCambiar) alCambiar(); };
          } catch (x) { err(f, x); }
        };
      }).catch((x) => card(`<p class="small" style="margin:0;color:var(--stop)">${escH(x.message)}</p>`));
    }
    document.body.appendChild(back); document.addEventListener('keydown', esc2);
  };
  P.irAlPago = async (u) => { u = u || P.user; const r = await api('/me/pago/checkout', { method: 'POST', body: JSON.stringify({ plan: u.plan, periodo: u.periodo || 'mensual' }) }); return r.url; };
  P.portalPago = async () => (await api('/me/pago/portal', { method: 'POST', body: '{}' })).url;
  /* Vuelta de Stripe (?pago=ok): el aviso del banco puede tardar unos segundos; se consulta la cuenta hasta verla pagada (máx. ~30 s) */
  P.esperarPago = async function () {
    if (!/[?&]pago=ok\b/.test(location.search) || P.mode !== 'server') return;
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* sin historial */ }
    if (P.user && P.user.pagado) { P.toast('Pago recibido. Su acceso está activado.', 6000); return; }
    P.toast('Pago recibido, activando su acceso…', 30000);
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const u = await P.me(); if (u && u.pagado) { P.toast('Acceso activado. Gracias.', 5000); location.reload(); return; }
    }
    P.toast('El pago se está confirmando. Si en unos minutos no ve el acceso activado, escríbanos.', 10000);
  };
  P.pintarPago = function (host, u, opts) {
    opts = opts || {};
    const pl = PLANES[u.plan] || PLANES.profesional, pr = P.precio(u.plan, u.periodo, opts.empresas || 1, u.cuotaPactada), c = P.cuota(pr), url = P.pagoUrl(u.plan, u.periodo), C = P.CONTACTO;
    const bloq = opts.motivo === 'bloqueado', acc = P.accessOf(u);
    // Pago en línea (Stripe) si el servidor lo tiene configurado para este plan y periodo; si no, enlace o solicitud manual
    const stripe = P.mode === 'server' && P.serverInfo && Array.isArray(P.serverInfo.stripe) && P.serverInfo.stripe.includes(u.plan + '-' + (u.periodo || 'mensual'));
    const intro = bloq ? 'Su acceso está suspendido. Póngase en contacto con nosotros para revisarlo.'
      : acc.motivo === 'prueba' ? `Su prueba termina en ${acc.diasPrueba} ${acc.diasPrueba === 1 ? 'día' : 'días'}. Si activa ahora el plan, sigue trabajando sin interrupción y con todos sus datos.`
      : 'Su periodo de prueba ha terminado. Sus datos se conservan: en cuanto se confirme el pago, su acceso se reactiva con todos ellos.';
    host.innerHTML = `<div class="pg">
      <div class="eyebrow">${bloq ? 'Acceso suspendido' : 'Activar el acceso'}</div>
      ${opts.titulo === false ? '' : `<h1 class="pg-h">Plan <em>${escH(pl.nombre)}</em></h1>`}
      <p class="pg-intro">${intro}</p>
      ${bloq ? '' : `<div class="pg-precio"><b>${P.eur(c.importe)}</b><span>${c.unidad} + IVA</span>${pr.periodo === 'anual' ? `<small>${escH(c.detalle)}</small>` : '<small>Pago mensual. Con el pago anual, un 30 % de descuento.</small>'}</div>
      ${stripe || url ? `<a class="btn solid" href="${stripe ? '#' : escH(url)}"${stripe ? '' : ' target="_blank" rel="noopener"'} data-pagar>Pagar ahora</a><p class="small muted" style="margin:0">El pago se hace en una página segura de nuestra pasarela. En cuanto se confirme, su acceso se activa.</p>`
        : `<form class="pg-form stack" data-pgform novalidate>
          <p class="small" style="margin:0"><b>Le enviaremos el enlace de pago</b> a ${escH(u.email || 'su correo')}. Si lo desea, indíquenos los datos de facturación.</p>
          <label class="small">Teléfono de contacto (opcional)<input class="input" name="telefono" type="tel" autocomplete="tel" value="${escH(u.telefono || '')}"></label>
          <label class="small">Datos de facturación (opcional)<textarea class="input" name="factura" rows="2" placeholder="Razón social, CIF y dirección"></textarea></label>
          <button class="btn solid" type="submit">Solicitar el enlace de pago</button>
        </form>`}`}
      <p class="small" data-pgmsg role="status" style="margin:0"></p>
      <div class="pg-contacto small"><b>Contacto directo</b><a href="tel:${C.telefono.replace(/\s+/g, '')}">${escH(C.telefono)}</a>${C.email ? `<a href="mailto:${escH(C.email)}">${escH(C.email)}</a>` : ''}${C.web ? `<a href="${escH(C.web)}" target="_blank" rel="noopener">${escH(C.web.replace(/^https?:\/\//, ''))}</a>` : ''}<span class="muted">Le respondemos ${escH(C.respuesta)}.</span></div>
      <div class="row pg-acc">${bloq ? '' : '<button type="button" class="btn ghost small" data-pgplan>Cambiar de plan antes de activar</button>'}<button type="button" class="btn ghost small" data-pgexp>Descargar mis datos</button></div>
      <p class="small" data-pgexpmsg role="status" style="margin:0"></p>
    </div>`;
    const msg = host.querySelector('[data-pgmsg]');
    const f = host.querySelector('[data-pgform]');
    if (f) f.onsubmit = async (ev) => {
      ev.preventDefault(); const bt = f.querySelector('[type=submit]'); bt.disabled = true; msg.style.color = ''; msg.textContent = 'Enviando…';
      try { await P.solicitarPago({ telefono: f.telefono.value.trim(), factura: f.factura.value.trim() }); msg.style.color = 'var(--go)'; msg.textContent = `Solicitud recibida. Le enviaremos el enlace de pago a ${u.email || 'su correo'} ${C.respuesta}.`; }
      catch (e) { msg.style.color = 'var(--stop)'; msg.textContent = e.message; bt.disabled = false; }
    };
    const pg = host.querySelector('[data-pagar]');
    if (pg && stripe) pg.onclick = async (ev) => {
      ev.preventDefault(); if (pg.dataset.ocupado) return; pg.dataset.ocupado = '1'; msg.style.color = ''; msg.textContent = 'Abriendo la página de pago…';
      try { location.href = await P.irAlPago(u); }
      catch (e) {
        // Ya hay una suscripción: el cambio de tarjeta o de plan se hace en el portal de pagos
        if (e.body && e.body.portal) { try { location.href = await P.portalPago(); return; } catch (x) { e = x; } }
        msg.style.color = 'var(--stop)'; msg.textContent = e.message; delete pg.dataset.ocupado;
      }
    };
    else if (pg) pg.onclick = () => { P.solicitarPago({ enlace: true }).catch(() => {}); };
    host.querySelector('[data-pgexp]').onclick = () => P.descargarDatos(host.querySelector('[data-pgexpmsg]'));
    const pp = host.querySelector('[data-pgplan]'); if (pp) pp.onclick = () => P.panelPlanes({ onCambio: opts.onCambio });
  };
  /* Solicitud de activación: marca la cuenta y, si hay datos de facturación, los manda al equipo */
  P.solicitarPago = async function (d) {
    await P.ready; d = d || {}; const u = P.user || {};
    if (P.mode === 'server') await api('/me/solicitar-pago', { method: 'POST', body: '{}' });
    else { const users = L.users(), x = users.find((y) => y.id === u.id); if (x) { x.solicitudPago = new Date().toISOString(); L.save(users); } }
    if (d.factura || (d.telefono && d.telefono !== (u.telefono || ''))) await P.contactar({ plan: u.plan, origen: 'activacion', cuenta: u.id || null, nombre: u.nombre || '', email: u.email || '', telefono: d.telefono || u.telefono || '', empresa: u.empresa || '', mensaje: `Solicitud de enlace de pago del plan ${(PLANES[u.plan] || {}).nombre || u.plan} (pago ${u.periodo || 'mensual'}).${d.factura ? ' Datos de facturación: ' + d.factura : ''}` });
    return { ok: true };
  };
  P.activarAhora = function () {
    const u = P.user; if (!u) return;
    const back = document.createElement('div'); back.className = 'ef-back';
    back.innerHTML = '<div class="ef-card glass pg-card" role="dialog" aria-modal="true" aria-label="Activar el acceso"><button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button><div data-host></div></div>';
    const close = () => { back.remove(); removeEventListener('keydown', onKey); };
    const onKey = (ev) => { if (ev.key === 'Escape') close(); };
    addEventListener('keydown', onKey);
    back.addEventListener('click', (ev) => { if (ev.target === back) close(); });
    back.querySelector('.ef-x').onclick = close;
    document.body.appendChild(back);
    P.pintarPago(back.querySelector('[data-host]'), u, { empresas: P.empresas.reales().length || 1, onCambio: () => location.reload() });
  };

  /* ---------- Primer acceso de una cuenta nueva ----------
     Se pregunta una sola vez cómo quiere empezar: con sus datos (la empresa principal pasa a datos reales y se abre la
     carga de datos), viendo antes la empresa modelo, o más tarde. La respuesta se guarda en el registro de empresas
     («inicio»), así que vale para cualquier navegador. Las cuentas que ya tienen datos no lo ven. */
  P.primerAcceso = {
    async pendiente() {
      await P.empresas.cargar(); if (!P.user || REG.inicio) return false;
      const pr = REG.lista.find((e) => e.id === 'principal'); if (!pr || pr.datosReales || P.empresas.reales().length > 1) return false;
      try { for (const k of ['simulador', 'estrategia', 'intervencion']) if ((await leerCrudo(k)) != null) return false; } catch (e) { return false; }
      return true;
    },
    async elegir(eleccion) {
      await P.empresas.cargar(); REG.inicio = { eleccion, fecha: new Date().toISOString() };
      const real = eleccion === 'datos' || eleccion === 'preguntas';
      if (real) { LS.set(ACT, 'principal'); try { await P.activarModoReal('inicio'); } catch (e) { /* se guarda abajo */ } }
      try { await P.empresas.guardar(); } catch (e) { /* se volverá a preguntar */ }
      if (eleccion === 'datos') location.href = 'app.html#empresa';
      else if (eleccion === 'preguntas') location.href = 'app.html#preguntas';
      else if (eleccion === 'modelo') P.empresas.cambiar(MID);
    },
    /* La tarjeta de primera visita: una sola, con la acción clave delante (no un recorrido largo) */
    tarjeta() {
      if (document.querySelector('.pa-back')) return;
      const back = document.createElement('div'); back.className = 'ef-back pa-back';
      back.innerHTML = `<div class="ef-card glass pa-card" role="dialog" aria-modal="true" aria-labelledby="paT" aria-describedby="paD">
        <div class="eyebrow">Primera visita</div>
        <h3 id="paT" class="pa-t">¿Cómo quiere empezar?</h3>
        <p id="paD" class="small muted" style="margin:0">${P.verbo(true)} una opción. Podrá hacer las otras después desde el menú de su cuenta.</p>
        <div class="pa-ops">
          <button type="button" class="pa-op pa-clave" data-ini="datos"><b>Cargar mis cuentas</b><small>Suba el balance y la cuenta de resultados y el simulador toma sus cifras. Su empresa empieza sin datos de ejemplo.</small></button>
          <button type="button" class="pa-op" data-ini="preguntas"><b>Responder unas preguntas</b><small>Ventas, gastos, caja y deuda en lenguaje llano. Lo que no sepa se estima con los valores de su sector y queda marcado como estimado.</small></button>
          <button type="button" class="pa-op" data-ini="modelo"><b>Ver el ejemplo</b><small>Una empresa ficticia completa para ver qué hace cada mundo antes de cargar la suya.</small></button>
        </div>
        <button type="button" class="btn ghost small pa-luego" data-ini="luego">Decidir más tarde</button>
      </div>`;
      document.body.appendChild(back);
      const ops = Array.from(back.querySelectorAll('[data-ini]'));
      ops.forEach((b) => b.onclick = async () => { ops.forEach((x) => { x.disabled = true; }); await P.primerAcceso.elegir(b.dataset.ini); if (b.dataset.ini === 'luego') back.remove(); });
      // El foco queda dentro de la tarjeta; Esc equivale a «Decidir más tarde»
      back.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); back.querySelector('[data-ini="luego"]').click(); return; }
        if (e.key !== 'Tab') return;
        const i = ops.indexOf(document.activeElement), n = ops.length;
        if (e.shiftKey && i <= 0) { e.preventDefault(); ops[n - 1].focus(); } else if (!e.shiftKey && i === n - 1) { e.preventDefault(); ops[0].focus(); }
      });
      setTimeout(() => ops[0].focus(), 30);
    }
  };
  /* ---------- Mapa de cada mundo visto ----------
     El mapa de capas de un mundo se abre solo la primera vez por empresa y mundo; después, con su botón o con #mapa.
     Se recuerda en la ficha de la empresa (registro «empresas», campo mapas), así vale en cualquier navegador. */
  const MAPA_SS = { sim: 'atalaya.ruta.intro', est: 'atalaya.rutaest.intro', per: 'atalaya.rutaper.intro' };
  P.mapa = {
    visto(pl) { const e = P.empresas.activa(); return !!(e && e.mapas && e.mapas[pl]); },
    marcar(pl) { const e = P.empresas.activa(); if (!e || (e.mapas && e.mapas[pl])) return; const m = Object.assign({}, e.mapas, { [pl]: today() }); P.empresas.editar(e.id, { mapas: m }).catch(() => {}); },
    // ¿Se abre al entrar? Con #mapa siempre; si no, solo si no se ha visto (y queda visto)
    alEntrar(pl) { if (location.hash === '#mapa') return true; if (!REG || P.mapa.visto(pl)) return false; P.mapa.marcar(pl); return true; }
  };
  /* Los mapas del sistema estratégico y de personas deciden con una marca de la sesión de la pestaña: se ajusta aquí,
     antes de que arranquen, según lo que recuerda la empresa */
  function prepararMapa() {
    const pl = { 'estrategia.html': 'est', 'personas.html': 'per' }[(location.pathname.split('/').pop() || '').toLowerCase()]; if (!pl) return;
    try { if (P.mapa.alEntrar(pl)) sessionStorage.removeItem(MAPA_SS[pl]); else sessionStorage.setItem(MAPA_SS[pl], '1'); } catch (e) { /* sin almacenamiento */ }
  }
  /* Alta: el nombre y el sector de la empresa van a la ficha de la empresa principal */
  P.fichaInicial = async function (d) {
    LS.set(ACT, 'principal'); REG = null;
    await P.empresas.cargar();
    const c = {}; if (d.nombre) c.nombre = String(d.nombre).trim().slice(0, 160); if (d.sector) c.sector = d.sector;
    if (Object.keys(c).length) await P.empresas.editar('principal', c);
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
  P.puede = (f, u, exacto) => {
    if (!exacto && (!u || u === P.user) && P.empresaId() === MID && P.user) { const pv = P.modelo.cfg().plan; if (pv && PLANES[pv]) u = Object.assign({}, P.user, { plan: pv }); }
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
    // Cuentan solo las empresas reales (la principal incluida); la empresa modelo no ocupa plaza del plan
    const n = P.empresas.reales().length, lim = PLANES[plan].empresas;
    if (n > lim) throw new Error(`Tienes ${n} empresas dadas de alta y ${PLANES[plan].nombre} admite ${lim}. Borra antes las que no necesites (desde el mapa de empresas) y vuelve a intentarlo.`);
    const antes = P.user && P.user.plan;
    let u;
    // Con el acceso pagado, subir de plan queda pendiente hasta que la administración lo confirme (el servidor responde 409)
    try { u = await P.updateMe({ plan, periodo: periodo || (P.user && P.user.periodo) || 'mensual' }); }
    catch (e) { if (e.status === 409 && e.body && e.body.pendiente) return { pendiente: true, mensaje: e.message }; throw e; }
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
    const n = P.empresas.reales().length || 1; // sin la empresa modelo: ni ocupa plaza ni cambia el tramo
    const back = document.createElement('div'); back.className = 'ef-back';
    const draw = () => {
      back.innerHTML = `<div class="ef-card pl-card glass" role="dialog" aria-modal="true" aria-label="Mi plan">
        <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
        <div class="eyebrow">Mi plan</div>
        <h3 style="margin:0;font-family:var(--font-display);font-weight:500;font-size:1.6rem">Ahora tienes <em>${PLANES[u.plan] ? PLANES[u.plan].nombre : escH(u.plan)}</em> · pago ${(u.periodo || 'mensual') === 'anual' ? 'anual' : 'mensual'}</h3>
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
            ${pl.aMedida && !cur ? '<button class="btn solid small" data-contacto>Contactar con nuestro equipo</button>' : cur ? (periodo !== (u.periodo || 'mensual') ? `<button class="btn solid small" data-plan="${k}">Pasar a pago ${periodo}</button>` : '<button class="btn ghost small" disabled>Es tu plan</button>') : bloq ? `<p class="small" style="color:var(--warn);margin:0">Tienes ${n} empresas (sin contar la empresa modelo) y este plan admite ${pl.empresas}. Para bajar, antes hay que borrar ${n - pl.empresas}.</p><a class="btn ghost small" href="portal.html#empresas">Ir al mapa de empresas</a>` : `<button class="btn ${PLANES[k].precio > (PLANES[u.plan] || {}).precio ? 'solid' : 'ghost'} small" data-plan="${k}">${PLANES[k].precio > (PLANES[u.plan] || {}).precio ? 'Subir' : 'Bajar'} a ${pl.nombre}</button>`}
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
        try { const r = await P.cambiarPlan(k, periodo); if (r && r.pendiente) { msg.style.color = 'var(--warn)'; msg.textContent = r.mensaje || `Hemos recibido su petición de pasar a ${PLANES[k].nombre}: la administración la confirmará y se ajustará en el siguiente cobro.`; return; } const c = P.cuota(P.precio(k, periodo, n)); msg.style.color = 'var(--go)'; msg.textContent = `Hecho: ahora tienes ${PLANES[k].nombre} con pago ${periodo}: ${P.eur(c.importe)}${c.unidad}.`; setTimeout(() => { if (opts.onCambio) opts.onCambio(k); else location.reload(); }, 700); }
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
    if (e && e.modelo) return P.fichaModelo(e);
    const u = P.user, plan = PLANES[(u && u.plan) || 'profesional'] || PLANES.profesional, grupo = !!plan.grupo;
    const d = Object.assign({ nombre: '', forma: P.FORMAS[0], cif: '', constitucion: '', sector: '', actividad: '', provincia: '', plantilla: '', socios: [], rol: grupo ? 'filial' : (e && e.id === 'principal' ? 'holding' : 'cliente'), matriz: '', participacion: 100, contacto: '' }, e || {});
    const S = sectores(), lista = P.empresas.reales(); // la empresa modelo no puede ser dominante de una sociedad real
    const holdings = lista.filter((x) => x.rol === 'holding' && (!e || x.id !== e.id));
    return new Promise((resolve) => {
      const back = document.createElement('div'); back.className = 'ef-back';
      const socioRow = (s) => `<div class="ef-socio"><input class="input" data-sn placeholder="Nombre del socio o sociedad" value="${escH(s.nombre)}"><input class="input" data-sp type="number" min="0" max="100" step="0.01" value="${s.pct != null ? escH(s.pct) : ''}" placeholder="%"><button type="button" class="icon-btn" data-sdel aria-label="Quitar socio">×</button></div>`;
      back.innerHTML = `<form class="ef-card glass" role="dialog" aria-modal="true" aria-label="Ficha de la empresa">
        <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
        <div class="eyebrow">${opts.nuevo ? (grupo ? 'Nueva sociedad' : 'Nueva empresa') : 'Ficha de la empresa'}</div>
        <label class="ef-name"><span>Nombre o razón social</span><input name="nombre" ${opts.nuevo ? 'required' : ''} value="${escH(d.nombre === 'Mi empresa' ? '' : d.nombre)}" placeholder="Por ejemplo: Transportes Ruiz, S.L."></label>
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
          <label data-fil><span>Depende de</span><select class="input" name="matriz"><option value="">${holdings.length ? 'Elegir la sociedad dominante…' : 'Primero da de alta la holding'}</option>${holdings.map((h) => `<option value="${escH(h.id)}" ${h.id === d.matriz ? 'selected' : ''}>${escH(h.nombre)}</option>`).join('')}</select></label>
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
      f.querySelectorAll('[name=modoDatos]').forEach((r) => (r.onchange = () => { delete f.dataset.okModo; f.querySelector('[data-msg]').textContent = ''; f.querySelector('button[type=submit]').textContent = opts.nuevo ? 'Dar de alta' : 'Guardar la ficha'; }));
      const close = (v) => { back.remove(); resolve(v); };
      back.querySelector('.ef-x').onclick = () => close(null); f.querySelector('[data-cancel]').onclick = () => close(null);
      back.addEventListener('click', (ev) => { if (ev.target === back) close(null); });
      setTimeout(() => f.nombre.focus(), 30);
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const socios = Array.from(f.querySelectorAll('.ef-socio')).map((r) => ({ nombre: r.querySelector('[data-sn]').value.trim(), pct: parseFloat(r.querySelector('[data-sp]').value) })).filter((s) => s.nombre || isFinite(s.pct)).map((s) => ({ nombre: s.nombre || 'Socio', pct: isFinite(s.pct) ? s.pct : null }));
        const v = (n) => (f[n] ? f[n].value.trim() : undefined);
        const datos = { nombre: v('nombre') || (e && e.nombre) || 'Mi empresa', forma: v('forma'), cif: v('cif').toUpperCase(), constitucion: v('constitucion') ? +v('constitucion') : '', sector: v('sector'), actividad: v('actividad'), provincia: v('provincia'), plantilla: v('plantilla') ? +v('plantilla') : '', socios };
        if (f.contacto) datos.contacto = v('contacto');
        const quiereReal = (f.querySelector('[name=modoDatos]:checked') || {}).value === 'real', cambiaModo = quiereReal !== !!d.datosReales;
        if (opts.nuevo && quiereReal) Object.assign(datos, { datosReales: true, datosRealesDesde: new Date().toISOString().slice(0, 10), datosRealesTs: new Date().toISOString(), datosRealesOrigen: 'ficha' });
        if (f.rol) { datos.rol = v('rol'); datos.matriz = datos.rol === 'holding' ? '' : v('matriz'); datos.participacion = datos.rol === 'holding' ? 100 : +(v('participacion') || 100); }
        // Confirmación dentro de la ficha (las ventanas del navegador pueden estar bloqueadas donde se publica la aplicación)
        if (!opts.nuevo && cambiaModo && f.dataset.okModo !== (quiereReal ? 'real' : 'ejemplo')) {
          f.dataset.okModo = quiereReal ? 'real' : 'ejemplo';
          const msg = f.querySelector('[data-msg]'); msg.style.color = 'var(--warn, #c48a00)';
          msg.textContent = quiereReal ? 'Vas a trabajar con datos reales: ningún mundo usará datos de ejemplo; los que no se hayan trabajado se ponen a cero y piden sus datos (transcripciones y documentación). Lo ya trabajado se conserva. Pulsa otra vez para confirmar.' : 'Vas a volver a permitir datos ficticios: los datos reales ya subidos se conservan y los mundos sin datos podrán mostrar el ejemplo. Pulsa otra vez para confirmar.';
          f.querySelector('button[type=submit]').textContent = 'Confirmar el cambio y guardar';
          return;
        }
        try { const r = opts.nuevo ? await P.empresas.crear(datos) : await P.empresas.editar(e.id, datos);
          if (!opts.nuevo && cambiaModo) { const act = P.empresas.activa(); if (act && act.id === e.id) { if (quiereReal) await P.activarModoReal('ficha'); else await P.desactivarModoReal(); setTimeout(() => location.reload(), 50); } else await P.empresas.editar(e.id, quiereReal ? { datosReales: true, datosRealesDesde: new Date().toISOString().slice(0, 10), datosRealesTs: new Date().toISOString(), datosRealesOrigen: 'ficha' } : { datosReales: false }); }
          try { window.dispatchEvent(new CustomEvent('atalaya:empresa', { detail: r })); } catch (x) { /* sin eventos */ } close(r); }
        catch (x) { f.querySelector('[data-msg]').textContent = x.message; }
      };
    });
  };
  /* ---------- Ficha de la empresa modelo ----------
     Qué es, qué mundos están conectados y con qué plan se enseña. Un mundo desconectado se queda a cero (como una empresa
     real a la que le faltan esos datos) y los demás avisan de lo que falta: así se ve qué aporta cada mundo y cada plan. */
  /* ---------- Vídeo de presentación (89 s) en una ventana flotante ----------
     Se abre desde el puesto de mando, la ficha de la empresa modelo y el final del paseo. Esc, × o pulsar fuera lo cierran. */
  P.VIDEO = 'media/video/atalaya-promo.mp4';
  P.verVideo = function () {
    if (document.querySelector('.vp-back')) return;
    const back = document.createElement('div'); back.className = 'vp-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-label', 'Vídeo: anticiparse y decidir mejor');
    back.innerHTML = `<div class="vp-box"><button class="vp-x" type="button" aria-label="Cerrar el vídeo">×</button>
      <video class="vp-v" src="${P.VIDEO}" controls autoplay playsinline preload="auto"></video>
      <div class="vp-pie"><span>Atalaya 360° · Anticiparse y decidir mejor</span><a href="${P.VIDEO}" download>Descargar MP4</a></div></div>`;
    const cerrar = () => { const v = back.querySelector('video'); if (v) v.pause(); back.remove(); removeEventListener('keydown', tecla); };
    const tecla = (ev) => { if (ev.key === 'Escape') cerrar(); };
    back.addEventListener('click', (ev) => { if (ev.target === back) cerrar(); });
    back.querySelector('.vp-x').onclick = cerrar; addEventListener('keydown', tecla);
    document.body.appendChild(back); back.querySelector('.vp-x').focus();
  };

  P.fichaModelo = function (e) {
    const c = P.modelo.cfg(), mio = (P.user && P.user.plan) || 'profesional', K = A.modelo && A.modelo.cifras ? A.modelo.cifras() : null;
    const eur = (x) => P.eur(Math.round(x / 1000) * 1000).replace(/\.000 €$/, '.000 €');
    return new Promise((resolve) => {
      const back = document.createElement('div'); back.className = 'ef-back';
      const planes = Object.keys(PLANES);
      back.innerHTML = `<form class="ef-card glass em-ficha-modelo" role="dialog" aria-modal="true" aria-label="Ficha de la empresa modelo">
        <button type="button" class="icon-btn ef-x" aria-label="Cerrar">×</button>
        <div class="eyebrow">Empresa modelo · datos ficticios</div>
        <h3 style="margin:2px 0 4px">${escH(e.nombre)}</h3>
        <p class="small muted" style="margin:0">Una empresa inventada y completa para enseñar Atalaya sin tocar datos de clientes: fabrica y monta estructuras metálicas en Asturias desde 1996, es familiar (el fundador y sus dos hijos) y está a las puertas de una inversión. Cualquier parecido con una empresa real es casual.</p>
        ${K ? `<div class="emf-kpis"><div><span>Ventas</span><b>${eur(K.ventas0)} → ${eur(K.ventas)}</b><small>2021 → 2025 · +${String(K.cagr).replace('.', ',')} % al año</small></div><div><span>EBITDA 2025</span><b>${eur(K.ebitda)}</b><small>${String(K.ebitdaPct).replace('.', ',')} % de las ventas</small></div><div><span>Días de cobro</span><b>${K.dso0} → ${K.dso}</b><small>la caja baja de ${eur(K.tesoreria0)} a ${eur(K.tesoreria)}</small></div><div><span>Plantilla</span><b>${K.plantilla0} → ${K.plantilla}</b><small>personas</small></div></div>` : ''}
        <h4>Mundos conectados</h4>
        <p class="small muted" style="margin:0">Marca los mundos que reciben los datos de la empresa modelo. Los que dejes sin marcar se quedan a cero y piden sus datos, como en una empresa real.</p>
        <div class="emf-mundos">${P.modelo.MUNDOS.map((m) => `<label class="emf-m"><input type="checkbox" name="con" value="${m.k}" ${c.con[m.k] !== false ? 'checked' : ''}><span><b>${escH(m.n)}</b><small>${m.f ? 'Desde el plan ' + planes.filter((pl) => P.puede(m.f, { plan: pl }, true)).map((pl) => PLANES[pl].nombre).join(', ') : 'En todos los planes'}</small></span></label>`).join('')}</div>
        <h4>Enseñarla como el plan…</h4>
        <p class="small muted" style="margin:0">Con la empresa modelo activa, Atalaya se comporta como el plan que elijas: abre sus mundos y conecta los que incluye. Tu plan y tus empresas no cambian.</p>
        <div class="emf-planes">${[['', 'Mi plan (' + ((PLANES[mio] || {}).nombre || mio) + ')']].concat(planes.map((pl) => [pl, PLANES[pl].nombre])).map(([k, n]) => `<label class="emf-p"><input type="radio" name="plan" value="${k}" ${c.plan === k ? 'checked' : ''}><span>${escH(n)}</span></label>`).join('')}</div>
        <p class="small" data-msg style="margin:0"></p>
        <div class="row">
          <button class="btn solid" type="submit">Guardar las conexiones</button>
          <button type="button" class="btn ghost" data-entrar>${P.modelo.activa() ? 'Seguir con la empresa modelo' : 'Probar con la empresa modelo'}</button>
          ${A.paseo ? '<button type="button" class="btn ghost" data-paseo>Paseo virtual</button>' : ''}
          <button type="button" class="btn ghost" data-video>Ver el vídeo</button>
          <span class="spacer"></span>
          <button type="button" class="btn ghost small" data-reset title="Vuelve a crear los datos de la empresa modelo tal como vienen">Restablecer sus datos</button>
        </div>
      </form>`;
      document.body.appendChild(back);
      const f = back.querySelector('form'), msg = f.querySelector('[data-msg]');
      const close = (v) => { back.remove(); resolve(v); };
      back.querySelector('.ef-x').onclick = () => close(null);
      back.addEventListener('click', (ev) => { if (ev.target === back) close(null); });
      // Al elegir un plan se marcan los mundos que incluye
      f.querySelectorAll('[name=plan]').forEach((r) => (r.onchange = () => { const ms = P.modelo.mundosDe(r.value || mio); f.querySelectorAll('[name=con]').forEach((x) => { x.checked = ms.includes(x.value); }); msg.textContent = `Conectados los mundos del plan ${(PLANES[r.value || mio] || {}).nombre || ''}. Guarda para aplicarlo.`; msg.style.color = 'var(--muted, #aaa)'; }));
      const leer = () => { const n = P.modelo.cfg(); n.plan = (f.querySelector('[name=plan]:checked') || {}).value || ''; f.querySelectorAll('[name=con]').forEach((x) => { n.con[x.value] = x.checked; }); return n; };
      const aplicar = (ir) => { P.modelo.guardarCfg(leer()); if (ir || P.modelo.activa()) { if (!P.modelo.activa()) P.empresas.cambiar(MID); else location.reload(); } close(true); };
      f.onsubmit = (ev) => { ev.preventDefault(); aplicar(false); };
      f.querySelector('[data-entrar]').onclick = () => aplicar(true);
      const pb = f.querySelector('[data-paseo]'); if (pb) pb.onclick = () => { P.modelo.guardarCfg(leer()); close(true); A.paseo.iniciar(); };
      const vb = f.querySelector('[data-video]'); if (vb) vb.onclick = () => P.verVideo();
      const rb = f.querySelector('[data-reset]');
      rb.onclick = () => {
        if (!rb.dataset.ok) { rb.dataset.ok = '1'; rb.textContent = 'Pulsa otra vez: se pierde lo que hayas cambiado en la empresa modelo'; return; }
        P.modelo.restablecer(); msg.textContent = 'Datos de la empresa modelo restablecidos.'; msg.style.color = 'var(--go)'; rb.disabled = true;
        if (P.modelo.activa()) setTimeout(() => location.reload(), 400);
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
    // La empresa modelo va aparte, al final del mapa
    const listaT = P.empresas.lista(), lista = listaT.filter((e) => !e.modelo), modelo = listaT.find((e) => e.modelo), act = P.empresas.activa(), S = sectores();
    const anio = new Date().getFullYear();
    const card = (e) => {
      if (e.modelo) return cardModelo(e);
      const i = lista.indexOf(e), pc = P.fichaCompleta(e);
      const soc = (e.socios || []).filter((s) => s.pct > 0);
      return `<div class="em-card ${e.id === act.id ? 'on' : ''}" data-id="${escH(e.id)}">
        <div class="em-top"><i style="background:${PAL[i % PAL.length]}"></i><b>${escH(e.nombre)}</b>${e.id === act.id ? '<span class="em-act">activa</span>' : ''}</div>
        <div class="em-meta">${[e.forma && e.forma.replace(/ \(.*\)/, ''), e.cif].filter(Boolean).map(escH).join(' · ') || '<span class="muted">Sin forma jurídica ni CIF</span>'}</div>
        <div class="em-meta">${e.constitucion ? `Constituida en ${escH(e.constitucion)} · ${anio - e.constitucion} años` : '<span class="muted">Año de constitución sin indicar</span>'}</div>
        <div class="em-meta">${[e.sector && S && S[e.sector] ? S[e.sector].nombre : e.sector, e.provincia, e.plantilla !== '' && e.plantilla != null ? e.plantilla + ' personas' : ''].filter(Boolean).map(escH).join(' · ') || '<span class="muted">Sector y plantilla sin indicar</span>'}</div>
        ${grupo && e.rol !== 'holding' ? `<div class="em-meta">Filial · ${escH(e.participacion != null ? e.participacion : 100)} % de ${escH((lista.find((x) => x.id === e.matriz) || {}).nombre || 'la holding')}</div>` : ''}
        ${soc.length ? `<div class="em-socios" title="${escH(soc.map((s) => `${s.nombre}: ${s.pct} %`).join(' · '))}">${soc.map((s, k) => `<span style="width:${Math.max(0, Math.min(100, +s.pct || 0))}%;background:${PAL[(k + 2) % PAL.length]}"></span>`).join('')}</div><div class="em-meta small">${soc.slice(0, 3).map((s) => `${escH(s.nombre)} ${escH(String(s.pct).replace('.', ','))} %`).join(' · ')}${soc.length > 3 ? ' …' : ''}</div>` : '<div class="em-meta muted">Socios sin indicar</div>'}
        <div class="em-prog" title="Ficha completa al ${pc} %"><span style="width:${pc}%"></span></div>
        <div class="em-btns"><button class="btn solid small" data-enter="${escH(e.id)}">${e.id === act.id ? 'Seguir con esta' : 'Entrar con esta'}</button><button class="btn ghost small" data-ficha="${escH(e.id)}">Ficha${pc < 100 ? ` · ${pc} %` : ''}</button>${e.id !== 'principal' ? `<button class="icon-btn" data-del="${escH(e.id)}" aria-label="Borrar ${escH(e.nombre)}" title="Borrar">×</button>` : ''}</div>
      </div>`;
    };
    const nReales = P.empresas.reales().length;
    const nueva = nReales < lim ? `<button class="em-card em-new" data-new><b>+</b><span>${grupo ? 'Añadir una sociedad' : lim > 1 ? 'Dar de alta una empresa cliente' : ''}</span><small>${isFinite(lim) ? `${nReales} de ${lim}` : `${nReales} sociedades`}</small></button>` : (lim === 1 ? '' : `<div class="em-card em-new" style="cursor:default"><span class="small muted">Has llegado a las ${lim} empresas de tu plan.</span></div>`);
    const cardModelo = (e) => `<div class="em-card em-modelo ${e.id === act.id ? 'on' : ''}" data-id="${e.id}">
        <div class="em-top"><i style="background:linear-gradient(135deg,#c9f24d,#3987e5)"></i><b>${escH(e.nombre)}</b>${e.id === act.id ? '<span class="em-act">activa</span>' : ''}</div>
        <div class="em-meta"><span class="em-tag">Empresa modelo · datos ficticios</span></div>
        <div class="em-meta">Estructuras y montajes industriales · Asturias · 33 personas · desde 1996</div>
        <div class="em-meta small muted">Cinco años de cuentas, clientes, compras, equipo, organigrama, impuestos, nuevas líneas y plan de crecimiento, enlazados en todos los mundos.</div>
        <div class="em-meta small">${(() => { const c = P.modelo.cfg(), on = P.modelo.MUNDOS.filter((m) => c.con[m.k] !== false).length; return `${on} de ${P.modelo.MUNDOS.length} mundos conectados${c.plan ? ' · vista del plan ' + escH((PLANES[c.plan] || {}).nombre || c.plan) : ''}`; })()}</div>
        <div class="em-btns"><button class="btn solid small" data-enter="${e.id}">${e.id === act.id ? 'Seguir con la empresa de ejemplo' : 'Ver la empresa de ejemplo'}</button><button class="btn ghost small" data-ficha="${e.id}">Ficha y conexiones</button>${window.Atalaya && window.Atalaya.paseo ? '<button class="btn ghost small" data-paseo>Paseo virtual</button>' : ''}</div>
      </div>`;
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
    host.innerHTML = `<div class="em-head"><div><div class="eyebrow">${opts.paso ? 'Paso 1 · ' : ''}${titulo}</div><p class="small muted" style="margin:4px 0 0">${lede}</p></div>${opts.cerrar ? '<button class="btn ghost small" data-cerrar>Ir a los mundos →</button>' : ''}</div>${cuerpo}${modelo ? `<div class="em-modelo-wrap"><div class="eyebrow">Empresa de prueba</div><p class="small muted" style="margin:2px 0 8px">Para ver qué hace cada mundo con una empresa completa, sin tocar las tuyas. Desde su ficha eliges qué mundos se conectan y con qué plan se enseña.</p><div class="em-grid">${cardModelo(modelo)}</div></div>` : ''}
      ${lim === 1 ? '<div class="row small" style="margin:0"><span class="muted">¿Trabajas con varias empresas?</span><button class="btn ghost small" data-planes="consultora">Pasar a Consultora (empresas cliente)</button><button class="btn ghost small" data-planes="grupos">Pasar a Grupos (holding y filiales)</button></div>' : ''}`;
    host.querySelectorAll('[data-planes]').forEach((b) => b.onclick = () => P.panelPlanes({ destacar: b.dataset.planes, motivo: 'Al cambiar, el mapa te dejará dar de alta más empresas al momento.' }));
    const redraw = () => P.mapaEmpresas(host, opts);
    host.querySelectorAll('[data-enter]').forEach((b) => b.onclick = () => { const id = b.dataset.enter; if (opts.onEnter) opts.onEnter(id); else P.empresas.cambiar(id); });
    host.querySelectorAll('[data-ficha]').forEach((b) => b.onclick = async () => { const r = await P.fichaEmpresa(listaT.find((x) => x.id === b.dataset.ficha)); if (r) redraw(); });
    host.querySelectorAll('[data-paseo]').forEach((b) => b.onclick = () => window.Atalaya.paseo && window.Atalaya.paseo.iniciar());
    host.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { const e = lista.find((x) => x.id === b.dataset.del); if (!(await P.borrarEmpresaSeguro(e))) return; if (e.id === act.id) location.reload(); else redraw(); });
    const nb = host.querySelector('[data-new]'); if (nb) nb.onclick = async () => { const r = await P.fichaEmpresa(null, { nuevo: true }); if (r) redraw(); };
    const cb = host.querySelector('[data-cerrar]'); if (cb && opts.onCerrar) cb.onclick = opts.onCerrar;
  };

  /* ---------- Navegación común: una sola lista de mundos ----------
     La usan la barra superior de cada página (botón «Mundos»; en el móvil, el menú con la cuenta) y el puesto de mando.
     f: permiso del plan (P.puede); si el plan no lo incluye, el mundo se ve y al pulsarlo se ofrecen los planes. */
  P.MUNDOS = [
    { k: 'portal', n: 'Puesto de mando', d: 'Elegir mundo y empresa', href: 'portal.html', c: '#c9f24d' },
    { k: 'sim', n: 'Simulador de inversión', d: 'Decidir una inversión', href: 'app.html', c: '#d4ae64' },
    { k: 'est', n: 'Sistema estratégico', d: 'Gobernar el día a día', href: 'estrategia.html', f: 'estrategia', plan: 'profesional', c: '#3987e5' },
    { k: 'per', n: 'Personas y equipos', d: 'Perfiles, puestos y equipos', href: 'personas.html', f: 'personas', plan: 'consultora', c: '#ab7bff' },
    { k: 'iv', n: 'Auditoría integral', d: 'Diagnóstico e intervención', href: 'intervencion.html', f: 'intervencion', plan: 'consultora', c: '#e86a5a' },
    { k: 'mesa', n: 'Mesa de trabajo', d: 'Hoy, prioridades y agenda', href: 'mesa.html', c: '#199e70' },
    { k: 'tablero', n: 'Tablero general', d: 'Toda la empresa de un vistazo', href: 'tablero.html', c: '#9ba4ba' },
    { k: 'libro', n: 'Libro corporativo', d: 'Los informes en un libro', href: 'libro.html', c: '#ecd6a6' },
    { k: 'grupo', n: 'Vista de grupo', d: 'Consolidado y sociedades', href: 'grupo.html', grupo: true, c: '#86b4ff' }
  ];
  const MOTIVO_PLAN = {
    est: 'El sistema estratégico está incluido desde el plan Profesional. Su plan incluye el simulador de inversión.',
    per: 'Personas y equipos (perfiles, equipos, liderazgo y tablillas) está incluido en el plan Consultora.',
    iv: 'La auditoría integral (primera sesión como un triaje, auditoría por áreas y plan de intervención) está incluida en el plan Consultora.'
  };
  // Mundos de la cuenta: la vista de grupo solo en planes con varias empresas (en Consultora se llama cartera de clientes)
  P.mundos = (u) => {
    u = u || P.user; const pl = PLANES[(u && u.plan) || 'profesional'] || PLANES.profesional;
    return P.MUNDOS.filter((m) => !m.grupo || P.esGrupo(u)).map((m) => Object.assign({}, m, m.grupo && !pl.grupo ? { n: 'Cartera de clientes', d: 'Empresas cliente de un vistazo' } : {}, { lock: !!(m.f && u && !P.puede(m.f)) }));
  };
  P.mundoActual = () => { const f = (location.pathname.split('/').pop() || 'index.html').toLowerCase(); const m = P.MUNDOS.find((x) => x.href === f); return m ? m.k : null; };
  P.abrirMundo = (k) => {
    const m = P.MUNDOS.find((x) => x.k === k); if (!m) return;
    if (m.f && P.user && !P.puede(m.f)) { P.panelPlanes({ destacar: m.plan, motivo: MOTIVO_PLAN[k] }); return; }
    location.href = m.href;
  };
  // Pantalla táctil sin ratón: los textos dicen «toque» en lugar de «pase por encima» o «pulse»
  P.tactil = () => { try { return matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (e) { return false; } };
  P.verbo = (mayus) => (P.tactil() ? (mayus ? 'Toque' : 'toque') : (mayus ? 'Pulse' : 'pulse'));
  const listaMundos = (cls) => {
    const act = P.mundoActual();
    return P.mundos().map((m) => `<a class="${cls}" href="${m.href}" data-mundo="${m.k}"${m.k === act ? ' aria-current="page"' : ''}${m.lock ? ' data-lock="1"' : ''}><i style="background:${m.c}" aria-hidden="true"></i><span><b>${escH(m.n)}</b><small>${m.lock ? `Incluido en el plan ${escH(PLANES[m.plan].nombre)}` : escH(m.d)}</small></span></a>`).join('');
  };
  const atarMundos = (host, alCerrar) => host.querySelectorAll('[data-mundo]').forEach((a) => a.addEventListener('click', (e) => {
    if (a.getAttribute('aria-current') === 'page') { e.preventDefault(); alCerrar && alCerrar(); return; }
    if (a.dataset.lock && !(e.ctrlKey || e.metaKey)) { e.preventDefault(); alCerrar && alCerrar(); P.abrirMundo(a.dataset.mundo); }
  }));
  const MOVIL = '(max-width: 560px)';
  const esMovil = () => { try { return matchMedia(MOVIL).matches; } catch (e) { return false; } };
  /* Barra común: tras la marca, el botón «Mundos» con su lista. En el móvil (≤ 560 px) ese mismo botón es el menú:
     abre la lista de mundos y la cuenta en una hoja que ocupa el ancho de la pantalla. Esc o pulsar fuera la cierran. */
  function montarBarra(el) {
    const bar = el.closest('.topbar, .pt-top'); if (!bar) return;
    bar.classList.add('barra-comun');
    let w = bar.querySelector('.bm-wrap');
    if (!w) {
      w = document.createElement('div'); w.className = 'bm-wrap';
      // El botón dice en qué mundo se está (la marca ya no lo repite) y abre la lista para cambiar
      const aqui = P.MUNDOS.find((m) => m.k === P.mundoActual()), nAqui = aqui && aqui.k !== 'portal' ? (aqui.grupo ? (bar.querySelector('.brand span') || {}).textContent || aqui.n : aqui.n) : '';
      w.innerHTML = `<button class="bm-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="bmLista" aria-label="${nAqui ? 'Mundos · está en ' + escH(nAqui) : 'Mundos'}"><i class="bm-ico" aria-hidden="true"><b></b><b></b><b></b></i><span class="bm-t">${escH(nAqui || 'Mundos')}</span><span class="bm-tm">Menú</span><span class="bm-car" aria-hidden="true">▾</span></button>
        <nav class="bm-lista glass" id="bmLista" aria-label="Mundos de Atalaya" hidden></nav>`;
      const br = bar.querySelector('.brand'); if (br) br.after(w); else bar.prepend(w);
      const btn = w.querySelector('.bm-btn'), lista = w.querySelector('.bm-lista');
      const cerrar = (foco) => { if (lista.hidden) return; lista.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (foco) btn.focus(); };
      w._cerrar = cerrar;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // En el móvil el botón abre el menú de la cuenta, que lleva los mundos arriba
        if (esMovil()) { const acc = bar.querySelector('.acc-btn'); if (acc) { acc.click(); btn.setAttribute('aria-expanded', acc.getAttribute('aria-expanded')); const mm = bar.querySelector('.acc-menu'); if (mm && !mm.hidden && e.detail === 0) { const f = mm.querySelector('a, button'); if (f) f.focus(); } return; } }
        const abrir = lista.hidden;
        if (abrir) { lista.innerHTML = `<div class="bm-h">Ir a</div>${listaMundos('bm-it')}`; atarMundos(lista, () => cerrar()); }
        lista.hidden = !abrir; btn.setAttribute('aria-expanded', String(abrir));
        // Con el teclado (detail 0) el foco pasa al primer mundo
        if (abrir && e.detail === 0) { const f = lista.querySelector('a'); if (f) f.focus(); }
      });
      w.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const mm = bar.querySelector('.acc-menu');
          if (esMovil() && mm && !mm.hidden) { mm.hidden = true; const bb = bar.querySelector('.acc-btn'); if (bb) bb.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); return; }
          cerrar(true); return;
        }
        if (lista.hidden || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
        const its = Array.from(lista.querySelectorAll('a')), i = its.indexOf(document.activeElement);
        e.preventDefault(); its[(i + (e.key === 'ArrowDown' ? 1 : its.length - 1)) % its.length].focus();
      });
      w.addEventListener('focusout', (e) => { if (e.relatedTarget && !w.contains(e.relatedTarget)) cerrar(); });
      document.addEventListener('click', (e) => { if (!w.contains(e.target)) cerrar(); });
    }
  }

  P.mountAccount = function (el) {
    if (!el) return;
    const u = P.user; if (!u) { el.innerHTML = ''; return; }
    montarBarra(el);
    const acc = P.accessOf(u);
    // Todo lo que escribe la persona (nombre, correo, empresa) se escapa antes de pintarlo
    const esc = escH, planN = PLANES[u.plan] ? PLANES[u.plan].nombre : esc(u.plan);
    const ini = String(u.nombre || u.email || '').split(/\s+/).map((x) => x[0] || '').slice(0, 2).join('').toUpperCase();
    el.innerHTML = `<button class="acc-btn" aria-haspopup="true" aria-expanded="false" aria-label="Su cuenta" title="${esc(u.email)}"><span>${esc(ini)}</span></button>
      <div class="acc-menu glass" hidden>
        <nav class="acc-mundos" aria-label="Mundos de Atalaya"><div class="bm-h">Ir a</div>${listaMundos('bm-it')}</nav>
        <div class="acc-head"><b>${esc(u.nombre || u.email)}</b><small>${esc(u.email)}</small><small>Plan ${planN} · ${acc.motivo === 'prueba' ? `prueba: quedan ${acc.diasPrueba} días` : 'acceso activo'}</small>${P.mode === 'local' ? '<small class="demo">Modo demostración: datos solo en este navegador</small>' : ''}</div>
        <a href="manual.html">Manual de uso</a><a href="index.html">Página de Atalaya</a><button data-real title="Con datos reales ningún mundo usa los datos de ejemplo: lo que no se haya subido queda a cero y se pide">${P.modelo.activa() ? 'Empresa modelo · conectar o desconectar sus mundos' : P.modoReal() ? 'Datos reales: activados · ningún dato de ejemplo' : 'Datos de ejemplo permitidos · pasar a datos reales'}</button><button data-conex>Conexiones: IA, grabadora y calendario</button>${acc.motivo === 'prueba' ? '<button data-activar>Activar el acceso</button>' : ''}<button data-exp>Descargar todos mis datos</button><button data-imp>Importar una copia</button><button data-planes>Mi plan: ${planN} · cambiar</button>${P.mode === 'server' && u.stripeCliente ? '<button data-portalpago>Gestionar el pago: tarjeta y facturas</button>' : ''}<button data-pw>Cambiar contraseña</button>${P.mode === 'server' ? `<button data-2fa>${u.dosPasos ? 'Verificación en dos pasos: activada · desactivar' : 'Activar la verificación en dos pasos'}</button>` : ''}<button data-logout>Cerrar sesión</button>
        <form data-pwform hidden class="stack" style="padding:8px 12px 12px"><input class="input" type="password" name="actual" placeholder="Contraseña actual" autocomplete="current-password" required><input class="input" type="password" name="nueva" placeholder="Nueva (mín. 8 caracteres)" autocomplete="new-password" minlength="8" required><button class="btn solid" type="submit">Guardar</button><small data-pwmsg></small></form>
      </div>`;
    // Selector de empresa o sociedad (planes con varias empresas, o si ya hay más de una)
    const lista = P.empresas.lista(), act = P.empresas.activa(), lim = P.limiteEmpresas(u);
    const plan = PLANES[u.plan] || PLANES.profesional, grupo = !!plan.grupo;
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
          <div class="acc-head"><b>${grupo ? 'Sociedades del grupo' : 'Empresas cliente'}</b><small>${P.empresas.reales().length}${isFinite(lim) ? ' de ' + lim : ''}${grupo ? ' · plan a medida' : ''} · más la empresa modelo</small></div>
          <div class="emp-list">${lista.map((e, i) => `<div class="emp-it ${e.id === act.id ? 'on' : ''}"><button data-emp="${esc(e.id)}"><i style="background:${pal[i % pal.length]}"></i><span><b>${esc(e.nombre)}</b><small>${e.modelo ? 'Empresa modelo · datos ficticios' : e.rol === 'holding' ? 'Holding · sociedad dominante' : e.rol === 'filial' ? `Filial · ${esc(e.participacion != null ? e.participacion : 100)} %` : e.id === 'principal' ? 'Principal' : 'Cliente'}</small></span></button>${e.id !== 'principal' && !e.modelo ? `<button class="icon-btn" data-empdel="${esc(e.id)}" title="Borrar" aria-label="Borrar ${esc(e.nombre)}">×</button>` : ''}<button class="icon-btn" data-empren="${esc(e.id)}" title="Ficha de la empresa" aria-label="Ficha de ${esc(e.nombre)}">✎</button></div>`).join('')}</div>
          <a class="emp-group" href="portal.html#empresas">Mapa de ${grupo ? 'sociedades' : 'empresas'} y fichas →</a>
          ${P.empresas.reales().length < lim ? `<form class="emp-new stack" data-empnew><input class="input" name="nombre" placeholder="Nombre de la ${grupo ? 'sociedad' : 'empresa'}" required>${grupo ? '<div class="row"><select class="input" name="rol"><option value="filial">Filial</option><option value="holding">Holding</option></select><input class="input" name="participacion" type="number" min="0" max="100" value="100" title="% de participación" style="width:90px"></div>' : ''}<button class="btn solid" type="submit">Añadir ${grupo ? 'sociedad' : 'empresa'}</button><small class="muted" data-empmsg></small></form>` : `<p class="small muted" style="padding:8px 12px">Has llegado al máximo de tu plan.</p>`}
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
    const bmb = () => { const bar = el.closest('.barra-comun'); return bar && bar.querySelector('.bm-btn'); };
    const ponerMenu = (abierto) => { m.hidden = !abierto; b.setAttribute('aria-expanded', String(abierto)); const x = bmb(); if (x && esMovil()) x.setAttribute('aria-expanded', String(abierto)); };
    b.onclick = (e) => {
      e.stopPropagation(); const w = el.closest('.barra-comun'), bw = w && w.querySelector('.bm-wrap'); if (bw && bw._cerrar) bw._cerrar();
      ponerMenu(m.hidden);
      // Abierto con el teclado: el foco entra en la lista
      if (!m.hidden && e.isTrusted && e.detail === 0) { const f = m.querySelector('a, button'); if (f) f.focus(); }
    };
    atarMundos(m, () => ponerMenu(false));
    if (!el._cerrarMenu) {
      // Una sola vez por cabecera, aunque la cuenta se vuelva a pintar
      el._cerrarMenu = true;
      document.addEventListener('click', (e) => { const mm = el.querySelector('.acc-menu'); if (mm && !el.contains(e.target)) { mm.hidden = true; const bb = el.querySelector('.acc-btn'); if (bb) bb.setAttribute('aria-expanded', 'false'); const x = bmb(); if (x && esMovil()) x.setAttribute('aria-expanded', 'false'); } });
      el.addEventListener('keydown', (e) => {
        const mm = el.querySelector('.acc-menu'); if (e.key !== 'Escape' || !mm || mm.hidden) return;
        mm.hidden = true; const bb = el.querySelector('.acc-btn'); if (bb) bb.setAttribute('aria-expanded', 'false');
        const x = bmb(); if (x && esMovil()) { x.setAttribute('aria-expanded', 'false'); x.focus(); } else if (bb) bb.focus();
      });
    }
    el.querySelector('[data-logout]').onclick = P.logout;
    el.querySelector('[data-planes]').onclick = () => { m.hidden = true; P.panelPlanes(); };
    el.querySelector('[data-exp]').onclick = () => { m.hidden = true; P.descargarDatos(); };
    el.querySelector('[data-imp]').onclick = () => { m.hidden = true; P.importarDatos(); };
    const ab = el.querySelector('[data-activar]'); if (ab) ab.onclick = () => { m.hidden = true; P.activarAhora(); };
    P.avisoPrueba();
    el.querySelector('[data-real]').onclick = async (ev) => {
      ev.stopPropagation(); const b = ev.currentTarget, on = P.modoReal();
      // La empresa modelo se conecta y desconecta desde su ficha
      if (P.modelo.activa()) { m.hidden = true; P.fichaModelo(P.empresas.activa()); return; }
      if (!b.dataset.ok) { b.dataset.ok = '1'; b.textContent = on ? 'Pulse otra vez para volver a permitir datos ficticios (lo real se conserva)' : 'Pulse otra vez para pasar a datos reales (los mundos sin trabajar se ponen a cero)'; return; }
      m.hidden = true; b.disabled = true;
      if (on) await P.desactivarModoReal(); else await P.activarModoReal('cuenta');
      location.reload();
    };
    el.querySelector('[data-conex]').onclick = () => { m.hidden = true; const go = () => A.conexiones.abrir('claude'); if (A.conexiones) return go(); const sc = document.createElement('script'); sc.src = 'js/conexiones.js'; sc.onload = go; document.head.appendChild(sc); };
    const pf = el.querySelector('[data-pwform]');
    el.querySelector('[data-pw]').onclick = (e) => { e.stopPropagation(); pf.hidden = !pf.hidden; };
    const pp = el.querySelector('[data-portalpago]'); if (pp) pp.onclick = async () => { pp.disabled = true; try { location.href = await P.portalPago(); } catch (x) { pp.disabled = false; P.toast(x.message, 6000); } };
    const d2 = el.querySelector('[data-2fa]'); if (d2) d2.onclick = () => { m.hidden = true; P.dosPasos(() => P.mountAccount(el)); };
    pf.onsubmit = async (e) => {
      e.preventDefault(); const msg = pf.querySelector('[data-pwmsg]');
      try { await P.changePassword(pf.actual.value, pf.nueva.value); msg.textContent = 'Contraseña cambiada.'; msg.style.color = 'var(--go)'; pf.reset(); } catch (x) { msg.textContent = x.message; msg.style.color = 'var(--stop)'; }
    };
  };

  /* ---------- Fondo animado compartido ----------
     Con una ventana encima (o la pestaña oculta) los fondos animados no se redibujan: bajo los paneles con desenfoque
     cada fotograma obliga a recalcularlo y el contenido de la ventana tarda en pintarse. */
  A.pausaFondo = () => document.hidden || !!document.querySelector('.modal-back, .ef-back, .ruta-map:not([hidden]), .rp-back, .ml-panel');
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
    else { const loop = (t) => { if (!A.pausaFondo()) draw(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  };
})();
