import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddRoutineExerciseDto {
  @ApiProperty()
  @IsUUID()
  exerciseId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  sets?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  repsTarget?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  weightTarget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  orderIndex!: number;
}
