# Cumplimiento: llamadas, WhatsApp, inteligencia artificial y datos personales

Este documento resume las normas que afectan al asistente y cómo las aplica el sistema. **No es asesoramiento jurídico.** Sirve para preparar la reunión con su abogado: lo que no se sabe con seguridad va marcado como **«a confirmar»**, y el apartado 9 reúne los puntos que hay que validar antes de activar la prospección.

## 0. Lo que ha decidido la empresa

1. Solo se llama a quien tenga **base legal**: consentimiento o relación previa (asistentes a ponencias, formularios, clientes, asociaciones).
2. Se filtra siempre la **lista Robinson** (aunque haya consentimiento) y las **bajas propias**.
3. El asistente **se presenta siempre como inteligencia artificial** y nunca finge ser una persona.
4. Solo se llama en **horario legal**: días laborables de 9:00 a 21:00, y dentro de eso, en el horario que configure la empresa.
5. A quien no tenga base legal, el primer contacto se hace por **correo o LinkedIn**, nunca por teléfono.

## 1. Base legal por tipo de contacto

| Tipo de contacto | Valor en el sistema | ¿Se le puede llamar? | Qué guardar como prueba |
|---|---|---|---|
| Ha dado su consentimiento expreso para recibir llamadas comerciales (formulario con casilla no marcada de antemano, inscripción con texto claro) | `consentimiento` | Sí. Sin fecha del consentimiento, el sistema no llama | Fecha, texto exacto aceptado, formulario u origen |
| Cliente o excliente | `cliente` | Sí, sobre servicios similares a los contratados (a confirmar alcance y plazo desde que dejó de ser cliente) | Contrato o factura, fecha |
| Relación previa: asistió a una ponencia, dejó su tarjeta, es miembro de una asociación con la que se colabora, escribió pidiendo información | `relacion_previa` | Sí, si al recoger sus datos se le informó de que se le podría contactar y no se opuso (**a confirmar** con el abogado: en la práctica puede equivaler a interés legítimo) | Evento, fecha, cómo se recogieron los datos y qué se le informó |
| Profesional de empresa sin relación previa (prospección en frío B2B) | `interes_legitimo_b2b` | Solo si la campaña lo admite expresamente, con la evaluación de interés legítimo hecha, **nunca a móviles personales** y siempre «revisar con abogado» | Evaluación de interés legítimo (ponderación) |
| Sin base legal | (vacío) | **No.** Primer contacto por correo o LinkedIn | — |

Cómo lo aplica el sistema (`src/prospeccion/cumplimiento.js`, función `puedeLlamar`):

- Sin base legal → no llama (motivo «primer contacto por correo o LinkedIn»). Esos contactos quedan en la campaña con estado `sin_base_legal`, para escribirles por otros medios; el panel los exporta en CSV (sin los que han pedido la baja).
- Al importar, el sistema avisa de los contactos que no se llamarán nunca en esa campaña (consentimiento sin fecha, interés legítimo no admitido, base no admitida, móvil personal con interés legítimo) y los deja como excluidos con el motivo. Si se reimportan corregidos antes de llamarles, se vuelven a evaluar.
- Cada campaña indica qué bases admite. El interés legítimo B2B nunca va por defecto: hay que marcarlo y escribir el resumen de la evaluación.
- Con interés legítimo, los números móviles (+34 6… / +34 7…) se tratan como personales salvo que se marquen como `movil_corporativo` en la importación.

## 2. Ley General de Telecomunicaciones (Ley 11/2022), artículo 66

El artículo 66.1.b) reconoce a los usuarios el derecho a **no recibir llamadas no deseadas con fines de comunicación comercial**, salvo que exista su consentimiento previo o que la comunicación pueda ampararse en otra base de legitimación del artículo 6.1 del RGPD. Esta obligación es aplicable desde el 29 de junio de 2023.

- La Agencia Española de Protección de Datos (AEPD) ha interpretado esta norma de forma estricta: el consentimiento es la vía segura; el interés legítimo es excepcional y debe justificarse caso por caso (**a confirmar** el criterio vigente con el abogado).
- Por eso el sistema exige base legal registrada y documentada para cada contacto.

## 3. Lista Robinson

