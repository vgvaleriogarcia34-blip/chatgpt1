/* Atalaya · Landing: el ecosistema
   El mismo universo del puesto de mando en pequeño: tres mundos (simulador de inversión, sistema estratégico y
   personas y equipos) unidos por una corriente de datos. Al elegir uno, sus pantallas se despliegan en abanico debajo,
   coloreadas por fase o por área; al pasar por encima, cada pantalla se eleva y cuenta qué responde. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const eco = $('#eco'); if (!eco) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Las pantallas de cada mundo ---------- */
  const MUNDOS = {
    sim: {
      fases: [['Visión general', '#ecd6a6'], ['Su empresa', '#3987e5'], ['El movimiento', '#d4ae64'], ['Ensayar el futuro', '#d55181'], ['Lo que cambia', '#199e70'], ['Decidir', '#d95926']],
      cards: [
        [0, 'Puente de mando', '¿Cómo está todo de un vistazo?', 'kpis'],
        [1, 'La empresa hoy', '¿Cómo es su empresa ahora mismo?', 'bars'],
        [1, 'Historia y cuentas', '¿De dónde viene? Tus cuentas de otros años.', 'table'],
        [2, 'La inversión', '¿Qué quiere hacer y cómo lo paga?', 'donut'],
        [3, 'Horizonte 3D', '¿Qué pasa si cambian dos cosas a la vez?', 'terrain'],
        [3, 'Escenarios', '¿Y si sale peor, o mejor?', 'lines'],
        [3, 'Semáforos y riesgos', '¿Qué hay que vigilar?', 'lights'],
        [4, 'Nuevo tamaño', '¿Cómo será la empresa después?', 'bars'],
        [4, 'Sistema humano', '¿Está el equipo preparado?', 'radar'],
        [4, 'Estructuras', '¿Hay otra forma de hacerlo?', 'org'],
        [5, 'Meta y plan', '¿Qué tocar para llegar a la meta?', 'steps'],
        [5, 'Informe', 'El dossier para decidir.', 'doc']
      ]
    },
    est: {
      fases: [['Visión', '#d4ae64'], ['Finanzas', '#199e70'], ['Comercial', '#3987e5'], ['Operaciones', '#d95926'], ['Estrategia', '#d55181']],
      cards: [
        [0, 'Cuadro de mando', '¿Cómo está toda la empresa de un vistazo?', 'kpis'],
        [0, 'Plan de empresa', '¿A dónde vamos y con qué valores?', 'dafo'],
        [0, 'Informe de auditoría', 'El diagnóstico completo, de lo micro a lo macro.', 'doc'],
        [0, 'Evolución', '¿La empresa mejora o empeora?', 'lines'],
        [1, 'Flujo del dinero', '¿Por qué el beneficio no llega a la caja?', 'flow'],
        [1, 'Impuestos', '¿Cuánto y cuándo pagaré a Hacienda?', 'bars'],
        [1, 'Tesorería semanal', '¿Llego a fin de mes, semana a semana?', 'lines'],
        [1, 'Presupuesto', '¿Qué espero ganar y gastar este año?', 'table'],
        [1, 'Cobros y morosidad', '¿Cómo pagan de verdad mis clientes?', 'bars'],
        [2, 'ABC y concentración', '¿Quién me compra y cuánto dependo de él?', 'pareto'],
        [2, 'Margen y demanda', '¿Qué precio y qué volumen me convienen?', 'lines'],
        [2, 'Pipeline comercial', '¿Qué ventas tengo en camino?', 'funnel'],
        [2, 'Marketing', '¿Qué me rinde cada euro de marketing?', 'donut'],
        [3, 'Compras', '¿De quién dependo para comprar?', 'pareto'],
        [3, 'Logística', '¿Cuánto me cuesta mover y guardar?', 'bars'],
        [3, 'Gestor de tiempos', '¿En qué se va el tiempo del equipo?', 'clock'],
        [3, 'Lean', '¿Dónde se pierde valor en el proceso?', 'steps'],
        [3, 'Personas', '¿Está bien organizado el equipo?', 'org'],
        [4, 'Expansión territorial', '¿Dónde y cómo crecer?', 'radar'],
        [4, 'Mercado y riesgos', '¿Qué pasa fuera que me afecta?', 'lights'],
        [4, 'Valoración', '¿Cuánto vale mi empresa?', 'flow']
      ]
    },
    per: {
      fases: [['Visión', '#c9f24d'], ['Herramientas', '#ab7bff'], ['Estructura', '#3987e5'], ['Equipos', '#199e70'], ['Desarrollo', '#d95926']],
      cards: [
        [0, 'Panorama', '¿Cómo es el equipo humano y qué trabajar primero?', 'kpis'],
        [0, 'Plantilla', '¿Quién está en cada puesto y de quién depende?', 'table'],
        [1, 'DISC', '¿Cómo se comporta cada persona?', 'radar'],
        [1, 'Aportaciones al equipo', '¿Qué aporta cada persona cuando trabaja con otros?', 'bars'],
        [1, 'Eneagrama', '¿Qué mueve a cada persona y qué teme?', 'radar'],
        [2, 'Puestos', '¿Qué pide cada puesto?', 'steps'],
        [2, 'Encaje persona-puesto', '¿Está cada persona en el puesto que mejor la aprovecha?', 'lights'],
        [2, 'Organigrama y mandos', '¿Dependencias, amplitud de mando y relevos?', 'org'],
        [2, 'Mapa de talento', '¿Dónde está el talento que sostiene la empresa?', 'dafo'],
        [3, 'Equipos', '¿Está equilibrado cada equipo?', 'donut'],
        [3, 'Liderazgo a medida', '¿Usa cada responsable el estilo que toca con cada persona y tarea?', 'funnel'],
        [4, 'Tablillas de entrenamiento', '¿Qué entrenar a cada persona y a cada equipo?', 'steps'],
        [4, 'Informes', 'De la persona, del equipo y de la organización.', 'doc']
      ]
    }
  };

  /* Miniatura dibujada de cada tipo de pantalla (SVG, sin imágenes) */
  function thumb(kind, c, seed) {
    let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const W = 200, H = 92; let g = '';
    const ax = `<line x1="8" y1="${H - 8}" x2="${W - 8}" y2="${H - 8}" stroke="rgba(255,255,255,.12)"/>`;
    switch (kind) {
      case 'kpis': for (let i = 0; i < 4; i++) { const x = 8 + i * 47; g += `<rect x="${x}" y="10" width="42" height="34" rx="5" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.1)"/><rect x="${x + 6}" y="16" width="18" height="3" rx="1.5" fill="rgba(255,255,255,.25)"/><rect x="${x + 6}" y="26" width="${16 + rnd() * 16}" height="8" rx="2" fill="${i === 2 ? '#e3b341' : c}"/>`; } for (let i = 0; i < 3; i++) g += `<rect x="8" y="${54 + i * 11}" width="${120 + rnd() * 60}" height="5" rx="2.5" fill="rgba(255,255,255,${0.08 + i * 0.02})"/><circle cx="${W - 12}" cy="${56.5 + i * 11}" r="3" fill="${['#3fb950', '#e3b341', '#e0605a'][i]}"/>`; break;
      case 'bars': g = ax; for (let i = 0; i < 10; i++) { const h = 14 + rnd() * 58; g += `<rect x="${12 + i * 18.5}" y="${H - 8 - h}" width="12" height="${h}" rx="2" fill="${c}" opacity="${0.45 + i * 0.05}"/>`; } break;
      case 'lines': { g = ax; const cols = [c, '#e0605a', '#3fb950', '#9ba4ba']; cols.forEach((cc, k) => { let y = 50 + (k - 1.5) * 6, d = ''; for (let i = 0; i <= 12; i++) { y += (rnd() - 0.5 + (k === 1 ? 0.35 : k === 2 ? -0.35 : 0)) * 9; y = Math.max(8, Math.min(H - 10, y)); d += (i ? ' L' : 'M') + (8 + i * 15.3).toFixed(1) + ' ' + y.toFixed(1); } g += `<path d="${d}" fill="none" stroke="${cc}" stroke-width="${k ? 1.4 : 2.2}" opacity="${k ? 0.75 : 1}"/>`; }); break; }
      case 'table': for (let i = 0; i < 6; i++) { g += `<rect x="8" y="${8 + i * 13}" width="${W - 16}" height="11" rx="2" fill="${i === 0 ? c : 'rgba(255,255,255,' + (i % 2 ? 0.05 : 0.025) + ')'}" opacity="${i === 0 ? 0.6 : 1}"/>`; for (let j = 1; j < 4; j++) g += `<rect x="${60 + j * 32}" y="${12 + i * 13}" width="${12 + rnd() * 12}" height="3" rx="1.5" fill="rgba(255,255,255,.3)"/>`; } break;
      case 'donut': { const vals = [0.45, 0.3, 0.25]; let a0 = -Math.PI / 2; vals.forEach((v, k) => { const a1 = a0 + v * Math.PI * 2, r = 30, cx = 52, cy = 46; g += `<path d="M${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${v > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}" fill="none" stroke="${[c, '#9ba4ba', '#3987e5'][k]}" stroke-width="11"/>`; a0 = a1 + 0.04; }); for (let i = 0; i < 4; i++) g += `<rect x="104" y="${18 + i * 15}" width="${50 + rnd() * 40}" height="6" rx="3" fill="rgba(255,255,255,${0.1 + (i === 0 ? 0.15 : 0)})"/>`; break; }
      case 'terrain': for (let i = 0; i < 9; i++) { let d = ''; for (let j = 0; j <= 16; j++) { const x = 10 + j * 11.25 + (i - 4) * (j - 8) * 0.6, y = 22 + i * 7.5 - Math.sin(j / 2.5 + i / 3) * (6 + i) * 0.7; d += (j ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); } g += `<path d="${d}" fill="none" stroke="${i > 5 ? '#e0605a' : i > 3 ? '#e3b341' : c}" stroke-width="1" opacity="${0.4 + i * 0.06}"/>`; } break;
      case 'lights': for (let i = 0; i < 5; i++) { const st = ['#3fb950', '#3fb950', '#e3b341', '#3fb950', '#e0605a'][(i + seed) % 5]; g += `<circle cx="16" cy="${12 + i * 16}" r="5" fill="${st}"/><rect x="28" y="${9 + i * 16}" width="${70 + rnd() * 40}" height="6" rx="3" fill="rgba(255,255,255,.14)"/><rect x="150" y="${9 + i * 16}" width="40" height="6" rx="3" fill="rgba(255,255,255,.06)"/><rect x="150" y="${9 + i * 16}" width="${10 + rnd() * 30}" height="6" rx="3" fill="${st}" opacity=".7"/>`; } break;
      case 'radar': { const cx = 100, cy = 47, R = 36, n = 6; for (let k = 1; k <= 3; k++) g += `<polygon points="${Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return `${cx + Math.cos(a) * R * k / 3},${cy + Math.sin(a) * R * k / 3}`; }).join(' ')}" fill="none" stroke="rgba(255,255,255,.12)"/>`; g += `<polygon points="${Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2, r = R * (0.45 + rnd() * 0.5); return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`; }).join(' ')}" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="1.6"/>`; break; }
      case 'org': { const box = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="16" rx="4" fill="rgba(255,255,255,.05)" stroke="${c}"/>`; g = box(80, 8, 40) + `<path d="M100 24 V34 M40 34 H160 M40 34 V42 M100 34 V42 M160 34 V42" stroke="rgba(255,255,255,.3)" fill="none"/>` + box(20, 42, 40) + box(80, 42, 40) + box(140, 42, 40) + `<path d="M40 58 V68 M20 68 H60 M20 68 V72 M60 68 V72" stroke="rgba(255,255,255,.25)" fill="none"/>` + box(6, 72, 28) + box(46, 72, 28); break; }
      case 'steps': for (let i = 0; i < 5; i++) { const x = 10 + i * 37; g += `<rect x="${x}" y="${60 - i * 10}" width="31" height="${24 + i * 10}" rx="4" fill="${c}" opacity="${0.25 + i * 0.15}"/><circle cx="${x + 15.5}" cy="${50 - i * 10}" r="4" fill="${i < 3 ? '#3fb950' : 'rgba(255,255,255,.25)'}"/>`; } break;
      case 'doc': g = `<rect x="58" y="6" width="84" height="80" rx="4" fill="#f4efe3"/><rect x="66" y="14" width="40" height="5" rx="2" fill="#10162b"/><rect x="66" y="23" width="62" height="3" rx="1.5" fill="#b8ad95"/>` + Array.from({ length: 5 }, (_, i) => `<rect x="66" y="${34 + i * 9}" width="${50 + rnd() * 18}" height="3" rx="1.5" fill="#cfc6b2"/>`).join('') + `<rect x="66" y="78" width="20" height="4" rx="2" fill="${c}"/>`; break;
      case 'flow': { const st = [[10, 70, 'Ventas'], [60, 55, ''], [110, 40, ''], [160, 25, 'Caja']]; st.forEach(([x, h], i) => { g += `<rect x="${x}" y="${H - 10 - h}" width="30" height="${h}" rx="3" fill="${i === 3 ? '#3fb950' : c}" opacity="${0.9 - i * 0.12}"/>`; if (i < 3) g += `<path d="M${x + 30} ${H - 10 - h} L${x + 50} ${H - 10 - st[i + 1][1]} L${x + 50} ${H - 10} L${x + 30} ${H - 10} Z" fill="${c}" opacity=".18"/>`; }); break; }
      case 'pareto': { g = ax; let acc = 0; const v = [34, 22, 14, 9, 7, 5, 4, 3, 2]; let d = ''; v.forEach((x, i) => { acc += x; const h = x * 1.9; g += `<rect x="${12 + i * 20}" y="${H - 8 - h}" width="14" height="${h}" rx="2" fill="${i < 2 ? c : i < 5 ? '#9ba4ba' : 'rgba(255,255,255,.2)'}"/>`; d += (i ? ' L' : 'M') + (19 + i * 20) + ' ' + (H - 8 - acc * 0.78).toFixed(1); }); g += `<path d="${d}" fill="none" stroke="#e3b341" stroke-width="1.6"/>`; break; }
      case 'funnel': for (let i = 0; i < 5; i++) { const w = 170 - i * 30; g += `<rect x="${(W - w) / 2}" y="${8 + i * 16}" width="${w}" height="13" rx="3" fill="${c}" opacity="${0.3 + i * 0.15}"/>`; } break;
      case 'clock': g = `<circle cx="52" cy="46" r="34" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="5"/><circle cx="52" cy="46" r="34" fill="none" stroke="${c}" stroke-width="5" stroke-dasharray="150 214" transform="rotate(-90 52 46)"/><path d="M52 46 L52 22 M52 46 L68 52" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` + Array.from({ length: 4 }, (_, i) => `<rect x="104" y="${16 + i * 16}" width="${40 + rnd() * 46}" height="8" rx="4" fill="${i === 0 ? c : 'rgba(255,255,255,.12)'}"/>`).join(''); break;
      case 'dafo': ['#3fb950', '#e0605a', '#3987e5', '#e3b341'].forEach((cc, i) => { const x = 8 + (i % 2) * 93, y = 6 + Math.floor(i / 2) * 42; g += `<rect x="${x}" y="${y}" width="89" height="38" rx="4" fill="${cc}" fill-opacity=".12" stroke="${cc}" stroke-opacity=".5"/>` + Array.from({ length: 3 }, (_, k) => `<rect x="${x + 7}" y="${y + 9 + k * 9}" width="${40 + rnd() * 34}" height="3" rx="1.5" fill="rgba(255,255,255,.3)"/>`).join(''); }); break;
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${g}</svg>`;
  }

  /* ---------- Abanico ---------- */
  let mundo = 'sim', hot = null, faseHot = null, user = false, salida = 0;
  const fan = $('#ecoFan'), fases = $('#ecoPhases'), read = $('#ecoRead');
  function drawFan() {
    const M = MUNDOS[mundo];
    fan.dataset.w = mundo;
    fan.innerHTML = M.cards.map(([f, t, q, k], i) => `<button class="eco-card" data-i="${i}" style="--fc:${M.fases[f][1]}" aria-label="${esc(t)}: ${esc(q)}"><span class="ec-in"><span class="ec-chrome"><i></i><i></i><i></i><b>${String(i + 1).padStart(2, '0')} · ${esc(t)}</b></span><span class="ec-th">${thumb(k, M.fases[f][1], i + (mundo === 'est' ? 40 : 0))}</span><span class="ec-info"><small>${esc(M.fases[f][0])}</small><b>${esc(t)}</b></span></span></button>`).join('');
    fases.innerHTML = M.fases.map(([n, c], i) => `<button data-f="${i}" style="--fc:${c}"><i></i>${esc(n)}</button>`).join('');
    $$('.eco-card', fan).forEach((c) => {
      c.addEventListener('pointerenter', () => { clearTimeout(salida); if (hot !== +c.dataset.i) { hot = +c.dataset.i; user = true; place(); } });
      // Al salir se espera un instante: pasar de una pantalla a la vecina no hace bajar y subir todo
      c.addEventListener('pointerleave', () => { clearTimeout(salida); salida = setTimeout(() => { if (hot === +c.dataset.i) { hot = null; place(); } }, 140); });
      c.addEventListener('focus', () => { hot = +c.dataset.i; place(); });
      c.addEventListener('blur', () => { hot = null; place(); });
      c.addEventListener('click', () => { hot = hot === +c.dataset.i && c.matches(':focus') ? hot : +c.dataset.i; user = true; place(); });
    });
    $$('button', fases).forEach((b) => {
      b.addEventListener('pointerenter', () => { faseHot = +b.dataset.f; place(); });
      b.addEventListener('pointerleave', () => { faseHot = null; place(); });
      b.addEventListener('click', () => { faseHot = faseHot === +b.dataset.f ? null : +b.dataset.f; user = true; place(); });
    });
    // Las pantallas entran desde abajo, una tras otra
    fan.classList.remove('in'); void fan.offsetWidth; fan.classList.add('in');
    place();
  }
  function place() {
    const M = MUNDOS[mundo], cards = $$('.eco-card', fan), n = cards.length;
    const small = eco.clientWidth < 700, step = (small ? 58 : 74) / n;
    cards.forEach((c, i) => {
      const a = (i - (n - 1) / 2) * step, isHot = hot === i, inF = faseHot !== null && M.cards[i][0] === faseHot;
      c.style.setProperty('--a', a + 'deg');
      c.style.setProperty('--d', (i * 35) + 'ms');
      // La zona sensible (el botón) no se mueve: solo sube su contenido. Así la pantalla elegida sale y se queda
      // quieta, sin entrar y salir del cursor una y otra vez.
      c.style.transform = `rotateZ(${a}deg) translateZ(${i}px)`;
      c.firstElementChild.style.transform = isHot ? `translate3d(0, ${small ? -70 : -110}px, 140px) rotateZ(${-a}deg) scale(${small ? 1.25 : 1.18})` : inF ? 'translate3d(0, -36px, 50px)' : '';
      c.style.zIndex = isHot ? 200 : inF ? 150 : 100 - Math.round(Math.abs(i - (n - 1) / 2));
      c.classList.toggle('hot', isHot);
      c.classList.toggle('dim', faseHot !== null && !inF);
    });
    $$('button', fases).forEach((b) => b.classList.toggle('on', +b.dataset.f === (hot !== null ? M.cards[hot][0] : faseHot)));
    const k = hot !== null ? M.cards[hot] : null;
    read.innerHTML = '<span>' + (k ? `<b>${esc(k[1])}</b> · ${esc(k[2])}` : faseHot !== null ? `<b>${esc(M.fases[faseHot][0])}</b> · ${M.cards.filter((x) => x[0] === faseHot).map((x) => esc(x[1])).join(', ')}` : mundo === 'sim' ? 'Doce pantallas en seis fases: de cómo es su empresa hoy a la decisión. <b>Pase por encima de una pantalla.</b>' : mundo === 'est' ? 'Veintiún módulos en cinco áreas que comparten los mismos datos. <b>Pase por encima de un módulo.</b>' : 'Trece pantallas para leer personas, puestos y equipos. Plan Consultora. <b>Pase por encima de una pantalla.</b>') + '</span>';
  }
  function elegir(w, byUser) {
    if (byUser) user = true;
    if (w === mundo && fan.childElementCount) return;
    mundo = w; hot = null; faseHot = null;
    $$('.eco-w', eco).forEach((b) => b.classList.toggle('on', b.dataset.w === w));
    eco.dataset.w = w;
    drawFan();
  }
  $$('.eco-w', eco).forEach((b) => { b.addEventListener('click', () => elegir(b.dataset.w, true)); b.addEventListener('pointerenter', () => elegir(b.dataset.w, true)); });
  elegir('sim');
  addEventListener('resize', place);

  // Mientras nadie toca nada, los tres mundos se alternan solos
  let visible = false;
  setInterval(() => { if (!user && visible && !reduce) elegir({ sim: 'est', est: 'per', per: 'sim' }[mundo]); }, 7000);

  /* ---------- Universo 3D (Three.js bajo demanda) ---------- */
  const canvas = $('#ecoCanvas');
  let started = false, running = false;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
    visible = e.isIntersecting; running = visible && !document.hidden;
    if (visible && !started) { started = true; load(); }
  }), { rootMargin: '300px 0px' }) : null;
  if (io) io.observe(eco); else { visible = true; running = true; started = true; load(); }
  document.addEventListener('visibilitychange', () => { running = visible && !document.hidden; });

  function load() {
    const A = window.Atalaya || {};
    if (A.loadThree) { A.loadThree().then(scene3d, () => eco.classList.add('no3d')); return; }
    if (window.THREE) return scene3d();
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = scene3d; s.onerror = () => eco.classList.add('no3d');
    document.head.appendChild(s);
  }

  function scene3d() {
    const T = window.THREE; let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { eco.classList.add('no3d'); return; }
    eco.classList.add('is3d');
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(50, 1, 0.1, 1500);
    const tex = (size, draw) => { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return new T.CanvasTexture(c); };
    const glow = (r, g, b) => tex(128, (x, s) => { const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.25, `rgba(${r},${g},${b},0.45)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, s, s); });
    const dot = tex(64, (x, s) => { const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, s, s); });
    const sprite = (map, color, scale, opacity) => { const sp = new T.Sprite(new T.SpriteMaterial({ map, color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false })); sp.scale.set(scale, scale, 1); return sp; };
    const pts = (pos, col, size, op) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); return new T.Points(g, new T.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending })); };

    // Fondo: estrellas y una galaxia espiral lejana
    { const n = 1600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, th = Math.random() * 6.283, r = 200 + Math.random() * 200, s = Math.sqrt(1 - u * u); pos.set([r * s * Math.cos(th), r * u, -Math.abs(r * s * Math.sin(th))], i * 3); const b = 0.5 + Math.random() * 0.5; col.set([b, b * 0.95, b * (0.9 + Math.random() * 0.1)], i * 3); } scene.add(pts(pos, col, 1.6, 0.85)); }
    const galaxy = new T.Group();
    { const n = 9000, R = 110, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), a = new T.Color(0xffd79a), m = new T.Color(0xc58cff), e = new T.Color(0x4f7dff);
      for (let i = 0; i < n; i++) { const r = Math.pow(Math.random(), 1.7) * R, ang = ((i % 3) / 3) * 6.283 + r * 0.05 + (Math.random() - 0.5) * (0.5 + r / R), sp = (Math.random() - 0.5) * (5 + r * 0.12); pos.set([Math.cos(ang) * r + sp, (Math.random() - 0.5) * 4, Math.sin(ang) * r + sp], i * 3); const c = r < R * 0.35 ? a.clone().lerp(m, r / (R * 0.35)) : m.clone().lerp(e, (r - R * 0.35) / (R * 0.65)); const b = 0.5 + Math.random() * 0.5; col.set([c.r * b, c.g * b, c.b * b], i * 3); }
      galaxy.add(pts(pos, col, 1.1, 0.75)); galaxy.add(sprite(glow(255, 214, 150), 0xffffff, 50, 0.7)); }
    galaxy.position.set(0, 20, -220); galaxy.rotation.set(1.1, 0, 0.4); scene.add(galaxy);
    [[60, 90, 200, -90, 40, -260, 220, 0.25], [200, 70, 255, 100, 0, -300, 240, 0.18], [40, 160, 190, 0, -60, -240, 200, 0.16]].forEach(([r, g, b, x, y, z, s, o]) => { const sp = sprite(glow(r, g, b), 0xffffff, s, o); sp.position.set(x, y, z); scene.add(sp); });
    scene.add(new T.AmbientLight(0x3a4466, 0.9));
    const sun = new T.PointLight(0xffe2b0, 1.6, 0, 2); sun.position.set(-25, 25, 40); scene.add(sun);
    const rim = new T.PointLight(0x6f9bff, 1.2, 0, 2); rim.position.set(30, -5, -10); scene.add(rim);

    // Mundo 1: planeta dorado con anillo y cinco lunas (los escenarios)
    const sim = new T.Group();
    { const map = tex(256, (x, s) => { const gr = x.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#5c3f10'); gr.addColorStop(0.5, '#d4ae64'); gr.addColorStop(1, '#4a320c'); x.fillStyle = gr; x.fillRect(0, 0, s, s); for (let i = 0; i < 50; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,236,190' : '70,46,12'},${0.06 + Math.random() * 0.12})`; x.fillRect(0, Math.random() * s, s, 1 + Math.random() * 7); } });
      const planet = new T.Mesh(new T.SphereGeometry(3, 48, 36), new T.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.25, emissive: 0x3a2706, emissiveIntensity: 0.6 })); planet.rotation.z = 0.35; sim.add(planet); sim.userData.spin = planet;
      sim.add(sprite(glow(255, 205, 130), 0xffffff, 13, 0.55));
      const n = 1600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = 4.4 + Math.random() * 1.8; pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.12, Math.sin(a) * r], i * 3); const b = 0.5 + Math.random() * 0.5; col.set([b, 0.84 * b, 0.55 * b], i * 3); }
      const ring = pts(pos, col, 0.12, 0.9); ring.rotation.set(1.2, 0, 0.25); sim.add(ring); sim.userData.ring = ring;
      sim.userData.moons = [0xe04848, 0xd95926, 0x3987e5, 0x199e70, 0xd55181].map((c, i) => { const pv = new T.Group(); pv.rotation.set(0.3 + i * 0.35, i * 1.1, 0.2 * i); sim.add(pv); const r = 6.6 + i * 0.7; const o = new T.Mesh(new T.TorusGeometry(r, 0.014, 6, 120), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3 })); o.rotation.x = Math.PI / 2; pv.add(o); const h = new T.Group(); pv.add(h); const m = new T.Mesh(new T.SphereGeometry(0.3, 16, 12), new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7 })); m.position.x = r; h.add(m); const gl = sprite(glow(255, 255, 255), c, 1.6, 0.8); gl.position.x = r; h.add(gl); return { h, sp: 0.25 + i * 0.07 }; });
    }
    // Mundo 2: núcleo azul con 21 módulos en tres órbitas, de color por área
    const est = new T.Group();
    { const core = new T.Mesh(new T.IcosahedronGeometry(1.6, 2), new T.MeshStandardMaterial({ color: 0x9cc4ff, emissive: 0x2c5fd0, emissiveIntensity: 1.1, roughness: 0.3, metalness: 0.4 })); est.add(core);
      const shell = new T.Mesh(new T.IcosahedronGeometry(2.6, 1), new T.MeshBasicMaterial({ color: 0x6fa8ff, wireframe: true, transparent: true, opacity: 0.35 })); est.add(shell);
      est.add(sprite(glow(110, 160, 255), 0xffffff, 12, 0.65));
      const shells = [0, 1, 2].map((i) => { const s = new T.Group(); s.rotation.set(0.5 + i * 0.6, i * 0.9, 0.25 * i); est.add(s); const t = new T.Mesh(new T.TorusGeometry(4.6 + i * 1.25, 0.012, 6, 120), new T.MeshBasicMaterial({ color: 0x86b4ff, transparent: true, opacity: 0.2 })); t.rotation.x = Math.PI / 2; s.add(t); return s; });
      const nodes = []; let k = 0;
      [[0xd4ae64, 4], [0x199e70, 5], [0x3987e5, 4], [0xd95926, 5], [0xd55181, 3]].forEach(([color, cnt]) => { for (let j = 0; j < cnt; j++, k++) { const sh = shells[k % 3], r = 4.6 + (k % 3) * 1.25, a = (k / 21) * Math.PI * 6 + (k % 3) * 0.4; const m = new T.Mesh(new T.OctahedronGeometry(0.34, 0), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, flatShading: true })); m.position.set(Math.cos(a) * r, Math.sin(a * 0.5) * 0.6, Math.sin(a) * r); sh.add(m); const gl = sprite(glow(255, 255, 255), color, 1.4, 0.7); gl.position.copy(m.position); sh.add(gl); nodes.push(m); } });
      const lg = new T.BufferGeometry(), lp = new Float32Array(21 * 6); lg.setAttribute('position', new T.BufferAttribute(lp, 3));
      est.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x86b4ff, transparent: true, opacity: 0.22, blending: T.AdditiveBlending })));
      Object.assign(est.userData, { core, shell, shells, nodes, lg, lp });
    }
    // Mundo 3: planeta violeta con cuatro equipos de personas (uno por estilo) unidos en red
    const per = new T.Group();
    { const map = tex(128, (x, s) => { const gr = x.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#3d2370'); gr.addColorStop(0.5, '#ab7bff'); gr.addColorStop(1, '#2a1650'); x.fillStyle = gr; x.fillRect(0, 0, s, s); for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(241,231,255,${Math.random() * 0.18})`; x.beginPath(); x.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 0, 7); x.fill(); } });
      const core = new T.Mesh(new T.SphereGeometry(1.9, 40, 30), new T.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0.2, emissive: 0x3d2370, emissiveIntensity: 0.8 })); per.add(core);
      per.add(sprite(glow(171, 123, 255), 0xffffff, 10, 0.6));
      const teams = [0xe04848, 0xfab219, 0x2fb24a, 0x3987e5].map((c, i) => {
        const pivot = new T.Group(); pivot.rotation.x = 0.25 * (i % 2 ? 1 : -1); per.add(pivot);
        const hub = new T.Mesh(new T.IcosahedronGeometry(0.34, 0), new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, flatShading: true })); hub.position.set(4.2, 0, 0); pivot.add(hub);
        const cl = new T.Group(); cl.position.copy(hub.position); pivot.add(cl);
        const people = Array.from({ length: 5 }, (_, j) => { const m = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), new T.MeshStandardMaterial({ color: 0xf1e7ff, emissive: c, emissiveIntensity: 0.6 })); const a = (j / 5) * Math.PI * 2; m.position.set(Math.cos(a) * 1.05, Math.sin(a * 2) * 0.3, Math.sin(a) * 1.05); cl.add(m); return m; });
        return { pivot, hub, cl, people, a0: (i / 4) * Math.PI * 2 };
      });
      const lg = new T.BufferGeometry(), lp = new Float32Array(teams.length * 7 * 6); lg.setAttribute('position', new T.BufferAttribute(lp, 3));
      per.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0xc9a8ff, transparent: true, opacity: 0.25, blending: T.AdditiveBlending })));
      const orb = new T.Mesh(new T.TorusGeometry(4.2, 0.012, 6, 120), new T.MeshBasicMaterial({ color: 0xc9a8ff, transparent: true, opacity: 0.18 })); orb.rotation.x = Math.PI / 2; per.add(orb);
      Object.assign(per.userData, { core, teams, lg, lp });
    }
    scene.add(sim); scene.add(est); scene.add(per);
    const hitP = new T.Mesh(new T.SphereGeometry(5.6, 12, 10), new T.MeshBasicMaterial({ visible: false })); per.add(hitP);
    const hitS = new T.Mesh(new T.SphereGeometry(6.5, 12, 10), new T.MeshBasicMaterial({ visible: false })); sim.add(hitS);
    const hitE = new T.Mesh(new T.SphereGeometry(6.8, 12, 10), new T.MeshBasicMaterial({ visible: false })); est.add(hitE);

    // Corriente de datos entre los dos mundos
    const flowN = 160, fPos = new Float32Array(flowN * 3), fCol = new Float32Array(flowN * 3), fT = new Float32Array(flowN);
    for (let i = 0; i < flowN; i++) { fT[i] = Math.random(); fCol.set(Math.random() < 0.5 ? [1, 0.85, 0.55] : [0.55, 0.72, 1], i * 3); }
    const flow = pts(fPos, fCol, 0.26, 0.9); scene.add(flow);
    let curve = null;

    // Disposición según el tamaño del escenario: los mundos ocupan la parte de arriba y el abanico la de abajo
    let Wd = 0, Hd = 0, sc = 1;
    const SIM = new T.Vector3(), EST = new T.Vector3(), PER = new T.Vector3();
    function resize() {
      Wd = eco.clientWidth; Hd = eco.clientHeight; if (!Wd || !Hd) return;
      renderer.setSize(Wd, Hd, false); camera.aspect = Wd / Hd; camera.updateProjectionMatrix();
      const halfW = Math.tan((25 * Math.PI) / 180) * 34 * camera.aspect;
      sc = Math.min(1, halfW / 17.5); const x = Math.min(10.5, halfW * 0.5);
      const y = camera.aspect < 0.8 ? 9.2 : 7.6;
      // Simulador y sistema a los lados; personas y equipos en medio, algo más arriba, con su etiqueta debajo
      SIM.set(-x, y - 0.6 * sc, 0); EST.set(x, y - 0.6 * sc, 0); PER.set(0, y + 1.6 * sc, 0);
      curve = new T.CatmullRomCurve3([SIM.clone().add(new T.Vector3(3 * sc, 0, 0)), new T.Vector3(0, y + 4.5 * sc, -3), EST.clone().add(new T.Vector3(-3 * sc, 0, 0))]);
    }
    resize(); addEventListener('resize', resize);
    camera.position.set(0, 0, 34); camera.lookAt(0, 0, 0);

    // Ratón: inclina el espacio y permite elegir un mundo pulsándolo
    let mx = 0, my = 0, tx = 0, ty = 0, over = null;
    const ray = new T.Raycaster(), v2 = new T.Vector2();
    const pick = (e) => { const r = canvas.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera); const h = ray.intersectObjects([hitS, hitE, hitP]); return h.length ? (h[0].object === hitS ? 'sim' : h[0].object === hitE ? 'est' : 'per') : null; };
    eco.addEventListener('pointermove', (e) => { const r = eco.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5); ty = ((e.clientY - r.top) / r.height - 0.5); if (e.target === canvas) { over = pick(e); canvas.style.cursor = over ? 'pointer' : ''; } });
    canvas.addEventListener('click', (e) => { const w = pick(e); if (w) elegir(w, true); });

    const labels = { sim: $('.eco-w[data-w="sim"]', eco), est: $('.eco-w[data-w="est"]', eco), per: $('.eco-w[data-w="per"]', eco) };
    const v3 = new T.Vector3();
    const t0 = performance.now(); let last = t0;
    (function loop(now) {
      requestAnimationFrame(loop);
      if (!running || !Wd) return;
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)), t = (now - t0) / 1000; last = now;
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      camera.position.set(mx * 6, -my * 3 + 1, 34); camera.lookAt(0, 1.5, 0);
      // El mundo elegido se acerca y brilla; el otro se queda atrás
      [[sim, SIM, 'sim'], [est, EST, 'est'], [per, PER, 'per']].forEach(([g, P, k]) => {
        const on = mundo === k, s = sc * (on ? 1.12 : over === k ? 0.98 : 0.86);
        g.scale.setScalar(g.scale.x + (s - g.scale.x) * 0.08);
        const z = on ? 3 : -2; g.position.set(P.x, P.y + Math.sin(t * 0.8 + ({ sim: 0, est: 2, per: 4 })[k]) * 0.25, g.position.z + (z - g.position.z) * 0.06);
      });
      sim.userData.spin.rotation.y += dt * 0.18; sim.userData.ring.rotation.z += dt * 0.05;
      sim.userData.moons.forEach((m) => { m.h.rotation.y += dt * m.sp; });
      const E = est.userData; E.core.rotation.y += dt * 0.3; E.core.rotation.x += dt * 0.1; E.shell.rotation.y -= dt * 0.12;
      E.shells.forEach((s, i) => { s.rotation.y += dt * (0.12 + i * 0.05) * (i % 2 ? -1 : 1); });
      E.nodes.forEach((m, i) => { m.rotation.y += dt; m.getWorldPosition(v3); est.worldToLocal(v3); E.lp.set([0, 0, 0, v3.x, v3.y, v3.z], i * 6); });
      E.lg.attributes.position.needsUpdate = true;
      { const PU = per.userData; PU.core.rotation.y += dt * 0.1; let li = 0; const put = (a, b) => { PU.lp.set([a.x, a.y, a.z, b.x, b.y, b.z], li * 6); li++; }; const hb = new T.Vector3(), pp = new T.Vector3(), o = new T.Vector3();
        PU.teams.forEach((q, i) => { q.pivot.rotation.y = q.a0 + t * 0.16; q.cl.rotation.y = -t * (0.5 + i * 0.08); q.hub.getWorldPosition(hb); per.worldToLocal(hb); put(o, hb); q.people.forEach((m) => { m.getWorldPosition(pp); per.worldToLocal(pp); put(hb, pp); }); const nx = PU.teams[(i + 1) % PU.teams.length]; nx.hub.getWorldPosition(pp); per.worldToLocal(pp); put(hb, pp); });
        PU.lg.attributes.position.needsUpdate = true; }
      for (let i = 0; i < flowN; i++) { fT[i] = (fT[i] + dt * 0.12 * (0.6 + (i % 5) * 0.12)) % 1; const p = curve.getPoint(fT[i]); fPos.set([p.x + Math.sin(i * 7.1 + t) * 0.35, p.y + Math.cos(i * 3.7 + t) * 0.35, p.z], i * 3); }
      flow.geometry.attributes.position.needsUpdate = true;
      galaxy.rotation.z += dt * 0.01;
      renderer.render(scene, camera);
      // Etiquetas sobre cada mundo
      // El de personas va debajo de su planeta para no tapar a los otros dos
      [['sim', sim, SIM], ['est', est, EST], ['per', per, PER]].forEach(([k, g, P]) => { const bajo = k === 'per'; v3.set(P.x, P.y + (bajo ? -(camera.aspect < 0.8 ? 3.4 : 3) : (camera.aspect < 0.8 ? 6.4 : 4.6)) * sc, 0); v3.project(camera); const x = (v3.x * 0.5 + 0.5) * Wd, y = (-v3.y * 0.5 + 0.5) * Hd; const tf = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, ${bajo ? '0' : '-100%'})`; if (labels[k]._tf !== tf) { labels[k]._tf = tf; labels[k].style.transform = tf; } });
    })(performance.now());
  }
})();
