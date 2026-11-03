import { z } from 'zod'

/** 日付（YYYY-MM-DD 形式で、実在する日付） */
export const dateField = z
  .string({ error: '日付の形式が正しくありません' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください')
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`)
      // 2/30 などは Date が繰り上げるため、元の文字列に戻せるかで実在を判定する
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    },
    '実在する日付を指定してください',
  )
/** 日付文字列の型 */
export type DateString = z.infer<typeof dateField>
