# 習慣チェックアプリ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 実行方法はユーザー決定により **Native**（superpowers:executing-plans。このセッションで順に実装し、最後に新しいレビュアーが全体を確認する）。並行実行できるタスク（下記の P1・P2）は、`CLAUDE.md` の方針どおり、ファイルが重ならないことを確認したうえで、サブエージェントに並行して任せてよい。

**Goal:** 習慣の登録・日次チェック・連続達成日数表示ができるWebアプリ（Bunモノレポ、React／NestJS／PostgreSQL／Drizzle）を作り、過程で4つのエンジニアリングを体験して `docs/experience-log.md` に記録する。

**Architecture:** 項目ごとのzodスキーマ（`src/packages/schemas`）と純粋関数（`src/packages/core`）を、画面（`src/apps/web`）とAPI（`src/apps/api`）が共有する。DBはDDL（SQL）を正本とし、`drizzle-kit pull` でスキーマを生成する。更新は行バージョン（`row_version`）による楽観的ロックで制御し、トリガが `row_version` と `txn_id` を更新する。

**Tech Stack:** TypeScript、Bun 1.4.2（ワークスペース、バンドラ、`bun test`）、React、React Hook Form、zod、NestJS、Drizzle ORM、drizzle-kit、PostgreSQL 14、exceljs（Excel出力）、Playwright MCP（画面確認）

**Spec:** `docs/superpowers/specs/2026-11-01-habit-tracker-design.md`、正本は `docs/ai-input/requirements.md` と `docs/ai-input/basic-design.md`（APIと画面の詳細、決定事項はここ）。UIは `DESIGN.md`

## Global Constraints

- 言語はTypeScript。Bunのワークスペースによるモノレポ。Bunは `.tool-versions` で `1.4.2` に固定。テストは `bun test`
- 画面は React + React Hook Form。バリデーションはzodで、**データ項目ごとにスキーマを定義し、画面・APIのスキーマはそれらを組み合わせて作る**（重複定義しない）
- APIは NestJS。DBは PostgreSQL。ORMは Drizzle で、**DDL（SQL）を正とし `drizzle-kit pull` でスキーマを生成**する
- DB接続は環境変数 `DATABASE_URL`（開発 `habit_app_dev`）と `TEST_DATABASE_URL`（テスト `habit_app_test`）。`habit_app` には触れない。`.env` はコミットしない。パスワードを出力・ログ・文書に書かない
- 「今日」は端末のローカル日付（`YYYY-MM-DD`）。サーバーは、日付が**サーバーのUTC日付の前後1日以内**かだけを確認し、範囲外は422（`DATE_NOT_ALLOWED`）。一覧の `today` が範囲外なら400
- 習慣名は前後の空白を除去し、1〜50文字。同名の重複は不可（409 `DUPLICATE_NAME`）
- 全テーブルに `row_version`（bigint、既定1）と `txn_id`（text）。更新・削除は `WHERE row_version = :読んだ値`。0行のとき、対象が無ければ404、あれば409 `VERSION_CONFLICT`。DBMS固有機能でバージョンを代用しない。値の更新はトリガが行う
- 変更系は1トランザクション。最初に `set_config('app.txn_id', <リクエストごとのUUID>, true)`
- 画面は `row_version` を自分で増減せず、サーバーの値または再取得で置き換える。変更後は一覧を再取得する
- UIは `DESIGN.md`（QuestUI）を参考にし、値はCSSのデザイントークンに一箇所で定義する
- ドキュメント、コミットメッセージ、PR本文は日本語。識別子とブランチ名は英語。コミット末尾に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
- `CLAUDE.md` のコーディング方針（冪等性の確保、条件分岐へのコメント、validationの共通化）に従う
- 資料の正本は `docs/ai-input/` と DDL。`docs/deliverables/`、`docs/reference/` の Word・Excel は、そこから作る出力物（直接編集しない）

## Review Focus

