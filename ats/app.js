/* ============================================================
   TalentFlow · ATS para RRHH
   SPA en vanilla JS con persistencia en localStorage.
   ============================================================ */

const STORAGE_KEY = 'talentflow_ats_v1';

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

const AVATAR_COLORS = ['#5b8cff','#7c5cff','#ffb547','#2fce8a','#ff5f6d','#22c1c3','#e879f9','#fb923c'];

/* ---------- Estado ---------- */
let state = { jobs: [], candidates: [] };
let currentView = 'dashboard';
let searchTerm = '';

function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 9); }
function todayISO() { return new Date().toISOString().slice(0, 10); }

function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try { state = JSON.parse(raw); } catch (e) { state = { jobs: [], candidates: [] }; }
    } else {
        seedData();
    }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* ---------- Datos demo ---------- */
function seedData() {
    const jobs = [
        { id: uid('job'), title: 'Desarrollador/a Full Stack', dept: 'Tecnología', location: 'Madrid', type: 'Híbrido', status: 'open', salary: '38.000 - 48.000 €', created: '2026-06-10', description: 'Buscamos perfil con React y Node.js para producto SaaS.' },
        { id: uid('job'), title: 'Responsable de Marketing', dept: 'Marketing', location: 'Remoto', type: 'Remoto', status: 'open', salary: '42.000 - 52.000 €', created: '2026-06-18', description: 'Estrategia de marca y demand generation.' },
        { id: uid('job'), title: 'Comercial B2B', dept: 'Ventas', location: 'Barcelona', type: 'Presencial', status: 'open', salary: '30.000 € + variable', created: '2026-06-22', description: 'Ciclo de venta consultiva a empresas medianas.' },
        { id: uid('job'), title: 'Contable Senior', dept: 'Finanzas', location: 'Valencia', type: 'Híbrido', status: 'paused', salary: '34.000 - 40.000 €', created: '2026-05-30', description: 'Cierre contable y reporting mensual.' },
    ];
    const j = id => jobs[id].id;
    const c = (name, email, jobIdx, stage, rating, tags, phone) => ({
        id: uid('cand'), name, email, phone,
        jobId: jobs[jobIdx].id, stage, rating, tags,
        source: ['LinkedIn','Referido','Web empleo','Portal propio'][Math.floor(name.length % 4)],
        applied: '2026-06-' + String(10 + (name.length % 18)).padStart(2, '0'),
        interviewDate: stage === 'entrevista' || stage === 'prueba' ? '2026-07-' + String(6 + (name.length % 14)).padStart(2, '0') : null,
        notes: [],
    });
    const candidates = [
        c('Laura Giménez',  'laura.gimenez@mail.com',  0, 'entrevista',   4, ['React','Node','5 años'], '600 111 222'),
        c('Marcos Ruiz',    'marcos.ruiz@mail.com',    0, 'preseleccion', 3, ['Vue','Python'], '600 333 444'),
        c('Aisha Ndiaye',   'aisha.ndiaye@mail.com',   0, 'prueba',       5, ['React','AWS','Senior'], '600 555 666'),
        c('Diego Ferrer',   'diego.ferrer@mail.com',   0, 'nuevo',        0, ['Junior','Angular'], '600 777 888'),
        c('Sofía Marín',    'sofia.marin@mail.com',    1, 'oferta',       5, ['SEO','Growth','Team lead'], '600 999 000'),
        c('Pablo Herrera',  'pablo.herrera@mail.com',  1, 'entrevista',   4, ['Content','Ads'], '611 222 333'),
        c('Nadia Costa',    'nadia.costa@mail.com',    1, 'nuevo',        0, ['Branding'], '611 444 555'),
        c('Javier Ortí',    'javier.orti@mail.com',    2, 'contratado',   5, ['SaaS','Closer'], '611 666 777'),
        c('Elena Vidal',    'elena.vidal@mail.com',    2, 'preseleccion', 3, ['Hunter','CRM'], '611 888 999'),
        c('Óscar Peña',     'oscar.pena@mail.com',     2, 'rechazado',    2, ['Retail'], '622 111 000'),
        c('Marta Soler',    'marta.soler@mail.com',    3, 'nuevo',        0, ['SAP','Excel'], '622 333 444'),
        c('Iván Lozano',    'ivan.lozano@mail.com',    0, 'entrevista',   4, ['TypeScript','GraphQL'], '622 555 666'),
    ];
    candidates[0].notes = [{ text: 'Muy buena comunicación en la primera llamada.', date: '2026-06-28', author: 'RRHH' }];
    candidates[4].notes = [{ text: 'Oferta enviada, pendiente de respuesta.', date: '2026-07-02', author: 'RRHH' }];
    state = { jobs, candidates };
    save();
}

