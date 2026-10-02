/* Atalaya · Simulador · Preguntas guiadas
   En lugar de rellenar casilla a casilla, el empresario responde preguntas en lenguaje llano y cada respuesta
   marca los datos del simulador. Lo que no sepa se queda con el valor típico de su sector (y se avisa).
   Cada pregunta: { id, q, ayuda, tipo: 'num'|'chips'|'texto'|'multi', u, opciones: [{ t, v }], get(s), set(s, v),
   marca: [textos de los datos que rellena], estimar(s) → valor típico, cuando(s) → si se pregunta } */
(function () {
  const A = window.Atalaya;
  const r1000 = (v) => Math.round(v / 1000) * 1000;
  const sec = (s) => A.SECTORS[s.sector] || A.SECTORS.industria;
  const P = (path) => ({ get: (s) => path.split('.').reduce((o, k) => o[k], s), set: (s, v) => { const [a, b] = path.split('.'); s[a][b] = v; } });

  const empresa = [
    { id: 'nombre', q: '¿Cómo se llama la empresa?', tipo: 'texto', ayuda: 'Aparecerá en el puente de mando y en los informes.', get: (s) => s.empresaNombre, set: (s, v) => { s.empresaNombre = v; }, marca: ['Nombre de la empresa'] },
    { id: 'sector', q: '¿A qué se dedica principalmente?', tipo: 'chips', ayuda: 'Carga las costumbres del sector: márgenes, peso de la plantilla, plazos de cobro y pago, estacionalidad y velocidad de arranque. Tus cifras reales las pondrás en las siguientes preguntas.',
      opciones: () => Object.keys(A.SECTORS).map((k) => ({ t: A.SECTORS[k].nombre, v: k })), get: (s) => s.sector, set: (s, v) => { if (v !== s.sector) A.applySector(s, v); }, marca: ['Perfil del sector'] },
    { id: 'ventas', q: '¿Cuánto facturó la empresa el último año, sin IVA?', tipo: 'num', u: '€', ayuda: 'Es la cifra de negocio de la cuenta de resultados. Si el año no ha cerrado, usa los últimos doce meses.',
      // Los gastos que aún no se han preguntado se reescalan con las ventas para que la foto no se descuadre
      get: (s) => s.empresa.ventas, set: (s, v) => { const k = v / Math.max(1, s.empresa.ventas); s.empresa.ventas = v; s.empresa.personal = r1000(s.empresa.personal * k); s.empresa.fijos = r1000(s.empresa.fijos * k); }, marca: ['Ventas anuales'] },
    { id: 'compras', q: 'De cada 100 € que vendes, ¿cuántos se van en compras, materia prima o mercancía?', tipo: 'num', u: '€ de cada 100', ayuda: 'Solo lo que compras para vender o fabricar (no sueldos ni alquileres). Lo que queda es tu margen bruto.',
      opciones: [{ t: '20 €', v: 20 }, { t: '40 €', v: 40 }, { t: '60 €', v: 60 }, { t: '75 €', v: 75 }],
      get: (s) => Math.round((100 - s.empresa.margen) * 10) / 10, set: (s, v) => { s.empresa.margen = Math.max(1, Math.min(100, 100 - v)); }, estimar: (s) => 100 - sec(s).margen, marca: ['Margen bruto'] },
    { id: 'plantilla', q: '¿Cuántas personas trabajan hoy en la empresa?', tipo: 'num', u: 'personas', ...P('empresa.plantilla'), marca: ['Plantilla actual'] },
    { id: 'personal', q: '¿Cuánto cuesta al año toda la plantilla, con la Seguridad Social de la empresa?', tipo: 'num', u: '€/año', ayuda: 'Está en la cuenta de resultados como «gastos de personal». Si no lo tienes: salario bruto medio × personas × 1,32.',
      ...P('empresa.personal'), estimar: (s) => r1000(s.empresa.ventas * sec(s).personal / 100), marca: ['Coste de personal'] },
    { id: 'fijos', q: '¿Cuánto gastas al año en todo lo demás que no depende de lo que vendes?', tipo: 'num', u: '€/año', ayuda: 'Alquileres, suministros, seguros, gestoría, mantenimiento, publicidad, vehículos… En la cuenta de resultados, «otros gastos de explotación».',
      ...P('empresa.fijos'), estimar: (s) => r1000(s.empresa.ventas * sec(s).fijos / 100), marca: ['Otros gastos fijos'] },
    { id: 'caja', q: '¿Cuánto dinero hay hoy entre todas las cuentas del banco?', tipo: 'num', u: '€', ...P('empresa.caja'), marca: ['Caja disponible'] },
    { id: 'deuda', q: '¿Cuánto debes hoy a los bancos en préstamos, sin contar la póliza de crédito?', tipo: 'num', u: '€', ayuda: 'El capital pendiente de todos los préstamos, leasings incluidos.', opciones: [{ t: 'Nada', v: 0 }], ...P('empresa.deudaViva'), marca: ['Deuda financiera viva'] },
    { id: 'cuota', q: '¿Cuánto pagas cada mes por esos préstamos, sumando todas las cuotas?', tipo: 'num', u: '€/mes', cuando: (s) => s.empresa.deudaViva > 0, ...P('empresa.cuotaDeuda'), estimar: (s) => Math.round(s.empresa.deudaViva / 60 / 100) * 100, marca: ['Cuota mensual actual'] },
    { id: 'poliza', q: '¿Tienes póliza de crédito? ¿De cuánto es el límite?', tipo: 'num', u: '€', ayuda: 'La línea que el banco deja disponible para el día a día. Si no tienes, pon 0.', opciones: [{ t: 'No tengo', v: 0 }], ...P('empresa.polizaLimite'), marca: ['Límite de la póliza'] },
    { id: 'polizaDisp', q: '¿Cuánto tienes dispuesto hoy de esa póliza?', tipo: 'num', u: '€', cuando: (s) => s.empresa.polizaLimite > 0, opciones: [{ t: 'Nada', v: 0 }], ...P('empresa.polizaDispuesta'), marca: ['Ya dispuesto hoy'] },
    { id: 'dso', q: '¿Cuándo te pagan normalmente los clientes?', tipo: 'chips', u: 'días', ayuda: 'El plazo real, no el que pone la factura.',
      opciones: [{ t: 'Al contado', v: 3 }, { t: 'A 30 días', v: 30 }, { t: 'A 60 días', v: 60 }, { t: 'A 90 días', v: 90 }, { t: 'A más de 90', v: 120 }], ...P('empresa.dso'), estimar: (s) => sec(s).dso, marca: ['Días de cobro'] },
    { id: 'dio', q: '¿Cuánto tiempo pasa la mercancía o el material en tu almacén antes de venderse?', tipo: 'chips', u: 'días',
      opciones: [{ t: 'No tengo stock', v: 0 }, { t: 'Unas dos semanas', v: 15 }, { t: 'Un mes', v: 30 }, { t: 'Dos meses', v: 60 }, { t: 'Tres meses', v: 90 }, { t: 'Más', v: 150 }], ...P('empresa.dio'), estimar: (s) => sec(s).dio, marca: ['Días de stock'] },
    { id: 'dpo', q: '¿A cuántos días pagas a tus proveedores?', tipo: 'chips', u: 'días',
      opciones: [{ t: 'Al contado', v: 3 }, { t: 'A 30 días', v: 30 }, { t: 'A 60 días', v: 60 }, { t: 'A 90 días', v: 90 }], ...P('empresa.dpo'), estimar: (s) => sec(s).dpo, marca: ['Días de pago'] },
    { id: 'fp', q: '¿Cuánto suman los fondos propios de la empresa?', tipo: 'num', u: '€', ayuda: 'En el balance, «patrimonio neto»: capital, reservas y resultados acumulados.', ...P('empresa.fondosPropios'), estimar: (s) => r1000(s.empresa.ventas * 0.35), marca: ['Fondos propios'] },
    { id: 'crec', q: 'Sin hacer la inversión, ¿cuánto crees que crecerá la empresa al año?', tipo: 'chips', u: '%/año',
      opciones: [{ t: 'Bajará', v: -3 }, { t: 'Se mantendrá', v: 0 }, { t: 'Un 3 %', v: 3 }, { t: 'Un 6 %', v: 6 }, { t: 'Un 10 %', v: 10 }], ...P('empresa.crecimiento'), estimar: (s) => sec(s).crecimiento, marca: ['Crecimiento orgánico'] }
  ];

  // Inversión: primero qué se compra (crea las líneas), después cuánto cuesta cada cosa, cómo se paga y qué traerá
  const inversion = (s) => {
    const L = (s.inversion.lineas || []);
    const out = [
      { id: 'proyecto', q: '¿Qué quieres hacer? Ponle un nombre al proyecto.', tipo: 'texto', ayuda: 'Por ejemplo: «Nueva línea de envasado», «Abrir delegación en Valencia», «Renovar la flota».', get: (x) => x.proyecto, set: (x, v) => { x.proyecto = v; }, marca: ['Nombre del proyecto'] },
      { id: 'lineas', q: '¿Qué vas a comprar o a pagar? Marca todo lo que lleve el proyecto.', tipo: 'multi', ayuda: 'Cada cosa será una línea de la inversión, con su importe, su fecha y, si quieres, su propia financiación (una nave no se financia igual que un vehículo).',
        opciones: () => Object.keys(A.LINEA_TIPOS).map((k) => ({ t: A.LINEA_TIPOS[k].n, v: k })),
        get: (x) => (x.inversion.lineas || []).map((l) => l.tipo),
        set: (x, v) => {
          const prev = x.inversion.lineas || [];
          const keep = prev.filter((l) => v.indexOf(l.tipo) >= 0);
          v.forEach((k) => { if (!keep.some((l) => l.tipo === k)) keep.push({ id: 'l' + Date.now() + k, tipo: k, nombre: A.LINEA_TIPOS[k].n, importe: 0, mes: x.inversion.mesInicio, vida: A.LINEA_TIPOS[k].vida, activa: true, fin: null }); });
          if (keep.length && keep.every((l) => !l.importe)) keep.forEach((l) => { l.importe = Math.round(x.inversion.importe / keep.length / 1000) * 1000; });
          x.inversion.lineas = keep;
        }, marca: ['Líneas de la inversión'] }
    ];
    L.forEach((l) => {
      out.push({ id: 'imp-' + l.id, q: `¿Cuánto cuesta «${l.nombre}», sin IVA?`, tipo: 'num', u: '€', ayuda: 'Incluye transporte, montaje y puesta en marcha.', get: (x) => (x.inversion.lineas.find((y) => y.id === l.id) || {}).importe, set: (x, v) => { const y = x.inversion.lineas.find((z) => z.id === l.id); if (y) y.importe = v; }, marca: [`Importe de ${l.nombre.toLowerCase()}`] });
      out.push({ id: 'mes-' + l.id, q: `¿En qué mes, contando desde hoy, pagarás «${l.nombre}»?`, tipo: 'num', u: 'mes', opciones: [{ t: 'Ya', v: 1 }, { t: 'En 3 meses', v: 3 }, { t: 'En 6 meses', v: 6 }, { t: 'En un año', v: 12 }], get: (x) => (x.inversion.lineas.find((y) => y.id === l.id) || {}).mes, set: (x, v) => { const y = x.inversion.lineas.find((z) => z.id === l.id); if (y) y.mes = Math.max(1, Math.round(v)); }, marca: [`Mes de ${l.nombre.toLowerCase()}`] });
    });
    if (!L.length) out.push({ id: 'importe', q: '¿Cuánto cuesta en total la inversión, sin IVA?', tipo: 'num', u: '€', ...P('inversion.importe'), marca: ['Importe de la inversión'] });
    out.push(
      { id: 'pctFin', q: '¿Qué parte te financiará el banco con un préstamo o leasing?', tipo: 'chips', u: '%', ayuda: 'El resto sale de la caja de la empresa o de los socios.', opciones: [{ t: 'Nada', v: 0 }, { t: 'La mitad', v: 50 }, { t: 'El 70 %', v: 70 }, { t: 'El 80 %', v: 80 }, { t: 'Todo', v: 100 }], ...P('inversion.pctFin'), marca: ['Parte financiada'] },
      { id: 'plazo', q: '¿A cuántos años sería el préstamo?', tipo: 'chips', u: 'años', cuando: (x) => x.inversion.pctFin > 0, opciones: [{ t: '3 años', v: 3 }, { t: '5 años', v: 5 }, { t: '7 años', v: 7 }, { t: '10 años', v: 10 }, { t: '15 años', v: 15 }], ...P('inversion.plazo'), marca: ['Plazo del préstamo'] },
      { id: 'tipo', q: '¿A qué tipo de interés?', tipo: 'num', u: '%', cuando: (x) => x.inversion.pctFin > 0, ayuda: 'Si aún no lo sabes, deja el que hay: es una referencia de mercado.', ...P('inversion.tipo'), marca: ['Tipo de interés'] },
      { id: 'carencia', q: '¿Cuántos meses al principio pagarás solo intereses (carencia)?', tipo: 'chips', u: 'meses', cuando: (x) => x.inversion.pctFin > 0, ayuda: 'La carencia da aire mientras el proyecto arranca: conviene que dure lo que tarda en vender.', opciones: [{ t: 'Ninguno', v: 0 }, { t: '6 meses', v: 6 }, { t: '12 meses', v: 12 }, { t: '18 meses', v: 18 }], ...P('inversion.carencia'), marca: ['Carencia'] },
      { id: 'aport', q: '¿Pondrán dinero los socios para este proyecto?', tipo: 'num', u: '€', opciones: [{ t: 'No', v: 0 }], ...P('inversion.aportacion'), marca: ['Aportación de socios'] },
      { id: 'inicio', q: '¿En qué mes empezaría a funcionar y a vender lo nuevo?', tipo: 'num', u: 'mes', ...P('inversion.mesInicio'), marca: ['Mes de la inversión'] },
      { id: 'venta', q: 'Cuando esté a pleno rendimiento, ¿cuánto venderás de más al año gracias a él?', tipo: 'num', u: '€/año', ayuda: 'Solo lo nuevo, sobre lo que ya vendes. Sé prudente: el escenario pesimista ya probará con menos.',
        get: (x) => r1000(x.empresa.ventas * x.inversion.incVentas / 100), set: (x, v) => { x.inversion.incVentas = Math.round(v / Math.max(1, x.empresa.ventas) * 1000) / 10; }, marca: ['Venta nueva en crucero'] },
      { id: 'mgNuevo', q: 'De cada 100 € de esa venta nueva, ¿cuántos se irán en compras o materia prima?', tipo: 'num', u: '€ de cada 100', get: (x) => Math.round((100 - x.inversion.margenNuevo) * 10) / 10, set: (x, v) => { x.inversion.margenNuevo = Math.max(1, Math.min(100, 100 - v)); }, estimar: (x) => 100 - x.empresa.margen, marca: ['Margen bruto nuevo'] },
      { id: 'rampa', q: '¿Cuántos meses tardarás en llegar a ese ritmo de venta?', tipo: 'chips', u: 'meses', opciones: [{ t: '3 meses', v: 3 }, { t: '6 meses', v: 6 }, { t: '9 meses', v: 9 }, { t: '12 meses', v: 12 }, { t: '18 meses', v: 18 }], ...P('inversion.rampa'), estimar: (x) => sec(x).rampa, marca: ['Meses de rampa'] },
      { id: 'contrat', q: '¿Cuántas personas nuevas necesitarás contratar?', tipo: 'num', u: 'personas', opciones: [{ t: 'Ninguna', v: 0 }], ...P('inversion.contrataciones'), marca: ['Contrataciones'] },
      { id: 'salario', q: '¿Cuánto costará cada una al año, con Seguridad Social?', tipo: 'num', u: '€/año', cuando: (x) => x.inversion.contrataciones > 0, ...P('inversion.salario'), estimar: (x) => r1000(sec(x).salario * 1.32), marca: ['Coste por persona'] },
      { id: 'fijosN', q: '¿Qué gastos fijos nuevos traerá al año (alquiler, energía, seguros, mantenimiento)?', tipo: 'num', u: '€/año', opciones: [{ t: 'Ninguno', v: 0 }], ...P('inversion.fijosNuevos'), marca: ['Fijos nuevos'] }
    );
    if (!L.length) out.push({ id: 'vida', q: '¿Cuántos años te durará lo que compras?', tipo: 'chips', u: 'años', opciones: [{ t: '4 años', v: 4 }, { t: '7 años', v: 7 }, { t: '10 años', v: 10 }, { t: '15 años', v: 15 }, { t: '30 años', v: 30 }], ...P('inversion.vidaUtil'), marca: ['Vida útil del activo'] });
    return out;
  };

  // Equipo: preguntas de la vida diaria que se traducen en las variables del sistema humano
  const humano = [
    { id: 'mandos', q: '¿Cuántas personas dirigen un equipo y deciden sin consultarte?', tipo: 'num', u: 'personas', ayuda: 'Encargados, jefes de turno, responsables de área. Solo quien decide de verdad.', ...P('humano.mandos'), marca: ['Mandos intermedios'] },
    { id: 'formados', q: '¿Cuántos de ellos se han formado en dirigir personas?', tipo: 'chips', opciones: [{ t: 'Ninguno', v: 0 }, { t: 'Alguno', v: 25 }, { t: 'La mitad', v: 50 }, { t: 'Casi todos', v: 85 }, { t: 'Todos', v: 100 }], ...P('humano.mandosFormados'), marca: ['Mandos formados en gestión'] },
    { id: 'dependencia', q: 'Si mañana te fueras un mes sin teléfono, ¿qué pasaría?', tipo: 'chips', opciones: [{ t: 'Se pararía casi todo', v: 90 }, { t: 'Se retrasarían las decisiones importantes', v: 65 }, { t: 'Funcionaría con alguna llamada', v: 40 }, { t: 'Funcionaría sin mí', v: 15 }], ...P('humano.dependencia'), marca: ['Dependencia del fundador'] },
    { id: 'procesos', q: '¿Cuántos de tus procesos clave están escritos (cómo se hace un pedido, cómo se fabrica, cómo se factura)?', tipo: 'chips', opciones: [{ t: 'Casi ninguno', v: 10 }, { t: 'Algunos', v: 30 }, { t: 'La mitad', v: 50 }, { t: 'Casi todos', v: 80 }], ...P('humano.procesos'), marca: ['Procesos documentados'] },
    { id: 'salidas', q: '¿Cuántas personas se fueron de la empresa el último año?', tipo: 'num', u: 'personas', ayuda: 'Bajas voluntarias y despidos, sin contar jubilaciones.',
      get: (s) => Math.round(s.humano.rotacion * s.empresa.plantilla / 100), set: (s, v) => { s.humano.rotacion = Math.min(60, Math.round(v / Math.max(1, s.empresa.plantilla) * 100)); }, marca: ['Rotación anual'] },
    { id: 'clima', q: '¿Recomendaría tu equipo trabajar aquí a un amigo?', tipo: 'chips', opciones: [{ t: 'Pocos lo harían', v: -30 }, { t: 'Dudarían', v: 0 }, { t: 'La mayoría sí', v: 30 }, { t: 'Con entusiasmo', v: 60 }], ...P('humano.clima'), marca: ['Clima laboral (eNPS)'] },
    { id: 'tContratar', q: 'Cuando necesitas a alguien, ¿cuánto tardas en tenerlo trabajando?', tipo: 'chips', u: 'meses', opciones: [{ t: 'Menos de un mes', v: 1 }, { t: 'Dos meses', v: 2 }, { t: 'Tres meses', v: 3 }, { t: 'Seis meses o más', v: 6 }], ...P('humano.tiempoContratacion'), marca: ['Meses para contratar'] },
    { id: 'cSeleccion', q: '¿Cuánto te cuesta cada contratación entre anuncios, consultora y horas de entrevista?', tipo: 'chips', u: '€', opciones: [{ t: 'Casi nada', v: 500 }, { t: 'Unos 1.500 €', v: 1500 }, { t: 'Unos 3.500 €', v: 3500 }, { t: 'Más de 6.000 €', v: 8000 }], ...P('humano.costeSeleccion'), marca: ['Coste de selección por persona'] },
    { id: 'curva', q: '¿Cuánto tarda alguien nuevo en rendir como uno de la casa?', tipo: 'chips', u: 'meses', opciones: [{ t: 'Un mes', v: 1 }, { t: 'Tres meses', v: 3 }, { t: 'Seis meses', v: 6 }, { t: 'Un año', v: 12 }], ...P('humano.curva'), marca: ['Meses hasta productividad plena'] },
    { id: 'formacion', q: '¿Cuántas horas de formación recibe cada persona al año?', tipo: 'chips', u: 'horas', opciones: [{ t: 'Ninguna', v: 0 }, { t: 'Un día', v: 8 }, { t: 'Dos días', v: 16 }, { t: 'Una semana', v: 40 }], ...P('humano.formacion'), marca: ['Formación anual por persona'] },
    { id: 'sucesion', q: 'De tus puestos clave, ¿cuántos tienen a alguien preparado para sustituirlos?', tipo: 'chips', opciones: [{ t: 'Ninguno', v: 0 }, { t: 'Algunos', v: 30 }, { t: 'La mitad', v: 50 }, { t: 'Casi todos', v: 85 }], ...P('humano.sucesion'), marca: ['Puestos clave con sustituto'] },
    { id: 'polivalencia', q: '¿Cuánta gente sabe hacer bien más de un puesto?', tipo: 'chips', opciones: [{ t: 'Poca', v: 10 }, { t: 'Algunos', v: 30 }, { t: 'La mitad', v: 50 }, { t: 'La mayoría', v: 75 }], ...P('humano.polivalencia'), marca: ['Polivalencia'] },
    { id: 'absentismo', q: '¿Cuántas horas se pierden por bajas y ausencias?', tipo: 'chips', u: '%', opciones: [{ t: 'Muy pocas', v: 2 }, { t: 'Lo normal', v: 4 }, { t: 'Bastantes', v: 7 }, { t: 'Demasiadas', v: 11 }], ...P('humano.absentismo'), marca: ['Absentismo'] },
    { id: 'extras', q: '¿Hace tu equipo horas extra?', tipo: 'chips', u: '%', opciones: [{ t: 'Casi nunca', v: 2 }, { t: 'Alguna semana', v: 6 }, { t: 'Habitualmente', v: 12 }, { t: 'Siempre', v: 20 }], ...P('humano.horasExtra'), marca: ['Horas extra sobre jornada'] }
  ];

  A.PREGUNTAS_SIM = {
    empresa: { titulo: 'Tu empresa en 17 preguntas', lede: 'Responde con lo que sepas. Lo que no sepas se queda con el valor típico de tu sector y te lo marco como estimado.', lista: () => empresa },
    inversion: { titulo: 'La inversión en preguntas', lede: 'Qué compras, cuánto cuesta, cómo lo pagas y qué esperas que traiga.', lista: inversion },
    humano: { titulo: '¿Está tu equipo listo?', lede: 'Catorce preguntas de la vida diaria de la empresa. Cada respuesta coloca una pieza de la foto de tu equipo.', lista: () => humano }
  };
})();
