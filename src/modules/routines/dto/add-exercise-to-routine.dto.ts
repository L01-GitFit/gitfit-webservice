import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UpsertExerciseDto } from '../../exercises/dto/upsert-exercise.dto';

export class AddExerciseToRoutineDto {
  @ApiProperty({ description: 'Full exercise data from ExerciseDB' })
  @ValidateNested()
  @Type(() => UpsertExerciseDto)
  exercise!: UpsertExerciseDto;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  sets?: number;

  @ApiPropertyOptional({ example: '8-12' })
  @IsOptional()
  @IsString()
  repsTarget?: string;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  weightTarget?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  restSeconds?: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  orderIndex!: number;
}
