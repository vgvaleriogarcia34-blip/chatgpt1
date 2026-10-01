/* Atalaya · Controlador del simulador */
(function () {
  const A = window.Atalaya;
  const F = A.fmt, C = A.charts;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const STORE = 'atalaya.v1', SNAP = 'atalaya.snapshots.v1';
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
      { p: 'custom.ventasF', l: 'Venta nueva lograda', min: 0.2, max: 1.6, step: 0.05, u: '× plan' },
      { p: 'custom.retraso', l: 'Retraso de la rampa', min: -3, max: 18, step: 1, u: 'meses' },
      { p: 'custom.margenDelta', l: 'Desvío de margen', min: -12, max: 6, step: 0.5, u: 'pp' },
      { p: 'custom.sobrecoste', l: 'Sobrecoste de inversión', min: -10, max: 60, step: 1, u: '%' },
      { p: 'custom.dsoDelta', l: 'Desvío en días de cobro', min: -40, max: 90, step: 1, u: 'días' },
      { p: 'custom.tipoDelta', l: 'Desvío de tipos', min: -3, max: 6, step: 0.1, u: 'pp' }
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
          setPath(f.p, v);
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
    tQuick = setTimeout(computeQuick, 40);
    tHeavy = setTimeout(() => computeHeavy(g), 450);
    store.set(STORE, state);
    clearTimeout(saveT); saveT = setTimeout(() => P && P.saveData('simulador', state), 1500);
  }
  function computeQuick() {
    const all = A.SCENARIOS.map((sc, i) => ({ key: sc.key, nombre: sc.nombre, desc: sc.desc, i, r: A.analyze(state, A.scenarioMods(state, sc.key)) }));
    const active = all.find((x) => x.key === state.escenario).r;
    ctx = Object.assign(ctx || {}, { all, active, mods: A.scenarioMods(state, state.escenario) });
    renderTop(); renderHero(); renderDimension(); renderScenarios(); renderLights(); renderSize(); renderHuman();
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
    $('#sectorLabel').textContent = A.SECTORS[state.sector].nombre + ' · ' + A.STRUCTURES[state.estructura].nombre;
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
      <div class="row mt"><button class="btn" id="askLight">Preguntar al asistente</button></div>`);
    $('#askLight').onclick = () => { closeModal(); A.assistant && A.assistant.ask(`¿Qué hago para poner en verde el semáforo de ${l.nombre.toLowerCase()}?`); };
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
  function renderSize() {
    const t = ctx.active.tamano;
    $('#sizeLede').textContent = `Los próximos doce meses sin el proyecto frente al año de crucero, que empieza en el mes ${t.mesCrucero}, cuando la actividad nueva ha completado su rampa.`;
    const items = [
      { n: 'Ventas', a: t.antes.ventas, b: t.despues.ventas, f: F.eur, up: 1 },
      { n: 'EBITDA', a: t.antes.ebitda, b: t.despues.ebitda, f: F.eur, up: 1, sub: `${F.pct(t.antes.ebitdaPct)} → ${F.pct(t.despues.ebitdaPct)} sobre ventas` },
      { n: 'Margen bruto', a: t.antes.margen, b: t.despues.margen, f: F.pct, up: 1 },
      { n: 'Plantilla', a: t.antes.plantilla, b: t.despues.plantilla, f: F.num, up: 0 },
      { n: 'Peso salarial', a: t.antes.pesoSalarial, b: t.despues.pesoSalarial, f: F.pct, up: -1, info: 'salarial' },
      { n: 'Ventas por persona', a: t.antes.ventasEmpleado, b: t.despues.ventasEmpleado, f: F.eur, up: 1 },
      { n: 'Punto de equilibrio', a: t.antes.equilibrio, b: t.despues.equilibrio, f: F.eur, up: -1 },
      { n: 'Circulante extra', a: 0, b: ctx.active.wcPeak, f: F.eur, up: -1, sub: 'caja atrapada en clientes y stock en el pico' }
    ];
    $('#sizeGrid').innerHTML = items.map((it) => {
      const mx = Math.max(Math.abs(it.a), Math.abs(it.b)) || 1;
      const d = it.b - it.a, good = it.up === 0 ? null : (d * it.up >= 0);
      const rel = it.a ? (d / Math.abs(it.a)) * 100 : null;
      return `<div class="glass size" ${it.info ? `data-info="${it.info}"` : ''}><h4>${it.n}</h4><div class="from-to"><span class="a">${it.f(it.a)}</span><span class="muted">→</span><span class="b">${it.f(it.b)}</span></div>
        <div class="bars"><span style="width:${(Math.abs(it.a) / mx) * 100}%"></span><span class="after" style="width:${(Math.abs(it.b) / mx) * 100}%"></span></div>
        <div class="delta ${good === null ? '' : good ? 'up' : 'down'}">${it.sub || (rel !== null ? `${rel >= 0 ? '+' : ''}${F.pct(rel)}` : '')}</div></div>`;
    }).join('');
    C.debt($('#debtChart'), ctx.active);
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
    $('#structLede').innerHTML = `Seis formas de hacer la misma inversión con la meta de alcanzar el tamaño pleno antes del <b>mes ${state.meta.plazoObjetivo}</b>. Cada una cambia la liquidez, el retorno para la propiedad, el control y el tiempo. <b>Toca una</b> para ver cómo funciona, sus ventajas, su fiscalidad y los pasos para ponerla en marcha.`;
    $('#structs').innerHTML = S.map((s, i) => {
      const r = s.r;
      const attr = (n, v, inv) => `<div class="attr"><span>${n}</span><span class="track"><b style="width:${v}%;background:${inv ? css('--s2') : css('--s1')}"></b></span><span>${v}</span></div>`;
      return `<button class="glass struct ${s.key === state.estructura ? 'current' : ''}" data-k="${s.key}">
        <div class="head"><span class="name">${s.nombre}</span><span class="score">${i === 0 ? '★ ' : ''}${Math.round(s.score)}</span></div>
        <div class="small muted">${s.desc}</div>
        <div class="stats"><div>Liquidez mínima<b style="color:${r.cajaRef < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(r.cajaRef)}</b></div><div>Recuperación<b>${F.months(r.payback)}</b></div><div>Tamaño pleno<b style="color:${s.enPlazo ? 'inherit' : 'var(--warn)'}">mes ${s.mesPleno}</b></div></div>
        <div class="attrs">${attr('Control', s.control)}${attr('Aislamiento', s.aislamiento)}${attr('Complejidad', s.complejidad, true)}</div>
        <div class="row small"><span class="state ${stCls(s.enPlazo ? 'ok' : 'warn')}">${s.enPlazo ? 'En plazo' : 'Fuera de plazo'}</span><span class="state ${stCls(s.metasOk >= 4 ? 'ok' : s.metasOk >= 2 ? 'warn' : 'stop')}">${s.metasOk}/5 metas</span>${s.key === state.estructura ? '<span class="muted">· actual</span>' : ''}<span class="spacer"></span><span class="more">Ver ficha →</span></div>
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
  function openStruct(key) {
    const s = (ctx.structs || A.compareStructures(state, ctx.mods)).find((x) => x.key === key), I = A.STRUCTURE_INFO[key], r = s.r;
    const list = (a) => `<ul>${a.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    const el = openModal(`<div class="eyebrow">Vehículo societario</div><h2 style="font-size:1.9rem">${s.nombre}</h2>
      <p class="lede" style="margin-top:8px">${I.como}</p>
      <div class="chart mt">${flowSVG(I.flujo)}</div>
      <div class="mgrid mt">
        <div><span>Liquidez mínima</span><b>${F.eur(r.cajaRef)}</b></div><div><span>Recuperación</span><b>${F.months(r.payback)}</b></div>
        <div><span>Tamaño pleno</span><b>mes ${s.mesPleno}${s.enPlazo ? '' : ' (fuera de plazo)'}</b></div><div><span>Metas cumplidas</span><b>${s.metasOk}/5</b></div>
        <div><span>Control</span><b>${s.control} %</b></div><div><span>Puesta en marcha</span><b>${I.plazo}</b></div>
      </div>
      <div class="grid cols-2 mt">
        <div><h4>Ventajas</h4>${list(I.ventajas)}</div>
        <div><h4>Inconvenientes</h4>${list(I.inconvenientes)}</div>
      </div>
      <h4>Fiscalidad (orientativa, España)</h4>${list(I.fiscal)}
      <h4>Requisitos</h4>${list(I.requisitos)}
      <div class="grid cols-2"><div><h4>Coste</h4><p>${I.coste}</p></div><div><h4>Cuándo conviene</h4><p>${I.conviene}</p></div></div>
      <h4>Riesgos</h4>${list(I.riesgos)}
      <h4>Pasos para ponerla en marcha</h4><ol>${I.pasos.map((x) => `<li>${x}</li>`).join('')}</ol>
      <h4>Relaciones dentro del grupo</h4><div class="chips">${A.GROUP_TOPICS.map((g, i) => `<button class="vchip ind" data-gt="${i}">${g.t}</button>`).join('')}</div><p class="small" id="gtText"></p>
      <p class="note">Orientativo para preparar la conversación con asesores fiscal y legal. No sustituye su dictamen.</p>
      <div class="row mt"><button class="btn solid" id="stAdopt">${key === state.estructura ? 'Es la estructura actual' : 'Adoptar esta estructura'}</button><button class="btn" id="stAsk">Preguntar al asistente</button></div>`);
    $$('[data-gt]', el).forEach((b) => b.onclick = () => { const g = A.GROUP_TOPICS[+b.dataset.gt]; $('#gtText', el).innerHTML = `<b>${g.t}.</b> ${g.d}`; });
    $('#stAdopt', el).onclick = () => { state.estructura = key; closeModal(); toast('Estructura adoptada: ' + s.nombre); schedule(); };
    $('#stAsk', el).onclick = () => { closeModal(); A.assistant && A.assistant.ask(`Explícame la estructura «${s.nombre}» aplicada a mi caso y cómo se relacionan las sociedades del grupo.`); };
  }

  /* ---------------- Meta y plan ---------------- */
  const TARGETS = [
    { p: 'meta.cajaMin', n: 'Liquidez mínima', key: 'cajaMin', min: 0, max: 1500000, step: 10000, f: F.eur },
    { p: 'meta.paybackMax', n: 'Recuperación máx.', key: 'payback', min: 1, max: 12, step: 0.5, f: (v) => String(v).replace('.', ',') + ' años' },
    { p: 'meta.dscrMin', n: 'Cobertura mínima', key: 'dscr', min: 1, max: 3, step: 0.05, f: F.x },
    { p: 'meta.deudaEbitdaMax', n: 'Deuda/EBITDA máx.', key: 'deuda', min: 1, max: 6, step: 0.1, f: F.x },
    { p: 'meta.pesoSalarialMax', n: 'Peso salarial máx.', key: 'salarial', min: 5, max: 70, step: 0.5, f: F.pct },
    { p: 'meta.plazoObjetivo', n: 'Tamaño pleno antes de', key: null, min: 6, max: 60, step: 1, f: (v) => 'mes ' + v }
  ];
  function renderPlan() {
    const Pl = ctx.plan, metas = Pl.antes.metas;
    $('#targets').innerHTML = TARGETS.map((t, i) => {
      const m = t.key ? metas.find((x) => x.key === t.key) : null;
      const now = m ? m.f(m.valor) : `mes ${ctx.active.tamano.mesCrucero}`;
      const ok = m ? m.ok : ctx.active.tamano.mesCrucero <= state.meta.plazoObjetivo;
      return `<div class="target-tile"><div class="t"><span>${t.n}</span></div><div class="now"><span>${now}</span><span class="state ${stCls(ok ? 'ok' : 'stop')}">${ok ? 'Cumple' : 'Falla'}</span></div><div class="obj">meta: <b id="tv${i}">${t.f(getPath(t.p))}</b></div><input type="range" id="tg${i}" min="${t.min}" max="${t.max}" step="${t.step}" value="${getPath(t.p)}" aria-label="${t.n}"></div>`;
    }).join('');
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
    $('#planSummary').innerHTML = sum;
    INFO['plan-help'] = { t: 'Cómo se calcula el plan', d: 'En cada ronda Atalaya prueba todas las palancas y elige la que más acerca a la meta por unidad de esfuerzo (negociar con el banco cuesta menos que aportar capital). Después repasa el plan hacia atrás y devuelve cada palanca al mínimo imprescindible.' };
    $('#planSteps').innerHTML = Pl.acciones.map((a) => `<div class="step"><div><div class="what">${a.lv.nombre}</div><div class="how">De ${A.report.lv(a.lv, a.desde)} a <b style="color:var(--fg)">${A.report.lv(a.lv, a.hasta)}</b> · ${a.lv.resp}</div></div><div class="eff">${F.eur(a.antes.cajaRef)} → ${F.eur(a.despues.cajaRef)}<small>liquidez mínima</small></div></div>`).join('');
    const ap = $('#applyPlan');
    if (ap) ap.onclick = applyPlan;
    $('#leverTable').innerHTML = Pl.ok ? '<p class="small muted">Sin metas que corregir.</p>' : `<table><thead><tr><th>Palanca</th><th>Hoy</th><th>Necesario</th><th>¿Basta?</th></tr></thead><tbody>` +
      Pl.individuales.map((x) => `<tr><td>${x.lv.nombre}</td><td>${A.report.lv(x.lv, x.desde)}</td><td>${A.report.lv(x.lv, x.hasta)}</td><td><span class="state ${stCls(x.basta ? 'ok' : 'warn')}">${x.basta ? 'Sí' : 'No'}</span></td></tr>`).join('') + '</tbody></table>';
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
      gen++; computeHeavy(gen);
    }));
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
    $('#surfaceCtl').hidden = view.mode !== 'surface';
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
  function renderSectors() {
    $('#sectors').innerHTML = Object.keys(A.SECTORS).map((k) => `<button class="chip" data-k="${k}" aria-pressed="${k === state.sector}">${A.SECTORS[k].nombre}</button>`).join('');
    $('#sectorNote').textContent = A.SECTORS[state.sector].nota;
    $$('#sectors .chip').forEach((b) => b.addEventListener('click', () => applySector(b.dataset.k)));
  }
  function applySector(k) {
    A.applySector(state, k); renderSectors(); syncFields(); toast('Perfil cargado: ' + A.SECTORS[k].nombre); schedule();
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
      <span class="spacer"></span>${inFrame ? '' : '<button class="btn" id="repPrint">Imprimir o guardar PDF</button>'}<button class="btn ghost" id="repCopy">Copiar texto</button><button class="btn solid" id="repClose">Cerrar</button></div><article class="paper" id="paper"></article>`;
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
    $('#empresaNombre').addEventListener('input', (e) => { state.empresaNombre = e.target.value; store.set(STORE, state); });
    $('#proyecto').addEventListener('input', (e) => { state.proyecto = e.target.value; store.set(STORE, state); });
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
