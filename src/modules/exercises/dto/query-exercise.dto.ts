import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryExerciseDto {
  @ApiPropertyOptional({
    description: 'Filter by body part (e.g. chest, back, legs)',
    example: 'chest',
  })
  @IsOptional()
  @IsString()
  bodyPart?: string;

  @ApiPropertyOptional({
    description: 'Filter by equipment (e.g. barbell, dumbbell)',
    example: 'barbell',
  })
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiPropertyOptional({
    description: 'Filter by target muscle (e.g. pectorals, lats)',
    example: 'pectorals',
  })
  @IsOptional()
  @IsString()
  muscle?: string;

  @ApiPropertyOptional({
    description: 'Search by exercise name (case-insensitive)',
    example: 'bench press',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
