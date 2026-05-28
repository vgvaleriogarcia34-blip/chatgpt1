# Anexo financiero · Snoopy Heladerías, S.L.

**CIF:** B05546601
**Fecha de análisis:** 2026-05-28
**Analista:** Analista Financiero Senior
**Fuentes:** `02-analisis/00-datos-extraidos.md`; `01-datos-entrada/contabilidad/balance-historico-snoopy-heladerias.pdf`; `01-datos-entrada/contabilidad/pyg-historico-snoopy-heladerias.pdf`.

---

## 1. Resumen ejecutivo

**Salud financiera global: ROJO.** La empresa crece a doble dígito pero camina sobre una capa de hielo: patrimonio neto del 2,9% del activo, liquidez de 0,57 y póliza al 100% dispuesta los tres últimos años. Sobrevive porque el ciclo de cobro de heladería es contado (cobra al instante) y porque el socio o algún acreedor está aguantando deuda crónica.

| Área | Estado |
|---|---|
| Solvencia / patrimonio neto | ROJO |
| Liquidez | ROJO |
| Calidad de la deuda | ROJO |
| Working capital operativo | ÁMBAR |
| Riesgo fiscal / SS (otros acreedores) | ÁMBAR (pendiente desglose) |
| Caja proyectada con crecimiento +50% | ROJO |

**Top hallazgos con € de impacto:**

1. **Art. 363 LSC en zona de peligro inminente.** PN 2024 = 5.156 € sobre capital 3.000 €. Una pérdida superior a 3.656 € en 2025 mete a la sociedad en **causa de disolución** (responsabilidad solidaria de administradores por deudas posteriores). Aporte mínimo recomendado para zona segura: **30.000 €**.
2. **Póliza de 38.250 € permanentemente dispuesta** = financiación de circulante a corto plazo. Reestructurar a préstamo LP 4-5 años libera **~38 k€ de liquidez inmediata** y reduce coste financiero estimado en **2-3 k€/año**.
3. **Tesorería 26.609 € frente a 139.582 € a pagar a corto** → gap de **112.973 €** que sólo se cierra cobrando ventas del día a día. Cualquier semana mala genera tensión real.
4. **Inversión 2023 de +70 k€ en inmovilizado financiada con sólo 30 k€ a LP**, el resto (~40 k€) sale del circulante. Activo fijo mal financiado → es la raíz de la tensión de liquidez actual.
5. **"Otros acreedores" 49.850 € sin desglose**, probablemente IVA + IRPF + SS. Si hay aplazamientos con Hacienda/SS, hay recargos del 5-20% en curso (~**2,5-10 k€** de coste adicional latente) y riesgo de embargo de cuentas.

---

## 2. Foto financiera actual

### 2.1 Balance resumido 2022-2024

| Concepto | 2022 | 2023 | 2024 | Δ24/22 |
|---|---:|---:|---:|---:|
| Activo no corriente | 26.576 | 95.674 | 95.674 | +260% |
| Activo corriente | 106.941 | 100.036 | 79.064 | -26% |
| — Existencias | 23.748 | 33.948 | 54.199 | +128% |
| — Deudores | 81.243 | 61.372 | -1.743 | n/a |
| — Tesorería | 1.949 | 4.715 | 26.609 | +1.265% |
| **TOTAL ACTIVO** | **133.516** | **195.710** | **174.738** | +31% |
| Patrimonio neto | 2.488 | 1.880 | 5.156 | +107% |
| Pasivo no corriente | 0 | 30.000 | 30.000 | n/a |
| Pasivo corriente | 131.028 | 163.830 | 139.582 | +7% |
| — Deudas CP entidades crédito | 38.250 | 38.250 | 38.250 | 0% |
| — Proveedores | 1.063 | 51.482 | 51.482 | +4.745% |
| — Otros acreedores | 91.715 | 74.097 | 49.850 | -46% |

**Lecturas:**
- El activo total ha crecido 31% mientras las ventas han subido 169%. **El balance no acompaña al crecimiento** del negocio (señal positiva de rotación, señal negativa de capitalización).
- Inversión en local 2023 (+69 k€ en inmovilizado material) financiada con sólo 30 k€ a LP. Los otros 39 k€ se "tomaron prestados" del circulante → es el origen estructural de la tensión.
- Tesorería 2024 (26.609 €) ha mejorado, pero sigue por debajo de la prudencia (1 mes de personal = ~52 k€).

