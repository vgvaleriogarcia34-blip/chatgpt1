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
Habla en español claro, con frases cortas y sin jerga, y trata siempre de usted al empresario («su empresa», «puede», nunca «tu» ni «puedes»); si usas un término técnico o una sigla (EBITDA, DSCR, VAN, TIR, OTIF), di primero su nombre en palabras llanas y explícalo en una frase. Cifras en formato español (1.250.000 €, 3,5 %). Sin superlativos.
Antes de opinar sobre la situación de la empresa, consulta la herramienta ver_situacion. No inventes cifras: usa las del simulador.
Cuando el usuario pida cambiar algo («pon», «sube», «prueba con…»), hazlo con las herramientas y después explica qué ha cambiado (antes → ahora) y qué significa.
Si expresa una preocupación, identifica qué indicadores y variables de la empresa la afectan y propone de una a tres acciones concretas con cifras, empezando por las más sencillas.
Cuando analices o valores la empresa, redacta como un consultor de dirección que informa a su cliente. El sujeto es la empresa, nunca la aplicación. Empieza por la conclusión; apóyala en la cifra con su unidad y su periodo y, si existe, en la comparación con el año anterior o con el objetivo; di qué significa para la empresa y termina con la recomendación: qué hacer, impacto esperado y plazo. No presentes como hallazgo nada del funcionamiento de la aplicación (módulos, pasos, pantallas, documentos cargados o datos por introducir): si falta información para un análisis, di en una frase qué dato de la empresa no se ha podido analizar y sigue con lo que sí hay. Voz activa, sin superlativos ni adjetivos vacíos.
Para estructuras societarias y relaciones entre sociedades de un grupo (holding, filial, patrimonial, préstamos intragrupo, consolidación fiscal), explica cómo funcionan con ejemplos y recuerda que la fiscalidad la debe confirmar su asesor.
Responde en 3-8 frases salvo que pidan detalle. Tus respuestas pueden leerse en voz alta: no uses tablas, asteriscos ni símbolos.
También eres el guía de Atalaya 360°: llevas al usuario de un mundo a otro (puesto de mando, simulador de inversión, sistema estratégico, personas y equipos, auditoría integral, mesa de trabajo, tablero general, libro corporativo y grupo empresarial o cartera de clientes), a cualquier módulo, capítulo o pestaña, cierras ventanas, mapas e informes y abres el manual en el apartado que necesite. Usa donde_estoy para saber dónde está y qué hay, e ir_a_mundo, ir_a_zona, cerrar y abrir_manual para moverle. Cuando pida ir a un sitio, hazlo directamente y di en una o dos frases qué va a encontrar y qué conviene mirar primero.
Documentación de la empresa: cuando pregunte qué le falta, qué documentos tiene que subir, por dónde empezar o qué hacer después, consulta ver_plan_documentacion y responde con el siguiente documento, cómo se entrega, en qué pantalla y qué permitirá analizar; si quiere ir, usa ir_a_documento. Las esenciales que faltan cuentan 0 en la nota; las recomendadas no la bajan. Nunca marques un área como «no aplica» ni lo des por hecho: si cree que un área no corresponde a su actividad, explícale que puede marcarla la empresa con el botón «Esta área no aplica a mi empresa» de esa área, indicando el motivo.
Informes y reuniones: antes de recomendar o abrir un informe, consulta ver_informes; si saldrá incompleto o no tiene sentido todavía, dilo en una frase y ofrece abrirlo igualmente o ir a lo que falta. Ábrelo con abrir_informe. Para preparar una reunión usa preparar_orden_del_dia: el borrador no se guarda hasta que el usuario pulse «Guardar en la mesa de trabajo».`;

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
    inicio: { url: 'portal.html', n: 'el puesto de mando', k: ['inicio', 'portal', 'puesto de mando', 'pantalla principal', 'menu principal', 'galaxia', 'principio'], d: 'Desde aquí se entra en cada mundo de Atalaya 360° y se elige la empresa con la que trabajar.', primero: 'Para volver a lo último que abrió, pulse «Continuar» en el archivador de entrada; para ir a otro módulo, despliegue su mundo en el archivador o toque su planeta.' },
    simulador: { url: 'app.html', n: 'el simulador de inversión', k: ['simulador', 'simulacion', 'inversion', 'crecimiento'], d: 'Aquí se decide si la empresa puede afrontar una inversión sin romper la liquidez: punto de partida, la inversión, escenarios, semáforos, estructuras y el plan de corrección.', primero: 'Empiece por «La empresa hoy» y después «La inversión».' },
    estrategia: { url: 'estrategia.html', n: 'el sistema estratégico', k: ['sistema estrategico', 'estrategico', 'estrategia', 'cuadro de mando'], d: 'Veintidós módulos para analizar la empresa entera: finanzas, comercial, operaciones y estrategia, cada uno con su diagnóstico 360 e informe.', primero: 'Mire primero el cuadro de mando y los indicadores en rojo.' },
    personas: { url: 'personas.html', n: 'personas y equipos', k: ['personas y equipos', 'personas', 'equipos', 'liderazgo', 'disc', 'plantilla'], d: 'Perfiles de cada persona, puestos y encaje, equipos, liderazgo a medida y planes de desarrollo.', primero: 'Dé de alta la plantilla y pase el primer test.', plan: 'personas' },
    mesa: { url: 'mesa.html', n: 'la mesa de trabajo', k: ['mesa de trabajo', 'mesa', 'agenda', 'prioridades', 'mis tareas', 'tareas'], d: 'Todo el trabajo del ecosistema en una sola mesa: lo de hoy, la bandeja, el 20 % que da el resultado, la agenda y las metas SMART.', primero: 'Traiga el trabajo del ecosistema y revise su 20 %.' },
    intervencion: { url: 'intervencion.html', n: 'la auditoría integral', k: ['auditoria integral', 'auditoría integral', 'intervencion', 'intervención', 'diagnostico', 'diagnóstico', 'triaje', 'primera sesion', 'primera sesión'], d: 'La herramienta del consultor para entrar en una empresa: primera sesión como un triaje, auditoría integral por áreas y plan de intervención con sus sesiones.', primero: 'Empiece por el guion de la primera sesión o suba la transcripción.', plan: 'intervencion' },
    tablero: { url: 'tablero.html', n: 'el tablero general', k: ['tablero general', 'tablero', 'vision macro', 'equilibrio viable', 'toda la empresa'], d: 'Toda la empresa de un vistazo: la nota, el equilibrio viable, las cinco capas con sus semáforos, las diez prioridades y los objetivos del empresario.', primero: 'Mire primero el equilibrio viable y la capa más baja en rojo.' },
    libro: { url: 'libro.html', n: 'el libro corporativo', k: ['libro corporativo', 'libro de la empresa', 'libro', 'todos los informes'], d: 'Todos los informes del ecosistema en un libro de la empresa, con índice por secciones y descarga en PDF.', primero: 'Pulse «Recoger todos los informes» si aún está vacío.' },
    grupo: { url: 'grupo.html', n: 'el grupo empresarial', k: ['grupo empresarial', 'vista de grupo', 'sociedades del grupo', 'cartera de clientes', 'cartera', 'consolidado'], d: 'Las empresas o sociedades de la cuenta juntas: consolidado, comparativa, riesgos cruzados y objetivos.', grupo: true }
  };
  const mundoActual = () => ({ 'tablero.html': 'tablero', 'app.html': 'simulador', 'estrategia.html': 'estrategia', 'personas.html': 'personas', 'mesa.html': 'mesa', 'grupo.html': 'grupo', 'portal.html': 'inicio', 'libro.html': 'libro', 'intervencion.html': 'intervencion' }[PG()] || 'inicio');
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
    if (p === 'intervencion.html') return $$('#ivTabs [data-t]').map((b) => ({ id: b.dataset.t, n: (b.firstChild && b.firstChild.textContent || b.textContent).trim() }));
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
    else if (p === 'intervencion.html' && A.interv && A.interv.ir) A.interv.ir(id);
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
    if (!disponible(k)) return { ok: false, motivo: w.plan ? `${w.n.charAt(0).toUpperCase() + w.n.slice(1)} está incluido en el plan Consultora.` : 'La cartera de clientes y el grupo empresarial son de los planes con varias empresas (Consultora y Grupos).' };
    if (k === mundoActual()) { if (zona) { const z = buscarZona(norm(zona)); if (z) { irZona(z.d.id); return { ok: true, yaEstaba: true, zona: z.d.n }; } } return { ok: true, yaEstaba: true, mundo: w.n }; }
    SS.set('atalaya.guia.llegada', { mundo: k, zona: zona || '', t: Date.now() });
    viajePendiente = w.url;
    return { ok: true, mundo: w.n, queHay: w.d, primero: w.primero || '' };
  };
  function guiaTools() {
    return [
      { name: 'donde_estoy', description: 'Dice en qué mundo y zona está el usuario, qué zonas (módulos, capítulos o pestañas) tiene este mundo y a qué otros mundos puede ir con su plan.', inputSchema: { type: 'object', properties: {} }, run: () => ({ mundo: MUNDOS[mundoActual()].n, queHay: MUNDOS[mundoActual()].d, zonaActual: zonaActual(), zonas: destinos().map((d) => d.n + (d.g ? ' (' + d.g + ')' : '')), mundos: Object.keys(MUNDOS).filter(disponible).map((k) => k + ': ' + MUNDOS[k].n) }) },
      { name: 'ir_a_mundo', description: 'Lleva al usuario a otro mundo de Atalaya 360°: inicio (puesto de mando), simulador, estrategia, personas, intervencion (auditoría integral), mesa, tablero, libro o grupo (grupo empresarial o cartera de clientes). Opcionalmente, a una zona concreta de ese mundo (nombre del módulo, capítulo o pestaña). La conversación continúa al llegar.', inputSchema: { type: 'object', properties: { mundo: { type: 'string', enum: Object.keys(MUNDOS) }, zona: { type: 'string' } }, required: ['mundo'] }, run: (i) => viajar(i.mundo, i.zona) },
      { name: 'ir_a_zona', description: 'Abre una zona del mundo actual: un módulo, un capítulo o una pestaña (por nombre). En el simulador también acepta la ruta de una variable para llevar a su campo.', inputSchema: { type: 'object', properties: { destino: { type: 'string' } }, required: ['destino'] }, run: (i) => { if (PG() === 'app.html' && api && api.goTo && /\./.test(i.destino)) return api.goTo(i.destino); const z = buscarZona(norm(i.destino)) || (destinos().find((d) => d.id === i.destino) ? { d: destinos().find((d) => d.id === i.destino) } : null); if (!z) return { ok: false, zonas: destinos().map((d) => d.n) }; irZona(z.d.id); return { ok: true, zona: z.d.n }; } },
      { name: 'cerrar', description: 'Cierra lo que está abierto: «ventanas» (informes, mapas, diálogos y el manual), «manual», o «mundo» (sale del mundo actual y vuelve al puesto de mando).', inputSchema: { type: 'object', properties: { que: { type: 'string', enum: ['ventanas', 'manual', 'mundo'] } }, required: ['que'] }, run: (i) => (i.que === 'mundo' ? viajar('inicio') : i.que === 'manual' ? (A.manualLateral && A.manualLateral.cerrar(), { ok: true }) : cerrarVentanas()) },
      { name: 'ver_plan_documentacion', description: 'Plan de documentación de la empresa, calculado sin IA: documentación esencial entregada (X de Y), áreas esenciales que faltan ordenadas por lo que desbloquean (documento, cómo se entrega, pantalla y qué permitirá), entregadas incompletas, recomendadas pendientes, las que no aplican con su motivo y el siguiente paso. Úsala cuando pregunte qué le falta, qué documentos tiene que subir, por dónde empezar o qué hacer después.', inputSchema: { type: 'object', properties: {} }, run: async () => { const p = await planDoc(); if (!p) return { ok: false, motivo: 'El plan de documentación forma parte del sistema estratégico, que no está incluido en su plan.' }; const it = (a) => ({ id: a.id, area: a.n, documento: a.documento, como: a.como, donde: a.donde, permite: a.permite }); return { esenciales: p.esenciales, faltan: p.faltan.map(it), entregadas: p.entregadas.map((a) => ({ area: a.n, incompleto: a.incompleto })), recomendadasPendientes: p.recomendadas.map(it), noAplican: p.noAplican, siguiente: p.siguiente ? Object.assign(it(p.siguiente), { recomendada: p.siguiente.recomendada }) : null, noAplicaComoSeMarca: NOAPLICA_TXT, informativa: informativa() }; } },
      { name: 'ir_a_documento', description: 'Lleva al usuario a la pantalla donde se entrega el documento de un área (clave o nombre: dinero o cuentas, tesoreria, margen, cobros, plan, ventas o ABC, compras, tiempos, logistica, lean, impuestos, presupuesto, valoracion, comercial, personas, marketing, mercado, expansion) o al siguiente paso del plan («siguiente»).', inputSchema: { type: 'object', properties: { area: { type: 'string' } }, required: ['area'] }, run: async (i) => { const p = await planDoc(); if (!p) return { ok: false, motivo: 'El sistema estratégico no está incluido en su plan.' }; const a = areaDe(p, i.area); if (!a) return { ok: false, areas: p.areas.map((x) => x.id + ': ' + x.n) }; return irADoc(a); } },
      { name: 'ver_informes', description: 'Informes de la empresa y su estado, calculado sin IA: «listo», «saldrá incompleto» (con las áreas esenciales que saldrán a «0 · sin documentación») o «no tiene sentido todavía», con el motivo, dónde se abre y el informe recomendado. Úsala antes de recomendar o abrir un informe.', inputSchema: { type: 'object', properties: {} }, run: async () => { const l = await informes(); if (!l) return { ok: false, motivo: 'Los informes del sistema estratégico no están incluidos en su plan.' }; const r = recomendado(l); return { informes: l.map((x) => ({ id: x.id, informe: x.titulo, estado: ESTADO_TXT(x), motivo: x.motivo, ceros: x.ceros, donde: x.como })), recomendado: r ? r.id : null }; } },
      { name: 'abrir_informe', description: 'Abre un informe con su función de siempre (sin IA). tipo: auditoria, diagnostico (Informe 360 de la empresa), area (con «area»: clave o nombre, por ejemplo dinero, tesoreria o cobros), simulador, libro, personas o integral. Si saldrá incompleto o no tiene sentido todavía, no lo abre y devuelve el aviso: dígaselo en una frase y ofrezca abrirlo igualmente (forzar: true) o ir a lo que falta (ir_a_documento).', inputSchema: { type: 'object', properties: { tipo: { type: 'string', enum: ['auditoria', 'diagnostico', 'area', 'simulador', 'libro', 'personas', 'integral'] }, area: { type: 'string' }, forzar: { type: 'boolean' } }, required: ['tipo'] }, run: async (i) => { const l = await informes(); if (!l) return { ok: false, motivo: 'Los informes del sistema estratégico no están incluidos en su plan.' }; const q = i.tipo === 'area' ? i.area || '' : { diagnostico: 'tablero', integral: 'intervencion' }[i.tipo] || i.tipo; const x = informeDe(l, q); if (!x) return { ok: false, informes: l.map((y) => y.id + ': ' + y.titulo) }; if (x.estado !== 'listo' && !i.forzar) return { ok: false, abierto: false, informe: x.titulo, estado: ESTADO_TXT(x), aviso: x.motivo }; return Object.assign({ estado: ESTADO_TXT(x) }, abrirInf(x)); } },
      { name: 'preparar_orden_del_dia', description: 'Prepara sin IA el borrador del orden del día de la próxima reunión (de 5 a 7 puntos con responsable y cifra o documento): documentación esencial que falta, áreas en rojo, acciones del plan vencidas o que vencen en 14 días, acuerdos pendientes de la última reunión e informe a revisar. Lo muestra en el panel con «Guardar en la mesa de trabajo», «Copiar» y «Redactar mejor»; no guarda nada por sí solo.', inputSchema: { type: 'object', properties: {} }, run: async () => { const od = await ordenDia(); if (!od) return { ok: false, motivo: 'El orden del día se prepara con el sistema estratégico, que no está incluido en su plan.' }; setTimeout(() => verOrdenDia(od), 50); return { ok: true, puntos: lineasOD(od), mostrado: true, guardado: false }; } },
      { name: 'abrir_manual', description: 'Abre el manual en el lateral, en el apartado de un tema («metas SMART», «semáforos», «liderazgo») o, sin tema, en el de la zona actual.', inputSchema: { type: 'object', properties: { tema: { type: 'string' } } }, run: (i) => (A.manualLateral ? A.manualLateral.abrirTema(i.tema) : { ok: false }) }
    ];
  }
  const zonaActual = () => {
    try {
      const p = PG();
      if (p === 'estrategia.html' && A.strat.current) { const m = A.strat.mod(A.strat.current()); return m && m.nombre; }
      if (p === 'personas.html' && A.personas.current) { const m = A.personas.mod(A.personas.current()); return m && m.nombre; }
      if (p === 'mesa.html') { const b = document.querySelector('#msTabs [aria-selected="true"]'); return b && b.firstChild.textContent.trim(); }
      if (p === 'intervencion.html') { const b = document.querySelector('#ivTabs [aria-selected="true"]'); return b && b.firstChild.textContent.trim(); }
      if (p === 'app.html') { let id = (A.ruta && A.ruta.actual && A.ruta.actual()) || null; if (!id) document.querySelectorAll('section.chapter[id]').forEach((s) => { const b = s.getBoundingClientRect(); if (b.height > 0 && b.top < innerHeight * 0.45) id = s.id; }); const d = destinos().find((x) => x.id === id); return d && d.n; }
    } catch (e) { /* sin zona */ }
    return null;
  };
  const listaY = (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1] : l[0] || '');
  const aDe = (t) => t.replace(/\ba el\b/g, 'al').replace(/\bde el\b/g, 'del');
  /* Órdenes de guía en lenguaje llano: se resuelven aquí, al momento, con cualquiera de los tres cerebros */
  function guiaLocal(text) {
    const t = norm(text).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^(para|silencio|calla|basta|apaga la voz|desactiva la voz|deja de escuchar|no escuches)\b/.test(t)) { setVoz(false); return 'De acuerdo, dejo de escuchar. Cuando quiera, vuelva a activar la voz.'; }
    if (/\b(cierra|cerrar|quita|sal de|salir de|salte de)\b/.test(t)) {
      if (/manual/.test(t)) { A.manualLateral && A.manualLateral.cerrar(); return 'Manual cerrado.'; }
      if (/\b(mundo|simulador|sistema|estrategia|personas|mesa|grupo)\b/.test(t) && !/(informe|ventana|mapa)/.test(t)) { const r = viajar('inicio'); return r.ok ? 'Volvemos al puesto de mando. Desde allí puede entrar en cualquier mundo.' : r.motivo; }
      const n = cerrarVentanas(true); return n ? 'Cerrado. ¿Dónde quiere ir ahora?' : 'No hay nada abierto que cerrar.';
    }
    if (/\bmanual\b/.test(t) && /\b(abre|abrir|ensena|muestra|ver|mira|consulta|como se usa|ayuda)\b/.test(t)) {
      const tema = (t.match(/manual (?:de|del|sobre|en|para) (?:la |el |los |las )?(.+)$/) || [])[1];
      if (A.manualLateral) { A.manualLateral.abrirTema(tema).then((r) => r && r.apartado && note('Manual abierto en «' + r.apartado + '».')); return tema ? `Abro el manual en lo que explica ${tema}.` : 'Abro el manual en el apartado de esta zona. Arriba tiene el menú para ir a cualquier otro.'; }
    }
    if (/\b(donde estoy|que hay aqui|que puedo hacer|guiame|guia|por donde empiezo|que hago aqui|ayudame a moverme|que mundos)\b/.test(t)) {
      const w = MUNDOS[mundoActual()], z = zonaActual(), ds = destinos().map((d) => d.n);
      const otros = Object.keys(MUNDOS).filter((k) => k !== mundoActual() && disponible(k)).map((k) => MUNDOS[k].n);
      return `Está en ${w.n}${z ? ', en «' + z + '»' : ''}. ${w.d}${w.primero ? ' ' + w.primero : ''}${ds.length ? ' Aquí puede ir a ' + listaY(ds.slice(0, 6)) + (ds.length > 6 ? ', entre otras' : '') + '.' : ''} ${aDe('También puedo llevarle a ' + listaY(otros))}. Diga, por ejemplo, «llévame a la mesa de trabajo» o «abre el manual».`;
    }
    if (/\b(llevame|lleva me|ve a|vete a|vamos a|ir a|quiero ir|abre|abrir|entra en|entrar en|ensename|muestrame|pasa a|cambia a|ponme en|abreme|voy a)\b/.test(t)) {
      const m = buscarMundo(t), z = buscarZona(t);
      if (m && (!z || m.p >= z.p || /\bmundo\b/.test(t))) {
        const resto = z && z.d ? z.d.n : '';
        const r = viajar(m.k, m.k !== mundoActual() ? '' : resto);
        if (!r.ok) return r.motivo;
        if (r.yaEstaba) return r.zona ? `Abro «${r.zona}».` : `Ya está en ${MUNDOS[m.k].n}.`;
        return `Le llevo a ${r.mundo}. ${r.queHay}`;
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
      if (l.doc) { const S = A.strat; if (S && S.show && S.mod && S.mod(l.doc.id) && (!S.current || S.current() !== l.doc.id)) S.show(l.doc.id); const txt = `Está en «${l.doc.n}». ${l.doc.como}`; add('bot', txt); guardarLog('assistant', txt); hablar(txt).then(() => voz && escuchar()); return; }
      let z = null; if (l.zona) { z = buscarZona(norm(l.zona)); if (z) irZona(z.d.id); }
      const txt = `Ya está en ${w.n}${z ? ', en «' + z.d.n + '»' : ''}. ${w.primero || w.d}`;
      add('bot', txt); guardarLog('assistant', txt); hablar(txt).then(() => voz && escuchar());
    }, 1200);
  }

  /* ---------- Guía de la documentación de la empresa ----------
     El plan sale de S.planDocumentacion (js/strategy/core.js): local, sin IA y siempre igual. En el sistema estratégico se
     calcula con su estado vivo; en cualquier otra página, con los datos guardados y el motor sin pantalla
     (js/calculo-mundos.js), como la nota. La guía saluda una vez por sesión y empresa con una tarjeta (nunca encima de
     un informe o de una ventana), lleva a la pantalla de cada documento y, al entregar un área, dice cómo cambian su
     valoración y la nota global y cuál es el siguiente paso. Con la empresa modelo y la cuenta de demostración la tarjeta
     es informativa: no se guarda nada. La guía nunca marca un área como «no aplica»: eso lo decide la empresa. */
  const puedeEst = () => { const P = A.platform; return !(P && P.puede && !P.puede('estrategia')); };
  const informativa = () => { const P = A.platform; return !!(P && ((P.modelo && P.modelo.activa && P.modelo.activa()) || (P.user && P.user.demo))); };
  const cargarScript = (src) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('Sin ' + src)); document.head.appendChild(s); });
  // Un cálculo del sistema estratégico: con su estado vivo en su página; en cualquier otra, con el motor sin pantalla
  async function calcEst(fn) {
    if (!puedeEst()) return null;
    const S = A.strat;
    if (S && S.__vivo && S.state && S.planDocumentacion) return fn(S);
    const P = A.platform; if (!P || !P.loadData) return null;
    if (!(A.calculo && A.calculo.estrategia)) await cargarScript('js/calculo-mundos.js');
    const ficha = (P.empresas && P.empresas.activa && P.empresas.activa()) || {};
    const leer = async (k, base) => { let st = null; try { st = JSON.parse(localStorage.getItem(P.k ? P.k(base) : base)); } catch (e) { /* local */ } try { const r = await P.loadData(k); if (r) st = r; } catch (e) { /* local */ } return st; };
    const [sim, est] = await Promise.all([leer('simulador', 'atalaya.v1'), leer('estrategia', 'atalaya.estrategia.v1')]);
    return A.calculo.estrategia(sim, est, { ficha, real: !!(P.modoReal && P.modoReal()), modelo: !!(P.modelo && P.modelo.activa && P.modelo.activa()) }, fn);
  }
  const planDoc = () => calcEst((X) => (X.planDocumentacion ? X.planDocumentacion() : null));
  // Área por su clave, su nombre o una palabra de su documento («cuentas», «caja», «facturas»…); «siguiente» es el siguiente paso
  const AREA_PAL = [['dinero', ['cuentas', 'balance', 'cuenta de resultados', 'flujo del dinero', 'cuentas anuales']], ['tesoreria', ['tesoreria', 'caja', 'banco', 'extracto', 'saldo']], ['margen', ['margen', 'productos', 'servicios', 'coste variable']], ['cobros', ['cobros', 'morosidad', 'facturas pendientes', 'clientes que deben']], ['plan', ['plan de empresa', 'mision', 'objetivos', 'dafo']], ['ventas', ['abc', 'concentracion', 'ventas por cliente', 'ventas']], ['compras', ['compras', 'proveedores']], ['tiempos', ['tiempos', 'horas', 'partes de horas']], ['logistica', ['logistica', 'rutas', 'transporte', 'almacen']], ['lean', ['lean', 'procesos', 'desperdicio']], ['impuestos', ['impuestos']], ['presupuesto', ['presupuesto']], ['valoracion', ['valoracion', 'valor de la empresa']], ['comercial', ['oportunidades', 'ventas en camino']], ['personas', ['plantilla', 'personas']], ['marketing', ['marketing', 'canales']], ['mercado', ['mercado', 'competencia']], ['expansion', ['expansion', 'zonas']]];
  const areaDe = (plan, q) => {
    const t = norm(q).trim(); if (!plan || !t) return null;
    if (/^(siguiente|siguiente paso|siguiente documento|ahi|alli)$/.test(t)) return plan.siguiente;
    const L = plan.areas || [];
    const x = L.find((a) => a.id === t) || L.find((a) => norm(a.n) === t) || L.find((a) => t.includes(norm(a.n)));
    if (x) return x;
    let mejor = null, lg = 0; AREA_PAL.forEach(([id, ps]) => ps.forEach((p) => { if (t.includes(p) && p.length > lg) { lg = p.length; mejor = id; } }));
    return mejor ? L.find((a) => a.id === mejor) || null : null;
  };
  /* Lleva a la pantalla donde se entrega el documento de un área. Ya en el sistema estratégico, abre el área; desde otro
     mundo, viaja (al momento con «ahora», o al terminar la respuesta del asistente) y al llegar dice cómo se entrega. */
  function irADoc(a, ahora) {
    if (!a) return { ok: false };
    const z = a.zona || a.id;
    if (PG() === 'estrategia.html' && A.strat && A.strat.show && A.strat.mod && A.strat.mod(z)) { cerrarVentanas(true); A.strat.show(z); return { ok: true, area: a.n, como: a.como }; }
    if (!disponible('estrategia')) return { ok: false, motivo: 'El sistema estratégico no está incluido en su plan.' };
    try { SS.set('atalaya.guia.plan.' + A.platform.empresaId(), 1); } catch (e) { /* sin empresa */ }
    SS.set('atalaya.guia.llegada', { mundo: 'estrategia', zona: '', doc: { id: z, n: a.zona && A.strat && A.strat.mod && A.strat.mod(z) ? A.strat.mod(z).nombre : a.donde.replace(/^Sistema estratégico › /, ''), como: a.como }, t: Date.now() });
    if (ahora) { SS.set('atalaya.asistente.abierto', !$('#asPanel').hidden); location.href = a.url; } else viajePendiente = a.url;
    return { ok: true, area: a.n, como: a.como, viaje: true };
  }
  const minus = (s) => String(s || '').replace(/^\w/, (c) => c.toLowerCase());
  const conEsto = (a) => (a && a.permite ? `Con esta documentación ${a.permite}.` : '');
  const ESENC = (p) => `Documentación esencial: ${p.esenciales.entregadas} de ${p.esenciales.total}`;
  const NOAPLICA_TXT = 'Si un área no corresponde a la actividad de la empresa, puede marcarla en su pantalla con el botón «Esta área no aplica a mi empresa», indicando el motivo.';
  // Texto del plan para el chat (puede leerse en voz alta: sin tablas ni símbolos)
  function planTexto(p, corto) {
    if (!p) return null;
    const sig = p.siguiente;
    if (corto) {
      if (!sig) return `${ESENC(p)}. La documentación esencial y la recomendada están completas.`;
      return `${ESENC(p)}. Siguiente paso: ${sig.n}${sig.recomendada ? ' (recomendada)' : ''}: ${sig.documento}. ${sig.como} ${conEsto(sig)} Diga «llévame ahí» y le llevo a esa pantalla.`;
    }
    const l = [`${ESENC(p)} entregadas.`];
    if (p.faltan.length) { l.push('Falta:'); p.faltan.forEach((a, i) => l.push(`${i + 1}. ${a.n}: ${a.documento}.${a.incompleto.length ? ' ' + a.incompleto.join(' ') : ''} Se entrega en ${a.donde}. ${conEsto(a)}`)); }
    else l.push('Las áreas esenciales están completas.');
    p.entregadas.filter((a) => a.incompleto.length).forEach((a) => l.push(`${a.n}, para completarla: ${a.incompleto.join(' ')}`));
    if (p.recomendadas.length) l.push(`Recomendadas pendientes, que no bajan la nota: ${listaY(p.recomendadas.map((a) => a.n))}.`);
    if (sig) l.push(`Siguiente paso: ${sig.n}. ${sig.como} Diga «llévame ahí» y le llevo.`);
    return l.join('\n');
  }
  // ¿Hay un informe, un mapa o una ventana abierta? La tarjeta de la guía nunca se pone encima
  const hayVentana = () => {
    const vis = (el) => { if (!el || el.hidden) return false; const c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden'; };
    if (['#report', '#modal', '#rutaMap', '.nt-panel', '.paseo:not(.paseo-min)', '.vp-back'].some((s) => Array.from(document.querySelectorAll(s)).some(vis))) return true;
    if (document.querySelector('.ef-back, .modal-back')) return true;
    if (Array.from(document.querySelectorAll('[aria-modal="true"]')).some((el) => vis(el) && !el.closest('.assistant'))) return true;
    return !!(A.manualLateral && A.manualLateral.abierto && A.manualLateral.abierto());
  };
  const sinVentanas = async (max) => { const t0 = Date.now(); while (hayVentana()) { if (Date.now() - t0 > (max || 60000)) return false; await new Promise((r) => setTimeout(r, 1500)); } return true; };
  /* Tarjeta de la guía: flotando sobre el botón del asistente o, con el panel abierto, dentro de la conversación */
  let tarjetaAct = null;
  /* La tarjeta nunca tapa la página: se pliega en una marca junto al botón del asistente al desplazarse, al tocar la página
     o a los 15 segundos, y se vuelve a abrir tocando la marca */
  let plegarT = null, quitarOyentes = () => {};
  function quitarTarjeta() { const f = $('#asGuia'); if (f) f.remove(); const d = $('#asGuiaDot'); if (d) d.remove(); clearTimeout(plegarT); quitarOyentes(); tarjetaAct = null; }
  function plegarTarjeta() {
    const f = $('#asGuia'); if (!f || !tarjetaAct) return;
    f.remove(); clearTimeout(plegarT); quitarOyentes();
    if ($('#asGuiaDot')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'asGuiaDot'; b.className = 'as-guia-dot'; b.textContent = 'Guía';
    b.title = 'Ver la guía de la documentación'; b.setAttribute('aria-label', 'Ver la guía de la documentación');
    b.onclick = () => { const t = tarjetaAct; b.remove(); if (t) pintarTarjeta(t, false, true); };
    const bar = $('.as-bar'); bar.insertBefore(b, $('#asFab'));
  }
  function vigilarPliegue() {
    clearTimeout(plegarT); quitarOyentes();
    plegarT = setTimeout(plegarTarjeta, 15000);
    const enGuia = (e) => { const r = e.composedPath ? e.composedPath() : [e.target]; return r.some((x) => x && x.classList && x.classList.contains('assistant')); };
    const clic = (e) => { if (!enGuia(e)) plegarTarjeta(); }, mover = () => plegarTarjeta();
    document.addEventListener('pointerdown', clic, true); addEventListener('scroll', mover, { passive: true, capture: true }); addEventListener('wheel', mover, { passive: true });
    quitarOyentes = () => { document.removeEventListener('pointerdown', clic, true); removeEventListener('scroll', mover, { capture: true }); removeEventListener('wheel', mover); quitarOyentes = () => {}; };
  }
  function pintarTarjeta(spec, enLog, reabierta) {
    const html = `<p class="as-gt">${esc(spec.texto).replace(/\n/g, '<br>')}</p>${spec.nota ? `<p class="as-gn">${esc(spec.nota)}</p>` : ''}<div class="as-gb">${spec.botones.map((b, i) => `<button type="button" class="btn ${b.solid ? 'solid' : 'ghost'} small" data-gb="${i}">${esc(b.t)}</button>`).join('')}</div>`;
    let el;
    if (enLog) { el = document.createElement('div'); el.className = 'msg bot as-card'; el.innerHTML = html; $('#asLog').appendChild(el); $('#asLog').scrollTop = $('#asLog').scrollHeight; }
    else { quitarTarjeta(); el = document.createElement('section'); el.id = 'asGuia'; el.className = 'as-guia'; el.setAttribute('role', 'status'); el.setAttribute('aria-label', 'Guía de la documentación'); el.innerHTML = `<header><b>${esc(spec.titulo || 'Guía de la documentación')}</b><button class="icon-btn" type="button" data-gx aria-label="Cerrar">×</button></header>` + html; $('.assistant').appendChild(el); tarjetaAct = spec; el.querySelector('[data-gx]').onclick = quitarTarjeta; if (!reabierta) vigilarPliegue(); else { clearTimeout(plegarT); quitarOyentes(); setTimeout(() => { if ($('#asGuia')) vigilarPliegue(); }, 400); } }
    el.querySelectorAll('[data-gb]').forEach((b) => (b.onclick = () => { const x = spec.botones[+b.dataset.gb]; if (!enLog) quitarTarjeta(); else el.querySelectorAll('[data-gb]').forEach((y) => (y.disabled = true)); x.fn(); }));
    return el;
  }
  function tarjeta(spec) { const p = $('#asPanel'); return pintarTarjeta(spec, p && !p.hidden); }
  // Plan completo en la conversación, con el estado de cada área y un acceso a cada documento que falta
  function verPlan(p) {
    open(); quitarTarjeta();
    if (!p) { add('bot', 'El plan de documentación forma parte del sistema estratégico, que no está incluido en su plan.'); return; }
    const EST = (a) => (a.exig === 'n' ? ['na', 'No aplica'] : a.entregada ? ['ok', a.incompleto.length ? 'Entregada, incompleta' : 'Entregada'] : a.exig === 'e' ? ['falta', 'Falta'] : ['pend', 'Pendiente (recomendada)']);
    const fila = (a) => { const [k, t] = EST(a); return `<li class="as-pl-${k}"><b>${esc(a.n)}</b> <span class="as-pl-st">${t}</span>${!a.entregada && a.exig !== 'n' ? `<br><small>${esc(a.documento)}.${a.incompleto.length ? ' ' + esc(a.incompleto.join(' ')) : ''} ${esc(a.como)}${a.permite ? ' ' + esc(conEsto(a)) : ''}</small> <button type="button" class="btn ghost small" data-ir="${a.id}">Llevarme ahí</button>` : a.incompleto.length ? `<br><small>${esc(a.incompleto.join(' '))}</small>` : a.exig === 'n' ? `<br><small>${esc(a.motivo)}</small>` : ''}</li>`; };
    const ess = p.areas.filter((a) => a.exig === 'e'), rec = p.areas.filter((a) => a.exig === 'r'), na = p.areas.filter((a) => a.exig === 'n');
    const el = document.createElement('div'); el.className = 'msg bot as-plan';
    el.innerHTML = `<p class="as-gt"><b>Plan de documentación${p.empresa ? ' de ' + esc(p.empresa) : ''}</b><br>${esc(ESENC(p))} entregadas. Las esenciales que faltan cuentan 0 en la nota; las recomendadas no la bajan si no se entregan.</p>
      <div class="as-pl-h">Esenciales</div><ol>${ess.map(fila).join('')}</ol>
      ${rec.length ? `<div class="as-pl-h">Recomendadas</div><ul>${rec.map(fila).join('')}</ul>` : ''}${na.length ? `<div class="as-pl-h">No aplican</div><ul>${na.map(fila).join('')}</ul>` : ''}
      <p class="as-gn">${esc(NOAPLICA_TXT)}${informativa() ? ' Con la empresa modelo o la cuenta de demostración esta ruta es informativa: no se guarda nada.' : ''}</p>`;
    const lg = $('#asLog'); lg.appendChild(el); lg.scrollTop = el.getBoundingClientRect().top - lg.getBoundingClientRect().top + lg.scrollTop - 8;
    el.querySelectorAll('[data-ir]').forEach((b) => (b.onclick = () => { const a = p.areas.find((x) => x.id === b.dataset.ir); const r = irADoc(a, true); if (r.ok && !r.viaje) note('Abierto «' + a.n + '».'); }));
  }
  const botonesPlan = (p, a) => [a ? { t: 'Llevarme ahí', solid: true, fn: () => { const r = irADoc(a, true); if (r.ok && !r.viaje) { const m = 'Está en «' + a.n + '». ' + a.como; add('bot', m); guardarLog('assistant', m); } } } : null, { t: 'Ver todo el plan', fn: () => verPlan(p) }, { t: 'Ahora no', fn: () => {} }].filter(Boolean);
  const notaInf = () => (informativa() ? (A.platform.user && A.platform.user.demo ? 'Cuenta de demostración: la ruta es informativa y no se guarda nada.' : 'Empresa modelo: la ruta es informativa y no se guarda nada.') : '');
  /* Saludo al entrar en el sistema estratégico o en el puesto de mando: una vez por sesión y empresa */
  async function saludoPlan() {
    // Empresa modelo y demostración: el plan solo a petición (chat, «¿Qué me falta?»), sin tarjeta automática
    if (!['estrategia', 'inicio'].includes(page) || !puedeEst() || informativa()) return;
    const P = A.platform; if (!P || !P.user || !P.empresaId) return;
    const id = P.empresaId(), k = 'atalaya.guia.plan.' + id; if (SS.get(k)) return;
    let p = null, ac = null; try { const x = await calcEst((X) => ({ p: X.planDocumentacion(), ac: X.accionesPlan ? X.accionesPlan(14) : null })); p = x && x.p; ac = x && x.ac; } catch (e) { p = null; }
    if (!p || !p.esenciales.total || P.empresaId() !== id) return;
    if (!(await sinVentanas(90000)) || SS.get(k)) return;
    SS.set(k, 1);
    // Acciones del plan vencidas: una línea más en la misma tarjeta, con «Ver acciones»
    const nv = ac && ac.vencidas ? ac.vencidas.length : 0;
    const lineaV = nv ? `\n${nv === 1 ? '1 acción del plan está vencida' : nv + ' acciones del plan están vencidas'}.` : '';
    const PLAN_ACC = { id: 'plan', zona: 'plan', n: 'Plan de empresa', como: 'Las acciones están en la tabla «Acciones», con su responsable y su fecha de fin.', url: 'estrategia.html#plan', donde: 'Sistema estratégico › Plan de empresa' };
    const conV = (bs) => (nv ? bs.slice(0, -1).concat([{ t: 'Ver acciones', fn: () => { const r = irADoc(PLAN_ACC, true); if (r.ok && !r.viaje) add('bot', 'Está en «Plan de empresa». ' + PLAN_ACC.como); } }], bs.slice(-1)) : bs);
    if (!p.completo) { const s = p.siguiente; tarjeta({ titulo: 'Documentación de la empresa', texto: `${ESENC(p)}. Siguiente: ${s.documento}.${s.paso ? ' ' + s.paso : ''} ${conEsto(s)}${lineaV}`, nota: notaInf(), botones: conV(botonesPlan(p, s)) }); return; }
    // Todo lo esencial entregado: se dice una vez (en la empresa modelo y la demostración, una vez por sesión)
    const kc = 'atalaya.guia.completa'; const lsK = P.k ? P.k(kc) : kc;
    let yaDicha = false; if (!informativa()) { try { yaDicha = !!localStorage.getItem(lsK); if (!yaDicha) localStorage.setItem(lsK, new Date().toISOString()); } catch (e) { /* sin almacenamiento */ } }
    if (yaDicha) { if (nv) tarjeta({ titulo: 'Plan de empresa', texto: lineaV.trim(), botones: conV([{ t: 'Ahora no', fn: () => {} }]) }); return; }
    const r = p.recomendadas[0];
    tarjeta({ titulo: 'Documentación de la empresa', texto: `Documentación esencial completa: ${p.esenciales.total} de ${p.esenciales.total}. ${r ? `${p.recomendadas.length === 1 ? 'Queda un área recomendada, que no baja la nota y amplía el análisis: ' : `Quedan ${p.recomendadas.length} áreas recomendadas, que no bajan la nota y amplían el análisis. La primera: `}${r.n}, ${r.documento}.` : 'Las áreas recomendadas también están entregadas.'}${lineaV}`, nota: notaInf(), botones: conV(botonesPlan(p, r)) });
  }
  /* Después de una entrega: al guardar datos en el sistema estratégico se comprueba qué áreas han pasado a entregadas */
  const notaArea = (id) => { try { const r = A.nota && A.nota.modulos ? A.nota.modulos([id]) : null; return r && r.n100 != null ? r.n100 : null; } catch (e) { return null; } };
  /* Dos notas distintas, siempre con su nombre: la del sistema estratégico (la del cuadro de mando, regla de áreas, sobre 100;
     en la cabecera, «Este mundo», la misma sobre 10) y la de la empresa (media de todos los mundos, la de la cabecera, sobre 10) */
  const notaEst = () => { try { const r = A.nota && A.nota.modulos ? A.nota.modulos() : null; return r && r.n100 != null ? r.n100 : null; } catch (e) { return null; } };
  const notaGlobal = async () => { try { const r = A.nota && A.nota.refrescar ? await A.nota.refrescar() : null; return r && r.global != null ? r.global : null; } catch (e) { return null; } };
  const motivoEst = () => { try { const u = A.nota.ultima(), m = u && u.mundos && u.mundos.estrategia; return (m && m.motivo) || ''; } catch (e) { return ''; } };
  const f10 = (n) => (n == null ? 'sin nota' : String(n.toFixed(1)).replace('.', ','));
  let foto = null, fotoT = null;
  async function tomarFoto() { const p = A.strat.planDocumentacion(); const u = A.nota && A.nota.ultima ? A.nota.ultima() : null; const g = informativa() ? (u && u.global != null ? u.global : null) : await notaGlobal(); return { p, g, e: notaEst(), ent: Object.fromEntries(p.areas.map((a) => [a.id, a.entregada])), inc: Object.fromEntries(p.areas.map((a) => [a.id, a.incompleto.join(' ')])), n: Object.fromEntries(p.areas.map((a) => [a.id, notaArea(a.id)])) }; }
  async function revisarEntregas() {
    if (!foto || !A.strat || !A.strat.planDocumentacion || informativa()) return;
    const antes = foto, ahora = await tomarFoto(); foto = ahora;
    const nuevas = ahora.p.areas.filter((a) => a.exig !== 'n' && a.entregada && !antes.ent[a.id]);
    // Datos recibidos que aún no bastan para valorar el área (por ejemplo, cuentas con un solo ejercicio cerrado)
    const parciales = ahora.p.areas.filter((a) => a.exig !== 'n' && !a.entregada && a.incompleto.length && a.incompleto.join(' ') !== antes.inc[a.id]);
    if (!nuevas.length && !parciales.length) return;
    const v = (x) => (x == null ? 'sin valorar' : x), v2 = (x) => (x == null ? 'sin nota' : x);
    const lin = nuevas.length ? nuevas.map((a) => `${a.n}: ${v(antes.n[a.id] == null && a.exig === 'e' ? 0 : antes.n[a.id])} → ${v(ahora.n[a.id])}`).join(' · ') + '.' + (antes.e == null && ahora.e == null ? `\nNota del sistema estratégico: todavía sin nota${motivoEst() ? ' (' + motivoEst() + ')' : ''}.` : `\nNota del sistema estratégico: ${v2(antes.e)} → ${v2(ahora.e)} (sobre 100).`) + (antes.g == null && ahora.g == null ? '' : `\nNota de la empresa (todos los mundos): ${f10(antes.g)} → ${f10(ahora.g)} (sobre 10).`) : '';
    const inc = nuevas.flatMap((a) => a.incompleto.map((t) => (nuevas.length > 1 ? a.n + ': ' : '') + t));
    const par = parciales.map((a) => `${a.n}: datos recibidos, aún sin valorar. ${a.incompleto.join(' ')}`);
    const s = ahora.p.siguiente;
    const texto = `${lin}${inc.length ? '\nPara completarla: ' + inc.join(' ') : ''}${par.length ? '\n' + par.join(' ') : ''}\n${s ? `${ESENC(ahora.p)}. Siguiente paso: ${s.n}${s.recomendada ? ' (recomendada)' : ''}, ${s.documento}.` : 'La documentación esencial y la recomendada están completas.'}`;
    // El informe que ahora tiene sentido: el de auditoría al completar lo esencial; si no, el del área recién entregada
    let rec = null; try { const l = A.strat.informesDisponibles(); rec = ahora.p.completo && !antes.p.completo ? l.find((x) => x.id === 'auditoria') : nuevas.map((a) => l.find((x) => x.id === a.id && x.estado === 'listo')).find(Boolean) || null; } catch (e) { rec = null; }
    const lrec = rec ? (rec.id === 'auditoria' ? `\nCon la documentación esencial completa, ya puede sacar el ${rec.titulo}.` : `\nYa puede sacar el ${rec.titulo}.`) : '';
    await sinVentanas(120000);
    const bs = botonesPlan(ahora.p, s); if (rec) bs.unshift({ t: 'Abrir informe', solid: true, fn: () => abrirInf(rec, true) });
    tarjeta({ titulo: !nuevas.length ? 'Datos recibidos' : nuevas.length === 1 ? 'Área entregada' : 'Áreas entregadas', texto: (texto + lrec).trim(), nota: notaInf(), botones: bs });
    guardarLog('assistant', texto + lrec);
  }
  function vigilarEntregas() {
    if (page !== 'estrategia' || !A.strat || !A.strat.planDocumentacion || vigilarEntregas.on) return;
    vigilarEntregas.on = true;
    setTimeout(async () => { try { foto = await tomarFoto(); } catch (e) { foto = null; } }, 3000);
    addEventListener('atalaya:datos', () => { clearTimeout(fotoT); fotoT = setTimeout(() => revisarEntregas().catch((e) => console.error(e)), 1500); });
  }
  /* ---------- Fase 2: informes y mesa de trabajo ----------
     Qué informe tiene sentido sacar (S.informesDisponibles, sin IA), abrirlo con sus funciones de siempre avisando antes si
     saldrá incompleto, y preparar el orden del día de la próxima reunión (S.ordenDelDia) para guardarlo en la mesa de
     trabajo cuando el usuario lo pida. La IA solo interviene en «Redactar mejor», en modo análisis y sin cifras nuevas. */
  const leerDato = async (k, base) => { const P = A.platform; let st = null; try { st = JSON.parse(localStorage.getItem(P.k ? P.k(base) : base)); } catch (e) { /* local */ } try { const r = await P.loadData(k); if (r) st = r; } catch (e) { /* local */ } return st; };
  async function informes() {
    if (!puedeEst()) return null;
    const l = await calcEst((X) => (X.informesDisponibles ? X.informesDisponibles() : null)); if (!l) return null;
    const P = A.platform, au = l.find((x) => x.id === 'auditoria');
    if (P && P.puede && P.puede('personas')) {
      const ps = (((A.personas && A.personas.state) || (await leerDato('personas', 'atalaya.personas.v1'))) || {}).personas || [];
      l.push({ id: 'personas', tipo: 'personas', titulo: 'Diagnóstico de personas y estructura', mundo: 'personas', como: 'Personas y equipos › Diagnóstico de personas y estructura', estado: ps.length ? 'listo' : 'sin_sentido', motivo: ps.length ? `${ps.length === 1 ? 'Una persona dada' : ps.length + ' personas dadas'} de alta.` : 'Falta la plantilla: sin personas dadas de alta no hay diagnóstico.', faltan: [], ceros: 0 });
    }
    if (P && P.puede && P.puede('intervencion') && au) l.push({ id: 'intervencion', tipo: 'intervencion', titulo: 'Auditoría integral', mundo: 'intervencion', como: 'Auditoría integral › Auditoría por áreas › Informe', estado: au.estado, motivo: au.estado === 'listo' ? 'Se completa con lo recogido en las sesiones y sus transcripciones.' : au.motivo, faltan: au.faltan, ceros: au.ceros });
    return l;
  }
  const INF_PAL = [['auditoria', ['informe de auditoria', 'auditoria estrategica', 'de auditoria', 'auditoria']], ['tablero', ['diagnostico estrategico', 'cuadro de mando', 'de la empresa', 'empresa', 'general', 'diagnostico']], ['simulador', ['simulador', 'inversion', 'viabilidad']], ['libro', ['libro']], ['personas', ['personas y estructura', 'plantilla', 'equipos']], ['intervencion', ['auditoria integral', 'integral']]];
  function informeDe(l, q) {
    const t = norm(q).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim(); if (!l || !t) return null;
    const x = l.find((i) => i.id === t) || l.find((i) => norm(i.titulo) === t); if (x) return x;
    if (/\bintegral\b/.test(t)) return l.find((i) => i.id === 'intervencion') || null;
    // Un área por su nombre o por una palabra de su documento (antes que «auditoría» genérica)
    const ar = l.filter((i) => i.area).find((i) => t.includes(norm(i.area)));
    if (ar) return ar;
    let mejor = null, lg = 0; AREA_PAL.forEach(([id, ps]) => ps.forEach((p) => { if (t.includes(p) && p.length > lg) { lg = p.length; mejor = id; } }));
    INF_PAL.forEach(([id, ps]) => ps.forEach((p) => { if (t.includes(p) && p.length >= lg) { lg = p.length; mejor = id; } }));
    return mejor ? l.find((i) => i.id === mejor) || null : null;
  }
  const URL_INF = (x) => (x.mundo === 'estrategia' ? 'estrategia.html#' + x.id : { simulador: 'app.html', libro: 'libro.html', personas: 'personas.html', intervencion: 'intervencion.html' }[x.mundo]);
  // Abre el informe con la función de su pantalla; desde otro mundo viaja y lo abre al llegar (o dice qué botón pulsar)
  function abrirInf(x, ahora) {
    if (!x) return { ok: false };
    const S = A.strat;
    if (x.mundo === 'estrategia' && PG() === 'estrategia.html' && S && S.__vivo) {
      cerrarVentanas(true);
      if (x.id === 'auditoria') S.auditReport(); else { const m = S.mod(x.id); if (!m) return { ok: false }; if (x.tipo === '360' && S.report360) S.report360(m); else S.moduleReport(m); }
      return { ok: true, abierto: true, informe: x.titulo };
    }
    if (x.mundo === 'simulador' && PG() === 'app.html' && $('#openReport')) { cerrarVentanas(true); $('#openReport').click(); return { ok: true, abierto: true, informe: x.titulo }; }
    const url = URL_INF(x); if (!url) return { ok: false };
    const auto = x.mundo === 'estrategia' || x.mundo === 'simulador';
    if (auto) SS.set('atalaya.guia.informe', { id: x.id, t: Date.now() });
    else SS.set('atalaya.guia.llegada', { mundo: x.mundo === 'intervencion' ? 'intervencion' : x.mundo, zona: '', doc: { id: '', n: x.titulo, como: 'Para abrirlo: ' + x.como + '.' }, t: Date.now() });
    if (ahora) { SS.set('atalaya.asistente.abierto', !$('#asPanel').hidden); location.href = url; } else viajePendiente = url;
    return { ok: true, viaje: true, informe: x.titulo, como: x.como };
  }
  // Al llegar a la página de un informe pedido desde otro mundo
  async function informePendiente() {
    const x = SS.get('atalaya.guia.informe'); if (!x || Date.now() - x.t > 120000) return; SS.del('atalaya.guia.informe');
    await new Promise((r) => setTimeout(r, 2500));
    const l = await informes(); const i = l && l.find((y) => y.id === x.id); if (i) abrirInf(i, true);
  }
  const ESTADO_TXT = (x) => (x.estado === 'listo' ? 'listo' : x.estado === 'incompleto' ? 'saldrá incompleto' : 'no tiene sentido todavía');
  // Lo que falta para un informe: el siguiente documento del plan (o el del área)
  async function irALoQueFalta(x) { const p = await planDoc(); if (!p) return; const a = (x.tipo === '360' || x.tipo === 'area') && x.id !== 'tablero' ? p.areas.find((y) => y.id === x.id) : p.siguiente; if (a) { const r = irADoc(a, true); if (r.ok && !r.viaje) { const m = 'Está en «' + a.n + '». ' + a.como; add('bot', m); guardarLog('assistant', m); } } }
  /* Abrir con aviso: si saldrá incompleto o no tiene sentido todavía, una frase y dos botones; si está listo, se abre */
  function pedirInforme(x) {
    if (!x) return 'No encuentro ese informe. Diga «qué informe saco» y le digo cuáles tiene.';
    if (x.estado === 'listo') { const r = abrirInf(x); return r.abierto ? `Abro el ${x.titulo}.` : r.viaje ? `Le llevo al ${x.titulo}.${r.como && x.mundo !== 'estrategia' && x.mundo !== 'simulador' ? ' Para abrirlo: ' + r.como + '.' : ''}` : 'No he podido abrir ese informe.'; }
    const txt = `El ${x.titulo} ${ESTADO_TXT(x)}: ${minus(x.motivo)}`;
    setTimeout(() => { open(); pintarTarjeta({ texto: txt, botones: [{ t: 'Abrir igualmente', fn: () => abrirInf(x, true) }, { t: 'Ir a lo que falta', solid: true, fn: () => irALoQueFalta(x) }] }, true); }, 50);
    return txt;
  }
  function informesTexto(l) {
    if (!l) return null;
    const vis = l.filter((x) => x.mundo !== 'estrategia' || !x.area || x.estado !== 'sin_sentido');
    const lis = vis.filter((x) => x.estado === 'listo'), inc = vis.filter((x) => x.estado === 'incompleto'), no = l.filter((x) => x.estado === 'sin_sentido' && !x.area);
    const L = [];
    L.push(lis.length ? `Listos: ${listaY(lis.map((x) => x.titulo))}.` : 'Ningún informe está listo todavía.');
    inc.forEach((x) => L.push(`${x.titulo}: saldrá incompleto. ${x.motivo}`));
    if (no.length) L.push(`No tienen sentido todavía: ${listaY(no.map((x) => x.titulo))}.`);
    const nAreas = l.filter((x) => x.area && x.estado === 'sin_sentido' && !x.noAplica).length;
    if (nAreas) L.push(`${nAreas === 1 ? 'Un informe de área espera' : nAreas + ' informes de área esperan'} su documentación.`);
    const rec = recomendado(l); if (rec) L.push(`Le recomiendo el ${rec.titulo}. Diga «abre el ${rec.titulo.toLowerCase()}».`);
    return L.join('\n');
  }
  // Informe recomendado: el de auditoría si está listo; si no, el informe de área listo más útil (por el orden del plan)
  const recomendado = (l) => (l ? l.find((x) => x.id === 'auditoria' && x.estado === 'listo') || l.find((x) => x.area && x.estado === 'listo') || null : null);

  /* Orden del día de la próxima reunión: borrador sin IA, guardable en la mesa de trabajo (Reuniones y delegación) */
  const lineasOD = (od) => od.items.map((it, i) => `${i + 1}. ${it.tema}. ${it.base}${/[.!?]$/.test(it.base) ? '' : '.'}${it.resp ? ' Responsable: ' + it.resp + '.' : ''}`);
  async function mesaComun() { if (!(A.mesa && A.mesa.cargar)) await cargarScript('js/mesa-comun.js'); return A.mesa; }
  async function ordenDia() {
    if (!puedeEst()) return null;
    let st = null; try { const M = await mesaComun(); st = await M.cargar(); } catch (e) { st = null; }
    return calcEst((X) => (X.ordenDelDia ? X.ordenDelDia(st) : null));
  }
  const NUMS = (t) => (String(t).match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/[.,]$/, ''));
  // La redacción pulida no puede traer cifras nuevas ni cambiar el número de puntos
  const mismasCifras = (borr, nuevo) => { const b = new Set(NUMS(borr)); const ln = (t) => String(t).split('\n').filter((x) => /^\s*\d+\.\s/.test(x)).length; return NUMS(nuevo).every((n) => b.has(n)) && ln(nuevo) === ln(borr) && ln(nuevo) > 0; };
  const PROMPT_REDACCION = 'Mejore la redacción de este orden del día de una reunión de dirección de la empresa. Reglas obligatorias: no añada cifras, importes, porcentajes, fechas, nombres ni datos nuevos; no quite ni cambie ninguna cifra; mantenga el mismo número de puntos, en el mismo orden, numerados igual («1.», «2.»…), uno por línea; trato de usted, frases cortas, sin superlativos; el sujeto es la empresa. Devuelva solo los puntos, sin introducción ni comentarios.\n\n';
  async function redactarMejor(borrador) {
    const P = A.platform; await P.ready;
    if (!(P.mode === 'server' && P.serverInfo && P.serverInfo.ia)) return { ok: false, motivo: 'La redacción con IA no está disponible en esta conexión: se mantiene el borrador.' };
    const r = await P.api('/chat', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: PROMPT_REDACCION + borrador }], tools: [], page, modo: 'analisis' }) });
    const t = ((r && r.content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!t || !mismasCifras(borrador, t)) return { ok: false, motivo: 'La redacción propuesta cambiaba cifras o puntos: se mantiene el borrador.' };
    return { ok: true, texto: t };
  }
  const sigLaborable = () => { const d = new Date(); do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  async function guardarOD(od, lineas) {
    if (informativa()) return { ok: false, motivo: 'Con la empresa modelo o la cuenta de demostración no se guarda nada.' };
    const M = await mesaComun(), st = await M.cargar(); st.reuniones = st.reuniones || [];
    const r = { id: M.uid(), titulo: 'Reunión de seguimiento', fecha: sigLaborable(), hora: '', dur: 60, lugar: '', proposito: od.proposito, puntos: lineas.map((l, i) => ({ hora: '', tema: l.replace(/^\s*\d+\.\s*/, ''), resp: (od.items[i] && od.items[i].resp) || '' })), acta: [{ t: '', resp: '', fecha: '' }], origen: 'guia' };
    st.reuniones.push(r); await M.guardarYa(st);
    return { ok: true, id: r.id, fecha: r.fecha };
  }
  function verOrdenDia(od) {
    open(); quitarTarjeta();
    if (!od) { add('bot', 'El orden del día se prepara con el sistema estratégico, que no está incluido en su plan.'); return null; }
    let lineas = lineasOD(od);
    const el = document.createElement('div'); el.className = 'msg bot as-plan as-od';
    const pintar = () => {
      el.innerHTML = `<p class="as-gt"><b>Orden del día · borrador</b><br>${esc(od.proposito)}</p><ol class="as-od-l">${lineas.map((l) => `<li>${esc(l.replace(/^\s*\d+\.\s*/, ''))}</li>`).join('')}</ol>
        <p class="as-gn">${informativa() ? esc(notaInf()) : 'Nada se guarda hasta que pulse «Guardar en la mesa de trabajo».'}</p>
        <div class="as-gb">${informativa() ? '' : '<button type="button" class="btn solid small" data-od="g">Guardar en la mesa de trabajo</button>'}<button type="button" class="btn ghost small" data-od="c">Copiar</button><button type="button" class="btn ghost small" data-od="r">Redactar mejor</button></div>`;
      const b = (k) => el.querySelector(`[data-od="${k}"]`);
      if (b('g')) b('g').onclick = async () => { b('g').disabled = true; const r = await guardarOD(od, lineas).catch((e) => ({ ok: false, motivo: e.message })); if (!r.ok) { note(r.motivo); b('g').disabled = false; return; } note('Orden del día guardado en la mesa de trabajo › Reuniones y delegación, para el ' + new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) + '.'); if (PG() === 'mesa.html') { location.hash = 'reuniones'; location.reload(); } else { const v = document.createElement('div'); v.className = 'as-gb'; v.innerHTML = '<a class="btn ghost small" href="mesa.html#reuniones">Ver en la mesa de trabajo</a>'; el.appendChild(v); } };
      b('c').onclick = async () => { const t = 'Orden del día\n' + lineas.join('\n'); try { await navigator.clipboard.writeText(t); note('Orden del día copiado.'); } catch (e) { note('No he podido copiar: seleccione el texto y cópielo.'); } };
      b('r').onclick = async () => { b('r').disabled = true; b('r').textContent = 'Redactando…'; let r; try { r = await redactarMejor(lineas.join('\n')); } catch (e) { r = { ok: false, motivo: 'No se ha podido redactar: se mantiene el borrador.' }; } if (r.ok) { lineas = r.texto.split('\n').filter((x) => /^\s*\d+\.\s/.test(x)); pintar(); note('Redacción mejorada, con las mismas cifras.'); } else { note(r.motivo); b('r').disabled = false; b('r').textContent = 'Redactar mejor'; } };
    };
    pintar();
    const lg = $('#asLog'); lg.appendChild(el); lg.scrollTop = el.getBoundingClientRect().top - lg.getBoundingClientRect().top + lg.scrollTop - 8;
    return lineas.join('\n');
  }
  /* Preguntas sobre informes y reuniones (sin IA): qué informe saco, abre el informe…, prepara la reunión */
  async function guiaInformes(text) {
    const t = norm(text).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
    const reunion = /\b(prepara(r|me)? la (reunion|sesion)|orden del dia|que vemos en la proxima (sesion|reunion)|prepara(r|me)? la proxima (sesion|reunion))\b/.test(t);
    const lista = /\b(que informes? (saco|puedo sacar|hago|tengo|hay)|informes? disponibles|que informes? me recomiendas)\b/.test(t);
    const pide = /\binforme\b/.test(t) && /\b(hazme|haz|saca|sacame|abre|abreme|abrir|genera|generame|muestrame|ensename|quiero|dame)\b/.test(t);
    if (!reunion && !lista && !pide) return null;
    if (!puedeEst()) return null;
    if (reunion) { const od = await ordenDia().catch(() => null); if (!od) return null; setTimeout(() => verOrdenDia(od), 50); return `Le preparo un borrador del orden del día con ${od.items.length} puntos, a partir de los datos de la empresa. Puede guardarlo en la mesa de trabajo, copiarlo o pedir una redacción mejor.`; }
    const l = await informes().catch(() => null); if (!l) return null;
    if (lista) return informesTexto(l);
    const x = informeDe(l, t.replace(/\b(hazme|haz|saca|sacame|abre|abreme|abrir|genera|generame|muestrame|ensename|quiero|dame|el|la|un|una|de|del|informe|por favor)\b/g, ' ').replace(/\s+/g, ' ').trim()) || (/\b360\b/.test(t) ? null : null);
    if (!x) return informesTexto(l);
    return pedirInforme(x);
  }
  /* Preguntas sobre la documentación (qué me falta, siguiente paso, por dónde empiezo…): se responden aquí, con el plan */
  async function guiaDoc(text) {
    const t = norm(text).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
    const todo = /\b(que me falta|que (documentos?|documentacion|datos) (tengo|debo|hay|me falta|me faltan|necesito)|que documentacion falta|que documentos faltan|plan de documentacion|ver (todo )?el plan|documentacion esencial)\b/.test(t);
    const paso = /\b(siguiente paso|por donde empiezo|por donde empezar|por donde sigo|que hago (ahora|primero)|cual es el siguiente)\b/.test(t);
    const ir = /\b(llevame|lleva me|vamos|quiero ir|ir) (a |al |hasta )?(ahi|alli|el siguiente( paso| documento)?|la siguiente)\b/.test(t);
    if (!todo && !paso && !ir) return null;
    if (!puedeEst()) return null;
    let p = null; try { p = await planDoc(); } catch (e) { p = null; }
    if (!p) return null;
    if (ir) { if (!p.siguiente) return 'La documentación está completa: no hay ningún documento pendiente.'; const r = irADoc(p.siguiente); return r.ok ? `${r.viaje ? 'Le llevo a' : 'Abro'} «${p.siguiente.n}». ${p.siguiente.como}` : r.motivo || 'No he podido abrir esa pantalla.'; }
    return planTexto(p, !todo) + (informativa() ? ' ' + notaInf() : '');
  }

  /* ---------- Cerebro 1: servidor con Claude ---------- */
  /* ¿Es una petición de guía o navegación (ir a un sitio, qué falta, siguiente paso, cómo se sube algo)? Si pide analizar,
     valorar, comparar, explicar o redactar, no lo es. */
  const esGuia = (text) => {
    const t = norm(text);
    if (/(analiz|valora|redact|escrib|informe|por que|explica|compar|riesgo|recomiend|resum|opinas|deberia|conviene|simula|calcula|cuanto|cuanta|preocup|mejorar|que significa|que es )/.test(t)) return false;
    return /(llevame|lleva me|ve a |vete a|vamos a|ir a |quiero ir|abre|abrir|ensename|muestrame|donde (esta|estoy|se |subo|cargo|meto|pongo|entrego)|que me falta|que documentos|que documentacion|siguiente paso|por donde (empiezo|empezar|sigo)|que hago (ahora|primero|despues)|como (subo|cargo|importo|meto|adjunto|entrego)|cierra|cerrar|manual|vuelve|volver)/.test(t);
  };
  async function viaServer(history) {
    const tools = toolDefs();
    const defs = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
    const msgs = history.map((m) => ({ role: m.role, content: m.content }));
    // Guía y navegación van al modelo ligero del servidor; el análisis y la redacción, al principal (el mismo en toda la consulta)
    const ult = history.filter((m) => m.role === 'user').slice(-1)[0], modo = ult && esGuia(ult.content) ? 'guia' : 'analisis';
    for (let round = 0; round < 6; round++) {
      const r = await A.platform.api('/chat', { method: 'POST', body: JSON.stringify({ messages: msgs, tools: defs, page, modo }) });
      if (r.stop_reason === 'refusal') return 'No puedo ayudarle con esa petición. Pruebe a formularla de otra manera.';
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
    return 'He hecho varios ajustes; revise los semáforos y dígame si quiere seguir.';
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
    if (/(mejora|oportunidad|donde gano|ahorro|que hago)/.test(t)) return S.hallazgos.length ? 'Las mayores oportunidades: ' + S.hallazgos.slice(0, 4).map((h) => `${h.hallazgo} (${h.impactoAnual} al año)`).join(' ') : 'Complete los módulos para encontrar oportunidades.';
    if (/(resumen|como va|como esta|situacion)/.test(t)) { const red = S.indicadores.filter((x) => x.estado === 'Rojo'); return `Está en ${S.moduloActual}. ${red.length ? 'Indicadores en rojo: ' + red.slice(0, 5).map((x) => `${x.indicador.toLowerCase()} (${x.area.toLowerCase()}): ${x.valor}`).join('; ') + '.' : 'No hay indicadores en rojo.'}`; }
    return null;
  }
  function local(text) {
    const g = guiaLocal(text); if (g) return g;
    // Mundos sin cálculos propios para el asistente (personas y equipos, mesa de trabajo): guía y diccionario
    if (!api || !api.summary) { const L = lookup(norm(text).replace(/^(que es|que son|que significa|explicame|explica|no entiendo|como funciona|define)\s+(el |la |los |las |un |una )?/, '').replace(/[?¿.!]/g, '').trim()); if (L.diccionario.length) { const d = L.diccionario[0]; return `${d.termino}: ${d.definicion}`; } return guiaLocal('donde estoy') + ' Si me lo pregunta, también le explico cómo funciona cada herramienta o abro el manual en ese apartado.'; }
    if (page !== 'simulador') { const r = localStrategy(text); if (r) return r; const L = lookup(norm(text).replace(/^(que es|que son|que significa|explicame|explica|no entiendo|como funciona|define)\s+(el |la |los |las |un |una )?/, '').replace(/[?¿.!]/g, '').trim()); if (L.diccionario.length) { const d = L.diccionario[0]; return `${d.termino}: ${d.definicion}${d.ejemplo ? ' Por ejemplo: ' + d.ejemplo : ''}`; } if (L.grupo.length) return `${L.grupo[0].tema}: ${L.grupo[0].explicacion}`; return 'Puedo explicarle un concepto («qué es el OEE»), llevarle a un módulo («abre impuestos»), decirle los riesgos o las mejoras principales, o mover palancas («sube el precio un 3 %»).'; }
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
      if (p && !n) return `¿A qué valor quiere poner ${A.fieldLabel(p).toLowerCase()}? Por ejemplo: «pon ${A.fieldLabel(p).toLowerCase()} a ${S.variables[p]}».`;
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
      return `Veredicto: ${S.veredicto}. ${reds.length ? 'Lo que más debe preocuparte: ' + reds.slice(0, 3).map((x) => `${x.indicador.toLowerCase()} (${x.valor}, ${x.estado.toLowerCase()})`).join('; ') + '. ' : 'Todos los semáforos están en verde. '}Su liquidez mínima es ${S.cifras.liquidezMinima} en el mes ${S.cifras.mesLiquidezMinima}, con ${String(S.cifras.colchonMinimoMeses).replace('.', ',')} meses de colchón. ${reds[0] ? 'Primera acción: ' + reds[0].consejo : ''}`;
    }
    if (/(resumen|como estoy|como va|situacion|veredicto|puedo invertir|me lo puedo permitir|que me recomiendas)/.test(t)) {
      return `Escenario ${S.escenario.toLowerCase()}, estructura ${S.estructura.toLowerCase()}. Veredicto: ${S.veredicto}. Liquidez mínima ${S.cifras.liquidezMinima} en el mes ${S.cifras.mesLiquidezMinima}; recuperación en ${S.cifras.recuperacion}; cuota nueva de ${S.cifras.cuotaNueva}. ${Array.isArray(S.plan) && S.plan.length ? 'Para alcanzar su meta: ' + S.plan.join('; ') + '.' : ''}`;
    }
    if (/(compara|cual es mejor|que estructura)/.test(t) && api.compareStructures) {
      const c = api.compareStructures();
      return `La que mejor encaja es ${c[0].estructura.toLowerCase()} (${c[0].encaje} puntos): liquidez mínima ${c[0].liquidezMinima}, recuperación ${c[0].recuperacion}, control ${c[0].control}. Le siguen ${c[1].estructura.toLowerCase()} y ${c[2].estructura.toLowerCase()}. Toque cada tarjeta en «Estructuras societarias» para ver su ficha completa.`;
    }
    // Conceptos, grupos y estructuras
    const q = t.replace(/^(que es|que son|que significa|explicame|explica|no entiendo|como funciona|que quiere decir|define|dime que es)\s+(el |la |los |las |un |una )?/, '').replace(/[?¿.!]/g, '').trim();
    const L = lookup(q);
    if (L.estructuras.length) { const e = L.estructuras[0]; return `${e.estructura}: ${e.comoFunciona} A favor: ${e.ventajas.slice(0, 2).join('; ').toLowerCase()}. En contra: ${e.inconvenientes.slice(0, 2).join('; ').toLowerCase()}. La fiscalidad concreta debe confirmarla su asesor.`; }
    if (L.grupo.length) return `${L.grupo[0].tema}: ${L.grupo[0].explicacion}`;
    if (L.diccionario.length) { const d = L.diccionario[0]; return `${d.termino}: ${d.definicion}${d.ejemplo ? ' Por ejemplo: ' + d.ejemplo : ''}${d.directas.length ? ' Lo mueven: ' + d.directas.join(', ').toLowerCase() + '.' : ''}`; }
    if (/(grupo|sociedades|holding)/.test(t)) return 'En un grupo, una holding suele poseer la sociedad operativa y una patrimonial. El dinero se mueve con dividendos (exentos al 95 % entre sociedades del grupo si se cumplen requisitos) y préstamos intragrupo a tipo de mercado; con un 75 % de participación pueden consolidar fiscalmente. Pregúnteme por cualquiera de esos conceptos.';
    return 'Puedo explicarle cualquier concepto («qué es el EBITDA»), revisar su situación («¿me lo puedo permitir?»), decirle cómo poner en verde un semáforo («¿cómo mejoro la liquidez?») o hacer cambios («pon la financiación al 80 %», «sube el plazo a 9 años», «simula perder un cliente del 10 % en el mes 14», «adopta la filial»).';
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
    if (f) { f.classList.toggle('on', voz); f.classList.toggle('oye', voz && listening); f.classList.toggle('habla', hablando); f.setAttribute('aria-pressed', String(voz)); f.title = voz ? 'Conversación por voz encendida: toque para apagarla' : 'Encender la conversación por voz'; }
    if (st) st.textContent = !voz ? '' : hablando ? 'Hablando…' : listening ? 'Le escucho' : busy ? 'Pensando…' : 'En pausa';
    const sw = $('#asVoz'); if (sw) { sw.setAttribute('aria-pressed', String(voz)); sw.setAttribute('aria-checked', String(voz)); }
    const sp = $('#asSpeak'); if (sp) { sp.setAttribute('aria-pressed', String(speak)); sp.setAttribute('aria-checked', String(speak)); }
  }
  function pararEscucha() { if (rec) { try { rec.onend = null; rec.abort(); } catch (e) { /* ya parado */ } } rec = null; listening = false; const m = $('#asMic'); if (m) { m.classList.remove('on'); m.setAttribute('aria-pressed', 'false'); } }
  function setVoz(on) {
    if (on && !SR) { note('Su navegador no permite la conversación por voz. Funciona en Chrome, Edge y Safari recientes con la web en https.'); on = false; }
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
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { note('El micrófono no está permitido. Dé permiso en el navegador para hablar con el asistente.'); setVoz(false); }
      else if (e.error !== 'no-speech' && e.error !== 'aborted') fallos++;
    };
    rec.onend = () => {
      listening = false; rec = null; marcar();
      const t = fin.trim();
      if (t) { fallos = 0; if (input) input.value = ''; send(t); return; }
      if (fallos > 4) { note('No consigo escuchar. Revise el micrófono; he apagado la conversación por voz.'); setVoz(false); return; }
      if (voz) setTimeout(escuchar, 250);
    };
    try { rec.start(); listening = true; } catch (e) { listening = false; fallos++; if (voz && fallos <= 4) setTimeout(escuchar, 800); }
    marcar();
  }
  /* Dictado de una sola pregunta con el botón del micrófono */
  function toggleMic() {
    if (!SR) { note('Su navegador no permite dictar. Funciona en Chrome, Edge y Safari recientes con la web abierta en https.'); return; }
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
    rec.onerror = (e) => { note(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'El micrófono no está permitido aquí. Dé permiso en el navegador, o escriba su pregunta.' : 'No le he oído bien. Pruebe otra vez o escriba.'); };
    rec.onend = () => { listening = false; $('#asMic').classList.remove('on'); $('#asMic').setAttribute('aria-pressed', 'false'); if (finalText.trim()) send(finalText.trim()); };
    try { rec.start(); listening = true; $('#asMic').classList.add('on'); $('#asMic').setAttribute('aria-pressed', 'true'); speak = true; marcar(); }
    catch (e) { note('No se pudo activar el micrófono.'); }
  }

  /* ---------- Interfaz ---------- */
  const LOGK = 'atalaya.asistente.log';
  const history = [];
  let busy = false;
  function note(t) { add('note', t); }
  function activity(name) { const m = { cambiar_variable: 'Ajustando el simulador…', cambiar_escenario: 'Cambiando de escenario…', anadir_hipotesis: 'Añadiendo la hipótesis…', cambiar_estructura: 'Cambiando la estructura…', aplicar_plan: 'Aplicando el plan…', ver_situacion: 'Revisando su situación…', comparar_estructuras: 'Comparando estructuras…', explicar_concepto: 'Buscando en el diccionario…', cambiar_palanca: 'Moviendo la palanca…', donde_estoy: 'Mirando dónde está…', ir_a_mundo: 'Preparando el viaje…', ir_a_zona: 'Abriendo…', cerrar: 'Cerrando…', abrir_manual: 'Abriendo el manual…', ver_plan_documentacion: 'Revisando la documentación…', ir_a_documento: 'Abriendo la pantalla del documento…', ver_informes: 'Revisando los informes…', abrir_informe: 'Abriendo el informe…', preparar_orden_del_dia: 'Preparando el orden del día…' }[name]; if (m) { const t = $('#asThinking'); if (t) t.textContent = m; } }
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
      answer = (await guiaInformes(text)) || (await guiaDoc(text)) || guiaLocal(text);
      if (!answer) {
        await A.platform.ready;
        if (A.platform.mode === 'server' && A.platform.serverInfo && A.platform.serverInfo.ia) {
          // Tope de IA de la cuenta de demostración: se dice tal cual (no es un fallo); con otros errores, el modo básico
          try { answer = await viaServer(history); } catch (e) { answer = e && e.body && e.body.limiteDemo ? e.message : null; }
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
  function open() { const p = $('#asPanel'); if (p.hidden) { p.hidden = false; $('#asFab').setAttribute('aria-expanded', 'true'); const t = tarjetaAct; if (t) { quitarTarjeta(); pintarTarjeta(t, true); } setTimeout(() => $('#asInput').focus(), 50); } }
  function close() { $('#asPanel').hidden = true; $('#asFab').setAttribute('aria-expanded', 'false'); if (window.speechSynthesis && !voz) speechSynthesis.cancel(); }

  const SUGS = {
    simulador: ['¿Me lo puedo permitir?', '¿Qué me debería preocupar?', '¿Cómo pongo en verde la liquidez?', 'Pon la financiación al 80 %', 'Llévame a la mesa de trabajo', '¿Dónde estoy?', 'Abre el manual'],
    estrategia: ['¿Qué me falta?', '¿Qué informe saco?', 'Prepara la reunión', '¿Cómo va el presupuesto?', '¿Dónde está el mayor riesgo?', 'Sube el precio un 3 %', 'Abre impuestos', 'Llévame a personas y equipos', '¿Dónde estoy?', 'Abre el manual'],
    personas: ['¿Dónde estoy?', 'Abre liderazgo a medida', 'Abre el plan de desarrollo', 'Llévame a la mesa de trabajo', 'Abre el manual de liderazgo', 'Cierra el mundo'],
    intervencion: ['¿Dónde estoy?', 'Abre el guion de la sesión', 'Abre la escucha y transcripción', 'Abre el triaje y hoja de ruta', 'Abre el plan de intervención', 'Abre el manual de la auditoría integral'],
    mesa: ['¿Dónde estoy?', 'Abre las metas SMART', 'Abre la agenda semanal', 'Abre el manual de metas', 'Llévame al sistema estratégico', 'Cierra el mundo'],
    inicio: ['¿Dónde estoy?', '¿Por dónde empiezo?', 'Llévame al tablero', 'Llévame al simulador', 'Llévame a la mesa de trabajo', 'Abre el manual'],
    tablero: ['¿Dónde estoy?', 'Llévame a la mesa de trabajo', 'Llévame al sistema estratégico', 'Abre el manual del tablero', 'Cierra el mundo'],
    libro: ['¿Dónde estoy?', 'Llévame al tablero', 'Llévame al simulador', 'Abre el manual del libro corporativo', 'Cierra el mundo'],
    grupo: ['¿Dónde estoy?', 'Llévame al tablero', 'Llévame a la mesa de trabajo', 'Abre el manual de la cartera', 'Cierra el mundo']
  };
  const HOLA = {
    simulador: 'Hola. Cuénteme qué le preocupa de la inversión o pregúnteme lo que no entienda. Puedo hacer cambios por usted («pon el plazo a 9 años») y llevarle a cualquier sitio («llévame a la mesa de trabajo»).',
    estrategia: 'Hola. Puedo explicarle cualquier análisis, decirle dónde están los riesgos, mover las palancas estratégicas y llevarle a cualquier módulo o mundo.',
    personas: 'Hola. Soy su guía en personas y equipos: dígame a qué herramienta quiere ir, pida que abra el manual de cualquier tema o que le lleve a otro mundo.',
    intervencion: 'Hola. Soy su guía en la auditoría integral: puedo llevarle al guion de la primera sesión, a la escucha de la transcripción, al triaje, a la auditoría o al plan de intervención, y abrir el manual de cada parte.',
    mesa: 'Hola. Soy su guía en la mesa de trabajo: dígame qué parte quiere ver (hoy, prioridades, agenda, metas), pida el manual o que le lleve a otro mundo.',
    inicio: 'Hola. Soy su guía en Atalaya 360°: dígame a qué mundo quiere ir («llévame al tablero», «llévame al simulador») o pida que abra el manual.',
    tablero: 'Hola. Soy su guía en el tablero general: puedo explicarle lo que ve, llevarle al mundo de cada prioridad o abrir el manual.',
    libro: 'Hola. Soy su guía en el libro corporativo: puedo llevarle al mundo de cada informe o abrir el manual.',
    grupo: 'Hola. Soy su guía en la cartera de clientes y el grupo empresarial: puedo llevarle a cualquier mundo o abrir el manual.'
  };
  // En Consultora el grupo empresarial se llama cartera de clientes
  const nombreGrupo = () => { const P = A.platform, pl = P && P.user && P.PLANES && P.PLANES[P.user.plan]; if (pl && !pl.grupo) { MUNDOS.grupo.n = 'la cartera de clientes'; MUNDOS.grupo.d = 'Las empresas cliente de la cuenta juntas: las cifras de cada una y su comparativa, en qué etapa del recorrido está cada cliente, sus próximas sesiones y lo que tiene pendiente.'; } };
  A.assistant = {
    init(opts) {
      opts = opts || {};
      api = opts.api || null; page = opts.page || 'simulador';
      nombreGrupo();
      if ($('#asFab')) return;
      const wrap = document.createElement('div');
      wrap.className = 'assistant';
      wrap.innerHTML = `<div class="as-bar"><span class="as-vozst" id="asVozSt" aria-live="polite"></span><button class="as-voz" id="asVozBtn" type="button" aria-pressed="false" aria-label="Conversación por voz"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><button class="as-fab" id="asFab" aria-expanded="false" aria-controls="asPanel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg><span>Asistente</span></button></div>
        <section class="as-panel glass" id="asPanel" hidden aria-label="Asistente de Atalaya">
          <header><div><b>Asistente y guía</b><small id="asMode"></small></div><button class="icon-btn" id="asClose" aria-label="Cerrar">×</button></header>
          <div class="as-log" id="asLog" aria-live="polite"></div>
          <div class="as-sugs" id="asSugs"></div>
          <form id="asForm"><button type="button" class="icon-btn as-mic" id="asMic" aria-pressed="false" aria-label="Dictar una pregunta"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><input class="input" id="asInput" placeholder="Escriba o hable: «llévame a…», «¿me lo puedo permitir?»" autocomplete="off"><button class="btn solid" type="submit">Enviar</button></form>
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
      // Guía de la documentación: tarjeta de saludo (sistema estratégico y puesto de mando) y aviso después de cada entrega
      setTimeout(() => { saludoPlan().catch((e) => console.error(e)); }, 3500);
      informePendiente().catch((e) => console.error(e));
      vigilarEntregas();
      A.platform.ready.then(async () => {
        const m = $('#asMode');
        if (A.platform.mode === 'server' && A.platform.serverInfo && A.platform.serverInfo.ia) m.textContent = 'Con Claude';
        else { const s = await getSample(); m.textContent = s ? 'Con Claude (le pedirá permiso)' : 'Modo básico sin conexión'; }
      });
    },
    ask(text) { send(text); },
    open,
    voz: (on) => setVoz(on),
    guia: { destinos, mundoActual, irZona, viajar, cerrarVentanas },
    plan: { calcular: planDoc, ver: () => planDoc().then(verPlan), texto: (corto) => planDoc().then((p) => planTexto(p, corto)), saludo: saludoPlan, informes, ordenDia, verOrdenDia, redactarMejor, mismasCifras, PROMPT_REDACCION }
  };
  /* Puesto de mando, tablero, libro y cartera: el asistente hace de guía en cuanto la cuenta está en la barra */
  const AUTO = { 'portal.html': 'inicio', 'tablero.html': 'tablero', 'libro.html': 'libro', 'grupo.html': 'grupo' }[PG()];
  if (AUTO && window.top === window.self) {
    let n = 0;
    const arrancar = () => { if ($('#asFab')) return; if (A.platform && A.platform.user && document.querySelector('#account .acc-btn')) A.assistant.init({ page: AUTO }); else if (++n < 80) setTimeout(arrancar, 250); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
  }
})();
