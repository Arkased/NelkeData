// Usage: tsx packages/workbook/src/main.ts [extractedDir] [outFile]
// The defaults are extracted/ and output/nelke_data.xlsx in the repo root.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorkbook } from './build.js';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const [extractedDir, outFile] = process.argv.slice(2);

await buildWorkbook({
  extractedDir: extractedDir ?? path.join(repoRoot, 'extracted'),
  outFile: outFile ?? path.join(repoRoot, 'output', 'nelke_data.xlsx'),
});
