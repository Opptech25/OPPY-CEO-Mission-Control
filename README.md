# OPPY — CEO Mission Control

OPPY is the AI Chief of Staff MVP for Opportuna.

It follows the operating loop:

**VER → ENTENDER → PRIORIZAR → ACTUAR → VERIFICAR**

The main demo is:

1. Ask: `OPPY, ¿qué debería atender primero hoy?`
2. OPPY prioritizes executive actions.
3. Ask: `Crea una tarea para hacer seguimiento a Constructora Horizonte hoy.`
4. OPPY creates an internal task, generates an ID, saves it, reads it back, and verifies it exists.

## Run locally

Requires Node.js 18 or newer.

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

No install step is required because the MVP uses only Node.js built-in modules.

## Optional OpenAI mode

The app works without any API key.

If `OPENAI_API_KEY` exists, the backend attempts to use OpenAI with function/tool calling and the model from `OPENAI_MODEL`.

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
npm start
```

If the key is missing, invalid, or OpenAI is unavailable, OPPY automatically uses the deterministic fallback for the demo flows.

Do not commit real API keys. `.env`, `.env.local`, and `data/tasks.json` are ignored by Git.

## Demo data

### Finanzas

- Caja: `$8.450.000 COP`
- Cartera: `$21.800.000 COP`
- Pipeline comercial: `$38.500.000 COP`

### Operación

- Proyectos activos: `7`
- Riesgos activos: `3`
- Cotizaciones pendientes: `5`

## Priority order

`getPriorityActions()` returns:

1. Constructora Horizonte
2. Transformación Organizacional
3. Grupo Andino

Prioritization uses financial impact, urgency, risk, due dates, and commercial opportunity.

## Internal tools

- `get_business_status`
- `get_financial_status`
- `get_projects_status`
- `get_sales_status`
- `get_priority_actions`
- `create_task`

`create_task` accepts:

```ts
{
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  client?: string;
}
```

Tasks are stored locally at `data/tasks.json` when the app runs.
