#!/usr/bin/env bash
# 作業領域（git worktree）を、専用のテスト用・e2e用DBとあわせて作る・消す・一覧する。
#   wt.sh create <名前>  : <本体>-worktrees/<名前>/ にブランチ feature/<名前> の作業領域を作り、専用DBと .env を用意する
#   wt.sh env <名前>     : 既にある作業領域に、専用DBと .env を用意する（手で作った作業領域用）
#   wt.sh remove <名前>  : 作業領域を消し、専用DBを削除し、マージ済みならブランチも消す
#   wt.sh list           : 作業領域と専用DBの一覧を出す（作業領域が無いDBは「残骸」と示す）
# 専用DB: habit_app_test_<名前>、habit_app_e2e_<名前>（名前の - は _ にする）。開発用DBは共有のまま。
# 作業領域は、本体のリポジトリの外（隣の <本体のフォルダ名>-worktrees/）に置く。環境変数 WT_ROOT で置き場所を変えられる。
# 接続情報（パスワードを含む）は、画面にも引数にも出さない。DBの作成は1か所（create_dbs）にまとめてある。
set -euo pipefail

# ================================================================
# 1. 共通の準備
#    本体のリポジトリのルートと、元になる .env（共有DBの接続先）を決めて読み込む
# ================================================================
main_root="$(cd "$(git rev-parse --path-format=absolute --git-common-dir)/.." && pwd)"
# 作業領域を置く親フォルダ。既定は本体の隣（例: ade-test の隣の ade-test-worktrees）。本体の中には置かない
wt_root="${WT_ROOT:-${main_root}-worktrees}"
base_env="$main_root/dev/apps/src/api/.env"
[ -f "$base_env" ] || { echo "$base_env がありません" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
. "$base_env"
set +a
shared_test="${TEST_DATABASE_URL:?TEST_DATABASE_URL が未設定です}"
case "$shared_test" in
  */habit_app_test) ;;
  *) echo "TEST_DATABASE_URL が habit_app_test ではありません。元の .env を確認してください" >&2; exit 1 ;;
esac
server="${shared_test%/habit_app_test}"

# DB管理用の接続（共有のテスト用DBにつなぎ、CREATE/DROP DATABASE だけに使う）
admin() { psql "$shared_test" -v ON_ERROR_STOP=1 -q -At "$@"; }

# ================================================================
# 2. 名前の検証と、名前から決まる値
#    名前は、フォルダ名・ブランチ名・DB名に使うので、小文字・数字・ハイフンに限る
#    DB名は63文字までなので、名前は40文字までにする
# ================================================================
validate_name() {
  if ! [[ "${1:-}" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]]; then
    echo "名前は、小文字・数字・ハイフンで、40文字以内にしてください（例: data-schema）" >&2
    exit 1
  fi
}
slug_of() { echo "${1//-/_}"; }

# ================================================================
# 3. 専用DBの作成・削除
#    マスタが大きくなったら、ここを CREATE DATABASE ... TEMPLATE に切り替えると速くなる
# ================================================================
create_dbs() {
  local slug="$1" db
  # 既にあるDBは作り直さない（env を何度実行しても、エラーにならない）。CREATE DATABASE は IF NOT EXISTS が無いので \gexec で条件付きにする
  for db in "habit_app_test_${slug}" "habit_app_e2e_${slug}"; do
    printf "SELECT 'CREATE DATABASE %s' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '%s')\\gexec\n" "$db" "$db" | admin >/dev/null
  done
}
drop_dbs() {
  local slug="$1"
  admin -c "DROP DATABASE IF EXISTS habit_app_test_${slug} WITH (FORCE);" -c "DROP DATABASE IF EXISTS habit_app_e2e_${slug} WITH (FORCE);"
}

# アプリのポートの割り当て。作業領域ごとに「スロット」（1〜99）を1つ持ち、ポートはスロットの分だけずらす。
#   API: 3000+n、画面: 5173+n、e2eのAPI: 3100+n、e2eの画面: 5273+n（本体は n=0 で 3000 / 5173 / 3100 / 5273）
# 他の作業領域が使っているスロットを避け、空いている最小の番号を選ぶ。既に持っている作業領域は、同じ番号を保つ。
port_slot_for() {
  local dir="$1" f used cur
  cur="$(sed -n 's/^PORT_SLOT=//p' "$dir/dev/apps/src/api/.env" 2>/dev/null | head -1)"
  # 既に割り当て済みなら、そのまま使う
  if [ -n "$cur" ]; then echo "$cur"; return; fi
  used="$(for e in "$wt_root"/*/dev/apps/src/api/.env; do [ -f "$e" ] && sed -n 's/^PORT_SLOT=//p' "$e"; done)"
  for n in $(seq 1 99); do
    if ! grep -qx "$n" <<<"$used"; then echo "$n"; return; fi
  done
  echo "ポートのスロットが空いていません（99個まで）" >&2; exit 1
}

