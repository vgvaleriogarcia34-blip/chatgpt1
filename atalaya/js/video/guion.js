/* Atalaya 360° · Vídeo «Anticiparse y decidir mejor»: cálculo y guion
   El protagonista es Atalaya: cómo conecta los datos, avisa antes, proyecta la empresa, ensaya escenarios, dice qué palancas
   tocar y convierte la decisión en acción. La empresa modelo (Valdenorte) es solo el caso con el que se enseña.
   Todo sale del motor del simulador (A.analyze): la proyección a 60 meses, los escenarios, los semáforos y el efecto de
   cada palanca, una tras otra. El guion se escribe dos veces con las mismas cifras: para leer (subtítulos, «−285.000 €»)
   y para decir (voz, «menos doscientos ochenta y cinco mil euros»). Funciona en el navegador y en Node. */
(function (G) {
  const A = (G.Atalaya = G.Atalaya || {});
  const C = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- Las palancas, por grupos y en el orden en que se mueven ---------- */
  const GRUPOS = [
    { id: 'caja', n: 'La caja' }, { id: 'margen', n: 'Margen y crecimiento' }, { id: 'inversion', n: 'Cómo invertir' }, { id: 'equipo', n: 'El equipo' }
  ];
  const PALANCAS = [
    { id: 'cobros', g: 'caja', n: 'Cobrar antes', mundo: 'Sistema estratégico · Cobros', valor: 'De 86 a 65 días de cobro', f: (s) => { s.empresa.dso = 65; } },
    { id: 'proveedores', g: 'caja', n: 'Pagar a 60 días', mundo: 'Sistema estratégico · Compras', valor: 'De 50 a 60 días de pago', f: (s) => { s.empresa.dpo = 60; } },
    { id: 'margen', g: 'margen', n: 'Precio y compras', mundo: 'Sistema estratégico · Margen', valor: '+1,5 puntos de margen', f: (s) => { s.empresa.margen += 1.5; s.inversion.margenNuevo += 2; } },
    { id: 'mantenimiento', g: 'margen', n: 'Mantenimiento recurrente', mundo: 'Sistema estratégico · Plan', valor: 'Crecimiento del 6 al 8 %', f: (s) => { s.empresa.crecimiento = 8; } },
    { id: 'financiacion', g: 'inversion', n: 'Financiación a la medida', mundo: 'Simulador · Inversión', valor: '12 meses de carencia, 9 años', f: (s) => { s.inversion.carencia = 12; s.inversion.plazo = 9; } },
    { id: 'contratar', g: 'inversion', n: 'Contratar al ritmo de la venta', mundo: 'Simulador · Personas', valor: 'Sin contratar antes de tiempo', f: (s) => { s.inversion.anticipo = 0; } },
    { id: 'nave', g: 'inversion', n: 'La nave en dos tiempos', mundo: 'Simulador · Inversión', valor: 'Ampliación en el mes 18', f: (s) => { const l = (s.inversion.lineas || []).find((x) => x.tipo === 'nave'); if (l) l.mes = 18; } },
    { id: 'leasing', g: 'inversion', n: 'Leasing del láser', mundo: 'Simulador · Inversión', valor: 'Financiado el 85 %', f: (s) => { s.inversion.pctFin = 85; } },
    { id: 'equipo', g: 'equipo', n: 'Suplentes, procesos y relevo', mundo: 'Personas y equipos', valor: 'Que no dependa de una persona', f: (s) => { Object.assign(s.humano, { dependencia: 50, procesos: 55, sucesion: 50, mandosFormados: 60 }); } }
  ];

  /* ---------- Cálculo ---------- */
  function resultado(s, esc) {
    const r = A.analyze(s, A.scenarioMods(s, esc || 'base')), L = A.lights(s, r), v = A.verdict(L);
    return {
      liq: r.liquidezMin, mes: r.mesLiqMin, dE: r.deudaEbitda, pb: r.payback / 12, tir: r.tir, fin: r.cajaFinal, humano: r.humano ? r.humano.score : null,
      rojos: L.filter((l) => l.estado === 'stop').map((l) => l.nombre), avisos: L.filter((l) => l.estado === 'warn').map((l) => l.nombre),
      veredicto: v.key, veredictoT: v.titulo, serie: r.w.liquidez.slice(), sinInv: r.b.liquidez.slice()
    };
  }
  function calcular() {
    const s0 = A.modelo.generar('simulador'), K = A.modelo.cifras(), H = A.modelo.historico();
    const esc = {}; ['estres', 'pesimista', 'base', 'optimista'].forEach((k) => { esc[k] = resultado(s0, k); });
    let s = C(s0), antes = esc.base;
    const pasos = PALANCAS.map((p) => { p.f(s); const d = resultado(s); const o = { id: p.id, n: p.n, mundo: p.mundo, valor: p.valor, antes, despues: d }; antes = d; return o; });
    const grupos = GRUPOS.map((g) => { const ps = pasos.filter((d) => PALANCAS.find((p) => p.id === d.id).g === g.id); return { id: g.id, n: g.n, pasos: ps, antes: ps[0].antes, despues: ps[ps.length - 1].despues }; });
    return { K, H, s0, sFinal: s, esc, pasos, grupos, final: antes, finalEstres: resultado(s, 'estres') };
  }

  /* ---------- Números en palabras (para la voz) ---------- */
  const U = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const CEN = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  const menor100 = (n) => (n < 30 ? U[n] : D[Math.floor(n / 10)] + (n % 10 ? ' y ' + U[n % 10] : ''));
  const menor1000 = (n) => (n === 100 ? 'cien' : (n >= 100 ? CEN[Math.floor(n / 100)] + (n % 100 ? ' ' : '') : '') + (n % 100 || n < 100 ? menor100(n % 100) : ''));
  // «apocope»: uno → un delante de «mil» o «millones» (veintiuno → veintiún)
  const apoc = (t) => t.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
  function palabras(n) {
    n = Math.round(Math.abs(n));
    if (n < 1000) return menor1000(n);
    if (n < 1e6) { const m = Math.floor(n / 1000), r = n % 1000; return (m === 1 ? 'mil' : apoc(menor1000(m)) + ' mil') + (r ? ' ' + menor1000(r) : ''); }
    const M = Math.floor(n / 1e6), r = n % 1e6; return (M === 1 ? 'un millón' : apoc(palabras(M)) + ' millones') + (r ? ' ' + palabras(r) : '');
  }
  const decimalPal = (x, dec) => { const k = Math.pow(10, dec), neg = x < 0, a = Math.round(Math.abs(x) * k) / k, e = Math.floor(a), f = Math.round((a - e) * k); return (neg ? 'menos ' : '') + palabras(e) + (dec && f ? ' coma ' + palabras(f) : ''); };
  const miles = (x) => Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dec = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',').replace(/,0$/, '');

  /* Dos formas de escribir lo mismo */
  const LEER = {
    eur: (x) => (x < 0 ? '−' : '') + miles(Math.round(x / 1000) * 1000) + ' €',
    meur: (x) => dec(x / 1e6, 1) + ' M€',
    pct: (x, d) => dec(x, d == null ? 1 : d) + ' %',
    n: (x, d) => dec(x, d || 0),
    veces: (x) => dec(x, 1) + ' veces',
    anios: (x) => (x > 15 || !isFinite(x) ? 'más de 15 años' : dec(x, 1) + ' años'),
    mes: (x) => 'el mes ' + x
  };
  const DECIR = {
    eur: (x) => { const v = Math.round(x / 1000) * 1000, a = Math.abs(v); let t = palabras(a); if (a >= 1e6 && a % 1e6 === 0) t += ' de'; return (v < 0 ? 'menos ' : '') + t + ' euros'; },
    meur: (x) => { const t = decimalPal(Math.round(x / 1e5) / 10, 1); return (t === 'uno' ? 'un millón' : apoc(t) + ' millones') + ' de euros'; },
    pct: (x, d) => decimalPal(x, d == null ? 1 : d) + ' por ciento',
    n: (x, d) => decimalPal(x, d || 0),
    veces: (x) => decimalPal(Math.round(x * 10) / 10, 1) + ' veces',
    anios: (x) => (x > 15 || !isFinite(x) ? 'más de quince años' : decimalPal(Math.round(x * 10) / 10, 1) + ' años'),
    mes: (x) => 'el mes ' + palabras(x)
  };

  /* ---------- Guion: Atalaya en primer plano, la empresa modelo como caso ---------- */
  function guion(R, f) {
    const K = R.K, H = R.H, e = R.esc, F = R.final, h0 = H[0], h4 = H[H.length - 1], Gp = Object.fromEntries(R.grupos.map((g) => [g.id, g]));
    const esc = [];
    const add = (id, mundo, titulo, texto, extra) => esc.push(Object.assign({ id, mundo, titulo, texto }, extra || {}));
    add('gancho', 'Atalaya 360°', 'Ver el futuro antes de decidir', 'La mayoría de las decisiones importantes de una empresa se toman mirando hacia atrás: el cierre del trimestre, el extracto del banco, la intuición. Atalaya le enseña el futuro de su empresa antes de que llegue, para que se anticipe y decida con números. En los próximos minutos verá cómo lo hace.');
    add('conecta', 'Un solo modelo', 'Todo conectado en un solo modelo', 'Todo empieza por conectar. Atalaya junta en un solo modelo lo que hoy está repartido en hojas, programas y cabezas: las cuentas de varios años, las ventas y los cobros, las compras, el equipo, e incluso las conversaciones con la dirección. Cada mundo de Atalaya lee esos mismos datos, y cuando uno cambia, la proyección cambia con él.');
    add('caso', 'Caso de ejemplo', 'Un caso para verlo', `Para verlo usaremos un caso de ejemplo: una empresa industrial familiar de ${f.n(K.plantilla)} personas, con ${f.meur(K.ventas)} de ventas, que está pensando invertir ${f.meur(K.inversion)}. La empresa es inventada; lo que Atalaya hace con ella es lo mismo que hará con la suya.`);
    add('historia', 'Simulador · Historia y cuentas', 'Leer el pasado de otra manera', `Primero, Atalaya lee el pasado de otra manera. Cinco años de cuentas en un minuto: las ventas crecen un ${f.pct(K.cagr)} al año, pero la caja baja de ${f.eur(K.tesoreria0)} a ${f.eur(K.tesoreria)} y la deuda a corto plazo pasa de ${f.eur(h0.deudaCP)} a ${f.eur(h4.deudaCP)}. Lo que en el extracto del banco se ve tarde, aquí se ve de un vistazo: crecer está consumiendo la caja.`);
    add('semaforos', 'Todos los mundos', 'Semáforos que avisan antes', `Después, Atalaya cruza los mundos y enciende los semáforos. El sistema estratégico detecta que los clientes pagan a ${f.n(K.dso)} días y que uno solo es el ${f.pct(K.topPct, 0)} de las ventas. El análisis de márgenes, que una línea deja un ${f.pct(K.carpPct, 0)} frente al ${f.pct(K.montPct, 0)} de otra. Personas y equipos, que todo pasa por una sola persona. Y el simulador pone sobre la mesa la inversión prevista. Son señales que normalmente se descubren cuando ya son problemas.`);
    add('proyeccion', 'Simulador · Proyección a 60 meses', 'Anticiparse: la empresa mes a mes', `Y ahora, lo importante: el futuro. Atalaya proyecta la empresa mes a mes durante cinco años, con la inversión tal como está planteada. Hoy, antes de firmar nada, ya sabe que en ${f.mes(e.base.mes)} la liquidez caería a ${f.eur(e.base.liq)}, aun con la póliza agotada. Lo sabe con más de un año de antelación. El simulador lo resume en una frase: rediseñar antes de mover.`);
    add('escenarios', 'Simulador · Escenarios', 'Ensayar el futuro antes de vivirlo', `Una sola previsión no basta. Atalaya ensaya a la vez el escenario de estrés, el pesimista, el base y el optimista. En estrés, la liquidez llega a ${f.eur(e.estres.liq)}; ni siquiera el optimista se libra: ${f.eur(e.optimista.liq)}. Y sin invertir, la caja aguanta, pero la empresa deja de crecer. Así se decide sabiendo qué pasa si las cosas salen peor de lo previsto.`);
    add('palancas', 'Simulador y sistema estratégico', 'Qué tocar: las palancas', 'La pregunta ya no es si invertir, sino cómo. Atalaya le enseña qué palancas tiene, en qué mundo vive cada una y cuánto mueve la proyección. Vamos a tocarlas por grupos y a mirar cómo cambia la línea.');
    const g = (k) => Gp[k];
    add('g-caja', 'Sistema estratégico · Cobros y compras', '1. La caja', `Primero, la caja. Cobrar a ${f.n(65)} días en lugar de ${f.n(K.dso)}, con certificaciones mensuales, y pagar a los proveedores a ${f.n(60)} en lugar de ${f.n(50)}. Solo con estos dos cambios, la liquidez mínima pasa de ${f.eur(g('caja').antes.liq)} a ${f.eur(g('caja').despues.liq)}.`, { grupo: 'caja' });
    add('g-margen', 'Sistema estratégico · Margen y plan', '2. Margen y crecimiento', `Segundo, el margen y el crecimiento. Una tabla de precios con margen mínimo y un acuerdo anual de compras suman un punto y medio de margen, y una línea de mantenimiento con contratos anuales sube el crecimiento al ${f.pct(8, 0)}. La liquidez mínima queda en ${f.eur(g('margen').despues.liq)} y la caja a cinco años sube de ${f.meur(g('margen').antes.fin)} a ${f.meur(g('margen').despues.fin)}.`, { grupo: 'margen' });
    add('g-inversion', 'Simulador · Inversión', '3. Cómo invertir', `Tercero, cómo se hace la inversión. ${f.n(12)} meses de carencia y ${f.n(9)} años de plazo, contratar al ritmo de la venta, la ampliación de nave en ${f.mes(18)} y el láser en leasing al ${f.pct(85, 0)}. La misma inversión, hecha de otra manera, y la línea cruza el cero: la liquidez mínima pasa a ${f.eur(g('inversion').despues.liq)}.`, { grupo: 'inversion' });
    add('g-equipo', 'Personas y equipos', '4. El equipo', `Y cuarto, el equipo: suplentes en los puestos críticos, procesos escritos y un plan de relevo. No mueve la caja, pero el sistema humano pasa de ${f.n(g('equipo').antes.humano)} a ${f.n(g('equipo').despues.humano)} sobre cien. La empresa está preparada para crecer sin depender de una persona.`, { grupo: 'equipo' });
    add('rumbo', 'Simulador · Resultado', 'La decisión, con números', `Este es el resultado: las mismas cifras de partida, la misma inversión y otra decisión. La liquidez mínima pasa de ${f.eur(e.base.liq)} a ${f.eur(F.liq)}, la inversión se recupera en ${f.anios(F.pb)} en lugar de ${f.anios(e.base.pb)}, la deuda baja de ${f.veces(e.base.dE)} a ${f.veces(F.dE)} el EBITDA y la caja a cinco años pasa de ${f.meur(e.base.fin)} a ${f.meur(F.fin)}. El veredicto cambia de rediseñar a adelante, y se sabe antes de firmar.`);
    add('estres', 'Simulador · Escenario de estrés', 'Preparado para lo peor', `Y si las cosas salen mal, con las palancas el escenario de estrés pasa de ${f.eur(e.estres.liq)} a ${f.eur(R.finalEstres.liq)}: un hueco que se cubre ampliando la póliza. La empresa ya no depende de que todo salga bien.`);
    add('accion', 'Auditoría · Mesa de trabajo', 'De la decisión a la acción', `Decidir es la mitad. Atalaya convierte cada palanca en trabajo: la auditoría integral la ordena en un plan de intervención, la mesa de trabajo la convierte en metas con fecha y responsable, y la tesorería a ${f.n(13)} semanas y la nota de cada mundo avisan si algo se desvía. Así, anticiparse no se queda en un informe.`);
    add('planes', 'Atalaya 360°', 'Por dónde empezar', 'Puede empezar por lo que necesite hoy. Con el plan Esencial, el simulador, para decidir una inversión. Con el Profesional, además, el sistema estratégico, para gobernar la empresa cada día. Y con el plan Consultora, también personas y equipos y la auditoría integral, para acompañar a otras empresas.');
    add('usted', 'Pruébelo', 'Ahora, usted', 'Ahora, pruébelo usted. Active o quite las palancas y mire cómo cambia el rumbo. Con su empresa, Atalaya hace lo mismo con sus propios datos.');
    return esc;
  }

  A.videoModelo = { PALANCAS, GRUPOS, calcular, guion, resultado, LEER, DECIR, palabras };
})(typeof window !== 'undefined' ? window : globalThis);
