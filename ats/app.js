/* ============================================================
   TalentFlow · ATS para RRHH  —  edición completa
   SPA en vanilla JS con persistencia en localStorage.
   Paridad de funciones con líderes de mercado (Greenhouse,
   Ashby, Lever): requisiciones con aprobación, scorecards
   estructurados, scheduling, CRM/talent pool, comunicación,
   ofertas, analítica avanzada, DE&I, portal de empleo y
   automatizaciones.
   ============================================================ */

const STORAGE_KEY = 'talentflow_ats_v2';

const STAGES = [
    { id: 'nuevo',        name: 'Nuevo',          color: '#5b8cff' },
    { id: 'preseleccion', name: 'Preselección',   color: '#7c5cff' },
    { id: 'entrevista',   name: 'Entrevista',     color: '#ffb547' },
    { id: 'prueba',       name: 'Prueba técnica', color: '#22c1c3' },
    { id: 'oferta',       name: 'Oferta',         color: '#2fce8a' },
    { id: 'contratado',   name: 'Contratado',     color: '#16a34a' },
    { id: 'rechazado',    name: 'Rechazado',      color: '#ff5f6d' },
];
const stageById = id => STAGES.find(s => s.id === id) || STAGES[0];
const stageIndex = id => STAGES.findIndex(s => s.id === id);

const RECOMMENDATIONS = [
    { id: 'sf', label: 'Sí rotundo', color: '#16a34a', v: 2 },
    { id: 'si', label: 'Sí',         color: '#2fce8a', v: 1 },
    { id: 'nt', label: 'Neutral',    color: '#ffb547', v: 0 },
    { id: 'no', label: 'No',         color: '#ff8a5f', v: -1 },
    { id: 'nf', label: 'No rotundo', color: '#ff5f6d', v: -2 },
];
const recById = id => RECOMMENDATIONS.find(r => r.id === id);

const SCORE_CRITERIA = ['Competencia técnica', 'Comunicación', 'Encaje cultural', 'Experiencia', 'Resolución de problemas'];
const SOURCES = ['LinkedIn', 'Referido', 'Web empleo', 'Portal propio', 'Agencia', 'Evento', 'Otro'];
const GENDERS = ['Mujer', 'Hombre', 'No binario', 'Prefiere no decir'];
const AVATAR_COLORS = ['#5b8cff','#7c5cff','#ffb547','#2fce8a','#ff5f6d','#22c1c3','#e879f9','#fb923c'];
const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

/* --- Evaluación de conducta / psicotécnicos --- */
const BELBIN_ROLES = [
    { id: 'CE', name: 'Cerebro', cluster: 'Mental', desc: 'Creativo, imaginativo; resuelve problemas difíciles.', color: '#7c5cff' },
    { id: 'ME', name: 'Monitor Evaluador', cluster: 'Mental', desc: 'Estratégico y crítico; juzga con precisión.', color: '#6366f1' },
    { id: 'ES', name: 'Especialista', cluster: 'Mental', desc: 'Dedicado; aporta conocimiento experto.', color: '#22c1c3' },
    { id: 'CO', name: 'Coordinador', cluster: 'Social', desc: 'Maduro; clarifica objetivos y delega bien.', color: '#2fce8a' },
    { id: 'CH', name: 'Cohesionador', cluster: 'Social', desc: 'Cooperador y diplomático; evita fricciones.', color: '#16a34a' },
    { id: 'IR', name: 'Investigador de Recursos', cluster: 'Social', desc: 'Extrovertido; explora oportunidades y contactos.', color: '#84cc16' },
    { id: 'IS', name: 'Impulsor', cluster: 'Acción', desc: 'Retador y dinámico; empuja bajo presión.', color: '#ff5f6d' },
    { id: 'ID', name: 'Implementador', cluster: 'Acción', desc: 'Disciplinado y eficiente; convierte ideas en acciones.', color: '#fb923c' },
    { id: 'FI', name: 'Finalizador', cluster: 'Acción', desc: 'Concienzudo; busca errores y cumple plazos.', color: '#ffb547' },
];
const belbinById = id => BELBIN_ROLES.find(r => r.id === id);
const BIGFIVE = [
    { id: 'O', name: 'Apertura', desc: 'Curiosidad, creatividad' },
    { id: 'C', name: 'Responsabilidad', desc: 'Organización, disciplina' },
    { id: 'E', name: 'Extraversión', desc: 'Sociabilidad, energía' },
    { id: 'A', name: 'Amabilidad', desc: 'Cooperación, empatía' },
    { id: 'S', name: 'Estabilidad emocional', desc: 'Calma, resiliencia' },
];
const DISC = [
    { id: 'D', name: 'Dominancia', color: '#ff5f6d' },
    { id: 'I', name: 'Influencia', color: '#ffb547' },
    { id: 'S', name: 'Estabilidad', color: '#2fce8a' },
    { id: 'C', name: 'Cumplimiento', color: '#5b8cff' },
];
const PSICO = [
    { id: 'verbal', name: 'Razonamiento verbal' },
    { id: 'numerico', name: 'Razonamiento numérico' },
    { id: 'logico', name: 'Razonamiento lógico' },
    { id: 'abstracto', name: 'Razonamiento abstracto' },
];
function defaultDNA() {
    return {
        mission: 'Ayudar a las empresas a tomar mejores decisiones con datos.',
        vision: 'Ser la plataforma de referencia en gestión del talento en habla hispana.',
        values: [
            { name: 'Orientación al cliente', desc: 'Ponemos al cliente en el centro de cada decisión.' },
            { name: 'Trabajo en equipo', desc: 'Colaboramos con transparencia y confianza.' },
            { name: 'Excelencia', desc: 'Buscamos la calidad y la mejora continua.' },
            { name: 'Innovación', desc: 'Cuestionamos el statu quo y experimentamos.' },
            { name: 'Integridad', desc: 'Actuamos con honestidad y responsabilidad.' },
        ],
    };
}

/* ---------- Estado ---------- */
let state = { jobs: [], candidates: [], templates: [], automations: [], team: [], settings: {} };
let currentView = 'dashboard';
let searchTerm = '';
const sel = new Set(); // selección múltiple de candidatos

function uid(p) { return p + '_' + Math.random().toString(36).slice(2, 9); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
// Sanitiza entradas de usuario antes de guardarlas (evita HTML inyectado en plantillas)
function sanitizeObj(data) {
    Object.keys(data).forEach(k => { if (typeof data[k] === 'string') data[k] = data[k].replace(/[<>]/g, ''); });
    return data;
}
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

function defaultPortal() {
    return {
        company: 'Mi Empresa', tagline: 'Únete a nuestro equipo',
        intro: 'Estamos creciendo y buscamos talento como tú. Descubre nuestras vacantes abiertas y da el siguiente paso en tu carrera.',
        brandColor: '#5b8cff', accentColor: '#7c5cff', logo: null,
        showSalary: true, footer: '© Mi Empresa · Trabaja con nosotros',
    };
}
function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { try { state = JSON.parse(raw); } catch (e) { seedData(); } }
    else seedData();
    // Migraciones
    state.settings = state.settings || {};
    if (!state.settings.portal) state.settings.portal = defaultPortal();
    if (!state.settings.dna) state.settings.dna = defaultDNA();
    if (!state.settings.autonomy) state.settings.autonomy = {};
    state.proposals = state.proposals || [];
    state.dismissedKeys = state.dismissedKeys || [];
    state.agentLog = state.agentLog || [];
    (state.candidates || []).forEach(c => { if (!c.attachments) c.attachments = c.cv ? [c.cv] : []; if (!c.assess) c.assess = {}; });
}
function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Almacenamiento lleno: elimina algún CV grande para guardar', 'info'); }
}

/* ============================================================
   Datos demo
   ============================================================ */
function seedData() {
    const team = [
        { name: 'Ana Torres',   role: 'Recruiter Lead' },
        { name: 'Carlos Ruiz',  role: 'Hiring Manager' },
        { name: 'Marta Gómez',  role: 'Recruiter' },
        { name: 'Luis Fernández', role: 'Hiring Manager' },
    ];
    const templates = [
        { id: uid('tpl'), name: 'Acuse de recibo', subject: 'Hemos recibido tu candidatura', body: 'Hola {nombre},\n\nGracias por aplicar a la posición de {puesto}. Hemos recibido tu candidatura y la revisaremos en breve.\n\nUn saludo,\nEquipo de RRHH' },
        { id: uid('tpl'), name: 'Invitación a entrevista', subject: 'Te invitamos a una entrevista — {puesto}', body: 'Hola {nombre},\n\nNos ha gustado mucho tu perfil para {puesto}. Nos encantaría conocerte en una entrevista. ¿Qué disponibilidad tienes esta semana?\n\nUn saludo,\nEquipo de RRHH' },
        { id: uid('tpl'), name: 'Oferta de empleo', subject: '¡Enhorabuena! Oferta para {puesto}', body: 'Hola {nombre},\n\nTras el proceso de selección, es un placer ofrecerte incorporarte como {puesto}. Adjuntamos los detalles de la oferta.\n\nUn saludo,\nEquipo de RRHH' },
        { id: uid('tpl'), name: 'Rechazo cordial', subject: 'Sobre tu candidatura a {puesto}', body: 'Hola {nombre},\n\nGracias por tu interés en {puesto}. En esta ocasión hemos avanzado con otros perfiles, pero conservamos tu candidatura para futuras oportunidades.\n\nUn saludo,\nEquipo de RRHH' },
    ];
    const automations = [
        { id: uid('aut'), name: 'Email de acuse al aplicar', trigger: 'Nuevo candidato aplica por el portal', action: 'Enviar plantilla «Acuse de recibo»', enabled: true },
        { id: uid('aut'), name: 'Email al rechazar', trigger: 'Candidato pasa a etapa «Rechazado»', action: 'Enviar plantilla «Rechazo cordial»', enabled: true },
        { id: uid('aut'), name: 'Aviso de estancamiento', trigger: 'Candidato 7 días sin avanzar de etapa', action: 'Notificar al recruiter asignado', enabled: false },
        { id: uid('aut'), name: 'Recordatorio de scorecard', trigger: 'Entrevista realizada sin evaluación', action: 'Recordar al entrevistador rellenar scorecard', enabled: true },
    ];

    const jobs = [
        { id: uid('job'), title: 'Desarrollador/a Full Stack', dept: 'Tecnología', location: 'Madrid', type: 'Híbrido', status: 'open', salary: '38.000 - 48.000 €', created: '2026-04-10', openings: 2, priority: 'Alta', recruiter: 'Ana Torres', hiringManager: 'Carlos Ruiz', team: ['Ana Torres','Carlos Ruiz'], approver: 'Carlos Ruiz', description: 'Perfil con React y Node.js para nuestro producto SaaS. Trabajarás en equipo con producto y diseño.', ideal: { mustTags: ['React', 'Node'], belbin: ['CE', 'ID'], minPsico: 60 } },
        { id: uid('job'), title: 'Responsable de Marketing', dept: 'Marketing', location: 'Remoto', type: 'Remoto', status: 'open', salary: '42.000 - 52.000 €', created: '2026-05-02', openings: 1, priority: 'Media', recruiter: 'Marta Gómez', hiringManager: 'Luis Fernández', team: ['Marta Gómez','Luis Fernández'], approver: 'Luis Fernández', description: 'Estrategia de marca y demand generation. Liderazgo de un equipo de 3 personas.' },
        { id: uid('job'), title: 'Comercial B2B', dept: 'Ventas', location: 'Barcelona', type: 'Presencial', status: 'open', salary: '30.000 € + variable', created: '2026-05-20', openings: 3, priority: 'Alta', recruiter: 'Ana Torres', hiringManager: 'Luis Fernández', team: ['Ana Torres'], approver: 'Luis Fernández', description: 'Ciclo de venta consultiva a empresas medianas.', ideal: { mustTags: ['SaaS', 'B2B'], belbin: ['IS', 'IR'], minPsico: 50 } },
        { id: uid('job'), title: 'Contable Senior', dept: 'Finanzas', location: 'Valencia', type: 'Híbrido', status: 'paused', salary: '34.000 - 40.000 €', created: '2026-03-30', openings: 1, priority: 'Baja', recruiter: 'Marta Gómez', hiringManager: 'Carlos Ruiz', team: ['Marta Gómez'], approver: 'Carlos Ruiz', description: 'Cierre contable y reporting mensual.' },
        { id: uid('job'), title: 'Data Analyst', dept: 'Tecnología', location: 'Remoto', type: 'Remoto', status: 'pending', salary: '36.000 - 44.000 €', created: '2026-06-28', openings: 1, priority: 'Media', recruiter: 'Ana Torres', hiringManager: 'Carlos Ruiz', team: ['Ana Torres'], approver: 'Carlos Ruiz', description: 'Análisis de producto y dashboards de negocio.' },
        { id: uid('job'), title: 'Diseñador/a UX', dept: 'Producto', location: 'Madrid', type: 'Híbrido', status: 'draft', salary: '34.000 - 42.000 €', created: '2026-07-01', openings: 1, priority: 'Media', recruiter: 'Marta Gómez', hiringManager: 'Carlos Ruiz', team: [], approver: 'Carlos Ruiz', description: 'Diseño de experiencia para el producto SaaS.' },
    ];

    const mkScore = (interviewer, rec, comment, date) => ({
        id: uid('sc'), interviewer, recommendation: rec, date,
        criteria: SCORE_CRITERIA.map((n, i) => ({ name: n, score: 2 + ((n.length + i) % 4) })),
        comment,
    });

    const c = (name, email, jobIdx, stage, source, applied, gender, extra = {}) => ({
        id: uid('cand'), name, email, phone: '6' + String(10000000 + (name.length * 137) % 89999999),
        jobId: jobs[jobIdx].id, stage, source, applied, gender,
        location: ['Madrid','Barcelona','Valencia','Remoto','Sevilla'][name.length % 5],
        currentTitle: extra.title || '', currentCompany: extra.company || '',
        tags: extra.tags || [], rating: extra.rating || 0,
        scorecards: extra.scorecards || [], emails: extra.emails || [],
        interviews: extra.interviews || [], notes: extra.notes || [],
        offer: extra.offer || null, archived: !!extra.archived,
        assess: extra.assess || {},
        activities: [{ type: 'apply', text: 'Aplicó a la vacante', date: applied }],
        interviewDate: extra.interviewDate || null,
    });

    const candidates = [
        c('Laura Giménez', 'laura.gimenez@mail.com', 0, 'entrevista', 'LinkedIn', '2026-06-12', 'Mujer', {
            title: 'Full Stack Dev', company: 'Startup XYZ', tags: ['React','Node','5 años'], rating: 4,
            interviews: [{ id: uid('iv'), date: '2026-07-08', time: '10:00', type: 'Técnica', interviewer: 'Carlos Ruiz', mode: 'Videollamada' }],
            interviewDate: '2026-07-08',
            scorecards: [mkScore('Ana Torres', 'si', 'Buena comunicación y experiencia sólida en React.', '2026-06-20')],
        }),
        c('Marcos Ruiz', 'marcos.ruiz@mail.com', 0, 'preseleccion', 'Referido', '2026-06-15', 'Hombre', { tags: ['Vue','Python'], rating: 3 }),
        c('Aisha Ndiaye', 'aisha.ndiaye@mail.com', 0, 'prueba', 'Web empleo', '2026-06-05', 'Mujer', {
            title: 'Senior Engineer', company: 'BigCorp', tags: ['React','AWS','Senior'], rating: 5,
            interviews: [{ id: uid('iv'), date: '2026-07-10', time: '12:30', type: 'Técnica', interviewer: 'Carlos Ruiz', mode: 'Presencial' }],
            interviewDate: '2026-07-10',
            scorecards: [mkScore('Carlos Ruiz', 'sf', 'Nivel técnico excelente, encaja muy bien.', '2026-06-25'), mkScore('Ana Torres', 'si', 'Muy profesional.', '2026-06-26')],
            assess: { selfCompleted: '2026-06-24', selfReported: true,
                belbin: { CE: 9, ME: 7, ES: 6, CO: 4, CH: 5, IR: 3, IS: 5, ID: 7, FI: 6 },
                bigfive: { O: 85, C: 78, E: 55, A: 70, S: 72 }, disc: { D: 55, I: 45, S: 60, C: 80 },
                psycho: { verbal: 82, numerico: 90, logico: 85, abstracto: 88 },
                valuesFit: { 'Orientación al cliente': 4, 'Trabajo en equipo': 4, 'Excelencia': 5, 'Innovación': 5, 'Integridad': 4 } },
        }),
        c('Diego Ferrer', 'diego.ferrer@mail.com', 0, 'nuevo', 'Portal propio', '2026-07-01', 'Hombre', { tags: ['React','Node','Junior'], rating: 0 }),
        c('Iván Lozano', 'ivan.lozano@mail.com', 0, 'entrevista', 'LinkedIn', '2026-06-18', 'Hombre', {
            tags: ['TypeScript','GraphQL'], rating: 4, interviewDate: '2026-07-01',
            interviews: [{ id: uid('iv'), date: '2026-07-01', time: '16:00', type: 'RRHH', interviewer: 'Ana Torres', mode: 'Videollamada' }],
        }),
        c('Sofía Marín', 'sofia.marin@mail.com', 1, 'oferta', 'LinkedIn', '2026-05-10', 'Mujer', {
            title: 'Growth Lead', company: 'ScaleUp', tags: ['SEO','Growth','Team lead'], rating: 5,
            offer: { salary: '50.000 €', startDate: '2026-08-01', status: 'sent', date: '2026-06-28' },
            scorecards: [mkScore('Luis Fernández', 'sf', 'Perfil de liderazgo excelente.', '2026-06-15')],
        }),
        c('Pablo Herrera', 'pablo.herrera@mail.com', 1, 'entrevista', 'Agencia', '2026-06-01', 'Hombre', { tags: ['Content','Ads'], rating: 4, interviewDate: '2026-07-11', interviews: [{ id: uid('iv'), date: '2026-07-11', time: '11:00', type: 'Manager', interviewer: 'Luis Fernández', mode: 'Videollamada' }] }),
        c('Nadia Costa', 'nadia.costa@mail.com', 1, 'nuevo', 'Evento', '2026-07-02', 'Mujer', { tags: ['Branding'], rating: 0 }),
        c('Javier Ortí', 'javier.orti@mail.com', 2, 'contratado', 'Referido', '2026-04-15', 'Hombre', {
            title: 'Account Executive', company: 'SalesCo', tags: ['SaaS','Closer'], rating: 5,
            offer: { salary: '32.000 € + variable', startDate: '2026-06-01', status: 'accepted', date: '2026-05-10' },
            scorecards: [mkScore('Ana Torres', 'sf', 'Cerrador nato, gran actitud.', '2026-04-28')],
            assess: { belbin: { CE: 3, ME: 4, ES: 2, CO: 5, CH: 4, IR: 8, IS: 9, ID: 5, FI: 4 }, psycho: { verbal: 70, numerico: 65, logico: 60, abstracto: 55 } },
        }),
        c('Elena Vidal', 'elena.vidal@mail.com', 2, 'preseleccion', 'Referido', '2026-06-10', 'Mujer', { title: 'SDR', company: 'LeadGen', tags: ['Hunter','CRM','B2B'], rating: 3,
            assess: { belbin: { CE: 3, ME: 4, ES: 3, CO: 8, CH: 7, IR: 6, IS: 4, ID: 5, FI: 6 }, psycho: { verbal: 75, numerico: 60, logico: 65, abstracto: 58 } } }),
        c('Óscar Peña', 'oscar.pena@mail.com', 2, 'rechazado', 'Web empleo', '2026-05-25', 'Hombre', { tags: ['Retail'], rating: 2, notes: [{ text: 'Poca experiencia en venta consultiva.', date: '2026-06-05', author: 'Ana Torres' }] }),
        c('Marta Soler', 'marta.soler@mail.com', 3, 'nuevo', 'Web empleo', '2026-06-20', 'Mujer', { tags: ['SAP','Excel'], rating: 0 }),
        c('Andrés Gil', 'andres.gil@mail.com', 2, 'contratado', 'LinkedIn', '2026-03-20', 'Hombre', {
            tags: ['B2B','SaaS'], rating: 4,
            offer: { salary: '31.000 € + variable', startDate: '2026-05-02', status: 'accepted', date: '2026-04-12' },
            assess: { belbin: { CE: 4, ME: 5, ES: 3, CO: 4, CH: 5, IR: 5, IS: 6, ID: 9, FI: 8 } },
        }),
        // Talent pool (archivados / CRM)
        c('Carmen Ríos', 'carmen.rios@mail.com', 0, 'rechazado', 'LinkedIn', '2026-02-10', 'Mujer', { title: 'Frontend Dev', company: 'WebStudio', tags: ['React','Junior'], rating: 3, archived: true }),
        c('Tomás Vega', 'tomas.vega@mail.com', 1, 'rechazado', 'Evento', '2026-01-22', 'Hombre', { title: 'Marketing Manager', company: 'BrandCo', tags: ['SEM','Email'], rating: 4, archived: true }),
    ];

    state = { jobs, candidates, templates, automations, team, settings: { company: 'Mi Empresa', portal: defaultPortal() } };
    save();
}

