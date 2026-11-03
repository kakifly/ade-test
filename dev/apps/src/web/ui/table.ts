/** 表（table）の見た目のクラス。tanstack の表のように、行・セルを繰り返し描画する場所で使う */
export const TABLE = {
  /** table 要素 */
  table: 'mb-6 w-full border-collapse',
  /** th 要素 */
  th: 'border border-border p-2 text-left align-top font-heading text-sm text-text-muted',
  /** td 要素 */
  td: 'border border-border p-2 text-left align-top',
  /** 親の行（注文など、明細を束ねる行）の背景 */
  parentRow: 'bg-surface-raised',
} as const
