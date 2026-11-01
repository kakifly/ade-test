# CLAUDE.md（このプロジェクトの作業ルール）

習慣チェックアプリ。あわせて、AI駆動開発の4つのエンジニアリング（プロンプト／コンテキスト／ハーネス／ループ）を体験するためのリポジトリ。体験の記録は `docs/experience-log.md`。

## まず読むもの

1. `SPEC.md`（何を作るか）
2. `TASK.md`（今どこまで進んでいるか、次に何をするか）
3. UIを作る・直すときは `DESIGN.md`（デザインの正本）
4. 実装時は `docs/ai-input/` を参照する。顧客提出用の `docs/deliverables/` は、実装の根拠として読まない（正本は `docs/ai-input/` と DDL）

## ディレクトリ構成

ルート直下は `docs/`（文書）と `dev/`（コード）の2つ。ルートに置くのは、ツールが要求する設定（`package.json`、`tsconfig.base.json`、`.tool-versions`、`.gitignore`）と、AIの入口になる文書（`CLAUDE.md`、`SPEC.md`、`TASK.md`、`DESIGN.md`）、Claude Codeの設定（`.claude/`）、CI（`.github/`）だけ。

```
docs/                          文書（下の「資料の置き場所」を参照）
.claude/                       Claude Code の設定（settings.json）とhookスクリプト（hooks/）
.github/workflows/             CI（ci.yml）
dev/
  apps/
    src/{api,web}/             アプリのソース。各フォルダがワークスペース（package.json、tsconfig.json を含む）
    test/{api,web}/            アプリのテスト。src と同じ構成にする
  packages/
    src/{core,schemas}/        共有ライブラリのソース。各フォルダがワークスペース
    test/{core,schemas}/       共有ライブラリのテスト。src と同じ構成にする
  scripts/
    src/                       DB適用、Excel・Word生成（generate-docs/）のソース
    test/                      scripts のテスト。src と同じ構成にする
```

### 配置のルール

- **ソースとテストを分ける**: `apps`、`packages`、`scripts` のどれも、`src` と `test` を同じ階層に並べる。テストはソースの隣ではなく、`test` 側に置く
- **`test` の中は `src` と同じ構成にする**: 例として、`dev/packages/src/core/dates.ts` のテストは `dev/packages/test/core/dates.test.ts`、`dev/apps/src/api/habits/habits.service.ts` のテストは `dev/apps/test/api/habits/habits.service.test.ts` に置く
- **テストの種類はファイル名で分ける**: 単体テストは `*.test.ts`、DBやHTTPを使う結合テストは `*.int.test.ts`
- **ワークスペース**: `dev/apps/src/*` と `dev/packages/src/*` が対象。テスト用の `test/` にはパッケージ定義を置かない
- **DDLと設定**: `dev/apps/src/api/db/ddl/`（DDL）と `dev/apps/src/api/.env`（接続情報。コミットしない）は、api のフォルダに置く
- **hook**: 設定は `.claude/settings.json`、hookが呼ぶスクリプトは `.claude/hooks/` に置く（`dev/scripts` には置かない）
  - `hook-check.sh`（PostToolUse）: Edit・Write・MultiEdit のあとに、型チェックと単体テストを実行する
  - `stop-check.sh`（Stop）: 作業を終える直前に、型チェック、テストDBの初期化、すべてのテストを実行する。シェルのコマンドで変更したファイルも検証できる。失敗すると終了コード2で、Claudeは作業を続けて直す。直前にこのhookで止めた後の再実行では止めない（無限ループの防止）
- **コミット前の検証**: `husky`（gitのhookの管理ツール）で `.husky/pre-commit` を実行する。速いものだけ（型チェックと単体テスト）を動かし、失敗するとコミットは作られない。DBを使う結合テストは、遅く環境に依存するので、CIとタスク完了時に実行する。`bun install` の `prepare` スクリプトが、hookを有効にする。`--no-verify` で飛ばさない
- **CI**: `.github/workflows/ci.yml`。pull request のたびと、`main` へのpush（マージ後）に、型チェック、テストDB（使い捨てのPostgreSQL）の初期化、すべてのテストを実行する。手順は `bun run verify`（型チェック、テストDBの初期化、すべてのテスト）と同じ。マージ前に成功を必須にするには、GitHubのブランチ保護（Require status checks）で `CI / test` を指定する

## 資料の置き場所

| 場所 | 内容 | 扱い |
|---|---|---|
| `docs/ai-input/` | AIが読む正本（Markdown） | 要件・設計を変えるときは、ここを先に直す |
| `docs/deliverables/` | 顧客提出用（要件定義書.docx、基本設計書.xlsx） | `ai-input/` から作る出力物。直接編集しない |
| `docs/reference/` | 人間が閲覧する資料（テーブル仕様書.xlsx） | DDLから自動生成する。直接編集しない |
| `docs/superpowers/` | 作業過程の設計書（specs）と実装計画（plans） | 実装の手順はplansに従う |
| `dev/apps/src/api/db/ddl/` | DBのDDL（SQL） | テーブル定義の正本。Drizzleのスキーマはここから `drizzle-kit pull` で生成する |

## 技術構成

