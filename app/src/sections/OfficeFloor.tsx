// Office Floor — «взгляд через стекло»: карточки агентов с живым статусом.
// Статус выводится из ленты событий: run_started без закрывающего события
// означает «работает», последнее action_executed — «что делает и почему».
import { useEffect, useMemo, useState } from 'react';
import { Bot, Loader2, Coffee, AlertCircle } from 'lucide-react';
import { listAgents, type AgentInfo, type OfficeEvent } from '@/lib/api';
import { useOfficeEvents } from '@/hooks/useOfficeEvents';

interface AgentLive {
  busy: boolean;
  goal: string;
  lastAction: string;
  lastReason: string;
  lastTs: number | null;
}

const CLOSERS = new Set(['run_done', 'run_failed', 'run_stopped']);

function deriveLive(events: OfficeEvent[], agent: string): AgentLive {
  const live: AgentLive = { busy: false, goal: '', lastAction: '', lastReason: '', lastTs: null };
  const openRuns = new Set<string>();
  for (const e of events) {
    if (e.agent !== agent) continue;
    live.lastTs = e.ts;
    if (e.kind === 'run_started' && e.run_id) {
      openRuns.add(e.run_id);
      live.goal = String(e.payload.goal ?? '');
    }
    if (CLOSERS.has(e.kind) && e.run_id) openRuns.delete(e.run_id);
    if (e.kind === 'action_executed' || e.kind === 'action_failed') {
      live.lastAction = `${e.payload.action ?? ''}${e.kind === 'action_failed' ? ' ⚠' : ''}`;
      live.lastReason = String(e.payload.reason ?? '');
    }
    if (e.kind === 'task_routed') {
      live.lastAction = 'раздаёт задачу';
      live.lastReason = `→ ${e.payload.routed_to}: ${e.payload.reason ?? ''}`;
    }
    if (e.kind === 'plan_created') {
      live.lastAction = 'составила план';
      live.lastReason = `${(e.payload.subtasks as unknown[] | undefined)?.length ?? '?'} подзадач`;
    }
  }
  live.busy = openRuns.size > 0;
  return live;
}

export default function OfficeFloor() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { events, error } = useOfficeEvents();

  useEffect(() => {
    listAgents()
      .then((r) => setAgents(r.agents))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const liveByAgent = useMemo(() => {
    const out: Record<string, AgentLive> = {};
    for (const a of agents) out[a.name] = deriveLive(events, a.name);
    return out;
  }, [agents, events]);

  if (loadError) {
    return (
      <div className="p-6 flex items-center gap-2 text-red-600">
        <AlertCircle size={18} /> Офис недоступен: {loadError}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {error && (
        <p className="text-xs text-amber-600">лента событий недоступна: {error}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((a) => {
          const live = liveByAgent[a.name] ?? {
            busy: false, goal: '', lastAction: '', lastReason: '', lastTs: null,
          };
          return (
            <div key={a.name} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${live.busy ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Bot size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A2F3D] capitalize">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.role}</p>
                  </div>
                </div>
                {live.busy ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
                    <Loader2 size={12} className="animate-spin" /> работает
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <Coffee size={12} /> свободен
                  </span>
                )}
              </div>

              {live.busy && live.goal && (
                <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 mb-2 line-clamp-3">
                  {live.goal}
                </p>
              )}
              {live.lastAction ? (
                <div className="text-xs text-slate-500">
                  <span className="font-mono text-slate-700">{live.lastAction}</span>
                  {live.lastReason && <span> — {live.lastReason}</span>}
                </div>
              ) : (
                <p className="text-xs text-slate-400">пока без активности</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
