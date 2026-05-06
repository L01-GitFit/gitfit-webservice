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
import { ExercisesService } from './exercises.service';
import { QueryExerciseDto } from './dto/query-exercise.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('exercises')
@ApiBearerAuth('access-token')
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'List exercises with optional filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of exercises' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: QueryExerciseDto) {
    return this.exercisesService.findAll(query);
  }

  // @Post('sync')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Trigger ExerciseDB sync (fetches all exercises and upserts)' })
  // @ApiResponse({ status: 200, description: 'Sync complete' })
  // sync() {
  //   return this.exercisesService.sync();
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single exercise by ID' })
  @ApiParam({ name: 'id', description: 'Exercise UUID' })
  @ApiResponse({ status: 200, description: 'Exercise found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Exercise not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.exercisesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom exercise (owned by current user)' })
  @ApiResponse({ status: 201, description: 'Exercise created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() dto: CreateExerciseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.exercisesService.create(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom exercise (only owner can update)' })
  @ApiParam({ name: 'id', description: 'Exercise UUID' })
  @ApiResponse({ status: 200, description: 'Exercise updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the owner of this exercise' })
  @ApiResponse({ status: 404, description: 'Exercise not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExerciseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.exercisesService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a custom exercise (only owner can delete)' })
  @ApiParam({ name: 'id', description: 'Exercise UUID' })
  @ApiResponse({ status: 200, description: 'Exercise deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the owner of this exercise' })
  @ApiResponse({ status: 404, description: 'Exercise not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.exercisesService.remove(id, userId);
  }
}
