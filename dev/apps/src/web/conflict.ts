import type { HabitResponse } from '@habit/zod'

/**
 * 409（バージョン競合）のあと、再取得した最新の習慣を見て次の動きを決める。
 * 望む状態にすでになっていれば 'already'（成功として扱う）、なっていなければ 'retry'（メッセージを出す）。
 * date は操作した日付。一覧の checkedToday は「今日」の状態なので、今日の操作にだけ使える。
 */
export function resolveToggleConflict(desired: boolean, latest: HabitResponse, _date: string): 'already' | 'retry' {
  // 冪等性: すでに望む状態なら、やり直さず成功とみなす
  return latest.checkedToday === desired ? 'already' : 'retry'
}
