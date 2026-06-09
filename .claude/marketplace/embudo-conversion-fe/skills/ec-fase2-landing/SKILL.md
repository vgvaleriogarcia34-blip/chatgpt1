---
name: ec-fase2-landing
description: "Fase 2 del embudo de conversion de Familias Empresarias: landing de ventas del libro/oferta de entrada, de un solo objetivo, con 10 bloques (Hero, Historia, Diferencia, Transformacion, Stack de valor, Autoridad, Testimonios, FAQ, Garantia, Cierre). Usar cuando Valerio diga 'fase 2 del embudo', 'landing', 'pagina de ventas', 'sales page', 'clonar landing'. Arranca solo si ec-fase1-anuncios obtuvo >=8. Al cerrar invoca ec-auditor; con >=8 desbloquea ec-fase3-checkout."
---

# EC · Fase 2 — Landing de ventas del libro

## Principio rector

Una página de ventas no es una página: es un mecanismo de conversión psicológica, el puente entre la curiosidad y la decisión. Su función es **extremadamente simple: vender el producto principal. Nada más.** El error que mata la conversión es intentar vender diez cosas a la vez (libro + mentorías + programas + bonos + comunidad + consultorías). La mente necesita claridad: una sola dirección, un solo objetivo, una sola decisión.

## Entrada de la cadena

**Esta fase solo arranca si `ec-fase1-anuncios` pasó el gate de `ec-auditor` con ≥8/10.** Hereda de la fase 1 la promesa ganadora, el ángulo validado, el mecanismo único y el perfil del cliente ideal. Si esa fase no está aprobada, redirigir a `ec-fase1-anuncios` antes de escribir una línea de landing.

## Intake del prompt (antes de crear nada)

**LIBRO:** nombre, subtítulo, autor, precio real, precio oferta, nº páginas, nº capítulos, formato (digital/físico/audio), temática.
**CLIENTE IDEAL:** quién es, qué quiere, qué le frustra, qué teme, qué ha probado, objeciones principales.
**TRANSFORMACIÓN:** completa ("después de leer este libro la persona podrá…").
**MÉTODO:** nombre del método propietario + explicación breve.
**RESULTADOS:** casos reales, testimonios, cifras, experiencias.
**BONOS:** para cada uno → nombre, beneficio, valor.
**PRODUCTOS FUTUROS:** cursos, mentorías, eventos, certificaciones, membresías.

La mayoría de estos campos ya vienen del documento de producto y del entregable aprobado de la fase 1: reutilizarlos, no volver a preguntar.

## Estructura fija de la landing (10 bloques, en orden)

1. **HERO** — etiqueta superior · titular = gran promesa centrada · subtítulo · vídeo principal · caja lateral de compra · mockup libro+bonos · precio antiguo tachado · precio nuevo destacado · CTA · métodos de pago · garantía.
2. **HISTORIA** — situación inicial · frustración · errores · descubrimiento · método · nueva realidad.
3. **DIFERENCIA** — comparativa Antes vs Después.
4. **TRANSFORMACIÓN** — qué dejará de hacer / qué conseguirá.
5. **STACK DE VALOR** — libro + bono 1–5 (cada uno con beneficio, valor y mockup sugerido) · resumen: valor total, precio hoy, ahorro %.
6. **AUTORIDAD** — resultados · clientes · números · casos.
7. **TESTIMONIOS** — mínimo 5 (nombre, profesión, resultado, transformación).
8. **FAQ** — mínimo 12 preguntas que rompan objeciones (tiempo, dinero, experiencia, audiencia, miedo, resultados).
9. **GARANTÍA** — nombre · explicación · reducción de riesgo.
10. **CIERRE** — titular emocional · CTA · métodos de pago · garantía.

## Reglas obligatorias

**NO:** frases vacías · motivación barata · texto innecesario · párrafos largos · lenguaje genérico.
**SÍ:** beneficios · especificidad · números · contraste · curiosidad · tensión · urgencia ética · repetición estratégica de CTA · lenguaje humano.

El prompt completo está en `references/prompt-landing.md`. Leerlo antes de generar. En la segunda revisión de calidad, aplicar de oficio el skill `arquitecto-de-lectura` para la capa de jerarquía visual y navegación.

## Entrega del prompt (10 salidas)

1. Landing completa escrita · 2. Copy exacto de cada bloque · 3. Indicaciones visuales · 4. Mockups sugeridos · 5. Wireframe visual · 6. Arquitectura de upsell · 7. Arquitectura de downsell · 8. Página de agradecimiento · 9. Calendario/diagnóstico · 10. Secuencia email y WhatsApp post-compra.
*(Las salidas 6–10 son semillas que la Fase 3 y la Fase 5 desarrollan en detalle; aquí se dejan esbozadas para coherencia, no se ejecutan.)*

## Gate de salida

Al terminar, **invocar `ec-auditor` con la rúbrica de landing**. ≥8/10 → desbloquea `ec-fase3-checkout`. <8 → corregir según el auditor y reauditar.

## Entregable

Documento Word navy/gold (#1B2A4A / #C8A951, Georgia/Arial) con la landing completa bloque por bloque, copy listo para implementar, wireframe, mockups sugeridos e indicaciones visuales. Cierra con el informe del auditor.
