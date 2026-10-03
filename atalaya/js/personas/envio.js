/* Atalaya · Personas y equipos · Test a distancia
   Dos formas de que cada persona responda por su cuenta, desde su móvil, sin cuenta:
   · Enlace con servidor: invitación de un solo uso (14 días), por correo o copiada para WhatsApp; estados
     enviado, abierto, a medias, completado, caducado; recordar, reenviar y anular; la respuesta entra sola
     en la ficha de la persona.
   · Enlace con código: funciona sin servidor. Al terminar, la persona recibe un código corto que el
     responsable pega aquí. */
(function () {
  const A = window.Atalaya, H = A.personasDatos, L = A.liderazgoDatos, R = A.personas, C = A.testCodigo;
  const { $, $$, esc } = R;
  const P = () => A.platform;
  const servidor = () => !!(P() && P().mode === 'server');
  const empresaId = () => (P() && P().empresaId ? P().empresaId() : 'principal');
  const baseTest = () => location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '') + 'test.html';
  const ESTADOS = { enviado: ['info', 'Enviado'], abierto: ['warn', 'Abierto'], 'a medias': ['warn', 'A medias'], completado: ['ok', 'Completado'], caducado: ['stop', 'Caducado'], anulado: ['stop', 'Anulado'] };
  const pillEst = (e) => { const x = ESTADOS[e] || ['info', e]; return R.pill(x[0] === 'info' ? 'warn' : x[0], x[1]); };
  let cache = { lista: null, correo: false, err: null };

  /* ---------- Aplicar una respuesta a la ficha ---------- */
  R.aplicarRespuesta = (o) => {
    const p = R.persona(o.pid); if (!p) throw new Error('La persona ya no está en la plantilla.');
    if (!C.valida(o.test, o.resp)) throw new Error('Respuestas incompletas.');
    const f = R.hoy(), org = o.origen || 'enlace', r = o.resp;
    const cons = () => { p.consentimiento = true; p.consentFecha = p.consentFecha || f; p.consentPropio = f; };
    if (o.test === 'disc') { p.disc = Object.assign(R.discDesdeResp(r), { resp: r, fecha: f, origen: org }); cons(); }
    else if (o.test === 'roles') { p.roles = { resp: r, scores: R.rolesDesdeResp(r), fecha: f, origen: org }; cons(); }
    else if (o.test === 'enea') { p.enea = Object.assign(R.eneaDesdeResp(r), { resp: r, fecha: f, origen: org }); cons(); }
    else if (o.test === 'lid') { p.lid = Object.assign(p.lid || {}, { estilo: { resp: r, fecha: f, origen: org } }); cons(); }
    else if (o.test === 'lid360') { p.lid = p.lid || {}; p.lid.percibido = p.lid.percibido || []; p.lid.percibido.push({ id: R.uid('v'), de: '', resp: r, fecha: f, origen: org }); }
    else if (o.test === 'prep') { const t = (p.tareas || []).find((x) => x.id === o.tid); if (!t) throw new Error('La tarea ya no existe en la ficha de ' + p.nombre + '.'); t.prepYo = { resp: r, fecha: f, origen: org }; }
    // En el registro local de envíos, se marca como completado
    (R.state.envios || []).filter((e) => e.pid === o.pid && e.test === o.test && (e.tid || '') === (o.tid || '') && e.estado !== 'completado').slice(0, 1).forEach((e) => { e.estado = 'completado'; e.completado = f; });
    R.save();
    return `${C.TESTS[o.test].n} de ${p.nombre}${o.tid ? ' · ' + ((p.tareas || []).find((x) => x.id === o.tid) || {}).nombre : ''}`;
  };

  /* Recoge del servidor las respuestas completadas que aún no están en las fichas */
  R.importarInvitaciones = async () => {
    if (!servidor()) return [];
    try {
      const j = await P().api('/invitaciones?empresa=' + encodeURIComponent(empresaId()));
      cache = { lista: j.invitaciones, correo: j.correo, err: null };
      const hechos = [];
      for (const v of j.invitaciones.filter((x) => x.estado === 'completado' && !x.importada && x.resp)) {
        try { hechos.push(R.aplicarRespuesta({ test: v.test, pid: v.pid, tid: v.tid, resp: v.resp, origen: 'enlace' })); await P().api('/invitaciones/' + v.id + '/importada', { method: 'POST', body: '{}' }); v.importada = R.hoy(); } catch (e) { /* persona o tarea borrada: queda en la lista */ }
      }
      return hechos;
    } catch (e) { cache.err = e.message; return []; }
  };
  const st0 = R.start;
  R.start = async function () {
    await st0.apply(this, arguments);
    if (!R.state) return;
    const h = await R.importarInvitaciones();
    if (h.length) { R.rerender(); aviso(`${h.length} respuesta${h.length > 1 ? 's' : ''} recibida${h.length > 1 ? 's' : ''} por enlace: ${h.join('; ')}.`); }
  };
  const aviso = (t) => { const d = document.createElement('div'); d.className = 'alert ok pe-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 7000); };

  /* ---------- Botones en cada herramienta ---------- */
  R.envioBtns = (p, test, t) => `<button class="btn ghost small" data-envio="${test}" data-pid="${p.id}" data-tid="${t ? t.id : ''}">${test === 'lid360' ? 'Enviar a su equipo' : 'Enviar por enlace'}</button><button class="btn ghost small" data-codigo>Pegar código</button>`;
  R.wireEnvio = (host) => {
    $$('[data-envio]', host).forEach((b) => (b.onclick = () => envioDialog({ pid: b.dataset.pid, test: b.dataset.envio, tid: b.dataset.tid || null })));
    $$('[data-codigo]', host).forEach((b) => (b.onclick = () => codigoDialog()));
  };

  /* ---------- Ventanas ---------- */
  const ventana = (html, label) => {
    const back = document.createElement('div'); back.className = 'ef-back';
    back.innerHTML = `<div class="ef-card glass pad stack pe-env" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.onclick = (ev) => { if (ev.target === back) close(); };
    back.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
    $$('[data-x]', back).forEach((b) => (b.onclick = close));
    return { back, close };
  };
  const compartir = (url, p, test, extra) => {
    const T = C.TESTS[test], txt = `Hola${p ? ' ' + p.nombre.split(' ')[0] : ''}: te paso un cuestionario breve de ${R.empresa().nombre} (${T.n.toLowerCase()}, unos ${T.min} minutos). Se responde desde el móvil, sin crear cuenta: ${url}`;
    return `<div class="pe-link"><input class="input" readonly value="${esc(url)}" aria-label="Enlace del cuestionario"><div class="row"><button class="btn solid small" data-copy="${esc(url)}">Copiar enlace</button><a class="btn small" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">WhatsApp</a>${p && p.email ? `<a class="btn ghost small" href="mailto:${esc(p.email)}?subject=${encodeURIComponent('Cuestionario de ' + R.empresa().nombre)}&body=${encodeURIComponent(txt)}">Abrir en mi correo</a>` : ''}${extra || ''}</div></div>`;
  };
  const wireCopy = (root) => $$('[data-copy]', root).forEach((b) => (b.onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copy) : Promise.reject()).then(() => (b.textContent = 'Copiado'), () => { const i = b.closest('.pe-link').querySelector('input'); i.select(); b.textContent = 'Pulse Ctrl+C'; }); }));

  /* Destinatarios de un envío: la persona, o el equipo de un líder para el estilo percibido */
  const destinatarios = (o) => {
    const p = R.persona(o.pid);
    if (o.test === 'lid360') return R.state.personas.filter((x) => x.responsable === p.id).map((x) => ({ p: x, body: { pid: p.id, nombre: x.nombre, lider: p.nombre, de: x.id } }));
    const t = o.tid && (p.tareas || []).find((x) => x.id === o.tid), jefe = R.persona(p.responsable);
    return [{ p, body: { pid: p.id, nombre: p.nombre, tid: t ? t.id : null, tarea: t ? t.nombre : null, lider: jefe ? jefe.nombre : null } }];
  };
  const enlaceCodigo = (b, test, email, resumen) => baseTest() + '#c=' + C.paqueteEnlace({ t: test, n: b.nombre, e: R.empresa().nombre, p: b.pid, ti: b.tid || undefined, ta: b.tarea || undefined, l: b.lider || undefined, m: email || undefined, r: resumen ? 1 : 0 });

  const envioDialog = async (o) => {
    const p = R.persona(o.pid); if (!p) return;
    const dest = o.lista || destinatarios(o), T = C.TESTS[o.test], srv = servidor();
    if (srv && !cache.lista) await R.importarInvitaciones();
    const { back, close } = ventana(`<div class="row"><div><div class="eyebrow">Test a distancia</div><h3 style="margin:4px 0 0">${esc(T.n)}</h3><p class="small muted" style="margin:0">${o.lista ? dest.length + ' personas' : o.test === 'lid360' ? `El equipo de ${esc(p.nombre)} responde sobre su forma de dirigir. Las respuestas llegan anónimas y se suman.` : esc(p.nombre) + (o.tid ? ' · ' + esc(dest[0].body.tarea) : '')}</p></div><span class="spacer"></span><button class="btn ghost small" data-x>Cerrar</button></div>
      ${dest.length ? `<div class="pe-dest">${dest.map((d, i) => `<label class="pe-dr"><input type="checkbox" data-i="${i}" checked> <span>${esc(d.p.nombre)}</span><input class="input" type="email" data-mail="${i}" placeholder="correo (opcional)" value="${esc(d.p.email || '')}" autocomplete="off"></label>`).join('')}</div>` : '<div class="alert warn">Nadie depende todavía de esta persona en la plantilla.</div>'}
      <label class="tp-inline small"><input type="checkbox" id="envRes" checked> Mostrar a la persona un resumen breve de su resultado al terminar</label>
      <p class="small muted" style="margin:0">La persona verá para qué se usan sus respuestas y dará su propio consentimiento antes de empezar.</p>
      <div class="row">${srv ? `<button class="btn solid" id="envSrv">Crear enlace${dest.length > 1 ? 's' : ''}</button>${cache.correo ? `<button class="btn" id="envMail">Crear y enviar por correo</button>` : ''}` : ''}<button class="btn ${srv ? 'ghost' : 'solid'}" id="envCod">${srv ? 'Enlace con código (sin servidor)' : 'Crear enlace con código'}</button></div>
      ${srv ? (cache.correo ? '' : '<p class="small muted" style="margin:0">El servidor no tiene correo configurado: copie el enlace y envíelo por WhatsApp o desde su correo.</p>') : '<p class="small muted" style="margin:0">Sin servidor, la persona responde y recibe un <b>código</b> que le devuelve; usted lo pega en «Pegar código». Con el servidor activo, la respuesta llega sola.</p>'}
      <div id="envOut" class="stack"></div>`, 'Enviar test');
    const sel = () => dest.map((d, i) => ({ d, i })).filter(({ i }) => back.querySelector(`[data-i="${i}"]`).checked).map(({ d, i }) => { const m = back.querySelector(`[data-mail="${i}"]`).value.trim(); if (m && m !== d.p.email) { d.p.email = m; R.save(); } return Object.assign({}, d, { email: m }); });
    const out = $('#envOut', back), resumen = () => $('#envRes', back).checked;
    const crear = async (enviar) => {
      const s = sel(); if (!s.length) return;
      out.innerHTML = '<p class="small">Creando…</p>';
      try {
        const j = await P().api('/invitaciones', { method: 'POST', body: JSON.stringify({ lista: s.map((x) => Object.assign({ test: o.test, empresaId: empresaId(), empresa: R.empresa().nombre, email: x.email || null, enviar, resumen: resumen() }, x.body)) }) });
        cache.lista = null;
        out.innerHTML = j.invitaciones.map((v, k) => `<div class="glass pad stack"><div class="row"><b>${esc(v.nombre)}</b><span class="spacer"></span>${v.enviado ? R.pill('ok', 'Correo enviado') : enviar && s[k].email ? R.pill('warn', 'Correo no enviado') : ''}</div>${compartir(v.url, s[k].p, o.test)}</div>`).join('') + '<p class="small muted" style="margin:0">El enlace caduca en 14 días. Puede seguir su estado en «Test a distancia».</p>';
        wireCopy(out);
      } catch (e) { out.innerHTML = `<div class="alert stop">${esc(e.message)}</div>`; }
    };
    const bs = $('#envSrv', back); if (bs) bs.onclick = () => crear(false);
    const bm = $('#envMail', back); if (bm) bm.onclick = () => crear(true);
    $('#envCod', back).onclick = () => {
      const s = sel(); if (!s.length) return;
      R.state.envios = R.state.envios || [];
      out.innerHTML = s.map((x) => { const url = enlaceCodigo(x.body, o.test, x.email, resumen()); R.state.envios.unshift({ id: R.uid('s'), pid: x.body.pid, nombre: x.p.nombre, test: o.test, tid: x.body.tid || '', fecha: R.hoy(), estado: 'enviado', url }); return `<div class="glass pad stack"><b>${esc(x.p.nombre)}</b>${compartir(url, x.p, o.test)}</div>`; }).join('') + '<p class="small muted" style="margin:0">Cuando le devuelvan el código, péguelo en «Pegar código».</p>';
      R.state.envios = R.state.envios.slice(0, 300); R.save(); wireCopy(out);
    };
    const first = back.querySelector('input[type="email"]') || back.querySelector('button'); if (first) first.focus();
    return close;
  };

  /* Pegar un código de respuesta: identifica el test, la persona y la tarea por la huella */
  const codigoDialog = () => {
    const { back, close } = ventana(`<div class="row"><div><div class="eyebrow">Código de respuesta</div><h3 style="margin:4px 0 0">Pegar el código que le han devuelto</h3></div><span class="spacer"></span><button class="btn ghost small" data-x>Cerrar</button></div>
      <input class="input pe-codein" id="codIn" placeholder="Por ejemplo: DVJ6-BC75-P3JV-1XY" autocomplete="off" spellcheck="false">
      <div class="row"><button class="btn solid" id="codOk">Leer código</button></div><div id="codOut" class="stack"></div>`, 'Pegar código');
    const out = $('#codOut', back);
    const leer = () => {
      let d; try { d = C.decodificar($('#codIn', back).value); } catch (e) { out.innerHTML = `<div class="alert stop">${esc(e.message)}</div>`; return; }
      const ps = R.state.personas, cand = [];
      ps.forEach((p) => { if (d.test === 'prep') (p.tareas || []).forEach((t) => { if (C.huella(p.id, t.id) === d.huella) cand.push({ p, t }); }); else if (C.huella(p.id, '') === d.huella) cand.push({ p }); });
      const unico = cand.length === 1 ? cand[0] : null, T = C.TESTS[d.test];
      const opts = d.test === 'prep' ? ps.flatMap((p) => (p.tareas || []).map((t) => `<option value="${p.id}|${t.id}" ${unico && unico.t === t ? 'selected' : ''}>${esc(p.nombre)} · ${esc(t.nombre)}</option>`)).join('') : ps.map((p) => `<option value="${p.id}|" ${unico && unico.p === p ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('');
      out.innerHTML = `<div class="alert ${unico ? 'ok' : 'warn'}">${esc(T.n)}${d.test === 'lid360' ? ' (respuesta anónima sobre un responsable)' : ''}. ${unico ? `Corresponde a <b>${esc(unico.p.nombre)}</b>${unico.t ? ' · ' + esc(unico.t.nombre) : ''}.` : 'No se reconoce a quién corresponde: elija a la persona con cuidado.'}</div>
        <label class="small">${d.test === 'lid360' ? 'Responsable evaluado' : d.test === 'prep' ? 'Persona y tarea' : 'Persona'}<select class="input" id="codP">${opts || '<option value="">— sin opciones —</option>'}</select></label>
        <div class="row"><button class="btn solid" id="codApl" ${opts ? '' : 'disabled'}>Guardar en su ficha</button></div>`;
      $('#codApl', back).onclick = () => {
        const [pid, tid] = $('#codP', back).value.split('|');
        try { const t = R.aplicarRespuesta({ test: d.test, pid, tid: tid || null, resp: d.resp, origen: 'código' }); close(); R.rerender(); aviso('Guardado: ' + t + '.'); }
        catch (e) { out.insertAdjacentHTML('beforeend', `<div class="alert stop">${esc(e.message)}</div>`); }
      };
    };
    $('#codOk', back).onclick = leer;
    $('#codIn', back).onkeydown = (e) => { if (e.key === 'Enter') leer(); };
    $('#codIn', back).focus();
  };
  R.codigoDialog = codigoDialog;

  /* ---------- Módulo: seguimiento de los envíos ---------- */
  const TESTS_PERSONA = ['disc', 'roles', 'enea', 'lid'];
  R.register({
    id: 'envios', grupo: 'Herramientas', nombre: 'Test a distancia', pregunta: '¿Quién tiene pendiente su cuestionario y quién ya ha respondido?',
    render(host) {
      const ps = R.state.personas, srv = servidor();
      host.innerHTML = `<div class="grid pe-two"><div class="glass pad stack"><div class="eyebrow">Cómo funciona</div>
          <p style="margin:0">Cada persona responde su cuestionario <b>desde su móvil, sin cuenta</b>, con un enlace personal. Antes de empezar ve quién se lo pide y para qué, y da su propio consentimiento.</p>
          <ul class="small" style="margin:0;padding-left:18px"><li><b>Con el servidor activo:</b> el enlace se envía por correo o se copia para WhatsApp; puede retomarse a medias y la respuesta entra sola en la ficha.${srv ? '' : ' <span class="muted">(Ahora no hay servidor: está en modo local).</span>'}</li><li><b>Sin servidor:</b> al terminar, la persona recibe un código corto y se lo devuelve; usted lo pega aquí.</li></ul>
          <div class="row"><button class="btn" data-codigo>Pegar código de respuesta</button>${srv ? '<button class="btn ghost" id="envAct">Actualizar estados</button>' : ''}</div></div>
        <div class="glass pad stack"><div class="eyebrow">Enviar a varias personas</div>
          ${ps.length ? `<label class="small">Test<select class="input" id="envT">${TESTS_PERSONA.map((k) => `<option value="${k}">${esc(C.TESTS[k].n)}</option>`).join('')}</select></label>
          <label class="small">Quién<select class="input" id="envQ"><option value="pend">Quienes no lo han hecho todavía</option><option value="todos">Toda la plantilla</option>${R.state.equipos.map((q) => `<option value="q:${q.id}">Equipo · ${esc(q.nombre)}</option>`).join('')}</select></label>
          <p class="small muted" id="envN" style="margin:0"></p><div class="row"><button class="btn solid" id="envGo">Preparar envío</button></div>` : R.vacia('Da de alta la plantilla para enviar cuestionarios.', 'Ir a la plantilla')}</div></div>
        <div class="glass pad stack" id="envList"><div class="eyebrow">Envíos</div><p class="small muted">Cargando…</p></div>${R.aviso()}`;
      R.wireEnvio(host);
      const hecho = (p, t) => (t === 'disc' ? p.disc : t === 'roles' ? p.roles && p.roles.scores : t === 'enea' ? p.enea && p.enea.tipo : p.lid && p.lid.estilo);
      const quienes = () => { const t = $('#envT', host).value, q = $('#envQ', host).value; let l = q === 'todos' ? ps : q === 'pend' ? ps.filter((p) => !hecho(p, t)) : ((R.equipo(q.slice(2)) || {}).miembros || []).map(R.persona).filter(Boolean); if (t === 'lid') l = l.filter((p) => ps.some((x) => x.responsable === p.id) || q !== 'pend'); return l; };
      const cuenta = () => { const n = quienes().length; $('#envN', host).textContent = n ? `${n} persona${n > 1 ? 's' : ''}: ${quienes().slice(0, 6).map((p) => p.nombre.split(' ')[0]).join(', ')}${n > 6 ? '…' : ''}` : 'Nadie con este criterio.'; };
      if (ps.length) {
        $('#envT', host).onchange = cuenta; $('#envQ', host).onchange = cuenta; cuenta();
        $('#envGo', host).onclick = () => { const l = quienes(); if (!l.length) return; envioVarios(l, $('#envT', host).value); };
      }
      const act = $('#envAct', host); if (act) act.onclick = async () => { cache.lista = null; const h = await R.importarInvitaciones(); if (h.length) aviso(`${h.length} respuesta${h.length > 1 ? 's' : ''} recibida${h.length > 1 ? 's' : ''}.`); R.rerender(); };
      pintarLista($('#envList', host));
    }
  });
  const envioVarios = (lista, test) => envioDialog({ pid: lista[0].id, test, lista: lista.map((p) => { const jefe = R.persona(p.responsable); return { p, body: { pid: p.id, nombre: p.nombre, lider: jefe ? jefe.nombre : null } }; }) });

  const pintarLista = async (box) => {
    const srv = servidor();
    let filas = [];
    if (srv) { if (!cache.lista) await R.importarInvitaciones(); filas = (cache.lista || []).map((v) => ({ v, srv: true })); }
    (R.state.envios || []).forEach((e) => filas.push({ v: e, srv: false }));
    if (!filas.length) { box.innerHTML = `<div class="eyebrow">Envíos</div><p class="small muted" style="margin:0">${cache.err ? esc(cache.err) : 'Todavía no se ha enviado ningún cuestionario. Use «Enviar por enlace» en cada herramienta o «Enviar a varias personas».'}</p>`; return; }
    box.innerHTML = `<div class="eyebrow">Envíos · ${filas.length}</div><div class="table-wrap"><table class="pe-table"><thead><tr><th style="text-align:left">Persona</th><th style="text-align:left">Test</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>
      ${filas.map(({ v, srv: s }) => `<tr data-id="${v.id}" data-s="${s ? 1 : 0}"><td>${esc(v.nombre || R.nombre(v.pid))}${v.test === 'lid360' && v.lider ? ` <span class="small muted">sobre ${esc(v.lider)}</span>` : ''}</td><td>${esc(C.TESTS[v.test] ? C.TESTS[v.test].n : v.test)}${v.tarea ? ' · ' + esc(v.tarea) : ''}<br><span class="small muted">${s ? (v.email ? 'Correo · ' + esc(v.email) : 'Enlace') : 'Enlace con código'}</span></td><td style="text-align:center">${pillEst(v.estado)}${s && !['completado', 'anulado'].includes(v.estado) && v.progreso ? `<br><span class="small muted">${v.progreso} de ${v.total}</span>` : ''}${s && v.estado === 'completado' && !v.importada ? '<br><span class="small muted">sin recoger</span>' : ''}</td><td style="text-align:center" class="small">${R.fechaES(s ? v.creado : v.fecha)}</td>
        <td class="pe-act">${['completado', 'anulado'].includes(v.estado) ? '' : `<button class="btn ghost small" data-cp="${esc(v.url)}">Copiar enlace</button>`}${s && v.email && ['enviado', 'abierto', 'a medias'].includes(v.estado) ? '<button class="btn ghost small" data-a="recordar">Recordar</button>' : ''}${s && ['caducado', 'anulado', 'a medias', 'abierto', 'enviado'].includes(v.estado) ? '<button class="btn ghost small" data-a="reenviar">Reenviar</button>' : ''}${s && ['enviado', 'abierto', 'a medias'].includes(v.estado) ? '<button class="btn ghost small" data-a="anular">Anular</button>' : ''}${!s ? '<button class="btn ghost small" data-a="quitar">Quitar</button>' : ''}</td></tr>`).join('')}
      </tbody></table></div><p class="small muted" style="margin:0" id="envMsg"></p>`;
    $$('[data-cp]', box).forEach((b) => (b.onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.cp) : Promise.reject()).then(() => (b.textContent = 'Copiado'), () => window.prompt('Copie el enlace:', b.dataset.cp))));
    $$('[data-a]', box).forEach((b) => (b.onclick = async () => {
      const tr = b.closest('tr'), id = tr.dataset.id, a = b.dataset.a, msg = $('#envMsg', box);
      if (a === 'quitar') { R.state.envios = (R.state.envios || []).filter((e) => e.id !== id); R.save(); return pintarLista(box); }
      try {
        b.disabled = true;
        const j = await P().api('/invitaciones/' + id + '/' + a, { method: 'POST', body: '{}' });
        cache.lista = null; await pintarLista(box);
        const m2 = $('#envMsg', box);
        if (a === 'reenviar' && j.invitacion) { m2.innerHTML = `Nuevo enlace para ${esc(j.invitacion.nombre)}${j.invitacion.enviado ? ' (enviado por correo)' : ''}: el anterior ya no vale.`; m2.insertAdjacentHTML('afterend', compartir(j.invitacion.url, R.persona(j.invitacion.de || j.invitacion.pid), j.invitacion.test)); wireCopy(box); }
        else if (a === 'recordar') m2.textContent = 'Recordatorio enviado.';
      } catch (e) { b.disabled = false; msg.textContent = e.message; }
    }));
  };
})();
