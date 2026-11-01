import type { HabitResponse } from '@habit/schemas'
import { StreakChip } from './StreakChip'

type Props = {
  habit: HabitResponse
  busy: boolean
  onToggle: (habit: HabitResponse, checked: boolean) => void
  onDelete: (habit: HabitResponse) => void
}

export function HabitRow({ habit, busy, onToggle, onDelete }: Props) {
  return (
    <li className="list-row">
      <label className="checkbox">
        <input
          type="checkbox"
          checked={habit.checkedToday}
          disabled={busy}
          onChange={(e) => onToggle(habit, e.target.checked)}
        />
        {/* 習慣名は文字列として描画する（HTMLとして解釈しない） */}
        <span className="list-row__label">{habit.name}</span>
      </label>
      <StreakChip streak={habit.streak} />
      <button type="button" className="btn btn--destructive btn--sm" disabled={busy} onClick={() => onDelete(habit)}>
        削除
      </button>
    </li>
  )
}
