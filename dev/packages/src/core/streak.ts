import { addDays } from './dates.ts';

/**
 * 連続達成日数を数える。
 * 今日が実施済みなら今日から、未実施なら昨日から遡り、途切れるまでの日数を返す。
 * 未来日付は数えず、重複と順序の影響も受けない。
 */
export function calcStreak(checked: readonly string[], today: string): number {
  const days = new Set(checked);
  // 今日が未実施でも、昨日まで続いていれば連続を維持する（今日チェックすれば+1される）
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  // 1日でも空いたらそこで止める。未来日付は遡る範囲に入らないので数えない
  while (days.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}
