import {
  errorResponseSchema,
  habitResponseSchema,
  versionResponseSchema,
  type ErrorCode,
  type HabitResponse,
  type VersionResponse,
} from '@habit/zod'

/**
 * APIの失敗を表すエラー。
 * 画面側は status とエラーコードで、成功扱い・再取得・メッセージ表示を切り替える。
 */
export class ApiError extends Error {
  /**
   * @param message 利用者に見せるエラー文
   * @param status HTTPステータス（通信失敗・形の不一致は 0）
   * @param code APIが返したエラーコード（無ければ未指定）
   */
  constructor(
    message: string,
    readonly status: number,
    readonly code?: ErrorCode,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 応答の検証器。zod のスキーマと同じ safeParse を持つものを受け付ける */
type Parser<T> = { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }

/**
 * 習慣の配列を、1件ずつ habitResponseSchema で検証する検証器。
 * 配列でない、または1件でも形が違えば失敗とする。
 */
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

/**
 * 習慣APIを呼ぶクライアントを作る。応答は必ずスキーマで検証し、失敗は ApiError にそろえる。
 *
 * @param fetchImpl 通信に使う fetch（テストでは差し替える）
 * @returns 習慣の一覧・作成・削除、チェックの付与・解除を行う関数の組
 */
export function createApiClient(fetchImpl: typeof fetch) {
  /**
   * APIを1回呼び、通信失敗・エラー応答・形の不一致を ApiError にして投げる。
   *
   * @param path リクエスト先のパス（クエリを含む）
   * @param init fetch に渡す設定
   * @param schema 成功応答の検証器。本文なしの成功（204）のときは null
   * @returns 検証済みの応答本文（schema が null なら undefined）
   * @throws {ApiError} 通信失敗、エラー応答、応答の読み取り・検証の失敗
   */
  async function request<T>(path: string, init: RequestInit, schema: Parser<T> | null): Promise<T> {
    // ================================================================
    // 1. 通信
    //    通信そのものの失敗は status 0 で報告する。
    // ================================================================
    let res: Response
    try {
      res = await fetchImpl(path, init)
    } catch {
      // 通信そのものが失敗した場合
      throw new ApiError('通信に失敗しました', 0)
    }

    // ================================================================
    // 2. エラー応答の変換
    // ================================================================
    if (!res.ok) {
      // エラー応答は形を検証し、コードを取り出す。形が違えばステータスだけで報告する
      const body = await res.json().catch(() => null)
      const parsed = errorResponseSchema.safeParse(body)
      if (parsed.success) {
        throw new ApiError(parsed.data.error.message, res.status, parsed.data.error.code)
      }
      throw new ApiError(`サーバーエラーが発生しました（${res.status}）`, res.status)
    }

    // ================================================================
    // 3. 成功応答の読み取りと検証
    // ================================================================
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

  /** JSON本文を送るときのヘッダー */
  const json = { 'Content-Type': 'application/json' }

  return {
    /** 習慣の一覧を取得する。today は連続日数・今日のチェックの基準日（YYYY-MM-DD） */
    listHabits: (today: string): Promise<HabitResponse[]> =>
      request(`/api/habits?today=${encodeURIComponent(today)}`, { method: 'GET' }, habitListSchema),
    /** 習慣を1件作成する。同名や不正な名前は ApiError（DUPLICATE_NAME / VALIDATION_ERROR）になる */
    createHabit: (name: string): Promise<HabitResponse> =>
      request('/api/habits', { method: 'POST', headers: json, body: JSON.stringify({ name }) }, habitResponseSchema),
    /** 習慣を削除する。rowVersion は読んだ時点の値（楽観的ロック） */
    deleteHabit: (id: string, rowVersion: number): Promise<void> =>
      request(`/api/habits/${encodeURIComponent(id)}?rowVersion=${rowVersion}`, { method: 'DELETE' }, null),
    /** 指定日のチェックを付ける（checked=true）/ 外す（false）。rowVersion は親の習慣のバージョン */
    setCheck: (id: string, date: string, checked: boolean, rowVersion: number): Promise<VersionResponse> =>
      request(
        `/api/habits/${encodeURIComponent(id)}/checks/${encodeURIComponent(date)}?rowVersion=${rowVersion}`,
        { method: checked ? 'PUT' : 'DELETE' },
        versionResponseSchema,
      ),
  }
}

/** createApiClient が返すクライアントの型 */
export type ApiClient = ReturnType<typeof createApiClient>
