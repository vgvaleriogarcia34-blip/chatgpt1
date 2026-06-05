---
name: audit-code-review
description: Fase 1 de la auditoría — revisión de calidad de código sobre el diff actual. Detecta bugs de correctitud y oportunidades de reuso, simplificación y eficiencia. Úsalo cuando el usuario quiera auditar, revisar o evaluar la calidad del código de los cambios pendientes, o cuando se ejecute la secuencia /audit-flow. Esta es la primera fase ("Revisar") antes de la revisión de seguridad.
---

# Auditoría · Fase 1: Revisión de código

Primera fase de la secuencia de auditoría. El objetivo es revisar el diff
actual buscando **bugs de correctitud** y **mejoras de calidad** (reuso,
simplificación, eficiencia y altitud del código) antes de pasar a seguridad.

## Procedimiento

1. Determina el alcance del diff a revisar:
   - Si hay cambios sin commitear: `git diff` y `git diff --staged`.
   - Si la rama está adelantada respecto a `main`/`master`:
     `git diff $(git merge-base HEAD main)...HEAD`.
2. Invoca el skill integrado de revisión de código para hacer el análisis a
   fondo. Llama al skill `code-review` (vía la herramienta Skill) con un nivel
   de esfuerzo `medium` por defecto, o `high` si el usuario pide cobertura
   amplia. Si el flujo se ejecuta sobre un PR, puedes pasar `--comment` para
   publicar los hallazgos como comentarios en línea.
3. Si el skill `code-review` no estuviera disponible en el entorno, realiza la
   revisión manualmente cubriendo al menos:
   - **Correctitud**: casos límite, off-by-one, manejo de errores, valores
     nulos/undefined, condiciones de carrera, estados inconsistentes.
   - **Reuso y simplificación**: duplicación, abstracciones innecesarias,
     código muerto, funciones que ya existen en el proyecto.
   - **Eficiencia**: trabajo redundante, bucles anidados evitables, consultas
     o I/O dentro de bucles.

## Salida

Una lista de hallazgos priorizada por severidad. Para cada hallazgo indica el
archivo y línea (`archivo:línea`), el problema y la corrección sugerida.
Concluye con un veredicto: **listo para fase 2 (seguridad)** o **bloqueado**
con los puntos que deben resolverse primero.
