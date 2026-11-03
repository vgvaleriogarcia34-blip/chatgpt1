// Sesión de una llamada sobre el WebSocket de Twilio Media Streams.
//
// Flujo
//   Twilio ──μ-law 8 kHz──▶ Deepgram (STT en vivo) ──final──▶ Claude (Conversacion.responder, en streaming)
//          ◀──media+mark── ElevenLabs (TTS multi-contexto) ◀──una frase cada vez (alHablar)──┘
//   1. start: se comprueba el testigo firmado, se identifica el contacto (parámetros o número), se abre la
//      conversación en db y se precalientan Deepgram y ElevenLabs. Entrante: Claude saluda al momento.
//      Saliente: se espera a que la persona diga algo («¿Dígame?») o a 1,5 s de silencio, y entonces se saluda.
//   2. Turno: Deepgram cierra el turno (speech_final a 300 ms de silencio, o UtteranceEnd) → responder().
//      Cada frase que sale de Claude va al TTS con flush; cada trozo de audio va a Twilio seguido de una marca.
//      Las marcas que Twilio devuelve dicen qué se ha oído ya: sin marcas pendientes, el asistente ha callado.
//   3. Barge-in: si la persona habla (parcial con 2 palabras o más, para no cortar por un «ajá») mientras el
//      asistente habla o piensa: clear a Twilio, cancelar el TTS y abortar el stream de Claude (AbortController).
//   4. Silencios: 8 s callado tras hablar el asistente → «¿Sigue ahí?»; 20 s más → despedida y colgar.
//   5. Fin: con conv.terminada (Claude usó finalizar) se cuelga en cuanto se ha reproducido el último audio.
//      Contestador (AMD asíncrono) → se cuelga sin dejar mensaje, resultado «buzon».
//      Al cerrar: db.cerrarConversacion (duración, resumen, resultado) y ganchos.alTerminar (CRM, prospección).
//
// Latencia objetivo: < 1 s desde que la persona deja de hablar hasta que suena el primer audio.
//   Deepgram endpointing ~300 ms · Claude Opus 5.5 (esfuerzo bajo) hasta la primera frase: la mayor parte ·
//   ElevenLabs flash (auto_mode, contexto ya abierto) ~150-250 ms · red Twilio ~100 ms.
//   Se mide por turno desde el final de Deepgram hasta el primer media enviado: db.evento('latencia') y log.
import { C } from '../config.js';
import * as db from '../almacen/db.js';
import { Conversacion } from '../cerebro/agente.js';
import { registrar } from '../cerebro/herramientas.js';
import { DeepgramSTT } from './stt-deepgram.js';
import { ElevenLabsTTS } from './tts-elevenlabs.js';
import { firmaStreamValida, colgarLlamada, transferirLlamada, grabarLlamada, pararGrabacion } from './twilio.js';
import { avisar } from '../avisos.js';

export const ganchos = { alTerminar: [] }; // fn(conversacionId, datos) al cerrar cada llamada
export const sesiones = new Map(); // callSid → SesionVoz activa
export const amdPendientes = new Set(); // contestador detectado antes de que empezara el flujo de audio
export const TIEMPOS = { silencio: 8000, despedida: 20000, saludoSaliente: 1500 };
// Fábricas sustituibles en tests
export const fabricas = {
  conversacion: (o) => new Conversacion(o),
  stt: () => new DeepgramSTT(),
  tts: () => new ElevenLabsTTS(),
  grabar: (callSid, o) => grabarLlamada(callSid, o),
  pararGrabacion: (callSid) => pararGrabacion(callSid),
};

