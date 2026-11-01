import { describe, expect, test } from 'bun:test';
import { buildBasicDesignWorkbook } from '../../src/docs/basic-design-workbook.ts';

const SAMPLE = `# 基本設計（AI入力用の正本）

> 状態: 確定

## 1. システム構成

構成の説明。

| パッケージ | 責務 |
|---|---|
| \`apps/web\` | 画面 |

## 2. API設計

- エラーコード: VALIDATION_ERROR

\`\`\`
A --> B
\`\`\`
`;

const cellTexts = (ws: { eachRow: (cb: (row: { eachCell: (cb: (c: { value: unknown }) => void) => void }) => void) => void }) => {
  const out: string[] = [];
  ws.eachRow((row) => row.eachCell((c) => out.push(String(c.value))));
  return out;
};

describe('buildBasicDesignWorkbook', () => {
  test('表紙と、## 見出しごとのシートを作る', () => {
    const wb = buildBasicDesignWorkbook(SAMPLE);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['表紙', '1. システム構成', '2. API設計']);
  });

  test('表のヘッダーと行、本文、箇条書き、コードがセルに入る', () => {
    const wb = buildBasicDesignWorkbook(SAMPLE);
    const sheet1 = cellTexts(wb.getWorksheet('1. システム構成')!);
    expect(sheet1).toContain('構成の説明。');
    expect(sheet1).toContain('パッケージ');
    expect(sheet1).toContain('apps/web');
    const sheet2 = cellTexts(wb.getWorksheet('2. API設計')!);
    expect(sheet2.some((t) => t.includes('エラーコード: VALIDATION_ERROR'))).toBe(true);
    expect(sheet2).toContain('A --> B');
  });

  test('表紙にタイトルと注記を載せる', () => {
    const cover = cellTexts(buildBasicDesignWorkbook(SAMPLE).getWorksheet('表紙')!);
    expect(cover).toContain('基本設計（AI入力用の正本）');
    expect(cover).toContain('状態: 確定');
  });

  test('シート名は31文字以内で、使えない文字を含まない', () => {
    const md = '## ' + '長'.repeat(40) + '/?*[]:\n\n本文';
    const [, sheet] = buildBasicDesignWorkbook(md).worksheets;
    expect(sheet!.name.length).toBeLessThanOrEqual(31);
    expect(sheet!.name).not.toMatch(/[\\/?*[\]:]/);
  });
});
