# Anexo comercial · Snoopy Heladerías, S.L.

**Cliente:** Snoopy Heladerías, S.L. (CIF B05546601)
**Local con datos detallados:** ZigZag (uno de los locales del grupo)
**Fecha:** 2026-05-28
**Fuentes:** `01-datos-entrada/contabilidad/` (cuentas anuales 2022-2024) · `01-datos-entrada/abc-productos-clientes/zigzag-ventas-2026-02.csv` (TPV febrero 2026) · síntesis del orquestador en `02-analisis/00-datos-extraidos.md`.

> **Aviso de alcance.** Este anexo se redacta con datos comerciales muy limitados: no disponemos de ABC de productos, ABC de clientes, ticket medio, número de tickets, política de descuentos, ni desglose por local más allá de ZigZag. Por tanto, lo que sigue mezcla **hechos verificables** (PyG agregada y ventas diarias de ZigZag en febrero 2026) con **hipótesis razonadas a rango** que deben confirmarse antes del informe ejecutivo final.

---

## 1. Resumen ejecutivo

Cinco hallazgos comerciales con cifra:

1. **Las ventas del grupo se han multiplicado por 2,7 en dos años** (449 k€ → 1.207 k€), pero el **margen bruto cae 8,5 puntos** (61,2% → 52,7%). La empresa está creciendo "vendiendo más barato de lo que compra". Impacto: si en 2024 hubiera mantenido el margen 2022, el margen bruto habría sido **~739 k€** en lugar de 636 k€, es decir, **~103 k€ adicionales** que habrían pasado íntegros al resultado. Hoy ese dinero se lo lleva el proveedor.
2. **Concentración crítica de ventas en ZigZag.** Extrapolando febrero (39.606 €) con curva de estacionalidad típica de heladería, ZigZag factura entre **475 k€ (mínimo, sin verano)** y **650-800 k€ anuales**. Sobre los 1.207 k€ del grupo en 2024, ZigZag pesa entre **40% (escenario conservador) y 55-65% (escenario realista con verano fuerte)**. Si esto se confirma, el grupo depende de un solo local. Hallazgo de primera línea (típicamente alertaríamos por encima del 25% del top 1).
3. **Mix barra/mesas descompensado en ZigZag: 19,5% barra / 80,5% mesas.** En heladería de barrio, una barra del 30-40% es habitual y es la **mejor venta** (menos servicio, menos rotura, menos personal). Si ZigZag subiera barra del 19,5% al 30% (≈4.000 €/mes adicionales en ese canal), y asumiendo 5 puntos extra de margen bruto sobre esos €, podrían ser **~2.400 €/año de margen adicional sin invertir más**. Pequeño en valor absoluto, pero indica margen para repensar el formato.
4. **Concentración semanal salvaje: el fin de semana hace el 60% del mes.** Viernes-sábado-domingo (12 días sobre 28) suman 24.132 € = **60,9% del mes** y de media facturan **2.300 €/día**, contra **740 €/día** de lunes a jueves (3x). La estructura de personal y aprovisionamiento debe estar dimensionada para ese pico, lo que castiga el margen entre semana. Oportunidad clara: activar entresemana (menús infantiles, escolares, promociones tarde, eventos privados).
5. **Variabilidad diaria 5,4x (de 555 € a 2.974 €) con coeficiente de variación del 58%.** Es muy alta para un local fijo y refleja **dependencia de la meteorología y del flujo espontáneo**, no de una clientela fidelizada con reserva o recurrencia. Sin programa de fidelización, sin reservas, sin delivery confirmado: cada día es una lotería.

**Top 3 datos pendientes prioritarios:**

- **Ventas por local** del grupo en 2024 y 2025 (export TPV de cada local en el mismo formato que ZigZag). Sin esto no podemos cerrar la pregunta de concentración.
- **ABC de productos/sabores** del último ejercicio completo. Saber qué 20% de SKUs hace el 80% de la venta es básico antes de tocar carta o precios.
- **Última subida de tarifas y elasticidad observada**. El margen bruto cae 8,5 pp; necesitamos saber si los precios al público se han movido o están congelados desde antes de la inflación 2022-2024.

---

## 2. Foto comercial actual

### 2.1. Evolución de ventas del grupo (hechos)

