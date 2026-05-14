import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RecordType, SessionStatus, WorkoutSet } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ExercisesService } from '../exercises/exercises.service';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';
import { QueryWorkoutSessionDto } from './dto/query-workout-session.dto';
import { CreateSetDto } from './dto/create-set.dto';

@Injectable()
export class WorkoutSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercisesService: ExercisesService,
  ) {}

  // ─── GET /workout-sessions ──────────────────────────────────────────────────

  async findAll(userId: string, query: QueryWorkoutSessionDto) {
    const { status, search, page = 1, limit = 20 } = query;

    const where: Prisma.WorkoutSessionWhereInput = {
      userId,
      AND: [
        status ? { status } : {},
        search
          ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
          : {},
      ],
    };

    const [total, data] = await Promise.all([
      this.prisma.workoutSession.count({ where }),
      this.prisma.workoutSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
        select: this.listSelect(),
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── POST /workout-sessions ─────────────────────────────────────────────────

  async create(dto: CreateWorkoutSessionDto, userId: string) {
    // If routineId is provided, verify it belongs to the user
    if (dto.routineId) {
      const routine = await this.prisma.routine.findFirst({
        where: { id: dto.routineId, userId },
      });
      if (!routine) {
        throw new NotFoundException(
          `Routine with id "${dto.routineId}" not found`,
        );
      }
    }

    const startedAt = new Date();

    return this.prisma.workoutSession.create({
      data: {
        userId,
        routineId: dto.routineId ?? null,
        name: this.getDefaultSessionNameByHour(startedAt.getHours()),
        startedAt,
        notes: dto.notes ?? null,
        status: SessionStatus.IN_PROGRESS,
        ...(dto.sets && dto.sets.length > 0
          ? {
              workoutSets: {
                create: dto.sets.map((set) => ({
                  exerciseId: set.exerciseId,
                  setNumber: set.setNumber,
                  reps: set.reps ?? null,
                  weightKg: set.weightKg ?? null,
                  durationSeconds: set.durationSeconds ?? null,
                  distanceMeters: set.distanceMeters ?? null,
                  rpe: set.rpe ?? null,
                  isWarmup: set.isWarmup ?? false,
                })),
              },
            }
          : {}),
      },
      select: this.detailSelect(),
    });
  }

  private getDefaultSessionNameByHour(hour: number): string {
    if (hour >= 5 && hour < 12) {
      return 'Morning exercise';
    }

    if (hour >= 12 && hour < 17) {
      return 'Afternoon exercise';
    }

    if (hour >= 17 && hour < 21) {
      return 'Evening exercise';
    }

    return 'Night exercise';
  }

  // ─── GET /workout-sessions/:id ──────────────────────────────────────────────

  async findOne(id: string, userId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id, userId },
      select: this.detailSelect(),
    });

    if (!session) {
      throw new NotFoundException(
        `Workout session with id "${id}" not found`,
      );
    }

    return session;
  }

  // ─── PATCH /workout-sessions/:id/finish ─────────────────────────────────────

  async finish(id: string, userId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id, userId },
      include: { workoutSets: true },
    });

    if (!session) {
      throw new NotFoundException(
        `Workout session with id "${id}" not found`,
      );
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Session is already ${session.status.toLowerCase()}`,
      );
    }

    const finishedAt = new Date();
    const durationSeconds = Math.round(
      (finishedAt.getTime() - session.startedAt.getTime()) / 1000,
    );

    // Calculate total volume: sum of (reps * weightKg) for each set
    const totalVolumeKg = session.workoutSets.reduce((acc, set) => {
      if (set.reps && set.weightKg) {
        return acc + set.reps * set.weightKg;
      }
      return acc;
    }, 0);

    await this.updateSessionPersonalRecords(userId, id, session.workoutSets);

    return this.prisma.workoutSession.update({
      where: { id },
      data: {
        status: SessionStatus.COMPLETED,
        finishedAt,
        durationSeconds,
        totalVolumeKg: totalVolumeKg > 0 ? totalVolumeKg : null,
      },
      select: this.detailSelect(),
    });
  }

  // ─── PATCH /workout-sessions/:id/cancel ─────────────────────────────────────

  async cancel(id: string, userId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      throw new NotFoundException(
        `Workout session with id "${id}" not found`,
      );
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Session is already ${session.status.toLowerCase()}`,
      );
    }

    return this.prisma.workoutSession.update({
      where: { id },
      data: {
        status: SessionStatus.CANCELLED,
        finishedAt: new Date(),
      },
      select: this.detailSelect(),
    });
  }

  // ─── POST /workout-sessions/:id/sets ────────────────────────────────────────

  async logSet(userId: string, sessionId: string, dto: CreateSetDto) {
    const session = await this.prisma.workoutSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException();
    if (session.status !== SessionStatus.IN_PROGRESS) throw new BadRequestException('Session is not active');

    const exercise = await this.exercisesService.upsertFromExternalApi(dto.exercise);

    const workoutSet = await this.prisma.workoutSet.create({
      data: {
        sessionId,
        exerciseId: exercise.id,
        setNumber: dto.setNumber,
        reps: dto.reps ?? null,
        weightKg: dto.weightKg ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        distanceMeters: dto.distanceMeters ?? null,
        rpe: dto.rpe ?? null,
        isWarmup: dto.isWarmup ?? false,
      },
      include: { exercise: true },
    });

    return workoutSet;
  }

  private async updateSessionPersonalRecords(userId: string, sessionId: string, sets: WorkoutSet[]) {
    const exerciseIds = [...new Set(sets.map((set) => set.exerciseId))];
    if (exerciseIds.length === 0) return;

    const existingRecords = await this.prisma.personalRecord.findMany({
      where: {
        userId,
        exerciseId: { in: exerciseIds },
        recordType: { in: [RecordType.MAX_WEIGHT, RecordType.MAX_REPS] },
      },
    });

    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.workoutSet.updateMany({
        where: { sessionId },
        data: { isPr: false },
      }),
    ];
    const prSetIds = new Set<string>();

    for (const exerciseId of exerciseIds) {
      const setsByExercise = sets.filter((set) => set.exerciseId === exerciseId && !set.isWarmup);
      if (setsByExercise.length === 0) continue;

      const existingWeight = existingRecords.find(
        (record) => record.exerciseId === exerciseId && record.recordType === RecordType.MAX_WEIGHT,
      );
      const existingReps = existingRecords.find(
        (record) => record.exerciseId === exerciseId && record.recordType === RecordType.MAX_REPS,
      );

      const bestWeightSet = setsByExercise.reduce<WorkoutSet | null>((best, current) => {
        if ((current.weightKg ?? 0) <= (existingWeight?.value ?? 0)) return best;
        if (!best) return current;
        return (current.weightKg ?? 0) > (best.weightKg ?? 0) ? current : best;
      }, null);

      if (bestWeightSet && (bestWeightSet.weightKg ?? 0) > 0) {
        prSetIds.add(bestWeightSet.id);
        operations.push(
          this.prisma.personalRecord.upsert({
            where: {
              userId_exerciseId_recordType: {
                userId,
                exerciseId,
                recordType: RecordType.MAX_WEIGHT,
              },
            },
            create: {
              userId,
              exerciseId,
              recordType: RecordType.MAX_WEIGHT,
              value: bestWeightSet.weightKg!,
              unit: 'kg',
              achievedAt: bestWeightSet.loggedAt,
              sessionId: bestWeightSet.sessionId,
            },
            update: {
              value: bestWeightSet.weightKg!,
              achievedAt: bestWeightSet.loggedAt,
              sessionId: bestWeightSet.sessionId,
            },
          }),
        );
      }

      const bestRepsSet = setsByExercise.reduce<WorkoutSet | null>((best, current) => {
        if ((current.reps ?? 0) <= (existingReps?.value ?? 0)) return best;
        if (!best) return current;
        return (current.reps ?? 0) > (best.reps ?? 0) ? current : best;
      }, null);

      if (bestRepsSet && (bestRepsSet.reps ?? 0) > 0) {
        prSetIds.add(bestRepsSet.id);
        operations.push(
          this.prisma.personalRecord.upsert({
            where: {
              userId_exerciseId_recordType: {
                userId,
                exerciseId,
                recordType: RecordType.MAX_REPS,
              },
            },
            create: {
              userId,
              exerciseId,
              recordType: RecordType.MAX_REPS,
              value: bestRepsSet.reps!,
              unit: 'reps',
              achievedAt: bestRepsSet.loggedAt,
              sessionId: bestRepsSet.sessionId,
            },
            update: {
              value: bestRepsSet.reps!,
              achievedAt: bestRepsSet.loggedAt,
              sessionId: bestRepsSet.sessionId,
            },
          }),
        );
      }
    }

    if (prSetIds.size > 0) {
      operations.push(
        this.prisma.workoutSet.updateMany({
          where: { id: { in: [...prSetIds] } },
          data: { isPr: true },
        }),
      );
    }

    await this.prisma.$transaction(operations);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private listSelect() {
    return {
      id: true,
      name: true,
      routineId: true,
      startedAt: true,
      finishedAt: true,
      durationSeconds: true,
      totalVolumeKg: true,
      status: true,
      createdAt: true,
    } satisfies Prisma.WorkoutSessionSelect;
  }

  private detailSelect() {
    return {
      id: true,
      userId: true,
      routineId: true,
      name: true,
      startedAt: true,
      finishedAt: true,
      durationSeconds: true,
      totalVolumeKg: true,
      notes: true,
      status: true,
      createdAt: true,
      routine: {
        select: {
          id: true,
          name: true,
        },
      },
      workoutSets: {
        select: {
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
        },
        orderBy: [
          { exerciseId: 'asc' as const },
          { setNumber: 'asc' as const },
        ],
      },
    } satisfies Prisma.WorkoutSessionSelect;
  }
}
