# Plan de ejecución: alineamiento del ecosistema

Sale de la auditoría de alineamiento del 3 de noviembre de 2026 (navegación, trazabilidad y flujos entre Atalaya, el asistente de IA, HubSpot y la web). Se trabaja **un punto cada vez**: se hace, se prueba, se publica y se marca aquí antes de pasar al siguiente.

Leyenda de estado: ☐ pendiente · ◐ en curso · ☑ hecho · ⏸ espera una decisión de Valerio.

---

## Fase 1 · Que no se pierda nada

### 1. ☐ Cambios desde varias pestañas (Atalaya)
- **Problema:** con la misma página abierta en dos pestañas, al guardar en una se borra lo escrito en la otra. Si se cambia de cliente en una pestaña, la otra sigue en el anterior.
- **Qué se hace:** cada dato guardado lleva su versión; antes de guardar se comprueba que nadie lo ha cambiado desde que se cargó. Si ha cambiado, se avisa («Hay cambios hechos en otra pestaña») y se ofrece recargar sin perder lo escrito. Las pestañas se escuchan entre sí y se actualizan solas cuando no hay nada sin guardar. Si cambia la empresa activa en otra pestaña, aviso y recarga.
- **Dónde:** `atalaya/js/platform.js` (guardado y empresa activa), y las páginas que guardan su estado completo (mesa, simulador, sistema estratégico, auditoría, personas).
- **Hecho cuando:** la prueba de dos pestañas de la auditoría ya no pierde la tarea; cambiar de cliente en una pestaña avisa en la otra; en modo servidor, el servidor rechaza una escritura con versión vieja.

### 2. ☐ Mesa de trabajo: un solo identificador por acción
- **Problema:** el plan de la auditoría y el del sistema estratégico llegan a la mesa por dos caminos con identificadores distintos: tareas duplicadas.
- **Qué se hace:** una única función que fabrica el identificador de origen de cada acción (mundo, empresa, tipo e id propio de la acción, nunca su texto ni su posición), usada por todos los envíos y por «Traer el trabajo del ecosistema». Al cargar, la mesa fusiona los duplicados que ya existan.
- **Dónde:** `atalaya/js/mesa-comun.js`, `js/mesa.js`, `js/intervencion/plan.js`, `js/strategy/consultor.js`, `js/strategy/plan.js`, `js/app.js`, `js/personas/liderazgo.js`.
- **Hecho cuando:** enviar y traer, en cualquier orden y varias veces, deja una sola tarea por acción en la empresa modelo; los duplicados antiguos desaparecen.

### 3. ☐ Mesa de trabajo: el estado viaja en los dos sentidos
- **Problema:** cerrar una tarea en la mesa no cambia su origen, ni al revés.
- **Qué se hace:** al marcar hecha (o reabrir) una tarea con origen, se escribe en su origen; el origen muestra «en la mesa · hecha el …». Al cerrar en el origen, la tarea de la mesa se cierra. Las metas cumplidas cierran su objetivo en el tablero.
- **Hecho cuando:** en los cinco orígenes (simulador, sistema estratégico, personas, auditoría, objetivos), cerrar en un lado se ve en el otro tras recargar.

### 4. ☐ Mesa de trabajo: ir al origen y reenvíos que actualizan
- **Qué se hace:** enlace «Ir al origen» en cada tarea; el filtro de la bandeja incluye todos los mundos (también la auditoría integral); reenviar actualiza texto, fecha y responsable de las tareas abiertas y marca «ya no aplica» las que el origen ha retirado; el botón «Actualizar en la mesa» actualiza de verdad; fuera el HTML visible en los textos.
- **Hecho cuando:** cambiar los días de cobro y reenviar el plan de corrección deja la mesa con el plan nuevo; desde cualquier tarea se llega a su pantalla de origen.

### 5. ☐ Asistente: avisos al equipo y transferencias con salida
- **Qué se hace:** aviso inmediato a Valerio (correo y, si hay plantilla aprobada, WhatsApp) cuando hay transferencia, urgencia, fallo técnico o reunión pendiente de confirmar. La transferencia, si nadie contesta en 25 s, vuelve al asistente, que dice que le devolverán la llamada y crea una tarea de prioridad alta.
- **Dónde:** `asistente-fe/src/voz/twilio.js`, `src/voz/rutas.js`, nuevo `src/avisos.js`, `src/crm/hubspot.js`.
- **Hecho cuando:** las pruebas simulan cada caso y comprueban el aviso y la tarea.

### 6. ⏸ Un solo responsable de los datos y la privacidad del asistente
- **Decisión de Valerio:** qué sociedad es la responsable (la web dice AKOMPANO GROUP, S.L., nombre comercial Business Avance) y con qué marca se presenta el asistente (Familias Empresarias o Business Avance).
- **Qué se hace después:** mismo responsable en la web de Atalaya, sus textos legales y el asistente; apartado «Asistente telefónico y WhatsApp» en la política de privacidad (finalidades, bases, proveedores, plazos, cómo oponerse) que el asistente cita y puede enviar.
- **Hecho cuando:** los tres sistemas nombran al mismo responsable y la política cubre llamadas, transcripción y proveedores. Revisión final con su abogado.

---

## Fase 2 · Que todo diga lo mismo

