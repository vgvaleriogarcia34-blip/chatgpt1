# auditoria-flow

Plugin de Claude Code que empaqueta una **secuencia de trabajo para auditorías
de código** basada en los tres skills que más se usan en auditorías:

| Fase | Skill del plugin | Skill integrado que envuelve |
|------|------------------|------------------------------|
| 1. Revisar    | `audit-code-review`     | `code-review`     |
| 2. Seguridad  | `audit-security-review` | `security-review` |
| 3. Verificar  | `audit-verify`          | `verify`          |

## Uso

Lo más rápido es ejecutar el comando orquestador, que corre las tres fases en
orden y entrega un veredicto consolidado:

```
/audit-flow
```

Acepta un alcance opcional, por ejemplo:

```
/audit-flow staged      # solo cambios en el área de staging
/audit-flow branch      # diff de la rama contra su base
/audit-flow src/app.js  # acota a una ruta
```

También puedes invocar cada fase por separado pidiéndolo en lenguaje natural
(p. ej. "haz la revisión de seguridad de los cambios"), lo que activa el skill
correspondiente.

## Estructura

```
auditoria-flow/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── audit-flow.md          # comando /audit-flow (orquestador)
├── skills/
│   ├── audit-code-review/SKILL.md
│   ├── audit-security-review/SKILL.md
│   └── audit-verify/SKILL.md
└── README.md
```

## Instalación

1. Añade este repositorio como un marketplace de plugins o copia el directorio
   `auditoria-flow/` a tu carpeta de plugins de Claude Code.
2. Habilita el plugin `auditoria-flow`.
3. Verifica que aparezca el comando `/audit-flow` y los skills `audit-*`.

> Nota: las fases delegan en los skills integrados `code-review`,
> `security-review` y `verify`. Si alguno no estuviera disponible en tu
> entorno, cada SKILL.md incluye un procedimiento manual de respaldo.
