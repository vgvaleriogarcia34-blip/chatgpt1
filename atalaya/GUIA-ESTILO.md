# Guía de estilo de Atalaya 360°

Cómo se escribe todo lo que lee el cliente: pantallas, avisos, botones, ayudas, informes, correos y mensajes del servidor. Si un texto nuevo no cumple esta guía, no está terminado.

## 1. Tratamiento: usted, siempre

- Se habla de usted en todas las pantallas, también en el asistente, las preguntas guiadas, los avisos de error y los botones.
  - Sí: «Cargue sus cuentas», «Responda las preguntas», «Su empresa», «Puede bajarla aquí mismo».
  - No: «Carga tus cuentas», «Responde», «Tu empresa», «Puedes bajarla».
- Los botones van en infinitivo o en usted: «Guardar», «Responder las preguntas», «Cargar sus cuentas». Nunca «Carga», «Pulsa», «Mira».
- Las preguntas al empresario, también de usted: «¿A cuántos días paga a sus proveedores?».
- Atalaya habla en plural o de forma impersonal («Hemos recibido», «Se ha guardado»), no en primera persona del singular («He rellenado», «te lo marco»).
- Excepción: las frases que el usuario escribe o dice como ejemplo (por ejemplo, «Di: ventas de 2024, 4,2 millones») se reescriben como «Diga, por ejemplo: …».

## 2. Indicadores: nombre llano primero, sigla después, y su «?»

- Primero el nombre en palabras de todos los días; después, si hace falta, la sigla entre paréntesis; y al lado, el botón «?» con la explicación breve.
  - «Beneficio antes de intereses e impuestos (EBITDA) ?»
  - «Veces que el negocio cubre las cuotas (DSCR) ?»
  - «Valor actual de lo que genera el proyecto (VAN) ?»
  - «Rentabilidad anual del proyecto (TIR) ?»
  - «Pedidos completos y a tiempo (OTIF) ?»
  - «Concentración de clientes (índice HHI) ?»
- Una vez explicada en una pantalla, la sigla puede ir sola en esa misma pantalla.
- Cada indicador que se muestra con una cifra o un semáforo lleva su «?». La explicación cabe en dos o tres frases: qué mide, cómo se lee (qué es bueno y qué es malo) y, si ayuda, la fórmula en palabras.
- Se reutiliza el mecanismo de ayuda de cada página; no se crea uno nuevo:
  - Simulador (`app.html`, `js/app.js`): ficha `INFO[clave]` y atributo `data-info`; el «?» visible es `<button class="info-i" data-info="…">?</button>`.
  - Sistema estratégico (`js/strategy/*`): la ayuda de cada módulo y los títulos con `title` y la clase de ayuda ya existente en cada pantalla.

### Jerga que no se deja sin explicar

| Jerga | Qué se escribe |
|---|---|
| EBITDA | Beneficio antes de intereses e impuestos (EBITDA); «beneficio del negocio» en textos breves |
| DSCR | Veces que el negocio cubre las cuotas (DSCR) |
| VAN | Valor actual neto (VAN): lo que vale hoy todo lo que genera el proyecto, descontado el coste del dinero |
| TIR | Rentabilidad anual del proyecto (TIR) |
| OTIF | Pedidos completos y a tiempo (OTIF) |
| HHI | Concentración de clientes (índice HHI) |
| pp | puntos (no «pp»): «sube 3 puntos» |
| DSO / DPO / DIO | Días de cobro / días de pago / días de stock |
| Payback | Recuperación de la inversión |
| Circulante, NOF | Dinero atado en el día a día (clientes + stock − proveedores) |
| Lean, 5S, SMED, KPI | La palabra en castellano y, si hace falta, la sigla entre paréntesis |

## 3. Pantallas táctiles

- Nunca «pase el ratón», «pasa el cursor», «al pasar por encima». Se escribe «Toque» (o «Toque o pase el cursor» si la acción también existe con ratón) y la función tiene que responder al toque.
  - Sí: «Toque un mes para ver su detalle».
  - No: «Pasa el cursor para ver cada mes».
- «Pulse» vale para botones; «Toque» para gráficos y elementos que se tocan en el móvil.
- Toda la información que solo sale al pasar el ratón tiene que poder verse también al tocar.

## 4. Cifras en formato español (es-ES)

- Miles con punto y decimales con coma: 1.250.000 €, 3,5 %, 2,1×.
- El símbolo del euro y el de porcentaje van separados por un espacio: «85 €», «12 %».
- Abreviaturas: «k€» para miles y «M€» para millones solo en gráficos y fichas cortas; en el texto, «4,2 millones de euros».
- Fechas: «18 de octubre de 2026» o «18/10/2026». Meses en minúscula.
- Se usan las funciones de formato que ya existen (`A.fmt`, `F.eur`, `F.pct`, `Intl.NumberFormat('es-ES')`); nunca `toFixed` a pelo en un texto visible.

## 5. Sin superlativos ni promesas sin base

- Nada de «el mejor», «único», «revolucionario», «increíble», «garantizado», «perfecto», «totalmente».
- Las cifras de estudios, solo con su fuente. Lo que es una estimación se dice: «estimado», «valor típico del sector», «hipótesis».
- Lo que falta no se lee como cero: «Sin datos», «Falta el dato», no «0 %».
- No se nombran marcas de terceros salvo cuando son la herramienta concreta que el usuario tiene que usar (Excel, Google Calendar, Outlook).

## 6. Mensajes y avisos

- Primero lo que pasa y después lo que puede hacer: «No se han podido leer sus cuentas. Revise que los conceptos estén en una columna y los años en otra».
- Los errores no culpan al usuario y no enseñan detalles técnicos (códigos HTTP, nombres de variables) salvo en las pantallas de administración.
- Las conexiones técnicas (claves de API, variables de entorno, servidor) solo se explican a la administración y al plan Consultora. Al resto se le dice a quién pedirlo.

## 7. Revisión antes de publicar

1. Buscar tuteo: `tu`, `tus`, `puedes`, `tienes`, `quieres`, imperativos (`pulsa`, `elige`, `mira`, `carga`, `responde`, `escribe`, `haz`).
2. Buscar jerga sin explicar: `EBITDA`, `DSCR`, `VAN`, `TIR`, `OTIF`, `HHI`, ` pp`.
3. Buscar «ratón», «cursor», «pasa por encima».
4. Comprobar a 390 px que no hay textos cortados ni desplazamiento horizontal.
