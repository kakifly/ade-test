# 基本設計（AI入力用の正本）【たたき台】

要件は `requirements.md`、見た目は `DESIGN.md`、テーブル定義はDDL（`dev/apps/src/api/db/ddl/`）が正本。顧客提出用の `基本設計書.xlsx` は、本書から作る出力物。

> 状態: 要判断の3点は確定済み（7章）。**[案]** は、Claudeの推測・提案で、まだユーザーの承認を得ていない。

## 1. システム構成

```
ブラウザ (dev/apps/src/web) ──HTTP/JSON──> NestJS (dev/apps/src/api) ──Drizzle──> PostgreSQL
        └──────────── dev/packages/src/schemas（zod）を共有 ────────────┘
                      dev/packages/src/core（日付・ストリーク）はAPIが使用
```

| パッケージ | 責務 |
|---|---|
| `dev/apps/src/web` | 画面、フォーム（React Hook Form + zodResolver）、APIクライアント |
| `dev/apps/src/api` | REST API、永続化（Drizzle）、重複チェックなどDBが必要な検証 |
| `dev/packages/src/schemas` | 項目ごとのzodスキーマと、その組み合わせ（フォーム・リクエスト・レスポンス） |
| `dev/packages/src/core` | `toDateString`、`addDays`、`calcStreak`（純粋関数） |

- **[案]** ストリークは**サーバー側で計算**し、APIのレスポンスに含める。画面は表示するだけにして、計算ロジックを一箇所（`dev/packages/src/core`）に置く
- **[案]** APIのパスは `/api` 配下。フロントはBunの開発サーバーから、APIへプロキシする

## 2. バリデーション設計

### 2.1 項目スキーマ（`dev/packages/src/schemas/fields/`）

| スキーマ | 規則 |
|---|---|
| `habitIdField` | UUID形式の文字列 |
| `habitNameField` | 前後の空白を除去 → 1文字以上 → 50文字以内（確定） |
| `dateField` | `YYYY-MM-DD` 形式で、実在する日付（2/30は不可） |
| `streakField` | 0以上の整数 |
| `rowVersionField` | 1以上の整数（DBの `row_version`。画面は受け取った値をそのまま持ち回り、自分で増減しない） |
| `createdAtField` | ISO 8601の日時文字列 |

### 2.2 画面・APIのスキーマ（項目スキーマの組み合わせ）

| スキーマ | 構成 | 使う場所 |
|---|---|---|
| `createHabitFormSchema` | `{ name: habitNameField }` | 追加フォーム（zodResolver） |
| `createHabitRequestSchema` | `createHabitFormSchema` と同一 | `POST /habits` の入力検証 |
| `habitResponseSchema` | `{ id, name, createdAt, checkedToday: boolean, streak, rowVersion }` | レスポンス（サーバーが出力、画面が受信時に検証） |
| `toggleCheckParamsSchema` | `{ id: habitIdField, date: dateField }` | チェック操作のパス |
| `versionQuerySchema` | `{ rowVersion: rowVersionField }` | 更新・削除の対象バージョン（PUT/DELETE のクエリ） |
| `versionResponseSchema` | `{ rowVersion: rowVersionField }` | 更新後の新しいバージョン |
| `errorResponseSchema` | `{ error: { code, message } }` | エラー応答 |

- 重複チェック（同名）はDBが必要なので、APIで行い、DBの一意制約でも守る。フォームの形式検証は、スキーマに一本化する

## 3. API設計

共通: JSON。`today` は端末のローカル日付 `YYYY-MM-DD`。

| メソッド・パス | 内容 | 成功 | 失敗 |
|---|---|---|---|
| `GET /api/habits?today=` | 習慣の一覧（`checkedToday`、`streak` 付き） | 200 `Habit[]` | 400 |
| `POST /api/habits` | 習慣の追加。body: `{ name }` | 201 `Habit` | 400 検証失敗、409 同名 |
| `DELETE /api/habits/:id?rowVersion=` | 習慣と履歴の削除（バージョン必須） | 204 | 400、404、409 |
| `PUT /api/habits/:id/checks/:date?rowVersion=` | 指定日のチェックを付ける（冪等。習慣のバージョンを更新） | 200 `{ rowVersion }` | 400、404、409、422 日付が不可 |
| `DELETE /api/habits/:id/checks/:date?rowVersion=` | 指定日のチェックを外す（冪等。無くても成功） | 200 `{ rowVersion }` | 400、404、409、422 |

- エラーコード **[案]**: `VALIDATION_ERROR`、`DUPLICATE_NAME`、`NOT_FOUND`、`DATE_NOT_ALLOWED`、`VERSION_CONFLICT`（409）
- **チェック日付の許可範囲（確定）**: 「今日」はクライアントの端末のローカル日付とする。サーバーは、チェック日付が**サーバーのUTC日付の前後1日（3日間）以内**であることだけを確認し、範囲外は422 `DATE_NOT_ALLOWED` とする。サーバーとクライアントのタイムゾーン差による日付のずれを許容するための範囲である
- 一覧取得（`GET /api/habits?today=`）の `today` も、同じ範囲内であることを検証する（範囲外は400）

## 4. 画面設計

1画面。見た目は `DESIGN.md` に従う。

