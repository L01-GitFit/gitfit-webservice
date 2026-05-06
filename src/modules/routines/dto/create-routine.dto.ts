import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateRoutineDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  programId?: string;

  @ApiProperty({ required: false, minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  orderInProgram?: number;
}
