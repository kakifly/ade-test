import type { ErrorCode } from "@habit/schemas";

// 業務上のエラー。HTTPステータスとエラーコードを持つ（フィルタが errorResponseSchema の形に変換する）
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