1. 習慣名の境界: 空、空白のみ、ちょうど50文字、51文字、前後に空白がある同名 → 拒否または正規化して判定する（Task 6、9）
2. ストリークの境界: 月またぎ、年またぎ、うるう日、未来日付、重複日付、今日が未チェック → 規則どおりに数える（Task 5）
3. 同時実行: 同じバージョンでの同時更新は片方だけ成功し、もう片方は409。存在しないID・削除済みの習慣は404（409にしない）（Task 7、9）
4. 再送と連打: 成功済みの操作を再送して409でも、望む状態になっていれば成功として扱う。通信中はチェックボックスを無効にする（Task 10）
5. 不正な入力・応答: サーバー日付の許可範囲外は422、壊れたAPI応答や通信失敗はエラー表示、習慣名に `<script>` を含んでも文字列として表示する（Task 9、10）

---

## 並行実行の計画

| 区分 | タスク | 前提 | 編集範囲（重ならない） |
|---|---|---|---|
| 直列 | 1 → 2 → 3 → 4 | 順に（2・3はユーザーの参加が必要） | 土台、実験ブランチ、ハーネス |
| **P1** | 5、6、7 | Task 4 完了後 | `src/packages/core`、`src/packages/schemas`、`src/apps/api/db`＋`src/db` |
| **P2** | 8、9、10 | P1 完了後 | `src/scripts/docs`＋`docs/deliverables`＋`docs/reference`、`src/apps/api/src/habits`、`src/apps/web` |
| 直列 | 11 → 12 | P2 完了後 | 結合確認、仕上げ |

各並行グループの終了時に、全体の `bun run typecheck && bun test` を実行してから次へ進む。

## File Structure

| パス | 責務 |
|---|---|
| `package.json`、`tsconfig.base.json`、`.tool-versions`、`.env.example` | ワークスペース、共通設定 |
| `src/packages/core/src/{dates,streak}.ts` | 日付処理、ストリーク、許可範囲の判定 |
| `src/packages/schemas/src/fields/*.ts`、`src/{habit,error}.ts` | 項目スキーマ、組み合わせスキーマ |
| `src/apps/api/db/ddl/*.sql`、`src/apps/api/drizzle.config.ts`、`src/apps/api/src/db/schema.ts` | DDL、生成されたDrizzleスキーマ |
| `src/apps/api/src/habits/*` | リポジトリ、サービス、コントローラ、エラー変換 |
| `src/apps/api/test/*.int.test.ts` | DB・HTTPの結合テスト |
| `src/apps/web/src/*` | トークン、API、フォーム、一覧、状態管理 |
| `src/scripts/{hook-check.sh,db-apply.sh,docs/*}` | hook、DB適用、Excel・Word出力 |
| `.claude/settings.json` | 編集後の検証hook |
| `docs/experience-log.md` | 4つの体験の記録 |

---

### Task 1: モノレポの土台と環境

**Files:**
- Create: `package.json`、`tsconfig.base.json`、`.tool-versions`、`.env.example`、`docs/experience-log.md`、各ワークスペースの `package.json` と `tsconfig.json`（`src/packages/core`、`src/packages/schemas`、`src/apps/api`、`src/apps/web`）
- Modify: `.gitignore`（`dist/` を追加）、`src/apps/api/.env`（作成。`src/.env` から移す）

**Interfaces:**
- Produces: `bun run typecheck`、`bun test`、`bun run db:apply` が使えるルートスクリプトの枠。ワークスペース名は `@habit/core`、`@habit/schemas`、`@habit/api`、`@habit/web`。`docs/experience-log.md` に4つの章

- [ ] **Step 1: `.tool-versions` に `bun 1.4.2` を書き、`bun --version` を実行。** Expected: `1.4.2`
- [ ] **Step 2: ルート `package.json`（`workspaces: ["src/packages/*","src/apps/*"]`、`scripts.typecheck`、`scripts.test`）と各ワークスペースの枠を作る。** パッケージ間の依存は `workspace:*` で宣言する。`typescript` を devDependency に入れる
- [ ] **Step 3: `src/.env`（host, db, user, password）から `src/apps/api/.env` を作る。** `DATABASE_URL` と `TEST_DATABASE_URL` をURL形式で書く（パスワードは必要ならURLエンコード）。**値を画面に出さず、スクリプトで変換する。** 完了後 `src/.env` と空の `src/` を削除し、`.env.example`（値はダミー）を作る。`git status` に `.env` が出ないことを確認する
- [ ] **Step 4: `docs/experience-log.md` に「1. プロンプト」「2. コンテキスト」「3. ハーネス」「4. ループ」の章と、各章の「やったこと／結果／気づき」の枠を作る**
- [ ] **Step 5: `bun install` を実行。** Expected: 成功し、`bun run typecheck` が（ソースが無いため）エラーなく終わる
- [ ] **Step 6: Commit** `chore: Bunモノレポの土台と環境設定を追加`

