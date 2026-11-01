// 文書生成用の最小限のMarkdown解析。基本設計書など、このリポジトリのMarkdownが使う記法だけを扱う。
export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'code'; text: string }
  | { type: 'table'; header: string[]; rows: string[][] };

// 強調記号とバッククォートを外し、表示用の文字にする
const clean = (text: string): string => text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`/g, '').trim();

// バッククォートの中の縦線では、列を分けない
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inCode = false;
  for (const ch of line.trim().replace(/^\|/, '').replace(/\|$/, '')) {
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(clean(current));
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(clean(current));
  return cells;
}

export function parseMarkdown(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);

    if (line.startsWith('```')) {
      // コードブロック: 閉じの ``` まで1つのブロックにする
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) body.push(lines[i++] ?? '');
      i++;
      blocks.push({ type: 'code', text: body.join('\n') });
    } else if (line.trimStart().startsWith('|')) {
      // 表: 連続する縦線始まりの行を集め、2行目（区切り行）を除く
      const rows: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('|')) rows.push(lines[i++] ?? '');
      const [header, , ...body] = rows;
      blocks.push({ type: 'table', header: splitRow(header ?? ''), rows: body.map(splitRow) });
    } else {
      if (heading) blocks.push({ type: 'heading', level: heading[1]!.length, text: clean(heading[2]!) });
      else if (bullet) blocks.push({ type: 'bullet', text: clean(bullet[1]!) });
      else if (ordered) blocks.push({ type: 'bullet', text: `${ordered[1]}. ${clean(ordered[2]!)}` });
      else if (quote) {
        if (quote[1]!.trim()) blocks.push({ type: 'paragraph', text: clean(quote[1]!) });
      } else if (line.trim()) blocks.push({ type: 'paragraph', text: clean(line) });
      i++;
    }
  }
  return blocks;
}
