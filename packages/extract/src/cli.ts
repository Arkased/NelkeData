// Usage: tsx packages/extract/src/cli.ts list <pak> [filter]
//        tsx packages/extract/src/cli.ts extract <pak> <outDir> [filter]
import fs from 'node:fs';
import path from 'node:path';
import { readEntries, readFile } from './pak.js';

function main(): void {
  const [cmd, pak, a, b] = process.argv.slice(2);
  if (!pak || (cmd !== 'list' && cmd !== 'extract')) {
    throw new Error('usage: list <pak> [filter] | extract <pak> <outDir> [filter]');
  }
  const fd = fs.openSync(pak, 'r');
  try {
    const entries = readEntries(fd);
    const filter = cmd === 'list' ? a : b;
    const re = filter ? new RegExp(filter, 'i') : null;
    const picked = re ? entries.filter((e) => re.test(e.name)) : entries;
    if (cmd === 'list') {
      for (const e of picked) console.log(`${e.size}\t${e.name}`);
      return;
    }
    if (!a) throw new Error('extract needs an output folder');
    for (const e of picked) {
      const out = path.join(a, ...e.name.split(/[\\/]/).filter(Boolean));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, readFile(fd, e));
    }
    console.log(`extracted ${picked.length} files`);
  } finally {
    fs.closeSync(fd);
  }
}

main();
