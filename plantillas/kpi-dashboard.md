# Cuadro de mando · {{CLIENTE}}

## 1. Cuadro de mando ejecutivo (lo que mira el empresario)

| KPI | Definición | Cálculo | Actual | Objetivo año 1 | Frecuencia | Fuente | Acción vinculada | Estado |
|---|---|---|---|---|---|---|---|---|
| {{KPI 1}} | | | | | Mensual | | A-XX | 🟢🟡🔴 |
| … hasta 8 | | | | | | | | |

## 2. Cuadros por área

### 2.1 Operativo
| KPI | Definición | Cálculo | Actual | Objetivo | Frecuencia | Fuente | Estado |

### 2.2 Estructural / Personas
…

### 2.3 Económico
…

### 2.4 Financiero
…

### 2.5 Comercial
…

### 2.6 Societario / Gobernanza
*(menos frecuentes: trimestral o anual; ej. estado de avances en protocolo familiar, comité de sucesión activado, etc.)*

## 3. KPIs de seguimiento del plan

| KPI | Definición | Objetivo | Frecuencia |
|---|---|---|---|
| % acciones lanzadas vs. plan | | 100% al cierre del trimestre | Mensual |
| € invertido vs. presupuestado | | ±10% | Mensual |
| € impacto realizado vs. esperado | | ≥ 80% | Trimestral |
| Nº acciones bloqueadas | | 0 | Mensual |

## 4. Definiciones y reglas

Para cada KPI no obvio, una definición breve. **Una sola interpretación posible.**

Ejemplo:
- **Margen EBITDA** = (EBITDA del mes) / (Ventas netas del mes). Ventas netas = ventas brutas − descuentos comerciales − devoluciones. EBITDA según cierre contable mensual.

## 5. Cómo alimentar el cuadro de mando cada mes

1. **Día 5 de cada mes:** controller exporta `{{ficheros}}` del ERP.
2. **Día 7:** pega valores en la pestaña `_datos` de `{{cuadro.xlsx / gsheet}}`.
3. **Día 8:** revisión del semáforo con dirección.
4. **Día 10:** comité de seguimiento.

**Herramienta recomendada:** {{Excel / Google Sheets / Looker Studio / Power BI}} — justificación en una línea.

## 6. KPIs con dato pendiente de capturar

| KPI | Por qué no se mide hoy | Cómo lo capturamos | Plazo |
|---|---|---|---|
