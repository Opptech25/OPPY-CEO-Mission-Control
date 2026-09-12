import http from 'node:http';
import https from 'node:https';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const demoData = {
  company: 'Opportuna',
  finances: {
    cash: 8450000,
    receivables: 21800000,
    pipeline: 38500000,
  },
  operations: {
    activeProjects: 7,
    activeRisks: 3,
    pendingQuotes: 5,
  },
  priorities: [
    {
      id: 'priority-constructora-horizonte',
      name: 'Constructora Horizonte',
      kind: 'Cartera / flujo de caja',
      client: 'Constructora Horizonte',
      pendingInvoice: 6200000,
      dueInDays: 27,
      impact: 'ALTO',
      risk: 'medium',
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
      risk: 'medium',
      urgency: 72,
      opportunity: 90,
      recommendedAction: 'Realizar seguimiento comercial.',
      summary: 'Cotización de $12.500.000 COP enviada hace 5 días.',
    },
  ],
  projects: [
    {
      name: 'Transformación Organizacional',
      progress: 62,
      deadlineInDays: 2,
      risk: 'ALTO',
      action: 'Revisar bloqueos y cerrar pendientes críticos.',
    },
  ],
  sales: [
    {
      client: 'Grupo Andino',
      quote: 12500000,
      sentDaysAgo: 5,
      status: 'Seguimiento pendiente',
      action: 'Realizar seguimiento comercial.',
    },
  ],
};

function formatCop(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function todayISO() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function priorityScore(item) {
  const financialImpact = (item.pendingInvoice || item.quote || 0) / 1000000;
  const impactScore = item.impact === 'ALTO' ? 35 : item.impact === 'MEDIO' ? 22 : 10;
  const riskScore = item.risk === 'ALTO' ? 28 : item.risk === 'medium' ? 14 : 6;
  const urgencyScore = item.urgency || 0;
  const deadlineScore = item.deadlineInDays ? Math.max(0, 30 - item.deadlineInDays * 4) : 0;
  const dueScore = item.dueInDays ? Math.max(0, 35 - item.dueInDays) : 0;
  const opportunityScore = (item.opportunity || 0) * 0.22;
  return impactScore + riskScore + urgencyScore + deadlineScore + dueScore + opportunityScore + financialImpact;
}

export function getPriorityActions() {
  return [...demoData.priorities]
    .map((item) => ({ ...item, score: Number(priorityScore(item).toFixed(2)) }))
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ rank: index + 1, ...item }));
}

function get_business_status() {
  return {
    caja: formatCop(demoData.finances.cash),
    cartera: formatCop(demoData.finances.receivables),
    pipeline: formatCop(demoData.finances.pipeline),
    proyectos: demoData.operations.activeProjects,
    riesgos: demoData.operations.activeRisks,
    cotizaciones: demoData.operations.pendingQuotes,
  };
}

function get_financial_status() {
  return {
    caja: formatCop(demoData.finances.cash),
    cartera: formatCop(demoData.finances.receivables),
    pipeline: formatCop(demoData.finances.pipeline),
  };
}

function get_projects_status() {
  return {
    proyectosActivos: demoData.operations.activeProjects,
    proyectos: demoData.projects,
    riesgosActivos: demoData.operations.activeRisks,
  };
}

function get_sales_status() {
  return {
    pipeline: formatCop(demoData.finances.pipeline),
    cotizacionesPendientes: demoData.operations.pendingQuotes,
    seguimientosPendientes: demoData.sales,
  };
}

function get_priority_actions() {
  return getPriorityActions().map((item) => ({
    rank: item.rank,
    name: item.name,
    kind: item.kind,
    impact: item.impact,
    risk: item.risk,
    recommendedAction: item.recommendedAction,
    summary: item.summary,
  }));
}

async function ensureTaskFile() {
  await mkdir(path.dirname(TASKS_FILE), { recursive: true });
  if (!existsSync(TASKS_FILE)) {
    await writeFile(TASKS_FILE, '[]\n', 'utf8');
  }
}

