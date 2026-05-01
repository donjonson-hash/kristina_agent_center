import { useState } from 'react';
import {
  Shield,
  Globe,
  Bell,
  Cpu,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface SettingToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function Settings() {
  const [toggles, setToggles] = useState<SettingToggle[]>([
    {
      id: 'hitl',
      label: 'Human-in-the-Loop',
      description: 'Require human approval for production deployments and destructive actions',
      enabled: true,
    },
    {
      id: 'auto_test',
      label: 'Auto-Test on Commit',
      description: 'Automatically run test suite after each code commit',
      enabled: true,
    },
    {
      id: 'audit',
      label: 'Full Audit Logging',
      description: 'Record all agent actions with diff hashes and timestamps',
      enabled: true,
    },
    {
      id: 'staging_deploy',
      label: 'Auto-Staging Deploy',
      description: 'Automatically deploy to staging after tests pass',
      enabled: true,
    },
    {
      id: 'openclaw_browser',
      label: 'OpenClaw Browser Integration',
      description: 'Enable Playwright browser automation via OpenClaw Gateway',
      enabled: true,
    },
    {
      id: 'notify',
      label: 'Approval Notifications',
      description: 'Send notifications when human approval is required',
      enabled: true,
    },
  ]);

  const toggle = (id: string) => {
    setToggles((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Shield size={16} className="text-[#5B8FA8]" />
          <h3 className="text-sm font-semibold text-[#1A2F3D]">Security & Control</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {toggles.slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-[#1A2F3D]">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
              <button onClick={() => toggle(item.id)} className="text-slate-400 hover:text-[#5B8FA8] transition-colors">
                {item.enabled ? (
                  <ToggleRight size={28} className="text-[#5B8FA8]" />
                ) : (
                  <ToggleLeft size={28} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Globe size={16} className="text-[#5B8FA8]" />
          <h3 className="text-sm font-semibold text-[#1A2F3D]">OpenClaw Integration</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {toggles.slice(4).map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-[#1A2F3D]">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
              <button onClick={() => toggle(item.id)} className="text-slate-400 hover:text-[#5B8FA8] transition-colors">
                {item.enabled ? (
                  <ToggleRight size={28} className="text-[#5B8FA8]" />
                ) : (
                  <ToggleLeft size={28} />
                )}
              </button>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Cpu size={14} />
            <span>OpenClaw Gateway: Connected (Port 18789)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <Globe size={14} />
            <span>Playwright Browser: Enabled</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Bell size={16} className="text-[#5B8FA8]" />
          <h3 className="text-sm font-semibold text-[#1A2F3D]">System Info</h3>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Platform Version</span>
            <span className="text-[#1A2F3D] font-mono">v2.4.1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">OpenClaw Version</span>
            <span className="text-[#1A2F3D] font-mono">2026.4.24</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ontology Schema</span>
            <span className="text-[#1A2F3D] font-mono">v1.2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Last Updated</span>
            <span className="text-[#1A2F3D]">2026-04-30</span>
          </div>
        </div>
      </div>
    </div>
  );
}
