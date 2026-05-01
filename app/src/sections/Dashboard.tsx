import { Bot, ClipboardCheck, ShieldAlert, Zap, Clock, TrendingUp } from 'lucide-react';
import { dashboardStats, metricsData } from '@/data/mockData';
import { agents, actionLogs } from '@/data/mockData';

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
      </div>
      <p className="text-2xl font-bold text-[#1A2F3D]">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function MiniBarChart() {
  const maxVal = Math.max(...metricsData.map((d) => d.tasksPerHour));
  return (
    <div className="flex items-end gap-1.5 h-20 mt-4">
      {metricsData.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-[#5B8FA8]/70 hover:bg-[#5B8FA8] transition-colors"
            style={{ height: `${(d.tasksPerHour / maxVal) * 100}%` }}
          />
          <span className="text-[10px] text-slate-400">{d.timestamp}</span>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart() {
  const points = metricsData
    .map((d, i) => {
      const x = (i / (metricsData.length - 1)) * 100;
      const y = 100 - d.successRate;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 20" className="w-full h-16 mt-2" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="#5B8FA8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Dashboard() {
  const stats = dashboardStats;
  const activeAgents = agents.filter((a) => a.status === 'active');
  const recentLogs = actionLogs.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Bot}
          label="Active Agents"
          value={`${stats.activeAgents}/${stats.totalAgents}`}
          sub="Online"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Tasks Completed"
          value={stats.completedTasks}
          sub={`of ${stats.totalTasks} total`}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={ShieldAlert}
          label="Pending Approvals"
          value={stats.pendingApprovals}
          sub="Human review"
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Zap}
          label="Recent Actions"
          value={stats.recentActions}
          sub="Last 24h"
          color="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-[#1A2F3D] mb-1">Task Throughput</h3>
          <p className="text-xs text-slate-500 mb-2">Tasks processed per hour (24h)</p>
          <MiniBarChart />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-[#1A2F3D] mb-1">Success Rate Trend</h3>
          <p className="text-xs text-slate-500 mb-2">Agent action success %</p>
          <MiniLineChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-[#1A2F3D] mb-4">Active Agents</h3>
          <div className="space-y-3">
            {activeAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2E4A62] to-[#5B8FA8] flex items-center justify-center text-white text-sm font-bold">
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A2F3D]">{agent.name}</p>
                  <p className="text-xs text-slate-500 truncate">{agent.currentTask}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-600 font-medium capitalize">{agent.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-[#1A2F3D] mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    log.status === 'success'
                      ? 'bg-emerald-50 text-emerald-600'
                      : log.status === 'denied'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <TrendingUp size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A2F3D]">
                    <span className="font-medium">{log.agentName}</span>{' '}
                    <span className="text-slate-500">
                      {log.action} on {log.target}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{log.details}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  <Clock size={10} className="inline mr-1" />
                  {log.duration > 0 ? `${log.duration}ms` : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
