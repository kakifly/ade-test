import { describe, expect, test } from 'bun:test'
import { habitNameField } from '../../src/zod/fields/habitName'
import { dateField } from '../../src/zod/fields/date'
import { rowVersionField } from '../../src/zod/fields/rowVersion'
import { habitIdField } from '../../src/zod/fields/habitId'
import { streakField } from '../../src/zod/fields/streak'
import { createdAtField } from '../../src/zod/fields/createdAt'

describe('habitNameField', () => {
  test('空文字・空白のみ・51文字を拒否する', () => {
    expect(habitNameField.safeParse('').success).toBe(false)
    expect(habitNameField.safeParse('   ').success).toBe(false)
    expect(habitNameField.safeParse('あ'.repeat(51)).success).toBe(false)
  })
  test('50文字を許可する', () => {
    expect(habitNameField.safeParse('あ'.repeat(50)).success).toBe(true)
  })
  test('前後の空白を除去する', () => {
    expect(habitNameField.parse('  読書 ')).toBe('読書')
  })
})

describe('dateField', () => {
  test('実在する日付を許可する', () => {
    expect(dateField.safeParse('2024-02-29').success).toBe(true)
  })
  test.each(['2023-02-29', '2024-13-01', '2024-1-1', '2024-02-30', ''])('%s を拒否する', (v) => {
    expect(dateField.safeParse(v).success).toBe(false)
  })
})

describe('rowVersionField', () => {
  test('1以上の整数を許可する', () => {
    expect(rowVersionField.safeParse(1).success).toBe(true)
  })
  test.each([0, 1.5, -1])('%p を拒否する', (v) => {
    expect(rowVersionField.safeParse(v).success).toBe(false)
  })
})

describe('streakField', () => {
  test('0以上の整数を許可し、負数・小数を拒否する', () => {
    expect(streakField.safeParse(0).success).toBe(true)
    expect(streakField.safeParse(-1).success).toBe(false)
    expect(streakField.safeParse(1.5).success).toBe(false)
  })
})

describe('habitIdField', () => {
  test('UUIDのみ許可する', () => {
    expect(habitIdField.safeParse('3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b').success).toBe(true)
    expect(habitIdField.safeParse('abc').success).toBe(false)
  })
})

describe('createdAtField', () => {
  test('ISO 8601のみ許可する', () => {
    expect(createdAtField.safeParse('2024-05-01T12:34:56Z').success).toBe(true)
    expect(createdAtField.safeParse('2024-05-01').success).toBe(false)
    expect(createdAtField.safeParse('yesterday').success).toBe(false)
  })
})
