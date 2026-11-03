import { Global, Module, type DynamicModule } from "@nestjs/common";
import { DB } from "./common/db";
import { createDb } from "@habit/db";
import { HabitsModule } from "./habits/habits.module";

/**
 * アプリ全体のルートモジュール。
 * DBクライアントを全モジュールから注入できるように、グローバルに公開する。
 */
@Global()
@Module({})
export class AppModule {
  /**
   * 接続先を指定してモジュールを組み立てる。
   * 接続先は呼び出し側から受け取る（本番・開発は DATABASE_URL、テストは TEST_DATABASE_URL）。
   *
   * @param databaseUrl DBの接続URL
   * @returns DBクライアントを提供する動的モジュール
   */
  static register(databaseUrl: string): DynamicModule {
    return {
      module: AppModule,
      imports: [HabitsModule],
      providers: [{ provide: DB, useFactory: () => createDb(databaseUrl) }],
      exports: [DB],
    };
  }
}
