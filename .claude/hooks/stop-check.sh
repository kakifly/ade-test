#!/usr/bin/env bash
# Claude Code の Stop hook: Claudeが作業を終える直前に、全体を検証する。
# Edit/Write 以外（シェルのコマンドなど）で変更されたファイルも、ここで検証できる。
# 失敗したときは、結果の末尾を標準エラーに出して終了コード2で終わる（Claudeは作業を続けて直す）。
cd "$(dirname "$0")/../.." || exit 1

# 直前にこのhookで止めた後の再実行なら、止めずに終える（無限ループを防ぐ）
if grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' <(cat); then
  exit 0
fi

# コードに変更がなければ、検証しない（会話だけのターンで毎回動かさない）
if [ -z "$(git status --porcelain -- dev package.json bun.lock 2>/dev/null)" ]; then
  exit 0
fi

out=$(mktemp)
trap 'rm -f "$out"' EXIT

# CLAUDE.md の「タスク完了の条件」と同じ内容: 型チェック → テストDBの初期化 → すべてのテスト
if ! { bun run verify; } >"$out" 2>&1; then
  echo "完了前の検証に失敗しました（typecheck または db:apply:test または bun test）。直してから終えてください。末尾:" >&2
  tail -n 30 "$out" >&2
  exit 2
fi