/* ============================================================
   Router
   ============================================================ */
const content = document.getElementById('content');
const VIEWS = {
    dashboard: renderDashboard, inbox: renderInbox, jobs: renderJobs, pipeline: renderPipeline,
    candidates: renderCandidates, crm: renderCRM, interviews: renderInterviews,
    offers: renderOffers, reports: renderReports, culture: renderCulture, careers: renderCareers, automation: renderAutomation,
};
function render() {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === currentView));
    (VIEWS[currentView] || renderDashboard)();
}

/* ---------- helpers de datos ---------- */
function activeCandidates() { return state.candidates.filter(c => !c.archived); }
function candScore(c) {
    if (c.scorecards && c.scorecards.length) {
        const all = c.scorecards.flatMap(s => s.criteria.map(x => x.score));
        return all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10 : (c.rating || 0);
    }
    return c.rating || 0;
}
function jobById(id) { return state.jobs.find(j => j.id === id); }

/* ============================================================
   Dashboard
   ============================================================ */
function renderDashboard() {
    const cs = activeCandidates();
    const openJobs = state.jobs.filter(j => j.status === 'open').length;
    const pending = state.jobs.filter(j => j.status === 'pending').length;
    const total = cs.length;
    const hired = cs.filter(c => c.stage === 'contratado').length;
    const active = cs.filter(c => !['contratado','rechazado'].includes(c.stage)).length;
    const conv = total ? Math.round((hired / total) * 100) : 0;
    const tth = avgTimeToHire();
    const interviews = cs.filter(c => c.stage === 'entrevista' || c.stage === 'prueba').length;

    const funnel = STAGES.filter(s => s.id !== 'rechazado').map(s => ({ ...s, count: cs.filter(c => c.stage === s.id).length }));
    const maxF = Math.max(1, ...funnel.map(f => f.count));
    const feed = globalActivity().slice(0, 7);

    content.innerHTML = `
        <div class="page-head"><div><h1>Panel de control</h1><p>Visión general del proceso de selección</p></div></div>
        <div class="kpi-grid">
            <div class="kpi k1"><div class="kpi-label">Requisiciones abiertas</div><div class="kpi-value">${openJobs}</div><div class="kpi-sub">${pending} pendientes de aprobar</div></div>
            <div class="kpi k2"><div class="kpi-label">Candidatos activos</div><div class="kpi-value">${active}</div><div class="kpi-sub">${total} en proceso</div></div>
            <div class="kpi k3"><div class="kpi-label">Entrevistas en curso</div><div class="kpi-value">${interviews}</div><div class="kpi-sub">esta semana</div></div>
            <div class="kpi k4"><div class="kpi-label">Contrataciones</div><div class="kpi-value">${hired}</div><div class="kpi-sub">conversión ${conv}%</div></div>
            <div class="kpi k1"><div class="kpi-label">Time to hire</div><div class="kpi-value">${tth || '—'}<span style="font-size:14px"> días</span></div><div class="kpi-sub">media histórica</div></div>
        </div>
        ${copilotPanel()}
        <div class="grid-2">
            <div class="panel">
                <h3>📈 Embudo de selección</h3>
                ${funnel.map(f => `
                    <div class="funnel-row">
                        <span class="funnel-label">${f.name}</span>
                        <div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${(f.count / maxF) * 100}%;background:${f.color}"></div></div>
                        <span class="funnel-count">${f.count}</span>
                    </div>`).join('')}
                <div style="margin-top:16px" class="cd-section-title">Diversidad de género (candidatos activos)</div>
                ${genderBars(cs)}
            </div>
            <div class="panel">
                <h3>🕑 Actividad reciente</h3>
                <div class="timeline">
                    ${feed.length ? feed.map(a => `
                        <div class="tl-item">
                            <span class="tl-dot" style="background:${a.color}"></span>
                            <div><div class="tl-text">${a.text}</div><div class="tl-meta">${a.who ? a.who + ' · ' : ''}${a.date}</div></div>
                        </div>`).join('') : '<p style="color:var(--muted);font-size:13px">Sin actividad.</p>'}
                </div>
            </div>
        </div>`;
}

function copilotPanel() {
    agentTick();
    const pending = (state.proposals || []).filter(p => p.status === 'pending' && p.level !== 'L1');
    const autoToday = (state.proposals || []).filter(p => p.status === 'auto' && p.executed === todayISO()).length;
    if (!pending.length && !autoToday) return '';
    return `<div class="panel" style="margin-bottom:16px">
        <h3>🤖 Agente de selección
            ${pending.length ? `<span class="badge paused">${pending.length} esperando tu aprobación</span>` : ''}
            ${autoToday ? `<span class="badge open">${autoToday} ejecutadas hoy en autonomía</span>` : ''}
        </h3>
        ${pending.slice(0, 3).map(p => `
            <div class="insight-row ${p.type === 'reject' ? 'crit' : 'warn'}">
                <span class="insight-ico">${autoTypeById(p.type).icon}</span>
                <div class="insight-text"><strong>${p.title}</strong><div class="cc-role">${p.reason}</div></div>
                <button class="btn-primary btn-sm" onclick="approveProposal('${p.id}')">Aprobar</button>
            </div>`).join('')}
        <button class="btn-outline btn-sm" style="margin-top:8px" onclick="goView('inbox')">📥 Abrir bandeja de decisiones${pending.length > 3 ? ` (${pending.length - 3} más)` : ''}</button>
    </div>`;
}

/* ============================================================
   Bandeja de decisiones — la pantalla principal del ATS autónomo
   ============================================================ */
function renderInbox() {
    agentTick();
    const props = state.proposals || [];
    const validC = p => !p.candidateId || state.candidates.some(c => c.id === p.candidateId);
    const pending = props.filter(p => p.status === 'pending' && p.level === 'L2' && validC(p));
    const avisos = props.filter(p => p.status === 'pending' && p.level === 'L1' && validC(p));
    const done = props.filter(p => ['auto', 'executed'].includes(p.status)).slice(0, 10);
    const card = (p, isAviso) => {
        const t = autoTypeById(p.type);
        return `<div class="prop-card ${t.adverse ? 'adverse' : ''}">
            <div class="prop-head">
                <span class="insight-ico">${t.icon}</span>
                <div style="flex:1;min-width:0"><strong>${p.title}</strong>
                    <div class="prop-reason">${p.reason}</div></div>
                <span class="conf-badge" title="Confianza del agente">${p.confidence || 70}%</span>
            </div>
            ${p.email ? `<details class="prop-email"><summary>✉️ Ver borrador preparado — «${p.email.subject}»</summary><div class="email-body">${p.email.body.replace(/\n/g, '<br>')}</div></details>` : ''}
            <div class="prop-actions">
                ${t.adverse ? '<span class="lock-note">🔒 Acción adversa: requiere humano</span>' : ''}
                ${p.candidateId ? `<button class="btn-outline btn-sm" onclick="openCandidate('${p.candidateId}')">Ver ficha</button>` : ''}
                <button class="btn-outline btn-sm" onclick="dismissProposal('${p.id}')">Descartar</button>
                ${!isAviso && p.email ? `<button class="btn-outline btn-sm" onclick="editProposal('${p.id}')">✎ Editar</button>` : ''}
                ${!isAviso ? `<button class="btn-primary btn-sm" onclick="approveProposal('${p.id}')">✓ Aprobar</button>` : ''}
            </div>
        </div>`;
    };
    content.innerHTML = `
        <div class="page-head">
            <div><h1>📥 Bandeja de decisiones</h1><p>El agente trabaja; tú decides. Configura su autonomía en «Automatización».</p></div>
            <button class="btn-outline" onclick="goView('automation')">⚙ Niveles de autonomía</button>
        </div>
        <div class="kpi-grid">
            <div class="kpi k3"><div class="kpi-label">Esperando tu aprobación</div><div class="kpi-value">${pending.length}</div><div class="kpi-sub">acciones preparadas (L2)</div></div>
            <div class="kpi k2"><div class="kpi-label">Ejecutadas en autonomía</div><div class="kpi-value">${props.filter(p => p.status === 'auto').length}</div><div class="kpi-sub">nivel L3, con deshacer</div></div>
            <div class="kpi k1"><div class="kpi-label">Aprobadas por ti</div><div class="kpi-value">${props.filter(p => p.status === 'executed').length}</div><div class="kpi-sub">histórico</div></div>
            <div class="kpi k4"><div class="kpi-label">Acciones adversas</div><div class="kpi-value">🔒 L2</div><div class="kpi-sub">siempre con humano (AI Act)</div></div>
        </div>
        ${pending.length ? `<div class="cd-section-title" style="margin-top:0">Pendientes de tu aprobación</div>${pending.map(p => card(p, false)).join('')}` : '<div class="empty" style="padding:30px"><span class="emoji">✅</span><h3>Bandeja limpia</h3><p>El agente no tiene propuestas pendientes ahora mismo.</p></div>'}
        ${avisos.length ? `<div class="cd-section-title">Avisos (nivel L1 · solo información)</div>${avisos.map(p => card(p, true)).join('')}` : ''}
        ${done.length ? `<div class="cd-section-title">Registro del agente</div>${done.map(p => `
            <div class="prop-card done">
                <div class="prop-head"><span class="insight-ico">${autoTypeById(p.type).icon}</span>
                <div style="flex:1"><strong>${p.title}</strong><div class="prop-reason">${p.status === 'auto' ? '⚡ Ejecutada automáticamente (L3)' : '✓ Aprobada por ti'} · ${p.executed}</div></div>
                ${p.undo && !p.noUndo ? `<button class="btn-outline btn-sm" onclick="undoProposal('${p.id}')">↩ Deshacer</button>` : ''}</div>
            </div>`).join('')}` : ''}`;
}
function goView(v) { currentView = v; render(); }

function genderBars(cs) {
    const counts = {};
    cs.forEach(c => { const g = c.gender || 'Prefiere no decir'; counts[g] = (counts[g] || 0) + 1; });
    const total = cs.length || 1;
    const cols = { 'Mujer': '#e879f9', 'Hombre': '#5b8cff', 'No binario': '#22c1c3', 'Prefiere no decir': '#6b7699' };
    return `<div class="stackbar">${Object.entries(counts).map(([g, n]) => `<span title="${g}: ${n}" style="width:${(n / total) * 100}%;background:${cols[g] || '#6b7699'}"></span>`).join('')}</div>
        <div class="legend">${Object.entries(counts).map(([g, n]) => `<span><i style="background:${cols[g] || '#6b7699'}"></i>${g} (${n})</span>`).join('')}</div>`;
}

