import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { readSchema } from '../../src/generate-docs/read-schema.ts';

// テストDB（habit_app_test）の接続先を環境変数、無ければ api の .env から得る
function testUrl(): string | undefined {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const p = 'dev/apps/src/api/.env';
  if (!existsSync(p)) return undefined;
  const m = /^\s*TEST_DATABASE_URL\s*=\s*(.*)$/m.exec(readFileSync(p, 'utf8'));
  return m?.[1]?.trim().replace(/^['"]|['"]$/g, '');
}

const url = testUrl();
describe.skipIf(!url)('readSchema（habit_app_test）', () => {
  const schema = readSchema(url!);
  test('DB名とテーブルを読める', () => {
    expect(schema.dbName).toBe('habit_app_test');
    expect(schema.tables.map((t) => t.name)).toEqual(['habit_checks', 'habits']);
  });
  test('制約とトリガを読める', () => {
    const checks = schema.tables.find((t) => t.name === 'habit_checks')!;
    expect(checks.primaryKey?.definition).toContain('habit_id, check_date');
    expect(checks.foreignKeys[0]?.definition).toContain('ON DELETE CASCADE');
    expect(checks.triggers.length).toBe(1);
    const habits = schema.tables.find((t) => t.name === 'habits')!;
    expect(habits.uniques[0]?.definition).toContain('name');
    expect(habits.columns.find((c) => c.name === 'row_version')?.default).toBe('1');
  });
});
