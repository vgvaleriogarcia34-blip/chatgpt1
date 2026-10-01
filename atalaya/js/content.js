/* Atalaya · Contenidos explicativos: contexto de escenarios, fichas de vehículos societarios y diccionario corporativo.
 * Todo el texto está pensado para un empresario sin formación financiera: qué es, por qué importa y qué lo mueve.
 */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});

  /* ---------- Contexto de cada escenario ---------- */
  A.SCENARIO_CONTEXT = {
    estres: {
      titulo: 'Estrés · «todo sale mal a la vez»',
      representa: 'Una prueba de resistencia, no una predicción. Combina a la vez la mitad de la venta prevista, seis meses de retraso, un 20 % de sobrecoste, clientes que pagan 30 días más tarde y tipos 2 puntos más altos.',
      cuando: 'Recesiones, la pérdida de un gran cliente justo en la rampa, una obra que se retrasa mientras ya pagas personal, o una crisis de materias primas.',
      senales: ['Pedidos marco que no se firman antes de invertir', 'Proveedor del equipo que no garantiza fecha', 'Clientes que ya están alargando pagos', 'Tipos de interés en tendencia al alza'],
      probabilidad: 'Baja (5-10 %), pero si ocurre decide la supervivencia.',
      respuesta: 'Si la empresa sobrevive al estrés con caja positiva o con póliza, la decisión es robusta. Si no, prepara antes un plan B: póliza más grande, inversión por fases o un socio.'
    },
    pesimista: {
      titulo: 'Pesimista · «el plan se queda corto»',
      representa: 'El 70 % de la venta prevista, 3 meses de retraso, 3 puntos menos de margen, 10 % de sobrecoste y cobros 15 días más lentos.',
      cuando: 'Es lo que les pasa a la mayoría de inversiones de pyme el primer año: la venta llega, pero más tarde y más cara de lo previsto.',
      senales: ['Clientes que dicen «sí» pero sin fecha', 'Primeras ofertas con descuentos para entrar', 'Curva de aprendizaje del equipo nuevo más lenta'],
      probabilidad: 'Media-alta (30-40 %). Es el escenario con el que conviene dimensionar la financiación.',
      respuesta: 'Debería cumplir al menos liquidez y cobertura. Si no las cumple, la financiación está mal dimensionada aunque el escenario base salga bien.'
    },
    base: {
      titulo: 'Base · «el plan de la dirección»',
      representa: 'Exactamente lo que has introducido: venta, margen, rampa, contrataciones y financiación.',
      cuando: 'Cuando la ejecución es correcta y el mercado responde como se esperaba.',
      senales: ['Cumplimiento mensual de la venta nueva frente al plan', 'Margen real de los primeros pedidos', 'Fecha real de puesta en marcha'],
      probabilidad: 'Media (30-40 %).',
      respuesta: 'Debe cumplir todas las metas. Si solo funciona aquí, el proyecto depende de que nada se tuerza.'
    },
    optimista: {
      titulo: 'Optimista · «el mercado tira»',
      representa: 'Un 15 % más de venta, un mes antes, 1,5 puntos más de margen y cobros 5 días más rápidos.',
      cuando: 'Lanzamientos con demanda ya probada, clientes que esperaban la capacidad nueva o un competidor que sale del mercado.',
      senales: ['Lista de espera de clientes', 'Pedidos firmados antes de la puesta en marcha'],
      probabilidad: 'Baja-media (15-20 %).',
      respuesta: 'Ojo: crecer más rápido también consume más caja en clientes y stock. Comprueba que el circulante no se dispara.'
    },
    hipotesis: {
      titulo: 'Hipótesis · «tu propio escenario»',
      representa: 'El escenario que construyes tú moviendo cada palanca: venta lograda, retraso, margen, sobrecoste, cobros y tipos.',
      cuando: 'Para responder preguntas concretas: «¿y si el cliente X tarda 6 meses más?», «¿y si sólo vendo el 80 %?».',
      senales: ['Las que tú elijas vigilar'],
      probabilidad: 'La que tú le asignes.',
      respuesta: 'Úsalo con los campos hipotéticos (pérdida de cliente, subida de tipos…) para ensayar golpes concretos.'
    }
  };

  /* ---------- Fichas de vehículos societarios ---------- */
  A.STRUCTURE_INFO = {
    directa: {
      como: 'La empresa que ya tienes compra el activo, firma el préstamo y contrata a las personas. Todo queda en el mismo balance.',
      flujo: { nodos: ['Socios', 'Sociedad operativa', 'Banco'], flechas: [[0, 1, 'capital'], [2, 1, 'préstamo'], [1, 2, 'cuotas']] },
      ventajas: ['Rápida: se puede ejecutar en semanas', 'Sin costes de estructura nuevos', 'La banca ya conoce a la empresa y su historial', 'El beneficio nuevo compensa directamente con el actual'],
      inconvenientes: ['Si el proyecto falla, arrastra al negocio que funciona', 'Aumenta el endeudamiento de la sociedad que genera la caja', 'Más difícil dar entrada a un socio solo en el negocio nuevo'],
      fiscal: ['Tributa todo junto en el Impuesto sobre Sociedades (tipo general del 25 %)', 'La amortización del activo y los intereses son gasto deducible (con el límite general de deducibilidad de gastos financieros)', 'Las pérdidas iniciales del proyecto reducen el impuesto del negocio actual'],
      requisitos: ['Capacidad de endeudamiento de la sociedad', 'Avales: es habitual que la banca pida el aval personal de los socios'],
      plazo: 'Inmediato (1 mes de tramitación bancaria).',
      coste: 'Sin costes de estructura. Comisión de apertura del préstamo (0,5-1 %).',
      conviene: 'Inversiones tácticas o relevantes, muy ligadas al negocio actual y con riesgo controlado.',
      riesgos: ['Concentración del riesgo en una sola sociedad', 'Covenants bancarios sobre deuda/EBITDA'],
      pasos: ['Preparar plan de inversión y proyección (este simulador)', 'Pedir ofertas a 2-3 entidades', 'Negociar plazo, carencia y garantías', 'Firmar y disponer contra facturas del proveedor']
    },
    leasing: {
      como: 'Una entidad financiera compra el activo y te lo cede a cambio de una cuota mensual. En el leasing tienes opción de compra al final; en el renting, no, y el mantenimiento suele ir incluido.',
      flujo: { nodos: ['Sociedad operativa', 'Entidad de leasing', 'Proveedor del activo'], flechas: [[1, 2, 'paga el activo'], [2, 0, 'entrega el activo'], [0, 1, 'cuota mensual']] },
      ventajas: ['No consume caja de entrada (financia el 100 %)', 'El propio activo es la garantía: menos avales personales', 'Tramitación rápida', 'En renting, cuota cerrada con mantenimiento'],
      inconvenientes: ['Coste financiero más alto que un préstamo (aquí +1,5 puntos)', 'Sin carencia: la cuota empieza antes de que llegue la venta', 'Plazos más cortos (máximo habitual 5-7 años)'],
      fiscal: ['En leasing, la parte de la cuota que amortiza el bien es deducible con límites y la de intereses, gasto financiero', 'El IVA se paga en cada cuota en lugar de todo al inicio', 'En renting, la cuota completa es gasto'],
      requisitos: ['Activo identificable y con mercado de segunda mano (maquinaria, vehículos, equipos)'],
      plazo: 'Inmediato.',
      coste: 'Tipo más alto y, a veces, una cuota inicial.',
      conviene: 'Activos estándar, cuando la caja de entrada es el problema y el retorno es rápido.',
      riesgos: ['Cuota desde el primer mes con la rampa aún vacía', 'Penalización por cancelación anticipada'],
      pasos: ['Pedir oferta al proveedor del activo y a 2 entidades', 'Comparar coste total (TAE), no solo la cuota', 'Revisar opción de compra y valor residual']
    },
    filial: {
      como: 'Se crea una sociedad nueva, propiedad de la actual (o de una holding), donde nace la actividad nueva con su propio balance, su préstamo y su equipo.',
      flujo: { nodos: ['Sociedad actual / holding', 'Filial nueva', 'Banco'], flechas: [[0, 1, 'capital y préstamo intragrupo'], [2, 1, 'préstamo'], [1, 0, 'dividendos']] },
      ventajas: ['Aísla el riesgo: si el proyecto falla, no arrastra a la matriz (salvo avales)', 'Facilita dar entrada a un socio o vender solo esa actividad', 'Cuentas claras: se ve si el proyecto gana o pierde', 'Permite incentivar a un directivo con participación en la filial'],
      inconvenientes: ['Costes de estructura (contabilidad, cuentas anuales, administración): unos 15-20 k€ al año', 'La banca pedirá aval de la matriz: el aislamiento real es parcial', 'Hay que documentar las operaciones entre sociedades a precio de mercado'],
      fiscal: ['Con un 75 % o más de participación puede formar grupo de consolidación fiscal: las pérdidas de la filial compensan los beneficios de la matriz', 'Los dividendos de la filial a la matriz están exentos al 95 % (participación mínima del 5 % durante un año)', 'Las operaciones intragrupo (servicios, préstamos, alquileres) deben valorarse a precio de mercado y documentarse'],
      requisitos: ['Constitución ante notario y registro', 'Capital inicial', 'Acuerdo de servicios con la matriz si comparten personal o instalaciones'],
      plazo: '2-3 meses hasta operar.',
      coste: 'Constitución 1-3 k€; estructura 15-20 k€ al año.',
      conviene: 'Actividad nueva con riesgo propio, diferente del negocio actual, o pensada para dar entrada a terceros.',
      riesgos: ['Garantías cruzadas que anulan el aislamiento', 'Confusión de patrimonios si no se separa bien la gestión'],
      pasos: ['Decidir si cuelga de la operativa o de una holding', 'Constituir la sociedad', 'Firmar contrato de servicios intragrupo', 'Financiar con capital y préstamo intragrupo a tipo de mercado']
    },
    patrimonial: {
      como: 'Los socios (o una holding) tienen una sociedad que compra el activo (nave, inmueble, a veces maquinaria) y se lo alquila a la sociedad operativa.',
      flujo: { nodos: ['Socios / holding', 'Sociedad patrimonial', 'Sociedad operativa'], flechas: [[0, 1, 'capital'], [1, 2, 'cede el activo'], [2, 1, 'alquiler mensual']] },
      ventajas: ['La operativa no se endeuda ni consume caja: paga un alquiler', 'Protege el patrimonio de un problema en la operativa', 'Facilita vender la operativa sin vender el inmueble', 'Planificación de la sucesión: el patrimonio se gestiona aparte'],
      inconvenientes: ['Alquiler a precio de mercado (aquí 7,5 % anual del valor)', 'El retorno del proyecto para la operativa empeora: el alquiler es un fijo más', 'Más tiempo de puesta en marcha (3-4 meses)', 'Requiere que los socios o la holding tengan capacidad de financiar la compra'],
      fiscal: ['El alquiler entre sociedades vinculadas debe estar a precio de mercado y documentado', 'El alquiler de inmuebles lleva IVA y, si es urbano, retención del 19 % que practica la operativa', 'La compra del inmueble tributa por IVA (si es nuevo) o por Transmisiones Patrimoniales (6-10 % según comunidad) si es de segunda mano', 'Si más de la mitad del activo de la patrimonial no está afecto a una actividad económica, puede perder incentivos fiscales: revisarlo con el asesor'],
      requisitos: ['Sociedad patrimonial existente o nueva', 'Contrato de arrendamiento entre sociedades'],
      plazo: '3-4 meses.',
      coste: 'Notaría, registro e impuestos de la compra; gestión de la patrimonial.',
      conviene: 'Inversiones inmobiliarias o activos de vida larga, en grupos familiares que quieren separar patrimonio y negocio.',
      riesgos: ['Calificación fiscal como entidad patrimonial', 'Alquileres fuera de mercado discutidos por Hacienda'],
      pasos: ['Valorar el alquiler de mercado', 'Financiar la compra en la patrimonial', 'Firmar contrato de arrendamiento', 'Revisar el encaje fiscal con el asesor']
    },
    socio: {
      como: 'Un inversor financiero (family office, fondo, business angel) aporta capital a cambio de un porcentaje del negocio nuevo. Aquí se modela que pone la mitad de la inversión y se queda un 35 % del beneficio nuevo.',
      flujo: { nodos: ['Socios actuales', 'Sociedad (o filial)', 'Socio inversor'], flechas: [[2, 1, 'capital'], [0, 1, 'capital'], [1, 2, 'dividendos y salida']] },
      ventajas: ['Reduce la deuda y protege la liquidez', 'Aporta disciplina de gestión, contactos y, a veces, clientes', 'Comparte el riesgo de pérdida'],
      inconvenientes: ['Diluye: renuncias a parte del beneficio futuro', 'Pierdes parte del control: el inversor pedirá derechos de veto', 'Proceso largo (4-8 meses) y costoso (asesores, due diligence)', 'El inversor querrá salir en 5-7 años: hay que prever cómo'],
      fiscal: ['La ampliación de capital está exenta del impuesto de operaciones societarias', 'Los dividendos tributan en el inversor según su naturaleza'],
      requisitos: ['Pacto de socios: veto en decisiones clave, arrastre y acompañamiento en la venta, preferencia en la liquidación', 'Valoración de la empresa o del proyecto', 'Plan de negocio auditado por el inversor'],
      plazo: '4-8 meses.',
      coste: 'Asesores legales y financieros: 2-5 % de la operación.',
      conviene: 'Inversiones transformacionales que la empresa no puede soportar con deuda.',
      riesgos: ['Conflicto de objetivos (el inversor busca salida, la familia continuidad)', 'Cláusulas de salida que obliguen a vender'],
      pasos: ['Decidir qué se vende: la empresa entera o solo la filial del proyecto', 'Preparar valoración y plan', 'Negociar pacto de socios', 'Ampliación de capital ante notario']
    },
    jv: {
      como: 'Un socio industrial del sector comparte al 50 % la inversión, la venta y el riesgo, normalmente a través de una sociedad conjunta (o una UTE para proyectos temporales).',
      flujo: { nodos: ['Tu empresa', 'Sociedad conjunta', 'Socio industrial'], flechas: [[0, 1, '50 % capital'], [2, 1, '50 % capital y canal'], [1, 0, '50 % beneficio']] },
      ventajas: ['Mitad de inversión y de riesgo', 'El socio aporta canal, tecnología o clientes: la rampa se acorta (aquí un 30 %)', 'Acceso a mercados que solo no alcanzarías'],
      inconvenientes: ['Solo te quedas con la mitad del beneficio', 'Riesgo de bloqueo con un 50/50', 'El socio aprende tu negocio', 'Negociación larga'],
      fiscal: ['Sociedad conjunta: tributa por el Impuesto sobre Sociedades; los dividendos a cada socio, exentos al 95 % si cumplen requisitos', 'UTE: régimen especial en el que los resultados se imputan a las empresas miembro'],
      requisitos: ['Pacto de socios con mecanismos de desbloqueo y salida', 'Reparto claro de funciones, precios de transferencia y no competencia'],
      plazo: '4-8 meses.',
      coste: 'Asesoría legal y estructura de la sociedad conjunta (unos 15 k€ al año).',
      conviene: 'Cuando el socio aporta algo que no puedes comprar: canal, tecnología, licencia o mercado.',
      riesgos: ['Bloqueo en decisiones', 'Dependencia del socio para vender', 'Salida desordenada'],
      pasos: ['Definir qué aporta cada parte', 'Negociar gobierno y desbloqueo', 'Constituir la sociedad conjunta', 'Contratos de suministro y distribución entre partes']
    }
  };

  /* Relaciones habituales dentro de un grupo de sociedades (para el asistente y las fichas) */
  A.GROUP_TOPICS = [
    { k: ['holding', 'sociedad holding', 'cabecera'], t: 'Holding', d: 'Sociedad cabecera que posee las participaciones de las demás. Concentra dividendos (exentos al 95 % si posee al menos el 5 % durante un año), centraliza decisiones y facilita la sucesión familiar y la entrada de socios en una sola filial.' },
    { k: ['préstamo intragrupo', 'prestamo intragrupo', 'prestar entre sociedades', 'préstamo entre sociedades'], t: 'Préstamos intragrupo', d: 'Una sociedad del grupo presta a otra. Deben formalizarse por escrito y a un tipo de interés de mercado; si no, Hacienda puede ajustar el resultado. Son útiles para mover excedentes de caja hacia la sociedad que invierte.' },
    { k: ['cash pooling', 'tesorería centralizada', 'centralizar caja'], t: 'Gestión centralizada de tesorería', d: 'Las cuentas de las sociedades del grupo se agrupan para que los excedentes de una cubran los déficits de otra. Reduce el uso de pólizas, pero exige contrato y registrar los saldos como préstamos intragrupo.' },
    { k: ['consolidación fiscal', 'consolidacion fiscal', 'grupo fiscal'], t: 'Consolidación fiscal', d: 'Con al menos el 75 % de participación (y mayoría de votos), las sociedades pueden tributar como un solo grupo: las pérdidas de una compensan los beneficios de otra en el mismo año.' },
    { k: ['garantía cruzada', 'garantias cruzadas', 'aval de la matriz', 'aval matriz'], t: 'Garantías cruzadas', d: 'Una sociedad avala las deudas de otra. Abre la puerta a financiación, pero elimina el aislamiento del riesgo que buscabas al separar sociedades.' },
    { k: ['operaciones vinculadas', 'precio de transferencia', 'precios de transferencia'], t: 'Operaciones vinculadas', d: 'Toda operación entre sociedades del grupo o con sus socios (servicios, alquileres, préstamos, ventas) debe valorarse a precio de mercado y, según su importe, documentarse.' },
    { k: ['dividendo', 'dividendos', 'repartir beneficio'], t: 'Dividendos dentro del grupo', d: 'Los dividendos que una filial paga a la matriz están exentos al 95 % si la participación es de al menos el 5 % durante un año. Así el dinero puede subir a la holding y bajar a la sociedad que invierte sin apenas coste fiscal.' },
    { k: ['sucesión', 'sucesion', 'relevo generacional', 'empresa familiar'], t: 'Sucesión en la empresa familiar', d: 'Separar patrimonio (patrimonial) y negocio (operativa) bajo una holding facilita repartir entre herederos, dar entrada a gestores y aplicar las reducciones fiscales de la empresa familiar si se cumplen sus requisitos.' }
  ];

  /* ---------- Diccionario corporativo ----------
   * cat: categoría · d: definición llana · f: fórmula · ej: ejemplo · dir: variables que lo mueven directamente · ind: variables que lo mueven a través de otra magnitud
   */
  A.GLOSSARY = [
    { t: 'Ventas (cifra de negocio)', cat: 'Cuenta de resultados', d: 'Todo lo que la empresa factura por su actividad en un año, sin IVA.', ej: '4,2 M€ al año son 350 k€ al mes de media.', dir: ['empresa.ventas', 'inversion.incVentas'], ind: ['empresa.crecimiento', 'inversion.rampa'] },
    { t: 'Margen bruto', cat: 'Cuenta de resultados', d: 'Lo que queda de cada euro vendido después de pagar lo que cuesta directamente lo vendido (materiales, mercancía, subcontratas directas).', f: '(ventas − coste de ventas) ÷ ventas', ej: 'Un margen del 38 % significa que de cada 100 € vendidos quedan 38 € para pagar personal, fijos, deuda e impuestos.', dir: ['empresa.margen', 'inversion.margenNuevo'], ind: ['inversion.incVentas'] },
    { t: 'Margen de contribución', cat: 'Cuenta de resultados', d: 'Lo que aporta cada producto o cliente para cubrir los costes fijos, después de todos sus costes variables (no solo los de compra: también transporte, comisiones, rappels).', f: 'precio − coste variable unitario', ej: 'Si vendes a 100 € y te cuesta 62 € en variables, contribuyes con 38 € a pagar los fijos.', dir: ['Precio', 'Coste variable'], ind: ['Mix de productos', 'Descuentos'] },
    { t: 'Costes fijos', cat: 'Cuenta de resultados', d: 'Los que pagas vendas o no: alquileres, nóminas de estructura, seguros, asesorías, suministros base.', ej: 'Si dejas de vender un mes, los fijos siguen llegando.', dir: ['empresa.fijos', 'empresa.personal', 'inversion.fijosNuevos'], ind: ['inversion.contrataciones'] },
    { t: 'Costes variables', cat: 'Cuenta de resultados', d: 'Los que suben y bajan con lo que vendes: materia prima, mercancía, transporte de entrega, comisiones de venta.', ej: 'Vender el doble duplica aproximadamente los variables.', dir: ['empresa.margen'], ind: ['inversion.incVentas'] },
    { t: 'EBITDA', cat: 'Cuenta de resultados', d: 'Beneficio operativo antes de intereses, impuestos y amortizaciones. Mide lo que genera el negocio en sí, sin cómo se financia ni cuánto se ha invertido.', f: 'margen bruto − personal − otros gastos fijos', ej: 'Con 4,2 M€ de venta, 38 % de margen, 882 k€ de personal y 336 k€ de fijos, el EBITDA es de unos 378 k€.', dir: ['empresa.margen', 'empresa.personal', 'empresa.fijos'], ind: ['empresa.ventas', 'inversion.incVentas', 'inversion.margenNuevo'] },
    { t: 'Amortización', cat: 'Cuenta de resultados', d: 'Reparto del coste de una inversión a lo largo de su vida útil. Es gasto contable que reduce impuestos, pero no sale dinero del banco.', f: 'inversión ÷ años de vida útil', ej: 'Una máquina de 1,5 M€ con 10 años de vida amortiza 150 k€ al año.', dir: ['inversion.importe', 'inversion.vidaUtil'], ind: [] },
    { t: 'Punto de equilibrio', cat: 'Cuenta de resultados', d: 'La venta mínima para no perder dinero: la que cubre exactamente todos los costes fijos con el margen.', f: 'costes fijos ÷ margen bruto %', ej: 'Con 1,2 M€ de fijos y 38 % de margen necesitas vender 3,2 M€ para no perder.', dir: ['empresa.fijos', 'empresa.personal', 'empresa.margen'], ind: ['inversion.fijosNuevos', 'inversion.contrataciones'] },
    { t: 'Peso salarial', cat: 'Personas', d: 'Lo que pesa el coste de toda la plantilla sobre las ventas. Cada sector tiene un rango sano.', f: 'coste de personal ÷ ventas', ej: 'Un 21 % significa que 21 de cada 100 € vendidos se destinan a personal.', dir: ['empresa.personal', 'inversion.contrataciones', 'inversion.salario'], ind: ['empresa.ventas', 'humano.absentismo'] },
    { t: 'Ventas por persona', cat: 'Personas', d: 'Productividad media: cuánto vende la empresa por cada persona en plantilla.', f: 'ventas ÷ plantilla', ej: 'Si al crecer baja, estás creciendo con horas, no con eficiencia.', dir: ['empresa.plantilla', 'inversion.contrataciones'], ind: ['inversion.incVentas', 'humano.curva'] },
    { t: 'Amplitud de mando', cat: 'Personas', d: 'Número de personas que un responsable puede dirigir bien. Depende del sector y de lo estandarizado que esté el trabajo.', ej: 'En industria, 10-14 personas; en servicios profesionales, 6-8.', dir: ['humano.mandos'], ind: ['inversion.contrataciones'] },
    { t: 'eNPS (clima)', cat: 'Personas', d: 'Indicador de clima: porcentaje de empleados que recomendarían trabajar en la empresa menos los que no.', f: '% promotores − % detractores', ej: 'Un eNPS negativo anticipa rotación.', dir: ['humano.clima'], ind: ['humano.horasExtra', 'humano.formacion'] },
    { t: 'Rotación', cat: 'Personas', d: 'Porcentaje de la plantilla que se va en un año.', f: 'bajas voluntarias ÷ plantilla media', ej: 'Un 15 % en una plantilla de 30 son 4-5 salidas al año.', dir: ['humano.rotacion'], ind: ['humano.clima', 'humano.horasExtra'] },
    { t: 'Absentismo', cat: 'Personas', d: 'Horas pagadas que no se trabajan (bajas, ausencias). Encarece cada puesto.', ej: 'Un 5 % de absentismo en 30 personas equivale a 1,5 personas pagadas sin trabajar.', dir: ['humano.absentismo'], ind: ['humano.clima', 'humano.horasExtra'] },
    { t: 'Curva de aprendizaje', cat: 'Personas', d: 'Meses que tarda una persona nueva en rendir al 100 %.', ej: 'Si la curva es de 6 meses y la rampa comercial de 4, la rampa real será de 6.', dir: ['humano.curva'], ind: ['humano.procesos', 'humano.formacion'] },
    { t: 'Caja (tesorería)', cat: 'Liquidez', d: 'El dinero disponible en el banco. Es lo que paga nóminas y proveedores, no el beneficio.', ej: 'Una empresa puede ganar dinero y quedarse sin caja si cobra tarde.', dir: ['empresa.caja'], ind: ['empresa.dso', 'empresa.dpo', 'inversion.pctFin'] },
    { t: 'Liquidez disponible', cat: 'Liquidez', d: 'Caja en el banco más la parte de la póliza de crédito que aún no has usado: el dinero que podrías usar mañana.', f: 'caja + (límite de póliza − dispuesto)', ej: '80 k€ en banco y una póliza de 250 k€ sin usar suman 330 k€ de liquidez.', dir: ['empresa.caja', 'empresa.polizaLimite'], ind: ['empresa.dso', 'inversion.pctFin'] },
    { t: 'Póliza de crédito', cat: 'Liquidez', d: 'Línea de financiación que el banco deja disponible hasta un límite. Solo pagas intereses por lo que usas, más una comisión pequeña por lo que no usas. Se renueva cada año.', ej: 'Una póliza de 250 k€ al 5,5 % con 100 k€ dispuestos cuesta unos 458 € al mes de intereses.', dir: ['empresa.polizaLimite', 'empresa.polizaTipo', 'empresa.polizaComision'], ind: ['empresa.dso'] },
    { t: 'Meses de colchón', cat: 'Liquidez', d: 'Cuántos meses podría la empresa pagar nóminas, fijos y cuotas con la liquidez que tiene, sin ingresar nada.', f: 'liquidez ÷ (personal + fijos + cuotas del mes)', ej: 'Menos de 1 mes es zona de riesgo; 3 meses es un colchón sano para una pyme.', dir: ['empresa.caja', 'empresa.polizaLimite'], ind: ['empresa.personal', 'empresa.fijos', 'inversion.pctFin'] },
    { t: 'Circulante (fondo de maniobra operativo)', cat: 'Liquidez', d: 'Dinero que la empresa tiene atrapado en clientes que aún no han pagado y en almacén, menos lo que todavía debe a proveedores.', f: 'clientes + stock − proveedores', ej: 'Vender más a 75 días obliga a financiar 75 días de esa venta nueva.', dir: ['empresa.dso', 'empresa.dio', 'empresa.dpo'], ind: ['inversion.incVentas', 'empresa.ventas'] },
    { t: 'Días de cobro (DSO)', cat: 'Liquidez', d: 'Días que tardan de media los clientes en pagar.', f: 'saldo de clientes ÷ ventas × 365', ej: 'Bajar de 75 a 60 días en una empresa de 4,2 M€ libera unos 170 k€.', dir: ['empresa.dso'], ind: ['inversion.incVentas'] },
    { t: 'Días de stock (DIO)', cat: 'Liquidez', d: 'Días de venta que tienes almacenados.', f: 'existencias ÷ coste de ventas × 365', dir: ['empresa.dio'], ind: ['inversion.incVentas'] },
    { t: 'Días de pago (DPO)', cat: 'Liquidez', d: 'Días que tardas de media en pagar a proveedores. Financian parte del circulante.', f: 'saldo de proveedores ÷ compras × 365', dir: ['empresa.dpo'], ind: [] },
    { t: 'Cuota (sistema francés)', cat: 'Financiación', d: 'Pago mensual constante de un préstamo que incluye intereses (más al principio) y devolución del capital (más al final).', ej: '1,05 M€ a 7 años al 5,2 % con 6 meses de carencia son unos 16 k€ al mes.', dir: ['inversion.pctFin', 'inversion.plazo', 'inversion.tipo', 'inversion.carencia'], ind: ['inversion.importe'] },
    { t: 'Carencia', cat: 'Financiación', d: 'Meses al inicio del préstamo en los que solo se pagan intereses. Debe coincidir con la rampa, cuando todavía no hay venta nueva.', dir: ['inversion.carencia'], ind: ['inversion.rampa'] },
    { t: 'DSCR (cobertura del servicio de la deuda)', cat: 'Financiación', d: 'Cuántas veces el dinero que genera el negocio cubre las cuotas de todos los préstamos. La banca suele exigir 1,2 o más.', f: '(EBITDA − impuestos) ÷ (capital + intereses del año)', dir: ['inversion.plazo', 'inversion.carencia', 'inversion.tipo'], ind: ['inversion.margenNuevo', 'inversion.incVentas'] },
    { t: 'Deuda financiera neta / EBITDA', cat: 'Financiación', d: 'Años de beneficio operativo que harían falta para devolver toda la deuda con bancos, descontando la caja.', f: '(deuda bancaria − caja) ÷ EBITDA', ej: 'Por encima de 3 veces, la banca empieza a poner condiciones.', dir: ['inversion.pctFin', 'inversion.aportacion', 'empresa.deudaViva'], ind: ['inversion.margenNuevo', 'inversion.incVentas'] },
    { t: 'Covenant', cat: 'Financiación', d: 'Condición que impone el banco en un préstamo (por ejemplo, deuda/EBITDA por debajo de 3). Si se incumple, puede exigir la devolución anticipada.', dir: [], ind: ['inversion.pctFin'] },
    { t: 'Aval personal', cat: 'Financiación', d: 'Garantía con la que el socio responde con su patrimonio de una deuda de la empresa.', dir: [], ind: [] },
    { t: 'Recuperación (payback)', cat: 'Rentabilidad', d: 'Tiempo que tarda la inversión en devolver lo invertido con el dinero que genera.', ej: 'Si genera 300 k€ al año y costó 1,5 M€, se recupera en unos 5 años.', dir: ['inversion.importe', 'inversion.incVentas', 'inversion.margenNuevo'], ind: ['inversion.rampa', 'inversion.fijosNuevos'] },
    { t: 'VAN (valor actual neto)', cat: 'Rentabilidad', d: 'Lo que vale hoy todo el dinero que generará la inversión, descontado al coste del dinero, menos lo invertido. Positivo: crea valor.', f: 'Σ flujos ÷ (1 + 8 %)^año − inversión', dir: ['inversion.importe', 'inversion.margenNuevo', 'inversion.incVentas'], ind: ['inversion.rampa'] },
    { t: 'TIR (tasa interna de retorno)', cat: 'Rentabilidad', d: 'La rentabilidad anual que da el proyecto. Debe superar con holgura lo que cuesta el dinero.', ej: 'Una TIR del 6 % con un préstamo al 5,2 % deja muy poco margen de error.', dir: ['inversion.margenNuevo', 'inversion.incVentas', 'inversion.importe'], ind: ['inversion.vidaUtil'] },
    { t: 'Rampa comercial', cat: 'Estrategia', d: 'Meses desde que arranca la actividad nueva hasta que vende a pleno rendimiento.', dir: ['inversion.rampa'], ind: ['humano.curva'] },
    { t: 'Año de crucero', cat: 'Estrategia', d: 'El primer año completo con la actividad nueva a pleno rendimiento. Es la foto del «nuevo tamaño» de la empresa.', dir: ['inversion.rampa', 'inversion.mesInicio'], ind: [] },
    { t: 'Análisis ABC', cat: 'Estrategia', d: 'Clasifica clientes, productos o proveedores según cuánto pesan: A (los pocos que suman el 80 %), B (el siguiente 15 %) y C (el resto).', ej: 'Es habitual que el 20 % de los clientes sume el 80 % de la venta.', dir: [], ind: [] },
    { t: 'ABC prima (ABC′)', cat: 'Estrategia', d: 'El mismo análisis ABC pero por margen de contribución en lugar de por venta. Cruzar ambos muestra quién vende mucho pero aporta poco, y al revés.', ej: 'Un cliente A en venta y C en margen es un cliente que te hace grande pero no rico.', dir: [], ind: [] },
    { t: 'Desviación presupuestaria', cat: 'Estrategia', d: 'Diferencia entre lo presupuestado y lo real. Se analiza por volumen (vendes más o menos unidades), precio y mix (vendes otra combinación).', f: 'real − presupuesto', dir: [], ind: [] },
    { t: 'Fondos propios (patrimonio neto)', cat: 'Balance', d: 'Lo que vale contablemente la empresa para sus socios: capital aportado más beneficios no repartidos.', dir: ['empresa.fondosPropios'], ind: ['inversion.aportacion'] },
    { t: 'Fondo de maniobra', cat: 'Balance', d: 'Activo corriente menos pasivo corriente. Si es negativo, la empresa financia su día a día con deuda a corto.', f: 'activo corriente − pasivo corriente', dir: [], ind: ['empresa.dso', 'empresa.dpo', 'empresa.caja'] },
    { t: 'ROE (rentabilidad de los fondos propios)', cat: 'Balance', d: 'Lo que gana el socio por cada euro que tiene en la empresa.', f: 'beneficio neto ÷ fondos propios', dir: [], ind: ['empresa.margen', 'empresa.fondosPropios'] },
    { t: 'Política de dividendos (payout)', cat: 'Gobierno', d: 'Parte del beneficio que se reparte a los socios. Lo que no se reparte se reinvierte y refuerza los fondos propios.', f: 'dividendos ÷ beneficio neto', dir: [], ind: ['empresa.fondosPropios'] },
    { t: 'Sociedad holding', cat: 'Societario', d: 'Sociedad cabecera que posee las participaciones de las sociedades del grupo.', dir: [], ind: [] },
    { t: 'Consolidación fiscal', cat: 'Societario', d: 'Régimen en el que un grupo (participación ≥ 75 %) tributa como una sola empresa y compensa pérdidas y beneficios entre sociedades.', dir: [], ind: [] },
    { t: 'Operación vinculada', cat: 'Societario', d: 'Operación entre sociedades del mismo grupo o con sus socios. Debe hacerse a precio de mercado.', dir: [], ind: [] },
    { t: 'Joint venture', cat: 'Societario', d: 'Alianza en la que dos empresas crean un proyecto o sociedad común compartiendo inversión, riesgo y beneficio.', dir: [], ind: [] },
    { t: 'Leasing y renting', cat: 'Societario', d: 'Fórmulas para usar un activo pagando una cuota. El leasing incluye opción de compra; el renting incluye servicios y no aparece como deuda bancaria.', dir: [], ind: [] }
  ];

  /* Conceptos del sistema estratégico */
  A.GLOSSARY.push(
    { t: 'Flujo del dinero (estado de origen y aplicación de fondos)', cat: 'Liquidez', d: 'Explica por qué el beneficio no coincide con lo que hay en el banco: qué generó el negocio y en qué se aplicó (clientes, stock, inversiones, deuda, dividendos).', f: 'beneficio + amortización ± circulante − inversión ± deuda − dividendos = variación de caja', dir: ['empresa.dso', 'empresa.dio', 'empresa.dpo'], ind: ['inversion.importe'] },
    { t: 'Recursos generados', cat: 'Liquidez', d: 'Beneficio más amortización: el dinero que produce el negocio antes de financiar clientes, stock e inversiones.', f: 'beneficio neto + amortización', dir: [], ind: ['empresa.margen'] },
    { t: 'IVA', cat: 'Impuestos', d: 'Impuesto que cobras a tus clientes y pagas a tus proveedores. Ingresas la diferencia cada trimestre (modelo 303). No es un coste, pero mueve mucha caja.', f: 'IVA repercutido − IVA soportado', dir: [], ind: ['empresa.dso'] },
    { t: 'Pago fraccionado', cat: 'Impuestos', d: 'Anticipo del Impuesto sobre Sociedades que se paga en abril, octubre y diciembre (modelo 202), normalmente el 18 % de la cuota del último año.', dir: [], ind: [] },
    { t: 'Retenciones', cat: 'Impuestos', d: 'Parte del salario o del alquiler que la empresa retiene y entrega a Hacienda en nombre del trabajador o del arrendador (modelos 111 y 115).', dir: [], ind: ['empresa.personal'] },
    { t: 'Reserva de capitalización', cat: 'Impuestos', d: 'Reducción de la base imponible por dejar beneficios dentro de la empresa en lugar de repartirlos, con la condición de mantenerlos varios años.', dir: [], ind: ['empresa.fondosPropios'] },
    { t: 'Reserva de nivelación', cat: 'Impuestos', d: 'Permite a las empresas de reducida dimensión rebajar la base imponible de hoy y compensarla con pérdidas futuras: aplaza impuestos.', dir: [], ind: [] },
    { t: 'Tesorería a 13 semanas', cat: 'Liquidez', d: 'Previsión de cobros y pagos semana a semana durante un trimestre. Anticipa los baches de caja antes de que lleguen.', dir: ['empresa.caja', 'empresa.polizaLimite'], ind: ['empresa.dso', 'empresa.dpo'] },
    { t: 'Tiempo facturable', cat: 'Personas', d: 'Parte de las horas del equipo dedicada directamente a producir lo que se vende. El resto lo consume el sistema interno: gestión, reuniones, errores y esperas.', f: 'horas facturables ÷ horas totales', dir: [], ind: ['humano.procesos'] },
    { t: 'Lean', cat: 'Operaciones', d: 'Método para producir más con lo mismo eliminando todo lo que no aporta valor al cliente: esperas, movimientos, stock, errores.', dir: [], ind: [] },
    { t: 'Takt time', cat: 'Operaciones', d: 'Ritmo al que hay que producir para atender exactamente la demanda.', f: 'tiempo disponible ÷ demanda', ej: '900 minutos al día y 400 unidades pedidas: una unidad cada 2,25 minutos.', dir: [], ind: [] },
    { t: 'Cuello de botella', cat: 'Operaciones', d: 'El paso más lento del proceso. Marca la capacidad de toda la empresa: mejorar cualquier otro paso no aumenta la producción.', dir: [], ind: [] },
    { t: 'OEE', cat: 'Operaciones', d: 'Eficiencia global de una máquina: cuánto de su tiempo produce piezas buenas a la velocidad correcta. Un 85 % es clase mundial; por debajo del 60 % hay mucho margen.', f: 'disponibilidad × rendimiento × calidad', dir: [], ind: [] },
    { t: 'Lead time', cat: 'Operaciones', d: 'Tiempo total que tarda un pedido desde que entra hasta que sale, incluidas las esperas.', dir: [], ind: [] },
    { t: 'Los 8 desperdicios', cat: 'Operaciones', d: 'Transporte, inventario, movimientos, esperas, sobreproceso, sobreproducción, defectos y talento no aprovechado.', dir: [], ind: [] },
    { t: '5S', cat: 'Operaciones', d: 'Método de orden en el puesto de trabajo: clasificar, ordenar, limpiar, estandarizar y mantener la disciplina.', dir: [], ind: [] },
    { t: 'Kaizen', cat: 'Operaciones', d: 'Mejora continua a base de pequeños cambios propuestos por quienes hacen el trabajo.', dir: [], ind: [] },
    { t: 'Matriz de Kraljic', cat: 'Estrategia', d: 'Clasifica proveedores por su peso en el gasto y el riesgo de suministro: estratégicos, apalancados, cuello de botella y no críticos.', dir: [], ind: [] },
    { t: 'OTIF', cat: 'Operaciones', d: 'Porcentaje de pedidos entregados a tiempo y completos (On Time In Full).', f: '% a tiempo × % completos', dir: [], ind: [] },
    { t: 'CAC y LTV', cat: 'Estrategia', d: 'CAC es lo que cuesta conseguir un cliente; LTV, el margen que deja durante toda la relación. Un canal sano tiene un LTV de al menos 3 veces el CAC.', dir: [], ind: [] },
    { t: 'Pipeline comercial', cat: 'Estrategia', d: 'Conjunto de oportunidades de venta abiertas con su probabilidad de cierre. La previsión ponderada multiplica cada importe por su probabilidad.', dir: [], ind: [] },
    { t: 'Análisis PESTEL y macro', cat: 'Estrategia', d: 'Revisión del entorno político, económico, social, tecnológico, ecológico y legal, y de indicadores como PIB, inflación, tipos y paro, para anticipar su efecto en ventas, costes y financiación.', dir: [], ind: [] },
    { t: 'Euríbor', cat: 'Financiación', d: 'Tipo de referencia al que se prestan los bancos de la zona euro. La mayoría de préstamos a tipo variable se calculan como Euríbor más un diferencial.', dir: ['inversion.tipo'], ind: [] },
    { t: 'Cascada de objetivos (macro → micro)', cat: 'Estrategia', d: 'Bajar un objetivo general de la empresa a objetivos de cada área, sus indicadores y acciones concretas con responsable y fecha.', dir: [], ind: [] }
  );

  A.FIELD_LABELS = {
    'empresa.ventas': 'Ventas anuales', 'empresa.margen': 'Margen bruto', 'empresa.personal': 'Coste de personal', 'empresa.fijos': 'Otros gastos fijos',
    'empresa.plantilla': 'Plantilla', 'empresa.crecimiento': 'Crecimiento orgánico', 'empresa.caja': 'Caja disponible', 'empresa.deudaViva': 'Deuda viva',
    'empresa.cuotaDeuda': 'Cuota actual', 'empresa.fondosPropios': 'Fondos propios', 'empresa.dso': 'Días de cobro', 'empresa.dio': 'Días de stock', 'empresa.dpo': 'Días de pago',
    'empresa.polizaLimite': 'Límite de la póliza', 'empresa.polizaTipo': 'Tipo de la póliza', 'empresa.polizaComision': 'Comisión de no disposición', 'empresa.polizaDispuesta': 'Póliza ya dispuesta',
    'inversion.importe': 'Importe de la inversión', 'inversion.pctFin': 'Parte financiada', 'inversion.aportacion': 'Aportación de socios', 'inversion.tipo': 'Tipo de interés',
    'inversion.plazo': 'Plazo del préstamo', 'inversion.carencia': 'Carencia', 'inversion.mesInicio': 'Mes de la inversión', 'inversion.incVentas': 'Venta nueva',
    'inversion.margenNuevo': 'Margen nuevo', 'inversion.rampa': 'Meses de rampa', 'inversion.fijosNuevos': 'Fijos nuevos', 'inversion.vidaUtil': 'Vida útil',
    'inversion.contrataciones': 'Contrataciones', 'inversion.salario': 'Coste por persona', 'inversion.anticipo': 'Anticipo de contratación',
    'humano.mandos': 'Mandos intermedios', 'humano.dependencia': 'Dependencia del fundador', 'humano.procesos': 'Procesos documentados', 'humano.rotacion': 'Rotación',
    'humano.tiempoContratacion': 'Meses para contratar', 'humano.curva': 'Curva de aprendizaje', 'humano.formacion': 'Formación', 'humano.sucesion': 'Puestos con sustituto',
    'humano.polivalencia': 'Polivalencia', 'humano.absentismo': 'Absentismo', 'humano.horasExtra': 'Horas extra', 'humano.clima': 'Clima (eNPS)', 'humano.mandosFormados': 'Mandos formados',
    'humano.costeSeleccion': 'Coste de selección'
  };
  A.fieldLabel = (p) => A.FIELD_LABELS[p] || p;
})();
