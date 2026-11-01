// Crea en HubSpot las propiedades de contacto que usa el asistente (ejecutar una vez): node src/crm/preparar-hubspot.js
import { hs, hubspotActivo } from './hubspot.js';

const GRUPO = 'familias_empresarias';
const si_no = [{ label: 'Sí', value: 'true', displayOrder: 0 }, { label: 'No', value: 'false', displayOrder: 1 }];
const opciones = (xs) => xs.map((v, i) => ({ label: v.replace(/_/g, ' '), value: v, displayOrder: i }));

export const PROPIEDADES = [
  { name: 'fe_base_legal', label: 'Base legal del contacto', type: 'string', fieldType: 'text', description: 'Por qué se le puede contactar (consentimiento, cliente, interés legítimo…) y de dónde sale' },
  { name: 'fe_dolor', label: 'Preocupación principal', type: 'string', fieldType: 'textarea', description: 'El problema principal con sus palabras, según el asistente' },
  { name: 'fe_origen', label: 'Origen del contacto', type: 'string', fieldType: 'text', description: 'Canal o campaña por la que llegó' },
  { name: 'fe_asistente_resultado', label: 'Último resultado del asistente', type: 'enumeration', fieldType: 'select',
    options: opciones(['reunion_agendada', 'interesado', 'enviar_informacion', 'volver_a_llamar', 'no_interesado', 'baja', 'atendido', 'transferido', 'buzon', 'equivocado']) },
  { name: 'fe_baja', label: 'Baja de comunicaciones comerciales', type: 'enumeration', fieldType: 'booleancheckbox', options: si_no, description: 'No contactar con fines comerciales (pedido por el interlocutor)' },
];

export async function preparar() {
  if (!hubspotActivo()) throw new Error('Falta HUBSPOT_TOKEN');
  try {
    await hs('POST', '/crm/v3/properties/contacts/groups', { name: GRUPO, label: 'Familias Empresarias', displayOrder: -1 });
    console.log('Grupo de propiedades creado');
  } catch (err) { if (err.status !== 409) throw err; }
  for (const p of PROPIEDADES) {
    try {
      await hs('POST', '/crm/v3/properties/contacts', { groupName: GRUPO, ...p });
      console.log(`Creada ${p.name}`);
    } catch (err) {
      if (err.status === 409) console.log(`Ya existía ${p.name}`); else throw err;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  preparar().then(() => process.exit(0), (err) => { console.error(err.message); process.exit(1); });
}
