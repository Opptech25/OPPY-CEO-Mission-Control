import http from 'node:http';
import https from 'node:https';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const business = {
  finances: { cash: 8450000, receivables: 21800000, pipeline: 38500000 },
  operations: { activeProjects: 7, activeRisks: 3, pendingQuotes: 5 },
  priorities: [
    {
      id: 'priority-constructora-horizonte',
      name: 'Constructora Horizonte',
      kind: 'Cartera / flujo de caja',
      client: 'Constructora Horizonte',
      pendingInvoice: 6200000,
      dueInDays: 27,
      impact: 'ALTO',
      risk: 'MEDIO',
      urgency: 88,
      opportunity: 55,
      recommendedAction: 'Hacer seguimiento inmediato de cobro.',
      summary: 'Factura pendiente de $6.200.000 COP con impacto alto en caja.',
    },
    {
      id: 'priority-transformacion-organizacional',
      name: 'Transformación Organizacional',
      kind: 'Proyecto crítico',
      project: 'Transformación Organizacional',
      progress: 62,
      deadlineInDays: 2,
      impact: 'MEDIO',
      risk: 'ALTO',
      urgency: 95,
      opportunity: 40,
      recommendedAction: 'Revisar bloqueos y cerrar pendientes críticos.',
      summary: 'Proyecto al 62% con fecha límite en 2 días y riesgo alto.',
    },
    {
      id: 'priority-grupo-andino',
      name: 'Grupo Andino',
      kind: 'Oportunidad comercial',
      client: 'Grupo Andino',
      quote: 12500000,
      sentDaysAgo: 5,
      status: 'Seguimiento pendiente',
      impact: 'MEDIO',
      risk: 'MEDIO',
      urgency: 72,
      opportunity: 90,
      recommendedAction: 'Realizar seguimiento comercial.',
      summary: 'Cotización de $12.500.000 COP enviada hace 5 días.',
    },
  ],
};

function money(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function priorityScore(item) {
  const receivableImpact = ((item.pendingInvoice || 0) / 1000000) * 18;
  const quoteOpportunity = ((item.quote || 0) / 1000000) * 3;
  const impact = item.impact === 'ALTO' ? 35 : item.impact === 'MEDIO' ? 22 : 10;
  const risk = item.risk === 'ALTO' ? 28 : item.risk === 'MEDIO' ? 14 : 6;
  const urgency = item.urgency || 0;
  const deadline = item.deadlineInDays ? Math.max(0, 30 - item.deadlineInDays * 4) : 0;
  const due = item.dueInDays ? Math.max(0, 35 - item.dueInDays) : 0;
  const opportunity = (item.opportunity || 0) * 0.22;
  return receivableImpact + quoteOpportunity + impact + risk + urgency + deadline + due + opportunity;
}

export function getPriorityActions() {
  return [...business.priorities]
    .map((item) => ({ ...item, score: Number(priorityScore(item).toFixed(2)) }))
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ rank: index + 1, ...item }));
}

function get_business_status() {
  return {
    caja: money(business.finances.cash),
    cartera: money(business.finances.receivables),
    pipeline: money(business.finances.pipeline),
    proyectos: business.operations.activeProjects,
    riesgos: business.operations.activeRisks,
    cotizaciones: business.operations.pendingQuotes,
  };
}

function get_financial_status() {
  return {
    caja: money(business.finances.cash),
    cartera: money(business.finances.receivables),
    pipeline: money(business.finances.pipeline),
  };
}

function get_projects_status() {
  return {
    proyectosActivos: business.operations.activeProjects,
    proyectos: [{ name: 'Transformación Organizacional', progress: 62, deadlineInDays: 2, risk: 'ALTO', action: 'Revisar bloqueos y cerrar pendientes críticos.' }],
    riesgosActivos: business.operations.activeRisks,
  };
}

function get_sales_status() {
  return {
    pipeline: money(business.finances.pipeline),
    cotizacionesPendientes: business.operations.pendingQuotes,
    seguimientosPendientes: [{ client: 'Grupo Andino', quote: 12500000, sentDaysAgo: 5, status: 'Seguimiento pendiente', action: 'Realizar seguimiento comercial.' }],
  };
}

function get_priority_actions() {
  return getPriorityActions().map(({ rank, name, kind, impact, risk, recommendedAction, summary }) => ({ rank, name, kind, impact, risk, recommendedAction, summary }));
}

async function ensureTasks() {
  await mkdir(path.dirname(TASKS_FILE), { recursive: true });
  if (!existsSync(TASKS_FILE)) await writeFile(TASKS_FILE, '[]\n', 'utf8');
}

async function listTasks() {
  await ensureTasks();
  try {
    const tasks = JSON.parse(await readFile(TASKS_FILE, 'utf8'));
    return Array.isArray(tasks) ? tasks : [];
  } catch {
    return [];
  }
}

