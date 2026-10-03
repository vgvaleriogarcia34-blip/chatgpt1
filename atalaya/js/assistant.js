/* Atalaya · Asistente con chat y voz
 *
 * Escucha (micrófono, Web Speech API), responde por escrito y en voz alta, y puede ajustar el simulador.
 * Tiene tres cerebros, por orden de preferencia:
 *  1. Claude a través del servidor de Atalaya (/api/chat), si el servidor tiene configurada la API.
 *  2. Claude a través de la capacidad «sample» del visor de Claude, si la página se abre allí.
 *  3. Un intérprete local de reglas en español, que funciona siempre y sin conexión.
 * En los tres casos las acciones pasan por las mismas herramientas de la página.
 */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const SYSTEM = `Eres el asistente de Atalaya, un simulador de inversión y crecimiento para empresarios de pymes españolas, muchos sin formación financiera.
Habla en español claro, con frases cortas y sin jerga; si usas un término técnico, explícalo en una frase.
Antes de opinar sobre la situación de la empresa, consulta la herramienta ver_situacion. No inventes cifras: usa las del simulador.
Cuando el usuario pida cambiar algo («pon», «sube», «prueba con…»), hazlo con las herramientas y después explica qué ha cambiado (antes → ahora) y qué significa.
Si expresa una preocupación, identifica qué semáforos y variables la afectan y propone de una a tres acciones concretas con cifras, empezando por las más sencillas.
Para estructuras societarias y relaciones entre sociedades de un grupo (holding, filial, patrimonial, préstamos intragrupo, consolidación fiscal), explica cómo funcionan con ejemplos y recuerda que la fiscalidad la debe confirmar su asesor.
Responde en 3-8 frases salvo que pidan detalle. Tus respuestas pueden leerse en voz alta: no uses tablas, asteriscos ni símbolos.
También eres el guía de Atalaya 360°: llevas al usuario de un mundo a otro (inicio, simulador de inversión, sistema estratégico, personas y equipos, mesa de trabajo y vista de grupo), a cualquier módulo, capítulo o pestaña, cierras ventanas, mapas e informes y abres el manual en el apartado que necesite. Usa donde_estoy para saber dónde está y qué hay, e ir_a_mundo, ir_a_zona, cerrar y abrir_manual para moverle. Cuando pida ir a un sitio, hazlo directamente y di en una o dos frases qué va a encontrar y qué conviene mirar primero.`;

  /* ---------- Herramientas (mismas para los tres cerebros) ---------- */
  let api = null, page = 'simulador';
  function toolDefs() {
    const T = [], ap = api || {};
    if (ap.summary) T.push({ name: 'ver_situacion', description: 'Devuelve el estado actual: veredicto, semáforos con sus horquillas y variables que los mueven, cifras clave, escenarios, hipótesis activas y plan de corrección. Úsala antes de opinar.', inputSchema: { type: 'object', properties: {} }, run: () => api.summary() });
    if (A.GLOSSARY || A.GROUP_TOPICS) T.push({ name: 'explicar_concepto', description: 'Busca un término en el diccionario corporativo de Atalaya (definición, fórmula, ejemplo y variables que lo mueven) o un tema de estructuras y grupos de sociedades.', inputSchema: { type: 'object', properties: { termino: { type: 'string' } }, required: ['termino'] }, run: (i) => lookup(i.termino) });
    if (ap.setVar) T.push({ name: 'cambiar_variable', description: 'Cambia una variable del simulador y devuelve el veredicto y la liquidez antes y después. Variables válidas: ' + api.settable.join(', ') + '. Porcentajes en puntos (70 = 70 %), importes en euros, plazos en las unidades del campo.', inputSchema: { type: 'object', properties: { variable: { type: 'string', enum: api.settable }, valor: { type: 'number' } }, required: ['variable', 'valor'] }, run: (i) => api.setVar(i.variable, i.valor) });
    if (ap.setScenario) T.push({ name: 'cambiar_escenario', description: 'Activa un escenario: estres, pesimista, base, optimista o hipotesis.', inputSchema: { type: 'object', properties: { escenario: { type: 'string', enum: ['estres', 'pesimista', 'base', 'optimista', 'hipotesis'] } }, required: ['escenario'] }, run: (i) => api.setScenario(i.escenario) });
    if (ap.addHyp) T.push({ name: 'anadir_hipotesis', description: 'Añade y activa un suceso hipotético. tipo: cliente (pérdida de cliente, % ventas), ventas (caída temporal, %), margen (pp), tipos (pp), cobro (días), salarios (%), puntual (miles de euros).', inputSchema: { type: 'object', properties: { tipo: { type: 'string', enum: ['cliente', 'ventas', 'margen', 'tipos', 'cobro', 'salarios', 'puntual'] }, mes: { type: 'integer' }, duracion: { type: 'integer' }, magnitud: { type: 'number' } }, required: ['tipo'] }, run: (i) => api.addHyp(i.tipo, i.mes, i.duracion, i.magnitud) });
    if (ap.setStructure) T.push({ name: 'cambiar_estructura', description: 'Adopta una estructura societaria: directa, leasing, filial, patrimonial, socio o jv.', inputSchema: { type: 'object', properties: { estructura: { type: 'string', enum: ['directa', 'leasing', 'filial', 'patrimonial', 'socio', 'jv'] } }, required: ['estructura'] }, run: (i) => api.setStructure(i.estructura) });
    if (ap.compareStructures) T.push({ name: 'comparar_estructuras', description: 'Compara las seis estructuras societarias con los datos actuales: encaje, liquidez mínima, recuperación, plazo y control.', inputSchema: { type: 'object', properties: {} }, run: () => api.compareStructures() });
    if (ap.applyPlan) T.push({ name: 'aplicar_plan', description: 'Aplica al simulador el plan de corrección calculado para alcanzar la posición meta.', inputSchema: { type: 'object', properties: {} }, run: () => api.applyPlan() });
    if (ap.setLever) T.push({ name: 'cambiar_palanca', description: 'Cambia una palanca del sistema estratégico: ' + api.levers.join(', ') + '. Valores en % de variación salvo que se indique.', inputSchema: { type: 'object', properties: { palanca: { type: 'string', enum: api.levers }, valor: { type: 'number' } }, required: ['palanca', 'valor'] }, run: (i) => api.setLever(i.palanca, i.valor) });
    guiaTools().forEach((t) => T.push(t));
    return T;
  }
  function lookup(q) {
    const n = norm(q);
    const g = (A.GLOSSARY || []).filter((x) => norm(x.t).includes(n) || n.includes(norm(x.t).split(' (')[0]));
    const gt = (A.GROUP_TOPICS || []).filter((x) => x.k.some((k) => n.includes(norm(k)) || norm(k).includes(n)));
    const st = Object.keys(A.STRUCTURE_INFO || {}).filter((k) => n.includes(norm(A.STRUCTURES[k].nombre)) || n.includes(norm(A.STRUCTURES[k].corto)) || n.includes(k));
    return {
      diccionario: g.slice(0, 3).map((x) => ({ termino: x.t, definicion: x.d, formula: x.f, ejemplo: x.ej, directas: x.dir.map((p) => (A.fieldLabel ? A.fieldLabel(p) : p)), indirectas: x.ind.map((p) => (A.fieldLabel ? A.fieldLabel(p) : p)) })),
      grupo: gt.map((x) => ({ tema: x.t, explicacion: x.d })),
      estructuras: st.map((k) => ({ estructura: A.STRUCTURES[k].nombre, comoFunciona: A.STRUCTURE_INFO[k].como, ventajas: A.STRUCTURE_INFO[k].ventajas, inconvenientes: A.STRUCTURE_INFO[k].inconvenientes, fiscalidad: A.STRUCTURE_INFO[k].fiscal }))
    };
  }

  /* ---------- Guía: mundos, zonas, ventanas y manual ----------
     El asistente puede llevar al usuario a otro mundo (la conversación sigue al llegar), a un módulo, capítulo
     o pestaña del mundo actual, cerrar ventanas e informes y abrir el manual en el apartado que toque. */
  const SS = { get: (k) => { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }, del: (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* nada */ } } };
  const PG = () => (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');
  const MUNDOS = {
    inicio: { url: 'portal.html', n: 'el inicio', k: ['inicio', 'portal', 'puesto de mando', 'pantalla principal', 'menu principal', 'galaxia', 'principio'], d: 'Desde aquí se entra en cada mundo de Atalaya 360°.' },
    simulador: { url: 'app.html', n: 'el simulador de inversión', k: ['simulador', 'simulacion', 'inversion', 'crecimiento'], d: 'Aquí se decide si la empresa puede afrontar una inversión sin romper la liquidez: punto de partida, la inversión, escenarios, semáforos, estructuras y el plan de corrección.', primero: 'Empieza por «La empresa hoy» y después «La inversión».' },
    estrategia: { url: 'estrategia.html', n: 'el sistema estratégico', k: ['sistema estrategico', 'estrategico', 'estrategia', 'cuadro de mando'], d: 'Veintidós módulos para analizar la empresa entera: finanzas, comercial, operaciones y estrategia, cada uno con su diagnóstico 360 e informe.', primero: 'Mira primero el cuadro de mando y los indicadores en rojo.' },
    personas: { url: 'personas.html', n: 'personas y equipos', k: ['personas y equipos', 'personas', 'equipos', 'liderazgo', 'disc', 'plantilla'], d: 'Perfiles de cada persona, puestos y encaje, equipos, liderazgo a medida y planes de desarrollo.', primero: 'Da de alta la plantilla y pasa el primer test.', plan: 'personas' },
    mesa: { url: 'mesa.html', n: 'la mesa de trabajo', k: ['mesa de trabajo', 'mesa', 'agenda', 'prioridades', 'mis tareas', 'tareas'], d: 'Todo el trabajo del ecosistema en una sola mesa: lo de hoy, la bandeja, el 20 % que da el resultado, la agenda y las metas SMART.', primero: 'Trae el trabajo del ecosistema y revisa tu 20 %.' },
    libro: { url: 'libro.html', n: 'el libro corporativo', k: ['libro corporativo', 'libro de la empresa', 'libro', 'todos los informes'], d: 'Todos los informes del ecosistema en un libro de la empresa, con índice por secciones y descarga en PDF.', primero: 'Pulsa «Recoger todos los informes» si aún está vacío.' },
    grupo: { url: 'grupo.html', n: 'la vista de grupo', k: ['vista de grupo', 'cartera de clientes', 'cartera', 'consolidado', 'sociedades del grupo'], d: 'Las empresas o sociedades de la cuenta juntas: consolidado, comparativa, riesgos cruzados y objetivos.', grupo: true }
  };
  const mundoActual = () => ({ 'app.html': 'simulador', 'estrategia.html': 'estrategia', 'personas.html': 'personas', 'mesa.html': 'mesa', 'grupo.html': 'grupo', 'portal.html': 'inicio', 'libro.html': 'libro' }[PG()] || 'inicio');
  const disponible = (k) => {
    const P = A.platform, w = MUNDOS[k]; if (!w) return false;
    if (w.plan && P && P.puede && !P.puede(w.plan)) return false;
    if (w.grupo && P && P.esGrupo && !P.esGrupo()) return false;
    return true;
  };
  const destinos = () => {
    const p = PG(), $$ = (s) => Array.from(document.querySelectorAll(s));
    if (p === 'app.html') return $$('#dock [data-nav]').map((b) => ({ id: b.dataset.nav, n: b.getAttribute('aria-label') }));
    if (p === 'estrategia.html' && A.strat && A.strat.modules) return A.strat.modules.map((m) => ({ id: m.id, n: m.nombre, g: m.grupo }));
    if (p === 'personas.html' && A.personas && A.personas.modules) return A.personas.modules.map((m) => ({ id: m.id, n: m.nombre, g: m.grupo }));
    if (p === 'mesa.html') return $$('#msTabs [data-t]').map((b) => ({ id: b.dataset.t, n: (b.firstChild && b.firstChild.textContent || b.textContent).trim() }));
    return [];
  };
  const cerrarMapas = () => { const ov = document.getElementById('rutaMap'); if (ov && !ov.hidden) { [A.rutaEst, A.rutaPer].forEach((r) => r && r.closeMap && r.closeMap()); if (!ov.hidden) ov.hidden = true; document.body.style.overflow = ''; return true; } return false; };
  const irZona = (id) => {
    const p = PG(), d = destinos().find((x) => x.id === id); if (!d) return null;
    cerrarVentanas(true);
    if (p === 'app.html') { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
    else if (p === 'estrategia.html') A.strat.show(id);
    else if (p === 'personas.html') A.personas.show(id);
    else if (p === 'mesa.html') { const b = document.querySelector(`#msTabs [data-t="${id}"]`); if (b) b.click(); }
    return d;
  };
  const puntua = (t, nombre) => { const n = norm(nombre); if (!n) return 0; if (t.includes(n)) return 10 + n.length; let p = 0; n.split(/\s+/).filter((w) => w.length > 4).forEach((w) => { if (t.includes(w)) p += w.length; }); return p >= 6 ? p : 0; };
  const buscarZona = (t) => { let mejor = null, pt = 0; destinos().forEach((d) => { const p = puntua(t, d.n) || (t.includes(norm(d.id)) && d.id.length > 3 ? 8 + d.id.length : 0); if (p > pt) { pt = p; mejor = d; } }); return mejor ? { d: mejor, p: pt } : null; };
  const buscarMundo = (t) => { let mejor = null, pt = 0; Object.keys(MUNDOS).forEach((k) => MUNDOS[k].k.forEach((w) => { const n = norm(w); if (t.includes(n) && 10 + n.length > pt) { pt = 10 + n.length; mejor = k; } })); return mejor ? { k: mejor, p: pt } : null; };
  function cerrarVentanas(silencio) {
    let n = 0;
    const rp = document.getElementById('report'); if (rp && !rp.hidden) { const b = rp.querySelector('#rpClose'); if (b) b.click(); else rp.hidden = true; n++; }
    document.querySelectorAll('.ef-back').forEach((x) => { x.remove(); n++; });
    if (cerrarMapas()) n++;
    if (A.manualLateral && A.manualLateral.abierto()) { A.manualLateral.cerrar(); n++; }
    const md = document.getElementById('modal'); if (md && !md.hidden) n++;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.body.style.overflow = '';
    return silencio ? n : { cerradas: n };
  }
  let viajePendiente = null;
  const viajar = (k, zona) => {
    const w = MUNDOS[k]; if (!w) return { ok: false, motivo: 'Ese mundo no existe. Mundos: ' + Object.keys(MUNDOS).join(', ') };
    if (!disponible(k)) return { ok: false, motivo: w.plan ? 'Personas y equipos está incluido en el plan Consultora.' : 'La vista de grupo es de los planes con varias empresas.' };
    if (k === mundoActual()) { if (zona) { const z = buscarZona(norm(zona)); if (z) { irZona(z.d.id); return { ok: true, yaEstaba: true, zona: z.d.n }; } } return { ok: true, yaEstaba: true, mundo: w.n }; }
    SS.set('atalaya.guia.llegada', { mundo: k, zona: zona || '', t: Date.now() });
    viajePendiente = w.url;
    return { ok: true, mundo: w.n, queHay: w.d, primero: w.primero || '' };
  };
  function guiaTools() {
    return [
      { name: 'donde_estoy', description: 'Dice en qué mundo y zona está el usuario, qué zonas (módulos, capítulos o pestañas) tiene este mundo y a qué otros mundos puede ir con su plan.', inputSchema: { type: 'object', properties: {} }, run: () => ({ mundo: MUNDOS[mundoActual()].n, queHay: MUNDOS[mundoActual()].d, zonaActual: zonaActual(), zonas: destinos().map((d) => d.n + (d.g ? ' (' + d.g + ')' : '')), mundos: Object.keys(MUNDOS).filter(disponible).map((k) => k + ': ' + MUNDOS[k].n) }) },
      { name: 'ir_a_mundo', description: 'Lleva al usuario a otro mundo de Atalaya 360°: inicio, simulador, estrategia, personas, mesa o grupo. Opcionalmente, a una zona concreta de ese mundo (nombre del módulo, capítulo o pestaña). La conversación continúa al llegar.', inputSchema: { type: 'object', properties: { mundo: { type: 'string', enum: Object.keys(MUNDOS) }, zona: { type: 'string' } }, required: ['mundo'] }, run: (i) => viajar(i.mundo, i.zona) },
      { name: 'ir_a_zona', description: 'Abre una zona del mundo actual: un módulo, un capítulo o una pestaña (por nombre). En el simulador también acepta la ruta de una variable para llevar a su campo.', inputSchema: { type: 'object', properties: { destino: { type: 'string' } }, required: ['destino'] }, run: (i) => { if (PG() === 'app.html' && api && api.goTo && /\./.test(i.destino)) return api.goTo(i.destino); const z = buscarZona(norm(i.destino)) || (destinos().find((d) => d.id === i.destino) ? { d: destinos().find((d) => d.id === i.destino) } : null); if (!z) return { ok: false, zonas: destinos().map((d) => d.n) }; irZona(z.d.id); return { ok: true, zona: z.d.n }; } },
      { name: 'cerrar', description: 'Cierra lo que está abierto: «ventanas» (informes, mapas, diálogos y el manual), «manual», o «mundo» (sale del mundo actual y vuelve al inicio).', inputSchema: { type: 'object', properties: { que: { type: 'string', enum: ['ventanas', 'manual', 'mundo'] } }, required: ['que'] }, run: (i) => (i.que === 'mundo' ? viajar('inicio') : i.que === 'manual' ? (A.manualLateral && A.manualLateral.cerrar(), { ok: true }) : cerrarVentanas()) },
      { name: 'abrir_manual', description: 'Abre el manual en el lateral, en el apartado de un tema («metas SMART», «semáforos», «liderazgo») o, sin tema, en el de la zona actual.', inputSchema: { type: 'object', properties: { tema: { type: 'string' } } }, run: (i) => (A.manualLateral ? A.manualLateral.abrirTema(i.tema) : { ok: false }) }
    ];
  }
  const zonaActual = () => {
    try {
      const p = PG();
      if (p === 'estrategia.html' && A.strat.current) { const m = A.strat.mod(A.strat.current()); return m && m.nombre; }
      if (p === 'personas.html' && A.personas.current) { const m = A.personas.mod(A.personas.current()); return m && m.nombre; }
      if (p === 'mesa.html') { const b = document.querySelector('#msTabs [aria-selected="true"]'); return b && b.firstChild.textContent.trim(); }
      if (p === 'app.html') { let id = null; document.querySelectorAll('section.chapter[id]').forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.45) id = s.id; }); const d = destinos().find((x) => x.id === id); return d && d.n; }
    } catch (e) { /* sin zona */ }
    return null;
  };
  const listaY = (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1] : l[0] || '');
  const aDe = (t) => t.replace(/\ba el\b/g, 'al').replace(/\bde el\b/g, 'del');
  /* Órdenes de guía en lenguaje llano: se resuelven aquí, al momento, con cualquiera de los tres cerebros */
  function guiaLocal(text) {
    const t = norm(text).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^(para|silencio|calla|basta|apaga la voz|desactiva la voz|deja de escuchar|no escuches)\b/.test(t)) { setVoz(false); return 'De acuerdo, dejo de escuchar. Cuando quieras, vuelve a activar la voz.'; }
    if (/\b(cierra|cerrar|quita|sal de|salir de|salte de)\b/.test(t)) {
      if (/manual/.test(t)) { A.manualLateral && A.manualLateral.cerrar(); return 'Manual cerrado.'; }
      if (/\b(mundo|simulador|sistema|estrategia|personas|mesa|grupo)\b/.test(t) && !/(informe|ventana|mapa)/.test(t)) { const r = viajar('inicio'); return r.ok ? 'Salimos al inicio. Desde allí puedes entrar en cualquier mundo.' : r.motivo; }
      const n = cerrarVentanas(true); return n ? 'Cerrado. ¿Dónde quieres ir ahora?' : 'No hay nada abierto que cerrar.';
    }
    if (/\bmanual\b/.test(t) && /\b(abre|abrir|ensena|muestra|ver|mira|consulta|como se usa|ayuda)\b/.test(t)) {
      const tema = (t.match(/manual (?:de|del|sobre|en|para) (?:la |el |los |las )?(.+)$/) || [])[1];
      if (A.manualLateral) { A.manualLateral.abrirTema(tema).then((r) => r && r.apartado && note('Manual abierto en «' + r.apartado + '».')); return tema ? `Abro el manual en lo que explica ${tema}.` : 'Abro el manual en el apartado de esta zona. Arriba tienes el menú para ir a cualquier otro.'; }
    }
    if (/\b(donde estoy|que hay aqui|que puedo hacer|guiame|guia|por donde empiezo|que hago aqui|ayudame a moverme|que mundos)\b/.test(t)) {
      const w = MUNDOS[mundoActual()], z = zonaActual(), ds = destinos().map((d) => d.n);
      const otros = Object.keys(MUNDOS).filter((k) => k !== mundoActual() && disponible(k)).map((k) => MUNDOS[k].n);
      return `Estás en ${w.n}${z ? ', en «' + z + '»' : ''}. ${w.d}${w.primero ? ' ' + w.primero : ''}${ds.length ? ' Aquí puedes ir a ' + listaY(ds.slice(0, 6)) + (ds.length > 6 ? ', entre otras' : '') + '.' : ''} ${aDe('También puedo llevarte a ' + listaY(otros))}. Di por ejemplo «llévame a la mesa de trabajo» o «abre el manual».`;
    }
    if (/\b(llevame|lleva me|ve a|vete a|vamos a|ir a|quiero ir|abre|abrir|entra en|entrar en|ensename|muestrame|pasa a|cambia a|ponme en|abreme|voy a)\b/.test(t)) {
      const m = buscarMundo(t), z = buscarZona(t);
      if (m && (!z || m.p >= z.p || /\bmundo\b/.test(t))) {
        const resto = z && z.d ? z.d.n : '';
        const r = viajar(m.k, m.k !== mundoActual() ? '' : resto);
        if (!r.ok) return r.motivo;
        if (r.yaEstaba) return r.zona ? `Abro «${r.zona}».` : `Ya estás en ${MUNDOS[m.k].n}.`;
        return `Te llevo a ${r.mundo}. ${r.queHay}`;
      }
      if (z) { irZona(z.d.id); return `Abro «${z.d.n}».`; }
    }
    return null;
  }
  /* Al llegar a un mundo después de un viaje pedido al asistente */
  function alLlegar() {
    const l = SS.get('atalaya.guia.llegada'); if (!l || Date.now() - l.t > 120000 || l.mundo !== mundoActual()) return; SS.del('atalaya.guia.llegada');
    const w = MUNDOS[l.mundo];
    setTimeout(() => {
      let z = null; if (l.zona) { z = buscarZona(norm(l.zona)); if (z) irZona(z.d.id); }
      const txt = `Ya estás en ${w.n}${z ? ', en «' + z.d.n + '»' : ''}. ${w.primero || w.d}`;
      add('bot', txt); guardarLog('assistant', txt); hablar(txt).then(() => voz && escuchar());
    }, 1200);
  }

  /* ---------- Cerebro 1: servidor con Claude ---------- */
  async function viaServer(history) {
    const tools = toolDefs();
    const defs = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
    const msgs = history.map((m) => ({ role: m.role, content: m.content }));
    for (let round = 0; round < 6; round++) {
      const r = await A.platform.api('/chat', { method: 'POST', body: JSON.stringify({ messages: msgs, tools: defs, page }) });
      if (r.stop_reason === 'refusal') return 'No puedo ayudarte con esa petición. Prueba a formularla de otra manera.';
      msgs.push({ role: 'assistant', content: r.content });
      const uses = r.content.filter((b) => b.type === 'tool_use');
      if (!uses.length || r.stop_reason !== 'tool_use') return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      const results = [];
      for (const u of uses) {
        const t = tools.find((x) => x.name === u.name);
        try { activity(u.name); results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(t ? await t.run(u.input || {}) : { error: 'herramienta desconocida' }) }); }
        catch (e) { results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify({ error: e.message }), is_error: true }); }
      }
      msgs.push({ role: 'user', content: results });
    }
    return 'He hecho varios ajustes; revisa los semáforos y dime si quieres seguir.';
  }

  /* ---------- Cerebro 2: capacidad «sample» del visor de Claude ---------- */
  let samplePromise = null;
  function getSample() {
    if (!samplePromise) samplePromise = (window.claude && window.claude.use) ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);
    return samplePromise;
  }
  let sampleDenied = false;
  async function viaSample(history, onText) {
    const sample = await getSample();
    if (!sample || sampleDenied) return null;
    const tools = toolDefs().map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, execute: async (i) => { activity(t.name); try { return await t.run(i || {}); } catch (e) { return { error: e.message }; } } }));
    const turns = [{ role: 'user', content: SYSTEM + '\n\nA partir de aquí habla el empresario.' }, { role: 'assistant', content: 'Entendido. Estoy listo para ayudar.' }].concat(history.map((m) => ({ role: m.role, content: m.content })));
    try {
      const r = await sample(turns, { tools, onText: ({ text }) => onText && onText(text) });
      return r.text;
    } catch (e) {
      if (e && (e.code === 'not_granted' || e.code === 'unavailable')) sampleDenied = true;
      if (e && e.text) return e.text;
      return null;
    }
  }

  /* ---------- Cerebro 3: intérprete local ---------- */
  const VARS = [
    [['parte financiada', 'financiacion', 'financiado', 'financiar', '% financiado', 'prestamo'], 'inversion.pctFin'],
    [['plazo'], 'inversion.plazo'], [['carencia'], 'inversion.carencia'], [['tipo de interes', 'interes', 'tipo del prestamo'], 'inversion.tipo'],
    [['importe', 'inversion'], 'inversion.importe'], [['aportacion', 'capital de los socios', 'ampliacion'], 'inversion.aportacion'],
    [['venta nueva', 'ventas nuevas', 'incremento de ventas'], 'inversion.incVentas'], [['margen nuevo', 'margen de la actividad nueva'], 'inversion.margenNuevo'],
    [['rampa'], 'inversion.rampa'], [['fijos nuevos', 'gastos fijos nuevos'], 'inversion.fijosNuevos'], [['contrataciones', 'contratar', 'personas nuevas'], 'inversion.contrataciones'],
    [['salario', 'coste por persona', 'sueldo'], 'inversion.salario'], [['anticipo'], 'inversion.anticipo'], [['vida util'], 'inversion.vidaUtil'],
    [['poliza', 'linea de credito', 'credito'], 'empresa.polizaLimite'], [['caja'], 'empresa.caja'], [['dias de cobro', 'cobro', 'cobrar', 'dso'], 'empresa.dso'],
    [['dias de pago', 'pago a proveedores', 'pagar a proveedores', 'dpo'], 'empresa.dpo'], [['stock', 'existencias', 'almacen'], 'empresa.dio'],
    [['margen bruto', 'margen'], 'empresa.margen'], [['ventas', 'facturacion'], 'empresa.ventas'], [['coste de personal', 'personal'], 'empresa.personal'],
    [['mandos', 'responsables'], 'humano.mandos'], [['procesos'], 'humano.procesos'], [['dependencia', 'fundador'], 'humano.dependencia'], [['rotacion'], 'humano.rotacion'],
    [['caja minima objetivo', 'meta de caja', 'liquidez objetivo'], 'meta.cajaMin']
  ];
  const SCEN = { estres: ['estres', 'estrés', 'stress'], pesimista: ['pesimista'], base: ['base'], optimista: ['optimista'], hipotesis: ['hipotesis', 'mi escenario'] };
  const STRUCT = { directa: ['directa'], leasing: ['leasing', 'renting'], filial: ['filial'], patrimonial: ['patrimonial'], socio: ['socio inversor', 'inversor', 'socio'], jv: ['joint venture', 'jv', 'socio industrial'] };
  function numberIn(t) {
    const m = t.match(/(-?\d+(?:[.,]\d+)*)\s*(millones|millon|m€|mill|k€|k\b|mil\b|%|por ciento|dias|días|meses|anos|años|puntos|pp)?/);
    if (!m) return null;
    let s = m[1]; if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
    let v = parseFloat(s);
    const u = norm(m[2] || '');
    if (/millon|m€|mill/.test(u)) v *= 1e6; else if (/^k|mil/.test(u)) v *= 1e3;
    return { v, u };
  }
  function findVar(t) {
    let best = null, len = 0;
    VARS.forEach(([syn, p]) => syn.forEach((s) => { const n = norm(s); if (t.includes(n) && n.length > len) { best = p; len = n.length; } }));
    return best;
  }
  function localStrategy(text) {
    const t = norm(text);
    const S = api.summary();
    const LEV = [['precio', ['precio', 'precios', 'tarifa']], ['volumen', ['volumen', 'esfuerzo comercial', 'vender mas']], ['costeVariable', ['coste variable', 'compras', 'materia']], ['fijos', ['fijos', 'gastos fijos', 'estructura']], ['mix', ['mix']]];
    const n = numberIn(t);
    if (n && /(sube|baja|pon|cambia|reduce|aumenta|prueba)/.test(t)) {
      const lv = LEV.find(([, syn]) => syn.some((x) => t.includes(x)));
      if (lv) { let v = n.v; if (/(baja|reduce)/.test(t) && v > 0) v = -v; const r = api.setLever(lv[0], v); return `He puesto la palanca de ${lv[0] === 'costeVariable' ? 'coste variable' : lv[0]} en ${v} %. El resultado operativo pasa de ${r.resultadoAntes} a ${r.resultadoAhora}.`; }
    }
    const ALIAS = { clientes: 'ventas', proveedores: 'ventas', abc: 'ventas', concentracion: 'ventas', dafo: 'plan', came: 'plan', valores: 'plan', mision: 'plan' };
    const al = Object.keys(ALIAS).find((k) => t.includes(k));
    const mod = S.modulos.find((m) => t.includes(norm(m.nombre)) || t.includes(m.id)) || (al && S.modulos.find((m) => m.id === ALIAS[al]));
    if (mod && /(abre|ve a|ir a|llevame|muestra|ensena|como va|como esta)/.test(t)) {
      api.goTo(mod.id);
      const k = S.indicadores.filter((x) => x.area === mod.nombre);
      return `Abro ${mod.nombre}. ${k.map((x) => `${x.indicador}: ${x.valor}${x.estado ? ' (' + x.estado.toLowerCase() + ')' : ''}`).join('; ')}`;
    }
    if (/(riesgo|preocup|peligro)/.test(t)) return S.riesgos.length ? 'Los riesgos principales son: ' + S.riesgos.slice(0, 4).map((r) => `${r.riesgo.toLowerCase()} (${r.area.toLowerCase()})`).join('; ') + '. Primera medida: ' + S.riesgos[0].mitigacion : 'No veo riesgos altos con los datos actuales.';
    if (/(mejora|oportunidad|donde gano|ahorro|que hago)/.test(t)) return S.hallazgos.length ? 'Las mayores oportunidades: ' + S.hallazgos.slice(0, 4).map((h) => `${h.hallazgo} (${h.impactoAnual} al año)`).join(' ') : 'Completa los módulos para encontrar oportunidades.';
    if (/(resumen|como va|como esta|situacion)/.test(t)) { const red = S.indicadores.filter((x) => x.estado === 'Rojo'); return `Estás en ${S.moduloActual}. ${red.length ? 'Indicadores en rojo: ' + red.slice(0, 5).map((x) => `${x.indicador.toLowerCase()} (${x.area.toLowerCase()}): ${x.valor}`).join('; ') + '.' : 'No hay indicadores en rojo.'}`; }
    return null;
  }
  function local(text) {
    const g = guiaLocal(text); if (g) return g;
    // Mundos sin cálculos propios para el asistente (personas y equipos, mesa de trabajo): guía y diccionario
    if (!api || !api.summary) { const L = lookup(norm(text).replace(/^(que es|que son|que significa|explicame|explica|no entiendo|como funciona|define)\s+(el |la |los |las |un |una )?/, '').replace(/[?¿.!]/g, '').trim()); if (L.diccionario.length) { const d = L.diccionario[0]; return `${d.termino}: ${d.definicion}`; } return guiaLocal('donde estoy') + ' Si me lo preguntas, también te explico cómo funciona cada herramienta o abro el manual en ese apartado.'; }
    if (page !== 'simulador') { const r = localStrategy(text); if (r) return r; const L = lookup(norm(text).replace(/^(que es|que son|que significa|explicame|explica|no entiendo|como funciona|define)\s+(el |la |los |las |un |una )?/, '').replace(/[?¿.!]/g, '').trim()); if (L.diccionario.length) { const d = L.diccionario[0]; return `${d.termino}: ${d.definicion}${d.ejemplo ? ' Por ejemplo: ' + d.ejemplo : ''}`; } if (L.grupo.length) return `${L.grupo[0].tema}: ${L.grupo[0].explicacion}`; return 'Puedo explicarte un concepto («qué es el OEE»), llevarte a un módulo («abre impuestos»), decirte los riesgos o las mejoras principales, o mover palancas («sube el precio un 3 %»).'; }
    const t = norm(text);
    const S = api.summary();
    const fmtL = (l) => `${l.indicador}: ${l.valor}, en ${l.estado.toLowerCase()}. Verde ${l.verde}; ámbar ${l.ambar}; rojo ${l.rojo}.`;
    // Acciones
    if (/aplica(r)? (el )?plan/.test(t) && api.applyPlan) { const r = api.applyPlan(); return r.aplicado ? `He aplicado el plan de corrección. El veredicto ahora es «${r.veredicto}».` : r.motivo; }
    for (const k of Object.keys(SCEN)) if (SCEN[k].some((s) => t.includes(s)) && /(escenario|activa|cambia|pon|ver|muestra)/.test(t) && api.setScenario) { const r = api.setScenario(k); return `Escenario ${k} activado. Veredicto: ${r.veredicto}.`; }
    if (/(adopta|usa|cambia a|pasa a|elige)/.test(t) && api.setStructure) for (const k of Object.keys(STRUCT)) if (STRUCT[k].some((s) => t.includes(s))) { const r = api.setStructure(k); return `He adoptado la estructura «${r.estructura}». Liquidez mínima: ${r.liquidezMinima}. Veredicto: ${r.veredicto}.`; }
    if (/(pierd|perdida de|perder) (un |el |a )?(cliente)/.test(t) && api.addHyp) { const n = numberIn(t); const mes = (t.match(/mes (\d+)/) || [])[1]; const r = api.addHyp('cliente', mes ? +mes : 12, 60, n && n.u !== 'meses' ? n.v : 10); return `He simulado la pérdida de un cliente${n ? ' del ' + n.v + ' % de la venta' : ''}. Liquidez mínima: ${r.liquidezMinima}. Veredicto: ${r.veredicto}.`; }
    if (/(sube|subida|suben) (de )?(los )?tipos/.test(t) && api.addHyp) { const n = numberIn(t); const r = api.addHyp('tipos', 12, 60, n ? n.v : 1.5); return `He simulado una subida de tipos de ${n ? n.v : 1.5} puntos desde el mes 12. Liquidez mínima: ${r.liquidezMinima}. Veredicto: ${r.veredicto}.`; }
    if (/(pon|sube|baja|cambia|aumenta|reduce|prueba con|ajusta|fija|amplia|alarga|acorta)/.test(t) && api.setVar) {
      const p = findVar(t), n = numberIn(t);
      if (p && n) {
        const st = api.getState(); const [a, b] = p.split('.'); const cur = st[a][b];
        let v = n.v;
        const rel = /(sube|aumenta|amplia|alarga)\b.*\b(en|un)\b/.test(t) || / mas\b/.test(t);
        const relDown = /(baja|reduce|acorta)\b.*\b(en|un)\b/.test(t) || / menos\b/.test(t);
        if (rel && n.u === '%' && !/pctFin|margen|incVentas|procesos|dependencia|rotacion/.test(p)) v = cur * (1 + n.v / 100);
        else if (rel) v = cur + n.v; else if (relDown) v = cur - n.v;
        const r = api.setVar(p, Math.round(v * 100) / 100);
        return `He cambiado ${r.variable.toLowerCase()} de ${r.antes} a ${r.ahora}. La liquidez mínima pasa de ${r.liquidezMinimaAntes} a ${r.liquidezMinimaAhora} y el veredicto ${r.veredictoAntes === r.veredictoAhora ? 'sigue en «' + r.veredictoAhora + '»' : 'pasa de «' + r.veredictoAntes + '» a «' + r.veredictoAhora + '»'}.`;
      }
      if (p && !n) return `¿A qué valor quieres poner ${A.fieldLabel(p).toLowerCase()}? Por ejemplo: «pon ${A.fieldLabel(p).toLowerCase()} a ${S.variables[p]}».`;
    }
    // Semáforos
    const lights = S.semaforos || [];
    const l = lights.find((x) => t.includes(norm(x.indicador)) || (x.clave && t.includes(x.clave)));
    if (l && /(semaforo|rojo|ambar|verde|por que|como|mejor|corrig|arregl|subir|bajar|que hago)/.test(t)) {
      return `${fmtL(l)} Lo mueven directamente: ${l.directas.map((p) => A.fieldLabel(p).toLowerCase()).join(', ')}. ${l.consejo}`;
    }
    // Preocupaciones
    if (/(preocup|miedo|riesgo|peligro|me quita el sueno|que puede salir mal|aguanta)/.test(t)) {
      const reds = lights.filter((x) => x.estado !== 'Verde');
      return `Veredicto: ${S.veredicto}. ${reds.length ? 'Lo que más debe preocuparte: ' + reds.slice(0, 3).map((x) => `${x.indicador.toLowerCase()} (${x.valor}, ${x.estado.toLowerCase()})`).join('; ') + '. ' : 'Todos los semáforos están en verde. '}Tu liquidez mínima es ${S.cifras.liquidezMinima} en el mes ${S.cifras.mesLiquidezMinima}, con ${String(S.cifras.colchonMinimoMeses).replace('.', ',')} meses de colchón. ${reds[0] ? 'Primera acción: ' + reds[0].consejo : ''}`;
    }
    if (/(resumen|como estoy|como va|situacion|veredicto|puedo invertir|me lo puedo permitir|que me recomiendas)/.test(t)) {
      return `Escenario ${S.escenario.toLowerCase()}, estructura ${S.estructura.toLowerCase()}. Veredicto: ${S.veredicto}. Liquidez mínima ${S.cifras.liquidezMinima} en el mes ${S.cifras.mesLiquidezMinima}; recuperación en ${S.cifras.recuperacion}; cuota nueva de ${S.cifras.cuotaNueva}. ${Array.isArray(S.plan) && S.plan.length ? 'Para alcanzar tu meta: ' + S.plan.join('; ') + '.' : ''}`;
    }
    if (/(compara|cual es mejor|que estructura)/.test(t) && api.compareStructures) {
      const c = api.compareStructures();
      return `La que mejor encaja es ${c[0].estructura.toLowerCase()} (${c[0].encaje} puntos): liquidez mínima ${c[0].liquidezMinima}, recuperación ${c[0].recuperacion}, control ${c[0].control}. Le siguen ${c[1].estructura.toLowerCase()} y ${c[2].estructura.toLowerCase()}. Toca cada tarjeta en «Estructuras societarias» para ver su ficha completa.`;
    }
    // Conceptos, grupos y estructuras
    const q = t.replace(/^(que es|que son|que significa|explicame|explica|no entiendo|como funciona|que quiere decir|define|dime que es)\s+(el |la |los |las |un |una )?/, '').replace(/[?¿.!]/g, '').trim();
    const L = lookup(q);
    if (L.estructuras.length) { const e = L.estructuras[0]; return `${e.estructura}: ${e.comoFunciona} A favor: ${e.ventajas.slice(0, 2).join('; ').toLowerCase()}. En contra: ${e.inconvenientes.slice(0, 2).join('; ').toLowerCase()}. La fiscalidad concreta debe confirmarla tu asesor.`; }
    if (L.grupo.length) return `${L.grupo[0].tema}: ${L.grupo[0].explicacion}`;
    if (L.diccionario.length) { const d = L.diccionario[0]; return `${d.termino}: ${d.definicion}${d.ejemplo ? ' Por ejemplo: ' + d.ejemplo : ''}${d.directas.length ? ' Lo mueven: ' + d.directas.join(', ').toLowerCase() + '.' : ''}`; }
    if (/(grupo|sociedades|holding)/.test(t)) return 'En un grupo, una holding suele poseer la sociedad operativa y una patrimonial. El dinero se mueve con dividendos (exentos al 95 % entre sociedades del grupo si se cumplen requisitos) y préstamos intragrupo a tipo de mercado; con un 75 % de participación pueden consolidar fiscalmente. Pregúntame por cualquiera de esos conceptos.';
    return 'Puedo explicarte cualquier concepto («qué es el EBITDA»), revisar tu situación («¿me lo puedo permitir?»), decirte cómo poner en verde un semáforo («¿cómo mejoro la liquidez?») o hacer cambios («pon la financiación al 80 %», «sube el plazo a 9 años», «simula perder un cliente del 10 % en el mes 14», «adopta la filial»).';
  }

  /* ---------- Voz ----------
     Dos formas: dictar una pregunta con el micrófono, o la conversación por voz: con el interruptor encendido
     el asistente escucha sin pulsar nada, responde en voz alta y vuelve a escuchar. Se recuerda al cambiar de
     mundo. Mientras habla deja de escuchar, para no oírse a sí mismo; «para» o «silencio» lo apaga. */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const VOZK = 'atalaya.voz';
  let rec = null, listening = false, speak = false, voz = false, hablando = false, fallos = 0;
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  function vozES() { const vs = window.speechSynthesis ? speechSynthesis.getVoices() : []; return vs.find((x) => /^es(-|_)ES/i.test(x.lang) && /google|natural|online/i.test(x.name)) || vs.find((x) => /^es(-|_)ES/i.test(x.lang)) || vs.find((x) => /^es/i.test(x.lang)); }
  /* Lee el texto frase a frase (los navegadores cortan las locuciones largas) y avisa al terminar */
  function hablar(text) {
    return new Promise((res) => {
      if (!speak || !window.speechSynthesis || !text) return res();
      try {
        speechSynthesis.cancel();
        const frases = String(text).replace(/[*_#•«»]/g, '').match(/[^.!?;\n]+[.!?;]?/g) || [text];
        hablando = true; pararEscucha(); marcar();
        let i = 0, hecho = false;
        const fin = () => { if (hecho) return; hecho = true; hablando = false; marcar(); res(); };
        const v = vozES();
        const sig = () => {
          if (i >= frases.length || !speak) return fin();
          const u = new SpeechSynthesisUtterance(frases[i++].trim()); u.lang = 'es-ES'; if (v) u.voice = v; u.rate = 1.03;
          u.onend = sig; u.onerror = fin; speechSynthesis.speak(u);
        };
        sig();
        setTimeout(fin, Math.min(90000, 4000 + String(text).length * 90));
      } catch (e) { hablando = false; res(); }
    });
  }
  const speakOut = (t) => hablar(t);
  function marcar() {
    const f = $('#asVozBtn'), st = $('#asVozSt');
    if (f) { f.classList.toggle('on', voz); f.classList.toggle('oye', voz && listening); f.classList.toggle('habla', hablando); f.setAttribute('aria-pressed', String(voz)); f.title = voz ? 'Conversación por voz encendida: toca para apagarla' : 'Encender la conversación por voz'; }
    if (st) st.textContent = !voz ? '' : hablando ? 'Hablando…' : listening ? 'Te escucho' : busy ? 'Pensando…' : 'En pausa';
    const sw = $('#asVoz'); if (sw) { sw.setAttribute('aria-pressed', String(voz)); sw.setAttribute('aria-checked', String(voz)); }
    const sp = $('#asSpeak'); if (sp) { sp.setAttribute('aria-pressed', String(speak)); sp.setAttribute('aria-checked', String(speak)); }
  }
  function pararEscucha() { if (rec) { try { rec.onend = null; rec.abort(); } catch (e) { /* ya parado */ } } rec = null; listening = false; const m = $('#asMic'); if (m) { m.classList.remove('on'); m.setAttribute('aria-pressed', 'false'); } }
  function setVoz(on) {
    if (on && !SR) { note('Tu navegador no permite la conversación por voz. Funciona en Chrome, Edge y Safari recientes con la web en https.'); on = false; }
    voz = !!on; lsSet(VOZK, voz ? '1' : '0');
    if (voz) { speak = true; fallos = 0; escuchar(); } else { pararEscucha(); if (window.speechSynthesis) speechSynthesis.cancel(); hablando = false; }
    marcar();
  }
  function escuchar() {
    if (!voz || listening || hablando || busy || !SR) return;
    rec = new SR(); rec.lang = 'es-ES'; rec.interimResults = true; rec.continuous = false;
    const input = $('#asInput'); let fin = '';
    rec.onresult = (e) => { let inter = ''; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else inter += e.results[i][0].transcript; } if (input) input.value = (fin + ' ' + inter).trim(); };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { note('El micrófono no está permitido. Da permiso en el navegador para hablar con el asistente.'); setVoz(false); }
      else if (e.error !== 'no-speech' && e.error !== 'aborted') fallos++;
    };
    rec.onend = () => {
      listening = false; rec = null; marcar();
      const t = fin.trim();
      if (t) { fallos = 0; if (input) input.value = ''; send(t); return; }
      if (fallos > 4) { note('No consigo escuchar. Revisa el micrófono; he apagado la conversación por voz.'); setVoz(false); return; }
      if (voz) setTimeout(escuchar, 250);
    };
    try { rec.start(); listening = true; } catch (e) { listening = false; fallos++; if (voz && fallos <= 4) setTimeout(escuchar, 800); }
    marcar();
  }
  /* Dictado de una sola pregunta con el botón del micrófono */
  function toggleMic() {
    if (!SR) { note('Tu navegador no permite dictar. Funciona en Chrome, Edge y Safari recientes con la web abierta en https.'); return; }
    if (voz) { setVoz(false); return; }
    if (listening) { rec && rec.stop(); return; }
    rec = new SR(); rec.lang = 'es-ES'; rec.interimResults = true; rec.continuous = false;
    const input = $('#asInput');
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript; }
      input.value = (finalText + ' ' + interim).trim();
    };
    rec.onerror = (e) => { note(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'El micrófono no está permitido aquí. Da permiso en el navegador, o escribe tu pregunta.' : 'No te he oído bien. Prueba otra vez o escribe.'); };
    rec.onend = () => { listening = false; $('#asMic').classList.remove('on'); $('#asMic').setAttribute('aria-pressed', 'false'); if (finalText.trim()) send(finalText.trim()); };
    try { rec.start(); listening = true; $('#asMic').classList.add('on'); $('#asMic').setAttribute('aria-pressed', 'true'); speak = true; marcar(); }
    catch (e) { note('No se pudo activar el micrófono.'); }
  }

  /* ---------- Interfaz ---------- */
  const LOGK = 'atalaya.asistente.log';
  const history = [];
  let busy = false;
  function note(t) { add('note', t); }
  function activity(name) { const m = { cambiar_variable: 'Ajustando el simulador…', cambiar_escenario: 'Cambiando de escenario…', anadir_hipotesis: 'Añadiendo la hipótesis…', cambiar_estructura: 'Cambiando la estructura…', aplicar_plan: 'Aplicando el plan…', ver_situacion: 'Revisando tu situación…', comparar_estructuras: 'Comparando estructuras…', explicar_concepto: 'Buscando en el diccionario…', cambiar_palanca: 'Moviendo la palanca…', donde_estoy: 'Mirando dónde estás…', ir_a_mundo: 'Preparando el viaje…', ir_a_zona: 'Abriendo…', cerrar: 'Cerrando…', abrir_manual: 'Abriendo el manual…' }[name]; if (m) { const t = $('#asThinking'); if (t) t.textContent = m; } }
  function add(role, text) {
    const box = $('#asLog'); if (!box) return null;
    const el = document.createElement('div');
    el.className = 'msg ' + role;
    el.innerHTML = esc(text).replace(/\n/g, '<br>');
    box.appendChild(el); box.scrollTop = box.scrollHeight;
    return el;
  }
  /* La conversación sigue al pasar de un mundo a otro (en esta pestaña del navegador) */
  function guardarLog(role, content) { const l = SS.get(LOGK) || []; l.push({ role, content }); SS.set(LOGK, l.slice(-16)); }
  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (!voz) open();
    $('#asInput').value = '';
    add('user', text);
    history.push({ role: 'user', content: text }); guardarLog('user', text);
    busy = true; pararEscucha(); marcar();
    const bubble = add('bot', '');
    bubble.innerHTML = '<span id="asThinking" class="thinking">Pensando…</span>';
    let answer = null;
    try {
      answer = guiaLocal(text);
      if (!answer) {
        await A.platform.ready;
        if (A.platform.mode === 'server' && A.platform.serverInfo && A.platform.serverInfo.ia) {
          try { answer = await viaServer(history); } catch (e) { answer = null; }
        }
        if (!answer) answer = await viaSample(history, (t) => { bubble.textContent = t; });
        if (!answer) answer = local(text);
      }
    } catch (e) { answer = 'Ha habido un problema: ' + e.message; }
    bubble.innerHTML = esc(answer).replace(/\n/g, '<br>');
    history.push({ role: 'assistant', content: answer }); guardarLog('assistant', answer);
    if (history.length > 30) history.splice(0, history.length - 30);
    busy = false; marcar();
    $('#asLog').scrollTop = $('#asLog').scrollHeight;
    const viaje = viajePendiente; viajePendiente = null;
    if (viaje) { SS.set('atalaya.asistente.abierto', !$('#asPanel').hidden); await Promise.race([hablar(answer), new Promise((r) => setTimeout(r, speak ? 6000 : 900))]); location.href = viaje; return; }
    await hablar(answer);
    if (voz) escuchar();
  }
  function open() { const p = $('#asPanel'); if (p.hidden) { p.hidden = false; $('#asFab').setAttribute('aria-expanded', 'true'); setTimeout(() => $('#asInput').focus(), 50); } }
  function close() { $('#asPanel').hidden = true; $('#asFab').setAttribute('aria-expanded', 'false'); if (window.speechSynthesis && !voz) speechSynthesis.cancel(); }

  const SUGS = {
    simulador: ['¿Me lo puedo permitir?', '¿Qué me debería preocupar?', '¿Cómo pongo en verde la liquidez?', 'Pon la financiación al 80 %', 'Llévame a la mesa de trabajo', '¿Dónde estoy?', 'Abre el manual'],
    estrategia: ['¿Cómo va el presupuesto?', '¿Dónde está el mayor riesgo?', 'Sube el precio un 3 %', 'Abre impuestos', 'Llévame a personas y equipos', '¿Dónde estoy?', 'Abre el manual'],
    personas: ['¿Dónde estoy?', 'Abre liderazgo a medida', 'Abre el plan de desarrollo', 'Llévame a la mesa de trabajo', 'Abre el manual de liderazgo', 'Cierra el mundo'],
    mesa: ['¿Dónde estoy?', 'Abre las metas SMART', 'Abre la agenda semanal', 'Abre el manual de metas', 'Llévame al sistema estratégico', 'Cierra el mundo']
  };
  const HOLA = {
    simulador: 'Hola. Cuéntame qué te preocupa de la inversión o pregúntame lo que no entiendas. Puedo hacer cambios por ti («pon el plazo a 9 años») y llevarte a cualquier sitio («llévame a la mesa de trabajo»).',
    estrategia: 'Hola. Puedo explicarte cualquier análisis, decirte dónde están los riesgos, mover las palancas estratégicas y llevarte a cualquier módulo o mundo.',
    personas: 'Hola. Soy tu guía en personas y equipos: dime a qué herramienta quieres ir, pide que abra el manual de cualquier tema o que te lleve a otro mundo.',
    mesa: 'Hola. Soy tu guía en la mesa de trabajo: dime qué parte quieres ver (hoy, prioridades, agenda, metas), pide el manual o que te lleve a otro mundo.'
  };
  A.assistant = {
    init(opts) {
      opts = opts || {};
      api = opts.api || null; page = opts.page || 'simulador';
      if ($('#asFab')) return;
      const wrap = document.createElement('div');
      wrap.className = 'assistant';
      wrap.innerHTML = `<div class="as-bar"><span class="as-vozst" id="asVozSt" aria-live="polite"></span><button class="as-voz" id="asVozBtn" type="button" aria-pressed="false" aria-label="Conversación por voz"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><button class="as-fab" id="asFab" aria-expanded="false" aria-controls="asPanel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg><span>Asistente</span></button></div>
        <section class="as-panel glass" id="asPanel" hidden aria-label="Asistente de Atalaya">
          <header><div><b>Asistente y guía</b><small id="asMode"></small></div><button class="icon-btn" id="asClose" aria-label="Cerrar">×</button></header>
          <div class="as-log" id="asLog" aria-live="polite"></div>
          <div class="as-sugs" id="asSugs"></div>
          <form id="asForm"><button type="button" class="icon-btn as-mic" id="asMic" aria-pressed="false" aria-label="Dictar una pregunta"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><input class="input" id="asInput" placeholder="Escribe o habla: «llévame a…», «¿me lo puedo permitir?»" autocomplete="off"><button class="btn solid" type="submit">Enviar</button></form>
          <label class="as-speak"><button type="button" class="switch" role="switch" id="asVoz" aria-pressed="false" aria-label="Conversación por voz"></button> Conversación por voz: escucha sin pulsar y responde hablando</label>
          <label class="as-speak"><button type="button" class="switch" role="switch" id="asSpeak" aria-pressed="false" aria-label="Leer las respuestas en voz alta"></button> Leer las respuestas en voz alta</label>
        </section>`;
      document.body.appendChild(wrap);
      $('#asFab').onclick = () => ($('#asPanel').hidden ? open() : close());
      $('#asClose').onclick = close;
      $('#asForm').onsubmit = (e) => { e.preventDefault(); send($('#asInput').value); };
      $('#asMic').onclick = toggleMic;
      $('#asVozBtn').onclick = () => setVoz(!voz);
      $('#asVoz').onclick = () => setVoz(!voz);
      $('#asSpeak').onclick = () => { speak = !speak; if (!speak) { if (window.speechSynthesis) speechSynthesis.cancel(); if (voz) setVoz(false); } marcar(); };
      const sugs = SUGS[page] || SUGS.estrategia;
      $('#asSugs').innerHTML = sugs.map((s) => `<button class="chip" type="button">${s}</button>`).join('');
      $('#asSugs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) send(b.textContent); });
      // Conversación anterior (viene de otro mundo) o saludo
      const prev = SS.get(LOGK) || [];
      if (prev.length) { prev.forEach((m) => { add(m.role === 'user' ? 'user' : 'bot', m.content); history.push(m); }); }
      else add('bot', HOLA[page] || HOLA.estrategia);
      if (SS.get('atalaya.asistente.abierto')) { SS.del('atalaya.asistente.abierto'); open(); }
      if (window.speechSynthesis) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }
      if (lsGet(VOZK) === '1' && SR) { voz = true; speak = true; }
      marcar();
      alLlegar();
      if (voz && !SS.get('atalaya.guia.llegada')) setTimeout(escuchar, 900);
      A.platform.ready.then(async () => {
        const m = $('#asMode');
        if (A.platform.mode === 'server' && A.platform.serverInfo && A.platform.serverInfo.ia) m.textContent = 'Con Claude';
        else { const s = await getSample(); m.textContent = s ? 'Con Claude (te pedirá permiso)' : 'Modo básico sin conexión'; }
      });
    },
    ask(text) { send(text); },
    open,
    voz: (on) => setVoz(on),
    guia: { destinos, mundoActual, irZona, viajar, cerrarVentanas }
  };
})();