- TypeScript、Bun（ワークスペースのモノレポ。バンドルはBun、テストは `bun test`）
- `dev/apps/src/web`: React + React Hook Form
- `dev/apps/src/api`: NestJS + Drizzle ORM + PostgreSQL
- `dev/packages/src/schemas`: 項目ごとのzodスキーマ。画面・APIのスキーマは、これらを組み合わせて作る
- `dev/packages/src/core`: ストリーク計算などの純粋関数

## コーディング方針

- **冪等性を確保する**: 同じ操作を繰り返しても結果が変わらないようにする（例: チェックの付与は二重に記録しない）
- **条件分岐にはコメントを付ける**: 何のための分岐かを日本語で書く
- **ロジックを共通化する**: 特にvalidationは `dev/packages/src/schemas` に一本化し、画面とAPIで重複して書かない

## UIデザインのルール

- UIの見た目（色、フォント、余白、角丸、影、各部品のスタイル）は、リポジトリ直下の `DESIGN.md`（QuestUI デザインシステム）を参考にして決める
- `DESIGN.md` にある値（カラーコード、サイズなど）は、CSSの変数（デザイントークン）として一箇所に定義し、各部品はそれを参照する。値を各所に直接書かない
- `DESIGN.md` に無い部品を作るときは、近い部品の規則に合わせ、独自の色やフォントを足さない
- `DESIGN.md` の「やるべきこと・避けること」に従う（例: 純粋な黒や真っ白を使わない、サンセリフ体を混ぜない）
- `DESIGN.md` と実装が食い違う場合は、`DESIGN.md` を正とする。デザインを変えたいときは、先に `DESIGN.md` を直す

## データ更新（同時実行制御）

- 全テーブルに `row_version`（楽観的ロック）と `txn_id`（最後に更新したトランザクション）を持たせる。値の更新はDBのトリガが行い、アプリから直接書かない
- 更新・削除のSQLには `WHERE row_version = :読んだ値` を必ず付ける。0行のときは、対象が無ければ404、あれば409（`VERSION_CONFLICT`）
- DBMS固有の機能（シーケンス、`xmin` など）でバージョンを代用しない
- 変更系の処理は1トランザクションにまとめ、最初に `set_config('app.txn_id', <UUID>, true)` を設定する
- 画面側は、`row_version` を自分で増減しない。サーバーが返した値、または再取得した値で置き換える
- チェックの付与・解除は、親の習慣のバージョンで制御し、冪等性を保つ（409でも望む状態にすでになっていれば成功として扱う）
- トリガ、制約、DDLは `dev/apps/src/api/db/ddl/` に置き、`habit_app_test` に対する結合テストで検証する

## タスクの並行実行

- 実装計画のタスクのうち、互いに依存せず、同じファイルを編集しないものは、並行して実行する（独立したツール呼び出しは1回の応答にまとめる。大きな独立作業はサブエージェントに任せる）
- 前のタスクの成果物（関数の署名、スキーマ、DDLなど）を使うタスクは、前のタスクが終わってから実行する
- 並行して実行する場合は、編集するファイルが重ならないことを先に確認する。重なる場合は順番に実行する
- 並行実行したタスクの結果は、まとめてテストを実行して確認してから次に進む

## タスク完了の条件

- 実装計画のタスクは、**すべてのテストが成功した状態**で完了とする。一部のテストだけを実行して完了にしない
- 完了の前に、次を実行して結果を確認する。1つでも失敗があれば、そのタスクは未完了とする
  1. `bun run typecheck`（型チェック）
  2. `bun run db:apply:test` のあと `bun test`（単体テストと結合テストのすべて）
   - 1と2は、`bun run verify` でまとめて実行できる
- 失敗したテストは、タスクと無関係に見えても、完了報告に名前を書く。テストを削除・スキップして通すことはしない
- 失敗の原因が自分の変更でないとき（他のタスクの作業途中など）は、その旨を報告し、直るまで完了にしない
- 完了の記録は、`task-done` でテストの実行結果を台帳に残してから行う

## 失敗が続くときの歯止め（ループの終了条件）

- 同じテストが**3回続けて**失敗したら、同じ直し方を続けない。失敗の内容と、これまで試したことを書き出し、原因を調べ直す（`superpowers:systematic-debugging`）
- 調べ直しても直らないときは、作業を止めて、ユーザーに報告する。報告には、失敗しているテスト名、期待値と実際の値、試したことを含める
- テストを書き換えて通す・削除する・スキップする・期待値を実装に合わせる、のは直し方として認めない。仕様（`docs/ai-input/`）が誤っているときは、仕様を先に直す
- 1回の直しで変えるのは1点だけにする。何が効いたかを分かるようにする

## 規約

- ドキュメント、コミットメッセージ、PR本文は日本語。識別子とブランチ名は英語
- DBの接続情報は環境変数 `DATABASE_URL` で受け取る。`.env` はコミットしない。パスワードをログや出力、ドキュメントに書かない
- 開発用は `habit_app_dev`、テスト用は `habit_app_test` を使う。`habit_app` には触れない
- コミットは、テストが通る状態で小さく行う（コミット前に型チェックと単体テストが走る）
