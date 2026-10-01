# Atalaya · Simulador de inversión y crecimiento

Herramienta web para decidir si una empresa puede afrontar una inversión nueva **sin romper liquidez y pagándola desde su propia rentabilidad**, y para anticipar qué necesitan su estructura financiera y su equipo para estar preparados.

Abre `index.html` en un navegador (o sirve la carpeta con `python3 -m http.server`). No necesita instalación ni servidor: todo el cálculo se hace en el navegador. La vista 3D carga Three.js desde cdnjs.

## Qué hace

| Bloque | Qué responde |
|---|---|
| **Puente de mando** | Veredicto de movimiento (Avanzar · Avanzar vigilando · Avanzar con condiciones · Rediseñar) y los indicadores clave del escenario activo. |
| **I. La empresa hoy** | Diez perfiles sectoriales (industria, distribución, hostelería, retail, construcción, servicios, tecnología, agro, salud, logística) con sus idiosincrasias: márgenes, peso salarial, días de cobro/stock/pago, estacionalidad, rampa y amplitud de mando. |
| **II. La inversión** | Dimensión frente a la actividad actual (sobre ventas, años de EBITDA, fondos propios, caja), financiación, cuota mensual, actividad nueva y contrataciones. |
| **III. Horizonte 3D** | *Paisaje*: superficie de una métrica (caja mínima, recuperación, cobertura, VAN) sobre dos variables a elegir, coloreada por semáforo; clic para aplicar una combinación. *Trayectorias*: la caja de los cinco escenarios mes a mes. |
| **IV. Escenarios** | Estrés, Pesimista, Base, Optimista e Hipótesis (editable), y campos hipotéticos activables: pérdida de cliente, caída de ventas, materias primas, tipos, cobros, convenio, gasto extraordinario. |
| **V. Semáforos y riesgos** | Diez semáforos de movimiento, matriz probabilidad × impacto, tornado de sensibilidad de la caja mínima y registro de riesgos con mitigación. |
| **VI. Nuevo tamaño operativo** | Hoy frente al año de crucero: ventas, EBITDA, margen, plantilla, peso salarial, ventas por persona, punto de equilibrio y circulante extra; EBITDA mensual frente a servicio de deuda. |
| **VII. Sistema operativo humano** | Preparación en seis dimensiones (mando, absorción, dependencia del fundador, procesos, estabilidad, reclutamiento) y calendario de lo que hace falta para estar listos. |
| **VIII. Estructuras societarias** | Inversión directa, leasing, filial, patrimonial + alquiler, socio inversor y joint venture comparadas con la misma meta y plazo. |
| **IX. Meta y plan de corrección** | Defines la posición meta y Atalaya busca la combinación mínima de palancas (financiación, plazo, carencia, cobros, pagos, contrataciones, fijos, margen, fases, capital) que la alcanza. |
| **X. Informe** | Dossier por escenarios con veredicto, semáforos, riesgos, sistema humano, estructura recomendada, plan de corrección y hoja de ruta a 30/90/180 días. |

La caja de herramientas flotante (icono de llave) permite cambiar escenario, sector y estructura, añadir hipótesis, guardar escenarios de trabajo en el navegador y copiar o pegar los datos.

## Modelo

- Proyección mensual a 60 meses de la empresa **con** y **sin** la inversión.
- Préstamo francés con carencia de intereses; deuda existente amortizándose al 4,5 %.
- Circulante calculado con días de cobro, stock y pago sobre la venta de cada mes.
- Impuesto de sociedades devengado sobre la base acumulada del año.
- Recuperación del proyecto = flujo operativo incremental acumulado frente a la inversión; recuperación de caja = mes en que la caja con inversión supera a la caja sin inversión.
- VAN al 8 % a cinco años con valor residual contable; TIR por bisección.

Es una herramienta de anticipación: los resultados dependen de los supuestos introducidos y no sustituyen el asesoramiento financiero, fiscal ni legal.

## Archivos

```
atalaya/
├── index.html
├── css/atalaya.css
└── js/
    ├── sectors.js   perfiles sectoriales y datos de ejemplo
    ├── engine.js    motor financiero, semáforos, riesgos, estructuras y plan
    ├── charts.js    gráficos SVG
    ├── scene3d.js   escena 3D (Three.js)
    ├── report.js    generador de informes
    └── app.js       interfaz
```
