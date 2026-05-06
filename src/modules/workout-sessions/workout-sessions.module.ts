import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { WorkoutSessionsController } from './workout-sessions.controller';
import { WorkoutSessionsService } from './workout-sessions.service';

@Module({
  imports: [ExercisesModule],
  controllers: [WorkoutSessionsController],
  providers: [WorkoutSessionsService],
  exports: [WorkoutSessionsService],
})
export class WorkoutSessionsModule {}
