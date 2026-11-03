import type { HabitResponse } from '@habit/zod'

/**
 * 409（バージョン競合）のあと、再取得した最新の習慣を見て次の動きを決める。
 * 望む状態にすでになっていれば 'already'（成功として扱う）、なっていなければ 'retry'（メッセージを出す）。
 * 一覧の checkedToday は「今日」の状態なので、今日の操作にだけ使える。
 *
 * @param desired 操作で望んだチェックの状態（true=付ける、false=外す）
 * @param latest 再取得した最新の習慣
 * @param _date 操作した日付（現状は判定に使わない）
 * @returns 'already' なら成功として扱い、'retry' ならメッセージを出してやり直してもらう
 */
export function resolveToggleConflict(desired: boolean, latest: HabitResponse, _date: string): 'already' | 'retry' {
  // 冪等性: すでに望む状態なら、やり直さず成功とみなす
  return latest.checkedToday === desired ? 'already' : 'retry'
}
