// 実行用の入口: docs/ai-input/basic-design.md から docs/deliverables/基本設計書.xlsx を生成する。
import { mkdirSync, readFileSync } from 'node:fs';
import { buildBasicDesignWorkbook } from './basic-design-workbook.ts';

const md = readFileSync('docs/ai-input/basic-design.md', 'utf8');
mkdirSync('docs/deliverables', { recursive: true });
const out = 'docs/deliverables/基本設計書.xlsx';
await buildBasicDesignWorkbook(md).xlsx.writeFile(out);
console.log(`wrote ${out}`);
