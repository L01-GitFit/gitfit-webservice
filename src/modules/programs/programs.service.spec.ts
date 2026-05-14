import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma.service.mock';
import { ProgramsService } from './programs.service';

const userId = 'user-uuid-1';
const programId = 'program-uuid-1';

const dbProgram = {
  id: programId,
  userId,
  name: 'Push Pull Legs',
  description: 'Strength focus',
  durationWeeks: 8,
  isActive: false,
  createdAt: new Date('2026-01-10T10:00:00.000Z'),
  updatedAt: new Date('2026-01-10T10:00:00.000Z'),
  routines: [],
};

describe('ProgramsService', () => {
  let service: ProgramsService;
  let prismaMock: PrismaMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProgramsService>(ProgramsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns user programs ordered by createdAt desc', async () => {
      prismaMock.program.findMany.mockResolvedValue([dbProgram]);

      const result = await service.findAll(userId);

      expect(prismaMock.program.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual([dbProgram]);
    });
  });

  describe('create', () => {
    it('stores nullable fields as null when omitted', async () => {
      prismaMock.program.create.mockResolvedValue({
        ...dbProgram,
        description: null,
        durationWeeks: null,
      });

      await service.create({ name: 'My Program' }, userId);

      expect(prismaMock.program.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId,
            name: 'My Program',
            description: null,
            durationWeeks: null,
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when program does not exist', async () => {
      prismaMock.program.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates and returns the program', async () => {
      prismaMock.program.findFirst.mockResolvedValue(dbProgram);
      prismaMock.program.update.mockResolvedValue({
        ...dbProgram,
        name: 'Updated Program',
      });

      const result = await service.update(programId, userId, {
        name: 'Updated Program',
      });

      expect(prismaMock.program.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: programId },
          data: { name: 'Updated Program' },
        }),
      );
      expect(result.name).toBe('Updated Program');
    });
  });

  describe('remove', () => {
    it('deletes existing program', async () => {
      prismaMock.program.findFirst.mockResolvedValue(dbProgram);
      prismaMock.program.delete.mockResolvedValue(dbProgram);

      const result = await service.remove(programId, userId);

      expect(prismaMock.program.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: programId } }),
      );
      expect(result).toEqual(dbProgram);
    });
  });

  describe('activate', () => {
    it('deactivates current active program then activates target program', async () => {
      prismaMock.program.findFirst.mockResolvedValue(dbProgram);
      prismaMock.program.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.program.update.mockResolvedValue({ ...dbProgram, isActive: true });

      const result = await service.activate(programId, userId);

      expect(prismaMock.program.updateMany).toHaveBeenCalledWith({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
      expect(prismaMock.program.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: programId },
          data: { isActive: true },
        }),
      );
      expect(result.isActive).toBe(true);
    });
  });
});
