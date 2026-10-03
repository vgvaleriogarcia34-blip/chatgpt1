/* Atalaya · Página pública de un cuestionario de personas
   Se abre con un enlace personal:
   · test.html#t=<token>   invitación del servidor: guarda el avance, se puede retomar y la respuesta
                            llega sola a la ficha de la persona.
   · test.html#c=<paquete>  sin servidor: al terminar, la persona recibe un código de respuesta que
                            entrega a quien se lo envió; el avance se guarda en este navegador.
   La persona ve quién se lo pide y para qué, da su consentimiento y responde una pregunta por pantalla. */
(function () {
  const A = window.Atalaya, H = A.personasDatos, L = A.liderazgoDatos, C = A.testCodigo;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const main = $('#tp');
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };
  const ESC5 = ['Nada', 'Poco', 'A veces', 'Bastante', 'Totalmente'];
  const F = ['D', 'I', 'S', 'C'];

  let meta = null, modo = null, token = null, resp = null, idx = 0, consent = false, lsKey = null;

  /* ---------- Preguntas de cada test ---------- */
  const items = () => ({ disc: H.DISC_BLOQUES, roles: H.ROLES_ITEMS, enea: H.ENEA_ITEMS, lid: L.SITUACIONES, lid360: L.SITUACIONES, prep: L.PREP_ITEMS }[meta.test]);
  const nombre1 = () => esc(String(meta.nombre || '').split(' ')[0]);
  const INTRO = {
    disc: () => `Son ${H.DISC_BLOQUES.length} bloques de cuatro palabras. En cada uno, marque la palabra que <b>más</b> se parece a usted en el trabajo y la que <b>menos</b>. Responda por lo que hace normalmente, no por lo que le gustaría.`,
    roles: () => `Son ${H.ROLES_ITEMS.length} frases sobre cómo trabaja en equipo. Indique en qué medida le describe cada una, de «nada» a «totalmente».`,
    enea: () => `Son ${H.ENEA_ITEMS.length} frases sobre lo que le mueve. Indique en qué medida le describe cada una, de «nada» a «totalmente».`,
    lid: () => `Son ${L.SITUACIONES.length} situaciones con alguien de su equipo. En cada una, elija lo que <b>haría de verdad</b>, no lo que cree que debería hacer. No hay respuestas buenas en abstracto: depende de cada situación.`,
    lid360: () => `Son ${L.SITUACIONES.length} situaciones de trabajo. Piense en cómo actúa <b>${esc(meta.lider || 'su responsable')}</b> y elija lo que <b>haría su responsable</b> con alguien del equipo. Sus respuestas son <b>anónimas</b>: se suman a las del resto del equipo.`,
    prep: () => `Son ${L.PREP_ITEMS.length} frases sobre la tarea <b>«${esc(meta.tarea || '')}»</b>. Piense solo en esta tarea, no en su trabajo en general.`
  };
  const PARA = {
    disc: 'conocer su estilo de comportamiento y cómo comunicarse mejor con usted',
    roles: 'conocer qué aporta cuando trabaja en equipo y equilibrar los equipos',
    enea: 'conocer lo que le motiva y cómo acompañarle mejor',
    lid: 'conocer su estilo de liderazgo y ajustarlo a cada persona y tarea',
    lid360: 'que su responsable sepa cómo vive el equipo su forma de dirigir y pueda mejorarla',
    prep: 'acordar con su responsable cómo le acompaña en esta tarea y qué necesita para ganar autonomía'
  };

  /* ---------- Guardado del avance ---------- */
  let tSave = null;
  const guardar = (fin) => {
    if (modo === 'codigo') { LS.set(lsKey, { resp, idx, consent }); return Promise.resolve(); }
    clearTimeout(tSave);
    const put = () => fetch('/api/t/' + token, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resp: limpia(), consent: true, fin: !!fin }) })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'No se pudo guardar'); return j; });
    if (fin) return put();
    tSave = setTimeout(() => put().catch(() => { /* se reintenta en la siguiente respuesta */ }), 600);
    LS.set(lsKey, { resp, idx, consent });
    return Promise.resolve();
  };

  /* ---------- Pantallas ---------- */
  const pantallaError = (t, d) => { main.innerHTML = `<div class="tp-card stack"><h1>${esc(t)}</h1>${d ? `<p>${d}</p>` : ''}</div>`; };
  const intro = () => {
    const T = C.TESTS[meta.test], hechos = limpia().filter((x) => x != null).length;
    main.innerHTML = `<div class="tp-card stack">
      <div class="eyebrow">${esc(meta.empresa || 'Su empresa')} le pide</div>
      <h1>${meta.nombre ? 'Hola, ' + nombre1() + '.' : 'Hola.'} <em>${esc(T.n)}</em></h1>
      <p>${INTRO[meta.test]()}</p>
      <p class="tp-meta"><span>Unos ${T.min} minutos</span><span>Sin crear cuenta</span><span>${modo === 'servidor' ? 'Puede dejarlo y seguir luego con este enlace' : 'Su avance se guarda en este navegador'}</span></p>
      <div class="tp-legal"><b>Para qué se usan sus respuestas.</b> Para ${PARA[meta.test]}. Es una herramienta orientativa: no es un examen, no mide su valor y no debe usarse como único criterio para ninguna decisión sobre usted. Puede ver su resultado y pedir a ${esc(meta.empresa || 'la empresa')} que lo borre cuando quiera.</div>
      <label class="tp-check"><input type="checkbox" id="tpOk" ${consent ? 'checked' : ''}> <span>He leído para qué se usan mis respuestas y acepto responder.</span></label>
      <div class="row"><button class="btn solid big" id="tpGo" ${consent ? '' : 'disabled'}>${hechos ? `Seguir (${hechos} de ${resp.length})` : 'Empezar'}</button></div></div>`;
    $('#tpOk').onchange = (e) => { consent = e.target.checked; $('#tpGo').disabled = !consent; };
    $('#tpGo').onclick = () => { const f = limpia().findIndex((x) => x == null); idx = f < 0 ? resp.length - 1 : f; pregunta(); };
  };
  const barra = () => `<div class="tp-prog"><span style="width:${(limpia().filter((x) => x != null).length / resp.length) * 100}%"></span></div><div class="tp-n">${idx + 1} de ${resp.length}</div>`;
  const nav = () => `<div class="row tp-nav"><button class="btn ghost" id="tpBack" ${idx ? '' : 'disabled'}>Atrás</button><span class="spacer"></span>${limpia()[idx] != null && idx < resp.length - 1 ? '<button class="btn" id="tpNext">Siguiente</button>' : ''}${limpia().every((x) => x != null) ? '<button class="btn solid" id="tpFin">Entregar</button>' : ''}</div>`;
  const avanzar = () => { guardar(); if (idx < resp.length - 1) { idx++; setTimeout(pregunta, 160); } else pregunta(); };
  const pregunta = () => {
    const it = items()[idx], t = meta.test;
    let cuerpo = '';
    if (t === 'disc') {
      const r = resp[idx] || {};
      cuerpo = `<p class="tp-q">¿Qué palabra se parece <b>más</b> a usted en el trabajo y cuál <b>menos</b>?</p><div class="tp-disc"><div class="tp-dh"><span></span><span>Más</span><span>Menos</span></div>${F.map((k, j) => { const f = F[(j + idx) % 4]; return `<div class="tp-dr"><span>${esc(it[f])}</span><button class="tp-rb ${r.mas === f ? 'on' : ''}" data-t="mas" data-f="${f}" aria-label="Más: ${esc(it[f])}" aria-pressed="${r.mas === f}"></button><button class="tp-rb menos ${r.menos === f ? 'on' : ''}" data-t="menos" data-f="${f}" aria-label="Menos: ${esc(it[f])}" aria-pressed="${r.menos === f}"></button></div>`; }).join('')}</div>`;
    } else if (t === 'lid' || t === 'lid360') {
      cuerpo = `<p class="tp-q">${esc(it.t)}</p><p class="small muted">${t === 'lid' ? '¿Qué haría usted?' : `¿Qué haría ${esc(meta.lider || 'su responsable')}?`}</p><div class="tp-ops">${it.ops.map((o, j) => `<button class="tp-op" aria-pressed="${resp[idx] === o.e}" data-v="${o.e}"><span>${String.fromCharCode(65 + j)}</span>${esc(o.t)}</button>`).join('')}</div>`;
    } else {
      const min = t === 'roles' ? 0 : 1, lab = t === 'prep' ? L.PREP_ESCALA : ESC5;
      cuerpo = `<p class="tp-q">${esc(t === 'prep' ? it.yo : it.t)}</p><div class="tp-esc">${lab.map((l, j) => `<button class="tp-ev" aria-pressed="${resp[idx] === min + j}" data-v="${min + j}"><b>${min + j}</b><span>${esc(l)}</span></button>`).join('')}</div>`;
    }
    main.innerHTML = `<div class="tp-card stack">${barra()}${cuerpo}${nav()}<p class="small muted tp-save" id="tpSave">${modo === 'servidor' ? 'Se guarda solo a cada respuesta.' : ''}</p></div>`;
    $$('.tp-rb').forEach((b) => (b.onclick = () => {
      const r = resp[idx] = Object.assign({}, resp[idx] || {}), k = b.dataset.t, o = k === 'mas' ? 'menos' : 'mas';
      r[k] = b.dataset.f; if (r[o] === r[k]) delete r[o];
      if (!(r.mas && r.menos)) { pregunta(); return; }
      avanzar();
    }));
    $$('.tp-op, .tp-ev').forEach((b) => (b.onclick = () => { resp[idx] = +b.dataset.v; avanzar(); }));
    $('#tpBack').onclick = () => { if (idx) { idx--; pregunta(); } };
    const nx = $('#tpNext'); if (nx) nx.onclick = () => { idx++; pregunta(); };
    const fi = $('#tpFin'); if (fi) fi.onclick = entregar;
  };
  // En DISC, un bloque con solo una de las dos marcas no cuenta como respondido
  const limpia = () => resp.map((x) => (x && typeof x === 'object' ? (x.mas && x.menos ? { mas: x.mas, menos: x.menos } : null) : x));

  const entregar = async () => {
    const r = limpia();
    if (r.some((x) => x == null)) { idx = r.findIndex((x) => x == null); return pregunta(); }
    resp = r;
    if (modo === 'servidor') {
      main.innerHTML = '<div class="tp-card"><p>Entregando…</p></div>';
      try { await guardar(true); } catch (e) { pantallaError('No se pudo entregar', esc(e.message) + ' Pruebe de nuevo en un momento.'); return; }
      LS.set(lsKey, null);
      main.innerHTML = `<div class="tp-card stack"><div class="eyebrow">Entregado</div><h1>Gracias${meta.nombre ? ', ' + nombre1() : ''}.</h1><p>Sus respuestas han llegado a ${esc(meta.empresa || 'la empresa')}. Ya puede cerrar esta página.</p>${resumen()}</div>`;
      return;
    }
    const code = C.codificar(meta.test, resp, meta.pid, meta.tid);
    LS.set(lsKey, { resp, idx, consent, code });
    finCodigo(code);
  };
  const finCodigo = (code) => {
    const txt = `Mi código de respuesta para ${C.TESTS[meta.test].n}: ${code}`;
    main.innerHTML = `<div class="tp-card stack"><div class="eyebrow">Terminado</div><h1>Gracias${meta.nombre ? ', ' + nombre1() : ''}. <em>Este es su código.</em></h1>
      <p>Envíe este código a quien le pidió el cuestionario${meta.empresa ? ' en ' + esc(meta.empresa) : ''}. Sus respuestas van dentro del código: no se han enviado a ningún sitio.</p>
      <div class="tp-code" id="tpCode">${esc(code)}</div>
      <div class="row"><button class="btn solid" id="tpCopy">Copiar el código</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Enviar por WhatsApp</a>${meta.email ? `<a class="btn ghost" href="mailto:${esc(meta.email)}?subject=${encodeURIComponent('Código de respuesta')}&body=${encodeURIComponent(txt)}">Enviar por correo</a>` : ''}</div>${resumen()}</div>`;
    $('#tpCopy').onclick = (e) => { (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => (e.target.textContent = 'Copiado'), () => { const s = getSelection(), rg = document.createRange(); rg.selectNodeContents($('#tpCode')); s.removeAllRanges(); s.addRange(rg); e.target.textContent = 'Selecciónelo y cópielo'; }); };
  };

  /* Resumen breve para la persona (si quien lo envía lo ha dejado activado) */
  const resumen = () => {
    if (meta.resumen === false) return '';
    const t = meta.test, r = resp;
    let h = '';
    if (t === 'disc') { const c = { D: 0, I: 0, S: 0, C: 0 }; r.forEach((x) => { c[x.mas]++; c[x.menos]--; }); const k = F.slice().sort((a, b) => c[b] - c[a])[0], D = H.DISC[k]; h = `<p>Su factor más alto es <b>${esc(D.n)}</b>: ${esc(D.resumen)}</p><p class="small">Aporta: ${esc(D.aporta.join(', ').toLowerCase())}.</p>`; }
    else if (t === 'roles') { const s = {}; H.ROLES_ITEMS.forEach((it, i) => (s[it.rol] = (s[it.rol] || 0) + r[i])); const top = Object.keys(s).sort((a, b) => s[b] - s[a]).slice(0, 3); h = `<p>Sus aportaciones más naturales al equipo: <b>${top.map((k) => esc(H.ROLES[k].n)).join(', ')}</b>.</p><p class="small">${esc(H.ROLES[top[0]].aporta)}</p>`; }
    else if (t === 'enea') { const s = {}; H.ENEA_ITEMS.forEach((it, i) => (s[it.tipo] = (s[it.tipo] || 0) + r[i])); const k = Object.keys(s).sort((a, b) => s[b] - s[a])[0], E = H.ENEA[k]; h = `<p>Su motivación principal se parece al tipo <b>${k} · ${esc(E.n)}</b>: ${esc(E.motivacion)}</p>`; }
    else if (t === 'lid') { const u = { 1: 0, 2: 0, 3: 0, 4: 0 }; r.forEach((e) => u[e]++); const k = Object.keys(u).sort((a, b) => u[b] - u[a])[0]; h = `<p>El estilo que más ha elegido es <b>${esc(L.ESTILOS[k].n)}</b>: ${esc(L.ESTILOS[k].que)}</p><p class="small">El modelo no busca un estilo mejor, sino usar el que toca con cada persona en cada tarea. Lo verá con detalle con su consultor o su responsable.</p>`; }
    else if (t === 'prep') { const s = { cap: 0, dis: 0 }; L.PREP_ITEMS.forEach((it, i) => (s[it.f] += r[i])); const cap = ((s.cap - 4) / 16) * 100, dis = ((s.dis - 4) / 16) * 100, n = cap < 40 ? 1 : cap < 65 ? 2 : dis >= 70 ? 4 : 3; h = `<p>Según sus respuestas, en esta tarea está en el nivel <b>${esc(L.NIVELES[n].n)}</b>: ${esc(L.NIVELES[n].lectura)}</p>`; }
    return h ? `<div class="tp-res"><div class="eyebrow">Su resumen</div>${h}<p class="small muted">Es una lectura orientativa. El resultado completo lo comentará con quien le envió el cuestionario.</p></div>` : '';
  };

  /* ---------- Arranque ---------- */
  async function start() {
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('t')) {
      modo = 'servidor'; token = h.get('t'); lsKey = 'atalaya.test.t.' + token.slice(0, 12);
      let j;
      try { const r = await fetch('/api/t/' + encodeURIComponent(token), { credentials: 'omit' }); j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Enlace no válido'); }
      catch (e) { pantallaError('No se puede abrir el cuestionario', esc(e.message) + ' Si el problema sigue, pida a quien se lo envió un enlace nuevo.'); return; }
      meta = j;
      if (j.estado === 'completado') { pantallaError('Este cuestionario ya está entregado', 'Gracias. Sus respuestas ya llegaron. Si quiere cambiar algo, pida a quien se lo envió un enlace nuevo.'); return; }
      if (j.estado === 'caducado') { pantallaError('Este enlace ha caducado', 'Pida a quien se lo envió un enlace nuevo.'); return; }
      if (j.estado === 'anulado') { pantallaError('Este enlace ya no está activo', 'Puede que le hayan enviado uno más reciente.'); return; }
      const loc = LS.get(lsKey);
      resp = Array.isArray(j.resp) ? j.resp : (loc && loc.resp) || null; consent = !!j.consent || !!(loc && loc.consent);
    } else if (h.get('c')) {
      modo = 'codigo';
      try { const o = C.leerPaquete(h.get('c')); meta = { test: o.t, nombre: o.n, empresa: o.e, pid: o.p, tid: o.ti, tarea: o.ta, lider: o.l, email: o.m, resumen: o.r !== 0 }; } catch (e) { meta = null; }
      if (!meta || !C.TESTS[meta.test]) { pantallaError('El enlace está incompleto', 'Pida a quien se lo envió que se lo mande de nuevo.'); return; }
      lsKey = 'atalaya.test.c.' + C.huella(h.get('c'), meta.test);
      const loc = LS.get(lsKey);
      if (loc && loc.code) { resp = loc.resp; finCodigo(loc.code); $('#tpEmp').textContent = meta.empresa || ''; return; }
      resp = loc && loc.resp; consent = !!(loc && loc.consent);
    } else { pantallaError('Falta el enlace del cuestionario', 'Abra el enlace completo que le enviaron.'); return; }
    const n = C.TESTS[meta.test].len();
    if (!Array.isArray(resp) || resp.length !== n) resp = Array.from({ length: n }, () => null);
    $('#tpEmp').textContent = meta.empresa || '';
    document.title = 'Atalaya · ' + C.TESTS[meta.test].n;
    intro();
  }
  start();
  addEventListener("hashchange", () => location.reload());
})();
