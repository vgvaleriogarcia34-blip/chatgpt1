# Atalaya 360° · Protección de datos (RGPD)

> **Borrador pendiente de validación jurídica.** Este documento describe lo que hace hoy el código de Atalaya 360° (octubre de 2026) para que un abogado lo revise. No es un dictamen. Los datos entre corchetes están pendientes: [RAZÓN SOCIAL], [NIF], [DOMICILIO], [DATOS REGISTRALES], [EMAIL DE CONTACTO], [DELEGADO DE PROTECCIÓN DE DATOS, si procede], [PROVEEDOR DE ALOJAMIENTO], [PROVEEDOR DE CORREO], [PROVEEDOR DE PAGOS].

Páginas públicas relacionadas: `aviso-legal.html`, `privacidad.html`, `cookies.html`, `condiciones.html`.

---

## 1. Roles

| Datos | Responsable | Encargado | Subencargados |
|---|---|---|---|
| Cuentas de cliente, contactos comerciales, seguridad del acceso | Business Avance ([RAZÓN SOCIAL]) | — | Alojamiento, correo, pagos |
| Datos de empresa que carga el cliente (incluidos datos personales de socios, clientes, empleados, transcripciones) | El cliente | Business Avance | Alojamiento, Anthropic (si se usa la IA), correo |
| Personas y equipos: plantilla de una empresa cliente de una consultora (plan Consultora) | La empresa cliente (empleadora) | La firma consultora titular de la cuenta | Business Avance (proveedor de la aplicación) y, por debajo, alojamiento y correo |
| Personas y equipos cuando la propia empresa usa la aplicación sin consultor | La empresa | Business Avance | Alojamiento, correo |

Con clave de API propia del cliente (configurada en el navegador, `js/conexiones.js`), la petición va del navegador del cliente a Anthropic directamente: Anthropic no es entonces subencargado de Business Avance sino proveedor del cliente. **[VALIDAR]**

---

## 2. Registro de actividades de tratamiento (art. 30) · borrador

### 2.1 Como responsable (art. 30.1)

**A. Clientes y cuentas**
- Finalidad: alta y gestión de la cuenta, prueba de 14 días, control de acceso pagado, cambios de plan, soporte, cuota diaria de IA.
- Base: ejecución del contrato (6.1.b).
- Interesados: clientes (personas de contacto de empresas y consultoras).
- Datos (`server/server.mjs`, `POST /api/register` y gestor de usuarios): nombre, correo, empresa, teléfono, hash scrypt de la contraseña con sal, plan, periodo, estado, fecha de alta, último acceso, número de sesiones, `uso` (latidos por día), `usoIA` (últimos 60 días) e `iaTotal`, pagos registrados (fecha, importe, meses, referencia), notas de la administración, solicitudes de pago o de cambio de plan.
- Destinatarios: alojamiento, correo (enlaces de contraseña y de acceso concedido), [PROVEEDOR DE PAGOS].
- Transferencias: ninguna por este tratamiento salvo la ubicación del alojamiento o del correo. **[CONFIRMAR]**
- Plazo: mientras exista la cuenta. No hay borrado automático de cuentas de prueba caducadas ni de cuentas inactivas. **[PENDIENTE: fijar plazo]**
- Medidas: ver 2.3.

**B. Solicitudes de contacto** (formulario de sesión y del plan Grupos, `POST /api/contacto`)
- Finalidad: responder a la solicitud.
- Base: medidas precontractuales a petición del interesado (6.1.b). **[VALIDAR]**
- Datos: nombre, correo, teléfono, empresa, nº de personas o de sociedades, mensaje, origen, fecha.
- Plazo implementado: se guardan las 500 más recientes (`db.contactos.slice(0, 500)`); se borran con la cuenta asociada. **[PENDIENTE: plazo máximo, p. ej. 12 meses sin relación]**

