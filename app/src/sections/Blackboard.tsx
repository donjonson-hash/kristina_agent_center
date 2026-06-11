// Blackboard — доска решений команды: контракты (API, стек, конвенции),
// которые агенты опубликовали друг для друга через post_note.
import { useEffect, useState } from 'react';
import { StickyNote } from 'lucide-react';
import { listNotes, type Note } from '@/lib/api';

const POLL_MS = 3000;

export default function Blackboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      listNotes()
        .then((r) => { setNotes(r.notes); setError(null); })
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-6">
      {error && <p className="text-xs text-amber-600 mb-3">доска недоступна: {error}</p>}
      {notes.length === 0 && !error && (
        <p className="text-sm text-slate-400">
          Доска пуста. Агенты публикуют сюда контрактные решения по ходу проекта.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {notes.map((n) => (
          <div key={n.id} className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-amber-700">
              <StickyNote size={14} />
              <span className="text-xs font-semibold capitalize">{n.agent}</span>
              <span className="text-[11px] text-amber-600/70 ml-auto">
                {new Date(n.ts * 1000).toLocaleTimeString('ru-RU')}
              </span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{n.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
