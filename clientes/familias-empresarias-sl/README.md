# Familias Empresarias S.L. — Carpeta de trabajo

Cliente piloto del sistema de agentes de consultoría.

## Estructura

```
familias-empresarias-sl/
├── 01-datos-entrada/        ← lo que aporta el cliente
│   ├── contabilidad/        PyG, balance, sumas y saldos, mayor (≥ 3 ejercicios + año en curso)
│   ├── abc-productos-clientes/  ABC de productos y clientes (ventas, margen)
│   ├── transcripciones/     entrevistas con socios, directivos, mandos intermedios
│   ├── societario/          escrituras, estatutos, pactos, protocolo familiar, organigrama societario
│   ├── operaciones/         procesos, capacidades, tiempos, KPIs operativos
│   └── rrhh/                plantilla, organigrama, costes laborales
├── 02-analisis/             ← lo que producen los analistas (anexos, plan, KPIs)
└── 03-entregables/          ← lo que se entrega al empresario (informe ejecutivo + el resto)
```

## Convenciones de nombrado

Para que los agentes encuentren los datos sin ambigüedad:

- **Contabilidad**: `pyg-YYYY.xlsx` / `pyg-YYYY.pdf`, `balance-YYYY.xlsx`, `sumas-saldos-YYYY-MM.xlsx`, `pool-bancario-YYYY-MM.xlsx`
- **ABC**: `abc-clientes-YYYY.xlsx`, `abc-productos-YYYY.xlsx`
- **Transcripciones**: `transcripcion-YYYY-MM-DD-<rol o nombre>.md` (formato Markdown preferido; si llegan en audio, transcribir antes)
- **Societario**: `estatutos-YYYY.pdf`, `escritura-constitucion.pdf`, `protocolo-familiar-YYYY.pdf`, `pacto-socios-YYYY.pdf`, `organigrama-societario.png|md`
- **Operaciones**: `mapa-procesos.pdf|md`, `kpis-operativos-YYYY.xlsx`, `capacidad-planta.xlsx`
- **RRHH**: `plantilla-YYYY-MM.xlsx`, `organigrama-YYYY-MM.png|md`, `descripciones-puesto/`

## Cómo arrancar un encargo

En la conversación con Claude Code, basta con decir:

> Arranca el diagnóstico de Familias Empresarias S.L.

El orquestador `director-consultoria` se activará, inventariará los datos disponibles en `01-datos-entrada/`, lanzará los especialistas que tengan información suficiente, y construirá los entregables en `03-entregables/`.

Si hace falta forzar a un especialista concreto:

> Invoca al analista-financiero solo, sobre los datos ya cargados.

## Privacidad

Esta carpeta puede contener información sensible (cuentas, escrituras, transcripciones con nombres). No subir a remotos públicos. Si el repositorio se publica, ignorar `clientes/*/01-datos-entrada/` y `02-analisis/` vía `.gitignore`.
