#!/usr/bin/env bash
# Atalaya 360° · crea el servidor en Hetzner Cloud por su API y lo deja instalándose solo al arrancar (cloud-init).
# No hace falta entrar por SSH: el servidor descarga el código y ejecuta instalar.sh sin preguntas.
#
# Variables (las claves, como secretos del entorno; nunca en el repositorio):
#   HCLOUD_TOKEN        clave de API del proyecto de Hetzner (lectura y escritura)
#   GITHUB_LECTURA      clave de GitHub de solo lectura para este repositorio
#   DOMINIO_APP         p. ej. app.businessavance.es (el registro A se crea después, con la IP que muestra este script)
#   CORREO_CERTIFICADOS correo para Let's Encrypt
# Opcionales:
#   RAMA (claude/wonderful-newton-durhbz) · UBICACION (hel1) · MEMORIA_MIN_GB (4) · TIPO (fuerza un tipo, p. ej. cx23) · NOMBRE (atalaya-1)
#   DOMINIO_ASISTENTE · COPIA_DESTINO (s3:https://hel1.your-objectstorage.com/atalaya-copias/atalaya) · COPIA_S3_ID · COPIA_S3_CLAVE
#   SOLO_PLAN=1 → solo muestra qué crearía, sin crear nada
set -euo pipefail
: "${HCLOUD_TOKEN:?Falta HCLOUD_TOKEN}" "${GITHUB_LECTURA:?Falta GITHUB_LECTURA}" "${DOMINIO_APP:?Falta DOMINIO_APP}" "${CORREO_CERTIFICADOS:?Falta CORREO_CERTIFICADOS}"
RAMA=${RAMA:-claude/wonderful-newton-durhbz}; UBICACION=${UBICACION:-hel1}; MEM=${MEMORIA_MIN_GB:-4}; NOMBRE=${NOMBRE:-atalaya-1}
REPO_HTTPS="https://x-access-token:${GITHUB_LECTURA}@github.com/vgvaleriogarcia34-blip/chatgpt1.git"
API=https://api.hetzner.cloud/v1
h() { curl -fsS -H "Authorization: Bearer $HCLOUD_TOKEN" -H 'Content-Type: application/json' "$@"; }

