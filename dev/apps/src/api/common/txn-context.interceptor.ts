import { randomUUID } from "node:crypto";
import {
  createParamDecorator,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";

/**
 * リクエストごとにUUIDを発行するインターセプタ。
 * 変更系の処理は、これを app.txn_id に設定して txn_id として記録する。
 */
@Injectable()
export class TxnContextInterceptor implements NestInterceptor {
  /**
   * リクエストに txnId を付けてから、後続の処理へ進める。
   *
   * @param context 実行コンテキスト
   * @param next 後続の処理
   * @returns 後続の処理の結果
   */
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<{ txnId?: string }>();
    req.txnId = randomUUID();
    return next.handle();
  }
}

/**
 * コントローラの引数で、リクエストの txn_id を受け取るデコレータ。
 * TxnContextInterceptor が先に txnId を設定している前提。
 */
export const TxnId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  return context.switchToHttp().getRequest<{ txnId: string }>().txnId;
});