**C. Seguridad del acceso**
- Finalidad: limitar intentos (login, registro, contraseña olvidada, contacto, test por enlace).
- Base: interés legítimo (6.1.f).
- Datos: IP y correo como clave de contadores **en memoria** (`intentos`), con ventana de 15 a 60 minutos; se limpian cada 10 minutos. No se guardan en disco.

### 2.2 Como encargado (art. 30.2)

**D. Datos de empresa del cliente**
- Categorías: datos económicos y financieros, ficha societaria (CIF, socios y participaciones), organigrama, agenda, notas, libro corporativo, auditoría integral (incluye transcripciones de sesiones con el empresario y documentos adjuntos).
- Tratamientos: almacenamiento (`/api/data/:clave`), cálculo en el navegador, envío a Anthropic cuando el usuario usa funciones de IA (`/api/chat`, `/api/extract`, `/api/escucha`, `/api/mercado/actualizar`, y desde el navegador `A.ia.texto/json` en `js/intervencion/*` y `js/mesa.js`).
- Transferencias: Anthropic, PBC (EE. UU.). **[MECANISMO: DPF o cláusulas contractuales tipo; revisar el DPA de Anthropic y su política de conservación de la API]**

**E. Personas y equipos (plan Consultora)**
- Interesados: empleados de la empresa cliente.
- Datos en el estado `personas` (por empresa): nombre, puesto, área, responsable, correo (opcional), resultados y respuestas de DISC, aportaciones, eneagrama, estilo de liderazgo, estilo percibido (`lid.percibido`, con `de` opcional en la entrada manual), preparación por tarea, consentimiento y su fecha, envíos por código. Solo con la lectura de identidad activada: fecha de nacimiento y nombre completo.
- Datos en el servidor por invitación (`db.invitaciones`): empresa, nombre, correo, test, tarea, líder, estado, fechas (creado, abierto, actualizado, completado, importada), respuestas, `consent` (fecha), `ip` de la última respuesta guardada (se borra al importar), `identidad` (si la empresa tiene activada la lectura de identidad) y `nacimiento` (solo se acepta si `identidad` está activado). En «Cómo le ve su equipo» (lid360), al completarse, las respuestas pasan a una bolsa sin nombres por persona evaluada (`db.lid360`) y se borran de la invitación `resp`, `de` e `ip`.
- No se envían a la IA (comprobado: ningún módulo de `js/personas/` llama a `A.ia`; el asistente no lee los datos de este mundo).
- Base: la decide la empresa responsable; la aplicación recoge el consentimiento de cada persona. **[VALIDAR: el consentimiento del trabajador frente a su empleador puede no ser libre (Considerando 43 RGPD, Directrices 05/2020 del CEPD); valorar interés legítimo con evaluación de impacto o que la participación sea realmente voluntaria y sin consecuencias]**

### 2.3 Medidas de seguridad implementadas (art. 32)
- Contraseñas con scrypt y sal; comparación en tiempo constante.
- Cookie de sesión `atalaya_sid` HttpOnly, SameSite=Lax, 30 días, `Secure` con `COOKIE_SECURE=1`; sesiones guardadas por su SHA-256.
- Enlaces de los test derivados de un secreto del servidor (HMAC); en `db.json` solo su hash.
- Carpeta de datos fuera de la web, permisos 0700 y fichero 0600; escritura atómica; 7 copias diarias rotatorias.
- Política de contenidos (CSP), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS con `COOKIE_SECURE=1`.
- Límites de intentos y de tamaño de datos por cuenta; cuota diaria de IA.
- Pendiente: cifrado en reposo del disco (depende del alojamiento), registro de accesos del personal, procedimiento de brechas (arts. 33-34). **[PENDIENTE]**

---

## 3. Subencargados

