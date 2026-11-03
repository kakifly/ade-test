// 実行用の入口: docs/ai-input/basic-design.md から docs/deliverables/基本設計書.xlsx を生成する。
// 実行時の作業ディレクトリはリポジトリのルートとする（パスは相対指定）。
import { mkdirSync, readFileSync } from 'node:fs';
import { buildBasicDesignWorkbook } from './basic-design-workbook.ts';

// ================================================================
// 1. 基本設計書（Markdown）の読み込み
// ================================================================
const md = readFileSync('../docs/ai-input/basic-design.md', 'utf8');

// ================================================================
// 2. Excelの生成と書き出し
//    出力先のフォルダが無ければ作る
// ================================================================
mkdirSync('../docs/deliverables', { recursive: true });
const out = '../docs/deliverables/基本設計書.xlsx';
await buildBasicDesignWorkbook(md).xlsx.writeFile(out);
console.log(`wrote ${out}`);
