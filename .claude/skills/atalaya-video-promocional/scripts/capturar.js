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

// Reloj virtual de la página: performance.now, Date.now, requestAnimationFrame y setTimeout/setInterval avanzan a
// «ritmo» × el tiempo real. window.__ritmo(r) lo cambia sin saltos; window.__vt() da el instante virtual en ms.
const RELOJ = () => {
  const rn = performance.now.bind(performance), rd = Date.now, d0 = rd() - rn();
  let ritmo = 1, rb = rn(), vb = rb;
  const vt = () => vb + (rn() - rb) * ritmo;
  window.__ritmo = (r) => { vb = vt(); rb = rn(); ritmo = r; };
  window.__vt = vt;
  performance.now = vt; Date.now = () => Math.round(d0 + vt());
  const raf = window.requestAnimationFrame.bind(window), st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => cb(vt()));
  window.setTimeout = (cb, d, ...x) => st(cb, (d || 0) / ritmo, ...x);
  window.setInterval = (cb, d, ...x) => si(cb, (d || 0) / ritmo, ...x);
};

(async () => {
  const [conf, out] = process.argv.slice(2);
  if (!conf || !out) { console.error('Uso: node capturar.js <capturas.json> <carpeta-salida>'); process.exit(1); }
  const C = JSON.parse(fs.readFileSync(conf, 'utf8'));
  const APP = (C.app || 'http://localhost:8765').replace(/\/$/, '');
  fs.mkdirSync(out, { recursive: true });
  // WebGL por software (SwiftShader) para las escenas 3D; se ignoran los errores de certificado porque, tras un proxy,
  // la librería 3D que se carga de la CDN no llega y los planetas no se dibujan.
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: C.densidad || 2, locale: 'es-ES', ignoreHTTPSErrors: true });
  const p = await ctx.newPage(); const errores = []; let clipCtx = null;
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
    if (k.clip) manifest.capturas[k.id].clip = await grabarClip(k, OCULTAR);
    console.log('✓', k.id, Object.entries(marcas).map(([n, r]) => n + (r ? '' : ' (no encontrada)')).join(', '));
  }
  /* ---------- Clips: la pantalla en movimiento ----------
     Los planetas, los abanicos que se elevan al pasar el ratón… se graban fotograma a fotograma a cámara lenta:
     el reloj de la página (performance.now, Date.now, requestAnimationFrame, setTimeout) y las animaciones CSS
     corren a «lento» × la velocidad real, y cada captura se fecha con ese reloj virtual. Así, aunque el 3D por
     software dibuje pocos fotogramas por segundo, el clip sale fluido a 30 fps y a velocidad natural.
     Se graba en un contexto aparte a densidad 1 (1920×1080) con la misma sesión. */
  async function grabarClip(k, OCULTAR) {
    const c = k.clip, fps = c.fps || 30, seg = c.segundos || 5, lento = c.lento || 0.12;
    const dir = path.join(out, k.id); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    if (!clipCtx) {
      clipCtx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: 'es-ES', ignoreHTTPSErrors: true, storageState: await ctx.storageState() });
      await clipCtx.addInitScript(RELOJ);
      await clipCtx.addInitScript(() => { try { ['atalaya.ruta.intro', 'atalaya.rutaest.intro', 'atalaya.rutaper.intro'].forEach((x) => sessionStorage.setItem(x, '1')); sessionStorage.setItem('atalaya.emp.elegida', 'modelo'); } catch (e) { /* sin almacenamiento */ } });
    }
    const q = await clipCtx.newPage(); const cdp = await clipCtx.newCDPSession(q); await cdp.send('Animation.enable');
    // Un clic que abre otra pantalla no debe sacarnos de la escena: la navegación recibe un 204 y la página se queda.
    // Solo se intercepta el origen de la aplicación: interceptar la CDN rompe la carga de la librería 3D tras el proxy.
    await q.route(APP + '/**', (r) => (r.request().isNavigationRequest() && r.request().frame() === q.mainFrame() && !r.request().url().includes(k.url.split('#')[0]) ? r.fulfill({ status: 204 }) : r.continue()));
    await q.goto(APP + '/' + k.url, { waitUntil: 'load' });
    await q.addStyleTag({ content: OCULTAR.join(',') + '{display:none!important}' + (C.css || '') + (k.css || '') });
    await q.waitForTimeout(k.esperar || 3000);
    for (const a of (c.antes || k.acciones || [])) { try { if (a.click) await q.click(a.click, { timeout: 4000 }); if (a.eval) await q.evaluate(a.eval); if (a.scroll) await q.evaluate((s) => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'start' }); }, a.scroll); if (a.scrollY != null) await q.evaluate((y) => window.scrollTo(0, y), a.scrollY); await q.waitForTimeout(a.esperar || 700); } catch (e) { console.warn(`  ${k.id}: acción previa sin efecto (${e.message.split('\n')[0]})`); } }
    await q.addStyleTag({ content: OCULTAR.join(',') + '{display:none!important}' });
    // Guion del clip: en el segundo t (de vídeo) se hace clic, se pasa por encima, se ejecuta código o se mueve el ratón
    const guion = (c.guion || []).map((g) => Object.assign({ hecho: false }, g)).sort((x, y) => x.t - y.t);
    const centro = async (sel) => { const r = await q.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, sel); return r; };
    await cdp.send('Animation.setPlaybackRate', { playbackRate: lento }); await q.evaluate((r) => window.__ritmo(r), lento);
    const v0 = await q.evaluate(() => window.__vt()); const muestras = []; let n = 0, raton = null;
    while (true) {
      const ta = (await q.evaluate(() => window.__vt()) - v0) / 1000;
      if (ta >= seg) break;
      for (const g of guion) {
        if (g.hecho || g.t > ta) continue; g.hecho = true;
        try {
          if (g.click) await q.click(g.click, { timeout: 3000, noWaitAfter: true });
          if (g.hover) { const m = await centro(g.hover); if (m) await q.mouse.move(m[0], m[1]); }
          if (g.eval) await q.evaluate(g.eval);
          if (g.raton) raton = { de: g.raton.de, a: g.raton.a, t0: g.t, d: g.raton.dur || 1 };
        } catch (e) { console.warn(`  ${k.id}: paso del guion en ${g.t} s sin efecto (${e.message.split('\n')[0]})`); }
      }
      // Recorrido del ratón: va de «de» a «a» en «dur» segundos de vídeo (pasa por encima de lo que encuentra)
      if (raton) { const kk = Math.min(1, (ta - raton.t0) / raton.d), e = kk < 0.5 ? 2 * kk * kk : 1 - Math.pow(-2 * kk + 2, 2) / 2; await q.mouse.move(raton.de[0] + (raton.a[0] - raton.de[0]) * e, raton.de[1] + (raton.a[1] - raton.de[1]) * e); if (kk >= 1) raton = null; }
      const buf = await q.screenshot({ type: 'jpeg', quality: 90 });
      const tb = (await q.evaluate(() => window.__vt()) - v0) / 1000;
      const f = path.join(dir, `m${String(n++).padStart(5, '0')}.jpg`); fs.writeFileSync(f, buf); muestras.push({ t: (ta + tb) / 2, f });
    }
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 }); await q.close();
    // Remuestreo a fps fijos: cada fotograma toma la muestra más cercana en el reloj virtual
    const N = Math.round(seg * fps); let j = 0;
    for (let i = 0; i < N; i++) {
      const t = i / fps; while (j < muestras.length - 1 && Math.abs(muestras[j + 1].t - t) <= Math.abs(muestras[j].t - t)) j++;
      fs.copyFileSync(muestras[j].f, path.join(dir, `f${String(i).padStart(4, '0')}.jpg`));
    }
    muestras.forEach((m) => fs.unlinkSync(m.f));
    const paso = seg / Math.max(1, muestras.length);
    console.log(`  clip ${k.id}: ${N} fotogramas a ${fps} fps de ${muestras.length} muestras (una cada ${(paso * 1000).toFixed(0)} ms de vídeo${paso > 1.5 / fps ? '; baje «lento» para más fluidez' : ''})`);
    return { carpeta: k.id, fotogramas: N, fps };
  }
  if (clipCtx) await clipCtx.close();

  fs.writeFileSync(path.join(out, 'capturas.manifest.json'), JSON.stringify(manifest, null, 1));
  if (errores.length) console.warn('Errores de página:', errores.slice(0, 5));
  await b.close();
})();
