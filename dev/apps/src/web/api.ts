import {
  errorResponseSchema,
  habitResponseSchema,
  versionResponseSchema,
  type ErrorCode,
  type HabitResponse,
  type VersionResponse,
} from '@habit/schemas'

/** APIの失敗。status は HTTP ステータス（通信失敗・形の不一致は 0） */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: ErrorCode,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}


type Parser<T> = { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }

/** 習慣の配列を、1件ずつ habitResponseSchema で検証する */
const habitListSchema: Parser<HabitResponse[]> = {
  safeParse(v) {
    if (!Array.isArray(v)) return { success: false }
    const data: HabitResponse[] = []
    for (const item of v) {
      const r = habitResponseSchema.safeParse(item)
      // 1件でも形が違えば全体を不正とする
      if (!r.success) return { success: false }
      data.push(r.data)
    }
    return { success: true, data }
  },
}

export function createApiClient(fetchImpl: typeof fetch) {
  async function request<T>(path: string, init: RequestInit, schema: Parser<T> | null): Promise<T> {
    let res: Response
    try {
      res = await fetchImpl(path, init)
    } catch {
      // 通信そのものが失敗した場合
      throw new ApiError('通信に失敗しました', 0)
    }

    if (!res.ok) {
      // エラー応答は形を検証し、コードを取り出す。形が違えばステータスだけで報告する
      const body = await res.json().catch(() => null)
      const parsed = errorResponseSchema.safeParse(body)
      if (parsed.success) {
        throw new ApiError(parsed.data.error.message, res.status, parsed.data.error.code)
      }
      throw new ApiError(`サーバーエラーが発生しました（${res.status}）`, res.status)
    }

    // 本文なしの成功（204）は検証対象が無い
    if (schema === null) return undefined as T

    let json: unknown
    try {
      json = await res.json()
    } catch {
      throw new ApiError('サーバーの応答を読み取れませんでした', 0)
    }
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      throw new ApiError('サーバーの応答の形が想定と異なります', 0)
    }
    return parsed.data
  }

  const json = { 'Content-Type': 'application/json' }

  return {
    listHabits: (today: string): Promise<HabitResponse[]> =>
      request(`/api/habits?today=${encodeURIComponent(today)}`, { method: 'GET' }, habitListSchema),
    createHabit: (name: string): Promise<HabitResponse> =>
      request('/api/habits', { method: 'POST', headers: json, body: JSON.stringify({ name }) }, habitResponseSchema),
    deleteHabit: (id: string, rowVersion: number): Promise<void> =>
      request(`/api/habits/${encodeURIComponent(id)}?rowVersion=${rowVersion}`, { method: 'DELETE' }, null),
    setCheck: (id: string, date: string, checked: boolean, rowVersion: number): Promise<VersionResponse> =>
      request(
        `/api/habits/${encodeURIComponent(id)}/checks/${encodeURIComponent(date)}?rowVersion=${rowVersion}`,
        { method: checked ? 'PUT' : 'DELETE' },
        versionResponseSchema,
      ),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