### Task 2: 【体験: プロンプト】曖昧な依頼 vs 明確な依頼

題材は項目スキーマ `habitNameField`（Review Focus 1）。使い捨てブランチで行い、成果はログだけを本線に取り込む。

**Files:**
- Modify: `docs/experience-log.md`（第1章）

- [ ] **Step 1: ユーザーに「曖昧な依頼」を自分の言葉で書いてもらう**（例:「習慣名のチェックを作って」）
- [ ] **Step 2: `experiment/prompt-vague` で、新しい（文脈を持たない）サブエージェントにその依頼を実行させる。** worktree分離を使い、本線に影響させない
- [ ] **Step 3: 成功条件つきの依頼を、ユーザーと一緒に書く。** 含めるもの: ファイルと関数名（`habitNameField`）、入力と出力、拒否条件（空・空白のみ・51文字以上）、境界値（50文字は可）、テストを先に書くこと、完了条件（`bun test` が通る）。`experiment/prompt-clear` で同様に実行させる
- [ ] **Step 4: 2つの結果を比較する。** 観点: 拒否条件の網羅、境界値のテスト、署名の一致、余計な変更、手戻り回数。第1章に表で記録し、ユーザーの感想を追記する
- [ ] **Step 5: 本線に戻り、ログだけを取り込む。** 実験ブランチはマージせず残す。Commit `docs: プロンプト体験の記録を追加`

### Task 3: 【体験: コンテキスト】CLAUDE.mdと設計資料の有無

**Files:**
- Modify: `docs/experience-log.md`（第2章）

- [ ] **Step 1: `experiment/context-without` を作り、`CLAUDE.md`、`SPEC.md`、`TASK.md`、`docs/ai-input/`、`DESIGN.md` を削除する。** 新しいサブエージェントに、同じ短い依頼（例:「日付の項目スキーマ `dateField` を作って」）を実行させる
- [ ] **Step 2: `experiment/context-with`（資料がある状態）で、同じ依頼を同じ条件で実行させる**
- [ ] **Step 3: 差を記録する。** 観点: ファイルの置き場所、命名、日本語コメント、`YYYY-MM-DD` の実在確認の有無、方針（共通化・分岐コメント）の遵守、質問の有無。ユーザーの感想も追記する
- [ ] **Step 4: 「何を `CLAUDE.md` に書き、何を `docs/ai-input/` に分けるか」で気づいた点をまとめ、必要なら `CLAUDE.md` を直す（直す場合はユーザーが確認）。** Commit `docs: コンテキスト体験の記録を追加`

### Task 4: 【体験: ハーネス】テスト基盤・型チェック・hook

**Files:**
- Create: `src/packages/core/src/dates.ts`、`src/packages/core/test/dates.test.ts`、`src/scripts/hook-check.sh`、`.claude/settings.json`
- Modify: ルート `package.json`（`typecheck`、`test:unit`）

**Interfaces:**
- Produces（`@habit/core`）: `toDateString(d: Date): string`（ローカル日付の `YYYY-MM-DD`）、`addDays(dateStr: string, n: number): string`（`n` は負も可）

