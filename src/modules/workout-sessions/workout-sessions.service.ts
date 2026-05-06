import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';
import { QueryWorkoutSessionDto } from './dto/query-workout-session.dto';

@Injectable()
export class WorkoutSessionsService {
  constructor(private readonly prisma: PrismaService) {}

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
