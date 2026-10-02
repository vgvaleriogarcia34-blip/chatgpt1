/* Atalaya · Controlador del simulador */
(function () {
  const A = window.Atalaya;
  const F = A.fmt, C = A.charts;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  // Cada empresa de la cuenta tiene su propio almacenamiento (la principal, el de siempre)
  const PK = (k) => (A.platform && A.platform.k ? A.platform.k(k) : k);
  const STORE = PK('atalaya.v1'), SNAP = PK('atalaya.snapshots.v1');
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const P = A.platform;

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ } }
  };
  const deepMerge = (base, over) => {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach((k) => { out[k] = base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]) ? deepMerge(base[k], over[k]) : over[k]; });
    return out;
  };
  const loadState = (s) => (s && s.empresa && A.SECTORS[s.sector] ? deepMerge(A.defaultState(), s) : A.defaultState());

  let state = loadState(store.get(STORE));
  let ctx = null;
  const hidden = {};
  const view = { mode: 'surface', ax: 'incVentas', ay: 'pctFin', metric: 'cajaMin', cash: 'liquidez' };
  const stName = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  const stCls = (s) => 'st-' + s;
  const vMap = { go: 'ok', warn: 'warn', stop: 'stop' };

  /* ---------------- Campos ---------------- */
  const pct = { min: 0, max: 100, step: 0.5, u: '%' };
  const FIELDS = {
    'f-pyg': [
      { p: 'empresa.ventas', l: 'Ventas anuales', min: 50000, max: (s) => Math.max(10000000, s.empresa.ventas * 2.5), step: 10000, u: '€' },
      { p: 'empresa.margen', l: 'Margen bruto', ...pct },
      { p: 'empresa.personal', l: 'Coste de personal', min: 0, max: (s) => Math.max(1000000, s.empresa.ventas), step: 1000, u: '€/año' },
      { p: 'empresa.fijos', l: 'Otros gastos fijos', min: 0, max: (s) => Math.max(500000, s.empresa.ventas * 0.6), step: 1000, u: '€/año' },
      { p: 'empresa.plantilla', l: 'Plantilla actual', min: 1, max: 300, step: 1, u: 'pers.' },
      { p: 'empresa.crecimiento', l: 'Crecimiento orgánico', min: -10, max: 30, step: 0.5, u: '%/año' },
      { p: 'empresa.impuesto', l: 'Impuesto de sociedades', min: 0, max: 35, step: 1, u: '%' }
    ],
    'f-balance': [
      { p: 'empresa.caja', l: 'Caja disponible', min: 0, max: (s) => Math.max(2000000, s.empresa.caja * 3), step: 5000, u: '€' },
      { p: 'empresa.deudaViva', l: 'Deuda financiera viva', min: 0, max: (s) => Math.max(3000000, s.empresa.deudaViva * 3), step: 5000, u: '€' },
      { p: 'empresa.cuotaDeuda', l: 'Cuota mensual actual', min: 0, max: (s) => Math.max(100000, s.empresa.cuotaDeuda * 3), step: 500, u: '€/mes' },
      { p: 'empresa.fondosPropios', l: 'Fondos propios', min: 0, max: (s) => Math.max(5000000, s.empresa.fondosPropios * 3), step: 10000, u: '€' },
      { p: 'empresa.dso', l: 'Días de cobro', min: 0, max: 180, step: 1, u: 'días' },
      { p: 'empresa.dio', l: 'Días de stock', min: 0, max: 180, step: 1, u: 'días' },
      { p: 'empresa.dpo', l: 'Días de pago', min: 0, max: 180, step: 1, u: 'días' }
    ],
    'f-poliza': [
      { p: 'empresa.polizaLimite', l: 'Límite de la póliza', min: 0, max: (s) => Math.max(1000000, (s.empresa.polizaLimite || 0) * 3), step: 5000, u: '€' },
      { p: 'empresa.polizaDispuesta', l: 'Ya dispuesto hoy', min: 0, max: (s) => Math.max(1000000, (s.empresa.polizaLimite || 0) * 3), step: 5000, u: '€' },
      { p: 'empresa.polizaTipo', l: 'Tipo de interés', min: 0, max: 15, step: 0.1, u: '%' },
      { p: 'empresa.polizaComision', l: 'Comisión de no disposición', min: 0, max: 3, step: 0.05, u: '%/año' }
    ],
    'f-fin': [
      { p: 'inversion.importe', l: 'Importe de la inversión', min: 10000, max: (s) => Math.max(5000000, s.inversion.importe * 2.5), step: 10000, u: '€' },
      { p: 'inversion.pctFin', l: 'Parte financiada', min: 0, max: 100, step: 1, u: '%' },
      { p: 'inversion.aportacion', l: 'Aportación de socios', min: 0, max: (s) => Math.max(1000000, s.inversion.importe), step: 10000, u: '€' },
      { p: 'inversion.tipo', l: 'Tipo de interés', min: 0, max: 15, step: 0.1, u: '%' },
      { p: 'inversion.plazo', l: 'Plazo del préstamo', min: 1, max: 15, step: 0.5, u: 'años' },
      { p: 'inversion.carencia', l: 'Carencia', min: 0, max: 36, step: 1, u: 'meses' },
      { p: 'inversion.mesInicio', l: 'Mes de la inversión', min: 1, max: 24, step: 1, u: 'mes' }
    ],
    'f-act': [
      { p: 'inversion.incVentas', l: 'Venta nueva en crucero', min: 0, max: 200, step: 1, u: '% s/ventas' },
      { p: 'inversion.margenNuevo', l: 'Margen bruto nuevo', ...pct },
      { p: 'inversion.rampa', l: 'Meses de rampa', min: 1, max: 36, step: 1, u: 'meses' },
      { p: 'inversion.fijosNuevos', l: 'Fijos nuevos', min: 0, max: (s) => Math.max(600000, s.inversion.fijosNuevos * 3), step: 1000, u: '€/año' },
      { p: 'inversion.vidaUtil', l: 'Vida útil del activo', min: 2, max: 30, step: 1, u: 'años' }
    ],
    'f-org': [
      { p: 'inversion.contrataciones', l: 'Contrataciones', min: 0, max: 150, step: 1, u: 'pers.' },
      { p: 'inversion.salario', l: 'Coste por persona', min: 12000, max: 150000, step: 500, u: '€/año' },
      { p: 'inversion.anticipo', l: 'Anticipo de contratación', min: -6, max: 12, step: 1, u: 'meses' }
    ],
    'f-human': A.HUMAN_VARS,
    'f-custom': [
      { p: 'custom.ventasF', l: '¿Qué parte de la venta nueva llega?', min: 0.2, max: 1.6, step: 0.05, u: '× lo previsto', d: '1 = lo que has previsto; 0,7 = el 70 %; 1,2 = un 20 % más.' },
      { p: 'custom.retraso', l: '¿Cuántos meses tarde arranca?', min: -3, max: 18, step: 1, u: 'meses', d: 'Retraso de la puesta en marcha y de la rampa comercial.' },
      { p: 'custom.margenDelta', l: '¿Cuánto cambia el margen de lo nuevo?', min: -12, max: 6, step: 0.5, u: 'puntos', d: 'Negativo si suben las materias primas o hay que bajar precio.' },
      { p: 'custom.sobrecoste', l: '¿Cuánto más cuesta la inversión?', min: -10, max: 60, step: 1, u: '%', d: 'Desvío del presupuesto de la obra o del equipo.' },
      { p: 'custom.dsoDelta', l: '¿Cuántos días más tardan en pagarte?', min: -40, max: 90, step: 1, u: 'días', d: 'Solo en la venta nueva: los clientes nuevos suelen pagar peor.' },
      { p: 'custom.tipoDelta', l: '¿Cuánto suben los tipos de interés?', min: -3, max: 6, step: 0.1, u: 'puntos', d: 'Sobre el tipo de los préstamos nuevos.' }
    ]
  };
  const getPath = (p) => p.split('.').reduce((o, k) => (o ? o[k] : undefined), state);
  const setPath = (p, v) => { const [a, b] = p.split('.'); state[a][b] = v; };
  const resolve = (v) => (typeof v === 'function' ? v(state) : v);
  const nfField = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
  const fmtField = (f, v) => nfField.format(f.step >= 1 ? Math.round(v) : Math.round(v * 100) / 100);
  const niceCeil = (v) => { const m = Math.pow(10, Math.floor(Math.log10(Math.max(1, v)))); return Math.ceil(v / m) * m; };
  const bounds = {}; // límites fijos de cada barra: no cambian mientras se arrastra
  const parseInput = (v) => parseFloat(String(v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));

  function buildFields() {
    Object.keys(FIELDS).forEach((gid) => {
      const host = document.getElementById(gid);
      if (!host) return;
      host.innerHTML = FIELDS[gid].map((f) => {
        const id = (gid + '_' + f.p).replace(/\./g, '_');
        return `<div class="field" data-p="${f.p}"><div class="top"><label for="${id}" data-info="${f.p}">${f.l}</label><span class="val"><input class="fnum" type="text" inputmode="decimal" id="${id}" aria-label="${f.l}"><span class="u">${f.u}</span></span></div><input type="range" id="${id}_r" step="${f.step}" aria-label="${f.l} (deslizador)">${f.d ? `<p class="fdesc">${f.d}</p>` : ''}</div>`;
      }).join('');
      FIELDS[gid].forEach((f) => {
        const id = (gid + '_' + f.p).replace(/\./g, '_');
        const num = document.getElementById(id), rng = document.getElementById(id + '_r');
        bounds[id] = { min: Math.min(resolve(f.min), getPath(f.p) || 0), max: Math.max(resolve(f.max), getPath(f.p) || 0) };
        const commit = (v, src) => {
          if (!isFinite(v)) return;
          setPath(f.p, v); state.ejemplo = false;
          syncFields(src);
          schedule();
        };
        num.addEventListener('change', () => {
          const v = parseInput(num.value);
          if (!isFinite(v)) { num.value = fmtField(f, getPath(f.p)); return; }
          const b = bounds[id];
          if (v > b.max) b.max = niceCeil(v * 1.5);
          if (v < b.min) b.min = v;
          commit(v, num);
        });
        rng.addEventListener('input', () => commit(parseFloat(rng.value), rng));
        // Al soltar la barra en el tope, se amplía el recorrido para poder seguir subiendo
        rng.addEventListener('change', () => {
          const b = bounds[id], v = parseFloat(rng.value);
          if (b.max > 100 && v >= b.max - (b.max - b.min) * 0.02) { b.max = niceCeil(b.max * 1.8); syncFields(); }
        });
      });
    });
  }
  function syncFields(except) {
    Object.keys(FIELDS).forEach((gid) => FIELDS[gid].forEach((f) => {
      const id = (gid + '_' + f.p).replace(/\./g, '_');
      const num = document.getElementById(id), rng = document.getElementById(id + '_r');
      if (!num) return;
      const v = getPath(f.p);
      const b = bounds[id];
      if (v > b.max) b.max = niceCeil(v * 1.5);
      if (v < b.min) b.min = v;
      if (rng !== except) { rng.min = b.min; rng.max = b.max; rng.value = v; }
      if (num !== except) num.value = fmtField(f, v);
      rng.style.setProperty('--p', ((v - b.min) / (b.max - b.min || 1)) * 100 + '%');
    }));
    $('#empresaNombre').value = state.empresaNombre;
    $('#proyecto').value = state.proyecto;
    const cp = $('#contarPoliza'); if (cp) cp.setAttribute('aria-checked', state.meta.contarPoliza !== false);
  }
  /* Lleva al usuario a un dato concreto y lo resalta */
  function goToField(path) {
    closeModal(); card.hidden = true;
    const el = $$(`.field[data-p="${path}"]`).find((x) => x.offsetParent !== null) || $(`.field[data-p="${path}"]`);
    if (!el) { toast('Ese dato se ajusta en su sección'); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    setTimeout(() => { const i = el.querySelector('.fnum'); if (i) i.focus({ preventScroll: true }); }, 500);
  }
  const fmtVar = (p) => { const f = Object.values(FIELDS).flat().find((x) => x.p === p); const v = getPath(p); return f ? `${fmtField(f, v)} ${f.u}` : nfField.format(v); };
  const varChip = (p, ind) => `<button class="vchip${ind ? ' ind' : ''}" data-go="${p}">${esc(A.fieldLabel(p))}${isFinite(getPath(p)) ? ` <b>${fmtVar(p)}</b>` : ''}</button>`;
  document.addEventListener('click', (e) => { const b = e.target.closest('.vchip[data-go]'); if (b) { e.preventDefault(); goToField(b.dataset.go); } });

  /* ---------------- Fichas informativas y modal ---------------- */
  const INFO = {
    veredicto: { t: 'Veredicto de movimiento', d: 'Síntesis de los diez semáforos del escenario activo. Rojo en liquidez o tres rojos obligan a rediseñar; un rojo o cuatro ámbar exigen condiciones previas.', v: (c) => c.active.verdict.titulo },
    dimension: { t: 'Dimensión de la inversión', d: 'Cuánto pesa la inversión frente a la empresa actual. Por debajo del 15 % de las ventas es táctica; entre el 40 % y el 80 %, estratégica; por encima, transforma la empresa.', f: 'inversión ÷ ventas · inversión ÷ EBITDA', v: (c) => `${c.active.dim.clase} · ${F.x(c.active.dim.sobreEbitda)} EBITDA` },
    sobreVentas: { t: 'Inversión sobre ventas', d: 'Mide el salto de escala. Una inversión que supera el 40 % de lo que facturas cambia la naturaleza del negocio.', f: 'inversión total ÷ ventas anuales', v: (c) => F.pct(c.active.dim.sobreVentas * 100) },
    sobreEbitda: { t: 'Años de EBITDA', d: 'Cuántos años de beneficio operativo actual cuesta la inversión. Por encima de 4 años, la empresa no puede pagarla desde su rentabilidad sin financiación larga.', f: 'inversión total ÷ EBITDA actual', v: (c) => F.x(c.active.dim.sobreEbitda) },
    sobreFondos: { t: 'Sobre fondos propios', d: 'Qué parte del patrimonio se pone en juego. Por encima del 100 % la empresa apuesta más de lo que vale contablemente.', f: 'inversión total ÷ fondos propios', v: (c) => F.pct(c.active.dim.sobreFondos * 100) },
    sobreCaja: { t: 'Veces la caja', d: 'Cuántas veces la caja actual representa la inversión.', f: 'inversión total ÷ caja', v: (c) => F.x(c.active.dim.sobreCaja) },
    financiado: { t: 'Préstamo nuevo', d: 'Parte de la inversión que se financia con deuda en la estructura elegida.', f: 'inversión × % financiado', v: (c) => F.eur(c.active.loan) },
    cuota: { t: 'Cuota mensual nueva', d: 'Pago mensual del préstamo nuevo (capital más intereses) una vez acabada la carencia. Durante la carencia solo se pagan intereses.', f: 'sistema francés · plazo − carencia', v: (c) => `${F.eur(c.active.cuotaNueva)} · carencia ${F.eur(c.active.cuotaCarencia)}` },
    cajaMin: { t: 'Liquidez mínima', d: 'El punto más bajo de dinero disponible en los próximos 60 meses: caja en banco más la parte libre de la póliza (si eliges contarla). Es la prueba de fuego: si es negativa, la inversión rompe la tesorería aunque sea rentable.', f: 'caja + póliza libre, mes a mes', v: (c) => `${F.eur(c.active.cajaRef)} en el mes ${c.active.mesCajaRef}` },
    payback: { t: 'Recuperación', d: 'Meses hasta que el flujo operativo incremental (después de impuestos y circulante) devuelve la inversión. La recuperación de caja mide cuándo la propiedad vuelve a tener la caja que habría tenido sin invertir.', f: 'Σ flujo incremental ≥ inversión', v: (c) => `${F.months(c.active.payback)} · caja ${F.months(c.active.paybackCaja)}` },
    dscr: { t: 'Cobertura de la deuda (DSCR)', d: 'Cuántas veces el flujo operativo cubre el servicio total de la deuda en el peor año. La banca suele exigir 1,2× o más.', f: '(EBITDA − impuestos) ÷ (capital + intereses)', v: (c) => F.x(c.active.dscrMin) },
    salarial: { t: 'Peso salarial', d: 'Coste de personal sobre ventas en el año de crucero.', f: 'personal ÷ ventas', v: (c) => `${F.pct(c.active.tamano.antes.pesoSalarial)} → ${F.pct(c.active.tamano.despues.pesoSalarial)}` },
    humano: { t: 'Sistema operativo humano', d: 'Preparación de la organización para el nuevo tamaño, en nueve dimensiones.', v: (c) => `${Math.round(c.active.humano.score)}/100` }
  };
  // Las variables del simulador también tienen ficha: descripción del campo o, si no, la del diccionario
  Object.values(FIELDS).flat().forEach((f) => { if (!INFO[f.p]) INFO[f.p] = { t: f.l, d: f.d || '' }; });
  const card = $('#floatCard');
  let openedAt = 0;
  function glossFor(path) { return A.GLOSSARY.find((g) => g.dir.indexOf(path) >= 0); }
  function openCard(key, anchor, extra) {
    const info = INFO[key] || extra;
    if (!info) return;
    const val = info.v && ctx ? info.v(ctx) : null;
    const g = key && key.includes('.') ? glossFor(key) : null;
    const dsc = info.d || (g ? g.d : '');
    card.innerHTML = `<button class="icon-btn close" aria-label="Cerrar">×</button><h5>${info.t}</h5>${val ? `<div class="fv">${val}</div>` : ''}<p>${dsc}</p>${info.f ? `<div class="formula">${info.f}</div>` : ''}${g ? `<p class="small">En el diccionario: <a href="#diccionario" data-gloss="${esc(g.t)}">${esc(g.t)}</a></p>` : ''}${info.html || ''}`;
    card.hidden = false;
    openedAt = Date.now();
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.clientX, right: anchor.clientX, top: anchor.clientY, bottom: anchor.clientY };
    const w = card.offsetWidth, h = card.offsetHeight;
    let left = r.left, top = r.bottom + 10;
    if (left + w > innerWidth - 12) left = innerWidth - w - 12;
    if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 10);
    card.style.left = Math.max(12, left) + 'px'; card.style.top = top + 'px';
    card.querySelector('.close').onclick = () => { card.hidden = true; };
    const gl = card.querySelector('[data-gloss]'); if (gl) gl.onclick = (e) => { e.preventDefault(); card.hidden = true; showGloss(gl.dataset.gloss); };
    return card;
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-info]');
    if (t) { e.preventDefault(); openCard(t.dataset.info, t); return; }
    if (Date.now() - openedAt < 80) return;
    if (!card.hidden && !card.contains(e.target) && !e.target.closest('canvas')) card.hidden = true;
  });
  const modal = $('#modal'), modalBody = $('#modalBody');
  function openModal(html) {
    modalBody.innerHTML = `<button class="icon-btn close" aria-label="Cerrar">×</button>${html}`;
    modal.hidden = false; document.body.style.overflow = 'hidden';
    modalBody.querySelector('.close').onclick = closeModal;
    modalBody.scrollTop = 0;
    return modalBody;
  }
  function closeModal() { if (!modal.hidden) { modal.hidden = true; document.body.style.overflow = ''; } }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { card.hidden = true; $('#toolbox').hidden = true; closeModal(); closeReport(); } });

  /* ---------------- Cálculo ---------------- */
  let tQuick = null, tHeavy = null, gen = 0, saveT = null;
  function schedule() {
    clearTimeout(tQuick); clearTimeout(tHeavy);
    gen++;
    const g = gen;
    normalizeInv();
    tQuick = setTimeout(computeQuick, 40);
    tHeavy = setTimeout(() => computeHeavy(g), 450);
    store.set(STORE, state);
    clearTimeout(saveT); saveT = setTimeout(() => P && P.saveData('simulador', state), 1500);
  }
  function computeQuick() {
    const all = A.SCENARIOS.map((sc, i) => ({ key: sc.key, nombre: sc.nombre, desc: sc.desc, i, r: A.analyze(state, A.scenarioMods(state, sc.key)) }));
    const active = all.find((x) => x.key === state.escenario).r;
    ctx = Object.assign(ctx || {}, { all, active, mods: A.scenarioMods(state, state.escenario) });
    renderTop(); renderHero(); renderDimension(); renderLineas(); renderEquilibrio(); renderScenarios(); renderLights(); renderSize(); renderHuman();
    if (view.mode === 'traj') render3D();
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));
  // El trabajo pesado se reparte en pasos cortos para que la página nunca se bloquee mientras mueves una barra
  async function computeHeavy(g) {
    if (!ctx) computeQuick();
    const mods = ctx.mods;
    ctx.sens = A.sensitivity(state, mods, 'cajaRef'); ctx.risks = A.risks(state, ctx.active, ctx.sens); renderRisks();
    await tick(); if (g !== gen) return;
    ctx.structs = A.compareStructures(state, mods); renderStructs();
    await tick(); if (g !== gen) return;
    ctx.plan = A.correctionPlan(state, mods); renderPlan();
    await tick(); if (g !== gen) return;
    renderOpciones();
    await tick(); if (g !== gen) return;
    if (view.mode === 'surface') {
      const sf = await surfaceAsync(state, mods, view.ax, view.ay, view.metric, 20, g);
      if (!sf || g !== gen) return;
      ctx.surface = sf; renderTerrainRead(); if (has3D) A.scene.surface(sf, state);
    }
    renderGlossVals();
  }
  async function surfaceAsync(st, mods, ax, ay, metric, N, g) {
    const [x0, x1] = A.axisRange(st, ax), [y0, y1] = A.axisRange(st, ay);
    const M = A.METRICS[metric], X = A.AXES[ax], Y = A.AXES[ay];
    const grid = []; let mn = Infinity, mx = -Infinity;
    for (let j = 0; j < N; j++) {
      const row = [];
      for (let i = 0; i < N; i++) {
        const s = A.clone(st);
        const xv = x0 + (x1 - x0) * (i / (N - 1)), yv = y0 + (y1 - y0) * (j / (N - 1));
        s[X.path[0]][X.path[1]] = xv; s[Y.path[0]][Y.path[1]] = yv;
        const r = A.analyze(s, mods); const v = M.f(r);
        mn = Math.min(mn, v); mx = Math.max(mx, v);
        row.push({ x: xv, y: yv, v, estado: r.verdict.key, cajaMin: r.cajaRef, payback: r.payback, dscr: r.dscrMin });
      }
      grid.push(row);
      if (j % 4 === 3) { await tick(); if (g !== gen) return null; }
    }
    return { grid, N, x0, x1, y0, y1, mn, mx, ax, ay, metric, cx: st[X.path[0]][X.path[1]], cy: st[Y.path[0]][Y.path[1]] };
  }

  /* ---------------- Barra superior ---------------- */
  function renderTop() {
    const seg = $('#scenarioSeg');
    if (!seg.children.length) {
      seg.innerHTML = A.SCENARIOS.map((s, i) => `<button data-k="${s.key}" title="${s.desc}" aria-label="Escenario ${s.nombre}"><i style="background:var(${A.SERIES[i]})"></i><span class="lbl">${s.nombre}</span></button>`).join('');
      seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setScenario(b.dataset.k); });
    }
    $$('button', seg).forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === state.escenario));
    const v = ctx.active.verdict;
    $('#verdictPill').className = 'verdict-pill v-' + v.key;
    $('#verdictTxt').textContent = v.titulo;
  }
  function setScenario(k) { state.escenario = k; schedule(); }

  /* ---------------- Puente de mando ---------------- */
  const fmtMeses = (m) => (!isFinite(m) ? '—' : m < 0 ? 'negativo' : (Math.round(m * 10) / 10).toString().replace('.', ',') + ' meses');
  function renderHero() {
    const r = ctx.active, v = r.verdict, sc = A.SCENARIOS.find((s) => s.key === state.escenario);
    renderIdCard();
    $('#verdictCard').innerHTML = `<div class="row"><h4>Veredicto · escenario ${sc.nombre.toLowerCase()}</h4><span class="spacer"></span><span class="state ${stCls(vMap[v.key])}">${stName[vMap[v.key]]}</span></div>
      <div class="big">${v.titulo}</div><p class="muted small" style="margin:0">${v.texto}</p>
      <div class="bar" aria-label="Semáforos">${r.lights.map((l) => `<span data-light="${l.key}" style="background:${A.stateColor(l.estado)};opacity:${l.estado === 'ok' ? 0.55 : 0.95}" title="${l.nombre}: ${l.valor}"></span>`).join('')}</div>
      <div class="row small muted" style="margin-top:8px;justify-content:space-between"><span>${r.lights.filter((l) => l.estado === 'ok').length} verdes · ${r.lights.filter((l) => l.estado === 'warn').length} ámbar · ${r.lights.filter((l) => l.estado === 'stop').length} rojos</span><a href="#riesgos" style="color:var(--gold)">Ver semáforos</a></div>`;
    $$('#verdictCard [data-light]').forEach((s) => s.addEventListener('click', () => openLight(s.dataset.light)));
    const lt = Object.fromEntries(r.lights.map((l) => [l.key, l.estado]));
    const tiles = [
      { k: 'Dimensión', info: 'dimension', v: r.dim.clase, d: `${F.x(r.dim.sobreEbitda)} EBITDA · ${F.pct(r.dim.sobreVentas * 100)} ventas`, st: lt.dimension },
      { k: 'Cuota mensual', info: 'cuota', v: F.eur(r.cuotaNueva), d: `${F.pct(r.cuotaSobreEbitda)} del EBITDA mensual con la deuda actual`, st: lt.cobertura },
      { k: r.contarPoliza ? 'Liquidez mínima' : 'Caja mínima', info: 'cajaMin', v: F.eur(r.cajaRef), d: `mes ${r.mesCajaRef} · colchón mínimo ${fmtMeses(r.colMin)}`, st: lt.liquidez, spark: C.spark(r.contarPoliza ? r.w.liquidez : r.w.cash, r.cajaRef < 0 ? css('--stop') : css('--gold'), true) },
      { k: 'Recuperación', info: 'payback', v: F.months(r.payback), d: `caja de la propiedad: ${F.months(r.paybackCaja)}`, st: lt.retorno },
      { k: 'Cobertura deuda', info: 'dscr', v: F.x(r.dscrMin), d: `deuda neta ${F.x(r.deudaEbitda)} EBITDA`, st: lt.cobertura },
      { k: 'Equipo', info: 'humano', v: Math.round(r.humano.score) + '/100', d: `${r.humano.nuevas} incorporaciones · ${r.humano.gapMandos} mandos por cubrir`, st: lt.humano }
    ];
    $('#kpis').innerHTML = tiles.map((t) => `<button class="kpi" data-info="${t.info}"><div class="k"><span>${t.k}</span><span class="state ${stCls(t.st)}">${stName[t.st]}</span></div><div class="v">${t.v}</div><div class="d">${t.d}</div>${t.spark || ''}</button>`).join('');
  }

  function renderDimension() {
    const r = ctx.active, d = r.dim;
    const ring = (key, value, max, label, lbl, st) => `<div class="ring" data-info="${key}">${C.ring(value, max, A.stateColor(st), label)}<div class="lbl">${lbl}</div></div>`;
    const s1 = d.sobreVentas < 0.4 ? 'ok' : d.sobreVentas < 0.8 ? 'warn' : 'stop';
    const s2 = d.sobreEbitda < 4 ? 'ok' : d.sobreEbitda < 7 ? 'warn' : 'stop';
    const s3 = d.sobreFondos < 0.6 ? 'ok' : d.sobreFondos < 1 ? 'warn' : 'stop';
    const s4 = d.sobreCaja < 1.5 ? 'ok' : d.sobreCaja < 3 ? 'warn' : 'stop';
    $('#dimension').innerHTML =
      ring('sobreVentas', d.sobreVentas, 1, F.pct(d.sobreVentas * 100), 'Sobre ventas', s1) +
      ring('sobreEbitda', d.sobreEbitda, 8, F.x(d.sobreEbitda), 'Años de EBITDA', s2) +
      ring('sobreFondos', d.sobreFondos, 1.5, F.pct(d.sobreFondos * 100), 'Sobre fondos propios', s3) +
      ring('sobreCaja', d.sobreCaja, 4, F.x(d.sobreCaja), 'Veces la caja', s4) +
      ring('financiado', r.loan, Math.max(1, d.inversion), F.eur(r.loan), 'Préstamo nuevo', 'ok') +
      ring('cuota', r.cuotaSobreEbitda, 100, F.pct(r.cuotaSobreEbitda), 'Cuota sobre EBITDA', r.cuotaSobreEbitda < 50 ? 'ok' : r.cuotaSobreEbitda < 80 ? 'warn' : 'stop');
  }

  /* ---------------- Escenarios ---------------- */
  function renderScenarios() {
    $('#scenCards').innerHTML = ctx.all.map((x) => {
      const c = A.SCENARIO_CONTEXT[x.key], st = vMap[x.r.verdict.key];
      return `<button class="glass scen ${x.key === state.escenario ? 'current' : ''}" data-k="${x.key}"><div class="row"><i class="sw" style="background:${A.seriesColor(x.i)}"></i><b>${x.nombre}</b><span class="spacer"></span><span class="state ${stCls(st)}">${stName[st]}</span></div><p class="small muted">${c.representa}</p><div class="small"><span class="muted">Probabilidad:</span> ${c.probabilidad.split('.')[0]}</div><div class="small more">Ver contexto →</div></button>`;
    }).join('');
    $$('#scenCards .scen').forEach((b) => b.addEventListener('click', () => openScenario(b.dataset.k)));

    const seg = $('#cashMode');
    seg.innerHTML = `<button data-m="liquidez" aria-pressed="${view.cash === 'liquidez'}">Liquidez</button><button data-m="neta" aria-pressed="${view.cash === 'neta'}">Caja neta</button>`;
    $$('button', seg).forEach((b) => b.onclick = () => { view.cash = b.dataset.m; renderScenarios(); });
    const pol = state.empresa.polizaLimite || 0;
    $('#cashExplain').textContent = view.cash === 'liquidez'
      ? `Liquidez = caja en el banco + parte libre de la póliza (${F.eur(pol)} de límite). Es el dinero que podrías usar cada mes. La línea roja es cero: por debajo, ni con la póliza llegas.`
      : 'Caja neta = caja en el banco − póliza dispuesta. Es tu posición real sin contar con el banco. Si es negativa, estás viviendo de la póliza.';
    const series = ctx.all.map((x) => ({ name: x.nombre, data: view.cash === 'liquidez' ? x.r.w.liquidez : x.r.w.cash, color: A.seriesColor(x.i), active: x.key === state.escenario, hidden: !!hidden[x.key] }));
    C.cash($('#cashChart'), $('#cashLegend'), series, {
      target: state.meta.cajaMin, start: ctx.active.start,
      onToggle: (i) => { const k = ctx.all[i].key; hidden[k] = !hidden[k]; renderScenarios(); }
    });
    renderCushion();
    let t = `<table><thead><tr><th>Escenario</th><th>Liquidez mín.</th><th>Colchón mín.</th><th>Recuperación</th><th>DSCR</th><th>Estado</th></tr></thead><tbody>`;
    ctx.all.forEach((x) => {
      const r = x.r, st = vMap[r.verdict.key];
      t += `<tr class="clickable ${x.key === state.escenario ? 'active' : ''}" data-k="${x.key}"><td><span class="sw" style="background:${A.seriesColor(x.i)}"></span>${x.nombre}</td><td style="color:${r.cajaRef < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(r.cajaRef)}</td><td>${fmtMeses(r.colMin)}</td><td>${F.months(r.payback)}</td><td>${F.x(r.dscrMin)}</td><td><span class="state ${stCls(st)}">${stName[st]}</span></td></tr>`;
    });
    $('#scenarioTable').innerHTML = t + '</tbody></table><p class="small muted">Haz clic en una fila para convertirla en el escenario activo.</p>';
    $$('#scenarioTable tr[data-k]').forEach((tr) => tr.addEventListener('click', () => setScenario(tr.dataset.k)));
    const four = ctx.all.filter((x) => x.key !== 'hipotesis');
    const aguantan = four.filter((x) => x.r.cajaRef >= 0);
    const peor = four.reduce((a, b) => (b.r.cajaRef < a.r.cajaRef ? b : a));
    const pes = ctx.all.find((x) => x.key === 'pesimista').r;
    const rob = pes.cajaRef >= 0 && pes.dscrMin >= 1;
    $('#scenarioRead').innerHTML = `<p><b>Cómo leerla.</b> Cada fila es la misma empresa con la misma decisión, en un futuro distinto. Lo importante no es el escenario base, sino cuántos escenarios aguantan.</p>
      <p>${aguantan.length} de 4 escenarios mantienen liquidez positiva. El peor es <b>${peor.nombre.toLowerCase()}</b>, con ${F.eur(peor.r.cajaRef)} en el mes ${peor.r.mesCajaRef}.</p>
      <p>${rob ? 'La decisión es <b>robusta</b>: aguanta el escenario pesimista sin quedarse sin liquidez y pagando sus cuotas.' : 'La decisión es <b>frágil</b>: en el escenario pesimista la empresa se queda sin liquidez o no paga sus cuotas con lo que genera. Dimensiona la financiación (póliza, plazo, carencia) para el pesimista, no para el base.'}</p>`;
    renderHyp();
    renderCustomRes();
  }
  // Tu escenario: partir de uno de los cuatro y ver el resultado al momento
  function renderCustomRes() {
    const host = $('#customRes'); if (!host) return;
    const x = ctx.all.find((a) => a.key === 'hipotesis'), r = x.r;
    host.innerHTML = `<div class="row small"><span class="muted">Partir de:</span>${A.SCENARIOS.filter((a) => a.mods).map((a) => `<button class="btn ghost small" data-from="${a.key}">${a.nombre}</button>`).join('')}</div>
      <div class="qz-foto"><div><span>Liquidez mínima</span><b style="color:${r.cajaRef < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(r.cajaRef)}</b><small>mes ${r.mesCajaRef}</small></div><div><span>Recuperación</span><b>${F.months(r.payback)}</b></div><div><span>Cobertura</span><b>${F.x(r.dscrMin)}</b></div><div><span>Veredicto</span><b style="font-size:.95rem;color:${A.stateColor(vMap[r.verdict.key])}">${r.verdict.titulo}</b></div></div>
      ${state.escenario !== 'hipotesis' ? '<button class="btn" id="customAct">Ver este escenario en todo el simulador</button>' : '<p class="small muted" style="margin:0">Es el escenario activo: todo el simulador lo está mostrando.</p>'}`;
    $$('[data-from]', host).forEach((b) => b.onclick = () => { state.custom = Object.assign({}, A.SCENARIOS.find((a) => a.key === b.dataset.from).mods); syncFields(); schedule(); toast('Tu escenario parte del ' + b.textContent.toLowerCase()); });
    const ca = $('#customAct'); if (ca) ca.onclick = () => setScenario('hipotesis');
  }
  function renderCushion() {
    const r = ctx.active, s = r.colchonSerie;
    const col = (m) => (m < 1 ? css('--stop') : m < 3 ? css('--warn') : css('--go'));
    const W = 900, Hh = 64, cw = W / s.length;
    const hgt = (m) => Math.max(4, Math.min(1, Math.max(0, m) / 6) * Hh);
    let svg = `<svg viewBox="0 0 ${W} ${Hh + 22}" role="img" aria-label="Meses de colchón por mes">`;
    s.forEach((m, i) => { svg += `<rect class="cm" data-i="${i}" x="${i * cw + 1}" y="${Hh - hgt(m)}" width="${cw - 2}" height="${hgt(m)}" rx="2" fill="${col(m)}" opacity="${i + 1 === r.mesColMin || i + 1 === r.mesColMax ? 1 : 0.7}"/>`; });
    for (let y = 0; y <= 5; y++) svg += `<text x="${Math.min(W - 30, y * 12 * cw + 2)}" y="${Hh + 16}">${y === 0 ? 'mes 1' : 'año ' + y}</text>`;
    svg += '</svg>';
    const polUso = r.polLim ? (r.polizaMax / r.polLim) * 100 : 0;
    $('#cushion').innerHTML = `<div class="chart">${svg}</div>
      <div class="cushion-stats">
        <div><span>Colchón mínimo</span><b style="color:${col(r.colMin)}">${fmtMeses(r.colMin)}</b><small>mes ${r.mesColMin}</small></div>
        <div><span>Colchón máximo</span><b>${fmtMeses(r.colMax)}</b><small>mes ${r.mesColMax}</small></div>
        <div><span>Caja neta máxima</span><b>${F.eur(r.cajaMax)}</b><small>mes ${r.mesCajaMax}</small></div>
        <div><span>Meses con menos de 1</span><b>${r.mesesBajoUno}</b><small>de 60</small></div>
        <div><span>Uso máximo de póliza</span><b>${F.eur(r.polizaMax)}</b><small>${r.polLim ? Math.round(polUso) + ' % del límite · mes ' + r.mesPolMax : 'sin póliza'}</small></div>
        <div><span>Coste de la póliza</span><b>${F.eur(r.costePolizaTotal)}</b><small>en 5 años</small></div>
      </div>
      <p class="small">${r.colMin < 1 ? `En el mes ${r.mesColMin} la empresa tendría liquidez para menos de un mes de gastos: cualquier cliente que se retrase pone en riesgo las nóminas. Refuerza la póliza o alarga la carencia para cubrir ese tramo.` : r.colMin < 3 ? `El punto más tenso es el mes ${r.mesColMin}, con ${fmtMeses(r.colMin)} de colchón: aguanta, pero sin margen para imprevistos grandes.` : `Incluso en el mes más tenso (${r.mesColMin}) la empresa conserva ${fmtMeses(r.colMin)} de colchón.`} ${r.colMax > 6 ? `A partir del mes ${r.mesColMax} sobra liquidez (${fmtMeses(r.colMax)}): es el momento de amortizar deuda, preparar la siguiente fase o repartir con prudencia.` : ''}</p>`;
    $$('#cushion .cm').forEach((b) => {
      const i = +b.dataset.i;
      b.addEventListener('pointermove', (ev) => C.tip(`<h5>Mes ${i + 1}</h5><dl><dt>Colchón</dt><dd>${fmtMeses(s[i])}</dd><dt>Liquidez</dt><dd>${F.eur(r.w.liquidez[i])}</dd><dt>Caja neta</dt><dd>${F.eur(r.w.cash[i])}</dd><dt>Póliza dispuesta</dt><dd>${F.eur(r.w.poliza[i])}</dd><dt>Gasto fijo del mes</dt><dd>${F.eur(r.w.fijoMes[i])}</dd></dl>`, ev.clientX, ev.clientY));
      b.addEventListener('pointerleave', C.hideTip);
    });
  }
  function openScenario(k) {
    const x = ctx.all.find((s) => s.key === k), c = A.SCENARIO_CONTEXT[k], r = x.r, st = vMap[r.verdict.key];
    const m = A.scenarioMods(state, k);
    const sg = (v) => (v >= 0 ? '+' : '') + String(v).replace('.', ',');
    const el = openModal(`<div class="eyebrow">Escenario</div><h2 style="font-size:1.8rem">${c.titulo}</h2>
      <div class="row mt"><span class="state ${stCls(st)}">${r.verdict.titulo}</span><span class="small muted">Probabilidad orientativa: ${c.probabilidad}</span></div>
      <div class="mgrid mt">
        <div><span>Liquidez mínima</span><b>${F.eur(r.cajaRef)}</b></div><div><span>Colchón mínimo</span><b>${fmtMeses(r.colMin)}</b></div>
        <div><span>Recuperación</span><b>${F.months(r.payback)}</b></div><div><span>Cobertura</span><b>${F.x(r.dscrMin)}</b></div>
      </div>
      <h4 class="mt">Qué representa</h4><p>${c.representa}</p>
      <h4>Supuestos aplicados</h4><p class="small">Venta nueva × ${String(m.ventasF).replace('.', ',')} · rampa ${sg(m.retraso)} meses · margen ${sg(m.margenDelta)} pp · sobrecoste ${m.sobrecoste} % · cobros ${sg(m.dsoDelta)} días · tipos ${sg(m.tipoDelta)} pp</p>
      <h4>Cuándo ocurre</h4><p>${c.cuando}</p>
      <h4>Señales tempranas que vigilar</h4><ul>${c.senales.map((s) => `<li>${s}</li>`).join('')}</ul>
      <h4>Cómo usarlo</h4><p>${c.respuesta}</p>
      <div class="row mt"><button class="btn solid" id="scActivate">Activar este escenario</button>${k === 'hipotesis' ? '<button class="btn" id="scEdit">Editar mis supuestos</button>' : ''}</div>`);
    $('#scActivate', el).onclick = () => { closeModal(); setScenario(k); };
    const ed = $('#scEdit', el); if (ed) ed.onclick = () => goToField('custom.ventasF');
  }
  function renderHyp() {
    const host = $('#hypList');
    host.innerHTML = state.hipotesis.length ? state.hipotesis.map((h) => `<div class="hyp" data-id="${h.id}">
        <button class="switch" role="switch" aria-checked="${h.activo}" aria-label="Activar hipótesis"></button>
        <div><div>${A.SHOCKS[h.tipo].nombre} <span class="small muted">· ${A.SHOCKS[h.tipo].desc}</span></div><div class="meta">
          <label>mes <input class="input" type="number" min="1" max="60" data-k="mes" value="${h.mes}"></label>
          <label>dura <input class="input" type="number" min="1" max="60" data-k="duracion" value="${h.duracion}"></label>
          <label>${A.SHOCKS[h.tipo].unidad} <input class="input" type="number" step="0.5" data-k="magnitud" value="${h.magnitud}"></label></div></div>
        <button class="icon-btn" data-del aria-label="Eliminar hipótesis">×</button></div>`).join('') : '<p class="small muted">Sin hipótesis. Añade una para estresar el plan.</p>';
    $$('.hyp', host).forEach((row) => {
      const h = state.hipotesis.find((x) => x.id === row.dataset.id);
      row.querySelector('.switch').onclick = () => { h.activo = !h.activo; schedule(); };
      row.querySelector('[data-del]').onclick = () => { state.hipotesis = state.hipotesis.filter((x) => x !== h); schedule(); };
      $$('input', row).forEach((inp) => inp.onchange = () => { h[inp.dataset.k] = parseFloat(inp.value) || 0; schedule(); });
    });
  }
  function addHyp(tipo, extra) {
    const def = { cliente: 10, ventas: 15, margen: 3, tipos: 1.5, cobro: 20, salarios: 4, puntual: 80 }[tipo];
    const h = Object.assign({ id: 'h' + Date.now(), tipo, mes: 12, duracion: ['cliente', 'tipos', 'salarios'].includes(tipo) ? 60 : 6, magnitud: def, activo: true }, extra || {});
    if (!isFinite(h.magnitud)) h.magnitud = def;
    state.hipotesis.push(h);
    schedule();
    return h;
  }

  /* ---------------- Semáforos ---------------- */
  function renderLights() {
    $('#lights').innerHTML = ctx.active.lights.map((l) => `<button class="light" data-k="${l.key}"><div class="lamp" aria-hidden="true"><i class="${l.estado === 'stop' ? 'on stop' : ''}"></i><i class="${l.estado === 'warn' ? 'on warn' : ''}"></i><i class="${l.estado === 'ok' ? 'on ok' : ''}"></i></div><div><div class="n">${l.nombre}</div><div class="lv">${l.valor}</div><div class="lt">${stName[l.estado]} · verde ${l.rangos.ok}</div></div></button>`).join('');
    $$('#lights .light').forEach((b) => b.addEventListener('click', () => openLight(b.dataset.k)));
    $('#lightGuide').innerHTML = `<table class="guide"><thead><tr><th>Indicador</th><th>Hoy</th><th><span class="dotc ok"></span>Verde</th><th><span class="dotc warn"></span>Ámbar</th><th><span class="dotc stop"></span>Rojo</th><th style="text-align:left">Se corrige con</th></tr></thead><tbody>` +
      ctx.active.lights.map((l) => `<tr class="clickable" data-k="${l.key}"><td>${l.nombre}</td><td><span class="state ${stCls(l.estado)}">${l.valor}</span></td><td>${l.rangos.ok}</td><td>${l.rangos.warn}</td><td>${l.rangos.stop}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body);min-width:240px"><span class="muted">Directas:</span> ${l.def.directas.slice(0, 3).map((v) => v.nombre.toLowerCase()).join(', ')}. <span class="muted">Indirectas:</span> ${l.def.indirectas.slice(0, 2).map((v) => v.nombre.toLowerCase()).join(', ')}.</td></tr>`).join('') + '</tbody></table>';
    $$('#lightGuide tr[data-k]').forEach((tr) => tr.addEventListener('click', () => openLight(tr.dataset.k)));
  }
  function openLight(key) {
    const l = ctx.active.lights.find((x) => x.key === key), d = l.def;
    // Efecto de mover cada variable directa un 10 % en la dirección que mejora el indicador
    const efectos = d.directas.map((v) => {
      const cur = getPath(v.path);
      if (!isFinite(cur) || cur === 0) return null;
      const test = (f) => { const s = A.clone(state); const [a, b] = v.path.split('.'); s[a][b] = cur * f; const r = A.analyze(s, ctx.mods); const val = d.value(r, s); return { v: val, st: A.lightState(d, val, s, r) }; };
      const up = test(1.1), dn = test(0.9);
      const best = d.better > 0 ? (up.v >= dn.v ? { dir: 'subir', ...up } : { dir: 'bajar', ...dn }) : (up.v <= dn.v ? { dir: 'subir', ...up } : { dir: 'bajar', ...dn });
      if (Math.abs(best.v - l.v) < 1e-6) return null;
      return { v, best };
    }).filter(Boolean);
    const band = (s, label, txt) => `<div class="band ${s} ${l.estado === s ? 'here' : ''}"><b>${label}</b><span>${txt}</span>${l.estado === s ? '<em>estás aquí</em>' : ''}</div>`;
    openModal(`<div class="eyebrow">Semáforo de movimiento</div><h2 style="font-size:1.8rem">${l.nombre}</h2>
      <div class="row mt"><span class="state ${stCls(l.estado)}">${stName[l.estado]}</span><span class="num" style="font-size:1.4rem">${l.valor}</span></div>
      <p>${d.que}</p><p class="small muted">${l.lectura}</p>
      <h4 class="mt">Horquillas</h4><div class="bands">${band('ok', 'Verde', l.rangos.ok)}${band('warn', 'Ámbar', l.rangos.warn)}${band('stop', 'Rojo', l.rangos.stop)}</div>
      <h4 class="mt">Variables directas</h4><p class="small muted">Lo cambian al momento. Toca una para ir al dato.</p><div class="chips">${d.directas.map((v) => varChip(v.path)).join('')}</div>
      <h4 class="mt">Variables indirectas</h4><p class="small muted">Lo cambian a través de otra magnitud (circulante, EBITDA, rampa…).</p><div class="chips">${d.indirectas.map((v) => `<button class="vchip ind" data-go="${v.path}">${esc(v.nombre)}${isFinite(getPath(v.path)) ? ` <b>${fmtVar(v.path)}</b>` : ''}</button>`).join('')}</div>
      ${efectos.length ? `<h4 class="mt">Si mueves cada variable directa un 10 %</h4><table class="mini"><tbody>${efectos.map((e) => `<tr><td>${e.best.dir === 'subir' ? 'Subir' : 'Bajar'} ${esc(e.v.nombre.toLowerCase())}</td><td>${l.valor} → <b>${d.fmt(e.best.v)}</b></td><td><span class="state ${stCls(e.best.st)}">${stName[e.best.st]}</span></td></tr>`).join('')}</tbody></table>` : ''}
      <h4 class="mt">Cómo corregirlo</h4><p>${d.consejo}</p>
      ${l.estado !== 'ok' ? `<h4 class="mt">Qué mover para subir de escalón</h4><p class="small muted">Valor exacto de cada dato, tocando solo ese, para pasar ${l.estado === 'stop' ? 'de rojo a ámbar y de rojo a verde' : 'de ámbar a verde'} en el escenario ${A.SCENARIOS.find((x) => x.key === state.escenario).nombre.toLowerCase()}. Normalmente lo más sensato es combinar dos o tres: eso lo calcula el <a href="#plan" id="ltPlan">plan de corrección</a>.</p><div id="ltSaltos" class="small muted">Calculando…</div>` : ''}
      <div class="row mt"><button class="btn" id="askLight">Preguntar al asistente</button></div>`);
    if (l.estado !== 'ok') setTimeout(() => pintarSaltos(l), 30);
    const lp = $('#ltPlan'); if (lp) lp.onclick = () => closeModal();
    $('#askLight').onclick = () => { closeModal(); A.assistant && A.assistant.ask(`¿Qué hago para poner en verde el semáforo de ${l.nombre.toLowerCase()}?`); };
  }

  /* Para cada dato que mueve un semáforo: el valor mínimo (tocando solo ese) que lo sube a ámbar y a verde */
  const ORD = { stop: 0, warn: 1, ok: 2 };
  const fieldDef = (p) => Object.values(FIELDS).flat().find((f) => f.p === p);
  function saltosDe(l) {
    const d = l.def, cur = ORD[l.estado];
    const metas = ['warn', 'ok'].filter((k) => ORD[k] > cur);
    const vistos = new Set();
    const vars = d.directas.map((v) => ({ v, dir: true })).concat(d.indirectas.map((v) => ({ v, dir: false }))).filter((x) => { if (vistos.has(x.v.path) || !fieldDef(x.v.path) || !isFinite(getPath(x.v.path))) return false; vistos.add(x.v.path); return true; });
    return vars.map(({ v, dir }) => {
      const f = fieldDef(v.path), x0 = getPath(v.path);
      const lo = Math.min(resolve(f.min), x0), hi = Math.max(resolve(f.max), f.u === '€' || f.u === '€/año' ? x0 * 3 : x0);
      const at = (x) => { const s2 = A.clone(state); const [a, b] = v.path.split('.'); s2[a][b] = x; const r = A.analyze(s2, ctx.mods); return ORD[A.lightState(d, d.value(r, s2), s2, r)]; };
      const out = {};
      metas.forEach((k) => {
        const need = ORD[k]; let best = null;
        [hi, lo].forEach((end) => {
          if (Math.abs(end - x0) < 1e-9) return;
          let prev = x0, hit = null;
          for (let i = 1; i <= 16; i++) { const x = x0 + (end - x0) * (i / 16); if (at(x) >= need) { hit = x; break; } prev = x; }
          if (hit === null) return;
          let a = prev, b = hit; for (let j = 0; j < 9; j++) { const mid = (a + b) / 2; if (at(mid) >= need) b = mid; else a = mid; }
          const st = f.step || 1; let xr = end > x0 ? Math.ceil(b / st) * st : Math.floor(b / st) * st;
          if (at(xr) < need) xr = b;
          if (best === null || Math.abs(xr - x0) < Math.abs(best - x0)) best = xr;
        });
        out[k] = best;
      });
      return { v, dir, f, x0, out };
    });
  }
  function pintarSaltos(l) {
    const host = $('#ltSaltos'); if (!host) return;
    const R = saltosDe(l), metas = ['warn', 'ok'].filter((k) => ORD[k] > ORD[l.estado]);
    const fv = (f, v) => `${fmtField(f, v)} ${f.u}`;
    const celda = (x, v) => { if (v == null) return '<span class="muted">sola no basta</span>'; const dv = v - x.x0; const dtxt = x.f.u.indexOf('€') === 0 ? ` (${dv > 0 ? '+' : '−'}${F.eur(Math.abs(dv))})` : ''; return `${dv > 0 ? 'subir a' : 'bajar a'} <b>${fv(x.f, v)}</b>${dtxt}`; };
    const rows = R.filter((x) => metas.some((k) => x.out[k] != null)).concat(R.filter((x) => metas.every((k) => x.out[k] == null)));
    const r = ctx.active;
    const cab = l.key === 'liquidez' ? `<p style="color:var(--fg)">Hoy el punto más bajo es <b>${F.eur(r.cajaRef)}</b> en el mes ${r.mesCajaRef}. ${r.cajaRef < 0 ? `Para salir del rojo necesitas <b>${F.eur(-r.cajaRef)}</b> más de liquidez en ese mes` : ''}${l.estado !== 'ok' ? `${r.cajaRef < 0 ? ' y, para el verde, ' : 'Para el verde necesitas '}<b>${F.eur(l.def.ok(state, r) - r.cajaRef)}</b> más (verde desde ${F.eur(l.def.ok(state, r))}).` : ''}</p>` : '';
    host.classList.remove('muted');
    host.innerHTML = cab + `<div class="table-wrap"><table class="mini"><thead><tr><th style="text-align:left">Dato</th><th>Hoy</th>${metas.map((k) => `<th>Para ${k === 'warn' ? 'ámbar' : 'verde'}</th>`).join('')}</tr></thead><tbody>${rows.map((x) => `<tr><td style="text-align:left">${esc(x.v.nombre)}${x.dir ? '' : ' <span class="muted">(indirecta)</span>'}</td><td>${fv(x.f, x.x0)}</td>${metas.map((k) => `<td>${celda(x, x.out[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderRisks() {
    C.riskMatrix($('#riskMatrix'), ctx.risks, (r, ev) => openCard(null, ev.target, { t: r.nombre, d: r.mitigacion, v: () => `Nivel ${r.nivel} · ${stName[r.estado]}` }));
    C.tornado($('#tornado'), ctx.sens);
    const s = ctx.sens, top = s.rows.slice(0, 3);
    const lines = top.map((r) => {
      const worse = Math.min(r.lo, r.hi), better = Math.max(r.lo, r.hi);
      return `<li><b>${r.nombre}</b>: en el caso adverso la liquidez mínima ${worse < 0 ? `cae a <b style="color:var(--stop)">${F.eur(worse)}</b>, es decir, faltarían ${F.eur(-worse)}` : `baja a ${F.eur(worse)}`}; en el favorable sube a ${F.eur(better)}.</li>`;
    }).join('');
    $('#sensRead').innerHTML = `<p><b>Cómo leerlo.</b> La línea dorada es tu liquidez mínima actual (${F.eur(s.base)}). Cada barra mueve una sola variable y mide cuánto cambia: hacia la izquierda (naranja) empeora, hacia la derecha (azul) mejora. Las barras más largas, arriba, son las variables que más debes vigilar.</p>
      <p><b>Valores negativos.</b> Una cifra por debajo de 0 € significa que, en ese caso, la empresa no tendría dinero suficiente en su peor mes: ese importe es lo que tendrías que conseguir antes (póliza más grande, aportación o un préstamo mayor) para no quedarte sin liquidez.</p><ul>${lines}</ul>`;
    $('#riskTable').innerHTML = `<table><thead><tr><th>#</th><th style="text-align:left">Riesgo</th><th>Prob.</th><th>Impacto</th><th>Nivel</th><th style="text-align:left">Mitigación</th></tr></thead><tbody>` +
      ctx.risks.map((r, i) => `<tr><td>${i + 1}</td><td style="text-align:left">${r.nombre}</td><td>${r.prob}</td><td>${r.impacto}</td><td><span class="state ${stCls(r.estado)}">${r.nivel}</span></td><td style="text-align:left;white-space:normal;font-family:var(--font-body);color:var(--muted);min-width:240px">${r.mitigacion}</td></tr>`).join('') + '</tbody></table>';
  }

  /* ---------------- Tamaño operativo ---------------- */
  function sizeData() {
    const r = ctx.active, t = r.tamano, w = r.w, b = r.b, e = state.empresa, inv = state.inversion, c0 = t.mesCrucero - 1;
    const Y = (a) => A.sum(a, c0, c0 + 12), Y0 = (a) => A.sum(a, 0, 12);
    return { r, t, e, inv, c0, baseCru: Y(b.sales), nuevaCru: Y(w.newSales), grossA: Y0(b.gross), staffA: Y0(b.staff), fixedA: Y0(b.fixed), grossB: Y(w.gross), staffB: Y(w.staff), fixedB: Y(w.fixed), debtB: Y(w.debt) };
  }
  const SIZE = [
    { n: 'Ventas', k: 'ventas', f: (v) => F.eur(v), up: 1 },
    { n: 'EBITDA', k: 'ebitda', f: (v) => F.eur(v), up: 1, sub: (t) => `${F.pct(t.antes.ebitdaPct)} → ${F.pct(t.despues.ebitdaPct)} sobre ventas` },
    { n: 'Margen bruto', k: 'margen', f: (v) => F.pct(v), up: 1 },
    { n: 'Plantilla', k: 'plantilla', f: (v) => F.num(v) + ' pers.', up: 0 },
    { n: 'Peso salarial', k: 'pesoSalarial', f: (v) => F.pct(v), up: -1 },
    { n: 'Ventas por persona', k: 'ventasEmpleado', f: (v) => F.eur(v), up: 1 },
    { n: 'Punto de equilibrio', k: 'equilibrio', f: (v) => F.eur(v), up: -1, sub: () => 'ventas al año para no perder' },
    { n: 'Circulante extra', k: 'wc', f: (v) => F.eur(v), up: -1, sub: () => 'caja atrapada en clientes y stock en el pico' }
  ];
  function sizeVals(it, t) { return it.k === 'wc' ? [0, ctx.active.wcPeak] : [t.antes[it.k], t.despues[it.k]]; }
  function renderSize() {
    const t = ctx.active.tamano;
    $('#sizeLede').innerHTML = `A la izquierda, los <b>próximos doce meses sin el proyecto</b>; a la derecha, el <b>año de crucero</b> (meses ${t.mesCrucero} a ${t.mesCrucero + 11}), cuando lo nuevo ha terminado su rampa y vende lo previsto. Toca una tarjeta para ver de dónde sale cada cifra y qué hacer con ella.`;
    $('#sizeGrid').innerHTML = SIZE.map((it, i) => {
      const [a, b] = sizeVals(it, t);
      const mx = Math.max(Math.abs(a), Math.abs(b)) || 1;
      const d = b - a, good = it.up === 0 ? null : (d * it.up >= 0);
      const rel = a ? (d / Math.abs(a)) * 100 : null;
      return `<button class="glass size" data-sz="${i}"><h4>${it.n}</h4><div class="from-to"><span class="a">${it.f(a)}</span><span class="muted">→</span><span class="b">${it.f(b)}</span></div>
        <div class="bars"><span style="width:${(Math.abs(a) / mx) * 100}%"></span><span class="after" style="width:${(Math.abs(b) / mx) * 100}%"></span></div>
        <div class="delta ${good === null ? '' : good ? 'up' : 'down'}">${it.sub ? it.sub(t) : rel !== null ? `${rel >= 0 ? '+' : ''}${F.pct(rel)}` : ''}</div><div class="mas">De dónde sale →</div></button>`;
    }).join('');
    $$('#sizeGrid [data-sz]').forEach((b) => b.onclick = () => openSize(+b.dataset.sz));
    C.debt($('#debtChart'), ctx.active);
    renderSizeRead();
  }
  function sizeExplain(k) {
    const d = sizeData(), { t, e, inv, r } = d, sec = A.SECTORS[state.sector], m = ctx.mods, mesA = d.c0 + 1, mesB = d.c0 + 12;
    const vNueva = e.ventas * inv.incVentas / 100;
    const X = {
      ventas: { que: 'Lo que factura la empresa en un año.', de: `<b>Hoy (${F.eur(t.antes.ventas)})</b>: tus ventas actuales, ${F.eur(e.ventas)}, con el crecimiento orgánico del ${String(e.crecimiento).replace('.', ',')} % durante los próximos doce meses.<br><b>Con el proyecto (${F.eur(t.despues.ventas)})</b>: en los meses ${mesA} a ${mesB} el negocio de hoy, que sigue creciendo hasta entonces, vende ${F.eur(d.baseCru)}, y lo nuevo suma ${F.eur(d.nuevaCru)}. Esa venta nueva sale de tu dato «Venta nueva en crucero»: el ${String(inv.incVentas).replace('.', ',')} % de tus ventas, ${F.eur(vNueva)} al año${m.ventasF !== 1 ? `, por ${String(m.ventasF).replace('.', ',')} en el escenario ${A.SCENARIOS.find((x) => x.key === state.escenario).nombre.toLowerCase()}` : ''}${r.p.share < 1 ? ', y solo la mitad es tuya en una joint venture' : ''}.`, hacer: 'Es la cifra más incierta de todo el plan. Compruébala con pedidos o clientes comprometidos y mira qué pasa en el escenario pesimista. Puedes bajarla aquí mismo con la barra de venta nueva.', vars: ['inversion.incVentas', 'empresa.crecimiento', 'inversion.rampa'] },
      ebitda: { que: 'Lo que gana el negocio con su actividad antes de pagar intereses, impuestos y amortizaciones. Es el dinero con el que se pagan las cuotas.', de: `<table class="mini"><tbody><tr><td></td><td>Hoy</td><td>Crucero</td></tr><tr><td>Margen bruto (ventas − compras)</td><td>${F.eur(d.grossA)}</td><td>${F.eur(d.grossB)}</td></tr><tr><td>− Personal</td><td>${F.eur(d.staffA)}</td><td>${F.eur(d.staffB)}</td></tr><tr><td>− Otros gastos fijos</td><td>${F.eur(d.fixedA)}</td><td>${F.eur(d.fixedB)}</td></tr><tr><td><b>= EBITDA</b></td><td><b>${F.eur(t.antes.ebitda)}</b></td><td><b>${F.eur(t.despues.ebitda)}</b></td></tr><tr><td class="muted">Cuotas de préstamos en ese año</td><td></td><td class="muted">${F.eur(d.debtB)}</td></tr></tbody></table>`, hacer: t.despues.ebitda < d.debtB ? 'En crucero el EBITDA no cubre las cuotas: hay que alargar plazos, bajar la parte financiada o mejorar el margen de lo nuevo.' : `El EBITDA de crucero cubre ${F.x(t.despues.ebitda / Math.max(1, d.debtB))} las cuotas de ese año.`, vars: ['inversion.margenNuevo', 'inversion.fijosNuevos', 'inversion.contrataciones'] },
      margen: { que: 'De cada 100 € vendidos, lo que queda tras pagar compras y materia prima.', de: `Hoy, ${F.pct(e.margen)}. Lo nuevo tiene un margen de ${F.pct(inv.margenNuevo + (m.margenDelta || 0))}; mezclado con lo de hoy según lo que pesa cada parte en las ventas, queda en ${F.pct(t.despues.margen)}.`, hacer: t.despues.margen < t.antes.margen - 1 ? 'Lo nuevo diluye el margen: cada euro de venta nueva deja menos. Solo compensa si cubre de sobra los fijos y el personal nuevos.' : 'Lo nuevo no empeora el margen de la empresa.', vars: ['inversion.margenNuevo', 'empresa.margen'] },
      plantilla: { que: 'Personas en nómina.', de: `Hoy ${e.plantilla} personas. Con el proyecto se suman ${Math.round(inv.contrataciones * r.p.share)} contrataciones (tu dato «Contrataciones»), hasta ${F.num(t.despues.plantilla)}. Con ${sec.span} personas por responsable, necesitarás ${r.humano.mandosNecesarios} mandos; hoy tienes ${state.humano.mandos}.`, hacer: r.humano.gapMandos ? `Faltan ${r.humano.gapMandos} mandos: nómbralos o contrátalos antes del arranque (ver «¿Está el equipo listo?»).` : 'La estructura de mando cubre la nueva plantilla.', vars: ['inversion.contrataciones', 'inversion.anticipo', 'humano.mandos'] },
      pesoSalarial: { que: 'Coste de personal sobre ventas. Mide cuánto de lo que vendes se va en sueldos.', de: `Hoy ${F.pct(t.antes.pesoSalarial)} (${F.eur(d.staffA)} de personal sobre ${F.eur(t.antes.ventas)} de ventas). En crucero ${F.pct(t.despues.pesoSalarial)}. En ${sec.nombre.toLowerCase()} lo sano es no pasar del ${sec.pesoSalarialMax} %.`, hacer: t.despues.pesoSalarial > sec.pesoSalarialMax ? 'Por encima de la referencia del sector: contrata al ritmo de la venta real, no del plan.' : 'Dentro de la referencia del sector.', vars: ['inversion.contrataciones', 'inversion.salario', 'empresa.personal'] },
      ventasEmpleado: { que: 'Productividad: ventas divididas entre personas.', de: `Hoy ${F.eur(t.antes.ventasEmpleado)} por persona; en crucero ${F.eur(t.despues.ventasEmpleado)}.`, hacer: t.despues.ventasEmpleado < t.antes.ventasEmpleado ? 'Cada persona nueva vende menos que las de hoy: o sobran contrataciones o la venta nueva está corta.' : 'Lo nuevo es más productivo por persona que lo de hoy.', vars: ['inversion.contrataciones', 'inversion.incVentas'] },
      equilibrio: { que: 'Lo que hay que vender al año para cubrir personal y gastos fijos sin perder dinero (sin contar las cuotas).', de: `Hoy ${F.eur(t.antes.equilibrio)}; con el proyecto ${F.eur(t.despues.equilibrio)}, porque suben los fijos y el personal. Lo verás en gráfico, con y sin cuotas, en «El terreno antes de pisarlo».`, hacer: `Vendes un ${F.pct((t.despues.ventas / Math.max(1, t.despues.equilibrio) - 1) * 100)} por encima del equilibrio en crucero. Por debajo del 10 % la empresa vive al límite.`, vars: ['inversion.fijosNuevos', 'inversion.contrataciones', 'inversion.margenNuevo'] },
      wc: { que: 'Dinero que se queda atrapado en clientes (facturas por cobrar) y en almacén al vender más. Sale de la caja aunque la cuenta de resultados diga que ganas.', de: `En el peor momento, el crecimiento inmoviliza ${F.eur(r.wcPeak)}: cobras a ${e.dso} días, el stock dura ${e.dio} y pagas a ${e.dpo}. Cada día menos de cobro libera unos ${F.eur(t.despues.ventas / 365)}.`, hacer: `Cobrar 15 días antes liberaría unos ${F.eur(t.despues.ventas / 365 * 15)}. Otras palancas: anticipos de clientes, factoring o confirming, y pagar a proveedores algo más tarde.`, vars: ['empresa.dso', 'empresa.dio', 'empresa.dpo'] }
    };
    return X[k];
  }
  function openSize(i) {
    const it = SIZE[i], t = ctx.active.tamano, [a, b] = sizeVals(it, t), x = sizeExplain(it.k);
    openModal(`<div class="eyebrow">La empresa que serás</div><h2 style="font-size:1.8rem">${it.n}</h2>
      <div class="row mt"><span class="num" style="font-size:1.3rem">${it.f(a)}</span><span class="muted">→</span><span class="num" style="font-size:1.3rem;color:var(--gold-soft)">${it.f(b)}</span></div>
      <p>${x.que}</p><h4>De dónde sale</h4><div>${x.de}</div><h4 class="mt">Qué hacer</h4><p>${x.hacer}</p>
      <h4>Se mueve con</h4><div class="chips">${x.vars.map((p) => varChip(p)).join('')}</div>`);
  }
  function renderSizeRead() {
    const host = $('#sizeRead'); if (!host) return;
    const d = sizeData(), t = d.t, sec = A.SECTORS[state.sector];
    const notas = [];
    notas.push(`Pasas de vender ${F.eur(t.antes.ventas)} a ${F.eur(t.despues.ventas)} (${F.pct((t.despues.ventas / Math.max(1, t.antes.ventas) - 1) * 100)} más): ${F.eur(d.nuevaCru)} son de lo nuevo.`);
    notas.push(t.despues.ebitda > t.antes.ebitda ? `El EBITDA sube de ${F.eur(t.antes.ebitda)} a ${F.eur(t.despues.ebitda)}: lo nuevo aporta ${F.eur(t.despues.ebitda - t.antes.ebitda)} al año antes de cuotas.` : `El EBITDA baja de ${F.eur(t.antes.ebitda)} a ${F.eur(t.despues.ebitda)}: lo nuevo cuesta más de lo que deja incluso en crucero.`);
    if (t.despues.pesoSalarial > sec.pesoSalarialMax) notas.push(`El peso salarial (${F.pct(t.despues.pesoSalarial)}) supera la referencia del sector (${sec.pesoSalarialMax} %).`);
    if (t.despues.ventasEmpleado < t.antes.ventasEmpleado) notas.push('La productividad por persona baja: revisa si todas las contrataciones son necesarias desde el principio.');
    notas.push(`El crecimiento atrapará hasta ${F.eur(ctx.active.wcPeak)} en clientes y stock: tenlo financiado antes de arrancar.`);
    host.innerHTML = `<h4>Lectura</h4><ul class="small">${notas.map((n) => `<li>${n}</li>`).join('')}</ul>
      <p class="small muted" style="margin:0">Mueve lo nuevo y mira cómo cambia la empresa que serás:</p>
      <div class="pe-mueve" style="border:0;padding-top:0">${[['inversion.incVentas', 'Venta nueva', 0, 150, 1, (v) => F.eur(state.empresa.ventas * v / 100) + '/año'], ['inversion.margenNuevo', 'Margen de lo nuevo', 5, 90, 0.5, (v) => F.pct(v)], ['inversion.contrataciones', 'Contrataciones', 0, Math.max(20, state.inversion.contrataciones * 2), 1, (v) => v + ' pers.'], ['inversion.salario', 'Coste por persona', 12000, 120000, 500, (v) => F.eur(v) + '/año'], ['inversion.fijosNuevos', 'Fijos nuevos', 0, Math.max(300000, state.inversion.fijosNuevos * 2), 1000, (v) => F.eur(v) + '/año'], ['inversion.rampa', 'Meses de rampa', 1, 36, 1, (v) => v + ' meses']].map(([p, l, a, z, st, f]) => `<label><span>${l} <b data-szv="${p}">${f(getPath(p))}</b></span><input type="range" data-sz-p="${p}" min="${a}" max="${z}" step="${st}" value="${getPath(p)}"></label>`).join('')}</div>`;
    const fm = { 'inversion.incVentas': (v) => F.eur(state.empresa.ventas * v / 100) + '/año', 'inversion.margenNuevo': (v) => F.pct(v), 'inversion.contrataciones': (v) => v + ' pers.', 'inversion.salario': (v) => F.eur(v) + '/año', 'inversion.fijosNuevos': (v) => F.eur(v) + '/año', 'inversion.rampa': (v) => v + ' meses' };
    $$('[data-sz-p]', host).forEach((r) => {
      r.addEventListener('input', () => { const tt = host.querySelector(`[data-szv="${r.dataset.szP}"]`); if (tt) tt.textContent = fm[r.dataset.szP](parseFloat(r.value)); });
      r.addEventListener('change', () => { setPath(r.dataset.szP, parseFloat(r.value)); state.ejemplo = false; syncFields(); schedule(); });
    });
  }

  /* ---------------- Sistema humano ---------------- */
  function renderHuman() {
    const h = ctx.active.humano;
    C.radar($('#radar'), h.dims);
    const st = h.score >= 70 ? 'ok' : h.score >= 50 ? 'warn' : 'stop';
    $('#humanScore').innerHTML = `${Math.round(h.score)}<span style="font-size:1.2rem;color:var(--muted)">/100</span>`;
    $('#humanScore').style.color = A.stateColor(st);
    $('#humanTxt').innerHTML = (st === 'ok' ? 'La organización está preparada para el nuevo tamaño.' : st === 'warn' ? 'Preparada a medias: hay que reforzar antes del arranque.' : 'La organización no está lista para esta misión.') +
      ` <br>Plantilla final: <b>${h.total}</b> personas (+${Math.round(h.crec * 100)} %). Mandos necesarios: <b>${h.mandosNecesarios}</b>. Coste de prepararla: <b>${F.eur(h.costePreparacion)}</b>.`;
    const open = $$('#humanDims details[open]').map((d) => d.dataset.k);
    $('#humanDims').innerHTML = h.dims.map((d) => {
      const s = d.score >= 70 ? 'ok' : d.score >= 50 ? 'warn' : 'stop';
      return `<details class="dimrow" data-k="${d.key}" ${open.indexOf(d.key) >= 0 ? 'open' : ''}><summary><span>${d.nombre}</span><span class="num" style="text-align:right">${Math.round(d.score)}</span><span class="meter"><b style="width:${d.score}%;background:${A.stateColor(s)}"></b></span></summary><p class="small">${d.lectura}</p><div class="chips">${d.vars.map((p) => varChip(p)).join('')}</div></details>`;
    }).join('');
    $('#humanPlan').innerHTML = h.acciones.slice().sort((a, b) => a.cuando - b.cuando).map((a) => `<div class="ev"><div class="when">MES ${a.cuando}${a.coste ? ' · ' + F.eur(a.coste) : ''}</div><div>${a.que}</div></div>`).join('');
  }

  /* ---------------- Estructuras ---------------- */
  function renderStructs() {
    const S = ctx.structs;
    ['encaje', 'control', 'pleno', 'metas', 'marcha'].forEach((k) => { INFO['st-' + k] = { t: { encaje: 'Encaje', control: 'Control', pleno: 'Tamaño pleno', metas: 'Metas cumplidas', marcha: 'Puesta en marcha' }[k], d: A.STRUCT_GLOSA[k] }; });
    $('#structLede').innerHTML = `Seis formas de hacer la misma inversión con la meta de alcanzar el tamaño pleno antes del <b>mes ${state.meta.plazoObjetivo}</b>. Cada una cambia la liquidez, el retorno para la propiedad, el control y el tiempo. <b>Toca una</b> para ver cómo funciona, sus ventajas, su fiscalidad y los pasos para ponerla en marcha.`;
    $('#structs').innerHTML = S.map((s, i) => {
      const r = s.r;
      const attr = (n, v, inv) => `<div class="attr"><span>${n}</span><span class="track"><b style="width:${v}%;background:${inv ? css('--s2') : css('--s1')}"></b></span><span>${v}</span></div>`;
      return `<button class="glass struct ${s.key === state.estructura ? 'current' : ''}" data-k="${s.key}">
        <div class="head"><span class="name">${s.nombre}</span><span class="score" title="Encaje de 0 a 100">${i === 0 ? '★ ' : ''}${Math.round(s.score)}<small>/100 encaje</small></span></div>
        <div class="small muted">${s.desc}</div>
        <div class="stats"><div>Liquidez mínima<b style="color:${r.cajaRef < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(r.cajaRef)}</b></div><div>Recuperación<b>${F.months(r.payback)}</b></div><div>Tamaño pleno<b style="color:${s.enPlazo ? 'inherit' : 'var(--warn)'}">mes ${s.mesPleno}</b></div></div>
        <div class="attrs">${attr('Control', s.control)}${attr('Aislamiento', s.aislamiento)}${attr('Complejidad', s.complejidad, true)}</div>
        <div class="row small"><span class="state ${stCls(s.enPlazo ? 'ok' : 'warn')}">${s.enPlazo ? 'En plazo' : 'Fuera de plazo'}</span><span class="state ${stCls(s.metasOk >= 4 ? 'ok' : s.metasOk >= 2 ? 'warn' : 'stop')}">${s.metasOk} de 5 metas</span>${s.key === state.estructura ? '<span class="muted">· actual</span>' : ''}<span class="spacer"></span><span class="more">Ver ficha →</span></div>
      </button>`;
    }).join('');
    $$('#structs .struct').forEach((b) => b.addEventListener('click', () => openStruct(b.dataset.k)));
  }
  function flowSVG(fl) {
    const W = 560, Hh = 190, xs = [90, 280, 470];
    let s = `<svg viewBox="0 0 ${W} ${Hh}" class="flow" role="img" aria-label="Relación entre sociedades"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${css('--gold')}"/></marker></defs>`;
    fl.nodos.forEach((n, i) => { s += `<line x1="${xs[i]}" x2="${xs[i]}" y1="${Hh - 56}" y2="26" stroke="${css('--line')}" stroke-dasharray="2 4"/>`; });
    fl.flechas.forEach(([a, b, t], i) => {
      const y = 40 + i * 34, x1 = xs[a], x2 = xs[b];
      s += `<line x1="${x1}" y1="${y}" x2="${x2 + (x2 > x1 ? -6 : 6)}" y2="${y}" stroke="${css('--gold')}" stroke-width="1.5" marker-end="url(#ar)"/><text x="${(x1 + x2) / 2}" y="${y - 6}" text-anchor="middle" style="fill:${css('--gold-soft')};font-size:11px;font-family:var(--font-body)">${t}</text>`;
    });
    fl.nodos.forEach((n, i) => { s += `<rect x="${xs[i] - 78}" y="${Hh - 52}" width="156" height="40" rx="10" fill="${css('--panel-solid')}" stroke="${css('--line-strong')}"/><text x="${xs[i]}" y="${Hh - 27}" text-anchor="middle" style="fill:${css('--fg')};font-size:12px;font-family:var(--font-body)">${n}</text>`; });
    return s + '</svg>';
  }
  // Bajada a tierra de cada relación de grupo, con las cifras de la simulación
  const GT_CASO = {
    'Holding': (st, x) => `los socios aportarían sus acciones de ${esc(st.empresaNombre || 'la empresa')}${x.key === 'patrimonial' ? ' y de la patrimonial' : x.key === 'filial' ? ' y la filial colgaría de ella' : ''} a una sociedad cabecera. Los dividendos suben a la holding casi sin impuestos y desde ahí se reinvierten en otra sociedad del grupo.`,
    'Préstamos intragrupo': (st, x) => `si la operativa tiene caja de sobra y la otra sociedad la necesita, puede prestársela con un contrato por escrito, a un interés de mercado (en torno al ${String(st.inversion.tipo).replace('.', ',')} % que te cobra el banco) y con calendario de devolución.`,
    'Gestión centralizada de tesorería': (st, x) => `las cuentas de las sociedades se barren cada día a una cuenta central: lo que sobra en una cubre lo que falta en otra sin tirar de póliza. Hoy tu punto más bajo de liquidez es ${F.eur(x.r.cajaRef)} en el mes ${x.r.mesCajaRef}.`,
    'Consolidación fiscal': (st, x) => `si lo nuevo pierde dinero el primer año y la operativa gana, las pérdidas de una restan del beneficio de la otra ese mismo año: se paga menos impuesto de sociedades (hoy un ${st.empresa.impuesto} %) mientras lo nuevo arranca.`,
    'Garantías cruzadas': (st, x) => `el banco pedirá seguramente que ${esc(st.empresaNombre || 'la empresa actual')} avale el préstamo de ${F.eur(x.r.loan || st.inversion.importe * st.inversion.pctFin / 100)}. Si lo hace, buena parte del aislamiento del riesgo se pierde: negocia el aval limitado a un importe o a un plazo.`,
    'Operaciones vinculadas': (st, x) => (x.key === 'patrimonial' ? `el alquiler de unos ${F.eur(x.r.p.alquiler)} al mes entre la patrimonial y la operativa tiene que estar a precio de mercado y documentado en un contrato; si no, Hacienda puede ajustarlo.` : 'cualquier servicio, alquiler o préstamo entre sociedades del grupo se factura a precio de mercado y se documenta.'),
    'Dividendos dentro del grupo': () => 'la filial reparte beneficio a la matriz o a la holding prácticamente sin tributar, y ese dinero puede financiar la siguiente inversión sin pasar por el bolsillo de los socios.',
    'Sucesión en la empresa familiar': () => 'separar el patrimonio (naves, terrenos) en una patrimonial y el negocio en la operativa facilita repartir entre herederos: quien trabaja en la empresa se queda con la operativa y el resto recibe rentas del alquiler.'
  };
  function openStruct(key) {
    const s = (ctx.structs || A.compareStructures(state, ctx.mods)).find((x) => x.key === key), I = A.STRUCTURE_INFO[key], r = s.r;
    const list = (a) => `<ul>${a.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    const el = openModal(`<div class="eyebrow">Vehículo societario</div><h2 style="font-size:1.9rem">${s.nombre}</h2>
      <p class="lede" style="margin-top:8px">${I.como}</p>
      <div class="chart mt">${flowSVG(I.flujo)}</div>
      <h4 class="mt">En tu caso</h4><p>${A.structCaso(state, s)}</p>
      <div class="mgrid mt">
        <div><span>Liquidez mínima</span><b>${F.eur(r.cajaRef)}</b><small>el punto más bajo de dinero disponible, mes ${r.mesCajaRef}</small></div><div><span>Recuperación</span><b>${F.months(r.payback)}</b><small>lo que tarda lo nuevo en devolver lo invertido</small></div>
        <div><span>Tamaño pleno <button class="info-i" data-info="st-pleno" aria-label="Qué es">?</button></span><b>mes ${s.mesPleno}${s.enPlazo ? '' : ' (fuera de plazo)'}</b><small>cuando lo nuevo vende el 100 % previsto</small></div><div><span>Metas cumplidas <button class="info-i" data-info="st-metas" aria-label="Qué es">?</button></span><b>${s.metasOk} de 5</b><small>${r.metas.map((m) => `${m.ok ? '✓' : '✗'} ${m.nombre.toLowerCase()}`).join(' · ')}</small></div>
        <div><span>Control <button class="info-i" data-info="st-control" aria-label="Qué es">?</button></span><b>${s.control} %</b><small>${s.control === 100 ? 'decidís solo los socios actuales' : s.control >= 65 ? 'entra un socio minoritario' : 'lo compartes a medias'}</small></div><div><span>Puesta en marcha <button class="info-i" data-info="st-marcha" aria-label="Qué es">?</button></span><b>${I.plazo}</b></div>
      </div>
      <h4 class="mt">Por qué tiene un encaje de ${Math.round(s.score)} sobre 100 <button class="info-i" data-info="st-encaje" aria-label="Qué es">?</button></h4>
      <div class="stack small">${s.desglose.map((x) => `<div class="mfrow"><span>${x.n}</span><span class="track"><b style="width:${x.v / x.max * 100}%"></b></span><span class="num">${Math.round(x.v)} / ${x.max}</span></div><p class="muted" style="margin:-4px 0 4px">${x.d}</p>`).join('')}</div>
      <p class="small muted">${s.score >= 70 ? 'Encaja bien con tus objetivos.' : s.score >= 50 ? 'Encaja con matices: mira los criterios con la barra más corta.' : 'No encaja con tus objetivos tal como están.'} El óptimo sería 100: liquidez por encima de la meta, en plazo, control total, riesgo aislado, sencillo y las cinco metas cumplidas; ningún vehículo lo tiene todo.</p>
      <div class="grid cols-2 mt">
        <div><h4>Ventajas</h4>${list(I.ventajas)}</div>
        <div><h4>Inconvenientes</h4>${list(I.inconvenientes)}</div>
      </div>
      <h4>Fiscalidad (orientativa, España)</h4>${list(I.fiscal)}
      <h4>Requisitos</h4>${list(I.requisitos)}
      <div class="grid cols-2"><div><h4>Coste</h4><p>${I.coste}</p></div><div><h4>Cuándo conviene</h4><p>${I.conviene}</p></div></div>
      <h4>Riesgos</h4>${list(I.riesgos)}
      <h4>Pasos para ponerla en marcha</h4><ol>${I.pasos.map((x) => `<li>${x}</li>`).join('')}</ol>
      <h4>Si formas un grupo de sociedades</h4><p class="small muted" style="margin-top:0">Cuestiones que aparecen cuando hay más de una sociedad (por ejemplo, la operativa y la patrimonial). Toca una para ver qué significa en la práctica.</p><div class="chips">${A.GROUP_TOPICS.map((g, i) => `<button class="vchip ind" data-gt="${i}">${g.t}</button>`).join('')}</div><p class="small" id="gtText"></p>
      <p class="note">Orientativo para preparar la conversación con asesores fiscal y legal. No sustituye su dictamen.</p>
      <div class="row mt"><button class="btn solid" id="stAdopt">${key === state.estructura ? 'Es la estructura actual' : 'Adoptar esta estructura'}</button><button class="btn" id="stAsk">Preguntar al asistente</button></div>`);
    $$('[data-gt]', el).forEach((b) => b.onclick = () => { const g = A.GROUP_TOPICS[+b.dataset.gt]; $('#gtText', el).innerHTML = `<b>${g.t}.</b> ${g.d}${GT_CASO[g.t] ? ` <br><span class="muted">En la práctica: ${GT_CASO[g.t](state, s)}</span>` : ''}`; });
    $('#stAdopt', el).onclick = () => { state.estructura = key; closeModal(); toast('Estructura adoptada: ' + s.nombre); schedule(); };
    $('#stAsk', el).onclick = () => { closeModal(); A.assistant && A.assistant.ask(`Explícame la estructura «${s.nombre}» aplicada a mi caso y cómo se relacionan las sociedades del grupo.`); };
  }

  /* ---------------- Meta y plan ---------------- */
  const TARGETS = [
    { p: 'meta.cajaMin', n: 'Liquidez mínima', key: 'cajaMin', min: 0, max: 1500000, step: 10000, f: F.eur },
    { p: 'meta.paybackMax', n: 'Recuperación máx.', key: 'payback', min: 1, max: 12, step: 0.5, f: (v) => String(v).replace('.', ',') + ' años' },
    { p: 'meta.dscrMin', n: 'Cobertura mínima', key: 'dscr', min: 1, max: 3, step: 0.05, f: (v) => (Math.round(v * 100) / 100).toString().replace('.', ',') + '×' },
    { p: 'meta.deudaEbitdaMax', n: 'Deuda/EBITDA máx.', key: 'deuda', min: 1, max: 6, step: 0.1, f: F.x },
    { p: 'meta.pesoSalarialMax', n: 'Peso salarial máx.', key: 'salarial', min: 5, max: 70, step: 0.5, f: F.pct },
    { p: 'meta.plazoObjetivo', n: 'Tamaño pleno antes de', key: null, min: 6, max: 60, step: 1, f: (v) => 'mes ' + v }
  ];
  // Referencia de cada meta: lo que se considera sano para una empresa de este sector y tamaño
  function refMeta(t) {
    const sec = A.SECTORS[state.sector], r = ctx.active, inv = state.inversion;
    return {
      'meta.cajaMin': { v: Math.round(r.colchon / 10000) * 10000, txt: `Al menos dos meses de gastos fijos y personal: ${F.eur(r.colchon)}. Es el colchón para pagar nóminas si un cliente grande se retrasa.` },
      'meta.paybackMax': { v: Math.min(7, Math.max(2, Math.round(inv.vidaUtil / 2 * 2) / 2)), txt: `Menos de la mitad de la vida útil de lo que compras (${String(inv.vidaUtil).replace('.', ',')} años). Las pymes suelen pedir entre 3 y 5 años.` },
      'meta.dscrMin': { v: 1.25, txt: 'La banca pide que el negocio genere al menos 1,25 veces lo que pagas de cuotas; 1,5 es holgado y por debajo de 1 no llega.' },
      'meta.deudaEbitdaMax': { v: sec.deudaEbitdaMax, txt: `En ${sec.nombre.toLowerCase()}, hasta ${String(sec.deudaEbitdaMax).replace('.', ',')} veces el EBITDA. Por encima de 3, la banca endurece condiciones.` },
      'meta.pesoSalarialMax': { v: sec.pesoSalarialMax, txt: `En ${sec.nombre.toLowerCase()}, el personal no debería pasar del ${sec.pesoSalarialMax} % de las ventas.` },
      'meta.plazoObjetivo': { v: Math.max(12, Math.min(36, state.inversion.mesInicio + sec.rampa + 6)), txt: `En tu sector la rampa típica es de ${sec.rampa} meses: tamaño pleno hacia el mes ${state.inversion.mesInicio + sec.rampa} si todo va bien; la referencia deja seis meses de margen.` }
    }[t.p];
  }
  function renderPlan() {
    const Pl = ctx.plan, metas = Pl.antes.metas;
    $('#targets').innerHTML = TARGETS.map((t, i) => {
      const m = t.key ? metas.find((x) => x.key === t.key) : null;
      const now = m ? m.f(m.valor) : `mes ${ctx.active.tamano.mesCrucero}`;
      const ok = m ? m.ok : ctx.active.tamano.mesCrucero <= state.meta.plazoObjetivo;
      const rf = refMeta(t);
      return `<div class="target-tile"><div class="t"><span>${t.n}</span></div><div class="now"><span>${now}</span><span class="state ${stCls(ok ? 'ok' : 'stop')}">${ok ? 'Cumple' : 'Falla'}</span></div><div class="obj">meta: <b id="tv${i}">${t.f(getPath(t.p))}</b> · referencia: ${t.f(rf.v)}</div><input type="range" id="tg${i}" min="${t.min}" max="${t.max}" step="${t.step}" value="${getPath(t.p)}" aria-label="${t.n}"><div class="ref">${rf.txt}</div></div>`;
    }).join('') + `<div class="target-tile" style="display:grid;align-content:center;gap:8px"><p class="small" style="margin:0">¿No sabes qué meta poner? Usa las referencias de tu sector y tamaño y ajústalas después.</p><button class="btn" id="usarRefs">Usar las referencias</button></div>`;
    $('#usarRefs').onclick = () => { TARGETS.forEach((t) => setPath(t.p, refMeta(t).v)); toast('Metas puestas con las referencias del sector'); schedule(); };
    TARGETS.forEach((t, i) => {
      const r = $('#tg' + i);
      r.style.setProperty('--p', ((getPath(t.p) - t.min) / (t.max - t.min)) * 100 + '%');
      r.addEventListener('input', () => { setPath(t.p, parseFloat(r.value)); $('#tv' + i).textContent = t.f(parseFloat(r.value)); r.style.setProperty('--p', ((r.value - t.min) / (t.max - t.min)) * 100 + '%'); schedule(); });
    });
    const sc = A.SCENARIOS.find((s) => s.key === state.escenario);
    let sum = '';
    if (Pl.ok) sum = `<div class="note">El escenario ${sc.nombre.toLowerCase()} ya alcanza la posición meta. No hace falta corregir.</div>`;
    else if (Pl.alcanzado) sum = `<div class="note">Con ${Pl.acciones.length} palanca${Pl.acciones.length > 1 ? 's' : ''} el escenario ${sc.nombre.toLowerCase()} alcanza todas las metas.</div>`;
    else sum = `<div class="note">${Pl.acciones.length ? 'Estas palancas corrigen lo corregible. ' : ''}${Pl.inalcanzables && Pl.inalcanzables.length ? `<b>${Pl.inalcanzables.map((m) => m.nombre).join(', ')}</b> no se alcanza${Pl.inalcanzables.length > 1 ? 'n' : ''} solo con palancas en el escenario ${sc.nombre.toLowerCase()}: hay que rediseñar el proyecto (estructura, tamaño o tesis comercial).` : ''}</div>`;
    if (!Pl.ok && Pl.acciones.length) sum += `<div class="row mt"><button class="btn solid" id="applyPlan">Aplicar el plan al simulador</button><button class="btn ghost" data-info="plan-help">Cómo se calcula</button></div>`;
    sum = `<p class="small muted" style="margin:0 0 8px">El plan se calcula sobre el escenario ${sc.nombre.toLowerCase()} y el vehículo actual (${esc(A.STRUCTURES[state.estructura].nombre.toLowerCase())}). No cambia de vehículo: eso se compara en «Estructuras». Si adoptas otro, el plan se recalcula.</p>` + sum;
    $('#planSummary').innerHTML = sum;
    INFO['plan-help'] = { t: 'Cómo se calcula el plan', d: 'En cada ronda Atalaya prueba todas las palancas y elige la que más acerca a la meta por unidad de esfuerzo (negociar con el banco cuesta menos que aportar capital). Después repasa el plan hacia atrás y devuelve cada palanca al mínimo imprescindible.' };
    $('#planSteps').innerHTML = Pl.acciones.map((a) => `<div class="step"><div><div class="what">${a.lv.nombre}</div><div class="how">${lvTxt(a.lv, a.desde, a.hasta)} · ${a.lv.resp}</div></div><div class="eff">${F.eur(a.antes.cajaRef)} → ${F.eur(a.despues.cajaRef)}<small>liquidez mínima</small></div></div>`).join('');
    const ap = $('#applyPlan');
    if (ap) ap.onclick = applyPlan;
    $('#leverTable').innerHTML = Pl.ok ? '<p class="small muted">Sin metas que corregir.</p>' : `<p class="small muted" style="margin:0">Moviendo una sola palanca, ¿cuánto haría falta para cumplir todas las metas? «Sí» significa que esa palanca sola basta; «No», que llegaría hasta ahí y aún faltaría.</p><table><thead><tr><th style="text-align:left">Palanca</th><th>Hoy</th><th>Hasta</th><th style="text-align:left">Qué significa</th><th>¿Basta sola?</th></tr></thead><tbody>` +
      Pl.individuales.map((x) => `<tr><td style="text-align:left">${x.lv.nombre}</td><td>${A.report.lv(x.lv, x.desde)}</td><td>${A.report.lv(x.lv, x.hasta)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body);min-width:200px" class="small">${lvTxt(x.lv, x.desde, x.hasta)}</td><td><span class="state ${stCls(x.basta ? 'ok' : 'warn')}">${x.basta ? 'Sí' : 'No'}</span></td></tr>`).join('') + '</tbody></table>';
  }
  // Cada palanca en lenguaje llano: qué hay que hacer exactamente
  function lvTxt(lv, a, b) {
    const L = (v) => A.report.lv(lv, v), d = Math.abs(b - a), eu = (v) => F.eurFull(v);
    switch (lv.key) {
      case 'polizaLimite': return a ? `Ampliar la póliza de ${eu(a)} a <b>${eu(b)}</b> (${eu(d)} más de límite)` : `Contratar una póliza de <b>${eu(b)}</b>`;
      case 'pctFin': return `Pedir al banco el <b>${L(b)}</b> de la inversión en lugar del ${L(a)} (${F.eur(state.inversion.importe * d / 100)} más de préstamo)`;
      case 'plazo': return `Pedir el préstamo a <b>${L(b)}</b> en lugar de ${L(a)}: cuota más baja`;
      case 'carencia': return `Negociar <b>${L(b)}</b> de carencia (solo intereses) en lugar de ${L(a)}`;
      case 'dso': return `Cobrar a <b>${L(b)}</b> en lugar de ${L(a)}`;
      case 'dpo': return `Pagar a proveedores a <b>${L(b)}</b> en lugar de ${L(a)}`;
      case 'anticipo': return `Contratar con <b>${L(b)}</b> en lugar de ${L(a)}: escalonar las incorporaciones`;
      case 'fijosNuevos': return `Dejar los fijos nuevos en <b>${L(b)}</b> en lugar de ${L(a)}`;
      case 'margenNuevo': return `Subir el margen de lo nuevo al <b>${L(b)}</b> (precio o compras)`;
      case 'importe': return `Invertir ahora <b>${L(b)}</b> y dejar ${F.eur(d)} para una segunda fase`;
      case 'aportacion': return `Que los socios aporten <b>${L(b)}</b>`;
      default: return `De ${L(a)} a <b>${L(b)}</b>`;
    }
  }
  function applyPlan() {
    if (!ctx.plan || ctx.plan.ok || !ctx.plan.acciones.length) return false;
    ctx.plan.acciones.forEach((a) => { const [x, y] = a.lv.path; state[x][y] = a.hasta; });
    syncFields(); toast('Plan aplicado: revisa los semáforos'); schedule();
    return true;
  }

  /* ---------------- 3D ---------------- */
  let has3D = false;
  function setup3D() {
    has3D = A.scene.init({ onPick: (info, ev) => {
      if (info.traj) return;
      const c = info.cell, ax = A.AXES[info.ax], ay = A.AXES[info.ay];
      const fv = (a, v) => (a.unidad === '€' ? F.eur(v) : `${Math.round(v * 10) / 10} ${a.unidad}`);
      const el = openCard(null, { getBoundingClientRect: () => ({ left: ev.clientX, right: ev.clientX, top: ev.clientY, bottom: ev.clientY }) }, {
        t: 'Fijar esta combinación', d: `${ax.nombre}: ${fv(ax, c.x)} · ${ay.nombre}: ${fv(ay, c.y)}. Liquidez mínima ${F.eur(c.cajaMin)}, recuperación ${F.months(c.payback)}.`,
        html: '<div class="actions"><button class="btn solid" id="pickApply">Aplicar al plan</button></div>'
      });
      $('#pickApply', el).onclick = () => { applyCell(info.ax, info.ay, c); card.hidden = true; };
    } });
    const vs = $('#viewSeg');
    vs.innerHTML = '<button data-m="surface">Paisaje</button><button data-m="traj">Trayectorias</button>';
    vs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; view.mode = b.dataset.m; render3D(); if (view.mode === 'surface') { gen++; computeHeavy(gen); } });
    const opt = (o, sel) => Object.keys(o).map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${o[k].nombre}</option>`).join('');
    $('#axX').innerHTML = opt(A.AXES, view.ax); $('#axY').innerHTML = opt(A.AXES, view.ay); $('#metricSel').innerHTML = opt(A.METRICS, view.metric);
    ['axX', 'axY', 'metricSel'].forEach((id) => $('#' + id).addEventListener('change', () => {
      view.ax = $('#axX').value; view.ay = $('#axY').value; view.metric = $('#metricSel').value;
      if (view.ax === view.ay) { view.ay = Object.keys(A.AXES).find((k) => k !== view.ax); $('#axY').value = view.ay; }
      renderHorizPreg(); gen++; computeHeavy(gen);
    }));
    $('#hzExperto').onclick = () => { const c = $('#surfaceCtl'); c.hidden = !c.hidden; $('#hzExperto').textContent = c.hidden ? 'Elegir yo los ejes (modo experto)' : 'Ocultar el modo experto'; };
    renderHorizPreg();
  }
  function applyCell(axk, ayk, c) {
    const ax = A.AXES[axk], ay = A.AXES[ayk];
    const r1 = ax.unidad === '€' ? 10000 : 1, r2 = ay.unidad === '€' ? 10000 : 1;
    state[ax.path[0]][ax.path[1]] = Math.round(c.x / r1) * r1;
    state[ay.path[0]][ay.path[1]] = Math.round(c.y / r2) * r2;
    syncFields(); toast('Combinación aplicada'); schedule();
  }
  function render3D() {
    $$('#viewSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === view.mode));
    if (view.mode !== 'surface') $('#surfaceCtl').hidden = true;
    const lg = $('#legend3d');
    if (view.mode === 'surface') {
      lg.innerHTML = `<span><i style="background:var(--go)"></i>Cumple la meta</span><span><i style="background:var(--warn)"></i>Zona de vigilancia</span><span><i style="background:var(--stop)"></i>Rompe el límite</span><span><i style="background:var(--gold);height:2px"></i>Plano de la meta · esfera: tu plan</span>`;
      if (has3D && ctx.surface) A.scene.surface(ctx.surface, state);
    } else {
      lg.innerHTML = ctx.all.map((x) => `<span><i style="background:${A.seriesColor(x.i)}"></i>${x.nombre}</span>`).join('') + `<span><i style="background:var(--stop);height:2px"></i>Suelo de liquidez</span>`;
      if (has3D) A.scene.trajectories(ctx.all.map((x) => ({ name: x.nombre, data: x.r.w.liquidez, color: A.seriesColor(x.i), active: x.key === state.escenario })), state);
    }
  }
  function renderTerrainRead() {
    const sf = ctx.surface; if (!sf) return;
    const M = A.METRICS[sf.metric], ax = A.AXES[sf.ax], ay = A.AXES[sf.ay];
    const thr = M.threshold(state);
    const good = (v) => (M.better > 0 ? v >= thr : v <= thr);
    const cells = sf.grid.flat();
    const greenPct = Math.round((cells.filter((c) => good(c.v)).length / cells.length) * 100);
    const nx = (v) => (v - sf.x0) / (sf.x1 - sf.x0 || 1), ny = (v) => (v - sf.y0) / (sf.y1 - sf.y0 || 1);
    let cur = null, best = null, bd = Infinity;
    cells.forEach((c) => { const d = Math.hypot(nx(c.x) - nx(sf.cx), ny(c.y) - ny(sf.cy)); if (!cur || d < cur.d) cur = { c, d }; });
    cells.filter((c) => good(c.v)).forEach((c) => { const d = Math.hypot(nx(c.x) - nx(sf.cx), ny(c.y) - ny(sf.cy)); if (d < bd) { bd = d; best = c; } });
    const fv = (a, v) => (a.unidad === '€' ? F.eur(v) : `${String(Math.round(v * 10) / 10).replace('.', ',')} ${a.unidad}`);
    const inGreen = good(cur.c.v);
    const dx = best && Math.abs(best.x - sf.cx) > (sf.x1 - sf.x0) * 0.02, dy = best && Math.abs(best.y - sf.cy) > (sf.y1 - sf.y0) * 0.02;
    let html = `<p>Con ${ax.nombre.toLowerCase()} en <b>${fv(ax, sf.cx)}</b> y ${ay.nombre.toLowerCase()} en <b>${fv(ay, sf.cy)}</b>, tu ${M.nombre.toLowerCase()} es <b>${M.fmt(cur.c.v)}</b> (meta: ${M.fmt(thr)}). ${inGreen ? 'Estás en terreno verde.' : 'Estás fuera del verde.'}</p>`;
    html += `<p>El <b>${greenPct} %</b> del terreno cumple la meta. ${greenPct < 25 ? 'Es un terreno estrecho: pocas combinaciones funcionan y la decisión tiene poco margen de error.' : greenPct > 60 ? 'Es un terreno amplio: la decisión aguanta errores en estas dos variables.' : 'Hay margen, pero no mucho.'}</p>`;
    if (!inGreen && best && (dx || dy)) html += `<p><b>Camino más corto al verde:</b> ${dx ? `${ax.nombre.toLowerCase()} a ${fv(ax, best.x)}` : ''}${dx && dy ? ' y ' : ''}${dy ? `${ay.nombre.toLowerCase()} a ${fv(ay, best.y)}` : ''}, con ${M.nombre.toLowerCase()} de ${M.fmt(best.v)}.</p><button class="btn" id="goGreen">Aplicar ese punto</button>`;
    else if (!inGreen) html += '<p>Ninguna combinación de estas dos variables alcanza la meta: prueba con otros ejes o revisa el plan de corrección.</p>';
    $('#terrainRead').innerHTML = html;
    const gg = $('#goGreen'); if (gg) gg.onclick = () => applyCell(sf.ax, sf.ay, best);
  }

  /* ---------------- Historia: cuentas de varios años ---------------- */
  function renderFin() {
    const out = $('#finOut');
    const an = A.fin.analyze(state.historico);
    if (!an) { out.innerHTML = '<div class="glass pad small muted">Todavía no hay cuentas cargadas. Adjunta un Excel o CSV, pega la tabla o carga el ejemplo para ver cómo funciona.</div>'; return; }
    const R = an.rows;
    const head = `<tr><th>Magnitud</th>${R.map((r) => `<th>${r.anio}</th>`).join('')}${an.proj.map((p) => `<th class="proj">${p.anio} <small>proy.</small></th>`).join('')}</tr>`;
    const line = (n, k, f, pk) => `<tr><td>${n}</td>${R.map((r) => `<td>${r[k] === null || !isFinite(r[k]) ? '—' : f(r[k])}</td>`).join('')}${an.proj.map((p) => `<td class="proj">${pk && isFinite(p[pk]) ? f(p[pk]) : ''}</td>`).join('')}</tr>`;
    const days = (v) => Math.round(v) + ' d';
    out.innerHTML = `${state.historico.ejemplo ? '<p class="small muted">Datos de ejemplo. Sustitúyelos por las cuentas de tu empresa.</p>' : ''}
      <div class="kpis" style="margin-top:0">
        <div class="kpi"><div class="k"><span>Crecimiento anual</span></div><div class="v">${F.pct(an.cagr)}</div><div class="d">${R[0].anio}-${an.last.anio}</div></div>
        <div class="kpi"><div class="k"><span>Crecimiento financiable</span></div><div class="v">${an.crecSostenible === null ? '—' : F.pct(an.crecSostenible)}</div><div class="d">con beneficios y sin más deuda</div></div>
        <div class="kpi"><div class="k"><span>EBITDA último año</span></div><div class="v">${F.eur(an.last.ebitda)}</div><div class="d">${F.pct(an.last.ebitdaPct)} sobre ventas</div></div>
        <div class="kpi"><div class="k"><span>Deuda neta / EBITDA</span></div><div class="v">${an.last.dfnEbitda === null ? '—' : F.x(Math.max(0, an.last.dfnEbitda))}</div><div class="d">${an.last.dfn < 0 ? 'más caja que deuda' : 'deuda neta ' + F.eur(an.last.dfn)}</div></div>
        <div class="kpi"><div class="k"><span>Payout medio</span></div><div class="v">${an.payoutAvg === null ? '—' : F.pct(an.payoutAvg)}</div><div class="d">beneficio repartido</div></div>
      </div>
      <div class="grid cols-2 mt">
        <div class="glass pad stack"><h4>Evolución y proyección a tres años</h4><div class="chart" id="finChart"></div><p class="small muted">Las columnas claras son proyección: ventas al ritmo histórico (acotado) y márgenes con la mitad de su tendencia.</p></div>
        <div class="glass pad stack"><h4>Políticas de gobierno que reflejan los números</h4>${an.politicas.map((p) => `<div class="policy"><span class="state ${stCls(p.estado)}">${stName[p.estado]}</span><div><b>${p.nombre}</b><p class="small">${p.lectura}</p><p class="small muted">${p.recomendacion}</p></div></div>`).join('')}</div>
      </div>
      <div class="glass pad mt stack" id="moneyFlow"></div>
      <div class="glass pad mt"><h4>Ratios por año</h4><div class="table-wrap"><table>${head}<tbody>
        ${line('Ventas', 'ventas', F.eur, 'ventas')}${line('Crecimiento', 'crec', F.pct)}${line('Margen bruto', 'margenPct', F.pct, 'margenPct')}${line('EBITDA', 'ebitda', F.eur, 'ebitda')}${line('EBITDA sobre ventas', 'ebitdaPct', F.pct, 'ebitdaPct')}
        ${line('Beneficio neto', 'bn', F.eur)}${line('Peso salarial', 'pesoSalarial', F.pct, 'pesoSalarial')}${line('Ventas por persona', 'ventasPersona', F.eur)}
        ${line('Días de cobro', 'dso', days, 'dso')}${line('Días de stock', 'dio', days)}${line('Días de pago', 'dpo', days)}${line('Fondo de maniobra', 'fondoManiobra', F.eur)}
        ${line('Liquidez (AC/PC)', 'liquidez', F.x)}${line('Deuda neta / EBITDA', 'dfnEbitda', (v) => (v < 0 ? 'caja neta' : F.x(v)))}${line('Deuda / fondos propios', 'endeudamiento', F.x)}
        ${line('ROE', 'roe', F.pct)}${line('ROA', 'roa', F.pct)}${line('Payout', 'payout', F.pct)}${line('Reinversión / amortización', 'reinversion', F.x)}${line('Autofinanciación', 'autofinanciacion', F.eur)}
      </tbody></table></div></div>`;
    const all = R.map((r) => ({ anio: r.anio, v: r.ventas, e: r.ebitda })).concat(an.proj.map((p) => ({ anio: p.anio, v: p.ventas, e: p.ebitda, p: true })));
    const W = 520, Hh = 220, m = { l: 56, r: 10, t: 10, b: 26 }, mx = Math.max(...all.map((a) => a.v)) * 1.08, bw = (W - m.l - m.r) / all.length;
    const y = (v) => m.t + (1 - Math.max(0, v) / mx) * (Hh - m.t - m.b);
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Ventas y EBITDA por año"><g class="grid">`;
    [0, 0.25, 0.5, 0.75, 1].forEach((k) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(mx * k)}" y2="${y(mx * k)}"/><text x="${m.l - 6}" y="${y(mx * k) + 3}" text-anchor="end">${F.eur(mx * k)}</text>`; });
    svg += '</g>';
    all.forEach((a, i) => {
      const x = m.l + i * bw;
      svg += `<rect x="${x + bw * 0.12}" y="${y(a.v)}" width="${bw * 0.42}" height="${Hh - m.b - y(a.v)}" rx="3" fill="${css('--s1')}" opacity="${a.p ? 0.4 : 0.9}"/>`;
      svg += `<rect x="${x + bw * 0.56}" y="${y(a.e)}" width="${bw * 0.3}" height="${Math.max(1, Hh - m.b - y(a.e))}" rx="3" fill="${css('--gold')}" opacity="${a.p ? 0.4 : 0.95}"/>`;
      svg += `<text x="${x + bw / 2}" y="${Hh - 8}" text-anchor="middle">${a.anio}</text>`;
    });
    $('#finChart').innerHTML = svg + `</svg><div class="chart-legend small"><span><i style="background:${css('--s1')}"></i> ventas</span><span><i style="background:${css('--gold')}"></i> EBITDA</span></div>`;
    renderMoneyFlow();
  }
  let mfIdx = null;
  function renderMoneyFlow() {
    const host = $('#moneyFlow'); if (!host) return;
    const Y = state.historico.anios;
    if (Y.length < 2) { host.innerHTML = '<h4>¿Dónde está el beneficio?</h4><p class="small muted">Carga al menos dos años para auditar el flujo del dinero.</p>'; return; }
    if (mfIdx === null || mfIdx >= Y.length || mfIdx < 1) mfIdx = Y.length - 1;
    const mf = A.fin.moneyFlow(state.historico, mfIdx);
    host.innerHTML = `<div class="row"><h4>Auditoría del flujo del dinero · ¿dónde está el beneficio?</h4><span class="spacer"></span><div class="seg" style="margin:0">${Y.slice(1).map((y, i) => `<button data-mf="${i + 1}" aria-pressed="${i + 1 === mfIdx}">${y.anio}</button>`).join('')}</div></div>
      <div class="grid cols-2"><div class="chart" id="mfChart"></div><div class="stack"><p>${mf.lectura.join(' ')}</p>
      <h4>De cada 100 € que generó el negocio</h4><div class="stack">${mf.destinos.map((d) => `<div class="mfrow"><span>${d.n}</span><span class="track"><b style="width:${d.pct}%"></b></span><span class="num">${Math.round(d.pct)} €</span></div>`).join('')}</div></div></div>`;
    $$('[data-mf]', host).forEach((b) => b.onclick = () => { mfIdx = +b.dataset.mf; renderMoneyFlow(); });
    // Cascada: del beneficio a la variación de caja
    const it = mf.items.filter((x) => Math.abs(x.v) > 1);
    const W = 560, rowH = 26, m = { l: 220, r: 70, t: 6, b: 30 }, Hh = m.t + m.b + (it.length + 1) * rowH;
    let acc = 0; const pts = it.map((x) => { const a = acc; acc += x.v; return { x, a, b: acc }; });
    const vals = pts.flatMap((p) => [p.a, p.b]).concat([0]);
    const mn = Math.min(...vals), mx = Math.max(...vals), sx = (v) => m.l + ((v - mn) / (mx - mn || 1)) * (W - m.l - m.r);
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Del beneficio a la caja"><line x1="${sx(0)}" x2="${sx(0)}" y1="0" y2="${Hh - m.b}" stroke="${css('--line-strong')}"/>`;
    pts.forEach((p, i) => {
      const y = m.t + i * rowH, x1 = sx(Math.min(p.a, p.b)), w = Math.max(2, Math.abs(sx(p.b) - sx(p.a)));
      const col = p.x.tipo === 'origen' ? css('--s3') : p.x.v >= 0 ? css('--s1') : css('--s2');
      svg += `<text x="${m.l - 8}" y="${y + 16}" text-anchor="end" style="font-family:var(--font-body);font-size:11px;fill:${css('--fg')}">${esc(p.x.n)}</text><rect class="mfb" data-i="${i}" x="${x1}" y="${y + 4}" width="${w}" height="${rowH - 8}" rx="3" fill="${col}"/><text x="${Math.max(sx(p.a), sx(p.b)) + 6}" y="${y + 16}">${p.x.v >= 0 ? '+' : ''}${F.eur(p.x.v)}</text>`;
    });
    const yC = m.t + pts.length * rowH;
    svg += `<text x="${m.l - 8}" y="${yC + 16}" text-anchor="end" style="font-family:var(--font-body);font-size:11px;font-weight:700;fill:${css('--gold-soft')}">Variación de la caja</text><rect x="${sx(Math.min(0, mf.cajaReal))}" y="${yC + 4}" width="${Math.max(2, Math.abs(sx(mf.cajaReal) - sx(0)))}" height="${rowH - 8}" rx="3" fill="${css('--gold')}"/><text x="${Math.max(sx(0), sx(mf.cajaReal)) + 6}" y="${yC + 16}">${F.eur(mf.cajaReal)}</text></svg>`;
    $('#mfChart').innerHTML = svg + `<div class="chart-legend small"><span><i style="background:${css('--s3')}"></i> lo que genera el negocio</span><span><i style="background:${css('--s2')}"></i> lo que consume caja</span><span><i style="background:${css('--s1')}"></i> lo que aporta caja</span></div>`;
    $$('#mfChart .mfb').forEach((b) => { const x = pts[+b.dataset.i].x; b.addEventListener('pointermove', (ev) => C.tip(`<h5>${esc(x.n)}</h5><div class="fv">${F.eur(x.v)}</div><p>${x.d}</p>`, ev.clientX, ev.clientY)); b.addEventListener('pointerleave', C.hideTip); });
  }
  function setupFin() {
    const status = (m, err) => { $('#finStatus').innerHTML = `<span style="color:${err ? 'var(--stop)' : 'var(--go)'}">${esc(m)}</span>`; };
    const accept = (res, origen) => {
      const prev = state.historico && !state.historico.ejemplo && state.historico.anios ? state.historico.anios : [];
      res.anios.forEach((a) => { const t = prev.find((x) => x.anio === a.anio); if (t) Object.assign(t, a); else prev.push(a); });
      prev.sort((a, b) => a.anio - b.anio);
      state.historico = { anios: prev, ejemplo: false };
      status(`${origen}: ${res.anios.length} año${res.anios.length > 1 ? 's' : ''} (${res.anios.map((a) => a.anio).join(', ')}), ${res.reconocidos} datos reconocidos.`);
      renderFin(); schedule();
    };
    let lastFiles = [];
    $('#finFile').addEventListener('change', async (e) => {
      lastFiles = Array.from(e.target.files || []);
      for (const f of lastFiles) {
        status('Leyendo ' + f.name + '…');
        try { const r = await A.fin.fromFile(f); accept(r, f.name + (r.ia ? ' (extraído con IA)' : '')); } catch (err) { status(f.name + ': ' + err.message, true); }
      }
      e.target.value = '';
      if (await A.docs.aiAvailable()) $('#finAI').hidden = !lastFiles.length;
    });
    $('#finAI').onclick = async () => { for (const f of lastFiles) { status('Releyendo ' + f.name + ' con IA…'); try { accept(await A.fin.fromFile(f, { ia: true }), f.name + ' (IA)'); } catch (err) { status(err.message, true); } } };
    $('#finVoice').onclick = async () => {
      status('Escuchando… di, por ejemplo: «ventas de 2024, 4,2 millones».');
      try {
        const t = await A.docs.dictate(); const d = A.fin.fromDictation(t);
        const anios = state.historico && !state.historico.ejemplo ? state.historico.anios : [];
        let y = anios.find((a) => a.anio === d.anio); if (!y) { y = { anio: d.anio }; anios.push(y); anios.sort((a, b) => a.anio - b.anio); }
        y[d.k] = d.v; state.historico = { anios, ejemplo: false };
        status(`«${t}» → ${A.fin.CONCEPTS.find((c) => c.k === d.k).l} ${d.anio}: ${F.eurFull(d.v)}`); renderFin(); schedule();
      } catch (err) { status(err.message, true); }
    };
    $('#finPaste').onclick = () => { const t = $('#finText'); t.hidden = !t.hidden; if (!t.hidden) t.focus(); };
    $('#finText').addEventListener('change', (e) => { try { accept(A.fin.fromText(e.target.value), 'Tabla pegada'); } catch (err) { status(err.message, true); } });
    $('#finTemplate').onclick = () => copy(A.fin.templateCSV(), 'Plantilla copiada: pégala en Excel, rellénala y adjúntala o pégala aquí');
    $('#finManual').onclick = () => {
      const g = $('#finGrid'); g.hidden = false;
      A.fin.mountGrid(g, state.historico, { empresa: state.empresa, onSave: (h) => { state.historico = h; g.hidden = true; status('Cuentas guardadas.' + (h.aviso ? ' ' + h.aviso : '')); renderFin(); schedule(); }, onCancel: () => { g.hidden = true; } });
    };
    $('#finExample').onclick = () => { state.historico = A.fin.example(); status('Ejemplo cargado.'); renderFin(); schedule(); };
    $('#finApply').onclick = () => {
      const an = A.fin.analyze(state.historico);
      if (!an) { status('Primero carga las cuentas.', true); return; }
      A.fin.applyToState(state, an); syncFields(); schedule(); toast(`Punto de partida actualizado con ${an.last.anio}`);
    };
    renderFin();
  }

  /* ---------------- Punto de partida: ficha, cuentas, preguntas ---------------- */
  const NOMBRE_EJEMPLO = 'Empresa de ejemplo, S.L.';
  const esEjemplo = () => state.ejemplo !== false && state.empresa.ventas === 4200000 && state.proyecto === 'Nueva línea de producción';
  function renderIdCard() {
    const opt = (o, sel) => Object.keys(o).map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${o[k].nombre}</option>`).join('');
    if (document.activeElement !== $('#heroSector')) $('#heroSector').innerHTML = opt(A.SECTORS, state.sector);
    if (document.activeElement !== $('#heroEstr')) $('#heroEstr').innerHTML = opt(A.STRUCTURES, state.estructura);
    const ej = $('#idEjemplo'), e = esEjemplo();
    ej.hidden = !e;
    if (e) ej.innerHTML = '<b>Estás viendo una empresa de ejemplo</b> (una industria de 4,2 M€ que estudia una línea de producción). Pulsa «Empezar de cero», responde las preguntas o carga tus cuentas para trabajar con la tuya.';
    $('#idCard').classList.toggle('vacia', !state.empresaNombre);
  }
  function nuevaSimulacion() {
    const el = openModal(`<div class="eyebrow">Punto cero</div><h2 style="font-size:1.8rem">Empezar una simulación nueva</h2>
      <p>Se borra lo que hay ahora en el simulador (nombre, cifras, inversión, escenarios propios e hipótesis). Si quieres conservarlo, guárdalo antes en la caja de herramientas.</p>
      <p>Después te haré unas preguntas para cargar tu empresa. Lo que no respondas se queda con el valor típico de tu sector y te lo marco como estimado.</p>
      <label class="field-sel"><span class="small muted">Sector principal</span><select class="input" id="ncSector">${Object.keys(A.SECTORS).map((k) => `<option value="${k}" ${k === state.sector ? 'selected' : ''}>${A.SECTORS[k].nombre}</option>`).join('')}</select></label>
      <div class="row mt"><button class="btn solid" id="ncGo">Empezar de cero</button><button class="btn" id="ncSave">Guardar la actual y empezar</button><button class="btn ghost" id="ncNo">Cancelar</button></div>`);
    const go = () => {
      const k = $('#ncSector', el).value;
      state = A.defaultState(); A.applySector(state, k);
      Object.assign(state, { empresaNombre: '', proyecto: '', ejemplo: false, hipotesis: [], opciones: [] });
      state.historico = undefined; delete state.historico;
      afterLoad(); closeModal(); openQuiz('empresa');
    };
    $('#ncGo', el).onclick = go;
    $('#ncSave', el).onclick = () => { const list = store.get(SNAP) || []; list.unshift({ name: state.proyecto || state.empresaNombre || 'Simulación', date: new Date().toLocaleDateString('es-ES'), state: A.clone(state) }); store.set(SNAP, list.slice(0, 12)); toast('Guardada en la caja de herramientas'); go(); };
    $('#ncNo', el).onclick = closeModal;
  }
  // Cuentas adjuntadas desde «La empresa hoy»: se guardan en la historia y se aplican al punto de partida
  async function cargarCuentas(files) {
    const out = $('#empCarga');
    const antes = A.clone(state.empresa);
    for (const f of files) {
      out.innerHTML = `<span class="muted">Leyendo ${esc(f.name)}…</span>`;
      try {
        const r = await A.fin.fromFile(f);
        const prev = state.historico && !state.historico.ejemplo && state.historico.anios ? state.historico.anios : [];
        r.anios.forEach((a) => { const t = prev.find((x) => x.anio === a.anio); if (t) Object.assign(t, a); else prev.push(a); });
        prev.sort((a, b) => a.anio - b.anio); state.historico = { anios: prev, ejemplo: false };
      } catch (err) { out.innerHTML = `<span style="color:var(--stop)">${esc(f.name)}: ${esc(err.message)}</span>`; return; }
    }
    const an = A.fin.analyze(state.historico);
    if (!an) { out.innerHTML = '<span style="color:var(--stop)">No he encontrado cifras de cuentas en esos archivos. Revisa que tengan los conceptos en una columna y los años en otra.</span>'; return; }
    A.fin.applyToState(state, an); state.ejemplo = false;
    if (state.empresaNombre === NOMBRE_EJEMPLO) state.empresaNombre = '';
    if (state.proyecto === 'Nueva línea de producción') state.proyecto = '';
    const campos = Object.values(FIELDS).flat().filter((f) => f.p.startsWith('empresa.'));
    const cambiados = campos.filter((f) => getPath(f.p) !== antes[f.p.split('.')[1]]);
    const noVienen = ['empresa.polizaLimite', 'empresa.cuotaDeuda', 'empresa.plantilla'].filter((p) => !cambiados.some((f) => f.p === p));
    renderFin(); syncFields(); schedule();
    out.innerHTML = `<p style="color:var(--go);margin:0">Cuentas de ${an.rows.map((x) => x.anio).join(', ')} cargadas. El punto de partida es ${an.last.anio}.</p>
      <p class="muted" style="margin:4px 0">He rellenado: ${cambiados.map((f) => f.l.toLowerCase()).join(', ') || 'nada nuevo'}.</p>
      ${noVienen.length ? `<div class="row"><span>Falta lo que no viene en las cuentas: ${noVienen.map((p) => A.fieldLabel(p).toLowerCase()).join(', ')}.</span><button class="btn" id="empFalta">Preguntármelo</button></div>` : ''}`;
    const b = $('#empFalta'); if (b) b.onclick = () => openQuiz('empresa', { solo: ['nombre', 'plantilla', 'cuota', 'poliza', 'polizaDisp'] });
  }

  /* Preguntas guiadas: cada respuesta marca los datos y la foto se actualiza al momento */
  function openQuiz(key, opts) {
    opts = opts || {};
    const Q = A.PREGUNTAS_SIM[key];
    let i = 0; const est = new Set(), resp = new Set();
    const lista = () => Q.lista(state).filter((q) => (!opts.solo || opts.solo.indexOf(q.id) >= 0) && (!q.cuando || q.cuando(state)));
    const fmtV = (q, v) => (v == null || v === '' ? '' : q.tipo === 'num' ? nfField.format(Math.round(v * 100) / 100) : v);
    const foto = () => {
      const r = ctx.active, e = state.empresa;
      if (key === 'empresa') {
        const eb = e.ventas * e.margen / 100 - e.personal - e.fijos;
        return `<div class="qz-foto"><div><span>Ventas</span><b>${F.eur(e.ventas)}</b></div><div><span>EBITDA hoy</span><b style="color:${eb < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(eb)}</b><small>${F.pct(e.ventas ? eb / e.ventas * 100 : 0)} de las ventas</small></div><div><span>Caja</span><b>${F.eur(e.caja)}</b><small>${fmtMeses(e.caja / Math.max(1, (e.personal + e.fijos) / 12))} de gastos</small></div><div><span>Deuda neta</span><b>${F.eur(e.deudaViva - e.caja)}</b><small>${eb > 0 ? F.x(Math.max(0, (e.deudaViva - e.caja) / eb)) + ' el EBITDA' : ''}</small></div></div>`;
      }
      if (key === 'humano') {
        const h = r.humano, st = h.score >= 70 ? 'ok' : h.score >= 50 ? 'warn' : 'stop';
        const peor = h.dims.slice().sort((a, b) => a.score - b.score)[0];
        return `<div class="qz-foto"><div><span>Tu equipo hoy</span><b style="color:${A.stateColor(st)}">${Math.round(h.score)}/100</b><small>${st === 'ok' ? 'preparado para crecer' : st === 'warn' ? 'preparado a medias' : 'todavía no está listo'}</small></div><div><span>Punto más débil</span><b style="font-size:1rem">${esc(peor.nombre)}</b><small>${Math.round(peor.score)}/100</small></div><div><span>Mandos necesarios</span><b>${h.mandosNecesarios}</b><small>tienes ${state.humano.mandos}</small></div></div>`;
      }
      const tot = A.lineasActivas(state).length;
      return `<div class="qz-foto"><div><span>Inversión</span><b>${F.eur(state.inversion.importe)}</b><small>${tot ? tot + ' línea' + (tot > 1 ? 's' : '') : 'un solo bloque'}</small></div><div><span>Liquidez mínima</span><b style="color:${r.cajaRef < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(r.cajaRef)}</b><small>mes ${r.mesCajaRef}</small></div><div><span>Recuperación</span><b>${F.months(r.payback)}</b></div><div><span>Veredicto</span><b style="font-size:1rem;color:${A.stateColor(vMap[r.verdict.key])}">${r.verdict.titulo}</b></div></div>`;
    };
    const progreso = (n, N) => {
      if (key !== 'humano') return '';
      const h = ctx.active.humano;
      const msg = n === 0 ? 'Empecemos: cada respuesta coloca una pieza de la foto de tu equipo.' : n < N / 2 ? `Vas por buen camino: ${n} de ${N}. La foto empieza a tomar forma.` : n < N ? `Te vas acercando a tu foto general: ${n} de ${N}.` : 'Foto completa.';
      return `<p class="qz-msg">${msg} Hoy tu equipo puntúa <b>${Math.round(h.score)}/100</b>.</p>`;
    };
    const fin = () => {
      const L = Q.lista(state).filter((q) => (!opts.solo || opts.solo.indexOf(q.id) >= 0));
      const marcados = L.filter((q) => resp.has(q.id)).flatMap((q) => q.marca || []);
      const sig = key === 'empresa' ? ['inversion', 'Seguir con la inversión'] : key === 'inversion' ? ['humano', 'Seguir con el equipo'] : null;
      const el = openModal(`<div class="eyebrow">${Q.titulo}</div><h2 style="font-size:1.8rem">Listo</h2>${foto()}
        <p>${resp.size} respuesta${resp.size === 1 ? '' : 's'}${est.size ? ` y ${est.size} dato${est.size > 1 ? 's' : ''} estimado${est.size > 1 ? 's' : ''} con el valor típico del sector (${L.filter((q) => est.has(q.id)).map((q) => (q.marca || [q.id])[0].toLowerCase()).join(', ')})` : ''}.</p>
        ${marcados.length ? `<p class="small muted">Datos marcados: ${marcados.join(', ')}.</p>` : ''}
        <div class="row mt">${sig ? `<button class="btn solid" id="qzSig">${sig[1]}</button>` : ''}<button class="btn" id="qzSem">Ver los semáforos</button><button class="btn ghost" id="qzClose">Cerrar</button></div>`);
      if (sig) $('#qzSig', el).onclick = () => openQuiz(sig[0]);
      $('#qzSem', el).onclick = () => { closeModal(); document.getElementById('riesgos').scrollIntoView({ behavior: 'smooth' }); };
      $('#qzClose', el).onclick = closeModal;
    };
    const aplicar = () => { state.ejemplo = false; normalizeInv(); syncFields(); computeQuick(); store.set(STORE, state); };
    const draw = () => {
      const L = lista(); if (i >= L.length) { schedule(); fin(); return; }
      const q = L[i], v = q.get(state), ops = typeof q.opciones === 'function' ? q.opciones() : (q.opciones || []);
      const multiSel = q.tipo === 'multi' ? new Set(v || []) : null;
      let entrada = '';
      if (q.tipo === 'texto') entrada = `<input class="input qz-in" id="qzIn" value="${esc(v || '')}">`;
      else if (q.tipo === 'num') entrada = `<div class="row"><input class="input qz-in qz-num" id="qzIn" inputmode="decimal" value="${esc(fmtV(q, v))}"><span class="muted">${esc(q.u || '')}</span></div>`;
      const chips = ops.length ? `<div class="qz-ops">${ops.map((o) => `<button class="chip" data-v="${esc(JSON.stringify(o.v))}" aria-pressed="${q.tipo === 'multi' ? multiSel.has(o.v) : JSON.stringify(o.v) === JSON.stringify(v)}">${esc(o.t)}</button>`).join('')}</div>` : '';
      const el = openModal(`<div class="eyebrow">${Q.titulo}</div>
        <div class="qz-prog" aria-hidden="true"><b style="width:${(i / L.length) * 100}%"></b></div>
        <p class="small muted" style="margin:6px 0 0">Pregunta ${i + 1} de ${L.length}${i === 0 && Q.lede ? ' · ' + Q.lede : ''}</p>
        ${progreso(i, L.length)}
        <h3 class="qz-q">${esc(q.q)}</h3>${q.ayuda ? `<p class="small muted">${esc(q.ayuda)}</p>` : ''}
        ${entrada}${chips}
        <p class="small qz-marca">Esto marca: ${(q.marca || []).join(', ')}${est.has(q.id) ? ' · <span style="color:var(--warn)">estimado</span>' : ''}</p>
        ${foto()}
        <div class="row mt"><button class="btn ghost" id="qzBack" ${i ? '' : 'disabled'}>Atrás</button><button class="btn ghost" id="qzNs">${q.estimar ? 'No lo sé: usar el típico' : 'Saltar'}</button><span class="spacer"></span><button class="btn ghost" id="qzEnd">Terminar</button><button class="btn solid" id="qzNext">Siguiente</button></div>`);
      const inp = $('#qzIn', el); if (inp) { inp.focus(); inp.select && inp.select(); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }); }
      const next = () => {
        if (q.tipo === 'multi') { q.set(state, Array.from(multiSel)); }
        else if (inp) {
          const raw = inp.value.trim();
          if (q.tipo === 'texto') q.set(state, raw);
          else { const n = parseInput(raw); if (!isFinite(n)) { inp.classList.add('err'); inp.focus(); return; } q.set(state, n); }
        }
        resp.add(q.id); est.delete(q.id); aplicar(); i++; draw();
      };
      $$('.qz-ops .chip', el).forEach((b) => b.onclick = () => {
        const val = JSON.parse(b.dataset.v);
        if (q.tipo === 'multi') { if (multiSel.has(val)) multiSel.delete(val); else multiSel.add(val); b.setAttribute('aria-pressed', multiSel.has(val)); return; }
        if (inp) { inp.value = fmtV(q, val); next(); return; }
        q.set(state, val); resp.add(q.id); est.delete(q.id); aplicar(); i++; draw();
      });
      $('#qzNext', el).onclick = () => { if (!inp && q.tipo !== 'multi') { i++; draw(); } else next(); };
      $('#qzBack', el).onclick = () => { if (i) { i--; draw(); } };
      $('#qzNs', el).onclick = () => { if (q.estimar) { q.set(state, q.estimar(state)); est.add(q.id); resp.delete(q.id); aplicar(); } i++; draw(); };
      $('#qzEnd', el).onclick = () => { schedule(); fin(); };
    };
    draw();
  }

  /* ---------------- Líneas de la inversión y opciones ---------------- */
  // El importe total y las líneas se mantienen cuadrados: si cambian las líneas manda su suma; si cambia el total
  // (una palanca, el paisaje 3D o la casilla), las líneas se reescalan en proporción
  function normalizeInv() {
    const inv = state.inversion, L = A.lineasActivas(state);
    if (!L.length) { delete inv._sumL; return; }
    const sum = L.reduce((a, l) => a + l.importe, 0);
    if (inv._sumL != null && Math.abs(sum - inv._sumL) < 1 && Math.abs(inv.importe - sum) > 1) {
      const k = inv.importe / sum; L.forEach((l) => { l.importe = Math.round(l.importe * k / 100) * 100; });
    }
    const s2 = L.reduce((a, l) => a + l.importe, 0);
    inv.importe = s2; inv._sumL = s2;
    inv.vidaUtil = Math.max(1, Math.round(L.reduce((a, l) => a + l.importe * (l.vida || inv.vidaUtil), 0) / s2 * 10) / 10);
  }
  const finTxt = (f) => (f ? `${f.pctFin} % a ${String(f.plazo).replace('.', ',')} años, ${String(f.tipo).replace('.', ',')} %${f.carencia ? `, ${f.carencia} m de carencia` : ''}` : 'la general');
  function renderLineas() {
    const host = $('#lineasBox'); if (!host) return;
    const inv = state.inversion, L = inv.lineas || [], T = (ctx && ctx.active.w.tramos) || [];
    document.body.classList.toggle('con-lineas', A.lineasActivas(state).length > 0);
    const tip = (k) => Object.keys(A.LINEA_TIPOS).map((t) => `<option value="${t}" ${t === k ? 'selected' : ''}>${A.LINEA_TIPOS[t].n}</option>`).join('');
    const cuotaDe = (l) => { const t = T.find((x) => x.nombre === l.nombre); return t ? t.cuota : null; };
    host.innerHTML = `<div class="row"><h4>Mapa de la inversión</h4><span class="spacer"></span><button class="btn" id="lnAdd">Añadir línea</button><button class="btn solid" id="qInv">Responder preguntas</button></div>
      <p class="small muted" style="margin:0">${L.length ? 'Cada activo con su importe, el mes en que se paga, los años que dura y su financiación. Lo que no tenga financiación propia usa la general (casillas de abajo).' : 'Ahora la inversión es un único bloque. Si lleva varias cosas (una máquina, un vehículo, una nave), añade una línea por cada una: cada activo tiene su precio, su fecha, su vida útil y su forma de pagarlo.'}</p>
      ${L.length ? `<div class="table-wrap"><table class="ln-tab"><thead><tr><th></th><th style="text-align:left">Línea</th><th style="text-align:left">Tipo</th><th>Importe</th><th>Mes</th><th>Vida útil</th><th style="text-align:left">Financiación</th><th>Cuota/mes</th><th></th></tr></thead><tbody>
        ${L.map((l, i) => `<tr data-i="${i}" class="${l.activa === false ? 'off' : ''}"><td><button class="switch" role="switch" aria-checked="${l.activa !== false}" aria-label="Incluir esta línea" data-k="activa"></button></td>
          <td style="text-align:left"><input class="input" data-k="nombre" value="${esc(l.nombre)}" style="min-width:140px"></td>
          <td style="text-align:left"><select class="input" data-k="tipo">${tip(l.tipo)}</select></td>
          <td><input class="input num" data-k="importe" value="${nfField.format(l.importe)}" style="width:110px"></td>
          <td><input class="input num" data-k="mes" value="${l.mes || inv.mesInicio}" style="width:56px"></td>
          <td><input class="input num" data-k="vida" value="${l.vida || ''}" style="width:56px"> <span class="small muted">años</span></td>
          <td style="text-align:left"><button class="btn ghost small" data-fin="${i}">${esc(finTxt(l.fin))}</button></td>
          <td>${l.activa === false ? '—' : cuotaDe(l) == null ? '—' : F.eur(cuotaDe(l))}</td>
          <td><button class="icon-btn" data-del="${i}" aria-label="Quitar línea">×</button></td></tr>`).join('')}
        <tr class="tot"><td></td><td style="text-align:left"><b>Total</b></td><td></td><td><b>${F.eur(inv.importe)}</b></td><td></td><td class="small muted">media ${String(inv.vidaUtil).replace('.', ',')} años</td><td class="small muted" style="text-align:left">préstamos ${F.eur(ctx ? ctx.active.loan : 0)}</td><td><b>${F.eur(ctx ? ctx.active.cuotaNueva : 0)}</b></td><td></td></tr>
      </tbody></table></div>
      <p class="small muted" style="margin:0">La cuota de cada línea es la de después de la carencia, en el escenario activo y con el vehículo elegido (${esc(A.STRUCTURES[state.estructura].nombre.toLowerCase())}). Apaga una línea para ver la inversión sin ella.</p>` : ''}`;
    $('#lnAdd', host).onclick = () => {
      const tipos = Object.keys(A.LINEA_TIPOS);
      const used = new Set(L.map((l) => l.tipo)), t = tipos.find((k) => !used.has(k)) || 'otro';
      if (!L.length) inv.lineas = [{ id: 'l' + Date.now(), tipo: 'maquinaria', nombre: state.proyecto || 'Inversión principal', importe: inv.importe, mes: inv.mesInicio, vida: inv.vidaUtil, activa: true, fin: null }];
      inv.lineas.push({ id: 'l' + Date.now() + 'b', tipo: t, nombre: A.LINEA_TIPOS[t].n, importe: 50000, mes: inv.mesInicio, vida: A.LINEA_TIPOS[t].vida, activa: true, fin: null });
      state.ejemplo = false; schedule();
    };
    $('#qInv', host).onclick = () => openQuiz('inversion');
    $$('tr[data-i]', host).forEach((tr) => {
      const l = L[+tr.dataset.i];
      $$('[data-k]', tr).forEach((x) => {
        if (x.dataset.k === 'activa') { x.onclick = () => { l.activa = l.activa === false; schedule(); }; return; }
        x.onchange = () => {
          const k = x.dataset.k;
          if (k === 'nombre') l.nombre = x.value.trim() || A.LINEA_TIPOS[l.tipo].n;
          else if (k === 'tipo') { l.tipo = x.value; if (!l.vida) l.vida = A.LINEA_TIPOS[l.tipo].vida; }
          else { const n = parseInput(x.value); if (isFinite(n) && n >= 0) l[k] = k === 'mes' ? Math.max(1, Math.round(n)) : n; }
          state.ejemplo = false; schedule();
        };
      });
    });
    $$('[data-del]', host).forEach((b) => b.onclick = () => { inv.lineas.splice(+b.dataset.del, 1); if (!inv.lineas.length) delete inv._sumL; schedule(); });
    $$('[data-fin]', host).forEach((b) => b.onclick = () => editFin(L[+b.dataset.fin]));
  }
  function editFin(l) {
    const inv = state.inversion, f = l.fin || { pctFin: inv.pctFin, plazo: inv.plazo, tipo: inv.tipo, carencia: inv.carencia };
    const el = openModal(`<div class="eyebrow">Financiación de una línea</div><h2 style="font-size:1.6rem">${esc(l.nombre)}</h2>
      <p class="small muted">Por ejemplo, una nave suele ir con un préstamo hipotecario a 15 o 20 años y un vehículo con leasing a 5. Si la dejas en «la general», usa las casillas de «Importe y financiación».</p>
      <div class="lever-grid">${[['pctFin', 'Parte financiada (%)'], ['plazo', 'Plazo (años)'], ['tipo', 'Tipo de interés (%)'], ['carencia', 'Carencia (meses)']].map(([k, n]) => `<label class="field-sel"><span class="small muted">${n}</span><input class="input" data-f="${k}" value="${String(f[k]).replace('.', ',')}"></label>`).join('')}</div>
      <div class="row mt"><button class="btn solid" id="lfOk">Usar esta financiación</button><button class="btn" id="lfGen">Volver a la general</button><button class="btn ghost" id="lfNo">Cancelar</button></div>`);
    $('#lfOk', el).onclick = () => { const o = {}; $$('[data-f]', el).forEach((x) => { const n = parseInput(x.value); o[x.dataset.f] = isFinite(n) ? n : f[x.dataset.f]; }); l.fin = o; closeModal(); schedule(); };
    $('#lfGen', el).onclick = () => { l.fin = null; closeModal(); schedule(); };
    $('#lfNo', el).onclick = closeModal;
  }
  /* Opciones: varias formas de plantear la inversión, guardadas y comparadas con los mismos datos de empresa */
  function renderOpciones() {
    const host = $('#opcionesBox'); if (!host || !ctx) return;
    const O = state.opciones || [];
    const mods = ctx.mods;
    const evalInv = (inv) => { const s = A.clone(state); s.inversion = A.clone(inv); const r = A.analyze(s, mods); const rp = A.analyze(s, A.scenarioMods(s, 'pesimista')); return { r, rp }; };
    const filas = [{ nombre: 'Lo que hay ahora en el simulador', inv: state.inversion, actual: true }].concat(O.map((o, i) => ({ nombre: o.nombre, inv: o.inversion, i })));
    const R = filas.map((f) => Object.assign(f, evalInv(f.inv)));
    // Mejor equilibrio: primero el veredicto, luego que aguante el pesimista, luego la recuperación
    const rank = (x) => ({ go: 0, warn: 1, stop: 2 }[x.r.verdict.key]) * 10 + (x.rp.cajaRef < 0 ? 5 : 0);
    const best = R.length > 1 ? R.slice().sort((a, b) => rank(a) - rank(b) || a.r.payback - b.r.payback)[0] : null;
    const lin = (inv) => ((inv.lineas || []).filter((l) => l.activa !== false).map((l) => l.nombre).join(' + ')) || 'un solo bloque';
    host.innerHTML = `<div class="row"><h4>Opciones de inversión</h4><span class="spacer"></span><input class="input" id="opNombre" placeholder="Nombre de esta opción" style="max-width:240px"><button class="btn" id="opSave">Guardar la actual como opción</button></div>
      <p class="small muted" style="margin:0">Guarda varias formas de hacer el proyecto (solo la máquina; máquina y nave; nave en alquiler; por fases…) y compáralas con la misma empresa y el mismo escenario (${esc(A.SCENARIOS.find((x) => x.key === state.escenario).nombre.toLowerCase())}). La columna del pesimista dice cuál aguanta mejor si las cosas se tuercen.</p>
      ${O.length ? `<div class="table-wrap"><table><thead><tr><th style="text-align:left">Opción</th><th>Inversión</th><th>Préstamos</th><th>Cuota/mes</th><th>Liquidez mínima</th><th>En el pesimista</th><th>Recuperación</th><th>TIR</th><th>Veredicto</th><th></th></tr></thead><tbody>
        ${R.map((x) => `<tr class="${x === best ? 'active' : ''}"><td style="text-align:left"><b>${esc(x.nombre)}</b>${x === best ? ' <span class="state st-ok">mejor equilibrio</span>' : ''}<br><span class="small muted">${esc(lin(x.inv))}</span></td><td>${F.eur(x.r.dim.inversion)}</td><td>${F.eur(x.r.loan)}</td><td>${F.eur(x.r.cuotaNueva)}</td><td style="color:${x.r.cajaRef < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(x.r.cajaRef)}</td><td style="color:${x.rp.cajaRef < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(x.rp.cajaRef)}</td><td>${F.months(x.r.payback)}</td><td>${x.r.tir == null ? '—' : F.pct(x.r.tir * 100)}</td><td><span class="state ${stCls(vMap[x.r.verdict.key])}">${x.r.verdict.titulo}</span></td><td>${x.actual ? '<span class="small muted">actual</span>' : `<button class="btn ghost" data-use="${x.i}">Usar</button><button class="icon-btn" data-delop="${x.i}" aria-label="Borrar opción">×</button>`}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small">${best ? `<b>Lectura:</b> «${esc(best.nombre)}» es la que mejor equilibra veredicto, aguante en el pesimista y recuperación.${best.r.verdict.key === 'stop' ? ' Aun así está en rojo: ninguna opción se sostiene tal como está; mira el plan de corrección o fasea.' : best.rp.cajaRef < 0 ? ' Ojo: en el pesimista se queda sin liquidez; dimensiona la financiación para ese caso.' : ''}` : ''}</p>` : '<p class="small muted">Todavía no hay opciones guardadas.</p>'}`;
    $('#opSave', host).onclick = () => { state.opciones = O.concat([{ nombre: $('#opNombre', host).value.trim() || `Opción ${O.length + 1}`, inversion: A.clone(state.inversion) }]); schedule(); toast('Opción guardada'); };
    $$('[data-use]', host).forEach((b) => b.onclick = () => { state.inversion = A.clone(O[+b.dataset.use].inversion); afterLoad(); toast('Opción cargada en el simulador'); });
    $$('[data-delop]', host).forEach((b) => b.onclick = () => { O.splice(+b.dataset.delop, 1); state.opciones = O; schedule(); });
  }

  /* ---------------- Punto de equilibrio ---------------- */
  // La figura clásica: el gasto fijo es una línea plana; los costes totales nacen de ella y suben con lo que vendes;
  // donde la venta corta a los costes está el punto de equilibrio y, por encima, el beneficio
  let peModo = 'volumen';
  function datosEquilibrio() {
    const r = ctx.active, w = r.w, b = r.b, c0 = r.tamano.mesCrucero - 1;
    const S = (a, i, j) => A.sum(a, i, j);
    const hoy = { ventas: S(b.sales, 0, 12) / 12, fijos: (S(b.staff, 0, 12) + S(b.fixed, 0, 12)) / 12, cuotas: S(b.debt, 0, 12) / 12 };
    hoy.mg = S(b.gross, 0, 12) / Math.max(1, S(b.sales, 0, 12));
    const cru = { ventas: S(w.sales, c0, c0 + 12) / 12, fijos: (S(w.staff, c0, c0 + 12) + S(w.fixed, c0, c0 + 12)) / 12, cuotas: S(w.debt, c0, c0 + 12) / 12 };
    cru.mg = S(w.gross, c0, c0 + 12) / Math.max(1, S(w.sales, c0, c0 + 12));
    [hoy, cru].forEach((x) => { x.eq = x.mg > 0 ? x.fijos / x.mg : Infinity; x.eqC = x.mg > 0 ? (x.fijos + x.cuotas) / x.mg : Infinity; x.seg = isFinite(x.eq) ? (x.ventas / x.eq - 1) * 100 : -100; x.segC = isFinite(x.eqC) ? (x.ventas / x.eqC - 1) * 100 : -100; });
    // Mes en que la media de tres meses de ventas cubre costes y cuotas, y ya no vuelve a caer por debajo
    const n = w.sales.length, cubre = (i, conCuotas) => { const a = Math.max(0, i - 2); const v = S(w.sales, a, i + 1), c = S(w.staff, a, i + 1) + S(w.fixed, a, i + 1) + (S(w.sales, a, i + 1) - S(w.gross, a, i + 1)) + (conCuotas ? S(w.debt, a, i + 1) : 0); return v >= c; };
    const mesDesde = (conCuotas) => { let m = null; for (let i = n - 1; i >= r.start - 1; i--) { if (cubre(i, conCuotas)) m = i + 1; else break; } return m; };
    return { hoy, cru, mesOp: mesDesde(false), mesCuotas: mesDesde(true), start: r.start, mesCrucero: r.tamano.mesCrucero };
  }
  function renderEquilibrio() {
    const host = $('#peBox'); if (!host || !ctx) return;
    const d = datosEquilibrio(), h = d.hoy, c = d.cru;
    const W = 620, Hh = 420, m = { l: 62, r: 16, t: 18, b: 40 };
    let svg = '';
    if (peModo === 'volumen') {
      const xmax = Math.max(c.ventas, h.ventas, isFinite(c.eqC) ? c.eqC : 0) * 1.35 || 1;
      const ymax = xmax;
      const x = (v) => m.l + (v / xmax) * (W - m.l - m.r), y = (v) => m.t + (1 - v / ymax) * (Hh - m.t - m.b);
      const coste = (o, v, cuotas) => o.fijos + (cuotas ? o.cuotas : 0) + (1 - o.mg) * v;
      svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Punto de equilibrio"><g class="grid">`;
      [0, 0.25, 0.5, 0.75, 1].forEach((k) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(ymax * k)}" y2="${y(ymax * k)}"/><text x="${m.l - 8}" y="${y(ymax * k) + 3}" text-anchor="end">${F.eur(ymax * k)}</text><text x="${x(xmax * k)}" y="${Hh - 22}" text-anchor="middle">${F.eur(xmax * k)}</text>`; });
      svg += `<text x="${(m.l + W - m.r) / 2}" y="${Hh - 6}" text-anchor="middle">ventas al mes</text></g>`;
      // Zonas de pérdida y beneficio entre la venta y los costes del año de crucero
      if (isFinite(c.eq)) {
        svg += `<polygon points="${x(0)},${y(coste(c, 0))} ${x(c.eq)},${y(c.eq)} ${x(0)},${y(0)}" fill="${css('--stop')}" opacity="0.12"/>`;
        svg += `<polygon points="${x(c.eq)},${y(c.eq)} ${x(xmax)},${y(xmax)} ${x(xmax)},${y(coste(c, xmax))}" fill="${css('--go')}" opacity="0.14"/>`;
        svg += `<text x="${x(xmax * 0.86)}" y="${y((xmax + coste(c, xmax)) / 2) + 4}" text-anchor="middle" style="fill:${css('--go')};font-weight:600">beneficio</text><text x="${x(c.eq * 0.35)}" y="${y(coste(c, c.eq * 0.35) * 0.55)}" text-anchor="middle" style="fill:${css('--stop')};font-weight:600">pérdida</text>`;
      }
      const line = (o, cuotas, col, dash, wdt) => `<line x1="${x(0)}" y1="${y(coste(o, 0, cuotas))}" x2="${x(xmax)}" y2="${y(coste(o, xmax, cuotas))}" stroke="${col}" stroke-width="${wdt || 2}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
      svg += `<line x1="${x(0)}" y1="${y(c.fijos)}" x2="${x(xmax)}" y2="${y(c.fijos)}" stroke="${css('--s3')}" stroke-width="2"/>`;
      svg += line(h, false, css('--faint'), '5 5', 1.5) + line(c, true, css('--warn'), '7 4', 1.8) + line(c, false, css('--s2'), '', 2.4);
      svg += `<line x1="${x(0)}" y1="${y(0)}" x2="${x(xmax)}" y2="${y(xmax)}" stroke="${css('--s1')}" stroke-width="2.6"/>`;
      const dot = (v, col, lbl, dy) => (isFinite(v) && v <= xmax ? `<circle cx="${x(v)}" cy="${y(v)}" r="6" fill="${col}" stroke="${css('--deep')}" stroke-width="2"/><text x="${x(v) + 9}" y="${y(v) + (dy || -8)}" style="fill:${css('--fg')}">${lbl}</text>` : '');
      const dotL = (v, col, lbl) => (isFinite(v) && v <= xmax ? `<circle cx="${x(v)}" cy="${y(v)}" r="6" fill="${col}" stroke="${css('--deep')}" stroke-width="2"/><text x="${x(v) - 10}" y="${y(v) - 10}" text-anchor="end" style="fill:${css('--fg')}">${lbl}</text>` : '');
      svg += dotL(c.eq, css('--gold'), 'equilibrio ' + F.eur(c.eq)) + dot(c.eqC, css('--warn'), 'con cuotas ' + F.eur(c.eqC), 18) + dot(h.eq, css('--faint'), 'hoy ' + F.eur(h.eq), 18);
      const vline = (v, lbl, col) => `<line x1="${x(v)}" x2="${x(v)}" y1="${m.t}" y2="${Hh - m.b}" stroke="${col}" stroke-dasharray="2 4"/><text x="${x(v) + 4}" y="${m.t + 12}" style="fill:${col}">${lbl}</text>`;
      svg += vline(h.ventas, 'vendes hoy', css('--faint')) + vline(c.ventas, 'venderás en crucero', css('--gold'));
      svg += '</svg>';
      svg += `<div class="chart-legend small"><span><i style="background:${css('--s3')}"></i>gasto fijo (personal y estructura)</span><span><i style="background:${css('--s2')}"></i>costes totales: fijos + compras</span><span><i style="background:${css('--warn')}"></i>costes + cuotas de los préstamos</span><span><i style="background:${css('--s1')}"></i>ventas</span><span><i style="background:${css('--faint')}"></i>costes de hoy, sin el proyecto</span></div>`;
    } else {
      const w = ctx.active.w, n = w.sales.length;
      const cost = w.sales.map((v, i) => w.staff[i] + w.fixed[i] + (v - w.gross[i]));
      const costC = cost.map((v, i) => v + w.debt[i]);
      const fij = w.staff.map((v, i) => v + w.fixed[i]);
      const mx = Math.max(...w.sales, ...costC) * 1.08, mn = 0;
      const x = (i) => m.l + (i / (n - 1)) * (W - m.l - m.r), y = (v) => m.t + (1 - (v - mn) / (mx - mn)) * (Hh - m.t - m.b);
      const pl = (a) => a.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Ventas y costes mes a mes"><g class="grid">`;
      [0, 0.25, 0.5, 0.75, 1].forEach((k) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(mx * k)}" y2="${y(mx * k)}"/><text x="${m.l - 8}" y="${y(mx * k) + 3}" text-anchor="end">${F.eur(mx * k)}</text>`; });
      for (let yr = 0; yr <= 5; yr++) svg += `<text x="${x(Math.min(n - 1, yr * 12))}" y="${Hh - 18}" text-anchor="middle">${yr === 0 ? 'mes 1' : 'año ' + yr}</text>`;
      svg += '</g>';
      // Relleno entre ventas y costes totales: verde si gana, rojo si pierde
      for (let i = 0; i < n - 1; i++) { const gana = w.sales[i] + w.sales[i + 1] >= cost[i] + cost[i + 1]; svg += `<polygon points="${x(i)},${y(w.sales[i])} ${x(i + 1)},${y(w.sales[i + 1])} ${x(i + 1)},${y(cost[i + 1])} ${x(i)},${y(cost[i])}" fill="${gana ? css('--go') : css('--stop')}" opacity="0.13"/>`; }
      svg += `<polyline points="${pl(fij)}" fill="none" stroke="${css('--s3')}" stroke-width="2"/><polyline points="${pl(cost)}" fill="none" stroke="${css('--s2')}" stroke-width="2.2"/><polyline points="${pl(costC)}" fill="none" stroke="${css('--warn')}" stroke-width="1.6" stroke-dasharray="6 4"/><polyline points="${pl(w.sales)}" fill="none" stroke="${css('--s1')}" stroke-width="2.6"/>`;
      svg += `<line x1="${x(d.start - 1)}" x2="${x(d.start - 1)}" y1="${m.t}" y2="${Hh - m.b}" stroke="${css('--line-strong')}" stroke-dasharray="2 4"/><text x="${x(d.start - 1) + 4}" y="${m.t + 12}">arranque</text>`;
      if (d.mesCuotas) svg += `<line x1="${x(d.mesCuotas - 1)}" x2="${x(d.mesCuotas - 1)}" y1="${m.t}" y2="${Hh - m.b}" stroke="${css('--gold')}" stroke-dasharray="4 3"/><text x="${x(d.mesCuotas - 1) + 4}" y="${m.t + 26}" style="fill:${css('--gold')}">cubre todo desde el mes ${d.mesCuotas}</text>`;
      svg += '</svg>';
      svg += `<div class="chart-legend small"><span><i style="background:${css('--s1')}"></i>ventas del mes</span><span><i style="background:${css('--s2')}"></i>costes totales</span><span><i style="background:${css('--warn')}"></i>costes + cuotas</span><span><i style="background:${css('--s3')}"></i>gasto fijo</span><span><i style="background:${css('--go')};opacity:.5"></i>gana</span><span><i style="background:${css('--stop')};opacity:.5"></i>pierde</span></div>`;
    }
    const segTxt = (v) => (v >= 0 ? `${F.pct(v)} por encima` : `${F.pct(-v)} por debajo`);
    const inc = state.inversion;
    host.innerHTML = `<div class="row"><h4>Punto de equilibrio: cuándo empieza a ganar dinero</h4><span class="spacer"></span><div class="seg" style="margin:0"><button data-pe="volumen" aria-pressed="${peModo === 'volumen'}">Por volumen de venta</button><button data-pe="tiempo" aria-pressed="${peModo === 'tiempo'}">Mes a mes</button></div></div>
      <div class="pe-grid">
        <div class="chart">${svg}</div>
        <div class="stack small">
          <p style="margin:0"><b>Cómo se lee.</b> La línea plana es el gasto fijo: se paga vendas o no. Los costes totales nacen de ella y suben con cada venta (las compras). Donde la línea de ventas corta a la de costes está el <b>punto de equilibrio</b>; a la derecha, cada euro vendido deja beneficio.</p>
          <div class="pe-kpis"><div><span>Hoy necesitas vender</span><b>${F.eur(h.eq)}<small>/mes</small></b><em>vendes ${F.eur(h.ventas)}: ${segTxt(h.seg)}</em></div>
            <div><span>Con el proyecto</span><b>${F.eur(c.eq)}<small>/mes</small></b><em>en crucero venderás ${F.eur(c.ventas)}: ${segTxt(c.seg)}</em></div>
            <div><span>Y pagando las cuotas</span><b style="color:${c.segC < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(c.eqC)}<small>/mes</small></b><em>${segTxt(c.segC)}</em></div></div>
          <p style="margin:0">${d.mesCuotas ? `Las ventas cubren costes y cuotas de forma estable desde el <b>mes ${d.mesCuotas}</b>${d.mesCuotas > d.mesCrucero ? ', después de terminar la rampa' : ''}.` : 'Con estos datos, las ventas no llegan a cubrir costes y cuotas de forma estable en cinco años.'} ${c.fijos > h.fijos ? `Los fijos suben de ${F.eur(h.fijos)} a ${F.eur(c.fijos)} al mes: cada euro de fijo nuevo exige vender ${F.eur(1 / Math.max(0.01, c.mg))} más.` : ''}</p>
          <p class="muted" style="margin:0">El <b>margen de seguridad</b> es cuánto pueden caer las ventas antes de perder dinero. Por debajo del 10 % la empresa vive al límite; por encima del 25 % aguanta un mal año.</p>
        </div>
      </div>
      <div class="pe-mueve"><span class="small muted">Mueve lo nuevo y mira cómo se desplaza el equilibrio:</span>
        ${[['inversion.incVentas', 'Venta nueva', 0, 150, 1, (v) => F.eur(state.empresa.ventas * v / 100) + '/año'], ['inversion.margenNuevo', 'Margen de lo nuevo', 5, 90, 0.5, (v) => F.pct(v)], ['inversion.fijosNuevos', 'Fijos nuevos', 0, Math.max(300000, inc.fijosNuevos * 2), 1000, (v) => F.eur(v) + '/año'], ['inversion.contrataciones', 'Contrataciones', 0, Math.max(20, inc.contrataciones * 2), 1, (v) => v + ' pers.']].map(([p, l, a, z, st, f]) => `<label><span>${l} <b data-pev="${p}">${f(getPath(p))}</b></span><input type="range" data-pe-p="${p}" min="${a}" max="${z}" step="${st}" value="${getPath(p)}"></label>`).join('')}
      </div>`;
    $$('[data-pe]', host).forEach((b) => b.onclick = () => { peModo = b.dataset.pe; renderEquilibrio(); });
    const fmts = { 'inversion.incVentas': (v) => F.eur(state.empresa.ventas * v / 100) + '/año', 'inversion.margenNuevo': (v) => F.pct(v), 'inversion.fijosNuevos': (v) => F.eur(v) + '/año', 'inversion.contrataciones': (v) => v + ' pers.' };
    $$('[data-pe-p]', host).forEach((r) => r.addEventListener('change', () => { setPath(r.dataset.peP, parseFloat(r.value)); state.ejemplo = false; syncFields(); schedule(); }));
    $$('[data-pe-p]', host).forEach((r) => r.addEventListener('input', () => { const t = host.querySelector(`[data-pev="${r.dataset.peP}"]`); if (t) t.textContent = fmts[r.dataset.peP](parseFloat(r.value)); }));
  }

  /* Paisaje 3D guiado por preguntas: cada pregunta fija los dos ejes y la altura adecuados */
  const HZ = [
    { q: '¿Cuánto financiar y a qué plazo?', ax: 'pctFin', ay: 'plazo', m: 'cajaMin', lee: 'Cada punto es una combinación de parte financiada y años de préstamo; la altura es la liquidez mínima. Busca el verde más cercano a la esfera: es la financiación mínima que mantiene la caja por encima de tu meta.' },
    { q: '¿Y si vendo menos o tardo más en arrancar?', ax: 'incVentas', ay: 'rampa', m: 'cajaMin', lee: 'Hacia la izquierda vendes menos; hacia el fondo tardas más en llegar. Si tu esfera está cerca del borde rojo, un pequeño retraso o un poco menos de venta rompe la tesorería.' },
    { q: '¿Y si los clientes pagan más tarde?', ax: 'dso', ay: 'incVentas', m: 'cajaMin', lee: 'Cobrar más tarde inmoviliza caja justo cuando más vendes. Mira cuántos días de cobro aguantas antes de entrar en rojo.' },
    { q: '¿Cuánto puedo invertir?', ax: 'importe', ay: 'pctFin', m: 'cajaMin', lee: 'De izquierda a derecha, inversiones más grandes; al fondo, más financiada. La frontera entre verde y rojo es lo máximo que puedes invertir con cada nivel de financiación.' },
    { q: '¿Cuándo recupero lo invertido?', ax: 'incVentas', ay: 'margenNuevo', m: 'payback', lee: 'La altura son los meses que tardas en recuperar la inversión (más bajo es mejor). La financiación no acorta este plazo: solo vender más o con más margen.' },
    { q: '¿Podré pagar las cuotas?', ax: 'plazo', ay: 'importe', m: 'dscrMin', lee: 'La altura es cuántas veces el negocio cubre las cuotas en el peor año. Por debajo de 1 no llega; la banca suele pedir 1,25 o más.' }
  ];
  function renderHorizPreg() {
    const host = $('#horizPreg'); if (!host) return;
    const cur = HZ.findIndex((h) => h.ax === view.ax && h.ay === view.ay && h.m === view.metric);
    host.innerHTML = HZ.map((h, i) => `<button class="hz-q" data-hz="${i}" aria-pressed="${i === cur}">${h.q}</button>`).join('') + (cur >= 0 ? `<p class="small muted" style="margin:6px 0 0">${HZ[cur].lee}</p>` : '<p class="small muted" style="margin:6px 0 0">Ejes elegidos a mano en el modo experto.</p>');
    $$('[data-hz]', host).forEach((b) => b.onclick = () => {
      const h = HZ[+b.dataset.hz]; view.ax = h.ax; view.ay = h.ay; view.metric = h.m;
      $('#axX').value = h.ax; $('#axY').value = h.ay; $('#metricSel').value = h.m;
      if (view.mode !== 'surface') { view.mode = 'surface'; render3D(); }
      renderHorizPreg(); gen++; computeHeavy(gen);
    });
  }

  /* ---------------- Diccionario ---------------- */
  let glossCat = 'Todas';
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  function renderGloss() {
    const cats = ['Todas'].concat(Array.from(new Set(A.GLOSSARY.map((g) => g.cat))));
    $('#glossCats').innerHTML = cats.map((c) => `<button data-c="${c}" aria-pressed="${c === glossCat}">${c}</button>`).join('');
    $$('#glossCats button').forEach((b) => b.onclick = () => { glossCat = b.dataset.c; renderGloss(); });
    const q = ($('#glossSearch').value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const list = A.GLOSSARY.filter((g) => (glossCat === 'Todas' || g.cat === glossCat) && (!q || (g.t + ' ' + g.d).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)));
    const chips = (arr, ind) => arr.map((p) => (p.includes('.') ? varChip(p, ind) : `<span class="vchip static">${esc(p)}</span>`)).join('');
    $('#glossList').innerHTML = list.length ? list.map((g) => `<article class="glass term" id="t-${slug(g.t)}"><div class="row"><h3>${g.t}</h3><span class="spacer"></span><span class="tag">${g.cat}</span></div><p>${g.d}</p>${g.f ? `<div class="formula">${g.f}</div>` : ''}${g.ej ? `<p class="small muted"><b>Ejemplo.</b> ${g.ej}</p>` : ''}
      ${g.dir.length ? `<div class="small"><span class="muted">Variables directas</span><div class="chips">${chips(g.dir)}</div></div>` : ''}
      ${g.ind.length ? `<div class="small"><span class="muted">Variables indirectas</span><div class="chips">${chips(g.ind, true)}</div></div>` : ''}</article>`).join('') : '<p class="muted">No hay términos con esa búsqueda. Pregúntaselo al asistente.</p>';
  }
  function renderGlossVals() { if (document.activeElement !== $('#glossSearch')) renderGloss(); }
  function showGloss(term) {
    glossCat = 'Todas'; $('#glossSearch').value = ''; renderGloss();
    const el = document.getElementById('t-' + slug(term));
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  }

  /* ---------------- Sectores ---------------- */
  // Desplegable: con datos propios, cambiar de sector solo cambia las referencias (estacionalidad, horquillas);
  // las cifras típicas del sector se cargan si las pides
  function renderSectors() {
    const opts = Object.keys(A.SECTORS).map((k) => `<option value="${k}" ${k === state.sector ? 'selected' : ''}>${A.SECTORS[k].nombre}</option>`).join('');
    $('#sectorSel').innerHTML = opts; $('#heroSector').innerHTML = opts;
    const S = A.SECTORS[state.sector];
    $('#sectorNote').textContent = S.nota;
    $('#sectorTipico').innerHTML = `<p class="muted" style="margin:0 0 6px">Lo típico del sector, sobre tus ventas:</p><div class="chips">${[['Margen bruto', S.margen + ' %'], ['Personal', S.personal + ' % de ventas'], ['Otros fijos', S.fijos + ' % de ventas'], ['Cobro', S.dso + ' días'], ['Stock', S.dio + ' días'], ['Pago', S.dpo + ' días'], ['Rampa', S.rampa + ' meses'], ['Peso salarial máx.', S.pesoSalarialMax + ' %']].map(([k, v]) => `<span class="vchip static">${k} <b>${v}</b></span>`).join('')}</div>
      <div class="row mt"><button class="btn ghost" id="sectorCargar">Usar estas cifras típicas</button><span class="small muted">Sustituye margen, personal, fijos y plazos por los del sector.</span></div>`;
    $('#sectorCargar').onclick = () => { A.applySector(state, state.sector); syncFields(); toast('Cifras típicas cargadas: ' + S.nombre); schedule(); };
  }
  function applySector(k) {
    const propios = !esEjemplo();
    if (propios) { state.sector = k; Object.assign(state.meta, { pesoSalarialMax: A.SECTORS[k].pesoSalarialMax, deudaEbitdaMax: A.SECTORS[k].deudaEbitdaMax }); }
    else A.applySector(state, k);
    renderSectors(); syncFields(); schedule();
    toast(propios ? `Sector: ${A.SECTORS[k].nombre}. Tus cifras no cambian; si quieres las típicas, pulsa «Usar estas cifras típicas»` : 'Perfil cargado: ' + A.SECTORS[k].nombre);
  }

  /* ---------------- Dock y caja de herramientas ---------------- */
  const ICONS = {
    puente: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    empresa: '<path d="M4 20V8l6-4v16M10 20V10l10 4v6M2 20h20"/>',
    historia: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>',
    inversion: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 1.8-3 2.3-3 1-3 2.2 1.3 2 3 2 3-.8 3-2"/>',
    horizonte: '<path d="M2 18l6-7 4 4 4-6 6 9z"/><path d="M2 21h20"/>',
    escenarios: '<path d="M3 20c4-2 5-10 9-10s5 6 9 4M3 16c4-1 6-5 9-5s6 7 9 7"/>',
    riesgos: '<circle cx="12" cy="6" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="18" r="2.2"/><rect x="8" y="2" width="8" height="20" rx="4"/>',
    tamano: '<rect x="3" y="12" width="5" height="9"/><rect x="10" y="7" width="5" height="14"/><rect x="17" y="3" width="4" height="18"/>',
    humano: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c0-3.5 2.7-6 6-6s6 2.5 6 6M14 20c0-2.6 1.4-4.8 3-4.8s4 1.6 4 4.8"/>',
    estructuras: '<rect x="9" y="2" width="6" height="5"/><rect x="2" y="16" width="6" height="5"/><rect x="16" y="16" width="6" height="5"/><path d="M12 7v4M5 16v-3h14v3"/>',
    plan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    diccionario: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h11"/>',
    informe: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/>',
    estrategia: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    manual: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M8 7h7M8 11h7"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'
  };
  const NAV = [['puente', 'Puente de mando'], ['empresa', 'La empresa hoy'], ['historia', 'Historia y cuentas'], ['inversion', 'La inversión'], ['horizonte', 'Horizonte 3D'], ['escenarios', 'Escenarios'], ['riesgos', 'Semáforos y riesgos'], ['tamano', 'Nuevo tamaño'], ['humano', 'Sistema humano'], ['estructuras', 'Estructuras'], ['plan', 'Meta y plan'], ['diccionario', 'Diccionario'], ['informe', 'Informe']];
  const svgI = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
  A.svgIcon = svgI;
  function buildDock() {
    const d = $('#dock');
    d.innerHTML = NAV.map(([k, n]) => `<button data-nav="${k}" aria-label="${n}">${svgI(k)}<span class="tip">${n}</span></button>`).join('') +
      `<hr><a class="dbtn" href="estrategia.html" aria-label="Sistema estratégico">${svgI('estrategia')}<span class="tip">Sistema estratégico</span></a><a class="dbtn" href="manual.html" aria-label="Manual de uso">${svgI('manual')}<span class="tip">Manual de uso</span></a><button class="tool" id="toolBtn" aria-label="Caja de herramientas" aria-expanded="false">${svgI('tools')}<span class="tip">Caja de herramientas</span></button>`;
    $$('[data-nav]', d).forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.nav).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })));
    $('#toolBtn').addEventListener('click', toggleTools);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) $$('[data-nav]', d).forEach((b) => b.classList.toggle('on', b.dataset.nav === e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
      NAV.forEach(([k]) => io.observe(document.getElementById(k)));
    }
  }
  function toggleTools() {
    const tb = $('#toolbox');
    tb.hidden = !tb.hidden;
    $('#toolBtn').setAttribute('aria-expanded', !tb.hidden);
    if (!tb.hidden) renderTools();
  }
  function renderTools() {
    const snaps = store.get(SNAP) || [];
    $('#toolbox').innerHTML = `<button class="icon-btn close" aria-label="Cerrar">×</button>
      <h3>Caja de herramientas</h3><p class="sub">Atajos para moverte entre escenarios y guardar tus hipótesis.</p>
      <div class="group"><label for="tbSc">Escenario activo</label><select id="tbSc">${A.SCENARIOS.map((s) => `<option value="${s.key}" ${s.key === state.escenario ? 'selected' : ''}>${s.nombre}</option>`).join('')}</select></div>
      <div class="group"><label for="tbSector">Sector</label><select id="tbSector">${Object.keys(A.SECTORS).map((k) => `<option value="${k}" ${k === state.sector ? 'selected' : ''}>${A.SECTORS[k].nombre}</option>`).join('')}</select></div>
      <div class="group"><label for="tbSt">Estructura societaria</label><select id="tbSt">${Object.keys(A.STRUCTURES).map((k) => `<option value="${k}" ${k === state.estructura ? 'selected' : ''}>${A.STRUCTURES[k].nombre}</option>`).join('')}</select></div>
      <div class="group"><label for="tbHyp">Añadir campo hipotético</label><div class="row"><select id="tbHyp" style="flex:1">${Object.keys(A.SHOCKS).map((k) => `<option value="${k}">${A.SHOCKS[k].nombre}</option>`).join('')}</select><button class="btn" id="tbHypAdd">Añadir</button></div></div>
      <div class="group"><label for="tbName">Guardar escenario de trabajo</label><div class="row"><input class="input" id="tbName" placeholder="Nombre" style="flex:1"><button class="btn" id="tbSave">Guardar</button></div>
        ${snaps.length ? snaps.map((s, i) => `<div class="row small"><span style="flex:1">${esc(s.name)} <span class="muted">· ${s.date}</span></span><button class="btn ghost" data-load="${i}">Cargar</button><button class="icon-btn" data-delsnap="${i}" aria-label="Borrar">×</button></div>`).join('') : '<span class="small muted">Se guardan en este navegador.</span>'}</div>
      <div class="group"><label>Datos</label><div class="row"><button class="btn ghost" id="tbCopy">Copiar datos</button><button class="btn ghost" id="tbPaste">Pegar datos</button><button class="btn ghost" id="tbReset">Ejemplo</button></div>
        <textarea id="tbJson" class="input" rows="3" placeholder="Pega aquí unos datos copiados de Atalaya" hidden></textarea></div>
      <div class="group"><button class="btn" id="tbAsk">Abrir el asistente</button><button class="btn solid" id="tbReport">Generar informe</button></div>`;
    const tb = $('#toolbox');
    tb.querySelector('.close').onclick = toggleTools;
    $('#tbSc').onchange = (e) => setScenario(e.target.value);
    $('#tbSector').onchange = (e) => applySector(e.target.value);
    $('#tbSt').onchange = (e) => { state.estructura = e.target.value; schedule(); };
    $('#tbHypAdd').onclick = () => { addHyp($('#tbHyp').value); toast('Hipótesis añadida en Escenarios'); };
    $('#tbSave').onclick = () => {
      const list = store.get(SNAP) || [];
      list.unshift({ name: $('#tbName').value.trim() || state.proyecto, date: new Date().toLocaleDateString('es-ES'), state: A.clone(state) });
      store.set(SNAP, list.slice(0, 12)); renderTools(); toast('Escenario guardado');
    };
    $$('[data-load]', tb).forEach((b) => b.onclick = () => { state = loadState(A.clone(snaps[+b.dataset.load].state)); afterLoad(); toast('Escenario cargado'); });
    $$('[data-delsnap]', tb).forEach((b) => b.onclick = () => { snaps.splice(+b.dataset.delsnap, 1); store.set(SNAP, snaps); renderTools(); });
    $('#tbCopy').onclick = () => copy(JSON.stringify(state), 'Datos copiados');
    $('#tbPaste').onclick = () => { const ta = $('#tbJson'); ta.hidden = false; ta.focus(); };
    $('#tbJson').onchange = (e) => {
      try { const s = JSON.parse(e.target.value); if (!s.empresa || !s.inversion) throw 0; state = loadState(s); afterLoad(); toast('Datos cargados'); }
      catch (err) { toast('Esos datos no son de Atalaya: copia de nuevo desde «Copiar datos»'); }
    };
    $('#tbReset').onclick = () => { state = A.defaultState(); afterLoad(); toast('Datos de ejemplo restaurados'); };
    $('#tbAsk').onclick = () => { toggleTools(); A.assistant && A.assistant.open(); };
    $('#tbReport').onclick = () => { toggleTools(); openReport(); };
  }
  function afterLoad() { Object.keys(bounds).forEach((k) => delete bounds[k]); buildFields(); renderSectors(); syncFields(); renderFin(); schedule(); if (!$('#toolbox').hidden) renderTools(); }

  function copy(text, okMsg) {
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast('Selecciona y copia el texto manualmente'); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(okMsg), fallback);
    else fallback();
  }
  let toastT;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }
  A.toast = toast;

  /* ---------------- Informe ---------------- */
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  let repSc = null;
  function ensureHeavy() {
    if (!ctx.plan || !ctx.structs || !ctx.risks) {
      ctx.sens = A.sensitivity(state, ctx.mods, 'cajaRef'); ctx.risks = A.risks(state, ctx.active, ctx.sens);
      ctx.structs = A.compareStructures(state, ctx.mods); ctx.plan = A.correctionPlan(state, ctx.mods);
    }
  }
  function openReport() {
    ensureHeavy();
    repSc = repSc || A.SCENARIOS.map((s) => s.key);
    const ov = $('#report');
    ov.hidden = false; document.body.style.overflow = 'hidden';
    ov.innerHTML = `<div class="report-bar"><b style="font-family:var(--font-display);font-size:1.1rem;color:var(--gold-soft)">Informe</b>
      ${A.SCENARIOS.map((s) => `<label><input type="checkbox" data-rs="${s.key}" ${repSc.indexOf(s.key) >= 0 ? 'checked' : ''}>${s.nombre}</label>`).join('')}
      <span class="spacer"></span>${inFrame ? '' : '<button class="btn" id="repPrint">Imprimir o guardar PDF</button>'}<button class="btn ghost" id="repCopy">Copiar texto</button><button class="btn solid" id="repClose">Cerrar</button></div><article class="paper rp" id="paper"></article>`;
    drawPaper();
    $$('[data-rs]', ov).forEach((c) => c.onchange = () => { repSc = $$('[data-rs]', ov).filter((x) => x.checked).map((x) => x.dataset.rs); drawPaper(); });
    $('#repClose').onclick = closeReport;
    $('#repCopy').onclick = () => copy(A.report.text(state, ctx), 'Resumen copiado');
    if ($('#repPrint')) $('#repPrint').onclick = () => window.print();
  }
  function drawPaper() {
    $('#paper').innerHTML = A.report.build(state, ctx, { scenarios: repSc });
    const series = ctx.all.filter((x) => repSc.indexOf(x.key) >= 0).map((x) => ({ name: x.nombre, data: x.r.w.liquidez, color: A.seriesColor(x.i), active: x.key === state.escenario }));
    if (series.length) C.cash($('#repCash'), null, series, { target: state.meta.cajaMin, start: ctx.active.start });
  }
  function closeReport() { const ov = $('#report'); if (ov && !ov.hidden) { ov.hidden = true; document.body.style.overflow = ''; } }

  /* ---------------- API para el asistente ---------------- */
  const SETTABLE = Object.values(FIELDS).flat().map((f) => f.p).concat(['meta.cajaMin', 'meta.paybackMax', 'meta.dscrMin', 'meta.deudaEbitdaMax', 'meta.pesoSalarialMax', 'meta.plazoObjetivo']);
  A.appCtx = () => ({ state, ctx });
  A.appApi = {
    settable: SETTABLE,
    getState: () => state,
    getCtx: () => ctx,
    summary() {
      const r = ctx.active, sc = A.SCENARIOS.find((s) => s.key === state.escenario);
      return {
        empresa: state.empresaNombre, proyecto: state.proyecto, sector: A.SECTORS[state.sector].nombre, estructura: A.STRUCTURES[state.estructura].nombre, escenario: sc.nombre,
        veredicto: r.verdict.titulo,
        semaforos: r.lights.map((l) => ({ clave: l.key, indicador: l.nombre, valor: l.valor, estado: stName[l.estado], verde: l.rangos.ok, ambar: l.rangos.warn, rojo: l.rangos.stop, directas: l.def.directas.map((v) => v.path), indirectas: l.def.indirectas.map((v) => v.path), consejo: l.def.consejo })),
        cifras: { liquidezMinima: F.eur(r.cajaRef), mesLiquidezMinima: r.mesCajaRef, colchonMinimoMeses: Math.round(r.colMin * 10) / 10, cuotaNueva: F.eur(r.cuotaNueva), recuperacion: F.months(r.payback), dscr: F.x(r.dscrMin), deudaEbitda: F.x(r.deudaEbitda), tir: r.tir === null ? 'n/d' : F.pct(r.tir * 100), equipo: Math.round(r.humano.score) },
        escenarios: ctx.all.map((x) => ({ escenario: x.nombre, liquidezMinima: F.eur(x.r.cajaRef), veredicto: x.r.verdict.titulo })),
        variables: Object.fromEntries(SETTABLE.map((p) => [p, getPath(p)])),
        hipotesisActivas: state.hipotesis.filter((h) => h.activo).map((h) => `${A.SHOCKS[h.tipo].nombre} mes ${h.mes} (${h.magnitud} ${A.SHOCKS[h.tipo].unidad})`),
        plan: ctx.plan ? (ctx.plan.ok ? 'cumple todas las metas' : ctx.plan.acciones.map((a) => `${a.lv.nombre}: ${A.report.lv(a.lv, a.desde)} → ${A.report.lv(a.lv, a.hasta)}`)) : 'calculando'
      };
    },
    setVar(path, value) {
      if (SETTABLE.indexOf(path) < 0) throw new Error('Variable no reconocida: ' + path);
      const v = Number(value); if (!isFinite(v)) throw new Error('Valor no numérico');
      const before = ctx.active.verdict.titulo, liqAntes = F.eur(ctx.active.cajaRef), valAntes = getPath(path);
      setPath(path, v); syncFields(); computeQuick(); schedule();
      return { variable: A.fieldLabel(path), antes: valAntes, ahora: v, veredictoAntes: before, veredictoAhora: ctx.active.verdict.titulo, liquidezMinimaAntes: liqAntes, liquidezMinimaAhora: F.eur(ctx.active.cajaRef) };
    },
    setScenario(k) { if (!A.SCENARIOS.find((s) => s.key === k)) throw new Error('Escenario no válido'); state.escenario = k; computeQuick(); schedule(); return { escenario: k, veredicto: ctx.active.verdict.titulo }; },
    setStructure(k) { if (!A.STRUCTURES[k]) throw new Error('Estructura no válida'); state.estructura = k; computeQuick(); schedule(); return { estructura: A.STRUCTURES[k].nombre, veredicto: ctx.active.verdict.titulo, liquidezMinima: F.eur(ctx.active.cajaRef) }; },
    addHyp(tipo, mes, duracion, magnitud) { if (!A.SHOCKS[tipo]) throw new Error('Tipo de hipótesis no válido'); const ex = { mes: mes || 12 }; if (duracion) ex.duracion = duracion; if (isFinite(magnitud)) ex.magnitud = magnitud; addHyp(tipo, ex); computeQuick(); return { hipotesis: A.SHOCKS[tipo].nombre, veredicto: ctx.active.verdict.titulo, liquidezMinima: F.eur(ctx.active.cajaRef) }; },
    compareStructures() { const S = A.compareStructures(state, ctx.mods); return S.map((s) => ({ clave: s.key, estructura: s.nombre, encaje: Math.round(s.score), liquidezMinima: F.eur(s.r.cajaRef), recuperacion: F.months(s.r.payback), tamanoPleno: 'mes ' + s.mesPleno, control: s.control + ' %' })); },
    applyPlan() { ensureHeavy(); const ok = applyPlan(); return ok ? { aplicado: true, veredicto: ctx.active.verdict.titulo } : { aplicado: false, motivo: 'No hay plan que aplicar: ya se cumplen las metas o no hay palancas útiles' }; },
    goTo(id) { if (SETTABLE.indexOf(id) >= 0) { goToField(id); return { ok: true }; } const el = document.getElementById(id); if (el) { el.scrollIntoView({ behavior: 'smooth' }); return { ok: true }; } return { ok: false }; },
    openLight, openStruct
  };

  /* ---------------- Arranque ---------------- */
  async function start() {
    if (A.sky) A.sky();
    buildDock();
    buildFields();
    renderSectors();
    syncFields();
    $('#empresaNombre').addEventListener('input', (e) => { state.empresaNombre = e.target.value; state.ejemplo = false; store.set(STORE, state); renderIdCard(); });
    $('#proyecto').addEventListener('input', (e) => { state.proyecto = e.target.value; store.set(STORE, state); });
    $('#heroSector').addEventListener('change', (e) => applySector(e.target.value));
    $('#sectorSel').addEventListener('change', (e) => applySector(e.target.value));
    $('#heroEstr').addEventListener('change', (e) => { state.estructura = e.target.value; toast('Vehículo: ' + A.STRUCTURES[state.estructura].nombre); schedule(); });
    ['#qEmpresa', '#qEmpresa2'].forEach((id) => $(id).addEventListener('click', () => openQuiz('empresa')));
    $('#qHumano').addEventListener('click', () => openQuiz('humano'));
    $('#nuevaSim').addEventListener('click', nuevaSimulacion);
    $('#goCargar').addEventListener('click', () => { const b = $('#cargaBox'); b.scrollIntoView({ behavior: 'smooth', block: 'center' }); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); });
    $('#empFile').addEventListener('change', async (e) => { const fs = Array.from(e.target.files || []); e.target.value = ''; if (fs.length) await cargarCuentas(fs); });
    $('#contarPoliza').addEventListener('click', () => { state.meta.contarPoliza = state.meta.contarPoliza === false; syncFields(); schedule(); });
    $('#addHyp').addEventListener('click', (e) => {
      openCard(null, e.target, { t: 'Nueva hipótesis', d: 'Elige el suceso que quieres simular. Podrás ajustar mes, duración e intensidad.', html: `<div class="actions">${Object.keys(A.SHOCKS).map((k) => `<button class="btn ghost" data-shock="${k}">${A.SHOCKS[k].nombre}</button>`).join('')}</div>` });
      $$('[data-shock]', card).forEach((b) => b.onclick = () => { addHyp(b.dataset.shock); card.hidden = true; });
    });
    $('#openReport').addEventListener('click', openReport);
    $('#copySummary').addEventListener('click', () => { ensureHeavy(); copy(A.report.text(state, ctx), 'Resumen ejecutivo copiado'); });
    $('#glossSearch').addEventListener('input', renderGloss);
    setupFin();
    renderGloss();
    computeQuick();
    setup3D();
    render3D();
    computeHeavy(gen);
    if (A.assistant) A.assistant.init({ api: A.appApi, page: 'simulador' });
    if (P) {
      P.mountAccount($('#account'));
      const remote = await P.loadData('simulador');
      if (remote && remote.empresa) { state = loadState(remote); afterLoad(); }
      else if (!store.get(STORE) && P.empresas && P.empresas.activa()) { state.empresaNombre = P.empresas.activa().nombre; store.set(STORE, state); afterLoad(); }
    }
    followHash();
  }
  /* Enlaces directos a un capítulo (app.html#humano): la página crece mientras se dibujan gráficos y 3D,
     así que se recoloca varias veces hasta que el diseño se estabiliza, salvo que el usuario ya se haya movido */
  function followHash() {
    const go = () => {
      const id = decodeURIComponent(location.hash.slice(1)); const el = id && document.getElementById(id); if (!el) return;
      let moved = false; const stop = () => { moved = true; };
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => addEventListener(ev, stop, { once: true, passive: true }));
      [0, 150, 500, 1000, 1800, 3000].forEach((t) => setTimeout(() => { if (!moved) el.scrollIntoView({ behavior: 'auto', block: 'start' }); }, t));
    };
    go();
    addEventListener('hashchange', go);
  }
  const boot = () => (P ? P.guard().then((ok) => ok && start()) : start());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
