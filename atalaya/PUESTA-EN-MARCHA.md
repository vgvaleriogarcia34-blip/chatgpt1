# Puesta en marcha en el servidor · lista de comprobaciones

Lo que hay que revisar el día que Atalaya pase de la demostración en el navegador a su propio servidor (`server/server.mjs`). Marca cada punto al comprobarlo.

> **Instalación en un servidor propio:** ver [`despliegue/DESPLIEGUE.md`](../despliegue/DESPLIEGUE.md) (Hetzner Cloud, Docker, Caddy con HTTPS, copias externas cifradas y revisión del sistema en la administración).

## 1. Arranque y seguridad

- [ ] Node 22.13 o superior (trae `node:sqlite` sin opciones; con 22.5–22.12 el servidor sigue con `db.json`); `cd server && npm install` (instala `nodemailer` para el correo).
- [ ] Variables de entorno: `PORT`, `ATALAYA_DATA` (carpeta de la base de datos), `APP_URL` (dirección pública), `COOKIE_SECURE=1` con HTTPS, `ADMIN_PASSWORD` o código de configuración inicial, `NODE_ENV=production` y, detrás de un proxy, `TRUST_PROXY=1` (ver «Seguridad del servidor» abajo).
- [ ] HTTPS delante (Caddy o Nginx) y redirección de http a https.
- [ ] `ATALAYA_DATA` fuera de la carpeta de la web (por ejemplo `/var/lib/atalaya`); el servidor no arranca si está dentro (salvo bajo `server/`, que nunca se sirve).
- [ ] Copia de seguridad diaria de **toda** la carpeta `ATALAYA_DATA` en otra máquina (el servidor guarda 2 copias mensuales rotatorias, pero en el mismo disco). Copie `atalaya.db.1` (la copia coherente del mes) o pare el servidor antes de copiar `atalaya.db`, que con el servidor en marcha va acompañada de `atalaya.db-wal`. Incluye `secreto.key`: sin él dejan de valer los enlaces de los test enviados, el segundo factor y los códigos de recuperación.
- [ ] Una sola instancia del servidor por carpeta de datos (SQLite admite un único proceso escritor como este).
- [ ] Contraseña de administración configurada y acceso solo por `index.html#admin` o `admin.html`. **Segundo factor activado** en «Seguridad» y los códigos de recuperación guardados fuera del servidor.
- [ ] Cuenta de demostración para presentaciones: `DEMO_PASSWORD` (secreta) y, si se quiere, `DEMO_EMAIL`, `DEMO_PLAN` e `IA_DEMO_EUR_DIA` (apartado 5 ter).
- [ ] Revisar las cuotas diarias de IA (`IA_DIARIA_PRUEBA`, `IA_DIARIA_PAGO`) y, en Consultora y Grupos, las de cada empresa (`IA_MENSUAL_EMPRESA`, 300 al mes; `IA_DIARIA_EMPRESA`, 40 al día) según el coste que se quiera asumir por cliente.

## 1 bis. Seguridad del servidor · variables y comportamiento

**Variables nuevas** (todas opcionales; entre paréntesis, el valor por defecto):

