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

/* ---------- Estado ---------- */
let state = { jobs: [], candidates: [], templates: [], automations: [], team: [], settings: {} };
let currentView = 'dashboard';
let searchTerm = '';
const sel = new Set(); // selección múltiple de candidatos

function uid(p) { return p + '_' + Math.random().toString(36).slice(2, 9); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { try { state = JSON.parse(raw); } catch (e) { seedData(); } }
    else seedData();
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
        { id: uid('job'), title: 'Desarrollador/a Full Stack', dept: 'Tecnología', location: 'Madrid', type: 'Híbrido', status: 'open', salary: '38.000 - 48.000 €', created: '2026-04-10', openings: 2, priority: 'Alta', recruiter: 'Ana Torres', hiringManager: 'Carlos Ruiz', team: ['Ana Torres','Carlos Ruiz'], approver: 'Carlos Ruiz', description: 'Perfil con React y Node.js para nuestro producto SaaS. Trabajarás en equipo con producto y diseño.' },
        { id: uid('job'), title: 'Responsable de Marketing', dept: 'Marketing', location: 'Remoto', type: 'Remoto', status: 'open', salary: '42.000 - 52.000 €', created: '2026-05-02', openings: 1, priority: 'Media', recruiter: 'Marta Gómez', hiringManager: 'Luis Fernández', team: ['Marta Gómez','Luis Fernández'], approver: 'Luis Fernández', description: 'Estrategia de marca y demand generation. Liderazgo de un equipo de 3 personas.' },
        { id: uid('job'), title: 'Comercial B2B', dept: 'Ventas', location: 'Barcelona', type: 'Presencial', status: 'open', salary: '30.000 € + variable', created: '2026-05-20', openings: 3, priority: 'Alta', recruiter: 'Ana Torres', hiringManager: 'Luis Fernández', team: ['Ana Torres'], approver: 'Luis Fernández', description: 'Ciclo de venta consultiva a empresas medianas.' },
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
        }),
        c('Diego Ferrer', 'diego.ferrer@mail.com', 0, 'nuevo', 'Portal propio', '2026-07-01', 'Hombre', { tags: ['Junior','Angular'], rating: 0 }),
        c('Iván Lozano', 'ivan.lozano@mail.com', 0, 'entrevista', 'LinkedIn', '2026-06-18', 'Hombre', {
            tags: ['TypeScript','GraphQL'], rating: 4, interviewDate: '2026-07-09',
            interviews: [{ id: uid('iv'), date: '2026-07-09', time: '16:00', type: 'RRHH', interviewer: 'Ana Torres', mode: 'Videollamada' }],
        }),
        c('Sofía Marín', 'sofia.marin@mail.com', 1, 'oferta', 'LinkedIn', '2026-05-10', 'Mujer', {
            title: 'Growth Lead', company: 'ScaleUp', tags: ['SEO','Growth','Team lead'], rating: 5,
            offer: { salary: '50.000 €', startDate: '2026-08-01', status: 'sent', date: '2026-07-02' },
            scorecards: [mkScore('Luis Fernández', 'sf', 'Perfil de liderazgo excelente.', '2026-06-15')],
        }),
        c('Pablo Herrera', 'pablo.herrera@mail.com', 1, 'entrevista', 'Agencia', '2026-06-01', 'Hombre', { tags: ['Content','Ads'], rating: 4, interviewDate: '2026-07-11', interviews: [{ id: uid('iv'), date: '2026-07-11', time: '11:00', type: 'Manager', interviewer: 'Luis Fernández', mode: 'Videollamada' }] }),
        c('Nadia Costa', 'nadia.costa@mail.com', 1, 'nuevo', 'Evento', '2026-07-02', 'Mujer', { tags: ['Branding'], rating: 0 }),
        c('Javier Ortí', 'javier.orti@mail.com', 2, 'contratado', 'Referido', '2026-04-15', 'Hombre', {
            title: 'Account Executive', company: 'SalesCo', tags: ['SaaS','Closer'], rating: 5,
            offer: { salary: '32.000 € + variable', startDate: '2026-06-01', status: 'accepted', date: '2026-05-10' },
            scorecards: [mkScore('Ana Torres', 'sf', 'Cerrador nato, gran actitud.', '2026-04-28')],
        }),
        c('Elena Vidal', 'elena.vidal@mail.com', 2, 'preseleccion', 'CRM', '2026-06-10', 'Mujer', { title: 'SDR', company: 'LeadGen', tags: ['Hunter','CRM'], rating: 3 }),
        c('Óscar Peña', 'oscar.pena@mail.com', 2, 'rechazado', 'Web empleo', '2026-05-25', 'Hombre', { tags: ['Retail'], rating: 2, notes: [{ text: 'Poca experiencia en venta consultiva.', date: '2026-06-05', author: 'Ana Torres' }] }),
        c('Marta Soler', 'marta.soler@mail.com', 3, 'nuevo', 'Web empleo', '2026-06-20', 'Mujer', { tags: ['SAP','Excel'], rating: 0 }),
        c('Andrés Gil', 'andres.gil@mail.com', 2, 'contratado', 'LinkedIn', '2026-03-20', 'Hombre', {
            tags: ['B2B','SaaS'], rating: 4,
            offer: { salary: '31.000 € + variable', startDate: '2026-05-02', status: 'accepted', date: '2026-04-12' },
        }),
        // Talent pool (archivados / CRM)
        c('Carmen Ríos', 'carmen.rios@mail.com', 0, 'rechazado', 'LinkedIn', '2026-02-10', 'Mujer', { title: 'Frontend Dev', company: 'WebStudio', tags: ['React','Junior'], rating: 3, archived: true }),
        c('Tomás Vega', 'tomas.vega@mail.com', 1, 'rechazado', 'Evento', '2026-01-22', 'Hombre', { title: 'Marketing Manager', company: 'BrandCo', tags: ['SEM','Email'], rating: 4, archived: true }),
    ];

    state = { jobs, candidates, templates, automations, team, settings: { company: 'Mi Empresa' } };
    save();
}

