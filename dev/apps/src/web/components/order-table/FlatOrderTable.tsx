import type { OrderTableForm } from '@habit/zod'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { FieldCell } from './FieldCell'
import { addItem, RemoveItemButton } from './OrderCells'
import { Button } from '../../ui/Button'
import { TABLE } from '../../ui/table'

/** 平坦化した1行（明細1件分。注文の項目は先頭行だけが持つ） */
type FlatRow = {
  /** フォームの orders の添字 */
  orderIndex: number
  /** フォームの items の添字 */
  itemIndex: number
  /** 注文の先頭の明細行なら、その注文の明細件数（結合する行数）。それ以外は 0 */
  rowSpan: number
}

const helper = createColumnHelper<FlatRow>()

/** FlatOrderTable の props */
type Props = {
  /** useOrderTableForm で作ったフォーム */
  form: UseFormReturn<OrderTableForm>
}

/**
 * 方式2: 平坦化。明細1件を1行にし、注文の項目（顧客）は先頭行のセルを rowSpan で縦に結合する。
 * 顧客のフォーム項目は注文ごとに1つだけ（先頭行にだけ登録する）なので、値が重複しない。
 */
export function FlatOrderTable({ form }: Props) {
  const { control, getValues, setValue } = form

  // ================================================================
  // 1. 表のデータ作成
  //    注文ごとの明細を横に並べ直し、先頭の行に結合の行数を持たせる。
  // ================================================================
  const orders = useWatch({ control, name: 'orders' })
  //    描画のたびに作り直さないよう、値が変わったときだけ作る。
  const data = useMemo<FlatRow[]>(
    () =>
      orders.flatMap((o, orderIndex) =>
        o.items.map((_, itemIndex) => ({
          orderIndex,
          itemIndex,
          rowSpan: itemIndex === 0 ? o.items.length : 0,
        })),
      ),
    [orders],
  )

  // ================================================================
  // 2. 列の定義
  //    顧客と「明細を追加」は、先頭行だけがセルを出す（rowSpan は描画側で付ける）。
  //    列を毎回作り直すと入力欄が作り直されてフォーカスが外れるので、useMemo で固定する。
  // ================================================================
  const columns = useMemo(
    () => [
      helper.display({
        id: 'customer',
        header: '顧客',
        cell: ({ row }) => <FieldCell control={control} name={`orders.${row.original.orderIndex}.customer`} label="顧客" />,
      }),
      helper.display({
        id: 'itemName',
        header: '品名',
        cell: ({ row }) => (
          <FieldCell
            control={control}
            name={`orders.${row.original.orderIndex}.items.${row.original.itemIndex}.itemName`}
            label="品名"
          />
        ),
      }),
      helper.display({
        id: 'quantity',
        header: '数量',
        cell: ({ row }) => (
          <FieldCell
            control={control}
            name={`orders.${row.original.orderIndex}.items.${row.original.itemIndex}.quantity`}
            type="number"
            label="数量"
          />
        ),
      }),
      helper.display({
        id: 'itemActions',
        header: '',
        cell: ({ row }) => (
          <RemoveItemButton
            control={control}
            orderIndex={row.original.orderIndex}
            itemIndex={row.original.itemIndex}
            getValues={getValues}
            setValue={setValue}
          />
        ),
      }),
      helper.display({
        id: 'orderActions',
        header: '',
        cell: ({ row }) => (
          <Button size="sm" onClick={() => addItem(getValues, setValue, row.original.orderIndex)}>
            明細を追加
          </Button>
        ),
      }),
    ],
    [control, getValues, setValue],
  )

  // 結合するのは、注文単位の列（顧客・明細追加）だけ
  const mergedColumns = new Set(['customer', 'orderActions'])
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <table className={TABLE.table}>
      <thead>
        {table.getHeaderGroups().map((g) => (
          <tr key={g.id}>
            {g.headers.map((h) => (
              <th key={h.id} className={TABLE.th}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className={row.original.itemIndex === 0 ? TABLE.parentRow : undefined}>
            {row.getVisibleCells().map((c) => {
              // 結合列は、先頭行だけ rowSpan 付きで出し、残りの行ではセルを出さない
              if (mergedColumns.has(c.column.id)) {
                if (row.original.rowSpan === 0) return null
                return (
                  <td key={c.id} rowSpan={row.original.rowSpan} className={TABLE.td}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                )
              }
              return <td key={c.id} className={TABLE.td}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
