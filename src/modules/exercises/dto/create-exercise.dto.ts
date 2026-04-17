import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateExerciseDto {
  @ApiProperty({
    description: 'Exercise name',
    example: 'My Custom Press',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'URL to a gif demonstration',
    example: 'https://example.com/exercise.gif',
  })
  @IsOptional()
  @IsUrl()
  gifUrl?: string;

  @ApiProperty({
    description: 'List of target muscles',
    example: ['pectorals'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  targetMuscles!: string[];

  @ApiProperty({
    description: 'List of body parts involved',
    example: ['chest'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  bodyParts!: string[];

  @ApiProperty({
    description: 'Equipment required',
    example: ['barbell'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  equipments!: string[];

  @ApiPropertyOptional({
    description: 'Secondary muscles worked',
    example: ['triceps'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryMuscles?: string[];

  @ApiPropertyOptional({
    description: 'Step-by-step instructions',
    example: ['Lie on bench', 'Lower bar to chest'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];
}
