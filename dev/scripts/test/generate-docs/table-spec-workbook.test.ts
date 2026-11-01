import { describe, expect, test } from 'bun:test';
import { buildTableSpecWorkbook, columnsOf, type SchemaInfo } from '../../src/generate-docs/table-spec-workbook.ts';

const schema: SchemaInfo = {
  dbName: 'habit_app_dev',
  tables: [
    {
      name: 'habits',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, default: null },
        { name: 'txn_id', type: 'text', nullable: true, default: null },
        { name: 'row_version', type: 'bigint', nullable: false, default: '1' },
      ],
      primaryKey: { name: 'habits_pkey', definition: 'PRIMARY KEY (id)' },
      foreignKeys: [],
      uniques: [{ name: 'habits_name_key', definition: 'UNIQUE (name)' }],
      triggers: [{ name: 'habits_set_row_meta', definition: 'CREATE TRIGGER habits_set_row_meta BEFORE INSERT OR UPDATE ON habits' }],
    },
    {
      name: 'habit_checks',
      columns: [{ name: 'habit_id', type: 'uuid', nullable: false, default: null }],
      primaryKey: { name: 'habit_checks_pkey', definition: 'PRIMARY KEY (habit_id, check_date)' },
      foreignKeys: [{ name: 'fk', definition: 'FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE' }],
      uniques: [],
      triggers: [],
    },
  ],
};

const texts = (ws: import('exceljs').Worksheet): string[] => {
  const out: string[] = [];
  ws.eachRow((row) => row.eachCell((c) => out.push(String(c.value ?? ''))));
  return out;
};

describe('buildTableSpecWorkbook', () => {
  const wb = buildTableSpecWorkbook(schema, new Date('2026-11-01T00:00:00Z'));

  test('表紙と、1テーブル1シートが作られる', () => {
    expect(wb.worksheets.map((w) => w.name)).toEqual(['表紙', 'habits', 'habit_checks']);
  });

  test('表紙にはDB名と生成日時だけを載せる', () => {
    const t = texts(wb.getWorksheet('表紙')!);
    expect(t).toContain('habit_app_dev');
    expect(t).toContain('2026-11-01T00:00:00.000Z');
  });

  test('列のNULL可否・既定値・主キーを出す', () => {
    const t = texts(wb.getWorksheet('habits')!);
    expect(t).toContain('不可');
    expect(t).toContain('可');
    expect(t).toContain('1');
    expect(t).toContain('○');
    expect(t).toContain('habits_name_key');
    expect(t).toContain('habits_set_row_meta');
  });

  test('該当が無い区分は（なし）と出す', () => {
    expect(texts(wb.getWorksheet('habit_checks')!)).toContain('（なし）');
  });
});

describe('columnsOf', () => {
  test('括弧内の列名を取り出す', () => {
    expect(columnsOf('PRIMARY KEY (habit_id, check_date)')).toEqual(['habit_id', 'check_date']);
    expect(columnsOf('なし')).toEqual([]);
  });
});
