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
    } catch (e) { console.error(e); }
    await I.guardarYa(); I.render();
  };
})();