| Variable | Para qué |
|---|---|
| `NODE_ENV=production` | Activa las comprobaciones de producción: el servidor **no arranca** si `APP_URL` no empieza por `https://` o falta `COOKIE_SECURE=1`, y avisa si la administración no tiene contraseña. |
| `ATALAYA_PERMITIR_INSEGURO=1` | Arranca en producción pese a esos fallos (solo para pruebas). |
| `TRUST_PROXY` (sin valor) | Número de proxies de confianza delante del servidor. Con `1` (Caddy o Nginx en la misma máquina) la IP del cliente se toma de la última entrada de `X-Forwarded-For`, la que añade el proxy; las anteriores las puede inventar el cliente y se ignoran. Sin la variable, la cabecera no se lee (si se pone sin tener proxy, cualquiera podría saltarse los límites de intentos). El proxy debe **añadir** la IP (`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` en Nginx; Caddy lo hace solo). |
| `ATALAYA_RECUPERAR=1` | Recuperación de una base de datos dañada (ver abajo). `ATALAYA_RECUPERAR=vacia` arranca con una base vacía. |
| `IA_DIARIA_PRUEBA` (20) · `IA_DIARIA_PAGO` (200) | Consultas de IA al día por cuenta en la prueba gratuita y con el acceso pagado. El agente de mercado cuenta como 5 (hace búsquedas web). `0` deja sin IA. |
| `IA_MENSUAL_EMPRESA` (300) · `IA_DIARIA_EMPRESA` (40) | Solo en Consultora y Grupos: consultas de IA de **cada empresa** al mes y al día, con los mismos pesos, además de la cuota diaria de la cuenta. Al pasarla, esa empresa recibe 429 («Ha llegado al límite mensual de IA de esta empresa…») y las demás siguen. El navegador indica la empresa en la cabecera `X-Atalaya-Empresa`; si no viene o no es de la cuenta, cuenta como la principal. La administración amplía la mensual de una cuenta concreta en su ficha (campo `iaEmpresaMes`), sin tocar variables. La revisión del sistema avisa de las cuentas con alguna empresa por encima del 80 %. |
| `INVITACIONES_DIAS` (30) | Días que se guardan las invitaciones a test después de importarse, caducar o anularse. Después se borran con sus respuestas. |
| `IA_CARACTERES_PRUEBA` (1.500.000) · `IA_CARACTERES_PAGO` (10.000.000) | Texto enviado a la IA al día por cuenta (transcripciones, documentos, conversación). |
| `REGISTROS_HORA` (5) | Altas de cuenta por hora desde una misma IP. |
| `DATA_MAX_CLAVE_MB` (2) · `DATA_MAX_CUENTA_MB` (25) | Tamaño máximo de cada dato guardado (simulador, estrategia…) y del total de la cuenta. Por encima, el servidor responde 413 con un mensaje para el cliente. |
| `ATALAYA_SECRETO` | Secreto para los enlaces de los test, el cifrado del segundo factor y los códigos de recuperación. Si no se pone, se crea `secreto.key` en `ATALAYA_DATA` (permisos 600). Si cambia, dejan de valer los enlaces enviados y hay que volver a activar el segundo factor. |
| `ALMACEN` (`sqlite`) | `json` mantiene la base en `db.json` como en la versión 2.1 (respaldo si `node:sqlite` diera problemas). |
| `ACTIVIDAD_DIAS` (730) | Días que se conserva el registro de actividad del gestor de usuarios. |
| `AVISOS_EMAIL` | Una o varias direcciones (separadas por comas) del equipo que reciben un correo en cada alta, contacto, solicitud de sesión, solicitud de activación o de cambio de plan, cobro, cobro fallido y baja de suscripción. Necesita `SMTP_HOST`. |
| `ADMIN_2FA_RESET` | Quita el segundo factor de la administración (teléfono y códigos perdidos). Cada valor se aplica una sola vez, como `ADMIN_PASSWORD`. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRECIO_<PLAN>_<PERIODO>` o `STRIPE_PRECIOS`, `STRIPE_GRACIA_DIAS` (3), `STRIPE_IMPUESTOS`, `STRIPE_URL_OK`, `STRIPE_URL_CANCELAR`, `STRIPE_URL_PORTAL`, `STRIPE_PRUEBA_TARJETA` (1) | Cobro con Stripe Billing y prueba de 14 días con tarjeta (`0` la desactiva): ver los apartados 5 y 5.1. |

**Base de datos (SQLite desde la versión 2.2)**
- Fichero `ATALAYA_DATA/atalaya.db`, con `node:sqlite` (incluido en Node; sin dependencias nuevas). Modo WAL, `synchronous=FULL`. Todo lo que crea el servidor (base, `-wal`, `-shm`, copias, secreto) nace con permisos 600 (el servidor fija `umask 077`); la carpeta, con 700.
- Una tabla por colección (`usuarios`, `sesiones`, `sesiones_admin`, `resets`, `invitaciones`, `lid360`, `contactos`, `stripe_eventos`, `meta`) con una fila por registro; cada guardado escribe en una transacción **solo las filas que han cambiado** (como mucho uno cada 300 ms). Los datos de las cuentas (`datos`, una fila por cuenta y clave), el análisis de mercado y el registro de actividad se leen y escriben directamente, sin cargarse en memoria.
- **Esquema con migraciones numeradas** (`PRAGMA user_version`, hoy la 2): al arrancar se aplican las que falten, cada una en su transacción. Una base de una versión posterior no se abre.
- **Migración desde `db.json`**: la primera vez que arranca la 2.2 sin `atalaya.db`, lee `db.json` (con la misma recuperación desde copias de antes), escribe la base nueva en `atalaya.db.migrando`, comprueba el número de cuentas y la integridad y, solo entonces, la pone en su sitio y renombra `db.json` a `db.json.migrado-<fecha>` (se conserva intacto; las copias `db.json.1…7` también). La consola dice cuántas cuentas, datos e invitaciones ha migrado. Comprobado con varias cuentas, datos por empresa, mercado, invitaciones, bolsa del 360 y contactos.
- Copias en el disco: antes de la primera escritura de cada mes se rota `atalaya.db.1` (la del mes anterior) y `atalaya.db.2`; la tercera se escribe sobre la más antigua. Se hacen con `VACUUM INTO` (coherentes y compactas, sin parar el servidor). Las copias diarias van fuera del servidor: las de Hetzner y la copia externa cifrada.
- Si `atalaya.db` no se puede abrir o no pasa `PRAGMA quick_check`, el servidor **no arranca** y lista las copias. `ATALAYA_RECUPERAR=1` aparta la base dañada como `atalaya.db.danado-<fecha>` (con su `-wal`) y copia la copia válida más reciente; `ATALAYA_RECUPERAR=vacia` arranca con una base vacía.
- Al recibir SIGTERM o SIGINT (systemd, Docker, Ctrl+C) guarda lo pendiente y cierra la base (sin `-wal` sobrante) antes de salir.
- **Volver a JSON**: `node server.mjs --exportar-json /ruta/db.json` (o `npm run exportar-json -- /ruta/db.json`) vuelca toda la base, con los datos y el registro, a un JSON con permisos 600; se coloca como `db.json` y se arranca con `ALMACEN=json`. Con `ALMACEN=json` el comportamiento es el de la 2.1 (escritura atómica de todo el fichero, `db.json.1` y `.2`). Si un día se quita `ALMACEN=json` con un `db.json` presente y sin `atalaya.db`, se vuelve a migrar.
- `node:sqlite` sigue marcado como experimental en Node 22 y avisa al cargarse; el servidor solo usa su parte básica (`DatabaseSync`, `prepare`, `exec`) y omite ese aviso concreto. Si el Node no lo trae (anterior a 22.13 sin opciones), el servidor avisa y usa `db.json`; si ya hay `atalaya.db`, no arranca.

**Sesiones y enlaces**
- Las sesiones (clientes y administración) se guardan por el hash SHA-256 de su identificador; las de bases anteriores se migran solas al arrancar (nadie pierde la sesión).
- Los enlaces de los test se derivan del secreto del servidor: en `db.json` solo queda su hash. Las invitaciones creadas antes del cambio guardan su enlace como antes y siguen funcionando.
- Los enlaces de recuperación de contraseña ya no se escriben en la consola: solo que se pidió y si se envió el correo. Sin correo configurado, la administración ve la solicitud y genera el enlace.

**Contraseña de administración (`ADMIN_PASSWORD`)**: es para la primera configuración y para recuperar el acceso. El servidor guarda la huella del valor usado y solo vuelve a aplicarlo si cambia: una contraseña cambiada desde la administración ya no se pisa en cada reinicio. Para recuperar el acceso, arranca con un valor **nuevo**.

**Límites de intentos** (en memoria, por ruta): entrar (30 fallos por IP y 10 por correo cada 15 min), comprobar la contraseña de la cuenta (10 por cuenta), alta de cuentas (`REGISTROS_HORA` por IP), contacto (6 por IP y hora), «he olvidado mi contraseña» (10 por IP y 3 por correo cada hora), restablecer (20 fallos por IP), administración (10 fallos por IP, contador propio) y test por enlace (300 por IP). Responden 429 con un mensaje en español.

**IA por plan y cuota**: el asistente (`/api/chat`) y la lectura de documentos (`/api/extract`) están en todos los planes; la lectura de la auditoría integral (`/api/escucha`) solo en Consultora; el agente de mercado (`/api/mercado/actualizar`) desde Profesional. Al pasar la cuota diaria se responde 429 («Has llegado al límite diario de IA…»). El uso queda en cada cuenta (`usoIA` por día, últimos 60 días, e `iaTotal`) y lo devuelve el listado de usuarios de la administración. La actualización automática del mercado (`MERCADO_AUTO_DIAS`) solo corre en cuentas pagadas con plan Profesional o superior. Los errores de la API de Claude no se reenvían al cliente (502/503 con mensaje genérico; el detalle va al registro).

**Datos por cuenta**: solo se aceptan las claves que usa la aplicación (`simulador`, `estrategia`, `personas`, `consultor`, `agenda`, `nota`, `libro`, `intervencion`, cada una también como `clave--idEmpresa`, más `empresas` y `grupo`); cualquier otra responde 400. **Si se añade un dato nuevo en `js/`, hay que darlo de alta en `CLAVES` de `server.mjs`.** Qué planes pueden guardar cada clave (403 si no): `estrategia` desde Profesional; `personas`, `consultor` e `intervencion` solo Consultora; `grupo` en Consultora y Grupos; el resto, todos. Borrar (guardar `null`) siempre se permite.

**Cambio de plan por el cliente**: en la prueba (o sin pagar) puede moverse libremente entre Esencial, Profesional y Consultora. Con el acceso pagado, bajar se aplica al momento (si no le sobran empresas) y subir queda como `planPendiente`: el servidor responde 409 con el aviso para el cliente y crea una solicitud en los avisos de la administración; se confirma eligiendo el plan en la tabla de usuarios (o se descarta con `PATCH /api/admin/users/:id {"planPendiente": null}`). Grupos solo lo concede la administración (también al darse de alta se ignora y queda Profesional).

**Borrar un usuario** (administración) borra también sus datos, su análisis de mercado, sesiones, enlaces de contraseña, invitaciones con sus respuestas, solicitudes de contacto con su correo y su uso de IA, todo en una transacción. En el registro de actividad queda que se borró (correo, plan, estado, fecha de alta y número de pagos).

**Gestor de usuarios** (`admin.html`, `js/admin.js`):
- Cambiar plan o periodo, bloquear y desbloquear piden confirmación con lo que cambia (antes → después, cuota) y un motivo opcional; eliminar una cuenta exige escribir su correo.
- **Registro de actividad** (`GET /api/admin/actividad?cuenta=&accion=&q=&desde=&hasta=&limite=`): cada acción de la administración y los hechos de cuenta relevantes (alta, cambio o petición de plan, solicitud de activación, pagos de Stripe, segundo factor) con fecha, autor (el nombre que se escribe al entrar a la administración, «cliente», «stripe» o «sistema»), acción, cuenta, valores antes y después, nota e IP. Se consulta con filtros en el panel y se descarga en CSV. Se borra pasados `ACTIVIDAD_DIAS`.
- Operaciones: crear un usuario a mano (`POST /api/admin/users`, en prueba o activo, con invitación de 7 días para elegir contraseña), ampliar la prueba (`POST /api/admin/users/:id/prueba {dias}`, guarda `pruebaHasta`), registrar un pago (`POST /api/admin/users/:id/pagos`, amplía el acceso desde el vencimiento) y corregirlo o anularlo con motivo obligatorio (`PATCH /api/admin/users/:id/pagos/:pagoId`), cerrar solicitudes de activación, contraseña o cambio de plan (`POST /api/admin/users/:id/cerrar {tipo}`) y de contacto o sesión (`POST /api/admin/contactos/:id/cerrar`), quitar el segundo factor de un cliente (`POST /api/admin/users/:id/2fa-quitar`).
- **CSV descargable** (usuarios y actividad): separador «;», BOM UTF-8 y fin de línea CRLF para que Excel lo abra bien; los textos que empiezan por `=`, `+`, `-`, `@`, tabulador o retorno se prefijan con `'` para que la hoja de cálculo no los ejecute como fórmulas.
- Indicador «Cobrado 30 días» con los pagos realmente registrados (además de las cuotas de catálogo).

