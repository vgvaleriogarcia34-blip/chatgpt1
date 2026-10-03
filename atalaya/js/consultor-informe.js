/* Atalaya · Informes con consultor
   · Plan Consultora: cada informe tiene dos partes.
       Para la empresa: el informe con su hoja de ruta de implantación (pasos, responsable, fecha y señal de
       que está hecho), las pautas de seguimiento y el reparto entre la empresa y el consultor.
       Cuaderno del consultor (interno): ficha del encargo, datos clave, plan de trabajo por sesiones,
       comprobaciones, notas, resistencias y próxima sesión. Se edita en el propio informe y se guarda
       por empresa. No se entrega al cliente.
   · Resto de planes: apartado «Con su consultor», con cómo se implanta acompañado y sus normas. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const CI = (A.consultorInf = {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const P = () => A.platform;
  const I = () => A.informe;
  CI.esConsultora = () => !!(P() && P().puede && P().puede('consultor') && P().user);
  const hoy = () => new Date().toISOString().slice(0, 10);
  const masDias = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  const fES = (d) => (d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  /* ---------- Almacén del cuaderno, por empresa ---------- */
  let ST = null;
  const LSK = () => (P() && P().k ? P().k('atalaya.consultor.v1') : 'atalaya.consultor.v1');
  CI.cargar = async () => {
    if (ST) return ST;
    try { ST = JSON.parse(localStorage.getItem(LSK())); } catch (e) { ST = null; }
    if (P() && P().loadData) { try { const r = await P().loadData('consultor'); if (r) ST = r; } catch (e) { /* local */ } }
    ST = Object.assign({ ficha: {}, cuadernos: {} }, ST || {});
    return ST;
  };
  const guardar = (() => { let t; return () => { try { localStorage.setItem(LSK(), JSON.stringify(ST)); } catch (e) { /* sin almacenamiento */ } clearTimeout(t); t = setTimeout(() => P() && P().saveData && P().saveData('consultor', ST), 800); }; })();
  CI.cargar();

  /* ---------- Pasos y seguimiento por defecto ---------- */
  const FASES = [
    { n: 'Arranque', d: 'Semanas 1 y 2', desde: 0 },
    { n: 'Implantación', d: 'Semanas 3 a 8', desde: 14 },
    { n: 'Consolidación', d: 'Semanas 9 a 12', desde: 56 }
  ];
  const faseDe = (i, n) => (n <= 2 ? Math.min(i, 2) : i < Math.ceil(n / 3) ? 0 : i < Math.ceil((2 * n) / 3) ? 1 : 2);
  const SEGUIMIENTO = [
    ['Semanal (30 min)', 'Acciones de la semana: hechas, retrasadas y bloqueos', 'Acciones cerradas en plazo', 'Responsable interno', 'Desbloquear o reasignar'],
    ['Quincenal (60 min, con el consultor)', 'Indicadores del informe y avance de la hoja de ruta', 'Indicadores de este informe', 'Dirección y consultor', 'Ajustar prioridades y fechas'],
    ['Mensual', 'Resultado frente al objetivo y coste de lo que no avanza', 'Brecha con la meta', 'Dirección', 'Seguir, acelerar o replantear'],
    ['Trimestral', 'Repetir el diagnóstico y emitir un informe nuevo', 'Nota del área y madurez', 'Consultor', 'Nueva hoja de ruta']
  ];
  const REGLAS = [
    'Cada acción tiene una sola persona responsable dentro de la empresa y una fecha.',
    'Las reuniones de seguimiento tienen día y hora fijos y siempre el mismo orden: indicadores, acciones vencidas, bloqueos y próximos compromisos.',
    'Los datos se actualizan en Atalaya antes de cada sesión, no durante.',
    'Lo que se acuerda se escribe: el consultor envía el acta en 24 horas.',
    'Una acción que se retrasa dos veces se replantea: se divide, se cambia de responsable o se descarta.',
    'Se mide con los indicadores de este informe; si un indicador no sirve, se cambia por escrito.'
  ];
  const REPARTO = [
    ['Decide y prioriza', 'Propone opciones, ordena y pone el coste de cada una'],
    ['Nombra a la persona responsable de cada acción', 'Comprueba que cada acción tiene responsable y fecha'],
    ['Ejecuta las acciones', 'Prepara herramientas, plantillas y forma a quien lo necesite'],
    ['Mantiene los datos al día', 'Lee los datos, detecta desvíos y avisa antes de que crezcan'],
    ['Asiste al seguimiento con lo hecho', 'Dirige el seguimiento, levanta el acta y mantiene el ritmo']
  ];

  /* ---------- Parte para la empresa (plan Consultora) ---------- */
  CI.externo = (ctx) => {
    const In = I(), pasos = (ctx.pasos || []).slice(0, 12), c = (ST && ST.cuadernos[ctx.clave]) || {}, f = (ST && ST.ficha) || {};
    if (!pasos.length) return '';
    const filas = pasos.map((p, i) => { const fa = FASES[faseDe(i, pasos.length)]; return [fa.n, p.q, p.c || '—', p.quien || 'Por asignar', p.cuando ? fES(p.cuando) : fa.d, p.s || '—']; });
    const propio = (ctx.seguimiento || []).map((x) => x.length >= 5 ? [x[0], x[1], x[3], x[2], x[4]] : [x[0], x[1], 'Indicadores de este informe', x[2] || 'Dirección', 'Seguir, ajustar o replantear']);
    // Las cadencias propias del área se completan con el ritmo de trabajo con el consultor
    const seg = propio.length ? (propio.length >= 5 ? propio : propio.concat(SEGUIMIENTO.filter((x) => !propio.some((y) => y[0].split(' ')[0] === x[0].split(' ')[0])).map((x) => [x[0], x[1], x[2], x[3], x[4]]))) : SEGUIMIENTO.map((x) => [x[0], x[1], x[2], x[3], x[4]]);
    return In.section('Hoja de ruta de implantación', In.table(['Fase', 'Paso', 'Cómo se hace', 'Responsable', 'Cuándo', 'Señal de que está hecho'], filas), `Ordenada en tres fases de ${pasos.length > 2 ? 'unas cuatro' : 'pocas'} semanas cada una. Cada paso tiene una señal comprobable: si no se ve, el paso no está hecho.`)
      + In.section('Pautas de seguimiento', In.table(['Frecuencia', 'Qué se revisa', 'Con qué indicador', 'Quién', 'Qué se decide'], seg) + `<h3>Reglas del seguimiento</h3><ol class="rp-steps">${REGLAS.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>`)
      + In.section('Cómo trabajamos juntos', In.table(['La empresa', 'El consultor'], REPARTO) + (f.nombre ? In.callout(`<b>Su consultor:</b> ${esc(f.nombre)}${f.firma ? ' · ' + esc(f.firma) : ''}${f.contacto ? ' · ' + esc(f.contacto) : ''}${c.proxima ? `. <b>Próxima sesión:</b> ${esc(fES(c.proxima))}` : ''}.`, 'info') : ''), 'El consultor asesora y acompaña; las decisiones son de la empresa.');
  };

  /* ---------- «Con su consultor» (resto de planes) ---------- */
  CI.conConsultor = () => {
    const In = I();
    return In.section('Con su consultor', `<p>Este informe dice qué hacer y en qué orden. Llevarlo a la operativa y sostenerlo semana a semana es la parte difícil. Ahí un consultor externo es un punto de apoyo: aporta método, una mirada de fuera y la experiencia de haberlo implantado en otras empresas, y ayuda a que el plan no se quede en el cajón.</p>
      <h3>Cómo se implanta con un consultor</h3><ol class="rp-steps"><li><b>Sesión de arranque (60 minutos).</b> Se repasa este informe con la dirección y se eligen las tres prioridades del trimestre.</li><li><b>Hoja de ruta de 90 días.</b> Cada acción con su responsable, su fecha y la señal de que está hecha.</li><li><b>Seguimiento quincenal.</b> Indicadores, acciones vencidas, bloqueos y próximos compromisos, con acta.</li><li><b>Revisión a los 90 días.</b> Se repite el diagnóstico en Atalaya y se compara con este informe.</li></ol>
      <h3>Normas para trabajar con su consultor</h3><ol class="rp-steps"><li>El consultor asesora; la empresa decide.</li><li>Cada acción tiene una persona responsable dentro de la empresa.</li><li>Los datos se actualizan en Atalaya antes de cada sesión.</li><li>Las sesiones tienen fecha fija y orden del día; lo acordado se escribe.</li><li>Se mide con los indicadores de este informe.</li><li>Todo lo que se comparte es confidencial.</li></ol>
      ${In.callout('Puede pedir una sesión de 60 minutos desde Atalaya: menú de su cuenta, «Hablar con un consultor». Traiga este informe y sus objetivos.', 'info')}`, 'Su consultor como punto de referencia externo para implantar el plan y acelerar los resultados.');
  };

  /* ---------- Cuaderno del consultor (interno) ---------- */
  const cuadernoDe = (ctx) => {
    ST.cuadernos[ctx.clave] = ST.cuadernos[ctx.clave] || { creado: hoy() };
    const c = ST.cuadernos[ctx.clave];
    if (!Array.isArray(c.sesiones) || !c.sesiones.length) {
      c.sesiones = [
        { fecha: masDias(7), objetivo: 'Arranque: presentar el informe y elegir las tres prioridades', prep: 'Leer el informe, preparar dos preguntas para la dirección', estado: 'Pendiente', resultado: '' },
        { fecha: masDias(21), objetivo: 'Primer seguimiento: acciones de arranque y datos al día', prep: 'Revisar los indicadores en Atalaya', estado: 'Pendiente', resultado: '' },
        { fecha: masDias(49), objetivo: 'Seguimiento de la implantación', prep: 'Acciones vencidas y bloqueos', estado: 'Pendiente', resultado: '' },
        { fecha: masDias(90), objetivo: 'Revisión trimestral: repetir el diagnóstico y nuevo informe', prep: 'Comparar con este informe', estado: 'Pendiente', resultado: '' }
      ];
    }
    c.hechos = c.hechos || {};
    return c;
  };
  const campo = (k, v, ph, rows) => (rows ? `<textarea class="ci-in" data-k="${k}" rows="${rows}" placeholder="${esc(ph || '')}">${esc(v || '')}</textarea>` : `<input class="ci-in" data-k="${k}" value="${esc(v || '')}" placeholder="${esc(ph || '')}">`);
  CI.cuadernoHTML = (ctx) => {
    const In = I(), c = cuadernoDe(ctx), f = ST.ficha, pasos = (ctx.pasos || []).slice(0, 12);
    In.reset();
    const hechos = pasos.filter((p, i) => c.hechos[i]).length;
    return `<div class="ci-stamp">Documento interno del consultor · No entregar a la empresa</div>`
      + In.cover({ tipo: 'Cuaderno del consultor', kicker: 'Interno · ' + (ctx.tipo || 'Informe'), titulo: ctx.titulo || 'Cuaderno', subtitulo: 'Notas, datos y plan de trabajo del encargo', empresa: ctx.empresa, sector: ctx.sector })
      + In.section('Ficha del encargo', `<div class="ci-grid"><label>Consultor${campo('f.nombre', f.nombre, 'Nombre y apellidos')}</label><label>Firma${campo('f.firma', f.firma, 'Business Avance')}</label><label>Contacto${campo('f.contacto', f.contacto, 'Correo o teléfono')}</label><label>Interlocutor en la empresa${campo('interlocutor', c.interlocutor, 'Nombre y cargo')}</label><label>Inicio${campo('inicio', c.inicio || c.creado, 'aaaa-mm-dd')}</label><label>Sesiones pactadas${campo('pactadas', c.pactadas, 'Por ejemplo: 6 sesiones en 90 días')}</label></div><p class="rp-muted">Los datos del consultor salen también, en una línea, en la versión para la empresa.</p>`)
      + (ctx.datos && ctx.datos.length ? In.section('Datos clave', In.table(['Dato', 'Valor'], ctx.datos)) : '')
      + In.section('Plan de trabajo', `<div class="rp-tw"><table class="rp-table ci-ses"><thead><tr><th>Fecha</th><th>Objetivo de la sesión</th><th>Preparación</th><th>Estado</th><th>Resultado y acuerdos</th><th></th></tr></thead><tbody>${c.sesiones.map((s, i) => `<tr data-s="${i}"><td><input class="ci-in" type="date" data-s-k="fecha" value="${esc(s.fecha)}"></td><td><textarea class="ci-in" rows="2" data-s-k="objetivo">${esc(s.objetivo)}</textarea></td><td><textarea class="ci-in" rows="2" data-s-k="prep">${esc(s.prep)}</textarea></td><td><select class="ci-in" data-s-k="estado">${['Pendiente', 'Hecha', 'Aplazada'].map((e) => `<option ${e === s.estado ? 'selected' : ''}>${e}</option>`).join('')}</select></td><td><textarea class="ci-in" rows="2" data-s-k="resultado">${esc(s.resultado)}</textarea></td><td><button class="ci-del" data-del="${i}" aria-label="Quitar sesión">×</button></td></tr>`).join('')}</tbody></table></div><button class="ci-add" data-add>Añadir sesión</button>`)
      + (pasos.length ? In.section('Comprobaciones de la hoja de ruta', `<p class="rp-muted">${hechos} de ${pasos.length} pasos comprobados.</p><ul class="ci-checks">${pasos.map((p, i) => `<li><label><input type="checkbox" data-h="${i}" ${c.hechos[i] ? 'checked' : ''}> <b>${esc(p.q)}</b>${p.s ? ` <span class="rp-muted">· Señal: ${esc(p.s)}</span>` : ''}</label></li>`).join('')}</ul>`) : '')
      + In.section('Notas del consultor', `<div class="ci-grid1"><label>Lectura de la situación${campo('notas', c.notas, 'Lo que ve el consultor y no está en los datos', 5)}</label><label>Resistencias y riesgos de la implantación${campo('riesgos', c.riesgos, 'Quién frena, qué puede salir mal y cómo anticiparlo', 3)}</label><label>Cómo ayudar al empresario${campo('ayuda', c.ayuda, 'Qué necesita oír, qué decisiones le cuestan, cómo acompañarle', 3)}</label></div>`)
      + In.section('Próxima sesión', `<div class="ci-grid"><label>Fecha${`<input class="ci-in" type="date" data-k="proxima" value="${esc(c.proxima || (c.sesiones.find((s) => s.estado === 'Pendiente') || {}).fecha || '')}">`}</label></div><label class="ci-l">Orden del día${campo('agenda', c.agenda || '1. Indicadores\n2. Acciones vencidas\n3. Bloqueos\n4. Próximos compromisos', '', 4)}</label>`)
      + `<footer class="rp-foot"><span>Atalaya · Cuaderno del consultor · ${esc(fES(hoy()))}</span><span>Documento interno. Se guarda con la empresa en Atalaya y no forma parte del informe entregado.</span></footer>`;
  };
  const wireCuaderno = (paper, ctx, rehacer) => {
    const c = cuadernoDe(ctx);
    paper.querySelectorAll('[data-k]').forEach((el) => (el.oninput = () => { const k = el.dataset.k; if (k.startsWith('f.')) ST.ficha[k.slice(2)] = el.value; else c[k] = el.value; c.editado = hoy(); guardar(); }));
    paper.querySelectorAll('tr[data-s]').forEach((tr) => tr.querySelectorAll('[data-s-k]').forEach((el) => (el.oninput = el.onchange = () => { c.sesiones[+tr.dataset.s][el.dataset.sK] = el.value; guardar(); })));
    paper.querySelectorAll('[data-h]').forEach((el) => (el.onchange = () => { c.hechos[el.dataset.h] = el.checked; guardar(); }));
    paper.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { c.sesiones.splice(+b.dataset.del, 1); guardar(); rehacer(); }));
    const ad = paper.querySelector('[data-add]'); if (ad) ad.onclick = () => { c.sesiones.push({ fecha: masDias(14), objetivo: '', prep: '', estado: 'Pendiente', resultado: '' }); guardar(); rehacer(); };
  };
  CI.textoCuaderno = (ctx) => {
    const c = cuadernoDe(ctx), f = ST.ficha;
    return [`CUADERNO DEL CONSULTOR (INTERNO) · ${ctx.titulo}`, `Empresa: ${ctx.empresa || ''}`, `Consultor: ${f.nombre || ''} ${f.firma ? '· ' + f.firma : ''}`, `Interlocutor: ${c.interlocutor || ''}`, '', 'PLAN DE TRABAJO', ...c.sesiones.map((s) => `- ${s.fecha} · ${s.objetivo} · ${s.estado}${s.resultado ? ' · ' + s.resultado : ''}`), '', 'NOTAS', c.notas || '', '', 'RESISTENCIAS Y RIESGOS', c.riesgos || '', '', 'CÓMO AYUDAR AL EMPRESARIO', c.ayuda || '', '', 'PRÓXIMA SESIÓN', `${c.proxima || ''}`, c.agenda || ''].join('\n');
  };

  /* ---------- Abrir un informe con su parte de consultor ----------
     o: { titulo, html, clave, ctx: { titulo, tipo, empresa, sector, pasos[{q,c,quien,cuando,s}], seguimiento[[frecuencia, qué, quién, indicador?, decisión?]], datos[[k,v]] } } */
  CI.abrir = async (o) => {
    const In = I(), cons = CI.esConsultora();
    await CI.cargar();
    const ctx = Object.assign({ clave: o.clave }, o.ctx || {});
    const extra = cons ? CI.externo(ctx) : CI.conConsultor();
    // La parte añadida va antes del pie del informe
    const i = o.html.lastIndexOf('<footer class="rp-foot"');
    const externo = i >= 0 ? o.html.slice(0, i) + extra + o.html.slice(i) : o.html + extra;
    const barExtra = cons
      ? `<div class="seg ci-seg" role="tablist" aria-label="Versión del informe"><button role="tab" aria-selected="true" data-v="ext">Para la empresa</button><button role="tab" aria-selected="false" data-v="int">Cuaderno del consultor</button></div>`
      : `<button class="btn ghost" id="ciSesion">Hablar con un consultor</button>`;
    In.open(Object.assign({}, o, {
      html: externo, barExtra: (o.barExtra || '') + barExtra,
      after(paper) {
        if (o.after) o.after(paper);
        const ov = paper.parentElement;
        const ses = ov.querySelector('#ciSesion'); if (ses) ses.onclick = () => P() && P().formContacto && P().formContacto({ tipo: 'sesion', origen: 'informe: ' + (o.titulo || '') });
        if (!cons) return;
        const pintar = (v) => {
          ov.querySelectorAll('.ci-seg [data-v]').forEach((b) => b.setAttribute('aria-selected', b.dataset.v === v));
          paper.classList.toggle('ci-interno', v === 'int');
          if (v === 'ext') { In.setN((o.html.match(/class="rp-sec"/g) || []).length); const ex = CI.externo(ctx); paper.innerHTML = i >= 0 ? o.html.slice(0, i) + ex + o.html.slice(i) : o.html + ex; return; }
          paper.innerHTML = CI.cuadernoHTML(ctx); wireCuaderno(paper, ctx, () => pintar('int'));
        };
        ov.querySelectorAll('.ci-seg [data-v]').forEach((b) => (b.onclick = () => { pintar(b.dataset.v); ov.scrollTop = 0; }));
        const cp = ov.querySelector('#rpCopy'); if (cp) { const orig = cp.onclick; cp.onclick = (e) => { if (paper.classList.contains('ci-interno')) { const t = CI.textoCuaderno(ctx); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => (e.target.textContent = 'Copiado'), () => (e.target.textContent = 'No se pudo copiar')); } else orig(e); }; }
      }
    }));
  };
})();
