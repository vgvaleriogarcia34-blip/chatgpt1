/* ============================================================
   Clarity OS — app.js
   Tu sistema de dirección personal
   ============================================================ */

// ===== Estado =====
const state = {
    activeScreen: 'screen-hoy',
    tasks: [
        { id: 't1', title: 'Enviar presupuesto a Laura', tag: { label: 'Alta prioridad', cls: 'gold' }, mins: 25, num: 1, numCls: 'gold', cat: 'commercial' },
        { id: 't2', title: 'Preparar reunión con Antonio', tag: { label: 'Clave', cls: 'blue' }, mins: 30, num: 2, numCls: 'blue', cat: 'work' },
        { id: 't3', title: 'Resolver documentación de Hacienda', tag: { label: 'Importante', cls: 'purple' }, mins: 40, num: 3, numCls: 'purple', cat: 'admin' }
    ],
    detectedTopics: [],
    clarifications: [],
    foco: {
        secondsLeft: 25 * 60,
        timerId: null,
        running: false,
        currentTaskId: 't1',
        block: 25,
        distractions: 0
    }
};

// ===== Categorías =====
const CATEGORIES = {
    work:        { label: 'Trabajo',       icon: 'i-people',  cls: 'work' },
    admin:       { label: 'Administración',icon: 'i-doc',     cls: 'admin' },
    commercial:  { label: 'Comercial',     icon: 'i-send',    cls: 'commercial' },
    family:      { label: 'Familia',       icon: 'i-home',    cls: 'family' },
    personal:    { label: 'Personal',      icon: 'i-phone',   cls: 'personal' }
};

// Palabras clave para clasificar y detectar ambigüedad
const KEYWORDS = {
    admin:      ['hacienda', 'banco', 'factura', 'impuesto', 'gestor', 'documentación', 'documentacion', 'irpf', 'iva', 'asesor', 'préstamo', 'prestamo', 'seguro'],
    commercial: ['presupuesto', 'propuesta', 'venta', 'oferta', 'contrato', 'cotización', 'cotizacion', 'cliente potencial', 'lead'],
    family:     ['colegio', 'hijo', 'hija', 'familia', 'casa', 'pareja', 'cumpleaños', 'cumpleanos', 'guardería', 'guarderia'],
    personal:   ['médico', 'medico', 'gimnasio', 'salud', 'doctor', 'dentista', 'comprar', 'tienda'],
    work:       ['reunión', 'reunion', 'cliente', 'equipo', 'proyecto', 'agenda', 'llamar', 'pedro', 'antonio', 'laura', 'jefe']
};

// Verbos vagos -> ambigüedad
const VAGUE_VERBS = ['mirar', 'ver', 'revisar', 'hablar', 'pensar', 'echar un ojo', 'preparar', 'recordar', 'no olvidar', 'ocuparme', 'ocuparse', 'gestionar', 'lo de'];

// ===== Inicio =====
document.addEventListener('DOMContentLoaded', () => {
    setGreeting();
    renderHoy();
    bindTabs();
    bindCaptura();
    bindClarificador();
    bindFoco();
    bindPerfil();
    bindAlerts();
});

// ===== Saludo según hora =====
function setGreeting() {
    const h = new Date().getHours();
    const saludo = h < 6 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
    const el = document.getElementById('hoyGreeting');
    if (el) el.textContent = `${saludo}, Valerio`;
}

// ===== Navegación entre pantallas =====
function bindTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => goTo(tab.dataset.target));
    });
}

function goTo(screenId) {
    state.activeScreen = screenId;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === screenId));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.target === screenId));

    // Resaltar tab Captura cuando estás en Clarificador
    if (screenId === 'screen-clarificador') {
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.target === 'screen-captura'));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== HOY: Render lista de cierres =====
function renderHoy() {
    const list = document.getElementById('cierresList');
    if (!list) return;
    list.innerHTML = state.tasks.slice(0, 3).map(t => `
        <li class="task-card" data-id="${t.id}">
            <div class="task-num ${t.numCls}">${t.num}</div>
            <div class="task-body">
                <div class="task-title-row">${escapeHtml(t.title)}</div>
                <span class="tag ${t.tag.cls}">${t.tag.label}</span>
            </div>
            <span class="task-time">
                <svg><use href="#i-clock"/></svg> ${t.mins} min
            </span>
            <svg class="task-chev"><use href="#i-chevron"/></svg>
        </li>
    `).join('');

    list.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            startFocusOn(id);
        });
    });

    document.getElementById('statTareas').textContent = state.tasks.length;
}

