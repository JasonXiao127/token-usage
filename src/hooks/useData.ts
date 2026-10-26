import { useEffect, useState } from 'react';
import type { DataFile } from '../../shared/types';

const URL = `${import.meta.env.BASE_URL}data/usage.json`;

export function useData() {
  const [data, setData] = useState<DataFile | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch(URL, { headers: { Accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DataFile>; })
      .then((j) => { if (alive) { setData(j); setError(null); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { data, error, loading };
}
