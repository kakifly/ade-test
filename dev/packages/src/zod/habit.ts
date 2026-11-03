import { z } from 'zod'
import { createdAtField } from './fields/createdAt'
import { dateField } from './fields/date'
import { habitIdField } from './fields/habitId'
import { habitNameField } from './fields/habitName'
import { rowVersionField } from './fields/rowVersion'
import { streakField } from './fields/streak'

/** 追加フォーム（zodResolver で使う） */
export const createHabitFormSchema = z.object({ name: habitNameField })
export type CreateHabitForm = z.infer<typeof createHabitFormSchema>

/** POST /habits の入力（フォームと同一） */
export const createHabitRequestSchema = createHabitFormSchema
export type CreateHabitRequest = z.infer<typeof createHabitRequestSchema>

/** 習慣のレスポンス */
export const habitResponseSchema = z.object({
  id: habitIdField,
  name: habitNameField,
  createdAt: createdAtField,
  checkedToday: z.boolean(),
  streak: streakField,
  rowVersion: rowVersionField,
})
export type HabitResponse = z.infer<typeof habitResponseSchema>

/** チェック操作のパスパラメータ */
export const toggleCheckParamsSchema = z.object({ id: habitIdField, date: dateField })
export type ToggleCheckParams = z.infer<typeof toggleCheckParamsSchema>

/** 更新・削除の対象バージョン（クエリ文字列の数字を数値へ変換する） */
export const versionQuerySchema = z.object({
  rowVersion: z
    .string({ error: 'バージョンを指定してください' })
    .regex(/^\d+$/, 'バージョンは整数で指定してください')
    .transform(Number)
    .pipe(rowVersionField),
})
export type VersionQuery = z.infer<typeof versionQuerySchema>

/** 更新後の新しいバージョン */
export const versionResponseSchema = z.object({ rowVersion: rowVersionField })
export type VersionResponse = z.infer<typeof versionResponseSchema>
