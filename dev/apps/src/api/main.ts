import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ErrorFilter } from "./common/error.filter";
import { TxnContextInterceptor } from "./common/txn-context.interceptor";

/**
 * Nestアプリを作る。テストからも使う。
 * パスの接頭辞 `api`、txn_id の発行、エラー応答の整形をここで設定する。
 *
 * @param databaseUrl DBの接続URL
 * @returns 作成したアプリ（まだ listen していない）
 */
export async function createApp(databaseUrl: string) {
  // ================================================================
  // 1. アプリの生成
  // ================================================================
  const app = await NestFactory.create(AppModule.register(databaseUrl), { logger: ["error", "warn"] });

  // ================================================================
  // 2. 全体の設定
  //    全パスを /api 配下にし、リクエストごとの txn_id 発行とエラー整形を全ルートに適用する
  // ================================================================
  app.setGlobalPrefix("api");
  app.useGlobalInterceptors(new TxnContextInterceptor());
  app.useGlobalFilters(new ErrorFilter());
  return app;
}

// ================================================================
// 起動処理
//   直接実行されたときだけ起動する（テストから import されたときは起動しない）
// ================================================================
if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  // 接続先が無ければ起動しない
  if (!url) throw new Error("DATABASE_URL が未設定です");
  const app = await createApp(url);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API を起動しました: ポート ${port}`);
}