- [ ] **Step 1: 失敗するテストを書く。** `toDateString(new Date(2024, 0, 5)) === '2024-01-05'`、`addDays('2024-02-28', 1) === '2024-02-29'`、`addDays('2024-03-01', -1) === '2024-02-29'`、`addDays('2023-12-31', 1) === '2024-01-01'`
- [ ] **Step 2: `bun test src/packages/core` を実行。** Expected: FAIL（モジュール無し）
- [ ] **Step 3: `dates.ts` を実装する。** UTCではなくローカル日付で計算する（`Date` のローカルコンストラクタ）
- [ ] **Step 4: `bun test src/packages/core`。** Expected: PASS
- [ ] **Step 5: ルートに `test:unit`（結合テスト `*.int.test.ts` を含まない）と `typecheck`（各ワークスペースで `tsc --noEmit`）を整える。** 結合テストはファイル名で区別し、除外方法は実際に実行して確認する
- [ ] **Step 6: `src/scripts/hook-check.sh` を作る。** `typecheck` と `test:unit` を実行し、失敗時は結果の末尾を標準エラーに出して終了コード2で終わる。`.claude/settings.json` に `PostToolUse`（対象 `Edit|Write|MultiEdit`）で呼び出す設定を書く
- [ ] **Step 7: hookの検証。** `dates.ts` をわざと壊して編集し、hookが失敗を報告することを確認してから元に戻す。第3章に、設定の内容と観察（報告の見え方、実行時間）を記録する
- [ ] **Step 8: Commit** `feat: 日付ユーティリティと検証hookを追加`

### Task 5（P1）: 【体験: ループ】ストリーク計算

**Files:**
- Create: `src/packages/core/src/streak.ts`、`src/packages/core/test/streak.test.ts`
- Modify: `src/packages/core/src/dates.ts`（`isWithinServerWindow` を追加）、`src/packages/core/test/dates.test.ts`、`docs/experience-log.md`（第4章）

**Interfaces:**
- Consumes: `addDays`
- Produces:
  - `calcStreak(checked: readonly string[], today: string): number`
  - `isWithinServerWindow(date: string, serverNow: Date): boolean`（`serverNow` のUTC日付の前後1日以内なら true）

- [ ] **Step 1: 先に全テストを書く（失敗する状態）。** 空配列→0／今日のみ→1／今日未チェックで昨日・一昨日→2／1日空けて→0（空いた前の連続は数えない）／月またぎ（`2024-03-01` 基準で `2024-02-29`、`2024-02-28`）／年またぎ／うるう日／未来日付のみ→0／重複日付は1日／順不同の入力。`isWithinServerWindow` は、UTC日付の前日・当日・翌日が true、前々日・翌々日が false
- [ ] **Step 2: ループ実験のため、わざと不完全な実装を作る。** 同じ月の中の日の差だけで判定し、月・年をまたぐ処理を持たせない
- [ ] **Step 3: ループを回す。** `bun test src/packages/core` → 失敗を読む → 1つだけ直す → 再実行、を全テストが通るまで繰り返す。周回ごとに「失敗したテスト／直した点」を第4章に記録する（hookが自動で回す様子も記録）
- [ ] **Step 4: 最終的な実装は `addDays` で遡る形にする。** `checked` は `Set` にして重複と順序の影響を受けないようにする。条件分岐に日本語コメントを付ける
- [ ] **Step 5: `isWithinServerWindow` を実装する。** UTC日付の比較は日付文字列で行う
- [ ] **Step 6: `bun test src/packages/core`。** Expected: すべて PASS
- [ ] **Step 7: Commit** `feat: ストリーク計算と許可範囲の判定を追加`

### Task 6（P1）: 項目スキーマと組み合わせスキーマ

**Files:**
- Create: `src/packages/schemas/src/fields/{habitId,habitName,date,streak,rowVersion,createdAt}.ts`、`src/packages/schemas/src/{habit,error,index}.ts`、`src/packages/schemas/test/*.test.ts`

**Interfaces:**
- Produces（`@habit/schemas`。すべてzodスキーマと、`z.infer` の型）:
  - 項目: `habitIdField`（UUID）、`habitNameField`（trim → 1〜50文字）、`dateField`（`YYYY-MM-DD`、実在する日付）、`streakField`（0以上の整数）、`rowVersionField`（1以上の整数）、`createdAtField`（ISO 8601）
  - 組み合わせ: `createHabitFormSchema`（`{ name }`）、`createHabitRequestSchema`（同一）、`habitResponseSchema`（`{ id, name, createdAt, checkedToday: boolean, streak, rowVersion }`）、`toggleCheckParamsSchema`（`{ id, date }`）、`versionQuerySchema`（`{ rowVersion }`。クエリ文字列から数値へ変換する）、`versionResponseSchema`（`{ rowVersion }`）、`errorResponseSchema`（`{ error: { code, message } }`。`code` は `VALIDATION_ERROR`／`DUPLICATE_NAME`／`NOT_FOUND`／`DATE_NOT_ALLOWED`／`VERSION_CONFLICT`）
  - エラーメッセージは日本語

