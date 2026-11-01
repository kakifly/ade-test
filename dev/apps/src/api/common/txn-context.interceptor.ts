import { randomUUID } from "node:crypto";
import {
  createParamDecorator,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";

// リクエストごとにUUIDを発行する。変更系の処理は、これを app.txn_id に設定して txn_id として記録する
@Injectable()
export class TxnContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<{ txnId?: string }>();
    req.txnId = randomUUID();
    return next.handle();
  }
}

// コントローラの引数でリクエストのtxn_idを受け取る
export const TxnId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  return context.switchToHttp().getRequest<{ txnId: string }>().txnId;
});
