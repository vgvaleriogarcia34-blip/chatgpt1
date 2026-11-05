// Utilidades comunes de la base de conocimiento: carpeta, lectura de los .md curados, normalización,
// raíces en español, sinónimos del sector y troceado en fragmentos. Sin dependencias.
import fs from 'node:fs';
import path from 'node:path';
import { C } from '../config.js';

/** Carpeta de la base de conocimiento (CONOCIMIENTO_DIR manda; si no, datos/conocimiento). */
export function dirConocimiento() {
  return process.env.CONOCIMIENTO_DIR || path.join(C.datos, 'conocimiento');
}

/** .md curados de la carpeta, ordenados por nombre (orden estable, independiente de la configuración regional). */
export function archivosCurados(dir = dirConocimiento()) {
  let nombres = [];
  try { nombres = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.md')); } catch { return []; }
  const clave = (n) => n.toLowerCase();
  return nombres
    .sort((a, b) => (clave(a) < clave(b) ? -1 : clave(a) > clave(b) ? 1 : a < b ? -1 : a > b ? 1 : 0))
    .map((nombre) => ({ nombre, ruta: path.join(dir, nombre) }));
}

/** Quita el pie «---\nFuentes: …» de un .md curado (sirve al equipo; no hace falta en el sistema ni en la búsqueda). */
export function quitarPie(md) {
  return md.replace(/\r\n/g, '\n').replace(/\n-{3,}\s*\n(?:Fuentes|Detectado)[^]*$/, '').trimEnd();
}

/** Título de un .md: su primer «# …» o, si no lo tiene, el nombre del archivo. */
export function tituloMd(md, nombre) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : nombre.replace(/\.md$/i, '');
}

export const contarPalabras = (t) => (t.match(/\S+/g) || []).length;

// --- Normalización y raíces ---

