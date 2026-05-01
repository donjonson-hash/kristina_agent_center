import { useState } from 'react';
import {
  CircleDot,
  AlertCircle,
  PauseCircle,
  XCircle,
  Cpu,
  Timer,
  Code2,
  Globe,
  Database,
  Bug,
  Crown,
} from 'lucide-react';
import { agents as initialAgents } from '@/data/mockData';
import type { Agent, AgentRole, AgentStatus } from '@/types';

const roleConfig: Record<
  AgentRole,
  { icon: React.ElementType; label: string; color: string; bg: string }
> = {
  lead: { icon: Crown, label: 'Lead', color: 'text-amber-600', bg: 'bg-amber-50' },
  frontend: { icon: Globe, label: 'Frontend', color: 'text-sky-600', bg: 'bg-sky-50' },
  backend: { icon: Database, label: 'Backend', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  devops: { icon: Code2, label: 'DevOps', color: 'text-violet-600', bg: 'bg-violet-50' },
  qa: { icon: Bug, label: 'QA', color: 'text-rose-600', bg: 'bg-rose-50' },
};

const statusConfig: Record<AgentStatus, { icon: React.ElementType; label: string; color: string }> = {
  active: { icon: CircleDot, label: 'Active', color: 'text-emerald-500' },
  idle: { icon: PauseCircle, label: 'Idle', color: 'text-slate-400' },
  busy: { icon: Timer, label: 'Busy', color: 'text-amber-500' },
  error: { icon: AlertCircle, label: 'Error', color: 'text-red-500' },
  offline: { icon: XCircle, label: 'Offline', color: 'text-slate-300' },
};

export default function Agents() {
  const [agents] = useState<Agent[]>(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [filterRole, setFilterRole] = useState<AgentRole | 'all'>('all');

  const filtered = filterRole === 'all' ? agents : agents.filter((a) => a.role === filterRole);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'lead', 'frontend', 'backend', 'devops', 'qa'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterRole === role
                  ? 'bg-[#2E4A62] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {role === 'all' ? 'All Agents' : role}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">{filtered.length} agents</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((agent) => {
          const roleCfg = roleConfig[agent.role];
          const statusCfg = statusConfig[agent.status];
          const RoleIcon = roleCfg.icon;
          const StatusIcon = statusCfg.icon;

          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
                selectedAgent?.id === agent.id ? 'border-[#5B8FA8] ring-1 ring-[#5B8FA8]/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2E4A62] to-[#5B8FA8] flex items-center justify-center text-white font-bold text-lg">
                    {agent.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A2F3D]">{agent.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <RoleIcon size={12} className={roleCfg.color} />
                      <span className={`text-xs font-medium ${roleCfg.color}`}>{roleCfg.label}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusIcon size={14} className={statusCfg.color} />
                  <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-4 line-clamp-2">{agent.description}</p>

              {agent.currentTask && (
                <div className="mb-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Current Task</p>
                  <p className="text-xs text-[#1A2F3D] font-medium">{agent.currentTask}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-sm font-semibold text-[#1A2F3D]">{agent.tasksCompleted}</p>
                  <p className="text-[10px] text-slate-400">Done</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-sm font-semibold text-red-500">{agent.tasksFailed}</p>
                  <p className="text-[10px] text-slate-400">Failed</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-sm font-semibold text-[#1A2F3D]">{agent.uptime}</p>
                  <p className="text-[10px] text-slate-400">Uptime</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                <span>v{agent.version}</span>
                <span>Last: {agent.lastActivity}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedAgent && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-[#1A2F3D] mb-4 flex items-center gap-2">
            <Cpu size={16} className="text-[#5B8FA8]" />
            Agent Details: {selectedAgent.name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailItem label="Agent ID" value={selectedAgent.id} />
            <DetailItem label="Role" value={selectedAgent.role} />
            <DetailItem label="Status" value={selectedAgent.status} />
            <DetailItem label="Version" value={selectedAgent.version} />
            <DetailItem label="Uptime" value={selectedAgent.uptime} />
            <DetailItem label="Tasks Completed" value={String(selectedAgent.tasksCompleted)} />
            <DetailItem label="Tasks Failed" value={String(selectedAgent.tasksFailed)} />
            <DetailItem label="Last Activity" value={selectedAgent.lastActivity} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-medium text-[#1A2F3D] capitalize">{value}</p>
    </div>
  );
}
