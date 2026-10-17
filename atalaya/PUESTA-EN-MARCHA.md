# Puesta en marcha en el servidor · lista de comprobaciones

Lo que hay que revisar el día que Atalaya pase de la demostración en el navegador a su propio servidor (`server/server.mjs`). Marca cada punto al comprobarlo.

## 1. Arranque y seguridad

- [ ] Node 20 o superior; `cd server && npm install` (instala `nodemailer` para el correo).
- [ ] Variables de entorno: `PORT`, `ATALAYA_DATA` (carpeta de la base de datos), `APP_URL` (dirección pública), `COOKIE_SECURE=1` con HTTPS, `ADMIN_PASSWORD` o código de configuración inicial, `NODE_ENV=production` y, detrás de un proxy, `TRUST_PROXY=1` (ver «Seguridad del servidor» abajo).
- [ ] HTTPS delante (Caddy o Nginx) y redirección de http a https.
- [ ] `ATALAYA_DATA` fuera de la carpeta de la web (por ejemplo `/var/lib/atalaya`); el servidor no arranca si está dentro (salvo bajo `server/`, que nunca se sirve).
- [ ] Copia de seguridad diaria de **toda** la carpeta `ATALAYA_DATA` en otra máquina (el servidor guarda 7 copias rotatorias, pero en el mismo disco). Incluye `secreto.key`: sin él dejan de valer los enlaces de los test enviados.
- [ ] Contraseña de administración configurada y acceso solo por `index.html#admin` o `admin.html`.
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
| `ATALAYA_SECRETO` | Secreto para los enlaces de los test. Si no se pone, se crea `secreto.key` en `ATALAYA_DATA` (permisos 600). |

**Base de datos**
- Se escribe de forma atómica (fichero temporal y cambio de nombre) con permisos 600; la carpeta, con 700.
- Antes de la primera escritura de cada día se rota una copia: `db.json.1` (la de ayer) … `db.json.7`.
- Si `db.json` existe pero no se puede leer, el servidor **no arranca** (antes arrancaba vacío y lo sobrescribía) y muestra las copias disponibles. Para recuperar: `ATALAYA_RECUPERAR=1 node server.mjs` aparta el fichero dañado como `db.json.danado-<fecha>` y carga la copia válida más reciente; después se arranca normal. También se puede copiar a mano una de las copias sobre `db.json`.
- Al recibir SIGTERM o SIGINT (systemd, Docker, Ctrl+C) guarda lo pendiente antes de salir.

**Sesiones y enlaces**
- Las sesiones (clientes y administración) se guardan por el hash SHA-256 de su identificador; las de bases anteriores se migran solas al arrancar (nadie pierde la sesión).
- Los enlaces de los test se derivan del secreto del servidor: en `db.json` solo queda su hash. Las invitaciones creadas antes del cambio guardan su enlace como antes y siguen funcionando.
- Los enlaces de recuperación de contraseña ya no se escriben en la consola: solo que se pidió y si se envió el correo. Sin correo configurado, la administración ve la solicitud y genera el enlace.

**Contraseña de administración (`ADMIN_PASSWORD`)**: es para la primera configuración y para recuperar el acceso. El servidor guarda la huella del valor usado y solo vuelve a aplicarlo si cambia: una contraseña cambiada desde la administración ya no se pisa en cada reinicio. Para recuperar el acceso, arranca con un valor **nuevo**.

**Límites de intentos** (en memoria, por ruta): entrar (30 fallos por IP y 10 por correo cada 15 min), comprobar la contraseña de la cuenta (10 por cuenta), alta de cuentas (`REGISTROS_HORA` por IP), contacto (6 por IP y hora), «he olvidado mi contraseña» (10 por IP y 3 por correo cada hora), restablecer (20 fallos por IP), administración (10 fallos por IP, contador propio) y test por enlace (300 por IP). Responden 429 con un mensaje en español.

**IA por plan y cuota**: el asistente (`/api/chat`) y la lectura de documentos (`/api/extract`) están en todos los planes; la lectura de la auditoría integral (`/api/escucha`) solo en Consultora; el agente de mercado (`/api/mercado/actualizar`) desde Profesional. Al pasar la cuota diaria se responde 429 («Has llegado al límite diario de IA…»). El uso queda en cada cuenta (`usoIA` por día, últimos 60 días, e `iaTotal`) y lo devuelve el listado de usuarios de la administración. La actualización automática del mercado (`MERCADO_AUTO_DIAS`) solo corre en cuentas pagadas con plan Profesional o superior. Los errores de la API de Claude no se reenvían al cliente (502/503 con mensaje genérico; el detalle va al registro).

**Datos por cuenta**: solo se aceptan las claves que usa la aplicación (`simulador`, `estrategia`, `personas`, `consultor`, `agenda`, `nota`, `libro`, `intervencion`, cada una también como `clave--idEmpresa`, más `empresas` y `grupo`); cualquier otra responde 400. **Si se añade un dato nuevo en `js/`, hay que darlo de alta en `CLAVES` de `server.mjs`.** Qué planes pueden guardar cada clave (403 si no): `estrategia` desde Profesional; `personas`, `consultor` e `intervencion` solo Consultora; `grupo` en Consultora y Grupos; el resto, todos. Borrar (guardar `null`) siempre se permite.

**Cambio de plan por el cliente**: en la prueba (o sin pagar) puede moverse libremente entre Esencial, Profesional y Consultora. Con el acceso pagado, bajar se aplica al momento (si no le sobran empresas) y subir queda como `planPendiente`: el servidor responde 409 con el aviso para el cliente y crea una solicitud en los avisos de la administración; se confirma eligiendo el plan en la tabla de usuarios (o se descarta con `PATCH /api/admin/users/:id {"planPendiente": null}`). Grupos solo lo concede la administración (también al darse de alta se ignora y queda Profesional).

**Borrar un usuario** (administración) borra también sus datos, su análisis de mercado, sesiones, enlaces de contraseña, invitaciones con sus respuestas, solicitudes de contacto con su correo y su uso de IA.

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

## 4. Inteligencia artificial

- [ ] `ANTHROPIC_API_KEY` en el servidor para el asistente, la lectura con IA de documentos y los datos de mercado.
- [ ] Más adelante: que cada cliente pueda poner su propia clave (pendiente).

## 5. Cobro

Ver «Opciones de cobro» abajo. Hasta tener el cobro automático, el acceso se activa a mano desde administración («Registrar pago»).

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

   El cliente cambia de tarjeta o de plan desde el portal de Stripe. Desarrollo estimado: dos rutas nuevas en `server.mjs` (pago y aviso de Stripe) y un botón «Pagar» en la pantalla de activación.
3. **Facturas:** que las emita Stripe con IVA, o la herramienta de facturación que ya uses. Revisa con tu asesor las obligaciones de facturación electrónica (VeriFactu) y su calendario.
