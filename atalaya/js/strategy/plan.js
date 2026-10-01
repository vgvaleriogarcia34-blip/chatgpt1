/* Atalaya · Sistema estratégico · Plan de empresa
   Misión, visión, propuesta de valor y valores con peso (filtro de decisiones y de riesgos),
   DAFO contextualizado con los datos de la empresa, CAME que convierte el DAFO en acciones
   y cascada de objetivos (macro → micro). */
(function () {
  const A = window.Atalaya, F = A.fmt, S = A.strat;
  const { $, $$, esc } = S;

  /* Ámbitos a los que se asocia cada valor: así los riesgos de cada módulo se ponderan por lo que la empresa no negocia */
  const AMBITOS = { finanzas: 'Solidez financiera', clientes: 'Clientes y servicio', personas: 'Personas y equipo', calidad: 'Calidad y operaciones', innovacion: 'Innovación y crecimiento', etica: 'Ética y entorno' };
  const MOD_AMBITO = { dinero: 'finanzas', impuestos: 'finanzas', tesoreria: 'finanzas', presupuesto: 'finanzas', ventas: 'clientes', margen: 'clientes', comercial: 'clientes', marketing: 'clientes', personas: 'personas', tiempos: 'personas', compras: 'calidad', logistica: 'calidad', lean: 'calidad', expansion: 'innovacion', mercado: 'innovacion' };
  const AREA_AMBITO = (t) => { t = String(t || '').toLowerCase(); return /finan|tesor|impuest|fiscal|presup|dinero/.test(t) ? 'finanzas' : /comerc|venta|client|marketing|abc|margen/.test(t) ? 'clientes' : /person|rrhh|equipo|tiempo/.test(t) ? 'personas' : /oper|compra|log|lean|calidad|planta|produc/.test(t) ? 'calidad' : /expans|mercado|innov|estrateg/.test(t) ? 'innovacion' : null; };

  const Q = {
    d: { n: 'Debilidades', tipo: 'interno', guia: '¿Qué hacemos peor que la competencia? ¿Dónde perdemos dinero, tiempo o clientes? ¿De quién dependemos demasiado?' },
    a: { n: 'Amenazas', tipo: 'externo', guia: '¿Qué está cambiando en el mercado, la economía, la regulación o la competencia que nos puede hacer daño?' },
    f: { n: 'Fortalezas', tipo: 'interno', guia: '¿Por qué nos eligen los clientes A? ¿Qué sabemos hacer que es difícil de copiar? ¿Qué indicadores están en verde?' },
    o: { n: 'Oportunidades', tipo: 'externo', guia: '¿Qué tendencias, segmentos, zonas o cambios del entorno podemos aprovechar con lo que ya tenemos?' }
  };
  /* Los cuatro cruces del CAME */
  const CRUCES = [
    { k: 'FO', tipo: 'Explotar', estrategia: 'Ofensiva', a: 'f', b: 'o', txt: (x, y) => `Usar «${x}» para aprovechar «${y}».`, desc: 'Fortalezas × Oportunidades: crecer apoyándote en lo que haces bien.' },
    { k: 'FA', tipo: 'Mantener', estrategia: 'Defensiva', a: 'f', b: 'a', txt: (x, y) => `Reforzar «${x}» para protegerse de «${y}».`, desc: 'Fortalezas × Amenazas: blindar lo que te diferencia frente a lo que viene.' },
    { k: 'DO', tipo: 'Corregir', estrategia: 'Reorientación', a: 'd', b: 'o', txt: (x, y) => `Corregir «${x}» para no perder «${y}».`, desc: 'Debilidades × Oportunidades: arreglar lo que te impide aprovechar el mercado.' },
    { k: 'DA', tipo: 'Afrontar', estrategia: 'Supervivencia', a: 'd', b: 'a', txt: (x, y) => `Reducir la exposición: «${x}» frente a «${y}».`, desc: 'Debilidades × Amenazas: donde eres débil y el entorno aprieta. Prioridad de protección.' }
  ];

  S.defaults.plan = {
    mision: 'Fabricar soluciones fiables para nuestros clientes industriales con plazos que la competencia no alcanza.',
    vision: 'Ser en 2030 el proveedor de referencia del norte peninsular, con un 15 % de EBITDA y un equipo que funcione sin depender de una persona.',
    propuesta: 'Plazo corto, servicio técnico propio y piezas a medida.',
    valores: [
      { valor: 'Prudencia financiera', conducta: 'No comprometemos la caja mínima ni firmamos deuda que no se pague con el negocio.', ambito: 'finanzas', peso: 5 },
      { valor: 'Cumplir lo prometido al cliente', conducta: 'Plazo y calidad comprometidos se cumplen; si no, avisamos antes.', ambito: 'clientes', peso: 5 },
      { valor: 'Cuidado del equipo', conducta: 'Crecemos sin quemar a las personas: formación, cargas razonables y relevo en los puestos clave.', ambito: 'personas', peso: 4 },
      { valor: 'Mejora continua', conducta: 'Medimos, documentamos y mejoramos los procesos cada trimestre.', ambito: 'calidad', peso: 3 }
    ],
    dafoItems: {
      d: [{ t: 'Dependencia del fundador en decisiones comerciales y técnicas', i: 4 }, { t: 'Procesos sin documentar', i: 3 }, { t: 'El cliente principal concentra demasiada venta', i: 4 }],
      a: [{ t: 'Subida de costes de materias primas y energía', i: 4 }, { t: 'Competidor con precios agresivos', i: 3 }],
      f: [{ t: 'Calidad reconocida por los clientes A', i: 4 }, { t: 'Servicio técnico propio', i: 4 }, { t: 'Equipo estable en producción', i: 3 }],
      o: [{ t: 'Nueva línea de producción', i: 4 }, { t: 'Expansión a Portugal', i: 3 }, { t: 'Digitalizar pedidos', i: 2 }]
    },
    came: [],
    objetivos: [{ id: 'o1', nombre: 'Crecer de forma rentable', indicador: 'EBITDA sobre ventas', actual: 9, meta: 13, fecha: '2027-12-31' }, { id: 'o2', nombre: 'Tesorería sin tensiones', indicador: 'Meses de colchón mínimos', actual: 2, meta: 3, fecha: '2027-06-30' }],
    areas: [{ macro: 'o1', area: 'Comercial', objetivo: 'Subir margen en clientes A', kpi: 'Margen de contribución clientes A (%)', actual: 33, meta: 37 }, { macro: 'o1', area: 'Operaciones', objetivo: 'Productividad en planta', kpi: 'OEE medio (%)', actual: 62, meta: 75 }, { macro: 'o2', area: 'Finanzas', objetivo: 'Cobrar antes', kpi: 'Días de cobro', actual: 75, meta: 60 }],
    acciones: [{ area: 'Comercial', accion: 'Renegociar tarifas con Distribuciones Norte', responsable: 'Dirección comercial', inicio: '', fin: '', estado: 'Pendiente' }, { area: 'Operaciones', accion: 'Plan de mantenimiento preventivo en montaje', responsable: 'Jefe de planta', inicio: '', fin: '', estado: 'En marcha' }, { area: 'Finanzas', accion: 'Política de crédito y reclamación de vencidos', responsable: 'Administración', inicio: '', fin: '', estado: 'Pendiente' }]
  };
  const PL = () => {
    const p = S.state.plan;
    // Migración del DAFO antiguo (texto libre) al DAFO con impacto
    if (!p.dafoItems) { p.dafoItems = {}; ['d', 'a', 'f', 'o'].forEach((k) => { p.dafoItems[k] = String((p.dafo || {})[k] || '').split('\n').map((t) => t.trim()).filter(Boolean).map((t) => ({ t, i: 3 })); }); }
    if (!p.valores) p.valores = A.clone(S.defaults.plan.valores);
    if (!p.came) p.came = [];
    return p;
  };

  /* Sugerencias para el DAFO a partir de los datos de todos los módulos y del mercado */
  function sugerencias() {
    const p = PL(), ya = (k, t) => p.dafoItems[k].some((x) => x.t.toLowerCase() === t.toLowerCase());
    const K = S.allKpis().filter((k) => k.mod !== 'mercado' && k.mod !== 'plan');
    const out = { d: [], a: [], f: [], o: [] };
    K.filter((k) => k.st === 'stop').concat(K.filter((k) => k.st === 'warn')).forEach((k) => out.d.push({ t: `${k.k}: ${k.v} (${k.area})`, i: k.st === 'stop' ? 4 : 3, por: 'Indicador en ' + (k.st === 'stop' ? 'rojo' : 'ámbar') }));
    K.filter((k) => k.st === 'ok').forEach((k) => out.f.push({ t: `${k.k}: ${k.v} (${k.area})`, i: 3, por: 'Indicador en verde' }));
    const r = S.analysis();
    if (r.verdict && r.verdict.key === 'go') out.f.push({ t: 'La inversión prevista se puede pagar con el negocio sin romper la liquidez', i: 4, por: 'Simulador' });
    if (r.verdict && r.verdict.key === 'stop') out.d.push({ t: 'La inversión prevista, tal como está planteada, tensiona la liquidez', i: 5, por: 'Simulador' });
    const h = r.humano; if (h && h.score < 60) out.d.push({ t: `Organización poco preparada para crecer (${Math.round(h.score)}/100)`, i: 4, por: 'Sistema humano' });
    const m = S.state.mercado || {};
    (m.indicadores || []).forEach((x) => { if (x.impacto === 'negativo') out.a.push({ t: `${x.indicador}${x.valor ? ': ' + x.valor : ''}`, i: 3, por: x.fuente || 'Mercado' }); if (x.impacto === 'positivo') out.o.push({ t: `${x.indicador}${x.valor ? ': ' + x.valor : ''}`, i: 3, por: x.fuente || 'Mercado' }); });
    (m.competidores || []).filter((c) => c.nombre && S.num(c.amenaza) >= 4).forEach((c) => out.a.push({ t: `Presión competitiva de ${c.nombre}`, i: S.num(c.amenaza), por: 'Competencia' }));
    if (m.analisis && m.analisis.sector) { (m.analisis.sector.riesgos || []).slice(0, 3).forEach((t) => out.a.push({ t: String(t), i: 3, por: 'Agente de mercado' })); (m.analisis.sector.oportunidades || []).slice(0, 3).forEach((t) => out.o.push({ t: String(t), i: 3, por: 'Agente de mercado' })); }
    const zonas = (S.state.comercial && S.state.comercial.zonas) || [];
    zonas.filter((z) => S.num(z.competencia) <= 3).forEach((z) => out.o.push({ t: `Expansión a ${z.zona} (mercado de ${F.eur(S.num(z.mercado))}, competencia ${z.competencia}/5)`, i: 3, por: 'Expansión' }));
    S.allFindings().sort((a, b) => (b.impactoEUR || 0) - (a.impactoEUR || 0)).slice(0, 3).forEach((f) => out.o.push({ t: `${f.accion} (${F.eur(f.impactoEUR || 0)} al año)`, i: 3, por: 'Mejora interna · ' + f.area }));
    Object.keys(out).forEach((k) => { out[k] = out[k].filter((x, i, arr) => !ya(k, x.t) && arr.findIndex((y) => y.t === x.t) === i).slice(0, 6); });
    return out;
  }

  /* Encaje de una acción con los valores: −100 (choca con todo) a +100 (los refuerza todos) */
  function encaje(item) {
    const V = PL().valores; const e = item.encaje || {};
    const tot = V.reduce((a, v) => a + S.num(v.peso), 0) || 1;
    const sc = V.reduce((a, v, i) => a + S.num(v.peso) * (+e[i] || 0), 0) / tot * 100;
    const choques = V.filter((v, i) => (+e[i] || 0) < 0 && S.num(v.peso) >= 4).map((v) => v.valor);
    return { sc: Math.round(sc), choques };
  }
  /* Riesgos ponderados por los valores: un riesgo pesa más si amenaza algo que la empresa no negocia */
  function riesgosPorValores() {
    const V = PL().valores;
    const pesoAmb = {}; V.forEach((v) => { pesoAmb[v.ambito] = Math.max(pesoAmb[v.ambito] || 0, S.num(v.peso)); });
    return S.allRisks().map((r) => { const amb = MOD_AMBITO[r.mod] || AREA_AMBITO(r.fuente); const w = pesoAmb[amb] || 0; const vs = V.filter((v) => v.ambito === amb).map((v) => v.valor); return Object.assign({}, r, { ambito: amb, valores: vs, ajustado: Math.round(r.nivel * (1 + w / 10) * 10) / 10 }); }).sort((a, b) => b.ajustado - a.ajustado);
  }
  S.planEncaje = encaje; S.riesgosPorValores = riesgosPorValores;

  S.register({
    id: 'plan', nombre: 'Plan de empresa', grupo: 'Visión',
    render(host) {
      const p = PL();
      const prog = (area) => { const l = p.acciones.filter((a) => a.area === area); return l.length ? Math.round(l.filter((a) => a.estado === 'Hecha').length / l.length * 100) : 0; };
      const sug = sugerencias();
      const top = (k) => p.dafoItems[k].slice().sort((a, b) => S.num(b.i) - S.num(a.i)).slice(0, 2);
      const propuestas = CRUCES.flatMap((c) => top(c.a).flatMap((x) => top(c.b).map((y) => ({ c, accion: c.txt(x.t, y.t), impacto: Math.round((S.num(x.i) + S.num(y.i)) / 2) })))).filter((x) => !p.came.some((c) => c.accion === x.accion));
      const RV = riesgosPorValores();
      host.innerHTML = `${S.section('Plan de empresa', 'De la identidad de la empresa a las acciones: misión, visión y valores; un DAFO alimentado con tus datos; el CAME que lo convierte en estrategias; y la cascada de objetivos de cada área. Los valores actúan como filtro: puntúan cada acción y reordenan los riesgos según lo que la empresa no está dispuesta a negociar.')}
        <div class="grid cols-3"><label class="small">Misión · por qué existimos<textarea class="input" id="plM">${esc(p.mision)}</textarea></label><label class="small">Visión · dónde queremos estar<textarea class="input" id="plV">${esc(p.vision)}</textarea></label><label class="small">Propuesta de valor · por qué nos eligen<textarea class="input" id="plP">${esc(p.propuesta)}</textarea></label></div>

        <div class="glass pad mt stack"><div class="row"><h4>Valores de la empresa</h4><span class="spacer"></span><span class="small muted">Peso 1-5: cuánto pesa en las decisiones</span></div>
          <p class="small muted">Escribe 3-6 valores y la conducta concreta que significan. Cada valor se asocia a un ámbito: los riesgos de ese ámbito suben de prioridad y cada acción del CAME se puntúa según los refuerce o los contradiga.</p>
          <div id="plVal"></div></div>

        <div class="glass pad mt stack"><div class="row"><h4>DAFO contextualizado</h4><span class="spacer"></span><span class="small muted">Impacto 1-5 · las sugerencias salen de tus datos</span></div>
          <div class="dafo">${['d', 'a', 'f', 'o'].map((k) => `<div class="dq" data-q="${k}"><div class="row"><b>${Q[k].n}</b><span class="hint">${Q[k].tipo}</span></div><p class="hint" style="margin:4px 0 8px">${Q[k].guia}</p>
            <ul class="dlist">${p.dafoItems[k].map((x, i) => `<li><input class="input" data-dt="${k}:${i}" value="${esc(x.t)}" aria-label="${Q[k].n}"><select class="input" data-di="${k}:${i}" aria-label="Impacto">${[1, 2, 3, 4, 5].map((n) => `<option ${n === S.num(x.i) ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="icon-btn" data-dx="${k}:${i}" aria-label="Quitar">×</button></li>`).join('')}</ul>
            <div class="row" style="margin-top:6px"><input class="input" data-dnew="${k}" placeholder="Añadir ${Q[k].n.toLowerCase().slice(0, -1)}…" style="flex:1"><button class="btn ghost" data-dadd="${k}">Añadir</button></div>
            ${sug[k].length ? `<div class="dsug"><span class="hint">Sugerencias desde tus datos</span>${sug[k].map((x, i) => `<button class="vchip" data-sug="${k}:${i}" title="${esc(x.por)}">+ ${esc(x.t)}</button>`).join('')}</div>` : ''}</div>`).join('')}</div></div>

        <div class="glass pad mt stack"><h4>CAME: del diagnóstico a la estrategia</h4>
          <p class="small muted">Corregir las debilidades, Afrontar las amenazas, Mantener las fortalezas y Explotar las oportunidades. Las propuestas cruzan los puntos de mayor impacto de tu DAFO; añade las que tengan sentido, reescríbelas con tus palabras y pásalas al plan.</p>
          <div class="came">${CRUCES.map((c) => `<div class="cq"><div class="row"><b>${c.tipo}</b><span class="hint">estrategia ${c.estrategia.toLowerCase()}</span></div><p class="hint" style="margin:4px 0 8px">${c.desc}</p>
            ${propuestas.filter((x) => x.c.k === c.k).map((x) => `<div class="cprop"><span>${esc(x.accion)}</span><button class="btn ghost" data-cadd="${esc(x.accion)}" data-ck="${c.k}" data-ci="${x.impacto}">Añadir</button></div>`).join('') || '<p class="small muted">Añade puntos al DAFO para ver propuestas.</p>'}
            <ul class="small">${p.came.filter((x) => x.cruce === c.k).map((x) => `<li>${esc(x.accion)}</li>`).join('')}</ul></div>`).join('')}</div>
          <div id="plCame" class="mt"></div>
          ${p.came.length && p.valores.length ? `<h4 class="mt">Filtro de valores</h4><p class="small muted">Para cada acción, marca si refuerza (+), es neutra (·) o choca (−) con cada valor. La puntuación va de −100 a +100; una acción que choca con un valor de peso 4-5 queda marcada para revisar.</p>
          <div class="table-wrap"><table class="vfilter"><thead><tr><th style="text-align:left">Acción</th>${p.valores.map((v) => `<th title="${esc(v.conducta)}">${esc(v.valor)}<br><span class="hint">peso ${v.peso}</span></th>`).join('')}<th>Encaje</th><th></th></tr></thead><tbody>
            ${p.came.map((x, i) => { const e = encaje(x); return `<tr><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(x.accion)}</td>${p.valores.map((v, j) => `<td><select class="input" data-enc="${i}:${j}" aria-label="${esc(v.valor)}">${[['1', '+'], ['0', '·'], ['-1', '−']].map(([val, l]) => `<option value="${val}" ${String((x.encaje || {})[j] || 0) === val ? 'selected' : ''}>${l}</option>`).join('')}</select></td>`).join('')}
              <td><span class="state st-${e.choques.length ? 'stop' : e.sc >= 30 ? 'ok' : 'warn'}">${e.sc > 0 ? '+' : ''}${e.sc}</span>${e.choques.length ? `<div class="hint">choca con ${esc(e.choques.join(', '))}</div>` : ''}</td>
              <td>${x.enPlan ? '<span class="hint">en el plan</span>' : `<button class="btn ghost" data-toplan="${i}">Pasar al plan</button>`}</td></tr>`; }).join('')}</tbody></table></div>` : ''}
        </div>

        <div class="glass pad mt stack"><h4>Riesgos según tus valores</h4><p class="small muted">Todos los riesgos de la empresa, reordenados: un riesgo sube cuando amenaza un ámbito al que has dado mucho peso en tus valores.</p>
          ${RV.length ? `<div class="table-wrap"><table><thead><tr><th style="text-align:left">Riesgo</th><th>Área</th><th>Nivel</th><th>Con tus valores</th><th style="text-align:left">Valor afectado</th></tr></thead><tbody>${RV.slice(0, 10).map((r) => `<tr><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(r.nombre)}</td><td>${esc(r.fuente || '')}</td><td>${r.nivel}</td><td><b>${String(r.ajustado).replace('.', ',')}</b></td><td style="text-align:left">${esc(r.valores.join(', ') || '—')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Sin riesgos identificados.</p>'}</div>

        <div class="glass pad mt stack"><div class="row"><h4>Cascada de objetivos</h4><span class="spacer"></span><button class="btn" id="plFind">Crear acciones desde los hallazgos</button></div>
          <div class="cascade">${p.objetivos.map((o) => `<div class="cobj"><div class="row"><b>${esc(o.nombre)}</b><span class="spacer"></span><span class="small muted">${esc(o.indicador)}: ${o.actual} → ${o.meta}${o.fecha ? ' · ' + esc(o.fecha) : ''}</span></div>
            ${p.areas.filter((a) => a.macro === o.id).map((a) => `<div class="carea"><div class="row"><span>${esc(a.area)} · ${esc(a.objetivo)}</span><span class="spacer"></span><span class="small muted">${esc(a.kpi)}: ${a.actual} → ${a.meta}</span><span class="state st-${prog(a.area) >= 60 ? 'ok' : prog(a.area) >= 25 ? 'warn' : 'stop'}">${prog(a.area)} %</span></div>
              <ul class="small">${p.acciones.filter((x) => x.area === a.area).map((x) => `<li>${esc(x.accion)} <span class="muted">· ${esc(x.responsable)} · ${esc(x.estado)}</span></li>`).join('')}</ul></div>`).join('')}</div>`).join('')}</div><p class="small" id="plMsg"></p></div>
        <div class="glass pad mt" id="plO"></div><div class="glass pad mt" id="plA"></div><div class="glass pad mt" id="plX"></div>`;

      const bind = (id, fn) => { $(id, host).onchange = (e) => { fn(e.target.value); S.save(); }; };
      bind('#plM', (v) => { p.mision = v; }); bind('#plV', (v) => { p.vision = v; }); bind('#plP', (v) => { p.propuesta = v; });
      S.etable($('#plVal', host), { rows: p.valores, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ valor: '', conducta: '', ambito: 'clientes', peso: 3 }),
        cols: [{ k: 'valor', l: 'Valor', type: 'text' }, { k: 'conducta', l: 'Qué significa en la práctica', type: 'text' }, { k: 'ambito', l: 'Ámbito', type: 'select', opts: Object.keys(AMBITOS).map((k) => ({ v: k, l: AMBITOS[k] })) }, { k: 'peso', l: 'Peso 1-5', type: 'num' }] });
      // DAFO
      $$('[data-dt]', host).forEach((inp) => inp.onchange = () => { const [k, i] = inp.dataset.dt.split(':'); p.dafoItems[k][+i].t = inp.value; S.save(); });
      $$('[data-di]', host).forEach((sel) => sel.onchange = () => { const [k, i] = sel.dataset.di.split(':'); p.dafoItems[k][+i].i = +sel.value; S.save(); S.rerender(); });
      $$('[data-dx]', host).forEach((b) => b.onclick = () => { const [k, i] = b.dataset.dx.split(':'); p.dafoItems[k].splice(+i, 1); S.save(); S.rerender(); });
      const addItem = (k) => { const inp = $(`[data-dnew="${k}"]`, host); const t = inp.value.trim(); if (!t) return; p.dafoItems[k].push({ t, i: 3 }); S.save(); S.rerender(); };
      $$('[data-dadd]', host).forEach((b) => b.onclick = () => addItem(b.dataset.dadd));
      $$('[data-dnew]', host).forEach((inp) => inp.onkeydown = (e) => { if (e.key === 'Enter') addItem(inp.dataset.dnew); });
      $$('[data-sug]', host).forEach((b) => b.onclick = () => { const [k, i] = b.dataset.sug.split(':'); const x = sug[k][+i]; p.dafoItems[k].push({ t: x.t, i: x.i }); S.save(); S.rerender(); });
      // CAME
      $$('[data-cadd]', host).forEach((b) => b.onclick = () => { const c = CRUCES.find((x) => x.k === b.dataset.ck); p.came.push({ cruce: c.k, tipo: c.tipo, accion: b.dataset.cadd, area: '', impacto: +b.dataset.ci || 3, encaje: {} }); S.save(); S.rerender(); });
      if (p.came.length) S.etable($('#plCame', host), { titulo: 'Acciones estratégicas (CAME)', rows: p.came, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ cruce: 'FO', tipo: 'Explotar', accion: '', area: '', impacto: 3, encaje: {} }),
        cols: [{ k: 'tipo', l: 'Tipo', type: 'select', opts: ['Corregir', 'Afrontar', 'Mantener', 'Explotar'] }, { k: 'accion', l: 'Acción', type: 'text' }, { k: 'area', l: 'Área responsable', type: 'text' }, { k: 'impacto', l: 'Impacto 1-5', type: 'num' },
          { k: 'enc', l: 'Encaje con valores', calc: (r) => { const e = encaje(r); return `${e.sc > 0 ? '+' : ''}${e.sc}`; } }] });
      $$('[data-enc]', host).forEach((sel) => sel.onchange = () => { const [i, j] = sel.dataset.enc.split(':').map(Number); const x = p.came[i]; x.encaje = x.encaje || {}; x.encaje[j] = +sel.value; S.save(); S.rerender(); });
      $$('[data-toplan]', host).forEach((b) => b.onclick = () => {
        const x = p.came[+b.dataset.toplan]; const area = x.area || 'Dirección';
        p.acciones.push({ area, accion: x.accion, responsable: '', inicio: '', fin: '', estado: 'Pendiente' }); x.enPlan = true;
        if (!p.areas.some((a) => a.area === area)) p.areas.push({ macro: p.objetivos[0] ? p.objetivos[0].id : '', area, objetivo: `Estrategia ${x.tipo.toLowerCase()}`, kpi: '', actual: 0, meta: 0 });
        S.save(); S.rerender();
      });
      $('#plFind', host).onclick = () => {
        const Fi = S.allFindings(); let n = 0;
        Fi.forEach((f) => { if (!p.acciones.some((a) => a.accion === f.accion)) { p.acciones.push({ area: f.area, accion: f.accion, responsable: '', inicio: '', fin: new Date(Date.now() + (f.plazo || 90) * 864e5).toISOString().slice(0, 10), estado: 'Pendiente' }); n++; } if (!p.areas.some((a) => a.area === f.area)) p.areas.push({ macro: p.objetivos[0] ? p.objetivos[0].id : '', area: f.area, objetivo: 'Capturar las mejoras identificadas', kpi: 'Impacto anual (€)', actual: 0, meta: Math.round(f.impactoEUR || 0) }); });
        S.save(); S.rerender(); $('#plMsg').textContent = n + ' acciones añadidas desde los hallazgos.';
      };
      S.etable($('#plO', host), { titulo: 'Objetivos generales (macro)', rows: p.objetivos, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ id: 'o' + Date.now().toString(36), nombre: '', indicador: '', actual: 0, meta: 0, fecha: '' }), cols: [{ k: 'nombre', l: 'Objetivo', type: 'text' }, { k: 'indicador', l: 'Indicador', type: 'text' }, { k: 'actual', l: 'Actual', type: 'num' }, { k: 'meta', l: 'Meta', type: 'num' }, { k: 'fecha', l: 'Fecha', type: 'date' }] });
      S.etable($('#plA', host), { titulo: 'Objetivos de área', rows: p.areas, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ macro: p.objetivos[0] ? p.objetivos[0].id : '', area: '', objetivo: '', kpi: '', actual: 0, meta: 0 }), cols: [{ k: 'macro', l: 'Contribuye a', type: 'select', opts: p.objetivos.map((o) => ({ v: o.id, l: o.nombre })) }, { k: 'area', l: 'Área', type: 'text' }, { k: 'objetivo', l: 'Objetivo', type: 'text' }, { k: 'kpi', l: 'Indicador', type: 'text' }, { k: 'actual', l: 'Actual', type: 'num' }, { k: 'meta', l: 'Meta', type: 'num' }] });
      S.etable($('#plX', host), { titulo: 'Acciones', rows: p.acciones, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ area: p.areas[0] ? p.areas[0].area : '', accion: '', responsable: '', inicio: '', fin: '', estado: 'Pendiente' }), cols: [{ k: 'area', l: 'Área', type: 'text' }, { k: 'accion', l: 'Acción', type: 'text' }, { k: 'responsable', l: 'Responsable', type: 'text' }, { k: 'inicio', l: 'Inicio', type: 'date' }, { k: 'fin', l: 'Fin', type: 'date' }, { k: 'estado', l: 'Estado', type: 'select', opts: ['Pendiente', 'En marcha', 'Hecha', 'Bloqueada'] }] });
    },
    kpis() {
      const p = PL(), a = p.acciones, out = [];
      if (a.length) out.push({ k: 'Acciones del plan hechas', v: Math.round(a.filter((x) => x.estado === 'Hecha').length / a.length * 100) + ' %', st: a.some((x) => x.estado === 'Bloqueada') ? 'warn' : 'ok' });
      const ch = p.came.filter((x) => encaje(x).choques.length);
      if (p.came.length) out.push({ k: 'Acciones que chocan con los valores', v: ch.length, st: ch.length ? 'warn' : 'ok' });
      return out;
    },
    findings() { return []; }
  });

  /* Sección del informe de auditoría */
  S.planReportHTML = function () {
    const p = PL();
    const li = (l) => l.map((x) => `<li>${esc(x.t)} <span style="color:#888">(impacto ${x.i})</span></li>`).join('');
    return `<h2>Estrategia: valores, DAFO y CAME</h2>
      <p><b>Misión.</b> ${esc(p.mision)}<br><b>Visión.</b> ${esc(p.vision)}<br><b>Propuesta de valor.</b> ${esc(p.propuesta)}</p>
      ${p.valores.length ? `<table><thead><tr><th style="text-align:left">Valor</th><th style="text-align:left">Conducta</th><th>Peso</th></tr></thead><tbody>${p.valores.map((v) => `<tr><td style="text-align:left">${esc(v.valor)}</td><td style="text-align:left;white-space:normal">${esc(v.conducta)}</td><td>${v.peso}</td></tr>`).join('')}</tbody></table>` : ''}
      <table><tbody><tr><td style="text-align:left;vertical-align:top;white-space:normal"><b>Debilidades</b><ul>${li(p.dafoItems.d)}</ul></td><td style="text-align:left;vertical-align:top;white-space:normal"><b>Amenazas</b><ul>${li(p.dafoItems.a)}</ul></td></tr>
      <tr><td style="text-align:left;vertical-align:top;white-space:normal"><b>Fortalezas</b><ul>${li(p.dafoItems.f)}</ul></td><td style="text-align:left;vertical-align:top;white-space:normal"><b>Oportunidades</b><ul>${li(p.dafoItems.o)}</ul></td></tr></tbody></table>
      ${p.came.length ? `<table><thead><tr><th>Tipo</th><th style="text-align:left">Acción</th><th>Impacto</th><th>Encaje con valores</th></tr></thead><tbody>${p.came.map((x) => { const e = encaje(x); return `<tr><td>${esc(x.tipo)}</td><td style="text-align:left;white-space:normal">${esc(x.accion)}</td><td>${x.impacto}</td><td>${e.sc}${e.choques.length ? ' · choca con ' + esc(e.choques.join(', ')) : ''}</td></tr>`; }).join('')}</tbody></table>` : '<p>Sin acciones CAME definidas todavía.</p>'}`;
  };
})();
