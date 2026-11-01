// DBから読み取ったテーブル定義を、テーブル仕様書のExcelワークブックに整形する（DBには依存しない）。
import ExcelJS from 'exceljs';

export type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
};
export type ConstraintInfo = { name: string; definition: string };
export type TriggerInfo = { name: string; definition: string };
export type TableInfo = {
  name: string;
  columns: ColumnInfo[];
  primaryKey: ConstraintInfo | null;
  foreignKeys: ConstraintInfo[];
  uniques: ConstraintInfo[];
  triggers: TriggerInfo[];
};
export type SchemaInfo = { dbName: string; tables: TableInfo[] };

const FONT = 'Yu Gothic';
const HEAD_FILL = 'FFDCE6F1';
const BORDER = { style: 'thin' as const, color: { argb: 'FF999999' } };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function styleRow(row: ExcelJS.Row, head: boolean): void {
  row.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, bold: head };
    cell.alignment = { wrapText: true, vertical: 'top' };
    cell.border = BORDERS;
    if (head) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_FILL } };
  });
}

function section(ws: ExcelJS.Worksheet, title: string, header: string[], rows: string[][]): void {
  ws.addRow([]);
  const t = ws.addRow([title]);
  t.getCell(1).font = { name: FONT, size: 11, bold: true };
  styleRow(ws.addRow(header), true);
  // 該当が無いときも、空であることが分かるように1行出す
  if (rows.length === 0) styleRow(ws.addRow(['（なし）']), false);
  for (const r of rows) styleRow(ws.addRow(r), false);
}

export function buildTableSpecWorkbook(schema: SchemaInfo, generatedAt: Date): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = '';

  // 表紙: 生成日時とDB名だけを載せる（接続情報は載せない）
  const cover = wb.addWorksheet('表紙');
  cover.columns = [{ width: 20 }, { width: 50 }];
  cover.addRow(['テーブル仕様書']).getCell(1).font = { name: FONT, size: 16, bold: true };
  cover.addRow([]);
  styleRow(cover.addRow(['生成日時', generatedAt.toISOString()]), false);
  styleRow(cover.addRow(['データベース名', schema.dbName]), false);
  styleRow(cover.addRow(['テーブル数', String(schema.tables.length)]), false);
  cover.addRow([]);
  cover.addRow(['本書はDBから自動生成した資料です。直接編集しないでください。']).getCell(1).font = { name: FONT, size: 10 };

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

// "PRIMARY KEY (a, b)" のような定義から列名を取り出す
export function columnsOf(definition: string): string[] {
  const m = /\(([^)]*)\)/.exec(definition);
  // 括弧が無い定義には列が無い
  if (!m) return [];
  return m[1]!.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
}
