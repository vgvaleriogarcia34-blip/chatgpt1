/* Atalaya · Sistema estratégico · Zona de origen
   Un único sitio donde soltar toda la documentación en bruto: listados de ventas, compras, productos, clientes,
   plantilla, oportunidades, partes de horas, extractos del banco, balances y cuentas de resultados, informes…
   Cada archivo se lee, se reconoce qué es y se reparte solo a los módulos que lo usan (y al simulador, si son cuentas).
   Lo que no es una tabla se guarda como documento de contexto para los informes. */
(function () {
  const A = window.Atalaya, S = A.strat, F = A.fmt;
  const { $, $$, esc } = S;
  const TIPOS = A.C360_TIPOS;
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9% ]/g, ' ').replace(/\s+/g, ' ').trim();
  const num = (v) => { const n = A.fin.parseNum(v); return isFinite(n) ? n : 0; };
  // Fechas de hojas de cálculo: número de serie de Excel, 2025-03-15, 15/03/2025, 15-03-25 o 15.03.2025
  const fecha = (v) => {
    if (v instanceof Date) return isNaN(v) ? null : v;
    const n = typeof v === 'number' ? v : (/^\d{5}(\.\d+)?$/.test(String(v).trim()) ? +v : NaN);
    if (n > 20000 && n < 80000) return new Date(Math.round((n - 25569) * 864e5));
    const t = String(v == null ? '' : v).trim(); let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]);
    return null;
  };
  const iso = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);

  S.defaults.origen = { archivos: [], cargado: {}, docs: [], series: {}, manual: {} };
  const O = () => { const o = S.state.origen; ['archivos', 'docs'].forEach((k) => { if (!Array.isArray(o[k])) o[k] = []; }); ['cargado', 'series', 'manual'].forEach((k) => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; }); return o; };
  S.origen = O;

  /* ---------- Reconocimiento de tablas ---------- */
  const DS = {
    ventas: { f: { cliente: ['cliente', 'razon social', 'nombre cliente', 'customer', 'destinatario', 'cuenta cliente'], producto: ['producto', 'articulo', 'referencia', 'descripcion articulo', 'item', 'familia'], unidades: ['unidades', 'cantidad', 'uds', 'qty', 'unid'], importe: ['importe', 'total', 'base imponible', 'ventas', 'facturacion', 'facturado', 'importe neto', 'venta', 'neto', 'base'], coste: ['coste', 'costo', 'coste de venta', 'coste total', 'precio coste', 'coste ventas'], margen: ['margen', 'beneficio', 'margen bruto'], fecha: ['fecha', 'fecha factura', 'fecha emision'], dias: ['dias de cobro', 'plazo de cobro', 'dias cobro', 'plazo cobro', 'dias'] }, need: (m) => 'importe' in m && ('cliente' in m || 'producto' in m), bonus: (m) => ('cliente' in m ? 2 : 0) },
    compras: { f: { proveedor: ['proveedor', 'acreedor', 'supplier', 'razon social proveedor', 'nombre proveedor'], importe: ['importe', 'total', 'compras', 'base imponible', 'neto', 'importe neto', 'base'], plazo: ['plazo', 'dias de pago', 'dias pago', 'plazo de pago', 'plazo pago'], material: ['material', 'familia', 'categoria', 'concepto'], fecha: ['fecha', 'fecha factura'] }, need: (m) => 'proveedor' in m && 'importe' in m, bonus: () => 3 },
    productos: { f: { producto: ['producto', 'articulo', 'referencia', 'descripcion', 'nombre producto', 'item'], precio: ['precio', 'pvp', 'precio venta', 'tarifa', 'precio unitario'], coste: ['coste', 'costo', 'precio coste', 'coste unitario', 'escandallo', 'coste variable'], unidades: ['unidades', 'cantidad', 'uds', 'unidades vendidas', 'ventas unidades'], stock: ['stock', 'existencias'], capacidad: ['capacidad'] }, need: (m) => 'producto' in m && ('precio' in m || 'coste' in m) && !('cliente' in m), bonus: () => 1 },
    plantilla: { f: { nombre: ['nombre', 'empleado', 'trabajador', 'persona', 'apellidos y nombre', 'nombre y apellidos'], area: ['area', 'departamento', 'seccion', 'centro'], puesto: ['puesto', 'categoria', 'cargo', 'rol', 'funcion', 'categoria profesional'], coste: ['coste empresa', 'coste', 'salario', 'sueldo', 'bruto anual', 'retribucion', 'salario bruto'], antiguedad: ['antiguedad', 'fecha alta', 'alta'] }, need: (m) => ('nombre' in m || 'area' in m) && ('coste' in m || 'puesto' in m) && !('horas' in m) && !('importe' in m), bonus: (m) => ('puesto' in m ? 2 : 0) },
    pipeline: { f: { cliente: ['cliente', 'empresa', 'cuenta', 'oportunidad', 'nombre oportunidad'], importe: ['importe', 'valor', 'presupuesto', 'cuantia', 'importe estimado'], etapa: ['etapa', 'fase', 'estado', 'stage'], prob: ['probabilidad', 'prob', 'probabilidad %'], cierre: ['cierre', 'fecha cierre', 'fecha prevista', 'cierre previsto'], comercial: ['comercial', 'vendedor', 'responsable', 'propietario'] }, need: (m) => 'etapa' in m && 'importe' in m, bonus: () => 3 },
    tiempos: { f: { persona: ['persona', 'empleado', 'trabajador', 'operario', 'nombre'], tarea: ['tarea', 'actividad', 'descripcion', 'orden', 'proyecto', 'trabajo'], horas: ['horas', 'tiempo', 'duracion', 'horas trabajadas'], fecha: ['fecha', 'dia'], categoria: ['categoria', 'tipo', 'clase'] }, need: (m) => 'horas' in m && ('persona' in m || 'tarea' in m), bonus: () => 3 },
    banco: { f: { fecha: ['fecha', 'f valor', 'fecha valor', 'fecha operacion', 'fecha contable'], concepto: ['concepto', 'descripcion', 'movimiento', 'detalle'], importe: ['importe', 'cantidad', 'cargo abono'], cargo: ['cargo', 'debe', 'salida', 'pagos'], abono: ['abono', 'haber', 'entrada', 'cobros'], saldo: ['saldo', 'saldo disponible'] }, need: (m) => 'fecha' in m && 'concepto' in m && ('importe' in m || 'cargo' in m || 'abono' in m) && ('saldo' in m || 'cargo' in m || 'abono' in m), bonus: () => 3 },
    marketing: { f: { canal: ['canal', 'medio', 'fuente', 'campana', 'origen'], inversion: ['inversion', 'gasto', 'coste', 'presupuesto', 'importe'], leads: ['leads', 'contactos', 'solicitudes', 'registros'], oportunidades: ['oportunidades'], clientes: ['clientes', 'conversiones', 'clientes nuevos', 'ventas'] }, need: (m) => 'canal' in m && ('inversion' in m || 'leads' in m) && !('cliente' in m), bonus: (m) => ('leads' in m ? 3 : 0) }
  };
  // Cabecera: la fila (de las diez primeras) que mejor casa con los campos de un tipo
  function header(rows, f) {
    let best = null;
    for (let h = 0; h < Math.min(rows.length, 10); h++) {
      const cells = (rows[h] || []).map(norm); const map = {}, used = new Set();
      Object.keys(f).forEach((k) => {
        let pick = -1, score = 0;
        cells.forEach((c, j) => { if (!c || used.has(j)) return; f[k].forEach((sy) => { const sc = c === sy ? 3 : (sy.length > 3 && (c.startsWith(sy + ' ') || c.endsWith(' ' + sy))) ? 2 : (sy.length > 4 && c.includes(sy)) ? 1 : 0; if (sc > score) { score = sc; pick = j; } }); });
        if (pick >= 0) { map[k] = pick; used.add(pick); }
      });
      const n = Object.keys(map).length;
      if (!best || n > best.n) best = { h, map, n };
    }
    return best;
  }
  function classify(rows) {
    rows = (rows || []).filter((r) => r && r.some((c) => String(c).trim() !== ''));
    if (rows.length < 2) return null;
    // Cuentas anuales: una fila con años y conceptos contables
    try { const fin = A.fin.fromRows(rows); if (fin.reconocidos >= 3) return { tipo: 'cuentas', fin, filas: fin.anios.length }; } catch (e) { /* no son cuentas */ }
    let best = null;
    Object.keys(DS).forEach((k) => {
      const d = DS[k], hd = header(rows, d.f); if (!hd || !d.need(hd.map)) return;
      const score = hd.n + d.bonus(hd.map);
      if (!best || score > best.score) best = { tipo: k, score, hd };
    });
    if (!best) return null;
    const objs = rows.slice(best.hd.h + 1).map((r) => { const o = {}; Object.keys(best.hd.map).forEach((k) => { o[k] = r[best.hd.map[k]]; }); return o; })
      .filter((o) => Object.values(o).some((v) => String(v == null ? '' : v).trim() !== ''))
      .filter((o) => !/^(total|suma|totales|subtotal)\b/.test(norm(o.cliente || o.proveedor || o.producto || o.nombre || o.concepto || o.canal || '')));
    return { tipo: best.tipo, rows: objs, cols: Object.keys(best.hd.map), filas: objs.length };
  }

  /* ---------- Reparto a los módulos ---------- */
  const top = (list, key, n, resto) => { list.sort((a, b) => b[key] - a[key]); if (list.length <= n) return list; const r = list.slice(n - 1); const agg = resto(r); return list.slice(0, n - 1).concat([agg]); };
  const APPLY = {
    cuentas(res) {
      const H = S.sim.historico && !S.sim.historico.ejemplo ? S.sim.historico : { anios: [] };
      res.fin.anios.forEach((a) => { const t = H.anios.find((x) => x.anio === a.anio); if (t) Object.assign(t, a); else H.anios.push(a); });
      H.anios.sort((a, b) => a.anio - b.anio); delete H.ejemplo; S.sim.historico = H;
      try { const an = A.fin.analyze(H); A.fin.applyToState(S.sim, an); } catch (e) { /* cuentas incompletas: se guardan igualmente */ }
      S.saveSim();
      return { mods: TIPOS.cuentas.mods, txt: `${res.fin.anios.length} año(s) de cuentas (${res.fin.anios.map((a) => a.anio).join(', ')}); el simulador parte ya del último año` };
    },
    ventas(res) {
      const e = S.sim.empresa, mg = (e.margen || 35) / 100;
      const C = S.state.comercial; let estim = false, txt = []; const extra = [];
      const byCli = new Map(), byProd = new Map(), byMes = new Map();
      res.rows.forEach((r) => {
        const imp = num(r.importe); if (!imp) return;
        let coste = r.coste != null && r.coste !== '' ? num(r.coste) : r.margen != null && r.margen !== '' ? imp - num(r.margen) : null;
        if (coste == null) { coste = imp * (1 - mg); estim = true; }
        if (r.cliente) { const k = String(r.cliente).trim(); const c = byCli.get(k) || { nombre: k, ventas: 0, costeVariable: 0, diasP: 0 }; c.ventas += imp; c.costeVariable += coste; if (r.dias) c.diasP += num(r.dias) * imp; byCli.set(k, c); }
        if (r.producto) { const k = String(r.producto).trim(); const p = byProd.get(k) || { nombre: k, imp: 0, coste: 0, unidades: 0 }; p.imp += imp; p.coste += coste; p.unidades += num(r.unidades); byProd.set(k, p); }
        if (r.fecha) { const d = iso(fecha(r.fecha)); if (d) byMes.set(d.slice(0, 7), (byMes.get(d.slice(0, 7)) || 0) + imp); }
      });
      if (byCli.size) {
        const old = new Map((C.clientes || []).map((c) => [c.nombre, c]));
        let L = Array.from(byCli.values()).map((c) => ({ nombre: c.nombre, ventas: Math.round(c.ventas), costeVariable: Math.round(c.costeVariable), dias: c.diasP ? Math.round(c.diasP / c.ventas) : (old.get(c.nombre) ? old.get(c.nombre).dias : e.dso || 60) }));
        L = top(L, 'ventas', 40, (r) => ({ nombre: `Resto de clientes (${r.length})`, ventas: r.reduce((a, c) => a + c.ventas, 0), costeVariable: r.reduce((a, c) => a + c.costeVariable, 0), dias: e.dso || 60 }));
        C.clientes = L; C.ejemplo = false; txt.push(`${byCli.size} clientes`);
      }
      if (byProd.size && Array.from(byProd.values()).some((p) => p.unidades > 0)) {
        const old = new Map((C.productos || []).map((p) => [p.nombre, p]));
        let L = Array.from(byProd.values()).filter((p) => p.unidades > 0).map((p) => { const o = old.get(p.nombre); return { nombre: p.nombre, unidades: Math.round(p.unidades), precio: +(p.imp / p.unidades).toFixed(2), cv: +(p.coste / p.unidades).toFixed(2), capacidad: o ? o.capacidad : Math.round(p.unidades * 1.25), elasticidad: o ? o.elasticidad : -1 }; });
        L.sort((a, b) => b.unidades * b.precio - a.unidades * a.precio); L = L.slice(0, 30);
        C.productos = L; txt.push(`${L.length} productos`); extra.push('productos');
      }
      if (byMes.size) { O().series.ventasMes = Array.from(byMes.entries()).sort().map(([m, v]) => ({ mes: m, ventas: Math.round(v) })); txt.push(`${byMes.size} meses de ventas`); }
      return { mods: TIPOS.ventas.mods, txt: txt.join(', ') + (estim ? ' · sin coste en el listado: se estima con el margen medio de la empresa' : ''), aviso: estim, extra };
    },
    compras(res) {
      const P = S.state.compras, old = new Map((P.proveedores || []).map((p) => [p.nombre, p])), by = new Map();
      res.rows.forEach((r) => { const imp = num(r.importe); if (!imp || !r.proveedor) return; const k = String(r.proveedor).trim(); const p = by.get(k) || { nombre: k, compras: 0, plazoP: 0 }; p.compras += imp; if (r.plazo) p.plazoP += num(r.plazo) * imp; by.set(k, p); });
      let L = Array.from(by.values()).map((p) => { const o = old.get(p.nombre) || {}; return { nombre: p.nombre, compras: Math.round(p.compras), plazo: p.plazoP ? Math.round(p.plazoP / p.compras) : (o.plazo || S.sim.empresa.dpo || 60), alternativas: o.alternativas != null ? o.alternativas : 2, criticidad: o.criticidad != null ? o.criticidad : 3, calidad: o.calidad != null ? o.calidad : 4, puntualidad: o.puntualidad != null ? o.puntualidad : 95 }; });
      L = top(L, 'compras', 30, (r) => ({ nombre: `Resto de proveedores (${r.length})`, compras: r.reduce((a, p) => a + p.compras, 0), plazo: S.sim.empresa.dpo || 60, alternativas: 5, criticidad: 1, calidad: 4, puntualidad: 95 }));
      P.proveedores = L; P.ejemplo = false;
      return { mods: TIPOS.compras.mods, txt: `${by.size} proveedores · ${F.eur(L.reduce((a, p) => a + p.compras, 0))} de compras. Revisa en Compras la criticidad y las alternativas de cada uno` };
    },
    productos(res) {
      const C = S.state.comercial, old = new Map((C.productos || []).map((p) => [p.nombre, p]));
      const L = res.rows.filter((r) => r.producto).map((r) => { const o = old.get(String(r.producto).trim()) || {}; const precio = num(r.precio) || o.precio || 0, cv = num(r.coste) || o.cv || precio * (1 - (S.sim.empresa.margen || 35) / 100), u = num(r.unidades) || o.unidades || 0; return { nombre: String(r.producto).trim(), unidades: Math.round(u), precio, cv: +cv.toFixed(2), capacidad: num(r.capacidad) || o.capacidad || Math.round(u * 1.25), elasticidad: o.elasticidad || -1 }; }).slice(0, 40);
      if (L.length) C.productos = L;
      return { mods: TIPOS.productos.mods, txt: `${L.length} productos${L.some((p) => !p.unidades) ? ' · faltan unidades vendidas en algunos: complétalas en Margen y demanda' : ''}`, aviso: L.some((p) => !p.unidades) };
    },
    plantilla(res) {
      const rows = res.rows.filter((r) => r.nombre || r.area || r.puesto);
      const costes = rows.map((r) => num(r.coste)).filter((v) => v > 0).sort((a, b) => a - b);
      const mediana = costes.length ? costes[Math.floor(costes.length / 2)] : 0, mensual = mediana > 0 && mediana < 6000;
      const anual = (v) => (mensual ? v * 14 * 1.32 : v); // salario mensual bruto → coste empresa anual aproximado
      const P = S.state.personas, oldA = new Map((P.areas || []).map((a) => [a.area, a])), byA = new Map();
      rows.forEach((r) => { const k = String(r.area || r.puesto || 'General').trim(); const a = byA.get(k) || { area: k, personas: 0, costeT: 0, n: 0 }; a.personas++; const c = num(r.coste); if (c) { a.costeT += anual(c); a.n++; } byA.set(k, a); });
      P.areas = Array.from(byA.values()).map((a) => { const o = oldA.get(a.area) || {}; return { area: a.area, personas: a.personas, coste: a.n ? Math.round(a.costeT / a.n) : (o.coste || 30000), absentismo: o.absentismo != null ? o.absentismo : 3, rotacion: o.rotacion != null ? o.rotacion : 10, vacantes: o.vacantes || 0, formacion: o.formacion != null ? o.formacion : 10 }; });
      const T = S.state.tiempos;
      const pers = rows.filter((r) => r.nombre).map((r) => ({ nombre: String(r.nombre).trim(), rol: String(r.puesto || r.area || '').trim(), costeHora: num(r.coste) ? Math.round(anual(num(r.coste)) / 1720 * 10) / 10 : 25 }));
      if (pers.length) { T.personas = pers.slice(0, 60); if (T.ejemplo) { T.registros = []; T.ejemplo = false; } }
      S.sim.empresa.plantilla = rows.length; S.saveSim();
      return { mods: TIPOS.plantilla.mods, txt: `${rows.length} personas en ${byA.size} áreas${mensual ? ' · los importes parecen salarios mensuales: se pasan a coste empresa anual (×14 pagas × 1,32)' : ''}`, aviso: mensual };
    },
    pipeline(res) {
      const ET = ['Contacto', 'Cualificada', 'Propuesta', 'Negociación', 'Ganada', 'Perdida'], PR = { Contacto: 10, Cualificada: 25, Propuesta: 45, 'Negociación': 70, Ganada: 100, Perdida: 0 };
      const et = (v) => { const n = norm(v); return ET.find((e) => n.includes(norm(e).slice(0, 5))) || (/(gan|cerrad|won)/.test(n) ? 'Ganada' : /(perd|lost|descart)/.test(n) ? 'Perdida' : /(ofert|presup)/.test(n) ? 'Propuesta' : /(negoc)/.test(n) ? 'Negociación' : /(cualif|interes)/.test(n) ? 'Cualificada' : 'Contacto'); };
      const L = res.rows.filter((r) => num(r.importe)).map((r) => { const e = et(r.etapa); const p = r.prob != null && r.prob !== '' ? num(r.prob) : PR[e]; return { cliente: String(r.cliente || 'Sin nombre').trim(), importe: Math.round(num(r.importe)), etapa: e, prob: p <= 1 && p > 0 ? Math.round(p * 100) : Math.round(p), cierre: iso(fecha(r.cierre)) || '', comercial: String(r.comercial || '').trim() }; });
      S.state.comercial.oportunidades = L;
      return { mods: TIPOS.pipeline.mods, txt: `${L.length} oportunidades · ${F.eur(L.reduce((a, o) => a + o.importe, 0))} en juego` };
    },
    tiempos(res) {
      const T = S.state.tiempos, CATS = A.CATS_TIEMPO || [];
      const cat = (r) => { const n = norm((r.categoria || '') + ' ' + (r.tarea || '')); const c = CATS.find((x) => n.includes(norm(x.c)) || n.includes(norm(x.k))); return c ? c.k : /(reunion)/.test(n) ? 'reuniones' : /(error|repet|rehac|retrab)/.test(n) ? 'retrabajo' : /(esper|busc|despla)/.test(n) ? 'esperas' : /(cliente|venta|oferta|visita)/.test(n) ? 'comercial' : /(factur|contab|papel|gesti|admin)/.test(n) ? 'gestion' : /(forma|curso)/.test(n) ? 'formacion' : 'produccion'; };
      const L = res.rows.filter((r) => num(r.horas)).map((r) => ({ fecha: iso(fecha(r.fecha)) || new Date().toISOString().slice(0, 10), persona: String(r.persona || 'Equipo').trim(), tarea: String(r.tarea || '').trim(), categoria: cat(r), horas: num(r.horas) }));
      if (T.ejemplo) { T.registros = []; T.ejemplo = false; }
      L.forEach((r) => { if (!T.personas.some((p) => p.nombre === r.persona)) T.personas.push({ nombre: r.persona, rol: '', costeHora: 25 }); });
      T.registros = T.registros.concat(L);
      return { mods: TIPOS.tiempos.mods, txt: `${L.length} registros · ${F.num(L.reduce((a, r) => a + r.horas, 0))} horas` };
    },
    banco(res) {
      const L = res.rows.map((r) => ({ f: r.fecha, imp: r.importe != null && r.importe !== '' ? num(r.importe) : num(r.abono) - num(r.cargo), saldo: r.saldo != null && r.saldo !== '' ? num(r.saldo) : null }));
      const ent = L.filter((x) => x.imp > 0).reduce((a, x) => a + x.imp, 0), sal = -L.filter((x) => x.imp < 0).reduce((a, x) => a + x.imp, 0);
      const saldos = L.filter((x) => x.saldo !== null); const ult = saldos.length ? saldos[saldos.length - 1].saldo : null;
      const fechas = L.map((x) => fecha(x.f)).filter(Boolean).sort((a, b) => a - b);
      const meses = fechas.length > 1 ? Math.max(1, (fechas[fechas.length - 1] - fechas[0]) / (30.4 * 864e5)) : 1;
      O().series.banco = { entradasMes: Math.round(ent / meses), salidasMes: Math.round(sal / meses), saldo: ult, movimientos: L.length };
      if (ult !== null) S.state.tesoreria.saldoInicial = Math.round(ult);
      return { mods: TIPOS.banco.mods, txt: `${L.length} movimientos · entradas ${F.eur(ent / meses)} y salidas ${F.eur(sal / meses)} al mes${ult !== null ? ` · saldo ${F.eur(ult)} como punto de partida de la tesorería` : ''}` };
    },
    marketing(res) {
      const C = S.state.comercial, old = new Map((C.canales || []).map((c) => [c.canal, c])), mg = S.sim.empresa.margen || 35;
      const L = res.rows.filter((r) => r.canal).map((r) => { const o = old.get(String(r.canal).trim()) || {}; const leads = num(r.leads) || o.leads || 0; return { canal: String(r.canal).trim(), inversion: Math.round(num(r.inversion) || o.inversion || 0), leads, oportunidades: num(r.oportunidades) || o.oportunidades || Math.round(leads * 0.2), clientes: num(r.clientes) || o.clientes || 0, ticket: o.ticket || 10000, margen: o.margen || mg, recurrencia: o.recurrencia || 3 }; });
      if (L.length) C.canales = L;
      return { mods: TIPOS.marketing.mods, txt: `${L.length} canales · revisa en Marketing el ticket medio y la recurrencia`, aviso: true };
    }
  };

  /* Etiquetas de contexto para documentos de texto */
  const TEMAS = { plan: /(estrateg|vision|mision|valores|objetivo|plan de empresa)/, auditoria: /(diagnost|auditor|recomendac)/, mercado: /(mercado|competen|sector|demanda|macro|regulac)/, expansion: /(expansion|internacional|nueva zona|apertura|delegacion)/, lean: /(proceso|produccion|oee|calidad|incidenc|5s|kaizen)/, logistica: /(logistic|almacen|transporte|ruta|entrega)/, impuestos: /(impuest|iva|sociedades|hacienda|fiscal)/, presupuesto: /(presupuest|desviac)/, personas: /(personal|plantilla|formacion|clima|rotacion|convenio)/, ventas: /(cliente|ventas|factur)/, compras: /(proveedor|compras|aprovision)/ };
  const temas = (t) => { const n = norm(t).slice(0, 60000); return Object.keys(TEMAS).filter((k) => (n.match(new RegExp(TEMAS[k].source, 'g')) || []).length >= 2); };

  /* ---------- Procesar un archivo ---------- */
  let ultimaFoto = null;
  async function procesar(file, forzar) {
    const o = O(), reg = { nombre: file.name, fecha: new Date().toISOString(), tam: file.size, cargas: [], estado: 'ok' };
    const doc = await A.docs.read(file);
    let hechas = 0;
    for (const h of doc.hojas) {
      const res = classify(h.rows); if (!res) continue;
      if (forzar && forzar !== res.tipo) continue;
      const out = APPLY[res.tipo](res);
      o.cargado[res.tipo] = { fecha: reg.fecha, archivo: file.name, filas: res.filas };
      (out.extra || []).forEach((t) => { o.cargado[t] = { fecha: reg.fecha, archivo: file.name, filas: res.filas }; });
      reg.cargas.push({ tipo: res.tipo, hoja: h.hoja, filas: res.filas, txt: out.txt, mods: out.mods, aviso: !!out.aviso }); hechas++;
    }
    // Sin tabla reconocible: si es un balance en PDF, se prueba con la lectura de cuentas (y su IA); si no, es un documento de contexto
    if (!hechas && /\.(pdf|docx)$/i.test(file.name) && /(balance|activo|pasivo|patrimonio|perdidas y ganancias|cuenta de resultados)/.test(norm(doc.texto).slice(0, 20000))) {
      try { const fin = await A.fin.fromFile(file); if (fin && fin.anios && fin.anios.length) { const out = APPLY.cuentas({ fin }); o.cargado.cuentas = { fecha: reg.fecha, archivo: file.name, filas: fin.anios.length }; reg.cargas.push({ tipo: 'cuentas', filas: fin.anios.length, txt: out.txt, mods: out.mods }); hechas++; } } catch (e) { /* sigue como documento */ }
    }
    if (!hechas && doc.texto && doc.texto.trim().length > 40) {
      const t = temas(doc.texto);
      o.docs = o.docs.filter((d) => d.nombre !== file.name);
      o.docs.push({ nombre: file.name, fecha: reg.fecha, chars: doc.texto.length, temas: t, texto: doc.texto.slice(0, 40000) });
      o.cargado.documentos = { fecha: reg.fecha, archivo: file.name, filas: o.docs.length };
      reg.cargas.push({ tipo: 'documentos', filas: 1, txt: `Documento de contexto${t.length ? ' · trata de ' + t.map((k) => (S.mod(k) || {}).nombre || k).join(', ') : ''}`, mods: t.length ? t : TIPOS.documentos.mods });
      hechas++;
    }
    if (!hechas) { reg.estado = 'error'; reg.error = 'No he reconocido el contenido. Revisa que la primera fila tenga los nombres de las columnas.'; }
    o.archivos = o.archivos.filter((a) => a.nombre !== file.name); o.archivos.unshift(reg); o.archivos = o.archivos.slice(0, 80);
    return reg;
  }
  async function cargar(files) {
    const o = O(); const msg = $('#orMsg');
    ultimaFoto = JSON.stringify({ state: S.state, sim: S.sim });
    const out = [];
    for (const f of files) {
      if (msg) msg.innerHTML = `<span class="muted">Leyendo ${esc(f.name)}…</span>`;
      try { out.push(await procesar(f)); } catch (e) { out.push({ nombre: f.name, estado: 'error', error: e.message, cargas: [] }); o.archivos.unshift({ nombre: f.name, fecha: new Date().toISOString(), estado: 'error', error: e.message, cargas: [] }); }
    }
    S.save();
    const ok = out.filter((r) => r.estado === 'ok').length;
    S.origenUltimo = out;
    S.rerender();
    const m = $('#orMsg'); if (m) m.innerHTML = `<span style="color:var(--go)">${ok} de ${out.length} archivo(s) cargados y repartidos.</span>${ok ? ' <button class="btn ghost" id="orUndo">Deshacer esta carga</button>' : ''}`;
    const u = $('#orUndo'); if (u) u.onclick = deshacer;
  }
  function deshacer() {
    if (!ultimaFoto) return;
    const f = JSON.parse(ultimaFoto); S.state = f.state; S.sim = f.sim; S.save(); S.saveSim(); ultimaFoto = null; S.origenUltimo = null; S.rerender();
    const m = $('#orMsg'); if (m) m.innerHTML = '<span class="muted">Carga deshecha: todo vuelve a como estaba.</span>';
  }

  /* ---------- Cobertura: qué datos tiene cada módulo ---------- */
  S.needStatus = (modId) => {
    const D = A.C360[modId]; if (!D || !D.datos) return [];
    const o = O();
    return D.datos.map((d, i) => {
      const c = o.cargado[d.tipo];
      const alt = d.alt === 'historico' && S.sim.historico && !S.sim.historico.ejemplo && S.sim.historico.anios && S.sim.historico.anios.length;
      const man = o.manual[modId + ':' + i];
      return Object.assign({}, d, { i, ok: !!(c || alt || man), via: c ? `Cargado desde ${c.archivo}` : alt ? 'Introducido en el módulo' : man ? 'Marcado como introducido a mano' : '', manual: !!man });
    });
  };
  S.needMark = (modId, i, v) => { const o = O(); if (v) o.manual[modId + ':' + i] = new Date().toISOString(); else delete o.manual[modId + ':' + i]; S.save(); };

  /* ---------- Pantalla ---------- */
  S.register({
    id: 'origen', nombre: 'Origen de datos', grupo: 'Visión', first: true,
    render(host) {
      const o = O();
      const mods = S.modules.filter((m) => A.C360[m.id]);
      const cob = mods.map((m) => { const n = S.needStatus(m.id); const ok = n.filter((x) => x.ok).length; return { m, ok, tot: n.length, pct: n.length ? Math.round(ok / n.length * 100) : 100, faltan: n.filter((x) => !x.ok) }; });
      const totOk = cob.reduce((a, c) => a + c.ok, 0), tot = cob.reduce((a, c) => a + c.tot, 0);
      const last = S.origenUltimo;
      host.innerHTML = `${S.section('Origen de datos', 'Suelta aquí toda la documentación en bruto: listados de ventas, compras, productos, clientes, plantilla, oportunidades, partes de horas, extractos del banco, balances y cuentas de resultados, informes de trabajo… Atalaya reconoce cada archivo y lo reparte solo a los módulos que lo usan (y al simulador, si son cuentas). Lo que no es una tabla se guarda como documento de contexto para los informes.')}
        <label class="or-drop glass" id="orDrop" for="orFile">
          <span class="or-orb" aria-hidden="true"><i></i><i></i><i></i></span>
          <b>Arrastra aquí tus archivos</b><span class="small muted">o pulsa para elegirlos · Excel, CSV, PDF, Word, texto · varios a la vez</span>
          <input type="file" id="orFile" multiple hidden accept=".xlsx,.xls,.ods,.csv,.tsv,.txt,.md,.pdf,.docx,.json">
        </label>
        <p class="small" id="orMsg"></p>
        ${last ? `<div class="glass pad stack"><h4>Lo que acabo de cargar</h4>${last.map(fila).join('')}</div>` : ''}
        ${S.kpiTiles([
          { k: 'Datos de los módulos', v: `${totOk}/${tot}`, st: totOk >= tot * 0.8 ? 'ok' : totOk >= tot * 0.4 ? 'warn' : 'stop', d: 'piezas de información aterrizadas' },
          { k: 'Archivos cargados', v: o.archivos.filter((a) => a.estado === 'ok').length, d: o.archivos.some((a) => a.estado === 'error') ? `${o.archivos.filter((a) => a.estado === 'error').length} sin reconocer` : 'todos reconocidos' },
          { k: 'Documentos de contexto', v: o.docs.length, d: 'informes, actas, estudios' },
          { k: 'Simulador', v: S.sim.historico && !S.sim.historico.ejemplo ? 'Con cuentas reales' : 'Con datos de ejemplo', st: S.sim.historico && !S.sim.historico.ejemplo ? 'ok' : 'warn', d: 'se actualiza al cargar cuentas' }
        ])}
        <div class="glass pad stack mt"><div class="row"><h4>Qué puedes cargar</h4></div>
          <div class="or-tipos">${Object.keys(TIPOS).map((k) => `<div class="or-tipo ${o.cargado[k] ? 'on' : ''}"><b>${esc(TIPOS[k].n)}</b><span class="small muted">${esc(TIPOS[k].d)}</span><span class="small">${o.cargado[k] ? `<span class="state st-ok">Cargado</span> ${esc(o.cargado[k].archivo)}` : `<span class="muted">Alimenta: ${TIPOS[k].mods.slice(0, 4).map((m) => esc((S.mod(m) || {}).nombre || m)).join(', ')}${TIPOS[k].mods.length > 4 ? '…' : ''}</span>`}</span></div>`).join('')}</div></div>
        <div class="glass pad stack mt"><h4>Cobertura de cada módulo</h4><p class="small muted">Lo que cada módulo necesita para darte un diagnóstico real. Pulsa uno para ir a él: dentro te dice qué falta por aterrizar.</p>
          <div class="or-cob">${cob.map((c) => `<button class="or-mod" data-go="${c.m.id}"><span class="row"><b>${esc(c.m.nombre)}</b><span class="spacer"></span><span class="state st-${c.pct >= 100 ? 'ok' : c.pct >= 50 ? 'warn' : 'stop'}">${c.ok}/${c.tot}</span></span><span class="or-bar"><i style="width:${c.pct}%"></i></span><span class="small muted">${c.faltan.length ? 'Falta: ' + esc(c.faltan.map((f) => f.t).join(' · ')) : 'Datos completos'}</span></button>`).join('')}</div></div>
        <div class="glass pad stack mt"><h4>Archivos cargados</h4>${o.archivos.length ? o.archivos.map(fila).join('') : '<p class="small muted">Todavía no has cargado ningún archivo.</p>'}</div>
        ${o.docs.length ? `<div class="glass pad stack mt"><h4>Documentos de contexto</h4><p class="small muted">Se citan en los informes 360 de los módulos que tratan y sirven de contexto al asistente.</p>${o.docs.map((d, i) => `<details class="or-doc"><summary><b>${esc(d.nombre)}</b> <span class="small muted">· ${F.num(d.chars)} caracteres${d.temas.length ? ' · ' + d.temas.map((k) => esc((S.mod(k) || {}).nombre || k)).join(', ') : ''}</span> <button class="icon-btn" data-deldoc="${i}" aria-label="Quitar documento">×</button></summary><p class="small">${esc(d.texto.slice(0, 900))}${d.texto.length > 900 ? '…' : ''}</p></details>`).join('')}</div>` : ''}`;
      const inp = $('#orFile', host), drop = $('#orDrop', host);
      inp.onchange = (e) => { const fs = Array.from(e.target.files || []); if (fs.length) cargar(fs); e.target.value = ''; };
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', (e) => { const fs = Array.from((e.dataTransfer && e.dataTransfer.files) || []); if (fs.length) cargar(fs); });
      $$('[data-go]', host).forEach((b) => b.onclick = () => S.show(b.dataset.go));
      $$('[data-deldoc]', host).forEach((b) => b.onclick = (e) => { e.preventDefault(); o.docs.splice(+b.dataset.deldoc, 1); if (!o.docs.length) delete o.cargado.documentos; S.save(); S.rerender(); });
      $$('[data-delarch]', host).forEach((b) => b.onclick = () => { o.archivos.splice(+b.dataset.delarch, 1); S.save(); S.rerender(); });
    },
    kpis() { const o = O(); const mods = Object.keys(A.C360).filter((k) => A.C360[k]); let ok = 0, tot = 0; mods.forEach((m) => { const n = S.needStatus(m); ok += n.filter((x) => x.ok).length; tot += n.length; }); return [{ k: 'Datos aterrizados', v: `${ok}/${tot}`, st: ok >= tot * 0.8 ? 'ok' : ok >= tot * 0.4 ? 'warn' : 'stop' }, { k: 'Archivos cargados', v: o.archivos.filter((a) => a.estado === 'ok').length }]; }
  });
  function fila(r, i) {
    const o = O(), idx = o.archivos.indexOf(r);
    return `<div class="or-file ${r.estado === 'error' ? 'err' : ''}"><div class="row"><b>${esc(r.nombre)}</b><span class="small muted">${r.fecha ? new Date(r.fecha).toLocaleDateString('es-ES') : ''}</span><span class="spacer"></span>${idx >= 0 ? `<button class="icon-btn" data-delarch="${idx}" aria-label="Quitar del registro">×</button>` : ''}</div>
      ${r.estado === 'error' ? `<p class="small" style="color:var(--stop)">${esc(r.error || 'No reconocido')}</p>` : r.cargas.map((c) => `<p class="small"><span class="state st-${c.aviso ? 'warn' : 'ok'}">${esc(TIPOS[c.tipo] ? TIPOS[c.tipo].n : c.tipo)}</span> ${esc(c.txt)}${c.hoja && c.hoja !== r.nombre ? ` <span class="muted">(hoja ${esc(c.hoja)})</span>` : ''}<br><span class="muted">Va a: ${c.mods.map((m) => esc((S.mod(m) || {}).nombre || m)).join(', ')}</span></p>`).join('')}</div>`;
  }
  S.origenClassify = classify; // para pruebas
})();
