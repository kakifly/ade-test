// docs/ai-input/data-schema.md を読み取り、データスキーマとテーブル定義の構造にする（Excelには依存しない）。
import { parseMarkdown, type Block } from './markdown.ts';

/** 型の分類1つ分（「1. 型の分類」の表の1行）。 */
export type TypeInfo = {
  /** 型の名前（例: 文字列(半)(固)） */
  name: string;
  /** 型の備考 */
  note: string;
  /** 対応するDBの型（例: bigint、integer） */
  dbTypes: string;
};

/** データスキーマ（データドメイン）1つ分。 */
export type Domain = {
  /** 一覧の番号 */
  no: string;
  /** 分類（例: 習慣、システム） */
  category: string;
  /** データドメイン名（例: 習慣名） */
  name: string;
  /** データスキーマ名（例: d_habitname） */
  schema: string;
  /** 型の分類（TypeInfo.name のいずれか） */
  type: string;
  /** 桁数。決まっていなければ - */
  length: string;
  /** 半角換算の桁数。文字列は桁数の2倍、それ以外は桁数と同じ。桁数が数字でなければ - */
  halfWidth: string;
  /** 説明 */
  description: string;
  /** 備考 */
  note: string;
};

/** テーブルの列1つ分（「4. テーブル定義」の表の1行）。 */
export type ColumnDef = {
  /** 列の番号 */
  no: string;
  /** 列の名称（日本語） */
  label: string;
  /** 列の英名（DBの列名） */
  column: string;
  /** DBの型（例: varchar） */
  type: string;
  /** 桁。決まっていなければ - */
  length: string;
  /** 属するデータスキーマ名（Domain.schema のいずれか） */
  schema: string;
  /** INDEX。P は主キー、数字は主キー以外のインデックスの順番。無ければ空 */
  index: string;
  /** NOT NULL なら true */
  notNull: boolean;
  /** 一意制約の番号。無ければ空 */
  unique: string;
  /** 既定値。無ければ空 */
  default: string;
  /** 備考 */
  note: string;
};

/** テーブル1つ分（「3. テーブル一覧」の1行と、「4. テーブル定義」の1節を合わせたもの）。 */
export type TableDef = {
  /** 一覧の番号 */
  no: string;
  /** テーブルID（DBのテーブル名） */
  id: string;
  /** 名称（日本語） */
  name: string;
  /** 属性（例: トランザクション、マスタ） */
  attribute: string;
  /** 履歴テーブルを持つか（○ / ×） */
  history: string;
  /** 行バージョンによる排他をするか（○ / ×） */
  lock: string;
  /** 説明 */
  description: string;
  /** 備考 */
  note: string;
  /** 件数の見込（年間）。書かれていなければ空 */
  yearlyRows: string;
  /** 列の一覧（定義順） */
  columns: ColumnDef[];
};

/** データスキーマ定義書全体。 */
export type DataSchema = {
  /** 型の分類の一覧 */
  types: TypeInfo[];
  /** データスキーマの一覧 */
  domains: Domain[];
  /** テーブルの一覧 */
  tables: TableDef[];
};

/**
 * 桁数から、半角換算の桁数を求める。
 * @param type 型の分類
 * @param length 桁数の文字列
 * @returns 文字列で桁数が数字なら2倍。それ以外は桁数のまま
 */
function halfWidthOf(type: string, length: string): string {
  // 全角は半角の2倍として数えるので、全角を含みうる「文字列」だけを2倍にする
  if (type === '文字列' && /^\d+$/.test(length)) return String(Number(length) * 2);
  return length;
}

/**
 * ブロックの並びから、見出しの直後にある最初の表を取り出す。
 * @param blocks 解析済みのブロック
 * @param headingPart 見出しに含まれる文字列
 * @returns 表の行（見出し行は除く）
 * @throws 見出しまたは表が見つからないとき
 */
function tableAfter(blocks: Block[], headingPart: string): string[][] {
  const start = blocks.findIndex((b) => b.type === 'heading' && b.text.includes(headingPart));
  if (start < 0) throw new Error(`見出しが見つかりません: ${headingPart}`);
  for (const b of blocks.slice(start + 1)) {
    if (b.type === 'table') return b.rows;
    // 次の見出しに達したら、この見出しの下には表が無い
    if (b.type === 'heading') break;
  }
  throw new Error(`表が見つかりません: ${headingPart}`);
}

/**
 * データスキーマ定義書（Markdown）を読み取る。
 * @param md data-schema.md の全文
 * @returns 型の分類、データスキーマ、テーブル（列を含む）
 * @throws 必要な見出しや表が無いとき、テーブル定義が一覧に無いとき
 */
export function parseDataSchema(md: string): DataSchema {
  // ================================================================
  // 1. Markdownをブロックに分ける
  // ================================================================
  const blocks = parseMarkdown(md);

  // ================================================================
  // 2. 型の分類とデータスキーマの一覧を読む
  // ================================================================
  const types = tableAfter(blocks, '型の分類').map(([name, note, dbTypes]) => ({ name: name ?? '', note: note ?? '', dbTypes: dbTypes ?? '' }));
  const domains = tableAfter(blocks, 'データスキーマ一覧').map((r) => ({
    no: r[0] ?? '',
    category: r[1] ?? '',
    name: r[2] ?? '',
    schema: r[3] ?? '',
    type: r[4] ?? '',
    length: r[5] ?? '',
    halfWidth: halfWidthOf(r[4] ?? '', r[5] ?? ''),
    description: r[6] ?? '',
    note: r[7] ?? '',
  }));

  // ================================================================
  // 3. テーブル一覧を読み、テーブルごとの定義（レベル3の見出し）を結び付ける
  // ================================================================
  const tables: TableDef[] = tableAfter(blocks, 'テーブル一覧').map((r) => ({
    no: r[0] ?? '',
    id: r[1] ?? '',
    name: r[2] ?? '',
    attribute: r[3] ?? '',
    history: r[4] ?? '',
    lock: r[5] ?? '',
    description: r[6] ?? '',
    note: r[7] ?? '',
    yearlyRows: '',
    columns: [],
  }));
  for (const table of tables) {
    const start = blocks.findIndex((b) => b.type === 'heading' && b.level === 3 && b.text.split(/\s+/).includes(table.id));
    // 一覧にあるテーブルは、必ず定義の節も持つ
    if (start < 0) throw new Error(`テーブル定義がありません: ${table.id}`);
    for (const b of blocks.slice(start + 1)) {
      // 次の見出しに達したら、この節は終わり
      if (b.type === 'heading') break;
      if (b.type === 'bullet' && b.text.startsWith('件数見込')) table.yearlyRows = b.text.split(/[:：]/)[1]?.trim() ?? '';
      if (b.type === 'table') {
        table.columns = b.rows.map((c) => ({
          no: c[0] ?? '',
          label: c[1] ?? '',
          column: c[2] ?? '',
          type: c[3] ?? '',
          length: c[4] ?? '',
          schema: c[5] ?? '',
          index: c[6] ?? '',
          notNull: (c[7] ?? '') === '○',
          unique: c[8] ?? '',
          default: c[9] ?? '',
          note: c[10] ?? '',
        }));
      }
    }
  }
  return { types, domains, tables };
}
