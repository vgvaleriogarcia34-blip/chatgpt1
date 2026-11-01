// Síntesis de voz con ElevenLabs en WebSocket multi-contexto (multi-stream-input), en μ-law 8 kHz listo para Twilio.
// Un contexto por turno del asistente: decir(frase) manda la frase con flush; cancelar() cierra el contexto al instante
// y descarta el audio que aún llegue de él (barge-in). El siguiente contexto se abre por adelantado para no esperar.
// Eventos: audio(base64, contextoId) · fallo(err).
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { C } from '../config.js';

const MAX_COLA = 200;
const INACTIVIDAD_S = 180; // máximo que admite ElevenLabs

/** Deja el texto listo para decirse: sin markdown, sin emojis, con cifras y símbolos que se lean bien. */
export function normalizarParaVoz(texto) {
  let s = String(texto ?? '');
  s = s.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]*)`/g, '$1');
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // [texto](enlace) → texto
  s = s.replace(/\bhttps?:\/\/\S+/gi, 'el enlace');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1').replace(/\*([^*\s][^*]*)\*/g, '$1').replace(/(?<!\w)_([^_]+)_(?!\w)/g, '$1');
  s = s.replace(/^\s{0,3}(?:#{1,6}|[-*•]|\d{1,2}[.)])\s+/gm, '');
  s = s.replace(/[*#~>|]/g, ' ');
  s = s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '');
  s = s.replace(/€\s?(\d[\d.,]*)/g, '$1 euros').replace(/(\d[\d.,]*)\s?€/g, '$1 euros');
  s = s.replace(/(\d)\s?%/g, '$1 por ciento');
  s = s.replace(/(\d{1,2}:\d{2})\s?h\b\.?/g, '$1');
  s = s.replace(/\s&\s/g, ' y ');
  return s.replace(/\s+/g, ' ').trim();
}

export class ElevenLabsTTS extends EventEmitter {
  constructor({
    apiKey = C.elevenlabs.apiKey, vozId = C.elevenlabs.vozId, modelo = C.elevenlabs.modelo, urlBase = 'wss://api.elevenlabs.io',
    estabilidad = C.elevenlabs.estabilidad, similitud = C.elevenlabs.similitud, velocidad = C.elevenlabs.velocidad,
    silencioFinMs = 800, maxFinMs = 15000,
  } = {}) {
    super();
    Object.assign(this, { apiKey, vozId, modelo, urlBase: urlBase.replace(/\/$/, ''), estabilidad, similitud, velocidad, silencioFinMs, maxFinMs });
    this.ws = null; this.cola = []; this.cerrado = false; this.n = 0;
    this.ctx = null; this.conTexto = false;
    this.cancelados = new Set();
    this.esperas = new Map(); // contexto que termina → { fin(), rearmar() }
  }

  get url() {
    const q = new URLSearchParams({ model_id: this.modelo, output_format: 'ulaw_8000', language_code: 'es', inactivity_timeout: String(INACTIVIDAD_S), auto_mode: 'true' });
    return `${this.urlBase}/v1/text-to-speech/${encodeURIComponent(this.vozId)}/multi-stream-input?${q}`;
  }

  conectar() {
    if (this.cerrado || this.ws) return;
    const ws = new WebSocket(this.url, { headers: { 'xi-api-key': this.apiKey } });
    this.ws = ws;
    ws.on('open', () => {
      for (const m of this.cola.splice(0)) ws.send(m);
      this.latido = setInterval(() => this.mantener(), 60_000); this.latido.unref?.();
    });
    ws.on('message', (d) => { try { this.alMensaje(JSON.parse(d.toString())); } catch { /* ilegible */ } });
    ws.on('unexpected-response', (_req, res) => { this.emit('fallo', new Error(`ElevenLabs respondió ${res.statusCode}`)); ws.terminate(); });
    ws.on('error', (err) => this.emit('fallo', err));
    ws.on('close', () => {
      clearInterval(this.latido);
      if (this.ws !== ws) return;
      // Se pierden los contextos abiertos; el siguiente decir() reconecta
      this.ws = null; this.ctx = null; this.conTexto = false;
      for (const e of [...this.esperas.values()]) e.fin(false);
    });
  }

  enviar(obj) {
    if (this.cerrado) return;
    const m = JSON.stringify(obj);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(m);
    else { this.cola.push(m); if (this.cola.length > MAX_COLA) this.cola.shift(); this.conectar(); }
  }

  alMensaje(m) {
    const id = m.contextId ?? m.context_id;
    if (m.error || (m.message && !m.audio && !id)) this.emit('fallo', new Error(String(m.error || m.message)));
    if (!id || this.cancelados.has(id)) return;
    if (m.audio) { this.emit('audio', m.audio, id); this.esperas.get(id)?.rearmar(); }
    if (m.isFinal || m.is_final) this.esperas.get(id)?.fin();
  }

  abrirContexto() {
    this.ctx = `t${Date.now().toString(36)}-${++this.n}`; this.conTexto = false;
    this.enviar({
      text: ' ', context_id: this.ctx,
      voice_settings: { stability: this.estabilidad, similarity_boost: this.similitud, speed: this.velocidad },
      generation_config: { chunk_length_schedule: [50, 90, 120, 150] },
    });
  }

  /** Prepara conexión y primer contexto antes de que haga falta. */
  precalentar() { if (!this.ctx) this.abrirContexto(); }

  mantener() { if (this.ctx && !this.conTexto) this.enviar({ text: ' ', context_id: this.ctx }); }

  decir(frase) {
    const t = normalizarParaVoz(frase);
    if (!t) return false;
    if (!this.ctx) this.abrirContexto();
    this.conTexto = true;
    this.enviar({ text: t + ' ', context_id: this.ctx, flush: true });
    return true;
  }

  /** Cierra el turno: se resuelve cuando ha llegado todo su audio (isFinal o un rato sin audio). */
  finTurno() {
    if (!this.ctx || !this.conTexto) return Promise.resolve();
    const id = this.ctx;
    this.ctx = null; this.conTexto = false;
    return new Promise((ok) => {
      let t;
      const tope = setTimeout(() => fin(), this.maxFinMs);
      const fin = (cerrarContexto = true) => {
        clearTimeout(t); clearTimeout(tope);
        if (!this.esperas.has(id)) return;
        this.esperas.delete(id);
        if (cerrarContexto) this.enviar({ context_id: id, close_context: true });
        this.cancelados.add(id); // ya no se espera nada más de él
        ok();
      };
      const rearmar = () => { clearTimeout(t); t = setTimeout(fin, this.silencioFinMs); };
      this.esperas.set(id, { fin, rearmar });
      rearmar();
      if (!this.cerrado) this.precalentar();
    });
  }

  /** Corta en seco: descarta el turno en curso y los que estaban terminando de llegar. */
  cancelar() {
    for (const [id, e] of [...this.esperas]) { this.cancelados.add(id); e.fin(); }
    if (this.ctx && this.conTexto) {
      this.cancelados.add(this.ctx);
      this.enviar({ context_id: this.ctx, close_context: true });
      this.ctx = null; this.conTexto = false;
    }
    if (!this.cerrado) this.precalentar();
  }

  cerrar() {
    this.cerrado = true; clearInterval(this.latido);
    for (const e of [...this.esperas.values()]) e.fin(false);
    const ws = this.ws; this.ws = null;
    if (ws?.readyState === WebSocket.OPEN) { try { ws.send(JSON.stringify({ close_socket: true })); } catch { /* ya cerrado */ } ws.close(); }
    else if (ws) ws.terminate();
  }
}
