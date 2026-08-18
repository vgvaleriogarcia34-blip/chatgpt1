/* =========================================================================
   Grabador de Pantalla — voz, cámara opcional y zonas privadas
   Todo ocurre en el navegador: no se sube nada a ningún servidor.
   ========================================================================= */

const $ = (s) => document.querySelector(s);

/* ---------------------------------- DOM --------------------------------- */
const el = {
  stage: $('#stage'),
  overlay: $('#overlay'),
  canvasWrap: $('#canvasWrap'),
  emptyState: $('#emptyState'),
  countdown: $('#countdown'),
  screenVideo: $('#screenVideo'),
  camVideo: $('#camVideo'),

  recDot: $('#recDot'),
  timer: $('#timer'),
  statusText: $('#statusText'),

  btnDraw: $('#btnDraw'),
  drawTypeGroup: $('#drawTypeGroup'),
  btnShot: $('#btnShot'),
  btnFullscreen: $('#btnFullscreen'),

  btnPickScreen: $('#btnPickScreen'),
  btnPickScreenBig: $('#btnPickScreenBig'),
  btnStopSource: $('#btnStopSource'),
  sourceInfo: $('#sourceInfo'),
  chkSysAudio: $('#chkSysAudio'),

  swMic: $('#swMic'),
  selMic: $('#selMic'),
  micMeter: $('#micMeter'),
  rngMicGain: $('#rngMicGain'),
  lblMicGain: $('#lblMicGain'),
  rngSysGain: $('#rngSysGain'),
  lblSysGain: $('#lblSysGain'),
  micState: $('#micState'),

  swCam: $('#swCam'),
  camOptions: $('#camOptions'),
  selCam: $('#selCam'),
  selCamPos: $('#selCamPos'),
  rngCamSize: $('#rngCamSize'),
  lblCamSize: $('#lblCamSize'),
  chkCamRound: $('#chkCamRound'),
  chkCamMirror: $('#chkCamMirror'),

  zoneCount: $('#zoneCount'),
  zoneList: $('#zoneList'),
  rngStrength: $('#rngStrength'),
  lblStrength: $('#lblStrength'),
  btnClearZones: $('#btnClearZones'),

  selRes: $('#selRes'),
  selFps: $('#selFps'),
  selBitrate: $('#selBitrate'),
  chkCountdown: $('#chkCountdown'),
  formatInfo: $('#formatInfo'),

  btnRecord: $('#btnRecord'),
  btnPause: $('#btnPause'),
  btnStop: $('#btnStop'),

  result: $('#result'),
  resultVideo: $('#resultVideo'),
  resultMeta: $('#resultMeta'),
  btnDownload: $('#btnDownload'),
  btnNewRec: $('#btnNewRec'),
  btnCloseResult: $('#btnCloseResult'),

  toast: $('#toast'),
  recHud: $('#recHud'),
  hudTimer: $('#hudTimer'),
  hudPause: $('#hudPause'),
  hudStop: $('#hudStop'),
};

const ctx = el.stage.getContext('2d', { alpha: false });
const tmp = document.createElement('canvas');
const tmpCtx = tmp.getContext('2d');
const small = document.createElement('canvas');
const smallCtx = small.getContext('2d');

/* --------------------------------- Estado -------------------------------- */
const state = {
  screenStream: null,
  camStream: null,
  micStream: null,
  sysTrack: null,

  audioCtx: null,
  audioDest: null,
  micGain: null,
  sysGain: null,
  micSource: null,
  sysSource: null,
  analyser: null,
  analyserData: null,

  recorder: null,
  chunks: [],
  blob: null,
  blobUrl: null,
  mime: '',
  recording: false,
  paused: false,
  startedAt: 0,
  elapsed: 0,
  timerId: null,

  zones: [],
  zoneSeq: 0,
  selectedZone: null,
  drawMode: false,
  drawType: 'solid',
  drag: null,

  rafId: null,
  lastFrame: 0,
};

/* -------------------------------- Utilidades ----------------------------- */
function toast(msg, isErr = false) {
  el.toast.textContent = msg;
  el.toast.classList.toggle('err', !!isErr);
  el.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.toast.classList.remove('show'), 3200);
}

