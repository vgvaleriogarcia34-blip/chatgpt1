// Cerebro del asistente: una conversación con Claude (voz o WhatsApp), con herramientas y respuesta en streaming.
// En voz, el texto sale por frases en cuanto se generan, para que la síntesis empiece a hablar sin esperar al final.
import Anthropic from '@anthropic-ai/sdk';
import { C } from '../config.js';
import { DEFINICIONES, ejecutar } from './herramientas.js';
import { sistema, contextoInicial } from './prompt.js';
import * as db from '../almacen/db.js';

let cliente;
export const claude = () => (cliente ??= new Anthropic({ maxRetries: 2 }));

const MAX_VUELTAS = 6; // herramientas encadenadas por turno, como máximo

/** Corta el texto en frases para la voz: tras . ? ! : ; o, si una frase se alarga, tras una coma. */
export function cortadorDeFrases(emitir) {
  let buf = '';
  return {
    meter(t) {
      buf += t;
      for (;;) {
        const m = buf.match(/^(.+?[.?!:;…])(\s+|$)/s);
        const largo = buf.length > 140 && buf.match(/^(.{60,}?,)\s+/s);
        const corte = m && (m[2] || buf.length > m[1].length) ? m : largo;
        if (!corte) break;
        const frase = corte[1].trim();
        buf = buf.slice(corte[0].length);
        if (frase) emitir(frase);
      }
    },
    vaciar() { const f = buf.trim(); buf = ''; if (f) emitir(f); },
  };
}

// Tras una sustitución de modelo a mitad de respuesta, lo anterior al último bloque «fallback» que no sea texto no se reenvía
function limpiarFallback(content) {
  const ult = content.map((b) => b.type).lastIndexOf('fallback');
  if (ult < 0) return content;
  return content.filter((b, i) => i > ult || b.type === 'text');
}

export class Conversacion {
  /**
   * @param {object} o
   * @param {'voz'|'whatsapp'} o.canal
   * @param {'entrante'|'saliente'} o.direccion
   * @param {object|null} o.contacto  fila de contactos (db)
   * @param {object|null} o.campana   campaña de prospección (si es saliente)
   * @param {number} o.conversacionId
   * @param {object} [o.extra]        datos que reciben las herramientas en ctx (p. ej. la sesión de voz)
   */
  constructor({ canal, direccion, contacto = null, campana = null, conversacionId, extra = {} }) {
    Object.assign(this, { canal, direccion, contacto, campana, conversacionId, extra });
    this.messages = [];
    this.terminada = null; // { resultado, resumen } cuando el asistente llama a finalizar
    this.contextoPendiente = contextoInicial({ canal, direccion, contacto, campana, historial: contacto ? db.historialContacto(contacto.id) : [] });
  }

  get modelo() { return this.canal === 'voz' ? C.claude.modeloVoz : C.claude.modeloTexto; }
  get esfuerzo() { return this.canal === 'voz' ? C.claude.esfuerzoVoz : C.claude.esfuerzoTexto; }

  /**
   * Responde a lo que dice o escribe el interlocutor.
   * @param {string|Array} entrada  texto (o bloques de contenido) del usuario
   * @param {object} h
   * @param {(frase:string)=>void} [h.alHablar]   cada frase lista para decir/enviar
   * @param {(nombre:string, entrada:object)=>void} [h.alHerramienta]
   * @param {AbortSignal} [h.signal]  se aborta si el interlocutor interrumpe (voz)
   * @returns {Promise<{texto:string, interrumpida:boolean, terminada:object|null}>}
   */
  async responder(entrada, { alHablar = () => {}, alHerramienta = () => {}, signal } = {}) {
    const bloques = typeof entrada === 'string' ? [{ type: 'text', text: entrada }] : entrada;
    if (this.contextoPendiente) { bloques.unshift({ type: 'text', text: this.contextoPendiente }); this.contextoPendiente = null; }
    this.messages.push({ role: 'user', content: bloques });
    let dicho = '';

    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const frases = cortadorDeFrases((f) => { dicho += (dicho ? ' ' : '') + f; alHablar(f); });
      const params = {
        model: this.modelo,
        max_tokens: this.canal === 'voz' ? 2048 : 8192,
        output_config: { effort: this.esfuerzo },
        system: sistema(this.canal),
        tools: DEFINICIONES,
        cache_control: { type: 'ephemeral' }, // la conversación también se cachea según crece
        messages: this.messages,
      };
      if (C.claude.fallbacks) Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });

      const stream = claude().beta.messages.stream(params, { signal });
      stream.on('text', (t) => frases.meter(t));
      let msg;
      try {
        msg = await stream.finalMessage();
      } catch (err) {
        if (signal?.aborted) {
          // Interrumpido: queda en el historial solo lo que llegó a decirse, como mensaje nuevo (sin bloques internos)
          frases.vaciar();
          if (dicho) this.messages.push({ role: 'assistant', content: [{ type: 'text', text: dicho + ' [interrumpido por el interlocutor]' }] });
          else this.messages.pop();
          return { texto: dicho, interrumpida: true, terminada: this.terminada };
        }
        if (err instanceof Anthropic.APIError) throw err;
        throw err; // JSON de herramienta ilegible: no se reintenta en voz, se propaga
      }
      frases.vaciar();

      if (msg.stop_reason === 'refusal') {
        const disculpa = 'Disculpe, eso no puedo tratarlo. ¿Le ayudo con otra cosa o prefiere que le llame una persona del equipo?';
        alHablar(disculpa); dicho += ' ' + disculpa;
        this.messages.push({ role: 'assistant', content: [{ type: 'text', text: disculpa }] });
        return { texto: dicho.trim(), interrumpida: false, terminada: this.terminada };
      }
      const content = limpiarFallback(msg.content);
      this.messages.push({ role: 'assistant', content });

      const usos = content.filter((b) => b.type === 'tool_use');
      if (usos.length && msg.stop_reason === 'max_tokens') throw new Error('Entrada de herramienta truncada (max_tokens)');
      if (!usos.length || msg.stop_reason !== 'tool_use') break;

      const ctx = { canal: this.canal, direccion: this.direccion, conversacionId: this.conversacionId, contacto: this.contacto, campana: this.campana, conversacion: this, ...this.extra };
      const resultados = await Promise.all(usos.map(async (u) => {
        alHerramienta(u.name, u.input);
        const r = await ejecutar(u.name, u.input, ctx);
        db.anotar(this.conversacionId, 'herramienta', `${u.name}: ${r.contenido.slice(0, 2000)}`, { entrada: u.input, error: !!r.error });
        if (u.name === 'finalizar' && !r.error) this.terminada = u.input;
        return { type: 'tool_result', tool_use_id: u.id, content: r.contenido, ...(r.error ? { is_error: true } : {}) };
      }));
      this.messages.push({ role: 'user', content: resultados }); // todos los resultados en un solo mensaje
      if (signal?.aborted) return { texto: dicho, interrumpida: true, terminada: this.terminada };
    }
    return { texto: dicho.trim(), interrumpida: false, terminada: this.terminada };
  }
}
