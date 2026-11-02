import { describe, expect, it } from 'vitest';
import { ColumnWarningKind, findRedundantColumns, iconColumn, type Column } from '../sheet.js';

interface Row {
  id: number;
  kind: string;
}

const id: Column<Row> = { header: 'Id', width: 5, get: (r) => r.id };
const sameAsId: Column<Row> = { header: 'Id again', width: 5, get: (r) => r.id };
const kind: Column<Row> = { header: 'Kind', width: 5, get: (r) => r.kind };
const rows: Row[] = [
  { id: 1, kind: 'a' },
  { id: 2, kind: 'a' },
];

describe('findRedundantColumns', () => {
  it('reports a column with 1 value only', () => {
    expect(findRedundantColumns('S', [id, kind], rows)).toEqual([
      { sheet: 'S', column: 'Kind', kind: ColumnWarningKind.SingleValue, value: '"a"' },
    ]);
  });

  it('reports a column that is the same as an earlier column', () => {
    expect(findRedundantColumns('S', [id, sameAsId], rows)).toEqual([
      { sheet: 'S', column: 'Id again', kind: ColumnWarningKind.Duplicate, twin: 'Id' },
    ]);
  });

  it('reports nothing for distinct columns', () => {
    const other: Column<Row> = { header: 'Double', width: 5, get: (r) => r.id * 2 };

    expect(findRedundantColumns('S', [id, other], rows)).toEqual([]);
  });

  it('skips icon columns', () => {
    const icon = iconColumn<Row>(() => '');

    expect(findRedundantColumns('S', [icon, icon], rows)).toEqual([]);
  });

  it('does not report a single value when the sheet has 1 row only', () => {
    expect(findRedundantColumns('S', [kind], rows.slice(0, 1))).toEqual([]);
  });
});
