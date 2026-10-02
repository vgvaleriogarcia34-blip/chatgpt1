# Atalaya

Plataforma para que una empresa decida si puede afrontar una inversión **sin romper liquidez y pagándola con su propia rentabilidad**, y para analizar, diagnosticar y evaluar toda la empresa con un sistema integrado de decisiones estratégicas. **Atalaya es una herramienta de diagnóstico, no de gestión**: no sustituye al ERP ni lleva el día a día; trabaja sobre fotos a una fecha de corte para decidir mejor y comparar escenarios. Pensada para empresarios sin formación financiera: cada indicador tiene su horquilla verde, ámbar y roja, las variables que lo mueven y un asistente al que se le puede hablar.

## Páginas

| Página | Para qué |
|---|---|
| `index.html` | Página comercial en un espacio 3D (fondo de galaxias por el que se avanza al bajar, tarjetas y titulares que flotan, se inclinan y se acercan al cursor): propuesta, el ecosistema en 3D (los dos mundos y el abanico de pantallas de cada uno), demo en vivo con el motor real, planes y preguntas. |
| `acceso.html` | Alta con 14 días de prueba, inicio de sesión, recuperación de contraseña y solicitud de activación al terminar la prueba. |
| `grupo.html` | Vista de grupo (plan Grupos) o cartera de clientes (plan Consultora): sociedades, consolidado con eliminaciones intragrupo, comparativa, riesgos cruzados, objetivos en cascada e informe. |
| `portal.html` | Puesto de mando en 3D tras entrar: una galaxia con dos mundos (simulador de inversión y sistema estratégico) por la que se navega y desde la que se entra en cada herramienta. |
| `app.html` | Simulador de inversión y crecimiento. |
| `estrategia.html` | Sistema estratégico integrado (21 módulos). |
| `reloj.html` | Reloj de tareas en ventana aparte, para tenerlo abierto en el ordenador de cada persona. |
| `manual.html` | Manual de uso completo, con buscador. Es parte del área de clientes: solo se abre con sesión y acceso vigente (o con la sesión de administración). |
| `admin.html` | Gestor de usuarios: acceso, pagos, vencimientos, horas de uso, cambio de contraseña de los usuarios y enlaces de recuperación. Sin enlace visible: se entra por la barra de direcciones (`admin.html` o `#admin` en la página principal). Se entra con una **contraseña de administración propia**, que no pertenece a ninguna cuenta de usuario. |

## Simulador (`app.html`)

- **Mapa de capas y hoja de ruta**: al entrar, los capítulos aparecen como ventanas flotantes en 3D (pila, abanico, círculo o línea) con un fragmento real y su estado; dentro se trabaja un capítulo cada vez, guiado por seis fases. «Ver todo seguido» recupera la página completa.

- Proyección mensual a 60 meses con y sin la inversión, en cinco escenarios (estrés, pesimista, base, optimista, hipótesis) y sucesos activables (pérdida de cliente, tipos, cobros, convenio…).
- **Pólizas de crédito** en la tesorería: se disponen solas cuando la caja baja de medio mes de gastos, con intereses y comisión de no disposición. Liquidez = caja + póliza libre.
- **Meses de colchón** mes a mes, con mínimo, máximo, caja máxima y uso de la póliza.
- **Diez semáforos con horquilla** por color y sus variables directas e indirectas; al tocar uno se ve el efecto de mover cada variable un 10 %.
- Horizonte 3D con lectura automática del terreno («camino más corto al verde»).
- Sistema operativo humano: nueve dimensiones y catorce variables explicadas; el absentismo, el coste de selección y la curva de aprendizaje afectan a los números.
- Estructuras societarias con ficha completa (cómo funciona, flujo entre sociedades, ventajas, fiscalidad orientativa, requisitos, pasos y relaciones dentro del grupo).
- **Historia**: balances y cuentas de varios años desde PDF, Word, Excel, CSV, Markdown, pegado o dictado; ratios, proyección a tres años, políticas de gobierno y **auditoría del flujo del dinero** (dónde está cada euro del beneficio).
- Diccionario corporativo con variables directas e indirectas de cada término.
- Plan de corrección hacia la posición meta e informe de decisión.

## Sistema estratégico (`estrategia.html`)

**Zona de origen de datos**: se suben a la vez listados de ventas, compras, productos, plantilla, oportunidades, partes de horas, extractos, balances y cuentas, e informes; se reconocen por sus columnas y se reparten a los módulos (y al simulador). Cada módulo dice qué datos le faltan.

**Diagnóstico e informe 360 por módulo**: propósito, máxima expresión, lo que añade un consultor, preguntas al empresario, objetivos, plan de acción a 30/60/90 días y cadencia de seguimiento (`js/strategy/consultor-data.js`), con su informe 360.

