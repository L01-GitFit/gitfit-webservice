import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';

@Module({
  imports: [PrismaModule, ExercisesModule],
  controllers: [RoutinesController],
  providers: [RoutinesService],
})
export class RoutinesModule {}
