import { z } from 'zod'

/** 顧客名（前後の空白を除去 → 1文字以上 → 30文字以内） */
export const customerField = z
  .string({ error: '顧客名を入力してください' })
  .trim()
  .min(1, '顧客名を入力してください')
  .max(30, '顧客名は30文字以内で入力してください')

/** 品名（前後の空白を除去 → 1文字以上 → 30文字以内） */
export const itemNameField = z
  .string({ error: '品名を入力してください' })
  .trim()
  .min(1, '品名を入力してください')
  .max(30, '品名は30文字以内で入力してください')

/** 数量（1〜99の整数。未入力・数値以外は同じメッセージにする） */
export const quantityField = z
  .number({ error: '数量を入力してください' })
  .int('数量は整数で入力してください')
  .min(1, '数量は1以上で入力してください')
  .max(99, '数量は99以下で入力してください')

/** 注文明細（1データの中の1行） */
export const orderItemSchema = z.object({
  /** 品名 */
  itemName: itemNameField,
  /** 数量 */
  quantity: quantityField,
})
/** 注文明細の型 */
export type OrderItem = z.infer<typeof orderItemSchema>

/** 注文（親。明細を1件以上持つ） */
export const orderSchema = z.object({
  /** 顧客名 */
  customer: customerField,
  /** 明細（1件以上） */
  items: z.array(orderItemSchema).min(1, '明細を1件以上入力してください'),
})
/** 注文の型 */
export type Order = z.infer<typeof orderSchema>

/** 注文表フォーム全体（zodResolver で使う） */
export const orderTableFormSchema = z.object({
  /** 注文の一覧 */
  orders: z.array(orderSchema),
})
/** 注文表フォームの入力値の型 */
export type OrderTableForm = z.infer<typeof orderTableFormSchema>
