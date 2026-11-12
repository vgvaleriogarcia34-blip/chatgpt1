# Notas para la revisión del abogado — versión 1.0 en vigor

Documento interno. Acompaña a `CONTRATO-PLANTILLA.md` y a `CONTRATO-PARA-REVISION.docx`, y cubre también los textos legales de Atalaya 360° (`aviso-legal.html`, `privacidad.html`, `cookies.html`, `condiciones.html`), el registro de `RGPD.md` y el apartado del asistente (`asistente-fe/datos/interno/privacidad-asistente.md`).

**Situación.** Por decisión de FAMILIAS EMPRESARIAS, S.L. (Valerio García, 12 de noviembre de 2026), todos estos textos están **en vigor como versión 1.0 desde el 12 de noviembre de 2026**. Se han cerrado con la redacción más prudente que permite la normativa (RGPD, LOPDGDD, LSSI, Ley 7/1998 de condiciones generales, Ley 3/2004 de morosidad, eIDAS y Ley 6/2020). La revisión del abogado es posterior: cualquier cambio que proponga se publicará como una **versión nueva**, con su fecha. Abajo se recoge cada decisión tomada y su motivo, para que pueda validarla o cambiarla.

**Qué es el contrato.** Es la plantilla que Atalaya 360° genera cuando un cliente acepta la propuesta de consultoría de FAMILIAS EMPRESARIAS, S.L., propietaria de Atalaya 360°, que figura como el Consultor y como única parte contratante. Los campos entre llaves los rellena la aplicación con los datos de la propuesta aceptada, de la ficha del cliente y de la ficha de la firma. Los bloques condicionales solo aparecen cuando el cliente ha contratado ese servicio o esa modalidad.

**Cliente tipo.** Sociedades mercantiles y empresarios, no consumidores. Por eso no se aplica el texto refundido de la Ley General para la Defensa de los Consumidores, y la sumisión expresa a fuero es válida (artículo 55 de la LEC). Si un día se contratara con un consumidor, esta plantilla no sirve.

## Titularidad y relación con Business Avance

- **Decisión (12 de noviembre de 2026):** FAMILIAS EMPRESARIAS, S.L. es la única titular del sitio y del servicio Atalaya 360°, la única parte de los contratos y la única responsable del tratamiento (Atalaya 360° y asistente telefónico y de WhatsApp). Business Avance ya no figura como nombre comercial de FAMILIAS EMPRESARIAS, S.L.: es la marca, y businessavance.es el sitio web, de AKOMPANO GROUP, S.L., grupo al que pertenece FAMILIAS EMPRESARIAS, S.L. El aviso legal dice que Atalaya 360° se comercializa también a través de Business Avance y que ni Business Avance ni AKOMPANO GROUP, S.L. son titulares de Atalaya 360°, parte de los contratos de uso ni tratan los datos de la aplicación. DM Focus Global Business deja de mencionarse en los textos legales.
- **Motivo:** evita que el cliente o el interesado entiendan que hay corresponsables (artículo 26 del RGPD) o varios prestadores (artículo 10 de la LSSI).
- **Contrato del Consultor:** el nombre comercial ya no sale por defecto. Solo aparece la frase «que opera con el nombre comercial…» si se rellena `nombreComercial` en `js/titular.js` o el campo en la ficha de la firma o del contrato.
- **A formalizar:** la relación entre AKOMPANO GROUP, S.L. (Business Avance) y FAMILIAS EMPRESARIAS, S.L. para vender Atalaya 360°, mediante un contrato de distribución o de agencia comercial entre las dos sociedades: quién contrata con el cliente (siempre FAMILIAS EMPRESARIAS, S.L.), remuneración, uso de la marca Business Avance, y si AKOMPANO GROUP, S.L. recibe datos de posibles clientes (solicitudes de contacto en businessavance.es, CRM) y con qué papel (responsable propio que los comunica, o encargado de FAMILIAS EMPRESARIAS, S.L.).
- **A comprobar:** a nombre de quién está la cuenta de HubSpot que los textos llaman «CRM de Familias Empresarias»; si es de AKOMPANO GROUP, S.L., hace falta un contrato de encargo o recoger la comunicación de datos. La política de privacidad de businessavance.es debe explicar que las solicitudes sobre Atalaya 360° se pasan a FAMILIAS EMPRESARIAS, S.L.

