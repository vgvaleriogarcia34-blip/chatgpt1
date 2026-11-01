// Configuración del asistente. Todo sale de variables de entorno (o de un fichero .env en la raíz, si existe).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// .env sencillo (CLAVE=valor), sin dependencias; las variables ya definidas en el entorno mandan
const envFile = path.join(RAIZ, '.env');
if (fs.existsSync(envFile)) {
  for (const linea of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const e = (k, d = '') => (process.env[k] ?? d).trim();
const n = (k, d) => (process.env[k] ? Number(process.env[k]) : d);
const b = (k, d = false) => (process.env[k] ? /^(1|true|si|sí|yes)$/i.test(process.env[k]) : d);

export const C = {
  puerto: n('PORT', 8090),
  urlPublica: e('URL_PUBLICA').replace(/\/$/, ''), // https://asistente.su-dominio.es (Twilio y Meta llaman aquí)
  datos: e('DATOS_DIR', path.join(RAIZ, 'datos')),

  empresa: {
    nombre: e('EMPRESA_NOMBRE', 'Familias Empresarias'),
    marcaComercial: e('EMPRESA_MARCA', 'Business Avance'),
    web: e('EMPRESA_WEB', 'https://businessavance.es'),
    asistente: e('ASISTENTE_NOMBRE', 'Lucía'), // nombre con el que se presenta (siempre dice que es un asistente de IA)
    responsable: e('RESPONSABLE_NOMBRE', 'Valerio'),
    movilResponsable: e('RESPONSABLE_MOVIL'), // E.164: +346XXXXXXXX, para transferir llamadas
    emailResponsable: e('RESPONSABLE_EMAIL'),
    zonaHoraria: e('ZONA_HORARIA', 'Europe/Madrid'),
  },

  claude: {
    // Opus 5.5 en todos los canales; la voz va con esfuerzo bajo para responder sin pausa
    modeloVoz: e('MODELO_VOZ', 'claude-opus-5-5'),
    modeloTexto: e('MODELO_TEXTO', 'claude-opus-5-5'),
    esfuerzoVoz: e('ESFUERZO_VOZ', 'low'),
    esfuerzoTexto: e('ESFUERZO_TEXTO', 'medium'),
    fallbacks: b('CLAUDE_FALLBACKS', true),
  },

  twilio: {
    accountSid: e('TWILIO_ACCOUNT_SID'),
    authToken: e('TWILIO_AUTH_TOKEN'),
    numero: e('TWILIO_NUMERO'), // número español +34 comprado en Twilio (con su paquete regulatorio)
    grabar: b('GRABAR_LLAMADAS', false),
  },
  deepgram: { apiKey: e('DEEPGRAM_API_KEY'), modelo: e('DEEPGRAM_MODELO', 'nova-3'), idioma: e('DEEPGRAM_IDIOMA', 'es') },
  elevenlabs: {
    apiKey: e('ELEVENLABS_API_KEY'),
    vozId: e('ELEVENLABS_VOZ_ID'), // voz en castellano de España (o una voz propia clonada con permiso)
    modelo: e('ELEVENLABS_MODELO', 'eleven_flash_v2_5'),
    estabilidad: n('ELEVENLABS_ESTABILIDAD', 0.45),
    similitud: n('ELEVENLABS_SIMILITUD', 0.8),
    velocidad: n('ELEVENLABS_VELOCIDAD', 1.0),
  },
  whatsapp: {
    token: e('WHATSAPP_TOKEN'), // token permanente de la app de Meta (usuario del sistema)
    phoneNumberId: e('WHATSAPP_PHONE_NUMBER_ID'),
    verifyToken: e('WHATSAPP_VERIFY_TOKEN'), // el que se escribe al registrar el webhook en Meta
    appSecret: e('WHATSAPP_APP_SECRET'), // para comprobar la firma X-Hub-Signature-256
    version: e('WHATSAPP_API_VERSION', 'v23.0'),
  },
  hubspot: { token: e('HUBSPOT_TOKEN'), propietarioId: e('HUBSPOT_OWNER_ID'), pipeline: e('HUBSPOT_PIPELINE', 'default'), etapaInicial: e('HUBSPOT_ETAPA', 'appointmentscheduled') },
  google: {
    credenciales: e('GOOGLE_CREDENCIALES'), // ruta al JSON de la cuenta de servicio
    calendarId: e('GOOGLE_CALENDAR_ID', 'primary'),
    suplantar: e('GOOGLE_SUPLANTAR'), // correo a suplantar con delegación de dominio (Workspace), si procede
    driveCarpetas: e('GOOGLE_DRIVE_CARPETAS').split(',').map((x) => x.trim()).filter(Boolean),
  },
  agenda: {
    duracionMin: n('REUNION_MINUTOS', 30),
    horario: e('HORARIO_REUNIONES', 'L-V 09:30-14:00,16:00-19:00'),
    antelacionHoras: n('REUNION_ANTELACION_H', 24),
  },
  prospeccion: {
    activa: b('PROSPECCION_ACTIVA', false),
    horario: e('HORARIO_LLAMADAS', 'L-V 10:00-14:00,16:30-20:00'), // dentro del margen legal de 9 a 21 en días laborables
    maxIntentos: n('PROSPECCION_MAX_INTENTOS', 3),
    llamadasSimultaneas: n('PROSPECCION_SIMULTANEAS', 2),
    festivos: e('FESTIVOS').split(',').map((x) => x.trim()).filter(Boolean), // AAAA-MM-DD
  },
  panel: { usuario: e('PANEL_USUARIO', 'admin'), clave: e('PANEL_CLAVE') },
};

export function faltan(...claves) {
  return claves.filter((k) => !process.env[k]);
}