/* ============================================================
   Router
   ============================================================ */
const content = document.getElementById('content');
const VIEWS = {
    dashboard: renderDashboard, jobs: renderJobs, pipeline: renderPipeline,
    candidates: renderCandidates, crm: renderCRM, interviews: renderInterviews,
    offers: renderOffers, reports: renderReports, careers: renderCareers, automation: renderAutomation,
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
        <div class="modal-actions">
            ${j.status === 'pending' ? `<button class="btn-primary" onclick="approveJob('${j.id}')">✓ Aprobar requisición</button>` : ''}
            <button class="btn-primary btn-danger" onclick="deleteJob('${j.id}')">Eliminar</button>
            <button class="btn-outline" onclick="openJobForm('${j.id}')">Editar</button>
        </div>`);
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
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn-primary">${j ? 'Guardar' : 'Crear'}</button>
            </div>
        </form>`);
    document.getElementById('jobForm').addEventListener('submit', e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.openings = +data.openings || 1;
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
                    <td onclick="openCandidate('${c.id}')"><div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div><div><strong>${c.name}${c.cv ? ' <span title="CV adjunto">📎</span>' : ''}</strong><br><span style="color:var(--muted);font-size:11px">${c.email}</span></div></div></td>
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
    const tabs = ['resumen','scorecards','entrevistas','comunicacion','oferta','actividad'];
    const tabNames = { resumen: 'Resumen', scorecards: 'Scorecards', entrevistas: 'Entrevistas', comunicacion: 'Comunicación', oferta: 'Oferta', actividad: 'Actividad' };
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
            </div>
            <div class="cd-section-title">Etapa del proceso</div>
            <div class="stage-pills">${STAGES.map(s => `<span class="stage-pill ${c.stage === s.id ? 'active' : ''}" style="${c.stage === s.id ? `background:${s.color};` : ''}" onclick="setStage('${c.id}','${s.id}')">${s.name}</span>`).join('')}</div>
            <div class="cd-section-title">Etiquetas</div>
            <div>${(c.tags || []).length ? c.tags.map(t => `<span class="tag">${t}</span>`).join('') : '<span style="color:var(--muted);font-size:13px">Sin etiquetas</span>'}</div>
            <div class="cd-section-title">Currículum</div>
            <div>${renderCV(c)}</div>
            <div class="cd-section-title">Notas</div>
            <div id="notesList">${renderNotes(c)}</div>
            <div class="note-add"><input id="noteInput" placeholder="Añadir una nota..."><button class="btn-primary btn-sm" onclick="addNote('${c.id}')">Añadir</button></div>
            <div class="modal-actions">
                <button class="btn-primary btn-danger" onclick="deleteCandidate('${c.id}')">Eliminar</button>
                <button class="btn-outline" onclick="toggleArchive('${c.id}')">${c.archived ? 'Devolver a activo' : 'Archivar en CRM'}</button>
                <button class="btn-outline" onclick="openCandidateForm('${c.id}')">Editar datos</button>
            </div>`;
    }
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
    const inp = document.getElementById('noteInput'); const text = inp.value.trim(); if (!text) return;
    c.notes = c.notes || []; c.notes.unshift({ text, date: todayISO(), author: 'RRHH' });
    logActivity(c, 'stage', 'Nota añadida'); save();
    document.getElementById('notesList').innerHTML = renderNotes(c); inp.value = '';
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') addNote(id); });
}

function setStage(id, stage) { moveStage(id, stage, () => openCandidate(id)); }
function toggleArchive(id) { const c = state.candidates.find(x => x.id === id); c.archived = !c.archived; save(); openCandidate(id); toast(c.archived ? 'Archivado en CRM' : 'Devuelto a activo', 'ok'); }
function deleteCandidate(id) {
    if (!confirm('¿Eliminar este candidato?')) return;
    state.candidates = state.candidates.filter(c => c.id !== id);
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
        const f = Object.fromEntries(new FormData(e.target).entries());
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
        const f = Object.fromEntries(new FormData(e.target).entries());
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
        const f = Object.fromEntries(new FormData(e.target).entries());
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
    const upcoming = items.filter(x => x.iv.date >= '2026-07-05');
    content.innerHTML = `
        <div class="page-head"><div><h1>Entrevistas</h1><p>${items.length} entrevistas · scheduling con entrevistadores</p></div></div>
        ${items.length ? items.map(({ c, iv }) => {
            const job = jobById(c.jobId);
            return `<div class="interview-item">
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
    content.innerHTML = `
        <div class="page-head"><div><h1>Portal de empleo</h1><p>Vista pública de candidatos · las solicitudes entran al pipeline</p></div></div>
        <div class="careers">
            <div class="careers-hero">
                <h2>Únete a ${state.settings.company || 'nuestro equipo'}</h2>
                <p>${openJobs.length} vacantes abiertas. Encuentra tu próximo reto.</p>
            </div>
            ${openJobs.length ? openJobs.map(j => `
                <div class="career-card">
                    <div><div class="cc-name" style="font-size:15px">${j.title}</div>
                    <div class="cc-role">${j.dept} · ${j.location} · ${j.type} · ${j.salary || ''}</div></div>
                    <button class="btn-primary btn-sm" onclick="openApplyForm('${j.id}')">Aplicar</button>
                </div>`).join('') : '<p style="color:var(--muted)">No hay vacantes abiertas ahora mismo.</p>'}
        </div>`;
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
            <div class="field full"><label>Género (opcional, para DE&I)</label><select name="gender"><option value="">Prefiere no decir</option>${GENDERS.map(g => `<option>${g}</option>`).join('')}</select></div>
            <div class="field full"><label>Habilidades (separadas por comas)</label><input name="tags" placeholder="Ej: React, 3 años"></div>
            <div class="field full">${cvFieldHTML(null)}</div>
        </div><div class="modal-actions"><button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn-primary">Enviar candidatura</button></div></form>`);
    let cvData = null;
    wireCvInput(v => { cvData = v; });
    document.getElementById('applyForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target).entries());
        const c = { id: uid('cand'), name: f.name, email: f.email, phone: f.phone, currentTitle: f.currentTitle,
            gender: f.gender || 'Prefiere no decir', jobId: jid, stage: 'nuevo', source: 'Portal propio',
            applied: todayISO(), tags: f.tags.split(',').map(t => t.trim()).filter(Boolean), rating: 0, cv: cvData,
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
        <div class="page-head"><div><h1>Automatización y plantillas</h1><p>Reglas y comunicaciones automáticas</p></div></div>
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
            <div class="field full">${cvFieldHTML(c?.cv)}</div>
        </div><div class="modal-actions"><button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn-primary">${c ? 'Guardar' : 'Añadir'}</button></div></form>`);
    let cvData = c?.cv || null;
    wireCvInput(v => { cvData = v; });
    document.getElementById('candForm').addEventListener('submit', e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
        data.jobId = data.jobId || null;
        data.cv = cvData;
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
   Currículum (subida de archivos: PDF, PNG, JPG)
   ============================================================ */
const CV_MAX = 3 * 1024 * 1024; // 3 MB
function cvFieldHTML(cv) {
    return `<label>Currículum (PDF, PNG o JPG · máx 3 MB)</label>
        <input type="file" id="cvInput" class="file-input" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg">
        <div id="cvHint" class="cv-hint">${cv ? '📎 ' + cv.name + ' (' + fmtSize(cv.size) + ') — sube otro para reemplazar' : 'Ningún archivo seleccionado'}</div>`;
}
function wireCvInput(cb) {
    const inp = document.getElementById('cvInput'); if (!inp) return;
    inp.addEventListener('change', () => {
        const f = inp.files[0]; if (!f) return;
        const okType = /pdf|png|jpe?g/i.test(f.type) || /\.(pdf|png|jpe?g)$/i.test(f.name);
        if (!okType) { toast('Formato no válido. Usa PDF, PNG o JPG', 'info'); inp.value = ''; return; }
        if (f.size > CV_MAX) { toast('Archivo demasiado grande (máx 3 MB)', 'info'); inp.value = ''; return; }
        const r = new FileReader();
        r.onload = () => {
            cb({ name: f.name, type: f.type || guessType(f.name), dataUrl: r.result, size: f.size });
            const h = document.getElementById('cvHint'); if (h) h.innerHTML = '✅ ' + f.name + ' (' + fmtSize(f.size) + ')';
        };
        r.readAsDataURL(f);
    });
}
function guessType(name) { return /\.pdf$/i.test(name) ? 'application/pdf' : /\.png$/i.test(name) ? 'image/png' : 'image/jpeg'; }
function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
function isImg(cv) { return cv && /image\//.test(cv.type); }
function renderCV(c) {
    const cv = c.cv;
    if (!cv) return '<span style="color:var(--muted);font-size:13px">Sin currículum adjunto.</span>';
    const thumb = isImg(cv) ? `<img src="${cv.dataUrl}" class="cv-thumb" alt="CV">` : `<div class="cv-thumb cv-pdf">PDF</div>`;
    return `<div class="cv-box">${thumb}
        <div class="cv-info"><div class="cv-name">📎 ${cv.name}</div><div class="cv-meta">${fmtSize(cv.size)} · ${isImg(cv) ? 'Imagen' : 'PDF'}</div>
        <div class="cv-actions"><button class="btn-outline btn-sm" onclick="openCV('${c.id}')">Ver</button>
        <a class="btn-outline btn-sm" href="${cv.dataUrl}" download="${cv.name}">Descargar</a></div></div></div>`;
}
function openCV(id) {
    const c = state.candidates.find(x => x.id === id); if (!c || !c.cv) return;
    const cv = c.cv;
    const view = isImg(cv) ? `<img src="${cv.dataUrl}" style="max-width:100%;border-radius:10px">`
        : `<iframe src="${cv.dataUrl}" style="width:100%;height:68vh;border:none;border-radius:10px;background:#fff"></iframe>`;
    openModal(`<h2>Currículum · ${c.name}</h2><div class="modal-sub">${cv.name} · ${fmtSize(cv.size)}</div>${view}
        <div class="modal-actions"><a class="btn-outline" href="${cv.dataUrl}" download="${cv.name}">Descargar</a><button class="btn-primary" onclick="closeModal()">Cerrar</button></div>`, 'wide');
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

Object.assign(window, { openJobForm, openJobDetail, deleteJob, approveJob, openCandidateForm, openCandidate, setStage, addNote, deleteCandidate, toggleArchive, closeModal, exportCandidatesCSV, importCSV, openScorecardForm, openInterviewForm, openOfferForm, setOfferStatus, sendTemplateFromUI, reactivate, openApplyForm, toggleAuto, openTemplate, bulkArchive, clearSel, openCV });

/* ---------- Init ---------- */
load();
render();
