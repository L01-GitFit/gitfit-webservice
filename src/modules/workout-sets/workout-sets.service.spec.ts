import { NotFoundException } from '@nestjs/common';
import { RecordType } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma.service.mock';
import { WorkoutSetsService } from './workout-sets.service';

const userId = 'user-uuid-1';
const sessionId = 'session-uuid-1';
const setId = 'set-uuid-1';
const exerciseId = 'exercise-uuid-1';

describe('WorkoutSetsService', () => {
  let service: WorkoutSetsService;
  let prismaMock: PrismaMock;

  const session = { id: sessionId, userId };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutSetsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<WorkoutSetsService>(WorkoutSetsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('throws NotFoundException when session is missing', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(null);

      await expect(service.findAll(sessionId, userId, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns paginated sets for valid session', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.workoutSet.count.mockResolvedValue(2);
      prismaMock.workoutSet.findMany.mockResolvedValue([
        { id: 'set-1', exerciseId, setNumber: 1 },
        { id: 'set-2', exerciseId, setNumber: 2 },
      ]);

      const result = await service.findAll(sessionId, userId, {
        page: 1,
        limit: 10,
        isWarmup: false,
      });

      expect(prismaMock.workoutSet.count).toHaveBeenCalled();
      expect(prismaMock.workoutSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
        }),
      );
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });

    it('applies both isWarmup and isPr filters when provided', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.workoutSet.count.mockResolvedValue(0);
      prismaMock.workoutSet.findMany.mockResolvedValue([]);

      await service.findAll(sessionId, userId, {
        page: 2,
        limit: 5,
        isWarmup: true,
        isPr: false,
      });

      const findManyArgs = prismaMock.workoutSet.findMany.mock.calls[0][0];
      expect(findManyArgs.skip).toBe(5);
      expect(JSON.stringify(findManyArgs.where)).toContain('isWarmup');
      expect(JSON.stringify(findManyArgs.where)).toContain('isPr');
    });
  });

  describe('create', () => {
    it('throws NotFoundException when session does not exist', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(null);

      await expect(
        service.create(sessionId, userId, { exerciseId, setNumber: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when exercise does not exist', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.create(sessionId, userId, {
          exerciseId,
          setNumber: 1,
          reps: 10,
          weightKg: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates non-PR set when weight is null', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.exercise.findUnique.mockResolvedValue({ id: exerciseId });
      prismaMock.workoutSet.create.mockResolvedValue({ id: setId, isPr: false, weightKg: null });

      const result = await service.create(sessionId, userId, {
        exerciseId,
        setNumber: 1,
        reps: 12,
      });

      expect(prismaMock.personalRecord.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.personalRecord.upsert).not.toHaveBeenCalled();
      expect(result.isPr).toBe(false);
    });

    it('creates non-PR set when weight is not greater than existing PR', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.exercise.findUnique.mockResolvedValue({ id: exerciseId });
      prismaMock.personalRecord.findUnique.mockResolvedValue({ value: 100 });
      prismaMock.workoutSet.create.mockResolvedValue({ id: setId, isPr: false, weightKg: 90 });

      const result = await service.create(sessionId, userId, {
        exerciseId,
        setNumber: 1,
        reps: 5,
        weightKg: 90,
      });

      expect(prismaMock.personalRecord.findUnique).toHaveBeenCalled();
      expect(prismaMock.personalRecord.upsert).not.toHaveBeenCalled();
      expect(result.isPr).toBe(false);
    });

    it('creates PR set and upserts personal record when new max weight', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.exercise.findUnique.mockResolvedValue({ id: exerciseId });
      prismaMock.personalRecord.findUnique.mockResolvedValue({ value: 80 });
      prismaMock.workoutSet.create.mockResolvedValue({ id: setId, isPr: true, weightKg: 90 });
      prismaMock.personalRecord.upsert.mockResolvedValue({ id: 'pr-1' });

      const result = await service.create(sessionId, userId, {
        exerciseId,
        setNumber: 1,
        reps: 6,
        weightKg: 90,
      });

      expect(prismaMock.workoutSet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPr: true }),
        }),
      );
      expect(prismaMock.personalRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_exerciseId_recordType: {
              userId,
              exerciseId,
              recordType: RecordType.MAX_WEIGHT,
            },
          },
        }),
      );
      expect(result.isPr).toBe(true);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when session does not exist', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(null);

      await expect(service.findOne(sessionId, setId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns set when found', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.workoutSet.findFirst.mockResolvedValue({ id: setId, sessionId });

      const result = await service.findOne(sessionId, setId, userId);

      expect(result.id).toBe(setId);
    });

    it('throws NotFoundException when set does not exist', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.workoutSet.findFirst.mockResolvedValue(null);

      await expect(service.findOne(sessionId, setId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when session is missing', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(null);

      await expect(
        service.update(sessionId, setId, userId, { reps: 8 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when set is missing', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.workoutSet.findFirst.mockResolvedValue(null);

      await expect(
        service.update(sessionId, setId, userId, { reps: 8 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates only provided fields', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.workoutSet.findFirst.mockResolvedValue({ id: setId, sessionId });
      prismaMock.workoutSet.update.mockResolvedValue({ id: setId, reps: 8, isWarmup: true });

      const result = await service.update(sessionId, setId, userId, {
        reps: 8,
        isWarmup: true,
      });

      expect(prismaMock.workoutSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: setId },
          data: { reps: 8, isWarmup: true },
        }),
      );
      expect(result.reps).toBe(8);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when session is missing', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(null);

      await expect(service.remove(sessionId, setId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when set is missing', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.workoutSet.findFirst.mockResolvedValue(null);

      await expect(service.remove(sessionId, setId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes set when session and set are valid', async () => {
      prismaMock.workoutSession.findFirst.mockResolvedValue(session);
      prismaMock.workoutSet.findFirst.mockResolvedValue({ id: setId, sessionId });
      prismaMock.workoutSet.delete.mockResolvedValue({ id: setId });

      const result = await service.remove(sessionId, setId, userId);

      expect(prismaMock.workoutSet.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: setId } }),
      );
      expect(result).toEqual({ id: setId });
    });
  });
});
