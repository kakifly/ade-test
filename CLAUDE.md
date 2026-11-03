# CLAUDE.md（このプロジェクトの作業ルール）

習慣チェックアプリ。あわせて、AI駆動開発の4つのエンジニアリング（プロンプト／コンテキスト／ハーネス／ループ）を体験するためのリポジトリ。体験の記録は `docs/experience-log.md`。

## まず読むもの

1. `SPEC.md`（何を作るか）
2. `TASK.md`（今どこまで進んでいるか、次に何をするか）
3. UIを作る・直すときは `DESIGN.md`（デザインの正本）
4. 実装時は `docs/ai-input/` を参照する。顧客提出用の `docs/deliverables/` は、実装の根拠として読まない（正本は `docs/ai-input/` と DDL）

## ディレクトリ構成

ルート直下は `docs/`（文書）と `dev/`（コード）の2つ。開発に関する設定（`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`tsconfig.base.json`、`tsconfig.json`、`node_modules`）は、`dev/` の直下に置く。ルートに置くのは、ツールが場所を決めているもの（`.tool-versions`、`.gitignore`、gitのhookの `.husky/`、CIの `.github/`、Claude Codeの設定の `.claude/`）と、AIの入口になる文書（`CLAUDE.md`、`SPEC.md`、`TASK.md`、`DESIGN.md`）、`README.md` だけ。

**コマンドは `dev/` で実行する**（`cd dev` してから `pnpm run verify` など。ルートから実行するなら `pnpm --dir dev run verify`）。hook、husky、CI は、この形で `dev/` を指している。

```
docs/                          文書（下の「資料の置き場所」を参照）
.claude/                       Claude Code の設定（settings.json）とhookスクリプト（hooks/）
.github/workflows/             CI（ci.yml）
dev/                           package.json、pnpm-workspace.yaml、tsconfig など、開発の設定もここに置く
  apps/
    src/{api,web}/             アプリのソース。各フォルダがワークスペース（package.json、tsconfig.json を含む）
    test/{api,web}/            アプリのテスト。src と同じ構成にする
  share/                       複数のアプリで共通に使うもの
    src/{core,zod,db}/         共通のソース。各フォルダがワークスペース（core: 純粋関数、zod: zodスキーマ、db: テーブル定義・DDL・DBクライアント）
    test/{core,zod,db}/        共通部分のテスト。src と同じ構成にする
  scripts/
    src/                       DB適用、Excel・Word生成（generate-docs/）のソース
    test/                      scripts のテスト。src と同じ構成にする
