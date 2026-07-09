# RefCalc — Calculador de ciclo de refrigeración

Herramienta web que reproduce el cálculo central de **Danfoss Coolselector®2**: dado un
refrigerante y unas condiciones de operación, calcula el ciclo de compresión de vapor
completo (puntos de estado, prestaciones y diagrama presión–entalpía).

No requiere instalación ni conexión: abre `index.html` en cualquier navegador.

## Qué calcula

**Entradas**
- Refrigerante (16 fluidos: R-134a, R-290, R-717/NH₃, R-744/CO₂, R-410A, R-404A, R-32,
  R-1234yf, R-1234ze, R-22, etc.)
- Temperatura de evaporación y de condensación (°C)
- Recalentamiento útil y subenfriamiento (K)
- Rendimiento isentrópico del compresor (%)
- Capacidad frigorífica objetivo Q₀ (kW)

**Salidas**
- COP frigorífico, efecto refrigerante y trabajo de compresión (kJ/kg)
- Caudal másico y volumétrico de aspiración, capacidad volumétrica (kJ/m³)
- Potencia del compresor y calor rechazado en el condensador (kW)
- Relación de compresión, temperatura de descarga y título de vapor tras la expansión
- Tabla con los 4 puntos de estado (P, T, h, s)
- Diagrama log p–h con la campana de saturación y el ciclo superpuesto

## Método de cálculo

Las propiedades del refrigerante se obtienen con correlaciones de **estados
correspondientes**, usando únicamente constantes bien establecidas (masa molar, punto
crítico y factor acéntrico):

| Propiedad | Correlación |
|-----------|-------------|
| Presión de saturación | Lee–Kesler (Pitzer) |
| Calor de vaporización | Pitzer / Carruth–Kobayashi |
| Entalpía y entropía | integración de cₚ desde la referencia IIR (h = 200 kJ/kg, s = 1,00 kJ/kg·K en líquido saturado a 0 °C) |
| Volumen de vapor | gas ideal con factor de compresibilidad medio |

El ciclo se resuelve con compresión isentrópica corregida por el rendimiento, expansión
isentálpica y recalentamiento/subenfriamiento a presión constante.

### Precisión

Las presiones de saturación coinciden con REFPROP dentro del ~1 % para los fluidos
probados; entalpías y COP quedan típicamente dentro de ±3–10 %. Es una aproximación de
ingeniería para **dimensionado preliminar y docencia**, no un sustituto del software
certificado del fabricante ni de una base de datos tipo REFPROP/CoolProp.

### Limitaciones

- No soporta régimen **transcrítico** (p. ej. CO₂ con condensación por encima de 31 °C):
  la herramienta lo detecta y avisa.
- Las mezclas zeotrópicas (R-407C, R-410A…) se tratan como fluidos pseudo-puros, sin
  deslizamiento de temperatura (*glide*).
- No incluye pérdidas de carga en tuberías ni selección física de componentes
  (compresores, válvulas, intercambiadores) del catálogo Danfoss.

## Estructura

- `index.html` — interfaz
- `styles.css` — estilos
- `app.js` — motor termodinámico + lógica de UI + diagrama p–h (Canvas)