async function create_task(input = {}) {
  const title = String(input.title || '').trim();
  if (!title) throw new Error('create_task requiere title.');
  const now = new Date().toISOString();
  const task = {
    id: `OPPY-${todayISO().replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
    title,
    description: input.description ? String(input.description) : '',
    priority: ['low', 'medium', 'high'].includes(input.priority) ? input.priority : 'medium',
    dueDate: input.dueDate || todayISO(),
    client: input.client ? String(input.client) : '',
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
  const tasks = await listTasks();
  tasks.unshift(task);
  await writeFile(TASKS_FILE, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
  const verifiedTask = (await listTasks()).find((item) => item.id === task.id);
  return {
    created: true,
    verified: Boolean(verifiedTask),
    task: verifiedTask || task,
    verification: verifiedTask ? `Tarea ${task.id} creada y verificada en el registro interno.` : `La tarea ${task.id} se creó, pero no pudo verificarse.`,
  };
}

const internalTools = { get_business_status, get_financial_status, get_projects_status, get_sales_status, get_priority_actions, create_task };
const toolDefinitions = Object.keys(internalTools).map((name) => ({
  type: 'function',
  function: {
    name,
    description: name === 'create_task' ? 'Crea una tarea interna, genera ID, la guarda y verifica que exista.' : `Ejecuta ${name} dentro de OPPY.`,
    parameters: name === 'create_task'
      ? { type: 'object', required: ['title'], additionalProperties: false, properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['low', 'medium', 'high'] }, dueDate: { type: 'string' }, client: { type: 'string' } } }
      : { type: 'object', properties: {}, additionalProperties: false },
  },
}));

function priorityAnswer() {
  const lines = get_priority_actions().map((item) => `${item.rank}. ${item.name}: ${item.summary} Acción: ${item.recommendedAction}`);
  return `Hoy deberías atender primero:\n\n${lines.join('\n')}\n\nMi recomendación ejecutiva: empieza por Constructora Horizonte porque combina impacto directo en flujo de caja y una factura pendiente de ${money(6200000)}.`;
}

async function deterministicAssistant(message) {
  const text = String(message).toLowerCase();
  if (text.includes('crea') && text.includes('tarea')) {
    const result = await create_task({
      title: 'Seguimiento de cobro a Constructora Horizonte',
      description: 'Contactar a Constructora Horizonte para hacer seguimiento inmediato de la factura pendiente por $6.200.000 COP.',
      priority: 'high',
      dueDate: todayISO(),
      client: text.includes('horizonte') ? 'Constructora Horizonte' : '',
    });
    return { mode: 'deterministic', answer: `${result.verification}\n\nTítulo: ${result.task.title}\nPrioridad: ${result.task.priority}\nVence: ${result.task.dueDate}\nCliente: ${result.task.client || 'No especificado'}`, toolResults: [{ tool: 'create_task', result }] };
  }
  return { mode: 'deterministic', answer: priorityAnswer(), toolResults: [{ tool: 'get_priority_actions', result: get_priority_actions() }] };
}

function postJson(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers } }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw || '{}');
          res.statusCode >= 400 ? reject(new Error(parsed.error?.message || `OpenAI HTTP ${res.statusCode}`)) : resolve(parsed);
        } catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => req.destroy(new Error('OpenAI timeout')));
    req.write(body);
    req.end();
  });
}

async function openAiAssistant(message) {
  if (!process.env.OPENAI_API_KEY) return null;
  const messages = [
    { role: 'system', content: 'Eres OPPY, AI Chief of Staff de Opportuna. Responde en español ejecutivo. Usa herramientas internas para ver, entender, priorizar, actuar y verificar. Al crear tareas reporta el ID verificado.' },
    { role: 'user', content: message },
  ];
  const first = await postJson('https://api.openai.com/v1/chat/completions', { model: OPENAI_MODEL, messages, tools: toolDefinitions, tool_choice: 'auto', temperature: 0.2 }, { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` });
  const assistantMessage = first.choices?.[0]?.message;
  const calls = assistantMessage?.tool_calls || [];
  if (!calls.length) return { mode: 'openai', answer: assistantMessage?.content || priorityAnswer(), toolResults: [] };
  messages.push(assistantMessage);
  const toolResults = [];
  for (const call of calls) {
    const name = call.function?.name;
    const fn = internalTools[name];
    if (!fn) continue;
    const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
    const result = await fn(args);
    toolResults.push({ tool: name, result });
    messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
  }
  const second = await postJson('https://api.openai.com/v1/chat/completions', { model: OPENAI_MODEL, messages, temperature: 0.2 }, { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` });
  return { mode: 'openai', answer: second.choices?.[0]?.message?.content || 'Acción ejecutada.', toolResults };
}

async function bodyJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload, null, 2));
}

async function serve(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const file = path.normalize(path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(PUBLIC_DIR)) return void res.end('Forbidden');
  try {
    const content = await readFile(file);
    const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, { business: get_business_status(), financial: get_financial_status(), projects: get_projects_status(), sales: get_sales_status(), priorities: get_priority_actions(), tasks: await listTasks(), ai: { provider: process.env.OPENAI_API_KEY ? 'openai-optional' : 'deterministic-fallback', model: process.env.OPENAI_API_KEY ? OPENAI_MODEL : null } });
    if (req.method === 'GET' && url.pathname === '/api/tasks') return send(res, 200, { tasks: await listTasks() });
    if (req.method === 'POST' && url.pathname === '/api/tasks') return send(res, 201, await create_task(await bodyJson(req)));
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const { message = '' } = await bodyJson(req);
      if (!String(message).trim()) return send(res, 400, { error: 'message es requerido.' });
      let result = null;
      try { result = await openAiAssistant(message); } catch { result = null; }
      return send(res, 200, result || await deterministicAssistant(message));
    }
    if (req.method === 'GET') return serve(req, res);
    send(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    send(res, 500, { error: error.message || 'Error interno.' });
  }
}).listen(PORT, () => {
  console.log(`OPPY Mission Control listo en http://localhost:${PORT}`);
  console.log(`Modo IA: ${process.env.OPENAI_API_KEY ? 'OpenAI opcional' : 'fallback determinista sin API key'}`);
});
