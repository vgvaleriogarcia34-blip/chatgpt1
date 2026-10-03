/* Atalaya · Personas y equipos · Contenido
   Cuestionarios propios, orientativos, inspirados en tres modelos clásicos de recursos humanos:
   · DISC (estilo de comportamiento: Dominancia, Influencia, Estabilidad, Cumplimiento).
   · Mapa de aportaciones al equipo (nueve aportaciones). Modelo y cuestionario propios.
   · Eneagrama (nueve tipos de motivación).
   Son herramientas para conocerse y trabajar mejor juntos, no diagnósticos. Los textos y las preguntas son propios. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const H = (A.personasDatos = {});

  /* ---------- DISC ---------- */
  H.DISC = {
    D: { n: 'Dominancia', c: '#e04848', corto: 'Decide y empuja',
      resumen: 'Orientada a resultados y a superar retos. Decide rápido, va al grano y asume el mando cuando hace falta.',
      aporta: ['Rapidez para decidir', 'Empuje ante los obstáculos', 'Asumir responsabilidades difíciles'],
      necesita: ['Retos y autonomía', 'Objetivos claros y medibles', 'Que se le hable directo'],
      presion: 'Bajo presión se vuelve impaciente y autoritaria; puede atropellar y dejar de escuchar.',
      comunicar: 'Ve al grano: el objetivo, las opciones y lo que necesitas de ella. Evita los rodeos y los detalles innecesarios.',
      evitar: 'Microgestionarla, quitarle el control sin explicación o hacerle perder tiempo.',
      entorno: 'Proyectos con meta clara, margen para decidir y resultados visibles.' },
    I: { n: 'Influencia', c: '#fab219', corto: 'Conecta y entusiasma',
      resumen: 'Sociable, optimista y persuasiva. Genera relaciones, contagia entusiasmo y convence.',
      aporta: ['Crear clima y relaciones', 'Vender ideas y proyectos', 'Motivar a otros'],
      necesita: ['Reconocimiento', 'Contacto con personas', 'Variedad y libertad para expresarse'],
      presion: 'Bajo presión se dispersa, promete de más y evita los detalles incómodos.',
      comunicar: 'Con calidez y en positivo; deja espacio para que opine y concreta por escrito los compromisos.',
      evitar: 'Aislarla, la rutina sin contacto o las críticas en público.',
      entorno: 'Trabajo con gente, cambio y visibilidad.' },
    S: { n: 'Estabilidad', c: '#2fb24a', corto: 'Sostiene y coopera',
      resumen: 'Paciente, constante y leal. Escucha, coopera y da estabilidad al equipo.',
      aporta: ['Constancia y fiabilidad', 'Escucha y apoyo a los demás', 'Mantener la calma'],
      necesita: ['Seguridad y previsibilidad', 'Tiempo para adaptarse a los cambios', 'Sentirse parte del equipo'],
      presion: 'Bajo presión cede para evitar el conflicto, se calla lo que piensa y se resiste al cambio en silencio.',
      comunicar: 'Con calma, explicando el porqué y los pasos; pregúntale su opinión directamente.',
      evitar: 'Los cambios bruscos sin explicación y la presión constante.',
      entorno: 'Equipo estable, procesos claros y relaciones de confianza.' },
    C: { n: 'Cumplimiento', c: '#3987e5', corto: 'Analiza y asegura',
      resumen: 'Analítica, precisa y rigurosa. Busca la calidad, los datos y hacer las cosas bien.',
      aporta: ['Calidad y precisión', 'Análisis riguroso', 'Detectar errores y riesgos'],
      necesita: ['Información y criterios claros', 'Tiempo para hacerlo bien', 'Normas y estándares'],
      presion: 'Bajo presión se vuelve crítica, se aísla y retrasa decisiones buscando más información.',
      comunicar: 'Con datos, por escrito y con tiempo para revisar; concreta criterios y plazos.',
      evitar: 'Las prisas sin motivo, los cambios de criterio y las generalizaciones sin pruebas.',
      entorno: 'Tareas con estándares claros, especialización y calidad.' }
  };
  // Doce bloques de cuatro palabras: en cada uno se elige la que más y la que menos se parece a la persona
  H.DISC_BLOQUES = [
    { D: 'Decidido', I: 'Sociable', S: 'Paciente', C: 'Preciso' },
    { D: 'Directo', I: 'Entusiasta', S: 'Leal', C: 'Metódico' },
    { D: 'Competitivo', I: 'Persuasivo', S: 'Tranquilo', C: 'Riguroso' },
    { D: 'Atrevido', I: 'Optimista', S: 'Constante', C: 'Analítico' },
    { D: 'Exigente', I: 'Expresivo', S: 'Cooperador', C: 'Cuidadoso' },
    { D: 'Resolutivo', I: 'Inspirador', S: 'Comprensivo', C: 'Ordenado' },
    { D: 'Firme', I: 'Espontáneo', S: 'Servicial', C: 'Prudente' },
    { D: 'Ambicioso', I: 'Hablador', S: 'Estable', C: 'Perfeccionista' },
    { D: 'Independiente', I: 'Carismático', S: 'Sereno', C: 'Sistemático' },
    { D: 'Enérgico', I: 'Alegre', S: 'Conciliador', C: 'Exacto' },
    { D: 'Retador', I: 'Popular', S: 'Fiable', C: 'Lógico' },
    { D: 'Orientado a resultados', I: 'Comunicativo', S: 'Buen oyente', C: 'Reflexivo' }
  ];

  /* ---------- Mapa de aportaciones al equipo (nombres y cuestionario propios) ---------- */
  H.ROLES = {
    cerebro: { n: 'Inventor', g: 'Mental', aporta: 'Ideas originales y soluciones creativas a problemas difíciles.', debilidad: 'Se despista de los detalles prácticos y comunica a medias.', falta: 'El equipo repite lo de siempre y se atasca ante problemas nuevos.' },
    investigador: { n: 'Explorador', g: 'Social', aporta: 'Contactos, oportunidades e información de fuera del equipo.', debilidad: 'Pierde interés cuando pasa el entusiasmo inicial.', falta: 'El equipo vive hacia dentro: no ve oportunidades ni se entera de lo que pasa fuera.' },
    coordinador: { n: 'Orquestador', g: 'Social', aporta: 'Aclara objetivos, reparte el trabajo según los talentos y hace que todos participen.', debilidad: 'Puede delegar de más, incluso su propio trabajo.', falta: 'Nadie ordena: se duplican tareas y las reuniones no acaban en decisiones.' },
    impulsor: { n: 'Motor', g: 'Acción', aporta: 'Empuje, energía para superar obstáculos y orientación al resultado.', debilidad: 'Puede provocar tensiones y herir sensibilidades.', falta: 'Las cosas se hablan mucho y se hacen tarde.' },
    monitor: { n: 'Analista', g: 'Mental', aporta: 'Análisis frío de las opciones y juicio para decidir bien.', debilidad: 'Le falta capacidad de inspirar; puede parecer crítico.', falta: 'Se aprueban planes sin pensar sus riesgos.' },
    cohesionador: { n: 'Conciliador', g: 'Social', aporta: 'Clima, escucha y capacidad de evitar y suavizar conflictos.', debilidad: 'Le cuesta decidir en situaciones tensas.', falta: 'Los roces crecen sin que nadie los atienda y el clima se deteriora.' },
    implementador: { n: 'Constructor', g: 'Acción', aporta: 'Convierte las ideas en planes y tareas; disciplina y fiabilidad.', debilidad: 'Le cuesta cambiar de plan y aceptar ideas nuevas.', falta: 'Hay buenas ideas que nunca se aterrizan en tareas concretas.' },
    finalizador: { n: 'Garante', g: 'Acción', aporta: 'Detecta errores, cuida los detalles y cumple los plazos.', debilidad: 'Se preocupa en exceso y le cuesta delegar.', falta: 'Los trabajos se entregan con errores o fuera de plazo.' },
    especialista: { n: 'Experto', g: 'Mental', aporta: 'Conocimiento técnico escaso y profundo en su materia.', debilidad: 'Contribuye solo en su campo y se pierde en tecnicismos.', falta: 'El equipo depende de fuera para lo técnico o decide sin saber.' }
  };
  const R = (rol, t) => ({ rol, t });
  H.ROLES_ITEMS = [
    R('cerebro', 'Se me ocurren ideas originales cuando el equipo se atasca.'),
    R('investigador', 'Me resulta fácil encontrar contactos, proveedores o información fuera del equipo.'),
    R('coordinador', 'Suelo aclarar los objetivos y repartir el trabajo según lo que mejor hace cada uno.'),
    R('impulsor', 'Me crezco ante la presión y empujo al equipo hacia el resultado.'),
    R('monitor', 'Antes de decidir, analizo con frialdad los pros y los contras.'),
    R('cohesionador', 'Me doy cuenta de cómo se siente cada persona del equipo.'),
    R('implementador', 'Convierto las ideas en planes concretos y en tareas.'),
    R('finalizador', 'Reviso los detalles para que no se escape ningún error.'),
    R('especialista', 'Aporto un conocimiento técnico que pocos tienen en el equipo.'),
    R('cerebro', 'Prefiero resolver los problemas de forma creativa a seguir el procedimiento de siempre.'),
    R('investigador', 'Me entusiasman los proyectos nuevos y las oportunidades.'),
    R('coordinador', 'En las reuniones procuro que todos opinen antes de decidir.'),
    R('impulsor', 'Si algo frena el avance, lo digo claramente aunque incomode.'),
    R('monitor', 'Detecto los fallos de un plan que otros no ven.'),
    R('cohesionador', 'Suavizo los conflictos y busco el acuerdo.'),
    R('implementador', 'Soy disciplinado y cumplo lo que se acuerda.'),
    R('finalizador', 'Me preocupa mucho cumplir los plazos.'),
    R('especialista', 'Disfruto profundizando en mi área hasta dominarla.'),
    R('cerebro', 'A veces me cuesta bajar mis ideas a los detalles prácticos.'),
    R('investigador', 'Pierdo interés cuando pasa el entusiasmo inicial de un proyecto.'),
    R('coordinador', 'Delego con facilidad y confío en el criterio de los demás.'),
    R('impulsor', 'Me impaciento cuando las cosas van despacio.'),
    R('monitor', 'Prefiero acertar a ir rápido.'),
    R('cohesionador', 'Me cuesta tomar decisiones que incomoden a alguien.'),
    R('implementador', 'Me cuesta adaptarme cuando cambian los planes sobre la marcha.'),
    R('finalizador', 'Me cuesta delegar lo que creo que otros no harán bien.'),
    R('especialista', 'Me interesa poco lo que queda fuera de mi especialidad.')
  ];

  /* ---------- Eneagrama ---------- */
  H.ENEA = {
    1: { n: 'Perfeccionista', centro: 'Instintivo', motivacion: 'Hacer las cosas bien y mejorar lo que le rodea.', miedo: 'Equivocarse o ser criticado por hacer algo mal.', fortaleza: 'Rigor, ética, orden y mejora continua.', estres: 4, crece: 7, liderar: 'Dale criterios claros, reconoce la calidad de su trabajo y ayúdale a priorizar: no todo merece la misma perfección.', riesgo: 'Rigidez, autoexigencia excesiva y crítica a los demás.' },
    2: { n: 'Ayudador', centro: 'Emocional', motivacion: 'Sentirse necesario y apreciado por lo que aporta a los demás.', miedo: 'No ser querido o no ser útil.', fortaleza: 'Servicio, empatía y capacidad de crear relaciones.', estres: 8, crece: 4, liderar: 'Reconoce su ayuda de forma explícita y enséñale a pedir y a poner límites.', riesgo: 'Descuidar sus propias tareas y necesidades por atender las de otros.' },
    3: { n: 'Triunfador', centro: 'Emocional', motivacion: 'Lograr objetivos y ser reconocido por ello.', miedo: 'Fracasar o no valer.', fortaleza: 'Orientación a resultados, eficacia y capacidad de adaptación.', estres: 9, crece: 6, liderar: 'Objetivos ambiciosos y visibles; cuida que no sacrifique el equipo o la calidad por la imagen.', riesgo: 'Priorizar la apariencia de éxito y quemarse por no parar.' },
    4: { n: 'Individualista', centro: 'Emocional', motivacion: 'Expresar su identidad y aportar algo con sentido y sello propio.', miedo: 'No tener identidad propia o ser uno más.', fortaleza: 'Creatividad, sensibilidad y autenticidad.', estres: 2, crece: 1, liderar: 'Dale proyectos con sentido y margen creativo; acompaña los altibajos con estructura y plazos.', riesgo: 'Altibajos de ánimo y sensación de no ser comprendido.' },
    5: { n: 'Investigador', centro: 'Mental', motivacion: 'Entender a fondo y ser competente.', miedo: 'Ser incapaz o verse desbordado.', fortaleza: 'Análisis profundo, objetividad y conocimiento.', estres: 7, crece: 8, liderar: 'Dale tiempo para pensar, información por adelantado y espacio propio; pídele que comparta lo que sabe.', riesgo: 'Aislarse y quedarse en el análisis sin pasar a la acción.' },
    6: { n: 'Leal', centro: 'Mental', motivacion: 'Sentirse seguro y respaldado por el grupo.', miedo: 'Quedarse sin apoyo o sin guía.', fortaleza: 'Compromiso, previsión de riesgos y lealtad al equipo.', estres: 3, crece: 9, liderar: 'Sé coherente y transparente, explica los riesgos que ya se han previsto y refuerza su criterio.', riesgo: 'Duda, desconfianza y ansiedad ante lo incierto.' },
    7: { n: 'Entusiasta', centro: 'Mental', motivacion: 'Vivir experiencias nuevas y mantener las opciones abiertas.', miedo: 'Quedarse atrapado en el dolor o el aburrimiento.', fortaleza: 'Optimismo, energía, ideas y versatilidad.', estres: 1, crece: 5, liderar: 'Variedad y proyectos estimulantes, con hitos cortos que le ayuden a terminar lo que empieza.', riesgo: 'Dispersión, dejar cosas a medias y evitar lo desagradable.' },
    8: { n: 'Desafiador', centro: 'Instintivo', motivacion: 'Tener el control de su vida y proteger a los suyos.', miedo: 'Ser controlado o dañado por otros.', fortaleza: 'Liderazgo, decisión, protección y franqueza.', estres: 5, crece: 2, liderar: 'Sé directo y honesto, dale responsabilidad real y pactad límites claros.', riesgo: 'Imponerse, intimidar y confundir firmeza con dureza.' },
    9: { n: 'Pacificador', centro: 'Instintivo', motivacion: 'Mantener la armonía y la paz interior y exterior.', miedo: 'El conflicto y la separación.', fortaleza: 'Mediación, escucha, calma y capacidad de integrar puntos de vista.', estres: 6, crece: 3, liderar: 'Ayúdale a priorizar y a expresar su opinión; ponle plazos y valora su aportación.', riesgo: 'Aplazar lo importante y diluir su propia opinión para evitar roces.' }
  };
  const E = (tipo, t) => ({ tipo, t });
  H.ENEA_ITEMS = [
    E(1, 'Me exijo hacer las cosas bien y de forma correcta.'), E(2, 'Me sale de forma natural ayudar a los demás.'), E(3, 'Me motivan los objetivos y el reconocimiento por lograrlos.'),
    E(4, 'Necesito que mi trabajo tenga un sello personal.'), E(5, 'Necesito entender algo a fondo antes de actuar.'), E(6, 'Anticipo lo que puede salir mal y me preparo.'),
    E(7, 'Me atraen las experiencias y las posibilidades nuevas.'), E(8, 'Tomo el control cuando hace falta.'), E(9, 'Busco la armonía y evito los conflictos.'),
    E(1, 'Noto enseguida lo que está mal o se podría mejorar.'), E(2, 'Me importa sentirme apreciado por lo que aporto.'), E(3, 'Me adapto a lo que se espera de mí para tener éxito.'),
    E(4, 'Vivo las emociones con mucha intensidad.'), E(5, 'Valoro mucho mi espacio y mi tiempo a solas.'), E(6, 'Valoro la lealtad y la seguridad del grupo.'),
    E(7, 'Mantengo el optimismo incluso en momentos difíciles.'), E(8, 'Digo las cosas sin rodeos.'), E(9, 'Me adapto con facilidad a lo que quieren los demás.'),
    E(1, 'Me cuesta relajarme si algo queda imperfecto.'), E(2, 'A veces descuido lo mío por atender lo de otros.'), E(3, 'Me cuesta parar: siempre hay otro reto.'),
    E(4, 'A menudo me siento diferente a los demás.'), E(5, 'Prefiero observar a implicarme emocionalmente.'), E(6, 'Dudo de las decisiones hasta tener garantías.'),
    E(7, 'Me aburre la rutina y me cuesta terminar lo que empiezo.'), E(8, 'Protejo a los míos y no tolero las injusticias.'), E(9, 'A veces aplazo lo importante para mantener la calma.')
  ];

  /* ---------- Plantillas de puesto: perfil de comportamiento y roles que suele pedir ---------- */
  H.PUESTOS_TIPO = {
    direccion: { n: 'Dirección general o gerencia', disc: { D: 75, I: 60, S: 35, C: 50 }, roles: ['coordinador', 'impulsor', 'monitor'] },
    comercial: { n: 'Comercial o ventas', disc: { D: 60, I: 80, S: 35, C: 35 }, roles: ['investigador', 'impulsor'] },
    administracion: { n: 'Administración y finanzas', disc: { D: 35, I: 30, S: 60, C: 80 }, roles: ['finalizador', 'monitor', 'implementador'] },
    produccion: { n: 'Producción u operaciones', disc: { D: 40, I: 30, S: 75, C: 60 }, roles: ['implementador', 'finalizador'] },
    tecnico: { n: 'Técnico o ingeniería', disc: { D: 40, I: 30, S: 50, C: 80 }, roles: ['especialista', 'monitor', 'cerebro'] },
    cliente: { n: 'Atención al cliente', disc: { D: 30, I: 65, S: 75, C: 50 }, roles: ['cohesionador', 'implementador'] },
    mando: { n: 'Mando intermedio o encargado', disc: { D: 60, I: 55, S: 55, C: 55 }, roles: ['coordinador', 'implementador', 'cohesionador'] },
    calidad: { n: 'Calidad o compras', disc: { D: 40, I: 35, S: 55, C: 80 }, roles: ['finalizador', 'monitor'] },
    marketing: { n: 'Marketing o diseño', disc: { D: 45, I: 70, S: 40, C: 50 }, roles: ['cerebro', 'investigador'] }
  };

  /* ---------- Tablillas de entrenamiento ----------
     Fichas breves para entrenar un comportamiento concreto. Se proponen solas según el perfil de cada persona,
     lo que pide su puesto y lo que le falta al equipo. */
  const T = (id, titulo, para, objetivo, pasos, duracion, senal, cuando) => ({ id, titulo, para, objetivo, pasos, duracion, senal, cuando });
  H.TABLILLAS = [
    T('d-escuchar', 'Escuchar antes de decidir', 'Perfiles con la D alta', 'Tomar decisiones igual de rápidas pero con la información del equipo.', ['En las tres próximas reuniones, habla el último.', 'Antes de proponer, resume en una frase lo que han dicho los demás.', 'Pregunta siempre: «¿Qué se me está escapando?».'], '3 semanas', 'El equipo aporta más y discute menos tus decisiones.', { disc: 'D' }),
    T('d-delegar', 'Delegar el qué, no el cómo', 'Perfiles con la D alta', 'Liberar tiempo y hacer crecer al equipo.', ['Elige dos tareas que hoy haces tú.', 'Explica el resultado esperado y la fecha, no el método.', 'Pacta un único punto de revisión y no intervengas antes.'], '1 mes', 'Las tareas delegadas se cierran sin que tengas que rehacerlas.', { disc: 'D' }),
    T('i-cerrar', 'Cerrar lo que se abre', 'Perfiles con la I alta', 'Convertir el entusiasmo en compromisos cumplidos.', ['Al final de cada reunión, apunta tus compromisos con fecha.', 'No abras más de tres asuntos nuevos a la vez.', 'Cada viernes, revisa la lista y cierra o renegocia.'], '4 semanas', 'Menos asuntos a medias y más entregas en fecha.', { disc: 'I' }),
    T('i-datos', 'Datos antes que entusiasmo', 'Perfiles con la I alta', 'Que sus propuestas convenzan también a los perfiles analíticos.', ['Antes de presentar una idea, busca tres cifras que la sostengan.', 'Prepara la principal objeción y su respuesta.', 'Presenta en cinco minutos: problema, cifra, propuesta, siguiente paso.'], '3 propuestas', 'Las propuestas se aprueban a la primera con más frecuencia.', { disc: 'I' }),
    T('s-decir', 'Decir lo que piensas', 'Perfiles con la S alta', 'Expresar desacuerdos y necesidades sin miedo al conflicto.', ['Una vez por semana, di en una reunión algo con lo que no estás de acuerdo.', 'Usa la fórmula: «Veo que… Me preocupa… Propongo…».', 'Pide ayuda al menos una vez cuando vayas sobrecargado.'], '4 semanas', 'Los demás conocen tu opinión antes de que el problema crezca.', { disc: 'S' }),
    T('s-cambio', 'Entrenar el cambio', 'Perfiles con la S alta', 'Vivir los cambios con menos tensión.', ['Ante un cambio, escribe: qué se mantiene, qué cambia y cuál es tu primer paso.', 'Propón tú un cambio pequeño en tu forma de trabajar cada mes.', 'Habla con quien decide el cambio para entender el porqué.'], '2 meses', 'Te adaptas antes y con menos desgaste.', { disc: 'S' }),
    T('c-suficiente', 'Suficientemente bueno', 'Perfiles con la C alta', 'Entregar a tiempo sin renunciar a la calidad que importa.', ['Antes de empezar, define qué es «terminado» con quien lo pide.', 'Entrega un borrador al 80 % para recibir comentarios pronto.', 'Reserva la perfección para lo que tiene impacto real.'], '3 entregas', 'Cumples plazos sin repetir trabajo.', { disc: 'C' }),
    T('c-decidir', 'Decidir con información incompleta', 'Perfiles con la C alta', 'Ganar velocidad en las decisiones reversibles.', ['Clasifica cada decisión: ¿se puede deshacer?', 'Si se puede, decide con el 70 % de la información.', 'Ponte una fecha límite para decidir y cúmplela.'], '1 mes', 'Las decisiones pequeñas ya no se quedan esperando.', { disc: 'C' }),
    T('r-cerebro', 'Sesión de ideas sin juicio', 'Quien deba cubrir la aportación de Inventor', 'Generar soluciones nuevas a un problema atascado.', ['Plantea el problema en una frase.', 'Quince minutos: diez ideas por persona, sin criticar ninguna.', 'Combina las tres mejores y elige una para probar.'], '1 sesión al mes', 'Aparecen soluciones que antes no se habían planteado.', { rol: 'cerebro' }),
    T('r-investigador', 'Mirar fuera', 'Quien deba cubrir la aportación de Explorador', 'Traer oportunidades e información del exterior.', ['Cada semana, habla con dos personas de fuera relacionadas con un reto del equipo.', 'Comparte en la reunión lo que has aprendido.', 'Mantén una lista de contactos útiles para el equipo.'], '1 mes', 'El equipo descubre opciones que no conocía.', { rol: 'investigador' }),
    T('r-coordinador', 'Reuniones con reparto claro', 'Quien deba cubrir la aportación de Orquestador', 'Que cada reunión acabe en decisiones y responsables.', ['Abre con el objetivo de la reunión.', 'Da la palabra a quien menos ha hablado.', 'Cierra con «qué, quién y para cuándo» por escrito.'], '4 reuniones', 'Desaparecen las reuniones que no deciden nada.', { rol: 'coordinador' }),
    T('r-impulsor', 'Del acuerdo a la acción en 48 horas', 'Quien deba cubrir la aportación de Motor', 'Acelerar el paso de las ideas a los hechos.', ['Tras cada acuerdo, define el primer paso que se puede dar en 48 horas.', 'Hazlo o asegúrate de que alguien lo haga.', 'Señala en voz alta lo que lleva más de dos semanas parado.'], '1 mes', 'Los acuerdos empiezan a moverse en días, no en semanas.', { rol: 'impulsor' }),
    T('r-monitor', 'Abogado del diablo con método', 'Quien deba cubrir la aportación de Analista', 'Decidir sabiendo los riesgos.', ['Antes de aprobar un plan, escribe tres riesgos y su probabilidad.', 'Compara al menos dos alternativas con los mismos criterios.', 'Propón cómo reducir el riesgo mayor, no solo señalarlo.'], '3 decisiones', 'Menos sorpresas después de decidir.', { rol: 'monitor' }),
    T('r-cohesionador', 'Ronda de cómo estamos', 'Quien deba cubrir la aportación de Conciliador', 'Detectar los roces antes de que crezcan.', ['Abre la reunión semanal con una ronda breve: «¿Cómo llegas esta semana?».', 'Si notas tensión entre dos personas, propón hablarlo en privado.', 'Reconoce en público una aportación de alguien cada semana.'], '1 mes', 'Mejor clima y conflictos que se hablan antes.', { rol: 'cohesionador' }),
    T('r-implementador', 'Del plan a las tareas', 'Quien deba cubrir la aportación de Constructor', 'Aterrizar las ideas en trabajo concreto.', ['Toma un objetivo del equipo y desglósalo en tareas de menos de un día.', 'Asigna cada tarea a una persona y una fecha.', 'Revisa el avance en cinco minutos al día.'], '1 proyecto', 'Los proyectos avanzan a ritmo constante.', { rol: 'implementador' }),
    T('r-finalizador', 'Lista de comprobación final', 'Quien deba cubrir la aportación de Garante', 'Entregar sin errores y en plazo.', ['Crea una lista de comprobación para los trabajos que más se repiten.', 'Revisa cada entrega con la lista antes de darla por terminada.', 'Marca en el calendario las fechas límite con tres días de margen.'], '1 mes', 'Bajan los errores y las devoluciones.', { rol: 'finalizador' }),
    T('r-especialista', 'Compartir lo que sé', 'Quien deba cubrir la aportación de Experto', 'Que el conocimiento técnico no dependa de una sola persona.', ['Elige un tema de tu especialidad que el equipo necesite.', 'Prepara una píldora de quince minutos con un ejemplo real.', 'Escribe una guía de una página para consultar después.'], '1 al mes', 'Otros resuelven solos lo que antes te preguntaban.', { rol: 'especialista' }),
    T('e-1', 'Priorizar la perfección', 'Eneatipo 1 · Perfeccionista', 'Reservar la exigencia para lo importante y disfrutar más del trabajo.', ['Clasifica tus tareas en «crítico» y «suficiente».', 'En lo suficiente, entrega a la primera revisión.', 'Cada semana, anota algo que salió bien aunque no fuera perfecto.'], '1 mes', 'Menos tensión y más tiempo para lo que importa.', { enea: 1 }),
    T('e-2', 'Pedir y poner límites', 'Eneatipo 2 · Ayudador', 'Cuidar de sí mismo sin dejar de ayudar.', ['Antes de decir sí a una petición, pregúntate si cabe en tu semana.', 'Pide ayuda una vez por semana.', 'Bloquea en tu agenda tiempo para tus propias tareas.'], '1 mes', 'Tus tareas ya no se retrasan por las de otros.', { enea: 2 }),
    T('e-3', 'Éxito sostenible', 'Eneatipo 3 · Triunfador', 'Lograr resultados sin quemarse ni quemar al equipo.', ['Fija un objetivo de equipo, no solo personal.', 'Programa pausas reales en la semana.', 'Pide a alguien de confianza su opinión sincera sobre tu forma de trabajar.'], '2 meses', 'Resultados igual de buenos con menos desgaste.', { enea: 3 }),
    T('e-4', 'Estructura para la creatividad', 'Eneatipo 4 · Individualista', 'Convertir la sensibilidad en aportaciones constantes.', ['Divide cada proyecto en entregas pequeñas con fecha.', 'Busca el sentido de cada tarea antes de empezarla.', 'Comparte tus ideas pronto, aunque no estén terminadas.'], '1 proyecto', 'Más constancia sin perder el sello propio.', { enea: 4 }),
    T('e-5', 'Del análisis a la acción', 'Eneatipo 5 · Investigador', 'Compartir el conocimiento y actuar antes.', ['Pon fecha límite al análisis.', 'Comparte tus conclusiones en la reunión aunque no sean definitivas.', 'Implícate en una tarea que te exija tratar con personas.'], '1 mes', 'Tu conocimiento llega al equipo a tiempo.', { enea: 5 }),
    T('e-6', 'Confianza en el propio criterio', 'Eneatipo 6 · Leal', 'Decidir con menos dudas.', ['Escribe los riesgos que te preocupan y qué harías si pasan.', 'Toma una decisión al día sin consultarla.', 'Repasa al mes cuántas de tus preocupaciones se cumplieron.'], '1 mes', 'Decides antes y con menos ansiedad.', { enea: 6 }),
    T('e-7', 'Terminar lo que empiezo', 'Eneatipo 7 · Entusiasta', 'Llevar las ideas hasta el final.', ['No empieces un proyecto nuevo sin cerrar uno abierto.', 'Divide lo largo en etapas cortas con su recompensa.', 'Quédate con la parte aburrida de una tarea hasta el final una vez por semana.'], '1 mes', 'Más proyectos terminados.', { enea: 7 }),
    T('e-8', 'Fuerza con cuidado', 'Eneatipo 8 · Desafiador', 'Liderar sin intimidar.', ['Antes de imponer una decisión, pregunta la opinión de dos personas.', 'Reconoce en público el trabajo de alguien cada semana.', 'Muestra una vez tu duda o tu error ante el equipo.'], '1 mes', 'El equipo se atreve a llevarte la contraria cuando hace falta.', { enea: 8 }),
    T('e-9', 'Mi opinión cuenta', 'Eneatipo 9 · Pacificador', 'Priorizar y expresar su punto de vista.', ['Cada mañana, elige la tarea más importante y hazla primero.', 'En cada reunión, da tu opinión antes de que se decida.', 'Pon fecha a lo que llevas tiempo aplazando.'], '1 mes', 'Lo importante ya no se queda para mañana.', { enea: 9 }),
    T('q-acuerdo', 'Acuerdo de equipo', 'Equipos con roces o estilos muy distintos', 'Pactar cómo se trabaja juntos.', ['Cada persona explica cómo prefiere que le pidan las cosas (con su estilo DISC).', 'Acordad cinco normas: reuniones, mensajes, desacuerdos, plazos y ayuda.', 'Revisadlas al mes.'], '1 sesión y 1 revisión', 'Menos malentendidos y conflictos.', { equipo: 'roces' }),
    T('q-revision', 'Revisión después de la acción', 'Todos los equipos', 'Aprender de cada proyecto.', ['Al cerrar un proyecto, treinta minutos con cuatro preguntas: qué esperábamos, qué pasó, por qué, qué haremos distinto.', 'Sin buscar culpables.', 'Una mejora concreta con responsable.'], 'Tras cada proyecto', 'Los mismos errores dejan de repetirse.', { equipo: 'todos' })
  ];

  H.AVISO = 'Herramientas orientativas para conocerse y trabajar mejor. No son diagnósticos ni pruebas clínicas, y no deben ser el único criterio para contratar, promocionar o despedir a nadie. Pide el consentimiento de cada persona, explícale para qué se usan sus resultados y que puede verlos y pedir que se borren (protección de datos).';
})();
