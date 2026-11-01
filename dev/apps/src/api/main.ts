import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ErrorFilter } from "./common/error.filter";
import { TxnContextInterceptor } from "./common/txn-context.interceptor";

// アプリを作る（テストからも使う）
export async function createApp(databaseUrl: string) {
  const app = await NestFactory.create(AppModule.register(databaseUrl), { logger: ["error", "warn"] });
  app.setGlobalPrefix("api");
  app.useGlobalInterceptors(new TxnContextInterceptor());
  app.useGlobalFilters(new ErrorFilter());
  return app;
}

// 直接実行されたときだけ起動する
if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  // 接続先が無ければ起動しない
  if (!url) throw new Error("DATABASE_URL が未設定です");
  const app = await createApp(url);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API を起動しました: ポート ${port}`);
}
