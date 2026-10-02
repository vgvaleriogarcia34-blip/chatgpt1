# Atalaya Grupos · propuesta de cuarto plan para grupos empresariales y pago anual

Actualización: **Grupos ya no publica precio**. Se contrata a medida con el equipo (formulario «Contactar con nuestro equipo», que llega a administración); los tramos de abajo quedan como referencia interna.

Estado: **decidido y construido** (fases 1 a 5). Pendiente: cobro automático (fase 6), ver opciones en `PUESTA-EN-MARCHA.md`.

## Decisiones tomadas

- **Grupos por tramos de sociedades:** de 1 a 5, 690 €/mes; de 6 a 10, 970 €/mes; más de 10, 1.790 €/mes.
- **Pago anual:** 30 % de descuento para todos los planes, pagando el año por adelantado. Sin descuento general aparte ni promoción de lanzamiento.
- **Profesional pasa a 1 empresa.** Consultora: hasta 15 empresas cliente por separado. Grupos: sociedades sin límite, con visión de grupo.

| Plan | Mensual | Anual (−30 %) |
|---|---|---|
| Esencial | 49 € | 34,30 €/mes · 411,60 €/año |
| Profesional | 129 € | 90,30 €/mes · 1.083,60 €/año |
| Consultora | 349 € | 244,30 €/mes · 2.931,60 €/año |
| Grupos, 1-5 sociedades | 690 € | 483 €/mes · 5.796 €/año |
| Grupos, 6-10 sociedades | 970 € | 679 €/mes · 8.148 €/año |
| Grupos, más de 10 | 1.790 € | 1.253 €/mes · 15.036 €/año |

## Lo construido

- Selector de empresa o sociedad en la cabecera de todas las pantallas, con alta, cambio de nombre y baja; cada empresa con sus datos separados (simulador, sistema estratégico, zona de origen, informes). La empresa que ya tenía cada cuenta pasa a ser la principal sin perder nada.
- Límites por plan al dar de alta empresas.
- Página comercial con interruptor mensual/anual y cuarta tarjeta Grupos con sus tramos; alta con plan y forma de pago; administración con forma de pago, número de empresas y cuota de cada cliente (el ingreso mensual cuenta los anuales a su precio con descuento).
- Vista de grupo (`grupo.html`): constelación de sociedades, tabla y consolidado con eliminaciones intragrupo, atribuible a la holding, comparativa, riesgos cruzados (clientes y proveedores comunes, sociedades en rojo o sin liquidez, dependencia de una sociedad, endeudamiento), objetivos de la holding en cascada con reparto por peso, e informe del grupo. En Consultora la misma página es la cartera de clientes, sin consolidado.
- Acceso a la vista de grupo desde el puesto de mando 3D y desde el menú de la cuenta.
- Tesorería del grupo: «¿quién financia a quién?» como pregunta pendiente hasta responderla, registro de préstamos entre sociedades, posición de cada una, propuesta de financiación interna, tres preguntas de gobierno y su reflejo en riesgos, consolidado e informe.
- Límite de empresas comprobado también en el servidor.

---

_Propuesta original:_

## 1. Punto de partida (lo que hay hoy)

- Tres planes: **Esencial** 49 €/mes (1 empresa), **Profesional** 129 €/mes («hasta 3 empresas») y **Consultora** 349 €/mes («hasta 15 empresas cliente» y gestor de usuarios).
- **Importante:** la aplicación guarda hoy **una sola empresa por cuenta**. «Hasta 3» y «hasta 15» solo aparecen en los textos de los planes; no hay selector de empresa ni datos separados por empresa. Mientras no se construya, conviene no venderlo.
- No hay pasarela de pago: el acceso lo activa el administrador a mano.

## 2. Escalera de planes propuesta

| Plan | Para quién | Empresas | Precio mensual | Pago anual (−30 %) |
|---|---|---|---|---|
| Esencial | Empresario que estudia una inversión | 1 | 49 € | 34,30 €/mes · 411,60 €/año |
| Profesional | Empresa que quiere gobernarse con el sistema estratégico | 1 | 129 € | 90,30 €/mes · 1.083,60 €/año |
| Consultora | Consultor o asesoría con varias empresas cliente, **independientes entre sí** | hasta 15 | 349 € | 244,30 €/mes · 2.931,60 €/año |
| **Grupos** | Holding o grupo familiar con varias sociedades que deben ir alineadas | 5 sociedades incluidas + 60 €/mes por sociedad adicional | **690 €** | 483 €/mes · 5.796 €/año |

Cambios respecto a hoy:

