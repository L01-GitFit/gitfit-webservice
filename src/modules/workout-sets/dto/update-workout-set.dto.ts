import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class UpdateWorkoutSetDto {
  @ApiPropertyOptional({
    description: 'Set number (order within this exercise)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  setNumber?: number;

  @ApiPropertyOptional({
    description: 'Number of reps',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reps?: number;

  @ApiPropertyOptional({
    description: 'Weight in kg',
    example: 60.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @ApiPropertyOptional({
    description: 'Duration in seconds (for timed exercises)',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({
    description: 'Distance in meters (for cardio exercises)',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceMeters?: number;

  @ApiPropertyOptional({
    description: 'Rate of Perceived Exertion (1-10)',
    example: 7,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  rpe?: number;

  @ApiPropertyOptional({
    description: 'Whether this is a warm-up set',
  })
  @IsOptional()
  @IsBoolean()
  isWarmup?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is a personal record',
  })
  @IsOptional()
  @IsBoolean()
  isPr?: boolean;
}
