import { z } from 'zod'

/** 習慣ID（UUID形式） */
export const habitIdField = z.uuid({ error: '習慣IDの形式が正しくありません' })
/** 習慣IDの型 */
export type HabitId = z.infer<typeof habitIdField>
