import type { HabitResponse } from '@habit/zod'
import { StreakChip } from './StreakChip'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'

/** HabitRow の props */
type Props = {
  /** 表示する習慣 */
  habit: HabitResponse
  /** 通信中か。true の間はチェックと削除を無効にする */
  busy: boolean
  /** チェックを付けた・外したときに、この習慣と新しい状態を通知する */
  onToggle: (habit: HabitResponse, checked: boolean) => void
  /** 削除ボタンが押されたときに、この習慣を通知する */
  onDelete: (habit: HabitResponse) => void
}

/**
 * 習慣1件分の行を表示する。今日のチェック、連続日数、削除ボタンを並べ、操作は親へ通知する。
 */
export function HabitRow({ habit, busy, onToggle, onDelete }: Props) {
  return (
    <li data-testid="habit-row" className="flex min-h-(--size-list-row) items-center gap-4 border-b border-surface-raised px-4 py-2 last:border-b-0 hover:bg-surface-raised">
      <Checkbox checked={habit.checkedToday} disabled={busy} onChange={(e) => onToggle(habit, e.target.checked)}>
        {/* 習慣名は文字列として描画する（HTMLとして解釈しない） */}
        <span data-testid="habit-label" className="wrap-anywhere text-text">
          {habit.name}
        </span>
      </Checkbox>
      <StreakChip streak={habit.streak} />
      <Button variant="destructive" size="sm" disabled={busy} onClick={() => onDelete(habit)}>
        削除
      </Button>
    </li>
  )
}
