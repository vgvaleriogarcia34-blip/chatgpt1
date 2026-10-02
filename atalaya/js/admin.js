/* Atalaya · Gestor de usuarios: acceso, pagos y horas de uso */
(function () {
  const A = window.Atalaya, P = A.platform, F = A.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const hm = (min) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
  const fdate = (d) => (d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  let users = [];

  function estadoDe(u) {
    if (u.estado === 'bloqueado') return { k: 'bloqueado', t: 'Bloqueado', st: 'stop' };
    const acc = P.accessOf(u);
    if (acc.motivo === 'pagado') return { k: 'activo', t: 'Pagando', st: 'ok' };
    if (acc.motivo === 'prueba') return { k: 'prueba', t: `Prueba · ${acc.diasPrueba} d`, st: 'warn' };
    return { k: 'vencido', t: u.pagado ? 'Plan vencido' : 'Prueba terminada', st: 'stop' };
  }

  async function load() {
    try { users = await P.admin.list(); } catch (e) { if (/administraci/i.test(e.message)) return gate(); $('#utable').innerHTML = `<p class="alert stop">${esc(e.message)}</p>`; return; }
    render();
  }
  function render() {
    const now = Date.now();
    const est = users.map((u) => ({ u, e: estadoDe(u) }));
    const pagando = est.filter((x) => x.e.k === 'activo');
    const mrr = pagando.reduce((a, x) => a + P.precio(x.u.plan, x.u.periodo, x.u.empresas).mes, 0); // ingreso mensual equivalente (los anuales, a su precio con descuento)
    const uso30 = users.reduce((a, u) => a + P.usageMinutes(u, 30), 0);
    const activos7 = users.filter((u) => u.ultimoAcceso && now - new Date(u.ultimoAcceso).getTime() < 7 * 864e5).length;
    $('#akpis').innerHTML = [
      ['Usuarios', users.length, 'cuentas creadas'],
      ['Pagando', pagando.length, 'acceso de pago vigente'],
      ['En prueba', est.filter((x) => x.e.k === 'prueba').length, 'dentro de los 14 días'],
      ['Sin acceso', est.filter((x) => x.e.k === 'vencido' || x.e.k === 'bloqueado').length, 'vencidos, impagados o bloqueados'],
      ['Ingreso mensual', F.eur(mrr), 'suma de planes pagando'],
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

    // Pendientes
    const pend = [];
    users.filter((u) => u.solicitudReset).forEach((u) => pend.push(`<li><b>${esc(u.nombre || u.email)}</b> ha olvidado su contraseña (${fdate(u.solicitudReset)}). <button class="btn ghost" data-pwset="${u.id}" style="padding:3px 8px;font-size:.75rem">Cambiar contraseña</button> <button class="btn ghost" data-reset="${u.id}" style="padding:3px 8px;font-size:.75rem">Generar enlace</button></li>`));
    // Cambios de plan hechos por el cliente en el último mes (para ajustar la cuota en el siguiente cobro)
    users.forEach((u) => (u.cambiosPlan || []).filter((c) => Date.now() - new Date(c.fecha).getTime() < 31 * 864e5).forEach((c) => pend.push(`<li><b>${esc(u.nombre || u.email)}</b> cambió de ${esc((P.PLANES[c.de] || {}).nombre || c.de)} a ${esc((P.PLANES[c.a] || {}).nombre || c.a)} el ${fdate(c.fecha)}${u.pagado ? ': ajusta la cuota en el siguiente cobro' : ' (en prueba)'}.</li>`)));
    users.filter((u) => u.solicitudPago && !u.pagado).forEach((u) => pend.push(`<li><b>${esc(u.nombre || u.email)}</b> pidió activar el plan ${esc((P.PLANES[u.plan] || {}).nombre || u.plan)} el ${fdate(u.solicitudPago)}.</li>`));
    est.filter((x) => x.e.k === 'prueba' && P.accessOf(x.u).diasPrueba <= 3).forEach((x) => pend.push(`<li>La prueba de <b>${esc(x.u.nombre || x.u.email)}</b> termina en ${P.accessOf(x.u).diasPrueba} días.</li>`));
    users.filter((u) => u.pagado && u.venceAcceso && new Date(u.venceAcceso).getTime() - now < 7 * 864e5 && new Date(u.venceAcceso).getTime() > now).forEach((u) => pend.push(`<li>El plan de <b>${esc(u.nombre || u.email)}</b> vence el ${fdate(u.venceAcceso)}.</li>`));
    $('#pending').innerHTML = pend.length ? `<ul>${pend.join('')}</ul>` : '<p class="muted">Nada pendiente.</p>';
    $$('#pending [data-reset]').forEach((b) => b.onclick = () => resetDialog(users.find((x) => x.id === b.dataset.reset)));
    $$('#pending [data-pwset]').forEach((b) => b.onclick = () => pwDialog(users.find((x) => x.id === b.dataset.pwset)));

    // Tabla
    const q = ($('#q').value || '').toLowerCase(), fe = $('#fEstado').value;
    const rows = est.filter((x) => (!q || `${x.u.nombre} ${x.u.email} ${x.u.empresa}`.toLowerCase().includes(q)) && (!fe || x.e.k === fe));
    $('#utable').innerHTML = rows.length ? `<table><thead><tr><th>Usuario</th><th>Empresa</th><th>Plan</th><th>Pago</th><th>Empresas</th><th>Cuota</th><th>Estado</th><th>Vence</th><th>Alta</th><th>Último acceso</th><th>Uso 7 d</th><th>Uso 30 d</th><th>Uso total</th><th>Sesiones</th><th></th></tr></thead><tbody>` +
      rows.map(({ u, e }) => `<tr data-id="${u.id}"><td><b>${esc(u.nombre || '—')}</b><br><span class="muted">${esc(u.email)}</span></td><td>${esc(u.empresa || '—')}</td>
        <td><select data-plan>${Object.keys(P.PLANES).map((k) => `<option value="${k}" ${k === u.plan ? 'selected' : ''}>${P.PLANES[k].nombre}</option>`).join('')}</select></td>
        <td><select data-per><option value="mensual" ${u.periodo !== 'anual' ? 'selected' : ''}>Mensual</option><option value="anual" ${u.periodo === 'anual' ? 'selected' : ''}>Anual −30 %</option></select></td>
        <td>${u.empresas || 1}${isFinite((P.PLANES[u.plan] || {}).empresas) ? ' / ' + P.PLANES[u.plan].empresas : ''}</td>
        <td>${(() => { const pr = P.precio(u.plan, u.periodo, u.empresas); return pr.periodo === 'anual' ? `${P.eur(pr.total)}/año<br><span class="muted">anual, −30 %</span>` : `${P.eur(pr.mes)}/mes`; })()}</td>
        <td><span class="state st-${e.st}">${e.t}</span></td><td>${u.pagado ? fdate(u.venceAcceso) : '—'}</td><td>${fdate(u.alta)}</td><td>${fdate(u.ultimoAcceso)}</td>
        <td>${hm(P.usageMinutes(u, 7))}</td><td>${hm(P.usageMinutes(u, 30))}</td><td>${hm(P.usageMinutes(u))}</td><td>${u.sesiones || 0}</td>
        <td><div class="uactions"><button class="btn" data-pay>Registrar pago</button>${u.estado === 'bloqueado' ? '<button class="btn ghost" data-unblock>Desbloquear</button>' : '<button class="btn ghost" data-block>Bloquear</button>'}<button class="btn ghost" data-pwrow>Contraseña</button><button class="btn ghost" data-more>Ficha</button></div></td></tr>`).join('') + '</tbody></table>'
      : '<p class="muted">No hay usuarios con ese filtro.</p>';
    $$('#utable tr[data-id]').forEach((tr) => {
      const id = tr.dataset.id, u = users.find((x) => x.id === id);
      $('[data-plan]', tr).onchange = (ev) => upd(id, { plan: ev.target.value });
      $('[data-per]', tr).onchange = (ev) => upd(id, { periodo: ev.target.value });
      $('[data-pay]', tr).onclick = () => payDialog(u);
      const bl = $('[data-block]', tr); if (bl) bl.onclick = () => upd(id, { estado: 'bloqueado' });
      const ub = $('[data-unblock]', tr); if (ub) ub.onclick = () => upd(id, { estado: u.pagado ? 'activo' : 'prueba' });
      $('[data-more]', tr).onclick = () => ficha(u);
      $('[data-pwrow]', tr).onclick = () => pwDialog(u);
    });
  }
  async function upd(id, patch) {
    try { await P.admin.update(id, patch); await load(); } catch (e) { alertBox(e.message); }
  }
  const modal = $('#modal'), body = $('#modalBody');
  function openModal(html) { body.innerHTML = `<button class="icon-btn close" aria-label="Cerrar">×</button>${html}`; modal.hidden = false; $('.close', body).onclick = () => { modal.hidden = true; }; return body; }
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
  function alertBox(t) { openModal(`<p class="alert stop">${esc(t)}</p>`); }
  function payDialog(u) {
    const pl = P.PLANES[u.plan] || P.PLANES.profesional;
    const pr = P.precio(u.plan, u.periodo, u.empresas);
    const base = u.venceAcceso && new Date(u.venceAcceso).getTime() > Date.now() ? new Date(u.venceAcceso) : new Date();
    const el = openModal(`<div class="eyebrow">Registrar pago</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <p class="small muted">Plan ${pl.nombre}${pr.tramo ? ' · ' + pr.tramo.n.toLowerCase() : ''} · ${pr.periodo === 'anual' ? `cuota anual: ${P.eur(pr.total)} (12 × ${P.eur(pr.base)} − 30 %)` : `${P.eur(pr.mes)}/mes`}. El acceso se amplía desde ${fdate(base)}.</p>
      <div class="stack mt">
        <label class="small">Periodo<select id="pPer" class="input"><option value="1" ${pr.periodo !== 'anual' ? 'selected' : ''}>1 mes</option><option value="3">3 meses</option><option value="12" ${pr.periodo === 'anual' ? 'selected' : ''}>12 meses</option></select></label>
        <label class="small">Importe cobrado (€)<input class="input" id="pImp" value="${pr.periodo === 'anual' ? pr.total : pr.mes}"></label>
        <label class="small">Método y referencia<input class="input" id="pRef" placeholder="Transferencia, tarjeta, recibo…"></label>
        <button class="btn solid" id="pOk">Registrar y activar</button>
      </div>`);
    $('#pPer', el).onchange = (e) => { const m = +e.target.value; $('#pImp', el).value = m === 12 && pr.periodo === 'anual' ? pr.total : Math.round(pr.mes * m * 100) / 100; };
    $('#pOk', el).onclick = async () => {
      const meses = +$('#pPer', el).value; const v = new Date(base); v.setMonth(v.getMonth() + meses);
      await upd(u.id, { pagado: true, estado: 'activo', venceAcceso: v.toISOString(), registrarPago: { importe: parseFloat(String($('#pImp', el).value).replace(',', '.')) || 0, meses, referencia: $('#pRef', el).value } });
      modal.hidden = true;
    };
  }
  function ficha(u) {
    const dias = Object.keys(u.uso || {}).sort().slice(-14);
    const el = openModal(`<div class="eyebrow">Ficha de usuario</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <div class="mgrid mt"><div><span>Correo</span><b style="font-size:.85rem">${esc(u.email)}</b></div><div><span>Teléfono</span><b>${esc(u.telefono || '—')}</b></div><div><span>Empresa</span><b>${esc(u.empresa || '—')}</b></div><div><span>Estado</span><b>${estadoDe(u).t}</b></div></div>
      <h4 class="mt">Pagos</h4>${(u.pagos || []).length ? `<table><thead><tr><th>Fecha</th><th>Importe</th><th>Meses</th><th>Referencia</th></tr></thead><tbody>${u.pagos.map((p) => `<tr><td>${fdate(p.fecha)}</td><td>${F.eurFull(p.importe)}</td><td>${p.meses}</td><td>${esc(p.referencia || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Sin pagos registrados.</p>'}
      <h4 class="mt">Uso de los últimos días</h4>${dias.length ? `<table><tbody>${dias.map((d) => `<tr><td>${fdate(d)}</td><td>${hm(u.uso[d])}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Sin uso registrado.</p>'}
      <h4 class="mt">Nota interna</h4><textarea class="input" id="fNota" rows="3" style="width:100%">${esc(u.nota || '')}</textarea>
      <div class="row mt"><button class="btn" id="fSave">Guardar nota</button><button class="btn" id="fPw">Cambiar contraseña</button><button class="btn ghost" id="fReset">Enviar enlace de recuperación</button><span class="spacer"></span><button class="btn ghost" id="fDel" style="color:var(--stop)">Eliminar cuenta</button></div><p class="small" id="fMsg"></p>`);
    $('#fSave', el).onclick = () => upd(u.id, { nota: $('#fNota', el).value }).then(() => { modal.hidden = true; });
    $('#fReset', el).onclick = () => resetDialog(u);
    $('#fPw', el).onclick = () => pwDialog(u);
    let armed = false;
    $('#fDel', el).onclick = async () => {
      if (!armed) { armed = true; $('#fMsg', el).textContent = 'Pulsa otra vez para eliminar definitivamente la cuenta y sus datos.'; $('#fDel', el).textContent = 'Confirmar eliminación'; return; }
      try { await P.admin.remove(u.id); modal.hidden = true; load(); } catch (e) { $('#fMsg', el).textContent = e.message; }
    };
  }
  function pwDialog(u) {
    const gen = () => { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint32Array(12)); return Array.from(r, (x) => c[x % c.length]).join(''); };
    const el = openModal(`<div class="eyebrow">Cambiar contraseña</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <p class="small muted">Escribe una contraseña nueva para ${esc(u.email)} o genera una segura. Al guardarla se cierran las sesiones que tenga abiertas; dásela por un canal de confianza y pídele que la cambie desde su menú («Cambiar contraseña»).</p>
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
  async function resetDialog(u) {
    const st = await P.adminAuth.status().catch(() => ({}));
    const el = openModal(`<div class="eyebrow">Recuperar contraseña</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <p class="small muted">Genera un enlace de un solo uso, válido 60 minutos, para que ${esc(u.email)} cree una contraseña nueva. Tú nunca ves ni eliges su contraseña.</p>
      <div class="row mt"><button class="btn solid" id="rGen">Generar enlace</button>${st.correo ? '<button class="btn" id="rMail">Enviar por correo</button>' : ''}</div>
      <div id="rOut" class="stack mt"></div>`);
    const show = (r) => { $('#rOut', el).innerHTML = `${r.enviado ? '<p class="alert info">Enlace enviado a su correo.</p>' : '<p class="small">Envíale este enlace por un canal de confianza (correo, WhatsApp…). Caduca en ' + r.minutos + ' minutos.</p>'}<textarea class="input" rows="3" readonly style="width:100%">${esc(r.link)}</textarea><button class="btn ghost" id="rCopy">Copiar enlace</button>`; $('#rCopy', el).onclick = () => navigator.clipboard && navigator.clipboard.writeText(r.link).then(() => { $('#rCopy', el).textContent = 'Copiado'; }); };
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
  function csv() {
    const head = ['nombre', 'email', 'empresa', 'telefono', 'plan', 'periodo', 'empresas', 'cuota_mes', 'estado', 'pagado', 'vence', 'alta', 'ultimo_acceso', 'uso_7d_min', 'uso_30d_min', 'uso_total_min', 'sesiones'];
    const rows = users.map((u) => [u.nombre, u.email, u.empresa, u.telefono, u.plan, u.periodo || 'mensual', u.empresas || 1, P.precio(u.plan, u.periodo, u.empresas).mes, estadoDe(u).t, u.pagado ? 'sí' : 'no', u.venceAcceso || '', u.alta, u.ultimoAcceso, P.usageMinutes(u, 7), P.usageMinutes(u, 30), P.usageMinutes(u), u.sesiones || 0]);
    const txt = [head].concat(rows).map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(';')).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => alertBox2('CSV copiado: pégalo en Excel.'), () => openModal(`<textarea class="input" rows="12" style="width:100%">${esc(txt)}</textarea>`));
  }
  function alertBox2(t) { openModal(`<p class="alert info">${esc(t)}</p>`); }

  /* Puerta de administración: contraseña propia, que no pertenece a ninguna cuenta de usuario */
  async function gate() {
    const st = await P.adminAuth.status();
    if (st.sesion) return openPanel();
    $('#panel').hidden = true; $('#admBar').hidden = true; $('#gate').hidden = false;
    const card = $('#gateCard');
    if (!st.configurado) {
      card.innerHTML = `<div class="eyebrow">Administración</div><h1>Crea la contraseña <em>de administración</em></h1>
        <p class="small muted">Solo quien tenga esta contraseña podrá entrar al gestor de usuarios. No está ligada a ninguna cuenta de cliente: guárdala en un gestor de contraseñas.</p>
        ${P.mode === 'server' ? '<p class="alert info">Escribe el código de configuración que aparece en la consola del servidor al arrancarlo (o arranca el servidor con ADMIN_PASSWORD).</p>' : '<p class="alert warn">Modo demostración: la contraseña se guarda solo en este navegador.</p>'}
        <form id="gForm">${P.mode === 'server' ? '<label>Código de configuración<input class="input" name="codigo" autocomplete="off" required></label>' : ''}
          <label>Contraseña de administración (mínimo 10 caracteres)<input class="input" type="password" name="pw" minlength="10" autocomplete="new-password" required></label>
          <label>Repítela<input class="input" type="password" name="pw2" minlength="10" autocomplete="new-password" required></label>
          <button class="btn solid">Crear y entrar</button><p class="small" id="gMsg"></p></form>`;
      $('#gForm').onsubmit = async (e) => {
        e.preventDefault(); const f = e.target;
        if (f.pw.value !== f.pw2.value) { $('#gMsg').innerHTML = '<span style="color:var(--stop)">Las contraseñas no coinciden.</span>'; return; }
        try { await P.adminAuth.setup(f.codigo ? f.codigo.value : '', f.pw.value); gate(); } catch (x) { $('#gMsg').innerHTML = `<span style="color:var(--stop)">${esc(x.message)}</span>`; }
      };
    } else {
      card.innerHTML = `<div class="eyebrow">Administración</div><h1>Gestor <em>de usuarios</em></h1>
        <p class="small muted">Acceso exclusivo con la contraseña de administración.</p>
        <form id="gForm"><label>Contraseña de administración<input class="input" type="password" name="pw" autocomplete="current-password" required autofocus></label>
          <button class="btn solid">Entrar</button><p class="small" id="gMsg"></p></form>
        ${P.mode === 'server' ? '<p class="small muted">¿La has olvidado? Arranca el servidor con <span class="mono">ADMIN_PASSWORD=nueva-contraseña</span> para fijar una nueva.</p>' : ''}`;
      $('#gForm').onsubmit = async (e) => { e.preventDefault(); try { await P.adminAuth.login(e.target.pw.value); gate(); } catch (x) { $('#gMsg').innerHTML = `<span style="color:var(--stop)">${esc(x.message)}</span>`; } };
    }
  }
  let wired = false;
  function openPanel() {
    $('#gate').hidden = true; $('#panel').hidden = false; $('#admBar').hidden = false;
    if (P.mode === 'local') $('#modeNote').innerHTML = '<div class="alert info">Modo demostración: solo ves las cuentas creadas en este navegador. Con el servidor de Atalaya (carpeta <span class="mono">server/</span>) verás a todos tus clientes, sus pagos y sus horas de uso reales.</div>';
    if (!wired) {
      wired = true;
      $('#q').addEventListener('input', render); $('#fEstado').addEventListener('change', render); $('#csv').onclick = csv;
      $('#admPw').onclick = adminPwDialog;
      $('#admOut').onclick = async () => { await P.adminAuth.logout(); gate(); };
    }
    load();
  }

  (async function start() {
    A.sky();
    await P.ready;
    gate();
  })();
})();
