import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "../../../src/api/db/client";
import { createApp } from "../../../src/api/main";

// 結合テスト: habit_app_test に対してHTTPで検証する。実行前に `pnpm run db:apply:test` でDDLを適用しておく
async function loadTestUrl(): Promise<string | undefined> {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const envFile = Bun.file(new URL("../../../src/api/.env", import.meta.url));
  // .env が無ければ未設定として扱う
  if (!(await envFile.exists())) return undefined;
  const line = (await envFile.text()).split("\n").find((l) => l.startsWith("TEST_DATABASE_URL="));
  return line?.slice("TEST_DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

const url = await loadTestUrl();
if (!url) throw new Error("TEST_DATABASE_URL が未設定です");

const sql = createDb(url).$client;
let app: Awaited<ReturnType<typeof createApp>>;
let base: string;

// サーバーのUTC日付（許可範囲の基準）
const today = new Date().toISOString().slice(0, 10);

beforeAll(async () => {
  app = await createApp(url);
  await app.listen(0); // ランダムポート
  base = `${await app.getUrl()}/api/habits`.replace("[::1]", "localhost");
});
afterAll(async () => {
  await app.close();
  await sql.end();
});
beforeEach(async () => {
  await sql`truncate habit_checks, habits`;
});

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : undefined };
}
const create = (name: string) => call("POST", "", { name });
const check = (id: string, v: number, date = today) => call("PUT", `/${id}/checks/${date}?rowVersion=${v}`);

describe("習慣API", () => {
  test("作成すると201で、一覧に rowVersion が含まれる", async () => {
    const created = await create("読書");
    expect(created.status).toBe(201);
    expect(created.json).toMatchObject({ name: "読書", checkedToday: false, streak: 0, rowVersion: 1 });
    const list = await call("GET", `?today=${today}`);
    expect(list.status).toBe(200);
    expect(list.json).toHaveLength(1);
    expect(list.json[0].rowVersion).toBe(1);
  });

  test("空・51文字の名前は400 VALIDATION_ERROR", async () => {
    for (const name of ["", "   ", "あ".repeat(51)]) {
      const r = await create(name);
      expect(r.status).toBe(400);
      expect(r.json.error.code).toBe("VALIDATION_ERROR");
    }
  });

  test("同名は409 DUPLICATE_NAME（前後空白つきも）", async () => {
    await create("読書");
    for (const name of ["読書", "  読書  "]) {
      const r = await create(name);
      expect(r.status).toBe(409);
      expect(r.json.error.code).toBe("DUPLICATE_NAME");
    }
  });

  test("today が不正・範囲外なら400", async () => {
    expect((await call("GET", "")).status).toBe(400);
    expect((await call("GET", "?today=2000-01-01")).status).toBe(400);
  });

  test("チェック付与は200と新しい rowVersion、一覧に反映される", async () => {
    const { json: h } = await create("読書");
    const r = await check(h.id, h.rowVersion);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ rowVersion: 2 });
    const list = await call("GET", `?today=${today}`);
    expect(list.json[0]).toMatchObject({ checkedToday: true, streak: 1, rowVersion: 2 });
  });

  test("古い rowVersion では409 VERSION_CONFLICT で、データは変わらない", async () => {
    const { json: h } = await create("読書");
    await check(h.id, 1);
    const r = await check(h.id, 1, today);
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe("VERSION_CONFLICT");
    const [row] = await sql`select row_version::int as v from habits`;
    expect(row!.v).toBe(2);
    const del = await call("DELETE", `/${h.id}?rowVersion=1`);
    expect(del.status).toBe(409);
  });

  test("同じ rowVersion で同時に2リクエストすると、片方200・片方409", async () => {
    const { json: h } = await create("読書");
    const results = await Promise.all([check(h.id, 1), check(h.id, 1)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  test("存在しないIDは404、削除済み習慣へのチェックも404", async () => {
    const ghost = "99999999-9999-4999-8999-999999999999";
    expect((await check(ghost, 1)).status).toBe(404);
    expect((await call("DELETE", `/${ghost}?rowVersion=1`)).status).toBe(404);
    const { json: h } = await create("読書");
    expect((await call("DELETE", `/${h.id}?rowVersion=1`)).status).toBe(204);
    const r = await check(h.id, 1);
    expect(r.status).toBe(404);
    expect(r.json.error.code).toBe("NOT_FOUND");
  });

  test("同じチェックを最新バージョンで再送しても二重にならない", async () => {
    const { json: h } = await create("読書");
    const first = await check(h.id, 1);
    const second = await check(h.id, first.json.rowVersion);
    expect(second.status).toBe(200);
    const [{ n }] = (await sql`select count(*)::int as n from habit_checks`) as [{ n: number }];
    expect(n).toBe(1);
  });

  test("チェック解除は無くても成功する", async () => {
    const { json: h } = await create("読書");
    const r = await call("DELETE", `/${h.id}/checks/${today}?rowVersion=1`);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ rowVersion: 2 });
    const c = await check(h.id, 2);
    const u = await call("DELETE", `/${h.id}/checks/${today}?rowVersion=${c.json.rowVersion}`);
    expect(u.status).toBe(200);
    const [{ n }] = (await sql`select count(*)::int as n from habit_checks`) as [{ n: number }];
    expect(n).toBe(0);
  });

  test("許可範囲外の日付は422 DATE_NOT_ALLOWED", async () => {
    const { json: h } = await create("読書");
    const r = await check(h.id, 1, "2000-01-01");
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe("DATE_NOT_ALLOWED");
  });

  test("不正な日付・rowVersion は400", async () => {
    const { json: h } = await create("読書");
    expect((await check(h.id, 1, "2026-02-30")).status).toBe(400);
    expect((await call("PUT", `/${h.id}/checks/${today}`)).status).toBe(400);
    expect((await call("PUT", `/${h.id}/checks/${today}?rowVersion=abc`)).status).toBe(400);
  });

  test("削除すると習慣とチェックが消える", async () => {
    const { json: h } = await create("読書");
    const c = await check(h.id, 1);
    const r = await call("DELETE", `/${h.id}?rowVersion=${c.json.rowVersion}`);
    expect(r.status).toBe(204);
    const [{ n }] = (await sql`select count(*)::int as n from habit_checks`) as [{ n: number }];
    expect(n).toBe(0);
    expect((await call("GET", `?today=${today}`)).json).toEqual([]);
  });

  test("A-11: 1回の操作で更新した全行の txn_id が一致し、row_version が+1される", async () => {
    const { json: h } = await create("読書");
    await check(h.id, 1);
    const [habit] = await sql`select txn_id, row_version::int as v from habits`;
    const [chk] = await sql`select txn_id, row_version::int as v from habit_checks`;
    expect(habit!.v).toBe(2);
    expect(chk!.v).toBe(1);
    expect(habit!.txn_id).toBe(chk!.txn_id);
    expect(habit!.txn_id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
