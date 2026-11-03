import type { OrderTableForm } from '@habit/zod'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { FieldCell } from './FieldCell'

/** 親行（注文）。子行として明細を持つ */
type OrderRow = {
  kind: 'order'
  /** フォームの orders の添字 */
  orderIndex: number
  customer: string
  /** 子行（明細） */
  children: ItemRow[]
}
/** 子行（明細） */
type ItemRow = {
  kind: 'item'
  /** 親の orders の添字 */
  orderIndex: number
  /** 親の items の添字 */
  itemIndex: number
}
/** 表の1行（親行か子行） */
type Row = OrderRow | ItemRow

const helper = createColumnHelper<Row>()

/** NestedOrderTable の props */
type Props = {
  /** useOrderTableForm で作ったフォーム */
  form: UseFormReturn<OrderTableForm>
}

/**
 * 方式1: 親行 + 子行。注文を親行、明細をその下の子行として表示する。
 * 親行の開閉ボタンで子行を出し入れできる。
 */
export function NestedOrderTable({ form }: Props) {
  const { control, getValues, setValue } = form

  // ================================================================
  // 1. 表のデータ作成
  //    フォームの値から、親行（subRows に子行を持つ）の配列を作る。
  // ================================================================
  const orders = useWatch({ control, name: 'orders' })
  const data: Row[] = orders.map((o, orderIndex) => ({
    kind: 'order',
    orderIndex,
    customer: o.customer,
    children: o.items.map((_, itemIndex) => ({ kind: 'item', orderIndex, itemIndex })),
  }))

  // ================================================================
  // 2. 列の定義
  //    親行と子行で、同じ列に別の内容を出す。
  // ================================================================
  const columns = [
    helper.display({
      id: 'customer',
      header: '顧客',
      cell: ({ row }) => {
        const r = row.original
        // 子行は顧客欄を空ける（インデントで親子を示す）
        if (r.kind === 'item') return <span className="cell__indent" />
        return (
          <div className="cell__customer">
            <button
              type="button"
              className="btn btn--sm cell__toggle"
              aria-expanded={row.getIsExpanded()}
              aria-label={`${r.customer || '注文'}の明細を${row.getIsExpanded() ? '閉じる' : '開く'}`}
              onClick={row.getToggleExpandedHandler()}
            >
              {row.getIsExpanded() ? '▼' : '▶'}
            </button>
            <FieldCell control={control} name={`orders.${r.orderIndex}.customer`} label="顧客" />
          </div>
        )
      },
    }),
    helper.display({
      id: 'itemName',
      header: '品名',
      cell: ({ row }) => {
        const r = row.original
        // 親行は明細の件数だけを出す
        if (r.kind === 'order') return <span className="cell__summary">{r.children.length}件の明細</span>
        return <FieldCell control={control} name={`orders.${r.orderIndex}.items.${r.itemIndex}.itemName`} label="品名" />
      },
    }),
    helper.display({
      id: 'quantity',
      header: '数量',
      cell: ({ row }) => {
        const r = row.original
        // 親行は数量の合計を出す
        if (r.kind === 'order') {
          const total = (orders[r.orderIndex]?.items ?? []).reduce((sum, i) => sum + (Number.isNaN(i.quantity) ? 0 : i.quantity), 0)
          return <span className="cell__summary">合計 {total}</span>
        }
        return (
          <FieldCell
            control={control}
            name={`orders.${r.orderIndex}.items.${r.itemIndex}.quantity`}
            type="number"
            label="数量"
          />
        )
      },
    }),
    helper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const r = row.original
        // 親行は明細の追加、子行は明細の削除（最後の1件は削除できない）
        if (r.kind === 'order') {
          return (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => addItem(r.orderIndex)}>
              明細を追加
            </button>
          )
        }
        const count = orders[r.orderIndex]?.items.length ?? 0
        return (
          <button
            type="button"
            className="btn btn--destructive btn--sm"
            disabled={count <= 1}
            onClick={() => removeItem(r.orderIndex, r.itemIndex)}
          >
            削除
          </button>
        )
      },
    }),
  ]

  // ================================================================
  // 3. 行の追加・削除
  //    配列ごと入れ替える。入力欄は常にフォームの値を読むので、表示はずれない。
  // ================================================================
  /**
   * 注文に空の明細を1行足す。
   *
   * @param orderIndex 対象の注文の添字
   */
  function addItem(orderIndex: number) {
    const items = getValues(`orders.${orderIndex}.items`)
    setValue(`orders.${orderIndex}.items`, [...items, { itemName: '', quantity: 1 }])
  }
  /**
   * 注文から明細を1行消す。
   *
   * @param orderIndex 対象の注文の添字
   * @param itemIndex 消す明細の添字
   */
  function removeItem(orderIndex: number, itemIndex: number) {
    const items = getValues(`orders.${orderIndex}.items`)
    setValue(
      `orders.${orderIndex}.items`,
      items.filter((_, i) => i !== itemIndex),
    )
  }

  // ================================================================
  // 4. 表の組み立て
  //    getSubRows で子行を取り出し、既定ですべて展開しておく。
  // ================================================================
  const table = useReactTable({
    data,
    columns,
    getSubRows: (r) => (r.kind === 'order' ? r.children : undefined),
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: { expanded: true },
  })

  return (
    <table className="grid">
      <thead>
        {table.getHeaderGroups().map((g) => (
          <tr key={g.id}>
            {g.headers.map((h) => (
              <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className={row.depth === 0 ? 'grid__parent' : 'grid__child'}>
            {row.getVisibleCells().map((c) => (
              <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
