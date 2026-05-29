# Anexo operativo · Snoopy Heladerías, S.L.

**Cliente:** Snoopy Heladerías, S.L. (CIF B05546601)
**Sector:** Hostelería · heladerías artesanas · multilocal
**Fecha:** 2026-05-28
**Autor:** Analista operativo (consultora Familias Empresarias)
**Aviso de alcance:** los datos operativos disponibles son extremadamente escasos. Este anexo trabaja con **proxys contables** (PyG y balance 2022-2024 extraídos por OCR) más una **única serie diaria de TPV** (local ZigZag, febrero 2026). Todas las cifras de impacto € se entregan como **rangos con supuestos declarados**, no como cifras cerradas. La sección 5 lista exhaustivamente lo que hay que pedir para afinar.

---

## 1. Resumen ejecutivo

Snoopy ha multiplicado por 2,7 sus ventas en dos años (449 k€ → 1.207 k€) sin que el resultado de explotación se mueva del cero. La operativa se ha desbordado: cada euro nuevo de venta entra con un coste marginal demasiado alto. Los cinco hallazgos clave, ordenados por impacto:

1. **Food cost descontrolado**. Aprovisionamientos / ventas = **47,3%** en 2024 frente a un estándar de heladería artesana del **28-32%**. La brecha (15-19 puntos) equivale a un **ahorro potencial de 180-230 k€/año** si se corrige.
2. **Coste de personal sobre ventas del 52,2%** frente a benchmark sectorial de heladería del 30-35%. Brecha de 17-22 puntos = **205-265 k€/año** de coste evitable, aunque parte puede ser estructural (locales mal dimensionados) y exige ajuste sin mermar calidad de servicio.
3. **Sobre-stock de producto perecedero**. 54 k€ de existencias = 33,5 días de cobertura frente a target 7-15 días. **Capital atrapado 30-37 k€** + riesgo de mermas no contabilizadas.
4. **Plantilla mal dimensionada por día de la semana** (evidencia ZigZag): los fines de semana facturan 3,5x los lunes-jueves. Si la plantilla es plana, hay **sobre-personal de lunes a jueves** y posible infra-personal de viernes a domingo (pérdida de venta por colas).
5. **Operativa no documentada y sin sistema de medición**. No consta ERP, escandallos, ficha técnica, control de mermas ni KPIs operativos. Es el **hallazgo estructural** que explica los cuatro anteriores: sin medición no hay control.

Impacto € teórico total (suma con solapamientos): **300-450 k€/año** de coste evitable, equivalente a 25-37% de la facturación 2024. Ninguna cifra es cerrada hasta validar plantilla por local, mermas medidas y escandallos.

---

## 2. Mapa operativo actual

### 2.1 Lo que sabemos

| Dimensión | Valor / situación | Fuente |
|---|---|---|
| Locales conocidos | Al menos uno con nombre: **"ZigZag"**. Hay otros sin identificar. | `00-datos-extraidos.md` §3 |
| Facturación grupo 2024 | 1.206.904 € | PyG 2024 |
| Facturación ZigZag (proxy) | ≈ 39.606 € en febrero 2026; anualizado a tendencia ≈ 482 k€ (estacionalidad pendiente) | CSV TPV feb-26 |
| Peso ZigZag sobre grupo (estimado) | ≈ 40% (con cautelas: febrero es mes flojo, hay que ver verano) | Cálculo orquestador |
| Aprovisionamientos 2024 | 571.309 € | PyG 2024 |
| Gasto de personal 2024 | 630.173 € | PyG 2024 |
| Existencias a 31/12/2024 | 54.199 € | Balance 2024 |
| Inmovilizado material | Salto +70 k€ entre 2022 y 2023; estable 2024 | Balance |
| Reparto barra/mesas ZigZag | 19,5% barra / 80,5% mesas | CSV TPV |

### 2.2 Capacidad instalada vs. real