**Segundo factor (TOTP, RFC 6238)**, implementado con `node:crypto`, sin dependencias:
- Administración: «Seguridad» → «Activar el segundo factor». Se muestra la clave en texto (grupos de 4) y la dirección `otpauth://` para añadirla a Google Authenticator, Microsoft Authenticator, 1Password…; se confirma con el primer código. Se entregan 10 códigos de recuperación de un solo uso (se guardan por su HMAC; no se vuelven a mostrar). Al activarlo se cierran las demás sesiones de administración. Desde entonces, entrar pide contraseña y código (o uno de recuperación); un código erróneo cuenta como intento fallido. Cada código vale una sola vez. Regenerar códigos o desactivar pide contraseña y código.
- El secreto se guarda cifrado con AES-256-GCM (clave derivada del secreto del servidor).
- Sin teléfono ni códigos: arrancar con `ADMIN_2FA_RESET=una-palabra` (se aplica una vez por valor).
- Clientes (opcional): `POST /api/me/2fa/iniciar`, `/api/me/2fa/activar {codigo}`, `/api/me/2fa/desactivar {password, codigo}`; con él activado, `POST /api/login` responde 401 `{segundoFactor: true}` hasta recibir `codigo`, y el enlace de nueva contraseña cambia la contraseña sin abrir sesión. **Falta la pantalla en `acceso.html` y en el menú de la cuenta** (no forma parte de esta versión).

**Ficheros que se sirven**: solo `.html`, `.css`, `.js`, imágenes (`.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`, `.gif`, `.ico`), vídeo (`.mp4`, `.webm`, `.vtt`, con rangos de bytes) y fuentes (`.woff`, `.woff2`). Nunca `server/`, `node_modules/`, ficheros o carpetas que empiezan por punto, ni `.md`, `.skill` o `.json`. Una dirección mal codificada responde 400 sin tumbar el servidor.