- [ ] **Step 1: 失敗するテストを書く。** `habitNameField`: `''`・`'   '`・51文字を拒否、50文字を許可、`'  読書 '` を `'読書'` に正規化。`dateField`: `'2024-02-29'` 可、`'2023-02-29'`・`'2024-13-01'`・`'2024-1-1'` 不可。`rowVersionField`: 0・小数・負を拒否。`versionQuerySchema`: `{ rowVersion: '3' }` を `3` に変換。`createHabitFormSchema` が `habitNameField` を再利用していること（同じ入力で同じ結果）
- [ ] **Step 2: `bun test src/packages/schemas`。** Expected: FAIL
- [ ] **Step 3: 実装する。** 組み合わせスキーマは項目スキーマを参照して作り、規則を再記述しない
- [ ] **Step 4: `bun test src/packages/schemas`。** Expected: PASS
- [ ] **Step 5: Commit** `feat: 項目ごとのzodスキーマと組み合わせスキーマを追加`

### Task 7（P1）: DDL・トリガ・Drizzleスキーマ

**Files:**
- Create: `src/apps/api/db/ddl/001_init.sql`、`src/scripts/db-apply.sh`、`src/apps/api/drizzle.config.ts`、`src/apps/api/src/db/schema.ts`（生成）、`src/apps/api/src/db/client.ts`、`src/apps/api/test/db.int.test.ts`

**Interfaces:**
- Produces:
  - テーブル `habits(id uuid pk, name varchar(50) unique not null, created_at timestamptz not null, row_version bigint not null default 1, txn_id text)`、`habit_checks(habit_id uuid fk → habits on delete cascade, check_date date, row_version bigint not null default 1, txn_id text, pk(habit_id, check_date))`
  - トリガ関数 `set_row_meta()`: INSERT時は `txn_id` を記録、UPDATE時は `NEW.row_version := OLD.row_version + 1`（アプリの値は無視）と `txn_id` の記録。`txn_id` は `current_setting('app.txn_id', true)`、未設定または空なら `pg_current_xact_id()::text`
  - `bun run db:apply`（`DATABASE_URL` に対してDDLを順に適用）、`bun run db:apply:test`（`TEST_DATABASE_URL` を初期化してから適用）
  - `createDb(url: string)`（Drizzleのクライアントを返す）

- [ ] **Step 1: DBが使えるか確認する。** `psql` で `habit_app_test` に接続（パスワードを表示しない）
- [ ] **Step 2: `001_init.sql` を書く。** 再実行しても壊れないよう、`CREATE TABLE IF NOT EXISTS`、`CREATE OR REPLACE FUNCTION`、トリガは `DROP TRIGGER IF EXISTS` してから作る。`habit_checks` のトリガは `BEFORE INSERT OR UPDATE`。条件分岐にコメントを付ける
- [ ] **Step 3: 失敗する結合テストを書く（`db.int.test.ts`、`TEST_DATABASE_URL` を使用）。** 各テストの前にデータを消す。内容: INSERTで `row_version` が1／`set_config` した値が `txn_id` に入る／UPDATEで `row_version` が+1／UPDATEで `row_version = 99` を指定しても+1のまま／`set_config` 無しでも `txn_id` が空でない／古いバージョンのUPDATEが0行／**2つの接続で同じバージョンの更新を同時に実行し、片方だけが1行を更新、もう片方は0行**／習慣の削除でチェックが消える／同じ `(habit_id, check_date)` の `INSERT ... ON CONFLICT DO NOTHING` を2回行っても1行／同名の習慣が一意制約で拒否される
- [ ] **Step 4: `bun run db:apply:test` のあと `bun test src/apps/api/test/db.int.test.ts`。** Expected: DDL適用後に PASS（適用前は FAIL）
- [ ] **Step 5: 開発用DBに `bun run db:apply` を実行し、`drizzle-kit pull` で `src/db/schema.ts` を生成する。** 生成物を確認し、列の型が上記の定義と一致することを確認する
- [ ] **Step 6: Commit** `feat: DDLとトリガ、Drizzleスキーマを追加`

