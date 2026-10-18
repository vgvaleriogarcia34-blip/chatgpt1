# Puesta en marcha en el servidor · lista de comprobaciones

Lo que hay que revisar el día que Atalaya pase de la demostración en el navegador a su propio servidor (`server/server.mjs`). Marca cada punto al comprobarlo.

## 1. Arranque y seguridad

- [ ] Node 22.13 o superior (trae `node:sqlite` sin opciones; con 22.5–22.12 el servidor sigue con `db.json`); `cd server && npm install` (instala `nodemailer` para el correo).
- [ ] Variables de entorno: `PORT`, `ATALAYA_DATA` (carpeta de la base de datos), `APP_URL` (dirección pública), `COOKIE_SECURE=1` con HTTPS, `ADMIN_PASSWORD` o código de configuración inicial, `NODE_ENV=production` y, detrás de un proxy, `TRUST_PROXY=1` (ver «Seguridad del servidor» abajo).
- [ ] HTTPS delante (Caddy o Nginx) y redirección de http a https.
- [ ] `ATALAYA_DATA` fuera de la carpeta de la web (por ejemplo `/var/lib/atalaya`); el servidor no arranca si está dentro (salvo bajo `server/`, que nunca se sirve).
- [ ] Copia de seguridad diaria de **toda** la carpeta `ATALAYA_DATA` en otra máquina (el servidor guarda 7 copias rotatorias, pero en el mismo disco). Copie `atalaya.db.1` (la copia coherente del día) o pare el servidor antes de copiar `atalaya.db`, que con el servidor en marcha va acompañada de `atalaya.db-wal`. Incluye `secreto.key`: sin él dejan de valer los enlaces de los test enviados, el segundo factor y los códigos de recuperación.
- [ ] Una sola instancia del servidor por carpeta de datos (SQLite admite un único proceso escritor como este).
- [ ] Contraseña de administración configurada y acceso solo por `index.html#admin` o `admin.html`. **Segundo factor activado** en «Seguridad» y los códigos de recuperación guardados fuera del servidor.
- [ ] Revisar las cuotas diarias de IA (`IA_DIARIA_PRUEBA`, `IA_DIARIA_PAGO`) según el coste que se quiera asumir por cliente.

## 1 bis. Seguridad del servidor · variables y comportamiento

**Variables nuevas** (todas opcionales; entre paréntesis, el valor por defecto):

