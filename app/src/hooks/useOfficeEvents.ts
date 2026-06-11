// Поллинг ленты событий офиса («стекло»): курсорная подгрузка раз в 2 секунды.
// Один и тот же хук кормит Office Floor и Live Feed.
import { useEffect, useRef, useState } from 'react';
import { listEvents, type OfficeEvent } from '@/lib/api';

const POLL_MS = 2000;
const KEEP_LAST = 500;

export function useOfficeEvents() {
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cursor = useRef(0);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { events: fresh, last_id } = await listEvents(cursor.current);
        if (!alive) return;
        if (fresh.length) {
          cursor.current = last_id;
          setEvents((prev) => [...prev, ...fresh].slice(-KEEP_LAST));
        }
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return { events, error };
}
