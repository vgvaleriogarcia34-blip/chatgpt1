/* Atalaya · Sistema estratégico · Organigrama dibujable
   Puestos que se arrastran y se enlazan con su responsable, lápiz para dibujar a mano alzada,
   orden automático y lectura de la estructura (niveles, amplitud de mando, puestos sin responsable). */
(function () {
  const A = window.Atalaya, S = A.strat;
  const { $, $$, esc, css } = S;
  const W = 1200, H = 720, NW = 168, NH = 58;
  const cut = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  const uid = () => 'n' + Math.random().toString(36).slice(2, 8);

  function ensure() {
    const P = S.state.personas;
    if (!P.organigrama) P.organigrama = { nodos: [], trazos: [] };
    if (!P.organigrama.nodos.length && !P.organigrama.vacio) P.organigrama.nodos = generar(P.areas);
    return P.organigrama;
  }
  /* Propuesta inicial a partir de las áreas: dirección, un responsable por área y sus equipos */
  function generar(areas) {
    const raiz = { id: uid(), puesto: 'Dirección general', persona: '', area: 'Dirección', jefe: null, x: 0, y: 0 };
    const out = [raiz];
    (areas || []).forEach((a) => {
      const r = { id: uid(), puesto: 'Responsable de ' + String(a.area || '').toLowerCase(), persona: '', area: a.area, jefe: raiz.id, x: 0, y: 0 };
      out.push(r);
      const n = Math.max(0, Math.round(S.num(a.personas)) - 1);
      if (n > 0) out.push({ id: uid(), puesto: `Equipo de ${String(a.area || '').toLowerCase()}`, persona: `${n} persona${n > 1 ? 's' : ''}`, area: a.area, jefe: r.id, x: 0, y: 0, equipo: n });
    });
    ordenar(out);
    return out;
  }
  /* Orden automático en árbol: cada nivel en una fila, hijos centrados bajo su responsable */
  function ordenar(nodos) {
    const hijos = (id) => nodos.filter((n) => n.jefe === id);
    const raices = nodos.filter((n) => !n.jefe || !nodos.some((m) => m.id === n.jefe));
    let col = 0;
    const colocar = (n, nivel, seen) => {
      if (seen.has(n.id)) return; seen.add(n.id);
      const hs = hijos(n.id);
      n.y = 40 + nivel * 120;
      if (!hs.length) { n.x = 30 + col * (NW + 22); col++; return; }
      hs.forEach((h) => colocar(h, nivel + 1, seen));
      const xs = hs.map((h) => h.x); n.x = (Math.min(...xs) + Math.max(...xs)) / 2;
    };
    const seen = new Set();
    raices.forEach((r) => colocar(r, 0, seen));
    // Si no cabe, se comprime en horizontal
    const maxX = Math.max(...nodos.map((n) => n.x + NW), W);
    if (maxX > W - 10) { const k = (W - 40 - NW) / (maxX - NW - 30); nodos.forEach((n) => { n.x = 30 + (n.x - 30) * k; }); }
  }
  function analisis(nodos) {
    const hijos = (id) => nodos.filter((n) => n.jefe === id);
    const nivel = (n, d) => { let k = 0, c = n; const seen = new Set(); while (c && c.jefe && !seen.has(c.id) && k < 50) { seen.add(c.id); c = nodos.find((m) => m.id === c.jefe); k++; } return k; };
    const niveles = nodos.length ? Math.max(...nodos.map((n) => nivel(n))) + 1 : 0;
    const mandos = nodos.filter((n) => hijos(n.id).length);
    const span = (n) => hijos(n.id).reduce((a, h) => a + (h.equipo || 1), 0);
    const spans = mandos.map(span);
    const raices = nodos.filter((n) => !n.jefe || !nodos.some((m) => m.id === n.jefe));
    return { niveles, mandos, spanMedio: spans.length ? spans.reduce((a, b) => a + b, 0) / spans.length : 0, saturados: mandos.filter((m) => span(m) > 10), solos: mandos.filter((m) => span(m) === 1), raices, span, sinPersona: nodos.filter((n) => !n.persona && !n.equipo) };
  }

  S.orgChart = function (host) {
    const O = ensure();
    let modo = host.dataset.modo || 'mover', sel = host.dataset.sel || null, enlazando = false;
    const areas = Array.from(new Set(O.nodos.map((n) => n.area).filter(Boolean)));
    const color = (a) => A.seriesColor(Math.max(0, areas.indexOf(a)));
    const save = () => { S.save(); };
    const an = analisis(O.nodos);

    host.innerHTML = `<div class="row"><h4>Organigrama</h4><span class="spacer"></span>
        <div class="seg" style="margin:0" id="ogModo">${[['mover', 'Mover y editar'], ['lapiz', 'Lápiz'], ['goma', 'Borrar trazos']].map(([k, l]) => `<button data-m="${k}" aria-pressed="${k === modo}">${l}</button>`).join('')}</div></div>
      <div class="row"><button class="btn" id="ogAdd">Añadir puesto</button><button class="btn ghost" id="ogSort">Ordenar automáticamente</button><button class="btn ghost" id="ogGen">Proponer desde las áreas</button><button class="btn ghost" id="ogClear">Vaciar</button>
        <span class="small muted">${modo === 'lapiz' ? 'Dibuja a mano alzada sobre el organigrama.' : modo === 'goma' ? 'Toca un trazo para borrarlo.' : 'Arrastra los puestos. Toca uno para editarlo y decir de quién depende.'}</span></div>
      <div class="ogwrap"><svg id="ogSvg" viewBox="0 0 ${W} ${H}" class="og ${modo}" role="img" aria-label="Organigrama de la empresa">
        <g class="oglinks">${O.nodos.filter((n) => n.jefe && O.nodos.some((m) => m.id === n.jefe)).map((n) => { const j = O.nodos.find((m) => m.id === n.jefe); const x1 = j.x + NW / 2, y1 = j.y + NH, x2 = n.x + NW / 2, y2 = n.y, ym = (y1 + y2) / 2; return `<path d="M${x1},${y1} V${ym} H${x2} V${y2}" fill="none" stroke="${css('--line-strong') || '#8a7a55'}" stroke-width="1.6"/>`; }).join('')}</g>
        <g class="ognodes">${O.nodos.map((n) => `<g class="ognode${n.id === sel ? ' sel' : ''}" data-id="${n.id}" transform="translate(${n.x},${n.y})"><rect width="${NW}" height="${NH}" rx="10" fill="${css('--panel-solid') || '#0d1428'}" stroke="${n.id === sel ? css('--gold') : color(n.area)}" stroke-width="${n.id === sel ? 2.4 : 1.4}"/><rect width="5" height="${NH}" rx="2" fill="${color(n.area)}"/>
          <text x="14" y="23" class="ogt">${esc(cut(n.puesto || 'Puesto', 21))}<title>${esc(n.puesto)}</title></text><text x="14" y="42" class="ogs">${esc(cut(n.persona || (n.equipo ? n.equipo + ' personas' : 'Sin asignar'), 25))}</text>${an.saturados.includes(n) ? `<circle cx="${NW - 12}" cy="12" r="6" fill="${css('--warn')}"><title>Más de 10 personas a su cargo</title></circle>` : ''}</g>`).join('')}</g>
        <g class="ogink">${(O.trazos || []).map((t, i) => `<path data-t="${i}" d="${t.d}" fill="none" stroke="${t.c || css('--gold')}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g>
      </svg></div>
      <div id="ogEdit"></div>
      <div class="grid cols-3 mt small">
        <div><b>${an.niveles}</b> niveles jerárquicos · <b>${an.mandos.length}</b> puestos con personas a cargo</div>
        <div>Amplitud de mando media: <b>${an.spanMedio.toFixed(1).replace('.', ',')}</b> personas por responsable <span class="muted">(sana entre 5 y 10)</span></div>
        <div>${an.saturados.length ? `<span style="color:var(--warn)">Saturados: ${esc(an.saturados.map((n) => n.puesto).join(', '))}</span>` : 'Ningún responsable con más de 10 personas'}${an.raices.length > 1 ? ` · <span style="color:var(--warn)">${an.raices.length} puestos sin responsable</span>` : ''}</div>
      </div>`;

    const svg = $('#ogSvg', host);
    const pt = (ev) => { const r = svg.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height }; };
    $$('#ogModo button', host).forEach((b) => b.onclick = () => { host.dataset.modo = b.dataset.m; S.orgChart(host); });
    $('#ogAdd', host).onclick = () => { const n = { id: uid(), puesto: 'Nuevo puesto', persona: '', area: areas[0] || '', jefe: sel || (O.nodos[0] && O.nodos[0].id) || null, x: 40 + Math.random() * 300, y: 560 }; O.nodos.push(n); host.dataset.sel = n.id; host.dataset.modo = 'mover'; save(); S.orgChart(host); };
    $('#ogSort', host).onclick = () => { ordenar(O.nodos); save(); S.orgChart(host); };
    $('#ogGen', host).onclick = () => { O.nodos = generar(S.state.personas.areas); O.trazos = []; O.vacio = false; host.dataset.sel = ''; save(); S.orgChart(host); };
    let armed = false;
    $('#ogClear', host).onclick = (e) => { if (!armed) { armed = true; e.target.textContent = 'Pulsa otra vez para vaciar'; return; } O.nodos = []; O.trazos = []; O.vacio = true; host.dataset.sel = ''; save(); S.orgChart(host); };

    if (modo === 'mover') {
      $$('.ognode', svg).forEach((g) => {
        g.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          const n = O.nodos.find((m) => m.id === g.dataset.id), p0 = pt(ev), x0 = n.x, y0 = n.y; let moved = false;
          g.setPointerCapture(ev.pointerId);
          const mv = (e) => { const p = pt(e); const dx = p.x - p0.x, dy = p.y - p0.y; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true; n.x = Math.max(0, Math.min(W - NW, x0 + dx)); n.y = Math.max(0, Math.min(H - NH, y0 + dy)); g.setAttribute('transform', `translate(${n.x},${n.y})`); };
          const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up);
            if (enlazando && !moved) { const s = O.nodos.find((m) => m.id === sel); if (s && s.id !== n.id && !esDescendiente(n.id, s.id)) s.jefe = n.id; enlazando = false; save(); S.orgChart(host); return; }
            if (!moved) host.dataset.sel = n.id === sel ? '' : n.id; save(); S.orgChart(host); };
          g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
        });
      });
      svg.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('.ognode') && sel) { host.dataset.sel = ''; S.orgChart(host); } });
    }
    if (modo === 'lapiz') {
      let d = null, path = null;
      svg.addEventListener('pointerdown', (ev) => { ev.preventDefault(); svg.setPointerCapture(ev.pointerId); const p = pt(ev); d = `M${p.x.toFixed(1)},${p.y.toFixed(1)}`; path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', css('--gold')); path.setAttribute('stroke-width', '2.4'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('d', d); $('.ogink', svg).appendChild(path); });
      svg.addEventListener('pointermove', (ev) => { if (!path) return; const p = pt(ev); d += ` L${p.x.toFixed(1)},${p.y.toFixed(1)}`; path.setAttribute('d', d); });
      svg.addEventListener('pointerup', () => { if (path && d.includes('L')) { O.trazos = O.trazos || []; O.trazos.push({ d, c: css('--gold') }); save(); } path = null; d = null; });
    }
    if (modo === 'goma') $$('.ogink path', svg).forEach((p) => p.addEventListener('pointerdown', () => { O.trazos.splice(+p.dataset.t, 1); save(); S.orgChart(host); }));

    function esDescendiente(id, ancestro) { let c = O.nodos.find((m) => m.id === id); const seen = new Set(); while (c && c.jefe && !seen.has(c.id)) { if (c.jefe === ancestro) return true; seen.add(c.id); c = O.nodos.find((m) => m.id === c.jefe); } return false; }

    // Panel de edición del puesto seleccionado
    const n = O.nodos.find((m) => m.id === sel);
    if (n && modo === 'mover') {
      const ed = $('#ogEdit', host);
      ed.innerHTML = `<div class="ogedit"><label class="small">Puesto<input class="input" id="ogP" value="${esc(n.puesto)}"></label><label class="small">Persona o equipo<input class="input" id="ogN" value="${esc(n.persona || '')}" placeholder="Nombre o «4 personas»"></label>
        <label class="small">Área<input class="input" id="ogA" value="${esc(n.area || '')}" list="ogAreas"><datalist id="ogAreas">${S.state.personas.areas.map((a) => `<option value="${esc(a.area)}">`).join('')}</datalist></label>
        <label class="small">Depende de<select class="input" id="ogJ"><option value="">— nadie (cabecera) —</option>${O.nodos.filter((m) => m.id !== n.id && !esDescendiente(m.id, n.id)).map((m) => `<option value="${m.id}" ${m.id === n.jefe ? 'selected' : ''}>${esc(m.puesto)}${m.persona ? ' · ' + esc(m.persona) : ''}</option>`).join('')}</select></label>
        <div class="row"><button class="btn ghost" id="ogLink">Elegir responsable en el dibujo</button><button class="btn ghost" id="ogChild">Añadir puesto debajo</button><button class="btn ghost" id="ogDel" style="color:var(--stop)">Eliminar puesto</button></div></div>`;
      const set = (id, k, re) => { $(id, ed).onchange = (e) => { n[k] = e.target.value || (k === 'jefe' ? null : ''); const m = /^(\d+)\s*personas?$/i.exec(n.persona || ''); n.equipo = m ? +m[1] : undefined; save(); if (re) S.orgChart(host); }; };
      set('#ogP', 'puesto', true); set('#ogN', 'persona', true); set('#ogA', 'area', true); set('#ogJ', 'jefe', true);
      $('#ogLink', ed).onclick = (e) => { enlazando = true; e.target.textContent = 'Ahora toca el puesto del que depende'; };
      $('#ogChild', ed).onclick = () => { const c = { id: uid(), puesto: 'Nuevo puesto', persona: '', area: n.area, jefe: n.id, x: Math.min(W - NW, n.x + 30), y: Math.min(H - NH, n.y + 120) }; O.nodos.push(c); host.dataset.sel = c.id; save(); S.orgChart(host); };
      $('#ogDel', ed).onclick = () => { O.nodos.forEach((m) => { if (m.jefe === n.id) m.jefe = n.jefe; }); O.nodos = O.nodos.filter((m) => m.id !== n.id); host.dataset.sel = ''; save(); S.orgChart(host); };
    }
  };
  S.orgAnalisis = () => analisis(ensure().nodos);
})();
