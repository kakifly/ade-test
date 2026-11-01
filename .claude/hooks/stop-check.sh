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
if [ -z "$(git status --porcelain -- dev package.json pnpm-lock.yaml 2>/dev/null)" ]; then
  exit 0
fi

out=$(mktemp)
trap 'rm -f "$out"' EXIT

# CLAUDE.md の「タスク完了の条件」と同じ内容: 型チェック → テストDBの初期化 → すべてのテスト
if bun run verify >"$out" 2>&1; then
  .claude/hooks/loop-record.sh stop pass
  exit 0
fi

n=$(.claude/hooks/loop-record.sh stop fail "$out")
# 同じ失敗が3回続いたら、止めずに終わらせる（無限に直させない）。Claudeはユーザーに報告する
if [ "${n:-1}" -ge 3 ]; then
  echo "【歯止め】同じ失敗が${n}回続いたため、これ以上は止めません。失敗したテスト名・期待値と実際の値・試したことをユーザーに報告してください。" >&2
  exit 0
fi
echo "完了前の検証に失敗しました（同じ失敗の連続: ${n}回目）。直してから終えてください。末尾:" >&2
tail -n 30 "$out" >&2
exit 2
