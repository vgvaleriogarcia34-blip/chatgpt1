/* Atalaya · Personas y equipos · Perfil de identidad
   Lectura complementaria a partir de la fecha de nacimiento (y del nombre completo, si está).
   No se enseñan cifras ni el método: solo seis aspectos en lenguaje llano. No entra en el encaje,
   en los equipos ni en ningún cálculo de decisión. */
(function () {
  const A = window.Atalaya, H = A.personasDatos, D = A.identidadDatos, R = A.personas;
  const { $, $$, esc } = R;
  const I = () => A.informe;

  /* ---------- Cálculo (interno) ---------- */
  const MAESTROS = [11, 22, 33];
  const suma = (n) => String(n).split('').reduce((a, c) => a + +c, 0);
  const reduce = (n, maestros) => { while (n > 9 && !(maestros && MAESTROS.includes(n))) n = suma(n); return n; };
  const VAL = { A: 1, J: 1, S: 1, B: 2, K: 2, T: 2, C: 3, L: 3, U: 3, D: 4, M: 4, V: 4, E: 5, N: 5, W: 5, F: 6, O: 6, X: 6, G: 7, P: 7, Y: 7, H: 8, Q: 8, Z: 8, I: 9, R: 9 };
  const letras = (nombre) => String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  const deLetras = (s, f) => { const v = s.split('').filter(f).reduce((a, c) => a + (VAL[c] || 0), 0); return v ? reduce(v, true) : null; };
  const esVocal = (c) => 'AEIOU'.includes(c);
  R.fechaValida = (f) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(f || '')) return false; const d = new Date(f + 'T00:00:00'); const y = +f.slice(0, 4); return !isNaN(d) && y >= 1900 && d <= new Date(); };
  R.identidad = (p) => {
    if (!p || !R.fechaValida(p.nacimiento)) return null;
    const [y, m, d] = p.nacimiento.split('-').map(Number);
    const esencia = reduce(reduce(d, true) + reduce(m, true) + reduce(suma(y), true), true);
    const talento = reduce(d, true);
    const ciclo = reduce(reduce(d) + reduce(m) + reduce(suma(new Date().getFullYear())));
    const L = letras(p.nombreCompleto || p.nombre);
    const out = { esencia, talento, ciclo, expresion: null, motor: null, imagen: null };
    if (L.length >= 3) { out.expresion = deLetras(L, () => true); out.motor = deLetras(L, esVocal); out.imagen = deLetras(L, (c) => !esVocal(c)); }
    return out;
  };
  const arq = (k) => D.ARQ[k] || D.ARQ[reduce(k)];

  /* ---------- Componentes ---------- */
  const fechaCampo = (p, id) => `<label class="small id-fecha">Fecha de nacimiento <input class="input" type="date" id="${id}" value="${esc(p.nacimiento || '')}" max="${new Date().toISOString().slice(0, 10)}"></label>`;
  const wireFecha = (host, p, id) => { const i = $('#' + id, host); if (i) i.onchange = () => { const v = i.value; if (v && !R.fechaValida(v)) return; p.nacimiento = v || ''; R.save(); R.rerender(); }; };
  /* Resumen en paralelo (en DISC, aportaciones, eneagrama y ficha) */
  R.identidadResumen = (p) => {
    const x = R.identidad(p); if (!x) return '';
    const E = arq(x.esencia), C = D.CICLO[x.ciclo];
    return `<div class="id-mini"><div class="eyebrow">Perfil de identidad</div><h4>${esc(E.n)} <small>· ${esc(E.lema)}</small></h4><p class="small" style="margin:0">${esc(E.esencia)}</p><p class="small" style="margin:0"><b>Talento natural:</b> ${esc(arq(x.talento).talento)} <b>Momento actual:</b> ${esc(C.n.toLowerCase())} (${esc(C.lema.toLowerCase())}).</p></div>`;
  };
  const aspecto = (k, titulo, A2, texto, extra) => `<article class="glass pad stack id-asp"><div class="row"><div><span class="pe-tk">${esc(D.ASPECTOS[k].t)}</span><h4>${esc(titulo)}</h4></div><span class="spacer"></span><span class="id-lema">${esc(A2)}</span></div><p style="margin:0">${esc(texto)}</p>${extra || ''}</article>`;
  R.identidadHTML = (p) => {
    const x = R.identidad(p); if (!x) return '';
    const E = arq(x.esencia), Tl = arq(x.talento), C = D.CICLO[x.ciclo];
    const disc = p.disc && R.discEstilo(p.disc);
    const cruce = disc ? (disc.pri === E.disc ? `Coincide con lo que dice su estilo de comportamiento (${disc.nombre.toLowerCase()}): las dos lecturas apuntan en la misma dirección.` : `Matiza su estilo de comportamiento (${disc.nombre.toLowerCase()}): conviene conversar qué parte es su forma de actuar y qué parte su fondo personal.`) : '';
    return `<div class="grid pe-two">
      ${aspecto('esencia', E.n, E.lema, E.esencia, `<div class="id-cols"><div><b class="small">Fortalezas</b><ul class="small">${E.fortalezas.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div><div><b class="small">A vigilar</b><ul class="small">${E.retos.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div></div>${cruce ? `<p class="small muted" style="margin:0">${esc(cruce)}</p>` : ''}`)}
      <div class="stack">${aspecto('talento', Tl.n, Tl.lema, Tl.talento)}${aspecto('ciclo', C.n, C.lema, C.texto, `<p class="small" style="margin:0"><b>Le conviene ahora:</b> ${esc(C.foco)} <b>Mejor evitar:</b> ${esc(C.evitar)}</p>`)}</div>
    </div>
    ${x.expresion ? `<div class="grid pe-three">${aspecto('motor', arq(x.motor).n, arq(x.motor).lema, arq(x.motor).motor)}${aspecto('expresion', arq(x.expresion).n, arq(x.expresion).lema, arq(x.expresion).expresion)}${aspecto('imagen', arq(x.imagen).n, arq(x.imagen).lema, arq(x.imagen).imagen)}</div>` : '<div class="alert info">Con el nombre completo (nombre y apellidos) se completan tres aspectos más: lo que le mueve, cómo se expresa y cómo le perciben.</div>'}
    <div class="grid pe-three">
      <div class="glass pad stack"><div class="eyebrow">En el trabajo</div><p style="margin:0">${esc(E.trabajo)}</p></div>
      <div class="glass pad stack"><div class="eyebrow">Cómo acompañarle</div><p style="margin:0">${esc(E.liderar)}</p></div>
      <div class="glass pad stack"><div class="eyebrow">Entorno y comunicación</div><p style="margin:0"><b>Entorno:</b> ${esc(E.entorno)}</p><p style="margin:0"><b>Cómo hablarle:</b> ${esc(E.comunicar)}</p></div>
    </div>`;
  };
  const aviso = () => `<div class="note pe-etica"><b>Cómo leerlo.</b> ${esc(D.AVISO)}</div>`;

  /* ---------- Módulo ---------- */
  R.register({
    id: 'identidad', grupo: 'Herramientas', nombre: 'Perfil de identidad', pregunta: '¿Quién es esta persona en lo esencial, qué le mueve y en qué momento está?',
    informe: () => { const p = R.personaActiva(); if (p) R.informePersona(p); }, informeTxt: 'Informe de la persona',
    render(host) {
      const p = R.personaActiva();
      const intro = `<div class="glass pad stack"><p style="margin:0">Una lectura complementaria del perfil a partir de la <b>fecha de nacimiento</b> y del <b>nombre completo</b>: identidad de fondo, talento natural, lo que le mueve, cómo se expresa, cómo le perciben y el momento que vive. Completa lo que dicen el DISC, las aportaciones y el eneagrama.</p></div>`;
      if (!p) { host.innerHTML = intro + R.vacia('Primero da de alta a las personas de la plantilla.', 'Ir a la plantilla'); return; }
      host.innerHTML = intro + `<div class="glass pad row pe-who"><label class="small">Persona ${R.selPersona('pePer', p.id)}</label>${fechaCampo(p, 'idFecha')}<label class="small id-fecha">Nombre completo <input class="input" id="idNom" value="${esc(p.nombreCompleto || p.nombre)}" placeholder="Nombre y apellidos"></label></div>`;
      R.wirePersona(host);
      if (!p.consentimiento) { host.insertAdjacentHTML('beforeend', R.pideConsent(p)); R.wireConsent(host, p); return; }
      wireFecha(host, p, 'idFecha');
      $('#idNom', host).onchange = (e) => { const v = e.target.value.trim(); p.nombreCompleto = v && v !== p.nombre ? v : ''; R.save(); R.rerender(); };
      host.insertAdjacentHTML('beforeend', (R.identidad(p) ? R.identidadHTML(p) : '<div class="alert info">Indica la fecha de nacimiento para ver su perfil de identidad. También puede ponerla la propia persona al responder un cuestionario por enlace.</div>') + aviso());
    }
  });

  /* ---------- En paralelo en las herramientas ---------- */
  R.onShowExtra = (R.onShowExtra || []).concat([(id, body) => {
    if (!['disc', 'roles', 'eneagrama'].includes(id)) return;
    const p = R.personaActiva(); if (!p || !p.consentimiento) return;
    const who = $('.pe-who', body); if (!who) return;
    const box = document.createElement('div'); box.className = 'glass pad stack id-par';
    box.innerHTML = R.identidad(p)
      ? `${R.identidadResumen(p)}<div class="row"><button class="btn small" data-go="identidad">Ver el perfil de identidad completo</button>${fechaCampo(p, 'idFecha2')}</div>`
      : `<div class="row"><div><div class="eyebrow">Perfil de identidad</div><p class="small" style="margin:0">Con la fecha de nacimiento se abre en paralelo su perfil de identidad.</p></div><span class="spacer"></span>${fechaCampo(p, 'idFecha2')}</div>`;
    who.after(box);
    wireFecha(box, p, 'idFecha2');
    const g = $('[data-go]', box); if (g) g.onclick = () => R.show('identidad');
  }]);

  /* ---------- En la ficha y en el informe de la persona ---------- */
  const ficha0 = R.fichaPersona;
  R.fichaPersona = (id) => {
    ficha0(id);
    const p = R.persona(id), card = document.querySelector('.pe-ficha'); if (!p || !card) return;
    const x = R.identidad(p); if (!x) return;
    const E = arq(x.esencia);
    const row = card.querySelector('.row:last-child');
    row.insertAdjacentHTML('beforebegin', `<p class="small" style="margin:0"><b>Identidad:</b> ${esc(E.n)} · ${esc(E.lema.toLowerCase())}. ${esc(arq(x.talento).talento)}</p>`);
  };
  R.identidadInforme = (p) => {
    const x = R.identidad(p); if (!x) return '';
    const In = I(), E = arq(x.esencia), C = D.CICLO[x.ciclo];
    const filas = [[D.ASPECTOS.esencia.t, `${E.n}. ${E.esencia}`], [D.ASPECTOS.talento.t, arq(x.talento).talento], [D.ASPECTOS.ciclo.t, `${C.n}: ${C.texto} Le conviene: ${C.foco}`]];
    if (x.expresion) filas.push([D.ASPECTOS.motor.t, arq(x.motor).motor], [D.ASPECTOS.expresion.t, arq(x.expresion).expresion], [D.ASPECTOS.imagen.t, arq(x.imagen).imagen]);
    filas.push(['Fortalezas', E.fortalezas.join('; ')], ['A vigilar', E.retos.join('; ')], ['Cómo acompañarle', E.liderar]);
    return In.section('Perfil de identidad', In.table(['Aspecto', 'Lectura'], filas), esc(D.AVISO));
  };
})();
