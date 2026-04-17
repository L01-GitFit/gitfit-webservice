import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, FitnessGoal, ExperienceLevel } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Full display name',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'Height in centimeters',
    example: 175,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  heightCm?: number;

  @ApiPropertyOptional({
    description: 'Weight in kilograms',
    example: 70.5,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  weightKg?: number;

  @ApiPropertyOptional({
    description: 'Primary fitness goal',
    enum: FitnessGoal,
    example: FitnessGoal.MUSCLE_GAIN,
  })
  @IsOptional()
  @IsEnum(FitnessGoal)
  fitnessGoal?: FitnessGoal;

  @ApiPropertyOptional({
    description: 'Training experience level',
    enum: ExperienceLevel,
    example: ExperienceLevel.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({
    description: 'Date of birth (ISO 8601)',
    example: '1995-06-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Profile avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