function fmtTime(ms) {
  const t = Math.floor(ms / 1000);
  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const s = String(t % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function fmtSize(bytes) {
  if (bytes > 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function hasSource() { return !!state.screenStream || !!state.camStream; }

/* ------------------------------ Formato salida --------------------------- */
const MIME_CANDIDATES = [
  { m: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4', name: 'MP4 (H.264 + AAC)' },
  { m: 'video/mp4', ext: 'mp4', name: 'MP4' },
  { m: 'video/webm;codecs=vp9,opus', ext: 'webm', name: 'WebM (VP9 + Opus)' },
  { m: 'video/webm;codecs=vp8,opus', ext: 'webm', name: 'WebM (VP8 + Opus)' },
  { m: 'video/webm', ext: 'webm', name: 'WebM' },
];

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const c of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c.m)) return c;
  }
  return { m: '', ext: 'webm', name: 'formato por defecto del navegador' };
}
const OUTPUT = pickMime();

/* ------------------------------ Compatibilidad --------------------------- */
function checkSupport() {
  const okDisplay = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  const okRec = typeof MediaRecorder !== 'undefined';
  if (!okDisplay || !okRec) {
    el.emptyState.innerHTML =
      '<div class="empty-icon">⚠️</div><h2>Tu navegador no puede grabar la pantalla</h2>' +
      '<p>Necesitas un navegador de escritorio moderno: Chrome, Edge, Brave, Opera o Firefox. ' +
      'En iOS y Android la captura de pantalla del navegador no está disponible.</p>';
    el.btnPickScreen.disabled = true;
    return false;
  }
  el.formatInfo.textContent = 'Formato de salida: ' + OUTPUT.name;
  return true;
}

/* ------------------------------ Captura pantalla ------------------------- */
async function pickScreen() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: Number(el.selFps.value) || 30 }, cursor: 'always' },
      audio: el.chkSysAudio.checked
        ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        : false,
    });
    attachScreen(stream);
  } catch (err) {
    if (err && err.name === 'NotAllowedError') toast('Has cancelado la selección de pantalla.');
    else toast('No se ha podido capturar la pantalla: ' + (err && err.message), true);
  }
}

function attachScreen(stream) {
  stopScreen(false);
  state.screenStream = stream;
  const vTrack = stream.getVideoTracks()[0];
  el.screenVideo.srcObject = new MediaStream([vTrack]);
  el.screenVideo.play().catch(() => {});

  vTrack.addEventListener('ended', () => {
    toast('Has dejado de compartir la pantalla.');
    if (state.recording) stopRecording();
    stopScreen(true);
  });

  const aTrack = stream.getAudioTracks()[0];
  if (aTrack) {
    state.sysTrack = aTrack;
    connectSystemAudio(aTrack);
  } else if (el.chkSysAudio.checked) {
    toast('Compartes la imagen, pero no el audio del sistema.');
  }

  const s = vTrack.getSettings();
  const surfaces = { monitor: 'Pantalla completa', window: 'Ventana de una aplicación', browser: 'Pestaña del navegador' };
  const label = surfaces[s.displaySurface] || 'Fuente de pantalla';
  el.sourceInfo.textContent = `${label} · ${s.width || '?'}×${s.height || '?'} px${aTrack ? ' · con audio del sistema' : ' · sin audio del sistema'}`;
  el.sourceInfo.classList.add('on');
  el.btnStopSource.classList.remove('hidden');
  el.emptyState.classList.add('hidden');
  el.btnRecord.disabled = false;
  setStatus('Listo para grabar');

  if (el.swMic.checked && !state.micStream) startMic();

  el.screenVideo.addEventListener('loadedmetadata', () => resizeCanvas(), { once: true });
  setTimeout(resizeCanvas, 250);
  startLoop();
}

function stopScreen(updateUi = true) {
  if (state.screenStream) state.screenStream.getTracks().forEach((t) => t.stop());
  state.screenStream = null;
  state.sysTrack = null;
  if (state.sysSource) { try { state.sysSource.disconnect(); } catch (e) {} state.sysSource = null; }
  el.screenVideo.srcObject = null;
  if (!updateUi) return;
  el.sourceInfo.textContent = 'Ninguna fuente activa.';
  el.sourceInfo.classList.remove('on');
  el.btnStopSource.classList.add('hidden');
  if (!state.camStream) {
    el.emptyState.classList.remove('hidden');
    el.btnRecord.disabled = true;
    setStatus('Sin fuente seleccionada');
    stopLoop();
  } else {
    resizeCanvas();
  }
}

function setStatus(txt) { el.statusText.textContent = txt; }

/* --------------------------------- Audio --------------------------------- */
function ensureAudio() {
  if (state.audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  state.audioCtx = new AC();
  state.audioDest = state.audioCtx.createMediaStreamDestination();

  state.micGain = state.audioCtx.createGain();
  state.micGain.gain.value = Number(el.rngMicGain.value) / 100;
  state.micGain.connect(state.audioDest);

  state.sysGain = state.audioCtx.createGain();
  state.sysGain.gain.value = Number(el.rngSysGain.value) / 100;
  state.sysGain.connect(state.audioDest);

  state.analyser = state.audioCtx.createAnalyser();
  state.analyser.fftSize = 1024;
  state.analyserData = new Uint8Array(state.analyser.fftSize);
  state.micGain.connect(state.analyser);
}

function connectSystemAudio(track) {
  ensureAudio();
  if (state.sysSource) { try { state.sysSource.disconnect(); } catch (e) {} }
  state.sysSource = state.audioCtx.createMediaStreamSource(new MediaStream([track]));
  state.sysSource.connect(state.sysGain);
}

async function startMic() {
  try {
    const deviceId = el.selMic.value;
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : {}),
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stopMic(false);
    state.micStream = stream;
    ensureAudio();
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
    state.micSource = state.audioCtx.createMediaStreamSource(stream);
    state.micSource.connect(state.micGain);
    el.micState.textContent = 'Micrófono activo: ' + (stream.getAudioTracks()[0].label || 'dispositivo por defecto');
    await refreshDevices();
    meterLoop();
  } catch (err) {
    el.swMic.checked = false;
    el.micState.textContent = 'No se ha podido acceder al micrófono.';
    toast('Micrófono no disponible: ' + (err && err.message), true);
  }
}

