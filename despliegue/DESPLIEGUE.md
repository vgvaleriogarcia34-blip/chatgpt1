# Dónde y cómo poner Atalaya 360° en producción

Estudio y guía de instalación · noviembre de 2026.

## 1. Qué necesita Atalaya

- **Un servidor que esté siempre encendido.** Las sesiones, los cobros de Stripe, el agente de mercado y las tareas diarias (copias, purgas) corren en el propio proceso.
- **Un disco que no se borre.** Las cuentas y los datos de los clientes están en una base SQLite (`atalaya.db`). Es la decisión correcta para una aplicación de este tamaño: rápida, con copias coherentes sin parar el servicio y sin otro servidor que mantener. Pero exige que el fichero viva en un disco persistente.
- **Una sola instancia escribiendo en la base.** No necesita varias máquinas: con un servidor mediano atiende a cientos de clientes a la vez.
- **Datos en la Unión Europea.** Atalaya guarda cuentas, cifras y planes de empresas españolas. Con el RGPD conviene que el proveedor sea europeo, con centros de datos en la UE y contrato de encargado del tratamiento (art. 28).
- **HTTPS, copias fuera del servidor y actualizaciones de seguridad.**

## 2. Por qué no Replit para clientes

Replit sirve para prototipar y enseñar, pero no para dar acceso a clientes con sus datos:

- Sus despliegues (Autoscale, Static y Reserved VM) **no tienen almacenamiento persistente**: lo que se guarda en el disco se pierde al volver a desplegar. La base `atalaya.db`, con todas las cuentas, desaparecería en cada publicación. Replit propone su PostgreSQL o su almacén de objetos, lo que obligaría a rehacer el almacén de Atalaya.
- Autoscale duerme la aplicación tras unos minutos sin visitas: el primer cliente espera el arranque y las tareas programadas no corren.
- Los centros de datos y el contrato están pensados para Estados Unidos. Es posible cumplir el RGPD, pero es más trabajo justificarlo ante un cliente o una auditoría.

## 3. Dónde lo ponen los profesionales

Para una aplicación como esta (un proceso Node, una base SQLite, clientes en España) los equipos profesionales eligen entre dos caminos:

| Opción | Ejemplos | A favor | En contra |
|---|---|---|---|
| **Servidor virtual propio en la UE + Docker** | Hetzner Cloud (Alemania, Finlandia), OVHcloud (Francia), Scaleway (Francia), IONOS (Alemania, España) | Coste bajo y fijo; disco persistente; datos en la UE con proveedor europeo; control total; sin cambiar el código | Hay que mantener el sistema (lo automatizan los scripts de esta carpeta) |
| **Plataforma gestionada con disco** | Render (Fráncfort), Fly.io (Ámsterdam, París), Railway | No hay sistema operativo que mantener; despliegue al subir a GitHub | Más caro según crece; disco persistente de pago y atado a una sola máquina; empresas de EE. UU.; copias externas igualmente por su cuenta |
| Nube grande | AWS, Google Cloud, Azure (regiones Madrid, Fráncfort) | Todo tipo de servicios y certificaciones | Complejidad y factura variable desproporcionadas para este tamaño |

**Recomendación: Hetzner Cloud, en Núremberg o Falkenstein (Alemania).**

- Empresa alemana, centros de datos en Alemania y Finlandia, certificación ISO 27001 y contrato de encargado del tratamiento conforme al RGPD que se firma en el panel.
- Un servidor de 2–4 núcleos y 4–8 GB de memoria cubre Atalaya y el asistente telefónico con margen. Hetzner ha cambiado sus precios dos veces en 2026; según su lista actual, los planes de núcleos compartidos (líneas CX y CAX) siguen en el orden de 5–15 € al mes y los de núcleos dedicados han subido mucho. Compruebe el precio en hetzner.com antes de contratar. Con núcleos compartidos basta.
- Para las copias, una **Storage Box** de Hetzner (en otro centro de datos, desde unos 4 € al mes) o su almacén de objetos S3. Las copias van cifradas antes de salir del servidor.
- Si algún día hiciera falta más, el mismo montaje con Docker se lleva a cualquier otro proveedor sin cambiar nada.

