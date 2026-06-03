---
name: audit-verify
description: Fase 3 de la auditoría — verificación funcional. Ejecuta la aplicación y observa su comportamiento para confirmar que los cambios funcionan de verdad y que los hallazgos de las fases anteriores no rompieron nada. Úsalo como cierre de la secuencia /audit-flow o cuando el usuario pida verificar, probar manualmente o confirmar que un cambio funciona ejecutando la app. Esta es la tercera fase ("Verificar").
---

# Auditoría · Fase 3: Verificación funcional

Fase de cierre de la secuencia. Después de revisar el código (fase 1) y la
seguridad (fase 2), aquí se **ejecuta la aplicación** y se observa su
comportamiento real para confirmar que los cambios funcionan y que las
correcciones aplicadas no introdujeron regresiones.

## Procedimiento

1. Invoca el skill integrado `verify` (vía la herramienta Skill) para ejecutar
   la app y observar su comportamiento frente al cambio que se está auditando.
2. Si el skill `verify` no estuviera disponible, verifica manualmente:
   - **Arranca la app** con el método propio del proyecto (servidor de
     desarrollo, abrir `index.html`, CLI, etc.).
   - **Reproduce el flujo afectado** por los cambios y confirma que el
     comportamiento observado coincide con el esperado.
   - **Comprueba que no hay regresiones** en los flujos cercanos ni errores en
     consola/logs.
   - Si hay pruebas automatizadas, ejecútalas y reporta el resultado real.
3. Verifica que los hallazgos bloqueantes de las fases 1 y 2 se resolvieron y
   que su corrección no cambió el comportamiento esperado.

## Salida

Resumen de la verificación: qué se ejecutó, qué flujos se probaron y el
comportamiento observado (con evidencia: salida, capturas o logs cuando
aplique). Veredicto final consolidado de la auditoría: **APROBADO**, **APROBADO
CON COMENTARIOS** o **RECHAZADO**, con la lista de bloqueantes si los hay.
