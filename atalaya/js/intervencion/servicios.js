/* Atalaya · Auditoría integral · Recorrido por servicios
   Del primer contacto al acompañamiento (ver PLAN-RECORRIDO-CONSULTOR.md):
   · Foto inicial: cierre de la sesión previa y qué servicio le toca primero.
   · Aceptación: estado de la propuesta integral y servicios contratados.
   · Servicio 1 · ¿Dónde está el dinero que gana la empresa?: documentación solicitada, análisis e informe.
   · Servicio 2 · Auditoría 360: foto completa en seis bloques (de los datos a la operativa).
   · Cada servicio cierra con su informe y con la propuesta del siguiente, generada con lo que acaba de revelar.
   Estado en ST.recorrido (core.js). Las vistas se registran aquí; recorrido.js les añade la ficha. */
(function () {
  const A = window.Atalaya, V = A.interv; if (!V || !V.int) return;
  const I = V.int, D = I.D;
  const { $, $$, esc, hoy, fCorta, fLarga, pl, toast, guardar, ir, VISTAS, empresa } = I;
  const S = () => I.st(), R = () => S().recorrido;
  const P = () => A.platform;
  const render = () => I.render();
  const num = (v) => { const n = +String(v == null ? '' : v).replace(/\./g, '').replace(',', '.'); return isFinite(n) ? n : 0; };
  const eur = (n) => (n < 0 ? '−' : '') + Math.round(Math.abs(+n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
  const pct = (x) => (isFinite(x) ? (Math.round(x * 10) / 10).toString().replace('.', ',') + ' %' : '—');
  const marca = (k) => { S().informes = S().informes || {}; S().informes[k] = new Date().toISOString(); guardar(); };
  const loc = (k) => { try { return JSON.parse(localStorage.getItem(P() ? P().k(k) : k)); } catch (e) { return null; } };
  const cargar = async (clave, ls) => { let r = null; try { if (P() && P().loadData) r = await P().loadData(clave); } catch (e) { r = null; } return r || loc(ls); };
  const luz = (st) => `<i class="ms-luz ${st || ''}"></i>`;
  const ESTADO_PROP = [['borrador', 'Borrador'], ['presentada', 'Presentada'], ['aceptada', 'Aceptada'], ['rechazada', 'Rechazada']];
  const prop = (k) => { const r = R(); r[k] = r[k] || {}; return r[k]; };
  const svc = (k) => R().servicios[k];

  /* ---------- Las reglas de «hecho» y los textos de cada paso nuevo ---------- */
  V.hechoExtra = Object.assign(V.hechoExtra || {}, {
    foto: (st) => !!(st.informes && st.informes.primera),
    aceptacion: (st) => ['aceptada', 'rechazada'].includes(st.recorrido.propuesta.estado),
    s1docs: (st) => { const d = st.recorrido.docs || {}, n = DOCS_S1.filter((x) => ['recibido', 'revisado', 'na'].includes(d[x.id] && d[x.id].e)).length; return n >= Math.ceil(DOCS_S1.length * 0.7); },
    s1dinero: (st) => (st.recorrido.dinero.notas || '').trim().length > 30,
    s1cierre: (st) => !!(st.informes && st.informes.dinero) && ['presentada', 'aceptada', 'rechazada'].includes((st.recorrido.propS2 || {}).estado),
    foto360: (st) => BLOQUES.filter((b) => { const f = (st.recorrido.foto360 || {})[b.id]; return f && (f.st || (f.nota || '').trim()); }).length >= 4,
    s2cierre: (st) => !!(st.informes && st.informes.auditoria) && ['presentada', 'aceptada', 'rechazada'].includes((st.recorrido.propS3 || {}).estado)
  });
  Object.assign(V.pasoTxt, {
    triaje: 'Confirma el triaje de cada área (urgencias, preferente o programable): de aquí salen las prioridades que ordenan la propuesta integral.',
    foto: 'Cierra la sesión previa con la foto inicial: sus prioridades, el 20 % de causas que explica el 80 % y qué servicio le toca primero. Entrega el informe de la sesión previa.',
    propuesta: 'Prepara la propuesta integral y personalizada: los tres servicios en orden, ajustados a sus prioridades, con el valor en juego y la forma de pago. Queda hecho al abrir el dossier.',
    aceptacion: 'Anota cómo quedó la propuesta (presentada, aceptada o rechazada) y qué servicios contrata. Al aceptarse, el primer servicio queda en curso.',
    s1docs: 'Pide la documentación del Servicio 1 con la solicitud para la empresa y marca lo que llega. Lo que subas en «Documentación» se reparte a los mundos.',
    s1dinero: 'Con las cuentas cargadas, mira año a año dónde acabó el beneficio (clientes, stock, inversiones, préstamos, dividendos o caja) y escribe tus conclusiones.',
    s1cierre: 'Entrega el informe «Dónde está su dinero» y presenta, con lo que ha revelado, la propuesta de la Auditoría 360.',
    foto360: 'La foto completa en seis bloques, de los datos a la operativa: flujos de caja, sistema operativo, ABC de clientes y producto, estructura económica y sistema financiero. Pon el semáforo y tu nota en cada uno.',
    s2cierre: 'Entrega el informe de la auditoría 360 y presenta la propuesta de acompañamiento de 6 a 12 meses, con sesiones quincenales por objetivos.'
  });

  /* ================= ETAPA 1 · FOTO INICIAL ================= */
  const servicioPrimero = () => {
    const r = I.ruta(), fin = r.find((x) => x.a.id === 'fin'), urgFin = fin && fin.n === 'stop';
    const top = I.causasOrdenadas().slice(0, 3);
    return { urgFin, texto: urgFin ? 'La caja está en urgencias: el Servicio 1 («¿Dónde está el dinero?») es lo primero y no admite espera. Sin saber dónde se queda el beneficio, cualquier otra decisión se toma a ciegas.'
      : 'El orden natural es el del método: primero saber dónde está el dinero (Servicio 1), después la foto completa (Auditoría 360) y, con ella, el acompañamiento por objetivos.', top };
  };
  VISTAS.foto = (host) => {
    const st = S(), r = I.ruta(), g = I.global(), v = I.veinte ? [...I.veinte()] : [], sp = servicioPrimero(); // veinte() devuelve un Set
    const citas = st.sintomas.filter((s) => s.cita).sort((a, b) => (b.gravedad || 0) - (a.gravedad || 0)).slice(0, 4);
    host.innerHTML = `<div class="glass pad stack">
        <div class="row"><div><div class="eyebrow">Foto inicial · cierre de la sesión previa</div><h3 style="margin:4px 0 0">${esc(empresa())}</h3><small class="muted">Lo que ya sabes después de escucharle. Con esto se prepara la propuesta integral.</small></div><span class="spacer"></span>${luz(g)}</div>
        <div class="sv-g3">
          <div class="sv-kpi"><span>Áreas en urgencias</span><b>${r.filter((x) => x.n === 'stop').length}</b></div>
          <div class="sv-kpi"><span>Síntomas</span><b>${st.sintomas.length}</b></div>
          <div class="sv-kpi"><span>Causas del 20 %</span><b>${v.length || '—'}</b></div>
        </div>
      </div>
      <div class="glass pad stack"><div class="eyebrow">Sus prioridades (del triaje)</div>
        ${r.length ? `<ol class="sv-prio">${r.slice(0, 5).map((x) => `<li>${luz(x.n)}<b>${esc(x.a.n)}</b><small>${esc((I.TRIAJE[x.n] || { n: 'Sin triaje' }).n)} · ${pl(x.ss.length, 'síntoma', 'síntomas')}${x.cs.length ? ' · ' + pl(x.cs.length, 'causa', 'causas') : ''}</small></li>`).join('')}</ol>` : '<p class="small muted">Todavía no hay triaje: termina «Síntomas y causas» y «Triaje y prioridades».</p>'}
      </div>
      ${v.length ? `<div class="glass pad stack"><div class="eyebrow">El 20 % de causas que explica el 80 %</div><ol class="sv-prio">${v.map((id) => st.causas.find((c) => c.id === id)).filter(Boolean).map((c) => `<li>${luz(c.estado === 'confirmada' ? 'stop' : 'warn')}<b>${esc(c.t)}</b><small>${esc((D.area(c.area) || {}).n || '')} · ${c.estado === 'confirmada' ? 'confirmada' : 'hipótesis'}</small></li>`).join('')}</ol></div>` : ''}
      <div class="glass pad stack"><div class="eyebrow">Con sus palabras</div>
        ${citas.length ? citas.map((s) => `<blockquote class="sv-cita">«${esc(s.cita)}»<small>${esc(s.t)}</small></blockquote>`).join('') : '<p class="small muted">Sin frases literales todavía: súbelas desde la transcripción o apúntalas en el guion.</p>'}
      </div>
      <div class="glass pad stack sv-sig"><div class="eyebrow">Qué servicio le toca primero</div><p>${esc(sp.texto)}</p>
        <ol class="sv-serv"><li class="${sp.urgFin ? 'urg' : ''}"><b>Servicio 1 · ¿Dónde está el dinero que gana la empresa?</b><small>Documentación, análisis e informe completo.</small></li><li><b>Servicio 2 · Auditoría integral 360</b><small>La foto completa: de los datos a la operativa.</small></li><li><b>Servicio 3 · Acompañamiento por objetivos (6 a 12 meses)</b><small>Sesiones quincenales sobre las prioridades que revela la auditoría.</small></li></ol>
        <div class="row"><button class="btn solid" id="svInfPrevia">Informe de la sesión previa (para la empresa)</button><button class="btn" data-ir="propuesta">Preparar la propuesta integral →</button></div>
      </div>`;
    $('#svInfPrevia', host).onclick = () => V.informes.primera && V.informes.primera();
    $$('[data-ir]', host).forEach((b) => (b.onclick = () => ir(b.dataset.ir, { ver: true })));
  };

  /* ================= ETAPA 2 · ACEPTACIÓN ================= */
  VISTAS.aceptacion = (host) => {
    const r = R(), p = r.propuesta, s = r.servicios;
    host.innerHTML = `<div class="glass pad stack">
        <div class="eyebrow">Propuesta integral</div>
        <div class="sv-g3"><label class="small">Estado<select class="input" data-p="estado">${ESTADO_PROP.map(([k, n]) => `<option value="${k}" ${p.estado === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="small">Fecha<input class="input" type="date" data-p="fecha" value="${esc(p.fecha || '')}"></label>
          <div class="row" style="align-items:end"><button class="btn ghost small" data-ir="propuesta">Ver la propuesta integral</button></div></div>
        ${p.estado === 'rechazada' ? `<label class="small">Motivo (queda en tu autoevaluación)<textarea class="input" rows="2" data-p="motivo" placeholder="Precio, momento, no vio el valor, otra prioridad…">${esc(p.motivo || '')}</textarea></label>` : ''}
      </div>
      <div class="glass pad stack"><div class="eyebrow">Servicios contratados</div><small class="muted">Cada servicio se presenta y se acepta por separado; al cerrar uno se presenta la propuesta del siguiente.</small>
        <ul class="sv-contr">
          ${[['s1', 'Servicio 1 · ¿Dónde está el dinero que gana la empresa?', 's1docs'], ['s2', 'Servicio 2 · Auditoría integral 360', 'documentacion'], ['s3', 'Servicio 3 · Acompañamiento por objetivos', 'arranque']].map(([k, n, t]) => `<li><label><input type="checkbox" data-s="${k}" ${s[k].contratado ? 'checked' : ''}> <b>${n}</b></label>
            <select class="input small" data-se="${k}">${[['', 'Sin empezar'], ['curso', 'En curso'], ['entregado', 'Entregado']].map(([v, l]) => `<option value="${v}" ${s[k].estado === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
            ${k === 's3' ? `<select class="input small" data-sm>${[6, 9, 12].map((m) => `<option value="${m}" ${+s.s3.meses === m ? 'selected' : ''}>${m} meses</option>`).join('')}</select>` : ''}
            <button class="btn ghost small" data-ir="${t}">Ir →</button></li>`).join('')}
        </ul>
      </div>`;
    $$('[data-p]', host).forEach((x) => (x.onchange = () => {
      p[x.dataset.p] = x.value;
      if (x.dataset.p === 'estado' && x.value === 'aceptada') { if (!p.fecha) p.fecha = hoy(); if (!s.s1.contratado) s.s1.contratado = true; if (!s.s1.estado) s.s1.estado = 'curso'; toast('Propuesta aceptada: el Servicio 1 queda en curso.'); }
      guardar(); render();
    }));
    $$('[data-s]', host).forEach((x) => (x.onchange = () => { s[x.dataset.s].contratado = x.checked; if (x.checked && !s[x.dataset.s].estado) s[x.dataset.s].estado = 'curso'; guardar(); render(); }));
    $$('[data-se]', host).forEach((x) => (x.onchange = () => { s[x.dataset.se].estado = x.value; guardar(); render(); }));
    const sm = $('[data-sm]', host); if (sm) sm.onchange = () => { s.s3.meses = +sm.value; guardar(); };
    $$('[data-ir]', host).forEach((b) => (b.onclick = () => ir(b.dataset.ir, { ver: true })));
  };

  /* ================= ETAPA 3 · SERVICIO 1 · ¿DÓNDE ESTÁ EL DINERO? ================= */
  const DOCS_S1 = [
    { id: 'cuentas', n: 'Cuentas anuales de los últimos 3 a 5 años', d: 'Balance y cuenta de resultados de cada año (las depositadas en el Registro valen).' },
    { id: 'sumas', n: 'Sumas y saldos del año en curso', d: 'Para ver el año que va, no solo los cerrados.' },
    { id: 'bancos', n: 'Extractos bancarios y pólizas', d: 'Últimos 12 meses de cada cuenta y el límite y dispuesto de cada póliza.' },
    { id: 'clientes', n: 'Clientes con lo pendiente de cobro', d: 'Antigüedad de la deuda de cada cliente y plazos pactados.' },
    { id: 'proveedores', n: 'Proveedores con lo pendiente de pago', d: 'Para saber quién financia a quién.' },
    { id: 'prestamos', n: 'Préstamos, leasing y renting', d: 'Cuota, plazo pendiente y tipo de cada uno.' },
    { id: 'stock', n: 'Inventario o valoración del stock', d: 'Con su antigüedad si se puede.' },
    { id: 'inversiones', n: 'Inversiones de los últimos años', d: 'Maquinaria, vehículos, naves, obras: importe y cómo se pagó.' },
    { id: 'socios', n: 'Dividendos y retribución de los socios', d: 'Lo que han sacado los socios por cualquier vía.' }
  ];
  const DOC_E = [['', 'Sin pedir'], ['pedido', 'Pedido'], ['recibido', 'Recibido'], ['revisado', 'Revisado'], ['na', 'No aplica']];
  VISTAS.s1docs = (host) => {
    const d = R().docs;
    const n = DOCS_S1.filter((x) => ['recibido', 'revisado', 'na'].includes(d[x.id] && d[x.id].e)).length;
    host.innerHTML = `<div class="glass pad stack">
        <div class="row"><div><div class="eyebrow">Servicio 1 · documentación que se pide</div><small class="muted">${n} de ${DOCS_S1.length} recibidos o resueltos. Envíale la solicitud y marca lo que llega.</small></div><span class="spacer"></span><button class="btn solid small" id="svSolic">Solicitud para la empresa</button></div>
        <div class="iv-prog"><span style="width:${Math.round((n / DOCS_S1.length) * 100)}%"></span></div>
        <ul class="sv-docs">${DOCS_S1.map((x) => { const v = d[x.id] || {}; return `<li class="${v.e || ''}"><div><b>${esc(x.n)}</b><small>${esc(x.d)}</small></div><select class="input small" data-d="${x.id}">${DOC_E.map(([k, l]) => `<option value="${k}" ${(v.e || '') === k ? 'selected' : ''}>${l}</option>`).join('')}</select><input class="input small" data-dn="${x.id}" value="${esc(v.nota || '')}" placeholder="Nota"></li>`; }).join('')}</ul>
        <div class="row"><button class="btn" data-ir="documentacion">Subir lo recibido en «Documentación» →</button><a class="btn ghost" href="app.html#historia">Cargar las cuentas en el simulador</a></div>
      </div>`;
    $$('[data-d]', host).forEach((x) => (x.onchange = () => { d[x.dataset.d] = Object.assign(d[x.dataset.d] || {}, { e: x.value, f: hoy() }); guardar(); render(); }));
    $$('[data-dn]', host).forEach((x) => (x.oninput = () => { d[x.dataset.dn] = Object.assign(d[x.dataset.dn] || {}, { nota: x.value }); guardar(); }));
    $('#svSolic', host).onclick = () => informeSolicitud();
    $$('[data-ir]', host).forEach((b) => (b.onclick = () => ir(b.dataset.ir, { ver: true })));
  };
  const informeSolicitud = () => {
    const In = A.informe; In.reset();
    const d = R().docs;
    const html = In.cover({ tipo: 'Solicitud de documentación', kicker: 'Servicio 1 · ¿Dónde está el dinero que gana su empresa?', titulo: 'Documentación que necesitamos', subtitulo: 'Con estos documentos reconstruimos año a año dónde ha ido el dinero que la empresa gana.', empresa: empresa() })
      + In.summary('Para qué la pedimos', '<p>La cuenta de resultados dice cuánto gana la empresa; el banco dice cuánto dinero tiene. La diferencia está en algún sitio: clientes que aún no han pagado, stock, inversiones, préstamos o lo que han retirado los socios. Con esta documentación le enseñaremos dónde está cada euro.</p>')
      + In.section('Documentos', In.table(['Documento', 'Detalle', 'Estado'], DOCS_S1.map((x) => [x.n, x.d, ((DOC_E.find((e) => e[0] === ((d[x.id] || {}).e || '')) || [])[1]) || 'Pendiente'])))
      + In.section('Cómo enviarla', '<p>Puede enviarla en PDF, Excel o fotografía legible. Si algún documento no existe, díganoslo: también es información. Trataremos todo con confidencialidad.</p>')
      + In.foot('Documento para la empresa.');
    In.open({ titulo: 'Solicitud de documentación', html, paginado: true }); marca('solicitud');
  };

  /* Dónde acabó el beneficio de cada año (misma lógica que el «Flujo del dinero» del sistema estratégico) */
  const g = (o, k) => +((o || {})[k]) || 0;
  const flujo = (Y, i) => {
    const a = Y[i], p = Y[i - 1]; if (!a || !p) return null;
    const d = (k) => g(a, k) - g(p, k);
    const ebitda = g(a, 'ventas') - g(a, 'costeVentas') - g(a, 'personal') - g(a, 'otrosGastos');
    const bn = isFinite(a.beneficio) && a.beneficio !== '' ? +a.beneficio : ebitda - g(a, 'amortizacion') - g(a, 'gastosFinancieros') - g(a, 'impuestos');
    const capex = d('inmovilizado') + g(a, 'amortizacion'), deuda = d('deudaLP') + d('deudaCP'), div = g(a, 'dividendos');
    const usos = [['Clientes que aún no han pagado', Math.max(0, d('clientes'))], ['Stock en el almacén', Math.max(0, d('existencias'))], ['Inversión en activos', Math.max(0, capex)], ['Devolución de préstamos', Math.max(0, -deuda)], ['Dividendos a los socios', div], ['Pagar antes a proveedores', Math.max(0, -d('proveedores'))], ['Aumento de la caja', Math.max(0, d('tesoreria'))]].filter((x) => x[1] > 0);
    const tot = usos.reduce((s, x) => s + x[1], 0) || 1;
    return { anio: a.anio, ventas: g(a, 'ventas'), ebitda, bn, recursos: bn + g(a, 'amortizacion'), caja: d('tesoreria'), atrapado: Math.max(0, d('clientes')) + Math.max(0, d('existencias')) - Math.max(0, d('proveedores')), capex, deuda, div,
      dso: g(a, 'ventas') ? (g(a, 'clientes') / g(a, 'ventas')) * 365 : null, dio: g(a, 'costeVentas') ? (g(a, 'existencias') / g(a, 'costeVentas')) * 365 : null, dpo: g(a, 'costeVentas') ? (g(a, 'proveedores') / g(a, 'costeVentas')) * 365 : null,
      usos: usos.map(([n, v]) => ({ n, v, pct: (v / tot) * 100 })) };
  };
  const leerSim = async () => cargar('simulador', 'atalaya.v1');
  const aniosDe = (sim) => ((sim && sim.historico && Array.isArray(sim.historico.anios)) ? sim.historico.anios.slice().sort((a, b) => a.anio - b.anio) : []);
  const analisisDinero = (Y) => {
    const F = Y.map((_, i) => flujo(Y, i)).filter(Boolean); if (!F.length) return null;
    const benAc = F.reduce((s, f) => s + f.bn, 0), cajaAc = F.reduce((s, f) => s + f.caja, 0), atrAc = F.reduce((s, f) => s + f.atrapado, 0), capAc = F.reduce((s, f) => s + f.capex, 0), divAc = F.reduce((s, f) => s + f.div, 0), deuAc = F.reduce((s, f) => s + f.deuda, 0);
    const u = F[F.length - 1], lect = [];
    lect.push(`Entre ${F[0].anio} y ${u.anio} la empresa ganó ${eur(benAc)}, pero la caja ${cajaAc >= 0 ? 'solo subió' : 'bajó'} ${eur(Math.abs(cajaAc))}.`);
    if (atrAc > 0) lect.push(`${eur(atrAc)} del beneficio están atrapados en el circulante: clientes que pagan más tarde y stock que crece${benAc > 0 ? ` (${pct((atrAc / benAc) * 100)} de lo ganado)` : ''}.`);
    if (capAc > 0) lect.push(`${eur(capAc)} se convirtieron en inversiones en activos.`);
    if (divAc > 0) lect.push(`${eur(divAc)} salieron hacia los socios en dividendos.`);
    if (deuAc > 0) lect.push(`La deuda bancaria creció ${eur(deuAc)}: parte del día a día se está financiando con el banco.`); else if (deuAc < 0) lect.push(`Se devolvieron ${eur(-deuAc)} de préstamos.`);
    if (u.dso && F[0].dso && u.dso - F[0].dso > 7) lect.push(`Los clientes tardan ${Math.round(u.dso)} días en pagar (eran ${Math.round(F[0].dso)}): cada día de más es caja que financia a otros.`);
    return { F, benAc, cajaAc, atrAc, capAc, divAc, deuAc, lect, st: cajaAc < 0 && benAc > 0 ? 'stop' : atrAc > benAc * 0.4 ? 'warn' : 'ok' };
  };
  // Las vistas que leen otros mundos pintan dentro de su propia caja: la cabecera del paso y la navegación se quedan
  const caja = (host, txt) => { host.innerHTML = `<div class="sv-async stack"><div class="glass pad"><small class="muted">${txt}</small></div></div>`; return host.querySelector('.sv-async'); };
  VISTAS.s1dinero = (host0) => {
    const host = caja(host0, 'Leyendo las cuentas del simulador…');
    leerSim().then((sim) => {
      const Y = aniosDe(sim), an = Y.length >= 2 ? analisisDinero(Y) : null, dn = R().dinero;
      if (!an) {
        host.innerHTML = `<div class="glass pad stack"><div class="eyebrow">Servicio 1 · ¿Dónde está el dinero?</div><div class="alert warn">Faltan las cuentas de al menos dos años. Cárgalas en el simulador (cuentas históricas) o súbelas en «Documentación»; Atalaya no inventa cifras.</div><div class="row"><a class="btn solid" href="app.html#historia">Cargar las cuentas</a><button class="btn" data-ir="s1docs">Ver la documentación pedida</button></div></div>${notasHTML(dn)}`;
      } else {
        const i = Math.min(an.F.length - 1, Math.max(0, dn.anio == null ? an.F.length - 1 : an.F.findIndex((f) => f.anio === dn.anio)));
        const f = an.F[i < 0 ? an.F.length - 1 : i];
        host.innerHTML = `<div class="glass pad stack">
            <div class="row"><div><div class="eyebrow">Servicio 1 · ¿Dónde está el dinero que gana la empresa?</div><small class="muted">Beneficio frente a caja, año a año, con las cuentas cargadas en el simulador.</small></div><span class="spacer"></span>${luz(an.st)}</div>
            <div class="sv-g4"><div class="sv-kpi"><span>Beneficio acumulado</span><b>${eur(an.benAc)}</b></div><div class="sv-kpi"><span>Variación de la caja</span><b>${eur(an.cajaAc)}</b></div><div class="sv-kpi ${an.atrAc > 0 ? 'warn' : ''}"><span>Atrapado en circulante</span><b>${eur(an.atrAc)}</b></div><div class="sv-kpi"><span>Invertido en activos</span><b>${eur(an.capAc)}</b></div></div>
            <ul class="sv-lect">${an.lect.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </div>
          <div class="glass pad stack"><div class="eyebrow">Año a año</div>
            <div class="rp-tw"><table class="sv-tab"><thead><tr><th>Año</th><th>Beneficio</th><th>Recursos generados</th><th>Variación de caja</th><th>Atrapado en circulante</th><th>Inversión</th><th>Deuda</th><th>Dividendos</th><th>Días cobro</th></tr></thead><tbody>
              ${an.F.map((x) => `<tr class="${x === f ? 'on' : ''}" data-an="${x.anio}"><td>${x.anio}</td><td>${eur(x.bn)}</td><td>${eur(x.recursos)}</td><td class="${x.caja < 0 ? 'neg' : ''}">${eur(x.caja)}</td><td>${eur(x.atrapado)}</td><td>${eur(x.capex)}</td><td>${eur(x.deuda)}</td><td>${eur(x.div)}</td><td>${x.dso ? Math.round(x.dso) : '—'}</td></tr>`).join('')}</tbody></table></div>
            <div class="eyebrow">¿Dónde está cada 100 € de ${f.anio}?</div>
            <div class="sv-barras">${f.usos.map((u) => `<div><span>${esc(u.n)}</span><i style="width:${Math.max(2, u.pct)}%"></i><b>${Math.round(u.pct)} €</b></div>`).join('') || '<small class="muted">Sin usos que mostrar.</small>'}</div>
            <small class="muted">Toca un año en la tabla para verlo.</small>
          </div>${notasHTML(dn)}`;
        $$('[data-an]', host).forEach((tr) => (tr.onclick = () => { dn.anio = +tr.dataset.an; guardar(); render(); }));
      }
      wireNotas(host, dn);
      $$('[data-ir]', host).forEach((b) => (b.onclick = () => ir(b.dataset.ir, { ver: true })));
    });
  };
  const notasHTML = (dn) => `<div class="glass pad stack"><div class="eyebrow">Tus conclusiones (van al informe)</div><textarea class="input" rows="5" id="svDinNotas" placeholder="Qué explica la diferencia entre beneficio y caja, qué decisión la causa y qué propones atacar primero…">${esc(dn.notas || '')}</textarea><div class="row"><button class="btn solid" data-ir="s1cierre">Informe y siguiente propuesta →</button></div></div>`;
  const wireNotas = (host, dn) => { const t = $('#svDinNotas', host); if (t) t.oninput = () => { dn.notas = t.value; guardar(); }; };

  const informeDinero = async () => {
    const In = A.informe; In.reset();
    const sim = await leerSim(), Y = aniosDe(sim), an = Y.length >= 2 ? analisisDinero(Y) : null, dn = R().dinero;
    const nl = (t) => esc(t || '').replace(/\n+/g, '</p><p>');
    let html = In.cover({ tipo: 'Informe', kicker: 'Servicio 1', titulo: '¿Dónde está el dinero que gana su empresa?', subtitulo: 'Beneficio frente a caja: adónde ha ido cada euro.', empresa: empresa() });
    if (!an) html += In.callout('Faltan las cuentas de al menos dos años para completar el análisis.', 'warn');
    else {
      html += In.summary('En pocas palabras', `<ul>${an.lect.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`, an.st)
        + In.kpis([{ k: 'Beneficio acumulado', v: eur(an.benAc) }, { k: 'Variación de la caja', v: eur(an.cajaAc), st: an.cajaAc < 0 ? 'stop' : 'ok' }, { k: 'Atrapado en circulante', v: eur(an.atrAc), st: an.atrAc > an.benAc * 0.4 ? 'warn' : 'ok' }, { k: 'Invertido en activos', v: eur(an.capAc) }])
        + In.section('Año a año', In.table(['Año', 'Beneficio', 'Variación de caja', 'Atrapado en circulante', 'Inversión', 'Deuda', 'Dividendos', 'Días de cobro'], an.F.map((x) => [String(x.anio), eur(x.bn), eur(x.caja), eur(x.atrapado), eur(x.capex), eur(x.deuda), eur(x.div), x.dso ? String(Math.round(x.dso)) : '—']), { num: [1, 2, 3, 4, 5, 6, 7] }))
        + In.section(`¿Dónde está cada 100 € de ${an.F[an.F.length - 1].anio}?`, In.table(['Destino', 'De cada 100 €'], an.F[an.F.length - 1].usos.map((u) => [u.n, Math.round(u.pct) + ' €']), { num: [1] }))
        + In.section('La regla que lo explica', '<p><b>La liquidez genera rentabilidad, la rentabilidad genera crecimiento.</b> Cuando se crece financiando a los clientes, al stock o a las inversiones con la caja del día a día, el beneficio se queda en el papel y la empresa depende del banco. Es una regla como la gravedad: puede no verse, pero está ahí.</p>');
    }
    if ((dn.notas || '').trim()) html += In.section('Conclusiones del consultor', `<p>${nl(dn.notas)}</p>`);
    html += In.section('Siguiente paso', '<p>Este informe dice <b>dónde</b> está el dinero. La Auditoría integral 360 explica <b>por qué</b>: cómo funcionan las operaciones, los clientes y los productos, la estructura de costes y el sistema financiero, y qué hay que cambiar primero.</p>') + In.foot('Documento para la empresa.');
    In.open({ titulo: 'Dónde está su dinero', html, paginado: true }); marca('dinero');
  };

  /* ---------- Propuestas de cada servicio (S2 tras el dinero, S3 tras la 360) ---------- */
  const PROP = {
    propS2: { titulo: 'Propuesta · Auditoría integral 360', kicker: 'Servicio 2', sub: 'La foto completa de su empresa, de los datos a la operativa.',
      alcance: ['Datos de partida y documentación de todas las áreas', 'Flujos de caja: cobros, pagos, tesorería a 13 semanas', 'Sistema operativo: procesos, tiempos y método de trabajo', 'ABC de clientes y de producto: quién y qué deja margen', 'Estructura económica: márgenes, costes fijos y punto de equilibrio', 'Sistema financiero: deuda, financiación y riesgos'],
      entregables: ['Informe de la auditoría integral 360 con la foto completa', 'Mapa de prioridades ordenado: liquidez, rentabilidad, crecimiento', 'Propuesta de acompañamiento por objetivos'], plazo: '4 a 6 semanas' },
    propS3: { titulo: 'Propuesta · Acompañamiento por objetivos', kicker: 'Servicio 3', sub: 'Sesiones quincenales para alcanzar los objetivos que usted se marque.',
      alcance: ['Arranque: las reglas básicas de funcionamiento de una empresa y el método SMART', 'Objetivos SMART que dependen solo de quien los ejecuta, con su acción diaria', 'Sesiones quincenales sobre las prioridades que revela la auditoría', 'Formación de apoyo en cada tema y acción directa del empresario', 'Acta y manual de formación de cada sesión'],
      entregables: ['Actas de cada sesión con acuerdos, responsables y fechas', 'Manuales de formación de los temas trabajados', 'Seguimiento de objetivos y del plan de intervención'], plazo: '6 a 12 meses' }
  };
  const hallazgosS1 = async () => { const sim = await leerSim(), Y = aniosDe(sim), an = Y.length >= 2 ? analisisDinero(Y) : null; return an ? an.lect : []; };
  const informePropuesta = async (k) => {
    const In = A.informe, T = PROP[k], pr = prop(k); In.reset();
    const visto = k === 'propS2' ? await hallazgosS1() : I.ruta().filter((x) => x.n === 'stop' || x.n === 'warn').slice(0, 5).map((x) => `${x.a.n}: ${(I.TRIAJE[x.n] || {}).n || ''}${x.cs[0] ? ' · ' + x.cs[0].t : ''}`);
    const meses = k === 'propS3' ? (+pr.meses || +R().servicios.s3.meses || 6) : 0;
    let html = In.cover({ tipo: 'Propuesta', kicker: T.kicker, titulo: T.titulo, subtitulo: T.sub, empresa: empresa() })
      + In.summary('Por qué ahora', `<p>${k === 'propS2' ? 'Ya sabemos dónde está el dinero. Ahora toca entender por qué se queda ahí y qué hay que cambiar para que no vuelva a pasar.' : 'La auditoría ha ordenado las prioridades. El acompañamiento las convierte en objetivos que usted alcanza, quincena a quincena.'}</p>`)
      + (visto.length ? In.section('Lo que hemos visto', `<ul>${visto.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`) : '')
      + In.section('Qué haremos', `<ul>${T.alcance.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`)
      + In.section('Qué recibirá', `<ul>${T.entregables.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`)
      + In.section('Cómo trabajaremos', k === 'propS3' ? `<p>${meses} meses con una sesión cada quince días (unas ${Math.round(meses * 2.15)} sesiones). Las primeras se dedican a las reglas básicas y al método SMART; después, cada sesión aborda una prioridad con su formación y una acción directa suya.</p>` : `<p>Plazo orientativo: ${T.plazo}. Revisamos la documentación de cada área, hablamos con las personas clave y verificamos sobre el terreno.</p>`)
      + (pr.precio ? In.section('Inversión', `<p><b>${esc(pr.precio)}</b>${pr.forma ? ' · ' + esc(pr.forma) : ''}</p>`) : '')
      + (pr.notas ? In.section('Notas', `<p>${esc(pr.notas)}</p>`) : '')
      + In.foot('Propuesta para la empresa.');
    In.open({ titulo: T.titulo, html, paginado: true }); marca(k); if (!pr.estado || pr.estado === 'borrador') { pr.estado = 'presentada'; pr.fecha = pr.fecha || hoy(); guardar(); }
  };
  const propForm = (k) => { const pr = prop(k), T = PROP[k]; return `<div class="glass pad stack"><div class="row"><div><div class="eyebrow">${esc(T.titulo)}</div><small class="muted">${esc(T.sub)}</small></div></div>
      <div class="sv-g3"><label class="small">Honorarios<input class="input" data-pf="precio" value="${esc(pr.precio || '')}" placeholder="${k === 'propS3' ? 'p. ej. 1.200 € al mes' : 'p. ej. 4.500 €'}"></label><label class="small">Forma de pago<input class="input" data-pf="forma" value="${esc(pr.forma || '')}" placeholder="50 % al inicio, 50 % a la entrega"></label>${k === 'propS3' ? `<label class="small">Duración<select class="input" data-pf="meses">${[6, 9, 12].map((m) => `<option value="${m}" ${(+pr.meses || 6) === m ? 'selected' : ''}>${m} meses</option>`).join('')}</select></label>` : `<label class="small">Estado<select class="input" data-pf="estado">${ESTADO_PROP.map(([v, n]) => `<option value="${v}" ${(pr.estado || 'borrador') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`}</div>
      ${k === 'propS3' ? `<label class="small">Estado<select class="input" data-pf="estado">${ESTADO_PROP.map(([v, n]) => `<option value="${v}" ${(pr.estado || 'borrador') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
      <label class="small">Notas para la propuesta<textarea class="input" rows="2" data-pf="notas">${esc(pr.notas || '')}</textarea></label>
      <div class="row"><button class="btn solid" data-prop="${k}">Abrir la propuesta</button></div></div>`; };
  const wireProp = (host, k) => {
    const pr = prop(k);
    $$('[data-pf]', host).forEach((x) => (x.onchange = x.oninput = () => {
      pr[x.dataset.pf] = x.value;
      if (x.dataset.pf === 'estado' && x.value === 'aceptada') { const sv = k === 'propS2' ? 's2' : 's3'; svc(sv).contratado = true; if (!svc(sv).estado) svc(sv).estado = 'curso'; if (k === 'propS3') svc('s3').meses = +pr.meses || 6; toast(`Aceptada: el ${k === 'propS2' ? 'Servicio 2' : 'Servicio 3'} queda en curso.`); }
      guardar(); if (x.tagName === 'SELECT') render();
    }));
    $$('[data-prop]', host).forEach((b) => (b.onclick = () => informePropuesta(b.dataset.prop)));
  };
  VISTAS.s1cierre = (host) => {
    const s1 = svc('s1');
    host.innerHTML = `<div class="glass pad stack"><div class="eyebrow">Servicio 1 · entrega</div>
        <div class="row"><button class="btn solid" id="svInfDin">Informe «Dónde está su dinero»</button><label class="small"><input type="checkbox" id="svS1Ent" ${s1.estado === 'entregado' ? 'checked' : ''}> Servicio entregado</label></div>
        <small class="muted">El informe recoge el análisis año a año y tus conclusiones. Después, presenta la propuesta de la Auditoría 360 con lo que ha revelado.</small></div>${propForm('propS2')}`;
    $('#svInfDin', host).onclick = () => informeDinero();
    $('#svS1Ent', host).onchange = (e) => { s1.estado = e.target.checked ? 'entregado' : 'curso'; guardar(); render(); };
    wireProp(host, 'propS2');
  };

  /* ================= ETAPA 4 · FOTO 360 ================= */
  const BLOQUES = [
    { id: 'datos', n: 'Datos de partida', q: '¿Qué información tiene la empresa y cuánta se puede creer?', areas: ['inf'] },
    { id: 'caja', n: 'Flujos de caja', q: '¿Cómo entra y sale el dinero, y con cuánta antelación se ve?', areas: ['fin'] },
    { id: 'operativo', n: 'Sistema operativo', q: '¿Cómo se trabaja: procesos, tiempos, método y responsables?', areas: ['ope', 'tie', 'per'] },
    { id: 'abc', n: 'ABC de clientes y de producto', q: '¿Quién y qué deja margen, y cuánto depende la empresa de pocos?', areas: ['com'] },
    { id: 'economica', n: 'Estructura económica', q: '¿Cómo se reparte cada euro de venta: margen, personal, fijos y resultado?', areas: [] },
    { id: 'financiero', n: 'Sistema financiero', q: '¿Cómo se financia: deuda, plazos, coste y autonomía?', areas: ['leg', 'gob'] }
  ];
  const peor = (l) => (l.includes('stop') ? 'stop' : l.includes('warn') ? 'warn' : l.length ? 'ok' : '');
  const datos360 = async () => {
    const cuenta = V.cruce && V.cruce.leerCuenta ? await V.cruce.leerCuenta() : null, sim = await leerSim(), Y = aniosDe(sim), u = Y[Y.length - 1];
    const estado = V.cruce && V.cruce.estadoDatos ? await V.cruce.estadoDatos() : null;
    const out = {};
    BLOQUES.forEach((b) => { out[b.id] = []; b.areas.forEach((a) => ((cuenta && cuenta.out ? cuenta.out[a] : cuenta && cuenta[a]) || { datos: [] }).datos.forEach((x) => out[b.id].push(x))); });
    if (estado) Object.entries(estado).forEach(([k, v]) => out.datos.unshift({ k: k[0].toUpperCase() + k.slice(1), v: v.det, st: v.ok ? 'ok' : 'stop' }));
    out.datos.push({ k: 'Documentos subidos', v: String((S().documentacion || []).length) });
    if (u) {
      const v = g(u, 'ventas') || 1, mb = (v - g(u, 'costeVentas')) / v * 100, per = g(u, 'personal') / v * 100, otros = g(u, 'otrosGastos') / v * 100, ebitda = (v - g(u, 'costeVentas') - g(u, 'personal') - g(u, 'otrosGastos'));
      const fijos = g(u, 'personal') + g(u, 'otrosGastos'), pe = mb > 0 ? fijos / (mb / 100) : null;
      out.economica.push({ k: 'Margen bruto', v: pct(mb), st: mb < 30 ? 'warn' : 'ok' }, { k: 'Peso del personal', v: pct(per), st: per > 35 ? 'warn' : 'ok' }, { k: 'Otros gastos', v: pct(otros) }, { k: 'EBITDA sobre ventas', v: pct(ebitda / v * 100), st: ebitda <= 0 ? 'stop' : ebitda / v < 0.06 ? 'warn' : 'ok' });
      if (pe) out.economica.push({ k: 'Punto de equilibrio', v: eur(pe), st: v < pe * 1.1 ? 'stop' : v < pe * 1.25 ? 'warn' : 'ok' });
      const deuda = g(u, 'deudaLP') + g(u, 'deudaCP'), activo = g(u, 'inmovilizado') + g(u, 'existencias') + g(u, 'clientes') + g(u, 'tesoreria');
      out.financiero.push({ k: 'Deuda bancaria', v: eur(deuda) }, { k: 'Deuda / EBITDA', v: ebitda > 0 ? (deuda / ebitda).toFixed(1).replace('.', ',') + ' veces' : '—', st: ebitda <= 0 || deuda / ebitda > 4 ? 'stop' : deuda / ebitda > 3 ? 'warn' : 'ok' }, { k: 'Deuda a corto sobre el total', v: deuda ? pct(g(u, 'deudaCP') / deuda * 100) : '—', st: deuda && g(u, 'deudaCP') / deuda > 0.6 ? 'warn' : 'ok' }, { k: 'Autonomía (fondos propios / activo)', v: activo ? pct(g(u, 'fondosPropios') / activo * 100) : '—', st: activo && g(u, 'fondosPropios') / activo < 0.3 ? 'warn' : 'ok' });
      if (Y.length >= 2) { const an = analisisDinero(Y); if (an) out.caja.unshift({ k: 'Beneficio frente a caja (periodo)', v: `${eur(an.benAc)} ganados · caja ${eur(an.cajaAc)}`, st: an.st }, { k: 'Atrapado en circulante', v: eur(an.atrAc), st: an.atrAc > an.benAc * 0.4 ? 'warn' : 'ok' }); }
    }
    BLOQUES.forEach((b) => b.areas.forEach((a) => { const n = I.desvDe(a); if (n) out[b.id].push({ k: 'Desviaciones en la verificación (' + D.area(a).n + ')', v: String(n), st: n > 2 ? 'stop' : 'warn' }); }));
    return out;
  };
  const prioridades360 = () => {
    const orden = { liquidez: 0, rentabilidad: 1, crecimiento: 2, organizacion: 3 };
    return I.ruta().filter((x) => x.n === 'stop' || x.n === 'warn').map((x) => ({ x, p: (I.prioArea(x.a.id) || {}).p || 'organizacion' })).sort((a, b) => (orden[a.p] ?? 4) - (orden[b.p] ?? 4) || ({ stop: 0, warn: 1 }[a.x.n] - { stop: 0, warn: 1 }[b.x.n]));
  };
  VISTAS.foto360 = (host0) => {
    const host = caja(host0, 'Reuniendo los datos de todos los mundos…');
    datos360().then((dat) => {
      const F = R().foto360, pr = prioridades360();
      host.innerHTML = `<div class="glass pad stack"><div class="eyebrow">Servicio 2 · Foto 360</div><small class="muted">De los datos a la operativa. Cada bloque toma sus cifras de los mundos; pon tu semáforo y tu nota. Lo que falte, pídelo: el bloque lo dice.</small></div>
        <div class="sv-360">${BLOQUES.map((b, i) => { const l = dat[b.id] || [], auto = peor(l.map((x) => x.st).filter(Boolean)), f = F[b.id] || {}; return `<section class="glass pad stack sv-bl"><div class="row"><span class="sv-n">${i + 1}</span><div><b>${esc(b.n)}</b><small class="muted">${esc(b.q)}</small></div><span class="spacer"></span>${luz(f.st || auto)}</div>
          ${l.length ? `<ul class="sv-dat">${l.map((x) => `<li>${luz(x.st)}<span>${esc(x.k)}</span><b>${esc(x.v)}</b></li>`).join('')}</ul>` : '<small class="muted">Sin datos de los mundos: pide la documentación de este bloque.</small>'}
          <div class="row"><select class="input small" data-fs="${b.id}"><option value="">Semáforo: automático${auto ? ' (' + ({ ok: 'verde', warn: 'ámbar', stop: 'rojo' })[auto] + ')' : ''}</option>${[['ok', 'Verde'], ['warn', 'Ámbar'], ['stop', 'Rojo']].map(([v, n]) => `<option value="${v}" ${f.st === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <textarea class="input" rows="2" data-fn="${b.id}" placeholder="Tu nota: qué has visto y qué propones">${esc(f.nota || '')}</textarea></section>`; }).join('')}</div>
        <div class="glass pad stack"><div class="eyebrow">Prioridades que revela la foto</div><small class="muted">Ordenadas por la regla base: primero la liquidez, después la rentabilidad, después el crecimiento.</small>
          ${pr.length ? `<ol class="sv-prio">${pr.map(({ x, p }) => `<li>${luz(x.n)}<b>${esc(x.a.n)}</b><small>${esc(I.PRIN_N && I.PRIN_N[p] ? I.PRIN_N[p] : p)}${x.cs[0] ? ' · ' + esc(x.cs[0].t) : ''}</small></li>`).join('')}</ol>` : '<p class="small muted">Sin áreas en urgencias o preferentes.</p>'}
          <div class="row"><button class="btn solid" data-ir="s2cierre">Informe y propuesta de acompañamiento →</button></div></div>`;
      $$('[data-fs]', host).forEach((x) => (x.onchange = () => { F[x.dataset.fs] = Object.assign(F[x.dataset.fs] || {}, { st: x.value }); guardar(); render(); }));
      $$('[data-fn]', host).forEach((x) => (x.oninput = () => { F[x.dataset.fn] = Object.assign(F[x.dataset.fn] || {}, { nota: x.value }); guardar(); }));
      $$('[data-ir]', host).forEach((b) => (b.onclick = () => ir(b.dataset.ir, { ver: true })));
    });
  };
  // El informe de la auditoría integral se amplía con la foto 360
  const foto360Informe = async () => {
    const In = A.informe, dat = await datos360(), F = R().foto360;
    return In.section('Foto 360: de los datos a la operativa', BLOQUES.map((b) => { const l = dat[b.id] || [], f = F[b.id] || {}, st = f.st || peor(l.map((x) => x.st).filter(Boolean)); return `<h3>${esc(b.n)} ${st ? In.pill(st) : ''}</h3>${l.length ? In.table(['Indicador', 'Valor'], l.map((x) => [x.k, x.v])) : '<p>Sin datos suficientes.</p>'}${f.nota ? `<p>${esc(f.nota)}</p>` : ''}`; }).join(''));
  };
  V.foto360Informe = foto360Informe;
  VISTAS.s2cierre = (host) => {
    const s2 = svc('s2');
    host.innerHTML = `<div class="glass pad stack"><div class="eyebrow">Servicio 2 · entrega</div>
        <div class="row"><button class="btn solid" id="svInf360">Informe de la auditoría 360</button><label class="small"><input type="checkbox" id="svS2Ent" ${s2.estado === 'entregado' ? 'checked' : ''}> Servicio entregado</label></div>
        <small class="muted">Con la foto completa y sus prioridades, presenta el acompañamiento: de 6 a 12 meses, sesiones quincenales, objetivos SMART del empresario.</small></div>${propForm('propS3')}`;
    $('#svInf360', host).onclick = () => V.informes.auditoria && V.informes.auditoria();
    $('#svS2Ent', host).onchange = (e) => { s2.estado = e.target.checked ? 'entregado' : 'curso'; guardar(); render(); };
    wireProp(host, 'propS3');
  };

  /* La foto 360 entra en el informe de la auditoría integral, antes del pie */
  if (V.informes && V.informes.auditoria) {
    const aud0 = V.informes.auditoria;
    V.informes.auditoria = async () => {
      const extra = await foto360Informe(); const In = A.informe, open0 = In.open;
      In.open = (o) => { In.open = open0; if (o && o.html) o.html = o.html.replace('<footer class="rp-foot"', extra + '<footer class="rp-foot"'); return open0(o); };
      try { return await aud0(); } finally { In.open = open0; }
    };
  }

  /* Los informes nuevos se añaden a la pestaña «Informes y documentos» */
  V.serviciosInformes = [
    { k: 'solicitud', n: 'Solicitud de documentación', d: 'Servicio 1 · lo que se pide a la empresa', fn: () => informeSolicitud(), para: 'empresa' },
    { k: 'dinero', n: 'Dónde está su dinero', d: 'Servicio 1 · beneficio frente a caja, año a año', fn: () => informeDinero(), para: 'empresa' },
    { k: 'propS2', n: 'Propuesta de la Auditoría 360', d: 'Tras el Servicio 1', fn: () => informePropuesta('propS2'), para: 'empresa' },
    { k: 'propS3', n: 'Propuesta de acompañamiento', d: 'Tras la Auditoría 360 · 6 a 12 meses', fn: () => informePropuesta('propS3'), para: 'empresa' }
  ];
  V.servicios = { DOCS_S1, BLOQUES, analisisDinero, aniosDe, leerSim, datos360, informeDinero, informePropuesta, informeSolicitud };
})();