| Subencargado | Servicio | Datos | Ubicación | Garantía |
|---|---|---|---|---|
| [PROVEEDOR DE ALOJAMIENTO] | Servidor y disco | Todos | [PAÍS] | [DPA] |
| Anthropic, PBC | API de Claude (asistente, extracción, escucha, agente de mercado con búsqueda web, propuestas) | Texto enviado a esas funciones | EE. UU. | [DPF / CCT] |
| [PROVEEDOR DE CORREO] (SMTP configurado con `SMTP_HOST`) | Correos de contraseña, acceso e invitaciones a test | Correo, nombre, enlace, nombre de la empresa | [PAÍS] | [DPA] |
| [PROVEEDOR DE PAGOS] (previsto Stripe, `PUESTA-EN-MARCHA.md`) | Cobro | Facturación y pago | [PAÍS] | [DPA] |
| Google (Google Fonts) | Tipografías | IP y agente de usuario de cada visitante | EE. UU./UE | Recomendado: alojar las fuentes en el servidor y eliminar esta transmisión |
| Cloudflare (cdnjs) | Bibliotecas JS (Three.js, PDF.js, lectura de Excel, html2pdf) | IP y agente de usuario | EE. UU./UE | Recomendado: servirlas desde el propio servidor |

Terceros que solo intervienen si el usuario pulsa un enlace: WhatsApp (`wa.me`), Google Calendar, Outlook. El dictado por voz usa el reconocimiento del navegador (en Chrome, servicio de Google). **[REVISAR si debe informarse en la pantalla del dictado]**

---

## 4. Plazos de conservación

### Implementados en el código
| Dato | Plazo | Dónde |
|---|---|---|
| Sesión de usuario | 30 días; las caducadas se borran cada hora | `SESSION_DAYS`, limpieza periódica |
| Sesión de administración | 12 horas | `ADMIN_HOURS` |
| Enlace de nueva contraseña | 60 minutos (7 días para la invitación de alta de Grupos) | `RESET_MIN`, `newResetToken` |
| Enlace de test | Caduca a los 14 días (deja de aceptar respuestas) | `INV_DIAS` |
| Uso diario de IA | Últimos 60 días | `usoIA` |
| Contactos | Los 500 más recientes | `db.contactos.slice(0, 500)` |
| Contadores de intentos | En memoria, 15-60 minutos | `LIMITES` |
| Copias de seguridad | 7 copias diarias rotatorias | `COPIAS = 7` |
| Invitaciones a test | Se borran 30 días después de importarse, caducar o anularse; la IP se borra al importar. Revisión cada 6 horas | `INVITACIONES_DIAS`, `purgarInvitaciones` |
| Respuestas de lid360 | Solo se entregan al consultor sin nombres y a partir de 3 respuestas; la bolsa se vacía al importarse | `MIN_LID360`, `POST /api/lid360/:pid/importado` |
| Borrado de cuenta (administración) | Borra datos, mercado, sesiones, enlaces, invitaciones con respuestas, contactos y uso | `DELETE /api/admin/users/:id` |

### Pendientes (no implementados)
1. **Cuentas de prueba no activadas e inactivas**: sin plazo.
2. **Contactos**: sin plazo temporal.
3. **Exportación y borrado de autoservicio**: ver el estado en las condiciones de uso; el borrado de la cuenta se hace a petición, por la administración.
4. **Copias en el navegador**: los datos de personas también se guardan en `localStorage` del equipo del consultor (`atalaya.personas.v1…`). Informar y recomendar no usar equipos compartidos (ya está en privacidad y cookies).
5. **Modo de demostración sin servidor**: guarda cuentas y datos en el navegador; no debe usarse con datos reales.

### Resueltos en esta versión
- Purga de invitaciones a los 30 días (`INVITACIONES_DIAS`) y borrado de la IP al importar.
- Lectura de identidad en el servidor: el ajuste se guarda en la invitación, los enlaces y correos llevan `&id=1` solo si está activada, y el servidor rechaza `nacimiento` si no lo está. Nunca se aplica a lid360.
- Confidencialidad de lid360 en el servidor: la API no devuelve respuestas individuales ni quién respondió; entrega una bolsa barajada sin nombres a partir de 3 respuestas.

