const UA = 'token-usage-dashboard/1.0 (+https://github.com/JasonXiao127/token-usage)';

export async function fetchJson<T>(url: string, opts: { tries?: number; timeoutMs?: number } = {}): Promise<T> {
  const tries = opts.tries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 30000;
  let lastErr: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
        return (await r.json()) as T;
      } finally { clearTimeout(t); }
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchText(url: string, opts: { tries?: number; timeoutMs?: number } = {}): Promise<string> {
  const tries = opts.tries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 30000;
  let lastErr: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
        return await r.text();
      } finally { clearTimeout(t); }
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!, idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}
