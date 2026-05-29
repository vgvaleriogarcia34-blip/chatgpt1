# Cuadro de mando · Snoopy Heladerías, S.L.

**Cliente:** Snoopy Heladerías, S.L. (CIF B05546601)
**Periodo de control:** ciclo anual jun-2026 → may-2027 (alineado con el plan de acción)
**Autor:** Analista KPI
**Fecha:** 2026-05-29
**Insumos:** `00-datos-extraidos.md`, `anexo-economico.md`, `anexo-financiero.md`, `anexo-comercial.md`, `anexo-operativo.md`, `plan-accion.md`
**Plantilla:** `plantillas/kpi-dashboard.md`

---

## Filosofía del cuadro

Pocos KPIs, bien elegidos. El dueño de Snoopy lo mira **desde el móvil el primer lunes de cada mes en 5 minutos**. Si no le cabe en una pantalla de móvil, sobra.

- **8 KPIs en el cuadro ejecutivo.** Ni uno más.
- **Cada KPI tiene dueño, objetivo cuantitativo y semáforo verde/ámbar/rojo.**
- **Cada KPI se traza a una acción del `plan-accion.md`.** Si baja, hay algo concreto que hacer.
- **Frecuencia honesta:** mensual sólo si el dato existe mensual; trimestral si depende del cierre contable.
- **Datos pendientes declarados.** Lo que aún no podemos medir lo decimos con plazo de captura.

> **Métrica única de éxito del año (la que manda sobre todas):** EBITDA mensualizado del grupo a 31-may-2027 ≥ 8% sobre ventas (≈ 100 k€ anualizado). Si en abril 2027 vamos por debajo del 5%, se activa plan correctivo extraordinario.

---

## 1. Cuadro de mando ejecutivo (lo que mira el empresario · 8 KPIs)

> Pensado para el socio-administrador. Una pantalla, semáforo a la vista, "qué hago" inmediato.

| # | KPI | Definición (1 frase) | Cálculo | Actual (línea base) | Objetivo año 1 (may-2027) | Frecuencia | Fuente del dato | Acción vinculada | Dueño | Estado |
|---|---|---|---|---:|---:|---|---|---|---|:---:|
| **E1** | **Ventas del mes y acumulado año** | Cifra de negocio neta total del grupo (todos los locales). | Σ ventas TPV de todos los locales − devoluciones. Mes natural. | 100.575 €/mes (2024 ÷ 12) · acumulado n/d | +5-10% interanual sin caer en margen | Mensual | Export TPV de cada local + cuadre asesor contable | A-06, A-11, A-12 | Administrador | 🟡 |
| **E2** | **Food cost %** | Coste de aprovisionamiento sobre ventas. Es el termómetro nº 1 del negocio. | (Compras del mes + variación de existencias) / Ventas netas del mes × 100 | **47,3%** (2024) | **≤ 38% may-2027** (banda intermedia hacia 35%) | Mensual | Mayor cuentas 600/602 (asesor) + recuento stock fin de mes | A-04, A-06, A-08 | Maestro heladero + administrador | 🔴 |
| **E3** | **Personal / Ventas %** | Coste total de personal sobre ventas. Mide si la plantilla está dimensionada. | (Sueldos + SS + autónomos socios) / Ventas netas × 100 | **52,2%** (2024) | **≤ 45% may-2027** (camino a 40% año 2) | Mensual | Coste personal del mes (asesor laboral) / ventas TPV | A-05 | Director operativo | 🔴 |
| **E4** | **EBITDA mensual y margen EBITDA %** | Resultado de explotación antes de amortización. Es lo que el negocio gana de verdad. | Ventas − aprovisionamientos − personal − otros gastos explotación (sin amortización ni financieros) | **3.920 € / año (0,3%)** en 2024 | **≥ 8% mensualizado** en cierre may-2027 | Mensual | PyG simplificada que prepara administrador con datos asesor | Todas las acciones tributan aquí | Administrador | 🔴 |
| **E5** | **Margen de seguridad sobre punto muerto %** | Cuánto pueden caer las ventas antes de entrar en pérdidas. | (Ventas reales − punto muerto) / Ventas reales × 100. Punto muerto = costes fijos / % margen contribución. | **0,7%** (2024) | **≥ 10%** | Mensual (acumulado 12 meses rolling) | Cálculo automático en hoja `_calculo` del Google Sheet | A-04, A-05, A-06 | Administrador | 🔴 |
| **E6** | **Caja disponible** | Tesorería en bancos + póliza no dispuesta. Lo que se puede pagar mañana. | Saldo bancos último día del mes + (límite póliza − dispuesto) | **26.609 € caja + 0 € póliza no dispuesta = 26.609 €** (cierre 2024) | **≥ 60.000 €** (≈ 1 mes de personal) | Mensual (idealmente quincenal) | Extracto bancario + posición póliza | A-07, A-08, A-14 | Administrador | 🔴 |
| **E7** | **Patrimonio neto (control art. 363 LSC)** | Fondos propios contables. Bajo el 50% del capital social → causa de disolución. | Capital + reservas + resultados ejercicios anteriores + resultado del ejercicio en curso (estimado mensual) | **5.156 €** (31-dic-2024) · umbral disolución = **1.500 €** (½ × 3.000 € capital) | **≥ 33.000 €** tras capitalización + resultado positivo año 1 | Mensual (estimación) + trimestral (cierre real) | Estimación interna + confirmación asesor en cierres trimestrales | A-01, A-02 | Administrador + asesor fiscal | 🔴 |
| **E8** | **% acciones del plan al día (verde)** | Cuántas de las 18 acciones del plan van según calendario. | (Nº acciones en verde) / 18 × 100 | n/a (plan arranca jun-2026) | **≥ 85%** verdes, **0** críticas en rojo | Mensual | Hoja maestra del plan que lleva la PMO interna | Todas | PMO / administrador | ⚪ (no iniciado) |

