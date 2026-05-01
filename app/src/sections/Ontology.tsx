import { useState } from 'react';
import {
  Network,
  Folder,
  Box,
  Link2,
  Database,
  FileCode,
  Layout,
  TestTube,
  Rocket,
  ChevronRight,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { ontologyEntities } from '@/data/mockData';

const typeIcons: Record<string, React.ElementType> = {
  Project: Folder,
  Component: Box,
  APIEndpoint: Link2,
  DatabaseSchema: Database,
  UIElement: Layout,
  TestCase: TestTube,
  Deployment: Rocket,
};

const typeColors: Record<string, string> = {
  Project: 'text-amber-600 bg-amber-50',
  Component: 'text-sky-600 bg-sky-50',
  APIEndpoint: 'text-emerald-600 bg-emerald-50',
  DatabaseSchema: 'text-violet-600 bg-violet-50',
  UIElement: 'text-rose-600 bg-rose-50',
  TestCase: 'text-orange-600 bg-orange-50',
  Deployment: 'text-teal-600 bg-teal-50',
};

export default function Ontology() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['proj-001']));
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selected = ontologyEntities.find((e) => e.id === selectedEntity);

  return (
    <div className="p-6 flex gap-6 h-[calc(100vh-120px)]">
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A2F3D] flex items-center gap-2">
            <Network size={16} className="text-[#5B8FA8]" />
            Ontology Graph
          </h3>
          <span className="text-xs text-slate-400">{ontologyEntities.length} entities</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <EntityTree
            entityId="proj-001"
            level={0}
            expanded={expanded}
            toggleExpand={toggleExpand}
            selectedId={selectedEntity}
            onSelect={setSelectedEntity}
          />
        </div>
      </div>

      {selected && (
        <div className="w-96 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-[#1A2F3D]">Entity Details</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = typeIcons[selected.type] || FileCode;
                return (
                  <div className={`p-2 rounded-lg ${typeColors[selected.type] || 'text-slate-600 bg-slate-50'}`}>
                    <Icon size={20} />
                  </div>
                );
              })()}
              <div>
                <h4 className="font-semibold text-[#1A2F3D]">{selected.name}</h4>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    typeColors[selected.type] || 'text-slate-600 bg-slate-50'
                  }`}
                >
                  {selected.type}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Properties</p>
              <div className="space-y-2">
                {Object.entries(selected.properties).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                    <span className="text-xs text-slate-500 capitalize">{key}</span>
                    <span className="text-xs font-medium text-[#1A2F3D]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Relationships</p>
              <div className="space-y-2">
                {selected.relationships.map((rel, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 text-xs">
                    <ArrowRight size={12} className="text-[#5B8FA8] flex-shrink-0" />
                    <span className="text-slate-500">{rel.type}</span>
                    <span className="font-medium text-[#1A2F3D]">{rel.targetName}</span>
                    <span className="text-slate-400 ml-auto">{rel.targetType}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-400">
                <span>ID: {selected.id}</span>
                <span>Status: {selected.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EntityTree({
  entityId,
  level,
  expanded,
  toggleExpand,
  selectedId,
  onSelect,
}: {
  entityId: string;
  level: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const entity = ontologyEntities.find((e) => e.id === entityId);
  if (!entity) return null;

  const Icon = typeIcons[entity.type] || FileCode;
  const isExpanded = expanded.has(entity.id);
  const hasChildren = entity.relationships.length > 0;
  const isSelected = selectedId === entity.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-[#5B8FA8]/10 border border-[#5B8FA8]/30' : 'hover:bg-slate-50'
        }`}
        style={{ marginLeft: level * 20 }}
        onClick={() => onSelect(entity.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(entity.id);
          }}
          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600"
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-3" />
          )}
        </button>
        <Icon size={14} className={typeColors[entity.type]?.split(' ')[0] || 'text-slate-500'} />
        <span className={`text-sm ${isSelected ? 'font-semibold text-[#1A2F3D]' : 'text-slate-700'}`}>
          {entity.name}
        </span>
        <span className="text-[10px] text-slate-400 ml-auto">{entity.type}</span>
      </div>

      {isExpanded &&
        entity.relationships.map((rel) => (
          <EntityTree
            key={rel.targetId}
            entityId={rel.targetId}
            level={level + 1}
            expanded={expanded}
            toggleExpand={toggleExpand}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}
