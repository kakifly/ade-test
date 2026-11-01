import { Module } from "@nestjs/common";
import { HabitsController } from "./habits.controller";
import { HabitsRepository } from "./habits.repository";
import { HabitsService } from "./habits.service";

@Module({
  controllers: [HabitsController],
  providers: [HabitsRepository, HabitsService],
})
export class HabitsModule {}
