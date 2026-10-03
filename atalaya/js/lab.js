/* Atalaya 360° · Página comercial: laboratorio de escenarios
   Fragmentos de módulos reales sobre la misma empresa de ejemplo (una industria de 4,2 M€ de ventas):
   inversión (el motor completo, en site.js), Lean, impuestos, mercado y «todo a la vez», donde las palancas
   de varias áreas mueven la misma cuenta. Los cálculos de estos fragmentos son orientativos. */
(function () {
  const A = window.Atalaya, F = A.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const host = $('#lab'); if (!host) return;
  const nf = { format: (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') };
  const pct = (v, d) => (v * 100).toFixed(d == null ? 1 : d).replace('.', ',') + ' %';

  // La empresa de ejemplo, común a todos los escenarios
  const E = { ventas: 4200000, margenBruto: 0.38, personal: 1100000, personalPlanta: 620000, plantilla: 34, otrosFijos: 260000, caja: 380000, servicioDeuda: 120000, dso: 75 };
  E.costeVentas = E.ventas * (1 - E.margenBruto);
  E.ebitda = E.ventas * E.margenBruto - E.personal - E.otrosFijos;

  /* ---------- Gráficos sencillos (SVG) ---------- */
  const W = 640;
  function barras(items, opts) {
    opts = opts || {}; const H = opts.h || 200, m = { l: 8, r: 8, t: 22, b: 34 };
    const max = Math.max(...items.map((x) => Math.abs(x.v)), 1), bw = (W - m.l - m.r) / items.length;
    const base = opts.cero ? m.t + (H - m.t - m.b) * (max / (2 * max)) : H - m.b;
    let g = `<line x1="${m.l}" x2="${W - m.r}" y1="${base}" y2="${base}" class="lab-axis"/>`;
    items.forEach((x, i) => {
      const h = (Math.abs(x.v) / max) * (opts.cero ? (H - m.t - m.b) / 2 : H - m.t - m.b), X = m.l + i * bw + bw * 0.18, w = bw * 0.64;
      const y = x.v >= 0 ? base - h : base;
      g += `<rect x="${X}" y="${y}" width="${w}" height="${Math.max(1, h)}" rx="2" fill="${x.c}"/>`;
      g += `<text x="${X + w / 2}" y="${x.v >= 0 ? y - 6 : y + h + 13}" text-anchor="middle" class="lab-val">${esc(x.t || F.eur(x.v))}</text>`;
      g += `<text x="${X + w / 2}" y="${H - 12}" text-anchor="middle" class="lab-lbl">${esc(x.n)}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || 'Gráfico')}">${g}</svg>`;
  }
  function linea(data, opts) {
    opts = opts || {}; const H = opts.h || 200, m = { l: 56, r: 10, t: 12, b: 26 };
    const mx = Math.max(...data, 0), mn = Math.min(...data, 0), X = (i) => m.l + (i / (data.length - 1)) * (W - m.l - m.r), Y = (v) => m.t + (1 - (v - mn) / (mx - mn || 1)) * (H - m.t - m.b);
    const pts = data.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    let g = `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" class="lab-axis"/>`;
    [mn, mx].forEach((v) => { g += `<text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end" class="lab-lbl">${esc(F.eur(v))}</text>`; });
    g += `<polygon points="${m.l},${Y(0)} ${pts} ${W - m.r},${Y(0)}" fill="${opts.c || css('--gold')}" opacity="0.1"/><polyline points="${pts}" fill="none" stroke="${opts.c || css('--gold')}" stroke-width="2.4" stroke-linejoin="round"/>`;
    if (opts.marca != null && opts.marca >= 0) { const x = X(opts.marca); g += `<line x1="${x}" x2="${x}" y1="${m.t}" y2="${H - m.b}" class="lab-mark"/><text x="${x + 6}" y="${m.t + 12}" class="lab-val">${esc(opts.marcaTxt || '')}</text>`; }
    (opts.ticks || []).forEach(([i, t]) => { g += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" class="lab-lbl">${esc(t)}</text>`; });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || 'Evolución')}">${g}</svg>`;
  }
  function apilada(filas, opts) {
    opts = opts || {}; const H = 30 + filas.length * 46;
    let g = '';
    filas.forEach((f, k) => {
      const tot = f.partes.reduce((a, p) => a + p.v, 0) || 1; let x = 120; const y = 14 + k * 46, w = W - 130;
      g += `<text x="0" y="${y + 18}" class="lab-lbl" style="text-anchor:start">${esc(f.n)}</text>`;
      f.partes.forEach((p) => { const pw = (p.v / tot) * w; g += `<rect x="${x}" y="${y}" width="${Math.max(0, pw)}" height="26" fill="${p.c}"/>`; if (pw > 64) g += `<text x="${x + 8}" y="${y + 17}" class="lab-in">${esc(p.t)}</text>`; x += pw; });
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || 'Reparto del tiempo')}">${g}</svg>`;
  }

  /* ---------- Escenarios ---------- */
  const ESC = {
    lean: {
      nombre: 'Lean', modulo: 'Sistema estratégico · Lean y gestor de tiempos',
      intro: 'Cuánto tiempo de planta se va en esperas, búsquedas y retrabajos, y qué capacidad libera eliminar una parte sin contratar a nadie.',
      palancas: [
        { k: 'n', l: 'Personas en planta', min: 8, max: 60, step: 1, v: 22, f: (v) => v },
        { k: 'pd', l: 'Tiempo perdido en esperas y retrabajos', min: 5, max: 40, step: 1, v: 24, f: (v) => v + ' %' },
        { k: 'el', l: 'Parte que se elimina', min: 0, max: 80, step: 5, v: 40, f: (v) => v + ' %' },
        { k: 'ch', l: 'Coste hora cargado', min: 16, max: 40, step: 1, v: 24, f: (v) => v + ' €' }
      ],
      calc(p) {
        const horas = p.n * 1720, perd = horas * p.pd / 100, lib = perd * p.el / 100, val = lib * p.ch, eq = lib / 1720;
        const st = p.el >= 30 ? 'go' : p.el >= 15 ? 'warn' : 'stop';
        return {
          kpis: [['Horas liberadas al año', nf.format(lib) + ' h', 'capacidad recuperada'], ['Valor de esas horas', F.eur(val), 'al año'], ['Personas equivalentes', eq.toFixed(1).replace('.', ','), 'sin contratar'], ['Tiempo perdido después', pct((perd - lib) / horas), 'antes ' + p.pd + ' %']],
          veredicto: [st, st === 'go' ? 'Capacidad para crecer sin contratar' : st === 'warn' ? 'Mejora visible, aún corta' : 'El desperdicio sigue intacto', `Eliminar el ${p.el} % de lo perdido libera ${nf.format(lib)} horas: el trabajo de ${eq.toFixed(1).replace('.', ',')} personas que ya están en la plantilla.`],
          grafico: apilada([
            { n: 'Hoy', partes: [{ v: horas - perd, c: css('--s3'), t: 'Valor añadido' }, { v: perd * 0.6, c: css('--warn'), t: 'Esperas' }, { v: perd * 0.4, c: css('--stop'), t: 'Retrabajo' }] },
            { n: 'Después', partes: [{ v: horas - perd, c: css('--s3'), t: 'Valor añadido' }, { v: lib, c: css('--gold'), t: 'Capacidad liberada' }, { v: (perd - lib) * 0.6, c: css('--warn'), t: 'Esperas' }, { v: (perd - lib) * 0.4, c: css('--stop'), t: 'Retrabajo' }] }
          ], { aria: 'Reparto del tiempo de planta antes y después' }),
          pie: 'Horas de planta al año, con 1.720 horas por persona.'
        };
      }
    },
    imp: {
      nombre: 'Impuestos', modulo: 'Sistema estratégico · Impuestos',
      intro: 'Cuánto se paga del Impuesto sobre Sociedades, qué ahorra dejar beneficio en la empresa y en qué meses sale el dinero de la caja.',
      palancas: [
        { k: 'b', l: 'Beneficio antes de impuestos', min: 50000, max: 1500000, step: 10000, v: 420000, f: (v) => F.eur(v) },
        { k: 't', l: 'Tipo del impuesto', min: 15, max: 25, step: 1, v: 25, f: (v) => v + ' %' },
        { k: 'r', l: 'Beneficio que se queda en la empresa', min: 0, max: 100, step: 5, v: 60, f: (v) => v + ' %' }
      ],
      calc(p) {
        const red = Math.min(p.b * 0.2, p.b * p.r / 100 * 0.2), base = p.b - red, cuota = base * p.t / 100, sin = p.b * p.t / 100, ahorro = sin - cuota;
        const pf = cuota * 0.18, julio = cuota - pf * 3, mayor = Math.max(pf, julio);
        return {
          kpis: [['Cuota del impuesto', F.eur(cuota), 'tipo efectivo ' + pct(cuota / p.b)], ['Ahorro por reserva de capitalización', F.eur(ahorro), 'por dejar beneficio dentro'], ['Pago fraccionado', F.eur(pf), 'abril, octubre y diciembre'], ['Mayor salida de caja', F.eur(mayor), julio >= pf ? 'en julio' : 'en un pago fraccionado']],
          veredicto: [ahorro > 0 ? 'go' : 'warn', ahorro > 0 ? 'Impuesto previsto y planificado' : 'Sin reserva de capitalización', `Dejar el ${p.r} % del beneficio en la empresa reduce la base hasta un 20 % y ahorra ${F.eur(ahorro)}. Los cuatro pagos del año ya están en la tesorería.`],
          grafico: barras([{ n: 'Abril', v: pf, c: css('--s1') }, { n: 'Julio', v: julio, c: css('--gold') }, { n: 'Octubre', v: pf, c: css('--s1') }, { n: 'Diciembre', v: pf, c: css('--s1') }], { aria: 'Salidas de caja por el impuesto' }),
          pie: 'Estimación orientativa: reserva de capitalización del 20 % del beneficio retenido, con el límite del 20 % de la base, y pagos fraccionados del 18 % sobre la cuota. Valídelo con su asesor fiscal.'
        };
      }
    },
    mer: {
      nombre: 'Mercado', modulo: 'Sistema estratégico · Mercado y expansión territorial',
      intro: 'Antes de abrir una zona nueva: qué ventas son razonables con la competencia que hay, cuánto cuesta entrar y en qué mes se recupera.',
      palancas: [
        { k: 'mk', l: 'Tamaño del mercado en la zona', min: 1000000, max: 20000000, step: 250000, v: 8000000, f: (v) => F.eur(v) },
        { k: 'cu', l: 'Cuota que espera alcanzar en 3 años', min: 1, max: 25, step: 1, v: 12, f: (v) => v + ' %' },
        { k: 'co', l: 'Competidores relevantes', min: 1, max: 12, step: 1, v: 5, f: (v) => v },
        { k: 'en', l: 'Coste de entrada', min: 50000, max: 600000, step: 10000, v: 180000, f: (v) => F.eur(v) },
        { k: 'fi', l: 'Gasto fijo anual de la zona', min: 40000, max: 400000, step: 10000, v: 100000, f: (v) => F.eur(v) }
      ],
      calc(p) {
        const cap = 1 / (p.co + 1), cuota = Math.min(p.cu / 100, cap * 1.2), v3 = p.mk * cuota, mc = 0.32;
        const acc = [-p.en]; let rec = -1;
        for (let m = 1; m <= 48; m++) { const ramp = Math.min(1, m / 24); const c = (v3 / 12) * ramp * mc - p.fi / 12; acc.push(acc[m - 1] + c); if (rec < 0 && acc[m] >= 0) rec = m; }
        const real = p.cu / 100 > cap * 1.2;
        const st = rec > 0 && rec <= 30 && !real ? 'go' : rec > 0 && rec <= 48 ? 'warn' : 'stop';
        return {
          kpis: [['Ventas en el año 3', F.eur(v3), 'cuota ' + pct(cuota)], ['Cuota razonable', pct(cap, 0), `con ${p.co} competidores`], ['Contribución anual', F.eur(v3 * mc - p.fi), 'tras el gasto fijo'], ['Recuperación', rec > 0 ? `mes ${rec}` : 'más de 48 meses', 'del coste de entrada']],
          veredicto: [st, st === 'go' ? 'La zona se paga sola' : st === 'warn' ? 'Viable, con recuperación lenta' : 'No se recupera en cuatro años', real ? `Una cuota del ${p.cu} % es optimista con ${p.co} competidores: el cálculo la limita a ${pct(cuota, 0)}.` : `Con una cuota del ${p.cu} %, la zona aporta ${F.eur(v3 * mc - p.fi)} al año desde el tercer año.`],
          grafico: linea(acc, { aria: 'Caja acumulada de la zona', marca: rec, marcaTxt: rec > 0 ? 'recuperada' : '', ticks: [[0, 'Mes 0'], [12, '12'], [24, '24'], [36, '36'], [48, '48']] }),
          pie: 'Caja acumulada de la zona, mes a mes. Margen de contribución del 32 % y arranque progresivo hasta el mes 24.'
        };
      }
    },
    eco: {
      nombre: 'Todo a la vez', modulo: 'Los tres mundos sobre la misma cuenta',
      intro: 'Una palanca de cada área sobre la misma empresa. Ninguna decide sola: cobrar antes libera caja, el precio y el Lean mueven el margen, y la rotación lo consume.',
      palancas: [
        { k: 'dso', l: 'Finanzas · días que tardan en pagarle', min: 30, max: 120, step: 5, v: 75, f: (v) => v + ' días' },
        { k: 'pr', l: 'Comercial · subida media de precio', min: -5, max: 8, step: 0.5, v: 0, f: (v) => (v > 0 ? '+' : '') + String(v).replace('.', ',') + ' %' },
        { k: 'le', l: 'Operaciones · esperas y retrabajos eliminados', min: 0, max: 60, step: 5, v: 0, f: (v) => v + ' %' },
        { k: 'ro', l: 'Personas · rotación anual', min: 2, max: 25, step: 1, v: 12, f: (v) => v + ' %' }
      ],
      calc(p) {
        const precio = E.ventas * p.pr / 100, lean = E.personalPlanta * 0.24 * p.le / 100, rot = (p.ro - 12) / 100 * E.plantilla * 17500;
        const ebitda = E.ebitda + precio + lean - rot, ventas = E.ventas + precio;
        const circ = ventas * (E.dso - p.dso) / 365, caja12 = E.caja + ebitda * 0.75 - E.servicioDeuda + circ;
        const mg = ebitda / ventas;
        const L = [['Margen EBITDA', pct(mg), mg >= 0.1 ? 'ok' : mg >= 0.06 ? 'warn' : 'stop'], ['Caja a 12 meses', F.eur(caja12), caja12 >= 500000 ? 'ok' : caja12 >= 250000 ? 'warn' : 'stop'], ['Días de cobro', p.dso + ' días', p.dso <= 60 ? 'ok' : p.dso <= 90 ? 'warn' : 'stop'], ['Rotación', p.ro + ' %', p.ro <= 8 ? 'ok' : p.ro <= 14 ? 'warn' : 'stop']];
        const rojos = L.filter((x) => x[2] === 'stop').length, verdes = L.filter((x) => x[2] === 'ok').length;
        return {
          kpis: [['EBITDA', F.eur(ebitda), 'antes ' + F.eur(E.ebitda)], ['Caja a 12 meses', F.eur(caja12), 'tras el servicio de la deuda'], ['Valor de la empresa', F.eur(ebitda * 6), '6 veces el EBITDA'], ['Circulante liberado', F.eur(circ), 'por cobrar antes']],
          veredicto: [rojos ? 'stop' : verdes >= 3 ? 'go' : 'warn', rojos ? `${rojos} indicador${rojos > 1 ? 'es' : ''} en rojo` : verdes >= 3 ? 'La empresa entera mejora a la vez' : 'Mejora parcial', `El valor de la empresa pasa de ${F.eur(E.ebitda * 6)} a ${F.eur(ebitda * 6)}. Así se lee en Atalaya 360°: una decisión en un área se ve en todas las demás.`],
          luces: L,
          grafico: barras([{ n: 'EBITDA hoy', v: E.ebitda, c: css('--muted') }, { n: 'Precio', v: precio, c: css('--s1') }, { n: 'Lean', v: lean, c: css('--s3') }, { n: 'Rotación', v: -rot, c: rot > 0 ? css('--stop') : css('--go') }, { n: 'EBITDA nuevo', v: ebitda, c: css('--gold') }], { cero: true, h: 230, aria: 'De dónde sale el nuevo EBITDA' }),
          pie: 'De dónde sale el nuevo EBITDA. Rotación: cada salida cuesta la mitad de un salario medio de 35.000 €.'
        };
      }
    }
  };

  /* ---------- Pestañas y paneles ---------- */
  const tabs = $('#labTabs');
  function panel(k) {
    const S = ESC[k], el = $(`.lab-panel[data-panel="${k}"]`);
    if (el.dataset.ok) return;
    el.dataset.ok = '1';
    el.innerHTML = `<div class="lp-demo glass lab-demo">
      <div class="lp-controls"><p class="lab-mod">${esc(S.modulo)}</p><p class="small muted lab-intro">${esc(S.intro)}</p>
        ${S.palancas.map((x) => `<div class="field"><div class="top"><label for="lab_${k}_${x.k}">${esc(x.l)}</label><span class="num" data-v="${x.k}"></span></div><input type="range" id="lab_${k}_${x.k}" data-k="${x.k}" min="${x.min}" max="${x.max}" step="${x.step}" value="${x.v}"></div>`).join('')}
        <div class="lp-verdict" data-veredicto></div></div>
      <div class="lp-out"><div class="lp-kpis" data-kpis></div><div class="lp-chartbox lab-chart" data-grafico></div><div class="lp-lights lab-lights" data-luces hidden></div><p class="small muted" data-pie></p></div></div>`;
    const draw = () => {
      const p = {}; $$('input[type=range]', el).forEach((r) => { p[r.dataset.k] = +r.value; r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%'); });
      S.palancas.forEach((x) => { $(`[data-v="${x.k}"]`, el).textContent = x.f(p[x.k]); });
      const o = S.calc(p);
      $('[data-kpis]', el).innerHTML = o.kpis.map(([t, v, d]) => `<div><span>${esc(t)}</span><b>${esc(v)}</b><small>${esc(d)}</small></div>`).join('');
      const [st, ti, tx] = o.veredicto;
      $('[data-veredicto]', el).innerHTML = `<span class="lp-vlbl">Lectura</span><div class="verdict-pill v-${st}"><span class="dot"></span>${esc(ti)}</div><p class="small muted">${esc(tx)}</p>`;
      $('[data-grafico]', el).innerHTML = o.grafico;
      const lu = $('[data-luces]', el); lu.hidden = !o.luces;
      if (o.luces) lu.innerHTML = o.luces.map(([n, v, s]) => `<div class="lp-light ${s}"><i></i><span>${esc(n)}</span><b>${esc(v)}</b></div>`).join('');
      $('[data-pie]', el).textContent = o.pie;
    };
    $$('input[type=range]', el).forEach((r) => r.addEventListener('input', draw));
    draw();
  }
  function elegir(k) {
    $$('button', tabs).forEach((b) => b.setAttribute('aria-selected', b.dataset.lab === k));
    $$('.lab-panel', host).forEach((p) => { p.hidden = p.dataset.panel !== k; });
    if (ESC[k]) panel(k);
  }
  $$('button', tabs).forEach((b) => b.addEventListener('click', () => elegir(b.dataset.lab)));
  elegir('inv');
})();
