import '../setup-dom'
import { afterEach, describe, expect, test } from 'bun:test'
import { jsonResponse, makeHabit } from '../fixtures'

// DOM のグローバルを用意したあとで読み込む（testing-library は読み込み時に document を見る）
const { act, cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { App } = await import('../../../src/web/App')
const { createApiClient } = await import('../../../src/web/api')
const { HabitForm } = await import('../../../src/web/components/HabitForm')
const { HabitList } = await import('../../../src/web/components/HabitList')

afterEach(cleanup)

const apiOf = (impl: (url: string, init?: RequestInit) => Promise<Response>) =>
  createApiClient(impl as unknown as typeof fetch)
const conflict = () => jsonResponse({ error: { code: 'VERSION_CONFLICT', message: '競合' } }, 409)

describe('HabitForm', () => {
  test('空の名前で送信するとエラー文が欄の下に出て、送信されない', async () => {
    let called = false
    render(<HabitForm onSubmit={async () => void (called = true)} />)
    fireEvent.click(screen.getByRole('button', { name: '追加' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).not.toBe('')
    expect(called).toBe(false)
  })
  test('サーバーのエラー文（同名）も欄の下に出る', async () => {
    render(<HabitForm onSubmit={async () => '同じ名前の習慣があります'} />)
    fireEvent.change(screen.getByLabelText('習慣名'), { target: { value: '読書' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))
    expect((await screen.findByRole('alert')).textContent).toBe('同じ名前の習慣があります')
  })
})

describe('HabitList', () => {
  test('習慣が無いときは案内が出る', () => {
    render(<HabitList habits={[]} busy={false} onToggle={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('最初の習慣を登録しよう')).toBeTruthy()
  })
  test('<script> を含む習慣名は文字列として表示され、要素にならない', () => {
    const name = '<script>alert(1)</script>'
    const { container } = render(
      <HabitList habits={[makeHabit({ name })]} busy={false} onToggle={() => {}} onDelete={() => {}} />,
    )
    expect(screen.getByText(name)).toBeTruthy()
    expect(container.querySelector('script')).toBeNull()
  })
  test('通信中はチェックボックスが無効', () => {
    render(<HabitList habits={[makeHabit()]} busy={true} onToggle={() => {}} onDelete={() => {}} />)
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)
  })
})

describe('App', () => {
  test('チェック操作中はチェックボックスが無効になり、完了後に再取得した値で戻る', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => (release = r))
    let checked = false
    const api = apiOf(async (_url, init) => {
      if (init?.method === 'PUT') {
        await gate
        checked = true
        return jsonResponse({ rowVersion: 2 })
      }
      return jsonResponse([makeHabit({ checkedToday: checked, rowVersion: checked ? 2 : 1 })])
    })
    render(<App client={api} />)
    const box = (await screen.findByRole('checkbox')) as HTMLInputElement
    await waitFor(() => expect(box.disabled).toBe(false))
    fireEvent.click(box)
    await waitFor(() => expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true))
    await act(async () => release())
    await waitFor(() => {
      const b = screen.getByRole('checkbox') as HTMLInputElement
      expect(b.disabled).toBe(false)
      expect(b.checked).toBe(true)
    })
  })
  test('409でも望む状態になっていれば成功扱い（エラーを出さない）', async () => {
    let n = 0
    const api = apiOf(async (_url, init) => {
      if (init?.method === 'PUT') return conflict()
      n++
      return jsonResponse([makeHabit({ checkedToday: n > 1, rowVersion: n })])
    })
    render(<App client={api} />)
    const box = (await screen.findByRole('checkbox')) as HTMLInputElement
    await waitFor(() => expect(box.disabled).toBe(false))
    fireEvent.click(box)
    await waitFor(() => expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true))
    expect(screen.queryByRole('alert')).toBeNull()
  })
  test('409で望む状態になっていなければメッセージを出す', async () => {
    const api = apiOf(async (_url, init) =>
      init?.method === 'PUT' ? conflict() : jsonResponse([makeHabit({ checkedToday: false })]),
    )
    render(<App client={api} />)
    const box = (await screen.findByRole('checkbox')) as HTMLInputElement
    await waitFor(() => expect(box.disabled).toBe(false))
    fireEvent.click(box)
    expect((await screen.findByRole('alert')).textContent).toContain('もう一度')
  })
  test('通信失敗は一覧の上にエラー表示', async () => {
    const api = apiOf(async () => {
      throw new TypeError('x')
    })
    render(<App client={api} />)
    expect((await screen.findByRole('alert')).textContent).toContain('通信に失敗')
  })
})
