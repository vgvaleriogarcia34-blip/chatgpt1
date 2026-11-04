#!/usr/bin/env bash
# Atalaya 360° · copia de seguridad externa, cifrada (restic). La ejecuta cada noche atalaya-copia.timer.
# 1) Copia coherente de cada base SQLite sin parar el servicio (VACUUM INTO dentro del contenedor).
# 2) Sube esa copia, el secreto del servidor y la configuración al destino externo, cifrado con la clave de restic.
# 3) Conserva 14 diarias, 8 semanales y 12 mensuales, y deja constancia para la revisión del sistema de la administración.
set -uo pipefail
DESP=$(cd "$(dirname "$0")" && pwd)
DATOS=/srv/atalaya-datos
cd "$DESP"
estado() { # ok destino error
  printf '{"fecha":"%s","ok":%s,"destino":%s,"error":%s}\n' "$(date -u +%FT%TZ)" "$1" "$(jq -Rn --arg v "$2" '$v')" "$(jq -Rn --arg v "$3" '$v')" > "$DATOS/atalaya/copia-externa.json"
  chmod 644 "$DATOS/atalaya/copia-externa.json"
}
[ -f "$DATOS/secretos/copia.env" ] || { echo "Falta $DATOS/secretos/copia.env"; exit 1; }
set -a; . "$DATOS/secretos/copia.env"; set +a
export RESTIC_PASSWORD_FILE="$DATOS/secretos/restic.clave"
DESTINO=$(echo "${RESTIC_REPOSITORY:-}" | sed -E 's#(//)[^@/]*@#\1…@#; s#:[^/:@]*@#:…@#')
[ -n "${RESTIC_REPOSITORY:-}" ] || { estado false "" "Sin destino configurado"; echo "Sin destino: edite $DATOS/secretos/copia.env"; exit 1; }

SNAP="$DATOS/copia/actual"; rm -rf "$SNAP"; mkdir -p "$SNAP"
volcar() { # servicio, base dentro del contenedor, carpeta del volumen en el host
  local tmp="$(dirname "$2")/.copia-externa.db"
  docker compose exec -T "$1" node --no-warnings -e "
    const fs=require('fs'); const {DatabaseSync}=require('node:sqlite');
    fs.rmSync('$tmp',{force:true}); const d=new DatabaseSync('$2'); d.exec(\"VACUUM INTO '$tmp'\"); d.close();" || return 1
  mv "$3/.copia-externa.db" "$SNAP/$(basename "$2")"
}
fallo=""
volcar atalaya /datos/atalaya.db "$DATOS/atalaya" || fallo="No se pudo copiar la base de Atalaya"
[ -f "$DATOS/atalaya/secreto.key" ] && cp "$DATOS/atalaya/secreto.key" "$SNAP/"
if docker compose ps --services --status running 2>/dev/null | grep -qx asistente; then
  volcar asistente /app/datos/asistente.db "$DATOS/asistente" || fallo="${fallo:+$fallo; }No se pudo copiar la base del asistente"
fi
cp atalaya.env "$SNAP/" 2>/dev/null; cp asistente.env "$SNAP/" 2>/dev/null
cp -r "$DATOS/secretos" "$SNAP/secretos" 2>/dev/null; rm -f "$SNAP/secretos/restic.clave"   # la clave no viaja con la copia

if [ -n "$fallo" ]; then estado false "$DESTINO" "$fallo"; echo "$fallo"; exit 1; fi
if ! salida=$(restic backup --tag atalaya --host atalaya "$SNAP" 2>&1); then
  estado false "$DESTINO" "$(echo "$salida" | tail -n 1)"; echo "$salida"; exit 1
fi
restic forget --tag atalaya --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune -q || true
estado true "$DESTINO" ""
rm -rf "$SNAP"
echo "Copia externa hecha: $(date '+%d/%m/%Y %H:%M') → $DESTINO"
# Recuperar: restic snapshots ; restic restore latest --target /tmp/recuperar  (ver despliegue/DESPLIEGUE.md)
