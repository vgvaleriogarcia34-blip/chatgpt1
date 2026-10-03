/* Atalaya 360° · Auditoría integral · escucha de la sesión
   Lee la transcripción de la reunión (texto, SRT o VTT, Word o PDF exportados de la grabadora o de la
   herramienta de actas), separa quién habla y lee entre líneas lo que dice el empresario:
   · los siete huecos que delata su lenguaje, con la cita literal que los sostiene;
   · cómo habla: absolutos, causa fuera, obligación, emoción, quitar importancia, urgencias, «todo pasa por mí»,
     el «yo» frente al «nosotros» y las palabras que más repite;
   · resignificar: lo que dice, lo que puede estar diciendo de verdad y la pregunta que lo confirma;
   · una estimación de sus constantes (tensión, temperatura, dependencia) para contrastar con la del consultor.
   Con Claude disponible (servidor o visor), añade una lectura en profundidad del contexto. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const D = () => A.intervDatos;
  const E = (A.intervEscucha = {});
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const STOP = new Set('de la que el en y a los se del las un por con no una su para es al lo como mas más pero sus le ya o este si porque esta entre cuando muy sin sobre tambien también me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mi antes algunos que unos yo otro otras otra el tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mis tu te ti tus ellas nosotras vosotros os mio mia tuyo suyo nuestro vuestro esos esas estoy esta estamos estan ser soy es son era fue ha he han hemos habia tiene tengo tenemos tienen hacer hace hago bueno pues vale claro entonces digo dice decir osea o_sea vamos ahi alli aqui asi tambien cosa cosas vez veces ver igual luego ahora bien sea van va voy sí si eh ah mm'.split(' '));

  /* ---------- Leer la transcripción ---------- */
  E.leerArchivo = async (file) => {
    const n = file.name.toLowerCase();
    if (/\.(srt|vtt|txt|md|json)$/.test(n)) return file.text();
    if (A.docs && A.docs.read) return (await A.docs.read(file)).texto;
    return file.text();
  };
  // Turnos: «Nombre: texto», «Speaker 1 00:01:02» + líneas, bloques SRT/VTT con «<v Nombre>» o «Nombre:».
  E.parse = (texto) => {
    const lineas = String(texto || '').replace(/\r/g, '').split('\n');
    const turnos = []; let actual = null;
    const ts = /^\s*\d{1,2}:\d{2}(:\d{2})?([.,]\d+)?(\s*-->\s*\d{1,2}:\d{2}(:\d{2})?([.,]\d+)?)?\s*$/;
    const push = (h, t) => { t = t.trim(); if (!t) return; if (actual && actual.h === h) actual.t += ' ' + t; else { actual = { h, t }; turnos.push(actual); } };
    let hablante = 'Sin identificar';
    lineas.forEach((l) => {
      const s = l.trim(); if (!s || s === 'WEBVTT' || /^\d+$/.test(s) || ts.test(s) || /^NOTE\b/.test(s)) return;
      let m = s.match(/^<v\s+([^>]+)>(.*?)(<\/v>)?$/i); if (m) { hablante = m[1].trim(); push(hablante, m[2]); return; }
      // «Speaker 1 00:01:02» o «Ana García 01:02» en línea propia
      m = s.match(/^([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ .'-]{0,38}?)\s+\(?\d{1,2}:\d{2}(:\d{2})?\)?\s*$/); if (m) { hablante = m[1].trim(); return; }
      // «Nombre: texto» o «[00:01] Nombre: texto»
      m = s.match(/^(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ .'-]{0,38}?)\s*[:：]\s+(.+)$/); if (m && m[1].split(' ').length <= 4) { hablante = m[1].trim(); push(hablante, m[2]); return; }
      push(hablante, s.replace(/^\[?\d{1,2}:\d{2}(:\d{2})?\]?\s*/, ''));
    });
    const cuenta = {}; turnos.forEach((x) => { cuenta[x.h] = (cuenta[x.h] || 0) + x.t.split(/\s+/).length; });
    const hablantes = Object.keys(cuenta).map((h) => ({ n: h, palabras: cuenta[h] })).sort((a, b) => b.palabras - a.palabras);
    return { turnos, hablantes };
  };
  // Por defecto el cliente es quien más habla (en la primera sesión debe hablar él)
  E.clientePorDefecto = (hablantes, consultor) => { const c = norm(consultor || ''); const h = hablantes.find((x) => !c || !norm(x.n).includes(c.split(' ')[0])); return h ? [h.n] : []; };

  /* ---------- Leer entre líneas ---------- */
  const frases = (t) => (String(t).match(/[^.!?¿¡\n]+[.!?]*/g) || []).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 3);
  const contiene = (fn, w) => { const n = norm(w); return n.includes(' ') ? fn.includes(n) : new RegExp('(^|[^a-zñ])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zñ]|$)').test(fn); };
  E.analizar = (parsed, clientes) => {
    const set = new Set(clientes && clientes.length ? clientes : parsed.hablantes.slice(0, 1).map((h) => h.n));
    const texto = parsed.turnos.filter((x) => set.has(x.h)).map((x) => x.t).join(' ');
    const fs = frases(texto), fn = fs.map(norm);
    const palabras = norm(texto).split(/[^a-zñ]+/).filter(Boolean);
    const total = palabras.length || 1;
    // Huecos con su cita
    const huecos = D().PATRONES.map((p) => {
      const citas = []; fn.forEach((f, i) => { const w = p.senales.find((s) => contiene(f, s)); if (w && citas.length < 6) citas.push({ cita: fs[i], senal: w }); });
      return { id: p.id, n: p.n, citas, peso: citas.length };
    });
    // Cómo habla
    const lenguaje = Object.keys(D().LEXICO).map((k) => {
      const L = D().LEXICO[k]; const ej = []; let n = 0;
      fn.forEach((f, i) => { const w = L.w.filter((x) => contiene(f, x)); if (w.length) { n += w.length; if (ej.length < 3) ej.push(fs[i]); } });
      return { id: k, n: L.n, d: L.d, cuenta: n, por1000: Math.round((n / total) * 1000 * 10) / 10, ejemplos: ej };
    });
    const yo = palabras.filter((w) => ['yo', 'me', 'mi', 'conmigo'].includes(w)).length, nos = palabras.filter((w) => ['nosotros', 'nosotras', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'nos'].includes(w)).length;
    const freq = {}; palabras.filter((w) => w.length > 4 && !STOP.has(w)).forEach((w) => (freq[w] = (freq[w] || 0) + 1));
    const repite = Object.keys(freq).map((w) => ({ w, n: freq[w] })).filter((x) => x.n >= 3).sort((a, b) => b.n - a.n).slice(0, 14);
    // Resignificar
    const resig = D().RESIGNIFICA.map((r) => { const i = fn.findIndex((f) => r.k.some((k) => contiene(f, k))); return i >= 0 ? Object.assign({ cita: fs[i] }, r) : null; }).filter(Boolean);
    // Síntomas sugeridos: uno por cita de cada hueco (con área del patrón) y uno por resignificación
    // Un síntoma por frase (aunque delate varios huecos), con sus palabras y el hueco que señala
    const sugeridos = [], vistas = new Set();
    const corta = (c) => { const t = c.replace(/^[«"\s]+|[»"\s.]+$/g, ''); return t.length > 110 ? t.slice(0, 107).replace(/\s\S*$/, '') + '…' : t; };
    huecos.forEach((h) => { const p = D().patron(h.id); h.citas.slice(0, 3).forEach((c) => { const k = norm(c.cita); if (vistas.has(k)) return; vistas.add(k); sugeridos.push({ t: corta(c.cita), cita: c.cita, area: areaDe(c.cita, p.area), patron: p.id, hueco: p.n, origen: 'transcripcion' }); }); });
    resig.forEach((r) => { const k = norm(r.cita); if (vistas.has(k)) return; vistas.add(k); sugeridos.push({ t: corta(r.cita), cita: r.cita, area: r.area, patron: r.patron, hueco: D().patron(r.patron).n, origen: 'transcripcion' }); });
    // Constantes estimadas por el lenguaje (para contrastar con la del consultor)
    const L = Object.fromEntries(lenguaje.map((x) => [x.id, x.por1000]));
    const escala = (v, a, b) => Math.max(1, Math.min(5, Math.round(1 + ((v - a) / (b - a)) * 4)));
    const estimadas = { tension: escala(L.emocion * 2 + L.obligacion, 0, 12), temperatura: escala(L.urgencia * 3, 0, 9), dependencia: escala(L.centralizacion * 3 + (yo / Math.max(1, nos)), 0.5, 10) };
    const pal = parsed.turnos.reduce((a, x) => a + x.t.split(/\s+/).length, 0);
    return { clientes: [...set], palabras: total, pctCliente: pal ? Math.round((total / pal) * 100) : 0, frases: fs.length, huecos, lenguaje, yo, nos, repite, resig, sugeridos, estimadas };
  };
  // Afinar el área de una cita por sus palabras (dinero → finanzas, clientes → ventas…)
  const AREA_K = { fin: ['dinero', 'caja', 'banco', 'pagar', 'cobrar', 'margen', 'nomina', 'impuesto', 'deuda', 'poliza'], com: ['cliente', 'venta', 'vender', 'precio', 'oferta', 'pedido'], ope: ['produccion', 'taller', 'almacen', 'stock', 'entrega', 'proceso', 'maquina', 'obra'], per: ['gente', 'equipo', 'trabajador', 'empleado', 'encargado', 'personal', 'plantilla'], inf: ['datos', 'whatsapp', 'informe', 'numeros', 'excel', 'programa'], leg: ['socio', 'aval', 'abogado', 'juicio', 'inspeccion', 'licencia', 'hacienda'], tie: ['proyecto', 'pendiente', 'fecha', 'plazo'] };
  const areaDe = (cita, def) => { const f = norm(cita); const a = Object.keys(AREA_K).find((k) => AREA_K[k].some((w) => f.includes(w))); return a || def; };
  E.areaDe = areaDe;

  /* ---------- Lectura en profundidad con Claude (si está disponible) ---------- */
  E.conIA = async (texto, contexto) => {
    if (!A.docs || !A.docs.aiAvailable) return null;
    const via = await A.docs.aiAvailable(); if (!via) return null;
    const areas = D().AREAS.map((a) => `${a.id} = ${a.n}`).join('; '), pats = D().PATRONES.map((p) => `${p.id} = ${p.n}`).join('; ');
    const destino = `Transcripción de la primera sesión de diagnóstico de un consultor con el empresario de una pyme. ${contexto || ''}
Lee entre líneas como un consultor experto: separa síntomas de causas, detecta lo que el empresario dice y lo que realmente quiere decir y no dice (resignificación por el contexto de sus palabras), su lenguaje (absolutos, culpa fuera, obligación, emociones, minimizaciones), y los huecos de definición de la empresa. Cada síntoma y cada hueco debe apoyarse en una cita literal de la transcripción; si no hay cita, no lo incluyas. Prioriza las causas que, resolviendo el 20 %, darían el 80 % del resultado.
Áreas: ${areas}. Huecos: ${pats}. Gravedad de 1 (leve) a 5 (grave). Constantes de 1 (bien) a 5 (grave).`;
    const forma = '{"resumen":"3 frases","cita_clave":"la frase literal que mejor resume su problema","sintomas":[{"t":"síntoma en una frase","cita":"literal","area":"id","patron":"id","gravedad":1}],"resignificaciones":[{"dice":"literal","quiere":"lo que realmente quiere decir","pregunta":"pregunta para confirmarlo"}],"causas":[{"t":"causa raíz","area":"id","explica":["síntoma"],"prioridad":1}],"constantes":{"tension":3,"temperatura":3,"pulso":3,"respiracion":3,"dependencia":3,"reflejos":3},"alertas":["urgencia con plazo"],"preguntas_pendientes":["lo que conviene preguntar en la auditoría integral"]}';
    if (via === 'server') return (await A.platform.api('/escucha', { method: 'POST', body: JSON.stringify({ texto: String(texto).slice(0, 200000), instrucciones: destino, forma }) })).datos;
    const sm = await window.claude.use('sample');
    return sm.json(`${destino}\nResponde SOLO con JSON de esta forma: ${forma}\n\nTranscripción:\n${String(texto).slice(0, 110000)}`);
  };
})();
