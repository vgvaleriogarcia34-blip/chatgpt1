/* Atalaya 360° · Auditoría integral · Histórico de las transcripciones
   Todas las transcripciones de la cuenta, en orden y cada una en su fase (diagnóstico inicial, conversación
   comercial, sesiones de trabajo), leídas en conjunto y solo con las palabras de la empresa:
   · Secuencia: cómo se mueve el lenguaje de una sesión a otra (lo que habla el empresario, el «yo» frente al
     «nosotros», los huecos de definición, la tensión y la urgencia) y qué temas aparecen en cada una.
   · Alineamiento: si cada objetivo del empresario sigue presente en lo que dice sesión tras sesión.
   · Beneficios detectados en el lenguaje: logros y mejoras que la empresa cuenta con sus palabras.
   Se ve en «Escucha y transcripción», resumido en «Sesiones y seguimiento» y en los informes de seguimiento e
   integral. Las transcripciones de sesiones de trabajo se suben también desde «Sesiones y seguimiento». */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { $, esc, norm, pl, fCorta, guardar, toast, render, VISTAS } = V.int;
  const S = () => V.int.st();
  const C = () => V.cruce;
  const I = () => A.informe;

  const TEMAS = [
    ['Caja y pagos', ['caja', 'poliza', 'nomina', 'pagar', 'tesoreria', 'liquidez', 'banco']],
    ['Cobros', ['cobr', 'impago', 'vencid']],
    ['Margen y beneficio', ['margen', 'beneficio', 'rentab', 'ganamos', 'gano', 'perdemos']],
    ['Ventas y clientes', ['venta', 'vender', 'cliente', 'factur', 'pedido']],
    ['Inversores e inversión', ['inversor', 'inversion', 'invertir', 'capital', 'aportacion']],
    ['Equipo y responsables', ['equipo', 'encargado', 'responsable', 'plantilla', 'la gente', 'trabajador']],
    ['Su tiempo y delegar', ['delegar', 'tiempo', 'horas', 'agenda', 'encima', 'todo pasa por mi']],
    ['Procesos y orden', ['proceso', 'orden', 'metodo', 'manual', 'procedimiento']],
    ['Gobierno y socios', ['socio', 'mi padre', 'familia', 'decid', 'gobierno']],
    ['Proyectos', ['proyecto', 'obra', 'nave', 'compra', 'reforma']]
  ];
  // Logros y mejoras contados por la empresa
  const BENEF = /(hemos conseguido|hemos logrado|lo hemos (hecho|cerrado|resuelto)|ya (no|tenemos|sabemos|hemos|funciona|cobramos|cerramos)|ahora (si|ya|tenemos|sabemos|puedo|podemos)|he (ganado|recuperado|liberado|conseguido)|hemos (cerrado|vendido|cobrado|reducido|subido|bajado|ahorrado|ganado|firmado)|ahorr(o|amos|ado)|mas tiempo|menos horas|por fin|funciona (mejor|bien)|esta funcionando|ha mejorado|hemos mejorado|mucho mejor)/;
  const frasesE = (tr) => { const set = C().clientesDe(tr); return tr.turnos.filter((x) => set.has(x.h)).flatMap((x) => (C().soloEmpresa(x.t) || '').match(/[^.!?]+[.!?]*/g) || []).map((f) => f.trim()).filter((f) => f.split(/\s+/).length >= 3); };
  const palabrasClave = (t) => [...new Set(norm(t).split(/[^a-zñ]+/).filter((w) => w.length > 4 && !/^(hacer|tener|sobre|entre|desde|hasta|para|quiero|queremos|empresa|pasando|antes|horas|semana)$/.test(w)))].slice(0, 8);

  const calcular = () => {
    const trs = S().transcripciones.filter((t) => t.usar !== false).slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || 0);
    const objs = (S().objetivos || []).filter((o) => (o.especifica || o.dice) && !(V.objSmart && V.objSmart.esContrato(o)));
    const filas = trs.map((tr, i) => {
      const fr = frasesE(tr), txt = norm(fr.join(' ')), an = tr.analisis || {}, est = C().estimar ? C().estimar(tr) : {};
      const temas = TEMAS.filter(([, ks]) => ks.some((k) => txt.includes(k))).map(([n]) => n);
      const benef = fr.filter((f) => BENEF.test(norm(f)) && !/\?/.test(f)).slice(0, 6);
      const alin = objs.map((o) => { const ks = palabrasClave((o.especifica || '') + ' ' + (o.indicador || '') + ' ' + (o.dice || '')); return ks.filter((k) => txt.includes(k)).length >= 2; });
      return { tr, i, fase: tr.momento || 'primera', palabras: an.palabras || 0, pct: an.pctCliente || 0, huecos: an.huecos ? an.huecos.filter((h) => h.peso).length : 0, yo: an.yo || 0, nos: an.nos || 0, tension: est.tension || 0, temperatura: est.temperatura || 0, dependencia: est.dependencia || 0, temas, benef, alin };
    });
    return { filas, objs };
  };
  const flecha = (a, b, menosEsMejor) => { if (a == null || b == null || a === b) return '='; const sube = b > a; return (sube !== !!menosEsMejor) ? '↑ mejora' : '↓ empeora'; };
  const tendencia = (H) => {
    const l = H.filas.filter((f) => f.palabras); if (l.length < 2) return [];
    const a = l[0], b = l[l.length - 1], r = (f) => (f.yo + f.nos ? (f.nos ? f.yo / f.nos : f.yo) : null), fr = (v) => (v == null ? '—' : v.toFixed(1).replace('.', ','));
    return [['Habla el empresario', a.pct + ' %', b.pct + ' %', b.pct === a.pct ? '=' : 'Cambia'], ['«Yo» por cada «nosotros»', fr(r(a)), fr(r(b)), flecha(r(a), r(b), true)], ['Huecos de definición con cita', String(a.huecos), String(b.huecos), flecha(a.huecos, b.huecos, true)], ['Tensión (lenguaje, 1-5)', String(a.tension || '—'), String(b.tension || '—'), flecha(a.tension, b.tension, true)], ['Urgencias (lenguaje, 1-5)', String(a.temperatura || '—'), String(b.temperatura || '—'), flecha(a.temperatura, b.temperatura, true)], ['Dependencia (lenguaje, 1-5)', String(a.dependencia || '—'), String(b.dependencia || '—'), flecha(a.dependencia, b.dependencia, true)]];
  };
  const htmlHistorico = (H, compacto) => {
    const F = C().FASE_N, f = H.filas; if (!f.length) return '<p class="small muted" style="margin:0">Aún no hay transcripciones.</p>';
    const tab = (cab, filas) => `<div class="table-wrap"><table class="ms-tab"><thead><tr>${cab.map((c, i) => `<th${i === 0 ? ' style="text-align:left"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' style="text-align:left"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    let h = `<div class="eyebrow">Secuencia</div>` + tab(['#', 'Fecha', 'Fase', 'Transcripción', 'Habla el empresario', 'Yo/nos', 'Huecos', 'Tensión', 'Temas'], f.map((x) => [String(x.i + 1), fCorta(x.tr.fecha), esc(F[x.fase] || x.fase), esc(x.tr.nombre), x.pct + ' %', `${x.yo}/${x.nos}`, String(x.huecos), String(x.tension || '—'), esc(x.temas.join(', ') || '—')]));
    const td = tendencia(H); if (td.length) h += `<div class="eyebrow">De la primera a la última</div>` + tab(['Lenguaje', 'Primera', 'Última', 'Tendencia'], td.map((r) => r.map(esc)));
    if (!compacto) {
      const temasT = TEMAS.map(([n]) => n).filter((n) => f.some((x) => x.temas.includes(n)));
      if (temasT.length) h += `<div class="eyebrow">Temas sesión a sesión</div>` + tab(['Tema'].concat(f.map((x) => String(x.i + 1))).concat(['Presente']), temasT.map((n) => [esc(n)].concat(f.map((x) => (x.temas.includes(n) ? '●' : '·'))).concat([`${f.filter((x) => x.temas.includes(n)).length}/${f.length}`])));
    }
    if (H.objs.length) h += `<div class="eyebrow">Alineamiento con sus objetivos</div><p class="small muted" style="margin:0">Si cada objetivo sigue apareciendo en lo que dice la empresa. Un objetivo que desaparece del lenguaje en las sesiones de trabajo conviene revisarlo con él.</p>` + tab(['Objetivo'].concat(f.map((x) => String(x.i + 1))).concat(['Sesiones de trabajo']), H.objs.map((o, k) => { const tr = f.filter((x) => x.fase === 'intervencion'); const n = tr.filter((x) => x.alin[k]).length; return [esc(o.especifica || o.dice)].concat(f.map((x) => (x.alin[k] ? '●' : '·'))).concat([tr.length ? `${n}/${tr.length}${n === 0 ? ' · revisar' : ''}` : '—']); }));
    const bs = f.flatMap((x) => x.benef.map((b) => ({ x, b })));
    h += `<div class="eyebrow">Beneficios detectados en el lenguaje</div>` + (bs.length ? tab(['Lo que dijo la empresa', 'Fecha', 'Fase'], bs.slice(0, compacto ? 5 : 20).map(({ x, b }) => [`«${esc(b)}»`, fCorta(x.tr.fecha), esc(F[x.fase] || x.fase)])) : '<p class="small muted" style="margin:0">Todavía no hay logros contados por la empresa en las transcripciones.</p>');
    return h;
  };
  V.historico = { calcular, html: htmlHistorico };

  // En «Escucha y transcripción»: el histórico completo
  const esc0 = VISTAS.escucha;
  VISTAS.escucha = (host) => {
    esc0(host);
    if (!S().transcripciones.length) return;
    const sec = document.createElement('section'); sec.className = 'glass pad stack iv-hist';
    sec.innerHTML = `<div><div class="eyebrow">Histórico de las transcripciones</div><small class="muted">Todas las transcripciones de la cuenta, en orden y cada una en su fase, leídas en conjunto y solo con las palabras de la empresa.</small></div>` + htmlHistorico(calcular());
    const ref = host.querySelector('.iv-cuenta'); if (ref) ref.after(sec); else host.appendChild(sec);
  };

  // En «Sesiones y seguimiento»: subir las transcripciones de las sesiones de trabajo y ver el histórico resumido
  const ses0 = VISTAS.sesiones;
  VISTAS.sesiones = (host) => {
    ses0(host);
    const ST = S(), sel = ST.sesiones.find((x) => x.id === V.int.get('sesSel')) || ST.sesiones.find((x) => x.fecha >= V.int.hoy()) || ST.sesiones[0];
    const card = document.createElement('section'); card.className = 'glass pad stack iv-sesup';
    card.innerHTML = `<div class="row"><div><div class="eyebrow">Transcripciones de las sesiones de trabajo</div><small class="muted">Súbelas aquí: se guardan como sesión de trabajo${sel ? ` y se vinculan a la sesión del ${fCorta(sel.fecha)}` : ''}; de ellas salen el acta, los acuerdos y el avance de los objetivos, y entran en el histórico.</small></div><span class="spacer"></span><label class="btn solid small">Subir transcripciones<input type="file" id="ivSesFile" multiple accept=".txt,.md,.srt,.vtt,.docx,.pdf,.json" hidden></label></div>
      ${ST.transcripciones.length ? htmlHistorico(calcular(), true) : ''}`;
    host.prepend(card);
    $('#ivSesFile', card).onchange = async (e) => {
      const nuevas = []; for (const fl of [...e.target.files]) { try { const t = C().nuevaTr(fl.name.replace(/\.[^.]+$/, ''), await V.int.E.leerArchivo(fl), C().fechaDelNombre(fl.name) || (sel && sel.fecha), 'intervencion'); if (t) { if (sel && !C().fechaDelNombre(fl.name)) t.sesion = sel.id; nuevas.push(t); } } catch (x) { toast(`«${fl.name}»: ${x.message}`); } }
      if (!nuevas.length) return; const r = C().procesar(nuevas); guardar(); render(); toast(`${pl(nuevas.length, 'transcripción de sesión de trabajo', 'transcripciones de sesiones de trabajo')}${r.length ? ': ' + r.join('; ') : ''}.`);
    };
  };

  // En los informes de seguimiento e integral
  const anadir = (k, titulo, nota) => { const o = V.informes[k]; if (!o) return; V.informes[k] = (...a) => { const In = I(), op = In.open; In.open = (cfg) => { In.open = op; try { if (S().transcripciones.length) cfg.html = cfg.html.replace(/<footer class="rp-foot"/, In.section(titulo, htmlHistorico(calcular(), k === 'seguimiento'), nota) + '<footer class="rp-foot"'); } catch (e) { console.error(e); } return op(cfg); }; try { return o(...a); } finally { /* In.open se restaura al usarse */ } }; };
  anadir('seguimiento', 'Histórico de la conversación', 'Cómo evoluciona el lenguaje de la empresa de una sesión a otra, si sus objetivos siguen presentes y qué logros cuenta con sus palabras.');
  anadir('auditoria', 'Histórico de las transcripciones', 'Todas las transcripciones en orden y por fase (diagnóstico inicial, comercial y sesiones de trabajo), solo con las palabras de la empresa.');
})();
