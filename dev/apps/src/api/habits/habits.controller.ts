import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import {
  createHabitRequestSchema,
  dateField,
  habitIdField,
  toggleCheckParamsSchema,
  versionQuerySchema,
  type CreateHabitRequest,
  type ToggleCheckParams,
  type VersionQuery,
} from "@habit/zod";
import { TxnId } from "../common/txn-context.interceptor";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { HabitsService } from "./habits.service";

/**
 * 習慣のHTTPエンドポイント（/api/habits）。
 * 入力の検証は ZodValidationPipe で行い、業務処理は HabitsService に任せる。
 */
@Controller("habits")
export class HabitsController {
  /**
   * @param service 習慣の業務処理
   */
  constructor(
    /** 習慣の業務処理 */
    private readonly service: HabitsService,
  ) {}

  /**
   * 習慣の一覧を返す（GET /habits?today=YYYY-MM-DD）。
   *
   * @param today 利用者側の今日の日付
   * @returns 習慣の一覧（チェック状況とストリーク付き）
   */
  @Get()
  list(@Query("today", new ZodValidationPipe(dateField)) today: string) {
    return this.service.list(today);
  }

  /**
   * 習慣を作成する（POST /habits）。
   *
   * @param body 作成リクエスト（習慣名）
   * @param txnId このリクエストのtxn_id
   * @returns 作成した習慣
   */
  @Post()
  create(@Body(new ZodValidationPipe(createHabitRequestSchema)) body: CreateHabitRequest, @TxnId() txnId: string) {
    return this.service.create(body.name, txnId);
  }

  /**
   * 習慣を削除する（DELETE /habits/:id?rowVersion=N）。成功時は204で本文なし。
   *
   * @param id 習慣のID
   * @param query 読んだ時点の row_version（楽観的ロック用）
   * @param txnId このリクエストのtxn_id
   */
  @Delete(":id")
  @HttpCode(204)
  async remove(
    @Param("id", new ZodValidationPipe(habitIdField)) id: string,
    @Query(new ZodValidationPipe(versionQuerySchema)) query: VersionQuery,
    @TxnId() txnId: string,
  ) {
    await this.service.delete(id, query.rowVersion, txnId);
  }

  /**
   * 指定日にチェックを付ける（PUT /habits/:id/checks/:date?rowVersion=N）。
   * 付与は冪等で、すでにチェック済みでも成功する。
   *
   * @param params 習慣のIDとチェックする日付
   * @param query 読んだ時点の row_version（楽観的ロック用）
   * @param txnId このリクエストのtxn_id
   * @returns 更新後の row_version
   */
  @Put(":id/checks/:date")
  check(
    @Param(new ZodValidationPipe(toggleCheckParamsSchema)) params: ToggleCheckParams,
    @Query(new ZodValidationPipe(versionQuerySchema)) query: VersionQuery,
    @TxnId() txnId: string,
  ) {
    return this.service.setCheck(params.id, params.date, true, query.rowVersion, txnId);
  }

  /**
   * 指定日のチェックを外す（DELETE /habits/:id/checks/:date?rowVersion=N）。
   * 解除は冪等で、チェックが無くても成功する。
   *
   * @param params 習慣のIDとチェックを外す日付
   * @param query 読んだ時点の row_version（楽観的ロック用）
   * @param txnId このリクエストのtxn_id
   * @returns 更新後の row_version
   */
  @Delete(":id/checks/:date")
  uncheck(
    @Param(new ZodValidationPipe(toggleCheckParamsSchema)) params: ToggleCheckParams,
    @Query(new ZodValidationPipe(versionQuerySchema)) query: VersionQuery,
    @TxnId() txnId: string,
  ) {
    return this.service.setCheck(params.id, params.date, false, query.rowVersion, txnId);
  }
}
