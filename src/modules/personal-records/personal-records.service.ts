import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PersonalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, exerciseId?: string) {
    return this.prisma.personalRecord.findMany({
      where: { userId, ...(exerciseId ? { exerciseId } : {}) },
      orderBy: { achievedAt: 'desc' },
      select: this.recordSelect(),
    });
  }

  async findByExercise(userId: string, exerciseId: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new NotFoundException(`Exercise with id "${exerciseId}" not found`);

    return this.prisma.personalRecord.findMany({
      where: { userId, exerciseId },
      orderBy: { achievedAt: 'desc' },
      select: this.recordSelect(),
    });
  }

  private recordSelect() {
    return {
      id: true,
      userId: true,
      exerciseId: true,
      recordType: true,
      value: true,
      unit: true,
      achievedAt: true,
      sessionId: true,
      exercise: { select: { id: true, name: true, gifUrl: true, targetMuscles: true } },
    } satisfies Prisma.PersonalRecordSelect;
  }
}