function globalActivity() {
    const feed = [];
    state.candidates.forEach(c => (c.activities || []).forEach(a => {
        const stageColors = { apply: '#5b8cff', stage: '#7c5cff', score: '#ffb547', email: '#22c1c3', offer: '#2fce8a', hire: '#16a34a', reject: '#ff5f6d' };
        feed.push({ text: `<strong>${c.name}</strong> — ${a.text}`, date: a.date, who: a.who, color: stageColors[a.type] || '#5b8cff' });
    }));
    return feed.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function avgTimeToHire() {
    const hired = state.candidates.filter(c => c.stage === 'contratado' && c.offer && c.offer.date && c.applied);
    if (!hired.length) return null;
    const days = hired.map(c => Math.max(0, daysBetween(c.applied, c.offer.date)));
    return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
}

/* ============================================================
   Requisiciones (Jobs) con flujo de aprobación
   ============================================================ */
const JOB_STATUS = {
    draft:   { label: 'Borrador',   cls: 'draft' },
    pending: { label: 'Pdte. aprobación', cls: 'paused' },
    open:    { label: 'Abierta',    cls: 'open' },
    paused:  { label: 'En pausa',   cls: 'paused' },
    closed:  { label: 'Cerrada',    cls: 'closed' },
};
function renderJobs() {
    const jobs = state.jobs.filter(j => matchSearch(j.title + j.dept + j.location + (j.recruiter || '')));
    content.innerHTML = `
        <div class="page-head">
            <div><h1>Requisiciones</h1><p>${state.jobs.length} puestos · flujo de aprobación tipo Greenhouse</p></div>
            <button class="btn-primary" onclick="openJobForm()">＋ Nueva requisición</button>
        </div>
        ${jobs.length ? `
        <div class="table-wrap"><table>
            <thead><tr><th>Puesto</th><th>Depto.</th><th>Prioridad</th><th>Equipo</th><th>Vacantes</th><th>Candidatos</th><th>Estado</th><th></th></tr></thead>
            <tbody>${jobs.map(j => {
                const count = activeCandidates().filter(c => c.jobId === j.id).length;
                const st = JOB_STATUS[j.status] || JOB_STATUS.open;
                const prio = { 'Alta': 'red', 'Media': 'paused', 'Baja': 'dept' }[j.priority] || 'dept';
                return `<tr class="row-click" onclick="openJobDetail('${j.id}')">
                    <td><strong>${j.title}</strong><br><span style="color:var(--muted);font-size:11px">${j.location} · ${j.type} · ${j.salary || ''}</span></td>
                    <td><span class="badge dept">${j.dept}</span></td>
                    <td><span class="badge ${prio}">${j.priority || '—'}</span></td>
                    <td>${j.recruiter || '—'}</td>
                    <td>${j.openings || 1}</td>
                    <td>${count}</td>
                    <td><span class="badge ${st.cls}">${st.label}</span></td>
                    <td onclick="event.stopPropagation()">${j.status === 'pending' ? `<button class="btn-primary btn-sm" onclick="approveJob('${j.id}')">Aprobar</button>` : `<button class="btn-outline btn-sm" onclick="openJobForm('${j.id}')">Editar</button>`}</td>
                </tr>`;
            }).join('')}</tbody>
        </table></div>` : emptyState('💼', 'Sin requisiciones', 'Crea tu primera requisición para empezar.')}`;
}

function approveJob(id) {
    const j = jobById(id); if (!j) return;
    j.status = 'open'; save();
    toast(`Requisición «${j.title}» aprobada y abierta`, 'ok'); render();
}

function openJobDetail(id) {
    const j = jobById(id); if (!j) return;
    const cands = activeCandidates().filter(c => c.jobId === id);
    const st = JOB_STATUS[j.status] || JOB_STATUS.open;
    const byStage = STAGES.map(s => ({ s, n: cands.filter(c => c.stage === s.id).length })).filter(x => x.n);
    openModal(`
        <h2>${j.title}</h2>
        <div class="modal-sub"><span class="badge dept">${j.dept}</span> · ${j.location} · ${j.type} · <span class="badge ${st.cls}">${st.label}</span></div>
        <div class="cd-info-grid">
            <div class="cd-info-item"><div class="lbl">Salario</div><div class="val">${j.salary || '—'}</div></div>
            <div class="cd-info-item"><div class="lbl">Vacantes</div><div class="val">${j.openings || 1}</div></div>
            <div class="cd-info-item"><div class="lbl">Recruiter</div><div class="val">${j.recruiter || '—'}</div></div>
            <div class="cd-info-item"><div class="lbl">Hiring Manager</div><div class="val">${j.hiringManager || '—'}</div></div>
            <div class="cd-info-item"><div class="lbl">Prioridad</div><div class="val">${j.priority || '—'}</div></div>
            <div class="cd-info-item"><div class="lbl">Publicada</div><div class="val">${j.created || '—'}</div></div>
        </div>
        <div class="cd-section-title">Equipo de contratación</div>
        <div>${(j.team || []).length ? j.team.map(t => `<span class="tag">${t}</span>`).join('') : '<span style="color:var(--muted);font-size:13px">Sin asignar</span>'}</div>
        <div class="cd-section-title">Descripción</div>
        <p style="font-size:13px;color:var(--muted);line-height:1.6">${j.description || 'Sin descripción.'}</p>
        <div class="cd-section-title">Pipeline (${cands.length} candidatos)</div>
        <div class="minibars">${byStage.length ? byStage.map(x => `<div class="minibar"><span class="dot" style="background:${x.s.color}"></span>${x.s.name}<b>${x.n}</b></div>`).join('') : '<span style="color:var(--muted);font-size:13px">Sin candidatos.</span>'}</div>
        ${jobMatchSection(j, cands)}
        ${teamBalanceSection(j)}
        <div class="modal-actions">
            ${j.status === 'pending' ? `<button class="btn-primary" onclick="approveJob('${j.id}')">✓ Aprobar requisición</button>` : ''}
            <button class="btn-primary btn-danger" onclick="deleteJob('${j.id}')">Eliminar</button>
            <button class="btn-outline" onclick="openJobForm('${j.id}')">Editar</button>
        </div>`);
}

function jobMatchSection(j, cands) {
    if (!j.ideal) return `<div class="cd-section-title">Job-Match</div><p style="font-size:12px;color:var(--muted)">Define el <strong>perfil ideal</strong> (editar requisición) para rankear candidatos automáticamente por encaje con el puesto.</p>`;
    const ranked = cands.filter(c => !['rechazado'].includes(c.stage))
        .map(c => ({ c, m: jobMatch(c, j) })).filter(x => x.m != null).sort((a, b) => b.m - a.m);
    return `<div class="cd-section-title">🎯 Job-Match — ranking por encaje con el perfil ideal</div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:8px">Perfil: ${(j.ideal.mustTags || []).map(t => `<span class="tag">${t}</span>`).join('')} ${(j.ideal.belbin || []).map(r => `<span class="tag" style="color:${belbinById(r).color}">${belbinById(r).name}</span>`).join('')} ${j.ideal.minPsico ? `<span class="tag">psico ≥ ${j.ideal.minPsico}</span>` : ''}</p>
        ${ranked.length ? ranked.map(({ c, m }) => `
            <div class="fit-row" onclick="openCandidate('${c.id}','evaluacion')">
                <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
                <div style="flex:1;min-width:0"><div class="cc-name">${c.name}</div><div class="cc-role">${stageById(c.stage).name}${topBelbin(c) ? ' · ' + topBelbin(c)[0].r.name : ''}</div></div>
                <div class="fit-badge" style="background:${fitColor(m)}22;color:${fitColor(m)}">${m}%</div>
            </div>`).join('') : '<p style="font-size:13px;color:var(--muted)">Aún no hay candidatos evaluables (necesitan test o etiquetas).</p>'}`;
}

function teamBalanceSection(j) {
    const { hired, covered, missing, fillers } = teamBelbinAnalysis(j.id);
    if (!hired.length) return '';
    const clusters = ['Mental', 'Social', 'Acción'];
    return `<div class="cd-section-title">🧩 Equilibrio del equipo (Belbin)</div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:8px">Basado en ${hired.length} contratado(s) con perfil. Un equipo equilibrado cubre los 3 clústeres.</p>
        <div class="cluster-row">${clusters.map(cl => {
            const roles = BELBIN_ROLES.filter(r => r.cluster === cl);
            const cov = roles.filter(r => covered.has(r.id)).length;
            return `<div class="cluster-box"><div class="cluster-name">${cl}</div><div class="cluster-cov" style="color:${cov ? 'var(--green)' : 'var(--red)'}">${cov}/${roles.length}</div>
                <div>${roles.map(r => `<span class="dot" title="${r.name}${covered.has(r.id) ? ' ✓' : ' (sin cubrir)'}" style="background:${covered.has(r.id) ? r.color : 'var(--border)'};width:10px;height:10px;margin-right:4px"></span>`).join('')}</div></div>`;
        }).join('')}</div>
        ${fillers.length ? `<p style="font-size:12px;color:var(--muted);margin:10px 0 6px"><strong style="color:var(--text)">💡 Candidatos del pipeline que cubren huecos:</strong></p>
            ${fillers.slice(0, 3).map(({ c, top }) => `<div class="fit-row" onclick="openCandidate('${c.id}','evaluacion')">
                <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
                <div style="flex:1"><div class="cc-name">${c.name}</div><div class="cc-role">Aportaría el rol <strong style="color:${top.color}">${top.name}</strong>, hoy sin cubrir</div></div>
            </div>`).join('')}` : (missing.length ? `<p style="font-size:12px;color:var(--muted);margin-top:8px">Roles sin cubrir: ${missing.slice(0, 4).map(r => r.name).join(', ')}${missing.length > 4 ? '…' : ''}. Nadie en el pipeline los aporta aún.</p>` : '<p style="font-size:12px;color:var(--green);margin-top:8px">✓ Equipo equilibrado: todos los roles cubiertos.</p>')}`;
}

function openJobForm(id) {
    const j = id ? jobById(id) : null;
    const opt = (v, cur) => `<option ${v === cur ? 'selected' : ''}>${v}</option>`;
    const teamOpts = state.team.map(t => t.name);
    openModal(`
        <h2>${j ? 'Editar' : 'Nueva'} requisición</h2>
        <div class="modal-sub">Define el puesto y su equipo de contratación.</div>
        <form id="jobForm">
            <div class="form-grid">
                <div class="field full"><label>Título del puesto *</label><input name="title" required value="${j?.title || ''}"></div>
                <div class="field"><label>Departamento</label><input name="dept" value="${j?.dept || ''}"></div>
                <div class="field"><label>Ubicación</label><input name="location" value="${j?.location || ''}"></div>
                <div class="field"><label>Modalidad</label><select name="type">${['Presencial','Híbrido','Remoto'].map(t => opt(t, j?.type || 'Híbrido')).join('')}</select></div>
                <div class="field"><label>Prioridad</label><select name="priority">${['Alta','Media','Baja'].map(t => opt(t, j?.priority || 'Media')).join('')}</select></div>
                <div class="field"><label>Nº de vacantes</label><input name="openings" type="number" min="1" value="${j?.openings || 1}"></div>
                <div class="field"><label>Estado</label><select name="status">
                    ${Object.entries(JOB_STATUS).map(([k, v]) => `<option value="${k}" ${(j?.status || 'draft') === k ? 'selected' : ''}>${v.label}</option>`).join('')}
                </select></div>
                <div class="field"><label>Recruiter</label><select name="recruiter"><option value="">—</option>${teamOpts.map(t => `<option ${j?.recruiter === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
                <div class="field"><label>Hiring Manager</label><select name="hiringManager"><option value="">—</option>${teamOpts.map(t => `<option ${j?.hiringManager === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
                <div class="field full"><label>Rango salarial</label><input name="salary" value="${j?.salary || ''}" placeholder="Ej: 35.000 - 45.000 €"></div>
                <div class="field full"><label>Descripción</label><textarea name="description">${j?.description || ''}</textarea></div>
                <div class="field full" style="border-top:1px solid var(--border);padding-top:14px"><label style="font-weight:700;color:var(--text)">🎯 Perfil ideal (para el Job-Match automático)</label></div>
                <div class="field full"><label>Habilidades imprescindibles (comas)</label><input name="mustTags" value="${(j?.ideal?.mustTags || []).join(', ')}" placeholder="Ej: React, Node, inglés"></div>
                <div class="field"><label>Percentil psicotécnico mínimo</label><input name="minPsico" type="number" min="0" max="100" value="${j?.ideal?.minPsico || ''}" placeholder="Ej: 60"></div>
                <div class="field full"><label>Roles Belbin buscados</label>
                    <div class="chk-row">${BELBIN_ROLES.map(r => `<label class="chk"><input type="checkbox" name="idealBelbin" value="${r.id}" ${(j?.ideal?.belbin || []).includes(r.id) ? 'checked' : ''}><span style="--rc:${r.color}">${r.name}</span></label>`).join('')}</div>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn-primary">${j ? 'Guardar' : 'Crear'}</button>
            </div>
        </form>`);
    document.getElementById('jobForm').addEventListener('submit', e => {
        e.preventDefault();
        const data = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        data.openings = +data.openings || 1;
        // Perfil ideal para el Job-Match
        const idealBelbin = [...e.target.querySelectorAll('input[name="idealBelbin"]:checked')].map(x => x.value);
        const mustTags = (data.mustTags || '').split(',').map(t => t.trim()).filter(Boolean);
        const minPsico = +data.minPsico || 0;
        data.ideal = (idealBelbin.length || mustTags.length || minPsico) ? { belbin: idealBelbin, mustTags, minPsico } : null;
        delete data.mustTags; delete data.minPsico; delete data.idealBelbin;
        if (j) { Object.assign(j, data); toast('Requisición actualizada', 'ok'); }
        else {
            data.team = [data.recruiter, data.hiringManager].filter(Boolean);
            state.jobs.unshift({ id: uid('job'), created: todayISO(), team: data.team, ...data });
            toast(data.status === 'pending' ? 'Requisición creada — pendiente de aprobación' : 'Requisición creada', 'ok');
        }
        save(); closeModal(); render();
    });
}

function deleteJob(id) {
    const linked = state.candidates.filter(c => c.jobId === id).length;
    if (!confirm(`¿Eliminar esta requisición?${linked ? ` ${linked} candidato(s) quedarán sin vacante.` : ''}`)) return;
    state.jobs = state.jobs.filter(j => j.id !== id);
    state.candidates.forEach(c => { if (c.jobId === id) c.jobId = null; });
    save(); closeModal(); toast('Requisición eliminada', 'info'); render();
}

/* ============================================================
   Pipeline (Kanban)
   ============================================================ */
function renderPipeline() {
    const jobFilter = window._pipelineJob || 'all';
    content.innerHTML = `
        <div class="page-head">
            <div><h1>Pipeline</h1><p>Arrastra los candidatos entre etapas</p></div>
            <button class="btn-primary" onclick="openCandidateForm()">＋ Añadir candidato</button>
        </div>
        <div class="filters">
            <select id="pipeJobFilter"><option value="all">Todas las requisiciones</option>
                ${state.jobs.map(j => `<option value="${j.id}" ${jobFilter === j.id ? 'selected' : ''}>${j.title}</option>`).join('')}
            </select>
        </div>
        <div class="board">
            ${STAGES.map(s => {
                const cards = activeCandidates().filter(c => c.stage === s.id && (jobFilter === 'all' || c.jobId === jobFilter) && matchSearch(c.name + c.email));
                return `<div class="column">
                    <div class="column-head"><span class="col-title"><span class="dot" style="background:${s.color}"></span>${s.name}</span><span class="col-count">${cards.length}</span></div>
                    <div class="column-body" data-stage="${s.id}">${cards.map(cardHTML).join('')}</div>
                </div>`;
            }).join('')}
        </div>`;
    document.getElementById('pipeJobFilter').addEventListener('change', e => { window._pipelineJob = e.target.value; renderPipeline(); });
    setupDnD();
}

function cardHTML(c) {
    const job = jobById(c.jobId);
    const sc = candScore(c);
    return `<div class="cand-card" draggable="true" data-id="${c.id}" onclick="openCandidate('${c.id}')">
        <div class="cc-top"><div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
        <div><div class="cc-name">${c.name}</div><div class="cc-role">${job ? job.title : 'Sin vacante'}</div></div></div>
        <div>${(c.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="cc-meta" style="margin-top:8px">
            <span class="scorechip" title="Puntuación media">${sc ? '★ ' + sc : '—'}</span>
            <span>${c.source || ''}${c.scorecards && c.scorecards.length ? ' · ' + c.scorecards.length + '📋' : ''}</span>
        </div>
    </div>`;
}

function setupDnD() {
    let dragId = null;
    document.querySelectorAll('.cand-card[draggable]').forEach(card => {
        card.addEventListener('dragstart', e => { dragId = card.dataset.id; card.classList.add('dragging'); e.stopPropagation(); });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });
    document.querySelectorAll('.column-body').forEach(col => {
        col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', e => {
            e.preventDefault(); col.classList.remove('drag-over');
            moveStage(dragId, col.dataset.stage, () => renderPipeline());
        });
    });
}

function moveStage(id, stage, cb) {
    const c = state.candidates.find(x => x.id === id);
    if (!c || c.stage === stage) return;
    const from = stageById(c.stage).name;
    c.stage = stage;
    logActivity(c, stage === 'contratado' ? 'hire' : stage === 'rechazado' ? 'reject' : 'stage', `Movido de ${from} a ${stageById(stage).name}`);
    // Automatización: email al rechazar
    if (stage === 'rechazado' && autoEnabled('Email al rechazar')) {
        sendEmailFromTemplate(c, 'Rechazo cordial', true);
    }
    save(); toast(`${c.name} → ${stageById(stage).name}`, 'ok'); if (cb) cb();
}

/* ============================================================
   Candidatos (tabla + selección múltiple + filtros)
   ============================================================ */
function renderCandidates() {
    const stageF = window._candStage || 'all';
    const jobF = window._candJob || 'all';
    const srcF = window._candSource || 'all';
    const list = activeCandidates().filter(c =>
        (stageF === 'all' || c.stage === stageF) &&
        (jobF === 'all' || c.jobId === jobF) &&
        (srcF === 'all' || c.source === srcF) &&
        matchSearch(c.name + c.email + (c.tags || []).join('')));
    content.innerHTML = `
        <div class="page-head">
            <div><h1>Candidatos</h1><p>${activeCandidates().length} activos en la base de datos</p></div>
            <div style="display:flex;gap:10px">
                <button class="btn-outline" onclick="importCSV()">⭱ Importar CSV</button>
                <button class="btn-outline" onclick="exportCandidatesCSV()">⭳ Exportar CSV</button>
                <button class="btn-primary" onclick="openCandidateForm()">＋ Añadir</button>
            </div>
        </div>
        <div class="filters">
            <select id="fStage"><option value="all">Todas las etapas</option>${STAGES.map(s => `<option value="${s.id}" ${stageF === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
            <select id="fJob"><option value="all">Todas las vacantes</option>${state.jobs.map(j => `<option value="${j.id}" ${jobF === j.id ? 'selected' : ''}>${j.title}</option>`).join('')}</select>
            <select id="fSource"><option value="all">Todos los orígenes</option>${SOURCES.map(s => `<option ${srcF === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
        <div id="bulkbar" class="bulkbar" style="display:none">
            <span id="bulkcount"></span>
            <select id="bulkStage"><option value="">Mover a etapa…</option>${STAGES.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
            <button class="btn-primary btn-sm" id="cmpBtn" onclick="openCompare()">⚖ Comparar</button>
            <button class="btn-outline btn-sm" onclick="bulkArchive()">Archivar en CRM</button>
            <button class="btn-outline btn-sm" onclick="clearSel()">Cancelar</button>
        </div>
        ${list.length ? `
        <div class="table-wrap"><table>
            <thead><tr><th style="width:34px"></th><th>Candidato</th><th>Vacante</th><th>Etapa</th><th>Score</th><th>Origen</th><th>Aplicó</th></tr></thead>
            <tbody>${list.map(c => {
                const job = jobById(c.jobId); const st = stageById(c.stage); const sc = candScore(c);
                return `<tr class="row-click">
                    <td onclick="event.stopPropagation()"><input type="checkbox" class="selbox" data-id="${c.id}" ${sel.has(c.id) ? 'checked' : ''}></td>
                    <td onclick="openCandidate('${c.id}')"><div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div><div><strong>${c.name}${attCount(c) ? ` <span title="${attCount(c)} documento(s)">📎</span>` : ''}</strong><br><span style="color:var(--muted);font-size:11px">${c.email}</span></div></div></td>
                    <td onclick="openCandidate('${c.id}')">${job ? job.title : '—'}</td>
                    <td onclick="openCandidate('${c.id}')"><span class="badge" style="background:${st.color}22;color:${st.color}">${st.name}</span></td>
                    <td onclick="openCandidate('${c.id}')"><span class="scorechip">${sc ? '★ ' + sc : '—'}</span></td>
                    <td onclick="openCandidate('${c.id}')">${c.source || '—'}</td>
                    <td onclick="openCandidate('${c.id}')">${c.applied || '—'}</td>
                </tr>`;
            }).join('')}</tbody>
        </table></div>` : emptyState('👥', 'Sin candidatos', 'Ajusta los filtros o añade candidatos.')}`;
    ['fStage','fJob','fSource'].forEach((idn, i) => {
        const key = ['_candStage','_candJob','_candSource'][i];
        document.getElementById(idn).addEventListener('change', e => { window[key] = e.target.value; renderCandidates(); });
    });
    document.querySelectorAll('.selbox').forEach(b => b.addEventListener('change', () => {
        b.checked ? sel.add(b.dataset.id) : sel.delete(b.dataset.id); updateBulkbar();
    }));
    document.getElementById('bulkStage').addEventListener('change', e => { if (e.target.value) bulkMove(e.target.value); });
    updateBulkbar();
}
function updateBulkbar() {
    const bar = document.getElementById('bulkbar'); if (!bar) return;
    bar.style.display = sel.size ? 'flex' : 'none';
    const cc = document.getElementById('bulkcount'); if (cc) cc.textContent = `${sel.size} seleccionado(s)`;
    const cb = document.getElementById('cmpBtn'); if (cb) { cb.disabled = sel.size < 2 || sel.size > 3; cb.title = 'Selecciona 2 o 3 candidatos'; }
}

/* ---------- Comparador de candidatos (2–3 lado a lado) ---------- */
function openCompare() {
    const list = [...sel].map(id => state.candidates.find(c => c.id === id)).filter(Boolean).slice(0, 3);
    if (list.length < 2) { toast('Selecciona 2 o 3 candidatos para comparar', 'info'); return; }
    const row = (label, fn) => `<tr><td class="cmp-label">${label}</td>${list.map(c => `<td>${fn(c)}</td>`).join('')}</tr>`;
    const miniBar = (v, color) => v == null ? '—' : `<div class="cmp-bar"><div style="width:${v}%;background:${color || 'var(--brand)'}"></div></div><small>${v}%</small>`;
    openModal(`
        <h2>⚖ Comparador de candidatos</h2>
        <div class="modal-sub">Comparación lado a lado para decidir con datos, no con intuición.</div>
        <div class="table-wrap"><table class="cmp-table">
            <thead><tr><th></th>${list.map(c => `<th><div class="avatar" style="background:${avatarColor(c.name)};margin:0 auto 6px">${initials(c.name)}</div>${c.name}</th>`).join('')}</tr></thead>
            <tbody>
                ${row('Vacante', c => { const j = jobById(c.jobId); return j ? j.title : '—'; })}
                ${row('Etapa', c => { const s = stageById(c.stage); return `<span class="badge" style="background:${s.color}22;color:${s.color}">${s.name}</span>`; })}
                ${row('Scorecards ★', c => candScore(c) ? '★ ' + candScore(c) + ` <small style="color:var(--muted)">(${(c.scorecards || []).length})</small>` : '—')}
                ${row('Fit cultural', c => { const f = fitScore(c); return f != null ? `<strong style="color:${fitColor(f)}">${f}%</strong>` : '—'; })}
                ${row('Job-Match', c => { const m = jobMatch(c, jobById(c.jobId)); return m != null ? `<strong style="color:${fitColor(m)}">${m}%</strong>` : '—'; })}
                ${row('Rol Belbin', c => { const tb = topBelbin(c); return tb ? tb.slice(0, 2).map(x => `<span class="tag" style="color:${x.r.color}">${x.r.name}</span>`).join(' ') : '—'; })}
                ${row('Psicotécnico', c => miniBar(psicoAvg(c), '#22c1c3'))}
                ${BIGFIVE.map(d => row(d.name, c => miniBar(c.assess?.bigfive?.[d.id] ?? null))).join('')}
                ${row('Habilidades', c => (c.tags || []).map(t => `<span class="tag">${t}</span>`).join(' ') || '—')}
                ${row('Origen · Aplicó', c => `${c.source || '—'} · ${c.applied || ''}`)}
                ${row('', c => `<button class="btn-outline btn-sm" onclick="openCandidate('${c.id}','evaluacion')">Abrir ficha</button>`)}
            </tbody>
        </table></div>
        <div class="modal-actions"><button class="btn-primary" onclick="closeModal()">Cerrar</button></div>`, 'wide');
}
function clearSel() { sel.clear(); renderCandidates(); }
function bulkMove(stage) { [...sel].forEach(id => moveStage(id, stage)); sel.clear(); toast('Candidatos movidos', 'ok'); renderCandidates(); }
function bulkArchive() { state.candidates.forEach(c => { if (sel.has(c.id)) c.archived = true; }); sel.clear(); save(); toast('Archivados en CRM', 'ok'); renderCandidates(); }

/* ============================================================
   Ficha de candidato (con pestañas)
   ============================================================ */
function openCandidate(id, tab = 'resumen') {
    const c = state.candidates.find(x => x.id === id); if (!c) return;
    const job = jobById(c.jobId);
    const tabs = ['resumen','scorecards','evaluacion','entrevistas','comunicacion','oferta','actividad'];
    const tabNames = { resumen: 'Resumen', scorecards: 'Scorecards', evaluacion: 'Evaluación', entrevistas: 'Entrevistas', comunicacion: 'Comunicación', oferta: 'Oferta', actividad: 'Actividad' };
    openModal(`
        <div class="cd-head">
            <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
            <div><h2>${c.name} ${c.archived ? '<span class="badge dept" style="vertical-align:middle">CRM</span>' : ''}</h2>
            <div class="modal-sub" style="margin:0">${job ? job.title : 'Sin vacante'} · ${stageById(c.stage).name} · ${c.source || ''}</div></div>
        </div>
        <div class="tabs">${tabs.map(t => `<button class="tab ${t === tab ? 'active' : ''}" onclick="openCandidate('${c.id}','${t}')">${tabNames[t]}</button>`).join('')}</div>
        <div class="tabbody">${candidateTab(c, tab)}</div>
    `, 'wide');
    wireCandidateTab(c, tab);
}

function candidateTab(c, tab) {
    if (tab === 'resumen') {
        return `
            <div class="cd-info-grid">
                <div class="cd-info-item"><div class="lbl">Email</div><div class="val">${c.email}</div></div>
                <div class="cd-info-item"><div class="lbl">Teléfono</div><div class="val">${c.phone || '—'}</div></div>
                <div class="cd-info-item"><div class="lbl">Ubicación</div><div class="val">${c.location || '—'}</div></div>
                <div class="cd-info-item"><div class="lbl">Puesto actual</div><div class="val">${c.currentTitle || '—'}${c.currentCompany ? ' · ' + c.currentCompany : ''}</div></div>
                <div class="cd-info-item"><div class="lbl">Aplicó</div><div class="val">${c.applied || '—'}</div></div>
                <div class="cd-info-item"><div class="lbl">Puntuación media</div><div class="val">${candScore(c) ? '★ ' + candScore(c) + ' / 5' : 'Sin evaluar'}</div></div>
                <div class="cd-info-item"><div class="lbl">Fit cultural</div><div class="val" style="color:${fitColor(fitScore(c))}">${fitScore(c) != null ? fitScore(c) + '% · ' + fitLabel(fitScore(c)) : 'Sin evaluar'}</div></div>
            </div>
            <div class="cd-section-title">Etapa del proceso</div>
            <div class="stage-pills">${STAGES.map(s => `<span class="stage-pill ${c.stage === s.id ? 'active' : ''}" style="${c.stage === s.id ? `background:${s.color};` : ''}" onclick="setStage('${c.id}','${s.id}')">${s.name}</span>`).join('')}</div>
            <div class="cd-section-title">Etiquetas</div>
            <div>${(c.tags || []).length ? c.tags.map(t => `<span class="tag">${t}</span>`).join('') : '<span style="color:var(--muted);font-size:13px">Sin etiquetas</span>'}</div>
            <div class="cd-section-title">Documentos (${attCount(c)})</div>
            <div>${renderAttachments(c)}</div>
            <div class="cd-section-title">Notas</div>
            <div id="notesList">${renderNotes(c)}</div>
            <div class="note-add"><input id="noteInput" placeholder="Añadir una nota..."><button class="btn-primary btn-sm" onclick="addNote('${c.id}')">Añadir</button></div>
            <div class="cd-section-title">Privacidad (RGPD)</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn-outline btn-sm" onclick="exportCandidateJSON('${c.id}')">⬇ Exportar sus datos (JSON)</button>
                ${c.gdprAnonymized ? '<span class="badge dept">Anonimizado</span>' : `<button class="btn-outline btn-sm" onclick="anonymizeCandidate('${c.id}')">Anonimizar (derecho al olvido)</button>`}
            </div>
            <div class="modal-actions">
                <button class="btn-primary btn-danger" onclick="deleteCandidate('${c.id}')">Eliminar</button>
                <button class="btn-outline" onclick="toggleArchive('${c.id}')">${c.archived ? 'Devolver a activo' : 'Archivar en CRM'}</button>
                <button class="btn-outline" onclick="openCandidateForm('${c.id}')">Editar datos</button>
            </div>`;
    }
    if (tab === 'evaluacion') return evaluationTab(c);
    if (tab === 'scorecards') {
        const recap = c.scorecards && c.scorecards.length ? scorecardRecommendation(c) : null;
        return `
            ${recap ? `<div class="recap"><span>Recomendación del panel:</span> <span class="rec-badge" style="background:${recap.color}22;color:${recap.color}">${recap.label}</span> <span style="color:var(--muted);font-size:12px">(${c.scorecards.length} evaluaciones · media ★${candScore(c)})</span></div>` : '<p style="color:var(--muted);font-size:13px;margin-bottom:12px">Aún no hay evaluaciones. Añade la primera scorecard estructurada.</p>'}
            ${(c.scorecards || []).map(s => {
                const r = recById(s.recommendation) || RECOMMENDATIONS[2];
                return `<div class="scorecard">
                    <div class="sc-head"><strong>${s.interviewer}</strong><span class="rec-badge" style="background:${r.color}22;color:${r.color}">${r.label}</span><span class="sc-date">${s.date}</span></div>
                    <div class="sc-criteria">${s.criteria.map(cr => `<div class="sc-row"><span>${cr.name}</span><span class="sc-dots">${'●'.repeat(cr.score)}${'○'.repeat(5 - cr.score)}</span></div>`).join('')}</div>
                    ${s.comment ? `<div class="sc-comment">"${s.comment}"</div>` : ''}
                </div>`;
            }).join('')}
            <button class="btn-primary btn-sm" style="margin-top:12px" onclick="openScorecardForm('${c.id}')">＋ Nueva scorecard</button>`;
    }
    if (tab === 'entrevistas') {
        return `
            ${(c.interviews || []).length ? c.interviews.map(iv => `
                <div class="interview-item">
                    <div class="interview-date"><div class="d">${(iv.date || '').slice(8, 10)}</div><div class="m">${MONTHS[+(iv.date || '2026-01-01').slice(5, 7) - 1]}</div></div>
                    <div style="flex:1"><div class="cc-name">${iv.type} · ${iv.time || ''}</div><div class="cc-role">${iv.interviewer} · ${iv.mode}</div></div>
                </div>`).join('') : '<p style="color:var(--muted);font-size:13px;margin-bottom:12px">Sin entrevistas programadas.</p>'}
            <button class="btn-primary btn-sm" style="margin-top:8px" onclick="openInterviewForm('${c.id}')">＋ Programar entrevista</button>`;
    }
    if (tab === 'comunicacion') {
        return `
            <div class="field"><label>Enviar plantilla</label>
                <div style="display:flex;gap:8px">
                    <select id="tplSelect" style="flex:1">${state.templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
                    <button class="btn-primary btn-sm" onclick="sendTemplateFromUI('${c.id}')">Enviar</button>
                </div>
            </div>
            <div class="cd-section-title">Historial (${(c.emails || []).length})</div>
            ${(c.emails || []).length ? c.emails.map(e => `
                <div class="email-item"><div class="email-subj">✉️ ${e.subject}</div><div class="email-meta">${e.date}${e.template ? ' · ' + e.template : ''}</div><div class="email-body">${(e.body || '').replace(/\n/g, '<br>')}</div></div>`).join('')
              : '<p style="color:var(--muted);font-size:13px">Sin comunicaciones.</p>'}`;
    }
    if (tab === 'oferta') {
        const o = c.offer;
        const OFFER_ST = { draft: 'Borrador', pending: 'Pdte. aprobación', sent: 'Enviada', accepted: 'Aceptada', declined: 'Rechazada' };
        const OFFER_CLS = { draft: 'draft', pending: 'paused', sent: 'dept', accepted: 'open', declined: 'closed' };
        return o ? `
            <div class="offer-card">
                <div class="offer-row"><span>Estado</span><span class="badge ${OFFER_CLS[o.status]}">${OFFER_ST[o.status]}</span></div>
                <div class="offer-row"><span>Salario</span><strong>${o.salary}</strong></div>
                <div class="offer-row"><span>Incorporación</span><strong>${o.startDate}</strong></div>
                <div class="offer-row"><span>Emitida</span><span>${o.date}</span></div>
            </div>
            <div class="stage-pills" style="margin-top:14px">${Object.entries(OFFER_ST).map(([k, v]) => `<span class="stage-pill ${o.status === k ? 'active' : ''}" style="${o.status === k ? 'background:var(--brand);' : ''}" onclick="setOfferStatus('${c.id}','${k}')">${v}</span>`).join('')}</div>
            <button class="btn-outline btn-sm" style="margin-top:14px" onclick="openOfferForm('${c.id}')">Editar oferta</button>`
          : `<p style="color:var(--muted);font-size:13px;margin-bottom:12px">Sin oferta emitida.</p><button class="btn-primary btn-sm" onclick="openOfferForm('${c.id}')">＋ Crear oferta</button>`;
    }
    if (tab === 'actividad') {
        const acts = [...(c.activities || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const cols = { apply: '#5b8cff', stage: '#7c5cff', score: '#ffb547', email: '#22c1c3', offer: '#2fce8a', hire: '#16a34a', reject: '#ff5f6d' };
        return `<div class="timeline">${acts.map(a => `<div class="tl-item"><span class="tl-dot" style="background:${cols[a.type] || '#5b8cff'}"></span><div><div class="tl-text">${a.text}</div><div class="tl-meta">${a.who ? a.who + ' · ' : ''}${a.date}</div></div></div>`).join('')}</div>`;
    }
    return '';
}

function wireCandidateTab(c, tab) {
    if (tab === 'resumen') {
        const ni = document.getElementById('noteInput');
        if (ni) ni.addEventListener('keydown', e => { if (e.key === 'Enter') addNote(c.id); });
    }
}

function scorecardRecommendation(c) {
    const sum = c.scorecards.reduce((a, s) => a + (recById(s.recommendation)?.v || 0), 0);
    const avg = sum / c.scorecards.length;
    if (avg >= 1.5) return RECOMMENDATIONS[0];
    if (avg >= 0.5) return RECOMMENDATIONS[1];
    if (avg > -0.5) return RECOMMENDATIONS[2];
    if (avg > -1.5) return RECOMMENDATIONS[3];
    return RECOMMENDATIONS[4];
}

function logActivity(c, type, text, who) {
    c.activities = c.activities || [];
    c.activities.push({ type, text, date: todayISO(), who: who || 'RRHH' });
}

/* ---- Notas ---- */
function renderNotes(c) {
    if (!c.notes || !c.notes.length) return '<p style="color:var(--muted);font-size:13px">Sin notas.</p>';
    return c.notes.map(n => `<div class="note-item">${n.text}<div class="note-meta">${n.author} · ${n.date}</div></div>`).join('');
}
function addNote(id) {
    const c = state.candidates.find(x => x.id === id);
    const inp = document.getElementById('noteInput'); const text = inp.value.trim().replace(/[<>]/g, ''); if (!text) return;
    c.notes = c.notes || []; c.notes.unshift({ text, date: todayISO(), author: 'RRHH' });
    logActivity(c, 'stage', 'Nota añadida'); save();
    document.getElementById('notesList').innerHTML = renderNotes(c); inp.value = '';
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') addNote(id); });
}

/* ---------- RGPD: portabilidad y derecho al olvido ---------- */
function exportCandidateJSON(id) {
    const c = state.candidates.find(x => x.id === id); if (!c) return;
    const data = { ...c };
    delete data.attachments; // los binarios se descargan aparte desde la ficha
    data.attachmentNames = attachmentsOf(c).map(a => a.name);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `datos_${c.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    logActivity(c, 'stage', 'Datos exportados (portabilidad RGPD)'); save();
    toast('Datos del candidato exportados', 'ok');
}
function anonymizeCandidate(id) {
    const c = state.candidates.find(x => x.id === id); if (!c) return;
    if (!confirm('Anonimizar borra de forma IRREVERSIBLE los datos personales (nombre, contacto, CV, notas y emails). Se conservan las métricas agregadas del proceso. ¿Continuar?')) return;
    c.name = 'Candidato anonimizado ' + c.id.slice(-4).toUpperCase();
    c.email = 'anonimizado@rgpd.local'; c.phone = ''; c.location = '';
    c.currentTitle = ''; c.currentCompany = ''; c.tags = [];
    c.attachments = []; c.cv = null; c.notes = []; c.emails = [];
    c.activities = [{ type: 'stage', text: 'Registro anonimizado a petición del interesado (RGPD)', date: todayISO() }];
    c.gdprAnonymized = true; c.archived = true;
    save(); toast('Candidato anonimizado conforme al RGPD', 'ok'); openCandidate(id);
}

function setStage(id, stage) { moveStage(id, stage, () => openCandidate(id)); }
function toggleArchive(id) { const c = state.candidates.find(x => x.id === id); c.archived = !c.archived; save(); openCandidate(id); toast(c.archived ? 'Archivado en CRM' : 'Devuelto a activo', 'ok'); }
function deleteCandidate(id) {
    if (!confirm('¿Eliminar este candidato?')) return;
    state.candidates = state.candidates.filter(c => c.id !== id);
    sel.delete(id);
    save(); closeModal(); toast('Candidato eliminado', 'info'); render();
}

/* ---- Scorecard form ---- */
function openScorecardForm(id) {
    const c = state.candidates.find(x => x.id === id);
    openModal(`
        <h2>Nueva scorecard</h2><div class="modal-sub">Evaluación estructurada de ${c.name}.</div>
        <form id="scForm">
            <div class="field"><label>Entrevistador/a</label><select name="interviewer">${state.team.map(t => `<option>${t.name}</option>`).join('')}</select></div>
            <div class="cd-section-title">Criterios (1–5)</div>
            ${SCORE_CRITERIA.map((cr, i) => `<div class="sc-input-row"><span>${cr}</span><div class="score-picker" data-crit="${i}">${[1,2,3,4,5].map(n => `<span data-n="${n}">●</span>`).join('')}</div></div>`).join('')}
            <div class="cd-section-title">Recomendación</div>
            <div class="rec-picker">${RECOMMENDATIONS.map(r => `<span class="rec-opt" data-rec="${r.id}" style="--rc:${r.color}">${r.label}</span>`).join('')}</div>
            <div class="field full" style="margin-top:12px"><label>Comentario</label><textarea name="comment" placeholder="Impresiones de la entrevista..."></textarea></div>
            <div class="modal-actions"><button type="button" class="btn-outline" onclick="openCandidate('${id}','scorecards')">Cancelar</button><button type="submit" class="btn-primary">Guardar scorecard</button></div>
        </form>`, 'wide');
    const scores = {}; let rec = 'nt';
    document.querySelectorAll('.score-picker').forEach(sp => {
        sp.querySelectorAll('span').forEach(dot => dot.addEventListener('click', () => {
            const n = +dot.dataset.n; scores[sp.dataset.crit] = n;
            sp.querySelectorAll('span').forEach(d => d.classList.toggle('on', +d.dataset.n <= n));
        }));
    });
    document.querySelectorAll('.rec-opt').forEach(o => o.addEventListener('click', () => {
        rec = o.dataset.rec; document.querySelectorAll('.rec-opt').forEach(x => x.classList.toggle('sel', x === o));
    }));
    document.getElementById('scForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        const criteria = SCORE_CRITERIA.map((cr, i) => ({ name: cr, score: scores[i] || 3 }));
        c.scorecards = c.scorecards || [];
        c.scorecards.push({ id: uid('sc'), interviewer: f.interviewer, recommendation: rec, date: todayISO(), criteria, comment: f.comment });
        logActivity(c, 'score', `Scorecard de ${f.interviewer}: ${recById(rec).label}`, f.interviewer);
        save(); openCandidate(id, 'scorecards'); toast('Scorecard guardada', 'ok');
    });
}

/* ---- Entrevista form ---- */
function openInterviewForm(id) {
    const c = state.candidates.find(x => x.id === id);
    openModal(`
        <h2>Programar entrevista</h2><div class="modal-sub">Para ${c.name}.</div>
        <form id="ivForm"><div class="form-grid">
            <div class="field"><label>Fecha</label><input name="date" type="date" required value="${todayISO()}"></div>
            <div class="field"><label>Hora</label><input name="time" type="time" value="10:00"></div>
            <div class="field"><label>Tipo</label><select name="type">${['RRHH','Técnica','Manager','Cultural','Panel'].map(t => `<option>${t}</option>`).join('')}</select></div>
            <div class="field"><label>Modalidad</label><select name="mode">${['Videollamada','Presencial','Teléfono'].map(t => `<option>${t}</option>`).join('')}</select></div>
            <div class="field full"><label>Entrevistador/a</label><select name="interviewer">${state.team.map(t => `<option>${t.name}</option>`).join('')}</select></div>
        </div><div class="modal-actions"><button type="button" class="btn-outline" onclick="openCandidate('${id}','entrevistas')">Cancelar</button><button type="submit" class="btn-primary">Programar</button></div></form>`);
    document.getElementById('ivForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        c.interviews = c.interviews || []; c.interviews.push({ id: uid('iv'), ...f });
        c.interviewDate = f.date;
        if (c.stage === 'nuevo' || c.stage === 'preseleccion') c.stage = 'entrevista';
        logActivity(c, 'stage', `Entrevista ${f.type} programada (${f.date})`, f.interviewer);
        save(); openCandidate(id, 'entrevistas'); toast('Entrevista programada', 'ok');
    });
}

/* ---- Oferta form ---- */
function openOfferForm(id) {
    const c = state.candidates.find(x => x.id === id); const o = c.offer || {};
    openModal(`
        <h2>${c.offer ? 'Editar' : 'Nueva'} oferta</h2><div class="modal-sub">Para ${c.name}.</div>
        <form id="offForm"><div class="form-grid">
            <div class="field"><label>Salario</label><input name="salary" required value="${o.salary || ''}" placeholder="Ej: 45.000 €"></div>
            <div class="field"><label>Fecha de incorporación</label><input name="startDate" type="date" value="${o.startDate || ''}"></div>
            <div class="field full"><label>Estado</label><select name="status">${Object.entries({ draft: 'Borrador', pending: 'Pdte. aprobación', sent: 'Enviada', accepted: 'Aceptada', declined: 'Rechazada' }).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        </div><div class="modal-actions"><button type="button" class="btn-outline" onclick="openCandidate('${id}','oferta')">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div></form>`);
    document.getElementById('offForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        c.offer = { ...f, date: c.offer?.date || todayISO() };
        if (c.stage !== 'contratado' && (f.status === 'sent' || f.status === 'accepted')) c.stage = 'oferta';
        if (f.status === 'accepted') c.stage = 'contratado';
        logActivity(c, 'offer', `Oferta ${f.status === 'accepted' ? 'aceptada' : 'actualizada'} (${f.salary})`);
        save(); openCandidate(id, 'oferta'); toast('Oferta guardada', 'ok');
    });
}
function setOfferStatus(id, status) {
    const c = state.candidates.find(x => x.id === id);
    c.offer.status = status;
    if (status === 'accepted') { c.stage = 'contratado'; logActivity(c, 'hire', 'Oferta aceptada — contratado'); }
    else logActivity(c, 'offer', `Oferta: ${status}`);
    save(); openCandidate(id, 'oferta'); toast('Estado de oferta actualizado', 'ok');
}

/* ---- Comunicación ---- */
function sendEmailFromTemplate(c, tplName, silent) {
    const tpl = state.templates.find(t => t.name === tplName); if (!tpl) return;
    const job = jobById(c.jobId);
    const fill = s => (s || '').replace(/{nombre}/g, c.name.split(' ')[0]).replace(/{puesto}/g, job ? job.title : 'la posición');
    c.emails = c.emails || [];
    c.emails.unshift({ id: uid('em'), subject: fill(tpl.subject), body: fill(tpl.body), template: tpl.name, date: todayISO(), direction: 'out' });
    logActivity(c, 'email', `Email enviado: ${tpl.name}`);
    if (!silent) toast('Email registrado', 'ok');
}
function sendTemplateFromUI(id) {
    const c = state.candidates.find(x => x.id === id);
    const tplId = document.getElementById('tplSelect').value;
    const tpl = state.templates.find(t => t.id === tplId);
    sendEmailFromTemplate(c, tpl.name); save(); openCandidate(id, 'comunicacion');
}

/* ============================================================
   CRM / Sourcing (talent pool)
   ============================================================ */
function renderCRM() {
    const pool = state.candidates.filter(c => c.archived && matchSearch(c.name + c.email + (c.tags || []).join('')));
    content.innerHTML = `
        <div class="page-head"><div><h1>CRM · Talent Pool</h1><p>Base de talento para redescubrir candidatos (estilo Lever/Ashby)</p></div>
        <button class="btn-primary" onclick="openCandidateForm(null,true)">＋ Añadir al pool</button></div>
        <div class="panel" style="margin-bottom:18px">
            <h3>🤖 Rediscovery sugerido</h3>
            <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Candidatos del pool que encajan con vacantes abiertas por sus etiquetas.</p>
            ${rediscovery()}
        </div>
        ${pool.length ? `<div class="cardgrid">${pool.map(c => {
            const job = jobById(c.jobId);
            return `<div class="crm-card" onclick="openCandidate('${c.id}')">
                <div class="cc-top"><div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
                <div><div class="cc-name">${c.name}</div><div class="cc-role">${c.currentTitle || (job ? job.title : '')}${c.currentCompany ? ' · ' + c.currentCompany : ''}</div></div></div>
                <div style="margin:8px 0">${(c.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                <div class="cc-meta"><span class="scorechip">${candScore(c) ? '★ ' + candScore(c) : '—'}</span><span>${c.source} · ${c.applied}</span></div>
            </div>`;
        }).join('')}</div>` : emptyState('🗃️', 'Pool vacío', 'Archiva candidatos desde su ficha para nutrir tu CRM.')}`;
}
function rediscovery() {
    const openJobs = state.jobs.filter(j => j.status === 'open');
    const matches = [];
    state.candidates.filter(c => c.archived).forEach(c => {
        openJobs.forEach(j => {
            const jt = (j.title + ' ' + j.dept).toLowerCase();
            const hit = (c.tags || []).some(t => jt.includes(t.toLowerCase().split(' ')[0])) || (c.currentTitle || '').toLowerCase().split(' ').some(w => w.length > 3 && jt.includes(w));
            if (hit) matches.push({ c, j });
        });
    });
    if (!matches.length) return '<p style="color:var(--muted);font-size:13px">Sin coincidencias por ahora.</p>';
    return matches.slice(0, 4).map(({ c, j }) => `
        <div class="redisc-row">
            <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
            <div style="flex:1"><strong>${c.name}</strong> → <span style="color:var(--brand)">${j.title}</span><div class="cc-role">${(c.tags || []).join(', ')}</div></div>
            <button class="btn-outline btn-sm" onclick="event.stopPropagation();reactivate('${c.id}','${j.id}')">Reactivar</button>
        </div>`).join('');
}
function reactivate(cid, jid) {
    const c = state.candidates.find(x => x.id === cid);
    c.archived = false; c.jobId = jid; c.stage = 'preseleccion';
    logActivity(c, 'stage', 'Reactivado desde el CRM'); save(); toast(`${c.name} reactivado`, 'ok'); renderCRM();
}

/* ============================================================
   Entrevistas (agenda global)
   ============================================================ */
function renderInterviews() {
    const items = [];
    activeCandidates().forEach(c => (c.interviews || []).forEach(iv => items.push({ c, iv })));
    items.sort((a, b) => (a.iv.date + a.iv.time).localeCompare(b.iv.date + b.iv.time));
    const today = todayISO();
    const upcoming = items.filter(x => x.iv.date >= today);
    content.innerHTML = `
        <div class="page-head"><div><h1>Entrevistas</h1><p>${upcoming.length} próximas · ${items.length - upcoming.length} pasadas</p></div></div>
        ${items.length ? items.map(({ c, iv }) => {
            const job = jobById(c.jobId);
            return `<div class="interview-item ${iv.date < today ? 'past' : ''}">
                <div class="interview-date"><div class="d">${(iv.date || '').slice(8, 10)}</div><div class="m">${MONTHS[+(iv.date || '2026-01-01').slice(5, 7) - 1]}</div></div>
                <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
                <div style="flex:1"><div class="cc-name">${c.name} <span style="color:var(--muted);font-weight:400">· ${iv.time || ''}</span></div>
                <div class="cc-role">${iv.type} · ${iv.mode} · ${iv.interviewer} — ${job ? job.title : ''}</div></div>
                <button class="btn-outline btn-sm" onclick="openCandidate('${c.id}','entrevistas')">Ficha</button>
            </div>`;
        }).join('') : emptyState('📅', 'Sin entrevistas', 'Programa entrevistas desde la ficha del candidato.')}`;
}

/* ============================================================
   Ofertas
   ============================================================ */
function renderOffers() {
    const withOffer = state.candidates.filter(c => c.offer);
    const OFFER_ST = { draft: 'Borrador', pending: 'Pdte. aprobación', sent: 'Enviada', accepted: 'Aceptada', declined: 'Rechazada' };
    const OFFER_CLS = { draft: 'draft', pending: 'paused', sent: 'dept', accepted: 'open', declined: 'closed' };
    const sent = withOffer.filter(c => ['sent','accepted','declined'].includes(c.offer.status)).length;
    const accepted = withOffer.filter(c => c.offer.status === 'accepted').length;
    const rate = sent ? Math.round((accepted / sent) * 100) : 0;
    content.innerHTML = `
        <div class="page-head"><div><h1>Ofertas</h1><p>Gestión y aprobación de ofertas</p></div></div>
        <div class="kpi-grid">
            <div class="kpi k2"><div class="kpi-label">Ofertas emitidas</div><div class="kpi-value">${withOffer.length}</div></div>
            <div class="kpi k3"><div class="kpi-label">Aceptadas</div><div class="kpi-value">${accepted}</div></div>
            <div class="kpi k1"><div class="kpi-label">Tasa de aceptación</div><div class="kpi-value">${rate}%</div></div>
        </div>
        ${withOffer.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Candidato</th><th>Vacante</th><th>Salario</th><th>Incorporación</th><th>Estado</th></tr></thead>
            <tbody>${withOffer.map(c => { const job = jobById(c.jobId); const o = c.offer;
                return `<tr class="row-click" onclick="openCandidate('${c.id}','oferta')"><td><strong>${c.name}</strong></td><td>${job ? job.title : '—'}</td><td>${o.salary}</td><td>${o.startDate || '—'}</td><td><span class="badge ${OFFER_CLS[o.status]}">${OFFER_ST[o.status]}</span></td></tr>`;
            }).join('')}</tbody></table></div>` : emptyState('📄', 'Sin ofertas', 'Crea ofertas desde la pestaña «Oferta» de cada candidato.')}`;
}

/* ============================================================
   Informes / Analítica avanzada
   ============================================================ */
function renderReports() {
    const cs = state.candidates;
    // Conversión por etapa
    const funnelData = STAGES.filter(s => !['rechazado'].includes(s.id)).map(s => ({ s, n: activeCandidates().filter(c => stageIndex(c.stage) >= stageIndex(s.id) && c.stage !== 'rechazado').length }));
    // Fuentes
    const bySource = {};
    cs.forEach(c => { const s = c.source || 'Otro'; bySource[s] = bySource[s] || { total: 0, hired: 0 }; bySource[s].total++; if (c.stage === 'contratado') bySource[s].hired++; });
    const srcRows = Object.entries(bySource).sort((a, b) => b[1].total - a[1].total);
    const maxSrc = Math.max(1, ...srcRows.map(r => r[1].total));
    // Hires por mes
    const hires = cs.filter(c => c.stage === 'contratado' && c.offer && c.offer.date);
    const byMonth = {};
    hires.forEach(c => { const m = c.offer.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + 1; });
    const monthsSorted = Object.keys(byMonth).sort();
    // Depto
    const byDept = {};
    activeCandidates().forEach(c => { const j = jobById(c.jobId); const d = j ? j.dept : 'Sin depto'; byDept[d] = (byDept[d] || 0) + 1; });
    const deptRows = Object.entries(byDept).sort((a, b) => b[1] - a[1]);
    const maxDept = Math.max(1, ...deptRows.map(r => r[1]));

    content.innerHTML = `
        <div class="page-head"><div><h1>Informes</h1><p>Analítica de contratación (estilo Ashby)</p></div></div>
        <div class="kpi-grid">
            <div class="kpi k1"><div class="kpi-label">Time to hire</div><div class="kpi-value">${avgTimeToHire() || '—'}<span style="font-size:14px"> d</span></div></div>
            <div class="kpi k2"><div class="kpi-label">Candidatos totales</div><div class="kpi-value">${cs.length}</div></div>
            <div class="kpi k3"><div class="kpi-label">Contrataciones</div><div class="kpi-value">${hires.length}</div></div>
            <div class="kpi k4"><div class="kpi-label">Ratio entrevista→oferta</div><div class="kpi-value">${interviewToOffer()}%</div></div>
        </div>
        <div class="grid-2">
            <div class="panel"><h3>🔻 Conversión del embudo</h3>
                ${funnelData.map((f, i) => {
                    const prev = i ? funnelData[i - 1].n : f.n;
                    const pct = prev ? Math.round((f.n / prev) * 100) : 100;
                    const w = funnelData[0].n ? (f.n / funnelData[0].n) * 100 : 0;
                    return `<div class="funnel-row"><span class="funnel-label">${f.s.name}</span><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${w}%;background:${f.s.color}">${f.n}</div></div><span class="funnel-count" style="font-size:11px;color:var(--muted)">${i ? pct + '%' : ''}</span></div>`;
                }).join('')}
            </div>
            <div class="panel"><h3>📊 Efectividad por origen</h3>
                ${srcRows.map(([s, d]) => `<div class="bar-row"><span class="bar-label">${s}</span><div class="bar-track"><div class="bar-fill" style="width:${(d.total / maxSrc) * 100}%"></div></div><span class="bar-val">${d.total}<span style="color:var(--green)"> · ${d.hired}✓</span></span></div>`).join('')}
            </div>
        </div>
        <div class="grid-2" style="margin-top:16px">
            <div class="panel"><h3>📈 Contrataciones por mes</h3>
                ${monthsSorted.length ? `<div class="linechart">${sparkline(monthsSorted.map(m => byMonth[m]))}</div><div class="legend" style="margin-top:8px">${monthsSorted.map(m => `<span>${MONTHS[+m.slice(5, 7) - 1]}: <b>${byMonth[m]}</b></span>`).join('')}</div>` : '<p style="color:var(--muted);font-size:13px">Sin datos.</p>'}
            </div>
            <div class="panel"><h3>🏢 Candidatos por departamento</h3>
                ${deptRows.map(([d, n]) => `<div class="bar-row"><span class="bar-label">${d}</span><div class="bar-track"><div class="bar-fill" style="width:${(n / maxDept) * 100}%;background:var(--brand-2)"></div></div><span class="bar-val">${n}</span></div>`).join('')}
            </div>
        </div>
        <div class="panel" style="margin-top:16px"><h3>🌍 Diversidad de género (informe DE&I)</h3>
            <p style="color:var(--muted);font-size:12px;margin-bottom:12px">Datos anonimizados para reporting de diversidad.</p>
            <div class="cd-section-title">Total del pipeline</div>${genderBars(activeCandidates())}
            <div class="cd-section-title">Solo contrataciones</div>${genderBars(cs.filter(c => c.stage === 'contratado'))}
        </div>`;
}
function interviewToOffer() {
    const interviewed = activeCandidates().filter(c => stageIndex(c.stage) >= stageIndex('entrevista')).length;
    const offered = activeCandidates().filter(c => stageIndex(c.stage) >= stageIndex('oferta')).length;
    return interviewed ? Math.round((offered / interviewed) * 100) : 0;
}
function sparkline(vals) {
    if (!vals.length) return '';
    const max = Math.max(...vals, 1); const W = 280, H = 70, step = vals.length > 1 ? W / (vals.length - 1) : 0;
    const pts = vals.map((v, i) => `${i * step},${H - (v / max) * (H - 10) - 5}`);
    const area = `0,${H} ${pts.join(' ')} ${W},${H}`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="80" preserveAspectRatio="none">
        <polygon points="${area}" fill="url(#g)" opacity="0.25"></polygon>
        <polyline points="${pts.join(' ')}" fill="none" stroke="#2fce8a" stroke-width="2.5"></polyline>
        ${vals.map((v, i) => `<circle cx="${i * step}" cy="${H - (v / max) * (H - 10) - 5}" r="3" fill="#2fce8a"></circle>`).join('')}
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2fce8a"/><stop offset="100%" stop-color="transparent"/></linearGradient></defs>
    </svg>`;
}

/* ============================================================
   Portal de empleo (careers page)
   ============================================================ */
function renderCareers() {
    const openJobs = state.jobs.filter(j => j.status === 'open');
    const p = state.settings.portal || defaultPortal();
    content.innerHTML = `
        <div class="page-head"><div><h1>Portal de empleo</h1><p>Web pública, configurable y embebible en cualquier sitio</p></div>
        <div style="display:flex;gap:10px">
            <button class="btn-outline" onclick="openStandalonePortal()">↗ Abrir portal</button>
            <button class="btn-outline" onclick="openEmbedCode()">&lt;/&gt; Código de inserción</button>
            <button class="btn-primary" onclick="openPortalConfig()">⚙ Configurar</button>
        </div></div>
        <p style="color:var(--muted);font-size:12px;margin:-8px 0 16px">Vista previa de cómo se verá el portal con tu marca. Las candidaturas entran al pipeline.</p>
        <div class="careers">
            <div class="careers-hero" style="background:linear-gradient(135deg, ${p.brandColor}, ${p.accentColor})">
                ${p.logo ? `<img src="${p.logo}" alt="logo" class="portal-logo">` : ''}
                <h2>${p.tagline || 'Únete a nuestro equipo'}</h2>
                <p>${p.intro || ''}</p>
                <p style="margin-top:10px;font-weight:600">${openJobs.length} vacantes abiertas</p>
            </div>
            ${openJobs.length ? openJobs.map(j => `
                <div class="career-card">
                    <div><div class="cc-name" style="font-size:15px">${j.title}</div>
                    <div class="cc-role">${j.dept} · ${j.location} · ${j.type}${p.showSalary && j.salary ? ' · ' + j.salary : ''}</div></div>
                    <button class="btn-primary btn-sm" style="background:${p.brandColor}" onclick="openApplyForm('${j.id}')">Aplicar</button>
                </div>`).join('') : '<p style="color:var(--muted)">No hay vacantes abiertas ahora mismo.</p>'}
            <div class="portal-footer">${p.footer || ''}</div>
        </div>`;
}

function openPortalConfig() {
    const p = state.settings.portal || defaultPortal();
    openModal(`
        <h2>Configurar portal de empleo</h2><div class="modal-sub">Personaliza la marca; los cambios se reflejan en la web pública y en el código de inserción.</div>
        <form id="portalForm"><div class="form-grid">
            <div class="field"><label>Nombre de la empresa</label><input name="company" value="${p.company || ''}"></div>
            <div class="field"><label>Titular (hero)</label><input name="tagline" value="${p.tagline || ''}"></div>
            <div class="field"><label>Color principal</label><input name="brandColor" type="color" value="${p.brandColor || '#5b8cff'}"></div>
            <div class="field"><label>Color de acento</label><input name="accentColor" type="color" value="${p.accentColor || '#7c5cff'}"></div>
            <div class="field full"><label>Texto de introducción</label><textarea name="intro">${p.intro || ''}</textarea></div>
            <div class="field full"><label>Pie de página</label><input name="footer" value="${p.footer || ''}"></div>
            <div class="field"><label>Mostrar salario</label><select name="showSalary"><option value="1" ${p.showSalary ? 'selected' : ''}>Sí</option><option value="0" ${!p.showSalary ? 'selected' : ''}>No</option></select></div>
            <div class="field full"><label>Logo (PNG/JPG · opcional)</label><input type="file" id="logoInput" class="file-input" accept="image/png,image/jpeg,.png,.jpg,.jpeg"><div id="logoHint" class="cv-hint">${p.logo ? '🖼️ Logo cargado' : 'Sin logo'}</div></div>
        </div><div class="modal-actions"><button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div></form>`);
    let logo = p.logo || null;
    const li = document.getElementById('logoInput');
    li.addEventListener('change', () => {
        const f = li.files[0]; if (!f) return;
        if (f.size > CV_MAX) { toast('Logo demasiado grande (máx 3 MB)', 'info'); li.value = ''; return; }
        const r = new FileReader(); r.onload = () => { logo = r.result; document.getElementById('logoHint').innerHTML = '✅ ' + f.name; }; r.readAsDataURL(f);
    });
    document.getElementById('portalForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        state.settings.portal = { ...p, company: f.company, tagline: f.tagline, intro: f.intro, footer: f.footer, brandColor: f.brandColor, accentColor: f.accentColor, showSalary: f.showSalary === '1', logo };
        state.settings.company = f.company;
        save(); closeModal(); toast('Portal actualizado', 'ok'); render();
    });
}

function portalConfigPayload() {
    const p = state.settings.portal || defaultPortal();
    const jobs = state.jobs.filter(j => j.status === 'open').map(j => ({ id: j.id, title: j.title, dept: j.dept, location: j.location, type: j.type, salary: j.salary, description: j.description }));
    return { portal: p, jobs };
}
function encodeConfig() {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(portalConfigPayload())))); }
    catch (e) { return ''; }
}
function openEmbedCode() {
    const cfg = encodeConfig();
    const big = cfg.length > 8000;
    const src = big ? 'careers.html' : `careers.html?c=${cfg}`;
    const iframe = `<iframe\n  src="https://TU-DOMINIO/${src}"\n  title="Portal de empleo"\n  width="100%" height="900"\n  style="border:0;max-width:960px"\n  loading="lazy">\n</iframe>`;
    openModal(`
        <h2>Código de inserción</h2><div class="modal-sub">Pega este iframe en la web de cualquier empresa que use este portal.</div>
        <div class="cd-section-title">1 · Sube <code>careers.html</code> a tu dominio</div>
        <p style="font-size:13px;color:var(--muted)">Es una página autónoma (sin dependencias). Súbela junto a tu web o a cualquier hosting estático.</p>
        <div class="cd-section-title">2 · Inserta el iframe</div>
        <pre class="codeblock" id="embedCode">${iframe.replace(/</g, '&lt;')}</pre>
        <button class="btn-primary btn-sm" onclick="copyText('embedCode')">Copiar código</button>
        ${big ? '<p class="cv-hint" style="margin-top:10px">⚠️ Tu configuración (con logo) es grande: el portal leerá la marca desde su propio almacenamiento en lugar de la URL.</p>' : '<p class="cv-hint" style="margin-top:10px">La marca y las vacantes viajan codificadas en el parámetro <code>?c=</code>, así el portal se ve igual en cualquier web.</p>'}
        <div class="modal-actions"><button class="btn-outline" onclick="openStandalonePortal()">↗ Previsualizar portal</button><button class="btn-primary" onclick="closeModal()">Cerrar</button></div>`, 'wide');
}
function openStandalonePortal() {
    const cfg = encodeConfig();
    const url = cfg.length > 8000 ? 'careers.html' : `careers.html?c=${cfg}`;
    window.open(url, '_blank');
}
function copyText(id) {
    const el = document.getElementById(id); const txt = el.innerText || el.textContent;
    navigator.clipboard?.writeText(txt).then(() => toast('Código copiado', 'ok'), () => toast('Copia manual', 'info'));
}
function openApplyForm(jid) {
    const j = jobById(jid);
    openModal(`
        <h2>Aplicar: ${j.title}</h2><div class="modal-sub">${j.dept} · ${j.location}</div>
        <form id="applyForm"><div class="form-grid">
            <div class="field"><label>Nombre completo *</label><input name="name" required></div>
            <div class="field"><label>Email *</label><input name="email" type="email" required></div>
            <div class="field"><label>Teléfono</label><input name="phone"></div>
            <div class="field"><label>Puesto actual</label><input name="currentTitle"></div>
            <div class="field full"><label>Género (opcional, para DE&I)</label><select name="gender"><option value="">Prefiere no decir</option>${GENDERS.filter(g => g !== 'Prefiere no decir').map(g => `<option>${g}</option>`).join('')}</select></div>
            <div class="field full"><label>Habilidades (separadas por comas)</label><input name="tags" placeholder="Ej: React, 3 años"></div>
            <div class="field full">${attachFieldHTML([])}</div>
            <div class="field full"><label class="consent"><input type="checkbox" name="consent" required> Acepto el tratamiento de mis datos personales para este proceso de selección (RGPD)</label></div>
        </div><div class="modal-actions"><button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn-primary">Enviar candidatura</button></div></form>`);
    let attach = [];
    wireAttachInput(() => attach, v => { attach = v; });
    document.getElementById('applyForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        const c = { id: uid('cand'), name: f.name, email: f.email, phone: f.phone, currentTitle: f.currentTitle,
            gender: f.gender || 'Prefiere no decir', jobId: jid, stage: 'nuevo', source: 'Portal propio',
            applied: todayISO(), tags: f.tags.split(',').map(t => t.trim()).filter(Boolean), rating: 0, attachments: attach, cv: attach[0] || null,
            scorecards: [], emails: [], interviews: [], notes: [], offer: null, archived: false, location: '',
            activities: [{ type: 'apply', text: 'Aplicó por el portal de empleo', date: todayISO() }] };
        state.candidates.unshift(c);
        if (autoEnabled('Email de acuse al aplicar')) sendEmailFromTemplate(c, 'Acuse de recibo', true);
        save(); closeModal(); toast('¡Candidatura recibida! Ya está en el pipeline', 'ok'); render();
    });
}

/* ============================================================
   Automatización
   ============================================================ */
function autoEnabled(name) { const a = state.automations.find(x => x.name === name); return a && a.enabled; }
function renderAutomation() {
    content.innerHTML = `
        <div class="page-head"><div><h1>Automatización y plantillas</h1><p>Define hasta dónde puede llegar el agente sin ti</p></div></div>
        <div class="panel" style="margin-bottom:16px">
            <h3>🤖 Niveles de autonomía del agente</h3>
            <p style="color:var(--muted);font-size:12px;margin-bottom:14px"><strong>L1</strong> avisar · <strong>L2</strong> proponer con acción preparada (tú apruebas) · <strong>L3</strong> autónomo con registro y deshacer. Las acciones adversas están limitadas a L2 por diseño.</p>
            ${AUTONOMY_TYPES.map(t => `
                <div class="auto-row">
                    <div style="flex:1;min-width:0"><strong>${t.icon} ${t.name}</strong><div class="cc-role">${t.desc}</div></div>
                    <div class="seg">${['L1', 'L2', 'L3'].map(l => `<button class="seg-btn ${autonomyLevel(t.id) === l ? 'on' : ''}" ${t.adverse && l === 'L3' ? 'disabled title="🔒 Supervisión humana obligatoria"' : ''} onclick="setAutonomy('${t.id}','${l}')">${l}${t.adverse && l === 'L3' ? '🔒' : ''}</button>`).join('')}</div>
                </div>`).join('')}
        </div>
        <div class="panel" style="margin-bottom:16px"><h3>📜 Registro del agente</h3>
            ${(state.agentLog || []).length ? (state.agentLog || []).slice(0, 8).map(l => `<div class="tl-item"><span class="tl-dot" style="background:var(--brand)"></span><div><div class="tl-text">${l.text}</div><div class="tl-meta">${l.date}</div></div></div>`).join('') : '<p style="color:var(--muted);font-size:13px">Aún sin actividad del agente.</p>'}
        </div>
        <div class="panel" style="margin-bottom:16px"><h3>⚙️ Reglas de automatización</h3>
            ${state.automations.map(a => `
                <div class="auto-row">
                    <label class="switch"><input type="checkbox" ${a.enabled ? 'checked' : ''} onchange="toggleAuto('${a.id}')"><span class="slider"></span></label>
                    <div style="flex:1"><strong>${a.name}</strong><div class="cc-role"><b>Cuando:</b> ${a.trigger} → <b>entonces:</b> ${a.action}</div></div>
                </div>`).join('')}
        </div>
        <div class="panel"><h3>✉️ Plantillas de email</h3>
            ${state.templates.map(t => `<div class="tpl-row" onclick="openTemplate('${t.id}')"><strong>${t.name}</strong><div class="cc-role">${t.subject}</div></div>`).join('')}
        </div>`;
}
function toggleAuto(id) { const a = state.automations.find(x => x.id === id); a.enabled = !a.enabled; save(); toast(`Automatización ${a.enabled ? 'activada' : 'desactivada'}`, 'ok'); }
function openTemplate(id) {
    const t = state.templates.find(x => x.id === id);
    openModal(`<h2>${t.name}</h2><div class="modal-sub">Asunto: ${t.subject}</div>
        <div class="email-item"><div class="email-body">${t.body.replace(/\n/g, '<br>')}</div></div>
        <p style="color:var(--muted);font-size:12px;margin-top:12px">Variables disponibles: <code>{nombre}</code>, <code>{puesto}</code></p>
        <div class="modal-actions"><button class="btn-outline" onclick="closeModal()">Cerrar</button></div>`);
}

/* ============================================================
   Candidato form (alta/edición manual)
   ============================================================ */
function openCandidateForm(id, toPool) {
    const c = id ? state.candidates.find(x => x.id === id) : null;
    openModal(`
        <h2>${c ? 'Editar' : 'Nuevo'} candidato</h2><div class="modal-sub">Datos del candidato.</div>
        <form id="candForm"><div class="form-grid">
            <div class="field"><label>Nombre completo *</label><input name="name" required value="${c?.name || ''}"></div>
            <div class="field"><label>Email *</label><input name="email" type="email" required value="${c?.email || ''}"></div>
            <div class="field"><label>Teléfono</label><input name="phone" value="${c?.phone || ''}"></div>
            <div class="field"><label>Ubicación</label><input name="location" value="${c?.location || ''}"></div>
            <div class="field"><label>Puesto actual</label><input name="currentTitle" value="${c?.currentTitle || ''}"></div>
            <div class="field"><label>Empresa actual</label><input name="currentCompany" value="${c?.currentCompany || ''}"></div>
            <div class="field"><label>Vacante</label><select name="jobId"><option value="">— Sin asignar —</option>${state.jobs.map(j => `<option value="${j.id}" ${c?.jobId === j.id ? 'selected' : ''}>${j.title}</option>`).join('')}</select></div>
            <div class="field"><label>Etapa</label><select name="stage">${STAGES.map(s => `<option value="${s.id}" ${c?.stage === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
            <div class="field"><label>Origen</label><select name="source">${SOURCES.map(o => `<option ${c?.source === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
            <div class="field"><label>Género (DE&I)</label><select name="gender">${GENDERS.map(g => `<option ${c?.gender === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
            <div class="field full"><label>Etiquetas (comas)</label><input name="tags" value="${(c?.tags || []).join(', ')}" placeholder="Ej: React, Senior"></div>
            <div class="field full">${attachFieldHTML(c ? attachmentsOf(c) : [])}</div>
        </div><div class="modal-actions"><button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn-primary">${c ? 'Guardar' : 'Añadir'}</button></div></form>`);
    let attach = c ? attachmentsOf(c).slice() : [];
    wireAttachInput(() => attach, v => { attach = v; });
    document.getElementById('candForm').addEventListener('submit', e => {
        e.preventDefault();
        const data = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
        data.jobId = data.jobId || null;
        data.attachments = attach; data.cv = attach[0] || null;
        if (c) { Object.assign(c, data); toast('Candidato actualizado', 'ok'); }
        else {
            const nc = { id: uid('cand'), rating: 0, applied: todayISO(), notes: [], scorecards: [], emails: [], interviews: [], offer: null, archived: !!toPool, activities: [{ type: 'apply', text: toPool ? 'Añadido al CRM' : 'Añadido manualmente', date: todayISO() }], ...data };
            state.candidates.unshift(nc); toast('Candidato añadido', 'ok');
        }
        save(); closeModal(); render();
    });
}

/* ============================================================
   CSV import/export
   ============================================================ */
function exportCandidatesCSV() {
    const list = activeCandidates();
    if (!list.length) { toast('No hay candidatos que exportar', 'info'); return; }
    const cols = ['Nombre','Email','Teléfono','Vacante','Etapa','Score','Origen','Género','Etiquetas','Aplicó'];
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = list.map(c => { const job = jobById(c.jobId);
        return [c.name, c.email, c.phone, job ? job.title : '', stageById(c.stage).name, candScore(c), c.source, c.gender, (c.tags || []).join('; '), c.applied].map(esc).join(','); });
    const csv = '﻿' + [cols.map(esc).join(','), ...rows].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `candidatos_${todayISO()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    toast(`${list.length} candidatos exportados`, 'ok');
}
function importCSV() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv';
    inp.onchange = () => {
        const file = inp.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const lines = reader.result.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) { toast('CSV vacío', 'info'); return; }
            const parse = l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')).slice(0, -1);
            const header = parse(lines[0]).map(h => h.toLowerCase());
            const iName = header.findIndex(h => h.includes('nombre'));
            const iEmail = header.findIndex(h => h.includes('email') || h.includes('correo'));
            let n = 0;
            lines.slice(1).forEach(l => {
                const cells = parse(l); const name = cells[iName]; if (!name) return;
                state.candidates.unshift({ id: uid('cand'), name, email: cells[iEmail] || '', phone: '', jobId: null, stage: 'nuevo', source: 'Otro', gender: 'Prefiere no decir', applied: todayISO(), tags: [], rating: 0, scorecards: [], emails: [], interviews: [], notes: [], offer: null, archived: false, location: '', activities: [{ type: 'apply', text: 'Importado por CSV', date: todayISO() }] }); n++;
            });
            save(); toast(`${n} candidatos importados`, 'ok'); render();
        };
        reader.readAsText(file);
    };
    inp.click();
}

/* ============================================================
   Evaluación de conducta, encaje cultural y psicotécnicos
   ============================================================ */
function valuesFitPct(c) {
    const vf = c.assess && c.assess.valuesFit; if (!vf) return null;
    const vals = (state.settings.dna.values || []).map(v => vf[v.name]).filter(x => typeof x === 'number');
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length / 5 * 100);
}
function fitScore(c) {
    const vp = valuesFitPct(c);
    const sc = candScore(c); const scPct = sc ? sc / 5 * 100 : null;
    const parts = [vp, scPct].filter(x => x != null);
    if (!parts.length) return null;
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}
function fitColor(p) { return p == null ? 'var(--muted)' : p >= 75 ? '#2fce8a' : p >= 50 ? '#ffb547' : '#ff5f6d'; }
function fitLabel(p) { return p == null ? 'Sin evaluar' : p >= 75 ? 'Alto encaje' : p >= 50 ? 'Encaje medio' : 'Bajo encaje'; }
function topBelbin(c) {
    const b = c.assess && c.assess.belbin; if (!b) return null;
    const arr = BELBIN_ROLES.map(r => ({ r, v: b[r.id] || 0 })).sort((a, z) => z.v - a.v);
    return arr[0].v ? arr : null;
}
function psicoAvg(c) {
    const p = c.assess && c.assess.psycho; if (!p) return null;
    const vals = Object.values(p); if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/* ---------- Job-Match: encaje candidato ↔ perfil ideal del puesto ---------- */
function jobMatch(c, j) {
    if (!j || !j.ideal) return null;
    const ideal = j.ideal;
    const parts = []; // { score 0..1, weight }
    // Habilidades requeridas (peso 40)
    if (ideal.mustTags && ideal.mustTags.length) {
        const ctags = (c.tags || []).map(t => t.toLowerCase());
        const hits = ideal.mustTags.filter(t => ctags.some(x => x.includes(t.toLowerCase()) || t.toLowerCase().includes(x))).length;
        parts.push({ s: hits / ideal.mustTags.length, w: 40 });
    }
    // Roles Belbin buscados (peso 25) — solapamiento con el top-3 del candidato
    if (ideal.belbin && ideal.belbin.length) {
        const tb = topBelbin(c);
        if (tb) {
            const top3 = tb.slice(0, 3).map(x => x.r.id);
            const hits = ideal.belbin.filter(r => top3.includes(r)).length;
            parts.push({ s: hits / ideal.belbin.length, w: 25 });
        }
    }
    // Aptitud psicotécnica mínima (peso 15)
    if (ideal.minPsico) {
        const avg = psicoAvg(c);
        if (avg != null) parts.push({ s: Math.min(1, avg / ideal.minPsico), w: 15 });
    }
    // Alineamiento con valores (peso 20)
    const vp = valuesFitPct(c);
    if (vp != null) parts.push({ s: vp / 100, w: 20 });
    if (!parts.length) return null;
    const totalW = parts.reduce((a, p) => a + p.w, 0);
    return Math.round(parts.reduce((a, p) => a + p.s * p.w, 0) / totalW * 100);
}

/* ---------- Equilibrio de equipo Belbin por vacante ---------- */
function teamBelbinAnalysis(jobId) {
    const hired = state.candidates.filter(c => c.jobId === jobId && c.stage === 'contratado' && c.assess && c.assess.belbin);
    const covered = new Set();
    hired.forEach(c => topBelbin(c).slice(0, 2).forEach(x => covered.add(x.r.id)));
    const missing = BELBIN_ROLES.filter(r => !covered.has(r.id));
    // Candidatos activos del pipeline (o pool) cuyo rol principal cubre un hueco
    const gapIds = new Set(missing.map(r => r.id));
    const fillers = state.candidates
        .filter(c => c.jobId === jobId && !['contratado', 'rechazado'].includes(c.stage) && !c.archived && c.assess && c.assess.belbin)
        .map(c => ({ c, top: topBelbin(c)[0].r }))
        .filter(x => gapIds.has(x.top.id));
    return { hired, covered, missing, fillers };
}

/* ---------- Copiloto de selección: insights accionables ---------- */
function lastActivityDate(c) {
    const dates = (c.activities || []).map(a => a.date).filter(Boolean);
    return dates.length ? dates.sort().pop() : c.applied;
}
/* ============================================================
   AGENTE DE SELECCIÓN — propuestas con acción preparada
   Niveles de autonomía por tipo de acción:
     L1 avisar · L2 proponer (humano aprueba) · L3 autónomo (con deshacer)
   Las acciones ADVERSAS (rechazos) quedan limitadas a L2 por diseño
   (supervisión humana obligatoria, en línea con el AI Act europeo).
   ============================================================ */
const AUTONOMY_TYPES = [
    { id: 'followup_email',     name: 'Email a candidatos estancados',      icon: '⏳', adverse: false, def: 'L2', desc: 'Redacta un email de cortesía cuando alguien lleva ≥7 días sin avanzar.' },
    { id: 'offer_followup',     name: 'Seguimiento de oferta sin respuesta', icon: '📄', adverse: false, def: 'L2', desc: 'Recuerda amablemente la oferta enviada hace ≥5 días.' },
    { id: 'scorecard_reminder', name: 'Recordatorio de scorecard',           icon: '📋', adverse: false, def: 'L3', desc: 'Avisa al entrevistador cuando hay una entrevista pasada sin evaluación.' },
    { id: 'send_test',          name: 'Envío del test de evaluación',        icon: '🧪', adverse: false, def: 'L2', desc: 'Envía el test autoadministrado a candidatos en entrevista o posterior.' },
    { id: 'move_stage',         name: 'Avance de etapa por Job-Match',       icon: '🗂️', adverse: false, def: 'L2', desc: 'Propone pasar a Preselección cuando el encaje con el perfil ideal es ≥70 %.' },
    { id: 'reject',             name: 'Rechazo cordial por bajo encaje',     icon: '🚫', adverse: true,  def: 'L2', desc: 'Prepara el rechazo cuando el fit es <40 % en etapa avanzada. 🔒 Siempre con aprobación humana.' },
    { id: 'approve_job',        name: 'Apertura de requisiciones',           icon: '✅', adverse: false, def: 'L2', desc: 'Prepara la aprobación de requisiciones pendientes.' },
];
const autoTypeById = id => AUTONOMY_TYPES.find(t => t.id === id);
function autonomyLevel(typeId) {
    const t = autoTypeById(typeId);
    let lvl = (state.settings.autonomy || {})[typeId] || t.def;
    if (t.adverse && lvl === 'L3') lvl = 'L2'; // guardarraíl: adversas nunca autónomas
    return lvl;
}
function setAutonomy(typeId, level) {
    const t = autoTypeById(typeId);
    if (t.adverse && level === 'L3') { toast('🔒 Acción adversa: la supervisión humana es obligatoria', 'info'); return; }
    state.settings.autonomy = state.settings.autonomy || {};
    state.settings.autonomy[typeId] = level;
    save(); toast(`${t.name} → ${level === 'L1' ? 'solo avisar' : level === 'L2' ? 'proponer' : 'autónomo'}`, 'ok'); renderAutomation();
}
function agentLogPush(text) {
    state.agentLog = state.agentLog || [];
    state.agentLog.unshift({ date: todayISO(), text });
    if (state.agentLog.length > 50) state.agentLog.length = 50;
}

/* ---- Borradores contextuales ---- */
function draftEmail(c, kind, extra = {}) {
    const job = jobById(c.jobId); const first = c.name.split(' ')[0]; const jt = job ? job.title : 'la posición';
    if (kind === 'followup') return {
        subject: `Seguimos contigo — proceso de ${jt}`,
        body: `Hola ${first},\n\nQueríamos escribirte para confirmarte que tu candidatura a ${jt} sigue activa. Estamos avanzando en la etapa de ${stageById(c.stage).name.toLowerCase()} y te daremos novedades muy pronto.\n\nGracias por tu paciencia e interés.\n\nUn saludo,\nEquipo de RRHH` };
    if (kind === 'offer') return {
        subject: `¿Pudiste revisar nuestra oferta? — ${jt}`,
        body: `Hola ${first},\n\nHace unos días te enviamos nuestra oferta para incorporarte como ${jt} y nos encantaría conocer tus impresiones. Si tienes cualquier duda sobre las condiciones, estaremos encantados de resolverla en una llamada.\n\nUn saludo,\nEquipo de RRHH` };
    if (kind === 'test') return {
        subject: `Un paso más en tu proceso — test de evaluación (${jt})`,
        body: `Hola ${first},\n\nComo parte del proceso para ${jt}, nos gustaría conocerte mejor con un breve test (~10 min) sobre valores, formas de trabajar y aptitudes.\n\nPuedes hacerlo aquí: assessment.html?cid=${c.id}\n\nUn saludo,\nEquipo de RRHH` };
    if (kind === 'reject') return {
        subject: `Sobre tu candidatura a ${jt}`,
        body: `Hola ${first},\n\nQueremos agradecerte el tiempo y el interés que has dedicado al proceso de ${jt}. Tras evaluar detenidamente tu perfil${extra.fit != null ? ' junto al resto de candidaturas' : ''}, hemos decidido avanzar con otros perfiles que se ajustan más a lo que buscamos en este momento.\n\nConservaremos tu candidatura para futuras oportunidades.\n\nUn saludo,\nEquipo de RRHH` };
    return { subject: '', body: '' };
}

/* ---- Generador de propuestas (el "tick" del agente) ---- */
function proposalKey(p) { return p.type + '|' + (p.candidateId || p.jobId || '') + '|' + (p.ctx || ''); }
function agentTick() {
    const today = todayISO();
    state.proposals = state.proposals || []; state.dismissedKeys = state.dismissedKeys || [];
    const known = new Set(state.proposals.map(p => p.key).concat(state.dismissedKeys));
    let changed = false;
    const add = p => {
        p.key = proposalKey(p);
        if (known.has(p.key)) return;
        known.add(p.key);
        p.id = uid('prop'); p.created = today; p.level = autonomyLevel(p.type); p.status = 'pending';
        if (p.level === 'L3') { executeProposal(p); p.status = 'auto'; p.executed = today; }
        state.proposals.unshift(p); changed = true;
    };
    const active = activeCandidates().filter(c => !['contratado', 'rechazado'].includes(c.stage) && !c.gdprAnonymized);
    // 1 · Estancados ≥7 días → email de cortesía (top 5 por antigüedad)
    active.map(c => ({ c, d: daysBetween(lastActivityDate(c) || today, today) }))
        .filter(x => x.d >= 7).sort((a, b) => b.d - a.d).slice(0, 5)
        .forEach(({ c, d }) => add({ type: 'followup_email', candidateId: c.id, ctx: lastActivityDate(c),
            title: `Reactivar a ${c.name}`, confidence: 80,
            reason: `Lleva ${d} días sin actividad en ${stageById(c.stage).name}. Email de cortesía preparado para mantener su interés.`,
            email: draftEmail(c, 'followup') }));
    // 2 · Ofertas enviadas sin respuesta ≥5 días
    state.candidates.filter(c => c.offer && c.offer.status === 'sent' && daysBetween(c.offer.date, today) >= 5)
        .forEach(c => add({ type: 'offer_followup', candidateId: c.id, ctx: c.offer.date,
            title: `Seguimiento de oferta a ${c.name}`, confidence: 90,
            reason: `La oferta se envió hace ${daysBetween(c.offer.date, today)} días y sigue sin respuesta. Cada día baja la probabilidad de aceptación.`,
            email: draftEmail(c, 'offer') }));
    // 3 · Entrevista pasada sin scorecard → recordatorio interno
    active.filter(c => (c.interviews || []).some(iv => iv.date && iv.date < today) && !(c.scorecards || []).length)
        .forEach(c => { const iv = c.interviews.filter(x => x.date < today).pop();
            add({ type: 'scorecard_reminder', candidateId: c.id, ctx: 'sc' + (iv ? iv.date : ''),
                title: `Recordar scorecard de ${c.name}`, confidence: 95, interviewer: iv ? iv.interviewer : 'el entrevistador', noUndo: true,
                reason: `${iv ? iv.interviewer : 'El entrevistador'} hizo la entrevista (${iv ? iv.date : ''}) y aún no registró su evaluación. Sin scorecard no hay decisión trazable.` }); });
    // 4 · Test de evaluación pendiente en entrevista+
    active.filter(c => stageIndex(c.stage) >= stageIndex('entrevista') && !(c.assess && c.assess.selfCompleted))
        .forEach(c => add({ type: 'send_test', candidateId: c.id, ctx: 'test',
            title: `Enviar test de evaluación a ${c.name}`, confidence: 85,
            reason: `Está en ${stageById(c.stage).name} sin perfil de evaluación (Belbin, valores, aptitudes). El test completa su Fit score sin trabajo del equipo.`,
            email: draftEmail(c, 'test') }));
    // 5 · Job-Match ≥70 en etapa Nuevo → avanzar a Preselección
    active.filter(c => c.stage === 'nuevo').forEach(c => {
        const m = jobMatch(c, jobById(c.jobId));
        if (m != null && m >= 70) add({ type: 'move_stage', candidateId: c.id, ctx: 'nuevo', to: 'preseleccion', match: m,
            title: `Avanzar a ${c.name} a Preselección`, confidence: m,
            reason: `Su Job-Match con el perfil ideal es del ${m} %. Cumple los requisitos definidos en la requisición.` });
    });
    // 6 · Fit <40 en etapa avanzada → rechazo cordial (SIEMPRE con humano)
    active.filter(c => ['prueba', 'oferta'].includes(c.stage)).forEach(c => {
        const f = fitScore(c);
        if (f != null && f < 40) add({ type: 'reject', candidateId: c.id, ctx: 'rej', fit: f,
            title: `Rechazo cordial de ${c.name}`, confidence: 100 - f,
            reason: `Fit de solo ${f} % en ${stageById(c.stage).name}. El agente ha preparado el email, pero un rechazo SIEMPRE requiere tu aprobación.`,
            email: draftEmail(c, 'reject', { fit: f }) });
    });
    // 7 · Requisiciones pendientes de aprobación
    state.jobs.filter(j => j.status === 'pending').forEach(j => add({ type: 'approve_job', jobId: j.id, ctx: j.title,
        title: `Abrir la requisición «${j.title}»`, confidence: 70,
        reason: `Creada el ${j.created}, pendiente de ${j.approver || 'dirección'}. Al aprobarla se publica en el portal de empleo.` }));
    if (changed) save();
}

/* ---- Ejecución, aprobación, deshacer ---- */
function executeProposal(p) {
    const c = p.candidateId ? state.candidates.find(x => x.id === p.candidateId) : null;
    if (p.type === 'approve_job') {
        const j = jobById(p.jobId); if (j) { p.undo = { status: j.status }; j.status = 'open'; }
    } else if (p.type === 'move_stage' && c) {
        p.undo = { stage: c.stage }; c.stage = p.to;
        logActivity(c, 'stage', `El agente lo avanzó a ${stageById(p.to).name} (Job-Match ${p.match} %)`, 'Agente');
    } else if (p.type === 'scorecard_reminder' && c) {
        logActivity(c, 'score', `El agente recordó a ${p.interviewer} rellenar la scorecard`, 'Agente');
    } else if (c && p.email) {
        const em = { id: uid('em'), subject: p.email.subject, body: p.email.body, template: 'Agente · ' + autoTypeById(p.type).name, date: todayISO(), direction: 'out' };
        c.emails = c.emails || []; c.emails.unshift(em); p.undo = { emailId: em.id };
        logActivity(c, 'email', `El agente envió: ${p.email.subject}`, 'Agente');
        if (p.type === 'reject') { p.undo.stage = c.stage; c.stage = 'rechazado'; logActivity(c, 'reject', 'Rechazado tras aprobación humana', 'RRHH'); }
        if (p.type === 'send_test') logActivity(c, 'stage', 'Test de evaluación enviado por el agente', 'Agente');
    }
    agentLogPush(`${autoTypeById(p.type).icon} ${p.title} — ${p.level === 'L3' ? 'ejecutado en autonomía L3' : 'aprobado por humano'}`);
}
function approveProposal(id) {
    const p = (state.proposals || []).find(x => x.id === id);
    if (!p || p.status !== 'pending') return;
    executeProposal(p);
    p.status = 'executed'; p.executed = todayISO();
    save(); toast('✓ Acción ejecutada', 'ok'); render();
}
function dismissProposal(id) {
    const p = (state.proposals || []).find(x => x.id === id); if (!p) return;
    p.status = 'dismissed'; state.dismissedKeys.push(p.key);
    save(); toast('Propuesta descartada', 'info'); render();
}
function undoProposal(id) {
    const p = (state.proposals || []).find(x => x.id === id);
    if (!p || !p.undo) { toast('Esta acción no se puede deshacer', 'info'); return; }
    const c = p.candidateId ? state.candidates.find(x => x.id === p.candidateId) : null;
    if (p.undo.emailId && c) c.emails = (c.emails || []).filter(e => e.id !== p.undo.emailId);
    if (p.undo.stage && c) c.stage = p.undo.stage;
    if (p.undo.status && p.jobId) { const j = jobById(p.jobId); if (j) j.status = p.undo.status; }
    if (c) logActivity(c, 'stage', `Acción del agente deshecha: ${p.title}`, 'RRHH');
    p.status = 'undone'; state.dismissedKeys.push(p.key);
    agentLogPush(`↩ Deshecho por humano: ${p.title}`);
    save(); toast('↩ Acción deshecha', 'ok'); render();
}
function editProposal(id) {
    const p = (state.proposals || []).find(x => x.id === id);
    if (!p || !p.email) return;
    openModal(`
        <h2>Editar antes de aprobar</h2><div class="modal-sub">${p.title} · el agente redactó este borrador; ajústalo a tu gusto.</div>
        <form id="propForm">
            <div class="field"><label>Asunto</label><input name="subject" value="${p.email.subject.replace(/"/g, '&quot;')}"></div>
            <div class="field"><label>Mensaje</label><textarea name="body" style="min-height:180px">${p.email.body}</textarea></div>
            <div class="modal-actions">
                <button type="button" class="btn-outline" onclick="closeModal();render()">Cancelar</button>
                <button type="submit" class="btn-primary">Aprobar y ejecutar</button>
            </div>
        </form>`);
    document.getElementById('propForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        p.email.subject = f.subject; p.email.body = f.body;
        closeModal(); approveProposal(id);
    });
}

function radarChart(axes, values, max, color) {
    const N = axes.length, R = 82, cx = 110, cy = 108;
    const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    let grid = '';
    [0.25, 0.5, 0.75, 1].forEach(f => { grid += `<polygon points="${axes.map((_, i) => pt(i, R * f).join(',')).join(' ')}" fill="none" stroke="var(--border)" stroke-width="1"/>`; });
    let spokes = '', labels = '';
    axes.forEach((ax, i) => { const [x, y] = pt(i, R); spokes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--border)"/>`; const [lx, ly] = pt(i, R + 15); labels += `<text x="${lx}" y="${ly}" font-size="9" fill="var(--muted)" text-anchor="middle" dominant-baseline="middle">${ax.short || ax.name}</text>`; });
    const pts = values.map((v, i) => pt(i, R * Math.min(1, (v || 0) / max)).join(',')).join(' ');
    return `<svg viewBox="0 0 220 216" width="100%" style="max-width:240px">${grid}${spokes}<polygon points="${pts}" fill="${color}33" stroke="${color}" stroke-width="2"/>${labels}</svg>`;
}
function barMeter(label, val, max, color, sub) {
    return `<div class="bar-row"><span class="bar-label">${label}</span><div class="bar-track"><div class="bar-fill" style="width:${(val / max) * 100}%;background:${color || 'var(--brand)'}"></div></div><span class="bar-val">${val}${sub || ''}</span></div>`;
}

/* ---------- Vista Cultura & Fit ---------- */
function renderCulture() {
    const dna = state.settings.dna;
    const scored = activeCandidates().map(c => ({ c, fit: fitScore(c), vp: valuesFitPct(c), tb: topBelbin(c) }))
        .filter(x => x.fit != null).sort((a, b) => b.fit - a.fit);
    content.innerHTML = `
        <div class="page-head"><div><h1>Cultura &amp; Fit</h1><p>ADN de empresa, alineamiento por valores y evaluación de talento</p></div>
        <button class="btn-primary" onclick="openDnaForm()">⚙ Editar ADN</button></div>
        <div class="grid-2">
            <div class="panel">
                <h3>🧭 ADN de la empresa</h3>
                <div class="cd-section-title">Misión</div><p style="font-size:13px;color:var(--muted);line-height:1.6">${dna.mission || '—'}</p>
                <div class="cd-section-title">Visión</div><p style="font-size:13px;color:var(--muted);line-height:1.6">${dna.vision || '—'}</p>
                <div class="cd-section-title">Valores</div>
                ${(dna.values || []).map(v => `<div class="value-item"><strong>${v.name}</strong><span>${v.desc || ''}</span></div>`).join('')}
            </div>
            <div class="panel">
                <h3>🏅 Ranking de encaje</h3>
                <p style="color:var(--muted);font-size:12px;margin-bottom:12px">Candidatos activos ordenados por Fit score (valores + evaluación).</p>
                ${scored.length ? scored.map(({ c, fit, tb }) => `
                    <div class="fit-row" onclick="openCandidate('${c.id}','evaluacion')">
                        <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
                        <div style="flex:1;min-width:0"><div class="cc-name">${c.name}</div><div class="cc-role">${tb ? 'Belbin: ' + tb[0].r.name : 'Sin perfil Belbin'}</div></div>
                        <div class="fit-badge" style="background:${fitColor(fit)}22;color:${fitColor(fit)}">${fit}%</div>
                    </div>`).join('') : '<p style="color:var(--muted);font-size:13px">Aún no hay evaluaciones. Abre la ficha de un candidato → pestaña «Evaluación».</p>'}
            </div>
        </div>`;
}

function openDnaForm() {
    const dna = state.settings.dna;
    openModal(`
        <h2>ADN de la empresa</h2><div class="modal-sub">Define misión, visión y valores. Sirven de referencia para evaluar el encaje cultural.</div>
        <form id="dnaForm">
            <div class="field"><label>Misión</label><textarea name="mission">${dna.mission || ''}</textarea></div>
            <div class="field"><label>Visión</label><textarea name="vision">${dna.vision || ''}</textarea></div>
            <div class="field"><label>Valores (uno por línea, formato «Nombre | descripción»)</label>
            <textarea name="values" style="min-height:130px">${(dna.values || []).map(v => v.name + (v.desc ? ' | ' + v.desc : '')).join('\n')}</textarea></div>
            <div class="modal-actions"><button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn-primary">Guardar ADN</button></div>
        </form>`);
    document.getElementById('dnaForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        const values = f.values.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [name, ...d] = l.split('|'); return { name: name.trim(), desc: d.join('|').trim() }; });
        state.settings.dna = { mission: f.mission, vision: f.vision, values };
        save(); closeModal(); toast('ADN actualizado', 'ok'); render();
    });
}

/* ---------- Pestaña Evaluación (ficha) ---------- */
function evaluationTab(c) {
    const a = c.assess || {};
    const vp = valuesFitPct(c), fit = fitScore(c);
    const dna = state.settings.dna;
    // Valores
    const valuesBlock = `
        <div class="assess-head"><div class="cd-section-title" style="margin:0">Alineamiento con valores ${vp != null ? `· <span style="color:${fitColor(vp)}">${vp}%</span>` : ''}</div><button class="btn-outline btn-sm" onclick="openAssessValues('${c.id}')">Evaluar</button></div>
        ${a.valuesFit ? (dna.values || []).map(v => barMeter(v.name, a.valuesFit[v.name] || 0, 5, '#7c5cff', ' /5')).join('') + (a.valuesComment ? `<div class="sc-comment">"${a.valuesComment}"</div>` : '') : '<p class="assess-empty">Sin evaluar los valores.</p>'}`;
    // Belbin
    const tb = topBelbin(c);
    const belbinBlock = `
        <div class="assess-head"><div class="cd-section-title" style="margin:0">Roles de equipo de Belbin</div><button class="btn-outline btn-sm" onclick="openAssessBelbin('${c.id}')">Evaluar</button></div>
        ${a.belbin ? `<div class="radar-wrap"><div>${radarChart(BELBIN_ROLES.map(r => ({ short: r.id })), BELBIN_ROLES.map(r => a.belbin[r.id] || 0), 10, '#2fce8a')}</div>
            <div class="belbin-top">${tb ? tb.slice(0, 3).map((x, i) => `<div class="belbin-role"><span class="rank">${i + 1}º</span><span class="dot" style="background:${x.r.color}"></span><div><strong>${x.r.name}</strong> <small>(${x.r.cluster})</small><div class="cc-role">${x.r.desc}</div></div><b>${x.v}</b></div>`).join('') : ''}</div></div>` : '<p class="assess-empty">Sin perfil Belbin.</p>'}`;
    // Big Five + DISC
    const persBlock = `
        <div class="assess-head"><div class="cd-section-title" style="margin:0">Personalidad (Big Five &amp; DISC)</div><button class="btn-outline btn-sm" onclick="openAssessPersonality('${c.id}')">Evaluar</button></div>
        ${a.bigfive || a.disc ? `<div class="grid-2">
            <div>${a.bigfive ? '<div class="cc-role" style="margin-bottom:8px">Big Five (OCEAN)</div>' + BIGFIVE.map(d => barMeter(d.name, a.bigfive[d.id] || 0, 100, '#5b8cff', '%')).join('') : ''}</div>
            <div>${a.disc ? '<div class="cc-role" style="margin-bottom:8px">DISC</div>' + DISC.map(d => barMeter(d.name, a.disc[d.id] || 0, 100, d.color, '%')).join('') : ''}</div>
        </div>` : '<p class="assess-empty">Sin perfil de personalidad.</p>'}`;
    // Psicotécnico
    const psychBlock = `
        <div class="assess-head"><div class="cd-section-title" style="margin:0">Aptitudes psicotécnicas (percentil)</div><button class="btn-outline btn-sm" onclick="openAssessPsych('${c.id}')">Evaluar</button></div>
        ${a.psycho ? PSICO.map(t => barMeter(t.name, a.psycho[t.id] || 0, 100, '#22c1c3', ' pc')).join('') : '<p class="assess-empty">Sin prueba psicotécnica.</p>'}`;
    const done = c.assess && c.assess.selfCompleted;
    const inviteBar = `<div class="invite-bar ${done ? 'ok' : ''}">
        <div>${done ? `✅ El candidato completó el test el <strong>${c.assess.selfCompleted}</strong>` : '📋 Deja que el <strong>propio candidato</strong> rellene su evaluación con un test autoadministrado'}</div>
        <button class="btn-primary btn-sm" onclick="openAssessInvite('${c.id}')">${done ? 'Reenviar test' : 'Enviar test al candidato'}</button>
    </div>`;
    const jm = jobMatch(c, jobById(c.jobId));
    return `
        ${inviteBar}
        <div class="fit-summary">
            <div class="fit-big" style="color:${fitColor(fit)}">${fit != null ? fit + '%' : '—'}</div>
            <div style="flex:1"><div style="font-weight:700">${fitLabel(fit)} ${c.assess && c.assess.selfReported ? '<span class="badge dept" style="vertical-align:middle">Autoevaluado</span>' : ''}</div><div class="cc-role">Fit score compuesto (valores + evaluación técnica)</div></div>
            ${jm != null ? `<div style="text-align:right"><div class="fit-big" style="font-size:24px;color:${fitColor(jm)}">${jm}%</div><div class="cc-role">Job-Match con el puesto</div></div>` : ''}
        </div>
        ${valuesBlock}<hr class="assess-sep">${belbinBlock}<hr class="assess-sep">${persBlock}<hr class="assess-sep">${psychBlock}`;
}

function openAssessInvite(id) {
    const c = state.candidates.find(x => x.id === id);
    const link = `assessment.html?cid=${id}`;
    const abs = location.href.replace(/[^/]*$/, '') + link;
    const done = c.assess && c.assess.selfCompleted;
    openModal(`
        <h2>Test de autoevaluación</h2><div class="modal-sub">Envía este enlace a ${c.name}. Al completarlo, su perfil (valores, Belbin, Big Five, DISC y psicotécnico) se rellena automáticamente y se recalcula el Fit score.</div>
        ${done ? `<div class="invite-bar ok" style="margin-bottom:14px">✅ Ya completó el test el <strong>${c.assess.selfCompleted}</strong>. Reenviar lo dejará rehacerlo.</div>` : ''}
        <div class="cd-section-title">Enlace personalizado del candidato</div>
        <pre class="codeblock" id="assessLink">${abs}</pre>
        <button class="btn-primary btn-sm" onclick="copyText('assessLink')">Copiar enlace</button>
        <div class="cd-section-title" style="margin-top:16px">O que lo haga aquí mismo</div>
        <p style="font-size:13px;color:var(--muted)">Lanza el test <strong>dentro de la app</strong> (ideal para demo o para que el candidato lo haga en tu equipo). Al terminar, el perfil se rellena solo.</p>
        <div class="modal-actions">
            <button class="btn-outline" onclick="window.open('${link}','_blank')">↗ Abrir enlace externo</button>
            <button class="btn-primary" onclick="openSelfTest('${id}')">▶ Realizar test ahora</button>
        </div>`, 'wide');
}

/* ============================================================
   Test autoadministrado DENTRO de la app (mismo cuestionario)
   ============================================================ */
const Q_BELBIN = [
    ['CE','Propongo ideas originales y poco convencionales.'],['CE','Disfruto resolviendo problemas complejos.'],['CE','Prefiero pensar de forma creativa antes que seguir lo establecido.'],
    ['ME','Analizo las opciones con objetividad antes de decidir.'],['ME','Detecto fallos en los razonamientos de los demás.'],['ME','Soy prudente y ponderado al juzgar.'],
    ['ES','Aporto conocimientos técnicos especializados.'],['ES','Me gusta profundizar a fondo en mi área.'],['ES','Prefiero dominar un tema que abarcar muchos.'],
    ['CO','Sé delegar y sacar lo mejor de cada persona.'],['CO','Clarifico los objetivos del equipo.'],['CO','Coordino con facilidad a personas diversas.'],
    ['CH','Me preocupo por el clima y las relaciones del equipo.'],['CH','Busco el consenso y evito los conflictos.'],['CH','Escucho y apoyo a mis compañeros.'],
    ['IR','Hago contactos y exploro oportunidades fuera del equipo.'],['IR','Soy entusiasta y comunicativo.'],['IR','Busco ideas y recursos en el exterior.'],
    ['IS','Empujo al equipo para superar obstáculos.'],['IS','Trabajo bien bajo presión.'],['IS','Soy directo y orientado a resultados.'],
    ['ID','Convierto las ideas en tareas y planes concretos.'],['ID','Soy organizado y metódico.'],['ID','Cumplo lo acordado de forma fiable.'],
    ['FI','Reviso el trabajo en busca de errores.'],['FI','Me aseguro de cumplir los plazos.'],['FI','Cuido los detalles hasta el final.'],
];
const Q_BIGFIVE = [
    ['O','Tengo una imaginación vívida.',0],['O','Me interesan las ideas abstractas.',0],['O','Evito los conceptos complejos.',1],['O','Tengo poca curiosidad artística.',1],
    ['C','Soy ordenado y cuidadoso.',0],['C','Cumplo mis tareas a tiempo.',0],['C','Suelo dejar mis cosas desordenadas.',1],['C','A veces descuido mis obligaciones.',1],
    ['E','Me siento cómodo entre mucha gente.',0],['E','Inicio conversaciones con facilidad.',0],['E','Soy callado con desconocidos.',1],['E','Prefiero pasar desapercibido.',1],
    ['A','Me intereso de verdad por los demás.',0],['A','Empatizo con los sentimientos ajenos.',0],['A','Me cuesta preocuparme por otros.',1],['A','A veces soy poco considerado.',1],
    ['S','Suelo estar relajado.',0],['S','Gestiono bien el estrés.',0],['S','Me preocupo por muchas cosas.',1],['S','Cambio de humor con facilidad.',1],
];
const Q_DISC = [
    ['D','Me gusta tomar el control de las situaciones.'],['D','Soy directo al expresar lo que quiero.'],['D','Asumo riesgos para lograr resultados.'],
    ['I','Convenzo a los demás con facilidad.'],['I','Soy sociable y optimista.'],['I','Disfruto interactuando con gente nueva.'],
    ['S','Prefiero entornos estables y predecibles.'],['S','Soy paciente y buen oyente.'],['S','Apoyo a los demás con constancia.'],
    ['C','Sigo las normas y procedimientos.'],['C','Cuido la precisión y los detalles.'],['C','Analizo los datos antes de actuar.'],
];
const Q_PSICO = [
    ['verbal','Sinónimo de «efímero»:',['Duradero','Pasajero','Enorme','Costoso'],1],
    ['verbal','Antónimo de «escaso»:',['Limitado','Insuficiente','Abundante','Raro'],2],
    ['verbal','Completa: «La explicación fue tan ___ que nadie tuvo dudas».',['confusa','clara','extensa','técnica'],1],
    ['numerico','Un producto cuesta 80 € y sube un 25 %. Precio final:',['96 €','100 €','105 €','110 €'],1],
    ['numerico','Serie: 3, 6, 12, 24, ?',['30','36','48','60'],2],
    ['numerico','El 15 % de 200 es:',['15','20','30','45'],2],
    ['logico','Todos los A son B. Algún B es C. Por tanto:',['Todo A es C','Algún A podría ser C','Ningún A es C','Todo C es A'],1],
    ['logico','«Si llueve, la calle se moja». La calle NO está mojada. Entonces:',['Llovió','No llovió','Quizá llovió','Falta información'],1],
    ['logico','Ordena de menor a mayor: 1/2 · 0,4 · 3/5',['0,4 < 1/2 < 3/5','1/2 < 0,4 < 3/5','3/5 < 1/2 < 0,4','0,4 < 3/5 < 1/2'],0],
    ['abstracto','Serie: 2, 4, 8, 16, ?',['24','32','30','20'],1],
    ['abstracto','▲, ▲▲, ▲▲▲, ? → nº de triángulos siguiente:',['3','4','5','6'],1],
    ['abstracto','Patrón: 1, 1, 2, 3, 5, 8, ?',['11','12','13','15'],2],
];

function openSelfTest(id) {
    const c = state.candidates.find(x => x.id === id); if (!c) return;
    const values = (state.settings.dna.values || []).map(v => v.name);
    const steps = ['intro', 'values', 'belbin', 'personality', 'psico'];
    const ans = { values: {}, belbin: {}, bigfive: {}, disc: {}, psico: {} };
    let step = 0;

    const likert = (name, cur) => `<div class="likert">${[1,2,3,4,5].map(n => `<label><input type="radio" name="${name}" value="${n}" ${cur == n ? 'checked' : ''}><span class="dot">${n}</span></label>`).join('')}</div><div class="scale-ends"><span>Muy en desacuerdo</span><span>Muy de acuerdo</span></div>`;
    const qrow = (text, ctrl) => `<div class="q"><div class="qtext">${text}</div>${ctrl}</div>`;

    function complete() {
        const s = steps[step];
        if (s === 'values') return values.every((_, i) => ans.values['v' + i] != null);
        if (s === 'belbin') return Q_BELBIN.every((_, i) => ans.belbin['b' + i] != null);
        if (s === 'personality') return Q_BIGFIVE.every((_, i) => ans.bigfive['f' + i] != null) && Q_DISC.every((_, i) => ans.disc['d' + i] != null);
        if (s === 'psico') return Q_PSICO.every((_, i) => ans.psico['p' + i] != null);
        return true;
    }
    function draw() {
        const s = steps[step]; const pct = Math.round(step / steps.length * 100);
        let inner = '';
        if (s === 'intro') {
            inner = `<h2>Test de evaluación de talento</h2>
                <div class="modal-sub">Este cuestionario lo responde <strong>${c.name}</strong>. Mide valores, roles de equipo (Belbin), personalidad (Big Five y DISC) y aptitudes. Al finalizar, el perfil se calcula y guarda automáticamente. ~8 min.</div>
                <ul class="intro-list">
                    <li><span class="ic">🎯</span> Valores de empresa</li>
                    <li><span class="ic">🧩</span> Roles de equipo (Belbin)</li>
                    <li><span class="ic">🧠</span> Personalidad (Big Five y DISC)</li>
                    <li><span class="ic">📐</span> Aptitudes (verbal, numérico, lógico, abstracto)</li>
                </ul>
                <div class="modal-actions"><button class="btn-outline" onclick="closeModal()">Cancelar</button><button class="btn-primary" id="stNext">Empezar →</button></div>`;
        } else {
            const bar = `<div class="progress"><div style="width:${pct}%"></div></div><div class="steplabel">Paso ${step} de ${steps.length - 1}</div>`;
            let qs = '';
            if (s === 'values') qs = `<h2>🎯 Valores</h2><p class="modal-sub">Indica cuánto te identificas con cada afirmación.</p>` + values.map((v, i) => qrow(`Me identifico con el valor: «${v}»`, likert('values:v' + i, ans.values['v' + i]))).join('');
            else if (s === 'belbin') qs = `<h2>🧩 Roles de equipo</h2><p class="modal-sub">Cómo sueles comportarte en equipo.</p>` + Q_BELBIN.map((q, i) => qrow(q[1], likert('belbin:b' + i, ans.belbin['b' + i]))).join('');
            else if (s === 'personality') qs = `<h2>🧠 Personalidad</h2><p class="modal-sub">Tu forma de ser y de trabajar.</p>` + Q_BIGFIVE.map((q, i) => qrow(q[1], likert('bigfive:f' + i, ans.bigfive['f' + i]))).join('') + Q_DISC.map((q, i) => qrow(q[1], likert('disc:d' + i, ans.disc['d' + i]))).join('');
            else if (s === 'psico') qs = `<h2>📐 Aptitudes</h2><p class="modal-sub">Elige la respuesta correcta (una por pregunta).</p>` + Q_PSICO.map((q, i) => `<div class="q"><div class="qtext">${i + 1}. ${q[1]}</div><div class="opts">${q[2].map((o, oi) => `<label><input type="radio" name="psico:p${i}" value="${oi}" ${ans.psico['p' + i] == oi ? 'checked' : ''}><span>${o}</span></label>`).join('')}</div></div>`).join('');
            const last = step === steps.length - 1;
            inner = bar + qs + `<div class="modal-actions"><button class="btn-outline" id="stPrev">← Atrás</button><button class="btn-primary" id="stNext" ${complete() ? '' : 'disabled'}>${last ? 'Finalizar y guardar' : 'Continuar →'}</button></div>`;
        }
        modalBody.innerHTML = `<div class="selftest">${inner}</div>`;
        modalEl.classList.add('wide');
        modalBody.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', () => {
            const [grp, idx] = r.name.split(':'); ans[grp][idx] = +r.value;
            const nb = document.getElementById('stNext'); if (nb) nb.disabled = !complete();
        }));
        const prev = document.getElementById('stPrev'); if (prev) prev.onclick = () => { step--; draw(); modalBody.scrollTop = 0; };
        const nb = document.getElementById('stNext');
        nb.onclick = () => {
            if (step > 0 && !complete()) return;
            if (step === steps.length - 1) return finishTest();
            step++; draw(); modalBody.scrollTop = 0;
        };
    }
    function finishTest() {
        // Puntuación (idéntica a assessment.html)
        const valuesFit = {}; values.forEach((v, i) => valuesFit[v] = ans.values['v' + i] || 0);
        const bs = {}, bn = {}; Q_BELBIN.forEach((q, i) => { bs[q[0]] = (bs[q[0]] || 0) + (ans.belbin['b' + i] || 0); bn[q[0]] = (bn[q[0]] || 0) + 1; });
        const belbin = {}; Object.keys(bs).forEach(r => belbin[r] = Math.round((bs[r] / bn[r] - 1) / 4 * 10));
        const fs = {}, fn = {}; Q_BIGFIVE.forEach((q, i) => { let v = ans.bigfive['f' + i] || 0; if (q[2] === 1) v = 6 - v; fs[q[0]] = (fs[q[0]] || 0) + v; fn[q[0]] = (fn[q[0]] || 0) + 1; });
        const bigfive = {}; Object.keys(fs).forEach(d => bigfive[d] = Math.round((fs[d] / fn[d]) / 5 * 100));
        const ds = {}, dn = {}; Q_DISC.forEach((q, i) => { ds[q[0]] = (ds[q[0]] || 0) + (ans.disc['d' + i] || 0); dn[q[0]] = (dn[q[0]] || 0) + 1; });
        const disc = {}; Object.keys(ds).forEach(d => disc[d] = Math.round((ds[d] / dn[d]) / 5 * 100));
        const ok = {}, tt = {}; Q_PSICO.forEach((q, i) => { tt[q[0]] = (tt[q[0]] || 0) + 1; if (ans.psico['p' + i] === q[3]) ok[q[0]] = (ok[q[0]] || 0) + 1; });
        const psycho = {}; Object.keys(tt).forEach(a => psycho[a] = Math.round((ok[a] || 0) / tt[a] * 100));
        c.assess = Object.assign({}, c.assess, { valuesFit, belbin, bigfive, disc, psycho, selfCompleted: todayISO(), selfReported: true });
        logActivity(c, 'score', 'Completó el test de evaluación (autoevaluación)', c.name);
        save();
        const topRole = Object.entries(belbin).sort((a, b) => b[1] - a[1])[0];
        const psAvg = Math.round(Object.values(psycho).reduce((s, v) => s + v, 0) / Object.keys(psycho).length);
        modalBody.innerHTML = `<div class="selftest"><div class="done"><div class="tick">✓</div>
            <h2>¡Test completado!</h2>
            <p class="modal-sub">Perfil de ${c.name} registrado y Fit score recalculado (${fitScore(c)}%).</p>
            <div class="result-grid">
                <div class="rescard"><div class="rl">Rol de equipo principal</div><div class="rv">${belbinById(topRole[0]) ? belbinById(topRole[0]).name : '—'}</div></div>
                <div class="rescard"><div class="rl">Aptitud psicotécnica</div><div class="rv">${psAvg}% aciertos</div></div>
            </div>
            <div class="modal-actions"><button class="btn-primary" onclick="openCandidate('${c.id}','evaluacion')">Ver resultados</button></div>
        </div></div>`;
    }
    openModal('', 'wide'); draw();
}

