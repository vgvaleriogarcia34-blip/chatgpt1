/* Atalaya 360° · Auditoría integral · Módulo «Contrato» (fase 2, «Propuesta y contrato»)
   Convierte la propuesta integral aceptada en el contrato de prestación de servicios de consultoría.
   El texto jurídico tiene una sola fuente, legal/CONTRATO-PLANTILLA.md, que legal/generar-plantilla.mjs copia a
   js/intervencion/contrato-plantilla.js (Atalaya.contratoPlantilla). Aquí está:
   · el núcleo, sin dependencias y sin DOM (también se usa desde Node para el documento del abogado):
     números en letra, intérprete de la plantilla ({{campo}}, {{#si}}, {{#no}}, {{#cada}} con {{.campo}}, todo dato
     escapado), numeración automática (cláusulas «PRIMERA.», apartados de anexo «1.») y maquetación en bloques, HTML y Word;
   · la pantalla del paso: lo que falta, los datos del cliente y del consultor, las condiciones, la vista previa A4,
     imprimir o guardar en PDF, descargar en Word y la marca de firmado.
   Estado: ST.contrato (dentro del dato «intervencion»): { cliente, p, subencargados, ref, generado, firmado }.
   Los datos del consultor que no están en la ficha de la firma (registro, cargo, seguro…) van en firma.contrato. */
