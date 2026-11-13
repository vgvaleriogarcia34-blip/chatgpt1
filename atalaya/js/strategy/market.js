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
      industria: 'Industria: la energía y las materias primas son el principal riesgo; revise contratos de suministro eléctrico y gas.',
      distribucion: 'Distribución: margen estrecho ante la inflación de compras; traslade precios rápido y vigile el stock.',
      hosteleria: 'Hostelería: costes de energía y alimentos al alza y dificultad para contratar; la demanda turística sigue fuerte.',
      retail: 'Retail: el consumidor nota la inflación; cuida el precio de entrada y la rotación del stock.',
      construccion: 'Construcción: tipos más altos frenan la demanda financiada y encarecen la obra; revise fórmulas de revisión de precios.',
      servicios: 'Servicios profesionales: el riesgo principal es el coste salarial; ajuste tarifas y tiempo facturable.',
      tecnologia: 'Tecnología: la demanda de IA impulsa la inversión; el coste de financiación pesa en las empresas con caja negativa.',
      agro: 'Agroalimentario: energía, fertilizantes y transporte encarecen la producción; cubre precios con contratos.',
      salud: 'Salud: demanda estable; vigile salarios del personal sanitario y coste de suministros.',
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
    datos: () => { const m = S.state.mercado || {}; return !!m.analisis || (m.indicadores || []).some((i) => String(i.valor || '').trim() || i.impacto !== 'neutro') || (m.targets || []).some((t) => S.num(t.peso) > 0) || (m.tipologias || []).some((t) => S.num(t.peso) > 0) || (m.competidores || []).some((c) => String(c.nombre || '').trim()); },
    render(host) {
      const m = M(), an = m.analisis;
      const R = S.allRisks();
      const scen = an && an.ajustesEscenario ? an.ajustesEscenario : null;
      host.innerHTML = `${S.section('Mercado y riesgos 360', 'Contexto macroeconómico global y nacional, situación del sector y competencia, y riesgos por tipo de cliente y de producto. Un agente consulta fuentes oficiales y traslada lo que encuentra a los planes de cada área y a los escenarios del simulador.')}
        <div class="grid cols-2">
          <div class="glass pad stack"><h4>Perfil para el análisis</h4>
            <div class="lever-grid">${[['actividad', 'Actividad concreta'], ['region', 'Ámbito geográfico'], ['productos', 'Tipologías de producto'], ['clientes', 'Tipos de cliente']].map(([k, n]) => `<label class="small">${n}<input class="input" id="mp_${k}" value="${esc(m.perfil[k] || '')}" placeholder="${k === 'actividad' ? A.SECTORS[S.sim.sector].nombre : ''}"></label>`).join('')}</div>
            <div class="row"><button class="btn solid" id="mkRef">Cargar datos macro 2026</button><button class="btn" id="mkAgent">Actualizar con el agente</button><span class="small muted" id="mkMsg">${an ? (an.origen === 'referencia' ? 'Datos de referencia del ' : 'Último análisis: ') + new Date(an.fecha).toLocaleDateString('es-ES') : 'Sin análisis todavía. Pulse «Cargar datos macro 2026» para partir de los últimos datos oficiales.'}</span></div>
            <p class="small muted" id="mkMode"></p></div>
          <div class="glass pad stack"><h4>Fuentes oficiales</h4><p class="small solo-pantalla">El agente consulta prioritariamente estas fuentes y cita fecha y origen de cada dato. También puede consultarlas usted y anotar los valores en la tabla de indicadores.</p><div class="chips">${FUENTES.map(([n, u]) => `<a class="vchip static" href="${u}" target="_blank" rel="noopener">${n}</a>`).join('')}</div></div>
        </div>
        ${an ? `<div class="glass pad mt stack"><h4>${an.origen === 'referencia' ? 'Datos de referencia 2026 · consulta del ' + new Date(an.fecha).toLocaleDateString('es-ES') : 'Resumen del agente'}</h4><p>${esc(an.resumen || '')}</p>
          ${an.sector ? `<div class="grid cols-3"><div><h4>Sector</h4><p class="small">${esc(an.sector.situacion || '')} ${an.sector.crecimiento ? '· ' + esc(an.sector.crecimiento) : ''}</p><ul class="small">${(an.sector.tendencias || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div><h4>Riesgos</h4><ul class="small">${(an.sector.riesgos || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div><h4>Oportunidades</h4><ul class="small">${(an.sector.oportunidades || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}
          ${(an.implicaciones || []).length ? `<h4>Cómo afecta a sus planes</h4><div class="table-wrap"><table><thead><tr><th>Plan</th><th style="text-align:left">Acción</th><th>Prioridad</th></tr></thead><tbody>${an.implicaciones.map((x) => `<tr><td>${esc(x.plan)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(x.accion)}</td><td>${esc(x.prioridad || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
          ${(an.fuentes || []).length ? `<p class="small muted">Fuentes: ${an.fuentes.filter((f, i, arr) => arr.findIndex((x) => x.url === f.url) === i).map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.fuente)}</a>`).join(' · ')}</p>` : ''}
          ${scen ? `<div class="row"><span class="small">Ajuste sugerido de escenario: ${scen.ventasF ? 'venta nueva × ' + scen.ventasF + ' · ' : ''}${scen.tipoDelta ? 'tipos ' + scen.tipoDelta + ' puntos · ' : ''}${scen.margenDelta ? 'margen ' + scen.margenDelta + ' puntos · ' : ''}${scen.dsoDelta ? 'cobros ' + scen.dsoDelta + ' días' : ''} <span class="muted">${esc(scen.justificacion || '')}</span></span><button class="btn" id="mkApply">Aplicar al escenario «Hipótesis»</button></div>` : ''}</div>` : ''}
        <div class="glass pad mt" id="mkInd"></div>
        <div class="grid cols-2 mt"><div class="glass pad" id="mkTg"></div><div class="glass pad" id="mkTp"></div></div>
        <div class="glass pad mt" id="mkComp"></div>
        <div class="glass pad mt stack"><h4>Implicaciones sobre los planes</h4><div class="table-wrap"><table><thead><tr><th style="text-align:left">Señal</th><th>Plan</th><th style="text-align:left">Qué hacer</th></tr></thead><tbody>${m.indicadores.filter((i) => i.impacto !== 'neutro').map((i) => { const x = implicacion(i); return `<tr><td style="text-align:left;font-family:var(--font-body)">${esc(i.indicador)} · ${i.impacto === 'negativo' ? 'desfavorable' : 'favorable'}</td><td>${x.plan}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${x.accion}</td></tr>`; }).join('') || '<tr><td colspan="3" class="muted">Marque el impacto de cada indicador para ver sus implicaciones.</td></tr>'}</tbody></table></div></div>
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Matriz de riesgos de la empresa</h4><div class="chart" id="mkMatrix"></div></div><div class="glass pad stack"><h4>Riesgos priorizados</h4>${S.riskBlock(R.slice(0, S.N_RIESGOS), { num: true, total: R.length })}</div></div>`;
      ['actividad', 'region', 'productos', 'clientes'].forEach((k) => { $('#mp_' + k, host).onchange = (e) => { m.perfil[k] = e.target.value; S.save(); }; });
      A.charts.riskMatrix($('#mkMatrix', host), S.riesgosMatriz(R, S.N_RIESGOS), () => {});
      // Agente
      (async () => {
        await A.platform.ready;
        if (!host.isConnected || !$('#mkMode', host)) return; // el módulo se cerró mientras tanto
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
        } catch (e) { if (!host.isConnected) return; const mm = $('#mkMsg', host); if (mm) mm.textContent = e.message; b.disabled = false; }
      };
      $('#mkRef', host).onclick = () => {
        const R = S.MACRO_2026;
        const propios = m.indicadores.filter((i) => i.ambito === 'Sector' || i.ambito === 'Región').filter((i) => i.valor);
        m.indicadores = A.clone(R.indicadores).concat(propios);
        m.analisis = { fecha: new Date(R.fecha).toISOString(), origen: 'referencia', resumen: R.resumen + ' ' + (R.sector[S.sim.sector] || ''), implicaciones: R.implicaciones, ajustesEscenario: R.ajustesEscenario, fuentes: R.indicadores.map((i) => ({ fuente: i.fuente, url: i.url })) };
        S.save(); S.rerender();
      };
      const ap = $('#mkApply', host);
      if (ap) ap.onclick = () => { const c = S.sim.custom; if (scen.ventasF) c.ventasF = +scen.ventasF; if (scen.tipoDelta) c.tipoDelta = +scen.tipoDelta; if (scen.margenDelta) c.margenDelta = +scen.margenDelta; if (scen.dsoDelta) c.dsoDelta = +scen.dsoDelta; S.saveSim(); ap.textContent = 'Aplicado: ábralo en el simulador'; };
      S.etable($('#mkInd', host), { titulo: 'Indicadores macro y sectoriales', rows: m.indicadores, onChange: () => { S.save(); S.rerender(); }, nuevo: () => ({ ambito: 'España', indicador: '', valor: '', tendencia: 'estable', impacto: 'neutro', palanca: 'ventas', fuente: '', fecha: '' }),
        cols: [{ k: 'ambito', l: 'Ámbito', type: 'select', opts: ['Global', 'Zona euro', 'España', 'Región', 'Sector'] }, { k: 'indicador', l: 'Indicador', type: 'text' }, { k: 'valor', l: 'Valor', type: 'text' }, { k: 'tendencia', l: 'Tendencia', type: 'select', opts: ['sube', 'baja', 'estable', 'empeora', 'mejora'] }, { k: 'impacto', l: 'Impacto para usted', type: 'select', opts: ['negativo', 'neutro', 'positivo'] }, { k: 'palanca', l: 'Afecta a', type: 'select', opts: Object.keys(PALANCAS).map((k) => ({ v: k, l: PALANCAS[k] })) }, { k: 'fuente', l: 'Fuente', type: 'text' }, { k: 'fecha', l: 'Fecha del dato', type: 'text' }] });
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
    informe() { return S.inf.empresa(); },
    render(host) {
      host.innerHTML = `${S.section('Informe de auditoría', 'Un informe completo con el diagnóstico 360 de todas las áreas, la auditoría del dinero, los impuestos, la tesorería, el mercado y los riesgos, y dos planes de trabajo: de los objetivos generales a las acciones (macro → micro) y de los hallazgos concretos a su impacto en la cuenta de resultados (micro → macro).')}
        <div class="glass pad stack" data-inf="no"><div class="row"><button class="btn solid" id="auGen">Generar el informe</button><button class="btn ghost" id="auCopy">Copiar texto</button></div><p class="small muted">El informe usa los datos de todos los módulos y del simulador. Cuanto más completos, más preciso.</p></div>`;
      $('#auGen', host).onclick = openReport;
      $('#auCopy', host).onclick = () => { const t = S.inf.conPropios(reportText); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { $('#auCopy', host).textContent = 'Copiado'; }, () => { const ta = document.createElement('textarea'); ta.value = t; host.appendChild(ta); ta.select(); }); };
    }
  });
  function reportData() {
    const N = S.inf, lim = (l, k) => l.map((x) => Object.assign({}, x, k.reduce((o, c) => Object.assign(o, { [c]: N.frases(x[c] || '') }), {})));
    const K = S.allKpis().filter((k) => k.mod !== 'origen' && !k.sinDato && String(k.v).replace(/<[^>]+>/g, '').trim() !== S.SIN_DATO).map((k) => Object.assign(k, { area: N.area(k.mod) || k.area }));
    const R = lim(S.allRisks(), ['nombre', 'mitigacion']).map((r) => Object.assign(r, { fuente: N.area(r.mod) || r.fuente || '' })), Fi = lim(S.allFindings(), ['hallazgo', 'accion']).map((f) => Object.assign(f, { area: N.area(f.mod) || f.area, resp: (A.C360 && A.C360[f.mod] && A.C360[f.mod].resp) || 'Dirección' })).sort((a, b) => (b.impactoEUR || 0) - (a.impactoEUR || 0));
    const areas = Array.from(new Set(K.map((k) => k.area)));
    const sc = (l) => S.notaN(l === K ? null : [...new Set(l.map((x) => x.mod))], l);
    const p = PL(), con = S.simConDatos();
    const ebitda = con ? S.baseYear().ebitda : 0;
    const imp = {}; Fi.forEach((f) => { imp[f.area] = (imp[f.area] || 0) + (f.impactoEUR || 0); });
    const totImp = Object.values(imp).reduce((a, b) => a + b, 0);
    // Cada área con lo que sostiene su valoración (indicadores y demás comprobaciones que puntúan, rojas y ámbar primero)
    // Todas las áreas: con documentación (nota y lo que la sostiene), sin ella (0 y el documento que falta) y las que no aplican al sector
    const porArea = N.areas(K);
    const sinDoc = porArea.filter((x) => x.estado === 'sindoc'), noAplica = porArea.filter((x) => x.estado === 'noaplica'), pendientes = porArea.filter((x) => x.estado === 'pendiente');
    const sinInfo = sinDoc.map((x) => x.a);
    // Global: la media de las áreas aplicables, con las que no tienen documentación a 0
    return { K, R, Fi, areas, porArea, sinDoc, noAplica, pendientes, sc, p, con, ebitda, imp, totImp, sinInfo, cruces: N.cruces(), global: N.notaGlobal(porArea) };
  }
  /* Informe de auditoría: dossier de la empresa completa. Cada apartado solo aparece si hay información para sostenerlo;
     lo que no se ha podido analizar se dice en el anexo «Alcance y limitaciones». */
  function reportHTML() {
    const d = reportData(), e = S.sim.empresa, I = A.informe, N = S.inf, emp = S.sim.empresaNombre;
    const pill = (st, t) => I.pill(st, t), stOf = (v) => N.estado(v);
    const con = d.con, ilus = N.ilustrativo(null);
    const ok = (id) => S.conDatos(id);
    // Del beneficio a la caja: solo con ejercicios cerrados (las previsiones no son lo que ha pasado)
    const mf = ok('dinero') && S.mfCerrado ? S.mfCerrado() : null;
    const tc = con && ok('impuestos') ? S.taxCalc() : null, cw = ok('tesoreria') ? S.cashWeeks() : null, b = ok('presupuesto') ? S.budget() : null;
    const esc0 = b ? A.SCENARIOS.find((s) => s.key === b.escEq) : null;
    const vr = con && S.invDefinida() ? S.analysis().verdict : null;
    const altos = d.R.filter((x) => x.estado === 'stop');
    const valoradas = d.porArea.filter((x) => x.estado === 'ok' && x.s !== null), criticas = valoradas.filter((x) => x.s < 50), vigil = valoradas.filter((x) => x.s >= 50 && x.s < 70), aplican = d.porArea.filter((x) => x.s !== null), esencialesTxt = N.esencialesTxt(d.porArea);
    const minW = cw && cw.weeks.length ? cw.weeks.reduce((a, x) => (x.fin < a.fin ? x : a)) : null, tensas = cw ? cw.weeks.filter((x) => x.st !== 'ok').length : 0;
    const plazos = [30, 90, 180, 365];
    const fd = (x) => new Date(x).toLocaleDateString('es-ES');
    I.reset();
    // Resumen ejecutivo: la conclusión primero y los mensajes clave con su cifra
    const concl = d.global === null ? `No se ha dispuesto de información suficiente para valorar la situación de ${esc(emp || 'la empresa')}. Este documento delimita el alcance de la auditoría.`
      : `La valoración global de ${esc(emp || 'la empresa')} es de <b>${d.global} sobre 100</b> ${pill(stOf(d.global))}: ${N.califica(d.global)}${!d.sinDoc.length ? '' : d.sinDoc.length === aplican.length ? `. Ninguna de las ${aplican.length} áreas que cuentan se ha podido evaluar: falta su documentación esencial y cada una cuenta 0` : `. ${d.sinDoc.length === 1 ? 'Un área esencial no se ha podido evaluar' : d.sinDoc.length + ' de las ' + aplican.length + ' áreas que cuentan no se han podido evaluar'} por falta de documentación y ${d.sinDoc.length === 1 ? 'cuenta' : 'cuentan'} 0`}.${esencialesTxt ? ` ${esencialesTxt}.` : ''}`;
    const M = [];
    if (aplican.length) M.push(`<b>Áreas.</b> ${valoradas.length ? `De las ${aplican.length} áreas que cuentan en la valoración, ${valoradas.length} con documentación: ${criticas.length} en nivel crítico${criticas.length ? ` (${criticas.slice(0, 4).map((x) => `${esc(x.a)}, ${x.s}`).join('; ')})` : ''} y ${vigil.length} en vigilancia.` : `Ninguna de las ${aplican.length} áreas que cuentan en la valoración tiene documentación propia.`}${d.sinDoc.length ? ` Esenciales sin documentación, valoradas con 0: ${esc(d.sinDoc.slice(0, 5).map((x) => x.a).join(', '))}${d.sinDoc.length > 5 ? ` y ${d.sinDoc.length - 5} más` : ''}.` : ''}${d.pendientes.length ? ` Recomendadas pendientes, que no bajan la valoración: ${d.pendientes.length}.` : ''}`);
    if (d.R.length) M.push(`<b>Riesgos.</b> ${d.R.length === 1 ? 'Un riesgo identificado' : d.R.length + ' riesgos identificados'}, ${altos.length} de nivel alto. El principal: ${esc(d.R[0].nombre)} (nivel ${d.R[0].nivel} sobre 25).`);
    if (d.totImp > 0) M.push(`<b>Oportunidades.</b> ${d.Fi.length === 1 ? 'Una mejora' : d.Fi.length + ' mejoras'} con un impacto${d.Fi.length === 1 ? '' : ' conjunto'} de <b>${F.eur(d.totImp)}</b> al año${d.ebitda > 0 ? `, el ${F.pct(S.pct(d.totImp, d.ebitda))} del EBITDA actual (${F.eur(d.ebitda)})` : ''}.`);
    // Colchón: los días de gastos fijos y de personal que se quieren tener en caja; si no hay esos gastos, lo que cuenta es el saldo negativo
    const colchon = cw && cw.colchon > 0 ? cw.colchon : 0, bajoTxt = (n) => `${n === 1 ? 'una semana' : n + ' semanas'} ${colchon ? `por debajo del colchón de ${F.eur(colchon)}` : 'con saldo negativo'}`;
    if (minW && tensas) M.push(`<b>Tesorería.</b> ${bajoTxt(tensas).replace(/^u/, 'U')}; la más tensa, la del ${fd(minW.a)}, con ${F.eur(minW.fin)}.`);
    if (vr) M.push(`<b>Inversión.</b> El proyecto «${esc(S.sim.proyecto)}» se valora como: <b>${esc(vr.titulo)}</b>.`);
    if (d.Fi[0]) M.push(`<b>Primera actuación.</b> ${esc(d.Fi[0].accion.replace(/\.$/, ''))} (${F.eur(d.Fi[0].impactoEUR || 0)} al año, ${d.Fi[0].plazo || 90} días).`);
    else if (altos[0] && altos[0].mitigacion) M.push(`<b>Primera actuación.</b> ${esc(altos[0].mitigacion)}`);
    let h = N.portada({ tipo: 'Informe de auditoría', kicker: 'Auditoría estratégica' + (ilus ? ' · caso ilustrativo' : ''), titulo: emp || 'Auditoría estratégica', subtitulo: N.sectorTxt() + (con ? ` · ventas ${F.eur(e.ventas)}${S.num(e.plantilla) > 0 ? ` · ${e.plantilla} ${+e.plantilla === 1 ? 'persona' : 'personas'}` : ''}` : ''), empresa: emp, sector: N.sectorTxt(), ambito: d.noAplica.length ? `Empresa completa salvo lo que no aplica a su sector (${d.noAplica.map((x) => x.a).join(', ')})` : 'Empresa completa: finanzas, comercial, operaciones, personas y entorno' })
      + I.summary('Resumen ejecutivo', N.resumen(concl, M), stOf(d.global));
    if (d.porArea.length) h += I.section(`Diagnóstico por áreas: ${[criticas.length ? `${criticas.length} en nivel crítico` : 'ninguna en nivel crítico', d.sinDoc.length ? `${d.sinDoc.length} ${d.sinDoc.length === 1 ? 'esencial' : 'esenciales'} sin documentación` : ''].filter(Boolean).join(' y ')}`,
      (esencialesTxt ? `<p><b>${esc(esencialesTxt)}.</b></p>` : '') + I.table(['Área', 'Valoración', 'Lo que sostiene la valoración'], N.filasAreas(d.porArea)) + N.faltaHTML(d.porArea), 'Áreas agrupadas según lo que se exige a su empresa: esenciales, recomendadas y las que no aplican. Un área esencial sin documentación vale 0; una recomendada sin entregar no cuenta.');
    // Con un año incompleto el reparto de cada 100 € no se puede hacer (faltan destinos): solo la lectura, que lo dice
    const sinStock = S.SIN_STOCK.includes(S.sectorEmpresa().k), dest = mf && !mf.falta.length ? mf.destinos.filter((x) => Math.round(x.pct) >= 1 && !(sinStock && /stock/i.test(x.n))) : [];
    const crCaja = d.cruces.find((c) => c.mods.includes('dinero'));
    // Sin el cruce del beneficio con la caja, la sección lo dice y nombra el documento que falta
    if (!mf && crCaja) h += I.section('Del beneficio a la caja: el cruce no se puede hacer', `<p>${esc(crCaja.t)}</p>`);
    if (mf) h += I.section(`Del beneficio a la caja: ${mf.cajaReal >= 0 ? 'la caja sube' : 'la caja baja'} ${F.eur(Math.abs(mf.cajaReal))} en ${mf.anio} con ${F.eur(mf.beneficio)} de beneficio`, `<p>${mf.lectura.map((t) => esc(N.frases(t))).join(' ')}</p>` + (dest.length >= 2 ? I.table(['Destino de cada 100 € generados', 'Importe'], dest.map((x) => [x.n, Math.round(x.pct) + ' €']), { num: [1] }) : ''));
    if (tc && tc.anual > 0) h += I.section(`Impuestos y cotizaciones: ${F.eur(tc.anual)} en los próximos doce meses, el ${F.pct(S.pct(tc.anual, tc.ventas12))} de las ventas`, I.table(['Fecha', 'Modelo', 'Concepto', 'Importe'], tc.pagos.filter((p) => p.importe).map((p) => [fd(p.fecha), p.modelo, p.concepto, F.eurFull(p.importe)]), { num: [3] }), 'Calendario estimado de pagos a Hacienda y a la Seguridad Social.');
    if (minW) h += I.section(tensas ? `Tesorería: ${bajoTxt(tensas)}` : colchon ? `Tesorería: ninguna semana por debajo del colchón de ${F.eur(colchon)}` : `Tesorería: el saldo previsto no baja de ${F.eur(minW.fin)} en ${cw.weeks.length} semanas`, `<p>La previsión parte de un saldo de ${F.eur(cw.weeks[0].ini)} y cubre ${cw.weeks.length} semanas. La semana más tensa es la del ${fd(minW.a)}, con un saldo de ${F.eur(minW.fin)}.</p>`);
    if (b && esc0 && b.ventasAnual > 0) h += I.section(`Presupuesto: las ventas acumuladas van al ${Math.round(b.ratio * 100)} % de lo previsto`, `<p>La evolución real se corresponde con el escenario <b>${esc(esc0.nombre.toLowerCase())}</b>. El cierre proyectado es de ${F.eur(b.cierreVentas)}, frente a ${F.eur(b.ventasAnual)} presupuestados.</p>`);
    const an = S.state.mercado.analisis;
    if (d.R.length || (an && an.resumen)) h += I.section(d.R.length ? `Riesgos y entorno: ${d.R.length === 1 ? 'un riesgo' : d.R.length + ' riesgos'}, ${altos.length} de nivel alto` : 'Riesgos y entorno',
      (d.R.length ? I.table(['Riesgo', 'Área', 'Nivel', 'Respuesta recomendada'], d.R.slice(0, 15).map((x) => [x.nombre, x.fuente, { h: pill(x.estado, String(x.nivel)) }, x.mitigacion || ''])) + (d.R.length > 15 ? `<p class="rp-muted">Se muestran los 15 riesgos de mayor nivel de un total de ${d.R.length}.</p>` : '') : '')
      + (an && an.resumen ? `<h3>Contexto de mercado a ${fd(an.fecha)}</h3><p>${esc(N.frases(an.resumen))}</p>` : ''));
    // Cruces entre fuentes (los demás: cuentas y cartera de clientes, presupuesto y realidad)
    const otrosCr = d.cruces.filter((c) => !c.mods.includes('dinero'));
    if (otrosCr.length) h += I.section(otrosCr.every((c) => c.ok) ? 'Cruces de información: las fuentes se corresponden' : `Cruces de información: ${otrosCr.filter((c) => !c.ok).length === 1 ? 'uno no se puede hacer' : otrosCr.filter((c) => !c.ok).length + ' no se pueden hacer'} sin la documentación que falta`, N.crucesHTML(otrosCr), 'Contraste de una fuente con otra. Si no se puede hacer, se indica qué documento falta.');
    const est = S.planReportHTML ? S.planReportHTML() : '';
    if (est) h += I.section('Estrategia: valores, DAFO y CAME', est);
    // De los objetivos a las acciones
    const p = d.p, objs = (p.objetivos || []).filter((o) => String(o.nombre || '').trim());
    if (objs.length && S.planObjetivosHTML) h += I.section(`Objetivos de la dirección: ${objs.length === 1 ? 'un objetivo general' : objs.length + ' objetivos generales'} desplegados por áreas`, S.planObjetivosHTML());
    // Recomendaciones: de los hallazgos al resultado
    if (d.Fi.length) h += I.section(`Recomendaciones: ${d.Fi.length === 1 ? 'una actuación' : d.Fi.length + ' actuaciones'} por ${F.eur(d.totImp)} al año`, `<p>Cada mejora se suma por área hasta su efecto total en la empresa: <b>${F.eur(d.totImp)}</b> al año${d.ebitda > 0 ? `, el ${F.pct(S.pct(d.totImp, d.ebitda))} del EBITDA actual (${F.eur(d.ebitda)})` : ''}.</p>`
      + I.table(['Área', 'Impacto anual', 'Peso'], Object.keys(d.imp).sort((x, y) => d.imp[y] - d.imp[x]).map((a) => [a, F.eur(d.imp[a]), F.pct(S.pct(d.imp[a], d.totImp))]), { num: [1, 2] })
      + I.table(['Área', 'Hallazgo', 'Actuación recomendada', 'Impacto anual', 'Responsable', 'Plazo'], d.Fi.map((f) => [f.area, f.hallazgo, f.accion, F.eur(f.impactoEUR || 0), f.resp, (f.plazo || 90) + ' días']), { num: [3] }));
    if (d.Fi.length) h += I.section('Hoja de ruta', I.table(['Horizonte', 'Hitos', 'Impacto anual'], plazos.map((pz, i) => { const l = d.Fi.filter((f) => (f.plazo || 90) <= pz && (i === 0 || (f.plazo || 90) > plazos[i - 1])); return l.length ? [`De ${i === 0 ? 0 : plazos[i - 1]} a ${pz} días`, { h: `<ul>${l.filter((f, j) => l.findIndex((y) => y.accion === f.accion) === j).map((f) => `<li>${esc(f.accion)} <span class="rp-muted">· ${esc(f.resp)}</span></li>`).join('')}</ul>` }, F.eur(l.reduce((a, f) => a + (f.impactoEUR || 0), 0))] : null; }).filter(Boolean), { num: [2] }), 'Las actuaciones, ordenadas por su plazo de ejecución.');
    else h += I.section('Hoja de ruta', `<p>El primer hito es reunir la documentación que permite evaluar las áreas${d.sinDoc.length ? `: ${esc(d.sinDoc.slice(0, 4).map((x) => N.min(x.falta)).join('; '))}${d.sinDoc.length > 4 ? `, y la de ${d.sinDoc.length - 4} áreas más` : ''}` : ''}. Con ella se fijan las actuaciones, su impacto y sus plazos.</p>`);
    const fuentes = N.fuenteCuentas().concat(d.areas.length ? [`Registros de gestión de las áreas analizadas: ${esc(d.areas.join(', '))}.`] : []).concat(an && an.resumen ? [`Análisis de mercado a ${fd(an.fecha)}.`] : []);
    const limites = [];
    if (d.sinDoc.length) limites.push(`Áreas esenciales sin documentación, que cuentan 0 en la valoración global: ${esc(d.sinDoc.map((x) => x.a).join(', '))}.`);
    if (d.pendientes.length) limites.push(`Áreas recomendadas sin entregar, que no cuentan en la valoración: ${esc(d.pendientes.map((x) => x.a).join(', '))}.`);
    if (d.noAplica.length) limites.push(`No aplican a la empresa y no se valoran: ${esc(d.noAplica.map((x) => `${x.a} (${String(x.motivo || '').replace(/\.$/, '').replace(/^\w/, (c) => c.toLowerCase())})`).join('; '))}.`);
    if (!mf) limites.push('No se ha dispuesto de las cuentas de dos ejercicios cerrados consecutivos; el documento no incluye el análisis del paso del beneficio a la caja.');
    else if (mf.falta.length) limites.push(`Las cuentas de ${mf.previo} y ${mf.anio} no detallan todas las partidas del balance; el paso del beneficio a la caja se analiza solo con las disponibles.`);
    N.limiteCuentas().forEach((t) => limites.push(t));
    limites.push('Los importes de impuestos, tesorería y cierre del ejercicio son previsiones; no sustituyen a la contabilidad ni a las liquidaciones oficiales.');
    h += N.cierre({ riesgos: d.R.length, fuentes, limites, ilustrativo: ilus, metodo: N.METODO + ' ' + N.metodoGlobal() });
    return h;
  }
  function reportText() {
    const d = reportData();
    return `AUDITORÍA ESTRATÉGICA · ${S.sim.empresaNombre}\n${d.global === null ? '' : `Valoración global: ${d.global} sobre 100. `}${d.totImp > 0 ? `Impacto anual de las mejoras: ${F.eur(d.totImp)}.` : ''}\n\nRiesgos principales:\n${d.R.slice(0, 8).map((r) => `- ${r.nombre} (nivel ${r.nivel} sobre 25)`).join('\n') || '- Sin riesgos relevantes identificados'}\n\nRecomendaciones:\n${d.Fi.slice(0, 12).map((f) => `- [${f.area}] ${f.hallazgo} → ${f.accion} (${F.eur(f.impactoEUR || 0)} al año, ${f.plazo || 90} días)`).join('\n') || '- Reunir la información de gestión para cuantificar el diagnóstico'}`;
  }
  S.auditReport = () => openReport();
  // Siempre con los datos propios de la empresa (S.inf.conPropios): nada de ejemplo en el informe de una empresa con datos
  function openReport() { S.inf.conPropios(() => A.informe.open({ titulo: 'Informe de auditoría', html: reportHTML(), texto: reportText() })); }

})();