echo "== Comprobando la cuenta =="
h "$API/locations" | jq -e --arg u "$UBICACION" '.locations[] | select(.name == $u)' >/dev/null || { echo "La ubicación $UBICACION no existe en esta cuenta."; exit 1; }
# Tipos con plazas libres ahora mismo en algún centro de datos de esa ubicación
DISPONIBLES=$(h "$API/datacenters" | jq -c --arg u "$UBICACION" '[.datacenters[] | select(.location.name == $u) | .server_types.available[]] | unique')
# El tipo más barato con núcleos compartidos, disponible, con al menos MEM GB, x86 (o el que se fuerce con TIPO)
TIPO=$(h "$API/server_types?per_page=50" | jq -r --arg u "$UBICACION" --argjson m "$MEM" --argjson d "$DISPONIBLES" --arg f "${TIPO:-}" '
  [.server_types[] | select(.id as $i | $d | index($i)) | select(if $f != "" then .name == $f else (.deprecation == null and .cpu_type == "shared" and .architecture == "x86" and .memory >= $m) end)
   | {name, memory, cores, precio: ([.prices[] | select(.location == $u) | .price_monthly.gross | tonumber] | first)}
   | select(.precio != null)] | sort_by(.precio) | first | "\(.name) \(.cores) núcleos \(.memory) GB \(.precio)"')
[ -n "$TIPO" ] && [ "$TIPO" != "null" ] || { echo "No hay ningún tipo de servidor disponible con $MEM GB en $UBICACION ahora mismo. Pruebe otra ubicación (UBICACION=nbg1, fsn1) o más tarde."; exit 1; }
read -r TIPO_N NUC _ GB _ PRECIO <<<"$TIPO"
CLAVES=$(h "$API/ssh_keys" | jq -c '[.ssh_keys[].id]')
[ "$CLAVES" != "[]" ] || echo "Aviso: el proyecto no tiene ninguna clave SSH. Añada la suya en la consola de Hetzner (Seguridad → Claves SSH) para poder entrar al servidor."
echo "Servidor: $NOMBRE · tipo $TIPO_N ($NUC núcleos, $GB GB) · $UBICACION · Ubuntu 24.04 · unos $(printf '%.2f' "$PRECIO") € al mes con IVA"
echo "Dominio: $DOMINIO_APP · rama: $RAMA · copias: ${COPIA_DESTINO:-sin destino todavía}"
[ "${SOLO_PLAN:-}" = 1 ] && { echo "(SOLO_PLAN=1: no se crea nada)"; exit 0; }

# cloud-init: descarga el instalador de la rama y lo ejecuta con todas las respuestas ya dadas
q() { printf '%q' "$1"; }
USERDATA=$(cat <<EOF
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -q && apt-get install -yq git
export REPO=$(q "$REPO_HTTPS") RAMA=$(q "$RAMA") DOMINIO_APP=$(q "$DOMINIO_APP") DOMINIO_ASISTENTE=$(q "${DOMINIO_ASISTENTE:-}") CORREO_CERTIFICADOS=$(q "$CORREO_CERTIFICADOS")
export COPIA_DESTINO=$(q "${COPIA_DESTINO:-}") COPIA_S3_ID=$(q "${COPIA_S3_ID:-}") COPIA_S3_CLAVE=$(q "${COPIA_S3_CLAVE:-}")
git clone --depth 1 --branch "\$RAMA" "\$REPO" /root/atalaya-instalador
bash /root/atalaya-instalador/despliegue/instalar.sh < /dev/null > /var/log/atalaya-instalacion.log 2>&1
rm -rf /root/atalaya-instalador
EOF
)
CUERPO=$(jq -n --arg n "$NOMBRE" --arg t "$TIPO_N" --arg u "$UBICACION" --arg d "$USERDATA" --argjson k "$CLAVES" \
  '{name:$n, server_type:$t, location:$u, image:"ubuntu-24.04", ssh_keys:$k, user_data:$d, labels:{app:"atalaya"},
    public_net:{enable_ipv4:true, enable_ipv6:true}}')
echo "== Creando el servidor =="
R=$(h -X POST "$API/servers" -d "$CUERPO")
ID=$(echo "$R" | jq -r '.server.id'); IP=$(echo "$R" | jq -r '.server.public_net.ipv4.ip'); IP6=$(echo "$R" | jq -r '.server.public_net.ipv6.ip')
# Cortafuegos de Hetzner, además del del sistema: solo SSH, HTTP y HTTPS
FW=$(jq -n --arg n "$NOMBRE-cortafuegos" '{name:$n, rules:[
  {direction:"in",protocol:"tcp",port:"22",source_ips:["0.0.0.0/0","::/0"]},
  {direction:"in",protocol:"tcp",port:"80",source_ips:["0.0.0.0/0","::/0"]},
  {direction:"in",protocol:"tcp",port:"443",source_ips:["0.0.0.0/0","::/0"]},
  {direction:"in",protocol:"udp",port:"443",source_ips:["0.0.0.0/0","::/0"]}]}')
FID=$(h -X POST "$API/firewalls" -d "$FW" | jq -r '.firewall.id' || true)
[ -n "$FID" ] && [ "$FID" != "null" ] && h -X POST "$API/firewalls/$FID/actions/apply_to_resources" -d "{\"apply_to\":[{\"type\":\"server\",\"server\":{\"id\":$ID}}]}" >/dev/null || true
# Copias de seguridad del propio servidor en Hetzner (diarias, 7 días), además de las externas cifradas
h -X POST "$API/servers/$ID/actions/enable_backup" >/dev/null || true
echo
echo "Servidor creado: id $ID · IPv4 $IP · IPv6 $IP6"
echo "Ahora cree en el DNS de su dominio:  $DOMINIO_APP  A  $IP   (y AAAA $IP6)"
echo "La instalación tarda unos 10 minutos y termina sola. El certificado HTTPS se obtiene en cuanto el DNS apunte al servidor."
echo "Credenciales iniciales, en el servidor:  ssh root@$IP cat /root/atalaya-credenciales.txt"
