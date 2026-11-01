// 実行用の入口: habit_app_dev のカタログから docs/reference/テーブル仕様書.xlsx を生成する。
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { readSchema } from './read-schema.ts';
import { buildTableSpecWorkbook } from './table-spec-workbook.ts';

// 環境変数に無ければ api の .env から読む（値は表示しない）
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = 'dev/apps/src/api/.env';
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = /^\s*DATABASE_URL\s*=\s*(.*)$/.exec(line);
      if (m) return m[1]!.trim().replace(/^['"]|['"]$/g, '');
    }
  }
  throw new Error('DATABASE_URL が未設定です');
}

const schema = readSchema(databaseUrl());
// 開発用DB以外（本番相当のDBなど）からは生成しない
if (schema.dbName !== 'habit_app_dev') throw new Error(`想定外のDBです: ${schema.dbName}`);

mkdirSync('docs/reference', { recursive: true });
const out = 'docs/reference/テーブル仕様書.xlsx';
await buildTableSpecWorkbook(schema, new Date()).xlsx.writeFile(out);
console.log(`wrote ${out}（DB: ${schema.dbName}、テーブル ${schema.tables.length}）`);