## Contrato: calificación y estructura

1. **Calificación.** Arrendamiento de servicios (artículos 1544 y 1583 y siguientes del Código Civil), con obligación de medios y no de resultado. Se ha mantenido la cláusula «Naturaleza de los Servicios» como está, porque basta para excluir la lectura como arrendamiento de obra, también en el Servicio 1, que acaba en un informe.
2. **Exclusiones de actividades reguladas.** Se excluyen la auditoría de cuentas (aclarado frente a la denominación comercial «Auditoría 360»), el asesoramiento jurídico, fiscal y laboral, la valoración con fines legales y la intermediación financiera.
3. **Prevalencia.** El cuerpo del contrato prevalece sobre los anexos, y los anexos sobre la propuesta. La propuesta no se incorpora como documento contractual pleno porque contiene textos comerciales y estimaciones.

## Contrato: decisiones tomadas en los puntos abiertos

1. **Limitación de responsabilidad.** Se mantiene el límite en el importe cobrado por el servicio del que traiga causa el daño en los 12 meses anteriores, con exclusión del lucro cesante y de los daños indirectos. **El dolo y la culpa grave quedan fuera de la limitación** (artículos 1102 y 1103 del Código Civil). Motivo: es la fórmula que los tribunales aceptan entre empresas sin riesgo de nulidad.
2. **Componente por objetivos (Anexo IV).** Se mantiene que el componente se devenga íntegramente si el cliente no ejecuta lo que le corresponde, no facilita los datos o desiste. Motivo: los objetivos dependen de acciones del cliente, se validan por escrito en la sesión de arranque y la fuerza mayor está excluida; no es una condición potestativa del consultor.
3. **Sesiones anuladas con menos de 48 horas:** se consideran realizadas. Se mantiene.
4. **Desistimiento.** En el acompañamiento, preaviso configurable (30 días por defecto) para las dos partes. En los demás servicios, desistimiento libre del cliente pagando lo realizado; el consultor no puede desistir. Con cuotas, el cliente que desiste paga la cuota del mes en curso. No se pacta la indemnización del artículo 1594 del Código Civil más allá de lo realizado.
5. **Suspensión por impago:** tras 30 días de retraso, con aviso de 7 días. Se mantiene.
6. **Morosidad:** remisión a la Ley 3/2004 (interés del artículo 7 e indemnización del artículo 8). Plazo de pago configurable, 30 días por defecto, sin superar los 60 días.
7. **No captación de personal:** 12 meses, recíproca y sin cláusula penal. Se mantiene sin indemnización tasada para no exponerla a moderación judicial.
8. **Resolución por concurso:** no se incluye, porque el artículo 156 del texto refundido de la Ley Concursal tiene por no puestas esas cláusulas.
9. **Fuero:** juzgados y tribunales de Murcia, domicilio del consultor, tras 30 días de negociación. No se incluye mediación ni arbitraje.
10. **Propiedad intelectual:** el consultor conserva el método, las herramientas y Atalaya 360°; el cliente obtiene un derecho de uso interno, sin límite temporal, sobre los entregables una vez pagados. Basta con un derecho de uso: no se ceden derechos de explotación.
11. **Uso de la aplicación Atalaya 360°:** el contrato remite a las condiciones de uso publicadas (`atalaya/condiciones.html`, versión 1.0) y prevé la devolución de los datos en 30 días al terminar.
12. **Firma electrónica:** se admite conforme al Reglamento eIDAS y a la Ley 6/2020, con la misma validez que la manuscrita. No se exige firma avanzada ni cualificada; entre empresas basta la firma electrónica simple con prueba de la aceptación, aunque la avanzada da más seguridad probatoria.
13. **Seguro de responsabilidad civil profesional:** la cláusula solo aparece si se indica la compañía y la póliza (campo `seguroRC` de `js/titular.js` o la ficha de la firma). No se afirma su existencia si no consta.

## Contrato: protección de datos (Anexo III)

