'use strict';

/**
 * Almacén de artículos del blog + sincronización automática con Drive.
 *
 * - Mantiene los artículos en memoria para servirlos rápido.
 * - Cachea el resultado en data/articles.json para sobrevivir reinicios.
 * - Re-exporta de Drive solo los documentos que han cambiado (por modifiedTime).
 */

const fs = require('fs');
const path = require('path');
const { listArticleDocs, exportDocText } = require('./drive');
const { buildArticle } = require('./articles');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CACHE_FILE = path.join(DATA_DIR, 'articles.json');

let articles = [];        // ordenados del más reciente al más antiguo
let bySlug = new Map();
let lastSync = null;
let lastError = null;
let syncing = false;

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      articles = parsed.articles || [];
      lastSync = parsed.lastSync || null;
      reindex();
      console.log(`[blog] Caché cargada: ${articles.length} artículos.`);
    }
  } catch (err) {
    console.warn('[blog] No se pudo leer la caché:', err.message);
  }
}

function saveCache() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ articles, lastSync }, null, 2));
  } catch (err) {
    console.warn('[blog] No se pudo guardar la caché:', err.message);
  }
}

function reindex() {
  bySlug = new Map();
  for (const a of articles) bySlug.set(a.slug, a);
}

/**
 * Sincroniza con Drive. Devuelve un resumen de la operación.
 */
async function sync() {
  if (syncing) return { skipped: true, reason: 'sync en curso' };
  syncing = true;
  const previousById = new Map(articles.map((a) => [a.id, a]));
  let added = 0;
  let updated = 0;

  try {
    const docs = await listArticleDocs();
    const next = [];

    for (const meta of docs) {
      const prev = previousById.get(meta.id);
      if (prev && prev.modifiedTime === meta.modifiedTime) {
        next.push(prev); // sin cambios: reutiliza
        continue;
      }
      const text = await exportDocText(meta.id);
      const article = buildArticle(meta, text);
      next.push(article);
      if (prev) updated++;
      else added++;
    }

    // Evita slugs duplicados (si dos títulos coinciden).
    const seen = new Map();
    for (const a of next) {
      if (seen.has(a.slug)) {
        a.slug = `${a.slug}-${a.id.slice(0, 6).toLowerCase()}`;
      }
      seen.set(a.slug, true);
    }

    next.sort((a, b) => new Date(b.date) - new Date(a.date));
    articles = next;
    reindex();
    lastSync = new Date().toISOString();
    lastError = null;
    saveCache();
    console.log(
      `[blog] Sync OK: ${articles.length} artículos (${added} nuevos, ${updated} actualizados).`
    );
    return { ok: true, total: articles.length, added, updated, lastSync };
  } catch (err) {
    lastError = err.message;
    console.error('[blog] Error en sync:', err.message);
    return { ok: false, error: err.message };
  } finally {
    syncing = false;
  }
}

function getAll() {
  return articles;
}

function getBySlug(slug) {
  return bySlug.get(slug) || null;
}

function getStatus() {
  return { total: articles.length, lastSync, lastError, syncing };
}

/**
 * Arranca la sincronización periódica. Intervalo en minutos (mín. 1).
 */
function startAutoSync(intervalMinutes) {
  const minutes = Math.max(1, Number(intervalMinutes) || 15);
  loadCache();
  // Primera sincronización al arrancar (no bloquea el servidor).
  sync().catch((e) => console.error('[blog] Sync inicial falló:', e.message));
  setInterval(() => {
    sync().catch((e) => console.error('[blog] Sync periódico falló:', e.message));
  }, minutes * 60 * 1000);
  console.log(`[blog] Auto-sync cada ${minutes} min.`);
}

module.exports = { sync, getAll, getBySlug, getStatus, startAutoSync, loadCache };