**Lectura de semáforos del ejecutivo:**

```
[E1] Ventas mes / acumulado
     Actual: 100.575 €/mes media 2024 · Acum. año: por arrancar
     Objetivo: +5-10% interanual sin perder margen
     Mensual · Dueño: Administrador · Fuente: TPV + cuadre asesor
     Acción: A-06 tarifa · A-11 entresemana · A-12 fidelización
     Estado: 🟡 ámbar (alto crecimiento histórico pero sin margen)

[E2] Food cost %
     Actual: 47,3% · Objetivo año 1: ≤ 38% · Estado: 🔴 rojo
     Mensual · Dueño: Maestro heladero + administrador
     Fuente: Mayor 600/602 + recuento stock
     Acción vinculada: A-04 (auditoría compras + escandallos + mermas) · A-06 (tarifa) · A-08 (stock)

[E3] Personal / Ventas %
     Actual: 52,2% · Objetivo año 1: ≤ 45% · Estado: 🔴 rojo
     Mensual · Dueño: Director operativo
     Fuente: Coste personal asesor / ventas TPV
     Acción vinculada: A-05 (rediseño de turnos por curva de demanda)

[E4] EBITDA y margen EBITDA
     Actual: 3.920 €/año (0,3%) · Objetivo año 1: ≥ 8% mensualizado · Estado: 🔴 rojo
     Mensual · Dueño: Administrador
     Fuente: PyG simplificada mensual
     Acción vinculada: todas; consolidación A-04 + A-05 + A-06

[E5] Margen de seguridad sobre punto muerto
     Actual: 0,7% · Objetivo año 1: ≥ 10% · Estado: 🔴 rojo
     Mensual rolling 12 meses · Dueño: Administrador
     Fuente: cálculo automático en hoja `_calculo`
     Acción vinculada: A-04, A-05, A-06

[E6] Caja disponible
     Actual: 26.609 € · Objetivo año 1: ≥ 60.000 € · Estado: 🔴 rojo
     Mensual (idealmente quincenal) · Dueño: Administrador
     Fuente: extracto bancario + posición póliza
     Acción vinculada: A-07 reestructuración · A-08 stock · A-14 tesorería

[E7] Patrimonio neto / art. 363 LSC
     Actual: 5.156 € (umbral 1.500 €) · Objetivo año 1: ≥ 33.000 € · Estado: 🔴 rojo
     Mensual estimación + trimestral real · Dueño: Administrador + asesor fiscal
     Acción vinculada: A-01 capitalización 30 k€ · A-02 mapping societario

[E8] % acciones del plan al día
     Actual: n/a (plan arranca jun-2026) · Objetivo: ≥ 85% verdes · Estado: ⚪ no iniciado
     Mensual · Dueño: PMO/administrador
     Fuente: hoja maestra del plan
     Acción vinculada: todas las 18 acciones
```

### Umbrales de semáforo del ejecutivo

| KPI | 🟢 Verde | 🟡 Ámbar | 🔴 Rojo |
|---|---|---|---|
| E1 Ventas (vs. mismo mes año anterior) | ≥ +3% | -2% a +3% | < -2% |
| E2 Food cost % | ≤ 38% | 38-43% | > 43% |
| E3 Personal / Ventas % | ≤ 45% | 45-50% | > 50% |
| E4 Margen EBITDA mensual | ≥ 6% | 2-6% | < 2% |
| E5 Margen seguridad punto muerto | ≥ 8% | 3-8% | < 3% |
| E6 Caja disponible | ≥ 60 k€ | 30-60 k€ | < 30 k€ |
| E7 Patrimonio neto | ≥ 20 k€ | 5-20 k€ | < 5 k€ |
| E8 % acciones verdes | ≥ 85% | 70-85% | < 70% |