**Cabeceras de seguridad** en todas las respuestas: `Content-Security-Policy` (scripts propios y de cdnjs, scripts en línea autorizados por su hash página a página, estilos propios y de Google Fonts, conexión con la API de Claude para la clave propia, `blob:` para vídeo, PDF y workers; marcos solo del mismo sitio), `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (micrófono solo para el propio sitio, por el dictado), `X-Content-Type-Options: nosniff` y, con `COOKIE_SECURE=1`, `Strict-Transport-Security`. Si se añade una librería de otro dominio, hay que añadirlo a la política en `server.mjs`.

## 2. Varias empresas por cuenta (comprobar en el servidor)

El servidor ya comprueba el límite de empresas, además del navegador:

- [ ] Una cuenta **Esencial** o **Profesional** no puede dar de alta una segunda empresa: el servidor responde «Tu plan incluye una empresa…» y el selector lo muestra.
- [ ] Una cuenta **Consultora** no pasa de 15 empresas cliente; la principal (la del propio consultor) no cuenta. Su cuota va por tramos de empresas cliente: hasta 5, 349 €/mes; de 6 a 10, 549 €; de 11 a 15, 749 € (anual: 2.931,60 €, 4.611,60 € y 6.291,60 €; sin IVA). Antes de crear la empresa que cambia de tramo se avisa con el precio nuevo. En prueba el precio sigue a las empresas al momento; con el acceso pagado se fija el tramo facturado (`tramo` en la cuenta) y la subida queda como solicitud de cambio («Confirmar el cambio» en el gestor, o el cobro de Stripe del precio del tramo); la bajada al borrar empresas se aplica en la siguiente renovación (al registrar el pago o, con Stripe, cambiando el precio de la suscripción: el servidor avisa al equipo), sin devoluciones.
- [ ] Una cuenta **Grupos** puede dar de alta las sociedades que quiera, y el gestor de usuarios muestra cuántas tiene y su tramo (690 €, 970 € o 1.790 € al mes).
- [ ] No se pueden guardar datos de una empresa que no está dada de alta en la cuenta (`simulador--id` o `estrategia--id`).
- [ ] Si un cliente baja de plan teniendo más empresas, puede seguir viéndolas y borrarlas, pero no crear más.
- [ ] Los datos de cada empresa se guardan aparte y el grupo empresarial los lee todos.

Probado ya en local contra el servidor: Profesional rechazado al crear la segunda empresa; Grupos aceptado; datos de una empresa no registrada, rechazados.

## 3. Correo

- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: enlace de recuperación de contraseña por correo.
- [ ] Prueba de «¿Has olvidado tu contraseña?» de principio a fin.
- [ ] `AVISOS_EMAIL` con el correo del equipo: avisos de altas, contactos, sesiones, solicitudes de activación, cambios de plan pedidos, pruebas con tarjeta empezadas, pruebas que terminan en 3 días, pruebas terminadas sin pago, cobros, cobros fallidos y bajas de suscripción.
- [ ] Con Stripe, el correo es también el del recordatorio al cliente del final de la prueba (tres días antes): sin `SMTP_HOST` no se envía.

## 4. Inteligencia artificial

- [ ] `ANTHROPIC_API_KEY` en el servidor para el asistente, la lectura con IA de documentos y los datos de mercado.
- [ ] Más adelante: que cada cliente pueda poner su propia clave (pendiente).

## 5. Cobro con Stripe Billing

Sin `STRIPE_SECRET_KEY` todo sigue como antes: enlace de pago manual (`P.PAGO_URLS`) o «Solicitar el enlace de pago», y el acceso se activa con «Registrar pago». Con Stripe (sin SDK: el servidor llama a la API REST):

- [ ] En Stripe, un producto por plan con un precio recurrente mensual y otro anual (el anual con el 30 % de descuento). Grupos, si se cobra por Stripe, con su precio pactado.
- [ ] Variables: `STRIPE_SECRET_KEY=sk_live_…` y los precios, una variable por plan y periodo (`STRIPE_PRECIO_ESENCIAL_MENSUAL`, `STRIPE_PRECIO_PROFESIONAL_ANUAL`…) o todos juntos en `STRIPE_PRECIOS='{"profesional-mensual":"price_…","profesional-anual":"price_…"}'`. `GET /api/health` devuelve en `stripe` los planes que se pueden pagar en línea.
- [ ] **Consultora, un precio por tramo de empresas cliente y periodo**: `STRIPE_PRECIO_CONSULTORA_5_MENSUAL` (349 €), `STRIPE_PRECIO_CONSULTORA_5_ANUAL` (2.931,60 €), `STRIPE_PRECIO_CONSULTORA_10_MENSUAL` (549 €), `STRIPE_PRECIO_CONSULTORA_10_ANUAL` (4.611,60 €), `STRIPE_PRECIO_CONSULTORA_15_MENSUAL` (749 €) y `STRIPE_PRECIO_CONSULTORA_15_ANUAL` (6.291,60 €), sin IVA; en `STRIPE_PRECIOS`, las claves `consultora5-mensual`, `consultora5-anual`, `consultora10-mensual`… Las antiguas `STRIPE_PRECIO_CONSULTORA_MENSUAL`/`_ANUAL` (y `consultora-mensual`) siguen valiendo como tramo de 5. El checkout elige el precio del tramo según las empresas cliente de la cuenta (o el tramo pedido, si es mayor) y lo guarda en `metadata[tramo]`; el aviso de Stripe reconoce plan y tramo por el precio (`invoice.paid`, `customer.subscription.updated`) y fija el tramo facturado. Para que el cliente cambie de tramo desde el portal, añada los seis precios al producto de Consultora en la configuración del portal.
- [ ] Aviso (webhook): en Stripe → Desarrolladores → Webhooks, punto de conexión `https://<dominio>/api/stripe/webhook` con los eventos `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` y **`customer.subscription.trial_will_end`** (nuevo: recordatorio del final de la prueba; si el punto de conexión ya existe, hay que añadir este evento a mano); su secreto de firma en `STRIPE_WEBHOOK_SECRET=whsec_…`. Sin él, el servidor avisa al arrancar y en el gestor: los pagos no activarían el acceso solos.
- [ ] Portal de cliente activado en Stripe (Configuración → Facturación → Portal de clientes): cambio de tarjeta, de plan entre los precios de arriba y cancelación al final del periodo.
- [ ] Facturas e IVA: que las emita Stripe (`STRIPE_IMPUESTOS=1` activa el cálculo automático de impuestos si está configurado en Stripe); Checkout pide la dirección de facturación y admite NIF/CIF.
- [ ] Probar con claves de prueba (`sk_test_…`) y `stripe listen --forward-to localhost:8080/api/stripe/webhook` antes de pasar a las reales.

