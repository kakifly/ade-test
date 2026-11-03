import { Module } from "@nestjs/common";
import { HabitsController } from "./habits.controller";
import { HabitsRepository } from "./habits.repository";
import { HabitsService } from "./habits.service";

/** 習慣の一覧・作成・削除・チェックを扱うモジュール。 */
@Module({
  controllers: [HabitsController],
  providers: [HabitsRepository, HabitsService],
})
export class HabitsModule {}
