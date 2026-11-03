-- 習慣チェックアプリの初期DDL。再実行しても壊れないように書く。

-- 全テーブル共通のトリガ関数。row_version と txn_id はここだけが書く（アプリの値は無視）
CREATE OR REPLACE FUNCTION set_row_meta() RETURNS trigger AS $$
DECLARE
  v_txn text;
BEGIN
  -- アプリ発行のtxn_id（set_config）を優先し、未設定または空ならDBのトランザクションIDで代替する
  v_txn := NULLIF(current_setting('app.txn_id', true), '');
  IF v_txn IS NULL THEN
    v_txn := pg_current_xact_id()::text;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- 新規行は常に1から始める（アプリが指定した値は無視）
    NEW.row_version := 1;
  ELSE
    -- 更新時は旧バージョン+1に強制する（アプリが指定した値は無視）
    NEW.row_version := OLD.row_version + 1;
  END IF;
  NEW.txn_id := v_txn;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS habits (
  id           uuid         PRIMARY KEY,
  name         varchar(50)  NOT NULL,
  created_at   timestamptz  NOT NULL,
  row_version  bigint       NOT NULL DEFAULT 1,
  txn_id       text,
  CONSTRAINT habits_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS habit_checks (
  habit_id     uuid    NOT NULL REFERENCES habits (id) ON DELETE CASCADE,
  check_date   date    NOT NULL,
  row_version  bigint  NOT NULL DEFAULT 1,
  txn_id       text,
  PRIMARY KEY (habit_id, check_date)
);

-- トリガは作り直す。habits は INSERT 時の txn_id 記録も同じ関数で行う
DROP TRIGGER IF EXISTS habits_set_row_meta ON habits;
CREATE TRIGGER habits_set_row_meta
  BEFORE INSERT OR UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION set_row_meta();

DROP TRIGGER IF EXISTS habit_checks_set_row_meta ON habit_checks;
CREATE TRIGGER habit_checks_set_row_meta
  BEFORE INSERT OR UPDATE ON habit_checks
  FOR EACH ROW EXECUTE FUNCTION set_row_meta();
