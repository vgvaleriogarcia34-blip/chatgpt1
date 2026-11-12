#!/usr/bin/env bash
# Atalaya 360° · instalación en un servidor nuevo (Ubuntu 24.04 LTS, por ejemplo Hetzner Cloud en Alemania).
#
#   1. Cree el servidor y apunte el DNS: un registro A de app.su-dominio.es (y, si lo usa, asistente.su-dominio.es) a su IP.
#   2. Entre como root y ejecute:
#        curl -fsSLO https://raw.githubusercontent.com/<usuario>/<repo>/main/despliegue/instalar.sh   # o cópielo con scp
#        bash instalar.sh
#   3. Responda a las preguntas. Al final verá la dirección, la contraseña inicial de la administración y la clave de las copias.
#
# Qué hace: actualiza el sistema y lo deja con actualizaciones de seguridad automáticas, cortafuegos (solo 22, 80 y 443),
# bloqueo de ataques por SSH (fail2ban), Docker, la aplicación con HTTPS (Caddy + Let's Encrypt), la base de datos SQLite
# en /srv/atalaya-datos y una copia de seguridad cifrada diaria fuera del servidor (restic).
# Se puede volver a ejecutar: no pisa los secretos ni los datos que ya existan.
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "Ejecútelo como root (sudo bash instalar.sh)."; exit 1; }
. /etc/os-release
[ "${ID:-}" = ubuntu ] || echo "Aviso: probado en Ubuntu 24.04; este sistema es ${PRETTY_NAME:-desconocido}."

DIR=/srv/atalaya            # código (clon del repositorio)
DATOS=/srv/atalaya-datos    # base de datos, secretos y copias locales (fuera del código)
DESP=$DIR/despliegue
pregunta() { local v=""; read -r -p "$1${2:+ [$2]}: " v || true; echo "${v:-${2:-}}"; }
aleatorio() { openssl rand -base64 "${1:-32}" | tr -d '/+=\n' | cut -c1-"${2:-40}"; }

echo "== Datos de la instalación =="
REPO=${REPO:-$(pregunta "Repositorio (SSH)" "git@github.com:vgvaleriogarcia34-blip/chatgpt1.git")}
RAMA=${RAMA:-$(pregunta "Rama que se publica" "main")}
DOMINIO_APP=${DOMINIO_APP:-$(pregunta "Dominio de Atalaya (sin https://)" "app.businessavance.es")}
DOMINIO_ASISTENTE=${DOMINIO_ASISTENTE:-$(pregunta "Dominio del asistente telefónico (vacío para no instalarlo)" "")}
CORREO_CERTIFICADOS=${CORREO_CERTIFICADOS:-$(pregunta "Correo de FAMILIAS EMPRESARIAS, S.L. para avisos del certificado HTTPS (obligatorio)" "")}
[ -n "$CORREO_CERTIFICADOS" ] || { echo "Falta CORREO_CERTIFICADOS: indique el correo para los avisos del certificado HTTPS (variable CORREO_CERTIFICADOS)." >&2; exit 1; }
echo
echo "Copia de seguridad externa (restic). Ejemplos de destino:"
echo "  Hetzner Storage Box:  sftp:u123456@u123456.your-storagebox.de:/atalaya"
echo "  Almacén S3 en la UE:  s3:https://fsn1.your-objectstorage.com/mi-cubo/atalaya"
COPIA_DESTINO=${COPIA_DESTINO:-$(pregunta "Destino de la copia (vacío para configurarlo después)" "")}

echo "== 1/7 Sistema, actualizaciones automáticas y cortafuegos =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
apt-get install -yq ca-certificates curl git openssl ufw fail2ban unattended-upgrades restic jq
dpkg-reconfigure -f noninteractive unattended-upgrades
timedatectl set-timezone Europe/Madrid || true
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null

echo "== 2/7 Docker =="
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker >/dev/null

