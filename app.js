const STORAGE_KEY = "mini-crm-data-v1";

const state = {
  clients: [],
  deals: [],
  tasks: [],
};

const refs = {
  clientForm: document.getElementById("client-form"),
  dealForm: document.getElementById("deal-form"),
  taskForm: document.getElementById("task-form"),
  dealClientSelect: document.getElementById("deal-client"),
  clientsTable: document.getElementById("clients-table"),
  dealsTable: document.getElementById("deals-table"),
  tasksTable: document.getElementById("tasks-table"),
  kpis: document.getElementById("kpis"),
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.clients = parsed.clients || [];
    state.deals = parsed.deals || [];
    state.tasks = parsed.tasks || [];
  } catch {
    console.warn("No se pudo leer localStorage");
  }
}

function removeItem(type, id) {
  state[type] = state[type].filter((item) => item.id !== id);
  if (type === "clients") {
    state.deals = state.deals.filter((deal) => deal.clientId !== id);
  }
  save();
  render();
}

function renderKpis() {
  const pipeline = state.deals.reduce((sum, d) => sum + Number(d.value), 0);
  const closeStage = state.deals.filter((d) => d.stage === "Cierre").length;
  const overdueTasks = state.tasks.filter((t) => new Date(t.date) < new Date()).length;

  refs.kpis.innerHTML = `
    <article class="kpi"><div>Clientes</div><div class="value">${state.clients.length}</div></article>
    <article class="kpi"><div>Oportunidades</div><div class="value">${state.deals.length}</div></article>
    <article class="kpi"><div>Pipeline</div><div class="value">$${pipeline.toLocaleString()}</div></article>
    <article class="kpi"><div>En cierre</div><div class="value">${closeStage}</div></article>
    <article class="kpi"><div>Tareas vencidas</div><div class="value">${overdueTasks}</div></article>
  `;
}

function renderClients() {
  refs.clientsTable.innerHTML = state.clients
    .map(
      (c) => `<tr>
      <td>${c.name}</td>
      <td>${c.email}</td>
      <td>${c.company}</td>
      <td>${c.status}</td>
      <td><button class="remove-btn" data-type="clients" data-id="${c.id}">Eliminar</button></td>
    </tr>`
    )
    .join("");

  refs.dealClientSelect.innerHTML = state.clients.length
    ? state.clients.map((c) => `<option value="${c.id}">${c.name} · ${c.company}</option>`).join("")
    : `<option value="">Crea un cliente primero</option>`;
}

function renderDeals() {
  refs.dealsTable.innerHTML = state.deals
    .map((d) => {
      const client = state.clients.find((c) => c.id === d.clientId);
      return `<tr>
      <td>${d.title}</td>
      <td>${client ? client.name : "(eliminado)"}</td>
      <td>$${Number(d.value).toLocaleString()}</td>
      <td>${d.stage}</td>
      <td><button class="remove-btn" data-type="deals" data-id="${d.id}">Eliminar</button></td>
    </tr>`;
    })
    .join("");
}

function renderTasks() {
  refs.tasksTable.innerHTML = state.tasks
    .map(
      (t) => `<tr>
      <td>${t.description}</td>
      <td>${t.date}</td>
      <td>${t.priority}</td>
      <td><button class="remove-btn" data-type="tasks" data-id="${t.id}">Eliminar</button></td>
    </tr>`
    )
    .join("");
}

function render() {
  renderKpis();
  renderClients();
  renderDeals();
  renderTasks();
}

refs.clientForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const client = {
    id: uid(),
    name: document.getElementById("client-name").value.trim(),
    email: document.getElementById("client-email").value.trim(),
    company: document.getElementById("client-company").value.trim(),
    status: document.getElementById("client-status").value,
  };
  state.clients.push(client);
  refs.clientForm.reset();
  save();
  render();
});

refs.dealForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state.clients.length) return;

  const deal = {
    id: uid(),
    title: document.getElementById("deal-title").value.trim(),
    clientId: refs.dealClientSelect.value,
    value: document.getElementById("deal-value").value,
    stage: document.getElementById("deal-stage").value,
  };
  state.deals.push(deal);
  refs.dealForm.reset();
  save();
  render();
});

refs.taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const task = {
    id: uid(),
    description: document.getElementById("task-desc").value.trim(),
    date: document.getElementById("task-date").value,
    priority: document.getElementById("task-priority").value,
  };
  state.tasks.push(task);
  refs.taskForm.reset();
  save();
  render();
});

document.body.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-type]");
  if (!button) return;
  removeItem(button.dataset.type, button.dataset.id);
});

load();
render();