function startFocusOn(taskId) {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    state.foco.currentTaskId = taskId;
    state.foco.secondsLeft = (t.mins || 25) * 60;
    state.foco.block = t.mins || 25;
    document.getElementById('focoTask').textContent = t.title;
    document.getElementById('focoGoal').textContent = guessGoal(t);
    document.getElementById('focoBlock').textContent = state.foco.block;
    updateFocoTimer();
    goTo('screen-foco');
}

function guessGoal(t) {
    if (t.cat === 'commercial') return 'email enviado con PDF adjunto';
    if (t.cat === 'admin')      return 'documento entregado y registrado';
    if (t.cat === 'work')       return 'agenda enviada antes de las 18:00';
    return 'tarea cerrada con criterio claro';
}

// ===== CAPTURA =====
function bindCaptura() {
    // Segmented Texto / Audio / Foto
    document.querySelectorAll('.seg-btn').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            const mode = b.dataset.mode;
            const input = document.getElementById('captureInput');
            if (mode === 'audio') input.placeholder = 'Pulsa "Analizar ahora" para simular transcripción del audio.';
            else if (mode === 'foto') input.placeholder = 'Pulsa "Analizar ahora" para simular OCR de la imagen.';
            else input.placeholder = 'Tengo que llamar a Pedro, revisar lo de Hacienda, preparar la reunión de mañana, mandar el presupuesto a Laura y no olvidar lo del colegio.';
        });
    });

    document.getElementById('analyzeBtn').addEventListener('click', () => {
        const text = (document.getElementById('captureInput').value || '').trim();
        const sample = 'Tengo que llamar a Pedro, revisar lo de Hacienda, preparar la reunión de mañana, mandar el presupuesto a Laura y no olvidar lo del colegio.';
        const source = text || sample;
        const topics = analyzeText(source);
        state.detectedTopics = topics;
        renderTopics(topics);
        showToast(`✨ ${topics.length} asuntos detectados`);
    });
}

function analyzeText(raw) {
    // Divide por comas, "y", puntos, saltos de línea
    const chunks = raw
        .replace(/\bno olvidar\b/gi, ' ')
        .replace(/\btengo que\b/gi, ' ')
        .replace(/\bdebería\b/gi, ' ')
        .replace(/\bquiero\b/gi, ' ')
        .split(/[,.;\n]| y (?=[a-záéíóúñ])/i)
        .map(s => s.trim())
        .filter(s => s.length > 3);

    const topics = chunks.map((chunk, i) => {
        const cat = classify(chunk);
        const ambiguous = isAmbiguous(chunk);
        const title = capitalizeFirst(cleanTitle(chunk));
        return {
            id: `c${i + 1}`,
            num: i + 1,
            title,
            raw: chunk,
            cat,
            ambiguous
        };
    });

    return topics;
}

function classify(chunk) {
    const c = chunk.toLowerCase();
    let best = 'work', bestScore = 0;
    for (const [cat, words] of Object.entries(KEYWORDS)) {
        let score = 0;
        for (const w of words) if (c.includes(w)) score++;
        if (score > bestScore) { best = cat; bestScore = score; }
    }
    return bestScore === 0 ? 'work' : best;
}

function isAmbiguous(chunk) {
    const c = chunk.toLowerCase();
    return VAGUE_VERBS.some(v => c.includes(v)) && !/\d|antes de|para el/.test(c);
}

function cleanTitle(chunk) {
    return chunk
        .replace(/^\s*(que|de|el|la|los|las)\s+/i, '')
        .replace(/^\s*lo de\s+/i, 'Revisar ')
        .replace(/\s+/g, ' ')
        .trim();
}