- **Roles:** cada parte es responsable de los datos de sus firmantes y contactos. El consultor es encargado del tratamiento de los datos personales del cliente: plantilla, socios y contactos de clientes y proveedores.
- **Contenido:** cubre el artículo 28.3 del RGPD: instrucciones, confidencialidad, medidas del artículo 32, subencargados con autorización general y derecho de oposición (aviso de 15 días), asistencia, notificación de brechas en 48 horas, auditorías, devolución y supresión.
- **Cuestionarios de comportamiento (DISC, eneagrama).** **Decisión:** se tratan como **datos ordinarios**, no como categorías especiales, porque recogen preferencias de comportamiento y de trabajo y no datos de salud. A cambio: **información reforzada** a cada trabajador antes de responder, participación voluntaria y sin consecuencias, y **sin decisiones automatizadas** ni uso como único criterio para contratar, promocionar, retribuir o despedir. Se ha añadido un párrafo al apartado 3 del Anexo III con estas garantías. En `privacidad.html` se recomienda a la empresa basar el tratamiento en su interés legítimo (artículo 6.1.f) y no en el consentimiento, que en el ámbito laboral puede no ser libre (Considerando 43 y Directrices 05/2020 del CEPD).
- **Subencargados** que propone la aplicación: Hetzner Online GmbH (alojamiento y copias, UE, Helsinki; contrato de encargado firmado el 5 de noviembre de 2026 a nombre de FAMILIAS EMPRESARIAS, S.L.); Anthropic, PBC (IA, EE. UU., Marco de Privacidad de Datos UE-EE. UU. o cláusulas contractuales tipo); el proveedor de correo electrónico (su nombre sale de `js/titular.js`); HubSpot, Inc. (solo datos de contacto).
- **Inteligencia artificial:** uso sin entrenamiento de modelos y con minimización de datos; uso de apoyo, sin decisiones automatizadas sobre personas (compatible con el Reglamento (UE) 2024/1689).
- **Copias de seguridad:** el ciclo por defecto pasa de 90 a **365 días**, porque la copia externa que instala `despliegue/copia-seguridad.sh` guarda 14 diarias, 8 semanales y 12 mensuales. Si prefiere comprometer 90 días, hay que reducir antes esa retención (`--keep-monthly 3`).

## Textos legales de Atalaya 360°: decisiones en cada punto abierto

**Aviso legal**
- Marcas asociadas: ver «Titularidad y marcas asociadas».
- Marcas registradas: no se citan números de registro (no constan); se dice que las marcas pertenecen a sus titulares y que el acceso no concede licencia. «Método D.I.N.E.R.O.» se sigue publicando sin ™.
- Responsabilidad: exclusión por interrupciones, fallos ajenos y usos indebidos de terceros, salvo dolo o culpa grave y sin limitar los derechos de los consumidores.
- Fuero: juzgados de Murcia; si la persona usuaria es consumidora, el de su domicilio.

**Política de privacidad**
- Solicitudes de contacto: respuesta por medidas precontractuales (6.1.b); su anotación y seguimiento en el CRM, por interés legítimo (6.1.f) con derecho de oposición.
- Contrato de encargo para el plan Consultora: se ofrece el modelo del apartado 5 de `RGPD.md`.
- Cuestionarios DISC y eneagrama: ver el Anexo III arriba.
- Anthropic: subencargado con arreglo a sus condiciones comerciales de la API, que incluyen el contrato de encargo y excluyen el entrenamiento con el contenido enviado.
- Dictado por voz: se informa de que lo hace el navegador con el servicio de su fabricante y de que puede escribirse en su lugar.
- Asistente, seguimiento comercial: se mantiene la redacción (consentimiento, cliente, relación previa informada o, por excepción, interés legítimo entre empresas con evaluación hecha, nunca a móviles personales).
- Asistente, grabación de audio: **interés legítimo** (6.1.f) con aviso antes de grabar, posibilidad de seguir sin grabación y oposición en cualquier momento. Es la base coherente con el mecanismo implantado (se graba si la persona no se opone); el consentimiento exigiría una aceptación expresa.
- Proveedores del asistente: ubicaciones como constan en sus condiciones públicas; encargo del tratamiento (artículo 28) con cada uno.
- Plazos del asistente: 12 meses (no clientes), 72 meses (clientes, en línea con los 6 años del artículo 30 del Código de Comercio), 3 meses (grabaciones), uso más 3 años (prueba de la base legal), sin plazo (lista de exclusión). La purga automática está implantada en el asistente.
- Transferencias internacionales: Marco de Privacidad de Datos UE-EE. UU. (decisión de adecuación de 10 de julio de 2023) o, en su defecto, cláusulas contractuales tipo (artículo 46.2.c).
- Pagos: Stripe Payments Europe, Ltd., encargado para la suscripción y responsable para los datos de pago.
- Conservación: copias de seguridad cifradas hasta 12 meses (antes decía 7 días, que no coincidía con la copia externa); datos de facturación bloqueados 6 años (mercantil) y 4 años (tributaria); solicitudes de contacto 12 meses sin relación contractual; cuentas de prueba no activadas 12 meses desde el fin de la prueba, con aviso antes de borrarlas.
- Seguridad: se describen las medidas que existen (cifrado en tránsito, copias cifradas fuera del servidor, segundo factor y registro de acciones de la administración).
- Delegado de protección de datos: la línea solo se muestra si se rellena `dpd` en `js/titular.js`. Por tamaño y actividad no parece obligatorio (artículo 37 del RGPD y artículo 34 de la LOPDGDD).

