import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { parseDataSchema } from '../../src/generate-docs/data-schema.ts';
import { readSchema } from '../../src/generate-docs/read-schema.ts';

// 結合テスト: データスキーマ定義書（md）と、テストDB（habit_app_test）のテーブル定義が一致することを確かめる。
// 実行前に `pnpm run db:apply:test` でDDLを適用しておく

/**
 * テストDBの接続先を得る。環境変数 TEST_DATABASE_URL、無ければ api の .env から読む。
 * @returns 接続文字列。どちらにも無ければ undefined
 */
function testDatabaseUrl(): string | undefined {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const p = 'apps/src/api/.env';
  // .env が無ければ未設定として扱う
  if (!existsSync(p)) return undefined;
  const m = /^\s*TEST_DATABASE_URL\s*=\s*(.*)$/m.exec(readFileSync(p, 'utf8'));
  return m?.[1]?.trim().replace(/^["']|["']$/g, '');
}

/** md の型の表記と、DBの型（format_type の表記）の対応。桁数がある型は、桁数を付けて比べる */
const dbType = (type: string, length: string): string =>
  ({ varchar: `character varying(${length})`, timestamptz: 'timestamp with time zone' } as Record<string, string>)[type] ?? type;

const url = testDatabaseUrl();
const md = readFileSync(new URL('../../../../docs/ai-input/data-schema.md', import.meta.url), 'utf8');

describe.skipIf(!url)('データスキーマ定義書とDBの一致', () => {
  const ds = parseDataSchema(md);
  const db = readSchema(url!);

  test('定義書のテーブルと、DBのテーブルが同じ', () => {
    expect(ds.tables.map((t) => t.id).sort()).toEqual(db.tables.map((t) => t.name).sort());
  });

  for (const table of ds.tables) {
    test(`${table.id}: 列の名前・順序・型・NOT NULL・既定値がDBと一致する`, () => {
      const actual = db.tables.find((t) => t.name === table.id)!;
      expect(table.columns.map((c) => c.column)).toEqual(actual.columns.map((c) => c.name));
      for (const [i, c] of table.columns.entries()) {
        const a = actual.columns[i]!;
        expect(dbType(c.type, c.length)).toBe(a.type);
        expect(c.notNull).toBe(!a.nullable);
        expect(c.default).toBe(a.default ?? '');
      }
    });
  }
});
