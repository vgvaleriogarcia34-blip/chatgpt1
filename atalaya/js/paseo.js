/* Atalaya 360° · Paseo virtual
   Un recorrido guiado por todos los mundos con la empresa modelo (Valdenorte). Se activa a petición desde el mapa
   (puesto de mando o mapa de empresas). En cada parada: qué hace ese mundo y qué beneficio le da a la empresa, con sus cifras.
   El paseo pasa de una página a otra: su estado vive en la sesión del navegador y cada página lo retoma al cargarse.
   Durante el paseo la empresa modelo se enseña con todos los mundos conectados; al salir se vuelve a la empresa y a las
   conexiones que había. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const KEY = 'atalaya.paseo';
  const SS = {
    get() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
    del() { try { sessionStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ } }
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const miles = (x) => Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const eur = (x) => miles(Math.round(x / 1000) * 1000) + ' €';
  const meur = (x) => String(Math.round(x / 1e5) / 10).replace('.', ',') + ' M€';
  const pc = (x) => String(x).replace('.', ',') + ' %';
  const K = () => (A.modelo && A.modelo.cifras ? A.modelo.cifras() : null);

  /* ---------- Paradas ---------- */
  const PASOS = [
    { p: 'portal.html', m: 'Puesto de mando', t: 'Valdenorte, la empresa modelo',
      que: 'Atalaya reúne cuatro mundos (simulador, sistema estratégico, personas y auditoría) más la mesa de trabajo y el libro corporativo. Todos leen los mismos datos: lo que mide uno lo usan los demás.',
      ben: (k) => `Valdenorte fabrica y monta estructuras metálicas desde 1996: ${k.plantilla} personas y ${meur(k.ventas)} de ventas, que crecen un ${pc(k.cagr)} al año. Y aun así, cada año tiene menos caja. Vamos a ver qué descubre cada mundo.` },
    { p: 'app.html', h: 'historia', m: 'Simulador de inversión', t: 'Cinco años de cuentas, leídos de un vistazo',
      que: 'Lee los balances y las cuentas de resultados de varios años y calcula crecimiento, márgenes, EBITDA y días de cobro, de pago y de stock.',
      ben: (k) => `Las ventas pasan de ${meur(k.ventas0)} a ${meur(k.ventas)}, pero el EBITDA se queda en el ${pc(k.ebitdaPct)} y la tesorería cae de ${eur(k.tesoreria0)} a ${eur(k.tesoreria)}. Crecer le está comiendo la caja: se ve en un minuto, sin esperar al cierre de la gestoría.` },
    { p: 'app.html', h: 'inversion', m: 'Simulador de inversión', t: 'La inversión, máquina a máquina',
      que: 'Ensaya una inversión mes a mes: cada máquina o nave con su financiación, la rampa de ventas, las contrataciones y la vida útil.',
      ben: (k) => `Corte láser, plegadora y ampliación de nave: ${eur(k.inversion)} al 75 % financiado, ${k.contrataciones} contrataciones y ${meur(k.incVentas)} más de ventas. Antes de firmar con el banco, Valdenorte sabe en qué mes la caja toca fondo y cuánto circulante necesita.` },
    { p: 'app.html', h: 'escenarios', m: 'Simulador de inversión', t: 'Cinco escenarios a la vez',
      que: 'Proyecta la empresa con y sin la inversión en estrés, pesimista, base, optimista y con hipótesis propias.',
      ben: (k) => `Las hipótesis «el primer cliente para sus obras» y «los cobros van más lentos» están preparadas: con un clic se ve si la empresa aguanta que ${k.top} (el ${k.topPct} % de las ventas) frene seis meses.` },
    { p: 'estrategia.html', h: 'ventas', m: 'Sistema estratégico', t: 'Clientes: quién compra y cuánto se depende de él',
      que: 'Clasifica clientes y productos (ABC), mide la concentración y marca el riesgo.',
      ben: (k) => `${k.top} concentra el ${k.topPct} % de las ventas. Lo que era una sensación («si un año para, nos hunde») pasa a ser una cifra con objetivo: bajarla al 22 %.` },
    { p: 'estrategia.html', h: 'margen', m: 'Sistema estratégico', t: 'Margen por línea de negocio',
      que: 'Calcula el margen de contribución de cada línea y qué pasa si se toca precio, volumen, coste o mezcla.',
      ben: (k) => `La carpintería metálica deja un ${k.carpPct} % de margen y los montajes un ${k.montPct} %. Con la tabla de precios nueva (margen mínimo del 25 %), la carpintería deja de vender por debajo de su coste.` },
    { p: 'estrategia.html', h: 'cobros', m: 'Sistema estratégico', t: 'Cobros y morosidad',
      que: 'Lee las facturas pendientes, calcula la antigüedad de la deuda y el riesgo de impago por cliente.',
      ben: (k) => `Los días de cobro han subido de ${k.dso0} a ${k.dso}. Volver a 65 días libera unos ${eur(k.cajaDso)} de caja: más de lo que hoy tiene en el banco y sin pedir un euro de deuda.` },
    { p: 'estrategia.html', h: 'compras', m: 'Sistema estratégico', t: 'Proveedores y compras',
      que: 'Ordena los proveedores por peso y riesgo (criticidad, alternativas, calidad y puntualidad).',
      ben: (k) => `${eur(k.acero)} de acero dependen de dos acerías y el galvanizado tiene un solo proveedor posible. Un acuerdo anual de precio y un punto de pedido por perfil evitan comprar caro con prisa.` },
    { p: 'estrategia.html', h: 'tesoreria', m: 'Sistema estratégico', t: 'Caja a 13 semanas',
      que: 'Proyecta cobros y pagos semana a semana con nóminas, Seguridad Social, impuestos, préstamos y cobros previstos.',
      ben: () => 'El IVA del trimestre, las nóminas y la cuota del préstamo coinciden en las mismas semanas que el cobro grande de Agroindustrial Valle Verde. Si ese cobro se retrasa, la póliza no llega: se sabe con semanas de antelación.' },
    { p: 'estrategia.html', h: 'plan', m: 'Sistema estratégico', t: 'Plan de empresa y nuevas líneas',
      que: 'Misión, visión y valores; DAFO y estrategias cruzadas; objetivos por área y plan de acción con responsable y fecha.',
      ben: () => 'Dos líneas nuevas salen del DAFO: mantenimiento industrial (ingresos recurrentes) y naves modulares en kit. El objetivo: que el mantenimiento pase del 4 % al 15 % de las ventas.' },
    { p: 'personas.html', h: 'organigrama', m: 'Personas y equipos', t: 'Organigrama y mandos',
      que: 'Dibuja la estructura con sus mandos, detecta los puestos críticos sin suplente y quién depende de quién.',
      ben: () => 'Todo pasa por el fundador y por el jefe de taller, que no tiene segundo. Nombrar un suplente libera unas nueve horas a la semana del gerente para vender y dirigir.' },
    { p: 'personas.html', h: 'equipos', m: 'Personas y equipos', t: 'Perfiles y equipos equilibrados',
      que: 'Perfiles de comportamiento, aportaciones al equipo y motivaciones de cada persona; encaje con su puesto y equilibrio de cada equipo.',
      ben: (k) => `${k.nPersonas - k.sinDisc} de ${k.nPersonas} personas tienen su perfil. El equipo de mantenimiento, la línea nueva, se forma con quien encaja en un trabajo de servicio y trato con el cliente.` },
    { p: 'intervencion.html', h: 'triaje', m: 'Auditoría integral', t: 'De una conversación a un triaje',
      que: 'Escucha la transcripción de la primera sesión, separa lo que dice la empresa de lo que dice el consultor y saca síntomas, constantes, causas y el triaje por áreas.',
      ben: () => 'De una hora de conversación salen los síntomas con las palabras de la familia («todo pasa por mí», «el stock lo pedimos cuando se ve que falta»), las constantes en rojo y por dónde empezar: caja y dependencia.' },
    { p: 'intervencion.html', h: 'plan', m: 'Auditoría integral', t: 'Plan de intervención por fases',
      que: 'Convierte causas y hallazgos en acciones por fases y líneas de trabajo, con responsable, fecha, entregable e indicador.',
      ben: () => 'Cada acción ataca una causa concreta y lleva su fecha. Las sesiones de seguimiento recogen acuerdos y avances, y los logros que cuenta la propia empresa («ya no estoy en el taller todo el día»).' },
    { p: 'mesa.html', h: 'metas', m: 'Mesa de trabajo', t: 'Metas SMART y agenda',
      que: 'Reúne en una sola mesa el trabajo de todos los mundos: prioridades, metas SMART, agenda semanal, reuniones y delegaciones.',
      ben: (k) => `Tres metas que salen de todo lo anterior: cobrar a 65 días (unos ${eur(k.cajaDso)} de caja), 15 contratos de mantenimiento y un suplente en el taller. Cada una con indicador, fecha, responsable y sus acciones.` },
    { p: 'libro.html', m: 'Libro corporativo', t: 'El libro de la empresa',
      que: 'Reúne los informes de todos los mundos en un solo documento, por secciones, para la familia, la dirección y los nuevos mandos.',
      ben: () => 'El relevo generacional necesita algo escrito: cómo se decide, qué se mide y hacia dónde va la empresa. El libro lo junta sin rehacer nada.' },
    { p: 'portal.html', m: 'Puesto de mando', t: 'Lo que gana Valdenorte',
      que: 'Todo enlazado: las cuentas alimentan el simulador y el sistema estratégico; las conversaciones, la auditoría; la auditoría, la mesa; y la mesa, el libro.',
      ben: (k) => `Unos ${eur(k.cajaDso)} de caja por cobrar antes, un riesgo de cliente medido, una línea que vendía por debajo de su coste, un relevo en marcha y una inversión de ${meur(k.inversion)} decidida con números. Puedes seguir probando con la empresa modelo o salir y volver a tu empresa.`, fin: true }
  ];
  const aqui = (s) => { const f = location.pathname.split('/').pop() || 'portal.html'; return f === s.p; };
  const url = (s) => s.p + (s.h ? '#' + s.h : '');

  /* ---------- Iniciar, moverse y salir ---------- */
  const P = () => A.platform;
  function iniciar() {
    const Pl = P(); if (!Pl || !Pl.modelo) return;
    const c = Pl.modelo.cfg();
    SS.set({ i: 0, prevEmp: Pl.empresaId(), prevCfg: { plan: c.plan, con: c.con } });
    // Durante el paseo se enseñan todos los mundos (como en el plan Consultora)
    c.plan = 'consultora'; Object.keys(c.con).forEach((k) => { c.con[k] = true; }); Pl.modelo.guardarCfg(c);
    try { sessionStorage.setItem('atalaya.ruta.intro', '1'); localStorage.setItem('atalaya.empresa.activa', JSON.stringify(Pl.modelo.ID)); } catch (e) { /* sin almacenamiento */ }
    ir(0);
  }
  function ir(i) {
    const st = SS.get(); if (!st) return;
    i = Math.max(0, Math.min(PASOS.length - 1, i)); st.i = i; st.pausa = false; SS.set(st);
    const s = PASOS[i], f = location.pathname.split('/').pop() || 'portal.html';
    if (f === s.p && !s.h && !location.hash) { pintar(); return; }
    location.href = url(s); if (f === s.p) location.reload();
  }
  function salir() {
    const st = SS.get(), Pl = P(); SS.del();
    if (st && Pl && Pl.modelo) {
      const c = Pl.modelo.cfg(); c.plan = (st.prevCfg && st.prevCfg.plan) || ''; if (st.prevCfg && st.prevCfg.con) c.con = st.prevCfg.con; Pl.modelo.guardarCfg(c);
      try { localStorage.setItem('atalaya.empresa.activa', JSON.stringify(st.prevEmp || 'principal')); } catch (e) { /* sin almacenamiento */ }
    }
    location.href = 'portal.html';
  }
  // Terminar el paseo quedándose con la empresa modelo (con todos sus mundos conectados)
  function quedarse() { SS.del(); const el = document.getElementById('paseo'); if (el) el.remove(); }

  /* ---------- Tarjeta ---------- */
  function pintar() {
    const st = SS.get(); let el = document.getElementById('paseo');
    if (!st) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('aside'); el.id = 'paseo'; el.className = 'paseo'; el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-label', 'Paseo virtual'); document.body.appendChild(el); }
    const s = PASOS[st.i], k = K() || {};
    if (st.pausa) { el.className = 'paseo paseo-min'; el.innerHTML = `<button class="paseo-pill" data-pseguir>Paseo virtual · ${st.i + 1} de ${PASOS.length} · seguir</button>`; el.querySelector('[data-pseguir]').onclick = () => { st.pausa = false; SS.set(st); pintar(); }; return; }
    el.className = 'paseo';
    let ben = ''; try { ben = s.ben(k); } catch (e) { ben = ''; }
    el.innerHTML = `<div class="paseo-h"><span class="paseo-n">Paseo virtual · ${st.i + 1} de ${PASOS.length}</span><span class="paseo-sp"></span><button class="paseo-x" data-ppausa title="Plegar" aria-label="Plegar el paseo">–</button><button class="paseo-x" data-psalir title="Salir del paseo" aria-label="Salir del paseo">×</button></div>
      <div class="paseo-m">${esc(s.m)}</div>
      <h3 class="paseo-t">${esc(s.t)}</h3>
      <p class="paseo-que">${esc(s.que)}</p>
      <div class="paseo-ben"><b>${s.fin ? 'En resumen' : 'Lo que gana Valdenorte'}</b><p>${esc(ben)}</p></div>
      ${aqui(s) ? '' : `<p class="paseo-aviso">Esta parada está en otra pantalla. <button class="paseo-l" data-pir>Ir allí</button></p>`}
      <div class="paseo-dots" aria-hidden="true">${PASOS.map((x, j) => `<i class="${j === st.i ? 'on' : j < st.i ? 'ok' : ''}"></i>`).join('')}</div>
      <div class="paseo-b">${st.i ? '<button class="paseo-btn" data-pant>← Anterior</button>' : '<span></span>'}${s.fin ? '<button class="paseo-btn" data-pvideo>Ver el vídeo</button><button class="paseo-btn" data-pquedar>Seguir con la empresa modelo</button><button class="paseo-btn solid" data-psalir>Volver a mi empresa</button>' : `<button class="paseo-btn solid" data-psig>Siguiente: ${esc(PASOS[st.i + 1].t)} →</button>`}</div>`;
    const on = (sel, fn) => el.querySelectorAll(sel).forEach((b) => (b.onclick = fn));
    on('[data-psig]', () => ir(st.i + 1)); on('[data-pant]', () => ir(st.i - 1)); on('[data-pir]', () => ir(st.i));
    on('[data-psalir]', salir); on('[data-pquedar]', quedarse);
    on('[data-pvideo]', () => { const P = window.Atalaya.platform; if (P && P.verVideo) P.verVideo(); });
    on('[data-ppausa]', () => { st.pausa = true; SS.set(st); pintar(); });
  }
  // Teclado: flechas para avanzar o retroceder y Esc para plegar
  addEventListener('keydown', (e) => {
    const st = SS.get(); if (!st || st.pausa || /input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
    if (e.key === 'ArrowRight' && st.i < PASOS.length - 1) ir(st.i + 1);
    else if (e.key === 'ArrowLeft' && st.i > 0) ir(st.i - 1);
    else if (e.key === 'Escape') { st.pausa = true; SS.set(st); pintar(); }
  });

  A.paseo = { iniciar, ir, salir, activo: () => !!SS.get(), PASOS };
  const arrancar = () => setTimeout(pintar, 600);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
