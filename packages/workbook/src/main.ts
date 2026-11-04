// Usage: tsx packages/workbook/src/main.ts [dataDir] [outFile]
// The defaults are data/ and output/nelke_data.xlsx in the repo root.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorkbook } from './build.js';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const [dataDir, outFile] = process.argv.slice(2);

await buildWorkbook({
  dataDir: dataDir ?? path.join(repoRoot, 'data'),
  outFile: outFile ?? path.join(repoRoot, 'output', 'nelke_data.xlsx'),
});
