import { Module } from '@nestjs/common';
import { WorkoutSetsController } from './workout-sets.controller';
import { WorkoutSetsService } from './workout-sets.service';

@Module({
  controllers: [WorkoutSetsController],
  providers: [WorkoutSetsService],
  exports: [WorkoutSetsService],
})
export class WorkoutSetsModule {}
