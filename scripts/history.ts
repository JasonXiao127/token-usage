import { rebuildHistoryIndex, verifyHistory } from './lib/history.ts';

const cmd = process.argv[2] || 'verify';

async function main(): Promise<void> {
  if (cmd === 'rebuild') {
    const { entries } = await rebuildHistoryIndex();
    console.log(`rebuilt index with ${entries} days`);
    return;
  }
  // default: verify
  const { issues, files, bytes } = await verifyHistory();
  console.log(`history: ${files} files, ${(bytes / 1048576).toFixed(2)}MB`);
  const errors = issues.filter((i) => i.level === 'error');
  for (const i of issues) console.log(`${i.level}: ${i.message}`);
  if (errors.length) {
    console.error(`HISTORY VERIFY FAILED: ${errors.length} error(s)`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
