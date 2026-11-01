// Importa en el servidor el fichero de la lista Robinson (para ficheros grandes que no caben en el panel).
// Uso: node src/prospeccion/importar-robinson.js ruta/al/fichero.csv [AAAA-MM-DD]
import fs from 'node:fs';
import * as db from '../almacen/db.js';
import { importarRobinsonCSV } from './cumplimiento.js';

const [fichero, fecha] = process.argv.slice(2);
if (!fichero) { console.error('Uso: node src/prospeccion/importar-robinson.js fichero.csv [AAAA-MM-DD]'); process.exit(1); }
db.abrir();
const r = importarRobinsonCSV(fs.readFileSync(fichero, 'utf8'), fecha);
console.log(`Lista Robinson: ${r.cargados} números cargados, ${r.descartados} filas descartadas.`);
db.cerrar();
