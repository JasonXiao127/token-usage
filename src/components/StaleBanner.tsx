export default function StaleBanner({ generatedAt }: { generatedAt: string }) {
  const ageH = (Date.now() - new Date(generatedAt).getTime()) / 3600000;
  if (ageH < 12) return null;
  return (
    <p className="t-data border-l-2 border-(--or) pl-3 text-(--muted)">
      Data is {ageH.toFixed(0)} hours old (last refresh {generatedAt.slice(0, 16).replace('T', ' ')} UTC). The scheduled collector may have failed — see the <a className="underline" href="https://github.com/JasonXiao127/token-usage/actions">Actions tab</a>.
    </p>
  );
}
