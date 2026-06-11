import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Dashboard from '@/sections/Dashboard';
import OfficeFloor from '@/sections/OfficeFloor';
import PlanBoard from '@/sections/PlanBoard';
import LiveFeed from '@/sections/LiveFeed';
import Blackboard from '@/sections/Blackboard';
import Agents from '@/sections/Agents';
import Tasks from '@/sections/Tasks';
import Ontology from '@/sections/Ontology';
import AuditLog from '@/sections/AuditLog';
import Approvals from '@/sections/Approvals';
import Settings from '@/sections/Settings';
import type { NavSection } from '@/components/Sidebar';

const sectionMeta: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of agent activity and system health' },
  floor: { title: 'Office Floor', subtitle: 'Взгляд через стекло: кто из агентов чем занят' },
  plan: { title: 'Plan Board', subtitle: 'Цель проекта, декомпозиция и ход подзадач' },
  feed: { title: 'Live Feed', subtitle: 'Хронология работы офиса: что и почему делает каждый агент' },
  blackboard: { title: 'Blackboard', subtitle: 'Доска решений: контракты, принятые командой' },
  agents: { title: 'Agent Team', subtitle: 'Manage AI developer agents and their roles' },
  tasks: { title: 'Tasks', subtitle: 'Track and assign development tasks' },
  ontology: { title: 'Ontology', subtitle: 'Browse the software development ontology graph' },
  audit: { title: 'Audit Log', subtitle: 'Immutable record of all agent actions' },
  approvals: { title: 'Human Approvals', subtitle: 'Review and approve critical agent actions' },
  settings: { title: 'Settings', subtitle: 'Configure OpenClaw integration and policies' },
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const meta = sectionMeta[activeSection];

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'floor':
        return <OfficeFloor />;
      case 'plan':
        return <PlanBoard />;
      case 'feed':
        return <LiveFeed />;
      case 'blackboard':
        return <Blackboard />;
      case 'agents':
        return <Agents />;
      case 'tasks':
        return <Tasks />;
      case 'ontology':
        return <Ontology />;
      case 'audit':
        return <AuditLog />;
      case 'approvals':
        return <Approvals />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar active={activeSection} onNavigate={setActiveSection} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto">{renderSection()}</main>
      </div>
    </div>
  );
}
