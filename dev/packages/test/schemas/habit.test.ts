import { describe, expect, test } from 'bun:test'
import {
  createHabitFormSchema,
  createHabitRequestSchema,
  errorResponseSchema,
  habitNameField,
  habitResponseSchema,
  toggleCheckParamsSchema,
  versionQuerySchema,
  versionResponseSchema,
} from '../../src/schemas'

const id = '3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b'

describe('createHabitFormSchema', () => {
  test.each(['', '   ', 'あ'.repeat(51), 'あ'.repeat(50), '  読書 '])(
    'habitNameField と同じ結果になる: %p',
    (name) => {
      const field = habitNameField.safeParse(name)
      const form = createHabitFormSchema.safeParse({ name })
      expect(form.success).toBe(field.success)
      if (field.success && form.success) expect(form.data.name).toBe(field.data)
    },
  )
  test('リクエストスキーマも同じ結果になる', () => {
    expect(createHabitRequestSchema.parse({ name: ' a ' })).toEqual({ name: 'a' })
  })
})

describe('versionQuerySchema', () => {
  test("'3' を 3 に変換する", () => {
    expect(versionQuerySchema.parse({ rowVersion: '3' })).toEqual({ rowVersion: 3 })
  })
  test.each(['0', '1.5', 'abc', '', '-1'])('%p を拒否する', (v) => {
    expect(versionQuerySchema.safeParse({ rowVersion: v }).success).toBe(false)
  })
})

describe('その他の組み合わせスキーマ', () => {
  test('habitResponseSchema', () => {
    const ok = { id, name: '読書', createdAt: '2024-05-01T00:00:00Z', checkedToday: true, streak: 2, rowVersion: 1 }
    expect(habitResponseSchema.safeParse(ok).success).toBe(true)
    expect(habitResponseSchema.safeParse({ ...ok, checkedToday: 'x' }).success).toBe(false)
  })
  test('toggleCheckParamsSchema', () => {
    expect(toggleCheckParamsSchema.safeParse({ id, date: '2024-02-29' }).success).toBe(true)
    expect(toggleCheckParamsSchema.safeParse({ id, date: '2023-02-29' }).success).toBe(false)
  })
  test('versionResponseSchema', () => {
    expect(versionResponseSchema.safeParse({ rowVersion: 2 }).success).toBe(true)
    expect(versionResponseSchema.safeParse({ rowVersion: 0 }).success).toBe(false)
  })
  test('errorResponseSchema', () => {
    expect(errorResponseSchema.safeParse({ error: { code: 'VERSION_CONFLICT', message: 'x' } }).success).toBe(true)
    expect(errorResponseSchema.safeParse({ error: { code: 'OTHER', message: 'x' } }).success).toBe(false)
    // 想定外のエラー（500）にも対応する
    expect(errorResponseSchema.safeParse({ error: { code: 'INTERNAL_ERROR', message: 'x' } }).success).toBe(true)
  })
})
