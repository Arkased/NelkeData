// Usage: tsx packages/model/src/cli.ts [extractedDir] [dataDir]
// The defaults are extracted/ and data/ in the repo root.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel } from './entities/build.js';
import { writeData } from './write.js';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const [extractedDir, dataDir] = process.argv.slice(2);
const outDir = dataDir ?? path.join(repoRoot, 'data');

const { data, icons } = buildModel(extractedDir ?? path.join(repoRoot, 'extracted'));
writeData(outDir, data, icons);
const counts = Object.entries(data).map(([kind, rows]) => `${kind}: ${rows.length}`);
console.log(`${counts.join(', ')}, icons: ${icons.size}`);
console.log(`wrote ${outDir}`);
