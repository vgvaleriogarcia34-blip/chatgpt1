# Plan de ejecución: alineamiento del ecosistema

Sale de la auditoría de alineamiento del 3 de noviembre de 2026 (navegación, trazabilidad y flujos entre Atalaya, el asistente de IA, HubSpot y la web). Se trabaja **un punto cada vez**: se hace, se prueba, se publica y se marca aquí antes de pasar al siguiente.

Leyenda de estado: ☐ pendiente · ◐ en curso · ☑ hecho · ⏸ espera una decisión de Valerio.

---

## Fase 1 · Que no se pierda nada

### 1. ☑ Cambios desde varias pestañas (Atalaya)
- **Problema:** con la misma página abierta en dos pestañas, al guardar en una se borra lo escrito en la otra. Si se cambia de cliente en una pestaña, la otra sigue en el anterior.
- **Qué se hace:** cada dato guardado lleva su versión; antes de guardar se comprueba que nadie lo ha cambiado desde que se cargó. Si ha cambiado, se avisa («Hay cambios hechos en otra pestaña») y se ofrece recargar sin perder lo escrito. Las pestañas se escuchan entre sí y se actualizan solas cuando no hay nada sin guardar. Si cambia la empresa activa en otra pestaña, aviso y recarga.
- **Dónde:** `atalaya/js/platform.js` (guardado y empresa activa), y las páginas que guardan su estado completo (mesa, simulador, sistema estratégico, auditoría, personas).
- **Hecho cuando:** la prueba de dos pestañas de la auditoría ya no pierde la tarea; cambiar de cliente en una pestaña avisa en la otra; en modo servidor, el servidor rechaza una escritura con versión vieja.
- **Resultado (3 nov 2026):** combinación a tres bandas al guardar (las altas y cambios de los dos lados se conservan), aviso «Actualizar» en la pestaña visible y actualización automática al volver a una pestaña oculta. Empresa activa propia de cada pestaña: una pestaña que se quedó en un cliente ya no puede guardar en otro. El servidor entrega la versión de cada dato y responde 409 con lo guardado si se escribe sobre una versión vieja; el navegador lo combina y vuelve a guardar. Probado con dos pestañas en modo local y con servidor, y con dos equipos con la misma cuenta; regresión de todas las páginas sin errores.

### 2. ☑ Mesa de trabajo: un solo identificador por acción
- **Problema:** el plan de la auditoría y el del sistema estratégico llegan a la mesa por dos caminos con identificadores distintos: tareas duplicadas.
- **Qué se hace:** una única función que fabrica el identificador de origen de cada acción (mundo, empresa, tipo e id propio de la acción, nunca su texto ni su posición), usada por todos los envíos y por «Traer el trabajo del ecosistema». Al cargar, la mesa fusiona los duplicados que ya existan.
- **Dónde:** `atalaya/js/mesa-comun.js`, `js/mesa.js`, `js/intervencion/plan.js`, `js/strategy/consultor.js`, `js/strategy/plan.js`, `js/app.js`, `js/personas/liderazgo.js`.
- **Hecho cuando:** enviar y traer, en cualquier orden y varias veces, deja una sola tarea por acción en la empresa modelo; los duplicados antiguos desaparecen.
- **Resultado (3 nov 2026):** `A.mesa.oid(mundo, tipo, id)` en `mesa-comun.js` (p. ej. `intervencion:accion:<id>`, `estrategia:plan:<id>`, `simulador:palanca:<clave>`) y tabla de equivalencias de los oids antiguos; al cargar la mesa se traducen y se fusionan los duplicados (gana hecha > en curso > pendiente; se conservan notas y fecha). Todos los envíos y «Traer» usan el id propio; acuerdos, acciones del plan de empresa y objetivos del sistema estratégico que no tenían id lo reciben (estable). Probado en la empresa modelo y en una empresa con datos propios con duplicados antiguos: una tarea por acción.