**¿Y la base de datos?** No hace falta contratar un PostgreSQL. La base SQLite se crea sola en el primer arranque, con sus migraciones, comprobación de integridad, siete copias diarias en el disco y recuperación automática (ver `atalaya/PUESTA-EN-MARCHA.md`). Esta instalación añade la copia diaria **fuera** del servidor. Pasar a PostgreSQL solo tendría sentido con varias máquinas sirviendo a la vez, que no es el caso.

## 4. Qué instala `instalar.sh`

```
Internet ──HTTPS──▶ Caddy (certificado automático) ──▶ Atalaya (Node 22) ──▶ /srv/atalaya-datos/atalaya/atalaya.db
                                                   └─▶ Asistente (opcional) ──▶ /srv/atalaya-datos/asistente/asistente.db
Cada noche, 03:30 ──▶ copia coherente de las bases ──▶ cifrada con restic ──▶ Storage Box / S3 en la UE
```

1. Sistema al día, **actualizaciones de seguridad automáticas**, zona horaria de Madrid.
2. **Cortafuegos** con solo SSH, 80 y 443 abiertos, y **fail2ban** contra ataques por SSH.
3. **Docker** y el código del repositorio en `/srv/atalaya` (con una clave de solo lectura para GitHub).
4. Los datos en `/srv/atalaya-datos`, fuera del código y con permisos solo para el servicio.
5. Secretos generados al azar: contraseña inicial de la administración, secreto del servidor, clave de la integración con el asistente y clave de las copias.
6. **HTTPS** con Caddy y Let's Encrypt, renovación automática.
7. **Copia diaria cifrada** fuera del servidor: 14 diarias, 8 semanales y 12 mensuales.
8. Comprueba que la aplicación responde y muestra la dirección, la contraseña inicial y la clave de las copias.

## 5. Paso a paso

**Antes de empezar**

1. Publique en la rama `main` la versión que quiera poner en producción, o indique otra rama al instalar.
2. Cree una cuenta en Hetzner Cloud y firme el contrato de encargado del tratamiento (panel → «Data Processing Agreement»).
3. Cree el servidor:
   - ubicación Núremberg o Falkenstein;
   - imagen Ubuntu 24.04;
   - un plan de núcleos compartidos con 4–8 GB de memoria;
   - su clave SSH.
4. Si va a usar Storage Box para las copias, contrátela y active el acceso por SSH.
5. En el DNS de su dominio, cree un registro A de `app.su-dominio.es` con la IP del servidor. Si va a instalar el asistente telefónico, otro registro para `asistente.su-dominio.es`.

**Instalación** (unos 10 minutos)

```bash
ssh root@IP_DEL_SERVIDOR
curl -fsSLO https://raw.githubusercontent.com/vgvaleriogarcia34-blip/chatgpt1/main/despliegue/instalar.sh   # si el repositorio es privado, cópielo con scp
bash instalar.sh
```

El script pregunta:
- el repositorio y la rama;
- el dominio de Atalaya y, si lo usa, el del asistente;
- el correo para el certificado HTTPS;
- el destino de las copias.

Le pedirá que añada una clave de despliegue en GitHub (repositorio → Settings → Deploy keys, solo lectura).

**Al terminar**

1. Guarde **fuera del servidor**, por ejemplo en su gestor de contraseñas:
   - la contraseña inicial de la administración;
   - la **clave de las copias**. Sin ella no se puede recuperar ninguna copia.