| Año | Ventas (€) | Δ vs. año anterior | Margen bruto € | % Margen bruto |
|---|---:|---:|---:|---:|
| 2022 | 449.372,52 | — | 275.037,37 | 61,2% |
| 2023 | 762.226,94 | **+69,6%** | 450.483,25 | 59,1% |
| 2024 | 1.206.904,40 | **+58,3%** | 635.595,25 | 52,7% |

Crecimiento de ventas **excepcional** dos años seguidos. Tres hipótesis no excluyentes (a confirmar):

- **(H1) Apertura de nuevos locales** entre 2022 y 2024. Compatible con el salto de inmovilizado material de 26.575 € (2022) a 95.674 € (2023) — +69.000 € que muy probablemente fue obra, maquinaria y mobiliario de un local nuevo.
- **(H2) Maduración de un local recién abierto** que en 2022 estaba arrancando y en 2024 ya está en velocidad de crucero (efecto típico: año 1 al 50% de capacidad, año 2 al 80%, año 3 estabilizado).
- **(H3) Subida de tarifas o cambio de mix** (más helado de autor, cafés, brunch, tartas, eventos). El pricing podría haberse movido en parte, pero no lo suficiente como para compensar el coste de aprovisionamiento (ver hallazgo 3.1).

Hoy **no podemos diferenciar** cuánto del crecimiento es "más locales", cuánto es "más venta por local" y cuánto es "más precio".

### 2.2. Foto de ZigZag (febrero 2026, único local con datos detallados)

| Magnitud | Valor |
|---|---:|
| Ventas totales del mes | 39.605,76 € |
| Días operados | 28 |
| Media diaria | 1.414,49 € |
| Día mejor | 2.974,50 € (sábado 21/02) |
| Día peor | 554,97 € (martes 03/02) |
| Ratio mejor/peor | 5,36x |
| Coeficiente de variación diario | 58% |
| Reparto **barra** | 7.715,51 € · **19,5%** |
| Reparto **mesas** | 31.890,25 € · **80,5%** |

**Media por día de la semana** (4 observaciones por día, febrero 2026):

| Día | Media (€) | Índice vs. lunes |
|---|---:|---:|
| Lunes | 645 | 1,00 |
| Martes | 690 | 1,07 |
| Miércoles | 817 | 1,27 |
| Jueves | 823 | 1,28 |
| **Viernes** | **1.985** | **3,08** |
| **Sábado** | **2.520** | **3,91** |
| **Domingo** | **2.422** | **3,76** |

Fin de semana (V+S+D): **60,9% del mes en 43% de los días**. Negocio claramente "de tarde de finde".

### 2.3. Anualización de ZigZag y peso en el grupo (rangos)

Tres escenarios para el año completo de ZigZag, partiendo de un febrero típico (mes flojo en heladería):

| Escenario | Supuesto | Ventas/año ZigZag | % sobre 1.207 k€ grupo 2024 |
|---|---|---:|---:|
| Conservador (plano) | 12 × febrero, sin verano fuerte | ~475 k€ | ~39% |
| Realista | 9 meses normales + 3 meses verano al 2x | ~594 k€ | ~49% |
| Optimista | 9 meses normales + 3 meses verano al 2,5x | ~654 k€ | ~54% |
| Verano muy fuerte | 9 meses normales + 3 meses verano al 3x | ~713 k€ | ~59% |

> Nota: 2024 (las cifras del grupo) y 2026 (las cifras de ZigZag) son ejercicios distintos. Si entre 2024 y 2026 el grupo siguió creciendo, el peso real de ZigZag sobre el grupo actual sería menor. Aun así, el rango 40-60% es la mejor estimación con los datos en mano.

### 2.4. Concentración y dependencia

- **Top 1 local (ZigZag)**: entre 40% y 60% del grupo. Por encima del umbral de alerta (25%).
- **Concentración semanal**: viernes-sábado-domingo = 61% del mes. Si un fin de semana llueve, la facturación de la semana cae al 60%.
- **Concentración estacional** (hipotética, a confirmar con cifras del año): junio-agosto probablemente el 40-50% del año en heladería. Combinado con la concentración de finde, el negocio depende de ~30-40 fines de semana al año en buen tiempo.

### 2.5. Lo que **no tenemos** (declarado pendiente)

- Número y nombre del resto de locales del grupo.
- Ventas por local para 2024 y 2025.
- Número de tickets y ticket medio (sólo tenemos €).
- ABC de productos / sabores / familias (helados, cafetería, tartas, otros).
- Política de precios y tarifa actual vs. competencia.
- % de descuentos, promociones, vales, programa de fidelización.
- Plataformas de delivery (Glovo, UberEats, Just Eat): si están activas, qué % de ventas, qué comisión.
- Eventos B2B, catering, lotes/regalos para empresas, suministro a terceros.
- Reseñas Google / TripAdvisor / Instagram (NPS implícito).

