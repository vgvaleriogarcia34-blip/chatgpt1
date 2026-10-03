# Identidad visual de Atalaya · anexo «Producto» al libro de estilo de Business Avance

Atalaya aplica el libro de estilo de Business Avance (versión 1.0, octubre de 2026). Este anexo recoge cómo se traduce a un software y la única excepción que necesita.

## Tokens (`css/atalaya.css`, `:root`)

| Token | Valor | Uso |
|---|---|---|
| `--abyss` | Tinta #05060A | Fondo de toda la aplicación |
| `--panel` / `--panel-solid` | Panel #10131A | Tarjetas y cajas |
| `--line` | Filete #2C333F | Separadores y bordes |
| `--gold` (alias `--accent`) | Lima #C9F24D | Acento único: filete bajo el titular, cifra clave, llamada a la acción, foco |
| `--olive` | Oliva #6E7D14 | Acento en fondo claro (informes y manual en tema claro) |
| `--fg` / `--bone` | Hueso #F5F3EE | Texto sobre tinta; fondo de informes |
| `--font-display` | Archivo 700–800 | Titulares, cifras y nombres de módulo |
| `--font-body` | Libre Franklin | Todo lo que se lee |
| `--font-data` | IBM Plex Mono | Etiquetas, kickers, unidades y tablas de cifras |

El nombre `--gold` se conserva por compatibilidad del código; su valor es la lima.

## Registros

- **Comercial** (página de Atalaya, acceso): fondo tinta, acento lima.
- **Interno** (aplicación): fondo tinta, panel y filete; la lima solo señala.
- **Académico** (informes, manual en tema claro): fondo hueso, acento oliva, cabecera de marca en tinta.

## Componentes

Kicker en mono (`.eyebrow`), titular en Archivo con la segunda parte calada (`h1 em`, `h2 em`: contorno lima, solo en tamaño grande; en miniaturas va en lima macizo), filete lima de 48 × 3 px bajo el titular de módulo, tablas de filas (cabecera en Archivo mayúsculas sobre filete hueso, sin fondos alternos ni bordes verticales), botones rectos con un único botón lima por zona.

## Excepción documentada para producto

Un software de diagnóstico necesita codificar estados y series. Se autorizan, solo para datos y nunca como decoración:

- **Estados**: verde #2FB24A, ámbar #FAB219, rojo #E04848 (semáforos, avisos, encaje).
- **Series de gráficos**: #3987E5, #D95926, #199E70, #C98500, #D55181, dentro del gráfico.
- **Estilos DISC** en el mundo Personas y equipos: rojo, ámbar, verde y azul, solo en gráficos de perfil.

## Fuera del alcance

Los mundos 3D (planetas, lunas, galaxias del puesto de mando, del recorrido y de cada módulo, paisaje 3D) conservan sus colores propios por decisión de dirección: son escenario, no interfaz.
