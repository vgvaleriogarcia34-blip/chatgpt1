---
name: ec-fase4-backend
description: "Fase 4 del embudo de conversion de Familias Empresarias: back-end y escalera de valor. Define el modelo de oferta (Hazlo tu mismo / Hecho contigo / Hecho para ti), la oferta con los 7 criterios ganadores y la conversion a cliente premium (5 pilares). Usar cuando Valerio diga 'fase 4 del embudo', 'back-end', 'escalera de valor', 'oferta de alto valor', 'cliente premium'. Arranca solo si ec-fase3-checkout obtuvo >=8; al cerrar invoca ec-auditor y con >=8 desbloquea ec-fase5-correos."
---

# EC · Fase 4 — Back-end y escalera de valor

## Principio rector

El libro no es el negocio. El libro es un mecanismo de adquisición: convierte desconocidos en clientes, y esos clientes en compradores de mayor valor. **La verdadera rentabilidad aparece después de la primera compra.** La mayoría intenta ganar dinero solo con el producto inicial; el crecimiento real está en convertir compradores de bajo valor en clientes de alto valor. El libro inicia la relación; las ofertas posteriores generan el beneficio. Y detrás de todo el sistema hay una intención mayor: no crear clientes, sino crear un movimiento.

## Entrada de la cadena

**Solo arranca si `ec-fase3-checkout` pasó el gate con ≥8/10.** Hereda el VMC objetivo, los precios del flujo de compra y el perfil del comprador. La oferta back-end que se diseñe aquí debe conectar con el back-end real de Familias Empresarias (Método Quercus™, mentoría ejecutiva, auditorías Clarity Code™), no ser un producto suelto.

## La escalera de valor (el destino del embudo)

```
Libro → Bump → Upsell → Downsell → Seguimiento → Oferta principal → Cliente premium
```
La primera venta genera confianza; las siguientes generan beneficio. Cada compra lleva de forma natural al siguiente peldaño, y todo el conjunto conduce a que el cliente sea parte del movimiento.

## Los tres modelos de oferta back-end

| Modelo | Qué es | Ejemplos | Ventajas |
|---|---|---|---|
| **Hazlo tú mismo** | El cliente implementa por sí mismo lo aprendido | Bootcamps, mentorings grupales/individuales, cursos online, programas digitales high-ticket | Escalables · poco tiempo operativo · automatizables |
| **Hecho contigo** | Acompañas al cliente durante el proceso | Mentorías, coaching, consultoría, programas grupales | Más transformación · mayor valor percibido · mayor ticket |
| **Hecho para ti** | El trabajo lo hace tu equipo o tú | Embudos, publicidad, automatizaciones, servicios premium | Máxima percepción de valor y exclusividad · tickets elevados · solución completa |

No solo cambia el formato: cambia la experiencia, el valor percibido y el tipo de cliente que atraes.

## Los 7 criterios de una oferta back-end ganadora

1. **Precio elevado** — no compitas por precio, compite por valor.
2. **Resuelve un gran problema** — el producto inicial resuelve un problema pequeño; la oferta posterior, el principal. Cuanto mayor: mayor precio, mayor urgencia, más sencilla la venta.
3. **Resultado tangible** — medible y con concreción. ✗ "Te ayudaré con tu negocio." ✓ "Te ayudaré a conseguir tus primeros 10 clientes en 90 días."
4. **Plazo específico** — un resultado sin tiempo es un deseo; con tiempo, un objetivo. ✗ "Perder peso." ✓ "Perder 10 kilos en los próximos 90 días."
5. **Valor muy superior al precio** — ¿lo que recibe vale 10× lo que paga? Rompe la resistencia de productos decepcionantes previos.
6. **Alto coste por inacción** — ¿qué pierde si no resuelve esto? Tiempo · dinero · oportunidades · crecimiento · resultados.
7. **Escalable** — debe crecer sin destruir tu tiempo: automatización · equipos · sistemas · procesos · grupos.

## Los 5 pilares de conversión a cliente premium

No se intenta vender directamente lo premium. Primero se construye, en orden: **Confianza → Relación → Autoridad → Resultados → Exposición repetida.** Solo después aparece la venta de alto valor.

## Coherencia económica

El sistema es rentable y escalable cuando el VMC supera el CPA. Esta fase cierra el círculo abierto en la Fase 1: la oferta back-end es la que hace que el VMC sea muy superior al coste de adquirir al lector.

El detalle completo (modelos, criterios con ejemplos, pilares y el guion de movimiento) está en `references/backend-escalera.md`. Leerlo antes de diseñar la oferta.

## Gate de salida

Al terminar, **invocar `ec-auditor` con la rúbrica de back-end**. ≥8/10 → desbloquea `ec-fase5-correos` (la campaña de correos venderá esta oferta). <8 → corregir (fallos típicos: oferta que compite por precio, resultado sin plazo, back-end desconectado del negocio real, pilares saltados) y reauditar.

## Entregable

Documento Word navy/gold (#1B2A4A / #C8A951, Georgia/Arial): escalera de valor del producto real, modelo back-end elegido y justificado, la oferta construida contra los 7 criterios (uno a uno), el plan de los 5 pilares y la coherencia CPA/VMC. Cierra con el informe del auditor.
