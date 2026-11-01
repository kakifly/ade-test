import { Injectable } from "@nestjs/common";
import { calcStreak, isWithinServerWindow } from "@habit/core";
import type { HabitResponse } from "@habit/schemas";
import { AppError } from "../common/app-error";
import { HabitsRepository } from "./habits.repository";

@Injectable()
export class HabitsService {
  constructor(private readonly repo: HabitsRepository) {}

  async list(today: string, now: Date = new Date()): Promise<HabitResponse[]> {
    // today がサーバーのUTC日付の前後1日を外れていたら400にする
    if (!isWithinServerWindow(today, now)) {
      throw new AppError(400, "VALIDATION_ERROR", "今日の日付が許可範囲外です");
    }
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

  async create(name: string, txnId: string): Promise<HabitResponse> {
    const row = await this.repo.create(name, txnId);
    return { ...row, checkedToday: false, streak: 0 };
  }

  async delete(id: string, rowVersion: number, txnId: string): Promise<void> {
    const result = await this.repo.deleteVersioned(id, rowVersion, txnId);
    this.throwIfFailed(result);
  }

  async setCheck(
    id: string,
    date: string,
    checked: boolean,
    rowVersion: number,
    txnId: string,
    now: Date = new Date(),
  ): Promise<{ rowVersion: number }> {
    // チェック日付がサーバーのUTC日付の前後1日を外れていたら422にする
    if (!isWithinServerWindow(date, now)) {
      throw new AppError(422, "DATE_NOT_ALLOWED", "その日付はチェックできません");
    }
    const result = await this.repo.setCheck(id, date, checked, rowVersion, txnId);
    this.throwIfFailed(result.status);
    // ここに来るのは ok のときだけ
    return { rowVersion: (result as { rowVersion: number }).rowVersion };
  }

  // リポジトリの結果を、対応するエラーに変換する
  private throwIfFailed(status: string): void {
    // 対象が無い
    if (status === "not_found") throw new AppError(404, "NOT_FOUND", "習慣が見つかりません");
    // バージョンが古い
    if (status === "conflict") {
      throw new AppError(409, "VERSION_CONFLICT", "他の操作で更新されています。最新の状態を再取得してください");
    }
  }
}
