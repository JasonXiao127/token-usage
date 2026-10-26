import { useEffect, useState } from 'react';
import { Github, Moon, Sun, Download } from 'lucide-react';

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
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-violet-600 text-sm font-bold text-white">T</div>
          <div>
            <div className="text-[15px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">Token Usage</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">OpenCode × OpenRouter</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="hidden md:inline" title={`Fetched ${generatedAt}`}>
            Window ending {windowEnd} · OC {ocUpdated.slice(0, 16).replace('T', ' ')} UTC · OR {orAsOf}
          </span>
          <button
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <a href={`${import.meta.env.BASE_URL}data/usage.json`} download className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800" aria-label="Download JSON" title="Download raw JSON">
            <Download size={15} />
          </a>
          <a href="https://github.com/JasonXiao127/token-usage" target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800" aria-label="GitHub repo">
            <Github size={15} />
          </a>
        </div>
      </div>
      <div className="border-t border-neutral-100 px-4 py-1.5 text-[11px] text-neutral-500 md:hidden dark:border-neutral-800 dark:text-neutral-400">
        Window ending {windowEnd} · OC {ocUpdated.slice(0, 16).replace('T', ' ')} UTC · OR {orAsOf}
      </div>
    </header>
  );
}
