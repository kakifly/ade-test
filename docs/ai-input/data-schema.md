# データスキーマ定義（習慣チェックアプリ）

本システムで使うデータを、データスキーマ（データドメイン）として定義する。テーブルの列は、必ずいずれかのデータスキーマに属する。
書式は `docs/ai-input/template/【template】テーブル設計書.xlsm` と `【template】データスキーマ.xlsx` に合わせる。

- **編集のルール**: 人は Excel（`docs/reference/データスキーマ.xlsx`）を編集し、AI は本書（md）を編集する。人が Excel を編集したときは、人が「mdを更新して」と指示し、AI が Excel の内容を本書に反映する。AI が本書を更新したら、Excel に再生成する（`pnpm run docs:data-schema`）。Excel に未コミットの変更があるときは、再生成が中止される（人の編集を消さないため）
- テーブルの物理定義（型、制約）の正本は DDL（`dev/share/src/db/ddl/`）。本書の「テーブル定義」は DDL と一致させる（テストで確認する）
- 文字列の桁数は文字数。「半角換算」は、全角を2として数えた最大の桁数（`文字列` は桁数×2、それ以外は桁数と同じ）

## 1. 型の分類

| 型 | 備考 | DBの型 |
|---|---|---|
| フラグ | 0 or 1（APIでは真偽値） | boolean |
| 数値 | 整数 | bigint、integer |
| 文字列(半)(固) | 半角文字列（固定長） | uuid |
| 文字列(半) | 半角文字列 | text |
| 文字列 | 文字列（全角を含む） | varchar |
| 日付 | 日付、日時 | date、timestamptz |

## 2. データスキーマ一覧

| No | 分類 | データドメイン名 | データスキーマ | 型 | 桁数 | 説明 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | 習慣 | 習慣ID | d_habitid | 文字列(半)(固) | 36 | 習慣を一意に特定するID（UUID。ハイフン付き） | 画面・APIでは `habitIdField` |
| 2 | 習慣 | 習慣名 | d_habitname | 文字列 | 50 | 習慣の名前。前後の空白を除去し、1文字以上50文字以内。同名は登録できない | 画面・APIでは `habitNameField` |
| 3 | 習慣 | チェック日 | d_checkdate | 日付 | - | 習慣を実施した日（YYYY-MM-DD）。サーバーのUTC日付の前後1日以内だけ受け付ける | 画面・APIでは `dateField` |
| 4 | 習慣 | 連続日数 | d_streak | 数値 | 9 | 今日（未チェックなら昨日）から遡った、連続達成日数（0以上） | DBには保存しない。APIが計算する（`streakField`） |
| 5 | 習慣 | 今日チェック済みフラグ | d_checkedtodayflg | フラグ | 1 | 0:未チェック、1:チェック済み | DBには保存しない。APIでは真偽値（`checkedToday`） |
| 6 | システム | 作成日時 | d_createdat | 日付 | - | 行を作成した日時（タイムゾーン付き、ISO 8601） | `createdAtField` |
| 7 | システム | 行バージョン | d_rowversion | 数値 | 19 | 楽観的ロック用。1から始まり、更新のたびにDBのトリガが+1する。アプリは増減しない | `rowVersionField` |
| 8 | システム | トランザクションID | d_txnid | 文字列(半) | - | 最後に更新したトランザクションのID（可変長）。DBのトリガが記録する | |
| 9 | システム | エラーコード | d_errorcode | 文字列(半) | 20 | APIが返すエラーの種類。VALIDATION_ERROR、DUPLICATE_NAME、NOT_FOUND、DATE_NOT_ALLOWED、VERSION_CONFLICT、INTERNAL_ERROR | DBには保存しない（`errorCodeField`） |
| 10 | システム | エラーメッセージ | d_errormsg | 文字列 | - | 利用者に見せるエラーの文章 | DBには保存しない |

## 3. テーブル一覧

| NO | テーブル名 | 名称 | 属性 | 履歴 | 排他 | 説明 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | habits | 習慣 | トランザクション | × | ○ | 利用者が登録した習慣を管理する | 削除すると、チェックも削除される |
| 2 | habit_checks | 習慣チェック | トランザクション | × | ○ | 習慣を実施した日を管理する（習慣と日付で一意） | 付与・解除は、親の習慣の行バージョンで制御する |

履歴: ○ = 履歴テーブルを持つ。本システムは履歴テーブルを持たない。排他: ○ = 行バージョンによる楽観的ロック。

## 4. テーブル定義

列の見方: INDEX の `P` は主キー、数字は主キー以外のインデックスの順番。N の ○ は NOT NULL。UNIQUE の数字は一意制約の番号。DEF は既定値。

### 4.1 habits

- テーブルID: habits
- テーブル名: 習慣
- 属性: トランザクション
- 件数見込（年間）: 100

| No | 名称 | 英名 | 型 | 桁 | データスキーマ | INDEX | N | UNIQUE | DEF | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 習慣ID | id | uuid | - | d_habitid | P | ○ | | | アプリが採番する（UUID） |
| 2 | 習慣名 | name | varchar | 50 | d_habitname | | ○ | 1 | | 一意制約 habits_name_key |
| 3 | 作成日時 | created_at | timestamptz | - | d_createdat | | ○ | | | |
| 4 | 行バージョン | row_version | bigint | - | d_rowversion | | ○ | | 1 | トリガ set_row_meta が設定する |
| 5 | トランザクションID | txn_id | text | - | d_txnid | | | | | トリガ set_row_meta が設定する |

### 4.2 habit_checks

- テーブルID: habit_checks
- テーブル名: 習慣チェック
- 属性: トランザクション
- 件数見込（年間）: 36500

| No | 名称 | 英名 | 型 | 桁 | データスキーマ | INDEX | N | UNIQUE | DEF | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 習慣ID | habit_id | uuid | - | d_habitid | P | ○ | | | habits.id への外部キー（削除時にチェックも削除） |
| 2 | チェック日 | check_date | date | - | d_checkdate | P | ○ | | | 習慣IDと合わせて主キー。同じ日の二重チェックを防ぐ |
| 3 | 行バージョン | row_version | bigint | - | d_rowversion | | ○ | | 1 | トリガ set_row_meta が設定する |
| 4 | トランザクションID | txn_id | text | - | d_txnid | | | | | トリガ set_row_meta が設定する |
