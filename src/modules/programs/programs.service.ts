import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.program.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: this.listSelect(),
    });
  }

  async create(dto: CreateProgramDto, userId: string) {
    return this.prisma.program.create({
      data: { userId, name: dto.name, description: dto.description ?? null, durationWeeks: dto.durationWeeks ?? null },
      select: this.detailSelect(),
    });
  }

  async findOne(id: string, userId: string) {
    const program = await this.prisma.program.findFirst({
      where: { id, userId },
      select: this.detailSelect(),
    });
    if (!program) throw new NotFoundException(`Program with id "${id}" not found`);
    return program;
  }

  async update(id: string, userId: string, dto: UpdateProgramDto) {
    await this.findOne(id, userId);
    return this.prisma.program.update({
      where: { id },
      data: dto,
      select: this.detailSelect(),
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.program.delete({ where: { id }, select: this.detailSelect() });
  }

  async activate(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.program.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
    return this.prisma.program.update({
      where: { id },
      data: { isActive: true },
      select: this.detailSelect(),
    });
  }

  private listSelect() {
    return {
      id: true,
      name: true,
      description: true,
      durationWeeks: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.ProgramSelect;
  }

  private detailSelect() {
    return {
      id: true,
      userId: true,
      name: true,
      description: true,
      durationWeeks: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      routines: {
        select: { id: true, name: true, dayOfWeek: true, orderInProgram: true },
        orderBy: { orderInProgram: 'asc' as const },
      },
    } satisfies Prisma.ProgramSelect;
  }
}