### 2.2 Ratios clave

| Ratio | 2022 | 2023 | 2024 | Referencia sana |
|---|---:|---:|---:|---|
| **Solvencia** (FFPP / Activo) | 1,9% | 1,0% | 2,9% | >20% |
| **Liquidez general** (AC / PC) | 0,82 | 0,61 | 0,57 | >1,2 |
| **Liquidez inmediata** (Tes. / PC) | 0,015 | 0,029 | 0,191 | >0,2 |
| **Endeudamiento** (Pas. tot. / PN) | 52,7x | 103,1x | 32,9x | <2x |
| **Deuda financiera / EBITDA** | n/m | n/m | 17,4x* | <3,5x |
| **Cobertura intereses (EBIT/Fin.)** | n/a | n/a | 6,1x | >3x |

*Calculado con deuda financiera 68.250 € / EBIT 3.920 € (no hay amortización visible en P&L). El ratio real con EBITDA seguramente es mejor pero sigue muy alto.

**Lectura crítica:** la solvencia del 2,9% deja a la empresa **fuera del rating de cualquier banco** para nueva financiación sin avales personales reforzados. La liquidez de 0,57 implica que hay 1 € de deuda corta por cada 0,57 € disponible para pagarla.

### 2.3 Working capital (NOF y períodos medios)

| Magnitud | 2022 | 2023 | 2024 |
|---|---:|---:|---:|
| Días stock (Existencias / Aprov. × 365) | 49,7 | 39,7 | 33,5 |
| PMC clientes (Deudores / Ventas × 365) | 66,0 | 29,4 | n/a (negativo) |
| PMP proveedores (Provee. / Aprov. × 365) | 2,2 | 60,3 | 32,9 |
| NOF (Existencias + Deud. – Provee.) | 103.928 | 43.838 | 974 |

**Lecturas:**
- **PMC 2024 negativo** (-1.743 € de deudores): la empresa **cobra antes de prestar el servicio** (TPV instantáneo + anticipos de clientes/catering). Es **una ventaja competitiva** en heladería que hay que proteger.
- **Días stock 33,5 sigue alto** para producto perecedero. Reducir a 15-20 días libera **~22-28 k€ de caja** (54.199 × (1 - 18/33,5)). Si parte del stock es obsoleto (sabores que no rotan, packaging viejo), hay que provisionarlo o liquidarlo.
- **PMP 33 días es razonable** y similar al estándar del sector. El salto 2022→2023 (2 → 60 días) refleja probablemente la apertura de local y la negociación de aplazamientos.
- **NOF 2024 prácticamente cero** (974 €) → el negocio operativo no consume caja, pero no la genera tampoco. La empresa autofinancia su circulante porque cobra al instante.

### 2.4 Pool bancario (información disponible)

| Concepto | Saldo 2024 | Comentario |
|---|---:|---|
| Deuda LP entidades crédito | 30.000 € | Préstamo (probable apertura local 2023). Cuota y plazo no documentados. |
| Deuda CP entidades crédito | 38.250 € | **Póliza dispuesta al 100% los 3 últimos años.** Inmóvil. Trampa de circulante. |
| **Total deuda financiera** | **68.250 €** | Sin desglose por entidad — dato pendiente |
| Tesorería | 26.609 € | |
| **Posición financiera neta** | **-41.641 €** | Negativa |

**Datos pendientes críticos:**
- Número de entidades en el pool (concentración).
- CIRBE: deuda total registrada (puede haber más de la visible en balance, por ejemplo descuento de pagarés, leasing, confirming).
- **Avales personales de los socios** sobre la póliza y el préstamo LP. En empresas con FFPP del 2,9%, prácticamente seguro que existen avales.
- Coste medio del pool (TAE de póliza y préstamo).
- Líneas concedidas vs. dispuestas: ¿hay disponible no dispuesto?

---

## 3. Hallazgos detallados

### 3.1 Hallazgo crítico — Riesgo de causa de disolución (art. 363 LSC)

**Qué pasa.** El art. 363.1.e LSC establece como causa legal de disolución que las pérdidas reduzcan el patrimonio neto por debajo de la **mitad del capital social**. Capital social = 3.000 €; umbral de disolución = **1.500 €**.

Histórico:
- 2022: PN 2.488 € → margen 988 € sobre umbral.
- 2023: PN 1.880 € → margen 380 € sobre umbral. **Estuvo a un suspiro.**
- 2024: PN 5.156 € → margen 3.656 € sobre umbral.

