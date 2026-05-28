# Snoopy Heladerías, S.L. — Carpeta de trabajo

**CIF:** B05546601
**Sector:** hostelería · heladerías
**Locales conocidos:** ZigZag (y otros por confirmar)
**Cliente piloto** del sistema de agentes de consultoría.

## Datos disponibles a fecha 2026-05-28

| Carpeta | Archivo | Contenido | Ejercicios cubiertos |
|---|---|---|---|
| `01-datos-entrada/contabilidad/` | `pyg-historico-snoopy-heladerias.pdf` | Cuenta de Pérdidas y Ganancias (modelo Sociedades) | 2022, 2023, 2024 |
| `01-datos-entrada/contabilidad/` | `balance-historico-snoopy-heladerias.pdf` | Balance de Situación (modelo Sociedades) | 2022, 2023, 2024 |
| `01-datos-entrada/abc-productos-clientes/` | `zigzag-ventas-2026-02.xls` (+ `.csv` derivado) | Ventas diarias del local ZigZag, febrero 2026 | Feb-2026 |

Datos extraídos en formato estructurado (markdown con tablas): `02-analisis/00-datos-extraidos.md`.

## Datos pendientes críticos

Ver `02-analisis/00-datos-extraidos.md` § 4. Resumen:

- PyG y balance 2025
- Desglose de "Otros gastos de explotación" 2024
- Ventas por local (faltan todos salvo ZigZag)
- Plantilla y organigrama operativo
- Estructura societaria y socios
- Pool bancario + avales personales
- Transcripciones de entrevistas con socios y mandos
- ABC de productos por local
- Desglose de aprovisionamientos por proveedor
- Detalle de la inversión de 2023 (+70 k€ en inmovilizado material)

## Estructura

```
snoopy-heladerias-sl/
├── 01-datos-entrada/        ← lo que aporta el cliente
│   ├── contabilidad/        PyG, balance, sumas y saldos, mayor
│   ├── abc-productos-clientes/  ventas por producto/cliente/local
│   ├── transcripciones/     entrevistas (vacío)
│   ├── societario/          escrituras, estatutos, pactos (vacío)
│   ├── operaciones/         procesos, capacidades (vacío)
│   └── rrhh/                plantilla, organigrama (vacío)
├── 02-analisis/             ← anexos de los analistas + plan + KPIs
└── 03-entregables/          ← informe ejecutivo + entregables finales al cliente
```

## Cómo arrancar el diagnóstico

> Arranca el diagnóstico de Snoopy Heladerías S.L.

El orquestador `director-consultoria` partirá de `00-datos-extraidos.md` y lanzará los especialistas en paralelo.
