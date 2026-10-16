# Empresa modelo de Atalaya 360°

Una empresa ficticia completa, coherente en todos los mundos, para enseñar Atalaya sin datos de clientes reales: ventas, compras, equipo, organigrama, cuentas de cinco años, impuestos, nuevas líneas de negocio y plan de crecimiento. Se elige como «empresa de prueba», se conecta o desconecta desde su ficha y sirve de base al paseo virtual.

## 1. La empresa

**Valdenorte Estructuras y Montajes, S.L.** (nombre inventado; cualquier parecido con una empresa real es casual).

- **Actividad:** fabricación y montaje de estructuras metálicas, carpintería metálica y calderería ligera para industria, agroalimentación y obra pública.
- **Dónde:** polígono industrial en Asturias, con una nave de 4.200 m².
- **Historia:** fundada en 1996 por Ramón Valdés. Es una empresa familiar en segunda generación: su hijo Javier lleva lo comercial y su hija Lucía, la administración y las finanzas. El relevo está pendiente.
- **Tamaño:** de 26 a 33 personas en cinco años, con ventas que pasan de 3,2 a 4,6 millones de euros.

### Cinco años (2021-2025)

| Año | Ventas | Margen bruto | Personal | Otros fijos | EBITDA | Plantilla | Días de cobro |
|---|---|---|---|---|---|---|---|
| 2021 | 3,20 M€ | 48 % | 0,96 M€ | 0,29 M€ | 0,29 M€ | 26 | 68 |
| 2022 | 3,75 M€ | 45 % | 1,07 M€ | 0,31 M€ | 0,31 M€ | 28 | 72 |
| 2023 | 4,10 M€ | 46 % | 1,18 M€ | 0,33 M€ | 0,38 M€ | 30 | 77 |
| 2024 | 4,38 M€ | 47 % | 1,27 M€ | 0,35 M€ | 0,44 M€ | 31 | 81 |
| 2025 | 4,62 M€ | 46 % | 1,36 M€ | 0,37 M€ | 0,40 M€ | 33 | 86 |

### Problemas sembrados (para que cada mundo tenga algo que descubrir)

1. **Caja tensa con ventas al alza:** los días de cobro suben de 68 a 86 y la póliza se usa cada vez más.
2. **Concentración de clientes:** el primer cliente supone el 31 % de las ventas.
3. **Margen desigual por línea:** los montajes dejan margen; la carpintería metálica apenas cubre costes.
4. **Dependencia del fundador:** todo pasa por Ramón (precios, compras grandes y plazos).
5. **Equipo saturado:** horas extra en taller y un encargado sin segundo.
6. **Stock de acero sin criterio:** se compra «cuando se ve que falta» y con picos de precio.
7. **Sucesión sin plan:** no hay protocolo familiar ni reparto claro de funciones.

### Nuevas líneas de negocio y plan de crecimiento

- **Mantenimiento industrial:** contratos anuales recurrentes con las plantas de sus clientes.
- **Naves modulares en kit:** un producto estándar que se vende por catálogo.
- **Inversión:** una línea de corte láser y plegado más la ampliación de la nave (1,2 M€), con seis contrataciones y 1,1 M€ más de ventas.

## 2. Cómo se conecta con todo

- **Una sola fuente:** `js/demo/empresa-modelo.js` guarda los datos maestros (años, clientes, productos, proveedores, personas, puestos y equipos). De ellos salen los datos de cada mundo: simulador, sistema estratégico, personas, mesa, cuaderno del consultor, libro y auditoría integral. Una cifra cambia en un único sitio y cambia en todos.
- **Nada al servidor:** la empresa modelo vive en el navegador. Sus datos se crean a partir de la fuente, se pueden tocar y se restablecen con un botón. No cuenta para el límite de empresas del plan.
- **Ficha de la empresa modelo:**
  - **Conectar o desconectar** cada mundo. Un mundo desconectado se queda a cero y los demás avisan de lo que falta.
  - **Ver como plan:** Esencial, Profesional, Consultora o Grupos. Enseña lo que abre cada plan, solo con la empresa modelo.
- **Elegir la empresa de prueba:** desde el mapa de empresas y desde cada mundo, según el plan.

## 3. Paseo virtual

- **Cuándo:** se activa a petición desde el mapa, con el botón «Paseo virtual».
- **Cómo:** recorre los mundos en orden y entra en cada uno con la empresa modelo. En cada parada dice qué potencial tiene ese mundo y qué beneficio genera, con las cifras de Valdenorte. Por ejemplo: «los días de cobro han pasado de 68 a 86: recuperarlos libera 230.000 € de caja».
- **Control:** se puede pausar, volver atrás, saltar o salir; al salir vuelve a la empresa con la que se estaba trabajando.

## 4. Fases

1. Datos maestros y generadores por mundo.
2. Empresa modelo en el registro, en la ficha (conexiones y vista por plan) y en cada mundo.
3. Paseo virtual desde el mapa.
4. Pruebas de cada mundo con la empresa modelo, manual y publicación.
