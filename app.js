// ===== STATE =====
const state = {
    currentStep: 1,
    totalSteps: 5,
    // Step 1
    rol: null,
    horasRepetitivas: 15,
    ingreso: null,
    // Step 2
    herramientas: [],
    frecuencia: null,
    nivel: null,
    // Step 3
    usosIA: [],
    procesos: null,
    horasAhorro: 10,
    // Step 4
    frustraciones: [],
    inversion: null,
    disposicion: null,
    email: ''
};

// ===== DOM ELEMENTS =====
const progressFill = document.getElementById('progressFill');
const progressSteps = document.getElementById('progressSteps');
const steps = document.querySelectorAll('.step-container');

// ===== INIT =====
function init() {
    setupOptionButtons();
    setupCheckboxes();
    setupSliders();
    setupNavigation();
    setupEmail();
    updateProgress();
}

// ===== OPTION BUTTONS (single select) =====
function setupOptionButtons() {
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.field;
            const value = btn.dataset.value;

            // Deselect siblings
            btn.closest('.options-grid, .level-selector').querySelectorAll('.option-btn, .level-btn').forEach(b => {
                b.classList.remove('selected');
            });
            btn.classList.add('selected');

            state[field] = value;
            validateCurrentStep();
        });
    });

    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.field;
            const value = btn.dataset.value;

            btn.closest('.level-selector').querySelectorAll('.level-btn').forEach(b => {
                b.classList.remove('selected');
            });
            btn.classList.add('selected');

            state[field] = value;
            validateCurrentStep();
        });
    });
}

// ===== CHECKBOXES =====
function setupCheckboxes() {
    // Step 2 - herramientas
    document.querySelectorAll('#step2 .checkbox-option input').forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = Array.from(document.querySelectorAll('#step2 .checkbox-option input:checked'))
                .map(c => c.value);
            state.herramientas = checked;
            validateCurrentStep();
        });
    });

    // Step 3 - usos
    document.querySelectorAll('#step3 .checkbox-option input').forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = Array.from(document.querySelectorAll('#step3 .checkbox-option input:checked'))
                .map(c => c.value);
            state.usosIA = checked;
            validateCurrentStep();
        });
    });

    // Step 4 - frustraciones
    document.querySelectorAll('#step4 .checkbox-option input').forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = Array.from(document.querySelectorAll('#step4 .checkbox-option input:checked'))
                .map(c => c.value);
            state.frustraciones = checked;
            validateCurrentStep();
        });
    });
}

// ===== SLIDERS =====
function setupSliders() {
    const sliderRep = document.getElementById('horasRepetitivas');
    const sliderRepVal = document.getElementById('horasRepVal');
    sliderRep.addEventListener('input', () => {
        state.horasRepetitivas = parseInt(sliderRep.value);
        sliderRepVal.textContent = sliderRep.value;
    });

    const sliderAh = document.getElementById('horasAhorro');
    const sliderAhVal = document.getElementById('horasAhVal');
    sliderAh.addEventListener('input', () => {
        state.horasAhorro = parseInt(sliderAh.value);
        sliderAhVal.textContent = sliderAh.value;
    });
}

// ===== EMAIL =====
function setupEmail() {
    document.getElementById('emailInput').addEventListener('input', (e) => {
        state.email = e.target.value;
        validateCurrentStep();
    });
}

// ===== NAVIGATION =====
function setupNavigation() {
    document.getElementById('next1').addEventListener('click', () => goToStep(2));
    document.getElementById('next2').addEventListener('click', () => goToStep(3));
    document.getElementById('next3').addEventListener('click', () => goToStep(4));
    document.getElementById('next4').addEventListener('click', () => {
        generateReport();
        goToStep(5);
    });

    document.getElementById('back2').addEventListener('click', () => goToStep(1));
    document.getElementById('back3').addEventListener('click', () => goToStep(2));
    document.getElementById('back4').addEventListener('click', () => goToStep(3));
}

