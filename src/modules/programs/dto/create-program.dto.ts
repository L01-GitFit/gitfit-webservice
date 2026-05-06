import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProgramDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;
}