---

## 2. Cuadros de mando por área

> Para los responsables de área, no para el dueño. Profundidad operativa.

### 2.1 Operativo (dueño funcional: maestro heladero + director operativo)

| KPI | Definición | Cálculo | Actual | Objetivo año 1 | Frecuencia | Fuente | Acción | Estado |
|---|---|---|---:|---:|---|---|---|:---:|
| O1 Food cost % por local | Mismo cálculo que E2 desagregado por local | Compras imputables + Δ stock / Ventas TPV por local | n/d (no hay asignación) | ≤ 38% en cada local | Mensual (desde T2) | A-15 P&L por local | A-04, A-15 | 🟡 |
| O2 Días de stock | Cuánto stock hay en almacén / consumo diario medio | (Existencias fin mes / Aprov. del mes) × 30 | **33,5 días** (2024) | **≤ 15 días** dic-2026 | Mensual | Recuento + mayor 600 | A-08 | 🔴 |
| O3 € mermas registradas / mes | Producto tirado, caducado, autoconsumo, invitaciones | Suma bitácora de mermas (papel o TPV) × coste unitario | n/d (no se mide) | Capturar dato + ≤ 2% sobre ventas | Mensual desde jul-2026 | Bitácora mermas (A-04) | A-04 | 🔴 (pendiente capturar) |
| O4 Horas trabajadas / 100 € de venta | Productividad del personal en horas | Σ horas cuadrante mes / (Ventas mes / 100) | n/d | Bajar 15% vs. línea base que se capture en jun-2026 | Mensual | Cuadrantes (D-03) + TPV | A-05 | 🔴 (pendiente capturar) |
| O5 Ratio venta finde / venta L-J | Pico de concentración semanal (sirve para dimensionar plantilla) | Ventas vie-dom / Ventas lun-jue | **3,1x** (ZigZag feb-2026) | Bajar a ≤ 2,2x activando entresemana | Mensual | TPV diario | A-05, A-11 | 🟡 |
| O6 Receta documentada + 2º operario formado | Riesgo de concentración en el maestro | Binario: sí / no | **No** | **Sí** antes 31-ago-2026 | Trimestral | Auditoría interna | A-09 | 🔴 |
| O7 APPCC actualizado y registros al día | Cumplimiento sanitario en todos los locales | Binario por local: sí / no | **No** (no consta) | **Sí** en 100% locales antes 31-jul-2026 | Trimestral | Auditoría asesor sanitario | A-10 | 🔴 |

### 2.2 Comercial (dueño funcional: responsable comercial + encargados)

| KPI | Definición | Cálculo | Actual | Objetivo año 1 | Frecuencia | Fuente | Acción | Estado |
|---|---|---|---:|---:|---|---|---|:---:|
| C1 Ticket medio por local | € medio por transacción | Ventas mes / nº tickets mes | n/d (sólo ZigZag agregado, falta nº tickets) | Capturar línea base + +5% acumulado | Mensual desde jul-2026 | TPV (D-04) | A-06, A-12 | 🔴 (pendiente capturar) |
| C2 Nº tickets por local | Volumen de transacciones | Conteo TPV | n/d | +5-10% vs. línea base | Mensual desde jul-2026 | TPV | A-11, A-12, A-17 | 🔴 (pendiente capturar) |
| C3 % mix barra vs. mesas | Reparto de la venta entre canal barra y mesa | Ventas barra / Ventas totales | **19,5%** (ZigZag feb-2026) | **≥ 28%** en ZigZag a feb-2027 | Mensual | TPV con desglose canal | A-13 | 🟡 |
| C4 % venta entresemana L-J | Peso del entresemana sobre el total del mes | Ventas lun-jue / Ventas mes | **39%** (ZigZag feb-2026, derivado de ratio 3,1x) | **≥ 50%** | Mensual | TPV diario | A-11 | 🟡 |
| C5 Nº clientes en programa fidelización | Cuántos clientes están en el club / app | Conteo en plataforma fidelización | **0** | ≥ 1.500 al cierre del año | Mensual desde dic-2026 | App / tarjeta sello | A-12 | ⚪ |
| C6 Variación de tarifa media aplicada | % subida real efectiva sobre tarifa anterior | Ticket medio post-subida / ticket medio pre-subida | 0% | +5-8% efectivo año 1 | Trimestral | TPV antes/después | A-06 | 🟡 |
| C7 Ventas delivery (€/mes) | Ingreso del canal delivery (Glovo/UberEats) | Liquidaciones plataforma | **0 €** | ≥ 12 k€ año 1 (piloto + escalado) | Mensual desde feb-2027 | Plataforma delivery | A-17 | ⚪ |
| C8 Eventos B2B cerrados (nº y €) | Volumen de eventos cerrados (cumples, catering, B2B) | Conteo y € en TPV / facturación | 0 | ≥ 10 k€ año 1 | Mensual desde mar-2027 | Facturación interna | A-18 | ⚪ |

