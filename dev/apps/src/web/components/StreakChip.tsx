/** 連続日数のチップ。0日は目立たない表示（Filter）、1日以上は Status Success */
export function StreakChip({ streak }: { streak: number }) {
  // 0日のときは目立たせない
  const variant = streak > 0 ? 'chip chip--success' : 'chip chip--filter'
  return <span className={variant}>{streak}日</span>
}
