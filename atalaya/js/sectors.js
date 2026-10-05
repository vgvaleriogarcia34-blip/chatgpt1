/* Atalaya · Perfiles sectoriales
 * Cada sector trae sus idiosincrasias: estructura de márgenes, peso salarial,
 * ciclo de caja (DSO/DIO/DPO), estacionalidad, velocidad de rampa comercial,
 * amplitud de mando razonable y tolerancias de endeudamiento.
 * Los ratios se aplican sobre las ventas actuales al cargar el perfil.
 */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});

  A.SECTORS = {
    industria: {
      nombre: 'Industria y fabricación',
      nota: 'Intensiva en capital, ciclo de caja largo por stock y cobro a 60-90 días.',
      margen: 36, personal: 22, fijos: 9, dso: 75, dio: 60, dpo: 60,
      estacionalidad: 0.06, pico: 5, rampa: 9, span: 12, salario: 34000,
      vidaUtil: 10, pesoSalarialMax: 26, deudaEbitdaMax: 3.0, crecimiento: 3
    },
    distribucion: {
      nombre: 'Distribución mayorista',
      nota: 'Margen estrecho, volumen alto: el circulante decide más que la cuenta de resultados.',
      margen: 22, personal: 9, fijos: 6, dso: 60, dio: 45, dpo: 55,
      estacionalidad: 0.08, pico: 11, rampa: 6, span: 10, salario: 30000,
      vidaUtil: 8, pesoSalarialMax: 11, deudaEbitdaMax: 3.0, crecimiento: 4
    },
    hosteleria: {
      nombre: 'Hostelería y restauración',
      nota: 'Cobro al contado, fuerte estacionalidad y plantilla elástica.',
      margen: 68, personal: 34, fijos: 21, dso: 2, dio: 8, dpo: 30,
      estacionalidad: 0.24, pico: 7, rampa: 4, span: 8, salario: 24000,
      vidaUtil: 8, pesoSalarialMax: 36, deudaEbitdaMax: 2.5, crecimiento: 3
    },
    retail: {
      nombre: 'Retail y comercio',
      nota: 'Cobro inmediato, stock pesado y alquileres como gran fijo.',
      margen: 46, personal: 15, fijos: 19, dso: 3, dio: 90, dpo: 60,
      estacionalidad: 0.18, pico: 12, rampa: 6, span: 10, salario: 24000,
      vidaUtil: 8, pesoSalarialMax: 17, deudaEbitdaMax: 2.5, crecimiento: 2
    },
    construccion: {
      nombre: 'Construcción e instalaciones',
      nota: 'Certificaciones a 90+ días, subcontratación y margen por obra.',
      margen: 26, personal: 15, fijos: 5, dso: 95, dio: 20, dpo: 75,
      estacionalidad: 0.1, pico: 6, rampa: 6, span: 10, salario: 34000,
      vidaUtil: 6, pesoSalarialMax: 18, deudaEbitdaMax: 2.5, crecimiento: 4
    },
    servicios: {
      nombre: 'Servicios profesionales',
      nota: 'El activo es el equipo: el peso salarial y la capacidad de mando mandan.',
      margen: 72, personal: 46, fijos: 12, dso: 60, dio: 0, dpo: 30,
      estacionalidad: 0.05, pico: 10, rampa: 8, span: 7, salario: 42000,
      vidaUtil: 5, pesoSalarialMax: 50, deudaEbitdaMax: 2.0, crecimiento: 6
    },
    tecnologia: {
      nombre: 'Tecnología y SaaS',
      nota: 'Margen bruto alto, rampa comercial lenta y talento caro.',
      margen: 76, personal: 50, fijos: 14, dso: 45, dio: 0, dpo: 30,
      estacionalidad: 0.03, pico: 12, rampa: 12, span: 7, salario: 48000,
      vidaUtil: 4, pesoSalarialMax: 55, deudaEbitdaMax: 2.0, crecimiento: 12
    },
    agro: {
      nombre: 'Agroalimentario',
      nota: 'Campañas marcadas, stock estacional y cobros largos a la gran distribución.',
      margen: 28, personal: 14, fijos: 8, dso: 70, dio: 75, dpo: 55,
      estacionalidad: 0.3, pico: 9, rampa: 9, span: 12, salario: 26000,
      vidaUtil: 12, pesoSalarialMax: 16, deudaEbitdaMax: 3.0, crecimiento: 3
    },
    salud: {
      nombre: 'Salud y clínicas',
      nota: 'Personal cualificado escaso, equipamiento caro y cobro mixto aseguradora/paciente.',
      margen: 66, personal: 40, fijos: 14, dso: 35, dio: 10, dpo: 30,
      estacionalidad: 0.06, pico: 3, rampa: 8, span: 8, salario: 38000,
      vidaUtil: 7, pesoSalarialMax: 44, deudaEbitdaMax: 2.5, crecimiento: 5
    },
    inmobiliaria: {
      nombre: 'Inversión inmobiliaria',
      nota: 'Compra, reforma y venta de inmuebles: el stock son los activos (de 9 a 14 meses en cartera) y el capital de los inversores permite llevar más activos con menos capital propio. Valores orientativos: se ajustan con las operaciones reales.',
      margen: 22, personal: 4, fijos: 3, dso: 5, dio: 300, dpo: 30,
      estacionalidad: 0.04, pico: 6, rampa: 12, span: 8, salario: 40000,
      vidaUtil: 30, pesoSalarialMax: 8, deudaEbitdaMax: 5.0, crecimiento: 6, inmo: true
    },
    logistica: {
      nombre: 'Logística y transporte',
      nota: 'Flota como inversión recurrente, combustible y conductores como variables críticas.',
      margen: 32, personal: 24, fijos: 6, dso: 65, dio: 3, dpo: 45,
      estacionalidad: 0.1, pico: 11, rampa: 5, span: 14, salario: 30000,
      vidaUtil: 7, pesoSalarialMax: 28, deudaEbitdaMax: 3.0, crecimiento: 4
    }
  };

  /* Estado de ejemplo: una industria familiar de 4,2 M€ que estudia una nueva línea. */
  A.defaultState = function () {
    return {
      empresaNombre: 'Empresa de ejemplo, S.L.', ejemplo: true,
      proyecto: 'Nueva línea de producción',
      sector: 'industria',
      empresa: {
        ventas: 4200000, margen: 38, personal: 882000, plantilla: 28,
        fijos: 336000, caja: 780000, deudaViva: 480000, cuotaDeuda: 11000,
        fondosPropios: 1600000, polizaLimite: 250000, polizaDispuesta: 0, polizaTipo: 5.5, polizaComision: 0.6, dso: 75, dio: 60, dpo: 60, crecimiento: 3, impuesto: 25
      },
      inversion: {
        importe: 1500000, pctFin: 70, tipo: 5.2, plazo: 7, carencia: 6,
        mesInicio: 3, aportacion: 0, incVentas: 45, rampa: 9, margenNuevo: 37,
        contrataciones: 7, salario: 34000, anticipo: 2, fijosNuevos: 110000, vidaUtil: 10, lineas: []
      },
      opciones: [],
      humano: {
        mandos: 3, mandosFormados: 35, dependencia: 70, procesos: 35, rotacion: 12, clima: 5, tiempoContratacion: 3,
        costeSeleccion: 3500, curva: 5, formacion: 14, sucesion: 30, polivalencia: 25, absentismo: 4.5, horasExtra: 9
      },
      meta: {
        cajaMin: 150000, paybackMax: 5, dscrMin: 1.25, deudaEbitdaMax: 3.0,
        pesoSalarialMax: 26, plazoObjetivo: 24, contarPoliza: true
      },
      estructura: 'directa',
      escenario: 'base',
      custom: { ventasF: 0.9, retraso: 2, margenDelta: -1, sobrecoste: 5, dsoDelta: 10, tipoDelta: 0.5 },
      hipotesis: [
        { id: 'h1', tipo: 'cliente', mes: 14, duracion: 60, magnitud: 8, activo: false }
      ]
    };
  };

  A.applySector = function (state, key) {
    const s = A.SECTORS[key];
    if (!s) return state;
    const v = state.empresa.ventas;
    state.sector = key;
    Object.assign(state.empresa, {
      margen: s.margen,
      personal: Math.round((v * s.personal) / 100 / 1000) * 1000,
      fijos: Math.round((v * s.fijos) / 100 / 1000) * 1000,
      dso: s.dso, dio: s.dio, dpo: s.dpo, crecimiento: s.crecimiento
    });
    Object.assign(state.inversion, {
      rampa: s.rampa, salario: s.salario, vidaUtil: s.vidaUtil, margenNuevo: Math.max(5, s.margen - 2)
    });
    Object.assign(state.meta, { pesoSalarialMax: s.pesoSalarialMax, deudaEbitdaMax: s.deudaEbitdaMax });
    return state;
  };
})();
