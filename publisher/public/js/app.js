const $ = (id) => document.getElementById(id);
const api = async (path, body) => {
  const opts = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
  const r = await fetch(path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error || data));
  return data;
};

// Esquema de campos por plantilla (debe casar con src/templates/index.js)
const TEMPLATE_FIELDS = {
  'ig-quote': [
    { key: 'subtitle', label: 'Eyebrow / categoria' },
    { key: 'title', label: 'Frase principal', textarea: true },
    { key: 'author', label: 'Autor / firma' }
  ],
  'ig-tip': [
    { key: 'brand', label: 'Marca' },
    { key: 'title', label: 'Titulo' },
    { key: 'items', label: 'Items (uno por linea, max 5)', textarea: true, list: true }
  ],
  'ig-promo': [
    { key: 'brand', label: 'Marca' },
    { key: 'title', label: 'Titulo principal' },
    { key: 'subtitle', label: 'Subtitulo' },
    { key: 'cta', label: 'CTA del boton' }
  ],
  'li-cover': [
    { key: 'title', label: 'Titulo del articulo' },
    { key: 'subtitle', label: 'Subtitulo' },
    { key: 'author', label: 'Autor / firma' }
  ]
};

const buildFields = (containerId, templateKey) => {
  const fields = TEMPLATE_FIELDS[templateKey] || [];
  const container = $(containerId);
  container.innerHTML = '';
  for (const f of fields) {
    const label = document.createElement('label');
    label.textContent = f.label;
    const el = document.createElement(f.textarea ? 'textarea' : 'input');
    el.id = `${containerId}-${f.key}`;
    if (f.textarea) el.rows = f.list ? 5 : 3;
    container.appendChild(label);
    container.appendChild(el);
  }
};

const readFields = (containerId, templateKey) => {
  const fields = TEMPLATE_FIELDS[templateKey] || [];
  const out = {};
  for (const f of fields) {
    const el = $(`${containerId}-${f.key}`);
    let v = el?.value || '';
    if (f.list) v = v.split('\n').map((s) => s.trim()).filter(Boolean);
    out[f.key] = v;
  }
  return out;
};

const writeFields = (containerId, templateKey, values) => {
  const fields = TEMPLATE_FIELDS[templateKey] || [];
  for (const f of fields) {
    const el = $(`${containerId}-${f.key}`);
    if (!el) continue;
    const v = values[f.key];
    el.value = Array.isArray(v) ? v.join('\n') : v ?? '';
  }
};

const log = (id, msg, kind = '') => {
  const el = $(id);
  el.className = 'log ' + kind;
  el.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
};

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    $(`tab-${t.dataset.tab}`).classList.add('active');
  })
);

// ---------- Status pills ----------
async function loadStatus() {
  try {
    const s = await fetch('/auth/status').then((r) => r.json());
    document.querySelectorAll('#status .pill').forEach((p) => {
      const k = p.dataset.key;
      p.classList.remove('ok', 'err');
      p.classList.add(s[k] ? 'ok' : 'err');
      p.title = s[k] ? 'Configurado' : 'Falta configurar';
    });
  } catch {}
}

// ---------- Cargar plantillas en selects ----------
async function loadTemplates() {
  const { templates } = await fetch('/api/generate/templates').then((r) => r.json());
  const igSelect = $('ig-template');
  const liSelect = $('li-template');
  igSelect.innerHTML = '';
  liSelect.innerHTML = '';
  for (const t of templates) {
    if (t.key.startsWith('ig-')) igSelect.appendChild(new Option(`${t.name} (${t.size})`, t.key));
    if (t.key.startsWith('li-')) liSelect.appendChild(new Option(`${t.name} (${t.size})`, t.key));
  }
  buildFields('ig-fields', igSelect.value);
  buildFields('li-fields', liSelect.value);
  igSelect.addEventListener('change', () => buildFields('ig-fields', igSelect.value));
  liSelect.addEventListener('change', () => buildFields('li-fields', liSelect.value));
}

