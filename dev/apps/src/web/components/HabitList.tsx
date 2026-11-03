import type { HabitResponse } from '@habit/zod'
import { HabitRow } from './HabitRow'

/** HabitList の props */
type Props = {
  /** 表示する習慣の一覧 */
  habits: HabitResponse[]
  /** 通信中か。true の間は各行の操作を無効にする */
  busy: boolean
  /** チェックを付けた・外したときに、対象の習慣と新しい状態を通知する */
  onToggle: (habit: HabitResponse, checked: boolean) => void
  /** 削除ボタンが押されたときに、対象の習慣を通知する */
  onDelete: (habit: HabitResponse) => void
}

/**
 * 習慣の一覧を表示する。習慣が無いときは登録を促す案内を出す。
 * 操作は各行から受け取り、そのまま onToggle / onDelete で通知する。
 */
export function HabitList({ habits, busy, onToggle, onDelete }: Props) {
  // 習慣が無いときは案内を出す
  if (habits.length === 0) {
    return <p className="empty">最初の習慣を登録しよう</p>
  }
  return (
    <ul className="list">
      {habits.map((h) => (
        <HabitRow key={h.id} habit={h} busy={busy} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  )
}
