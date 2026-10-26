export default function StaleBanner({ generatedAt }: { generatedAt: string }) {
  const ageH = (Date.now() - new Date(generatedAt).getTime()) / 3600000;
  if (ageH < 12) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
      Data is {ageH.toFixed(0)} hours old (last refresh {generatedAt.slice(0, 16).replace('T', ' ')} UTC). The scheduled collector may have failed — check the <a className="underline" href="https://github.com/JasonXiao127/token-usage/actions">Actions tab</a>.
    </div>
  );
}