// ---------- Instagram handlers ----------
let igLastImageId = null;

$('ig-brief-btn').addEventListener('click', async () => {
  const btn = $('ig-brief-btn');
  btn.disabled = true;
  try {
    const tpl = $('ig-template').value;
    const brief = await api('/api/generate/brief', {
      topic: $('ig-topic').value,
      audience: $('ig-audience').value,
      templateKey: tpl
    });
    writeFields('ig-fields', tpl, brief.brief || {});
    log('ig-log', 'Brief sugerido por Claude aplicado a los campos.', 'ok');
  } catch (e) {
    log('ig-log', e.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

$('ig-render-btn').addEventListener('click', async () => {
  const btn = $('ig-render-btn');
  btn.disabled = true;
  try {
    const tpl = $('ig-template').value;
    const params = readFields('ig-fields', tpl);
    const { url, id } = await api('/api/generate/image', { template: tpl, params });
    $('ig-preview').src = url + '?t=' + Date.now();
    igLastImageId = id;
    log('ig-log', `Imagen generada: ${id}`, 'ok');
  } catch (e) {
    log('ig-log', e.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

$('ig-caption-btn').addEventListener('click', async () => {
  const btn = $('ig-caption-btn');
  btn.disabled = true;
  try {
    const { text } = await api('/api/generate/caption', {
      topic: $('ig-topic').value,
      audience: $('ig-audience').value,
      goal: $('ig-goal').value
    });
    $('ig-caption').value = text;
    log('ig-log', 'Caption generado.', 'ok');
  } catch (e) {
    log('ig-log', e.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

$('ig-publish-btn').addEventListener('click', async () => {
  if (!igLastImageId) return log('ig-log', 'Primero genera una imagen.', 'err');
  const caption = $('ig-caption').value.trim();
  if (!caption) return log('ig-log', 'El caption esta vacio.', 'err');
  if (!confirm('Publicar este post en Instagram?')) return;
  const btn = $('ig-publish-btn');
  btn.disabled = true;
  try {
    const r = await api('/api/publish/instagram', { imageId: igLastImageId, caption });
    log('ig-log', r, 'ok');
  } catch (e) {
    log('ig-log', e.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

// ---------- LinkedIn handlers ----------
let liLastImageId = null;

$('li-article-btn').addEventListener('click', async () => {
  const btn = $('li-article-btn');
  btn.disabled = true;
  try {
    const { text } = await api('/api/generate/article', {
      topic: $('li-topic').value,
      audience: $('li-audience').value,
      goal: $('li-goal').value,
      lengthWords: Number($('li-length').value) || 600
    });
    $('li-article').value = text;
    log('li-log', 'Articulo generado.', 'ok');
  } catch (e) {
    log('li-log', e.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

$('li-render-btn').addEventListener('click', async () => {
  const btn = $('li-render-btn');
  btn.disabled = true;
  try {
    const tpl = $('li-template').value;
    const params = readFields('li-fields', tpl);
    const { url, id } = await api('/api/generate/image', { template: tpl, params });
    $('li-preview').src = url + '?t=' + Date.now();
    liLastImageId = id;
    log('li-log', `Portada generada: ${id}`, 'ok');
  } catch (e) {
    log('li-log', e.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

$('li-publish-btn').addEventListener('click', async () => {
  const text = $('li-article').value.trim();
  if (!text) return log('li-log', 'El articulo esta vacio.', 'err');
  if (!confirm('Publicar este articulo en LinkedIn?')) return;
  const btn = $('li-publish-btn');
  btn.disabled = true;
  try {
    const r = await api('/api/publish/linkedin', { text, imageId: liLastImageId });
    log('li-log', r, 'ok');
  } catch (e) {
    log('li-log', e.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

// ---------- Init ----------
loadStatus();
loadTemplates();