(function (raiz) {
  'use strict';

  /* ================= NÚCLEO ================= */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Números en letra (castellano) ----------
     letras(21) → «veintiuno»; letras(21, { apocope: true }) → «veintiún»; letras(21, { genero: 'f' }) → «veintiuna».
     importeLetra(1234567.89) → «un millón doscientos treinta y cuatro mil quinientos sesenta y siete euros con ochenta y nueve céntimos». */
  const U = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const DEC = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const CEN = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  const uno = (g, apo) => (g === 'f' ? 'una' : apo ? 'un' : 'uno');
  const hasta99 = (n, g, apo) => {
    if (n === 1) return uno(g, apo);
    if (n === 21) return g === 'f' ? 'veintiuna' : apo ? 'veintiún' : 'veintiuno';
    if (n < 30) return U[n];
    const d = Math.floor(n / 10), u = n % 10;
    return DEC[d] + (u ? ' y ' + (u === 1 ? uno(g, apo) : U[u]) : '');
  };
  const hasta999 = (n, g, apo) => {
    if (n === 0) return '';
    if (n === 100) return 'cien';
    const c = Math.floor(n / 100), r = n % 100;
    const C = c ? (g === 'f' && c > 1 ? CEN[c].replace(/os$/, 'as') : CEN[c]) : '';
    return [C, r ? hasta99(r, g, apo) : ''].filter(Boolean).join(' ');
  };
  function letras(n, o) {
    o = o || {}; const g = o.genero === 'f' ? 'f' : 'm', apo = !!o.apocope;
    n = Math.floor(Math.abs(+n || 0));
    if (n === 0) return 'cero';
    if (n >= 1e12) return String(n);
    const mill = Math.floor(n / 1e6), resto = n % 1e6, miles = Math.floor(resto / 1000), u = resto % 1000;
    const out = [];
    if (mill) out.push(mill === 1 ? 'un millón' : letras(mill, { apocope: true }) + ' millones');
    if (miles) out.push(miles === 1 ? 'mil' : hasta999(miles, g, true) + ' mil');
    if (u) out.push(hasta999(u, g, apo));
    return out.join(' ');
  }
  function importeLetra(x) {
    const tot = Math.round(Math.abs(+x || 0) * 100), e = Math.floor(tot / 100), c = tot % 100;
    const de = e >= 1e6 && e % 1e6 === 0 ? ' de' : '';
    let s = letras(e, { apocope: true }) + de + (e === 1 ? ' euro' : ' euros');
    if (c) s += ' con ' + letras(c, { apocope: true }) + (c === 1 ? ' céntimo' : ' céntimos');
    return s;
  }
  // Importe en es-ES con dos decimales: «12.500,00 €» (punto de miles también en cuatro cifras)
  const eur = (n) => { const v = Math.abs(+n || 0).toFixed(2).split('.'); return ((+n || 0) < 0 ? '−' : '') + v[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + v[1] + ' €'; };
  // Porcentaje o número corto en es-ES (10 → «10», 12,5 → «12,5»)
  const numTxt = (n) => String(Math.round((+n || 0) * 100) / 100).replace('.', ',');

  /* ---------- Ordinales de las cláusulas ---------- */
  const ORD1 = ['', 'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA'];
  const ORD10 = { 1: 'DÉCIMA', 2: 'VIGÉSIMA', 3: 'TRIGÉSIMA' }, PRE10 = { 1: 'DECIMO', 2: 'VIGESIMO', 3: 'TRIGESIMO' };
  const ORD_ESP = { 11: 'UNDÉCIMA', 12: 'DUODÉCIMA', 18: 'DECIMOCTAVA' };
  const ordinal = (n) => {
    if (ORD_ESP[n]) return ORD_ESP[n];
    if (n < 10) return ORD1[n];
    const d = Math.floor(n / 10), u = n % 10;
    if (!ORD10[d]) return String(n);
    return u ? PRE10[d] + ORD1[u].replace(/^O/, '') : ORD10[d];
  };

  /* ---------- Intérprete de la plantilla ----------
     modo 'datos': rellena con los datos; un dato vacío sale como «[Nombre legible]» resaltado (ct-falta).
     modo 'revision': todos los bloques visibles, los condicionales con su nota «[Solo si …]» y los campos con su nombre. */
  const SENT = (i) => '\u0001' + i + '\u0002', NOTA_L = (i) => '\u0003' + i + '\u0004\n';
  function arbol(texto) {
    // Una etiqueta de bloque sola en su línea se come la línea entera (y se marca con «!»): así no rompe tablas ni listas
    const src = String(texto).replace(/^[ \t]*\{\{([#/](?:si|no|cada)\b[^}]*)\}\}[ \t]*\n/gm, '{{!$1}}');
    const re = /\{\{(!?)(?:([#/])(si|no|cada)\b\s*)?([^}]*)\}\}/g;
    const raizA = { hijos: [] }, pila = [raizA]; let ult = 0, m;
    while ((m = re.exec(src))) {
      const top = pila[pila.length - 1];
      if (m.index > ult) top.hijos.push({ t: 'txt', v: src.slice(ult, m.index) });
      ult = re.lastIndex;
      const blk = !!m[1], op = m[2], tipo = m[3], arg = m[4].trim();
      if (op === '#') { const n = { t: tipo, k: arg, blk, hijos: [] }; top.hijos.push(n); pila.push(n); }
      else if (op === '/') { const n = pila.pop(); if (!n || n.t !== tipo || pila.length < 1) throw new Error('Plantilla mal anidada: {{/' + tipo + '}}'); }
      else if (tipo) throw new Error('Etiqueta sin signo: ' + m[0]);
      else top.hijos.push({ t: 'var', k: arg });
    }
    if (pila.length !== 1) throw new Error('Plantilla con bloques sin cerrar');
    if (ult < src.length) raizA.hijos.push({ t: 'txt', v: src.slice(ult) });
    return raizA.hijos;
  }
  const lleno = (v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== false && v !== '' && v !== 0);
  function rellenar(texto, datos, o, meta) {
    o = o || {}; meta = meta || {};
    const rev = o.modo === 'revision', VALS = [], campos = meta.campos || {}, cond = meta.condiciones || {}, condNo = meta.condicionesNo || {}, listas = meta.listas || {};
    const tok = (v) => { VALS.push(v); return SENT(VALS.length - 1); };
    const nota = (t) => { VALS.push({ nota: t }); return NOTA_L(VALS.length - 1); };
    const get = (k, pila) => {
      if (k[0] === '.') { const it = pila[pila.length - 1]; return it ? it[k.slice(1)] : undefined; }
      return k.split('.').reduce((a, x) => (a == null ? undefined : a[x]), datos);
    };
    const r = (nodos, pila, lista) => nodos.map((n) => {
      if (n.t === 'txt') return n.v;
      if (n.t === 'var') {
        const nombre = n.k[0] === '.' ? lista + n.k : n.k, et = campos[nombre] || nombre;
        if (rev) return tok({ t: '[' + et + ']', falta: true, campo: nombre });
        const v = get(n.k, pila);
        return v == null || v === '' ? tok({ t: '[' + et + ']', falta: true, campo: nombre }) : tok({ t: String(v) });
      }
      if (n.t === 'si' || n.t === 'no') {
        if (rev) {
          const c = (n.t === 'no' ? condNo[n.k] || 'no ' + (cond[n.k] || n.k) : cond[n.k]) || n.k;
          if (n.blk) return nota('[Solo si ' + c + ']') + r(n.hijos, pila, lista) + nota('[Fin del bloque condicional]');
          return tok({ t: '[Solo si ' + c + ': ', nota: true }) + r(n.hijos, pila, lista) + tok({ t: ']', nota: true });
        }
        const v = lleno(get(n.k, pila));
        return (n.t === 'si' ? v : !v) ? r(n.hijos, pila, lista) : '';
      }
      if (n.t === 'cada') {
        if (rev) return (n.blk ? nota('[' + (listas[n.k] || 'Se repite') + ']') : '') + r(n.hijos, pila.concat([{}]), n.k);
        const l = get(n.k, pila);
        return (Array.isArray(l) ? l : []).map((it) => r(n.hijos, pila.concat([it]), n.k)).join('');
      }
      return '';
    }).join('');
    return { md: r(arbol(texto), [], ''), VALS };
  }

  /* ---------- De markdown (el subconjunto de la plantilla) a bloques ----------
     # título (o «ANEXO …»), ## cláusula (numerada tras «CLÁUSULAS»), ### apartado (numerado en los anexos salvo el I),
     párrafos (los que empiezan por «1.» se renumeran dentro de cada cláusula o apartado), listas «- », tablas «|», «---». */
  function bloques(md, VALS) {
    const L = md.split('\n'), out = [], NOTA = /^\u0003(\d+)\u0004$/;
    let zona = 'cuerpo', clausulas = false, nCl = 0, anexo = 0, nAp = 0, nPar = 0, m;
    const inl = (s) => {
      const runs = []; let b = false;
      String(s).split(/(\*\*|\u0001\d+\u0002)/).forEach((seg) => {
        if (!seg) return;
        if (seg === '**') { b = !b; return; }
        const t = seg.match(/^\u0001(\d+)\u0002$/);
        if (t) { const v = VALS[+t[1]] || {}; runs.push(Object.assign({}, v, { b: v.nota ? false : b })); return; }
        runs.push({ t: seg, b });
      });
      // Juntar trozos seguidos con el mismo formato
      return runs.reduce((a, x) => { const p = a[a.length - 1]; if (p && !p.falta && !x.falta && !p.nota && !x.nota && p.b === x.b) p.t += x.t; else a.push(Object.assign({}, x)); return a; }, []);
    };
    const notaB = (i) => ({ tipo: 'nota', runs: [{ t: (VALS[i] || {}).nota || '', nota: true }] });
    const esLista = (l) => /^(\s*)-\s+/.test(l), esTabla = (l) => /^\s*\|/.test(l), esTit = (l) => /^#{1,3}\s/.test(l), esHr = (l) => /^---\s*$/.test(l);
    let i = 0;
    while (i < L.length) {
      const l = L[i];
      if (!l.trim()) { i++; continue; }
      if ((m = l.match(NOTA))) { out.push(notaB(+m[1])); i++; continue; }
      if (esHr(l)) { out.push({ tipo: 'salto' }); i++; continue; }
      if ((m = l.match(/^(#{1,3})\s+(.*)$/))) {
        const h = m[1].length; let t = m[2].trim(); nPar = 0;
        if (h === 1) { if (/^ANEXO\b/i.test(t)) { zona = 'anexo'; anexo++; nAp = 0; } out.push({ tipo: 'h1', anexo: zona === 'anexo', runs: inl(t) }); }
        else if (h === 2) {
          if (zona === 'cuerpo' && clausulas) { nCl++; out.push({ tipo: 'h2', num: ordinal(nCl) + '.', runs: inl(t) }); }
          else { if (/^CL[AÁ]USULAS$/i.test(t)) clausulas = true; out.push({ tipo: 'h2', sin: true, runs: inl(t) }); }
        } else {
          t = t.replace(/^\d+\.\s*/, '');
          if (zona === 'anexo' && anexo > 1) { nAp++; out.push({ tipo: 'h3', num: nAp + '.', runs: inl(t) }); } else out.push({ tipo: 'h3', runs: inl(t) });
        }
        i++; continue;
      }
      if (esTabla(l)) {
        const filas = [], notas = [];
        while (i < L.length && (esTabla(L[i]) || NOTA.test(L[i]))) {
          const n = L[i].match(NOTA); if (n) { notas.push(+n[1]); i++; continue; }
          const c = L[i].trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
          if (!c.every((x) => /^:?-{3,}:?$/.test(x))) filas.push(c.map(inl));
          i++;
        }
        const t0 = filas[0] && filas[0][0] ? filas[0][0].map((x) => x.t).join('') : '';
        out.push({ tipo: 'tabla', firmas: /^Por el /.test(t0), filas });
        notas.forEach((n) => out.push(notaB(n)));
        continue;
      }
      if ((m = l.match(/^(\s*)-\s+/))) {
        const ind = m[1].length > 0, items = [];
        while (i < L.length && esLista(L[i])) { items.push(inl(L[i].replace(/^\s*-\s+/, ''))); i++; }
        out.push({ tipo: 'ul', ind, items });
        continue;
      }
      const ind = /^\s{2,}/.test(l); let txt = l.trim(); i++;
      while (i < L.length && L[i].trim() && !esLista(L[i]) && !esTabla(L[i]) && !esTit(L[i]) && !esHr(L[i]) && !NOTA.test(L[i])) { txt += ' ' + L[i].trim(); i++; }
      if ((m = txt.match(/^(\d+)\.\s+([\s\S]*)$/))) { nPar++; out.push({ tipo: 'p', num: nPar + '.', runs: inl(m[2]) }); }
      else out.push({ tipo: 'p', ind, runs: inl(txt) });
    }
    return out;
  }
  // Plantilla + datos → bloques del documento
  const documento = (plantilla, datos, o) => { const r = rellenar(plantilla.texto, datos, o, plantilla); return bloques(r.md, r.VALS); };
  const faltasDoc = (bls) => { const s = new Set(); const ver = (runs) => runs.forEach((x) => { if (x.falta) s.add(x.campo); }); bls.forEach((b) => { if (b.runs) ver(b.runs); (b.items || []).forEach(ver); (b.filas || []).forEach((f) => f.forEach(ver)); }); return [...s]; };

  /* ---------- Bloques → HTML (pantalla, PDF y Word) ---------- */
  function html(bls, o) {
    o = o || {}; const word = !!o.word;
    const run = (x) => {
      let t = esc(x.t);
      if (x.falta) t = word ? `<span style="background:#ffff00;mso-highlight:yellow">${t}</span>` : `<mark class="ct-falta">${t}</mark>`;
      if (x.nota) t = word ? `<i style="color:#555">${t}</i>` : `<i class="ct-nota">${t}</i>`;
      if (x.b) t = `<b>${t}</b>`;
      return t;
    };
    const R = (runs) => (runs || []).map(run).join('');
    return bls.map((b) => {
      if (b.tipo === 'h1') return `<h1 class="ct-h1${b.anexo ? ' ct-anexo' : ''}">${R(b.runs)}</h1>`;
      if (b.tipo === 'h2') return b.sin ? `<h2 class="ct-h2 ct-sin">${R(b.runs)}</h2>` : `<h2 class="ct-h2"><span class="ct-ord">${esc(b.num)}</span> ${R(b.runs)}</h2>`;
      if (b.tipo === 'h3') return `<h3 class="ct-h3">${b.num ? `<span class="ct-ord">${esc(b.num)}</span> ` : ''}${R(b.runs)}</h3>`;
      if (b.tipo === 'p') return `<p class="ct-p${b.num ? ' ct-pn' : ''}${b.ind ? ' ct-ind' : ''}">${b.num ? `<span class="ct-n">${esc(b.num)}</span> ` : ''}${R(b.runs)}</p>`;
      if (b.tipo === 'ul') return `<ul class="ct-ul${b.ind ? ' ct-ind' : ''}">${b.items.map((it) => `<li>${R(it)}</li>`).join('')}</ul>`;
      if (b.tipo === 'nota') return `<p class="ct-notab">${R(b.runs)}</p>`;
      if (b.tipo === 'salto') return word ? '<br clear="all" style="page-break-before:always">' : '<div class="ct-salto" aria-hidden="true"></div>';
      if (b.tipo === 'tabla') {
        const [cab, ...filas] = b.filas;
        return `<table class="ct-tabla${b.firmas ? ' ct-firmas' : ''}"${word ? ' border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%"' : ''}><thead><tr>${(cab || []).map((c) => `<th>${R(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${R(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
      return '';
    }).join('\n');
  }
  // Documento Word (HTML que Word abre como .doc): Calibri 11, A4, márgenes de 2,5 cm
  const docWord = (bls, titulo, aviso) => `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>@page WordSection1{size:21cm 29.7cm;margin:2.5cm 2.5cm 2.5cm 2.5cm;mso-page-numbers:1}div.WordSection1{page:WordSection1}
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.35}h1{font-size:14pt;text-align:center;margin:12pt 0}h2{font-size:12pt;margin:14pt 0 6pt}h2.ct-sin{text-align:center}h3{font-size:11pt;margin:12pt 0 4pt}p{margin:0 0 6pt;text-align:justify}ul{margin:0 0 6pt}th{background:#eeeeee;text-align:left}td,th{font-size:10pt;vertical-align:top}.ct-ind{margin-left:18pt}.aviso{border:1px solid #b42323;color:#b42323;padding:6pt;font-weight:bold}</style></head>
<body><div class="WordSection1">${aviso ? `<p class="aviso">${esc(aviso)}</p>` : ''}${html(bls, { word: true })}</div></body></html>`;

  const NUCLEO = { letras, importeLetra, eur, numTxt, ordinal, arbol, rellenar, bloques, documento, faltasDoc, html, docWord, esc };
  if (typeof module === 'object' && module.exports) module.exports = NUCLEO;
  if (!raiz) return;
  const A = (raiz.Atalaya = raiz.Atalaya || {});
  A.contrato = NUCLEO;

  /* ================= PANTALLA DEL PASO ================= */
  const V = A.interv; if (!V || !V.int) return;
  const I = V.int;
  const { $, $$, hoy, fLarga, toast, guardar, ir, VISTAS, empresa } = I;
  const PL = () => A.platform;
  const S = () => I.st(), R = () => S().recorrido;
  const PT = () => A.contratoPlantilla || { texto: '', version: '', campos: {}, condiciones: {}, listas: {} };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const num = (v) => { const t = String(v == null ? '' : v).trim().replace(/\s|€|%/g, ''); const n = /^-?\d+\.\d{1,2}$/.test(t) ? parseFloat(t) : parseFloat(t.replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  // Marca de aprobación de la plantilla: aquí o en la ficha de la firma (firma.contrato.aprobada). Solo vale si su versión es la de
  // la plantilla (contrato-campos.json): al subir de versión, el documento vuelve a salir como borrador hasta aprobar la nueva.
  // Versión 1.0 en vigor por decisión del titular; la revisión jurídica posterior, si cambia algo, será una versión nueva.
  const APROBADA = { version: '1.0', fecha: '2026-11-12', por: 'FAMILIAS EMPRESARIAS, S.L.' };

  /* ---------- Valores por defecto del consultor (si la ficha de la firma está vacía) ---------- */
  // Titular: FAMILIAS EMPRESARIAS, S.L. Sus datos (NIF, domicilio social, correo, registro, cargo de quien firma, seguro) salen de
  // js/titular.js, el único sitio donde se escriben. Mientras estén vacíos, salen en «Lo que falta» (no se inventan).
  const TIT = A.titular || {}, tt = (k) => String((TIT.valor ? TIT.valor(k) : TIT[k]) || '').trim();
  const DEF_CONSULTOR = { razon: tt('razonSocial') || 'FAMILIAS EMPRESARIAS, S.L.', cif: tt('nif'), domicilio: tt('domicilio'), email: tt('email') || tt('emailPrivacidad'),
    marca: tt('nombreComercial'), representante: 'Valerio García', cargo: tt('firmanteCargo'), registro: tt('registro'), seguro: tt('seguroRC') };
  const DEF_SUB = [
    { id: 'sb-aloj', n: 'Hetzner Online GmbH', servicio: 'alojamiento de la aplicación, sus datos y sus copias de seguridad', ubicacion: 'UE (Helsinki, Finlandia)' },
    { id: 'sb-ia', n: 'Anthropic, PBC', servicio: 'análisis con inteligencia artificial', ubicacion: 'EE. UU. (Marco de Privacidad de Datos UE-EE. UU. o cláusulas contractuales tipo)' },
    { id: 'sb-correo', n: tt('correoProveedor') || 'Proveedor del servicio de correo electrónico del Consultor', servicio: 'envío de comunicaciones', ubicacion: tt('correoUbicacion') || 'UE' },
    { id: 'sb-crm', n: 'HubSpot, Inc.', servicio: 'gestión de la relación comercial (solo datos de contacto)', ubicacion: 'EE. UU. (Marco de Privacidad de Datos UE-EE. UU.)' }
  ];
  const PERIOD = { 7: 'semanal', 14: 'quincenal', 21: 'cada tres semanas', 28: 'mensual' };
  const defP = () => ({ fecha: '', lugar: '', inicio: '', duracion: '', jurisdiccion: 'Murcia', iva: '21', pagoDias: '30', domiciliacion: false, gastos: false, ambitoGastos: 'la Región de Murcia', copias: '365',
    s1Ejercicios: '3 a 5', s1Plazo: '3 a 4 semanas', s1Imp: '', s2Plazo: '4 a 6 semanas', s2Dias: '15', s2Imp: '',
    s3Sesiones: '', s3Duracion: '90 minutos', s3Periodicidad: '', s3Modalidad: 'presenciales o por videoconferencia', s3Respuesta: '48', s3Informe: 'mensual', s3Prorroga: '3', s3Preaviso: '30', s3Imp: '' });
  // El estado del contrato: se completa sin sustituir el objeto (lo que ya está guardado se conserva)
  const C = () => {
    const st = S(); if (!st.contrato || typeof st.contrato !== 'object') st.contrato = {};
    const c = st.contrato;
    if (!c.cliente || typeof c.cliente !== 'object') c.cliente = {};
    if (!c.p || typeof c.p !== 'object') c.p = {};
    const d = defP(); Object.keys(d).forEach((k) => { if (c.p[k] === undefined) c.p[k] = d[k]; });
    if (!Array.isArray(c.subencargados)) c.subencargados = DEF_SUB.map((x) => Object.assign({}, x));
    return c;
  };
  const firmaRaw = () => (A.firma && A.firma.leer ? A.firma.leer() : {}) || {};
  const firmaC = () => { const f = firmaRaw(); return f.contrato && typeof f.contrato === 'object' ? f.contrato : {}; };
  const ponFirma = (k, v, sub) => { const f = firmaRaw(); if (sub) f.contrato = Object.assign({}, firmaC(), { [k]: v }); else f[k] = v; if (A.firma && A.firma.guardar) A.firma.guardar(f); };
  const aprobada = () => { const a = firmaC().aprobada || APROBADA; return a && a.version && String(a.version) === String(PT().version) ? a : null; };

  /* ---------- Datos del consultor, del cliente y de la propuesta ---------- */
  const consultor = () => {
    const f = firmaRaw(), fc = firmaC(), t = (x) => String(x == null ? '' : x).trim();
    const def = !t(f.razon) || norm(f.razon) === norm(DEF_CONSULTOR.razon);
    // Lo escrito en el contrato (firma.contrato) manda; después, la ficha de la firma o, si está vacía, FAMILIAS EMPRESARIAS, S.L.
    const pick = (k, top, d) => t(fc[k]) || (def ? d : t(top));
    const rep = pick('representante', f.consultor, DEF_CONSULTOR.representante);
    return { razon: t(f.razon) || DEF_CONSULTOR.razon, nif: t(f.cif) || (def ? DEF_CONSULTOR.cif : ''), domicilio: pick('domicilio', [t(f.direccion), t(f.ciudad)].filter(Boolean).join(', '), DEF_CONSULTOR.domicilio),
      email: pick('email', f.email, DEF_CONSULTOR.email), marca: pick('marca', f.nombre, DEF_CONSULTOR.marca), representante: rep, director: t(fc.director) || rep,
      cargo: pick('cargo', '', DEF_CONSULTOR.cargo), registro: pick('registro', '', DEF_CONSULTOR.registro), seguro: pick('seguro', '', DEF_CONSULTOR.seguro), ciudad: t(f.ciudad) || (def ? 'Murcia' : ''), def };
  };
  const ficha = () => { const e = PL() && PL().empresas && PL().empresas.activa(); return e || {}; };
  // Razón social por defecto: el nombre de la empresa con la abreviatura de su forma jurídica
  const razonDe = (e) => { const n = String(e.nombre || '').trim(); const ab = (String(e.forma || '').match(/\(([^)]+)\)/) || [])[1]; return n && ab && !/\b(S\.?L\.?U?|S\.?A\.?U?|S\.?C\.?|C\.?B\.?|S\.?Coop\.?)\s*$/i.test(n) ? n + ', ' + ab : n; };
  const cliente = () => {
    const c = C().cliente, e = ficha(), v = (k, d) => (String(c[k] == null ? '' : c[k]).trim() || d || '');
    const act = v('actividad', e.actividad); return { razon: v('razon', razonDe(e)), nif: v('nif', e.cif), domicilio: v('domicilio'), actividad: act && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(act) ? act.charAt(0).toLowerCase() + act.slice(1) : act,
      representante: v('representante'), representante_doc: v('representante_doc'), cargo: v('cargo'), email: v('email'), registro: v('registro') };
  };
  const iniciales = () => (String(empresa() || 'EMP').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().match(/[A-Z0-9]+/g) || ['EMP']).filter((w) => !/^(S|L|SL|SA|SLU|DE|LA|EL|Y)$/.test(w)).slice(0, 3).map((w) => w[0]).join('') || 'EMP';
  const fechaRef = (s) => String(s || hoy()).replace(/-/g, '').slice(0, 8);
  const prop = () => { const p = S().propuesta; return p && p.generada && p.inv && p.pasos ? p : null; };
  const VP = () => V.propuesta || {};
  const servActivos = () => { const s = R().servicios || {}; return ['s1', 's2', 's3'].filter((k) => s[k] && s[k].contratado); };
  const NOMBRE_SV = { s1: 'Servicio 1 · «¿Dónde está el dinero que gana la empresa?»', s2: 'Servicio 2 · Auditoría 360', s3: 'Servicio 3 · Acompañamiento' };
  // Objetivo del empresario del que salió cada objetivo del componente variable (para su indicador y su meta)
  const indicadorDe = (t) => {
    const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
    const o = (S().objetivos || []).find((x) => norm(cap((x.especifica || x.dice || '').replace(/[.\s]+$/, ''))) === norm(t));
    if (!o || !o.indicador) return 'A validar en la sesión de arranque';
    return `${o.indicador}${o.valor !== '' && o.valor != null ? `: de ${o.actual || '—'} a ${o.valor}${o.unidad ? ' ' + o.unidad : ''}` : ''}${o.fecha ? ', antes del ' + fLarga(o.fecha) : ''}`;
  };

  function datos() {
    const c = C(), p = c.p, pr = prop(), r = R(), sv = servActivos(), Vp = VP(), cs = consultor();
    const fecha = p.fecha || hoy();
    if (!c.ref) { c.ref = `CT-${fechaRef(fecha)}-${iniciales()}`; guardar(); }
    let tot = 0, tabla = [], modalidad = '', varOn = false, varImp = 0, objetivos = [], descuentos = [], hitos = false, cuotasOn = false, aviso = [];
    if (pr && Vp.neto) {
      try {
        tot = Vp.neto(pr) || Vp.precio(pr);
        const prog = pr.tipo === 'programa';
        descuentos = (pr.inv.descuentos || []).filter((x) => num(x.imp) > 0).map((x) => ({ t: x.t || 'Descuento', importe: eur(num(x.imp)) }));
        if (prog) {
          cuotasOn = true; const cu = Vp.cuotas(pr); varOn = !!(pr.inv.variable && pr.inv.variable.on); varImp = varOn ? cu.variable : 0;
          modalidad = 'programa de implantación, con ' + (cu.lista.length === 1 ? 'una cuota' : letras(cu.lista.length, { genero: 'f' }) + ' cuotas mensuales') + (varOn ? ` y un componente por objetivos del ${numTxt(pr.inv.variable.pct)} %` : '');
          tabla = cu.lista.map((x, i) => ({ concepto: `Cuota ${i + 1} de ${cu.lista.length}`, vencimiento: x.mes, importe: eur(x.v) }));
          if (varOn) tabla.push({ concepto: 'Componente por objetivos (Anexo IV)', vencimiento: 'Tras la medición al cierre del servicio', importe: eur(varImp) + ' como máximo' });
          if (varOn) objetivos = (pr.inv.objetivos || []).map((o) => ({ t: o.t || 'Objetivo', indicador: indicadorDe(o.t), peso: numTxt(num(o.peso)), importe: eur((varImp * num(o.peso)) / 100) }));
          if (varOn && objetivos.length && Math.round(objetivos.reduce((a, o) => a + num(o.peso), 0)) !== 100) aviso.push('Los pesos de los objetivos del componente variable no suman el 100 %.');
          if (varOn && !objetivos.length) aviso.push('El componente por objetivos no tiene objetivos: añádalos en la propuesta integral.');
        } else {
          hitos = true; const h = (pr.inv.hitos || []).length ? pr.inv.hitos : [{ t: 'A la aceptación', pct: 100 }], sp = h.reduce((a, x) => a + num(x.pct), 0);
          modalidad = 'proyecto llave en mano, con precio cerrado y pago por hitos';
          let acc = 0;
          tabla = h.map((x, i) => { const v = i === h.length - 1 ? Math.round((tot - acc) * 100) / 100 : Math.round((sp ? (tot * num(x.pct)) / Math.max(100, sp) : 0) * 100) / 100; acc += v; return { concepto: `Hito ${i + 1} (${numTxt(i === h.length - 1 && sp < 100 ? num(x.pct) + 100 - sp : num(x.pct))} %)`, vencimiento: x.t || '—', importe: eur(v) }; });
          if (Math.round(sp) !== 100) aviso.push(`Los hitos de pago de la propuesta suman el ${numTxt(sp)} %: el último hito recoge la diferencia.`);
        }
      } catch (e) { tot = 0; }
    }
    const s3sv = r.servicios.s3 || {}, ps3 = r.propS3 || {}, meses = +s3sv.meses || +ps3.meses || 6, paso = +ps3.frecuencia || 14;
    const nSes = Math.floor((Math.round((meses * 52) / 12) * 7) / paso);
    const solo = sv.length === 1;
    const honor = (k) => (num(p[k + 'Imp']) ? eur(num(p[k + 'Imp'])) : solo && tot ? eur(tot) : 'Incluidos en los honorarios totales');
    const d = {
      contrato: { ref: c.ref, lugar: p.lugar || cs.ciudad || 'Murcia', fecha_larga: fLarga(fecha), inicio_largo: fLarga(p.inicio || fecha), duracion: p.duracion || (pr && pr.duracion) || (sv.includes('s3') ? meses + ' meses' : ''), jurisdiccion: p.jurisdiccion || 'Murcia' },
      consultor: { razon: cs.razon, domicilio: cs.domicilio, nif: cs.nif, registro: cs.registro, marca: cs.marca, representante: cs.representante, cargo: cs.cargo, director: cs.director, email: cs.email, seguro: cs.seguro },
      cliente: cliente(),
      propuesta: { fecha_larga: pr ? fLarga(pr.fecha || (pr.generada || '').slice(0, 10)) : '', ref: pr ? `PR-${fechaRef(pr.fecha || (pr.generada || '').slice(0, 10))}-${iniciales()}` : '', aceptada_larga: r.propuesta.estado === 'aceptada' && r.propuesta.fecha ? fLarga(r.propuesta.fecha) : '' },
      servicios: sv.map((k) => ({ nombre: NOMBRE_SV[k] })),
      honorarios: { total: tot ? eur(tot) : '', total_letra: tot ? importeLetra(tot) : '', iva_tipo: String(p.iva || '').replace('.', ','), gastos_incluidos: !!p.gastos, ambito_gastos: p.ambitoGastos, descuentos },
      pago: { dias: String(p.pagoDias || ''), domiciliacion: !!p.domiciliacion, hitos, cuotas: cuotasOn, modalidad, tabla },
      variable: { on: varOn, pct: varOn ? numTxt(pr.inv.variable.pct) : '', importe: varOn ? eur(varImp) : '', objetivos },
      s1: sv.includes('s1') ? { ejercicios: p.s1Ejercicios, documentos: ((V.servicios && V.servicios.DOCS_S1) || []).map((x) => ({ n: x.n, d: x.d })), plazo: p.s1Plazo, honorarios: honor('s1') } : null,
      s2: sv.includes('s2') ? { bloques: ((V.servicios && V.servicios.BLOQUES) || []).map((x) => ({ n: x.n, q: x.q })), dias_documentacion: String(p.s2Dias || ''), plazo: p.s2Plazo, honorarios: honor('s2') } : null,
      s3: sv.includes('s3') ? { prorroga_meses: String(p.s3Prorroga || ''), preaviso_dias: String(p.s3Preaviso || ''), sesiones: String(num(p.s3Sesiones) || nSes), duracion_sesion: p.s3Duracion, periodicidad: p.s3Periodicidad || PERIOD[paso] || 'quincenal', modalidad: p.s3Modalidad, respuesta_horas: String(p.s3Respuesta || ''), informe_periodicidad: p.s3Informe, meses: String(meses), honorarios: honor('s3') } : null,
      subencargados: c.subencargados.filter((x) => String(x.n || '').trim()).map((x) => ({ n: x.n, servicio: x.servicio || '', ubicacion: x.ubicacion || '' })),
      rgpd: { dias_copias: String(p.copias || '') }
    };
    // Importes por servicio: si se indican, deben sumar el total
    const imp = sv.map((k) => num(p[k + 'Imp'])); if (imp.some(Boolean) && tot && Math.abs(imp.reduce((a, x) => a + x, 0) - tot) > 0.5) aviso.push(`Los importes por servicio suman ${eur(imp.reduce((a, x) => a + x, 0))} y los honorarios totales son ${eur(tot)}.`);
    if (num(p.pagoDias) > 60) aviso.push('El plazo de pago pasa de 60 días: la Ley 3/2004 no lo permite entre empresas.');
    return { d, pr, sv, tot, aviso };
  }

  /* ---------- Lo que falta para generar el contrato ---------- */
  const CAMPOS_CLI = [['razon', 'Razón social', 'Metalúrgica del Sureste, S.L.', 1], ['nif', 'NIF', 'B12345678', 1], ['domicilio', 'Domicilio social', 'Calle, número, código postal y localidad', 1], ['actividad', 'Actividad', 'fabricación de estructuras metálicas', 1],
    ['representante', 'Representante (nombre y apellidos)', 'Nombre de quien firma', 1], ['cargo', 'Cargo del representante', 'administrador único', 1], ['representante_doc', 'Documento de identidad del representante (opcional)', '12345678Z', 0], ['email', 'Correo electrónico para las comunicaciones', 'direccion@empresa.es', 1], ['registro', 'Datos registrales (opcional)', 'el Registro Mercantil de Murcia, tomo …, folio …, hoja MU-…', 0]];
  const CAMPOS_CON = [['razon', 'Razón social', 1], ['cif', 'NIF', 1], ['domicilio', 'Domicilio social', 1], ['email', 'Correo electrónico', 1], ['marca', 'Nombre comercial (opcional)', 0], ['representante', 'Quien firma (nombre y apellidos)', 1], ['cargo', 'Cargo de quien firma', 1], ['registro', 'Datos del Registro Mercantil (tomo, folio, hoja)', 1], ['seguro', 'Seguro de responsabilidad civil (compañía y póliza)', 0]];
  const conVal = (cs, k) => (k === 'cif' ? cs.nif : cs[k]);
  function faltas(x) {
    x = x || datos(); const out = [], cs = consultor(), cl = x.d.cliente, r = R();
    if (!x.pr) out.push({ t: 'Prepare la propuesta integral: de ella salen los honorarios y la forma de pago.', ir: 'propuesta' });
    else if (!x.tot) out.push({ t: 'La propuesta integral no tiene importe: ponga el precio o el importe de cada paso.', ir: 'propuesta' });
    if (r.propuesta.estado !== 'aceptada') out.push({ t: 'La propuesta integral aún no está aceptada: anótelo en «Aceptación y servicios».', ir: 'aceptacion', aviso: true });
    else if (!r.propuesta.fecha) out.push({ t: 'Falta la fecha de aceptación de la propuesta.', ir: 'aceptacion' });
    if (!x.sv.length) out.push({ t: 'No hay ningún servicio contratado: márquelos en «Aceptación y servicios».', ir: 'aceptacion', aviso: true });
    CAMPOS_CLI.filter((f) => f[3] && !String(cl[f[0]] || '').trim()).forEach((f) => out.push({ t: 'Cliente: ' + f[1].toLowerCase(), campo: 'cc-' + f[0] }));
    CAMPOS_CON.filter((f) => f[2] && !String(conVal(cs, f[0]) || '').trim()).forEach((f) => out.push({ t: 'Consultor: ' + f[1].replace(/^Datos del /, '').replace(/^\w(?![A-Z])/, (y) => y.toLowerCase()), campo: 'cf-' + f[0] }));
    const p = C().p; [['iva', 'tipo de IVA'], ['pagoDias', 'días de pago'], ['copias', 'días del ciclo de las copias de seguridad']].forEach(([k, n]) => { if (!num(p[k])) out.push({ t: 'Condiciones: ' + n, campo: 'cp-' + k }); });
    if (!x.d.subencargados.length) out.push({ t: 'Protección de datos: la lista de subencargados está vacía.', campo: 'cs-nuevo' });
    // Cualquier campo de la plantilla que siga vacío (por si la plantilla cambia)
    faltasDoc(documento(PT(), x.d)).forEach((k) => { if (!/^(cliente|consultor|propuesta)\.|^honorarios\.total|^pago\.modalidad/.test(k)) out.push({ t: 'Sin dato: ' + (PT().campos[k] || k).replace(/^\w/, (y) => y.toLowerCase()), campo: CAMPO_DE[k] || '' }); });
    return out.filter((f, i, l) => l.findIndex((y) => y.t === f.t) === i);
  }
  const CAMPO_DE = { 'contrato.duracion': 'cp-duracion', 'contrato.lugar': 'cp-lugar', 'contrato.jurisdiccion': 'cp-jurisdiccion', 'honorarios.iva_tipo': 'cp-iva', 'pago.dias': 'cp-pagoDias', 'honorarios.ambito_gastos': 'cp-ambitoGastos', 's1.plazo': 'cp-s1Plazo', 's1.ejercicios': 'cp-s1Ejercicios', 's2.plazo': 'cp-s2Plazo', 's2.dias_documentacion': 'cp-s2Dias', 's3.prorroga_meses': 'cp-s3Prorroga', 's3.preaviso_dias': 'cp-s3Preaviso', 's3.duracion_sesion': 'cp-s3Duracion', 's3.modalidad': 'cp-s3Modalidad', 's3.respuesta_horas': 'cp-s3Respuesta', 's3.informe_periodicidad': 'cp-s3Informe', 'rgpd.dias_copias': 'cp-copias' };
  const completo = () => { try { return faltas().length === 0; } catch (e) { return false; } };

  /* ---------- Documento ---------- */
  // Solo se ve si la plantilla cambia de versión y aún no se ha aprobado la nueva (ver APROBADA)
  const AVISO = 'Borrador: esta versión de la plantilla aún no está aprobada. No la use con clientes hasta aprobarla.';
  const tituloDoc = () => 'Contrato de prestación de servicios · ' + empresa();
  const docHTML = (bls) => { const a = aprobada(); return (a ? '' : `<p class="ct-borr-doc" role="note">${esc(AVISO)}</p>`) + html(bls); };
  const slug = (t) => String(t || 'contrato').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60);
  const marcarGenerado = () => { const c = C(); if (completo()) { c.generado = new Date().toISOString(); guardar(); return true; } return false; };
  const imprimir = async (btn) => {
    const el = $('#ctDoc'); if (!el || !A.informe || !A.informe.pdf) return;
    const ok = marcarGenerado();
    await A.informe.pdf(el, { titulo: (aprobada() ? '' : 'BORRADOR · ') + tituloDoc(), boton: btn });
    if (!ok) toast('Se imprime como borrador: faltan datos (salen resaltados en amarillo).', 'warn'); else I.render();
  };
  const word = () => {
    const x = datos(), bls = documento(PT(), x.d), ok = marcarGenerado();
    const blob = new Blob(['﻿' + docWord(bls, tituloDoc(), aprobada() ? '' : AVISO)], { type: 'application/msword' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'contrato-' + slug(empresa()) + '.doc'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast(ok ? 'Contrato descargado en Word.' : 'Descargado como borrador: faltan datos (salen resaltados en amarillo).', ok ? '' : 'warn');
    if (ok) I.render();
  };

  /* ---------- La pantalla ---------- */
  const inp = (pref, k, v, o) => { o = o || {}; const id = 'ct-' + pref + '-' + k; return `<label class="small${o.ancho ? ' ct-ancho' : ''}" for="${id}">${esc(o.n)}<input class="input" id="${id}" data-${pref}="${esc(k)}" value="${esc(v == null ? '' : v)}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.tipo ? ` type="${o.tipo}"` : ''}${o.req && !String(v || '').trim() ? ' aria-invalid="true"' : ''}></label>`; };
  const chk = (pref, k, v, n) => `<label class="iv-inl small"><input type="checkbox" data-${pref}="${esc(k)}" ${v ? 'checked' : ''}> ${esc(n)}</label>`;
  const faltasHTML = (fl) => fl.length
    ? `<ul class="ct-faltas">${fl.map((f) => `<li class="${f.aviso ? 'aviso' : ''}"><span>${esc(f.t)}</span>${f.ir ? `<button class="btn ghost small" data-ctir="${esc(f.ir)}">Ir →</button>` : f.campo ? `<button class="btn ghost small" data-ctfoco="${esc(f.campo)}">Completar</button>` : ''}</li>`).join('')}</ul>`
    : '<p class="ct-listo">Están todos los datos: puede generar el contrato.</p>';
  const estadoHTML = (fl) => {
    const c = C(), a = aprobada();
    return `<span class="iv-st ${fl.length ? 'warn' : 'ok'}">${fl.length ? `Faltan ${fl.length} ${fl.length === 1 ? 'dato' : 'datos'}` : 'Datos completos'}</span>${c.generado ? `<span class="iv-st ok">Generado el ${esc(fLarga(c.generado.slice(0, 10)))}</span>` : ''}${c.firmado && c.firmado.fecha ? `<span class="iv-st ok">Firmado el ${esc(fLarga(c.firmado.fecha))}</span>` : ''}<span class="iv-st ${a ? 'ok' : 'stop'}">${a ? `Plantilla ${esc(a.version)} aprobada por ${esc(a.por || 'su abogado')}` : `Plantilla ${esc(PT().version)} · borrador sin validar`}</span>`;
  };
  VISTAS.contrato = (host) => {
    const c = C(), p = c.p, x = datos(), fl = faltas(x), cs = consultor(), cl = x.d.cliente, sv = x.sv, a = aprobada();
    const bls = documento(PT(), x.d);
    const svOpc = (k, titulo, campos) => (sv.includes(k) ? `<fieldset class="ct-fs"><legend>${esc(titulo)}</legend><div class="ct-g">${campos}</div></fieldset>` : '');
    host.innerHTML = `<section class="glass pad stack">
        <div class="row"><div><div class="eyebrow">Contrato de prestación de servicios</div><h3 style="margin:4px 0 0">${esc(empresa())}</h3><small class="muted">Referencia ${esc(c.ref)} · sale de la propuesta integral${x.pr ? ' del ' + esc(fLarga(x.pr.fecha || String(x.pr.generada).slice(0, 10))) : ''} y de las fichas del cliente y de su firma.</small></div></div>
        <div class="ct-estado" id="ctEstado">${estadoHTML(fl)}</div>
        <div class="row ct-acc"><button class="btn solid" id="ctPdf">Imprimir o guardar en PDF</button><button class="btn" id="ctWord">Descargar en Word</button><button class="btn ghost" data-ctir="aceptacion">← Aceptación y servicios</button></div>
      </section>
      <section class="glass pad stack"><div class="eyebrow">Lo que falta para generar el contrato</div><div id="ctFaltas">${faltasHTML(fl)}</div>${x.aviso.length ? `<ul class="ct-avisos">${x.aviso.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</section>
      <section class="glass pad stack"><div class="eyebrow">Datos del cliente</div><small class="muted">La razón social, el NIF y la actividad salen de la ficha de la empresa; lo que escriba aquí vale solo para el contrato.</small>
        <div class="ct-g">${CAMPOS_CLI.map(([k, n, ph, req]) => inp('cc', k, k === 'actividad' ? (C().cliente.actividad || ficha().actividad || '') : cl[k], { n, ph, req, ancho: ['domicilio', 'registro', 'actividad'].includes(k) })).join('')}</div></section>
      <section class="glass pad stack"><div class="eyebrow">Datos del consultor</div><small class="muted">${cs.def ? 'La ficha de su firma no tiene razón social: se usan los datos de FAMILIAS EMPRESARIAS, S.L. ' : ''}Se guardan en la ficha de su firma y valen para todos sus contratos.</small>
        <div class="ct-g">${CAMPOS_CON.map(([k, n, req]) => inp('cf', k, conVal(cs, k), { n, req, ph: k === 'cargo' ? 'administrador único' : k === 'registro' ? 'el Registro Mercantil de Murcia, tomo …, folio …, hoja MU-…' : k === 'seguro' ? 'Compañía, número de póliza (la cláusula solo aparece si se indica)' : '', ancho: ['domicilio', 'registro', 'seguro', 'marca'].includes(k) })).join('')}</div></section>
      <section class="glass pad stack"><div class="eyebrow">Condiciones del contrato</div>
        <div class="ct-g">${inp('cp', 'fecha', p.fecha || hoy(), { n: 'Fecha de firma', tipo: 'date' })}${inp('cp', 'lugar', p.lugar || cs.ciudad || 'Murcia', { n: 'Lugar de firma' })}${inp('cp', 'inicio', p.inicio || p.fecha || hoy(), { n: 'Inicio de los Servicios', tipo: 'date' })}
          ${inp('cp', 'duracion', p.duracion || x.d.contrato.duracion, { n: 'Duración prevista del conjunto', ph: '6 a 8 meses' })}${inp('cp', 'iva', p.iva, { n: 'Tipo de IVA (%)', req: true })}${inp('cp', 'pagoDias', p.pagoDias, { n: 'Días para pagar cada factura', req: true })}
          ${inp('cp', 'jurisdiccion', p.jurisdiccion, { n: 'Juzgados y tribunales de' })}${inp('cp', 'copias', p.copias, { n: 'Ciclo de las copias de seguridad (días)', req: true })}${inp('cp', 'ambitoGastos', p.ambitoGastos, { n: 'Desplazamientos incluidos en', ph: 'la Región de Murcia' })}</div>
        <div class="row">${chk('cp', 'gastos', p.gastos, 'Los honorarios incluyen los desplazamientos')}${chk('cp', 'domiciliacion', p.domiciliacion, 'Admitir la domiciliación bancaria')}</div>
        ${svOpc('s1', NOMBRE_SV.s1, inp('cp', 's1Ejercicios', p.s1Ejercicios, { n: 'Ejercicios que se analizan' }) + inp('cp', 's1Plazo', p.s1Plazo, { n: 'Plazo estimado' }) + inp('cp', 's1Imp', p.s1Imp, { n: 'Honorarios (sin IVA, opcional)', ph: sv.length === 1 ? 'Los totales' : 'Incluidos en el total' }))}
        ${svOpc('s2', NOMBRE_SV.s2, inp('cp', 's2Plazo', p.s2Plazo, { n: 'Plazo estimado' }) + inp('cp', 's2Dias', p.s2Dias, { n: 'Días para aportar la documentación' }) + inp('cp', 's2Imp', p.s2Imp, { n: 'Honorarios (sin IVA, opcional)', ph: sv.length === 1 ? 'Los totales' : 'Incluidos en el total' }))}
        ${svOpc('s3', NOMBRE_SV.s3 + ' · ' + (x.d.s3 || {}).meses + ' meses', inp('cp', 's3Sesiones', p.s3Sesiones, { n: 'Número de sesiones', ph: (x.d.s3 || {}).sesiones }) + inp('cp', 's3Duracion', p.s3Duracion, { n: 'Duración de cada sesión' }) + inp('cp', 's3Periodicidad', p.s3Periodicidad, { n: 'Periodicidad', ph: (x.d.s3 || {}).periodicidad }) + inp('cp', 's3Modalidad', p.s3Modalidad, { n: 'Modalidad', ancho: true }) + inp('cp', 's3Respuesta', p.s3Respuesta, { n: 'Respuesta entre sesiones (horas)' }) + inp('cp', 's3Informe', p.s3Informe, { n: 'Informe de seguimiento' }) + inp('cp', 's3Preaviso', p.s3Preaviso, { n: 'Preaviso para desistir (días)' }) + inp('cp', 's3Prorroga', p.s3Prorroga, { n: 'Meses de cada prórroga' }) + inp('cp', 's3Imp', p.s3Imp, { n: 'Honorarios (sin IVA, opcional)', ph: sv.length === 1 ? 'Los totales' : 'Incluidos en el total' }))}
        ${sv.length ? '' : '<p class="small muted" style="margin:0">Los plazos de cada servicio aparecen al marcarlo como contratado.</p>'}
      </section>
      <section class="glass pad stack"><div class="eyebrow">Subencargados del tratamiento (Anexo III)</div><small class="muted">Proveedores que tratan datos del cliente por cuenta de su firma. Revise la garantía de cada transferencia antes de firmar.</small>
        <div class="ct-subs">${c.subencargados.map((s, i) => `<div class="ct-sub" data-sb="${i}">${inp('sb', 'n', s.n, { n: 'Proveedor' })}${inp('sb', 'servicio', s.servicio, { n: 'Servicio que presta' })}${inp('sb', 'ubicacion', s.ubicacion, { n: 'Ubicación y garantía' })}<button class="btn ghost small" data-sbx="${i}" aria-label="Quitar ${esc(s.n || 'subencargado')}">Quitar</button></div>`).join('')}</div>
        <div class="row"><button class="btn ghost small" id="ct-cs-nuevo">Añadir subencargado</button><button class="btn ghost small" id="ctSubDef">Volver a la lista de partida</button></div></section>
      <section class="glass pad stack ct-prev"><div class="row"><div><div class="eyebrow">Vista previa del contrato</div><small class="muted">Documento A4 con las cláusulas numeradas. Lo que falta sale resaltado en amarillo.</small></div></div>
        ${a ? `<p class="small muted ct-aprobada" style="margin:0">Plantilla versión ${esc(a.version)}, en vigor desde el ${esc(fLarga(a.fecha))} (aprobada por ${esc(a.por || 'su abogado')}).</p>` : `<div class="ct-borrador" role="note">${esc(AVISO)}</div>`}
        <div class="ct-hoja-w"><article class="paper rp ct-doc" id="ctDoc">${docHTML(bls)}</article></div>
        <div class="row ct-acc"><button class="btn solid" id="ctPdf2">Imprimir o guardar en PDF</button><button class="btn" id="ctWord2">Descargar en Word</button></div>
      </section>
      <section class="glass pad stack"><div class="eyebrow">Firma</div>
        ${c.firmado && c.firmado.fecha ? `<p style="margin:0">Contrato firmado el <b>${esc(fLarga(c.firmado.fecha))}</b>.</p><div class="row"><button class="btn ghost small" id="ctDesfirmar">Quitar la marca de firmado</button></div>`
          : `<p class="small muted" style="margin:0">${c.generado && !fl.length ? 'Cuando las dos partes lo hayan firmado, anote la fecha: el paso queda hecho.' : 'Primero complete los datos y genere el contrato (imprímalo o descárguelo en Word).'}</p><div class="row"><label class="small">Fecha de la firma<input class="input" type="date" id="ctFFecha" value="${esc(hoy())}"></label><button class="btn solid" id="ctFirmar" ${c.generado && !fl.length ? '' : 'disabled'}>Marcar como firmado</button></div>`}
      </section>`;
    // Al teclear: se guarda y se rehacen la lista de lo que falta y la vista previa (sin perder el foco)
    let tR;
    const refrescar = () => { clearTimeout(tR); tR = setTimeout(() => { try { const y = datos(), f2 = faltas(y); $('#ctFaltas', host).innerHTML = faltasHTML(f2); $('#ctEstado', host).innerHTML = estadoHTML(f2); $('#ctDoc', host).innerHTML = docHTML(documento(PT(), y.d)); wireFaltas(); } catch (e) { console.error(e); } }, 250); };
    const wireFaltas = () => {
      $$('[data-ctir]', host).forEach((b) => (b.onclick = () => ir(b.dataset.ctir, { ver: true })));
      $$('[data-ctfoco]', host).forEach((b) => (b.onclick = () => { const id = b.dataset.ctfoco, el = document.getElementById(id === 'cs-nuevo' ? 'ct-cs-nuevo' : 'ct-' + id.replace(/^(\w+)-/, '$1-')); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }); } }));
    };
    wireFaltas();
    $$('[data-cc]', host).forEach((el) => (el.oninput = () => { C().cliente[el.dataset.cc] = el.value; el.removeAttribute('aria-invalid'); guardar(); refrescar(); }));
    $$('[data-cf]', host).forEach((el) => (el.oninput = () => {
      const k = el.dataset.cf, v = el.value.trim();
      if (['razon', 'cif'].includes(k)) ponFirma(k, v); else ponFirma(k, v, true);
      el.removeAttribute('aria-invalid'); refrescar();
    }));
    $$('[data-cp]', host).forEach((el) => (el.oninput = el.onchange = () => { C().p[el.dataset.cp] = el.type === 'checkbox' ? el.checked : el.value; guardar(); refrescar(); }));
    $$('.ct-sub', host).forEach((row) => { const s = c.subencargados[+row.dataset.sb]; $$('[data-sb]', row).forEach((el) => { if (el === row) return; el.oninput = () => { s[el.dataset.sb] = el.value; guardar(); refrescar(); }; }); });
    $$('[data-sbx]', host).forEach((b) => (b.onclick = () => { c.subencargados.splice(+b.dataset.sbx, 1); guardar(); I.render(); }));
    $('#ct-cs-nuevo', host).onclick = () => { c.subencargados.push({ id: 'sb' + Date.now().toString(36), n: '', servicio: '', ubicacion: 'UE' }); guardar(); I.render(); const l = $$('.ct-sub', host); const u = l[l.length - 1]; if (u) { const f = $('input', u); f && f.focus(); } };
    $('#ctSubDef', host).onclick = () => { c.subencargados = DEF_SUB.map((y) => Object.assign({}, y)); guardar(); I.render(); };
    ['#ctPdf', '#ctPdf2'].forEach((s) => ($(s, host).onclick = (e) => imprimir(e.currentTarget)));
    ['#ctWord', '#ctWord2'].forEach((s) => ($(s, host).onclick = () => word()));
    const fi = $('#ctFirmar', host); if (fi) fi.onclick = () => { if (!completo()) return toast('Faltan datos: complételos antes de marcarlo como firmado.', 'warn'); c.firmado = { fecha: $('#ctFFecha', host).value || hoy(), marcado: new Date().toISOString() }; guardar(); I.render(); toast('Contrato marcado como firmado.'); };
    const df = $('#ctDesfirmar', host); if (df) df.onclick = () => { c.firmado = null; guardar(); I.render(); };
  };

  /* ---------- Integración en el recorrido ---------- */
  V.hechoExtra = Object.assign(V.hechoExtra || {}, { contrato: (st) => !!(st.contrato && st.contrato.generado && st.contrato.firmado && st.contrato.firmado.fecha) && completo() });
  Object.assign(V.pasoTxt, { contrato: 'Con la propuesta aceptada, genere el contrato de prestación de servicios: complete lo que falte del cliente y de su firma, revise las condiciones e imprímalo o descárguelo. Queda hecho al marcarlo como firmado.' });
  V.fichaExtra = Object.assign(V.fichaExtra || {}, {
    contrato: { donde: 'Convierte la propuesta aceptada en el contrato de prestación de servicios, con sus cuatro anexos.',
      ves: () => { const f = faltas(), c = C(); return [f.length ? `Faltan ${f.length} ${f.length === 1 ? 'dato' : 'datos'} para generarlo.` : 'Datos completos.', c.firmado && c.firmado.fecha ? 'Firmado el ' + fLarga(c.firmado.fecha) + '.' : 'Sin firmar todavía.', aprobada() ? `Plantilla versión ${aprobada().version}, en vigor.` : 'Plantilla pendiente de aprobación: sale como borrador.']; },
      sig: [{ f: 'con', t: 'Envíe el borrador al cliente unos días antes de la reunión de firma.' }, { f: 'coa', t: 'Repase con él qué le toca a cada parte.', q: '¿Quién de su equipo será nuestro interlocutor y podrá decidir?' }],
      pedir: ['Razón social, NIF y domicilio de la empresa', 'Nombre, cargo y documento de quien firma', 'Correo para las comunicaciones'], medir: ['Días entre la aceptación y la firma'], exp: 'Las cifras salen de la propuesta integral: si cambia el precio o la forma de pago, cámbielo allí y el contrato se rehace.' }
  });
  // «Aceptación y servicios» enlaza con el contrato
  const ac0 = VISTAS.aceptacion;
  if (ac0) VISTAS.aceptacion = (host) => {
    ac0(host);
    const c = C(), fl = (() => { try { return faltas(); } catch (e) { return []; } })(), sec = document.createElement('section'); sec.className = 'glass pad stack';
    sec.innerHTML = `<div class="eyebrow">Contrato</div><p class="small" style="margin:0">${c.firmado && c.firmado.fecha ? `Firmado el ${esc(fLarga(c.firmado.fecha))}.` : R().propuesta.estado === 'aceptada' ? `Con la propuesta aceptada, genere el contrato. ${fl.length ? `Faltan ${fl.length} ${fl.length === 1 ? 'dato' : 'datos'}.` : 'Están todos los datos.'}` : 'Cuando la propuesta esté aceptada, el contrato se genera con sus importes y su forma de pago.'}</p><div class="row"><button class="btn" data-ir="contrato">Ir al contrato →</button></div>`;
    host.appendChild(sec);
    $('[data-ir]', sec).onclick = () => ir('contrato', { ver: true });
  };
  // En «Informes y documentos»
  if (Array.isArray(V.serviciosInformes)) V.serviciosInformes.splice(0, 0, { k: 'contrato', n: 'Contrato de prestación de servicios', d: 'Propuesta y contrato · con sus anexos', fn: () => ir('contrato', { ver: true }), para: 'empresa' });
  V.contrato = { datos, faltas, completo, documento: () => documento(PT(), datos().d), consultor, cliente, AVISO, DEF_CONSULTOR, DEF_SUB };
})(typeof window !== 'undefined' ? window : null);
