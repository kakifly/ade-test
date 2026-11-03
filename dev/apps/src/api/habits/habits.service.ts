import { Injectable } from "@nestjs/common";
import { calcStreak, isWithinServerWindow } from "@habit/core";
import type { HabitResponse } from "@habit/zod";
import { AppError } from "../common/app-error";
import { HabitsRepository } from "./habits.repository";

/**
 * 習慣の業務ルール（日付の許可範囲、ストリーク計算、エラーへの変換）を担当する。
 * DBの読み書きは HabitsRepository に任せる。
 */
@Injectable()
export class HabitsService {
  /**
   * @param repo 習慣のDBアクセス
   */
  constructor(
    /** 習慣のDBアクセス */
    private readonly repo: HabitsRepository,
  ) {}

  /**
   * 習慣の一覧を、今日のチェック状況とストリーク付きで返す。
   *
   * @param today 利用者側の今日の日付（YYYY-MM-DD）
   * @param now サーバーの現在時刻（テストで差し替える）
   * @returns 習慣の一覧
   * @throws AppError today が許可範囲外のとき（400 VALIDATION_ERROR）
   */
  async list(today: string, now: Date = new Date()): Promise<HabitResponse[]> {
    // ================================================================
    // 1. 日付の検証
    // ================================================================
    // today がサーバーのUTC日付の前後1日を外れていたら400にする
    if (!isWithinServerWindow(today, now)) {
      throw new AppError(400, "VALIDATION_ERROR", "今日の日付が許可範囲外です");
    }

    // ================================================================
    // 2. 習慣とチェック履歴の取得、応答の組み立て
    //    チェック履歴から、今日のチェック有無とストリークを計算する
    // ================================================================
    const rows = await this.repo.listWithChecks();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      checkedToday: r.checkedDates.includes(today),
      streak: calcStreak(r.checkedDates, today),
      rowVersion: r.rowVersion,
    }));
  }

  /**
   * 習慣を作成する。作成直後なのでチェック無し・ストリーク0で返す。
   *
   * @param name 習慣名
   * @param txnId このリクエストのtxn_id
   * @returns 作成した習慣
   * @throws AppError 同名の習慣があるとき（409 DUPLICATE_NAME）
   */
  async create(name: string, txnId: string): Promise<HabitResponse> {
    const row = await this.repo.create(name, txnId);
    return { ...row, checkedToday: false, streak: 0 };
  }

  /**
   * 習慣を削除する。
   *
   * @param id 習慣のID
   * @param rowVersion 読んだ時点の row_version
   * @param txnId このリクエストのtxn_id
   * @throws AppError 対象が無いとき（404）、バージョンが古いとき（409 VERSION_CONFLICT）
   */
  async delete(id: string, rowVersion: number, txnId: string): Promise<void> {
    const result = await this.repo.deleteVersioned(id, rowVersion, txnId);
    this.throwIfFailed(result);
  }

  /**
   * 指定日のチェックを付与・解除する。親の習慣の row_version で楽観的ロックをかける。
   *
   * @param id 習慣のID
   * @param date チェックの日付（YYYY-MM-DD）
   * @param checked true なら付与、false なら解除
   * @param rowVersion 読んだ時点の row_version
   * @param txnId このリクエストのtxn_id
   * @param now サーバーの現在時刻（テストで差し替える）
   * @returns 更新後の row_version
   * @throws AppError 日付が許可範囲外（422 DATE_NOT_ALLOWED）、対象が無い（404）、バージョンが古い（409）
   */
  async setCheck(
    id: string,
    date: string,
    checked: boolean,
    rowVersion: number,
    txnId: string,
    now: Date = new Date(),
  ): Promise<{ rowVersion: number }> {
    // ================================================================
    // 1. 日付の検証
    // ================================================================
    // チェック日付がサーバーのUTC日付の前後1日を外れていたら422にする
    if (!isWithinServerWindow(date, now)) {
      throw new AppError(422, "DATE_NOT_ALLOWED", "その日付はチェックできません");
    }

    // ================================================================
    // 2. チェックの付与・解除と、結果のエラー変換
    // ================================================================
    const result = await this.repo.setCheck(id, date, checked, rowVersion, txnId);
    this.throwIfFailed(result.status);
    // ここに来るのは ok のときだけ
    return { rowVersion: (result as { rowVersion: number }).rowVersion };
  }

  /**
   * リポジトリの結果を、対応するエラーに変換する。成功のときは何もしない。
   *
   * @param status リポジトリの結果（ok / deleted / not_found / conflict）
   * @throws AppError not_found のとき404、conflict のとき409 VERSION_CONFLICT
   */
  private throwIfFailed(status: string): void {
    // 対象が無い
    if (status === "not_found") throw new AppError(404, "NOT_FOUND", "習慣が見つかりません");
    // バージョンが古い
    if (status === "conflict") {
      throw new AppError(409, "VERSION_CONFLICT", "他の操作で更新されています。最新の状態を再取得してください");
    }
  }
}
