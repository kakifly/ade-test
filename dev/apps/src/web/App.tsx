import { toDateString } from '@habit/core'
import type { HabitResponse } from '@habit/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, createApiClient, type ApiClient } from './api'
import { HabitForm } from './components/HabitForm'
import { HabitList } from './components/HabitList'
import { resolveToggleConflict } from './conflict'

/**
 * 例外を、利用者に見せるエラー文に変える。
 *
 * @param e 捕まえた例外
 * @returns ApiError ならそのメッセージ、それ以外は汎用の文
 */
const errorMessage = (e: unknown): string => (e instanceof ApiError ? e.message : '予期しないエラーが発生しました')

/**
 * 「今日」の日付（YYYY-MM-DD）を返す。操作のたびに端末のローカル日付から求める。
 *
 * @returns 今日の日付文字列
 */
const today = (): string => toDateString(new Date())

/** App の props */
type Props = {
  /** 使うAPIクライアント。省略すると fetch を使う本物のクライアントを作る（テストでは差し替える） */
  client?: ApiClient
}

/**
 * 習慣チェックの画面全体。習慣の登録フォーム、エラー表示、一覧を表示する。
 * 登録・チェック・削除の操作をAPIに送り、そのたびに一覧を取り直して表示を更新する。
 */
export function App({ client: injected }: Props) {
  // ================================================================
  // 1. APIクライアントと状態
  // ================================================================
  const client = useMemo(() => injected ?? createApiClient(fetch.bind(globalThis) as typeof fetch), [injected])
  const [habits, setHabits] = useState<HabitResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // ================================================================
  // 2. 通信の共通処理
  //    一覧の取り直しと、通信中の排他・エラー表示をここにまとめる。
  // ================================================================
  /**
   * 一覧を取り直す。バージョンは自分で増減せず、取得した値で置き換える。
   *
   * @returns 取得した最新の一覧
   */
  const reload = useCallback(async (): Promise<HabitResponse[]> => {
    const list = await client.listHabits(today())
    setHabits(list)
    return list
  }, [client])

  /**
   * 通信中はチェックボックスを無効にして操作を直列にする。失敗は一覧の上に出す。
   *
   * @param action 実行する非同期の操作
   */
  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  // ================================================================
  // 3. 初回表示時の一覧取得
  // ================================================================
  useEffect(() => {
    void run(async () => {
      await reload()
    })
  }, [run, reload])

  // ================================================================
  // 4. チェックの付与・解除
  //    親の習慣のバージョンで制御する。409でも望む状態になっていれば成功として扱う（冪等）。
  // ================================================================
  /**
   * 今日のチェックを付ける・外す。
   *
   * @param habit 対象の習慣
   * @param checked 望むチェックの状態
   */
  const toggle = (habit: HabitResponse, checked: boolean) =>
    run(async () => {
      setError(null)
      const date = today()
      try {
        await client.setCheck(habit.id, date, checked, habit.rowVersion)
      } catch (e) {
        // 409以外の失敗は、そのまま上のエラー表示へ
        if (!(e instanceof ApiError) || e.code !== 'VERSION_CONFLICT') throw e
        const list = await reload()
        const latest = list.find((h) => h.id === habit.id)
        if (!latest) {
          setError('習慣が見つかりませんでした。最新の状態を表示しました')
          return
        }
        // 望む状態にすでになっていれば成功扱い。そうでなければ最新を見せてメッセージを出す
        if (resolveToggleConflict(checked, latest, date) === 'retry') {
          setError('ほかの操作で習慣が更新されました。最新の状態を表示したので、もう一度操作してください')
        }
        return
      }
      await reload()
    })

  // ================================================================
  // 5. 習慣の削除
  //    404は削除済みとして成功扱い、409は再取得して案内する。
  // ================================================================
  /**
   * 習慣を削除する。
   *
   * @param habit 対象の習慣
   */
  const remove = (habit: HabitResponse) =>
    run(async () => {
      setError(null)
      try {
        await client.deleteHabit(habit.id, habit.rowVersion)
      } catch (e) {
        // 404は削除済み（望む状態）なので成功扱い。409は再取得してメッセージを出す
        if (e instanceof ApiError && e.status === 404) {
          await reload()
          return
        }
        if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') {
          await reload()
          setError('ほかの操作で習慣が更新されました。最新の状態を表示したので、もう一度操作してください')
          return
        }
        throw e
      }
      await reload()
    })

  // ================================================================
  // 6. 習慣の登録
  //    欄に関わる失敗は呼び出し元（フォーム）へ文字列で返す。
  // ================================================================
  /**
   * 習慣を登録する。
   *
   * @param name 習慣名
   * @returns 同名・検証エラーのときはそのメッセージ（フォームの欄の下に出す）。成功・その他の失敗では何も返さない
   */
  const create = async (name: string): Promise<string | void> => {
    setError(null)
    setBusy(true)
    try {
      await client.createHabit(name)
      await reload()
    } catch (e) {
      // 同名・検証エラーは欄の下に出し、それ以外は一覧の上に出す
      if (e instanceof ApiError && (e.code === 'DUPLICATE_NAME' || e.code === 'VALIDATION_ERROR')) {
        return e.message
      }
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1 className="page__title">今日の習慣チェック</h1>
      <HabitForm onSubmit={create} disabled={busy} />
      {error && (
        <div className="card card--error" role="alert">
          {error}
        </div>
      )}
      <section className="card card--accent">
        <HabitList habits={habits} busy={busy} onToggle={toggle} onDelete={remove} />
      </section>
    </main>
  )
}