- La Ley Orgánica 3/2018 de Protección de Datos (LOPDGDD), artículo 23, obliga a quien vaya a hacer mercadotecnia directa a **consultar previamente los sistemas de exclusión publicitaria** (la Lista Robinson que gestiona Adigital). Según esa norma, la consulta no sería necesaria si la persona ha dado su consentimiento para recibir comunicaciones de esa empresa en concreto (**a confirmar**); aun así, la empresa ha decidido filtrarla siempre.
- La empresa debe darse de alta como entidad adherida en el servicio de Adigital y **descargar la lista del canal teléfono** antes de cada campaña y, como mínimo, cada mes (la periodicidad de consulta exigible es **a confirmar**).
- Importación: panel → «Bajas y Robinson», o en el servidor `node src/prospeccion/importar-robinson.js fichero.csv AAAA-MM-DD`. El importador acepta teléfonos en claro o resumidos (SHA-256 o MD5). **El formato exacto del fichero de Adigital y cómo normaliza los teléfonos antes de resumirlos está por confirmar** con el primer fichero real: compruebe tras importarlo que un número inscrito conocido aparece como excluido.
- Las **bajas propias** (quien dijo «no me llamen» o «BAJA») se respetan siempre, en todos los canales, y no caducan.

## 4. Horario e intentos

- La normativa de consumidores (Texto Refundido de la Ley General para la Defensa de los Consumidores y Usuarios, artículo 96, en la redacción de la Ley 4/2022) prohíbe las llamadas comerciales **antes de las 9:00 y después de las 21:00, y en festivos y fines de semana** (**a confirmar** el artículo exacto y si se aplica también entre empresas; la empresa lo aplica en todos los casos).
- El sistema:
  - Nunca llama sábados, domingos ni en los festivos de `FESTIVOS` (incluya los nacionales, autonómicos y locales).
  - Nunca empieza una llamada antes de las 9:00 ni en los últimos 10 minutos antes de las 21:00, aunque el horario configurado diga otra cosa.
  - Dentro de eso, solo llama en `HORARIO_LLAMADAS` (por defecto L-V 10:00-14:00 y 16:30-20:00).
  - Máximo `PROSPECCION_MAX_INTENTOS` intentos por contacto y campaña (3) y al menos `PROSPECCION_SEPARACION_H` horas entre intentos (48).
  - Si la persona pide que le llamen otro día a una hora concreta, se le llama a esa hora (aunque falten horas para la separación mínima o se haya llegado al máximo de intentos), siempre dentro del horario legal y sin saltarse bajas ni lista Robinson.
  - Si salta un contestador, cuelga sin dejar mensaje comercial.

## 5. Reglamento europeo de Inteligencia Artificial (Reglamento (UE) 2024/1689), artículo 50

- Obliga a que los sistemas de IA que interactúan con personas estén diseñados para que estas **sepan que hablan con una IA**, salvo que sea evidente. Las obligaciones del artículo 50 son aplicables desde el **2 de agosto de 2026** (**a confirmar** si alguna modificación posterior del calendario de aplicación afecta a este artículo).
- Si se usa una voz sintética que imita a una persona real (la voz clonada de Valerio), además de su consentimiento por escrito, conviene que el aviso de IA sea explícito al inicio.
- Cómo lo aplica el sistema: las instrucciones obligan a la asistente a presentarse como «Lucía, la asistente de inteligencia artificial de Familias Empresarias, de Business Avance» al empezar cada conversación y a responder con claridad que no es una persona si se lo preguntan. Las pruebas del apartado 5 de `PUESTA-EN-MARCHA.md` lo comprueban.

## 6. RGPD y LOPDGDD

### 6.1 Información

- En cada punto de recogida (formularios, inscripción a ponencias, tarjetas) debe constar la información del artículo 13 del RGPD: responsable, finalidad (incluido el contacto comercial por teléfono y WhatsApp), base legal, destinatarios y encargados (proveedores de abajo), transferencias internacionales, plazos y derechos.
- **Responsable:** AKOMPANO GROUP, S.L. (NIF B05544713), nombre comercial Business Avance International Consulting; el mismo en la web de Atalaya, sus textos legales y la asistente. Domicilio, registro y delegado de protección de datos: **[PENDIENTE]**.
- En la llamada, la asistente dice quién es, de qué empresa y por qué llama; si se lo preguntan, nombra al responsable y ofrece enviar por WhatsApp el enlace a la política de privacidad (`URL_PRIVACIDAD`). La **información completa** va por capas (**a confirmar** la fórmula con el abogado).
- Texto propuesto del apartado «Asistente telefónico y WhatsApp» de la política de privacidad (finalidades, bases, proveedores, plazos y cómo oponerse): `datos/interno/privacidad-asistente.md`, **pendiente de revisión del abogado**. Lo incorpora a la web de Atalaya el equipo legal.

### 6.2 Grabación y transcripción

