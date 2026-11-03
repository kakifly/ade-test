import { describe, expect, test } from 'bun:test'
import { orderTableFormSchema, quantityField } from '../../src/zod'

describe('quantityField', () => {
  test.each([0, 100, 1.5, Number.NaN])('不正な数量は通らない: %p', (v) => {
    expect(quantityField.safeParse(v).success).toBe(false)
  })
  test.each([1, 99])('正しい数量は通る: %p', (v) => {
    expect(quantityField.safeParse(v).success).toBe(true)
  })
})

describe('orderTableFormSchema', () => {
  test('明細が0件の注文は通らない', () => {
    const r = orderTableFormSchema.safeParse({ orders: [{ customer: 'A', items: [] }] })
    expect(r.success).toBe(false)
  })
  test('セルごとのエラーが、パス付きで返る', () => {
    const r = orderTableFormSchema.safeParse({ orders: [{ customer: '', items: [{ itemName: 'x', quantity: 0 }] }] })
    const paths = r.error!.issues.map((i) => i.path.join('.'))
    expect(paths).toEqual(['orders.0.customer', 'orders.0.items.0.quantity'])
  })
})
