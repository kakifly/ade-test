import type { OrderTableForm } from '@habit/zod'
import { useController, type Control, type FieldPath } from 'react-hook-form'
import { FieldError } from '../../ui/FieldError'
import { Input } from '../../ui/Input'

/** FieldCell の props */
type Props = {
  /** 対象のフォームの control */
  control: Control<OrderTableForm>
  /** フォーム内のパス（例: orders.0.items.1.quantity） */
  name: FieldPath<OrderTableForm>
  /** 入力の種類。number のときは数値として保持する */
  type?: 'text' | 'number'
  /** スクリーンリーダー向けの名前 */
  label: string
}

/**
 * 表のセル1つ分の入力欄。フォームの1項目に結び付き、検証エラーはそのセルの下に出す。
 * 値は常にフォームの状態から読むので、行の追加・削除で行がずれても表示が狂わない。
 */
export function FieldCell({ control, name, type = 'text', label }: Props) {
  // ================================================================
  // 1. フォーム項目との接続
  // ================================================================
  const {
    field,
    fieldState: { error },
  } = useController({ control, name })

  // ================================================================
  // 2. 入力欄とエラー表示
  //    数値セルは、空欄を NaN にして「数量を入力してください」の検証に流す。
  // ================================================================
  return (
    <div>
      <Input
        invalid={Boolean(error)}
        type={type}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        name={field.name}
        ref={field.ref}
        value={typeof field.value === 'number' && Number.isNaN(field.value) ? '' : String(field.value ?? '')}
        onBlur={field.onBlur}
        onChange={(e) => field.onChange(type === 'number' ? e.target.valueAsNumber : e.target.value)}
      />
      {error && (
        <FieldError>{error.message}</FieldError>
      )}
    </div>
  )
}