- El sistema **transcribe** todas las conversaciones (para funcionar y para el CRM). La **grabación de audio** está desactivada por defecto (`GRABAR_LLAMADAS=no`).
- Si se activa la grabación, hay que avisar al inicio de la llamada de que se graba, con qué finalidad y cómo ejercer los derechos, y ofrecer una alternativa a quien no quiera ser grabado (**a confirmar** base legal y texto del aviso).
- Que la transcripción se guarde también conviene mencionarlo en la información de privacidad.

### 6.3 Plazos de conservación (propuesta, a confirmar con el abogado)

| Dato | Plazo | Qué hace la purga diaria | Variable | Motivo |
|---|---|---|---|---|
| Transcripciones y mensajes de contactos que no llegan a ser clientes | 12 meses desde la última interacción del contacto | Borra los mensajes y el resumen; la conversación queda anónima (sin contacto ni número) solo para las cifras | `CONSERVAR_MENSAJES_MESES` | Seguimiento comercial razonable |
| Transcripciones y mensajes de clientes (`base_legal = cliente`) | 72 meses desde la última interacción (**a confirmar**) | Igual que la fila anterior | `CONSERVAR_MENSAJES_CLIENTES_MESES` | Relación contractual y prescripción |
| Grabaciones de audio (si se activan) | 3 meses desde la llamada | Borra el audio en Twilio y la dirección en la base | `CONSERVAR_GRABACIONES_MESES` | Calidad y resolución de incidencias; minimizar |
| Resúmenes en HubSpot de clientes | Mientras dure la relación y después el plazo de prescripción de acciones (hasta 6 años por obligaciones mercantiles y fiscales para documentos contables) | No los toca la purga: se gestionan en HubSpot | — | Obligaciones legales |
| Prueba del consentimiento y de la base legal (ficha del contacto) | Mientras se use el dato y 3 años más | Borra la ficha (y su paso por las campañas) cuando lleva el plazo de los mensajes más 36 meses sin actividad, sin conversaciones vivas ni campaña en curso | `CONSERVAR_PRUEBA_BASE_LEGAL_MESES` | Poder demostrarlo ante la AEPD (plazo de prescripción de infracciones graves; a confirmar) |
| Bajas y oposiciones | Indefinido, solo el teléfono o correo, el canal y la fecha | No se borran nunca | — | Para no volver a contactar |
| Lista Robinson | Se sustituye con cada descarga | — | — | No es un dato propio |
| Métricas técnicas (latencia, eventos) | 12 meses | Borra los eventos (salvo los avisos de la bandeja «requiere acción» sin resolver) | `CONSERVAR_EVENTOS_MESES` | Operación |

La purga (`src/conservacion.js`) se ejecuta un minuto después de arrancar el servidor y después cada 24 horas; deja un evento `purga` con lo que ha borrado. `PURGA_ACTIVA=no` la desactiva (por ejemplo, si hay una reclamación en curso y hay que conservar las pruebas).

### 6.4 Derechos

- Acceso, rectificación, supresión, oposición (incluida la oposición a la mercadotecnia, que es absoluta), limitación y portabilidad. Plazo de respuesta: un mes.
- Si alguien pide la baja por teléfono o WhatsApp, la asistente la registra en el momento (`dar_de_baja`), en SQLite y en HubSpot, y avisa al equipo para que la extienda a lo que la asistente no controla (correo, LinkedIn). Desde el panel se pueden añadir bajas a mano (por correo, en persona…) con el teléfono, el correo o los dos; también llegan a HubSpot (`fe_baja` y una nota).
- Una baja vale para todos los canales del contacto: la dada con el correo bloquea también las llamadas y los WhatsApp a los teléfonos de los contactos con ese correo, y la dada con el teléfono guarda también el correo del contacto.
- Para supresión completa hay que borrar en SQLite (contacto, conversaciones y mensajes) y en HubSpot, conservando solo el teléfono en la lista de bajas.

### 6.5 Proveedores (encargados del tratamiento)

Firme o acepte el contrato de encargado (DPA) de cada uno y revise dónde tratan los datos: Anthropic, Twilio, Deepgram, ElevenLabs, Meta (WhatsApp), HubSpot, Google, el proveedor del servidor y el del correo de los avisos internos (SMTP). Varios están en EE. UU.: compruebe que están adheridos al Marco de Privacidad de Datos UE-EE. UU. o que ofrecen cláusulas contractuales tipo (**a confirmar** para cada uno). Inclúyalos en el registro de actividades del tratamiento.

Valore una **evaluación de impacto** (EIPD): llamadas automatizadas con IA, perfilado comercial y uso de tecnología nueva pueden hacerla obligatoria (**a confirmar**).

## 7. WhatsApp

