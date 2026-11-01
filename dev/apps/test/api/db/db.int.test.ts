import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "../../../src/api/db/client";

// 結合テスト: habit_app_test に対してDDL（トリガ・制約）を検証する。
// 実行前に `pnpm run db:apply:test` でDDLを適用しておく。
// 環境変数が無いときは、api の .env から TEST_DATABASE_URL だけを読む
async function loadTestUrl(): Promise<string | undefined> {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const envFile = Bun.file(new URL("../../../src/api/.env", import.meta.url));
  // .env が無ければ未設定として扱う
  if (!(await envFile.exists())) return undefined;
  const line = (await envFile.text())
    .split("\n")
    .find((l) => l.startsWith("TEST_DATABASE_URL="));
  return line?.slice("TEST_DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

const url = await loadTestUrl();
if (!url) throw new Error("TEST_DATABASE_URL が未設定です");

// Drizzleの下にある postgres クライアントを、生SQLのために使う
const sql = createDb(url).$client;

const HABIT_ID = "11111111-1111-4111-8111-111111111111";

async function insertHabit(name = "読書", txn?: string) {
  return sql.begin(async (tx) => {
    // txn が指定されたときだけアプリ発行のtxn_idを設定する
    if (txn) await tx`select set_config('app.txn_id', ${txn}, true)`;
    const [row] = await tx`
      insert into habits (id, name, created_at) values (${HABIT_ID}, ${name}, now())
      returning row_version, txn_id`;
    return row!;
  });
}

beforeEach(async () => {
  await sql`truncate habit_checks, habits cascade`;
});
afterAll(async () => {
  await sql.end();
});

describe("habits のトリガと制約", () => {
  test("INSERTで row_version が1になる", async () => {
    const row = await insertHabit();
    expect(Number(row.row_version)).toBe(1);
  });

  test("set_config した値が txn_id に入る", async () => {
    const row = await insertHabit("読書", "txn-abc");
    expect(row.txn_id).toBe("txn-abc");
  });

  test("UPDATEで row_version が+1される", async () => {
    await insertHabit();
    const [row] = await sql`
      update habits set name = name where id = ${HABIT_ID} and row_version = 1
      returning row_version`;
    expect(Number(row!.row_version)).toBe(2);
  });

  test("UPDATEで row_version = 99 を指定しても+1のまま", async () => {
    await insertHabit();
    const [row] = await sql`
      update habits set row_version = 99 where id = ${HABIT_ID} returning row_version`;
    expect(Number(row!.row_version)).toBe(2);
  });

  test("set_config が無くても txn_id が空でない", async () => {
    const row = await insertHabit();
    expect(row.txn_id).toBeTruthy();
    const [u] = await sql`
      update habits set name = name where id = ${HABIT_ID} returning txn_id`;
    expect(u!.txn_id).toBeTruthy();
  });

  test("古いバージョンのUPDATEは0行", async () => {
    await insertHabit();
    await sql`update habits set name = name where id = ${HABIT_ID}`; // v2
    const rows = await sql`
      update habits set name = '更新' where id = ${HABIT_ID} and row_version = 1 returning id`;
    expect(rows.length).toBe(0);
  });

  test("2接続が同じバージョンで同時に更新すると、片方だけが1行を更新する", async () => {
    await insertHabit();
    const a = await sql.reserve();
    const b = await sql.reserve();
    try {
      await a`begin`;
      await b`begin`;
      // aが先に行ロックを取り、bはロック待ちになる
      const first = await a`
        update habits set name = 'A' where id = ${HABIT_ID} and row_version = 1 returning id`;
      const pendingB = b`
        update habits set name = 'B' where id = ${HABIT_ID} and row_version = 1 returning id`;
      await new Promise((r) => setTimeout(r, 200));
      await a`commit`;
      // aのコミット後、bはWHEREを再評価して0行になる
      const second = await pendingB;
      await b`commit`;
      expect(first.length).toBe(1);
      expect(second.length).toBe(0);
    } finally {
      a.release();
      b.release();
    }
  });

  test("同名の習慣は一意制約で拒否される", async () => {
    await insertHabit("読書");
    await expect(
      sql`insert into habits (id, name, created_at) values (gen_random_uuid(), '読書', now())`.execute(),
    ).rejects.toThrow();
  });
});

describe("habit_checks", () => {
  test("INSERTで row_version=1、txn_id が記録される", async () => {
    await insertHabit();
    const row = await sql.begin(async (tx) => {
      await tx`select set_config('app.txn_id', 'txn-chk', true)`;
      const [r] = await tx`
        insert into habit_checks (habit_id, check_date) values (${HABIT_ID}, '2026-11-01')
        returning row_version, txn_id`;
      return r!;
    });
    expect(Number(row.row_version)).toBe(1);
    expect(row.txn_id).toBe("txn-chk");
  });

  test("習慣を削除するとチェックも消える", async () => {
    await insertHabit();
    await sql`insert into habit_checks (habit_id, check_date) values (${HABIT_ID}, '2026-11-01')`;
    await sql`delete from habits where id = ${HABIT_ID}`;
    const [c] = await sql`select count(*)::int as n from habit_checks`;
    expect(c!.n).toBe(0);
  });

  test("同じ (habit_id, check_date) の ON CONFLICT DO NOTHING を2回行っても1行", async () => {
    await insertHabit();
    for (let i = 0; i < 2; i++) {
      await sql`
        insert into habit_checks (habit_id, check_date) values (${HABIT_ID}, '2026-11-01')
        on conflict do nothing`;
    }
    const [c] = await sql`select count(*)::int as n from habit_checks`;
    expect(c!.n).toBe(1);
  });
});
