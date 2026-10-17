/* Atalaya 360° · Auditoría integral · Precio por conversión sobre beneficio
   El precio sale del valor: una parte (la conversión, en %) del beneficio que el proyecto genera a la empresa.
   · Beneficio: el de las palancas de «Dimensión de la empresa y valor de la inversión» (al año en régimen o a cinco años).
   · Precio = conversión × beneficio. La empresa se queda el resto y el retorno es beneficio ÷ precio.
   · «Proponer con Claude» estima las palancas desde la dimensión, los objetivos y las causas, elige la conversión
     y redacta el argumento de valor; sin conexión, se hace con las reglas y una conversión del 15 %.
   Las propuestas de los servicios 2 y 3 usan el mismo beneficio con su propia conversión. */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { $, esc, guardar, toast, empresa, causasOrdenadas, render, VISTAS, fraseObj } = V.int;
  const S = () => V.int.st();
  const PRO = () => V.propuesta;
  const num = (v) => PRO().num(v), eur = (n) => PRO().eur(n), xx = (n) => PRO().xx(n), redondea = (n, a) => PRO().redondea(n, a);
  const pct1 = (n) => (+n || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %';

  // Valores por defecto de cada propuesta: proyecto principal, servicio 2 (auditoría 360) y servicio 3 (acompañamiento)
  const DEF = { main: { pct: 15, base: 'anual' }, propS2: { pct: 5, base: 'anual' }, propS3: { pct: 20, base: 'anual' } };
  // La conversión siempre entre el 1 y el 60 % (vacía o no numérica, la de partida)
  const pctOk = (v, k) => { const n = num(v); return n > 0 ? Math.min(60, Math.max(1, n)) : DEF[k].pct; };
  const convDe = (k) => { const ST = S(); const pr = k === 'main' ? ST.propuesta : (ST.recorrido && ST.recorrido[k]); if (!pr) return null; pr.conv = Object.assign({}, DEF[k], pr.conv || {}); pr.conv.pct = pctOk(pr.conv.pct, k); return pr.conv; };

  // Beneficio que genera el proyecto según las palancas de la propuesta principal
  const beneficio = () => {
    const pr = S().propuesta; if (!pr || !pr.generada) return null;
    const vi = PRO().valorInversion(pr);
    return vi.B ? { anual: vi.B, anualCons: vi.B * vi.prud / 100, cinco: vi.base.suma, cincoCons: vi.cons.suma, vi } : null;
  };
  const calc = (k) => {
    const c = convDe(k), b = beneficio(); if (!c || !b) return null;
    const base = c.base === 'cinco' ? b.cinco : b.anual, precio = redondea(base * num(c.pct) / 100, base > 200000 ? 500 : 100);
    return { c, b, base, precio, queda: base - precio, retorno: precio ? base / precio : null, ret5: precio ? b.cinco / precio : null, ret5c: precio ? b.cincoCons / precio : null };
  };
  const st = (r) => (r == null || !isFinite(r) ? '' : r >= 5 ? 'ok' : r >= 3 ? 'warn' : 'stop');
  // Precio que ya figura en la propuesta (neto de descuentos): el retorno del sello se calcula sobre él, como en el resto de la propuesta
  const aplicado = () => { const pr = S().propuesta; return pr && pr.generada ? PRO().neto(pr) || PRO().precio(pr) : 0; };

  /* ---------- Bloque en «Valor y precio» de la propuesta principal ---------- */
  const htmlMain = () => {
    const x = calc('main'), c = convDe('main'), ap = aplicado(), b = x ? x.b : beneficio();
    const rAp = ap && b ? b.cinco / ap : null, rApC = ap && b ? b.cincoCons / ap : null, igual = x && ap && Math.abs(ap - x.precio) < 1;
    return `<section class="glass pad stack cv-sec" id="cvMain"><div class="row"><div><div class="eyebrow">Precio por conversión sobre beneficio</div><small class="muted">El precio es una parte del beneficio que el proyecto genera; la empresa se queda el resto.</small></div><span class="spacer"></span>${rAp != null ? `<span class="iv-st ${st(rAp)}" title="Con el precio de la propuesta (${eur(ap)})">Devuelve ${xx(rAp)} en 5 años</span>` : ''}</div>
      <div class="iv-g3"><label class="small">Conversión sobre el beneficio (%)<input class="input" type="number" min="1" max="60" step="0.5" data-cv="pct" value="${esc(c.pct)}"></label><label class="small">Beneficio de referencia<select class="input" data-cv="base"><option value="anual" ${c.base !== 'cinco' ? 'selected' : ''}>Un año en régimen</option><option value="cinco" ${c.base === 'cinco' ? 'selected' : ''}>Cinco años (con la rampa)</option></select></label></div>
      ${x ? `<div class="pc-roi-ed"><div><small>Beneficio que genera</small><b>${eur(x.base)}</b><span>${c.base === 'cinco' ? 'en cinco años' : 'al año, en régimen'} · conservador ${eur(c.base === 'cinco' ? x.b.cincoCons : x.b.anualCons)}</span></div><div><small>Precio sugerido (${pct1(c.pct)} del beneficio)</small><b>${eur(x.precio)}</b><span>Si el precio fuera ${eur(x.precio)}: devuelve ${xx(x.ret5)} en cinco años (conservador ${xx(x.ret5c)}) y la empresa se queda ${eur(x.queda)}</span></div><div class="${st(rAp)}"><small>Con el precio de la propuesta</small><b>${ap ? eur(ap) : '—'}</b><span>${ap ? `devuelve ${xx(rAp)} en cinco años · conservador ${xx(rApC)}${igual ? ' · es el sugerido' : ''}` : 'Sin precio en «Valor y precio» todavía'}</span></div></div>
        <div class="row">${igual ? '' : `<button class="btn small" id="cvAplicar">Usar ${eur(x.precio)} como precio</button>`}<button class="btn ghost small" id="cvIA">Proponer valor y precio con Claude</button></div>`
      : `<p class="small muted" style="margin:0">Aún no hay beneficio calculado: activa las palancas en «Dimensión de la empresa y valor de la inversión», o deja que lo proponga Claude.</p><div class="row"><button class="btn small" id="cvIA">Proponer valor y precio con Claude</button></div>`}
      ${c.argumento ? `<div class="cv-arg"><div class="eyebrow">Argumento de valor</div><p class="small" style="margin:0;white-space:pre-line">${esc(c.argumento)}</p>${c.ia ? `<small class="muted">${esc(c.ia)}</small>` : ''}</div>` : ''}</section>`;
  };
  // Lleva el precio y el valor a «Valor y precio», con los supuestos
  const aplicar = (x) => {
    const pr = S().propuesta, b = x.b, vi = b.vi;
    pr.inv.precio = String(x.precio); pr.inv.auto = false;
    Object.assign(pr.coste, { modo: 'beneficio', vMin: String(Math.round(b.cincoCons)), vMax: String(Math.round(b.cinco)), pMin: '100', pMax: '100',
      supuestos: `Beneficio que genera el proyecto: ${vi.lista.filter((l) => l.v).map((l) => l.x.n.toLowerCase() + ' ' + eur(l.v) + '/año').join('; ')}. Precio: ${pct1(x.c.pct)} del beneficio ${x.c.base === 'cinco' ? 'a cinco años' : 'de un año en régimen'}; la empresa se queda el ${pct1(100 - num(x.c.pct))}. Rampa ${vi.d.rampa.join('/')} %; escenario conservador al ${vi.d.prudencia} %.` + (x.c.argumento ? '\n' + x.c.argumento : '') });
    guardar();
  };
  // Contexto que se da a Claude: dimensión, palancas, objetivos y causas
  const contexto = () => {
    const ST = S(), pr = ST.propuesta, d = PRO().dimDe(pr);
    return { empresa: empresa(), dimension: { ventas: d.ventas, margen: d.margen, ebitda: d.ebitda, plantilla: d.plantilla, costePersona: d.costePersona, personal: d.personal, horasEmpresario: d.horasEmp, valorHora: d.valorHora, financiero: d.financiero, crecimiento: d.crecimiento },
      palancas: PRO().PALANCAS.map((p) => ({ id: p.id, nombre: p.n, que: p.d, campos: p.campos.map(([k, l]) => ({ k, l })), actual: d.palancas[p.id] })),
      objetivos: (ST.objetivos || []).filter((o) => o.dice || o.especifica).map((o) => ({ frase: fraseObj(o), beneficio: o.beneficio })),
      causas: causasOrdenadas().slice(0, 6).map((x) => x.c.t), alcance: pr.alcance, duracion: pr.duracion, tipo: pr.tipo };
  };
  const proponerIA = async (btn) => {
    const pr = S().propuesta, c = convDe('main'); let d = PRO().dimDe(pr);
    btn.disabled = true; btn.textContent = 'Calculando el valor…';
    if (!num(d.ventas)) await PRO().traerSimulador(d);
    const v = A.ia ? await A.ia.asegurar('Proponer valor y precio') : null;
    let j = null;
    if (v) {
      try {
        j = await A.ia.json(`Eres consultor de pymes y fijas el precio de una propuesta por valor: el precio es un porcentaje (la «conversión») del beneficio que el proyecto genera a la empresa. Con los datos de la empresa, sus objetivos y las causas que más pesan, estima el beneficio anual en régimen activando solo las palancas que el caso justifica y con cifras prudentes (si un dato falta, usa una hipótesis conservadora y dilo en los supuestos). Elige la conversión entre el 8 y el 25 % para que el proyecto devuelva al menos 5 veces su precio en cinco años. Escribe el argumento de valor de usted, en frases cortas, sin superlativos ni promesas: qué gana la empresa, por qué y que la mayor parte se la queda ella. No escribas importes en euros en el argumento: la herramienta los calcula y los enseña al lado. Devuelve JSON: {"palancas":{"<id>":{"on":true,"<campo>":"número"}},"conversion":{"pct":15,"base":"anual|cinco"},"argumento":"3-5 frases","supuestos":"hipótesis usadas, en una frase cada una"}. Los ids y campos válidos están en "palancas". \nDatos: ${JSON.stringify(contexto()).slice(0, 20000)}`);
      } catch (e) { j = null; }
    }
    // dimDe completa pr.dim sin sustituirlo: la referencia sigue siendo la misma
    d = PRO().dimDe(pr);
    if (j && j.palancas) {
      const ids = new Set(PRO().PALANCAS.map((p) => p.id));
      Object.entries(j.palancas).forEach(([id, p]) => { if (!ids.has(id) || !p) return; const def = PRO().PALANCAS.find((x) => x.id === id), lim = Object.fromEntries(def.campos.map(([k]) => [k, true]));
        const nuevo = { on: p.on !== false }; Object.keys(p).forEach((k) => { if (lim[k] && num(p[k]) >= 0) nuevo[k] = String(p[k]); }); d.palancas[id] = Object.assign({}, d.palancas[id], nuevo); });
      if (j.conversion) { const q = num(j.conversion.pct); if (q >= 1 && q <= 60) c.pct = q; if (j.conversion.base === 'cinco' || j.conversion.base === 'anual') c.base = j.conversion.base; }
      c.argumento = [j.argumento, j.supuestos ? 'Supuestos: ' + j.supuestos : ''].filter(Boolean).join('\n'); c.ia = 'Propuesto con Claude: revísalo con el empresario antes de presentarlo.';
    } else {
      const u = PRO().proponerPalancas(d); c.pct = DEF.main.pct; c.base = 'anual';
      c.argumento = u.length ? `Palancas activadas por: ${u.join('; ')}.` : ''; c.ia = v ? 'Claude no ha devuelto una propuesta válida: se ha calculado con las reglas.' : 'Sin conexión con Claude: calculado con las reglas.';
    }
    const x = calc('main');
    if (x) { aplicar(x); toast(`Precio ${eur(x.precio)}: ${pct1(c.pct)} de ${eur(x.base)} de beneficio. Revísalo con el empresario.`); }
    else { guardar(); toast('No hay datos suficientes para estimar el beneficio: completa la dimensión de la empresa.'); }
    render();
  };
  const wireMain = (host) => {
    const sec = $('#cvMain', host); if (!sec) return;
    sec.querySelectorAll('[data-cv]').forEach((i) => (i.onchange = () => { const c = convDe('main'); c[i.dataset.cv] = i.dataset.cv === 'pct' ? pctOk(i.value, 'main') : i.value; guardar(); render(); }));
    const ap = $('#cvAplicar', sec); if (ap) ap.onclick = () => { const x = calc('main'); if (!x) return; aplicar(x); render(); toast(`Precio ${eur(x.precio)} aplicado, con el valor a cinco años y sus supuestos.`); };
    const ia = $('#cvIA', sec); if (ia) ia.onclick = () => proponerIA(ia);
  };
  const orig = VISTAS.propuesta;
  VISTAS.propuesta = (host) => {
    orig(host);
    const pr = S().propuesta; if (!pr || !pr.generada) return;
    const v = $('.pc-valor', host); if (!v) return;
    v.insertAdjacentHTML('afterend', htmlMain()); wireMain(host);
  };

  /* ---------- Honorarios de los servicios 2 y 3 con el mismo beneficio ---------- */
  const htmlServicio = (k) => {
    const x = calc(k), c = convDe(k); if (!c) return '';
    const meses = k === 'propS3' ? Math.max(1, +(S().recorrido[k].meses) || 6) : 0;
    return `<div class="cv-srv"><div class="row"><b class="small">Honorarios por conversión sobre beneficio</b><span class="spacer"></span><label class="small iv-inl">Conversión <input class="input" type="number" min="1" max="60" step="0.5" data-cvs="pct" value="${esc(c.pct)}" style="width:70px"> % del beneficio de un año</label></div>
      ${x ? `<p class="small" style="margin:0">El proyecto genera <b>${eur(x.b.anual)}</b> al año en régimen (conservador ${eur(x.b.anualCons)}). Con el ${pct1(c.pct)}: <b>${eur(meses ? redondea(x.precio / meses, 50) : x.precio)}${meses ? ' al mes durante ' + meses + ' meses' : ''}</b>${meses ? ' (' + eur(redondea(x.precio / meses, 50) * meses) + ' en total)' : ''}; la empresa se queda ${eur(x.queda)} del primer año en régimen.</p><div class="row"><button class="btn ghost small" data-cvsap="${k}">Usar como honorarios</button></div>`
        : '<p class="small muted" style="margin:0">Calcula primero el beneficio en la propuesta comercial (paso «Propuesta», «Precio por conversión sobre beneficio»).</p>'}</div>`;
  };
  const wireServicio = (host, k) => {
    const box = host.querySelector(`[data-conv="${k}"]`); if (!box) return;
    box.innerHTML = htmlServicio(k);
    box.querySelectorAll('[data-cvs]').forEach((i) => (i.onchange = () => { convDe(k).pct = pctOk(i.value, k); guardar(); wireServicio(host, k); }));
    const b = box.querySelector('[data-cvsap]'); if (b) b.onclick = () => {
      const x = calc(k), pr = S().recorrido[k], meses = k === 'propS3' ? Math.max(1, +pr.meses || 6) : 0; if (!x) return;
      pr.precio = meses ? `${eur(redondea(x.precio / meses, 50))} al mes` : eur(x.precio); guardar(); render(); toast('Honorarios calculados por conversión sobre el beneficio.');
    };
  };
  V.conversion = { calc, beneficio, wireServicio };
})();
