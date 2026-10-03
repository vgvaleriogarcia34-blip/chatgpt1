/* Atalaya 360° · Personas y equipos · Informe completo de la persona
   Documento paginado en A4, con membrete de Business Avance y Atalaya 360° en cada hoja, que reúne todo lo que se sabe
   de una persona: comportamiento (DISC), aportaciones al equipo, motivación (eneagrama), perfil de identidad,
   liderazgo, competencias conductuales, encaje con su puesto y plan de desarrollo.
   Hojas: portada, metodología, índice, características, gráficos, estilo personal, habilidades interpersonales,
   comunicación, tendencias, contribución, mapa conductual, áreas de mejora, perfil laboral, dirección efectiva,
   motivación, aportaciones al equipo, motivación profunda, identidad, liderazgo, competencias y plan. */
(function () {
  const A = window.Atalaya, H = A.personasDatos, X = A.informeCompletoDatos, R = A.personas;
  const esc = R.esc;
  const F4 = ['D', 'I', 'S', 'C'];
  const COL = () => Object.fromEntries(F4.map((k) => [k, H.DISC[k].c]));

  /* ---------- Piezas ---------- */
  const discBadges = () => `<span class="pp-disc">${F4.map((k) => `<i style="background:${H.DISC[k].c}">${k}</i>`).join('')}</span>`;
  const lista = (l) => `<ul class="pp-list">${l.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const banda = (t) => `<h3 class="pp-band">${esc(t)}</h3>`;
  const barras = (d, titulo, ideal) => {
    const W = 172, Hh = 150, bw = 22, gap = 12, x0 = 26, c = COL();
    return `<figure class="pp-chart"><svg width="172" height="${Hh + 26}" viewBox="0 0 ${W} ${Hh + 26}" aria-label="${esc(titulo)}">
      ${[0, 25, 50, 75, 100].map((v) => `<line x1="${x0 - 4}" x2="${W - 4}" y1="${Hh - (v / 100) * (Hh - 14)}" y2="${Hh - (v / 100) * (Hh - 14)}" stroke="${v === 50 ? '#9a9688' : '#dcd9cf'}" stroke-width="${v === 50 ? 0.9 : 0.5}"/><text x="${x0 - 7}" y="${Hh - (v / 100) * (Hh - 14) + 3}" text-anchor="end" font-size="7" fill="#7d828c">${v}</text>`).join('')}
      ${F4.map((k, i) => { const v = d[k], x = x0 + 6 + i * (bw + gap), h = (v / 100) * (Hh - 14); return `<rect x="${x}" y="${Hh - h}" width="${bw}" height="${h}" fill="${c[k]}" rx="1.5"/>${ideal ? `<line x1="${x - 3}" x2="${x + bw + 3}" y1="${Hh - (ideal[k] / 100) * (Hh - 14)}" y2="${Hh - (ideal[k] / 100) * (Hh - 14)}" stroke="#0b0d13" stroke-width="1.6"/>` : ''}<text x="${x + bw / 2}" y="${Hh - h - 3}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#14171e">${v}</text><circle cx="${x + bw / 2}" cy="${Hh + 11}" r="6.5" fill="${c[k]}"/><text x="${x + bw / 2}" y="${Hh + 14}" text-anchor="middle" font-size="8" font-weight="700" fill="#fff">${k}</text>`; }).join('')}
    </svg><figcaption>${esc(titulo)}</figcaption></figure>`;
  };
  const cajas = (l, cls) => `<div class="pp-boxes ${cls || ''}">${l.map((x, i) => `<div class="pp-box ${i % 2 ? 'der' : 'izq'}">${esc(x)}</div>`).join('')}</div>`;
  const gotas = (d) => `<div class="pp-gotas">${F4.map((k) => { const nv = X.nivel(d[k]); return `<div class="pp-gota-w"><b>${esc(X.FRENTE[k])}</b><div class="pp-gota" style="--c:${H.DISC[k].c}"><span>${X.FACTOR[k][nv].pal.map(esc).join('<br>')}</span></div><small>${k} · ${esc(nv)}</small></div>`; }).join('')}</div>`;
  const filaBar = (n, v, ideal) => `<div class="pp-cb${ideal != null ? ' dos' : ''}"><span>${esc(n)}</span><div class="t"><i style="width:${v}%"></i></div><em>${v} %</em>${ideal != null ? `<div class="t p"><i style="width:${ideal}%"></i></div><em class="p">${ideal} %</em>` : ''}</div>`;

  /* Mapa conductual: ocho tendencias alrededor de la rueda, con la persona (y su puesto) */
  const mapa = (d, ideal, nombre, puntos) => {
    const S = 520, c = S / 2, R1 = 215, R0 = 172;
    const pt = (a, r) => [c + r * Math.cos((a * Math.PI) / 180), c - r * Math.sin((a * Math.PI) / 180)];
    const colA = { D: H.DISC.D.c, DI: '#e8763a', I: H.DISC.I.c, IS: '#9cc13a', S: H.DISC.S.c, SC: '#2b8f8a', C: H.DISC.C.c, CD: '#6a4fa3' };
    const seg = X.MAPA.map((m) => { const a0 = m.a - 22.5, a1 = m.a + 22.5; const p = [pt(a0, R0), pt(a0, R1), pt(a1, R1), pt(a1, R0)]; return `<path d="M${p[0]} L${p[1]} L${p[2]} L${p[3]} Z" fill="${colA[m.k]}"/>`; }).join('');
    const lab = X.MAPA.map((m) => { const [x, y] = pt(m.a, (R0 + R1) / 2); return `<text x="${x}" y="${y}" transform="rotate(${m.a === 0 ? 90 : m.a === 180 ? -90 : m.a > 0 ? 90 - m.a : -90 - m.a} ${x} ${y})" text-anchor="middle" dominant-baseline="middle" font-size="15" font-weight="800" fill="#fff" font-family="Archivo, sans-serif">${esc(m.n.toUpperCase())}</text>`; }).join('');
    const sub = X.MAPA.map((m) => { const [x, y] = pt(m.a, R0 - 16); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="9.5" fill="#4f5560">${esc(m.d)}</text>`; }).join('');
    const rings = [R0 - 34, 120, 80, 40].map((r) => `<polygon points="${[...Array(8)].map((_, i) => pt(i * 45 + 22.5, r).join(',')).join(' ')}" fill="none" stroke="#c8c4b6" stroke-width="1"/>`).join('');
    const spokes = [...Array(8)].map((_, i) => { const [x, y] = pt(i * 45 + 22.5, R0 - 34); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#dcd9cf"/>`; }).join('');
    const pos = (dd) => { const o = R.discXY(dd); return [c + o.x * (R0 - 40), c - o.y * (R0 - 40)]; };
    const [nx, ny] = d ? pos(d) : [0, 0];
    const pp = ideal ? pos(ideal) : null;
    const multi = (puntos || []).map((q) => { const [x, y] = pos(q.d); return `<circle cx="${x}" cy="${y}" r="13" fill="${q.c}" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">${esc(q.t)}</text>`; }).join('');
    return `<svg class="pp-mapa" width="500" height="500" viewBox="0 0 ${S} ${S}" role="img" aria-label="Mapa conductual">${seg}${lab}${rings}${spokes}${sub}
      ${pp ? `<circle cx="${pp[0]}" cy="${pp[1]}" r="12" fill="#fff" stroke="#0b0d13" stroke-width="2.5"/><text x="${pp[0]}" y="${pp[1] + 4}" text-anchor="middle" font-size="12" font-weight="800" fill="#0b0d13">P</text>` : ''}
      ${d ? `<circle cx="${nx}" cy="${ny}" r="14" fill="#0b0d13"/><text x="${nx}" y="${ny + 4.5}" text-anchor="middle" font-size="13" font-weight="800" fill="#c9f24d">N</text>` : ''}${multi}
      ${nombre ? `<text x="${c}" y="${S - 6}" text-anchor="middle" font-size="10" fill="#7d828c">${d ? 'N = ' + esc(nombre) : esc(nombre)}${pp ? ' · P = lo que pide su puesto' : ''}</text>` : ''}</svg>`;
  };
  const tendenciaDe = (d) => { const o = R.discXY(d), a = (Math.atan2(o.y, o.x) * 180) / Math.PI; let best = X.MAPA[0], dm = 999; X.MAPA.forEach((m) => { let dd = Math.abs(((a - m.a + 540) % 360) - 180); if (dd < dm) { dm = dd; best = m; } }); return best; };

  /* ---------- Montaje común de los informes paginados ---------- */
  const portada = (o) => `<section class="pp-page pp-portada"><div class="pp-circ c1" style="background:${H.DISC.D.c}"></div><div class="pp-circ c2" style="background:${H.DISC.C.c}"></div><div class="pp-circ c3" style="background:${H.DISC.S.c}"></div><div class="pp-circ c4" style="background:${H.DISC.I.c}"></div>
      <div class="pp-mb-top">${A.informe.membrete()}</div>
      <div class="pp-tit"><span>${esc(o.kicker)}</span><h1>${esc(o.titulo)}</h1><h2>${esc(o.nombre)}</h2><p>${esc(o.linea)}</p><small>${esc(A.informe.fecha())}</small></div>
      <div class="pp-incl">${(o.incl || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div></section>`;
  const montar = (o) => {
    const In = A.informe, pages = o.pages;
    // Hoja 1 portada, 2 la primera página (introducción), 3 el índice y desde la 4 el resto
    const idx = pages.map((pg, i) => ({ t: pg.sub, n: i === 0 ? 2 : i + 3, ok: pg.idx })).filter((x2) => x2.ok);
    const indice = { titulo: pages[0] ? pages[0].titulo : 'Informe', sub: 'Índice', html: `<ol class="pp-indice">${idx.map((x2) => `<li><span>${esc(x2.t)}</span><i></i><b>${x2.n}</b></li>`).join('')}</ol>` };
    const ordenadas = [pages[0], indice].concat(pages.slice(1));
    const hoja = (pg, i) => `<section class="pp-page"><header class="pp-h"><div class="pp-hl"><b>${esc(pg.titulo)}</b><span>${esc(pg.sub)}</span></div><div class="pp-hr">${discBadges()}<small>${In.membrete()}</small></div></header><div class="pp-c">${pg.html}</div><footer class="pp-f"><span>${o.pie}</span><b>${i + 2}</b></footer></section>`;
    const html = o.portada + ordenadas.map(hoja).join('');
    In.open({ titulo: o.titulo, html, paginado: true, after: (paper) => { paper.classList.add('pp-doc'); const z = () => { paper.style.zoom = Math.min(1, (innerWidth - 24) / 794); }; z(); addEventListener('resize', z); } });
  };
  R.pp = { esc, lista, banda, barras, cajas, gotas, filaBar, mapa, tendenciaDe, portada, montar, discBadges };

  /* ---------- Informe ---------- */
  R.informeCompleto = (p) => {
    if (!p) return;
    const In = A.informe, e = R.empresa(), pu = R.puestoDe(p), n1 = String(p.nombre || '').split(' ')[0];
    const tx = (s) => esc(String(s).replace(/\{n\}/g, n1));
    const d = p.disc, est = d && R.discEstilo(d), E = d && X.ESTILO[est.pri], ideal = pu && pu.disc;
    const pages = [];
    const pag = (titulo, sub, html, enIndice) => pages.push({ titulo, sub, html, idx: enIndice !== false });

    /* 2 · Metodología */
    pag('Perfil personal', 'Introducción a la metodología', `
      <p>Este informe reúne, en un solo documento, lo que las herramientas de Atalaya 360° dicen de <b>${esc(p.nombre)}</b>: su <b>estilo de comportamiento</b> (DISC), su <b>aportación natural al equipo</b>, su <b>motivación</b>, su <b>perfil de identidad</b>, su <b>estilo de liderazgo</b> y sus <b>competencias conductuales</b>, cruzados con lo que pide su puesto. Su objetivo es contribuir al autoconocimiento y al desarrollo.</p>
      <p>El DISC es el lenguaje del comportamiento: no mide la inteligencia, los valores ni las aptitudes, sino cómo actuamos en distintos entornos, situaciones y frente a otras personas.</p>
      <div class="pp-mide"><b>El DISC mide</b><div>${F4.map((k) => `<div style="--c:${H.DISC[k].c}"><h4>${esc(H.DISC[k].n)}</h4><p>${esc(X.VARIABLE[k].c)}</p><i>${k}</i></div>`).join('')}</div></div>
      <p>Actuamos de acuerdo con la combinación de estos cuatro factores, que cada persona tiene en distinta intensidad. Conocer el propio perfil facilita adaptar el comportamiento a cada situación y mejora la comunicación con los demás.</p>
      <div class="pp-nota"><b>Uso responsable.</b> ${esc(X.AVISO)}</div>`, false);

    if (d) {
      /* Características */
      pag('Perfil personal', 'Características conductuales', `
        <p class="pp-intro">La siguiente información refleja la forma natural en la que ${esc(n1)} actúa: no es su respuesta a las demandas del entorno, sino la forma en la que se comporta de forma instintiva y con la que se sentiría más a gusto si pudiera elegir cómo trabajar.</p>
        ${F4.slice().sort((a, b) => d[b] - d[a]).map((k) => `<p>${tx(X.FACTOR[k][X.nivel(d[k])].narr)}</p>`).join('')}
        <div class="pp-resumen"><b>${esc(est.nombre)}.</b> ${esc(H.DISC[est.pri].resumen)}</div>`);
      /* Gráficos */
      pag('Perfil personal', 'Gráficos de perfil conductual', `
        <p class="pp-intro">Los gráficos se basan en las respuestas al cuestionario. El primero muestra el perfil natural; el segundo, si su puesto tiene definido el comportamiento que pide, compara ambos.</p>
        <div class="pp-two">${banda('Perfil natural')}<div class="pp-row"><p>Su respuesta conductual natural: la forma instintiva en la que responde a los cuatro factores del DISC.${d.fecha ? ` Cuestionario del ${esc(R.fechaES(d.fecha))}${d.origen === 'externo' ? ' (test externo)' : ''}.` : ''}</p>${barras(d, 'Natural')}</div></div>
        ${ideal ? `<div class="pp-two">${banda('Lo que pide su puesto · ' + pu.nombre)}<div class="pp-row"><p>La raya negra marca el comportamiento que pide el puesto. Cuanto más lejos esté de su perfil natural, más esfuerzo de adaptación necesita para desempeñarlo, y más difícil es mantenerlo en el tiempo.${R.encaje(p, pu) && R.encaje(p, pu).disc != null ? ` Encaje de comportamiento: <b>${R.encaje(p, pu).disc} %</b>.` : ''}</p>${barras(d, 'Natural frente al puesto', ideal)}</div></div>` : `<div class="pp-nota">Defina el perfil de su puesto en «Puestos» para comparar su comportamiento natural con lo que el puesto pide.</div>`}`);
      /* Estilo personal */
      pag('Perfil personal', 'Estilo personal', `
        <p class="pp-intro">Las características de su estilo que le ayudarán, y ayudarán a los demás, a entender su forma de actuar.</p>
        ${banda('Descriptores de su perfil')}${gotas(d)}
        <div class="pp-cols">${['Su entorno ideal', 'Tendencias motivacionales'].map((t, i) => `<div>${banda(t)}${lista(i ? E.motiv : E.entorno)}</div>`).join('')}</div>
        ${banda('Estilo personal')}<ul class="pp-list pp-kv">${E.estilo.map(([k, v]) => `<li>${esc(k)}: <b>${esc(v)}</b></li>`).join('')}</ul>`);
      /* Habilidades interpersonales */
      pag('Perfil personal', 'Habilidades interpersonales', `
        <div class="pp-row"><p class="pp-intro">Cómo tiende a relacionarse con los demás. Le sacará el máximo provecho si comparte esta página con las personas con las que trabaja a diario.</p>${barras(d, 'Natural')}</div>
        ${banda('Tiende a relacionarse con los demás así')}${lista(E.relaciona)}
        ${banda('Prefiere que los demás se comuniquen con ' + n1 + ' así')}${lista(E.prefiere)}
        ${banda('Lo que los demás deberían evitar')}${lista(E.evitar)}`);
      /* Comunicación */
      pag('Perfil personal', 'Consejos para una comunicación efectiva', `
        <p class="pp-intro">Algunos consejos para mejorar la comunicación de ${esc(n1)} con otros estilos. Practicarlos aumenta su capacidad de influencia y la eficacia de su comunicación.</p>
        ${F4.map((k) => `${banda(X.CONSEJOS[k].t + '…')}<div class="pp-cons" style="--c:${H.DISC[k].c}">${lista(X.CONSEJOS[k].l)}</div>`).join('')}`);
      /* Tendencias */
      pag('Perfil personal', 'Tendencias de comportamiento', `
        <p class="pp-intro">Su tendencia natural ante problemas, personas, cambios y procedimientos, según las cuatro variables del DISC.</p>
        ${F4.map((k) => `<h4 class="pp-vt" style="color:${H.DISC[k].c}">${esc(X.VARIABLE[k].t)} · ${esc(X.VARIABLE[k].s)}</h4><div class="pp-vbox" style="background:${H.DISC[k].c}"><p>${tx(X.FACTOR[k][X.nivel(d[k])].tend)}</p><p class="pp-vn">Nivel ${esc(X.nivel(d[k]))} (${d[k]} de 100)${ideal ? ` · su puesto pide ${ideal[k]}${Math.abs(ideal[k] - d[k]) >= 25 ? ': diferencia que exige adaptación' : ''}` : ''}.</p></div>`).join('')}`);
      /* Contribución */
      pag('Perfil personal', 'Contribución a la organización', `
        <div class="pp-row"><p class="pp-intro">Las habilidades y comportamientos que ${esc(n1)} aporta al trabajo: las fortalezas que suma a la organización.</p>${barras(d, 'Natural')}</div>${cajas(E.contribucion)}`);
      /* Mapa */
      const td = tendenciaDe(d);
      pag('Perfil personal', 'Mapa conductual', `
        <p class="pp-intro">El mapa muestra dónde se sitúa respecto a las ocho tendencias de comportamiento que agrupan las combinaciones del DISC.${ideal ? ' Si el puesto tiene perfil, aparece también, para ver el esfuerzo de adaptación entre su forma natural y la que pide el puesto.' : ''}</p>
        <div class="pp-mapa-w">${mapa(d, ideal, p.nombre)}</div>
        <div class="pp-resumen">Tendencia principal: <b>${esc(td.n)}</b> (${esc(td.d.toLowerCase())}).</div>`);
      /* Mejora */
      pag('Perfil personal', 'Áreas de mejora', `
        <div class="pp-row"><p class="pp-intro">Áreas con oportunidad de desarrollo personal y profesional. Elija al menos tres en las que crea que necesita mejorar y trace un plan para reducir su impacto. Si trabaja con un consultor o un coach, úselas para fijar metas de desarrollo.</p>${barras(d, 'Natural')}</div>${cajas(E.mejora)}`);
      /* Perfil laboral */
      const enc = R.encaje(p, pu);
      pag('Perfil laboral', 'Características laborales', `
        <div class="pp-row"><p class="pp-intro">Cada puesto requiere unas tendencias de comportamiento. Cuando el estilo concuerda con el puesto es más fácil desempeñarlo de forma natural y sostenida; cuando no, hace falta un gran esfuerzo de adaptación.</p>${barras(d, ideal ? 'Natural frente al puesto' : 'Natural', ideal)}</div>
        ${banda('Puestos que concuerdan con su perfil')}${lista(E.puestoSi)}
        ${banda('Puestos que puede gestionar sin gran adaptación')}${lista(E.puestoAd)}
        ${banda('Lo que menos se adapta a su perfil')}${lista(E.puestoNo)}
        ${enc && enc.total != null ? `<div class="pp-resumen">Encaje con su puesto actual (${esc(pu.nombre)}): <b>${enc.total} %</b>. ${enc.brechas.slice(0, 2).map((b) => esc(b.txt)).join(' ')}</div>` : ''}`);
      /* Dirección */
      pag('Dirección efectiva', 'Claves para dirigir y motivar', `
        <div class="pp-row"><p class="pp-intro">Cada persona es diferente y debe dirigirse de forma diferente. Revise esta lista con ${esc(n1)} y acuerden las tres claves más importantes: le darán las bases para una relación y un desempeño excelentes.</p>${barras(d, 'Natural')}</div>
        ${banda('La forma más efectiva de dirigir a ' + n1)}${cajas(E.dirigir, 'pp-boxes-s')}
        ${banda('La forma más efectiva de mantener su motivación')}${cajas(E.motivar, 'pp-boxes-s')}`);
      /* Liderazgo */
      const L = E.lid, sec = F4.filter((k) => k !== est.pri && d[k] >= 55).map((k) => X.ESTILO[k].lid.n.toLowerCase());
      const lc = R.lidCalc && p.lid && p.lid.estilo && R.lidCalc(p.lid.estilo.resp), LE = A.liderazgoDatos && A.liderazgoDatos.ESTILOS;
      pag('Estilo de liderazgo', 'Características de su estilo', `
        <div class="pp-row"><p class="pp-intro">El estilo de liderazgo está muy ligado al perfil de comportamiento: es la forma natural en la que lideraría si nada le obligara a otra cosa.</p>${barras(d, 'Natural')}</div>
        ${banda('Su estilo se denomina ' + L.n.toLowerCase() + ' y se caracteriza por')}${lista(L.rasgos)}
        <div class="pp-cols"><div>${banda('Lo más sobresaliente')}${lista(L.fuertes)}</div><div>${banda('Lo que podría restar eficacia')}${lista(L.riesgos)}</div></div>
        ${banda('Aspectos a mejorar')}${lista(L.mejorar)}
        ${sec.length ? `<div class="pp-sec"><span>Estilos de liderazgo secundarios</span><b>${esc(sec.join(' y '))}</b></div>` : ''}
        ${lc && LE ? `<div class="pp-resumen">Liderazgo a medida: con su test de situaciones, su estilo de referencia es <b>${esc(LE[lc.pri].n)}</b>, con una eficacia del ${lc.eficacia} % y una flexibilidad del ${lc.flex} %.</div>` : ''}`);
      /* Competencias */
      const ar = X.AREAS.map((a) => ({ n: a.n, v: X.calc(a.w, d), p: ideal ? X.calc(a.w, ideal) : null }));
      pag('Competencias ejecutivas', 'Áreas competenciales conductuales', `
        <p class="pp-intro">La facilidad natural de ${esc(n1)} en cuatro áreas clave. No es una valoración de su desempeño: indica dónde el comportamiento le resulta natural (por encima del 50 %, poco esfuerzo) y dónde le supone más esfuerzo (por debajo del 50 %).${ideal ? ' La barra gris muestra lo que pide su puesto.' : ''}</p>
        <div class="pp-leg"><i class="n"></i>Natural${ideal ? '<i class="p"></i>Lo que pide el puesto' : ''}</div>
        <div class="pp-comp pp-comp-g">${ar.map((x) => filaBar(x.n, x.v, x.p)).join('')}</div>`);
      const cp = X.COMPETENCIAS.map((a) => ({ n: a.n, v: X.calc(a.w, d), p: ideal ? X.calc(a.w, ideal) : null }));
      pag('Competencias ejecutivas', 'Competencias conductuales clave', `
        <p class="pp-intro">Dieciséis competencias relacionadas con el comportamiento. Fíjese en las tres a seis que son clave para su puesto. No limita lo que ${esc(n1)} puede desarrollar: indica dónde le resulta natural y dónde le exige más energía.</p>
        <div class="pp-leg"><i class="n"></i>Natural${ideal ? '<i class="p"></i>Lo que pide el puesto' : ''}</div>
        <div class="pp-comp">${cp.map((x) => filaBar(x.n, x.v, x.p)).join('')}</div>`);
    } else {
      pag('Perfil personal', 'Estilo de comportamiento', `<div class="pp-nota">${esc(p.nombre)} todavía no tiene su cuestionario DISC. Envíelo por enlace desde «Test a distancia» o rellénelo en «DISC» para completar las páginas de comportamiento, comunicación, liderazgo y competencias.</div>`);
    }
    /* Aportaciones al equipo */
    if (p.roles && p.roles.scores) {
      const s = p.roles.scores, ord = R.rolesOrden(s), top = H.ROLES[ord[0]];
      pag('Aportación al equipo', 'Su papel natural en un equipo', `
        <p class="pp-intro">Cada miembro de un equipo aporta cualidades que lo construyen y debilidades que pueden frenarlo. Esta página muestra su aportación natural principal y las secundarias; no significa que solo pueda actuar en ellas.</p>
        ${banda('La aportación natural de ' + n1 + ' es la de ' + top.n.toLowerCase())}<p>${esc(top.aporta)}</p>
        <div class="pp-cols"><div>${banda('Se caracteriza por')}${lista([top.aporta].concat(ord.slice(1, 3).map((k) => 'También aporta como ' + H.ROLES[k].n.toLowerCase() + ': ' + H.ROLES[k].aporta.charAt(0).toLowerCase() + H.ROLES[k].aporta.slice(1))))}</div><div>${banda('A vigilar')}${lista([top.debilidad])}</div></div>
        ${banda('Mapa de aportaciones')}<div class="pp-comp">${ord.map((k) => filaBar(H.ROLES[k].n + ' · ' + H.ROLES[k].g.toLowerCase(), s[k])).join('')}</div>
        <div class="pp-sec"><span>Aportaciones secundarias</span><b>${esc(ord.slice(1, 3).map((k) => H.ROLES[k].n).join(' y '))}</b></div>`);
    }
    /* Motivación profunda */
    if (p.enea && p.enea.tipo) {
      const En = H.ENEA[p.enea.tipo];
      pag('Motivación', 'Lo que le mueve y lo que teme', `
        <p class="pp-intro">La motivación de fondo explica por qué una persona hace lo que hace. Conocerla ayuda a acompañarla y a evitar lo que la desmotiva.</p>
        ${banda(En.n)}
        <div class="pp-kvs">${[['Le mueve', En.motivacion], ['Teme', En.miedo], ['Su fortaleza', En.fortaleza], ['Cómo liderarle', En.liderar], ['Riesgo a vigilar', En.riesgo], ['Centro', En.centro]].map(([k, v]) => `<div><span>${esc(k)}</span><p>${esc(v)}</p></div>`).join('')}</div>`);
    }
    /* Perfil de identidad */
    const x = R.identidad && R.identidad(p), DI = A.identidadDatos;
    if (x && DI) {
      const arq = (k) => DI.ARQ[k] || DI.ARQ[1], Ee = arq(x.esencia), C = DI.CICLO[x.ciclo];
      const asp = [['esencia', Ee.n + ' · ' + Ee.lema, Ee.esencia], ['talento', arq(x.talento).n, arq(x.talento).talento], ['ciclo', C.n, C.texto + ' Le conviene: ' + C.foco.charAt(0).toLowerCase() + C.foco.slice(1)]];
      if (x.expresion) asp.push(['motor', arq(x.motor).n, arq(x.motor).motor], ['expresion', arq(x.expresion).n, arq(x.expresion).expresion], ['imagen', arq(x.imagen).n, arq(x.imagen).imagen]);
      pag('Perfil de identidad', 'Una lectura complementaria', `
        <p class="pp-intro">Una lectura complementaria de su identidad personal a partir de la fecha de nacimiento y del nombre completo. Completa lo que dicen el comportamiento, la aportación al equipo y la motivación.</p>
        <div class="pp-kvs tres">${asp.map(([k, t, v]) => `<div><span>${esc(DI.ASPECTOS[k].t)}</span><b>${esc(t)}</b><p>${esc(v)}</p></div>`).join('')}</div>
        <div class="pp-cols"><div>${banda('Fortalezas')}${lista(Ee.fortalezas)}</div><div>${banda('A vigilar')}${lista(Ee.retos)}</div></div>
        <div class="pp-nota">${esc(DI.AVISO)}</div>`);
    }
    /* Plan de desarrollo */
    const tabs = R.tablillasDe(p).slice(0, 4), jefe = R.persona(p.responsable);
    pag('Plan de desarrollo', 'Próximos pasos', `
      <p class="pp-intro">Lo que conviene trabajar, con fichas breves de entrenamiento elegidas para ${esc(n1)} según su perfil, su puesto y su equipo.</p>
      ${tabs.length ? `<div class="pp-tabs">${tabs.map((t) => `<div class="pp-tab"><b>${esc(t.t.titulo)}</b><p>${esc(t.t.objetivo)}</p><ol>${t.t.pasos.slice(0, 3).map((s) => `<li>${esc(s)}</li>`).join('')}</ol><small>${esc(t.t.duracion)} · Señal de avance: ${esc(t.t.senal)}</small></div>`).join('')}</div>` : '<div class="pp-nota">Complete el DISC y asigne un puesto para recibir fichas de entrenamiento personalizadas.</div>'}
      ${banda('Cómo usar este informe')}<ol class="pp-list pp-ol"><li>Conversación de devolución de 30 minutos entre ${esc(jefe ? jefe.nombre : 'su responsable')} y ${esc(n1)}: leer juntos el informe y contrastarlo con ejemplos.</li><li>Elegir tres claves de «Dirección efectiva» y una ficha de entrenamiento.</li><li>Fijar una fecha de revisión a las seis semanas.</li></ol>
      <div class="pp-firma"><div><span>Preparado por</span><b>Business Avance · Atalaya 360°</b></div><div><span>Para</span><b>${esc(e.nombre)}</b></div><div><span>Fecha</span><b>${esc(In.fecha())}</b></div></div>`);

    R.pp.montar({ pages, pie: `Business Avance · Atalaya 360° · Informe de ${esc(p.nombre)} · ${esc(e.nombre)}`, titulo: 'Informe de perfil completo · ' + p.nombre,
      portada: R.pp.portada({ kicker: 'Personas y equipos', titulo: 'Informe de perfil completo', nombre: p.nombre, linea: `${pu ? pu.nombre : 'Sin puesto asignado'}${p.area ? ' · ' + p.area : ''} · ${e.nombre}`, incl: ['Comportamiento', 'Aportación al equipo', 'Motivación', 'Identidad', 'Liderazgo', 'Competencias'] }) });
  };
})();
