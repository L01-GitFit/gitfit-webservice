import { PartialType, OmitType } from '@nestjs/swagger';
import { AddRoutineExerciseDto } from './add-routine-exercise.dto';

export class UpdateRoutineExerciseDto extends PartialType(
  OmitType(AddRoutineExerciseDto, ['exerciseId'] as const),
) {}