### 2.3 Económico (dueño funcional: administrador + asesor contable)

| KPI | Definición | Cálculo | Actual | Objetivo año 1 | Frecuencia | Fuente | Acción | Estado |
|---|---|---|---:|---:|---|---|---|:---:|
| EC1 Margen bruto % | Margen tras aprovisionamientos | (Ventas − Aprov.) / Ventas × 100 | **52,7%** (2024) | **≥ 62%** may-2027 (recuperar nivel 2022) | Mensual | PyG mensual | A-04, A-06 | 🔴 |
| EC2 Margen contribución % grupo | Margen tras costes variables (aprox = margen bruto) | Idéntico a EC1 hasta separar variables del personal | 52,7% | ≥ 62% | Trimestral | PyG | A-04, A-05, A-06 | 🔴 |
| EC3 Otros gastos / Ventas % | Peso de alquileres, suministros, marketing | Otros gastos explotación / Ventas × 100 | n/d desglose (~7% en 2022-2023) | ≤ 8% | Trimestral | PyG con desglose 62x/63x | A-03 (datos), A-15 | 🟡 (pendiente desglose) |
| EC4 EBITDA por local | Resultado por local antes de amortización | PyG analítica por local (A-15) | n/d | Cada local ≥ 0 € a may-2027 | Trimestral desde T3 | P&L analítico A-15 | A-15 | 🔴 (pendiente capturar) |
| EC5 Margen sobre tarifa nueva (familias revisadas) | Efecto en margen de la subida selectiva A-06 | Margen € antes/después por familia | 0 (sin subida) | +35 k€ acumulado año 1 | Mensual desde jul-2026 | TPV + escandallo | A-06 | 🟡 |
| EC6 ABC productos (peso top 20%) | Concentración de las ventas en las referencias estrella | Σ ventas top 20% SKU / ventas totales | n/d | Capturar línea base + medir rotación | Trimestral desde T2 | TPV con desglose SKU | A-04 | 🔴 (pendiente capturar) |

### 2.4 Financiero (dueño funcional: administrador + asesoría financiera)

| KPI | Definición | Cálculo | Actual | Objetivo año 1 | Frecuencia | Fuente | Acción | Estado |
|---|---|---|---:|---:|---|---|---|:---:|
| F1 Liquidez (AC/PC) | Activo corriente / Pasivo corriente | Balance | **0,57** (2024) | **≥ 1,00** may-2027 | Trimestral | Balance trimestral asesor | A-07, A-08 | 🔴 |
| F2 Caja + póliza no dispuesta | Liquidez total disponible | Saldo bancos + límite póliza no dispuesto | **26.609 €** | ≥ 60.000 € | Mensual (quincenal ideal) | Extracto + posición banca | A-07, A-08, A-14 | 🔴 |
| F3 Deuda financiera / EBITDA | Capacidad de repago de la deuda | (Deuda CP + Deuda LP) / EBITDA 12m rolling | **17,4x** (con EBIT 2024) | **≤ 5x** | Trimestral | Balance + PyG rolling | A-04, A-05, A-07 | 🔴 |
| F4 PMP proveedores (días) | Plazo medio que tardamos en pagar proveedores | (Proveedores / Aprovisionamientos) × 365 | **32,9 días** (2024) | 30-45 días (mantener, no estirar más) | Trimestral | Balance | A-04 | 🟢 |
| F5 % póliza dispuesta | Cuánto de la línea de crédito está consumida | Dispuesto / Límite × 100 | **100%** (2022-2024) | ≤ 50% may-2027 | Mensual | Posición banca | A-07 | 🔴 |
| F6 Patrimonio neto / Activo % | Solvencia / autonomía financiera | PN / Activo total × 100 | **2,9%** (2024) | **≥ 20%** | Trimestral | Balance | A-01, A-02 | 🔴 |
| F7 Cuadro de tesorería rolling 12 meses operativo | Si hay o no proyección de caja activa | Binario: hay / no hay | **No** | **Sí** desde 15-jul-2026, revisión quincenal | Mensual | Hoja `tesoreria_12m` | A-14 | 🔴 |

### 2.5 Societario / Gobernanza (revisión trimestral o anual, no mensual)

