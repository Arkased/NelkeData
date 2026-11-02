// Usage: tsx scripts/compare-workbooks.ts <baseline.xlsx> <new.xlsx> [result.txt]
// Writes the same lines to the result file, which defaults to compare-<yyyymmdd-hhmmss>.txt next to the new workbook.
// Compares the cell values of 2 workbooks sheet by sheet, and the PNG file names in the icons/ folders next to them.
// Prints each difference and exits with 1 when there is one.
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';

function iconNames(xlsx: string): Set<string> {
  const dir = path.join(path.dirname(xlsx), 'icons');
  return new Set(fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')) : []);
}

function cellValue(cell: ExcelJS.Cell): string {
  return JSON.stringify(cell.value ?? null);
}

async function compareSheets(baselineFile: string, newFile: string): Promise<string[]> {
  const base = new ExcelJS.Workbook();
  const next = new ExcelJS.Workbook();
  await base.xlsx.readFile(baselineFile);
  await next.xlsx.readFile(newFile);
  const diffs: string[] = [];
  const baseNames = base.worksheets.map((w) => w.name);
  const nextNames = next.worksheets.map((w) => w.name);
  if (baseNames.join('|') !== nextNames.join('|')) diffs.push(`sheets differ: [${baseNames.join(', ')}] vs [${nextNames.join(', ')}]`);
  for (const a of base.worksheets) {
    const b = next.getWorksheet(a.name);
    if (!b) continue;
    if (a.rowCount !== b.rowCount) diffs.push(`${a.name}: ${a.rowCount} rows vs ${b.rowCount} rows`);
    if (a.columnCount !== b.columnCount) diffs.push(`${a.name}: ${a.columnCount} columns vs ${b.columnCount} columns`);
    const rows = Math.max(a.rowCount, b.rowCount);
    const columns = Math.max(a.columnCount, b.columnCount);
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= columns; c++) {
        const x = cellValue(a.getCell(r, c));
        const y = cellValue(b.getCell(r, c));
        if (x !== y) diffs.push(`${a.name} ${a.getCell(r, c).address}: ${x} vs ${y}`);
      }
    }
  }
  return diffs;
}

function compareIcons(baselineFile: string, newFile: string): string[] {
  const base = iconNames(baselineFile);
  const next = iconNames(newFile);
  return [
    ...[...base].filter((n) => !next.has(n)).map((n) => `icon only in baseline: ${n}`),
    ...[...next].filter((n) => !base.has(n)).map((n) => `icon only in new: ${n}`),
  ];
}

function timestamp(now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return `${date}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function main(): Promise<void> {
  const [baselineFile, newFile, resultArg] = process.argv.slice(2);
  if (!baselineFile || !newFile) throw new Error('usage: compare-workbooks.ts <baseline.xlsx> <new.xlsx> [result.txt]');
  const resultFile = resultArg ?? path.join(path.dirname(newFile), `compare-${timestamp(new Date())}.txt`);
  const diffs = [...(await compareSheets(baselineFile, newFile)), ...compareIcons(baselineFile, newFile)];
  const lines = [...diffs, diffs.length ? `${diffs.length} differences` : 'no difference'];
  fs.writeFileSync(resultFile, `${lines.join('\n')}\n`);
  for (const line of lines) console.log(line);
  console.log(`result written to ${resultFile}`);
  process.exitCode = diffs.length ? 1 : 0;
}

await main();
