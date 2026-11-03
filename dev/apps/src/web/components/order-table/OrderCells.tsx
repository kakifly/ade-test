import type { OrderTableForm } from '@habit/zod'
import { useWatch, type Control, type UseFormGetValues, type UseFormSetValue } from 'react-hook-form'
import { Button } from '../../ui/Button'

/**
 * 注文に空の明細を1行足す。
 *
 * @param getValues フォームの値の取得関数
 * @param setValue フォームの値の設定関数
 * @param orderIndex 対象の注文の添字
 */
export function addItem(getValues: UseFormGetValues<OrderTableForm>, setValue: UseFormSetValue<OrderTableForm>, orderIndex: number) {
  const items = getValues(`orders.${orderIndex}.items`)
  setValue(`orders.${orderIndex}.items`, [...items, { itemName: '', quantity: 1 }])
}

/**
 * 注文から明細を1行消す。
 *
 * @param getValues フォームの値の取得関数
 * @param setValue フォームの値の設定関数
 * @param orderIndex 対象の注文の添字
 * @param itemIndex 消す明細の添字
 */
export function removeItem(
  getValues: UseFormGetValues<OrderTableForm>,
  setValue: UseFormSetValue<OrderTableForm>,
  orderIndex: number,
  itemIndex: number,
) {
  const items = getValues(`orders.${orderIndex}.items`)
  setValue(
    `orders.${orderIndex}.items`,
    items.filter((_, i) => i !== itemIndex),
  )
}

/** OrderTotal / RemoveItemButton の props */
type CellProps = {
  /** フォームの control */
  control: Control<OrderTableForm>
  /** 対象の注文の添字 */
  orderIndex: number
}

/**
 * 注文の明細の数量の合計を表示する。
 * 値を読む部品を分けているので、入力のたびに表全体の列が作り直されることはない。
 */
export function OrderTotal({ control, orderIndex }: CellProps) {
  const items = useWatch({ control, name: `orders.${orderIndex}.items` }) ?? []
  const total = items.reduce((sum, i) => sum + (Number.isNaN(i.quantity) ? 0 : i.quantity), 0)
  return <span className="text-sm text-text-muted">合計 {total}</span>
}

/** 明細の件数を表示する */
export function ItemCount({ control, orderIndex }: CellProps) {
  const items = useWatch({ control, name: `orders.${orderIndex}.items` }) ?? []
  return <span className="text-sm text-text-muted">{items.length}件の明細</span>
}

/** RemoveItemButton の props */
type RemoveProps = CellProps & {
  /** 消す明細の添字 */
  itemIndex: number
  /** フォームの値の取得関数 */
  getValues: UseFormGetValues<OrderTableForm>
  /** フォームの値の設定関数 */
  setValue: UseFormSetValue<OrderTableForm>
}

/** 明細の削除ボタン。最後の1件は消せない */
export function RemoveItemButton({ control, orderIndex, itemIndex, getValues, setValue }: RemoveProps) {
  const count = (useWatch({ control, name: `orders.${orderIndex}.items` }) ?? []).length
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={count <= 1}
      onClick={() => removeItem(getValues, setValue, orderIndex, itemIndex)}
    >
      削除
    </Button>
  )
}