2. Entre en `https://app.su-dominio.es/admin.html`, cambie la contraseña y **active el segundo factor** en «Seguridad».
3. Complete `/srv/atalaya/despliegue/atalaya.env`:
   - `ANTHROPIC_API_KEY` (la IA);
   - el correo de salida (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`);
   - Stripe y HubSpot, si los usa.

   Después ejecute `bash /srv/atalaya/despliegue/actualizar.sh`.
4. Abra «Revisión del sistema» en la administración: debe quedar sin nada por corregir.

**Cuentas de clientes**: con la aplicación en marcha, los clientes se dan de alta solos en `acceso.html` (14 días de prueba), o usted los crea desde la administración. Con Stripe configurado, pagan con tarjeta y el acceso se activa solo. Sin Stripe, registra usted el pago.

## 6. El día a día

| Tarea | Orden |
|---|---|
| Publicar una versión nueva | `bash /srv/atalaya/despliegue/actualizar.sh`: hace copia antes y, si la versión nueva no arranca, vuelve sola a la anterior |
| Ver el estado | `bash /srv/atalaya/despliegue/comprobar.sh` |
| Ver el registro | `cd /srv/atalaya/despliegue && docker compose logs --tail 200 atalaya` |
| Hacer una copia ahora | `bash /srv/atalaya/despliegue/copia-seguridad.sh` |
| Ver las copias | `set -a; . /srv/atalaya-datos/secretos/copia.env; set +a; RESTIC_PASSWORD_FILE=/srv/atalaya-datos/secretos/restic.clave restic snapshots` |

**Recuperar una copia** (en el mismo servidor o en uno nuevo instalado con `instalar.sh`):

```bash
cd /srv/atalaya/despliegue && docker compose stop atalaya
set -a; . /srv/atalaya-datos/secretos/copia.env; set +a
export RESTIC_PASSWORD_FILE=/srv/atalaya-datos/secretos/restic.clave
restic restore latest --target /tmp/recuperar
cp /tmp/recuperar/srv/atalaya-datos/copia/actual/atalaya.db /srv/atalaya-datos/atalaya/atalaya.db
cp /tmp/recuperar/srv/atalaya-datos/copia/actual/secreto.key /srv/atalaya-datos/atalaya/ 2>/dev/null
rm -f /srv/atalaya-datos/atalaya/atalaya.db-wal /srv/atalaya-datos/atalaya/atalaya.db-shm
chown 1000:1000 /srv/atalaya-datos/atalaya/*
docker compose start atalaya
```

Haga una prueba de recuperación en un servidor aparte una vez al trimestre: una copia que nunca se ha recuperado no está comprobada.

## 7. La administración y la IA

**Revisión del sistema** (`admin.html` → «Revisión del sistema»). Revisa:
- el modo producción, HTTPS y las cookies;
- el segundo factor de la administración;
- la integridad de la base;
- las copias en el disco y la copia externa, con su antigüedad;
- el disco libre;
- que estén los archivos de la aplicación;
- los servicios conectados (IA, correo, Stripe, HubSpot, asistente);
- los cobros fallidos y los accesos que vencen en 7 días;
- las solicitudes sin atender;
- los errores del registro de las últimas 24 horas.

**Pedir diagnóstico a la IA.** Envía esa revisión a Claude y devuelve, en castellano y de usted, qué corregir primero y con qué paso exacto. Admite una pregunta libre, por ejemplo «¿por qué falla la copia?». A la IA solo le llegan recuentos y estados, nunca correos, nombres ni datos de las empresas.

**Correcciones en el código.** El servidor solo publica lo que está en GitHub. Las correcciones se hacen con Claude Code, desde el navegador (claude.ai/code) o el ordenador, sobre el repositorio. Claude Code abre una rama, hace el cambio y pasa las pruebas; usted lo revisa y lo une a `main`. Después ejecuta `actualizar.sh` en el servidor.

Así nadie toca el servidor a mano y cada cambio queda registrado y se puede deshacer. No es buena idea dar a una IA acceso directo al servidor de producción, que tiene los datos de los clientes: si se equivoca, los daños son inmediatos.

**Avisos.** Conviene dar de alta la dirección `https://app.su-dominio.es/api/health` en un vigilante gratuito como UptimeRobot o Better Stack. Le avisará por correo o en el móvil si la web deja de responder.

## 8. Lista antes de abrir a clientes

- [ ] Contrato de encargado del tratamiento firmado con Hetzner y anotado en `atalaya/RGPD.md`.
- [ ] HTTPS funcionando y `NODE_ENV=production` (el servidor no arranca sin HTTPS en producción).
- [ ] Segundo factor de la administración activo y códigos de recuperación guardados fuera.
- [ ] Copia externa hecha y **una recuperación de prueba** completada.
- [ ] Correo de salida configurado (invitaciones y contraseñas olvidadas).
- [ ] Textos legales validados por el abogado (aviso legal, privacidad, condiciones y cookies).
- [ ] «Revisión del sistema» sin nada por corregir.
- [ ] Vigilante externo de la web dado de alta.
