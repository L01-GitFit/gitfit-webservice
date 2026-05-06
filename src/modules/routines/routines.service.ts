import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ExercisesService } from '../exercises/exercises.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { AddExerciseToRoutineDto } from './dto/add-exercise-to-routine.dto';
import { UpdateRoutineExerciseDto } from './dto/update-routine-exercise.dto';

@Injectable()
export class RoutinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercisesService: ExercisesService,
  ) {}

  async findAll(userId: string, programId?: string) {
    return this.prisma.routine.findMany({
      where: { userId, ...(programId ? { programId } : {}) },
      orderBy: { createdAt: 'desc' },
      select: this.listSelect(),
    });
  }

  async create(dto: CreateRoutineDto, userId: string) {
    if (dto.programId) {
      const program = await this.prisma.program.findFirst({ where: { id: dto.programId, userId } });
      if (!program) throw new NotFoundException(`Program with id "${dto.programId}" not found`);
    }
    return this.prisma.routine.create({
      data: {
        userId,
        name: dto.name,
        programId: dto.programId ?? null,
        dayOfWeek: dto.dayOfWeek ?? null,
        orderInProgram: dto.orderInProgram ?? null,
      },
      select: this.detailSelect(),
    });
  }

  async findOne(id: string, userId: string) {
    const routine = await this.prisma.routine.findFirst({
      where: { id, userId },
      select: this.detailSelect(),
    });
    if (!routine) throw new NotFoundException(`Routine with id "${id}" not found`);
    return routine;
  }

  async update(id: string, userId: string, dto: UpdateRoutineDto) {
    await this.findOne(id, userId);
    if (dto.programId) {
      const program = await this.prisma.program.findFirst({ where: { id: dto.programId, userId } });
      if (!program) throw new NotFoundException(`Program with id "${dto.programId}" not found`);
    }
    return this.prisma.routine.update({ where: { id }, data: dto, select: this.detailSelect() });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.routine.delete({ where: { id }, select: this.detailSelect() });
  }

  async addExerciseToRoutine(id: string, userId: string, dto: AddExerciseToRoutineDto) {
    await this.findOne(id, userId);

    const exercise = await this.exercisesService.upsertFromExternalApi(dto.exercise);

    return this.prisma.routineExercise.create({
      data: {
        routineId: id,
        exerciseId: exercise.id,
        sets: dto.sets ?? null,
        repsTarget: dto.repsTarget ?? null,
        weightTarget: dto.weightTarget ?? null,
        restSeconds: dto.restSeconds ?? null,
        orderIndex: dto.orderIndex,
      },
      select: this.routineExerciseSelect(),
    });
  }

  async updateExercise(id: string, exerciseId: string, userId: string, dto: UpdateRoutineExerciseDto) {
    await this.findOne(id, userId);
    const re = await this.prisma.routineExercise.findFirst({ where: { routineId: id, exerciseId } });
    if (!re) throw new NotFoundException(`Exercise "${exerciseId}" not found in routine "${id}"`);

    return this.prisma.routineExercise.update({
      where: { id: re.id },
      data: dto,
      select: this.routineExerciseSelect(),
    });
  }

  async removeExercise(id: string, exerciseId: string, userId: string) {
    await this.findOne(id, userId);
    const re = await this.prisma.routineExercise.findFirst({ where: { routineId: id, exerciseId } });
    if (!re) throw new NotFoundException(`Exercise "${exerciseId}" not found in routine "${id}"`);

    return this.prisma.routineExercise.delete({
      where: { id: re.id },
      select: this.routineExerciseSelect(),
    });
  }

  private listSelect() {
    return {
      id: true,
      name: true,
      programId: true,
      dayOfWeek: true,
      orderInProgram: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.RoutineSelect;
  }

  private detailSelect() {
    return {
      id: true,
      userId: true,
      name: true,
      programId: true,
      dayOfWeek: true,
      orderInProgram: true,
      createdAt: true,
      updatedAt: true,
      routineExercises: {
        select: {
          id: true,
          exerciseId: true,
          sets: true,
          repsTarget: true,
          weightTarget: true,
          restSeconds: true,
          orderIndex: true,
          exercise: { select: { id: true, name: true, gifUrl: true, targetMuscles: true, bodyParts: true } },
        },
        orderBy: { orderIndex: 'asc' as const },
      },
    } satisfies Prisma.RoutineSelect;
  }

  private routineExerciseSelect() {
    return {
      id: true,
      routineId: true,
      exerciseId: true,
      sets: true,
      repsTarget: true,
      weightTarget: true,
      restSeconds: true,
      orderIndex: true,
      exercise: { select: { id: true, name: true, gifUrl: true } },
    } satisfies Prisma.RoutineExerciseSelect;
  }
}