**Pendiente.** No tenemos m², número de mesas, aforo, horario de apertura, ni capacidad teórica de producción (litros/día). Sin estos datos no se puede calcular ocupación ni cuello de botella.

### 2.3 Indicadores operativos detectados (con valor y fuente)

| KPI | Valor 2024 | Benchmark heladería | Brecha | Fuente |
|---|---:|---|---:|---|
| Food cost (Aprov./Ventas) | **47,3%** | 28-32% | +15 a +19 pp | PyG 2024 |
| Coste personal / Ventas | **52,2%** | 30-35% | +17 a +22 pp | PyG 2024 |
| Días de stock | **33,5** | 7-15 | +18 a +26 días | Balance + Aprov. 2024 |
| Margen bruto | **52,7%** | 65-72% | -12 a -19 pp | PyG 2024 |
| % ventas en mesa (ZigZag) | 80,5% | 60-70% típico heladería | +10-20 pp | CSV TPV |
| Ratio venta sábado / venta martes (ZigZag) | **3,6x** | 1,8-2,2x | el doble de lo normal | CSV TPV |

### 2.4 Lo que no está mapeado (riesgo operativo per se)

- No hay procesos documentados: ni de producción, ni de pedido a proveedor, ni de apertura/cierre de local, ni de manipulación higiénica (APPCC).
- No consta ERP único, ni TPV unificado entre locales, ni sistema de inventario.
- No consta responsable operativo identificado (¿gerente operativo? ¿el propio socio?).
- **Riesgo de concentración**: si la elaboración del helado depende de una sola persona (probablemente el socio-maestro heladero), todo el negocio se apoya en ella. **Marcar como crítico** hasta confirmar.

---

## 3. Hallazgos detallados

### H1. Food cost del 47% es 15-19 puntos por encima del estándar sectorial

- **Qué pasa.** En 2024 los aprovisionamientos absorbieron 571.309 € sobre ventas de 1.206.904 €, es decir el **47,3%**. En heladería artesana, con producción propia, el food cost se mueve entre **28-32%** (referencias: Asociación Española de Fabricantes Artesanos de Helado, informes Hostelería de España, márgenes brutos publicados por grupos cotizados del sector). Además, el indicador **se está deteriorando**: era 38,8% en 2022, 40,9% en 2023, 47,3% en 2024. Cada año pierde entre 2 y 6 puntos de margen.
- **Evidencia.** `00-datos-extraidos.md` §1 PyG 2024 línea "Aprovisionamientos": -571.309,15 € sobre ventas 1.206.904,40 €.
- **Por qué importa.** Llevar el food cost del 47,3% al **35%** (techo razonable, no agresivo) liberaría:
  - 12,3 pp × 1.206.904 € = **148.500 €/año** de ahorro recurrente.
  - Si se alcanzase el 32% (target estricto): 15,3 pp × 1.207 k = **184.700 €/año**.
  - **Rango realista a 12-18 meses: 130-200 k€/año.**
  - Supuesto declarado: ventas estables. Si las ventas crecen, el ahorro escala proporcionalmente.
- **Causa raíz probable** (no excluyentes, todas a verificar):
  1. **Recetas no estandarizadas / sin escandallo**: cada elaboración consume materia prima distinta. Muy típico en heladería artesana cuando el maestro "hace al ojo".
  2. **Compras descontroladas**: sin pedido formalizado, sin comparativa de proveedores, sin negociación anual de precios.
  3. **Mermas no medidas**: helado caducado, cubetas vaciadas a final de jornada, roturas, autoconsumo del personal, invitaciones, descuentos no registrados.
  4. **Sobreproducción**: elaborar más helado del que se vende, especialmente en sabores de baja rotación.
  5. **Mix de producto**: si se ha incorporado bollería, café, repostería externa con coste alto y margen menor, arrastra la media.
  6. **Inflación de materia prima 2022-2024** (azúcar, leche, frutos secos, cacao): explica una parte, pero **no 15 puntos**. Como máximo 3-5 puntos.