/** Minúsculas y sin acentos («Tesorería» → «tesoreria»). */
export function normalizar(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const VACIAS = new Set(('a al algo algun alguna algunas alguno algunos ante antes aqui asi aun bien cada como con contra cual cuales cuando de del desde donde dos e el ella ellas ello ellos en entre era eran es esa esas ese eso esos esta estan estar estas este esto estos fue fueron ha hace hacen hacer han hay la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros o os otra otras otro otros para pero poco por porque pues que se sea segun ser si sin sobre son su sus tambien tan te tener tiene tienen todo todos tu tus un una unas uno unos usted ustedes y ya yo vosotros quiero quisiera saber puede pueden podria hola gracias').split(' '));

// Sufijos de más largo a más corto; raíz mínima de 3 letras
const SUFIJOS = ['amientos', 'imientos', 'aciones', 'iciones', 'amiento', 'imiento', 'idades', 'acion', 'icion', 'idad', 'mente', 'ables', 'ibles', 'istas', 'able', 'ible', 'ista', 'osos', 'osas', 'ivos', 'ivas', 'ores', 'oso', 'osa', 'ivo', 'iva', 'es', 'os', 'as', 'a', 'o', 'e', 's'];

/** Raíz ligera en español: quita plurales y sufijos frecuentes («ventas» → «vent», «rentabilidad» → «rentabil»). */
export function raiz(palabra) {
  if (palabra.length <= 3 || /\d/.test(palabra)) return palabra;
  for (const suf of SUFIJOS) {
    if (palabra.endsWith(suf) && palabra.length - suf.length >= 3) return palabra.slice(0, -suf.length);
  }
  return palabra;
}

// Sinónimos del sector: cada grupo se reduce a una sola clave (la raíz de su primera palabra)
const GRUPOS = [
  ['margen', 'rentabilidad', 'rentable', 'rentables', 'beneficio', 'beneficios', 'ganancia', 'ganancias', 'ganar', 'gano', 'gana', 'ganamos'],
  ['plantilla', 'personal', 'equipo', 'equipos', 'empleado', 'empleados', 'trabajador', 'trabajadores', 'gente', 'personas', 'contratar', 'contratacion', 'contrataciones'],
  ['relevo', 'sucesion', 'sucesor', 'sucesores', 'generacional', 'heredar', 'herencia', 'transmision'],
  ['caja', 'tesoreria', 'liquidez', 'circulante', 'cobro', 'cobros'],
  ['venta', 'ventas', 'vender', 'vendo', 'vende', 'vendemos', 'facturacion', 'facturar', 'facturo', 'ingresos'],
  ['precio', 'precios', 'tarifa', 'tarifas', 'honorarios', 'cuesta', 'cuestan', 'cobran', 'importe', 'importes'],
  ['dueno', 'duenos', 'fundador', 'fundadores', 'propietario', 'propietarios', 'empresario', 'empresarios', 'gerente'],
  ['ponencia', 'ponencias', 'conferencia', 'conferencias', 'charla', 'charlas', 'taller', 'talleres', 'jornada', 'jornadas', 'curso', 'cursos', 'formacion'],
  ['ia', 'artificial', 'automatizar', 'automatizacion'],
  ['socio', 'socios', 'accionista', 'accionistas'],
  ['delegar', 'delegacion', 'delego'],
  ['diagnostico', 'auditoria', 'analisis'],
  ['metodo', 'metodologia', 'proceso', 'procesos'],
  ['duracion', 'dura', 'duran', 'plazo'],
  ['caso', 'casos', 'cliente', 'clientes', 'ejemplo', 'ejemplos', 'resultado', 'resultados'],
];
const SINONIMO = new Map();
for (const g of GRUPOS) {
  const clave = raiz(normalizar(g[0]));
  for (const p of g) SINONIMO.set(raiz(normalizar(p)), clave);
}

/**
 * Términos de un texto: normalizados, sin palabras vacías y reducidos a raíz. Si la palabra tiene sinónimos del sector,
 * se añade además la clave del grupo («~caj»): así la palabra exacta cuenta doble y el sinónimo, una vez.
 */
export function terminos(texto) {
  const out = [];
  for (const p of normalizar(texto).split(/[^a-z0-9ñ]+/)) {
    if (!p || VACIAS.has(p) || (p.length < 2 && p !== 'ia')) continue;
    const r = raiz(p);
    out.push(r);
    const g = SINONIMO.get(r);
    if (g) out.push('~' + g);
  }
  return out;
}

/** Texto normalizado para comparar frases («Todo pasa por mí» → «todo pasa por mi»). */
export const frase = (t) => normalizar(t).replace(/[^a-z0-9ñ]+/g, ' ').trim();

// --- Troceado ---

const OBJETIVO = 180; // palabras por fragmento, aproximadas
const MAXIMO = 260;

const MINIMO = 40; // un trozo final más corto se une al anterior

/** Unidades de un párrafo enorme: sus líneas (listas, tablas) o, si es una sola línea, sus frases. */
function unidades(p) {
  const lineas = p.split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const l of lineas.length > 1 ? lineas : [p]) {
    if (contarPalabras(l) > MAXIMO) out.push(...l.split(/(?<=[.!?…])\s+/));
    else out.push(l);
  }
  return out;
}

/** Parte un texto largo por párrafos en trozos de unas OBJETIVO palabras. */
function partirPorParrafos(texto) {
  const piezas = []; // [texto, separador]
  for (const p of texto.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)) {
    if (contarPalabras(p) > MAXIMO) for (const u of unidades(p)) piezas.push([u, '\n']);
    else piezas.push([p, '\n\n']);
  }
  const trozos = [];
  let actual = '';
  let n = 0;
  const cerrar = () => { if (actual) trozos.push(actual); actual = ''; n = 0; };
  for (const [p, sep] of piezas) {
    const w = contarPalabras(p);
    if (n && n + w > MAXIMO) cerrar();
    actual = actual ? actual + sep + p : p;
    n += w;
    if (n >= OBJETIVO) cerrar();
  }
  if (actual && n < MINIMO && trozos.length && contarPalabras(trozos[trozos.length - 1]) + n <= MAXIMO + MINIMO) {
    trozos[trozos.length - 1] += '\n\n' + actual;
    actual = '';
  }
  cerrar();
  return trozos;
}

