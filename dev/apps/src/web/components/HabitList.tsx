import type { HabitResponse } from '@habit/zod'
import { HabitRow } from './HabitRow'

type Props = {
  habits: HabitResponse[]
  busy: boolean
  onToggle: (habit: HabitResponse, checked: boolean) => void
  onDelete: (habit: HabitResponse) => void
}

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
