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

Ahí están la base de datos (`atalaya.db`), sus siete copias diarias y `secreto.key`. **Sin este volumen, cada despliegue borraría todas las cuentas.**

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