**Por qué importa.** Si en 2025 el resultado es **una pérdida > 3.656 €**, la sociedad entra automáticamente en causa de disolución. El administrador tiene entonces **2 meses** (art. 365 LSC) para convocar junta y, o bien remover la causa (ampliación de capital, condonación), o bien acordar la disolución. Si no lo hace:
- **Responsabilidad personal y solidaria del administrador** por todas las deudas sociales posteriores al hecho (art. 367 LSC).
- Los proveedores y bancos que conozcan la situación pueden exigir el cobro directamente al administrador.

Dado que el EBIT 2024 fue +3.920 € y que el crecimiento previsto +50% en 2025 implica más coste de personal y aprovisionamientos antes de que las ventas maduren, **el riesgo de pérdida > 3.656 € en 2025 es alto** (estimación cualitativa, dato pendiente: cuentas 2025).

**Qué hacer.**

**Opción A — Aportación de socios a fondo perdido / aportaciones para compensar pérdidas (cuenta 118):** rápido, sin necesidad de notario.
- Importe mínimo para salir de zona de peligro inmediato: **5.000 €** (deja PN ~10 k€).
- Importe recomendado para zona sana y dejar de ser un balance de juguete: **30.000 €** (deja PN ~35 k€ ≈ 20% activo).

**Opción B — Ampliación de capital** con prima de emisión.
- Capital pasa de 3.000 a 30.000 € (capital social formal de SL realista).
- Pros: imagen frente a bancos; permite traspasar préstamos socio-sociedad.
- Coste: notario + Registro ≈ 600-900 €. Plazo: 4-6 semanas.

**Opción C — Condonación de préstamo de socio** (si existe; **pendiente de confirmar** en anexo societario).
- Si los socios han prestado dinero a la sociedad, condonar parte de ese préstamo convierte deuda en patrimonio neto sin sacar dinero del bolsillo.
- Atención fiscal: la condonación tributa como ingreso extraordinario en la sociedad **salvo** que se documente como aportación de socio (cuenta 118), en cuyo caso es fiscalmente neutra (art. 17.4 TRLITPAJD y consulta DGT V0925-22).

**Recomendación:** **Opción A** (aportación 118) por 30.000 € en julio 2026 una vez se confirme la PyG 2025. Si los socios no pueden aportar, **Opción C** si hay préstamo socio.

**Impacto:** elimina riesgo legal del administrador; mejora rating bancario; permite negociar condiciones; coste fiscal cero.
**Plazo:** 2026 Q3.
**Responsable:** Administrador + asesor fiscal + analista societario.

---

### 3.2 Hallazgo crítico — Póliza de crédito dispuesta crónicamente

**Qué pasa.** La línea "deudas a corto plazo con entidades de crédito" muestra **38.250 € exactos los 3 años**. Es una póliza de crédito **dispuesta al 100% de forma permanente**. Una póliza está diseñada para cubrir desfases temporales de tesorería, **no** para financiar capital de trabajo estructural.

**Por qué importa.**
- **Coste:** una póliza dispuesta al 100% paga el tipo nominal completo + comisiones de no disposición (irónicamente) + comisión de apertura/renovación anual. Estimación de coste actual al 7-9% TAE = **2.700-3.450 €/año**.
- Si se reestructurara como **préstamo LP a 5 años al 5-6%**, el coste caería a **~2.000 €/año** y, sobre todo, **liberaría 38.250 € de liquidez disponible** en la póliza para imprevistos reales.
- Al renovación anual la entidad puede no renovar o reducir el límite → riesgo de impago inmediato de 38 k€.
- Resultado financiero 2024 = -644 € muy bajo; sugiere que parte de los intereses no se están registrando correctamente o el tipo es bajo. Verificar con extractos bancarios.

**Qué hacer.**
1. Negociar con la entidad principal **reconversión de la póliza en préstamo a 5 años**. Argumento: la disposición es estructural, así lo demuestran los 3 últimos balances.
2. Mantener una **póliza nueva de 20-30 k€ no dispuesta** para imprevistos reales (vacaciones de personal, mes flojo, etc.).
3. Aprovechar la negociación para fijar un coste financiero conocido y mejorar la posición frente a otros bancos.

