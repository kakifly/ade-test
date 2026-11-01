import { describe, expect, test } from "bun:test";
import { AppError } from "../../../src/api/common/app-error";
import type { HabitsRepository, HabitWithChecks } from "../../../src/api/habits/habits.repository";
import { HabitsService } from "../../../src/api/habits/habits.service";

const NOW = new Date("2026-11-01T12:00:00Z");
const ID = "11111111-1111-4111-8111-111111111111";

// 偽のリポジトリ。呼ばれた引数を記録し、決めた結果を返す
function makeService(opts: { habits?: HabitWithChecks[]; setCheck?: unknown; del?: string } = {}) {
  const calls: unknown[][] = [];
  const repo = {
    listWithChecks: async () => opts.habits ?? [],
    create: async (name: string) => ({ id: ID, name, createdAt: "2026-11-01T00:00:00.000Z", rowVersion: 1 }),
    deleteVersioned: async (...a: unknown[]) => (calls.push(a), opts.del ?? "deleted"),
    setCheck: async (...a: unknown[]) => (calls.push(a), opts.setCheck ?? { status: "ok", rowVersion: 2 }),
  } as unknown as HabitsRepository;
  return { service: new HabitsService(repo), calls };
}

async function errorOf(p: Promise<unknown>): Promise<AppError> {
  try {
    await p;
  } catch (e) {
    return e as AppError;
  }
  throw new Error("エラーになるはずが成功した");
}

describe("HabitsService.list", () => {
  test("checkedToday と streak を計算して返す", async () => {
    const { service } = makeService({
      habits: [
        { id: ID, name: "読書", createdAt: "2026-10-01T00:00:00.000Z", rowVersion: 3, checkedDates: ["2026-10-30", "2026-10-31", "2026-11-01"] },
        { id: "22222222-2222-4222-8222-222222222222", name: "運動", createdAt: "2026-10-02T00:00:00.000Z", rowVersion: 1, checkedDates: ["2026-10-31"] },
      ],
    });
    const list = await service.list("2026-11-01", NOW);
    expect(list[0]).toMatchObject({ name: "読書", checkedToday: true, streak: 3, rowVersion: 3 });
    // 今日が未実施でも昨日まで続いていれば連続は維持される
    expect(list[1]).toMatchObject({ name: "運動", checkedToday: false, streak: 1 });
  });

  test("today が許可範囲外なら400 VALIDATION_ERROR", async () => {
    const { service } = makeService();
    const e = await errorOf(service.list("2026-11-05", NOW));
    expect([e.status, e.code]).toEqual([400, "VALIDATION_ERROR"]);
  });
});

describe("HabitsService.create", () => {
  test("checkedToday=false、streak=0 の習慣を返す", async () => {
    const { service } = makeService();
    expect(await service.create("読書", "t")).toMatchObject({ name: "読書", checkedToday: false, streak: 0, rowVersion: 1 });
  });
});

describe("HabitsService.setCheck", () => {
  test("成功したら新しい rowVersion を返す", async () => {
    const { service, calls } = makeService();
    expect(await service.setCheck(ID, "2026-11-01", true, 1, "t", NOW)).toEqual({ rowVersion: 2 });
    expect(calls[0]).toEqual([ID, "2026-11-01", true, 1, "t"]);
  });

  test("日付が許可範囲外なら422 DATE_NOT_ALLOWED（リポジトリは呼ばない）", async () => {
    const { service, calls } = makeService();
    const e = await errorOf(service.setCheck(ID, "2026-11-04", true, 1, "t", NOW));
    expect([e.status, e.code]).toEqual([422, "DATE_NOT_ALLOWED"]);
    expect(calls).toHaveLength(0);
  });

  test("conflict は409 VERSION_CONFLICT、not_found は404 NOT_FOUND", async () => {
    const c = await errorOf(makeService({ setCheck: { status: "conflict" } }).service.setCheck(ID, "2026-11-01", true, 1, "t", NOW));
    expect([c.status, c.code]).toEqual([409, "VERSION_CONFLICT"]);
    const n = await errorOf(makeService({ setCheck: { status: "not_found" } }).service.setCheck(ID, "2026-11-01", true, 1, "t", NOW));
    expect([n.status, n.code]).toEqual([404, "NOT_FOUND"]);
  });
});

describe("HabitsService.delete", () => {
  test("deleted は成功、conflict は409、not_found は404", async () => {
    await makeService().service.delete(ID, 1, "t");
    const c = await errorOf(makeService({ del: "conflict" }).service.delete(ID, 1, "t"));
    expect([c.status, c.code]).toEqual([409, "VERSION_CONFLICT"]);
    const n = await errorOf(makeService({ del: "not_found" }).service.delete(ID, 1, "t"));
    expect([n.status, n.code]).toEqual([404, "NOT_FOUND"]);
  });
});
