import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Drizzleのクライアントを作る。
 * @param url 接続先のURL。呼び出し側が DATABASE_URL などの環境変数から渡す
 * @returns テーブルオブジェクト（`schema.ts`）を登録済みのDrizzleクライアント
 */
export function createDb(url: string) {
  return drizzle(url, { schema });
}

/** `createDb` が返すDrizzleクライアントの型 */
export type Db = ReturnType<typeof createDb>;
