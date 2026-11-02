// Usage: tsx scripts/compare-workbooks.ts <baseline.xlsx> <new.xlsx>
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

async function main(): Promise<void> {
  const [baselineFile, newFile] = process.argv.slice(2);
  if (!baselineFile || !newFile) throw new Error('usage: compare-workbooks.ts <baseline.xlsx> <new.xlsx>');
  const diffs = [...(await compareSheets(baselineFile, newFile)), ...compareIcons(baselineFile, newFile)];
  for (const d of diffs) console.log(d);
  console.log(diffs.length ? `${diffs.length} differences` : 'no difference');
  process.exitCode = diffs.length ? 1 : 0;
}

await main();
