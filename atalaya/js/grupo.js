/* Atalaya · Vista de grupo (plan Grupos) y cartera de clientes (plan Consultora)
   Reúne todas las empresas de la cuenta: cada una con su simulador y su sistema estratégico.
   · Constelación: la holding en el centro y cada sociedad en órbita, del tamaño de sus ventas y del color de su veredicto.
   · Sociedades una a una y, en Grupos, el consolidado con eliminación de las operaciones intragrupo.
   · Comparativa entre sociedades, riesgos cruzados (clientes y proveedores comunes, sociedades en rojo).
   · Objetivos de la holding en cascada a cada sociedad.
   · Informe del grupo (o de la cartera).
   · Ventas, EBITDA, deuda, caja y plantilla de cada empresa salen de la fuente única (js/cifras.js), las mismas que en sus mundos.
   · Cartera operativa (Consultora): etapa del recorrido de la auditoría, próxima sesión, pendientes, triaje y nota de cada cliente.
   · Nueva empresa desde plantilla: copia de otra empresa lo que no es suyo (ficha tipo, umbrales, puestos, propuesta y
     honorarios, ritmo de sesiones), nunca sus cifras, personas, conversaciones ni diagnóstico. */
(function () {
  const A = window.Atalaya, P = A.platform, F = A.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(s\.?l\.?u?|s\.?a\.?|sociedad limitada|grupo)\b/g, '').replace(/[^a-z0-9]/g, '');
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } } };
  const PAL = ['#c9f24d', '#3987e5', '#199e70', '#d55181', '#d95926', '#9b7bff'];
  const ST = { go: 'ok', warn: 'warn', stop: 'stop' };
  const IND = {
    ventas: { n: 'Ventas', u: '€', dir: 'subir', sum: true },
    ebitda: { n: 'EBITDA', u: '€', dir: 'subir', sum: true },
    ebitdaPct: { n: 'EBITDA sobre ventas', u: '%', dir: 'subir' },
    caja: { n: 'Caja', u: '€', dir: 'subir', sum: true },
    liquidezMin: { n: 'Liquidez mínima prevista', u: '€', dir: 'subir', sum: true },
    dso: { n: 'Días de cobro', u: 'días', dir: 'bajar' },
    deudaEbitda: { n: 'Deuda neta / EBITDA', u: '×', dir: 'bajar' },
    ventasEmpleado: { n: 'Ventas por persona', u: '€', dir: 'subir' }
  };
  const fv = (v, u) => (v == null || !isFinite(v) ? '—' : u === '€' ? F.eur(v) : u === '%' ? F.pct(v) : u === '×' ? (Math.round(v * 10) / 10 || 0).toFixed(1).replace('.', ',') + '×' : F.num(Math.round(v) || 0) + (u ? ' ' + u : '')); // «|| 0»: sin «-0»

  let user, plan, grupo, lista, modelo, modeloC = null, G, E = [];
  const hoyISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const fCorta = (f) => (f ? new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—');
  const plu = (n, a, b) => `${n} ${n === 1 ? a : b}`;

  /* ---------- Datos de cada empresa ---------- */
  async function cargarEmpresa(e) {
    let sim = await P.loadDataOf('simulador', e.id), est = await P.loadDataOf('estrategia', e.id);
    if (!sim || !sim.empresa) sim = LS.get(P.k('atalaya.v1', e.id));
    if (!est) est = LS.get(P.k('atalaya.estrategia.v1', e.id));
    const out = { e, sim, est, ok: !!(sim && sim.empresa && A.SECTORS[sim.sector]) };
    // Lo que necesita la cartera operativa: recorrido de la auditoría, mesa de trabajo, nota y personas dadas de alta
    const ld = async (k) => { try { return await P.loadDataOf(k, e.id); } catch (x) { return null; } };
    const [iv, agenda, nota, pe] = await Promise.all([!grupo && P.puede('intervencion') ? ld('intervencion') : null, ld('agenda'), ld('nota'), P.puede('personas') ? ld('personas') : null]);
    Object.assign(out, { iv, agenda, nota: nota && nota._global, personasN: pe && Array.isArray(pe.personas) && pe.personas.length ? pe.personas.length : null });
    out.c = A.cifras ? A.cifras.desdeSim(sim, e, { personas: out.personasN }) : null;
    if (!out.ok) return out;
    const s = Object.assign(A.defaultState(), sim);
    let r = null; try { r = A.analyze(s, A.scenarioMods(s, s.escenario || 'base')); } catch (x) { r = null; }
    const em = s.empresa, c = out.c && !out.c.sinDatos ? out.c : null, v = (k, alt) => (c && c[k] != null ? c[k] : alt);
    // Cifras de la fuente única: las del último año de la empresa (no la previsión del primer año del simulador)
    const ventas = v('ventas', em.ventas), ebitda = v('ebitda', em.ventas * em.margen / 100 - em.personal - em.fijos), plantilla = v('plantilla', em.plantilla);
    out.m = {
      ventas, ebitda, ebitdaPct: v('ebitdaPct', ventas > 0 ? ebitda / ventas * 100 : null), caja: v('caja', em.caja), deuda: v('deuda', em.deudaViva), deudaNeta: v('deudaNeta', em.deudaViva - em.caja),
      deudaEbitda: v('deudaEbitda', ebitda > 0 ? (em.deudaViva - em.caja) / ebitda : null), dso: v('dso', em.dso), plantilla, ventasEmpleado: ventas / Math.max(1, plantilla || 1),
      liquidezMin: r ? r.cajaRef : null, serieLiq: r && r.w ? (r.contarPoliza ? r.w.liquidez : r.w.cash) : null, verdict: r ? r.verdict : null, rojos: r ? r.lights.filter((l) => l.estado === 'stop').map((l) => l.nombre) : [], ambar: r ? r.lights.filter((l) => l.estado === 'warn').length : 0,
      sector: (A.SECTORS[s.sector] || {}).nombre || '', inversion: s.inversion ? s.inversion.importe : 0, nombre: s.empresaNombre
    };
    try { const v = (est && est.valoracion) || {}; out.m.valor = A.valorar ? A.valorar(sim, { multiplo: v.multiplo, wacc: v.wacc, g: v.g, pesoMult: v.pesoMult, ajustes: v.ajustes || {}, noOperativos: v.noOperativos, contingencias: v.contingencias }).central : null; } catch (x) { out.m.valor = null; }
    out.clientes = est && est.comercial && !est.comercial.ejemplo ? (est.comercial.clientes || []).map((c) => c.nombre) : [];
    out.proveedores = est && est.compras && !est.compras.ejemplo ? (est.compras.proveedores || []).map((p) => p.nombre) : [];
    out.reales = !!(sim.historico && !sim.historico.ejemplo && sim.historico.anios && sim.historico.anios.length);
    return out;
  }

  /* ---------- Consolidado ---------- */
  function consolidado() {
    const L = E.filter((x) => x.ok), el = G.elim || {};
    const sum = (k) => L.reduce((a, x) => a + (x.m[k] || 0), 0);
    const att = (k) => L.reduce((a, x) => a + (x.m[k] || 0) * ((x.e.participacion != null ? x.e.participacion : 100) / 100), 0);
    const ventas = sum('ventas') - (+el.ventas || 0), ebitda = sum('ebitda') - (+el.margen || 0);
    const caja = sum('caja'), deuda = sum('deuda') - (+el.prestamos || 0);
    // Liquidez mínima del grupo: mínimo de la suma mes a mes (no la suma de mínimos de meses distintos).
    // Si alguna sociedad no tiene serie mensual, se cae a la suma de mínimos y se dice así.
    const series = L.map((x) => x.m.serieLiq), conSerie = L.length && series.every((v) => Array.isArray(v) && v.length);
    const nM = conSerie ? Math.min(...series.map((v) => v.length)) : 0;
    const liquidezMin = conSerie ? Math.min(...Array.from({ length: nM }, (_, i) => series.reduce((a, v) => a + (+v[i] || 0), 0))) : sum('liquidezMin');
    // Lo atribuible a la holding: las eliminaciones intragrupo se reparten en la misma proporción que las ventas atribuibles
    const share = sum('ventas') > 0 ? att('ventas') / sum('ventas') : 1;
    return { n: L.length, ventas, ebitda, ebitdaPct: ventas > 0 ? ebitda / ventas * 100 : null, caja, deuda, deudaNeta: deuda - caja, deudaEbitda: ebitda > 0 ? (deuda - caja) / ebitda : null, plantilla: sum('plantilla'), liquidezMin, liqSumaMin: !conSerie, ventasAtr: att('ventas') - (+el.ventas || 0) * share, ebitdaAtr: att('ebitda') - (+el.margen || 0) * share, valor: sum('valor'), valorAtr: att('valor'), bruto: { ventas: sum('ventas'), ebitda: sum('ebitda'), deuda: sum('deuda') } };
  }
  /* Riesgos que solo se ven mirando el conjunto */
  function cruzados() {
    const out = [], L = E.filter((x) => x.ok);
    const comun = (k, label) => { const m = new Map(); L.forEach((x) => x[k].forEach((n) => { const key = norm(n); if (!key) return; const a = m.get(key) || { n, en: new Set() }; a.en.add(x.e.nombre); m.set(key, a); })); Array.from(m.values()).filter((a) => a.en.size > 1).forEach((a) => out.push({ t: `${label} común: ${a.n}`, d: grupo ? `Aparece en ${Array.from(a.en).join(', ')}. Si falla, golpea a varias sociedades a la vez: mide el riesgo total del grupo con él.` : `Aparece en ${Array.from(a.en).join(', ')}. Si falla, afecta a varias empresas de la cartera: conviene que cada una conozca su exposición.`, st: 'warn' })); };
    comun('clientes', 'Cliente'); comun('proveedores', 'Proveedor');
    L.filter((x) => x.m.verdict && x.m.verdict.key === 'stop').forEach((x) => out.push({ t: `${x.e.nombre} en rojo`, d: `Veredicto «${x.m.verdict.titulo}»${x.m.rojos.length ? ': ' + x.m.rojos.join(', ') : ''}.`, st: 'stop' }));
    L.filter((x) => x.m.liquidezMin != null && x.m.liquidezMin < 0).forEach((x) => out.push({ t: `${x.e.nombre} se queda sin liquidez`, d: `La previsión baja a ${F.eur(x.m.liquidezMin)}. ${grupo ? 'Valora financiarla desde otra sociedad del grupo o reforzar su póliza.' : 'Conviene revisar con ella su póliza, sus cobros o su financiación bancaria.'}`, st: 'stop' }));
    const c = consolidado(); const top = L.slice().sort((a, b) => b.m.ventas - a.m.ventas)[0];
    if (grupo && top && L.length > 1 && top.m.ventas / Math.max(1, c.bruto.ventas) > 0.6) out.push({ t: 'El grupo depende de una sociedad', d: `${top.e.nombre} aporta el ${F.pct(top.m.ventas / c.bruto.ventas * 100)} de las ventas del grupo.`, st: 'warn' });
    if (grupo && c.deudaEbitda != null && c.deudaEbitda > 3.5) out.push({ t: 'Endeudamiento del grupo alto', d: `Deuda neta de ${fv(c.deudaEbitda, '×').replace('×', '')} veces el EBITDA consolidado.`, st: c.deudaEbitda > 5 ? 'stop' : 'warn' });
    if (grupo && G.tes) {
      const t = tesoreria();
      t.prop.filter((r) => !r.de).forEach((r) => out.push({ t: `${r.a.e.nombre} necesita caja que el grupo no tiene`, d: `Le faltan ${F.eur(r.importe)} según su previsión y ninguna sociedad puede prestárselos sin bajar de su colchón.`, st: 'stop' }));
      const sinC = t.T.prestamos.filter((p) => !p.contrato).length; if (sinC) out.push({ t: `${sinC} préstamo${sinC > 1 ? 's' : ''} entre sociedades sin contrato`, d: 'Son operaciones vinculadas: deben estar por escrito y a valor de mercado. Sin documentar, Hacienda puede ajustarlas.', st: 'warn' });
      TQ.filter(([k, , malo]) => t.T.resp[k] === malo && !(k === 'contrato' && sinC)).forEach(([, q, , a]) => out.push({ t: 'Tesorería del grupo: ' + a.split(':')[0].toLowerCase(), d: a, st: 'warn' }));
    }
    E.filter((x) => !x.ok).forEach((x) => out.push({ t: `${x.e.nombre} sin datos`, d: `Entre en esta empresa y cargue sus cifras (o súbalas en la zona de origen) para que cuente en ${grupo ? 'el grupo' : 'la cartera'}.`, st: 'warn' }));
    return out;
  }
  const actualDe = (x, ind) => (ind === 'liquidezMin' ? x.m.liquidezMin : x.m[ind]);
  const actualGrupo = (ind) => { const c = consolidado(); return { ventas: c.ventas, ebitda: c.ebitda, ebitdaPct: c.ebitdaPct, caja: c.caja, liquidezMin: c.liquidezMin, dso: E.filter((x) => x.ok).reduce((a, x) => a + x.m.dso * x.m.ventas, 0) / Math.max(1, c.bruto.ventas), deudaEbitda: c.deudaEbitda, ventasEmpleado: c.ventas / Math.max(1, c.plantilla) }[ind]; };
  const cumple = (v, meta, dir) => (v == null || meta === '' || meta == null ? null : dir === 'bajar' ? v <= +meta : v >= +meta);

  /* ---------- Tesorería del grupo: ¿quién financia a quién? ----------
     Registro de préstamos entre sociedades, posición de cada una (lo que presta, lo que debe y su neto),
     qué sociedad tiene caja de sobra y cuál la necesita según su previsión, y una propuesta de quién podría
     financiar a quién. Tres preguntas de gobierno: contrato escrito, interés de mercado y caja centralizada. */
  const TQ = [
    ['contrato', '¿Cada préstamo entre sociedades tiene un contrato escrito (importe, plazo, interés, garantías)?', 'no', 'Formalizar por escrito cada préstamo intragrupo: importe, plazo, interés y calendario de devolución.'],
    ['mercado', '¿Los préstamos entre sociedades llevan un interés de mercado y está documentado?', 'no', 'Fijar un interés de mercado y documentarlo: son operaciones vinculadas y Hacienda puede ajustarlas (consúltalo con tu asesor).'],
    ['pool', '¿Hay una política para mover caja entre sociedades (quién decide, límites, colchón de cada una)?', 'no', 'Acordar una política de tesorería del grupo: quién decide los movimientos, límites por sociedad y caja mínima de cada una.']
  ];
  const colchon = (x) => { const em = (x.sim || {}).empresa || {}; return ((+em.personal || 0) + (+em.fijos || 0)) / 12; };
  function tesoreria() {
    const T = G.tes || (G.tes = { prestamos: [], resp: {} });
    T.prestamos = T.prestamos || []; T.resp = T.resp || {};
    const L = E.filter((x) => x.ok), pos = {};
    L.forEach((x) => { const sobra = Math.max(0, x.m.caja - colchon(x)), falta = Math.max(0, -(x.m.liquidezMin || 0)); pos[x.e.id] = { x, presta: 0, debe: 0, sobra, falta, colchon: colchon(x) }; });
    T.prestamos.forEach((p) => { if (pos[p.de]) pos[p.de].presta += +p.importe || 0; if (pos[p.a]) pos[p.a].debe += +p.importe || 0; });
    // Propuesta: la caja que sobra en unas cubre lo que les falta a otras, de mayor a mayor
    const donantes = Object.values(pos).filter((p) => p.sobra > 0).map((p) => ({ p, q: p.sobra })).sort((a, b) => b.q - a.q);
    const prop = [];
    Object.values(pos).filter((p) => p.falta > 0).sort((a, b) => b.falta - a.falta).forEach((n) => {
      let resto = n.falta;
      donantes.forEach((d) => { if (resto <= 0 || d.q <= 0 || d.p === n) return; const m = Math.min(resto, d.q); prop.push({ de: d.p.x, a: n.x, importe: m }); d.q -= m; resto -= m; });
      if (resto > 0) prop.push({ de: null, a: n.x, importe: resto });
    });
    const sinResp = TQ.filter(([k]) => T.resp[k] == null);
    return { T, pos, prop, sinResp, total: T.prestamos.reduce((a, p) => a + (+p.importe || 0), 0) };
  }
  function tesoreriaHTML() {
    const { T, pos, prop, total } = tesoreria(), L = E.filter((x) => x.ok);
    const opt = (sel) => L.map((x) => `<option value="${x.e.id}" ${x.e.id === sel ? 'selected' : ''}>${esc(x.e.nombre)}</option>`).join('');
    return `<section class="glass pad stack mt gr-tes" id="gTes"><div class="row"><h4>Tesorería del grupo</h4><span class="spacer"></span><span class="small muted">${T.prestamos.length} préstamo${T.prestamos.length === 1 ? '' : 's'} entre sociedades · ${F.eur(total)}</span></div>
      <div class="gr-q"><b>¿Quién financia a quién dentro del grupo?</b><span class="small muted">Apunta cada préstamo entre sociedades: quién presta, a quién, cuánto y a qué interés. Con eso se ve la posición de cada sociedad, se elimina del consolidado y se detecta qué sociedad necesita caja y cuál puede dársela.</span></div>
      <div class="table-wrap"><table class="gr-tab"><thead><tr><th style="text-align:left">Presta</th><th style="text-align:left">Recibe</th><th>Importe</th><th>Interés %</th><th>Vencimiento</th><th>Contrato</th><th></th></tr></thead><tbody>
      ${T.prestamos.map((p, i) => `<tr><td style="text-align:left"><select class="input" data-pl="${i}" data-pk="de">${opt(p.de)}</select></td><td style="text-align:left"><select class="input" data-pl="${i}" data-pk="a">${opt(p.a)}</select></td><td><input class="input" data-pl="${i}" data-pk="importe" value="${p.importe ? F.num(p.importe) : ''}" style="width:120px;text-align:right"></td><td><input class="input" data-pl="${i}" data-pk="interes" value="${p.interes == null ? '' : String(p.interes).replace('.', ',')}" style="width:70px;text-align:right"></td><td><input class="input" type="date" data-pl="${i}" data-pk="vence" value="${esc(p.vence || '')}"></td><td><input type="checkbox" data-pl="${i}" data-pk="contrato" ${p.contrato ? 'checked' : ''} aria-label="Tiene contrato escrito"></td><td><button class="icon-btn" data-pdel="${i}" aria-label="Quitar préstamo">×</button></td></tr>`).join('') || '<tr><td colspan="7" class="small muted" style="text-align:left">Sin préstamos apuntados. Si unas sociedades financian a otras, añádelos.</td></tr>'}
      </tbody></table></div>
      <div class="row"><button class="btn ghost" id="gNewLoan" ${L.length < 2 ? 'disabled' : ''}>Añadir préstamo</button>${total ? `<button class="btn ghost" id="gLoanElim">Usar ${F.eur(total)} en el consolidado</button>` : ''}</div>
      <div class="table-wrap"><table class="gr-tab"><thead><tr><th style="text-align:left">Sociedad</th><th>Caja</th><th>Colchón (1 mes de gastos)</th><th>Caja que sobra</th><th>Le falta según su previsión</th><th>Ha prestado</th><th>Debe al grupo</th><th>Neto</th></tr></thead><tbody>
      ${Object.values(pos).map((p) => `<tr><td style="text-align:left">${esc(p.x.e.nombre)}</td><td>${F.eur(p.x.m.caja)}</td><td>${F.eur(p.colchon)}</td><td>${p.sobra ? F.eur(p.sobra) : '—'}</td><td style="color:${p.falta ? 'var(--stop)' : 'inherit'}">${p.falta ? F.eur(p.falta) : '—'}</td><td>${p.presta ? F.eur(p.presta) : '—'}</td><td>${p.debe ? F.eur(p.debe) : '—'}</td><td>${F.eur(p.presta - p.debe)}</td></tr>`).join('')}
      </tbody></table></div>
      ${prop.length ? `<div class="gr-prop"><b class="small">Propuesta de financiación interna</b>${prop.map((r) => r.de ? `<p class="small"><span class="state st-ok">Posible</span> <b>${esc(r.de.e.nombre)}</b> podría prestar <b>${F.eur(r.importe)}</b> a <b>${esc(r.a.e.nombre)}</b> sin bajar de su colchón.</p>` : `<p class="small"><span class="state st-stop">Sin cubrir</span> A <b>${esc(r.a.e.nombre)}</b> le faltan <b>${F.eur(r.importe)}</b> que el grupo no puede cubrir con su caja: hace falta financiación bancaria o capital.</p>`).join('')}</div>` : '<p class="small muted">Ninguna sociedad necesita caja según su previsión.</p>'}
      <div class="gr-tq"><b class="small">Gobierno de la tesorería del grupo</b>${TQ.map(([k, q]) => `<div class="gr-tqi"><span class="small">${q}</span><span class="c3-a">${['si', 'no'].map((v) => `<button data-tq="${k}" data-v="${v}" aria-pressed="${T.resp[k] === v}">${v === 'si' ? 'Sí' : 'No'}</button>`).join('')}</span></div>`).join('')}</div>
    </section>`;
  }
  function wireTesoreria(main) {
    const T = G.tes, L = E.filter((x) => x.ok);
    const nb = $('#gNewLoan', main); if (nb) nb.onclick = () => { T.prestamos.push({ de: L[0].e.id, a: (L[1] || L[0]).e.id, importe: 0, interes: '', vence: '', contrato: false }); guardar(); render(true); };
    $$('[data-pl]', main).forEach((inp) => inp.onchange = () => { const p = T.prestamos[+inp.dataset.pl], k = inp.dataset.pk; p[k] = k === 'contrato' ? inp.checked : k === 'importe' ? A.fin.parseNum(inp.value) || 0 : k === 'interes' ? (inp.value.trim() === '' ? '' : A.fin.parseNum(inp.value)) : inp.value; guardar(); render(true); });
    $$('[data-pdel]', main).forEach((b) => b.onclick = () => { T.prestamos.splice(+b.dataset.pdel, 1); guardar(); render(true); });
    const le = $('#gLoanElim', main); if (le) le.onclick = () => { G.elim = G.elim || {}; G.elim.prestamos = T.prestamos.reduce((a, p) => a + (+p.importe || 0), 0); guardar(); render(true); };
    $$('[data-tq]', main).forEach((b) => b.onclick = () => { T.resp[b.dataset.tq] = T.resp[b.dataset.tq] === b.dataset.v ? null : b.dataset.v; guardar(); render(true); });
  }

  /* ---------- Pantalla ---------- */
  function render(keep) {
    const yKeep = keep ? scrollY : null;
    const main = $('#gMain'), L = E.filter((x) => x.ok), c = consolidado(), cr = cruzados();
    const kind = grupo ? 'grupo' : 'cartera';
    const pr = P.precio(user.plan, user.periodo, lista.length); // lista: solo empresas reales (sin la empresa modelo)
    main.innerHTML = `<div class="st-repbar st-head"><div class="st-hd"><span class="st-kick">${grupo ? 'Plan Grupos' : 'Plan Consultora'} · ${lista.length} ${grupo ? 'sociedades' : 'empresas'}${grupo ? ` · tramo ${pr.tramo ? pr.tramo.n.toLowerCase() : ''}: ${P.eur(pr.mes)}/mes${pr.periodo === 'anual' ? ' (anual)' : ''}` : ''}</span><h2 class="st-title">${grupo ? 'Vista de grupo' : 'Cartera de clientes'}</h2><p class="st-q">${grupo ? '¿Cómo está el grupo en conjunto y cada sociedad dentro de él?' : '¿Cómo están todas las empresas que acompaño?'}</p></div><span class="spacer"></span><button class="btn solid" id="gRep">${grupo ? 'Informe del grupo' : 'Informe de la cartera'}</button></div>
      ${grupo && (tesoreria().sinResp.length || (!G.tes.prestamos.length && !G.tes.sinPrestamos)) && E.filter((x) => x.ok).length > 1 ? `<div class="gr-ask glass"><span class="c3-orb" aria-hidden="true"></span><div><b>Pregunta pendiente: ¿quién financia a quién dentro del grupo?</b><span class="small muted">${!G.tes.prestamos.length ? 'No hay préstamos entre sociedades apuntados. ' : ''}${tesoreria().sinResp.length ? `Faltan ${tesoreria().sinResp.length} respuesta${tesoreria().sinResp.length > 1 ? 's' : ''} sobre cómo se gobierna la caja del grupo.` : ''}</span></div><span class="spacer"></span><button class="btn solid" data-goto="#gTes">Responder</button>${!G.tes.prestamos.length ? '<button class="btn ghost" data-noloans>No hay préstamos entre sociedades</button>' : ''}</div>` : ''}
      <section class="glass pad gr-const"><div class="gr-sky"></div>
        <div class="gr-legend small muted">El tamaño es la venta de cada ${grupo ? 'sociedad' : 'empresa'}; el anillo, su veredicto en el simulador (verde, ámbar o rojo; gris sin datos); el relleno la identifica, como en la tabla. Contorno discontinuo: ventas negativas. Pulse una para entrar en ella.</div></section>
      ${grupo ? S_kpis(c) : ''}
      <section class="glass pad stack mt"><div class="row"><h4>${grupo ? 'Sociedades' : 'Empresas'}</h4><span class="spacer"></span><span class="small muted">Cifras del último año cargado y previsión del escenario activo de cada una</span></div>
        <div class="table-wrap"><table class="gr-tab"><thead><tr><th style="text-align:left">${grupo ? 'Sociedad' : 'Empresa'}</th>${grupo ? '<th>Rol</th><th>%</th>' : ''}<th>Ventas</th><th>EBITDA</th><th>EBITDA %</th><th>Caja</th><th>Deuda neta</th><th>Valor estimado</th><th>Días de cobro</th><th>Personas</th><th>Liquidez mín.</th><th>Veredicto de la inversión</th><th></th></tr></thead><tbody>
        ${E.map((x, i) => x.ok ? `<tr><td style="text-align:left"><i class="gr-dot" style="background:${PAL[lista.indexOf(x.e) % PAL.length]}"></i><b>${esc(x.e.nombre)}</b>${fict(x)}<br><span class="muted small">${esc(x.m.sector)}${x.reales ? '' : ' · cifras sin cuentas cargadas'}</span></td>${grupo ? `<td>${x.e.rol === 'holding' ? 'Holding' : 'Filial'}</td><td>${x.e.participacion != null ? x.e.participacion : 100} %</td>` : ''}<td>${F.eur(x.m.ventas)}</td><td>${F.eur(x.m.ebitda)}</td><td>${fv(x.m.ebitdaPct, '%')}</td><td>${F.eur(x.m.caja)}</td><td>${F.eur(x.m.deudaNeta)}</td><td>${fv(x.m.valor, '€')}</td><td>${fv(x.m.dso, '')}</td><td>${fv(x.m.plantilla, '')}</td><td style="color:${x.m.liquidezMin < 0 ? 'var(--stop)' : 'inherit'}">${fv(x.m.liquidezMin, '€')}</td><td>${x.m.verdict ? `<span class="state st-${ST[x.m.verdict.key]}">${esc(x.m.verdict.titulo)}</span>` : '—'}</td><td><button class="btn ghost" data-go="${x.e.id}">Entrar</button></td></tr>`
          : `<tr><td style="text-align:left"><b>${esc(x.e.nombre)}</b>${fict(x)}<br><span class="muted small">Sin datos todavía</span></td>${grupo ? '<td></td><td></td>' : ''}<td colspan="9" class="muted small" style="text-align:left">Entra en ella y carga sus cifras, o sube su documentación en la zona de origen.</td><td><button class="btn ghost" data-go="${x.e.id}">Entrar</button></td></tr>`).join('')}
        ${grupo && L.length ? `<tr class="gr-tot"><td style="text-align:left"><b>Consolidado</b><br><span class="muted small">integración global, con eliminaciones</span></td><td></td><td></td><td>${F.eur(c.ventas)}</td><td>${F.eur(c.ebitda)}</td><td>${fv(c.ebitdaPct, '%')}</td><td>${F.eur(c.caja)}</td><td>${F.eur(c.deudaNeta)}</td><td title="Valor atribuible a la holding según participaciones">${F.eur(c.valorAtr)}<br><span class="muted small">atribuible</span></td><td></td><td>${fv(c.plantilla, '')}</td><td title="${c.liqSumaMin ? 'Suma de los mínimos de cada sociedad, que pueden caer en meses distintos' : 'Mínimo de la suma mes a mes de las previsiones de todas las sociedades'}">${F.eur(c.liquidezMin)}<br><span class="muted small">${c.liqSumaMin ? 'suma de mínimos' : 'mes más bajo del grupo'}</span></td><td></td><td></td></tr>` : ''}
        </tbody></table></div>${E.some((x) => !x.e.datosReales) ? `<p class="small muted" style="margin:0">«Datos ficticios»: ${grupo ? 'la sociedad' : 'la empresa'} trabaja todavía con datos de ejemplo en los mundos que no tienen datos propios. ${grupo ? 'Sus cifras entran en el consolidado tal como estén cargadas: revíselas antes de usarlo.' : 'Revise sus cifras antes de compararlas con las demás.'}</p>` : ''}</section>
      ${!grupo ? operativaHTML() : ''}
      ${clonarHTML()}
      ${modeloHTML()}
      ${grupo ? `<section class="glass pad stack mt"><h4>Operaciones dentro del grupo</h4><p class="small muted">Lo que unas sociedades venden o prestan a otras no es venta ni deuda del grupo: se elimina al consolidar. Escribe los importes anuales (los encontrarás en la contabilidad de cada sociedad, cuentas de empresas del grupo).</p>
        <div class="gr-elim">${[['ventas', 'Ventas entre sociedades del grupo', 'se restan de las ventas'], ['margen', 'Margen de esas ventas aún no vendido fuera', 'se resta del EBITDA'], ['prestamos', 'Préstamos entre sociedades del grupo', 'se restan de la deuda']].map(([k, l, d]) => `<label class="field"><span>${l}</span><input class="input" data-elim="${k}" value="${(G.elim || {})[k] ? F.num(G.elim[k]) : ''}" placeholder="0"><small class="muted">${d}</small></label>`).join('')}</div></section>` : ''}
      ${grupo ? tesoreriaHTML() : ''}
      <section class="glass pad stack mt"><h4>Comparativa</h4><div class="gr-cmp">${['ebitdaPct', 'ventasEmpleado', 'dso', 'liquidezMin'].map((k) => barras(k)).join('')}</div></section>
      <section class="glass pad stack mt"><h4>Riesgos que solo se ven en conjunto</h4>${cr.length ? `<div class="risklist">${cr.map((r) => `<div class="risk"><span class="state st-${r.st}">${r.st === 'stop' ? 'Alto' : 'Medio'}</span><div><b>${esc(r.t)}</b><p>${esc(r.d)}</p></div><span></span></div>`).join('')}</div>` : '<p class="small muted">Sin riesgos cruzados con los datos actuales.</p>'}</section>
      ${grupo ? objetivosHTML() : ''}`;
    $$('[data-go]', main).forEach((b) => b.onclick = () => { localStorage.setItem('atalaya.empresa.activa', JSON.stringify(b.dataset.go)); location.href = b.dataset.pag || 'estrategia.html'; });
    wireClonar(main);
    pintaSky();
    $$('[data-elim]', main).forEach((inp) => inp.onchange = () => { G.elim = G.elim || {}; G.elim[inp.dataset.elim] = A.fin ? A.fin.parseNum(inp.value) || 0 : +inp.value || 0; guardar(); render(true); });
    $('#gRep', main).onclick = informe;
    if (grupo) { wireObjetivos(main); wireTesoreria(main); }
    $$('[data-goto]', main).forEach((b) => b.onclick = () => { const t = $(b.dataset.goto); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const nl = $('[data-noloans]', main); if (nl) nl.onclick = () => { G.tes.sinPrestamos = true; guardar(); render(true); };
    if (yKeep != null) scrollTo({ top: yKeep });
    if (A.cosmos) A.cosmos.type3d(main);
  }
  /* Distintivo de las empresas que trabajan con datos ficticios (y si sus cifras del simulador son las de ejemplo) */
  const fict = (x) => (x.e.datosReales ? '' : ` <span class="gr-fict" title="Trabaja con datos ficticios: los mundos sin datos propios muestran una empresa de ejemplo">Datos ficticios${x.sim && A.simEsEjemplo && A.simEsEjemplo(x.sim) ? ' · cifras de ejemplo' : ''}</span>`);
  /* La empresa modelo, aparte y fuera de toda cifra de conjunto */
  function modeloHTML() {
    if (!modelo) return '';
    return `<section class="glass pad stack mt gr-modelo" id="gModelo"><div class="row"><h4>${esc(modelo.nombre)}</h4><span class="gr-fict">Empresa modelo · datos ficticios</span><span class="spacer"></span><button class="btn ghost" data-go="${esc(modelo.id)}">Probar con la empresa modelo</button></div>
      <p class="small muted" style="margin:0">Es una empresa inventada para conocer Atalaya. No entra en ${grupo ? 'el consolidado, la tesorería del grupo' : 'la cartera'}, las comparativas, los riesgos ni ${grupo ? 'el tramo del plan' : 'el límite de empresas del plan'}. Sus cifras son las mismas que enseñan sus mundos:</p>
      ${modeloC && A.cifras ? A.cifras.html(modeloC, { avisos: false }) : ''}</section>`;
  }

  /* ---------- Cartera operativa: dónde está cada cliente y qué toca ----------
     Etapa y paso del recorrido de la auditoría (el resumen que guarda js/intervencion/core.js; si aún no lo hay, la etapa
     del último paso abierto), próxima sesión, pendientes (acciones vencidas, sesiones sin acta, propuestas sin respuesta,
     documentos pedidos y tareas atrasadas de la mesa), triaje del consultor y nota de la empresa con su fecha. */
  const ETAPA_TAB = { guion: 1, constantes: 1, escucha: 1, sintomas: 1, triaje: 1, foto: 1, propuesta: 2, aceptacion: 2, s1docs: 3, s1dinero: 3, s1cierre: 3, documentacion: 4, auditoria: 4, ecosistema: 4, foto360: 4, s2cierre: 4, arranque: 5, objetivos: 5, plan: 5, sesiones: 5, informes: 6, autoeval: 6 };
  const ETAPAS = ['Sesión previa', 'Propuesta integral', 'Servicio 1 · El dinero', 'Servicio 2 · Auditoría 360', 'Servicio 3 · Acompañamiento', 'Documentos'];
  const TIPO_SES = { contacto: 'Primera sesión (triaje)', auditoria: 'Auditoría integral', arranque: 'Arranque', trabajo: 'Sesión de trabajo', seguimiento: 'Seguimiento', revision: 'Revisión de fase' };
  const TRI = { stop: 'Urgencias', warn: 'Preferente', ok: 'Programable' };
  function operativa(x) {
    const iv = x.iv, h = hoyISO(), r = iv && iv.resumen, u = iv && iv.recorrido && iv.recorrido.ultimo;
    const empezado = !!(iv && ((iv.transcripciones || []).length || (iv.sintomas || []).length || u || (iv.sesiones || []).length));
    const etN = r ? r.etapaN : u && ETAPA_TAB[u.tab] ? ETAPA_TAB[u.tab] : empezado ? 1 : 0;
    const etapa = etN ? ETAPAS[etN - 1] : 'Sin empezar';
    const det = r ? `Paso ${r.paso} de ${r.total}${r.pasoN ? ': ' + r.pasoN : ''} · ${r.hechos} hechos` : empezado ? 'Abra la auditoría para ver el paso' : 'Auditoría sin abrir';
    const ses = (iv && iv.sesiones) || [], prox = ses.filter((s) => s.fecha && s.fecha >= h).sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')))[0] || null;
    const pend = [];
    if (iv) {
      ((iv.plan && iv.plan.acciones) || []).filter((a) => a.estado !== 'hecha' && a.fecha && a.fecha < h).forEach((a) => pend.push({ t: 'Acción vencida: ' + a.t, f: a.fecha }));
      ses.filter((s) => s.fecha && s.fecha < h && !String(s.acta || '').trim() && s.tipo !== 'contacto').forEach((s) => pend.push({ t: 'Sesión sin acta (' + fCorta(s.fecha) + ')', f: s.fecha }));
      const R = iv.recorrido || {};
      [['propuesta', 'Propuesta integral'], ['propS2', 'Propuesta de la auditoría 360'], ['propS3', 'Propuesta de acompañamiento']].forEach(([k, n]) => { if ((R[k] || {}).estado === 'presentada') pend.push({ t: n + ' sin respuesta', f: (R[k] || {}).fecha || '' }); });
      const docs = Object.values(R.docs || {}).filter((d) => d && d.e === 'pedido').length; if (docs) pend.push({ t: plu(docs, 'documento pedido sin recibir', 'documentos pedidos sin recibir'), f: '' });
    }
    const atr = ((x.agenda && x.agenda.tareas) || []).filter((t) => t.estado !== 'hecha' && t.fecha && t.fecha < h).length;
    if (atr) pend.push({ t: 'Mesa de trabajo: ' + plu(atr, 'tarea atrasada', 'tareas atrasadas'), f: '' });
    const tri = iv && Array.isArray(iv.triajeAreas) ? (iv.triajeAreas.includes('stop') ? 'stop' : iv.triajeAreas.includes('warn') ? 'warn' : iv.triajeAreas.includes('ok') ? 'ok' : '') : '';
    return { etN, etapa, det, prox, pend, tri, nota: x.nota || null, sesiones: ses.length };
  }
  function operativaHTML() {
    if (!P.puede('intervencion') || !E.length) return '';
    const L = E.map((x) => Object.assign({ x }, operativa(x))).sort((a, b) => (a.prox ? a.prox.fecha : '9') .localeCompare(b.prox ? b.prox.fecha : '9') || b.pend.length - a.pend.length);
    const h = hoyISO(), sem = new Date(h + 'T12:00:00'); sem.setDate(sem.getDate() + 7); const s7 = sem.toISOString().slice(0, 10);
    const estaSemana = L.filter((o) => o.prox && o.prox.fecha <= s7).length, tot = L.reduce((a, o) => a + o.pend.length, 0);
    const nt = (o) => (o.nota && o.nota.nota != null ? `<b class="${o.nota.nota >= 7 ? 'ok' : o.nota.nota >= 5 ? 'warn' : 'stop'}">${String(o.nota.nota.toFixed(1)).replace('.', ',')}</b><br><span class="muted small">${o.nota.fecha ? fCorta(o.nota.fecha.slice(0, 10)) : ''}</span>` : '<span class="muted small">Sin nota</span>');
    return `<section class="glass pad stack mt" id="gOper"><div class="row"><h4>Cartera operativa</h4><span class="spacer"></span><span class="small muted">${plu(estaSemana, 'sesión', 'sesiones')} en los próximos siete días · ${plu(tot, 'pendiente', 'pendientes')} en total</span></div>
      <div class="table-wrap"><table class="gr-tab gr-oper"><thead><tr><th style="text-align:left">Empresa</th><th style="text-align:left">Etapa del recorrido</th><th style="text-align:left">Próxima sesión</th><th style="text-align:left">Pendientes</th><th>Triaje</th><th>Nota</th><th></th></tr></thead><tbody>
      ${L.map((o) => `<tr data-oper="${esc(o.x.e.id)}"><td style="text-align:left"><b>${esc(o.x.e.nombre)}</b></td>
        <td style="text-align:left;white-space:normal;font-family:var(--font-body);min-width:180px" data-etapa><b>${esc(o.etapa)}</b><br><span class="muted small">${esc(o.det)}</span></td>
        <td style="text-align:left;font-family:var(--font-body)" data-prox>${o.prox ? `<b>${fCorta(o.prox.fecha)}${o.prox.hora ? ' · ' + esc(o.prox.hora) : ''}</b><br><span class="muted small">${esc(TIPO_SES[o.prox.tipo] || 'Sesión')}</span>` : `<span class="muted small">${o.sesiones ? 'Sin sesiones futuras' : 'Sin calendario'}</span>`}</td>
        <td style="text-align:left;white-space:normal;font-family:var(--font-body);min-width:240px" data-pend>${o.pend.length ? `<b>${o.pend.length}</b><ul class="small" style="margin:2px 0 0;padding-left:16px">${o.pend.slice(0, 3).map((p) => `<li>${esc(p.t)}</li>`).join('')}${o.pend.length > 3 ? `<li class="muted">y ${o.pend.length - 3} más</li>` : ''}</ul>` : '<span class="muted small">Nada pendiente</span>'}</td>
        <td>${o.tri ? `<span class="state st-${o.tri}">${TRI[o.tri]}</span>` : '<span class="muted small">—</span>'}</td><td>${nt(o)}</td>
        <td style="white-space:nowrap"><button class="btn ghost small" data-go="${esc(o.x.e.id)}" data-pag="intervencion.html">Auditoría</button><button class="btn ghost small" data-go="${esc(o.x.e.id)}" data-pag="intervencion.html#sesiones">Sesiones</button></td></tr>`).join('')}
      </tbody></table></div><p class="small muted" style="margin:0">Ordenada por la próxima sesión. La etapa es la del recorrido de la auditoría integral; la nota, la última calculada al guardar en sus mundos.</p></section>`;
  }

  /* ---------- Nueva empresa desde plantilla ----------
     Se elige una empresa de la cuenta como plantilla y se copia lo que no es suyo: forma, sector, actividad y provincia;
     los umbrales del simulador (sin cifras); los puestos con su perfil (sin personas); la propuesta integral como base
     (sin sus problemas ni objetivos), los honorarios, la duración y la frecuencia de las propuestas; y el día y la hora de
     las sesiones. La empresa nueva trabaja con datos reales: sus mundos empiezan vacíos y piden sus datos. */
  // Guarda un dato de otra empresa de la cuenta (la API pública solo guarda la activa; ver el informe de la fase 2)
  async function guardarEn(id, key, obj) {
    if (P.saveDataOf) return P.saveDataOf(key, id, obj);
    await P.ready;
    if (P.mode === 'server') return P.api('/data/' + encodeURIComponent(key + '--' + id), { method: 'PUT', body: JSON.stringify(obj) });
    // Modo local: se cambia la empresa activa solo mientras se escribe (sin esperas de red, no se cruza con otros guardados)
    const ACT = 'atalaya.empresa.activa', antes = localStorage.getItem(ACT);
    localStorage.setItem(ACT, JSON.stringify(id));
    try { await P.saveData(key, obj); } finally { if (antes == null) localStorage.removeItem(ACT); else localStorage.setItem(ACT, antes); }
  }
  const COPIA = [['ficha', 'Ficha tipo: forma jurídica, sector, actividad y provincia'], ['simulador', 'Umbrales del simulador (caja mínima, plazos, deuda), sin cifras'], ['puestos', 'Puestos con su perfil ideal, sin personas'], ['propuesta', 'Propuesta integral como base, honorarios y duración de las propuestas'], ['sesiones', 'Día y hora de las sesiones']];
  function clonarHTML() {
    if (!lista.length) return '';
    const lim = P.limiteEmpresas(), lleno = lista.length >= lim;
    return `<section class="glass pad stack mt" id="gClon"><div class="row"><h4>${grupo ? 'Nueva sociedad' : 'Nueva empresa'} desde plantilla</h4><span class="spacer"></span><span class="small muted">${lista.length} de ${lim === Infinity ? 'sin límite' : lim} en su plan</span></div>
      <p class="small muted" style="margin:0">Parte de una empresa que ya tiene preparada y copia solo lo que no es suyo. Nunca se copian sus cifras, personas, conversaciones ni diagnóstico.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px"><label class="small">Plantilla<select class="input" id="gClSrc">${lista.map((e) => `<option value="${esc(e.id)}">${esc(e.nombre)}</option>`).join('')}</select></label><label class="small">Nombre de la ${grupo ? 'sociedad' : 'empresa'} nueva<input class="input" id="gClNom" placeholder="Por ejemplo: Transportes Ruiz, S.L."></label></div>
      <div class="gr-clopt">${COPIA.map(([k, t]) => `<label class="small" style="display:flex;gap:6px;align-items:flex-start"><input type="checkbox" data-cl="${k}" checked> ${esc(t)}</label>`).join('')}</div>
      <div class="row"><button class="btn solid" id="gClGo" ${lleno ? 'disabled' : ''}>Crear desde la plantilla</button><span class="small" id="gClMsg">${lleno ? 'Ha llegado al límite de empresas de su plan.' : ''}</span></div></section>`;
  }
  async function clonar(srcId, nombre, que) {
    const src = lista.find((e) => e.id === srcId); if (!src) throw new Error('Elija la empresa plantilla.');
    const ahora = new Date().toISOString();
    const ficha = { nombre, rol: grupo ? 'filial' : 'cliente', plantilla: '', socios: [], datosReales: true, datosRealesDesde: ahora.slice(0, 10), datosRealesTs: ahora, datosRealesOrigen: 'plantilla', desdePlantilla: { id: src.id, nombre: src.nombre, fecha: ahora.slice(0, 10) } };
    if (que.ficha) ['forma', 'sector', 'actividad', 'provincia'].forEach((k) => { if (src[k] != null && src[k] !== '') ficha[k] = src[k]; });
    if (grupo) { ficha.matriz = src.rol === 'holding' ? src.id : src.matriz || ''; ficha.participacion = 100; }
    const e = await P.empresas.crear(ficha);
    const x = E.find((y) => y.e.id === src.id) || {}, ld = async (k) => { try { return await P.loadDataOf(k, src.id); } catch (z) { return null; } };
    if (que.simulador && A.simVacio) { const s0 = x.sim || (await ld('simulador')); const nv = A.simVacio(nombre, (s0 && s0.sector) || src.sector || 'industria'); if (s0 && s0.meta) nv.meta = JSON.parse(JSON.stringify(s0.meta)); await guardarEn(e.id, 'simulador', nv); }
    if (que.puestos) { const pe = await ld('personas'); if (pe && Array.isArray(pe.puestos) && pe.puestos.length) await guardarEn(e.id, 'personas', { v: 1, personas: [], puestos: JSON.parse(JSON.stringify(pe.puestos)).map((q) => Object.assign(q, { sucesor: '' })), equipos: [] }); }
    if (que.propuesta || que.sesiones) {
      const iv = x.iv || (await ld('intervencion')) || {}, nv = { v: 1, recorrido: { propS2: {}, propS3: {} }, plan: { inicio: '', acciones: [] } };
      if (que.propuesta) {
        if (iv.propuesta) { const pr = JSON.parse(JSON.stringify(iv.propuesta)); ['generada', 'sit', 'subtitulo', 'fecha', 'cifra', 'dim', 'alcance', 'fusion'].forEach((k) => delete pr[k]); if (pr.inv) delete pr.inv.objetivos; if (pr.obtienen) pr.obtienen.items = []; if (pr.coste) ['vMin', 'vMax', 'valorEmpresa', 'supuestos'].forEach((k) => delete pr.coste[k]); if (pr.riesgo) delete pr.riesgo.linea; pr.plantilla = { id: src.id, nombre: 'Copia de ' + src.nombre, fecha: ahora.slice(0, 10) }; nv.propuesta = pr; }
        const R = iv.recorrido || {}; ['propS2', 'propS3'].forEach((k) => { const p0 = R[k] || {}; ['precio', 'forma', 'meses', 'frecuencia', 'catalogo'].forEach((y) => { if (p0[y] != null && p0[y] !== '') nv.recorrido[k][y] = p0[y]; }); });
      }
      if (que.sesiones && iv.plan) ['dia', 'hora'].forEach((y) => { if (iv.plan[y]) nv.plan[y] = iv.plan[y]; });
      if (P.puede('intervencion')) await guardarEn(e.id, 'intervencion', nv);
    }
    return e;
  }
  function wireClonar(main) {
    const b = $('#gClGo', main); if (!b) return;
    b.onclick = async () => {
      const msg = $('#gClMsg', main), nombre = ($('#gClNom', main).value || '').trim();
      if (!nombre) { msg.textContent = 'Escriba el nombre de la empresa nueva.'; $('#gClNom', main).focus(); return; }
      const que = {}; $$('[data-cl]', main).forEach((c) => { que[c.dataset.cl] = c.checked; });
      b.disabled = true; msg.textContent = 'Creando…';
      try { const e = await clonar($('#gClSrc', main).value, nombre, que); lista = P.empresas.reales(); E = await Promise.all(lista.map(cargarEmpresa)); render(true); P.toast(`«${e.nombre}» creada desde la plantilla. Sus mundos empiezan vacíos y piden sus datos.`, 6000); }
      catch (x) { msg.textContent = x.message; b.disabled = false; }
    };
  }
  function S_kpis(c) {
    const items = [['Ventas consolidadas', F.eur(c.ventas), c.bruto.ventas !== c.ventas ? `${F.eur(c.bruto.ventas)} antes de eliminar` : 'sin operaciones intragrupo marcadas'], ['EBITDA consolidado', F.eur(c.ebitda), fv(c.ebitdaPct, '%') + ' sobre ventas'], ['Deuda neta / EBITDA', fv(c.deudaEbitda, '×'), `${F.eur(c.deudaNeta)} de deuda neta`], ['Atribuible a la holding', F.eur(c.ventasAtr), `ventas según participaciones · EBITDA ${F.eur(c.ebitdaAtr)}`], ['Valor atribuible', F.eur(c.valorAtr), `valor orientativo de las sociedades según participaciones (suma: ${F.eur(c.valor)})`]];
    return `<div class="kpis mt">${items.map(([k, v, d]) => `<div class="kpi"><div class="k"><span>${k}</span></div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('')}</div>`;
  }
  function barras(k) {
    const d = IND[k], L = E.filter((x) => x.ok && x.m[k] != null && isFinite(x.m[k])); if (!L.length) return '';
    const mx = Math.max(1, ...L.map((x) => Math.abs(x.m[k])));
    return `<div class="gr-bars"><b class="small">${d.n}</b>${L.map((x) => `<div class="gr-bar"><span>${esc(x.e.nombre)}</span><i><b style="width:${Math.abs(x.m[k]) / mx * 100}%;background:${x.m[k] < 0 ? 'var(--stop)' : PAL[lista.indexOf(x.e) % PAL.length]}"></b></i><em>${fv(x.m[k], d.u)}</em></div>`).join('')}<small class="muted">${d.dir === 'bajar' ? 'Mejor cuanto más bajo' : 'Mejor cuanto más alto'}</small></div>`;
  }
  /* Constelación: holding en el centro, sociedades en órbita (dos órbitas con más de ocho).
     En pantallas estrechas, lista vertical ordenada por ventas con el mismo código: tamaño = ventas, anillo = veredicto.
     El lienzo se ajusta a lo dibujado (planetas y nombres nunca quedan fuera) y los nombres largos se recortan con su <title>. */
  function constelacion(holding, ancho) {
    const okE = E.filter((x) => x.ok), mx = Math.max(1, ...okE.map((x) => Math.max(0, x.m.ventas)));
    const others = E.filter((x) => x !== holding), n = others.length, dos = n > 8, lista1 = ancho && ancho < 600;
    const rad = (x) => (x.ok ? (dos || lista1 ? 9 : 14) + Math.sqrt(Math.max(0, x.m.ventas) / mx) * (lista1 ? 14 : dos ? 22 : 30) : (lista1 ? 9 : 12));
    const col = (x) => (!x.ok || !x.m.verdict ? '#737a8e' : x.m.verdict.key === 'go' ? '#2fb24a' : x.m.verdict.key === 'warn' ? '#fab219' : '#e04848');
    const sub = (x) => `${x.ok ? F.eur(x.m.ventas) : 'sin datos'}${grupo && x.e.rol !== 'holding' ? ` · ${x.e.participacion != null ? x.e.participacion : 100} %` : ''}`;
    const tit = (x) => `${x.e.nombre}${x.e === holding.e && grupo ? ' (holding)' : ''} · ${x.ok ? 'ventas ' + F.eur(x.m.ventas) : 'sin datos'}${x.ok && x.m.verdict ? ' · veredicto: ' + x.m.verdict.titulo : ''}`;
    const defs = E.map((x, i) => { const c = PAL[lista.indexOf(x.e) % PAL.length]; return `<radialGradient id="pl${i}" cx="35%" cy="35%"><stop offset="0" stop-color="#fff6dc"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="#0b0d13"/></radialGradient><radialGradient id="halo${i}"><stop offset=".6" stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`; }).join('');
    const box = [Infinity, Infinity, -Infinity, -Infinity], abarca = (x0, y0, x1, y1) => { box[0] = Math.min(box[0], x0); box[1] = Math.min(box[1], y0); box[2] = Math.max(box[2], x1); box[3] = Math.max(box[3], y1); };
    // Planeta con su nombre (abajo o a la derecha) y el texto completo en <title>
    const planet = (x, px, py, big, lado, fit) => {
      const r = rad(x) * (big ? 1.15 : 1), i = E.indexOf(x), neg = x.ok && x.m.ventas < 0;
      const tx = lado ? px + r + 12 : px, ta = lado ? 'start' : 'middle', y1 = lado ? py - 2 : py + r + 18, y2 = lado ? py + 15 : py + r + 32;
      abarca(px - r - 10, py - r - 10, px + r + 10, py + r + 10); abarca(lado ? tx : px - fit / 2, y1 - 14, lado ? tx + fit : px + fit / 2, y2 + 4);
      return `<g class="gr-planet" data-id="${x.e.id}" tabindex="0" role="button" aria-label="Entrar en ${esc(tit(x))}"><title>${esc(tit(x))}</title><circle cx="${px}" cy="${py}" r="${r + 10}" fill="url(#halo${i})"/><circle cx="${px}" cy="${py}" r="${r}" fill="url(#pl${i})" stroke="${col(x)}" stroke-width="2.5"${neg ? ' stroke-dasharray="5 4"' : ''}/><text x="${tx}" y="${y1}" text-anchor="${ta}" class="gr-pn" data-fit="${fit}">${esc(x.e.nombre)}</text><text x="${tx}" y="${y2}" text-anchor="${ta}" class="gr-ps" data-fit="${fit}">${sub(x)}</text></g>`;
    };
    let body = '';
    if (lista1) {
      // Lista: holding arriba y el resto por ventas
      const L = [holding].concat(others.slice().sort((a, b) => (b.ok ? b.m.ventas : -Infinity) - (a.ok ? a.m.ventas : -Infinity))), W = Math.max(320, Math.min(600, ancho)), fila = 58;
      body = L.map((x, k) => planet(x, 34, 30 + k * fila, false, true, W - 90)).join('');
      abarca(0, 0, W, 30 + (L.length - 1) * fila + 30);
    } else {
      const W = dos ? 900 : 760, cx = W / 2, cy = dos ? 190 : 150, fit = dos ? 120 : 160;
      const rx = W / 2 - fit / 2 - 20, ry = dos ? 150 : 100;
      const orb = (k, m, frx, fry, desf) => { const a = Math.PI + (k / Math.max(1, m)) * Math.PI * 2 + desf; return [cx + Math.cos(a) * frx, cy + Math.sin(a) * fry]; };
      // Con dos órbitas: las de más ventas fuera (más sitio para el nombre), el resto dentro, desfasadas
      const ord = others.slice().sort((a, b) => (b.ok ? b.m.ventas : -Infinity) - (a.ok ? a.m.ventas : -Infinity));
      const ext = dos ? ord.slice(0, Math.ceil(n * 0.6)) : others, int = dos ? ord.slice(Math.ceil(n * 0.6)) : [];
      const pos = new Map();
      ext.forEach((x, k) => pos.set(x, orb(k, ext.length, rx, ry, ext.length > 2 ? Math.PI / ext.length : 0)));
      int.forEach((x, k) => pos.set(x, orb(k, int.length, rx * 0.5, ry * 0.5, Math.PI / 2 + Math.PI / Math.max(1, int.length))));
      body = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="rgba(201, 242, 77, .25)" stroke-dasharray="3 6"/>${int.length ? `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.5}" ry="${ry * 0.5}" fill="none" stroke="rgba(201, 242, 77, .18)" stroke-dasharray="3 6"/>` : ''}
        ${others.map((x) => { const [px, py] = pos.get(x); return `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="rgba(134,180,255,.22)"/>`; }).join('')}
        ${others.map((x) => { const [px, py] = pos.get(x); return planet(x, px, py, false, false, int.includes(x) ? fit * 0.8 : fit); }).join('')}${planet(holding, cx, cy, true, false, fit)}`;
      abarca(cx - rx, cy - ry, cx + rx, cy + ry);
    }
    const pad = 6, vb = [box[0] - pad, box[1] - pad, box[2] - box[0] + pad * 2, box[3] - box[1] + pad * 2].map((v) => Math.round(v));
    return `<svg viewBox="${vb.join(' ')}" class="gr-svg${lista1 ? ' lista' : ''}" role="img" aria-label="Constelación del ${grupo ? 'grupo' : 'conjunto de empresas'}: ${E.length} ${grupo ? 'sociedades' : 'empresas'}"><defs>${defs}</defs>${body}</svg>`;
  }
  /* Recorta los nombres que no caben en su sitio (data-fit) y deja el completo en el <title> del planeta */
  const encajar = (root) => $$('text[data-fit]', root).forEach((t) => { const mx = +t.dataset.fit; if (!mx || !t.getComputedTextLength || t.getComputedTextLength() <= mx) return; let s = t.textContent; while (s.length > 2 && t.getComputedTextLength() > mx) { s = s.slice(0, -1); t.textContent = s.trimEnd() + '…'; } });
  /* Pinta la constelación según el ancho disponible y conecta ratón y teclado (Intro o espacio para entrar) */
  let skyW = 0;
  function pintaSky() {
    const sky = $('.gr-sky'); if (!sky) return;
    const holding = E.find((x) => x.e.rol === 'holding') || E[0]; if (!holding) return;
    skyW = sky.clientWidth || 900;
    sky.innerHTML = constelacion(holding, skyW); encajar(sky);
    const entrar = (g) => { localStorage.setItem('atalaya.empresa.activa', JSON.stringify(g.dataset.id)); location.href = 'estrategia.html'; };
    $$('.gr-planet', sky).forEach((g) => { g.addEventListener('click', () => entrar(g)); g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); entrar(g); } }); });
  }
  // Un solo oyente de cambio de tamaño para la constelación (con espera), sin oyentes nuevos en cada pintado
  let skyT = null;
  addEventListener('resize', () => { clearTimeout(skyT); skyT = setTimeout(() => { const sky = $('.gr-sky'); if (sky && Math.abs((sky.clientWidth || 0) - skyW) > 24) pintaSky(); }, 200); });

  /* ---------- Objetivos de la holding en cascada ---------- */
  function objetivosHTML() {
    const O = G.objetivos || [];
    return `<section class="glass pad stack mt"><div class="row"><h4>Objetivos del grupo en cascada</h4><span class="spacer"></span><button class="btn ghost" id="gNewObj">Añadir objetivo</button></div>
      <p class="small muted">La holding fija la meta del grupo y la reparte a cada sociedad. El valor actual sale de los datos de cada una.</p>
      ${O.length ? O.map((o, i) => { const d = IND[o.ind] || IND.ventas, act = actualGrupo(o.ind), ok = cumple(act, o.meta, d.dir); return `<div class="gr-obj"><div class="row"><select class="input" data-oi="${i}" data-ok="ind">${Object.keys(IND).map((k) => `<option value="${k}" ${k === o.ind ? 'selected' : ''}>${IND[k].n}</option>`).join('')}</select>
        <label class="small">Meta del grupo <input class="input" data-oi="${i}" data-ok="meta" value="${o.meta === '' || o.meta == null ? '' : o.meta}" style="width:130px"></label><label class="small">Fecha <input class="input" type="date" data-oi="${i}" data-ok="fecha" value="${esc(o.fecha || '')}"></label>
        <span class="small">Grupo hoy: <b>${fv(act, d.u)}</b> ${ok == null ? '' : `<span class="state st-${ok ? 'ok' : 'warn'}">${ok ? 'Cumple' : 'Por alcanzar'}</span>`}</span><span class="spacer"></span>${d.sum ? `<button class="btn ghost" data-split="${i}" title="Reparte la meta del grupo según el peso actual de cada sociedad">Repartir por peso</button>` : ''}<button class="icon-btn" data-odel="${i}" aria-label="Quitar objetivo">×</button></div>
        <div class="table-wrap"><table class="gr-tab"><thead><tr><th style="text-align:left">Sociedad</th><th>Hoy</th><th>Meta</th><th>Estado</th></tr></thead><tbody>${E.filter((x) => x.ok).map((x) => { const v = actualDe(x, o.ind), m = (o.metas || {})[x.e.id], okk = cumple(v, m, d.dir); return `<tr><td style="text-align:left">${esc(x.e.nombre)}</td><td>${fv(v, d.u)}</td><td><input class="input" data-om="${i}" data-emp="${x.e.id}" value="${m == null || m === '' ? '' : m}" style="width:120px;text-align:right"></td><td>${okk == null ? '—' : `<span class="state st-${okk ? 'ok' : 'warn'}">${okk ? 'Cumple' : 'Por alcanzar'}</span>`}</td></tr>`; }).join('')}</tbody></table></div></div>`; }).join('') : '<p class="small muted">Sin objetivos todavía. Añade uno: ventas, EBITDA, caja, días de cobro…</p>'}</section>`;
  }
  function wireObjetivos(main) {
    G.objetivos = G.objetivos || [];
    const nb = $('#gNewObj', main); if (nb) nb.onclick = () => { G.objetivos.push({ ind: 'ebitdaPct', meta: '', fecha: '', metas: {} }); guardar(); render(true); };
    $$('[data-oi]', main).forEach((inp) => inp.onchange = () => { const o = G.objetivos[+inp.dataset.oi]; const k = inp.dataset.ok; o[k] = k === 'meta' ? (inp.value.trim() === '' ? '' : A.fin.parseNum(inp.value)) : inp.value; guardar(); render(true); });
    $$('[data-om]', main).forEach((inp) => inp.onchange = () => { const o = G.objetivos[+inp.dataset.om]; o.metas = o.metas || {}; o.metas[inp.dataset.emp] = inp.value.trim() === '' ? '' : A.fin.parseNum(inp.value); guardar(); render(true); });
    $$('[data-odel]', main).forEach((b) => b.onclick = () => { G.objetivos.splice(+b.dataset.odel, 1); guardar(); render(true); });
    $$('[data-split]', main).forEach((b) => b.onclick = () => { const o = G.objetivos[+b.dataset.split]; const L = E.filter((x) => x.ok), tot = L.reduce((a, x) => a + Math.max(0, actualDe(x, o.ind) || 0), 0); if (!tot || o.meta === '' || o.meta == null) return; o.metas = {}; L.forEach((x) => { o.metas[x.e.id] = Math.round(o.meta * Math.max(0, actualDe(x, o.ind) || 0) / tot); }); guardar(); render(true); });
  }
  let gt; const guardar = () => { clearTimeout(gt); gt = setTimeout(() => P.saveData('grupo', G), 500); };

  /* ---------- Informe del grupo ---------- */
  function informe() {
    const I = A.informe; I.reset();
    const L = E.filter((x) => x.ok), c = consolidado(), cr = cruzados();
    const rojas = L.filter((x) => x.m.verdict && x.m.verdict.key === 'stop'), verdes = L.filter((x) => x.m.verdict && x.m.verdict.key === 'go');
    const st = rojas.length ? 'stop' : cr.some((r) => r.st === 'stop') ? 'stop' : cr.length ? 'warn' : 'ok';
    const resumen = `<p><b>${grupo ? 'El grupo' : 'La cartera'} reúne ${E.length} ${grupo ? 'sociedades' : 'empresas'}${E.length !== L.length ? ` (${E.length - L.length} todavía sin datos)` : ''}.</b> ${grupo ? `Ventas consolidadas de ${F.eur(c.ventas)} y EBITDA de ${F.eur(c.ebitda)} (${fv(c.ebitdaPct, '%')}); ${c.deudaEbitda == null ? 'con el EBITDA en negativo, la deuda no se puede medir en años de EBITDA' : `deuda neta de ${fv(c.deudaEbitda, '×').replace('×', '')} veces el EBITDA`}.` : `Suman ${F.eur(c.bruto.ventas)} de ventas.`} ${verdes.length} en verde, ${rojas.length} en rojo.</p>${cr.length ? `<p><b>Lo primero:</b> ${esc(cr[0].t)}. ${esc(cr[0].d)}</p>` : ''}`;
    const tabla = I.table([grupo ? 'Sociedad' : 'Empresa'].concat(grupo ? ['Rol', '%'] : []).concat(['Ventas', 'EBITDA', 'EBITDA %', 'Deuda neta', 'Valor estimado', 'Liquidez mín.', 'Veredicto']), E.map((x) => [x.e.nombre + (x.e.datosReales ? '' : ' (datos ficticios)')].concat(grupo ? [x.e.rol === 'holding' ? 'Holding' : 'Filial', (x.e.participacion != null ? x.e.participacion : 100) + ' %'] : []).concat(x.ok ? [F.eur(x.m.ventas), F.eur(x.m.ebitda), fv(x.m.ebitdaPct, '%'), F.eur(x.m.deudaNeta), fv(x.m.valor, '€'), fv(x.m.liquidezMin, '€'), { h: x.m.verdict ? I.pill(ST[x.m.verdict.key], x.m.verdict.titulo) : '—' }] : ['Sin datos', '', '', '', '', '', ''])), { num: grupo ? [3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6] });
    const cons = grupo ? I.table(['Concepto', 'Suma de sociedades', 'Eliminaciones', 'Consolidado'], [['Ventas', F.eur(c.bruto.ventas), F.eur(-(+(G.elim || {}).ventas || 0)), F.eur(c.ventas)], ['EBITDA', F.eur(c.bruto.ebitda), F.eur(-(+(G.elim || {}).margen || 0)), F.eur(c.ebitda)], ['Deuda bancaria', F.eur(c.bruto.deuda), F.eur(-(+(G.elim || {}).prestamos || 0)), F.eur(c.deuda)], ['Caja', F.eur(c.caja), '—', F.eur(c.caja)]], { num: [1, 2, 3] }) + `<p class="rp-muted">Integración global de todas las sociedades. Atribuible a la holding según participaciones: ventas ${F.eur(c.ventasAtr)}, EBITDA ${F.eur(c.ebitdaAtr)} y valor orientativo ${F.eur(c.valorAtr)} (múltiplos y flujos descontados de cada sociedad; si la holding ya recoge en sus cuentas el resultado de las filiales, no se suman dos veces).</p>` : '';
    const cmp = I.table(['Indicador'].concat(L.map((x) => x.e.nombre)), ['ebitdaPct', 'ventasEmpleado', 'dso', 'deudaEbitda', 'liquidezMin'].map((k) => [IND[k].n].concat(L.map((x) => fv(x.m[k], IND[k].u)))));
    const objs = (G.objetivos || []).filter((o) => o.meta !== '' && o.meta != null);
    const objT = objs.length ? objs.map((o) => { const d = IND[o.ind]; return `<h3>${esc(d.n)}: meta del grupo ${fv(+o.meta, d.u)}${o.fecha ? ' · ' + new Date(o.fecha).toLocaleDateString('es-ES') : ''}</h3>` + I.table(['Sociedad', 'Hoy', 'Meta', 'Estado'], L.map((x) => { const v = actualDe(x, o.ind), m = (o.metas || {})[x.e.id], ok = cumple(v, m, d.dir); return [x.e.nombre, fv(v, d.u), m === '' || m == null ? '—' : fv(+m, d.u), { h: ok == null ? '—' : I.pill(ok ? 'ok' : 'warn', ok ? 'Cumple' : 'Por alcanzar') }]; }).concat([[{ h: '<b>Grupo</b>' }, fv(actualGrupo(o.ind), d.u), fv(+o.meta, d.u), { h: (() => { const ok = cumple(actualGrupo(o.ind), o.meta, d.dir); return ok == null ? '—' : I.pill(ok ? 'ok' : 'warn', ok ? 'Cumple' : 'Por alcanzar'); })() }]])); }).join('') : '<p class="rp-muted">Sin objetivos del grupo fijados.</p>';
    const pasos = [];
    rojas.forEach((x) => pasos.push(`Revisar con la dirección de <b>${esc(x.e.nombre)}</b> su plan de corrección (${esc(x.m.rojos.join(', ') || 'semáforos en rojo')}).`));
    cr.filter((r) => /común/.test(r.t)).slice(0, 3).forEach((r) => pasos.push(grupo ? `Medir la exposición total del grupo a <b>${esc(r.t.split(': ')[1])}</b> y fijar un límite común.` : `Revisar con cada empresa afectada su exposición a <b>${esc(r.t.split(': ')[1])}</b>.`));
    if (grupo && !(G.elim && (G.elim.ventas || G.elim.prestamos))) pasos.push('Marcar las ventas y los préstamos entre sociedades del grupo para que el consolidado sea fiel.');
    if (grupo && !objs.length) pasos.push('Fijar los objetivos de la holding y repartirlos a cada sociedad.');
    if (grupo) { const t = tesoreria(); t.prop.filter((r) => r.de).slice(0, 3).forEach((r) => pasos.push(`Valorar un préstamo de <b>${esc(r.de.e.nombre)}</b> a <b>${esc(r.a.e.nombre)}</b> de ${F.eur(r.importe)}, por escrito y a interés de mercado.`)); if (t.sinResp.length) pasos.push('Responder cómo se gobierna la caja del grupo: contratos, interés de mercado y política de movimientos.'); }
    E.filter((x) => !x.ok).forEach((x) => pasos.push(`Cargar los datos de <b>${esc(x.e.nombre)}</b>.`));
    const html = I.cover({ tipo: grupo ? 'Informe del grupo' : 'Informe de la cartera', kicker: grupo ? 'Plan Grupos · visión consolidada' : 'Plan Consultora · cartera de clientes', titulo: grupo ? ((E.find((x) => x.e.rol === 'holding') || E[0]).e.nombre + ' y sociedades') : 'Cartera de clientes', subtitulo: grupo ? '¿Cómo está el grupo en conjunto y cada sociedad dentro de él?' : '¿Cómo están todas las empresas que acompaño?', empresa: user.empresa || user.nombre, sector: `${E.length} ${grupo ? 'sociedades' : 'empresas'}` })
      + I.summary('Resumen ejecutivo', resumen, st)
      + I.section(grupo ? 'Sociedades del grupo' : 'Empresas de la cartera', tabla, 'Cifras del último año cargado de cada una y previsión de su escenario activo en el simulador.')
      + (grupo ? I.section('Consolidado', cons, 'Lo que unas sociedades venden o prestan a otras no es venta ni deuda del grupo y se elimina.') : '')
      + (grupo ? I.section('Tesorería del grupo: quién financia a quién', (() => { const t = tesoreria(); return (t.T.prestamos.length ? I.table(['Presta', 'Recibe', 'Importe', 'Interés', 'Vencimiento', 'Contrato'], t.T.prestamos.map((p) => [(E.find((x) => x.e.id === p.de) || { e: { nombre: '—' } }).e.nombre, (E.find((x) => x.e.id === p.a) || { e: { nombre: '—' } }).e.nombre, F.eur(+p.importe || 0), p.interes === '' || p.interes == null ? '—' : String(p.interes).replace('.', ',') + ' %', p.vence ? new Date(p.vence).toLocaleDateString('es-ES') : '—', p.contrato ? 'Sí' : { h: I.pill('warn', 'No') }]), { num: [2, 3] }) : '<p class="rp-muted">No hay préstamos entre sociedades apuntados.</p>') + I.table(['Sociedad', 'Caja', 'Caja que sobra', 'Le falta', 'Neto con el grupo'], Object.values(t.pos).map((p) => [p.x.e.nombre, F.eur(p.x.m.caja), p.sobra ? F.eur(p.sobra) : '—', p.falta ? F.eur(p.falta) : '—', F.eur(p.presta - p.debe)]), { num: [1, 2, 3, 4] }) + (t.prop.length ? `<h3>Propuesta de financiación interna</h3><ul>${t.prop.map((r) => r.de ? `<li>${esc(r.de.e.nombre)} podría prestar ${F.eur(r.importe)} a ${esc(r.a.e.nombre)}.</li>` : `<li>${esc(r.a.e.nombre)}: ${F.eur(r.importe)} sin cubrir dentro del grupo.</li>`).join('')}</ul>` : '') + `<h3>Gobierno de la tesorería</h3>` + I.table(['Pregunta', 'Respuesta'], TQ.map(([k, q, malo]) => [q, { h: t.T.resp[k] == null ? '<span class="rp-muted">Sin responder</span>' : I.pill(t.T.resp[k] === malo ? 'warn' : 'ok', t.T.resp[k] === 'si' ? 'Sí' : 'No') }])); })(), 'Préstamos entre sociedades, posición de cada una y quién puede financiar a quién sin bajar de su colchón.') : '')
      + I.section('Comparativa', cmp)
      + I.section('Riesgos que solo se ven en conjunto', cr.length ? I.table(['Riesgo', 'Nivel', 'Por qué importa'], cr.map((r) => [r.t, { h: I.pill(r.st, r.st === 'stop' ? 'Alto' : 'Medio') }, r.d])) : '<p class="rp-muted">Sin riesgos cruzados con los datos actuales.</p>')
      + (grupo ? I.section('Objetivos del grupo en cascada', objT) : '')
      + I.section('Próximos pasos', pasos.length ? `<ol class="rp-steps">${pasos.map((p) => `<li>${p}</li>`).join('')}</ol>` : '<p class="rp-muted">Sin acciones pendientes a nivel de grupo.</p>')
      + I.foot();
    I.open({ titulo: (grupo ? 'Informe del grupo' : 'Informe de la cartera'), html });
  }

  /* ---------- Arranque ---------- */
  (async () => {
    A.sky();
    const ok = await P.guard(); if (!ok) return;
    user = P.user; plan = P.PLANES[user.plan] || P.PLANES.profesional; grupo = !!plan.grupo;
    P.mountAccount($('#account'));
    $('#gKind').textContent = grupo ? 'Vista de grupo' : 'Cartera de clientes';
    document.title = 'Atalaya · ' + (grupo ? 'Vista de grupo' : 'Cartera de clientes');
    // La empresa modelo (datos ficticios) no entra en el consolidado, la cartera, las comparativas ni el tramo: va aparte
    lista = P.empresas.reales(); modelo = P.empresas.lista().find((e) => e.modelo) || null;
    if (!P.esGrupo(user)) {
      $('#gMain').innerHTML = `<div class="glass pad stack"><h2>Varias empresas, <em>una sola mirada</em></h2><p>Tu plan (${esc(plan.nombre)}) incluye una empresa. Con <b>Consultora</b> llevas hasta quince empresas cliente por separado y con <b>Grupos</b> reúnes las sociedades de un grupo con su consolidado, la comparativa y los objetivos de la holding en cascada.</p><p class="small muted">El plan Grupos se prepara a medida con nuestro equipo, según tus sociedades y tu estructura.</p><div class="row"><button class="btn solid" id="gCont">Contactar con nuestro equipo</button><button class="btn" id="gPlanes">Ver los planes</button></div></div>`;
      const gp = document.getElementById('gPlanes'); if (gp) gp.onclick = () => P.panelPlanes({ destacar: 'grupos' });
      const gc = document.getElementById('gCont'); if (gc) gc.onclick = () => P.formContacto({ plan: 'grupos', origen: 'vista-grupo' });
      return;
    }
    G = (await P.loadData('grupo')) || { elim: {}, objetivos: [] };
    G.tes = G.tes || { prestamos: [], resp: {} };
    E = await Promise.all(lista.map(cargarEmpresa));
    if (modelo && A.cifras) { try { modeloC = await A.cifras.leer(modelo.id); } catch (x) { modeloC = null; } }
    render();
  })();
})();
