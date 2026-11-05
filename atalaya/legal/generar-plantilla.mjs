#!/usr/bin/env node
/* Atalaya · Genera js/intervencion/contrato-plantilla.js a partir de legal/CONTRATO-PLANTILLA.md
   La plantilla del contrato tiene una sola fuente: el .md (lo que lee el abogado). El servidor estático no sirve .md,
   así que su texto (entre <!-- PLANTILLA --> y <!-- /PLANTILLA -->) se copia a un .js junto con los nombres legibles
   de los campos (legal/contrato-campos.json).
   Uso:  node legal/generar-plantilla.mjs          (escribe el .js)
         node legal/generar-plantilla.mjs --check  (falla si el .js no está al día) */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD = join(RAIZ, 'legal/CONTRATO-PLANTILLA.md');
const CAMPOS = join(RAIZ, 'legal/contrato-campos.json');
const SALIDA = join(RAIZ, 'js/intervencion/contrato-plantilla.js');

const md = readFileSync(MD, 'utf8').replace(/\r\n/g, '\n');
const m = md.match(/<!-- PLANTILLA -->\n([\s\S]*?)\n<!-- \/PLANTILLA -->/);
if (!m) { console.error('No se encuentra el texto entre <!-- PLANTILLA --> y <!-- /PLANTILLA --> en ' + MD); process.exit(1); }
const texto = m[1].replace(/^\n+|\n+$/g, '') + '\n';
const campos = JSON.parse(readFileSync(CAMPOS, 'utf8'));

// Comprobaciones: etiquetas equilibradas y todos los campos con nombre legible
const pila = []; const errores = [];
for (const t of texto.matchAll(/\{\{\s*([#/])(si|no|cada)\b\s*([^}]*)\}\}/g)) {
  if (t[1] === '#') pila.push(t[2]); else if (pila.pop() !== t[2]) errores.push('Etiqueta {{/' + t[2] + '}} sin abrir o mal anidada');
}
if (pila.length) errores.push('Bloques sin cerrar: ' + pila.join(', '));
const listas = [];
const recorrer = (re, f) => { for (const x of texto.matchAll(re)) f(x); };
recorrer(/\{\{#cada\s+([\w.]+)\}\}([\s\S]*?)\{\{\/cada\}\}/g, (x) => { listas.push(x[1]); for (const y of x[2].matchAll(/\{\{\.(\w+)\}\}/g)) if (!campos.campos[x[1] + '.' + y[1]]) errores.push('Sin nombre legible: ' + x[1] + '.' + y[1]); if (!campos.listas[x[1]]) errores.push('Sin nota de lista: ' + x[1]); });
recorrer(/\{\{\s*([a-z][\w.]*)\s*\}\}/g, (x) => { if (!campos.campos[x[1]]) errores.push('Sin nombre legible: ' + x[1]); });
recorrer(/\{\{#(si|no)\s+([\w.]+)\}\}/g, (x) => { if (!(x[1] === 'no' ? campos.condicionesNo || {} : campos.condiciones)[x[2]]) errores.push('Sin texto de condición: ' + x[1] + ' ' + x[2]); });
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }

const datos = { version: campos.version, fecha: campos.fecha, texto, campos: campos.campos, condiciones: campos.condiciones, condicionesNo: campos.condicionesNo || {}, listas: campos.listas };
const js = `/* Atalaya · Plantilla del contrato de consultoría (GENERADO: no editar a mano)
   Fuente: legal/CONTRATO-PLANTILLA.md y legal/contrato-campos.json. Para regenerarlo: node legal/generar-plantilla.mjs
   La interpreta js/intervencion/contrato.js. */
(function (raiz) {
  const P = ${JSON.stringify(datos, null, 1)};
  if (typeof module === 'object' && module.exports) module.exports = P;
  if (raiz) { raiz.Atalaya = raiz.Atalaya || {}; raiz.Atalaya.contratoPlantilla = P; }
})(typeof window !== 'undefined' ? window : null);
`;
if (process.argv.includes('--check')) {
  const ok = existsSync(SALIDA) && readFileSync(SALIDA, 'utf8') === js;
  console.log(ok ? 'La plantilla está al día.' : 'La plantilla no está al día: ejecute node legal/generar-plantilla.mjs');
  process.exit(ok ? 0 : 1);
}
writeFileSync(SALIDA, js);
console.log('Escrito ' + SALIDA + ' (' + texto.length + ' caracteres, versión ' + datos.version + ').');