1. **Profesional pasa a 1 empresa.** La multiempresa deja de ser un extra del Profesional y se convierte en la «segunda puerta»: Consultora para empresas sueltas y Grupos para empresas que forman un conjunto.
2. **Consultora** sigue siendo multicliente, pero cada empresa es un mundo aparte (no hay consolidación ni visión de grupo).
3. **Grupos** es el único plan con visión consolidada y alineamiento entre sociedades. Precio en la franja que comentaste (600-700 €): 690 €/mes con cinco sociedades. Alternativa: dos tramos, Grupos 640 € (hasta 4) y Grupos Plus 790 € (hasta 10).
4. A quien ya esté en Profesional usando varias empresas se le mantiene lo contratado hasta la renovación.

### Sobre el 30 % de descuento anual

Es un descuento alto: lo habitual en software de suscripción es entre el 15 y el 20 % (dos meses gratis ≈ 16,7 %). Tiene sentido si buscas caja por adelantado y retener al cliente doce meses. Recomendación: 30 % solo con **pago anual por adelantado** y sin reembolso parcial, o bien un 20 % general y el 30 % como promoción de lanzamiento.

## 3. Qué hace el ecosistema de grupo

- **Selector de sociedad** en la barra superior y en el puesto de mando 3D: cada sociedad es un mundo de la galaxia del grupo, con la holding en el centro.
- **Datos separados por sociedad.** Cada una tiene su simulador, su sistema estratégico, su zona de origen y sus informes 360.
- **Cuadro de mando del grupo:** salud de cada sociedad con su semáforo, ventas, EBITDA, caja y deuda de cada una y del total.
- **Consolidación sencilla:** suma de cuentas con eliminación de ventas, compras y préstamos entre sociedades (marcando los clientes y proveedores que son del grupo).
- **Alineamiento:** objetivos de la holding en cascada a cada sociedad, y plan de acción del grupo que reúne las acciones de todas.
- **Tesorería de grupo:** caja de cada sociedad, préstamos intragrupo y qué sociedad financia a cuál (base para un futuro *cash pooling*).
- **Comparativa entre sociedades:** márgenes, productividad, rotación y días de cobro, una al lado de la otra.
- **Estructura societaria:** el simulador ya tiene las fichas de estructuras; en Grupos se dibuja el organigrama societario real con porcentajes de participación.
- **Informe 360 del grupo:** foto consolidada, riesgos cruzados (un cliente que compra a varias sociedades, un proveedor común) y plan de acción del grupo.
- **Permisos por sociedad:** la propiedad y la dirección del grupo ven todo; el director de cada sociedad ve solo la suya; el consultor externo, lo que se le comparta.

## 4. Cómo se construiría

**Datos.** Hoy cada cuenta guarda `simulador` y `estrategia`. Pasaría a: cuenta → grupo → sociedades, y para cada sociedad `simulador`, `estrategia` y `origen`; más un bloque `grupo` con participaciones, operaciones intragrupo, objetivos de la holding y consolidación. En el navegador, las claves pasan de `atalaya.v1` a `atalaya.v1.<sociedad>`, con migración automática de la empresa actual como primera sociedad.

**Servidor.** Nuevas rutas para sociedades (alta, baja, lista), permisos por sociedad, límites según el plan y datos de grupo. El gestor de usuarios del administrador muestra plan, periodo (mensual o anual) y sociedades de cada cliente.

**Cobro.** Pasarela de suscripciones (por ejemplo, Stripe Billing) con plan mensual o anual, prorrateo al cambiar de plan, sociedades adicionales como complemento, facturas con IVA y portal del cliente para cambiar la tarjeta o el plan. Requiere tener Atalaya en el servidor, que dejamos para más adelante.

**Página comercial.** Interruptor «Mensual / Anual (−30 %)» en los planes, cuarta tarjeta Grupos y una sección que enseñe la galaxia del grupo.

## 5. Fases propuestas

1. **Multiempresa base:** selector de sociedad, datos separados, migración y límites por plan. Arregla también lo que hoy prometen Profesional y Consultora.
2. **Planes y precios:** cuarta tarjeta, interruptor mensual/anual y plan y periodo en el gestor de usuarios (sin cobro automático todavía).
3. **Vista de grupo:** cuadro de mando del grupo, comparativa entre sociedades y consolidación con eliminaciones marcadas a mano.
4. **Alineamiento:** objetivos en cascada, plan de acción e informe 360 del grupo.
5. **Tesorería de grupo e intragrupo.**
6. **Cobro automático** cuando Atalaya esté en el servidor.

## 6. Decisiones que necesito de ti

- Precio y sociedades incluidas en Grupos (690 € con 5, o dos tramos 640/790 €).
- Descuento anual: 30 % para todos, o 20 % general y 30 % de lanzamiento.
- Si Profesional pasa a 1 empresa (recomendado) y qué hacer con quien ya lo tenga.
- Si Consultora mantiene 15 empresas cliente o pasa a un precio por empresa.
