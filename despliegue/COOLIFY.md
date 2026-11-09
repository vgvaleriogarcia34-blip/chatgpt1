# Atalaya 360° en Coolify (servidor Hetzner 2.29.35.108)

Servidor CX23 de Hetzner con la imagen de Coolify. Coolify construye la imagen desde GitHub con `atalaya/Dockerfile`, publica la aplicación con HTTPS (certificado de Let's Encrypt) y guarda la base de datos en un volumen persistente. En este modo no se usan `instalar.sh`, Caddy ni `docker-compose.yml` de esta carpeta: Coolify hace ese papel.

## 1. Fuente

- **Repositorio:** `vgvaleriogarcia34-blip/chatgpt1` (privado).
- **Conexión:** «GitHub App» de Coolify, instalada solo en este repositorio, o «Deploy Key»: Coolify da una clave pública que se añade en GitHub → repositorio → Settings → Deploy keys, en modo solo lectura.
- **Rama:** `claude/wonderful-newton-durhbz`, hasta que se una a `main`.

## 2. Aplicación

| Campo en Coolify | Valor |
|---|---|
| Build Pack | Dockerfile |
| Base Directory | `/atalaya` |
| Dockerfile Location | `/Dockerfile` |
| Ports Exposes | `8080` |
| Domains | `https://app.businessavance.es` |
| Health Check | activado, ruta `/api/health`, puerto 8080 |

## 3. Almacenamiento persistente (imprescindible)

En «Persistent Storage» → «Add», cree un volumen:

- **Name:** `atalaya-datos`
- **Destination Path:** `/datos`

Ahí están la base de datos (`atalaya.db`), sus dos copias mensuales (la tercera se escribe sobre la más antigua) y `secreto.key`. **Sin este volumen, cada despliegue borraría todas las cuentas.**

## 4. Variables de entorno

Las marcadas como secreto se crean en Coolify como «Secret» o «Locked» y se guardan también en el gestor de contraseñas.

| Variable | Valor | Secreto |
|---|---|---|
| `NODE_ENV` | `production` | |
| `APP_URL` | `https://app.businessavance.es` | |
| `COOKIE_SECURE` | `1` | |
| `TRUST_PROXY` | `1` | |
| `ZONA_HORARIA` | `Europe/Madrid` | |
| `ADMIN_PASSWORD` | contraseña inicial de la administración, de 20 caracteres o más | sí |
| `ATALAYA_SECRETO` | 64 caracteres aleatorios, para enlaces, segundo factor y códigos de recuperación; no cambiarlo una vez en marcha | sí |
| `ANTHROPIC_API_KEY` | clave de la API de Claude (la IA) | sí |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | correo de salida (más adelante) | `SMTP_PASS` sí |
| `INTEGRACION_TOKEN` | el mismo valor que en el asistente telefónico (más adelante) | sí |
| `IA_DIARIA_PRUEBA` (20), `IA_DIARIA_PAGO` (200) | consultas de IA al día por cuenta, en prueba y con el acceso pagado (opcionales) | |
| `IA_MENSUAL_EMPRESA` (300), `IA_DIARIA_EMPRESA` (40) | en Consultora y Grupos, consultas de IA de cada empresa al mes y al día, además de la diaria de la cuenta; el agente de mercado cuenta como 5 (opcionales). La administración amplía la mensual de una cuenta desde su ficha | |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | cobro con tarjeta y prueba de 14 días con tarjeta | sí |
| `STRIPE_PRECIO_ESENCIAL_MENSUAL`, `_ANUAL`, `STRIPE_PRECIO_PROFESIONAL_MENSUAL`, `_ANUAL` | precios de Stripe (`price_…`) de Esencial y Profesional | |
| `STRIPE_PRECIO_CONSULTORA_5_MENSUAL`, `_5_ANUAL`, `_10_MENSUAL`, `_10_ANUAL`, `_15_MENSUAL`, `_15_ANUAL` | precios de Stripe de Consultora por tramo de empresas cliente: hasta 5 (349 €/mes · 2.931,60 €/año), de 6 a 10 (549 € · 4.611,60 €) y de 11 a 15 (749 € · 6.291,60 €), sin IVA. Las antiguas `STRIPE_PRECIO_CONSULTORA_MENSUAL`/`_ANUAL` siguen valiendo como tramo de 5 | |
| `STRIPE_IMPUESTOS` (`1`) · `STRIPE_GRACIA_DIAS` (3) | cálculo automático del IVA en el Checkout (opcional) y días de margen tras el fin del periodo pagado o de la prueba si falla el cobro | |
| `DEMO_PASSWORD` | contraseña de la cuenta de demostración para presentaciones (12 caracteres o más; generarla con `openssl rand -base64 18`). Sin ella, o vacía, la demostración no se puede usar | sí |
| `DEMO_EMAIL` (`demo@businessavance.es`) | correo con el que se entra en la demostración (opcional) | |
| `DEMO_PLAN` (`consultora`) | plan con el que se enseña la demostración (opcional) | |
| `IA_DEMO_EUR_DIA` (`1.5`), `IA_DIARIA_DEMO` (60) | tope de gasto de IA al día de la demostración, en euros, y máximo de consultas al día (opcionales) | |

**Prueba de 14 días con tarjeta.** Con `STRIPE_SECRET_KEY` y el precio del plan configurado, la prueba se hace con tarjeta en el Checkout de Stripe: no se cobra hasta el día 15 y Stripe cancela la suscripción si al final no hay tarjeta válida. No hace falta ninguna variable nueva en Coolify; `STRIPE_PRUEBA_TARJETA=0` la desactiva (vuelve la prueba sin tarjeta) si hiciera falta volver atrás sin cambiar el código. En Stripe hay que:

- añadir el evento **`customer.subscription.trial_will_end`** al webhook `https://app.businessavance.es/api/stripe/webhook` (además de `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed` y `customer.subscription.created`, `.updated` y `.deleted`);
- en el portal de clientes, permitir cancelar la suscripción y cambiar de tarjeta.

Tres días antes del final de la prueba el servidor envía el recordatorio al cliente por correo y avisa a `AVISOS_EMAIL`: necesita `SMTP_*`. Detalle completo en `atalaya/PUESTA-EN-MARCHA.md`, apartado 5.1.

**Códigos de prueba (sin tarjeta).** No hace falta ninguna variable en Coolify: los códigos se crean en el gestor de usuarios (`https://app.businessavance.es/admin.html`, caja «Códigos de prueba») y se guardan en la base del servidor, en el volumen de datos (entran en las copias). Quien se da de alta con un código prueba el plan y los días del código sin tarjeta; al terminar se le pide la tarjeta y paga sin otro periodo de prueba en Stripe. El recordatorio de tres días antes usa el mismo `SMTP_*`. Opcional: `CODIGOS_INTENTOS_HORA` (5), códigos erróneos admitidos por IP y hora. Detalle en `atalaya/PUESTA-EN-MARCHA.md`, apartado 5.2.

**Cuenta de demostración.** La crea el servidor al arrancar con `DEMO_PASSWORD`: no hace falta entrar a la administración. Para crearla, genere la contraseña con `openssl rand -base64 18`, póngala en Coolify como variable secreta `DEMO_PASSWORD` y vuelva a desplegar; se entra en `https://app.businessavance.es/acceso.html` con `demo@businessavance.es`. Para cambiarla, ponga un valor nuevo y despliegue: se cierran todas las sesiones de la demostración. Para apagarla, borre la variable y despliegue (la cuenta se conserva desactivada). Sus datos vuelven cada noche a las 04:00 (hora de Madrid) a las empresas ficticias de partida. Detalle en `atalaya/PUESTA-EN-MARCHA.md`, apartado 5 ter.

Para generar `ATALAYA_SECRETO`, en la terminal de Coolify o en cualquier ordenador:

```
openssl rand -hex 32
```

## 5. DNS en IONOS

En el dominio businessavance.es → DNS → añadir un registro:

- **Tipo:** A
- **Nombre de host:** `app`
- **Valor:** `2.29.35.108`
- **TTL:** 1 hora

Si Hetzner le ha dado también una dirección IPv6, añada un registro AAAA con ella.

## 6. Seguridad del servidor

- **Panel de Coolify:** ponerle un dominio propio con HTTPS, por ejemplo `panel.businessavance.es` (Settings → Instance Domain). Después, cerrar el puerto 8000 en el cortafuegos de Hetzner. Mientras se use por el puerto 8000, la contraseña del panel viaja sin cifrar.
- **Cortafuegos de Hetzner:** dejar abiertos solo los puertos 22, 80 y 443. Si es posible, limitar el 22 a la IP de su oficina.
- **Autenticación en dos pasos:** en Hetzner y en Coolify.
- **Copias de seguridad:** activar las copias diarias de Hetzner en el servidor. Más adelante se añade la copia externa cifrada del volumen `atalaya-datos` (Coolify → «Backups» con destino S3, o `copia-seguridad.sh` adaptado).

## 7. Comprobación

1. `https://app.businessavance.es/api/health` responde `{"atalaya":true,...}`.
2. `https://app.businessavance.es/admin.html`: entrar con `ADMIN_PASSWORD`, cambiarla y activar el segundo factor en «Seguridad».
3. «Revisión del sistema» en la administración, sin nada por corregir salvo lo pendiente: copia externa, correo, Stripe y HubSpot.
4. Hacer un nuevo despliegue en Coolify y comprobar que las cuentas siguen ahí. Así se confirma que el volumen persiste.
