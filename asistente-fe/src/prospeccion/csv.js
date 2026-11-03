// Lector de CSV sencillo, sin dependencias: comillas, separador «,» o «;» (Excel en español), BOM y saltos \r\n.

/** Devuelve una lista de filas (listas de celdas). Detecta el separador en la primera línea si no se indica. */
export function leerCSV(texto, sep) {
  const s = String(texto ?? '').replace(/^﻿/, '');
  if (!sep) {
    const primera = s.split(/\r?\n/, 1)[0] || '';
    const n = (c) => primera.split(c).length;
    sep = n(';') > n(',') ? ';' : n('\t') > n(',') ? '\t' : ',';
  }
  const filas = []; let fila = [], celda = '', comillas = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (comillas) {
      if (c === '"') { if (s[i + 1] === '"') { celda += '"'; i++; } else comillas = false; }
      else celda += c;
    } else if (c === '"' && celda === '') comillas = true;
    else if (c === sep) { fila.push(celda); celda = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      fila.push(celda); celda = '';
      if (fila.some((x) => x.trim() !== '')) filas.push(fila);
      fila = [];
    } else celda += c;
  }
  fila.push(celda);
  if (fila.some((x) => x.trim() !== '')) filas.push(fila);
  return filas;
}

/** CSV con cabecera → lista de objetos con claves en minúsculas, sin tildes y con «_» en lugar de espacios. */
export function leerCSVObjetos(texto, sep) {
  const [cab, ...resto] = leerCSV(texto, sep);
  if (!cab) return [];
  const claves = cab.map((k) => k.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_'));
  return resto.map((f, i) => {
    const o = { _fila: i + 2 };
    claves.forEach((k, j) => { if (k) o[k] = (f[j] ?? '').trim(); });
    return o;
  });
}

/**
 * CSV para abrir en Excel en español: separador «;», BOM UTF-8, saltos \r\n y celdas que empiezan por = + - @ o
 * tabulador neutralizadas con un apóstrofo (para que nadie pueda colar una fórmula desde un dato recibido).
 * @param {string[]} cabecera
 * @param {Array<Array<any>>} filas
 */
export function escribirCSV(cabecera, filas) {
  const celda = (v) => {
    let t = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return '﻿' + [cabecera, ...filas].map((f) => f.map(celda).join(';')).join('\r\n') + '\r\n';
}
