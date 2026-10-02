/* Atalaya · Vista de grupo (plan Grupos) y cartera de clientes (plan Consultora)
   Reúne todas las empresas de la cuenta: cada una con su simulador y su sistema estratégico.
   · Constelación: la holding en el centro y cada sociedad en órbita, del tamaño de sus ventas y del color de su veredicto.
   · Sociedades una a una y, en Grupos, el consolidado con eliminación de las operaciones intragrupo.
   · Comparativa entre sociedades, riesgos cruzados (clientes y proveedores comunes, sociedades en rojo).
   · Objetivos de la holding en cascada a cada sociedad.
   · Informe del grupo (o de la cartera). */
(function () {
  const A = window.Atalaya, P = A.platform, F = A.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(s\.?l\.?u?|s\.?a\.?|sociedad limitada|grupo)\b/g, '').replace(/[^a-z0-9]/g, '');
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } } };
  const PAL = ['#d4ae64', '#3987e5', '#199e70', '#d55181', '#d95926', '#9b7bff'];
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
  const fv = (v, u) => (v == null || !isFinite(v) ? '—' : u === '€' ? F.eur(v) : u === '%' ? F.pct(v) : u === '×' ? v.toFixed(1).replace('.', ',') + '×' : F.num(Math.round(v)) + (u ? ' ' + u : ''));

  let user, plan, grupo, lista, G, E = [];

  /* ---------- Datos de cada empresa ---------- */
  async function cargarEmpresa(e) {
    let sim = await P.loadDataOf('simulador', e.id), est = await P.loadDataOf('estrategia', e.id);
    if (!sim || !sim.empresa) sim = LS.get(P.k('atalaya.v1', e.id));
    if (!est) est = LS.get(P.k('atalaya.estrategia.v1', e.id));
    const out = { e, sim, est, ok: !!(sim && sim.empresa && A.SECTORS[sim.sector]) };
    if (!out.ok) return out;
    const s = Object.assign(A.defaultState(), sim);
    let r = null; try { r = A.analyze(s, A.scenarioMods(s, s.escenario || 'base')); } catch (x) { r = null; }
    const em = s.empresa, an = r && r.tamano ? r.tamano.antes : null;
    const ventas = an ? an.ventas : em.ventas, ebitda = an ? an.ebitda : em.ventas * em.margen / 100 - em.personal - em.fijos;
    out.m = {
      ventas, ebitda, ebitdaPct: ventas ? ebitda / ventas * 100 : 0, caja: em.caja, deuda: em.deudaViva, deudaNeta: em.deudaViva - em.caja,
      deudaEbitda: ebitda > 0 ? (em.deudaViva - em.caja) / ebitda : null, dso: em.dso, plantilla: an ? an.plantilla : em.plantilla, ventasEmpleado: an ? an.ventasEmpleado : ventas / Math.max(1, em.plantilla),
      liquidezMin: r ? r.cajaRef : null, verdict: r ? r.verdict : null, rojos: r ? r.lights.filter((l) => l.estado === 'stop').map((l) => l.nombre) : [], ambar: r ? r.lights.filter((l) => l.estado === 'warn').length : 0,
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
    return { n: L.length, ventas, ebitda, ebitdaPct: ventas ? ebitda / ventas * 100 : 0, caja, deuda, deudaNeta: deuda - caja, deudaEbitda: ebitda > 0 ? (deuda - caja) / ebitda : null, plantilla: sum('plantilla'), liquidezMin: sum('liquidezMin'), ventasAtr: att('ventas') - (+el.ventas || 0), ebitdaAtr: att('ebitda'), valor: sum('valor'), valorAtr: att('valor'), bruto: { ventas: sum('ventas'), ebitda: sum('ebitda'), deuda: sum('deuda') } };
  }
  /* Riesgos que solo se ven mirando el conjunto */
  function cruzados() {
    const out = [], L = E.filter((x) => x.ok);
    const comun = (k, label) => { const m = new Map(); L.forEach((x) => x[k].forEach((n) => { const key = norm(n); if (!key) return; const a = m.get(key) || { n, en: new Set() }; a.en.add(x.e.nombre); m.set(key, a); })); Array.from(m.values()).filter((a) => a.en.size > 1).forEach((a) => out.push({ t: `${label} común: ${a.n}`, d: `Aparece en ${Array.from(a.en).join(', ')}. Si falla, golpea a varias sociedades a la vez: mide el riesgo total del grupo con él.`, st: 'warn' })); };
    comun('clientes', 'Cliente'); comun('proveedores', 'Proveedor');
    L.filter((x) => x.m.verdict && x.m.verdict.key === 'stop').forEach((x) => out.push({ t: `${x.e.nombre} en rojo`, d: `Veredicto «${x.m.verdict.titulo}»${x.m.rojos.length ? ': ' + x.m.rojos.join(', ') : ''}.`, st: 'stop' }));
    L.filter((x) => x.m.liquidezMin != null && x.m.liquidezMin < 0).forEach((x) => out.push({ t: `${x.e.nombre} se queda sin liquidez`, d: `La previsión baja a ${F.eur(x.m.liquidezMin)}. Valora financiarla desde otra sociedad del grupo o reforzar su póliza.`, st: 'stop' }));
    const c = consolidado(); const top = L.slice().sort((a, b) => b.m.ventas - a.m.ventas)[0];
    if (top && L.length > 1 && top.m.ventas / Math.max(1, c.bruto.ventas) > 0.6) out.push({ t: 'El grupo depende de una sociedad', d: `${top.e.nombre} aporta el ${F.pct(top.m.ventas / c.bruto.ventas * 100)} de las ventas del grupo.`, st: 'warn' });
    if (c.deudaEbitda != null && c.deudaEbitda > 3.5) out.push({ t: 'Endeudamiento del grupo alto', d: `Deuda neta de ${c.deudaEbitda.toFixed(1).replace('.', ',')} veces el EBITDA consolidado.`, st: c.deudaEbitda > 5 ? 'stop' : 'warn' });
    if (grupo && G.tes) {
      const t = tesoreria();
      t.prop.filter((r) => !r.de).forEach((r) => out.push({ t: `${r.a.e.nombre} necesita caja que el grupo no tiene`, d: `Le faltan ${F.eur(r.importe)} según su previsión y ninguna sociedad puede prestárselos sin bajar de su colchón.`, st: 'stop' }));
      const sinC = t.T.prestamos.filter((p) => !p.contrato).length; if (sinC) out.push({ t: `${sinC} préstamo${sinC > 1 ? 's' : ''} entre sociedades sin contrato`, d: 'Son operaciones vinculadas: deben estar por escrito y a valor de mercado. Sin documentar, Hacienda puede ajustarlas.', st: 'warn' });
      TQ.filter(([k, , malo]) => t.T.resp[k] === malo && !(k === 'contrato' && sinC)).forEach(([, q, , a]) => out.push({ t: 'Tesorería del grupo: ' + a.split(':')[0].toLowerCase(), d: a, st: 'warn' }));
    }
    E.filter((x) => !x.ok).forEach((x) => out.push({ t: `${x.e.nombre} sin datos`, d: 'Entra en esta empresa y carga sus cifras (o súbelas en la zona de origen) para que cuente en el grupo.', st: 'warn' }));
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
    const pr = P.precio(user.plan, user.periodo, lista.length);
    const holding = E.find((x) => x.e.rol === 'holding') || E[0];
    main.innerHTML = `<div class="st-repbar st-head"><div class="st-hd"><span class="st-kick">${grupo ? 'Plan Grupos' : 'Plan Consultora'} · ${lista.length} ${grupo ? 'sociedades' : 'empresas'}${grupo ? ` · tramo ${pr.tramo ? pr.tramo.n.toLowerCase() : ''}: ${P.eur(pr.mes)}/mes${pr.periodo === 'anual' ? ' (anual)' : ''}` : ''}</span><h2 class="st-title">${grupo ? 'Vista de grupo' : 'Cartera de clientes'}</h2><p class="st-q">${grupo ? '¿Cómo está el grupo en conjunto y cada sociedad dentro de él?' : '¿Cómo están todas las empresas que acompaño?'}</p></div><span class="spacer"></span><button class="btn solid" id="gRep">${grupo ? 'Informe del grupo' : 'Informe de la cartera'}</button></div>
      ${grupo && (tesoreria().sinResp.length || (!G.tes.prestamos.length && !G.tes.sinPrestamos)) && E.filter((x) => x.ok).length > 1 ? `<div class="gr-ask glass"><span class="c3-orb" aria-hidden="true"></span><div><b>Pregunta pendiente: ¿quién financia a quién dentro del grupo?</b><span class="small muted">${!G.tes.prestamos.length ? 'No hay préstamos entre sociedades apuntados. ' : ''}${tesoreria().sinResp.length ? `Faltan ${tesoreria().sinResp.length} respuesta${tesoreria().sinResp.length > 1 ? 's' : ''} sobre cómo se gobierna la caja del grupo.` : ''}</span></div><span class="spacer"></span><button class="btn solid" data-goto="#gTes">Responder</button>${!G.tes.prestamos.length ? '<button class="btn ghost" data-noloans>No hay préstamos entre sociedades</button>' : ''}</div>` : ''}
      <section class="glass pad gr-const"><div class="gr-sky">${constelacion(holding)}</div>
        <div class="gr-legend small muted">El tamaño es la venta de cada ${grupo ? 'sociedad' : 'empresa'}; el color, su veredicto en el simulador. Pulsa una para entrar en ella.</div></section>
      ${grupo ? S_kpis(c) : ''}
      <section class="glass pad stack mt"><div class="row"><h4>${grupo ? 'Sociedades' : 'Empresas'}</h4><span class="spacer"></span><span class="small muted">Cifras del último año cargado y previsión del escenario activo de cada una</span></div>
        <div class="table-wrap"><table class="gr-tab"><thead><tr><th style="text-align:left">${grupo ? 'Sociedad' : 'Empresa'}</th>${grupo ? '<th>Rol</th><th>%</th>' : ''}<th>Ventas</th><th>EBITDA</th><th>EBITDA %</th><th>Caja</th><th>Deuda neta</th><th>Valor estimado</th><th>Días de cobro</th><th>Personas</th><th>Liquidez mín.</th><th>Veredicto</th><th></th></tr></thead><tbody>
        ${E.map((x, i) => x.ok ? `<tr><td style="text-align:left"><i class="gr-dot" style="background:${PAL[lista.indexOf(x.e) % PAL.length]}"></i><b>${esc(x.e.nombre)}</b><br><span class="muted small">${esc(x.m.sector)}${x.reales ? '' : ' · cifras sin cuentas cargadas'}</span></td>${grupo ? `<td>${x.e.rol === 'holding' ? 'Holding' : 'Filial'}</td><td>${x.e.participacion != null ? x.e.participacion : 100} %</td>` : ''}<td>${F.eur(x.m.ventas)}</td><td>${F.eur(x.m.ebitda)}</td><td>${F.pct(x.m.ebitdaPct)}</td><td>${F.eur(x.m.caja)}</td><td>${F.eur(x.m.deudaNeta)}</td><td>${fv(x.m.valor, '€')}</td><td>${x.m.dso}</td><td>${x.m.plantilla}</td><td style="color:${x.m.liquidezMin < 0 ? 'var(--stop)' : 'inherit'}">${fv(x.m.liquidezMin, '€')}</td><td>${x.m.verdict ? `<span class="state st-${ST[x.m.verdict.key]}">${esc(x.m.verdict.titulo)}</span>` : '—'}</td><td><button class="btn ghost" data-go="${x.e.id}">Entrar</button></td></tr>`
          : `<tr><td style="text-align:left"><b>${esc(x.e.nombre)}</b><br><span class="muted small">Sin datos todavía</span></td>${grupo ? '<td></td><td></td>' : ''}<td colspan="9" class="muted small" style="text-align:left">Entra en ella y carga sus cifras, o sube su documentación en la zona de origen.</td><td><button class="btn ghost" data-go="${x.e.id}">Entrar</button></td></tr>`).join('')}
        ${grupo && L.length ? `<tr class="gr-tot"><td style="text-align:left"><b>Consolidado</b><br><span class="muted small">integración global, con eliminaciones</span></td><td></td><td></td><td>${F.eur(c.ventas)}</td><td>${F.eur(c.ebitda)}</td><td>${F.pct(c.ebitdaPct)}</td><td>${F.eur(c.caja)}</td><td>${F.eur(c.deudaNeta)}</td><td title="Valor atribuible a la holding según participaciones">${F.eur(c.valorAtr)}<br><span class="muted small">atribuible</span></td><td></td><td>${c.plantilla}</td><td>${F.eur(c.liquidezMin)}</td><td></td><td></td></tr>` : ''}
        </tbody></table></div></section>
      ${grupo ? `<section class="glass pad stack mt"><h4>Operaciones dentro del grupo</h4><p class="small muted">Lo que unas sociedades venden o prestan a otras no es venta ni deuda del grupo: se elimina al consolidar. Escribe los importes anuales (los encontrarás en la contabilidad de cada sociedad, cuentas de empresas del grupo).</p>
        <div class="gr-elim">${[['ventas', 'Ventas entre sociedades del grupo', 'se restan de las ventas'], ['margen', 'Margen de esas ventas aún no vendido fuera', 'se resta del EBITDA'], ['prestamos', 'Préstamos entre sociedades del grupo', 'se restan de la deuda']].map(([k, l, d]) => `<label class="field"><span>${l}</span><input class="input" data-elim="${k}" value="${(G.elim || {})[k] ? F.num(G.elim[k]) : ''}" placeholder="0"><small class="muted">${d}</small></label>`).join('')}</div></section>` : ''}
      ${grupo ? tesoreriaHTML() : ''}
      <section class="glass pad stack mt"><h4>Comparativa</h4><div class="gr-cmp">${['ebitdaPct', 'ventasEmpleado', 'dso', 'liquidezMin'].map((k) => barras(k)).join('')}</div></section>
      <section class="glass pad stack mt"><h4>Riesgos que solo se ven en conjunto</h4>${cr.length ? `<div class="risklist">${cr.map((r) => `<div class="risk"><span class="state st-${r.st}">${r.st === 'stop' ? 'Alto' : 'Medio'}</span><div><b>${esc(r.t)}</b><p>${esc(r.d)}</p></div><span></span></div>`).join('')}</div>` : '<p class="small muted">Sin riesgos cruzados con los datos actuales.</p>'}</section>
      ${grupo ? objetivosHTML() : ''}`;
    $$('[data-go]', main).forEach((b) => b.onclick = () => { localStorage.setItem('atalaya.empresa.activa', JSON.stringify(b.dataset.go)); location.href = 'estrategia.html'; });
    $$('.gr-planet', main).forEach((g) => g.addEventListener('click', () => { localStorage.setItem('atalaya.empresa.activa', JSON.stringify(g.dataset.id)); location.href = 'estrategia.html'; }));
    $$('[data-elim]', main).forEach((inp) => inp.onchange = () => { G.elim = G.elim || {}; G.elim[inp.dataset.elim] = A.fin ? A.fin.parseNum(inp.value) || 0 : +inp.value || 0; guardar(); render(true); });
    $('#gRep', main).onclick = informe;
    if (grupo) { wireObjetivos(main); wireTesoreria(main); }
    $$('[data-goto]', main).forEach((b) => b.onclick = () => { const t = $(b.dataset.goto); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const nl = $('[data-noloans]', main); if (nl) nl.onclick = () => { G.tes.sinPrestamos = true; guardar(); render(true); };
    if (yKeep != null) scrollTo({ top: yKeep });
    if (A.cosmos) A.cosmos.type3d(main);
  }
  function S_kpis(c) {
    const items = [['Ventas consolidadas', F.eur(c.ventas), c.bruto.ventas !== c.ventas ? `${F.eur(c.bruto.ventas)} antes de eliminar` : 'sin operaciones intragrupo marcadas'], ['EBITDA consolidado', F.eur(c.ebitda), F.pct(c.ebitdaPct) + ' sobre ventas'], ['Deuda neta / EBITDA', c.deudaEbitda == null ? '—' : c.deudaEbitda.toFixed(1).replace('.', ',') + '×', `${F.eur(c.deudaNeta)} de deuda neta`], ['Atribuible a la holding', F.eur(c.ventasAtr), `ventas según participaciones · EBITDA ${F.eur(c.ebitdaAtr)}`], ['Valor atribuible', F.eur(c.valorAtr), `valor orientativo de las sociedades según participaciones (suma: ${F.eur(c.valor)})`]];
    return `<div class="kpis mt">${items.map(([k, v, d]) => `<div class="kpi"><div class="k"><span>${k}</span></div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('')}</div>`;
  }
  function barras(k) {
    const d = IND[k], L = E.filter((x) => x.ok && x.m[k] != null && isFinite(x.m[k])); if (!L.length) return '';
    const mx = Math.max(1, ...L.map((x) => Math.abs(x.m[k])));
    return `<div class="gr-bars"><b class="small">${d.n}</b>${L.map((x) => `<div class="gr-bar"><span>${esc(x.e.nombre)}</span><i><b style="width:${Math.abs(x.m[k]) / mx * 100}%;background:${x.m[k] < 0 ? 'var(--stop)' : PAL[lista.indexOf(x.e) % PAL.length]}"></b></i><em>${fv(x.m[k], d.u)}</em></div>`).join('')}<small class="muted">${d.dir === 'bajar' ? 'Mejor cuanto más bajo' : 'Mejor cuanto más alto'}</small></div>`;
  }
  /* Constelación: holding en el centro, sociedades en órbita */
  function constelacion(holding) {
    const W = 760, H = 300, cx = W / 2, cy = H / 2, others = E.filter((x) => x !== holding);
    const mx = Math.max(1, ...E.filter((x) => x.ok).map((x) => x.m.ventas));
    const rad = (x) => (x.ok ? 14 + Math.sqrt(x.m.ventas / mx) * 30 : 12);
    const col = (x) => (!x.ok || !x.m.verdict ? '#737a8e' : x.m.verdict.key === 'go' ? '#2fb24a' : x.m.verdict.key === 'warn' ? '#fab219' : '#e04848');
    const planet = (x, px, py, big) => { const r = rad(x) * (big ? 1.15 : 1), i = lista.indexOf(x.e); return `<g class="gr-planet" data-id="${x.e.id}" tabindex="0" role="button" aria-label="Entrar en ${esc(x.e.nombre)}"><circle cx="${px}" cy="${py}" r="${r + 10}" fill="url(#halo${i})"/><circle cx="${px}" cy="${py}" r="${r}" fill="url(#pl${i})" stroke="${col(x)}" stroke-width="2.5"/><text x="${px}" y="${py + r + 18}" text-anchor="middle" class="gr-pn">${esc(x.e.nombre)}</text><text x="${px}" y="${py + r + 32}" text-anchor="middle" class="gr-ps">${x.ok ? F.eur(x.m.ventas) : 'sin datos'}${grupo && x.e.rol !== 'holding' ? ` · ${x.e.participacion != null ? x.e.participacion : 100} %` : ''}</text></g>`; };
    const defs = E.map((x, i) => { const c = PAL[lista.indexOf(x.e) % PAL.length]; return `<radialGradient id="pl${i}" cx="35%" cy="35%"><stop offset="0" stop-color="#fff6dc"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="#0b1226"/></radialGradient><radialGradient id="halo${i}"><stop offset=".6" stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`; }).join('');
    const n = others.length, R = Math.min(W * 0.4, 190 + n * 10);
    // Las sociedades se reparten en la órbita empezando por los lados, donde hay más sitio para su nombre
    const pos = others.map((x, i) => { const a = Math.PI + (i / Math.max(1, n)) * Math.PI * 2 + (n > 2 ? Math.PI / n : 0); return [cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.55]; });
    return `<svg viewBox="0 0 ${W} ${H + 40}" class="gr-svg" role="img" aria-label="Constelación del ${grupo ? 'grupo' : 'conjunto de empresas'}"><defs>${defs}</defs>
      <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R * 0.55}" fill="none" stroke="rgba(212,174,100,.25)" stroke-dasharray="3 6"/>
      ${pos.map(([x, y]) => `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(134,180,255,.22)"/>`).join('')}
      ${others.map((x, i) => planet(x, pos[i][0], pos[i][1])).join('')}${planet(holding, cx, cy, true)}</svg>`;
  }

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
    const resumen = `<p><b>${grupo ? 'El grupo' : 'La cartera'} reúne ${E.length} ${grupo ? 'sociedades' : 'empresas'}${E.length !== L.length ? ` (${E.length - L.length} todavía sin datos)` : ''}.</b> ${grupo ? `Ventas consolidadas de ${F.eur(c.ventas)} y EBITDA de ${F.eur(c.ebitda)} (${F.pct(c.ebitdaPct)}); ${c.deudaEbitda == null ? 'con el EBITDA en negativo, la deuda no se puede medir en años de EBITDA' : `deuda neta de ${c.deudaEbitda.toFixed(1).replace('.', ',')} veces el EBITDA`}.` : `Suman ${F.eur(c.bruto.ventas)} de ventas.`} ${verdes.length} en verde, ${rojas.length} en rojo.</p>${cr.length ? `<p><b>Lo primero:</b> ${esc(cr[0].t)}. ${esc(cr[0].d)}</p>` : ''}`;
    const tabla = I.table([grupo ? 'Sociedad' : 'Empresa'].concat(grupo ? ['Rol', '%'] : []).concat(['Ventas', 'EBITDA', 'EBITDA %', 'Deuda neta', 'Valor estimado', 'Liquidez mín.', 'Veredicto']), E.map((x) => [x.e.nombre].concat(grupo ? [x.e.rol === 'holding' ? 'Holding' : 'Filial', (x.e.participacion != null ? x.e.participacion : 100) + ' %'] : []).concat(x.ok ? [F.eur(x.m.ventas), F.eur(x.m.ebitda), F.pct(x.m.ebitdaPct), F.eur(x.m.deudaNeta), fv(x.m.valor, '€'), fv(x.m.liquidezMin, '€'), { h: x.m.verdict ? I.pill(ST[x.m.verdict.key], x.m.verdict.titulo) : '—' }] : ['Sin datos', '', '', '', '', '', ''])), { num: grupo ? [3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6] });
    const cons = grupo ? I.table(['Concepto', 'Suma de sociedades', 'Eliminaciones', 'Consolidado'], [['Ventas', F.eur(c.bruto.ventas), F.eur(-(+(G.elim || {}).ventas || 0)), F.eur(c.ventas)], ['EBITDA', F.eur(c.bruto.ebitda), F.eur(-(+(G.elim || {}).margen || 0)), F.eur(c.ebitda)], ['Deuda bancaria', F.eur(c.bruto.deuda), F.eur(-(+(G.elim || {}).prestamos || 0)), F.eur(c.deuda)], ['Caja', F.eur(c.caja), '—', F.eur(c.caja)]], { num: [1, 2, 3] }) + `<p class="rp-muted">Integración global de todas las sociedades. Atribuible a la holding según participaciones: ventas ${F.eur(c.ventasAtr)}, EBITDA ${F.eur(c.ebitdaAtr)} y valor orientativo ${F.eur(c.valorAtr)} (múltiplos y flujos descontados de cada sociedad; si la holding ya recoge en sus cuentas el resultado de las filiales, no se suman dos veces).</p>` : '';
    const cmp = I.table(['Indicador'].concat(L.map((x) => x.e.nombre)), ['ebitdaPct', 'ventasEmpleado', 'dso', 'deudaEbitda', 'liquidezMin'].map((k) => [IND[k].n].concat(L.map((x) => fv(x.m[k], IND[k].u)))));
    const objs = (G.objetivos || []).filter((o) => o.meta !== '' && o.meta != null);
    const objT = objs.length ? objs.map((o) => { const d = IND[o.ind]; return `<h3>${esc(d.n)}: meta del grupo ${fv(+o.meta, d.u)}${o.fecha ? ' · ' + new Date(o.fecha).toLocaleDateString('es-ES') : ''}</h3>` + I.table(['Sociedad', 'Hoy', 'Meta', 'Estado'], L.map((x) => { const v = actualDe(x, o.ind), m = (o.metas || {})[x.e.id], ok = cumple(v, m, d.dir); return [x.e.nombre, fv(v, d.u), m === '' || m == null ? '—' : fv(+m, d.u), { h: ok == null ? '—' : I.pill(ok ? 'ok' : 'warn', ok ? 'Cumple' : 'Por alcanzar') }]; }).concat([[{ h: '<b>Grupo</b>' }, fv(actualGrupo(o.ind), d.u), fv(+o.meta, d.u), { h: (() => { const ok = cumple(actualGrupo(o.ind), o.meta, d.dir); return ok == null ? '—' : I.pill(ok ? 'ok' : 'warn', ok ? 'Cumple' : 'Por alcanzar'); })() }]])); }).join('') : '<p class="rp-muted">Sin objetivos del grupo fijados.</p>';
    const pasos = [];
    rojas.forEach((x) => pasos.push(`Revisar con la dirección de <b>${esc(x.e.nombre)}</b> su plan de corrección (${esc(x.m.rojos.join(', ') || 'semáforos en rojo')}).`));
    cr.filter((r) => /común/.test(r.t)).slice(0, 3).forEach((r) => pasos.push(`Medir la exposición total del grupo a <b>${esc(r.t.split(': ')[1])}</b> y fijar un límite común.`));
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
    lista = P.empresas.lista();
    if (!P.esGrupo(user)) {
      $('#gMain').innerHTML = `<div class="glass pad stack"><h2>Varias empresas, <em>una sola mirada</em></h2><p>Tu plan (${esc(plan.nombre)}) incluye una empresa. Con <b>Consultora</b> llevas hasta quince empresas cliente por separado y con <b>Grupos</b> reúnes las sociedades de un grupo con su consolidado, la comparativa y los objetivos de la holding en cascada.</p><p class="small muted">El plan Grupos se prepara a medida con nuestro equipo, según tus sociedades y tu estructura.</p><div class="row"><button class="btn solid" id="gCont">Contactar con nuestro equipo</button><button class="btn" id="gPlanes">Ver los planes</button></div></div>`;
      const gp = document.getElementById('gPlanes'); if (gp) gp.onclick = () => P.panelPlanes({ destacar: 'grupos' });
      const gc = document.getElementById('gCont'); if (gc) gc.onclick = () => P.formContacto({ plan: 'grupos', origen: 'vista-grupo' });
      return;
    }
    G = (await P.loadData('grupo')) || { elim: {}, objetivos: [] };
    G.tes = G.tes || { prestamos: [], resp: {} };
    E = await Promise.all(lista.map(cargarEmpresa));
    render();
  })();
})();
