import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

/** ボタンの種類ごとの、色・枠・影のクラス。種類の間でプロパティが重ならないようにする */
const VARIANT = {
  /** 主な操作（追加、保存など） */
  primary:
    'bg-primary text-bg border-primary-border shadow-card hover:enabled:bg-primary-hover',
  /** 取り消せない操作（削除など） */
  destructive:
    'bg-secondary text-text border-secondary-border hover:enabled:bg-secondary-hover',
  /** 補助の操作（開閉など） */
  plain: 'bg-surface text-text border-border hover:enabled:bg-surface-raised',
} as const

/** ボタンの大きさごとの、高さ・余白・文字の大きさのクラス */
const SIZE = {
  sm: 'h-(--size-btn-sm-height) px-3.5 py-1.5 text-btn-sm',
  md: 'h-(--size-btn-md-height) px-[22px] py-2 text-btn-md',
} as const

/** Button のプロパティ。通常の button 要素の属性に、種類と大きさを足したもの。 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 種類。既定は primary */
  variant?: keyof typeof VARIANT
  /** 大きさ。既定は md */
  size?: keyof typeof SIZE
}

/**
 * デザイントークンに沿ったボタン。無効のときは、薄くして、押せない見た目にする。
 * @param props 種類、大きさ、および button 要素の属性
 * @returns button 要素
 */
export function Button({ variant = 'primary', size = 'md', type = 'button', className, ...rest }: Props) {
  return (
    <button
      type={type}
      className={cn(
        'cursor-pointer rounded-md border font-heading transition-colors duration-(--duration)',
        'disabled:cursor-not-allowed disabled:border-border disabled:opacity-(--opacity-disabled) disabled:shadow-none',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  )
}
