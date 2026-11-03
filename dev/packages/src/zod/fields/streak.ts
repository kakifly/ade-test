import { z } from 'zod'

/** 連続日数（0以上の整数） */
export const streakField = z
  .number({ error: '連続日数は数値で指定してください' })
  .int('連続日数は整数で指定してください')
  .min(0, '連続日数は0以上で指定してください')
export type Streak = z.infer<typeof streakField>
