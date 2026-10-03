/* Atalaya 360° · Manual en el lateral
   Una pestaña fija en el borde derecho abre el manual en un panel, sin salir de la pantalla, y lo abre
   directamente en el apartado de la zona en la que se está (módulo, capítulo o pestaña). Arriba, un menú
   para saltar a cualquier apartado y un buscador. Los enlaces a «manual.html» de la página se abren aquí;
   con Ctrl o Cmd siguen abriéndose en una página aparte.
   A.manualLateral.abrir('#id' | null) · cerrar() · alternar() · abierto() · temas() */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pagina = () => (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');

  /* ---------- El apartado del manual que corresponde a donde está el usuario ---------- */
  const SIM = { puente: 'sim-empresa', empresa: 'sim-empresa', historia: 'sim-historia', inversion: 'sim-inversion', horizonte: 'sim-horizonte', escenarios: 'sim-escenarios', riesgos: 'sim-semaforos', tamano: 'sim-tamano', humano: 'sim-humano', estructuras: 'sim-estructuras', plan: 'sim-plan', diccionario: 'sim-dicc', informe: 'sim-informe' };
  const EST = { 'Visión': 'est-vision', Finanzas: 'est-finanzas', Comercial: 'est-comercial', Operaciones: 'est-operaciones', Estrategia: 'est-estrategia' };
  const PER_ID = { identidad: 'per-identidad', envios: 'per-distancia' };
  const PER = { 'Visión': 'personas', Herramientas: 'per-herramientas', Estructura: 'per-estructura', Equipos: 'per-equipos', Liderazgo: 'per-liderazgo', Desarrollo: 'per-desarrollo' };
  const MESA = { hoy: 'mesa-hoy', bandeja: 'mesa-hoy', prioridades: 'mesa-prioridades', agenda: 'mesa-prioridades', metas: 'mesa-metas', repetitivas: 'mesa-rutinas', reuniones: 'mesa-rutinas' };
  const capituloSim = () => {
    let id = null;
    document.querySelectorAll('section.chapter[id]').forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.45) id = s.id; });
    return id;
  };
  const contexto = () => {
    try {
      if (typeof A.manualCtx === 'function') { const c = A.manualCtx(); if (c) return c; }
      const p = pagina();
      if (p === 'app.html') return SIM[capituloSim()] || 'simulador';
      if (p === 'estrategia.html' && A.strat && A.strat.current) { const m = A.strat.mod && A.strat.mod(A.strat.current()); return (m && EST[m.grupo]) || 'estrategia'; }
      if (p === 'personas.html' && A.personas && A.personas.current) { const id = A.personas.current(), m = A.personas.mod && A.personas.mod(id); return PER_ID[id] || (m && PER[m.grupo]) || 'personas'; }
      if (p === 'mesa.html') return MESA[location.hash.slice(1)] || 'mesa';
      if (p === 'intervencion.html') return ({ guion: 'iv-primera', constantes: 'iv-primera', escucha: 'iv-escucha', sintomas: 'iv-escucha', triaje: 'iv-primera', auditoria: 'iv-auditoria', ecosistema: 'iv-auditoria', plan: 'iv-plan', sesiones: 'iv-plan', informes: 'iv-plan' })[location.hash.slice(1)] || 'intervencion';
      if (p === 'grupo.html') return 'modos';
      if (p === 'portal.html') return 'navegar';
    } catch (e) { /* sin contexto */ }
    return 'que-es';
  };

  /* ---------- Panel ---------- */
  let wrap = null, frame = null, listo = false, pendiente = null, temas = [];
  const construir = () => {
    if (wrap) return;
    wrap = document.createElement('div');
    wrap.className = 'ml-wrap';
    wrap.innerHTML = `<button class="ml-tab" id="mlTab" aria-controls="mlPanel" aria-expanded="false" title="Abrir el manual en esta pantalla"><span>Manual</span></button>
      <aside class="ml-panel" id="mlPanel" hidden aria-label="Manual de uso">
        <header class="ml-head">
          <div class="ml-row"><b class="ml-tt">Manual <span>360°</span></b><span class="ml-sp"></span><a class="btn ghost small" id="mlFull" href="manual.html" target="_blank" rel="noopener" title="Abrir el manual en una página aparte">Página completa</a><button class="icon-btn" id="mlX" aria-label="Cerrar el manual">×</button></div>
          <div class="ml-row"><select class="input" id="mlIr" aria-label="Ir a un apartado del manual"><option>Cargando el índice…</option></select></div>
          <div class="ml-row"><input class="input" id="mlQ" type="search" placeholder="Buscar en el manual (p. ej. póliza, DAFO, SMART)" aria-label="Buscar en el manual"></div>
        </header>
        <iframe id="mlFrame" title="Manual de Atalaya 360°" loading="lazy"></iframe>
      </aside>`;
    document.body.appendChild(wrap);
    frame = $('#mlFrame', wrap);
    $('#mlTab', wrap).onclick = () => alternar();
    $('#mlX', wrap).onclick = () => cerrar();
    $('#mlIr', wrap).onchange = (e) => ir(e.target.value);
    $('#mlQ', wrap).oninput = (e) => { const d = doc(); const q = d && d.getElementById('q'); if (q) { q.value = e.target.value; q.dispatchEvent(new Event('input')); d.scrollingElement && d.scrollingElement.scrollTo({ top: 0 }); } };
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
    frame.addEventListener('load', alCargar);
  };
  const doc = () => { try { return frame && frame.contentDocument; } catch (e) { return null; } };
  const alCargar = () => {
    const d = doc(); if (!d) return;
    listo = true;
    // Índice para el menú de arriba: apartados (h2) y subapartados (h3 con id)
    temas = [];
    d.querySelectorAll('main section[id]').forEach((s) => {
      const h = s.querySelector('h2'); if (!h) return;
      const g = { id: s.id, t: h.textContent.replace(/^\s*\d+\s*/, '').trim(), n: (h.querySelector('.num') || {}).textContent || '', sub: [] };
      s.querySelectorAll('h3[id]').forEach((x) => g.sub.push({ id: x.id, t: x.textContent.trim() }));
      temas.push(g);
    });
    $('#mlIr', wrap).innerHTML = temas.map((g) => `<optgroup label="${esc((g.n ? g.n + '. ' : '') + g.t)}"><option value="${g.id}">${esc(g.t)} · inicio</option>${g.sub.map((x) => `<option value="${x.id}">${esc(x.t)}</option>`).join('')}</optgroup>`).join('');
    // Los enlaces del manual a otras páginas de la aplicación se abren en la ventana principal
    d.addEventListener('click', (e) => { const a = e.target.closest('a[href]'); if (!a) return; const h = a.getAttribute('href'); if (h.startsWith('#')) return; e.preventDefault(); cerrar(); location.href = h; });
    if (pendiente) { ir(pendiente); pendiente = null; }
  };
  const ir = (id) => {
    id = String(id || '').replace(/^#/, '');
    if (!id) return;
    const d = doc();
    if (!listo || !d) { pendiente = id; return; }
    // El manual comprueba el acceso antes de mostrarse: hasta entonces no se puede desplazar
    const w = d.getElementById('wrap'); if (w && w.hidden) { setTimeout(() => ir(id), 150); return; }
    const el = d.getElementById(id);
    if (el) { el.scrollIntoView({ block: 'start' }); const s = $('#mlIr', wrap); if ([...s.options].some((o) => o.value === id)) s.value = id; }
    $('#mlFull', wrap).href = 'manual.html#' + id;
  };
  const abrir = (id) => {
    construir();
    const p = $('#mlPanel', wrap), destino = String(id || contexto()).replace(/^#/, '');
    p.hidden = false; wrap.classList.add('on'); $('#mlTab', wrap).setAttribute('aria-expanded', 'true');
    if (!frame.src) frame.src = 'manual.html?embed=1#' + destino;
    ir(destino);
    return destino;
  };
  const cerrar = () => { if (!wrap) return; $('#mlPanel', wrap).hidden = true; wrap.classList.remove('on'); $('#mlTab', wrap).setAttribute('aria-expanded', 'false'); };
  const abierto = () => !!(wrap && !$('#mlPanel', wrap).hidden);
  const alternar = () => (abierto() ? cerrar() : abrir());
  /* Busca el apartado que mejor encaja con un tema dicho en palabras («la agenda», «metas smart», «semáforos») */
  const buscar = (tema) => {
    const t = norm(tema).replace(/^(el|la|los|las|de|del)\s+/, '');
    if (!t) return null;
    let mejor = null, pt = 0;
    temas.forEach((g) => [{ id: g.id, t: g.t }].concat(g.sub).forEach((x) => {
      const n = norm(x.t); let p = 0;
      if (n.includes(t)) p = 10 + t.length; else t.split(/\s+/).filter((w) => w.length > 3).forEach((w) => { if (n.includes(w)) p += w.length; });
      if (p > pt) { pt = p; mejor = x.id; }
    }));
    return mejor;
  };
  A.manualLateral = {
    abrir, cerrar, alternar, abierto, contexto,
    // Para el asistente: abre el manual en el apartado de un tema (o en el de la zona actual)
    async abrirTema(tema) {
      abrir();
      for (let i = 0; i < 40 && !listo; i++) await new Promise((r) => setTimeout(r, 100));
      const id = (tema && buscar(tema)) || contexto();
      ir(id);
      const x = temas.flatMap((g) => [{ id: g.id, t: g.t }].concat(g.sub)).find((y) => y.id === id);
      return { abierto: true, apartado: x ? x.t : id };
    },
    temas: () => temas.map((g) => ({ id: g.id, titulo: g.t, subapartados: g.sub.map((x) => x.t) }))
  };

  const iniciar = () => {
    if (pagina() === 'manual.html' || window.top !== window.self) return;
    construir();
    // Los enlaces de la página al manual se abren en el lateral (con Ctrl o Cmd, en una pestaña aparte)
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="manual.html"]');
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault();
      const h = a.getAttribute('href').split('#')[1];
      // Si el enlace va al principio de un mundo, se afina con la zona actual
      abrir(h && !['personas', 'estrategia', 'simulador', 'mesa', 'intervencion'].includes(h) ? h : contexto());
      const menu = a.closest('.acc-menu'); if (menu) menu.hidden = true;
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