/**
 * Fragmentos de un .md curado: uno por sección «## …» (partido si es largo), con el título del archivo y de la sección.
 * Devuelve [{ fuente, titulo, texto }].
 */
export function trocearMd(md, fuente) {
  const limpio = quitarPie(md);
  const titulo = tituloMd(limpio, fuente);
  const cuerpo = limpio.replace(/^#\s+.+$/m, '').trim();
  const secciones = [];
  let actual = { cabecera: '', lineas: [] };
  for (const linea of cuerpo.split('\n')) {
    const m = linea.match(/^#{2,3}\s+(.+)$/);
    if (m && linea.startsWith('## ')) { secciones.push(actual); actual = { cabecera: m[1].trim(), lineas: [] }; continue; }
    actual.lineas.push(linea);
  }
  secciones.push(actual);
  const out = [];
  for (const s of secciones) {
    const texto = s.lineas.join('\n').trim();
    if (!texto) continue;
    const tit = s.cabecera ? `${titulo} › ${s.cabecera}` : titulo;
    for (const t of partirPorParrafos(texto)) out.push({ fuente, titulo: tit, texto: t });
  }
  return out;
}

/** Fragmentos de un texto en bruto (Drive, web). La primera línea «# …», si existe, es el título. */
export function trocearTexto(texto, fuente) {
  const t = texto.replace(/\r\n/g, '\n');
  const m = t.match(/^#\s+(.+)\n/);
  const titulo = m ? m[1].trim() : fuente;
  const cuerpo = m ? t.slice(m[0].length) : t;
  return partirPorParrafos(cuerpo).map((x) => ({ fuente, titulo, texto: x }));
}

// --- Índice BM25 ---

export const PESO_CURADO = 1.5; // los .md curados tienen prioridad sobre el material en bruto
export const PESO_PENDIENTE = 0.7;

/** Construye el índice a partir de fragmentos [{ fuente, titulo, texto, tipo }]. Determinista para la misma entrada. */
export function indexar(fragmentos) {
  const docs = [];
  const df = {};
  let total = 0;
  for (const f of fragmentos) {
    const ts = terminos(f.titulo + '\n' + f.texto);
    if (!ts.length) continue;
    const tf = {};
    for (const t of ts) tf[t] = (tf[t] || 0) + 1;
    for (const t of Object.keys(tf)) df[t] = (df[t] || 0) + 1;
    total += ts.length;
    docs.push({ fuente: f.fuente, titulo: f.titulo, texto: f.texto, tipo: f.tipo || 'fuente', len: ts.length, tf });
  }
  return { version: 1, N: docs.length, avgdl: docs.length ? total / docs.length : 0, df, docs };
}

/** Fragmentos de todos los .md curados de una carpeta. */
export function fragmentosCurados(dir = dirConocimiento()) {
  const out = [];
  for (const { nombre, ruta } of archivosCurados(dir)) {
    const tipo = /^pendiente/i.test(nombre) ? 'pendiente' : 'curado'; // las preguntas abiertas pesan menos
    for (const f of trocearMd(fs.readFileSync(ruta, 'utf8'), nombre)) out.push({ ...f, tipo });
  }
  return out;
}

// --- Oferta vigente frente al material en bruto ---

/**
 * Frases de las webs (o de documentos) que contradicen la oferta vigente: la primera reunión es la sesión estratégica de
 * 60 minutos con Valerio García, sin coste ni compromiso, y el diagnóstico es otro servicio, de pago. Al ingestar (y al
 * cargar un índice antiguo) se corrigen en los fragmentos de fuentes/; los .md curados ya dicen lo correcto.
 * Cada entrada: [expresión, sustitución]. Añada aquí lo que la web vuelva a decir mal.
 */
export const OBSOLETAS = [
  // «Sesión estratégica … 30 minutos Sin coste ni compromiso» (tarjeta de pasos de la web)
  [/\b30\s*minutos(?=[^\n]{0,40}(sin coste|sin compromiso|gratis))/gi, '60 minutos'],
  [/\btreinta minutos para saber si tiene sentido seguir\b/gi, 'Sesenta minutos con Valerio García para saber si tiene sentido seguir'],
  [/\bsesi[oó]n estrat[eé]gica de 30 minutos\b/gi, 'sesión estratégica de 60 minutos'],
  // El cuestionario de 3 minutos no es un diagnóstico: el diagnóstico es de pago
  [/\babrir el diagn[oó]stico gratuito\b/gi, 'Abrir el Mapa de Gobierno del Equipo (gratis, unos 3 minutos)'],
  [/\bdiagn[oó]stico gratuito\b/gi, 'Mapa de Gobierno del Equipo (gratis)'],
  // «Una hora con un socio, sin coste…»: la primera conversación es la sesión estratégica con Valerio García
  [/\buna hora con un socio,?\s*sin coste y sin propuesta comercial\.?/gi, 'Sesión estratégica de 60 minutos con Valerio García, sin coste ni compromiso.'],
  [/\buna hora con un socio\b/gi, 'la sesión estratégica de 60 minutos con Valerio García'],
  // Responsable de los datos (cambio de noviembre de 2026): FAMILIAS EMPRESARIAS, S.L., no AKOMPANO GROUP, S.L. La web de
  // businessavance.es aún no se ha cambiado. NIF, domicilio y correo de privacidad de la nueva titular, pendientes: no se ponen
  [/\bResponsable:\s*AKOMPANO\s+GROUP,?\s*S\.?\s*L\.?\s*(?:\(NIF\s*B05544713\))?,?\s*(?:C\/\s*Fern[aá]ndez\s+Ardav[ií]n[^.\n]*?30001\s+Murcia)?\.?/gi, 'Responsable: FAMILIAS EMPRESARIAS, S.L.'],
  [/\b(ejercer sus derechos[^.\n]*?)\s+en\s+servicios@akompanogroup\.es\s*\./gi, '$1 como indica la política de privacidad.'],
  [/\bAKOMPANO\s+GROUP,?\s*S\.?\s*L\.?(?:\s*\(NIF\s*B05544713\))?/gi, 'FAMILIAS EMPRESARIAS, S.L.'],
];
/** Corrige en un texto en bruto las frases que contradicen la oferta vigente (OBSOLETAS). */
export function corregirObsoleto(texto) {
  let t = String(texto);
  for (const [re, por] of OBSOLETAS) t = t.replace(re, por);
  return t;
}
/** ¿Queda en el texto alguna frase obsoleta? (para las pruebas y la ingesta) */
export const tieneObsoleto = (texto) => OBSOLETAS.some(([re]) => { re.lastIndex = 0; const r = re.test(String(texto)); re.lastIndex = 0; return r; });

// Por norma de la firma, al cliente no se le nombran estas marcas internas: se describe el método
const MARCAS = [
  [/(?:el\s+|la\s+)?(?:diagn[oó]stico\s+|m[eé]todo\s+|metodolog[ií]a\s+)?(?:the\s+)?clarity[\s_-]*code(?:\s*(?:®|™|360))*/gi, 'el diagnóstico de claridad'],
  [/(?:el\s+)?(?:m[eé]todo\s+)?quercus(?:\s*®)?/gi, 'el método propio de estructura, roles, finanzas y legado'],
  [/(?:el\s+|la\s+)?(?:m[eé]todo\s+)?k[eé]nosis(?:\s*®)?/gi, 'el método de la firma'],
];
/** Sustituye las marcas internas por su descripción (para lo que puede acabar oyendo o leyendo un cliente). */
export function sinMarcas(texto) {
  let t = String(texto);
  for (const [re, por] of MARCAS) t = t.replace(re, por);
  return t;
}