**Política de cookies**
- Exención de consentimiento de las cookies técnicas y del almacenamiento local, conforme al artículo 22.2 de la LSSI y a la Guía de cookies de la AEPD. Google Fonts y cdnjs se describen como recursos de terceros; se recomienda alojarlos en el propio servidor (mejora técnica, no cambia el texto).

**Condiciones de uso**
- Solo empresas y profesionales; no se contrata con consumidores y, por tanto, no hay derecho de desistimiento. Se declaran condiciones generales (Ley 7/1998) accesibles antes de contratar.
- Prueba con tarjeta y prueba con código: redacción coherente con la renovación automática del apartado 5 (aviso 3 días antes, cancelación sin coste durante la prueba, una prueba por cliente; con código no hay cobro automático).
- Forma de pago: tarjeta mediante Stripe; planes a medida, por el medio acordado por escrito.
- Facturas: una por cobro, descargables en «Gestionar el pago».
- Renovación automática por periodos iguales; cambios de precio con 30 días de preaviso; impago con días de gracia y acceso en pausa.
- Reembolsos: no se reembolsa lo cobrado (tampoco la parte no consumida del pago anual), salvo incumplimiento de Familias Empresarias o mandato legal.
- Exportación: «Descargar todos mis datos» o, a petición, en un mes.
- Encargo del tratamiento: nuevo apartado 14 con el contenido del artículo 28.3 (subencargados con aviso de 30 días y derecho de oposición, brechas en 48 horas).
- Disponibilidad: no se compromete nivel de servicio.
- Responsabilidad: límite de lo pagado en los 12 meses anteriores; dolo y culpa grave fuera del límite.
- Cambios de condiciones: 30 días de preaviso, con posibilidad de cancelar.
- Fuero: juzgados de Murcia.

## Datos que debe completar el titular (un solo sitio: `atalaya/js/titular.js`)

Mientras estén vacíos, las páginas muestran «(en trámite de publicación)» y el contrato los pide en «Lo que falta». No se ha inventado ninguno.

- `nif`: NIF de FAMILIAS EMPRESARIAS, S.L.
- `domicilio`: domicilio social completo.
- `registro`: datos de inscripción en el Registro Mercantil (registro, tomo, folio, hoja, inscripción).
- `email`: correo de contacto general.
- `emailPrivacidad`: correo para protección de datos (si se deja vacío, se usa `email`).
- `firmanteCargo`: cargo de quien firma (administrador único, consejero delegado, apoderado…).
- `seguroRC`: compañía y póliza del seguro de responsabilidad civil profesional, si existe.
- `correoProveedor` y `correoUbicacion`: proveedor del envío de correos (SMTP) y dónde trata los datos.
- `dpd`: delegado de protección de datos, solo si se designa.

En el asistente, el NIF va en la variable `RESPONSABLE_DATOS_NIF` del servidor del asistente. En el despliegue, `CORREO_CERTIFICADOS` es obligatorio y no tiene valor por defecto.

## Aprobación

| Versión | Fecha | Aprobada por | Cambios |
|---|---|---|---|
| 1.0 (borrador) | 5 de noviembre de 2026 | — | Primera redacción completa |
| 1.0 | 12 de noviembre de 2026 | FAMILIAS EMPRESARIAS, S.L. | En vigor. Puntos abiertos cerrados con las decisiones de este documento; revisión jurídica posterior |
