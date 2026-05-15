// ====== MiniCRM ======
// Persistencia en localStorage; SPA simple con 5 vistas.

const STORAGE_KEY = 'minicrm_v1';

const DEAL_STAGES = [
    { id: 'lead', label: 'Lead' },
    { id: 'qualified', label: 'Cualificado' },
    { id: 'proposal', label: 'Propuesta' },
    { id: 'won', label: 'Ganado' },
    { id: 'lost', label: 'Perdido' },
];

const defaultState = () => ({
    contacts: [],
    companies: [],
    deals: [],
    tasks: [],
});

let state = load();
let currentView = 'dashboard';
let searchQuery = '';

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return seed();
        const parsed = JSON.parse(raw);
        return { ...defaultState(), ...parsed };
    } catch {
        return seed();
    }
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seed() {
    const now = Date.now();
    const s = defaultState();
    s.companies = [
        { id: uid(), name: 'Acme Corp', industry: 'Software', website: 'acme.com', createdAt: now },
        { id: uid(), name: 'Globex', industry: 'Retail', website: 'globex.com', createdAt: now },
    ];
    s.contacts = [
        { id: uid(), name: 'Ana García', email: 'ana@acme.com', phone: '+34 600 000 001', company: s.companies[0].name, status: 'cliente', notes: '', createdAt: now },
        { id: uid(), name: 'Luis Pérez', email: 'luis@globex.com', phone: '+34 600 000 002', company: s.companies[1].name, status: 'lead', notes: '', createdAt: now },
    ];
    s.deals = [
        { id: uid(), title: 'Implantación CRM', contact: 'Ana García', value: 12000, stage: 'proposal', expectedClose: isoDateInDays(20), createdAt: now },
        { id: uid(), title: 'Renovación licencia', contact: 'Luis Pérez', value: 3500, stage: 'qualified', expectedClose: isoDateInDays(45), createdAt: now },
    ];
    s.tasks = [
        { id: uid(), title: 'Llamar a Ana', dueDate: isoDateInDays(1), priority: 'alta', done: false, relatedTo: 'Ana García', createdAt: now },
        { id: uid(), title: 'Enviar propuesta a Globex', dueDate: isoDateInDays(3), priority: 'media', done: false, relatedTo: 'Luis Pérez', createdAt: now },
    ];
    state = s;
    save();
    return s;
}

function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function isoDateInDays(d) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    return date.toISOString().slice(0, 10);
}

function fmtMoney(n) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
}

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

// ===== Routing / nav =====
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        searchQuery = '';
        document.getElementById('searchInput').value = '';
        render();
    });
});

document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    render();
});

document.getElementById('newBtn').addEventListener('click', () => openModal(currentView));

document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minicrm-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Datos exportados');
});

document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            state = { ...defaultState(), ...data };
            save();
            render();
            toast('Datos importados');
        } catch {
            toast('Archivo inválido');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('¿Borrar todos los datos del CRM? Esta acción no se puede deshacer.')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = seed();
    render();
    toast('Datos restablecidos');
});

// ===== Render =====
function render() {
    const titles = {
        dashboard: 'Dashboard',
        contacts: 'Contactos',
        companies: 'Empresas',
        deals: 'Oportunidades',
        tasks: 'Tareas',
    };
    document.getElementById('viewTitle').textContent = titles[currentView];
    document.getElementById('newBtn').style.display = currentView === 'dashboard' ? 'none' : '';
    document.getElementById('searchInput').style.display = currentView === 'dashboard' ? 'none' : '';

    const content = document.getElementById('content');
    if (currentView === 'dashboard') content.innerHTML = renderDashboard();
    else if (currentView === 'contacts') content.innerHTML = renderContacts();
    else if (currentView === 'companies') content.innerHTML = renderCompanies();
    else if (currentView === 'deals') content.innerHTML = renderDeals();
    else if (currentView === 'tasks') content.innerHTML = renderTasks();

    bindRowActions();
    if (currentView === 'deals') bindKanban();
    if (currentView === 'tasks') bindTaskToggle();
}

