// psql でDBのカタログ（information_schema と pg_catalog）を読み、テーブル定義を返す。
// 接続文字列は引数でpsqlに渡すだけで、出力やエラーメッセージには出さない。
import { spawnSync } from 'node:child_process';
import type { SchemaInfo } from './table-spec-workbook.ts';

/** テーブル・列・主キー・外部キー・一意制約・トリガを1つのJSONとして返すSQL。public スキーマの通常テーブルだけが対象。 */
const QUERY = `
SELECT json_build_object(
  'dbName', current_database(),
  'tables', COALESCE((
    SELECT json_agg(t ORDER BY t.name) FROM (
      SELECT
        c.relname AS name,
        (SELECT COALESCE(json_agg(json_build_object(
            'name', a.attname,
            'type', format_type(a.atttypid, a.atttypmod),
            'nullable', NOT a.attnotnull,
            'default', pg_get_expr(d.adbin, d.adrelid)
          ) ORDER BY a.attnum), '[]'::json)
         FROM pg_attribute a
         LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
         WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
        (SELECT json_build_object('name', k.conname, 'definition', pg_get_constraintdef(k.oid))
         FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'p') AS "primaryKey",
        (SELECT COALESCE(json_agg(json_build_object('name', k.conname, 'definition', pg_get_constraintdef(k.oid)) ORDER BY k.conname), '[]'::json)
         FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'f') AS "foreignKeys",
        (SELECT COALESCE(json_agg(json_build_object('name', k.conname, 'definition', pg_get_constraintdef(k.oid)) ORDER BY k.conname), '[]'::json)
         FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'u') AS uniques,
        (SELECT COALESCE(json_agg(json_build_object('name', g.tgname, 'definition', pg_get_triggerdef(g.oid)) ORDER BY g.tgname), '[]'::json)
         FROM pg_trigger g WHERE g.tgrelid = c.oid AND NOT g.tgisinternal) AS triggers
      FROM information_schema.tables it
      JOIN pg_class c ON c.relname = it.table_name
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = it.table_schema
      WHERE it.table_schema = 'public' AND it.table_type = 'BASE TABLE'
    ) t
  ), '[]'::json)
);`;

/**
 * psql でDBのカタログを読み、テーブル定義を返す。読み取り専用で、DBは変更しない。
 * @param url 接続文字列。psql の引数にだけ渡し、出力やエラーには出さない
 * @returns DB名とテーブル定義の一覧
 * @throws psql の実行に失敗したとき（原因の詳細は接続情報を含みうるので載せない）
 */
export function readSchema(url: string): SchemaInfo {
// ================================================================
// 1. カタログ照会の実行
// ================================================================
  const r = spawnSync('psql', [url, '-At', '-v', 'ON_ERROR_STOP=1', '-c', QUERY], { encoding: 'utf8' });
  // 失敗時はpsqlの出力を載せず、固定のメッセージだけにする（接続情報の漏えい防止）
  if (r.status !== 0) throw new Error('DBの読み取りに失敗しました（接続先と権限を確認してください）');

// ================================================================
// 2. 出力のJSONを定義として返す
// ================================================================
  return JSON.parse(r.stdout) as SchemaInfo;
}