| KPI | Definición | Cálculo | Actual | Objetivo año 1 | Frecuencia | Fuente | Acción | Estado |
|---|---|---|---:|---:|---|---|---|:---:|
| G1 Mapping societario completo | Nota simple + listado socios + escrituras + préstamos socio-sociedad cerrados | Binario | **No** | **Sí** antes 30-jun-2026 | Anual | Asesoría jurídica | A-02 | 🔴 |
| G2 Capitalización ejecutada | Aportación 30 k€ ingresada (cuenta 118 o ampliación) | Binario + €/% PN | **No** (0 €) | **Sí** antes 31-jul-2026 | Trimestral | Balance + escritura | A-01 | 🔴 |
| G3 Comité de seguimiento mensual activo | El comité del primer lunes se está celebrando con asistencia completa | Conteo asistencia mes / asistencia obligada | n/a | 100% asistencia, todos los meses | Mensual | Acta del comité | Todas | ⚪ |
| G4 Próxima revisión integral del plan | Si la revisión 30-nov-2026 y 31-mar-2027 se han producido y han generado decisiones | Binario | n/a | Sí en ambas fechas | Semestral | Acta de revisión | Todas | ⚪ |

---

## 3. KPIs de seguimiento del plan de acción

> El cuadro que mide si el plan está vivo o muerto. Es competencia de la PMO interna (administrador o mando dedicado al 30%).

| KPI | Definición | Cálculo | Objetivo | Frecuencia | Fuente |
|---|---|---|---|---|---|
| **P1 % acciones lanzadas vs. planificadas en ese trimestre** | Cuántas acciones del T-actual están al menos iniciadas | Nº acciones T iniciadas / Nº acciones T planificadas × 100 | **100%** al cierre del trimestre | Mensual | Hoja maestra del plan |
| **P2 % acciones en verde** | Cuántas van según calendario y alcance | Nº acciones verdes / Nº acciones totales × 100 | **≥ 85%** | Mensual | Hoja maestra |
| **P3 € invertido vs. presupuestado** | Disciplina de gasto | Σ € realmente gastados / Σ € presupuestados año 1 | **±10%** (no más, no menos del 90%) | Mensual | Mayor de gastos + comparación con presupuesto 44,9 k€ |
| **P4 € impacto realizado vs. esperado** | Si el dinero prometido por el plan llega a P&L | Σ ahorro o ingreso medido en P&L atribuible a acciones / Σ impacto esperado año 1 (193 k€) | **≥ 80%** | Trimestral | PyG mensual + cuaderno de impactos por acción |
| **P5 Nº acciones bloqueadas o en rojo** | Acciones que han parado o se han desviado de calendario en más de 30 días | Conteo | **0** críticas (A-01, A-04, A-05, A-06, A-07); ≤ 3 totales | Mensual | Hoja maestra |
| **P6 Datos pendientes desbloqueados** | Cuántos datos de la lista D-01 a D-07 se han recibido y cargado | Nº datos recibidos / 7 × 100 | **100% antes 31-jul-2026** | Mensual hasta cierre | Hoja `_pendientes` |
| **P7 Asistencia comité mensual** | Cuántos asistentes obligados asistieron a los comités del trimestre | Asistencia real / asistencia obligada × 100 | **≥ 90%** | Trimestral | Actas |

### Cuaderno de impactos (cómo se calcula P4)

Por acción, una fila con:
- Impacto esperado año 1 (del plan)
- Mes de inicio del impacto (cuándo empieza a tributar en P&L)
- Mes de medición real
- € medido en P&L (vs. línea base previa a la acción)
- % captura = € medido / € esperado prorrateado al mes

Ejemplo de filas año 1:

| Acción | Impacto esperado año 1 € | Empieza a aparecer en P&L | Cómo se mide | Captura objetivo a cierre may-2027 |
|---|---:|---|---|---:|
| A-04 Auditoría compras + mermas | 75.000 | T2 (sep-2026) parcial; pleno T3 | Δ food cost % × ventas | ≥ 80% (60 k€) |
| A-05 Rediseño turnos | 55.000 | T2 (nov-2026) | Δ personal/ventas × ventas | ≥ 80% (44 k€) |
| A-06 Revisión tarifa | 35.000 | T1 (jul-2026) | Δ ticket medio × nº tickets | ≥ 90% (32 k€) |
| A-07 Reestructuración bancaria | 30.000 caja + 1.500 €/año | T1-T2 | Δ póliza dispuesta + Δ intereses | 100% (30 k€) |
| A-08 Stock 33 → 15 días | 25.000 caja + 4.000 mermas | T2-T3 | Δ existencias balance | ≥ 80% (23 k€) |
| A-11 Activación entresemana | 18.000 | T2 (sep-2026) | Δ ventas L-J vs. línea base | ≥ 70% (12,5 k€) |
| A-12 Fidelización | 15.000 | T3 (dic-2026) | Δ frecuencia visita × ticket | ≥ 60% (9 k€) |
| A-13 Mix barra ZigZag | 5.000 | T3 (dic-2026) | Δ % barra × margen | ≥ 80% (4 k€) |
| A-14 Tesorería rolling | 10.000 caja preservada | T1 (jul-2026) | Falta de descubierto / fees evitados | n/m cualitativo |
| A-16 TPV unificado | 8.000 | T3-T4 | Δ mermas detectadas | ≥ 50% (4 k€) |
| A-17 Delivery | 12.000 | T3 (ene-2027) | Liquidaciones plataforma | ≥ 60% (7 k€) |
| A-18 B2B eventos | 10.000 | T4 (mar-2027) | Facturación canal B2B | ≥ 50% (5 k€) |
| **Total** | **193.000 + 10.000 cualitativo** | | | **≥ 80% (≈ 154 k€)** |

