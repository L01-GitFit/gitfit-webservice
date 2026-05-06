import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('stats')
@ApiBearerAuth('access-token')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('weekly-volume')
  @ApiOperation({ summary: 'Total volume per week for the past N weeks' })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  weeklyVolume(
    @CurrentUser('id') userId: string,
    @Query('weeks', new DefaultValuePipe(8), ParseIntPipe) weeks: number,
  ) {
    return this.statsService.weeklyVolume(userId, weeks);
  }

  @Get('exercise-progress/:exerciseId')
  @ApiOperation({ summary: 'Max weight and total volume per day for an exercise' })
  @ApiParam({ name: 'exerciseId', description: 'Exercise UUID' })
  exerciseProgress(
    @CurrentUser('id') userId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    return this.statsService.exerciseProgress(userId, exerciseId);
  }

  @Get('muscle-frequency')
  @ApiOperation({ summary: 'Muscle group hit frequency over the past N days' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  muscleFrequency(
    @CurrentUser('id') userId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.statsService.muscleFrequency(userId, days);
  }

  @Get('workout-streak')
  @ApiOperation({ summary: 'Current and longest workout streaks' })
  workoutStreak(@CurrentUser('id') userId: string) {
    return this.statsService.workoutStreak(userId);
  }
}
