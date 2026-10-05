/* Atalaya · Sistema estratégico · Marco de consultoría de cada módulo
   Para cada módulo: qué pretende trabajar, cómo es a su máxima expresión, qué añadiría un consultor para llevarlo
   a la operativa, qué datos necesita, las preguntas que se le hacen al empresario (cada respuesta débil genera
   una acción), los objetivos que puede fijar y la cadencia de seguimiento.
   Tipos de pregunta: «escala» (1 a 5; 3 o menos genera acción, 2 o menos con prioridad alta) y «sino»
   (la respuesta indicada en «malo» genera acción con prioridad alta).
   Tipos de dato (los reconoce la zona de origen): cuentas, ventas, productos, compras, plantilla, pipeline,
   tiempos, banco, marketing, documentos. */
(function () {
  const A = window.Atalaya;
  const q = (id, dim, texto, accion, resp, plazo, kpi) => ({ id, dim, tipo: 'escala', q: texto, accion: { t: accion, resp, plazo, kpi } });
  const s = (id, dim, texto, malo, accion, resp, plazo, kpi) => ({ id, dim, tipo: 'sino', malo, q: texto, accion: { t: accion, resp, plazo, kpi } });

  A.C360 = {
    origen: null,

    tablero: {
      pregunta: '¿Cómo está toda la empresa de un vistazo?', resp: 'Dirección general',
      proposito: 'Gobernar la empresa con un único tablero que una finanzas, clientes, operaciones y personas, y que diga cada mes dónde mirar y qué decidir.',
      maxima: ['Ocho a doce indicadores clave de todas las áreas, cada uno con umbral verde, ámbar y rojo y con un responsable.', 'Una reunión de dirección mensual que decide sobre el tablero, con orden del día fijo y acta de decisiones.', 'Alertas tempranas: cada rojo dispara una acción acordada de antemano.', 'Objetivos del año conectados con los indicadores y con el plan de empresa.', 'Cifras cerradas en los diez primeros días del mes, sin hojas de cálculo paralelas.'],
      consultor: ['Taller con la dirección para elegir los indicadores que de verdad mueven el negocio y descartar el resto.', 'Ficha de cada indicador: fórmula, fuente, umbrales, responsable y acción ante el rojo.', 'Diseño del ritual: reunión mensual de 90 minutos con orden del día (semáforos, desviaciones, decisiones, responsables).', 'Calendario de cierre mensual con administración para tener los datos a tiempo.'],
      datos: [{ t: 'Balances y cuentas de resultados de los dos últimos años', tipo: 'cuentas' }, { t: 'Ventas del último año por cliente', tipo: 'ventas' }, { t: 'Compras del último año por proveedor', tipo: 'compras' }, { t: 'Plantilla con área y coste', tipo: 'plantilla' }],
      preguntas: [
        q('t1', 'Datos', '¿Con qué rapidez y fiabilidad tienes las cifras clave (ventas, margen, caja) del mes anterior? (1 = al cerrar el año · 5 = la primera semana de cada mes)', 'Cerrar el mes en diez días: calendario de cierre con administración y conciliación bancaria semanal.', 'Administración', 60, 'Días hasta el cierre mensual'),
        q('t2', 'Proceso', '¿Hay una reunión de dirección periódica donde se revisan indicadores y se toman decisiones?', 'Instaurar la reunión de dirección mensual con orden del día fijo: semáforos, desviaciones, decisiones y responsables.', 'Dirección general', 30, 'Reuniones celebradas con acta'),
        s('t3', 'Personas', '¿Cada indicador clave tiene una persona responsable de explicarlo y mejorarlo?', 'no', 'Asignar un dueño a cada indicador y publicarlo en el tablero.', 'Dirección general', 30, 'Indicadores con responsable'),
        q('t4', 'Estrategia', '¿Los indicadores están conectados con los objetivos del año?', 'Vincular cada objetivo del plan de empresa con uno o dos indicadores y su meta trimestral.', 'Dirección general', 60, 'Objetivos con indicador'),
        q('t5', 'Herramientas', '¿Cuánto trabajo manual cuesta preparar los números? (1 = días de hojas de cálculo · 5 = sale solo)', 'Cargar cada mes los listados en la zona de origen y retirar las hojas de cálculo paralelas.', 'Administración', 90, 'Horas de preparación al mes'),
        s('t6', 'Proceso', '¿Hay umbrales acordados (verde, ámbar, rojo) que obliguen a actuar?', 'no', 'Acordar los umbrales de cada indicador y la acción que se pone en marcha ante un rojo.', 'Dirección general', 30, 'Indicadores con umbral')
      ],
      objetivos: [{ k: 'Salud global', u: '/100', dir: 'subir', sug: 75, fn: 'salud' }, { k: 'Riesgos altos', u: 'riesgos', dir: 'bajar', sug: 0, fn: 'riesgosAltos' }],
      cadencia: [['Semanal', 'Caja, pedidos y cobros vencidos (15 minutos)', 'Dirección y administración'], ['Mensual', 'Tablero completo, desviaciones y decisiones (90 minutos)', 'Comité de dirección'], ['Trimestral', 'Objetivos, umbrales y prioridades', 'Dirección y propiedad']]
    },

    plan: {
      pregunta: '¿A dónde vamos y con qué valores?', resp: 'Dirección general',
      proposito: 'Convertir la intención de la propiedad en una dirección clara: misión, visión y valores que decidan, un DAFO con datos y un plan de acción con responsables y fechas.',
      maxima: ['Valores con peso que filtran las decisiones importantes (qué se hace y qué no).', 'DAFO alimentado por los datos reales de la empresa, revisado cada semestre.', 'CAME priorizado por impacto y esfuerzo, convertido en acciones.', 'Cascada de objetivos: de la visión a tres o cuatro objetivos anuales y a metas por área.', 'Seguimiento trimestral con porcentaje de cumplimiento visible para todo el equipo directivo.'],
      consultor: ['Taller de visión con la propiedad (y la familia, si es empresa familiar) y entrevistas a los mandos.', 'Priorización de iniciativas por impacto en resultado y caja frente al esfuerzo.', 'Plan a tres años con presupuesto asociado y cuadro de objetivos por área.', 'Plan de comunicación al equipo: qué se quiere conseguir y cómo contribuye cada uno.'],
      datos: [{ t: 'Balances y cuentas de resultados de los dos últimos años', tipo: 'cuentas' }, { t: 'Plan estratégico anterior, actas o documentos de trabajo de la dirección', tipo: 'documentos' }],
      preguntas: [
        q('p1', 'Estrategia', '¿La visión a tres o cinco años está escrita y la conoce el equipo directivo?', 'Taller de visión de medio día y documento de una página compartido con los mandos.', 'Dirección general', 45, 'Mandos que conocen la visión'),
        s('p2', 'Estrategia', '¿Se ha rechazado alguna oportunidad por no encajar con los valores o la estrategia?', 'no', 'Aplicar el filtro de valores a las tres próximas decisiones relevantes y dejarlo por escrito.', 'Dirección general', 90, 'Decisiones filtradas'),
        q('p3', 'Proceso', '¿Las acciones del plan tienen responsable, fecha y seguimiento?', 'Revisar el plan de acción cada mes en la reunión de dirección: ninguna acción sin responsable ni fecha.', 'Dirección general', 30, 'Acciones del plan hechas'),
        q('p4', 'Personas', '¿El equipo sabe cómo contribuye su trabajo a los objetivos?', 'Traducir los objetivos en dos o tres metas por área y explicarlas en una reunión general.', 'Dirección y mandos', 60, 'Áreas con metas'),
        s('p5', 'Estrategia', '¿Hay un plan de relevo para los puestos clave, incluida la dirección?', 'no', 'Identificar los puestos críticos y nombrar un relevo para cada uno con su plan de preparación.', 'Propiedad', 120, 'Puestos críticos con relevo'),
        q('p6', 'Datos', '¿El DAFO se apoya en datos (márgenes, clientes, mercado) o en opiniones?', 'Revisar el DAFO cada semestre con los datos de Atalaya y cerrar cada punto con su CAME.', 'Dirección general', 60, 'Puntos del DAFO con dato')
      ],
      objetivos: [{ k: 'Acciones del plan hechas', u: '%', dir: 'subir', sug: 80, kpi: 'Acciones del plan hechas' }],
      cadencia: [['Mensual', 'Avance de las acciones y bloqueos', 'Comité de dirección'], ['Trimestral', 'Objetivos, DAFO y CAME', 'Dirección general'], ['Anual', 'Visión, valores, plan a tres años y presupuesto', 'Propiedad y dirección']]
    },

    auditoria: {
      pregunta: 'El diagnóstico completo, de lo micro a lo macro.', resp: 'Dirección general',
      proposito: 'Hacer el diagnóstico 360 de la empresa: qué funciona, qué no, qué cuesta y por dónde empezar, conectando la estrategia con el día a día.',
      maxima: ['Diagnóstico anual comparable año a año con las mismas métricas.', 'Dos lecturas: de los objetivos a las acciones (macro a micro) y de los hallazgos a la cuenta de resultados (micro a macro).', 'Recomendaciones priorizadas por su impacto en caja y en resultado.', 'Seguimiento de cada recomendación hasta su cierre.'],
      consultor: ['Entrevistas estructuradas a la propiedad, la dirección y los mandos.', 'Revisión documental y cuadre de los datos de gestión con la contabilidad.', 'Presentación a la propiedad con una hoja de ruta de doce meses.', 'Revisión trimestral del avance de las recomendaciones.'],
      datos: [{ t: 'Balances y cuentas de resultados', tipo: 'cuentas' }, { t: 'Ventas por cliente', tipo: 'ventas' }, { t: 'Compras por proveedor', tipo: 'compras' }, { t: 'Plantilla', tipo: 'plantilla' }, { t: 'Informes o documentos de trabajo recientes', tipo: 'documentos' }],
      preguntas: [
        q('a1', 'Datos', '¿Están cargados y revisados los datos de todas las áreas?', 'Completar en la zona de origen la carga de los listados que faltan (ver «Lo que falta» en cada módulo).', 'Administración', 30, 'Módulos con datos completos'),
        s('a2', 'Proceso', '¿Se hizo un diagnóstico de la empresa en los últimos doce meses?', 'no', 'Fijar un diagnóstico anual con fecha y comparar siempre con el anterior.', 'Dirección general', 60, 'Diagnósticos anuales'),
        q('a3', 'Estrategia', '¿Se aplicaron las recomendaciones de diagnósticos anteriores?', 'Crear el registro de recomendaciones: estado, responsable y fecha, revisado cada trimestre.', 'Dirección general', 60, 'Recomendaciones cerradas'),
        q('a4', 'Personas', '¿La propiedad y la dirección están alineadas sobre las prioridades?', 'Sesión de alineamiento entre propiedad y dirección sobre las cinco prioridades del informe.', 'Propiedad', 30, 'Prioridades acordadas'),
        s('a5', 'Herramientas', '¿Los datos de gestión cuadran con la contabilidad?', 'no', 'Conciliar cada mes ventas y compras de gestión con contabilidad.', 'Administración', 60, 'Diferencias de conciliación')
      ],
      objetivos: [{ k: 'Riesgos altos', u: 'riesgos', dir: 'bajar', sug: 0, fn: 'riesgosAltos' }, { k: 'Salud global', u: '/100', dir: 'subir', sug: 75, fn: 'salud' }],
      cadencia: [['Trimestral', 'Avance de las recomendaciones', 'Dirección general'], ['Anual', 'Nuevo diagnóstico completo y comparación', 'Propiedad y dirección']]
    },

    dinero: {
      pregunta: '¿Por qué el beneficio no llega a la caja?', resp: 'Dirección financiera',
      proposito: 'Saber dónde está cada euro del beneficio: cuánto llega al banco y cuánto se queda en clientes, existencias, inversiones, deuda o reparto a socios.',
      maxima: ['Conversión del beneficio en caja medida cada año y cada trimestre.', 'Políticas de circulante con objetivo en días: cobro a clientes, existencias y pago a proveedores.', 'Reparto de dividendos y retiradas de socios coherente con la caja y las inversiones previstas.', 'Previsión de la caja que consumirá crecer, antes de crecer.'],
      consultor: ['Cuadro de origen y aplicación de fondos de los últimos años.', 'Análisis del ciclo de caja: días de cobro + días de existencias − días de pago.', 'Política de crédito a clientes (plazos, límites, quién aprueba excepciones).', 'Acuerdo con la propiedad sobre reparto y reinversión.'],
      datos: [{ t: 'Balances y cuentas de resultados de al menos dos años', tipo: 'cuentas', alt: 'historico' }],
      preguntas: [
        q('d1', 'Datos', '¿Conoces tus días de cobro, de existencias y de pago y cómo evolucionan?', 'Calcular cada trimestre el ciclo de caja y fijar una meta de días para cada componente.', 'Administración', 30, 'Ciclo de caja (días)'),
        s('d2', 'Proceso', '¿Hay una política escrita de condiciones de pago para clientes (plazos y límites de crédito)?', 'no', 'Política de crédito: plazos por tipo de cliente, límite de riesgo y quién aprueba excepciones.', 'Dirección financiera', 45, 'Clientes dentro de límite'),
        q('d3', 'Proceso', '¿Se reclaman los cobros vencidos de forma sistemática?', 'Rutina semanal de cobros: listado de vencidos, llamada a los 7 días y bloqueo de pedidos a los 30.', 'Administración', 15, 'Saldo vencido'),
        q('d4', 'Estrategia', '¿Los dividendos y las retiradas de los socios se deciden mirando la caja y las inversiones?', 'Política de reparto: porcentaje máximo del beneficio y caja mínima previa al reparto.', 'Propiedad', 90, 'Reparto sobre beneficio'),
        s('d5', 'Herramientas', '¿Controlas las existencias con un inventario fiable al menos cada trimestre?', 'no', 'Inventario trimestral y lista de existencias lentas para liquidar.', 'Operaciones', 60, 'Existencias sin movimiento'),
        q('d6', 'Estrategia', '¿Sabes cuánta caja consumirá el circulante si la empresa crece?', 'Medir en el simulador la caja que consume crecer y negociar la financiación antes de necesitarla.', 'Dirección financiera', 30, 'Necesidad de circulante prevista')
      ],
      objetivos: [{ k: 'Beneficio que llega a caja', u: '%', dir: 'subir', sug: 60, kpi: 'Beneficio que llega a caja' }, { k: 'Atrapado en circulante', u: '€', dir: 'bajar', kpi: 'Atrapado en circulante' }],
      cadencia: [['Semanal', 'Cobros vencidos y acciones', 'Administración'], ['Mensual', 'Días de cobro, existencias y pago', 'Dirección financiera'], ['Anual', 'Reparto, reinversión y conversión en caja', 'Propiedad y dirección']]
    },

    impuestos: {
      pregunta: '¿Cuánto y cuándo pagaré a Hacienda?', resp: 'Dirección financiera',
      proposito: 'Anticipar cuánto y cuándo se paga a Hacienda y a la Seguridad Social, y aplicar todas las vías legales para reducir o aplazar la factura.',
      maxima: ['Calendario fiscal integrado en la tesorería semanal.', 'Provisión mensual de impuestos en una cuenta separada.', 'Planificación fiscal antes del cierre: incentivos, amortizaciones, reservas de capitalización y nivelación.', 'Cada inversión relevante pasa por sus escenarios fiscales antes de decidirse.', 'Cero recargos ni intereses por pagos fuera de plazo.'],
      consultor: ['Revisión con el asesor fiscal de los incentivos aplicables (I+D+i, reservas, libertad de amortización, deducciones autonómicas).', 'Ajuste de los pagos fraccionados a la realidad del año.', 'Política de provisión y calendario de vencimientos con avisos.', 'Revisión de la estructura societaria si el grupo crece.'],
      datos: [{ t: 'Cuentas del último año (base imponible y cuota)', tipo: 'cuentas' }, { t: 'Resumen de impuestos del asesor (modelos 200, 303, 111) o documento equivalente', tipo: 'documentos' }],
      preguntas: [
        q('i1', 'Proceso', '¿Provisionas cada mes la parte proporcional de los impuestos?', 'Provisión mensual en una cuenta separada para IVA, retenciones y sociedades.', 'Administración', 30, 'Provisión al día'),
        s('i2', 'Estrategia', '¿Has revisado este año con tu asesor los incentivos fiscales que te aplican?', 'no', 'Reunión de planificación fiscal antes del cierre: incentivos, amortizaciones y reservas.', 'Dirección y asesor fiscal', 60, 'Ahorro fiscal identificado'),
        q('i3', 'Datos', '¿Sabes con tres meses de antelación cuánto pagarás en cada trimestre?', 'Integrar el calendario fiscal en la tesorería semanal.', 'Administración', 30, 'Pagos previstos con 90 días'),
        s('i4', 'Proceso', '¿Has pagado recargos o intereses por pagar fuera de plazo en el último año?', 'si', 'Calendario de vencimientos con aviso diez días antes y un responsable.', 'Administración', 15, 'Recargos pagados'),
        q('i5', 'Estrategia', '¿Las decisiones de inversión incluyen su efecto fiscal?', 'Pasar cada inversión relevante por los escenarios fiscales antes de decidir.', 'Dirección general', 90, 'Inversiones con escenario fiscal')
      ],
      objetivos: [{ k: 'Presión sobre ventas', u: '%', dir: 'bajar', kpi: 'Presión sobre ventas' }, { k: 'Impuestos 12 meses', u: '€', dir: 'bajar', kpi: 'Impuestos 12 meses' }],
      cadencia: [['Mensual', 'Provisión de impuestos', 'Administración'], ['Trimestral', 'Pagos y modelos', 'Administración y asesor'], ['Anual', 'Planificación fiscal antes del cierre', 'Dirección y asesor']]
    },

    tesoreria: {
      pregunta: '¿Llego a fin de mes, semana a semana?', resp: 'Dirección financiera',
      proposito: 'Ver semana a semana si llega el dinero para pagar, con tiempo para actuar antes de que falte.',
      maxima: ['Previsión rodante a trece semanas actualizada cada lunes.', 'Colchón mínimo de caja acordado y qué hacer si se rompe.', 'Líneas de financiación de circulante negociadas antes de necesitarlas.', 'Comparación de lo previsto con lo real para afinar la previsión.'],
      consultor: ['Modelo de trece semanas con cobros por cliente y pagos comprometidos.', 'Reunión de tesorería de veinte minutos los lunes.', 'Política de colchón y de prioridades de pago.', 'Negociación de póliza, confirming o factoring dimensionados a la peor semana.'],
      datos: [{ t: 'Movimientos bancarios recientes (extracto)', tipo: 'banco' }, { t: 'Ventas por cliente (para prever cobros)', tipo: 'ventas' }, { t: 'Compras por proveedor (para prever pagos)', tipo: 'compras' }],
      preguntas: [
        q('s1', 'Proceso', '¿Actualizas la previsión de tesorería cada semana?', 'Rutina de los lunes: actualizar las trece semanas con cobros y pagos confirmados.', 'Administración', 15, 'Semanas actualizadas'),
        s('s2', 'Estrategia', '¿Tienes un colchón mínimo de caja acordado?', 'no', 'Fijar el colchón (por ejemplo, un mes de pagos fijos) y el plan si se rompe.', 'Dirección general', 30, 'Semanas por debajo del colchón'),
        q('s3', 'Datos', '¿La previsión de cobros se basa en los vencimientos reales de cada cliente?', 'Cargar cada semana los vencimientos de clientes desde la gestión.', 'Administración', 30, 'Error de previsión de cobros'),
        s('s4', 'Herramientas', '¿Tienes financiación de circulante (póliza, confirming, factoring) negociada y sin usar?', 'no', 'Negociar póliza o factoring antes de necesitarlo, dimensionado a la peor semana.', 'Dirección financiera', 60, 'Línea disponible'),
        q('s5', 'Proceso', '¿Pagas a tiempo a los proveedores? (1 = a menudo se retrasa · 5 = siempre a tiempo)', 'Plan de choque: calendario de pagos priorizado y conversación con los proveedores clave.', 'Dirección general', 15, 'Pagos retrasados')
      ],
      objetivos: [{ k: 'Saldo mínimo 13 semanas', u: '€', dir: 'subir', kpi: 'Saldo mínimo 13 semanas' }],
      cadencia: [['Semanal (lunes)', 'Previsión a trece semanas', 'Administración'], ['Mensual', 'Previsto frente a real', 'Dirección financiera'], ['Trimestral', 'Líneas de financiación y colchón', 'Dirección general']]
    },

    presupuesto: {
      pregunta: '¿Qué espero ganar y gastar este año?', resp: 'Dirección financiera',
      proposito: 'Poner por escrito lo que se espera ganar y gastar, y comparar cada mes la realidad para corregir a tiempo.',
      maxima: ['Presupuesto anual por partidas y meses, aprobado antes de que empiece el año.', 'Un responsable por partida que explica sus desviaciones.', 'Cierre mensual con desviaciones explicadas (todas las que pasen del 5 %).', 'Previsión de cierre revisada cada trimestre.', 'Objetivos e incentivos ligados al presupuesto.'],
      consultor: ['Proceso presupuestario de seis semanas con cada área y supuestos documentados.', 'Reunión mensual de desviaciones con acciones correctoras.', 'Revisión trimestral de la previsión de cierre.', 'Enlace del presupuesto con la tesorería y con el plan de empresa.'],
      datos: [{ t: 'Cuentas del último año', tipo: 'cuentas' }, { t: 'Ventas del año en curso', tipo: 'ventas' }, { t: 'Presupuesto actual o del año anterior (si existe)', tipo: 'documentos' }],
      preguntas: [
        s('b1', 'Proceso', '¿Se aprueba un presupuesto anual antes de empezar el año?', 'no', 'Calendario presupuestario: propuesta en octubre y aprobación en diciembre.', 'Dirección financiera', 90, 'Presupuesto aprobado a tiempo'),
        q('b2', 'Personas', '¿Cada partida tiene un responsable que la explica?', 'Asignar un responsable a cada partida y revisar con él sus desviaciones.', 'Dirección general', 30, 'Partidas con responsable'),
        q('b3', 'Proceso', '¿Se comparan cada mes los datos reales con el presupuesto?', 'Cierre mensual con informe de desviaciones y explicación de las que pasen del 5 %.', 'Administración', 30, 'Desviaciones explicadas'),
        s('b4', 'Estrategia', '¿Se revisa cada trimestre la previsión de cierre del año?', 'no', 'Previsión de cierre trimestral con los últimos datos.', 'Dirección financiera', 90, 'Error de la previsión'),
        q('b5', 'Datos', '¿Están documentados los supuestos del presupuesto (precios, volúmenes, salarios)?', 'Hoja de supuestos con fuente y responsable.', 'Administración', 60, 'Supuestos documentados')
      ],
      objetivos: [{ k: 'Ventas frente a presupuesto', u: '%', dir: 'subir', sug: 100, kpi: 'Ventas frente a presupuesto' }],
      cadencia: [['Mensual', 'Desviaciones y acciones', 'Responsables de partida'], ['Trimestral', 'Previsión de cierre', 'Dirección financiera'], ['Anual', 'Presupuesto del año siguiente', 'Comité de dirección']]
    },

    ventas: {
      pregunta: '¿Quién me compra y cuánto dependo de él?', resp: 'Dirección comercial',
      proposito: 'Saber quién te compra, cuánto dependes de cada cliente y cuáles te dejan dinero de verdad, para proteger a los buenos y corregir a los que restan.',
      maxima: ['ABC por ventas y ABC′ por margen de clientes, productos y proveedores, actualizado cada trimestre.', 'Margen por cliente que incluye el coste de servirle (descuentos, portes, plazo de cobro).', 'Plan de cuenta para cada cliente A.', 'Límite de dependencia del primer cliente y plan para diluirla.', 'Canal de bajo coste o precio mínimo para los clientes C.'],
      consultor: ['Rentabilidad por cliente con costes de servicio reales.', 'Segmentación y política comercial diferenciada por segmento.', 'Planes de cuenta con visitas, riesgos y oportunidades.', 'Objetivo de diversificación con captación dirigida.'],
      datos: [{ t: 'Ventas del último año por cliente (y por producto si es posible), con coste o margen', tipo: 'ventas' }, { t: 'Catálogo de productos con precio y coste', tipo: 'productos' }],
      preguntas: [
        q('v1', 'Datos', '¿Conoces el margen que te deja cada cliente, no solo lo que te compra?', 'Calcular el margen por cliente con el coste de servirle y repetirlo cada trimestre.', 'Dirección comercial', 45, 'Clientes con margen calculado'),
        s('v2', 'Estrategia', '¿Tienes un plan de cuenta para tus cinco principales clientes?', 'no', 'Plan de cuenta para cada cliente A: contactos, riesgos, oportunidades y calendario de visitas.', 'Dirección comercial', 60, 'Clientes A con plan'),
        q('v3', 'Estrategia', '¿Tienes un límite acordado de dependencia del primer cliente?', 'Fijar un límite (por ejemplo, 20 % de la venta) y un plan de captación para diluirla.', 'Dirección general', 90, 'Peso del primer cliente'),
        q('v4', 'Proceso', '¿Las condiciones (precios, descuentos, plazos) dependen de lo que aporta cada cliente?', 'Política comercial por segmento ABC: descuentos y plazos según el margen que deja.', 'Dirección comercial', 60, 'Descuento medio por segmento'),
        s('v5', 'Proceso', '¿Revisas a los clientes C (poco volumen y poco margen) para reducir lo que cuesta servirles?', 'no', 'Pasar a los clientes C a un canal de bajo coste (web, pedido mínimo o tarifa propia).', 'Equipo comercial', 90, 'Coste de servicio de clientes C'),
        q('v6', 'Datos', '¿Sabes qué productos concentran el margen?', 'ABC de productos y revisión del surtido con los productos C.', 'Dirección comercial', 60, 'Productos C revisados')
      ],
      objetivos: [{ k: 'Peso del primer cliente', u: '%', dir: 'bajar', sug: 15, kpi: 'Peso del primer cliente' }, { k: 'Clientes «grandes no rentables»', u: 'clientes', dir: 'bajar', sug: 0, kpi: 'Clientes «grandes no rentables»' }],
      cadencia: [['Mensual', 'Ventas y margen de los clientes A', 'Dirección comercial'], ['Trimestral', 'ABC y ABC′ de clientes y productos', 'Dirección comercial'], ['Anual', 'Política comercial y límites de dependencia', 'Dirección general']]
    },

    margen: {
      pregunta: '¿Qué precio y qué volumen me convienen?', resp: 'Dirección comercial',
      proposito: 'Decidir precio, volumen, mezcla de productos y costes sabiendo cuánto margen deja cada palanca y cuánto puede caer la venta sin entrar en pérdidas.',
      maxima: ['Margen de contribución por producto con escandallos al día.', 'Punto muerto y margen de seguridad vigilados cada mes.', 'Sensibilidad de la demanda al precio estimada con datos reales.', 'Política de precios con revisión periódica y cláusulas de actualización.', 'Mezcla de ventas orientada a los productos de más margen.'],
      consultor: ['Revisión de escandallos con compras y producción.', 'Análisis de la respuesta de la demanda al precio con el histórico.', 'Prueba de precio controlada en un segmento.', 'Escala de descuentos y autorizaciones.'],
      datos: [{ t: 'Productos con precio, coste variable y unidades vendidas', tipo: 'productos' }, { t: 'Ventas por producto', tipo: 'ventas' }],
      preguntas: [
        q('m1', 'Datos', '¿Tienes escandallos (coste unitario) actualizados de tus productos?', 'Revisar los escandallos de los veinte productos principales con compras y producción.', 'Operaciones', 60, 'Productos con escandallo al día'),
        s('m2', 'Proceso', '¿Revisas las tarifas al menos una vez al año según los costes?', 'no', 'Revisión anual de tarifas con cláusula de actualización por costes.', 'Dirección comercial', 90, 'Tarifas revisadas'),
        q('m3', 'Estrategia', '¿Sabes cuánto puedes subir el precio sin perder demasiado volumen?', 'Prueba de precio controlada en un segmento y medición de la respuesta.', 'Dirección comercial', 90, 'Variación de volumen tras la prueba'),
        q('m4', 'Proceso', '¿Los descuentos están controlados y autorizados?', 'Escala de descuentos con aprobación por encima de un umbral.', 'Dirección comercial', 30, 'Descuento medio'),
        s('m5', 'Estrategia', '¿Impulsas de forma activa los productos de más margen?', 'no', 'Incentivos y argumentarios orientados a los productos de mayor margen.', 'Equipo comercial', 60, 'Peso de productos A en la venta')
      ],
      objetivos: [{ k: 'Margen de seguridad', u: '%', dir: 'subir', sug: 25, kpi: 'Margen de seguridad' }],
      cadencia: [['Mensual', 'Margen por línea de producto', 'Dirección comercial'], ['Trimestral', 'Descuentos y mezcla de ventas', 'Dirección comercial'], ['Anual', 'Tarifas y escandallos', 'Dirección y operaciones']]
    },

    comercial: {
      pregunta: '¿Qué ventas tengo en camino?', resp: 'Dirección comercial',
      proposito: 'Ver las ventas que vienen en camino, su probabilidad y si llegan para cumplir el objetivo.',
      maxima: ['Registro único de oportunidades con etapas definidas.', 'Previsión ponderada frente al objetivo, mes a mes.', 'Conversión por etapa y duración del ciclo de venta.', 'Reunión comercial semanal sobre el embudo.', 'Motivos de pérdida analizados.'],
      consultor: ['Definición de etapas y de los criterios para pasar de una a otra.', 'Disciplina de registro y cuotas por comercial.', 'Revisión semanal de oportunidades atascadas.', 'Análisis trimestral de oportunidades perdidas.'],
      datos: [{ t: 'Oportunidades abiertas con etapa, importe y probabilidad', tipo: 'pipeline' }, { t: 'Ventas del último año', tipo: 'ventas' }],
      preguntas: [
        s('c1', 'Herramientas', '¿Las oportunidades están en un registro único (CRM o listado compartido)?', 'no', 'Implantar un registro único de oportunidades y actualizarlo cada semana.', 'Dirección comercial', 30, 'Oportunidades registradas'),
        q('c2', 'Proceso', '¿Las etapas del proceso de venta tienen criterios claros?', 'Definir las etapas y qué tiene que pasar para avanzar de una a otra.', 'Dirección comercial', 30, 'Oportunidades con etapa correcta'),
        q('c3', 'Proceso', '¿Hay una reunión comercial semanal sobre las oportunidades?', 'Reunión comercial de treinta minutos: qué avanza, qué se atasca y próximos pasos.', 'Dirección comercial', 15, 'Reuniones celebradas'),
        s('c4', 'Datos', '¿Analizas por qué se pierden las oportunidades?', 'no', 'Registrar el motivo de cada pérdida y revisarlo cada trimestre.', 'Equipo comercial', 60, 'Pérdidas con motivo'),
        q('c5', 'Estrategia', '¿El embudo cubre de sobra el objetivo pendiente?', 'Plan de generación de oportunidades hasta cubrir tres veces el objetivo pendiente.', 'Dirección comercial', 60, 'Cobertura del objetivo')
      ],
      objetivos: [{ k: 'Previsión ponderada', u: '€', dir: 'subir', kpi: 'Previsión ponderada' }],
      cadencia: [['Semanal', 'Embudo y próximos pasos', 'Equipo comercial'], ['Mensual', 'Conversión y ciclo de venta', 'Dirección comercial'], ['Trimestral', 'Motivos de pérdida', 'Dirección comercial']]
    },

    marketing: {
      pregunta: '¿Qué me rinde cada euro de marketing?', resp: 'Marketing',
      proposito: 'Saber qué cuesta conseguir cada cliente por canal y cuánto deja a lo largo de la relación, para invertir donde rinde.',
      maxima: ['Coste de captación (CAC) y valor del cliente (LTV) por canal.', 'Origen de cada contacto registrado.', 'Presupuesto por canal con retorno medido.', 'Embudo contacto → oportunidad → cliente.', 'Programa de recompra y recomendación.'],
      consultor: ['Medición del origen de cada contacto y cliente.', 'Presupuesto por canal ligado a resultados.', 'Pruebas pequeñas con canales nuevos antes de escalar.', 'Programa de fidelización para clientes A y B.'],
      datos: [{ t: 'Inversión, contactos y clientes por canal', tipo: 'marketing' }, { t: 'Ventas por cliente', tipo: 'ventas' }],
      preguntas: [
        q('k1', 'Datos', '¿Sabes de qué canal viene cada cliente nuevo?', 'Preguntar y registrar el origen en cada alta de cliente.', 'Equipo comercial', 30, 'Clientes con origen'),
        s('k2', 'Estrategia', '¿Hay un presupuesto anual de marketing con objetivos?', 'no', 'Presupuesto por canal con objetivo de clientes y coste máximo de captación.', 'Dirección general', 60, 'Canales con objetivo'),
        q('k3', 'Proceso', '¿Dejas de financiar los canales que no rinden?', 'Revisión trimestral: recortar los canales con LTV/CAC por debajo de 3.', 'Dirección general', 90, 'LTV/CAC'),
        q('k4', 'Estrategia', '¿Trabajas la recompra y la recomendación de los clientes actuales?', 'Programa de fidelización y de recomendación para clientes A y B.', 'Equipo comercial', 90, 'Recompra'),
        s('k5', 'Herramientas', '¿Tu web genera contactos medibles?', 'no', 'Formularios con seguimiento y objetivo mensual de contactos por la web.', 'Marketing', 60, 'Contactos web al mes')
      ],
      objetivos: [{ k: 'CAC medio', u: '€', dir: 'bajar', kpi: 'CAC medio' }],
      cadencia: [['Mensual', 'Contactos y clientes por canal', 'Marketing'], ['Trimestral', 'CAC, LTV y reparto del presupuesto', 'Dirección'], ['Anual', 'Presupuesto de marketing', 'Dirección general']]
    },

    compras: {
      pregunta: '¿De quién dependo para comprar?', resp: 'Compras',
      proposito: 'Comprar mejor y con menos riesgo: saber de quién dependes, qué es estratégico y dónde hay ahorro negociable.',
      maxima: ['Matriz de Kraljic con estrategia por cuadrante.', 'Proveedores homologados y evaluados por calidad, plazo y precio.', 'Alternativa para cada proveedor crítico.', 'Negociación anual con objetivo de ahorro.', 'Contratos con cláusulas de precio, plazo y penalización.'],
      consultor: ['Análisis del gasto por proveedor y familia.', 'Licitación de las partidas apalancadas.', 'Doble fuente para los materiales críticos.', 'Evaluación trimestral de proveedores.'],
      datos: [{ t: 'Compras del último año por proveedor (importe y plazo de pago)', tipo: 'compras' }],
      preguntas: [
        q('o1', 'Datos', '¿Sabes cuánto compras a cada proveedor al año?', 'Sacar las compras anuales por proveedor y cargarlas en la zona de origen.', 'Administración', 30, 'Gasto analizado'),
        s('o2', 'Estrategia', '¿Tienes alternativa homologada para los proveedores críticos?', 'no', 'Homologar un segundo proveedor para cada material crítico.', 'Compras', 120, 'Críticos con alternativa'),
        q('o3', 'Proceso', '¿Negocias de forma planificada con tus principales proveedores?', 'Calendario anual de negociación con objetivo de ahorro por proveedor.', 'Compras', 90, 'Ahorro negociado'),
        q('o4', 'Proceso', '¿Evalúas la calidad, el plazo y el precio de los proveedores?', 'Evaluación trimestral de proveedores con puntuación y acciones.', 'Compras', 60, 'Proveedores evaluados'),
        s('o5', 'Estrategia', '¿Los contratos con los principales proveedores fijan precio, plazo y penalizaciones?', 'no', 'Contrato marco con los proveedores A.', 'Dirección general', 120, 'Proveedores A con contrato')
      ],
      objetivos: [{ k: 'Dependencia del primer proveedor', u: '%', dir: 'bajar', sug: 25, kpi: 'Dependencia del primer proveedor' }],
      cadencia: [['Mensual', 'Incidencias de calidad y plazo', 'Compras'], ['Trimestral', 'Evaluación de proveedores', 'Compras'], ['Anual', 'Negociación y contratos', 'Dirección y compras']]
    },

    logistica: {
      pregunta: '¿Cuánto me cuesta mover y guardar?', resp: 'Logística',
      proposito: 'Entregar a tiempo y completo al menor coste por pedido, sabiendo qué rutas y qué procesos encarecen el servicio.',
      maxima: ['Entregas a tiempo y completas (OTIF) medidas por cliente.', 'Coste por pedido y por ruta.', 'Rutas optimizadas y transporte licitado.', 'Almacén ordenado con ubicaciones por rotación.', 'Acuerdos de servicio con los transportistas.'],
      consultor: ['Mapa del recorrido del pedido de principio a fin.', 'Licitación del transporte.', 'Rediseño del almacén y ubicaciones por rotación.', 'Pedido mínimo o portes según tamaño.'],
      datos: [{ t: 'Pedidos, costes de transporte y almacén y datos por ruta', tipo: 'documentos' }, { t: 'Ventas por cliente', tipo: 'ventas' }],
      preguntas: [
        q('l1', 'Datos', '¿Mides las entregas a tiempo y completas (OTIF)?', 'Medir el OTIF por cliente cada semana.', 'Logística', 30, 'OTIF'),
        s('l2', 'Proceso', '¿Tienes pedido mínimo o portes según el tamaño del pedido?', 'no', 'Política de pedido mínimo o cargo de portes en pedidos pequeños.', 'Dirección comercial', 60, 'Pedidos pequeños'),
        q('l3', 'Proceso', '¿El almacén está ordenado, con ubicaciones y rotación controlada?', 'Aplicar 5S en el almacén y ubicar por rotación (ABC).', 'Logística', 90, 'Tiempo de preparación por pedido'),
        s('l4', 'Estrategia', '¿Has comparado tarifas de transporte en el último año?', 'no', 'Licitar el transporte con al menos tres ofertas.', 'Logística', 60, 'Coste de transporte por pedido'),
        q('l5', 'Datos', '¿Conoces el coste por pedido y por ruta?', 'Coste por ruta cada mes y revisión de las rutas menos rentables.', 'Logística', 60, 'Coste por pedido')
      ],
      objetivos: [{ k: 'OTIF', u: '%', dir: 'subir', sug: 95, kpi: 'OTIF' }, { k: 'Coste logístico s/ventas', u: '%', dir: 'bajar', kpi: 'Coste logístico s/ventas' }],
      cadencia: [['Diaria', 'Incidencias de entrega', 'Logística'], ['Semanal', 'OTIF por cliente', 'Logística'], ['Mensual', 'Coste por pedido y por ruta', 'Dirección de operaciones']]
    },

    tiempos: {
      pregunta: '¿En qué se va el tiempo del equipo?', resp: 'Dirección de operaciones',
      proposito: 'Saber en qué se va el tiempo del equipo: cuánto se factura, cuánto sostiene la empresa y cuánto se pierde en esperas y errores.',
      maxima: ['Horas registradas por tarea con poco esfuerzo (reloj de tareas).', 'Tiempo facturable frente a tiempo interno, por persona y equipo.', 'Coste de errores y esperas en euros.', 'Capacidad libre conocida antes de contratar.', 'Tiempos estándar en las tareas repetitivas.'],
      consultor: ['Categorías de tiempo comunes a toda la empresa.', 'Registro ligero durante cuatro semanas en los puestos clave.', 'Análisis de causas de esperas y retrabajos.', 'Liberación de capacidad y estándares de trabajo.'],
      datos: [{ t: 'Partes de trabajo o registros de horas por persona y tarea', tipo: 'tiempos' }, { t: 'Plantilla con coste', tipo: 'plantilla' }],
      preguntas: [
        q('h1', 'Datos', '¿Se registran las horas por tarea o por proyecto?', 'Usar el reloj de tareas durante cuatro semanas en los puestos clave.', 'Mandos', 30, 'Horas registradas'),
        q('h2', 'Proceso', '¿Se analizan las causas de las esperas y los retrabajos?', 'Reunión quincenal de causas: las tres principales esperas y retrabajos y su solución.', 'Producción', 30, 'Horas de esperas y retrabajos'),
        s('h3', 'Estrategia', '¿Sabes cuántas horas libres tienes para crecer sin contratar?', 'no', 'Calcular la capacidad libre por equipo y usarla en el simulador.', 'Dirección general', 60, 'Capacidad libre'),
        q('h4', 'Personas', '¿El equipo entiende por qué se mide el tiempo?', 'Explicar el objetivo (quitar esperas, no vigilar) y compartir los resultados.', 'Dirección general', 15, 'Participación en el registro'),
        s('h5', 'Proceso', '¿Hay tiempos estándar para las tareas repetitivas?', 'no', 'Definir el tiempo estándar de las diez tareas más frecuentes.', 'Producción', 90, 'Tareas con estándar')
      ],
      objetivos: [{ k: 'Tiempo ligado a facturación', u: '%', dir: 'subir', sug: 60, kpi: 'Tiempo ligado a facturación' }, { k: 'Coste de errores y esperas', u: '€', dir: 'bajar', kpi: 'Coste de errores y esperas' }],
      cadencia: [['Semanal', 'Horas, esperas y retrabajos', 'Mandos'], ['Mensual', 'Capacidad libre y coste del tiempo perdido', 'Dirección de operaciones'], ['Trimestral', 'Tiempos estándar', 'Producción']]
    },

    lean: {
      pregunta: '¿Dónde se pierde valor en el proceso?', resp: 'Producción',
      proposito: 'Quitar lo que no añade valor en el proceso (esperas, existencias, movimientos y retrabajos) para producir más con lo mismo.',
      maxima: ['Mapa del flujo de valor del producto principal, actual y futuro.', 'OEE medido por equipo y cuello de botella identificado.', '5S y gestión visual en todos los puestos.', 'Kaizen mensual con las ideas del equipo.', 'Cambios de formato rápidos (SMED) en el cuello de botella.'],
      consultor: ['Taller de mapa del flujo de valor con el equipo.', 'Medición del OEE y plan para el cuello de botella.', 'Talleres kaizen y estándares de trabajo.', 'Formación de un responsable interno de mejora continua.'],
      datos: [{ t: 'Partes de producción o de horas', tipo: 'tiempos' }, { t: 'Informes de producción, calidad o incidencias', tipo: 'documentos' }],
      preguntas: [
        q('n1', 'Datos', '¿Mides el OEE (disponibilidad × rendimiento × calidad) de los equipos principales?', 'Medir el OEE cada día en el cuello de botella.', 'Producción', 30, 'OEE medio'),
        s('n2', 'Proceso', '¿Has dibujado el mapa del flujo de valor de tu producto principal?', 'no', 'Taller de mapa del flujo de valor de un día con el equipo.', 'Producción', 45, 'Tiempo de paso'),
        q('n3', 'Proceso', '¿Aplicas 5S en los puestos de trabajo?', '5S en una zona piloto y auditoría mensual.', 'Producción', 60, 'Puntuación 5S'),
        q('n4', 'Personas', '¿Se recogen y se aplican las ideas de mejora del equipo?', 'Tablero de mejoras y kaizen mensual de dos horas.', 'Mandos', 30, 'Mejoras aplicadas'),
        s('n5', 'Herramientas', '¿Hay gestión visual (tableros, semáforos) en planta?', 'no', 'Tablero visual diario por línea: producción, calidad e incidencias.', 'Producción', 45, 'Líneas con tablero')
      ],
      objetivos: [{ k: 'OEE medio', u: '%', dir: 'subir', sug: 80, kpi: 'OEE medio' }],
      cadencia: [['Diaria', 'Reunión de diez minutos frente al tablero', 'Mandos de planta'], ['Mensual', 'Kaizen y OEE', 'Producción'], ['Trimestral', 'Mapa del flujo de valor', 'Dirección de operaciones']]
    },

    personas: {
      pregunta: '¿Está bien organizado el equipo?', resp: 'Personas',
      proposito: 'Tener el equipo preparado para lo que viene: estructura clara, relevo en los puestos clave y rotación y absentismo bajo control.',
      maxima: ['Organigrama con responsabilidades por escrito.', 'Plan de relevo para los puestos clave.', 'Evaluación del desempeño con objetivos individuales.', 'Plan de formación anual con presupuesto.', 'Clima medido y motivos de baja analizados.'],
      consultor: ['Análisis de estructura y cargas de trabajo.', 'Fichas de puesto y mapa de puestos críticos.', 'Sistema de evaluación anual sencillo.', 'Encuesta de clima, entrevista de salida y plan de acogida.'],
      datos: [{ t: 'Plantilla con nombre, área o puesto y coste', tipo: 'plantilla' }],
      preguntas: [
        s('e1', 'Estrategia', '¿Cada puesto clave tiene un relevo preparado?', 'no', 'Mapa de puestos críticos con su relevo y plan de formación.', 'Dirección general', 120, 'Puestos críticos con relevo'),
        q('e2', 'Proceso', '¿Hay evaluaciones del desempeño al menos una vez al año?', 'Entrevista anual de desempeño con objetivos individuales.', 'Mandos', 90, 'Personas evaluadas'),
        q('e3', 'Personas', '¿Conoces el clima del equipo y los motivos de las bajas voluntarias?', 'Encuesta de clima anual y entrevista de salida.', 'Personas', 60, 'Rotación voluntaria'),
        s('e4', 'Proceso', '¿Hay un plan de formación anual ligado a las necesidades?', 'no', 'Plan de formación por área con presupuesto.', 'Personas', 90, 'Horas de formación por persona'),
        q('e5', 'Estrategia', '¿Las funciones y responsabilidades están definidas por escrito?', 'Fichas de puesto y organigrama publicado.', 'Dirección general', 60, 'Puestos con ficha'),
        q('e6', 'Personas', '¿Los mandos intermedios deciden sin pasar todo por la dirección?', 'Lista de decisiones que pasan a los mandos, con límites claros.', 'Dirección general', 60, 'Decisiones delegadas')
      ],
      objetivos: [{ k: 'Rotación media', u: '%', dir: 'bajar', sug: 8, kpi: 'Rotación media' }, { k: 'Preparación para crecer', u: '/100', dir: 'subir', sug: 75, kpi: 'Preparación para crecer' }],
      cadencia: [['Mensual', 'Absentismo, bajas y vacantes', 'Personas'], ['Semestral', 'Desempeño y relevo', 'Mandos y dirección'], ['Anual', 'Clima y formación', 'Dirección general']]
    },

    expansion: {
      pregunta: '¿Dónde y cómo crecer?', resp: 'Dirección general',
      proposito: 'Elegir dónde y cómo crecer fuera de tu zona con números: mercado, competencia, inversión y plazo de recuperación.',
      maxima: ['Comparativa de zonas con los mismos criterios.', 'Modelo de entrada decidido (propio, socio o distribuidor).', 'Piloto con presupuesto, rampa e hitos de seguir o salir.', 'La inversión ensayada en el simulador antes de decidir.'],
      consultor: ['Estudio de mercado de las zonas candidatas.', 'Entrevistas a clientes potenciales.', 'Comparación de modelos de entrada por inversión, control y riesgo.', 'Plan piloto con hitos y criterio de salida.'],
      datos: [{ t: 'Estudios de mercado o datos de las zonas candidatas', tipo: 'documentos' }, { t: 'Ventas por cliente (zona actual)', tipo: 'ventas' }],
      preguntas: [
        q('x1', 'Datos', '¿Tienes datos del tamaño del mercado y de la competencia en las zonas candidatas?', 'Estudio de mercado de las dos zonas mejor puntuadas.', 'Dirección general', 60, 'Zonas estudiadas'),
        s('x2', 'Estrategia', '¿Has validado la demanda con clientes reales de la zona?', 'no', 'Diez entrevistas o una prueba comercial antes de invertir.', 'Dirección comercial', 60, 'Clientes potenciales validados'),
        q('x3', 'Estrategia', '¿Está decidido el modelo de entrada (propio, socio, distribuidor)?', 'Comparar modelos de entrada por inversión, control y riesgo.', 'Dirección general', 90, 'Modelo decidido'),
        s('x4', 'Proceso', '¿Hay hitos y criterios para seguir o salir?', 'no', 'Definir los hitos a seis y doce meses y el criterio de salida.', 'Dirección general', 30, 'Hitos cumplidos'),
        q('x5', 'Personas', '¿Tienes a la persona que liderará la expansión?', 'Identificar y preparar al responsable de la nueva zona.', 'Dirección general', 90, 'Responsable nombrado')
      ],
      objetivos: [{ k: 'Zonas rentables', u: 'zonas', dir: 'subir', kpi: 'Zonas rentables' }],
      cadencia: [['Mensual', 'Hitos del piloto', 'Responsable de la zona'], ['Trimestral', 'Decisión de seguir o salir', 'Dirección general']]
    },

    mercado: {
      pregunta: '¿Qué pasa fuera que me afecta?', resp: 'Dirección general',
      proposito: 'Entender lo que pasa fuera (tipos, inflación, demanda, competencia, regulación) y cómo afecta a la empresa, para anticiparse.',
      maxima: ['Panel de indicadores externos clave vigilado cada trimestre.', 'Sensibilidad al ciclo medida y plan de contingencia.', 'Mapa de competidores con precios y posicionamiento.', 'Riesgos externos con responsable y plan.', 'Vigilancia regulatoria y tecnológica.'],
      consultor: ['Análisis PESTEL y de las cinco fuerzas del sector.', 'Ficha de los principales competidores.', 'Escenarios macro trasladados al simulador.', 'Plan de contingencia ante una caída de la demanda.'],
      datos: [{ t: 'Estudios sectoriales, informes de mercado o de competencia', tipo: 'documentos' }, { t: 'Ventas por cliente', tipo: 'ventas' }],
      preguntas: [
        q('r1', 'Datos', '¿Sigues con regularidad los indicadores externos que afectan a tu negocio?', 'Panel trimestral con cinco indicadores externos clave.', 'Dirección general', 30, 'Indicadores vigilados'),
        s('r2', 'Estrategia', '¿Conoces la cuota y los precios de tus tres principales competidores?', 'no', 'Ficha de los tres competidores: precios, oferta, clientes y fortalezas.', 'Dirección comercial', 60, 'Competidores analizados'),
        q('r3', 'Estrategia', '¿Tienes un plan si la demanda cae un 15 %?', 'Plan de contingencia: costes a ajustar y en qué orden.', 'Dirección general', 60, 'Plan de contingencia'),
        s('r4', 'Proceso', '¿Revisas la regulación que te afecta (laboral, fiscal, medioambiental, sectorial)?', 'no', 'Revisión semestral con los asesores de los cambios regulatorios.', 'Dirección general', 180, 'Cambios revisados'),
        q('r5', 'Estrategia', '¿Tu oferta está preparada para los cambios tecnológicos del sector?', 'Vigilancia tecnológica y una prueba piloto al año.', 'Dirección general', 180, 'Pilotos al año')
      ],
      objetivos: [{ k: 'Sensibilidad al ciclo', u: '/5', dir: 'bajar', sug: 3, kpi: 'Sensibilidad al ciclo' }, { k: 'Riesgos externos', u: 'riesgos', dir: 'bajar', kpi: 'Riesgos externos' }],
      cadencia: [['Trimestral', 'Indicadores externos y competencia', 'Dirección general'], ['Semestral', 'Regulación', 'Dirección y asesores'], ['Anual', 'Escenarios y contingencia', 'Comité de dirección']]
    },

    evolucion: {
      pregunta: '¿La empresa mejora o empeora?', resp: 'Dirección general',
      proposito: 'Pasar de la foto a la película: comparar el diagnóstico de hoy con el de hace un mes, un trimestre o un año para saber si las decisiones están funcionando.',
      maxima: ['Un corte del diagnóstico cada mes, guardado y comparable.', 'Cada cambio relevante (cargar cuentas, una inversión, un cambio de política) con su corte antes y después para medir su efecto.', 'Revisión trimestral de qué semáforos mejoran y cuáles empeoran, con su explicación.', 'La propiedad ve la tendencia, no solo el dato del mes.'],
      consultor: ['Fijar el corte de referencia (punto cero) con datos reales antes de empezar a mejorar.', 'Lectura de tendencias: separar lo que mejora por decisiones propias de lo que mejora por el mercado.', 'Informe trimestral de evolución para la propiedad o el consejo.'],
      datos: [{ t: 'Balances y cuentas de resultados de los dos últimos años (punto de partida)', tipo: 'cuentas', alt: 'historico' }],
      preguntas: [
        s('v1', 'Proceso', '¿Tienes una foto de referencia de la empresa (punto cero) con la que comparar?', 'no', 'Guardar ahora un corte de referencia con los datos reales cargados.', 'Dirección general', 7, 'Cortes guardados'),
        q('v2', 'Proceso', '¿Revisas de forma periódica si los indicadores mejoran o empeoran?', 'Revisión trimestral de la evolución: qué mejora, qué empeora y por qué.', 'Dirección general', 90, 'Revisiones trimestrales hechas'),
        q('v3', 'Estrategia', '¿Mides el efecto de las decisiones importantes (antes y después)?', 'Guardar un corte antes y otro después de cada decisión relevante.', 'Dirección general', 30, 'Decisiones con corte antes y después')
      ],
      objetivos: [{ k: 'Salud global', u: '/100', dir: 'subir', sug: 75, fn: 'salud' }],
      cadencia: [['Mensual', 'Corte automático del diagnóstico', 'Atalaya'], ['Trimestral', 'Lectura de la evolución con la dirección', 'Dirección general'], ['Anual', 'Evolución del año para la propiedad', 'Propiedad']]
    },

    cobros: {
      pregunta: '¿Cómo pagan de verdad mis clientes y cuánto riesgo tengo en la calle?', resp: 'Dirección financiera',
      proposito: 'Auditar la cartera de clientes a una fecha de corte: antigüedad de los saldos, comportamiento real de pago frente a lo pactado, caja atrapada y deterioro. Es diagnóstico para decidir la política de crédito, no la gestión diaria del cobro.',
      maxima: ['Antigüedad de saldos revisada en cada cierre de mes, con el deterioro reconocido en las cuentas.', 'Plazo pactado y plazo real medidos por cliente y por segmento.', 'Política de crédito escrita: límites por cliente, condiciones por segmento y quién aprueba excepciones.', 'Seguro de crédito o garantías para los clientes con más riesgo.'],
      consultor: ['Auditoría de la cartera al cierre: saldos vencidos por tramo y por cliente.', 'Comparación del plazo pactado con el pago real del último año.', 'Cálculo de la caja atrapada y del coste financiero de los retrasos.', 'Propuesta de política de crédito y de condiciones por segmento ABC.'],
      datos: [{ t: 'Facturas pendientes de cobro a la fecha de corte', tipo: 'cartera' }, { t: 'Cobros del último año con fecha de factura y de cobro', tipo: 'cobros' }, { t: 'Ventas del último año por cliente (plazos pactados)', tipo: 'ventas' }],
      preguntas: [
        s('k1', 'Proceso', '¿Hay una política escrita de crédito a clientes (plazos, límites y quién aprueba excepciones)?', 'no', 'Redactar la política de crédito: plazos por segmento, límite por cliente y quién aprueba excepciones.', 'Dirección financiera', 45, 'Clientes dentro de límite'),
        s('k2', 'Datos', '¿Se reconoce en las cuentas el deterioro de los saldos de dudoso cobro?', 'no', 'Revisar con el asesor el deterioro de los saldos de más de seis meses y su deducibilidad.', 'Administración', 30, 'Deterioro reconocido'),
        q('k3', 'Estrategia', '¿Las condiciones de pago se deciden según la rentabilidad y el riesgo de cada cliente?', 'Condiciones por segmento ABC: plazos más cortos o garantías a los clientes de más riesgo y menos margen.', 'Dirección comercial', 60, 'Días reales de cobro'),
        s('k4', 'Herramientas', '¿Tienes seguro de crédito o garantías con los clientes que más deben?', 'no', 'Estudiar el seguro de crédito o garantías para los clientes con más saldo vencido.', 'Dirección financiera', 60, 'Saldo asegurado')
      ],
      objetivos: [{ k: 'Días reales de cobro', u: 'días', dir: 'bajar', kpi: 'Días reales de cobro' }, { k: 'Vencido sobre pendiente', u: '%', dir: 'bajar', sug: 15, kpi: 'Vencido sobre pendiente' }],
      cadencia: [['Mensual', 'Antigüedad de saldos al cierre', 'Administración'], ['Trimestral', 'Plazo real frente a pactado y política de crédito', 'Dirección financiera'], ['Anual', 'Deterioro y seguro de crédito', 'Dirección y asesor']]
    },

    valoracion: {
      pregunta: '¿Cuánto vale mi empresa y cuánto puede llegar a valer?', resp: 'Propiedad',
      proposito: 'Poner precio orientativo a la empresa con métodos de mercado y saber qué decisiones la hacen valer más: el marcador final para la propiedad en sucesiones, entrada de socios, ventas o estrategia de grupo.',
      maxima: ['Valoración actualizada cada año con dos métodos y un rango, no una cifra única.', 'Mapa de lo que resta valor (dependencia del dueño, clientes concentrados, cuentas poco fiables) con un plan para corregirlo.', 'Valor objetivo a tres o cinco años ligado al plan de empresa.', 'Pactos entre socios y protocolo familiar con un criterio de valoración acordado de antemano.'],
      consultor: ['Normalización del EBITDA: gastos personales, sueldos fuera de mercado y partidas no recurrentes.', 'Valoración por múltiplos de operaciones comparables y por descuento de flujos.', 'Análisis de los factores que un comprador descuenta y plan para corregirlos.', 'Preparación de la empresa para una operación (vendor due diligence).'],
      datos: [{ t: 'Balances y cuentas de resultados de al menos dos años', tipo: 'cuentas', alt: 'historico' }, { t: 'Ventas del último año por cliente (concentración)', tipo: 'ventas' }],
      preguntas: [
        s('w1', 'Estrategia', '¿La empresa funcionaría tres meses sin la propiedad?', 'no', 'Delegar decisiones y preparar un equipo directivo que no dependa de la propiedad.', 'Propiedad', 180, 'Decisiones delegadas'),
        s('w2', 'Datos', '¿Las cuentas están auditadas o tienen un histórico fiable de al menos tres años?', 'no', 'Ordenar las cuentas y valorar una auditoría voluntaria antes de cualquier operación.', 'Administración', 120, 'Años con cuentas fiables'),
        s('w3', 'Estrategia', '¿Hay un pacto entre socios o protocolo familiar con un criterio de valoración?', 'no', 'Acordar un pacto de socios con el método de valoración para entradas, salidas y herencias.', 'Propiedad', 120, 'Pacto firmado'),
        q('w4', 'Estrategia', '¿Sabes qué decisiones aumentarían más el valor de la empresa?', 'Priorizar las mejoras del plan por su efecto en el valor (EBITDA por múltiplo y reducción de riesgo).', 'Dirección general', 60, 'Valor con el plan')
      ],
      objetivos: [{ k: 'Valor de las acciones', u: '€', dir: 'subir', kpi: 'Valor de las acciones' }],
      cadencia: [['Anual', 'Valoración actualizada con las cuentas del año', 'Propiedad y dirección financiera'], ['Ante cualquier operación', 'Valoración profesional independiente', 'Propiedad y asesor']]
    }
  };

  /* Datos que reconoce la zona de origen y a qué módulos alimentan */
  A.C360_TIPOS = {
    cuentas: { n: 'Balances y cuentas de resultados', d: 'Cuentas anuales, balance de sumas y saldos o PyG de uno o varios años.', mods: ['dinero', 'impuestos', 'presupuesto', 'tablero', 'auditoria', 'plan'] },
    ventas: { n: 'Ventas', d: 'Listado de facturas o ventas por cliente, producto y fecha, con importe (y coste o margen si lo tienes).', mods: ['ventas', 'margen', 'presupuesto', 'tesoreria', 'marketing', 'comercial', 'expansion', 'mercado', 'logistica'] },
    productos: { n: 'Productos', d: 'Catálogo o tarifa con precio, coste y unidades vendidas.', mods: ['margen', 'ventas'] },
    compras: { n: 'Compras y proveedores', d: 'Facturas de compra o compras por proveedor, con importe y plazo de pago.', mods: ['compras', 'tesoreria', 'ventas'] },
    plantilla: { n: 'Plantilla (trabajadores)', d: 'Trabajadores con nómina: área o puesto y coste (salario o coste empresa). Los inversores no van aquí.', mods: ['personas', 'tiempos'] },
    inversores: { n: 'Inversores (acreedores)', d: 'Quién aporta dinero a la empresa o a sus operaciones: aportación, participación, rentabilidad pactada y vencimiento. Son acreedores, no trabajadores.', mods: ['dinero', 'tesoreria', 'valoracion'] },
    pipeline: { n: 'Oportunidades comerciales', d: 'Oportunidades abiertas con cliente, importe, etapa y probabilidad.', mods: ['comercial'] },
    tiempos: { n: 'Partes de horas', d: 'Registros de horas por persona, tarea y fecha.', mods: ['tiempos', 'lean'] },
    banco: { n: 'Movimientos bancarios', d: 'Extracto con fecha, concepto, importe y saldo.', mods: ['tesoreria'] },
    cartera: { n: 'Facturas pendientes de cobro', d: 'Cartera de clientes a una fecha: cliente, factura, vencimiento e importe pendiente.', mods: ['cobros', 'dinero', 'valoracion'] },
    cobros: { n: 'Cobros del último año', d: 'Facturas cobradas con fecha de factura y fecha de cobro: dice cómo paga de verdad cada cliente.', mods: ['cobros'] },
    marketing: { n: 'Marketing por canal', d: 'Inversión, contactos y clientes por canal o campaña.', mods: ['marketing'] },
    documentos: { n: 'Informes y documentos de trabajo', d: 'Informes, actas, estudios, memorias o cualquier texto que dé contexto.', mods: ['plan', 'auditoria', 'mercado', 'expansion', 'lean', 'logistica', 'impuestos', 'presupuesto'] }
  };
})();
