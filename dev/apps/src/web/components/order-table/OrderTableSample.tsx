import { useState } from 'react'
import { FlatOrderTable } from './FlatOrderTable'
import { NestedOrderTable } from './NestedOrderTable'
import { useOrderTableForm } from './useOrderTableForm'

/**
 * 注文表のサンプル画面。同じフォームを、方式1（親行+子行）と方式2（平坦化+rowSpan）で切り替えて見せる。
 * 切り替えても入力中の値はフォームに残る。検証エラーは送信時にまとめて表示する。
 */
export function OrderTableSample() {
  // ================================================================
  // 1. フォームと表示の状態
  // ================================================================
  const form = useOrderTableForm()
  const [mode, setMode] = useState<'nested' | 'flat'>('nested')
  const [submitted, setSubmitted] = useState<string | null>(null)

  // ================================================================
  // 2. 送信の処理
  //    検証を通った値だけを、結果として表示する。
  // ================================================================
  const submit = form.handleSubmit((values) => setSubmitted(JSON.stringify(values, null, 2)))

  return (
    <main className="page">
      <h1 className="page__title">注文表のサンプル</h1>
      <div className="form__row">
        <button type="button" className="btn btn--md btn--primary" aria-pressed={mode === 'nested'} onClick={() => setMode('nested')}>
          方式1: 親行+子行
        </button>
        <button type="button" className="btn btn--md btn--primary" aria-pressed={mode === 'flat'} onClick={() => setMode('flat')}>
          方式2: 平坦化+rowSpan
        </button>
      </div>
      <form className="card card--accent" onSubmit={submit} noValidate>
        {mode === 'nested' ? <NestedOrderTable form={form} /> : <FlatOrderTable form={form} />}
        <button type="submit" className="btn btn--primary btn--md">
          送信
        </button>
      </form>
      {submitted && <pre className="card">{submitted}</pre>}
    </main>
  )
}
