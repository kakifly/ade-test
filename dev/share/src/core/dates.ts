/**
 * 数値を指定の桁数にゼロ埋めした文字列にする。
 * @param n 対象の数値
 * @param width 桁数
 * @returns ゼロ埋め後の文字列（例: `pad(3, 2)` は `"03"`）
 */
const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/**
 * ローカル日付を `YYYY-MM-DD` にする（UTCではなく端末のローカル日付）。
 * @param d 変換する日時
 * @returns `YYYY-MM-DD` 形式の日付文字列
 */
export function toDateString(d: Date): string {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}

/**
 * `YYYY-MM-DD` に n 日を足した日付を返す（n は負でもよい）。
 * @param dateStr 基準の日付（`YYYY-MM-DD`）
 * @param n 足す日数。負の値で過去へ戻る
 * @returns n 日後（n が負なら n 日前）の `YYYY-MM-DD`
 */
export function addDays(dateStr: string, n: number): string {
  // ================================================================
  // 1. 日付文字列を年・月・日の数値に分解する
  // ================================================================
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];

  // ================================================================
  // 2. n 日を足して、日付文字列に戻す
  //    ローカルのコンストラクタで計算し、月またぎ・年またぎ・うるう日をDateに任せる
  // ================================================================
  return toDateString(new Date(y, m - 1, d + n));
}

/**
 * 日付がサーバーのUTC日付の前後1日以内（3日間）かを返す。
 * @param date 判定する日付（`YYYY-MM-DD`）
 * @param serverNow サーバーの現在日時
 * @returns 範囲内なら true
 */
export function isWithinServerWindow(date: string, serverNow: Date): boolean {
  // ================================================================
  // 1. サーバーのUTC日付を求める
  // ================================================================
  const utcToday = serverNow.toISOString().slice(0, 10);

  // ================================================================
  // 2. UTC日付の前後1日の範囲に入っているかを判定する
  //    タイムゾーン差を許容する範囲。日付文字列の大小比較は YYYY-MM-DD ならそのまま正しい
  // ================================================================
  return date >= addDays(utcToday, -1) && date <= addDays(utcToday, 1);
}