Qué hace el servidor:
- `POST /api/me/pago/checkout {plan, periodo}` (con sesión, aunque la prueba haya vencido; no con la cuenta bloqueada) crea una sesión de Checkout en modo suscripción con la cuenta en `client_reference_id` y `metadata` y devuelve `{url}`. Si el plan no tiene precio responde 404 `{manual: true}` (se sigue con la solicitud manual); si ya hay suscripción activa, 409 `{portal: true}`. Al pagar vuelve a `STRIPE_URL_OK` (por defecto `/app.html?pago=ok`); al cancelar, a `/acceso.html#pago`.
- `POST /api/me/pago/portal` devuelve `{url}` del portal de cliente de Stripe.
- `POST /api/stripe/webhook`: lee el cuerpo **en bruto**, comprueba la cabecera `Stripe-Signature` (HMAC-SHA256 de `t.cuerpo` con `STRIPE_WEBHOOK_SECRET`, comparación en tiempo constante, 5 minutos de margen; si no, 400) y aplica cada evento una sola vez (guarda los identificadores). El pago completado y la factura pagada marcan `pagado`, `estado: activo`, el plan y el periodo del precio, y `venceAcceso` = fin del periodo pagado + `STRIPE_GRACIA_DIAS`; apuntan el cobro en los pagos de la cuenta (una vez por factura, con su enlace) y, si el plan pagado es el que el cliente había pedido (`planPendiente`), lo resuelven y cierran la solicitud. Un cobro fallido marca `pagoFallido` y avisa al equipo (Stripe reintenta; si no cobra, el acceso vence solo al acabar la gracia). La baja de la suscripción no corta el acceso ya pagado: deja de renovarse. Todo queda en el registro de actividad como «stripe».
- Probado con firmas generadas en local: firma correcta activa el plan; firma mala, de otro secreto, sin cabecera o de hace más de 5 minutos → 400; evento repetido → sin efecto.

En el navegador, «Pagar ahora» (y «Añadir la tarjeta y seguir») llama a `/api/me/pago/checkout` cuando `/api/health` anuncia el precio del plan, y el menú de la cuenta ofrece «Gestionar el pago: tarjeta y facturas» con `/api/me/pago/portal`.

### 5.1 Prueba de 14 días con tarjeta (Checkout con periodo de prueba)

Con `STRIPE_SECRET_KEY` y un precio en línea para el plan y la forma de pago de la cuenta (en Consultora, el del tramo de sus empresas cliente: una cuenta nueva tiene 0, tramo de 5), la prueba se hace **con tarjeta**. Sin Stripe, sin precio para ese plan o en Grupos (a medida), todo sigue como antes: 14 días sin tarjeta y activación manual o «Pagar ahora». `STRIPE_PRUEBA_TARJETA=0` (por defecto, activada) vuelve a la prueba sin tarjeta aunque Stripe esté configurado: Stripe solo cobra, sin periodo de prueba en el Checkout. `GET /api/health` lo anuncia en `pruebaTarjeta`.

- **Alta.** Tras `POST /api/register`, la pantalla de alta abre directamente el Checkout. El nombre y el sector de la empresa se guardan en el navegador y se aplican a la ficha al volver. Si el cliente abandona el Checkout, al entrar se le vuelve a pedir la tarjeta.
- **Checkout.** `mode=subscription`, `payment_method_collection=always`, `subscription_data[trial_period_days]=14` y `subscription_data[trial_settings][end_behavior][missing_payment_method]=cancel`, con `automatic_tax` (si `STRIPE_IMPUESTOS=1`), `tax_id_collection` y `billing_address_collection` como antes, y `metadata[prueba]=1`. **Una sola prueba con Stripe por cuenta** (`pruebaStripeUsada`, que se fija con el primer aviso de una suscripción en prueba): una cuenta que ya ha pagado (por Stripe o a mano), que ya tuvo suscripción o cuya prueba interna ha terminado paga sin prueba.
- **Cuentas que ya estaban en la prueba sin tarjeta** (estado «prueba», sin suscripción, sin pagos, plan con precio en línea): al entrar ven la pantalla «Añadir la tarjeta y seguir», con el contacto y «Descargar mis datos»; no se borra nada. El servidor responde 402 a lo demás mientras falte la tarjeta (`access().motivo = 'tarjeta'`; `/api/me` lleva `requiereTarjeta: true`). Conservan sus días: el Checkout lleva `subscription_data[trial_end]` = el final de su prueba interna si está a más de 48 horas (el mínimo de Stripe). **Si quedan menos de 48 horas**, se usa `trial_period_days` = los días que quedan redondeados hacia arriba (1 o 2): como mucho unas horas de más, nunca de menos. Una cuenta recién creada (le quedan los 14 días, con una hora de margen) lleva `trial_period_days=14`.
- **Quién no cambia:** cuentas creadas en el gestor como «Activo» (pagadas), las de Grupos, las de cuota pactada y las que tienen pagos registrados a mano. **Decisión:** las cuentas creadas por la administración **en prueba** (y las invitaciones del asistente) sí añaden la tarjeta al entrar, con los días de prueba que les queden, porque la administración eligió «prueba»; su correo de alta lo dice. Para que una cuenta no tenga que poner tarjeta, créela como «Activo» o regístrele un pago.
- **Acceso durante la prueba con tarjeta.** Manda el estado de la suscripción en Stripe, no la fecha interna de 14 días: `trialing` = estado «prueba» con acceso completo (cuota de IA de prueba); `past_due` justo al terminar la prueba = los `STRIPE_GRACIA_DIAS` días de gracia desde el final de la prueba; `canceled` (al terminar sin tarjeta válida, o si cancela en la prueba) = sin acceso, con los datos conservados. La factura de 0 € con la que Stripe abre la prueba no cuenta como pago. Al pasar a `active`, el acceso pagado empieza al final de la prueba más la gracia, y la factura pagada lo amplía hasta el final del periodo.
- **Recordatorio.** Con el evento `customer.subscription.trial_will_end` (Stripe lo manda tres días antes del final), el servidor envía al cliente un correo (`SMTP_*`) con la fecha, el importe sin IVA más el 21 % y el plan, y cómo cambiar o cancelar desde «Gestionar el pago»; y avisa al equipo (`AVISOS_EMAIL`). Se envía una sola vez por suscripción y fecha de fin, aunque Stripe repita el aviso.
- **Cambios durante la prueba con tarjeta.** Si cambia de plan, de forma de pago o (en Consultora) de tramo de empresas cliente, el servidor cambia el precio de la suscripción en Stripe con `proration_behavior=none` (no hay nada cobrado todavía), así el primer cargo es el del plan que tenga ese día. Si no hay precio en línea para lo nuevo o Stripe no acepta el cambio, avisa al equipo para hacerlo a mano. «Ampliar prueba» en el gestor también retrasa el `trial_end` en Stripe.

