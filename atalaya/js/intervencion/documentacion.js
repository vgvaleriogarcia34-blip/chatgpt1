/* Atalaya · Auditoría integral · Documentación
   Un único sitio donde el auditor sube todo lo que le da la empresa. Cada archivo se reconoce y se lleva al mundo que lo usa:
   · conversaciones (transcripciones) → Escucha, en la fase elegida;
   · cuentas, balances y cuentas de resultados → simulador (y el sistema estratégico);
   · listados (ventas, compras, clientes, cobros, banco, horas…) y documentos de texto → sistema estratégico;
   · plantilla de trabajadores → también al mundo de personas (los inversores no: son acreedores, no plantilla).
   Lo que no es una conversación se procesa con la misma zona de origen del sistema estratégico, abierta sin verse. */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { E, $, $$, esc, uid, hoy, fCorta, pl, guardar, toast, render, VISTAS } = V.int;
  const S = () => V.int.st();
  const P = () => A.platform;

  const lista = () => { const ST = S(); if (!Array.isArray(ST.documentacion)) ST.documentacion = []; return ST.documentacion; };
  const TABLA = /\.(xlsx|xls|ods|csv|tsv)$/i;

  /* ¿Es una conversación? Dos voces o más y varios turnos */
  const esConversacion = (texto) => { try { const p = E.parse(texto); return p.hablantes.length >= 2 && p.turnos.length >= 6; } catch (e) { return false; } };

  /* Sistema estratégico sin verse: abre su zona de origen en un marco oculto y le pasa los archivos */
  const enEstrategia = (files) => new Promise((ok, ko) => {
    const fr = document.createElement('iframe');
    fr.src = 'estrategia.html#origen'; fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;width:2px;height:2px;left:-50px;top:-50px;opacity:0;border:0;pointer-events:none';
    document.body.appendChild(fr);
    const fin = (f, v) => { clearInterval(t); setTimeout(() => fr.remove(), 300); f(v); };
    let n = 0;
    const t = setInterval(async () => {
      n++;
      let St = null; try { St = fr.contentWindow.Atalaya && fr.contentWindow.Atalaya.strat; } catch (e) { /* aún cargando */ }
      if (St && St.state && St.origenCargar) {
        clearInterval(t);
        try { const r = await St.origenCargar(files); r.TIPOS = fr.contentWindow.Atalaya.C360_TIPOS || {}; fin(ok, r); } catch (e) { fin(ko, e); }
      } else if (n > 150) fin(ko, new Error('El sistema estratégico no ha respondido. Comprueba que tu plan lo incluye y vuelve a probar.'));
    }, 200);
  });

  /* Plantilla → mundo de personas: alta de quien no esté, con su puesto y área */
  const aPersonas = async (rows) => {
    const Pl = P(), k = Pl && Pl.k ? Pl.k('atalaya.personas.v1') : 'atalaya.personas.v1';
    let st = null; try { st = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { /* sin almacenamiento */ }
    if (Pl) { try { const r = await Pl.loadData('personas'); if (r) st = r; } catch (e) { /* sin servidor */ } }
    st = Object.assign({ v: 1, personas: [], puestos: [], equipos: [] }, st || {});
    ['personas', 'puestos', 'equipos'].forEach((x) => { if (!Array.isArray(st[x])) st[x] = []; });
    const n0 = st.personas.length, q0 = st.puestos.length, id = (p) => p + Math.random().toString(36).slice(2, 9);
    rows.filter((r) => r.nombre && String(r.nombre).trim()).forEach((r) => {
      const nombre = String(r.nombre).trim(), area = r.area ? String(r.area).trim() : '', pu = r.puesto ? String(r.puesto).trim() : '';
      let q = pu ? st.puestos.find((x) => x.nombre.toLowerCase() === pu.toLowerCase()) : null;
      if (pu && !q) { q = { id: id('q'), nombre: pu, area, mision: '', disc: null, roles: [], critico: false, sucesor: '' }; st.puestos.push(q); }
      if (!st.personas.some((x) => x.nombre.toLowerCase() === nombre.toLowerCase())) st.personas.push({ id: id('p'), nombre, puestoId: q ? q.id : '', area, responsable: '', alta: hoy(), consentimiento: false });
    });
    try { localStorage.setItem(k, JSON.stringify(st)); } catch (e) { /* sin almacenamiento */ }
    if (Pl) { try { await Pl.saveData('personas', st); } catch (e) { /* queda en local */ } }
    return { personas: st.personas.length - n0, puestos: st.puestos.length - q0 };
  };

  /* Subir y repartir */
  async function subir(files, host) {
    const msg = $('#dcMsg', host), fase = ($('#dcFase', host) || {}).value || 'primera', C = V.cruce;
    const filas = [], conv = [], resto = [];
    for (const f of files) {
      if (msg) msg.innerHTML = `<span class="muted">Leyendo ${esc(f.name)}…</span>`;
      if (TABLA.test(f.name)) { resto.push(f); continue; }
      let texto = ''; try { texto = await E.leerArchivo(f); } catch (e) { /* lo intenta el estratégico */ }
      if (texto && esConversacion(texto)) conv.push({ f, texto }); else resto.push(f);
    }
    // Conversaciones → Escucha
    if (conv.length) {
      const nuevas = [];
      conv.forEach(({ f, texto }) => { const t = C.nuevaTr(f.name.replace(/\.[^.]+$/, ''), texto, C.fechaDelNombre(f.name), fase); if (t) { nuevas.push(t); filas.push({ nombre: f.name, que: 'Conversación', destino: 'Escucha · ' + (C.FASE_N[t.momento] || 'Diagnóstico inicial'), det: `${pl(t.turnos.length, 'turno', 'turnos')} de palabra · ${fCorta(t.fecha)}`, ir: 'escucha' }); } else filas.push({ nombre: f.name, que: 'Conversación', destino: 'Sin cargar', det: 'Ya estaba subida o no tiene texto', err: true }); });
      if (nuevas.length) { const r = C.procesar(nuevas); if (r.length) filas.push({ nombre: '—', que: 'Lectura de las conversaciones', destino: 'Primera sesión', det: r.join('; ') }); }
    }
    // Lo demás → sistema estratégico (y simulador); la plantilla, también a personas
    if (resto.length) {
      if (msg) msg.innerHTML = `<span class="muted">Repartiendo ${pl(resto.length, 'archivo', 'archivos')} entre el simulador, el sistema estratégico y personas…</span>`;
      try {
        const r = await enEstrategia(resto), T = r.TIPOS;
        r.out.forEach((reg) => {
          if (reg.estado === 'error' || !reg.cargas.length) { filas.push({ nombre: reg.nombre, que: 'Sin reconocer', destino: 'Sin cargar', det: reg.error || 'No se ha reconocido el contenido', err: true }); return; }
          reg.cargas.forEach((c) => {
            const que = (T[c.tipo] && T[c.tipo].n) || c.tipo;
            const destino = c.tipo === 'cuentas' ? 'Simulador y sistema estratégico' : c.tipo === 'documentos' ? 'Sistema estratégico · documento de contexto' : c.tipo === 'plantilla' ? 'Sistema estratégico y personas' : 'Sistema estratégico';
            filas.push({ nombre: reg.nombre, que, destino, det: c.txt || '', href: c.tipo === 'cuentas' ? 'app.html#empresa' : 'estrategia.html#origen' });
          });
        });
        if (r.plantilla && r.plantilla.length) { const p = await aPersonas(r.plantilla); filas.push({ nombre: '—', que: 'Plantilla', destino: 'Personas y equipos', det: `${pl(p.personas, 'persona nueva', 'personas nuevas')} y ${pl(p.puestos, 'puesto nuevo', 'puestos nuevos')}`, href: 'personas.html' }); }
        if (C.aDatosReales) { try { await C.aDatosReales(); } catch (e) { /* sigue */ } }
      } catch (e) { resto.forEach((f) => filas.push({ nombre: f.name, que: '—', destino: 'Sin cargar', det: e.message, err: true })); }
    }
    const L = lista(), fecha = new Date().toISOString();
    filas.slice().reverse().forEach((x) => L.unshift(Object.assign({ id: uid(), fecha }, x)));
    S().documentacion = L.slice(0, 200);
    S().docUltima = fecha;
    guardar(); render();
    const ok = filas.filter((x) => !x.err && x.nombre !== '—').length, mal = filas.filter((x) => x.err).length;
    toast(`${pl(ok, 'pieza repartida', 'piezas repartidas')}${mal ? ` · ${pl(mal, 'archivo sin cargar', 'archivos sin cargar')}` : ''}.`);
  }

  /* ---------- Vista ---------- */
  VISTAS.documentacion = (host) => {
    const ST = S(), L = lista(), C = V.cruce, ult = ST.docUltima;
    const nF = (k) => (ST.transcripciones || []).filter((t) => (t.momento || 'primera') === k).length;
    host.innerHTML = `<section class="glass pad stack">
      <div class="eyebrow">Documentación de la empresa</div>
      <h3 style="margin:0">Súbelo todo aquí: Atalaya lo lleva a su sitio</h3>
      <ol class="small dc-pasos"><li><b>Pide</b> a la empresa lo de la lista de la derecha.</li><li><b>Súbelo</b> aquí, todo junto: no hace falta separarlo.</li><li><b>Revisa</b> la tabla de abajo: dice qué es cada archivo y adónde ha ido.</li></ol>
      <div class="dc-grid">
        <div class="stack">
          <label class="or-drop glass" id="dcDrop" for="dcFile"><b>Arrastra aquí los archivos</b><span class="small muted">o pulsa para elegirlos · conversaciones, cuentas, Excel, CSV, PDF, Word, texto · varios a la vez</span>
            <input type="file" id="dcFile" multiple hidden accept=".txt,.md,.srt,.vtt,.json,.docx,.pdf,.xlsx,.xls,.ods,.csv,.tsv"></label>
          <label class="small">Si hay conversaciones, ¿de qué fase son?<select class="input" id="dcFase">${Object.keys(C.MOMENTO).map((k) => `<option value="${k}" ${k === (ST.faseSubida || 'primera') ? 'selected' : ''}>${esc(C.MOMENTO[k])}</option>`).join('')}<option value="auto">Que lo decida Atalaya por el contenido</option></select></label>
          <p class="small" id="dcMsg"></p>
        </div>
        <div class="stack dc-falta" id="dcFalta"><div class="eyebrow">Qué tienes y qué falta</div><small class="muted">Leyendo…</small></div>
      </div>
    </section>
    <section class="glass pad stack">
      <div class="row"><h4 style="margin:0">Adónde ha ido cada archivo</h4><span class="spacer"></span>${L.length ? `<span class="small muted">Última subida: ${ult ? fCorta(ult.slice(0, 10)) : '—'}</span>` : ''}</div>
      ${L.length ? `<div class="table-wrap"><table class="ms-tab"><thead><tr><th style="text-align:left">Archivo</th><th style="text-align:left">Qué es</th><th style="text-align:left">Adónde ha ido</th><th style="text-align:left">Detalle</th><th>Fecha</th></tr></thead><tbody>${L.map((x) => `<tr class="${x.err ? 'dc-err' : ''}"><td style="text-align:left">${esc(x.nombre)}</td><td style="text-align:left">${esc(x.que)}</td><td style="text-align:left">${x.ir ? `<a href="#${x.ir}" data-dcir="${x.ir}">${esc(x.destino)}</a>` : x.href ? `<a href="${esc(x.href)}">${esc(x.destino)}</a>` : esc(x.destino)}</td><td style="text-align:left" class="small">${esc(x.det)}</td><td>${fCorta(String(x.fecha).slice(0, 10))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Todavía no has subido nada. Empieza por las conversaciones de la primera sesión y las cuentas del último año.</p>'}
    </section>`;
    const inp = $('#dcFile', host), drop = $('#dcDrop', host);
    inp.onchange = (e) => { const fs = [...(e.target.files || [])]; e.target.value = ''; if (fs.length) subir(fs, host); };
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => { const fs = [...((e.dataTransfer && e.dataTransfer.files) || [])]; if (fs.length) subir(fs, host); });
    $('#dcFase', host).onchange = (e) => { S().faseSubida = e.target.value; guardar(); };
    $$('[data-dcir]', host).forEach((a) => (a.onclick = (e) => { e.preventDefault(); V.ir(a.dataset.dcir); }));
    // Qué tienes y qué falta (en lenguaje sencillo)
    const fa = $('#dcFalta', host);
    const PIDE = [
      { k: 'conv', n: 'Conversaciones de la primera sesión', ok: nF('primera') > 0, det: nF('primera') ? pl(nF('primera'), 'subida', 'subidas') : 'Graba la sesión y sube la transcripción', ir: 'escucha' },
      { k: 'ses', n: 'Conversaciones de las sesiones de trabajo', ok: nF('intervencion') > 0, det: nF('intervencion') ? pl(nF('intervencion'), 'subida', 'subidas') : 'Cuando empiece la intervención', opc: true }
    ];
    (C.estadoDatos ? C.estadoDatos() : Promise.resolve(null)).then((d) => {
      const M = d ? [
        { n: 'Cuentas anuales (balance y cuenta de resultados)', ok: d.simulador.ok, det: d.simulador.ok ? d.simulador.det : 'Pídelas a la gestoría: los dos o tres últimos años' },
        { n: 'Listados: clientes y ventas, compras, cobros, banco', ok: d.estrategia.ok, det: d.estrategia.ok ? d.estrategia.det : 'En Excel o CSV, tal como salgan de su programa' },
        { n: 'Plantilla: personas, puesto y área', ok: d.personas.ok, det: d.personas.ok ? d.personas.det : 'Un Excel con nombre, puesto y área (sin datos sensibles)' }
      ] : [];
      fa.innerHTML = `<div class="eyebrow">Qué tienes y qué falta</div><ul class="iv-dl">${PIDE.concat(M).map((x) => `<li class="${x.ok ? 'ok' : x.opc ? '' : 'stop'}"><span>${x.ok ? '✓' : '○'} ${esc(x.n)}</span><small>${esc(x.det)}</small></li>`).join('')}</ul><p class="small muted" style="margin:0">Con lo marcado en ○ la nota y los informes trabajan a ciegas en esa parte: pídelo antes de la auditoría.</p>`;
    }).catch(() => { fa.innerHTML = ''; });
  };
})();