echo "== 3/7 Código =="
if [ ! -d "$DIR/.git" ]; then
  if [[ "$REPO" == git@* ]]; then
    mkdir -p /root/.ssh && chmod 700 /root/.ssh
    [ -f /root/.ssh/atalaya_deploy ] || ssh-keygen -q -t ed25519 -N "" -C "despliegue-atalaya@$(hostname)" -f /root/.ssh/atalaya_deploy
    grep -q github.com /root/.ssh/known_hosts 2>/dev/null || ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null
    printf 'Host github.com\n  IdentityFile /root/.ssh/atalaya_deploy\n  IdentitiesOnly yes\n' > /root/.ssh/config
    echo
    echo "Añada esta clave en GitHub → repositorio → Settings → Deploy keys → Add deploy key (solo lectura):"
    echo; cat /root/.ssh/atalaya_deploy.pub; echo
    read -r -p "Pulse Intro cuando la haya añadido… " _
  fi
  git clone --branch "$RAMA" "$REPO" "$DIR"
  # Si el repositorio se descarga con una clave de lectura (https://x-access-token:CLAVE@github.com/…),
  # la clave pasa al almacén de credenciales de root (permisos 600) y la dirección del remoto queda limpia
  if [[ "$REPO" == https://*@* ]]; then
    umask 077; printf '%s\n' "$(echo "$REPO" | sed -E 's#^(https://[^/]+)/.*#\1#')" > /root/.git-credentials; umask 022
    git -C "$DIR" config credential.helper store
    git -C "$DIR" remote set-url origin "$(echo "$REPO" | sed -E 's#://[^@]+@#://#')"
  fi
else
  git -C "$DIR" fetch -q origin "$RAMA" && git -C "$DIR" checkout -q "$RAMA" && git -C "$DIR" pull -q --ff-only origin "$RAMA"
fi

echo "== 4/7 Carpetas de datos =="
mkdir -p "$DATOS/atalaya" "$DATOS/asistente" "$DATOS/secretos" "$DATOS/copia"
chown -R 1000:1000 "$DATOS/atalaya" "$DATOS/asistente"   # usuario «node» de los contenedores
chmod 700 "$DATOS" "$DATOS/atalaya" "$DATOS/asistente" "$DATOS/secretos" "$DATOS/copia"

echo "== 5/7 Configuración y secretos =="
cd "$DESP"
NUEVA_ADMIN=""
if [ ! -f atalaya.env ]; then
  cp atalaya.env.ejemplo atalaya.env
  NUEVA_ADMIN=$(aleatorio 24 20)
  INTEG=$(aleatorio 48 48)
  sed -i "s#^APP_URL=.*#APP_URL=https://$DOMINIO_APP#; s#^ADMIN_PASSWORD=.*#ADMIN_PASSWORD=$NUEVA_ADMIN#; s#^ATALAYA_SECRETO=.*#ATALAYA_SECRETO=$(aleatorio 48 64)#; s#^INTEGRACION_TOKEN=.*#INTEGRACION_TOKEN=$INTEG#" atalaya.env
  if [ -n "$DOMINIO_ASISTENTE" ] && [ ! -f asistente.env ]; then
    cp ../asistente-fe/.env.ejemplo asistente.env
    sed -i "s#^URL_PUBLICA=.*#URL_PUBLICA=https://$DOMINIO_ASISTENTE#; s#^ATALAYA_URL=.*#ATALAYA_URL=https://$DOMINIO_APP#; s#^INTEGRACION_TOKEN=.*#INTEGRACION_TOKEN=$INTEG#; s#^PANEL_SECRETO=.*#PANEL_SECRETO=$(aleatorio 48 64)#" asistente.env
  fi
fi
chmod 600 atalaya.env; [ -f asistente.env ] && chmod 600 asistente.env
cat > .env <<EOF
DOMINIO_APP=$DOMINIO_APP
CORREO_CERTIFICADOS=$CORREO_CERTIFICADOS
EOF
mkdir -p sitios
echo "# Sitios adicionales de Caddy" > sitios/00-base.caddy
PERFIL=()
if [ -n "$DOMINIO_ASISTENTE" ]; then
  printf '%s {\n\treverse_proxy asistente:8090\n}\n' "$DOMINIO_ASISTENTE" > sitios/asistente.caddy
  PERFIL=(--profile asistente)
fi
echo "${PERFIL[*]:-}" > .perfil

echo "== 6/7 Copia de seguridad diaria (restic, cifrada) =="
[ -f "$DATOS/secretos/restic.clave" ] || { aleatorio 48 48 > "$DATOS/secretos/restic.clave"; chmod 600 "$DATOS/secretos/restic.clave"; }
[ -f "$DATOS/secretos/copia.env" ] || printf 'RESTIC_REPOSITORY=%s\n# Para un destino S3: AWS_ACCESS_KEY_ID=… y AWS_SECRET_ACCESS_KEY=…\n' "$COPIA_DESTINO" > "$DATOS/secretos/copia.env"
# Credenciales del almacén S3 de las copias, si se pasan al instalar (Hetzner Object Storage u otro S3 en la UE)
if [ -n "${COPIA_S3_ID:-}" ] && ! grep -q '^AWS_ACCESS_KEY_ID=' "$DATOS/secretos/copia.env"; then
  printf 'AWS_ACCESS_KEY_ID=%s\nAWS_SECRET_ACCESS_KEY=%s\n' "$COPIA_S3_ID" "${COPIA_S3_CLAVE:-}" >> "$DATOS/secretos/copia.env"
fi
chmod 600 "$DATOS/secretos/copia.env"
cat > /etc/systemd/system/atalaya-copia.service <<EOF
[Unit]
Description=Atalaya 360° · copia de seguridad externa
After=docker.service
[Service]
Type=oneshot
ExecStart=/bin/bash $DESP/copia-seguridad.sh
EOF
cat > /etc/systemd/system/atalaya-copia.timer <<'EOF'
[Unit]
Description=Atalaya 360° · copia diaria a las 03:30
[Timer]
OnCalendar=*-*-* 03:30:00
RandomizedDelaySec=10min
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now atalaya-copia.timer >/dev/null

echo "== 7/7 Arranque =="
docker compose "${PERFIL[@]}" up -d --build
echo -n "Esperando a que Atalaya responda"
for i in $(seq 1 60); do
  if docker compose exec -T atalaya node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" 2>/dev/null; then echo " · en marcha"; break; fi
  echo -n "."; sleep 2
done
if [ -n "$COPIA_DESTINO" ]; then
  set -a; . "$DATOS/secretos/copia.env"; set +a
  RESTIC_PASSWORD_FILE="$DATOS/secretos/restic.clave" restic snapshots >/dev/null 2>&1 || RESTIC_PASSWORD_FILE="$DATOS/secretos/restic.clave" restic init || echo "Aviso: no se pudo preparar el destino de la copia. Revíselo en $DATOS/secretos/copia.env."
  bash "$DESP/copia-seguridad.sh" || echo "Aviso: la primera copia ha fallado. Revise el destino en $DATOS/secretos/copia.env."
fi

# Las credenciales iniciales quedan también en un fichero solo para root (para instalaciones sin pantalla, como cloud-init)
umask 077
{ echo "Atalaya 360° · credenciales iniciales ($(date '+%d/%m/%Y %H:%M'))"
  echo "Dirección: https://$DOMINIO_APP · administración: https://$DOMINIO_APP/admin.html"
  [ -n "$NUEVA_ADMIN" ] && echo "Contraseña inicial de la administración: $NUEVA_ADMIN"
  echo "Clave de las copias (guárdela fuera del servidor): $(cat "$DATOS/secretos/restic.clave")"
  echo "Borre este fichero cuando las haya guardado: rm /root/atalaya-credenciales.txt"; } > /root/atalaya-credenciales.txt
umask 022
echo
echo "=================================================================="
echo " Atalaya 360° está en https://$DOMINIO_APP"
echo " Administración:   https://$DOMINIO_APP/admin.html"
[ -n "$NUEVA_ADMIN" ] && echo " Contraseña inicial de la administración: $NUEVA_ADMIN"
[ -n "$NUEVA_ADMIN" ] && echo "   → Cámbiela al entrar y active el segundo factor en «Seguridad»."
[ -n "$DOMINIO_ASISTENTE" ] && echo " Asistente:        https://$DOMINIO_ASISTENTE/panel  (complete $DESP/asistente.env y ejecute actualizar.sh)"
echo
echo " Clave de las copias (guárdela FUERA del servidor; sin ella no se pueden recuperar):"
echo "   $(cat "$DATOS/secretos/restic.clave")"
[ -z "$COPIA_DESTINO" ] && echo " Falta el destino de la copia: edite $DATOS/secretos/copia.env y ejecute: bash $DESP/copia-seguridad.sh"
echo
echo " Siguientes pasos: complete $DESP/atalaya.env (IA, correo, Stripe, HubSpot) y ejecute: bash $DESP/actualizar.sh"
echo " Comprobar el estado: bash $DESP/comprobar.sh"
echo "=================================================================="