**En Stripe (lo que debe activar el propietario):**
- [ ] Añadir el evento `customer.subscription.trial_will_end` al punto de conexión del webhook (los demás ya estaban).
- [ ] Portal de clientes: permitir **cancelar la suscripción** (también durante la prueba) y cambiar de tarjeta; los precios de cada plan, incluidos los seis de Consultora, en «Productos» del portal.
- [ ] Opcional: en Configuración → Facturación → Suscripciones y correos, desactivar el correo propio de Stripe de «la prueba termina pronto» para que el cliente no reciba dos recordatorios (el de Atalaya ya lo hace), o dejar los dos si se prefiere.
- [ ] Comprobar en modo de prueba un alta completa: Checkout con tarjeta `4242…`, suscripción en `trialing`, y con un reloj de pruebas (Test clocks) el final de la prueba con y sin tarjeta.

## 5 bis. HubSpot y la integración con el asistente de Familias Empresarias

**Variables** (todas opcionales; sin ellas no se llama a HubSpot y las rutas de integración responden 404):

| Variable | Para qué |
|---|---|
| `HUBSPOT_TOKEN` | Token de una aplicación privada de HubSpot con permisos `crm.objects.contacts.read/write`, `crm.objects.companies.read/write` y de notas y tareas. Con él, cada **alta**, **solicitud de contacto**, **solicitud de sesión estratégica**, **solicitud de activación**, **cambio de plan** e **invitación de alta** crea o actualiza el contacto (por correo y, si no hay, por teléfono), lo asocia a su empresa (por el dominio del correo si no es de un proveedor genérico, o por el nombre; si no existe, la crea), añade una nota con el origen («Atalaya · solicitud de sesión estratégica», «Atalaya · alta de cuenta», «Atalaya · solicitud de activación», «Atalaya · cambio de plan»…) y una tarea para el propietario. Va en segundo plano y en fila: no retrasa la respuesta al cliente. Ante 429 espera lo que diga `Retry-After` (o 0,5-10 s) y reintenta hasta 6 veces; ante fallos 5xx o de red, 3. Cada envío tiene una clave (`meta.hubspot` en la base): si se reenvía la misma solicitud no se duplican la nota ni la tarea. Los ids de contacto y de empresa de HubSpot quedan en la cuenta (`hubspotContactId`, `hubspotCompanyId`) y en la solicitud. |
| `HUBSPOT_OWNER_ID` | Propietario (id de usuario de HubSpot) al que se asignan las tareas. Sin él, la tarea queda sin propietario. |
| `HUBSPOT_PROP_CUENTA` | Nombre interno de una propiedad personalizada del contacto (texto) donde guardar el id de la cuenta de Atalaya 360°. Créela antes en HubSpot; sin esta variable, el id va en la nota. |
| `HUBSPOT_API_URL` (`https://api.hubapi.com`) | Dirección base de la API (solo para pruebas con un HubSpot falso). |
| `INTEGRACION_TOKEN` | Secreto compartido con el asistente (el mismo valor en los dos servidores; al menos 32 caracteres aleatorios, por ejemplo `openssl rand -hex 32`). Activa `POST /api/integracion/reunion` y `POST /api/integracion/invitar`, que exigen `Authorization: Bearer <INTEGRACION_TOKEN>` (comparación en tiempo constante). Sin él, 404. |
| `INTEGRACION_MINUTO` (60) | Peticiones de integración por minuto y por IP. Con 10 tokens erróneos en 15 minutos, esa IP queda bloqueada 15 minutos (429). |
| `ZONA_HORARIA` (`Europe/Madrid`) | Zona en la que se calcula la fecha y la hora de las reuniones que llegan en ISO. |

**`POST /api/integracion/reunion`** · cuerpo `{ id, inicio, fin, titulo, enlace, nombre, email, telefono, empresa, hubspotContactId, hubspotCompanyId, origen: 'asistente' }`.
- Busca la empresa por `hubspotCompanyId` en el campo `hubspotId` de las fichas de empresa (registro `empresas` de cada cuenta), después por el `hubspotCompanyId` o `hubspotContactId` de la cuenta, después la cuenta por el correo del contacto (empresa principal) y, por último, una ficha cuyo correo de contacto coincida.
- Añade a la mesa de esa empresa (clave `agenda`, o `agenda--<empresa>`) una tarea `{ oid: 'asistente:reunion:<id>', t: 'Sesión estratégica con <nombre> (<empresa>)', tipo: 'imperativa', mundo: 'reunion', origen: 'asistente', fecha, hora, dur, enlace, contacto, clave: true }`. Si llega otra vez, actualiza la misma tarea (cambio de hora) o no hace nada. La escritura del servidor cambia la versión del dato: la pestaña que tenga la mesa abierta recibe 409 al guardar y lo combina.
- Responde `{ ok: true, cuenta, empresa, tarea, accion: 'creada' | 'actualizada' | 'sin-cambios' }` o `{ ok: false, motivo: 'sin-cuenta' }`.