- **Recomendación.**
  1. Inventario físico a fecha cierre + apertura de control diario (formulario simple en papel o Excel) durante 90 días.
  2. Escandallar las 10 referencias top de cada local (sabores estrella, copas, productos de carta).
  3. Tarifa única negociada con cada proveedor; consolidar a 1-2 proveedores por categoría.
  4. Implantar control de mermas con bitácora diaria (cubeta tirada = registro).
- **Coste de implantar.** 8-15 k€ (consultor de operaciones hostelería 3 meses + software inventario básico tipo Mapal/Trail/Apicbase: 100-300 €/mes).
- **Plazo.** Diagnóstico real en 60 días; primer ahorro tangible a 6 meses; consolidación 12-18 meses.

### H2. Personal sobre ventas del 52% — 17-22 puntos por encima del benchmark

- **Qué pasa.** En 2024 el coste de personal fue 630.173 €, un **52,2% de las ventas**, frente a 30-35% sectorial. Además crece más rápido que la facturación (de 45,7% en 2022 a 52,2% en 2024).
- **Evidencia.** PyG 2024 línea "Gastos de personal" en `00-datos-extraidos.md` §1.
- **Por qué importa.** Llevarlo al 40% (intermedio prudente) ahorraría 12,2 pp × 1.207 k = **147.200 €/año**. Llevarlo al 35% (target sectorial) ahorraría 17,2 pp × 1.207 k = **207.600 €/año**. **Rango realista: 100-200 k€/año**, aunque parte del exceso puede ser **estructural** (si los locales son pequeños y necesitan dotación mínima por turno y por norma de seguridad alimentaria).
- **Causa raíz probable.**
  1. **Plantilla plana** que no se adapta a la curva de demanda diaria/semanal (ver hallazgo H4).
  2. **Sobre-dotación de mandos**: en empresas familiares es típico tener varios familiares en nómina sin un puesto definido.
  3. **Apertura de horario excesivo** en locales que no llenan en horario valle.
  4. **Pluses, horas extra y sustituciones** mal controladas.
  5. **Convenio aplicado más alto que el estricto** (heladería puede estar bajo hostelería general; hay margen de optimización legal).
- **Recomendación.**
  1. Auditoría de cuadrantes por local y por día: cruzar horas trabajadas con ventas reales del CSV TPV.
  2. Modelo de turnos variable según día (refuerzo viernes-domingo, dotación mínima lunes-jueves).
  3. Revisar nóminas familiares: que cada uno tenga puesto, descripción y dedicación auditables.
  4. Antes de cualquier ajuste, **definir nivel de servicio aceptable** (tiempo de espera máximo en barra/mesa).
- **Coste de implantar.** 5-10 k€ (consultor RRHH + análisis de cuadrantes). Indemnizaciones eventuales: pendiente de dimensionar.
- **Plazo.** Diagnóstico 60 días; reorganización 3-6 meses.

### H3. Existencias 33,5 días — exceso de 20-25 días sobre target

- **Qué pasa.** 54.199 € de existencias a 31/12/2024 con aprovisionamientos anuales de 571 k€ → 33,5 días de cobertura. En heladería el target debería ser **7-15 días** (producto perecedero; los frutos secos y el chocolate aguantan más, pero la leche/nata y las frutas no).
- **Evidencia.** Balance 31/12/2024: existencias 54.198,80 €. Aprovisionamientos 2024: 571.309 €. Cálculo de orquestador en `00-datos-extraidos.md` §2.
- **Por qué importa.**
  - Llevar el stock a 15 días = 23.500 € → libera **30.700 €** de circulante.
  - Llevar el stock a 10 días = 15.650 € → libera **38.550 €** de circulante.
  - **Rango: 30-40 k€ de tesorería liberada** (one-shot).
  - Además, reducción de mermas por caducidad: **estimación 3-8 k€/año** (no cuantificable sin medición previa).
  - Atención al cierre 31/12: ese stock puede estar **inflado contablemente** si no se hizo inventario físico real. Verificar con conteo.
