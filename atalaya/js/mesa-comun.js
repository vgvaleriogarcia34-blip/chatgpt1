/* Atalaya 360° · Mesa de trabajo · enlace común
   Cualquier mundo (simulador, sistema estratégico, personas y equipos, auditoría integral) envía trabajo a la mesa de
   trabajo de la empresa activa: A.mesa.enviar([{ t, area, mundo, origen, oid, fecha, resp, impacto, aka }], opciones).
   · Identificador de origen: A.mesa.oid(mundo, tipo, id) → 'mundo:tipo:id', con el id propio de la acción en su mundo
     (nunca su texto ni su posición). Los identificadores antiguos se traducen al cargar (A.mesa.normOid) y los
     duplicados se fusionan. «aka» lleva identificadores antiguos que solo el origen sabe traducir.
   · Reenviar actualiza texto, fecha, responsable y área de las tareas abiertas. Con { origen: prefijo(s), completo: true }
     la lista es la completa de ese origen: lo que ya no llega se marca «ya no aplica» (estado 'noaplica'), sin borrarlo.
   · Estado en los dos sentidos: A.mesa.aOrigen(oid, hecha) escribe el estado en el origen; A.mesa.cerrar(oid, hecha)
     cierra (o reabre) la tarea de la mesa desde el origen; A.mesa.marcar(nodo) rellena los [data-mesa-oid] y
     [data-mesa-meta] con «En la mesa · hecha el …».
   · Objetivos: las metas llevan «objetivoId» (el oid del objetivo: intervencion:objetivo:<id>,
     estrategia:objetivo-plan:<id>, estrategia:objetivo:<módulo>:<id> o intervencion:causa:<id>). */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const P = () => A.platform;
  const LSK = () => (P() && P().k ? P().k('atalaya.agenda.v1') : 'atalaya.agenda.v1');
  const M = (A.mesa = A.mesa || {});
  M.vacia = () => ({ v: 1, tareas: [], repetitivas: [], metas: [], semana: [], reuniones: [], delegaciones: [], descartadas: [], logros: {} });
  M.uid = () => 't' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
  M.hoy = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

  /* ---------- Identificadores ---------- */
  M.oid = (mundo, tipo, id) => [mundo, tipo, id].map((x) => String(x == null ? '' : x)).join(':');
  M.partes = (oid) => { const s = String(oid || ''), i = s.indexOf(':'), j = s.indexOf(':', i + 1); return i < 1 || j < 0 ? null : { mundo: s.slice(0, i), tipo: s.slice(i + 1, j), id: s.slice(j + 1) }; };
  const normT = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  // Id estable para dar a un elemento antiguo que no lo tenía: se calcula una sola vez con su texto de entonces y se guarda
  M.idTexto = (s) => 'h' + hash(normT(s));
  // Texto sin HTML (algunos orígenes escriben <b>…</b>)
  M.texto = (s) => String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  /* Equivalencias de identificadores antiguos → nuevos (t: la tarea, para los que solo se pueden traducir con su texto) */
  const EQUIV = [
    [/^iv(?:-acc)?:(.+)$/, (m) => M.oid('intervencion', 'accion', m[1])],
    [/^iv-acu:([^:]+):(.+)$/, (m, t) => M.oid('intervencion', 'acuerdo', m[1] + ':' + (/^\d+$/.test(m[2]) ? M.idTexto(t && t.t) : m[2]))],
    [/^iv-hito:([^:]+):(.+)$/, (m) => M.oid('intervencion', 'hito', m[1] + ':' + m[2])],
    [/^iv-ses:(.+)$/, (m) => M.oid('intervencion', 'sesion', m[1])],
    [/^iv-sinr:(.*)$/, (m) => M.oid('intervencion', 'preguntas', m[1])],
    [/^iv-obj:(.+)$/, (m) => M.oid('intervencion', 'objetivo', m[1])],
    [/^iv-(?:meta|causa):(.+)$/, (m) => M.oid('intervencion', 'causa', m[1])],
    [/^est:plan:(.+)$/, (m) => M.oid('estrategia', 'plan', M.idTexto(m[1]))],
    [/^est:360:([^:]+):o:(\d+)$/, (m) => M.oid('estrategia', 'objetivo', m[1] + ':#' + m[2])],
    [/^est:360:([^:]+):(.+)$/, (m) => M.oid('estrategia', 'accion', m[1] + ':' + m[2])],
    [/^est:obj:([^:]+):(.+)$/, (m) => M.oid('estrategia', 'objetivo', m[1] + ':' + M.idTexto(m[2]))],
    [/^est-obj:([^:]+):(\d+)$/, (m) => M.oid('estrategia', 'objetivo', m[1] + ':#' + m[2])],
    [/^est-plan:(.+)$/, (m) => M.oid('estrategia', 'objetivo-plan', m[1])],
    [/^per:lid:([^:]+):(.+)$/, (m) => M.oid('personas', 'acuerdo', m[1] + ':' + M.idTexto(m[2]))],
    [/^per:plan:([^:]+):(.+)$/, (m) => M.oid('personas', 'plan', m[1] + ':' + M.idTexto(m[2]))],
    [/^per:paso:([^:]+):(.+)$/, (m) => M.oid('personas', 'paso', m[1] + ':' + m[2])],
    [/^sim:plan:(.+)$/, (m) => M.oid('simulador', 'palanca', M.idTexto(m[1]))]
  ];
  /* Ids propios para lo que nació sin id (se calculan igual en todas las páginas: el texto de entonces, sin repetir) */
  const darIds = (l, campo, pre) => { let n = 0; const ya = new Set(l.map((x) => x && x.id).filter(Boolean)); l.forEach((x) => { if (!x || x.id) return; let id = (pre || '') + M.idTexto(x[campo]), k = 2; while (ya.has(id)) id = (pre || '') + M.idTexto(x[campo]) + '-' + k++; x.id = id; ya.add(id); n++; }); return n; };
  M.idsEstrategia = (est) => {
    if (!est || typeof est !== 'object') return 0;
    let n = 0;
    if (est.plan && Array.isArray(est.plan.acciones)) n += darIds(est.plan.acciones, 'accion');
    if (est.plan && Array.isArray(est.plan.objetivos)) n += darIds(est.plan.objetivos, 'nombre');
    Object.keys(est.c360 || {}).forEach((mod) => {
      const c = est.c360[mod]; if (!c || !Array.isArray(c.obj)) return;
      c.obj.forEach((o, i) => { if (!o || o.id) return; n += darIds([o].concat(c.obj.filter((x) => x && x !== o && x.id)), 'k'); if (c.plan && c.plan['o:' + i] && !c.plan['o:' + o.id]) { c.plan['o:' + o.id] = c.plan['o:' + i]; delete c.plan['o:' + i]; } o.pos = i; });
    });
    return n;
  };
  M.idsIntervencion = (iv) => {
    if (!iv || typeof iv !== 'object') return 0;
    let n = 0;
    (iv.sesiones || []).forEach((se) => { if (Array.isArray(se.acuerdos)) n += darIds(se.acuerdos.filter((x) => x && x.t), 't'); });
    (iv.objetivos || []).forEach((o) => { if (Array.isArray(o.hitos)) n += darIds(o.hitos.filter((x) => x && x.t), 't'); });
    return n;
  };
  // El oid de una acción del plan de empresa: si vino de un módulo (diagnóstico 360), el de esa acción
  M.oidPlanEst = (a) => (a.de ? M.oid('estrategia', /^[^:]+:o:/.test(a.de) ? 'objetivo' : 'accion', /^[^:]+:o:/.test(a.de) ? a.de.replace(':o:', ':') : a.de) : M.oid('estrategia', 'plan', a.id || M.idTexto(a.accion)));
  M.normOid = (oid, t) => { if (!oid) return oid; const s = String(oid); for (const [re, fn] of EQUIV) { const m = s.match(re); if (m) return fn(m, t); } return s; };
  const esObjetivo = (oid) => /^(intervencion:(objetivo|causa)|estrategia:(objetivo|objetivo-plan)):/.test(oid || '');

  /* ---------- Estados ---------- */
  const RANGO = { hecha: 3, curso: 2, pendiente: 1, noaplica: 0 };
  const rango = (t) => (RANGO[t && t.estado] != null ? RANGO[t.estado] : 1);
  M.abierta = (t) => !!t && t.estado !== 'hecha' && t.estado !== 'noaplica';

  /* ---------- Normalizar: oids nuevos, duplicados fusionados, textos sin HTML ---------- */
  const fusionTareas = (st, l) => {
    // La que gana: la de estado más avanzado (hecha > en curso > pendiente); a igualdad, la más antigua
    const p = l.slice().sort((a, b) => rango(b) - rango(a) || String(a.entrada || '9').localeCompare(String(b.entrada || '9')))[0];
    l.forEach((o) => {
      if (o === p) return;
      if (!p.fecha && o.fecha) { p.fecha = o.fecha; if (!p.hora && o.hora) { p.hora = o.hora; p.dur = o.dur || p.dur; } }
      if (o.notas && String(p.notas || '').indexOf(o.notas) < 0) p.notas = [p.notas, o.notas].filter(Boolean).join('\n');
      ['resp', 'area', 'contacto', 'metaId', 'objetivoId', 'hecha'].forEach((k) => { if (!p[k] && o[k]) p[k] = o[k]; });
      if (o.clave) p.clave = true;
      if (o.entrada && (!p.entrada || o.entrada < p.entrada)) p.entrada = o.entrada;
      (st.metas || []).forEach((m) => (m.acciones || []).forEach((a) => { if (a.tareaId === o.id) a.tareaId = p.id; }));
    });
    st.tareas = st.tareas.filter((x) => x === p || l.indexOf(x) < 0);
    return p;
  };
  const llenado = (m) => ['especifica', 'indicador', 'valor', 'fecha', 'responsable', 'beneficio'].filter((k) => m[k] !== '' && m[k] != null).length + (m.acciones || []).filter((a) => a.t).length;
  M.normalizar = (st) => {
    let n = 0;
    (st.tareas || []).forEach((t) => {
      if (t.oid) { const o = M.normOid(t.oid, t); if (o !== t.oid) { t.oid = o; n++; } }
      if (/<[a-z/][^>]*>/i.test(t.t || '')) { t.t = M.texto(t.t); n++; }
      if (t.origen === 'modelo') { t.origen = 'Tarea de ejemplo de la empresa modelo'; t.mundo = t.mundo || 'manual'; n++; }
      // Reuniones que agenda el asistente telefónico (oid asistente:reunion:<id>): su origen es el asistente
      if (/^asistente:/.test(t.oid || '') && (t.mundo !== 'asistente' || t.origen === 'asistente' || !t.origen)) { t.mundo = 'asistente'; if (!t.origen || t.origen === 'asistente') t.origen = 'Asistente telefónico · reunión agendada'; n++; }
    });
    const desc = (st.descartadas || []).map((o) => M.normOid(o)); if (desc.join('|') !== (st.descartadas || []).join('|')) { st.descartadas = Array.from(new Set(desc)); n++; }
    const grupos = {}; st.tareas.forEach((t) => { if (t.oid) (grupos[t.oid] = grupos[t.oid] || []).push(t); });
    Object.values(grupos).filter((l) => l.length > 1).forEach((l) => { fusionTareas(st, l); n += l.length - 1; });
    // Metas: un objetivo, una meta
    (st.metas || []).forEach((m) => {
      if (m.oid) { const o = M.normOid(m.oid); if (o !== m.oid) { m.oid = o; n++; } }
      if (!m.objetivoId && esObjetivo(m.oid)) { m.objetivoId = m.oid; n++; }
    });
    const gm = {}; (st.metas || []).forEach((m) => { const k = m.objetivoId || m.oid; if (k) (gm[k] = gm[k] || []).push(m); });
    Object.values(gm).filter((l) => l.length > 1).forEach((l) => {
      const p = l.slice().sort((a, b) => (b.estado === 'cumplida') - (a.estado === 'cumplida') || llenado(b) - llenado(a))[0];
      l.forEach((o) => {
        if (o === p) return;
        Object.keys(o).forEach((k) => { if ((p[k] === '' || p[k] == null) && o[k] !== '' && o[k] != null) p[k] = o[k]; });
        if (!(p.acciones || []).some((a) => a.t)) p.acciones = o.acciones;
        st.tareas.forEach((t) => { if (t.metaId === o.id) t.metaId = p.id; });
        (st.repetitivas || []).forEach((r) => { if (r.metaId === o.id) r.metaId = p.id; });
      });
      st.metas = st.metas.filter((x) => x === p || l.indexOf(x) < 0); n += l.length - 1;
    });
    // Una sola revisión semanal por meta
    const vistas = new Set(); const r0 = (st.repetitivas || []).length;
    st.repetitivas = (st.repetitivas || []).filter((r) => { if (!r.metaId) return true; if (vistas.has(r.metaId)) return false; vistas.add(r.metaId); return true; });
    n += r0 - st.repetitivas.length;
    return n;
  };

  M.cargar = async () => {
    let st = null;
    try { st = JSON.parse(localStorage.getItem(LSK())); } catch (e) { st = null; }
    if (P() && P().loadData) { try { const r = await P().loadData('agenda'); if (r) st = r; } catch (e) { /* local */ } }
    st = Object.assign(M.vacia(), st || {});
    Object.keys(M.vacia()).forEach((k) => { if (k !== 'v' && k !== 'logros' && !Array.isArray(st[k])) st[k] = []; });
    if (!st.logros || typeof st.logros !== 'object') st.logros = {};
    if (M.normalizar(st)) { try { await M.guardarYa(st); } catch (e) { /* se guardará con el siguiente cambio */ } }
    return st;
  };
  M.guardarYa = async (st) => { cache = null; try { localStorage.setItem(LSK(), JSON.stringify(st)); } catch (e) { /* sin almacenamiento */ } if (P() && P().saveData) await P().saveData('agenda', st); };

  /* ---------- Envío (y reenvío) ---------- */
  const CAMPOS = ['t', 'fecha', 'resp', 'area', 'origen', 'mundo', 'objetivoId'];
  M.fusionar = (st, items, op) => {
    op = op || {};
    const r = { nuevas: 0, actualizadas: 0, retiradas: 0, cerradas: 0, difieren: 0, descartadas: 0, desc: [] }, vistos = new Set((op.vigentes || []).map((o) => M.normOid(o)));
    const desc = new Set((st.descartadas || []).map((o) => M.normOid(o)));
    (items || []).forEach((x0) => {
      if (!x0 || !x0.t) return;
      const x = Object.assign({}, x0); x.t = M.texto(x.t);
      const aka = (x.aka || []).map((o) => M.normOid(o, x)).filter(Boolean); delete x.aka;
      const hechaO = x.hechaEnOrigen; delete x.hechaEnOrigen;
      const f0 = x.fecha0; delete x.fecha0;
      if (x.oid) x.oid = M.normOid(x.oid, x);
      if (!x.oid) { if (hechaO) return; st.tareas.push(Object.assign({ id: M.uid(), entrada: M.hoy(), tipo: 'importante', estado: 'pendiente', impacto: 3, esfuerzo: 3, clave: false }, x, { fecha: x.fecha || f0 || '' })); r.nuevas++; return; }
      vistos.add(x.oid); aka.forEach((a) => vistos.add(a));
      let l = st.tareas.filter((t) => t.oid === x.oid || aka.indexOf(t.oid) >= 0);
      const t = l.length > 1 ? fusionTareas(st, l) : l[0];
      if (!t) {
        if (hechaO) return;
        // Borrada en la mesa: no vuelve sola, pero el resumen lo dice y se puede volver a crear (M.recrear)
        if (desc.has(x.oid) || aka.some((a) => desc.has(a))) { r.descartadas++; r.desc.push(x0); return; }
        st.tareas.push(Object.assign({ id: M.uid(), entrada: M.hoy(), tipo: 'importante', estado: 'pendiente', impacto: 3, esfuerzo: 3, clave: false }, x, { fecha: x.fecha || f0 || '' }));
        r.nuevas++; return;
      }
      t.oid = x.oid;
      if (hechaO) { if (t.estado !== 'hecha') { t.estado = 'hecha'; t.hecha = typeof hechaO === 'string' ? hechaO : M.hoy(); r.cerradas++; } return; }
      if (t.estado === 'hecha') {
        // Hecha, pero el origen ha cambiado lo que pide (otro importe, otra cifra): se anota en la tarea y se avisa
        if (x.t && M.texto(x.t) !== M.texto(t.t) && t.difVale !== x.t) { if (!t.difiere || t.difiere.t !== x.t) t.difiere = { t: x.t, el: M.hoy() }; r.difieren++; } else if (t.difiere) delete t.difiere;
        return;
      }
      let cambio = false;
      if (t.estado === 'noaplica') { t.estado = 'pendiente'; delete t.noAplica; cambio = true; }
      CAMPOS.forEach((k) => { if (x[k] != null && x[k] !== '' && x[k] !== t[k]) { t[k] = x[k]; cambio = true; } });
      if (cambio) r.actualizadas++;
    });
    // Lista completa de un origen: lo abierto que ya no llega, «ya no aplica»
    if (op.completo && op.origen) {
      const pre = [].concat(op.origen);
      st.tareas.forEach((t) => { if (t.oid && pre.some((p) => t.oid.indexOf(p) === 0) && !vistos.has(t.oid) && M.abierta(t)) { t.estado = 'noaplica'; t.noAplica = M.hoy(); r.retiradas++; } });
    }
    return r;
  };
  M.enviar = async (items, op) => {
    const st = await M.cargar();
    const r = M.fusionar(st, items, op);
    await M.guardarYa(st);
    M.enviar.ultimo = r;
    return r.nuevas;
  };
  M.resumen = (r) => { r = r || M.enviar.ultimo || {}; const p = (n, a, b) => `${n} ${n === 1 ? a : b}`; const l = [r.nuevas ? p(r.nuevas, 'nueva', 'nuevas') : '', r.actualizadas ? p(r.actualizadas, 'actualizada', 'actualizadas') : '', r.retiradas ? p(r.retiradas, 'ya no aplica', 'ya no aplican') : '', r.cerradas ? p(r.cerradas, 'cerrada', 'cerradas') : '', r.difieren ? p(r.difieren, 'hecha con datos distintos en el origen', 'hechas con datos distintos en el origen') : '', r.descartadas ? p(r.descartadas, 'que se borró de la mesa y no se ha vuelto a crear', 'que se borraron de la mesa y no se han vuelto a crear') : ''].filter(Boolean); return l.length ? 'En la mesa: ' + l.join(', ') + '.' : 'Ya estaba todo en la mesa, al día.'; };
  /* Botón estándar «A mi mesa de trabajo»: devuelve el elemento ya conectado. op: opciones de envío (u objeto devuelto por una función) */
  M.boton = (fn, txt, op) => {
    const b = document.createElement('button'); b.className = 'btn ghost small mesa-btn'; b.type = 'button'; b.textContent = txt || 'A mi mesa de trabajo';
    b.onclick = async () => { b.disabled = true; try { await M.enviar(fn(), typeof op === 'function' ? op() : op); b.textContent = M.resumen(); M.ofrecerRecrear(b); b.dispatchEvent(new CustomEvent('mesa:enviado', { bubbles: true })); } catch (e) { b.textContent = 'No se pudo enviar'; } setTimeout(() => { b.disabled = false; b.textContent = txt || 'A mi mesa de trabajo'; }, 3500); };
    return b;
  };
  /* Volver a crear en la mesa lo que se borró allí (deja de estar descartado) */
  M.recrear = async (items) => {
    const st = await M.cargar(), ks = new Set();
    (items || []).forEach((x) => { if (x && x.oid) ks.add(M.normOid(x.oid, x)); ((x && x.aka) || []).forEach((a) => ks.add(M.normOid(a, x))); });
    st.descartadas = (st.descartadas || []).filter((o) => !ks.has(M.normOid(o)));
    const r = M.fusionar(st, items); await M.guardarYa(st); M.enviar.ultimo = r; return r;
  };
  /* Tras un envío con tareas borradas en la mesa: botón «Volver a crearlas» junto al elemento indicado */
  M.ofrecerRecrear = (el, r, fn) => {
    r = r || M.enviar.ultimo || {}; if (!el || !el.parentNode) return null;
    const prev = el.parentNode.querySelector('.mesa-recrear'); if (prev) prev.remove();
    const l = (r.desc || []).slice(); if (!l.length) return null;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small mesa-recrear';
    b.textContent = l.length === 1 ? 'Volver a crear en la mesa la tarea borrada' : `Volver a crear en la mesa las ${l.length} tareas borradas`;
    b.onclick = async () => { b.disabled = true; try { const x = fn ? await fn(l) : await M.recrear(l); b.textContent = x.nuevas === 1 ? 'Vuelve a estar en la mesa.' : `${x.nuevas} vuelven a estar en la mesa.`; } catch (e) { b.textContent = 'No se pudo volver a crear'; } setTimeout(() => b.remove(), 4000); };
    el.after(b); setTimeout(() => { if (!b.disabled) b.remove(); }, 30000);
    return b;
  };

  /* ---------- Ir al origen ---------- */
  const MOD_ID = /^[a-z0-9-]+$/i;
  // La pantalla de origen con «?ir=<oid>»: al abrirla se desplaza hasta la acción y la resalta (M.irA)
  M.urlOrigen = (oid) => { const u = M.pantallaOrigen(oid); return u ? u.replace('#', '?ir=' + encodeURIComponent(M.normOid(oid)) + '#') : ''; };
  M.pantallaOrigen = (oid) => {
    const p = M.partes(oid); if (!p) return '';
    const mod = p.id.split(':')[0];
    if (p.mundo === 'intervencion') return 'intervencion.html#' + ({ accion: 'plan', acuerdo: 'sesiones', sesion: 'sesiones', hito: 'objetivos', objetivo: 'objetivos', causa: 'sintomas', preguntas: 'guion' }[p.tipo] || 'plan');
    if (p.mundo === 'estrategia') return 'estrategia.html#' + (p.tipo === 'plan' || p.tipo === 'objetivo-plan' || !MOD_ID.test(mod) ? 'plan' : mod);
    if (p.mundo === 'personas') return 'personas.html#' + (p.tipo === 'acuerdo' ? 'lid-mapa' : 'lid-plan');
    if (p.mundo === 'simulador') return 'app.html#plan';
    return '';
  };
  /* Al llegar desde la mesa («?ir=<oid>»): espera a que la pantalla pinte la acción, la centra y la resalta.
     Cada origen marca sus elementos con data-ir, data-mesa-oid, data-mesa-ok o data-mesa-meta; M.alIr['mundo:tipo']
     prepara la pantalla si hace falta (elegir la sesión de un acuerdo, por ejemplo). */
  M.alIr = M.alIr || {};
  const estiloIr = () => { if (document.getElementById('mesaIrCss')) return; const st = document.createElement('style'); st.id = 'mesaIrCss'; st.textContent = '.mesa-foco{outline:3px solid var(--gold,#d8b24a);outline-offset:4px;border-radius:8px;box-shadow:0 0 0 8px rgba(216,178,74,.18);transition:outline-color 1s,box-shadow 1s}.mesa-foco-fin{outline-color:transparent;box-shadow:none}'; document.head.appendChild(st); };
  M.buscarIr = (oid) => {
    const q = (a) => `[${a}="${String(oid).replace(/["\\]/g, '\\$&')}"]`;
    const el = document.querySelector(['data-ir', 'data-mesa-oid', 'data-mesa-ok', 'data-mesa-meta'].map(q).join(','));
    if (!el) return null;
    return el.matches('[data-ir]') ? el : el.closest('[data-ir-bloque], li, tr, .step, .c3-act, .iv-hito, .iv-acu, .iv-obj, .cobj, .card') || el;
  };
  M.irA = (oid, max) => {
    if (!oid) return;
    const p = M.partes(oid), prep = p && M.alIr[p.mundo + ':' + p.tipo];
    let n = 0, hecho = null, prepN = 0, tocado = false;
    const toca = () => { tocado = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => addEventListener(ev, toca, { once: true, passive: true }));
    const paso = () => {
      n++;
      if (prep && prepN < 3 && !M.buscarIr(oid)) { try { if (prep(p, oid) !== false) prepN++; } catch (e) { prepN = 3; } }
      const el = M.buscarIr(oid);
      if (el && el.getClientRects().length) {
        // La pantalla puede moverse sola al arrancar (ir a su sección): mientras el usuario no toque nada, se recoloca
        const r = el.getBoundingClientRect(), fuera = r.bottom < 0 || r.top > innerHeight;
        if (el === hecho && fuera && !tocado) el.scrollIntoView({ block: 'center' });
        if (el !== hecho) { estiloIr(); el.classList.add('mesa-foco'); el.classList.remove('mesa-foco-fin'); el.scrollIntoView({ block: 'center' }); if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); try { el.focus({ preventScroll: true }); } catch (e) { /* nada */ } hecho = el; }
        // La pantalla puede repintarse justo después de cargar: se vuelve a comprobar unos segundos
        if (n < (max || 60) && n < 40) setTimeout(paso, 250); else setTimeout(() => el.classList.add('mesa-foco-fin'), 4000);
        return;
      }
      if (n < (max || 60)) setTimeout(paso, 250);
    };
    setTimeout(paso, 300);
  };
  const irPedido = () => { let o = ''; try { o = new URLSearchParams(location.search).get('ir') || ''; } catch (e) { o = ''; } if (!o) return; M.irA(o); try { const q = new URLSearchParams(location.search); q.delete('ir'); history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) { /* nada */ } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', irPedido); else irPedido();

  /* ---------- Estado en el origen ----------
     Cada origen guarda el estado donde lo lee su página; donde no hay un campo propio, en «mesaEstado» { oid: { estado, fecha } }. */
  const fechaDe = (h) => (h ? (typeof h === 'string' ? h : M.hoy()) : '');
  const marcaGen = (d, oid, h) => { d.mesaEstado = d.mesaEstado || {}; if (h) d.mesaEstado[oid] = { estado: 'hecha', fecha: fechaDe(h) }; else delete d.mesaEstado[oid]; return true; };
  const ORIGEN = {
    intervencion: { clave: 'intervencion', aplicar(d, p, h, oid) {
      const ids = p.id.split(':');
      if (p.tipo === 'accion') { const a = ((d.plan && d.plan.acciones) || []).find((x) => x.id === p.id); if (!a) return false; if (h) { a.estado = 'hecha'; a.hechaEl = fechaDe(h); } else if (a.estado === 'hecha') { a.estado = 'pendiente'; delete a.hechaEl; } return true; }
      if (p.tipo === 'acuerdo') { const se = (d.sesiones || []).find((x) => x.id === ids[0]); const x = se && (se.acuerdos || []).find((y) => (y.id || M.idTexto(y.t)) === ids.slice(1).join(':')); if (!x) return false; x.id = x.id || ids.slice(1).join(':'); x.hecho = h ? fechaDe(h) : false; return true; }
      if (p.tipo === 'hito') { const o = (d.objetivos || []).find((x) => x.id === ids[0]); const x = o && (o.hitos || []).find((y) => y.id === ids.slice(1).join(':')); if (!x) return false; x.hecho = h ? fechaDe(h) : ''; return true; }
      if (p.tipo === 'objetivo') { const o = (d.objetivos || []).find((x) => x.id === p.id); if (!o) return false; if (h) o.cumplido = fechaDe(h); else delete o.cumplido; return true; }
      if (p.tipo === 'causa') { const c = (d.causas || []).find((x) => x.id === p.id); if (!c) return false; if (h) c.metaCumplida = fechaDe(h); else delete c.metaCumplida; return true; }
      return marcaGen(d, oid, h);
    } },
    estrategia: { clave: 'estrategia', aplicar(d, p, h, oid) {
      const ids = p.id.split(':'), est = h ? 'Hecha' : 'Pendiente';
      const reabrir = (x, k) => { if (h) x[k] = 'Hecha'; else if (x[k] === 'Hecha') x[k] = 'Pendiente'; };
      const enPlan = (de) => ((d.plan && d.plan.acciones) || []).filter((a) => a.de === de).forEach((a) => reabrir(a, 'estado'));
      if (p.tipo === 'accion') { const c = d.c360 && d.c360[ids[0]]; if (!c) return false; c.plan = c.plan || {}; const k = ids.slice(1).join(':'); const x = c.plan[k] || (c.plan[k] = {}); if (h || x.estado === 'Hecha') x.estado = est; enPlan(p.id); return true; }
      if (p.tipo === 'plan') { const a = ((d.plan && d.plan.acciones) || []).find((x) => x.id === p.id); if (!a) return false; reabrir(a, 'estado'); return true; }
      if (p.tipo === 'objetivo') { const c = d.c360 && d.c360[ids[0]]; const o = c && (c.obj || []).find((x) => x.id === ids.slice(1).join(':')); if (!o) return false; if (h) o.cumplido = fechaDe(h); else delete o.cumplido; const k = 'o:' + o.id; c.plan = c.plan || {}; const x = c.plan[k] || (c.plan[k] = {}); if (h || x.estado === 'Hecha') x.estado = est; enPlan(p.id); return true; }
      if (p.tipo === 'objetivo-plan') { const o = ((d.plan && d.plan.objetivos) || []).find((x) => x.id === p.id); if (!o) return false; if (h) o.cumplido = fechaDe(h); else delete o.cumplido; return true; }
      return marcaGen(d, oid, h);
    } },
    personas: { clave: 'personas', aplicar(d, p, h, oid) {
      if (p.tipo === 'acuerdo') { const ids = p.id.split(':'); const c = (d.personas || []).find((x) => x.id === ids[0]); const t = c && (c.tareas || []).find((x) => x.id === ids[1]); if (t && t.acuerdo) { if (h) t.acuerdo.revisado = fechaDe(h); else delete t.acuerdo.revisado; } }
      return marcaGen(d, oid, h);
    } },
    simulador: { clave: 'simulador', aplicar: (d, p, h, oid) => marcaGen(d, oid, h) }
  };
  // Escribe en el origen que la tarea (o la meta de un objetivo) está hecha (h: fecha o true) o abierta (h: falso)
  M.aOrigen = async (oid, h) => {
    const p = M.partes(oid), o = p && ORIGEN[p.mundo]; if (!o || !P() || !P().loadData) return false;
    try {
      const d = await P().loadData(o.clave); if (!d || typeof d !== 'object') return false;
      if (o.clave === 'intervencion') M.idsIntervencion(d); else if (o.clave === 'estrategia') M.idsEstrategia(d);
      if (!o.aplicar(d, p, h, oid)) return false;
      await P().saveData(o.clave, d); return true;
    } catch (e) { return false; }
  };
  // Desde el origen: cierra (o reabre) la tarea de la mesa con ese oid; devuelve si había tarea
  M.cerrar = async (oid, h, aka) => {
    if (!oid) return false;
    const st = await M.cargar(), ks = [M.normOid(oid)].concat((aka || []).map((x) => M.normOid(x)));
    const l = st.tareas.filter((t) => ks.indexOf(t.oid) >= 0), lm = st.metas.filter((m) => ks.indexOf(m.objetivoId) >= 0 || ks.indexOf(m.oid) >= 0);
    let n = 0;
    l.forEach((t) => { if (h && t.estado !== 'hecha') { t.estado = 'hecha'; t.hecha = fechaDe(h); n++; } else if (!h && t.estado === 'hecha') { t.estado = 'pendiente'; t.hecha = null; n++; } });
    lm.forEach((m) => { if (h && m.estado !== 'cumplida') { m.estado = 'cumplida'; m.cumplida = fechaDe(h); n++; } else if (!h && m.estado === 'cumplida') { m.estado = 'activa'; m.cumplida = ''; n++; } });
    // Las acciones de las metas que vienen de ese origen (un hito, una acción del plan) también se cierran o reabren
    let na = 0;
    (st.metas || []).forEach((m) => (m.acciones || []).forEach((a) => { if (!a.oid || ks.indexOf(M.normOid(a.oid)) < 0) return; if (h && !a.hecha) { a.hecha = fechaDe(h); n++; na++; } else if (!h && a.hecha) { a.hecha = ''; n++; na++; } }));
    if (n) await M.guardarYa(st);
    return l.length + lm.length + na > 0;
  };

  /* ---------- Una meta que vuelve a llegar de su objetivo («Actualizar en la mesa») ----------
     Combina en lugar de pisar: lo que se cambió en la mesa desde el último envío se conserva; lo que solo cambió en el
     origen se actualiza; si cambió en los dos sitios, se queda lo de la mesa y se avisa (conflictos). En las acciones,
     el estado más avanzado gana: hecha en cualquiera de los dos sitios es hecha. Las acciones que se añadieron en la
     mesa se quedan. m.origen0 guarda lo último que llegó del origen para saber quién cambió qué.
     Devuelve { conflictos: [{ k, n, mesa, origen }], hechasEnMesa: [oid de acciones hechas en la mesa y no en el origen] } */
  M.CAMPOS_META = { objetivo: 'objetivo', especifica: 'qué se hará', indicador: 'indicador', actual: 'valor actual', valor: 'valor meta', unidad: 'unidad', fecha: 'fecha límite', responsable: 'responsable', solo: 'depende solo de quien la ejecuta', beneficio: 'beneficio', contras: 'contras', merece: 'si merece la pena' };
  M.combinarMeta = (st, m, datos) => {
    const igual = (a, b) => String(a == null || a === false ? '' : a).trim() === String(b == null || b === false ? '' : b).trim();
    const vacio = (v) => v == null || v === '' || v === false;
    const base = m.origen0 || null, out = { conflictos: [], hechasEnMesa: [] };
    Object.keys(M.CAMPOS_META).forEach((k) => {
      if (!(k in datos)) return;
      const vO = datos[k], vM = m[k];
      if (igual(vO, vM)) return;
      const enMesa = base ? !igual(vM, base[k]) : !vacio(vM), enOrigen = base ? !igual(vO, base[k]) : true;
      if (!enMesa) { m[k] = vO; return; }
      if (enOrigen && !vacio(vO)) out.conflictos.push({ k, n: M.CAMPOS_META[k], mesa: vM, origen: vO });
    });
    const accs = (m.acciones = Array.isArray(m.acciones) ? m.acciones : []);
    (datos.acciones || []).forEach((d) => {
      const y = accs.find((x) => (d.oid && x.oid && M.normOid(x.oid) === M.normOid(d.oid))) || accs.find((x) => !x.oid && (M.texto(x.t) === M.texto(d.t) || (x.t0 && M.texto(x.t0) === M.texto(d.t))));
      if (!y) { accs.push(Object.assign({ revisada: '' }, d, { t0: d.t, fecha0: d.fecha || '' })); return; }
      if (d.oid && !y.oid) y.oid = d.oid;
      [['t', 't0'], ['fecha', 'fecha0']].forEach(([k, k0]) => {
        if (igual(d[k], y[k])) { y[k0] = d[k] || ''; return; }
        const enMesa = y[k0] != null ? !igual(y[k], y[k0]) : !vacio(y[k]);
        if (!enMesa) y[k] = d[k] || ''; else if (y[k0] == null || !igual(d[k], y[k0])) out.conflictos.push({ k: 'accion', n: (k === 't' ? 'texto' : 'fecha') + ' de la acción «' + M.texto(y.t).slice(0, 60) + '»', mesa: y[k], origen: d[k] });
        y[k0] = d[k] || '';
      });
      // El estado más avanzado gana
      if (d.hecha && !y.hecha) { y.hecha = d.hecha === true ? M.hoy() : d.hecha; const t = y.tareaId && (st.tareas || []).find((x) => x.id === y.tareaId); if (t && t.estado !== 'hecha') { t.estado = 'hecha'; t.hecha = typeof y.hecha === 'string' ? y.hecha : M.hoy(); } }
      else if (y.hecha && !d.hecha && y.oid) out.hechasEnMesa.push({ oid: y.oid, fecha: typeof y.hecha === 'string' ? y.hecha : M.hoy() });
    });
    m.origen0 = {}; Object.keys(M.CAMPOS_META).forEach((k) => { if (k in datos) m.origen0[k] = datos[k] == null ? '' : datos[k]; });
    ['objetivoId', 'oid'].forEach((k) => { if (datos[k] && !m[k]) m[k] = datos[k]; });
    return out;
  };
  // Texto del aviso de conflictos de una meta combinada
  M.textoConflictos = (c) => !c || !c.length ? '' : 'Se ha conservado lo que se cambió en la mesa: ' + c.slice(0, 3).map((x) => `${x.n} («${M.texto(x.mesa)}» en la mesa; aquí «${M.texto(x.origen)}»)`).join('; ') + (c.length > 3 ? ` y ${c.length - 3} más` : '') + '.';

  /* Un mismo objetivo sin identificador común: el mismo indicador con los mismos valores (de 1 a 8 decisiones) */
  M.claveObj = (o) => {
    const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const ind = norm(o.indicador).replace(/[^a-z0-9]+/g, ' ').replace(/\b(medios?|de|del|la|el|los|las)\b/g, '').replace(/\s+/g, ' ').trim();
    const ac = o.actual != null ? o.actual : '', va = o.valor != null && o.valor !== '' ? o.valor : o.meta != null ? o.meta : '';
    const v = [ac, va].filter((x) => x !== '' && x != null).map((x) => String(+String(x).replace(',', '.')));
    return ind && v.length === 2 ? 'i:' + ind + '|' + v.join('>') : '';
  };
  /* Las acciones del plan de intervención que van a la mesa de la empresa: las que hace la empresa (no las que lidera el consultor) */
  M.accionEmpresa = (a) => !!a && a.quien === 'empresa';
  /* La tarea de una acción del plan de intervención: la misma desde «Enviar las tareas de la empresa» y desde «Traer el
     trabajo del ecosistema» (así un envío seguido de un «Traer» no cambia nada) */
  M.AREA_LINEA = { gobierno: 'Dirección', organizacion: 'Dirección', finanzas: 'Finanzas', comercial: 'Comercial', procesos: 'Operaciones', equipos: 'Personas', informacion: 'Dirección', protocolos: 'Dirección' };
  M.tareaAccionIv = (a) => ({ t: a.t, area: M.AREA_LINEA[a.linea] || 'Dirección', resp: a.responsable || '', fecha: a.fecha || '', mundo: 'intervencion', origen: 'Plan de intervención' + (a.ent && a.ent !== '—' ? ' · entregable: ' + a.ent : ''), oid: M.oid('intervencion', 'accion', a.id), impacto: a.clave ? 5 : 4, clave: !!a.clave, hechaEnOrigen: a.estado === 'hecha' ? a.hechaEl || true : undefined });

  /* ---------- Marca «En la mesa · …» en los orígenes ---------- */
  let cache = null;
  const leerMesa = async () => { if (cache && Date.now() - cache.ts < 1500) return cache.st; let st = null; try { st = await M.cargar(); } catch (e) { st = null; } cache = { st, ts: Date.now() }; return st; };
  const fC = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '');
  M.textoMarca = (t) => !t ? '' : t.estado === 'hecha' ? 'En la mesa · hecha' + (t.hecha ? ' el ' + fC(t.hecha) : '') : t.estado === 'noaplica' ? 'En la mesa · ya no aplica' : 'En la mesa · pendiente' + (t.fecha ? ' para el ' + fC(t.fecha) : '');
  M.textoMeta = (m) => !m ? '' : m.estado === 'cumplida' ? 'En la mesa · meta cumplida' + (m.cumplida ? ' el ' + fC(m.cumplida) : '') : 'En la mesa · meta activa';
  M.tareaDe = (st, oid) => { const k = M.normOid(oid); return st && (st.tareas || []).find((t) => t.oid === k); };
  // Casilla «Hecha» enlazada con la mesa (para los orígenes que no tienen estado propio)
  M.casilla = (oid) => `<label class="small mesa-casilla"><input type="checkbox" data-mesa-ok="${String(oid).replace(/"/g, '&quot;')}"> Hecha</label>`;
  M.marcar = async (root, alCambiar) => {
    root = root || document;
    const els = Array.from(root.querySelectorAll('[data-mesa-oid],[data-mesa-meta],[data-mesa-ok]')); if (!els.length) return;
    const st = await leerMesa(); if (!st) return;
    els.forEach((el) => {
      if (el.dataset.mesaOid != null) { const t = M.tareaDe(st, el.dataset.mesaOid); el.textContent = M.textoMarca(t); el.classList.toggle('mesa-marca', !!t); el.title = t ? 'Abra la mesa de trabajo para verla' : ''; }
      if (el.dataset.mesaMeta != null) { const k = M.normOid(el.dataset.mesaMeta), m = (st.metas || []).find((x) => x.objetivoId === k || x.oid === k); el.textContent = M.textoMeta(m); el.classList.toggle('mesa-marca', !!m); }
      if (el.dataset.mesaOk != null) {
        const oid = el.dataset.mesaOk, t = M.tareaDe(st, oid), lab = el.closest('label');
        if (lab) lab.hidden = !t; el.checked = !!(t && t.estado === 'hecha');
        el.onchange = async () => { el.disabled = true; await M.cerrar(oid, el.checked ? M.hoy() : false); await M.aOrigen(oid, el.checked ? M.hoy() : false); cache = null; el.disabled = false; if (alCambiar) alCambiar(oid, el.checked); else M.marcar(root); };
      }
    });
  };
})();
