import type { InputHTMLAttributes, ReactNode } from 'react'

/** Checkbox のプロパティ。input 要素の属性に、ラベルを足したもの。 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** チェックボックスの右に表示する内容 */
  children: ReactNode
}

/**
 * デザイントークンに沿ったチェックボックス（ラベル付き）。チェックの印は、CSSの疑似要素で描く。
 * @param props ラベル、および input 要素の属性
 * @returns label 要素
 */
export function Checkbox({ children, ...rest }: Props) {
  return (
    <label className="flex flex-1 cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        className={[
          'm-0 grid size-(--size-checkbox) flex-none cursor-pointer appearance-none place-content-center',
          'rounded-sm border-2 border-border bg-surface',
          'checked:border-primary checked:bg-primary checked:shadow-glow',
          "checked:after:mb-0.5 checked:after:h-2.5 checked:after:w-[5px] checked:after:rotate-45 checked:after:border-r-2 checked:after:border-b-2 checked:after:border-bg checked:after:content-['']",
          'disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled) disabled:shadow-none',
        ].join(' ')}
        {...rest}
      />
      {children}
    </label>
  )
}
