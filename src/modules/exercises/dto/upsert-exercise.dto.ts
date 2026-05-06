import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpsertExerciseDto {
  @ApiProperty({ example: 'abc123', description: 'Original ID from ExerciseDB' })
  @IsString()
  exerciseDbId!: string;

  @ApiProperty({ example: 'Barbell Bench Press' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/bench.gif' })
  @IsOptional()
  @IsString()
  gifUrl?: string;

  @ApiProperty({ example: ['pectorals'] })
  @IsArray()
  targetMuscles!: string[];

  @ApiProperty({ example: ['chest'] })
  @IsArray()
  bodyParts!: string[];

  @ApiProperty({ example: ['barbell'] })
  @IsArray()
  equipments!: string[];

  @ApiProperty({ example: ['triceps', 'anterior deltoid'] })
  @IsArray()
  secondaryMuscles!: string[];

  @ApiProperty({ example: ['Lie on a flat bench...'] })
  @IsArray()
  instructions!: string[];
}
