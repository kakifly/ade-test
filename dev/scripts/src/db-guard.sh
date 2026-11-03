#!/usr/bin/env bash
# DBの安全確認。source して使う。
#   assert_dedicated_db <作業ディレクトリのルート> <接続先URL>
# 作業領域（git worktree）から、全作業領域で共有のテスト用DB・e2e用DBに向けて、
# テーブルの初期化をしようとしたら中止する（別の作業領域のテストを壊さないため）。
# 作業領域専用のDB（habit_app_test_<名前>、habit_app_e2e_<名前>）は許可する。
# 作業領域かどうかは、置き場所（パス）ではなく git の情報で判定する（作業領域をどこに置いても効くようにするため）。
# 中止のメッセージに、接続先のURL（パスワードを含みうる）は出さない。

# 作業ディレクトリが、本体ではなく作業領域（git worktree）かどうかを判定する。
# 作業領域なら 0 を返す。git で判定できないとき（git の管理外など）も、安全側に倒して 0（作業領域）を返す。
is_linked_worktree() {
  local root="$1" git_dir common_dir
  # git の hook の中では GIT_DIR などが設定されていて、判定が実行中のリポジトリに引きずられるので、外して実行する
  git_dir="$(env -u GIT_DIR -u GIT_COMMON_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE git -C "$root" rev-parse --path-format=absolute --git-dir 2>/dev/null)" || return 0
  common_dir="$(env -u GIT_DIR -u GIT_COMMON_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE git -C "$root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || return 0
  # 作業領域では git-dir が <本体>/.git/worktrees/<名前> になり、本体の git-common-dir と異なる
  [ "$git_dir" != "$common_dir" ]
}

assert_dedicated_db() {
  local root="$1" url="$2" db
  # 接続パラメータ（?以降）を除いて、DB名だけを取り出す
  db="${url%%\?*}"
  db="${db##*/}"
  if is_linked_worktree "$root"; then
    # 作業領域の中では、共有のDB名を使えない
    case "$db" in
      habit_app_test|habit_app_e2e)
        echo "作業領域では、全作業領域で共有の DB（${db}）を初期化できません。wt.sh create で作った専用のDB（${db}_<名前>）を、.env に設定してください。" >&2
        return 1
        ;;
    esac
  fi
  return 0
}
