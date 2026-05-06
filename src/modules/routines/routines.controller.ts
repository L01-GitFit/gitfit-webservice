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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { AddExerciseToRoutineDto } from './dto/add-exercise-to-routine.dto';
import { UpdateRoutineExerciseDto } from './dto/update-routine-exercise.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('routines')
@ApiBearerAuth('access-token')
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  @ApiOperation({ summary: "List user's routines, optionally filter by programId" })
  @ApiQuery({ name: 'programId', required: false })
  findAll(@CurrentUser('id') userId: string, @Query('programId') programId?: string) {
    return this.routinesService.findAll(userId, programId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a routine' })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateRoutineDto, @CurrentUser('id') userId: string) {
    return this.routinesService.create(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a routine by ID' })
  @ApiParam({ name: 'id', description: 'Routine UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.routinesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a routine' })
  @ApiParam({ name: 'id', description: 'Routine UUID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.routinesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a routine' })
  @ApiParam({ name: 'id', description: 'Routine UUID' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.routinesService.remove(id, userId);
  }

  @Post(':id/exercises')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add exercise to routine (upserts exercise from ExerciseDB if not cached)' })
  @ApiParam({ name: 'id', description: 'Routine ID' })
  @ApiResponse({ status: 201, description: 'Exercise added to routine' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  @ApiBearerAuth('access-token')
  addExercise(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddExerciseToRoutineDto,
  ) {
    return this.routinesService.addExerciseToRoutine(id, userId, dto);
  }

  @Patch(':id/exercises/:exerciseId')
  @ApiOperation({ summary: 'Update an exercise in a routine' })
  @ApiParam({ name: 'id', description: 'Routine UUID' })
  @ApiParam({ name: 'exerciseId', description: 'Exercise UUID' })
  updateExercise(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRoutineExerciseDto,
  ) {
    return this.routinesService.updateExercise(id, exerciseId, userId, dto);
  }

  @Delete(':id/exercises/:exerciseId')
  @ApiOperation({ summary: 'Remove an exercise from a routine' })
  @ApiParam({ name: 'id', description: 'Routine UUID' })
  @ApiParam({ name: 'exerciseId', description: 'Exercise UUID' })
  removeExercise(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.routinesService.removeExercise(id, exerciseId, userId);
  }
}
