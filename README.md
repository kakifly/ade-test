# 今日の習慣チェック

習慣を登録し、毎日チェックを付けて、連続達成日数（ストリーク）を確認するシンプルなWebアプリです。単一ユーザー、認証なし。

あわせて、AI駆動開発の4つのエンジニアリング（プロンプト／コンテキスト／ハーネス／ループ）を体験するためのリポジトリでもあります。体験の記録は [`docs/experience-log.md`](docs/experience-log.md) にあります。

## 技術構成

TypeScript、Bun（ワークスペースのモノレポ）、React + React Hook Form、zod、NestJS、PostgreSQL、Drizzle ORM

## セットアップ

前提: Bun 1.4.2（`.tool-versions` で固定）、PostgreSQL（開発用とテスト用に別のデータベース）、`psql`

```bash
bun install
cp dev/apps/src/api/.env.example dev/apps/src/api/.env   # 接続情報を書く（コミットしない）
bun run db:apply                                          # 開発用DBにDDLを適用
```

`.env` には、次の2つを書きます。

| 変数 | 用途 |
|---|---|
| `DATABASE_URL` | 開発用DB（`habit_app_dev`） |
| `TEST_DATABASE_URL` | テスト用DB（`habit_app_test`。テストのたびに初期化される） |

## 起動

```bash
bun run start:api     # API（http://localhost:3000）
bun run build:web     # 画面をビルド（初回と、画面を変更したとき）
bun run start:web     # 画面（http://localhost:5173）。/api はAPIへ転送される
```

ブラウザで http://localhost:5173 を開きます。ポートは環境変数 `PORT`、画面から見たAPIの宛先は `API_URL`（既定 `http://localhost:3000`）で変えられます。

## テスト

| コマンド | 内容 |
|---|---|
| `bun run typecheck` | 全ワークスペースの型チェック |
| `bun run test:unit` | 単体テスト（DB不要） |
| `bun run verify` | 型チェック → テストDBの初期化 → すべてのテスト（結合テストを含む） |
| `bun run e2e` | ブラウザでの受入確認（APIと画面を起動した状態で実行。開発用DBの習慣を削除する） |

コミット前（husky）には型チェックと単体テスト、PR・main への push（GitHub Actions）には `verify` と同じ内容が実行されます。ループ（検証と修復の繰り返し）の仕組みは [`docs/loop-engineering.md`](docs/loop-engineering.md) を参照してください。

## フォルダ構成

```
docs/                  文書（要件・設計・顧客提出用の出力物・体験ログ）
dev/
  apps/src/{api,web}/  アプリのソース（NestJS、React）
  apps/test/{api,web}/ アプリのテスト
  packages/src/{core,schemas}/  共有ライブラリ（ストリーク計算、zodスキーマ）
  packages/test/       共有ライブラリのテスト
  scripts/             DB適用、文書の生成、画面の受入確認
.claude/               Claude Code の設定、hook、スラッシュコマンド
.github/workflows/     CI
```

詳しい配置のルールは [`CLAUDE.md`](CLAUDE.md) にあります。

## 文書

| 場所 | 内容 |
|---|---|
| `docs/ai-input/` | AIが読む正本（要件、基本設計） |
| `docs/deliverables/` | 顧客提出用（要件定義書.docx、基本設計書.xlsx）。`ai-input/` から生成する出力物 |
| `docs/reference/` | 人間が閲覧する資料（テーブル仕様書.xlsx）。DBから生成する出力物 |

```bash
bun run docs:build   # 3つの文書をまとめて生成（テーブル仕様書は開発用DBから読む）
```

生成した Excel・Word は、見た目の確認ができていません。Word の目次は、開いて更新してください。

## 主な設計

- **ストリーク**: サーバーが `dev/packages/src/core` の `calcStreak` で計算する。今日が未チェックなら、昨日までの連続日数を表示する
- **同時実行制御**: 全テーブルに `row_version`（楽観的ロック）と `txn_id` を持たせ、DBのトリガが更新する。競合は 409 `VERSION_CONFLICT`
- **冪等性**: チェックの付与・解除は、繰り返しても結果が変わらない。409でも、望む状態になっていれば成功として扱う
- **バリデーション**: 項目ごとのzodスキーマを `dev/packages/src/schemas` に一本化し、画面とAPIで共有する
