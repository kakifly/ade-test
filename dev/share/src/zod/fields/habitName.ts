import { z } from 'zod'

/** 習慣名（前後の空白を除去 → 1文字以上 → 50文字以内） */
export const habitNameField = z
  .string({ error: '習慣名を入力してください' })
  .trim()
  .min(1, '習慣名を入力してください')
  .max(50, '習慣名は50文字以内で入力してください')
/** 習慣名の型 */
export type HabitName = z.infer<typeof habitNameField>
