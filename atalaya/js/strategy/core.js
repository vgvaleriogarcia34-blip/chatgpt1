/* Atalaya · Sistema estratégico · núcleo
 * Estado compartido, módulos, tablas editables con importación de documentos y dictado,
 * cuadro de mando cruzado, riesgos agregados y API para el asistente.
 */
(function () {
  const A = window.Atalaya, F = A.fmt;
  const S = (A.strat = { modules: [], state: null, sim: null });
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  S.$ = $; S.$$ = $$; S.esc = esc; S.css = css;
  // Claves de la empresa activa (la principal conserva las de siempre)
  const PK = (k) => (A.platform && A.platform.k ? A.platform.k(k) : k);
  const LSK = PK('atalaya.estrategia.v1'), SIMK = PK('atalaya.v1');
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } } };
  const stName = { ok: 'Verde', warn: 'Ámbar', stop: 'Rojo' };
  S.stName = stName;
  S.num = (v) => { const n = typeof v === 'number' ? v : A.fin.parseNum(v); return isFinite(n) ? n : 0; };
  S.pct = (a, b) => (b ? (a / b) * 100 : 0);

  /* ---------- Módulos ---------- */
  /* Sin dato no es cero: un módulo con «datos()» que devuelve false no tiene indicadores con estado, ni riesgos ni hallazgos.
     Sus indicadores salen como «Sin datos» (st null, sinDato) y quedan fuera de la nota, del DAFO, de las prioridades y del tablero. */
  // Datos reales de una empresa del usuario (la empresa modelo es una demostración: conserva su contenido completo)
  // Dentro de un informe de una empresa con datos propios (S._propios, ver S.inf.conPropios) se calcula como con datos reales
  S.real = () => !!(S._propios || (A.platform && A.platform.modoReal && A.platform.modoReal() && !(A.platform.modelo && A.platform.modelo.activa && A.platform.modelo.activa())));
  S.simConDatos = () => { const e = S.sim && S.sim.empresa; return !!(e && S.num(e.ventas) > 0 && !(S.real() && A.simEsEjemplo && A.simEsEjemplo(S.sim))); };
  // Cuenta de resultados con algo más que las ventas (margen, personal o gastos fijos): sin ella no hay beneficio que valorar ni impuestos que prever
  S.simPyg = () => { const e = S.sim && S.sim.empresa; return !!(S.simConDatos() && e && (S.num(e.margen) > 0 || S.num(e.personal) > 0 || S.num(e.fijos) > 0)); };
  /* ¿La cuenta de resultados del simulador sigue siendo la del ejemplo aunque se hayan cambiado las ventas? (con «datos de
     ejemplo permitidos» lo que no se toca conserva el valor de ejemplo, también el que el sector ajusta) */
  S.simPygEjemplo = () => {
    const e = S.sim && S.sim.empresa; if (!e || !A.defaultState) return false;
    const d = A.defaultState(), ds = A.applySector ? A.applySector(A.defaultState(), S.sim.sector) : d;
    return ['margen', 'personal', 'fijos', 'plantilla'].filter((k) => S.num(e[k]) !== 0 && (S.num(e[k]) === S.num(d.empresa[k]) || S.num(e[k]) === S.num(ds.empresa[k]))).length >= 3;
  };
  // Preguntas del equipo respondidas: las de la simulación a cero (A.simVacio) no pueden estar todas a cero
  S.humanoConDatos = () => { const h = S.sim && S.sim.humano; return !!(h && (A.simVacio ? Object.keys(A.simVacio().humano) : Object.keys(h)).some((k) => S.num(h[k]) > 0)); };
  S.invDefinida = () => { const v = S.sim && S.sim.inversion; return !!(v && (S.num(v.importe) > 0 || (v.lineas || []).some((l) => S.num(l.importe) > 0))); };
  S.conDatos = (m) => { m = typeof m === 'string' ? S.mod(m) : m; if (!m || !m.datos) return true; try { return !!m.datos(); } catch (e) { return false; } };
  S.SIN_DATO = 'Sin datos';
  const envolver = (m) => {
    ['kpis', 'risks', 'findings'].forEach((f) => { const o = m[f]; if (typeof o !== 'function') return;
      m[f] = function () {
        if (S.noAplica && S.noAplica(m.id)) return [];
        if (S.conDatos(m)) { const r = o.apply(this, arguments) || []; return f === 'kpis' ? r.map((k) => (k && k.sinDato ? Object.assign({}, k, { st: null }) : k)) : r; }
        if (f !== 'kpis') return [];
        let l = []; try { l = o.apply(this, arguments) || []; } catch (e) { l = []; }
        return l.map((k) => ({ k: k.k, v: S.SIN_DATO, st: null, sinDato: true }));
      }; });
  };
  S.register = (m) => { envolver(m); if (m.first) S.modules.unshift(m); else S.modules.push(m); };
  S.mod = (id) => S.modules.find((m) => m.id === id);
  S.defaults = {};
  // Aviso de datos guardados en la página del sistema estratégico (el asistente comprueba si se ha entregado un área)
  const avisarDatos = () => { if (!S.__vivo) return; try { dispatchEvent(new CustomEvent('atalaya:datos', { detail: { mundo: 'estrategia' } })); } catch (e) { /* sin eventos */ } };
  // Al guardar se recalcula también la nota (así la de este mundo no se queda con la foto de antes del cambio)
  S.save = (() => { let t; return () => { LS.set(LSK, S.state); clearTimeout(t); t = setTimeout(() => { if (A.platform) A.platform.saveData('estrategia', S.state); if (A.nota && A.nota.refrescar) A.nota.refrescar(); avisarDatos(); }, 1200); S.refreshKpis(); }; })();
  S.saveSim = () => { LS.set(SIMK, S.sim); A.platform && A.platform.saveData('simulador', S.sim); if (A.nota && A.nota.refrescar) setTimeout(() => A.nota.refrescar(), 600); setTimeout(avisarDatos, 1200); };

  /* Datos de la empresa que vienen del simulador */
  S.empresa = () => S.sim.empresa;
  S.analysis = (esc) => A.analyze(S.sim, A.scenarioMods(S.sim, esc || S.sim.escenario || 'base'));
  // Ventas y EBITDA de la fuente única (js/cifras.js), la misma que usan el simulador, el tablero, la auditoría y la cartera
  S.cifras = () => (A.cifras ? A.cifras.desdeSim(S.sim, A.platform && A.platform.empresas && A.platform.empresas.activa ? A.platform.empresas.activa() : null) : null);
  S.baseYear = () => {
    const e = S.sim.empresa, c = S.cifras();
    const ebitda = c && c.ebitda != null ? c.ebitda : e.ventas * e.margen / 100 - e.personal - e.fijos;
    return { ventas: c && c.ventas != null ? c.ventas : e.ventas, costeVentas: e.ventas * (1 - e.margen / 100), personal: e.personal, fijos: e.fijos, ebitda };
  };

  /* ---------- Componentes ---------- */
  // Mientras se pinta un módulo sin datos, sus fichas dicen «Sin datos» y no llevan semáforo
  S.kpiTiles = (list) => `<div class="kpis" style="margin-top:0">${list.map((t) => (S._vacio && !t.fijo ? Object.assign({}, t, { v: S.SIN_DATO, st: null, d: '' }) : t)).map((t) => `<div class="kpi" ${t.info ? `data-term="${esc(t.info)}" data-val="${esc(String(t.v).replace(/<[^>]+>/g, ''))}" data-st="${t.st || ''}" data-ctx="${esc(t.exp || '')}" tabindex="0" role="button" aria-label="${esc(t.k)}: qué significa"` : ''}><div class="k"><span>${t.k}</span>${t.st ? `<span class="state st-${t.st}">${stName[t.st]}</span>` : ''}</div><div class="v">${t.v}</div>${t.d ? `<div class="d">${t.d}</div>` : ''}</div>`).join('')}</div>`;
  // Módulo que se calcula con las cuentas del simulador y aún no las tiene: estado vacío en lugar de cifras a cero
  S.vacioSim = (host, titulo, lede) => {
    host.innerHTML = `${S.section(titulo, lede)}<div class="glass pad stack st-vacio"><p style="margin:0"><b>Sin datos de la empresa.</b> Este módulo se calcula con sus cuentas (ventas, márgenes, gastos, caja y deuda). Mientras no estén cargadas no muestra cifras ni semáforos: nada de lo que falta se toma como cero.</p><div class="row"><a class="btn solid" href="app.html#empresa">Cargar las cuentas o responder las preguntas</a><button class="btn ghost" data-vs-origen>Origen de datos</button></div></div>`;
    const b = host.querySelector('[data-vs-origen]'); if (b) b.onclick = () => S.show('origen');
  };
  S.note = (html) => `<div class="note">${html}</div>`;
  S.section = (title, lede, inner) => `<div class="eyebrow">${title}</div>${lede ? `<p class="lede">${lede}</p>` : ''}${inner || ''}`;

  /* Tabla editable genérica.
     cols: [{k, l, type: 'text'|'num'|'select'|'date'|'bool', opts, syn: [sinónimos para importar], calc(row) → texto, w}] */
  S.etable = function (host, cfg) {
    const { cols, rows, onChange, nuevo, titulo, dictar } = cfg;
    const id = 'et' + Math.random().toString(36).slice(2, 7);
    const head = `<tr>${cols.map((c) => `<th style="${c.type === 'text' ? 'text-align:left' : ''}">${c.l}</th>`).join('')}<th></th></tr>`;
    const cell = (c, r, i) => {
      if (c.calc) return `<td class="calc">${c.calc(r, i)}</td>`;
      const v = r[c.k] == null ? '' : r[c.k];
      if (c.type === 'select') return `<td><select data-i="${i}" data-k="${c.k}" class="input">${c.opts.map((o) => `<option value="${esc(o.v || o)}" ${(o.v || o) === v ? 'selected' : ''}>${esc(o.l || o)}</option>`).join('')}</select></td>`;
      if (c.type === 'bool') return `<td style="text-align:center"><input type="checkbox" data-i="${i}" data-k="${c.k}" ${v ? 'checked' : ''}></td>`;
      const shown = c.type === 'num' && v !== '' ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(v) : v;
      return `<td><input data-i="${i}" data-k="${c.k}" class="${c.type === 'text' ? 'txt' : ''}" ${c.type === 'date' ? 'type="date"' : ''} value="${esc(shown)}" aria-label="${esc(c.l)}"></td>`;
    };
    host.innerHTML = `<div class="row" style="margin-bottom:8px">${titulo ? `<h4>${titulo}</h4>` : ''}<span class="spacer"></span>
        <button class="btn ghost" data-act="add">Añadir fila</button>
        <label class="btn ghost" for="${id}f">Importar documento</label><input type="file" id="${id}f" hidden accept=".xlsx,.xls,.ods,.csv,.tsv,.txt,.md,.pdf,.docx">
        <button class="btn ghost" data-act="paste">Pegar</button>${dictar ? '<button class="btn ghost" data-act="voice">Dictar</button>' : ''}</div>
      <textarea class="input" data-paste hidden rows="4" style="width:100%" placeholder="Pegue aquí filas copiadas de Excel con su cabecera"></textarea>
      <p class="small" data-msg></p>
      <div class="etable table-wrap"><table><thead>${head}</thead><tbody>${rows.map((r, i) => `<tr>${cols.map((c) => cell(c, r, i)).join('')}<td><button class="icon-btn" data-del="${i}" aria-label="Eliminar fila">×</button></td></tr>`).join('')}</tbody></table></div>`;
    const msg = (t, err) => { $('[data-msg]', host).innerHTML = `<span style="color:${err ? 'var(--stop)' : 'var(--go)'}">${esc(t)}</span>`; };
    $$('input[data-k], select[data-k]', host).forEach((inp) => inp.addEventListener('change', () => {
      const c = cols.find((x) => x.k === inp.dataset.k), r = rows[+inp.dataset.i];
      r[c.k] = c.type === 'num' ? S.num(inp.value) : c.type === 'bool' ? inp.checked : inp.value;
      onChange();
    }));
    $$('[data-del]', host).forEach((b) => b.onclick = () => { rows.splice(+b.dataset.del, 1); onChange(); });
    $('[data-act="add"]', host).onclick = () => { rows.push(nuevo ? nuevo() : {}); onChange(); };
    const schema = Object.fromEntries(cols.filter((c) => !c.calc).map((c) => [c.k, [c.l].concat(c.syn || [])]));
    const ingest = (table, origen) => {
      const objs = A.docs.mapTable(table, schema).map((o) => { const r = nuevo ? nuevo() : {}; cols.forEach((c) => { if (o[c.k] !== undefined) r[c.k] = c.type === 'num' ? S.num(o[c.k]) : c.type === 'bool' ? /^(s[ií]|x|1|true)$/i.test(String(o[c.k]).trim()) : String(o[c.k]).trim(); }); return r; });
      if (!objs.length) throw new Error('No hay filas con datos.');
      rows.push(...objs); onChange(); msg(`${origen}: ${objs.length} filas añadidas.`);
    };
    $('#' + id + 'f', host).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      msg('Leyendo ' + f.name + '…');
      try {
        const doc = await A.docs.read(f);
        let done = false, err = null;
        for (const h of doc.hojas) { try { ingest(h.rows, f.name); done = true; break; } catch (x) { err = x; } }
        if (!done) {
          const forma = `{"filas":[{${cols.filter((c) => !c.calc).map((c) => `"${c.k}":${c.type === 'num' ? 'número' : 'texto'}`).join(',')}}]}`;
          const ai = await A.docs.aiExtract(doc.texto, titulo || 'tabla', forma).catch(() => null);
          if (ai && Array.isArray(ai.filas) && ai.filas.length) { ai.filas.forEach((o) => { const r = nuevo ? nuevo() : {}; cols.forEach((c) => { if (o[c.k] !== undefined && o[c.k] !== null) r[c.k] = c.type === 'num' ? S.num(o[c.k]) : o[c.k]; }); rows.push(r); }); onChange(); msg(`${f.name}: ${ai.filas.length} filas extraídas con IA.`); }
          else throw err || new Error('No he reconocido la tabla.');
        }
      } catch (x) { msg(x.message, true); }
      e.target.value = '';
    };
    $('[data-act="paste"]', host).onclick = () => { const t = $('[data-paste]', host); t.hidden = !t.hidden; if (!t.hidden) t.focus(); };
    $('[data-paste]', host).onchange = (e) => { try { ingest(A.docs.textToRows(e.target.value), 'Tabla pegada'); } catch (x) { msg(x.message, true); } };
    const vb = $('[data-act="voice"]', host);
    if (vb) vb.onclick = async () => { msg('Escuchando…'); try { const t = await A.docs.dictate(); const r = dictar(t); if (!r) throw new Error('No lo he entendido: «' + t + '»'); rows.push(r); onChange(); msg('Añadido: «' + t + '»'); } catch (x) { msg(x.message, true); } };
  };

  /* ---------- Ejes y tamaño de los gráficos ---------- */
  /* Marcas «redondas» del eje (1, 2, 2,5 o 5 por potencia de diez) que siempre incluyen el cero si cae en el rango */
  S.ticks = (mn, mx, n, pasoMin) => {
    if (!isFinite(mn) || !isFinite(mx)) { mn = 0; mx = 1; }
    if (!(mx > mn)) mx = mn + (Math.abs(mn) || 1);
    const raw = (mx - mn) / Math.max(1, n || 4), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    const step = Math.max(pasoMin || 0, (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p);
    const lo = Math.floor(mn / step + 1e-9) * step, hi = Math.ceil(mx / step - 1e-9) * step, t = [];
    for (let k = 0, v = lo; v <= hi + step / 2 && k < 40; k++, v = lo + k * step) t.push(Math.abs(v) < step / 1e6 ? 0 : +v.toPrecision(12));
    return { t, lo, hi };
  };
  /* Ancho del dibujo según su contenedor (entre 360 y el máximo): en el móvil el texto conserva su tamaño */
  S.anchoSvg = (host, mx) => { mx = mx || 900; const w = host && host.clientWidth; return Math.round(w ? Math.max(360, Math.min(mx, w)) : mx); };
  /* Un único oyente de cambio de tamaño para todos los gráficos: cada uno se registra con su función de pintado
     y se vuelve a dibujar solo si cambia su ancho; los que ya no están en la página se olvidan */
  const RZ = new Map(); let rzT = null;
  S.alRedimensionar = (host, fn, mx) => { if (host) RZ.set(host, { fn, mx, w: S.anchoSvg(host, mx) }); };
  addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { RZ.forEach((o, h) => { if (!h.isConnected) { RZ.delete(h); return; } const w = S.anchoSvg(h, o.mx); if (w === o.w) return; o.w = w; try { o.fn(); } catch (e) { console.error(e); } }); }, 180); });
  /* Recorta con «…» los textos SVG marcados con data-fit (ancho máximo) y deja el texto completo en su <title> */
  S.encajar = (root) => { $$('text[data-fit]', root).forEach((t) => { const mx = +t.dataset.fit, full = t.textContent; if (!mx || !t.getComputedTextLength || t.getComputedTextLength() <= mx) return; let s = full; while (s.length > 2 && t.getComputedTextLength() > mx) { s = s.slice(0, -1); t.textContent = s.trimEnd() + '…'; } const ti = document.createElementNS('http://www.w3.org/2000/svg', 'title'); ti.textContent = full; t.appendChild(ti); }); };

  /* Gráfico de barras horizontal sencillo.
     opts.max: escala fija (100 para notas y porcentajes). Con valores negativos se dibuja divergente, con el cero marcado. */
  S.hbars = (items, fmt, color, opts) => {
    opts = opts || {};
    if (!items.length) return '<p class="small muted">Sin datos que mostrar.</p>';
    const vals = items.map((i) => (isFinite(i.v) ? i.v : 0));
    const neg = Math.max(0, ...vals.map((v) => -v)), pos = Math.max(0, ...vals);
    const fill = (i) => i.c || color || 'var(--gold)';
    const fila = (i, bar) => `<div class="mfrow" title="${esc(i.n)}: ${esc(String(fmt(i.v)).replace(/<[^>]+>/g, ''))}"><span>${esc(i.n)}</span>${bar}<span class="num" style="min-width:70px">${fmt(i.v)}</span></div>`;
    if (neg > 0 || opts.signed) {
      const tot = Math.max(opts.max || 0, neg + pos) || 1, z = (neg / tot) * 100;
      return `<div class="stack">${items.map((i, k) => { const v = vals[k], w = (Math.abs(v) / tot) * 100; return fila(i, `<span class="track div"><i class="cero" style="left:${z}%"></i><b style="left:${v < 0 ? z - w : z}%;width:${w}%;background:${fill(i)}"></b></span>`); }).join('')}</div>`;
    }
    const mx = opts.max || Math.max(1, pos);
    return `<div class="stack">${items.map((i, k) => fila(i, `<span class="track"><b style="width:${Math.min(100, (Math.abs(vals[k]) / mx) * 100)}%;background:${fill(i)}"></b></span>`)).join('')}</div>`;
  };
  /* Barras verticales con tooltip.
     Valores null = sin dato (sin barra y la línea se corta). opts.dom: [mín, máx] fijo del eje (p. ej. [0, 100] para notas); opts.enteros: marcas de uno en uno como mínimo (recuentos).
     opts.vacio: texto cuando todo es cero o no hay datos. El ancho sigue al contenedor y se redibuja al cambiar. */
  S.vbars = (host, labels, series, fmt, opts) => {
    if (!host) return;
    opts = opts || {};
    const ok = (v) => v != null && isFinite(v);
    const pinta = () => {
      const W = S.anchoSvg(host), Hh = opts.h || 220, estrecho = W < 600, m = { l: estrecho ? 54 : 64, r: 10, t: 10, b: 26 };
      const all = series.flatMap((s) => s.data).concat(opts.line ? opts.line.data : []).filter(ok);
      if (!all.length || all.every((v) => v === 0)) { host.innerHTML = `<p class="small muted chart-vacio">${esc(opts.vacio || 'Sin datos que dibujar todavía.')}</p>`; return; }
      const d0 = opts.dom || [Math.min(0, ...all), Math.max(0, ...all)];
      const { t, lo, hi } = S.ticks(Math.min(d0[0], ...all), Math.max(d0[1], ...all), estrecho ? 3 : 5, opts.enteros ? 1 : 0);
      const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (Hh - m.t - m.b);
      const gw = (W - m.l - m.r) / Math.max(1, labels.length), bw = (gw * 0.8) / Math.max(1, series.length);
      const cada = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor((W - m.l) / (estrecho ? 46 : 58)))));
      const cx = (i) => m.l + i * gw + gw / 2;
      // Descripción para lectores de pantalla: qué se dibuja, cuántos periodos y los extremos de la primera serie
      const s0 = series[0] || opts.line, v0 = s0 ? s0.data.map((v, i) => [v, i]).filter((x) => ok(x[0])) : [];
      const hiP = v0.length ? v0.reduce((a, b) => (b[0] > a[0] ? b : a)) : null, loP = v0.length ? v0.reduce((a, b) => (b[0] < a[0] ? b : a)) : null;
      const aria = `${opts.aria || 'Gráfico'}: ${labels.length} periodos; ${series.map((s) => s.n).concat(opts.line ? [opts.line.n] : []).join(', ')}${hiP ? `. ${s0.n}: máximo ${String(fmt(hiP[0])).replace(/<[^>]+>/g, '')} (${labels[hiP[1]]}), mínimo ${String(fmt(loP[0])).replace(/<[^>]+>/g, '')} (${labels[loP[1]]})` : ''}`;
      let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(aria)}"><g class="grid">`;
      t.forEach((v) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v)}</text>`; });
      svg += `</g><line class="eje0" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;
      labels.forEach((l, i) => {
        series.forEach((s, j) => { const v = s.data[i]; if (!ok(v)) return; const top = y(Math.max(0, v)), bot = y(Math.min(0, v)); svg += `<rect class="vb" data-i="${i}" x="${m.l + i * gw + gw * 0.1 + j * bw}" y="${top}" width="${Math.max(1, bw - 2)}" height="${Math.max(1, bot - top)}" rx="2" style="fill:${s.c}"><title>${esc(l)} · ${esc(s.n)}: ${esc(String(fmt(v)).replace(/<[^>]+>/g, ''))}</title></rect>`; });
        if (i % cada === 0) svg += `<text x="${cx(i)}" y="${Hh - 8}" text-anchor="middle">${esc(l)}</text>`;
      });
      if (opts.line) {
        const L = opts.line; let seg = [], segs = [];
        L.data.forEach((v, i) => { if (ok(v)) seg.push(`${cx(i)},${y(v)}`); else { if (seg.length) segs.push(seg); seg = []; } }); if (seg.length) segs.push(seg);
        svg += segs.map((sg) => `<polyline points="${sg.join(' ')}" fill="none" style="stroke:${L.c}" stroke-width="2"/>`).join('');
        svg += L.data.map((v, i) => (ok(v) ? `<circle class="vb vl" data-i="${i}" cx="${cx(i)}" cy="${y(v)}" r="${labels.length > 26 ? 2.5 : 3.5}" style="fill:${L.c}"><title>${esc(labels[i])} · ${esc(L.n)}: ${esc(String(fmt(v)).replace(/<[^>]+>/g, ''))}</title></circle>` : '')).join('');
      }
      host.innerHTML = svg + '</svg>' + `<div class="chart-legend small">${series.map((s) => `<span><i style="background:${s.c}"></i> ${esc(s.n)}</span>`).join('')}${opts.line ? `<span><i style="background:${opts.line.c};height:2px"></i> ${esc(opts.line.n)}</span>` : ''}</div>`;
      const dd = (v) => (ok(v) ? fmt(v) : 'sin dato');
      $$('.vb', host).forEach((b) => { const i = +b.dataset.i; b.addEventListener('pointermove', (ev) => A.charts.tip(`<h5>${esc(labels[i])}</h5><dl>${series.map((s) => `<dt>${esc(s.n)}</dt><dd>${dd(s.data[i])}</dd>`).join('')}${opts.line ? `<dt>${esc(opts.line.n)}</dt><dd>${dd(opts.line.data[i])}</dd>` : ''}</dl>`, ev.clientX, ev.clientY)); b.addEventListener('pointerleave', A.charts.hideTip); });
    };
    pinta(); S.alRedimensionar(host, pinta);
  };
  /* Lista de riesgos. opts.num: numerada como la matriz; opts.total: cuántos hay en total (avisa de los que no se muestran) */
  S.riskBlock = (risks, opts) => {
    opts = opts || {};
    const resto = opts.total && opts.total > risks.length ? opts.total - risks.length : 0;
    return risks.length ? `<div class="risklist">${risks.map((r, i) => `<div class="risk"><span class="state st-${r.estado}">${r.nivel}</span><div><b>${opts.num ? `${i + 1}. ` : ''}${esc(r.nombre)}</b><p>${esc(r.mitigacion || '')}</p></div><span class="src">${esc(r.fuente || '')}</span></div>`).join('')}</div>${resto ? `<p class="small muted">+${resto} riesgo${resto > 1 ? 's' : ''} de menor nivel no mostrado${resto > 1 ? 's' : ''} aquí: los encontrará en cada módulo.</p>` : ''}` : '<p class="small muted">Sin riesgos relevantes con los datos actuales.</p>';
  };
  /* Riesgos para la matriz: los mismos que la lista numerada, con probabilidad e impacto dentro de 1–5 */
  S.riesgosMatriz = (risks, n) => risks.slice(0, n).map((r) => Object.assign({}, r, { prob: Math.max(1, Math.min(5, Math.round(S.num(r.prob)) || 1)), impacto: Math.max(1, Math.min(5, Math.round(S.num(r.impacto)) || 1)) }));
  S.N_RIESGOS = 10;
  S.mkRisk = (nombre, prob, impacto, mitigacion, fuente) => { const nivel = prob * impacto; return { nombre, prob, impacto, nivel, estado: nivel >= 15 ? 'stop' : nivel >= 8 ? 'warn' : 'ok', mitigacion, fuente }; };

  /* Ficha explicativa de un término: qué es, cómo se calcula, cómo se lee, tu dato y cómo mejorarlo */
  S.termHTML = (g, cur) => {
    cur = cur || {};
    const list = (a) => `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    const vars = (a) => a.map((k) => esc(A.fieldLabel(k))).join(', ');
    return `<h5>${esc(g.t)}</h5><span class="hint">${esc(g.cat || '')}</span>
      <p>${esc(g.d)}</p>
      ${g.f ? `<h6>Cómo se calcula</h6><div class="formula" style="margin-top:2px;border:0;padding:0">${esc(g.f)}</div>` : ''}
      ${g.lee ? `<h6>Cómo se lee</h6>${Array.isArray(g.lee) ? list(g.lee) : `<p>${esc(g.lee)}</p>`}` : ''}
      ${cur.valor ? `<div class="now"><b>Su dato: ${esc(cur.valor)}</b>${cur.st ? ` · <span class="state st-${cur.st}">${stName[cur.st]}</span>` : ''}${cur.ctx ? `<p style="margin-top:6px">${esc(cur.ctx)}</p>` : ''}</div>` : ''}
      ${g.ej ? `<h6>Ejemplo</h6><p>${esc(g.ej)}</p>` : ''}
      ${g.mejora ? `<h6>Cómo mejorarlo</h6>${list(g.mejora)}` : ''}
      ${(g.dir && g.dir.length) || (g.ind && g.ind.length) ? `<h6>Qué lo mueve</h6><p>${g.dir && g.dir.length ? `Directas: ${vars(g.dir)}. ` : ''}${g.ind && g.ind.length ? `Indirectas: ${vars(g.ind)}.` : ''}</p>` : ''}`;
  };

  /* ---------- Navegación ---------- */
  const GROUPS = ['Visión', 'Finanzas', 'Comercial', 'Operaciones', 'Estrategia'];
  // m.grupo es la clave interna del área; en pantalla, «Estrategia» se llama «Entorno y crecimiento»
  const GRUPO_N = { Estrategia: 'Entorno y crecimiento' };
  S.grupoN = (g) => GRUPO_N[g] || g;
  let current = 'tablero';
  function buildTabs() {
    const host = $('#stTabs');
    host.innerHTML = GROUPS.map((g) => S.modules.filter((m) => m.grupo === g).map((m) => `<button role="tab" data-t="${m.id}" aria-selected="${m.id === current}">${m.nombre}</button>`).join('')).join('<span class="tabsep" aria-hidden="true"></span>');
    $$('button', host).forEach((b) => b.onclick = () => show(b.dataset.t));
  }
  function show(id, keep) {
    if (!S.mod(id)) return;
    current = id;
    $$('#stTabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === id));
    const sel = $(`#stTabs button[data-t="${id}"]`); if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
    const panel = $('#stPanel');
    panel.innerHTML = '';
    A.charts.hideTip(); A.charts.closePop();
    const m = S.mod(id);
    S._vacio = !S.conDatos(m);
    try { m.render(panel); } catch (e) { panel.innerHTML = `<div class="alert stop">No se pudo mostrar este módulo: ${esc(e.message)}</div>`; console.error(e); }
    const vacio = S._vacio; S._vacio = false;
    // Cada módulo puede generar su informe
    // Cabecera del módulo: área, nombre con volumen, la pregunta que responde y sus informes
    // La portada (cuadro de mando) lleva su propio titular grande: sin cabecera pequeña encima
    if (A.informe && !panel.querySelector('.alert.stop') && !(m.portada && panel.querySelector('.hm-hero'))) {
      const D = A.C360 && A.C360[id];
      const r360 = D && S.report360;
      panel.insertAdjacentHTML('afterbegin', `<div class="st-repbar st-head"><div class="st-hd"><span class="st-kick">${esc(S.grupoN(m.grupo))}</span><h2 class="st-title">${A.tituloCalado ? A.tituloCalado(m.nombre) : esc(m.nombre)}</h2>${D && D.pregunta ? `<p class="st-q">${esc(D.pregunta)}</p>` : ''}</div><span class="spacer"></span>${id === 'auditoria' && S.auditReport ? '<button class="btn" id="stAudit">Informe de auditoría</button>' : ''}${id !== 'origen' ? `<button class="btn ${r360 ? 'solid' : ''}" id="stReport">${r360 ? 'Informe 360' : 'Generar informe'}</button>` : ''}</div>`);
      const rb = $('#stReport', panel); if (rb) rb.onclick = () => (r360 ? S.report360(m) : S.moduleReport(m));
      const ab = $('#stAudit', panel); if (ab) ab.onclick = () => S.auditReport();
    }
    // Exigencia del área para esta empresa (esencial, recomendada o no aplica) y la decisión de la propia empresa
    const exH = S.AREAS_VALORABLES.includes(id) ? exigenciaHTML(id) : '';
    if (exH) { const head = panel.querySelector('.st-head'); if (head) head.insertAdjacentHTML('afterend', exH); else panel.insertAdjacentHTML('afterbegin', exH); montarExigencia(panel, id); }
    if (S.noAplica(id)) { /* no aplica: lo dice la franja de exigencia */ }
    // Cuenta con datos reales: el módulo sin datos lo dice y pide la subida
    else if (vacio) { const head = panel.querySelector('.st-head'), sim = m.datosSim; const av = `<div class="alert ${S.real() ? 'warn' : 'info'} st-pide st-sindatos"><b>Sin datos en este módulo.</b> ${S.real() ? 'Esta empresa trabaja con datos reales: aquí no hay datos de ejemplo. ' : ''}Los indicadores quedan «Sin datos» y no cuentan en la nota, en el DAFO ni en las prioridades hasta que haya datos propios. ${sim ? 'Cargue las cuentas en el <a href="app.html#empresa">simulador</a> o en <a href="#origen">Origen de datos</a>.' : 'Súbalos en <a href="#origen">Origen de datos</a> (Excel, CSV o PDF) o escríbalos en las tablas.'}</div>`; if (head) head.insertAdjacentHTML('afterend', av); else panel.insertAdjacentHTML('afterbegin', av); }
    else if (id === 'tablero' && A.simEsEjemplo && S.sim && S.sim.sinDatos && !(S.sim.empresa && S.sim.empresa.ventas > 0)) panel.insertAdjacentHTML('afterbegin', '<div class="alert warn st-pide"><b>Faltan las cuentas de la empresa.</b> Esta empresa trabaja con datos reales y el simulador está a cero: suba el balance y la cuenta de resultados en <a href="#origen">Origen de datos</a> o en el <a href="app.html#empresa">simulador</a>.</div>');
    // Historial: cada módulo abierto es una entrada (atrás y adelante recorren lo visitado); la primera se sustituye
    if (location.hash !== '#' + id) { try { if (S._hist && !S._volviendo) history.pushState(null, '', '#' + id); else history.replaceState(null, '', '#' + id); } catch (e) { /* sin historial */ } }
    S._hist = true;
    // Al recalcular el mismo módulo se conserva la posición: solo se sube al cambiar de módulo
    if (keep) { const y = keep.y; scrollTo({ top: y }); requestAnimationFrame(() => scrollTo({ top: y })); } else scrollTo({ top: 0 });
    if (S.onShow) try { S.onShow(id, !!keep); } catch (e) { console.error(e); }
  }
  /* Franja de exigencia en la pantalla de cada área valorable. Es de trabajo (no va a los informes ni al papel):
     dice si el área es esencial, recomendada o no aplica para la empresa y por qué, y permite a la empresa marcarla como
     no aplicable (con motivo obligatorio) o volver a aplicarla. La empresa modelo y la demostración no se cambian. */
  function exigenciaHTML(id) {
    const ex = S.exigencia(id), ed = S.exigenciaEditable(), d = ex.decision;
    const txt = ex.k === 'e' ? 'Para su empresa esta área es <b>esencial</b>: si falta su documentación, cuenta 0 en la nota del sistema estratégico.'
      : ex.k === 'r' ? `Para su empresa esta área es <b>recomendada</b>: si no la entrega, no baja la nota; si la entrega, se valora como las demás.${ex.origen === 'empresa' ? ' ' + esc(ex.motivo) : ''}`
        : `Esta área <b>no aplica</b> a su empresa y no cuenta en la nota. ${esc(ex.motivo)}`;
    const quien = d && (d.quien || d.fecha) ? ` <span class="muted">(${esc([d.quien, d.fecha ? new Date(d.fecha).toLocaleDateString('es-ES') : ''].filter(Boolean).join(', '))})</span>` : '';
    const botones = !ed ? '<span class="small muted">La empresa modelo y la cuenta de demostración no se pueden cambiar.</span>'
      : ex.origen === 'empresa' ? `<button class="btn small" data-exig="quitar">${ex.k === 'n' ? 'Volver a aplicar esta área' : 'Deshacer: el área vuelve a no aplicar'}</button>`
        : ex.k === 'n' ? '<button class="btn small" data-exig="aplica">Esta área sí aplica a mi empresa</button>'
          : '<button class="btn small" data-exig="abrir">Esta área no aplica a mi empresa</button>';
    return `<div class="alert info st-pide st-exig no-print" data-inf="no" data-exig-area="${esc(id)}"><div>${txt}${ex.origen === 'empresa' ? quien : ''}</div>
      <div class="row" style="margin-top:6px;gap:8px;flex-wrap:wrap">${botones}</div>
      <form class="st-exig-f row" hidden style="margin-top:8px;gap:8px;flex-wrap:wrap;align-items:flex-end"><label class="small" style="flex:1;min-width:220px">Motivo (obligatorio)<input class="input" name="motivo" required maxlength="200" placeholder="Por ejemplo: no tenemos almacén ni reparto propio"></label><button class="btn solid small" type="submit">Marcar como no aplicable</button><button class="btn ghost small" type="button" data-exig="cerrar">Cancelar</button></form></div>`;
  }
  function montarExigencia(panel, id) {
    const box = panel.querySelector('.st-exig'); if (!box) return;
    const f = box.querySelector('.st-exig-f');
    box.querySelectorAll('[data-exig]').forEach((b) => b.onclick = () => {
      const k = b.dataset.exig;
      if (k === 'abrir') { f.hidden = false; f.motivo.focus(); return; }
      if (k === 'cerrar') { f.hidden = true; return; }
      if (k === 'quitar') S.marcarExigencia(id, null);
      if (k === 'aplica') S.marcarExigencia(id, { aplica: true });
      S.rerender();
    });
    f.onsubmit = (ev) => { ev.preventDefault(); const mo = f.motivo.value.trim(); if (!mo) { f.motivo.focus(); return; } if (S.marcarExigencia(id, { noAplica: true, motivo: mo })) S.rerender(); };
  }
  S.show = show;
  S.GROUPS = GROUPS;

  /* ---------- Informes: dossier empresarial ----------
     Norma de los informes: el sujeto es la empresa, nunca la aplicación. El documento se ordena como un dossier de
     consultoría (resumen ejecutivo con la conclusión primero, situación y diagnóstico, riesgos y oportunidades,
     recomendaciones, hoja de ruta y anexo de metodología, fuentes y limitaciones). Lo que en pantalla es una
     instrucción de uso, un estado de carga o un aviso de trabajo no pasa al documento: lo que no se puede analizar
     se dice en una línea del anexo «Alcance y limitaciones». */
  const INF = (S.inf = {});
  const TITULOS = { tablero: 'Diagnóstico estratégico de la empresa', tiempos: 'Uso del tiempo y productividad', evolucion: 'Evolución del diagnóstico', auditoria: 'Auditoría estratégica' };
  INF.titulo = (m) => TITULOS[m.id] || m.nombre;
  INF.estado = (n) => (n == null ? null : n >= 70 ? 'ok' : n >= 50 ? 'warn' : 'stop');
  INF.califica = (n) => (n >= 70 ? 'situación sólida' : n >= 50 ? 'con puntos que corregir' : 'situación frágil');
  INF.fechaC = (d) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  // Lenguaje de pantalla (nombres de la aplicación, instrucciones de uso, estados de carga) que no pasa al documento
  const NO_NOM = /\b(m[oó]dulos?|simulador|atalaya|pesta[ñn]as?|este mundo|mundos|zona de origen|origen de datos|cabecera|rejilla|casilla|navegador|flotante|aterriz\w+|datos? de ejemplo|registros de ejemplo|caso de ejemplo|comprobaci[oó]n(es)?|sin responder|versi[oó]n de trabajo|versi[oó]n nueva|servidor|sistema estrat[eé]gico|cuadro de mando de atalaya|todav[ií]a no (hay|se)|sin an[aá]lisis todav[ií]a|sin datos que dibujar|sin datos|a mano|el agente|corte guardado|cortes guardados|se guarda)\b/i;
  const NO_IMP = /(^|[.:;»] +|^\W+)(Pulse|Pulsa|Toque|Toca|Mueva|Mueve|Arrastre|Escriba|Escribe|Marque|Marca|Cargue|Carga|Suba|Sube|Complete|Completa|Añada|Añade|Úselo|Puntúa|Puntúe|Responde|Responda|Elija|Elige|Puede guardar|Para afinarla|Cámbielo|Ajústelos|Importe su)\b|ajústelos|cámbielo|reescríbalas|páselas|añada (las|importes)|tócal[ao]|toque para|marque si|anotar los valores/;
  INF.sucio = (t) => NO_NOM.test(t) || NO_IMP.test(t);
  // Giros de la aplicación que tienen equivalente empresarial
  const NEG = [
    [/\s*\((datos )?del simulador\)/gi, ''], [/\s*\(ver simulador\)/gi, ''], [/\s*\(vacío = sector\)/gi, ''], [/que cree realista conseguir/gi, 'que se considera realista conseguir'], [/del simulador · escenario/gi, 'escenario'], [/La inversión del simulador/g, 'La inversión prevista'],
    [/lleve la desviación al simulador para ver el efecto en la inversión/gi, 'recalcule el plan de inversión con la desviación'],
    [/en cada escenario del simulador/gi, 'en cada escenario'], [/los datos del simulador/gi, 'las cifras de la empresa'], [/Veredicto del simulador/g, 'Viabilidad de la inversión'],
    [/Nota del sistema estratégico/g, 'Valoración global'], [/Atalaya marca lo que detecta en sus datos; cámbielo si no es así\.?/g, ''],
    [/detectadas en todos los módulos/gi, 'identificadas en todas las áreas'], [/(en|con|de) todos los módulos/gi, '$1 todas las áreas'],
    [/(en|con) el simulador/gi, '$1 el plan de inversión'], [/(del|al) simulador/gi, '$1 plan de inversión'], [/\s*\(empresa modelo\)/gi, ''],
    [/; ajústelos a su experiencia/gi, ''], [/\s*\(ejemplo\)/gi, ''], [/^NaN$/, '—'], [/ · las sugerencias salen de sus datos/gi, ''], [/toque para ver qué significa/gi, '']
  ];
  INF.neg = (t) => NEG.reduce((s, [a, b]) => s.replace(a, b), String(t == null ? '' : t)).replace(/ {2,}/g, ' ');
  // Texto listo para el documento: con el giro empresarial y sin las frases que hablan de la aplicación
  INF.frases = (t) => { const s = INF.neg(t); if (!INF.sucio(s)) return s; return s.split(/(?<=[.!?])\s+/).filter((f) => !INF.sucio(f)).join(' ').trim(); };
  /* Un bloque de la pantalla convertido en contenido de informe, sin lenguaje de la aplicación */
  INF.limpiar = (html) => {
    const d = document.createElement('div'); d.innerHTML = html;
    d.querySelectorAll('[data-inf="no"], .solo-pantalla, .st-pide, details, .og-desfase').forEach((x) => x.remove());
    d.querySelectorAll('svg [aria-label], svg title, svg[aria-label]').forEach((x) => { if (x.tagName.toLowerCase() === 'title') x.textContent = INF.neg(x.textContent); else x.setAttribute('aria-label', INF.neg(x.getAttribute('aria-label'))); });
    // Texto: se limpia frase a frase; un párrafo con formato que mezcla instrucciones se retira entero
    const W = document.createTreeWalker(d, NodeFilter.SHOW_TEXT), T = []; while (W.nextNode()) T.push(W.currentNode);
    T.forEach((n) => {
      if (!n.parentNode || !d.contains(n)) return;
      const t0 = n.nodeValue; if (!t0.trim()) return;
      const t1 = INF.neg(t0); if (t1 !== t0) n.nodeValue = t1;
      if (n.parentElement && n.parentElement.closest('svg')) return; // en los gráficos solo se ajustan los nombres
      if (!INF.sucio(t1)) return;
      const caja = n.parentElement.closest('p, small, li, .note, .alert, td, th, h3, h4, label') || n.parentElement;
      if (caja !== d && caja.children.length && !/^(TD|TH)$/.test(caja.tagName)) { caja.remove(); return; }
      n.nodeValue = INF.frases(t1);
    });
    // Tablas: sin columnas de trabajo vacías; una tabla sin filas no dice nada
    d.querySelectorAll('table').forEach((t) => {
      const filas = Array.from(t.tBodies).flatMap((b) => Array.from(b.rows));
      if (!filas.length || filas.every((r) => !r.textContent.trim())) { (t.closest('.rp-tw, .table-wrap') || t).remove(); return; }
      const cab = t.tHead && t.tHead.rows[0]; if (!cab) return;
      for (let i = cab.cells.length - 1; i >= 0; i--) { if (cab.cells[i].textContent.trim()) continue; if (filas.every((r) => !r.cells[i] || (!r.cells[i].textContent.trim() && !r.cells[i].querySelector('svg, img')))) { cab.deleteCell(i); filas.forEach((r) => r.cells[i] && r.deleteCell(i)); } }
    });
    d.querySelectorAll('table').forEach((t) => { const filas = Array.from(t.tBodies).flatMap((b) => Array.from(b.rows)), TOPE = 15; if (filas.length <= TOPE + 3) return; filas.slice(TOPE).forEach((r) => r.remove()); const p = document.createElement('p'); p.className = 'rp-muted'; p.textContent = `Se muestran las ${TOPE} primeras filas de un total de ${filas.length}.`; (t.closest('.rp-tw, .table-wrap') || t).insertAdjacentElement('afterend', p); });
    // Lo que se queda vacío, fuera (dos pasadas: un contenedor puede vaciarse al quitar a sus hijos)
    for (let k = 0; k < 3; k++) d.querySelectorAll('p, small, span, li, ul, ol, div, label, h3, h4').forEach((x) => { if (!x.textContent.trim() && !x.querySelector('svg, img, table, i, b') && !x.closest('svg') && !/\b(dotc|rp-bar)\b/.test(x.className || '')) x.remove(); });
    return d.innerHTML;
  };
  // ¿Las cifras del área son las de una empresa tipo (cuenta que aún trabaja con cifras ilustrativas)?
  INF.ilustrativo = (m) => {
    const P = A.platform; if (S.real() || (P && P.modelo && P.modelo.activa && P.modelo.activa())) return false;
    const st = m && S.state[m.clave || m.id];
    return !!((st && st.ejemplo === true) || S.simEjemplo() || (S.sim.historico && S.sim.historico.ejemplo));
  };
  /* Ejercicios de las cuentas: los cerrados son el periodo analizado; el año en curso y los siguientes, previsiones */
  INF.ejercicios = () => {
    const H = S.sim && S.sim.historico, vacio = { cerrados: [], prevision: [], fuera: [] };
    if (!H || !H.anios || (S.real() && H.ejemplo) || !A.fin.ejercicios) return vacio;
    const e = A.fin.ejercicios(H); return { cerrados: e.cerrados.map((a) => +a.anio), prevision: e.prevision.map((a) => +a.anio), fuera: e.fuera };
  };
  const tramo = (l) => (l.length === 1 ? String(l[0]) : `${l[0]}–${l[l.length - 1]}`);
  INF.periodo = () => {
    const E = INF.ejercicios(), f = A.informe.fecha();
    const ej = E.cerrados.length ? `${E.cerrados.length === 1 ? 'Ejercicio' : 'Ejercicios'} ${tramo(E.cerrados)}` : '';
    const pv = E.prevision.length ? `previsión ${tramo(E.prevision)}` : '';
    return ej ? `${ej}, situación a ${f}${pv ? ' y ' + pv : ''}` : `Situación a ${f}${pv ? ' y ' + pv : ''}`;
  };
  // Fuentes y limitaciones que dependen de los ejercicios disponibles
  INF.fuenteCuentas = () => { const E = INF.ejercicios(); return (E.cerrados.length ? [`Cuentas anuales ${E.cerrados.length === 1 ? 'del ejercicio ' + E.cerrados[0] : 'de los ejercicios ' + tramo(E.cerrados).replace('–', ' a ')}.`] : []).concat(E.prevision.length ? [`Previsiones de la empresa ${E.prevision.length === 1 ? 'para ' + E.prevision[0] : 'de ' + tramo(E.prevision).replace('–', ' a ')}.`] : []); };
  INF.limiteCuentas = () => { const E = INF.ejercicios(); return E.fuera.length ? [`Las cifras registradas como ${E.fuera.length === 1 ? 'ejercicio ' + E.fuera[0] : 'ejercicios ' + E.fuera.join(', ')} no forman serie con el resto de las cuentas y no se han tenido en cuenta.`] : []; };
  // Portada con ámbito y periodo analizado
  INF.portada = (o) => { const h = A.informe.cover(Object.assign({ periodo: INF.periodo() }, o)); return /Periodo analizado/.test(h) ? h : h.replace('</dl>', `<div><dt>Ámbito</dt><dd>${esc(o.ambito || '')}</dd></div><div><dt>Periodo analizado</dt><dd>${esc(INF.periodo())}</dd></div></dl>`); };
  // Nombre del área en los documentos
  INF.area = (mod) => { const m = S.mod(mod); return m ? INF.titulo(m) : ''; };
  INF.PIE = 'Las cifras son estimaciones elaboradas con la información facilitada por la empresa. La fiscalidad y las decisiones societarias deben validarse con sus asesores.';
  INF.ESCALA = 'Nivel de riesgo = probabilidad × impacto, de 1 a 25: bajo por debajo de 8, medio hasta 14 y alto desde 15.';
  INF.METODO = 'Cada indicador se compara con su umbral de referencia y se clasifica en nivel adecuado (verde), en vigilancia (ámbar) o crítico (rojo). La valoración sobre 100 pondera los indicadores, los riesgos altos, el cumplimiento de los objetivos y del plan, las prácticas de gestión y la disponibilidad de información: verde cuenta 1, ámbar 0,5 y rojo 0.';
  /* Anexo: metodología, fuentes y limitaciones de la información */
  INF.anexo = (o) => {
    const I = A.informe, li = (l) => `<ul>${l.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    const lim = (o.limites || []).slice();
    if (o.ilustrativo) lim.unshift('Las cifras de este documento son ilustrativas: corresponden a una empresa tipo del sector y no a la contabilidad ni a los registros de la sociedad. Sirven para mostrar el alcance del análisis, no para decidir.');
    if (!lim.length) lim.push('El análisis se apoya en la información facilitada por la empresa, que no ha sido auditada.');
    return `<section class="rp-sec rp-anx"><h2><span class="rp-n">A</span>Anexo: metodología, fuentes y limitaciones</h2><h3>Metodología</h3><p>${esc(o.metodo || INF.METODO)}</p>${o.riesgos ? `<p>${esc(INF.ESCALA)}</p>` : ''}`
      + ((o.fuentes || []).length ? `<h3>Fuentes</h3>${li(o.fuentes)}` : '')
      + `<h3>Alcance y limitaciones</h3>${li(lim)}</section>`;
  };
  /* Cierre del documento: el anexo es siempre lo último antes del pie. Los apartados que se añaden al informe
     (hoja de ruta de implantación y seguimiento con el consultor) se insertan «antes del pie»: para que queden
     antes del anexo y no después, se les deja un ancla invisible delante del anexo. */
  INF.cierre = (o) => '<footer class="rp-foot" hidden style="display:none" aria-hidden="true"></footer>' + INF.anexo(o) + A.informe.foot(INF.PIE).replace('<footer class="rp-foot"', '<footer data-pie class="rp-foot"');
  // ¿Se añade al informe la hoja de ruta de implantación con el consultor? (entonces no se repite aquí)
  INF.conGuia = () => !!(A.consultorInf && A.consultorInf.esConsultora && A.consultorInf.esConsultora());
  INF.min = (t) => { t = String(t || ''); return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ ]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t; };
  /* Mensajes clave del resumen ejecutivo: cada uno con su cifra */
  INF.mensajes = (P, x) => {
    x = x || {}; const M = [], con = (P.eval || P.tiles).filter((t) => t.st), r = con.filter((t) => t.st === 'stop'), a = con.filter((t) => t.st === 'warn'), v = con.filter((t) => t.st === 'ok');
    const val = (t) => String(t.v).replace(/<[^>]+>/g, '').trim();
    if (con.length) M.push(`<b>Indicadores.</b> De ${con.length === 1 ? 'un indicador evaluado' : `los ${con.length} indicadores evaluados`}, ${v.length} ${v.length === 1 ? 'está' : 'están'} en nivel adecuado, ${a.length} en vigilancia y ${r.length} en nivel crítico${r.length ? `: ${r.slice(0, 3).map((t) => `${esc(INF.min(t.k))} (${esc(val(t))})`).join(', ')}` : a.length ? `; a vigilar, ${a.slice(0, 2).map((t) => `${esc(INF.min(t.k))} (${esc(val(t))})`).join(' y ')}` : ''}.`);
    if (P.R.length) { const altos = P.R.filter((q) => q.estado === 'stop').length; M.push(`<b>Riesgos.</b> ${P.R.length === 1 ? 'Un riesgo identificado' : `${P.R.length} riesgos identificados`}${altos ? `, ${altos} de nivel alto` : ''}. El principal: ${esc(P.R[0].nombre)} (nivel ${P.R[0].nivel} sobre 25).`); }
    const imp = P.Fi.reduce((s, f) => s + (f.impactoEUR || 0), 0);
    if (P.Fi.length && imp > 0) { let eb = 0; try { eb = S.simConDatos() ? S.baseYear().ebitda : 0; } catch (e) { eb = 0; } M.push(`<b>Oportunidades.</b> Las mejoras identificadas suman <b>${F.eur(imp)}</b> al año${eb > 0 ? `, el ${F.pct(S.pct(imp, eb))} del EBITDA actual` : ''}. La mayor: ${esc(P.Fi[0].hallazgo.replace(/\.$/, ''))} (${F.eur(P.Fi[0].impactoEUR || 0)}).`); }
    (x.extra || []).forEach((t) => M.push(t));
    if (x.primera) M.push(`<b>Primera actuación.</b> ${x.primera}`);
    return M;
  };
  INF.resumen = (concl, M) => `<p>${concl}</p>${M.length ? `<ol class="rp-steps">${M.map((t) => `<li>${t}</li>`).join('')}</ol>` : ''}`;
  // Título de la sección de situación: una conclusión, no una etiqueta
  INF.titular = (P) => {
    const con = (P.eval || P.tiles).filter((t) => t.st), r = con.filter((t) => t.st === 'stop'), a = con.filter((t) => t.st === 'warn'), val = (t) => String(t.v).replace(/<[^>]+>/g, '').trim();
    if (r.length) return `Situación: ${r.length === 1 ? 'un indicador' : r.length + ' indicadores'} en nivel crítico, ${INF.min(r[0].k)} en ${val(r[0])}`;
    if (a.length) return `Situación: sin indicadores críticos; ${INF.min(a[0].k)} (${val(a[0])}) pide vigilancia`;
    if (con.length) return `Situación: ${con.length === 1 ? 'el indicador evaluado está' : `los ${con.length} indicadores evaluados están`} en nivel adecuado`;
    if (P.tiles.length) return `Situación: ${INF.min(P.tiles[0].k)}, ${val(P.tiles[0])}`;
    return 'Situación y diagnóstico';
  };
  INF.titularRiesgos = (P) => {
    const imp = P.Fi.reduce((s, f) => s + (f.impactoEUR || 0), 0), altos = P.R.filter((q) => q.estado === 'stop').length;
    const a = P.R.length ? `${P.R.length === 1 ? 'un riesgo' : P.R.length + ' riesgos'}${altos ? ` (${altos} de nivel alto)` : ''}` : '', b = imp > 0 ? `mejoras por ${F.eur(imp)} al año` : '';
    return 'Riesgos y oportunidades' + (a || b ? ': ' + [a, b].filter(Boolean).join(' y ') : '');
  };
  // Gráficos del informe: indicadores por nivel, nivel de los riesgos e impacto de las mejoras (con las cifras del propio análisis)
  const corta = (t, n) => { t = String(t || '').replace(/\.$/, ''); return t.length > (n || 64) ? t.slice(0, (n || 64) - 1).replace(/\s+\S*$/, '') + '…' : t; };
  INF.graficoEstados = (P) => {
    const I = A.informe, con = (P.eval || P.tiles || []).filter((t) => t.st); if (!I.donut || con.length < 3) return '';
    const n = { ok: 0, warn: 0, stop: 0 }; con.forEach((t) => { const k = t.st === 'go' ? 'ok' : t.st; if (k in n) n[k]++; });
    return I.donut([{ k: 'Nivel adecuado', v: n.ok, st: 'ok' }, { k: 'En vigilancia', v: n.warn, st: 'warn' }, { k: 'Nivel crítico', v: n.stop, st: 'stop' }], { titulo: 'Indicadores por nivel', centro: String(con.length), centroTxt: 'indicadores', fmt: (v) => String(v), nota: 'Cada indicador se compara con su umbral de referencia: nivel adecuado, en vigilancia o crítico.' });
  };
  INF.graficoRiesgos = (P) => {
    const I = A.informe, L = P.R.slice(0, 8); if (!I.barras || L.length < 2 || L.every((r) => r.nivel === L[0].nivel)) return '';
    return I.barras(L.map((r) => ({ k: corta(r.nombre, 58), v: +r.nivel || 0, st: r.estado, t: r.nivel + ' / 25' })), { titulo: 'Nivel de los riesgos principales', max: 25, meta: 15, metaTxt: 'Desde 15, riesgo de nivel alto', nota: 'Nivel = probabilidad × impacto, de 1 a 25.' });
  };
  INF.graficoMejoras = (P) => {
    const I = A.informe, L = P.Fi.filter((f) => (f.impactoEUR || 0) > 0).slice(0, 8); if (!I.barras || L.length < 2) return '';
    return I.barras(L.map((f) => ({ k: corta(f.accion || f.hallazgo, 58), v: f.impactoEUR, t: F.eur(f.impactoEUR) })), { titulo: 'Impacto anual de las mejoras', color: '#6e7d14', fmt: (v) => F.eur(v), nota: 'Estimación del efecto anual de cada actuación sobre el resultado o la caja.' });
  };
  INF.riesgosYmejoras = (P) => {
    const I = A.informe;
    const TOPE = 12, nota = (n, que) => (n > TOPE ? `<p class="rp-muted">Se muestran ${que} de un total de ${n}.</p>` : '');
    return (P.R.length ? `<h3>Riesgos</h3>${INF.graficoRiesgos(P)}${I.table(['Riesgo', 'Prob.', 'Impacto', 'Nivel', 'Respuesta recomendada'], P.R.slice(0, TOPE).map((r) => [r.nombre, r.prob + '/5', r.impacto + '/5', { h: I.pill(r.estado, String(r.nivel)) }, r.mitigacion || '']), { num: [1, 2] })}${nota(P.R.length, `los ${TOPE} riesgos de mayor nivel`)}` : '<p>El análisis no identifica riesgos relevantes en este ámbito.</p>')
      + (P.Fi.length ? `<h3>Oportunidades de mejora</h3>${INF.graficoMejoras(P)}${I.table(['Hallazgo', 'Actuación recomendada', 'Impacto anual', 'Plazo'], P.Fi.slice(0, TOPE).map((f) => [f.hallazgo, f.accion, F.eur(f.impactoEUR || 0), (f.plazo || 90) + ' días']), { num: [2, 3] })}${nota(P.Fi.length, `las ${TOPE} mejoras de mayor impacto`)}` : '');
  };
  /* Lo que sostiene la valoración de un área: sus indicadores con su valor y el resto de comprobaciones que puntúan
     (prácticas de gestión, objetivos, plan, riesgos altos, información incompleta), con las rojas y las ámbar primero.
     Es exactamente lo que entra en la nota del área (A.nota): lo que no tiene datos propios no puntúa ni se muestra. */
  const ORD_ST = { stop: 0, warn: 1, ok: 2 };
  INF.sostenes = (mods, K) => {
    const P = (A.nota && A.nota.estrategia ? A.nota.estrategia() : null) || [];
    const kp = K.filter((k) => mods.includes(k.mod)).map((k) => ({ st: ORD_ST[k.st] != null ? k.st : null, h: `${esc(INF.neg(k.k))}: <b>${k.v}</b>` }));
    const txt = (p) => INF.frases(p.inf || String(p.t || '').replace(/^En (rojo|ámbar): /, '').replace(/ (en|de|del) «[^»]*»/g, '').replace(/«[^»]*» ?/g, ''));
    const ot = P.filter((p) => mods.includes(p.zona) && !p.kpi && ORD_ST[p.st] != null).map((p) => ({ st: p.st, h: esc(txt(p)) }));
    return kp.concat(ot).filter((x, i, l) => x.h && l.findIndex((y) => y.h === x.h) === i).map((x, i) => Object.assign(x, { i })).sort((a, b) => (ORD_ST[a.st] != null ? ORD_ST[a.st] : 3) - (ORD_ST[b.st] != null ? ORD_ST[b.st] : 3) || a.i - b.i);
  };
  // En la tabla: cada elemento con su marca de nivel; los de nivel adecuado, como mucho los que quepan hasta seis
  INF.sostenHTML = (l) => {
    const malos = l.filter((x) => x.st === 'stop' || x.st === 'warn'), resto = l.filter((x) => !malos.includes(x)), ver = malos.concat(resto.slice(0, Math.max(0, 6 - malos.length))), mas = l.length - ver.length;
    return ver.map((x) => `<span class="rp-sosten${x.st ? ' rp-so-' + x.st : ''}">${x.h}</span>`).join(' · ') + (mas ? ` <span class="rp-muted">· ${mas === 1 ? 'otro aspecto' : mas + ' aspectos más'} en nivel adecuado</span>` : '');
  };
  /* ---------- Exigencia de cada área para la empresa ----------
     Cada área valorable es, para una empresa concreta, Esencial (si falta, vale 0 y se nombra el documento), Recomendada
     (si falta no baja la nota: queda «Pendiente (recomendada)»; si se entrega, puntúa como las demás) o No aplica (fuera
     de la nota, con su motivo). Una sola tabla por sector (claves de A.SECTORS, js/sectors.js) × área: 'e', 'r' o 'n'.
     Base para todos los sectores: esenciales el flujo del dinero (cuentas), la tesorería, el margen, los cobros y el
     plan de empresa; recomendadas las demás. Cada celda distinta de la base lleva su motivo al lado.
     Sobre el ABC (módulo «ventas», ABC y concentración de clientes y productos): esencial en industria, distribución y
     retail, donde los márgenes se hallan por volumen, rotación y recursos invertidos; recomendado en los demás. El ABC por producto no se pide cuando la empresa vende una sola línea de producto o servicio (ver js/nota.js).
     Después de la tabla se aplican las reglas de tamaño (con plantilla conocida de 2 personas o menos, personas y
     tiempos no aplican) y la decisión de la propia empresa (S.state.exigencia), que manda sobre la tabla. */
  const AREAS_VALORABLES = ['dinero', 'impuestos', 'tesoreria', 'presupuesto', 'ventas', 'margen', 'comercial', 'marketing', 'expansion', 'compras', 'logistica', 'tiempos', 'lean', 'personas', 'plan', 'mercado', 'cobros', 'valoracion'];
  const BASE_E = ['dinero', 'tesoreria', 'margen', 'cobros', 'plan'];
  const base = (cambios) => Object.assign(Object.fromEntries(AREAS_VALORABLES.map((k) => [k, BASE_E.includes(k) ? 'e' : 'r'])), cambios);
  S.EXIGENCIA = {
    industria: base({
      ventas: 'e', // ABC esencial: los márgenes se hallan por volumen, rotación y recursos invertidos en gestionar o fabricar cada línea
      logistica: 'e', // fabrica y expide mercancía: el servicio de entrega (OTIF) y el coste de mover y guardar son parte del negocio
      lean: 'e', // tiene planta: la eficiencia de los procesos (OEE, desperdicio) decide el coste
      compras: 'e' // compra materia prima: el coste y la dependencia de proveedores pesan en el margen
    }),
    distribucion: base({
      ventas: 'e', // ABC esencial: los márgenes se hallan por volumen, rotación y recursos invertidos en gestionar o fabricar cada línea
      logistica: 'e', // vive de almacenar y repartir
      lean: 'e', // almacén y preparación de pedidos: procesos repetitivos donde el desperdicio cuesta margen
      compras: 'e' // compra la mercancía que vende
    }),
    hosteleria: base({
      compras: 'e' // compra producto perecedero cada día: el coste de materia prima es la primera partida
    }),
    retail: base({
      ventas: 'e', // ABC esencial: los márgenes se hallan por volumen, rotación y recursos invertidos en gestionar o fabricar cada línea
      compras: 'e' // compra la mercancía que vende
    }),
    construccion: base({
      compras: 'e', // compra materiales para cada obra
      tiempos: 'e' // vende horas de obra y de oficina técnica: los partes de horas son el coste de cada obra
    }),
    servicios: base({
      logistica: 'n', // no reparte mercancía
      lean: 'n', // no tiene planta de producción
      tiempos: 'e' // vende horas: los partes de horas son su coste y su capacidad
    }),
    tecnologia: base({
      logistica: 'n', // no reparte mercancía
      lean: 'n', // no tiene planta de producción
      tiempos: 'e' // vende horas de desarrollo y servicio
    }),
    agro: base({
      logistica: 'e', // expide producto, a menudo perecedero
      lean: 'e', // transforma o envasa en sus instalaciones
      compras: 'e' // compra insumos (semillas, piensos, fertilizantes, envases)
    }),
    salud: base({}),
    inmobiliaria: base({
      logistica: 'n', // no reparte mercancía
      lean: 'n', // no tiene planta de producción
      tiempos: 'n' // no vende horas: vende o alquila inmuebles
    }),
    logistica: base({
      logistica: 'e', // es su actividad
      lean: 'e' // almacén y operaciones repetitivas donde el desperdicio cuesta margen
    })
  };
  S.AREAS_VALORABLES = AREAS_VALORABLES;
  S.EXIG_N = { e: 'Esencial', r: 'Recomendada', n: 'No aplica' };
  S.SIN_STOCK = ['servicios', 'tecnologia', 'inmobiliaria'];
  /* Sector de la empresa: el de su ficha; si no lo tiene, el del simulador; si este es el de partida («industria») y las
     cifras propias dicen otra cosa (sin stock y con margen bruto de servicios), se deduce de ellas. */
  S.sectorEmpresa = () => {
    const P = A.platform, ea = S._ficha || (P && P.empresas && P.empresas.activa ? P.empresas.activa() : null), SE = A.SECTORS || {};
    if (ea && ea.sector && SE[ea.sector]) return { k: ea.sector, origen: 'ficha' };
    const k = S.sim && S.sim.sector;
    if (k && SE[k] && k !== 'industria') return { k, origen: 'simulador' };
    try {
      const e = S.sim && S.sim.empresa, H = S.sim && S.sim.historico && !S.sim.historico.ejemplo && A.fin.ejercicios ? A.fin.ejercicios(S.sim.historico).cerrados : [];
      const sinStock = e && S.num(e.dio) === 0 && !H.some((a) => S.num(a.existencias) > S.num(a.ventas) * 0.01);
      if (sinStock && S.simConDatos() && S.num(e.margen) >= 50 && SE.servicios) return { k: 'servicios', origen: 'datos' };
    } catch (x) { /* sin cifras */ }
    return { k: k && SE[k] ? k : 'industria', origen: 'simulador' };
  };
  /* Exigencia de un área para esta empresa: { k: 'e' | 'r' | 'n', motivo, origen: 'sector' | 'tamano' | 'empresa' }.
     Orden: la tabla del sector; después el tamaño (con plantilla conocida); al final, la decisión de la empresa. */
  const plantillaConocida = () => { try { const c = S.cifras(); return c && !c.sinDatos && c.plantilla != null ? c.plantilla : null; } catch (e) { return null; } };
  S.exigencia = (id) => {
    id = typeof id === 'string' ? id : id && id.id;
    if (!AREAS_VALORABLES.includes(id) || !S.sim) return { k: 'r', motivo: '', origen: 'sector' };
    const sec = S.sectorEmpresa(), nombreSec = ((A.SECTORS[sec.k] || {}).nombre || '').toLowerCase();
    let r = { k: ((S.EXIGENCIA[sec.k] || S.EXIGENCIA.industria)[id]) || 'r', origen: 'sector' };
    if (r.k === 'n') r.motivo = `No aplica al sector: ${INF.MOTIVO_SECTOR[id] || 'no forma parte de la actividad de una empresa de ' + nombreSec}.`;
    const pl = plantillaConocida();
    if (pl != null && pl <= 2 && (id === 'personas' || id === 'tiempos')) r = { k: 'n', origen: 'tamano', motivo: `No aplica por tamaño: con ${pl === 1 ? 'una persona' : pl + ' personas'} en plantilla no hay ${id === 'personas' ? 'equipo que organizar' : 'partes de horas de un equipo que analizar'}.` };
    const d = S.state && S.state.exigencia && S.state.exigencia[id];
    if (d && d.noAplica) r = { k: 'n', origen: 'empresa', motivo: `Marcada como no aplicable por la empresa: ${String(d.motivo || '').trim() || 'sin motivo indicado'}.`, decision: d };
    else if (d && d.aplica && r.k === 'n') r = { k: 'r', origen: 'empresa', motivo: 'La empresa ha indicado que el área sí aplica a su actividad.', decision: d };
    return r;
  };
  S.noAplica = (id) => S.exigencia(id).k === 'n';
  // Motivo corto de cada «no aplica al sector»
  INF.MOTIVO_SECTOR = { logistica: 'la empresa no reparte mercancía ni tiene rutas de entrega', lean: 'la empresa no tiene planta de producción', tiempos: 'la empresa no vende horas de trabajo', compras: 'la empresa no compra mercancía ni materia prima' };
  /* Decisión de la empresa sobre un área (se guarda con su estrategia, por empresa, y se sincroniza con el resto de sus datos).
     La empresa modelo y la cuenta de demostración no se pueden cambiar. */
  S.exigenciaEditable = () => { const P = A.platform; return !(P && ((P.modelo && P.modelo.activa && P.modelo.activa()) || (P.user && P.user.demo))); };
  S.marcarExigencia = (id, d) => {
    if (!S.exigenciaEditable() || !AREAS_VALORABLES.includes(id)) return false;
    const P = A.platform, u = P && P.user;
    S.state.exigencia = Object.assign({}, S.state.exigencia || {});
    if (!d) delete S.state.exigencia[id];
    else { if (d.noAplica && !String(d.motivo || '').trim()) return false; S.state.exigencia[id] = Object.assign({ fecha: new Date().toISOString(), quien: (u && (u.nombre || u.email)) || '' }, d); }
    S.save(); return true;
  };
  /* ¿Ha entregado la empresa la documentación del área? Datos propios y al menos un indicador que se pueda medir con ellos */
  S.entregada = (m) => {
    m = typeof m === 'string' ? S.mod(m) : m; if (!m || !S.conDatos(m)) return false;
    try { return m.kpis ? m.kpis().some((k) => !k.sinDato && String(k.v).replace(/<[^>]+>/g, '').trim() !== S.SIN_DATO) : true; } catch (e) { return false; }
  };
  INF.sectorTxt = () => { const s = S.sectorEmpresa(), n = (A.SECTORS[s.k] || {}).nombre || ''; return n + (s.origen === 'datos' ? ' (deducido de sus cifras)' : ''); };
  INF.noAplican = () => S.modules.filter((m) => AREAS_VALORABLES.includes(m.id) && S.noAplica(m.id)).map((m) => INF.titulo(m));

  /* ---------- La documentación que falta, en lenguaje de empresa ----------
     Un área sin los documentos propios de la empresa no se puede evaluar: vale 0 y el informe dice qué documento falta. */
  const ANIO = () => new Date().getFullYear();
  const lista = (l) => (l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1]);
  INF.FALTA = {
    dinero: () => { const y = ANIO(), E = INF.ejercicios(), f = [y - 2, y - 1].filter((a) => !E.cerrados.includes(a)); return `Faltan el balance y la cuenta de resultados de ${lista((f.length ? f : [y - 2, y - 1]).map(String))}`; },
    impuestos: 'Falta la cuenta de resultados con la base imponible y la cuota del impuesto',
    tesoreria: 'Faltan el saldo de caja de hoy y los movimientos bancarios recientes',
    presupuesto: () => `Faltan el presupuesto de ${ANIO()} y las ventas reales de los meses cerrados`,
    ventas: 'Faltan las ventas del último año por cliente y por producto',
    margen: 'Faltan los productos o servicios con precio, coste variable y unidades vendidas',
    comercial: 'Falta la relación de oportunidades abiertas con importe y probabilidad',
    marketing: 'Faltan la inversión, los contactos y los clientes captados por canal',
    expansion: 'Faltan los datos de mercado de las zonas candidatas',
    compras: 'Faltan las compras del último año por proveedor',
    logistica: 'Faltan los pedidos, los costes de transporte y almacén y el servicio por ruta',
    tiempos: 'Faltan los partes de horas por persona y tarea',
    lean: 'Faltan los partes de producción o de horas por proceso',
    personas: 'Falta la plantilla con área, puesto y coste',
    plan: 'Faltan la misión, los objetivos y el plan de acción de la dirección',
    mercado: 'Faltan los estudios de mercado o sectoriales y el análisis de la competencia',
    cobros: 'Falta la antigüedad de saldos de clientes (facturas pendientes a la fecha de corte)',
    valoracion: 'Falta la cuenta de resultados con margen, personal y gastos fijos'
  };
  // Las cifras clave que no se han facilitado: qué documento falta
  INF.FALTA_CIFRA = { ventas: 'faltan las ventas del último ejercicio', ebitda: 'falta la cuenta de resultados (margen, personal y gastos)', deuda: 'falta el balance (deuda bancaria)', caja: 'falta el saldo de caja de hoy', plantilla: 'falta la plantilla' };
  INF.falta = (m) => { const f = INF.FALTA[m.id]; if (f) return typeof f === 'function' ? f() : f; const D = A.C360 && A.C360[m.id]; return D && D.datos && D.datos[0] ? 'Falta: ' + INF.min(D.datos[0].t) : 'Falta la información de gestión del área'; };

  /* ---------- Plan de documentación ----------
     Ruta guiada por la documentación de la empresa: las áreas esenciales entregadas y las que faltan, las recomendadas
     pendientes y el siguiente paso. Se calcula aquí, sin IA y siempre igual, con los datos propios de la empresa
     (S.inf.conPropios): lo de ejemplo no cuenta como entregado. Cada elemento dice el área, el documento que falta
     (INF.falta), cómo se entrega, en qué pantalla y qué permitirá. Las esenciales que faltan se ordenan por lo que
     desbloquean: primero las cuentas anuales (cruce del beneficio con la caja y valoración), después tesorería, margen,
     cobros y plan de empresa, y al final las esenciales propias del sector. La exigencia la decide S.exigencia (sector,
     tamaño y la propia empresa): el plan nunca marca un área como «no aplica». */
  const ORDEN_DOC = ['dinero', 'tesoreria', 'margen', 'cobros', 'plan', 'ventas', 'compras', 'tiempos', 'logistica', 'lean', 'impuestos', 'presupuesto', 'valoracion', 'comercial', 'personas', 'marketing', 'mercado', 'expansion'];
  const EN_TABLA = 'en la tabla del área con «Importar documento» (Excel, CSV, PDF o Word), con «Pegar» (filas copiadas de Excel) o a mano con «Añadir fila»';
  S.DOC_GUIA = {
    dinero: { zona: 'origen', paso: 'Se suben en «Origen de datos»: con una sola carga llegan al flujo del dinero y al punto de partida, y aparece la nota del sistema estratégico.', como: 'Suba las cuentas anuales (balance y cuenta de resultados) en PDF, Excel o Word en «Origen de datos»: llegan a la vez al flujo del dinero y al punto de partida de la empresa, y con una sola carga aparece la nota. También puede escribir las cifras de cada año en la rejilla de «Flujo del dinero».', permite: 'se valoran el flujo del dinero y la tesorería y se cruza el beneficio con la caja; también se calculan los impuestos y el valor de la empresa' },
    tesoreria: { como: 'Escriba el saldo de caja de hoy en «Saldo inicial» y cargue los movimientos del banco ' + EN_TABLA + '.', permite: 'se ve semana a semana si la caja cubre los pagos y cuál será la semana más tensa' },
    margen: { como: 'Cargue los productos o servicios con precio, coste variable y unidades vendidas ' + EN_TABLA + '.', permite: 'se sabe qué productos o servicios dejan margen, cuáles lo consumen y cuánto hay que vender para cubrir los gastos' },
    cobros: { como: 'Cargue las facturas pendientes de cobro (cliente, factura, vencimiento e importe) en la tabla «Facturas pendientes de cobro», o suba el listado en «Origen de datos». Si los tiene, añada los cobros del último año.', permite: 'se mide cuánto está vencido, cuánto dinero espera en manos de los clientes y qué parte puede no cobrarse' },
    plan: { como: 'Se escribe en la propia pantalla: misión, visión, valores, el análisis de debilidades, amenazas, fortalezas y oportunidades (DAFO), los objetivos y las acciones con responsable y fecha.', permite: 'los objetivos de la dirección bajan a acciones con responsable y fecha y se puede seguir su cumplimiento' },
    ventas: { como: 'Cargue las ventas del último año por cliente y por producto ' + EN_TABLA + ', o suba el listado en «Origen de datos».', permite: 'se ve qué clientes y productos concentran la venta y el margen, y cuánto depende la empresa de unos pocos' },
    compras: { como: 'Cargue las compras del último año por proveedor (importe y plazo de pago) ' + EN_TABLA + '.', permite: 'se ve cuánto depende la empresa de cada proveedor y cuánto pesan las compras en el margen' },
    tiempos: { como: 'Cargue los partes de horas por persona y tarea en «Registros de tiempo» ' + EN_TABLA.replace('en la tabla del área ', '') + ', o regístrelos con el reloj.', permite: 'se conocen el coste real de cada hora vendida y la capacidad libre del equipo' },
    logistica: { como: 'Escriba los pedidos al mes, los costes de transporte y almacén y las entregas a tiempo y completas, y cargue las rutas ' + EN_TABLA + '.', permite: 'se miden el servicio de entrega y el coste de mover y guardar la mercancía' },
    lean: { como: 'Describa los pasos del proceso principal con sus tiempos en «Pasos del proceso», a partir de los partes de producción o de horas.', permite: 'se ve dónde se pierde tiempo en el proceso y cuánto cuesta ese desperdicio' },
    impuestos: { como: 'Sale de la cuenta de resultados: con las cuentas anuales o con el margen, el personal y los gastos fijos cargados se calculan la base imponible y la cuota.', permite: 'se prevé lo que la empresa pagará de impuestos y cuándo' },
    presupuesto: { como: 'Escriba el presupuesto del año y las ventas reales de cada mes cerrado en la pantalla del área.', permite: 'se compara cada mes lo previsto con lo real' },
    valoracion: { como: 'Sale de la cuenta de resultados (margen, personal y gastos fijos), de las cuentas anuales o de lo escrito en el punto de partida.', permite: 'se estima cuánto vale la empresa y qué lo mueve' },
    comercial: { como: 'Cargue las oportunidades abiertas con cliente, importe, etapa y probabilidad ' + EN_TABLA + '.', permite: 'se estima la venta que llegará en los próximos meses' },
    personas: { como: 'Cargue la plantilla por área con número de personas y coste ' + EN_TABLA + '.', permite: 'se ven el coste y la carga de cada área' },
    marketing: { como: 'Cargue la inversión, los contactos y los clientes captados por canal ' + EN_TABLA + '.', permite: 'se sabe cuánto cuesta captar un cliente en cada canal' },
    mercado: { como: 'Escriba los indicadores del sector, la competencia y el riesgo por tipo de cliente y de producto en sus tablas, o suba estudios de mercado en «Origen de datos».', permite: 'se sitúa a la empresa frente a su mercado y su competencia' },
    expansion: { como: 'Cargue los datos de mercado de las zonas candidatas ' + EN_TABLA + '.', permite: 'se comparan las zonas donde crecer' }
  };
  // Lo que falta en un área entregada, o con datos que aún no bastan para valorarla (datos que dejan el análisis a medias)
  const docIncompleto = (id) => {
    const l = [];
    try {
      if (id === 'dinero') {
        const E = INF.ejercicios(), y = ANIO(), f = [y - 2, y - 1].filter((a) => !E.cerrados.includes(a));
        if (E.cerrados.length < 2) l.push(E.cerrados.length ? `Solo hay un ejercicio cerrado (${E.cerrados[0]}): ${f.length > 1 ? 'faltan los de ' : 'falta el de '}${lista(f.map(String))} para comparar dos años.` : 'Las cuentas cargadas no tienen ningún ejercicio cerrado: faltan el balance y la cuenta de resultados de los dos últimos años.');
      }
      if (id === 'tesoreria') {
        const Ts = S.state.tesoreria || {}, c = S.cifras(), ini = Ts.saldoInicial !== null && Ts.saldoInicial !== '' && Ts.saldoInicial != null;
        if (!ini && S.num(S.sim.empresa.caja) > 0 && c && c.caja == null) l.push('La caja anotada coincide con la de un año de previsión: falta el saldo de caja de hoy.');
        if (!(Ts.movimientos || []).some((m) => S.num(m.importe))) l.push('Faltan los movimientos recientes del banco: sin ellos la previsión semanal se calcula solo con los plazos medios de cobro y pago.');
      }
      if (id === 'cobros' && !((S.state.cobros || {}).historico || []).length) l.push('Faltan los cobros del último año con fecha de factura y de cobro: sin ellos no se miden los días reales de cobro.');
      if (id === 'margen') { const sin = ((S.state.comercial || {}).productos || []).filter((p) => S.num(p.unidades) * S.num(p.precio) > 0 && !S.num(p.coste)).length; if (sin) l.push(`${sin === 1 ? 'Un producto no tiene' : sin + ' productos no tienen'} coste variable: su margen sale completo.`); }
      if (id === 'ventas') { const C = S.state.comercial || {}, nc = (C.clientes || []).length, np = (C.productos || []).length; if (nc < 5 || (np > 1 && np < 3)) l.push(`El análisis tiene ${nc === 1 ? 'un cliente' : nc + ' clientes'} y ${np === 1 ? 'un producto' : np + ' productos'}: con menos de cinco clientes o de tres productos el reparto no es representativo.`); }
      if (id === 'plan' && !(((S.state.plan || {}).acciones) || []).some((a) => a.accion)) l.push('El plan no tiene acciones con responsable y fecha.');
    } catch (e) { /* sin comprobación */ }
    return l;
  };
  S.planDocumentacion = () => INF.conPropios(() => {
    const items = AREAS_VALORABLES.map((id) => {
      const m = S.mod(id); if (!m) return null;
      const ex = S.exigencia(id), ent = ex.k !== 'n' && S.entregada(m), g = S.DOC_GUIA[id] || {}, n = INF.titulo(m);
      const falta = ent || ex.k === 'n' ? '' : INF.falta(m);
      return { id, n, exig: ex.k, exigencia: S.EXIG_N[ex.k], origen: ex.origen, motivo: ex.motivo || '', entregada: ent, falta,
        documento: falta ? falta.replace(/^Faltan? (la |el |los |las )?/i, (x, art) => (art || '')).replace(/^Falta: /, '') : '',
        como: g.como || 'Se carga en la pantalla del área.', paso: g.paso || '', zona: g.zona || id, donde: 'Sistema estratégico › ' + (g.zona ? INF.titulo(S.mod(g.zona)) : n), url: 'estrategia.html#' + (g.zona || id),
        permite: g.permite || '', incompleto: ex.k !== 'n' && (ent || S.conDatos(m)) ? docIncompleto(id) : [] };
    }).filter(Boolean).sort((a, b) => ORDEN_DOC.indexOf(a.id) - ORDEN_DOC.indexOf(b.id));
    const ess = items.filter((x) => x.exig === 'e'), rec = items.filter((x) => x.exig === 'r');
    const faltan = ess.filter((x) => !x.entregada), pend = rec.filter((x) => !x.entregada);
    const sig = faltan[0] || pend[0] || null;
    return {
      empresa: (S.sim && S.sim.empresaNombre) || '', sector: INF.sectorTxt(),
      esenciales: { total: ess.length, entregadas: ess.length - faltan.length },
      entregadas: ess.filter((x) => x.entregada), faltan, recomendadas: pend, recomendadasEntregadas: rec.filter((x) => x.entregada),
      noAplican: items.filter((x) => x.exig === 'n').map((x) => ({ id: x.id, n: x.n, motivo: x.motivo })),
      completo: !faltan.length, siguiente: sig ? Object.assign({ recomendada: !faltan.length }, sig) : null, areas: items
    };
  });

  /* ---------- Informes disponibles ----------
     Qué informe tiene sentido sacar ya, calculado aquí sin IA con las mismas reglas de la nota (S.exigencia, S.entregada,
     INF.falta): «listo», «incompleto» (saldrá con áreas esenciales a «0 · sin documentación», que se nombran) o
     «sin_sentido» (no hay documentación propia con la que hacerlo). Así la guía nunca recomienda un informe que saldría casi
     a ceros sin decirlo antes. Los informes de otros mundos (personas y equipos, auditoría integral) los añade el asistente
     con sus propios datos. */
  S.ESTADO_INF = { listo: 'Listo', incompleto: 'Saldrá incompleto', sin_sentido: 'No tiene sentido todavía' };
  S.informesDisponibles = () => INF.conPropios(() => {
    const p = S.planDocumentacion(), propios = !!(S.datosPropios && S.datosPropios()), alguna = p.areas.some((a) => a.entregada);
    const ceros = p.faltan.length, essN = p.faltan.map((a) => a.n);
    const global = (id, tipo, titulo, como) => {
      if (!propios && !alguna) return { id, tipo, titulo, mundo: 'estrategia', estado: 'sin_sentido', motivo: `La empresa no ha aportado todavía documentación propia: el informe saldría con las ${p.esenciales.total} áreas esenciales a «0 · sin documentación».`, faltan: essN, ceros: p.esenciales.total, como };
      if (ceros) return { id, tipo, titulo, mundo: 'estrategia', estado: 'incompleto', motivo: `${ceros === 1 ? 'Un área esencial saldrá' : ceros + ' de ' + p.esenciales.total + ' áreas esenciales saldrán'} con «0 · sin documentación»: ${lista(essN)}.`, faltan: essN, ceros, como };
      return { id, tipo, titulo, mundo: 'estrategia', estado: 'listo', motivo: `La documentación esencial está completa (${p.esenciales.total} de ${p.esenciales.total}).`, faltan: [], ceros: 0, como };
    };
    const out = [global('auditoria', 'auditoria', 'Informe de auditoría', 'Sistema estratégico › Informe de auditoría'), global('tablero', '360', 'Informe 360 · ' + INF.titulo(S.mod('tablero')), 'Sistema estratégico › Cuadro de mando › Informe 360')];
    p.areas.forEach((a) => {
      const r360 = !!(A.C360 && A.C360[a.id] && S.report360), base = { id: a.id, tipo: r360 ? '360' : 'area', titulo: (r360 ? 'Informe 360 · ' : 'Informe · ') + a.n, mundo: 'estrategia', area: a.n, como: 'Sistema estratégico › ' + a.n + ' › ' + (r360 ? 'Informe 360' : 'Generar informe') };
      if (a.exig === 'n') out.push(Object.assign(base, { estado: 'sin_sentido', noAplica: true, motivo: a.motivo || 'El área no aplica a la empresa.', faltan: [], ceros: 0 }));
      else if (!a.entregada) out.push(Object.assign(base, { estado: 'sin_sentido', motivo: `${a.falta}: ${a.exig === 'e' ? 'el área saldría con «0 · sin documentación»' : 'el área saldría sin datos'}.`, faltan: [a.n], ceros: a.exig === 'e' ? 1 : 0 }));
      else if (a.incompleto.length) out.push(Object.assign(base, { estado: 'incompleto', motivo: a.incompleto.join(' '), faltan: [], ceros: 0 }));
      else out.push(Object.assign(base, { estado: 'listo', motivo: 'El área tiene su documentación entregada.', faltan: [], ceros: 0 }));
    });
    const simOk = S.simConDatos();
    out.push({ id: 'simulador', tipo: 'simulador', titulo: 'Informe del simulador de inversión', mundo: 'simulador', como: 'Simulador de inversión › Generar informe', estado: !simOk ? 'sin_sentido' : S.invDefinida() ? 'listo' : 'incompleto', motivo: !simOk ? 'Faltan las cifras de la empresa en el punto de partida del simulador.' : S.invDefinida() ? 'La empresa y la inversión están definidas.' : 'Sin una inversión definida, el informe recoge solo la situación de la empresa, sin veredicto.', faltan: [], ceros: 0 });
    const au = out[0];
    out.push({ id: 'libro', tipo: 'libro', titulo: 'Libro corporativo', mundo: 'libro', como: 'Libro corporativo › Recoger todos los informes', estado: au.estado, motivo: au.estado === 'listo' ? 'Recoge los informes de todos los mundos del plan.' : au.motivo, faltan: au.faltan, ceros: au.ceros });
    return out;
  });
  /* Acciones del plan de empresa vencidas o que vencen en los próximos 14 días (sin hacer), con su responsable */
  S.accionesPlan = (dias) => {
    const d = new Date(), h = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10), lim = new Date(Date.parse(h + 'T12:00:00Z') + (dias || 14) * 864e5).toISOString().slice(0, 10);
    const acc = (((S.state || {}).plan || {}).acciones || []).filter((a) => a && String(a.accion || '').trim() && a.estado !== 'Hecha');
    const fx = (a) => ({ accion: String(a.accion).trim(), responsable: String(a.responsable || '').trim(), fin: a.fin || '', area: a.area || '' });
    return { vencidas: acc.filter((a) => a.fin && a.fin < h).sort((a, b) => a.fin.localeCompare(b.fin)).map(fx), proximas: acc.filter((a) => a.fin && a.fin >= h && a.fin <= lim).sort((a, b) => a.fin.localeCompare(b.fin)).map(fx) };
  };
  /* Orden del día de la próxima reunión, sin IA: la documentación esencial que falta, las áreas en rojo con su cifra, las
     acciones del plan vencidas o que vencen en 14 días, los acuerdos pendientes de la última reunión de la mesa de trabajo
     (mesa: su estado, js/mesa-comun.js) y el informe que conviene revisar. De 5 a 7 puntos, cada uno con su responsable
     si se conoce y la cifra o el documento en que se apoya. */
  S.ordenDelDia = (mesa) => INF.conPropios(() => {
    const p = S.planDocumentacion(), inf = S.informesDisponibles(), ac = S.accionesPlan(14), items = [];
    const fC = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '');
    const txt = (v) => String(v == null ? '' : v).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (p.faltan.length) items.push({ tipo: 'documentacion', tema: `Documentación esencial pendiente: ${p.esenciales.entregadas} de ${p.esenciales.total} entregadas`, base: p.faltan.slice(0, 3).map((a) => `${a.n}: ${a.documento}`).join(' · '), resp: '' });
    // Áreas entregadas con indicadores en rojo: la primera cifra en rojo de cada una (como mucho dos áreas)
    p.areas.filter((a) => a.entregada).map((a) => { const m = S.mod(a.id); let k = null; try { k = (m.kpis ? m.kpis() : []).find((x) => x && x.st === 'stop' && !x.sinDato); } catch (e) { k = null; } return k ? { a, k } : null; }).filter(Boolean).slice(0, 2)
      .forEach(({ a, k }) => items.push({ tipo: 'rojo', tema: `${a.n}, en rojo`, base: `${txt(k.k)}: ${txt(k.v)}${k.d ? ' (' + txt(k.d) + ')' : ''}`, resp: '' }));
    ac.vencidas.slice(0, 2).forEach((x) => items.push({ tipo: 'vencida', tema: `Acción del plan vencida: ${x.accion}`, base: `Debía estar hecha el ${fC(x.fin)}${x.area ? ' · ' + x.area : ''}`, resp: x.responsable }));
    if (ac.vencidas.length > 2) items.push({ tipo: 'vencida', tema: `Otras ${ac.vencidas.length - 2} acciones del plan vencidas`, base: ac.vencidas.slice(2, 5).map((x) => x.accion).join(' · '), resp: '' });
    if (ac.proximas.length) items.push({ tipo: 'proxima', tema: `${ac.proximas.length === 1 ? 'Acción del plan que vence' : ac.proximas.length + ' acciones del plan que vencen'} en los próximos 14 días`, base: ac.proximas.slice(0, 3).map((x) => `${x.accion} (${fC(x.fin)}${x.responsable && ac.proximas.length > 1 ? ', ' + x.responsable : ''})`).join(' · '), resp: ac.proximas.length === 1 ? ac.proximas[0].responsable : '' });
    // Acuerdos pendientes de la última reunión celebrada en la mesa de trabajo
    const h = new Date().toISOString().slice(0, 10), reus = ((mesa && mesa.reuniones) || []).filter((r) => r && r.fecha && r.fecha <= h).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ult = reus[0];
    if (ult) {
      const hecha = (i) => ((mesa.tareas || []).find((t) => t.oid === 'reu:' + ult.id + ':' + i) || {}).estado === 'hecha';
      const pend = (ult.acta || []).map((x, i) => ({ x, i })).filter((o) => String(o.x.t || '').trim() && !hecha(o.i));
      if (pend.length) items.push({ tipo: 'acuerdo', tema: `Acuerdos pendientes de la reunión del ${fC(ult.fecha)}${ult.titulo && ult.titulo !== 'Reunión' ? ' («' + ult.titulo + '»)' : ''}`, base: pend.slice(0, 3).map((o) => o.x.t + (o.x.resp && pend.length > 1 ? ' (' + o.x.resp + ')' : '')).join(' · '), resp: pend.length === 1 ? pend[0].x.resp || '' : '' });
    }
    // Informe a revisar: el de auditoría si está listo; si no, el último informe de área listo
    const rec = inf.find((x) => x.id === 'auditoria' && x.estado === 'listo') || inf.filter((x) => (x.tipo === '360' || x.tipo === 'area') && x.id !== 'tablero' && x.estado === 'listo').pop();
    if (rec) items.push({ tipo: 'informe', tema: `Revisar el ${rec.titulo}`, base: rec.motivo, resp: '', informe: { id: rec.id, tipo: rec.tipo } });
    if (!items.length) items.push({ tipo: 'seguimiento', tema: 'Seguimiento general de la empresa', base: `Documentación esencial: ${p.esenciales.entregadas} de ${p.esenciales.total}`, resp: '' });
    return { titulo: 'Reunión de seguimiento' + (p.empresa ? ' · ' + p.empresa : ''), proposito: 'Revisar la documentación pendiente, las áreas en rojo y las acciones del plan, y fijar responsables y fechas.', items: items.slice(0, 7) };
  });

  /* ---------- Áreas de la empresa con su valoración ----------
     Una sola regla (A.nota.evaluacion, js/nota.js), la misma del cuadro de mando y de la nota de la empresa: cada área
     valorable con su exigencia. Esencial sin documentación, 0 y el documento que falta; esencial o recomendada entregada,
     su nota y lo que la sostiene; recomendada sin entregar, «Pendiente (recomendada)», fuera de la nota; no aplica, con su
     motivo, fuera de la nota. La valoración global es la media de las que cuentan. */
  INF.evaluacion = () => {
    const E = A.nota && A.nota.evaluacion ? A.nota.evaluacion(A.nota.estrategia ? A.nota.estrategia() : null) : { areas: [], n100: null, esenciales: { total: 0, entregadas: 0 }, recomendadas: { total: 0, entregadas: 0 } };
    return E;
  };
  INF.areas = (K) => {
    const E = INF.evaluacion();
    const out = E.areas.map((x) => { const m = S.mod(x.zona); const a = m ? INF.titulo(m) : x.n;
      const r = { m, id: x.zona, a, estado: x.estado, exig: x.exig, origen: x.origen, motivo: x.motivo, s: x.s, l: [], sost: [], falta: x.falta };
      if (x.estado === 'ok') { r.l = K.filter((k) => k.mod === x.zona); r.sost = INF.sostenes([x.zona], K); }
      return r; });
    out.global = E.n100; out.esenciales = E.esenciales; out.recomendadas = E.recomendadas;
    return out;
  };
  // La nota global: la de la regla única (la lista de áreas la trae calculada)
  INF.notaGlobal = (areas) => (areas && areas.global !== undefined ? areas.global : INF.evaluacion().n100);
  INF.esencialesTxt = (areas) => { const e = areas && areas.esenciales; return e && e.total ? `Documentación esencial entregada: ${e.entregadas} de ${e.total}` : ''; };
  INF.EXIG_TXT = { e: 'Esencial', r: 'Recomendada', n: 'No aplica' };
  INF.celdaNota = (x) => (x.estado === 'noaplica' ? '<span class="rp-muted">No aplica</span>' : x.estado === 'sindoc' ? `${A.informe.pill('stop', '0')} <span class="rp-muted">· sin documentación</span>` : x.estado === 'pendiente' ? '<span class="rp-muted">Pendiente (recomendada)</span>' : x.s === null ? '—' : A.informe.pill(INF.estado(x.s), String(x.s)));
  INF.celdaSosten = (x) => (x.estado === 'noaplica' ? `<span class="rp-muted">${esc(x.motivo || 'No aplica a la empresa.')}</span>` : x.estado === 'sindoc' ? `<span class="rp-sosten rp-so-stop">${esc(x.falta)}</span>` : x.estado === 'pendiente' ? `<span class="rp-sosten">${esc(x.falta)}. No baja la nota: es recomendada para su empresa.</span>` : INF.sostenHTML(x.sost));
  // Filas de la tabla de áreas agrupadas por exigencia: esenciales, recomendadas y las que no aplican
  INF.filasAreas = (AR) => ['e', 'r', 'n'].flatMap((k) => { const l = AR.filter((x) => x.exig === k); return l.length ? [[{ h: `<b>${{ e: 'Áreas esenciales', r: 'Áreas recomendadas', n: 'Áreas que no aplican' }[k]}</b>` }, '', '']].concat(l.map((x) => [x.a, { h: INF.celdaNota(x) }, { h: INF.celdaSosten(x) }])) : []; });
  // Lo que falta, separado: esencial (baja la nota) y recomendada (no la baja)
  INF.faltaHTML = (AR) => { const e = AR.filter((x) => x.estado === 'sindoc'), r = AR.filter((x) => x.estado === 'pendiente'), li = (l) => `<ul>${l.map((x) => `<li><b>${esc(x.a)}.</b> ${esc(x.falta)}.</li>`).join('')}</ul>`;
    return (e.length ? `<h3>Documentación esencial pendiente</h3><p>Cada área de esta lista cuenta 0 en la valoración hasta que se entregue.</p>${li(e)}` : '') + (r.length ? `<h3>Documentación recomendada</h3><p>No baja la valoración; si se entrega, el área se valora como las demás.</p>${li(r)}` : ''); };
  // Nota de método para el cliente: sector usado y cómo se forma la valoración
  INF.metodoGlobal = () => { const s = S.sectorEmpresa(), n = ((A.SECTORS[s.k] || {}).nombre || '').toLowerCase();
    return `Se ha aplicado la exigencia del sector ${n}${s.origen === 'datos' ? ', deducido de sus cifras porque la ficha de la empresa no indica sector' : s.origen === 'ficha' ? ', tomado de la ficha de la empresa' : ', tomado de sus datos económicos'}. Cada área es esencial, recomendada o no aplica a su empresa. La valoración global es la media de las áreas esenciales y de las recomendadas que usted ha entregado. Un área esencial sin documentación cuenta 0; una recomendada sin entregar no cuenta, y las que no aplican quedan fuera. Por eso se indica aparte cuánta documentación esencial se ha entregado: una valoración baja puede deberse a documentos pendientes y no a malos resultados.`; };
  INF.METODO_GLOBAL = 'La valoración global es la media de las áreas esenciales y de las recomendadas entregadas; un área esencial sin documentación cuenta 0 y las recomendadas sin entregar y las que no aplican quedan fuera.';

  /* ---------- Cruces entre fuentes ----------
     Beneficio y caja, cuentas y cartera de clientes, presupuesto y realidad. Si un cruce no se puede hacer, se dice qué
     documento falta en lugar de dar una cifra. mods: las áreas a las que pertenece (para los informes 360). */
  INF.cruces = () => {
    const out = [], y = ANIO(), E = INF.ejercicios(), H = (S.sim && S.sim.historico && S.sim.historico.anios) || [];
    const fila = (a) => H.find((x) => +x.anio === a);
    const cuentasDe = (a) => { const r = fila(a); return !r || !E.cerrados.includes(a) ? `las cuentas anuales de ${a}` : !isFinite(r.tesoreria) ? `el balance de ${a}` : ''; };
    if (!S.noAplica('dinero')) {
      const mf = S.mfCerrado ? S.mfCerrado() : null;
      if (!mf) {
        const yy = [y - 2, y - 1], sinCuentas = yy.filter((a) => /^las/.test(cuentasDe(a))), sinBalance = yy.filter((a) => /^el/.test(cuentasDe(a)));
        const f = (sinCuentas.length ? [`las cuentas anuales de ${lista(sinCuentas.map(String))}`] : []).concat(sinBalance.length ? [`el balance de ${lista(sinBalance.map(String))}`] : []);
        if (!f.length) f.push(`las cuentas anuales de ${y - 1}`);
        out.push({ mods: ['dinero'], k: 'Beneficio y caja', ok: false, t: `No se puede cruzar el beneficio con la caja: ${f.length > 1 || /^las/.test(f[0]) ? 'faltan' : 'falta'} ${lista(f)}.` });
      }
      else if (mf.falta.length) { const n = mf.falta.map((k) => ((A.fin.CONCEPTS.find((c) => c.k === k) || {}).l || k).replace(/ \(.*\)$/, '').toLowerCase()); out.push({ mods: ['dinero'], k: 'Beneficio y caja', ok: false, parcial: true, t: `El beneficio solo se cruza en parte con la caja: faltan en los balances de ${mf.previo} y ${mf.anio} ${lista(n)}.` }); }
      else out.push({ mods: ['dinero'], k: 'Beneficio y caja', ok: true, t: `En ${mf.anio} la empresa ganó ${F.eur(mf.beneficio)} y la caja ${mf.cajaReal >= 0 ? 'subió' : 'bajó'} ${F.eur(Math.abs(mf.cajaReal))}.` });
    }
    if (!S.noAplica('cobros')) {
      const ult = E.cerrados.length ? fila(E.cerrados[E.cerrados.length - 1]) : null;
      const dsoCuentas = ult && isFinite(ult.clientes) && S.num(ult.ventas) > 0 ? Math.round(ult.clientes / ult.ventas * 365) : S.simConDatos() && S.num(S.sim.empresa.dso) > 0 ? Math.round(S.num(S.sim.empresa.dso)) : null;
      const cartera = S.conDatos('cobros');
      if (!cartera) out.push({ mods: ['cobros'], k: 'Cuentas y cartera de clientes', ok: false, t: 'No se puede cruzar el saldo de clientes de las cuentas con la cartera pendiente de cobro: falta la antigüedad de saldos de clientes.' });
      else if (dsoCuentas === null) out.push({ mods: ['cobros'], k: 'Cuentas y cartera de clientes', ok: false, t: `No se puede cruzar la cartera pendiente de cobro con las cuentas: falta el balance de ${y - 1} con el saldo de clientes.` });
      else { let a = null; try { a = S.cobrosAnalisis(); } catch (x) { a = null; } const real = a ? Math.round(a.realMedio != null ? a.realMedio : a.dsoReal) : null; out.push(real === null ? { mods: ['cobros'], k: 'Cuentas y cartera de clientes', ok: false, t: 'No se puede cruzar la cartera con las cuentas: falta la antigüedad de saldos de clientes.' } : { mods: ['cobros'], k: 'Cuentas y cartera de clientes', ok: true, t: `Según la cartera, los clientes pagan a ${real} días; según las cuentas, a ${dsoCuentas} días.` }); }
    }
    if (!S.noAplica('presupuesto')) {
      let b = null; if (S.conDatos('presupuesto') && S.simPyg() && S.budget) { try { b = S.budget(); } catch (x) { b = null; } }
      if (!b) out.push({ mods: ['presupuesto'], k: 'Presupuesto y realidad', ok: false, t: `No se puede comparar el presupuesto con la realidad: falta el presupuesto de ${y} o la cuenta de resultados de la que se obtiene.` });
      else if (b.ratio == null) out.push({ mods: ['presupuesto'], k: 'Presupuesto y realidad', ok: false, t: `No se puede comparar el presupuesto con la realidad: faltan las ventas reales de los meses cerrados de ${y}.` });
      else out.push({ mods: ['presupuesto'], k: 'Presupuesto y realidad', ok: true, t: `Las ventas reales acumuladas van al ${Math.round(b.ratio * 100)} % de lo presupuestado.` });
    }
    return out;
  };
  INF.crucesHTML = (L) => (L.length ? A.informe.table(['Cruce', 'Resultado'], L.map((c) => [c.k, { h: `<span class="rp-sosten rp-so-${c.ok ? 'ok' : c.parcial ? 'warn' : 'stop'}">${esc(c.t)}</span>` }])) : '');

  /* La empresa completa (cuadro de mando y auditoría): cifras clave, valoración por áreas y riesgos y mejoras de todas ellas */
  INF.empresa = () => {
    const I = A.informe, K = S.allKpis().filter((x) => x.mod !== 'origen' && !x.sinDato && String(x.v).replace(/<[^>]+>/g, '').trim() !== S.SIN_DATO);
    const R = S.allRisks().map((r) => Object.assign({}, r, { nombre: `${r.nombre} (${INF.area(r.mod)})` })), Fi = S.allFindings().map((f) => Object.assign({}, f, { hallazgo: `${INF.area(f.mod)}: ${f.hallazgo}` }));
    K.forEach((x) => { x.area = INF.area(x.mod) || x.area; });
    const AR = INF.areas(K), filas = INF.filasAreas(AR);
    const tiles = [], c = S.cifras(), altos = R.filter((r) => r.estado === 'stop').length, imp = Fi.reduce((s, f) => s + (f.impactoEUR || 0), 0);
    // Cifras clave: solo las facilitadas; las que faltan se dicen con el documento que falta
    const faltanCifras = [];
    if (c && !c.sinDatos && A.cifras && A.cifras.CAMPOS) A.cifras.CAMPOS.forEach((x) => { if (c[x.k] != null) tiles.push({ k: x.n, v: esc(A.cifras.fmt(x.k, c[x.k])) }); else faltanCifras.push(`${x.n.replace(/ \(.*\)$/, '').toLowerCase()} (${INF.FALTA_CIFRA[x.k]})`); });
    tiles.push({ k: 'Riesgos de nivel alto', v: String(altos), d: `${R.length} riesgos identificados` });
    if (Fi.length) tiles.push({ k: 'Mejora identificada', v: F.eur(imp), d: `${Fi.length} actuaciones con impacto anual` });
    if (S.simConDatos() && S.invDefinida()) { const vr = S.analysis().verdict; tiles.push({ k: 'Viabilidad de la inversión prevista', v: esc(vr.titulo), st: { go: 'ok', ok: 'ok', warn: 'warn', stop: 'stop' }[vr.key] || null, d: 'escenario ' + (S.sim.escenario || 'base') }); }
    const notas = AR.filter((x) => x.estado !== 'noaplica' && x.s != null).map((x) => ({ k: x.a, v: x.s }));
    const graf = notas.length >= 2 && I.barras ? I.barras(notas.map((x) => ({ k: x.k, v: x.v, st: INF.estado(x.v), t: x.v + ' / 100' })), { titulo: 'Valoración por áreas, sobre 100', max: 100, meta: 70, metaTxt: 'Desde 70, situación sólida', nota: 'Cada área pondera sus indicadores: verde cuenta 1, ámbar 0,5 y rojo 0. Por debajo de 50, situación frágil.' }) : '';
    const cr = INF.cruces();
    return { tiles, eval: K, R, Fi, global: INF.notaGlobal(AR), areas: AR, limite: [faltanCifras.length ? `Cifras clave sin facilitar: ${faltanCifras.join('; ')}.` : '', AR.some((x) => x.estado === 'sindoc') ? `Áreas esenciales sin documentación, que cuentan 0 en la valoración global: ${AR.filter((x) => x.estado === 'sindoc').map((x) => x.a).join(', ')}.` : '', AR.some((x) => x.estado === 'pendiente') ? `Áreas recomendadas sin entregar, que no cuentan en la valoración: ${AR.filter((x) => x.estado === 'pendiente').map((x) => x.a).join(', ')}.` : '', INF.noAplican().length ? `No aplican a la empresa y no se valoran: ${INF.noAplican().join(', ')}.` : ''].filter(Boolean).join(' '),
      esenciales: INF.esencialesTxt(AR), metodoGlobal: INF.metodoGlobal(),
      detalle: graf + `<div class="rp-block"><h3>Valoración por áreas</h3>${AR.esenciales && AR.esenciales.total ? `<p><b>${esc(INF.esencialesTxt(AR))}.</b></p>` : ''}${I.table(['Área', 'Valoración sobre 100', 'Lo que sostiene la valoración'], filas)}</div>` + (AR.some((x) => x.estado === 'sindoc' || x.estado === 'pendiente') ? `<div class="rp-block">${INF.faltaHTML(AR)}</div>` : '') + (cr.length ? `<div class="rp-block"><h3>Cruces de información</h3>${INF.crucesHTML(cr)}</div>` : '') };
  };
  INF.HOR = ['Primeros 30 días', 'De 31 a 60 días', 'De 61 a 90 días', 'Más de 90 días'];
  INF.horDe = (pl) => (pl <= 30 ? 0 : pl <= 60 ? 1 : pl <= 90 ? 2 : 3);
  // Recomendaciones priorizadas: qué hacer, por qué, impacto esperado, responsable y plazo
  INF.recomendaciones = (L) => A.informe.table(['Prioridad', 'Recomendación', 'Fundamento', 'Impacto esperado', 'Responsable', 'Plazo'], L.map((x) => [{ h: A.informe.pill(x.prio === 'Alta' ? 'stop' : x.prio === 'Media' ? 'warn' : 'ok', x.prio) }, x.accion, x.motivo || x.origen || '', x.impactoTxt || (x.impacto ? F.eur(x.impacto) + ' al año' : '—'), x.resp || 'Dirección', x.fecha ? new Date(x.fecha).toLocaleDateString('es-ES') : x.plazo + ' días']));
  INF.hojaDeRuta = (L) => { const eur = L.some((x) => x.impacto); return A.informe.table(['Horizonte', 'Hitos'].concat(eur ? ['Impacto anual'] : []), INF.HOR.map((h, i) => { const l = L.filter((x) => INF.horDe(x.plazo) === i); if (!l.length) return null; const imp = l.reduce((s, x) => s + (x.impacto || 0), 0); return [h, { h: `<ul>${l.filter((x, j) => l.findIndex((y) => y.accion === x.accion) === j).map((x) => `<li>${esc(x.accion)}${x.resp ? ` <span class="rp-muted">· ${esc(x.resp)}</span>` : ''}</li>`).join('')}</ul>` }].concat(eur ? [imp ? F.eur(imp) : '—'] : []); }).filter(Boolean), eur ? { num: [2] } : {}); };

  /* Piezas comunes de los informes: indicadores, riesgos, hallazgos y el análisis detallado del área */
  S.reportParts = function (m) {
    const I = A.informe, panel = $('#stPanel');
    // Un área puede dar su propio contenido de informe (o decir que no tiene con qué): si no, sale de su análisis en pantalla
    const propio = S.conDatos(m) && m.informe ? m.informe() : null, con = S.conDatos(m) && !(propio && propio.con === false);
    const global = m.id === 'tablero' || m.id === 'auditoria', ids = global ? null : m.id;
    const bruto = propio ? (propio.tiles || []) : !con ? [] : $$('.kpi', panel).map((t) => ({ k: (t.querySelector('.k span') || {}).textContent || '', v: (t.querySelector('.v') || {}).innerHTML || '', st: (t.querySelector('.state') || { className: '' }).className.replace(/.*st-(\w+).*/, '$1') || null, d: (t.querySelector('.d') || {}).textContent || '' }));
    const vacio = (t) => { const v = String(t.v).replace(/<[^>]+>/g, '').trim(); return !v || v === S.SIN_DATO || v === '—' || /^sin (nota|datos?)/i.test(v); };
    const sinCalc = con ? bruto.filter(vacio).map((t) => t.k) : [];
    const tiles = bruto.filter((t) => !vacio(t)).map((k) => Object.assign(k, { k: INF.neg(k.k), st: ['ok', 'warn', 'stop'].includes(k.st) ? k.st : null, d: INF.frases(k.d || '') }));
    let R = [], Fi = []; try { R = (propio && propio.R ? propio.R : m.risks ? m.risks() : []).map((r) => Object.assign({}, r, { nombre: INF.frases(r.nombre), mitigacion: INF.frases(r.mitigacion || '') })); } catch (e) { /* sin riesgos */ } try { Fi = (propio && propio.Fi ? propio.Fi : m.findings ? m.findings() : []).map((f) => Object.assign({}, f, { hallazgo: INF.frases(f.hallazgo), accion: INF.frases(f.accion) })); } catch (e) { /* sin hallazgos */ }
    R.sort((a, b) => b.nivel - a.nivel); Fi.sort((a, b) => (b.impactoEUR || 0) - (a.impactoEUR || 0));
    const lede = ($('.lede', panel) || {}).textContent || '';
    // La empresa completa: la media de las áreas aplicables (las que no tienen documentación cuentan 0)
    const sc = propio && propio.global !== undefined ? propio.global : con && (tiles.some((t) => t.st) || (propio && propio.eval)) ? S.notaN(ids, tiles) : null;
    const st = INF.estado(sc);
    let detalle = '';
    if (propio) detalle = INF.limpiar(propio.detalle || '');
    else if (con) {
      const blocks = $$('.glass', panel).filter((g) => !g.parentElement.closest('.glass') && !g.closest('.c360') && g.dataset.inf !== 'no');
      detalle = blocks.map((g) => { const t = INF.frases((g.querySelector('h4') || {}).textContent || ''); const c = g.cloneNode(true); const h = c.querySelector('h4'); if (h) h.remove(); c.querySelectorAll('label').forEach((l) => { const i = l.querySelector('input:not([type=checkbox]):not([type=range]), textarea'); if (i && !String(i.value || '').trim()) l.remove(); }); const body = INF.limpiar(I.fromDom(c)).trim(); return body.replace(/<[^>]+>/g, '').trim() || /<svg/.test(body) ? `<div class="rp-block">${t ? `<h3>${esc(t)}</h3>` : ''}${body}</div>` : ''; }).join('');
    }
    // Un área concreta: no aplica al sector, o no tiene documentación (vale 0 y se dice qué falta)
    // Sin documentación: sin datos propios, o con datos pero sin ningún indicador que se pueda medir con ellos (las cuentas
    // sin dos ejercicios cerrados, el presupuesto sin reales). Entonces no se toma nada de la pantalla
    const medibles = (() => { try { return m.kpis ? m.kpis().some((k) => !k.sinDato && String(k.v).replace(/<[^>]+>/g, '').trim() !== S.SIN_DATO) : tiles.length > 0; } catch (e) { return tiles.length > 0; } })();
    // Según su exigencia: esencial sin documentación (vale 0) o recomendada sin entregar (pendiente, no baja la nota)
    const ex = S.exigencia(m.id), noAplica = !global && ex.k === 'n', faltaDoc = !global && !noAplica && !!m.datos && (!con || !tiles.length || !medibles);
    const sinDoc = faltaDoc && ex.k === 'e', pendiente = faltaDoc && ex.k !== 'e';
    if (faltaDoc || noAplica) { tiles.length = 0; detalle = ''; R = []; Fi = []; }
    return { noAplica, sinDoc, pendiente, exig: ex, falta: faltaDoc ? INF.falta(m) : '', esenciales: propio && propio.esenciales, metodoGlobal: propio && propio.metodoGlobal, global: propio && propio.global !== undefined ? propio.global : undefined, cruces: INF.cruces().filter((c) => global || c.mods.includes(m.id)), conRiesgos: !!(m.risks || m.findings || (propio && (propio.R || propio.Fi))), tiles, eval: propio && propio.eval ? propio.eval.map((k) => Object.assign({}, k, { k: INF.neg(k.k) })) : null, R, Fi, lede, sc: sinDoc ? 0 : noAplica || pendiente ? null : sc, st: sinDoc ? 'stop' : noAplica || pendiente ? null : st, detalle, con, sinCalc, ids, limite: propio && propio.limite, ilustrativo: con && INF.ilustrativo(global ? null : m) };
  };
  /* Informe de área (áreas sin marco de diagnóstico propio) */
  S.moduleReport = function (m, tipo) { return INF.conPropios(() => informeArea(m, tipo)); };
  function informeArea(m, tipo) {
    const I = A.informe;
    I.reset();
    const P = S.reportParts(m), titulo = INF.titulo(m), emp = S.sim.empresaNombre;
    const impacto = P.Fi.reduce((a, f) => a + (f.impactoEUR || 0), 0);
    const PL = P.Fi.map((f) => ({ accion: f.accion, motivo: f.hallazgo, prio: (f.impactoEUR || 0) > 20000 ? 'Alta' : 'Media', plazo: f.plazo || 90, impacto: f.impactoEUR || 0 }))
      .concat(P.R.filter((r) => r.estado !== 'ok' && r.mitigacion).map((r) => ({ accion: r.mitigacion, motivo: 'Riesgo: ' + r.nombre, prio: r.estado === 'stop' ? 'Alta' : 'Media', plazo: r.estado === 'stop' ? 30 : 60, impactoTxt: `Riesgo de nivel ${r.nivel}/25 mitigado` })))
      .filter((x, i, l) => x.accion && l.findIndex((y) => y.accion === x.accion) === i).sort((a, b) => INF.horDe(a.plazo) - INF.horDe(b.plazo) || (b.impacto || 0) - (a.impacto || 0));
    const concl = P.noAplica ? `«${esc(titulo)}» no aplica a ${esc(emp || 'la empresa')}. ${esc(P.exig.motivo)} El área no se valora y no genera riesgos ni actuaciones.`
      : P.pendiente ? `«${esc(titulo)}» es un área recomendada para ${esc(emp || 'la empresa')} y no se ha entregado su documentación: ${esc(INF.min(P.falta))}. No baja la valoración global; si se entrega, se valora como las demás.`
      : P.sinDoc ? `«${esc(titulo)}» no se puede evaluar en ${esc(emp || 'la empresa')}: ${esc(INF.min(P.falta))}. Sin esa documentación la valoración del área es <b>0 sobre 100</b> ${I.pill('stop')}.`
      : !P.con ? `No se ha dispuesto de información suficiente para analizar «${esc(titulo)}» en ${esc(emp || 'la empresa')}. Este documento delimita el alcance del análisis.`
      : P.sc === null ? `Este documento analiza «${esc(titulo)}» en ${esc(emp || 'la empresa')} a partir de ${P.tiles.length} indicadores.`
        : `La valoración de «${esc(titulo)}» en ${esc(emp || 'la empresa')} es de <b>${P.sc} sobre 100</b> ${I.pill(P.st)}: ${INF.califica(P.sc)}.${P.ids === null && P.esenciales ? ` ${esc(P.esenciales)}.` : ''}`;
    const M = INF.mensajes(P, { primera: PL[0] ? `${esc(PL[0].accion)} (${PL[0].plazo} días).` : '' });
    const limites = [];
    if (!P.con) limites.push(`No se ha dispuesto de la información necesaria para analizar «${esc(titulo)}»; el documento no incluye cifras de esta área.`);
    if (P.sinCalc.length) limites.push(`No se han podido calcular por falta de información: ${esc(P.sinCalc.join(', ').toLowerCase())}.`);
    if (P.limite) limites.push(esc(P.limite));
    if (P.sinDoc) limites.unshift(`${esc(P.falta)}; el área no se ha podido evaluar y su valoración es 0.`);
    if (P.noAplica) limites.unshift(esc(P.exig.motivo));
    if (P.pendiente) limites.unshift(`${esc(P.falta)}; el área es recomendada para la empresa y no cuenta en la valoración global mientras no se entregue.`);
    // El documento nombra siempre su asunto: en la barra, el nombre del archivo, el rótulo de portada y el capítulo del libro
    const tipoI = (tipo || 'Informe de área') + ' · ' + titulo;
    const html = INF.portada({ tipo: tipoI, kicker: tipoI + (P.ilustrativo ? ' · caso ilustrativo' : ''), titulo, subtitulo: INF.frases(P.lede), empresa: emp, sector: INF.sectorTxt(), ambito: titulo })
      + I.summary('Resumen ejecutivo', INF.resumen(concl, M), P.st)
      + (P.tiles.length || P.detalle ? I.section(INF.titular(P), (P.tiles.length ? I.kpis(P.tiles) : '') + INF.graficoEstados(P) + P.detalle) : '')
      + (P.cruces.length && P.ids !== null ? I.section('Cruces de información', INF.crucesHTML(P.cruces)) : '')
      + (P.con && P.conRiesgos ? I.section(INF.titularRiesgos(P), INF.riesgosYmejoras(P)) : '')
      + (PL.length ? I.section('Recomendaciones priorizadas', INF.recomendaciones(PL)) + (INF.conGuia() ? '' : I.section('Hoja de ruta', INF.hojaDeRuta(PL))) : I.section('Hoja de ruta', `<p>${P.con ? 'El análisis no identifica actuaciones con impacto cuantificable en este ámbito. Se recomienda revisarlo de nuevo en el próximo cierre trimestral.' : 'El primer hito es reunir la información de gestión del área para cuantificar el diagnóstico y fijar las actuaciones.'}</p>`))
      + INF.cierre({ riesgos: P.R.length, limites, ilustrativo: P.ilustrativo, metodo: P.ids === null && P.metodoGlobal ? INF.METODO + ' ' + P.metodoGlobal : undefined });
    const abrir = A.consultorInf ? A.consultorInf.abrir : I.open;
    abrir({ titulo: tipoI, html, clave: 'mod:' + m.id, ctx: {
      titulo, tipo: tipo || 'Informe de área', empresa: emp, sector: INF.sectorTxt(),
      pasos: PL.slice(0, 9).map((x) => ({ q: x.accion, c: x.motivo, cuando: new Date(Date.now() + x.plazo * 864e5).toISOString().slice(0, 10), s: x.impacto ? 'Impacto medido: ' + F.eur(x.impacto) + ' al año' : 'El riesgo baja de nivel en la siguiente revisión' })),
      datos: [['Valoración del área', P.sc === null ? '—' : P.sc + '/100'], ['Indicadores evaluados', String(P.tiles.filter((t) => t.st).length)], ['En nivel crítico', P.tiles.filter((t) => t.st === 'stop').map((t) => INF.min(t.k)).join(', ') || 'Ninguno'], ['Riesgos identificados', String(P.R.length)], ['Mejora identificada', F.eur(impacto) + ' al año']]
    } });
  }
  S.current = () => current;

  /* ---------- Reloj de tareas: flotante en la aplicación o fuera del navegador ---------- */
  S.relojStore = {
    get: () => S.state && S.state.tiempos,
    commit: () => { S.save(); if (current === 'tiempos') S.rerender(); A.reloj.redrawAll(); }
  };
  const FLK = 'atalaya.reloj.flotante';
  S.relojAbierto = () => !!$('#rjFloat');
  S.relojFlotante = (abrir) => {
    const ya = $('#rjFloat');
    try { localStorage.setItem(FLK, abrir ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
    if (!abrir) { if (ya) ya.remove(); return; }
    if (ya) return;
    const box = document.createElement('div'); box.id = 'rjFloat'; box.className = 'rj-float glass';
    box.innerHTML = '<div class="rj-bar"><b>Reloj de tareas</b><span class="spacer"></span><button class="icon-btn" data-out title="Sacar del navegador" aria-label="Sacar del navegador">⧉</button><button class="icon-btn" data-min aria-label="Minimizar">–</button><button class="icon-btn" data-x aria-label="Cerrar">×</button></div><div class="rj-host"></div>';
    document.body.appendChild(box);
    let pos = null; try { pos = JSON.parse(localStorage.getItem(FLK + '.pos')); } catch (e) { /* nada */ }
    if (pos) { box.style.left = Math.min(innerWidth - 120, pos.x) + 'px'; box.style.top = Math.min(innerHeight - 60, pos.y) + 'px'; box.style.right = 'auto'; box.style.bottom = 'auto'; }
    A.reloj.mount(box.querySelector('.rj-host'), S.relojStore, { compact: true });
    box.querySelector('[data-x]').onclick = () => { S.relojFlotante(false); if (current === 'tiempos') S.rerender(); };
    box.querySelector('[data-min]').onclick = () => box.classList.toggle('min');
    box.querySelector('[data-out]').onclick = () => S.relojFuera();
    const bar = box.querySelector('.rj-bar');
    bar.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('button')) return;
      const r = box.getBoundingClientRect(), dx = ev.clientX - r.left, dy = ev.clientY - r.top; bar.setPointerCapture(ev.pointerId);
      const mv = (e) => { const x = Math.max(0, Math.min(innerWidth - r.width, e.clientX - dx)), y = Math.max(0, Math.min(innerHeight - 40, e.clientY - dy)); Object.assign(box.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' }); };
      const up = () => { bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); const b = box.getBoundingClientRect(); try { localStorage.setItem(FLK + '.pos', JSON.stringify({ x: b.left, y: b.top })); } catch (e) { /* nada */ } };
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up);
    });
  };
  /* Fuera del navegador: ventana siempre visible si el navegador lo permite; si no, ventana aparte; si tampoco, flotante */
  S.relojFuera = async () => {
    try { await A.reloj.pip(S.relojStore, () => { if (current === 'tiempos') S.rerender(); }); return; } catch (e) { /* sin Picture-in-Picture */ }
    const w = window.open('reloj.html', 'atalayaReloj', 'width=340,height=600');
    if (!w) S.relojFlotante(true);
  };
  S.rerender = () => { const ae = document.activeElement; const fid = ae && ae.id && host0().contains(ae) ? ae.id : null; show(current, { y: scrollY }); if (fid) { const el = document.getElementById(fid); if (el) el.focus({ preventScroll: true }); } };
  const host0 = () => $('#stPanel');
  S.refreshKpis = () => { /* el cuadro de mando se recalcula al abrirse */ };

  /* ---------- Cuadro de mando cruzado ---------- */
  /* Nota con el criterio único de Atalaya (A.nota): verde 1, ámbar 0,5, rojo 0, ponderado, sobre 100.
     ids: un módulo, una lista o null (todo el sistema estratégico). Sin motor de notas, los semáforos que se pasen. */
  S.notaRes = (ids) => (A.nota && A.nota.modulos ? A.nota.modulos(ids) : null);
  S.notaN = (ids, tiles) => { if (A.nota && A.nota.modulos) { const r = S.notaRes(ids); return r ? r.n100 : null; } const l = (tiles || []).filter((t) => t.st); return l.length ? Math.round(l.reduce((a, t) => a + (t.st === 'ok' ? 100 : t.st === 'warn' ? 50 : 0), 0) / l.length) : null; };
  S.allKpis = () => S.modules.filter((m) => m.kpis).flatMap((m) => { try { return m.kpis().map((k) => Object.assign({ mod: m.id, area: m.nombre }, k)); } catch (e) { return []; } });
  S.allRisks = () => S.modules.filter((m) => m.risks).flatMap((m) => { try { return m.risks().map((r) => Object.assign({ fuente: m.nombre, mod: m.id }, r)); } catch (e) { return []; } }).sort((a, b) => b.nivel - a.nivel);
  S.allFindings = () => S.modules.filter((m) => m.findings).flatMap((m) => { try { return m.findings().map((f) => Object.assign({ area: m.nombre, mod: m.id }, f)); } catch (e) { return []; } });

  S.register({
    id: 'tablero', nombre: 'Cuadro de mando', grupo: 'Visión', portada: true,
    informe() { return S.inf.empresa(); },
    // Las cifras, los riesgos, las mejoras y la nota del cuadro de mando: solo con los datos propios de la empresa (como los informes)
    render(host) { return S.inf.conPropios(() => this.pintar(host)); },
    pintar(host) {
      const k = S.allKpis(), R = S.allRisks(), Fi = S.allFindings();
      const areas = Array.from(new Set(k.map((x) => x.area)));
      const score = (list) => S.notaN([...new Set(list.map((x) => x.mod))], list);
      const global = S.notaN(null, k), gRes = S.notaRes(null);
      const compr = ((A.nota && A.nota.estrategia ? A.nota.estrategia() : null) || []).filter((x) => ['ok', 'warn', 'stop', 'nd'].includes(x.st));
      const impacto = Fi.reduce((a, f) => a + (f.impactoEUR || 0), 0);
      const stS = (x) => (x === null ? null : x >= 70 ? 'ok' : x >= 50 ? 'warn' : 'stop');
      const porArea = areas.map((a) => { const l = k.filter((x) => x.area === a); return { a, mod: l[0].mod, sc: score(l), st: stS(score(l)) }; });
      const vr = S.analysis().verdict, rojos = k.filter((x) => x.st === 'stop').length, nSD = k.filter((x) => x.sinDato).length;
      // Sin cuentas no hay veredicto; sin inversión definida, tampoco (se ve la situación de la empresa en el simulador)
      const veredicto = !S.simConDatos() ? { titulo: 'Sin datos', key: null, sd: true } : !S.invDefinida() ? { titulo: 'Sin inversión definida', key: null, sd: true } : vr;
      const motivoSinNota = S.datosPropios() ? 'sin comprobaciones con datos' : S.real() ? 'faltan los datos de la empresa' : 'datos de ejemplo';
      const ea = A.platform && A.platform.empresas && A.platform.empresas.activa();
      const hc = {
        kicker: 'Sistema estratégico · cuadro de mando',
        titulo: '¿Funciona la empresa <em>como un sistema</em>, área a área?',
        lede: 'Veintidós módulos sobre los mismos datos: finanzas, clientes, operaciones y entorno. Cada indicador con su semáforo, cada riesgo con su nivel y cada mejora con lo que vale al año.',
        empresa: S.sim.empresaNombre || (ea && ea.nombre), sector: A.SECTORS[S.sim.sector] && A.SECTORS[S.sim.sector].nombre,
        datos: [['Indicadores', String(k.length)], ['Módulos', String(areas.length)], ['Riesgos', String(R.length)], ['Hallazgos', String(Fi.length)]].concat((() => { const c = S.cifras(); return c && !c.sinDatos ? A.cifras.CAMPOS.map((x) => [x.n, c[x.k] == null ? 'Sin dato · ' + INF.FALTA_CIFRA[x.k] : A.cifras.fmt(x.k, c[x.k])]) : []; })()),
        acciones: [{ t: 'Informe 360', cls: 'solid', fn: () => (S.report360 ? S.report360(S.mod('tablero')) : S.moduleReport(S.mod('tablero'))) }, { t: 'Origen de datos', fn: () => show('origen') }, { t: 'Informe de auditoría', cls: 'ghost', fn: () => S.auditReport && S.auditReport() }],
        veredicto: { kicker: 'Nota del sistema estratégico', st: stS(global), titulo: global === null ? 'Sin nota · ' + motivoSinNota : global + '/100 · ' + (global >= 70 ? 'en orden' : global >= 50 ? 'con puntos que corregir' : 'con alertas serias'), texto: `${gRes && gRes.eval && gRes.eval.esenciales.total ? `Documentación esencial entregada: ${gRes.eval.esenciales.entregadas} de ${gRes.eval.esenciales.total}. ` : ''}Media de las áreas esenciales y de las recomendadas entregadas; un área esencial sin documentación cuenta 0. ${A.nota && A.nota.desglose ? A.nota.desglose(gRes || A.nota.puntuar(compr, true)).replace(/^s/, 'S') + ' (indicadores, datos pendientes, plan, objetivos, madurez y riesgos). ' : ''}${R.filter((r) => r.estado === 'stop').length} riesgos altos. ${global === null ? (S.datosPropios() ? '' : 'Un mundo sin datos propios no tiene nota ni entra en la media de la empresa. ') : ''}Es la misma nota que «Este mundo» en la cabecera${global === null ? '' : ` (${String(global / 10).replace('.', ',')}/10)`}; la de la empresa es la media de todos los mundos. Cada franja es un indicador: tócala para ir a su módulo.`,
          // Una franja por comprobación de la nota: el recuento de debajo es el mismo que el del texto
          luces: compr.length ? compr.map((x) => ({ n: x.t, v: String(x.d || '').replace(/<[^>]+>/g, ''), st: x.st === 'nd' ? null : x.st, fn: S.mod(x.zona) ? () => show(x.zona) : null })) : k.slice(0, 40).map((x) => ({ n: x.area + ' · ' + x.k, v: String(x.v).replace(/<[^>]+>/g, ''), st: x.st, fn: () => show(x.mod) })), enlace: { t: 'Ver riesgos', fn: () => document.getElementById('tbRisk') && document.getElementById('tbRisk').scrollIntoView({ behavior: 'smooth', block: 'center' }) } },
        kpis: [
          { k: 'Nota del sistema estratégico', info: 'Nota del sistema estratégico', v: global === null ? 'Sin nota' : global + '/100', st: stS(global), d: global === null ? motivoSinNota : `${rojos} indicadores en rojo · misma regla que la cabecera`, barras: porArea.map((x) => ({ n: x.a, v: x.sc == null ? 0 : x.sc, c: { ok: '#2fb24a', warn: '#e8a33b', stop: '#e04848' }[x.st] })) },
          { k: 'Riesgos altos', info: 'Riesgos altos', v: String(R.filter((r) => r.estado === 'stop').length), st: R.some((r) => r.estado === 'stop') ? 'stop' : 'ok', d: `${R.length} riesgos identificados`, barras: R.slice(0, 16).map((r) => ({ n: r.nombre, v: r.nivel, c: { ok: '#2fb24a', warn: '#e8a33b', stop: '#e04848' }[r.estado] })) },
          { k: 'Mejora identificada', info: 'Mejora identificada', v: F.eur(impacto), d: `${Fi.length} hallazgos con impacto anual`, barras: Fi.slice().sort((x, y) => (y.impactoEUR || 0) - (x.impactoEUR || 0)).slice(0, 12).map((f) => ({ n: f.hallazgo, v: f.impactoEUR || 0 })) },
          { k: 'Veredicto de inversión', info: 'Veredicto de inversión', v: veredicto.titulo, d: veredicto.sd ? (S.simConDatos() ? 'defina la inversión en el simulador' : 'cargue las cuentas en el simulador') : 'del simulador · escenario ' + (S.sim.escenario || 'base'), st: { go: 'ok', ok: 'ok', warn: 'warn', stop: 'stop' }[veredicto.key] || null, fn: () => { location.href = 'app.html'; } }
        ]
      };
      host.innerHTML = `${A.heroMundo ? A.heroMundo.html(hc) : `<div class="eyebrow">Cuadro de mando</div><h2>La empresa <em>de un vistazo</em></h2>${S.kpiTiles([
          { k: 'Salud global', v: global === null ? '—' : global + '/100', st: global === null ? null : global >= 70 ? 'ok' : global >= 50 ? 'warn' : 'stop', d: `${k.filter((x) => x.st === 'stop').length} indicadores en rojo` },
          { k: 'Riesgos altos', info: 'Riesgos altos', v: R.filter((r) => r.estado === 'stop').length, st: R.some((r) => r.estado === 'stop') ? 'stop' : 'ok', d: `${R.length} riesgos identificados` },
          { k: 'Mejora identificada', info: 'Mejora identificada', v: F.eur(impacto), d: `${Fi.length} hallazgos con impacto anual` },
          { k: 'Veredicto de inversión', info: 'Veredicto de inversión', v: veredicto.titulo, d: 'del simulador · escenario ' + (S.sim.escenario || 'base') }
        ])}`}
        <div class="glass pad stack mt" id="tbNota"><small class="muted">Calculando la nota de la empresa…</small></div>
        <div class="areas mt">${areas.map((a) => { const l = k.filter((x) => x.area === a); const sc = score(l); return `<button class="glass area" data-mod="${l[0].mod}"><div class="row"><b>${a}</b><span class="spacer"></span>${sc === null ? (l.every((x) => x.sinDato) ? '<span class="state st-nd">Sin datos</span>' : '') : `<span class="state st-${sc >= 70 ? 'ok' : sc >= 50 ? 'warn' : 'stop'}">${sc}</span>`}</div>${l.slice(0, 4).map((x) => `<div class="arow"><span>${x.k}</span><b class="num">${x.v}</b>${x.st ? `<i class="dotc ${x.st}"></i>` : '<i></i>'}</div>`).join('')}</button>`; }).join('')}</div>
        <div class="grid cols-2 mt"><div class="glass pad stack"><h4>Mapa de riesgos de todas las áreas</h4><div class="chart" id="tbRisk"></div></div><div class="glass pad stack"><h4>Riesgos principales</h4>${S.riskBlock(R.slice(0, S.N_RIESGOS), { num: true, total: R.length })}</div></div>
        <div class="glass pad mt stack"><h4>Mayores oportunidades de mejora</h4>${Fi.length ? `<div class="table-wrap"><table><thead><tr><th>Área</th><th style="text-align:left">Hallazgo</th><th>Impacto anual</th><th style="text-align:left">Acción</th><th>Plazo</th></tr></thead><tbody>${Fi.sort((a, b) => (b.impactoEUR || 0) - (a.impactoEUR || 0)).slice(0, 12).map((f) => `<tr><td>${esc(f.area)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(f.hallazgo)}</td><td>${F.eur(f.impactoEUR || 0)}</td><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(f.accion)}</td><td>${f.plazo} días</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Complete los módulos para ver oportunidades.</p>'}</div>`;
      if (A.nota && A.nota.calcular) A.nota.calcular().then((u) => { const el = host.querySelector('#tbNota'); if (!el || !u) return; const ks = Object.keys(u.mundos), f = (n) => (n == null ? '—' : String(n).replace('.', ','));
        el.innerHTML = `<div class="row"><h4>Cómo se calcula la nota</h4><span class="spacer"></span><span class="state st-${u.global == null ? '' : u.global >= 7 ? 'ok' : u.global >= 5 ? 'warn' : 'stop'}">Empresa ${f(u.global)}/10 · ${u.global == null ? '—' : Math.round(u.global * 10)}/100</span></div>
          <p class="small" style="margin:0">${esc(A.nota.regla ? A.nota.regla(u.global == null ? null : Math.round(u.global * 10)) : A.nota.REGLA)}</p>
          <div class="table-wrap"><table><thead><tr><th style="text-align:left">Mundo</th><th>Nota /10</th><th>Nota /100</th><th>Comprobaciones</th><th style="text-align:left">Calculada</th></tr></thead><tbody>${ks.map((k) => { const m = u.mundos[k], r = A.nota.puntuar(m.puntos); return `<tr><td style="text-align:left">${esc(m.n)}${k === 'estrategia' ? ' <small class="muted">(este mundo)</small>' : ''}</td><td>${m.nota == null ? 'Sin nota' : f(m.nota)}</td><td>${m.nota == null ? '—' : Math.round(m.nota * 10)}</td><td style="white-space:normal">${A.nota.desglose(r || A.nota.puntuar(m.puntos, true))}${m.motivo ? ` <small class="muted">· ${esc(m.motivo)}</small>` : ''}</td><td style="text-align:left">${A.nota.fechaTxt ? A.nota.fechaTxt(m) : m.fecha ? new Date(m.fecha).toLocaleDateString('es-ES') : 'sin abrir'}</td></tr>`; }).join('')}</tbody></table></div>
          <p class="small muted" style="margin:0">La nota de la empresa (${u.global == null ? 'sin nota' : f(u.global) + '/10'}) es la media de los mundos con nota (los que no tienen datos propios no cuentan); la de este mundo (${u.mundos.estrategia && u.mundos.estrategia.nota != null ? f(u.mundos.estrategia.nota) + '/10' : 'sin nota'}) es la del cuadro de mando y la de los informes del sistema estratégico. Si un mundo se calculó en otra fecha, su nota no recoge los cambios posteriores hasta que se abre.</p>`; }).catch(() => {});
      $$('.area', host).forEach((b) => b.onclick = () => show(b.dataset.mod));
      if (A.heroMundo) A.heroMundo.wire(host, hc);
      A.charts.riskMatrix($('#tbRisk', host), S.riesgosMatriz(R, S.N_RIESGOS), () => {});
    }
  });

  /* ---------- API del asistente ---------- */
  function apiFor() {
    return {
      summary() {
        return {
          pagina: 'Sistema estratégico', moduloActual: S.mod(current).nombre,
          indicadores: S.allKpis().map((k) => ({ area: k.area, indicador: k.k, valor: k.v, estado: k.st ? stName[k.st] : '' })),
          riesgos: S.allRisks().slice(0, 12).map((r) => ({ area: r.fuente, riesgo: r.nombre, nivel: r.nivel, mitigacion: r.mitigacion })),
          hallazgos: S.allFindings().slice(0, 15).map((f) => ({ area: f.area, hallazgo: f.hallazgo, impactoAnual: F.eur(f.impactoEUR || 0), accion: f.accion })),
          palancas: S.levers ? S.levers() : {}, modulos: S.modules.map((m) => ({ id: m.id, nombre: m.nombre }))
        };
      },
      levers: ['precio', 'volumen', 'costeVariable', 'fijos', 'mix'],
      setLever(k, v) { if (!S.setLever) throw new Error('Palancas no disponibles'); return S.setLever(k, v); },
      goTo(id) { const m = S.mod(id) || S.modules.find((x) => x.nombre.toLowerCase().includes(String(id).toLowerCase())); if (m) { show(m.id); return { ok: true, modulo: m.nombre }; } return { ok: false }; }
    };
  }

  /* ---------- Arranque ---------- */
  /* Cuenta con datos reales: nada de datos de ejemplo. Los módulos que siguen con los de ejemplo (o sin tocar)
     se vacían y piden sus datos; el simulador que alimenta las finanzas, también a cero. */
  /* Lo que viene del ejemplo se reconoce comparando con los valores por defecto: filas iguales a las de ejemplo
     (sin mirar fechas, que se generan al cargar), textos largos de ejemplo y las cifras de ejemplo de cada módulo.
     Se quita solo eso: lo que el usuario haya escrito o subido se conserva. Se aplica en cada arranque con datos reales. */
  const prim = (x) => x === null || ['string', 'number', 'boolean'].includes(typeof x);
  const filaEjemplo = (r, d) => !!(r && d && typeof r === 'object' && typeof d === 'object' && Object.keys(d).every((k) => k === 'fecha' || k === 'cierre' || !prim(d[k]) || r[k] === d[k]));
  const quitarEjemplo = (v, d) => {
    if (Array.isArray(v) && Array.isArray(d)) return d.length && d.every((x) => x && typeof x === 'object') ? v.filter((r) => !d.some((x) => filaEjemplo(r, x))) : v;
    if (v && d && typeof v === 'object' && typeof d === 'object' && !Array.isArray(v) && !Array.isArray(d)) { Object.keys(v).forEach((k) => { if (k in d) v[k] = quitarEjemplo(v[k], d[k]); }); return v; }
    if (typeof v === 'string' && v === d && v.length > 15) return '';
    return v;
  };
  // Cifras sueltas que son de ejemplo (no parámetros como los tipos de IVA o de la Seguridad Social)
  const NUM_EJ = { logistica: ['pedidosMes', 'transporte', 'almacen', 'personal', 'aTiempo', 'completos', 'rotacion'], impuestos: ['alquiler', 'ibi', 'iae'] };
  // Cada módulo puede añadir su propia limpieza (estados generados a partir del ejemplo)
  S.alVaciar = S.alVaciar || {};
  S.quitarEjemplo = (k, v) => {
    const d = S.defaults[k]; if (!v || typeof v !== 'object') return v;
    v = A.clone(v); const ej = v.ejemplo === true;
    if (d && typeof d === 'object') { v = quitarEjemplo(v, d); (NUM_EJ[k] || []).forEach((x) => { if (v[x] === d[x]) v[x] = 0; }); }
    if ('ejemplo' in v) v.ejemplo = false;
    if (S.alVaciar[k]) v = S.alVaciar[k](v, ej);
    return v;
  };
  S.aDatosReales = () => {
    if (S.simEjemplo()) { const ea = A.platform && A.platform.empresas && A.platform.empresas.activa(); S.sim = Object.assign(A.defaultState(), A.simVacio(S.sim.empresaNombre || (ea && ea.nombre) || '', S.sim.sector)); S.sim.empresa = Object.assign(A.defaultState().empresa, A.simVacio().empresa); S.sim.historico = undefined; delete S.sim.historico; S.saveSim(); }
    else if (S.sim && S.sim.historico && S.sim.historico.ejemplo) { delete S.sim.historico; S.saveSim(); }
    const antes = JSON.stringify(S.state);
    Object.keys(S.defaults).concat(Object.keys(S.alVaciar)).filter((k, i, a) => a.indexOf(k) === i).forEach((k) => {
      if (k === 'origen' || k === 'evolucion' || k === 'c360' || k === 'inversores') return;
      const v = S.quitarEjemplo(k, S.state[k]); if (v === undefined) return;
      S.state[k] = v;
      const ms = S.modules.filter((m) => m.datos && (m.clave || m.id) === k); if (v && typeof v === 'object') { if (ms.length && !ms.some((m) => S.conDatos(m))) v.__vacio = true; else delete v.__vacio; }
    });
    if (JSON.stringify(S.state) !== antes) S.save();
  };
  // ¿Módulo sin datos con la cuenta en datos reales? (se mantiene por compatibilidad: ahora lo decide «datos()» de cada módulo)
  S.pideDatos = (id) => S.real() && !S.conDatos(id);
  // Simulación de ejemplo: marcada como tal o con las cifras y el proyecto de la empresa de ejemplo (aunque se le haya cambiado el nombre)
  S.simEjemplo = () => { const s = S.sim; if (!s || !s.empresa || (A.simEsEjemplo && A.simEsEjemplo(s))) return true; const d = A.defaultState(); return S.num(s.empresa.ventas) === d.empresa.ventas && S.num(s.empresa.fijos) === d.empresa.fijos && s.proyecto === d.proyecto; };
  /* ¿Tiene el sistema estratégico datos propios (no de ejemplo)? Decide si el mundo tiene nota.
     Cuenta el simulador con cuentas propias o cualquier módulo con datos que no sean los de ejemplo. */
  S.datosPropios = () => {
    if (!S.simEjemplo() && S.num(S.sim.empresa.ventas) > 0) return true;
    const o = S.state && S.state.origen; if (o && ((o.archivos || []).some((a) => a.estado === 'ok') || Object.keys(o.manual || {}).length)) return true;
    return Object.keys(S.state || {}).some((k) => { const ms = S.modules.filter((m) => m.datos && !m.datosSim && (m.clave || m.id) === k), ant = S.state[k]; if (!ms.length || !ant || ant.ejemplo === true) return false;
      // «propios()» decide en los módulos que se generan solos a partir de las cifras (presupuesto, tesorería, Lean)
      try { S.state[k] = S.quitarEjemplo(k, ant); return ms.some((m) => (m.propios ? !!m.propios() : S.conDatos(m))); } catch (e) { return false; } finally { S.state[k] = ant; } });
  };
  /* Informes de una empresa con datos propios: nunca con datos de ejemplo.
     Con «datos de ejemplo permitidos», cada módulo que no se ha trabajado conserva el contenido de ejemplo (una empresa
     industrial: OEE, rutas, Distribuciones Norte, el DAFO del fundador…). En pantalla sirve para enseñar la herramienta;
     en el informe de una empresa que ya tiene datos propios se presentaría como suyo. El informe se calcula, por eso,
     igual que con datos reales: sobre una copia del estado sin lo que coincide con el ejemplo (S.quitarEjemplo, lo mismo
     que S.aDatosReales), sin guardar nada. Los módulos que se quedan sin datos salen de la valoración, los riesgos, las
     recomendaciones y el DAFO, y se citan en una línea del anexo. Sin datos propios en ninguna parte el informe es el del
     caso ilustrativo (se dice en portada y anexo); la empresa modelo conserva su contenido completo. */
  const NO_LIMPIAR = ['origen', 'evolucion', 'c360', 'inversores'];
  S.inf.conPropios = (fn) => {
    const P = A.platform;
    const esModelo = S._ficha ? !!S._ficha.modelo : !!(P && P.modelo && P.modelo.activa && P.modelo.activa());
    if (S._propios || !S.state || !S.sim || S.real() || esModelo || !S.datosPropios()) return fn();
    const st0 = S.state, sim0 = S.sim, save0 = S.save, saveSim0 = S.saveSim, st = Object.assign({}, st0);
    Object.keys(S.defaults).concat(Object.keys(S.alVaciar)).filter((k, i, a) => a.indexOf(k) === i && !NO_LIMPIAR.includes(k)).forEach((k) => { const v = S.quitarEjemplo(k, st0[k]); if (v !== undefined) st[k] = v; });
    let sim = sim0;
    // Simulación de ejemplo (o con la cuenta de resultados del ejemplo y solo las ventas propias): a cero, con las ventas que haya dado la empresa
    const pygEj = !S.simEjemplo() && S.simPygEjemplo();
    if (S.simEjemplo() || pygEj) { sim = Object.assign(A.defaultState(), A.simVacio(sim0.empresaNombre || '', sim0.sector)); sim.empresa = Object.assign(A.defaultState().empresa, A.simVacio().empresa); if (pygEj) { sim.empresa.ventas = S.num(sim0.empresa.ventas); sim.sinDatos = false; if (sim0.historico && !sim0.historico.ejemplo) sim.historico = sim0.historico; } else delete sim.historico; }
    else {
      // Simulación con cifras propias pero con partes del ejemplo sin tocar: la inversión de ejemplo, las respuestas del equipo y el histórico
      const def = A.defaultState(), vac = A.simVacio(), igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      sim = Object.assign({}, sim0);
      // La inversión de ejemplo (el sector cambia algunos de sus parámetros): el mismo proyecto con el mismo importe y las mismas contrataciones
      const inv = sim0.inversion || {};
      if (igual(inv, def.inversion) || (sim0.proyecto === def.proyecto && S.num(inv.importe) === def.inversion.importe && S.num(inv.contrataciones) === def.inversion.contrataciones && !(inv.lineas || []).length)) { sim.inversion = Object.assign(A.clone(inv), A.clone(vac.inversion)); sim.proyecto = ''; } // sin importes; los parámetros del cálculo se conservan
      if (igual(sim0.humano, def.humano)) sim.humano = Object.assign(A.clone(sim0.humano), A.clone(vac.humano));
      if (sim0.historico && sim0.historico.ejemplo) delete sim.historico;
    }
    S._propios = true; S.state = st; S.sim = sim; S.save = () => {}; S.saveSim = () => {};
    try { return fn(); } finally { S._propios = false; S.state = st0; S.sim = sim0; S.save = save0; S.saveSim = saveSim0; }
  };
  S.start = async function () {
    S.__vivo = true; // estado de su página (no el cálculo sin pantalla de js/calculo-mundos.js)
    A.sky();
    S.sim = LS.get(SIMK);
    const P = A.platform;
    if (P) {
      const ok = await P.guard(); if (!ok) return;
      P.mountAccount($('#account'));
      // Plan Esencial: solo simulador. El sistema estratégico se explica y se ofrece, sin abrirlo
      if (P.puede && !P.puede('estrategia')) {
        $('#stTabs').innerHTML = '';
        P.bloqueo('est', $('#stPanel'));
        return;
      }
      const remoteSim = await P.loadData('simulador'); if (remoteSim && remoteSim.empresa) S.sim = remoteSim;
    }
    if (!S.sim || !S.sim.empresa) { S.sim = A.defaultState(); const ea = P && P.empresas && P.empresas.activa(); if (ea) S.sim.empresaNombre = ea.nombre; }
    S.sim = Object.assign(A.defaultState(), S.sim);
    // El nombre de la empresa sale de su ficha (mapa de empresas o menú de la cuenta)
    const fichaA = P && P.empresas && P.empresas.activa();
    if (fichaA && fichaA.nombre && fichaA.nombre !== 'Mi empresa') S.sim.empresaNombre = fichaA.nombre;
    if (P) addEventListener('atalaya:empresa', (ev) => { if (ev.detail && ev.detail.id === P.empresaId() && ev.detail.nombre) { S.sim.empresaNombre = ev.detail.nombre; S.saveSim(); } });
    S.state = LS.get(LSK) || null;
    if (P) { const remote = await P.loadData('estrategia'); if (remote) S.state = remote; }
    S.state = Object.assign({}, A.clone(S.defaults), S.state || {});
    Object.keys(S.defaults).forEach((k) => { if (S.state[k] === undefined) S.state[k] = A.clone(S.defaults[k]); });
    if (S.real()) S.aDatosReales();
    buildTabs();
    const h = location.hash.replace('#', '');
    show(S.mod(h) ? h : 'tablero');
    // Atrás y adelante del navegador: se vuelve al módulo de esa entrada sin añadir otra
    const alVolver = () => { const k = location.hash.replace('#', '') || 'tablero'; if (S.mod(k) && k !== current) { S._volviendo = true; try { show(k); } finally { S._volviendo = false; } } };
    addEventListener('hashchange', alVolver); addEventListener('popstate', alVolver);
    if (S.onStart) try { S.onStart(); } catch (e) { console.error(e); }
    if (A.assistant) A.assistant.init({ api: apiFor(), page: 'estrategia' });
    try { if (localStorage.getItem('atalaya.reloj.flotante') === '1') S.relojFlotante(true); } catch (e) { /* sin almacenamiento */ }
    // El reloj de reloj.html escribe en el mismo almacenamiento: se recoge aquí
    addEventListener('storage', (e) => {
      if (e.key !== LSK || !e.newValue) return;
      try { const n = JSON.parse(e.newValue); if (n && n.tiempos) { S.state.tiempos = n.tiempos; if (current === 'tiempos') S.rerender(); A.reloj.redrawAll(); } } catch (x) { /* ignorar */ }
    });
    const openTerm = (t) => {
      const key = t.dataset.term.toLowerCase();
      const g = A.GLOSSARY.find((x) => x.t.toLowerCase() === key) || A.GLOSSARY.find((x) => x.t.toLowerCase().startsWith(key)) || A.GLOSSARY.find((x) => x.t.toLowerCase().includes(key));
      if (g) A.charts.pop(S.termHTML(g, { valor: t.dataset.val, st: t.dataset.st, ctx: t.dataset.ctx }), t);
    };
    document.addEventListener('click', (e) => { const t = e.target.closest('[data-term]'); if (t) openTerm(t); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.term) openTerm(e.target); });
  };
})();
