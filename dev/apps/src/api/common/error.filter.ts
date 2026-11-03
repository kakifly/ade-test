import { Catch, HttpException, Logger, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { ErrorResponse } from "@habit/zod";
import { AppError } from "./app-error";

/**
 * すべての例外を、errorResponseSchema の形のJSON応答に変換するフィルタ。
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  /** 想定外のエラーを記録するロガー */
  private readonly logger = new Logger(ErrorFilter.name);

  /**
   * 例外を応答に変換する。
   *
   * @param exception 投げられた例外
   * @param host リクエスト・レスポンスを取り出すための実行コンテキスト
   */
  catch(exception: unknown, host: ArgumentsHost) {
    // ================================================================
    // 1. 応答オブジェクトの取得
    // ================================================================
    const res = host.switchToHttp().getResponse<{ status(n: number): { json(b: unknown): void } }>();

    // ================================================================
    // 2. 例外の種類ごとに応答を決める
    //    業務エラー、Nest標準の例外、想定外のエラーの順に判定する
    // ================================================================
    // 業務エラーは、持っているステータスとコードで返す
    if (exception instanceof AppError) {
      const body: ErrorResponse = { error: { code: exception.code, message: exception.message } };
      res.status(exception.status).json(body);
      return;
    }
    // Nest標準の例外（存在しないパス、不正なJSONなど）はステータスに応じたコードへ変換する
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body: ErrorResponse = {
        error: {
          code: status === 404 ? "NOT_FOUND" : "VALIDATION_ERROR",
          message: status === 404 ? "対象が見つかりません" : "リクエストが正しくありません",
        },
      };
      res.status(status).json(body);
      return;
    }
    // 想定外のエラー。詳細は応答に出さずログにだけ残す（errorCodes に該当するコードが無いため INTERNAL_ERROR とする）
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "サーバーでエラーが発生しました" } });
  }
}
