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

@Controller("habits")
export class HabitsController {
  constructor(private readonly service: HabitsService) {}

  @Get()
  list(@Query("today", new ZodValidationPipe(dateField)) today: string) {
    return this.service.list(today);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createHabitRequestSchema)) body: CreateHabitRequest, @TxnId() txnId: string) {
    return this.service.create(body.name, txnId);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @Param("id", new ZodValidationPipe(habitIdField)) id: string,
    @Query(new ZodValidationPipe(versionQuerySchema)) query: VersionQuery,
    @TxnId() txnId: string,
  ) {
    await this.service.delete(id, query.rowVersion, txnId);
  }

  @Put(":id/checks/:date")
  check(
    @Param(new ZodValidationPipe(toggleCheckParamsSchema)) params: ToggleCheckParams,
    @Query(new ZodValidationPipe(versionQuerySchema)) query: VersionQuery,
    @TxnId() txnId: string,
  ) {
    return this.service.setCheck(params.id, params.date, true, query.rowVersion, txnId);
  }

  @Delete(":id/checks/:date")
  uncheck(
    @Param(new ZodValidationPipe(toggleCheckParamsSchema)) params: ToggleCheckParams,
    @Query(new ZodValidationPipe(versionQuerySchema)) query: VersionQuery,
    @TxnId() txnId: string,
  ) {
    return this.service.setCheck(params.id, params.date, false, query.rowVersion, txnId);
  }
}
