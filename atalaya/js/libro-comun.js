/* Atalaya 360° · Libro corporativo · parte común a los mundos
   Cada informe que se abre (en cualquier mundo) lleva el botón «Añadir al libro»: guarda la versión que se está
   viendo como un capítulo del libro de la empresa. Desde la página del libro se puede pedir «recoger todos los
   informes»: la aplicación recorre los mundos, genera sus informes sin mostrarlos y vuelve al libro.
   El tablero general y la cartera de clientes pueden entrar también como capítulos (opcionales en la recogida).
   A.libro.cargar() · guardar(lib) · anadir(cap) · recoger(mundo) · firma(mundo) */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const P = () => A.platform;
  const $ = (s, r) => (r || document).querySelector(s);
  const pagina = () => (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');
  const MUNDO = { 'app.html': 'simulador', 'estrategia.html': 'estrategia', 'personas.html': 'personas', 'mesa.html': 'mesa', 'intervencion.html': 'intervencion', 'tablero.html': 'tablero', 'grupo.html': 'cartera' };
  const SECCION = { intervencion: 'Auditoría integral', simulador: 'Inversión y crecimiento', estrategia: 'Sistema estratégico', personas: 'Personas y equipos', mesa: 'Plan de trabajo' };
  // Capítulos opcionales: su sección se crea al añadir el primero
  const SECCION_EXTRA = { tablero: 'Situación general', cartera: 'Cartera de clientes' };
  const URL = { simulador: 'app.html', estrategia: 'estrategia.html', personas: 'personas.html', mesa: 'mesa.html', intervencion: 'intervencion.html', tablero: 'tablero.html', cartera: 'grupo.html' };
  const LIMITE = 3.6e6; // el servidor admite peticiones de hasta 4 MB
  const L = (A.libro = A.libro || {});
  const uid = () => 'c' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
  L.vacio = () => ({ v: 1, titulo: '', intro: '', secciones: Object.keys(SECCION).map((k) => ({ id: k, t: SECCION[k] })), caps: [] });
  L.SECCION = SECCION; L.SECCION_EXTRA = SECCION_EXTRA;
  L.cargar = async () => {
    let lib = null;
    if (P() && P().loadData) { try { lib = await P().loadData('libro'); } catch (e) { lib = null; } }
    lib = Object.assign(L.vacio(), lib || {});
    if (!Array.isArray(lib.caps)) lib.caps = [];
    if (!Array.isArray(lib.secciones) || !lib.secciones.length) lib.secciones = L.vacio().secciones;
    return lib;
  };
  L.tamano = (lib) => JSON.stringify(lib).length;
  L.guardar = async (lib) => {
    const n = L.tamano(lib);
    if (n > LIMITE) throw new Error(`El libro ocupa ${(n / 1e6).toFixed(1).replace('.', ',')} MB y el máximo es ${(LIMITE / 1e6).toFixed(1).replace('.', ',')} MB. Quite algún capítulo (los informes completos de persona son los más grandes).`);
    if (P() && P().saveData) await P().saveData('libro', lib);
  };
  /* Limpia el HTML de un informe para guardarlo: sin scripts, sin controles de edición y sin espacios de más */
  const limpiar = (html) => String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<(button|input|select|textarea)\b[^>]*>(?:[\s\S]*?<\/\1>)?/gi, '').replace(/\s{2,}/g, ' ');
  /* Firma de los datos guardados de un mundo: cada capítulo guarda la de su momento y el libro la compara con la
     actual para avisar de los capítulos desactualizados (los datos de su mundo han cambiado desde que se generó).
     La firma incluye también las cifras del simulador que usa el capítulo: el sistema estratégico calcula con la
     simulación entera (cuentas, proyección e inversión); la auditoría, con las cifras de la empresa (js/cifras.js:
     ventas, margen, personal, gastos fijos, caja, deuda, días de cobro, plantilla y cuentas de años anteriores).
     El tablero depende de todos los mundos y la cartera, de las empresas de la cuenta. Firmas «v2.»; las de antes
     (solo los datos del mundo) se siguen comparando como se guardaron (L.firmaV1). */
  const DATOS = { simulador: 'simulador', estrategia: 'estrategia', personas: 'personas', mesa: 'agenda', intervencion: 'intervencion' };
  const USA = { simulador: ['simulador'], estrategia: ['estrategia', 'simulador'], personas: ['personas'], mesa: ['agenda'], intervencion: ['intervencion', '@cifras'], tablero: ['simulador', 'estrategia', 'personas', 'agenda', 'intervencion'], cartera: ['@cartera'] };
  const hash = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + '.' + t.length.toString(36); };
  const CIFRAS_E = ['ventas', 'margen', 'personal', 'fijos', 'caja', 'deudaViva', 'dso', 'plantilla'];
  L.cifrasSim = (sim) => { const e = (sim && sim.empresa) || {}, h = sim && sim.historico && !sim.historico.ejemplo ? sim.historico.anios || [] : []; return { e: CIFRAS_E.map((k) => (e[k] == null ? null : e[k])), h, ej: sim ? sim.ejemplo !== false && !sim.sinDatos : true, f: (sim && sim.fechaCifras) || null }; };
  const memo = {};
  const leer = async (k) => { try { return P() && P().loadData ? await P().loadData(k) : null; } catch (e) { return null; } };
  const parte = async (k) => {
    if (k === '@cifras') return L.cifrasSim(await leer('simulador'));
    if (k === '@cartera') { const Pl = P(); if (!Pl || !Pl.empresas || !Pl.empresas.reales || !Pl.loadDataOf) return null; const out = [await leer('grupo')]; for (const e of Pl.empresas.reales()) { let sim = null; try { sim = await Pl.loadDataOf('simulador', e.id); } catch (x) { sim = null; } out.push([e.id, e.nombre, L.cifrasSim(sim)]); } return out; }
    return leer(k);
  };
  L.firma = async (mundo) => {
    const ks = USA[mundo]; if (!ks || !P() || !P().loadData) return null;
    const m = memo[mundo]; if (m && Date.now() - m.t < 4000) return m.v;
    let v = null; try { const ps = []; for (const k of ks) ps.push(await parte(k)); v = ps[0] == null && ks.length === 1 ? null : 'v2.' + hash(JSON.stringify(ps)); } catch (e) { v = null; }
    memo[mundo] = { t: Date.now(), v }; return v;
  };
  // Firma de antes (solo los datos del mundo): para los capítulos guardados con ella
  L.firmaV1 = async (mundo) => { const k = DATOS[mundo]; if (!k) return null; const d = await leer(k); return d ? hash(JSON.stringify(d)) : null; };
  // ¿Ha cambiado lo que usa el capítulo desde que se generó? f: { v2, v1 } firmas actuales de su mundo
  L.cambiado = (c, f) => { if (!c || !c.firma || !f) return false; const v2 = /^v2\./.test(c.firma), act = v2 ? f.v2 : f.v1; return !!(act && c.firma !== act); };
  L.anadir = async (cap, lib) => {
    const propio = !lib; lib = lib || (await L.cargar());
    const clave = cap.clave || cap.t;
    let c = lib.caps.find((x) => x.clave === clave);
    const datos = { t: cap.t, mundo: cap.mundo, html: limpiar(cap.html), cls: cap.cls || '', fecha: new Date().toISOString(), firma: await L.firma(cap.mundo) };
    if (c) Object.assign(c, datos);
    else {
      // Tablero y cartera: su propia sección, al final, la primera vez
      if (SECCION_EXTRA[cap.mundo] && !lib.secciones.some((s) => s.id === cap.mundo)) lib.secciones.push({ id: cap.mundo, t: SECCION_EXTRA[cap.mundo] });
      c = Object.assign({ id: uid(), clave, sec: cap.mundo && lib.secciones.some((s) => s.id === cap.mundo) ? cap.mundo : lib.secciones[0].id, incl: true }, datos); lib.caps.push(c);
    }
    if (propio) await L.guardar(lib);
    return c;
  };

  /* ---------- Síntesis de la situación de la empresa ----------
     Convierte el cálculo de prioridades (js/prioridad.js) en el contenido de un informe de dirección: conclusión,
     mensajes clave con su cifra, diagnóstico por áreas, asuntos prioritarios, recomendaciones y limitaciones. La usan el
     informe de situación general (js/tablero.js) y el resumen ejecutivo del libro (js/libro.js). Solo cuenta lo que
     describe a la empresa: quedan fuera los avisos de uso de la aplicación y todo lo que no sale de sus datos propios. */
  const escS = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const AMBITO = { simulador: 'Inversión y financiación', estrategia: 'Gestión del negocio', personas: 'Personas y organización', mesa: 'Ejecución del plan', cifras: 'Cuentas de la empresa', auditoria: 'Diagnóstico del consultor' };
  const AREA_G = { 'Gestor de tiempos': 'Uso del tiempo', 'Cuadro de mando': 'Indicadores de dirección', 'Procesos sin desperdicio (Lean)': 'Procesos', 'ABC y concentración': 'Concentración de clientes', 'Flujo del dinero': 'Generación de caja', 'Ventas en camino': 'Cartera comercial', 'Personas': 'Personas', 'Informe de auditoría': 'Control interno' };
  const CAPA_T = { liquidez: 'Liquidez', rentabilidad: 'Rentabilidad', estructura: 'Estructura y gestión', crecimiento: 'Crecimiento' };
  const CAPA_Q = { liquidez: 'Caja, cobros, pagos y deuda', rentabilidad: 'Margen, precios, costes y clientes', estructura: 'Organización, procesos, plan y riesgos', crecimiento: 'Ventas, mercado e inversión' };
  const NIVEL_T = { stop: 'Crítico', warn: 'A vigilar', ok: 'Correcto' };
  const ACTUA = { urgencias: 'inmediata', preferente: 'preferente', programable: 'programable' };
  const RUIDO = /(ejemplo|sin gestionar|datos? pendientes?|sin dar de alta|sin cuentas|incomplet|aterriz|archivos cargados|datos de la empresa cargados|\bhecho$|meta smart)/i;
  const INSTR = /^(toque|toca|pulse|pulsa|abra|entre|cargue|revise el triaje|div[ií]dalas)/i;
  const plu = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const dec1 = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  // Minúscula inicial para citar un asunto dentro de una frase (las siglas se respetan)
  const minus = (t) => (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
  const lista = (l) => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1]);
  L.AMBITO = AMBITO; L.NIVEL_T = NIVEL_T;
  // Fuente de una cifra, en palabras de la empresa
  L.fuenteCifra = (o) => String(o || '').replace(/^Simulador · /, '').replace(/^cuentas de/, 'Cuentas de').replace(/^datos introducidos/, 'Datos facilitados por la empresa').replace(/^Calculado con las cifras de la empresa$/, 'Cálculo sobre las cuentas').replace(/^Ficha de la empresa$/, 'Datos societarios').replace(/^Personas y equipos · personas dadas de alta$/, 'Relación de personal').replace(/^Cuentas · /, 'Cuentas · ');
  L.sintesis = (r, empresa) => {
    if (!r || !r.nota) return null;
    const nt = r.nota, M = nt.mundos || {};
    const C = A.cifras, cf = C && r.cifras && !r.cifras.sinDatos && !r.cifras.ejemplo ? r.cifras : null;
    // Solo cuenta lo que sale de información propia de la empresa: sus cuentas, el diagnóstico del consultor y los ámbitos valorados
    const conNota = (k) => (k === 'cifras' ? !!cf : k === 'auditoria') || ((k === 'simulador' || k === 'estrategia') && M[k] && M[k].nota != null);
    const asunto = (x) => {
      let t = String(x.t || '').replace(/^En (rojo|ámbar): /, ''), area = '', ev = x.d && !INSTR.test(x.d) ? String(x.d) : '';
      const tri = /^Triaje del consultor: (.+) en (urgencias|preferente|programable)$/.exec(t);
      if (tri) return { t: `${tri[1]}, con actuación ${ACTUA[tri[2]]} según el diagnóstico`, area: AMBITO.auditoria, ev: tri[2] === 'urgencias' ? 'Plazo de 0 a 14 días.' : tri[2] === 'preferente' ? 'Durante el trimestre en curso.' : '' };
      const m = /^(.*?) \((.+)\)$/.exec(t);
      if (m && x.mundo === 'estrategia') { t = m[1]; area = AREA_G[m[2]] || m[2]; }
      else if (m && x.mundo === 'simulador' && !ev) { t = m[1]; ev = m[2]; } // el valor del indicador es su evidencia
      t = t.replace(/^Veredicto de la inversión: (.+)$/, (a, c) => `Inversión prevista (valoración: ${c.charAt(0).toLowerCase() + c.slice(1)})`).replace(/^Riesgo alto: /, '');
      return { t, area: area || AMBITO[x.mundo] || '', ev };
    };
    const pts = (r.puntos || []).filter((x) => x.capa !== 'datos' && CAPA_T[x.capa] && conNota(x.mundo) && !RUIDO.test(x.t + ' ' + (x.d || ''))).map((x) => Object.assign({}, x, asunto(x)));
    const capas = Object.keys(CAPA_T).map((id) => { const l = pts.filter((x) => x.capa === id), rj = l.filter((x) => x.st === 'stop').length, am = l.filter((x) => x.st === 'warn').length; return { id, n: CAPA_T[id], q: CAPA_Q[id], total: l.length, rojos: rj, ambar: am, verdes: l.length - rj - am, st: !l.length ? '' : rj ? 'stop' : am ? 'warn' : 'ok' }; });
    const cp = (id) => capas.find((c) => c.id === id) || { total: 0, rojos: 0, ambar: 0, st: '' };
    const pend = pts.filter((x) => x.st !== 'ok').sort((a, b) => (b.score || 0) - (a.score || 0));
    const li = cp('liquidez'), re = cp('rentabilidad'), es = cp('estructura');
    const estan = (n) => (n === 1 ? 'está' : 'están');
    const eq = !li.total && !re.total ? { st: '', t: '', d: '' }
      : li.rojos ? { st: 'stop', t: 'La liquidez es la primera prioridad', d: `${plu(li.rojos, 'indicador', 'indicadores')} de caja, cobros o deuda ${estan(li.rojos)} en nivel crítico. Hasta que la empresa pague con holgura, las decisiones de crecimiento deben esperar.` }
        : re.rojos ? { st: 'warn', t: 'La caja se sostiene, pero la rentabilidad es insuficiente', d: `${plu(re.rojos, 'indicador', 'indicadores')} de margen, precios o costes ${estan(re.rojos)} en nivel crítico. La prioridad es que la actividad deje más margen antes de crecer.` }
          : li.ambar || re.ambar ? { st: 'warn', t: 'La empresa mantiene el equilibrio entre liquidez y rentabilidad, con puntos a vigilar', d: `${plu(li.ambar + re.ambar, 'indicador requiere', 'indicadores requieren')} vigilancia. Conviene corregirlos antes de asumir nuevos compromisos de crecimiento.` }
            : !li.total || !re.total ? { st: '', t: `${li.total ? 'La liquidez' : 'La rentabilidad'} no presenta asuntos críticos`, d: `No se dispone de indicadores de ${li.total ? 'rentabilidad' : 'liquidez'} para completar la valoración.` }
              : { st: 'ok', t: 'Liquidez y rentabilidad están en niveles correctos', d: 'La empresa puede dedicar recursos a reforzar su estructura y a crecer.' };
    const objs = (r.objetivos || []).map((o) => Object.assign({}, o, { st: o.cumplido ? 'ok' : cp(o.capa).st || '', capaN: CAPA_T[o.capa] || '' }));
    const abiertos = objs.filter((o) => !o.cumplido), cond = abiertos.filter((o) => o.st === 'stop');
    // Mensajes clave, cada uno con su cifra
    const msgs = [];
    if (cf) {
      if (cf.ventas != null) msgs.push(`<b>Ventas de ${escS(C.fmt('ventas', cf.ventas))}${cf.anio ? ' en ' + cf.anio : ''}</b>${cf.ebitda != null ? `, con un beneficio del negocio (EBITDA) de ${escS(C.fmt('ebitda', cf.ebitda))}${cf.ebitdaPct != null ? `, el ${escS(C.fmt('ebitdaPct', cf.ebitdaPct))} de las ventas` : ''}` : ''}.`);
      if (cf.deuda && cf.deudaNeta != null) msgs.push(`<b>Deuda neta de ${escS(C.eur(cf.deudaNeta))}</b>${cf.deudaEbitda != null ? `, ${escS(C.fmt('deudaEbitda', cf.deudaEbitda))} el EBITDA` : ''}${cf.caja != null ? `; la caja de ${escS(C.eur(cf.caja))}${cf.mesesCaja != null ? ` cubre ${dec1(cf.mesesCaja)} meses de costes de estructura` : ''}` : ''}.`);
      else if (cf.caja != null) msgs.push(`<b>Caja de ${escS(C.eur(cf.caja))}</b>${cf.mesesCaja != null ? `, que cubre ${dec1(cf.mesesCaja)} meses de costes de estructura` : ''}.`);
    }
    const rj = pts.filter((x) => x.st === 'stop').length, am = pts.filter((x) => x.st === 'warn').length;
    if (pts.length) msgs.push(`<b>${rj ? `${rj} de los ${pts.length} indicadores evaluados ${estan(rj)} en nivel crítico` : `Ninguno de los ${pts.length} indicadores evaluados está en nivel crítico`}</b>${am ? ` y ${am} ${am === 1 ? 'requiere' : 'requieren'} vigilancia` : ''}${rj ? `. Por áreas: ${capas.filter((c) => c.rojos).map((c) => `${c.n.toLowerCase()}, ${c.rojos}`).join('; ')}` : ''}.`);
    if (pend[0]) msgs.push(`<b>Primer asunto a resolver: ${escS(minus(pend[0].t))}</b>${pend[0].ev && pend[0].ev.length < 40 ? ` (${escS(pend[0].ev)})` : ''}, en el área de ${escS(CAPA_T[pend[0].capa].toLowerCase())}.`);
    if (abiertos.length) msgs.push(`<b>La dirección mantiene ${plu(abiertos.length, 'objetivo abierto', 'objetivos abiertos')}</b>${cond.length ? `; ${cond.length === abiertos.length && cond.length > 1 ? 'todos dependen' : cond.length === 1 ? 'uno depende' : cond.length + ' dependen'} de un área en nivel crítico` : ''}.`);
    // Recomendaciones, en el orden en que se sostienen las áreas
    const nombres = (id, st) => pend.filter((x) => x.capa === id && x.st === st).slice(0, 3).map((x) => minus(x.t) + (x.ev && x.ev.length < 25 && !/\.$/.test(x.ev) ? ` (${x.ev})` : '')).join('; ');
    const recs = [];
    if (li.rojos) recs.push({ t: 'Asegurar la liquidez antes de cualquier otra decisión', d: `Resolver ${plu(li.rojos, 'asunto crítico', 'asuntos críticos')}${li.rojos > 3 ? ', entre ellos' : ''}: ${nombres('liquidez', 'stop')}. Aplazar las decisiones de crecimiento hasta cerrarlos.` });
    else if (li.ambar) recs.push({ t: 'Reforzar la liquidez', d: `Corregir ${plu(li.ambar, 'indicador a vigilar', 'indicadores a vigilar')}: ${nombres('liquidez', 'warn')}.` });
    if (re.rojos) recs.push({ t: 'Recuperar la rentabilidad', d: `Revisar precios, costes y cartera de clientes en ${plu(re.rojos, 'asunto crítico', 'asuntos críticos')}${re.rojos > 3 ? ', entre ellos' : ''}: ${nombres('rentabilidad', 'stop')}.` });
    else if (re.ambar) recs.push({ t: 'Proteger la rentabilidad', d: `Corregir ${plu(re.ambar, 'indicador a vigilar', 'indicadores a vigilar')}: ${nombres('rentabilidad', 'warn')}.` });
    if (es.rojos) recs.push({ t: 'Reducir los riesgos de estructura y gestión', d: `Atender ${plu(es.rojos, 'asunto crítico', 'asuntos críticos')}${es.rojos > 3 ? ', entre ellos' : ''}: ${nombres('estructura', 'stop')}.${li.rojos ? ' Se pueden abordar en paralelo si no detraen caja.' : ''}` });
    if (cond.length) recs.push({ t: 'Reordenar los objetivos de la dirección', d: (() => { const ar = [...new Set(cond.map((o) => o.capaN.toLowerCase()))]; return `${cond.length === 1 ? 'Un objetivo depende' : cond.length + ' objetivos dependen'} de ${ar.length === 1 ? 'un área' : 'áreas'} en nivel crítico (${lista(ar)}). Conviene condicionar su calendario a la corrección de ${ar.length === 1 ? 'esa área' : 'esas áreas'}.`; })() });
    if (!li.rojos && !re.rojos && cp('crecimiento').total && cp('crecimiento').st !== 'ok') recs.push({ t: 'Abordar el crecimiento con la base actual', d: `Con liquidez y rentabilidad sin asuntos críticos, la empresa puede trabajar ${nombres('crecimiento', cp('crecimiento').rojos ? 'stop' : 'warn')}.` });
    // Alcance y limitaciones, en palabras de la empresa
    const lim = [];
    if (!cf) lim.push('No se ha dispuesto de las cuentas de la empresa: el análisis no incluye cifras de ventas, resultado, deuda ni caja.');
    const sinInd = capas.filter((c) => !c.total).map((c) => c.n.toLowerCase());
    if (sinInd.length) lim.push(`No se ha dispuesto de indicadores de ${lista(sinInd)}: ${sinInd.length === 1 ? 'esa área queda' : 'esas áreas quedan'} fuera de la valoración.`);
    ['simulador', 'estrategia'].filter((k) => M[k] && M[k].nota == null).forEach((k) => lim.push(`La información disponible sobre ${AMBITO[k].toLowerCase()} no es suficiente para valorarla; no se incluye en el análisis.`));
    const ambitos = Object.keys(M).filter((k) => M[k].nota != null).map((k) => ({ k, n: AMBITO[k] || M[k].n, nota: M[k].nota, r: A.nota && A.nota.puntuar ? A.nota.puntuar(M[k].puntos) : null }));
    const global = nt.global != null && (conNota('simulador') || conNota('estrategia')) ? nt.global : null;
    const tri = r.triaje && r.triaje.areas && r.triaje.areas.length ? ['stop', 'warn', 'ok'].flatMap((st) => r.triaje.areas.filter((a) => a.st === st)).map((a) => ({ n: a.n, st: a.st, t: { stop: 'Inmediata', warn: 'Preferente', ok: 'Programable' }[a.st] })) : [];
    return { empresa: empresa || '', eq, msgs, capas, pts, pend, cf, objs, abiertos, recs, lim, ambitos, global, triaje: tri, vacio: !pts.length && !cf && !objs.length && !tri.length };
  };
  // Gráficos de la situación (informe de situación y libro): indicadores por nivel y valoración de cada ámbito sobre 10
  const stN10 = (n) => (n == null ? null : n >= 7 ? 'ok' : n >= 5 ? 'warn' : 'stop');
  const n10 = (n) => String((Math.round(n * 10) / 10).toFixed(1)).replace('.', ',');
  L.graficoNiveles = (s) => {
    const I = A.informe, cs = (s && s.capas || []).filter((c) => c.total); if (!I || !I.donut || !cs.length) return '';
    const t = cs.reduce((a, c) => ({ r: a.r + c.rojos, a: a.a + c.ambar, v: a.v + c.verdes }), { r: 0, a: 0, v: 0 });
    return I.donut([{ k: 'Correctos', v: t.v, st: 'ok' }, { k: 'A vigilar', v: t.a, st: 'warn' }, { k: 'Críticos', v: t.r, st: 'stop' }], { titulo: 'Indicadores de la empresa por nivel', centro: String(t.r + t.a + t.v), centroTxt: 'indicadores', fmt: (v) => String(v), nota: 'Todos los indicadores evaluados en las cuatro áreas, clasificados frente a su umbral de referencia.' });
  };
  L.graficoAmbitos = (s) => {
    const I = A.informe, am = (s && s.ambitos || []); if (!I || !I.barras || !am.length) return '';
    return I.barras(am.map((m) => ({ k: m.n, v: m.nota, st: stN10(m.nota), t: n10(m.nota) + ' / 10' })), { titulo: 'Valoración por ámbito, sobre 10', max: 10, meta: 7, metaTxt: 'Desde 7, nivel correcto', nota: 'Cada ámbito pondera sus indicadores: correcto cuenta 1, a vigilar 0,5 y crítico 0.' });
  };
  // Resumen ejecutivo de la situación, listo para un informe (I.summary)
  L.resumenHTML = (s) => (s && !s.vacio ? `${s.eq.t ? `<p><b>${escS(s.eq.t)}.</b> ${escS(s.eq.d)}</p>` : ''}${s.msgs.length ? `<ul>${s.msgs.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}` : '');

  /* ---------- Botón «Añadir al libro» en cualquier informe abierto ---------- */
  const enLibro = new Set();
  const boton = (ov) => {
    const bar = $('.report-bar', ov); if (!bar || $('#rpLibro', bar)) return;
    const b = document.createElement('button'); b.className = 'btn ghost'; b.id = 'rpLibro'; b.type = 'button';
    const titulo = () => ((bar.querySelector('.rb-title, b') || {}).textContent || 'Informe').trim();
    const paper = () => ov.querySelector('#paper, .paper');
    const pintar = () => { const p = paper(); const interno = p && p.classList.contains('ci-interno'); b.disabled = !!interno; b.textContent = interno ? 'Al libro va la versión para la empresa' : enLibro.has(titulo()) ? 'En el libro ✓ · actualizar' : 'Añadir al libro'; };
    b.onclick = async () => {
      const p = paper(); if (!p) return;
      b.disabled = true; b.textContent = 'Guardando…';
      try {
        await L.anadir({ t: titulo(), clave: (ov.dataset.clave || titulo()), mundo: MUNDO[pagina()] || 'estrategia', html: p.innerHTML, cls: p.className.replace(/\b(pdf-doc|ci-interno)\b/g, '').trim() });
        enLibro.add(titulo()); b.textContent = 'En el libro ✓ · actualizar';
      } catch (e) { b.textContent = 'No cabe en el libro'; b.title = e.message; alert(e.message); }
      b.disabled = false;
    };
    const pdf = $('#rpPdf, #repPdf', bar); if (pdf) bar.insertBefore(b, pdf); else bar.appendChild(b);
    pintar();
    bar.addEventListener('click', () => setTimeout(pintar, 50));
  };
  const vigilar = () => {
    const mo = new MutationObserver(() => { const ov = document.getElementById('report'); if (ov && !ov.hidden) boton(ov); });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  };
  // La clave del informe (si la tiene) viaja con él para no duplicarlo en el libro
  const engancharOpen = () => {
    const I = A.informe; if (!I || I.__libro) return; const orig = I.open; I.__libro = true;
    I.open = function (o) {
      if (L.captura) { L.captura.push({ t: o.barra || o.titulo || 'Informe', clave: o.clave || o.barra || o.titulo, html: o.html, cls: o.paginado ? 'pp-doc' : '' }); return; }
      const r = orig.apply(this, arguments); const ov = document.getElementById('report'); if (ov) ov.dataset.clave = o.clave || o.barra || o.titulo || ''; return r;
    };
  };

  /* ---------- Recogida automática de los informes de un mundo ---------- */
  const COLA = 'atalaya.libro.cola';
  const ss = { get: () => { try { return JSON.parse(sessionStorage.getItem(COLA)); } catch (e) { return null; } }, set: (v) => { try { sessionStorage.setItem(COLA, JSON.stringify(v)); } catch (e) { /* nada */ } }, del: () => { try { sessionStorage.removeItem(COLA); } catch (e) { /* nada */ } } };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const hasta = async (fn, max) => { for (let i = 0; i < (max || 60); i++) { try { if (fn()) return true; } catch (e) { /* aún no */ } await espera(150); } return false; };
  let aviso = null;
  const progreso = (t) => { if (!aviso) { aviso = document.createElement('div'); aviso.className = 'lb-prog glass'; document.body.appendChild(aviso); } aviso.innerHTML = `<b>Preparando el libro corporativo</b><span>${t}</span>`; };
  // Ejecuta un generador de informes con la captura activa y devuelve lo capturado
  const capturar = async (fn) => {
    L.captura = [];
    try { const r = fn(); if (r && r.then) await r; await hasta(() => L.captura.length, 25); } catch (e) { console.error(e); }
    const c = L.captura; L.captura = null; return c;
  };
  L.recoger = async (mundo) => {
    engancharOpen();
    const lib = await L.cargar(); let n = 0;
    const meter = async (lista) => { for (const c of lista) { await L.anadir(Object.assign({ mundo }, c), lib); n++; } };
    // Capítulos de módulos sin datos: no se generan y, si había uno de antes (por ejemplo, de los datos de ejemplo), se quita
    const quitar = (claves) => { const q = new Set(claves); lib.caps = lib.caps.filter((c) => !(c.mundo === mundo && q.has(c.clave))); };
    if (mundo === 'estrategia') {
      const S = A.strat; await hasta(() => S && S.state && S.modules && S.modules.length, 80);
      [A.rutaEst].forEach((r) => r && r.closeMap && r.closeMap());
      // Solo los módulos con datos; el cuadro de mando y la auditoría, si algún módulo los tiene; la evolución, con dos cortes
      const conD = (m) => (S.conDatos ? S.conDatos(m) : true), alguno = S.modules.some((m) => m.datos && conD(m));
      const util = (m) => (m.datos ? conD(m) : m.id === 'evolucion' ? ((S.state.evolucion || {}).cortes || []).length >= 2 : alguno);
      // Sin información propia de la empresa (solo las cifras de muestra) el libro no lleva estos informes: nada de cifras que no son suyas
      const propios = !S.datosPropios || S.datosPropios();
      const todos = S.modules.filter((m) => m.id !== 'origen'), mods = propios ? todos.filter(util) : [];
      if (!propios) quitar(todos.flatMap((m) => ['est:' + m.id, 'mod:' + m.id]));
      quitar(todos.filter((m) => !util(m)).flatMap((m) => ['est:' + m.id, 'mod:' + m.id]));
      for (let i = 0; i < mods.length; i++) {
        const m = mods[i]; progreso(`Sistema estratégico · ${m.nombre} (${i + 1} de ${mods.length})`);
        try { S.show(m.id); await espera(120); await meter(await capturar(() => (S.report360 ? S.report360(m) : S.moduleReport(m)))); } catch (e) { console.error(e); }
      }
    } else if (mundo === 'personas') {
      const R = A.personas; await hasta(() => R && R.state, 80);
      if (P() && P().puede && !P().puede('personas')) return 0;
      [A.rutaPer].forEach((r) => r && r.closeMap && r.closeMap());
      if (R.state.personas.length) {
        progreso('Personas y equipos · alineamiento perfiles, puestos y equipos');
        if (R.informeAlineamiento) await meter(await capturar(() => R.informeAlineamiento()));
        progreso('Personas y equipos · foto de toda la empresa');
        if (R.informeEquipoCompleto) await meter(await capturar(() => R.informeEquipoCompleto(R.state.personas.map((p) => p.id), 'Toda la empresa')));
        for (const q of R.state.equipos || []) { progreso('Personas y equipos · equipo ' + q.nombre); await meter(await capturar(() => R.informeEquipoCompleto(q.miembros || [], q.nombre, q.objetivo))); }
      }
    } else if (mundo === 'intervencion') {
      const V = A.interv; await hasta(() => V && V.listo && V.informes, 80);
      if (P() && P().puede && !P().puede('intervencion')) return 0;
      const st = V.estado();
      if (st.sintomas.length) { progreso('Auditoría integral · primera sesión'); await meter(await capturar(() => V.informes.primera())); }
      if (Object.keys(st.verifica || {}).length || st.hallazgos.length) { progreso('Auditoría integral · resultado'); await meter(await capturar(() => V.informes.auditoria())); }
      if (st.plan.acciones.length) { progreso('Auditoría integral · plan de intervención'); await meter(await capturar(() => V.informes.plan())); }
    } else if (mundo === 'mesa') {
      await hasta(() => A.mesa && A.mesa.informe && A.mesa.listo, 80);
      let ag = null; try { ag = P() && P().loadData ? await P().loadData('agenda') : null; } catch (e) { ag = null; }
      if (!ag || !((ag.tareas || []).length || (ag.metas || []).length)) { quitar(['Plan de trabajo']); await L.guardar(lib); return 0; } // mesa vacía: sin capítulo
      progreso('Mesa de trabajo · plan de trabajo');
      await meter(await capturar(() => A.mesa.informe()));
    } else if (mundo === 'tablero') {
      await hasta(() => A.tablero && A.tablero.informe && A.tablero.listo, 120);
      progreso('Tablero general · la empresa de un vistazo');
      const html = A.tablero && A.tablero.informe ? A.tablero.informe() : '';
      // Sin información propia de la empresa no hay informe de situación: sin capítulo
      if (html) await meter([{ t: 'Situación general de la empresa', clave: 'tablero:general', html, cls: '' }]); else quitar(['tablero:general']);
    } else if (mundo === 'cartera') {
      await hasta(() => document.getElementById('gRep'), 120);
      const b = document.getElementById('gRep'); if (!b) return 0;
      progreso('Cartera de clientes · informe');
      await meter(await capturar(() => b.click()));
    } else if (mundo === 'simulador') {
      await hasta(() => document.getElementById('openReport') && A.appApi, 120);
      const st = A.appApi.getState ? A.appApi.getState() : null;
      if (st && st.empresa && (!(+st.empresa.ventas > 0) || (A.simEsEjemplo && A.simEsEjemplo(st)))) { quitar(['simulador:informe']); await L.guardar(lib); return 0; } // sin cifras propias de la empresa: sin capítulo
      progreso('Simulador · informe de la inversión');
      document.getElementById('openReport').click();
      await hasta(() => { const p = document.querySelector('#report .paper, #report #paper'); return p && p.innerHTML.length > 2000; }, 80); await espera(400);
      const ov = document.getElementById('report'), p = ov && ov.querySelector('.paper, #paper');
      if (p) await meter([{ t: 'Informe de la inversión', clave: 'simulador:informe', html: p.innerHTML, cls: p.className.replace(/\bpdf-doc\b/g, '') }]);
      const x = ov && ov.querySelector('#repClose, #rpClose, [data-close]'); if (x) x.click(); else if (ov) ov.hidden = true; document.body.style.overflow = '';
    }
    await L.guardar(lib);
    return n;
  };
  /* Cola de mundos pedida desde la página del libro: cada mundo recoge lo suyo y pasa al siguiente */
  L.recogerTodo = (mundos) => { ss.set({ cola: mundos.slice(), hechos: {}, inicio: Date.now() }); location.href = URL[mundos[0]] + '?libro=1'; };
  const seguirCola = async () => {
    const q = ss.get(); const m = MUNDO[pagina()];
    if (!q || !q.cola || !q.cola.length || q.cola[0] !== m || Date.now() - q.inicio > 15 * 60000) return;
    progreso('Abriendo ' + (SECCION[m] || m).toLowerCase() + '…');
    await espera(1800);
    let n = 0, err = '';
    try { n = await L.recoger(m); } catch (e) { err = e.message; console.error(e); }
    q.hechos[m] = err ? 'Error: ' + err : n; q.cola.shift(); ss.set(q);
    if (err && /máximo/.test(err)) { q.cola = []; ss.set(q); }
    location.href = q.cola.length ? URL[q.cola[0]] + '?libro=1' : 'libro.html#recogido';
  };
  L.resultadoCola = () => { const q = ss.get(); ss.del(); return q; };

  const iniciar = () => { engancharOpen(); if (MUNDO[pagina()]) { vigilar(); seguirCola(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
