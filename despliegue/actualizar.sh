#!/usr/bin/env bash
# Atalaya 360° · publicar la última versión de la rama. Hace antes una copia externa y, si la nueva versión no
# arranca, vuelve sola a la anterior.   Uso: bash /srv/atalaya/despliegue/actualizar.sh
set -euo pipefail
DESP=$(cd "$(dirname "$0")" && pwd); DIR=$(dirname "$DESP")
cd "$DESP"
read -r -a PERFIL < .perfil 2>/dev/null || PERFIL=()
RAMA=$(git -C "$DIR" rev-parse --abbrev-ref HEAD)
ANTES=$(git -C "$DIR" rev-parse HEAD)

echo "== Copia de seguridad antes de actualizar =="
bash "$DESP/copia-seguridad.sh" || { read -r -p "La copia ha fallado. ¿Seguir igualmente? (s/N) " r; [ "$r" = s ] || exit 1; }

echo "== Código ($RAMA) =="
git -C "$DIR" fetch -q origin "$RAMA"
git -C "$DIR" merge -q --ff-only "origin/$RAMA"
AHORA=$(git -C "$DIR" rev-parse HEAD)
[ "$ANTES" = "$AHORA" ] && echo "Sin cambios de código; se reconstruye por si cambió la configuración."
git -C "$DIR" log --oneline "$ANTES..$AHORA" | head -20

sano() {
  for i in $(seq 1 45); do
    docker compose exec -T atalaya node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" 2>/dev/null && return 0
    sleep 2
  done; return 1
}
echo "== Arranque =="
docker compose "${PERFIL[@]}" up -d --build
if sano; then
  docker image prune -f >/dev/null
  echo "Actualizado a $(git -C "$DIR" log -1 --format='%h · %s')"
else
  echo "La nueva versión no responde. Vuelvo a la anterior ($ANTES)."
  git -C "$DIR" reset -q --hard "$ANTES"
  docker compose "${PERFIL[@]}" up -d --build
  sano && echo "Versión anterior en marcha. Revise: docker compose logs --tail 100 atalaya" || echo "Tampoco responde la anterior: docker compose logs atalaya"
  exit 1
fi