function goToStep(step) {
    steps.forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    state.currentStep = step;
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
    const pct = (state.currentStep / state.totalSteps) * 100;
    progressFill.style.width = `${pct}%`;

    progressSteps.querySelectorAll('.step').forEach(s => {
        const stepNum = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');
        if (stepNum === state.currentStep) s.classList.add('active');
        else if (stepNum < state.currentStep) s.classList.add('completed');
    });
}

// ===== VALIDATION =====
function validateCurrentStep() {
    let valid = false;
    switch (state.currentStep) {
        case 1:
            valid = state.rol && state.ingreso;
            document.getElementById('next1').disabled = !valid;
            break;
        case 2:
            valid = state.frecuencia && state.nivel;
            document.getElementById('next2').disabled = !valid;
            break;
        case 3:
            valid = state.procesos !== null;
            document.getElementById('next3').disabled = !valid;
            break;
        case 4:
            valid = state.inversion && state.disposicion && isValidEmail(state.email);
            document.getElementById('next4').disabled = !valid;
            break;
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===== REPORT GENERATION =====
function generateReport() {
    const ingreso = parseInt(state.ingreso);
    const horasRep = state.horasRepetitivas;
    const horasAhorro = state.horasAhorro;
    const nivel = parseInt(state.nivel);
    const procesos = parseInt(state.procesos);
    const frecuenciaMap = { nunca: 0, ocasional: 0.2, semanal: 0.5, diario: 0.8 };
    const frecuenciaPct = frecuenciaMap[state.frecuencia] || 0;

    // Calculate hourly rate
    const horasTrabajo = 160; // monthly hours
    const tarifaHora = ingreso / horasTrabajo;

    // Money lost on repetitive tasks
    const horasRepMes = horasRep * 4.3;
    const dineroRepetitivo = horasRepMes * tarifaHora;

    // Efficiency multiplier based on AI level
    const eficienciaActual = 0.1 + (nivel * 0.15) + (frecuenciaPct * 0.2);
    const eficienciaIA50 = 0.85;
    const gapEficiencia = eficienciaIA50 - eficienciaActual;

    // Opportunity cost of not automating
    const horasAhorroMes = horasAhorro * 4.3;
    const costoOportunidad = horasAhorroMes * tarifaHora * (1 - eficienciaActual);

    // Potential revenue increase
    const multiplicadorPotencial = 1.5 + (gapEficiencia * 2);
    const ingresoPotencial = ingreso * multiplicadorPotencial;
    const ingresoExtra = ingresoPotencial - ingreso;

    // Total annual loss
    const perdidaMensual = dineroRepetitivo * gapEficiencia + costoOportunidad * 0.6;
    const perdidaAnual = perdidaMensual * 12;

    // Diagnosis score
    const scoreDiagnostico = Math.min(100, Math.round(
        (nivel * 8) +
        (frecuenciaPct * 20) +
        (procesos * 4) +
        (state.herramientas.length * 5)
    ));

    // Profile classification
    const perfiles = {
        low: { name: 'Dormido Digital', color: 'var(--danger)', emoji: '😴' },
        mid: { name: 'Explorador IA', color: 'var(--accent)', emoji: '🧭' },
        high: { name: 'Constructor IA', color: 'var(--success)', emoji: '🏗️' }
    };
    const perfil = scoreDiagnostico < 35 ? perfiles.low :
                   scoreDiagnostico < 65 ? perfiles.mid : perfiles.high;

    // ROI of IA50
    const inversionIA50 = 497;
    const roiMeses = inversionIA50 / (perdidaMensual || 1);

    const container = document.getElementById('reportContainer');
    container.innerHTML = `
        <!-- Profile Badge -->
        <div style="text-align: center; margin-bottom: 8px;">
            <span class="profile-badge">${perfil.emoji} Tu perfil: ${perfil.name}</span>
        </div>

        <!-- Main Loss Card -->
        <div class="report-header">
            <div class="money-lost-label">Estás perdiendo aproximadamente</div>
            <div class="money-lost">${formatMoney(perdidaAnual)}/año</div>
            <div class="money-period">Eso son <strong>${formatMoney(perdidaMensual)}/mes</strong> que se escapan por no usar IA correctamente</div>
        </div>

        <!-- Detail Cards -->
        <div class="report-cards">
            <!-- Diagnosis -->
            <div class="report-card">
                <div class="report-card-header">
                    <span class="report-card-icon">🩺</span>
                    <span class="report-card-title">Tu Diagnóstico IA</span>
                </div>
                <div class="report-card-value ${scoreDiagnostico < 35 ? 'danger' : scoreDiagnostico < 65 ? 'warning' : 'success'}">${scoreDiagnostico}/100</div>
                <div class="report-card-desc">
                    ${scoreDiagnostico < 35
                        ? 'Estás muy por debajo del potencial. La IA podría transformar completamente tu forma de trabajar.'
                        : scoreDiagnostico < 65
                        ? 'Tienes una base, pero estás dejando mucho potencial sin explotar. Hay un salto enorme disponible.'
                        : 'Buen nivel, pero aún hay margen significativo de mejora para maximizar resultados.'}
                </div>
                <div class="diagnosis-bar">
                    <span style="font-size: 12px; color: var(--text-muted);">0</span>
                    <div class="diagnosis-fill">
                        <div class="diagnosis-fill-inner" style="width: ${scoreDiagnostico}%; background: ${scoreDiagnostico < 35 ? 'var(--danger)' : scoreDiagnostico < 65 ? 'var(--accent)' : 'var(--success)'}"></div>
                    </div>
                    <span class="diagnosis-label" style="color: ${scoreDiagnostico < 35 ? 'var(--danger)' : scoreDiagnostico < 65 ? 'var(--accent)' : 'var(--success)'}">${scoreDiagnostico}%</span>
                </div>
            </div>

            <!-- Time Wasted -->
            <div class="report-card">
                <div class="report-card-header">
                    <span class="report-card-icon">⏰</span>
                    <span class="report-card-title">Tiempo Perdido</span>
                </div>
                <div class="report-card-value danger">${horasRep}h/semana</div>
                <div class="report-card-desc">
                    Dedicas <strong>${horasRep} horas semanales</strong> a tareas repetitivas.
                    Eso son <strong>${Math.round(horasRepMes)} horas al mes</strong> (${Math.round(horasRepMes / horasTrabajo * 100)}% de tu jornada)
                    valoradas en <strong>${formatMoney(dineroRepetitivo)}/mes</strong>.
                </div>
            </div>

            <!-- Opportunity Cost -->
            <div class="report-card">
                <div class="report-card-header">
                    <span class="report-card-icon">💸</span>
                    <span class="report-card-title">Costo de Oportunidad</span>
                </div>
                <div class="report-card-value warning">${formatMoney(costoOportunidad)}/mes</div>
                <div class="report-card-desc">
                    Podrías estar ganando <strong>${formatMoney(ingresoExtra)} más al mes</strong>
                    si automatizaras tus procesos clave. Tu potencial está en <strong>${formatMoney(ingresoPotencial)}/mes</strong>.
                </div>
            </div>

            <!-- Tu vs IA50 -->
            <div class="report-card">
                <div class="report-card-header">
                    <span class="report-card-icon">⚔️</span>
                    <span class="report-card-title">Tú Hoy vs. Tú con IA50</span>
                </div>
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Métrica</th>
                            <th>Tú Hoy</th>
                            <th>Con IA50</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Eficiencia IA</td>
                            <td class="you">${Math.round(eficienciaActual * 100)}%</td>
                            <td class="ia50">${Math.round(eficienciaIA50 * 100)}%</td>
                        </tr>
                        <tr>
                            <td>Horas en tareas manuales</td>
                            <td class="you">${horasRep}h/sem</td>
                            <td class="ia50">${Math.max(2, Math.round(horasRep * 0.2))}h/sem</td>
                        </tr>
                        <tr>
                            <td>Procesos automatizados</td>
                            <td class="you">${procesos}</td>
                            <td class="ia50">+15</td>
                        </tr>
                        <tr>
                            <td>Ingreso potencial</td>
                            <td class="you">${formatMoney(ingreso)}</td>
                            <td class="ia50">${formatMoney(ingresoPotencial)}</td>
                        </tr>
                        <tr>
                            <td>Horas libres extra</td>
                            <td class="you">0h</td>
                            <td class="ia50">+${horasAhorro}h/sem</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Frustrations Addressed -->
            ${state.frustraciones.length > 0 ? `
            <div class="report-card">
                <div class="report-card-header">
                    <span class="report-card-icon">🎯</span>
                    <span class="report-card-title">Problemas que IA50 Resuelve</span>
                </div>
                <div class="report-card-desc">
                    ${generateFrustrationSolutions(state.frustraciones)}
                </div>
            </div>
            ` : ''}
        </div>

        <!-- CTA -->
        <div class="cta-section">
            <div class="cta-title">IA50: Domina la IA en 50 Días</div>
            <div class="cta-subtitle">
                El programa que transforma tu forma de trabajar con IA.<br>
                De ${perfil.name} a Constructor IA en 7 semanas.
            </div>
            <div class="cta-price">Inversión única: <strong>497€</strong></div>
            <div class="cta-savings">
                💰 ROI estimado: recuperas la inversión en ${roiMeses < 1 ? 'menos de 1 mes' : Math.ceil(roiMeses) + ' meses'}
                · Ahorro anual: ${formatMoney(perdidaAnual)}
            </div>
            <button class="btn-cta" onclick="handleCTA()">🚀 Quiero Dejar de Perder Dinero</button>
            <div class="cta-guarantee">🔒 Garantía de 14 días. Si no ves resultados, te devolvemos el 100%.</div>
        </div>
    `;

    // Animate the diagnosis bar
    setTimeout(() => {
        const bar = container.querySelector('.diagnosis-fill-inner');
        if (bar) bar.style.width = `${scoreDiagnostico}%`;
    }, 300);
}

// ===== HELPERS =====
function formatMoney(amount) {
    if (amount >= 1000) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(amount));
    }
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(amount));
}

