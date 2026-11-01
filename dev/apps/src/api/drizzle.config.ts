import { defineConfig } from "drizzle-kit";

// DDLが正本。schema.ts は `drizzle-kit pull` でDBから生成する
export default defineConfig({
  dialect: "postgresql",
  out: "./db/pull",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
