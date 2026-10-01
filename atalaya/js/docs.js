/* Atalaya · Importador universal de documentos y dictado por voz
 * Lee PDF, Word (.docx), Excel (.xlsx/.xls/.ods), CSV, Markdown y texto, y los convierte en filas.
 * Si hay IA disponible (servidor o visor de Claude), puede extraer los datos de documentos desordenados.
 */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const D = (A.docs = {});
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  const loaded = {};
  function load(src) {
    if (!loaded[src]) loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.onload = res;
      s.onerror = () => rej(new Error('No se pudo cargar el lector necesario. Comprueba la conexión o usa Excel/CSV.'));
      document.head.appendChild(s);
    });
    return loaded[src];
  }

  async function pdfText(file) {
    await load(CDN + 'pdf.js/3.11.174/pdf.min.js');
    await load(CDN + 'pdf.js/3.11.174/pdf.worker.min.js'); // permite leer sin «worker» externo si el navegador lo bloquea
    const lib = window.pdfjsLib;
    try { lib.GlobalWorkerOptions.workerSrc = CDN + 'pdf.js/3.11.174/pdf.worker.min.js'; } catch (e) { /* modo sin worker */ }
    const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const lines = [];
    for (let p = 1; p <= Math.min(pdf.numPages, 60); p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      // Reconstruye líneas agrupando por coordenada vertical
      const rows = {};
      tc.items.forEach((it) => { const y = Math.round(it.transform[5] / 3) * 3; (rows[y] = rows[y] || []).push({ x: it.transform[4], s: it.str }); });
      Object.keys(rows).map(Number).sort((a, b) => b - a).forEach((y) => lines.push(rows[y].sort((a, b) => a.x - b.x).map((i) => i.s).join('  ').replace(/\s{3,}/g, '  ').trim()));
    }
    const text = lines.filter(Boolean).join('\n');
    if (text.replace(/\s/g, '').length < 40) throw new Error('El PDF parece una imagen escaneada: no tiene texto que leer. Exporta el documento desde tu programa contable o súbelo en Excel.');
    return text;
  }
  async function docxText(file) {
    await load(CDN + 'mammoth/1.6.0/mammoth.browser.min.js');
    const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return r.value;
  }
  async function sheetRows(file) {
    await load(CDN + 'xlsx/0.18.5/xlsx.full.min.js');
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return wb.SheetNames.map((n) => ({ hoja: n, rows: window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }) }));
  }

  /* Texto → filas: tablas Markdown, tabuladores, punto y coma, o «etiqueta  número  número» */
  D.textToRows = function (text) {
    const lines = String(text).replace(/\r/g, '').split('\n').map((l) => l.trim()).filter((l) => l && !/^\|?\s*:?-{3,}/.test(l));
    if (lines.some((l) => l.includes('\t'))) return lines.map((l) => l.split('\t'));
    if (lines.filter((l) => l.startsWith('|')).length > 2) return lines.filter((l) => l.startsWith('|')).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
    if (lines.filter((l) => l.split(';').length > 2).length > 2) return lines.map((l) => l.split(';'));
    if (lines.filter((l) => l.split(',').length > 2 && !/\d,\d{2}\b/.test(l)).length > lines.length / 2) return lines.map((l) => l.split(','));
    const num = /\(?-?\d{1,3}(?:\.\d{3})+(?:,\d+)?\)?|\(?-?\d+(?:,\d+)?\)?/g;
    return lines.map((l) => {
      const first = /^\(?-?\d/.test(l) ? 0 : l.search(/\s\(?-?\d/);
      const label = first > 0 ? l.slice(0, first).trim() : (first === 0 ? '' : l);
      const rest = first >= 0 ? l.slice(first) : '';
      const nums = rest.match(num) || [];
      return [label].concat(nums);
    });
  };

  /* Lee cualquier documento. Devuelve { texto, hojas: [{hoja, rows}] } */
  D.read = async function (file) {
    const n = file.name.toLowerCase();
    if (/\.(xlsx|xls|ods)$/.test(n)) { const hojas = await sheetRows(file); return { hojas, texto: hojas.map((h) => h.rows.map((r) => r.join('\t')).join('\n')).join('\n\n') }; }
    let texto;
    if (n.endsWith('.pdf')) texto = await pdfText(file);
    else if (n.endsWith('.docx')) texto = await docxText(file);
    else if (n.endsWith('.doc')) throw new Error('El formato .doc antiguo no se puede leer. Guárdalo como .docx o PDF.');
    else if (/\.(csv|tsv|txt|md|markdown|json)$/.test(n)) texto = await file.text();
    else throw new Error('Formato no reconocido. Usa PDF, Word, Excel, CSV, Markdown o texto.');
    return { texto, hojas: [{ hoja: file.name, rows: D.textToRows(texto) }] };
  };

  /* Tablas con cabecera → objetos, mapeando columnas por sinónimos.
     schema: { campo: ['sinónimo', ...] } */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  D.mapTable = function (rows, schema) {
    rows = rows.filter((r) => r && r.some((c) => String(c).trim() !== ''));
    for (let h = 0; h < Math.min(rows.length, 10); h++) {
      const map = {};
      rows[h].forEach((cell, j) => {
        const c = norm(cell);
        Object.keys(schema).forEach((k) => { if (map[k] === undefined && schema[k].some((s) => c === norm(s) || c.includes(norm(s)))) map[k] = j; });
      });
      if (Object.keys(map).length >= Math.min(2, Object.keys(schema).length)) {
        return rows.slice(h + 1).map((r) => { const o = {}; Object.keys(map).forEach((k) => { o[k] = r[map[k]]; }); return o; }).filter((o) => Object.values(o).some((v) => String(v).trim() !== ''));
      }
    }
    throw new Error('No encuentro una fila de cabecera con columnas reconocibles (' + Object.keys(schema).join(', ') + ').');
  };

  /* Extracción con IA (servidor de Atalaya o visor de Claude). Devuelve el JSON o null si no hay IA. */
  D.aiAvailable = async function () {
    if (A.platform) { await A.platform.ready; if (A.platform.mode === 'server' && A.platform.serverInfo && A.platform.serverInfo.ia) return 'server'; }
    if (window.claude && window.claude.use) { try { const s = await window.claude.use('sample'); if (s) return 'sample'; } catch (e) { /* sin visor */ } }
    return null;
  };
  D.aiExtract = async function (texto, destino, forma) {
    const via = await D.aiAvailable();
    if (via === 'server') return (await A.platform.api('/extract', { method: 'POST', body: JSON.stringify({ texto: texto.slice(0, 300000), destino, forma }) })).datos;
    if (via === 'sample') {
      const s = await window.claude.use('sample');
      return s.json(`Extrae datos de este documento de empresa. Destino: ${destino}. No inventes valores: omite lo que no aparezca. Importes en euros como números.\nResponde SOLO con JSON de esta forma: ${forma}\n\nDocumento:\n${texto.slice(0, 120000)}`);
    }
    return null;
  };

  /* Dictado: devuelve el texto reconocido (una frase) */
  D.dictate = function () {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return Promise.reject(new Error('Tu navegador no permite dictar. Funciona en Chrome, Edge y Safari recientes.'));
    return new Promise((resolve, reject) => {
      const r = new SR(); r.lang = 'es-ES'; r.interimResults = false; r.maxAlternatives = 1;
      let got = '';
      r.onresult = (e) => { got = Array.from(e.results).map((x) => x[0].transcript).join(' '); };
      r.onerror = (e) => reject(new Error(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'El micrófono no está permitido aquí. Da permiso al navegador o escribe el dato.' : 'No te he entendido. Prueba otra vez.'));
      r.onend = () => (got ? resolve(got) : reject(new Error('No he oído nada.')));
      try { r.start(); } catch (e) { reject(e); }
    });
  };

  /* Números dictados: «4,2 millones», «350 mil», «1.200.000», «doce mil» (básico) */
  const WORDS = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };
  D.parseAmount = function (t) {
    const s = norm(t).replace(/(\d)\s+(\d{3})\b/g, '$1$2');
    const m = String(t).match(/(-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:[.,]\d+)?)\s*(millones|millon|mill|m€|k€|k\b|mil\b)?/i);
    if (m) {
      let n = m[1]; n = /\.\d{3}/.test(n) ? n.replace(/\./g, '').replace(',', '.') : n.replace(',', '.');
      let v = parseFloat(n); const u = norm(m[2] || '');
      if (/millon|mill|m€/.test(u)) v *= 1e6; else if (/^k|mil/.test(u)) v *= 1e3;
      return v;
    }
    let total = 0, cur = 0, found = false;
    s.split(' ').forEach((w) => {
      if (WORDS[w] !== undefined) { cur += WORDS[w]; found = true; }
      else if (w === 'mil') { cur = (cur || 1) * 1000; total += cur; cur = 0; found = true; }
      else if (/^millon/.test(w)) { cur = (cur || 1) * 1e6; total += cur; cur = 0; found = true; }
    });
    return found ? total + cur : NaN;
  };
  D.parseDate = function (t, ref) {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const s = norm(t); const base = ref || new Date();
    let m = s.match(/(\d{1,2})\s*(?:de)?\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/);
    if (m) { const d = new Date(base.getFullYear(), meses.indexOf(m[2]), +m[1]); if (d < base - 864e5 * 60) d.setFullYear(d.getFullYear() + 1); return d; }
    m = s.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
    if (m) return new Date(m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : base.getFullYear(), +m[2] - 1, +m[1]);
    if (/pasado manana/.test(s)) return new Date(+base + 2 * 864e5);
    if (/manana/.test(s)) return new Date(+base + 864e5);
    m = s.match(/en (\d+) (dias|semanas)/); if (m) return new Date(+base + (+m[1]) * (m[2] === 'dias' ? 1 : 7) * 864e5);
    return null;
  };
})();
