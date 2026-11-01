import { Global, Module, type DynamicModule } from "@nestjs/common";
import { DB } from "./common/db";
import { createDb } from "./db/client";
import { HabitsModule } from "./habits/habits.module";

@Global()
@Module({})
export class AppModule {
  // 接続先を呼び出し側から受け取る（本番・開発は DATABASE_URL、テストは TEST_DATABASE_URL）
  static register(databaseUrl: string): DynamicModule {
    return {
      module: AppModule,
      imports: [HabitsModule],
      providers: [{ provide: DB, useFactory: () => createDb(databaseUrl) }],
      exports: [DB],
    };
  }
}
