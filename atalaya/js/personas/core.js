/* Atalaya · Personas y equipos · núcleo
   Estado por empresa (personas, puestos y equipos), cálculo de los cuestionarios, encaje persona-puesto,
   análisis de equipos y de estructura, y navegación por módulos. Es análisis, auditoría y estructura:
   no hay control horario, nóminas ni seguimiento del día a día. */
(function () {
  const A = window.Atalaya, H = A.personasDatos;
  const R = (A.personas = { modules: [], state: null });
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  R.$ = $; R.$$ = $$; R.esc = esc;
  const P = () => A.platform;
  const LSK = () => (P() && P().k ? P().k('atalaya.personas.v1') : 'atalaya.personas.v1');
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };
  R.uid = (p) => (p || 'x') + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
  R.hoy = () => new Date().toISOString().slice(0, 10);
  R.fechaES = (d) => (d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r0 = (v) => Math.round(v);

  R.vacio = () => ({ v: 1, personas: [], puestos: [], equipos: [] });
  R.save = (() => { let t; return () => { LS.set(LSK(), R.state); clearTimeout(t); t = setTimeout(() => P() && P().saveData('personas', R.state), 900); }; })();

  /* ---------- Accesos ---------- */
  R.persona = (id) => R.state.personas.find((p) => p.id === id);
  R.puesto = (id) => R.state.puestos.find((p) => p.id === id);
  R.equipo = (id) => R.state.equipos.find((e) => e.id === id);
  R.puestoDe = (p) => (p && p.puestoId ? R.puesto(p.puestoId) : null);
  R.nombre = (id) => { const p = R.persona(id); return p ? p.nombre : '—'; };

  /* ---------- DISC ----------
     En cada bloque se elige la palabra que más y la que menos se parece a la persona.
     Puntuación de cada factor = (veces «más» − veces «menos» + 12) / 24, en %. */
  R.discDesdeResp = (resp) => {
    const c = { D: 0, I: 0, S: 0, C: 0 };
    resp.forEach((r) => { if (r && r.mas) c[r.mas]++; if (r && r.menos) c[r.menos]--; });
    const n = H.DISC_BLOQUES.length;
    const o = {}; Object.keys(c).forEach((k) => (o[k] = r0(((c[k] + n) / (2 * n)) * 100)));
    return o;
  };
  R.discOrden = (d) => ['D', 'I', 'S', 'C'].sort((a, b) => d[b] - d[a]);
  R.discEstilo = (d) => {
    if (!d) return null;
    const o = R.discOrden(d);
    const sec = d[o[1]] >= 50 && d[o[0]] - d[o[1]] < 25 ? o[1] : null;
    return { pri: o[0], sec, cod: o[0] + (sec || ''), nombre: H.DISC[o[0]].n + (sec ? ' · ' + H.DISC[sec].n.toLowerCase() : '') };
  };
  /* Posición en la rueda DISC: D arriba a la izquierda, I arriba a la derecha, S abajo a la derecha, C abajo a la izquierda */
  R.discXY = (d) => {
    const x = (d.I + d.S - d.D - d.C) / 200, y = (d.D + d.I - d.S - d.C) / 200;
    const m = Math.hypot(x, y) || 1, k = Math.min(1, m * 1.6) / m;
    return { x: x * k, y: y * k };
  };

  /* ---------- Roles de equipo ----------
     27 frases puntuadas de 0 a 4; cada rol suma tres frases (máximo 12). */
  R.ROL_IDS = Object.keys(H.ROLES);
  R.rolesDesdeResp = (resp) => {
    const s = {}; R.ROL_IDS.forEach((k) => (s[k] = 0));
    H.ROLES_ITEMS.forEach((it, i) => { s[it.rol] += +resp[i] || 0; });
    R.ROL_IDS.forEach((k) => (s[k] = r0((s[k] / 12) * 100)));
    return s;
  };
  R.rolesOrden = (s) => R.ROL_IDS.slice().sort((a, b) => s[b] - s[a]);

  /* ---------- Eneagrama ----------
     27 frases de 1 a 5; cada tipo suma tres (de 3 a 15). Tipo = el más alto; ala = el vecino más alto. */
  R.eneaDesdeResp = (resp) => {
    const s = {}; for (let t = 1; t <= 9; t++) s[t] = 0;
    H.ENEA_ITEMS.forEach((it, i) => { s[it.tipo] += +resp[i] || 0; });
    for (let t = 1; t <= 9; t++) s[t] = r0(((s[t] - 3) / 12) * 100);
    const tipo = +Object.keys(s).sort((a, b) => s[b] - s[a])[0];
    const izq = tipo === 1 ? 9 : tipo - 1, der = tipo === 9 ? 1 : tipo + 1;
    return { scores: s, tipo, ala: s[izq] >= s[der] ? izq : der };
  };
  R.CENTROS = { Instintivo: [8, 9, 1], Emocional: [2, 3, 4], Mental: [5, 6, 7] };

  /* ---------- Encaje persona-puesto ----------
     Comportamiento (DISC): 100 − 1,4 × diferencia media con el perfil del puesto.
     Roles: media de la puntuación de la persona en los roles clave del puesto.
     Encaje = 60 % comportamiento + 40 % roles (o solo lo que haya). */
  R.encaje = (p, pu) => {
    if (!p || !pu) return null;
    const out = { disc: null, roles: null, total: null, brechas: [], fuertes: [] };
    if (p.disc && pu.disc) {
      const dif = ['D', 'I', 'S', 'C'].map((k) => ({ k, d: (pu.disc[k] || 0) - p.disc[k] }));
      const media = dif.reduce((a, x) => a + Math.abs(x.d), 0) / 4;
      out.disc = r0(clamp(100 - media * 1.4, 0, 100));
      dif.filter((x) => Math.abs(x.d) >= 25).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).forEach((x) => out.brechas.push({ tipo: 'disc', k: x.k, d: x.d, txt: x.d > 0 ? `El puesto pide más ${H.DISC[x.k].n.toLowerCase()} (${pu.disc[x.k]} frente a ${p.disc[x.k]}).` : `Tiene bastante más ${H.DISC[x.k].n.toLowerCase()} de la que pide el puesto (${p.disc[x.k]} frente a ${pu.disc[x.k]}): riesgo de que se aburra o choque.` }));
    }
    if (p.roles && p.roles.scores && pu.roles && pu.roles.length) {
      const v = pu.roles.map((k) => ({ k, v: p.roles.scores[k] || 0 }));
      out.roles = r0(v.reduce((a, x) => a + x.v, 0) / v.length);
      v.filter((x) => x.v < 50).forEach((x) => out.brechas.push({ tipo: 'rol', k: x.k, txt: `El rol de ${H.ROLES[x.k].n.toLowerCase()}, clave en el puesto, no le sale natural (${x.v} %).` }));
      v.filter((x) => x.v >= 70).forEach((x) => out.fuertes.push(`Rol de ${H.ROLES[x.k].n.toLowerCase()} muy natural (${x.v} %).`));
    }
    if (out.disc != null && out.roles != null) out.total = r0(out.disc * 0.6 + out.roles * 0.4);
    else out.total = out.disc != null ? out.disc : out.roles;
    out.st = out.total == null ? null : out.total >= 75 ? 'ok' : out.total >= 55 ? 'warn' : 'stop';
    return out;
  };
  R.stTxt = { ok: 'Encaje alto', warn: 'Encaje medio', stop: 'Encaje bajo' };

  /* ---------- Equipos ---------- */
  R.TENSIONES = [
    { a: 'D', b: 'S', txt: 'Ritmo: la D quiere decidir ya y la S necesita tiempo y seguridad para cambiar.', clave: 'Pactar plazos de decisión y explicar el porqué de cada cambio.' },
    { a: 'I', b: 'C', txt: 'Forma de trabajar: la I improvisa y entusiasma, la C pide datos, método y precisión.', clave: 'Acordar qué se documenta y qué se puede decidir sobre la marcha.' },
    { a: 'D', b: 'D', txt: 'Liderazgo: dos perfiles muy dominantes pueden competir por el mando.', clave: 'Repartir ámbitos de decisión claros para cada uno.' },
    { a: 'D', b: 'C', txt: 'Velocidad frente a calidad: la D empuja y la C frena para asegurar.', clave: 'Definir qué es «terminado» antes de empezar.' }
  ];
  R.analizarEquipo = (ids) => {
    const miembros = ids.map(R.persona).filter(Boolean);
    const conDisc = miembros.filter((p) => p.disc), conRoles = miembros.filter((p) => p.roles && p.roles.scores), conEnea = miembros.filter((p) => p.enea && p.enea.tipo);
    const out = { miembros, conDisc, conRoles, conEnea, dist: { D: 0, I: 0, S: 0, C: 0 }, media: null, cobertura: [], faltan: [], tensiones: [], centros: { Instintivo: 0, Emocional: 0, Mental: 0 }, avisos: [], contratar: null };
    conDisc.forEach((p) => out.dist[R.discEstilo(p.disc).pri]++);
    if (conDisc.length) { out.media = {}; ['D', 'I', 'S', 'C'].forEach((k) => (out.media[k] = r0(conDisc.reduce((a, p) => a + p.disc[k], 0) / conDisc.length))); }
    // Cobertura de roles: el mejor del equipo en cada rol
    R.ROL_IDS.forEach((k) => {
      let best = null; conRoles.forEach((p) => { if (!best || p.roles.scores[k] > best.v) best = { id: p.id, v: p.roles.scores[k] }; });
      const v = best ? best.v : 0;
      const nivel = !conRoles.length ? 'sin' : v >= 60 ? 'ok' : v >= 45 ? 'warn' : 'stop';
      out.cobertura.push({ k, best, nivel, n: conRoles.filter((p) => p.roles.scores[k] >= 60).length });
      if (conRoles.length && nivel === 'stop') out.faltan.push(k);
    });
    conEnea.forEach((p) => { Object.keys(R.CENTROS).forEach((c) => { if (R.CENTROS[c].includes(p.enea.tipo)) out.centros[c]++; }); });
    // Tensiones probables entre pares de estilos
    for (let i = 0; i < conDisc.length; i++) for (let j = i + 1; j < conDisc.length; j++) {
      const a = conDisc[i], b = conDisc[j], ea = R.discEstilo(a.disc).pri, eb = R.discEstilo(b.disc).pri;
      const t = R.TENSIONES.find((x) => (x.a === ea && x.b === eb) || (x.a === eb && x.b === ea));
      if (t && (t.a !== t.b || (a.disc.D >= 70 && b.disc.D >= 70))) out.tensiones.push({ a: a.id, b: b.id, t });
    }
    // Avisos de composición
    if (conDisc.length >= 3) {
      const top = Object.keys(out.dist).sort((x, y) => out.dist[y] - out.dist[x])[0];
      if (out.dist[top] / conDisc.length > 0.6) out.avisos.push({ st: 'warn', t: `Equipo muy homogéneo: ${out.dist[top]} de ${conDisc.length} personas tienen estilo ${H.DISC[top].n.toLowerCase()}. Ganan en entendimiento, pero comparten los mismos puntos ciegos.` });
      ['D', 'I', 'S', 'C'].forEach((k) => { if (!out.dist[k] && out.media && out.media[k] < 40) out.avisos.push({ st: 'warn', t: `Nadie aporta ${H.DISC[k].n.toLowerCase()} (${H.DISC[k].corto.toLowerCase()}). ${{ D: 'Pueden faltar decisiones rápidas y empuje.', I: 'Puede faltar comunicación, ánimo y venta de las ideas.', S: 'Puede faltar constancia, paciencia y cuidado del clima.', C: 'Puede faltar rigor, control de calidad y análisis.' }[k]}` }); });
    }
    if (out.faltan.length) out.avisos.push({ st: out.faltan.length > 2 ? 'stop' : 'warn', t: `Roles sin cubrir: ${out.faltan.map((k) => H.ROLES[k].n.toLowerCase()).join(', ')}. ${H.ROLES[out.faltan[0]].falta}` });
    if (out.tensiones.length) out.avisos.push({ st: 'warn', t: `${out.tensiones.length} posible${out.tensiones.length > 1 ? 's' : ''} punto${out.tensiones.length > 1 ? 's' : ''} de fricción entre estilos. No son conflictos: son diferencias que conviene pactar.` });
    if (miembros.length && conDisc.length < miembros.length) out.avisos.push({ st: 'info', t: `${miembros.length - conDisc.length} de ${miembros.length} personas no tienen aún su DISC: el análisis es parcial.` });
    // Próxima incorporación: el rol que más falta y el estilo menos presente
    if (conRoles.length || conDisc.length) {
      const rolF = out.faltan[0] || (conRoles.length ? out.cobertura.slice().sort((a, b) => (a.best ? a.best.v : 0) - (b.best ? b.best.v : 0))[0].k : null);
      const estF = conDisc.length ? ['D', 'I', 'S', 'C'].sort((a, b) => out.dist[a] - out.dist[b] || (out.media[a] - out.media[b]))[0] : null;
      out.contratar = { rol: rolF, estilo: estF };
    }
    return out;
  };

  /* ---------- Estructura: organigrama y puestos ---------- */
  R.estructura = () => {
    const ps = R.state.personas, pu = R.state.puestos;
    const hijos = (id) => ps.filter((p) => p.responsable === id);
    const raices = ps.filter((p) => !p.responsable || !R.persona(p.responsable));
    const mandos = ps.filter((p) => hijos(p.id).length).map((p) => ({ p, n: hijos(p.id).length }));
    const nivel = (p) => { let k = 0, c = p; const seen = new Set(); while (c && c.responsable && R.persona(c.responsable) && !seen.has(c.id) && k < 30) { seen.add(c.id); c = R.persona(c.responsable); k++; } return k; };
    const niveles = ps.length ? Math.max(...ps.map(nivel)) + 1 : 0;
    const ocupantes = (id) => ps.filter((p) => p.puestoId === id);
    const avisos = [];
    if (ps.length > 1 && raices.length > 1) avisos.push({ st: 'warn', t: `${raices.length} personas no dependen de nadie (${raices.slice(0, 4).map((p) => p.nombre).join(', ')}${raices.length > 4 ? '…' : ''}). Lo normal es una sola cabecera: revisa de quién depende cada una.` });
    mandos.filter((m) => m.n > 8).forEach((m) => avisos.push({ st: 'warn', t: `${m.p.nombre} tiene ${m.n} personas a su cargo: más de 8 suele significar poco tiempo para cada una. Valora un mando intermedio.` }));
    mandos.filter((m) => m.n === 1 && ps.length > 4).forEach((m) => avisos.push({ st: 'info', t: `${m.p.nombre} tiene una sola persona a su cargo: un nivel que quizá no hace falta.` }));
    if (niveles > 4 && ps.length < 50) avisos.push({ st: 'warn', t: `${niveles} niveles jerárquicos para ${ps.length} personas: demasiadas capas para una pyme; la información tarda en subir y bajar.` });
    pu.filter((x) => x.critico).forEach((x) => {
      const occ = ocupantes(x.id);
      if (!occ.length) avisos.push({ st: 'stop', t: `El puesto crítico «${x.nombre}» está sin cubrir.` });
      else if (!x.sucesor || !R.persona(x.sucesor)) avisos.push({ st: 'stop', t: `El puesto crítico «${x.nombre}» no tiene sucesor: si ${occ[0].nombre} falta, nadie puede asumirlo.` });
    });
    pu.filter((x) => !x.critico && !ocupantes(x.id).length).forEach((x) => avisos.push({ st: 'info', t: `El puesto «${x.nombre}» está definido pero sin persona asignada.` }));
    const sinPuesto = ps.filter((p) => !R.puestoDe(p));
    if (sinPuesto.length) avisos.push({ st: 'info', t: `${sinPuesto.length} persona${sinPuesto.length > 1 ? 's' : ''} sin puesto asignado: sin puesto no se puede medir el encaje.` });
    // Áreas que dependen de una sola persona
    const areas = {}; ps.forEach((p) => { const a = p.area || (R.puestoDe(p) || {}).area; if (a) (areas[a] = areas[a] || []).push(p); });
    Object.keys(areas).filter((a) => areas[a].length === 1 && ps.length > 3).forEach((a) => avisos.push({ st: 'warn', t: `El área de ${a} depende de una sola persona (${areas[a][0].nombre}).` }));
    return { raices, mandos, hijos, niveles, ocupantes, avisos, sinPuesto, areas };
  };

  /* ---------- 9-box: desempeño × potencial ---------- */
  R.CAJAS = {
    '3-1': { n: 'Enigma', a: 'Mucho potencial que no se ve en resultados: revisa si el puesto le encaja y qué le frena.' },
    '3-2': { n: 'Talento en desarrollo', a: 'Dale retos y formación: es cantera para puestos de más responsabilidad.' },
    '3-3': { n: 'Estrella', a: 'Retén y prepara para el siguiente paso; buena candidata a sucesora en puestos críticos.' },
    '2-1': { n: 'Por ajustar', a: 'Objetivos claros y acompañamiento; revisa el encaje con el puesto.' },
    '2-2': { n: 'Pilar', a: 'Base estable del equipo: reconoce y desarrolla en su puesto.' },
    '2-3': { n: 'Alto desempeño', a: 'Reconoce, amplía responsabilidades y valora si puede crecer más.' },
    '1-1': { n: 'Situación de riesgo', a: 'Conversación franca, plan de mejora concreto y revisa si el puesto es el adecuado.' },
    '1-2': { n: 'Eficaz', a: 'Cumple en su puesto: mantén la motivación y el reconocimiento.' },
    '1-3': { n: 'Experto de confianza', a: 'Aprovecha su conocimiento: que forme a otros y documente lo que sabe.' }
  };
  R.caja = (p) => (p.val && p.val.desempeno && p.val.potencial ? p.val.potencial + '-' + p.val.desempeno : null);

  /* ---------- Tablillas: se proponen solas con su motivo ---------- */
  const tab = (id) => H.TABLILLAS.find((t) => t.id === id);
  const MAS_DISC = { D: 'r-impulsor', I: 'r-investigador', S: 'r-cohesionador', C: 'r-finalizador' };
  R.tablillasDe = (p) => {
    const out = [], add = (id, motivo, prio) => { const t = tab(id); if (!t) return; const ya = out.find((x) => x.t.id === id); if (ya) { if (!ya.motivos.includes(motivo)) ya.motivos.push(motivo); ya.prio = Math.min(ya.prio, prio); return; } out.push({ t, motivos: [motivo], prio }); };
    const pu = R.puestoDe(p), enc = R.encaje(p, pu);
    if (enc) enc.brechas.forEach((b) => { if (b.tipo === 'rol') add('r-' + b.k, `Su puesto (${pu.nombre}) pide el rol de ${H.ROLES[b.k].n.toLowerCase()}.`, 1); else if (b.d > 0) add(MAS_DISC[b.k], `Su puesto pide más ${H.DISC[b.k].n.toLowerCase()}.`, 1); });
    if (p.disc) { const e = R.discEstilo(p.disc); if (p.disc[e.pri] >= 65) H.TABLILLAS.filter((t) => t.cuando.disc === e.pri).forEach((t) => add(t.id, `Su estilo principal es ${H.DISC[e.pri].n.toLowerCase()} (${p.disc[e.pri]}): entrena sus excesos.`, 2)); }
    if (p.enea && p.enea.tipo) add('e-' + p.enea.tipo, `Eneatipo ${p.enea.tipo} · ${H.ENEA[p.enea.tipo].n}.`, 3);
    R.state.equipos.filter((q) => q.miembros.includes(p.id)).forEach((q) => {
      const an = R.analizarEquipo(q.miembros);
      an.faltan.forEach((k) => { if (p.roles && p.roles.scores && p.roles.scores[k] >= 45) add('r-' + k, `Al equipo ${q.nombre} le falta el rol de ${H.ROLES[k].n.toLowerCase()} y es quien más cerca está de cubrirlo.`, 1); });
    });
    return out.sort((a, b) => a.prio - b.prio);
  };
  R.tablillasEquipo = (an) => {
    const out = [];
    an.faltan.forEach((k) => out.push({ t: tab('r-' + k), motivos: [`Falta el rol de ${H.ROLES[k].n.toLowerCase()}: ${H.ROLES[k].falta}`] }));
    if (an.tensiones.length || an.avisos.some((a) => /homogéneo/.test(a.t))) out.push({ t: tab('q-acuerdo'), motivos: ['Hay estilos que chocan o muy parecidos: conviene pactar cómo se trabaja.'] });
    out.push({ t: tab('q-revision'), motivos: ['Recomendada para todos los equipos.'] });
    return out.filter((x) => x.t);
  };

  /* ---------- Resumen de la organización ---------- */
  R.resumen = () => {
    const ps = R.state.personas, n = ps.length;
    const c = (f) => ps.filter(f).length;
    const enc = ps.map((p) => R.encaje(p, R.puestoDe(p))).filter((e) => e && e.total != null);
    const todo = R.analizarEquipo(ps.map((p) => p.id));
    const est = R.estructura();
    return {
      n, consent: c((p) => p.consentimiento), disc: c((p) => p.disc), roles: c((p) => p.roles && p.roles.scores), enea: c((p) => p.enea && p.enea.tipo),
      encMedio: enc.length ? r0(enc.reduce((a, e) => a + e.total, 0) / enc.length) : null, encBajo: enc.filter((e) => e.st === 'stop').length, enc: enc.length,
      todo, est, criticosSinSucesor: est.avisos.filter((a) => /no tiene sucesor|sin cubrir/.test(a.t) && a.st === 'stop').length,
      evaluados: c((p) => R.caja(p))
    };
  };

  /* ---------- Componentes visuales ---------- */
  R.pill = (st, t) => `<span class="state st-${st}">${esc(t)}</span>`;
  R.bar = (v, color, lbl) => `<div class="pe-bar"><span style="width:${clamp(v, 0, 100)}%;background:${color || 'var(--gold)'}"></span>${lbl != null ? `<b>${lbl}</b>` : ''}</div>`;
  R.discBars = (d, ideal) => `<div class="pe-disc">${['D', 'I', 'S', 'C'].map((k) => `<div class="pe-dc"><div class="pe-dcol"><span class="pe-dfill" style="height:${d[k]}%;background:${H.DISC[k].c}"></span>${ideal ? `<span class="pe-dideal" style="bottom:${ideal[k]}%" title="Lo que pide el puesto: ${ideal[k]}"></span>` : ''}</div><b>${d[k]}</b><small>${k} · ${H.DISC[k].n}</small></div>`).join('')}</div>`;
  /* Rueda DISC con un punto por persona */
  R.rueda = (personas, opts) => {
    opts = opts || {};
    const S = 300, c = S / 2, rr = 120;
    const pts = personas.filter((p) => p.disc).map((p) => ({ p, ...R.discXY(p.disc), e: R.discEstilo(p.disc) }));
    const cuad = [['D', -1, -1], ['I', 1, -1], ['S', 1, 1], ['C', -1, 1]];
    return `<svg class="pe-rueda" viewBox="0 0 ${S} ${S}" role="img" aria-label="Rueda DISC con ${pts.length} personas">
      ${cuad.map(([k, sx, sy]) => { const a0 = { D: 180, I: 270, S: 0, C: 90 }[k] * Math.PI / 180, a1 = a0 + Math.PI / 2; return `<path d="M${c},${c} L${c + rr * Math.cos(a0)},${c + rr * Math.sin(a0)} A${rr},${rr} 0 0 1 ${c + rr * Math.cos(a1)},${c + rr * Math.sin(a1)} Z" fill="${H.DISC[k].c}" fill-opacity="0.13" stroke="${H.DISC[k].c}" stroke-opacity="0.35"/><text x="${c + sx * 100}" y="${c + sy * 100 + 5}" text-anchor="middle" class="pe-rk" fill="${H.DISC[k].c}">${k}</text>`; }).join('')}
      <circle cx="${c}" cy="${c}" r="${rr * 0.5}" fill="none" stroke="rgba(255,255,255,0.08)"/>
      ${pts.map((o, i) => { const x = c + o.x * rr * 0.92, y = c - o.y * rr * 0.92; return `<g class="pe-pt" data-pid="${o.p.id}"><circle cx="${x}" cy="${y}" r="${opts.grande ? 9 : 7}" fill="${H.DISC[o.e.pri].c}" stroke="#060a17" stroke-width="2"><title>${esc(o.p.nombre)} · ${esc(o.e.nombre)}</title></circle>${pts.length <= 14 ? `<text x="${x}" y="${y - 12}" text-anchor="middle" class="pe-pn">${esc(o.p.nombre.split(' ')[0])}</text>` : ''}</g>`; }).join('')}
    </svg>`;
  };
  R.avisos = (list) => (list.length ? `<div class="pe-avisos">${list.map((a) => `<div class="alert ${a.st === 'info' ? 'info' : a.st}">${esc(a.t)}</div>`).join('')}</div>` : '<div class="alert info">Sin avisos con los datos actuales.</div>');
  R.selPersona = (id, actual, filtro) => `<select class="input" id="${id}">${R.state.personas.filter(filtro || (() => true)).map((p) => `<option value="${p.id}" ${p.id === actual ? 'selected' : ''}>${esc(p.nombre)}${R.puestoDe(p) ? ' · ' + esc(R.puestoDe(p).nombre) : ''}</option>`).join('')}</select>`;
  R.vacia = (txt, btn) => `<div class="glass pad stack pe-empty"><p>${txt}</p>${btn ? `<div class="row"><button class="btn solid" data-go="personas">${btn}</button></div>` : ''}</div>`;
  R.aviso = () => `<div class="note pe-etica"><b>Uso responsable.</b> ${esc(H.AVISO)}</div>`;
  R.tablillaHTML = (t, motivos) => `<article class="pe-tab"><header><span class="pe-tk">${esc(t.para)}</span><h4>${esc(t.titulo)}</h4></header><p><b>Objetivo:</b> ${esc(t.objetivo)}</p><ol>${t.pasos.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><p class="small"><b>Duración:</b> ${esc(t.duracion)} · <b>Señal de avance:</b> ${esc(t.senal)}</p>${motivos && motivos.length ? `<p class="small pe-why">Por qué: ${motivos.map(esc).join(' ')}</p>` : ''}</article>`;

  /* Persona activa en las herramientas (se recuerda entre módulos) */
  R.activa = null;
  R.personaActiva = () => { let p = R.persona(R.activa); if (!p) { p = R.state.personas[0] || null; R.activa = p ? p.id : null; } return p; };

  /* ---------- Módulos y navegación ---------- */
  R.register = (m) => R.modules.push(m);
  R.mod = (id) => R.modules.find((m) => m.id === id);
  const GRUPOS = ['Visión', 'Herramientas', 'Estructura', 'Equipos', 'Desarrollo'];
  let current = 'panorama';
  function buildTabs() {
    const host = $('#peTabs');
    host.innerHTML = GRUPOS.map((g) => R.modules.filter((m) => m.grupo === g).map((m) => `<button role="tab" data-t="${m.id}" aria-selected="${m.id === current}">${m.nombre}</button>`).join('')).join('<span class="tabsep" aria-hidden="true"></span>');
    $$('button', host).forEach((b) => (b.onclick = () => show(b.dataset.t)));
  }
  function show(id, keep) {
    if (!R.mod(id)) return;
    current = id;
    $$('#peTabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === id));
    const sel = $(`#peTabs button[data-t="${id}"]`); if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
    const panel = $('#pePanel'), m = R.mod(id);
    const y = scrollY;
    panel.innerHTML = `<div class="st-repbar st-head"><div class="st-hd"><span class="st-kick">${esc(m.grupo)}</span><h2 class="st-title">${esc(m.nombre)}</h2>${m.pregunta ? `<p class="st-q">${esc(m.pregunta)}</p>` : ''}</div><span class="spacer"></span>${m.informe ? `<button class="btn" id="peRep">${esc(m.informeTxt || 'Generar informe')}</button>` : ''}</div><div class="pe-body stack" id="peBody"></div>`;
    const body = $('#peBody', panel);
    try { m.render(body); } catch (e) { body.innerHTML = `<div class="alert stop">No se pudo mostrar este módulo: ${esc(e.message)}</div>`; console.error(e); }
    const rb = $('#peRep', panel); if (rb) rb.onclick = () => m.informe();
    $$('[data-go]', panel).forEach((b) => (b.onclick = () => show(b.dataset.go)));
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sin historial */ }
    if (keep) { scrollTo({ top: y }); requestAnimationFrame(() => scrollTo({ top: y })); } else scrollTo({ top: 0 });
  }
  R.show = show;
  R.rerender = () => show(current, true);
  R.GRUPOS = GRUPOS;

  /* Datos de la empresa activa (para la portada de los informes) */
  R.empresa = () => { const e = P() && P().empresas && P().empresas.activa(); return { nombre: (e && e.nombre) || 'Mi empresa', sector: (e && e.sector) || '', plantilla: e && e.plantilla }; };

  /* Traer la plantilla del organigrama del sistema estratégico (si se dibujó allí) */
  R.organigramaEstrategia = async () => {
    let st = LS.get(P() && P().k ? P().k('atalaya.estrategia.v1') : 'atalaya.estrategia.v1');
    if (P()) { const r = await P().loadData('estrategia'); if (r) st = r; }
    const nodos = st && st.personas && st.personas.organigrama && st.personas.organigrama.nodos;
    return Array.isArray(nodos) ? nodos : [];
  };

  /* ---------- Arranque ---------- */
  R.start = async function () {
    A.sky && A.sky();
    const Pl = P();
    if (Pl) {
      const ok = await Pl.guard(); if (!ok) return;
      Pl.mountAccount($('#account'));
      if (Pl.empresas) await Pl.empresas.cargar();
    }
    R.state = LS.get(LSK());
    if (Pl) { const remote = await Pl.loadData('personas'); if (remote) R.state = remote; }
    R.state = Object.assign(R.vacio(), R.state || {});
    ['personas', 'puestos', 'equipos'].forEach((k) => { if (!Array.isArray(R.state[k])) R.state[k] = []; });
    R.state.equipos.forEach((q) => { q.miembros = (q.miembros || []).filter((id) => R.persona(id)); });
    buildTabs();
    const h = location.hash.replace('#', '');
    show(R.mod(h) ? h : 'panorama');
    addEventListener('hashchange', () => { const k = location.hash.replace('#', ''); if (R.mod(k) && k !== current) show(k); });
    // Detalle de una persona al tocar su punto en la rueda
    document.addEventListener('click', (e) => { const g = e.target.closest('.pe-pt'); if (g && R.fichaPersona) R.fichaPersona(g.dataset.pid); });
  };
})();
