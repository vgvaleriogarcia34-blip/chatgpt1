/* Atalaya 360° · Cálculo de los mundos sin abrir su página
   La nota de cada mundo sale de sus datos guardados, se esté en la página que se esté: así todas las páginas dan la misma
   nota desde la primera carga. Los mundos con motor propio (simulador y sistema estratégico) cargan solo los scripts de su
   motor, sin pantalla, cuando hace falta calcular; el resultado se guarda en la clave «nota» con la firma de los datos con
   que se calculó y la fecha. Mientras los datos no cambian (misma firma), ninguna página vuelve a cargar el motor.
   A.calculo.firma(x) · cargar('simulador' | 'estrategia') · estadoSim(raw) · estrategia(sim, est, ctx, fn) */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const C = (A.calculo = A.calculo || {});
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

  // Firma de unos datos: cambia en cuanto cambia cualquier cifra (la misma función que el libro corporativo)
  C.hash = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + '.' + t.length.toString(36); };
  C.firma = (x) => C.hash(JSON.stringify(x == null ? null : x));

  /* ---------- Motores: los scripts imprescindibles de cada mundo (sin su pantalla) ---------- */
  const MOTOR = {
    simulador: ['js/sectors.js', 'js/engine.js'],
    estrategia: ['js/sectors.js', 'js/engine.js', 'js/valoracion-core.js', 'js/content.js', 'js/docs.js', 'js/financials.js', 'js/charts.js', 'js/reloj.js',
      'js/strategy/core.js', 'js/strategy/finance.js', 'js/strategy/commercial.js', 'js/strategy/operations.js', 'js/strategy/orgchart.js', 'js/strategy/plan.js',
      'js/strategy/market.js', 'js/strategy/diagnostico.js', 'js/strategy/consultor-data.js', 'js/strategy/origen.js', 'js/strategy/consultor.js']
  };
  const yaEsta = (src) => Array.from(document.scripts).some((s) => (s.getAttribute('src') || '').replace(/\?.*$/, '') === src);
  const pedidos = {};
  C.script = (src) => pedidos[src] || (pedidos[src] = yaEsta(src) ? Promise.resolve() : new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = src; s.async = false; s.dataset.motor = '1';
    s.onload = ok; s.onerror = () => { delete pedidos[src]; ko(new Error('No se pudo cargar ' + src)); };
    (document.head || document.documentElement).appendChild(s);
  }));
  const motores = {};
  C.cargar = (mundo) => motores[mundo] || (motores[mundo] = (async () => { for (const src of MOTOR[mundo] || []) await C.script(src); })().catch((e) => { delete motores[mundo]; throw e; }));

  /* ---------- Simulador: el estado tal como lo abre su página (app.js, loadState) ---------- */
  const deepMerge = (base, over) => {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach((k) => { out[k] = base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]) ? deepMerge(base[k], over[k]) : over[k]; });
    return out;
  };
  C.estadoSim = (s) => (s && s.empresa && A.SECTORS && A.SECTORS[s.sector] ? deepMerge(A.defaultState(), clone(s)) : A.defaultState());

  /* ---------- Sistema estratégico sin su página ----------
     Monta el estado como lo hace S.start (simulación y módulos, con los valores por defecto y, con datos reales, sin los
     datos de ejemplo) pero sin pintar ni guardar nada, y ejecuta fn(S). Un cálculo cada vez: el estado es uno solo.
     ctx: { ficha, real (modo datos reales), modelo (empresa modelo) } */
  let cola = Promise.resolve();
  C.estrategia = (sim, est, ctx, fn) => {
    const tarea = cola.then(async () => {
      await C.cargar('estrategia');
      const S = A.strat; if (!S || !S.modules) throw new Error('Sin motor del sistema estratégico');
      if (S.start && S.__vivo) return fn(S); // en su página manda el estado vivo
      S.sinPagina = true;
      ctx = ctx || {}; const ficha = ctx.ficha || {};
      let s = sim && sim.empresa ? clone(sim) : null;
      if (!s) { s = A.defaultState(); if (ficha.nombre) s.empresaNombre = ficha.nombre; }
      S.sim = Object.assign(A.defaultState(), s);
      if (ficha.nombre && ficha.nombre !== 'Mi empresa') S.sim.empresaNombre = ficha.nombre;
      S.state = Object.assign({}, A.clone(S.defaults), clone(est) || {});
      Object.keys(S.defaults).forEach((k) => { if (S.state[k] === undefined) S.state[k] = A.clone(S.defaults[k]); });
      const real0 = S.real, cifras0 = S.cifras, save0 = S.save, saveSim0 = S.saveSim, ficha0 = S._ficha;
      // Dentro de un cálculo con solo datos propios (S._propios) se calcula como con datos reales
      S.real = () => !!(S._propios || (ctx.real && !ctx.modelo));
      // La ficha de la empresa que se calcula (su sector decide qué áreas se le exigen), no la de la empresa activa
      S._ficha = ficha;
      S.cifras = () => (A.cifras ? A.cifras.desdeSim(S.sim, ficha) : null);
      S.save = () => {}; S.saveSim = () => {};
      try {
        if (S.real()) S.aDatosReales();
        return fn(S);
      } finally { S.real = real0; S.cifras = cifras0; S.save = save0; S.saveSim = saveSim0; S._ficha = ficha0; }
    });
    cola = tarea.catch(() => {});
    return tarea;
  };
})();
