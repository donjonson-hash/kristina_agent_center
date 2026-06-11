// Plan Board — цель проекта и канбан подзадач: видно, как Kristina
// декомпозировала задачу, кому раздала и в каком состоянии каждая часть.
import { useCallback, useEffect, useState } from 'react';
import {
  Send, Loader2, CheckCircle2, XCircle, Clock, GitBranch, ArrowRight,
} from 'lucide-react';
import {
  startProject, listProjects, getProject,
  type Project, type Subtask,
} from '@/lib/api';

const POLL_MS = 2000;

const subtaskStyle: Record<Subtask['status'], { icon: React.ElementType; cls: string; label: string }> = {
  queued:      { icon: Clock,        cls: 'text-slate-500 bg-slate-50 border-slate-200', label: 'в очереди' },
  in_progress: { icon: Loader2,      cls: 'text-sky-600 bg-sky-50 border-sky-200',       label: 'в работе' },
  done:        { icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'готово' },
  failed:      { icon: XCircle,      cls: 'text-red-600 bg-red-50 border-red-200',       label: 'провал' },
};

const projectBadge: Record<Project['status'], string> = {
  planned: 'bg-slate-100 text-slate-600',
  running: 'bg-sky-50 text-sky-600',
  done: 'bg-emerald-50 text-emerald-600',
  failed: 'bg-red-50 text-red-600',
  plan_failed: 'bg-red-50 text-red-600',
};

export default function PlanBoard() {
  const [goal, setGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      if (project?.id) {
        setProject(await getProject(project.id));
      } else {
        const { projects } = await listProjects();
        if (projects.length) setProject(await getProject(projects[0].id));
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [project?.id]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const submit = async () => {
    const text = goal.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const p = await startProject(text);
      setProject(p);
      setGoal('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Постановка цели: единственная точка входа человека */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-[#1A2F3D] mb-3">
          Поставить цель проекта
        </p>
        <div className="flex gap-2">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Например: создай мини-приложение с ИИ-агентом для исследования эзотерических тем…"
            rows={2}
            className="flex-1 text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <button
            onClick={submit}
            disabled={submitting || !goal.trim()}
            className="px-4 rounded-lg bg-[#2E4A62] text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            В работу
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      {/* Текущий / последний проект */}
      {project && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#1A2F3D]">{project.goal}</p>
              {project.summary && (
                <p className="text-xs text-slate-500 mt-1">{project.summary}</p>
              )}
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${projectBadge[project.status]}`}>
              {project.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {project.subtasks.map((st) => {
              const s = subtaskStyle[st.status];
              const Icon = s.icon;
              return (
                <div key={st.n} className={`rounded-lg border p-4 ${s.cls}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono">#{st.n}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                      <Icon size={12} className={st.status === 'in_progress' ? 'animate-spin' : ''} />
                      {s.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#1A2F3D] mb-1">{st.title}</p>
                  <p className="text-xs text-slate-600 line-clamp-3 mb-2">{st.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <ArrowRight size={11} /> {st.agent}
                    </span>
                    {st.depends_on.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <GitBranch size={11} /> после #{st.depends_on.join(', #')}
                      </span>
                    )}
                  </div>
                  {st.acceptance && (
                    <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-200/60 pt-2">
                      Критерий: {st.acceptance}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!project && !error && (
        <p className="text-sm text-slate-400">Проектов пока нет — поставь первую цель.</p>
      )}
    </div>
  );
}