function stopMic(updateUi = true) {
  if (state.micSource) { try { state.micSource.disconnect(); } catch (e) {} state.micSource = null; }
  if (state.micStream) state.micStream.getTracks().forEach((t) => t.stop());
  state.micStream = null;
  if (updateUi) {
    el.micState.textContent = 'Micrófono desactivado: la grabación será muda.';
    el.micMeter.style.width = '0%';
  }
}

function meterLoop() {
  if (!state.micStream || !state.analyser) { el.micMeter.style.width = '0%'; return; }
  state.analyser.getByteTimeDomainData(state.analyserData);
  let sum = 0;
  for (let i = 0; i < state.analyserData.length; i++) {
    const v = (state.analyserData[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / state.analyserData.length);
  el.micMeter.style.width = Math.min(100, rms * 260) + '%';
  requestAnimationFrame(meterLoop);
}

/* --------------------------------- Cámara -------------------------------- */
async function startCam() {
  try {
    const deviceId = el.selCam.value;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 }, height: { ideal: 720 },
        ...(deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : {}),
      },
      audio: false,
    });
    stopCam(false);
    state.camStream = stream;
    el.camVideo.srcObject = stream;
    await el.camVideo.play().catch(() => {});
    el.camOptions.classList.remove('collapsed');
    el.emptyState.classList.add('hidden');
    el.btnRecord.disabled = false;
    await refreshDevices();
    if (!state.screenStream) resizeCanvas();
    startLoop();
  } catch (err) {
    el.swCam.checked = false;
    toast('Cámara no disponible: ' + (err && err.message), true);
  }
}

function stopCam(updateUi = true) {
  if (state.camStream) state.camStream.getTracks().forEach((t) => t.stop());
  state.camStream = null;
  el.camVideo.srcObject = null;
  if (updateUi) {
    el.camOptions.classList.add('collapsed');
    if (!state.screenStream) {
      el.emptyState.classList.remove('hidden');
      el.btnRecord.disabled = true;
      stopLoop();
    }
  }
}

/* ------------------------------- Dispositivos ---------------------------- */
async function refreshDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  const devices = await navigator.mediaDevices.enumerateDevices();
  fillSelect(el.selMic, devices.filter((d) => d.kind === 'audioinput'), 'Micrófono');
  fillSelect(el.selCam, devices.filter((d) => d.kind === 'videoinput'), 'Cámara');
}

function fillSelect(select, devices, kind) {
  const prev = select.value;
  select.innerHTML = '';
  const def = document.createElement('option');
  def.value = 'default';
  def.textContent = kind + ' por defecto';
  select.appendChild(def);
  devices.forEach((d, i) => {
    const o = document.createElement('option');
    o.value = d.deviceId;
    o.textContent = d.label || `${kind} ${i + 1}`;
    select.appendChild(o);
  });
  if ([...select.options].some((o) => o.value === prev)) select.value = prev;
}

/* ------------------------------ Lienzo / dibujo -------------------------- */
function resizeCanvas() {
  if (state.recording) return; // no cambiamos la resolución a mitad de grabación
  let vw = 1280, vh = 720;
  if (state.screenStream && el.screenVideo.videoWidth) {
    vw = el.screenVideo.videoWidth; vh = el.screenVideo.videoHeight;
  } else if (state.camStream && el.camVideo.videoWidth) {
    vw = el.camVideo.videoWidth; vh = el.camVideo.videoHeight;
  }
  const target = Number(el.selRes.value) || 0;
  let h = target ? Math.min(target, vh) : vh;
  let w = Math.round((h * vw) / vh);
  w -= w % 2; h -= h % 2;
  if (el.stage.width !== w || el.stage.height !== h) {
    el.stage.width = w; el.stage.height = h;
  }
}

function containRect(sw, sh, dw, dh) {
  const scale = Math.min(dw / sw, dh / sh);
  const w = sw * scale, h = sh * scale;
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
}

function drawCover(video, dx, dy, dw, dh, mirror) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(dw / vw, dh / vh);
  const sw = dw / scale, sh = dh / scale;
  const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
  ctx.save();
  if (mirror) { ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh); }
  else ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
}

function zoneRectPx(z) {
  const W = el.stage.width, H = el.stage.height;
  let x = Math.round(z.x * W), y = Math.round(z.y * H);
  let w = Math.round(z.w * W), h = Math.round(z.h * H);
  x = Math.max(0, Math.min(W - 1, x));
  y = Math.max(0, Math.min(H - 1, y));
  w = Math.max(1, Math.min(W - x, w));
  h = Math.max(1, Math.min(H - y, h));
  return { x, y, w, h };
}

