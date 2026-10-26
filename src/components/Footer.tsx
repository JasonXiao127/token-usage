export default function Footer() {
  return (
    <footer className="border-t border-(--rule) py-4 text-[11px] leading-relaxed text-(--muted)">
      <p>Unofficial index. Not affiliated with OpenCode or OpenRouter.</p>
      <p className="mt-1">
        Sources: <a className="underline-offset-2 hover:underline" href="https://opencode.ai/data/">OpenCode Data</a> ·{' '}
        <a className="underline-offset-2 hover:underline" href="https://openrouter.ai/rankings">OpenRouter rankings</a> (CC BY 4.0).{' '}
        <a className="underline-offset-2 hover:underline" href="https://github.com/JasonXiao127/token-usage">Code (MIT)</a>
      </p>
    </footer>
  );
}
