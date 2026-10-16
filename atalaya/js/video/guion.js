/* Atalaya 360° · Vídeo de la empresa modelo: cálculo y guion
   Todo sale del motor del simulador (A.analyze) con los datos de Valdenorte: la proyección a 60 meses, los escenarios,
   los puntos rojos y el efecto de cada palanca, una tras otra. El guion se escribe dos veces con las mismas cifras:
   para leer (subtítulos, «−285.000 €») y para decir (voz, «menos doscientos ochenta y cinco mil euros»).
   Funciona en el navegador y en Node (para generar la voz y grabar el vídeo). */
(function (G) {
  const A = (G.Atalaya = G.Atalaya || {});
  const C = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- Las palancas, en el orden en que se mueven ---------- */
  const PALANCAS = [
    { id: 'cobros', n: 'Cobrar antes', mundo: 'Sistema estratégico · Cobros', valor: 'De 86 a 65 días de cobro', f: (s) => { s.empresa.dso = 65; } },
    { id: 'margen', n: 'Precio y compras', mundo: 'Sistema estratégico · Margen y compras', valor: '+1,5 puntos de margen', f: (s) => { s.empresa.margen += 1.5; s.inversion.margenNuevo += 2; } },
    { id: 'financiacion', n: 'Financiación a la medida', mundo: 'Simulador · Inversión', valor: '12 meses de carencia y 9 años de plazo', f: (s) => { s.inversion.carencia = 12; s.inversion.plazo = 9; } },
    { id: 'contratar', n: 'Contratar al ritmo de la venta', mundo: 'Personas y equipos · Simulador', valor: 'Sin contratar antes de tiempo', f: (s) => { s.inversion.anticipo = 0; } },
    { id: 'proveedores', n: 'Pagar a 60 días', mundo: 'Sistema estratégico · Compras', valor: 'De 50 a 60 días de pago', f: (s) => { s.empresa.dpo = 60; } },
    { id: 'nave', n: 'La nave en dos tiempos', mundo: 'Simulador · Inversión', valor: 'Ampliación en el mes 18', f: (s) => { const l = (s.inversion.lineas || []).find((x) => x.tipo === 'nave'); if (l) l.mes = 18; } },
    { id: 'mantenimiento', n: 'Mantenimiento recurrente', mundo: 'Sistema estratégico · Plan y comercial', valor: 'Crecimiento del 6 al 8 %', f: (s) => { s.empresa.crecimiento = 8; } },
    { id: 'leasing', n: 'Leasing del láser', mundo: 'Simulador · Inversión', valor: 'Financiado el 85 %', f: (s) => { s.inversion.pctFin = 85; } },
    { id: 'equipo', n: 'Un equipo que no dependa de una persona', mundo: 'Personas y equipos · Auditoría integral', valor: 'Suplentes, procesos y relevo', f: (s) => { Object.assign(s.humano, { dependencia: 50, procesos: 55, sucesion: 50, mandosFormados: 60 }); } }
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
    return { K, H, s0, sFinal: s, esc, pasos, final: antes, finalEstres: resultado(s, 'estres') };
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

  /* ---------- Guion ---------- */
  function guion(R, f) {
    const K = R.K, H = R.H, e = R.esc, P = R.pasos, F = R.final, h0 = H[0], h4 = H[H.length - 1];
    const sube = (d) => (d.despues.liq - d.antes.liq);
    // Si la palanca apenas mueve el punto más bajo (el bache llega antes), se cuenta lo que sí cambia: la caja final
    const deltaTxt = (d) => { const x = sube(d); return Math.abs(x) < 10000 ? `apenas se mueve, porque el bache llega antes; pero la caja al final de los cinco años sube en ${f.eur(d.despues.fin - d.antes.fin)}` : `mejora en ${f.eur(x)} y queda en ${f.eur(d.despues.liq)}`; };
    const cruza = P.find((d) => d.antes.liq < 0 && d.despues.liq >= 0);
    const esc = [];
    esc.push({ id: 'portada', titulo: 'Valdenorte: cambiar el rumbo', texto: `Esta es Valdenorte, una empresa familiar de estructuras metálicas con ${f.n(K.plantilla)} personas. Es una empresa inventada, pero sus problemas son los de muchas pymes que crecen. En los próximos minutos verá su proyección, sus puntos rojos y cómo, moviendo unas pocas palancas dentro de su propio ecosistema, cambia el rumbo de la empresa.` });
    esc.push({ id: 'historia', titulo: 'Cinco años: vende más y tiene menos caja', texto: `En cinco años, las ventas han pasado de ${f.meur(K.ventas0)} a ${f.meur(K.ventas)}: un ${f.pct(K.cagr)} más cada año. Pero mire la caja: ha bajado de ${f.eur(K.tesoreria0)} a ${f.eur(K.tesoreria)}, y la deuda a corto plazo ha pasado de ${f.eur(h0.deudaCP)} a ${f.eur(h4.deudaCP)}. La empresa vende más y, a la vez, tiene menos dinero. Y el resultado no acompaña: el EBITDA se queda en el ${f.pct(K.ebitdaPct)} de las ventas.` });
    esc.push({ id: 'rojos', titulo: 'Los puntos rojos', texto: `Atalaya cruza los datos de todos los mundos y marca los puntos rojos. Uno: los clientes pagan a ${f.n(K.dso)} días; hace cinco años pagaban a ${f.n(K.dso0)}. Dos: un solo cliente es el ${f.pct(K.topPct, 0)} de las ventas. Tres: la carpintería metálica deja un ${f.pct(K.carpPct, 0)} de margen, frente al ${f.pct(K.montPct, 0)} de los montajes. Cuatro: todo pasa por el fundador, y el jefe de taller no tiene segundo. Y cinco: sobre todo esto, la empresa quiere invertir ${f.meur(K.inversion)} en un láser, una plegadora y una ampliación de nave.` });
    esc.push({ id: 'proyeccion', titulo: 'La proyección si invierte tal como está planteado', texto: `Así queda la proyección a cinco años si invierte tal como está planteado. La línea es la liquidez: el dinero del banco más lo que queda libre de la póliza. En ${f.mes(e.base.mes)} cae a ${f.eur(e.base.liq)}, aun con la póliza agotada. La inversión tarda ${f.anios(e.base.pb)} en recuperarse y la deuda llega a ${f.veces(e.base.dE)} el EBITDA. El veredicto del simulador: rediseñar antes de mover.` });
    esc.push({ id: 'escenarios', titulo: 'Cuatro escenarios, el mismo problema', texto: `Y eso es en el escenario base. En el de estrés, con la mitad de la venta nueva y cobros más lentos, la liquidez baja hasta ${f.eur(e.estres.liq)}. Y en el optimista también se queda en negativo: ${f.eur(e.optimista.liq)}. Sin invertir, la caja aguanta, pero la empresa renuncia a crecer. El problema no es la inversión: es la estructura sobre la que se apoya.` });
    esc.push({ id: 'palancas', titulo: 'Las palancas', texto: `Ahora, las palancas. No hace falta inventar nada: cada una sale de un dato que la empresa ya tiene en su ecosistema. Vamos a moverlas una a una y a mirar qué le pasa a la línea.` });
    const EXPL = {
      cobros: `Cobrar antes. Volver de ${f.n(K.dso)} a ${f.n(65)} días con certificaciones mensuales y reclamando cada viernes`,
      margen: 'Precio y compras. Una tabla de precios con margen mínimo para la carpintería y un acuerdo anual con las acerías: un punto y medio más de margen',
      financiacion: 'Financiación a la medida de la rampa. Doce meses de carencia y nueve años de plazo, para que las cuotas empiecen cuando la máquina ya produce',
      contratar: 'Contratar al ritmo de la venta. Las seis personas nuevas entran cuando llega el trabajo, no dos meses antes',
      proveedores: 'Pagar a los proveedores a sesenta días en lugar de cincuenta, con el acuerdo anual de volumen',
      nave: 'La nave en dos tiempos. La ampliación se hace en el mes dieciocho, cuando el láser ya genera caja',
      mantenimiento: 'La línea nueva de mantenimiento. Contratos anuales con las plantas de los clientes, que suben el crecimiento del seis al ocho por ciento',
      leasing: 'Leasing del láser. Se financia el ochenta y cinco por ciento de la inversión en lugar del setenta y cinco',
      equipo: 'Y el equipo. Suplentes en los puestos críticos, procesos escritos y un plan de relevo'
    };
    P.forEach((d, i) => {
      let t = `${f.n(i + 1)}. ${EXPL[d.id]}. `;
      if (d.id === 'equipo') t += `La liquidez no cambia, pero el sistema humano pasa de ${f.n(d.antes.humano)} a ${f.n(d.despues.humano)} sobre cien: la empresa está preparada para crecer sin quemar a nadie.`;
      else if (d === cruza) t += `Y la línea cruza el cero: la liquidez mínima pasa de ${f.eur(d.antes.liq)} a ${f.eur(d.despues.liq)}.`;
      else t += `La liquidez mínima ${deltaTxt(d)}.`;
      esc.push({ id: 'p-' + d.id, titulo: `${i + 1}. ${d.n}`, texto: t, paso: i });
    });
    esc.push({ id: 'rumbo', titulo: 'El nuevo rumbo', texto: `Compare las dos líneas. Sin tocar nada, la empresa se queda sin liquidez en ${f.mes(e.base.mes)}. Con las nueve palancas, la liquidez mínima es de ${f.eur(F.liq)}, la inversión se recupera en ${f.anios(F.pb)}, la deuda baja a ${f.veces(F.dE)} el EBITDA y la caja al final de los cinco años pasa de ${f.meur(e.base.fin)} a ${f.meur(F.fin)}. El veredicto cambia: de rediseñar antes de mover, a adelante.` });
    esc.push({ id: 'estres', titulo: 'Y si las cosas salen mal', texto: `¿Y si las cosas salen mal? Con las palancas, el escenario de estrés pasa de ${f.eur(e.estres.liq)} a ${f.eur(R.finalEstres.liq)}: un hueco que se cubre ampliando la póliza. La empresa ya no depende de que todo salga bien.` });
    esc.push({ id: 'ecosistema', titulo: 'Dónde vive cada palanca', texto: 'Lo importante es dónde vive cada palanca. Los cobros, en el sistema estratégico; el precio y las compras, en margen y proveedores; la financiación y la nave, en el simulador; las contrataciones y los suplentes, en personas y equipos. La auditoría integral las ordena en un plan de intervención, y cada una baja a la mesa de trabajo como una meta con fecha y responsable. Todo está conectado: cuando cambia un dato, cambia la proyección.' });
    esc.push({ id: 'usted', titulo: 'Ahora, usted', texto: 'Ahora, pruébelo usted. Active o quite las palancas y mire cómo cambia el rumbo de Valdenorte. Con su empresa, Atalaya hace lo mismo con sus propios datos.' });
    return esc;
  }

  A.videoModelo = { PALANCAS, calcular, guion, resultado, LEER, DECIR, palabras };
})(typeof window !== 'undefined' ? window : globalThis);
