import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExercisesService } from './exercises.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma.service.mock';

const userId = 'user-uuid-1';
const otherUserId = 'user-uuid-2';
const exerciseId = 'exercise-uuid-1';

const customExercise = {
  id: exerciseId,
  name: 'Custom Curl',
  gifUrl: null,
  targetMuscles: ['biceps'],
  bodyParts: ['upper arms'],
  equipments: ['barbell'],
  secondaryMuscles: [],
  instructions: [],
  isCustom: true,
  createdById: userId,
};

const builtInExercise = {
  ...customExercise,
  id: 'builtin-id',
  name: 'Barbell Curl',
  isCustom: false,
  createdById: null,
};

describe('ExercisesService', () => {
  let service: ExercisesService;
  let prismaMock: PrismaMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ExercisesService>(ExercisesService);
    jest.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated exercises with default page/limit', async () => {
      prismaMock.exercise.count.mockResolvedValue(1);
      prismaMock.exercise.findMany.mockResolvedValue([customExercise]);

      const result = await service.findAll({});

      expect(prismaMock.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.meta.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('applies bodyPart filter', async () => {
      prismaMock.exercise.count.mockResolvedValue(0);
      prismaMock.exercise.findMany.mockResolvedValue([]);

      await service.findAll({ bodyPart: 'chest' });

      const findManyCall = prismaMock.exercise.findMany.mock.calls[0][0];
      const andClauses = findManyCall.where.AND;
      expect(JSON.stringify(andClauses)).toContain('chest');
    });

    it('applies search filter case-insensitively', async () => {
      prismaMock.exercise.count.mockResolvedValue(0);
      prismaMock.exercise.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'curl' });

      const findManyCall = prismaMock.exercise.findMany.mock.calls[0][0];
      const andClauses = findManyCall.where.AND;
      expect(JSON.stringify(andClauses)).toContain('curl');
    });

    it('calculates correct totalPages', async () => {
      prismaMock.exercise.count.mockResolvedValue(45);
      prismaMock.exercise.findMany.mockResolvedValue([]);

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.page).toBe(2);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns exercise when found', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(customExercise);

      const result = await service.findOne(exerciseId);

      expect(result).toEqual(customExercise);
    });

    it('throws NotFoundException when exercise does not exist', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(null);

      await expect(service.findOne('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates exercise with isCustom=true and createdById set', async () => {
      prismaMock.exercise.create.mockResolvedValue(customExercise);

      const dto = {
        name: 'Custom Curl',
        targetMuscles: ['biceps'],
        bodyParts: ['upper arms'],
        equipments: ['barbell'],
      };

      const result = await service.create(dto, userId);

      expect(prismaMock.exercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isCustom: true, createdById: userId }),
        }),
      );
      expect(result).toEqual(customExercise);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates exercise when user is the owner', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(customExercise);
      prismaMock.exercise.update.mockResolvedValue({
        ...customExercise,
        name: 'Updated Curl',
      });

      const result = await service.update(exerciseId, { name: 'Updated Curl' }, userId);

      expect(result.name).toBe('Updated Curl');
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(customExercise);

      await expect(
        service.update(exerciseId, { name: 'Hack' }, otherUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for built-in exercises', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(builtInExercise);

      await expect(
        service.update(builtInExercise.id, { name: 'Hack' }, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when exercise does not exist', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(null);

      await expect(
        service.update('ghost-id', { name: 'Hack' }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes exercise when user is the owner', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(customExercise);
      prismaMock.exercise.delete.mockResolvedValue({});

      const result = await service.remove(exerciseId, userId);

      expect(prismaMock.exercise.delete).toHaveBeenCalledWith({
        where: { id: exerciseId },
      });
      expect(result).toEqual({ message: 'Exercise deleted successfully' });
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(customExercise);

      await expect(service.remove(exerciseId, otherUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException for built-in exercises', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(builtInExercise);

      await expect(
        service.remove(builtInExercise.id, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when exercise does not exist', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue(null);

      await expect(service.remove('ghost-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
