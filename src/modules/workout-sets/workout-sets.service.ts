import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RecordType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkoutSetDto } from './dto/create-workout-set.dto';
import { UpdateWorkoutSetDto } from './dto/update-workout-set.dto';
import { QueryWorkoutSetDto } from './dto/query-workout-set.dto';

@Injectable()
export class WorkoutSetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── GET /workout-sessions/:sessionId/workout-sets ──────────────────────────

  async findAll(
    sessionId: string,
    userId: string,
    query: QueryWorkoutSetDto,
  ) {
    const { isWarmup, isPr, page = 1, limit = 50 } = query;

    // Verify the session belongs to the user
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(
        `Workout session with id "${sessionId}" not found`,
      );
    }

    const where: Prisma.WorkoutSetWhereInput = {
      sessionId,
      AND: [
        isWarmup !== undefined ? { isWarmup } : {},
        isPr !== undefined ? { isPr } : {},
      ],
    };

    const [total, data] = await Promise.all([
      this.prisma.workoutSet.count({ where }),
      this.prisma.workoutSet.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { exerciseId: 'asc' as const },
          { setNumber: 'asc' as const },
        ],
        select: this.listSelect(),
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── POST /workout-sessions/:sessionId/workout-sets ───────────────────────────

  async create(
    sessionId: string,
    userId: string,
    dto: CreateWorkoutSetDto,
  ) {
    // Verify the session belongs to the user
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(
        `Workout session with id "${sessionId}" not found`,
      );
    }

    // Verify the exercise exists
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: dto.exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException(
        `Exercise with id "${dto.exerciseId}" not found`,
      );
    }

    const isPr = await this.detectPr(userId, dto.exerciseId, dto.weightKg);

    const workoutSet = await this.prisma.workoutSet.create({
      data: {
        sessionId,
        exerciseId: dto.exerciseId,
        setNumber: dto.setNumber,
        reps: dto.reps ?? null,
        weightKg: dto.weightKg ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        distanceMeters: dto.distanceMeters ?? null,
        rpe: dto.rpe ?? null,
        isWarmup: dto.isWarmup ?? false,
        isPr,
      },
      select: this.detailSelect(),
    });

    if (isPr && dto.weightKg) {
      await this.prisma.personalRecord.upsert({
        where: { userId_exerciseId_recordType: { userId, exerciseId: dto.exerciseId, recordType: RecordType.MAX_WEIGHT } },
        create: {
          userId,
          exerciseId: dto.exerciseId,
          recordType: RecordType.MAX_WEIGHT,
          value: dto.weightKg,
          unit: 'kg',
          achievedAt: new Date(),
          sessionId,
        },
        update: { value: dto.weightKg, achievedAt: new Date(), sessionId },
      });
    }

    return workoutSet;
  }

  private async detectPr(userId: string, exerciseId: string, weightKg?: number | null): Promise<boolean> {
    if (!weightKg) return false;
    const existing = await this.prisma.personalRecord.findUnique({
      where: { userId_exerciseId_recordType: { userId, exerciseId, recordType: RecordType.MAX_WEIGHT } },
    });
    return !existing || weightKg > existing.value;
  }

  // ─── GET /workout-sessions/:sessionId/workout-sets/:setId ──────────────────────

  async findOne(sessionId: string, setId: string, userId: string) {
    // Verify the session belongs to the user
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(
        `Workout session with id "${sessionId}" not found`,
      );
    }

    const set = await this.prisma.workoutSet.findFirst({
      where: { id: setId, sessionId },
      select: this.detailSelect(),
    });

    if (!set) {
      throw new NotFoundException(
        `Workout set with id "${setId}" not found`,
      );
    }

    return set;
  }

  // ─── PATCH /workout-sessions/:sessionId/workout-sets/:setId ───────────────────

  async update(
    sessionId: string,
    setId: string,
    userId: string,
    dto: UpdateWorkoutSetDto,
  ) {
    // Verify the session belongs to the user
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(
        `Workout session with id "${sessionId}" not found`,
      );
    }

    // Verify the set exists and belongs to this session
    const existingSet = await this.prisma.workoutSet.findFirst({
      where: { id: setId, sessionId },
    });

    if (!existingSet) {
      throw new NotFoundException(
        `Workout set with id "${setId}" not found`,
      );
    }

    const data: Prisma.WorkoutSetUpdateInput = {};

    // Only include fields that are explicitly provided
    if (dto.setNumber !== undefined) data.setNumber = dto.setNumber;
    if (dto.reps !== undefined) data.reps = dto.reps ?? null;
    if (dto.weightKg !== undefined) data.weightKg = dto.weightKg ?? null;
    if (dto.durationSeconds !== undefined)
      data.durationSeconds = dto.durationSeconds ?? null;
    if (dto.distanceMeters !== undefined)
      data.distanceMeters = dto.distanceMeters ?? null;
    if (dto.rpe !== undefined) data.rpe = dto.rpe ?? null;
    if (dto.isWarmup !== undefined) data.isWarmup = dto.isWarmup;
    if (dto.isPr !== undefined) data.isPr = dto.isPr;

    return this.prisma.workoutSet.update({
      where: { id: setId },
      data,
      select: this.detailSelect(),
    });
  }

  // ─── DELETE /workout-sessions/:sessionId/workout-sets/:setId ──────────────────

  async remove(sessionId: string, setId: string, userId: string) {
    // Verify the session belongs to the user
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(
        `Workout session with id "${sessionId}" not found`,
      );
    }

    // Verify the set exists and belongs to this session
    const existingSet = await this.prisma.workoutSet.findFirst({
      where: { id: setId, sessionId },
    });

    if (!existingSet) {
      throw new NotFoundException(
        `Workout set with id "${setId}" not found`,
      );
    }

    return this.prisma.workoutSet.delete({
      where: { id: setId },
      select: this.detailSelect(),
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private listSelect() {
    return {
      id: true,
      exerciseId: true,
      setNumber: true,
      reps: true,
      weightKg: true,
      durationSeconds: true,
      distanceMeters: true,
      rpe: true,
      isWarmup: true,
      isPr: true,
      loggedAt: true,
      exercise: {
        select: {
          id: true,
          name: true,
          gifUrl: true,
        },
      },
    } satisfies Prisma.WorkoutSetSelect;
  }

  private detailSelect() {
    return {
      id: true,
      sessionId: true,
      exerciseId: true,
      setNumber: true,
      reps: true,
      weightKg: true,
      durationSeconds: true,
      distanceMeters: true,
      rpe: true,
      isWarmup: true,
      isPr: true,
      loggedAt: true,
      exercise: {
        select: {
          id: true,
          name: true,
          gifUrl: true,
          targetMuscles: true,
          bodyParts: true,
          equipments: true,
        },
      },
    } satisfies Prisma.WorkoutSetSelect;
  }
}
