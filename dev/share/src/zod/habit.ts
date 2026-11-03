import { z } from 'zod'
import { createdAtField } from './fields/createdAt'
import { dateField } from './fields/date'
import { habitIdField } from './fields/habitId'
import { habitNameField } from './fields/habitName'
import { rowVersionField } from './fields/rowVersion'
import { streakField } from './fields/streak'

/** 追加フォーム（zodResolver で使う） */
export const createHabitFormSchema = z.object({
  /** 習慣名（前後の空白を除去し、1〜50文字） */
  name: habitNameField,
})
/** 追加フォームの入力値の型 */
export type CreateHabitForm = z.infer<typeof createHabitFormSchema>

/** POST /habits の入力（フォームと同一） */
export const createHabitRequestSchema = createHabitFormSchema
/** POST /habits の入力の型 */
export type CreateHabitRequest = z.infer<typeof createHabitRequestSchema>

/** 習慣のレスポンス */
export const habitResponseSchema = z.object({
  /** 習慣ID（UUID） */
  id: habitIdField,
  /** 習慣名 */
  name: habitNameField,
  /** 作成日時（ISO 8601） */
  createdAt: createdAtField,
  /** 今日チェック済みか */
  checkedToday: z.boolean(),
  /** 連続達成日数（サーバーが計算する） */
  streak: streakField,
  /** 行バージョン（更新・削除のときに、そのまま送り返す） */
  rowVersion: rowVersionField,
})
/** 習慣のレスポンスの型 */
export type HabitResponse = z.infer<typeof habitResponseSchema>

/** チェック操作のパスパラメータ */
export const toggleCheckParamsSchema = z.object({
  /** 対象の習慣ID */
  id: habitIdField,
  /** チェックする日付（`YYYY-MM-DD`） */
  date: dateField,
})
/** チェック操作のパスパラメータの型 */
export type ToggleCheckParams = z.infer<typeof toggleCheckParamsSchema>

/** 更新・削除の対象バージョン（クエリ文字列の数字を数値へ変換する） */
export const versionQuerySchema = z.object({
  /** 読んだときの行バージョン（クエリ文字列の数字を数値に変換して検証する） */
  rowVersion: z
    .string({ error: 'バージョンを指定してください' })
    .regex(/^\d+$/, 'バージョンは整数で指定してください')
    .transform(Number)
    .pipe(rowVersionField),
})
/** 更新・削除の対象バージョンの型 */
export type VersionQuery = z.infer<typeof versionQuerySchema>

/** 更新後の新しいバージョン */
export const versionResponseSchema = z.object({
  /** 更新後の行バージョン */
  rowVersion: rowVersionField,
})
/** 更新後のバージョンの型 */
export type VersionResponse = z.infer<typeof versionResponseSchema>
