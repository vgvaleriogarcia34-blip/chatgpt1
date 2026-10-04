/* Atalaya 360° · Conexiones con otras herramientas
   Un único sitio para enlazar la IA (Claude), la grabadora de las sesiones y el calendario.
   · A.ia.via()            → 'server' | 'sample' | 'clave' | null (cómo se llega a Claude ahora mismo)
   · A.ia.texto(prompt)    → texto de Claude o null si no hay conexión
   · A.ia.json(prompt)     → objeto JSON o null
   · A.ia.asegurar(func)   → la vía; si no hay ninguna, abre el aviso «Falta la conexión con la API de Claude» y su guía
   · A.conexiones.abrir('claude' | 'calendario' | 'grabadora')
   · A.calendario.proveedor() · enlace(evento) · asegurar()
   La clave propia se guarda solo en este navegador. Lo recomendable es configurarla en el servidor de Atalaya. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LS = { clave: 'atalaya.ia.clave', cal: 'atalaya.calendario', visto: 'atalaya.conexiones.visto' };
  const lee = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const pon = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } };
  const MODELO = 'claude-opus-5-5';

  /* ---------- Claude ---------- */
  let sampleP = null;
  const sample = () => (sampleP || (sampleP = (window.claude && window.claude.use) ? window.claude.use('sample').catch(() => null) : Promise.resolve(null)));
  const servidor = async () => { const P = A.platform; if (!P) return false; try { await P.ready; } catch (e) { return false; } return !!(P.mode === 'server' && P.serverInfo && P.serverInfo.ia); };
  const via = async () => {
    if (await servidor()) return 'server';
    if (await sample()) return 'sample';
    if (lee(LS.clave)) return 'clave';
    return null;
  };
  // Llamada directa a la API de Claude con la clave propia (solo este navegador)
  const directa = async (prompt, o) => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': lee(LS.clave), 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: MODELO, max_tokens: (o && o.max) || 8000, thinking: { type: 'adaptive' }, fallbacks: 'default', system: (o && o.system) || undefined, messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(r.status === 401 ? 'La clave no es válida o ha caducado.' : (j.error && j.error.message) || 'La API de Claude ha devuelto un error ' + r.status + '.');
    if (j.stop_reason === 'refusal') throw new Error('Claude no ha podido responder a esta petición.');
    return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  };
  const texto = async (prompt, o) => {
    const v = await via();
    if (v === 'server') { const r = await A.platform.api('/chat', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], tools: [], page: (o && o.page) || '' }) }); return (r.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('\n') || null; }
    if (v === 'sample') { const s = await sample(); const r = await s([{ role: 'user', content: prompt }]); return (r && r.text) || null; }
    if (v === 'clave') return directa(prompt, o);
    return null;
  };
  const json = async (prompt, o) => {
    const v = await via();
    if (v === 'sample') { const s = await sample(); if (s.json) return s.json(prompt); }
    const t = await texto(prompt + '\n\nResponde SOLO con JSON.', o); if (!t) return null;
    const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b < a) throw new Error('La respuesta no trae JSON.');
    return JSON.parse(t.slice(a, b + 1));
  };
  // Sin conexión: el aviso con la guía sale la primera vez en cada sesión; después se sigue sin IA en silencio
  const asegurar = async (func) => {
    const v = await via(); if (v) return v;
    let ya = false; try { ya = !!sessionStorage.getItem('atalaya.ia.avisado'); sessionStorage.setItem('atalaya.ia.avisado', '1'); } catch (e) { /* sin almacenamiento */ }
    if (!ya) abrir('claude', func);
    return null;
  };
  A.ia = { via, texto, json, asegurar, directa, MODELO, tieneClave: () => !!lee(LS.clave) };

  /* ---------- Calendario ---------- */
  const CAL = { google: 'Google Calendar', outlook: 'Outlook / Microsoft 365', ics: 'Otro (Apple, Thunderbird…) con archivo .ics' };
  const z = (n) => String(n).padStart(2, '0');
  const fmt = (fecha, hora, mas) => { const d = new Date(fecha + 'T' + (hora || '09:00') + ':00'); d.setMinutes(d.getMinutes() + (mas || 0)); return d; };
  const loc = (d) => `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}T${z(d.getHours())}${z(d.getMinutes())}00`;
  const iso = (d) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:00`;
  // ev = { titulo, fecha:'AAAA-MM-DD', hora:'HH:MM', dur (min), detalle, lugar }
  const enlace = (ev, prov) => {
    prov = prov || lee(LS.cal) || 'google';
    const a = fmt(ev.fecha, ev.hora), b = fmt(ev.fecha, ev.hora, +ev.dur || 60), q = encodeURIComponent;
    if (prov === 'outlook') return `https://outlook.office.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${q(ev.titulo)}&startdt=${q(iso(a))}&enddt=${q(iso(b))}&body=${q(ev.detalle || '')}&location=${q(ev.lugar || '')}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${q(ev.titulo)}&dates=${loc(a)}/${loc(b)}&details=${q(ev.detalle || '')}&location=${q(ev.lugar || '')}&ctz=${q(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid')}`;
  };
  const ics = (evs) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Business Avance//Atalaya 360//ES\r\n${evs.map((ev, i) => `BEGIN:VEVENT\r\nUID:${ev.id || 'ev' + i}@atalaya360\r\nDTSTAMP:${loc(new Date())}\r\nDTSTART:${loc(fmt(ev.fecha, ev.hora))}\r\nDTEND:${loc(fmt(ev.fecha, ev.hora, +ev.dur || 60))}\r\nSUMMARY:${String(ev.titulo).replace(/[,;\n]/g, ' ')}\r\nDESCRIPTION:${String(ev.detalle || '').replace(/[,;\n]/g, ' ')}\r\nEND:VEVENT`).join('\r\n')}\r\nEND:VCALENDAR`;
  // Descarga: en el visor de Claude las descargas pueden estar bloqueadas, por eso también se ofrece copiarlo
  const descargarIcs = (evs, nombre) => {
    const txt = ics(evs);
    try { const a = document.createElement('a'); a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(txt); a.download = (nombre || 'sesiones') + '.ics'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 100); } catch (e) { /* bloqueado */ }
    return txt;
  };
  A.calendario = {
    NOMBRES: CAL, proveedor: () => lee(LS.cal), poner: (p) => pon(LS.cal, p), enlace, ics, descargarIcs,
    asegurar: () => { if (lee(LS.cal)) return true; abrir('calendario'); return false; }
  };

  /* ---------- Panel de conexiones (con su guía) ---------- */
  let back = null;
  const cerrar = () => { if (back) { back.remove(); back = null; } document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') cerrar(); };
  const estadoClaude = async () => { const v = await via(); return v === 'server' ? { st: 'ok', t: 'Conectado a través del servidor de Atalaya' } : v === 'sample' ? { st: 'ok', t: 'Conectado a través del visor de Claude' } : v === 'clave' ? { st: 'warn', t: 'Conectado con una clave propia guardada en este navegador' } : { st: 'stop', t: 'Sin conexión' }; };
  async function abrir(cual, func) {
    cerrar();
    cual = cual || 'claude';
    const ec = await estadoClaude(), cal = lee(LS.cal);
    back = document.createElement('div'); back.className = 'modal-back cx-back';
    back.innerHTML = `<div class="modal cx" role="dialog" aria-modal="true" aria-labelledby="cxT"><button class="icon-btn close" aria-label="Cerrar">×</button>
      ${func && ec.st === 'stop' ? `<div class="alert warn cx-falta"><b>Falta la conexión con la API de Claude.</b> «${esc(func)}» necesita a Claude para leer y redactar. Conéctalo una vez con la guía de abajo y quedará enlazado. Mientras tanto, todo lo demás funciona sin IA.</div>` : ''}
      <div class="eyebrow">Conexiones</div><h3 id="cxT" style="margin:4px 0 6px">Enlazar Atalaya con tus herramientas</h3>
      <p class="small muted" style="margin:0 0 10px">Atalaya funciona sin conexiones. Con ellas, Claude lee transcripciones y redacta propuestas, las sesiones van directas a tu calendario y la grabadora entrega la transcripción.</p>
      <div class="cx-tabs" role="tablist">${[['claude', 'Claude (IA)', ec.st], ['grabadora', 'Grabadora de sesiones', ''], ['calendario', 'Calendario', cal ? 'ok' : 'stop']].map(([k, n, st]) => `<button role="tab" data-cx="${k}" aria-selected="${k === cual}">${st ? `<i class="cx-luz ${st}"></i>` : ''}${n}</button>`).join('')}</div>
      <div class="cx-body"></div></div>`;
    document.body.appendChild(back);
    back.addEventListener('click', (e) => { if (e.target === back) cerrar(); });
    back.querySelector('.close').onclick = cerrar;
    document.addEventListener('keydown', onKey);
    back.querySelectorAll('[data-cx]').forEach((b) => (b.onclick = () => { back.querySelectorAll('[data-cx]').forEach((x) => x.setAttribute('aria-selected', x === b)); pintar(b.dataset.cx, ec); }));
    pintar(cual, ec);
    pon(LS.visto, '1');
  }
  function pintar(cual, ec) {
    const body = back.querySelector('.cx-body');
    if (cual === 'claude') {
      body.innerHTML = `<p class="cx-est ${ec.st}"><i class="cx-luz ${ec.st}"></i>${esc(ec.t)}</p>
        <p class="small" style="margin:0">Claude es la IA que usa Atalaya para la lectura en profundidad de las transcripciones, mejorar la redacción de metas y objetivos, extraer datos de documentos y el asistente. Hay tres formas de conectarlo; basta con una.</p>
        <details class="cx-op" ${ec.st === 'stop' ? 'open' : ''}><summary><b>1. En el servidor de Atalaya</b> <span class="cx-rec">Recomendada para el despacho</span></summary><ol class="small">
          <li>Entra en <b>console.anthropic.com</b> con la cuenta de la empresa (o créala) y añade un método de pago en <i>Billing</i>.</li>
          <li>Ve a <i>API Keys</i> → <i>Create Key</i>. Ponle un nombre («Atalaya despacho») y copia la clave: empieza por <code>sk-ant-</code> y solo se muestra una vez.</li>
          <li>En el servidor donde corre Atalaya, guárdala como variable de entorno <code>ANTHROPIC_API_KEY</code> y reinicia el servicio. Quien lo administre lo hace en un minuto.</li>
          <li>Recarga esta página: el indicador de arriba pasará a verde. La clave nunca llega a los navegadores de los usuarios.</li></ol></details>
        <details class="cx-op"><summary><b>2. Desde el visor de Claude</b></summary><p class="small" style="margin:6px 0 0">Si abres Atalaya dentro de claude.ai, la conexión es la del propio visor: cuando la página pida permiso para usar Claude, acéptalo. No hay que configurar nada más.</p></details>
        <details class="cx-op" ${ec.st === 'stop' ? 'open' : ''}><summary><b>3. Con tu propia clave, solo en este dispositivo</b></summary>
          <p class="small" style="margin:6px 0">Sirve para probar o para un consultor que trabaja solo. La clave se guarda en este navegador y no se envía a Atalaya; no la uses en un ordenador compartido. Los pasos para obtenerla son el 1 y el 2 de la opción 1.</p>
          <div class="row"><input class="input" id="cxKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${lee(LS.clave) ? '••••••••••••' : ''}" style="flex:1;min-width:0"><button class="btn solid small" id="cxProbar">Probar y guardar</button>${lee(LS.clave) ? '<button class="btn ghost small" id="cxQuitar">Quitar la clave</button>' : ''}</div><small class="muted" id="cxMsg"></small></details>
        <p class="small muted" style="margin:8px 0 0">Coste: Anthropic cobra por uso. Una lectura en profundidad de una sesión de una hora cuesta del orden de céntimos. Las transcripciones son datos del cliente: informa al empresario de que se procesan con IA.</p>`;
      const k = body.querySelector('#cxKey'), msg = body.querySelector('#cxMsg');
      body.querySelector('#cxProbar').onclick = async () => {
        const v = k.value.trim(); if (!v || v.startsWith('•')) { msg.textContent = 'Pega la clave completa.'; return; }
        if (!/^sk-ant-/.test(v)) { msg.textContent = 'La clave de la API de Claude empieza por «sk-ant-».'; return; }
        const ant = lee(LS.clave); pon(LS.clave, v); msg.textContent = 'Probando la conexión…';
        try { await directa('Responde solo: ok', { max: 64 }); msg.textContent = 'Conectado. Ya puedes usar las funciones de IA.'; msg.style.color = 'var(--go)'; setTimeout(() => abrir('claude'), 900); }
        catch (e) { pon(LS.clave, ant); msg.textContent = (e.message || 'No se pudo conectar') + (e instanceof TypeError ? ' El navegador ha bloqueado la llamada directa: usa la opción 1 o 2.' : ''); msg.style.color = 'var(--stop)'; }
      };
      const q = body.querySelector('#cxQuitar'); if (q) q.onclick = () => { pon(LS.clave, ''); abrir('claude'); };
    } else if (cual === 'grabadora') {
      body.innerHTML = `<p class="small" style="margin:0">Las sesiones se graban con la grabadora o la aplicación de actas que uses (Plaud, Otter, la grabadora del móvil, Teams o Meet con transcripción). Atalaya no se conecta a ellas directamente: les pide el texto.</p>
        <ol class="small"><li>Al terminar la sesión, en la aplicación de la grabadora, abre la grabación y elige <i>Exportar</i> → <i>Transcripción</i> en texto (TXT), subtítulos (SRT o VTT), Word o PDF.</li>
          <li>Comprueba que la transcripción separa a quien habla («Hablante 1», «Ana»…). Si no lo hace, Atalaya leerá todo como una sola voz.</li>
          <li>En <b>Escucha y transcripción</b>, pulsa <i>Subir archivo</i> y elige el archivo, o pega el texto.</li>
          <li>Marca quién es el empresario: el análisis se hace sobre lo que dice él.</li></ol>
        <p class="small muted" style="margin:0">Avisa siempre al empresario de que la sesión se graba y para qué; pídele su conformidad antes de empezar.</p>`;
    } else {
      const p = lee(LS.cal);
      body.innerHTML = `<p class="cx-est ${p ? 'ok' : 'stop'}"><i class="cx-luz ${p ? 'ok' : 'stop'}"></i>${p ? 'Calendario elegido: ' + esc(CAL[p]) : 'Sin calendario elegido'}</p>
        <p class="small" style="margin:0">Elige el calendario que usas. Cada sesión tendrá su botón «Añadir a mi calendario», que abre el evento ya relleno (fecha, hora, duración y objetivo) para guardarlo con un clic. No hace falta dar permisos sobre tu agenda.</p>
        <div class="cx-cal">${Object.keys(CAL).map((k) => `<label class="cx-calo ${p === k ? 'on' : ''}"><input type="radio" name="cxcal" value="${k}" ${p === k ? 'checked' : ''}><span><b>${esc(CAL[k])}</b><small>${k === 'google' ? 'Abre Google Calendar con el evento listo para guardar. Entra con la cuenta donde quieras la cita.' : k === 'outlook' ? 'Abre Outlook en la web (cuenta de trabajo o personal) con el evento relleno.' : 'Descarga un archivo .ics por sesión o del calendario completo; ábrelo y se añade. Si tu navegador bloquea la descarga, puedes copiarlo.'}</small></span></label>`).join('')}</div>
        <p class="small muted" style="margin:0">Consejo: crea en tu calendario uno llamado «Intervenciones» y guarda ahí las sesiones; así las verás aparte. Si cambias una fecha en Atalaya, vuelve a añadir esa sesión y borra la anterior.</p>`;
      body.querySelectorAll('[name=cxcal]').forEach((r) => (r.onchange = () => { pon(LS.cal, r.value); body.querySelectorAll('.cx-calo').forEach((l) => l.classList.toggle('on', l.contains(r) && r.checked)); const e = body.querySelector('.cx-est'); e.className = 'cx-est ok'; e.innerHTML = '<i class="cx-luz ok"></i>Calendario elegido: ' + esc(CAL[r.value]); const t = back.querySelector('[data-cx=calendario] .cx-luz'); if (t) t.className = 'cx-luz ok'; document.dispatchEvent(new CustomEvent('atalaya:calendario')); }));
    }
  }
  A.conexiones = { abrir, cerrar };
})();