**Universo 3D** detrás de cada módulo y capítulo (`js/cosmos.js`).

**Mapa de capas y recorrido por áreas**: las cinco áreas son las fases y los 21 módulos, ventanas flotantes en 3D con un fragmento real y su estado en vivo (abanico, pila, círculo o línea). Dentro se trabaja un módulo cada vez con hoja de ruta, anterior y siguiente; «Ver pestañas» vuelve a la barra clásica.

| Grupo | Módulos |
|---|---|
| Visión | Cuadro de mando cruzado · Plan de empresa (misión, visión, valores con peso, DAFO contextualizado con tus datos, CAME, filtro de valores, riesgos ponderados por valores y cascada de objetivos macro → micro) · Informe de auditoría completo · Evolución (corte del diagnóstico automático cada mes y manual; compara dos cortes: qué mejora, qué empeora, salud por área) |
| Finanzas | Flujo del dinero (con carga manual por años) · Impuestos (calendario de pagos, marco legal de reducción por escenario y escenarios fiscales de la inversión) · Tesorería por semanas · Presupuesto (generador con cuatro métodos, partidas detalladas, versiones, reales por partida y desviaciones en €, % y peso sobre ventas) · Cobros y morosidad (auditoría de la cartera a una fecha de corte: antigüedad de saldos, pago real frente a pactado, caja atrapada y deterioro) |
| Comercial | ABC y concentración de clientes, productos y proveedores (HHI explicado) · Margen de contribución sobre la demanda con palancas y escenarios guardados · Pipeline · Marketing (CAC, LTV) |
| Operaciones | Compras (Kraljic) · Logística (OTIF, coste por pedido) · Gestor de tiempos (facturable frente a sistema interno, con reloj de tareas flotante y ventana siempre visible fuera del navegador) · Lean por sector (takt, OEE, flujo de valor, desperdicios, 5S, kaizen) · Personas (con organigrama dibujable) |
| Estrategia | Expansión territorial (enviable al simulador) · Valoración de la empresa (múltiplo de EBITDA del sector con ajustes y flujos descontados, puente de hoy al valor con el plan, calculadoras de socio y participación; `js/valoracion-core.js`, que usa también la vista de grupo) · Mercado y riesgos 360 con datos macro de referencia 2026 y agente sobre fuentes oficiales |

Cada indicador con «?» abre una ficha que explica qué es, cómo se calcula, cómo leer tu dato y cómo mejorarlo (se cierra con la X, Escape o tocando fuera). Todas las tablas admiten importar documentos (PDF, Word, Excel, CSV, Markdown), pegar desde Excel y, donde tiene sentido, dictar por voz. Los riesgos, indicadores y hallazgos de cada módulo se suman al cuadro de mando y al informe de auditoría, que incluye un plan de trabajo de los objetivos a las acciones (macro → micro) y de los hallazgos al resultado (micro → macro).

## Asistente

Chat con micrófono y lectura en voz alta (Web Speech API: Chrome, Edge y Safari recientes; requiere https o localhost). Explica conceptos, revisa la situación, dice cómo poner en verde un semáforo y hace cambios («pon la financiación al 80 %», «simula perder un cliente del 10 % en el mes 14», «sube el precio un 3 %»). Con el servidor y una clave de la API de Claude responde con Claude y usa las mismas herramientas; sin ella funciona en modo básico con un intérprete local.

## Puesta en marcha

### Demostración sin servidor
Abre `index.html` (o sirve la carpeta con `python3 -m http.server`). Todo funciona, pero las cuentas y los datos se guardan solo en ese navegador: es un modo de demostración y no protege nada.