---

## 4. Definiciones y reglas (una sola interpretación posible)

> Para cada KPI no obvio, una definición breve. Si dos personas calculan diferente, el KPI sobra.

- **Ventas netas (E1, EC1, F4…):** importe neto de la cifra de negocios de TPV de todos los locales en el mes natural, descontando devoluciones, anulaciones y rectificativas. **No** incluye IVA. **No** incluye albaranes B2B no facturados hasta que se facturan. Cuadre obligatorio: total Sheet vs. total libro de IVA del asesor (tolerancia ±0,5%).
- **Food cost % (E2, O1):** (Compras del mes en mayor 600/602 + (Existencias inicio mes − Existencias fin mes)) / Ventas netas × 100. Si no hay recuento de stock mensual, usar variación promedio. **Si el dato real sólo se cierra en el cierre trimestral, marcarlo "estimado" hasta entonces y rectificar en color distinto.**
- **Personal / Ventas % (E3):** (Sueldos y salarios + Seguridad Social a cargo empresa + cuotas autónomas de socios + indemnizaciones + dietas) / Ventas netas × 100. **No incluye**: provisiones, retroactivos extraordinarios. Sí incluye: pagas extra prorrateadas mes a mes (no concentradas en jun/dic, lo que descuadraría el KPI mensual).
- **EBITDA mensual (E4):** Ventas netas − Aprovisionamientos − Personal − Otros gastos de explotación. **Excluye**: amortización, deterioros, resultado financiero, impuesto sobre sociedades, extraordinarios. **Excluye también**: ingresos no recurrentes (subvenciones, indemnizaciones cobradas) → se contabilizan aparte como "EBITDA limpio". El indicador a semaforizar es el EBITDA limpio.
- **Margen de seguridad sobre punto muerto (E5):** (Ventas 12m rolling − Punto muerto 12m) / Ventas 12m × 100. Punto muerto = (Personal + Otros gastos explotación) / % margen contribución. **% margen contribución** se aproxima al margen bruto hasta que A-15 permita separar variables del personal. Recalcular el punto muerto cada cierre trimestral, no mensualmente (la estructura de costes no cambia mes a mes).
- **Caja disponible (E6, F2):** saldo en cuentas bancarias el último día del mes (todos los bancos) + (límite total de pólizas − dispuesto en pólizas el último día). **No** se cuenta efectivo en caja de los locales (se asume saldo de cuadre del día siguiente). **No** se cuenta tarjeta de crédito personal del socio (no es caja de la empresa).
- **Patrimonio neto (E7, F6):** Capital social + Reservas + Resultados ejercicios anteriores + Resultado del ejercicio en curso (estimado). El **resultado en curso** se estima mensualmente con la PyG del mes; se confirma trimestralmente con asesor. **Umbral crítico art. 363 LSC**: PN < ½ × Capital social = PN < 1.500 €.
- **% acciones del plan al día (E8, P2):** una acción está en **verde** si está dentro de calendario y dentro de alcance (no se ha redefinido el entregable); **ámbar** si lleva 1-30 días de retraso o se ha replanteado parcialmente; **rojo** si lleva más de 30 días de retraso, está bloqueada o se ha abandonado. La PMO marca el color en la hoja maestra antes del primer lunes del mes siguiente.
- **Días de stock (O2):** Existencias fin de mes / (Aprovisionamientos del mes / 30). Si el mes tiene muy poco aprovisionamiento (vacaciones agosto, por ejemplo), usar media de los 3 últimos meses como denominador.
- **Ticket medio (C1):** Ventas brutas mes / Nº tickets emitidos mes. **Excluir** tickets de 0 € (anulaciones), albaranes B2B y tickets de regalo / cortesía.
- **% mix barra (C3):** Ventas asignadas a canal "Barra" en TPV / Ventas totales TPV del mes. Requiere que el TPV tenga configurada la separación barra/mesas (ZigZag ya la tiene; resto pendiente).
- **Impacto realizado (P4):** € atribuible a una acción tienen que ser medidos contra **línea base previa** de mismo mes año anterior, no contra el resultado del mes anterior (evita falsos positivos por estacionalidad). Si no hay año anterior comparable (acciones nuevas como A-17 delivery, A-18 B2B), se mide en términos absolutos del propio canal.

