/* Graba video.html?grabar=1 y anota cuándo empieza cada escena (marcas.json) */
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const SP = process.env.TMP_VIDEO || require('path').resolve(__dirname, 'tmp'), fs = require('fs');
(async () => {
  fs.rmSync(SP + '/rec', { recursive: true, force: true });
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: SP + '/rec', size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage(); const t0 = Date.now(); const marcas = []; let fin = null; const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { const t = m.text(); const k = t.match(/^ESCENA (\d+) (\S+)/); if (k) marcas.push({ i: +k[1], id: k[2], t: (Date.now() - t0) / 1000 }); if (t === 'FIN') fin = (Date.now() - t0) / 1000; });
  await p.goto((process.env.URL || 'http://localhost:8765') + '/video.html?grabar=1');
  const lim = Date.now() + 9 * 60e3; while (fin == null && Date.now() < lim) await new Promise(r => setTimeout(r, 500));
  await new Promise(r => setTimeout(r, 2500)); const total = (Date.now() - t0) / 1000;
  await ctx.close(); await b.close();
  const vid = fs.readdirSync(SP + '/rec').find(f => f.endsWith('.webm'));
  fs.writeFileSync(SP + '/marcas.json', JSON.stringify({ marcas, fin, total, video: SP + '/rec/' + vid, errs }, null, 1));
  console.log('escenas', marcas.length, 'fin', fin, 'total', total, 'errores', errs.length);
})();
