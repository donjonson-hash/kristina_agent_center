import { Bell, Activity } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-4 px-6 bg-white border-b border-slate-200">
      <div>
        <h2 className="text-xl font-semibold text-[#1A2F3D]">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
          <Activity size={14} className="animate-pulse" />
          <span>OpenClaw Connected</span>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2E4A62] to-[#5B8FA8] flex items-center justify-center text-white text-xs font-bold">
            K
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-[#1A2F3D]">Kristina</p>
            <p className="text-xs text-slate-500">Lead Developer</p>
          </div>
        </div>
      </div>
    </header>
  );
}
