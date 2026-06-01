---
name: audit-final-review
description: Fase 3 de la auditoría — revisión final del pull request consolidando las fases anteriores. Verifica que los hallazgos de código y seguridad se hayan atendido y produce el veredicto de la auditoría. Úsalo como cierre de la secuencia /audit-flow o cuando el usuario pida la revisión final de un PR. Esta es la tercera fase ("Verificación final").
---

# Auditoría · Fase 3: Revisión final del PR

Fase de cierre de la secuencia. Consolida los resultados de las fases de código
y seguridad, verifica el pull request en conjunto y emite el veredicto de la
auditoría.

## Procedimiento

1. Invoca el skill integrado `review` (vía la herramienta Skill) para hacer la
   revisión del pull request completo. Si el trabajo es local y aún no hay PR,
   revisa el diff completo de la rama contra su base.
2. Verifica que los hallazgos de las fases 1 (código) y 2 (seguridad) hayan
   sido resueltos o registrados explícitamente como aceptados.
3. Comprueba los aspectos transversales del PR:
   - El título y la descripción reflejan los cambios reales.
   - Existen pruebas para la lógica nueva o modificada, y pasan.
   - No quedan TODOs, código de depuración ni archivos no relacionados.
   - La documentación afectada se actualizó.

## Salida

Resumen consolidado de la auditoría con: estado de cada fase (código /
seguridad / PR), hallazgos pendientes si los hay, y un **veredicto final**:
APROBADO, APROBADO CON COMENTARIOS, o RECHAZADO (con la lista de bloqueantes).
