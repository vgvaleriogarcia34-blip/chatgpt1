// Importa en el servidor el fichero de la lista Robinson (para ficheros grandes que no caben en el panel). Sustituye a la anterior.
// Uso: node src/prospeccion/importar-robinson.js ruta/al/fichero.csv [AAAA-MM-DD]
import fs from 'node:fs';
import * as db from '../almacen/db.js';
import { importarRobinsonCSV } from './cumplimiento.js';

const [fichero, fecha] = process.argv.slice(2);
if (!fichero) { console.error('Uso: node src/prospeccion/importar-robinson.js fichero.csv [AAAA-MM-DD]'); process.exit(1); }
db.abrir();
try {
  // Sustituye la lista anterior de una vez; si el fichero no trae números, la anterior se mantiene
  const r = importarRobinsonCSV(fs.readFileSync(fichero, 'utf8'), fecha || undefined);
  console.log(`Lista Robinson sustituida: ${r.cargados} números cargados (antes había ${r.anteriores}), ${r.descartados} filas descartadas.`);
} catch (err) {
  console.error('No se ha importado la lista Robinson:', err.message);
  process.exitCode = 1;
} finally { db.cerrar(); }
