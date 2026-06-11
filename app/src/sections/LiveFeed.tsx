// Live Feed — хронология работы офиса: каждое событие на человеческом языке,
// с тем самым «почему» из решения агента. Это главный экран «стекла».
import { useEffect, useRef } from 'react';
import {
  ClipboardList, Play, CheckCircle2, XCircle, FileCog, StickyNote,
  ShieldCheck, ShieldAlert, Wrench, Flag, AlertTriangle, CircleDot,
} from 'lucide-react';
import type { OfficeEvent } from '@/lib/api';
import { useOfficeEvents } from '@/hooks/useOfficeEvents';

interface Rendered { icon: React.ElementType; cls: string; text: string }

function render(e: OfficeEvent): Rendered {
  const p = e.payload as Record<string, string | number | undefined>;
  const who = e.agent ?? 'офис';
  switch (e.kind) {
    case 'plan_created':
      return { icon: ClipboardList, cls: 'text-sky-600',
        text: `kristina составила план: «${p.goal}»` };
    case 'plan_failed':
      return { icon: AlertTriangle, cls: 'text-red-600',
        text: `kristina не смогла составить план: ${p.detail}` };
    case 'task_routed':
      return { icon: Play, cls: 'text-sky-600',
        text: `kristina → ${p.routed_to}: «${p.task}» (${p.reason})` };
    case 'subtask_started':
      return { icon: CircleDot, cls: 'text-sky-600',
        text: `${who} взял подзадачу #${p.n} «${p.title}»` };
    case 'subtask_done':
      return { icon: CheckCircle2, cls: 'text-emerald-600',
        text: `${who} завершил подзадачу #${p.n} «${p.title}»: ${p.summary ?? ''}` };
    case 'subtask_failed':
      return { icon: XCircle, cls: 'text-red-600',
        text: `${who} провалил подзадачу #${p.n} «${p.title}»: ${p.detail ?? ''}` };
    case 'run_started':
      return { icon: Play, cls: 'text-slate-500', text: `${who} начал прогон: ${p.goal}` };
    case 'run_done':
      return { icon: CheckCircle2, cls: 'text-emerald-600',
        text: `${who} закончил (${p.steps} шагов): ${p.summary ?? ''}` };
    case 'run_failed':
      return { icon: XCircle, cls: 'text-red-600', text: `${who}: прогон провален — ${p.detail}` };
    case 'run_stopped':
      return { icon: AlertTriangle, cls: 'text-amber-600', text: `${who}: ${p.detail}` };
    case 'action_executed':
      return e.payload.action === 'post_note'
        ? { icon: StickyNote, cls: 'text-violet-600', text: `${who} опубликовал контракт на доске` }
        : { icon: FileCog, cls: 'text-slate-600',
            text: `${who}: ${p.action}(${p.target ?? ''})${p.reason ? ` — ${p.reason}` : ''}` };
    case 'action_failed':
      return { icon: XCircle, cls: 'text-red-600',
        text: `${who}: ${p.action} упал — ${p.error}` };
    case 'action_rejected':
      return { icon: ShieldAlert, cls: 'text-amber-600',
        text: `шлюз отказал ${who}: ${p.action} (${p.detail})` };
    case 'verify_started':
      return { icon: ShieldCheck, cls: 'text-sky-600', text: 'ingrid запускает самопроверку (tests + lint)' };
    case 'verify_passed':
      return { icon: ShieldCheck, cls: 'text-emerald-600', text: 'самопроверка зелёная' };
    case 'verify_failed':
      return { icon: ShieldAlert, cls: 'text-red-600', text: `самопроверка провалена: ${p.report}` };
    case 'fix_iteration':
      return { icon: Wrench, cls: 'text-amber-600',
        text: `${who} чинит (итерация ${p.n} из ${p.of})` };
    case 'project_done':
      return { icon: Flag, cls: 'text-emerald-600', text: `ПРОЕКТ ЗАВЕРШЁН: ${p.summary}` };
    case 'project_failed':
      return { icon: Flag, cls: 'text-red-600', text: `ПРОЕКТ ПРОВАЛЕН: ${p.detail}` };
    default:
      return { icon: CircleDot, cls: 'text-slate-400', text: `${who}: ${e.kind}` };
  }
}

export default function LiveFeed() {
  const { events, error } = useOfficeEvents();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="p-6">
      {error && <p className="text-xs text-amber-600 mb-3">лента недоступна: {error}</p>}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-[calc(100vh-180px)] overflow-y-auto">
        {events.length === 0 && (
          <p className="p-6 text-sm text-slate-400">Событий пока нет — офис тих.</p>
        )}
        {events.map((e) => {
          const r = render(e);
          const Icon = r.icon;
          return (
            <div key={e.id} className="flex items-start gap-3 px-4 py-2.5">
              <Icon size={15} className={`mt-0.5 shrink-0 ${r.cls}`} />
              <div className="min-w-0">
                <p className="text-sm text-slate-700 break-words">{r.text}</p>
                <p className="text-[11px] text-slate-400">
                  {new Date(e.ts * 1000).toLocaleTimeString('ru-RU')}
                  {e.run_id && <span className="font-mono"> · run {e.run_id}</span>}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
    </div>
  );
}
