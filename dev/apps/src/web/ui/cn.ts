/**
 * クラス名を空白でつなぐ。false、null、undefined、空文字は取り除く。
 * 同じプロパティを指す複数のユーティリティ（例: bg-primary と bg-surface）を足さないこと。
 * 後ろに書いたほうが勝つとは限らないので、状態ごとにクラスの組を分けて、どちらか一方だけを渡す。
 * @param classes クラス名、または条件が偽のときの値
 * @returns 空白区切りのクラス名
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