function drawZone(z) {
  const r = zoneRectPx(z);
  const strength = Number(el.rngStrength.value);

  if (z.type === 'solid') {
    ctx.fillStyle = '#000';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    return;
  }

  if (z.type === 'pixel') {
    const px = Math.max(2, Math.round(Math.max(r.w, r.h) / Math.max(2, strength)));
    const sw = Math.max(1, Math.round(r.w / px));
    const sh = Math.max(1, Math.round(r.h / px));
    small.width = sw; small.height = sh;
    smallCtx.imageSmoothingEnabled = true;
    smallCtx.drawImage(el.stage, r.x, r.y, r.w, r.h, 0, 0, sw, sh);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, sw, sh, r.x, r.y, r.w, r.h);
    ctx.restore();
    return;
  }

  // Desenfoque: copiamos un área algo mayor para que no se vean bordes nítidos.
  const pad = Math.max(10, Math.round(strength));
  const sx = Math.max(0, r.x - pad), sy = Math.max(0, r.y - pad);
  const ex = Math.min(el.stage.width, r.x + r.w + pad), ey = Math.min(el.stage.height, r.y + r.h + pad);
  const sw = ex - sx, sh = ey - sy;
  if (sw <= 0 || sh <= 0) return;
  tmp.width = sw; tmp.height = sh;
  tmpCtx.drawImage(el.stage, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.filter = `blur(${strength}px)`;
  ctx.drawImage(tmp, sx, sy);
  ctx.filter = 'none';
  ctx.restore();
}

function drawCamera() {
  if (!state.camStream || !el.camVideo.videoWidth) return;
  const W = el.stage.width, H = el.stage.height;
  const pos = el.selCamPos.value;
  const mirror = el.chkCamMirror.checked;

  if (pos === 'full') {
    drawCover(el.camVideo, 0, 0, W, H, mirror);
    return;
  }

  const size = Number(el.rngCamSize.value) / 100;
  const round = el.chkCamRound.checked;
  const margin = Math.round(W * 0.018);
  let w, h;
  if (round) { w = h = Math.round(W * size); }
  else { w = Math.round(W * size); h = Math.round((w * 9) / 16); }

  const x = pos.includes('l') ? margin : W - w - margin;
  const y = pos.startsWith('t') ? margin : H - h - margin;

  ctx.save();
  ctx.beginPath();
  if (round) ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
  else ctx.roundRect ? ctx.roundRect(x, y, w, h, Math.round(w * 0.05)) : ctx.rect(x, y, w, h);
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = Math.round(W * 0.012);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  drawCover(el.camVideo, x, y, w, h, mirror);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = Math.max(2, Math.round(W * 0.0022));
  ctx.beginPath();
  if (round) ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
  else ctx.roundRect ? ctx.roundRect(x, y, w, h, Math.round(w * 0.05)) : ctx.rect(x, y, w, h);
  ctx.stroke();
  ctx.restore();
}

function renderFrame() {
  const W = el.stage.width, H = el.stage.height;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // 1) Capa base: la pantalla; si no hay pantalla, la cámara a pantalla completa.
  let baseDrawn = false;
  if (state.screenStream && el.screenVideo.videoWidth) {
    const r = containRect(el.screenVideo.videoWidth, el.screenVideo.videoHeight, W, H);
    ctx.drawImage(el.screenVideo, r.x, r.y, r.w, r.h);
    baseDrawn = true;
  } else if (state.camStream && el.camVideo.videoWidth) {
    drawCover(el.camVideo, 0, 0, W, H, el.chkCamMirror.checked);
    baseDrawn = true;
  }

  // 2) Zonas privadas sobre la capa base.
  if (baseDrawn) {
    for (const z of state.zones) if (!z.hidden) drawZone(z);
  }

  // 3) Cámara encima (recuadro o pantalla completa) cuando hay pantalla.
  if (state.screenStream) drawCamera();
}

function startLoop() {
  if (state.rafId) return;
  const tick = (ts) => {
    state.rafId = requestAnimationFrame(tick);
    const fps = Number(el.selFps.value) || 30;
    const minDelta = 1000 / (fps + 2);
    if (ts - state.lastFrame < minDelta) return;
    state.lastFrame = ts;
    renderFrame();
  };
  state.rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, el.stage.width, el.stage.height);
}

/* ------------------------------- Zonas privadas -------------------------- */
function addZone(x, y, w, h, type) {
  const z = { id: ++state.zoneSeq, name: 'Zona ' + (state.zones.length + 1), x, y, w, h, type: type || state.drawType, hidden: false };
  state.zones.push(z);
  state.selectedZone = z.id;
  renderZones();
  saveSettings();
  return z;
}