**Impacto en €:** ahorro intereses ~1.000-1.500 €/año + liberación de 30 k€ de liquidez disponible.
**Coste:** comisión apertura ~1% = ~600 €.
**Plazo:** 2026 Q3.
**Responsable:** Administrador + dirección financiera (si la hay) + apoyo asesor.
**Riesgo si no se hace:** descubrimiento bancario al primer mes malo; coste financiero creciente con subidas de tipos; pérdida de margen de negociación.

---

### 3.3 Hallazgo crítico — Activo fijo mal financiado

**Qué pasa.** Entre 2022 y 2023, el inmovilizado material pasa de 26.576 € a 95.674 € (+69.098 €), probablemente apertura del local ZigZag u otro. La financiación incremental disponible fue:
- Préstamo LP nuevo: +30.000 €
- Resto: **39.098 € sale del circulante** (proveedores y otros acreedores aplazados).

**Principio violado:** activo permanente debe financiarse con recursos permanentes (PN + deuda LP). En 2023, recursos permanentes = 1.880 + 30.000 = 31.880 €, frente a activo no corriente de 95.674 €. **Déficit estructural de 63.794 €**, conocido como **fondo de maniobra negativo**.

En 2024, fondo de maniobra = AC – PC = 79.064 – 139.582 = **-60.518 €**.

**Por qué importa.** Mientras el ticket de heladería se cobre al contado y los proveedores acepten 30 días, la empresa funciona. **Pero cualquier shock** (temporal de lluvia que reduce ventas 2 semanas, problema sanitario, subida brusca de un proveedor) **revienta la caja**.

**Qué hacer.**
1. **Refinanciar** los 39 k€ "atrapados" en el circulante con un préstamo LP nuevo o por ampliación del existente, una vez se haya capitalizado la empresa (hallazgo 3.1).
2. Mejorar el ratio fondo de maniobra:
   - PN +30 k€ (capitalización)
   - Deuda LP nueva +30 k€
   - Resultado: recursos permanentes ≈ 95 k€, cubre el inmovilizado.

**Impacto:** liquidez recuperada estructuralmente; ratio liquidez sube a >1; rating bancario mejora.
**Plazo:** acoplar con hallazgo 3.1 y 3.2 en un único pack de reestructuración 2026 Q3-Q4.

---

### 3.4 Hallazgo crítico — "Otros acreedores" 49.850 € sin desglose

**Qué pasa.** La línea muestra 91.715 € (2022) → 74.097 € (2023) → 49.850 € (2024). Es la mayor partida del pasivo corriente después de proveedores y póliza. Sin desglose, no podemos saber qué contiene, pero lo habitual es:
- IVA pendiente de ingresar (4T o aplazamiento).
- Retenciones IRPF de trabajadores.
- Seguridad Social pendiente (aplazada o del mes corriente).
- Acreedores por servicios (luz, gas, alquiler, gestoría).
- Posibles préstamos de socios reflejados aquí en lugar de en su epígrafe específico.

**Por qué importa.**
- Si hay **aplazamientos con Hacienda o SS**, llevan intereses (4-5% anual) y recargos (5-20% según escalón). Coste latente estimado: **2.500-10.000 €/año**.
- Si hay deuda fiscal por encima de ciertos umbrales, **Hacienda puede embargar cuentas** sin previo aviso. Para una empresa con 26 k€ de caja, un embargo es la quiebra inmediata.
- Si parte son préstamos de socios sin documentar, hay **riesgo fiscal** (operaciones vinculadas no a precio de mercado) y patrimonial (¿es deuda o aportación?).

**Qué hacer.**
1. **Pedir mayor cuenta 410/465/475/476** del 2024 y a fecha más reciente. Es información que el asesor contable puede sacar en 30 minutos.
2. Identificar aplazamientos vigentes con Hacienda/SS, importe pendiente, próximos vencimientos y coste.
3. Si hay préstamos de socio en esa partida, reclasificarlos al epígrafe correcto y coordinar con `analista-societario` por operaciones vinculadas.

**Impacto:** sin desglose no se puede cuantificar; mínimo 2,5 k€/año de coste evitable.
**Plazo:** 2 semanas (es una petición sencilla al asesor).
**Responsable:** Administrador + asesor contable.

---

### 3.5 Hallazgo ámbar — Existencias 54.199 € en producto perecedero

**Qué pasa.** Las existencias crecen de 23.748 € (2022) a 54.199 € (2024), +128%. Para un negocio de heladería con producto perecedero, son **33,5 días de stock**.

