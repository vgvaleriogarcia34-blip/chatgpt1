/* Atalaya 360° · Prioridades hacia el equilibrio viable
   Ordena los semáforos de todos los mundos (los de la nota de la empresa) por lo que hay que tocar primero
   para que la empresa sea viable y alcance sus objetivos. La regla es la de la casa, como la gravedad:
   liquidez genera rentabilidad, rentabilidad genera crecimiento; no se busca crecimiento con liquidez.
   · Cada punto se coloca en una capa: datos fiables, liquidez, rentabilidad, estructura o crecimiento.
   · Prioridad = peso de la capa × gravedad (rojo 2, ámbar 1) × peso del punto, más un plus si sirve a un
     objetivo del empresario (de la auditoría o de las metas de la mesa).
   · Equilibrio viable: sin rojos en liquidez ni en rentabilidad (y con datos reales).
   A.prioridad.calcular() → { puntos, capas, equilibrio, objetivos, mundos } · A.prioridad.marcarMapa(ov) */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const P = () => A.platform;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pagina = () => (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');

  // Capas en el orden de la regla: lo de arriba sostiene lo de abajo
  const CAPAS = [
    { id: 'datos', n: 'Datos fiables', w: 4, d: 'Sin datos reales, ningún semáforo es de fiar: es lo primero.', re: /(ejemplo|sin dar de alta|sin cuentas|datos pendientes|dato pendiente|sin gestionar|incomplet|sin datos|aterriz|\borigen\b|archivos cargados)/ },
    { id: 'liquidez', n: 'Liquidez', w: 5, d: 'Poder pagar: caja, colchón, cobros, pagos y deuda acorde a lo que se genera.', re: /(liquidez|caja|tesorer|poliza|colchon|cobro|cobrar|pago|deuda|financ|endeud|solvencia|circulante|fondo de maniobra|veredicto|carga financiera)/ },
    { id: 'rentabilidad', n: 'Rentabilidad', w: 4, d: 'Ganar con lo que se hace: margen, precios, costes y clientes que dejan dinero.', re: /(margen|rentab|beneficio|precio|coste|gasto|abc|ebitda|equilibrio|productividad|resultado|contribucion)/ },
    { id: 'estructura', n: 'Estructura y gestión', w: 2, d: 'Que la empresa funcione sin depender de una persona: equipo, procesos, plan y agenda.', re: /(persona|puesto|equipo|lider|disc|proceso|plan de empresa|plan\b|agenda|meta|tarea|acuerdo|madurez|riesgo|organiz|responsable|objetivo)/ },
    { id: 'crecimiento', n: 'Crecimiento', w: 1, d: 'Crecer con la estructura y la caja que ya lo sostienen.', re: /(venta|crec|mercado|cliente|comercial|marketing|inversion|expansion|captacion)/ }
  ];
  const SEV = { stop: 2, warn: 1, ok: 0 };
  // Comprobaciones que cuentan: las «sin datos» (st 'nd') no son prioridad ni cuentan en las capas
  const capaDe = (x, mundo) => {
    const t = norm(x.t + ' ' + (x.d || '') + ' ' + (x.zona || ''));
    if (mundo === 'simulador' && x.zona === 'riesgos' && /liquidez|caja|colchon|deuda|cobertura/.test(t)) return 'liquidez';
    for (const c of CAPAS) if (c.re.test(t)) return c.id;
    return mundo === 'personas' || mundo === 'mesa' ? 'estructura' : 'rentabilidad';
  };
  const W = Object.fromEntries(CAPAS.map((c) => [c.id, c]));

  // Objetivos del empresario: los de la auditoría (primera sesión) y las metas activas de la mesa
  const objetivos = async () => {
    const out = [], ld = async (k) => { try { return P() && P().loadData ? await P().loadData(k) : null; } catch (e) { return null; } };
    const iv = await ld('intervencion'), ag = await ld('agenda');
    ((iv && iv.objetivos) || []).filter((o) => o.dice || o.especifica).forEach((o) => out.push({ t: o.especifica || o.dice, fuente: 'Auditoría', fecha: o.fecha || '', texto: [o.dice, o.especifica, o.indicador, o.beneficio].join(' ') }));
    ((ag && ag.metas) || []).filter((m) => m.estado !== 'cumplida' && (m.especifica || m.objetivo)).forEach((m) => { if (out.some((x) => norm(x.t) === norm(m.especifica || m.objetivo))) return; out.push({ t: m.especifica || m.objetivo, fuente: 'Mesa', fecha: m.fecha || '', texto: [m.objetivo, m.especifica, m.indicador, m.beneficio].join(' ') }); });
    out.forEach((o) => { o.capa = capaDe({ t: o.texto }, ''); });
    return out;
  };

  const calcular = async () => {
    if (!A.nota || !A.nota.calcular) return null;
    const nt = (A.nota.ultima && A.nota.ultima()) || (await A.nota.calcular());
    const objs = await objetivos();
    const puntos = [], real = !!(P() && P().modoReal && P().modoReal());
    // Con datos reales, nada que venga de datos de ejemplo puede ser una prioridad
    Object.entries(nt.mundos).forEach(([k, m]) => (m.puntos || []).filter((x) => SEV[x.st] != null && !(real && /ejemplo/i.test(x.t + ' ' + (x.d || '')))).forEach((x) => {
      const capa = capaDe(x, k), obj = objs.find((o) => o.capa === capa) || null;
      const score = x.st === 'ok' ? 0 : W[capa].w * SEV[x.st] * (x.peso || 1) + (obj ? 3 : 0);
      puntos.push(Object.assign({}, x, { mundo: k, mundoN: m.n, capa, capaN: W[capa].n, obj, score }));
    }));
    const pend = puntos.filter((x) => x.st !== 'ok').sort((a, b) => b.score - a.score);
    pend.forEach((x, i) => { x.rango = i + 1; });
    const capas = CAPAS.map((c) => { const l = puntos.filter((x) => x.capa === c.id); const r = l.filter((x) => x.st === 'stop').length, a = l.filter((x) => x.st === 'warn').length;
      return Object.assign({}, c, { total: l.length, rojos: r, ambar: a, verdes: l.length - r - a, st: !l.length ? '' : r ? 'stop' : a ? 'warn' : 'ok' }); });
    const cp = (id) => capas.find((c) => c.id === id);
    // Sin comprobaciones de liquidez o de rentabilidad no se puede afirmar nada del equilibrio: queda sin evaluar (neutro)
    const faltan = ['liquidez', 'rentabilidad'].filter((id) => !cp(id).total);
    const eq = faltan.length ? { st: '', t: 'Sin evaluar: faltan datos de ' + faltan.join(' y '), d: 'Cargue las cuentas de la empresa (o responda las preguntas del simulador) para comprobar la ' + faltan.join(' y la ') + '.' }
      : cp('datos').rojos ? (real ? { st: 'stop', t: 'Sin base suficiente: faltan datos de la empresa', d: 'Complete los datos que faltan (Origen de datos y cuentas): sin ellos no se puede afirmar si la empresa es viable.' } : { st: 'stop', t: 'Sin base: faltan datos reales', d: 'Cargue los datos reales: con datos de ejemplo no se puede saber si la empresa es viable.' })
      : cp('liquidez').rojos ? { st: 'stop', t: 'Equilibrio no alcanzado: primero la liquidez', d: 'Hay semáforos de caja o deuda en rojo. Hasta que la empresa pueda pagar con holgura, no se trabaja el crecimiento.' }
        : cp('rentabilidad').rojos ? { st: 'warn', t: 'Liquidez sostenida, falta rentabilidad', d: 'La caja aguanta, pero lo que se hace no deja el margen suficiente: precios, costes y clientes que dejan dinero.' }
          : cp('liquidez').ambar || cp('rentabilidad').ambar ? { st: 'warn', t: 'Equilibrio viable, con vigilancia', d: 'Sin rojos en liquidez ni rentabilidad, pero con puntos en ámbar que conviene cerrar antes de crecer.' }
            : { st: 'ok', t: 'Equilibrio viable alcanzado', d: 'Liquidez y rentabilidad en verde: la empresa puede trabajar la estructura y el crecimiento.' };
    return { nota: nt, puntos, pend, capas, equilibrio: eq, objetivos: objs };
  };

  /* ---------- Marcas en el mapa de cada planeta ---------- */
  const MUNDO_PAG = { 'app.html': 'simulador', 'estrategia.html': 'estrategia', 'personas.html': 'personas' };
  const marcarMapa = async (ov) => {
    const mundo = MUNDO_PAG[pagina()]; if (!mundo || !ov || ov.dataset.prio === '1') return;
    ov.dataset.prio = '1';
    let r = null; try { if (A.nota && A.nota.refrescar) await A.nota.refrescar(); r = await calcular(); } catch (e) { console.error(e); }
    if (!r || ov.hidden) { ov.dataset.prio = ''; return; }
    const propios = r.pend.filter((x) => x.mundo === mundo), cards = Array.from(ov.querySelectorAll('.rm-card[data-id]'));
    const ids = new Set(cards.map((c) => c.dataset.id));
    // Las prioridades de este planeta, agrupadas por la capa (módulo o capítulo) donde se tocan
    const porCapa = new Map(); propios.forEach((x) => { const z = ids.has(x.zona) ? x.zona : null; if (!z) return; if (!porCapa.has(z)) porCapa.set(z, []); porCapa.get(z).push(x); });
    const orden = [...porCapa.entries()].sort((a, b) => a[1][0].rango - b[1][0].rango);
    orden.forEach(([z, l], i) => {
      const c = cards.find((x) => x.dataset.id === z); if (!c) return;
      const peor = l.some((x) => x.st === 'stop') ? 'stop' : 'warn';
      c.classList.add('pr-on', 'pr-' + peor); if (i < 3) c.classList.add('pr-top');
      const ch = c.querySelector('.rm-chrome') || c;
      ch.insertAdjacentHTML('beforeend', `<span class="pr-badge ${peor}" title="${esc(l.map((x) => x.t).join(' · '))}">${i < 3 ? `${i + 1}º · ` : ''}${esc(l[0].capaN)}</span>`);
      const info = c.querySelector('.rm-info'); if (info && i < 3) info.insertAdjacentHTML('afterbegin', `<span class="pr-why ${peor}">${esc(l[0].t)}${l[0].obj ? ` · sirve a «${esc(l[0].obj.t)}»` : ''}</span>`);
    });
    const head = ov.querySelector('.rm-head'); if (!head) return;
    const top = orden.slice(0, 3);
    head.insertAdjacentHTML('afterend', `<div class="pr-banda ${r.equilibrio.st}"><div class="pr-eq"><span class="pr-luz ${r.equilibrio.st}"></span><div><b>${esc(r.equilibrio.t)}</b><small>${esc(r.equilibrio.d)}</small></div></div>
      <div class="pr-lista"><small>Toque primero en este planeta${top.length ? '' : ': nada en rojo ni en ámbar'}</small>${top.map(([z, l], i) => `<button class="pr-it ${l.some((x) => x.st === 'stop') ? 'stop' : 'warn'}" data-pz="${esc(z)}"><b>${i + 1}</b><span>${esc(l[0].t)}<em>${esc(l[0].capaN)}${l[0].obj ? ' · objetivo: ' + esc(l[0].obj.t) : ''}</em></span></button>`).join('')}<a class="pr-tab" href="tablero.html">Tablero general →</a></div></div>`);
    ov.querySelectorAll('[data-pz]').forEach((b) => (b.onclick = () => { const c = cards.find((x) => x.dataset.id === b.dataset.pz); if (c) c.click(); }));
  };
  // Cada vez que se abre el mapa (se repinta #rutaMap) se marcan sus prioridades
  const vigilar = (n) => {
    const ov = document.getElementById('rutaMap');
    // El mapa lo crea cada mundo al arrancar: se espera a que exista (hasta medio minuto)
    if (!ov) { if ((n || 0) < 60) setTimeout(() => vigilar((n || 0) + 1), 500); return; }
    if (!ov.hidden && ov.querySelector('.rm-world') && !ov.querySelector('.pr-banda')) marcarMapa(ov);
    new MutationObserver(() => { if (!ov.hidden && ov.querySelector('.rm-world') && !ov.querySelector('.pr-banda')) { ov.dataset.prio = ''; marcarMapa(ov); } }).observe(ov, { childList: true, attributes: true, attributeFilter: ['hidden'] });
  };

  // Desde el tablero se llega con #mapa: se abre el mapa del planeta con sus prioridades marcadas
  const pideMapa = location.hash === '#mapa'; // se lee al cargar: cada mundo cambia el hash al arrancar
  const abrirSiPide = (n) => {
    if (!pideMapa) return;
    const r = { 'app.html': A.ruta, 'estrategia.html': A.rutaEst, 'personas.html': A.rutaPer }[pagina()], ov = document.getElementById('rutaMap');
    if (ov && !ov.hidden) return;
    if (r && r.openMap && ov && (n || 0) >= 3) { try { r.openMap(); return; } catch (e) { /* aún cargando */ } }
    if ((n || 0) < 40) setTimeout(() => abrirSiPide((n || 0) + 1), 500);
  };
  A.prioridad = { CAPAS, calcular, capaDe, marcarMapa };
  const iniciar = () => { vigilar(0); abrirSiPide(0); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
