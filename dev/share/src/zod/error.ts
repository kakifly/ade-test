import { z } from 'zod'

/** APIが返すエラーコードの一覧 */
export const errorCodes = [
  'VALIDATION_ERROR',
  'DUPLICATE_NAME',
  'NOT_FOUND',
  'DATE_NOT_ALLOWED',
  'VERSION_CONFLICT',
  'INTERNAL_ERROR',
] as const

/** エラーコード（`errorCodes` のいずれか） */
export const errorCodeField = z.enum(errorCodes, { error: 'エラーコードが正しくありません' })
/** エラーコードの型 */
export type ErrorCode = z.infer<typeof errorCodeField>

/** エラー応答 */
export const errorResponseSchema = z.object({
  /** エラーの内容 */
  error: z.object({
    /** エラーコード */
    code: errorCodeField,
    /** 利用者に見せるメッセージ */
    message: z.string(),
  }),
})
/** エラー応答の型 */
export type ErrorResponse = z.infer<typeof errorResponseSchema>
