# TASK.md（進行状況）

更新日: 2026-11-01

進め方: Native（1つのセッションで私が順に実装し、最後に全体レビュー）

## 完了

- [x] 設計書、技術構成の決定、開発用・テスト用DBの作成、ドキュメントの構成（`CLAUDE.md`、`SPEC.md`、`TASK.md`）
- [x] 要件定義書（docx）、基本設計書（xlsx）、テーブル仕様書（xlsx）の生成
- [x] 実装計画 Task 1〜11（モノレポ、日付・ストリーク、zodスキーマ、DDLとトリガ、NestJS API、React画面、受入確認）
- [x] 4つの体験の記録（`docs/experience-log.md`）
- [x] ループの仕組み（hook、husky、CI、`/fix-loop`、`/verify-ui`。`docs/loop-engineering.md`）

## 次にやること

- [ ] 最終レビュー（ブランチ全体を新しい目で確認し、Critical/Important を1回の修正で直す）
- [ ] 体験ログの「ユーザーの感想」（第3章・第4章・全体）の記入
- [ ] ブランチの統合（`superpowers:finishing-a-development-branch`）

## 未決・注意

- DBの接続情報は `dev/apps/src/api/.env`（`.gitignore` 済み）。ひな形は `.env.example`
- 作業ブランチ: `feature/habit-tracker`。実験ブランチ（`experiment/*`）は記録のために残す（マージしない）
- CIはGitHub上で未実行。マージ前に必須にするには、GitHubのブランチ保護の設定が必要
- 生成したExcel・Wordは、見た目を未確認（Wordの目次は開いて更新する）
- 起動方法は `README.md`
