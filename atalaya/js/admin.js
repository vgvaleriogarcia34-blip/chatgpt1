/* Atalaya · Gestor de usuarios: acceso, pagos, horas de uso, registro de actividad y segundo factor */
(function () {
  const A = window.Atalaya, P = A.platform, F = A.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const hm = (min) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
  const fdate = (d) => (d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fhora = (d) => (d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const planN = (k) => (P.PLANES[k] || {}).nombre || k || '—';
  // Con el servidor hay registro de actividad, segundo factor y operaciones (crear, ampliar prueba, corregir pagos, cerrar solicitudes)
  const SRV = () => P.mode === 'server';
  const api = (ruta, metodo, datos) => P.api(ruta, metodo ? { method: metodo, body: JSON.stringify(datos || {}) } : undefined);
  let users = [], contactos = [], estado = {};

  // Acceso como P.accessOf, contando la prueba ampliada por la administración (pruebaHasta)
  function accesoDe(u) {
    const a = P.accessOf(u), fin = Date.parse(u.pruebaHasta);
    if (!u.pagado && u.estado !== 'bloqueado' && fin > Date.now() && (a.motivo !== 'prueba' || fin > Date.parse(u.alta) + P.PRUEBA_DIAS * 864e5)) return { ok: true, motivo: 'prueba', diasPrueba: Math.ceil((fin - Date.now()) / 864e5) };
    return a;
  }
  function estadoDe(u) {
    if (u.estado === 'bloqueado') return { k: 'bloqueado', t: 'Bloqueado', st: 'stop' };
    const acc = accesoDe(u);
    if (acc.motivo === 'pagado') return { k: 'activo', t: u.pagoFallido ? 'Pagando · cobro fallido' : 'Pagando', st: u.pagoFallido ? 'warn' : 'ok' };
    if (acc.motivo === 'prueba') return { k: 'prueba', t: `Prueba · ${acc.diasPrueba} d`, st: 'warn' };
    return { k: 'vencido', t: u.pagado ? 'Plan vencido' : 'Prueba terminada', st: 'stop' };
  }

  async function load() {
    try { contactos = await P.admin.contactos(); } catch (e) { contactos = []; }
    try { users = await P.admin.list(); } catch (e) { if (/administraci/i.test(e.message)) return gate(); $('#utable').innerHTML = `<p class="alert stop">${esc(e.message)}</p>`; return; }
    render();
    if (SRV()) cargarActividad();
  }
  function render() {
    const now = Date.now();
    const est = users.map((u) => ({ u, e: estadoDe(u) }));
    const pagando = est.filter((x) => x.e.k === 'activo');
    const mrr = pagando.reduce((a, x) => a + P.precio(x.u.plan, x.u.periodo, x.u.empresas, x.u.cuotaPactada).mes, 0); // ingreso mensual equivalente (los anuales, a su precio con descuento)
    // Cobrado de verdad: pagos registrados (a mano o por Stripe) de los últimos 30 días, sin los anulados
    const cobrado30 = users.reduce((a, u) => a + (u.pagos || []).filter((p) => !p.anulado && now - new Date(p.fecha).getTime() < 30 * 864e5).reduce((s, p) => s + (+p.importe || 0), 0), 0);
    const uso30 = users.reduce((a, u) => a + P.usageMinutes(u, 30), 0);
    const activos7 = users.filter((u) => u.ultimoAcceso && now - new Date(u.ultimoAcceso).getTime() < 7 * 864e5).length;
    $('#akpis').innerHTML = [
      ['Usuarios', users.length, 'cuentas creadas'],
      ['Pagando', pagando.length, 'acceso de pago vigente'],
      ['En prueba', est.filter((x) => x.e.k === 'prueba').length, 'prueba gratuita en curso'],
      ['Sin acceso', est.filter((x) => x.e.k === 'vencido' || x.e.k === 'bloqueado').length, 'vencidos, impagados o bloqueados'],
      ['Cuotas al mes', F.eur(mrr), 'según el plan de quien paga'],
      ['Cobrado 30 días', F.eur(cobrado30), 'pagos registrados'],
      ['Uso 30 días', hm(uso30), `${activos7} usuarios activos esta semana`]
    ].map(([k, v, d]) => `<div class="kpi"><div class="k"><span>${k}</span></div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('');

    // Uso diario agregado
    const days = []; for (let i = 29; i >= 0; i--) days.push(new Date(now - i * 864e5).toISOString().slice(0, 10));
    const tot = days.map((d) => users.reduce((a, u) => a + ((u.uso || {})[d] || 0), 0));
    const W = 560, Hh = 170, m = { l: 40, r: 8, t: 8, b: 22 }, mx = Math.max(60, ...tot), bw = (W - m.l - m.r) / days.length;
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Minutos de uso por día"><g class="grid">`;
    [0, 0.5, 1].forEach((k) => { const y = m.t + (1 - k) * (Hh - m.t - m.b); svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/><text x="${m.l - 6}" y="${y + 3}" text-anchor="end">${Math.round((mx * k) / 60 * 10) / 10} h</text>`; });
    svg += '</g>';
    tot.forEach((v, i) => { const h = (v / mx) * (Hh - m.t - m.b); svg += `<rect class="ub" data-i="${i}" x="${m.l + i * bw + 1}" y="${Hh - m.b - h}" width="${bw - 2}" height="${Math.max(1, h)}" rx="2" fill="${css('--gold')}" opacity="0.85"/>`; });
    [0, 15, 29].forEach((i) => { svg += `<text x="${m.l + i * bw + bw / 2}" y="${Hh - 6}" text-anchor="middle">${days[i].slice(5)}</text>`; });
    $('#usageChart').innerHTML = svg + '</svg>';
    $$('#usageChart .ub').forEach((b) => { const i = +b.dataset.i; b.addEventListener('pointermove', (ev) => A.charts.tip(`<h5>${fdate(days[i])}</h5><div class="fv">${hm(tot[i])}</div>`, ev.clientX, ev.clientY)); b.addEventListener('pointerleave', A.charts.hideTip); });

    // Pendientes. Con el servidor, cada solicitud se puede cerrar (queda en el registro de actividad)
    const mini = 'style="padding:3px 8px;font-size:.75rem"';
    const cerrarBtn = (attr) => (SRV() ? ` <button class="btn ghost" ${attr} ${mini}>Cerrar</button>` : '');
    const pend = [];
    users.filter((u) => u.solicitudReset).forEach((u) => pend.push(`<li><b>${esc(u.nombre || u.email)}</b> ha olvidado su contraseña (${fdate(u.solicitudReset)}). <button class="btn ghost" data-pwset="${u.id}" ${mini}>Cambiar contraseña</button> <button class="btn ghost" data-reset="${u.id}" ${mini}>Generar enlace</button>${cerrarBtn(`data-cierra="${u.id}" data-tipo="reset"`)}</li>`));
    const abiertos = contactos.filter((c) => !c.atendido);
    // Cambios de plan pedidos por clientes con el acceso pagado: se confirman eligiendo el plan
    users.filter((u) => u.planPendiente).forEach((u) => pend.push(`<li><b>${esc(u.nombre || u.email)}</b> pide pasar de ${esc(planN(u.plan))} a <b>${esc(planN(u.planPendiente.plan))}</b> (pago ${esc(u.planPendiente.periodo || 'mensual')}, ${fdate(u.planPendiente.fecha)}). <button class="btn solid" data-confplan="${u.id}" ${mini}>Confirmar el cambio</button>${cerrarBtn(`data-cierra="${u.id}" data-tipo="plan"`)}</li>`));
    // Solicitudes de contacto para el plan Grupos (precio a medida) y datos de facturación al pedir la activación
    abiertos.filter((c) => c.plan !== 'sesion' && c.origen !== 'cambio-plan').slice(0, 20).forEach((c) => { const ya = users.find((u) => u.email === String(c.email).toLowerCase()); const act = c.origen === 'activacion'; pend.push(`<li><b>${esc(c.nombre || c.email)}</b> ${act ? 'pide el enlace de pago del plan' : 'pide el plan'} ${esc(planN(c.plan))} (${fdate(c.fecha)}): ${esc(c.email)}${c.telefono ? ' · ' + esc(c.telefono) : ''}${c.empresa ? ' · ' + esc(c.empresa) : ''}${c.sociedades ? ' · ' + esc(c.sociedades) + ' sociedades' : ''}${c.mensaje ? '<br><span class="muted">«' + esc(c.mensaje) + '»</span>' : ''}${ya ? ' <span class="muted">(ya tiene cuenta)</span>' : ''}${act ? '' : ` <button class="btn solid" data-conceder="${esc(c.id || contactos.indexOf(c))}" ${mini}>Conceder acceso</button>`}${cerrarBtn(`data-ccierra="${esc(c.id)}"`)}</li>`); });
    // Sesiones de 60 minutos pedidas desde la página comercial
    abiertos.filter((c) => c.plan === 'sesion').slice(0, 20).forEach((c) => pend.push(`<li><b>${esc(c.nombre || c.email)}</b> pide una sesión de 60 minutos (${fdate(c.fecha)}): ${esc(c.email)}${c.telefono ? ' · ' + esc(c.telefono) : ''}${c.empresa ? ' · ' + esc(c.empresa) : ''}${c.mensaje ? '<br><span class="muted">«' + esc(c.mensaje) + '»</span>' : ''}${cerrarBtn(`data-ccierra="${esc(c.id)}"`)}</li>`));
    // Cambios de plan hechos por el cliente en el último mes (para ajustar la cuota en el siguiente cobro)
    users.forEach((u) => (u.cambiosPlan || []).filter((c) => c.por !== 'administración' && c.por !== 'stripe' && Date.now() - new Date(c.fecha).getTime() < 31 * 864e5).forEach((c) => pend.push(`<li><b>${esc(u.nombre || u.email)}</b> cambió de ${esc(planN(c.de))} a ${esc(planN(c.a))} el ${fdate(c.fecha)}${u.pagado ? ': ajusta la cuota en el siguiente cobro' : ' (en prueba)'}.</li>`)));
    users.filter((u) => u.solicitudPago && !u.pagado).forEach((u) => pend.push(`<li><b>${esc(u.nombre || u.email)}</b> pidió activar el plan ${esc(planN(u.plan))} el ${fdate(u.solicitudPago)}. <button class="btn ghost" data-paypend="${u.id}" ${mini}>Registrar pago</button>${cerrarBtn(`data-cierra="${u.id}" data-tipo="pago"`)}</li>`));
    users.filter((u) => u.pagoFallido).forEach((u) => pend.push(`<li><b>${esc(u.nombre || u.email)}</b>: Stripe no pudo cobrar la cuota (${fdate(u.pagoFallido)}). El acceso vence el ${fdate(u.venceAcceso)} si no se cobra antes.</li>`));
    est.filter((x) => x.e.k === 'prueba' && accesoDe(x.u).diasPrueba <= 3).forEach((x) => pend.push(`<li>La prueba de <b>${esc(x.u.nombre || x.u.email)}</b> termina en ${accesoDe(x.u).diasPrueba} días.</li>`));
    users.filter((u) => u.pagado && u.venceAcceso && new Date(u.venceAcceso).getTime() - now < 7 * 864e5 && new Date(u.venceAcceso).getTime() > now).forEach((u) => pend.push(`<li>El plan de <b>${esc(u.nombre || u.email)}</b> vence el ${fdate(u.venceAcceso)}${u.stripeSuscripcion && u.stripeEstado === 'active' ? ' (se renueva en Stripe)' : ''}.</li>`));
    $('#pending').innerHTML = pend.length ? `<ul>${pend.join('')}</ul>` : '<p class="muted">Nada pendiente.</p>';
    const uDe = (id) => users.find((x) => x.id === id);
    $$('#pending [data-reset]').forEach((b) => b.onclick = () => resetDialog(uDe(b.dataset.reset)));
    $$('#pending [data-pwset]').forEach((b) => b.onclick = () => pwDialog(uDe(b.dataset.pwset)));
    $$('#pending [data-paypend]').forEach((b) => b.onclick = () => payDialog(uDe(b.dataset.paypend)));
    $$('#pending [data-confplan]').forEach((b) => b.onclick = () => { const u = uDe(b.dataset.confplan); confirmarPlan(u, { plan: u.planPendiente.plan, periodo: u.planPendiente.periodo || u.periodo }); });
    $$('#pending [data-conceder]').forEach((b) => b.onclick = () => concederDialog(contactos.find((c) => c.id === b.dataset.conceder) || contactos[+b.dataset.conceder]));
    $$('#pending [data-cierra]').forEach((b) => b.onclick = () => cerrarSolicitud(() => api(`/admin/users/${b.dataset.cierra}/cerrar`, 'POST', { tipo: b.dataset.tipo })));
    $$('#pending [data-ccierra]').forEach((b) => b.onclick = () => cerrarSolicitud((nota) => api(`/admin/contactos/${b.dataset.ccierra}/cerrar`, 'POST', { nota })));

    // Tabla
    const q = ($('#q').value || '').toLowerCase(), fe = $('#fEstado').value;
    const rows = est.filter((x) => (!q || `${x.u.nombre} ${x.u.email} ${x.u.empresa}`.toLowerCase().includes(q)) && (!fe || x.e.k === fe));
    $('#utable').innerHTML = rows.length ? `<table><thead><tr><th>Usuario</th><th>Empresa</th><th>Plan</th><th>Pago</th><th>Empresas</th><th>Cuota</th><th>Estado</th><th>Vence</th><th>Alta</th><th>Último acceso</th><th>Uso 7 d</th><th>Uso 30 d</th><th>Uso total</th><th>Sesiones</th><th></th></tr></thead><tbody>` +
      rows.map(({ u, e }) => `<tr data-id="${u.id}"><td><b>${esc(u.nombre || '—')}</b><br><span class="muted">${esc(u.email)}</span>${u.dosPasos ? ' <span class="muted" title="Segundo factor activado">· 2FA</span>' : ''}</td><td>${esc(u.empresa || '—')}</td>
        <td><select data-plan aria-label="Plan">${Object.keys(P.PLANES).map((k) => `<option value="${k}" ${k === u.plan ? 'selected' : ''}>${P.PLANES[k].nombre}</option>`).join('')}</select>${u.planPendiente ? `<br><span class="muted">pide ${esc(planN(u.planPendiente.plan))}</span>` : ''}</td>
        <td><select data-per aria-label="Periodo de pago"><option value="mensual" ${u.periodo !== 'anual' ? 'selected' : ''}>Mensual</option><option value="anual" ${u.periodo === 'anual' ? 'selected' : ''}>Anual −30 %</option></select></td>
        <td>${u.empresas || 1}${isFinite((P.PLANES[u.plan] || {}).empresas) ? ' / ' + P.PLANES[u.plan].empresas : ''}</td>
        <td>${(() => { const pr = P.precio(u.plan, u.periodo, u.empresas, u.cuotaPactada); return pr.pactada ? `${P.eur(pr.mes)}/mes<br><span class="muted">pactada${pr.periodo === 'anual' ? ' · anual' : ''}</span>` : pr.periodo === 'anual' ? `${P.eur(pr.total)}/año<br><span class="muted">anual, −30 %</span>` : `${P.eur(pr.mes)}/mes`; })()}</td>
        <td><span class="state st-${e.st}">${e.t}</span></td><td>${u.pagado ? fdate(u.venceAcceso) : u.pruebaHasta ? `<span class="muted">prueba hasta</span><br>${fdate(u.pruebaHasta)}` : '—'}</td><td>${fdate(u.alta)}</td><td>${fdate(u.ultimoAcceso)}</td>
        <td>${hm(P.usageMinutes(u, 7))}</td><td>${hm(P.usageMinutes(u, 30))}</td><td>${hm(P.usageMinutes(u))}</td><td>${u.sesiones || 0}</td>
        <td><div class="uactions"><button class="btn" data-pay>Registrar pago</button>${u.estado === 'bloqueado' ? '<button class="btn ghost" data-unblock>Desbloquear</button>' : '<button class="btn ghost" data-block>Bloquear</button>'}<button class="btn ghost" data-pwrow>Contraseña</button><button class="btn ghost" data-more>Ficha</button></div></td></tr>`).join('') + '</tbody></table>'
      : '<p class="muted">No hay usuarios con ese filtro.</p>';
    $$('#utable tr[data-id]').forEach((tr) => {
      const id = tr.dataset.id, u = users.find((x) => x.id === id);
      // Cambiar plan o periodo pide confirmación: hasta confirmar, el desplegable vuelve a su valor
      $('[data-plan]', tr).onchange = (ev) => { const v = ev.target.value; ev.target.value = u.plan; confirmarPlan(u, { plan: v }); };
      $('[data-per]', tr).onchange = (ev) => { const v = ev.target.value; ev.target.value = u.periodo === 'anual' ? 'anual' : 'mensual'; confirmarPlan(u, { periodo: v }); };
      $('[data-pay]', tr).onclick = () => payDialog(u);
      const bl = $('[data-block]', tr); if (bl) bl.onclick = () => confirmarBloqueo(u, true);
      const ub = $('[data-unblock]', tr); if (ub) ub.onclick = () => confirmarBloqueo(u, false);
      $('[data-more]', tr).onclick = () => ficha(u);
      $('[data-pwrow]', tr).onclick = () => pwDialog(u);
    });
  }
  async function upd(id, patch) {
    try { await P.admin.update(id, patch); await load(); return true; } catch (e) { alertBox(e.message); return false; }
  }
  const modal = $('#modal'), body = $('#modalBody');
  function openModal(html) { body.innerHTML = `<button class="icon-btn close" aria-label="Cerrar">×</button>${html}`; modal.hidden = false; $('.close', body).onclick = () => { modal.hidden = true; }; return body; }
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) modal.hidden = true; });
  function alertBox(t) { openModal(`<p class="alert stop">${esc(t)}</p>`); }
  function alertBox2(t) { openModal(`<p class="alert info">${esc(t)}</p>`); }
  const msgEn = (el, t, bien) => { el.innerHTML = `<span style="color:var(${bien ? '--go' : '--stop'})">${esc(t)}</span>`; };
  /* Confirmación común: qué cambia (antes → después), motivo opcional que queda en el registro y botón de confirmar */
  function confirmar(o) {
    const el = openModal(`<div class="eyebrow">${esc(o.eyebrow || 'Confirmar')}</div><h2 style="font-size:1.6rem">${esc(o.titulo)}</h2>
      ${o.html || ''}${o.filas ? `<table class="mt"><thead><tr><th></th><th>Ahora</th><th>Después</th></tr></thead><tbody>${o.filas.map(([k, a, d]) => `<tr><td>${esc(k)}</td><td>${esc(a)}</td><td><b>${esc(d)}</b></td></tr>`).join('')}</tbody></table>` : ''}
      <form class="stack mt" id="cfF">${o.escribir ? `<label class="small">Para confirmar, escriba <b>${esc(o.escribir)}</b><input class="input" id="cfW" autocomplete="off" required></label>` : ''}
        ${SRV() ? '<label class="small">Motivo (opcional, queda en el registro de actividad)<input class="input" id="cfM" maxlength="300"></label>' : ''}
        <div class="row"><button class="btn solid" id="cfOk" ${o.peligro ? 'style="background:var(--stop);border-color:var(--stop)"' : ''}>${esc(o.boton || 'Confirmar')}</button><button type="button" class="btn ghost" id="cfNo">Cancelar</button></div><p class="small" id="cfMsg"></p></form>`);
    $('#cfNo', el).onclick = () => { modal.hidden = true; };
    $('#cfF', el).onsubmit = async (e) => {
      e.preventDefault();
      if (o.escribir && $('#cfW', el).value.trim().toLowerCase() !== String(o.escribir).toLowerCase()) return msgEn($('#cfMsg', el), 'El texto no coincide.');
      $('#cfOk', el).disabled = true;
      try { await o.hacer($('#cfM', el) ? $('#cfM', el).value.trim() : ''); modal.hidden = true; await load(); }
      catch (x) { msgEn($('#cfMsg', el), x.message); $('#cfOk', el).disabled = false; }
    };
  }
  const cuotaTxt = (plan, periodo, u) => { const pr = P.precio(plan, periodo, u.empresas, u.cuotaPactada), c = P.cuota(pr); return `${P.eur(c.importe)}${c.unidad}`; };
  function confirmarPlan(u, cambio) {
    const plan = cambio.plan || u.plan, periodo = cambio.periodo || u.periodo || 'mensual';
    if (plan === u.plan && periodo === (u.periodo || 'mensual')) return;
    const lim = (P.PLANES[plan] || {}).empresas;
    confirmar({ eyebrow: 'Cambiar el plan', titulo: u.nombre || u.email,
      html: `<p class="small muted">${esc(u.email)} · ${estadoDe(u).t}.${u.planPendiente && u.planPendiente.plan === plan ? ' Confirma el cambio que pidió el cliente.' : ''}${isFinite(lim) && (u.empresas || 1) > lim ? ` <span style="color:var(--stop)">Tiene ${u.empresas} empresas y ${esc(planN(plan))} admite ${lim}: podrá verlas y borrarlas, pero no crear más.</span>` : ''}${u.stripeSuscripcion && u.stripeEstado === 'active' ? ' <span style="color:var(--warn)">Paga con Stripe: cambie también el precio de su suscripción en Stripe (o pídale que lo haga desde su portal).</span>' : ''}</p>`,
      filas: [['Plan', planN(u.plan), planN(plan)], ['Pago', u.periodo === 'anual' ? 'Anual' : 'Mensual', periodo === 'anual' ? 'Anual' : 'Mensual'], ['Cuota', cuotaTxt(u.plan, u.periodo, u), cuotaTxt(plan, periodo, u)]],
      boton: 'Cambiar el plan', hacer: (motivo) => P.admin.update(u.id, Object.assign({}, plan !== u.plan ? { plan } : {}, periodo !== u.periodo ? { periodo } : {}, motivo ? { motivo } : {})) });
  }
  function confirmarBloqueo(u, bloquear) {
    confirmar({ eyebrow: bloquear ? 'Bloquear la cuenta' : 'Desbloquear la cuenta', titulo: u.nombre || u.email, peligro: bloquear,
      html: `<p class="small">${bloquear ? `${esc(u.email)} no podrá entrar ni ver sus datos hasta que la desbloquee. Sus datos se conservan.` : `${esc(u.email)} vuelve a entrar ${u.pagado ? 'con su acceso pagado' : 'en prueba (si no ha terminado)'}.`}</p>`,
      boton: bloquear ? 'Bloquear' : 'Desbloquear', hacer: (motivo) => P.admin.update(u.id, Object.assign({ estado: bloquear ? 'bloqueado' : u.pagado ? 'activo' : 'prueba' }, motivo ? { motivo } : {})) });
  }
  function cerrarSolicitud(fn) {
    const el = openModal(`<div class="eyebrow">Cerrar la solicitud</div><h2 style="font-size:1.6rem">Marcar como atendida</h2>
      <form class="stack mt" id="csF"><label class="small">Nota (opcional): qué se hizo<input class="input" id="csN" maxlength="300" placeholder="Llamado el martes, sesión fijada…"></label><button class="btn solid">Cerrar la solicitud</button><p class="small" id="csM"></p></form>`);
    $('#csF', el).onsubmit = async (e) => { e.preventDefault(); try { await fn($('#csN', el).value.trim()); modal.hidden = true; load(); } catch (x) { msgEn($('#csM', el), x.message); } };
  }
  function payDialog(u) {
    const pl = P.PLANES[u.plan] || P.PLANES.profesional;
    const pr = P.precio(u.plan, u.periodo, u.empresas, u.cuotaPactada);
    const base = u.pagado && u.venceAcceso && new Date(u.venceAcceso).getTime() > Date.now() ? new Date(u.venceAcceso) : new Date();
    const el = openModal(`<div class="eyebrow">Registrar pago</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <p class="small muted">Plan ${pl.nombre}${pr.tramo ? ' · ' + pr.tramo.n.toLowerCase() : ''} · ${pr.periodo === 'anual' ? `cuota anual: ${P.eur(pr.total)} (12 × ${P.eur(pr.base)} − 30 %)` : `${P.eur(pr.mes)}/mes`}. El acceso se amplía desde ${fdate(base)}.</p>
      <div class="stack mt">
        <label class="small">Periodo<select id="pPer" class="input"><option value="1" ${pr.periodo !== 'anual' ? 'selected' : ''}>1 mes</option><option value="3">3 meses</option><option value="12" ${pr.periodo === 'anual' ? 'selected' : ''}>12 meses</option></select></label>
        <label class="small">Importe cobrado (€)<input class="input" id="pImp" inputmode="decimal" value="${pr.periodo === 'anual' ? pr.total : pr.mes}"></label>
        <label class="small">Método y referencia<input class="input" id="pRef" placeholder="Transferencia, tarjeta, recibo…"></label>
        <p class="small" id="pVence"></p>
        <button class="btn solid" id="pOk">Registrar y activar</button><p class="small" id="pMsg"></p>
      </div>`);
    const vence = () => { const v = new Date(base); v.setMonth(v.getMonth() + +$('#pPer', el).value); $('#pVence', el).textContent = `Acceso hasta el ${fdate(v)}.`; return v; };
    vence();
    $('#pPer', el).onchange = (e) => { const m = +e.target.value; $('#pImp', el).value = m === 12 && pr.periodo === 'anual' ? pr.total : Math.round(pr.mes * m * 100) / 100; vence(); };
    $('#pOk', el).onclick = async () => {
      const meses = +$('#pPer', el).value, importe = parseFloat(String($('#pImp', el).value).replace(',', '.'));
      if (!(importe >= 0)) return msgEn($('#pMsg', el), 'Escriba el importe cobrado.');
      $('#pOk', el).disabled = true;
      try {
        if (SRV()) await api(`/admin/users/${u.id}/pagos`, 'POST', { importe, meses, referencia: $('#pRef', el).value });
        else await P.admin.update(u.id, { pagado: true, estado: 'activo', venceAcceso: vence().toISOString(), registrarPago: { importe, meses, referencia: $('#pRef', el).value } });
        modal.hidden = true; load();
      } catch (x) { msgEn($('#pMsg', el), x.message); $('#pOk', el).disabled = false; }
    };
  }
  function corregirPago(u, p) {
    const el = openModal(`<div class="eyebrow">Corregir un pago</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <p class="small muted">Pago del ${fdate(p.fecha)}${p.por ? ' · registrado por ' + esc(p.por) : ''}. La corrección no cambia el vencimiento del acceso (ajústelo con «Registrar pago» o en la ficha). Queda en el registro de actividad con el valor anterior.</p>
      <form class="stack mt" id="cpF">
        <div class="row" style="flex-wrap:wrap"><label class="small">Importe (€)<input class="input" id="cpI" inputmode="decimal" value="${esc(p.importe)}"></label><label class="small">Meses<input class="input" id="cpMe" type="number" min="0" max="36" value="${esc(p.meses)}"></label><label class="small">Fecha<input class="input" id="cpD" type="date" value="${esc(String(p.fecha || '').slice(0, 10))}"></label></div>
        <label class="small">Referencia<input class="input" id="cpR" value="${esc(p.referencia || '')}"></label>
        <label class="small row"><input type="checkbox" id="cpA" ${p.anulado ? 'checked' : ''}> Pago anulado (devuelto o registrado por error)</label>
        <label class="small">Motivo de la corrección (obligatorio)<input class="input" id="cpM" maxlength="300" required></label>
        <button class="btn solid">Guardar la corrección</button><p class="small" id="cpMsg"></p></form>`);
    $('#cpF', el).onsubmit = async (e) => {
      e.preventDefault();
      try { await api(`/admin/users/${u.id}/pagos/${p.id}`, 'PATCH', { importe: $('#cpI', el).value, meses: +$('#cpMe', el).value, fecha: $('#cpD', el).value, referencia: $('#cpR', el).value, anulado: $('#cpA', el).checked, motivo: $('#cpM', el).value.trim() }); modal.hidden = true; await load(); ficha(users.find((x) => x.id === u.id)); }
      catch (x) { msgEn($('#cpMsg', el), x.message); }
    };
  }
  function ampliarPrueba(u) {
    const fin = Math.max(Date.now(), new Date(u.alta).getTime() + P.PRUEBA_DIAS * 864e5, Date.parse(u.pruebaHasta) || 0);
    const el = openModal(`<div class="eyebrow">Ampliar la prueba</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <p class="small muted">${fin > Date.now() + 864e5 ? `La prueba termina el ${fdate(fin)}.` : 'La prueba ya ha terminado: se amplía desde hoy.'} Sus datos se conservan.</p>
      <form class="stack mt" id="apF"><label class="small">Días más<select class="input" id="apD"><option>7</option><option selected>14</option><option>30</option></select></label><p class="small" id="apV"></p>
      <button class="btn solid">Ampliar</button><p class="small" id="apM"></p></form>`);
    const ver = () => { $('#apV', el).textContent = `Nueva fecha de fin: ${fdate(fin + +$('#apD', el).value * 864e5)}.`; };
    ver(); $('#apD', el).onchange = ver;
    $('#apF', el).onsubmit = async (e) => { e.preventDefault(); try { await api(`/admin/users/${u.id}/prueba`, 'POST', { dias: +$('#apD', el).value }); modal.hidden = true; load(); } catch (x) { msgEn($('#apM', el), x.message); } };
  }
  function ficha(u) {
    if (!u) return;
    const dias = Object.keys(u.uso || {}).sort().slice(-14);
    const pagos = (u.pagos || []).slice().reverse();
    const el = openModal(`<div class="eyebrow">Ficha de usuario</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <div class="mgrid mt"><div><span>Correo</span><b style="font-size:.85rem">${esc(u.email)}</b></div><div><span>Teléfono</span><b>${esc(u.telefono || '—')}</b></div><div><span>Empresa</span><b>${esc(u.empresa || '—')}</b></div><div><span>Estado</span><b>${estadoDe(u).t}</b></div></div>
      ${u.stripeCliente ? `<p class="small muted mt">Stripe: cliente ${esc(u.stripeCliente)}${u.stripeSuscripcion ? ' · suscripción ' + esc(u.stripeSuscripcion) : ''}${u.stripeEstado ? ' · ' + esc(u.stripeEstado) : ''}${u.stripeCancelaAlFinal ? ' · se cancela al final del periodo' : ''}.</p>` : ''}
      <h4 class="mt">Pagos</h4>${pagos.length ? `<table><thead><tr><th>Fecha</th><th>Importe</th><th>Meses</th><th>Referencia</th><th></th></tr></thead><tbody>${pagos.map((p) => `<tr${p.anulado ? ' style="opacity:.55;text-decoration:line-through"' : ''}><td>${fdate(p.fecha)}</td><td>${F.eurFull(+p.importe || 0)}</td><td>${p.meses}</td><td>${esc(p.referencia || '')}${p.por ? ` <span class="muted">· ${esc(p.por)}</span>` : ''}${p.factura ? ` <a href="${esc(p.factura)}" target="_blank" rel="noopener">factura</a>` : ''}</td><td>${SRV() && p.id ? `<button class="btn ghost" data-corr="${esc(p.id)}" style="padding:3px 8px;font-size:.75rem">Corregir</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Sin pagos registrados.</p>'}
      <h4 class="mt">Uso de los últimos días</h4>${dias.length ? `<table><tbody>${dias.map((d) => `<tr><td>${fdate(d)}</td><td>${hm(u.uso[d])}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Sin uso registrado.</p>'}
      <h4 class="mt">Nota interna</h4><textarea class="input" id="fNota" rows="3" style="width:100%">${esc(u.nota || '')}</textarea>
      <div class="row mt" style="flex-wrap:wrap"><button class="btn" id="fSave">Guardar nota</button><button class="btn" id="fPay">Registrar pago</button>${SRV() && !u.pagado ? '<button class="btn" id="fPrueba">Ampliar prueba</button>' : ''}<button class="btn" id="fPw">Cambiar contraseña</button><button class="btn ghost" id="fReset">Enviar enlace de recuperación</button>${SRV() && u.dosPasos ? '<button class="btn ghost" id="f2fa">Quitar segundo factor</button>' : ''}${SRV() ? '<button class="btn ghost" id="fAct">Ver actividad</button>' : ''}<span class="spacer"></span><button class="btn ghost" id="fDel" style="color:var(--stop)">Eliminar cuenta</button></div><p class="small" id="fMsg"></p>`);
    $('#fSave', el).onclick = () => upd(u.id, { nota: $('#fNota', el).value }).then((b) => { if (b) modal.hidden = true; });
    $('#fPay', el).onclick = () => payDialog(u);
    $('#fReset', el).onclick = () => resetDialog(u);
    $('#fPw', el).onclick = () => pwDialog(u);
    const fp = $('#fPrueba', el); if (fp) fp.onclick = () => ampliarPrueba(u);
    $$('[data-corr]', el).forEach((b) => b.onclick = () => corregirPago(u, u.pagos.find((p) => p.id === b.dataset.corr)));
    const f2 = $('#f2fa', el); if (f2) f2.onclick = () => confirmar({ eyebrow: 'Segundo factor', titulo: u.nombre || u.email, html: '<p class="small">Quítelo solo si ha comprobado su identidad por otro canal (ha perdido el teléfono y los códigos de recuperación). Podrá volver a activarlo desde su cuenta.</p>', boton: 'Quitar el segundo factor', peligro: true, hacer: (motivo) => api(`/admin/users/${u.id}/2fa-quitar`, 'POST', { motivo }) });
    const fa = $('#fAct', el); if (fa) fa.onclick = () => { modal.hidden = true; $('#aq').value = u.email; cargarActividad(); $('#actBox').scrollIntoView({ behavior: 'smooth' }); };
    $('#fDel', el).onclick = () => confirmar({ eyebrow: 'Eliminar la cuenta', titulo: u.nombre || u.email, peligro: true, escribir: u.email, boton: 'Eliminar definitivamente',
      html: `<p class="small">Se borran para siempre la cuenta, sus datos de empresa, el análisis de mercado, las sesiones, las invitaciones a test con sus respuestas y sus solicitudes de contacto. No se puede deshacer; las copias de seguridad del servidor se sobrescriben en 7 días.</p>${(u.pagos || []).length ? `<p class="small" style="color:var(--warn)">Tiene ${u.pagos.length} pagos registrados: conserve antes lo que necesite para la contabilidad (Descargar CSV).</p>` : ''}`,
      hacer: (motivo) => (SRV() ? P.api('/admin/users/' + u.id, { method: 'DELETE', body: JSON.stringify(motivo ? { motivo } : {}) }) : P.admin.remove(u.id)) });
  }
  function pwDialog(u) {
    const gen = () => { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint32Array(12)); return Array.from(r, (x) => c[x % c.length]).join(''); };
    const el = openModal(`<div class="eyebrow">Cambiar contraseña</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <p class="small muted">Escriba una contraseña nueva para ${esc(u.email)} o genere una segura. Al guardarla se cierran las sesiones que tenga abiertas; désela por un canal de confianza y pídale que la cambie desde su menú («Cambiar contraseña»).</p>
      <form class="stack mt" id="pwF"><label class="small">Contraseña nueva (mínimo 8 caracteres)<div class="row"><input class="input" id="pwN" type="text" autocomplete="off" minlength="8" style="flex:1" value="${gen()}"><button type="button" class="btn ghost" id="pwG">Generar otra</button><button type="button" class="btn ghost" id="pwC">Copiar</button></div></label>
        <button class="btn solid">Guardar contraseña</button><p class="small" id="pwM"></p></form>`);
    $('#pwG', el).onclick = () => { $('#pwN', el).value = gen(); };
    $('#pwC', el).onclick = () => { const v = $('#pwN', el).value; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => { $('#pwC', el).textContent = 'Copiada'; }, () => { $('#pwN', el).select(); }); };
    $('#pwF', el).onsubmit = async (e) => {
      e.preventDefault();
      try { await P.admin.setPassword(u.id, $('#pwN', el).value); $('#pwM', el).innerHTML = `<span style="color:var(--go)">Contraseña cambiada. ${esc(u.email)} ya puede entrar con ella.</span>`; load(); }
      catch (x) { $('#pwM', el).innerHTML = `<span style="color:var(--stop)">${esc(x.message)}</span>`; }
    };
  }
  const enlaceBox = (el, link, texto) => { const cp = (t) => { const b = $('#lkC', el), ta = $('#lkT', el); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = 'Copiado'; }, () => { ta.select(); }); }; return { html: `<p class="small">${texto}</p><textarea class="input" rows="3" readonly id="lkT" style="width:100%">${esc(link)}</textarea><button type="button" class="btn" id="lkC">Copiar enlace</button>`, wire: () => { $('#lkC', el).onclick = () => cp(link); } }; };
  /* Crear un usuario a mano (con el servidor): en prueba o con acceso activo, con invitación para elegir contraseña */
  async function nuevoDialog() {
    const el = openModal(`<div class="eyebrow">Nuevo usuario</div><h2 style="font-size:1.6rem">Crear una cuenta a mano</h2>
      <p class="small muted">Para clientes que contratan por teléfono o en una reunión. La cuenta se crea sin contraseña: recibe una invitación (válida 7 días) para elegirla.</p>
      <form class="stack mt" id="nuF">
        <div class="row" style="flex-wrap:wrap"><label class="small">Nombre<input class="input" name="nombre" maxlength="120"></label><label class="small">Correo<input class="input" name="email" type="email" required maxlength="160"></label></div>
        <div class="row" style="flex-wrap:wrap"><label class="small">Empresa<input class="input" name="empresa" maxlength="160"></label><label class="small">Teléfono<input class="input" name="telefono" maxlength="40"></label></div>
        <div class="row" style="flex-wrap:wrap"><label class="small">Plan<select class="input" name="plan">${Object.keys(P.PLANES).map((k) => `<option value="${k}" ${k === 'profesional' ? 'selected' : ''}>${P.PLANES[k].nombre}</option>`).join('')}</select></label>
          <label class="small">Pago<select class="input" name="periodo"><option value="mensual">Mensual</option><option value="anual">Anual</option></select></label>
          <label class="small">Acceso<select class="input" name="acceso"><option value="prueba">Prueba de ${P.PRUEBA_DIAS} días</option><option value="prueba30">Prueba de 30 días</option><option value="activo1">Activo 1 mes (ya ha pagado)</option><option value="activo12">Activo 12 meses (ya ha pagado)</option></select></label></div>
        <label class="small">Nota interna (opcional)<input class="input" name="nota" maxlength="500"></label>
        <div class="row">${estado.correo ? '<label class="small row"><input type="checkbox" name="enviar" checked> Enviarle la invitación por correo</label>' : ''}<span class="spacer"></span><button class="btn solid">Crear la cuenta</button></div>
      </form><div id="nuOut" class="stack mt"></div>`);
    $('#nuF', el).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target, acc = f.acceso.value;
      try {
        const r = await api('/admin/users', 'POST', { nombre: f.nombre.value, email: f.email.value, empresa: f.empresa.value, telefono: f.telefono.value, plan: f.plan.value, periodo: f.periodo.value, nota: f.nota.value, activo: acc.startsWith('activo'), meses: acc === 'activo12' ? 12 : 1, diasPrueba: acc === 'prueba30' ? 30 : 0, enviar: !!(f.enviar && f.enviar.checked) });
        const link = location.href.replace(/[^/]*([?#].*)?$/, '') + 'acceso.html#reset=' + r.token;
        const b = enlaceBox(el, link, `${r.enviado ? 'Invitación enviada por correo. ' : ''}Enlace para que elija su contraseña (válido 7 días). Envíeselo por un canal de confianza:`);
        $('#nuOut', el).innerHTML = `<p class="alert info">Cuenta creada: ${esc(r.user.email)} · ${esc(planN(r.user.plan))}.</p>` + b.html; b.wire();
        f.querySelector('button.solid').disabled = true; load();
      } catch (x) { $('#nuOut', el).innerHTML = `<p class="alert stop">${esc(x.message)}</p>`; }
    };
  }
  /* Conceder el plan a medida a quien lo pidió: cuota pactada, forma de pago y periodo de acceso */
  async function concederDialog(c) {
    if (!c) return;
    const st = await P.adminAuth.status().catch(() => ({}));
    const ya = users.find((u) => u.email === String(c.email).toLowerCase());
    const el = openModal(`<div class="eyebrow">Conceder acceso · plan ${esc((P.PLANES[c.plan] || P.PLANES.grupos).nombre)}</div><h2 style="font-size:1.6rem">${esc(c.nombre || c.email)}</h2>
      <p class="small muted">${esc(c.email)}${c.empresa ? ' · ' + esc(c.empresa) : ''}${c.sociedades ? ' · ' + esc(c.sociedades) + ' sociedades' : ''}. ${ya ? 'Ya tiene cuenta: se le cambia el plan y se activa el acceso.' : 'No tiene cuenta: se crea con este plan y recibe una invitación para elegir su contraseña (válida 7 días).'}</p>
      <form class="stack mt" id="cForm">
        <div class="row"><label class="small">Cuota pactada (€/mes, sin IVA)<input class="input" type="number" min="0" step="10" name="cuota" id="cCuota" placeholder="Por ejemplo, 690" required></label>
        <label class="small">Pago<select class="input" name="periodo" id="cPer"><option value="mensual">Mensual</option><option value="anual">Anual</option></select></label>
        <label class="small">Acceso durante<select class="input" name="meses" id="cMeses"><option value="1">1 mes</option><option value="3">3 meses</option><option value="6">6 meses</option><option value="12" selected>12 meses</option></select></label></div>
        <div class="row"><button class="btn solid" type="submit">Conceder acceso</button>${st.correo ? '<label class="small row"><input type="checkbox" name="enviar" id="cEnv" checked> Enviarle el aviso por correo</label>' : ''}</div>
      </form><div id="cOut" class="stack mt"></div>`);
    $('#cForm', el).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      try {
        const r = await P.admin.conceder({ email: c.email, nombre: c.nombre, empresa: c.empresa, telefono: c.telefono, plan: P.PLANES[c.plan] ? c.plan : 'grupos', cuota: +f.cuota.value, periodo: f.periodo.value, meses: +f.meses.value, enviar: !!(f.enviar && f.enviar.checked) });
        $('#cOut', el).innerHTML = `<p class="alert info">Acceso concedido hasta el ${fdate(r.user.venceAcceso)} · ${P.eur(+f.cuota.value)}/mes.${r.enviado ? ' Aviso enviado por correo.' : ''}</p>` + (r.link ? `<p class="small">Invitación para que elija su contraseña (válida 7 días). Envíesela por un canal de confianza:</p><textarea class="input" rows="3" readonly id="cLink">${esc(r.link)}</textarea><button class="btn" id="cCopy">Copiar enlace</button>` : '<p class="small">Ya tenía cuenta: entra con su correo y su contraseña de siempre.</p>');
        const cp = $('#cCopy', el); if (cp) cp.onclick = () => { const t = $('#cLink', el); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => { cp.textContent = 'Copiado'; }, () => { t.select(); }); };
        f.querySelector('button[type=submit]').disabled = true;
        load();
      } catch (x) { $('#cOut', el).innerHTML = `<p class="alert stop">${esc(x.message)}</p>`; }
    };
  }
  async function resetDialog(u) {
    const st = await P.adminAuth.status().catch(() => ({}));
    const el = openModal(`<div class="eyebrow">Recuperar contraseña</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <p class="small muted">Se genera un enlace de un solo uso, válido 60 minutos, para que ${esc(u.email)} cree una contraseña nueva. La administración nunca ve ni elige su contraseña.</p>
      <div class="row mt"><button class="btn solid" id="rGen">Generar enlace</button>${st.correo ? '<button class="btn" id="rMail">Enviar por correo</button>' : ''}</div>
      <div id="rOut" class="stack mt"></div>`);
    const show = (r) => { $('#rOut', el).innerHTML = `${r.enviado ? '<p class="alert info">Enlace enviado a su correo.</p>' : '<p class="small">Envíele este enlace por un canal de confianza (correo, WhatsApp…). Caduca en ' + r.minutos + ' minutos.</p>'}<textarea class="input" rows="3" readonly style="width:100%">${esc(r.link)}</textarea><button class="btn ghost" id="rCopy">Copiar enlace</button>`; $('#rCopy', el).onclick = () => navigator.clipboard && navigator.clipboard.writeText(r.link).then(() => { $('#rCopy', el).textContent = 'Copiado'; }); };
    $('#rGen', el).onclick = async () => { try { show(await P.admin.resetLink(u.id, false)); load(); } catch (e) { $('#rOut', el).innerHTML = `<p class="alert stop">${esc(e.message)}</p>`; } };
    const m = $('#rMail', el); if (m) m.onclick = async () => { try { show(await P.admin.resetLink(u.id, true)); load(); } catch (e) { $('#rOut', el).innerHTML = `<p class="alert stop">${esc(e.message)}</p>`; } };
  }
  function adminPwDialog() {
    const el = openModal(`<div class="eyebrow">Administración</div><h2 style="font-size:1.6rem">Cambiar la contraseña de administración</h2>
      <form class="stack mt" id="apForm"><label class="small">Contraseña actual<input class="input" type="password" name="actual" autocomplete="current-password" required></label>
      <label class="small">Nueva contraseña (mínimo 10 caracteres)<input class="input" type="password" name="nueva" minlength="10" autocomplete="new-password" required></label>
      <button class="btn solid">Guardar</button><p class="small" id="apMsg"></p></form>`);
    $('#apForm', el).onsubmit = async (e) => { e.preventDefault(); const f = e.target; try { await P.adminAuth.change(f.actual.value, f.nueva.value); $('#apMsg', el).innerHTML = '<span style="color:var(--go)">Contraseña cambiada.</span>'; f.reset(); } catch (x) { $('#apMsg', el).innerHTML = `<span style="color:var(--stop)">${esc(x.message)}</span>`; } };
  }

  /* ---------- Segundo factor de la administración (TOTP) ---------- */
  const codigosHtml = (cs) => `<p class="small"><b>Códigos de recuperación.</b> Cada uno sirve una vez para entrar si no tiene el teléfono. Guárdelos ahora en un sitio seguro (gestor de contraseñas o papel): no se volverán a mostrar.</p>
    <pre class="mono" id="rcT" style="user-select:all;white-space:pre-wrap;padding:10px;border:1px solid var(--line);border-radius:8px">${cs.map(esc).join('\n')}</pre><div class="row"><button type="button" class="btn" id="rcC">Copiar los códigos</button><button type="button" class="btn ghost" id="rcD">Descargar (.txt)</button></div>`;
  const wireCodigos = (el, cs) => {
    $('#rcC', el).onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(cs.join('\n')) : Promise.reject()).then(() => { $('#rcC', el).textContent = 'Copiados'; }, () => {});
    $('#rcD', el).onclick = () => descargar('atalaya-codigos-recuperacion.txt', 'Atalaya 360° · códigos de recuperación de la administración\r\n' + cs.join('\r\n') + '\r\n', 'text/plain');
  };
  async function seguridadDialog() {
    estado = await P.adminAuth.status().catch(() => estado);
    if (!estado.dosPasos) {
      const el = openModal(`<div class="eyebrow">Seguridad</div><h2 style="font-size:1.6rem">Segundo factor para entrar</h2>
        <p class="small muted">Además de la contraseña, se pedirá un código de 6 cifras de una aplicación de autenticación del teléfono (Google Authenticator, Microsoft Authenticator, 1Password…). Si alguien conoce la contraseña, no podrá entrar sin el teléfono.</p>
        <button class="btn solid" id="sgIni">Activar el segundo factor</button><div id="sgOut" class="stack mt"></div>`);
      $('#sgIni', el).onclick = async () => {
        try {
          const r = await api('/admin/2fa/iniciar', 'POST');
          $('#sgIni', el).hidden = true;
          $('#sgOut', el).innerHTML = `<p class="small"><b>1.</b> En la aplicación, añada una cuenta «con clave» (o «introducir clave de configuración») y escriba esta clave. Tipo: basada en tiempo.</p>
            <p class="mono" style="font-size:1.05rem;letter-spacing:.06em;user-select:all;word-break:break-all">${esc(r.secretoAgrupado)}</p>
            <details class="small"><summary>Dirección otpauth (para gestores de contraseñas que la aceptan)</summary><textarea class="input" rows="3" readonly style="width:100%">${esc(r.uri)}</textarea></details>
            <form class="stack" id="sgF"><label class="small"><b>2.</b> Escriba el código de 6 cifras que muestra la aplicación<input class="input" id="sgC" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required style="max-width:140px;letter-spacing:.2em"></label><button class="btn solid">Comprobar y activar</button><p class="small" id="sgM"></p></form>`;
          $('#sgF', el).onsubmit = async (e) => {
            e.preventDefault();
            try { const a = await api('/admin/2fa/activar', 'POST', { codigo: $('#sgC', el).value.trim() }); $('#sgOut', el).innerHTML = '<p class="alert info">Segundo factor activado. Las demás sesiones de administración se han cerrado.</p>' + codigosHtml(a.codigos); wireCodigos(el, a.codigos); estado.dosPasos = true; }
            catch (x) { msgEn($('#sgM', el), x.message); }
          };
        } catch (x) { $('#sgOut', el).innerHTML = `<p class="alert stop">${esc(x.message)}</p>`; }
      };
      return;
    }
    const el = openModal(`<div class="eyebrow">Seguridad</div><h2 style="font-size:1.6rem">Segundo factor activado</h2>
      <p class="small muted">Para entrar hacen falta la contraseña y el código del teléfono. Quedan <b>${estado.recuperacion != null ? estado.recuperacion : '—'}</b> códigos de recuperación sin usar.</p>
      <form class="stack mt" id="sgF2"><label class="small">Contraseña de administración<input class="input" type="password" id="sgP" autocomplete="current-password" required></label>
        <label class="small">Código del teléfono (o uno de recuperación)<input class="input" id="sgC2" autocomplete="one-time-code" required style="max-width:180px"></label>
        <div class="row" style="flex-wrap:wrap"><button class="btn" data-acc="recuperacion">Generar códigos de recuperación nuevos</button><button class="btn ghost" data-acc="desactivar" style="color:var(--stop)">Desactivar el segundo factor</button></div><p class="small" id="sgM2"></p></form><div id="sgOut2" class="stack"></div>`);
    let acc = null; $$('[data-acc]', el).forEach((b) => b.onclick = () => { acc = b.dataset.acc; });
    $('#sgF2', el).onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await api('/admin/2fa/' + acc, 'POST', { password: $('#sgP', el).value, codigo: $('#sgC2', el).value.trim() });
        if (acc === 'desactivar') { estado.dosPasos = false; $('#sgOut2', el).innerHTML = '<p class="alert warn">Segundo factor desactivado: para entrar basta la contraseña.</p>'; }
        else { $('#sgOut2', el).innerHTML = codigosHtml(r.codigos); wireCodigos(el, r.codigos); }
        $('#sgF2', el).hidden = true;
      } catch (x) { msgEn($('#sgM2', el), x.message); }
    };
  }

  /* ---------- CSV descargable: «;» como separador, BOM UTF-8 (Excel lee bien las tildes) y sin fórmulas ----------
     Un texto que empieza por = + - @ tabulador o retorno se prefija con ' para que la hoja de cálculo no lo ejecute. */
  const celda = (c) => {
    let s = c == null ? '' : typeof c === 'number' ? String(c).replace('.', ',') : String(c);
    if (typeof c !== 'number' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const aCsv = (filas) => '﻿' + filas.map((r) => r.map(celda).join(';')).join('\r\n') + '\r\n';
  function descargar(nombre, texto, tipo) {
    const url = URL.createObjectURL(new Blob([texto], { type: (tipo || 'text/csv') + ';charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const hoy = () => new Date().toISOString().slice(0, 10);
  function csv() {
    const head = ['nombre', 'email', 'empresa', 'telefono', 'plan', 'periodo', 'empresas', 'cuota_mes', 'estado', 'pagado', 'vence', 'prueba_hasta', 'alta', 'ultimo_acceso', 'uso_7d_min', 'uso_30d_min', 'uso_total_min', 'sesiones', 'pagos', 'cobrado_total', 'nota'];
    const rows = users.map((u) => [u.nombre, u.email, u.empresa, u.telefono, u.plan, u.periodo || 'mensual', u.empresas || 1, P.precio(u.plan, u.periodo, u.empresas, u.cuotaPactada).mes, estadoDe(u).t, u.pagado ? 'sí' : 'no', u.venceAcceso || '', u.pruebaHasta || '', u.alta, u.ultimoAcceso, P.usageMinutes(u, 7), P.usageMinutes(u, 30), P.usageMinutes(u), u.sesiones || 0, (u.pagos || []).filter((p) => !p.anulado).length, Math.round((u.pagos || []).filter((p) => !p.anulado).reduce((a, p) => a + (+p.importe || 0), 0) * 100) / 100, u.nota || '']);
    descargar(`atalaya-usuarios-${hoy()}.csv`, aCsv([head].concat(rows)));
  }

  /* ---------- Registro de actividad ---------- */
  const ACCIONES = { 'cuenta.': 'Cuentas', 'plan.': 'Planes', 'pago.': 'Pagos', 'prueba.': 'Pruebas', 'solicitud.': 'Solicitudes', 'stripe.': 'Stripe', 'admin.': 'Accesos de administración', 'dospasos.': 'Segundo factor' };
  const NOMBRE_ACC = { 'cuenta.alta': 'Alta (el cliente)', 'cuenta.crear': 'Cuenta creada', 'cuenta.modificar': 'Cuenta modificada', 'cuenta.bloquear': 'Bloqueo', 'cuenta.desbloquear': 'Desbloqueo', 'cuenta.borrar': 'Cuenta eliminada', 'cuenta.contrasena': 'Contraseña cambiada', 'cuenta.enlace-contrasena': 'Enlace de contraseña', 'plan.cambio': 'Cambio de plan', 'plan.solicitud': 'Pide cambio de plan', 'plan.conceder': 'Plan a medida concedido', 'pago.registrar': 'Pago registrado', 'pago.corregir': 'Pago corregido', 'pago.anular': 'Pago anulado', 'pago.solicitud': 'Pide activar', 'pago.checkout': 'Va a pagar con tarjeta', 'pago.stripe': 'Cobro de Stripe', 'pago.fallido': 'Cobro fallido', 'prueba.ampliar': 'Prueba ampliada', 'solicitud.cerrar': 'Solicitud cerrada', 'solicitud.reabrir': 'Solicitud reabierta', 'stripe.checkout': 'Pago con tarjeta completado', 'stripe.suscripcion': 'Suscripción actualizada', 'stripe.baja': 'Suscripción cancelada', 'admin.entrar': 'Entrada a la administración', 'admin.entrar.fallido': 'Código de segundo factor erróneo', 'admin.salir': 'Salida', 'admin.contrasena': 'Contraseña de administración cambiada', 'admin.configurar': 'Administración configurada', 'dospasos.activar': 'Segundo factor activado', 'dospasos.desactivar': 'Segundo factor desactivado', 'dospasos.recuperacion': 'Códigos de recuperación nuevos', 'dospasos.quitar': 'Segundo factor quitado' };
  const valor = (v) => (v == null ? '—' : typeof v === 'boolean' ? (v ? 'sí' : 'no') : typeof v === 'object' ? (v.importe != null ? `${v.importe} € · ${v.meses} m${v.referencia ? ' · ' + v.referencia : ''}${v.anulado ? ' · anulado' : ''}` : v.plan ? `${planN(v.plan)}${v.periodo ? ' · ' + v.periodo : ''}` : JSON.stringify(v)) : /^\d{4}-\d{2}-\d{2}T/.test(v) ? fdate(v) : String(v));
  const cambiosTxt = (a) => { const ks = Array.from(new Set(Object.keys(a.antes || {}).concat(Object.keys(a.despues || {})))); return ks.map((k) => `${k}: ${a.antes && k in a.antes ? valor(a.antes[k]) + ' → ' : ''}${valor((a.despues || {})[k])}`).join(' · '); };
  let actividad = [], actT = null;
  async function cargarActividad() {
    if (!SRV()) return;
    const qs = new URLSearchParams({ limite: '1000' });
    const q = $('#aq').value.trim(), ac = $('#aAcc').value, de = $('#aDesde').value, ha = $('#aHasta').value;
    if (q) qs.set('q', q); if (ac) qs.set('accion', ac); if (de) qs.set('desde', de); if (ha) qs.set('hasta', ha);
    try { const r = await P.api('/admin/actividad?' + qs); actividad = r.actividad || []; $('#aCnt').textContent = `Se conserva ${Math.round((r.dias || 730) / 30)} meses. Mostrando ${actividad.length}${actividad.length >= 1000 ? ' (las 1.000 más recientes: acote con los filtros)' : ''}.`; }
    catch (e) { actividad = []; $('#atable').innerHTML = `<p class="alert stop">${esc(e.message)}</p>`; return; }
    $('#atable').innerHTML = actividad.length ? `<table><thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Cuenta</th><th>Cambios</th><th>Nota</th></tr></thead><tbody>${actividad.slice(0, 300).map((a) => `<tr><td style="white-space:nowrap">${fhora(a.fecha)}</td><td>${esc(a.quien)}</td><td>${esc(NOMBRE_ACC[a.accion] || a.accion)}</td><td>${esc(a.email || '—')}</td><td class="small" style="min-width:240px;white-space:normal">${esc(cambiosTxt(a))}</td><td class="small muted">${esc(a.nota || '')}${a.ip ? `<br>IP ${esc(a.ip)}` : ''}</td></tr>`).join('')}</tbody></table>${actividad.length > 300 ? '<p class="small muted">Se ven las 300 primeras; el CSV las incluye todas.</p>' : ''}` : '<p class="muted">Sin actividad con estos filtros.</p>';
  }
  function csvActividad() {
    const head = ['fecha', 'quien', 'accion', 'descripcion', 'cuenta', 'email', 'antes', 'despues', 'nota', 'ip'];
    descargar(`atalaya-actividad-${hoy()}.csv`, aCsv([head].concat(actividad.map((a) => [a.fecha, a.quien, a.accion, NOMBRE_ACC[a.accion] || '', a.cuenta, a.email, a.antes ? JSON.stringify(a.antes) : '', a.despues ? JSON.stringify(a.despues) : '', a.nota, a.ip]))));
  }

  /* Puerta de administración: contraseña propia, que no pertenece a ninguna cuenta de usuario; con el servidor,
     nombre de quien entra (firma el registro de actividad) y segundo factor si está activado */
  async function gate() {
    const st = (estado = await P.adminAuth.status());
    if (st.sesion) return openPanel();
    $('#panel').hidden = true; $('#admBar').hidden = true; $('#gate').hidden = false;
    const card = $('#gateCard');
    if (!st.configurado) {
      card.innerHTML = `<div class="eyebrow">Administración</div><h1>Crea la contraseña <em>de administración</em></h1>
        <p class="small muted">Solo quien tenga esta contraseña podrá entrar al gestor de usuarios. No está ligada a ninguna cuenta de cliente: guárdala en un gestor de contraseñas.</p>
        ${P.mode === 'server' ? '<p class="alert info">Escriba el código de configuración que aparece en la consola del servidor al arrancarlo (o arranque el servidor con ADMIN_PASSWORD).</p>' : '<p class="alert warn">Modo demostración: la contraseña se guarda solo en este navegador.</p>'}
        <form id="gForm">${P.mode === 'server' ? '<label>Código de configuración<input class="input" name="codigo" autocomplete="off" required></label><label>Su nombre (firma lo que haga en el registro de actividad)<input class="input" name="nombre" maxlength="60" autocomplete="name"></label>' : ''}
          <label>Contraseña de administración (mínimo 10 caracteres)<input class="input" type="password" name="pw" minlength="10" autocomplete="new-password" required></label>
          <label>Repítela<input class="input" type="password" name="pw2" minlength="10" autocomplete="new-password" required></label>
          <button class="btn solid">Crear y entrar</button><p class="small" id="gMsg"></p></form>`;
      $('#gForm').onsubmit = async (e) => {
        e.preventDefault(); const f = e.target;
        if (f.pw.value !== f.pw2.value) { $('#gMsg').innerHTML = '<span style="color:var(--stop)">Las contraseñas no coinciden.</span>'; return; }
        try {
          if (P.mode === 'server') { if (f.pw.value.length < 10) throw new Error('La contraseña de administración debe tener al menos 10 caracteres.'); await P.api('/admin/configurar', { method: 'POST', body: JSON.stringify({ codigo: f.codigo.value, password: f.pw.value, nombre: f.nombre.value.trim() }) }); }
          else await P.adminAuth.setup('', f.pw.value);
          gate();
        } catch (x) { $('#gMsg').innerHTML = `<span style="color:var(--stop)">${esc(x.message)}</span>`; }
      };
    } else {
      let guardado = ''; try { guardado = localStorage.getItem('atalaya.admin.nombre') || ''; } catch (e) { /* sin almacenamiento */ }
      card.innerHTML = `<div class="eyebrow">Administración</div><h1>Gestor <em>de usuarios</em></h1>
        <p class="small muted">Acceso exclusivo con la contraseña de administración${st.dosPasos ? ' y el código de su aplicación de autenticación' : ''}.</p>
        <form id="gForm">${P.mode === 'server' ? `<label>Su nombre (firma lo que haga en el registro de actividad)<input class="input" name="nombre" maxlength="60" autocomplete="name" value="${esc(guardado)}"></label>` : ''}
          <label>Contraseña de administración<input class="input" type="password" name="pw" autocomplete="current-password" required autofocus></label>
          <label id="gCodL" ${st.dosPasos ? '' : 'hidden'}>Código de 6 cifras (o un código de recuperación)<input class="input" name="codigo" autocomplete="one-time-code" inputmode="numeric" maxlength="11" style="letter-spacing:.15em"></label>
          <button class="btn solid">Entrar</button><p class="small" id="gMsg"></p></form>
        ${P.mode === 'server' ? '<p class="small muted">¿La ha olvidado? Arranque el servidor con <span class="mono">ADMIN_PASSWORD=nueva-contraseña</span> para fijar una nueva. ¿Ha perdido el teléfono y los códigos de recuperación? Arránquelo con <span class="mono">ADMIN_2FA_RESET=una-palabra</span>.</p>' : ''}`;
      $('#gForm').onsubmit = async (e) => {
        e.preventDefault(); const f = e.target;
        try {
          if (P.mode === 'server') {
            const nombre = f.nombre.value.trim(); try { localStorage.setItem('atalaya.admin.nombre', nombre); } catch (x) { /* sin almacenamiento */ }
            const r = await P.api('/admin/login', { method: 'POST', body: JSON.stringify({ password: f.pw.value, codigo: f.codigo.value.trim(), nombre }) });
            if (r && r.recuperacion != null) alertBox2(`Ha entrado con un código de recuperación. Le quedan ${r.recuperacion}. ${r.recuperacion < 4 ? 'Genere códigos nuevos desde «Seguridad».' : ''}`);
          } else await P.adminAuth.login(f.pw.value);
          gate();
        } catch (x) {
          if (x.body && x.body.segundoFactor) { $('#gCodL').hidden = false; f.codigo.focus(); }
          $('#gMsg').innerHTML = `<span style="color:var(--stop)">${esc(x.message)}</span>`;
        }
      };
    }
  }
  let wired = false;
  function openPanel() {
    $('#gate').hidden = true; $('#panel').hidden = false; $('#admBar').hidden = false;
    if (P.mode === 'local') $('#modeNote').innerHTML = '<div class="alert info">Modo demostración: solo se ven las cuentas creadas en este navegador. Con el servidor de Atalaya (carpeta <span class="mono">server/</span>) verá a todos sus clientes, sus pagos y sus horas de uso reales, con registro de actividad, segundo factor y cobro con Stripe.</div>';
    else {
      const avisos = [];
      if (!estado.dosPasos) avisos.push('La administración entra solo con contraseña. Active el segundo factor en «Seguridad».');
      if (estado.stripe && !estado.stripe.webhook) avisos.push('Stripe está configurado sin STRIPE_WEBHOOK_SECRET: los pagos no activarán el acceso solos.');
      $('#modeNote').innerHTML = avisos.map((t) => `<div class="alert warn" style="margin-bottom:8px">${esc(t)}</div>`).join('') + `<p class="small muted" style="margin:0">${estado.nombre ? `Ha entrado como <b>${esc(estado.nombre)}</b>. ` : ''}Cobro: ${estado.stripe ? `Stripe (${estado.stripe.precios.length} precios)` : 'manual (enlaces de pago y «Registrar pago»)'} · Avisos al equipo por correo: ${estado.avisos ? 'sí' : 'no (AVISOS_EMAIL y SMTP)'}.</p>`;
    }
    $('#actBox').hidden = !SRV(); $('#nuevo').hidden = !SRV(); $('#admSeg').hidden = !SRV();
    if (!wired) {
      wired = true;
      $('#q').addEventListener('input', render); $('#fEstado').addEventListener('change', render); $('#csv').onclick = csv;
      $('#nuevo').onclick = nuevoDialog;
      $('#admPw').onclick = adminPwDialog;
      $('#admSeg').onclick = seguridadDialog;
      $('#admOut').onclick = async () => { await P.adminAuth.logout(); gate(); };
      const recargar = () => { clearTimeout(actT); actT = setTimeout(cargarActividad, 300); };
      $('#aq').addEventListener('input', recargar); ['#aAcc', '#aDesde', '#aHasta'].forEach((s) => $(s).addEventListener('change', cargarActividad));
      $('#aAcc').innerHTML = '<option value="">Todas las acciones</option>' + Object.entries(ACCIONES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
      $('#aCsv').onclick = csvActividad;
    }
    load();
  }

  (async function start() {
    A.sky();
    await P.ready;
    gate();
  })();
})();
