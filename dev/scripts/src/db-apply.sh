#!/usr/bin/env bash
# DDLを順に適用する。
#   db-apply.sh        : DATABASE_URL（habit_app_dev）に適用
#   db-apply.sh test   : TEST_DATABASE_URL（habit_app_test）を初期化してから適用
set -euo pipefail

root="$(cd "$(dirname "$0")/../../.." && pwd)"
api="$root/dev/apps/src/api"

# 環境変数が無いときは api の .env を読み込む
if [ -f "$api/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$api/.env"
  set +a
fi

mode="${1:-dev}"
if [ "$mode" = "test" ]; then
  url="${TEST_DATABASE_URL:?TEST_DATABASE_URL が未設定です}"
  # テスト用DBは毎回まっさらにする（publicスキーマの所有者ではないため、このアプリのオブジェクトだけを消す）
  psql "$url" -v ON_ERROR_STOP=1 -q -c 'DROP TABLE IF EXISTS habit_checks, habits CASCADE; DROP FUNCTION IF EXISTS set_row_meta() CASCADE;'
else
  url="${DATABASE_URL:?DATABASE_URL が未設定です}"
fi

# 番号順（ファイル名順）に適用する
for f in "$api"/db/ddl/*.sql; do
  echo "適用: $(basename "$f")"
  psql "$url" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "完了"