| Variable | Para qué |
|---|---|
| `NODE_ENV=production` | Activa las comprobaciones de producción: el servidor **no arranca** si `APP_URL` no empieza por `https://` o falta `COOKIE_SECURE=1`, y avisa si la administración no tiene contraseña. |
| `ATALAYA_PERMITIR_INSEGURO=1` | Arranca en producción pese a esos fallos (solo para pruebas). |
| `TRUST_PROXY` (sin valor) | Número de proxies de confianza delante del servidor. Con `1` (Caddy o Nginx en la misma máquina) la IP del cliente se toma de la última entrada de `X-Forwarded-For`, la que añade el proxy; las anteriores las puede inventar el cliente y se ignoran. Sin la variable, la cabecera no se lee (si se pone sin tener proxy, cualquiera podría saltarse los límites de intentos). El proxy debe **añadir** la IP (`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` en Nginx; Caddy lo hace solo). |
| `ATALAYA_RECUPERAR=1` | Recuperación de una base de datos dañada (ver abajo). `ATALAYA_RECUPERAR=vacia` arranca con una base vacía. |
| `IA_DIARIA_PRUEBA` (20) · `IA_DIARIA_PAGO` (200) | Consultas de IA al día por cuenta en la prueba gratuita y con el acceso pagado. El agente de mercado cuenta como 5 (hace búsquedas web). `0` deja sin IA. |
| `INVITACIONES_DIAS` (30) | Días que se guardan las invitaciones a test después de importarse, caducar o anularse. Después se borran con sus respuestas. |
| `IA_CARACTERES_PRUEBA` (1.500.000) · `IA_CARACTERES_PAGO` (10.000.000) | Texto enviado a la IA al día por cuenta (transcripciones, documentos, conversación). |
| `REGISTROS_HORA` (5) | Altas de cuenta por hora desde una misma IP. |
| `DATA_MAX_CLAVE_MB` (2) · `DATA_MAX_CUENTA_MB` (25) | Tamaño máximo de cada dato guardado (simulador, estrategia…) y del total de la cuenta. Por encima, el servidor responde 413 con un mensaje para el cliente. |
| `ATALAYA_SECRETO` | Secreto para los enlaces de los test, el cifrado del segundo factor y los códigos de recuperación. Si no se pone, se crea `secreto.key` en `ATALAYA_DATA` (permisos 600). Si cambia, dejan de valer los enlaces enviados y hay que volver a activar el segundo factor. |
| `ALMACEN` (`sqlite`) | `json` mantiene la base en `db.json` como en la versión 2.1 (respaldo si `node:sqlite` diera problemas). |
| `ACTIVIDAD_DIAS` (730) | Días que se conserva el registro de actividad del gestor de usuarios. |
| `AVISOS_EMAIL` | Una o varias direcciones (separadas por comas) del equipo que reciben un correo en cada alta, contacto, solicitud de sesión, solicitud de activación o de cambio de plan, cobro, cobro fallido y baja de suscripción. Necesita `SMTP_HOST`. |
| `ADMIN_2FA_RESET` | Quita el segundo factor de la administración (teléfono y códigos perdidos). Cada valor se aplica una sola vez, como `ADMIN_PASSWORD`. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRECIO_<PLAN>_<PERIODO>` o `STRIPE_PRECIOS`, `STRIPE_GRACIA_DIAS` (3), `STRIPE_IMPUESTOS`, `STRIPE_URL_OK`, `STRIPE_URL_CANCELAR`, `STRIPE_URL_PORTAL` | Cobro con Stripe Billing: ver el apartado 5. |

**Base de datos (SQLite desde la versión 2.2)**
- Fichero `ATALAYA_DATA/atalaya.db`, con `node:sqlite` (incluido en Node; sin dependencias nuevas). Modo WAL, `synchronous=FULL`. Todo lo que crea el servidor (base, `-wal`, `-shm`, copias, secreto) nace con permisos 600 (el servidor fija `umask 077`); la carpeta, con 700.
- Una tabla por colección (`usuarios`, `sesiones`, `sesiones_admin`, `resets`, `invitaciones`, `lid360`, `contactos`, `stripe_eventos`, `meta`) con una fila por registro; cada guardado escribe en una transacción **solo las filas que han cambiado** (como mucho uno cada 300 ms). Los datos de las cuentas (`datos`, una fila por cuenta y clave), el análisis de mercado y el registro de actividad se leen y escriben directamente, sin cargarse en memoria.
- **Esquema con migraciones numeradas** (`PRAGMA user_version`, hoy la 2): al arrancar se aplican las que falten, cada una en su transacción. Una base de una versión posterior no se abre.
- **Migración desde `db.json`**: la primera vez que arranca la 2.2 sin `atalaya.db`, lee `db.json` (con la misma recuperación desde copias de antes), escribe la base nueva en `atalaya.db.migrando`, comprueba el número de cuentas y la integridad y, solo entonces, la pone en su sitio y renombra `db.json` a `db.json.migrado-<fecha>` (se conserva intacto; las copias `db.json.1…7` también). La consola dice cuántas cuentas, datos e invitaciones ha migrado. Comprobado con varias cuentas, datos por empresa, mercado, invitaciones, bolsa del 360 y contactos.
- Copias: antes de la primera escritura de cada día se rota `atalaya.db.1` (la de ayer) … `atalaya.db.7`, hechas con `VACUUM INTO` (coherentes y compactas, sin parar el servidor).
- Si `atalaya.db` no se puede abrir o no pasa `PRAGMA quick_check`, el servidor **no arranca** y lista las copias. `ATALAYA_RECUPERAR=1` aparta la base dañada como `atalaya.db.danado-<fecha>` (con su `-wal`) y copia la copia válida más reciente; `ATALAYA_RECUPERAR=vacia` arranca con una base vacía.
- Al recibir SIGTERM o SIGINT (systemd, Docker, Ctrl+C) guarda lo pendiente y cierra la base (sin `-wal` sobrante) antes de salir.
- **Volver a JSON**: `node server.mjs --exportar-json /ruta/db.json` (o `npm run exportar-json -- /ruta/db.json`) vuelca toda la base, con los datos y el registro, a un JSON con permisos 600; se coloca como `db.json` y se arranca con `ALMACEN=json`. Con `ALMACEN=json` el comportamiento es el de la 2.1 (escritura atómica de todo el fichero, `db.json.1…7`). Si un día se quita `ALMACEN=json` con un `db.json` presente y sin `atalaya.db`, se vuelve a migrar.
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
- [ ] Una cuenta **Consultora** no pasa de 15 empresas.
- [ ] Una cuenta **Grupos** puede dar de alta las sociedades que quiera, y el gestor de usuarios muestra cuántas tiene y su tramo (690 €, 970 € o 1.790 € al mes).
- [ ] No se pueden guardar datos de una empresa que no está dada de alta en la cuenta (`simulador--id` o `estrategia--id`).
- [ ] Si un cliente baja de plan teniendo más empresas, puede seguir viéndolas y borrarlas, pero no crear más.
- [ ] Los datos de cada empresa se guardan aparte y la vista de grupo los lee todos.

Probado ya en local contra el servidor: Profesional rechazado al crear la segunda empresa; Grupos aceptado; datos de una empresa no registrada, rechazados.

## 3. Correo

- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: enlace de recuperación de contraseña por correo.
- [ ] Prueba de «¿Has olvidado tu contraseña?» de principio a fin.
- [ ] `AVISOS_EMAIL` con el correo del equipo: avisos de altas, contactos, sesiones, solicitudes de activación, cambios de plan pedidos, cobros, cobros fallidos y bajas de suscripción.

## 4. Inteligencia artificial

- [ ] `ANTHROPIC_API_KEY` en el servidor para el asistente, la lectura con IA de documentos y los datos de mercado.
- [ ] Más adelante: que cada cliente pueda poner su propia clave (pendiente).

## 5. Cobro con Stripe Billing

Sin `STRIPE_SECRET_KEY` todo sigue como antes: enlace de pago manual (`P.PAGO_URLS`) o «Solicitar el enlace de pago», y el acceso se activa con «Registrar pago». Con Stripe (sin SDK: el servidor llama a la API REST):

- [ ] En Stripe, un producto por plan con un precio recurrente mensual y otro anual (el anual con el 30 % de descuento). Grupos, si se cobra por Stripe, con su precio pactado.
- [ ] Variables: `STRIPE_SECRET_KEY=sk_live_…` y los precios, una variable por plan y periodo (`STRIPE_PRECIO_ESENCIAL_MENSUAL`, `STRIPE_PRECIO_PROFESIONAL_ANUAL`…) o todos juntos en `STRIPE_PRECIOS='{"profesional-mensual":"price_…","profesional-anual":"price_…"}'`. `GET /api/health` devuelve en `stripe` los planes que se pueden pagar en línea.
- [ ] Aviso (webhook): en Stripe → Desarrolladores → Webhooks, punto de conexión `https://<dominio>/api/stripe/webhook` con los eventos `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`; su secreto de firma en `STRIPE_WEBHOOK_SECRET=whsec_…`. Sin él, el servidor avisa al arrancar y en el gestor: los pagos no activarían el acceso solos.
- [ ] Portal de cliente activado en Stripe (Configuración → Facturación → Portal de clientes): cambio de tarjeta, de plan entre los precios de arriba y cancelación al final del periodo.
- [ ] Facturas e IVA: que las emita Stripe (`STRIPE_IMPUESTOS=1` activa el cálculo automático de impuestos si está configurado en Stripe); Checkout pide la dirección de facturación y admite NIF/CIF.
- [ ] Probar con claves de prueba (`sk_test_…`) y `stripe listen --forward-to localhost:8080/api/stripe/webhook` antes de pasar a las reales.

