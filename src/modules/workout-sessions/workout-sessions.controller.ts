import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkoutSessionsService } from './workout-sessions.service';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';
import { QueryWorkoutSessionDto } from './dto/query-workout-session.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workout-sessions')
@ApiBearerAuth('access-token')
@Controller('workout-sessions')
export class WorkoutSessionsController {
  constructor(private readonly workoutSessionsService: WorkoutSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List workout sessions for the current user' })
  @ApiResponse({ status: 200, description: 'Paginated list of workout sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryWorkoutSessionDto,
  ) {
    return this.workoutSessionsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single workout session by ID' })
  @ApiParam({ name: 'id', description: 'Workout session UUID' })
  @ApiResponse({ status: 200, description: 'Workout session found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workout session not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workoutSessionsService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workout session' })
  @ApiResponse({ status: 201, description: 'Workout session created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  create(
    @Body() dto: CreateWorkoutSessionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workoutSessionsService.create(dto, userId);
  }

  @Patch(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish a workout session' })
  @ApiParam({ name: 'id', description: 'Workout session UUID' })
  @ApiResponse({ status: 200, description: 'Workout session finished' })
  @ApiResponse({ status: 400, description: 'Session is not in progress' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workout session not found' })
  finish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workoutSessionsService.finish(id, userId);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a workout session' })
  @ApiParam({ name: 'id', description: 'Workout session UUID' })
  @ApiResponse({ status: 200, description: 'Workout session cancelled' })
  @ApiResponse({ status: 400, description: 'Session is not in progress' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workout session not found' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workoutSessionsService.cancel(id, userId);
  }
}
