/* Atalaya · Controlador de la aplicación */
(function () {
  const A = window.Atalaya;
  const F = A.fmt, C = A.charts;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const STORE = 'atalaya.v1', SNAP = 'atalaya.snapshots.v1';
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ } }
  };

  let state = store.get(STORE);
  if (!state || !state.empresa || !A.SECTORS[state.sector]) state = A.defaultState();
  let ctx = null;
  const hidden = {};
  const view = { mode: 'surface', ax: 'incVentas', ay: 'pctFin', metric: 'cajaMin' };

  /* ---------------- Campos ---------------- */
  const pct = { min: 0, max: 100, step: 0.5, u: '%' };
  const FIELDS = {
    'f-pyg': [
      { p: 'empresa.ventas', l: 'Ventas anuales', min: 100000, max: (s) => Math.max(20000000, s.empresa.ventas * 2), step: 10000, u: '€' },
      { p: 'empresa.margen', l: 'Margen bruto', ...pct },
      { p: 'empresa.personal', l: 'Coste de personal', min: 0, max: (s) => s.empresa.ventas, step: 1000, u: '€/año' },
      { p: 'empresa.fijos', l: 'Otros gastos fijos', min: 0, max: (s) => s.empresa.ventas * 0.6, step: 1000, u: '€/año' },
      { p: 'empresa.plantilla', l: 'Plantilla actual', min: 1, max: 500, step: 1, u: 'pers.' },
      { p: 'empresa.crecimiento', l: 'Crecimiento orgánico', min: -10, max: 30, step: 0.5, u: '%/año' },
      { p: 'empresa.impuesto', l: 'Impuesto de sociedades', min: 0, max: 35, step: 1, u: '%' }
    ],
    'f-balance': [
      { p: 'empresa.caja', l: 'Caja disponible', min: 0, max: (s) => Math.max(3000000, s.empresa.caja * 2), step: 5000, u: '€' },
      { p: 'empresa.deudaViva', l: 'Deuda financiera viva', min: 0, max: (s) => Math.max(5000000, s.empresa.deudaViva * 2), step: 5000, u: '€' },
      { p: 'empresa.cuotaDeuda', l: 'Cuota mensual actual', min: 0, max: 200000, step: 500, u: '€/mes' },
      { p: 'empresa.fondosPropios', l: 'Fondos propios', min: 0, max: (s) => Math.max(10000000, s.empresa.fondosPropios * 2), step: 10000, u: '€' },
      { p: 'empresa.dso', l: 'Días de cobro', min: 0, max: 180, step: 1, u: 'días' },
      { p: 'empresa.dio', l: 'Días de stock', min: 0, max: 180, step: 1, u: 'días' },
      { p: 'empresa.dpo', l: 'Días de pago', min: 0, max: 180, step: 1, u: 'días' }
    ],
    'f-fin': [
      { p: 'inversion.importe', l: 'Importe de la inversión', min: 10000, max: (s) => Math.max(10000000, s.inversion.importe * 2), step: 10000, u: '€' },
      { p: 'inversion.pctFin', l: 'Parte financiada', min: 0, max: 100, step: 1, u: '%' },
      { p: 'inversion.aportacion', l: 'Aportación de socios', min: 0, max: (s) => s.inversion.importe, step: 10000, u: '€' },
      { p: 'inversion.tipo', l: 'Tipo de interés', min: 0, max: 15, step: 0.1, u: '%' },
      { p: 'inversion.plazo', l: 'Plazo del préstamo', min: 1, max: 15, step: 0.5, u: 'años' },
      { p: 'inversion.carencia', l: 'Carencia', min: 0, max: 36, step: 1, u: 'meses' },
      { p: 'inversion.mesInicio', l: 'Mes de la inversión', min: 1, max: 24, step: 1, u: 'mes' }
    ],
    'f-act': [
      { p: 'inversion.incVentas', l: 'Venta nueva en crucero', min: 0, max: 200, step: 1, u: '% s/ventas' },
      { p: 'inversion.margenNuevo', l: 'Margen bruto nuevo', ...pct },
      { p: 'inversion.rampa', l: 'Meses de rampa', min: 1, max: 36, step: 1, u: 'meses' },
      { p: 'inversion.fijosNuevos', l: 'Fijos nuevos', min: 0, max: (s) => Math.max(1000000, s.inversion.fijosNuevos * 2), step: 1000, u: '€/año' },
      { p: 'inversion.vidaUtil', l: 'Vida útil del activo', min: 2, max: 30, step: 1, u: 'años' }
    ],
    'f-org': [
      { p: 'inversion.contrataciones', l: 'Contrataciones', min: 0, max: 200, step: 1, u: 'pers.' },
      { p: 'inversion.salario', l: 'Coste por persona', min: 12000, max: 150000, step: 500, u: '€/año' },
      { p: 'inversion.anticipo', l: 'Anticipo de contratación', min: -6, max: 12, step: 1, u: 'meses' },
      { p: 'humano.mandos', l: 'Mandos intermedios', min: 0, max: 60, step: 1, u: 'pers.' }
    ],
    'f-human': [
      { p: 'humano.mandos', l: 'Mandos intermedios', min: 0, max: 60, step: 1, u: 'pers.' },
      { p: 'humano.dependencia', l: 'Dependencia del fundador', min: 0, max: 100, step: 5, u: '/100' },
      { p: 'humano.procesos', l: 'Procesos documentados', min: 0, max: 100, step: 5, u: '%' },
      { p: 'humano.rotacion', l: 'Rotación anual', min: 0, max: 60, step: 1, u: '%' },
      { p: 'humano.tiempoContratacion', l: 'Meses para contratar', min: 0, max: 12, step: 1, u: 'meses' }
    ],
    'f-custom': [
      { p: 'custom.ventasF', l: 'Venta nueva lograda', min: 0.2, max: 1.6, step: 0.05, u: '× plan' },
      { p: 'custom.retraso', l: 'Retraso de la rampa', min: -3, max: 18, step: 1, u: 'meses' },
      { p: 'custom.margenDelta', l: 'Desvío de margen', min: -12, max: 6, step: 0.5, u: 'pp' },
      { p: 'custom.sobrecoste', l: 'Sobrecoste de inversión', min: -10, max: 60, step: 1, u: '%' },
      { p: 'custom.dsoDelta', l: 'Desvío en días de cobro', min: -40, max: 90, step: 1, u: 'días' },
      { p: 'custom.tipoDelta', l: 'Desvío de tipos', min: -3, max: 6, step: 0.1, u: 'pp' }
    ]
  };
  const getPath = (p) => p.split('.').reduce((o, k) => o[k], state);
  const setPath = (p, v) => { const [a, b] = p.split('.'); state[a][b] = v; };
  const resolve = (v) => (typeof v === 'function' ? v(state) : v);
  const nfField = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
  const fmtField = (f, v) => nfField.format(f.step >= 1 ? Math.round(v) : Math.round(v * 100) / 100);

  function buildFields() {
    Object.keys(FIELDS).forEach((gid) => {
      const host = document.getElementById(gid);
      host.innerHTML = FIELDS[gid].map((f) => {
        const id = (gid + '_' + f.p).replace(/\./g, '_');
        return `<div class="field" data-p="${f.p}"><div class="top"><label for="${id}" data-info="${f.p}">${f.l}</label><span class="val"><input class="fnum" type="text" inputmode="decimal" id="${id}" aria-label="${f.l}"><span class="u">${f.u}</span></span></div><input type="range" id="${id}_r" step="${f.step}" aria-label="${f.l} (deslizador)"></div>`;
      }).join('');
      FIELDS[gid].forEach((f) => {
        const id = (gid + '_' + f.p).replace(/\./g, '_');
        const num = document.getElementById(id), rng = document.getElementById(id + '_r');
        const commit = (v, src) => {
          if (typeof v === 'string') v = v.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
          v = parseFloat(v); if (!isFinite(v)) return;
          setPath(f.p, v);
          syncFields(src);
          schedule();
        };
        num.addEventListener('change', () => commit(num.value, num));
        rng.addEventListener('input', () => commit(rng.value, rng));
      });
    });
  }
  function syncFields(except) {
    Object.keys(FIELDS).forEach((gid) => FIELDS[gid].forEach((f) => {
      const id = (gid + '_' + f.p).replace(/\./g, '_');
      const num = document.getElementById(id), rng = document.getElementById(id + '_r');
      const v = getPath(f.p), mn = resolve(f.min), mx = Math.max(resolve(f.max), v);
      rng.min = mn; rng.max = mx;
      if (num !== except) num.value = fmtField(f, v);
      if (rng !== except) rng.value = v;
      rng.style.setProperty('--p', ((v - mn) / (mx - mn || 1)) * 100 + '%');
    }));
    $('#empresaNombre').value = state.empresaNombre;
    $('#proyecto').value = state.proyecto;
  }

  /* ---------------- Fichas informativas ---------------- */
  const INFO = {
    veredicto: { t: 'Veredicto de movimiento', d: 'Síntesis de los diez semáforos del escenario activo. Rojo en liquidez o tres rojos obligan a rediseñar; un rojo o cuatro ámbar exigen condiciones previas.', v: (c) => c.active.verdict.titulo },
    dimension: { t: 'Dimensión de la inversión', d: 'Cuánto pesa la inversión frente a la empresa actual. Por debajo del 15 % de las ventas es táctica; entre el 40 % y el 80 %, estratégica; por encima, transforma la empresa.', f: 'inversión ÷ ventas · inversión ÷ EBITDA', v: (c) => `${c.active.dim.clase} · ${F.x(c.active.dim.sobreEbitda)} EBITDA` },
    sobreVentas: { t: 'Inversión sobre ventas', d: 'Mide el salto de escala. Una inversión que supera el 40 % de lo que facturas cambia la naturaleza del negocio.', f: 'inversión total ÷ ventas anuales', v: (c) => F.pct(c.active.dim.sobreVentas * 100) },
    sobreEbitda: { t: 'Años de EBITDA', d: 'Cuántos años de beneficio operativo actual cuesta la inversión. Por encima de 4 años, la empresa no puede pagarla desde su rentabilidad sin financiación larga.', f: 'inversión total ÷ EBITDA actual', v: (c) => F.x(c.active.dim.sobreEbitda) },
    sobreFondos: { t: 'Sobre fondos propios', d: 'Qué parte del patrimonio se pone en juego. Por encima del 100 % la empresa apuesta más de lo que vale contablemente.', f: 'inversión total ÷ fondos propios', v: (c) => F.pct(c.active.dim.sobreFondos * 100) },
    sobreCaja: { t: 'Veces la caja', d: 'Cuántas veces la caja actual representa la inversión.', f: 'inversión total ÷ caja', v: (c) => F.x(c.active.dim.sobreCaja) },
    financiado: { t: 'Préstamo nuevo', d: 'Parte de la inversión que se financia con deuda en la estructura elegida.', f: 'inversión × % financiado', v: (c) => F.eur(c.active.loan) },
    cuota: { t: 'Cuota mensual nueva', d: 'Pago mensual del préstamo nuevo (capital más intereses) una vez acabada la carencia. Durante la carencia solo se pagan intereses.', f: 'sistema francés · plazo − carencia', v: (c) => `${F.eur(c.active.cuotaNueva)} · carencia ${F.eur(c.active.cuotaCarencia)}` },
    cajaMin: { t: 'Caja mínima', d: 'El punto más bajo de la tesorería en los próximos 60 meses. Es la prueba de fuego: si es negativa, la inversión rompe liquidez aunque sea rentable.', f: 'caja + EBITDA − impuestos − Δcirculante − deuda − inversión propia', v: (c) => `${F.eur(c.active.cajaMin)} en el mes ${c.active.mesCajaMin}` },
    payback: { t: 'Recuperación', d: 'Meses hasta que el flujo operativo incremental (después de impuestos y circulante) devuelve la inversión. La recuperación de caja mide cuándo la propiedad vuelve a tener la caja que habría tenido sin invertir.', f: 'Σ flujo incremental ≥ inversión', v: (c) => `${F.months(c.active.payback)} · caja ${F.months(c.active.paybackCaja)}` },
    dscr: { t: 'Cobertura de la deuda (DSCR)', d: 'Cuántas veces el flujo operativo cubre el servicio total de la deuda en el peor año. La banca suele exigir 1,2× o más.', f: '(EBITDA − impuestos) ÷ (capital + intereses)', v: (c) => F.x(c.active.dscrMin) },
    deuda: { t: 'Deuda neta / EBITDA', d: 'Años de beneficio operativo necesarios para devolver la deuda neta. Por encima de 3× la empresa pierde margen de maniobra con la banca.', f: '(deuda − caja) ÷ EBITDA 12 meses', v: (c) => F.x(c.active.deudaEbitda) },
    salarial: { t: 'Peso salarial', d: 'Coste de personal sobre ventas en el año de crucero. Cada sector tiene su rango sano; superarlo indica que el crecimiento se apoya en más horas y no en más productividad.', f: 'personal ÷ ventas', v: (c) => `${F.pct(c.active.tamano.antes.pesoSalarial)} → ${F.pct(c.active.tamano.despues.pesoSalarial)}` },
    humano: { t: 'Sistema operativo humano', d: 'Preparación de la organización para el nuevo tamaño: estructura de mando, absorción de personas, dependencia del fundador, procesos, estabilidad y tiempos de contratación.', v: (c) => `${Math.round(c.active.humano.score)}/100` },
    van: { t: 'VAN y TIR', d: 'Valor actual del flujo incremental a 5 años al 8 %, con valor residual. La TIR debería superar el coste de la deuda en al menos 4 puntos.', v: (c) => `VAN ${F.eur(c.active.van)} · TIR ${c.active.tir === null ? 'n/d' : F.pct(c.active.tir * 100)}` },
    'empresa.ventas': { t: 'Ventas anuales', d: 'Facturación de los últimos doce meses. Es la base sobre la que se mide el salto de la inversión.' },
    'empresa.margen': { t: 'Margen bruto', d: 'Ventas menos coste directo de lo vendido (materiales, subcontratación directa), en porcentaje.' },
    'empresa.personal': { t: 'Coste de personal', d: 'Salarios brutos más Seguridad Social de toda la plantilla actual.' },
    'empresa.fijos': { t: 'Otros gastos fijos', d: 'Alquileres, suministros, seguros, asesorías y resto de gastos que no dependen de la venta.' },
    'empresa.dso': { t: 'Días de cobro (DSO)', d: 'Días medios que tardan los clientes en pagar. Cuanto más vendes, más caja se queda en la calle.' },
    'empresa.dio': { t: 'Días de stock (DIO)', d: 'Días de coste de ventas que tienes en almacén.' },
    'empresa.dpo': { t: 'Días de pago (DPO)', d: 'Días medios que tardas en pagar a proveedores. Financian parte del circulante.' },
    'empresa.cuotaDeuda': { t: 'Cuota actual', d: 'Lo que pagas hoy cada mes por préstamos existentes (capital más intereses).' },
    'inversion.pctFin': { t: 'Parte financiada', d: 'Porcentaje de la inversión que cubre el préstamo. El resto sale de la caja de la empresa o de aportaciones de socios.' },
    'inversion.carencia': { t: 'Carencia', d: 'Meses iniciales en los que solo se pagan intereses. Debería cubrir, como mínimo, la rampa comercial.' },
    'inversion.incVentas': { t: 'Venta nueva en crucero', d: 'Cuánto crecerán las ventas, en % sobre las actuales, cuando la actividad nueva funcione a pleno rendimiento.' },
    'inversion.rampa': { t: 'Meses de rampa', d: 'Tiempo desde la puesta en marcha hasta alcanzar la venta de crucero. Es la variable que más se subestima.' },
    'inversion.anticipo': { t: 'Anticipo de contratación', d: 'Meses antes del arranque en que se incorporan las personas nuevas. Positivo: antes del arranque (coste sin ingreso). Negativo: después.' },
    'inversion.aportacion': { t: 'Aportación de socios', d: 'Capital que aportan los socios en el momento de la inversión. Reduce la caja que sale de la empresa.' },
    'humano.dependencia': { t: 'Dependencia del fundador', d: '0 = la organización decide sola; 100 = todo pasa por una persona.' },
    'humano.procesos': { t: 'Procesos documentados', d: 'Porcentaje de procesos críticos escritos y transmisibles sin depender de una persona.' },
    'custom.ventasF': { t: 'Venta nueva lograda', d: '1 = se cumple el plan; 0,7 = se logra el 70 % de la venta prevista.' }
  };
  const card = $('#floatCard');
  let openedAt = 0;
  function openCard(key, anchor, extra) {
    const info = INFO[key] || extra;
    if (!info) return;
    const val = info.v && ctx ? info.v(ctx) : null;
    card.innerHTML = `<button class="icon-btn close" aria-label="Cerrar">×</button><h5>${info.t}</h5>${val ? `<div class="fv">${val}</div>` : ''}<p>${info.d}</p>${info.f ? `<div class="formula">${info.f}</div>` : ''}${info.html || ''}`;
    card.hidden = false;
    openedAt = Date.now();
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.clientX, right: anchor.clientX, top: anchor.clientY, bottom: anchor.clientY };
    const w = card.offsetWidth, h = card.offsetHeight;
    let left = r.left, top = r.bottom + 10;
    if (left + w > innerWidth - 12) left = innerWidth - w - 12;
    if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 10);
    card.style.left = Math.max(12, left) + 'px'; card.style.top = top + 'px';
    card.querySelector('.close').onclick = () => { card.hidden = true; };
    return card;
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-info]');
    if (t) { e.preventDefault(); openCard(t.dataset.info, t); return; }
    if (Date.now() - openedAt < 80) return;
    if (!card.hidden && !card.contains(e.target) && !e.target.closest('canvas')) card.hidden = true;
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { card.hidden = true; $('#toolbox').hidden = true; closeReport(); } });

  /* ---------------- Cálculo ---------------- */
  let tQuick = null, tHeavy = null;
  function schedule() {
    clearTimeout(tQuick); clearTimeout(tHeavy);
    tQuick = setTimeout(computeQuick, 30);
    tHeavy = setTimeout(computeHeavy, 380);
    store.set(STORE, state);
  }
  function computeQuick() {
    const all = A.SCENARIOS.map((sc, i) => ({ key: sc.key, nombre: sc.nombre, desc: sc.desc, i, r: A.analyze(state, A.scenarioMods(state, sc.key)) }));
    const active = all.find((x) => x.key === state.escenario).r;
    ctx = Object.assign(ctx || {}, { all, active, mods: A.scenarioMods(state, state.escenario) });
    renderTop(); renderHero(); renderDimension(); renderScenarios(); renderLights(); renderSize(); renderHuman();
    if (view.mode === 'traj') render3D();
  }
  function computeHeavy() {
    if (!ctx) computeQuick();
    const mods = ctx.mods;
    ctx.sens = A.sensitivity(state, mods, 'cajaMin');
    ctx.risks = A.risks(state, ctx.active, ctx.sens);
    ctx.structs = A.compareStructures(state, mods);
    ctx.plan = A.correctionPlan(state, mods);
    renderRisks(); renderStructs(); renderPlan(); render3D();
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
    const pill = $('#verdictPill');
    pill.className = 'verdict-pill v-' + v.key;
    $('#verdictTxt').textContent = v.titulo;
  }
  function setScenario(k) { state.escenario = k; schedule(); }

  /* ---------------- Puente de mando ---------------- */
  const stCls = (s) => 'st-' + s;
  const stName = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  function renderHero() {
    const r = ctx.active, v = r.verdict, sc = A.SCENARIOS.find((s) => s.key === state.escenario);
    $('#sectorLabel').textContent = A.SECTORS[state.sector].nombre + ' · ' + A.STRUCTURES[state.estructura].nombre;
    $('#verdictCard').innerHTML = `<div class="row"><h4>Veredicto · escenario ${sc.nombre.toLowerCase()}</h4><span class="spacer"></span><span class="state ${stCls({ go: 'ok', warn: 'warn', stop: 'stop' }[v.key])}">${{ go: 'Verde', warn: 'Ámbar', stop: 'Rojo' }[v.key]}</span></div>
      <div class="big">${v.titulo}</div><p class="muted small" style="margin:0">${v.texto}</p>
      <div class="bar" aria-label="Semáforos">${r.lights.map((l) => `<span data-light="${l.key}" style="background:${A.stateColor(l.estado)};opacity:${l.estado === 'ok' ? 0.55 : 0.95}" title="${l.nombre}: ${l.valor}"></span>`).join('')}</div>
      <div class="row small muted" style="margin-top:8px;justify-content:space-between"><span>${r.lights.filter((l) => l.estado === 'ok').length} verdes · ${r.lights.filter((l) => l.estado === 'warn').length} ámbar · ${r.lights.filter((l) => l.estado === 'stop').length} rojos</span><a href="#riesgos" style="color:var(--gold)">Ver semáforos</a></div>`;
    $$('#verdictCard [data-light]').forEach((s) => {
      const l = r.lights.find((x) => x.key === s.dataset.light);
      s.addEventListener('click', () => openCard(null, s, { t: l.nombre, d: l.lectura, v: () => `${l.valor} · ${stName[l.estado]}` }));
    });
    const lt = Object.fromEntries(r.lights.map((l) => [l.key, l.estado]));
    const tiles = [
      { k: 'Dimensión', info: 'dimension', v: r.dim.clase, d: `${F.x(r.dim.sobreEbitda)} EBITDA · ${F.pct(r.dim.sobreVentas * 100)} ventas`, st: lt.dimension },
      { k: 'Cuota mensual', info: 'cuota', v: F.eur(r.cuotaNueva), d: `${F.pct(r.cuotaSobreEbitda)} del EBITDA mensual con la deuda actual`, st: lt.cobertura },
      { k: 'Caja mínima', info: 'cajaMin', v: F.eur(r.cajaMin), d: `mes ${r.mesCajaMin} · ${F.eur(r.cajaFinal)} a 5 años`, st: lt.liquidez, spark: C.spark(r.w.cash, r.cajaMin < 0 ? css('--stop') : css('--gold'), true) },
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
    const series = ctx.all.map((x) => ({ name: x.nombre, data: x.r.w.cash, color: A.seriesColor(x.i), active: x.key === state.escenario, hidden: !!hidden[x.key] }));
    C.cash($('#cashChart'), $('#cashLegend'), series, {
      target: state.meta.cajaMin, start: ctx.active.start,
      onToggle: (i) => { const k = ctx.all[i].key; hidden[k] = !hidden[k]; renderScenarios(); }
    });
    let t = `<table><thead><tr><th>Escenario</th><th>Caja mín.</th><th>Recuperación</th><th>DSCR</th><th>Estado</th></tr></thead><tbody>`;
    ctx.all.forEach((x) => {
      const r = x.r, st = { go: 'ok', warn: 'warn', stop: 'stop' }[r.verdict.key];
      t += `<tr class="clickable ${x.key === state.escenario ? 'active' : ''}" data-k="${x.key}"><td><span class="sw" style="background:${A.seriesColor(x.i)}"></span>${x.nombre}</td><td style="color:${r.cajaMin < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(r.cajaMin)}</td><td>${F.months(r.payback)}</td><td>${F.x(r.dscrMin)}</td><td><span class="state ${stCls(st)}">${stName[st]}</span></td></tr>`;
    });
    $('#scenarioTable').innerHTML = t + '</tbody></table><p class="small muted">Haz clic en una fila para convertirla en el escenario activo.</p>';
    $$('#scenarioTable tr[data-k]').forEach((tr) => tr.addEventListener('click', () => setScenario(tr.dataset.k)));
    renderHyp();
  }
  function renderHyp() {
    const host = $('#hypList');
    host.innerHTML = state.hipotesis.length ? state.hipotesis.map((h) => `<div class="hyp" data-id="${h.id}">
        <button class="switch" role="switch" aria-checked="${h.activo}" aria-label="Activar hipótesis"></button>
        <div><div>${A.SHOCKS[h.tipo].nombre}</div><div class="meta">
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
  function addHyp(tipo) {
    const def = { cliente: 10, ventas: 15, margen: 3, tipos: 1.5, cobro: 20, salarios: 4, puntual: 80 }[tipo];
    state.hipotesis.push({ id: 'h' + Date.now(), tipo, mes: 12, duracion: ['cliente', 'tipos', 'salarios'].includes(tipo) ? 60 : 6, magnitud: def, activo: true });
    schedule();
  }

  /* ---------------- Semáforos y riesgos ---------------- */
  function renderLights() {
    $('#lights').innerHTML = ctx.active.lights.map((l) => `<button class="light" data-k="${l.key}"><div class="lamp" aria-hidden="true"><i class="${l.estado === 'stop' ? 'on stop' : ''}"></i><i class="${l.estado === 'warn' ? 'on warn' : ''}"></i><i class="${l.estado === 'ok' ? 'on ok' : ''}"></i></div><div><div class="n">${l.nombre}</div><div class="lv">${l.valor}</div><div class="lt">${stName[l.estado]}</div></div></button>`).join('');
    $$('#lights .light').forEach((b) => {
      const l = ctx.active.lights.find((x) => x.key === b.dataset.k);
      b.addEventListener('click', () => openCard(null, b, { t: l.nombre, d: l.lectura, v: () => `${l.valor} · ${stName[l.estado]}` }));
    });
  }
  function renderRisks() {
    C.riskMatrix($('#riskMatrix'), ctx.risks, (r, ev) => openCard(null, ev.target, { t: r.nombre, d: r.mitigacion, v: () => `Nivel ${r.nivel} · ${stName[r.estado]}` }));
    C.tornado($('#tornado'), ctx.sens);
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
    $('#humanTxt').innerHTML = st === 'ok' ? 'La organización está preparada para el nuevo tamaño.' : st === 'warn' ? 'Preparada a medias: hay que reforzar antes del arranque.' : 'La organización no está lista para esta misión.';
    $('#humanTxt').innerHTML += ` <br>Plantilla final: <b>${h.total}</b> personas (+${Math.round(h.crec * 100)} %). Mandos necesarios: <b>${h.mandosNecesarios}</b>.`;
    $('#humanDims').innerHTML = h.dims.map((d) => {
      const s = d.score >= 70 ? 'ok' : d.score >= 50 ? 'warn' : 'stop';
      return `<div class="dimrow" data-dim="${d.key}"><span>${d.nombre}</span><span class="num" style="text-align:right">${Math.round(d.score)}</span><div class="meter"><b style="width:${d.score}%;background:${A.stateColor(s)}"></b></div></div>`;
    }).join('');
    $$('#humanDims .dimrow').forEach((row) => {
      const d = h.dims.find((x) => x.key === row.dataset.dim);
      row.addEventListener('click', () => openCard(null, row, { t: d.nombre, d: d.lectura, v: () => `${Math.round(d.score)}/100` }));
    });
    $('#humanPlan').innerHTML = h.acciones.slice().sort((a, b) => a.cuando - b.cuando).map((a) => `<div class="ev"><div class="when">MES ${a.cuando}${a.coste ? ' · ' + F.eur(a.coste) : ''}</div><div>${a.que}</div></div>`).join('');
  }

  /* ---------------- Estructuras ---------------- */
  function renderStructs() {
    const S = ctx.structs;
    $('#structLede').innerHTML = `Seis formas de hacer la misma inversión con la meta de alcanzar el tamaño pleno antes del <b>mes ${state.meta.plazoObjetivo}</b>. Cada una cambia la caja, el retorno para la propiedad, el control y el tiempo. Haz clic en una para adoptarla en todo el simulador.`;
    $('#structs').innerHTML = S.map((s, i) => {
      const r = s.r;
      const attr = (n, v, inv) => `<div class="attr"><span>${n}</span><span class="track"><b style="width:${v}%;background:${inv ? css('--s2') : css('--s1')}"></b></span><span>${v}</span></div>`;
      return `<button class="glass struct ${s.key === state.estructura ? 'current' : ''}" data-k="${s.key}">
        <div class="head"><span class="name">${s.nombre}</span><span class="score">${i === 0 ? '★ ' : ''}${Math.round(s.score)}</span></div>
        <div class="small muted">${s.desc}</div>
        <div class="stats"><div>Caja mínima<b style="color:${r.cajaMin < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(r.cajaMin)}</b></div><div>Recuperación<b>${F.months(r.payback)}</b></div><div>Tamaño pleno<b style="color:${s.enPlazo ? 'inherit' : 'var(--warn)'}">mes ${s.mesPleno}</b></div></div>
        <div class="attrs">${attr('Control', s.control)}${attr('Aislamiento', s.aislamiento)}${attr('Complejidad', s.complejidad, true)}</div>
        <div class="row small"><span class="state ${stCls(s.enPlazo ? 'ok' : 'warn')}">${s.enPlazo ? 'En plazo' : 'Fuera de plazo'}</span><span class="state ${stCls(s.metasOk >= 4 ? 'ok' : s.metasOk >= 2 ? 'warn' : 'stop')}">${s.metasOk}/5 metas</span>${s.key === state.estructura ? '<span class="muted">· estructura actual</span>' : ''}</div>
      </button>`;
    }).join('');
    $$('#structs .struct').forEach((b) => b.addEventListener('click', () => { state.estructura = b.dataset.k; toast('Estructura adoptada: ' + A.STRUCTURES[b.dataset.k].nombre); schedule(); }));
  }

  /* ---------------- Meta y plan ---------------- */
  const TARGETS = [
    { p: 'meta.cajaMin', n: 'Caja mínima', key: 'cajaMin', min: 0, max: 1500000, step: 10000, f: F.eur },
    { p: 'meta.paybackMax', n: 'Recuperación máx.', key: 'payback', min: 1, max: 12, step: 0.5, f: (v) => String(v).replace('.', ',') + ' años' },
    { p: 'meta.dscrMin', n: 'Cobertura mínima', key: 'dscr', min: 1, max: 3, step: 0.05, f: F.x },
    { p: 'meta.deudaEbitdaMax', n: 'Deuda/EBITDA máx.', key: 'deuda', min: 1, max: 6, step: 0.1, f: F.x },
    { p: 'meta.pesoSalarialMax', n: 'Peso salarial máx.', key: 'salarial', min: 5, max: 70, step: 0.5, f: F.pct },
    { p: 'meta.plazoObjetivo', n: 'Tamaño pleno antes de', key: null, min: 6, max: 60, step: 1, f: (v) => 'mes ' + v }
  ];
  function renderPlan() {
    const P = ctx.plan, metas = P.antes.metas;
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
    if (P.ok) sum = `<div class="note">El escenario ${sc.nombre.toLowerCase()} ya alcanza la posición meta. No hace falta corregir.</div>`;
    else if (P.alcanzado) sum = `<div class="note">Con ${P.acciones.length} palanca${P.acciones.length > 1 ? 's' : ''} el escenario ${sc.nombre.toLowerCase()} alcanza todas las metas.</div>`;
    else sum = `<div class="note">${P.acciones.length ? `Estas palancas corrigen lo corregible. ` : ''}${P.inalcanzables && P.inalcanzables.length ? `<b>${P.inalcanzables.map((m) => m.nombre).join(', ')}</b> no se alcanza${P.inalcanzables.length > 1 ? 'n' : ''} solo con palancas en el escenario ${sc.nombre.toLowerCase()}: hay que rediseñar el proyecto (estructura, tamaño o tesis comercial).` : ''}</div>`;
    if (!P.ok && P.acciones.length) sum += `<div class="row mt"><button class="btn solid" id="applyPlan">Aplicar el plan al simulador</button><button class="btn ghost" data-info="plan-help">Cómo se calcula</button></div>`;
    $('#planSummary').innerHTML = sum;
    INFO['plan-help'] = { t: 'Cómo se calcula el plan', d: 'Atalaya mueve las palancas de la más sencilla (negociación bancaria) a la más costosa (aportar capital). En cada una prueba doce valores y se queda con el que más reduce la distancia a la meta. Después repasa el plan hacia atrás y devuelve cada palanca al mínimo imprescindible.' };
    $('#planSteps').innerHTML = P.acciones.map((a) => `<div class="step"><div><div class="what">${a.lv.nombre}</div><div class="how">De ${A.report.lv(a.lv, a.desde)} a <b style="color:var(--fg)">${A.report.lv(a.lv, a.hasta)}</b> · ${a.lv.resp}</div></div><div class="eff">${F.eur(a.antes.cajaMin)} → ${F.eur(a.despues.cajaMin)}<small>caja mínima</small></div></div>`).join('');
    const ap = $('#applyPlan');
    if (ap) ap.onclick = () => { P.acciones.forEach((a) => { const [x, y] = a.lv.path; state[x][y] = a.hasta; }); syncFields(); toast('Plan aplicado: revisa los semáforos'); schedule(); };
    $('#leverTable').innerHTML = P.ok ? '<p class="small muted">Sin metas que corregir.</p>' : `<table><thead><tr><th>Palanca</th><th>Hoy</th><th>Necesario</th><th>¿Basta?</th></tr></thead><tbody>` +
      P.individuales.map((x) => `<tr><td>${x.lv.nombre}</td><td>${A.report.lv(x.lv, x.desde)}</td><td>${A.report.lv(x.lv, x.hasta)}</td><td><span class="state ${stCls(x.basta ? 'ok' : 'warn')}">${x.basta ? 'Sí' : 'No'}</span></td></tr>`).join('') + '</tbody></table>';
  }

  /* ---------------- 3D ---------------- */
  let has3D = false;
  function setup3D() {
    has3D = A.scene.init({ onPick: (info, ev) => {
      if (info.traj) return;
      const c = info.cell, ax = A.AXES[info.ax], ay = A.AXES[info.ay];
      const fv = (a, v) => (a.unidad === '€' ? F.eur(v) : `${Math.round(v * 10) / 10} ${a.unidad}`);
      const el = openCard(null, { getBoundingClientRect: () => ({ left: ev.clientX, right: ev.clientX, top: ev.clientY, bottom: ev.clientY }) }, {
        t: 'Fijar esta combinación', d: `${ax.nombre}: ${fv(ax, c.x)} · ${ay.nombre}: ${fv(ay, c.y)}. Caja mínima ${F.eur(c.cajaMin)}, recuperación ${F.months(c.payback)}.`,
        html: '<div class="actions"><button class="btn solid" id="pickApply">Aplicar al plan</button></div>'
      });
      $('#pickApply', el).onclick = () => {
        const r1 = ax.step || (ax.unidad === '€' ? 10000 : 1), r2 = ay.step || (ay.unidad === '€' ? 10000 : 1);
        state[ax.path[0]][ax.path[1]] = Math.round(c.x / r1) * r1;
        state[ay.path[0]][ay.path[1]] = Math.round(c.y / r2) * r2;
        card.hidden = true; syncFields(); toast('Combinación aplicada'); schedule();
      };
    } });
    const vs = $('#viewSeg');
    vs.innerHTML = '<button data-m="surface">Paisaje</button><button data-m="traj">Trayectorias</button>';
    vs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; view.mode = b.dataset.m; render3D(); });
    const opt = (o, sel) => Object.keys(o).map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${o[k].nombre}</option>`).join('');
    $('#axX').innerHTML = opt(A.AXES, view.ax); $('#axY').innerHTML = opt(A.AXES, view.ay); $('#metricSel').innerHTML = opt(A.METRICS, view.metric);
    ['axX', 'axY', 'metricSel'].forEach((id) => $('#' + id).addEventListener('change', () => {
      view.ax = $('#axX').value; view.ay = $('#axY').value; view.metric = $('#metricSel').value;
      if (view.ax === view.ay) { view.ay = Object.keys(A.AXES).find((k) => k !== view.ax); $('#axY').value = view.ay; }
      render3D();
    }));
  }
  function render3D() {
    $$('#viewSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === view.mode));
    $('#surfaceCtl').hidden = view.mode !== 'surface';
    const lg = $('#legend3d');
    if (view.mode === 'surface') {
      lg.innerHTML = `<span><i style="background:var(--go)"></i>Cumple la meta</span><span><i style="background:var(--warn)"></i>Zona de vigilancia</span><span><i style="background:var(--stop)"></i>Rompe el límite</span><span><i style="background:var(--gold);height:2px"></i>Plano de la meta · esfera: tu plan</span>`;
      if (!has3D) return;
      const sf = A.surface(state, ctx.mods, view.ax, view.ay, view.metric, 20);
      A.scene.surface(sf, state);
    } else {
      lg.innerHTML = ctx.all.map((x) => `<span><i style="background:${A.seriesColor(x.i)}"></i>${x.nombre}</span>`).join('') + `<span><i style="background:var(--stop);height:2px"></i>Suelo de liquidez</span>`;
      if (!has3D) return;
      A.scene.trajectories(ctx.all.map((x) => ({ name: x.nombre, data: x.r.w.cash, color: A.seriesColor(x.i), active: x.key === state.escenario })), state);
    }
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
    inversion: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 1.8-3 2.3-3 1-3 2.2 1.3 2 3 2 3-.8 3-2"/>',
    horizonte: '<path d="M2 18l6-7 4 4 4-6 6 9z"/><path d="M2 21h20"/>',
    escenarios: '<path d="M3 20c4-2 5-10 9-10s5 6 9 4M3 16c4-1 6-5 9-5s6 7 9 7"/>',
    riesgos: '<circle cx="12" cy="6" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="18" r="2.2"/><rect x="8" y="2" width="8" height="20" rx="4"/>',
    tamano: '<rect x="3" y="12" width="5" height="9"/><rect x="10" y="7" width="5" height="14"/><rect x="17" y="3" width="4" height="18"/>',
    humano: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c0-3.5 2.7-6 6-6s6 2.5 6 6M14 20c0-2.6 1.4-4.8 3-4.8s4 1.6 4 4.8"/>',
    estructuras: '<rect x="9" y="2" width="6" height="5"/><rect x="2" y="16" width="6" height="5"/><rect x="16" y="16" width="6" height="5"/><path d="M12 7v4M5 16v-3h14v3"/>',
    plan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    informe: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'
  };
  const NAV = [['puente', 'Puente de mando'], ['empresa', 'La empresa hoy'], ['inversion', 'La inversión'], ['horizonte', 'Horizonte 3D'], ['escenarios', 'Escenarios'], ['riesgos', 'Semáforos y riesgos'], ['tamano', 'Nuevo tamaño'], ['humano', 'Sistema humano'], ['estructuras', 'Estructuras'], ['plan', 'Meta y plan'], ['informe', 'Informe']];
  function svgI(k) { return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`; }
  function buildDock() {
    const d = $('#dock');
    d.innerHTML = NAV.map(([k, n]) => `<button data-go="${k}" aria-label="${n}">${svgI(k)}<span class="tip">${n}</span></button>`).join('') +
      `<hr><button class="tool" id="toolBtn" aria-label="Caja de herramientas" aria-expanded="false">${svgI('tools')}<span class="tip">Caja de herramientas</span></button>`;
    $$('[data-go]', d).forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.go).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })));
    $('#toolBtn').addEventListener('click', toggleTools);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) $$('[data-go]', d).forEach((b) => b.classList.toggle('on', b.dataset.go === e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
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
        ${snaps.length ? snaps.map((s, i) => `<div class="row small"><span style="flex:1">${s.name} <span class="muted">· ${s.date}</span></span><button class="btn ghost" data-load="${i}">Cargar</button><button class="icon-btn" data-delsnap="${i}" aria-label="Borrar">×</button></div>`).join('') : '<span class="small muted">Se guardan solo en este navegador.</span>'}</div>
      <div class="group"><label>Datos</label><div class="row"><button class="btn ghost" id="tbCopy">Copiar datos</button><button class="btn ghost" id="tbPaste">Pegar datos</button><button class="btn ghost" id="tbReset">Ejemplo</button></div>
        <textarea id="tbJson" class="input" rows="3" placeholder="Pega aquí unos datos copiados de Atalaya" hidden></textarea></div>
      <div class="group"><button class="btn solid" id="tbReport">Generar informe</button></div>`;
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
    $$('[data-load]', tb).forEach((b) => b.onclick = () => { state = A.clone(snaps[+b.dataset.load].state); afterLoad(); toast('Escenario cargado'); });
    $$('[data-delsnap]', tb).forEach((b) => b.onclick = () => { snaps.splice(+b.dataset.delsnap, 1); store.set(SNAP, snaps); renderTools(); });
    $('#tbCopy').onclick = () => copy(JSON.stringify(state), 'Datos copiados');
    $('#tbPaste').onclick = () => { const ta = $('#tbJson'); ta.hidden = false; ta.focus(); };
    $('#tbJson').onchange = (e) => {
      try { const s = JSON.parse(e.target.value); if (!s.empresa || !s.inversion) throw 0; state = Object.assign(A.defaultState(), s); afterLoad(); toast('Datos cargados'); }
      catch (err) { toast('Esos datos no son de Atalaya: copia de nuevo desde «Copiar datos»'); }
    };
    $('#tbReset').onclick = () => { state = A.defaultState(); afterLoad(); toast('Datos de ejemplo restaurados'); };
    $('#tbReport').onclick = () => { toggleTools(); openReport(); };
  }
  function afterLoad() { renderSectors(); syncFields(); schedule(); if (!$('#toolbox').hidden) renderTools(); }

  function copy(text, okMsg) {
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast('Selecciona y copia el texto manualmente'); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(okMsg), fallback);
    else fallback();
  }
  let toastT;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400);
  }

  /* ---------------- Informe ---------------- */
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  let repSc = null;
  function openReport() {
    if (!ctx.plan) computeHeavy();
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
    const series = ctx.all.filter((x) => repSc.indexOf(x.key) >= 0).map((x) => ({ name: x.nombre, data: x.r.w.cash, color: A.seriesColor(x.i), active: x.key === state.escenario }));
    if (series.length) C.cash($('#repCash'), null, series, { target: state.meta.cajaMin, start: ctx.active.start });
  }
  function closeReport() { const ov = $('#report'); if (!ov.hidden) { ov.hidden = true; document.body.style.overflow = ''; } }

  /* ---------------- Fondo: curvas de nivel ---------------- */
  function sky() {
    const cv = $('#sky'), g = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W, H, dpr;
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + 0.2, a: Math.random() * 0.5 + 0.15 }));
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const draw = (t) => {
      g.clearRect(0, 0, W, H);
      const sy = scrollY * 0.18;
      stars.forEach((s) => { g.fillStyle = `rgba(236,214,166,${s.a})`; g.beginPath(); g.arc(s.x * W, ((s.y * H * 1.6 - sy * 0.5) % H + H) % H, s.r, 0, 6.283); g.fill(); });
      const lines = 16;
      for (let k = 0; k < lines; k++) {
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
  }

  /* ---------------- Arranque ---------------- */
  function start() {
    sky();
    buildDock();
    buildFields();
    renderSectors();
    syncFields();
    $('#empresaNombre').addEventListener('input', (e) => { state.empresaNombre = e.target.value; store.set(STORE, state); });
    $('#proyecto').addEventListener('input', (e) => { state.proyecto = e.target.value; store.set(STORE, state); });
    $('#addHyp').addEventListener('click', (e) => {
      openCard(null, e.target, { t: 'Nueva hipótesis', d: 'Elige el suceso que quieres simular. Podrás ajustar mes, duración e intensidad.', html: `<div class="actions">${Object.keys(A.SHOCKS).map((k) => `<button class="btn ghost" data-shock="${k}">${A.SHOCKS[k].nombre}</button>`).join('')}</div>` });
      $$('[data-shock]', card).forEach((b) => b.onclick = () => { addHyp(b.dataset.shock); card.hidden = true; });
    });
    $('#openReport').addEventListener('click', openReport);
    $('#copySummary').addEventListener('click', () => { if (!ctx.plan) computeHeavy(); copy(A.report.text(state, ctx), 'Resumen ejecutivo copiado'); });
    computeQuick();
    setup3D();
    computeHeavy();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
