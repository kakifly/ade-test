#!/usr/bin/env bash
# Claude Code の PostToolUse hook: ファイル編集のあとに型チェックと単体テストを実行する。
# 失敗したときは、結果の末尾を標準エラーに出して終了コード2で終わる（Claudeに失敗が伝わる）。
cd "$(dirname "$0")/../.." || exit 1

out=$(mktemp)
trap 'rm -f "$out"' EXIT

if ! { bun run typecheck && bun run test:unit; } >"$out" 2>&1; then
  echo "検証に失敗しました（typecheck または test:unit）。末尾:" >&2
  tail -n 30 "$out" >&2
  exit 2
fi
