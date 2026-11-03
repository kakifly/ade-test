import type { ErrorCode } from "@habit/zod";

/**
 * 業務上のエラー。HTTPステータスとエラーコードを持つ。
 * ErrorFilter が errorResponseSchema の形に変換して返す。
 */
export class AppError extends Error {
  /**
   * @param status HTTPステータスコード
   * @param code エラーコード（@habit/zod の ErrorCode）
   * @param message 利用者に見せるメッセージ
   */
  constructor(
    /** HTTPステータスコード（例: 400, 404, 409, 422） */
    readonly status: number,
    /** 画面側が判別に使うエラーコード */
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
