// app/src/lib/api.ts
// Клиент бэкенда офиса для командного центра. Базовые URL — под своё окружение.
const OFFICE = import.meta.env.VITE_OFFICE_URL ?? 'http://localhost:8100';
const GATEWAY = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:8000';

export interface AgentInfo {
  name: string;
  role: string;
  allowed_actions: string[];
}

export interface ActionRecord {
  id: string;
  agent_id: string;
  action: string;
  target: string;
  params: string;
  tier: string;
  status: string;
  result: string | null;
  provenance_hash: string;
  created_at: number;
  decided_at: number | null;
  decided_by: string | null;
}

export interface TaskResult {
  task_id: string;
  task: string;
  routed_to: string;
  routing_reason: string;
  result: {
    agent: string;
    action?: string;
    reason?: string;
    status?: string;
    gateway?: { id: string; tier: string; status: string };
  };
}

export interface TaskRecord {
  id: string;
  text: string;
  routed_to: string | null;
  action: string | null;
  action_id: string | null;
  tier: string | null;
  status: string | null;
  reason: string | null;
  created_at: number;
}

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}

// ── Офис (диспетчер Kristina) ────────────────────────────────────────────────

export const listAgents = () =>
  fetch(`${OFFICE}/office/agents`).then((r) => json<{ agents: AgentInfo[] }>(r));

export const submitTask = (task: string) =>
  fetch(`${OFFICE}/office/task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  }).then((r) => json<TaskResult>(r));

export const listTasks = (limit = 50) =>
  fetch(`${OFFICE}/office/tasks?limit=${limit}`).then((r) => json<{ tasks: TaskRecord[] }>(r));

export interface OntologyObjectType { name: string; key: string; properties: string[]; }
export interface OntologyActionType { name: string; target: string; tier: string; }
export interface OntologyTier { requires_approval: boolean; description: string; }
export interface Ontology {
  object_types: OntologyObjectType[];
  risk_tiers: Record<string, OntologyTier>;
  action_types: OntologyActionType[];
  agents: AgentInfo[];
}

export const getOntology = () =>
  fetch(`${OFFICE}/office/ontology`).then((r) => json<Ontology>(r));

// ── Шлюз (Action Service): очередь, провенанс, решения человека ──────────────

export const listPending = () =>
  fetch(`${GATEWAY}/actions/pending`).then((r) => json<{ pending: ActionRecord[] }>(r));

export const listAudit = (limit = 50) =>
  fetch(`${GATEWAY}/actions/audit?limit=${limit}`).then((r) => json<{ audit: ActionRecord[] }>(r));

export const approve = (id: string, approver = 'human') =>
  fetch(`${GATEWAY}/actions/${id}/approve?approver=${encodeURIComponent(approver)}`,
    { method: 'POST' }).then((r) => json<ActionRecord>(r));

export interface RunState {
  id: string;
  goal: string;
  agent_id: string;
  status: string;
  history: { action: string; target: string; result: string; status: string }[];
  pending_action_id: string | null;
  steps: number;
  summary: string | null;
}

// После одобрения действия — продолжить связанную задачу (если есть).
export const continueByAction = (actionId: string) =>
  fetch(`${OFFICE}/office/continue-by-action/${actionId}`, { method: 'POST' })
    .then((r) => json<{ run: RunState | null }>(r));

export const reject = (id: string, approver = 'human') =>
  fetch(`${GATEWAY}/actions/${id}/reject?approver=${encodeURIComponent(approver)}`,
    { method: 'POST' }).then((r) => json<ActionRecord>(r));

// ── Стекло: события, проекты, доска (Этап 5) ─────────────────────────────────

export interface OfficeEvent {
  id: number;
  ts: number;
  kind: string;
  agent: string | null;
  run_id: string | null;
  plan_id: string | null;
  payload: Record<string, unknown>;
}

export const listEvents = (after = 0, limit = 200) =>
  fetch(`${OFFICE}/office/events?after=${after}&limit=${limit}`)
    .then((r) => json<{ events: OfficeEvent[]; last_id: number }>(r));

export interface Subtask {
  n: number;
  agent: string;
  title: string;
  description: string;
  acceptance: string;
  depends_on: number[];
  status: 'queued' | 'in_progress' | 'done' | 'failed';
  run_id: string | null;
}

export interface Project {
  id: string;
  goal: string;
  status: 'planned' | 'running' | 'done' | 'failed' | 'plan_failed';
  subtasks: Subtask[];
  summary: string | null;
  created_at: number;
}

export type ProjectListItem = Omit<Project, 'subtasks'>;

export const startProject = (goal: string) =>
  fetch(`${OFFICE}/office/project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal }),
  }).then((r) => json<Project>(r));

export const listProjects = () =>
  fetch(`${OFFICE}/office/projects`).then((r) => json<{ projects: ProjectListItem[] }>(r));

export const getProject = (id: string) =>
  fetch(`${OFFICE}/office/project/${id}`).then((r) => json<Project>(r));

export interface Note { id: number; ts: number; agent: string; text: string; }

export const listNotes = () =>
  fetch(`${OFFICE}/office/notes`).then((r) => json<{ notes: Note[] }>(r));
