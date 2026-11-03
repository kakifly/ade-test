import { randomUUID } from "node:crypto";
import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { DB } from "../common/db";
import type { Db } from "@habit/db";
import { AppError } from "../common/app-error";

export interface HabitRow {
  id: string;
  name: string;
  createdAt: string;
  rowVersion: number;
}
export type HabitWithChecks = HabitRow & { checkedDates: string[] };
export type VersionedResult = "deleted" | "not_found" | "conflict";
export type SetCheckResult =
  | { status: "ok"; rowVersion: number }
  | { status: "not_found" }
  | { status: "conflict" };

@Injectable()
export class HabitsRepository implements OnModuleDestroy {
  private readonly sql;

  constructor(@Inject(DB) db: Db) {
    // 生SQLはパラメータ化して実行する（postgres.js のタグ付きテンプレート）
    this.sql = db.$client;
  }

  async onModuleDestroy() {
    await this.sql.end();
  }

  // 習慣とチェック履歴を1クエリで読む（バージョンとストリークが矛盾しないスナップショット）
  async listWithChecks(): Promise<HabitWithChecks[]> {
    const rows = await this.sql<
      { id: string; name: string; created_at: string | Date; row_version: number; checked_dates: string[] }[]
    >`
      select h.id, h.name, h.created_at, h.row_version::int as row_version,
             coalesce(array_agg(c.check_date::text order by c.check_date) filter (where c.check_date is not null), '{}') as checked_dates
      from habits h
      left join habit_checks c on c.habit_id = h.id
      group by h.id
      order by h.created_at, h.id
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: new Date(r.created_at).toISOString(),
      rowVersion: r.row_version,
      checkedDates: r.checked_dates,
    }));
  }

  async create(name: string, txnId: string): Promise<HabitRow> {
    const id = randomUUID();
    try {
      return await this.sql.begin(async (tx) => {
        await tx`select set_config('app.txn_id', ${txnId}, true)`;
        const [row] = await tx<{ id: string; name: string; created_at: string | Date; row_version: number }[]>`
          insert into habits (id, name, created_at) values (${id}, ${name}, now())
          returning id, name, created_at, row_version::int as row_version
        `;
        return { id: row!.id, name: row!.name, createdAt: new Date(row!.created_at).toISOString(), rowVersion: row!.row_version };
      });
    } catch (e) {
      // 一意制約違反（同名）は409 DUPLICATE_NAME に変換する。それ以外は上位に任せる
      if ((e as { code?: string }).code === "23505") {
        throw new AppError(409, "DUPLICATE_NAME", "同じ名前の習慣がすでにあります");
      }
      throw e;
    }
  }

  async deleteVersioned(id: string, rowVersion: number, txnId: string): Promise<VersionedResult> {
    return this.sql.begin(async (tx) => {
      await tx`select set_config('app.txn_id', ${txnId}, true)`;
      const deleted = await tx`delete from habits where id = ${id} and row_version = ${rowVersion} returning id`;
      // 1行消えたら成功
      if (deleted.length > 0) return "deleted";
      // 0行のとき: 対象が無ければ404、あるのにバージョンが違えば409
      const exists = await tx`select 1 from habits where id = ${id}`;
      return exists.length > 0 ? "conflict" : "not_found";
    });
  }

  async setCheck(
    id: string,
    date: string,
    checked: boolean,
    rowVersion: number,
    txnId: string,
  ): Promise<SetCheckResult> {
    return this.sql.begin(async (tx) => {
      await tx`select set_config('app.txn_id', ${txnId}, true)`;
      // 親の習慣を更新扱いにして、バージョンを確認する（トリガが row_version を+1する）
      const updated = await tx<{ row_version: number }[]>`
        update habits set name = name where id = ${id} and row_version = ${rowVersion}
        returning row_version::int as row_version
      `;
      // 0行のとき: 対象が無ければ404、あるのにバージョンが違えば409（変更が無いので何も残らない）
      if (updated.length === 0) {
        const exists = await tx`select 1 from habits where id = ${id}`;
        return exists.length > 0 ? ({ status: "conflict" } as const) : ({ status: "not_found" } as const);
      }
      if (checked) {
        // 付与は二重に記録しない（冪等）
        await tx`insert into habit_checks (habit_id, check_date) values (${id}, ${date}) on conflict do nothing`;
      } else {
        // 解除は、無くても成功とする
        await tx`delete from habit_checks where habit_id = ${id} and check_date = ${date}`;
      }
      return { status: "ok", rowVersion: updated[0]!.row_version } as const;
    });
  }
}