**Por qué importa.**
- Helado conservado bien puede durar meses, pero los sabores con frutas frescas, los toppings y productos auxiliares no.
- 33,5 días puede esconder **stock obsoleto** (sabores que no rotan, packaging viejo, mercancía de aperturas anteriores).
- Cada 10 días de stock = **~16 k€ de caja inmovilizada**.

**Qué hacer.**
1. Inventario físico contado + ABC de rotación por SKU (coordinar con `analista-operativo`).
2. Provisionar el stock obsoleto identificado y dejar de comprarlo.
3. Objetivo razonable: 15-20 días de stock → libera **22-28 k€ de caja**.

**Impacto en caja:** **+22-28 k€ liquidados** en 3-6 meses.
**Coste:** ninguno; es disciplina de compras.
**Riesgo si no se hace:** stock pasa a obsoleto → pérdida del 100% del valor.

---

### 3.6 Hallazgo ámbar — Deudores comerciales negativos (-1.743 €)

**Qué pasa.** El epígrafe "deudores comerciales" en 2024 aparece con saldo **negativo** (-1.743 €). Contablemente esto significa que la cuenta 430 (clientes) o 437 (envases) tiene saldo acreedor neto, lo que ocurre normalmente por:
- **Anticipos de clientes** (cuenta 438) > saldos pendientes de cobro (cuenta 430).
- Servicios de catering/eventos cobrados por adelantado.
- Posible saldo a favor de cliente por devolución no compensada.

**Por qué importa.**
- Es **buena noticia operativa** (la empresa cobra antes de servir).
- Pero **mal presentado** en balance: técnicamente esos anticipos van en pasivo (cuenta 438 "Anticipos de clientes"), no como deudores negativos. Es **un error de presentación** del asesor contable.
- Distorsiona los ratios y puede levantar dudas en un banco que mire por encima.

**Qué hacer.** Pedir al asesor contable reclasificar los anticipos al pasivo corriente en próximas cuentas (mayor de la 438).

**Impacto:** estético/reputacional. Coste cero.

---

## 4. Proyección de tesorería

**Limitación:** sin cuentas 2025 ni presupuesto 2026 detallado, esta proyección es **escenario teórico**, no compromiso.

### 4.1 Escenario base 2026 (crecimiento +30%, margen plano)

| Magnitud | 2024 real | 2026 base proyectado |
|---|---:|---:|
| Ventas | 1.206.904 | 1.568.975 (+30%) |
| EBIT estimado | +3.920 | +5.000 (margen plano ~0,3%) |
| Inversión inmovilizado prevista | 0 | 0 (sin aperturas) |
| Variación NOF (stock+deud.-provee.) | ~0 | +15.000 (mantiene proporción) |
| Servicio deuda LP (cuota anual estimada) | n/d | ~7.500 |
| Servicio deuda CP (intereses póliza) | ~3.000 | ~3.000 |
| **Cash flow libre estimado** | | **-20.500** |

**Lectura:** con margen plano, **incluso sin crecer agresivamente, la empresa consume caja** por el efecto NOF y el servicio de la deuda.

### 4.2 Escenario estrés 2026 (crecimiento +50%, margen 0%)

| Magnitud | Importe |
|---|---:|
| Ventas | 1.810.356 (+50%) |
| EBIT | 0 (asumido) |
| Variación NOF | +25.000 |
| Servicio deuda total | -10.500 |
| **Cash flow libre estimado** | **-35.500** |

Con tesorería 2024 de 26.609 € + saldo medio inicial 2026 (probablemente similar), **la caja se evapora hacia el verano 2026** si no se actúa.

### 4.3 Escenario con reestructuración recomendada

Si se ejecuta el plan de los hallazgos 3.1–3.2:
- Capitalización +30.000 € (entra como aportación 118)
- Reconversión póliza CP en préstamo LP libera 30.000 € de liquidez (mantener póliza 20 k€ no dispuesta)
- Liberación stock obsoleto +20.000 €

**Caja proyectada fin 2026 escenario base:** 26.609 – 20.500 + 30.000 + 30.000 + 20.000 = **~86.100 €**. Cubre 1,5 meses de personal. Sigue siendo justo, pero **respira**.

### 4.4 Propuesta de cuadro de tesorería mensual