async function listTasks() {
  await ensureTaskFile();
  const raw = await readFile(TASKS_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveTasks(tasks) {
  await ensureTaskFile();
  await writeFile(TASKS_FILE, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
}

async function create_task(input = {}) {
  const title = String(input.title || '').trim();
  if (!title) {
    throw new Error('create_task requiere title.');
  }

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
  await saveTasks(tasks);
  const verifiedTask = (await listTasks()).find((item) => item.id === task.id);

  return {
    created: true,
    verified: Boolean(verifiedTask),
    task: verifiedTask || task,
    verification: verifiedTask
      ? `Tarea ${task.id} creada y verificada en el registro interno.`
      : `La tarea ${task.id} se creó, pero no pudo verificarse.`,
  };
}

const internalTools = {
  get_business_status,
  get_financial_status,
  get_projects_status,
  get_sales_status,
  get_priority_actions,
  create_task,
};

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_business_status',
      description: 'Devuelve caja, cartera, pipeline, proyectos, riesgos y cotizaciones de Opportuna.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_financial_status',
      description: 'Devuelve caja, cartera y pipeline.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_projects_status',
      description: 'Devuelve proyectos activos, avance, fechas y riesgos.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sales_status',
      description: 'Devuelve pipeline, cotizaciones y seguimientos pendientes.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_priority_actions',
      description: 'Devuelve las acciones ejecutivas priorizadas por impacto financiero, urgencia, riesgo, vencimiento y oportunidad comercial.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Crea una tarea dentro de OPPY, genera ID, la guarda y verifica que exista.',
      parameters: {
        type: 'object',
        required: ['title'],
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          dueDate: { type: 'string' },
          client: { type: 'string' },
        },
      },
    },
  },
];

function buildPriorityAnswer() {
  const lines = get_priority_actions().map((item) => `${item.rank}. ${item.name}: ${item.summary} Acción: ${item.recommendedAction}`);
  return `Hoy deberías atender primero:\n\n${lines.join('\n')}\n\nMi recomendación ejecutiva: empieza por Constructora Horizonte porque combina impacto directo en flujo de caja y una factura pendiente de ${formatCop(6200000)}.`;
}

async function deterministicAssistant(message) {
  const text = String(message || '').toLowerCase();

  if (text.includes('crea') && text.includes('tarea')) {
    const isHorizonte = text.includes('constructora horizonte') || text.includes('horizonte');
    const taskInput = isHorizonte
      ? {
          title: 'Seguimiento de cobro a Constructora Horizonte',
          description: 'Contactar a Constructora Horizonte para hacer seguimiento inmediato de la factura pendiente por $6.200.000 COP.',
          priority: 'high',
          dueDate: todayISO(),
          client: 'Constructora Horizonte',
        }
      : {
          title: 'Seguimiento solicitado por CEO',
          description: message,
          priority: 'medium',
          dueDate: todayISO(),
        };
    const result = await create_task(taskInput);
    return {
      mode: 'deterministic',
      answer: `${result.verification}\n\nTítulo: ${result.task.title}\nPrioridad: ${result.task.priority}\nVence: ${result.task.dueDate}${result.task.client ? `\nCliente: ${result.task.client}` : ''}`,
      toolResults: [{ tool: 'create_task', result }],
    };
  }

  if (text.includes('primero') || text.includes('prioridad') || text.includes('prioridades') || text.includes('atender')) {
    return {
      mode: 'deterministic',
      answer: buildPriorityAnswer(),
      toolResults: [{ tool: 'get_priority_actions', result: get_priority_actions() }],
    };
  }

  if (text.includes('finanza') || text.includes('caja') || text.includes('cartera')) {
    return {
      mode: 'deterministic',
      answer: `Estado financiero: caja ${formatCop(demoData.finances.cash)}, cartera ${formatCop(demoData.finances.receivables)} y pipeline ${formatCop(demoData.finances.pipeline)}.`,
      toolResults: [{ tool: 'get_financial_status', result: get_financial_status() }],
    };
  }

  return {
    mode: 'deterministic',
    answer: `${buildPriorityAnswer()}\n\nTambién puedo crear tareas dentro de OPPY y verificarlas en pantalla.`,
    toolResults: [{ tool: 'get_business_status', result: get_business_status() }],
  };
}

