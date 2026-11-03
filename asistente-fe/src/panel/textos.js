// Textos legibles para el panel y las exportaciones: nunca se enseña un código interno (volver_a_llamar → «Volver a llamar»).
import { BASES } from '../prospeccion/cumplimiento.js';

export const TEXTOS = {
  resultado: {
    reunion_agendada: 'Sesión agendada', reunion_pendiente: 'Sesión por confirmar', interesado: 'Interesado', enviar_informacion: 'Enviar información',
    volver_a_llamar: 'Volver a llamar', no_interesado: 'No interesado', baja: 'Baja', atendido: 'Atendido', transferido: 'Transferido',
    buzon: 'Buzón de voz', equivocado: 'Número equivocado', colgada: 'Colgó', sin_resultado: 'Sin resultado',
    completed: 'Completada', 'no-answer': 'No contesta', busy: 'Comunica', failed: 'Fallo de la llamada', canceled: 'Cancelada',
  },
  estadoConversacion: { abierta: 'En curso', cerrada: 'Cerrada' },
  estadoContacto: {
    pendiente: 'Pendiente', reintentar: 'Por reintentar', llamando: 'Llamando', completado: 'Completado', agotado: 'Intentos agotados',
    baja: 'Baja', excluido: 'Excluido', excluido_baja: 'Excluido (baja)', sin_base_legal: 'Sin base legal (correo o LinkedIn)', error: 'Error',
  },
  // Motivos guardados como código en campana_contactos
  motivo: { baja: 'Dado de baja', robinson: 'En la lista Robinson' },
  estadoCampana: { borrador: 'Borrador (sin activar)', activa: 'Activa', pausada: 'Pausada' },
  canal: { voz: 'Llamada', whatsapp: 'WhatsApp', prueba: 'Prueba del panel', panel: 'Panel', hubspot: 'HubSpot', email: 'Correo' },
  direccion: { entrante: 'entrante', saliente: 'saliente' },
  rol: { usuario: 'Interlocutor', asistente: 'Asistente', herramienta: 'Herramienta', nota: 'Nota', reunion: 'Sesión', whatsapp_enviado: 'WhatsApp enviado', sistema: 'Sistema' },
  base: { ...BASES, '': 'Sin base legal' },
  accion: {
    reunion_pendiente: 'Sesión por confirmar', transferencia_sin_respuesta: 'Transferencia sin respuesta', urgencia: 'Urgencia',
    voz_error: 'Fallo en una llamada', whatsapp_error: 'Fallo al responder un WhatsApp', whatsapp_fallo: 'WhatsApp no entregado',
    atalaya_reunion_fallo: 'Sesión no enviada a Atalaya',
  },
  transferencia: { atendida: 'Atendida', sin_respuesta: 'Sin respuesta' },
  linea: { fijo: 'Fijo', movil_corporativo: 'Móvil de empresa', movil_personal: 'Móvil personal' },
  origen: { importacion: 'Importación de una lista', prospeccion: 'Campaña de prospección', whatsapp: 'WhatsApp', voz: 'Llamada', asistente: 'Asistente', panel: 'Alta desde el panel', hubspot: 'HubSpot' },
};

/** Texto de un código en un grupo; si no se conoce, el código con espacios y en mayúscula inicial. */
export function texto(grupo, codigo) {
  if (codigo === null || codigo === undefined || codigo === '') return '';
  const t = TEXTOS[grupo]?.[codigo];
  if (t) return t;
  const s = String(codigo).replace(/[_-]+/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
