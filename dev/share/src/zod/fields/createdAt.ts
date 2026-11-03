import { z } from 'zod'

/** 作成日時（ISO 8601の日時文字列） */
export const createdAtField = z.iso.datetime({ offset: true, error: '日時はISO 8601形式で指定してください' })
/** 作成日時の型 */
export type CreatedAt = z.infer<typeof createdAtField>