- **Causa raíz probable.** Compras por lote grande para conseguir precio, sin tener en cuenta caducidad. Falta de coordinación entre locales (cada uno pide por su lado, sin central de compras).
- **Recomendación.** Inventario físico al cierre, política de pedido semanal con stock mínimo/máximo por referencia, central de compras grupal.
- **Coste de implantar.** < 2 k€ (procedimiento + plantilla Excel/software).
- **Plazo.** 60-90 días.

### H4. Demanda muy concentrada en fin de semana — riesgo de plantilla mal dimensionada

- **Qué pasa.** El TPV diario de ZigZag (febrero 2026) muestra una **dispersión radical** entre día laborable y fin de semana:

  | Día | n | Total mes | Media diaria |
  |---|---:|---:|---:|
  | Lunes | 4 | 2.580 € | **645 €** |
  | Martes | 4 | 2.760 € | **690 €** |
  | Miércoles | 4 | 3.270 € | **817 €** |
  | Jueves | 4 | 3.291 € | **823 €** |
  | Viernes | 4 | 7.938 € | **1.985 €** |
  | Sábado | 4 | 10.080 € | **2.520 €** |
  | Domingo | 4 | 9.687 € | **2.422 €** |

  - **Ratio sábado / martes = 3,6x**. En hostelería sana se mueve en 1,8-2,2x. ZigZag tiene una curva de demanda mucho más extrema que la media.
  - 10 días del mes facturaron < 800 € (los lunes y martes prácticamente todos).
  - 10 días superaron los 2.000 € (todos viernes, sábado y domingo, más festivo 21/02 = sábado de Carnaval).
- **Evidencia.** `zigzag-ventas-2026-02.csv`. Cálculo agregado por día de la semana.
- **Por qué importa.**
  - Si la plantilla es **plana** (mismo personal lunes a domingo), de lunes a jueves la productividad por hora-persona es la mitad o menos que el fin de semana → coste de personal viernes-domingo "razonable" pero **catastrófico lunes-jueves**.
  - Si la plantilla es **escalonada pero mal calibrada**, posible pérdida de venta los sábados por colas / mesas no atendidas.
  - Impacto: ya cuantificado dentro de H2.
- **Causa raíz probable.** ZigZag parece local de ocio de fin de semana (helado + mesas, 80,5% de venta es mesa). Plantilla mínima lunes-jueves podría ser 1 persona, sólo barra, sin servicio de mesa.
- **Recomendación.**
  1. Cruzar **horas trabajadas por día** (cuadrante real) con esta tabla → calcular **venta por hora trabajada** por día de la semana.
  2. Si la venta/hora cae por debajo de 25-30 €/h-trabajada en algún tramo, plantear cierre parcial (sólo barra, sin servicio mesas) o cierre total ese día.
  3. Evaluar **cierre lunes** (típico en hostelería): los 4 lunes de febrero acumularon 2.580 € (6,5% del mes). Si el coste de abrir es mayor, **el lunes resta**.
- **Coste de implantar.** Coste cero (decisión de dirección, requiere comunicación a plantilla y clientes).
- **Plazo.** Inmediato tras análisis de cuadrantes (1 mes).

### H5. Operativa sin documentar ni medir — riesgo estructural

- **Qué pasa.** No hay constancia de:
  - ERP, software de gestión integrado, ni TPV unificado entre locales.
  - Escandallos (ficha técnica de coste por producto).
  - Sistema de control de mermas.
  - Procedimientos APPCC documentados (obligación legal en hostelería; revisar urgente).
  - KPIs operativos sistematizados.
  - Responsable de operaciones identificado.
