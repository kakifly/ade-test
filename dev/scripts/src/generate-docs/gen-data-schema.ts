// 実行用の入口: docs/ai-input/data-schema.md から docs/reference/データスキーマ.xlsx を生成する。
// 実行時の作業ディレクトリは dev/ とする（パスは相対指定）。
// 編集ルール: 人は Excel を編集し、AI は md を編集する。人が Excel を編集したら、人が指示して md に反映する。
// md を更新したら、このスクリプトで Excel に反映する。
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { parseDataSchema } from './data-schema.ts';
import { buildDataSchemaWorkbook } from './data-schema-workbook.ts';

/** 入力（正本）の md */
const src = '../docs/ai-input/data-schema.md';
/** 出力先の Excel */
const out = '../docs/reference/データスキーマ.xlsx';

// ================================================================
// 1. 人の編集を上書きしないための確認
//    Excel に未コミットの変更があるときは、人が編集した可能性がある。
//    先に md へ反映しないと編集が消えるので、ここで中止する（初めての生成で、まだ追跡されていないときは進める）
// ================================================================
const status = spawnSync('git', ['status', '--porcelain', '--', out], { encoding: 'utf8' });
if (status.status === 0 && status.stdout.trim() !== '' && !status.stdout.startsWith('??')) {
  console.error(`${out} に未コミットの変更があります。人が Excel を編集した場合は、先に md へ反映してください（反映を指示するか、変更を取り消す）。`);
  process.exit(1);
}

// ================================================================
// 2. データスキーマ定義書（Markdown）の読み込み
// ================================================================
const ds = parseDataSchema(readFileSync(src, 'utf8'));

// ================================================================
// 3. Excelの生成と書き出し
//    出力先のフォルダが無ければ作る
// ================================================================
mkdirSync('../docs/reference', { recursive: true });
await buildDataSchemaWorkbook(ds, new Date()).xlsx.writeFile(out);
console.log(`wrote ${out}（データスキーマ ${ds.domains.length}、テーブル ${ds.tables.length}）`);