function openAssessValues(id) {
    const c = state.candidates.find(x => x.id === id); const vf = (c.assess && c.assess.valuesFit) || {};
    openModal(`
        <h2>Alineamiento con valores</h2><div class="modal-sub">Valora 1–5 cómo demuestra ${c.name} cada valor de la empresa.</div>
        <form id="vForm">
        ${(state.settings.dna.values || []).map((v, i) => `<div class="sc-input-row"><span title="${v.desc || ''}">${v.name}</span><div class="score-picker" data-v="${i}">${[1, 2, 3, 4, 5].map(n => `<span data-n="${n}" class="${(vf[v.name] || 0) >= n ? 'on' : ''}">●</span>`).join('')}</div></div>`).join('')}
        <div class="field full" style="margin-top:12px"><label>Comentario</label><textarea name="comment">${(c.assess && c.assess.valuesComment) || ''}</textarea></div>
        <div class="modal-actions"><button type="button" class="btn-outline" onclick="openCandidate('${id}','evaluacion')">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div></form>`, 'wide');
    const scores = {}; (state.settings.dna.values || []).forEach((v, i) => { scores[i] = vf[v.name] || 0; });
    document.querySelectorAll('.score-picker').forEach(sp => sp.querySelectorAll('span').forEach(dot => dot.addEventListener('click', () => {
        const n = +dot.dataset.n; scores[sp.dataset.v] = n; sp.querySelectorAll('span').forEach(d => d.classList.toggle('on', +d.dataset.n <= n));
    })));
    document.getElementById('vForm').addEventListener('submit', e => {
        e.preventDefault();
        const valuesFit = {}; (state.settings.dna.values || []).forEach((v, i) => { valuesFit[v.name] = scores[i] || 0; });
        c.assess = c.assess || {}; c.assess.valuesFit = valuesFit; c.assess.valuesComment = new FormData(e.target).get('comment');
        logActivity(c, 'score', `Evaluación de valores: ${valuesFitPct(c)}% de encaje`);
        save(); openCandidate(id, 'evaluacion'); toast('Alineamiento guardado', 'ok');
    });
}

