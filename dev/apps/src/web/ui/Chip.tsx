import type { HTMLAttributes } from 'react'
import { cn } from './cn'

/** チップの種類ごとの、背景・文字色・枠のクラス */
const VARIANT = {
  /** 達成している状態 */
  success: 'bg-success-a12 text-success',
  /** 中立の状態（絞り込み、0日など） */
  filter: 'border border-border bg-surface text-text-muted',
} as const

/** Chip のプロパティ。span 要素の属性に、種類を足したもの。 */
type Props = HTMLAttributes<HTMLSpanElement> & {
  /** 種類 */
  variant: keyof typeof VARIANT
}

/**
 * 小さなラベル（チップ）。
 * @param props 種類、およびspan要素の属性
 * @returns span 要素
 */
export function Chip({ variant, className, ...rest }: Props) {
  return (
    <span
      className={cn('rounded-sm px-3 py-1 font-heading text-chip tracking-[1px] uppercase', VARIANT[variant], className)}
      {...rest}
    />
  )
}
