// Paquete de conocimiento que va en el sistema (cacheado): los .md curados de datos/conocimiento, ordenados por nombre.
// Determinista: el mismo texto byte a byte mientras no cambien los archivos, para que la caché de Claude se reutilice.
// Si pasa del máximo de palabras, va un resumen de cada archivo y el detalle queda para buscar_conocimiento.
import fs from 'node:fs';
import { dirConocimiento, archivosCurados, quitarPie, tituloMd, contarPalabras, sinMarcas } from './comun.js';

const MAX_POR_DEFECTO = 60000;

function maxPalabras() {
  const n = Number(process.env.CONOCIMIENTO_MAX_PALABRAS);
  return Number.isFinite(n) && n > 0 ? n : MAX_POR_DEFECTO;
}

// Baja un nivel los encabezados del archivo (el sistema ya pone «# Conocimiento de …»)
const bajarEncabezados = (md) => md.replace(/^(#{1,5})(\s)/gm, '#$1$2');

function completo({ nombre, md }) {
  const limpio = quitarPie(md);
  const titulo = tituloMd(limpio, nombre);
  const cuerpo = limpio.replace(/^#\s+.+\n?/m, '').trim();
  return `## ${titulo}\n\n${bajarEncabezados(cuerpo)}`;
}

/** Resumen de un archivo: su primer párrafo y la lista de apartados. */
function resumen({ nombre, md }) {
  const limpio = quitarPie(md);
  const titulo = tituloMd(limpio, nombre);
  const cuerpo = limpio.replace(/^#\s+.+\n?/m, '').trim();
  const primero = (cuerpo.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith('#')) || '').trim();
  const apartados = [...cuerpo.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  let t = `## ${titulo}\n\n${primero}`;
  if (apartados.length) t += `\n\nApartados: ${apartados.join(' · ')}.`;
  return t + `\n\n(Detalle: use buscar_conocimiento.)`;
}

/** Corta un texto a n palabras sin partir palabras. */
function cortar(texto, n) {
  const re = /\S+/g;
  let m;
  let fin = 0;
  for (let i = 0; i < n && (m = re.exec(texto)); i++) fin = m.index + m[0].length;
  return texto.slice(0, fin);
}

let cache = { clave: null, texto: null };

/**
 * Texto del paquete de conocimiento.
 * opciones: { dir, maxPalabras } (por defecto datos/conocimiento y CONOCIMIENTO_MAX_PALABRAS o 60.000).
 */
export function textoConocimiento({ dir = dirConocimiento(), maxPalabras: max = maxPalabras() } = {}) {
  const archivos = archivosCurados(dir).map((a) => {
    let md = '';
    try { md = fs.readFileSync(a.ruta, 'utf8'); } catch {}
    return { nombre: a.nombre, md: sinMarcas(md) };
  }).filter((a) => a.md.trim());
  const clave = `${dir}|${max}|` + archivos.map((a) => `${a.nombre}:${a.md.length}:${hash(a.md)}`).join('|');
  if (cache.clave === clave) return cache.texto;

  let texto;
  if (!archivos.length) {
    texto = 'La base de conocimiento está vacía. No afirme datos de servicios, precios ni casos: ofrezca que una persona del equipo lo confirme.';
  } else {
    const entero = archivos.map(completo).join('\n\n');
    if (contarPalabras(entero) <= max) {
      texto = entero;
    } else {
      const aviso = 'Resumen de la base de conocimiento (es extensa). Antes de afirmar un dato concreto, búsquelo con buscar_conocimiento.';
      texto = aviso + '\n\n' + archivos.map(resumen).join('\n\n');
      if (contarPalabras(texto) > max) texto = cortar(texto, max) + '\n\n(Resumen cortado por longitud: use buscar_conocimiento.)';
    }
  }
  cache = { clave, texto };
  return texto;
}

// Huella simple del contenido (FNV-1a), para la clave de la caché
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}
