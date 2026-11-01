import { describe, expect, test } from 'bun:test'
import { resolveToggleConflict } from '../../src/web/conflict'
import { makeHabit } from './fixtures'

describe('resolveToggleConflict', () => {
  test('望む状態にすでになっていれば already', () => {
    expect(resolveToggleConflict(true, makeHabit({ checkedToday: true }), '2026-11-01')).toBe('already')
    expect(resolveToggleConflict(false, makeHabit({ checkedToday: false }), '2026-11-01')).toBe('already')
  })
  test('なっていなければ retry', () => {
    expect(resolveToggleConflict(true, makeHabit({ checkedToday: false }), '2026-11-01')).toBe('retry')
    expect(resolveToggleConflict(false, makeHabit({ checkedToday: true }), '2026-11-01')).toBe('retry')
  })
})
