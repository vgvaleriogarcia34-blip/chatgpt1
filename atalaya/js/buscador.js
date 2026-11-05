/* Atalaya · Buscador común
   Ctrl K (Cmd K en Mac) o «/» fuera de un campo de texto, o el botón «Buscar» de la barra superior.
   Busca mundos, áreas y módulos de todos los mundos (js/catalogo.js), las empresas de la cuenta y algunas acciones.
   Sin acentos ni mayúsculas; primero las coincidencias por nombre de módulo. Lo bloqueado por el plan sale con
   candado y, al elegirlo, se explica el plan (Atalaya.platform.bloqueo).
   Cada página puede añadir acciones propias: Atalaya.buscador.acciones.push({ n, d, ir }). */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  if (A.buscador) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const P = () => A.platform;
  const pagina = () => (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // Páginas que abren su módulo al cambiar el #: en las demás se recarga
  const OYEN_HASH = ['portal.html', 'estrategia.html', 'personas.html', 'intervencion.html', 'app.html', 'mesa.html', 'tablero.html', 'grupo.html', 'libro.html'];
  const acciones = [];
  let velo = null, input = null, lista = null, res = [], sel = 0, previo = null;

  const mac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const bloquear = (mk) => { if (P() && P().bloqueo) P().bloqueo(mk); };

  function irModulo(x) {
    if (x.mundo.lock) { bloquear(x.mundo.k); return; }
    if (A.archivador && A.archivador.irA && A.archivador.irA(x.mundo.k, x.k)) return;
    const [pg, h] = x.href.split('#');
    if (pg.toLowerCase() === pagina() && h) {
      // Ya en ese #: se avisa igual a la página (el puesto de mando lleva otra vez a esa parte de su archivador)
      if (location.hash === '#' + h) { try { dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { /* nada */ } return; }
      location.hash = h; if (!OYEN_HASH.includes(pagina())) location.reload();
      return;
    }
    location.href = x.href;
  }
  function irMundo(m) { if (m.lock) { bloquear(m.k); return; } if (P() && P().abrirMundo) P().abrirMundo(m.k); else location.href = m.href; }

  const accionesBase = () => [
    { n: 'Nueva tarea en la mesa de trabajo', d: 'Mesa de trabajo › Bandeja', c: '#199e70', ir: () => irModulo({ mundo: { k: 'mesa' }, k: 'bandeja', href: 'mesa.html#bandeja' }) },
    { n: 'Cambiar de empresa', d: 'Selector de empresa de la barra superior', c: '#c9f24d', ir: () => { const b = document.querySelector('.topbar .emp-btn'); if (b) b.click(); else location.href = 'portal.html#empresas'; } },
    { n: 'Abrir el manual de uso', d: 'Cómo se usa cada mundo', c: '#9ba4ba', ir: () => { location.href = 'manual.html'; } }
  ].concat(acciones);

  /* Puntuación de un texto: 0 empieza igual, 1 una palabra empieza igual, 2 lo contiene; -1 no está */
  function rango(texto, q) { const t = norm(texto); if (!q) return 3; if (t.startsWith(q)) return 0; if ((' ' + t).includes(' ' + q)) return 1; if (t.includes(q)) return 2; return -1; }
  // Ruta de un módulo: «Mundo › 3. Fase › Bloque» (el número, solo en los mundos por fases)
  function ruta(x) {
    if (x.mundo.unico) return x.mundo.n;
    const i = x.mundo.areas ? x.mundo.areas.indexOf(x.area) : -1;
    return [x.mundo.n, (x.mundo.secuencial && i >= 0 ? `${i + 1}. ` : '') + x.area.n, x.bloque && x.bloque.n].filter(Boolean).join(' › ');
  }
  function buscar() {
    const q = norm(input.value), C = A.catalogo;
    const mundos = C ? C.mundos() : [];
    let out = [];
    if (!q) {
      const ab = (A.archivador && A.archivador.abiertos ? A.archivador.abiertos() : (() => { try { return JSON.parse(localStorage.getItem('atalaya.abiertos')) || []; } catch (e) { return []; } })());
      ab.forEach((x) => { const m = mundos.find((y) => y.k === x.m); if (m) out.push({ g: 'Abiertos', t: x.n, d: m.n, c: m.c, lock: m.lock, ir: () => irModulo({ mundo: m, k: x.k, href: x.href }) }); });
      accionesBase().forEach((a) => out.push({ g: 'Acciones', t: a.n, d: a.d || 'Acción', c: a.c || '#69707c', ir: a.ir }));
    } else {
      // Módulos: primero por su nombre; después por área, mundo o la pregunta que responde
      const mods = (C ? C.modulos() : []).filter((x) => !x.mundo.unico || x.k).map((x) => {
        const r = rango(x.n, q), r2 = r < 0 ? (norm(x.area.n + ' ' + (x.bloque ? x.bloque.n + ' ' : '') + x.mundo.n + ' ' + (x.pregunta || '')).includes(q) ? 5 : -1) : r;
        return { x, r: r2 };
      }).filter((o) => o.r >= 0).sort((a, b) => a.r - b.r || a.x.n.length - b.x.n.length).slice(0, 12);
      mods.forEach(({ x }) => out.push({ g: 'Módulos', t: x.n, d: ruta(x), c: x.mundo.c, lock: x.mundo.lock, ir: () => irModulo(x) }));
      mundos.map((m) => ({ m, r: rango(m.n, q) })).filter((o) => o.r >= 0).sort((a, b) => a.r - b.r).forEach(({ m }) => out.push({ g: 'Mundos', t: m.n, d: m.d || '', c: m.c, lock: m.lock, ir: () => irMundo(m) }));
      mundos.forEach((m) => { if (m.unico) return; m.areas.forEach((a, i) => {
        const fase = m.secuencial ? `${i + 1}. ` : '';
        if (rango(a.n, q) >= 0) out.push({ g: 'Áreas y fases', t: fase + a.n, d: m.n + ' · ' + a.modulos.length + (m.secuencial ? ' pasos' : ' módulos'), c: m.c, lock: m.lock, ir: () => irModulo(Object.assign({ mundo: m }, a.modulos[0])) });
        (a.bloques || []).forEach((b) => { if (rango(b.n, q) >= 0) out.push({ g: 'Áreas y fases', t: b.n, d: m.n + ' › ' + fase + a.n + ' · ' + b.modulos.length + (m.secuencial ? ' pasos' : ' módulos'), c: m.c, lock: m.lock, ir: () => irModulo(Object.assign({ mundo: m }, b.modulos[0])) }); });
      }); });
      const ems = P() && P().empresas && P().empresas.lista ? P().empresas.lista() : [], act = P() && P().empresas && P().empresas.activa ? P().empresas.activa() : null;
      ems.filter((e) => rango(e.nombre, q) >= 0).forEach((e) => out.push({ g: 'Empresas', t: e.nombre, d: act && e.id === act.id ? 'Empresa activa' : e.modelo ? 'Empresa modelo · cambiar a esta empresa' : 'Cambiar a esta empresa', c: '#c9f24d', ir: () => { if (!(act && e.id === act.id)) P().empresas.cambiar(e.id); } }));
      accionesBase().filter((a) => rango(a.n, q) >= 0 || norm(a.d || '').includes(q)).forEach((a) => out.push({ g: 'Acciones', t: a.n, d: a.d || 'Acción', c: a.c || '#69707c', ir: a.ir }));
    }
    res = out; sel = 0; pintar();
  }
  function pintar() {
    let g = null;
    lista.innerHTML = res.length ? res.map((r, i) => `${r.g !== g ? `<div class="bs-grupo" role="presentation">${esc((g = r.g))}</div>` : ''}<div class="bs-op" role="option" id="bsOp${i}" data-i="${i}" aria-selected="${i === sel}"><i style="background:${esc(r.c)}" aria-hidden="true"></i><span><b>${esc(r.t)}</b>${r.d ? `<small>${esc(r.d)}</small>` : ''}</span>${r.lock ? '<span class="bs-lock" title="Incluido en otro plan">🔒<span class="bs-sr"> bloqueado por el plan</span></span>' : ''}</div>`).join('')
      : `<p class="bs-nada">Sin resultados para «${esc(input.value)}». Pruebe con otra palabra, por ejemplo «cobros» o «tesorería».</p>`;
    input.setAttribute('aria-activedescendant', res.length ? 'bsOp' + sel : '');
    lista.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => elegir(+b.dataset.i); b.onmousemove = () => { if (sel !== +b.dataset.i) { sel = +b.dataset.i; marcar(); } }; });
    marcar();
  }
  function marcar() {
    lista.querySelectorAll('[data-i]').forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.i === sel)));
    input.setAttribute('aria-activedescendant', res.length ? 'bsOp' + sel : '');
    const s = lista.querySelector('[aria-selected="true"]'); if (s) s.scrollIntoView({ block: 'nearest' });
  }
  function elegir(i) { const r = res[i]; if (!r) return; cerrar(false); try { r.ir(); } catch (e) { console.error(e); } }

  function construir() {
    velo = document.createElement('div'); velo.className = 'bs-velo'; velo.hidden = true;
    velo.innerHTML = `<div class="bs-caja" role="dialog" aria-modal="true" aria-label="Buscar en Atalaya">
      <div class="bs-campo"><span aria-hidden="true">⌕</span><input type="text" role="combobox" aria-expanded="true" aria-controls="bsLista" aria-autocomplete="list" aria-label="Buscar un mundo, un módulo, una empresa o una acción" placeholder="Busque un módulo, un mundo o una empresa…" autocomplete="off" spellcheck="false"><button type="button" class="bs-x" aria-label="Cerrar el buscador">Esc</button></div>
      <div class="bs-lista" id="bsLista" role="listbox" aria-label="Resultados"></div>
      <div class="bs-pie"><span>↑ ↓ para moverse</span><span>Intro para abrir</span><span>Esc para cerrar</span></div></div>`;
    document.body.appendChild(velo);
    input = velo.querySelector('input'); lista = velo.querySelector('.bs-lista');
    velo.addEventListener('mousedown', (e) => { if (e.target === velo) cerrar(true); });
    velo.querySelector('.bs-x').onclick = () => cerrar(true);
    input.addEventListener('input', buscar);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (res.length) { sel = (sel + 1) % res.length; marcar(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (res.length) { sel = (sel - 1 + res.length) % res.length; marcar(); } }
      else if (e.key === 'Enter') { e.preventDefault(); elegir(sel); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(true); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
  }
  function abrir() {
    if (!velo) construir();
    if (!velo.hidden) { input.focus(); return; }
    previo = document.activeElement;
    velo.hidden = false; document.body.classList.add('bs-abierto');
    input.value = ''; buscar(); input.focus();
  }
  function cerrar(devolver) {
    if (!velo || velo.hidden) return;
    velo.hidden = true; document.body.classList.remove('bs-abierto');
    if (devolver && previo && previo.focus && document.contains(previo)) previo.focus();
  }

  /* Botón de la barra superior (lo pone js/platform.js en cada barra común) */
  function montar(bar) {
    bar = bar || document.querySelector('.topbar, .pt-top'); if (!bar || bar.querySelector('.bs-btn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bs-btn';
    b.setAttribute('aria-label', 'Buscar en Atalaya (' + (mac() ? 'Cmd' : 'Ctrl') + ' K)'); b.title = 'Buscar (' + (mac() ? '⌘' : 'Ctrl') + ' K o /)';
    b.innerHTML = `<span class="bs-ico" aria-hidden="true">⌕</span><span class="bs-t">Buscar</span><kbd>${mac() ? '⌘' : 'Ctrl'} K</kbd>`;
    b.onclick = (e) => { e.stopPropagation(); abrir(); };
    const acc = bar.querySelector('.account'), nt = bar.querySelector('.nt-chip');
    const ref = nt && nt.parentNode === bar ? nt : acc && acc.parentNode === bar ? acc : null;
    if (ref) bar.insertBefore(b, ref); else bar.appendChild(b);
  }

  document.addEventListener('keydown', (e) => {
    const t = e.target, escribe = t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable);
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey) && !e.altKey) { e.preventDefault(); if (velo && !velo.hidden) cerrar(true); else abrir(); }
    else if (e.key === '/' && !escribe && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); abrir(); }
  });

  A.buscador = { abrir, cerrar, montar, acciones, norm };
})();
