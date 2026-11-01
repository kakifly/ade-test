import { describe, expect, test } from 'bun:test'
import { ApiError, createApiClient } from '../../src/web/api'
import { jsonResponse, makeHabit } from './fixtures'

const client = (impl: (url: string, init?: RequestInit) => Promise<Response>) =>
  createApiClient(impl as unknown as typeof fetch)

describe('APIクライアント', () => {
  test('一覧を検証して返す', async () => {
    const c = client(async () => jsonResponse([makeHabit()]))
    expect(await c.listHabits('2026-11-01')).toHaveLength(1)
  })
  test('壊れたJSONはエラー', async () => {
    const c = client(async () => new Response('{broken', { status: 200 }))
    await expect(c.listHabits('2026-11-01')).rejects.toBeInstanceOf(ApiError)
  })
  test('想定外の形はエラー', async () => {
    const c = client(async () => jsonResponse([{ id: 1 }]))
    await expect(c.listHabits('2026-11-01')).rejects.toBeInstanceOf(ApiError)
  })
  test('通信失敗はエラー', async () => {
    const c = client(async () => {
      throw new TypeError('network')
    })
    await expect(c.listHabits('2026-11-01')).rejects.toMatchObject({ name: 'ApiError', status: 0 })
  })
  test('409 VERSION_CONFLICT を識別する', async () => {
    const c = client(async () => jsonResponse({ error: { code: 'VERSION_CONFLICT', message: '競合' } }, 409))
    await expect(c.setCheck('id', '2026-11-01', true, 1)).rejects.toMatchObject({ status: 409, code: 'VERSION_CONFLICT' })
  })
  test('チェックの付与は PUT、解除は DELETE で、rowVersion をクエリに付ける', async () => {
    const calls: string[] = []
    const c = client(async (url, init) => {
      calls.push(`${init?.method} ${url}`)
      return jsonResponse({ rowVersion: 3 })
    })
    expect(await c.setCheck('abc', '2026-11-01', true, 2)).toEqual({ rowVersion: 3 })
    await c.setCheck('abc', '2026-11-01', false, 3)
    expect(calls).toEqual(['PUT /api/habits/abc/checks/2026-11-01?rowVersion=2', 'DELETE /api/habits/abc/checks/2026-11-01?rowVersion=3'])
  })
  test('削除は204で成功し、rowVersion を付ける', async () => {
    let seen = ''
    const c = client(async (url) => {
      seen = url
      return new Response(null, { status: 204 })
    })
    await c.deleteHabit('abc', 4)
    expect(seen).toBe('/api/habits/abc?rowVersion=4')
  })
})