### Task 8（P2）: 文書の出力（Excel・Word）

**Files:**
- Create: `src/scripts/docs/{gen-table-spec.ts,gen-basic-design.ts,build-requirements-docx.js}`、`docs/reference/テーブル仕様書.xlsx`、`docs/deliverables/基本設計書.xlsx`
- Modify: `docs/deliverables/要件定義書.docx`（再生成）、ルート `package.json`（`docs:build`）

**Interfaces:**
- Consumes: DB（Task 7）、`docs/ai-input/basic-design.md`、`requirements.md`
- Produces: `bun run docs:build`（3つの文書を生成）

- [ ] **Step 1: `gen-table-spec.ts` を実装する。** `information_schema` と `pg_catalog` から、テーブル・列・型・NULL可否・既定値・主キー・外部キー・一意制約・トリガを読み、1テーブル1シートで `テーブル仕様書.xlsx` に出力する。表紙シート（生成日時、DB名）を付ける。`exceljs` を使う
- [ ] **Step 2: `gen-basic-design.ts` を実装する。** `basic-design.md` の見出しと表を読み、章ごとのシート（構成、バリデーション、API、画面、処理、データ、決定事項）に出力する。表は表のまま、本文は1セルに入れる
- [ ] **Step 3: `build-requirements-docx.js` を、作業用の既存スクリプトから `src/scripts/docs/` へ移して更新する。** N-07、N-08、A-09〜A-11、行バージョンと `txn_id` のデータ項目、同時実行制御の機能説明、UIデザイン（QuestUIを参考にする）を追記する
- [ ] **Step 4: 出力を検証する。** `unzip -t` でzipの整合を確認し、`exceljs` で読み戻してシート名と行数を確認する。生成したxlsxに秘密情報（接続文字列、パスワード）が含まれないことを確認する
- [ ] **Step 5: Commit** `feat: Excel・Word文書の生成スクリプトと出力を追加`

### Task 9（P2）: API（NestJS）

**Files:**
- Create: `src/apps/api/src/{main.ts,app.module.ts}`、`src/apps/api/src/habits/{habits.repository.ts,habits.service.ts,habits.controller.ts,habits.module.ts}`、`src/apps/api/src/common/{zod-validation.pipe.ts,txn-context.interceptor.ts,error.filter.ts}`、`src/apps/api/test/{habits.service.test.ts,habits.api.int.test.ts}`

**Interfaces:**
- Consumes: `calcStreak`、`isWithinServerWindow`（Task 5）、`@habit/schemas`（Task 6）、`createDb` とスキーマ（Task 7）
- Produces:
  - `HabitsRepository.listWithChecks(): Promise<Array<{ id; name; createdAt; rowVersion; checkedDates: string[] }>>`（習慣とチェックを1クエリで読む）、`create(name: string, txnId: string)`、`deleteVersioned(id: string, rowVersion: number, txnId: string): Promise<'deleted' | 'not_found' | 'conflict'>`、`setCheck(id: string, date: string, checked: boolean, rowVersion: number, txnId: string): Promise<{ status: 'ok'; rowVersion: number } | { status: 'not_found' } | { status: 'conflict' }>`
  - `HabitsService`: `list(today: string, now: Date)`、`create`、`delete`、`setCheck`（日付の許可範囲を検証）
  - HTTP: `docs/ai-input/basic-design.md` の3章のとおり（`/api/habits` 配下の5エンドポイント）

