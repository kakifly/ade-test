import { describe, expect, test } from 'bun:test';
import { parseMarkdown } from '../../src/generate-docs/markdown.ts';

describe('parseMarkdown', () => {
  test('見出しのレベルと文言を取り出す', () => {
    expect(parseMarkdown('# 題\n\n## 1. 章\n\n### 1.1 節')).toEqual([
      { type: 'heading', level: 1, text: '題' },
      { type: 'heading', level: 2, text: '1. 章' },
      { type: 'heading', level: 3, text: '1.1 節' },
    ]);
  });

  test('表をヘッダーと行に分け、区切り行を除く', () => {
    const md = '| 名前 | 内容 |\n|---|---|\n| a | あ |\n| b | い |';
    expect(parseMarkdown(md)).toEqual([
      { type: 'table', header: ['名前', '内容'], rows: [['a', 'あ'], ['b', 'い']] },
    ]);
  });

  test('バッククォート内の縦線では列を分けない', () => {
    const md = '| 型 | 説明 |\n|---|---|\n| `a | b` | 共用体 |';
    expect(parseMarkdown(md)).toEqual([
      { type: 'table', header: ['型', '説明'], rows: [['a | b', '共用体']] },
    ]);
  });

  test('箇条書き・番号付き・引用・段落を区別する', () => {
    const md = '- 一つ目\n- 二つ目\n\n1. 番号\n\n> 注記\n\n本文';
    expect(parseMarkdown(md)).toEqual([
      { type: 'bullet', text: '一つ目' },
      { type: 'bullet', text: '二つ目' },
      { type: 'bullet', text: '1. 番号' },
      { type: 'paragraph', text: '注記' },
      { type: 'paragraph', text: '本文' },
    ]);
  });

  test('コードブロックを1つのブロックとして扱う', () => {
    const md = '```\nA --> B\n  C\n```';
    expect(parseMarkdown(md)).toEqual([{ type: 'code', text: 'A --> B\n  C' }]);
  });

  test('強調記号とバッククォートの記号を外した文字にする', () => {
    expect(parseMarkdown('- **太字** と `コード`')).toEqual([{ type: 'bullet', text: '太字 と コード' }]);
  });
});
