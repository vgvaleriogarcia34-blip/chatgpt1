---
name: ec-fase5-correos
description: "Fase 5 (ultima) del embudo de conversion de Familias Empresarias: secuencia de correos de la campana de lanzamiento. Email de anticipacion (-24h) y 7 dias de campana con envios AM/PM y cierres por horas (12h/6h/2h), siguiendo las 7 plantillas. Usar cuando Valerio diga 'fase 5 del embudo', 'correos', 'emails de campana', 'secuencia de lanzamiento', 'las 7 plantillas'. Arranca solo si ec-fase4-backend obtuvo >=8. Al cerrar invoca ec-auditor; con >=8 el embudo queda completo."
---

# EC · Fase 5 — Secuencia de correos de campaña

## Principio rector

Los correos son el motor que mueve personas hacia el embudo ya construido. No son siete mensajes sueltos: son un arco psicológico de varios días que lleva al lector de la curiosidad a la decisión. Cada email tiene **una sola idea y una sola llamada a la acción**, y todos comparten exactamente la misma promesa, precio, garantía y nombre de oferta que la landing y el checkout. Un correo que contradice a la landing rompe la confianza y el embudo entero.

## Entrada de la cadena

**Esta fase solo arranca si `ec-fase4-backend` pasó el gate con ≥8/10.** Es el último eslabón: hereda todo lo anterior (promesa y ángulo de Fase 1, copy y precio de la landing de Fase 2, oferta del checkout de Fase 3, oferta back-end de Fase 4). Los placeholders de las plantillas se rellenan con ese material y con el documento de producto; no deben quedar corchetes sin resolver.

## Cadencia de la campaña (calendario de envíos)

| Momento | Email | Asunto |
|---|---|---|
| −24 h | Anticipación | "algo emocionante para ti" |
| Día 1 · 09:00 | Anuncio (plazas abiertas) | "plazas abiertas" |
| Día 1 · 19:00 | Prueba | "¿quieres esto?" |
| Día 2 · 09:00 | Puntos de dolor | "¿eres tú?" |
| Día 2 · 19:00 | Gran idea | "por qué [gran idea] funciona tan bien" |
| Día 3 · 09:00 | ¿Qué quieres aprender? | "¿qué quieres?" |
| Día 3 · 19:00 | Esto es para ti si… | "esto es para ti si…" |
| Día 4 · 09:00 | Lo que NO necesitas | "no hagas esto" |
| Día 4 · 19:00 | ¿Qué prefieres? | "¿qué prefieres?" |
| Día 5 · 09:00 | Beneficios ocultos | "no me di cuenta de esto…" |
| Día 5 · 19:00 | ¿Qué te está costando? | "¿qué te está costando esto?" |
| Día 6 · 09:00 | ¿Funcionará para mí? | "¿funcionará para ti?" |
| Día 6 · 19:00 | Imagina cómo sería tu vida | "imagina esto…" |
| Día 7 · 09:00 | Cierra hoy | "¡cerramos esta noche!" |
| −12 h cierre | Quedan 12 horas | "expira a las 23:59" |
| −6 h cierre | Quedan 6 horas | "quedan 6 horas…" |
| −2 h cierre | Última oportunidad | "cerramos en 2 horas (última oportunidad)" |

## Arco psicológico de los 7 días

Anuncio → prueba/credibilidad → puntos de dolor → gran idea/mecanismo → escucha al lector (qué quiere) → filtro (esto es para ti si) → ruptura de creencias (lo que NO necesitas) → contraste (qué prefieres) → beneficios ocultos → coste de no actuar → resolver la duda (funcionará para ti) → visión (imagina) → cierre con urgencia ética en tres oleadas (12h/6h/2h).

## Reglas

- Una idea, una CTA por correo. Un único enlace de acción.
- Promesa, precio, garantía y nombre de la oferta idénticos a la landing/checkout.
- Urgencia y escasez **reales** (plazas y plazos verdaderos), nunca falsa escasez.
- Pruebas y testimonios del documento de producto; no inventados.
- Voz FE: humano, directo, sin humo, precisión semántica, sin motivación barata.
- Resolver todos los placeholders con el material de las fases anteriores.

Las 7 plantillas completas, con su texto íntegro y placeholders, están en `references/plantillas-correos.md`. Leerlo antes de redactar.

## Gate de salida

Al terminar, **invocar `ec-auditor` con la rúbrica de correos**. ≥8/10 → **EMBUDO COMPLETO** (las 5 fases aprobadas). <8 → corregir (fallos típicos: placeholders sin rellenar, precio/garantía que no coincide con la landing, correos con varias CTA, falsa escasez) y reauditar.

## Entregable

Documento Word navy/gold (#1B2A4A / #C8A951, Georgia/Arial) con los 17 correos de la campaña listos para programar, cada uno con su momento de envío, asunto y cuerpo completo sin placeholders. Cierra con el informe del auditor y, dado que es la última fase, un resumen de cierre del embudo completo (las 5 fases y sus notas).