function sliderRow(label, name, val, max, sub) {
    return `<div class="slider-row"><span class="slider-label">${label}</span><input type="range" name="${name}" min="0" max="${max}" value="${val || 0}" oninput="this.nextElementSibling.textContent=this.value+'${sub || ''}'"><span class="slider-val">${val || 0}${sub || ''}</span></div>`;
}
function openAssessBelbin(id) {
    const c = state.candidates.find(x => x.id === id); const b = (c.assess && c.assess.belbin) || {};
    openModal(`
        <h2>Roles de equipo de Belbin</h2><div class="modal-sub">Puntúa 0–10 la presencia de cada rol en ${c.name}.</div>
        <form id="bForm">${BELBIN_ROLES.map(r => sliderRow(`<span class="dot" style="background:${r.color}"></span> ${r.name} <small style="color:var(--muted)">${r.cluster}</small>`, r.id, b[r.id], 10)).join('')}
        <div class="modal-actions"><button type="button" class="btn-outline" onclick="openCandidate('${id}','evaluacion')">Cancelar</button><button type="submit" class="btn-primary">Guardar perfil</button></div></form>`, 'wide');
    document.getElementById('bForm').addEventListener('submit', e => {
        e.preventDefault(); const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        const belbin = {}; BELBIN_ROLES.forEach(r => belbin[r.id] = +f[r.id] || 0);
        c.assess = c.assess || {}; c.assess.belbin = belbin;
        const tb = topBelbin(c); logActivity(c, 'score', `Perfil Belbin: rol principal ${tb ? tb[0].r.name : '—'}`);
        save(); openCandidate(id, 'evaluacion'); toast('Perfil Belbin guardado', 'ok');
    });
}
function openAssessPersonality(id) {
    const c = state.candidates.find(x => x.id === id); const bf = (c.assess && c.assess.bigfive) || {}; const dc = (c.assess && c.assess.disc) || {};
    openModal(`
        <h2>Personalidad</h2><div class="modal-sub">Big Five (OCEAN) y DISC de ${c.name} (0–100).</div>
        <form id="pForm">
        <div class="cd-section-title">Big Five (OCEAN)</div>${BIGFIVE.map(d => sliderRow(`${d.name} <small style="color:var(--muted)">${d.desc}</small>`, 'bf_' + d.id, bf[d.id], 100, '%')).join('')}
        <div class="cd-section-title">DISC</div>${DISC.map(d => sliderRow(d.name, 'dc_' + d.id, dc[d.id], 100, '%')).join('')}
        <div class="modal-actions"><button type="button" class="btn-outline" onclick="openCandidate('${id}','evaluacion')">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div></form>`, 'wide');
    document.getElementById('pForm').addEventListener('submit', e => {
        e.preventDefault(); const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        const bigfive = {}; BIGFIVE.forEach(d => bigfive[d.id] = +f['bf_' + d.id] || 0);
        const disc = {}; DISC.forEach(d => disc[d.id] = +f['dc_' + d.id] || 0);
        c.assess = c.assess || {}; c.assess.bigfive = bigfive; c.assess.disc = disc;
        logActivity(c, 'score', 'Perfil de personalidad actualizado');
        save(); openCandidate(id, 'evaluacion'); toast('Personalidad guardada', 'ok');
    });
}
function openAssessPsych(id) {
    const c = state.candidates.find(x => x.id === id); const ps = (c.assess && c.assess.psycho) || {};
    openModal(`
        <h2>Prueba psicotécnica</h2><div class="modal-sub">Percentil (0–100) de ${c.name} en cada aptitud.</div>
        <form id="psForm">${PSICO.map(t => sliderRow(t.name, t.id, ps[t.id], 100, ' pc')).join('')}
        <div class="modal-actions"><button type="button" class="btn-outline" onclick="openCandidate('${id}','evaluacion')">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div></form>`, 'wide');
    document.getElementById('psForm').addEventListener('submit', e => {
        e.preventDefault(); const f = sanitizeObj(Object.fromEntries(new FormData(e.target).entries()));
        const psycho = {}; PSICO.forEach(t => psycho[t.id] = +f[t.id] || 0);
        c.assess = c.assess || {}; c.assess.psycho = psycho;
        logActivity(c, 'score', 'Prueba psicotécnica registrada');
        save(); openCandidate(id, 'evaluacion'); toast('Psicotécnico guardado', 'ok');
    });
}

