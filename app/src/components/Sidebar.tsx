import { useState } from 'react';
import {
  LayoutDashboard,
  Bot,
  ClipboardList,
  Network,
  ScrollText,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavSection =
  | 'dashboard'
  | 'agents'
  | 'tasks'
  | 'ontology'
  | 'audit'
  | 'approvals'
  | 'settings';

interface SidebarProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
}

const navItems: { id: NavSection; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agents', label: 'Agent Team', icon: Bot },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'ontology', label: 'Ontology', icon: Network },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
  { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`bg-[#1A2F3D] text-white flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#5B8FA8] flex items-center justify-center text-white font-bold text-sm">
              K
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide">Kristina</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Lead Dev</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-[#5B8FA8] flex items-center justify-center text-white font-bold text-sm mx-auto">
            K
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-[#5B8FA8]/20 text-[#5B8FA8]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-white/10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
