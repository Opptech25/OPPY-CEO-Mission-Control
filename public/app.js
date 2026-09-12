const metricsEl = document.querySelector('#metrics');
const priorityListEl = document.querySelector('#priorityList');
const taskListEl = document.querySelector('#taskList');
const chatLogEl = document.querySelector('#chatLog');
const composerEl = document.querySelector('#composer');
const inputEl = document.querySelector('#messageInput');
const aiModeEl = document.querySelector('#aiMode');
const quickButtons = document.querySelectorAll('[data-prompt]');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function addMessage(role, text) {
  const message = document.createElement('div');
  message.className = `message ${role}`;
  message.textContent = text;
  chatLogEl.appendChild(message);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function renderMetrics(status) {
  const items = [
    ['Caja', status.business.caja],
    ['Cartera', status.business.cartera],
    ['Pipeline comercial', status.business.pipeline],
    ['Proyectos activos', status.business.proyectos],
    ['Riesgos activos', status.business.riesgos],
    ['Cotizaciones pendientes', status.business.cotizaciones],
  ];

  metricsEl.innerHTML = items.map(([label, value]) => `
    <article class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join('');
}

function renderPriorities(priorities) {
  priorityListEl.innerHTML = priorities.map((item) => `
    <article class="priority-item">
      <div class="rank">${item.rank}</div>
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <p><strong>Acción:</strong> ${escapeHtml(item.recommendedAction)}</p>
        <div class="meta">
          <span class="tag">${escapeHtml(item.kind)}</span>
          <span class="tag hot">Impacto ${escapeHtml(item.impact)}</span>
          <span class="tag gold">Riesgo ${escapeHtml(item.risk)}</span>
        </div>
      </div>
    </article>
  `).join('');
}

function renderTasks(tasks) {
  if (!tasks.length) {
    taskListEl.innerHTML = '<div class="empty">Aún no hay tareas. Pídele a OPPY crear el seguimiento a Constructora Horizonte.</div>';
    return;
  }

  taskListEl.innerHTML = tasks.map((task) => `
    <article class="task-item">
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.description || 'Sin descripción')}</p>
      <div class="meta">
        <span class="tag">${escapeHtml(task.id)}</span>
        <span class="tag hot">${escapeHtml(task.priority)}</span>
        <span class="tag gold">Vence ${escapeHtml(task.dueDate)}</span>
        ${task.client ? `<span class="tag">${escapeHtml(task.client)}</span>` : ''}
      </div>
    </article>
  `).join('');
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Error de solicitud');
  return payload;
}

async function refreshStatus() {
  const status = await fetchJson('/api/status');
  renderMetrics(status);
  renderPriorities(status.priorities);
  renderTasks(status.tasks);
  aiModeEl.textContent = status.ai.provider === 'openai-optional'
    ? `OpenAI opcional: ${status.ai.model}`
    : 'Sin API key: fallback activo';
}

async function sendPrompt(prompt) {
  addMessage('user', prompt);
  inputEl.value = '';
  composerEl.querySelector('button').disabled = true;
  quickButtons.forEach((button) => { button.disabled = true; });

  try {
    const result = await fetchJson('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt }),
    });
    addMessage('assistant', result.answer);
    await refreshStatus();
  } catch (error) {
    addMessage('assistant', `No pude completar la acción: ${error.message}`);
  } finally {
    composerEl.querySelector('button').disabled = false;
    quickButtons.forEach((button) => { button.disabled = false; });
    inputEl.focus();
  }
}

composerEl.addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = inputEl.value.trim();
  if (prompt) sendPrompt(prompt);
});

quickButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const prompt = button.dataset.prompt;
    inputEl.value = prompt;
    sendPrompt(prompt);
  });
});

await refreshStatus();
addMessage('assistant', 'Estoy listo. Pregúntame qué deberías atender primero hoy o pídeme crear la tarea de seguimiento a Constructora Horizonte.');