function deleteZone(id) {
  state.zones = state.zones.filter((z) => z.id !== id);
  if (state.selectedZone === id) state.selectedZone = null;
  renderZones();
  saveSettings();
}

function getZone(id) { return state.zones.find((z) => z.id === id); }

function renderZones() {
  // capa sobre la vista previa
  el.overlay.querySelectorAll('.zone').forEach((n) => n.remove());
  for (const z of state.zones) {
    const d = document.createElement('div');
    d.className = 'zone type-' + z.type + (state.selectedZone === z.id ? ' selected' : '');
    d.dataset.id = z.id;
    d.style.opacity = z.hidden ? '.35' : '1';
    d.innerHTML =
      `<span class="tag">${z.name}</span>` +
      `<button class="kill" data-kill="${z.id}" title="Eliminar zona">✕</button>` +
      `<div class="handle" data-handle="${z.id}"></div>`;
    positionZoneEl(d, z);
    el.overlay.appendChild(d);
  }

  // lista lateral
  el.zoneCount.textContent = state.zones.length;
  if (!state.zones.length) {
    el.zoneList.innerHTML = '<div class="zone-empty">Todavía no hay zonas. Pulsa <b>Dibujar zona privada</b> y arrastra sobre la vista previa.</div>';
    return;
  }
  el.zoneList.innerHTML = '';
  for (const z of state.zones) {
    const item = document.createElement('div');
    item.className = 'zone-item t-' + z.type + (state.selectedZone === z.id ? ' selected' : '');
    item.innerHTML = `
      <div class="swatch"></div>
      <div class="name" title="Doble clic para renombrar">${z.name}</div>
      <select data-type="${z.id}">
        <option value="solid">Negro</option>
        <option value="blur">Desenfoque</option>
        <option value="pixel">Pixelado</option>
      </select>
      <button class="icon-btn ${z.hidden ? '' : 'active'}" data-eye="${z.id}" title="Mostrar / ocultar el tapado">${z.hidden ? '○' : '◉'}</button>
      <button class="icon-btn" data-del="${z.id}" title="Eliminar">✕</button>`;
    item.querySelector('select').value = z.type;
    el.zoneList.appendChild(item);
  }
}

function positionZoneEl(node, z) {
  node.style.left = z.x * 100 + '%';
  node.style.top = z.y * 100 + '%';
  node.style.width = z.w * 100 + '%';
  node.style.height = z.h * 100 + '%';
}

function refreshZonePositions() {
  for (const z of state.zones) {
    const node = el.overlay.querySelector(`.zone[data-id="${z.id}"]`);
    if (node) positionZoneEl(node, z);
  }
}

/* Interacción de ratón/táctil sobre la vista previa */
function overlayCoords(e) {
  const r = el.overlay.getBoundingClientRect();
  return { nx: clamp01((e.clientX - r.left) / r.width), ny: clamp01((e.clientY - r.top) / r.height) };
}

el.overlay.addEventListener('pointerdown', (e) => {
  const killId = e.target.dataset && e.target.dataset.kill;
  if (killId) { deleteZone(Number(killId)); return; }

  const { nx, ny } = overlayCoords(e);
  const handleId = e.target.dataset && e.target.dataset.handle;
  const zoneNode = e.target.closest && e.target.closest('.zone');

  if (handleId) {
    const z = getZone(Number(handleId));
    state.drag = { mode: 'resize', id: z.id, nx, ny, orig: { ...z } };
  } else if (zoneNode) {
    const z = getZone(Number(zoneNode.dataset.id));
    state.selectedZone = z.id;
    renderZones();
    state.drag = { mode: 'move', id: z.id, nx, ny, orig: { ...z } };
  } else {
    if (!state.drawMode || !hasSource()) return;
    const z = addZone(nx, ny, 0.001, 0.001, state.drawType);
    state.drag = { mode: 'create', id: z.id, nx, ny, orig: { ...z } };
  }
  el.overlay.setPointerCapture(e.pointerId);
  e.preventDefault();
});

el.overlay.addEventListener('pointermove', (e) => {
  if (!state.drag) return;
  const { nx, ny } = overlayCoords(e);
  const z = getZone(state.drag.id);
  if (!z) return;
  const d = state.drag;

  if (d.mode === 'create') {
    z.x = Math.min(d.nx, nx); z.y = Math.min(d.ny, ny);
    z.w = Math.abs(nx - d.nx); z.h = Math.abs(ny - d.ny);
  } else if (d.mode === 'move') {
    z.x = clamp01(d.orig.x + (nx - d.nx));
    z.y = clamp01(d.orig.y + (ny - d.ny));
    z.x = Math.min(z.x, 1 - z.w);
    z.y = Math.min(z.y, 1 - z.h);
  } else if (d.mode === 'resize') {
    z.w = Math.max(0.005, Math.min(1 - z.x, d.orig.w + (nx - d.nx)));
    z.h = Math.max(0.005, Math.min(1 - z.y, d.orig.h + (ny - d.ny)));
  }
  refreshZonePositions();
});

