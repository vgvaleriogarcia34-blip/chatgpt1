---
description: Ejecuta la secuencia completa de auditoría sobre los cambios actuales — Revisión de código → Revisión de seguridad → Revisión final del PR.
argument-hint: "[alcance opcional: 'staged' | 'branch' | ruta]"
---

# /audit-flow — Secuencia de auditoría

Orquesta las tres fases de la auditoría en orden estricto sobre los cambios
actuales. Si el usuario pasó un alcance en `$ARGUMENTS`, úsalo para acotar el
diff (por defecto: cambios de la rama contra su base, o cambios sin commitear
si la rama no está adelantada).

Ejecuta las fases **en secuencia**, deteniéndote entre fases para reportar el
resultado. No avances a la siguiente fase hasta completar la anterior.

## Fase 1 — Revisión de código
Invoca el skill `audit-code-review`. Reporta los hallazgos de correctitud y
calidad. Si hay bugs bloqueantes, indícalo claramente antes de continuar.

## Fase 2 — Revisión de seguridad
Invoca el skill `audit-security-review`. Reporta vulnerabilidades por
severidad. Marca los hallazgos críticos/altos como bloqueantes.

## Fase 3 — Revisión final del PR
Invoca el skill `audit-final-review`. Verifica que los hallazgos de las fases
1 y 2 se hayan atendido y emite el veredicto consolidado.

## Cierre
Entrega un **resumen final** con el estado de cada fase y el veredicto global:
APROBADO, APROBADO CON COMENTARIOS o RECHAZADO. Si alguna fase quedó bloqueada,
lístalo como acción pendiente y no marques la auditoría como aprobada.
