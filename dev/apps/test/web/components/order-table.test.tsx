import '../setup-dom'
import { afterEach, describe, expect, test } from 'bun:test'

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { OrderTableSample } = await import('../../../src/web/components/order-table/OrderTableSample')

afterEach(cleanup)

describe('OrderTableSample', () => {
  test('方式1: 親行の下に子行が出て、閉じると子行が隠れる', () => {
    render(<OrderTableSample />)
    expect(screen.getAllByLabelText('品名')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: '注文1の明細を閉じる' }))
    expect(screen.getAllByLabelText('品名')).toHaveLength(1)
  })
  test('方式2: 先頭行のセルだけが rowSpan で結合される', () => {
    render(<OrderTableSample />)
    fireEvent.click(screen.getByRole('button', { name: /方式2/ }))
    const td = screen.getAllByLabelText('顧客')[0]!.closest('td')!
    expect(td.getAttribute('rowspan')).toBe('2')
    expect(screen.getAllByLabelText('顧客')).toHaveLength(2)
  })
  test('セルを空にして送信すると、そのセルにだけエラーが出る', async () => {
    render(<OrderTableSample />)
    fireEvent.change(screen.getAllByLabelText('数量')[0]!, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '送信' }))
    const alerts = await screen.findAllByRole('alert')
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.textContent).toBe('数量を入力してください')
  })
  test('明細を追加すると行が増える', async () => {
    render(<OrderTableSample />)
    fireEvent.click(screen.getAllByRole('button', { name: '明細を追加' })[1]!)
    await waitFor(() => expect(screen.getAllByLabelText('品名')).toHaveLength(4))
  })
})
