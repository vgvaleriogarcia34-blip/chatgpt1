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
    // Fases y capítulos de js/ruta.js (FASES y CAP); el diccionario queda fuera del recorrido («aparte»)
    sim: { href: 'app.html', secuencial: true, aparte: [['diccionario', 'Diccionario', 'Los conceptos, explicados en llano.']], areas: [
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
    // Clave de área = la de R.GRUPOS (js/personas/core.js); en pantalla, «Visión» se llama «Panorama»
    per: { href: 'personas.html', areas: [
      ['Visión', 'Panorama', [['panorama', 'Panorama', '¿Cómo es el equipo humano y qué conviene trabajar primero?'], ['personas', 'Plantilla', '¿Quién forma el equipo, en qué puesto y qué herramientas ha completado cada persona?']]],
      ['Herramientas', 'Herramientas', [['disc', 'DISC', '¿Cómo se comporta cada persona: decide, conecta, sostiene o analiza?'], ['roles', 'Aportaciones al equipo', '¿Qué papel aporta cada persona cuando trabaja en equipo?'], ['eneagrama', 'Eneagrama', '¿Qué mueve a cada persona y qué teme?'], ['envios', 'Test a distancia', '¿Quién tiene pendiente su cuestionario y quién ya ha respondido?'], ['identidad', 'Perfil de identidad', '¿Quién es esta persona en lo esencial, qué le mueve y en qué momento está?']]],
      ['Estructura', 'Estructura', [['puestos', 'Puestos', '¿Qué pide cada puesto: comportamiento, aportaciones y misión?'], ['encaje', 'Encaje persona-puesto', '¿Está cada persona en el puesto que mejor aprovecha su forma de ser?'], ['organigrama', 'Organigrama y mandos', '¿Está bien construida la estructura: dependencias, amplitud de mando y relevos?'], ['talento', 'Mapa de talento', '¿Dónde está el talento que sostiene la empresa y el que la hará crecer?']]],
      ['Equipos', 'Equipos', [['equipos', 'Equipos', '¿Está equilibrado cada equipo: estilos, aportaciones cubiertas y posibles roces?']]],
      ['Liderazgo', 'Liderazgo', [['lid-modelo', 'Liderazgo a medida', '¿Qué estilo de liderazgo toca con cada persona en cada tarea?'], ['lid-estilo', 'Estilo del líder', '¿Cómo dirige este responsable y cuánto ajusta su estilo a cada situación?'], ['lid-360', 'Cómo le ve su equipo', '¿Coincide el estilo que el líder cree usar con el que vive su equipo?'], ['lid-prep', 'Preparación por tarea', '¿Lo preparada que está cada persona para cada una de sus tareas clave?'], ['lid-mapa', 'Mapa de mando', '¿Usa cada líder el estilo que toca con cada colaborador en cada tarea?'], ['lid-plan', 'Plan de desarrollo', '¿Qué tiene que entrenar el líder y qué necesita cada colaborador para subir de nivel?'], ['lid-informes', 'Informes de liderazgo', '¿Qué documento necesito: de un líder, de su equipo o de toda la organización?']]],
      ['Desarrollo', 'Desarrollo', [['tablillas', 'Tablillas de entrenamiento', '¿Qué conviene entrenar a cada persona y a cada equipo, y cómo?'], ['informes', 'Informes', '¿Qué documento necesito: de una persona, de un equipo o de toda la organización?']]]
    ] },
    // Fases, bloques y pasos de js/intervencion/core.js (FASES, BLOQUES y TABS). Un área con bloques lleva
    // [clave, nombre, [], [[clave del bloque, nombre del bloque, pasos], …]]: la fase 3 tiene un bloque por producto
    iv: { href: 'intervencion.html', secuencial: true, areas: [
      ['previa', 'Análisis previo al contrato', [['guion', 'Guion de la sesión'], ['constantes', 'Constantes vitales'], ['escucha', 'Escucha y transcripción'], ['sintomas', 'Síntomas y causas'], ['triaje', 'Triaje y prioridades'], ['foto', 'Foto inicial']]],
      ['propuesta', 'Propuesta y contrato', [['propuesta', 'Propuesta integral'], ['contrato', 'Contrato', 'El contrato de prestación de servicios con sus anexos, generado desde la propuesta aceptada.'], ['aceptacion', 'Aceptación y servicios']]],
      ['productos', 'Auditorías según el producto', [], [
        ['dinero', 'El dinero', [['s1docs', 'Documentación solicitada'], ['s1dinero', '¿Dónde está el dinero?'], ['s1cierre', 'Informe y siguiente propuesta']]],
        ['a360', 'Auditoría 360', [['documentacion', 'Documentación'], ['auditoria', 'Verificación por áreas'], ['ecosistema', 'Desviaciones del ecosistema'], ['foto360', 'Foto 360'], ['s2cierre', 'Informe y propuesta de acompañamiento']]]
      ]],
      ['acompanamiento', 'Acompañamiento', [['arranque', 'Arranque: reglas y método'], ['objetivos', 'Objetivos SMART'], ['plan', 'Plan por prioridades'], ['sesiones', 'Sesiones quincenales']]],
      ['cierre', 'Cierre y documentos', [['informes', 'Informes y documentos'], ['autoeval', 'Autoevaluación']]]
    ] },
    // Pestañas de js/mesa.js (TABS y AREAS_ARCH), agrupadas en las tres áreas aprobadas
    mesa: { href: 'mesa.html', areas: [
      ['hoy', 'Hoy', [['hoy', 'Hoy', '¿Qué toca hacer hoy?'], ['bandeja', 'Bandeja', 'Todo lo que llega de los mundos, en una lista.']]],
      ['planificar', 'Planificar', [['objetivos', 'Objetivos por prioridad', '¿Qué objetivos salen de los datos reales y en qué orden?'], ['metas', 'Metas SMART', '¿Cómo paso de un objetivo a una meta con su plan de acción?'], ['prioridades', 'Prioridades 20/80', '¿Qué 20 % de las tareas da el resultado?']]],
      ['agenda', 'Agenda', [['agenda', 'Agenda semanal', '¿En qué se va el tiempo de esta semana?'], ['repetitivas', 'Repetitivas y semana ideal', '¿Qué se repite y qué tiempo queda protegido?'], ['reuniones', 'Reuniones y delegación', '¿Qué se decidió en cada reunión y qué he delegado?']]]
    ] },
    // Módulos de js/tablero.js (MODS): la página larga del tablero, en cuatro módulos
    tablero: { href: 'tablero.html', areas: [
      ['tablero', 'Tablero', [['vistazo', 'La empresa, de un vistazo', '¿Cómo está la empresa: nota, equilibrio, cifras clave y capas?'], ['prioridades', 'Prioridades', '¿Qué toca tratar primero en toda la empresa?'], ['objetivos', 'Objetivos', '¿Cómo van los objetivos del empresario?'], ['mundos', 'Mundos', '¿Qué nota tiene cada mundo y qué toca primero en él?']]]
    ] },
    // Módulos de js/grupo.js (MODS): cuarto dato «G» = solo en el plan Grupos (vista de grupo); «C» = solo en la cartera
    grupo: { href: 'grupo.html', areas: [
      ['cartera', 'Cartera', [['empresas', 'Empresas', '¿Cómo están todas las empresas, una a una?'], ['consolidado', 'Consolidado', '¿Cómo está el grupo en conjunto, con las eliminaciones?', 'G'], ['operativa', 'Cartera operativa', '¿En qué etapa está cada cliente y qué tiene pendiente?', 'C'], ['operaciones', 'Operaciones dentro del grupo', '¿Qué se venden o se prestan las sociedades entre sí?', 'G'], ['tesoreria', 'Tesorería del grupo', '¿Quién financia a quién dentro del grupo?', 'G'], ['comparativa', 'Comparativa', '¿Cómo se comparan entre sí?'], ['riesgos', 'Riesgos en conjunto', '¿Qué riesgos solo se ven al mirarlas juntas?'], ['objetivos', 'Objetivos del grupo', '¿Cómo bajan los objetivos de la holding a cada sociedad?', 'G']]]
    ] },
    // Secciones por defecto del libro (js/libro-comun.js, SECCION). En la página, el archivador lee las secciones reales
    // del libro (con las que haya creado o renombrado el usuario, y el tablero y la cartera si se recogieron)
    libro: { href: 'libro.html', areas: [
      ['secciones', 'Secciones', [['intervencion', 'Auditoría integral'], ['simulador', 'Inversión y crecimiento'], ['estrategia', 'Sistema estratégico'], ['personas', 'Personas y equipos'], ['mesa', 'Plan de trabajo']]]
    ] },
    // Una entrada sola en el archivador (es la portada); sus partes, para el buscador: el archivador de entrada (#continuar,
    // #mundos) y el mapa de empresas (#empresas)
    portal: { href: 'portal.html', unico: true, entradas: [
      ['continuar', 'Continuar donde lo dejó', 'El último módulo abierto y los otros cuatro recientes.'],
      ['mundos', 'Mundos y módulos', 'Todos los mundos con sus áreas, para ir directo a cualquier módulo.'],
      ['empresas', 'Empresas', '¿En qué empresa trabaja? El mapa de empresas y sus fichas.']
    ] }
  };

  const P = () => A.platform;
  // ¿La cuenta es del plan Grupos (vista de grupo) o de varias empresas sin grupo (cartera de clientes)?
  const planGrupo = () => { const p = P(), u = p && p.user, pl = u && p.PLANES && p.PLANES[u.plan]; return !!(pl && pl.grupo); };
  const enPlan = (marca) => (!marca ? true : marca === 'G' ? planGrupo() : marca === 'C' ? !planGrupo() : true);
  const mundoP = (k) => ((P() && P().mundos ? P().mundos() : (P() && P().MUNDOS) || []).find((m) => m.k === k)) || ((P() && P().MUNDOS) || []).find((m) => m.k === k) || { k, n: k, c: '#9ba4ba' };
  /* Un mundo «unico» (el puesto de mando) es una entrada sola en el archivador; si tiene «entradas», el buscador las encuentra.
     Mundo completo con sus áreas y módulos: [{ k, n, c, d, href, lock, secuencial, unico, areas: [{ k, n, modulos: [{ k, n, pregunta, href }] }], aparte: [módulos fuera del recorrido] }]
     Un área con bloques trae además bloques: [{ k, n, modulos }]; sus «modulos» son los de todos sus bloques y cada uno lleva su «bloque». */
  function mundo(k) {
    const d = M[k]; if (!d) return null;
    const p = mundoP(k);
    const areas = d.unico
      ? [{ k: k, n: p.n, modulos: d.entradas ? d.entradas.map(([mk, mn, q]) => ({ k: mk, n: mn, pregunta: q || '', href: d.href + '#' + mk })) : [{ k: '', n: p.n, pregunta: p.d || '', href: d.href }] }]
      : d.areas.map(([ak, an, mods, bls]) => {
        const mod = (b) => ([mk, mn, q]) => ({ k: mk, n: mn, pregunta: q || '', href: d.href + '#' + mk, bloque: b });
        if (!bls) return { k: ak, n: an, modulos: mods.filter((x) => enPlan(x[3])).map(mod(null)) };
        const bloques = bls.map(([bk, bn]) => ({ k: bk, n: bn, modulos: [] }));
        bls.forEach((x, i) => { bloques[i].modulos = x[2].map(mod(bloques[i])); });
        return { k: ak, n: an, bloques, modulos: bloques.flatMap((b) => b.modulos) };
      });
    // Módulos fuera del recorrido: no cuentan como paso; para el buscador son de un área «Fuera del recorrido»
    const ap = { k: 'aparte', n: 'Fuera del recorrido', aparte: true, modulos: [] };
    ap.modulos = (d.aparte || []).map(([mk, mn, q]) => ({ k: mk, n: mn, pregunta: q || '', href: d.href + '#' + mk, aparte: true }));
    return { k, n: p.n, c: p.c, d: p.d || '', href: d.href, lock: !!p.lock, plan: p.plan, secuencial: !!d.secuencial, unico: !!d.unico, areas, aparte: ap.modulos, areaAparte: ap };
  }
  // Mundos de la cuenta, en el orden de la barra común (la vista de grupo, solo si el plan la tiene)
  function mundos() {
    const lista = P() && P().mundos ? P().mundos() : Object.keys(M).map((k) => ({ k }));
    return lista.map((m) => mundo(m.k)).filter(Boolean);
  }
  // Todos los módulos en una lista plana, con su mundo y su área
  function modulos() {
    return mundos().flatMap((m) => m.areas.concat(m.aparte.length ? [m.areaAparte] : []).flatMap((a) => a.modulos.map((x) => Object.assign({ mundo: m, area: a }, x))));
  }
  A.catalogo = { DATOS: M, mundo, mundos, modulos };
})();
