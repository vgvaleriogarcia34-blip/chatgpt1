/* Atalaya · Catálogo de mundos, áreas y módulos
   Un solo índice estático de toda la aplicación, con los nombres que se ven en pantalla y el enlace de cada módulo
   (página#módulo). Lo usan el archivador (js/archivador.js) para listar las áreas de los otros mundos y el buscador
   común (js/buscador.js). Las claves de mundo son las de Atalaya.platform.MUNDOS; el nombre y el color salen de allí.
   Niveles en pantalla: Mundo → Área (o fase, si el mundo es secuencial) → Módulo → Vista.
   Si cambia un módulo en su página, hay que cambiarlo aquí: la prueba del archivador compara este catálogo
   con los módulos reales del sistema estratégico y comprueba que cada enlace abre su módulo. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  // [clave, nombre en pantalla, pregunta que responde (opcional)]
  const M = {
    sim: { href: 'app.html', secuencial: true, areas: [
      ['vista', 'Visión general', [['puente', 'Puente de mando', '¿Cómo está todo de un vistazo?']]],
      ['empresa', 'Su empresa', [['empresa', 'La empresa hoy', '¿Cómo es su empresa ahora mismo?'], ['historia', 'Historia y cuentas', '¿De dónde viene? Sus cuentas de otros años.']]],
      ['mov', 'El movimiento', [['inversion', 'La inversión', '¿Qué quiere hacer y cómo lo paga?']]],
      ['ensayo', 'Ensayar el futuro', [['horizonte', 'Horizonte 3D', '¿Qué pasa si cambian dos cosas a la vez?'], ['escenarios', 'Escenarios', '¿Y si sale peor, o mejor?'], ['riesgos', 'Semáforos y riesgos', '¿Qué hay que vigilar?']]],
      ['cambio', 'Lo que cambia', [['tamano', 'Nuevo tamaño', '¿Cómo será la empresa después?'], ['humano', 'Sistema humano', '¿Está el equipo preparado?'], ['estructuras', 'Estructuras', '¿Hay otra forma de hacerlo?']]],
      ['decidir', 'Decidir', [['plan', 'Meta y plan', '¿Qué tocar para llegar a la meta?'], ['informe', 'Informe', 'El dossier para decidir.']]]
    ] },
    // Clave de área = la de S.GROUPS (js/strategy/core.js); el nombre es el que se ve
    est: { href: 'estrategia.html', areas: [
      ['Visión', 'Visión', [['origen', 'Origen de datos', '¿De dónde salen los datos de cada módulo?'], ['tablero', 'Cuadro de mando', '¿Cómo está toda la empresa de un vistazo?'], ['plan', 'Plan de empresa', '¿A dónde vamos y con qué valores?'], ['auditoria', 'Informe de auditoría', 'El diagnóstico completo, de lo micro a lo macro.'], ['evolucion', 'Evolución', '¿La empresa mejora o empeora?']]],
      ['Finanzas', 'Finanzas', [['dinero', 'Flujo del dinero', '¿Por qué el beneficio no llega a la caja?'], ['impuestos', 'Impuestos', '¿Cuánto y cuándo pagaré a Hacienda?'], ['tesoreria', 'Tesorería semanal', '¿Llego a fin de mes, semana a semana?'], ['presupuesto', 'Presupuesto', '¿Qué espero ganar y gastar este año?'], ['cobros', 'Cobros y morosidad', '¿Cómo pagan de verdad mis clientes y cuánto riesgo tengo en la calle?']]],
      ['Comercial', 'Comercial', [['ventas', 'ABC y concentración', '¿Quién me compra y cuánto dependo de él?'], ['margen', 'Margen y demanda', '¿Qué precio y qué volumen me convienen?'], ['comercial', 'Ventas en camino', '¿Qué ventas tengo en camino?'], ['marketing', 'Marketing', '¿Qué me rinde cada euro de marketing?']]],
      ['Operaciones', 'Operaciones', [['compras', 'Compras', '¿De quién dependo para comprar?'], ['logistica', 'Logística', '¿Cuánto me cuesta mover y guardar?'], ['tiempos', 'Gestor de tiempos', '¿En qué se va el tiempo del equipo?'], ['lean', 'Procesos sin desperdicio (Lean)', '¿Dónde se pierde valor en el proceso?'], ['personas', 'Personas', '¿Está bien organizado el equipo?']]],
      ['Estrategia', 'Entorno y crecimiento', [['expansion', 'Expansión territorial', '¿Dónde y cómo crecer?'], ['mercado', 'Mercado y riesgos', '¿Qué pasa fuera que me afecta?'], ['valoracion', 'Valoración de la empresa', '¿Cuánto vale mi empresa y cuánto puede llegar a valer?']]]
    ] },
    per: { href: 'personas.html', areas: [
      ['Visión', 'Visión', [['panorama', 'Panorama', '¿Cómo es el equipo humano y qué conviene trabajar primero?'], ['personas', 'Plantilla', '¿Quién forma el equipo, en qué puesto y qué herramientas ha completado cada persona?']]],
      ['Herramientas', 'Herramientas', [['disc', 'DISC', '¿Cómo se comporta cada persona: decide, conecta, sostiene o analiza?'], ['roles', 'Aportaciones al equipo', '¿Qué papel aporta cada persona cuando trabaja en equipo?'], ['eneagrama', 'Eneagrama', '¿Qué mueve a cada persona y qué teme?'], ['envios', 'Test a distancia', '¿Quién tiene pendiente su cuestionario y quién ya ha respondido?'], ['identidad', 'Perfil de identidad', '¿Quién es esta persona en lo esencial, qué le mueve y en qué momento está?']]],
      ['Estructura', 'Estructura', [['puestos', 'Puestos', '¿Qué pide cada puesto: comportamiento, aportaciones y misión?'], ['encaje', 'Encaje persona-puesto', '¿Está cada persona en el puesto que mejor aprovecha su forma de ser?'], ['organigrama', 'Organigrama y mandos', '¿Está bien construida la estructura: dependencias, amplitud de mando y relevos?'], ['talento', 'Mapa de talento', '¿Dónde está el talento que sostiene la empresa y el que la hará crecer?']]],
      ['Equipos', 'Equipos', [['equipos', 'Equipos', '¿Está equilibrado cada equipo: estilos, aportaciones cubiertas y posibles roces?']]],
      ['Liderazgo', 'Liderazgo', [['lid-modelo', 'Liderazgo a medida', '¿Qué estilo de liderazgo toca con cada persona en cada tarea?'], ['lid-estilo', 'Estilo del líder', '¿Cómo dirige este responsable y cuánto ajusta su estilo a cada situación?'], ['lid-360', 'Cómo le ve su equipo', '¿Coincide el estilo que el líder cree usar con el que vive su equipo?'], ['lid-prep', 'Preparación por tarea', '¿Lo preparada que está cada persona para cada una de sus tareas clave?'], ['lid-mapa', 'Mapa de mando', '¿Usa cada líder el estilo que toca con cada colaborador en cada tarea?'], ['lid-plan', 'Plan de desarrollo', '¿Qué tiene que entrenar el líder y qué necesita cada colaborador para subir de nivel?'], ['lid-informes', 'Informes de liderazgo', '¿Qué documento necesito: de un líder, de su equipo o de toda la organización?']]],
      ['Desarrollo', 'Desarrollo', [['tablillas', 'Tablillas de entrenamiento', '¿Qué conviene entrenar a cada persona y a cada equipo, y cómo?'], ['informes', 'Informes', '¿Qué documento necesito: de una persona, de un equipo o de toda la organización?']]]
    ] },
    // Etapas y pasos de js/intervencion/core.js (ETAPAS y TABS)
    iv: { href: 'intervencion.html', secuencial: true, areas: [
      ['previa', 'Sesión previa', [['guion', 'Guion de la sesión'], ['constantes', 'Constantes vitales'], ['escucha', 'Escucha y transcripción'], ['sintomas', 'Síntomas y causas'], ['triaje', 'Triaje y prioridades'], ['foto', 'Foto inicial']]],
      ['propuesta', 'Propuesta integral', [['propuesta', 'Propuesta integral'], ['aceptacion', 'Aceptación y servicios']]],
      ['s1', 'Servicio 1 · El dinero', [['s1docs', 'Documentación solicitada'], ['s1dinero', '¿Dónde está el dinero?'], ['s1cierre', 'Informe y siguiente propuesta']]],
      ['s2', 'Servicio 2 · Auditoría 360', [['documentacion', 'Documentación'], ['auditoria', 'Verificación por áreas'], ['ecosistema', 'Desviaciones del ecosistema'], ['foto360', 'Foto 360'], ['s2cierre', 'Informe y propuesta de acompañamiento']]],
      ['s3', 'Servicio 3 · Acompañamiento', [['arranque', 'Arranque: reglas y método'], ['objetivos', 'Objetivos SMART'], ['plan', 'Plan por prioridades'], ['sesiones', 'Sesiones quincenales']]],
      ['docs', 'Documentos', [['informes', 'Informes y documentos'], ['autoeval', 'Autoevaluación']]]
    ] },
    // Pestañas de js/mesa.js (TABS), agrupadas en las tres áreas aprobadas
    mesa: { href: 'mesa.html', areas: [
      ['hoy', 'Hoy', [['hoy', 'Hoy', '¿Qué toca hacer hoy?'], ['bandeja', 'Bandeja', 'Todo lo que llega de los mundos, en una lista.']]],
      ['planificar', 'Planificar', [['objetivos', 'Objetivos por prioridad'], ['metas', 'Metas SMART'], ['prioridades', 'Prioridades 20/80']]],
      ['agenda', 'Agenda', [['agenda', 'Agenda semanal'], ['repetitivas', 'Repetitivas y semana ideal'], ['reuniones', 'Reuniones y delegación']]]
    ] },
    // Sin módulos todavía: una entrada cada uno
    portal: { href: 'portal.html', unico: true },
    tablero: { href: 'tablero.html', unico: true },
    libro: { href: 'libro.html', unico: true },
    grupo: { href: 'grupo.html', unico: true }
  };

  const P = () => A.platform;
  const mundoP = (k) => ((P() && P().mundos ? P().mundos() : (P() && P().MUNDOS) || []).find((m) => m.k === k)) || ((P() && P().MUNDOS) || []).find((m) => m.k === k) || { k, n: k, c: '#9ba4ba' };
  /* Mundo completo con sus áreas y módulos: [{ k, n, c, d, href, lock, secuencial, unico, areas: [{ k, n, modulos: [{ k, n, pregunta, href }] }] }] */
  function mundo(k) {
    const d = M[k]; if (!d) return null;
    const p = mundoP(k);
    const areas = d.unico
      ? [{ k: k, n: p.n, modulos: [{ k: '', n: p.n, pregunta: p.d || '', href: d.href }] }]
      : d.areas.map(([ak, an, mods]) => ({ k: ak, n: an, modulos: mods.map(([mk, mn, q]) => ({ k: mk, n: mn, pregunta: q || '', href: d.href + '#' + mk })) }));
    return { k, n: p.n, c: p.c, d: p.d || '', href: d.href, lock: !!p.lock, plan: p.plan, secuencial: !!d.secuencial, unico: !!d.unico, areas };
  }
  // Mundos de la cuenta, en el orden de la barra común (la vista de grupo, solo si el plan la tiene)
  function mundos() {
    const lista = P() && P().mundos ? P().mundos() : Object.keys(M).map((k) => ({ k }));
    return lista.map((m) => mundo(m.k)).filter(Boolean);
  }
  // Todos los módulos en una lista plana, con su mundo y su área
  function modulos() {
    return mundos().flatMap((m) => m.areas.flatMap((a) => a.modulos.map((x) => Object.assign({ mundo: m, area: a }, x))));
  }
  A.catalogo = { DATOS: M, mundo, mundos, modulos };
})();