### Producción con servidor
```bash
cd atalaya/server
npm install
ANTHROPIC_API_KEY=sk-ant-... ADMIN_PASSWORD='una-clave-larga' APP_URL=https://atalaya.tudominio.es COOKIE_SECURE=1 PORT=8080 node server.mjs
```
- Sirve la web y la API en el mismo puerto. Ponlo detrás de un proxy con HTTPS (necesario para el micrófono y para la cookie segura).
- Datos en `server/data/db.json` (cámbialo con `ATALAYA_DATA`). Haz copias de seguridad de esa carpeta.
- Contraseñas con scrypt, sesiones con cookie `HttpOnly` y `SameSite=Lax`, límite de intentos de acceso.
- **Administración**: el gestor de usuarios usa una contraseña propia (mínimo 10 caracteres), separada de las cuentas de cliente. Fíjala con `ADMIN_PASSWORD` o, si no, el servidor muestra al arrancar un código de un solo uso para crearla en `admin.html`. Para cambiarla si la olvidas, arranca con `ADMIN_PASSWORD=nueva`. La sesión de administración dura 12 horas.
- **Recuperación de contraseña**: el usuario pide un enlace en «¿Has olvidado tu contraseña?». Con correo configurado (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE=1` para el puerto 465) se le envía; sin correo, la solicitud aparece en el gestor de usuarios, que genera el enlace para enviárselo. Los enlaces son de un solo uso y caducan en 60 minutos. `APP_URL` es la dirección pública que se pone en los enlaces.
- Las cuentas que eran administradoras en versiones anteriores pasan a ser clientes con acceso sin vencimiento.
- `MERCADO_AUTO_DIAS=7`: refresca el análisis de mercado de cada cliente con acceso cada 7 días.
- Modelo de IA: `claude-opus-5-5` por defecto (`ATALAYA_MODEL` para cambiarlo).

### Pagos
El control de acceso es real en el servidor: prueba de 14 días, acceso pagado con fecha de vencimiento y bloqueo. El cobro se registra desde el gestor de usuarios («Registrar pago»). Para cobrar con tarjeta de forma automática hay que conectar una pasarela (por ejemplo Stripe) que llame a `PATCH /api/admin/users/:id` al confirmar el pago; no está incluida. Los precios de los planes son de ejemplo: cámbialos en `js/platform.js`.

## Avisos
- Las cifras son estimaciones a partir de los datos introducidos. La fiscalidad y las decisiones societarias deben confirmarse con los asesores de la empresa; los porcentajes legales cambian con cada reforma.
- El agente de mercado necesita el servidor con la API de Claude: consulta fuentes oficiales (INE, Banco de España, BCE, Eurostat, FMI, OCDE, ministerios…) y cita fecha y fuente de cada dato. Sin servidor, «Cargar datos macro 2026» rellena los indicadores con datos de referencia consultados el 1 de octubre de 2026 (con su fuente), y se pueden editar a mano.
- Los escenarios fiscales de la inversión son una simplificación orientativa de la Ley del Impuesto sobre Sociedades (tablas de amortización, arts. 35, 102, 103 y 106): sirven para preparar la conversación con el asesor, no para liquidar.
- Los PDF escaneados (imágenes) no se pueden leer: hace falta un PDF con texto o la hoja de cálculo original.

## Archivos

```
atalaya/
├── index.html · acceso.html · app.html · estrategia.html · admin.html
├── css/atalaya.css · css/site.css · css/landing.css · css/eco.css · css/space.css · css/ruta.css · css/portal.css
├── js/
│   ├── platform.js     cuentas, acceso, uso y datos (servidor o demo local)
│   ├── sectors.js      perfiles sectoriales y datos de ejemplo
│   ├── engine.js       motor financiero, semáforos, riesgos, estructuras y plan
│   ├── content.js      diccionario, escenarios y fichas societarias
│   ├── docs.js         lectura de PDF, Word, Excel, CSV, Markdown y dictado
│   ├── financials.js   cuentas de varios años y flujo del dinero
│   ├── charts.js · scene3d.js · report.js · assistant.js · app.js · site.js · admin.js
│   ├── ruta.js         mapa de capas y hoja de ruta del simulador
│   ├── eco.js          el ecosistema en 3D de la página comercial
│   ├── space.js        espacio 3D de la página comercial: fondo, piezas flotantes y titulares con volumen
│   ├── portal.js       puesto de mando en 3D tras entrar
│   ├── cosmos.js       universo 3D detrás de cada pantalla de la aplicación
│   ├── grupo.js        vista de grupo y cartera de clientes
│   ├── reloj.js        reloj de tareas (módulo, flotante, ventana aparte)
│   └── strategy/       core · finance · commercial · operations · orgchart · plan · market · diagnostico · consultor-data · origen · consultor · ruta-est
├── manual.html         manual de uso
├── PLAN-GRUPOS.md      plan Grupos, precios por tramos, pago anual y lo construido
├── PUESTA-EN-MARCHA.md comprobaciones al subir al servidor y opciones de cobro
├── AUDITORIA-MODULOS.md hoja de ruta de diagnóstico: auditoría de consultor de cada módulo, hecho y aprobado
├── PLAN-MONETIZACION.md propuesta de packs de diagnóstico y crecimiento de ingresos
└── server/             server.mjs · package.json
```

## Planes y varias empresas

Esencial 49 €/mes y Profesional 129 €/mes (una empresa), Consultora 349 €/mes (hasta 15 empresas cliente) y Grupos por tramos de sociedades: 690 € (1-5), 970 € (6-10) y 1.790 € (más de 10). Pago anual con un 30 % de descuento. Cada empresa guarda sus datos aparte: en el servidor, las claves `simulador` y `estrategia` llevan el sufijo `--<id>` salvo la empresa principal; el registro de empresas es la clave `empresas` y los datos del grupo, `grupo`. Detalle en `PLAN-GRUPOS.md`.
