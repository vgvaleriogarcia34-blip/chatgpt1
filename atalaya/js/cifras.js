/* Atalaya 360° · Cifras de la empresa: una fuente por cifra
   Ventas, EBITDA, deuda, caja y plantilla salen de aquí para todos los mundos (simulador, sistema estratégico, tablero,
   auditoría integral y cartera o grupo), cada una con su origen y su fecha. Así ningún mundo calcula su propia versión.
   · Simulador (empresa.*): ventas, margen, personal, gastos fijos, caja, deuda viva, días de cobro y plantilla.
   · Cuentas del simulador (historico): el ejercicio al que se refieren y, si el simulador está vacío, el último año cargado.
   · Ficha de la empresa (registro de empresas): la plantilla, si el simulador no la tiene.
   · Personas y equipos: solo para avisar si la plantilla dada de alta no coincide con la del simulador.
   EBITDA = ventas × margen − personal − gastos fijos (el mismo cálculo que el motor del simulador, «ebitdaActual»).
   Deuda neta = deuda viva − caja. Lo que no tiene dato es null («sin dato»), nunca 0.
   A.cifras.desdeSim(sim, ficha) · A.cifras.leer(id) · A.cifras.actual() · A.cifras.semaforos(c) · A.cifras.html(c) */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const P = () => A.platform;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pagina = () => (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');
  const n = (v) => { if (v == null || v === '') return null; const x = typeof v === 'number' ? v : +String(v).replace(/\./g, '').replace(',', '.'); return isFinite(x) ? x : null; };
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const miles = (x) => Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const eur = (x) => (x == null || !isFinite(x) ? '—' : (x < 0 ? '−' : '') + miles(x) + ' €');
  const dec = (x, d) => (x == null || !isFinite(x) ? '—' : (Math.round(x * Math.pow(10, d || 1)) / Math.pow(10, d || 1)).toLocaleString('es-ES', { maximumFractionDigits: d || 1 }));

  // Las cifras, en el orden en que se enseñan
  const CAMPOS = [
    { k: 'ventas', n: 'Ventas', u: '€' },
    { k: 'ebitda', n: 'Beneficio del negocio (EBITDA)', u: '€', exp: 'Resultado antes de intereses, impuestos y amortizaciones: ventas × margen − personal − gastos fijos.' },
    { k: 'deuda', n: 'Deuda bancaria', u: '€' },
    { k: 'caja', n: 'Caja', u: '€' },
    { k: 'plantilla', n: 'Plantilla', u: 'personas' }
  ];
  const fmt = (k, v) => (v == null || !isFinite(v) ? 'Sin dato' : k === 'plantilla' ? miles(v) + ' ' + (Math.round(v) === 1 ? 'persona' : 'personas') : k === 'ebitdaPct' ? dec(v) + ' %' : k === 'deudaEbitda' ? dec(v) + ' veces' : eur(v));

  /* ---------- Cálculo a partir de los datos guardados ----------
     sim: estado del simulador de la empresa · ficha: su entrada del registro de empresas · extra.personas: personas dadas de alta */
  const desdeSim = (sim, ficha, extra) => {
    extra = extra || {}; ficha = ficha || {};
    const e = (sim && sim.empresa) || {}, H = sim && sim.historico && Array.isArray(sim.historico.anios) && !sim.historico.ejemplo ? sim.historico.anios.slice().sort((a, b) => (+a.anio || 0) - (+b.anio || 0)) : [];
    const u = H[H.length - 1] || null, anio = u && +u.anio ? +u.anio : null;
    const real = ficha.id ? !!ficha.datosReales : P() && P().modoReal ? P().modoReal() : false;
    const ejemplo = !!(sim && sim.empresa && (A.simEsEjemplo ? A.simEsEjemplo(sim) : sim.ejemplo !== false));
    const conSim = !!(sim && sim.empresa && n(e.ventas) > 0 && !(real && ejemplo));
    const conHist = !conSim && !!(u && n(u.ventas) > 0);
    const out = { sinDatos: !conSim && !conHist, ejemplo: conSim && ejemplo, anio, fuente: conSim ? 'simulador' : conHist ? 'cuentas' : '', avisos: [] };
    // Origen y fecha: el ejercicio de las cuentas si las hay; si no, «datos del simulador» sin fecha de cierre
    const fechaEj = anio ? anio + '-12-31' : null;
    const oSim = conSim ? (out.ejemplo ? 'Simulador · datos de ejemplo' : anio ? 'Simulador · cuentas de ' + anio : 'Simulador · datos introducidos') : '';
    const oHist = anio ? 'Cuentas cargadas · ejercicio ' + anio : '';
    const pon = (k, v, origen, fecha) => { out[k] = v == null || !isFinite(v) ? null : v; out.origen = out.origen || {}; out.fecha = out.fecha || {}; out.origen[k] = out[k] == null ? '' : origen; out.fecha[k] = out[k] == null ? null : fecha || null; };
    if (conSim) {
      const ventas = n(e.ventas), margen = n(e.margen), personal = n(e.personal) || 0, fijos = n(e.fijos) || 0;
      pon('ventas', ventas, oSim, fechaEj);
      pon('margen', margen, oSim, fechaEj); pon('personal', personal, oSim, fechaEj); pon('fijos', fijos, oSim, fechaEj);
      pon('ebitda', margen == null ? null : ventas * margen / 100 - personal - fijos, oSim, fechaEj);
      pon('caja', n(e.caja), oSim, fechaEj);
      pon('deuda', n(e.deudaViva), oSim, fechaEj);
      pon('dso', n(e.dso) || null, oSim, fechaEj);
      pon('plantilla', n(e.plantilla) || null, oSim, fechaEj);
    } else if (conHist) {
      const g = (k) => n(u[k]);
      const cv = g('costeVentas') != null ? g('costeVentas') : g('margen') != null ? g('ventas') * (1 - g('margen') / 100) : null;
      pon('ventas', g('ventas'), oHist, fechaEj);
      pon('ebitda', cv == null ? null : g('ventas') - cv - (g('personal') || 0) - (g('otrosGastos') || 0), oHist, fechaEj);
      pon('personal', g('personal'), oHist, fechaEj); pon('fijos', g('otrosGastos'), oHist, fechaEj);
      pon('margen', cv == null ? null : (g('ventas') - cv) / g('ventas') * 100, oHist, fechaEj);
      pon('caja', g('tesoreria'), oHist, fechaEj);
      pon('deuda', g('deudaLP') == null && g('deudaCP') == null ? null : (g('deudaLP') || 0) + (g('deudaCP') || 0), oHist, fechaEj);
      pon('dso', g('dso'), oHist, fechaEj);
      pon('plantilla', g('plantilla'), oHist, fechaEj);
    } else CAMPOS.concat([{ k: 'margen' }, { k: 'personal' }, { k: 'fijos' }, { k: 'dso' }]).forEach((c) => pon(c.k, null));
    // Plantilla: si el simulador no la tiene, la de la ficha; la de personas solo se compara
    const fp = n(ficha.plantilla);
    if (out.plantilla == null && fp) pon('plantilla', fp, 'Ficha de la empresa', ficha.alta ? String(ficha.alta).slice(0, 10) : null);
    const np = extra.personas != null ? +extra.personas : null;
    if (out.plantilla == null && np) pon('plantilla', np, 'Personas y equipos · personas dadas de alta', null);
    if (np && out.plantilla != null && np !== Math.round(out.plantilla)) out.avisos.push(`La plantilla del ${out.origen.plantilla.split(' · ')[0].toLowerCase()} (${miles(out.plantilla)}) no coincide con las ${miles(np)} personas dadas de alta en Personas y equipos.`);
    if (fp && out.plantilla != null && out.origen.plantilla !== 'Ficha de la empresa' && fp !== Math.round(out.plantilla)) out.avisos.push(`La ficha de la empresa dice ${miles(fp)} personas y el ${out.origen.plantilla.split(' · ')[0].toLowerCase()} ${miles(out.plantilla)}: corrija la que no esté al día.`);
    out.personas = np;
    // Derivadas: mismas fórmulas en todas partes
    out.ebitdaPct = out.ventas > 0 && out.ebitda != null ? out.ebitda / out.ventas * 100 : null;
    out.deudaNeta = out.deuda == null && out.caja == null ? null : (out.deuda || 0) - (out.caja || 0);
    out.deudaEbitda = out.deudaNeta != null && out.ebitda > 0 ? out.deudaNeta / out.ebitda : null;
    out.costeMes = out.personal != null || out.fijos != null ? ((out.personal || 0) + (out.fijos || 0)) / 12 : null;
    out.mesesCaja = out.caja != null && out.costeMes > 0 ? out.caja / out.costeMes : null;
    ['ebitdaPct', 'deudaNeta', 'deudaEbitda', 'mesesCaja'].forEach((k) => { out.origen[k] = out[k] == null ? '' : 'Calculado con las cifras de la empresa'; out.fecha[k] = out.fecha.ventas || null; });
    out.leido = new Date().toISOString();
    return out;
  };

  /* ---------- Semáforos de las cifras (un único criterio: Foto 360, triaje, tablero y cartera) ---------- */
  const semaforos = (c) => {
    const out = [];
    if (!c || c.sinDatos) return out;
    if (c.ebitda != null && c.ventas > 0) out.push({ k: 'ebitda', capa: 'rentabilidad', t: 'Beneficio del negocio (EBITDA) sobre ventas', v: dec(c.ebitdaPct) + ' %', st: c.ebitda <= 0 ? 'stop' : c.ebitdaPct < 5 ? 'warn' : 'ok', d: c.ebitda <= 0 ? 'El negocio no genera resultado operativo.' : c.ebitdaPct < 5 ? 'Margen operativo estrecho: menos del 5 % de las ventas.' : '' });
    if (c.deuda) out.push({ k: 'deudaEbitda', capa: 'liquidez', t: 'Años de beneficio para pagar la deuda (deuda neta / EBITDA)', v: c.deudaEbitda == null ? 'EBITDA ≤ 0' : dec(c.deudaEbitda) + ' veces', st: c.deudaEbitda == null || c.deudaEbitda > 4 ? 'stop' : c.deudaEbitda > 3 ? 'warn' : 'ok', d: c.deudaEbitda == null ? 'Sin beneficio del negocio positivo, la deuda no se puede pagar con lo que genera el negocio.' : c.deudaEbitda > 3 ? 'Cargas financieras por encima de lo que genera el negocio.' : '' });
    if (c.caja != null && c.costeMes > 0) out.push({ k: 'caja', capa: 'liquidez', t: 'Caja en meses de costes', v: `${eur(c.caja)} · ${dec(c.mesesCaja)} meses`, st: c.mesesCaja < 1 ? 'stop' : c.mesesCaja < 2 ? 'warn' : 'ok', d: c.mesesCaja < 1 ? 'La tesorería no cubre un mes de personal y gastos fijos.' : c.mesesCaja < 2 ? 'Colchón corto: menos de dos meses de costes.' : '' });
    return out;
  };

  /* ---------- Lectura: de la empresa activa (con el estado vivo si se está en el simulador o en el sistema estratégico) o de otra ---------- */
  const vivo = () => (pagina() === 'app.html' && A.appApi && A.appApi.getState ? A.appApi.getState() : pagina() === 'estrategia.html' && A.strat && A.strat.sim ? A.strat.sim : null);
  const leer = async (id, opts) => {
    opts = opts || {};
    const Pl = P(); if (Pl && Pl.ready) await Pl.ready;
    const act = Pl && Pl.empresaId ? Pl.empresaId() : 'principal'; id = id || act;
    let sim = id === act ? vivo() : null;
    if (!sim && Pl && Pl.loadDataOf) { try { sim = await Pl.loadDataOf('simulador', id); } catch (e) { sim = null; } }
    if ((!sim || !sim.empresa) && Pl && Pl.k) sim = lsGet(Pl.k('atalaya.v1', id)) || sim;
    const ficha = (Pl && Pl.empresas && Pl.empresas.lista ? Pl.empresas.lista().find((e) => e.id === id) : null) || {};
    let personas = null;
    if (opts.personas !== false && Pl && Pl.loadDataOf) { try { const pe = (id === act && A.personas && A.personas.state) || (await Pl.loadDataOf('personas', id)); if (pe && Array.isArray(pe.personas) && pe.personas.length) personas = pe.personas.length; } catch (e) { personas = null; } }
    const c = desdeSim(sim, ficha, { personas });
    c.empresa = ficha.nombre || (sim && sim.empresaNombre) || ''; c.id = id;
    return c;
  };

  /* ---------- Tarjetas: cada cifra con su origen y su fecha ---------- */
  const fechaTxt = (f) => (f ? new Date(f + (f.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'sin fecha de cierre');
  const html = (c, opts) => {
    opts = opts || {};
    if (!c || c.sinDatos) return `<p class="small muted cf-vacio" style="margin:0">Sin cifras de la empresa: cargue sus cuentas en el simulador o responda sus preguntas. Nada de lo que falta se toma como cero.</p>`;
    const ks = opts.campos || CAMPOS.map((x) => x.k);
    return `<div class="cf-grid" data-cifras>${ks.map((k) => { const d = CAMPOS.find((x) => x.k === k) || { n: k }; return `<div class="cf-it" data-cifra="${esc(k)}" title="${esc(d.exp || '')}"><small>${esc(d.n)}</small><b>${esc(fmt(k, c[k]))}</b><em>${c[k] == null ? 'Sin dato' : esc(c.origen[k]) + ' · ' + esc(fechaTxt(c.fecha[k]))}</em>${d.exp ? `<details class="cf-q"><summary aria-label="Qué significa ${esc(d.n)}">?</summary><span>${esc(d.exp)}</span></details>` : ''}</div>`; }).join('')}</div>`
      + (c.ejemplo ? '<p class="small" style="margin:0;color:var(--warn)">Cifras de ejemplo: cargue las de la empresa antes de decidir con ellas.</p>' : '')
      + (opts.avisos !== false && c.avisos.length ? `<ul class="small cf-avisos" style="margin:0;padding-left:18px;color:var(--warn)">${c.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '');
  };
  // Estilo mínimo de las tarjetas (una vez por página)
  const css = () => {
    if (document.getElementById('cfCss')) return;
    const s = document.createElement('style'); s.id = 'cfCss';
    s.textContent = '.cf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.cf-it{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:12px;min-width:0}.cf-it small{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#9aa)}.cf-it b{font-size:18px;font-variant-numeric:tabular-nums}.cf-it em{font-style:normal;font-size:11px;color:var(--muted,#9aa);overflow-wrap:anywhere}.cf-q{font-size:12px;color:var(--muted,#9aa)}.cf-q summary{cursor:pointer;list-style:none;display:inline-grid;place-items:center;width:20px;height:20px;border:1px solid var(--line,rgba(255,255,255,.2));border-radius:50%;font-weight:600}.cf-q summary::-webkit-details-marker{display:none}.cf-q span{display:block;margin-top:4px;line-height:1.4}@media print{.cf-q{display:none}}';
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', css); else css();

  A.cifras = { CAMPOS, desdeSim, leer, actual: () => leer(), semaforos, html, fmt, eur, fechaTxt };
})();