function endDrag(e) {
  if (!state.drag) return;
  const z = getZone(state.drag.id);
  if (z && (z.w < 0.008 || z.h < 0.008)) {
    if (state.drag.mode === 'create') deleteZone(z.id);
    else { z.w = Math.max(z.w, 0.02); z.h = Math.max(z.h, 0.02); refreshZonePositions(); }
  }
  state.drag = null;
  try { el.overlay.releasePointerCapture(e.pointerId); } catch (err) {}
  renderZones();
  saveSettings();
}
el.overlay.addEventListener('pointerup', endDrag);
el.overlay.addEventListener('pointercancel', endDrag);

el.zoneList.addEventListener('click', (e) => {
  const t = e.target;
  if (t.dataset.del) deleteZone(Number(t.dataset.del));
  else if (t.dataset.eye) {
    const z = getZone(Number(t.dataset.eye));
    z.hidden = !z.hidden;
    renderZones(); saveSettings();
  } else if (t.classList.contains('name')) {
    const item = t.closest('.zone-item');
    const id = Number(item.querySelector('[data-del]').dataset.del);
    state.selectedZone = id;
    renderZones();
  }
});

el.zoneList.addEventListener('dblclick', (e) => {
  if (!e.target.classList.contains('name')) return;
  const item = e.target.closest('.zone-item');
  const id = Number(item.querySelector('[data-del]').dataset.del);
  const z = getZone(id);
  const nuevo = prompt('Nombre de la zona privada:', z.name);
  if (nuevo) { z.name = nuevo.slice(0, 40); renderZones(); saveSettings(); }
});

el.zoneList.addEventListener('change', (e) => {
  const id = e.target.dataset.type;
  if (!id) return;
  const z = getZone(Number(id));
  z.type = e.target.value;
  renderZones(); saveSettings();
});

el.btnClearZones.addEventListener('click', () => {
  if (!state.zones.length) return;
  if (!confirm('¿Eliminar todas las zonas privadas?')) return;
  state.zones = []; state.selectedZone = null;
  renderZones(); saveSettings();
});

el.btnDraw.addEventListener('click', () => {
  state.drawMode = !state.drawMode;
  el.btnDraw.classList.toggle('active', state.drawMode);
  el.overlay.classList.toggle('drawing', state.drawMode);
  if (state.drawMode) toast('Arrastra sobre la vista previa para tapar una zona.');
});

el.drawTypeGroup.addEventListener('click', (e) => {
  if (!e.target.dataset.type) return;
  state.drawType = e.target.dataset.type;
  [...el.drawTypeGroup.children].forEach((c) => c.classList.toggle('active', c === e.target));
  const z = state.selectedZone && getZone(state.selectedZone);
  if (z) { z.type = state.drawType; renderZones(); saveSettings(); }
});

/* -------------------------------- Grabación ------------------------------ */
function buildRecordingStream() {
  const fps = Number(el.selFps.value) || 30;
  const canvasStream = el.stage.captureStream(fps);
  const tracks = [...canvasStream.getVideoTracks()];
  const wantAudio = !!state.micStream || !!state.sysTrack;
  if (wantAudio) {
    ensureAudio();
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
    tracks.push(...state.audioDest.stream.getAudioTracks());
  }
  return new MediaStream(tracks);
}

async function startRecording() {
  if (!hasSource()) { toast('Primero selecciona una pantalla o activa la cámara.', true); return; }
  if (el.swMic.checked && !state.micStream) await startMic();
  resizeCanvas();

  if (el.chkCountdown.checked) {
    await runCountdown(3);
    if (!hasSource()) return;
  }

  const stream = buildRecordingStream();
  const options = { videoBitsPerSecond: Number(el.selBitrate.value), audioBitsPerSecond: 128000 };
  if (OUTPUT.m) options.mimeType = OUTPUT.m;

  try {
    state.recorder = new MediaRecorder(stream, options);
  } catch (err) {
    try { state.recorder = new MediaRecorder(stream); }
    catch (e2) { toast('No se ha podido iniciar la grabación: ' + e2.message, true); return; }
  }

  state.chunks = [];
  state.recorder.ondataavailable = (e) => { if (e.data && e.data.size) state.chunks.push(e.data); };
  state.recorder.onerror = (e) => toast('Error de grabación: ' + (e.error && e.error.name), true);
  state.recorder.onstop = finishRecording;
  state.recorder.start(1000);

  state.recording = true;
  state.paused = false;
  state.elapsed = 0;
  state.startedAt = performance.now();
  state.timerId = setInterval(updateTimer, 200);

  el.recDot.classList.add('on');
  el.recDot.classList.remove('paused');
  el.btnRecord.textContent = '■ Detener grabación';
  el.btnRecord.classList.add('recording');
  el.btnPause.disabled = false;
  el.btnStop.disabled = false;
  el.selRes.disabled = true;
  el.selFps.disabled = true;
  el.selBitrate.disabled = true;
  el.hudPause.textContent = '❚❚';
  el.recHud.querySelector('.rec-dot').classList.remove('paused');
  el.recHud.classList.remove('hidden');
  setStatus('Grabando');
  toast('Grabación iniciada. Puedes seguir añadiendo zonas privadas.');
}

