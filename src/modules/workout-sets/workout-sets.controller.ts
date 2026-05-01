import {
  Body,
  Controller,
  Delete,
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
import { WorkoutSetsService } from './workout-sets.service';
import { CreateWorkoutSetDto } from './dto/create-workout-set.dto';
import { UpdateWorkoutSetDto } from './dto/update-workout-set.dto';
import { QueryWorkoutSetDto } from './dto/query-workout-set.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workout-sets')
@ApiBearerAuth('access-token')
@Controller('workout-sessions/:sessionId/workout-sets')
export class WorkoutSetsController {
  constructor(private readonly workoutSetsService: WorkoutSetsService) {}

  @Get()
  @ApiOperation({ summary: 'List workout sets for a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Workout session UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of workout sets' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workout session not found' })
  findAll(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryWorkoutSetDto,
  ) {
    return this.workoutSetsService.findAll(sessionId, userId, query);
  }

  @Get(':setId')
  @ApiOperation({ summary: 'Get a single workout set by ID' })
  @ApiParam({ name: 'sessionId', description: 'Workout session UUID' })
  @ApiParam({ name: 'setId', description: 'Workout set UUID' })
  @ApiResponse({ status: 200, description: 'Workout set found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workout set or session not found' })
  findOne(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workoutSetsService.findOne(sessionId, setId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new workout set to a session' })
  @ApiParam({ name: 'sessionId', description: 'Workout session UUID' })
  @ApiResponse({ status: 201, description: 'Workout set created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workout session or exercise not found' })
  create(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: CreateWorkoutSetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workoutSetsService.create(sessionId, userId, dto);
  }

  @Patch(':setId')
  @ApiOperation({ summary: 'Update a workout set' })
  @ApiParam({ name: 'sessionId', description: 'Workout session UUID' })
  @ApiParam({ name: 'setId', description: 'Workout set UUID' })
  @ApiResponse({ status: 200, description: 'Workout set updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workout set or session not found' })
  update(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
    @Body() dto: UpdateWorkoutSetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workoutSetsService.update(sessionId, setId, userId, dto);
  }

  @Delete(':setId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a workout set' })
  @ApiParam({ name: 'sessionId', description: 'Workout session UUID' })
  @ApiParam({ name: 'setId', description: 'Workout set UUID' })
  @ApiResponse({ status: 200, description: 'Workout set deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workout set or session not found' })
  remove(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workoutSetsService.remove(sessionId, setId, userId);
  }
}
