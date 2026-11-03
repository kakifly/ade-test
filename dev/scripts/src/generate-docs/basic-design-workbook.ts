// 基本設計書（Markdown）から、顧客提出用のExcelワークブックを組み立てる。
import ExcelJS from 'exceljs';
import { parseMarkdown, type Block } from './markdown.ts';

/** 文書のフォント */
const FONT = 'Yu Gothic';
/** 1シートの文字幅の合計（全角は2文字分） */
const TOTAL_WIDTH = 150;
/** 罫線1本分の定義 */
const BORDER = { style: 'thin' as const, color: { argb: 'FF999999' } };
/** セルの四辺の罫線 */
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

/**
 * 文字列の表示幅を数える。全角文字は2、半角は1とする。
 * @param s 数える文字列
 * @returns 表示幅
 */
const displayWidth = (s: string): number => [...s].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0);

/**
 * セルの文字が折り返して何行になるかを見積もる。
 * @param text セルの文字（改行を含んでよい）
 * @param width セルの幅（文字幅）。余白として2を引いて数える
 * @returns 行数（1以上）
 */
const lineCount = (text: string, width: number): number =>
  text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(displayWidth(line) / Math.max(1, width - 2))), 0);

/**
 * 見出しからExcelのシート名を作る。31文字以内で、使えない文字（\ / ? * [ ] :）は除く。
 * 重複したら末尾に連番を付け、使用済みの集合にも登録する。
 * @param title 元になる見出し
 * @param used すでに使ったシート名の集合（この関数が追加する）
 * @returns 重複しないシート名
 */
function sheetName(title: string, used: Set<string>): string {
  const base = title.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'シート';
  let name = base;
  // 同じ名前のシートがすでにあれば、連番を付けて避ける
  for (let n = 2; used.has(name); n++) name = `${base.slice(0, 28)}(${n})`;
  used.add(name);
  return name;
}

/** シート1枚分の内容。 */
type Sheet = {
  /** シート名の元になる見出し（## の文字） */
  title: string;
  /** シートに載せるブロック */
  blocks: Block[];
};

/**
 * ブロックの並びを、表紙用と、## 見出しごとのシート用に分ける。
 * @param blocks Markdownを解析したブロック
 * @returns 最初の ## より前のブロック（cover）と、## ごとのシート（sections）
 */
