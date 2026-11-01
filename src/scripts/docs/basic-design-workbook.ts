// 基本設計書（Markdown）から、顧客提出用のExcelワークブックを組み立てる。
import ExcelJS from 'exceljs';
import { parseMarkdown, type Block } from './markdown.ts';

const FONT = 'Yu Gothic';
const TOTAL_WIDTH = 150; // 1シートの文字幅の合計（全角は2文字分）
const BORDER = { style: 'thin' as const, color: { argb: 'FF999999' } };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

// 全角文字は2、半角は1として表示幅を数える
const displayWidth = (s: string): number => [...s].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0);

// セルの文字が折り返して何行になるかを見積もる
const lineCount = (text: string, width: number): number =>
  text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(displayWidth(line) / Math.max(1, width - 2))), 0);

// シート名は31文字以内で、使えない文字（\ / ? * [ ] :）を含められない
function sheetName(title: string, used: Set<string>): string {
  const base = title.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'シート';
  let name = base;
  for (let n = 2; used.has(name); n++) name = `${base.slice(0, 28)}(${n})`;
  used.add(name);
  return name;
}

type Sheet = { title: string; blocks: Block[] };

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

function writeBlocks(ws: ExcelJS.Worksheet, blocks: Block[], cols: number, colWidth: number): void {
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

  for (const block of blocks) {
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

export function buildBasicDesignWorkbook(md: string, generatedAt: Date = new Date()): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.title = '基本設計書';
  const { cover, sections } = splitSections(parseMarkdown(md));
  const used = new Set<string>();

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
