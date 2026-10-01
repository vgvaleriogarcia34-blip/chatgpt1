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
    if (u.rol === 'admin') return { k: 'admin', t: 'Administración', st: 'ok' };
    if (acc.motivo === 'pagado') return { k: 'activo', t: 'Pagando', st: 'ok' };
    if (acc.motivo === 'prueba') return { k: 'prueba', t: `Prueba · ${acc.diasPrueba} d`, st: 'warn' };
    return { k: 'vencido', t: u.pagado ? 'Plan vencido' : 'Prueba terminada', st: 'stop' };
  }

  async function load() {
    try { users = await P.admin.list(); } catch (e) { $('#utable').innerHTML = `<p class="alert stop">${esc(e.message)}</p>`; return; }
    render();
  }
  function render() {
    const now = Date.now();
    const est = users.map((u) => ({ u, e: estadoDe(u) }));
    const pagando = est.filter((x) => x.e.k === 'activo');
    const mrr = pagando.reduce((a, x) => a + ((P.PLANES[x.u.plan] || {}).precio || 0), 0);
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
    users.filter((u) => u.solicitudPago && !u.pagado).forEach((u) => pend.push(`<li><b>${esc(u.nombre || u.email)}</b> pidió activar el plan ${esc((P.PLANES[u.plan] || {}).nombre || u.plan)} el ${fdate(u.solicitudPago)}.</li>`));
    est.filter((x) => x.e.k === 'prueba' && P.accessOf(x.u).diasPrueba <= 3).forEach((x) => pend.push(`<li>La prueba de <b>${esc(x.u.nombre || x.u.email)}</b> termina en ${P.accessOf(x.u).diasPrueba} días.</li>`));
    users.filter((u) => u.pagado && u.venceAcceso && new Date(u.venceAcceso).getTime() - now < 7 * 864e5 && new Date(u.venceAcceso).getTime() > now).forEach((u) => pend.push(`<li>El plan de <b>${esc(u.nombre || u.email)}</b> vence el ${fdate(u.venceAcceso)}.</li>`));
    $('#pending').innerHTML = pend.length ? `<ul>${pend.join('')}</ul>` : '<p class="muted">Nada pendiente.</p>';

    // Tabla
    const q = ($('#q').value || '').toLowerCase(), fe = $('#fEstado').value;
    const rows = est.filter((x) => (!q || `${x.u.nombre} ${x.u.email} ${x.u.empresa}`.toLowerCase().includes(q)) && (!fe || x.e.k === fe));
    $('#utable').innerHTML = rows.length ? `<table><thead><tr><th>Usuario</th><th>Empresa</th><th>Plan</th><th>Estado</th><th>Vence</th><th>Alta</th><th>Último acceso</th><th>Uso 7 d</th><th>Uso 30 d</th><th>Uso total</th><th>Sesiones</th><th></th></tr></thead><tbody>` +
      rows.map(({ u, e }) => `<tr data-id="${u.id}"><td><b>${esc(u.nombre || '—')}</b><br><span class="muted">${esc(u.email)}</span></td><td>${esc(u.empresa || '—')}</td>
        <td><select data-plan>${Object.keys(P.PLANES).map((k) => `<option value="${k}" ${k === u.plan ? 'selected' : ''}>${P.PLANES[k].nombre}</option>`).join('')}</select></td>
        <td><span class="state st-${e.st}">${e.t}</span></td><td>${u.pagado ? fdate(u.venceAcceso) : '—'}</td><td>${fdate(u.alta)}</td><td>${fdate(u.ultimoAcceso)}</td>
        <td>${hm(P.usageMinutes(u, 7))}</td><td>${hm(P.usageMinutes(u, 30))}</td><td>${hm(P.usageMinutes(u))}</td><td>${u.sesiones || 0}</td>
        <td><div class="uactions"><button class="btn" data-pay>Registrar pago</button>${u.estado === 'bloqueado' ? '<button class="btn ghost" data-unblock>Desbloquear</button>' : '<button class="btn ghost" data-block>Bloquear</button>'}<button class="btn ghost" data-more>Ficha</button></div></td></tr>`).join('') + '</tbody></table>'
      : '<p class="muted">No hay usuarios con ese filtro.</p>';
    $$('#utable tr[data-id]').forEach((tr) => {
      const id = tr.dataset.id, u = users.find((x) => x.id === id);
      $('[data-plan]', tr).onchange = (ev) => upd(id, { plan: ev.target.value });
      $('[data-pay]', tr).onclick = () => payDialog(u);
      const bl = $('[data-block]', tr); if (bl) bl.onclick = () => upd(id, { estado: 'bloqueado' });
      const ub = $('[data-unblock]', tr); if (ub) ub.onclick = () => upd(id, { estado: u.pagado ? 'activo' : 'prueba' });
      $('[data-more]', tr).onclick = () => ficha(u);
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
    const base = u.venceAcceso && new Date(u.venceAcceso).getTime() > Date.now() ? new Date(u.venceAcceso) : new Date();
    const el = openModal(`<div class="eyebrow">Registrar pago</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <p class="small muted">Plan ${pl.nombre} · ${pl.precio} €/mes. El acceso se amplía desde ${fdate(base)}.</p>
      <div class="stack mt">
        <label class="small">Periodo<select id="pPer" class="input"><option value="1">1 mes</option><option value="3">3 meses</option><option value="12">12 meses</option></select></label>
        <label class="small">Importe cobrado (€)<input class="input" id="pImp" value="${pl.precio}"></label>
        <label class="small">Método y referencia<input class="input" id="pRef" placeholder="Transferencia, tarjeta, recibo…"></label>
        <button class="btn solid" id="pOk">Registrar y activar</button>
      </div>`);
    $('#pPer', el).onchange = (e) => { $('#pImp', el).value = pl.precio * +e.target.value; };
    $('#pOk', el).onclick = async () => {
      const meses = +$('#pPer', el).value; const v = new Date(base); v.setMonth(v.getMonth() + meses);
      await upd(u.id, { pagado: true, estado: 'activo', venceAcceso: v.toISOString(), registrarPago: { importe: parseFloat(String($('#pImp', el).value).replace(',', '.')) || 0, meses, referencia: $('#pRef', el).value } });
      modal.hidden = true;
    };
  }
  function ficha(u) {
    const dias = Object.keys(u.uso || {}).sort().slice(-14);
    const el = openModal(`<div class="eyebrow">Ficha de usuario</div><h2 style="font-size:1.6rem">${esc(u.nombre || u.email)}</h2>
      <div class="mgrid mt"><div><span>Correo</span><b style="font-size:.85rem">${esc(u.email)}</b></div><div><span>Teléfono</span><b>${esc(u.telefono || '—')}</b></div><div><span>Empresa</span><b>${esc(u.empresa || '—')}</b></div><div><span>Rol</span><b>${u.rol === 'admin' ? 'Administración' : 'Cliente'}</b></div></div>
      <h4 class="mt">Pagos</h4>${(u.pagos || []).length ? `<table><thead><tr><th>Fecha</th><th>Importe</th><th>Meses</th><th>Referencia</th></tr></thead><tbody>${u.pagos.map((p) => `<tr><td>${fdate(p.fecha)}</td><td>${F.eurFull(p.importe)}</td><td>${p.meses}</td><td>${esc(p.referencia || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Sin pagos registrados.</p>'}
      <h4 class="mt">Uso de los últimos días</h4>${dias.length ? `<table><tbody>${dias.map((d) => `<tr><td>${fdate(d)}</td><td>${hm(u.uso[d])}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Sin uso registrado.</p>'}
      <h4 class="mt">Nota interna</h4><textarea class="input" id="fNota" rows="3" style="width:100%">${esc(u.nota || '')}</textarea>
      <div class="row mt"><button class="btn" id="fSave">Guardar nota</button><button class="btn ghost" id="fAdmin">${u.rol === 'admin' ? 'Quitar administración' : 'Hacer administrador'}</button><span class="spacer"></span><button class="btn ghost" id="fDel" style="color:var(--stop)">Eliminar cuenta</button></div><p class="small" id="fMsg"></p>`);
    $('#fSave', el).onclick = () => upd(u.id, { nota: $('#fNota', el).value }).then(() => { modal.hidden = true; });
    $('#fAdmin', el).onclick = () => upd(u.id, { rol: u.rol === 'admin' ? 'cliente' : 'admin' }).then(() => { modal.hidden = true; });
    let armed = false;
    $('#fDel', el).onclick = async () => {
      if (!armed) { armed = true; $('#fMsg', el).textContent = 'Pulsa otra vez para eliminar definitivamente la cuenta y sus datos.'; $('#fDel', el).textContent = 'Confirmar eliminación'; return; }
      try { await P.admin.remove(u.id); modal.hidden = true; load(); } catch (e) { $('#fMsg', el).textContent = e.message; }
    };
  }
  function csv() {
    const head = ['nombre', 'email', 'empresa', 'telefono', 'plan', 'estado', 'pagado', 'vence', 'alta', 'ultimo_acceso', 'uso_7d_min', 'uso_30d_min', 'uso_total_min', 'sesiones'];
    const rows = users.map((u) => [u.nombre, u.email, u.empresa, u.telefono, u.plan, estadoDe(u).t, u.pagado ? 'sí' : 'no', u.venceAcceso || '', u.alta, u.ultimoAcceso, P.usageMinutes(u, 7), P.usageMinutes(u, 30), P.usageMinutes(u), u.sesiones || 0]);
    const txt = [head].concat(rows).map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(';')).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => alertBox2('CSV copiado: pégalo en Excel.'), () => openModal(`<textarea class="input" rows="12" style="width:100%">${esc(txt)}</textarea>`));
  }
  function alertBox2(t) { openModal(`<p class="alert info">${esc(t)}</p>`); }

  (async function start() {
    A.sky();
    const ok = await P.guard(); if (!ok) return;
    if (!P.user || P.user.rol !== 'admin') { document.querySelector('.admin-main').innerHTML = '<div class="glass pad"><h2>Solo para administración</h2><p class="muted">Tu cuenta no tiene permisos para gestionar usuarios.</p><a class="btn" href="app.html">Ir al simulador</a></div>'; return; }
    P.mountAccount($('#account'));
    if (P.mode === 'local') $('#modeNote').innerHTML = '<div class="alert info">Modo demostración: solo ves las cuentas creadas en este navegador. Con el servidor de Atalaya (carpeta <span class="mono">server/</span>) verás a todos tus clientes, sus pagos y sus horas de uso reales.</div>';
    $('#q').addEventListener('input', render); $('#fEstado').addEventListener('change', render); $('#csv').onclick = csv;
    load();
  })();
})();
