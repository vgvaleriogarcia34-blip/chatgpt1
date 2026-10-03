/* Atalaya 360° · Personas y equipos · Contenido del informe completo de la persona
   Textos propios para cada factor del DISC según su nivel (alto, medio o bajo) y para cada estilo principal.
   {n} se sustituye por el nombre de la persona. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const X = (A.informeCompletoDatos = {});

  X.VARIABLE = {
    D: { t: 'Variable dominancia', s: 'Cómo afronta problemas y retos', c: 'Cómo respondemos ante los problemas y los desafíos.' },
    I: { t: 'Variable influencia', s: 'Cómo se relaciona e influye', c: 'Cómo nos relacionamos con los demás e influimos en ellos.' },
    S: { t: 'Variable estabilidad', s: 'Cómo vive el ritmo y los cambios', c: 'Cómo respondemos a los cambios y al ritmo de las cosas.' },
    C: { t: 'Variable cumplimiento', s: 'Cómo trata normas y procedimientos', c: 'Cómo respondemos ante las reglas y los procedimientos.' }
  };
  X.FRENTE = { D: 'Frente a los retos', I: 'Frente a las personas', S: 'Frente al ritmo', C: 'Frente a las normas' };

  /* Por factor y nivel: narración, tendencia y palabras que lo describen */
  X.FACTOR = {
    D: {
      alto: { narr: '{n} afronta los problemas de frente y decide con rapidez. Le motivan los retos y los resultados visibles, y tiende a tomar el mando cuando la situación lo pide. Puede impacientarse cuando las cosas van despacio o cuando los demás dudan, y prefiere equivocarse actuando a quedarse quieto.', tend: '{n} muestra mucha determinación ante los problemas y no duda en superar los obstáculos que se le ponen delante. Decide sin titubear y asume la responsabilidad de lo que decide.', pal: ['Decidido', 'Directo', 'Competitivo', 'Determinado'] },
      medio: { narr: '{n} combina decisión y prudencia: asume retos cuando los ve claros y sabe esperar cuando hace falta más información. No busca el control por sí mismo, pero no le cuesta decidir cuando es su responsabilidad.', tend: '{n} decide cuando tiene claro el terreno y pondera los riesgos antes de lanzarse. Afronta los problemas sin precipitarse y sin rehuirlos.', pal: ['Resolutivo', 'Prudente', 'Equilibrado', 'Firme'] },
      bajo: { narr: '{n} prefiere avanzar por acuerdo antes que imponer. Evita la confrontación innecesaria y pondera bien las consecuencias antes de decidir; en momentos de mucha presión puede necesitar que otra persona marque el rumbo.', tend: '{n} aborda los problemas buscando consenso y seguridad. Prefiere decisiones compartidas y puede posponer las que implican conflicto.', pal: ['Conciliador', 'Ponderado', 'Cooperativo', 'Modesto'] }
    },
    I: {
      alto: { narr: '{n} conecta con facilidad, transmite entusiasmo y sabe convencer. Disfruta del trato con personas y de presentar ideas; necesita reconocimiento y variedad, y puede dispersarse si no tiene prioridades claras.', tend: '{n} influye con entusiasmo y cercanía. Le resulta natural presentar ideas, animar a otros y crear buen ambiente; confía pronto en las personas.', pal: ['Sociable', 'Persuasivo', 'Entusiasta', 'Expresivo'] },
      medio: { narr: '{n} se relaciona con naturalidad, aunque elige cuándo exponerse. Puede animar a un grupo cuando conoce bien el tema y prefiere que las ideas se sostengan con argumentos.', tend: '{n} influye con cordialidad y argumentos. Se abre con quien conoce y se reserva en entornos nuevos.', pal: ['Cordial', 'Abierto', 'Sereno', 'Selectivo'] },
      bajo: { narr: '{n} prefiere que los datos hablen por sí mismos. Es reservado al influir en los demás, no adorna lo que dice y evalúa la confianza en cada relación antes de abrirse.', tend: '{n} no suele ser muy expresivo cuando trata de influir: considera que convencer debe basarse en la objetividad y la franqueza, y no da la confianza por sentada.', pal: ['Reflexivo', 'Analítico', 'Reservado', 'Escéptico'] }
    },
    S: {
      alto: { narr: '{n} aporta constancia, paciencia y lealtad. Le gusta terminar una tarea antes de empezar otra, valora un entorno estable y previsible, y necesita tiempo y explicaciones para los cambios.', tend: '{n} prefiere trabajar donde la paciencia es una virtud y el ambiente es tranquilo. Le gusta terminar lo que empieza y un futuro previsible y seguro.', pal: ['Paciente', 'Constante', 'Leal', 'Estable'] },
      medio: { narr: '{n} equilibra ritmo y estabilidad: acepta los cambios cuando entiende su porqué y mantiene el esfuerzo sin necesitar novedad constante.', tend: '{n} se adapta a los cambios si se le explican y mantiene un ritmo regular. Combina constancia con cierta capacidad de cambiar de tarea.', pal: ['Adaptable', 'Sereno', 'Equilibrado', 'Fiable'] },
      bajo: { narr: '{n} se mueve bien en entornos cambiantes y con varias tareas a la vez. Se aburre con la rutina y busca agilidad; a veces cambia de frente antes de cerrar el anterior.', tend: '{n} disfruta del cambio y del ritmo rápido. Lleva bien la variedad y la urgencia, aunque la rutina le pesa.', pal: ['Ágil', 'Inquieto', 'Flexible', 'Dinámico'] }
    },
    C: {
      alto: { narr: 'Para {n} la calidad es lo primero: sigue las normas, cuida los detalles y prefiere hacer las cosas bien a hacerlas rápido. Analiza antes de decidir, busca toda la información posible y puede tomarse la crítica a su trabajo como algo personal.', tend: '{n} sigue las reglas y los procedimientos con rigor y se siente cómodo donde las normas están por escrito. Le preocupa hacer las cosas bien y teme que los errores frenen el trabajo.', pal: ['Exacto', 'Sistemático', 'Riguroso', 'Prudente'] },
      medio: { narr: '{n} respeta los procedimientos cuando tienen sentido y sabe adaptarlos cuando no. Cuida la calidad sin perder de vista el plazo.', tend: '{n} sigue las normas útiles y cuestiona las que no aportan. Equilibra precisión y practicidad.', pal: ['Ordenado', 'Práctico', 'Cuidadoso', 'Sensato'] },
      bajo: { narr: '{n} prefiere la flexibilidad a las normas rígidas. Se fija más en el resultado que en el procedimiento y puede pasar por alto detalles si nadie los revisa.', tend: '{n} trata las normas como orientación, no como obligación. Improvisa con soltura y prioriza el resultado sobre la forma.', pal: ['Independiente', 'Flexible', 'Intuitivo', 'Espontáneo'] }
    }
  };
  X.nivel = (v) => (v >= 60 ? 'alto' : v >= 40 ? 'medio' : 'bajo');

  /* Por estilo principal */
  X.ESTILO = {
    D: {
      entorno: ['Retos y metas ambiciosas', 'Autonomía para decidir el cómo', 'Resultados visibles y medibles', 'Variedad de responsabilidades', 'Poco control sobre los detalles'],
      motiv: ['Superar retos', 'Lograr resultados', 'Poder de decisión', 'Reconocimiento por lo conseguido', 'Oportunidades de crecimiento'],
      estilo: [['Método de control', 'Dirigir y decidir'], ['Evalúa a los demás', 'Por sus resultados'], ['Reacción bajo presión', 'Puede volverse autoritario'], ['Posible temor', 'Perder el control'], ['Emoción predominante', 'Impaciencia'], ['Cómo influye', 'Con determinación'], ['Área a trabajar', 'Escuchar antes de decidir']],
      relaciona: ['Toma la iniciativa en la conversación', 'Va directo al asunto', 'Plantea retos a los demás', 'Puede parecer brusco o impaciente', 'Respeta a quien le habla claro', 'Defiende sus posiciones con fuerza'],
      prefiere: ['Ir al grano y con brevedad', 'Presentar opciones y sus consecuencias', 'Hablar de resultados, no de procesos', 'Dejarle decidir el cómo', 'Cumplir lo que se promete', 'Argumentos sólidos sin rodeos'],
      evitar: ['Divagar o dar rodeos', 'Controlar de cerca su trabajo', 'Hacerle perder el tiempo', 'Decidir sin consultarle', 'Cuestionar su autoridad en público', 'Promesas vagas'],
      contribucion: ['Toma decisiones difíciles', 'Empuja los proyectos hasta el final', 'Asume riesgos calculados', 'Busca nuevas oportunidades', 'Mantiene el foco en el resultado', 'Afronta los conflictos'],
      mejora: ['Impaciencia con el ritmo de los demás', 'Escuchar antes de decidir', 'Delegar sin controlar en exceso', 'Cuidar las formas al dar instrucciones', 'Reconocer las aportaciones del equipo', 'Planificar los detalles'],
      puestoSi: ['Con autoridad y capacidad de decisión', 'Con retos y objetivos exigentes', 'Con variedad y ritmo', 'Orientados a resultados medibles', 'Con margen para emprender'],
      puestoAd: ['Que piden gestionar situaciones críticas', 'Con negociación', 'Con dirección de equipos'],
      puestoNo: ['Muy repetitivos', 'Con supervisión estrecha', 'Con mucho detalle técnico sin autonomía', 'Que exigen obedecer sin opinar', 'De ritmo muy lento'],
      dirigir: ['Objetivos claros y medibles', 'Autonomía en el cómo', 'Retos de dificultad creciente', 'Pocas reuniones y concretas', 'Feedback directo', 'Autoridad acorde a la responsabilidad'],
      motivar: ['Reconocimiento por resultados', 'Nuevas responsabilidades', 'Competencia sana', 'Libertad para decidir', 'Proyectos con impacto visible', 'Evitar la rutina'],
      lid: { n: 'Liderazgo directivo', rasgos: ['Decisión rápida', 'Orientación a resultados', 'Marca el rumbo con claridad', 'Asume la responsabilidad'], fuertes: ['Actúa con aplomo en situaciones críticas', 'Moviliza al equipo hacia la meta', 'Resuelve los conflictos de frente'], riesgos: ['Exceso de control', 'Poca escucha', 'Presión sobre el equipo'], mejorar: ['Implicar al equipo en las decisiones', 'Reconocer más los avances'] }
    },
    I: {
      entorno: ['Contacto con personas', 'Ambiente positivo y dinámico', 'Libertad para expresarse', 'Reconocimiento visible', 'Variedad de tareas'],
      motiv: ['Reconocimiento', 'Relaciones y trabajo en equipo', 'Proyectos creativos', 'Libertad frente al detalle', 'Influir en los demás'],
      estilo: [['Método de control', 'Convencer y entusiasmar'], ['Evalúa a los demás', 'Por cómo se relacionan'], ['Reacción bajo presión', 'Puede desorganizarse'], ['Posible temor', 'El rechazo'], ['Emoción predominante', 'Optimismo'], ['Cómo influye', 'Con entusiasmo y simpatía'], ['Área a trabajar', 'Cerrar lo que abre']],
      relaciona: ['Abre conversación con facilidad', 'Crea buen ambiente', 'Comparte ideas y sentimientos', 'Confía pronto en los demás', 'Busca la aprobación del grupo', 'Anima a los demás'],
      prefiere: ['Un trato cercano y amable', 'Unos minutos de conversación antes del asunto', 'Ideas y visión antes que datos', 'Reconocimiento de sus aportaciones', 'Conversaciones abiertas', 'Resúmenes, no informes largos'],
      evitar: ['Ser frío o demasiado seco', 'Ahogarle en detalles', 'Ignorar sus ideas', 'Criticarle en público', 'Encerrarle en tareas solitarias', 'Conversaciones impersonales'],
      contribucion: ['Genera entusiasmo', 'Comunica y vende las ideas', 'Crea relaciones y red de contactos', 'Aporta creatividad', 'Motiva al equipo', 'Rebaja tensiones con humor'],
      mejora: ['Gestión del tiempo', 'Seguir lo comprometido hasta el final', 'Atención al detalle', 'Escuchar sin interrumpir', 'Sostener las propuestas con datos', 'Priorizar'],
      puestoSi: ['Con mucho contacto con personas', 'Que requieren persuasión', 'Con variedad y movimiento', 'Creativos o comerciales', 'De representación'],
      puestoAd: ['De formación', 'De atención a clientes', 'De coordinación de equipos'],
      puestoNo: ['Aislados', 'Con mucho análisis y detalle', 'Muy reglamentados', 'Sin reconocimiento', 'Repetitivos'],
      dirigir: ['Un trato cercano', 'Objetivos concretos con fecha', 'Seguimiento breve y frecuente', 'Ayuda para ordenar prioridades', 'Libertad creativa', 'Reconocimiento visible'],
      motivar: ['Reconocimiento público', 'Trabajo en equipo', 'Nuevas ideas y proyectos', 'Contacto con clientes', 'Ambiente positivo', 'Visibilidad'],
      lid: { n: 'Liderazgo inspirador', rasgos: ['Contagia entusiasmo', 'Comunica la visión', 'Crea buen clima', 'Persuade'], fuertes: ['Motiva al equipo', 'Genera adhesión al proyecto', 'Abre puertas y relaciones'], riesgos: ['Poco seguimiento', 'Promesas por encima de lo posible', 'Evitar conversaciones difíciles'], mejorar: ['Seguimiento con datos', 'Firmeza ante el bajo rendimiento'] }
    },
    S: {
      entorno: ['Estable y previsible', 'Buen clima de equipo', 'Tiempo para adaptarse a los cambios', 'Funciones claras', 'Pocos conflictos'],
      motiv: ['Seguridad', 'Relaciones de confianza', 'Trabajo bien terminado', 'Sentirse parte del equipo', 'Reconocimiento sincero'],
      estilo: [['Método de control', 'Mantener la armonía'], ['Evalúa a los demás', 'Por su lealtad y constancia'], ['Reacción bajo presión', 'Puede ceder o callar'], ['Posible temor', 'Los cambios bruscos'], ['Emoción predominante', 'Calma'], ['Cómo influye', 'Con coherencia y constancia'], ['Área a trabajar', 'Decir lo que piensa']],
      relaciona: ['Escucha con paciencia', 'Es leal y discreto', 'Apoya a los demás', 'Evita el conflicto', 'Se toma su tiempo para confiar', 'Mantiene relaciones largas'],
      prefiere: ['Un trato tranquilo y amable', 'Que se le explique el porqué', 'Tiempo para pensar', 'Preguntas abiertas («¿cómo lo ves?»)', 'Coherencia', 'Respeto a los compromisos'],
      evitar: ['Presionarle para decidir', 'Cambios sin aviso', 'Un tono agresivo', 'Ambigüedad sobre lo que se espera', 'Romper acuerdos', 'Conflictos en público'],
      contribucion: ['Constancia y fiabilidad', 'Cohesión del equipo', 'Paciencia con los procesos largos', 'Lealtad', 'Escucha', 'Termina lo que empieza'],
      mejora: ['Expresar el desacuerdo', 'Aceptar el cambio', 'Decir que no', 'Iniciativa ante lo nuevo', 'Pedir ayuda', 'Decidir con más rapidez'],
      puestoSi: ['Estables y bien definidos', 'De apoyo y servicio', 'Con relaciones a largo plazo', 'Con procesos claros', 'En equipo'],
      puestoAd: ['De atención al cliente', 'Administrativos', 'De coordinación'],
      puestoNo: ['Con cambios constantes', 'De presión comercial agresiva', 'Con confrontación frecuente', 'Muy aislados', 'Con mucha improvisación'],
      dirigir: ['Instrucciones claras', 'Explicar el porqué de los cambios', 'Tiempo para adaptarse', 'Apoyo y seguimiento cercano', 'Reconocimiento sincero', 'Estabilidad'],
      motivar: ['Seguridad y estabilidad', 'Buen ambiente', 'Reconocimiento personal', 'Sentido de pertenencia', 'Planes claros', 'Agradecimiento'],
      lid: { n: 'Liderazgo cooperador', rasgos: ['Escucha', 'Crea confianza', 'Ritmo constante', 'Apoya al equipo'], fuertes: ['Cohesiona', 'Retiene a las personas', 'Gestiona con calma'], riesgos: ['Evitar los conflictos', 'Lentitud ante los cambios', 'Proteger en exceso'], mejorar: ['Firmeza', 'Impulsar los cambios'] }
    },
    C: {
      entorno: ['Más lógico que emocional', 'Normas y procedimientos claros', 'Tiempo para hacer bien el trabajo', 'Calidad valorada', 'Pocas interrupciones'],
      motiv: ['Trabajo bien hecho', 'Calidad y precisión', 'Procedimientos establecidos', 'Ser experto en su materia', 'Reconocimiento por la calidad'],
      estilo: [['Método de control', 'Asegurar la calidad'], ['Evalúa a los demás', 'Por su rigor y compromiso'], ['Reacción bajo presión', 'Puede volverse crítico'], ['Posible temor', 'Equivocarse'], ['Emoción predominante', 'Prudencia'], ['Cómo influye', 'Aportando datos'], ['Área a trabajar', 'Decidir sin tener todo']],
      relaciona: ['Prefiere un segundo plano', 'Es reservado al principio', 'Valora la objetividad', 'Hace preguntas precisas', 'Cuida la exactitud de lo que dice', 'Confía poco a poco'],
      prefiere: ['Información completa y ordenada', 'Argumentos lógicos', 'Tiempo para analizar', 'Expectativas claras por escrito', 'Cumplir lo acordado', 'Profesionalidad'],
      evitar: ['Ser impreciso o contradecirse', 'Presionarle para decidir sin datos', 'Halagos vacíos', 'Un trato demasiado personal', 'Improvisar', 'Restar importancia a la calidad'],
      contribucion: ['Se basa en hechos objetivos', 'Cuida los detalles', 'Diseña y sigue procedimientos', 'Plantea las preguntas clave', 'Es realista', 'Asegura la calidad'],
      mejora: ['Exceso de crítica', 'Delegar', 'Tolerar el error ajeno', 'Decidir con información incompleta', 'Expresar emociones', 'Flexibilidad'],
      puestoSi: ['Especializados y técnicos', 'Con procesos establecidos', 'Donde la calidad es clave', 'Analíticos', 'Organizados'],
      puestoAd: ['De planificación', 'De control y auditoría', 'De soporte técnico'],
      puestoNo: ['De mucha persuasión', 'Con improvisación constante', 'Con cambios bruscos', 'Sin normas claras', 'De ritmo frenético'],
      dirigir: ['Tareas con resultados medibles', 'Herramientas y medios', 'Tiempo para analizar', 'Información completa', 'Expectativas por escrito', 'Feedback objetivo'],
      motivar: ['Manuales y procedimientos', 'Reconocer la calidad', 'Planes estables', 'Feedback periódico', 'Instrucciones claras', 'Tiempo para ajustarse a los cambios'],
      lid: { n: 'Liderazgo planificador', rasgos: ['Prudencia', 'Expectativas claras', 'Estructura', 'Ritmo constante'], fuertes: ['Planifica con cuidado', 'Da herramientas al equipo', 'Mantiene la calma bajo presión'], riesgos: ['Exceso de precaución', 'Rigidez ante lo nuevo', 'Distancia con el equipo'], mejorar: ['Expresar lo que piensa', 'Decidir con más rapidez'] }
    }
  };

  /* Consejos para comunicarse con cada estilo */
  X.CONSEJOS = {
    D: { t: 'Con personas directas, rápidas y orientadas a objetivos', l: ['Vaya al grano.', 'No sea desafiante, pero no se deje amedrentar.', 'Llegue preparado.', 'Deje las cosas claras, nada en el aire.'] },
    I: { t: 'Con personas sociables, habladoras y de ritmo rápido', l: ['No sea cortante, frío ni seco.', 'Converse un momento antes de ir al asunto.', 'Cree un ambiente distendido.', 'Pregunte cómo lo ve.'] },
    S: { t: 'Con personas tranquilas, amables, fiables y reservadas', l: ['Empiece buscando un punto en común.', 'No se muestre agresivo ni exigente.', 'Comuníquese con calma.', 'No fuerce una decisión: dele tiempo.'] },
    C: { t: 'Con personas detallistas, cumplidoras y centradas en la tarea', l: ['Respete su espacio; no fuerce la confianza.', 'Vaya organizado y mantenga el tono profesional.', 'Aporte detalles e información.', 'Deje que analice antes de decidir.'] }
  };

  /* Mapa conductual: ocho tendencias alrededor de la rueda (ángulo en grados, 0 = derecha) */
  X.MAPA = [
    { k: 'D', n: 'Impulsa', d: 'Orientado a tareas', a: 135 },
    { k: 'DI', n: 'Convence', d: 'Tareas e ideas', a: 90 },
    { k: 'I', n: 'Promueve', d: 'Orientado a ideas', a: 45 },
    { k: 'IS', n: 'Relaciona', d: 'Procesos e ideas', a: 0 },
    { k: 'S', n: 'Coopera', d: 'Orientado a procesos', a: -45 },
    { k: 'SC', n: 'Coordina', d: 'Procesos e información', a: -90 },
    { k: 'C', n: 'Analiza', d: 'Orientado a información', a: -135 },
    { k: 'CD', n: 'Implementa', d: 'Información y tareas', a: 180 }
  ];

  /* Competencias conductuales: combinación de los cuatro factores (pesos; «-X» = 100 − X) */
  X.AREAS = [
    { n: 'Decisión y objetivos', w: { D: 0.7, I: 0.15, C: 0.15 } },
    { n: 'Interacción y comunicación', w: { I: 0.7, S: 0.2, D: 0.1 } },
    { n: 'Gestión y coordinación', w: { S: 0.4, C: 0.3, D: 0.3 } },
    { n: 'Normas y procedimientos', w: { C: 0.7, S: 0.3 } }
  ];
  X.COMPETENCIAS = [
    { n: 'Calidad del trabajo', w: { C: 0.6, S: 0.3, '-I': 0.1 } },
    { n: 'Resistencia a la presión', w: { D: 0.5, C: 0.3, S: 0.2 } },
    { n: 'Coordinación de equipos', w: { D: 0.35, I: 0.35, S: 0.3 } },
    { n: 'Desarrollo del equipo', w: { S: 0.5, I: 0.4, C: 0.1 } },
    { n: 'Delegación', w: { I: 0.4, D: 0.3, '-C': 0.3 } },
    { n: 'Enfoque en la meta', w: { D: 0.7, C: 0.2, I: 0.1 } },
    { n: 'Innovación', w: { I: 0.4, D: 0.4, '-S': 0.2 } },
    { n: 'Coherencia', w: { C: 0.5, S: 0.4, D: 0.1 } },
    { n: 'Equidad', w: { C: 0.5, S: 0.4, '-D': 0.1 } },
    { n: 'Liderazgo del cambio', w: { D: 0.45, I: 0.4, '-S': 0.15 } },
    { n: 'Comunicación interpersonal', w: { I: 0.7, S: 0.3 } },
    { n: 'Orientación al servicio', w: { S: 0.5, I: 0.3, C: 0.2 } },
    { n: 'Pensamiento estratégico', w: { D: 0.4, C: 0.4, I: 0.2 } },
    { n: 'Adaptabilidad', w: { I: 0.4, '-S': 0.3, '-C': 0.3 } },
    { n: 'Prudencia', w: { C: 0.5, S: 0.4, '-D': 0.1 } },
    { n: 'Temple', w: { S: 0.5, C: 0.3, D: 0.2 } }
  ];
  X.calc = (w, d) => Math.round(Object.keys(w).reduce((a, k) => a + w[k] * (k[0] === '-' ? 100 - d[k.slice(1)] : d[k]), 0));

  X.AVISO = 'Este informe describe tendencias de comportamiento, aportación al equipo y motivación a partir de las respuestas de la persona. No mide la inteligencia, los valores ni la capacidad, y no debe ser el único criterio para ninguna decisión sobre ella. Cada persona es única y más compleja que cualquier herramienta: si algún apartado no le describe, coméntelo con alguien que le conozca bien.';
})();