### 3. ☑ Mesa de trabajo: el estado viaja en los dos sentidos
- **Problema:** cerrar una tarea en la mesa no cambia su origen, ni al revés.
- **Qué se hace:** al marcar hecha (o reabrir) una tarea con origen, se escribe en su origen; el origen muestra «en la mesa · hecha el …». Al cerrar en el origen, la tarea de la mesa se cierra. Las metas cumplidas cierran su objetivo en el tablero.
- **Hecho cuando:** en los cinco orígenes (simulador, sistema estratégico, personas, auditoría, objetivos), cerrar en un lado se ve en el otro tras recargar.
- **Resultado (3 nov 2026):** cerrar o reabrir en la mesa escribe en el origen (acción del plan de intervención, acuerdo, hito, acción del módulo y del plan de empresa; en simulador y personas, `mesaEstado`); cerrar en el origen cierra la tarea (`A.mesa.cerrar`). Cada origen muestra «En la mesa · hecha el …» y, donde no tenía estado propio (palancas, plan de desarrollo), una casilla «Hecha». Una meta cumplida marca `cumplido` en su objetivo (auditoría o plan de empresa). Probado en los cinco orígenes.

### 4. ☑ Mesa de trabajo: ir al origen y reenvíos que actualizan
- **Qué se hace:** enlace «Ir al origen» en cada tarea; el filtro de la bandeja incluye todos los mundos (también la auditoría integral); reenviar actualiza texto, fecha y responsable de las tareas abiertas y marca «ya no aplica» las que el origen ha retirado; el botón «Actualizar en la mesa» actualiza de verdad; fuera el HTML visible en los textos.
- **Hecho cuando:** cambiar los días de cobro y reenviar el plan de corrección deja la mesa con el plan nuevo; desde cualquier tarea se llega a su pantalla de origen.
- **Resultado (3 nov 2026):** «Ir al origen» en cada fila y en la ventana de edición (intervencion.html#plan/#sesiones/#objetivos/#guion, estrategia.html#<módulo>/#plan, personas.html#lid-plan/#lid-mapa, app.html#plan); filtro con todos los orígenes y filtro «Ya no aplican». Reenviar actualiza texto, fecha, responsable y área de las abiertas; con la lista completa de un origen, lo retirado queda «ya no aplica» (sin borrarse) y vuelve a abrirse si reaparece. «Actualizar en la mesa» actualiza de verdad y dice qué cambió; textos sin HTML. Probado cambiando los días de cobro y reenviando.

### 5. ☑ Asistente: avisos al equipo y transferencias con salida
- **Qué se hace:** aviso inmediato a Valerio (correo y, si hay plantilla aprobada, WhatsApp) cuando hay transferencia, urgencia, fallo técnico o reunión pendiente de confirmar. La transferencia, si nadie contesta en 25 s, vuelve al asistente, que dice que le devolverán la llamada y crea una tarea de prioridad alta.
- **Dónde:** `asistente-fe/src/voz/twilio.js`, `src/voz/rutas.js`, nuevo `src/avisos.js`, `src/crm/hubspot.js`.
- **Hecho cuando:** las pruebas simulan cada caso y comprueban el aviso y la tarea.
- **Resultado (3 nov 2026):** nuevo `src/avisos.js` (correo por SMTP propio, sin dependencias, en `src/correo.js`, y WhatsApp con la plantilla `WHATSAPP_PLANTILLA_AVISO_EQUIPO`) en transferencia sin respuesta o imposible, urgencia (`registrar_nota` con `urgente`), fallo de voz o de WhatsApp, sesión pendiente de confirmar y baja. La transferencia lleva `<Dial action="/voz/transferencia-fin">`: si nadie contesta, se le dice que le devolverán la llamada, tarea de prioridad alta en HubSpot y aviso; queda registrado si se atendió. El fallo de Claude deja la disculpa en la transcripción; en WhatsApp la disculpa solo se anota si se envió. Pruebas en `test/avisos.test.js` y `test/voz.test.js`.

### 6. ◐ Un solo responsable de los datos y la privacidad del asistente
- **Decisión de Valerio:** qué sociedad es la responsable (la web dice AKOMPANO GROUP, S.L., nombre comercial Business Avance) y con qué marca se presenta el asistente (Familias Empresarias o Business Avance).
- **Qué se hace después:** mismo responsable en la web de Atalaya, sus textos legales y el asistente; apartado «Asistente telefónico y WhatsApp» en la política de privacidad (finalidades, bases, proveedores, plazos, cómo oponerse) que el asistente cita y puede enviar.
- **Hecho cuando:** los tres sistemas nombran al mismo responsable y la política cubre llamadas, transcripción y proveedores. Revisión final con su abogado.
- **Resultado (asistente, 3 nov 2026):** la asistente se presenta como «Lucía, la asistente de inteligencia artificial de Familias Empresarias, de Business Avance», nombra a AKOMPANO GROUP, S.L. (NIF B05544713) si le preguntan y ofrece enviar por WhatsApp la política (`URL_PRIVACIDAD`). Borrador del apartado «Asistente telefónico y WhatsApp» en `asistente-fe/datos/interno/privacidad-asistente.md` (copia para el equipo legal en el scratchpad `alineamiento/privacidad-asistente.md`), pendiente del abogado. Falta: incorporarlo a la web de Atalaya (equipo legal).
- **Resultado, parte de Atalaya (3 nov 2026):** aviso legal, privacidad, cookies y condiciones nombran a AKOMPANO GROUP, S.L. (NIF B05544713, C/ Fernández Ardavín 6, 6º, 30001 Murcia, servicios@akompanogroup.es, datos de la política publicada en businessavance.es); registro y DPO siguen [PENDIENTE]. Nuevo apartado `privacidad.html#asistente` «Asistente telefónico y WhatsApp de Familias Empresarias» (finalidades, bases, encargados Twilio, Deepgram, ElevenLabs, Anthropic, Meta, HubSpot y Google, transcripción y grabación opcional con aviso, plazos propuestos, oposición y lista de exclusión), HubSpot como proveedor y RGPD.md con los nuevos tratamientos. Todo sigue como borrador para el abogado. Falta la parte del asistente (que cite y envíe ese enlace).

---

## Fase 2 · Que todo diga lo mismo

### 7. ☑ La primera reunión, igual en todas partes
- **Decisión de Valerio:** nombre (propuesta: «sesión estratégica»), duración (30 o 60 minutos) y con quién.
- **Qué se hace:** el mismo nombre, duración y persona en la web, Atalaya, el asistente, el evento de Google Calendar y el negocio de HubSpot.
- **Resultado (asistente, 3 nov 2026):** «sesión estratégica», 60 minutos (`REUNION_MINUTOS`), con Valerio García, sin coste, en las instrucciones, el conocimiento, el evento de Google Calendar («Sesión estratégica · empresa»), la reunión y el negocio de HubSpot («empresa · sesión estratégica»). Sin «diagnóstico» para la reunión gratuita y sin instrucciones en inglés.
- **Resultado (Atalaya, 3 nov 2026):** la landing («O una sesión estratégica de 60 minutos con Valerio García, de Business Avance: sin coste y sin compromiso», botón «Concertar la sesión estratégica»), el formulario de solicitud de `platform.js` (título, texto, botón y confirmación; ahora envía `tipo: 'sesion'` y llega como plan «sesion») y el manual dicen lo mismo.

### 8. ☑ Nota, triaje y valoración calculados desde los datos guardados
- **Qué se hace:** la nota de cada mundo, el triaje y la valoración se calculan a partir de lo guardado, sin esperar a que se abra su página, y muestran su fecha. Una sola valoración con los mismos parámetros en todos los mundos. «Deuda sobre EBITDA» dice si es hoy o tras invertir.
- **Hecho cuando:** la misma empresa da la misma nota en todas las páginas desde la primera carga; el tablero muestra el triaje sin abrir la auditoría; el valor coincide en el sistema estratégico y la cartera.
- **Resultado (cifras, 3 nov 2026):** la nota de cada mundo sale de sus datos guardados en cualquier página (`js/calculo-mundos.js` carga sin pantalla solo el motor del simulador o del sistema estratégico cuando sus datos han cambiado; el resultado se guarda en «nota» con la firma de los datos y la fecha de cálculo). Empresa modelo 6,8 y una empresa con las preguntas respondidas 3,8 en tablero, simulador, estrategia, mesa, personas y cartera desde la primera carga. Triaje común en `js/triaje.js` (mismo resultado que la auditoría, comprobado), visible en el tablero y la cartera sin abrir la auditoría. Una valoración (`A.valoracionParametros`/`A.valoracionDe` en `valoracion-core.js`) para estrategia y cartera. «Deuda sobre EBITDA» dice «hoy» (cifras) o «tras la inversión» (simulador, nota y prioridades). Contadores de la tarjeta del sistema estratégico iguales (una franja por comprobación). Las cifras de las preguntas llevan su fecha de introducción y la propuesta guarda la fecha de su foto y avisa con «Actualizar cifras».

### 9. ☑ Libro corporativo: avisa de todo capítulo desactualizado
- **Qué se hace:** los capítulos que usan cifras del simulador se marcan como desactualizados cuando cambian esas cifras; el libro puede recoger también el tablero y la cartera.
- **Resultado (cifras, 3 nov 2026):** la firma de cada capítulo («v2.») incluye lo que usa: el sistema estratégico, la simulación entera; la auditoría, las cifras de la empresa (`js/cifras.js`); el tablero, todos los mundos; la cartera, las empresas de la cuenta. Las firmas de antes se siguen comparando como se guardaron. Al cambiar las ventas, los capítulos de estrategia, auditoría y tablero salen «desactualizado» y el de la mesa no. «Al recoger, incluir también»: tablero general y, con Consultora o Grupos, cartera de clientes (cada uno en su sección).

### 10. ☑ Objetivos con identificador único
- **Qué se hace:** un objetivo nace con su identificador (en la auditoría, el plan de empresa o la mesa) y viaja con él; nada lo vuelve a crear con otro texto. Las causas que ya tienen meta no se vuelven a ofrecer.
- **Hecho cuando:** «Bajar los días de cobro de 86 a 65» aparece una sola vez en el tablero y en la mesa.
- **Resultado, parte del tablero (cifras, 3 nov 2026):** `prioridad.js` junta los objetivos de la auditoría y las metas de la mesa por su identificador (`objetivoId`/oid de `js/mesa-comun.js`) o, si no lo tienen, por indicador y valores; una meta cumplida da su objetivo por cumplido (verde, sin sumar a las prioridades). En el tablero de la empresa modelo «Bajar los días de cobro de 86 a 65» sale una vez («Auditoría y mesa»).
- **Resultado (3 nov 2026):** cada objetivo lleva `objetivoId` (el de la auditoría, `intervencion:objetivo:<id>`, viaja al plan de empresa y a la meta de la mesa); «Objetivos por prioridad» une lo que comparte identificador, rellena «En la mesa» y ya no ofrece las causas que tienen meta. En la mesa aparece una vez. Falta que el tablero (equipo «cifras», `js/prioridad.js`) deduplique por `objetivoId` y descarte los objetivos con `cumplido`.

### 11. ☑ Manual lateral en su sitio y un nombre por mundo
- **Qué se hace:** el manual abre en el apartado de la zona visible (simulador, tablero, libro, cartera); el selector del manual coincide con lo que muestra; la cartera se llama igual en título, barra y botón (sale de la lista común de mundos).
- **Resultado (3 nov 2026):** el manual abre en el capítulo abierto del simulador (o el visible con «Ver todo seguido»), en «Tablero general» en el tablero, en «Libro corporativo» en el libro y en «Varias empresas: cartera de clientes y vista de grupo» en la cartera; el menú de arriba marca siempre el apartado mostrado (también los que no tienen entrada propia) y ya no se queda en «Qué es Atalaya». La cartera se llama igual en título, marca y botón «Mundos» en Consultora; en planes de una empresa, la página muestra el aviso común. El asistente usa la misma regla para saber en qué capítulo está.

### 12. ☑ Botón atrás coherente
- **Qué se hace:** una entrada de historial por capítulo, módulo o paso en el simulador, el sistema estratégico y la auditoría; atrás y adelante recorren lo visitado dentro del mundo.
- **Resultado (3 nov 2026):** una entrada de historial por capítulo (simulador), módulo (sistema estratégico) y paso (auditoría integral); la entrada al llegar se sustituye y atrás/adelante restauran la vista sin crear entradas nuevas. Corregido el salto que devolvía al capítulo anterior al pulsar atrás (los reintentos de desplazamiento de `app.js` comprueban que el capítulo sigue siendo el de la dirección). Probado: horizonte → atrás inversión → atrás empresa → adelante inversión; cobros → ventas → tablero → ventas; s1cierre → constantes → guion → constantes.

### 13. ☑ Un solo componente de bloqueo por plan
- **Qué se hace:** el mismo aviso, de usted, con «Volver» y «Ver planes», en todas las páginas y en los planetas; la auditoría integral aparece en lo que incluye Consultora (panel y landing); fuera el enlace a la cartera en planes de una empresa.
- **Resultado (3 nov 2026):** `P.bloqueo(mundo, zona)` en `platform.js`: el mismo aviso, de usted, con «Ver planes» y «Volver» (y «Contactar con nuestro equipo» en la cartera), en el sistema estratégico (Esencial), personas, auditoría integral y cartera, y en ventana al tocar un mundo bloqueado en los planetas, la lista de abajo o el botón «Mundos». Las etiquetas 3D bloqueadas dicen «Ver planes →». La auditoría integral figura en lo que incluye Consultora (panel de planes, resumen y landing). En planes de una empresa el selector dice «Su empresa», sin «Holding», sin «Ha llegado al máximo» y sin enlace a la cartera.

### 14. ☑ Primera visita del consultor
- **Qué se hace:** en Consultora, una sola tarjeta: «Dar de alta su primer cliente»; la empresa elegida se recuerda y el paso 1 no vuelve a tapar los planetas; «Cómo empezar» en el menú de la cuenta.
- **Resultado (3 nov 2026):** en Consultora sale una sola tarjeta («Dar de alta su primer cliente», «Ver el ejemplo», «Decidir más tarde») y no el mapa a la vez; dar de alta abre la ficha (con datos reales por defecto) y entra con ese cliente sin tocar la empresa principal. La empresa elegida se recuerda en el navegador para la cuenta y el paso 1 no vuelve en cada sesión. El paseo virtual desde el mapa cierra el mapa y entra con la empresa modelo. «Cómo empezar» en el menú de la cuenta vuelve a abrir la tarjeta.

### 15. ☑ Nombres y cifras coherentes en textos
- **Qué se hace:** «tres mundos» y «21 módulos» de la landing, «Inicio» frente a «Puesto de mando», teclas del puesto de mando, botón «Probar 14 días» en el manual, dónde están mesa, tablero y libro según el manual.
- **Resultado (3 nov 2026):** landing con «Los mundos», cuatro mundos principales más mesa, tablero, libro y cartera, «22 módulos en cinco áreas» y una tarjeta de la auditoría integral; «Puesto de mando» en título, marca y asistente; la pista de teclas cuenta los mundos de la lista (7 u 8); manual con «Probar 14 días», mesa, tablero y libro en «Mundos» y la primera visita de Consultora; todos los títulos «Atalaya 360° · …»; marca del simulador «Simulador de inversión»; la principal de Consultora ya no figura como «Holding» en el selector; los clientes nuevos empiezan con datos reales (sin los 4,2 M€ de ejemplo).

---

## Fase 3 · Un solo hilo por cliente

### 16. ☑ Las solicitudes de Atalaya llegan a HubSpot
- **Qué se hace:** el formulario de contacto y las solicitudes de sesión o activación de Atalaya crean o actualizan el contacto en HubSpot, con una tarea y su origen. Una sola bandeja de interesados.
- **Resultado (3 nov 2026):** el servidor envía a HubSpot (API v3, `HUBSPOT_TOKEN`; sin él no hace nada) cada alta, contacto, solicitud de sesión estratégica, de activación y de cambio de plan: contacto por correo o teléfono, empresa por dominio o nombre, nota con el origen y tarea para `HUBSPOT_OWNER_ID`. En segundo plano y en fila, con reintentos ante 429; un reenvío no duplica (ni la solicitud en Atalaya ni la nota o la tarea). Los ids de HubSpot quedan en la cuenta y en la solicitud. Probado con un HubSpot falso.

### 17. ◐ Identificadores cruzados y alta en Atalaya desde HubSpot
- **Qué se hace:** la ficha de empresa de Atalaya guarda el id de HubSpot y el CIF; HubSpot guarda la cuenta de Atalaya; desde un negocio de HubSpot (o el panel del asistente) se envía la invitación de alta en Atalaya con nombre y empresa ya rellenos.
- **Fuentes de verdad:** HubSpot para la relación comercial, Atalaya para los datos de la empresa cliente, el asistente para la operación y el cumplimiento.
- **Resultado (asistente, 3 nov 2026):** el asistente guarda el id de la empresa en HubSpot (`hubspot_company_id`) y la ficha del panel tiene «Invitar a Atalaya» (`POST /api/integracion/invitar` con `INTEGRACION_TOKEN`). Falta la parte de Atalaya y la de HubSpot.
- **Resultado, parte del servidor (3 nov 2026):** el registro `empresas` acepta `cif` y `hubspotId`; `POST /api/integracion/invitar` (Bearer `INTEGRACION_TOKEN`, tiempo constante, 404 sin configurar, límite por IP) crea la cuenta en prueba con nombre, empresa, teléfono y la ficha principal con `hubspotId`, y envía el enlace de alta (lo devuelve solo si no hay correo). La cuenta guarda `hubspotContactId` y `hubspotCompanyId`. Falta: el campo en la ficha (equipo «navegacion») y el botón en HubSpot o el panel del asistente.
- **Resultado, ficha (3 nov 2026):** la ficha de empresa tiene «CIF o NIF» e «ID de empresa en HubSpot» (opcional, con ayuda breve); se guardan en el registro `empresas` como `cif` (en mayúsculas) y `hubspotId` (sin espacios).

### 18. ◐ Las reuniones del asistente en la mesa de trabajo
- **Qué se hace:** la mesa de Atalaya muestra las reuniones agendadas por el asistente para esa empresa (desde el calendario o a través del puente del punto 17).
- **Resultado (asistente, 3 nov 2026):** al reservar una sesión, el asistente envía `POST {ATALAYA_URL}/api/integracion/reunion` con el contrato común (sin `ATALAYA_URL`/`INTEGRACION_TOKEN` no hace nada; resultado en eventos). Las peticiones sin agenda conectada no se envían (quedan por confirmar). Falta la parte de Atalaya.
- **Resultado, parte de Atalaya (3 nov 2026):** `POST /api/integracion/reunion` busca la empresa por `hubspotId` de la ficha, por los ids de la cuenta o por correo, y añade a su mesa (`agenda` o `agenda--<empresa>`) la tarea «Sesión estratégica con … (…)», tipo reunión, hora local, con `oid` `asistente:reunion:<id>`: idempotente y actualiza si cambia la hora. La escritura cambia la versión del dato y la pestaña abierta lo combina. Registro de actividad y documentación en PUESTA-EN-MARCHA.md. Falta que el asistente la llame al agendar.

### 19. ☑ Panel del asistente para el día a día
- **Qué se hace:** ficha por contacto con toda su cronología y enlace a HubSpot; bandeja «requiere acción» (reuniones por confirmar, transferencias sin atender, fallos); búsqueda, filtros y exportación CSV (también de los contactos a escribir por correo o LinkedIn); enlace a la grabación; estado de las integraciones; textos legibles en lugar de códigos y móvil sin columnas cortadas.
- **Resultado (3 nov 2026):** pestañas Requiere acción (con contador), Contactos (ficha con cronología, enlace a HubSpot, invitar a Atalaya, baja) e Integraciones (configurada y si responde); búsqueda y filtros por texto, canal, resultado y fechas; CSV de conversaciones, contactos y sin base legal («;», BOM, fórmulas neutralizadas); grabación desde el aviso de Twilio; las sesiones por confirmar no cuentan como agendadas; textos legibles; a 390 px las tablas pasan a tarjetas y las pestañas no se esconden (comprobado con Playwright en todas las vistas). Pruebas en `test/panel-dia.test.js`.

### 20. ☑ Bajas compartidas y conservación en el asistente
- **Qué se hace:** las bajas del panel llegan a HubSpot; una oposición por correo bloquea también por teléfono; purga de datos al vencer los plazos de `CUMPLIMIENTO.md`; la importación avisa de los contactos que nunca se llamarán y la campaña avisa si la prospección está apagada; «volver a llamar» respeta la hora pedida.
- **Resultado (3 nov 2026):** bajas del panel a HubSpot; una baja por correo bloquea el teléfono del contacto y al revés; purga diaria (`src/conservacion.js`) con los plazos documentados en `CUMPLIMIENTO.md` §6.3; la importación avisa de los que no se llamarán nunca; la campaña avisa si la prospección está apagada; «volver a llamar» usa la fecha pedida en `finalizar`; la campaña de origen queda en HubSpot (`fe_campana`). Pruebas en `test/prospeccion.test.js`, `test/conservacion.test.js` y `test/crm.test.js`.

### 21. ☑ Asistente guía y manual en todas las páginas
- **Qué se hace:** asistente en el puesto de mando, tablero, libro y cartera (y que sepa ir al tablero); manual lateral en el puesto de mando; barra común en el manual a página completa.
- **Resultado (3 nov 2026):** el asistente arranca solo en el puesto de mando, el tablero, el libro y la cartera (con sus sugerencias y saludo), conoce el tablero («llévame al tablero») y llama «cartera de clientes» a la vista de grupo en Consultora; el manual lateral está en el puesto de mando (también el «Manual» del espacio); `manual.html` a página completa lleva la barra común (botón «Mundos», en el móvil «Menú», empresa y cuenta). Probado a 1440 y 390 px.

### 22. ☐ Prueba conjunta y nueva auditoría
- **Qué se hace:** repetir las tres auditorías y comparar las notas con las de partida (navegación 5,7 · trazabilidad 5,1 · asistente 4,6 · alineamiento 4,0).
