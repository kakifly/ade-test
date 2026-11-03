#!/usr/bin/env bash
# 画面の受入確認を、e2e専用のDB（habit_app_e2e）で実行する。
#   1. e2e用DBを初期化してDDLを適用する
#   2. その DB につないだ API と、画面を、専用のポートで起動する
#   3. accept.mjs を実行し、終わったら起動したプロセスを止める
# 開発用DB（habit_app_dev）には触れない。
set -euo pipefail

# ================================================================
# 1. パスの解決と接続情報の読み込み
#    環境変数が無いときだけ、api の .env を読む（値は表示しない）
# ================================================================
root="$(cd "$(dirname "$0")/../../../.." && pwd)"
api="$root/dev/apps/src/api"
if [ -f "$api/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$api/.env"
  set +a
fi
e2e_url="${E2E_DATABASE_URL:?E2E_DATABASE_URL が未設定です}"

# ================================================================
# 2. 接続先の安全確認
#    e2e用以外のDBを消さないよう、DB名が habit_app_e2e のときだけ進める
# ================================================================
case "$e2e_url" in
  */habit_app_e2e) ;;
  *) echo "E2E_DATABASE_URL が habit_app_e2e ではありません。中止します" >&2; exit 1 ;;
esac

# ================================================================
# 3. e2e用DBの初期化と、画面のビルド
# ================================================================
bash "$root/dev/scripts/src/db-apply.sh" e2e
(cd "$root/dev" && pnpm run build:web >/dev/null)

# ================================================================
# 4. API と画面の起動
#    開発用の起動（3000 / 5173）と重ならないよう、別のポートを使う。終了時に必ず止める
# ================================================================
api_port="${E2E_API_PORT:-3100}"
web_port="${E2E_WEB_PORT:-5273}"
pids=()
cleanup() { for p in "${pids[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT

(cd "$api" && DATABASE_URL="$e2e_url" PORT="$api_port" exec bun main.ts) >/dev/null 2>&1 &
pids+=($!)
(cd "$root/dev/apps/src/web" && PORT="$web_port" API_URL="http://localhost:$api_port" exec bun serve.ts) >/dev/null 2>&1 &
pids+=($!)

# 両方が応答するまで待つ（最大30秒）
for _ in $(seq 1 60); do
  if curl -fs "http://localhost:$api_port/api/habits?today=2000-01-01" >/dev/null 2>&1 && curl -fs "http://localhost:$web_port/" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

# ================================================================
# 5. 受入確認の実行
#    終了コードは accept.mjs のもの（すべて成功なら0）をそのまま返す
# ================================================================
BASE_URL="http://localhost:$web_port" API_URL="http://localhost:$api_port" node "$root/dev/scripts/src/e2e/accept.mjs"