const FRASES = {
  sigue: '¿Sigue ahí?',
  despedida: 'Parece que se ha cortado la comunicación. Le llamaremos en otro momento. Que tenga un buen día.',
  // Solo con GRABAR_LLAMADAS. Se dice antes de empezar a grabar; la grabación empieza cuando la persona habla sin oponerse
  grabacion: 'Antes de empezar: si no se opone, esta llamada se grabará para revisar la calidad de la atención y resolver posibles incidencias. Si prefiere que no se grabe, dígamelo y seguimos sin grabar.',
  fallo: 'Disculpe, he tenido un problema técnico. Una persona del equipo le llamará lo antes posible.',
  sinTransferencia: 'Disculpe, no he podido pasarle la llamada. Dejo anotado que le llamen lo antes posible.',
};
const ASENTIMIENTO = /^(s[ií]|aj[aá]|vale|ya|m+|mhm|ok|okay|claro|eh|ah|bien|venga|exacto|perfecto|de acuerdo)$/i;
// «No me grabe», «prefiero que no se grabe», «sin grabar», «no quiero que me graben»…
const NO_GRABAR = [
  /\bno\s+(me|nos|la|lo)?\s*grab(e|en|es|éis|eis|ar)\b/iu,
  /\b(sin|que no)\s+(se\s+)?(grab(e|en|ar|aci[oó]n)|la grabaci[oó]n)\b/iu,
  /\bno\s+(quiero|deseo|acepto|consiento|me gusta)\s+(que\s+)?(se\s+|me\s+|nos\s+)?(la\s+)?(grab|ser grabad)/iu,
  /\b(prefiero|preferir[ií]a|mejor)\s+que no\s+(se\s+|me\s+)?grab/iu,
  /\b(pare|paren|detenga|quite|corte)\s+(la\s+)?grabaci[oó]n\b/iu,
  /\bno\s+(a|con)\s+la grabaci[oó]n\b|\bme opongo a (que se grabe|la grabaci[oó]n)/iu,
];
/** ¿Pide que no se grabe la llamada? */
export const pideNoGrabar = (t) => !!t && NO_GRABAR.some((r) => r.test(String(t)));
const palabras = (t) => (String(t).match(/[\p{L}\p{N}]+/gu) || []).length;
const log = (...a) => console.log('[voz]', ...a);
const campanaPorId = (id) => db.abrir().prepare('SELECT * FROM campanas WHERE id = ?').get(Number(id)) || null;

export class SesionVoz {
  constructor(ws) {
    this.ws = ws;
    this.estado = 'esperando'; // esperando → activa → cerrada
    this.marcas = new Set(); this.nMarca = 0;
    this.turno = 0; this.generando = false; this.ttsPendiente = false;
    this.avisosSilencio = 0; this.pendienteUsuario = '';
    ws.on('message', (d) => { try { this.alMensajeTwilio(JSON.parse(d.toString())); } catch (err) { log('mensaje de Twilio no procesado:', err.message); } });
    ws.on('close', () => this.terminar());
    ws.on('error', (err) => log('error en el WebSocket de Twilio:', err.message));
  }

  // ---------- Twilio ----------
  alMensajeTwilio(m) {
    switch (m.event) {
      case 'start': return this.iniciar(m.start || {}, m.streamSid);
      case 'media': if (this.stt && m.media?.payload && (!m.media.track || m.media.track === 'inbound')) this.stt.enviarAudio(Buffer.from(m.media.payload, 'base64')); return;
      case 'mark': this.marcas.delete(m.mark?.name); return this.comprobarCallado();
      case 'stop': return this.terminar();
    }
  }

