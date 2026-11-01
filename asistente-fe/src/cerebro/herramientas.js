// Herramientas del asistente: definición (lo que ve Claude) y ejecución (lo que hace el servidor).
// La lista es fija y en el mismo orden en todos los canales, para que la caché de Claude se reutilice.
// Cada herramienta valida su entrada con zod antes de ejecutarse (la entrada llega en streaming y puede venir truncada).
import { z } from 'zod';

const S = {
  buscar_conocimiento: z.object({ consulta: z.string().min(2) }),
  ficha_contacto: z.object({}).passthrough(),
  actualizar_contacto: z.object({
    nombre: z.string().optional(), empresa: z.string().optional(), cargo: z.string().optional(), email: z.string().optional(),
    sector: z.string().optional(), empleados: z.number().optional(), facturacion: z.string().optional(),
    dolor: z.string().optional(), notas: z.string().optional(),
  }),
  consultar_huecos: z.object({ desde: z.string().optional(), dias: z.number().int().min(1).max(21).optional() }),
  agendar_reunion: z.object({
    inicio: z.string(), nombre: z.string(), email: z.string().optional(), motivo: z.string(),
    modalidad: z.enum(['videollamada', 'telefono', 'presencial']).optional(),
  }),
  registrar_nota: z.object({ texto: z.string().min(2), tipo: z.enum(['nota', 'tarea', 'oportunidad']).optional(), fecha: z.string().optional() }),
  enviar_whatsapp: z.object({ texto: z.string().min(2) }),
  transferir_llamada: z.object({ motivo: z.string() }),
  dar_de_baja: z.object({ motivo: z.string().optional() }),
  finalizar: z.object({
    resultado: z.enum(['reunion_agendada', 'interesado', 'enviar_informacion', 'volver_a_llamar', 'no_interesado', 'baja', 'atendido', 'transferido', 'buzon', 'equivocado']),
    resumen: z.string(),
  }),
};

const def = (name, description, properties = {}, required = []) => ({
  name, description, eager_input_streaming: true,
  input_schema: { type: 'object', properties, required, additionalProperties: false },
});

export const DEFINICIONES = [
  def('buscar_conocimiento', 'Busca en la base de conocimiento de Familias Empresarias (servicios, método, casos, precios orientativos, ponencias, preguntas frecuentes). Úsala antes de afirmar un dato concreto que no tenga claro.',
    { consulta: { type: 'string', description: 'Qué buscar, con palabras clave' } }, ['consulta']),
  def('ficha_contacto', 'Lee la ficha del interlocutor en el CRM: datos, empresa, conversaciones anteriores, negocios abiertos y si consta su consentimiento.'),
  def('actualizar_contacto', 'Guarda en el CRM lo que el interlocutor cuenta de sí mismo y de su empresa. Solo datos que haya dicho; nunca supuestos.', {
    nombre: { type: 'string' }, empresa: { type: 'string' }, cargo: { type: 'string' }, email: { type: 'string' },
    sector: { type: 'string' }, empleados: { type: 'number' }, facturacion: { type: 'string', description: 'Rango aproximado que diga, p. ej. «entre 2 y 5 millones»' },
    dolor: { type: 'string', description: 'El problema principal con sus palabras' }, notas: { type: 'string' },
  }),
  def('consultar_huecos', 'Devuelve los próximos huecos libres en la agenda del consultor para una reunión.', {
    desde: { type: 'string', description: 'Fecha ISO desde la que buscar (por defecto, mañana)' }, dias: { type: 'number', description: 'Cuántos días mirar (máximo 21)' },
  }),
  def('agendar_reunion', 'Reserva una reunión en la agenda del consultor y envía la invitación. Solo con un hueco devuelto por consultar_huecos y tras confirmar fecha y hora con el interlocutor.', {
    inicio: { type: 'string', description: 'Fecha y hora ISO 8601 de inicio, de un hueco devuelto por consultar_huecos' },
    nombre: { type: 'string' }, email: { type: 'string', description: 'Para la invitación; pídalo y repítalo para confirmarlo' },
    motivo: { type: 'string', description: 'Tema de la reunión en una frase' }, modalidad: { type: 'string', enum: ['videollamada', 'telefono', 'presencial'] },
  }, ['inicio', 'nombre', 'motivo']),
  def('registrar_nota', 'Deja una nota, una tarea para el equipo o una oportunidad en el CRM.', {
    texto: { type: 'string' }, tipo: { type: 'string', enum: ['nota', 'tarea', 'oportunidad'] }, fecha: { type: 'string', description: 'Fecha ISO de vencimiento de la tarea, si la hay' },
  }, ['texto']),
  def('enviar_whatsapp', 'Envía un WhatsApp al interlocutor (por ejemplo, el enlace de la reunión o información que ha pedido). En una llamada, pídale permiso antes.',
    { texto: { type: 'string' } }, ['texto']),
  def('transferir_llamada', 'Pasa la llamada a una persona del equipo. Úsela si lo pide, si es un cliente con una urgencia o si la conversación necesita a una persona.',
    { motivo: { type: 'string' } }, ['motivo']),
  def('dar_de_baja', 'Registra que el interlocutor no quiere recibir más llamadas ni mensajes comerciales. Úsela en cuanto lo pida, sin insistir.',
    { motivo: { type: 'string' } }),
  def('finalizar', 'Cierra la conversación con su resultado y un resumen para el CRM. En una llamada, úsela después de despedirse: la llamada se cuelga al terminar de hablar.', {
    resultado: { type: 'string', enum: ['reunion_agendada', 'interesado', 'enviar_informacion', 'volver_a_llamar', 'no_interesado', 'baja', 'atendido', 'transferido', 'buzon', 'equivocado'] },
    resumen: { type: 'string', description: 'Tres a cinco frases: quién es, qué necesita, qué se acordó y siguiente paso' },
  }, ['resultado', 'resumen']),
];

// Herramientas que no tienen sentido en cada canal (se rechazan al ejecutarse; la lista enviada a Claude no cambia)
const SOLO_VOZ = new Set(['transferir_llamada']);

/** Registro de ejecutores: cada módulo (CRM, agenda, WhatsApp, voz…) aporta los suyos con registrar(). */
const EJECUTORES = {};
export function registrar(nombre, fn) { EJECUTORES[nombre] = fn; }

/**
 * Ejecuta una herramienta. ctx = { canal, conversacionId, contacto, sesion (voz), ... }.
 * Devuelve { contenido: string, error?: true } para el tool_result.
 */
export async function ejecutar(nombre, entrada, ctx) {
  const esquema = S[nombre];
  if (!esquema) return { contenido: `Herramienta desconocida: ${nombre}`, error: true };
  const v = esquema.safeParse(entrada ?? {});
  if (!v.success) return { contenido: 'INVALID_JSON: entrada incompleta o con campos no válidos: ' + v.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '), error: true };
  if (SOLO_VOZ.has(nombre) && ctx.canal !== 'voz') return { contenido: 'Esta herramienta solo existe en llamadas.', error: true };
  const fn = EJECUTORES[nombre];
  if (!fn) return { contenido: `La herramienta ${nombre} no está configurada en este servidor. Siga sin ella y ofrezca que una persona del equipo se ponga en contacto.`, error: true };
  try {
    const r = await fn(v.data, ctx);
    return { contenido: typeof r === 'string' ? r : JSON.stringify(r) };
  } catch (err) {
    console.error(`[herramienta ${nombre}]`, err);
    return { contenido: `No se ha podido completar (${err.message || err}). No lo intente de nuevo en esta conversación; ofrezca que una persona del equipo lo resuelva.`, error: true };
  }
}
