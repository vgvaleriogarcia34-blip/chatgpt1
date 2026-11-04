#!/usr/bin/env bash
# Atalaya 360° · estado del servidor en un vistazo.   Uso: bash /srv/atalaya/despliegue/comprobar.sh
DESP=$(cd "$(dirname "$0")" && pwd); cd "$DESP"
DATOS=/srv/atalaya-datos
. ./.env 2>/dev/null
echo "== Servicios =="; docker compose ps --format 'table {{.Service}}\t{{.Status}}'
echo; echo "== Web =="
curl -fsS -o /dev/null -w "https://${DOMINIO_APP} → %{http_code} en %{time_total} s\n" "https://${DOMINIO_APP}/api/health" || echo "La web no responde por HTTPS"
echo; echo "== Certificado =="
echo | openssl s_client -servername "$DOMINIO_APP" -connect "$DOMINIO_APP:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | sed 's/notAfter=/Caduca: /' || echo "Sin certificado"
echo; echo "== Disco =="; df -h "$DATOS" | tail -1 | awk '{print "Usado " $5 " de " $2 " · libre " $4}'
echo; echo "== Base de datos =="; ls -lh "$DATOS/atalaya/atalaya.db" 2>/dev/null | awk '{print "atalaya.db: " $5}'
echo; echo "== Última copia externa =="; cat "$DATOS/atalaya/copia-externa.json" 2>/dev/null || echo "Ninguna todavía"
systemctl list-timers atalaya-copia.timer --no-pager 2>/dev/null | sed -n 2p
echo; echo "== Errores recientes =="; docker compose logs --since 24h atalaya 2>/dev/null | grep -iE "error|excepci" | tail -10 || true
echo; echo "La revisión completa, con diagnóstico de la IA, está en https://${DOMINIO_APP}/admin.html → «Revisión del sistema»."
