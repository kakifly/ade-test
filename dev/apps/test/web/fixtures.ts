import type { HabitResponse } from '@habit/schemas'

export const makeHabit = (over: Partial<HabitResponse> = {}): HabitResponse => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: '朝のストレッチ',
  createdAt: '2026-11-01T00:00:00.000Z',
  checkedToday: false,
  streak: 0,
  rowVersion: 1,
  ...over,
})

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