- **Evidencia.** Ausencia en `01-datos-entrada/operaciones/` (carpeta vacía o inexistente según orquestador).
- **Por qué importa.** Sin medición no hay gestión. Es la **causa raíz** detrás de H1, H2 y H3: si no se mide el food cost por sabor, no se puede atacar; si no se cruzan horas con ventas, no se puede dimensionar plantilla; si no se inventaría, no se controla stock. Coste de no-acción: **mantener la sangría de los 300-450 k€/año** identificada.
- **Riesgo de concentración.** Si la elaboración del helado depende de una sola persona (probablemente socio-fundador o maestro heladero único), **una baja médica de esa persona = paro de la producción**. Marcar como **riesgo crítico** hasta confirmar redundancia.
- **Recomendación.**
  1. Implantar TPV unificado con módulo de inventario (Glop, Camarero10, Lightspeed, Revel, Square: rango 60-200 €/local/mes).
  2. Escandallar el catálogo en 90 días.
  3. Documentar el proceso de elaboración del helado (formación cruzada de un segundo operario para romper la dependencia).
  4. APPCC actualizado y registros diarios de temperatura, limpieza, recepción.
- **Coste de implantar.** 10-20 k€ año 1 (sistema + consultor + formación).
- **Plazo.** 6-12 meses.

### H6. Salto de inmovilizado 2023 (+70 k€) — apertura de local probable

- **Qué pasa.** El inmovilizado material pasa de 26.576 € (2022) a 95.674 € (2023) y se mantiene 2024. La hipótesis razonable: **apertura de un nuevo local en 2023**, lo que explicaría el salto de ventas (449 k → 762 k → 1.207 k).
- **Evidencia.** Balance 2022-2024, `00-datos-extraidos.md` §2.
- **Por qué importa.** Confirmar si el local nuevo es **rentable a unidad**. Es posible que la apertura sea la que **arrastra el food cost y el personal hacia arriba** (estructura nueva infrautilizada). Si así fuera, el plan de acción debe priorizar maduración del local nuevo o, en escenario extremo, cierre.
- **Recomendación.** P&L por local. Si no hay contabilidad analítica, montarla con asignación directa (ventas TPV) + reparto razonable de fijos.
- **Coste.** 3-5 k€ (consultor + plantilla analítica + 2 meses de orden contable).
- **Plazo.** 90 días.

---

## 4. Quick wins (acciones < 3 meses, < 10 k€)

| # | Acción | Coste | Ahorro/impacto estimado | Plazo |
|---|---|---:|---|---|
| QW1 | Inventario físico a fecha cierre + control diario de cubetas tiradas (formulario papel) | < 500 € | 5-15 k€/año mermas evitadas + base para H1 | 30 días |
| QW2 | Escandallo de las 10 referencias top de cada local | 2-3 k€ | Identifica 30-60 k€/año de food cost atacable | 60 días |
| QW3 | Cruzar cuadrante de horas con ventas diarias (todos los locales) | < 1 k€ (interno) | Identifica 30-80 k€/año de personal redimensionable | 30 días |
| QW4 | Negociación anual con 3-5 proveedores principales (consolidar pedidos) | 0 | 2-5% sobre 571 k€ aprov. = 11-28 k€/año | 60 días |
| QW5 | Evaluar cierre lunes en ZigZag (y otros locales con perfil similar) | 0 | 8-15 k€/año (ahorro personal + suministros vs. venta perdida) | Inmediato |
| QW6 | Política de pedido semanal con mínimos/máximos por referencia | < 1 k€ | Libera 20-30 k€ de circulante | 60 días |
| QW7 | Documentar receta y formar a un segundo operario en elaboración | < 2 k€ | Elimina riesgo de concentración (no cuantificable, pero crítico) | 90 días |

**Total quick wins: < 10 k€ de coste, impacto orientativo 75-150 k€/año + 20-30 k€ tesorería liberada.**

