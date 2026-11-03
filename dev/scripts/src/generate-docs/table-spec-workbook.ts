// DBから読み取ったテーブル定義を、テーブル仕様書のExcelワークブックに整形する（DBには依存しない）。
import ExcelJS from 'exceljs';

/** テーブルの列1つ分の定義。 */
export type ColumnInfo = {
  /** 列名 */
  name: string;
  /** 型（format_type の表記。例: character varying(100)） */
  type: string;
  /** NULLを許すか */
  nullable: boolean;
  /** 既定値の式。既定値が無ければ null */
  default: string | null;
};

/** 制約1つ分の定義。 */
export type ConstraintInfo = {
  /** 制約名 */
  name: string;
  /** 制約の定義（pg_get_constraintdef の表記） */
  definition: string;
};

/** トリガ1つ分の定義。 */
export type TriggerInfo = {
  /** トリガ名 */
  name: string;
  /** トリガの定義（pg_get_triggerdef の表記） */
  definition: string;
};

/** テーブル1つ分の定義。 */
export type TableInfo = {
  /** テーブル名 */
  name: string;
  /** 列の一覧（定義順） */
  columns: ColumnInfo[];
  /** 主キー。無ければ null */
  primaryKey: ConstraintInfo | null;
  /** 外部キーの一覧 */
  foreignKeys: ConstraintInfo[];
  /** 一意制約の一覧 */
  uniques: ConstraintInfo[];
  /** トリガの一覧（内部トリガは除く） */
  triggers: TriggerInfo[];
};

/** DB全体のテーブル定義。 */
export type SchemaInfo = {
  /** データベース名 */
  dbName: string;
  /** テーブルの一覧 */
  tables: TableInfo[];
};

/** 文書のフォント */
export const FONT = 'Yu Gothic';
/** 見出し行の背景色（ARGB） */
const HEAD_FILL = 'FFDCE6F1';
/** 罫線1本分の定義 */
const BORDER = { style: 'thin' as const, color: { argb: 'FF999999' } };
/** セルの四辺の罫線 */
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

/**
 * 行の各セルに、フォント・折り返し・罫線を設定する。見出し行は太字と背景色も付ける。
 * @param row 対象の行
 * @param head 見出し行ならtrue
 */
export function styleRow(row: ExcelJS.Row, head: boolean): void {
  row.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, bold: head };
    cell.alignment = { wrapText: true, vertical: 'top' };
    cell.border = BORDERS;
    if (head) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_FILL } };
  });
}

/**
 * シートに「タイトル行・見出し行・データ行」の表を1つ追加する。
 * @param ws 追加先のシート
 * @param title 表のタイトル
 * @param header 見出し行の各列の文字
 * @param rows データ行（該当が無ければ空配列）
 */
function section(ws: ExcelJS.Worksheet, title: string, header: string[], rows: string[][]): void {
  ws.addRow([]);
  const t = ws.addRow([title]);
  t.getCell(1).font = { name: FONT, size: 11, bold: true };
  styleRow(ws.addRow(header), true);
  // 該当が無いときも、空であることが分かるように1行出す
  if (rows.length === 0) styleRow(ws.addRow(['（なし）']), false);
  for (const r of rows) styleRow(ws.addRow(r), false);
}

/**
 * テーブル定義からテーブル仕様書のワークブックを組み立てる（ファイルには書かない）。
 * 表紙のあと、テーブルごとに1シートを作る。
 * @param schema DBから読み取ったテーブル定義
 * @param generatedAt 表紙に載せる生成日時
 * @returns 組み立てたワークブック
 */
export function buildTableSpecWorkbook(schema: SchemaInfo, generatedAt: Date): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = '';

  // ================================================================
  // 1. 表紙シートの作成
  //    生成日時とDB名だけを載せる（接続情報は載せない）
  // ================================================================
  const cover = wb.addWorksheet('表紙');
  cover.columns = [{ width: 20 }, { width: 50 }];
  cover.addRow(['テーブル仕様書']).getCell(1).font = { name: FONT, size: 16, bold: true };
  cover.addRow([]);
  styleRow(cover.addRow(['生成日時', generatedAt.toISOString()]), false);
  styleRow(cover.addRow(['データベース名', schema.dbName]), false);
  styleRow(cover.addRow(['テーブル数', String(schema.tables.length)]), false);
  cover.addRow([]);
  cover.addRow(['本書はDBから自動生成した資料です。直接編集しないでください。']).getCell(1).font = { name: FONT, size: 10 };

  // ================================================================
  // 2. テーブルごとのシートの作成
  //    列、主キー、外部キー、一意制約、トリガの順に表を並べる
  // ================================================================
  for (const table of schema.tables) {
    const ws = wb.addWorksheet(table.name.slice(0, 31));
    ws.columns = [{ width: 6 }, { width: 24 }, { width: 28 }, { width: 10 }, { width: 40 }, { width: 10 }];
    ws.addRow([`テーブル: ${table.name}`]).getCell(1).font = { name: FONT, size: 14, bold: true };

    const pkCols = new Set(table.primaryKey ? columnsOf(table.primaryKey.definition) : []);
    section(
      ws,
      '列',
      ['No.', '列名', '型', 'NULL', '既定値', '主キー'],
      table.columns.map((c, i) => [
        String(i + 1),
        c.name,
        c.type,
        c.nullable ? '可' : '不可',
        c.default ?? '',
        pkCols.has(c.name) ? '○' : '',
      ]),
    );
    section(ws, '主キー', ['', '制約名', '定義'], table.primaryKey ? [['', table.primaryKey.name, table.primaryKey.definition]] : []);
    section(ws, '外部キー', ['', '制約名', '定義'], table.foreignKeys.map((f) => ['', f.name, f.definition]));
    section(ws, '一意制約', ['', '制約名', '定義'], table.uniques.map((u) => ['', u.name, u.definition]));
    section(ws, 'トリガ', ['', 'トリガ名', '定義'], table.triggers.map((g) => ['', g.name, g.definition]));
    // 定義の長い文字列は折り返して読めるようにする（C列からF列を結合）
    ws.eachRow((row) => {
      if (row.cellCount === 3 && row.number > 1) {
        ws.mergeCells(row.number, 3, row.number, 6);
        row.height = Math.max(18, Math.ceil(String(row.getCell(3).value ?? '').length / 60) * 15 + 3);
      }
    });
  }
  return wb;
}

/**
 * "PRIMARY KEY (a, b)" のような定義から、列名を取り出す。
 * @param definition 制約の定義文字列
 * @returns 括弧の中の列名（引用符は除く）。括弧が無ければ空配列
 */
export function columnsOf(definition: string): string[] {
  const m = /\(([^)]*)\)/.exec(definition);
  // 括弧が無い定義には列が無い
  if (!m) return [];
  return m[1]!.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
}
