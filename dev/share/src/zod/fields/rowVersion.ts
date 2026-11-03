import { z } from 'zod'

/** 行バージョン（1以上の整数。楽観的ロック用。画面は増減しない） */
export const rowVersionField = z
  .number({ error: 'バージョンは数値で指定してください' })
  .int('バージョンは整数で指定してください')
  .min(1, 'バージョンは1以上で指定してください')
/** 行バージョンの型 */
export type RowVersion = z.infer<typeof rowVersionField>
