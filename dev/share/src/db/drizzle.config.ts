import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit の設定。
 * DDLが正本。schema.ts は `drizzle-kit pull` でDBから生成する。
 */
export default defineConfig({
  /** 対象のDBの種類 */
  dialect: "postgresql",
  /** pull の出力先 */
  out: "./db/pull",
  /** 接続情報。環境変数 DATABASE_URL から受け取る（未設定なら空文字） */
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
