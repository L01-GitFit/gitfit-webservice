import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkoutSetDto {
  @ApiProperty({ description: 'Exercise UUID', example: 'uuid-of-exercise' })
  @IsUUID()
  exerciseId!: string;

  @ApiProperty({ description: 'Set number (order within this exercise)', example: 1 })
  @IsInt()
  @Min(1)
  setNumber!: number;

  @ApiPropertyOptional({ description: 'Number of reps', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reps?: number;

  @ApiPropertyOptional({ description: 'Weight in kg', example: 60.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Duration in seconds (for timed exercises)', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Distance in meters (for cardio exercises)', example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceMeters?: number;

  @ApiPropertyOptional({ description: 'Rate of Perceived Exertion (1-10)', example: 7 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rpe?: number;

  @ApiPropertyOptional({ description: 'Whether this is a warm-up set', default: false })
  @IsOptional()
  @IsBoolean()
  isWarmup?: boolean;
}

export class CreateWorkoutSessionDto {
  @ApiProperty({
    description: 'Session name',
    example: 'Morning Push Day',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Routine UUID (if starting from a routine)',
    example: 'uuid-of-routine',
  })
  @IsOptional()
  @IsUUID()
  routineId?: string;

  @ApiPropertyOptional({
    description: 'Session notes',
    example: 'Felt strong today',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Initial workout sets to log',
    type: [CreateWorkoutSetDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutSetDto)
  sets?: CreateWorkoutSetDto[];
}
