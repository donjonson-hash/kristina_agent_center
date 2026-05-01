import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Bot,
  Filter,
} from 'lucide-react';
import { actionLogs } from '@/data/mockData';
import type { ActionType } from '@/types';

const actionLabels: Record<ActionType, string> = {
  commit: 'Code Commit',
  deploy: 'Deployment',
  test: 'Test Execution',
  migrate: 'DB Migration',
  refactor: 'Refactoring',
  create: 'Creation',
  delete: 'Deletion',
};

const statusIcons = {
  success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Success' },
  error: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Error' },
  denied: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Denied' },
};

export default function AuditLog() {
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'denied'>('all');
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  const filtered = filter === 'all' ? actionLogs : actionLogs.filter((l) => l.status === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'success', 'error', 'denied'] as const).map((f) => {
            const count = f === 'all' ? actionLogs.length : actionLogs.filter((l) => l.status === f).length;
            const cfg = f === 'all' ? null : statusIcons[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-[#2E4A62] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cfg && <cfg.icon size={12} />}
                {f === 'all' ? 'All' : cfg?.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter size={14} />
          <span>Immutable audit trail</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-4">
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Agent</div>
          <div className="col-span-2">Action</div>
          <div className="col-span-3">Target</div>
          <div className="col-span-3">Details</div>
          <div className="col-span-1">Approval</div>
          <div className="col-span-1">Duration</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((log) => {
            const stCfg = statusIcons[log.status];
            const StatusIcon = stCfg.icon;
            const isSelected = selectedLog === log.id;

            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(isSelected ? null : log.id)}
                className={`cursor-pointer transition-colors ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
              >
                <div className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center text-sm">
                  <div className="col-span-1">
                    <StatusIcon size={16} className={stCfg.color} />
                  </div>
                  <div className="col-span-1 flex items-center gap-1.5">
                    <Bot size={14} className="text-slate-400" />
                    <span className="text-slate-700">{log.agentName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {actionLabels[log.action] || log.action}
                    </span>
                  </div>
                  <div className="col-span-3 text-slate-700 truncate">{log.target}</div>
                  <div className="col-span-3 text-xs text-slate-500 truncate">{log.details}</div>
                  <div className="col-span-1">
                    {log.humanApproved ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <UserCheck size={12} />
                        Human
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <Bot size={12} />
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 text-xs text-slate-400">
                    {log.duration > 0 ? `${log.duration}ms` : '—'}
                  </div>
                </div>

                {isSelected && (
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Action ID:</span>{' '}
                        <span className="font-mono text-slate-600">{log.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Agent ID:</span>{' '}
                        <span className="font-mono text-slate-600">{log.agentId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Timestamp:</span>{' '}
                        <span className="text-slate-600">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Duration:</span>{' '}
                        <span className="text-slate-600">{log.duration}ms</span>
                      </div>
                    </div>
                    {log.details && (
                      <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Details</p>
                        <p className="text-sm text-slate-700">{log.details}</p>
                      </div>
                    )}
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
