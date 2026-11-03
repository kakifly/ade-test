import { useState } from 'react'
import { FlatOrderTable } from './FlatOrderTable'
import { NestedOrderTable } from './NestedOrderTable'
import { useOrderTableForm } from './useOrderTableForm'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Page } from '../../ui/Page'

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
    <Page title="注文表のサンプル">
      <div className="flex items-end gap-2">
        <Button aria-pressed={mode === 'nested'} onClick={() => setMode('nested')}>
          方式1: 親行+子行
        </Button>
        <Button aria-pressed={mode === 'flat'} onClick={() => setMode('flat')}>
          方式2: 平坦化+rowSpan
        </Button>
      </div>
      <Card as="form" variant="accent" onSubmit={submit} noValidate>
        {mode === 'nested' ? <NestedOrderTable form={form} /> : <FlatOrderTable form={form} />}
        <Button type="submit">送信</Button>
      </Card>
      {submitted && <Card as="pre">{submitted}</Card>}
    </Page>
  )
}
