---
name: ec-fase1-anuncios
description: "Fase 1 del embudo de conversion de Familias Empresarias: anuncios de trafico de pago (Meta Ads) y modelo economico CPA/VMC. Arranca leyendo el documento de producto y produce 25 anuncios A/B (imagen, video, UGC, historia, autoridad) con 10 angulos y un anuncio TOP de 15 elementos. Usar cuando Valerio diga 'fase 1 del embudo', 'anuncios', 'campana de trafico', 'meta ads', 'CPA', 'VMC', 'empezar el embudo'. Al cerrar invoca ec-auditor; con >=8 desbloquea ec-fase2-landing."
---

# EC · Fase 1 — Anuncios y modelo económico del embudo

## Principio rector

La publicidad no vende: amplifica lo que ya existe. Su función no es "vender más" sino acelerar la llegada de personas cualificadas al ecosistema. Por eso el anuncio se construye el último, sobre un mensaje, un libro, un embudo y una oferta ya definidos. Si el sistema no convierte, más tráfico solo hace visible una estructura débil. El orden no negociable es: **Mensaje → Libro → Embudo → Oferta → Publicidad**.

## Entrada de la cadena

Esta fase es el primer eslabón. **Arranca leyendo el documento de producto/servicio que aporta Valerio** (la oferta, el precio, el cliente ideal, el mecanismo, los resultados). Ese documento alimenta el intake de 28 campos del prompt maestro. Si falta algún dato que no se pueda inferir del documento ni del contexto FE, preguntarlo; el resto se precarga.

## El modelo económico (hay que entenderlo antes de gastar)

Dos números deciden si el embudo es rentable:

- **CPA (coste por adquisición):** lo que cuesta conseguir un comprador. Si invertir para una compra cuesta 10 €, el CPA es 10 €.
- **VMC (valor medio por cliente):** lo que genera de media cada persona que entra al ecosistema, sumando el libro y todo lo que compra después (bump, upsell, back-end).

Regla del sistema: **VMC > CPA**. El libro es la puerta (front-end, precio bajo 5–10 €); el beneficio está en lo que el lector activa después. No optimizar "cuánto gano con el libro", sino "cuánto valor genera un lector dentro del ecosistema".

## Estrategia de inversión inicial

Validar antes de escalar: validar el sistema → medir conversiones → revisar números → ajustar el embudo → escalar. Probar varios anuncios (no uno) sobre distintas audiencias, ~10 €/día por conjunto, un público por conjunto. Tras unos días: el que pierde se desactiva, el que recupera inversión se repite y se duplica la audiencia ganadora. Solo escalar con el embudo optimizado y la oferta final probada.

## Los 15 elementos de un anuncio eficaz

Gancho · Problema · Puntos dolorosos · Solución · Autoridad · Curiosidad · Oferta · Llamada a la acción · Beneficios/Puntos clave · Curiosidad · Generar deseo · Riesgo de no actuar · Llamada a la acción · Puntos dolorosos · Postdata con CTA. **Al menos uno de los anuncios TOP debe llevar EXACTAMENTE esta estructura de 15 pasos**; los demás pueden usar otras metodologías.

## Flujo de trabajo (las 5 fases internas del prompt maestro)

1. **Pedir información (28 campos)** — Negocio (1–12: marca, libro, precio, bonos, valor total, mecanismo único, promesa, transformación, problema, diferencia, ecosistema/upsell, historia), Cliente ideal (13–20), Autoridad (21–24), Identidad visual (25–28). Extraer automáticamente: tono, personalidad, posicionamiento, emociones, colores, estética, estilo visual.
2. **Análisis** — detectar deseo principal, dolor visible, dolor oculto, objeciones, enemigo común, identidad aspiracional, emociones dominantes, mecanismo único.
3. **10 ángulos** — dolor, curiosidad, autoridad, error, transformación, oportunidad, enemigo, identidad, estatus, polémica.
4. **25 anuncios A/B** — 5 imagen + 5 vídeo + 5 UGC + 5 historia + 5 autoridad. Uno de los TOP con la estructura obligatoria de 15 elementos. Cada anuncio: HOOK / CUERPO / CTA / EMOCIÓN / OBJETIVO.
5. **Creatividades** — para cada ejemplo visual: texto principal, subtítulo, expresión, fotografía, iluminación, fondo, composición, colores, relación 4:5.

El prompt maestro completo está en `references/prompts-anuncios.md`. Leerlo antes de generar.

## Gate de salida

Al terminar, **invocar `ec-auditor` con la rúbrica de anuncios**. Si la nota es ≥8/10, autorizar el arranque de `ec-fase2-landing` (la landing necesita la promesa, el ángulo ganador y el mecanismo ya validados aquí). Si es <8, corregir según la estructura de corrección del auditor y reauditar.

## Entregable

Documento Word navy/gold (#1B2A4A / #C8A951, Georgia/Arial): bloque de modelo económico (CPA/VMC con el cálculo aplicado al producto real), 10 ángulos, 25 anuncios A/B con sus 5 campos cada uno, el anuncio TOP de 15 elementos marcado, y la ficha de creatividades. Cierra con el informe del auditor.