```
┌ 今日の習慣チェック ─────────────────────┐
│ [ 習慣名を入力          ] [追加]         │
│  （エラー文：入力欄の下）                │
│ ┌ カード ──────────────────────────┐ │
│ │ ☑ 朝のストレッチ    🔥 5日   [削除] │ │
│ │ ☐ 読書              🔥 0日   [削除] │ │
│ └──────────────────────────────────┘ │
│  習慣がない場合：「最初の習慣を登録しよう」│
└──────────────────────────────────────┘
```

| 要素 | 使うDESIGN.mdの部品 | 振る舞い |
|---|---|---|
| 追加欄 | Input（エラー時はError状態）、Button Primary | 送信時にzodで検証。エラーは欄の下に表示。成功で欄を空にする |
| 習慣の一覧 | Card（Default）、List | 行ごとに、チェック、習慣名、連続日数、削除 |
| チェック | Checkbox | 操作時に「今日」を取り直してAPIへ送る。失敗時は元に戻し、エラー表示 |
| 連続日数 | Chip（Status Success） | 「N日」。0日のときは目立たない表示（Filter） |
| 削除 | Button Destructive（sm） | 確認ダイアログは出さず、押したら即削除する（確定。単純さを優先） |
| エラー | Card + Error色 | 通信・保存の失敗を一覧の上に表示 |

## 5. 処理の取り決め

- **「今日」**: クライアントが `toDateString(new Date())` で、取得・チェックの**操作のたびに**求める。日付をまたいで画面を開いたままでも、新しい日付で記録される。画面を開き続けると表示が古くなるため、チェック操作の後は一覧を再取得する
- **冪等性**: チェックの付与は `INSERT ... ON CONFLICT DO NOTHING`、解除は存在しなくても成功とする
- **ストリーク**: `calcStreak(checkedDates, today)` を `dev/packages/src/core` に置く。APIは、習慣ごとの履歴を取得して計算する
- **状態更新**: 変更操作後は一覧を再取得する（**[案]** 楽観的更新はしない。単純さを優先）
- **エラー処理**: APIの応答は、受信時に `habitResponseSchema` で検証する。形が違えばエラー表示にする

### 5.1 同時実行制御（楽観的ロック。ユーザー確定）

- **対象**: チェックの切り替えは「習慣の更新」として扱う（親の `habits` 行のバージョンで制御。`habit_checks` の行にはバージョン条件を付けない）
- **切り替えの流れ**（1トランザクション）:
  1. `set_config('app.txn_id', <リクエストごとのUUID>, true)`
  2. `UPDATE habits SET name = name WHERE id = :id AND row_version = :v RETURNING row_version`（トリガが `row_version` を+1し、`txn_id` を記録）。0行なら、存在確認して404または409で終了する（ロールバック）
  3. 付与は `INSERT ... ON CONFLICT DO NOTHING`、解除は `DELETE`（無くても成功）
  4. コミットし、新しい `rowVersion` を返す
- **削除**: `DELETE FROM habits WHERE id = :id AND row_version = :v`。0行なら404または409
- **トリガ**: 共通の関数を各テーブルの `BEFORE UPDATE` に設定する。`row_version := OLD.row_version + 1` と強制し、アプリが書いた値は無視する。`txn_id := current_setting('app.txn_id', true)`（未設定ならDBのトランザクションIDで代替）。INSERT時の `row_version` は 1。DELETEにはトリガ不要
- **画面**: バージョンは受け取った値で置き換える（自分で+1しない）。変更後は一覧を再取得する。通信中はチェックボックスを無効にして操作を直列にする。409の場合は再取得し、**望む状態にすでになっていれば成功として扱う**（冪等性の維持）。そうでなければメッセージを表示する
- **分離レベル**: READ COMMITTED（既定）で足りる。後続の更新は行ロックを待ち、`WHERE` の再評価で0行になる
- **一覧の取得**: 習慣とチェック履歴は1つのクエリ（またはスナップショット）で読み、バージョンとストリークが矛盾しないようにする

## 6. データ設計（概要）

詳細は DDL と `テーブル仕様書.xlsx`。

| テーブル | 主な列 | 制約 |
|---|---|---|
| `habits` | `id`(uuid, PK)、`name`(varchar(50))、`created_at`(timestamptz)、`row_version`(bigint, 既定1)、`txn_id`(text) | `name` は一意。`BEFORE UPDATE` トリガで `row_version`、`txn_id` を更新 |
| `habit_checks` | `habit_id`、`check_date`(date)、`row_version`(bigint, 既定1)、`txn_id`(text) | PK は `(habit_id, check_date)`。`habit_id` は `habits` への外部キーで `ON DELETE CASCADE`。`txn_id` は INSERT 時にも記録 |

- `txn_id` は、INSERTにも記録するため、`BEFORE INSERT OR UPDATE` のトリガにする（`habit_checks` はINSERT時の記録が主）

## 7. 決定事項（2026-11-01 ユーザー確定）

1. チェック日付の許可範囲: サーバーのUTC日付の前後1日。「今日」は端末のローカル日付のまま
2. 習慣名の最大文字数: 50
3. 削除時の確認ダイアログ: なし
4. ストリークはサーバー側で `dev/packages/src/core` を使って計算する
5. 同時実行制御: 楽観的ロック（`row_version`、トリガで+1）。チェックの切り替えは親の習慣の更新として扱う（設計A）
6. 各テーブルに `txn_id` を持たせる。値はアプリ発行のUUID（`set_config`）で、未設定時はDBのトランザクションIDで代替
7. バージョンは、サーバーの返した値や再取得で置き換える。画面で+1しない