Pendiente de implementar. Necesario para 2026:
- Modelo Excel con 12 columnas (mes) y filas: cobros previstos, pagos personal, pagos proveedores, pagos fiscales (IVA trim., IRPF trim., SS mensual), servicio deuda, capex.
- Actualización quincenal por el administrador.
- Objetivo: ver con 60 días de antelación cualquier tensión.

---

## 5. Necesidades y oportunidades de financiación

### 5.1 Pack de reestructuración 2026 (recomendación principal)

| Acción | Importe | Plazo | Impacto en caja |
|---|---:|---|---:|
| Aportación socios cuenta 118 | +30.000 € | Q3 2026 | +30.000 |
| Reconversión póliza 38.250 € en préstamo LP 5 años | (mismo importe) | Q3 2026 | libera 30.000 (póliza no dispuesta) |
| Liberación stock obsoleto | n/a | Q3-Q4 2026 | +20.000 |
| **Total liquidez incremental** | | | **+80.000 €** |

### 5.2 Líneas que faltan

- **Confirming** para los proveedores grandes (si hay 2-3 que concentren las compras): mejora PMP sin tensar la relación. Coste 2-3% sobre nominal.
- **Renting** para próximas inversiones (vitrinas, maquinaria) en lugar de compra directa: evita inmovilizado mal financiado.
- **Línea de aval** para concursos públicos o eventos (si aplica al catering).

### 5.3 Diversificación bancaria

**Pendiente** sin pool detallado. Si toda la deuda (68.250 €) está en una sola entidad, hay **concentración 100%**. Recomendación: tener al menos **2 entidades** trabajando con la empresa, una principal y una secundaria, para tener alternativa real al renovar líneas.

### 5.4 Working capital optimizable

| Palanca | € liberables |
|---|---:|
| Reducción días stock de 33,5 a 20 | 22.000 |
| Optimización PMP (negociar +15 días en proveedor principal) | 12.000-18.000 |
| Cobro anticipado catering/eventos (formalizar) | 5.000-10.000 |
| **Total potencial** | **39.000-50.000 €** |

---

## 6. Datos pendientes

| Dato | Por qué importa | Cómo conseguirlo | Bloqueante |
|---|---|---|---|
| **Cuentas anuales 2025** (PyG + balance) | Saber si entró en causa disolución y en qué punto está la caja | Asesor contable | SÍ |
| **Pool bancario detallado** + CIRBE | Concentración, vencimientos, coste real | Banca electrónica + petición CIRBE en Banco de España | SÍ |
| **Avales personales de socios** | Patrimonio personal comprometido | Pólizas firmadas, certificación banco | SÍ |
| **Mayor cuentas 410/465/475/476** ("Otros acreedores") | Conocer deuda fiscal y SS real | Asesor contable, 30 min | SÍ |
| **Existencia y saldo de préstamos socio-sociedad** | Posible vía para condonación / capitalización | Mayor 551 / 552 / 1633 | SÍ |
| **Cuadro vencimientos préstamo LP 30 k€** | Calcular servicio deuda real | Banco | NO |
| **Coste financiero por línea** (TAE pólizas, intereses préstamos) | Cuantificar ahorro de la refinanciación | Extractos | NO |
| **Inventario físico contado al cierre 2024** | Validar si stock 54 k€ es real o hay obsolescencia oculta | Recuento físico (idealmente con `analista-operativo`) | NO |
| **Detalle de la inversión 2023 en inmovilizado** (+69 k€) | Saber qué se compró y si genera retorno | Mayor 21x + facturas | NO |
| **Posición de tesorería actual** (mayo 2026) | Saber dónde estamos hoy | Extractos bancarios último mes | SÍ |

---

## 7. Coordinación con otros especialistas

- **`analista-societario`**: confirmar si existen préstamos socio-sociedad (impacto en hallazgo 3.1 opción C) y operaciones vinculadas; revisar conjuntamente la conveniencia de ampliación de capital vs. aportación 118.
- **`analista-economico`**: el problema de fondo del balance es el margen plano. Sin recuperar 5-8 puntos de margen bruto, ninguna reestructuración financiera es sostenible. La capitalización compra tiempo, no soluciona la causa.
- **`analista-operativo`**: stock obsoleto y rotación por SKU (hallazgo 3.5).
- **`planificador-estrategico`**: el pack de reestructuración (capitalización + reconversión póliza + reducción stock) debe entrar como acción prioritaria Q3 2026 con presupuesto asignado.

---

*Fin del anexo financiero.*
