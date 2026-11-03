---
description: ブラウザ（Playwright）で受入基準 A-01〜A-11 を確認し、失敗を直して再確認するループを回す
---

画面の受入確認を行い、失敗があれば「直す → 再確認」を回してください。

準備:
- テスト用ではなく開発用DB（`habit_app_dev`）に対して、API と画面を起動する（起動手順は `README.md`。無ければ `dev/apps/src/web/serve.ts` と `dev/apps/src/api` の起動スクリプトを使う）
- 確認前に、開発DBの習慣データを空にしてよいか、ユーザーに確認する（既にデータがあるとき）

手順:
1. `docs/ai-input/requirements.md` の「受入基準」A-01〜A-11 を、1つずつ Playwright（`mcp__plugin_playwright_playwright__*`）で確認する。A-06（ストリーク規則のテスト）と A-10・A-11（DBの結合テスト）は `bun test` の結果で確認する
2. 各基準について、操作、期待、結果（OK／NG）を表にして記録する。NGには、スクリーンショットとコンソールのエラー（`browser_console_messages`）を添える
3. NGがあれば、原因を1つ特定して**1点だけ**直し、該当の基準だけ再確認する。直したら `dev/` で `pnpm run verify` で全体が壊れていないことも確認する
4. 同じ基準が**3回続けて**NGなら、止めて、ユーザーに報告する（`CLAUDE.md`「失敗が続くときの歯止め」）
5. すべてOKになったら、結果の表を `docs/experience-log.md` の第3章（ハーネス）または第4章（ループ）に記録する

見た目は `DESIGN.md` に従っているかも確認する（色・フォント・余白の値は CSS の変数から参照されているか）。
