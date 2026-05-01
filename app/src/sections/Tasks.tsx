import { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  PauseCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { tasks as initialTasks } from '@/data/mockData';
import type { Task, TaskStatus, TaskPriority } from '@/types';

const statusConfig: Record<TaskStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Pending' },
  in_progress: { icon: Loader2, color: 'text-sky-500', bg: 'bg-sky-50', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Failed' },
  blocked: { icon: PauseCircle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Blocked' },
};

const priorityConfig: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: 'text-slate-400', label: 'Low' },
  medium: { color: 'text-sky-500', label: 'Medium' },
  high: { color: 'text-amber-500', label: 'High' },
  critical: { color: 'text-red-500', label: 'Critical' },
};

export default function Tasks() {
  const [tasks] = useState<Task[]>(initialTasks);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

  const filtered = filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'pending', 'in_progress', 'completed', 'failed', 'blocked'] as const).map((status) => {
            const count = status === 'all' ? tasks.length : tasks.filter((t) => t.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filterStatus === status
                    ? 'bg-[#2E4A62] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'all' ? 'All' : statusConfig[status].label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Task</div>
          <div className="col-span-2">Assignee</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((task) => {
            const stCfg = statusConfig[task.status];
            const prCfg = priorityConfig[task.priority];
            const StatusIcon = stCfg.icon;
            const isExpanded = expandedTask === task.id;

            return (
              <div key={task.id}>
                <div
                  className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                >
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-[#1A2F3D]">{task.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{task.entityType}</p>
                  </div>
                  <div className="col-span-2">
                    {task.assigneeName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2E4A62] to-[#5B8FA8] flex items-center justify-center text-white text-[10px] font-bold">
                          {task.assigneeName[0]}
                        </div>
                        <span className="text-sm text-slate-600">{task.assigneeName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Unassigned</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stCfg.bg} ${stCfg.color}`}>
                      <StatusIcon size={12} />
                      {stCfg.label}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${prCfg.color}`}>
                      <ArrowUpCircle size={12} />
                      {prCfg.label}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            task.progress === 100
                              ? 'bg-emerald-400'
                              : task.progress > 50
                              ? 'bg-sky-400'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8">{task.progress}%</span>
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
                    <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Created:</span>{' '}
                        <span className="text-slate-600">{new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Started:</span>{' '}
                        <span className="text-slate-600">
                          {task.startedAt ? new Date(task.startedAt).toLocaleDateString() : 'Not started'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Entity:</span>{' '}
                        <span className="text-slate-600">
                          {task.entityType}:{task.entityId}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