**`POST /api/integracion/invitar`** · cuerpo `{ email, nombre, empresa, telefono, hubspotCompanyId, hubspotContactId?, plan? }`.
- Si no hay cuenta con ese correo, la crea en prueba (14 días desde hoy, plan elegido entre Esencial, Profesional y Consultora; Profesional por defecto) con nombre, empresa y teléfono, y su ficha de empresa principal con `hubspotId`. Si ya existe pero nunca se ha usado, renueva la invitación. Si ya se usa, no envía nada (`existente: true`).
- Envía el correo con el enlace para elegir la contraseña (el mismo mecanismo que el restablecimiento, válido 7 días). Responde `{ ok, cuenta, creada, enviado }` y, **solo si el correo no se ha podido enviar**, `enlace`.
- Las dos rutas quedan en el registro de actividad con autor «asistente» (`integracion.reunion`, `integracion.reunion.sin-cuenta`, `integracion.invitar`).

**Comprobación**
- [ ] `HUBSPOT_TOKEN` y `HUBSPOT_OWNER_ID` puestos; una solicitud de sesión de prueba aparece en HubSpot con su nota y su tarea.
- [ ] El mismo `INTEGRACION_TOKEN` en Atalaya y en el asistente; la ruta sin token responde 401.
- [ ] Las fichas de empresa de los clientes que vienen de HubSpot tienen su `hubspotId`.
- Pruebas con un HubSpot y un SMTP falsos: `prueba-integracion.mjs` (45 comprobaciones) y `prueba-servidor.mjs` (regresión básica).

## 5 ter. Cuenta de demostración (presentaciones comerciales)

Una cuenta para enseñar Atalaya 360° en reuniones y ferias, con empresas ficticias ya cargadas. La crea el propio servidor al arrancar, como `ADMIN_PASSWORD` la contraseña de la administración: nadie tiene que escribir la contraseña en ningún chat ni entrar a la administración para crearla.

| Variable | Por defecto | Qué hace |
|---|---|---|
| `DEMO_PASSWORD` (**secreta**) | — | Contraseña de la demostración, de 12 caracteres o más. **Sin ella (o vacía, o más corta) la demostración no se puede usar**: no se crea, y si ya existía queda desactivada al arrancar (no se entra y se cierran sus sesiones), con sus datos guardados. Si cambia su valor, al arrancar se pone la nueva y se cierran todas las sesiones de la demostración. |
| `DEMO_EMAIL` | `demo@businessavance.es` | Correo con el que se entra. Si ya es el de una cuenta de cliente, no se toca y el arranque avisa en la consola. |
| `DEMO_PLAN` | `consultora` | Plan con el que se enseña (abre simulador, sistema estratégico, personas y equipos, auditoría integral y cartera de clientes). Si cambia, la cuenta pasa a ese plan con sus datos de partida. |
| `IA_DEMO_EUR_DIA` | `1.5` | Gasto máximo de IA al día de la demostración, en euros (lo comparten todos los que la usen ese día). |
| `IA_DIARIA_DEMO` | `60` | Además, máximo de consultas de IA al día (mismos pesos: el agente de mercado cuenta 5). La cuota por empresa de Consultora y Grupos también se aplica. |
| `EUR_USD` | `1.08` | Dólares por euro para pasar el coste de la API a euros. |
| `DEMO_HORA` · `DEMO_HORA_LIMITE` | `04:00` · `07:00` | Hora del restablecimiento nocturno y hora máxima a la que se puede aplazar, en `ZONA_HORARIA` (Europe/Madrid, con el cambio de hora). |
| `DEMO_INTENTOS_HORA` | `10` | Fallos de contraseña por hora con el correo de la demostración, por IP y en total para la cuenta (además de los límites generales). Al llegar, nadie puede entrar en la demostración durante una hora. |

**Generar y cambiar la contraseña.** En cualquier terminal: `openssl rand -base64 18` (24 caracteres). Se pega en Coolify como variable secreta `DEMO_PASSWORD` y se vuelve a desplegar. Para rotarla, se pone un valor nuevo y se despliega: se cierran todas las sesiones abiertas de la demostración y la anterior deja de valer. Para apagarla, se borra la variable (o se deja vacía) y se despliega.

**Qué hace la demostración (y qué no)**
- Acceso pagado sin vencimiento: nunca pide tarjeta (no le afecta la prueba con tarjeta) y el servidor rechaza para ella el Checkout, el portal de pago, «solicitar el enlace de pago», los cambios de plan, de forma de pago y de tramo, y cualquier aviso de Stripe que la nombre. Stripe no recibe nada suyo.
- No se le puede cambiar la contraseña, el correo ni activar la verificación en dos pasos desde la aplicación (la comparten varias personas). «He olvidado mi contraseña» con su correo responde lo mismo que con un correo sin cuenta y no crea ningún enlace; un enlace de restablecimiento no le vale. En la administración, «Cambiar contraseña», «Generar enlace», registrar pagos, ampliar la prueba, cambiar el plan y eliminar la cuenta responden 409: la contraseña solo viene de `DEMO_PASSWORD`.
- No envía ningún correo: las invitaciones a test crean el enlace pero no lo mandan, el recordatorio y el reenvío no envían, y lo que se mande desde el formulario de contacto con su sesión no se guarda. No llega nada a HubSpot ni a `AVISOS_EMAIL`.
- Admite varias sesiones a la vez (dos personas presentando). Sin segundo factor.
- No cuenta como cliente: fuera de las cuotas al mes, los recuentos y el uso del gestor de usuarios, de la revisión del sistema (sale una línea informativa) y de la actualización automática del análisis de mercado. En la tabla de usuarios aparece con la insignia «Demostración», sin cuota; en el CSV va marcada en la columna `demo` y con la cuota a 0.
- En la aplicación se ve un aviso pequeño: «Cuenta de demostración. No introduzca datos reales: se restablece cada noche.» (en la cabecera si cabe; se puede ocultar en la pestaña y siempre está en el menú de la cuenta).
- Vista de Grupos: con `DEMO_PLAN` Consultora o Grupos, el menú de la cuenta ofrece «Enseñar la vista Grupos: grupo empresarial y consolidado» (y la vuelta a Consultora). Cada vista tiene sus datos de partida (un grupo con una holding y tres filiales, con operaciones dentro del grupo), así que cambiar de vista restablece la demostración; no toca ningún cobro. El paseo virtual y «Enseñarla como el plan…» de la empresa modelo no abren la vista de grupo: solo cambian los mundos de la empresa modelo, que nunca entra en el consolidado.