---

## 3. Hallazgos detallados

### 3.1. La pérdida de margen bruto es un problema de **pricing**, no de comercial

El coste de aprovisionamiento crece **más rápido que las ventas**:

| Concepto | 2022 → 2023 | 2023 → 2024 |
|---|---:|---:|
| Ventas | +69,6% | +58,3% |
| Aprovisionamientos | +78,8% | +83,3% |
| **Diferencial (compras crecen más que ventas)** | **+9,2 pp** | **+25,0 pp** |

Esto se traduce en margen bruto que pasa de 61,2% (2022) a 52,7% (2024). **8,5 puntos perdidos en dos años.**

**Por qué importa en €**: si en 2024 el margen bruto hubiera sido el de 2022, habría dejado **~103 k€ extra** (1.206.904 × 8,5%). Esos 103 k€ habrían convertido la empresa en sólidamente rentable en lugar del beneficio marginal de 3.276 € que declara.

**Diagnóstico comercial (a contrastar con `analista-economico`)**: este patrón —ventas que suben fuerte y margen bruto que cae— rara vez es problema de proveedor sólo. Suele ser **pricing congelado** (o subido por debajo de la inflación de coste). La heladería 2022-2024 ha vivido subidas brutales en leche, azúcar, fruta, frutos secos, chocolate, packaging y energía. Si los precios al público no se han revisado al alza al menos un 10-15% acumulado en dos años, el resultado es exactamente este.

**No proponemos subir precios sin contexto.** Antes de tocar tarifa, hay que saber:

- Cuándo se subió el precio por última vez y cuánto.
- Qué nivel de precio tiene la competencia directa de cada local.
- Si hay productos sin alma (que se venden poco) que se podrían eliminar para concentrar margen.
- Si hay sabores premium / autor que admiten un precio más alto frente a la línea base.

### 3.2. Mix barra/mesas: 19,5% barra es bajo y previsiblemente caro

En una heladería de barrio típica, la barra (helado para llevar, cono o tarrina, cafetería rápida) suele ser **30-40%** de la venta. En ZigZag es **19,5%**. ¿Por qué importa comercialmente?

- **Barra rota más rápido**: misma plaza vende a más clientes por hora. En verano, el ratio puede ser de 3:1.
- **Barra requiere menos personal** por euro vendido (menos servicio, menos lavado, menos espera).
- **Barra fideliza menos** (cliente más impulsivo) pero **tiene ticket medio menor**, por lo que da menos margen absoluto por cliente, pero más margen por hora-empleado.

Que ZigZag tenga sólo 19,5% de barra **puede explicarse por**:

- Mucha superficie de mesas y poco mostrador a calle (cuestión de layout físico).
- Política deliberada de "experiencia local" (sentarse y consumir) — válido si el ticket de mesa lo justifica, pero hay que medirlo.
- Equipamiento de barra limitado (sólo helado, sin café/repostería rápida).

**Dato a pedir**: ticket medio en barra vs. ticket medio en mesa, y margen estimado de cada canal. Sin eso no podemos cerrar el diagnóstico.

### 3.3. La variabilidad diaria refleja **dependencia de flujo espontáneo**

Coeficiente de variación 58% en 28 días. Día mejor 5,4x el día peor.

Una clientela fidelizada (reservas, miembros del club, pedidos B2B, delivery recurrente) **suaviza la curva**. La cola larga la hacen los "días de pico atmosférico" (sábado soleado de feb tras una semana de lluvia → 2.974 €) y los "días que nadie sale" (martes lluvioso → 555 €).

**Lo que esto sugiere comercialmente**:

- **Hay margen para activar entresemana**. Lunes-martes-miércoles está en 645-690-817 €/día. Si se subiera la media de esos tres días de 717 €/día a 900 €/día (+25%), serían ~7.300 €/mes adicionales sólo en ZigZag (~87.000 €/año, suponiendo curva similar).
- **Palancas posibles entresemana**: combo escolar (4-6 € merienda), "miércoles 2x1 en tarrinas pequeñas", carta de cafetería de tarde para teletrabajadores, repostería al peso, alianzas con escuelas/AMPAs, eventos privados (cumpleaños infantiles cerrados).
- **No hay (o no se nos ha contado) un programa de fidelización**. En una heladería, una tarjeta sello / app sencilla (10ª tarrina gratis) suele subir la frecuencia de visita un 15-25%.

