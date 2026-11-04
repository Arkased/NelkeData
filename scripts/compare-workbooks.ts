// Usage: tsx scripts/compare-workbooks.ts <baseline.xlsx> <new.xlsx> [result.txt]
// Writes the same lines to the result file, which defaults to compare-<yyyymmdd-hhmmss>.txt next to the new workbook.
// Pairs the rows of each sheet of 2 workbooks by the key of the sheet and compares the cells of each pair,
// and compares the PNG file names in the icons/ folders next to them.
// Prints each difference and exits with 1 when there is one.
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { compareRows, formatSheetDiff, type SheetRows } from './compare-rows.js';

function iconNames(xlsx: string): Set<string> {
  const dir = path.join(path.dirname(xlsx), 'icons');
  return new Set(fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')) : []);
}

function sheetRows(sheet: ExcelJS.Worksheet): SheetRows {
  const rows: string[][] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    rows.push(Array.from({ length: sheet.columnCount }, (_, c) => JSON.stringify(sheet.getCell(r, c + 1).value ?? null)));
  }
  const header = (rows.shift() ?? []).map((v) => String(JSON.parse(v) ?? ''));
  return { header, rows };
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
    if (b) diffs.push(...formatSheetDiff(a.name, compareRows(a.name, sheetRows(a), sheetRows(b))));
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
