#!/usr/bin/env bash
# DBの安全確認。source して使う。
#   assert_dedicated_db <作業ディレクトリのルート> <接続先URL>
# 作業領域（.worktrees/ の中）から、全作業領域で共有のテスト用DB・e2e用DBに向けて、
# テーブルの初期化をしようとしたら中止する（別の作業領域のテストを壊さないため）。
# 作業領域専用のDB（habit_app_test_<名前>、habit_app_e2e_<名前>）は許可する。
# 中止のメッセージに、接続先のURL（パスワードを含みうる）は出さない。

assert_dedicated_db() {
  local root="$1" url="$2" db
  # 接続パラメータ（?以降）を除いて、DB名だけを取り出す
  db="${url%%\?*}"
  db="${db##*/}"
  case "$root" in
    */.worktrees/*)
      # 作業領域の中では、共有のDB名を使えない
      case "$db" in
        habit_app_test|habit_app_e2e)
          echo "作業領域では、全作業領域で共有の DB（${db}）を初期化できません。wt.sh create で作った専用のDB（${db}_<名前>）を、.env に設定してください。" >&2
          return 1
          ;;
      esac
      ;;
  esac
  return 0
}
