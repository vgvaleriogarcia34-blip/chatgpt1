/* Atalaya · Personas y equipos · Liderazgo a medida · Contenido
   Modelo propio de liderazgo según la tarea, inspirado en el enfoque situacional clásico:
   no hay un estilo mejor, hay un estilo que toca según lo preparada que esté cada persona para cada tarea.
   · Cuatro estilos: Marcar, Entrenar, Acompañar y Confiar.
   · Cuatro niveles de preparación por tarea: Inicial, En desarrollo, Capaz con dudas y Autónomo.
   · La preparación combina capacidad (sabe hacerlo) y disposición (quiere y se siente seguro).
   Nombres, situaciones y frases son propios de Atalaya 360°. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const L = (A.liderazgoDatos = {});

  /* ---------- Estilos: cuánta dirección y cuánto apoyo da el líder ---------- */
  L.ESTILOS = {
    1: { n: 'Marcar', c: '#e0794a', dir: 'Mucha', apoyo: 'Poco', corto: 'Digo qué, cómo y cuándo',
      que: 'El líder define el resultado, los pasos y el plazo, enseña cómo se hace y revisa de cerca. Decide el líder.',
      cuando: 'Con quien empieza en una tarea: tiene ganas, pero aún no sabe hacerla.',
      frases: ['«Lo hacemos así: primero…, después…»', '«Lo revisamos juntos el martes a las diez.»'],
      riesgo: 'Usado de más, ahoga a quien ya sabe: deja de proponer, pierde interés y depende del jefe.',
      seguimiento: 'Diario o en cada entrega', freq: 'diaria' },
    2: { n: 'Entrenar', c: '#d9b23a', dir: 'Mucha', apoyo: 'Mucho', corto: 'Explico el porqué y te escucho',
      que: 'El líder sigue marcando el camino, pero explica el porqué de cada paso, escucha, anima y reconoce los avances. Decide el líder, tras escuchar.',
      cuando: 'Con quien ya sabe algo de la tarea pero aún comete errores y se desanima.',
      frases: ['«Te cuento por qué lo hacemos así. ¿Qué ves tú?»', '«Esto ya te sale bien; vamos con lo siguiente.»'],
      riesgo: 'Usado de más, cansa: demasiadas explicaciones para quien ya sabe y solo necesita confianza.',
      seguimiento: 'Semanal, con una conversación breve', freq: 'semanal' },
    3: { n: 'Acompañar', c: '#4fa8a0', dir: 'Poca', apoyo: 'Mucho', corto: '¿Qué harías tú? Te respaldo',
      que: 'El líder pregunta en lugar de responder, escucha, refuerza la seguridad y deja que la persona decida. Decide el colaborador, con apoyo.',
      cuando: 'Con quien sabe hacer la tarea pero duda, ha tenido un tropiezo o está poco motivado.',
      frases: ['«¿Cómo lo plantearías?»', '«Tu propuesta tiene sentido. Adelante.»'],
      riesgo: 'Usado con quien empieza, le deja sin instrucciones: se pierde y se frustra.',
      seguimiento: 'Quincenal o cuando lo pida', freq: 'quincenal' },
    4: { n: 'Confiar', c: '#7c8be0', dir: 'Poca', apoyo: 'Poco', corto: 'Es tuyo; me cuentas en los hitos',
      que: 'El líder pacta el resultado, el plazo y uno o dos hitos de control, y se aparta. Decide el colaborador.',
      cuando: 'Con quien sabe hacer la tarea, quiere hacerla y se siente seguro.',
      frases: ['«El objetivo es este y la fecha, esta. Cuéntame en cada hito.»', '«¿Qué necesitas de mí?»'],
      riesgo: 'Usado con quien no está preparado, es abandono: errores, estrés y sensación de soledad.',
      seguimiento: 'Por hitos pactados o mensual', freq: 'hitos' }
  };

  /* ---------- Niveles de preparación por tarea ---------- */
  L.NIVELES = {
    1: { n: 'Inicial', corto: 'Empieza: aún no sabe hacerlo', cap: 'Baja', dis: 'Variable, a menudo con ganas', c: '#e0794a',
      lectura: 'Todavía no sabe hacer esta tarea. Necesita instrucciones claras, práctica guiada y revisiones frecuentes.' },
    2: { n: 'En desarrollo', corto: 'Sabe algo, se equivoca y se desanima', cap: 'Media', dis: 'Baja o irregular', c: '#d9b23a',
      lectura: 'Ya sabe parte de la tarea, pero comete errores y la ilusión del principio ha bajado. Necesita dirección y ánimo a la vez.' },
    3: { n: 'Capaz con dudas', corto: 'Sabe hacerlo, pero duda o está desmotivado', cap: 'Alta', dis: 'Variable', c: '#4fa8a0',
      lectura: 'Sabe hacer la tarea, pero le falta seguridad o motivación. No necesita instrucciones: necesita confianza y que se le escuche.' },
    4: { n: 'Autónomo', corto: 'Sabe, quiere y se siente seguro', cap: 'Alta', dis: 'Alta', c: '#7c8be0',
      lectura: 'Domina la tarea y la asume como propia. Necesita objetivos, margen para decidir y reconocimiento.' }
  };
  /* Cada nivel pide su estilo: Inicial → Marcar, En desarrollo → Entrenar, Capaz con dudas → Acompañar, Autónomo → Confiar */
  L.estiloPara = (nivel) => nivel;

  L.FRECUENCIAS = { diaria: 'Diaria', semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual', hitos: 'Por hitos pactados' };

  /* ---------- Test 1 · Estilo del líder (y Test 2 · estilo percibido) ----------
     12 situaciones propias; en cada una, cuatro formas de actuar, cada una de un estilo.
     «nivel» es la preparación del colaborador en esa situación (marca el estilo que toca).
     Las respuestas están en infinitivo para servir al líder («¿Qué haría usted?») y a su equipo
     («¿Qué haría su responsable?»). */
  const S = (nivel, t, ops) => ({ nivel, t, ops: ops.map(([e, txt]) => ({ e, t: txt })) });
  L.SITUACIONES = [
    S(1, 'Ha entrado una persona nueva en administración y mañana debe emitir sus primeras facturas con el programa de la empresa. Está ilusionada, pero nunca lo ha usado.', [
      [3, 'Preguntarle cómo piensa organizarse y ofrecerle ayuda si la necesita.'],
      [1, 'Explicarle paso a paso cómo se hacen, dejarle una guía y revisar las primeras antes de enviarlas.'],
      [4, 'Dejar que lo haga: si tiene dudas, ya preguntará.'],
      [2, 'Contarle por qué es tan importante facturar bien, enseñarle y preguntarle cómo lo ve.']]),
    S(4, 'La jefa de producción lleva años organizando los turnos sin incidencias. Este mes entra un pedido grande y hay que reorganizarlos.', [
      [1, 'Darle hecho el cuadro de turnos, ya pensado.'],
      [4, 'Informarle del pedido y del plazo, y pedirle que avise si necesita algo.'],
      [2, 'Explicarle cómo lo haría y pedir su opinión antes de decidir.'],
      [3, 'Sentarse con ella y ayudarle a pensar las opciones.']]),
    S(2, 'Un comercial lleva tres meses. Empezó con muchas ganas, pero ha perdido dos ofertas, se le ve desanimado y aún no domina el producto.', [
      [3, 'Escucharle y decirle que confía en él, sin entrar en cómo hace las ofertas.'],
      [4, 'Dejar que siga a su ritmo: ya le cogerá el truco.'],
      [2, 'Repasar juntos las ofertas perdidas, explicarle qué falló, enseñarle a plantearlas y animarle.'],
      [1, 'Marcarle exactamente qué clientes visitar y qué decir en cada visita.']]),
    S(3, 'Una técnica con experiencia hace bien los presupuestos complejos, pero desde que se equivocó en uno grande duda y lo consulta todo.', [
      [1, 'Revisar cada presupuesto antes de que salga.'],
      [3, 'Preguntarle qué haría ella, recordarle los aciertos que ha tenido y dejarle decidir.'],
      [2, 'Volver a explicarle el método y darle una plantilla.'],
      [4, 'Decirle que no consulte más, que ya sabe hacerlo.']]),
    S(1, 'Hay que poner en marcha una norma nueva de seguridad en el almacén. El equipo está dispuesto, pero no la conoce.', [
      [2, 'Reunir al equipo, explicar por qué hace falta y pedir ideas para aplicarla.'],
      [4, 'Enviar la norma por correo para que la apliquen.'],
      [1, 'Explicar la norma, enseñar cómo se aplica, fijar desde cuándo y comprobar que se cumple.'],
      [3, 'Pedir al equipo que decida cómo aplicarla.']]),
    S(4, 'El responsable de calidad propone cambiar un procedimiento. Conoce el tema mejor que su responsable y tiene un buen historial.', [
      [4, 'Decirle que adelante y que le informe de los resultados.'],
      [1, 'Pedirle el detalle completo y decidir sin delegar.'],
      [3, 'Hablarlo con él y ayudarle a pulir la propuesta.'],
      [2, 'Darle la propia visión, explicarle las dudas y decidir después de escucharle.']]),
    S(2, 'Una administrativa ha empezado a llevar la tesorería. Ha cometido algunos errores y está insegura, aunque quiere aprender.', [
      [2, 'Enseñarle explicando el porqué de cada paso, revisar juntos cada semana y reconocer lo que hace bien.'],
      [4, 'Dejar que lo resuelva sola, que así se aprende.'],
      [1, 'Decirle exactamente qué hacer cada día y comprobarlo.'],
      [3, 'Preguntarle qué necesita y apoyarla sin decirle cómo hacerlo.']]),
    S(3, 'Un jefe de obra muy capaz ha perdido motivación tras no conseguir un ascenso. Sigue cumpliendo, pero sin implicarse.', [
      [4, 'No intervenir: es un profesional y sabe lo que tiene que hacer.'],
      [2, 'Explicarle de nuevo los objetivos y cómo quiere que los haga.'],
      [1, 'Recordarle sus obligaciones y vigilar más su trabajo.'],
      [3, 'Hablar con él, escuchar cómo está, implicarle en las decisiones de su obra y reconocer su aportación.']]),
    S(1, 'Un aprendiz se incorpora a la línea de envasado. No tiene experiencia y no sabe por dónde empezar.', [
      [3, 'Preguntarle cómo se ve y animarle.'],
      [2, 'Explicarle la importancia de su trabajo y pedirle sugerencias.'],
      [4, 'Dejar que se integre a su ritmo.'],
      [1, 'Asignarle un compañero de referencia, darle instrucciones claras y tareas sencillas, y revisar cada día.']]),
    S(4, 'El equipo de mantenimiento funciona solo: cumple los plazos y resuelve las averías sin ayuda. Llega una máquina nueva, parecida a las que ya conocen.', [
      [2, 'Explicarles cómo quiere que se instale y escuchar sus comentarios.'],
      [3, 'Reunirse con ellos y ayudarles a planificar la instalación.'],
      [1, 'Organizar la instalación y repartir las tareas personalmente.'],
      [4, 'Encargarles la instalación con el plazo y una fecha de revisión.']]),
    S(2, 'Un encargado recién ascendido debe dirigir su primera reunión de equipo. Le hace ilusión, pero no sabe cómo hacerlo y está nervioso.', [
      [4, 'Dejar que la dirija sin intervenir.'],
      [1, 'Darle el orden del día hecho y decirle qué decir.'],
      [3, 'Decirle que lo hará bien y que estará ahí si le necesita.'],
      [2, 'Preparar juntos el orden del día, explicarle el porqué de cada punto, ensayar y darle su opinión después.']]),
    S(3, 'Una diseñadora con experiencia debe presentar un proyecto al cliente más importante. Sabe hacerlo, pero la importancia del cliente le da inseguridad.', [
      [2, 'Decirle cómo debe presentarlo, punto por punto.'],
      [1, 'Presentar el proyecto personalmente y que ella acompañe.'],
      [4, 'Decirle que vaya y que luego le cuente.'],
      [3, 'Preguntarle cómo lo ha planteado, reforzar sus puntos fuertes y ofrecerle ensayarlo si quiere.']])
  ];
  /* Puntos por respuesta según la distancia entre el estilo elegido y el que toca */
  L.PUNTOS = [3, 2, 1, 0];

  /* ---------- Test 3 · Preparación por tarea ----------
     Ocho frases (cuatro de capacidad y cuatro de disposición), de 1 (nada) a 5 (totalmente).
     Las responden el líder (sobre su colaborador) y el propio colaborador (sobre sí mismo). */
  L.PREP_ITEMS = [
    { f: 'cap', yo: 'Sé hacer esta tarea sin que nadie me diga los pasos.', el: 'Sabe hacer esta tarea sin que nadie le diga los pasos.' },
    { f: 'dis', yo: 'Tengo ganas de hacer esta tarea.', el: 'Muestra ganas de hacer esta tarea.' },
    { f: 'cap', yo: 'La he hecho bien varias veces: tengo experiencia suficiente.', el: 'La ha hecho bien varias veces: tiene experiencia suficiente.' },
    { f: 'dis', yo: 'Me siento seguro o segura haciéndola, sin necesidad de que me la confirmen.', el: 'Se siente seguro o segura haciéndola, sin necesidad de que se la confirmen.' },
    { f: 'cap', yo: 'Resuelvo por mi cuenta los imprevistos de esta tarea.', el: 'Resuelve por su cuenta los imprevistos de esta tarea.' },
    { f: 'dis', yo: 'Asumo como propio el resultado de esta tarea.', el: 'Asume como propio el resultado de esta tarea.' },
    { f: 'cap', yo: 'Lo que entrego cumple el plazo y la calidad esperados.', el: 'Lo que entrega cumple el plazo y la calidad esperados.' },
    { f: 'dis', yo: 'Mantengo el esfuerzo aunque la tarea se complique.', el: 'Mantiene el esfuerzo aunque la tarea se complique.' }
  ];
  L.PREP_ESCALA = ['Nada', 'Poco', 'A medias', 'Bastante', 'Totalmente'];

  /* ---------- Cruce con el DISC: tendencia natural de cada estilo de comportamiento ---------- */
  L.DISC_TENDENCIA = {
    D: { tiende: 1, cuesta: 3, txt: 'Con la D alta se tiende a Marcar: decidir rápido y decir cómo. Lo que más cuesta es Acompañar: preguntar, escuchar y dejar decidir.' },
    I: { tiende: 2, cuesta: 4, txt: 'Con la I alta se tiende a Entrenar: explicar, convencer y animar. Lo que más cuesta es Confiar con seguimiento por hitos, sin estar encima.' },
    S: { tiende: 3, cuesta: 1, txt: 'Con la S alta se tiende a Acompañar: apoyar y cuidar el clima. Lo que más cuesta es Marcar: dar instrucciones firmes y corregir a tiempo.' },
    C: { tiende: 4, cuesta: 2, txt: 'Con la C alta se tiende a dejar la información por escrito y Confiar en que se siga. Lo que más cuesta es Entrenar: el acompañamiento cercano, con ánimo y reconocimiento.' }
  };

  /* ---------- Tablillas de liderazgo ----------
     Por estilo (para el líder que lo usa poco) y por paso entre niveles (para la pareja líder-colaborador). */
  const T = (id, titulo, para, objetivo, pasos, duracion, senal, cuando) => ({ id, titulo, para, objetivo, pasos, duracion, senal, cuando });
  L.TABLILLAS = [
    T('l-marcar', 'Dar instrucciones que se entienden', 'Líderes a quienes les cuesta Marcar', 'Que quien empieza sepa exactamente qué hacer, cómo y para cuándo.', ['Antes de encargar, escribe en una hoja el resultado, los pasos, el plazo y cómo sabrás que está bien.', 'Explícalo en cinco minutos y pide a la persona que te lo repita con sus palabras.', 'Revisa al primer tercio de la tarea, no al final.', 'Corrige en el momento, en privado y con el dato concreto.'], '3 semanas', 'Menos errores y menos repeticiones en las personas que empiezan.', { lid: 1 }),
    T('l-entrenar', 'Enseñar explicando el porqué', 'Líderes a quienes les cuesta Entrenar', 'Que quien está aprendiendo avance sin desanimarse.', ['Muestra cómo se hace y explica para qué sirve cada paso.', 'Deja que lo haga delante de ti y comenta solo dos cosas: una que ha salido bien y una que mejorar.', 'Reserva quince minutos a la semana para sus dudas.', 'Reconoce un avance concreto cada semana, en voz alta.'], '1 mes', 'La persona pregunta menos lo mismo y se le ve con más ánimo.', { lid: 2 }),
    T('l-acompanar', 'Preguntar en lugar de responder', 'Líderes a quienes les cuesta Acompañar', 'Que quien ya sabe recupere la seguridad y decida por sí mismo.', ['Cuando te consulten, pregunta primero: «¿Qué harías tú?».', 'Si la propuesta es razonable, apruébala aunque tú lo harías de otra forma.', 'Reconoce en público las decisiones acertadas.', 'Cuenta un error tuyo y cómo lo resolviste, para quitar el miedo a equivocarse.'], '4 semanas', 'Te traen propuestas en lugar de preguntas.', { lid: 3 }),
    T('l-confiar', 'Delegar con hitos', 'Líderes a quienes les cuesta Confiar', 'Soltar las tareas de quien está preparado sin perder el control del resultado.', ['Pacta por escrito el resultado, el plazo y uno o dos hitos de control.', 'No intervengas entre hitos salvo que te lo pidan.', 'En cada hito, pide un informe breve: qué está hecho, qué falta y qué riesgo ve.', 'Cuando cumpla, amplía su margen de decisión en la siguiente tarea.'], '2 meses', 'Las tareas delegadas se cierran en plazo sin que tengas que rehacerlas.', { lid: 4 }),
    T('l-flexibilidad', 'Un estilo para cada tarea', 'Líderes con poca flexibilidad de estilo', 'Dejar de liderar a todos igual y ajustar el estilo a cada persona y tarea.', ['Haz la lista de tus colaboradores y de sus dos tareas principales.', 'Marca el nivel de preparación de cada uno en cada tarea (usa el mapa de mando).', 'Antes de cada encargo, pregúntate: «¿Qué estilo toca aquí?».', 'Una vez al mes, revisa el mapa y anota qué nivel ha subido.'], '2 meses', 'El mapa de mando tiene menos desajustes en cada revisión.', { lid: 'flex' }),
    T('l-contraste', 'Contrastar cómo me ve mi equipo', 'Líderes cuyo estilo propio y percibido no coinciden', 'Cerrar la distancia entre cómo cree que lidera y cómo le vive su equipo.', ['Comparte con tu equipo el resultado del test percibido, sin justificarte.', 'Pide a cada persona un ejemplo concreto de una situación reciente.', 'Elige un comportamiento que vas a cambiar y dilo en voz alta.', 'Repite el test percibido a los tres meses.'], '3 meses', 'El estilo percibido se acerca al que cree usar.', { lid: 'contraste' }),
    T('p-12', 'De Inicial a En desarrollo', 'La pareja líder-colaborador en una tarea nueva', 'Que la persona pase de no saber a saber lo básico de la tarea.', ['Divide la tarea en partes pequeñas y enseña una cada vez.', 'Haz que la practique delante de ti con casos reales y sencillos.', 'Revisa cada entrega hasta que tres seguidas salgan bien.', 'Celebra el primer resultado completo.'], '2 a 6 semanas', 'Hace la parte básica sin ayuda.', { paso: 1 }),
    T('p-23', 'De En desarrollo a Capaz con dudas', 'La pareja líder-colaborador cuando hay errores y desánimo', 'Que la persona domine la tarea y recupere la ilusión.', ['Sube la dificultad poco a poco, con casos reales cada vez más complejos.', 'Una conversación semanal: qué ha salido bien, qué mejorar y por qué.', 'Después de un error, separa el error de la persona y busca juntos la causa.', 'Que prepare su propia lista de comprobación de la tarea.'], '1 a 3 meses', 'Se equivoca menos y ya no pide que le digan cada paso.', { paso: 2 }),
    T('p-34', 'De Capaz con dudas a Autónomo', 'La pareja líder-colaborador cuando ya sabe pero duda', 'Que la persona confíe en su criterio y asuma la tarea como propia.', ['Cede las decisiones de la tarea una a una, empezando por la más sencilla.', 'Cuando dude, recuérdale un acierto concreto suyo.', 'Pídele que proponga una mejora de la tarea y apruébala.', 'Retira la revisión previa: solo revisión al final o por hitos.'], '1 a 2 meses', 'Te informa de lo decidido en lugar de pedir permiso.', { paso: 3 }),
    T('p-4', 'Mantener la autonomía', 'La pareja líder-colaborador cuando la persona ya es autónoma', 'Que siga creciendo y no se aburra ni se vaya.', ['Ofrece un reto nuevo o una tarea de más alcance.', 'Que enseñe la tarea a otra persona del equipo.', 'Reconoce los resultados en público y con datos.', 'Revisión por hitos; pregunta qué necesita de ti, no cómo va.'], 'Continuo', 'Propone mejoras y forma a otros.', { paso: 4 })
  ];

  L.AVISO = 'Herramienta orientativa para conversar sobre cómo se dirige cada tarea. No mide el valor de nadie ni sirve para evaluar el desempeño. El nivel de preparación es de una tarea, no de la persona: alguien puede ser autónomo en una tarea e inicial en otra.';
})();