function generateFrustrationSolutions(frustrations) {
    const solutions = {
        tiempo: '⏰ <strong>"No tengo tiempo"</strong> → IA50 te enseña a automatizar y delegar a la IA, recuperando +15h/semana.',
        escalar: '📈 <strong>"No puedo escalar"</strong> → Aprenderás a crear sistemas con IA que escalan sin necesitar más equipo.',
        competencia: '🏃 <strong>"La competencia me adelanta"</strong> → Con IA50 tendrás ventaja competitiva desde la semana 1.',
        equipo: '👥 <strong>"Dependo de mi equipo"</strong> → La IA se convierte en tu empleado 24/7 que no descansa.',
        ingresos: '💰 <strong>"Ingresos estancados"</strong> → Nuevas fuentes de ingreso usando IA para crear productos y automatizar ventas.',
        manual: '🔧 <strong>"Todo es manual"</strong> → Automatizarás +15 procesos clave de tu negocio con IA.'
    };

    return frustrations.map(f => `<p style="margin: 8px 0;">${solutions[f] || ''}</p>`).join('');
}

function handleCTA() {
    // Track conversion and redirect
    const data = {
        email: state.email,
        rol: state.rol,
        nivel: state.nivel,
        perfil: state.currentStep === 5 ? 'completed' : 'abandoned'
    };
    console.log('CTA clicked:', data);
    alert('¡Perfecto! Te redirigimos a la página de inscripción de IA50.\n\n(Aquí iría el enlace de pago)');
}

// ===== START =====
init();
