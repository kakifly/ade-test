import type { ReactNode } from 'react'

/** Page のプロパティ。 */
type Props = {
  /** ページの見出し（h1） */
  title: string
  /** 見出しの下に並べる内容 */
  children: ReactNode
}

/**
 * ページの枠（中央寄せ、最大幅、見出し）。
 * @param props 見出しと中身
 * @returns main 要素
 */
export function Page({ title, children }: Props) {
  return (
    <main className="mx-auto flex max-w-(--size-page-width) flex-col gap-6 px-4 py-16">
      <h1 className="m-0 font-heading text-h1 text-text">{title}</h1>
      {children}
    </main>
  )
}
