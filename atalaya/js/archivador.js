/* Atalaya · Archivador: navegación común de los mundos
   Cuatro niveles con los mismos nombres en todos los mundos: Mundo → Área (o fase, si es secuencial) → Módulo → Vista.
   Pinta, alrededor del contenido de la página:
     a) el archivador lateral (mundos con su solapa de color; el actual abierto con sus áreas y módulos), plegable;
        en pantallas de 860 px o menos es un cajón que se abre con el botón «Áreas» (icono de carpeta) de la barra superior;
     b) la ruta «Empresa › Mundo › Área › Módulo», cada tramo con sus hermanos;
     c) los módulos del área actual como pestañas;
     d) «Abiertos»: los cinco últimos módulos visitados de cualquier mundo;
     e) el pie «← anterior · N de M en Área · Siguiente: X →» (en los mundos por fases, «Paso N de M» de todo el mundo).
   Uso:
     const arch = Atalaya.archivador.montar({
       mundo: 'est',                       // clave de Atalaya.platform.MUNDOS
       areas: [{ k, n, modulos: [{ k, n, pregunta }] }],   // o una función que las devuelve (se relee al refrescar)
                                           // un área puede agrupar sus módulos en bloques en lugar de «modulos»:
                                           //   { k, n, bloques: [{ k, n, estado: 'Contratado', tono: 'hecho'|'curso'|'', modulos }] }
       actual: () => 'cobros',             // módulo abierto
       ir: (k) => abrirModulo(k),          // abrir otro módulo de este mundo (sin recargar)
       secuencial: false,                  // true: las áreas son fases (numeradas) y el pie cuenta pasos de todo el mundo
       estado: (k) => 'hecho',             // opcional: 'hecho' | 'curso' | '' de cada módulo; pinta su punto y el «h/n» de cada fase
       recorrido: false,                   // opcional (por fases): al pie, el recorrido completo con sus fases y bloques
                                           // un módulo puede llevar «cuenta» (y «cuentaT», su lectura: «12 pendientes»):
                                           //   un número pequeño junto a su nombre en las pestañas y en el archivador
       aparte: [{ k, n, pregunta }],       // opcional: módulos fuera del recorrido (no cuentan en «Paso N de M»); van al final
                                           //   del archivador con su propio título y, abiertos, su pie lleva de vuelta al recorrido
       hechoN: 'hecho',                    // opcional: cómo se llama el estado verde ('visitado' si el mundo no tiene otro criterio)
       antes: elemento,                    // la ruta, «Abiertos» y las pestañas se colocan justo antes
       panel: () => elemento               // contenedor del módulo: el pie se añade al final
     });
     arch.refrescar();                     // después de pintar cada módulo
   Los otros mundos salen del catálogo (js/catalogo.js). */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };
  const K_PLEGADO = 'atalaya.arch.plegado', K_ABIERTOS = 'atalaya.abiertos', N_ABIERTOS = 5;
  const MOVIL = '(max-width: 860px)';
  const esMovil = () => { try { return matchMedia(MOVIL).matches; } catch (e) { return false; } };
  const P = () => A.platform;
  const Pm = () => (P() && P().MUNDOS) || [];

  let cfg = null, aside = null, velo = null, cab = null, carp = null;
  const abiertosM = new Set(), abiertasA = new Set();
  let menu = null; // tramo de la ruta con los hermanos abiertos
  let AR = []; // áreas de este mundo, ya normalizadas (los bloques, aplanados en «modulos»)
  const abiertasF = new Set(); // fases desplegadas en el recorrido completo del pie
  const APN = 'Fuera del recorrido';
  let AP = null; // módulos aparte de este mundo (fuera del recorrido), como un área sin número
  let ultimoRec = null; // último módulo del recorrido abierto: el pie de un módulo aparte lleva de vuelta a él

  /* ---------- Datos ---------- */
  const mundoCat = (k) => (A.catalogo && A.catalogo.mundo(k)) || Object.assign({ areas: [] }, Pm().find((m) => m.k === k) || { k, n: k, c: '#9ba4ba' });
  const mundosCat = () => (A.catalogo ? A.catalogo.mundos() : (P() && P().mundos ? P().mundos() : Pm()).map((m) => mundoCat(m.k)));
  const este = () => mundoCat(cfg.mundo);
  const hrefDe = (k) => este().href + '#' + k;
  // Un área con bloques: sus módulos son los de todos sus bloques, en orden, y cada uno sabe su bloque
  const normalizar = (areas) => (areas || []).map((a) => {
    if (!a.bloques) return a;
    const bloques = a.bloques.map((b) => Object.assign({}, b));
    bloques.forEach((b) => { b.modulos = (b.modulos || []).map((m) => Object.assign({}, m, { bloque: b })); });
    return Object.assign({}, a, { bloques, modulos: bloques.flatMap((b) => b.modulos) });
  });
  const leerAreas = () => {
    AR = normalizar(typeof cfg.areas === 'function' ? cfg.areas() : cfg.areas);
    const ap = typeof cfg.aparte === 'function' ? cfg.aparte() : cfg.aparte;
    AP = ap && ap.length ? { k: 'aparte', n: APN, aparte: true, modulos: [] } : null;
    if (AP) AP.modulos = ap.map((m) => Object.assign({}, m, { aparte: true }));
  };
  const orden = () => AR.flatMap((a) => a.modulos.map((m) => Object.assign({ area: a }, m)));
  const apDe = (k) => (AP ? AP.modulos.find((m) => m.k === k) : null);
  const areaDe = (k) => AR.find((a) => a.modulos.some((m) => m.k === k)) || (apDe(k) ? AP : AR[0]);
  const modDe = (k) => orden().find((m) => m.k === k) || (apDe(k) ? Object.assign({ area: AP }, apDe(k)) : undefined);
  const nArea = (a) => (cfg.secuencial && !a.aparte ? `${AR.indexOf(a) + 1}. ` : '') + a.n;
  // Estado de cada módulo (solo si el mundo lo da): punto verde hecho, ámbar en curso
  const estDe = (k) => { if (!cfg.estado) return ''; try { const e = cfg.estado(k); return e === 'hecho' || e === 'curso' ? e : ''; } catch (e) { return ''; } };
  const ESTN = { get hecho() { return (cfg && cfg.hechoN) || 'hecho'; }, curso: 'en curso' };
  const hechosN = () => ESTN.hecho + 's';
  const punto = (k) => (cfg.estado && !apDe(k) ? `<span class="ar-est ${estDe(k)}" aria-hidden="true"></span>` : '');
  const srEst = (k) => (estDe(k) && !apDe(k) ? `<span class="ar-sr"> (${ESTN[estDe(k)]})</span>` : '');
  // Contador de un módulo (por ejemplo, las tareas pendientes de la bandeja)
  const cuenta = (x) => (x && x.cuenta != null && x.cuenta !== '' ? ` <small class="ar-cuenta"${x.cuentaT ? ` aria-label="${esc(x.cuentaT)}"` : ''}>${esc(x.cuenta)}</small>` : '');
  const avance = (a) => { const h = a.modulos.filter((x) => estDe(x.k) === 'hecho').length; return { h, n: a.modulos.length, todo: !!a.modulos.length && h === a.modulos.length }; };
  const tipoN = (m) => (m.unico ? '' : m.secuencial ? 'Por fases' : 'Por áreas');
  const empresa = () => { const p = P(); const e = p && p.empresas && p.empresas.activa && p.empresas.activa(); return e ? e.nombre : ''; };
  const planN = (m) => { const p = P(); const pl = p && p.PLANES && m.plan && p.PLANES[m.plan]; return pl ? pl.nombre : ''; };

  /* Abre un módulo de otro mundo (o de este): respeta el plan */
  function navegar(mk, href, k) {
    const m = mundosCat().find((x) => x.k === mk);
    if (m && m.lock) { if (P() && P().bloqueo) P().bloqueo(mk); return; }
    if (cfg && mk === cfg.mundo && k && modDe(k)) { cfg.ir(k); return; }
    location.href = href || (m && m.href) || 'portal.html';
  }

  /* ---------- Abiertos ---------- */
  const abiertos = () => { const l = LS.get(K_ABIERTOS); return Array.isArray(l) ? l.filter((x) => x && x.m && x.n) : []; };
  function apuntar(k) {
    const m = modDe(k); if (!m) return;
    const l = abiertos().filter((x) => !(x.m === cfg.mundo && x.k === k));
    l.unshift({ m: cfg.mundo, k, n: m.n, href: hrefDe(k), t: Date.now() });
    LS.set(K_ABIERTOS, l.slice(0, N_ABIERTOS));
  }

  /* ---------- a) Archivador lateral ---------- */
  function pintarArch() {
    const act = cfg.actual(), plegado = document.body.classList.contains('arch-plegado') && !esMovil();
    const mods = (m, lista) => lista.map((x) => {
      const cur = m.k === cfg.mundo && x.k === act;
      return `<li><a href="${esc(x.href || hrefDe(x.k))}" data-m="${esc(m.k)}" data-k="${esc(x.k)}"${cur ? ' aria-current="page"' : ''}${x.pregunta ? ` title="${esc(x.pregunta)}"` : ''}>${m.k === cfg.mundo ? punto(x.k) : ''}${esc(x.n)}${m.k === cfg.mundo ? srEst(x.k) + cuenta(x) : ''}</a></li>`;
    }).join('');
    // Hojas de un área: sus módulos o, si tiene bloques, cada bloque con su nombre y su estado
    const hojas = (m, a) => (a.bloques
      ? a.bloques.map((b) => `<div class="ar-bloque"><div class="ar-bcab">${esc(b.n)}${b.estado ? ` <small class="ar-bst ${esc(b.tono || '')}">${esc(b.estado)}</small>` : ''}</div><ul class="ar-hojas">${mods(m, b.modulos)}</ul></div>`).join('')
      : `<ul class="ar-hojas">${mods(m, a.modulos)}</ul>`);
    aside.innerHTML = `<div class="ar-top"><span class="ar-h">Mundos</span><button type="button" class="ar-plegar" aria-expanded="${!plegado}" aria-label="${esMovil() ? 'Cerrar las áreas' : plegado ? 'Desplegar el archivador' : 'Plegar el archivador'}" title="${esMovil() ? 'Cerrar' : plegado ? 'Desplegar' : 'Plegar'}">${esMovil() ? '×' : plegado ? '»' : '«'}</button></div>
      <nav class="ar-lista" aria-label="Mundos, áreas y módulos">${mundosCat().map((m) => {
        const cur = m.k === cfg.mundo, open = !plegado && !m.unico && !m.lock && abiertosM.has(m.k);
        const areas = cur ? AR : m.areas;
        const sub = m.lock ? `Incluido en el plan ${planN(m)}` : tipoN(m);
        return `<div class="ar-carpeta${cur ? ' actual' : ''}${open ? ' abierta' : ''}" style="--wc:${esc(m.c)}">
          <button type="button" class="ar-mundo" data-mundo="${esc(m.k)}"${m.unico || m.lock ? '' : ` aria-expanded="${open}"`}${cur ? ' aria-current="true"' : ''} title="${esc(m.n)}"><span class="ar-solapa" aria-hidden="true"></span><span class="ar-nom">${esc(m.n)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="ar-flecha" aria-hidden="true">${m.lock ? '🔒' : m.unico ? '→' : open ? '▾' : '▸'}</span>${m.lock ? '<span class="ar-sr">(bloqueado por el plan)</span>' : ''}</button>
          ${open ? `<div class="ar-dentro">${areas.map((a) => {
            const ak = m.k + '|' + a.k, ao = abiertasA.has(ak), av = cur && cfg.estado ? avance(a) : null;
            const num = m.secuencial ? (av && av.todo ? '✓' : areas.indexOf(a) + 1) : '';
            const cnt = av ? `<span class="ar-cnt" aria-label="${av.h} de ${av.n} ${hechosN()}">${av.h}/${av.n}</span>` : `<span class="ar-cnt">${a.modulos.length}</span>`;
            return `<div class="ar-area${ao ? ' abierta' : ''}${av && av.todo ? ' hecha' : ''}"><button type="button" class="ar-abtn" data-area="${esc(ak)}" aria-expanded="${ao}"><span class="ar-num" aria-hidden="true">${num}</span><span class="ar-an">${m.secuencial ? `<span class="ar-sr">Fase ${areas.indexOf(a) + 1}${av && av.todo ? ', completa' : ''}: </span>` : ''}${esc(a.n)}</span>${cnt}</button>${ao ? hojas(m, a) : ''}</div>`;
          }).join('')}${(cur ? (AP ? AP.modulos : []) : m.aparte || []).length ? `<div class="ar-aparte"><span class="ar-aph">${APN}</span><ul class="ar-hojas">${mods(m, cur ? AP.modulos : m.aparte)}</ul></div>` : ''}</div>` : ''}
        </div>`;
      }).join('')}</nav>`;
    aside.querySelector('.ar-plegar').onclick = () => { if (esMovil()) cerrarCajon(true); else plegar(!document.body.classList.contains('arch-plegado')); };
    aside.querySelectorAll('[data-mundo]').forEach((b) => b.onclick = () => {
      const m = mundosCat().find((x) => x.k === b.dataset.mundo); if (!m) return;
      if (m.lock) { if (P() && P().bloqueo) P().bloqueo(m.k); return; }
      if (m.unico) { location.href = m.href; return; }
      if (document.body.classList.contains('arch-plegado') && !esMovil()) { plegar(false); abiertosM.add(m.k); pintarArch(); foco(`[data-mundo="${m.k}"]`); return; }
      if (abiertosM.has(m.k)) abiertosM.delete(m.k); else { abiertosM.add(m.k); if (m.k !== cfg.mundo && m.areas[0]) abiertasA.add(m.k + '|' + m.areas[0].k); }
      pintarArch(); foco(`[data-mundo="${m.k}"]`);
    });
    aside.querySelectorAll('[data-area]').forEach((b) => b.onclick = () => { const k = b.dataset.area; if (abiertasA.has(k)) abiertasA.delete(k); else abiertasA.add(k); pintarArch(); foco(`[data-area="${k}"]`); });
    aside.querySelectorAll('a[data-k]').forEach((a) => a.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault(); cerrarCajon(false); navegar(a.dataset.m, a.getAttribute('href'), a.dataset.k);
    }));
  }
  const foco = (sel) => { const el = aside.querySelector(sel); if (el) el.focus({ preventScroll: true }); };
  function plegar(si) {
    document.body.classList.toggle('arch-plegado', si); LS.set(K_PLEGADO, si);
    pintarArch();
  }
  function abrirCajon() {
    pintarArch();
    aside.classList.add('visible'); velo.hidden = false; carp.setAttribute('aria-expanded', 'true');
    document.body.classList.add('arch-cajon');
    setTimeout(() => { const f = aside.querySelector('[aria-current="page"]') || aside.querySelector('button, a'); if (f) f.focus({ preventScroll: false }); }, 30);
  }
  function cerrarCajon(devolverFoco) {
    if (!aside || !aside.classList.contains('visible')) return;
    aside.classList.remove('visible'); velo.hidden = true; carp.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('arch-cajon');
    if (devolverFoco) carp.focus();
  }

  /* ---------- b) Ruta con hermanos ---------- */
  function tramos() {
    const act = cfg.actual(), a = areaDe(act), m = modDe(act), w = este(), b = m && m.bloque;
    const T = [
      { t: empresa() || 'Empresa', cls: 'emp', accion: abrirEmpresas, et: 'Empresa' },
      { t: w.n, color: w.c, et: 'Mundo', herm: mundosCat().map((x) => ({ t: x.n, color: x.c, cur: x.k === cfg.mundo, lock: x.lock, ir: () => navegar(x.k, x.href) })) },
      { t: a ? nArea(a) : '', et: a && a.aparte ? 'Apartado' : cfg.secuencial ? 'Fase' : 'Área', herm: AR.concat(AP && a && a.aparte ? [AP] : []).map((x) => ({ t: nArea(x), cur: x === a, ir: () => cfg.ir(x.modulos[0].k) })) }
    ];
    // Un área con bloques: el bloque es un tramo más, con los otros bloques del área como hermanos
    if (b) T.push({ t: b.n, et: 'Bloque', herm: a.bloques.map((x) => ({ t: x.n + (x.estado ? ' · ' + x.estado : ''), cur: x === b, ir: () => cfg.ir(x.modulos[0].k) })) });
    T.push({ t: m ? m.n : '', et: cfg.secuencial ? 'Paso' : 'Módulo', ultimo: true, herm: (b ? b.modulos : a ? a.modulos : []).map((x) => ({ t: x.n, cur: x.k === act, ir: () => cfg.ir(x.k) })) });
    return T;
  }
  function abrirEmpresas() {
    // El selector de empresa de la barra superior (o la ficha, si la cuenta tiene una sola)
    const b = document.querySelector('.topbar .emp-btn');
    if (b) { b.click(); const mm = document.querySelector('.topbar .emp-menu'); if (mm && !mm.hidden) { const f = mm.querySelector('button, a'); if (f) setTimeout(() => f.focus(), 20); } else b.focus(); }
    else location.href = 'portal.html#empresas';
  }
  function pintarRuta(focoEn) {
    const r = cab.querySelector('.ar-ruta'), T = tramos();
    r.innerHTML = `<ol>${T.map((t, i) => `<li class="ar-miga${t.cls ? ' ' + t.cls : ''}" data-i="${i}">${i ? '<span class="ar-sep" aria-hidden="true">›</span>' : ''}<button type="button" ${t.herm ? `aria-haspopup="true" aria-expanded="${menu === i}"` : ''}${t.ultimo ? ' aria-current="page"' : ''} aria-label="${esc(t.et)}: ${esc(t.t)}${t.herm ? ' · ver los demás' : t.accion ? ' · cambiar' : ''}">${t.color ? `<i style="background:${esc(t.color)}" aria-hidden="true"></i>` : ''}<span class="ar-mt">${esc(t.t)}</span>${t.herm || t.accion ? '<span class="ar-car" aria-hidden="true">▾</span>' : ''}</button>${menu === i && t.herm ? `<div class="ar-herm" role="menu" aria-label="${esc(t.et)}">${t.herm.map((x, j) => `<button type="button" role="menuitem" data-j="${j}"${x.cur ? ' aria-current="true"' : ''}>${x.color ? `<i style="background:${esc(x.color)}" aria-hidden="true"></i>` : ''}<span>${esc(x.t)}</span>${x.lock ? '<span class="ar-lock" aria-label="bloqueado por el plan">🔒</span>' : ''}</button>`).join('')}</div>` : ''}</li>`).join('')}</ol>`;
    r.querySelectorAll('.ar-miga').forEach((li) => {
      const i = +li.dataset.i, t = T[i], b = li.querySelector(':scope > button');
      b.onclick = (e) => {
        e.stopPropagation();
        if (t.accion) { menu = null; pintarRuta(); t.accion(); return; }
        menu = menu === i ? null : i; pintarRuta(menu === i ? 'menu' : i);
      };
      li.querySelectorAll('[data-j]').forEach((x) => x.onclick = (e) => { e.stopPropagation(); const h = t.herm[+x.dataset.j]; menu = null; pintarRuta(i); if (!h.cur) h.ir(); });
      const hm = li.querySelector('.ar-herm');
      if (hm) hm.addEventListener('keydown', (e) => {
        const its = Array.from(hm.querySelectorAll('button')), k = its.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); its[(k + (e.key === 'ArrowDown' ? 1 : its.length - 1)) % its.length].focus(); }
        else if (e.key === 'Home') { e.preventDefault(); its[0].focus(); } else if (e.key === 'End') { e.preventDefault(); its[its.length - 1].focus(); }
        else if (e.key === 'Tab') { menu = null; pintarRuta(); }
      });
    });
    if (focoEn === 'menu') { const hm = r.querySelector('.ar-herm'); const f = hm && (hm.querySelector('[aria-current="true"]') || hm.querySelector('button')); if (f) f.focus(); }
    else if (typeof focoEn === 'number') { const b = r.querySelector(`.ar-miga[data-i="${focoEn}"] > button`); if (b) b.focus(); }
  }

  /* ---------- d) Abiertos ---------- */
  function pintarAbiertos() {
    const host = cab.querySelector('.ar-abiertos'), act = cfg.actual();
    const ms = mundosCat(), l = abiertos().filter((x) => ms.some((m) => m.k === x.m));
    host.hidden = l.length < 2;
    host.innerHTML = `<span class="ar-et" id="arAbEt">Abiertos</span><ul aria-labelledby="arAbEt">${l.map((x, i) => { const m = ms.find((y) => y.k === x.m), cur = x.m === cfg.mundo && x.k === act; return `<li><a href="${esc(x.href)}" data-i="${i}"${cur ? ' aria-current="page"' : ''} title="${esc(m.n)} · ${esc(x.n)}"><i style="background:${esc(m.c)}" aria-hidden="true"></i>${esc(x.n)}</a></li>`; }).join('')}</ul>`;
    host.querySelectorAll('a[data-i]').forEach((a) => a.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault(); const x = l[+a.dataset.i]; if (!(x.m === cfg.mundo && x.k === act)) navegar(x.m, x.href, x.k);
    }));
  }

  /* ---------- c) Pestañas de módulos ---------- */
  function pintarPest() {
    const host = cab.querySelector('.ar-pest'), act = cfg.actual(), a = areaDe(act), pid = panelId();
    if (!a) { host.innerHTML = ''; return; }
    const m = modDe(act), b = m && m.bloque, lista = b ? b.modulos : a.modulos;
    host.setAttribute('aria-label', `${cfg.secuencial ? 'Pasos' : 'Módulos'} de ${b ? b.n : a.n}`);
    host.innerHTML = lista.map((x) => `<button type="button" role="tab" id="arTab-${esc(x.k)}" data-k="${esc(x.k)}" aria-selected="${x.k === act}" tabindex="${x.k === act ? 0 : -1}"${pid ? ` aria-controls="${esc(pid)}"` : ''}${x.pregunta ? ` title="${esc(x.pregunta)}"` : ''}>${punto(x.k)}${esc(x.n)}${srEst(x.k)}${cuenta(x)}</button>`).join('');
    host.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { if (b.dataset.k !== cfg.actual()) cfg.ir(b.dataset.k); });
    const sel = host.querySelector('[aria-selected="true"]'); if (sel && host.scrollWidth > host.clientWidth) host.scrollLeft = Math.max(0, sel.offsetLeft - host.clientWidth / 2 + sel.offsetWidth / 2);
  }
  const panelId = () => { const p = cfg.panel && cfg.panel(); if (!p) return ''; if (p.id) { if (!p.getAttribute('role')) p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'arTab-' + cfg.actual()); } return p.id || ''; };

  /* ---------- e) Pie: anterior · posición · siguiente ---------- */
  function pintarPie() {
    const p = cfg.panel && cfg.panel(); if (!p) return;
    p.querySelectorAll(':scope > .ar-pie, :scope > .ar-recorrido, :scope > .ch-next').forEach((x) => x.remove());
    const O = orden(), act = cfg.actual(), i = O.findIndex((x) => x.k === act);
    if (i < 0) { if (apDe(act)) pintarPieAparte(p, O); return; }
    const a = O[i].area, b = O[i].bloque, enA = a.modulos.findIndex((x) => x.k === act), prev = O[i - 1], next = O[i + 1];
    // Si el anterior o el siguiente está en otra fase (o en otro bloque), se dice cuál
    const otra = (x) => (!x ? '' : x.area !== a ? ` <small>(${esc(nArea(x.area))}${x.bloque ? ' › ' + esc(x.bloque.n) : ''})</small>` : x.bloque && x.bloque !== b ? ` <small>(${esc(x.bloque.n)})</small>` : '');
    const pos = cfg.secuencial ? `Paso ${i + 1} de ${O.length} · ${esc(nArea(a))}${b ? ' › ' + esc(b.n) : ''}` : `${enA + 1} de ${a.modulos.length} en ${esc(a.n)}`;
    if (cfg.recorrido && cfg.secuencial) pintarRecorrido(p, a);
    const d = document.createElement('nav'); d.className = 'ar-pie'; d.setAttribute('aria-label', cfg.secuencial ? 'Paso anterior y siguiente' : 'Módulo anterior y siguiente');
    d.innerHTML = `${prev ? `<button type="button" class="btn ghost ar-ant" data-k="${esc(prev.k)}">← ${esc(prev.n)}${otra(prev)}</button>` : '<span class="ar-hueco"></span>'}<span class="ar-pos">${pos}</span>${next ? `<button type="button" class="btn solid ar-sig" data-k="${esc(next.k)}">Siguiente: ${esc(next.n)}${otra(next)} →</button>` : '<span class="ar-hueco"></span>'}`;
    p.appendChild(d);
    d.querySelectorAll('[data-k]').forEach((x) => x.onclick = () => cfg.ir(x.dataset.k));
  }

  // Un módulo aparte: no es un paso; su pie lleva de vuelta al recorrido (al último paso abierto)
  function pintarPieAparte(p, O) {
    const v = O.find((x) => x.k === ultimoRec) || O[0]; if (!v) return;
    if (cfg.recorrido && cfg.secuencial) pintarRecorrido(p, null);
    const d = document.createElement('nav'); d.className = 'ar-pie'; d.setAttribute('aria-label', 'Volver al recorrido');
    d.innerHTML = `<span class="ar-hueco"></span><span class="ar-pos">${APN} · no cuenta como paso</span><button type="button" class="btn solid ar-sig" data-k="${esc(v.k)}">Volver al recorrido: ${esc(v.n)} <small>(${esc(nArea(v.area))})</small> →</button>`;
    p.appendChild(d);
    d.querySelector('[data-k]').onclick = () => cfg.ir(v.k);
  }

  /* ---------- f) Recorrido completo (mundos por fases): cada fase con su avance; la actual, abierta con sus pasos ---------- */
  function pintarRecorrido(p, aAct) {
    p.querySelectorAll(':scope > .ar-recorrido').forEach((x) => x.remove());
    const act = cfg.actual();
    const chips = (lista) => `<div class="ar-chips">${lista.map((x) => `<button type="button" data-k="${esc(x.k)}"${x.k === act ? ' aria-current="true"' : ''}>${punto(x.k)}${esc(x.n)}${srEst(x.k)}</button>`).join('')}</div>`;
    const s = document.createElement('section'); s.className = 'ar-recorrido'; s.setAttribute('aria-label', 'Recorrido completo');
    s.innerHTML = `<h4 class="ar-rt">Recorrido completo</h4><div class="ar-fases">${AR.map((a, i) => {
      const av = avance(a), ab = a === aAct || abiertasF.has(a.k), id = 'arF-' + i;
      return `<div class="ar-fase${av.todo ? ' hecha' : ''}${a === aAct ? ' actual' : ''}"><button type="button" class="ar-fbtn" data-f="${esc(a.k)}" aria-expanded="${ab}" aria-controls="${id}"><span class="ar-fn" aria-hidden="true">${av.todo ? '✓' : i + 1}</span><span class="ar-ft"><b><span class="ar-sr">Fase ${i + 1}${av.todo ? ', completa' : ''}: </span>${esc(a.n)}</b>${a.d ? `<small>${esc(a.d)}</small>` : ''}</span><span class="ar-fp"><span aria-label="${av.h} de ${av.n} ${hechosN()}">${av.h}/${av.n}</span> <span aria-hidden="true">${ab ? '▾' : '▸'}</span></span></button>${ab ? `<div class="ar-fcuerpo" id="${id}">${a.bloques ? a.bloques.map((b) => `<div class="ar-fbloque"><h5>${esc(b.n)}${b.estado ? ` <small class="ar-bst ${esc(b.tono || '')}">${esc(b.estado)}</small>` : ''}</h5>${chips(b.modulos)}</div>`).join('') : chips(a.modulos)}</div>` : ''}</div>`;
    }).join('')}</div>`;
    p.appendChild(s);
    s.querySelectorAll('[data-f]').forEach((x) => x.onclick = () => {
      const k = x.dataset.f, a = AR.find((y) => y.k === k); if (!a || a === aAct) return;
      if (abiertasF.has(k)) abiertasF.delete(k); else abiertasF.add(k);
      pintarRecorrido(p, aAct); const nb = p.querySelector(`.ar-recorrido [data-f="${k}"]`); if (nb) nb.focus({ preventScroll: true });
      const pie = p.querySelector(':scope > .ar-pie'); if (pie) p.appendChild(pie);
    });
    s.querySelectorAll('.ar-chips [data-k]').forEach((x) => x.onclick = () => { if (x.dataset.k !== act) cfg.ir(x.dataset.k); });
  }

  /* ---------- Montaje ---------- */
  function refrescar() {
    if (!cfg) return;
    leerAreas();
    const act = cfg.actual(), a = areaDe(act);
    if (!modDe(act)) return;
    abiertosM.add(cfg.mundo); if (a && !a.aparte) abiertasA.add(cfg.mundo + '|' + a.k);
    if (!apDe(act)) ultimoRec = act;
    apuntar(act);
    menu = null;
    pintarArch(); pintarRuta(); pintarAbiertos(); pintarPest(); pintarPie();
  }
  function montar(o) {
    cfg = Object.assign({ secuencial: false }, o);
    leerAreas();
    if (aside) { refrescar(); return api; }
    const w = este();
    document.body.classList.add('arch-on');
    document.body.style.setProperty('--wc', w.c || 'var(--gold)');
    if (LS.get(K_PLEGADO) === true) document.body.classList.add('arch-plegado');
    aside = document.createElement('aside'); aside.className = 'ar-arch'; aside.id = 'archivador'; aside.setAttribute('aria-label', 'Archivador de Atalaya');
    velo = document.createElement('div'); velo.className = 'ar-velo'; velo.hidden = true; velo.onclick = () => cerrarCajon(true);
    document.body.appendChild(velo); document.body.appendChild(aside);
    // Cabecera del contenido: ruta, abiertos y pestañas de módulos
    cab = document.createElement('div'); cab.className = 'ar-cab';
    cab.innerHTML = '<nav class="ar-ruta" aria-label="Dónde está"></nav><div class="ar-abiertos" hidden></div><div class="ar-pest" role="tablist"></div>';
    const antes = cfg.antes || (cfg.panel && cfg.panel());
    if (antes && antes.parentNode) antes.parentNode.insertBefore(cab, antes); else document.body.appendChild(cab);
    // Pestañas: flechas, Inicio y Fin mueven el foco (Intro o espacio abren)
    cab.querySelector('.ar-pest').addEventListener('keydown', (e) => {
      const its = Array.from(cab.querySelectorAll('.ar-pest [role="tab"]')), k = its.indexOf(document.activeElement); if (k < 0) return;
      let n = null;
      if (e.key === 'ArrowRight') n = (k + 1) % its.length; else if (e.key === 'ArrowLeft') n = (k - 1 + its.length) % its.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = its.length - 1;
      if (n !== null) { e.preventDefault(); its.forEach((x, j) => x.tabIndex = j === n ? 0 : -1); its[n].focus(); }
    });
    // Botón «Áreas» de la barra superior (solo en pantallas estrechas; icono de carpeta para no confundirlo con «Menú»)
    const bar = document.querySelector('.topbar');
    carp = document.createElement('button'); carp.type = 'button'; carp.className = 'ar-carp'; carp.setAttribute('aria-controls', 'archivador'); carp.setAttribute('aria-expanded', 'false');
    carp.innerHTML = '<span class="ar-ci" aria-hidden="true"></span><span class="ar-ct">Áreas</span>'; carp.title = 'Mundos, áreas y módulos'; carp.setAttribute('aria-label', 'Áreas: mundos, áreas y módulos');
    carp.onclick = (e) => { e.stopPropagation(); if (aside.classList.contains('visible')) cerrarCajon(true); else abrirCajon(); };
    if (bar) { const sp = bar.querySelector('.spacer'); if (sp) bar.insertBefore(carp, sp); else bar.appendChild(carp); }
    document.addEventListener('click', (e) => { if (menu !== null && !cab.querySelector('.ar-ruta').contains(e.target)) { menu = null; pintarRuta(); } });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (menu !== null) { const i = menu; menu = null; pintarRuta(i); return; }
      if (aside.classList.contains('visible')) cerrarCajon(true);
    });
    let eraMovil = esMovil();
    addEventListener('resize', () => { const m = esMovil(); if (m !== eraMovil) { eraMovil = m; cerrarCajon(false); pintarArch(); } });
    refrescar();
    return api;
  }
  // ¿Puede abrir el archivador este módulo sin recargar? (lo usa el buscador)
  function irA(mk, k) { if (!cfg) return false; leerAreas(); if (mk !== cfg.mundo || !modDe(k)) return false; cerrarCajon(false); cfg.ir(k); return true; }
  const api = { refrescar, irA, abrirCajon, cerrarCajon, plegar, abiertos, navegar: (mk, href, k) => navegar(mk, href, k), get mundo() { return cfg && cfg.mundo; } };
  A.archivador = Object.assign(api, { montar });
})();
