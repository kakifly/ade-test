const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** ローカル日付を `YYYY-MM-DD` にする（UTCではなく端末のローカル日付） */
export function toDateString(d: Date): string {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}

/** `YYYY-MM-DD` に n 日を足した日付を返す（n は負でもよい） */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  // ローカルのコンストラクタで計算し、月またぎ・年またぎ・うるう日をDateに任せる
  return toDateString(new Date(y, m - 1, d + n));
}