Qué hace el servidor:
- `POST /api/me/pago/checkout {plan, periodo}` (con sesión, aunque la prueba haya vencido; no con la cuenta bloqueada) crea una sesión de Checkout en modo suscripción con la cuenta en `client_reference_id` y `metadata` y devuelve `{url}`. Si el plan no tiene precio responde 404 `{manual: true}` (se sigue con la solicitud manual); si ya hay suscripción activa, 409 `{portal: true}`. Al pagar vuelve a `STRIPE_URL_OK` (por defecto `/app.html?pago=ok`); al cancelar, a `/acceso.html#pago`.
- `POST /api/me/pago/portal` devuelve `{url}` del portal de cliente de Stripe.
- `POST /api/stripe/webhook`: lee el cuerpo **en bruto**, comprueba la cabecera `Stripe-Signature` (HMAC-SHA256 de `t.cuerpo` con `STRIPE_WEBHOOK_SECRET`, comparación en tiempo constante, 5 minutos de margen; si no, 400) y aplica cada evento una sola vez (guarda los identificadores). El pago completado y la factura pagada marcan `pagado`, `estado: activo`, el plan y el periodo del precio, y `venceAcceso` = fin del periodo pagado + `STRIPE_GRACIA_DIAS`; apuntan el cobro en los pagos de la cuenta (una vez por factura, con su enlace) y, si el plan pagado es el que el cliente había pedido (`planPendiente`), lo resuelven y cierran la solicitud. Un cobro fallido marca `pagoFallido` y avisa al equipo (Stripe reintenta; si no cobra, el acceso vence solo al acabar la gracia). La baja de la suscripción no corta el acceso ya pagado: deja de renovarse. Todo queda en el registro de actividad como «stripe».
- Probado con firmas generadas en local: firma correcta activa el plan; firma mala, de otro secreto, sin cabecera o de hace más de 5 minutos → 400; evento repetido → sin efecto.

**Pendiente en el navegador** (`js/platform.js`, fuera de esta versión del servidor): que «Pagar ahora» llame a `/api/me/pago/checkout` cuando `/api/health` anuncia Stripe y que el menú de la cuenta ofrezca «Gestionar el pago» con `/api/me/pago/portal`. Hasta entonces, la pantalla de activación sigue con el enlace manual o la solicitud.

## 6. Otros

- [ ] Las librerías externas (Three.js, lectura de Excel y PDF) se cargan de cdnjs: comprobar que el servidor no las bloquea.
- [ ] Probar el recorrido completo con un usuario de cada plan: alta, prueba de 14 días, fin de la prueba, pago y reactivación.

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
