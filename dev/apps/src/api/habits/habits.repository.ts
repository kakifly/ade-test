import { randomUUID } from "node:crypto";
import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { DB } from "../common/db";
import type { Db } from "@habit/db";
import { AppError } from "../common/app-error";

/** habits テーブルの1行を、アプリ側の形（キャメルケース）にしたもの。 */
export interface HabitRow {
  /** 習慣のID（UUID） */
  id: string;
  /** 習慣名 */
  name: string;
  /** 作成日時（ISO 8601、UTC） */
  createdAt: string;
  /** 楽観的ロック用のバージョン。更新はDBのトリガが行う */
  rowVersion: number;
}

/** 習慣と、そのチェック済みの日付一覧。 */
export type HabitWithChecks = HabitRow & {
  /** チェック済みの日付（YYYY-MM-DD）。昇順 */
  checkedDates: string[];
};

/** 更新・削除の結果。deleted は成功、not_found は対象なし（404）、conflict はバージョン不一致（409）。 */
export type VersionedResult = "deleted" | "not_found" | "conflict";

/** チェックの付与・解除の結果。ok のときだけ更新後の row_version を持つ。 */
export type SetCheckResult =
  | {
      /** 成功 */
      status: "ok";
      /** 更新後の row_version */
      rowVersion: number;
    }
  | {
      /** 対象の習慣が無い（404） */
      status: "not_found";
    }
  | {
      /** row_version が一致しない（409） */
      status: "conflict";
    };

/**
 * 習慣とチェック履歴のSQLを実行するリポジトリ。
 * 更新・削除は `WHERE row_version = :読んだ値` で楽観的ロックをかけ、
 * 変更系は1トランザクションにまとめて、最初に app.txn_id を設定する。
 */
@Injectable()
export class HabitsRepository implements OnModuleDestroy {
  /** 生SQLを実行するクライアント（postgres.js） */
  private readonly sql;

  /**
   * @param db DBクライアント
   */
  constructor(@Inject(DB) db: Db) {
    // 生SQLはパラメータ化して実行する（postgres.js のタグ付きテンプレート）
    this.sql = db.$client;
  }

  /** アプリ終了時にDB接続を閉じる。 */
  async onModuleDestroy() {
    await this.sql.end();
  }

  /**
   * 習慣とチェック履歴を1クエリで読む。
   * 1クエリなので、バージョンとチェック履歴が矛盾しないスナップショットになる。
   *
   * @returns 習慣の一覧（作成日時の昇順）。チェックの無い習慣は checkedDates が空配列
   */
  async listWithChecks(): Promise<HabitWithChecks[]> {
    // ================================================================
    // 1. 習慣とチェック日付の取得
    //    習慣ごとに、チェック日付を昇順の配列にまとめる。
    //    left join なので、チェックが無い習慣も返る（その場合は空配列）
    // ================================================================
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

    // ================================================================
    // 2. アプリ側の形に変換
    //    created_at は ISO 8601 の文字列にそろえる
    // ================================================================
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: new Date(r.created_at).toISOString(),
      rowVersion: r.row_version,
      checkedDates: r.checked_dates,
    }));
  }

  /**
   * 習慣を1件追加する。
   *
   * @param name 習慣名
   * @param txnId このリクエストのtxn_id
   * @returns 追加した習慣（row_version はトリガが設定した値）
   * @throws AppError 同名の習慣があるとき（409 DUPLICATE_NAME）
   */
  async create(name: string, txnId: string): Promise<HabitRow> {
    const id = randomUUID();
    try {
      return await this.sql.begin(async (tx) => {
        // ================================================================
        // 1. トランザクションIDの設定
        //    トリガが txn_id 列に記録する（true でこのトランザクション内だけ有効）
        // ================================================================
        await tx`select set_config('app.txn_id', ${txnId}, true)`;

        // ================================================================
        // 2. 習慣の追加
        //    row_version と txn_id はトリガが設定する。返った値を応答に使う
        // ================================================================
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

  /**
   * 習慣を、読んだ時点の row_version が一致するときだけ削除する（楽観的ロック）。
   * 紐づくチェック履歴の扱いはDDLの外部キー制約に従う。
   *
   * @param id 習慣のID
   * @param rowVersion 読んだ時点の row_version
   * @param txnId このリクエストのtxn_id
   * @returns deleted（削除した）、not_found（対象なし）、conflict（バージョン不一致）
   */
  async deleteVersioned(id: string, rowVersion: number, txnId: string): Promise<VersionedResult> {
    return this.sql.begin(async (tx) => {
      // ================================================================
      // 1. トランザクションIDの設定
      // ================================================================
      await tx`select set_config('app.txn_id', ${txnId}, true)`;

      // ================================================================
      // 2. バージョン一致の条件つきで削除
      //    id と row_version の両方が一致する行だけ消える
      // ================================================================
      const deleted = await tx`delete from habits where id = ${id} and row_version = ${rowVersion} returning id`;
      // 1行消えたら成功
      if (deleted.length > 0) return "deleted";

      // ================================================================
      // 3. 0行だった理由の判定
      //    id だけで探し直す。対象が無ければ404、あるのにバージョンが違えば409
      // ================================================================
      const exists = await tx`select 1 from habits where id = ${id}`;
      return exists.length > 0 ? "conflict" : "not_found";
    });
  }

  /**
   * 指定日のチェックを付与・解除する。
   * 親の習慣の row_version で楽観的ロックをかけ、一致したときだけチェックを変更する。
   * 付与は二重に記録せず、解除は無くても成功とするので、同じ操作を繰り返しても結果は変わらない。
   *
   * @param id 習慣のID
   * @param date チェックの日付（YYYY-MM-DD）
   * @param checked true なら付与、false なら解除
   * @param rowVersion 読んだ時点の row_version
   * @param txnId このリクエストのtxn_id
   * @returns ok（更新後の row_version つき）、not_found（対象なし）、conflict（バージョン不一致）
   */
  async setCheck(
    id: string,
    date: string,
    checked: boolean,
    rowVersion: number,
    txnId: string,
  ): Promise<SetCheckResult> {
    return this.sql.begin(async (tx) => {
      // ================================================================
      // 1. トランザクションIDの設定
      // ================================================================
      await tx`select set_config('app.txn_id', ${txnId}, true)`;

      // ================================================================
      // 2. 親の習慣のバージョン確認
      //    値を変えない更新（name = name）で、row_version が一致するときだけトリガに +1 させる。
      //    チェックの変更が、親のバージョンで制御される
      // ================================================================
      const updated = await tx<{ row_version: number }[]>`
        update habits set name = name where id = ${id} and row_version = ${rowVersion}
        returning row_version::int as row_version
      `;

      // ================================================================
      // 3. 0行だった場合の判定
      //    id だけで探し直す。対象が無ければ404、あるのにバージョンが違えば409。
      //    チェックはまだ変更していないので、何も残らない
      // ================================================================
      if (updated.length === 0) {
        const exists = await tx`select 1 from habits where id = ${id}`;
        return exists.length > 0 ? ({ status: "conflict" } as const) : ({ status: "not_found" } as const);
      }

      // ================================================================
      // 4. チェックの付与・解除
      // ================================================================
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