---

## 5. Datos pendientes (lo que hace falta para cerrar el diagnóstico)

### Críticos (sin esto no se puede cuantificar nada con precisión)

| # | Dato | Para qué | Cómo conseguirlo |
|---|---|---|---|
| D1 | **Listado de locales** (nombre, dirección, m², aforo, fecha apertura) | Mapa de la operación | Listar con dirección y catastro |
| D2 | **Plantilla por local** (puesto, jornada, antigüedad, convenio) | Cuantificar exceso H2 | TC2 último trimestre + nóminas |
| D3 | **Cuadrante de horas trabajadas por día y persona** (último trimestre) | Cruzar con ventas TPV diarias | App fichaje (si existe) o cuadrantes papel |
| D4 | **Exportes TPV diarios de TODOS los locales** (último ejercicio completo) | P&L por local + estacionalidad real | TPV de cada local en mismo formato que ZigZag |
| D5 | **Escandallos actuales** (si existen) o **carta con PVP** | Calcular food cost teórico por producto | Carta + tarifa proveedores |
| D6 | **Listado de proveedores con volumen anual y plazo de pago** | Negociación + concentración | Mayor 600/602/607 desglosado por tercero 2024 |
| D7 | **Mermas medidas** (si se registran) | Cuantificar H1 con precisión | Bitácora de cocina/sala (probablemente no exista → empezar a medir) |
| D8 | **Inventario físico real a una fecha actual** | Validar las 54.199 € de balance | Conteo guiado in situ |

### Importantes (matizarán el diagnóstico)

| # | Dato | Para qué |
|---|---|---|
| D9 | Suministros (luz, agua, gas) detallados 2023-2024 | Coste energético; los abatidores de helado son muy intensivos |
| D10 | Contratos de alquiler de los locales (importes y vencimientos) | Coste fijo crítico |
| D11 | Equipamiento principal (mantecadora, pasteurizadora, vitrinas) — antigüedad y mantenimiento | OEE básico + plan de renovación |
| D12 | ¿Se vende por plataformas delivery (Glovo, Uber Eats, Just Eat)? Si sí, comisiones | Margen real vs. margen carta |
| D13 | ¿Producción centralizada o cada local elabora? | Define modelo logístico y permite plantear central |
| D14 | Identidad del maestro heladero / responsable de elaboración | Confirmar riesgo de concentración |
| D15 | Existencia y estado del APPCC | Riesgo sanitario y legal |
| D16 | Software de gestión / TPV unificado o por local | Define inversión en sistemas |

### Deseables (para refinamiento)

- D17. Histórico de ventas mensual de cada local desde apertura (ver estacionalidad y maduración).
- D18. Encuesta o medición de satisfacción / tiempos de espera.
- D19. Foto del catálogo (carta) y precios actuales vs. competencia local.

---

## 6. Notas finales

- **Distinción coste evitable vs. estructural.** De los 300-450 k€ teóricos identificados, una parte es **estructural** (locales pequeños con dotación mínima por norma sanitaria; convenio de hostelería; cumplimiento APPCC). Se estima de forma conservadora que **el 60-70% del gap es atacable a 18 meses** (180-315 k€/año) y el resto sólo se puede atacar replanteando el modelo de negocio (cierre local, fusión, central de producción), lo cual excede el horizonte del plan operativo y debe ser decisión de dirección.
- **Lo más rentable, lo más rápido.** El **food cost (H1)** es donde se puede recuperar más dinero más rápido, porque cada punto recuperado son 12.069 €/año. Empezar por aquí.
- **Lo más urgente en riesgo, no en €.** El **riesgo de concentración** del maestro heladero (H5) y el **APPCC** no actualizado son los puntos en los que un imprevisto puede parar la empresa. Atacar en paralelo, aunque no aporten ahorro directo.

---

*Fin del anexo operativo.*