- [ ] **Step 1: NestJSがBun上で動くか検証する。** 最小のモジュールとコントローラを `bun` で起動し、`emitDecoratorMetadata` による依存注入が効くか確認する。効かない場合は、tscでビルドして実行する方式に切り替え、`CLAUDE.md` に理由を追記する（ユーザーに報告）
- [ ] **Step 2: サービスの失敗するテストを書く（偽のリポジトリを使用）。** 一覧が `checkedToday` と `streak` を返す／`today` が許可範囲外なら拒否／チェックの日付が許可範囲外なら `DATE_NOT_ALLOWED`／リポジトリの `conflict`・`not_found` を対応するエラーに変換
- [ ] **Step 3: リポジトリとサービスを実装する。** `setCheck` は1トランザクションで、最初に `set_config('app.txn_id', ..., true)`、次に `UPDATE habits SET name = name WHERE id = ? AND row_version = ? RETURNING row_version`（0行なら存在確認して `not_found` か `conflict`）、続いて付与は `INSERT ... ON CONFLICT DO NOTHING`、解除は `DELETE`。`deleteVersioned` も同じ判定。SQLは必ずパラメータ化し、条件分岐にコメントを付ける
- [ ] **Step 4: HTTPの結合テストを書く（`habits.api.int.test.ts`、`TEST_DATABASE_URL`、ランダムポートで起動）。** 作成→一覧に `rowVersion` が含まれる／空・51文字の名前が400／同名が409 `DUPLICATE_NAME`／前後空白つきの同名も409／チェック付与で200と新しい `rowVersion`／古い `rowVersion` で409 `VERSION_CONFLICT`／**同じ `rowVersion` で同時に2リクエスト→片方200・片方409**／存在しないIDが404／削除済み習慣へのチェックが404／同じチェックの再送は二重にならない／許可範囲外の日付が422／削除後にチェックも消える／`txn_id` が更新した全行で一致（A-11）
- [ ] **Step 5: コントローラ、検証パイプ（`@habit/schemas` を使用）、リクエストごとにUUIDを発行する `TxnContextInterceptor`、エラー変換フィルタ（`errorResponseSchema` の形）を実装する**
- [ ] **Step 6: `bun run typecheck && bun test src/apps/api`。** Expected: すべて PASS（結合テストは `db:apply:test` 済みのDBに対して）
- [ ] **Step 7: Commit** `feat: 習慣APIと楽観的ロックを追加`

### Task 10（P2）: 画面（React）

**Files:**
- Create: `src/apps/web/index.html`、`src/apps/web/src/{main.tsx,App.tsx,tokens.css,api.ts,conflict.ts}`、`src/apps/web/src/components/{HabitForm,HabitList,HabitRow,StreakChip}.tsx`、`src/apps/web/serve.ts`、`src/apps/web/test/*.test.ts(x)`、`src/apps/web/bunfig.toml`

**Interfaces:**
- Consumes: `@habit/schemas`、`@habit/core`（`toDateString`）
- Produces:
  - `createApiClient(fetchImpl: typeof fetch)`: `listHabits(today)`、`createHabit(name)`、`deleteHabit(id, rowVersion)`、`setCheck(id, date, checked, rowVersion)`。応答は `@habit/schemas` で検証し、形が違えばエラーにする
  - `resolveToggleConflict(desired: boolean, latest: HabitResponse, date: string): 'already' | 'retry'`
  - `bun run --cwd src/apps/web build`（Bunのバンドラで `dist/` を生成）、`serve.ts`（`dist/` を配信し `/api` をAPIへ転送）

- [ ] **Step 1: 失敗するテストを書く。** `resolveToggleConflict`: 望む状態にすでになっていれば `'already'`、なっていなければ `'retry'`。APIクライアント（偽の `fetch`）: 壊れたJSON・想定外の形・通信失敗でエラーを返す／409で `VERSION_CONFLICT` を識別する。コンポーネント（testing-library + happy-dom）: 空の名前で送信するとエラー文が欄の下に出る／`<script>alert(1)</script>` という習慣名が文字列として表示され、要素として挿入されない／通信中はチェックボックスが無効／習慣が無いときに案内が出る
- [ ] **Step 2: `bun test src/apps/web`。** Expected: FAIL
- [ ] **Step 3: `tokens.css` に `DESIGN.md` の値（色、フォント、余白、角丸、影、各部品）をCSS変数として定義する。** 各部品はトークンだけを参照し、値を直接書かない。フォントは Cinzel／Spectral を Google Fonts で読み込み、フォールバックは `serif`。純粋な黒・白を使わない
- [ ] **Step 4: 実装する。** フォームは React Hook Form + `zodResolver(createHabitFormSchema)`。「今日」は操作のたびに `toDateString(new Date())` で求める。変更後は一覧を再取得する。バージョンは自分で増減せず、再取得した値を使う。409のときは再取得し、`resolveToggleConflict` が `'already'` なら成功扱い、`'retry'` ならメッセージを表示する。削除は確認なしで即実行する。通信・保存の失敗は一覧の上にエラー表示する。部品は `DESIGN.md` のカード、入力欄、ボタン、チェックボックス、チップ、リストに対応づける
- [ ] **Step 5: `bun test src/apps/web` と `bun run typecheck`。** Expected: PASS
- [ ] **Step 6: `build` を実行。** Expected: `dist/` が生成される
- [ ] **Step 7: Commit** `feat: 習慣チェックの画面を追加`