/* ============================================================
   Router / render
   ============================================================ */
const content = document.getElementById('content');

function render() {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === currentView));
    ({ dashboard: renderDashboard, jobs: renderJobs, pipeline: renderPipeline, candidates: renderCandidates, calendar: renderCalendar }[currentView] || renderDashboard)();
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
    const openJobs = state.jobs.filter(j => j.status === 'open').length;
    const total = state.candidates.length;
    const hired = state.candidates.filter(c => c.stage === 'contratado').length;
    const active = state.candidates.filter(c => !['contratado','rechazado'].includes(c.stage)).length;
    const conv = total ? Math.round((hired / total) * 100) : 0;

    const funnel = STAGES.filter(s => s.id !== 'rechazado').map(s => ({
        ...s, count: state.candidates.filter(c => c.stage === s.id).length
    }));
    const maxF = Math.max(1, ...funnel.map(f => f.count));

    const recent = [...state.candidates].sort((a, b) => (b.applied || '').localeCompare(a.applied || '')).slice(0, 6);

    content.innerHTML = `
        <div class="page-head"><div><h1>Panel de control</h1><p>Resumen de tu actividad de selección</p></div></div>
        <div class="kpi-grid">
            <div class="kpi k1"><div class="kpi-label">Vacantes abiertas</div><div class="kpi-value">${openJobs}</div><div class="kpi-sub">de ${state.jobs.length} totales</div></div>
            <div class="kpi k2"><div class="kpi-label">Candidatos activos</div><div class="kpi-value">${active}</div><div class="kpi-sub">${total} en total</div></div>
            <div class="kpi k3"><div class="kpi-label">Contrataciones</div><div class="kpi-value">${hired}</div><div class="kpi-sub">este periodo</div></div>
            <div class="kpi k4"><div class="kpi-label">Tasa de conversión</div><div class="kpi-value">${conv}%</div><div class="kpi-sub">candidato → contratado</div></div>
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
            </div>
            <div class="panel">
                <h3>🆕 Candidatos recientes</h3>
                ${recent.length ? recent.map(c => {
                    const job = state.jobs.find(j => j.id === c.jobId);
                    const st = stageById(c.stage);
                    return `<div class="cand-card" style="margin-bottom:10px;cursor:pointer" onclick="openCandidate('${c.id}')">
                        <div class="cc-top">
                            <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
                            <div><div class="cc-name">${c.name}</div><div class="cc-role">${job ? job.title : '—'}</div></div>
                            <span class="badge" style="margin-left:auto;background:${st.color}22;color:${st.color}">${st.name}</span>
                        </div>
                    </div>`;
                }).join('') : '<div class="empty" style="padding:20px"><span class="emoji">🗂️</span>Sin candidatos todavía</div>'}
            </div>
        </div>`;
}

