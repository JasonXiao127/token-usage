export function fmtTokens(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  const units: Array<[number, string]> = [
    [1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K'],
  ];
  for (const [v, s] of units) {
    if (abs >= v) {
      const x = n / v;
      return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + s;
    }
  }
  return String(Math.round(n));
}

export function fmtFull(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

export function fmtShare(p: number | null | undefined): string {
  if (p == null || !isFinite(p)) return '—';
  if (p === 0) return '0%';
  if (p >= 10) return p.toFixed(1) + '%';
  if (p >= 1) return p.toFixed(2) + '%';
  if (p >= 0.01) return p.toFixed(2) + '%';
  return p.toFixed(3) + '%';
}

export function fmtChange(c: number | null | undefined, isNew?: boolean): { text: string; tone: 'up' | 'down' | 'flat' | 'new' | 'na' } {
  if (isNew) return { text: 'new', tone: 'new' };
  if (c == null || !isFinite(c)) return { text: '—', tone: 'na' };
  const pct = c * 100;
  if (Math.abs(pct) < 0.05) return { text: '±0%', tone: 'flat' };
  const sign = pct > 0 ? '+' : '';
  const t = `${sign}${pct >= 1000 || pct <= -1000 ? Math.round(pct).toLocaleString() : pct.toFixed(pct >= 100 || pct <= -100 ? 0 : 1)}%`;
  return { text: t, tone: pct > 0 ? 'up' : 'down' };
}

export function fmtPrice(p: number | null | undefined): string {
  if (p == null || !isFinite(p)) return '—';
  if (p === 0) return '$0';
  return '$' + (p >= 10 ? p.toFixed(1) : p >= 1 ? p.toFixed(2) : p.toFixed(p < 0.01 ? 4 : 3));
}

export function fmtCtx(n: number | null | undefined): string {
  if (n == null || !isFinite(n) || n <= 0) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 0) + 'K';
  return String(n);
}

export function fmtDateUTC(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

export function fmtShortDate(iso: string): string {
  return iso.slice(5);
}
