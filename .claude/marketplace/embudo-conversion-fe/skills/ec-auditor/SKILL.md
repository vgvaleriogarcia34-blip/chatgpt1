---
name: ec-auditor
description: "Motor de auditoria transversal del embudo de conversion de Familias Empresarias. Puntua de 0 a 10 el entregable de cualquier fase (anuncios, landing, checkout, back-end, correos) antes de avanzar: gate de calidad de la cadena secuencial. Si la nota es <8 devuelve correccion al skill autor; con >=8 autoriza la fase siguiente. Usar cuando Valerio diga 'audita esto', 'puntua el embudo', 'revisa la fase', 'gate de calidad', 'pasa de fase', o cuando otro skill ec-faseN lo invoque."
---

# EC · Auditor del embudo — Gate de calidad 0–10

## Principio rector

Este skill no construye nada. Audita. Es el guardián de la cadena: ningún eslabón del embudo empieza a trabajar sobre material defectuoso del anterior. La auditoría se hace ANTES de avanzar, no después de fallar. La nota mínima de paso es **8/10**. Por debajo de 8, el trabajo vuelve a su autor con una estructura de corrección concreta y reejecutable; no se "aprueba con reservas", no se "tira para adelante". El embudo se rompe por su eslabón más débil, así que un eslabón débil no avanza.

## Lugar en la cadena

```
[Doc. producto/servicio]
        │
        ▼
  ec-fase1-anuncios ──▶ [ec-auditor ≥8?] ──no──▶ corrige fase 1
        │ sí                                          ▲
        ▼                                             │
  ec-fase2-landing ───▶ [ec-auditor ≥8?] ──no──▶ corrige fase 2
        │ sí
        ▼
  ec-fase3-checkout ──▶ [ec-auditor ≥8?] ──no──▶ corrige fase 3
        │ sí
        ▼
  ec-fase4-backend ───▶ [ec-auditor ≥8?] ──no──▶ corrige fase 4
        │ sí
        ▼
  ec-fase5-correos ───▶ [ec-auditor ≥8?] ──no──▶ corrige fase 5
        │ sí
        ▼
   EMBUDO COMPLETO
```

Cada `ec-faseN` invoca este auditor sobre el entregable de la fase anterior **al arrancar**, y sobre su propio entregable **al cerrar**. La fase N no produce ni un activo hasta que la fase N−1 tiene ≥8.

## Cómo se usa (procedimiento exacto)

1. **Recibir el entregable y su rúbrica.** Leer `references/rubricas-auditoria.md` y cargar la rúbrica de la fase correspondiente (anuncios / landing / checkout / back-end / correos). Cada rúbrica tiene 10 criterios ponderados.
2. **Puntuar criterio por criterio.** Para cada criterio: nota 0–10, evidencia textual concreta del entregable (cita corta o referencia al bloque), y veredicto (cumple / parcial / no cumple). Prohibido puntuar sin evidencia.
3. **Calcular la nota ponderada** (0–10, un decimal).
4. **Emitir veredicto de gate:**
   - **≥ 8,0 → APROBADO.** Autorizar el arranque de la fase siguiente. Indicar explícitamente qué fase se desbloquea.
   - **< 8,0 → DEVUELTO.** No avanzar. Producir la *estructura de corrección* (ver abajo) y entregarla al skill que generó el trabajo.
5. **Registrar** en el informe: nota global, nota por criterio, los 3 fallos de mayor impacto y la decisión.

## Estructura de corrección (cuando la nota es < 8)

No basta con decir "está flojo". El auditor devuelve una orden de trabajo reejecutable:

- **Diagnóstico**: qué criterio(s) están por debajo de 8 y por qué, con la cita del entregable que lo prueba.
- **Brecha**: qué le falta exactamente para llegar a 8 (no a 10 — el objetivo del gate es desbloquear, no perfeccionar).
- **Instrucción de reescritura**: qué bloque/prompt concreto de la fase autora hay que reejecutar, con qué cambio. Referencia al prompt por su código (p. ej. "reejecutar F2-LANDING bloque 5 Stack de valor con bonos cuantificados").
- **Reintento**: la fase autora corrige y vuelve a pasar por el gate. Se itera hasta ≥8. El auditor lleva la cuenta de iteraciones y, si tras 3 vueltas el mismo criterio sigue <8, lo escala a Valerio señalando que el cuello de botella puede estar en el input (documento de producto), no en la ejecución.

## Reglas del auditor

- **Juicio independiente.** No complace. Si el trabajo no llega a 8, no llega a 8 aunque venga de una fase anterior ya "dada por buena". Es el rol de arquitecto de claridad aplicado a control de calidad: nombra el vacío, no lo maquilla.
- **Evidencia, no opinión.** Cada nota se justifica con una cita o referencia al entregable.
- **Una sola dirección de severidad.** El listón es 8. Ni se relaja por urgencia ni se infla por simpatía con el autor.
- **No reescribe.** El auditor diagnostica y devuelve; la reescritura la hace la fase autora. Mantiene la separación de responsabilidades de la cadena.
- **Distingue los tres contextos FE**: arquitectura de método, entregable de cliente y operación interna. Una landing para un cliente se audita con la rúbrica de cliente, no con la de uso interno.

## Entregable

Informe de auditoría Word navy/gold (#1B2A4A / #C8A951, Georgia/Arial) de 1–2 páginas: cabecera con fase auditada y nota global destacada, tabla de 10 criterios (criterio · peso · nota · evidencia · veredicto), bloque de "3 fallos de mayor impacto", y o bien el sello **APROBADO → desbloquea Fase N+1**, o bien la **estructura de corrección** completa. Las rúbricas detalladas de cada fase están en `references/rubricas-auditoria.md`: leer ese archivo antes de puntuar.
