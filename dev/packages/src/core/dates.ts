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

/** 日付がサーバーのUTC日付の前後1日以内（3日間）かを返す */
export function isWithinServerWindow(date: string, serverNow: Date): boolean {
  // タイムゾーン差を許容する範囲。日付文字列の大小比較は YYYY-MM-DD ならそのまま正しい
  const utcToday = serverNow.toISOString().slice(0, 10);
  return date >= addDays(utcToday, -1) && date <= addDays(utcToday, 1);
}