/* ============================================================
   Adjuntos (subida múltiple de archivos: PDF, PNG, JPG)
   ============================================================ */
const CV_MAX = 3 * 1024 * 1024; // 3 MB por archivo
function guessType(name) { return /\.pdf$/i.test(name) ? 'application/pdf' : /\.png$/i.test(name) ? 'image/png' : 'image/jpeg'; }
function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
function isImg(a) { return a && /image\//.test(a.type); }
function attachmentsOf(c) { return c.attachments || (c.cv ? [c.cv] : []); }
function attCount(c) { return attachmentsOf(c).length; }

function attachFieldHTML(list) {
    return `<label>Documentos (CV, carta, portfolio… · PDF, PNG o JPG · máx 3 MB c/u)</label>
        <input type="file" id="attachInput" class="file-input" multiple accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg">
        <div id="attachList" class="attach-list">${attachChips(list)}</div>`;
}
function attachChips(list) {
    if (!list || !list.length) return '<span class="cv-hint">Ningún archivo aún · puedes subir varios</span>';
    return list.map((a, i) => `<span class="attach-chip">${isImg(a) ? '🖼️' : '📄'} ${a.name} <small>${fmtSize(a.size)}</small> <button type="button" class="attach-x" data-i="${i}">✕</button></span>`).join('');
}
function wireAttachInput(getList, setList) {
    const inp = document.getElementById('attachInput'); if (!inp) return;
    const refresh = () => {
        const el = document.getElementById('attachList'); if (!el) return;
        el.innerHTML = attachChips(getList());
        el.querySelectorAll('.attach-x').forEach(b => b.onclick = () => { const l = getList().slice(); l.splice(+b.dataset.i, 1); setList(l); refresh(); });
    };
    inp.addEventListener('change', () => {
        const files = [...inp.files]; let pending = files.length; if (!pending) return;
        files.forEach(f => {
            const ok = /pdf|png|jpe?g/i.test(f.type) || /\.(pdf|png|jpe?g)$/i.test(f.name);
            if (!ok) { toast('Formato no válido: ' + f.name, 'info'); if (!--pending) refresh(); return; }
            if (f.size > CV_MAX) { toast('Muy grande (máx 3 MB): ' + f.name, 'info'); if (!--pending) refresh(); return; }
            const r = new FileReader();
            r.onload = () => { setList([...getList(), { name: f.name, type: f.type || guessType(f.name), dataUrl: r.result, size: f.size }]); if (!--pending) refresh(); };
            r.readAsDataURL(f);
        });
        inp.value = '';
    });
    refresh();
}
function renderAttachments(c) {
    const list = attachmentsOf(c);
    if (!list.length) return '<span style="color:var(--muted);font-size:13px">Sin documentos adjuntos.</span>';
    return `<div class="attach-grid">${list.map((a, i) => {
        const thumb = isImg(a) ? `<img src="${a.dataUrl}" class="cv-thumb" alt="doc">` : `<div class="cv-thumb cv-pdf">PDF</div>`;
        return `<div class="cv-box">${thumb}<div class="cv-info"><div class="cv-name">${isImg(a) ? '🖼️' : '📄'} ${a.name}</div><div class="cv-meta">${fmtSize(a.size)}</div>
            <div class="cv-actions"><button class="btn-outline btn-sm" onclick="openAttachment('${c.id}',${i})">Ver</button>
            <a class="btn-outline btn-sm" href="${a.dataUrl}" download="${a.name}">Descargar</a></div></div></div>`;
    }).join('')}</div>`;
}
function openAttachment(id, idx) {
    const c = state.candidates.find(x => x.id === id); if (!c) return;
    const a = attachmentsOf(c)[idx]; if (!a) return;
    const view = isImg(a) ? `<img src="${a.dataUrl}" style="max-width:100%;border-radius:10px">`
        : `<iframe src="${a.dataUrl}" style="width:100%;height:68vh;border:none;border-radius:10px;background:#fff"></iframe>`;
    openModal(`<h2>${a.name}</h2><div class="modal-sub">${c.name} · ${fmtSize(a.size)}</div>${view}
        <div class="modal-actions"><a class="btn-outline" href="${a.dataUrl}" download="${a.name}">Descargar</a><button class="btn-primary" onclick="closeModal()">Cerrar</button></div>`, 'wide');
}

/* ============================================================
   Utilidades UI
   ============================================================ */
function initials(name) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
function avatarColor(name) { let h = 0; for (const ch of name) h = ch.charCodeAt(0) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]; }
function matchSearch(text) { return !searchTerm || text.toLowerCase().includes(searchTerm); }
function emptyState(emoji, title, sub) { return `<div class="empty"><span class="emoji">${emoji}</span><h3 style="margin-bottom:6px">${title}</h3><p>${sub}</p></div>`; }

const overlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalEl = document.getElementById('modal');
function openModal(html, size) { modalBody.innerHTML = html; modalEl.classList.toggle('wide', size === 'wide'); overlay.classList.add('show'); }
function closeModal() { overlay.classList.remove('show'); modalBody.innerHTML = ''; }
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

let toastTimer;
function toast(msg, type = 'info') {
    const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast show ' + type;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- Eventos globales ---------- */
document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => {
    currentView = n.dataset.view; sel.clear(); render();
    document.getElementById('sidebar').classList.remove('open');
}));
document.getElementById('newJobBtn').addEventListener('click', () => openJobForm());
document.getElementById('newCandidateBtn').addEventListener('click', () => openCandidateForm());
document.getElementById('globalSearch').addEventListener('input', e => { searchTerm = e.target.value.toLowerCase().trim(); render(); });
document.getElementById('hamburger').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('seedBtn').addEventListener('click', () => { if (confirm('Restaurar los datos de ejemplo y reemplazar los actuales?')) { seedData(); render(); toast('Datos demo cargados', 'ok'); } });
document.getElementById('resetBtn').addEventListener('click', () => { if (confirm('¿Borrar TODOS los datos?')) { state = { jobs: [], candidates: [], templates: [], automations: [], team: [], settings: {} }; save(); render(); toast('Datos borrados', 'info'); } });

Object.assign(window, { openJobForm, openJobDetail, deleteJob, approveJob, openCandidateForm, openCandidate, setStage, addNote, deleteCandidate, toggleArchive, closeModal, exportCandidatesCSV, importCSV, openScorecardForm, openInterviewForm, openOfferForm, setOfferStatus, sendTemplateFromUI, reactivate, openApplyForm, toggleAuto, openTemplate, bulkArchive, clearSel, openAttachment, openPortalConfig, openEmbedCode, openStandalonePortal, copyText, openDnaForm, openAssessValues, openAssessBelbin, openAssessPersonality, openAssessPsych, openAssessInvite, openSelfTest, openCompare, exportCandidateJSON, anonymizeCandidate, approveProposal, dismissProposal, undoProposal, editProposal, setAutonomy, goView });

/* ---------- Init ---------- */
load();
render();
