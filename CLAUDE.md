# Consultora Familias Empresarias — Guía del proyecto

Este repositorio contiene, además de la app `IA50`, el sistema de **agentes de consultoría** que se usan para analizar empresas familiares y producir entregables profesionales.

**Firma consultora:** Familias Empresarias, S.L. (CIF 02262). Sus propias cuentas de gestión están en `firma-consultora/` y **no son objeto de análisis**, sólo material interno.

**Cliente piloto:** Snoopy Heladerías, S.L. (CIF B05546601) — grupo de heladerías con varios locales, entre ellos "ZigZag".

## Arquitectura de agentes

1 **orquestador** (`director-consultoria`) coordina **8 subagentes especialistas**:

| Agente | Área |
|---|---|
| `analista-operativo` | Procesos, productividad, capacidad, supply chain |
| `analista-estructural` | Organigrama, roles, gobernanza interna, dimensionamiento |
| `analista-societario` | Estructura societaria, pactos, sucesión, fiscalidad societaria |
| `analista-economico` | P&L, márgenes, rentabilidad por producto/cliente |
| `analista-financiero` | Balance, liquidez, solvencia, deuda, working capital |
| `analista-comercial` | ABC clientes/productos, pricing, embudo comercial |
| `planificador-estrategico` | Plan de acción priorizado por ROI + presupuesto anual |
| `analista-kpi` | Cuadro de mando de seguimiento |
| `editor-informes` | Redacción final en lenguaje sencillo, estilo profesional |

El orquestador se invoca al inicio de cada encargo. Decide qué especialistas activar, en qué orden, y compone el informe ejecutivo final con ayuda de `editor-informes`.

## Datos de entrada esperados

Por cliente, en `clientes/<nombre-cliente>/01-datos-entrada/`:

- `contabilidad/` — PyG, balance, sumas y saldos, mayor (últimos 3 ejercicios + acumulado año en curso)
- `abc-productos-clientes/` — análisis ABC de productos y clientes (ventas, margen)
- `transcripciones/` — entrevistas con socios, directivos, mandos intermedios
- `societario/` — escrituras, estatutos, pactos, organigrama societario, protocolo familiar si existe
- `operaciones/` — diagramas de proceso, tiempos, capacidades, KPIs operativos
- `rrhh/` — plantilla, organigrama, costes laborales, productividad

## Entregables (a producir en `03-entregables/`)

1. **Informe ejecutivo** — lenguaje sencillo, ~10–15 páginas (`informe-ejecutivo.md`)
2. **Plan de acción con presupuesto anual** (`plan-accion.md`)
3. **Cuadro de mando de KPIs** (`kpi-dashboard.md`)
4. **Anexos técnicos por área** — uno por especialista activado (`anexo-<area>.md`)

Plantillas en `plantillas/`.

## Principios de redacción (válidos para todos los agentes)

- Escribir para el empresario, no para otro consultor. Frases cortas, sin jerga innecesaria.
- Si se usa un término técnico, definirlo en una línea.
- Cada hallazgo debe responder: **qué pasa**, **por qué importa en €**, **qué hacer**.
- Toda recomendación lleva: impacto estimado (€/año), coste de implantar (€), plazo (meses), responsable propuesto, riesgo si no se hace.
- Citar siempre el dato fuente (archivo + apartado) que respalda cada conclusión.
- No inventar cifras. Si falta un dato, declararlo como "dato pendiente" y proponer cómo conseguirlo.

## Flujo típico de un encargo

1. Cliente entrega datos en `01-datos-entrada/`.
2. Se invoca `director-consultoria` → planifica qué especialistas activar.
3. Cada especialista produce su anexo en `02-analisis/`.
4. `planificador-estrategico` consolida hallazgos en plan de acción + presupuesto.
5. `analista-kpi` define cuadro de mando.
6. `editor-informes` redacta el informe ejecutivo final.
7. Todos los entregables aterrizan en `03-entregables/`.
