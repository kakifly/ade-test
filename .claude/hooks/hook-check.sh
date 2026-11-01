#!/usr/bin/env bash
# Claude Code の PostToolUse hook: ファイル編集のあとに型チェックと単体テストを実行する。
# 失敗したときは、結果の末尾を標準エラーに出して終了コード2で終わる（Claudeに失敗が伝わる）。
# 失敗は loop-record.sh で記録し、同じ失敗が3回続いたら、直し方を変えて報告するよう促す。
cd "$(dirname "$0")/../.." || exit 1

out=$(mktemp)
trap 'rm -f "$out"' EXIT

if { pnpm run typecheck && pnpm run test:unit; } >"$out" 2>&1; then
  .claude/hooks/loop-record.sh post-edit pass
  exit 0
fi

n=$(.claude/hooks/loop-record.sh post-edit fail "$out")
echo "検証に失敗しました（typecheck または test:unit）。同じ失敗の連続: ${n}回目。末尾:" >&2
tail -n 30 "$out" >&2
if [ "${n:-1}" -ge 3 ]; then
  echo "【歯止め】同じ失敗が${n}回続いています。同じ直し方を続けず、原因を調べ直してください（superpowers:systematic-debugging）。直らなければ作業を止めて、失敗したテスト名・期待値と実際の値・試したことをユーザーに報告してください（CLAUDE.md「失敗が続くときの歯止め」）。" >&2
fi
exit 2
