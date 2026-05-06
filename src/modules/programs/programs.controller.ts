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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('programs')
@ApiBearerAuth('access-token')
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @ApiOperation({ summary: "List user's programs" })
  findAll(@CurrentUser('id') userId: string) {
    return this.programsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a program' })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateProgramDto, @CurrentUser('id') userId: string) {
    return this.programsService.create(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a program by ID' })
  @ApiParam({ name: 'id', description: 'Program UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.programsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a program' })
  @ApiParam({ name: 'id', description: 'Program UUID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.programsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a program' })
  @ApiParam({ name: 'id', description: 'Program UUID' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.programsService.remove(id, userId);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a program (deactivates all others)' })
  @ApiParam({ name: 'id', description: 'Program UUID' })
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.programsService.activate(id, userId);
  }
}
