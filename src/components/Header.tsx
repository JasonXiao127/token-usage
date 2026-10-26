import { useEffect, useState } from 'react';
import { Github, Moon, Sun, Download } from 'lucide-react';
import { fmtDateUTC } from '../lib/format';

export function useTheme(): ['light' | 'dark' | 'system', (t: 'light' | 'dark' | 'system') => void, boolean] {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try { return (localStorage.getItem('tu-theme') as 'light' | 'dark' | 'system') || 'system'; } catch { return 'system'; }
  });
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && sysDark);
    document.documentElement.classList.toggle('dark', isDark);
    setDark(isDark);
    try { localStorage.setItem('tu-theme', theme); } catch { /* noop */ }
  }, [theme]);
  return [theme, setTheme, dark];
}

export default function Header({ generatedAt, windowEnd, ocUpdated, orAsOf }: { generatedAt: string; windowEnd: string; ocUpdated: string; orAsOf: string }) {
  const [, setTheme, dark] = useTheme();
  return (
    <header className="border-b border-(--rule)">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-4 sm:px-6">
        <p className="font-display text-[20px] font-medium leading-none tracking-[-0.01em]">
          Token Usage
        </p>
        <p className="text-[11px] text-(--muted)">
          OpenCode × OpenRouter · model usage index
        </p>
        <div className="ml-auto flex items-center gap-1 text-(--muted)">
          <span className="num hidden text-[11px] lg:inline" title={`Fetched ${fmtDateUTC(generatedAt)}`}>
            {windowEnd} · OC {ocUpdated.slice(0, 16).replace('T', ' ')} UTC · OR {orAsOf}
          </span>
          <button
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className="p-2 hover:text-(--ink)"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <a href={`${import.meta.env.BASE_URL}data/usage.json`} download className="p-2 hover:text-(--ink)" aria-label="Download raw JSON" title="Download raw JSON">
            <Download size={15} />
          </a>
          <a href="https://github.com/JasonXiao127/token-usage" target="_blank" rel="noreferrer" className="p-2 hover:text-(--ink)" aria-label="GitHub repository">
            <Github size={15} />
          </a>
        </div>
      </div>
    </header>
  );
}
