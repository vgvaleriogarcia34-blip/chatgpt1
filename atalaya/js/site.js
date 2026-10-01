/* Atalaya · Página comercial: demo en vivo y planes */
(function () {
  // Acceso oculto a la administración: dirección de la página terminada en #admin (no hay enlace visible)
  const goAdmin = () => { if (location.hash === '#admin') location.replace('admin.html'); };
  goAdmin(); addEventListener('hashchange', goAdmin);
  const A = window.Atalaya, F = A.fmt;
  const $ = (s) => document.querySelector(s);
  A.sky();

  // Demo en vivo con el mismo motor del simulador
  const base = A.defaultState();
  const stName = { go: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  function demo() {
    const s = A.clone(base);
    s.inversion.importe = +$('#dInv').value;
    s.inversion.pctFin = +$('#dFin').value;
    s.inversion.incVentas = +$('#dVen').value;
    $('#dInvV').textContent = F.eur(s.inversion.importe);
    $('#dFinV').textContent = s.inversion.pctFin + ' %';
    $('#dVenV').textContent = '+' + s.inversion.incVentas + ' %';
    ['dInv', 'dFin', 'dVen'].forEach((id) => { const r = $('#' + id); r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%'); });
    const r = A.analyze(s, A.scenarioMods(s, 'base'));
    const pes = A.analyze(s, A.scenarioMods(s, 'pesimista'));
    const v = r.verdict;
    $('#demoOut').innerHTML = `<div class="verdict-pill v-${v.key}" style="width:fit-content"><span class="dot"></span>${v.titulo}</div>
      <div class="bar">${r.lights.map((l) => `<span title="${l.nombre}: ${l.valor}" style="background:${A.stateColor(l.estado)};opacity:${l.estado === 'ok' ? 0.55 : 0.95}"></span>`).join('')}</div>
      <div class="mgrid">
        <div><span>Liquidez mínima</span><b style="color:${r.cajaRef < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(r.cajaRef)}</b></div>
        <div><span>Cuota mensual</span><b>${F.eur(r.cuotaNueva)}</b></div>
        <div><span>Recuperación</span><b>${F.months(r.payback)}</b></div>
        <div><span>Si sale peor</span><b style="color:${pes.cajaRef < 0 ? 'var(--stop)' : 'inherit'}">${F.eur(pes.cajaRef)}</b></div>
      </div>
      <p class="small muted" style="margin:0">«Si sale peor» es el escenario pesimista: 70 % de la venta, tres meses tarde. En Atalaya ves los cinco escenarios, el 3D y el plan para ponerlo todo en verde.</p>`;
  }
  ['dInv', 'dFin', 'dVen'].forEach((id) => $('#' + id).addEventListener('input', demo));
  demo();

  // Planes
  const P = A.platform.PLANES;
  $('#plans').innerHTML = Object.keys(P).map((k) => `<article class="glass plan ${P[k].destacado ? 'top' : ''}">
    ${P[k].destacado ? '<span class="tag">El más elegido</span>' : ''}
    <h3>${P[k].nombre}</h3><div class="price"><b>${P[k].precio} €</b><span>/${P[k].periodo}</span></div>
    <ul>${P[k].incluye.map((x) => `<li>${x}</li>`).join('')}</ul>
    <a class="btn ${P[k].destacado ? 'solid' : ''}" href="acceso.html#alta-${k}">Probar ${P[k].nombre}</a></article>`).join('');

  // Si ya hay sesión, el botón «Entrar» lleva directo a la aplicación
  A.platform.me().then((u) => { if (u) document.querySelectorAll('a[href="acceso.html"]').forEach((a) => { a.href = 'app.html'; a.textContent = 'Abrir Atalaya'; }); });
})();
