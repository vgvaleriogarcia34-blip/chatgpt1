/* Atalaya 360° · Reproductor del vídeo de la empresa modelo
   Escenario fijo de 1280×720 que se escala a la pantalla. Cada escena dibuja su gráfico con las cifras del motor
   (js/video/guion.js), se narra con voz y lleva subtítulos.
   Voz: la grabada (media/video/*.mp3, generada a partir del mismo guion) si su texto coincide; si no, la del navegador;
   si tampoco hay, avanza con un tiempo calculado por las palabras.
   ?grabar=1 → sin controles ni sonido, con la duración de cada escena tomada de la voz grabada (para hacer el MP4). */
(function () {
  const A = window.Atalaya, V = A.videoModelo;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const Q = new URLSearchParams(location.search), GRABAR = Q.get('grabar') === '1';
  const stage = $('#vdStage'), bar = $('#vdBar'), wrap = $('#vdWrap');
  if (GRABAR) document.body.classList.add('vd-grabar');

  const R = V.calcular(), L = V.LEER;
  const LEER = V.guion(R, V.LEER), DECIR = V.guion(R, V.DECIR);
  const ESC = LEER.map((e, i) => Object.assign({}, e, { voz: DECIR[i].texto }));
  const hash = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  /* ---------- Escala del escenario ---------- */
  const W = 1280, H = 720;
  const ajustar = () => { const k = Math.min(innerWidth / W, (innerHeight - (GRABAR ? 0 : 76)) / H); stage.style.transform = `scale(${k})`; wrap.style.height = H * k + 'px'; wrap.style.width = W * k + 'px'; };
  addEventListener('resize', ajustar); ajustar();

  /* ---------- Gráfico de líneas (SVG) ---------- */
  const CW = 760, CH = 360, PX = 64, PY = 24;
  function grafico(dom) {
    const [lo, hi] = dom, y = (v) => PY + (CH - 2 * PY) * (1 - (v - lo) / (hi - lo)), x = (i) => PX + (CW - PX - 16) * i / 59;
    const path = (d) => d.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const ticks = []; const paso = (hi - lo) > 1.6e6 ? 500000 : 250000; for (let v = Math.ceil(lo / paso) * paso; v <= hi; v += paso) ticks.push(v);
    const fmtK = (v) => (Math.abs(v) >= 1e6 ? String(Math.round(v / 1e5) / 10).replace('.', ',') + ' M€' : Math.round(v / 1000) + ' k€');
    const svg = `<svg class="vd-chart" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="Liquidez mes a mes, 60 meses">
      <defs><clipPath id="vdBajo"><rect x="0" y="${y(0)}" width="${CW}" height="${CH}"/></clipPath></defs>
      <rect x="${PX}" y="${y(0)}" width="${CW - PX - 16}" height="${Math.max(0, CH - PY - y(0))}" class="vd-rojo"/>
      ${ticks.map((v) => `<line x1="${PX}" x2="${CW - 16}" y1="${y(v)}" y2="${y(v)}" class="vd-grid ${v === 0 ? 'cero' : ''}"/><text x="${PX - 8}" y="${y(v) + 4}" class="vd-ax" text-anchor="end">${fmtK(v)}</text>`).join('')}
      ${[0, 12, 24, 36, 48, 59].map((m) => `<text x="${x(m)}" y="${CH - 4}" class="vd-ax" text-anchor="middle">${m === 59 ? 'mes 60' : 'mes ' + (m + 1)}</text>`).join('')}
      <g class="vd-lines"></g><g class="vd-marks"></g></svg>`;
    return { svg, x, y, path, lo, hi };
  }
  // Una línea: aparece dibujándose; morph() la lleva a otra serie con una transición
  function linea(G, host, data, cls, opt) {
    opt = opt || {};
    const g = host.querySelector('.vd-lines');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', 'vd-l ' + (cls || '')); p.setAttribute('d', G.path(data)); g.appendChild(p);
    if (opt.dibujar) { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.getBoundingClientRect(); p.style.transition = `stroke-dashoffset ${opt.dibujar}ms ease-in-out`; p.style.strokeDashoffset = 0; }
    let cur = data.slice();
    p.morph = (to, ms) => new Promise((ok) => { const from = cur.slice(), t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / (ms || 1200)), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; cur = from.map((v, i) => v + (to[i] - v) * e); p.setAttribute('d', G.path(cur)); if (k < 1) requestAnimationFrame(step); else ok(); }; requestAnimationFrame(step); });
    return p;
  }
  function marca(G, host, mes, valor, txt, cls) {
    const g = host.querySelector('.vd-marks'), cx = G.x(mes - 1), cy = G.y(valor);
    g.insertAdjacentHTML('beforeend', `<g class="vd-mk ${cls || ''}"><circle cx="${cx}" cy="${cy}" r="6"/><text x="${Math.min(cx + 10, CW - 180)}" y="${cy + (valor < 0 ? 22 : -12)}">${esc(txt)}</text></g>`);
  }
  const dominio = (series) => { const all = series.flat(); const lo = Math.min(0, ...all), hi = Math.max(...all); const pad = (hi - lo) * 0.08; return [lo - pad, hi + pad]; };

  /* ---------- Piezas comunes ---------- */
  const mesN = (x) => 'mes ' + x;
  const kpi = (k, v, d, st) => `<div class="vd-kpi ${st || ''}"><span>${esc(k)}</span><b>${esc(v)}</b>${d ? `<small>${esc(d)}</small>` : ''}</div>`;
  const veredicto = (r) => `<span class="vd-ver ${r.veredicto}">${esc(r.veredictoT)}</span>`;
  const cue = (fr, fn) => { const t = setTimeout(fn, Math.max(0, fr * dur)); timers.push(t); };
  let dur = 10000, timers = [];

  /* ---------- Escenas ---------- */
  const K = R.K, E = R.esc, P = R.pasos, F = R.final;
  const domPal = dominio([E.base.serie, F.serie, ...P.map((d) => d.despues.serie)]);
  const VIS = {
    portada(h) {
      h.innerHTML = `<div class="vd-portada"><div class="vd-kick">Empresa modelo · datos ficticios</div><h1>Valdenorte</h1><p>Estructuras y montajes industriales · Asturias · desde 1996</p>
        <div class="vd-kpis">${kpi('Ventas 2025', L.meur(K.ventas))}${kpi('Personas', L.n(K.plantilla))}${kpi('Crecimiento anual', L.pct(K.cagr))}${kpi('Inversión prevista', L.meur(K.inversion))}</div></div>`;
    },
    historia(h) {
      const Hs = R.H, mx = Math.max(...Hs.map((a) => a.ventas)), bw = 90, base = 300, alto = 230, x = (i) => 80 + i * 140;
      const yv = (v) => base - alto * v / mx, ys = (v) => base - alto * v / 1.2e6;
      const lin = (k) => Hs.map((a, i) => (i ? 'L' : 'M') + (x(i) + bw / 2) + ' ' + ys(a[k])).join(' ');
      h.innerHTML = `<div class="vd-2col"><svg class="vd-chart" viewBox="0 0 760 360">
        ${Hs.map((a, i) => `<rect class="vd-bar-v" x="${x(i)}" y="${yv(a.ventas)}" width="${bw}" height="${base - yv(a.ventas)}" style="animation-delay:${i * 180}ms"/><text class="vd-ax" x="${x(i) + bw / 2}" y="${base + 22}" text-anchor="middle">${a.anio}</text><text class="vd-val" x="${x(i) + bw / 2}" y="${yv(a.ventas) - 8}" text-anchor="middle">${L.meur(a.ventas)}</text>`).join('')}
        <path class="vd-l caja vd-tarde" d="${lin('tesoreria')}"/><path class="vd-l deuda vd-tarde2" d="${lin('deudaCP')}"/>
        ${Hs.map((a, i) => `<circle class="vd-pt caja vd-tarde" cx="${x(i) + bw / 2}" cy="${ys(a.tesoreria)}" r="5"/><circle class="vd-pt deuda vd-tarde2" cx="${x(i) + bw / 2}" cy="${ys(a.deudaCP)}" r="5"/>`).join('')}
        </svg><div class="vd-side"><div class="vd-ley"><i class="v"></i>Ventas</div><div class="vd-ley vd-tarde"><i class="c"></i>Caja: ${L.eur(K.tesoreria0)} → ${L.eur(K.tesoreria)}</div><div class="vd-ley vd-tarde2"><i class="d"></i>Deuda a corto: ${L.eur(Hs[0].deudaCP)} → ${L.eur(Hs[4].deudaCP)}</div>${kpi('EBITDA sobre ventas', L.pct(K.ebitdaPct), 'en 2025', 'warn')}</div></div>`;
    },
    rojos(h) {
      const R5 = [['Cobros', `${K.dso} días`, `hace cinco años, ${K.dso0}`], ['Un cliente', `${K.topPct} %`, 'de las ventas'], ['Carpintería', `${K.carpPct} % de margen`, `montajes: ${K.montPct} %`], ['Dependencia', 'Todo pasa por el fundador', 'el taller, sin segundo'], ['Inversión', L.meur(K.inversion), 'láser, plegadora y nave']];
      h.innerHTML = `<div class="vd-rojos">${R5.map((r, i) => `<div class="vd-rc" data-i="${i}"><span class="vd-rn">${i + 1}</span><span class="vd-rk">${esc(r[0])}</span><b>${esc(r[1])}</b><small>${esc(r[2])}</small></div>`).join('')}</div>`;
      [0.12, 0.27, 0.45, 0.62, 0.78].forEach((fr, i) => cue(fr, () => { const c = $(`.vd-rc[data-i="${i}"]`, h); if (c) c.classList.add('on'); }));
    },
    proyeccion(h) {
      const G = grafico(dominio([E.base.serie]));
      h.innerHTML = `<div class="vd-2col">${G.svg}<div class="vd-side">${kpi('Liquidez mínima', L.eur(E.base.liq), mesN(E.base.mes), 'stop')}${kpi('Recuperación', L.anios(E.base.pb))}${kpi('Deuda / EBITDA', L.veces(E.base.dE), '', 'warn')}<div class="vd-vbox" hidden>${veredicto(E.base)}</div></div></div>`;
      const s = $('svg', h); linea(G, s, E.base.serie, 'base', { dibujar: dur * 0.45 });
      cue(0.42, () => marca(G, s, E.base.mes, E.base.liq, `${L.eur(E.base.liq)} · ${mesN(E.base.mes)}`, 'stop'));
      cue(0.8, () => { $('.vd-vbox', h).hidden = false; });
    },
    escenarios(h) {
      const ks = [['estres', 'Estrés'], ['pesimista', 'Pesimista'], ['base', 'Base'], ['optimista', 'Optimista']];
      const G = grafico(dominio(ks.map(([k]) => E[k].serie).concat([E.base.sinInv])));
      h.innerHTML = `<div class="vd-2col">${G.svg}<div class="vd-side">${ks.map(([k, n]) => `<div class="vd-ley vd-e-${k}" hidden><i></i>${n}: ${L.eur(E[k].liq)}</div>`).join('')}<div class="vd-ley vd-e-sin" hidden><i></i>Sin invertir: la caja aguanta</div></div></div>`;
      const s = $('svg', h);
      [0.05, 0.2, 0.35, 0.5].forEach((fr, i) => cue(fr, () => { const k = ks[i][0]; linea(G, s, E[k].serie, 'e-' + k, { dibujar: 1400 }); $('.vd-e-' + k, h).hidden = false; }));
      cue(0.7, () => { linea(G, s, E.base.sinInv, 'e-sin', { dibujar: 1400 }); $('.vd-e-sin', h).hidden = false; });
    },
    palancas(h) {
      h.innerHTML = `<div class="vd-chips">${P.map((d, i) => `<div class="vd-chip" style="animation-delay:${i * 160}ms"><span>${i + 1}</span><b>${esc(d.n)}</b><small>${esc(d.mundo)}</small></div>`).join('')}</div>`;
    },
    paso(h, e) {
      const d = P[e.paso], G = grafico(domPal);
      h.innerHTML = `<div class="vd-2col">${G.svg}<div class="vd-side"><div class="vd-kick">${esc(d.mundo)}</div><h3 class="vd-pn">${esc(d.n)}</h3><div class="vd-pv">${esc(d.valor)}</div>
        ${kpi('Liquidez mínima', L.eur(d.antes.liq), '', d.antes.liq < 0 ? 'stop' : 'ok')}${kpi('Caja a 5 años', L.meur(d.antes.fin))}${d.id === 'equipo' ? kpi('Sistema humano', L.n(d.antes.humano) + '/100') : ''}
        <div class="vd-plist">${P.map((x, i) => `<i class="${i < e.paso ? 'ok' : i === e.paso ? 'on' : ''}" title="${esc(x.n)}"></i>`).join('')}</div></div></div>`;
      const s = $('svg', h);
      linea(G, s, E.base.serie, 'fantasma');
      const l = linea(G, s, d.antes.serie, 'base');
      cue(0.4, () => {
        l.morph(d.despues.serie, 1500).then(() => { if (d.despues.liq >= 0) l.setAttribute('class', 'vd-l final'); });
        const ks = $$('.vd-kpi', h);
        const set = (el, v, st) => { el.querySelector('b').textContent = v; if (st) { el.classList.remove('ok', 'stop', 'warn'); el.classList.add(st); } el.classList.add('vd-flash'); };
        setTimeout(() => { set(ks[0], L.eur(d.despues.liq), d.despues.liq < 0 ? 'stop' : 'ok'); set(ks[1], L.meur(d.despues.fin)); if (ks[2]) set(ks[2], L.n(d.despues.humano) + '/100', 'ok'); $$('.vd-plist i', h)[e.paso].className = 'ok'; }, 900);
        if (d.antes.liq < 0 && d.despues.liq >= 0) setTimeout(() => marca(G, s, d.despues.mes, d.despues.liq, 'Por encima de cero', 'ok'), 1600);
      });
    },
    rumbo(h) {
      const G = grafico(dominio([E.base.serie, F.serie]));
      const fila = (k, a, b, ok) => `<tr><td>${esc(k)}</td><td class="a">${esc(a)}</td><td class="b ${ok ? 'ok' : ''}">${esc(b)}</td></tr>`;
      h.innerHTML = `<div class="vd-2col">${G.svg}<div class="vd-side"><table class="vd-tab"><thead><tr><th></th><th>Sin tocar nada</th><th>Con las palancas</th></tr></thead><tbody>
        ${fila('Liquidez mínima', L.eur(E.base.liq), L.eur(F.liq), true)}${fila('Recuperación', L.anios(E.base.pb), L.anios(F.pb), true)}${fila('Deuda / EBITDA', L.veces(E.base.dE), L.veces(F.dE), true)}${fila('Caja a 5 años', L.meur(E.base.fin), L.meur(F.fin), true)}${fila('Semáforos en rojo', String(E.base.rojos.length), String(F.rojos.length), true)}</tbody></table>
        <div class="vd-vbox">${veredicto(E.base)}<span class="vd-flecha">→</span><span class="vd-vfin" hidden>${veredicto(F)}</span></div></div></div>`;
      const s = $('svg', h); linea(G, s, E.base.serie, 'base'); cue(0.15, () => linea(G, s, F.serie, 'final', { dibujar: 2200 }));
      $$('.vd-tab tbody tr', h).forEach((tr, i) => { tr.style.opacity = 0; cue(0.25 + i * 0.1, () => { tr.style.opacity = 1; }); });
      cue(0.85, () => { $('.vd-vfin', h).hidden = false; });
    },
    estres(h) {
      const G = grafico(dominio([E.estres.serie, R.finalEstres.serie]));
      h.innerHTML = `<div class="vd-2col">${G.svg}<div class="vd-side">${kpi('Estrés, sin tocar nada', L.eur(E.estres.liq), 'liquidez mínima', 'stop')}${kpi('Estrés, con las palancas', L.eur(R.finalEstres.liq), 'se cubre ampliando la póliza', 'warn')}</div></div>`;
      const s = $('svg', h); linea(G, s, E.estres.serie, 'e-estres'); cue(0.25, () => linea(G, s, R.finalEstres.serie, 'final', { dibujar: 2000 }));
    },
    ecosistema(h) {
      const MUNDOS = [['Sistema estratégico', 'Cobros · Margen · Compras · Plan'], ['Simulador', 'Financiación · Nave · Leasing'], ['Personas y equipos', 'Contratar a tiempo · Suplentes'], ['Auditoría integral', 'Plan de intervención'], ['Mesa de trabajo', 'Metas con fecha y responsable']];
      h.innerHTML = `<div class="vd-eco"><div class="vd-core">Valdenorte<small>una sola fuente de datos</small></div>${MUNDOS.map((m, i) => `<div class="vd-w vd-w${i}" style="animation-delay:${400 + i * 500}ms"><b>${esc(m[0])}</b><small>${esc(m[1])}</small></div>`).join('')}</div>`;
    },
    usted(h) {
      const act = P.map(() => true);
      h.innerHTML = `<div class="vd-2col vd-usted"><div class="vd-ugraf"></div><div class="vd-side"><div class="vd-kick">Active o quite cada palanca</div>
        <div class="vd-toggles">${V.PALANCAS.map((p, i) => `<label class="vd-tg"><input type="checkbox" data-p="${i}" checked><span>${esc(p.n)}</span></label>`).join('')}</div>
        <label class="vd-esc">Escenario <select data-esc><option value="base">Base</option><option value="estres">Estrés</option><option value="pesimista">Pesimista</option><option value="optimista">Optimista</option></select></label>
        <div class="vd-uk"></div>
        <div class="vd-ubtn"><button class="vd-b solid" data-sim>Abrir el simulador con Valdenorte</button><button class="vd-b" data-otra>Ver el vídeo otra vez</button></div></div></div>`;
      const pintar = () => {
        const s = JSON.parse(JSON.stringify(R.s0)); V.PALANCAS.forEach((p, i) => { if (act[i]) p.f(s); });
        const sc = $('[data-esc]', h).value, r = V.resultado(s, sc), r0 = sc === 'base' ? E.base : E[sc];
        const G = grafico(dominio([r0.serie, r.serie])); $('.vd-ugraf', h).innerHTML = G.svg; const sv = $('svg', h);
        linea(G, sv, r0.serie, 'fantasma'); linea(G, sv, r.serie, r.liq >= 0 ? 'final' : 'base');
        marca(G, sv, r.mes, r.liq, `${L.eur(r.liq)} · ${mesN(r.mes)}`, r.liq >= 0 ? 'ok' : 'stop');
        $('.vd-uk', h).innerHTML = kpi('Liquidez mínima', L.eur(r.liq), mesN(r.mes), r.liq < 0 ? 'stop' : 'ok') + kpi('Caja a 5 años', L.meur(r.fin)) + kpi('Recuperación', L.anios(r.pb)) + `<div class="vd-vbox">${veredicto(r)}</div>`;
      };
      $$('[data-p]', h).forEach((c) => (c.onchange = () => { act[+c.dataset.p] = c.checked; pintar(); }));
      $('[data-esc]', h).onchange = pintar;
      $('[data-sim]', h).onclick = () => { try { localStorage.setItem('atalaya.empresa.activa', JSON.stringify('modelo')); } catch (e) { /* sin almacenamiento */ } location.href = 'app.html#escenarios'; };
      $('[data-otra]', h).onclick = () => ir(0, true);
      pintar();
    }
  };

  /* ---------- Voz ---------- */
  let manifest = null, audio = null, sintetizada = null;
  const cargarManifest = () => fetch('media/video/manifest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((m) => { manifest = m; });
  const vozGrabada = (e) => { const m = manifest && manifest.escenas && manifest.escenas[e.id]; return m && m.h === hash(e.voz) ? m : null; };
  const vozNavegador = () => { const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || []; return vs.find((v) => /^es[-_]ES/i.test(v.lang)) || vs.find((v) => /^es/i.test(v.lang)) || null; };
  let mudo = false;
  function hablar(e, fin) {
    pararVoz();
    const g = vozGrabada(e), palabras = e.voz.split(/\s+/).length, estimado = palabras / 2.5 * 1000 + 1200;
    if (GRABAR) { dur = g ? g.dur * 1000 + 900 : estimado; return setTimeout(fin, dur); }
    if (g && !mudo) {
      dur = g.dur * 1000 + 900; audio = new Audio('media/video/' + g.archivo);
      audio.onended = () => setTimeout(fin, 900); audio.play().catch(() => { audio = null; setTimeout(fin, dur); });
      return null;
    }
    const v = vozNavegador();
    if (v && !mudo && window.speechSynthesis) {
      dur = estimado; const u = new SpeechSynthesisUtterance(e.voz); u.voice = v; u.lang = v.lang; u.rate = 1.02;
      u.onend = () => setTimeout(fin, 700); sintetizada = u; speechSynthesis.speak(u);
      return setTimeout(fin, estimado + 8000); // por si el navegador no avisa al terminar
    }
    dur = estimado; return setTimeout(fin, estimado);
  }
  function pararVoz() { if (audio) { audio.onended = null; audio.pause(); audio = null; } if (window.speechSynthesis) { if (sintetizada) sintetizada.onend = null; speechSynthesis.cancel(); } sintetizada = null; }

  /* ---------- Reproducción ---------- */
  let i = 0, jugando = false, tFin = null, token = 0;
  function pintarEscena() {
    timers.forEach(clearTimeout); timers = [];
    const e = ESC[i];
    stage.innerHTML = `<div class="vd-top"><span class="vd-brand">Atalaya 360° · Empresa modelo</span><span class="vd-n">${i + 1} / ${ESC.length}</span></div>
      <h2 class="vd-t">${esc(e.titulo)}</h2><div class="vd-vis"></div><p class="vd-sub">${esc(e.texto)}</p>
      <div class="vd-prog">${ESC.map((x, j) => `<i class="${j < i ? 'ok' : j === i ? 'on' : ''}"></i>`).join('')}</div>`;
    stage.classList.toggle('vd-usted-on', e.id === 'usted');
    const vis = $('.vd-vis', stage); (VIS[e.id] || (e.paso != null ? VIS.paso : null) || (() => {}))(vis, e);
    pintarBarra();
  }
  function ir(n, reproducir) {
    i = Math.max(0, Math.min(ESC.length - 1, n)); token++; clearTimeout(tFin); pararVoz();
    const e = ESC[i], miToken = token;
    // La duración se conoce antes de dibujar para que las animaciones se repartan a lo largo de la voz
    const g = vozGrabada(e); dur = g ? g.dur * 1000 + 900 : e.voz.split(/\s+/).length / 2.5 * 1000 + 1200;
    pintarEscena();
    if (GRABAR) console.log('ESCENA ' + i + ' ' + e.id);
    if (reproducir || jugando) {
      jugando = true; pintarBarra();
      tFin = hablar(e, () => { if (miToken !== token) return; if (i < ESC.length - 1) ir(i + 1); else { jugando = false; pintarBarra(); if (GRABAR) console.log('FIN'); } });
    }
  }

  /* ---------- Controles ---------- */
  function pintarBarra() {
    if (GRABAR) return;
    bar.innerHTML = `<button class="vd-b" data-ant aria-label="Escena anterior">⏮</button><button class="vd-b solid" data-play aria-label="${jugando ? 'Pausa' : 'Reproducir'}">${jugando ? '❚❚ Pausa' : '▶ Reproducir'}</button><button class="vd-b" data-sig aria-label="Escena siguiente">⏭</button>
      <button class="vd-b" data-mudo aria-pressed="${mudo}">${mudo ? 'Sin voz' : 'Con voz'}</button>
      <select class="vd-cap" data-cap aria-label="Capítulos">${ESC.map((e, j) => `<option value="${j}" ${j === i ? 'selected' : ''}>${j + 1}. ${esc(e.titulo)}</option>`).join('')}</select>
      <button class="vd-b" data-usted>Probar usted</button><a class="vd-b" href="media/video/valdenorte-cambiar-el-rumbo.mp4" download>Descargar MP4</a><a class="vd-b" href="portal.html">Salir</a>`;
    $('[data-play]', bar).onclick = () => { if (jugando) { jugando = false; token++; clearTimeout(tFin); pararVoz(); pintarBarra(); } else ir(i, true); };
    $('[data-ant]', bar).onclick = () => ir(i - 1);
    $('[data-sig]', bar).onclick = () => ir(i + 1);
    $('[data-mudo]', bar).onclick = () => { mudo = !mudo; if (jugando) ir(i, true); else pintarBarra(); };
    $('[data-cap]', bar).onchange = (ev) => ir(+ev.target.value);
    $('[data-usted]', bar).onclick = () => { jugando = false; ir(ESC.length - 1); };
  }
  addEventListener('keydown', (ev) => {
    if (GRABAR || /input|select|textarea/i.test(ev.target.tagName)) return;
    if (ev.key === ' ') { ev.preventDefault(); $('[data-play]', bar).click(); } else if (ev.key === 'ArrowRight') ir(i + 1); else if (ev.key === 'ArrowLeft') ir(i - 1);
  });

  /* ---------- Arranque ---------- */
  cargarManifest().then(() => {
    if (window.speechSynthesis) speechSynthesis.getVoices();
    if (GRABAR) { pintarEscena(); setTimeout(() => ir(0, true), 1200); return; }
    // Portada con botón de inicio: el navegador solo deja sonar la voz tras un clic
    pintarEscena();
    const ov = document.createElement('button'); ov.className = 'vd-start'; ov.innerHTML = '<i>▶</i><span><b>Ver el vídeo</b><small>Con voz · unos 5 minutos</small></span>';
    stage.appendChild(ov); ov.onclick = () => { ov.remove(); ir(0, true); };
  });
  A.videoPlayer = { ir, ESC, R, grabada: (n) => !!vozGrabada(ESC[n]) };
})();