function splitSections(blocks: Block[]): { cover: Block[]; sections: Sheet[] } {
  const cover: Block[] = [];
  const sections: Sheet[] = [];
  for (const block of blocks) {
    if (block.type === 'heading' && block.level === 2) {
      sections.push({ title: block.text, blocks: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1]!.blocks.push(block);
    } else {
      // 最初の ## より前は表紙に載せる
      cover.push(block);
    }
  }
  return { cover, sections };
}

/**
 * ブロックの並びを、シートの末尾に書き出す。
 * @param ws 書き出し先のシート
 * @param blocks 書き出すブロック
 * @param cols シートの列数
 * @param colWidth 1列の幅（文字幅）
 */
function writeBlocks(ws: ExcelJS.Worksheet, blocks: Block[], cols: number, colWidth: number): void {
  // ================================================================
  // 1. 1行の文章を書く部品の用意
  //    全列を結合し、折り返しの行数から行の高さを決める
  // ================================================================
  const fullWidth = cols * colWidth;
  const textRow = (text: string, opts: { bold?: boolean; fill?: string; mono?: boolean; size?: number } = {}) => {
    const row = ws.addRow([text]);
    if (cols > 1) ws.mergeCells(row.number, 1, row.number, cols);
    const cell = row.getCell(1);
    cell.font = { name: opts.mono ? 'Consolas' : FONT, size: opts.size ?? 10, bold: opts.bold };
    cell.alignment = { wrapText: true, vertical: 'top' };
    if (opts.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
    row.height = lineCount(text, fullWidth) * 15 + 3;
  };

  // ================================================================
  // 2. ブロックの種類ごとの書き出し
  //    見出し・段落・箇条書き・コードは1行、表は罫線付きの複数行にする
  // ================================================================
  for (const block of blocks) {
    // ブロックの種類に応じて、書き方を切り替える
    if (block.type === 'heading') {
      ws.addRow([]);
      textRow(block.text, { bold: true, fill: 'FFDCE6F1' });
    } else if (block.type === 'paragraph') {
      textRow(block.text);
    } else if (block.type === 'bullet') {
      textRow(`・${block.text}`);
    } else if (block.type === 'code') {
      textRow(block.text, { mono: true, fill: 'FFF2F2F2' });
    } else {
      ws.addRow([]);
      for (const [r, values] of [block.header, ...block.rows].entries()) {
        const row = ws.addRow(values);
        const last = values.length;
        // 列数が少ない表は、最後の列を右端まで結合して幅をそろえる
        if (last < cols) ws.mergeCells(row.number, last, row.number, cols);
        let lines = 1;
        values.forEach((value, c) => {
          const span = c === last - 1 ? cols - c : 1;
          lines = Math.max(lines, lineCount(value, span * colWidth));
          const cell = row.getCell(c + 1);
          cell.font = { name: FONT, size: 10, bold: r === 0 };
          cell.alignment = { wrapText: true, vertical: 'top' };
          cell.border = BORDERS;
          if (r === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
        });
        row.height = lines * 15 + 3;
      }
    }
  }
}

/**
 * 基本設計書のMarkdownから、Excelワークブックを組み立てる（ファイルには書かない）。
 * 表紙のシートと、## 見出しごとのシートを作る。
 * @param md 基本設計書のMarkdown全文
 * @param generatedAt 表紙に載せる生成日
 * @returns 組み立てたワークブック
 */
export function buildBasicDesignWorkbook(md: string, generatedAt: Date = new Date()): ExcelJS.Workbook {
  // ================================================================
  // 1. Markdownの解析
  //    最初の ## より前を表紙、## ごとをシートに分ける
  // ================================================================
  const wb = new ExcelJS.Workbook();
  wb.title = '基本設計書';
  const { cover, sections } = splitSections(parseMarkdown(md));
  const used = new Set<string>();


  // ================================================================
  // 2. 表紙シートの作成
  //    タイトル、表紙のブロック、生成日と注意書きを並べる
  // ================================================================
  const coverSheet = wb.addWorksheet(sheetName('表紙', used));
  coverSheet.getColumn(1).width = 100;
  const title = cover.find((b) => b.type === 'heading' && b.level === 1);
  const titleRow = coverSheet.addRow([title && 'text' in title ? title.text : '基本設計書']);
  titleRow.getCell(1).font = { name: FONT, size: 18, bold: true };
  titleRow.height = 36;
  coverSheet.addRow([]);
  writeBlocks(coverSheet, cover.filter((b) => b !== title), 1, 100);
  coverSheet.addRow([]);
  writeBlocks(coverSheet, [
    { type: 'paragraph', text: `生成日: ${generatedAt.toISOString().slice(0, 10)}` },
    { type: 'paragraph', text: '本書は docs/ai-input/basic-design.md（正本）から自動生成した出力物です。直接編集せず、正本を直して再生成してください。' },
  ], 1, 100);


  // ================================================================
  // 3. セクションごとのシートの作成
  //    表があるシートは、最も列数の多い表に合わせて列数と列幅を決める
  // ================================================================
  for (const section of sections) {
    const ws = wb.addWorksheet(sheetName(section.title, used));
    const cols = Math.max(1, ...section.blocks.map((b) => (b.type === 'table' ? b.header.length : 1)));
    const colWidth = Math.max(14, Math.floor(TOTAL_WIDTH / cols));
    for (let c = 1; c <= cols; c++) ws.getColumn(c).width = colWidth;
    const heading = ws.addRow([section.title]);
    if (cols > 1) ws.mergeCells(heading.number, 1, heading.number, cols);
    heading.getCell(1).font = { name: FONT, size: 14, bold: true };
    heading.height = 28;
    writeBlocks(ws, section.blocks, cols, colWidth);
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }
  return wb;
}