### 3.4. Crecimiento del grupo: muy probablemente "más locales", no "más venta por local"

Multiplicar por 2,7 las ventas en 2 años sin abrir locales requeriría algo extraordinario (un local que se hace viral, una expansión brutal de horario, etc.). La hipótesis más razonable es **apertura de uno o dos locales en 2023-2024**, compatible con:

- Salto de inmovilizado material +70 k€ en 2023.
- Salto de plantilla y coste de personal (+86% en 2023, +65% en 2024), que es lo que pasa cuando se abre local.

**Lo que esto cambia comercialmente**: un grupo que crece abriendo es un grupo que **gasta cash en obra y maquinaria**, y eso explica que la liquidez esté tensa (ver `anexo-financiero`). Cada apertura nueva tarda 18-36 meses en madurar; si han abierto en 2023, la madurez completa llega ahora o el año que viene. **La pregunta clave**: ¿el local nuevo está aportando o todavía resta?

### 3.5. Estructura comercial (equipo): cero datos

No tenemos plantilla, ni organigrama, ni nombre de responsable comercial. El coste de personal (52% sobre ventas) sugiere un equipo grande, pero no podemos:

- Calcular ventas/empleado.
- Saber si hay un responsable de local con incentivos.
- Saber si hay coordinación comercial entre locales o cada uno funciona como isla.

**A coordinar con `analista-estructural`**: ¿hay encargados de local? ¿bajo qué dirección operativa? ¿quién decide carta, precios, promociones?

---

## 4. Mapa de riesgos comerciales

| Riesgo | Probabilidad | Impacto € | Mitigación inicial |
|---|---|---|---|
| **ZigZag concentra 40-60% del grupo** y un imprevisto (obra en la calle, cierre temporal, pérdida del encargado clave, traspaso del local) lo cierra | Media | 470-700 k€/año perdidos | Confirmar peso real, diversificar venta delivery, contratos plurianuales con el arrendador, plan de contingencia operativa |
| **Pricing congelado** mientras los proveedores siguen subiendo: en 2026 podríamos ver margen bruto bajando del 50% | Alta | -50 a -80 k€/año adicionales | Revisión de tarifa por familia este verano (pre-temporada alta), benchmark con competencia |
| **Fin de semana = 60% del mes**: una primavera lluviosa o un puente festivo flojo destroza la facturación trimestral | Media-alta | -10 a -25 k€/mes en mes malo | Activar entresemana (escolares, B2B, delivery), terraza cubierta si layout lo permite |
| **No hay (que sepamos) presencia en plataformas de delivery**: pierde clientela joven que no se desplaza | Por confirmar | +5-10% ventas si se activa bien | Pilotar Glovo/UberEats con carta reducida y precios ajustados al fee de plataforma |
| **No hay programa de fidelización**: cada cliente es un cliente nuevo cada vez | Alta | Frecuencia de visita 15-25% inferior al potencial | App sencilla / tarjeta de sellos / club de socios con descuento en cumpleaños |
| **Local nuevo (hipotético, 2023) sin madurar**: puede estar absorbiendo cash sin generar margen todavía | Media | Si pierde 30-50 k€/año, justifica revisión | Aislar P&L por local; decisión a los 24 meses sobre continuar/cerrar |

---

## 5. Plan de crecimiento rentable

Las cifras son **estimaciones de partida** que debemos validar cuando lleguen los datos pendientes. Se priorizan por € incremental / esfuerzo / plazo.

