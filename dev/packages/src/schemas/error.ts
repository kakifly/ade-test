import { z } from 'zod'

export const errorCodes = [
  'VALIDATION_ERROR',
  'DUPLICATE_NAME',
  'NOT_FOUND',
  'DATE_NOT_ALLOWED',
  'VERSION_CONFLICT',
] as const

export const errorCodeField = z.enum(errorCodes, { error: 'エラーコードが正しくありません' })
export type ErrorCode = z.infer<typeof errorCodeField>

/** エラー応答 */
export const errorResponseSchema = z.object({
  error: z.object({ code: errorCodeField, message: z.string() }),
})
export type ErrorResponse = z.infer<typeof errorResponseSchema>
