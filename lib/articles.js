'use strict';

/**
 * Convierte el texto exportado de un Google Doc en un artículo de blog
 * estructurado (título, fecha, HTML del cuerpo, resumen, etc.).
 *
 * Formato esperado del documento (es el que generan los agentes de
 * Círculo de Claridad):
 *   - La primera línea con texto es el TÍTULO.
 *   - Las líneas que empiezan por "#" (a veces "\#") son ENCABEZADOS de sección.
 *   - El resto son párrafos, separados por líneas en blanco.
 *   - Las URLs se convierten en enlaces automáticamente.
 */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convierte URLs sueltas en <a>. Se aplica sobre texto YA escapado.
function linkify(safeText) {
  return safeText.replace(/(https?:\/\/[^\s<]+[^\s<.,;:)])/g, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function isHeading(line) {
  return /^\\?#{1,6}\s*\S/.test(line.trim());
}

function headingText(line) {
  return line.trim().replace(/^\\?#{1,6}\s*/, '').trim();
}

/**
 * Parsea el texto plano del doc a { title, blocks: [{type, text}] }.
 */
function parseDoc(rawText) {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');

  let title = null;
  const blocks = [];
  let paragraphBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length) {
      const text = paragraphBuffer.join(' ').replace(/\s+/g, ' ').trim();
      if (text) blocks.push({ type: 'p', text });
      paragraphBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/[\u00a0\u200b]/g, ' ').trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (title === null) {
      // Primera línea con texto = título. Quita un posible prefijo de fecha.
      title = line.replace(/^\d{4}-\d{2}-\d{2}\s*[-–—]\s*/, '').trim();
      continue;
    }

    if (isHeading(line)) {
      flushParagraph();
      blocks.push({ type: 'h2', text: headingText(line) });
      continue;
    }

    paragraphBuffer.push(line);
  }
  flushParagraph();

  return { title: title || 'Artículo sin título', blocks };
}

function blocksToHtml(blocks) {
  return blocks
    .map((b) => {
      const safe = linkify(escapeHtml(b.text));
      if (b.type === 'h2') return `<h2>${safe}</h2>`;
      return `<p>${safe}</p>`;
    })
    .join('\n');
}

function buildExcerpt(blocks, maxLen = 200) {
  const firstP = blocks.find((b) => b.type === 'p');
  if (!firstP) return '';
  const text = firstP.text;
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

function readingMinutes(blocks) {
  const words = blocks.reduce((n, b) => n + b.text.split(/\s+/).length, 0);
  return Math.max(1, Math.round(words / 200));
}

/**
 * Construye un objeto artículo a partir de los metadatos de Drive y el texto.
 */
function buildArticle(meta, rawText) {
  const { title, blocks } = parseDoc(rawText);
  const dateSource = meta.createdTime || meta.modifiedTime;
  const date = dateSource ? new Date(dateSource) : new Date(0);

  return {
    id: meta.id,
    slug: slugify(title) || meta.id,
    title,
    date: date.toISOString(),
    dateLabel: formatDate(date),
    excerpt: buildExcerpt(blocks),
    readingMinutes: readingMinutes(blocks),
    bodyHtml: blocksToHtml(blocks),
    modifiedTime: meta.modifiedTime || null,
  };
}

function formatDate(date) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch (e) {
    return date.toISOString().slice(0, 10);
  }
}

module.exports = { buildArticle, slugify, escapeHtml };
