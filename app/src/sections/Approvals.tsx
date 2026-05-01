import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Code2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Server,
  Database,
  Trash2,
  GitCommit,
  RefreshCw,
} from 'lucide-react';
import { approvalRequests } from '@/data/mockData';
import type { ApprovalRequest, ActionType } from '@/types';

const actionIcons: Record<ActionType, React.ElementType> = {
  commit: GitCommit,
  deploy: Server,
  test: Code2,
  migrate: Database,
  refactor: RefreshCw,
  create: Code2,
  delete: Trash2,
};

const riskConfig = {
  low: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Low Risk' },
  medium: { color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Medium Risk' },
  high: { color: 'text-red-600 bg-red-50 border-red-200', label: 'High Risk' },
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-500', label: 'Pending Review' },
  approved: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-500', label: 'Rejected' },
};

export default function Approvals() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(approvalRequests);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'approved' as const, resolvedAt: new Date().toISOString() } : r))
    );
  };

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' as const, resolvedAt: new Date().toISOString() } : r))
    );
  };

  return (
    <div className="p-6 space-y-6">
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <Shield size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{pendingCount} action(s)</span> require human approval before execution.
            Review the details below.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => {
            const count = f === 'all' ? requests.length : requests.filter((r) => r.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-[#2E4A62] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((req) => {
          const ActionIcon = actionIcons[req.action] || Code2;
          const riskCfg = riskConfig[req.risk];
          const stCfg = statusConfig[req.status];
          const StatusIcon = stCfg.icon;
          const isExpanded = expanded === req.id;
          const isPending = req.status === 'pending';

          return (
            <div
              key={req.id}
              className={`bg-white rounded-xl border transition-all ${
                isPending ? 'border-amber-200' : 'border-slate-200'
              }`}
            >
              <div
                className="p-5 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : req.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg ${riskCfg.color}`}>
                      <ActionIcon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-[#1A2F3D]">{req.description}</h4>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${riskCfg.color}`}
                        >
                          {riskCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <UserCheck size={12} />
                          {req.requestedBy} ({req.requesterRole})
                        </span>
                        <span className="flex items-center gap-1">
                          <Server size={12} />
                          {req.environment}
                        </span>
                        <span className="flex items-center gap-1">
                          <StatusIcon size={12} className={stCfg.color} />
                          {stCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isPending && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(req.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(req.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <span className="text-slate-400">Request ID:</span>
                      <p className="font-mono text-slate-600 mt-0.5">{req.id}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <span className="text-slate-400">Action Type:</span>
                      <p className="text-slate-600 mt-0.5 capitalize">{req.action}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <span className="text-slate-400">Target:</span>
                      <p className="text-slate-600 mt-0.5">{req.target}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <span className="text-slate-400">Requested:</span>
                      <p className="text-slate-600 mt-0.5">{new Date(req.requestedAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {req.diff && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Code2 size={14} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-500">Proposed Change</span>
                      </div>
                      <pre className="p-4 rounded-lg bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed">
                        {req.diff}
                      </pre>
                    </div>
                  )}

                  {req.resolvedAt && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={12} />
                      <span>Resolved: {new Date(req.resolvedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
