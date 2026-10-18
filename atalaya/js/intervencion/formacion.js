/* Atalaya · Auditoría integral · Formación, seguimiento y autoevaluación
   · Catálogo de manuales de formación (uno por tema) que se entregan a la empresa.
   · Arranque del acompañamiento: la regla base (liquidez → rentabilidad → crecimiento, como la gravedad), normalizar el
     desafío antes de empezar y el diseño SMART por capas (la catedral en la mente, las piedras en la mano).
   · Objetivos SMART con su «piedra diaria»: la acción concreta y repetible que depende solo de quien la ejecuta.
   · Sesiones quincenales: tema, acta y manual de cada sesión.
   · Autoevaluación del consultor por etapa (interna).
   Ver PLAN-RECORRIDO-CONSULTOR.md. */
(function () {
  const A = window.Atalaya, V = A.interv; if (!V || !V.int) return;
  const I = V.int, D = I.D;
  const { $, $$, esc, hoy, fCorta, fLarga, pl, toast, guardar, ir, VISTAS, empresa, norm } = I;
  const S = () => I.st(), R = () => S().recorrido;
  const render = () => I.render();
  const marca = (k) => { S().informes = S().informes || {}; S().informes[k] = new Date().toISOString(); guardar(); };

  /* ================= CATÁLOGO DE FORMACIÓN ================= */
  // claves: palabras que delatan el tema en una transcripción (sin tildes, en minúscula)
  const MANUALES = [
    { id: 'regla', n: 'La regla base: liquidez, rentabilidad y crecimiento', claves: ['liquidez', 'caja', 'crecer', 'crecimiento'],
      idea: 'Una empresa funciona por un orden que no se puede saltar: la liquidez genera rentabilidad y la rentabilidad genera crecimiento. Nunca al revés: no se busca crecimiento con la liquidez.',
      regla: 'Es como la gravedad: puede no verse, pero está ahí y no se puede eludir. Quien crece consumiendo la caja del día a día acaba pagando las consecuencias, aunque la cuenta de resultados diga que gana.',
      pasos: ['Asegurar la liquidez: saber hoy cuánta caja habrá en 13 semanas y tener un colchón mínimo.', 'Con la caja segura, trabajar la rentabilidad: precios, márgenes, clientes y productos que dejan dinero.', 'Solo con rentabilidad probada, crecer: financiando el crecimiento con lo que genera el negocio o con financiación a su plazo, nunca con la caja operativa.', 'Revisar el orden cada trimestre: si la liquidez se resiente, se vuelve al primer escalón.'],
      ejemplo: { cat: 'Una empresa que crece sin depender del banco para pagar las nóminas.', obj: 'Tener cada lunes la previsión de caja de 13 semanas actualizada antes de las 10:00.', piedra: 'Cada lunes, 30 minutos con los extractos y la previsión antes de abrir el correo.' },
      errores: ['Aceptar un pedido grande sin mirar cuándo se cobra.', 'Invertir con la póliza en algo que se paga en varios años.', 'Confundir beneficio con dinero en el banco.'], indicador: 'Semanas de caja cubiertas y liquidez mínima prevista.' },
    { id: 'smart', n: 'Objetivos SMART por capas: la catedral y las piedras', claves: ['objetivo', 'meta', 'conseguir', 'lograr'],
      idea: 'Un objetivo útil depende exclusivamente de quien lo ejecuta. El resultado final (vender más, ganar más) depende de muchos; la acción diaria, solo de uno.',
      regla: 'En la mente se visualiza la catedral que se quiere construir; la acción se concentra en amontonar un número preciso de piedras cada día. El objetivo final se busca de forma indirecta, por capas.',
      pasos: ['Escribir la catedral: el resultado que se quiere, con una cifra y una fecha.', 'Bajar una capa: ¿qué tendría que pasar cada mes para llegar? (indicadores intermedios).', 'Bajar a la piedra: la acción concreta, medible y repetible que depende solo de mí (cuántas, cuándo, cuánto tiempo).', 'Comprobar las cinco letras: específico, medible, alcanzable, relevante y con fecha.', 'Medir las piedras, no la catedral: cada semana se cuentan las piedras puestas.'],
      ejemplo: { cat: 'Bajar los días de cobro de 86 a 65 este año.', obj: 'Llamar cada martes a los cinco clientes con facturas vencidas de más de 30 días.', piedra: '5 llamadas cada martes de 9:00 a 10:00, apuntadas en la hoja de cobros.' },
      errores: ['Poner como objetivo algo que depende del cliente o del mercado.', 'Medir solo el resultado final y abandonar cuando tarda.', 'Piedras sin número ni hora: «llamar más a los clientes».'], indicador: 'Piedras puestas frente a piedras previstas cada semana.' },
    { id: 'tesoreria', n: 'Tesorería y previsión de caja', claves: ['tesoreria', 'caja', 'banco', 'poliza', 'pagar', 'nomina'],
      idea: 'La caja no se mira, se prevé. Una previsión semanal a 13 semanas convierte los sustos en decisiones con tiempo.',
      regla: 'Ningún compromiso de pago sin saber en qué semana de la previsión cae.',
      pasos: ['Partir del saldo real de todas las cuentas.', 'Anotar cobros previstos por cliente y semana, con criterio realista.', 'Anotar pagos fijos (nóminas, seguros, cuotas, impuestos) y variables.', 'Marcar el colchón mínimo y las semanas que lo rompen.', 'Actualizar cada semana y comparar lo previsto con lo real.'],
      ejemplo: { cat: 'Ninguna semana por debajo del colchón mínimo en los próximos 6 meses.', obj: 'Previsión de 13 semanas actualizada cada lunes.', piedra: 'Lunes, 30 minutos: saldos, cobros y pagos de la semana.' },
      errores: ['Contar como cobrado lo que solo está facturado.', 'Olvidar impuestos trimestrales y pagas extra.', 'Usar la póliza como si fuera caja propia.'], indicador: 'Desviación entre caja prevista y real; semanas bajo el colchón.' },
    { id: 'cobros', n: 'Cobros y política de crédito a clientes', claves: ['cobr', 'impago', 'vencid', 'factura', 'plazo'],
      idea: 'Cada día que un cliente tarda en pagar, la empresa le está financiando con su propia caja.',
      regla: 'El plazo de cobro se pacta antes de vender, se factura a tiempo y se reclama en fecha.',
      pasos: ['Fijar plazos y límite de riesgo por cliente.', 'Facturar el mismo día que se entrega o se certifica.', 'Revisar vencidos cada semana y llamar antes de que venzan los grandes.', 'Escalar: aviso, llamada, carta y suspensión de servicio según días.', 'Medir los días medios de cobro cada mes.'],
      ejemplo: { cat: 'Días medios de cobro por debajo de 65.', obj: 'Ningún vencido de más de 30 días sin llamada esa misma semana.', piedra: 'Martes, una hora: lista de vencidos y llamadas.' },
      errores: ['Aceptar los plazos que impone el cliente sin negociarlos.', 'Facturar a final de mes lo entregado al principio.', 'Reclamar solo cuando falta caja.'], indicador: 'Días medios de cobro; importe vencido a más de 30 días.' },
    { id: 'margen', n: 'Margen, precio y punto de equilibrio', claves: ['margen', 'precio', 'rentab', 'beneficio', 'coste'],
      idea: 'Vender más no sirve si cada venta deja poco. El margen de contribución decide cuánto hay que vender para no perder.',
      regla: 'Cada producto y cada cliente tienen que pagar su parte de los costes fijos; si no, alguien lo está subvencionando.',
      pasos: ['Calcular el margen de contribución por producto: precio menos coste variable.', 'Calcular el punto de equilibrio: costes fijos entre margen de contribución en porcentaje.', 'Fijar un margen mínimo por debajo del cual no se vende.', 'Revisar precios al menos una vez al año y cuando suben los costes.'],
      ejemplo: { cat: 'Margen bruto de vuelta al 48 %.', obj: 'Ningún presupuesto sin margen mínimo revisado.', piedra: 'Cada presupuesto pasa por la hoja de margen antes de enviarse.' },
      errores: ['Fijar el precio mirando solo a la competencia.', 'No repercutir subidas de coste.', 'Confundir margen sobre coste con margen sobre venta.'], indicador: 'Margen de contribución por línea; ventas sobre punto de equilibrio.' },
    { id: 'abc-clientes', n: 'ABC de clientes y concentración', claves: ['cliente', 'venta', 'pedido', 'depend'],
      idea: 'Pocos clientes suelen hacer la mayor parte de la venta, pero no siempre del margen. Hay que saber quién paga la empresa.',
      regla: 'Ningún cliente debería pesar tanto que su pérdida ponga en riesgo la empresa (orientativo: más del 20-25 % de la venta).',
      pasos: ['Ordenar clientes por venta y por margen: A, B y C.', 'Mirar plazo de cobro y coste de servir de cada uno.', 'Definir una estrategia por grupo: cuidar, desarrollar, reconducir.', 'Plan para reducir la dependencia del primero.'],
      ejemplo: { cat: 'Que el primer cliente baje del 31 % al 22 % de la venta.', obj: 'Dos clientes nuevos de tipo B al trimestre.', piedra: 'Cada semana, 3 visitas o llamadas comerciales a clientes potenciales.' },
      errores: ['Tratar igual a todos los clientes.', 'Dar condiciones especiales a quien menos margen deja.', 'Descubrir la dependencia cuando el cliente se va.'], indicador: 'Peso del primer cliente y de los tres primeros; margen por cliente.' },
    { id: 'abc-producto', n: 'ABC de producto y rentabilidad por línea', claves: ['producto', 'linea', 'servicio', 'catalogo'],
      idea: 'Algunas líneas sostienen la empresa y otras la consumen. El ABC de producto lo hace visible.',
      regla: 'Cada línea de negocio tiene que justificar su sitio con margen o con una razón estratégica escrita.',
      pasos: ['Margen de contribución por línea y su peso en la venta.', 'Capacidad que consume cada línea (horas, máquina, personas).', 'Decidir: potenciar, mantener, subir precio o abandonar.', 'Revisar el catálogo cada año.'],
      ejemplo: { cat: 'Que la línea con menos margen deje de restar.', obj: 'Precio revisado de la línea deficitaria antes de fin de trimestre.', piedra: 'Una hora a la semana con el escandallo de un producto.' },
      errores: ['Mantener líneas por costumbre.', 'Repartir costes fijos a partes iguales y engañarse.', 'Medir la línea por venta y no por margen.'], indicador: 'Margen de contribución por línea y horas que consume.' },
    { id: 'estructura', n: 'Estructura de costes y gastos fijos', claves: ['fijo', 'gasto', 'estructura', 'alquiler', 'personal'],
      idea: 'Los gastos fijos se pagan se venda o no. Cuanto más pesan, más hay que vender para no perder y más duele una mala racha.',
      regla: 'Antes de añadir un coste fijo, se calcula cuánta venta nueva hace falta para pagarlo.',
      pasos: ['Separar costes fijos y variables.', 'Calcular el peso de cada partida sobre la venta.', 'Revisar contratos, suscripciones y servicios cada año.', 'Convertir en variable lo que se pueda.'],
      ejemplo: { cat: 'Bajar el punto de equilibrio un 10 %.', obj: 'Revisar tres contratos de servicios este trimestre.', piedra: 'Un contrato revisado cada dos semanas.' },
      errores: ['Contratar estructura pensando en las ventas esperadas, no en las reales.', 'Recortar a ciegas lo que genera venta.'], indicador: 'Costes fijos sobre ventas; punto de equilibrio.' },
    { id: 'financiero', n: 'Endeudamiento y sistema financiero', claves: ['deuda', 'prestamo', 'banco', 'leasing', 'interes', 'financ'],
      idea: 'La deuda no es buena ni mala: depende de a qué plazo financia qué. Lo largo con lo largo y lo corto con lo corto.',
      regla: 'Las inversiones se financian a su plazo; la póliza es para el circulante, no para comprar activos. Orientativo: deuda por debajo de 3 veces el beneficio del negocio (EBITDA).',
      pasos: ['Inventario de toda la deuda: importe, cuota, plazo, tipo y garantías.', 'Ratio de deuda sobre EBITDA y calendario de vencimientos.', 'Reordenar: lo que financia activos, a largo.', 'Relación con el banco con información periódica.'],
      ejemplo: { cat: 'Deuda por debajo de 3 veces el EBITDA en dos años.', obj: 'Calendario de vencimientos actualizado y compartido con el banco cada semestre.', piedra: 'Primer lunes de cada mes: revisar cuotas y saldos dispuestos.' },
      errores: ['Pagar inversiones con la póliza.', 'Firmar avales personales sin calcular el riesgo.', 'Ir al banco solo cuando falta dinero.'], indicador: 'Deuda / EBITDA; deuda a corto sobre total.' },
    { id: 'gobierno', n: 'Gobierno, reunión de dirección y decisiones', claves: ['decid', 'socio', 'reunion', 'direccion', 'gobierno'],
      idea: 'Una empresa se gobierna en una reunión, no en el pasillo. Lo que no se decide con orden del día, acta y responsable se vuelve a discutir.',
      regla: 'Cada decisión tiene responsable, fecha y forma de comprobar que se cumplió.',
      pasos: ['Reunión de dirección fija (semanal o quincenal) con orden del día.', 'Acta con decisiones, responsables y fechas.', 'Revisión de lo acordado al inicio de la siguiente.', 'Separar lo que decide la propiedad de lo que decide la dirección.'],
      ejemplo: { cat: 'Una dirección que decide con datos y por escrito.', obj: 'Reunión de dirección cada lunes con acta enviada ese mismo día.', piedra: 'Lunes, 60 minutos con el orden del día de 4 puntos.' },
      errores: ['Reuniones sin acta.', 'Decisiones que dependen del humor del día.', 'Mezclar familia y empresa en la misma mesa.'], indicador: 'Decisiones cerradas en plazo sobre decisiones tomadas.' },
    { id: 'delegacion', n: 'Delegación y agenda del empresario', claves: ['delegar', 'tiempo', 'agenda', 'todo pasa por mi', 'encima'],
      idea: 'Si todo pasa por el empresario, la empresa no puede crecer más que su agenda.',
      regla: 'Se delega el resultado con criterio escrito, no la tarea con instrucciones de cada paso.',
      pasos: ['Lista de lo que hace el empresario en una semana.', 'Marcar lo que solo puede hacer él y lo que podría hacer otro.', 'Escribir el criterio de decisión de lo que se delega.', 'Proteger en la agenda el tiempo de dirección.'],
      ejemplo: { cat: 'Que la empresa funcione una semana sin el empresario.', obj: 'Delegar la planificación del taller con su criterio escrito antes de dos meses.', piedra: 'Cada viernes, una decisión delegada con su criterio por escrito.' },
      errores: ['Delegar y supervisar cada paso.', 'Recuperar lo delegado al primer error.', 'Llenar el tiempo liberado con más operación.'], indicador: 'Horas a la semana del empresario en tareas de dirección.' },
    { id: 'procesos', n: 'Procesos y método de trabajo', claves: ['proceso', 'metodo', 'manual', 'procedimiento', 'orden'],
      idea: 'Lo que no está escrito depende de quien lo sabe. Un proceso escrito convierte la costumbre en método.',
      regla: 'Un proceso clave está escrito, tiene responsable y se mide.',
      pasos: ['Elegir los 5-7 procesos que más afectan a caja y cliente.', 'Escribirlos en una página: pasos, responsable y criterio.', 'Probarlos con quien los hace.', 'Medir uno o dos indicadores por proceso.'],
      ejemplo: { cat: 'Los procesos clave escritos y en uso.', obj: 'Un proceso escrito y probado cada mes.', piedra: 'Una hora cada semana con el responsable del proceso del mes.' },
      errores: ['Manuales largos que nadie lee.', 'Escribir el proceso sin quien lo hace.'], indicador: 'Procesos escritos y en uso sobre procesos clave.' },
    { id: 'personas', n: 'Personas, puestos y equipos', claves: ['equipo', 'encargado', 'responsable', 'plantilla', 'gente'],
      idea: 'Las personas rinden según el encaje con su puesto y la claridad de lo que se espera de ellas.',
      regla: 'Cada puesto tiene su misión, sus responsabilidades y su suplente.',
      pasos: ['Descripción de cada puesto clave.', 'Encaje persona-puesto y perfiles de comportamiento.', 'Suplente para cada puesto crítico.', 'Conversación periódica de seguimiento con cada mando.'],
      ejemplo: { cat: 'Ningún puesto crítico sin suplente.', obj: 'Suplente formado para los dos puestos más críticos este semestre.', piedra: 'Dos horas a la semana de formación cruzada.' },
      errores: ['Ascender al mejor técnico sin preparar al mando.', 'Descubrir el puesto crítico cuando alguien falta.'], indicador: 'Puestos críticos con suplente; rotación.' },
    { id: 'informacion', n: 'Información y cuadro de mando', claves: ['dato', 'informe', 'numero', 'indicador', 'excel'],
      idea: 'Se dirige con pocos números, siempre los mismos y a tiempo.',
      regla: 'Cada indicador tiene responsable, fecha de entrega y umbral de alarma.',
      pasos: ['Elegir 8-10 indicadores: caja, ventas, margen, cobros, producción, personas.', 'Fuente y responsable de cada uno.', 'Revisión semanal en la reunión de dirección.', 'Semáforo con umbrales acordados.'],
      ejemplo: { cat: 'Dirigir con el cuadro de mando y no con la intuición.', obj: 'Cuadro de mando completo cada lunes a las 9:00.', piedra: 'Cada responsable entrega su dato el viernes antes de las 14:00.' },
      errores: ['Muchos indicadores que nadie mira.', 'Datos que llegan tarde para decidir.'], indicador: 'Indicadores entregados a tiempo.' }
  ];
  const man = (id) => MANUALES.find((m) => m.id === id);
  // Temas que delata una transcripción (para proponer el manual de la sesión)
  const temasDe = (texto) => { const t = norm(texto || ''); return MANUALES.filter((m) => m.id !== 'regla' && m.id !== 'smart').map((m) => ({ m, n: m.claves.reduce((a, k) => a + (t.split(k).length - 1), 0) })).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 3).map((x) => x.m.id); };

  const manualHTML = (m) => {
    const In = A.informe;
    return In.section(m.n, `<p><b>La idea.</b> ${esc(m.idea)}</p>${In.callout(`<b>La regla.</b> ${esc(m.regla)}`, 'info')}<h3>Cómo se aplica</h3><ol>${m.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
      <h3>Un ejemplo, por capas</h3>${In.table(['Capa', 'En su empresa'], [['La catedral (el resultado)', m.ejemplo.cat], ['El objetivo SMART', m.ejemplo.obj], ['La piedra diaria (depende solo de usted)', m.ejemplo.piedra]])}
      <h3>Errores habituales</h3><ul>${m.errores.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><p><b>Qué medir.</b> ${esc(m.indicador)}</p>`);
  };
  const informeManual = (ids, o) => {
    const In = A.informe; In.reset(); o = o || {};
    const L = (ids || []).map(man).filter(Boolean); if (!L.length) return toast('Elija al menos un tema de formación.');
    const html = In.cover({ tipo: 'Manual de formación', kicker: o.kicker || 'Formación', titulo: L.length === 1 ? L[0].n : 'Manual de la sesión', subtitulo: o.sub || 'Lo trabajado en la sesión, para tenerlo a mano y aplicarlo.', empresa: empresa() })
      + (L.some((m) => m.id === 'regla') ? '' : In.callout('<b>Recuerde la regla base:</b> la liquidez genera rentabilidad y la rentabilidad genera crecimiento. No se busca crecimiento con la liquidez.', 'info'))
      + L.map(manualHTML).join('') + In.foot('Manual de formación para la empresa.');
    In.open({ titulo: 'Manual de formación', html, paginado: true }); marca('manual');
  };

  /* ================= ARRANQUE DEL ACOMPAÑAMIENTO ================= */
  const ARRANQUE = [
    { id: 'regla', n: 'La regla base, como la gravedad', man: 'regla',
      para: 'Que el empresario entienda el orden que gobierna su empresa antes de fijar ningún objetivo.',
      decir: ['«Hay una regla que funciona como la gravedad: no se ve, pero está ahí y no se puede eludir. La liquidez genera rentabilidad, la rentabilidad genera crecimiento. Nunca al revés.»', '«Cuando se intenta crecer con la caja del día a día, la cuenta dice que ganamos y el banco dice que no hay dinero. Eso es la gravedad cobrándose lo suyo.»', '«Todo lo que hagamos estos meses respeta ese orden: primero que la empresa pueda pagar, después que gane con lo que hace y, solo entonces, que crezca.»'],
      comprobar: ['¿Puede explicarlo con sus palabras y con un ejemplo de su empresa?', '¿Reconoce alguna decisión pasada que se saltó la regla?'] },
    { id: 'normalizar', n: 'Normalizar el desafío antes de empezar', man: 'smart',
      para: 'Contar lo que va a pasar al implantar el sistema SMART antes de que pase, para que cuando ocurra lo espere y no lo viva como un fracaso.',
      decir: ['«Le voy a contar lo que va a pasar, porque le pasa a todo el mundo: las primeras semanas costará cumplir las piedras, habrá días que no se pongan y aparecerá la tentación de volver a lo de siempre.»', '«Eso no significa que no funcione: significa que está funcionando. Lo esperamos y lo tenemos previsto.»', '«Cuando ocurra, no buscaremos culpables: miraremos qué piedra no se puso y por qué, y la ajustaremos.»'],
      comprobar: ['¿Le ha contado los tres momentos difíciles (arranque, recaída y meseta)?', '¿Ha acordado con él qué harán cuando no se cumpla una semana?'] },
    { id: 'capas', n: 'El diseño SMART por capas: la catedral y las piedras', man: 'smart',
      para: 'Diseñar objetivos que dependen exclusivamente de quien los ejecuta, buscando el resultado final de forma indirecta.',
      decir: ['«En la mente vamos a tener la catedral: el resultado que queremos. Pero no vamos a trabajar sobre la catedral, sino sobre las piedras: un número preciso de piedras cada día.»', '«Una piedra es una acción concreta, con número y hora, que depende solo de usted. Si depende del cliente o del mercado, no es una piedra.»', '«Medimos las piedras, no la catedral. Si se ponen las piedras, la catedral aparece.»'],
      comprobar: ['¿El objetivo depende solo de quien lo ejecuta?', '¿Tiene número, hora y forma de comprobarlo?'] },
    { id: 'primer', n: 'Primer objetivo SMART y su piedra diaria', man: 'smart',
      para: 'Que salga de la sesión con su primer objetivo SMART escrito por él y su piedra diaria.',
      decir: ['«Escríbalo usted: ¿qué catedral quiere ver dentro de seis meses?»', '«Ahora bajemos una capa: ¿qué tiene que pasar cada mes?»', '«Y la piedra: ¿qué hará usted, cuántas veces y a qué hora, empezando esta semana?»'],
      comprobar: ['¿Hay al menos un objetivo en «Objetivos SMART» con su piedra diaria?', '¿Se ha enviado a la mesa de trabajo como meta?'] }
  ];
  V.hechoExtra = Object.assign(V.hechoExtra || {}, {
    arranque: (st) => ARRANQUE.every((x) => (st.recorrido.arranque || {})[x.id] && st.recorrido.arranque[x.id].hecho),
    objetivos: (st) => st.objetivos.some((o) => o.piedra && I.smartObj(o).every((y) => y.ok)),
    autoeval: (st) => Object.keys(st.recorrido.autoeval || {}).length >= 2
  });
  Object.assign(V.pasoTxt, {
    arranque: 'Las primeras sesiones del acompañamiento: la regla base, normalizar el desafío, el diseño SMART por capas y su primer objetivo. Siga el guion y marque cada parte.',
    objetivos: 'Sus objetivos SMART, que dependen solo de él, con la piedra diaria de cada uno. Envíelos a la mesa de trabajo.',
    plan: 'El plan de intervención por prioridades: genere las acciones por fase y línea. Cada una tiene sus pasos, indicadores y responsable.',
    sesiones: 'Sesiones quincenales: genere el calendario, suba la transcripción de cada sesión y saque su acta y su manual de formación.',
    autoeval: 'Su autoevaluación por etapa: indicadores automáticos y preguntas de conciencia. Es interna: no se entrega a la empresa.'
  });
  const cifraRegla = () => {
    const an = V.servicios && V.servicios._ultimo; if (!an) return '';
    return `Con sus cifras: entre ${an.F[0].anio} y ${an.F[an.F.length - 1].anio} ganó ${an.benAc.toLocaleString('es-ES')} € y la caja varió ${an.cajaAc.toLocaleString('es-ES')} €.`;
  };
  VISTAS.arranque = (host) => {
    const ar = R().arranque;
    host.innerHTML = `<div class="glass pad stack"><div class="eyebrow">Servicio 3 · arranque del acompañamiento</div><p class="small" style="margin:0">Antes de pedir objetivos, el empresario necesita las reglas del juego y el método. Estas cuatro partes van en las primeras sesiones, en este orden. Cada una tiene lo que se dice, cómo comprobar que ha calado y el manual que se le entrega.</p>${cifraRegla() ? `<p class="small sv-cifra">${esc(cifraRegla())}</p>` : ''}</div>
      ${ARRANQUE.map((x, i) => { const v = ar[x.id] || {}; return `<section class="glass pad stack sv-arr ${v.hecho ? 'ok' : ''}"><div class="row"><span class="sv-n">${i + 1}</span><div><b>${esc(x.n)}</b><small class="muted">${esc(x.para)}</small></div><span class="spacer"></span><label class="small"><input type="checkbox" data-ah="${x.id}" ${v.hecho ? 'checked' : ''}> Hecho${v.fecha ? ' · ' + fCorta(v.fecha) : ''}</label></div>
        <div class="sv-decir"><div class="eyebrow">Qué decir</div>${x.decir.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
        <div><div class="eyebrow">Cómo comprobar que ha calado</div><ul class="sv-ul">${x.comprobar.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <textarea class="input" rows="2" data-an="${x.id}" placeholder="Qué dijo, qué resistencias aparecieron, qué acordasteis">${esc(v.nota || '')}</textarea>
        <div class="row"><button class="btn ghost small" data-am="${x.man}">Manual: ${esc(man(x.man).n)}</button>${x.id === 'primer' ? '<button class="btn small" data-ir="objetivos">Escribir el objetivo →</button>' : ''}</div></section>`; }).join('')}`;
    $$('[data-ah]', host).forEach((c) => (c.onchange = () => { ar[c.dataset.ah] = Object.assign(ar[c.dataset.ah] || {}, { hecho: c.checked, fecha: c.checked ? hoy() : '' }); guardar(); render(); }));
    $$('[data-an]', host).forEach((t) => (t.oninput = () => { ar[t.dataset.an] = Object.assign(ar[t.dataset.an] || {}, { nota: t.value }); guardar(); }));
    $$('[data-am]', host).forEach((b) => (b.onclick = () => informeManual([b.dataset.am, ...(b.dataset.am === 'regla' ? [] : [])], { kicker: 'Arranque del acompañamiento' })));
    $$('[data-ir]', host).forEach((b) => (b.onclick = () => ir(b.dataset.ir, { ver: true })));
    // Cifras del Servicio 1 para el ejemplo de la regla (si hay cuentas)
    if (V.servicios && !V.servicios._ultimo) V.servicios.leerSim().then((sim) => { const Y = V.servicios.aniosDe(sim); if (Y.length >= 2) { V.servicios._ultimo = V.servicios.analisisDinero(Y); render(); } });
  };

  /* ================= OBJETIVOS SMART CON SU PIEDRA DIARIA ================= */
  VISTAS.objetivos = (host) => {
    host.innerHTML = `<div class="glass pad stack"><div class="eyebrow">Objetivos SMART del empresario</div><p class="small" style="margin:0">Cada objetivo depende exclusivamente de quien lo ejecuta. Arriba, la catedral (lo que quiere); abajo, la <b>piedra diaria</b>: la acción concreta, con número y hora, que pone cada día o cada semana. Se miden las piedras, no la catedral.</p></div>
      <div class="glass pad stack">${I.objetivosHTML()}</div>`;
    I.wireObjetivos(host);
    // Piedra diaria de cada objetivo
    $$('.iv-obj', host).forEach((d) => {
      const o = S().objetivos.find((x) => x.id === d.dataset.o); if (!o) return;
      const w = document.createElement('label'); w.className = 'small sv-piedra';
      w.innerHTML = `La piedra diaria (depende solo de él: qué, cuántas veces y cuándo)<input class="input" value="${esc(o.piedra || '')}" placeholder="p. ej. 5 llamadas de cobro cada martes de 9:00 a 10:00">`;
      d.appendChild(w); $('input', w).oninput = (e) => { o.piedra = e.target.value; guardar(); };
    });
  };

  /* ================= SESIONES: TEMA, ACTA Y MANUAL ================= */
  const trDeSesion = (s) => S().transcripciones.filter((t) => t.sesion === s.id || (t.fecha && s.fecha && Math.abs(new Date(t.fecha) - new Date(s.fecha)) < 3 * 864e5));
  const textoTr = (t) => (t.turnos || []).map((x) => x.t).join(' ');
  const informeActa = (s) => {
    const In = A.informe; In.reset();
    const ses = S().sesiones.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')), sig = ses.find((x) => (x.fecha || '') > (s.fecha || ''));
    const temas = (s.temas || []).map(man).filter(Boolean), acu = (s.acuerdos || []);
    const html = In.cover({ tipo: 'Acta', kicker: (D.TIPOS_SESION[s.tipo] || 'Sesión'), titulo: 'Acta de la sesión del ' + fLarga(s.fecha), subtitulo: s.obj || '', empresa: empresa() })
      + In.summary('Lo esencial', `<p>${acu.length ? `${pl(acu.length, 'acuerdo', 'acuerdos')} con responsable y fecha.` : 'Sesión sin acuerdos anotados.'}${temas.length ? ' Temas trabajados: ' + esc(temas.map((m) => m.n).join(' · ')) + '.' : ''}${sig ? ' Próxima sesión: ' + esc(fLarga(sig.fecha)) + '.' : ''}</p>`)
      + (temas.length ? In.section('Temas trabajados', `<ul>${temas.map((m) => `<li><b>${esc(m.n)}</b>: ${esc(m.idea)}</li>`).join('')}</ul>`) : '')
      + In.section('Acuerdos', In.table(['Acuerdo', 'Responsable', 'Fecha', 'Estado'], acu.map((a) => [a.t, a.resp || '—', a.fecha ? fCorta(a.fecha) : '—', a.hecho ? 'Hecho' : 'Pendiente'])))
      + ((s.avances || []).length ? In.section('Avances', `<ul>${s.avances.map((a) => `<li>${esc(typeof a === 'string' ? a : a.t || '')}</li>`).join('')}</ul>`) : '')
      + (s.acta ? In.section('Notas de la sesión', `<p>${esc(s.acta).replace(/\n+/g, '</p><p>')}</p>`) : '')
      + In.section('Su acción hasta la próxima sesión', `<ul>${S().objetivos.filter((o) => o.piedra).map((o) => `<li><b>${esc(o.especifica || o.dice || 'Objetivo')}</b> · piedra: ${esc(o.piedra)}</li>`).join('') || '<li>Sin piedras anotadas todavía.</li>'}</ul>`)
      + In.foot('Acta para la empresa.');
    In.open({ titulo: 'Acta de la sesión', html, paginado: true }); marca('acta'); s.actaEntregada = hoy(); guardar();
  };
  const ses0 = VISTAS.sesiones;
  VISTAS.sesiones = (host) => {
    ses0(host);
    const ses = S().sesiones.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    if (!ses.length) return;
    const sec = document.createElement('section'); sec.className = 'glass pad stack sv-actas';
    sec.innerHTML = `<div class="eyebrow">Actas y manuales de cada sesión</div><small class="muted">Elija el tema de formación de cada sesión (se proponen los que delata su transcripción) y entregue el acta y el manual.</small>
      <ul class="sv-ses">${ses.map((s) => { const sug = temasDe(trDeSesion(s).map(textoTr).join(' ')); s.temas = s.temas || []; return `<li data-s="${s.id}"><div><b>${esc(fCorta(s.fecha))} · ${esc(D.TIPOS_SESION[s.tipo] || s.tipo || 'Sesión')}</b><small class="muted">${s.actaEntregada ? 'Acta entregada ' + fCorta(s.actaEntregada) : 'Acta sin entregar'}${sug.length ? ' · la transcripción habla de: ' + esc(sug.map((k) => man(k).n.split(':')[0]).join(', ')) : ''}</small>
        <div class="sv-chips">${s.temas.map((k) => `<span class="sv-chip">${esc(man(k) ? man(k).n.split(':')[0] : k)}<button data-tq="${k}" aria-label="Quitar">×</button></span>`).join('')}<select class="input small" data-ta><option value="">+ Tema de formación</option>${sug.filter((k) => !s.temas.includes(k)).map((k) => `<option value="${k}">★ ${esc(man(k).n)}</option>`).join('')}${MANUALES.filter((m) => !s.temas.includes(m.id) && !sug.includes(m.id)).map((m) => `<option value="${m.id}">${esc(m.n)}</option>`).join('')}</select></div></div>
        <div class="row"><button class="btn small" data-acta>Acta</button><button class="btn ghost small" data-man ${s.temas.length ? '' : 'disabled'}>Manual</button></div></li>`; }).join('')}</ul>`;
    host.appendChild(sec);
    $$('li[data-s]', sec).forEach((li) => {
      const s = S().sesiones.find((x) => x.id === li.dataset.s); if (!s) return;
      const ta = $('[data-ta]', li); ta.onchange = () => { if (ta.value) { s.temas.push(ta.value); guardar(); render(); } };
      $$('[data-tq]', li).forEach((b) => (b.onclick = () => { s.temas = s.temas.filter((k) => k !== b.dataset.tq); guardar(); render(); }));
      $('[data-acta]', li).onclick = () => informeActa(s);
      $('[data-man]', li).onclick = () => informeManual(s.temas, { kicker: 'Sesión del ' + fLarga(s.fecha) });
    });
  };

  /* ================= AUTOEVALUACIÓN DEL CONSULTOR (interna) ================= */
  const pctEmpresario = () => { const t = S().transcripciones.filter((x) => (x.momento || x.faseManual) !== 'comercial'); let emp = 0, tot = 0; t.forEach((x) => (x.hablantes || []).forEach((h) => { tot += +h.palabras || 0; if ((x.clientes || []).includes(h.n)) emp += +h.palabras || 0; })); return tot ? (emp / tot) * 100 : null; };
  const AUTO = [
    { e: 'Sesión previa', auto: () => { const p = pctEmpresario(), st = S(); return [['El empresario habló al menos el 60 %', p == null ? null : p >= 60, p == null ? 'Sin transcripción' : Math.round(p) + ' %'], ['Al menos 3 síntomas con su causa', st.sintomas.filter((s) => s.causa).length >= 3], ['Constantes completas', D.CONSTANTES.every((c) => I.cte(c.id))], ['Foto inicial entregada', !!(st.informes && st.informes.primera)]]; },
      q: ['¿Escuché más de lo que hablé?', '¿Separé síntomas de causas sin juzgar?', '¿Recogí sus palabras literales?'] },
    { e: 'Propuesta integral', auto: () => { const r = R(); return [['Propuesta abierta y presentada', !!(S().informes && S().informes.propuesta)], ['Estado registrado (aceptada o rechazada)', ['aceptada', 'rechazada'].includes(r.propuesta.estado)], ['Si se rechazó, motivo anotado', r.propuesta.estado === 'rechazada' ? !!(r.propuesta.motivo || '').trim() : null, r.propuesta.estado === 'rechazada' ? '' : 'No aplica']]; },
      q: ['¿La propuesta habla de sus prioridades con sus palabras?', '¿Dejé claro el orden de los servicios y por qué?'] },
    { e: 'Servicio 1 · El dinero', auto: () => [['Documentación recibida (70 % o más)', V.hechoExtra.s1docs(S())], ['Conclusiones escritas', V.hechoExtra.s1dinero(S())], ['Informe entregado', !!(S().informes && S().informes.dinero)], ['Propuesta de la Auditoría 360 presentada', ['presentada', 'aceptada', 'rechazada'].includes((R().propS2 || {}).estado)]],
      q: ['¿Expliqué la regla liquidez → rentabilidad → crecimiento con sus cifras?', '¿El empresario entendió dónde está su dinero?'] },
    { e: 'Servicio 2 · Auditoría 360', auto: () => [['Verificación por áreas (50 % o más)', I.hecho('auditoria')], ['Foto 360 completa', V.hechoExtra.foto360(S())], ['Informe 360 entregado', !!(S().informes && S().informes.auditoria)], ['Propuesta de acompañamiento presentada', ['presentada', 'aceptada', 'rechazada'].includes((R().propS3 || {}).estado)]],
      q: ['¿La foto 360 es objetiva y está verificada sobre el terreno?', '¿Las prioridades respetan la regla base?'] },
    { e: 'Servicio 3 · Acompañamiento', auto: () => { const ses = S().sesiones, acu = ses.flatMap((s) => s.acuerdos || []); return [['Arranque completo (regla, normalizar, capas, primer objetivo)', V.hechoExtra.arranque(S())], ['Objetivos SMART con piedra diaria', V.hechoExtra.objetivos(S())], ['Sesiones con acta entregada', ses.length ? ses.filter((s) => s.actaEntregada).length >= Math.ceil(ses.filter((s) => (s.fecha || '') <= hoy()).length * 0.7) : null], ['Acuerdos cumplidos (60 % o más)', acu.length ? acu.filter((a) => a.hecho).length / acu.length >= 0.6 : null, acu.length ? Math.round((acu.filter((a) => a.hecho).length / acu.length) * 100) + ' %' : 'Sin acuerdos']]; },
      q: ['¿Normalicé el desafío antes de pedir objetivos?', '¿Cada objetivo depende solo de quien lo ejecuta?', '¿Formé antes de exigir?'] }
  ];
  const notaEtapa = (i) => { const a = R().autoeval[i] || {}, au = AUTO[i].auto().filter((x) => x[1] != null), qv = Object.values(a.q || {}).map(Number).filter(Boolean); const pa = au.length ? au.filter((x) => x[1]).length / au.length : null, pq = qv.length ? qv.reduce((s, x) => s + x, 0) / qv.length / 5 : null; const ps = [pa, pq].filter((x) => x != null); return ps.length ? Math.round((ps.reduce((s, x) => s + x, 0) / ps.length) * 10 * 10) / 10 : null; };
  VISTAS.autoeval = (host) => {
    const ae = R().autoeval;
    host.innerHTML = `<div class="glass pad stack"><div class="eyebrow">Autoevaluación del consultor · uso interno</div><p class="small" style="margin:0">Indicadores que Atalaya mide solo y preguntas de conciencia que usted puntúa del 1 al 5. Al final de cada etapa, escriba qué hará mejor en la próxima sesión.</p><div class="row"><button class="btn small" id="svAeInf">Informe de autoevaluación (interno)</button></div></div>
      ${AUTO.map((E, i) => { const a = ae[i] || {}, au = E.auto(), nt = notaEtapa(i); return `<section class="glass pad stack"><div class="row"><b>${esc(E.e)}</b><span class="spacer"></span><span class="sv-nota ${nt == null ? '' : nt >= 7 ? 'ok' : nt >= 5 ? 'warn' : 'stop'}">${nt == null ? '—' : String(nt).replace('.', ',')}/10</span></div>
        <ul class="sv-dat">${au.map(([t, ok, det]) => `<li><i class="ms-luz ${ok == null ? '' : ok ? 'ok' : 'stop'}"></i><span>${esc(t)}</span><b>${esc(det || (ok == null ? 'Sin datos' : ok ? 'Sí' : 'No'))}</b></li>`).join('')}</ul>
        <ul class="sv-q">${E.q.map((q, j) => `<li><span>${esc(q)}</span><span class="sv-esc">${[1, 2, 3, 4, 5].map((n) => `<button class="${+((a.q || {})[j]) === n ? 'on' : ''}" data-q="${i}:${j}:${n}">${n}</button>`).join('')}</span></li>`).join('')}</ul>
        <textarea class="input" rows="2" data-am="${i}" placeholder="Qué haré mejor en la próxima sesión">${esc(a.mejora || '')}</textarea></section>`; }).join('')}`;
    $$('[data-q]', host).forEach((b) => (b.onclick = () => { const [i, j, n] = b.dataset.q.split(':').map(Number); ae[i] = ae[i] || {}; ae[i].q = ae[i].q || {}; ae[i].q[j] = n; ae[i].f = hoy(); guardar(); render(); }));
    $$('[data-am]', host).forEach((t) => (t.oninput = () => { const i = +t.dataset.am; ae[i] = ae[i] || {}; ae[i].mejora = t.value; ae[i].f = hoy(); guardar(); }));
    $('#svAeInf', host).onclick = () => informeAutoeval();
  };
  const informeAutoeval = () => {
    const In = A.informe; In.reset(); const ae = R().autoeval;
    const html = In.cover({ tipo: 'Uso interno', kicker: 'Autoevaluación del consultor', titulo: 'Cómo lo estoy haciendo', subtitulo: 'Indicadores del recorrido y preguntas de conciencia, por etapa.', empresa: empresa() })
      + In.kpis(AUTO.map((E, i) => { const nt = notaEtapa(i); return { k: E.e, v: nt == null ? '—' : String(nt).replace('.', ',') + '/10', st: nt == null ? null : nt >= 7 ? 'ok' : nt >= 5 ? 'warn' : 'stop' }; }))
      + AUTO.map((E, i) => { const a = ae[i] || {}; return In.section(E.e, In.table(['Indicador', 'Resultado'], E.auto().map(([t, ok, det]) => [t, det || (ok == null ? 'Sin datos' : ok ? 'Sí' : 'No')])) + In.table(['Pregunta', 'Puntuación'], E.q.map((q, j) => [q, (a.q || {})[j] ? a.q[j] + '/5' : '—'])) + (a.mejora ? In.callout('<b>Qué haré mejor:</b> ' + esc(a.mejora), 'info') : '')); }).join('')
      + In.foot('Documento interno del consultor. No se entrega a la empresa.');
    In.open({ titulo: 'Autoevaluación del consultor', html, paginado: true }); marca('autoeval');
  };

  /* ================= INFORMES Y DOCUMENTOS: el ecosistema documental completo ================= */
  const inf0 = VISTAS.informes;
  VISTAS.informes = (host) => {
    inf0(host);
    const L = (V.serviciosInformes || []).concat([
      { k: 'manual', n: 'Manual: la regla base', d: 'Liquidez → rentabilidad → crecimiento', fn: () => informeManual(['regla']), para: 'empresa' },
      { k: 'manual', n: 'Manual: objetivos SMART por capas', d: 'La catedral y las piedras', fn: () => informeManual(['smart']), para: 'empresa' },
      { k: 'autoeval', n: 'Autoevaluación del consultor', d: 'Por etapa · interno', fn: () => informeAutoeval(), para: 'interno' }
    ]);
    const inf = S().informes || {};
    const sec = document.createElement('section'); sec.className = 'glass pad stack sv-docsall';
    sec.innerHTML = `<div class="eyebrow">Recorrido por servicios</div><small class="muted">Propuestas, informes y manuales de cada etapa. Las actas de cada sesión están en «Sesiones quincenales».</small>
      <div class="sv-docgrid">${[['empresa', 'Para la empresa'], ['interno', 'Interno del consultor']].map(([p, t]) => `<div><b class="small">${t}</b><ul class="sv-doclist">${L.filter((x) => x.para === p).map((x, i) => `<li><button class="btn ghost small" data-doc="${L.indexOf(x)}">${esc(x.n)}</button><small class="muted">${esc(x.d)}${inf[x.k] && x.k !== 'manual' ? ' · abierto ' + fCorta(inf[x.k].slice(0, 10)) : ''}</small></li>`).join('')}</ul></div>`).join('')}</div>
      <div class="eyebrow" style="margin-top:8px">Catálogo de formación</div><div class="sv-chips">${MANUALES.map((m) => `<button class="btn ghost small" data-mf="${m.id}">${esc(m.n.split(':')[0])}</button>`).join('')}</div>`;
    host.prepend(sec);
    $$('[data-doc]', sec).forEach((b) => (b.onclick = () => L[+b.dataset.doc].fn()));
    $$('[data-mf]', sec).forEach((b) => (b.onclick = () => informeManual([b.dataset.mf])));
  };

  /* ================= FICHAS DE RECORRIDO DE LOS PASOS NUEVOS ================= */
  const ent = (k) => !!(S().informes && S().informes[k]);
  V.fichaExtra = {
    foto: { donde: 'Cierra la sesión previa: lo que ya sabe después de escucharle y qué servicio le toca primero.',
      ves: () => { const r = I.ruta(); return [`${pl(r.filter((x) => x.n === 'stop').length, 'área', 'áreas')} en urgencias y ${pl(S().sintomas.length, 'síntoma', 'síntomas')}.`, ent('primera') ? 'Informe de la sesión previa entregado.' : 'Falta entregar el informe de la sesión previa.']; },
      sig: [{ f: 'con', t: 'Entregue el informe de la sesión previa en 48 horas.' }, { f: 'coa', t: 'Pregúntele qué le ha llamado la atención.', q: 'De todo lo que hemos hablado, ¿qué es lo que más le preocupa ahora?' }],
      pedir: ['Que confirme sus tres prioridades'], medir: ['Días entre la sesión y la entrega del informe'], exp: 'Si la liquidez está en rojo, el Servicio 1 no admite espera: dígalo así en la foto inicial.' },
    aceptacion: { donde: 'Registra cómo quedó la propuesta integral y qué servicios contrata.',
      ves: () => { const r = R(); return [`Propuesta: ${r.propuesta.estado}${r.propuesta.fecha ? ' (' + fCorta(r.propuesta.fecha) + ')' : ''}.`, `Contratados: ${['s1', 's2', 's3'].filter((k) => r.servicios[k].contratado).map((k) => k.toUpperCase()).join(', ') || 'ninguno todavía'}.`]; },
      sig: [{ f: 'con', t: 'Si acepta, fije ya la fecha de entrega de la documentación.' }, { f: 'coa', t: 'Si duda, pregunte por el coste de no hacer nada.', q: '¿Qué pasa si dentro de un año seguimos igual?' }],
      pedir: ['Aceptación por escrito (correo o firma)'], medir: ['Propuestas aceptadas sobre presentadas'], exp: 'Un rechazo también enseña: anote el motivo; su autoevaluación lo recoge.' },
    s1docs: { donde: 'Pide la documentación del Servicio 1 y marca lo que llega.',
      ves: () => { const d = R().docs, n = V.servicios.DOCS_S1.filter((x) => ['recibido', 'revisado', 'na'].includes(d[x.id] && d[x.id].e)).length; return [`${n} de ${V.servicios.DOCS_S1.length} documentos recibidos o resueltos.`]; },
      sig: [{ f: 'con', t: 'Envíe la solicitud para la empresa con fecha límite.' }, { f: 'men', t: 'Explíquele para qué sirve cada documento: colabora mejor quien entiende.' }],
      pedir: ['Cuentas anuales de 3 a 5 años', 'Extractos y pólizas', 'Pendientes de cobro y de pago'], medir: ['Días hasta tener la documentación completa'], exp: 'Con dos años de cuentas ya se puede empezar el análisis; el resto lo afina.' },
    s1dinero: { donde: 'Analiza dónde acabó el beneficio de cada año: clientes, stock, inversiones, préstamos, dividendos o caja.',
      ves: () => [V.hechoExtra.s1dinero(S()) ? 'Conclusiones escritas.' : 'Faltan sus conclusiones: van al informe.'],
      sig: [{ f: 'con', t: 'Busque la decisión que hay detrás de cada euro atrapado.' }, { f: 'men', t: 'Prepare cómo explicarle la regla liquidez → rentabilidad → crecimiento con sus cifras.' }],
      pedir: ['Aclaraciones del contable sobre partidas grandes sin explicar'], medir: ['Beneficio acumulado frente a variación de caja'], exp: 'Si «otras partidas» es grande, revise Hacienda, otros deudores y provisiones antes de concluir.' },
    s1cierre: { donde: 'Entrega el informe del dinero y presenta la propuesta de la Auditoría 360.',
      ves: () => [ent('dinero') ? 'Informe del dinero entregado.' : 'Falta entregar el informe.', `Propuesta de la 360: ${(R().propS2 || {}).estado || 'sin preparar'}.`],
      sig: [{ f: 'con', t: 'Presente la propuesta en la misma reunión de entrega del informe.' }, { f: 'coa', t: 'Una el hallazgo con la siguiente pregunta.', q: 'Ya sabe dónde está su dinero. ¿Quiere saber por qué se queda ahí?' }],
      pedir: [], medir: ['Propuestas de la 360 aceptadas tras el Servicio 1'], exp: 'La venta del siguiente servicio se apoya en un informe que le haya sorprendido.' },
    foto360: { donde: 'La foto completa en seis bloques, de los datos a la operativa.',
      ves: () => { const F = R().foto360 || {}; return [`${V.servicios.BLOQUES.filter((b) => F[b.id] && (F[b.id].st || (F[b.id].nota || '').trim())).length} de 6 bloques con su semáforo o su nota.`]; },
      sig: [{ f: 'con', t: 'Verifique sobre el terreno lo que dicen los datos.' }, { f: 'con', t: 'Ordene las prioridades por la regla base.' }],
      pedir: ['La documentación que falte en cada bloque'], medir: ['Bloques verificados sobre el total'], exp: 'Un bloque sin datos también es un hallazgo: la empresa no tiene esa información.' },
    s2cierre: { donde: 'Entrega el informe 360 y presenta el acompañamiento de 6 a 12 meses.',
      ves: () => [ent('auditoria') ? 'Informe 360 entregado.' : 'Falta entregar el informe 360.', `Propuesta de acompañamiento: ${(R().propS3 || {}).estado || 'sin preparar'}.`],
      sig: [{ f: 'coa', t: 'Pregunte qué objetivo quiere alcanzar primero.', q: 'De estas prioridades, ¿cuál le cambiaría más la vida si la resolviéramos?' }],
      pedir: [], medir: ['Propuestas de acompañamiento aceptadas'], exp: 'Duración según el número de prioridades: 6 meses para 2-3; 12 para 5 o más.' },
    arranque: { donde: 'Las primeras sesiones del acompañamiento: reglas y método antes que objetivos.',
      ves: () => { const ar = R().arranque; return [`${ARRANQUE.filter((x) => ar[x.id] && ar[x.id].hecho).length} de 4 partes hechas.`]; },
      sig: [{ f: 'men', t: 'Enseñe la regla base con sus cifras.' }, { f: 'coa', t: 'Normalice el desafío antes de que aparezca.' }, { f: 'con', t: 'Entregue el manual de cada parte.' }],
      pedir: ['Que traiga una decisión reciente para analizarla con la regla base'], medir: ['Que pueda explicar la regla con sus palabras'], exp: 'Si se salta la normalización, la primera recaída se vive como fracaso y se abandona el método.' },
    objetivos: { donde: 'Sus objetivos SMART, que dependen solo de él, con su piedra diaria.',
      ves: () => { const o = S().objetivos; return [`${pl(o.length, 'objetivo', 'objetivos')}, ${o.filter((x) => x.piedra).length} con piedra diaria.`]; },
      sig: [{ f: 'coa', t: 'Que lo escriba él.', q: '¿Qué hará usted, cuántas veces y a qué hora, empezando esta semana?' }, { f: 'con', t: 'Envíelo a la mesa de trabajo como meta.' }],
      pedir: [], medir: ['Piedras puestas frente a previstas cada semana'], exp: 'Si el objetivo depende del cliente o del mercado, baje una capa hasta encontrar la piedra.' },
    autoeval: { donde: 'Su autoevaluación: interna, no se entrega a la empresa.',
      ves: () => AUTO.map((E, i) => { const n = notaEtapa(i); return `${E.e}: ${n == null ? 'sin datos' : String(n).replace('.', ',') + '/10'}`; }),
      sig: [{ f: 'con', t: 'Al terminar cada etapa, puntúe y escriba qué hará mejor.' }], pedir: [], medir: ['Nota por etapa a lo largo de los clientes'], exp: 'Las preguntas de conciencia valen más que los indicadores: son las que cambian su forma de trabajar.' }
  };

  V.formacion = { MANUALES, ARRANQUE, AUTO, temasDe, informeManual, informeActa, informeAutoeval, notaEtapa };
})();
