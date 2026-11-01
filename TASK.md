# TASK.md（進行状況）

更新日: 2026-11-01

進め方: Native（1つのセッションで私が順に実装し、最後に全体レビュー）

## 完了

- [x] 設計書（`docs/superpowers/specs/2026-11-01-habit-tracker-design.md`）
- [x] 技術構成の決定（Bun／TypeScript／React Hook Form／zod／NestJS／PostgreSQL／Drizzle）
- [x] 開発用・テスト用DBの作成（`habit_app_dev`、`habit_app_test`）
- [x] 要件定義書（`docs/deliverables/要件定義書.docx`）
- [x] ドキュメントのフォルダ構成、`CLAUDE.md`、`SPEC.md`、`TASK.md`

## 次にやること

- [x] `docs/ai-input/requirements.md` と `basic-design.md` の作成（要判断3点は確定。ほかの[案]は未承認）
- [x] 同時実行制御（row_version＋トリガ、txn_id）を要件・基本設計・CLAUDE.mdに反映（設計A）
- [ ] 実装計画の書き直し（モノレポ、Drizzle、NestJS 向け）とユーザーの確認
- [ ] 実装（計画のタスク順）
- [ ] 基本設計書.xlsx と テーブル仕様書.xlsx の生成スクリプトと出力
- [ ] 全体レビュー

## 未決・注意

- DBの接続情報は `dev/apps/api/.env`（`.gitignore` 済み）。ひな形は `.env.example`
- 作業ブランチ: `feature/habit-tracker`。進捗の記録は実行用の台帳にもある（`.superpowers/`、git管理外）
- 実装計画の進行: Task 1 完了。Task 2（プロンプト体験）はユーザーの依頼文待ち
