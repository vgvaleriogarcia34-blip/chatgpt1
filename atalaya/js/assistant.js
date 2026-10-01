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
Responde en 3-8 frases salvo que pidan detalle. Tus respuestas pueden leerse en voz alta: no uses tablas, asteriscos ni símbolos.`;

  /* ---------- Herramientas (mismas para los tres cerebros) ---------- */
  let api = null, page = 'simulador';
  function toolDefs() {
    const T = [];
    T.push({ name: 'ver_situacion', description: 'Devuelve el estado actual: veredicto, semáforos con sus horquillas y variables que los mueven, cifras clave, escenarios, hipótesis activas y plan de corrección. Úsala antes de opinar.', inputSchema: { type: 'object', properties: {} }, run: () => api.summary() });
    T.push({ name: 'explicar_concepto', description: 'Busca un término en el diccionario corporativo de Atalaya (definición, fórmula, ejemplo y variables que lo mueven) o un tema de estructuras y grupos de sociedades.', inputSchema: { type: 'object', properties: { termino: { type: 'string' } }, required: ['termino'] }, run: (i) => lookup(i.termino) });
    if (api.setVar) T.push({ name: 'cambiar_variable', description: 'Cambia una variable del simulador y devuelve el veredicto y la liquidez antes y después. Variables válidas: ' + api.settable.join(', ') + '. Porcentajes en puntos (70 = 70 %), importes en euros, plazos en las unidades del campo.', inputSchema: { type: 'object', properties: { variable: { type: 'string', enum: api.settable }, valor: { type: 'number' } }, required: ['variable', 'valor'] }, run: (i) => api.setVar(i.variable, i.valor) });
    if (api.setScenario) T.push({ name: 'cambiar_escenario', description: 'Activa un escenario: estres, pesimista, base, optimista o hipotesis.', inputSchema: { type: 'object', properties: { escenario: { type: 'string', enum: ['estres', 'pesimista', 'base', 'optimista', 'hipotesis'] } }, required: ['escenario'] }, run: (i) => api.setScenario(i.escenario) });
    if (api.addHyp) T.push({ name: 'anadir_hipotesis', description: 'Añade y activa un suceso hipotético. tipo: cliente (pérdida de cliente, % ventas), ventas (caída temporal, %), margen (pp), tipos (pp), cobro (días), salarios (%), puntual (miles de euros).', inputSchema: { type: 'object', properties: { tipo: { type: 'string', enum: ['cliente', 'ventas', 'margen', 'tipos', 'cobro', 'salarios', 'puntual'] }, mes: { type: 'integer' }, duracion: { type: 'integer' }, magnitud: { type: 'number' } }, required: ['tipo'] }, run: (i) => api.addHyp(i.tipo, i.mes, i.duracion, i.magnitud) });
    if (api.setStructure) T.push({ name: 'cambiar_estructura', description: 'Adopta una estructura societaria: directa, leasing, filial, patrimonial, socio o jv.', inputSchema: { type: 'object', properties: { estructura: { type: 'string', enum: ['directa', 'leasing', 'filial', 'patrimonial', 'socio', 'jv'] } }, required: ['estructura'] }, run: (i) => api.setStructure(i.estructura) });
    if (api.compareStructures) T.push({ name: 'comparar_estructuras', description: 'Compara las seis estructuras societarias con los datos actuales: encaje, liquidez mínima, recuperación, plazo y control.', inputSchema: { type: 'object', properties: {} }, run: () => api.compareStructures() });
    if (api.applyPlan) T.push({ name: 'aplicar_plan', description: 'Aplica al simulador el plan de corrección calculado para alcanzar la posición meta.', inputSchema: { type: 'object', properties: {} }, run: () => api.applyPlan() });
    if (api.setLever) T.push({ name: 'cambiar_palanca', description: 'Cambia una palanca del sistema estratégico: ' + api.levers.join(', ') + '. Valores en % de variación salvo que se indique.', inputSchema: { type: 'object', properties: { palanca: { type: 'string', enum: api.levers }, valor: { type: 'number' } }, required: ['palanca', 'valor'] }, run: (i) => api.setLever(i.palanca, i.valor) });
    if (api.goTo) T.push({ name: 'ir_a', description: 'Lleva al usuario a una sección o a un dato concreto de la página (id de sección o ruta de variable).', inputSchema: { type: 'object', properties: { destino: { type: 'string' } }, required: ['destino'] }, run: (i) => api.goTo(i.destino) });
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
  function local(text) {
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

  /* ---------- Voz ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, speak = false;
  function speakOut(text) {
    if (!speak || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[*_#•]/g, ''));
      u.lang = 'es-ES';
      const v = speechSynthesis.getVoices().find((x) => /^es(-|_)ES/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^es/i.test(x.lang));
      if (v) u.voice = v;
      u.rate = 1.02;
      speechSynthesis.speak(u);
    } catch (e) { /* sin síntesis de voz */ }
  }
  function toggleMic() {
    if (!SR) { note('Tu navegador no permite dictar. Funciona en Chrome, Edge y Safari recientes con la web abierta en https.'); return; }
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
    try { rec.start(); listening = true; $('#asMic').classList.add('on'); $('#asMic').setAttribute('aria-pressed', 'true'); speak = true; $('#asSpeak').setAttribute('aria-pressed', 'true'); }
    catch (e) { note('No se pudo activar el micrófono.'); }
  }

  /* ---------- Interfaz ---------- */
  const history = [];
  let busy = false;
  function note(t) { add('note', t); }
  function activity(name) { const m = { cambiar_variable: 'Ajustando el simulador…', cambiar_escenario: 'Cambiando de escenario…', anadir_hipotesis: 'Añadiendo la hipótesis…', cambiar_estructura: 'Cambiando la estructura…', aplicar_plan: 'Aplicando el plan…', ver_situacion: 'Revisando tu situación…', comparar_estructuras: 'Comparando estructuras…', explicar_concepto: 'Buscando en el diccionario…', cambiar_palanca: 'Moviendo la palanca…' }[name]; if (m) { const t = $('#asThinking'); if (t) t.textContent = m; } }
  function add(role, text) {
    const box = $('#asLog');
    const el = document.createElement('div');
    el.className = 'msg ' + role;
    el.innerHTML = esc(text).replace(/\n/g, '<br>');
    box.appendChild(el); box.scrollTop = box.scrollHeight;
    return el;
  }
  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    open();
    $('#asInput').value = '';
    add('user', text);
    history.push({ role: 'user', content: text });
    busy = true;
    const bubble = add('bot', '');
    bubble.innerHTML = '<span id="asThinking" class="thinking">Pensando…</span>';
    let answer = null;
    try {
      await A.platform.ready;
      if (A.platform.mode === 'server' && A.platform.serverInfo && A.platform.serverInfo.ia) {
        try { answer = await viaServer(history); } catch (e) { answer = null; }
      }
      if (!answer) answer = await viaSample(history, (t) => { bubble.textContent = t; });
      if (!answer) answer = local(text);
    } catch (e) { answer = 'Ha habido un problema: ' + e.message; }
    bubble.innerHTML = esc(answer).replace(/\n/g, '<br>');
    history.push({ role: 'assistant', content: answer });
    if (history.length > 30) history.splice(0, history.length - 30);
    speakOut(answer);
    busy = false;
    $('#asLog').scrollTop = $('#asLog').scrollHeight;
  }
  function open() { const p = $('#asPanel'); if (p.hidden) { p.hidden = false; $('#asFab').setAttribute('aria-expanded', 'true'); setTimeout(() => $('#asInput').focus(), 50); } }
  function close() { $('#asPanel').hidden = true; $('#asFab').setAttribute('aria-expanded', 'false'); if (window.speechSynthesis) speechSynthesis.cancel(); }

  A.assistant = {
    init(opts) {
      api = opts.api; page = opts.page || 'simulador';
      const wrap = document.createElement('div');
      wrap.className = 'assistant';
      wrap.innerHTML = `<button class="as-fab" id="asFab" aria-expanded="false" aria-controls="asPanel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg><span>Asistente</span></button>
        <section class="as-panel glass" id="asPanel" hidden aria-label="Asistente de Atalaya">
          <header><div><b>Asistente</b><small id="asMode"></small></div><button class="icon-btn" id="asClose" aria-label="Cerrar">×</button></header>
          <div class="as-log" id="asLog" aria-live="polite"></div>
          <div class="as-sugs" id="asSugs"></div>
          <form id="asForm"><button type="button" class="icon-btn as-mic" id="asMic" aria-pressed="false" aria-label="Hablar"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><input class="input" id="asInput" placeholder="Escribe o pulsa el micrófono" autocomplete="off"><button class="btn solid" type="submit">Enviar</button></form>
          <label class="as-speak"><button type="button" class="switch" role="switch" id="asSpeak" aria-pressed="false" aria-label="Leer las respuestas en voz alta"></button> Leer las respuestas en voz alta</label>
        </section>`;
      document.body.appendChild(wrap);
      $('#asFab').onclick = () => ($('#asPanel').hidden ? open() : close());
      $('#asClose').onclick = close;
      $('#asForm').onsubmit = (e) => { e.preventDefault(); send($('#asInput').value); };
      $('#asMic').onclick = toggleMic;
      $('#asSpeak').onclick = () => { speak = !speak; $('#asSpeak').setAttribute('aria-pressed', speak); $('#asSpeak').setAttribute('aria-checked', speak); if (!speak && window.speechSynthesis) speechSynthesis.cancel(); };
      const sugs = page === 'simulador'
        ? ['¿Me lo puedo permitir?', '¿Qué me debería preocupar?', '¿Cómo pongo en verde la liquidez?', 'Pon la financiación al 80 %', 'Simula perder un cliente del 10 % en el mes 14', '¿Qué es una sociedad holding?', 'Compara las estructuras']
        : ['¿Cómo va el presupuesto?', '¿Qué clientes me hacen grande pero no rico?', 'Sube el precio un 3 %', '¿Qué es el ABC prima?', '¿Dónde está el mayor riesgo?'];
      $('#asSugs').innerHTML = sugs.map((s) => `<button class="chip" type="button">${s}</button>`).join('');
      $('#asSugs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) send(b.textContent); });
      add('bot', page === 'simulador' ? 'Hola. Cuéntame qué te preocupa de la inversión o pregúntame lo que no entiendas. También puedo hacer cambios por ti: «pon el plazo a 9 años», «activa el escenario pesimista», «adopta la filial».' : 'Hola. Puedo explicarte cualquier análisis, decirte dónde están los riesgos y mover las palancas estratégicas por ti.');
      A.platform.ready.then(async () => {
        const m = $('#asMode');
        if (A.platform.mode === 'server' && A.platform.serverInfo && A.platform.serverInfo.ia) m.textContent = 'Con Claude';
        else { const s = await getSample(); m.textContent = s ? 'Con Claude (te pedirá permiso)' : 'Modo básico sin conexión'; }
      });
    },
    ask(text) { send(text); },
    open
  };
})();