```

### 配置のルール

- **ソースとテストを分ける**: `apps`、`share`、`scripts` のどれも、`src` と `test` を同じ階層に並べる。テストはソースの隣ではなく、`test` 側に置く
- **`test` の中は `src` と同じ構成にする**: 例として、`dev/share/src/core/dates.ts` のテストは `dev/share/test/core/dates.test.ts`、`dev/apps/src/api/habits/habits.service.ts` のテストは `dev/apps/test/api/habits/habits.service.test.ts` に置く
- **テストの種類はファイル名で分ける**: 単体テストは `*.test.ts`、DBやHTTPを使う結合テストは `*.int.test.ts`
- **ワークスペース**: `dev/apps/src/*` と `dev/share/src/*` が対象。テスト用の `test/` にはパッケージ定義を置かない
- **DDLと設定**: DDLとテーブルオブジェクトは、共通の `dev/share/src/db/` に置く（`ddl/` がDDL、`schema.ts` がテーブルオブジェクト）。接続情報の `dev/apps/src/api/.env` はコミットしない
- **hook**: 設定は `.claude/settings.json`、hookが呼ぶスクリプトは `.claude/hooks/` に置く（`dev/scripts` には置かない）
  - `hook-check.sh`（PostToolUse）: Edit・Write・MultiEdit のあとに、型チェックと単体テストを実行する
  - `stop-check.sh`（Stop）: 作業を終える直前に、型チェック、テストDBの初期化、すべてのテストを実行する。シェルのコマンドで変更したファイルも検証できる。失敗すると終了コード2で、Claudeは作業を続けて直す。直前にこのhookで止めた後の再実行では止めない（無限ループの防止）
- **コミット前の検証**: `husky`（gitのhookの管理ツール）で `.husky/pre-commit` を実行する。速いものだけ（型チェックと単体テスト）を動かし、失敗するとコミットは作られない。DBを使う結合テストは、遅く環境に依存するので、CIとタスク完了時に実行する。`pnpm install` の `prepare` スクリプトが、hookを有効にする。`--no-verify` で飛ばさない
- **失敗の記録**: `hook-check.sh` と `stop-check.sh` は、失敗を `loop-record.sh` で `.claude/loop/failures.log`（git管理外）に記録し、同じ失敗の連続回数を数える。3回目に達すると、歯止めのメッセージを出す（Stop hook は止めずに終わらせ、報告させる）
- **CI**: `.github/workflows/ci.yml`。pull request のたびと、`main` へのpush（マージ後）に、型チェック、テストDB（使い捨てのPostgreSQL）の初期化、すべてのテストを実行する。手順は `pnpm run verify`（型チェック、テストDBの初期化、すべてのテスト）と同じ。マージ前に成功を必須にするには、GitHubのブランチ保護（Require status checks）で `CI / test` を指定する

## 資料の置き場所

| 場所 | 内容 | 扱い |
|---|---|---|
| `docs/ai-input/` | AIが読む正本（Markdown） | 要件・設計を変えるときは、ここを先に直す |
| `docs/deliverables/` | 顧客提出用（要件定義書.docx、基本設計書.xlsx） | `ai-input/` から作る出力物。直接編集しない |
| `docs/reference/` | 人間が閲覧する資料（テーブル仕様書.xlsx） | DDLから自動生成する。直接編集しない |
| `docs/ai-input/data-schema.md` と `docs/reference/データスキーマ.xlsx` | データスキーマ（データドメイン）とテーブル設計の定義 | **人は Excel を編集し、AI は md を編集する**。人が Excel を編集したら、人が「mdを更新して」と指示し、AI が Excel の内容を md に反映する。AI が md を更新したら、`pnpm run docs:data-schema` で Excel に再生成する（Excel に未コミットの変更があるときは、人の編集を消さないよう中止する）。AI は Excel を直接編集しない |
| `docs/loop-engineering.md` | ループ（検証と修復の繰り返し）の全体設計 | 人間が読む。規則は本書に書く |
| `docs/superpowers/` | 作業過程の設計書（specs）と実装計画（plans） | 実装の手順はplansに従う |
| `dev/share/src/db/ddl/` | DBのDDL（SQL） | テーブル定義の正本。Drizzleのスキーマはここから `drizzle-kit pull` で生成する |

## 技術構成

- TypeScript、Bun（実行、バンドル、テスト `bun test`）、pnpm（パッケージ管理。ワークスペースのモノレポ。定義は `pnpm-workspace.yaml`、ロックファイルは `pnpm-lock.yaml`）
- 依存の追加は `pnpm add`（`bun add` / `bun install` は使わない）。`workspace:*` でパッケージ間を参照する
- `dev/apps/src/web`: React + React Hook Form
- `dev/apps/src/api`: NestJS + Drizzle ORM + PostgreSQL
- `dev/share/src/zod`: 項目ごとのzodスキーマ。画面・APIのスキーマは、これらを組み合わせて作る
- `dev/share/src/core`: ストリーク計算などの純粋関数
- `dev/share/src/db`: Drizzleのテーブルオブジェクト（`schema.ts`）、DBクライアント、DDL。複数のアプリから使える

## コーディング方針

- **冪等性を確保する**: 同じ操作を繰り返しても結果が変わらないようにする（例: チェックの付与は二重に記録しない）
- **条件分岐にはコメントを付ける**: 何のための分岐かを日本語で書く
- **ロジックを共通化する**: 特にvalidationは `dev/share/src/zod` に一本化し、画面とAPIで重複して書かない

### コメントのルール

コメントは日本語で書く。コメントだけを読んで、処理の流れが分かる状態にする。

- **看板コメント（JSDoc）**: 関数、メソッド、クラス、インターフェース、型、定数（exportするもの）の直前に、JSDoc形式（`/** ... */`）で書く
  - 1行目に「何をするものか」を書く。必要なら、続けて補足（前提、副作用、冪等性）を書く
  - 関数とメソッドには `@param 名前 説明` と `@returns 説明` を付ける。例外を投げるなら `@throws` も付ける。TypeScriptは型を持つので、`{型}` は書かない
- **プロパティのコメント**: クラスのプロパティ、インターフェースと型のプロパティ、zodスキーマや設定オブジェクトの各項目にも、1項目ずつJSDocを付ける（単位、取りうる値、制約があれば書く）
- **処理ブロックのコメント**: 関数の中は、意味のまとまり（処理ブロック）ごとに、目立つコメントブロックで「何をするか」を書く。ブロックの見出しを順に読めば、処理の流れが分かるようにする。形式は次のとおり
  ```ts
  // ================================================================
  // 1. 見出し（このブロックが何をするか）
  //    補足（理由、前提、注意点があれば）
  // ================================================================
  ```
  - 番号は、関数の中で1から順に振る。短い関数（数行）は、ブロックに分けなくてよい
- **条件分岐のコメント**: 上の処理ブロックの中でも、分岐には、何のための分岐かを書く（上の方針のとおり）
- コードを読めば分かること（`i++` の説明など）は書かない。理由と意図を書く

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
- トリガ、制約、DDLは `dev/share/src/db/ddl/` に置き、`habit_app_test` に対する結合テストで検証する

## 作業領域（git worktree）

- 作業は、`main` のワーキングツリーで直接せず、**`git worktree` で作業領域を分けて**行う。作業ごとに、`main` から専用のブランチを切り、**本体のリポジトリの外**（本体の隣の `<本体のフォルダ名>-worktrees/<名前>/`。例: `ade-test-worktrees/<名前>/`）に作業領域を作る。リポジトリの中に置かないのは、型チェック・テスト・検索が入れ子の作業領域を拾わないようにするため。置き場所は環境変数 `WT_ROOT` で変えられる
- 作業領域は、`pnpm run wt create <名前>`（`dev/` で実行）で作る。`<本体>-worktrees/<名前>/`、ブランチ `feature/<名前>`、**専用のテスト用DBとe2e用DB**（`habit_app_test_<名前>`、`habit_app_e2e_<名前>`）、`.env`、`pnpm install` をまとめて用意する。手で作った作業領域には `pnpm run wt env <名前>` を使う。名前は小文字・数字・ハイフンで40文字以内
- 作業が終わったら、`pnpm run wt remove <名前>` で、作業領域と専用DBを消し、マージ済みならブランチも消す。`pnpm run wt list` で、消し忘れたDB（残骸）を確認できる
- **アプリのポートも作業領域ごとに分ける**: `wt.sh` が作業領域ごとに「スロット」（1〜99）を割り当て、`.env` に `API_PORT`（3000+n）、`WEB_PORT`（5173+n）、`E2E_API_PORT`（3100+n）、`E2E_WEB_PORT`（5273+n）を書く。本体は n=0（3000 / 5173 / 3100 / 5273）。`start:api`、`start:web`、`e2e` はこの値を使うので、複数の作業領域で同時に起動しても重ならない
- `.env` はコミット対象外で、接続情報を含む。中身は表示しない。開発用DB（`habit_app_dev`）は全作業領域で共有する
- コミットは、変更したファイルを指定して追加する（`git add -A` と `git add .` は使わない）。他の作業中のファイルを巻き込まないため
- 作業が終わったら、`pnpm run verify` が成功してから、`main` にマージし、作業領域とブランチを削除する。マージとプッシュは、ユーザーの指示があるときだけ行う
- 作業領域から、共有のテスト用DB（`habit_app_test`）とe2e用DB（`habit_app_e2e`）は初期化できない（`db-guard.sh` が中止する。作業領域かどうかは、置き場所ではなく git の情報〔`git-dir` と `git-common-dir` の違い〕で判定する）。作業領域では、専用のDBだけを使う
- テスト用・e2e用のDBに入れるデータは、**テストに必要な最小限**にする（テストの中で作る）。マスタの全件は入れない。マスタが大きくなってセットアップが遅くなったら、投入済みのDBを `CREATE DATABASE ... TEMPLATE` で複製する方式に、`wt.sh` の `create_dbs` を切り替える
- 並行して実行するエージェントには、別々の作業領域を割り当ててもよい（次の「タスクの並行実行」の、ファイルが重ならない場合の代わりになる）

## タスクの並行実行

- 実装計画のタスクのうち、互いに依存せず、同じファイルを編集しないものは、並行して実行する（独立したツール呼び出しは1回の応答にまとめる。大きな独立作業はサブエージェントに任せる）
- 前のタスクの成果物（関数の署名、スキーマ、DDLなど）を使うタスクは、前のタスクが終わってから実行する
- 並行して実行する場合は、編集するファイルが重ならないことを先に確認する。重なる場合は順番に実行する
- 並行実行したタスクの結果は、まとめてテストを実行して確認してから次に進む

## タスク完了の条件

- 実装計画のタスクは、**すべてのテストが成功した状態**で完了とする。一部のテストだけを実行して完了にしない
- 完了の前に、次を実行して結果を確認する。1つでも失敗があれば、そのタスクは未完了とする
  1. `pnpm run typecheck`（型チェック）
  2. `pnpm run db:apply:test` のあと `bun test`（単体テストと結合テストのすべて）
   - 1と2は、`pnpm run verify` でまとめて実行できる
- 失敗したテストは、タスクと無関係に見えても、完了報告に名前を書く。テストを削除・スキップして通すことはしない
- 失敗の原因が自分の変更でないとき（他のタスクの作業途中など）は、その旨を報告し、直るまで完了にしない
- 完了の記録は、`task-done` でテストの実行結果を台帳に残してから行う

## 失敗が続くときの歯止め（ループの終了条件）

ループの全体設計は `docs/loop-engineering.md`。修復のループは `/fix-loop`、画面の確認は `/verify-ui` で行う。

- 同じテストが**3回続けて**失敗したら、同じ直し方を続けない。失敗の内容と、これまで試したことを書き出し、原因を調べ直す（`superpowers:systematic-debugging`）
- 調べ直しても直らないときは、作業を止めて、ユーザーに報告する。報告には、失敗しているテスト名、期待値と実際の値、試したことを含める
- テストを書き換えて通す・削除する・スキップする・期待値を実装に合わせる、のは直し方として認めない。仕様（`docs/ai-input/`）が誤っているときは、仕様を先に直す
- 1回の直しで変えるのは1点だけにする。何が効いたかを分かるようにする

## 規約

- ドキュメント、コミットメッセージ、PR本文は日本語。識別子とブランチ名は英語
- DBの接続情報は環境変数 `DATABASE_URL` で受け取る。`.env` はコミットしない。パスワードをログや出力、ドキュメントに書かない
- 開発用は `habit_app_dev`、結合テスト用は `habit_app_test`、画面の受入確認（e2e）用は `habit_app_e2e` を使う（接続情報は `.env` の `DATABASE_URL`、`TEST_DATABASE_URL`、`E2E_DATABASE_URL`）。`habit_app` には触れない
- コミットは、テストが通る状態で小さく行う（コミット前に型チェックと単体テストが走る）
