// 文書生成用の最小限のMarkdown解析。基本設計書など、このリポジトリのMarkdownが使う記法だけを扱う。
/** Markdownを解析した結果の1要素。type で種類を区別する。 */
export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'code'; text: string }
  | { type: 'table'; header: string[]; rows: string[][] };

/**
 * 強調記号（**）とバッククォートを外し、表示用の文字にする。
 * @param text Markdownのインライン記法を含む文字列
 * @returns 記法を除いた、前後の空白なしの文字列
 */
const clean = (text: string): string => text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`/g, '').trim();

/**
 * 表の1行を列に分ける。バッククォートの中の縦線では、列を分けない。
 * @param line 縦線区切りの表の1行
 * @returns 列ごとの文字列（記法は除去済み）
 */
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

/**
 * Markdownを、見出し・段落・箇条書き・コード・表のブロックの並びに変換する。
 * 対応する記法は、このリポジトリの文書が使うものだけ。
 * @param md Markdown全文
 * @returns ブロックの配列（文書の出現順）
 */
export function parseMarkdown(md: string): Block[] {
// ================================================================
// 1. 行ごとの走査
//    行を順に読み、コード・表・それ以外（見出し、箇条書き、引用、段落）に振り分ける
// ================================================================
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
      // 1行で完結するブロック: 該当する記法の順に判定する（どれでもない空行は捨てる）
      if (heading) blocks.push({ type: 'heading', level: heading[1]!.length, text: clean(heading[2]!) });
      else if (bullet) blocks.push({ type: 'bullet', text: clean(bullet[1]!) });
      else if (ordered) blocks.push({ type: 'bullet', text: `${ordered[1]}. ${clean(ordered[2]!)}` });
      else if (quote) {
        if (quote[1]!.trim()) blocks.push({ type: 'paragraph', text: clean(quote[1]!) });
      } else if (line.trim()) blocks.push({ type: 'paragraph', text: clean(line) });
      i++;
    }
  }

// ================================================================
// 2. ブロックの返却
// ================================================================
  return blocks;
}
