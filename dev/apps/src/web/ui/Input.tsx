import type { ComponentPropsWithRef } from 'react'
import { cn } from './cn'

/** 通常の状態の枠・影のクラス（ホバーとフォーカスで主色にする） */
const NORMAL =
  'border border-border hover:border-primary focus:border-2 focus:border-primary focus:shadow-focus'
/** エラーの状態の枠・影のクラス（ホバーとフォーカスでも、エラーの見た目を保つ） */
const INVALID = 'border-2 border-error shadow-error hover:border-error focus:border-error focus:shadow-error'

/** Input のプロパティ。通常の input 要素の属性（ref を含む）に、エラー表示の有無を足したもの。 */
type Props = ComponentPropsWithRef<'input'> & {
  /** true なら、エラーの見た目にする */
  invalid?: boolean
}

/**
 * デザイントークンに沿った入力欄。react-hook-form の register の結果（ref を含む）をそのまま渡せる。
 * @param props エラー表示の有無、および input 要素の属性
 * @returns input 要素
 */
export function Input({ invalid = false, className, ...rest }: Props) {
  return (
    <input
      className={cn(
        'h-(--size-input-height) w-full rounded-md bg-surface px-3 py-2 font-body text-body text-text focus:outline-none',
        'disabled:border-surface-raised disabled:bg-bg disabled:shadow-none',
        invalid ? INVALID : NORMAL,
        className,
      )}
      {...rest}
    />
  )
}
