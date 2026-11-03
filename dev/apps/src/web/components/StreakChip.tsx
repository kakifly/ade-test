import { Chip } from '../ui/Chip'
/** StreakChip の props */
type Props = {
  /** 連続日数 */
  streak: number
}

/**
 * 連続日数のチップを表示する。0日は目立たない表示（Filter）、1日以上は Status Success。
 */
export function StreakChip({ streak }: Props) {
  // 0日のときは目立たせない
  const variant = streak > 0 ? 'success' : 'filter'
  return (
    <Chip variant={variant} data-testid="streak-chip">
      {streak}日
    </Chip>
  )
}
