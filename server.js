'use strict';

/**
 * Servidor web de valeriogarciamentor.com
 *
 *  - Sirve el sitio actual (quiz IA50) desde la raíz.
 *  - Sirve el blog en /blog y /blog/:slug, generado automáticamente a partir
 *    de los Google Docs de la carpeta "Articulos blog generados" (Drive).
 *  - Sincroniza con Drive de forma periódica (publicación automática).
 */

const path = require('path');
const express = require('express');
const store = require('./lib/store');
const { listPage, articlePage, notFoundPage } = require('./lib/views');

const app = express();
const PORT = process.env.PORT || 3000;
const SYNC_MINUTES = process.env.SYNC_INTERVAL_MINUTES || 15;

app.disable('x-powered-by');

// ---- Blog ----
app.get('/blog', (req, res) => {
  res.type('html').send(listPage(store.getAll()));
});

// Sincronización manual opcional (protegida por token). Útil para forzar
// una actualización sin esperar al ciclo automático.
app.post('/blog/sync', async (req, res) => {
  const token = process.env.SYNC_TOKEN;
  if (token && req.query.token !== token) {
    return res.status(401).json({ error: 'token inválido' });
  }
  const result = await store.sync();
  res.json(result);
});

// Estado del blog (diagnóstico).
app.get('/blog/status', (req, res) => {
  res.json(store.getStatus());
});

app.get('/blog/:slug', (req, res) => {
  const article = store.getBySlug(req.params.slug);
  if (!article) {
    return res.status(404).type('html').send(notFoundPage());
  }
  res.type('html').send(articlePage(article));
});

// ---- Sitio estático actual (quiz IA50, blog.css, assets) ----
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

// ---- Arranque ----
store.startAutoSync(SYNC_MINUTES);

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  console.log(`Blog en http://localhost:${PORT}/blog`);
});
