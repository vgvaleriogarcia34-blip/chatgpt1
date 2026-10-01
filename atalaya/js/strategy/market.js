/* Atalaya · Sistema estratégico · Mercado y riesgos 360, plan de empresa e informe de auditoría */
(function () {
  const A = window.Atalaya, F = A.fmt, S = A.strat;
  const { $, $$, esc, css } = S;
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  /* =========================================================
     Mercado y riesgos 360
     ========================================================= */
  const FUENTES = [
    ['INE · Instituto Nacional de Estadística', 'https://www.ine.es'], ['Banco de España', 'https://www.bde.es'], ['Banco Central Europeo', 'https://www.ecb.europa.eu'],
    ['Eurostat', 'https://ec.europa.eu/eurostat'], ['Fondo Monetario Internacional', 'https://www.imf.org'], ['OCDE', 'https://www.oecd.org'],
    ['Ministerio de Economía', 'https://economia.gob.es'], ['AIReF', 'https://www.airef.es'], ['CNMC', 'https://www.cnmc.es'], ['ICEX', 'https://www.icex.es']
  ];
  const PALANCAS = { ventas: 'Demanda y ventas', tipos: 'Tipos de interés y financiación', costes: 'Costes y precios de compra', cobros: 'Cobros y morosidad', personas: 'Empleo y salarios' };
  S.defaults.mercado = {
    perfil: { actividad: '', region: 'España', productos: '', clientes: '' },
    analisis: null,
    indicadores: [
      { ambito: 'España', indicador: 'Crecimiento del PIB', valor: '', tendencia: 'estable', impacto: 'neutro', palanca: 'ventas', fuente: 'INE / Banco de España', fecha: '' },
      { ambito: 'Zona euro', indicador: 'Tipo de interés del BCE y Euríbor', valor: '', tendencia: 'estable', impacto: 'neutro', palanca: 'tipos', fuente: 'BCE / Banco de España', fecha: '' },
      { ambito: 'España', indicador: 'Inflación (IPC)', valor: '', tendencia: 'estable', impacto: 'neutro', palanca: 'costes', fuente: 'INE', fecha: '' },
      { ambito: 'España', indicador: 'Tasa de paro', valor: '', tendencia: 'estable', impacto: 'neutro', palanca: 'personas', fuente: 'INE (EPA)', fecha: '' },
      { ambito: 'Sector', indicador: 'Índice de cifra de negocios del sector', valor: '', tendencia: 'estable', impacto: 'neutro', palanca: 'ventas', fuente: 'INE', fecha: '' }
    ],
    targets: [{ target: 'Distribuidores', peso: 45, ciclo: 3, riesgo: 3 }, { target: 'Industria cliente final', peso: 35, ciclo: 4, riesgo: 3 }, { target: 'Exportación', peso: 20, ciclo: 3, riesgo: 4 }],
    tipologias: [{ tipologia: 'Producto estándar', peso: 50, ciclo: 4, riesgo: 3 }, { tipologia: 'Producto premium', peso: 25, ciclo: 2, riesgo: 2 }, { tipologia: 'Recambios y servicio', peso: 25, ciclo: 1, riesgo: 1 }],
    competidores: [{ nombre: '', posicion: 'líder', amenaza: 3 }]
  };
  /* Datos de referencia macro 2026, recogidos de fuentes oficiales y prensa económica (consulta del 1 de octubre de 2026).
     Sirven de punto de partida sin el agente; conviene revisarlos cuando se publiquen datos nuevos. */
  S.MACRO_2026 = {
    fecha: '2026-10-01',
    resumen: 'La economía española sigue creciendo por encima de la zona euro (en torno al 2,2 % en 2026), pero el shock energético ligado al conflicto en Oriente Medio y el estrecho de Ormuz ha devuelto la inflación a cerca del 5 % y el BCE ha subido tipos dos veces en el año. Para una pyme esto significa: la demanda aguanta, pero los costes (energía, compras, salarios) y la financiación se encarecen. El empleo sigue mejorando, lo que también hace más difícil y caro contratar.',
    indicadores: [
      { ambito: 'Global', indicador: 'Crecimiento mundial (PIB)', valor: '3,0 % en 2026 · 3,4 % en 2027', tendencia: 'estable', impacto: 'neutro', palanca: 'ventas', fuente: 'FMI · Perspectivas de la economía mundial, julio 2026', fecha: 'jul 2026', url: 'https://www.imf.org/en/publications/weo/issues/2026/07/08/world-economic-outlook-update-july-2026' },
      { ambito: 'Global', indicador: 'Inflación mundial', valor: '4,7 % en 2026 · 3,9 % en 2027 (shock energético)', tendencia: 'sube', impacto: 'negativo', palanca: 'costes', fuente: 'FMI · julio 2026', fecha: 'jul 2026', url: 'https://www.imf.org/en/publications/weo/issues/2026/07/08/world-economic-outlook-update-july-2026' },
      { ambito: 'Zona euro', indicador: 'Tipo de interés del BCE (facilidad de depósito)', valor: '2,50 % (+0,25 el 10 sep 2026; refinanciación 2,65 %)', tendencia: 'sube', impacto: 'negativo', palanca: 'tipos', fuente: 'BCE', fecha: '10 sep 2026', url: 'https://www.raisin.com/es-es/noticias/el-bce-sube-tipos-y-situa-el-tipo-de-interes-de-la-facilidad-de-deposito-en-el-2-50/' },
      { ambito: 'Zona euro', indicador: 'Euríbor a 12 meses', valor: '3,251 % (media de septiembre; 2,954 % en agosto; 2,172 % hace un año)', tendencia: 'sube', impacto: 'negativo', palanca: 'tipos', fuente: 'Banco de España', fecha: 'sep 2026', url: 'https://www.euribor.com.es/2026/09/26/euribor-de-septiembre-2026-el-banco-de-espana-certifica-el-3251-y-marca-el-mes-mas-caro-del-ano-para-las-hipotecas-variables/' },
      { ambito: 'España', indicador: 'Crecimiento del PIB', valor: '2,2 % previsto para 2026', tendencia: 'estable', impacto: 'positivo', palanca: 'ventas', fuente: 'Banco de España · proyecciones', fecha: 'sep 2026', url: 'https://www.servimedia.es/noticias/banco-espana-dispara-nueve-decimas-proyecciones-inflacion-mejora-una-decima-pib-2026/1412806089' },
      { ambito: 'España', indicador: 'Inflación (IPC)', valor: '4,9 % interanual en septiembre (avance); subyacente 3,1 %', tendencia: 'sube', impacto: 'negativo', palanca: 'costes', fuente: 'INE · IPC indicador adelantado', fecha: '29 sep 2026', url: 'https://www.ine.es/dyngs/Prensa/adIPC0926.htm' },
      { ambito: 'España', indicador: 'Previsión de inflación media 2026', valor: '3,6 %', tendencia: 'sube', impacto: 'negativo', palanca: 'costes', fuente: 'Banco de España · proyecciones', fecha: 'sep 2026', url: 'https://www.cronista.com/espana/economia-finanzas/alerta-inflacion-el-banco-de-espana-mantiene-el-crecimiento-economico-pero-eleva-la-subida-de-precios-hasta-el-36-en-2026/' },
      { ambito: 'España', indicador: 'Tasa de paro (EPA)', valor: '9,87 % en el 2.º trimestre; +486.000 ocupados en un año', tendencia: 'baja', impacto: 'negativo', palanca: 'personas', fuente: 'INE · EPA 2T 2026', fecha: 'jul 2026', url: 'https://www.ine.es/dyngs/Prensa/EPA2T26.htm' }
    ],
    ajustesEscenario: { ventasF: 0.95, tipoDelta: 0.75, margenDelta: -1.5, dsoDelta: 5, justificacion: 'Euríbor +1,1 puntos en un año y BCE subiendo; inflación cercana al 5 % que presiona compras y salarios; demanda que sigue creciendo pero con más cautela de los clientes.' },
    implicaciones: [
      { plan: 'Financiero', accion: 'Pedir ofertas a tipo fijo o con cobertura para la financiación nueva; con el Euríbor en el 3,25 % y subiendo, cada punto encarece la cuota.', prioridad: 'alta' },
      { plan: 'Compras', accion: 'Cerrar precios a plazo con los proveedores A de materiales y energía; revisar cláusulas de revisión de precios.', prioridad: 'alta' },
      { plan: 'Comercial', accion: 'Trasladar la inflación a tarifas de forma escalonada, empezando por los clientes de margen bajo (ABC′ = C).', prioridad: 'alta' },
      { plan: 'Personas', accion: 'Presupuestar revisiones salariales cercanas a la inflación y reforzar la retención: con el paro bajando cuesta más contratar.', prioridad: 'media' },
      { plan: 'Tesorería', accion: 'Vigilar los días de cobro: con tipos altos los clientes tienden a pagar más tarde. Revisar el límite de la póliza.', prioridad: 'media' }
    ],
    sector: {
      industria: 'Industria: la energía y las materias primas son el principal riesgo; revisa contratos de suministro eléctrico y gas.',
      distribucion: 'Distribución: margen estrecho ante la inflación de compras; traslada precios rápido y vigila el stock.',
      hosteleria: 'Hostelería: costes de energía y alimentos al alza y dificultad para contratar; la demanda turística sigue fuerte.',
      retail: 'Retail: el consumidor nota la inflación; cuida el precio de entrada y la rotación del stock.',
      construccion: 'Construcción: tipos más altos frenan la demanda financiada y encarecen la obra; revisa fórmulas de revisión de precios.',
      servicios: 'Servicios profesionales: el riesgo principal es el coste salarial; ajusta tarifas y tiempo facturable.',
      tecnologia: 'Tecnología: la demanda de IA impulsa la inversión; el coste de financiación pesa en las empresas con caja negativa.',
      agro: 'Agroalimentario: energía, fertilizantes y transporte encarecen la producción; cubre precios con contratos.',
      salud: 'Salud: demanda estable; vigila salarios del personal sanitario y coste de suministros.',
      logistica: 'Logística: el combustible y los tipos (flota financiada) son los dos riesgos principales; incluye cláusulas de gasóleo.'
    }
  };
  const M = () => S.state.mercado;
  function marketRisks() {
    const m = M(), R = [];
    m.indicadores.filter((i) => i.impacto === 'negativo').forEach((i) => R.push(S.mkRisk(`${i.indicador} (${i.ambito})${i.valor ? ': ' + i.valor : ''}`, i.tendencia === 'empeora' || i.tendencia === 'sube' && i.palanca !== 'ventas' ? 4 : 3, i.palanca === 'ventas' ? 4 : 3, `${PALANCAS[i.palanca] || ''}: ${implicacion(i).accion}`, 'Macro')));
    m.targets.filter((t) => S.num(t.riesgo) >= 4).forEach((t) => R.push(S.mkRisk(`Riesgo en el segmento ${t.target} (${t.peso} % de la venta)`, S.num(t.riesgo), Math.min(5, Math.ceil(S.num(t.peso) / 20) + 1), 'Diversificar y vigilar morosidad y pedidos de este segmento.', 'Cliente')));
    m.tipologias.filter((t) => S.num(t.riesgo) >= 4).forEach((t) => R.push(S.mkRisk(`Riesgo en ${t.tipologia}`, S.num(t.riesgo), Math.min(5, Math.ceil(S.num(t.peso) / 20) + 1), 'Revisar posicionamiento y precio frente a la competencia.', 'Producto')));
    (m.competidores || []).filter((c) => c.nombre && S.num(c.amenaza) >= 4).forEach((c) => R.push(S.mkRisk(`Presión competitiva de ${c.nombre}`, 3, S.num(c.amenaza), 'Diferenciar propuesta en los clientes A y vigilar precios.', 'Competencia')));
    if (m.analisis && Array.isArray(m.analisis.sector && m.analisis.sector.riesgos)) m.analisis.sector.riesgos.slice(0, 4).forEach((r) => R.push(S.mkRisk(String(r).slice(0, 120), 3, 3, 'Riesgo sectorial identificado por el agente.', 'Sector')));
    return R;
  }
  function implicacion(i) {
    const neg = i.impacto === 'negativo';
    const map = {
      ventas: neg ? { plan: 'Comercial', accion: 'proteger a los clientes A, revisar el presupuesto de ventas y no anticipar contrataciones' } : { plan: 'Comercial', accion: 'acelerar el pipeline y la expansión' },
      tipos: neg ? { plan: 'Financiero', accion: 'fijar el tipo de los préstamos nuevos o cubrirlo, y alargar plazos' } : { plan: 'Financiero', accion: 'refinanciar deuda cara' },
      costes: neg ? { plan: 'Compras', accion: 'cerrar precios a plazo con proveedores apalancados y revisar tarifas de venta' } : { plan: 'Compras', accion: 'renegociar a la baja' },
      cobros: neg ? { plan: 'Financiero', accion: 'endurecer límites de crédito y preparar factoring' } : { plan: 'Financiero', accion: 'mantener política de cobro' },
      personas: neg ? { plan: 'Personas', accion: 'plan de retención y revisión salarial selectiva' } : { plan: 'Personas', accion: 'aprovechar para incorporar talento' }
    };
    return map[i.palanca] || { plan: 'General', accion: 'vigilar' };
  }
  S.register({
    id: 'mercado', nombre: 'Mercado y riesgos', grupo: 'Estrategia',
    render(host) {
      const m = M(), an = m.analisis;
      const R = S.allRisks();
      const scen = an && an.ajustesEscenario ? an.ajustesEscenario : null;
      host.innerHTML = `${S.section('Mercado y riesgos 360', 'Contexto macroeconómico global y nacional, situación del sector y competencia, y riesgos por tipo de cliente y de producto. Un agente consulta fuentes oficiales y traslada lo que encuentra a los planes de cada área y a los escenarios del simulador.')}
        <div class="grid cols-2">
          <div class="glass pad stack"><h4>Perfil para el análisis</h4>
            <div class="lever-grid">${[['actividad', 'Actividad concreta'], ['region', 'Ámbito geográfico'], ['productos', 'Tipologías de producto'], ['clientes', 'Tipos de cliente']].map(([k, n]) => `<label class="small">${n}<input class="input" id="mp_${k}" value="${esc(m.perfil[k] || '')}" placeholder="${k === 'actividad' ? A.SECTORS[S.sim.sector].nombre : ''}"></label>`).join('')}</div>
            <div class="row"><button class="btn solid" id="mkRef">Cargar datos macro 2026</button><button class="btn" id="mkAgent">Actualizar con el agente</button><span class="small muted" id="mkMsg">${an ? (an.origen === 'referencia' ? 'Datos de referencia del ' : 'Último análisis: ') + new Date(an.fecha).toLocaleDateString('es-ES') : 'Sin análisis todavía. Pulsa «Cargar datos macro 2026» para partir de los últimos datos oficiales.'}</span></div>
            <p class="small muted" id="mkMode"></p></div>
          <div class="glass pad stack"><h4>Fuentes oficiales</h4><p class="small">El agente consulta prioritariamente estas fuentes y cita fecha y origen de cada dato. También puedes consultarlas tú y anotar los valores en la tabla de indicadores.</p><div class="chips">${FUENTES.map(([n, u]) => `<a class="vchip static" href="${u}" target="_blank" rel="noopener">${n}</a>`).join('')}</div></div>
        </div>
        ${an ? `<div class="glass pad mt stack"><h4>${an.origen === 'referencia' ? 'Datos de referencia 2026 · consulta del ' + new Date(an.fecha).toLocaleDateString('es-ES') : 'Resumen del agente'}</h4><p>${esc(an.resumen || '')}</p>
          ${an.sector ? `<div class="grid cols-3"><div><h4>Sector</h4><p class="small">${esc(an.sector.situacion || '')} ${an.sector.crecimiento ? '· ' + esc(an.sector.crecimiento) : ''}</p><ul class="small">${(an.sector.tendencias || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div><h4>Riesgos</h4><ul class="small">${(an.sector.riesgos || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div><h4>Oportunidades</h4><ul class="small">${(an.sector.oportunidades || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}
          ${(an.implicaciones || []).length ? `<h4>Cómo afecta a tus planes</h4><div class="table-wrap"><table><thead><tr><th>Plan</th><th style="text-align:left">Acción</th><th>Prioridad</th></tr></thead><tbody>${an.implicaciones.map((x) => `<tr><td>${esc(x.plan)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(x.accion)}</td><td>${esc(x.prioridad || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
          ${(an.fuentes || []).length ? `<p class="small muted">Fuentes: ${an.fuentes.filter((f, i, arr) => arr.findIndex((x) => x.url === f.url) === i).map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.fuente)}</a>`).join(' · ')}</p>` : ''}
          ${scen ? `<div class="row"><span class="small">Ajuste sugerido de escenario: ${scen.ventasF ? 'venta nueva × ' + scen.ventasF + ' · ' : ''}${scen.tipoDelta ? 'tipos ' + scen.tipoDelta + ' pp · ' : ''}${scen.margenDelta ? 'margen ' + scen.margenDelta + ' pp · ' : ''}${scen.dsoDelta ? 'cobros ' + scen.dsoDelta + ' días' : ''} <span class="muted">${esc(scen.justificacion || '')}</span></span><button class="btn" id="mkApply">Aplicar al escenario «Hipótesis»</button></div>` : ''}</div>` : ''}
        <div class="glass pad mt" id="mkInd"></div>
        <div class="grid cols-2 mt"><div class="glass pad" id="mkTg"></div><div class="glass pad" id="mkTp"></div></div>
        <div class="glass pad mt" id="mkComp"></div>
        <div class="glass pad mt stack"><h4>Implicaciones sobre los planes</h4><div class="table-wrap"><table><thead><tr><th style="text-align:left">Señal</th><th>Plan</th><th style="text-align:left">Qué hacer</th></tr></thead><tbody>${m.indicadores.filter((i) => i.impacto !== 'neutro').map((i) => { const x = implicacion(i); return `<tr><td style="text-align:left;font-family:var(--font-body)">${esc(i.indicador)} · ${i.impacto === 'negativo' ? 'desfavorable' : 'favorable'}</td><td>${x.plan}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${x.accion}</td></tr>`; }).join('') || '<tr><td colspan="3" class="muted">Marca el impacto de cada indicador para ver sus implicaciones.</td></tr>'}</tbody></table></div></div>
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Matriz de riesgos de la empresa</h4><div class="chart" id="mkMatrix"></div></div><div class="glass pad stack"><h4>Riesgos priorizados</h4>${S.riskBlock(R.slice(0, 10))}</div></div>`;
      ['actividad', 'region', 'productos', 'clientes'].forEach((k) => { $('#mp_' + k, host).onchange = (e) => { m.perfil[k] = e.target.value; S.save(); }; });
      A.charts.riskMatrix($('#mkMatrix', host), R.slice(0, 14), () => {});
      // Agente
      (async () => {
        await A.platform.ready;
        const srv = A.platform.mode === 'server' && A.platform.serverInfo && A.platform.serverInfo.ia;
        $('#mkMode', host).textContent = srv ? 'El agente buscará en fuentes oficiales y citará cada dato.' : 'El agente necesita el servidor de Atalaya con la API de Claude configurada. Mientras tanto, completa los indicadores a mano con las fuentes oficiales.';
        if (!srv) $('#mkAgent', host).disabled = true;
      })();
      $('#mkAgent', host).onclick = async () => {
        const b = $('#mkAgent', host); b.disabled = true; $('#mkMsg', host).textContent = 'Consultando fuentes oficiales… puede tardar uno o dos minutos.';
        try {
          const e = S.sim.empresa;
          const r = await A.platform.api('/mercado/actualizar', { method: 'POST', body: JSON.stringify({ sector: A.SECTORS[S.sim.sector].nombre, actividad: m.perfil.actividad, region: m.perfil.region, productos: m.perfil.productos || m.tipologias.map((t) => t.tipologia).join(', '), clientes: m.perfil.clientes || m.targets.map((t) => t.target).join(', '), ventas: e.ventas }) });
          m.analisis = r.analisis;
          const ind = [].concat((r.analisis.macroGlobal || []).map((x) => Object.assign({ ambito: 'Global' }, x)), (r.analisis.macroEspana || []).map((x) => Object.assign({ ambito: 'España' }, x)));
          if (ind.length) m.indicadores = ind.map((x) => ({ ambito: x.ambito, indicador: x.indicador, valor: x.valor, tendencia: x.tendencia || 'estable', impacto: /negativ|riesgo|desfavor|presi/i.test(x.impacto || '') ? 'negativo' : /positiv|favor|oportun/i.test(x.impacto || '') ? 'positivo' : 'neutro', palanca: /tipo|eur[ií]bor|bce|interes/i.test(x.indicador) ? 'tipos' : /ipc|inflaci|precio|energ|materia/i.test(x.indicador) ? 'costes' : /paro|empleo|salari/i.test(x.indicador) ? 'personas' : /moros|impag/i.test(x.indicador) ? 'cobros' : 'ventas', fuente: x.fuente || '', fecha: x.fecha || '', url: x.url || '' }));
          if (Array.isArray(r.analisis.competencia) && r.analisis.competencia.length) m.competidores = r.analisis.competencia.map((c) => ({ nombre: c.nombre, posicion: c.posicion || '', amenaza: +c.amenaza || 3 }));
          if (Array.isArray(r.analisis.porCliente) && r.analisis.porCliente.length) m.targets = r.analisis.porCliente.map((c) => ({ target: c.target, peso: (m.targets.find((t) => t.target === c.target) || {}).peso || 0, ciclo: 3, riesgo: +c.nivel || 3 }));
          if (Array.isArray(r.analisis.porProducto) && r.analisis.porProducto.length) m.tipologias = r.analisis.porProducto.map((c) => ({ tipologia: c.tipologia, peso: (m.tipologias.find((t) => t.tipologia === c.tipologia) || {}).peso || 0, ciclo: 3, riesgo: +c.nivel || 3 }));
          S.save(); S.rerender();
        } catch (e) { $('#mkMsg', host).textContent = e.message; b.disabled = false; }
      };
      $('#mkRef', host).onclick = () => {
        const R = S.MACRO_2026;
        const propios = m.indicadores.filter((i) => i.ambito === 'Sector' || i.ambito === 'Región').filter((i) => i.valor);
        m.indicadores = A.clone(R.indicadores).concat(propios);
        m.analisis = { fecha: new Date(R.fecha).toISOString(), origen: 'referencia', resumen: R.resumen + ' ' + (R.sector[S.sim.sector] || ''), implicaciones: R.implicaciones, ajustesEscenario: R.ajustesEscenario, fuentes: R.indicadores.map((i) => ({ fuente: i.fuente, url: i.url })) };
        S.save(); S.rerender();
      };
      const ap = $('#mkApply', host);
      if (ap) ap.onclick = () => { const c = S.sim.custom; if (scen.ventasF) c.ventasF = +scen.ventasF; if (scen.tipoDelta) c.tipoDelta = +scen.tipoDelta; if (scen.margenDelta) c.margenDelta = +scen.margenDelta; if (scen.dsoDelta) c.dsoDelta = +scen.dsoDelta; S.saveSim(); ap.textContent = 'Aplicado: ábrelo en el simulador'; };
      S.etable($('#mkInd', host), { titulo: 'Indicadores macro y sectoriales', rows: m.indicadores, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ ambito: 'España', indicador: '', valor: '', tendencia: 'estable', impacto: 'neutro', palanca: 'ventas', fuente: '', fecha: '' }),
        cols: [{ k: 'ambito', l: 'Ámbito', type: 'select', opts: ['Global', 'Zona euro', 'España', 'Región', 'Sector'] }, { k: 'indicador', l: 'Indicador', type: 'text' }, { k: 'valor', l: 'Valor', type: 'text' }, { k: 'tendencia', l: 'Tendencia', type: 'select', opts: ['sube', 'baja', 'estable', 'empeora', 'mejora'] }, { k: 'impacto', l: 'Impacto para ti', type: 'select', opts: ['negativo', 'neutro', 'positivo'] }, { k: 'palanca', l: 'Afecta a', type: 'select', opts: Object.keys(PALANCAS).map((k) => ({ v: k, l: PALANCAS[k] })) }, { k: 'fuente', l: 'Fuente', type: 'text' }, { k: 'fecha', l: 'Fecha del dato', type: 'text' }] });
      S.etable($('#mkTg', host), { titulo: 'Riesgo por tipo de cliente', rows: m.targets, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ target: '', peso: 0, ciclo: 3, riesgo: 3 }), cols: [{ k: 'target', l: 'Tipo de cliente', type: 'text' }, { k: 'peso', l: '% ventas', type: 'num' }, { k: 'ciclo', l: 'Sensibilidad al ciclo 1-5', type: 'num' }, { k: 'riesgo', l: 'Riesgo 1-5', type: 'num' }] });
      S.etable($('#mkTp', host), { titulo: 'Riesgo por tipología de producto', rows: m.tipologias, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ tipologia: '', peso: 0, ciclo: 3, riesgo: 3 }), cols: [{ k: 'tipologia', l: 'Tipología', type: 'text' }, { k: 'peso', l: '% ventas', type: 'num' }, { k: 'ciclo', l: 'Sensibilidad al ciclo 1-5', type: 'num' }, { k: 'riesgo', l: 'Riesgo 1-5', type: 'num' }] });
      S.etable($('#mkComp', host), { titulo: 'Competencia principal', rows: m.competidores, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ nombre: '', posicion: 'retador', amenaza: 3 }), cols: [{ k: 'nombre', l: 'Competidor', type: 'text' }, { k: 'posicion', l: 'Posición', type: 'select', opts: ['líder', 'retador', 'nicho', 'nuevo entrante'] }, { k: 'amenaza', l: 'Amenaza 1-5', type: 'num' }] });
    },
    kpis() { const R = marketRisks(); const ciclo = M().targets.reduce((a, t) => a + S.num(t.peso) * S.num(t.ciclo), 0) / Math.max(1, M().targets.reduce((a, t) => a + S.num(t.peso), 0)); return [{ k: 'Señales de mercado adversas', v: M().indicadores.filter((i) => i.impacto === 'negativo').length, st: M().indicadores.filter((i) => i.impacto === 'negativo').length >= 3 ? 'warn' : 'ok' }, { k: 'Sensibilidad al ciclo', v: ciclo.toFixed(1).replace('.', ',') + '/5', st: ciclo >= 4 ? 'warn' : 'ok' }, { k: 'Riesgos externos', v: R.length }]; },
    risks: marketRisks
  });

  const PL = () => S.state.plan;

  /* =========================================================
     Informe de auditoría completo
     ========================================================= */
  S.register({
    id: 'auditoria', nombre: 'Informe de auditoría', grupo: 'Visión',
    render(host) {
      host.innerHTML = `${S.section('Informe de auditoría', 'Un informe completo con el diagnóstico 360 de todas las áreas, la auditoría del dinero, los impuestos, la tesorería, el mercado y los riesgos, y dos planes de trabajo: de los objetivos generales a las acciones (macro → micro) y de los hallazgos concretos a su impacto en la cuenta de resultados (micro → macro).')}
        <div class="glass pad stack"><div class="row"><button class="btn solid" id="auGen">Generar el informe</button><button class="btn ghost" id="auCopy">Copiar texto</button></div><p class="small muted">El informe usa los datos de todos los módulos y del simulador. Cuanto más completos, más preciso.</p></div>`;
      $('#auGen', host).onclick = openReport;
      $('#auCopy', host).onclick = () => { const t = reportText(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { $('#auCopy', host).textContent = 'Copiado'; }, () => { const ta = document.createElement('textarea'); ta.value = t; host.appendChild(ta); ta.select(); }); };
    }
  });
  function reportData() {
    const K = S.allKpis(), R = S.allRisks(), Fi = S.allFindings().sort((a, b) => (b.impactoEUR || 0) - (a.impactoEUR || 0));
    const areas = Array.from(new Set(K.map((k) => k.area)));
    const sc = (l) => { const s = l.filter((x) => x.st); return s.length ? Math.round(s.reduce((a, x) => a + (x.st === 'ok' ? 100 : x.st === 'warn' ? 55 : 15), 0) / s.length) : null; };
    const r = S.analysis(), p = PL();
    const ebitda = S.baseYear().ebitda;
    const imp = {}; Fi.forEach((f) => { imp[f.area] = (imp[f.area] || 0) + (f.impactoEUR || 0); });
    const totImp = Object.values(imp).reduce((a, b) => a + b, 0);
    return { K, R, Fi, areas, sc, r, p, ebitda, imp, totImp, global: sc(K) };
  }
  function reportHTML() {
    const d = reportData(), e = S.sim.empresa;
    const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const pill = (st, t) => `<span class="pill p-${st}">${t}</span>`;
    const stOf = (v) => (v === null ? 'warn' : v >= 70 ? 'ok' : v >= 50 ? 'warn' : 'stop');
    const mf = A.fin.moneyFlow(S.sim.historico), tc = S.taxCalc(), cw = S.cashWeeks(), b = S.budget();
    const plazos = [30, 90, 180, 365];
    let h = `<div class="kicker">Informe de auditoría estratégica · ${date}</div><h1>${esc(S.sim.empresaNombre)}</h1>
      <p>${A.SECTORS[S.sim.sector].nombre} · ventas ${F.eur(e.ventas)} · ${e.plantilla} personas</p>
      <div class="verdict"><div class="kicker">Salud global</div><h3 style="margin-top:6px;font-size:1.5rem">${d.global === null ? '—' : d.global + '/100'} ${pill(stOf(d.global), d.global >= 70 ? 'Sólida' : d.global >= 50 ? 'Con tensiones' : 'Frágil')}</h3>
      <p>${d.R.filter((x) => x.estado === 'stop').length} riesgos altos, ${d.Fi.length} oportunidades de mejora con un impacto anual estimado de <b>${F.eur(d.totImp)}</b> (${F.pct(S.pct(d.totImp, d.ebitda))} del EBITDA actual). Veredicto del simulador para la inversión «${esc(S.sim.proyecto)}»: <b>${d.r.verdict.titulo}</b>.</p></div>`;
    h += `<h2>1. Diagnóstico 360 por áreas</h2><div class="table-wrap"><table><thead><tr><th>Área</th><th>Salud</th><th style="text-align:left">Indicadores</th></tr></thead><tbody>${d.areas.map((a) => { const l = d.K.filter((k) => k.area === a); const s = d.sc(l); return `<tr><td>${a}</td><td>${s === null ? '—' : pill(stOf(s), s)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${l.map((k) => `${k.k}: <b>${k.v}</b>`).join(' · ')}</td></tr>`; }).join('')}</tbody></table></div>`;
    h += `<h2>2. Auditoría del flujo del dinero</h2>${mf ? `<p>${mf.lectura.join(' ')}</p><table><tbody>${mf.destinos.map((x) => `<tr><td>${x.n}</td><td>${Math.round(x.pct)} € de cada 100</td></tr>`).join('')}</tbody></table>` : '<p>No hay cuentas de varios años cargadas.</p>'}`;
    h += `<h2>3. Impuestos</h2><p>Pagos estimados en los próximos 12 meses: <b>${F.eur(tc.anual)}</b> (${F.pct(S.pct(tc.anual, tc.ventas12))} de las ventas).</p><table><thead><tr><th>Fecha</th><th>Modelo</th><th style="text-align:left">Concepto</th><th>Importe</th></tr></thead><tbody>${tc.pagos.filter((p) => p.importe).map((p) => `<tr><td>${p.fecha.toLocaleDateString('es-ES')}</td><td>${p.modelo}</td><td style="text-align:left;font-family:var(--font-body)">${esc(p.concepto)}</td><td>${F.eurFull(p.importe)}</td></tr>`).join('')}</tbody></table>`;
    const minW = cw.weeks.reduce((a, x) => (x.fin < a.fin ? x : a));
    h += `<h2>4. Tesorería de las próximas semanas</h2><p>Saldo inicial ${F.eur(cw.weeks[0].ini)}; semana más tensa la del ${minW.a.toLocaleDateString('es-ES')} con ${F.eur(minW.fin)}; ${cw.weeks.filter((x) => x.st !== 'ok').length} semanas por debajo del colchón de ${F.eur(cw.colchon)}.</p>`;
    h += `<h2>5. Presupuesto y desviaciones</h2><p>Ventas acumuladas al ${Math.round(b.ratio * 100)} % de lo presupuestado: la realidad se parece al escenario <b>${A.SCENARIOS.find((s) => s.key === b.escEq).nombre.toLowerCase()}</b>. Cierre proyectado ${F.eur(b.cierreVentas)} frente a ${F.eur(b.ventasAnual)}.</p>`;
    h += `<h2>6. Riesgos y mercado</h2><table><thead><tr><th style="text-align:left">Riesgo</th><th>Área</th><th>Nivel</th><th style="text-align:left">Mitigación</th></tr></thead><tbody>${d.R.slice(0, 15).map((x) => `<tr><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(x.nombre)}</td><td>${esc(x.fuente)}</td><td>${pill(x.estado, x.nivel)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(x.mitigacion || '')}</td></tr>`).join('')}</tbody></table>`;
    const an = S.state.mercado.analisis; if (an && an.resumen) h += `<p><b>Contexto de mercado (${new Date(an.fecha).toLocaleDateString('es-ES')}).</b> ${esc(an.resumen)}</p>`;
    if (S.planReportHTML) h += S.planReportHTML();
    // Macro → micro
    const p = d.p;
    h += `<h2>7. Plan de trabajo: de los objetivos a las acciones (macro → micro)</h2>${p.objetivos.map((o) => `<h3>${esc(o.nombre)} · ${esc(o.indicador)} ${o.actual} → ${o.meta}${o.fecha ? ' (' + esc(o.fecha) + ')' : ''}</h3><table><thead><tr><th>Área</th><th style="text-align:left">Objetivo</th><th>Indicador</th><th style="text-align:left">Acciones</th></tr></thead><tbody>${p.areas.filter((a) => a.macro === o.id).map((a) => `<tr><td>${esc(a.area)}</td><td style="text-align:left;font-family:var(--font-body)">${esc(a.objetivo)}</td><td>${esc(a.kpi)}: ${a.actual} → ${a.meta}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${p.acciones.filter((x) => x.area === a.area).map((x) => `${esc(x.accion)} (${esc(x.responsable || 'sin responsable')}, ${esc(x.estado)})`).join('; ')}</td></tr>`).join('')}</tbody></table>`).join('')}`;
    // Micro → macro
    h += `<h2>8. Plan de trabajo: de los hallazgos al resultado (micro → macro)</h2><p>Cada mejora concreta se suma por área hasta su efecto total en la empresa: <b>${F.eur(d.totImp)}</b> al año, el ${F.pct(S.pct(d.totImp, d.ebitda))} del EBITDA actual (${F.eur(d.ebitda)}).</p>
      <table><thead><tr><th>Área</th><th>Impacto anual</th><th>Peso</th></tr></thead><tbody>${Object.keys(d.imp).sort((x, y) => d.imp[y] - d.imp[x]).map((a) => `<tr><td>${esc(a)}</td><td>${F.eur(d.imp[a])}</td><td>${F.pct(S.pct(d.imp[a], d.totImp))}</td></tr>`).join('')}</tbody></table>
      <table><thead><tr><th>Área</th><th style="text-align:left">Hallazgo</th><th style="text-align:left">Acción</th><th>Impacto</th><th>Plazo</th></tr></thead><tbody>${d.Fi.map((f) => `<tr><td>${esc(f.area)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(f.hallazgo)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(f.accion)}</td><td>${F.eur(f.impactoEUR || 0)}</td><td>${f.plazo} d</td></tr>`).join('')}</tbody></table>`;
    h += `<h2>9. Hoja de ruta</h2><table><thead><tr><th>Horizonte</th><th style="text-align:left">Qué hacer</th><th>Impacto</th></tr></thead><tbody>${plazos.map((pz, i) => { const l = d.Fi.filter((f) => (f.plazo || 90) <= pz && (i === 0 || (f.plazo || 90) > plazos[i - 1])); return `<tr><td>${i === 0 ? '0' : plazos[i - 1]}-${pz} días</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${l.map((f) => esc(f.accion)).join('; ') || '—'}</td><td>${F.eur(l.reduce((a, f) => a + (f.impactoEUR || 0), 0))}</td></tr>`; }).join('')}</tbody></table>`;
    h += `<div class="foot">Generado con Atalaya. Las cifras son estimaciones basadas en los datos introducidos; la fiscalidad y las decisiones societarias deben validarse con los asesores de la empresa.</div>`;
    return h;
  }
  function reportText() {
    const d = reportData();
    return `AUDITORÍA ESTRATÉGICA · ${S.sim.empresaNombre}\nSalud global: ${d.global}/100. Impacto anual de las mejoras: ${F.eur(d.totImp)}.\n\nRiesgos principales:\n${d.R.slice(0, 8).map((r) => `- ${r.nombre} (${r.nivel})`).join('\n')}\n\nMejoras:\n${d.Fi.slice(0, 12).map((f) => `- [${f.area}] ${f.hallazgo} → ${f.accion} (${F.eur(f.impactoEUR || 0)}, ${f.plazo} días)`).join('\n')}`;
  }
  function openReport() {
    let ov = $('#report'); if (!ov) { ov = document.createElement('div'); ov.id = 'report'; ov.className = 'report-overlay'; document.body.appendChild(ov); }
    ov.hidden = false; document.body.style.overflow = 'hidden';
    ov.innerHTML = `<div class="report-bar"><b style="font-family:var(--font-display);font-size:1.1rem;color:var(--gold-soft)">Informe de auditoría</b><span class="spacer"></span>${inFrame ? '' : '<button class="btn" id="rpPrint">Imprimir o guardar PDF</button>'}<button class="btn solid" id="rpClose">Cerrar</button></div><article class="paper">${reportHTML()}</article>`;
    $('#rpClose').onclick = () => { ov.hidden = true; document.body.style.overflow = ''; };
    const pr = $('#rpPrint'); if (pr) pr.onclick = () => print();
  }
})();