# 作業領域の .env を作る。開発用DBは共有、テスト用とe2e用は専用にする。ポートはスロットで分ける（接続情報は表示しない）
write_env() {
  local dir="$1" slug="$2" f n
  f="$dir/dev/apps/src/api/.env"
  n="$(port_slot_for "$dir")"
  {
    printf 'DATABASE_URL=%s\n' "${DATABASE_URL:?DATABASE_URL が未設定です}"
    printf 'TEST_DATABASE_URL=%s/habit_app_test_%s\n' "$server" "$slug"
    printf 'E2E_DATABASE_URL=%s/habit_app_e2e_%s\n' "$server" "$slug"
    printf 'PORT_SLOT=%s\n' "$n"
    printf 'API_PORT=%s\nWEB_PORT=%s\n' "$((3000 + n))" "$((5173 + n))"
    printf 'E2E_API_PORT=%s\nE2E_WEB_PORT=%s\n' "$((3100 + n))" "$((5273 + n))"
  } > "$f"
  chmod 600 "$f"
  echo "ポート: API $((3000 + n))、画面 $((5173 + n))、e2e の API $((3100 + n))、e2e の画面 $((5273 + n))"
}

# ================================================================
# 4. サブコマンド
# ================================================================
cmd="${1:-}"
case "$cmd" in
  create)
    name="${2:-}"; validate_name "$name"; slug="$(slug_of "$name")"
    dir="$wt_root/$name"
    [ ! -e "$dir" ] || { echo "$dir は既にあります" >&2; exit 1; }
    # 先に専用DBを作り、作業領域の作成に失敗したら削除して元に戻す
    create_dbs "$slug"
    if ! git -C "$main_root" worktree add -q "$dir" -b "feature/$name" main; then
      drop_dbs "$slug"; exit 1
    fi
    write_env "$dir" "$slug"
    pnpm --dir "$dir/dev" install >/dev/null
    echo "作成しました: $dir（ブランチ feature/$name、専用DB habit_app_test_$slug / habit_app_e2e_$slug）"
    ;;
  env)
    name="${2:-}"; validate_name "$name"; slug="$(slug_of "$name")"
    dir="$wt_root/$name"
    [ -d "$dir" ] || { echo "$dir がありません" >&2; exit 1; }
    create_dbs "$slug"
    write_env "$dir" "$slug"
    echo "専用DBと .env を用意しました: $dir（habit_app_test_$slug / habit_app_e2e_$slug）"
    ;;
  remove)
    name="${2:-}"; validate_name "$name"; slug="$(slug_of "$name")"
    dir="$wt_root/$name"
    # 未コミットの変更があると、ここで止まる（強制はしない）。DBは、作業領域を消せてから削除する
    git -C "$main_root" worktree remove "$dir"
    drop_dbs "$slug"
    # マージ済みのブランチだけ消す（未マージなら残す）
    git -C "$main_root" branch -d "feature/$name" || echo "ブランチ feature/$name はマージされていないので残しました" >&2
    echo "削除しました: $dir と専用DB"
    ;;
  list)
    git -C "$main_root" worktree list
    echo "--- 専用DB"
    admin -c "SELECT datname FROM pg_database WHERE datname ~ '^habit_app_(test|e2e)_' ORDER BY datname;" | while read -r db; do
      slug="${db#habit_app_test_}"; slug="${slug#habit_app_e2e_}"
      # 作業領域のフォルダが無いDBは、消し忘れの残骸
      if ls -d "$wt_root/"* 2>/dev/null | sed 's#.*/##; s#-#_#g' | grep -qx "$slug"; then echo "$db"; else echo "$db  （残骸: 作業領域がありません）"; fi
    done
    ;;
  *)
    echo "使い方: wt.sh create|env|remove <名前> / wt.sh list" >&2; exit 1 ;;
esac