### Task 11: 結合確認（Playwright）

**Files:**
- Modify: `docs/experience-log.md`（第3章の仕上げ）

- [ ] **Step 1: 開発用DBにDDLを適用し、APIとWebを起動する**（`bun run db:apply`、APIとWebの起動）
- [ ] **Step 2: Playwright MCPで受入基準を確認する。** A-01 習慣を2つ追加／A-02 空・空白・同名でエラー表示／A-03 チェックでストリーク増減／A-04 再読み込みで保持／A-05 削除と再登録でストリーク0／A-08 コンソールにエラー無し
- [ ] **Step 3: 競合と日付の確認。** A-09: 2つのタブで同じ習慣を開き、片方で切り替えた後にもう片方を切り替えると、最新に再取得されてメッセージが出るか、望む状態なら成功扱いになる。A-07: ブラウザで `Date` を差し替え、新しい日付で記録されることを確認する
- [ ] **Step 4: 見た目を確認する。** スクリーンショットを撮り、`DESIGN.md` の「やるべきこと・避けること」（純粋な黒・白、サンセリフ体、ゴールドの発光）に反していないか確認する
- [ ] **Step 5: 見つかった不具合は、`superpowers:systematic-debugging` に従って原因を特定してから直し、テストを追加する。** 結果と気づきを第3章に記録する
- [ ] **Step 6: `bun run typecheck && bun test` を全件実行。** Expected: すべて PASS。Commit `test: 結合確認の結果を記録`

### Task 12: 仕上げと全体レビュー

**Files:**
- Create: `README.md`
- Modify: `docs/experience-log.md`、`TASK.md`、`SPEC.md`（参照先の更新）

- [ ] **Step 1: `README.md`（日本語）を書く。** セットアップ（Bun、`.env`、`db:apply`）、起動、テスト、フォルダ構成、文書の生成方法
- [ ] **Step 2: `bun run docs:build` を実行し、`docs/` 配下の Excel・Word を最新にする**
- [ ] **Step 3: `experience-log.md` に「4つを通した気づき」のまとめと、ユーザーの感想を書く。** 完成の定義（アプリ本体＋4章のログ）を満たしているか確認する
- [ ] **Step 4: `TASK.md` を完了状態に更新する**
- [ ] **Step 5: 新しいレビュアー（最も高性能なモデル）にブランチ全体のレビューを依頼する。** 観点: 設計書・基本設計との一致、Review Focus の5項目、秘密情報の混入、`CLAUDE.md` の方針の遵守。指摘は `superpowers:receiving-code-review` に従って検証してから直す
- [ ] **Step 6: `superpowers:verification-before-completion` に従い、`bun run typecheck && bun test` と受入基準を再確認してから、完了を報告する。** Commit `docs: READMEと体験ログを完成`

---

## Self-Review メモ

- **要件の網羅**: F-01〜06 は Task 6・9・10、N-01〜08 は Task 7・9・10、A-01〜A-11 は Task 5・7・9・11 に対応する。A-07 と A-09 は Task 11、A-10・A-11 は Task 7・9
- **4つの体験**: プロンプト＝Task 2、コンテキスト＝Task 3（およびこれまでの `CLAUDE.md` 整備）、ハーネス＝Task 4・11、ループ＝Task 5
- **型の整合**: `rowVersion`、`setCheck`、`calcStreak`、`isWithinServerWindow` の署名は Interfaces と基本設計書で一致
- **Review Focus**: 5項目は Task 5・6・7・9・10 のテストが担う
- **未確定のまま進める点（実装時に検証）**: NestJSのBun上での動作（Task 9 Step 1）、結合テストを除外する `bun test` の指定方法（Task 4 Step 5）
