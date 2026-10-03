/* Atalaya 360° · Libro corporativo · parte común a los mundos
   Cada informe que se abre (en cualquier mundo) lleva el botón «Añadir al libro»: guarda la versión que se está
   viendo como un capítulo del libro de la empresa. Desde la página del libro se puede pedir «recoger todos los
   informes»: la aplicación recorre los mundos, genera sus informes sin mostrarlos y vuelve al libro.
   A.libro.cargar() · guardar(lib) · anadir(cap) · recoger(mundo) */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const P = () => A.platform;
  const $ = (s, r) => (r || document).querySelector(s);
  const pagina = () => (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');
  const MUNDO = { 'app.html': 'simulador', 'estrategia.html': 'estrategia', 'personas.html': 'personas', 'mesa.html': 'mesa' };
  const SECCION = { simulador: 'Inversión y crecimiento', estrategia: 'Sistema estratégico', personas: 'Personas y equipos', mesa: 'Plan de trabajo' };
  const URL = { simulador: 'app.html', estrategia: 'estrategia.html', personas: 'personas.html', mesa: 'mesa.html' };
  const LIMITE = 3.6e6; // el servidor admite peticiones de hasta 4 MB
  const L = (A.libro = A.libro || {});
  const uid = () => 'c' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
  L.vacio = () => ({ v: 1, titulo: '', intro: '', secciones: Object.keys(SECCION).map((k) => ({ id: k, t: SECCION[k] })), caps: [] });
  L.SECCION = SECCION;
  L.cargar = async () => {
    let lib = null;
    if (P() && P().loadData) { try { lib = await P().loadData('libro'); } catch (e) { lib = null; } }
    lib = Object.assign(L.vacio(), lib || {});
    if (!Array.isArray(lib.caps)) lib.caps = [];
    if (!Array.isArray(lib.secciones) || !lib.secciones.length) lib.secciones = L.vacio().secciones;
    return lib;
  };
  L.tamano = (lib) => JSON.stringify(lib).length;
  L.guardar = async (lib) => {
    const n = L.tamano(lib);
    if (n > LIMITE) throw new Error(`El libro ocupa ${(n / 1e6).toFixed(1).replace('.', ',')} MB y el máximo es ${(LIMITE / 1e6).toFixed(1).replace('.', ',')} MB. Quite algún capítulo (los informes completos de persona son los más grandes).`);
    if (P() && P().saveData) await P().saveData('libro', lib);
  };
  /* Limpia el HTML de un informe para guardarlo: sin scripts, sin controles de edición y sin espacios de más */
  const limpiar = (html) => String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<(button|input|select|textarea)\b[^>]*>(?:[\s\S]*?<\/\1>)?/gi, '').replace(/\s{2,}/g, ' ');
  L.anadir = async (cap, lib) => {
    const propio = !lib; lib = lib || (await L.cargar());
    const clave = cap.clave || cap.t;
    let c = lib.caps.find((x) => x.clave === clave);
    const datos = { t: cap.t, mundo: cap.mundo, html: limpiar(cap.html), cls: cap.cls || '', fecha: new Date().toISOString() };
    if (c) Object.assign(c, datos);
    else { c = Object.assign({ id: uid(), clave, sec: cap.mundo && lib.secciones.some((s) => s.id === cap.mundo) ? cap.mundo : lib.secciones[0].id, incl: true }, datos); lib.caps.push(c); }
    if (propio) await L.guardar(lib);
    return c;
  };

  /* ---------- Botón «Añadir al libro» en cualquier informe abierto ---------- */
  const enLibro = new Set();
  const boton = (ov) => {
    const bar = $('.report-bar', ov); if (!bar || $('#rpLibro', bar)) return;
    const b = document.createElement('button'); b.className = 'btn ghost'; b.id = 'rpLibro'; b.type = 'button';
    const titulo = () => ((bar.querySelector('.rb-title, b') || {}).textContent || 'Informe').trim();
    const paper = () => ov.querySelector('#paper, .paper');
    const pintar = () => { const p = paper(); const interno = p && p.classList.contains('ci-interno'); b.disabled = !!interno; b.textContent = interno ? 'Al libro va la versión para la empresa' : enLibro.has(titulo()) ? 'En el libro ✓ · actualizar' : 'Añadir al libro'; };
    b.onclick = async () => {
      const p = paper(); if (!p) return;
      b.disabled = true; b.textContent = 'Guardando…';
      try {
        await L.anadir({ t: titulo(), clave: (ov.dataset.clave || titulo()), mundo: MUNDO[pagina()] || 'estrategia', html: p.innerHTML, cls: p.className.replace(/\b(pdf-doc|ci-interno)\b/g, '').trim() });
        enLibro.add(titulo()); b.textContent = 'En el libro ✓ · actualizar';
      } catch (e) { b.textContent = 'No cabe en el libro'; b.title = e.message; alert(e.message); }
      b.disabled = false;
    };
    const pdf = $('#rpPdf, #repPdf', bar); if (pdf) bar.insertBefore(b, pdf); else bar.appendChild(b);
    pintar();
    bar.addEventListener('click', () => setTimeout(pintar, 50));
  };
  const vigilar = () => {
    const mo = new MutationObserver(() => { const ov = document.getElementById('report'); if (ov && !ov.hidden) boton(ov); });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  };
  // La clave del informe (si la tiene) viaja con él para no duplicarlo en el libro
  const engancharOpen = () => {
    const I = A.informe; if (!I || I.__libro) return; const orig = I.open; I.__libro = true;
    I.open = function (o) {
      if (L.captura) { L.captura.push({ t: o.barra || o.titulo || 'Informe', clave: o.clave || o.barra || o.titulo, html: o.html, cls: o.paginado ? 'pp-doc' : '' }); return; }
      const r = orig.apply(this, arguments); const ov = document.getElementById('report'); if (ov) ov.dataset.clave = o.clave || o.barra || o.titulo || ''; return r;
    };
  };

  /* ---------- Recogida automática de los informes de un mundo ---------- */
  const COLA = 'atalaya.libro.cola';
  const ss = { get: () => { try { return JSON.parse(sessionStorage.getItem(COLA)); } catch (e) { return null; } }, set: (v) => { try { sessionStorage.setItem(COLA, JSON.stringify(v)); } catch (e) { /* nada */ } }, del: () => { try { sessionStorage.removeItem(COLA); } catch (e) { /* nada */ } } };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const hasta = async (fn, max) => { for (let i = 0; i < (max || 60); i++) { try { if (fn()) return true; } catch (e) { /* aún no */ } await espera(150); } return false; };
  let aviso = null;
  const progreso = (t) => { if (!aviso) { aviso = document.createElement('div'); aviso.className = 'lb-prog glass'; document.body.appendChild(aviso); } aviso.innerHTML = `<b>Preparando el libro corporativo</b><span>${t}</span>`; };
  // Ejecuta un generador de informes con la captura activa y devuelve lo capturado
  const capturar = async (fn) => {
    L.captura = [];
    try { const r = fn(); if (r && r.then) await r; await hasta(() => L.captura.length, 25); } catch (e) { console.error(e); }
    const c = L.captura; L.captura = null; return c;
  };
  L.recoger = async (mundo) => {
    engancharOpen();
    const lib = await L.cargar(); let n = 0;
    const meter = async (lista) => { for (const c of lista) { await L.anadir(Object.assign({ mundo }, c), lib); n++; } };
    if (mundo === 'estrategia') {
      const S = A.strat; await hasta(() => S && S.state && S.modules && S.modules.length, 80);
      [A.rutaEst].forEach((r) => r && r.closeMap && r.closeMap());
      const mods = S.modules.filter((m) => m.id !== 'origen');
      for (let i = 0; i < mods.length; i++) {
        const m = mods[i]; progreso(`Sistema estratégico · ${m.nombre} (${i + 1} de ${mods.length})`);
        try { S.show(m.id); await espera(120); await meter(await capturar(() => (S.report360 ? S.report360(m) : S.moduleReport(m)))); } catch (e) { console.error(e); }
      }
    } else if (mundo === 'personas') {
      const R = A.personas; await hasta(() => R && R.state, 80);
      if (P() && P().puede && !P().puede('personas')) return 0;
      [A.rutaPer].forEach((r) => r && r.closeMap && r.closeMap());
      if (R.state.personas.length) {
        progreso('Personas y equipos · alineamiento perfiles, puestos y equipos');
        if (R.informeAlineamiento) await meter(await capturar(() => R.informeAlineamiento()));
        progreso('Personas y equipos · foto de toda la empresa');
        if (R.informeEquipoCompleto) await meter(await capturar(() => R.informeEquipoCompleto(R.state.personas.map((p) => p.id), 'Toda la empresa')));
        for (const q of R.state.equipos || []) { progreso('Personas y equipos · equipo ' + q.nombre); await meter(await capturar(() => R.informeEquipoCompleto(q.miembros || [], q.nombre, q.objetivo))); }
      }
    } else if (mundo === 'mesa') {
      await hasta(() => A.mesa && A.mesa.informe && A.mesa.listo, 80); progreso('Mesa de trabajo · plan de trabajo');
      await meter(await capturar(() => A.mesa.informe()));
    } else if (mundo === 'simulador') {
      await hasta(() => document.getElementById('openReport') && A.appApi, 120); progreso('Simulador · informe de la inversión');
      document.getElementById('openReport').click();
      await hasta(() => { const p = document.querySelector('#report .paper, #report #paper'); return p && p.innerHTML.length > 2000; }, 80); await espera(400);
      const ov = document.getElementById('report'), p = ov && ov.querySelector('.paper, #paper');
      if (p) await meter([{ t: 'Informe de la inversión', clave: 'simulador:informe', html: p.innerHTML, cls: p.className.replace(/\bpdf-doc\b/g, '') }]);
      const x = ov && ov.querySelector('#repClose, #rpClose, [data-close]'); if (x) x.click(); else if (ov) ov.hidden = true; document.body.style.overflow = '';
    }
    await L.guardar(lib);
    return n;
  };
  /* Cola de mundos pedida desde la página del libro: cada mundo recoge lo suyo y pasa al siguiente */
  L.recogerTodo = (mundos) => { ss.set({ cola: mundos.slice(), hechos: {}, inicio: Date.now() }); location.href = URL[mundos[0]] + '?libro=1'; };
  const seguirCola = async () => {
    const q = ss.get(); const m = MUNDO[pagina()];
    if (!q || !q.cola || !q.cola.length || q.cola[0] !== m || Date.now() - q.inicio > 15 * 60000) return;
    progreso('Abriendo ' + (SECCION[m] || m).toLowerCase() + '…');
    await espera(1800);
    let n = 0, err = '';
    try { n = await L.recoger(m); } catch (e) { err = e.message; console.error(e); }
    q.hechos[m] = err ? 'Error: ' + err : n; q.cola.shift(); ss.set(q);
    if (err && /máximo/.test(err)) { q.cola = []; ss.set(q); }
    location.href = q.cola.length ? URL[q.cola[0]] + '?libro=1' : 'libro.html#recogido';
  };
  L.resultadoCola = () => { const q = ss.get(); ss.del(); return q; };

  const iniciar = () => { engancharOpen(); if (MUNDO[pagina()]) { vigilar(); seguirCola(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
