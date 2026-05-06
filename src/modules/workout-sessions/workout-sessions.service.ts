import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SessionStatus, WorkoutSet } from '@prisma/client';
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

    return this.prisma.workoutSession.create({
      data: {
        userId,
        routineId: dto.routineId ?? null,
        name: dto.name,
        startedAt: new Date(),
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

    if (!dto.isWarmup && dto.weightKg) {
      await this.detectAndUpdatePR(userId, exercise.id, workoutSet);
    }

    return workoutSet;
  }

  private async detectAndUpdatePR(userId: string, exerciseId: string, set: WorkoutSet) {
    if (!set.weightKg) return;

    const existing = await this.prisma.personalRecord.findUnique({
      where: { userId_exerciseId_recordType: { userId, exerciseId, recordType: 'MAX_WEIGHT' } },
    });

    const isNewPr = !existing || set.weightKg > existing.value;

    if (isNewPr) {
      await Promise.all([
        this.prisma.personalRecord.upsert({
          where: { userId_exerciseId_recordType: { userId, exerciseId, recordType: 'MAX_WEIGHT' } },
          create: { userId, exerciseId, recordType: 'MAX_WEIGHT', value: set.weightKg, unit: 'kg', achievedAt: set.loggedAt, sessionId: set.sessionId },
          update: { value: set.weightKg, achievedAt: set.loggedAt, sessionId: set.sessionId },
        }),
        this.prisma.workoutSet.update({
          where: { id: set.id },
          data: { isPr: true },
        }),
      ]);
    }
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
