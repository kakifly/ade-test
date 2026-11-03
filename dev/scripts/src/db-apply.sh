#!/usr/bin/env bash
# DDLを順に適用する。
#   db-apply.sh        : DATABASE_URL（habit_app_dev）に適用
#   db-apply.sh test   : TEST_DATABASE_URL（habit_app_test）を初期化してから適用
#   db-apply.sh e2e    : E2E_DATABASE_URL（habit_app_e2e）を初期化してから適用
set -euo pipefail

# ================================================================
# 1. パスの解決と接続情報の読み込み
#    環境変数が無いときだけ、api の .env を読む（値は表示しない）
# ================================================================
root="$(cd "$(dirname "$0")/../../.." && pwd)"
api="$root/dev/apps/src/api"

if [ -f "$api/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$api/.env"
  set +a
fi

# ================================================================
# 2. 適用先DBの決定
#    dev は DATABASE_URL、test は TEST_DATABASE_URL、e2e は E2E_DATABASE_URL を使う。
#    test と e2e のときは、適用前に初期化する
# ================================================================
mode="${1:-dev}"
case "$mode" in
  test) url="${TEST_DATABASE_URL:?TEST_DATABASE_URL が未設定です}" ;;
  e2e)  url="${E2E_DATABASE_URL:?E2E_DATABASE_URL が未設定です}" ;;
  *)    url="${DATABASE_URL:?DATABASE_URL が未設定です}" ;;
esac
if [ "$mode" = "test" ] || [ "$mode" = "e2e" ]; then
  # 作業領域から、共有のテスト用・e2e用DBを初期化しない
  # shellcheck disable=SC1091
  . "$(dirname "$0")/db-guard.sh"
  assert_dedicated_db "$root" "$url" || exit 1
  # テスト用・e2e用のDBは毎回まっさらにする（publicスキーマの所有者ではないため、このアプリのオブジェクトだけを消す）
  psql "$url" -v ON_ERROR_STOP=1 -q -c 'DROP TABLE IF EXISTS habit_checks, habits CASCADE; DROP FUNCTION IF EXISTS set_row_meta() CASCADE;'
fi

# ================================================================
# 3. DDLの適用
#    番号順（ファイル名順）に、1ファイルずつ適用する。失敗したらそこで止める
# ================================================================
for f in "$root/dev/share/src/db/ddl"/*.sql; do
  echo "適用: $(basename "$f")"
  psql "$url" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "完了"
