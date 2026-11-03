import { Catch, HttpException, Logger, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { ErrorResponse } from "@habit/zod";
import { AppError } from "./app-error";

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<{ status(n: number): { json(b: unknown): void } }>();

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
