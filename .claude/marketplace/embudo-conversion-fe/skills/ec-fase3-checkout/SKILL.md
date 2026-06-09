---
name: ec-fase3-checkout
description: "Fase 3 del embudo de conversion de Familias Empresarias: checkout completo. Cubre pagina de pedido con 2 order bumps, upsell, downsell y pagina de gracias. Flujo: venta libro, pedido+bump, upsell 1, upsell 2, gracias, con ramas downsell al rechazar. Usar cuando Valerio diga 'fase 3 del embudo', 'checkout', 'pagina de pedido', 'order bump', 'upsell', 'downsell', 'pagina de gracias'. Arranca solo si ec-fase2-landing obtuvo >=8. Al cerrar invoca ec-auditor; con >=8 desbloquea ec-fase4-backend."
---

# EC · Fase 3 — Checkout: pedido, bumps, upsell, downsell y gracias

## Principio rector

Aquí empieza la parte más rentable del embudo: aumentar el valor medio del pedido sin aumentar el coste de adquisición. Cada página tiene una psicología distinta y NO se pueden confundir. El error clásico es tratar la página de pedido como una segunda página de ventas: la venta ya se produjo, ahora toca eliminar fricción. El objetivo del embudo no es exprimir al cliente, sino aumentar el valor de cada comprador manteniendo una buena experiencia y una relación a largo plazo.

## Entrada de la cadena

**Solo arranca si `ec-fase2-landing` pasó el gate con ≥8/10.** Hereda el producto principal, precio, bonos, garantía y mockups ya aprobados. La coherencia visual y de oferta con la landing es un criterio de auditoría: el checkout debe parecer la continuación natural de la landing.

## Arquitectura del flujo (mapa del embudo)

```
1. Página venta libro (5€)
        │
        ▼
2. Página de pedido + Order Bump (47€)
        │
        ▼
3. Upsell 1 (97€) ──NO──▶ Downsell 1 (47€) ─┐
        │ SÍ                                 │
        ▼                                    │
4. Upsell 2 (197€) ─NO──▶ Downsell 2 (37€) ─┤
        │ SÍ                                 │
        ▼                                    ▼
5. Página de agradecimiento ◀───────────────┘
```
Toda ruta (acepte o rechace) termina en la página de gracias. Los precios son ejemplo del documento; se ajustan a la oferta real.

## Las 4 páginas y sus prompts

### A · Página de pedido (+ order bumps)
Misión: convertir intención en compra con mínima fricción. **No queremos:** nuevas explicaciones, nuevos argumentos, menús, distracciones, decenas de botones. **Queremos:** claridad, simplicidad, confianza, rapidez. Es una caja registradora, no una conversación de ventas. Estructura: header superior (garantía/pago seguro/acceso) · titular "Obtén acceso a [LIBRO]+[BONOS]" · formulario mínimo (nombre, email, teléfono, tarjeta) · mockup premium · bloque "esto es lo que obtendrás" · **2 order bumps** (cada uno: nombre, beneficio, descripción, valor real, precio hoy, casilla "Sí, añadir a mi pedido") · resumen del pedido · CTA "Completar pedido / Acceso inmediato" · footer. Regla del bump: no es otro producto enorme; añade velocidad, no complejidad.

### B · Upsell (página de venta adicional)
Aparece tras la compra inicial, en estado mental de compra. Debe sentirse como "te doy el atajo / esto me ahorra tiempo y errores", NUNCA como "te vendo más cosas". 16 bloques: barra de urgencia + contador · etiqueta de oferta · titular de transformación · subtítulo · vídeo central · anclaje de precio · CTA principal · opción negativa honesta · mecanismo diferenciador · "esto es todo lo que vas a recibir" (6–8 ítems) · comparativa (producto principal vs upsell) · garantía · "esto es para ti si…" (6 bullets) · "lo que lograrás" (5 beneficios) · recordatorio de urgencia · CTA final.

### C · Downsell (página de venta reducida)
Aparece cuando se rechaza el upsell. **Vende EXACTAMENTE el mismo producto del upsell**, eliminando la barrera económica (pagos divididos / opción más accesible). No cambia el producto: cambia forma de pago, acceso, facilidad y riesgo percibido. 12 bloques: barra "Pago dividido activado" · microtexto "dejemos que esto sea fácil para ti" · titular "Consigue [producto] por [nº pagos] de [precio]" · subtítulo · mockup premium · CTA · beneficios visuales (4) · mecanismo principal · bloque de riesgo inverso "Sin riesgos. Sin excusas. Solo resultados." · recordatorio final · CTA final · opción negativa.

### D · Página de agradecimiento
Última fase del embudo y de las más infravaloradas: transforma un comprador en miembro del ecosistema. No solo entrega el producto: confirma la compra, guía el siguiente paso y mete al cliente en una **llamada de diagnóstico** (tipo Calendly) o en una **comunidad** (WhatsApp/Telegram/Facebook). 12 bloques: barra de confirmación de pago · titular grande · subtítulo · vídeo principal (3–5 min) · titular de siguiente acción · beneficios con iconos (4–6) · bloque principal de acción (rama LLAMADA o rama COMUNIDAD) · "qué conseguirás" · bloque motivacional final · soporte · footer · generación automática completa.

Los 4 prompts completos están en `references/prompts-checkout.md`. Leerlo antes de generar cada página.

## Gate de salida

Al terminar las 4 páginas, **invocar `ec-auditor` con la rúbrica de checkout**. ≥8/10 → desbloquea `ec-fase4-backend`. <8 → corregir según el auditor (atención a los fallos típicos: página de pedido que revende, downsell que cambia de producto, gracias que no activa ecosistema) y reauditar.

## Entregable

Documento Word navy/gold (#1B2A4A / #C8A951, Georgia/Arial) con las 4 páginas, copy bloque por bloque, textos de botones, textos de vídeo, mockups sugeridos, comparativas y el mapa de flujo del embudo. Cierra con el informe del auditor.
