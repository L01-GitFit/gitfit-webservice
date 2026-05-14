import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma.service.mock';
import { PersonalRecordsService } from './personal-records.service';

describe('PersonalRecordsService', () => {
  let service: PersonalRecordsService;
  let prismaMock: PrismaMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalRecordsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PersonalRecordsService>(PersonalRecordsService);
    jest.clearAllMocks();
  });

  it('findAll returns records for user without exercise filter', async () => {
    prismaMock.personalRecord.findMany.mockResolvedValue([{ id: 'pr-1' }]);

    const result = await service.findAll('user-1');

    expect(prismaMock.personalRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(result).toEqual([{ id: 'pr-1' }]);
  });

  it('findAll applies optional exerciseId filter', async () => {
    prismaMock.personalRecord.findMany.mockResolvedValue([{ id: 'pr-1' }]);

    await service.findAll('user-1', 'exercise-1');

    expect(prismaMock.personalRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', exerciseId: 'exercise-1' } }),
    );
  });

  it('findByExercise throws when exercise does not exist', async () => {
    prismaMock.exercise.findUnique.mockResolvedValue(null);

    await expect(service.findByExercise('user-1', 'exercise-404')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findByExercise returns records ordered by achievedAt desc', async () => {
    prismaMock.exercise.findUnique.mockResolvedValue({ id: 'exercise-1' });
    prismaMock.personalRecord.findMany.mockResolvedValue([{ id: 'pr-2' }]);

    const result = await service.findByExercise('user-1', 'exercise-1');

    expect(prismaMock.personalRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', exerciseId: 'exercise-1' },
        orderBy: { achievedAt: 'desc' },
      }),
    );
    expect(result).toEqual([{ id: 'pr-2' }]);
  });
});