---

## 5. Cómo alimentar el cuadro de mando cada mes

> Pensado para una pyme con asesor contable externo y TPV no integrado. Si esto no funciona, el resto sobra.

### 5.1 Calendario mensual fijo

| Día | Quién | Qué hace |
|---|---|---|
| **Día 1-2** del mes siguiente | Encargado de cada local | Exporta del TPV el resumen mensual (ventas totales, nº tickets, barra/mesas, ventas diarias). Lo deja en carpeta `Drive/snoopy/cuadro/<mes>/<local>/`. |
| **Día 1-2** | Encargado de cada local | Hace **recuento de existencias** físico el último día del mes. Lo anota en `_stock` del Google Sheet. |
| **Día 3-5** | Administrador (PMO) | Pega los valores de TPV en pestaña `_datos_ventas`. Hace recuento global del stock. Pasa al asesor contable el correo de "petición mensual" (plantilla fija): mayor 600/602 + ventas 700 + coste personal + saldo bancos + posición póliza. |
| **Día 6-8** | Asesor contable | Devuelve: mayor mensual cuentas 600/602/700, suma de coste personal del mes, saldos bancarios y posición de póliza. **Es la entrada del KPI E2, E3, E4, E6.** |
| **Día 8-9** | Administrador (PMO) | Pega lo del asesor en pestaña `_datos_contabilidad`. La hoja `_calculo` actualiza automáticamente todos los KPIs y semáforos del ejecutivo y por áreas. |
| **Día 10** | Administrador + responsable comercial + maestro heladero + asesor (online 30 min) | **Comité de seguimiento** del primer lunes (orden del día fijo definido en el plan, sección Gobernanza). Revisión de E1-E8, semáforos y acciones del plan. Decisiones. Acta de 1 página. |
| **Día 15** (cierre trimestral, marzo/junio/sept/dic) | Asesor contable | Cierre trimestral oficial con PyG y balance. Recalcular F1, F3, F6, EC2 y EBITDA "limpio" trimestral. |

### 5.2 Estructura del Google Sheet maestro

Pestañas:
1. `_dashboard_ejecutivo` — los 8 KPIs del cuadro ejecutivo con semáforo. Es la pantalla que mira el dueño desde el móvil.
2. `_dashboard_operativo`, `_dashboard_comercial`, `_dashboard_economico`, `_dashboard_financiero` — uno por área.
3. `_datos_ventas` — pegado mensual de TPV (12 meses rolling).
4. `_datos_contabilidad` — pegado mensual del asesor.
5. `_stock` — recuentos físicos mensuales.
6. `_calculo` — todas las fórmulas. Ninguna persona toca esta pestaña sin avisar a la PMO.
7. `_plan_maestro` — las 18 acciones con responsable, fecha, semáforo, €. Alimenta P1-P7.
8. `_pendientes` — los datos D-01 a D-07 y los KPIs en "🔴 pendiente capturar".
9. `_actas` — actas de los comités mensuales (texto, 1 página por mes).

### 5.3 Herramienta recomendada

**Google Sheets compartido** con permisos: lectura para todos los socios y mandos; edición para administrador + asesor contable. Acceso desde móvil del dueño vía app Google Sheets.

**Justificación en una línea:** coste cero, sin curva de aprendizaje, edición concurrente con el asesor contable externo, accesible desde móvil — cubre el 100% del caso de uso de una empresa con 1,2 M€ facturación y sin ERP integrado. Migrar a Power BI / Looker Studio sólo cuando A-16 (TPV unificado) esté en producción y exista una API a la que conectar.

**Plantilla inicial**: a entregar por la consultora al cierre del informe ejecutivo (1 fichero `.gsheet` listo para copiar y rellenar). Coste: 0 € (incluido en honorarios del proyecto).

---

## 6. KPIs con dato pendiente de capturar

> Indicadores que sabemos que son importantes pero que **hoy no se pueden medir** porque falta dato o sistema. Cada uno con plan de captura.

