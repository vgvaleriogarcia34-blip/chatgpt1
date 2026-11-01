// Prospección: al cargarse el módulo arranca el planificador de llamadas, solo si PROSPECCION_ACTIVA está a «sí».
// La gestión de campañas (crear, importar, pausar, resultados) se hace desde el panel: /panel/api/campanas…
import { C } from '../config.js';
import { iniciarPlanificador } from './campanas.js';

export let pararPlanificador = () => {};
if (C.prospeccion.activa && process.env.NODE_ENV !== 'test') {
  // Se espera un momento para que el resto de módulos (voz) termine de registrarse
  setTimeout(async () => {
    pararPlanificador = await iniciarPlanificador();
    console.log(`  prospección activa: hasta ${C.prospeccion.llamadasSimultaneas} llamadas a la vez, horario ${C.prospeccion.horario}`);
  }, 2000).unref();
}
