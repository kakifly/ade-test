import type { ReactNode } from 'react'

/** FieldError のプロパティ。 */
type Props = {
  /** aria-describedby から参照するための id（無くてもよい） */
  id?: string
  /** エラーメッセージ */
  children: ReactNode
}

/**
 * 入力欄の下に出すエラーメッセージ。スクリーンリーダーに伝わるよう role="alert" を付ける。
 * @param props id とメッセージ
 * @returns p 要素
 */
export function FieldError({ id, children }: Props) {
  return (
    <p id={id} className="mt-1 mb-0 text-caption text-error-text" role="alert">
      {children}
    </p>
  )
}