/* ---------- Vacantes ---------- */
function renderJobs() {
    const jobs = state.jobs.filter(j => matchSearch(j.title + j.dept + j.location));
    content.innerHTML = `
        <div class="page-head">
            <div><h1>Vacantes</h1><p>${state.jobs.length} puestos gestionados</p></div>
            <button class="btn-primary" onclick="openJobForm()">＋ Nueva vacante</button>
        </div>
        ${jobs.length ? `
        <div class="table-wrap"><table>
            <thead><tr><th>Puesto</th><th>Departamento</th><th>Ubicación</th><th>Tipo</th><th>Candidatos</th><th>Estado</th><th></th></tr></thead>
            <tbody>${jobs.map(j => {
                const count = state.candidates.filter(c => c.jobId === j.id).length;
                const badge = j.status === 'open' ? 'open' : j.status === 'paused' ? 'paused' : 'closed';
                const label = j.status === 'open' ? 'Abierta' : j.status === 'paused' ? 'En pausa' : 'Cerrada';
                return `<tr class="row-click" onclick="openJobDetail('${j.id}')">
                    <td><strong>${j.title}</strong><br><span style="color:var(--muted);font-size:11px">${j.salary || ''}</span></td>
                    <td><span class="badge dept">${j.dept}</span></td>
                    <td>${j.location}</td><td>${j.type}</td>
                    <td>${count}</td>
                    <td><span class="badge ${badge}">${label}</span></td>
                    <td onclick="event.stopPropagation()"><button class="btn-outline btn-sm" onclick="openJobForm('${j.id}')">Editar</button></td>
                </tr>`;
            }).join('')}</tbody>
        </table></div>` : emptyState('💼', 'Sin vacantes', 'Crea tu primera vacante para empezar a recibir candidatos.')}`;
}

function openJobDetail(id) {
    const j = state.jobs.find(x => x.id === id);
    if (!j) return;
    const cands = state.candidates.filter(c => c.jobId === id);
    const badge = j.status === 'open' ? 'open' : j.status === 'paused' ? 'paused' : 'closed';
    const label = j.status === 'open' ? 'Abierta' : j.status === 'paused' ? 'En pausa' : 'Cerrada';
    openModal(`
        <h2>${j.title}</h2>
        <div class="modal-sub"><span class="badge dept">${j.dept}</span> · ${j.location} · ${j.type} · <span class="badge ${badge}">${label}</span></div>
        <div class="cd-info-grid">
            <div class="cd-info-item"><div class="lbl">Salario</div><div class="val">${j.salary || '—'}</div></div>
            <div class="cd-info-item"><div class="lbl">Publicada</div><div class="val">${j.created || '—'}</div></div>
        </div>
        <div class="cd-section-title">Descripción</div>
        <p style="font-size:13px;color:var(--muted);line-height:1.6">${j.description || 'Sin descripción.'}</p>
        <div class="cd-section-title">Candidatos (${cands.length})</div>
        ${cands.length ? cands.map(c => {
            const st = stageById(c.stage);
            return `<div class="cand-card" style="margin-bottom:8px;cursor:pointer" onclick="openCandidate('${c.id}')">
                <div class="cc-top"><div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
                <div><div class="cc-name">${c.name}</div><div class="cc-role">${c.email}</div></div>
                <span class="badge" style="margin-left:auto;background:${st.color}22;color:${st.color}">${st.name}</span></div></div>`;
        }).join('') : '<p style="color:var(--muted);font-size:13px">Aún no hay candidatos para esta vacante.</p>'}
        <div class="modal-actions">
            <button class="btn-danger btn-primary" onclick="deleteJob('${j.id}')">Eliminar</button>
            <button class="btn-outline" onclick="openJobForm('${j.id}')">Editar</button>
        </div>`);
}

