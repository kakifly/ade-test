// 実行用の入口: habit_app_dev のカタログから docs/reference/テーブル仕様書.xlsx を生成する。
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { readSchema } from './read-schema.ts';
import { buildTableSpecWorkbook } from './table-spec-workbook.ts';

/**
 * 接続先DBのURLを取得する。環境変数 DATABASE_URL を優先し、無ければ api の .env から読む。
 * 値は表示しない。
 * @returns 接続文字列
 * @throws DATABASE_URL がどこにも設定されていないとき
 */
function databaseUrl(): string {
  // 環境変数があれば、.env は読まない
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = 'apps/src/api/.env';
  // .env がある場合だけ、DATABASE_URL の行を探す
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = /^\s*DATABASE_URL\s*=\s*(.*)$/.exec(line);
      // 前後の引用符は外して返す
      if (m) return m[1]!.trim().replace(/^['"]|['"]$/g, '');
    }
  }
  throw new Error('DATABASE_URL が未設定です');
}

// ================================================================
// 1. DBのカタログからテーブル定義を読む
// ================================================================
const schema = readSchema(databaseUrl());
// 開発用DB以外（本番相当のDBなど）からは生成しない
if (schema.dbName !== 'habit_app_dev') throw new Error(`想定外のDBです: ${schema.dbName}`);


// ================================================================
// 2. テーブル仕様書（Excel）の書き出し
//    出力先のフォルダが無ければ作る
// ================================================================
mkdirSync('../docs/reference', { recursive: true });
const out = '../docs/reference/テーブル仕様書.xlsx';
await buildTableSpecWorkbook(schema, new Date()).xlsx.writeFile(out);
console.log(`wrote ${out}（DB: ${schema.dbName}、テーブル ${schema.tables.length}）`);
