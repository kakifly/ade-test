import type { ElementType, FormHTMLAttributes, HTMLAttributes } from 'react'
import { cn } from './cn'

/** カードの種類ごとの、枠・影・文字色のクラス。種類の間でプロパティが重ならないようにする */
const VARIANT = {
  /** 通常 */
  plain: 'border-border shadow-card',
  /** 上の枠を主色にして強調する */
  accent: 'border-border border-t-2 border-t-primary shadow-raised',
  /** エラーの表示 */
  error: 'border-error shadow-error text-error-text',
} as const

/** Card のプロパティ。HTML要素の属性（form として使うときの noValidate を含む）に、種類と描画する要素を足したもの。 */
type Props = HTMLAttributes<HTMLElement> &
  Pick<FormHTMLAttributes<HTMLFormElement>, 'noValidate'> & {
  /** 種類。既定は plain */
  variant?: keyof typeof VARIANT
  /** 描画する要素。既定は div（section、form、pre なども指定できる） */
  as?: ElementType
}

/**
 * デザイントークンに沿ったカード。
 * @param props 種類、描画する要素、およびHTML要素の属性
 * @returns カード（指定した要素）
 */
export function Card({ variant = 'plain', as: Tag = 'div', className, ...rest }: Props) {
  return <Tag className={cn('rounded-md border bg-surface p-6', VARIANT[variant], className)} {...rest} />
}
