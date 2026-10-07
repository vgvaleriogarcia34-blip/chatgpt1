/* Atalaya · Auditoría integral · Ficha de recorrido
   Panel fijo al lado de cada paso para quien empieza: dónde estás, qué significa lo que ves, el siguiente paso
   (marcado con su foco: consultoría, mentoría o coaching ejecutivo), qué pedir a la empresa y cómo medirlo.
   Dos niveles por consultor: básico (todo explicado y abierto) y experto (lo justo y las notas técnicas).
   «Cómo decírselo»: junto a constantes, síntomas, causas y hallazgos, la frase en usted para el empresario. */
(function () {
  const A = window.Atalaya, V = A.interv;
  const { D, $, $$, esc, pl, fCorta, hoy, cte, ruta, causasOrdenadas, render, VISTAS } = V.int;
  const S = () => V.int.st();
  const P = () => A.platform;

  /* ---------- Nivel y estado del panel, por consultor ---------- */
  const key = (k) => { const p = P(); return p && p.k ? p.k(k) : k; };
  const leer = (k, d) => { try { const v = localStorage.getItem(key(k)); return v == null ? d : v; } catch (e) { return d; } };
  const escribir = (k, v) => { try { localStorage.setItem(key(k), v); } catch (e) { /* sin almacenamiento */ } };
  const nivelC = () => (leer('atalaya.iv.nivel', 'basico') === 'experto' ? 'experto' : 'basico');
  // En pantallas estrechas la ficha tapa el contenido: arranca plegada y recuerda su estado aparte
  const estrecho = () => !!(window.matchMedia && matchMedia('(max-width: 1179px)').matches);
  const kFicha = () => (estrecho() ? 'atalaya.iv.fichaM' : 'atalaya.iv.ficha');
  const abierto = () => { const v = leer(kFicha(), ''); return v ? v === '1' : !estrecho() && nivelC() === 'basico'; };
  V.nivelConsultor = nivelC;

  /* ---------- Los tres focos ---------- */
  const FOCO = {
    con: { n: 'Consultoría', d: 'documentar y analizar' },
    men: { n: 'Mentoría', d: 'acompañar y enseñar' },
    coa: { n: 'Coaching ejecutivo', d: 'preguntas de conciencia y compromiso' }
  };
  const foco = (f) => `<span class="iv-foco f-${f}" title="${esc(FOCO[f].n + ': ' + FOCO[f].d)}">${esc(FOCO[f].n)}</span>`;

  /* ---------- Fichas: una por paso ---------- */
  const ST_ = () => S();
  const nPreg = () => D.GUION.reduce((a, b) => a + b.p.length, 0);
  const rojas = () => D.CONSTANTES.filter((c) => cte(c.id) >= 4);
  const FICHA = {
    guion: {
      donde: 'Estás en la primera conversación con la empresa. Tu trabajo es escuchar, no proponer.',
      ves: () => { const ST = ST_(), h = Object.values(ST.sesion.hechas || {}).filter(Boolean).length, o = (ST.objetivos || []).length; return [`Llevas ${h} de ${nPreg()} preguntas hechas.`, o ? `Has recogido ${pl(o, 'objetivo', 'objetivos')} con sus palabras.` : 'Aún no hay objetivos recogidos: salen del bloque «Sus objetivos».']; },
      sig: [{ f: 'coa', t: 'Pregunta qué quiere conseguir y deja silencio.', q: '¿Qué tendría que pasar este año para que dijera que ha merecido la pena?' }, { f: 'con', t: 'Apunta frases literales: valen más que tu resumen.' }, { f: 'men', t: 'Si no sabe responder, no le enseñes todavía: anota la duda.' }],
      pedir: ['Permiso para grabar la sesión', 'Cuentas del último año, si las trae'],
      medir: ['Preguntas con respuesta (la mitad, como mínimo)', 'Objetivos dichos por la empresa, con sus palabras'],
      exp: 'Bloques de 5 a 20 minutos. Ve de lo general (objetivos) a lo concreto (áreas). Cierra con un compromiso pequeño y con fecha.'
    },
    constantes: {
      donde: 'Al terminar la sesión: pones nota del 1 al 5 a seis señales de salud de la empresa.',
      ves: () => { const t = D.CONSTANTES.filter((c) => cte(c.id)).length, r = rojas(); return [`${t} de ${D.CONSTANTES.length} constantes tomadas.`, r.length ? `En rojo (4 o 5): ${r.map((c) => c.n).join(', ')}. Por ahí empieza la conversación.` : t ? 'Ninguna en rojo: no hay urgencia vital.' : 'Un 1 es sano y un 5 es crítico.']; },
      sig: [{ f: 'con', t: 'Pon la nota con lo que has visto y oído, no con lo que crees.' }, { f: 'coa', t: 'Si una constante está en rojo, pregúntale cómo lo vive.', q: 'Del 1 al 10, ¿cuánto le pesa esto ahora mismo?' }],
      pedir: ['Saldo de caja y pagos de las próximas semanas, si el pulso está en rojo'],
      medir: ['Cada constante, en cada sesión: si baja, la intervención funciona'],
      exp: 'Compara tu nota con la estimación por el lenguaje (marca blanca). Si no coinciden, hay algo que no se ha dicho.'
    },
    escucha: {
      donde: 'Subes la grabación transcrita. Atalaya separa lo que dice la empresa de lo que dices tú.',
      ves: () => { const T = ST_().transcripciones || [], n = (k) => T.filter((t) => (t.momento || 'primera') === k).length; return T.length ? [`${pl(T.length, 'transcripción', 'transcripciones')}: ${n('primera')} de diagnóstico, ${n('comercial')} comerciales y ${n('intervencion')} de sesiones de trabajo.`, 'Revisa que cada una esté en su fase y que el cliente sea quien es.'] : ['Todavía no hay transcripciones.']; },
      sig: [{ f: 'con', t: 'Comprueba quién es el cliente en cada transcripción.' }, { f: 'con', t: 'Elige la fase correcta: diagnóstico, comercial o sesión de trabajo.' }],
      pedir: ['La grabación de cada sesión (la grabadora o el móvil sirven)'],
      medir: ['Que habla más la empresa que tú (más del 60 % de las palabras)'],
      exp: 'Los huecos con cita y el «yo / nosotros» dicen cuánto se implica el equipo. La comercial no cuenta para el diagnóstico.'
    },
    sintomas: {
      donde: 'Separas lo que se ve (síntoma) de lo que lo produce (causa).',
      ves: () => { const ST = ST_(), sc = ST.sintomas.filter((s) => !s.causa).length, l = causasOrdenadas(); return [`${pl(ST.sintomas.length, 'síntoma', 'síntomas')}${sc ? `, ${sc} sin causa` : ''}.`, l.length ? `La causa que más pesa: «${l[0].c.t}». Si la resuelves, se alivian ${pl(l[0].ss.length, 'síntoma', 'síntomas')}.` : 'Enlaza cada síntoma con su causa para ver por dónde empezar.']; },
      sig: [{ f: 'con', t: 'Enlaza cada síntoma con una causa (o pulsa «Proponer causas»).' }, { f: 'coa', t: 'Para confirmar una causa, pregunta cinco veces «¿por qué?».', q: '¿Y eso por qué pasa?' }, { f: 'men', t: 'Explícale con un ejemplo la diferencia entre síntoma y causa.' }],
      pedir: ['Un ejemplo real de cada síntoma (un pedido, una factura, un correo)'],
      medir: ['Síntomas con causa: todos', 'Causas confirmadas con la empresa'],
      exp: 'El orden sale del peso (gravedad y área en urgencias), no del número de síntomas. Liquidez, después rentabilidad, después crecimiento.'
    },
    triaje: {
      donde: 'Decides qué áreas se atienden ya, cuáles este trimestre y cuáles pueden esperar.',
      ves: () => { const r = ruta(), u = r.filter((x) => x.n === 'stop'); return [u.length ? `En urgencias: ${u.map((x) => x.a.n).join(', ')} (cerrar en 0 a 14 días).` : 'Ninguna área en urgencias.', `${pl(r.length, 'área', 'áreas')} entran en la hoja de ruta.`]; },
      sig: [{ f: 'con', t: 'Confirma el nivel de cada área: urgencias, preferente o programable.' }, { f: 'coa', t: 'Pregúntale si está de acuerdo con el orden.', q: 'Si solo pudiera arreglar una cosa este mes, ¿cuál sería?' }],
      pedir: ['Lo que haga falta para verificar las áreas en urgencias'],
      medir: ['Áreas con triaje confirmado'],
      exp: 'Urgencias: de 0 a 14 días. Preferente: este trimestre. Programable: sin urgencia. Lo que amenaza la caja va siempre primero.'
    },
    propuesta: {
      donde: 'Preparas la propuesta: qué vas a hacer, cuánto vale y cómo se paga.',
      ves: () => { const p = ST_().propuesta; return [p && p.generada ? 'La propuesta está preparada.' : 'La propuesta está sin preparar.']; },
      sig: [{ f: 'con', t: 'Parte de lo que ha dicho la empresa: sus objetivos y lo que le cuesta no resolverlo.' }, { f: 'coa', t: 'Antes de dar el precio, pregunta por el valor.', q: '¿Cuánto le cuesta al año que esto siga igual?' }],
      pedir: ['Quién decide y para cuándo'],
      medir: ['Propuesta enviada y respuesta con fecha'],
      exp: 'El componente variable es una condición del contrato, no un objetivo de la empresa: se sigue aparte.'
    },
    documentacion: {
      donde: 'Subes todo lo que te da la empresa. Atalaya reconoce cada archivo y lo lleva a su sitio.',
      ves: () => { const L = ST_().documentacion || [], e = L.filter((x) => x.err).length; return [L.length ? `${pl(L.filter((x) => !x.err && x.nombre !== '—').length, 'archivo repartido', 'archivos repartidos')}.` : 'Aún no has subido nada.', e ? `${pl(e, 'archivo', 'archivos')} sin reconocer: revisa que la primera fila tenga los nombres de las columnas.` : 'La lista «Qué tienes y qué falta» dice lo que queda por pedir.']; },
      sig: [{ f: 'con', t: 'Pide lo que está en ○ y súbelo todo junto.' }, { f: 'men', t: 'Enséñale de qué programa sale cada listado para que lo pueda sacar solo.' }],
      pedir: ['Cuentas de los dos o tres últimos años', 'Listados de ventas, compras y cobros en Excel', 'Plantilla con puesto y área'],
      medir: ['Los tres mundos con datos (simulador, estratégico y personas)'],
      exp: 'Las tablas se reconocen por las columnas. Los inversores van como acreedores, no como plantilla.'
    },
    auditoria: {
      donde: 'Con la documentación delante, compruebas punto por punto las áreas de la hoja de ruta.',
      ves: () => { const ST = ST_(), r = ruta(), tot = r.reduce((a, x) => a + (D.VERIFICA[x.a.id] || []).length, 0), rev = r.reduce((a, x) => a + Object.values(ST.verifica[x.a.id] || {}).filter((v) => v && v.e && v.e !== 'pend').length, 0); return [`${rev} de ${tot} puntos revisados.`, `${pl(ST.hallazgos.length, 'hallazgo', 'hallazgos')} anotados.`]; },
      sig: [{ f: 'con', t: 'Revisa cada punto y anota lo que veas como hallazgo, con su gravedad.' }, { f: 'con', t: 'Confirma o descarta cada causa con datos.' }, { f: 'men', t: 'Si el equipo no sabe sacar un dato, enséñale a hacerlo una vez.' }],
      pedir: ['El documento que pruebe cada punto (extracto, informe, contrato)'],
      medir: ['Puntos revisados: la mitad como mínimo', 'Causas confirmadas o descartadas'],
      exp: 'Un hallazgo es un hecho con prueba. Una causa sin prueba sigue siendo una idea por confirmar.'
    },
    ecosistema: {
      donde: 'Traes lo que ya miden el simulador, el sistema estratégico, personas y la mesa.',
      ves: () => [ST_().volcado ? 'Ya has traído las desviaciones del resto de Atalaya.' : 'Aún no has traído las desviaciones.'],
      sig: [{ f: 'con', t: 'Marca las desviaciones que confirman lo que has visto y vuélcalas.' }],
      pedir: [],
      medir: ['Desviaciones volcadas como hallazgos'],
      exp: 'Si un dato del ecosistema contradice lo que dice la empresa, es una pregunta para la próxima sesión.'
    },
    plan: {
      donde: 'Conviertes causas y hallazgos en acciones con fecha, responsable e indicador.',
      ves: () => { const a = ST_().plan.acciones; return [a.length ? `${pl(a.length, 'acción', 'acciones')} en el plan; ${a.filter((x) => x.estado === 'hecha').length} hechas.` : 'Aún no hay plan: genéralo desde las causas y los hallazgos.']; },
      sig: [{ f: 'con', t: 'Genera el plan y revisa que cada acción tenga responsable.' }, { f: 'coa', t: 'Que la empresa elija la primera acción y ponga la fecha.', q: '¿Qué va a hacer usted antes de la próxima sesión?' }, { f: 'men', t: 'Enséñale a medir el indicador de cada acción.' }],
      pedir: ['Nombre del responsable de cada acción'],
      medir: ['Acciones hechas en su fecha', 'Indicador de cada acción, de la foto inicial a la meta'],
      exp: 'Fases por orden de liquidez, rentabilidad y crecimiento. Pocas acciones con dueño valen más que muchas sin él.'
    },
    sesiones: {
      donde: 'Las sesiones de seguimiento: cada una revisa acuerdos, avances y constantes.',
      ves: () => { const s = ST_().sesiones || [], f = s.filter((x) => x.fecha >= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha))[0]; return [`${pl(s.length, 'sesión', 'sesiones')} en el calendario.`, f ? `La próxima: ${fCorta(f.fecha)}.` : 'No hay ninguna sesión próxima.']; },
      sig: [{ f: 'coa', t: 'Abre cada sesión preguntando por lo que se comprometió.', q: '¿Qué ha hecho desde la última vez y qué ha aprendido?' }, { f: 'men', t: 'Acompaña en la acción que se ha atascado: hazla con él una vez.' }, { f: 'con', t: 'Sube la transcripción como sesión de trabajo.' }],
      pedir: ['Los datos del indicador de cada acción, antes de la sesión'],
      medir: ['Acuerdos cumplidos sesión a sesión', 'Constantes, en cada sesión'],
      exp: 'Si un objetivo desaparece de lo que dice la empresa, revísalo: puede haber dejado de importarle.'
    },
    informes: {
      donde: 'Abres y descargas los informes. Los de la empresa no llevan nada interno; la guía del auditor, sí.',
      ves: () => { const k = Object.keys(ST_().informes || {}); return [k.length ? `Has abierto ${pl(k.length, 'informe', 'informes')}.` : 'Aún no has abierto ningún informe.']; },
      sig: [{ f: 'con', t: 'Repasa la guía del auditor antes de cada sesión.' }, { f: 'men', t: 'Entrega el informe en persona y explica cada parte.' }],
      pedir: [],
      medir: ['Informe entregado y comentado con la empresa'],
      exp: 'La guía del auditor recoge de dónde sale cada lectura, los objetivos sin validar, quién habló y los datos que faltan.'
    }
  };

  /* ---------- Cómo decírselo (en usted, para el empresario) ---------- */
  const min1 = (t) => { t = String(t || '').trim().replace(/[.]+$/, ''); return t ? t.charAt(0).toLowerCase() + t.slice(1) : t; };
  const aUsted = (t) => String(t || '').replace(/\bal empresario\b/gi, 'a usted').replace(/\bdel empresario\b/gi, 'de usted').replace(/\bel empresario\b/gi, 'usted');
  // Cada constante, en sus cinco lecturas, dicha a la empresa
  const CTE_DECIR = {
    tension: ['usted tiene margen para pensar', 'usted está ocupado, pero con las cosas en control', 'usted pasa buena parte del tiempo apagando fuegos', 'casi todo pasa por usted y eso le desgasta', 'usted está al límite, y así nos lo ha dicho'],
    temperatura: ['no hay urgencias abiertas', 'hay algún tema que vigilar', 'hay varias urgencias abiertas este trimestre', 'hay una urgencia con fecha cercana', 'hay un riesgo inmediato: un impago, una inspección, un litigio o un bloqueo'],
    pulso: ['la caja es holgada y está prevista', 'la caja llega, pero sin previsión', 'la caja se vive al día', 'cuesta llegar a las nóminas o a los impuestos', 'hay impagos o descubiertos en el banco'],
    respiracion: ['el equipo tiene holgura', 'el equipo va justo en los picos', 'el equipo está saturado a menudo', 'el equipo está saturado siempre y tira de horas extra', 'el equipo no llega y se pierden pedidos o calidad'],
    dependencia: ['la empresa funciona una semana sin sus personas clave', 'la empresa aguanta unos días sin sus personas clave', 'la empresa se resiente si faltan sus personas clave', 'la empresa se para si faltan sus personas clave', 'todo pasa por una sola persona'],
    reflejos: ['las decisiones se toman rápido y por escrito', 'las decisiones se toman, a veces tarde', 'las decisiones se aplazan', 'lo que se decide se cambia después en el pasillo', 'no está claro quién decide']
  };
  // La carencia que delata el síntoma, en palabras de la empresa
  const CARENCIA_U = {
    'Sin responsable con nombre': (t) => (t ? `nadie en concreto se encarga de ${t} y acaba pasando por usted` : 'muchas cosas no tienen a una persona concreta que se encargue y acaban pasando por usted'),
    'Sin criterio con número': (t) => (t ? `en ${t} se decide a ojo, sin una cifra de referencia` : 'algunas decisiones se toman a ojo, sin una cifra de referencia'),
    'Sin método escrito': (t) => (t ? `para ${t} no hay una forma de hacerlo escrita: cada uno lo hace a su manera` : 'algunas tareas no tienen una forma escrita de hacerse'),
    'Funciones sin definir': (t) => `no está claro qué le toca a cada uno${t ? ' en ' + t : ''}`,
    'Se decide sin datos': (t) => `las decisiones${t ? ' sobre ' + t : ''} se toman sin números delante`,
    'Sin fecha ni seguimiento': (t) => `lo que se acuerda${t ? ' sobre ' + t : ''} no tiene fecha ni nadie que lo revise`,
    'No está claro quién decide': (t) => `no está claro quién decide${t ? ' sobre ' + t : ''}`
  };
  const carenciaU = (t) => { const [b, ...r] = String(t || '').split(': '), f = CARENCIA_U[b]; return f ? f(r.join(': ')) : aUsted(min1(t)); };
  const DECIR = {
    cte: (c, v) => { const f = (CTE_DECIR[c.id] || [])[v - 1] || min1(c.e[v - 1]); return v >= 4 ? `Lo que vemos es que ${f}. Es lo primero que conviene atender: no es un juicio, es por dónde empezar.` : v === 3 ? `Lo que vemos es que ${f}. Conviene vigilarlo y lo revisaremos en cada sesión.` : `Lo que vemos es que ${f}. Es un punto de apoyo para todo lo demás.`; },
    sintoma: (s) => { const f = carenciaU(s.t); return s.cita ? `Cuando usted dice «${s.cita.length > 140 ? s.cita.slice(0, 140) + '…' : s.cita.replace(/[.]+$/, '')}», lo que entendemos es que ${f}. ¿Lo ve así? ¿Desde cuándo pasa?` : `Por lo que nos ha contado, ${f}. ¿Desde cuándo pasa y qué le cuesta cada vez?`; },
    causa: (c, n) => `${n > 1 ? `Varias de las cosas que nos ha contado (${n}) parecen venir del mismo sitio` : 'Lo que nos ha contado parece venir de aquí'}: ${aUsted(min1(c.t))}. ${c.estado === 'confirmada' ? 'Al resolverlo, se alivian a la vez.' : 'Todavía es una idea nuestra: queremos comprobarla con usted.'}`,
    hallazgo: (h) => `Al revisar la documentación hemos visto que ${aUsted(min1(h.t))}. ${+h.gravedad >= 4 ? 'Conviene ponerle solución pronto.' : 'Lo incluimos en el plan para resolverlo.'}`
  };
  V.comoDecir = DECIR;
  const caja = (t) => (nivelC() === 'basico' ? `<div class="iv-decir"><b>Cómo decírselo</b> «${esc(t)}»</div>` : `<details class="iv-decir"><summary>Cómo decírselo</summary>«${esc(t)}»</details>`);

  const ponerDecir = (host, tab) => {
    const ST = S();
    if (tab === 'constantes') $$('.iv-cte[data-c]', host).forEach((d) => { const c = D.CONSTANTES.find((x) => x.id === d.dataset.c), v = cte(d.dataset.c); if (c && v) d.insertAdjacentHTML('beforeend', caja(DECIR.cte(c, v))); });
    if (tab === 'sintomas') {
      $$('tr[data-s]', host).forEach((tr) => { const s = ST.sintomas.find((x) => x.id === tr.dataset.s); const td = tr.querySelector('td'); if (s && s.t && td) td.insertAdjacentHTML('beforeend', caja(DECIR.sintoma(s))); });
      $$('li[data-c]', host).forEach((li) => { const c = ST.causas.find((x) => x.id === li.dataset.c); if (c) li.insertAdjacentHTML('beforeend', caja(DECIR.causa(c, ST.sintomas.filter((s) => s.causa === c.id).length))); });
    }
    if (tab === 'auditoria') {
      $$('li[data-h]', host).forEach((li) => { const h = ST.hallazgos.find((x) => x.id === li.dataset.h); if (h) li.insertAdjacentHTML('beforeend', caja(DECIR.hallazgo(h))); });
      $$('li[data-c]', host).forEach((li) => { const c = ST.causas.find((x) => x.id === li.dataset.c); if (c) li.insertAdjacentHTML('beforeend', caja(DECIR.causa(c, ST.sintomas.filter((s) => s.causa === c.id).length))); });
    }
  };

  /* ---------- Panel ---------- */
  const panel = () => { let el = $('#ivFicha'); if (!el) { el = document.createElement('aside'); el.id = 'ivFicha'; el.className = 'iv-ficha'; el.setAttribute('aria-label', 'Ficha de recorrido'); document.body.appendChild(el); } return el; };
  const pintarFicha = (tab) => {
    const el = panel(), F = FICHA[tab], nv = nivelC(), on = abierto();
    document.body.classList.toggle('iv-ficha-on', on); document.body.classList.toggle('iv-basico', nv === 'basico');
    if (!F) { el.innerHTML = ''; return; }
    let ves = []; try { ves = F.ves(); } catch (e) { ves = []; }
    const sig = F.sig.map((x) => `<li>${foco(x.f)}<span>${esc(x.t)}${x.q && (nv === 'basico' || x.f === 'coa') ? `<em>«${esc(x.q)}»</em>` : ''}</span></li>`).join('');
    el.innerHTML = on ? `<div class="iv-fh"><b>Ficha de recorrido</b><span class="spacer"></span><button class="iv-fx" data-fcerrar aria-label="Plegar la ficha" title="Plegar">⟩</button></div>
      <div class="iv-fnv" role="group" aria-label="Nivel"><button data-nv="basico" aria-pressed="${nv === 'basico'}">Básico</button><button data-nv="experto" aria-pressed="${nv === 'experto'}">Experto</button></div>
      ${nv === 'basico' ? `<div class="iv-fs"><span class="iv-fk">Dónde estás</span><p>${esc(F.donde)}</p></div>` : ''}
      ${ves.length ? `<div class="iv-fs"><span class="iv-fk">Qué significa lo que ves</span>${ves.map((t) => `<p>${esc(t)}</p>`).join('')}</div>` : ''}
      <div class="iv-fs"><span class="iv-fk">Siguiente paso</span><ol class="iv-fsig">${sig}</ol></div>
      ${F.pedir.length && nv === 'basico' ? `<div class="iv-fs"><span class="iv-fk">Qué pedir a la empresa</span><ul>${F.pedir.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${F.medir.length ? `<div class="iv-fs"><span class="iv-fk">Cómo medirlo</span><ul>${F.medir.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${nv === 'experto' ? `<div class="iv-fs"><span class="iv-fk">Nota técnica</span><p>${esc(F.exp)}</p></div>` : `<details class="iv-fs"><summary class="iv-fk">Para saber más</summary><p>${esc(F.exp)}</p></details>`}
      <div class="iv-fs iv-fley">${Object.keys(FOCO).map((k) => `<p>${foco(k)} ${esc(FOCO[k].d)}</p>`).join('')}</div>`
      : `<button class="iv-fab" data-fabrir aria-label="Abrir la ficha de recorrido">Ficha de recorrido</button>`;
    const b = $('[data-fcerrar]', el); if (b) b.onclick = () => { escribir(kFicha(), '0'); pintarFicha(tab); };
    const a = $('[data-fabrir]', el); if (a) a.onclick = () => { escribir(kFicha(), '1'); pintarFicha(tab); };
    $$('[data-nv]', el).forEach((x) => (x.onclick = () => { escribir('atalaya.iv.nivel', x.dataset.nv); escribir(kFicha(), '1'); render(); }));
  };

  /* Cada vista pinta su ficha y sus «Cómo decírselo» */
  Object.keys(VISTAS).forEach((k) => {
    const v0 = VISTAS[k];
    VISTAS[k] = (host) => { v0(host); try { pintarFicha(k); ponerDecir(host, k); } catch (e) { console.error(e); } };
  });
  V.ficha = { FICHA, FOCO, pintar: pintarFicha };
})();
