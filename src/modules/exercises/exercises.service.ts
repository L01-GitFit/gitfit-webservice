import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryExerciseDto } from './dto/query-exercise.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { UpsertExerciseDto } from './dto/upsert-exercise.dto';

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── GET /exercises ──────────────────────────────────────────────────────────

  async findAll(query: QueryExerciseDto) {
    const { bodyPart, equipment, muscle, search, page = 1, limit = 20 } = query;

    const where: Prisma.ExerciseWhereInput = {
      AND: [
        bodyPart
          ? { bodyParts: { has: bodyPart } }
          : {},
        equipment
          ? { equipments: { has: equipment } }
          : {},
        muscle
          ? { targetMuscles: { has: muscle } }
          : {},
        search
          ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
          : {},
      ],
    };

    const [total, data] = await Promise.all([
      this.prisma.exercise.count({ where }),
      this.prisma.exercise.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        select: this.listSelect(),
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── GET /exercises/:id ──────────────────────────────────────────────────────

  async findOne(id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      select: this.detailSelect(),
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise with id "${id}" not found`);
    }

    return exercise;
  }

  // ─── POST /exercises ─────────────────────────────────────────────────────────

  async create(dto: CreateExerciseDto, userId: string) {
    return this.prisma.exercise.create({
      data: {
        name: dto.name,
        gifUrl: dto.gifUrl,
        targetMuscles: dto.targetMuscles,
        bodyParts: dto.bodyParts,
        equipments: dto.equipments,
        secondaryMuscles: dto.secondaryMuscles ?? [],
        instructions: dto.instructions ?? [],
        isCustom: true,
        createdById: userId,
      },
      select: this.detailSelect(),
    });
  }

  // ─── PATCH /exercises/:id ────────────────────────────────────────────────────

  async update(id: string, dto: UpdateExerciseDto, userId: string) {
    await this.assertOwnership(id, userId);

    return this.prisma.exercise.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.gifUrl !== undefined && { gifUrl: dto.gifUrl }),
        ...(dto.targetMuscles !== undefined && { targetMuscles: dto.targetMuscles }),
        ...(dto.bodyParts !== undefined && { bodyParts: dto.bodyParts }),
        ...(dto.equipments !== undefined && { equipments: dto.equipments }),
        ...(dto.secondaryMuscles !== undefined && {
          secondaryMuscles: dto.secondaryMuscles,
        }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
      },
      select: this.detailSelect(),
    });
  }

  // ─── DELETE /exercises/:id ───────────────────────────────────────────────────

  async remove(id: string, userId: string) {
    await this.assertOwnership(id, userId);

    await this.prisma.exercise.delete({ where: { id } });

    return { message: 'Exercise deleted successfully' };
  }

  // ─── POST (cache-on-demand) ──────────────────────────────────────────────────

  async upsertFromExternalApi(dto: UpsertExerciseDto) {
    return this.prisma.exercise.upsert({
      where: { exerciseDbId: dto.exerciseDbId },
      create: {
        exerciseDbId: dto.exerciseDbId,
        name: dto.name,
        gifUrl: dto.gifUrl ?? null,
        targetMuscles: dto.targetMuscles,
        bodyParts: dto.bodyParts,
        equipments: dto.equipments,
        secondaryMuscles: dto.secondaryMuscles,
        instructions: dto.instructions,
        isCustom: false,
      },
      update: {},
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async assertOwnership(id: string, userId: string): Promise<void> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      select: { id: true, isCustom: true, createdById: true },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise with id "${id}" not found`);
    }

    if (!exercise.isCustom || exercise.createdById !== userId) {
      throw new ForbiddenException(
        'You can only modify custom exercises that you created',
      );
    }
  }

  private listSelect() {
    return {
      id: true,
      name: true,
      gifUrl: true,
      targetMuscles: true,
      bodyParts: true,
      equipments: true,
      secondaryMuscles: true,
      isCustom: true,
      createdById: true,
      createdAt: true,
    } satisfies Prisma.ExerciseSelect;
  }

  private detailSelect() {
    return {
      id: true,
      exerciseDbId: true,
      name: true,
      gifUrl: true,
      targetMuscles: true,
      bodyParts: true,
      equipments: true,
      secondaryMuscles: true,
      instructions: true,
      isCustom: true,
      createdById: true,
      syncedAt: true,
      createdAt: true,
    } satisfies Prisma.ExerciseSelect;
  }
}
