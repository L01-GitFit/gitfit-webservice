import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { WorkoutSessionsModule } from './modules/workout-sessions/workout-sessions.module';
import { WorkoutSetsModule } from './modules/workout-sets/workout-sets.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { RoutinesModule } from './modules/routines/routines.module';
import { PersonalRecordsModule } from './modules/personal-records/personal-records.module';
import { StatsModule } from './modules/stats/stats.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ExercisesModule,
    WorkoutSessionsModule,
    WorkoutSetsModule,
    ProgramsModule,
    RoutinesModule,
    PersonalRecordsModule,
    StatsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