| KPI | Por qué no se mide hoy | Cómo lo capturamos | Plazo (hito hard) | Responsable |
|---|---|---|---|---|
| **EC4 EBITDA por local** | No hay contabilidad analítica por local; el asesor lleva PyG consolidada del grupo. | Acción **A-15**: asignar ventas (TPV por local) y costes directos (alquileres, suministros, personal por local); reparto razonable de fijos comunes. Plantilla Excel + 2 meses orden con asesor. | Primer cierre por local correspondiente a **octubre 2026, entregado antes 30-nov-2026**. | Administrador + asesor contable |
| **O1 Food cost por local** | Mismo motivo que EC4 + las compras se contabilizan agregadas, no por local. | Que cada local marque cada albarán de proveedor con el código del local (sticker / app); el asesor codifica las cuentas 600/602 por subcuenta-local. | **30-sep-2026** primera lectura mensual fiable. | Administrador + asesor |
| **O3 € mermas / mes** | No existe bitácora de mermas en los locales. Ahora mismo el helado tirado o el café que se cae **no se registra**. | Bitácora papel inicial (A-04 piloto rápido): cuaderno A5 en cada local; el encargado anota merma diaria (qué, cuánto, motivo). Coste 0 €. Migración a TPV unificado con A-16 cuando esté. | **Bitácora papel operativa antes 15-jul-2026**. Primera medición mensual **31-jul-2026**. | Encargado de cada local + maestro heladero |
| **O4 Horas trabajadas / 100 € venta** | Hay cuadrante en cada local pero no centralizado ni cruzado con ventas. | Plantilla Excel cuadrante (D-03) por local con horas semanales; cruce con ventas TPV diarias. | **31-jul-2026** primera lectura grupo. | Director operativo + asesor laboral |
| **C1 Ticket medio por local** | El TPV los emite pero no se está extrayendo el dato de "nº de tickets emitidos". | Añadir línea "nº tickets" al export mensual de TPV. Es un dato que el TPV ya tiene; solo hay que exportarlo. | **30-jun-2026** primer mes con dato. | Encargado de cada local |
| **C2 Nº tickets / mes** | Idem C1. | Idem C1. | **30-jun-2026**. | Encargado de cada local |
| **EC6 ABC productos top 20%** | No hay export por SKU del TPV consolidado del grupo. | Export TPV por SKU (sabores, café, repostería) del año cerrado 2025. Análisis de Pareto en Sheet. | **31-jul-2026** primer ABC (con 2024-2025); refresco trimestral. | Maestro heladero + administrador |
| **EC3 Otros gastos / Ventas con desglose** | El bloque "Otros gastos explotación" no aparece desglosado en cuentas 2024 (mostraba ~1.500 € neto, anormalmente bajo). | Petición A-03 al asesor: mayor de cuentas 62x y 63x del 2024 y 2025. | **15-jun-2026** (con la entrega A-03). | Administrador + asesor contable |
| **F3 Deuda fin. / EBITDA real** | Hoy se calcula con EBIT (no hay amortización visible). Necesita EBITDA "limpio" con amortización confirmada (cuenta 681). | Pedir mayor cuenta 681 al asesor con A-03. | **15-jun-2026**. | Asesor contable |

**Regla de oro:** ningún KPI puede quedar marcado "🔴 pendiente capturar" más de 90 días. A los 60 días el comité de seguimiento eleva la alerta al sponsor. A los 90 días el sponsor decide: o se cambia el responsable / proveedor de datos, o se elimina el KPI del cuadro (no se deja "podrido" en gris).

---

## 7. Lo que el cuadro NO mide (y por qué está bien que no lo haga)

Por **disciplina anti-decoración**:

- **NPS, satisfacción de cliente, encuestas:** no hay sistema, no hay cliente recurrente identificado, sería una métrica sin denominador. Cuando A-12 (fidelización) esté activa, se podrá medir % de bajas en el club (proxy de satisfacción).
- **Productividad por empleado individual:** se podría calcular con A-15 + A-16 pero abrir esa caja sin preparación interna genera más conflicto que valor.
- **Engagement en redes sociales, alcance de campañas:** vanidad métrica. Sólo se mide si una campaña concreta tiene un objetivo de € atribuible.
- **EBITDA ajustado por extraordinarios "creativos":** un solo EBITDA limpio. Sin trucos.
- **Cuadro diario:** no hay capacidad humana para llevarlo. Mensual es el ritmo realista. Quincenal sólo para caja (E6/F2).

---

## 8. Riesgos del cuadro de mando

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| El asesor contable no entrega el dato del día 6-8 → el comité del día 10 va sin datos | Media | Plantilla de petición estándar enviada el día 3; escalado al sponsor el día 7 si no hay respuesta |
| El recuento de stock no se hace o se hace mal → food cost mensual irreal | Alta | Foto del recuento subida a Drive; auditoría trimestral por sorpresa del maestro a un local |
| El dueño deja de mirar el cuadro tras 2 meses | Alta | Comité físico/telco mensual obligatorio con orden del día fijo; si falla 2 meses seguidos, alerta al sponsor consultor |
| Se inflan los KPIs P2/P5 (acciones en verde) para "quedar bien" | Media | Revisión cruzada en comité trimestral con consultora externa; criterios objetivos verde/ámbar/rojo escritos |
| El TPV de algún local no exporta en formato compatible | Media | Plantilla manual en `_datos_ventas` como fallback; A-16 resuelve estructuralmente |

---

*Fin del cuadro de mando · Snoopy Heladerías, S.L.*