  aTwilio(obj) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ ...obj, streamSid: this.streamSid })); }

  iniciar(start, streamSid) {
    if (this.estado !== 'esperando') return;
    const p = start.customParameters || {};
    if (!firmaStreamValida(start.callSid, p.firma)) { log('flujo rechazado: testigo no válido'); this.estado = 'cerrada'; return this.ws.close(1008); }
    this.streamSid = start.streamSid || streamSid; this.callSid = start.callSid;
    this.direccion = p.direccion === 'saliente' ? 'saliente' : 'entrante';
    this.telefono = db.normTel(p.telefono || p.desde);
    this.contacto = (p.contactoId && db.contactoPorId(Number(p.contactoId))) || (this.telefono && db.contactoPorTelefono(this.telefono)) || null;
    if (!this.contacto && this.telefono) this.contacto = db.guardarContacto({ telefono: this.telefono, origen: `llamada ${this.direccion}` });
    this.campana = p.campanaId ? campanaPorId(p.campanaId) : null;
    this.conversacionId = db.abrirConversacion({ canal: 'voz', direccion: this.direccion, contactoId: this.contacto?.id ?? null, externoId: this.callSid, campanaId: this.campana?.id ?? null });
    this.inicio = Date.now(); this.estado = 'activa';
    sesiones.set(this.callSid, this);
    log(`llamada ${this.direccion} ${this.callSid} · conversación ${this.conversacionId}`);

    this.conv = fabricas.conversacion({ canal: 'voz', direccion: this.direccion, contacto: this.contacto, campana: this.campana, conversacionId: this.conversacionId, extra: { sesion: this } });
    this.tts = fabricas.tts();
    this.tts.on('audio', (b64) => this.alAudio(b64));
    this.tts.on('fallo', (err) => log('TTS:', err.message));
    this.tts.precalentar();
    this.stt = fabricas.stt();
    this.stt.on('hablaInicio', () => this.alHablaInicio());
    this.stt.on('parcial', (t) => this.alParcial(t));
    this.stt.on('final', (t, ts) => this.alFinal(t, ts));
    this.stt.on('fallo', (err) => log('STT:', err.message));
    this.stt.conectar();

    // Con GRABAR_LLAMADAS la grabación no empieza aquí: primero se avisa (saludar) y empieza cuando la persona habla sin oponerse
    this.grabacion = C.twilio.grabar ? 'por_avisar' : 'no';
    if (amdPendientes.delete(this.callSid)) return this.buzon();
    if (this.direccion === 'entrante') this.saludar();
    else this.tSaludo = setTimeout(() => this.saludar(), TIEMPOS.saludoSaliente);
  }

  saludar(dicho = null) {
    if (this.saludado || this.estado !== 'activa') return;
    this.saludado = true; clearTimeout(this.tSaludo);
    if (this.grabacion === 'por_avisar') { // suena mientras Claude prepara el saludo
      this.tts.decir(FRASES.grabacion); db.anotar(this.conversacionId, 'asistente', FRASES.grabacion, { fija: true, avisoGrabacion: true });
      this.grabacion = 'avisada';
    }
    let texto;
    if (this.direccion === 'entrante') texto = '[La llamada acaba de conectarse. Salude.]';
    else if (dicho) { db.anotar(this.conversacionId, 'usuario', dicho); texto = `[La persona ha descolgado y ha dicho: «${dicho}»]`; }
    else texto = '[La persona ha descolgado y aún no ha dicho nada.]';
    this.responder(texto, dicho ? { tFinHabla: Date.now() } : {});
  }

  // ---------- Turnos ----------
  async responder(texto, { tFinHabla = null } = {}) {
    const turno = ++this.turno;
    const ac = new AbortController(); this.ac = ac;
    this.generando = true; this.audioTurno = false; this.dichoTurno = false; this.textoTurno = texto;
    this.tFinHabla = tFinHabla; this.tPrimeraFrase = null;
    const contextoPrevio = this.conv.contextoPendiente;
    let r = null;
    try {
      r = await this.conv.responder(texto, {
        signal: ac.signal,
        alHablar: (f) => {
          if (ac.signal.aborted || turno !== this.turno || this.estado !== 'activa') return;
          this.tPrimeraFrase ??= Date.now();
          if (this.tts.decir(f)) this.dichoTurno = true;
        },
      });
    } catch (err) {
      if (!ac.signal.aborted) {
        log('error al responder:', err.message);
        db.evento('voz_error', { conversacionId: this.conversacionId, error: String(err.message || err) });
        if (turno === this.turno && this.estado === 'activa') {
          // La disculpa queda en la transcripción, el equipo recibe un aviso y la tarea de volver a llamar es de prioridad alta
          this.tts.decir(FRASES.fallo); db.anotar(this.conversacionId, 'asistente', FRASES.fallo, { fija: true, fallo: true });
          this.dichoTurno = true; this.colgarAlAcabar = true;
          this.resultadoForzado ??= { resultado: 'volver_a_llamar', resumen: 'La llamada se cortó por un fallo técnico del asistente: hay que devolverla.', prioridad: 'HIGH' };
          avisar({ tipo: 'fallo_voz', contacto: this.contacto, conversacionId: this.conversacionId, detalle: `La asistente no pudo responder (${String(err.message || err).slice(0, 200)}). Se le dijo que una persona del equipo le llamará lo antes posible.` });
        }
      }
    }
    if (r?.texto) db.anotar(this.conversacionId, 'asistente', r.texto, r.interrumpida ? { interrumpida: true } : null);
    if (ac.signal.aborted) {
      // Abortado antes de decir nada en el primer turno: el contexto inicial vuelve a quedar pendiente
      if (!r?.texto && contextoPrevio && !this.conv.contextoPendiente && !this.conv.messages?.length) this.conv.contextoPendiente = contextoPrevio;
      return;
    }
    if (turno !== this.turno || this.estado !== 'activa') return;
    this.generando = false;
    this.cerrarTurnoTts(turno);
  }

  cerrarTurnoTts(turno) {
    if (!this.dichoTurno) return this.comprobarCallado();
    this.ttsPendiente = true;
    this.tts.finTurno().then(() => { if (turno === this.turno) { this.ttsPendiente = false; this.comprobarCallado(); } });
  }

  /** Frase fija (fuera de Claude): aviso de silencio, despedida, fallo. */
  decirFijo(texto) {
    const turno = ++this.turno;
    this.ac?.abort(); this.generando = false; this.audioTurno = false; this.tFinHabla = null; this.textoTurno = null;
    db.anotar(this.conversacionId, 'asistente', texto, { fija: true });
    this.dichoTurno = this.tts.decir(texto);
    this.cerrarTurnoTts(turno);
  }

  alAudio(b64) {
    if (this.estado !== 'activa') return;
    if (!this.audioTurno) {
      this.audioTurno = true;
      if (this.tFinHabla) {
        const ahora = Date.now(), ms = ahora - this.tFinHabla;
        const claude = this.tPrimeraFrase ? this.tPrimeraFrase - this.tFinHabla : null;
        db.evento('latencia', { conversacionId: this.conversacionId, turno: this.turno, ms, claudeMs: claude, vozMs: this.tPrimeraFrase ? ahora - this.tPrimeraFrase : null });
        log(`latencia turno ${this.turno}: ${ms} ms (Claude ${claude ?? '?'} ms)`);
        this.tFinHabla = null;
      }
    }
    this.pararSilencio();
    this.aTwilio({ event: 'media', media: { payload: b64 } });
    const name = `m${++this.nMarca}`;
    this.marcas.add(name);
    this.aTwilio({ event: 'mark', mark: { name } });
  }

  /** El asistente está hablando o a punto: genera, le queda audio por llegar o por reproducirse. */
  get hablando() { return this.generando || this.ttsPendiente || this.marcas.size > 0; }

  comprobarCallado() {
    if (this.estado !== 'activa' || this.hablando) return;
    if (this.transferencia) return this.ejecutarTransferencia();
    if (this.conv?.terminada || this.colgarAlAcabar) return this.colgar();
    this.armarSilencio();
  }

  // ---------- Lo que llega de Deepgram ----------
  get cerrando() { return !!(this.conv?.terminada || this.colgarAlAcabar || this.transferencia || this.colgando); }

  alHablaInicio() {
    this.pararSilencio();
    if (!this.saludado) clearTimeout(this.tSaludo); // saliente: la persona habla; se espera a que termine
  }

  alParcial(t) {
    this.pararSilencio();
    if (this.estado !== 'activa' || this.cerrando || !this.saludado) return;
    if (this.hablando && palabras(t) >= 2) this.interrumpir();
  }

  alFinal(texto, ts = Date.now()) {
    this.pararSilencio();
    if (this.estado !== 'activa' || this.cerrando) return;
    this.avisosSilencio = 0;
    if (!this.saludado) return this.saludar(texto);
    if (this.hablando) {
      if (palabras(texto) <= 2 && ASENTIMIENTO.test(texto.replace(/[^\p{L}\s]/gu, '').trim())) return; // «sí», «vale»: no corta
      this.interrumpir();
    }
    db.anotar(this.conversacionId, 'usuario', texto);
    let total = (this.pendienteUsuario + ' ' + texto).trim(); this.pendienteUsuario = '';
    const nota = this.decidirGrabacion(texto);
    if (nota) total = `${nota}\n${total}`;
    this.responder(total, { tFinHabla: ts });
  }

  // ---------- Grabación (solo con GRABAR_LLAMADAS) ----------
  /**
   * Tras el aviso, la grabación empieza cuando la persona habla sin oponerse. Si pide que no se grabe (antes o después),
   * no se graba o se detiene, y lo grabado se borra al llegar. Devuelve una nota para Claude si hay que confirmárselo.
   */
  decidirGrabacion(texto) {
    if (this.grabacion === 'no' || this.grabacion === 'por_avisar' || this.grabacion === 'rechazada') return null;
    if (pideNoGrabar(texto)) {
      const grabando = this.grabacion === 'grabando';
      this.grabacion = 'rechazada';
      db.evento('grabacion_rechazada', { conversacionId: this.conversacionId, callSid: this.callSid, habiaEmpezado: grabando });
      if (grabando) fabricas.pararGrabacion(this.callSid).catch((err) => log('no se pudo detener la grabación:', err.message));
      return '[Contexto interno: la persona ha pedido que no se grabe la llamada. La llamada ya no se graba (y lo grabado se borra). Confírmeselo en una frase y siga con normalidad.]';
    }
    if (this.grabacion === 'avisada') {
      this.grabacion = 'grabando';
      fabricas.grabar(this.callSid, { conversacionId: this.conversacionId }).catch((err) => { log('no se pudo grabar:', err.message); if (this.grabacion === 'grabando') this.grabacion = 'no'; });
    }
    return null;
  }

  interrumpir() {
    if (!this.hablando) return;
    log(`barge-in en turno ${this.turno}`);
    // Si no llegó a decir nada, Claude descarta ese turno: lo dicho por la persona se junta con lo siguiente
    if (this.generando && !this.dichoTurno && this.textoTurno && !this.textoTurno.startsWith('[')) this.pendienteUsuario = (this.pendienteUsuario + ' ' + this.textoTurno).trim();
    this.textoTurno = null;
    this.aTwilio({ event: 'clear' });
    this.marcas.clear();
    this.tts.cancelar();
    this.ac?.abort();
    this.turno++; // lo que quede del turno anterior se descarta
    this.generando = false; this.ttsPendiente = false;
  }

  // ---------- Silencios ----------
  armarSilencio() {
    this.pararSilencio();
    if (this.estado !== 'activa') return;
    this.tSilencio = setTimeout(() => {
      if (this.hablando || this.estado !== 'activa') return;
      if (this.avisosSilencio++ === 0) return this.decirFijo(FRASES.sigue);
      this.colgarAlAcabar = true;
      this.resultadoForzado ??= { resultado: this.direccion === 'saliente' ? 'volver_a_llamar' : 'atendido', resumen: 'La persona dejó de responder y se colgó por silencio.' };
      this.decirFijo(FRASES.despedida);
    }, this.avisosSilencio === 0 ? TIEMPOS.silencio : TIEMPOS.despedida);
  }
  pararSilencio() { clearTimeout(this.tSilencio); }

  // ---------- Final, contestador, transferencia ----------
  /** AMD: ha contestado una máquina. Se cuelga sin dejar mensaje. */
  buzon() {
    if (this.estado !== 'activa') return;
    this.resultadoForzado = { resultado: 'buzon', resumen: 'Saltó el contestador; no se dejó mensaje.' };
    this.interrumpir();
    this.colgar();
  }

  pedirTransferencia(motivo) {
    this.transferencia = { motivo };
    db.evento('transferencia', { conversacionId: this.conversacionId, motivo });
  }

  async ejecutarTransferencia() {
    const t = this.transferencia; this.transferencia = null;
    try {
      await transferirLlamada(this.callSid, { aviso: `Le paso con ${C.empresa.responsable}. Un momento, por favor.`, conversacionId: this.conversacionId, contactoId: this.contacto?.id });
      this.transferida = t;
      log(`llamada ${this.callSid} transferida`);
      // Twilio corta el flujo de audio al aplicar el nuevo TwiML: llegará stop y se cierra la sesión
    } catch (err) {
      log('no se pudo transferir:', err.message);
      db.evento('voz_error', { conversacionId: this.conversacionId, error: 'transferencia: ' + err.message });
      avisar({ tipo: 'transferencia_imposible', contacto: this.contacto, conversacionId: this.conversacionId, detalle: `Motivo: ${t?.motivo || '—'}. No se pudo pasar la llamada (${err.message}).` });
      this.decirFijo(FRASES.sinTransferencia);
    }
  }

  async colgar() {
    if (this.colgando) return;
    this.colgando = true;
    try { await colgarLlamada(this.callSid); } catch (err) { log('no se pudo colgar por la API:', err.message); }
    this.terminar();
  }

  terminar() {
    if (this.estado === 'cerrada') return;
    const estaba = this.estado; this.estado = 'cerrada';
    clearTimeout(this.tSaludo); this.pararSilencio();
    this.ac?.abort();
    this.stt?.cerrar(); this.tts?.cerrar();
    if (this.callSid && sesiones.get(this.callSid) === this) sesiones.delete(this.callSid);
    if (this.ws.readyState === 0 || this.ws.readyState === 1) this.ws.close();
    if (estaba !== 'activa') return;

    const duracion = Math.round((Date.now() - this.inicio) / 1000);
    const fin = this.resultadoForzado
      || (this.transferida && { resultado: 'transferido', resumen: this.conv?.terminada?.resumen || `Transferida a ${C.empresa.responsable}: ${this.transferida.motivo}` })
      || this.conv?.terminada || { resultado: 'colgada', resumen: null };
    const volverLlamar = fin.volver_a_llamar || this.conv?.terminada?.volver_a_llamar || null;
    db.cerrarConversacion(this.conversacionId, { resumen: fin.resumen, resultado: fin.resultado, duracion, volverLlamar });
    log(`llamada ${this.callSid} cerrada · ${duracion} s · ${fin.resultado}`);
    const transcripcion = db.mensajes(this.conversacionId).filter((x) => x.rol === 'usuario' || x.rol === 'asistente').map((x) => ({ rol: x.rol, texto: x.texto }));
    const datos = { callSid: this.callSid, canal: 'voz', direccion: this.direccion, contacto: this.contacto, campana: this.campana, resultado: fin.resultado, resumen: fin.resumen, duracion, transcripcion,
      volverLlamar: db.conversacionPorId(this.conversacionId)?.volver_llamar || null, prioridad: fin.prioridad || null };
    for (const fn of ganchos.alTerminar) Promise.resolve().then(() => fn(this.conversacionId, datos)).catch((err) => log('gancho alTerminar:', err.message));
  }
}

// Herramienta de la voz: pasar la llamada a una persona
registrar('transferir_llamada', async ({ motivo }, ctx) => {
  const s = ctx.sesion;
  if (!s) return 'No hay una llamada activa que transferir.';
  if (!C.empresa.movilResponsable) {
    avisar({ tipo: 'transferencia_imposible', contacto: s.contacto, conversacionId: s.conversacionId, detalle: `Motivo: ${motivo}. No hay móvil configurado para transferir (RESPONSABLE_MOVIL).` });
    return `Ahora no es posible pasar la llamada; el equipo ya está avisado. Dígale que ${C.empresa.responsable} le llamará lo antes posible y registre una tarea con registrar_nota (tipo tarea, urgente si lo es).`;
  }
  s.pedirTransferencia(motivo);
  return `Transferencia preparada: la llamada pasará a ${C.empresa.responsable} en cuanto termine de hablar. Diga solo una frase breve (por ejemplo, «Le paso ahora mismo») y no use finalizar.`;
});
