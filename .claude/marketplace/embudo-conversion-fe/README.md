# Plugin · embudo-conversion-fe

Cadena secuencial para construir el embudo de conversión completo de Familias Empresarias / Arquitectos de Claridad™, extraída y adaptada de "La Gran Mesa" (Fases 4–6 + las 7 plantillas de correos). Construye, en orden y con control de calidad entre fases: anuncios → landing → checkout → back-end → correos.

## Skills del plugin

| Orden | Skill | Qué construye | Fuente |
|---|---|---|---|
| Gate | `ec-auditor` | Motor de auditoría 0–10. No construye: audita y decide el paso de fase | reglas de todos los docs |
| 1 | `ec-fase1-anuncios` | 25 anuncios A/B + modelo CPA/VMC | L4 |
| 2 | `ec-fase2-landing` | Landing de ventas (10 bloques) | L5 |
| 3 | `ec-fase3-checkout` | Pedido + bumps + upsell + downsell + gracias | L5 |
| 4 | `ec-fase4-backend` | Escalera de valor + oferta back-end + 5 pilares | L6 |
| 5 | `ec-fase5-correos` | 17 correos de campaña (7 plantillas) | L7 |

## Cómo arranca

La cadena se alimenta del **documento de producto/servicio** que aporta Valerio. Ese documento es el input del intake de la Fase 1.

```
[Doc. producto/servicio] → ec-fase1-anuncios → [ec-auditor ≥8?] ─no→ corrige fase 1
                                                      │ sí
                          ec-fase2-landing  ← ────────┘
                                  → [ec-auditor ≥8?] ─no→ corrige fase 2
                                          │ sí
                          ec-fase3-checkout
                                  → [ec-auditor ≥8?] ─no→ corrige fase 3
                                          │ sí
                          ec-fase4-backend
                                  → [ec-auditor ≥8?] ─no→ corrige fase 4
                                          │ sí
                          ec-fase5-correos
                                  → [ec-auditor ≥8?] ─no→ corrige fase 5
                                          │ sí
                              EMBUDO COMPLETO
```

## Regla de la cadena (gate 8/10)

Cada fase invoca `ec-auditor` con la rúbrica correspondiente. Si la nota es **< 8/10**, el auditor devuelve una estructura de corrección reejecutable a la fase autora; esa fase corrige y vuelve a pasar por el gate. Solo con **≥ 8/10** se desbloquea la fase siguiente. Tras 3 vueltas sin alcanzar el 8 en el mismo criterio, el auditor escala a Valerio (probable carencia en el input, no en la ejecución).

## Notas de alcance

- Los prompts desarrollados en la documentación fuente cubren 5 páginas (landing, pedido, upsell, downsell, gracias). Webinar / application / nurture / pre-launch aparecen en la ilustración de portada de L5 pero **no tienen prompt desarrollado** en los documentos aportados.
- Marca: navy #1B2A4A, gold #C8A951, Georgia/Arial. Todos los entregables en Word con ese branding.
- Los tres contextos FE (arquitectura de método / entregable de cliente / operación interna) se mantienen separados.