function runCountdown(n) {
  return new Promise((resolve) => {
    el.countdown.classList.remove('hidden');
    const span = el.countdown.querySelector('span');
    let i = n;
    span.textContent = i;
    const id = setInterval(() => {
      i--;
      if (i <= 0) {
        clearInterval(id);
        el.countdown.classList.add('hidden');
        resolve();
      } else {
        span.textContent = i;
        span.style.animation = 'none';
        void span.offsetWidth;
        span.style.animation = '';
      }
    }, 1000);
  });
}

function togglePause() {
  if (!state.recording || !state.recorder) return;
  if (state.paused) {
    state.recorder.resume();
    state.paused = false;
    state.startedAt = performance.now();
    el.btnPause.textContent = '❚❚ Pausa';
    el.hudPause.textContent = '❚❚';
    el.recHud.querySelector('.rec-dot').classList.remove('paused');
    el.recDot.classList.remove('paused');
    el.recDot.classList.add('on');
    setStatus('Grabando');
  } else {
    state.recorder.pause();
    state.paused = true;
    state.elapsed += performance.now() - state.startedAt;
    el.btnPause.textContent = '▶ Reanudar';
    el.hudPause.textContent = '▶';
    el.recHud.querySelector('.rec-dot').classList.add('paused');
    el.recDot.classList.add('paused');
    setStatus('En pausa');
  }
}

function updateTimer() {
  const total = state.elapsed + (state.paused ? 0 : performance.now() - state.startedAt);
  el.timer.textContent = fmtTime(total);
  el.hudTimer.textContent = fmtTime(total);
}

function stopRecording() {
  if (!state.recorder || !state.recording) return;
  state.elapsed += state.paused ? 0 : performance.now() - state.startedAt;
  try { state.recorder.stop(); } catch (e) {}
  state.recording = false;
  state.paused = false;
  clearInterval(state.timerId);
  el.recDot.classList.remove('on', 'paused');
  el.btnRecord.textContent = '● Empezar a grabar';
  el.btnRecord.classList.remove('recording');
  el.btnPause.disabled = true;
  el.btnPause.textContent = '❚❚ Pausa';
  el.btnStop.disabled = true;
  el.selRes.disabled = false;
  el.selFps.disabled = false;
  el.selBitrate.disabled = false;
  el.recHud.classList.add('hidden');
  setStatus('Procesando…');
}

function finishRecording() {
  const type = state.chunks[0] && state.chunks[0].type ? state.chunks[0].type : (OUTPUT.m || 'video/webm');
  state.blob = new Blob(state.chunks, { type });
  state.chunks = [];
  if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
  state.blobUrl = URL.createObjectURL(state.blob);

  el.resultVideo.src = state.blobUrl;
  const zonasActivas = state.zones.filter((z) => !z.hidden).length;
  el.resultMeta.innerHTML =
    `Duración: <b>${fmtTime(state.elapsed)}</b> · Tamaño: <b>${fmtSize(state.blob.size)}</b> · ` +
    `Resolución: <b>${el.stage.width}×${el.stage.height}</b> · ${Number(el.selFps.value)} fps · ` +
    `Formato: <b>${OUTPUT.ext.toUpperCase()}</b><br>` +
    `Voz: <b>${state.micStream ? 'sí' : 'no'}</b> · Cámara: <b>${state.camStream ? 'sí' : 'no'}</b> · ` +
    `Audio del sistema: <b>${state.sysTrack ? 'sí' : 'no'}</b> · Zonas ocultas: <b>${zonasActivas}</b>`;
  el.result.classList.remove('hidden');
  setStatus('Grabación lista');
}

function downloadBlob() {
  if (!state.blob) return;
  const a = document.createElement('a');
  a.href = state.blobUrl;
  a.download = `grabacion-${stamp()}.${OUTPUT.ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Vídeo descargado.');
}

/* ------------------------------- Captura PNG ----------------------------- */
function screenshot() {
  if (!hasSource()) { toast('No hay ninguna fuente activa.', true); return; }
  renderFrame();
  el.stage.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `captura-${stamp()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Captura guardada con las zonas ya ocultas.');
  }, 'image/png');
}

/* -------------------------------- Ajustes -------------------------------- */
const STORE_KEY = 'grabador-pantalla-v1';

function saveSettings() {
  const data = {
    zones: state.zones,
    zoneSeq: state.zoneSeq,
    strength: el.rngStrength.value,
    drawType: state.drawType,
    camPos: el.selCamPos.value,
    camSize: el.rngCamSize.value,
    camRound: el.chkCamRound.checked,
    camMirror: el.chkCamMirror.checked,
    micGain: el.rngMicGain.value,
    sysGain: el.rngSysGain.value,
    res: el.selRes.value,
    fps: el.selFps.value,
    bitrate: el.selBitrate.value,
    countdown: el.chkCountdown.checked,
    sysAudio: el.chkSysAudio.checked,
  };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {}
}

