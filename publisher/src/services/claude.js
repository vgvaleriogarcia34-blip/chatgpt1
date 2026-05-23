import Anthropic from '@anthropic-ai/sdk';

const client = () =>
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

const SYSTEM_IG = `Eres un copywriter experto en Instagram para captacion de clientes B2B y B2C en espanol.
Escribe captions que enganchen en la primera linea, usen lenguaje directo y cercano, incluyan un CTA claro al final
y entre 5 y 10 hashtags relevantes en una linea separada al final. No uses emojis decorativos de relleno.`;

const SYSTEM_LI = `Eres un editor de articulos de LinkedIn para profesionales que quieren captar clientes.
Escribe articulos en espanol con tono experto-cercano, primera persona, parrafos cortos, subtitulos en negrita (usa **negrita**),
un gancho en la primera linea, estructura en problema-insight-solucion-CTA, y al final una llamada a la accion
para que la persona escriba un comentario o se ponga en contacto.`;

export async function generateInstagramCaption({ topic, audience, goal, tone = 'directo' }) {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 800,
    system: SYSTEM_IG,
    messages: [
      {
        role: 'user',
        content: `Genera un caption de Instagram.
Tema: ${topic}
Publico objetivo: ${audience}
Objetivo del post: ${goal}
Tono: ${tone}

Devuelve solo el caption final, sin explicaciones.`
      }
    ]
  });
  return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
}

export async function generateLinkedinArticle({ topic, audience, goal, lengthWords = 600 }) {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_LI,
    messages: [
      {
        role: 'user',
        content: `Escribe un articulo de LinkedIn de aproximadamente ${lengthWords} palabras.
Tema: ${topic}
Publico objetivo: ${audience}
Objetivo: ${goal}

Estructura:
- Titular potente (linea 1)
- Gancho en la primera frase
- 3 a 5 secciones con subtitulos en **negrita**
- Cierre con CTA invitando a comentar o contactar

Devuelve solo el articulo, listo para publicar.`
      }
    ]
  });
  return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
}

export async function generateImageBrief({ topic, audience, templateKey }) {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 600,
    system: 'Eres un disenador de contenido para redes sociales. Devuelves JSON estricto, sin texto extra.',
    messages: [
      {
        role: 'user',
        content: `Para una imagen con plantilla "${templateKey}" sobre "${topic}" dirigida a "${audience}",
devuelve un JSON con las claves exactas que necesita la plantilla. Plantillas conocidas:
- ig-quote: { title, subtitle, author }
- ig-tip:   { title, items (array de 3 a 5 strings cortos), brand }
- ig-promo: { title, subtitle, cta, brand }
- li-cover: { title, subtitle, author }

Responde unicamente con el JSON, sin acentos graves ni comentarios.`
      }
    ]
  });
  const raw = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Claude no devolvio JSON valido para el brief de imagen');
  }
}