function capitalizeFirst(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function renderTopics(topics) {
    const list = document.getElementById('topicList');
    list.innerHTML = topics.map(t => {
        const cat = CATEGORIES[t.cat];
        return `
            <li class="topic-card" data-id="${t.id}">
                <div class="topic-num">${t.num}</div>
                <div class="topic-icon ${cat.cls}"><svg><use href="#${cat.icon}"/></svg></div>
                <div class="topic-body">
                    <div class="topic-title">${escapeHtml(t.title)}</div>
                    <span class="tag ${cat.cls === 'work' ? 'blue' : cat.cls === 'admin' ? '' : cat.cls === 'commercial' ? 'green' : cat.cls === 'family' ? 'purple' : 'red'}">${cat.label}</span>
                </div>
                <svg class="topic-chev"><use href="#i-chevron"/></svg>
            </li>
        `;
    }).join('');

    const ambigCount = topics.filter(t => t.ambiguous).length;
    const note = document.getElementById('ambiguityNote');
    if (ambigCount > 0) {
        document.getElementById('ambiguityCount').textContent = ambigCount;
        note.hidden = false;
        note.onclick = openClarificador;
    } else {
        note.hidden = true;
    }
}

// ===== CLARIFICADOR =====
function openClarificador() {
    const ambiguous = state.detectedTopics.filter(t => t.ambiguous);
    if (ambiguous.length === 0) {
        showToast('No hay tareas ambiguas que clarificar');
        return;
    }
    state.clarifications = ambiguous.map(buildClarification);
    renderClarificador();
    goTo('screen-clarificador');
}

function buildClarification(topic) {
    const cat = CATEGORIES[topic.cat];
    const t = topic.raw.toLowerCase();
    let clarified = '', mins = 25, criterio = 'tarea cerrada', chip = { label: 'Importante', cls: 'blue' };

    if (t.includes('reunión') || t.includes('reunion')) {
        const persona = (t.match(/con\s+([a-záéíóú]+)/i) || [])[1] || 'el equipo';
        clarified = `Preparar una agenda de 5 puntos para la reunión con ${capitalizeFirst(persona)} y enviarla antes de las 18:00`;
        mins = 30; criterio = 'agenda enviada'; chip = { label: 'Clave', cls: 'blue' };
    } else if (t.includes('banco')) {
        clarified = 'Llamar al banco para confirmar el estado del préstamo y anotar próximos pasos';
        mins = 20; criterio = 'respuesta anotada'; chip = { label: 'Administración', cls: 'purple' };
    } else if (t.includes('hacienda') || t.includes('factura') || t.includes('impuesto')) {
        clarified = 'Recopilar facturas pendientes y subirlas al gestor antes del viernes';
        mins = 45; criterio = 'documentos subidos'; chip = { label: 'Administración', cls: 'purple' };
    } else if (t.includes('colegio')) {
        clarified = 'Confirmar con el colegio el horario y dejarlo apuntado en el calendario familiar';
        mins = 10; criterio = 'evento creado'; chip = { label: 'Familia', cls: 'purple' };
    } else if (t.includes('presupuesto') || t.includes('propuesta')) {
        clarified = 'Redactar el presupuesto con 3 paquetes y enviarlo por email con PDF adjunto';
        mins = 40; criterio = 'email enviado'; chip = { label: 'Comercial', cls: 'green' };
    } else if (t.includes('mirar') || t.includes('ver')) {
        clarified = `Definir 1 acción concreta sobre "${topic.title}" y bloquear 20 min hoy para ejecutarla`;
        mins = 20; criterio = 'acción ejecutada';
    } else {
        clarified = `Convertir "${topic.title}" en una sola acción cerrable y agendarla hoy`;
        mins = 20; criterio = 'acción agendada';
    }

    return {
        id: topic.id,
        detectedTitle: capitalizeFirst(topic.title),
        clarifiedTitle: clarified,
        mins,
        criterio,
        chip,
        cat
    };
}

function renderClarificador() {
    const host = document.getElementById('clarifyPairs');
    host.innerHTML = state.clarifications.map(c => `
        <div class="clarify-pair">
            <div class="clarify-card">
                <div class="clarify-icon q"><svg><use href="#i-q"/></svg></div>
                <div>
                    <div class="clarify-label detected">Tarea detectada</div>
                    <div class="clarify-text">${escapeHtml(c.detectedTitle)}</div>
                    <span class="clarify-ambi"><svg><use href="#i-warn"/></svg> Ambigua</span>
                </div>
            </div>
            <svg class="clarify-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M6 14l6 6 6-6"/></svg>
            <div class="clarify-card">
                <div class="clarify-icon ok"><svg><use href="#i-check"/></svg></div>
                <div>
                    <div class="clarify-label clarified">Versión clarificada</div>
                    <div class="clarify-text">${escapeHtml(c.clarifiedTitle)}</div>
                    <div class="clarify-meta">
                        <span class="tag blue"><svg style="width:11px;height:11px" hidden></svg> ${c.mins} min</span>
                        <span class="tag ${c.chip.cls}">${c.chip.label}</span>
                        <span class="tag ${c.cat.cls === 'work' ? 'blue' : c.cat.cls === 'admin' ? 'purple' : c.cat.cls === 'commercial' ? 'green' : c.cat.cls === 'family' ? 'purple' : 'red'}">${c.cat.label}</span>
                    </div>
                    <div class="clarify-criterion">Criterio de cierre: <strong>${escapeHtml(c.criterio)}</strong></div>
                </div>
            </div>
        </div>
    `).join('');
}

function bindClarificador() {
    document.getElementById('acceptTasksBtn').addEventListener('click', () => {
        const newTasks = state.clarifications.map((c, i) => ({
            id: `clar-${Date.now()}-${i}`,
            title: c.clarifiedTitle,
            tag: c.chip,
            mins: c.mins,
            num: state.tasks.length + i + 1,
            numCls: c.chip.cls === 'gold' ? 'gold' : c.chip.cls === 'blue' ? 'blue' : 'purple',
            cat: Object.keys(CATEGORIES).find(k => CATEGORIES[k] === c.cat) || 'work'
        }));
        state.tasks = [...state.tasks, ...newTasks];
        renumberTasks();
        renderHoy();
        showToast(`✅ ${newTasks.length} tareas añadidas a Hoy`);
        goTo('screen-hoy');
    });

    document.getElementById('keepClarifyingBtn').addEventListener('click', () => {
        showToast('🔁 El clarificador seguirá refinando');
    });
}

function renumberTasks() {
    state.tasks.forEach((t, i) => { t.num = i + 1; });
}

// ===== FOCO =====
function bindFoco() {
    updateFocoTimer();

    // Auto-arranca el timer al entrar en la pantalla
    const observer = new MutationObserver(() => {
        const screen = document.getElementById('screen-foco');
        if (screen.classList.contains('active') && !state.foco.running) {
            startFocoTimer();
        } else if (!screen.classList.contains('active') && state.foco.running) {
            pauseFocoTimer();
        }
    });
    observer.observe(document.getElementById('screen-foco'), { attributes: true, attributeFilter: ['class'] });

    document.getElementById('distractedBtn').addEventListener('click', () => {
        state.foco.distractions++;
        showToast('👁 Anotado. Vuelve al objetivo.');
    });

    document.getElementById('blockedBtn').addEventListener('click', () => {
        showToast('🔒 Vamos a romper el bloqueo: define un movimiento de 2 min.');
    });

    document.getElementById('closedBtn').addEventListener('click', () => {
        const id = state.foco.currentTaskId;
        state.tasks = state.tasks.filter(t => t.id !== id);
        renumberTasks();
        renderHoy();
        pauseFocoTimer();
        showToast('🎯 Tarea cerrada. ¡Buen trabajo!');
        goTo('screen-hoy');
    });

    document.getElementById('nextMoveBtn').addEventListener('click', () => {
        showToast('▶ Empieza por el movimiento mínimo (2 min).');
    });
}

function startFocoTimer() {
    if (state.foco.timerId) return;
    state.foco.running = true;
    state.foco.timerId = setInterval(() => {
        state.foco.secondsLeft = Math.max(0, state.foco.secondsLeft - 1);
        updateFocoTimer();
        if (state.foco.secondsLeft === 0) {
            pauseFocoTimer();
            showToast('⏰ Bloque completado. Respira 2 min.');
        }
    }, 1000);
}

function pauseFocoTimer() {
    if (state.foco.timerId) clearInterval(state.foco.timerId);
    state.foco.timerId = null;
    state.foco.running = false;
}

function updateFocoTimer() {
    const m = Math.floor(state.foco.secondsLeft / 60);
    const s = state.foco.secondsLeft % 60;
    const el = document.getElementById('focoTimer');
    if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ===== Perfil =====
function bindPerfil() {
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (!confirm('¿Restablecer datos de ejemplo?')) return;
        location.reload();
    });
}

// ===== Alertas (Hoy) =====
function bindAlerts() {
    document.querySelectorAll('.alert.dark').forEach(a => {
        a.addEventListener('click', () => showToast('⚠ 3 reuniones consecutivas detectadas. Considera dejar 1 bloque libre.'));
    });
    document.querySelectorAll('.alert.light').forEach(a => {
        a.addEventListener('click', () => showToast('💡 Activa "modo claridad" desde Perfil.'));
    });

    const verTodo = document.querySelector('[data-action="ver-todo"]');
    if (verTodo) verTodo.addEventListener('click', () => goTo('screen-foco'));
}

// ===== Helpers =====
let toastTimer = null;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
