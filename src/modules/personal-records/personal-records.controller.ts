import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PersonalRecordsService } from './personal-records.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('personal-records')
@ApiBearerAuth('access-token')
@Controller('personal-records')
export class PersonalRecordsController {
  constructor(private readonly personalRecordsService: PersonalRecordsService) {}

  @Get()
  @ApiOperation({ summary: "Get all personal records for the current user" })
  @ApiQuery({ name: 'exerciseId', required: false })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('exerciseId') exerciseId?: string,
  ) {
    return this.personalRecordsService.findAll(userId, exerciseId);
  }

  @Get(':exerciseId')
  @ApiOperation({ summary: 'Get personal records for a specific exercise' })
  @ApiParam({ name: 'exerciseId', description: 'Exercise UUID' })
  findByExercise(
    @CurrentUser('id') userId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    return this.personalRecordsService.findByExercise(userId, exerciseId);
  }
}
