export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 py-4 text-center text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
      <p>Unofficial dashboard. Not affiliated with OpenCode or OpenRouter.</p>
      <p className="mt-1">
        Sources: <a className="hover:underline" href="https://opencode.ai/data/">OpenCode Data</a> ·{' '}
        <a className="hover:underline" href="https://openrouter.ai/rankings">OpenRouter rankings</a> (CC BY 4.0).{' '}
        <a className="hover:underline" href="https://github.com/JasonXiao127/token-usage">Code (MIT)</a>
      </p>
    </footer>
  );
}