---

## 5. Plantilla de contrato de encargo del tratamiento (art. 28 RGPD)

*Para que la firma consultora (plan Consultora) lo firme con cada empresa cliente cuya plantilla evalúe. Borrador para revisión jurídica.*

**CONTRATO DE ENCARGO DEL TRATAMIENTO**

En [LUGAR], a [FECHA].

**De una parte**, [EMPRESA CLIENTE], con NIF [NIF], domicilio en [DOMICILIO], representada por [NOMBRE Y CARGO] (el «Responsable»).

**De otra parte**, [FIRMA CONSULTORA], con NIF [NIF], domicilio en [DOMICILIO], representada por [NOMBRE Y CARGO] (el «Encargado»).

**1. Objeto.** El Encargado trata por cuenta del Responsable los datos personales necesarios para prestar el servicio de [DESCRIPCIÓN: análisis de perfiles de comportamiento, equipos, liderazgo y estructura organizativa] mediante la aplicación Atalaya 360°.

**2. Duración.** La del contrato de servicios del que trae causa. [FECHA O REFERENCIA]

**3. Naturaleza y finalidad.** Recogida de respuestas a cuestionarios por enlace o en sesión, cálculo de resultados, elaboración de informes y conservación mientras dure el servicio. Finalidad: conocer estilos de trabajo, equilibrar equipos, ajustar el liderazgo y ordenar la estructura. No se usarán como único criterio para decisiones de selección, promoción, retribución o despido.

**4. Tipo de datos y categorías de interesados.** Empleados y colaboradores del Responsable: identificación (nombre, puesto, área, responsable, correo), respuestas y resultados de los cuestionarios, fecha de consentimiento, datos técnicos de la invitación (fechas, IP). Solo si el Responsable lo decide por escrito: fecha de nacimiento y nombre completo para la lectura complementaria de identidad. No se tratarán categorías especiales de datos.

**5. Obligaciones del Encargado** (art. 28.3 RGPD):
a) Tratar los datos solo siguiendo instrucciones documentadas del Responsable, incluidas las transferencias internacionales.
b) Garantizar que las personas autorizadas se han comprometido a la confidencialidad.
c) Aplicar las medidas de seguridad del art. 32 (anexo I).
d) No recurrir a otro encargado sin autorización previa por escrito. El Responsable autoriza a los subencargados del anexo II; el Encargado informará de cualquier cambio con [PLAZO] de antelación para que el Responsable pueda oponerse.
e) Asistir al Responsable en la respuesta a los derechos de los interesados. Si un interesado se dirige al Encargado, este lo comunicará al Responsable en [PLAZO, p. ej. 5 días hábiles].
f) Asistir al Responsable en la seguridad, la notificación de brechas (comunicará cualquier brecha sin dilación indebida y en un máximo de [48] horas), la evaluación de impacto y la consulta previa.
g) Al terminar el servicio, a elección del Responsable, suprimir o devolver los datos y suprimir las copias, salvo obligación legal de conservarlos. Las copias de seguridad de la aplicación se sobrescriben en un máximo de 7 días.
h) Poner a disposición del Responsable la información necesaria para demostrar el cumplimiento y permitir auditorías.

**6. Obligaciones del Responsable.** Informar a los interesados (art. 13), contar con base jurídica, decidir si se activa la lectura complementaria de identidad, realizar la evaluación de impacto si procede y supervisar el tratamiento.

**7. Lugar del tratamiento.** [UE/EEE]. Las respuestas de los cuestionarios no se envían a servicios de inteligencia artificial.

**Anexo I. Medidas de seguridad.** Las del apartado 2.3 de este documento y [MEDIDAS PROPIAS DE LA CONSULTORA].

