/* Atalaya · Simulador · Inversión inmobiliaria
   Para empresas que compran inmuebles (por tipología), los reforman o los mantienen y los venden para obtener
   rentabilidad, con capital de inversores que pone parte del dinero de cada operación.
   · Cada operación: compra, gastos de compra, reforma, plazo, financiación bancaria, capital de inversores y venta.
   · Reparto con los inversores: rentabilidad preferente, reparto del beneficio, comisión de gestión y de venta.
   · Cartera: volumen de activos, capital propio frente al de inversores, efecto del apalancamiento (cuántos
     activos se llevan con el mismo capital), diversificación por tipología y capital comprometido mes a mes.
   · Escenarios propios del sector: venta más baja, plazo más largo y sobrecoste de reforma.
   · «Llevar al simulador»: ventas, margen y días de existencias de la empresa a partir de las operaciones. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const eur = (n) => (isFinite(n) ? Math.round(n).toLocaleString('es-ES') + ' €' : '—');
  const pct = (n, d) => (isFinite(n) ? (Math.round(n * 10 ** (d == null ? 1 : d)) / 10 ** (d == null ? 1 : d)).toLocaleString('es-ES') + ' %' : '—');
  const num = (v) => { const n = parseFloat(String(v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };

  // Tipologías: gastos de compra (impuestos, notaría, registro), reforma sobre compra, plazo y comisión de venta orientativos
  const TIPOS = {
    vivienda: { n: 'Vivienda para reformar y vender', gastos: 10, reforma: 20, meses: 10, comVenta: 3 },
    alquilada: { n: 'Vivienda con inquilino (compra con descuento)', gastos: 10, reforma: 5, meses: 18, comVenta: 3 },
    edificio: { n: 'Edificio para rehabilitar o dividir', gastos: 8, reforma: 35, meses: 20, comVenta: 3 },
    local: { n: 'Local comercial', gastos: 9, reforma: 10, meses: 12, comVenta: 3 },
    oficina: { n: 'Oficina', gastos: 9, reforma: 12, meses: 12, comVenta: 3 },
    nave: { n: 'Nave o activo industrial', gastos: 8, reforma: 8, meses: 14, comVenta: 3 },
    suelo: { n: 'Suelo o solar', gastos: 8, reforma: 0, meses: 24, comVenta: 2 },
    garaje: { n: 'Garajes y trasteros', gastos: 10, reforma: 2, meses: 8, comVenta: 3 },
    subasta: { n: 'Subasta o activo de banco', gastos: 6, reforma: 15, meses: 12, comVenta: 3 }
  };
  const REPARTO_DEF = { preferente: 8, inversorBenef: 50, gestion: 1.5, exito: 0, impuesto: 25 };
  const nuevaOp = (t, i) => { const T = TIPOS[t] || TIPOS.vivienda; return { id: 'op' + Date.now().toString(36) + (i || ''), nombre: T.n, tipo: t, compra: 200000, gastos: T.gastos, reforma: Math.round(200000 * T.reforma / 100), meses: T.meses, mes: 1, venta: 320000, comVenta: T.comVenta, deuda: 0, tipoDeuda: 5, inversores: 60, activa: true }; };
  const ejemplo = () => [Object.assign(nuevaOp('vivienda', 'a'), { nombre: 'Piso en el centro', compra: 180000, reforma: 40000, venta: 300000, meses: 9, mes: 1, inversores: 70 }), Object.assign(nuevaOp('edificio', 'b'), { nombre: 'Edificio de 6 viviendas', compra: 750000, reforma: 300000, venta: 1550000, meses: 20, mes: 3, deuda: 50, inversores: 80 }), Object.assign(nuevaOp('local', 'c'), { nombre: 'Local en zona comercial', compra: 140000, reforma: 15000, venta: 205000, meses: 12, mes: 5, inversores: 50 })];

  /* ---------- Cálculo de una operación ---------- */
  const calc = (o, R, m) => {
    m = m || {}; const venta = o.venta * (1 + (m.venta || 0)), meses = Math.max(1, o.meses + (m.meses || 0)), reforma = o.reforma * (1 + (m.reforma || 0));
    const gastos = o.compra * (o.gastos || 0) / 100, deuda = o.compra * (o.deuda || 0) / 100, intereses = deuda * (o.tipoDeuda || 0) / 100 * meses / 12;
    const coste = o.compra + gastos + reforma + intereses, ventaNeta = venta * (1 - (o.comVenta || 0) / 100), capital = Math.max(0, coste - deuda);
    const capInv = capital * (o.inversores || 0) / 100, capPropio = capital - capInv, benef = ventaNeta - coste;
    // Reparto: el inversor cobra primero su preferente; del resto, su parte; la gestora cobra comisión de gestión y de éxito
    const pref = Math.min(Math.max(0, benef), capInv * R.preferente / 100 * meses / 12), resto = Math.max(0, benef - pref);
    const exito = resto * (R.exito || 0) / 100, invParte = capInv > 0 ? pref + (resto - exito) * (R.inversorBenef / 100) : 0;
    const gestion = capInv * R.gestion / 100 * meses / 12, inversor = (benef < 0 ? benef * (capInv / (capital || 1)) : invParte) - gestion, empresa = benef - inversor;
    const anual = (g, c) => (c > 0 ? (Math.pow(Math.max(0.0001, 1 + g / c), 12 / meses) - 1) * 100 : NaN);
    return { venta, meses, reforma, gastos, deuda, intereses, coste, ventaNeta, capital, capInv, capPropio, benef, margen: venta ? benef / venta * 100 : 0, roi: coste ? benef / coste * 100 : 0, inversor, empresa, gestion, roeEmpresa: anual(empresa, capPropio), rentInversor: anual(inversor, capInv), sinInversores: anual(benef, capital) };
  };
  const cartera = (ops, R, m) => {
    const act = ops.filter((o) => o.activa !== false), cs = act.map((o) => Object.assign({ o }, calc(o, R, m)));
    const s = (k) => cs.reduce((a, x) => a + x[k], 0);
    const T = { compra: act.reduce((a, o) => a + o.compra, 0), coste: s('coste'), venta: s('venta'), capital: s('capital'), capInv: s('capInv'), capPropio: s('capPropio'), deuda: s('deuda'), benef: s('benef'), empresa: s('empresa'), inversor: s('inversor') };
    const plazo = cs.length ? cs.reduce((a, x) => a + x.meses * x.coste, 0) / (T.coste || 1) : 0;
    T.plazo = plazo; T.margen = T.venta ? T.benef / T.venta * 100 : 0; T.multiplicador = T.capPropio > 0 ? T.capital / T.capPropio : Infinity;
    T.roe = T.capPropio > 0 ? (Math.pow(Math.max(0.0001, 1 + T.empresa / T.capPropio), 12 / Math.max(1, plazo)) - 1) * 100 : NaN;
    const porTipo = {}; cs.forEach((x) => { porTipo[x.o.tipo] = (porTipo[x.o.tipo] || 0) + x.o.compra; });
    T.porTipo = porTipo; T.maxTipo = Math.max(0, ...Object.values(porTipo)) / (T.compra || 1) * 100;
    const fin = Math.max(12, ...act.map((o) => (o.mes || 1) + calc(o, R, m).meses));
    T.curva = Array.from({ length: fin }, (_, i) => cs.filter((x) => i + 1 >= (x.o.mes || 1) && i + 1 < (x.o.mes || 1) + x.meses).reduce((a, x) => a + x.capPropio, 0));
    T.curvaInv = Array.from({ length: fin }, (_, i) => cs.filter((x) => i + 1 >= (x.o.mes || 1) && i + 1 < (x.o.mes || 1) + x.meses).reduce((a, x) => a + x.capInv, 0));
    return { cs, T };
  };
  const ESC = [{ k: 'base', n: 'Base', m: {} }, { k: 'pes', n: 'Venta −10 % y 6 meses más', m: { venta: -0.1, meses: 6 } }, { k: 'ref', n: 'Reforma +20 %', m: { reforma: 0.2 } }, { k: 'dur', n: 'Venta −15 %, 9 meses más y reforma +20 %', m: { venta: -0.15, meses: 9, reforma: 0.2 } }, { k: 'opt', n: 'Venta +5 %', m: { venta: 0.05 } }];

  /* ---------- Avisos del sector ---------- */
  const avisos = (cs, T) => {
    const a = [];
    if (T.maxTipo > 50 && cs.length > 1) a.push(['warn', `Más del ${Math.round(T.maxTipo)} % de la compra está en una sola tipología: poca diversificación.`]);
    cs.forEach((x) => { if (x.margen < 15) a.push([x.margen < 5 ? 'stop' : 'warn', `${x.o.nombre}: margen sobre venta del ${pct(x.margen)}: poco colchón si la venta baja o el plazo se alarga.`]); if (x.o.deuda > 60) a.push(['warn', `${x.o.nombre}: deuda bancaria del ${x.o.deuda} % de la compra.`]); if (x.meses > 18) a.push(['warn', `${x.o.nombre}: ${x.meses} meses en cartera: el capital queda comprometido mucho tiempo.`]); if (x.inversor < 0) a.push(['stop', `${x.o.nombre}: el inversor pierde dinero en el escenario base.`]); });
    return a;
  };

  /* ---------- Vista ---------- */
  let escK = 'base';
  A.inmo = {
    TIPOS, calc, cartera,
    render(host, state, cambia, sync) {
      if (!host) return;
      const S = A.SECTORS[state.sector]; host.hidden = !(S && S.inmo); if (host.hidden) return;
      const real = A.platform && A.platform.modoReal && A.platform.modoReal();
      if (!state.inmo) state.inmo = { ops: real ? [] : ejemplo(), reparto: Object.assign({}, REPARTO_DEF) };
      const st = state.inmo, R = Object.assign({}, REPARTO_DEF, st.reparto), E0 = ESC.find((e) => e.k === escK) || ESC[0];
      const { cs, T } = cartera(st.ops, R, E0.m), av = avisos(cartera(st.ops, R).cs, cartera(st.ops, R).T);
      const tipOpts = (k) => Object.keys(TIPOS).map((t) => `<option value="${t}" ${t === k ? 'selected' : ''}>${TIPOS[t].n}</option>`).join('');
      const maxC = Math.max(1, ...T.curva.map((v, i) => v + T.curvaInv[i]));
      const bars = T.curva.map((v, i) => { const h1 = v / maxC * 70, h2 = T.curvaInv[i] / maxC * 70, w = 100 / T.curva.length; return `<rect x="${i * w + 0.1}" y="${80 - h1}" width="${w - 0.2}" height="${h1}" fill="var(--gold)"/><rect x="${i * w + 0.1}" y="${80 - h1 - h2}" width="${w - 0.2}" height="${h2}" fill="var(--s2)" opacity="0.7"/>`; }).join('');
      host.innerHTML = `<div class="row"><h4>Operaciones inmobiliarias e inversores</h4><span class="spacer"></span><button class="btn" id="imAdd">Añadir operación</button><button class="btn ghost" id="imSim" title="Ventas, margen y días de existencias de la empresa a partir de las operaciones">Llevar al simulador</button></div>
        <p class="small muted" style="margin:0">Cada operación: lo que se compra, lo que cuesta dejarlo listo, el tiempo en cartera y por cuánto se vende. Los inversores ponen parte del capital de cada operación: la empresa mete menos dinero propio y puede llevar más activos a la vez, a cambio de repartir el beneficio.</p>
        ${st.ops.length ? `<div class="table-wrap"><table class="ln-tab im-tab"><thead><tr><th></th><th style="text-align:left">Operación</th><th style="text-align:left">Tipología</th><th>Compra</th><th>Gastos %</th><th>Reforma</th><th>Meses</th><th>Mes inicio</th><th>Venta</th><th>Deuda % compra</th><th>Inversores % capital</th><th>Beneficio</th><th>Para la empresa</th><th></th></tr></thead><tbody>
          ${st.ops.map((o, i) => { const c = cs.find((x) => x.o === o) || calc(o, R, E0.m); return `<tr data-i="${i}" class="${o.activa === false ? 'off' : ''}"><td><button class="switch" role="switch" aria-checked="${o.activa !== false}" aria-label="Incluir esta operación" data-k="activa"></button></td><td style="text-align:left"><input class="input" data-k="nombre" value="${esc(o.nombre)}" style="min-width:130px"></td><td style="text-align:left"><select class="input" data-k="tipo">${tipOpts(o.tipo)}</select></td>${['compra', 'gastos', 'reforma', 'meses', 'mes', 'venta', 'deuda', 'inversores'].map((k) => `<td><input class="input num" data-k="${k}" value="${(o[k] || 0).toLocaleString('es-ES')}" style="width:${['gastos', 'meses', 'mes', 'deuda', 'inversores'].includes(k) ? 58 : 100}px"></td>`).join('')}<td style="color:${c.benef < 0 ? 'var(--stop)' : 'inherit'}">${eur(c.benef)}<br><small class="muted">${pct(c.margen)} s/venta</small></td><td>${eur(c.empresa)}<br><small class="muted">${isFinite(c.roeEmpresa) ? pct(c.roeEmpresa) + ' anual s/capital propio' : 'sin capital propio'}</small></td><td><button class="icon-btn" data-del="${i}" aria-label="Quitar la operación">×</button></td></tr>`; }).join('')}
        </tbody></table></div>` : `<p class="small" style="margin:0">${real ? 'Sin operaciones: añade las operaciones reales (abiertas y previstas) de la empresa.' : 'Sin operaciones.'}</p>`}
        <div class="grid cols-3 im-rep"><div class="stack"><b class="small">Reparto con los inversores</b>
          ${[['preferente', 'Rentabilidad preferente del inversor (% anual)'], ['inversorBenef', 'Parte del beneficio restante para el inversor (%)'], ['gestion', 'Comisión de gestión de la empresa (% anual sobre su capital)'], ['exito', 'Comisión de éxito de la empresa (% del beneficio restante)'], ['impuesto', 'Impuesto sobre el beneficio de la empresa (%)']].map(([k, n]) => `<label class="small" style="display:flex;flex-direction:column;gap:4px">${n}<input class="input num" data-r="${k}" value="${String(R[k]).replace('.', ',')}"></label>`).join('')}</div>
          <div class="stack"><b class="small">Cartera · ${esc(E0.n.toLowerCase())}</b><label class="small">Escenario<select class="input" id="imEsc">${ESC.map((e) => `<option value="${e.k}" ${e.k === escK ? 'selected' : ''}>${esc(e.n)}</option>`).join('')}</select></label>
            <div class="qz-foto"><div><span>Activos en cartera</span><b>${eur(T.compra)}</b><small>${st.ops.filter((o) => o.activa !== false).length} operaciones · ${Object.keys(T.porTipo).length} tipologías</small></div><div><span>Capital propio</span><b>${eur(T.capPropio)}</b><small>inversores ${eur(T.capInv)} · banco ${eur(T.deuda)}</small></div><div><span>Beneficio de las operaciones</span><b style="color:${T.benef < 0 ? 'var(--stop)' : 'inherit'}">${eur(T.benef)}</b><small>${pct(T.margen)} sobre venta · plazo medio ${Math.round(T.plazo)} meses</small></div><div><span>Para la empresa</span><b>${eur(T.empresa)}</b><small>después de impuestos ${eur(T.empresa > 0 ? T.empresa * (1 - R.impuesto / 100) : T.empresa)}</small></div><div><span>Rentabilidad anual del capital propio</span><b>${isFinite(T.roe) ? pct(T.roe) : '—'}</b><small>sin inversores: ${isFinite(cs.length ? cartera(st.ops.map((o) => Object.assign({}, o, { inversores: 0 })), R, E0.m).T.roe : NaN) ? pct(cartera(st.ops.map((o) => Object.assign({}, o, { inversores: 0 })), R, E0.m).T.roe) : '—'}</small></div><div><span>Efecto de los inversores</span><b>${isFinite(T.multiplicador) ? '×' + T.multiplicador.toLocaleString('es-ES', { maximumFractionDigits: 1 }) : 'sin capital propio'}</b><small>activos que se llevan con el mismo capital propio</small></div></div></div>
          <div class="stack"><b class="small">Capital comprometido mes a mes</b><svg viewBox="0 0 100 82" preserveAspectRatio="none" style="width:100%;height:120px" role="img" aria-label="Capital propio y de inversores comprometido cada mes">${bars}</svg><small class="muted"><i style="display:inline-block;width:10px;height:8px;background:var(--gold)"></i> propio · <i style="display:inline-block;width:10px;height:8px;background:var(--s2)"></i> inversores · pico ${eur(maxC)}</small>
            ${Object.keys(T.porTipo).length ? `<small>Diversificación: ${Object.keys(T.porTipo).map((t) => `${esc(TIPOS[t] ? TIPOS[t].n.split(' ')[0] : t)} ${Math.round(T.porTipo[t] / (T.compra || 1) * 100)} %`).join(' · ')}</small>` : ''}</div></div>
        ${st.ops.length ? `<div class="table-wrap"><table class="ln-tab"><thead><tr><th style="text-align:left">Escenario del sector</th><th>Beneficio</th><th>Para la empresa</th><th>Para los inversores</th><th>Rentab. capital propio</th><th>Rentab. inversor</th></tr></thead><tbody>${ESC.map((e) => { const c = cartera(st.ops, R, e.m), ri = c.T.capInv > 0 ? (Math.pow(Math.max(0.0001, 1 + c.T.inversor / c.T.capInv), 12 / Math.max(1, c.T.plazo)) - 1) * 100 : NaN; return `<tr class="${e.k === escK ? 'active' : ''}"><td style="text-align:left">${esc(e.n)}</td><td style="color:${c.T.benef < 0 ? 'var(--stop)' : 'inherit'}">${eur(c.T.benef)}</td><td>${eur(c.T.empresa)}</td><td>${eur(c.T.inversor)}</td><td>${isFinite(c.T.roe) ? pct(c.T.roe) : '—'}</td><td>${isFinite(ri) ? pct(ri) : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : ''}
        ${av.length ? `<ul class="small im-av">${av.map(([k, t]) => `<li class="${k}">${esc(t)}</li>`).join('')}</ul>` : ''}`;
      const $ = (q) => host.querySelector(q), $$ = (q) => [...host.querySelectorAll(q)];
      $('#imAdd').onclick = () => { st.ops.push(nuevaOp('vivienda', st.ops.length)); cambia(); };
      $('#imEsc').onchange = (e) => { escK = e.target.value; A.inmo.render(host, state, cambia, sync); };
      $$('[data-r]').forEach((x) => (x.onchange = () => { st.reparto = Object.assign({}, R, { [x.dataset.r]: num(x.value) }); cambia(); }));
      $$('tr[data-i]').forEach((tr) => { const o = st.ops[+tr.dataset.i];
        tr.querySelectorAll('[data-k]').forEach((x) => { const k = x.dataset.k;
          if (k === 'activa') { x.onclick = () => { o.activa = o.activa === false; cambia(); }; return; }
          x.onchange = () => { if (k === 'nombre') o.nombre = x.value.trim() || TIPOS[o.tipo].n; else if (k === 'tipo') { const T0 = TIPOS[x.value]; if (o.nombre === (TIPOS[o.tipo] || {}).n) o.nombre = T0.n; o.tipo = x.value; o.gastos = T0.gastos; o.comVenta = T0.comVenta; } else o[k] = Math.max(0, num(x.value)); cambia(); };
        }); });
      $$('[data-del]').forEach((b) => (b.onclick = () => { st.ops.splice(+b.dataset.del, 1); cambia(); }));
      $('#imSim').onclick = () => {
        const { T: B } = cartera(st.ops, R); if (!B.venta) return;
        // Ventas de un año: lo que se vende en 12 meses al ritmo de la cartera; margen bruto antes de la estructura; existencias = meses en cartera
        const anual = B.venta * 12 / Math.max(12, B.plazo), e = state.empresa;
        e.ventas = Math.round(anual / 1000) * 1000; e.margen = Math.round(B.benef / B.venta * 1000) / 10; e.dio = Math.round(B.plazo * 30.4); e.dso = 5;
        if (sync) sync(); cambia();
        if (A.toast) A.toast('Simulador actualizado con las operaciones: ventas, margen y días de existencias.');
      };
    }
  };
})();
