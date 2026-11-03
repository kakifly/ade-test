import { toDateString } from '@habit/core'
import type { HabitResponse } from '@habit/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, createApiClient, type ApiClient } from './api'
import { HabitForm } from './components/HabitForm'
import { HabitList } from './components/HabitList'
import { resolveToggleConflict } from './conflict'

const errorMessage = (e: unknown): string => (e instanceof ApiError ? e.message : '予期しないエラーが発生しました')

/** 「今日」は操作のたびに端末のローカル日付から求める */
const today = (): string => toDateString(new Date())

export function App({ client: injected }: { client?: ApiClient }) {
  const client = useMemo(() => injected ?? createApiClient(fetch.bind(globalThis) as typeof fetch), [injected])
  const [habits, setHabits] = useState<HabitResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /** 一覧を取り直す。バージョンは自分で増減せず、取得した値で置き換える */
  const reload = useCallback(async (): Promise<HabitResponse[]> => {
    const list = await client.listHabits(today())
    setHabits(list)
    return list
  }, [client])

  /** 通信中はチェックボックスを無効にして操作を直列にする。失敗は一覧の上に出す */
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

  useEffect(() => {
    void run(async () => {
      await reload()
    })
  }, [run, reload])

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
