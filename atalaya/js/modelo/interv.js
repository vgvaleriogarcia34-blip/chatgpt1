/* Atalaya 360° · Empresa modelo en la auditoría integral
   La primera vez que se abre la auditoría con la empresa modelo, sus conversaciones se leen con la misma escucha que una
   empresa real: síntomas, constantes por el lenguaje, respuestas del guion, objetivos y actas. Después se enlazan las
   causas, se marca la verificación de la mitad de los puntos y se genera el plan de intervención. */
(function () {
  const A = window.Atalaya, V = A.interv; if (!V || !V.start) return;
  const start0 = V.start;
  V.start = async () => {
    await start0();
    const st = V.estado && V.estado(); if (!st || !st.__modelo) return;
    const pend = st.__modelo; delete st.__modelo;
    const C = V.cruce, I = V.int;
    try {
      const nuevas = pend.textos.map((t) => C.nuevaTr(t.nombre, t.texto, t.fecha, t.momento)).filter(Boolean);
      if (nuevas.length) C.procesar(nuevas);
      st.sintomas.filter((s) => !s.causa).forEach((s) => { const c = I.sugerirCausa(s); if (c) s.causa = I.asegurarCausa(c).id; });
      I.causasOrdenadas().slice(0, 3).forEach((x) => { x.c.estado = 'confirmada'; });
      I.ruta().forEach((x) => { const v = (st.verifica[x.a.id] = st.verifica[x.a.id] || {}); (I.D.VERIFICA[x.a.id] || []).forEach((q, i) => { if (i % 2 === 0) v[i] = { e: i % 4 === 0 ? 'desv' : 'ok', nota: '' }; }); });
      Object.keys((st.sesion && st.sesion.respuestas) || {}).forEach((k) => { st.sesion.hechas[k] = true; });
      if (V.generarPlan) { V.generarPlan(); st.plan.acciones.forEach((a, i) => { a.responsable = a.quien === 'empresa' ? 'Ramón Valdés' : 'Elena Ríos'; if (a.fecha < I.hoy() && i % 3) a.estado = 'hecha'; }); }
      // Recorrido por servicios: Servicio 1 y Auditoría 360 entregados y acompañamiento de 9 meses en curso
      const r = st.recorrido, d0 = (n) => I.sumar ? I.sumar(I.hoy(), -n) : I.hoy();
      if (r) {
        Object.assign(r.propuesta, { estado: 'aceptada', fecha: d0(150) });
        Object.assign(r.servicios.s1, { contratado: true, estado: 'entregado' }); Object.assign(r.servicios.s2, { contratado: true, estado: 'entregado' }); Object.assign(r.servicios.s3, { contratado: true, estado: 'curso', meses: 9 });
        ['cuentas', 'sumas', 'bancos', 'clientes', 'proveedores', 'prestamos', 'stock', 'inversiones', 'socios'].forEach((k, i) => { r.docs[k] = { e: i % 3 ? 'revisado' : 'recibido', f: d0(130 - i) }; });
        r.dinero.notas = 'En cinco años la empresa ha ganado dinero todos los años, pero la caja ha bajado de 420.000 € a 160.000 €. El beneficio se ha quedado en los clientes (los días de cobro pasan de 68 a 86) y en el stock, y el crecimiento se ha financiado con la póliza. La primera palanca es el cobro: bajar a 65 días libera más caja que cualquier venta nueva.';
        r.foto360 = { caja: { st: 'stop', nota: 'Caja de 160.000 € para 1,7 meses de costes y la póliza dispuesta casi entera.' }, abc: { st: 'stop', nota: 'Un cliente pesa el 31 %; la carpintería metálica apenas cubre costes.' }, operativo: { st: 'warn', nota: 'Todo pasa por el gerente; sin procesos escritos ni suplentes en los puestos críticos.' }, financiero: { st: 'warn', nota: 'Deuda / EBITDA de 3,9 veces y la deuda a corto creciendo.' } };
        Object.assign(r.propS2, { estado: 'aceptada', fecha: d0(110), precio: '4.500 €', forma: '50 % al inicio, 50 % a la entrega' });
        Object.assign(r.propS3, { estado: 'aceptada', fecha: d0(70), precio: '1.200 € al mes', meses: '9' });
        ['regla', 'normalizar', 'capas'].forEach((k, i) => { r.arranque[k] = { hecho: true, fecha: d0(60 - i * 14), nota: '' }; });
        (st.objetivos || []).forEach((o, i) => { if (!o.piedra) o.piedra = i ? 'Cada viernes, una decisión delegada con su criterio escrito.' : 'Cada martes de 9:00 a 10:00, cinco llamadas a clientes con vencidos de más de 30 días.'; });
        st.informes = Object.assign(st.informes || {}, { primera: d0(150) + 'T10:00:00Z', propuesta: d0(148) + 'T10:00:00Z', solicitud: d0(140) + 'T10:00:00Z', dinero: d0(115) + 'T10:00:00Z', auditoria: d0(72) + 'T10:00:00Z' });
        (st.sesiones || []).forEach((x, i) => { x.temas = x.temas || [['regla'], ['smart'], ['cobros', 'tesoreria'], ['delegacion'], ['abc-clientes']][i % 5]; });
        r.ultimo = { tab: 'sesiones', fecha: d0(3) };
      }
    } catch (e) { console.error(e); }
    await I.guardarYa(); I.render();
  };
})();
