import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parseDataSchema } from '../../src/generate-docs/data-schema.ts';
import { buildDataSchemaWorkbook } from '../../src/generate-docs/data-schema-workbook.ts';

const md = readFileSync(new URL('../../../../docs/ai-input/data-schema.md', import.meta.url), 'utf8');

describe('parseDataSchema', () => {
  const ds = parseDataSchema(md);

  test('データスキーマ一覧を、番号順に読み取る', () => {
    expect(ds.domains.map((d) => d.schema)).toContain('d_habitname');
    const name = ds.domains.find((d) => d.schema === 'd_habitname')!;
    expect(name).toMatchObject({ category: '習慣', name: '習慣名', type: '文字列', length: '50' });
  });

  test('文字列の半角換算は桁数の2倍、それ以外は桁数と同じ、桁数が無ければ - になる', () => {
    const byId = (s: string) => ds.domains.find((d) => d.schema === s)!;
    expect(byId('d_habitname').halfWidth).toBe('100');
    expect(byId('d_habitid').halfWidth).toBe('36');
    expect(byId('d_checkdate').halfWidth).toBe('-');
  });

  test('テーブル一覧と、テーブルごとの列の定義を読み取る', () => {
    expect(ds.tables.map((t) => t.id)).toEqual(['habits', 'habit_checks']);
    const habits = ds.tables[0]!;
    expect(habits).toMatchObject({ name: '習慣', attribute: 'トランザクション', history: '×', lock: '○' });
    expect(habits.columns.map((c) => c.column)).toEqual(['id', 'name', 'created_at', 'row_version', 'txn_id']);
    expect(habits.columns[1]).toMatchObject({ column: 'name', type: 'varchar', length: '50', schema: 'd_habitname', notNull: true, unique: '1' });
    expect(habits.columns[3]).toMatchObject({ default: '1' });
  });

  test('すべての列が、データスキーマ一覧にあるデータスキーマに属する', () => {
    const known = new Set(ds.domains.map((d) => d.schema));
    for (const t of ds.tables) for (const c of t.columns) expect(known.has(c.schema)).toBe(true);
  });

  test('データスキーマ名が重複しない', () => {
    const names = ds.domains.map((d) => d.schema);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('buildDataSchemaWorkbook', () => {
  const wb = buildDataSchemaWorkbook(parseDataSchema(md), new Date('2026-11-03T00:00:00Z'));

  test('表紙、型、データスキーマ一覧、テーブル一覧、テーブルごとのシートが作られる', () => {
    expect(wb.worksheets.map((w) => w.name)).toEqual(['表紙', '型', 'データスキーマ一覧', 'テーブル一覧', 'habits', 'habit_checks']);
  });

  test('データスキーマ一覧に、定義の行が出力される', () => {
    const ws = wb.getWorksheet('データスキーマ一覧')!;
    const rows: string[][] = [];
    ws.eachRow((r) => rows.push((r.values as unknown[]).slice(1).map((v) => String(v ?? ''))));
    expect(rows.some((r) => r.includes('d_habitid') && r.includes('文字列(半)(固)'))).toBe(true);
  });

  test('テーブルのシートに、列の英名とデータスキーマが出力される', () => {
    const ws = wb.getWorksheet('habits')!;
    const cells: string[] = [];
    ws.eachRow((r) => r.eachCell((c) => cells.push(String(c.value ?? ''))));
    expect(cells).toContain('row_version');
    expect(cells).toContain('d_rowversion');
  });
});