- **Opt-in**: Meta exige que la persona haya aceptado recibir mensajes de la empresa por WhatsApp antes de escribirle por iniciativa propia. El sistema solo permite WhatsApp proactivo con `consentimiento_whatsapp` (fecha) registrado (`puedeEnviarWhatsApp` en `cumplimiento.js`).
- **Ventana de 24 horas**: si la persona escribe, se le puede responder libremente durante 24 horas. Fuera de esa ventana solo se pueden enviar **plantillas aprobadas** por Meta.
- **Plantillas**: categoría utilidad (confirmaciones, recordatorios) o marketing (seguimiento comercial). Las de marketing deben ofrecer una forma sencilla de dejar de recibirlas.
- **Política comercial y de mensajería de Meta**: prohíbe ciertos productos y exige respetar las solicitudes de baja; la calidad del número baja si los usuarios bloquean o denuncian, y Meta puede limitar el envío. Revísela en la documentación vigente de Meta.
- Quien escribe «BAJA» queda dado de baja en todos los canales.
- Las mismas reglas que para llamar (base legal, bajas, Robinson, intentos y separación) se aplican al WhatsApp proactivo, salvo el horario.

## 8. Resumen de controles técnicos

| Control | Dónde |
|---|---|
| Base legal obligatoria y admitida por la campaña | `puedeLlamar` (cumplimiento.js) |
| Interés legítimo solo con evaluación, aviso «revisar con abogado» y sin móviles personales | `puedeLlamar`, `crearCampana` |
| Bajas propias, compartidas entre teléfono y correo | `db.darDeBaja` / `db.estaDeBaja`, herramienta `dar_de_baja`, panel (también a HubSpot) |
| Aviso de los contactos que no se llamarán nunca, al importar | `reglasPermanentes` (cumplimiento.js), `importarFilas` |
| «Volver a llamar» a la hora pedida (sin saltarse horario, bajas ni Robinson) | `finalizar` (volver_a_llamar), `alEstado`, `comunes` |
| Plazos de conservación | Purga diaria (`src/conservacion.js`) |
| Lista Robinson (en claro o resumida) | `enRobinson`, `importarRobinsonCSV` |
| Horario legal + horario propio + festivos | `comprobarHorario` |
| Máximo de intentos y separación | `puedeLlamar`, planificador |
| Interruptor general | `PROSPECCION_ACTIVA` |
| Presentación como IA | Instrucciones del asistente (`cerebro/prompt.js`) |
| WhatsApp proactivo solo con plantilla y consentimiento | `puedeEnviarWhatsApp` |
| Registro de cada decisión | `campana_contactos` (estado y motivo), `eventos` |

## 9. Puntos para validar con su abogado antes de activar la prospección

1. **Requisitos de numeración para llamadas comerciales en España**: se han aprobado o anunciado normas que obligan a usar numeración identificable o específica para llamadas comerciales y que permiten a los operadores bloquear llamadas que no la cumplan. Confirmar qué numeración exige hoy la normativa (prefijo concreto, si se pueden usar números geográficos o móviles) y si el número comprado en Twilio sirve. **A confirmar.**
2. **Interés legítimo B2B**: si es admisible para llamar en frío a profesionales con la LGT art. 66 y el criterio de la AEPD; contenido de la evaluación; si cambia algo que el número sea corporativo.
3. **«Relación previa»** (asistentes a ponencias, asociaciones, tarjetas): qué información debe haberse dado al recoger los datos para poder llamar, y si hay que pedir consentimiento expreso a partir de ahora (casilla en la inscripción a ponencias).
4. **Clientes y exclientes**: alcance (¿solo servicios similares?) y plazo tras terminar la relación.
5. **Lista Robinson**: periodicidad de consulta, si se aplica entre empresas, y formato del fichero.
6. **Horario**: confirmar la norma exacta y su aplicación en B2B.
7. **Grabación**: si se activa, base legal, texto del aviso y plazo de conservación.
8. **Transcripción y uso de IA**: información que hay que dar, transferencias internacionales a los proveedores, necesidad de evaluación de impacto.
9. **Aviso de IA** (Reglamento de IA, art. 50): fórmula del aviso y si basta con decirlo al inicio; fecha de aplicación vigente.
10. **Voz clonada de Valerio**: documento de consentimiento y condiciones de uso.
11. **WhatsApp**: texto del opt-in en formularios y en la inscripción a ponencias.
12. **Plazos de conservación** propuestos en el apartado 6.3.
13. **Textos legales**: cláusula informativa por capas para la llamada, política de privacidad de la web, registro de actividades del tratamiento y contratos con los encargados.
