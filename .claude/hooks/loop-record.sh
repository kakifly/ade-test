#!/usr/bin/env bash
# ループの記録: 検証の失敗を記録し、「同じ失敗が何回続いているか」を数える。
# 使い方: loop-record.sh <発生源> <fail|pass> [検証の出力ファイル]
#   fail のとき、連続回数を標準出力に出す（同じ失敗が続けば増え、違う失敗なら1に戻る）
#   pass のとき、連続回数をリセットする
# 記録先: .claude/loop/（git管理外）。failures.log に追記、state に直近の失敗の署名と回数を持つ。
dir="$(cd "$(dirname "$0")/../loop" && pwd)"
log="$dir/failures.log"
state="$dir/state"
source_name="${1:-unknown}"
status="${2:-fail}"
out_file="${3:-}"
now="$(date '+%Y-%m-%dT%H:%M:%S%z')"

if [ "$status" = "pass" ]; then
  # 失敗が続いていたなら、解消した記録を残してリセットする
  if [ -f "$state" ]; then
    read -r _ prev_count < "$state"
    echo "$now $source_name resolved after=$prev_count" >> "$log"
    rm -f "$state"
  fi
  exit 0
fi

# 失敗の署名: 失敗したテスト名の一覧（なければ出力の最後のerror行）のハッシュ
sig_src=""
if [ -n "$out_file" ] && [ -f "$out_file" ]; then
  sig_src="$(grep -E '^\(fail\)' "$out_file" | sed -E 's/ \[[0-9.]+m?s\]$//' | sort)"
  if [ -z "$sig_src" ]; then
    sig_src="$(grep -E 'error' "$out_file" | tail -n 1)"
  fi
fi
sig="$(printf '%s' "$sig_src" | sha1sum | cut -c1-8)"

count=1
if [ -f "$state" ]; then
  read -r prev_sig prev_count < "$state"
  # 前回と同じ失敗なら連続回数を増やす。違う失敗なら1から数え直す
  if [ "$prev_sig" = "$sig" ]; then
    count=$((prev_count + 1))
  fi
fi
echo "$sig $count" > "$state"
echo "$now $source_name fail sig=$sig streak=$count" >> "$log"
echo "$count"
