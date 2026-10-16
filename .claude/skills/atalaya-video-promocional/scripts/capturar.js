#!/usr/bin/env node
/* Capturas nítidas de la aplicación para el vídeo promocional.
   Uso: node capturar.js <capturas.json> <carpeta-salida>
   - Abre la aplicación (por defecto http://localhost:8765), crea una cuenta de demostración, activa la empresa modelo
     con todos sus mundos conectados (vista del plan Consultora) y oculta lo que distrae (asistente, pestaña del manual, avisos).
   - Cada captura se hace a 1920×1080 con densidad 2 (PNG de 3840×2160) para poder acercar la imagen sin perder nitidez.
   - Guarda <id>.png y un capturas.manifest.json con el rectángulo (en px CSS de 1920×1080) de cada «marca»
     (selector CSS) para encuadrar después los zooms. Las marcas que no aparezcan quedan como null.
   Formato de capturas.json: ver references/planos.md. */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

(async () => {
  const [conf, out] = process.argv.slice(2);
  if (!conf || !out) { console.error('Uso: node capturar.js <capturas.json> <carpeta-salida>'); process.exit(1); }
  const C = JSON.parse(fs.readFileSync(conf, 'utf8'));
  const APP = (C.app || 'http://localhost:8765').replace(/\/$/, '');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: C.densidad || 2, locale: 'es-ES' });
  const p = await ctx.newPage(); const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));

  // Cuenta de demostración (modo local de la aplicación) y empresa modelo con todo conectado
  await p.goto(APP + '/acceso.html#alta-consultora'); await p.waitForTimeout(600);
  await p.fill('#upName', C.nombre || 'Dirección'); await p.fill('#upEmail', 'promo' + Date.now() + '@ejemplo.es');
  await p.fill('#upPass', 'promo-' + Date.now()); await p.check('#upOk'); await p.click('#fUp button[type=submit]'); await p.waitForTimeout(2200);
  await p.goto(APP + '/portal.html'); await p.waitForTimeout(1500);
  await p.evaluate((plan) => {
    const P = window.Atalaya.platform, c = P.modelo.cfg(); c.plan = plan; Object.keys(c.con).forEach((k) => { c.con[k] = true; }); P.modelo.guardarCfg(c);
    localStorage.setItem('atalaya.empresa.activa', JSON.stringify(P.modelo.ID)); sessionStorage.setItem('atalaya.ruta.intro', '1'); sessionStorage.setItem('atalaya.emp.elegida', 'modelo');
  }, C.planVista || 'consultora');

  const OCULTAR = ['.assistant', '.ml-wrap', '.toast', '#paseo', '.iv-fab'].concat(C.ocultar || []);
  const manifest = { app: APP, ancho: 1920, alto: 1080, densidad: C.densidad || 2, capturas: {} };
  for (const k of C.capturas) {
    await p.goto(APP + '/' + k.url, { waitUntil: 'load' });
    await p.addStyleTag({ content: OCULTAR.join(',') + '{display:none!important}' + (C.css || '') + (k.css || '') });
    await p.waitForTimeout(k.esperar || 3000);
    for (const a of k.acciones || []) {
      try {
        if (a.click) await p.click(a.click, { timeout: 4000 });
        if (a.eval) await p.evaluate(a.eval);
        if (a.scroll) await p.evaluate((s) => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'start' }); }, a.scroll);
        if (a.scrollY != null) await p.evaluate((y) => window.scrollTo(0, y), a.scrollY);
        // Desplaza hasta el elemento más pequeño que contiene ese texto y lo deja a la altura indicada (0 arriba, 0.5 centro)
        if (a.scrollTexto) await p.evaluate(([t, alto]) => { let best = null, area = Infinity; t = t.toLowerCase(); document.querySelectorAll('body *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || !(e.textContent || '').toLowerCase().includes(t)) return; const ar = r.width * r.height; if (ar < area) { area = ar; best = e; } }); if (best) { const r = best.getBoundingClientRect(); window.scrollBy(0, r.top - innerHeight * alto); } }, [a.scrollTexto, a.altura == null ? 0.18 : a.altura]);
        await p.waitForTimeout(a.esperar || 700);
      } catch (e) { console.warn(`  ${k.id}: acción sin efecto (${e.message.split('\n')[0]})`); }
    }
    await p.addStyleTag({ content: OCULTAR.join(',') + '{display:none!important}' });
    // Una marca es un selector CSS o {texto, subir}: el elemento visible más pequeño que contiene ese texto, subiendo
    // «subir» niveles para coger la tarjeta entera. Así se encuadra sin conocer el CSS de cada pantalla.
    const marcas = await p.evaluate((M) => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
      const busca = (m) => {
        if (typeof m === 'string') return document.querySelector(m);
        const t = m.texto.toLowerCase(); let best = null, area = Infinity;
        document.querySelectorAll('body *').forEach((e) => { if (!vis(e) || !(e.textContent || '').toLowerCase().includes(t)) return; const r = e.getBoundingClientRect(), a = r.width * r.height; if (a < area) { area = a; best = e; } });
        for (let i = 0; best && i < (m.subir || 0); i++) best = best.parentElement;
        return best;
      };
      const o = {}; Object.keys(M || {}).forEach((n) => { const e = busca(M[n]); if (!e) { o[n] = null; return; } const r = e.getBoundingClientRect(); o[n] = r.width && r.height ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null; }); return o;
    }, k.marcas || {});
    const f = path.join(out, k.id + '.png'); await p.screenshot({ path: f });
    manifest.capturas[k.id] = { archivo: k.id + '.png', url: k.url, marcas };
    console.log('✓', k.id, Object.entries(marcas).map(([n, r]) => n + (r ? '' : ' (no encontrada)')).join(', '));
  }
  fs.writeFileSync(path.join(out, 'capturas.manifest.json'), JSON.stringify(manifest, null, 1));
  if (errores.length) console.warn('Errores de página:', errores.slice(0, 5));
  await b.close();
})();
