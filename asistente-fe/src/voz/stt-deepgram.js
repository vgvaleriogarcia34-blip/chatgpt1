// Reconocimiento de voz en vivo con Deepgram (WebSocket). Recibe μ-law 8 kHz de Twilio tal cual, sin convertir.
// Eventos: hablaInicio() · parcial(textoDelTurno) · final(textoDelTurno, ts) · fallo(err).
// Un turno se forma acumulando los resultados is_final hasta speech_final (300 ms de silencio) o UtteranceEnd.
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { C } from '../config.js';

const MAX_COLA = 150; // tramas de 20 ms (~3 s) guardadas mientras conecta o reconecta

export class DeepgramSTT extends EventEmitter {
  constructor({ apiKey = C.deepgram.apiKey, urlBase = 'wss://api.deepgram.com', modelo = C.deepgram.modelo, idioma = C.deepgram.idioma, reintentos = 5, keepAliveMs = 8000 } = {}) {
    super();
    Object.assign(this, { apiKey, urlBase: urlBase.replace(/\/$/, ''), modelo, idioma, reintentos, keepAliveMs });
    this.ws = null; this.cola = []; this.trozos = []; this.enHabla = false; this.cerrado = false; this.intentos = 0;
  }

  get url() {
    const q = new URLSearchParams({
      model: this.modelo, language: this.idioma, encoding: 'mulaw', sample_rate: '8000', channels: '1',
      interim_results: 'true', endpointing: '300', utterance_end_ms: '1000', vad_events: 'true', smart_format: 'true', punctuate: 'true',
    });
    return `${this.urlBase}/v1/listen?${q}`;
  }

  conectar() {
    if (this.cerrado) return;
    const ws = new WebSocket(this.url, { headers: { Authorization: `Token ${this.apiKey}` } });
    this.ws = ws;
    ws.on('open', () => {
      this.intentos = 0;
      for (const b of this.cola.splice(0)) ws.send(b);
      this.latido = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('{"type":"KeepAlive"}'); }, this.keepAliveMs);
      this.latido.unref?.();
    });
    ws.on('message', (d, binario) => { if (!binario) { try { this.alMensaje(JSON.parse(d.toString())); } catch { /* mensaje ilegible: se ignora */ } } });
    ws.on('unexpected-response', (_req, res) => {
      if (res.statusCode === 401 || res.statusCode === 403) this.cerrado = true; // clave mala: no reintentar
      this.emit('fallo', new Error(`Deepgram respondió ${res.statusCode}`));
      ws.terminate();
    });
    ws.on('error', (err) => this.emit('fallo', err));
    ws.on('close', () => {
      clearInterval(this.latido);
      if (this.ws !== ws || this.cerrado) return;
      if (this.intentos >= this.reintentos) { this.emit('fallo', new Error('Deepgram: sin conexión tras varios intentos')); return; }
      const espera = Math.min(4000, 200 * 2 ** this.intentos++);
      setTimeout(() => this.conectar(), espera).unref?.();
    });
  }

  enviarAudio(buf) {
    if (this.cerrado) return;
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(buf);
    else { this.cola.push(buf); if (this.cola.length > MAX_COLA) this.cola.shift(); }
  }

  alMensaje(m) {
    if (m.type === 'SpeechStarted') return this.inicioHabla();
    if (m.type === 'UtteranceEnd') return this.cerrarTurno();
    if (m.type !== 'Results') return;
    const t = (m.channel?.alternatives?.[0]?.transcript || '').trim();
    if (t) this.inicioHabla();
    if (m.is_final && t) this.trozos.push(t);
    if (t) this.emit('parcial', (m.is_final ? this.trozos : [...this.trozos, t]).join(' '));
    if (m.speech_final) this.cerrarTurno();
  }

  inicioHabla() { if (!this.enHabla) { this.enHabla = true; this.emit('hablaInicio'); } }

  cerrarTurno() {
    const texto = this.trozos.join(' ').trim();
    this.trozos = []; this.enHabla = false;
    if (texto) this.emit('final', texto, Date.now());
  }

  cerrar() {
    this.cerrado = true; clearInterval(this.latido);
    const ws = this.ws; this.ws = null;
    if (ws?.readyState === WebSocket.OPEN) { try { ws.send('{"type":"CloseStream"}'); } catch { /* ya cerrado */ } ws.close(); }
    else if (ws) ws.terminate();
  }
}