function loadSettings() {
  let data;
  try { data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return; }
  if (!data) return;
  if (Array.isArray(data.zones)) { state.zones = data.zones; state.zoneSeq = data.zoneSeq || data.zones.length; }
  if (data.strength) el.rngStrength.value = data.strength;
  if (data.drawType) {
    state.drawType = data.drawType;
    [...el.drawTypeGroup.children].forEach((c) => c.classList.toggle('active', c.dataset.type === data.drawType));
  }
  if (data.camPos) el.selCamPos.value = data.camPos;
  if (data.camSize) el.rngCamSize.value = data.camSize;
  if (typeof data.camRound === 'boolean') el.chkCamRound.checked = data.camRound;
  if (typeof data.camMirror === 'boolean') el.chkCamMirror.checked = data.camMirror;
  if (data.micGain) el.rngMicGain.value = data.micGain;
  if (data.sysGain) el.rngSysGain.value = data.sysGain;
  if (data.res) el.selRes.value = data.res;
  if (data.fps) el.selFps.value = data.fps;
  if (data.bitrate) el.selBitrate.value = data.bitrate;
  if (typeof data.countdown === 'boolean') el.chkCountdown.checked = data.countdown;
  if (typeof data.sysAudio === 'boolean') el.chkSysAudio.checked = data.sysAudio;
  syncLabels();
  renderZones();
}

function syncLabels() {
  el.lblMicGain.textContent = el.rngMicGain.value + '%';
  el.lblSysGain.textContent = el.rngSysGain.value + '%';
  el.lblCamSize.textContent = el.rngCamSize.value + '%';
  el.lblStrength.textContent = el.rngStrength.value;
}

/* -------------------------------- Eventos -------------------------------- */
el.btnPickScreen.addEventListener('click', pickScreen);
el.btnPickScreenBig.addEventListener('click', pickScreen);
el.btnStopSource.addEventListener('click', () => {
  if (state.recording) stopRecording();
  stopScreen(true);
});

el.swMic.addEventListener('change', () => { el.swMic.checked ? startMic() : stopMic(); });
el.selMic.addEventListener('change', () => { if (el.swMic.checked) startMic(); });
el.swCam.addEventListener('change', () => { el.swCam.checked ? startCam() : stopCam(); });
el.selCam.addEventListener('change', () => { if (el.swCam.checked) startCam(); });

el.rngMicGain.addEventListener('input', () => {
  syncLabels();
  if (state.micGain) state.micGain.gain.value = Number(el.rngMicGain.value) / 100;
  saveSettings();
});
el.rngSysGain.addEventListener('input', () => {
  syncLabels();
  if (state.sysGain) state.sysGain.gain.value = Number(el.rngSysGain.value) / 100;
  saveSettings();
});
['input', 'change'].forEach((ev) => {
  el.rngCamSize.addEventListener(ev, () => { syncLabels(); saveSettings(); });
  el.rngStrength.addEventListener(ev, () => { syncLabels(); saveSettings(); });
});
[el.selCamPos, el.chkCamRound, el.chkCamMirror, el.selFps, el.selBitrate, el.chkCountdown, el.chkSysAudio]
  .forEach((n) => n.addEventListener('change', saveSettings));
el.selRes.addEventListener('change', () => { resizeCanvas(); saveSettings(); });

el.btnRecord.addEventListener('click', () => { state.recording ? stopRecording() : startRecording(); });
el.btnPause.addEventListener('click', togglePause);
el.btnStop.addEventListener('click', stopRecording);
el.btnShot.addEventListener('click', screenshot);
el.hudPause.addEventListener('click', togglePause);
el.hudStop.addEventListener('click', stopRecording);

el.btnFullscreen.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else el.canvasWrap.requestFullscreen && el.canvasWrap.requestFullscreen();
});

el.btnDownload.addEventListener('click', downloadBlob);
el.btnCloseResult.addEventListener('click', () => el.result.classList.add('hidden'));
el.btnNewRec.addEventListener('click', () => {
  el.result.classList.add('hidden');
  el.timer.textContent = '00:00:00';
  setStatus(hasSource() ? 'Listo para grabar' : 'Sin fuente seleccionada');
});

document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    state.recording ? stopRecording() : startRecording();
  } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    togglePause();
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedZone && !typing) {
    e.preventDefault();
    deleteZone(state.selectedZone);
  }
});

window.addEventListener('beforeunload', (e) => {
  if (state.recording) { e.preventDefault(); e.returnValue = ''; }
});

if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
}

/* --------------------------------- Arranque ------------------------------ */
(function init() {
  el.stage.width = 1280;
  el.stage.height = 720;
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, 1280, 720);
  syncLabels();
  loadSettings();
  if (!checkSupport()) return;
  refreshDevices();
})();