| # | Acción | € incremental anual estimado | Coste de implantar | Plazo | Esfuerzo |
|---|---|---:|---:|---|---|
| 1 | **Revisión de tarifa por familia de producto** (helado base, premium, cafetería, tartas) con subida media 6-10% donde haya recorrido | +60.000 a +110.000 € margen bruto | < 2.000 € (carta nueva, formación equipo) | 2 meses | Bajo |
| 2 | **Activación entresemana en ZigZag** (combo escolar + cafetería tarde + eventos privados los lunes-martes) | +30.000 a +50.000 € ventas | 3-5.000 € (cartelería, alianzas locales, redes) | 3 meses | Medio |
| 3 | **Subir mix de barra del 19,5% al 28-30%** en ZigZag (reordenar mostrador, carta visual de impulso, café+helado combo) | +15.000 a +25.000 € ventas, +3.000 a +6.000 € margen | < 3.000 € (señalética, vinilos, formación) | 2 meses | Bajo |
| 4 | **Programa de fidelización simple** (tarjeta de sellos físico o app gratuita tipo Loyverse / Square) para todos los locales | +20.000 a +40.000 € ventas (subida de frecuencia 10-15%) | < 2.000 €/año | 3 meses | Bajo |
| 5 | **Piloto de delivery propio o Glovo/UberEats** en horario de tarde-noche con carta cerrada y precio ajustado a comisión | +25.000 a +60.000 € ventas (margen menor por la comisión 25-30%) | 1.500 € setup + fees | 1 mes piloto | Bajo |
| 6 | **B2B eventos: cumpleaños infantiles cerrados, catering corporativo, helado para restaurantes** | +15.000 a +35.000 € ventas con ticket medio alto | 2.000 € (web + comercial freelance a comisión) | 6 meses | Medio |
| 7 | **Auditoría de aprovisionamiento**: renegociar con top 3 proveedores (probablemente leche, base de helado, chocolate) y pedir rappel anual o cambio a alternativa | +15.000 a +30.000 € margen | 0 € (tiempo interno) | 2 meses | Bajo |

**Total banda alta de € incremental año 1 (sin solapes excesivos): +200.000 a +350.000 € de impacto P&L**, principalmente vía margen bruto. Es ambicioso pero coherente con el tamaño actual del grupo.

> Coordinación: la acción 1 (pricing) **debe** coordinarse con `analista-economico` para garantizar que la cifra de elasticidad y el escenario de subida son consistentes con la proyección financiera, y con `planificador-estrategico` para encajarla en el calendario antes del verano 2026 (no tiene sentido subir precios en septiembre, hay que hacerlo antes de la temporada alta).

---

## 6. Datos pendientes (prioridad de obtención)

| Prioridad | Dato | Fuente | Para qué |
|---|---|---|---|
| **Alta** | Ventas por local 2024 y 2025 (€/mes) | Export TPV de cada local | Cerrar concentración. Saber si ZigZag es 40% o 60% del grupo |
| **Alta** | ABC de productos / familias 2024 o 2025 | Export TPV consolidado por SKU | Antes de tocar carta o precio |
| **Alta** | Última subida de tarifa (fecha y %) por familia | Cliente / responsable de local | Antes de proponer subida |
| **Alta** | Nº de locales actuales y fecha de apertura de cada uno | Cliente | Madurez de cada local; explicar el +69%+58% de crecimiento |
| **Media** | Número de tickets y ticket medio por local | TPV | Ticket medio es el indicador comercial nº 1 |
| **Media** | Coste por proveedor (top 5 cuentas 600/602) | Mayor contable | Renegociación de compras |
| **Media** | Plataformas de delivery activas (Glovo/UberEats/Just Eat) y % de ventas | Cliente | Saber si ya hay canal digital y qué pesa |
| **Media** | Política actual de descuentos, vales y promociones | Cliente / TPV | Detectar descuentos sistemáticos que erosionan margen |
| **Baja** | Reseñas Google / TripAdvisor (puntuación media y nº reseñas por local) | Online | NPS implícito; reputación |
| **Baja** | Cuadrante de horas del equipo y % horas finde vs. entresemana | RRHH | Coordinar con `analista-operativo` y `analista-estructural` |

---

## 7. Coordinación con otros analistas

- **Con `analista-economico`**: usar el mismo perímetro de ABC y la misma cifra de ventas (1.206.904 € 2024). Compartir hipótesis de pricing (este anexo asume que la pérdida de 8,5 pp de margen es ~70% pricing congelado, ~30% subida real de compras; el analista económico debe validar este reparto).
- **Con `analista-financiero`**: la concentración en ZigZag combinada con la tensión de liquidez (AC/PC = 0,57) sugiere que **una caída del 20% en ZigZag tumba la caja del grupo**. Stress test conjunto.
- **Con `analista-estructural`**: ¿quién decide precios? ¿hay responsable comercial? ¿el encargado de cada local tiene autonomía para promociones? El equipo decide los precios, y sin equipo claro no hay pricing claro.
- **Con `planificador-estrategico`**: las acciones 1, 2 y 3 deben estar implantadas **antes del 15 de junio de 2026** para capturar la temporada alta. Es el único bloque del plan con calendario verdaderamente urgente.