function openJobForm(id) {
    const j = id ? state.jobs.find(x => x.id === id) : null;
    const opt = (v, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v}</option>`;
    openModal(`
        <h2>${j ? 'Editar' : 'Nueva'} vacante</h2>
        <div class="modal-sub">Completa los datos del puesto.</div>
        <form id="jobForm">
            <div class="form-grid">
                <div class="field full"><label>Título del puesto *</label><input name="title" required value="${j?.title || ''}"></div>
                <div class="field"><label>Departamento</label><input name="dept" value="${j?.dept || ''}" placeholder="Ej: Tecnología"></div>
                <div class="field"><label>Ubicación</label><input name="location" value="${j?.location || ''}" placeholder="Ej: Madrid"></div>
                <div class="field"><label>Modalidad</label><select name="type">${['Presencial','Híbrido','Remoto'].map(t => opt(t, j?.type || 'Híbrido')).join('')}</select></div>
                <div class="field"><label>Estado</label><select name="status">
                    <option value="open" ${j?.status === 'open' || !j ? 'selected' : ''}>Abierta</option>
                    <option value="paused" ${j?.status === 'paused' ? 'selected' : ''}>En pausa</option>
                    <option value="closed" ${j?.status === 'closed' ? 'selected' : ''}>Cerrada</option>
                </select></div>
                <div class="field full"><label>Rango salarial</label><input name="salary" value="${j?.salary || ''}" placeholder="Ej: 35.000 - 45.000 €"></div>
                <div class="field full"><label>Descripción</label><textarea name="description">${j?.description || ''}</textarea></div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn-primary">${j ? 'Guardar cambios' : 'Crear vacante'}</button>
            </div>
        </form>`);
    document.getElementById('jobForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = new FormData(e.target);
        const data = Object.fromEntries(f.entries());
        if (j) {
            Object.assign(j, data);
            toast('Vacante actualizada', 'ok');
        } else {
            state.jobs.unshift({ id: uid('job'), created: todayISO(), ...data });
            toast('Vacante creada', 'ok');
        }
        save(); closeModal(); render();
    });
}

function deleteJob(id) {
    const linked = state.candidates.filter(c => c.jobId === id).length;
    if (!confirm(`¿Eliminar esta vacante?${linked ? ` Hay ${linked} candidato(s) asociado(s) que quedarán sin vacante.` : ''}`)) return;
    state.jobs = state.jobs.filter(j => j.id !== id);
    state.candidates.forEach(c => { if (c.jobId === id) c.jobId = null; });
    save(); closeModal(); toast('Vacante eliminada', 'info'); render();
}

/* ---------- Pipeline (Kanban) ---------- */
function renderPipeline() {
    const jobFilter = window._pipelineJob || 'all';
    content.innerHTML = `
        <div class="page-head">
            <div><h1>Pipeline de selección</h1><p>Arrastra los candidatos entre etapas</p></div>
            <button class="btn-primary" onclick="openCandidateForm()">＋ Añadir candidato</button>
        </div>
        <div class="filters">
            <select id="pipeJobFilter">
                <option value="all">Todas las vacantes</option>
                ${state.jobs.map(j => `<option value="${j.id}" ${jobFilter === j.id ? 'selected' : ''}>${j.title}</option>`).join('')}
            </select>
        </div>
        <div class="board" id="board">
            ${STAGES.map(s => {
                const cards = state.candidates.filter(c => c.stage === s.id &&
                    (jobFilter === 'all' || c.jobId === jobFilter) &&
                    matchSearch(c.name + c.email));
                return `<div class="column">
                    <div class="column-head">
                        <span class="col-title"><span class="dot" style="background:${s.color}"></span>${s.name}</span>
                        <span class="col-count">${cards.length}</span>
                    </div>
                    <div class="column-body" data-stage="${s.id}">
                        ${cards.map(cardHTML).join('')}
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    document.getElementById('pipeJobFilter').addEventListener('change', e => { window._pipelineJob = e.target.value; renderPipeline(); });
    setupDnD();
}

function cardHTML(c) {
    const job = state.jobs.find(j => j.id === c.jobId);
    return `<div class="cand-card" draggable="true" data-id="${c.id}" onclick="openCandidate('${c.id}')">
        <div class="cc-top">
            <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
            <div><div class="cc-name">${c.name}</div><div class="cc-role">${job ? job.title : 'Sin vacante'}</div></div>
        </div>
        <div>${(c.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="cc-meta" style="margin-top:8px">
            <span class="stars">${stars(c.rating)}</span>
            <span>${c.source || ''}</span>
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
            const c = state.candidates.find(x => x.id === dragId);
            if (c && c.stage !== col.dataset.stage) {
                c.stage = col.dataset.stage;
                save(); renderPipeline();
                toast(`${c.name} → ${stageById(col.dataset.stage).name}`, 'ok');
            }
        });
    });
}

/* ---------- Candidatos (tabla) ---------- */
function renderCandidates() {
    const stageF = window._candStage || 'all';
    const list = state.candidates.filter(c =>
        (stageF === 'all' || c.stage === stageF) && matchSearch(c.name + c.email + (c.tags || []).join('')));
    content.innerHTML = `
        <div class="page-head">
            <div><h1>Candidatos</h1><p>${state.candidates.length} en la base de datos</p></div>
            <div style="display:flex;gap:10px">
                <button class="btn-outline" onclick="exportCandidatesCSV()">⭳ Exportar CSV</button>
                <button class="btn-primary" onclick="openCandidateForm()">＋ Añadir candidato</button>
            </div>
        </div>
        <div class="filters">
            <select id="candStageFilter">
                <option value="all">Todas las etapas</option>
                ${STAGES.map(s => `<option value="${s.id}" ${stageF === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
        </div>
        ${list.length ? `
        <div class="table-wrap"><table>
            <thead><tr><th>Candidato</th><th>Vacante</th><th>Etapa</th><th>Valoración</th><th>Origen</th><th>Aplicó</th></tr></thead>
            <tbody>${list.map(c => {
                const job = state.jobs.find(j => j.id === c.jobId);
                const st = stageById(c.stage);
                return `<tr class="row-click" onclick="openCandidate('${c.id}')">
                    <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div><div><strong>${c.name}</strong><br><span style="color:var(--muted);font-size:11px">${c.email}</span></div></div></td>
                    <td>${job ? job.title : '—'}</td>
                    <td><span class="badge" style="background:${st.color}22;color:${st.color}">${st.name}</span></td>
                    <td><span class="stars">${stars(c.rating)}</span></td>
                    <td>${c.source || '—'}</td>
                    <td>${c.applied || '—'}</td>
                </tr>`;
            }).join('')}</tbody>
        </table></div>` : emptyState('👥', 'Sin candidatos', 'Añade candidatos manualmente o carga los datos demo.')}`;
    document.getElementById('candStageFilter').addEventListener('change', e => { window._candStage = e.target.value; renderCandidates(); });
}

function openCandidateForm(id) {
    const c = id ? state.candidates.find(x => x.id === id) : null;
    openModal(`
        <h2>${c ? 'Editar' : 'Nuevo'} candidato</h2>
        <div class="modal-sub">Registra los datos del candidato.</div>
        <form id="candForm">
            <div class="form-grid">
                <div class="field"><label>Nombre completo *</label><input name="name" required value="${c?.name || ''}"></div>
                <div class="field"><label>Email *</label><input name="email" type="email" required value="${c?.email || ''}"></div>
                <div class="field"><label>Teléfono</label><input name="phone" value="${c?.phone || ''}"></div>
                <div class="field"><label>Vacante</label><select name="jobId">
                    <option value="">— Sin asignar —</option>
                    ${state.jobs.map(j => `<option value="${j.id}" ${c?.jobId === j.id ? 'selected' : ''}>${j.title}</option>`).join('')}
                </select></div>
                <div class="field"><label>Etapa</label><select name="stage">
                    ${STAGES.map(s => `<option value="${s.id}" ${c?.stage === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                </select></div>
                <div class="field"><label>Origen</label><select name="source">
                    ${['LinkedIn','Referido','Web empleo','Portal propio','Otro'].map(o => `<option ${c?.source === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select></div>
                <div class="field"><label>Fecha de entrevista</label><input name="interviewDate" type="date" value="${c?.interviewDate || ''}"></div>
                <div class="field full"><label>Etiquetas (separadas por comas)</label><input name="tags" value="${(c?.tags || []).join(', ')}" placeholder="Ej: React, 5 años, Senior"></div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-outline" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn-primary">${c ? 'Guardar' : 'Añadir candidato'}</button>
            </div>
        </form>`);
    document.getElementById('candForm').addEventListener('submit', e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
        data.jobId = data.jobId || null;
        data.interviewDate = data.interviewDate || null;
        if (c) { Object.assign(c, data); toast('Candidato actualizado', 'ok'); }
        else {
            state.candidates.unshift({ id: uid('cand'), rating: 0, applied: todayISO(), notes: [], interviewDate: null, ...data });
            toast('Candidato añadido', 'ok');
        }
        save(); closeModal(); render();
    });
}

function openCandidate(id) {
    const c = state.candidates.find(x => x.id === id);
    if (!c) return;
    const job = state.jobs.find(j => j.id === c.jobId);
    openModal(`
        <div class="cd-head">
            <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
            <div><h2>${c.name}</h2><div class="modal-sub" style="margin:0">${job ? job.title : 'Sin vacante'} · ${c.source || ''}</div></div>
        </div>
        <div class="cd-info-grid">
            <div class="cd-info-item"><div class="lbl">Email</div><div class="val">${c.email}</div></div>
            <div class="cd-info-item"><div class="lbl">Teléfono</div><div class="val">${c.phone || '—'}</div></div>
            <div class="cd-info-item"><div class="lbl">Aplicó el</div><div class="val">${c.applied || '—'}</div></div>
            <div class="cd-info-item"><div class="lbl">Entrevista</div><div class="val">${c.interviewDate || 'No programada'}</div></div>
        </div>
        <div class="cd-section-title">Valoración</div>
        <div class="star-picker" id="starPicker">${[1,2,3,4,5].map(n => `<span data-n="${n}" class="${n <= c.rating ? 'on' : ''}">★</span>`).join('')}</div>
        <div class="cd-section-title">Etapa del proceso</div>
        <div class="stage-pills">${STAGES.map(s => `<span class="stage-pill ${c.stage === s.id ? 'active' : ''}" style="${c.stage === s.id ? `background:${s.color};` : ''}" onclick="setStage('${c.id}','${s.id}')">${s.name}</span>`).join('')}</div>
        <div class="cd-section-title">Etiquetas</div>
        <div>${(c.tags || []).length ? c.tags.map(t => `<span class="tag">${t}</span>`).join('') : '<span style="color:var(--muted);font-size:13px">Sin etiquetas</span>'}</div>
        <div class="cd-section-title">Notas de evaluación</div>
        <div id="notesList">${renderNotes(c)}</div>
        <div class="note-add">
            <input id="noteInput" placeholder="Añadir una nota...">
            <button class="btn-primary btn-sm" onclick="addNote('${c.id}')">Añadir</button>
        </div>
        <div class="modal-actions">
            <button class="btn-primary btn-danger" onclick="deleteCandidate('${c.id}')">Eliminar</button>
            <button class="btn-outline" onclick="openCandidateForm('${c.id}')">Editar datos</button>
        </div>`);
    // star picker
    document.querySelectorAll('#starPicker span').forEach(s => {
        s.addEventListener('click', () => {
            c.rating = +s.dataset.n; save();
            document.querySelectorAll('#starPicker span').forEach(x => x.classList.toggle('on', +x.dataset.n <= c.rating));
            toast('Valoración guardada', 'ok');
        });
    });
    document.getElementById('noteInput').addEventListener('keydown', e => { if (e.key === 'Enter') addNote(c.id); });
}

function renderNotes(c) {
    if (!c.notes || !c.notes.length) return '<p style="color:var(--muted);font-size:13px">Sin notas todavía.</p>';
    return c.notes.map(n => `<div class="note-item">${n.text}<div class="note-meta">${n.author} · ${n.date}</div></div>`).join('');
}
function addNote(id) {
    const c = state.candidates.find(x => x.id === id);
    const inp = document.getElementById('noteInput');
    const text = inp.value.trim();
    if (!text) return;
    c.notes = c.notes || [];
    c.notes.unshift({ text, date: todayISO(), author: 'RRHH' });
    save();
    document.getElementById('notesList').innerHTML = renderNotes(c);
    inp.value = '';
    document.getElementById('noteInput').addEventListener('keydown', e => { if (e.key === 'Enter') addNote(id); });
}
function setStage(id, stage) {
    const c = state.candidates.find(x => x.id === id);
    c.stage = stage; save();
    openCandidate(id); // re-render modal
    toast(`Etapa: ${stageById(stage).name}`, 'ok');
}
function deleteCandidate(id) {
    if (!confirm('¿Eliminar este candidato del sistema?')) return;
    state.candidates = state.candidates.filter(c => c.id !== id);
    save(); closeModal(); toast('Candidato eliminado', 'info'); render();
}

function exportCandidatesCSV() {
    if (!state.candidates.length) { toast('No hay candidatos que exportar', 'info'); return; }
    const cols = ['Nombre','Email','Teléfono','Vacante','Etapa','Valoración','Origen','Etiquetas','Aplicó','Entrevista'];
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = state.candidates.map(c => {
        const job = state.jobs.find(j => j.id === c.jobId);
        return [c.name, c.email, c.phone, job ? job.title : '', stageById(c.stage).name,
            c.rating || 0, c.source, (c.tags || []).join('; '), c.applied, c.interviewDate || ''].map(esc).join(',');
    });
    const csv = '﻿' + [cols.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `candidatos_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
    toast(`${state.candidates.length} candidatos exportados`, 'ok');
}

/* ---------- Entrevistas ---------- */
function renderCalendar() {
    const upcoming = state.candidates
        .filter(c => c.interviewDate)
        .sort((a, b) => a.interviewDate.localeCompare(b.interviewDate));
    const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    content.innerHTML = `
        <div class="page-head"><div><h1>Entrevistas programadas</h1><p>${upcoming.length} próximas entrevistas</p></div></div>
        ${upcoming.length ? upcoming.map(c => {
            const job = state.jobs.find(j => j.id === c.jobId);
            const d = new Date(c.interviewDate);
            return `<div class="interview-item">
                <div class="interview-date"><div class="d">${String(d.getUTCDate()).padStart(2,'0')}</div><div class="m">${months[d.getUTCMonth()]}</div></div>
                <div class="avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
                <div style="flex:1"><div class="cc-name">${c.name}</div><div class="cc-role">${job ? job.title : '—'} · ${stageById(c.stage).name}</div></div>
                <button class="btn-outline btn-sm" onclick="openCandidate('${c.id}')">Ver ficha</button>
            </div>`;
        }).join('') : emptyState('📅', 'Sin entrevistas', 'Programa entrevistas asignando fecha desde la ficha del candidato o marcando su etapa como "Entrevista".')}`;
}

/* ============================================================
   Utilidades UI
   ============================================================ */
function initials(name) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
function avatarColor(name) { let h = 0; for (const ch of name) h = ch.charCodeAt(0) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]; }
function stars(r) { r = r || 0; return '★'.repeat(r) + '☆'.repeat(5 - r); }
function matchSearch(text) { return !searchTerm || text.toLowerCase().includes(searchTerm); }
function emptyState(emoji, title, sub) { return `<div class="empty"><span class="emoji">${emoji}</span><h3 style="margin-bottom:6px">${title}</h3><p>${sub}</p></div>`; }

const overlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
function openModal(html) { modalBody.innerHTML = html; overlay.classList.add('show'); }
function closeModal() { overlay.classList.remove('show'); modalBody.innerHTML = ''; }
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

let toastTimer;
function toast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ============================================================
   Eventos globales
   ============================================================ */
document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => {
    currentView = n.dataset.view; render();
    document.getElementById('sidebar').classList.remove('open');
}));
document.getElementById('newJobBtn').addEventListener('click', () => openJobForm());
document.getElementById('newCandidateBtn').addEventListener('click', () => openCandidateForm());
document.getElementById('globalSearch').addEventListener('input', e => { searchTerm = e.target.value.toLowerCase().trim(); render(); });
document.getElementById('hamburger').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('seedBtn').addEventListener('click', () => {
    if (confirm('Esto restaurará los datos de ejemplo y reemplazará los actuales. ¿Continuar?')) { seedData(); render(); toast('Datos demo cargados', 'ok'); }
});
document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) {
        state = { jobs: [], candidates: [] }; save(); render(); toast('Datos borrados', 'info');
    }
});

// exponer funciones usadas en atributos inline
Object.assign(window, { openJobForm, openJobDetail, deleteJob, openCandidateForm, openCandidate, setStage, addNote, deleteCandidate, closeModal, exportCandidatesCSV });

/* ---------- Init ---------- */
load();
render();
