import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Drizzleのクライアントを作る。接続先は呼び出し側が渡す（DATABASE_URL などの環境変数から）
export function createDb(url: string) {
  return drizzle(url, { schema });
}

export type Db = ReturnType<typeof createDb>;
