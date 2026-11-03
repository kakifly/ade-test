// データスキーマ定義書（data-schema.md の解析結果）を、テーブル設計書の書式に沿ったExcelワークブックに整形する。
import ExcelJS from 'exceljs';
import type { DataSchema, TableDef } from './data-schema.ts';
import { FONT, styleRow } from './table-spec-workbook.ts';

/**
 * シートの先頭に、シートのタイトル行を追加する。
 * @param ws 追加先のシート
 * @param title タイトルの文字
 */
function addTitle(ws: ExcelJS.Worksheet, title: string): void {
  ws.addRow([title]).getCell(1).font = { name: FONT, size: 14, bold: true };
  ws.addRow([]);
}

/**
 * 見出し行とデータ行からなる表を、シートに追加する。
 * @param ws 追加先のシート
 * @param header 見出し行の各列の文字
 * @param rows データ行
 */
function addTable(ws: ExcelJS.Worksheet, header: string[], rows: string[][]): void {
  styleRow(ws.addRow(header), true);
  for (const r of rows) styleRow(ws.addRow(r), false);
}

/**
 * テーブル1つ分のシートを追加する（テーブル定義書）。
 * 上にテーブルの属性、下に列の表を並べる。
 * @param wb 追加先のワークブック
 * @param table 対象のテーブル
 * @param domainOf データスキーマ名から、型と半角換算の桁数を引く関数
 */
function addTableSheet(wb: ExcelJS.Workbook, table: TableDef, domainOf: (schema: string) => { type: string; halfWidth: string }): void {
  const ws = wb.addWorksheet(table.id.slice(0, 31));
  ws.columns = [{ width: 6 }, { width: 22 }, { width: 18 }, { width: 14 }, { width: 8 }, { width: 22 }, { width: 18 }, { width: 10 }, { width: 8 }, { width: 5 }, { width: 8 }, { width: 6 }, { width: 44 }];

  // ================================================================
  // 1. タイトルとテーブルの属性
  // ================================================================
  addTitle(ws, `テーブル定義書: ${table.id}`);
  for (const [label, value] of [
    ['テーブルID', table.id],
    ['テーブル名', table.name],
    ['属性', table.attribute],
    ['履歴', table.history],
    ['排他', table.lock],
    ['件数見込(年間)', table.yearlyRows],
    ['説明', table.description],
  ] as const) {
    const row = ws.addRow([label, '', value]);
    styleRow(row, false);
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    ws.mergeCells(row.number, 1, row.number, 2);
    ws.mergeCells(row.number, 3, row.number, 7);
  }
  ws.addRow([]);

  // ================================================================
  // 2. 列の表
  //    データスキーマの型と半角換算の桁数は、データスキーマ一覧から引く
  // ================================================================
  addTable(
    ws,
    ['№', '名称', '英名', '型', '桁', 'データスキーマ', 'ドメインの型', '桁(半)', 'INDEX', 'N', 'UNIQUE', 'DEF', '備考'],
    table.columns.map((c) => {
      const d = domainOf(c.schema);
      return [c.no, c.label, c.column, c.type, c.length, c.schema, d.type, d.halfWidth, c.index, c.notNull ? '○' : '', c.unique, c.default, c.note];
    }),
  );
}

/**
 * データスキーマ定義書から、テーブル設計書の書式に沿ったワークブックを組み立てる（ファイルには書かない）。
 * シートは、表紙、型、データスキーマ一覧、テーブル一覧、テーブルごとの定義の順。
 * @param ds 解析済みのデータスキーマ定義書
 * @param generatedAt 表紙に載せる生成日時
 * @returns 組み立てたワークブック
 * @throws 列が、一覧に無いデータスキーマを指しているとき
 */
export function buildDataSchemaWorkbook(ds: DataSchema, generatedAt: Date): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = '';

  // ================================================================
  // 1. 表紙
  //    生成日時と、正本の場所を載せる
  // ================================================================
  const cover = wb.addWorksheet('表紙');
  cover.columns = [{ width: 20 }, { width: 70 }];
  cover.addRow(['データスキーマ定義書（テーブル設計書）']).getCell(1).font = { name: FONT, size: 16, bold: true };
  cover.addRow([]);
  styleRow(cover.addRow(['生成日時', generatedAt.toISOString()]), false);
  styleRow(cover.addRow(['データスキーマ数', String(ds.domains.length)]), false);
  styleRow(cover.addRow(['テーブル数', String(ds.tables.length)]), false);
  cover.addRow([]);
  cover.addRow(['本書は docs/ai-input/data-schema.md から生成した資料です。人が本書を編集したときは、AIに「mdを更新して」と指示してください（md が正本で、AIが md を更新して本書に再生成します）。']).getCell(1).font = { name: FONT, size: 10 };

  // ================================================================
  // 2. 型の分類
  // ================================================================
  const types = wb.addWorksheet('型');
  types.columns = [{ width: 18 }, { width: 40 }, { width: 24 }];
  addTitle(types, '型');
  addTable(types, ['型', '備考', 'DBの型'], ds.types.map((t) => [t.name, t.note, t.dbTypes]));

  // ================================================================
  // 3. データスキーマ一覧
  // ================================================================
  const list = wb.addWorksheet('データスキーマ一覧');
  list.columns = [{ width: 5 }, { width: 10 }, { width: 24 }, { width: 22 }, { width: 16 }, { width: 8 }, { width: 8 }, { width: 60 }, { width: 44 }];
  addTitle(list, 'データスキーマ一覧');
  addTable(list, ['No', '分類', 'データドメイン名', 'データスキーマ', '型', '桁数', '半角', '説明', '備考'], ds.domains.map((d) => [d.no, d.category, d.name, d.schema, d.type, d.length, d.halfWidth, d.description, d.note]));

  // ================================================================
  // 4. テーブル一覧
  // ================================================================
  const tableList = wb.addWorksheet('テーブル一覧');
  tableList.columns = [{ width: 5 }, { width: 20 }, { width: 16 }, { width: 18 }, { width: 6 }, { width: 6 }, { width: 50 }, { width: 44 }];
  addTitle(tableList, 'テーブル一覧');
  addTable(tableList, ['NO', 'テーブル名', '名称', '属性', '履歴', '排他', '説明', '備考'], ds.tables.map((t) => [t.no, t.id, t.name, t.attribute, t.history, t.lock, t.description, t.note]));

  // ================================================================
  // 5. テーブルごとの定義
  //    列が指すデータスキーマは、一覧に必ずあることを確かめる
  // ================================================================
  const bySchema = new Map(ds.domains.map((d) => [d.schema, d]));
  const domainOf = (schema: string) => {
    const d = bySchema.get(schema);
    if (!d) throw new Error(`データスキーマ一覧にありません: ${schema}`);
    return { type: d.type, halfWidth: d.halfWidth };
  };
  for (const table of ds.tables) addTableSheet(wb, table, domainOf);
  return wb;
}
