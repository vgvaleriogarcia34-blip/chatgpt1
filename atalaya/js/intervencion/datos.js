/* Atalaya 360° · Auditoría integral · contenido
   Modelo propio de Business Avance para la primera sesión (triaje), la auditoría integral y la intervención.
   La empresa casi nunca tiene un problema de mercado ni de dinero en el fondo: tiene huecos sin definir que
   tapan una o dos personas con su memoria y sus horas. La primera sesión escucha cómo el empresario describe
   su empresa, mide sus constantes y deriva cada síntoma a su área; la auditoría integral verifica; la
   intervención cierra los huecos con responsables, límites, métodos, datos y fechas. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const D = (A.intervDatos = {});

  /* ---------- Áreas (las «alas» a las que se deriva cada síntoma) ---------- */
  D.AREAS = [
    { id: 'gob', n: 'Dirección y gobierno', c: '#c9f24d', est: ['plan', 'tablero'], per: ['organigrama', 'lid-modelo'], d: 'Quién decide qué, cómo se reúne la dirección y si el poder legal coincide con el real.' },
    { id: 'fin', n: 'Finanzas y caja', c: '#3987e5', est: ['dinero', 'tesoreria', 'presupuesto', 'cobros', 'impuestos'], sim: true, d: 'Margen real, tesorería, deuda y cargas financieras, cobros y pagos.' },
    { id: 'com', n: 'Clientes y ventas', c: '#d95926', est: ['ventas', 'margen', 'comercial', 'marketing'], d: 'Concentración de clientes, precios, proceso comercial y margen por cliente y producto.' },
    { id: 'ope', n: 'Operaciones y procesos', c: '#199e70', est: ['tiempos', 'lean', 'compras', 'logistica'], d: 'Cómo se hace el trabajo, capacidad, cuellos de botella, stock y calidad.' },
    { id: 'per', n: 'Personas y equipos', c: '#c98500', est: ['personas'], per: ['personas', 'puestos', 'encaje', 'equipos'], d: 'Puestos, responsables intermedios, personas clave, clima y rotación.' },
    { id: 'inf', n: 'Información y datos', c: '#8a7cf0', est: ['tablero', 'origen'], d: 'Si la empresa lee los datos que genera o decide de oído.' },
    { id: 'tie', n: 'Proyectos y tiempo', c: '#d55181', est: ['plan', 'expansion'], mesa: true, d: 'Proyectos con fecha y responsable, agenda del empresario y foco.' },
    { id: 'leg', n: 'Legal y societario', c: '#7d828c', est: ['valoracion', 'auditoria'], d: 'Estructura societaria, avales, contratos, cumplimiento e inspecciones.' }
  ];
  D.area = (id) => D.AREAS.find((a) => a.id === id);

  /* ---------- Constantes vitales de la empresa (1 bien … 5 grave) ---------- */
  D.CONSTANTES = [
    { id: 'tension', n: 'Tensión', q: 'Presión que soporta el empresario', e: ['Tranquilo, con margen para pensar', 'Ocupado pero en control', 'Cansado, apaga fuegos a menudo', 'Agotado, todo pasa por él', 'Al límite: lo dice con esas palabras'] },
    { id: 'temperatura', n: 'Temperatura', q: 'Urgencias abiertas (incendios)', e: ['Ninguna urgencia', 'Algún tema que vigilar', 'Varias urgencias este trimestre', 'Una urgencia con fecha cercana', 'Riesgo inminente (impago, inspección, litigio, bloqueo)'] },
    { id: 'pulso', n: 'Pulso de caja', q: 'Liquidez y ritmo de cobros y pagos', e: ['Caja holgada y prevista', 'Caja suficiente, sin previsión', 'Se vive al día', 'Tensiones para pagar nóminas o impuestos', 'Impagos o descubiertos'] },
    { id: 'respiracion', n: 'Respiración', q: 'Capacidad del equipo frente a la carga', e: ['Holgada', 'Justa en picos', 'Saturada a menudo', 'Saturada siempre, horas extra', 'No llega: se pierden pedidos o calidad'] },
    { id: 'dependencia', n: 'Dependencia', q: 'Cuánto pasa por una o dos personas clave', e: ['Funciona sin ellas una semana', 'Aguanta unos días', 'Se resiente si faltan', 'Se para si faltan', 'Todo pasa por una sola persona'] },
    { id: 'reflejos', n: 'Reflejos', q: 'Velocidad y claridad para decidir', e: ['Decide rápido y por escrito', 'Decide, a veces tarde', 'Decisiones que se aplazan', 'Decisiones que se revocan en el pasillo', 'Nadie sabe quién decide'] }
  ];
  D.nivelConst = (v) => (v >= 4 ? 'stop' : v >= 3 ? 'warn' : 'ok');

  /* ---------- Los siete huecos que delata el lenguaje ---------- */
  D.PATRONES = [
    { id: 'responsable', n: 'Responsable sin nombre', q: '¿Quién es el responsable de esto, con nombre y apellido?', area: 'gob',
      senales: ['el que este', 'el que esté', 'quien pueda', 'quien este', 'quien esté', 'lo hace cualquiera', 'lo hacemos todos', 'entre todos', 'el de turno', 'el que le toque', 'nadie en concreto', 'todo pasa por mi', 'todo pasa por mí', 'me lo preguntan todo', 'me llaman para todo'],
      vacio: 'Las tareas críticas no tienen un responsable con nombre; la responsabilidad por defecto es del empresario.', cuesta: 'Cuando todo es de todos, no es de nadie: los fallos no tienen dueño y todo sube hasta el empresario.', artefacto: 'Matriz de responsabilidades por puesto (quién hace, quién valida, quién sustituye) y nombramiento de responsables.' },
    { id: 'limite', n: 'Límite sin número', q: '¿A partir de qué cifra se pide, se para o se actúa?', area: 'ope',
      senales: ['cuando se ve que', 'cuando va faltando', 'a ojo', 'mas o menos', 'más o menos', 'depende', 'segun se vea', 'según se vea', 'cuando hace falta', 'cuando haga falta', 'lo normal', 'bastante', 'un poco'],
      vacio: 'No hay umbrales escritos: ni de pedido, ni de margen mínimo, ni de cuándo parar o escalar.', cuesta: 'Roturas y sobrestock invisibles; una línea o un cliente puede perder dinero meses sin que nadie lo sepa.', artefacto: 'Tabla de umbrales: mínimos y máximos, margen mínimo por producto y cliente, límites de aprobación.' },
    { id: 'metodo', n: 'Tarea sin método', q: '¿Cómo se hace exactamente? ¿Está escrito o vive en una cabeza?', area: 'ope',
      senales: ['siempre se ha hecho asi', 'siempre se ha hecho así', 'lo saben hacer', 'eso ya lo saben', 'cada uno lo hace', 'cada uno a su manera', 'lo llevo en la cabeza', 'lo tengo en la cabeza', 'de memoria', 'no esta escrito', 'no está escrito', 'nos apañamos', 'se apañan'],
      vacio: 'Los procedimientos no están escritos; se aprenden por imitación y se van con quien se va.', cuesta: 'No se puede formar rápido, ni auditar, ni sustituir; cada baja es una pérdida de método.', artefacto: 'Manual de procedimientos por puesto y listas de comprobación de apertura, cierre y entrega.' },
    { id: 'puesto', n: 'Puesto sin definición', q: '¿Qué es esta persona: lo que hace o lo que dice su contrato?', area: 'per',
      senales: ['hace de todo', 'vale para todo', 'hace un poco de todo', 'le toca', 'le he dicho que', 'no tiene un puesto', 'es el que mas sabe', 'es el que más sabe', 'sin el no', 'sin él no', 'si se va', 'no puedo prescindir'],
      vacio: 'Lo que cada persona hace no coincide con su puesto; hay personas insustituibles y mandos sin funciones claras.', cuesta: 'El talento se quema o se va; los huecos de mando los tapa el empresario.', artefacto: 'Fichas de puesto firmadas, mapa de personas clave con suplente y plan de promoción interna.' },
    { id: 'dato', n: 'Dato sin lectura', q: '¿Cómo lo sabemos con cifras, no de oído?', area: 'inf',
      senales: ['por whatsapp', 'por el whatsapp', 'de oidas', 'de oídas', 'me lo dicen', 'me parece que', 'creo que', 'no lo sabemos', 'no lo he mirado', 'no tenemos datos', 'la gestoria', 'la gestoría', 'el asesor me', 'a final de año', 'cuando cierra el año'],
      vacio: 'La empresa genera datos cada día y no los lee; no hay cuadro de mando ni cierre mensual útil.', cuesta: 'Se decide por intuición sobre un negocio que ya tiene los datos; no se sabe con números quién lo hace bien.', artefacto: 'Cuadro de mando semanal con 8-12 indicadores y cierre mensual con margen por línea.' },
    { id: 'fecha', n: 'Proyecto sin fecha', q: '¿Para cuándo? ¿En qué punto está hoy?', area: 'tie',
      senales: ['cuando se pueda', 'cuando pueda', 'ya veremos', 'mas adelante', 'más adelante', 'algun dia', 'algún día', 'lo tengo pendiente', 'esta pendiente', 'está pendiente', 'hace años que', 'llevamos tiempo', 'no me da la vida', 'no tengo tiempo'],
      vacio: 'Proyectos y problemas sin fecha ni estado; el calendario vive en la cabeza del empresario.', cuesta: 'Sin fecha todo se desliza: obras que consumen dinero sin avanzar, temas legales que se alargan.', artefacto: 'Calendario maestro con hitos, responsable por hito y revisión quincenal.' },
    { id: 'mando', n: 'Mando difuso', q: '¿Quién manda aquí de verdad, y quién puede revocarlo en el pasillo?', area: 'gob',
      senales: ['lo decido yo', 'aqui mando yo', 'aquí mando yo', 'mi padre', 'mi hermano', 'mi socio', 'el fundador', 'tengo que estar encima', 'si no estoy', 'sin mi', 'sin mí', 'me tienen que preguntar', 'al final decido yo', 'luego cambia', 'lo cambia'],
      vacio: 'El poder real y el poder legal están en personas distintas o no hay regla de qué decide cada quién.', cuesta: 'Es lo más grave: riesgo de bloqueo societario y un equipo que no sabe a quién hacer caso.', artefacto: 'Acuerdo de gobierno en tres niveles (día, mes, inversión) y, si hace falta, apoderamiento con validación externa.' }
  ];
  D.patron = (id) => D.PATRONES.find((p) => p.id === id);

  /* ---------- Lenguaje: lo que delata cómo vive el empresario su empresa ---------- */
  D.LEXICO = {
    absolutos: { n: 'Absolutos', d: 'Generalizaciones: suelen tapar una excepción que duele.', w: ['siempre', 'nunca', 'todo', 'todos', 'nadie', 'nada', 'ninguno', 'jamas', 'jamás', 'cada vez'] },
    culpa: { n: 'Causa fuera', d: 'El problema se coloca fuera: mercado, bancos, personal, administración. Lo que depende de él queda sin mirar.', w: ['la crisis', 'el mercado', 'los bancos', 'el banco', 'hacienda', 'la administracion', 'la administración', 'la gente no quiere', 'no hay gente', 'no encuentro personal', 'la competencia', 'los precios', 'los clientes no pagan', 'el gobierno'] },
    obligacion: { n: 'Obligación', d: '«Tengo que», «debería»: habla desde el deber, no desde la decisión. Señal de carga.', w: ['tengo que', 'tenemos que', 'deberia', 'debería', 'deberiamos', 'deberíamos', 'hay que', 'me toca', 'no queda otra'] },
    emocion: { n: 'Emoción', d: 'Palabras de cansancio, miedo o enfado: miden la tensión real.', w: ['estres', 'estrés', 'agotado', 'cansado', 'harto', 'quemado', 'no duermo', 'miedo', 'agobio', 'agobiado', 'preocupado', 'me pesa', 'no puedo mas', 'no puedo más', 'frustrado', 'solo', 'sola'] },
    minimizar: { n: 'Quitar importancia', d: '«Un poco», «algo», «solo»: rebaja lo que más le preocupa. Ahí suele estar el síntoma grave.', w: ['un poco', 'algo de', 'solo es', 'nada grave', 'no es para tanto', 'lo normal', 'tampoco es', 'de momento bien'] },
    urgencia: { n: 'Urgencia', d: 'Temas con plazo: suben la temperatura de la empresa.', w: ['urgente', 'ya mismo', 'inspeccion', 'inspección', 'juicio', 'demanda', 'embargo', 'impago', 'descubierto', 'poliza vence', 'póliza vence', 'vencimiento', 'requerimiento', 'sancion', 'sanción'] },
    centralizacion: { n: 'Todo pasa por mí', d: 'El empresario como único punto de paso de la empresa.', w: ['todo pasa por mi', 'todo pasa por mí', 'si no estoy', 'tengo que estar', 'me llaman', 'me preguntan', 'lo hago yo', 'lo tengo que hacer yo', 'nadie lo hace', 'yo me encargo'] }
  };

  /* ---------- Resignificar: lo que dice, lo que puede querer decir y la pregunta que lo confirma ---------- */
  D.RESIGNIFICA = [
    { k: ['no tengo tiempo', 'no me da la vida', 'no llego a todo'], dice: '«No tengo tiempo»', quiere: 'Todo pasa por él y no hay en quién delegar: el problema no es el tiempo, es el diseño.', pregunta: '¿Qué tres cosas haces cada semana que solo puedes hacer tú? ¿Y cuáles podría hacer otro si estuvieran escritas?', patron: 'responsable', area: 'gob' },
    { k: ['la gente no quiere trabajar', 'no hay gente', 'no encuentro personal', 'no encuentro gente'], dice: '«La gente no quiere trabajar»', quiere: 'No sabe retener ni formar: puestos sin definir, sin método escrito y sin carrera.', pregunta: '¿Cuánto tarda en ser productivo alguien nuevo? ¿Qué le das el primer día?', patron: 'puesto', area: 'per' },
    { k: ['vendemos mucho', 'vendemos bien', 'facturamos mucho', 'trabajo no falta'], dice: '«Vendemos mucho» o «trabajo no falta»', quiere: 'Facturación no es margen: puede estar creciendo en lo que no deja dinero.', pregunta: '¿Qué cliente o producto te deja más margen por hora de trabajo? ¿Y cuál menos?', patron: 'dato', area: 'com' },
    { k: ['el dinero no llega', 'no sé dónde va el dinero', 'no se donde va el dinero', 'no veo el dinero', 'ganamos pero'], dice: '«No sé dónde va el dinero»', quiere: 'No hay previsión de tesorería ni margen por línea: el beneficio se queda en stock, en cobros o en deuda.', pregunta: '¿Cuánto tienes que cobrar este mes para pagarlo todo? ¿Lo sabes hoy sin mirar al banco?', patron: 'dato', area: 'fin' },
    { k: ['si no estoy', 'sin mí', 'sin mi', 'tengo que estar encima'], dice: '«Si no estoy, esto no funciona»', quiere: 'La empresa depende de su cabeza; puede que también le dé identidad y le cueste soltar.', pregunta: 'Si mañana te vas dos semanas, ¿qué se para el primer día? ¿Y quién te llamaría?', patron: 'mando', area: 'gob' },
    { k: ['mi padre', 'el fundador', 'mi hermano', 'mi socio'], dice: 'Menciona al padre, al socio o a un hermano al hablar de decisiones', quiere: 'Mando difuso: quien decide no es quien firma, o alguien revoca en el pasillo lo decidido.', pregunta: 'Cuando tomas una decisión importante, ¿quién puede deshacerla? ¿Quién firma ante el banco?', patron: 'mando', area: 'leg' },
    { k: ['lo llevo en la cabeza', 'lo tengo en la cabeza', 'de memoria'], dice: '«Lo llevo en la cabeza»', quiere: 'El método no existe fuera de él: es un riesgo y también un techo para crecer.', pregunta: 'Si tuvieras que explicárselo a alguien nuevo en una hoja, ¿qué pondrías?', patron: 'metodo', area: 'ope' },
    { k: ['ya veremos', 'cuando se pueda', 'más adelante', 'mas adelante'], dice: '«Cuando se pueda» o «ya veremos»', quiere: 'Proyecto sin dueño ni fecha; a veces es miedo a decidir.', pregunta: '¿Qué tendría que pasar para que tuviera fecha? ¿Qué te frena de ponérsela hoy?', patron: 'fecha', area: 'tie' },
    { k: ['el banco', 'los bancos', 'la póliza', 'la poliza', 'el préstamo', 'el prestamo'], dice: 'Habla del banco o de la póliza', quiere: 'La financiación puede estar desalineada con el ciclo del negocio: cargas que el negocio no genera.', pregunta: '¿Cuánto pagas al mes entre cuotas e intereses? ¿Y cuánto genera el negocio antes de pagarlas?', patron: 'limite', area: 'fin' },
    { k: ['estoy cansado', 'estoy agotado', 'estrés', 'estres', 'no duermo', 'harto'], dice: 'Expresa cansancio o estrés', quiere: 'La tensión es real: la intervención tiene que liberarle tiempo pronto o no habrá energía para el cambio.', pregunta: 'De todo lo que haces, ¿qué te quita más energía? ¿Qué dejarías mañana si pudieras?', patron: 'responsable', area: 'gob' },
    { k: ['el asesor', 'la gestoría', 'la gestoria', 'el gestor'], dice: 'Delega los números en la asesoría', quiere: 'Los números llegan tarde y para Hacienda, no para decidir.', pregunta: '¿Cuándo te llegan las cuentas del mes? ¿Qué decisión has tomado con ellas la última vez?', patron: 'dato', area: 'inf' },
    { k: ['los precios', 'subir precios', 'no puedo subir'], dice: '«No puedo subir precios»', quiere: 'No sabe qué margen deja cada cliente ni el valor que aporta; compite por precio sin saberlo.', pregunta: '¿Cuándo subiste precios por última vez? ¿Qué cliente perderías si lo hicieras?', patron: 'limite', area: 'com' }
  ];

  /* ---------- Guion de la primera sesión (60 minutos) ---------- */
  D.GUION = [
    { id: 'apertura', n: 'Apertura y encuadre', min: 5, obj: 'Crear confianza y explicar que hoy se escucha, no se juzga.', p: [
      { q: 'Antes de empezar: ¿qué tendría que pasar en esta hora para que haya merecido la pena?', oye: 'Su prioridad real y lo que espera de ti.' },
      { q: 'Cuéntame en dos frases qué hace tu empresa y para quién.', oye: 'Cómo se define: por producto, por cliente o por esfuerzo.' }] },
    { id: 'historia', n: 'Historia y momento', min: 10, obj: 'Entender de dónde viene y por qué ahora.', p: [
      { q: '¿Cómo empezó la empresa y qué momento estáis viviendo ahora?', oye: 'Hitos, herencias, socios y figuras que siguen pesando.', area: 'gob' },
      { q: '¿Por qué ahora? ¿Qué ha pasado para que nos sentemos hoy?', oye: 'El detonante: suele ser el síntoma más caliente.', area: 'tie' },
      { q: '¿Qué ha cambiado en los últimos dos años: clientes, equipo, tamaño, márgenes?', oye: 'Crecimiento sin estructura, pérdida de margen o de personas.' }] },
    { id: 'dolor', n: 'El dolor principal', min: 10, obj: 'Escuchar el problema con sus palabras, sin corregir.', p: [
      { q: 'Si tuvieras que nombrar lo que más te quita el sueño, ¿qué sería?', oye: 'La frase literal: apúntala tal cual. Será la cita que abra el informe.' },
      { q: '¿Qué has intentado ya para resolverlo y qué pasó?', oye: 'Patrones de intento fallido: suelen apuntar a la causa.' },
      { q: '¿Qué pasaría si dentro de un año todo siguiera exactamente igual?', oye: 'El coste de no actuar, en su lenguaje.' }] },
    { id: 'recorrido', n: 'Recorrido por las áreas', min: 25, obj: 'Tomar las constantes de cada área con preguntas abiertas.', p: [
      { q: '¿Quién decide qué en la empresa? Cuando tú no estás, ¿quién manda?', oye: 'Mando difuso, poder legal y real, figura del fundador.', area: 'gob', patron: 'mando' },
      { q: 'Si mañana faltas dos semanas, ¿qué se para el primer día?', oye: 'Dependencia y tareas sin responsable.', area: 'gob', patron: 'responsable' },
      { q: '¿Cómo sabes si este mes has ganado dinero? ¿Cuándo lo sabes?', oye: 'Información tardía, dependencia de la asesoría.', area: 'fin', patron: 'dato' },
      { q: '¿Cómo vas de caja? ¿Has tenido que tirar de póliza o retrasar pagos este año?', oye: 'Pulso de caja y cargas financieras.', area: 'fin', patron: 'limite' },
      { q: '¿Cuáles son tus cinco clientes principales y cuánto pesan? ¿Cuál te deja más margen?', oye: 'Concentración y conocimiento del margen.', area: 'com', patron: 'dato' },
      { q: '¿Cuándo subiste precios por última vez y cómo lo decidiste?', oye: 'Política de precios sin número.', area: 'com', patron: 'limite' },
      { q: '¿Cómo se hace el trabajo del día a día? ¿Está escrito en algún sitio?', oye: 'Método oral, imitación, «siempre se ha hecho así».', area: 'ope', patron: 'metodo' },
      { q: '¿Dónde se atasca el trabajo? ¿Qué se repite o se rehace?', oye: 'Cuellos de botella, reprocesos, falta de umbrales.', area: 'ope', patron: 'limite' },
      { q: 'Háblame de tu equipo: ¿quién es imprescindible y qué pasaría si se fuera?', oye: 'Personas clave, puestos difusos, mandos sin funciones.', area: 'per', patron: 'puesto' },
      { q: '¿Cómo se entera la gente de lo que tiene que hacer? ¿Cómo os comunicáis?', oye: 'WhatsApp, pasillo, reuniones sin acta.', area: 'inf', patron: 'dato' },
      { q: '¿Qué proyectos tienes pendientes y desde cuándo?', oye: 'Proyectos sin fecha ni responsable.', area: 'tie', patron: 'fecha' },
      { q: '¿Hay algún tema legal, societario, con el banco o con la Administración que te preocupe?', oye: 'Avales, socios, inspecciones, litigios: temperatura.', area: 'leg', patron: 'mando' }] },
    { id: 'cierre', n: 'Cierre y compromiso', min: 10, obj: 'Devolver lo escuchado y acordar el siguiente paso.', p: [
      { q: 'Te devuelvo lo que he escuchado en tres frases: ¿es así o me falta algo?', oye: 'Si corrige, apunta qué corrige: ahí está lo importante.' },
      { q: 'Si solo pudiéramos resolver una cosa en 90 días, ¿cuál elegirías?', oye: 'Su prioridad sentida (compárala con la causa que tú ves).' },
      { q: 'Para la auditoría integral necesitaré documentación y hablar con algunas personas. ¿Con quién y cuándo?', oye: 'Disposición a abrir la empresa: indicador de compromiso.' }] }
  ];

  /* ---------- Causas raíz tipo (la intervención trabaja sobre causas, no sobre síntomas) ---------- */
  D.CAUSAS = [
    { id: 'gob-mando', area: 'gob', patron: 'mando', n: 'El mando real no coincide con el formal', k: ['mi padre', 'socio', 'fundador', 'decide', 'manda', 'firma'], esfuerzo: 3, linea: 'gobierno' },
    { id: 'gob-cuello', area: 'gob', patron: 'responsable', n: 'Todo pasa por el empresario: no hay segundo nivel', k: ['todo pasa', 'si no estoy', 'me llaman', 'encima', 'tiempo'], esfuerzo: 3, linea: 'organizacion' },
    { id: 'gob-rumbo', area: 'gob', patron: 'fecha', n: 'Sin rumbo escrito: objetivos y prioridades no compartidos', k: ['objetivo', 'rumbo', 'futuro', 'plan', 'no sé hacia'], esfuerzo: 2, linea: 'gobierno' },
    { id: 'fin-margen', area: 'fin', patron: 'dato', n: 'No se conoce el margen real por cliente, producto o línea', k: ['margen', 'gano', 'dinero', 'rentable', 'beneficio'], esfuerzo: 2, linea: 'finanzas' },
    { id: 'fin-caja', area: 'fin', patron: 'limite', n: 'Tesorería sin previsión: se vive al día', k: ['caja', 'pagar', 'nóminas', 'nominas', 'póliza', 'poliza', 'cobrar'], esfuerzo: 2, linea: 'finanzas' },
    { id: 'fin-carga', area: 'fin', patron: 'limite', n: 'Cargas financieras que el negocio no genera', k: ['banco', 'préstamo', 'prestamo', 'deuda', 'cuota', 'leasing'], esfuerzo: 3, linea: 'finanzas' },
    { id: 'com-concentracion', area: 'com', patron: 'dato', n: 'Dependencia de pocos clientes', k: ['cliente grande', 'principal cliente', 'depende', 'concentr'], esfuerzo: 4, linea: 'comercial' },
    { id: 'com-precio', area: 'com', patron: 'limite', n: 'Precios sin revisar ni política de margen mínimo', k: ['precio', 'subir', 'tarifa', 'descuento', 'barato'], esfuerzo: 2, linea: 'comercial' },
    { id: 'com-proceso', area: 'com', patron: 'metodo', n: 'Sin proceso comercial: se vende por inercia', k: ['ventas', 'comercial', 'clientes nuevos', 'captar', 'boca a boca'], esfuerzo: 3, linea: 'comercial' },
    { id: 'ope-metodo', area: 'ope', patron: 'metodo', n: 'Procesos no escritos: el método vive en las personas', k: ['siempre se ha hecho', 'lo saben', 'cabeza', 'cada uno', 'apaña'], esfuerzo: 3, linea: 'procesos' },
    { id: 'ope-umbral', area: 'ope', patron: 'limite', n: 'Sin umbrales: stock, calidad y plazos a ojo', k: ['stock', 'falta', 'sobra', 'a ojo', 'calidad', 'retraso'], esfuerzo: 2, linea: 'procesos' },
    { id: 'ope-capacidad', area: 'ope', patron: 'limite', n: 'Capacidad saturada y cuellos de botella', k: ['no llegamos', 'saturad', 'horas extra', 'cuello', 'atasca'], esfuerzo: 3, linea: 'procesos' },
    { id: 'per-puestos', area: 'per', patron: 'puesto', n: 'Puestos sin definir y mandos intermedios sin funciones', k: ['hace de todo', 'puesto', 'encargado', 'responsable', 'funciones'], esfuerzo: 2, linea: 'equipos' },
    { id: 'per-clave', area: 'per', patron: 'puesto', n: 'Personas clave insustituibles', k: ['si se va', 'imprescindible', 'sin él', 'sin el', 'el que más sabe'], esfuerzo: 3, linea: 'equipos' },
    { id: 'per-clima', area: 'per', patron: 'responsable', n: 'Rotación, desmotivación o conflicto en el equipo', k: ['se van', 'rotación', 'rotacion', 'motivad', 'conflicto', 'quejas'], esfuerzo: 3, linea: 'equipos' },
    { id: 'inf-cuadro', area: 'inf', patron: 'dato', n: 'Sin cuadro de mando: se decide de oído', k: ['no sabemos', 'datos', 'creo que', 'me parece', 'whatsapp', 'gestoría', 'gestoria'], esfuerzo: 2, linea: 'informacion' },
    { id: 'inf-comunicacion', area: 'inf', patron: 'dato', n: 'Comunicación interna por pasillo y WhatsApp, sin reuniones con acta', k: ['whatsapp', 'pasillo', 'reunión', 'reunion', 'no se enteran'], esfuerzo: 1, linea: 'protocolos' },
    { id: 'tie-proyectos', area: 'tie', patron: 'fecha', n: 'Proyectos sin fecha ni responsable', k: ['pendiente', 'cuando se pueda', 'ya veremos', 'obra', 'proyecto'], esfuerzo: 1, linea: 'protocolos' },
    { id: 'tie-agenda', area: 'tie', patron: 'responsable', n: 'La agenda del empresario se va en operativa', k: ['no tengo tiempo', 'apagar fuegos', 'urgente', 'no me da'], esfuerzo: 2, linea: 'organizacion' },
    { id: 'leg-societario', area: 'leg', patron: 'mando', n: 'Riesgo societario o patrimonial sin ordenar (socios, avales, poderes)', k: ['aval', 'socio', 'acciones', 'participaciones', 'herencia', 'poder'], esfuerzo: 4, linea: 'gobierno' },
    { id: 'leg-cumplimiento', area: 'leg', patron: 'fecha', n: 'Cumplimiento o litigios con plazo sin gestionar', k: ['inspección', 'inspeccion', 'juicio', 'demanda', 'sanidad', 'licencia', 'requerimiento'], esfuerzo: 3, linea: 'protocolos' }
  ];
  D.causa = (id) => D.CAUSAS.find((c) => c.id === id);

  /* ---------- Fases de la intervención ---------- */
  D.FASES = [
    { id: 1, n: 'Ordenar', d: 'Apagar urgencias, regularizar el gobierno y ganar tiempo para el empresario.', sem: [1, 6], ritmo: 'Sesión semanal' },
    { id: 2, n: 'Dar claridad', d: 'Responsables con nombre, límites con número, métodos escritos y datos que se leen.', sem: [7, 16], ritmo: 'Sesión quincenal' },
    { id: 3, n: 'Transformar', d: 'Procesos, equipos, finanzas y comercial funcionando con el nuevo sistema.', sem: [17, 32], ritmo: 'Sesión quincenal' },
    { id: 4, n: 'Consolidar', d: 'Que la empresa funcione una semana sin el empresario y que quede escrito: diccionario, libro y reglas.', sem: [33, 48], ritmo: 'Sesión mensual' }
  ];

  /* ---------- Líneas de trabajo del plan de intervención y sus acciones tipo ---------- */
  D.LINEAS = [
    { id: 'gobierno', n: 'Gobierno y dirección', a: [
      { t: 'Acuerdo de gobierno en tres niveles: qué se decide en el día, en el mes y en la mesa de dirección', f: 1, sem: 2, ent: 'Acuerdo de gobierno firmado', resp: 'empresa' },
      { t: 'Regularizar poderes para que quien dirige pueda firmar (con validación jurídica externa)', f: 1, sem: 3, ent: 'Apoderamiento o nombramiento', resp: 'empresa', causa: ['gob-mando', 'leg-societario'] },
      { t: 'Reunión de dirección semanal con orden del día, acta y decisiones con responsable', f: 1, sem: 1, ent: 'Protocolo de reunión y primeras actas', resp: 'consultor' },
      { t: 'Objetivos del año en cascada: empresa, áreas y personas', f: 2, sem: 4, ent: 'Mapa de objetivos', resp: 'consultor', causa: ['gob-rumbo'] }] },
    { id: 'organizacion', n: 'Organización y roles', a: [
      { t: 'Matriz de responsabilidades: quién hace, quién valida y quién sustituye cada tarea crítica', f: 1, sem: 3, ent: 'Matriz de responsabilidades', resp: 'consultor', causa: ['gob-cuello'] },
      { t: 'Liberar la agenda del empresario: lista de tareas a delegar con fecha y a quién', f: 1, sem: 2, ent: 'Plan de delegación', resp: 'empresa', causa: ['gob-cuello', 'tie-agenda'] },
      { t: 'Organigrama objetivo con responsables intermedios (promoción interna antes que contratación)', f: 2, sem: 4, ent: 'Organigrama objetivo', resp: 'consultor' }] },
    { id: 'finanzas', n: 'Finanzas y caja', a: [
      { t: 'Previsión de tesorería a 13 semanas, revisada cada lunes', f: 1, sem: 2, ent: 'Tesorería semanal', resp: 'empresa', causa: ['fin-caja'] },
      { t: 'Margen real por cliente, producto y línea (ABC con margen)', f: 2, sem: 4, ent: 'ABC de margen', resp: 'consultor', causa: ['fin-margen', 'com-precio'] },
      { t: 'Revisar la deuda y alinear cuotas con lo que genera el negocio', f: 1, sem: 4, ent: 'Mapa de deuda y propuesta al banco', resp: 'consultor', causa: ['fin-carga'] },
      { t: 'Presupuesto anual y cierre mensual con desviaciones', f: 3, sem: 6, ent: 'Presupuesto y cierre mensual', resp: 'empresa' }] },
    { id: 'comercial', n: 'Clientes y ventas', a: [
      { t: 'Política de precios con margen mínimo por cliente y producto', f: 2, sem: 3, ent: 'Política de precios', resp: 'empresa', causa: ['com-precio'] },
      { t: 'Plan para reducir la dependencia de los clientes principales', f: 3, sem: 8, ent: 'Plan de diversificación', resp: 'empresa', causa: ['com-concentracion'] },
      { t: 'Proceso comercial escrito: captación, oferta, seguimiento y cierre', f: 3, sem: 6, ent: 'Proceso comercial', resp: 'consultor', causa: ['com-proceso'] }] },
    { id: 'procesos', n: 'Procesos', a: [
      { t: 'Mapa de procesos de la empresa y los tres procesos críticos escritos', f: 2, sem: 6, ent: 'Mapa de procesos', resp: 'consultor', causa: ['ope-metodo'] },
      { t: 'Umbrales operativos: stock mínimo y máximo, plazos y calidad', f: 2, sem: 4, ent: 'Tabla de umbrales', resp: 'empresa', causa: ['ope-umbral'] },
      { t: 'Medir capacidad y quitar el primer cuello de botella', f: 3, sem: 6, ent: 'Estudio de capacidad', resp: 'consultor', causa: ['ope-capacidad'] }] },
    { id: 'equipos', n: 'Equipos y personas', a: [
      { t: 'Fichas de puesto y perfiles del equipo (DISC, aportaciones, encaje)', f: 2, sem: 4, ent: 'Fichas de puesto y mapa de encaje', resp: 'consultor', causa: ['per-puestos'] },
      { t: 'Mapa de personas clave con suplente y plan de traspaso de conocimiento', f: 2, sem: 6, ent: 'Plan de personas clave', resp: 'empresa', causa: ['per-clave'] },
      { t: 'Liderazgo a medida para los responsables y acuerdos por tarea', f: 3, sem: 8, ent: 'Acuerdos de liderazgo', resp: 'consultor', causa: ['per-clima'] }] },
    { id: 'protocolos', n: 'Protocolos y reglas', a: [
      { t: 'Reglas de comunicación interna: qué va por reunión, qué por escrito y qué por mensaje', f: 1, sem: 1, ent: 'Normas de comunicación', resp: 'empresa', causa: ['inf-comunicacion'] },
      { t: 'Calendario maestro de proyectos con hitos y responsable', f: 1, sem: 2, ent: 'Calendario maestro', resp: 'empresa', causa: ['tie-proyectos', 'leg-cumplimiento'] },
      { t: 'Reglamento interno y protocolos de las situaciones que se repiten', f: 3, sem: 6, ent: 'Reglamento y protocolos', resp: 'consultor' }] },
    { id: 'informacion', n: 'Información y cuadro de mando', a: [
      { t: 'Cuadro de mando semanal con 8-12 indicadores y su semáforo', f: 2, sem: 3, ent: 'Cuadro de mando', resp: 'consultor', causa: ['inf-cuadro'] },
      { t: 'Revisión mensual de indicadores en la reunión de dirección', f: 3, sem: 2, ent: 'Ritual mensual', resp: 'empresa' }] },
    { id: 'diccionario', n: 'Diccionario corporativo', a: [
      { t: 'Diccionario corporativo: qué significa cada término, indicador y puesto en esta empresa', f: 4, sem: 4, ent: 'Diccionario corporativo', resp: 'consultor' }] },
    { id: 'libro', n: 'Libro y dossier de empresa', a: [
      { t: 'Libro corporativo: informes, procesos, reglas y decisiones en un solo documento', f: 4, sem: 4, ent: 'Libro corporativo', resp: 'consultor' },
      { t: 'Prueba de autonomía: una semana sin el empresario en la operativa', f: 4, sem: 1, ent: 'Informe de la prueba', resp: 'empresa' }] }
  ];
  D.linea = (id) => D.LINEAS.find((l) => l.id === id);

  /* ---------- Auditoría integral: qué se verifica en cada área y qué documentación pedir ---------- */
  D.VERIFICA = {
    gob: ['Escrituras, poderes y órgano de administración vigentes', 'Quién firma ante bancos y Administración', 'Actas o acuerdos de las últimas decisiones importantes', 'Agenda real del empresario de las dos últimas semanas', 'Objetivos escritos del año'],
    fin: ['Cuentas anuales de tres ejercicios y balance de sumas y saldos del año', 'Extractos bancarios y pólizas (límite, dispuesto y vencimiento)', 'Cuadro de préstamos, leasing y avales personales', 'Antigüedad de cobros y pagos', 'Previsión de tesorería (si existe)'],
    com: ['Facturación por cliente y producto de dos años', 'Tarifa vigente y descuentos', 'Margen por cliente y producto (o datos para calcularlo)', 'Embudo comercial y ofertas del último trimestre'],
    ope: ['Mapa de procesos o descripción del flujo de trabajo', 'Tiempos y capacidad por puesto o máquina', 'Inventario y rotación de stock', 'Incidencias, devoluciones y reprocesos'],
    per: ['Plantilla con puestos, antigüedad y coste', 'Organigrama real (no el formal)', 'Personas clave y quién las sustituye', 'Rotación y bajas del último año'],
    inf: ['Informes que se usan para decidir y cada cuánto llegan', 'Sistemas: ERP, TPV, hojas de cálculo', 'Canales de comunicación interna'],
    tie: ['Lista de proyectos abiertos con fecha y responsable', 'Calendario de vencimientos (impuestos, contratos, licencias)'],
    leg: ['Pacto de socios, contratos de participaciones y préstamos de socios', 'Avales personales firmados', 'Litigios, inspecciones y requerimientos abiertos', 'Licencias y permisos de actividad']
  };
  D.ESTADOS_V = { pend: 'Sin revisar', ok: 'Correcto', desv: 'Desviación', na: 'No aplica' };

  /* ---------- Sesiones del consultor ---------- */
  D.TIPOS_SESION = { contacto: 'Primera sesión (triaje)', auditoria: 'Auditoría integral', arranque: 'Arranque de la intervención', trabajo: 'Sesión de trabajo', seguimiento: 'Seguimiento', revision: 'Revisión de fase' };
})();