function filterBy(items, fields) {
    if (!searchQuery) return items;
    return items.filter(it =>
        fields.some(f => String(it[f] ?? '').toLowerCase().includes(searchQuery))
    );
}

// ===== Dashboard =====
function renderDashboard() {
    const totalContacts = state.contacts.length;
    const totalCompanies = state.companies.length;
    const activeDeals = state.deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    const wonValue = state.deals.filter(d => d.stage === 'won').reduce((s, d) => s + (+d.value || 0), 0);
    const pipelineValue = activeDeals.reduce((s, d) => s + (+d.value || 0), 0);
    const openTasks = state.tasks.filter(t => !t.done);
    const overdue = openTasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10));

    const upcoming = [...openTasks]
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 5);

    const recentDeals = [...state.deals]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5);

    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Contactos</div>
                <div class="stat-value">${totalContacts}</div>
                <div class="stat-sub">${totalCompanies} empresas</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pipeline activo</div>
                <div class="stat-value">${fmtMoney(pipelineValue)}</div>
                <div class="stat-sub">${activeDeals.length} oportunidades abiertas</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Cerrado ganado</div>
                <div class="stat-value">${fmtMoney(wonValue)}</div>
                <div class="stat-sub">${state.deals.filter(d => d.stage === 'won').length} deals</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tareas pendientes</div>
                <div class="stat-value">${openTasks.length}</div>
                <div class="stat-sub" style="color: ${overdue.length ? 'var(--danger)' : ''}">
                    ${overdue.length} vencidas
                </div>
            </div>
        </div>

        <div class="dash-grid">
            <div class="panel">
                <div class="panel-header"><div class="panel-title">Oportunidades recientes</div></div>
                ${recentDeals.length ? `
                <table class="table">
                    <thead><tr><th>Título</th><th>Etapa</th><th>Valor</th><th>Cierre</th></tr></thead>
                    <tbody>
                    ${recentDeals.map(d => `
                        <tr>
                            <td>${escapeHtml(d.title)}</td>
                            <td>${stageBadge(d.stage)}</td>
                            <td>${fmtMoney(d.value)}</td>
                            <td>${fmtDate(d.expectedClose)}</td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
                ` : emptyState('Sin oportunidades', 'Crea tu primera oportunidad desde la vista «Oportunidades».')}
            </div>

            <div class="panel">
                <div class="panel-header"><div class="panel-title">Próximas tareas</div></div>
                ${upcoming.length ? `
                <table class="table">
                    <thead><tr><th>Tarea</th><th>Vence</th><th>Prio</th></tr></thead>
                    <tbody>
                    ${upcoming.map(t => `
                        <tr>
                            <td>${escapeHtml(t.title)}</td>
                            <td>${fmtDate(t.dueDate)}</td>
                            <td>${priorityBadge(t.priority)}</td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
                ` : emptyState('Todo al día', 'No tienes tareas pendientes.')}
            </div>
        </div>
    `;
}

function emptyState(title, msg) {
    return `<div class="empty">
        <div class="empty-icon">✨</div>
        <div class="empty-title">${escapeHtml(title)}</div>
        <div>${escapeHtml(msg)}</div>
    </div>`;
}

function stageBadge(stage) {
    const map = {
        lead: ['badge-info', 'Lead'],
        qualified: ['badge-primary', 'Cualificado'],
        proposal: ['badge-warning', 'Propuesta'],
        won: ['badge-success', 'Ganado'],
        lost: ['badge-danger', 'Perdido'],
    };
    const [cls, label] = map[stage] || ['', stage];
    return `<span class="badge ${cls}">${label}</span>`;
}

function priorityBadge(p) {
    const map = {
        alta: ['badge-danger', 'Alta'],
        media: ['badge-warning', 'Media'],
        baja: ['badge-info', 'Baja'],
    };
    const [cls, label] = map[p] || ['', p || '—'];
    return `<span class="badge ${cls}">${label}</span>`;
}

function statusBadge(s) {
    const map = {
        lead: ['badge-info', 'Lead'],
        prospecto: ['badge-primary', 'Prospecto'],
        cliente: ['badge-success', 'Cliente'],
        inactivo: ['badge', 'Inactivo'],
    };
    const [cls, label] = map[s] || ['badge', s || '—'];
    return `<span class="badge ${cls}">${label}</span>`;
}

// ===== Contacts =====
function renderContacts() {
    const list = filterBy(state.contacts, ['name', 'email', 'phone', 'company']);
    if (!list.length) return emptyState('Sin contactos', 'Pulsa «+ Nuevo» para crear el primero.');
    return `
        <table class="table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Empresa</th><th>Estado</th><th></th></tr></thead>
            <tbody>
            ${list.map(c => `
                <tr>
                    <td><strong>${escapeHtml(c.name)}</strong></td>
                    <td>${escapeHtml(c.email)}</td>
                    <td>${escapeHtml(c.phone)}</td>
                    <td>${escapeHtml(c.company)}</td>
                    <td>${statusBadge(c.status)}</td>
                    <td class="row-actions">
                        <button data-action="edit" data-type="contacts" data-id="${c.id}">Editar</button>
                        <button class="danger" data-action="delete" data-type="contacts" data-id="${c.id}">Eliminar</button>
                    </td>
                </tr>
            `).join('')}
            </tbody>
        </table>
    `;
}

// ===== Companies =====
function renderCompanies() {
    const list = filterBy(state.companies, ['name', 'industry', 'website']);
    if (!list.length) return emptyState('Sin empresas', 'Pulsa «+ Nuevo» para crear la primera.');
    return `
        <table class="table">
            <thead><tr><th>Nombre</th><th>Industria</th><th>Web</th><th>Contactos</th><th></th></tr></thead>
            <tbody>
            ${list.map(c => {
                const count = state.contacts.filter(x => x.company === c.name).length;
                return `
                <tr>
                    <td><strong>${escapeHtml(c.name)}</strong></td>
                    <td>${escapeHtml(c.industry)}</td>
                    <td>${escapeHtml(c.website)}</td>
                    <td>${count}</td>
                    <td class="row-actions">
                        <button data-action="edit" data-type="companies" data-id="${c.id}">Editar</button>
                        <button class="danger" data-action="delete" data-type="companies" data-id="${c.id}">Eliminar</button>
                    </td>
                </tr>
            `;
            }).join('')}
            </tbody>
        </table>
    `;
}

// ===== Deals (Kanban) =====
function renderDeals() {
    const list = filterBy(state.deals, ['title', 'contact']);
    return `
        <div class="kanban">
            ${DEAL_STAGES.map(stg => {
                const items = list.filter(d => d.stage === stg.id);
                const sum = items.reduce((s, d) => s + (+d.value || 0), 0);
                return `
                <div class="kanban-col" data-stage="${stg.id}">
                    <div class="kanban-col-header">
                        <div class="kanban-col-title">${stg.label}</div>
                        <div class="kanban-col-count">${items.length} · ${fmtMoney(sum)}</div>
                    </div>
                    ${items.map(d => `
                        <div class="kanban-card" draggable="true" data-id="${d.id}">
                            <div class="kanban-card-title">${escapeHtml(d.title)}</div>
                            <div class="kanban-card-meta">
                                <span>${escapeHtml(d.contact || '—')}</span>
                                <span class="kanban-card-value">${fmtMoney(d.value)}</span>
                            </div>
                            <div class="kanban-card-meta" style="margin-top:6px;">
                                <span>${fmtDate(d.expectedClose)}</span>
                                <span>
                                    <button class="btn-ghost" data-action="edit" data-type="deals" data-id="${d.id}" style="padding:2px 6px;font-size:12px;">✎</button>
                                    <button class="btn-ghost" data-action="delete" data-type="deals" data-id="${d.id}" style="padding:2px 6px;font-size:12px;color:var(--danger);">✕</button>
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
            }).join('')}
        </div>
    `;
}

function bindKanban() {
    let dragId = null;
    document.querySelectorAll('.kanban-card').forEach(card => {
        card.addEventListener('dragstart', e => {
            dragId = card.dataset.id;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });
    document.querySelectorAll('.kanban-col').forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', e => {
            e.preventDefault();
            col.classList.remove('drag-over');
            if (!dragId) return;
            const deal = state.deals.find(d => d.id === dragId);
            if (deal && deal.stage !== col.dataset.stage) {
                deal.stage = col.dataset.stage;
                save();
                render();
                toast('Oportunidad movida');
            }
            dragId = null;
        });
    });
}

// ===== Tasks =====
function renderTasks() {
    const list = filterBy(state.tasks, ['title', 'relatedTo']);
    if (!list.length) return emptyState('Sin tareas', 'Pulsa «+ Nuevo» para añadir la primera.');
    const sorted = [...list].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
    });
    const today = new Date().toISOString().slice(0, 10);
    return `
        <table class="table">
            <thead><tr><th></th><th>Tarea</th><th>Vence</th><th>Prioridad</th><th>Relacionado con</th><th></th></tr></thead>
            <tbody>
            ${sorted.map(t => {
                const overdue = !t.done && t.dueDate && t.dueDate < today;
                return `
                <tr style="${t.done ? 'opacity:.5;' : ''}">
                    <td><input type="checkbox" data-task-toggle="${t.id}" ${t.done ? 'checked' : ''}></td>
                    <td style="${t.done ? 'text-decoration:line-through;' : ''}"><strong>${escapeHtml(t.title)}</strong></td>
                    <td style="${overdue ? 'color:var(--danger);' : ''}">${fmtDate(t.dueDate)}</td>
                    <td>${priorityBadge(t.priority)}</td>
                    <td>${escapeHtml(t.relatedTo || '—')}</td>
                    <td class="row-actions">
                        <button data-action="edit" data-type="tasks" data-id="${t.id}">Editar</button>
                        <button class="danger" data-action="delete" data-type="tasks" data-id="${t.id}">Eliminar</button>
                    </td>
                </tr>
            `;
            }).join('')}
            </tbody>
        </table>
    `;
}

function bindTaskToggle() {
    document.querySelectorAll('[data-task-toggle]').forEach(cb => {
        cb.addEventListener('change', () => {
            const id = cb.dataset.taskToggle;
            const t = state.tasks.find(x => x.id === id);
            if (t) { t.done = cb.checked; save(); render(); }
        });
    });
}

// ===== Row actions =====
function bindRowActions() {
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const { action, type, id } = btn.dataset;
            if (action === 'edit') openModal(type, id);
            else if (action === 'delete') deleteItem(type, id);
        });
    });
}

function deleteItem(type, id) {
    if (!confirm('¿Eliminar este elemento?')) return;
    state[type] = state[type].filter(x => x.id !== id);
    save();
    render();
    toast('Eliminado');
}

// ===== Modal =====
const modal = document.getElementById('modal');
document.getElementById('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function closeModal() { modal.hidden = true; }

function openModal(type, id) {
    const isEdit = !!id;
    const item = isEdit ? state[type].find(x => x.id === id) : null;
    const titleMap = {
        contacts: 'contacto',
        companies: 'empresa',
        deals: 'oportunidad',
        tasks: 'tarea',
    };
    document.getElementById('modalTitle').textContent = `${isEdit ? 'Editar' : 'Nueva'} ${titleMap[type]}`;
    const form = document.getElementById('modalForm');
    form.innerHTML = formFor(type, item) + `
        <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancelBtn">Cancelar</button>
            <button type="submit" class="btn-primary">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>`;
    form.onsubmit = e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        if (type === 'deals') data.value = +data.value || 0;
        if (isEdit) {
            Object.assign(item, data);
        } else {
            state[type].push({ id: uid(), createdAt: Date.now(), ...data });
        }
        save();
        closeModal();
        render();
        toast(isEdit ? 'Actualizado' : 'Creado');
    };
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    modal.hidden = false;
}

function formFor(type, item = {}) {
    const v = (k) => escapeHtml(item?.[k] ?? '');
    const sel = (k, val) => item?.[k] === val ? 'selected' : '';
    if (type === 'contacts') {
        return `
            <div class="form-row">
                <div class="form-field"><label>Nombre</label><input name="name" required value="${v('name')}"></div>
                <div class="form-field"><label>Empresa</label><input name="company" list="companyList" value="${v('company')}">
                    <datalist id="companyList">${state.companies.map(c => `<option value="${escapeHtml(c.name)}">`).join('')}</datalist>
                </div>
            </div>
            <div class="form-row">
                <div class="form-field"><label>Email</label><input type="email" name="email" value="${v('email')}"></div>
                <div class="form-field"><label>Teléfono</label><input name="phone" value="${v('phone')}"></div>
            </div>
            <div class="form-field"><label>Estado</label>
                <select name="status">
                    <option value="lead" ${sel('status','lead')}>Lead</option>
                    <option value="prospecto" ${sel('status','prospecto')}>Prospecto</option>
                    <option value="cliente" ${sel('status','cliente')}>Cliente</option>
                    <option value="inactivo" ${sel('status','inactivo')}>Inactivo</option>
                </select>
            </div>
            <div class="form-field"><label>Notas</label><textarea name="notes">${v('notes')}</textarea></div>
        `;
    }
    if (type === 'companies') {
        return `
            <div class="form-field"><label>Nombre</label><input name="name" required value="${v('name')}"></div>
            <div class="form-row">
                <div class="form-field"><label>Industria</label><input name="industry" value="${v('industry')}"></div>
                <div class="form-field"><label>Web</label><input name="website" value="${v('website')}"></div>
            </div>
        `;
    }
    if (type === 'deals') {
        return `
            <div class="form-field"><label>Título</label><input name="title" required value="${v('title')}"></div>
            <div class="form-row">
                <div class="form-field"><label>Contacto</label><input name="contact" list="contactList" value="${v('contact')}">
                    <datalist id="contactList">${state.contacts.map(c => `<option value="${escapeHtml(c.name)}">`).join('')}</datalist>
                </div>
                <div class="form-field"><label>Valor (€)</label><input type="number" name="value" min="0" step="100" value="${v('value')}"></div>
            </div>
            <div class="form-row">
                <div class="form-field"><label>Etapa</label>
                    <select name="stage">
                        ${DEAL_STAGES.map(s => `<option value="${s.id}" ${sel('stage', s.id)}>${s.label}</option>`).join('')}
                    </select>
                </div>
                <div class="form-field"><label>Cierre previsto</label><input type="date" name="expectedClose" value="${v('expectedClose')}"></div>
            </div>
        `;
    }
    if (type === 'tasks') {
        return `
            <div class="form-field"><label>Título</label><input name="title" required value="${v('title')}"></div>
            <div class="form-row">
                <div class="form-field"><label>Vence</label><input type="date" name="dueDate" value="${v('dueDate')}"></div>
                <div class="form-field"><label>Prioridad</label>
                    <select name="priority">
                        <option value="alta" ${sel('priority','alta')}>Alta</option>
                        <option value="media" ${sel('priority','media')}>Media</option>
                        <option value="baja" ${sel('priority','baja')}>Baja</option>
                    </select>
                </div>
            </div>
            <div class="form-field"><label>Relacionado con</label><input name="relatedTo" value="${v('relatedTo')}"></div>
        `;
    }
    return '';
}

// ===== Init =====
render();