### 7. ⏸ La primera reunión, igual en todas partes
- **Decisión de Valerio:** nombre (propuesta: «sesión estratégica»), duración (30 o 60 minutos) y con quién.
- **Qué se hace:** el mismo nombre, duración y persona en la web, Atalaya, el asistente, el evento de Google Calendar y el negocio de HubSpot.

### 8. ☐ Nota, triaje y valoración calculados desde los datos guardados
- **Qué se hace:** la nota de cada mundo, el triaje y la valoración se calculan a partir de lo guardado, sin esperar a que se abra su página, y muestran su fecha. Una sola valoración con los mismos parámetros en todos los mundos. «Deuda sobre EBITDA» dice si es hoy o tras invertir.
- **Hecho cuando:** la misma empresa da la misma nota en todas las páginas desde la primera carga; el tablero muestra el triaje sin abrir la auditoría; el valor coincide en el sistema estratégico y la cartera.

### 9. ☐ Libro corporativo: avisa de todo capítulo desactualizado
- **Qué se hace:** los capítulos que usan cifras del simulador se marcan como desactualizados cuando cambian esas cifras; el libro puede recoger también el tablero y la cartera.

### 10. ☐ Objetivos con identificador único
- **Qué se hace:** un objetivo nace con su identificador (en la auditoría, el plan de empresa o la mesa) y viaja con él; nada lo vuelve a crear con otro texto. Las causas que ya tienen meta no se vuelven a ofrecer.
- **Hecho cuando:** «Bajar los días de cobro de 86 a 65» aparece una sola vez en el tablero y en la mesa.

### 11. ☐ Manual lateral en su sitio y un nombre por mundo
- **Qué se hace:** el manual abre en el apartado de la zona visible (simulador, tablero, libro, cartera); el selector del manual coincide con lo que muestra; la cartera se llama igual en título, barra y botón (sale de la lista común de mundos).

### 12. ☐ Botón atrás coherente
- **Qué se hace:** una entrada de historial por capítulo, módulo o paso en el simulador, el sistema estratégico y la auditoría; atrás y adelante recorren lo visitado dentro del mundo.

### 13. ☐ Un solo componente de bloqueo por plan
- **Qué se hace:** el mismo aviso, de usted, con «Volver» y «Ver planes», en todas las páginas y en los planetas; la auditoría integral aparece en lo que incluye Consultora (panel y landing); fuera el enlace a la cartera en planes de una empresa.

### 14. ☐ Primera visita del consultor
- **Qué se hace:** en Consultora, una sola tarjeta: «Dar de alta su primer cliente»; la empresa elegida se recuerda y el paso 1 no vuelve a tapar los planetas; «Cómo empezar» en el menú de la cuenta.

### 15. ☐ Nombres y cifras coherentes en textos
- **Qué se hace:** «tres mundos» y «21 módulos» de la landing, «Inicio» frente a «Puesto de mando», teclas del puesto de mando, botón «Probar 14 días» en el manual, dónde están mesa, tablero y libro según el manual.

---

## Fase 3 · Un solo hilo por cliente

### 16. ☐ Las solicitudes de Atalaya llegan a HubSpot
- **Qué se hace:** el formulario de contacto y las solicitudes de sesión o activación de Atalaya crean o actualizan el contacto en HubSpot, con una tarea y su origen. Una sola bandeja de interesados.

### 17. ☐ Identificadores cruzados y alta en Atalaya desde HubSpot
- **Qué se hace:** la ficha de empresa de Atalaya guarda el id de HubSpot y el CIF; HubSpot guarda la cuenta de Atalaya; desde un negocio de HubSpot (o el panel del asistente) se envía la invitación de alta en Atalaya con nombre y empresa ya rellenos.
- **Fuentes de verdad:** HubSpot para la relación comercial, Atalaya para los datos de la empresa cliente, el asistente para la operación y el cumplimiento.

### 18. ☐ Las reuniones del asistente en la mesa de trabajo
- **Qué se hace:** la mesa de Atalaya muestra las reuniones agendadas por el asistente para esa empresa (desde el calendario o a través del puente del punto 17).

### 19. ☐ Panel del asistente para el día a día
- **Qué se hace:** ficha por contacto con toda su cronología y enlace a HubSpot; bandeja «requiere acción» (reuniones por confirmar, transferencias sin atender, fallos); búsqueda, filtros y exportación CSV (también de los contactos a escribir por correo o LinkedIn); enlace a la grabación; estado de las integraciones; textos legibles en lugar de códigos y móvil sin columnas cortadas.

### 20. ☐ Bajas compartidas y conservación en el asistente
- **Qué se hace:** las bajas del panel llegan a HubSpot; una oposición por correo bloquea también por teléfono; purga de datos al vencer los plazos de `CUMPLIMIENTO.md`; la importación avisa de los contactos que nunca se llamarán y la campaña avisa si la prospección está apagada; «volver a llamar» respeta la hora pedida.

### 21. ☐ Asistente guía y manual en todas las páginas
- **Qué se hace:** asistente en el puesto de mando, tablero, libro y cartera (y que sepa ir al tablero); manual lateral en el puesto de mando; barra común en el manual a página completa.

### 22. ☐ Prueba conjunta y nueva auditoría
- **Qué se hace:** repetir las tres auditorías y comparar las notas con las de partida (navegación 5,7 · trazabilidad 5,1 · asistente 4,6 · alineamiento 4,0).