function requestJson(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      },
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (response.statusCode >= 400) {
            reject(new Error(parsed.error?.message || `OpenAI HTTP ${response.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.setTimeout(12000, () => request.destroy(new Error('OpenAI timeout')));
    request.write(body);
    request.end();
  });
}

async function openAiAssistant(message) {
  if (!process.env.OPENAI_API_KEY) return null;

  const messages = [
    {
      role: 'system',
      content: 'Eres OPPY, el AI Chief of Staff de Opportuna. Respondes en español ejecutivo y breve. Debes usar las herramientas internas disponibles para ver, entender, priorizar, actuar y verificar. Para crear tareas, usa create_task y reporta el ID verificado.',
    },
    { role: 'user', content: message },
  ];

  const first = await requestJson('https://api.openai.com/v1/chat/completions', {
    model: OPENAI_MODEL,
    messages,
    tools: toolDefinitions,
    tool_choice: 'auto',
    temperature: 0.2,
  }, {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  });

  const assistantMessage = first.choices?.[0]?.message;
  const toolCalls = assistantMessage?.tool_calls || [];
  if (!toolCalls.length) {
    return {
      mode: 'openai',
      answer: assistantMessage?.content || 'OPPY no generó una respuesta.',
      toolResults: [],
    };
  }

  const toolResults = [];
  messages.push(assistantMessage);

  for (const call of toolCalls) {
    const name = call.function?.name;
    const fn = internalTools[name];
    if (!fn) continue;
    const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
    const result = await fn(args);
    toolResults.push({ tool: name, result });
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(result),
    });
  }

  const second = await requestJson('https://api.openai.com/v1/chat/completions', {
    model: OPENAI_MODEL,
    messages,
    temperature: 0.2,
  }, {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  });

  return {
    mode: 'openai',
    answer: second.choices?.[0]?.message?.content || 'Acción ejecutada.',
    toolResults,
  };
}

async function readRequestBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload, null, 2));
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'text/plain; charset=utf-8';
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const safePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'GET' && url.pathname === '/api/status') {
      sendJson(response, 200, {
        business: get_business_status(),
        financial: get_financial_status(),
        projects: get_projects_status(),
        sales: get_sales_status(),
        priorities: get_priority_actions(),
        tasks: await listTasks(),
        ai: { provider: process.env.OPENAI_API_KEY ? 'openai-optional' : 'deterministic-fallback', model: process.env.OPENAI_API_KEY ? OPENAI_MODEL : null },
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/tasks') {
      sendJson(response, 200, { tasks: await listTasks() });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/tasks') {
      const body = await readRequestBody(request);
      sendJson(response, 201, await create_task(body));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      const body = await readRequestBody(request);
      const message = String(body.message || '').trim();
      if (!message) {
        sendJson(response, 400, { error: 'message es requerido.' });
        return;
      }

      let result = null;
      try {
        result = await openAiAssistant(message);
      } catch {
        result = null;
      }
      if (!result) result = await deterministicAssistant(message);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'GET') {
      await serveStatic(request, response);
      return;
    }

    sendJson(response, 405, { error: 'Método no permitido.' });
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Error interno.' });
  }
});

server.listen(PORT, () => {
  console.log(`OPPY Mission Control listo en http://localhost:${PORT}`);
  console.log(`Modo IA: ${process.env.OPENAI_API_KEY ? 'OpenAI opcional' : 'fallback determinista sin API key'}`);
});