**Anexo II. Subencargados autorizados.** Business Avance ([RAZÓN SOCIAL], [NIF]) como proveedor de Atalaya 360°; [PROVEEDOR DE ALOJAMIENTO]; [PROVEEDOR DE CORREO].

Firmas.

---

## 6. Notas para la evaluación de impacto (DPIA) de los cuestionarios psicométricos

**Por qué puede ser obligatoria.** El tratamiento evalúa aspectos personales (comportamiento, motivación, estilo de liderazgo) de trabajadores, que son interesados en situación de desequilibrio respecto del empleador. Reúne al menos dos criterios de las Directrices WP248 (evaluación o puntuación; interesados vulnerables) y puede encajar en la lista de la AEPD de tratamientos que requieren evaluación de impacto. **[CONFIRMAR CON EL ABOGADO]**

**Descripción sistemática.** Ver 2.2.E. Flujo: el consultor crea la invitación → la persona abre el enlace, lee la información del art. 13 y da su consentimiento → responde (se guarda en el servidor o va en un código) → la respuesta se incorpora a su ficha → informes de persona, equipo y líder.

**Necesidad y proporcionalidad.**
- Minimización: el correo es opcional; la fecha de nacimiento solo con la lectura de identidad activada y de forma opcional.
- Exactitud: los resultados se presentan como orientativos; la persona puede ver un resumen de su resultado (configurable).
- Conservación: ver apartado 4 (purga de invitaciones pendiente).
- Información y derechos: capa informativa en `test.html` y `privacidad.html#personas`.

**Riesgos y medidas.**

| Riesgo | Medida implementada | Medida pendiente |
|---|---|---|
| Uso de los resultados para decisiones laborales (selección, despido) | Avisos en la aplicación, en el test y en los informes: no deben ser el único criterio | Cláusula en el contrato de encargo; formación al consultor |
| Consentimiento no libre | Participación voluntaria, sin consecuencias por no responder, casilla obligatoria | Valorar otra base jurídica |
| Identificación de quién dijo qué en «Cómo le ve su equipo» | Solo agregado y con 3 o más respuestas, en pantalla e informes | Ver apartado 4, punto 7 |
| Lectura de identidad (fecha de nacimiento, nombre): no es un instrumento científico; la fecha revela la edad (riesgo de discriminación) | Desactivada por defecto por empresa; activación expresa con aviso; no entra en ningún cálculo de encaje; botón para borrar las fechas | Valorar retirarla del producto o limitarla a uso personal de la propia persona |
| Acceso no autorizado | Ver 2.3; enlaces de un solo uso que caducan a los 14 días | Cifrado en reposo; registro de accesos |
| Copias locales en el equipo del consultor | Aviso en privacidad y cookies | Opción de no guardar copia local de personas |
| Transferencias a EE. UU. | Los test no van a la IA | Revisar fuentes y bibliotecas de terceros (alojarlas en el servidor) |

**Consulta a los interesados o a sus representantes.** [VALORAR informar al comité de empresa o a la representación legal de los trabajadores]

---

## 7. Lista para la revisión jurídica
- Completar todos los datos entre corchetes de las cuatro páginas y de este documento.
- Confirmar los roles (responsable, encargado, subencargado) del apartado 1, en especial con clave de API propia.
- Base jurídica de los cuestionarios a empleados y si procede la evaluación de impacto.
- Mecanismo de transferencia con Anthropic y condiciones de conservación de su API.
- Plazos de conservación pendientes (apartado 4).
- Condiciones de uso: consumidores y desistimiento, renovación, reembolsos, límite de responsabilidad, fuero.
- Si las cookies técnicas y el almacenamiento local descritos quedan exentos de consentimiento (art. 22.2 LSSI).
- Texto del aviso legal sobre la titularidad (relación entre Business Avance y Familias Empresarias, Akompano Group y DM Focus Global Business).
- Marcas: «Método D.I.N.E.R.O.» se publica sin ™ hasta confirmar su registro.
