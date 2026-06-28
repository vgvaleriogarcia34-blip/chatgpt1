'use strict';

/**
 * Plantillas HTML del blog. Sin dependencias: simples funciones que
 * devuelven el HTML de la lista y de cada artículo, con el mismo estilo
 * (tipografía Inter, tema oscuro) que el resto de valeriogarciamentor.com.
 */

const { escapeHtml } = require('./articles');

const SITE = {
  name: 'Valerio García Mentor',
  blogTitle: 'Blog · Familias Empresarias',
  tagline: 'Claridad para la empresa familiar',
  cta: 'https://valeriogarciamentor.com/clarity-code',
};

function layout({ title, description, body, canonical }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description || SITE.tagline)}">
${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ''}
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description || SITE.tagline)}">
<meta property="og:type" content="article">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/blog.css">
</head>
<body>
<header class="blog-header">
  <a class="blog-brand" href="/">${escapeHtml(SITE.name)}</a>
  <nav class="blog-nav">
    <a href="/blog">Blog</a>
    <a class="nav-cta" href="${SITE.cta}">Clarity Code</a>
  </nav>
</header>
<main class="blog-main">
${body}
</main>
<footer class="blog-footer">
  <p>© ${new Date().getFullYear()} ${escapeHtml(SITE.name)} · Familias Empresarias</p>
  <p><a href="${SITE.cta}">Solicita tu diagnóstico Clarity Code →</a></p>
</footer>
</body>
</html>`;
}

function listPage(articles) {
  const cards = articles.length
    ? articles
        .map(
          (a) => `
    <article class="post-card">
      <a class="post-card-link" href="/blog/${encodeURIComponent(a.slug)}">
        <div class="post-meta">${escapeHtml(a.dateLabel)} · ${a.readingMinutes} min de lectura</div>
        <h2 class="post-card-title">${escapeHtml(a.title)}</h2>
        <p class="post-card-excerpt">${escapeHtml(a.excerpt)}</p>
        <span class="post-card-more">Leer artículo →</span>
      </a>
    </article>`
        )
        .join('\n')
    : `<p class="empty">Todavía no hay artículos publicados. Vuelve pronto.</p>`;

  const body = `
  <section class="blog-hero">
    <h1>${escapeHtml(SITE.blogTitle)}</h1>
    <p class="blog-hero-sub">${escapeHtml(SITE.tagline)}. Ideas sobre gobierno, profesionalización y rentabilidad en la empresa familiar.</p>
  </section>
  <section class="post-list">
${cards}
  </section>`;

  return layout({
    title: SITE.blogTitle,
    description: `${SITE.tagline}. Artículos sobre empresa familiar.`,
    canonical: 'https://valeriogarciamentor.com/blog',
    body,
  });
}

function articlePage(a) {
  const body = `
  <article class="post">
    <a class="back-link" href="/blog">← Todos los artículos</a>
    <div class="post-meta">${escapeHtml(a.dateLabel)} · ${a.readingMinutes} min de lectura</div>
    <h1 class="post-title">${escapeHtml(a.title)}</h1>
    <div class="post-body">
${a.bodyHtml}
    </div>
    <div class="post-cta">
      <p>¿Has detectado una pérdida invisible en tu empresa familiar?</p>
      <a class="post-cta-btn" href="${SITE.cta}">Solicitar Clarity Code →</a>
    </div>
  </article>`;

  return layout({
    title: `${a.title} · ${SITE.name}`,
    description: a.excerpt,
    canonical: `https://valeriogarciamentor.com/blog/${a.slug}`,
    body,
  });
}

function notFoundPage() {
  const body = `
  <section class="blog-hero">
    <h1>Artículo no encontrado</h1>
    <p class="blog-hero-sub">Puede que se haya movido o aún no esté publicado.</p>
    <p><a class="back-link" href="/blog">← Volver al blog</a></p>
  </section>`;
  return layout({ title: 'No encontrado · ' + SITE.name, body });
}

module.exports = { listPage, articlePage, notFoundPage, SITE };