**Datos de partida y restablecimiento.** La semilla está en `server/demo-semilla.json` (se genera con `node server/generar-semilla-demo.mjs`): en Consultora, el despacho del consultor y seis empresas cliente ficticias (nombres inventados que no aparecen en ningún documento del repositorio, sin NIF), cada una con cinco años de cuentas, su proyecto de inversión en el simulador y, para la cartera operativa, su punto en la auditoría, próximas sesiones y tareas (las fechas son relativas al día del restablecimiento). La empresa modelo (Valdenorte) sigue como siempre en cada navegador.
- Cada noche a `DEMO_HORA` se borra todo lo que se haya escrito (empresas, mundos, análisis de mercado, invitaciones y respuestas) y vuelve la semilla del plan de `DEMO_PLAN`. Si la demostración se ha usado en los últimos 30 minutos, se aplaza de 30 en 30 minutos, como mucho hasta `DEMO_HORA_LIMITE`.
- Cada navegador borra su copia local (empresa modelo, copias de los mundos, cambios pendientes, conversación del asistente) la primera vez que entra después de un restablecimiento.
- A mano: gestor de usuarios → ficha de la demostración → «Restablecer la demostración». Si hay una sesión abierta o un uso en la última media hora, avisa y pide escribir RESTABLECER.
- El gasto de IA del día no se pone a cero al restablecer.

**Coste de la IA (supuestos del tope en euros).** El coste de cada consulta se calcula con el uso de tokens que devuelve la API: entrada a 4 $ por millón de tokens (la de caché, leída o escrita, se cuenta igual, por prudencia), salida a 20 $ por millón y búsquedas web a 10 $ cada mil; se divide entre `EUR_USD`. Si la respuesta no trae el uso, se estima a lo alto: un token por cada 3 caracteres enviados más la salida máxima pedida (16.000 tokens = 0,32 $) y las búsquedas que permita la herramienta. Orientativamente, una pregunta al asistente con el contexto de la página (unos 20.000 tokens de entrada y 600 de salida) cuesta unos 0,09 $ (0,08 €), y una actualización del agente de mercado (dos peticiones con hasta 16 búsquedas) entre 0,30 y 0,60 $. Con 1,5 € al día caben unas 15-20 preguntas al asistente. Al llegar al tope, la aplicación dice: «Por hoy se ha alcanzado el uso de IA previsto para la demostración. Vuelve a estar disponible mañana.» El gasto del día se ve en la ficha de la demostración.

**Comprobación**
- [ ] `DEMO_PASSWORD` puesta como secreta en Coolify; tras desplegar, la consola dice «Cuenta de demostración creada: demo@businessavance.es».
- [ ] Entrar con ella en `/acceso.html`: aviso de demostración, cartera con seis empresas cliente y ninguna petición de tarjeta.
- [ ] En el gestor de usuarios sale con la insignia «Demostración» y no suma en «Cuotas al mes».
- Pruebas: `prueba-demo.mjs` (servidor, con Stripe, SMTP, HubSpot y Anthropic falsos) y `ui-demo.js` (navegador, 1440 y 390 px).

## 6. Otros

- [ ] Las librerías externas (Three.js, lectura de Excel y PDF) se cargan de cdnjs: comprobar que el servidor no las bloquea.
- [ ] Probar el recorrido completo con un usuario de cada plan: alta con tarjeta, prueba de 14 días, recordatorio a los 11 días, primer cobro el día 15 (o cancelación sin coste antes), y reactivación pagando sin prueba.

---

# Opciones de cobro

| Opción | Necesita servidor | Activa el acceso solo | Coste aproximado | Encaje |
|---|---|---|---|---|
| **Enlaces de pago de Stripe** (Payment Links) | No | No: el pago llega a Stripe y se registra a mano | Tarjeta UE ≈ 1,5 % + 0,25 € | Para empezar ya, sin programar |
| **Stripe Billing + aviso al servidor** (webhook) | Sí | Sí: al cobrar se amplía el acceso; si falla, aviso y bloqueo | Tarjeta ≈ 1,5 % + 0,25 € y ≈ 0,7 % de Billing | **Recomendada** al subir al servidor |
| **Domiciliación SEPA** (GoCardless o SEPA dentro de Stripe) | Sí | Sí | ≈ 1 % + 0,20 € con tope por cobro | Ideal para Grupos y pagos anuales altos |
| TPV del banco (Redsys) | Sí | Con más trabajo | Comisión baja negociada | Suscripciones complejas de montar |
| Revendedor que factura por ti (Paddle, Lemon Squeezy) | Sí | Sí | ≈ 5 % + 0,50 € | Solo si se vende mucho fuera de España |

**Recomendación**

1. **Ahora, sin servidor:** crear en Stripe un enlace de pago por plan y periodo (mensual y anual, y los tres tramos de Grupos). Se envía al cliente cuando pide la activación y, al ver el pago en Stripe, se pulsa «Registrar pago» en administración. Cero desarrollo.
2. **Al subir al servidor:** Stripe Billing con suscripciones mensual y anual (−30 %). Grupos como tres precios según el tramo, más la tarjeta y la domiciliación SEPA. El servidor recibe el aviso de Stripe y:
   - con el pago confirmado, marca el pago y amplía el acceso hasta el final del periodo;
   - si un cobro falla, avisa y bloquea tras unos días de gracia;
   - al cancelarse la suscripción, deja de renovar el acceso.

   El cliente cambia de tarjeta o de plan desde el portal de Stripe. **Hecho en el servidor (versión 2.2, apartado 5)**; falta el botón «Pagar» que use la sesión de Checkout en la pantalla de activación (`js/platform.js`).
3. **Facturas:** que las emita Stripe con IVA, o la herramienta de facturación que ya uses. Revisa con tu asesor las obligaciones de facturación electrónica (VeriFactu) y su calendario.
