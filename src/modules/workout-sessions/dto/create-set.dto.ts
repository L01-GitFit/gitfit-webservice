import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { UpsertExerciseDto } from '../../exercises/dto/upsert-exercise.dto';

export class CreateSetDto {
  @ApiProperty({ description: 'Full exercise data from ExerciseDB' })
  @ValidateNested()
  @Type(() => UpsertExerciseDto)
  exercise!: UpsertExerciseDto;

  @ApiProperty({ example: 1 })
  @IsInt()
  setNumber!: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  reps?: number;

  @ApiPropertyOptional({ example: 80.5 })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsInt()
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  distanceMeters?: number;

  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rpe?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isWarmup?: boolean;
}
