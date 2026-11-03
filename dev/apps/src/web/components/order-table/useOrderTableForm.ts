import { zodResolver } from '@hookform/resolvers/zod'
import { orderTableFormSchema, type OrderTableForm } from '@habit/zod'
import { useForm } from 'react-hook-form'

/** サンプルの初期データ（注文2件。1件目は明細が2行） */
export const sampleOrders: OrderTableForm = {
  orders: [
    {
      customer: '山田商店',
      items: [
        { itemName: 'りんご', quantity: 3 },
        { itemName: 'みかん', quantity: 5 },
      ],
    },
    { customer: '佐藤食堂', items: [{ itemName: 'たまご', quantity: 10 }] },
  ],
}

/**
 * 注文表のフォームを作る。2つの表（入れ子・平坦化）で共通に使う。
 * 検証は @habit/zod の orderTableFormSchema に一本化し、セルを離れた時点でそのセルを検証する。
 *
 * @param defaultValues 初期データ。省略するとサンプルの注文を使う
 * @returns react-hook-form の useForm の戻り値
 */
export function useOrderTableForm(defaultValues: OrderTableForm = sampleOrders) {
  return useForm<OrderTableForm>({
    resolver: zodResolver(orderTableFormSchema),
    defaultValues,
    mode: 'onBlur',
  })
}
