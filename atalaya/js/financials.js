/* Atalaya · Cuentas históricas
 * Importa balances y cuentas de resultados de varios años (CSV, Excel o pegado desde una hoja),
 * calcula la evolución, proyecta tres años y deduce las políticas de gobierno que reflejan los números.
 */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const FIN = (A.fin = {});

  FIN.CONCEPTS = [
    { k: 'ventas', l: 'Ventas (importe neto de la cifra de negocio)', g: 'PyG', syn: ['ventas', 'cifra de negocio', 'importe neto', 'ingresos', 'facturación', 'facturacion'] },
    { k: 'costeVentas', l: 'Coste de ventas (aprovisionamientos)', g: 'PyG', syn: ['aprovisionamientos', 'coste de ventas', 'coste ventas', 'compras', 'consumos', 'coste de las ventas'] },
    { k: 'personal', l: 'Gastos de personal', g: 'PyG', syn: ['gastos de personal', 'personal', 'sueldos', 'salarios'] },
    { k: 'otrosGastos', l: 'Otros gastos de explotación', g: 'PyG', syn: ['otros gastos de explotación', 'otros gastos de explotacion', 'otros gastos', 'servicios exteriores', 'gastos generales'] },
    { k: 'amortizacion', l: 'Amortización del inmovilizado', g: 'PyG', syn: ['amortización', 'amortizacion', 'dotación amortización'] },
    { k: 'gastosFinancieros', l: 'Gastos financieros', g: 'PyG', syn: ['gastos financieros', 'intereses'] },
    { k: 'impuestos', l: 'Impuesto sobre beneficios', g: 'PyG', syn: ['impuesto sobre beneficios', 'impuesto de sociedades', 'impuestos', 'is'] },
    { k: 'beneficio', l: 'Resultado del ejercicio', g: 'PyG', syn: ['resultado del ejercicio', 'beneficio neto', 'resultado neto', 'beneficio', 'resultado'] },
    { k: 'dividendos', l: 'Dividendos repartidos', g: 'PyG', syn: ['dividendos', 'reparto de dividendos'] },
    { k: 'plantilla', l: 'Plantilla media (personas)', g: 'PyG', syn: ['plantilla', 'empleados', 'número medio de empleados', 'personas'] },
    { k: 'inmovilizado', l: 'Activo no corriente (inmovilizado)', g: 'Balance', syn: ['activo no corriente', 'inmovilizado', 'inmovilizado material'] },
    { k: 'existencias', l: 'Existencias', g: 'Balance', syn: ['existencias', 'stock', 'inventario'] },
    { k: 'clientes', l: 'Clientes (deudores comerciales)', g: 'Balance', syn: ['clientes', 'deudores comerciales', 'deudores', 'cuentas a cobrar'] },
    { k: 'tesoreria', l: 'Tesorería (caja y bancos)', g: 'Balance', syn: ['tesorería', 'tesoreria', 'efectivo', 'caja', 'bancos'] },
    { k: 'fondosPropios', l: 'Patrimonio neto (fondos propios)', g: 'Balance', syn: ['patrimonio neto', 'fondos propios', 'neto'] },
    { k: 'deudaLP', l: 'Deuda bancaria a largo plazo', g: 'Balance', syn: ['deudas con entidades de crédito a largo', 'deuda bancaria largo', 'deuda a largo plazo', 'deudas a largo plazo', 'deuda lp'] },
    { k: 'deudaCP', l: 'Deuda bancaria a corto plazo (incl. pólizas)', g: 'Balance', syn: ['deudas con entidades de crédito a corto', 'deuda bancaria corto', 'deuda a corto plazo', 'deudas a corto plazo', 'deuda cp', 'pólizas', 'polizas'] },
    { k: 'proveedores', l: 'Proveedores (acreedores comerciales)', g: 'Balance', syn: ['proveedores', 'acreedores comerciales', 'acreedores', 'cuentas a pagar'] }
  ];

  FIN.example = function () {
    // Datos de ejemplo coherentes con la empresa de ejemplo del simulador (no son cuentas reales)
    return {
      ejemplo: true,
      anios: [
        { anio: 2023, ventas: 3650000, costeVentas: 2300000, personal: 790000, otrosGastos: 300000, amortizacion: 140000, gastosFinancieros: 38000, impuestos: 21000, beneficio: 61000, dividendos: 40000, plantilla: 26, inmovilizado: 1450000, existencias: 380000, clientes: 820000, tesoreria: 520000, fondosPropios: 1460000, deudaLP: 640000, deudaCP: 180000, proveedores: 390000 },
        { anio: 2024, ventas: 3920000, costeVentas: 2450000, personal: 835000, otrosGastos: 318000, amortizacion: 145000, gastosFinancieros: 33000, impuestos: 34000, beneficio: 105000, dividendos: 60000, plantilla: 27, inmovilizado: 1420000, existencias: 400000, clientes: 850000, tesoreria: 460000, fondosPropios: 1505000, deudaLP: 560000, deudaCP: 160000, proveedores: 405000 },
        { anio: 2025, ventas: 4200000, costeVentas: 2604000, personal: 882000, otrosGastos: 336000, amortizacion: 150000, gastosFinancieros: 28000, impuestos: 50000, beneficio: 150000, dividendos: 55000, plantilla: 28, inmovilizado: 1380000, existencias: 428000, clientes: 863000, tesoreria: 477000, fondosPropios: 1600000, deudaLP: 480000, deudaCP: 140000, proveedores: 428000 }
      ]
    };
  };

  /* ---------- Importación ---------- */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const parseNum = (v) => {
    if (typeof v === 'number') return v;
    let s = String(v || '').trim().replace(/[€\s]/g, '');
    if (!s) return NaN;
    const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
    s = s.replace(/[()\-]/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56
    else if (/\.\d{1,2}$/.test(s) && /,/.test(s)) s = s.replace(/,/g, ''); // 1,234.56
    else s = s.replace(/[.,](?=\d{3}(\D|$))/g, '');
    const n = parseFloat(s);
    return neg ? -n : n;
  };
  FIN.parseNum = parseNum;

  function matchConcept(label) {
    const n = norm(label);
    if (!n) return null;
    let best = null, bestLen = 0;
    FIN.CONCEPTS.forEach((c) => c.syn.forEach((sy) => {
      const s = norm(sy);
      if ((n === s || n.startsWith(s + ' ') || n.includes(s)) && s.length > bestLen) { best = c.k; bestLen = s.length; }
    }));
    return best;
  }

  /* rows: matriz de celdas. Busca una fila de cabecera con años y una columna de conceptos. */
  FIN.fromRows = function (rows) {
    rows = rows.filter((r) => r && r.some((c) => String(c).trim() !== ''));
    let headerIdx = -1, yearCols = [];
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const cols = [];
      rows[i].forEach((c, j) => { const m = String(c).match(/(19|20)\d{2}/); if (m) cols.push({ j, anio: +m[0] }); });
      if (cols.length >= 1) { headerIdx = i; yearCols = cols; break; }
    }
    if (headerIdx < 0) throw new Error('No encuentro una fila con los años (por ejemplo 2023, 2024, 2025) en la cabecera.');
    const anios = yearCols.map((y) => ({ anio: y.anio }));
    let found = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const labelCell = r.find((c, j) => j < yearCols[0].j && String(c).trim() !== '') || r[0];
      const k = matchConcept(labelCell);
      if (!k) continue;
      yearCols.forEach((y, n) => { const v = parseNum(r[y.j]); if (isFinite(v) && anios[n][k] === undefined) { anios[n][k] = Math.abs(v); found++; } });
    }
    if (!found) throw new Error('He encontrado los años pero ningún concepto reconocible. Usa nombres como «Ventas», «Gastos de personal», «Clientes», «Patrimonio neto».');
    anios.sort((a, b) => a.anio - b.anio);
    return { anios, reconocidos: found };
  };

  FIN.fromText = function (text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const sep = lines.some((l) => l.includes('\t')) ? '\t' : lines.some((l) => l.split(';').length > 2) ? ';' : ',';
    return FIN.fromRows(lines.map((l) => l.split(sep)));
  };

  const FORMA = '{"anios":[{"anio":2025,' + FIN_KEYS() + '}]}';
  function FIN_KEYS() { return FIN.CONCEPTS.map((c) => `"${c.k}":número`).join(','); }
  /* Lee cualquier documento (Excel, CSV, PDF, Word, Markdown). Si no reconoce la tabla, prueba con IA. */
  FIN.fromFile = async function (file, opts) {
    const doc = await A.docs.read(file);
    let merged = null, lastErr = null;
    for (const h of doc.hojas) {
      try {
        const res = FIN.fromRows(h.rows);
        if (!merged) merged = res;
        else res.anios.forEach((a) => { const t = merged.anios.find((x) => x.anio === a.anio); if (t) Object.keys(a).forEach((k) => { if (t[k] === undefined) t[k] = a[k]; }); else merged.anios.push(a); });
      } catch (e) { lastErr = e; }
    }
    if (merged && !(opts && opts.ia)) { merged.anios.sort((a, b) => a.anio - b.anio); return merged; }
    const ai = await A.docs.aiExtract(doc.texto, 'balance y cuenta de resultados por años', FORMA).catch(() => null);
    if (ai && Array.isArray(ai.anios) && ai.anios.length) {
      const anios = ai.anios.filter((a) => a && +a.anio).map((a) => { const o = { anio: +a.anio }; FIN.CONCEPTS.forEach((c) => { if (isFinite(+a[c.k]) && a[c.k] !== null && a[c.k] !== '') o[c.k] = Math.abs(+a[c.k]); }); return o; }).sort((a, b) => a.anio - b.anio);
      return { anios, reconocidos: anios.reduce((n, a) => n + Object.keys(a).length - 1, 0), ia: true };
    }
    if (merged) return merged;
    throw lastErr || new Error('No he reconocido datos en el documento.');
  };
  /* Dictado: «ventas de 2024, 4,2 millones» */
  FIN.fromDictation = function (text) {
    const y = (text.match(/(19|20)\d{2}/) || [])[0];
    const k = matchConcept(text.replace(/(19|20)\d{2}/, '').replace(/[\d.,]+\s*(millones|millon|mil|k)?/gi, ''));
    const v = A.docs.parseAmount(text.replace(/(19|20)\d{2}/, ''));
    if (!y || !k || !isFinite(v)) throw new Error('No lo he entendido. Di, por ejemplo: «ventas de 2024, 4,2 millones».');
    return { anio: +y, k, v };
  };

  /* ---------- Auditoría del flujo del dinero: dónde está cada euro del beneficio ---------- */
  FIN.moneyFlow = function (hist, idx) {
    const Y = (hist && hist.anios) || [];
    if (Y.length < 2) return null;
    const i = idx === undefined ? Y.length - 1 : idx;
    const a = Y[i], p = Y[i - 1];
    if (!p) return null;
    const d = (k) => g(a, k) - g(p, k);
    const ventas = g(a, 'ventas');
    const ebitda = ventas - g(a, 'costeVentas') - g(a, 'personal') - g(a, 'otrosGastos');
    const bn = isFinite(a.beneficio) ? a.beneficio : ebitda - g(a, 'amortizacion') - g(a, 'gastosFinancieros') - g(a, 'impuestos');
    const deuda = d('deudaLP') + d('deudaCP');
    const capex = d('inmovilizado') + g(a, 'amortizacion');
    const div = g(a, 'dividendos');
    const aport = d('fondosPropios') - (bn - div); // ampliaciones (o ajustes) de patrimonio
    const items = [
      { k: 'beneficio', n: 'Beneficio del año', v: bn, tipo: 'origen', d: 'Lo que la cuenta de resultados dice que has ganado.' },
      { k: 'amortizacion', n: 'Amortización (gasto sin salida de dinero)', v: g(a, 'amortizacion'), tipo: 'origen', d: 'Se restó como gasto pero no salió del banco: es dinero que sí tienes.' },
      { k: 'clientes', n: 'Más dinero pendiente de cobrar', v: -d('clientes'), tipo: 'circulante', d: 'Si los clientes deben más que el año anterior, parte del beneficio está en sus manos.' },
      { k: 'existencias', n: 'Más stock en el almacén', v: -d('existencias'), tipo: 'circulante', d: 'El beneficio convertido en mercancía o materiales sin vender.' },
      { k: 'proveedores', n: 'Más deuda con proveedores', v: d('proveedores'), tipo: 'circulante', d: 'Si pagas más tarde, los proveedores financian parte de tu operación.' },
      { k: 'inversion', n: 'Inversión en activos', v: -capex, tipo: 'inversion', d: 'Maquinaria, vehículos, instalaciones: el beneficio convertido en activos.' },
      { k: 'deuda', n: deuda >= 0 ? 'Nueva deuda bancaria' : 'Devolución de préstamos', v: deuda, tipo: 'financiacion', d: 'Devolver préstamos consume beneficio; pedir nuevos aporta caja.' },
      { k: 'dividendos', n: 'Dividendos a los socios', v: -div, tipo: 'financiacion', d: 'La parte del beneficio que salió hacia los socios.' },
      { k: 'aportaciones', n: 'Aportaciones y otros ajustes de patrimonio', v: aport, tipo: 'financiacion', d: 'Ampliaciones de capital u otros movimientos del patrimonio neto.' }
    ];
    const calculado = items.reduce((s, x) => s + x.v, 0);
    const cajaReal = d('tesoreria');
    items.push({ k: 'otros', n: 'Otras partidas del balance', v: cajaReal - calculado, tipo: 'otros', d: 'Cuentas no detalladas (Hacienda, otros deudores y acreedores, provisiones). Si es grande, revisa esas partidas con tu contable.' });
    const base = Math.max(1, Math.abs(bn));
    // ¿Dónde está cada 100 € de beneficio? (solo los usos: lo que consume el beneficio)
    const destinos = [
      { n: 'Clientes que aún no han pagado', v: Math.max(0, d('clientes')) },
      { n: 'Stock en el almacén', v: Math.max(0, d('existencias')) },
      { n: 'Inversión en activos', v: Math.max(0, capex) },
      { n: 'Devolución de préstamos', v: Math.max(0, -deuda) },
      { n: 'Dividendos', v: div },
      { n: 'Menos deuda con proveedores', v: Math.max(0, -d('proveedores')) },
      { n: 'Aumento de la caja', v: Math.max(0, cajaReal) }
    ].filter((x) => x.v > 0);
    const totalUsos = destinos.reduce((s, x) => s + x.v, 0) || 1;
    destinos.forEach((x) => { x.pct = (x.v / totalUsos) * 100; });
    const recursos = bn + g(a, 'amortizacion');
    const atrapado = Math.max(0, d('clientes')) + Math.max(0, d('existencias')) - Math.max(0, d('proveedores'));
    const lectura = [];
    lectura.push(`En ${a.anio} la empresa ganó ${A.fmt.eur(bn)} y generó ${A.fmt.eur(recursos)} de recursos (beneficio más amortización), pero la caja ${cajaReal >= 0 ? 'solo subió' : 'bajó'} ${A.fmt.eur(Math.abs(cajaReal))}.`);
    if (atrapado > 0) lectura.push(`${A.fmt.eur(atrapado)} se quedaron atrapados en clientes y almacén: es el primer sitio donde buscar el dinero.`);
    if (capex > 0) lectura.push(`${A.fmt.eur(capex)} se invirtieron en activos.`);
    if (deuda < 0) lectura.push(`${A.fmt.eur(-deuda)} se usaron para devolver préstamos.`);
    if (div > 0) lectura.push(`${A.fmt.eur(div)} salieron como dividendos.`);
    if (Math.abs(cajaReal - calculado) > base * 0.15) lectura.push(`Hay ${A.fmt.eur(Math.abs(cajaReal - calculado))} en otras partidas que no se explican con los datos cargados: revisa Hacienda pública, otros deudores y acreedores.`);
    return { anio: a.anio, previo: p.anio, beneficio: bn, recursos, cajaReal, items, destinos, lectura, atrapado };
  };

  FIN.templateCSV = function () {
    const years = [new Date().getFullYear() - 3, new Date().getFullYear() - 2, new Date().getFullYear() - 1];
    return ['Concepto;' + years.join(';')].concat(FIN.CONCEPTS.map((c) => c.l + ';;;')).join('\n');
  };

  /* ---------- Análisis ---------- */
  const g = (a, k) => (isFinite(a[k]) ? a[k] : 0);
  FIN.analyze = function (hist) {
    const Y = (hist && hist.anios) || [];
    if (!Y.length) return null;
    const rows = Y.map((a, i) => {
      const prev = Y[i - 1];
      const ventas = g(a, 'ventas');
      const margenBruto = ventas - g(a, 'costeVentas');
      const ebitda = margenBruto - g(a, 'personal') - g(a, 'otrosGastos');
      const deuda = g(a, 'deudaLP') + g(a, 'deudaCP');
      const ac = g(a, 'existencias') + g(a, 'clientes') + g(a, 'tesoreria');
      const pc = g(a, 'deudaCP') + g(a, 'proveedores');
      const bn = isFinite(a.beneficio) ? a.beneficio : ebitda - g(a, 'amortizacion') - g(a, 'gastosFinancieros') - g(a, 'impuestos');
      const capex = prev ? g(a, 'inmovilizado') - g(prev, 'inmovilizado') + g(a, 'amortizacion') : null;
      return {
        anio: a.anio, ventas, margenBruto, margenPct: ventas ? (margenBruto / ventas) * 100 : 0, ebitda, ebitdaPct: ventas ? (ebitda / ventas) * 100 : 0, bn,
        crec: prev && g(prev, 'ventas') ? (ventas / g(prev, 'ventas') - 1) * 100 : null,
        pesoSalarial: ventas ? (g(a, 'personal') / ventas) * 100 : 0,
        ventasPersona: a.plantilla ? ventas / a.plantilla : null,
        dso: ventas ? (g(a, 'clientes') / ventas) * 365 : 0,
        dio: g(a, 'costeVentas') ? (g(a, 'existencias') / g(a, 'costeVentas')) * 365 : 0,
        dpo: g(a, 'costeVentas') ? (g(a, 'proveedores') / g(a, 'costeVentas')) * 365 : 0,
        fondoManiobra: ac - pc, liquidez: pc ? ac / pc : null,
        dfn: deuda - g(a, 'tesoreria'), dfnEbitda: ebitda > 0 ? (deuda - g(a, 'tesoreria')) / ebitda : null,
        endeudamiento: g(a, 'fondosPropios') ? deuda / g(a, 'fondosPropios') : null,
        cortoPlazo: deuda ? g(a, 'deudaCP') / deuda : 0,
        roe: g(a, 'fondosPropios') ? (bn / g(a, 'fondosPropios')) * 100 : null,
        roa: (g(a, 'inmovilizado') + ac) ? (bn / (g(a, 'inmovilizado') + ac)) * 100 : null,
        payout: bn > 0 && isFinite(a.dividendos) ? (a.dividendos / bn) * 100 : null,
        capex, reinversion: capex !== null && g(a, 'amortizacion') ? capex / g(a, 'amortizacion') : null,
        autofinanciacion: bn - g(a, 'dividendos') + g(a, 'amortizacion'),
        raw: a
      };
    });
    const first = rows[0], last = rows[rows.length - 1], n = rows.length - 1;
    const cagr = n > 0 && first.ventas > 0 ? (Math.pow(last.ventas / first.ventas, 1 / n) - 1) * 100 : 0;
    const trend = (k) => (n > 0 && isFinite(last[k]) && isFinite(first[k]) ? last[k] - first[k] : 0);
    const avg = (k) => { const v = rows.map((r) => r[k]).filter((x) => x !== null && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const payoutAvg = avg('payout');
    const roeAvg = avg('roe');
    const crecSostenible = roeAvg !== null ? roeAvg * (1 - (payoutAvg || 0) / 100) : null;

    // Proyección a 3 años: ventas al ritmo histórico (acotado), márgenes y días con su tendencia suavizada
    const growth = Math.max(-15, Math.min(25, cagr)) / 100;
    const slope = (k) => (n > 0 ? trend(k) / n : 0) * 0.5;
    const proj = [1, 2, 3].map((k) => {
      const ventas = last.ventas * Math.pow(1 + growth, k);
      const margenPct = Math.max(1, Math.min(95, last.margenPct + slope('margenPct') * k));
      const pesoSalarial = Math.max(1, last.pesoSalarial + slope('pesoSalarial') * k);
      const otrosPct = last.ventas ? (g(last.raw, 'otrosGastos') / last.ventas) * 100 : 0;
      const ebitda = ventas * (margenPct - pesoSalarial - otrosPct) / 100;
      const dso = Math.max(0, last.dso + slope('dso') * k);
      return { anio: last.anio + k, ventas, margenPct, pesoSalarial, ebitda, ebitdaPct: (ebitda / ventas) * 100, dso, proyectado: true };
    });

    // Políticas de gobierno que reflejan los números
    const P = [];
    const add = (nombre, estado, lectura, recomendacion) => P.push({ nombre, estado, lectura, recomendacion });
    if (payoutAvg !== null) add('Política de dividendos', payoutAvg > 60 ? 'warn' : 'ok',
      `Reparte de media el ${Math.round(payoutAvg)} % del beneficio.`,
      payoutAvg > 60 ? 'Antes de invertir, fija un dividendo máximo (por ejemplo, el 30 %) para reforzar fondos propios.' : 'La empresa reinvierte la mayor parte de lo que gana: buena base para crecer.');
    if (n > 0) add('Política de crédito a clientes', trend('dso') > 5 ? 'warn' : 'ok',
      `Los días de cobro pasan de ${Math.round(first.dso)} a ${Math.round(last.dso)}.`,
      trend('dso') > 5 ? 'Los clientes pagan cada vez más tarde: revisa condiciones y límites de crédito antes de crecer.' : 'El plazo de cobro está controlado.');
    if (n > 0) add('Política de stock', trend('dio') > 7 ? 'warn' : 'ok',
      `Los días de stock pasan de ${Math.round(first.dio)} a ${Math.round(last.dio)}.`,
      trend('dio') > 7 ? 'El almacén crece más que la venta: hay caja dormida en existencias.' : 'El stock acompaña a la venta.');
    add('Política de financiación', last.cortoPlazo > 0.5 ? 'warn' : (last.dfnEbitda !== null && last.dfnEbitda > 3) ? 'stop' : 'ok',
      `${Math.round(last.cortoPlazo * 100)} % de la deuda bancaria es a corto plazo; deuda neta ${last.dfnEbitda === null ? 'sin EBITDA positivo' : (last.dfnEbitda < 0 ? 'negativa (más caja que deuda)' : A.fmt.x(last.dfnEbitda) + ' el EBITDA')}.`,
      last.cortoPlazo > 0.5 ? 'Se financian necesidades estables con pólizas: convierte parte en préstamo a largo antes de invertir.' : 'Estructura de deuda equilibrada.');
    if (n > 0) add('Política salarial y productividad', trend('pesoSalarial') > 1 ? 'warn' : 'ok',
      `El peso salarial pasa del ${A.fmt.pct(first.pesoSalarial)} al ${A.fmt.pct(last.pesoSalarial)}${last.ventasPersona ? `; ventas por persona: ${A.fmt.eur(last.ventasPersona)}` : ''}.`,
      trend('pesoSalarial') > 1 ? 'El coste de personal crece más deprisa que la venta: el crecimiento se apoya en más horas, no en más productividad.' : 'La productividad acompaña al crecimiento.');
    const reinvAvg = avg('reinversion');
    if (reinvAvg !== null) add('Política de inversión', reinvAvg < 0.8 ? 'warn' : 'ok',
      `Invierte ${reinvAvg.toFixed(2).replace('.', ',')} € por cada euro que amortiza.`,
      reinvAvg < 0.8 ? 'Invierte menos de lo que se desgasta: el activo envejece. La inversión nueva puede llegar tarde.' : 'Mantiene o amplía su capacidad productiva.');
    if (crecSostenible !== null) add('Crecimiento sostenible', cagr > crecSostenible + 2 ? 'warn' : 'ok',
      `Crece al ${A.fmt.pct(cagr)} anual; con su rentabilidad y su reparto de dividendos podría crecer al ${A.fmt.pct(crecSostenible)} sin endeudarse más.`,
      cagr > crecSostenible + 2 ? 'Crece más deprisa de lo que puede financiar con sus beneficios: necesitará deuda o capital.' : 'El ritmo de crecimiento es financiable con lo que genera.');
    add('Margen y precio', n > 0 && trend('margenPct') < -1 ? 'warn' : 'ok',
      `Margen bruto del ${A.fmt.pct(last.margenPct)}${n > 0 ? ` (${trend('margenPct') >= 0 ? '+' : ''}${A.fmt.pp(trend('margenPct'))} en el periodo)` : ''}.`,
      n > 0 && trend('margenPct') < -1 ? 'El margen se erosiona: revisa precios y compras antes de añadir volumen.' : 'El margen se mantiene.');

    return { rows, proj, cagr, crecSostenible, payoutAvg, last, first, politicas: P };
  };

  /* Traslada el último año al punto de partida del simulador */
  FIN.applyToState = function (state, an) {
    const a = an.last.raw, r = an.last;
    const e = state.empresa;
    if (r.ventas) e.ventas = Math.round(r.ventas);
    if (r.margenPct) e.margen = Math.round(r.margenPct * 10) / 10;
    if (a.personal) e.personal = Math.round(a.personal);
    if (a.otrosGastos) e.fijos = Math.round(a.otrosGastos);
    if (a.plantilla) e.plantilla = Math.round(a.plantilla);
    if (isFinite(a.tesoreria)) e.caja = Math.round(a.tesoreria);
    if (isFinite(a.deudaLP) || isFinite(a.deudaCP)) e.deudaViva = Math.round(g(a, 'deudaLP') + g(a, 'deudaCP'));
    if (a.fondosPropios) e.fondosPropios = Math.round(a.fondosPropios);
    if (r.dso) e.dso = Math.round(r.dso);
    if (r.dio) e.dio = Math.round(r.dio);
    if (r.dpo) e.dpo = Math.round(r.dpo);
    if (an.rows.length > 1) e.crecimiento = Math.round(Math.max(-10, Math.min(30, an.cagr)) * 10) / 10;
    return state;
  };

  /* ---------- Carga manual: rejilla de conceptos × años ----------
     host: contenedor; hist: histórico actual (o null); opts: { empresa, onSave(hist), onCancel } */
  FIN.mountGrid = function (host, hist, opts) {
    opts = opts || {};
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fmt = (v) => (v === '' || v == null || !isFinite(v) ? '' : new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v));
    const y = new Date().getFullYear();
    let anios = hist && hist.anios && hist.anios.length && !hist.ejemplo ? JSON.parse(JSON.stringify(hist.anios)) : [y - 3, y - 2, y - 1].map((anio) => ({ anio }));
    const e = opts.empresa;
    if (e && !(hist && hist.anios && hist.anios.length && !hist.ejemplo)) {
      // El último año se precarga con los datos del simulador para no partir de cero
      Object.assign(anios[anios.length - 1], { ventas: e.ventas, costeVentas: Math.round(e.ventas * (1 - e.margen / 100)), personal: e.personal, otrosGastos: e.fijos, plantilla: e.plantilla, tesoreria: e.caja, fondosPropios: e.fondosPropios, deudaLP: e.deudaViva, deudaCP: e.polizaDispuesta || 0, clientes: Math.round(e.ventas * e.dso / 365), existencias: Math.round(e.ventas * (1 - e.margen / 100) * e.dio / 365), proveedores: Math.round(e.ventas * (1 - e.margen / 100) * e.dpo / 365) });
    }
    const resultado = (a) => ['ventas'].reduce((s, k) => s + (+a[k] || 0), 0) - ['costeVentas', 'personal', 'otrosGastos', 'amortizacion', 'gastosFinancieros', 'impuestos'].reduce((s, k) => s + (+a[k] || 0), 0);
    function draw(msg) {
      anios.sort((a, b) => a.anio - b.anio);
      const row = (c) => `<tr><td style="text-align:left;white-space:normal;font-family:var(--font-body)">${esc(c.l)}</td>${anios.map((a, j) => `<td><input class="gcell" data-j="${j}" data-k="${c.k}" inputmode="decimal" value="${fmt(a[c.k])}" placeholder="${c.k === 'beneficio' && a.ventas ? fmt(resultado(a)) : ''}" aria-label="${esc(c.l)} ${a.anio}"></td>`).join('')}</tr>`;
      host.innerHTML = `<div class="row" style="margin-bottom:8px"><h4>Carga manual de las cuentas</h4><span class="spacer"></span>
          <button class="btn ghost" data-g="prev">Añadir año anterior</button><button class="btn ghost" data-g="next">Añadir año siguiente</button>${anios.length > 2 ? '<button class="btn ghost" data-g="del">Quitar el primer año</button>' : ''}</div>
        <p class="small muted">Copia las cifras de las cuentas anuales (o del cierre de la gestoría), en euros. Bastan dos años. Si dejas vacío el resultado, se calcula solo. Puedes pegar una columna entera desde Excel en la primera casilla.</p>
        <div class="etable table-wrap"><table><thead><tr><th style="text-align:left">Concepto</th>${anios.map((a, j) => `<th><input class="gcell gyear" data-year="${j}" value="${a.anio}" aria-label="Año"></th>`).join('')}</tr></thead><tbody>
          <tr><td colspan="${anios.length + 1}" class="hint" style="text-align:left">Cuenta de resultados</td></tr>${FIN.CONCEPTS.filter((c) => c.g === 'PyG').map(row).join('')}
          <tr><td colspan="${anios.length + 1}" class="hint" style="text-align:left">Balance a cierre del año</td></tr>${FIN.CONCEPTS.filter((c) => c.g === 'Balance').map(row).join('')}
        </tbody></table></div>
        <div class="row mt"><button class="btn solid" data-g="save">Guardar y analizar</button>${opts.onCancel ? '<button class="btn ghost" data-g="cancel">Cancelar</button>' : ''}<span class="small" data-gmsg>${msg || ''}</span></div>`;
      host.querySelectorAll('input[data-k]').forEach((inp) => {
        inp.addEventListener('change', () => { const a = anios[+inp.dataset.j]; const v = parseNum(inp.value); if (inp.value.trim() === '') delete a[inp.dataset.k]; else if (isFinite(v)) a[inp.dataset.k] = v; inp.value = fmt(a[inp.dataset.k]); });
        inp.addEventListener('paste', (ev) => {
          const t = (ev.clipboardData || window.clipboardData).getData('text'); const lines = t.split(/\r?\n/).filter((x) => x.trim() !== '');
          if (lines.length < 2 && !/\t/.test(t)) return;
          ev.preventDefault();
          const keys = FIN.CONCEPTS.map((c) => c.k); const k0 = keys.indexOf(inp.dataset.k), j0 = +inp.dataset.j;
          lines.forEach((ln, i) => ln.split('\t').forEach((cell, dj) => { const a = anios[j0 + dj], k = keys[k0 + i]; const v = parseNum(cell); if (a && k && isFinite(v)) a[k] = v; }));
          draw('Datos pegados.');
        });
      });
      host.querySelectorAll('input[data-year]').forEach((inp) => inp.addEventListener('change', () => { const v = parseInt(inp.value, 10); if (v > 1950 && v < 2100) anios[+inp.dataset.year].anio = v; draw(); }));
      const act = (k, fn) => { const b = host.querySelector(`[data-g="${k}"]`); if (b) b.onclick = fn; };
      act('prev', () => { anios.unshift({ anio: anios[0].anio - 1 }); draw(); });
      act('next', () => { anios.push({ anio: anios[anios.length - 1].anio + 1 }); draw(); });
      act('del', () => { anios.shift(); draw(); });
      act('cancel', () => opts.onCancel());
      act('save', () => {
        const llenos = anios.filter((a) => (+a.ventas || 0) > 0);
        if (llenos.length < 2) { draw('<span style="color:var(--stop)">Hacen falta al menos dos años con ventas.</span>'); return; }
        llenos.forEach((a) => { if (a.beneficio === undefined || a.beneficio === '') a.beneficio = resultado(a); });
        const faltan = ['tesoreria', 'clientes', 'fondosPropios'].filter((k) => llenos.some((a) => a[k] === undefined));
        opts.onSave({ anios: llenos, manual: true, aviso: faltan.length ? 'Faltan datos de balance: el flujo del dinero será aproximado.' : '' });
      });
    }
    draw();
  };
})();
