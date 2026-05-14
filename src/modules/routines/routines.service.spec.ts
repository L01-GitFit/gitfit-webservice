import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma.service.mock';
import { ExercisesService } from '../exercises/exercises.service';
import { RoutinesService } from './routines.service';

const userId = 'user-uuid-1';
const routineId = 'routine-uuid-1';
const programId = 'program-uuid-1';
const exerciseId = 'exercise-uuid-1';

const routine = {
  id: routineId,
  userId,
  name: 'Upper Body',
  programId,
  dayOfWeek: 1,
  orderInProgram: 1,
  createdAt: new Date('2026-01-10T10:00:00.000Z'),
  updatedAt: new Date('2026-01-10T10:00:00.000Z'),
  routineExercises: [],
};

describe('RoutinesService', () => {
  let service: RoutinesService;
  let prismaMock: PrismaMock;

  const exercisesServiceMock = {
    upsertFromExternalApi: jest.fn(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutinesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ExercisesService, useValue: exercisesServiceMock },
      ],
    }).compile();

    service = module.get<RoutinesService>(RoutinesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns routines by user without program filter', async () => {
      prismaMock.routine.findMany.mockResolvedValue([routine]);

      const result = await service.findAll(userId);

      expect(prismaMock.routine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual([routine]);
    });

    it('applies programId filter when provided', async () => {
      prismaMock.routine.findMany.mockResolvedValue([routine]);

      await service.findAll(userId, programId);

      expect(prismaMock.routine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, programId },
        }),
      );
    });
  });

  describe('create', () => {
    it('creates routine when program belongs to user', async () => {
      prismaMock.program.findFirst.mockResolvedValue({ id: programId, userId });
      prismaMock.routine.create.mockResolvedValue(routine);

      const result = await service.create({ name: 'Upper Body', programId }, userId);

      expect(prismaMock.routine.create).toHaveBeenCalled();
      expect(result).toEqual(routine);
    });

    it('throws NotFoundException when provided program is missing', async () => {
      prismaMock.program.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Upper Body', programId }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when routine is missing', async () => {
      prismaMock.routine.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates routine when target routine and program are valid', async () => {
      prismaMock.routine.findFirst.mockResolvedValue(routine);
      prismaMock.program.findFirst.mockResolvedValue({ id: programId, userId });
      prismaMock.routine.update.mockResolvedValue({ ...routine, name: 'Lower Body' });

      const result = await service.update(routineId, userId, {
        name: 'Lower Body',
        programId,
      });

      expect(prismaMock.routine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: routineId },
          data: { name: 'Lower Body', programId },
        }),
      );
      expect(result.name).toBe('Lower Body');
    });

    it('throws NotFoundException when new program does not belong to user', async () => {
      prismaMock.routine.findFirst.mockResolvedValue(routine);
      prismaMock.program.findFirst.mockResolvedValue(null);

      await expect(
        service.update(routineId, userId, { programId: 'missing-program' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addExerciseToRoutine', () => {
    it('upserts exercise and creates routine exercise row', async () => {
      prismaMock.routine.findFirst.mockResolvedValue(routine);
      exercisesServiceMock.upsertFromExternalApi.mockResolvedValue({ id: exerciseId });
      prismaMock.routineExercise.create.mockResolvedValue({
        id: 're-1',
        routineId,
        exerciseId,
        sets: 3,
        repsTarget: '8-12',
        weightTarget: null,
        restSeconds: 90,
        orderIndex: 0,
        exercise: { id: exerciseId, name: 'Bench Press', gifUrl: null },
      });

      const result = await service.addExerciseToRoutine(routineId, userId, {
        exercise: {
          exerciseDbId: '0001',
          name: 'Bench Press',
          targetMuscles: ['chest'],
          bodyParts: ['upper body'],
          equipments: ['barbell'],
          secondaryMuscles: ['triceps'],
          instructions: ['Press up'],
        },
        sets: 3,
        repsTarget: '8-12',
        restSeconds: 90,
        orderIndex: 0,
      });

      expect(exercisesServiceMock.upsertFromExternalApi).toHaveBeenCalled();
      expect(prismaMock.routineExercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ routineId, exerciseId, orderIndex: 0 }),
        }),
      );
      expect(result.exerciseId).toBe(exerciseId);
    });
  });

  describe('updateExercise', () => {
    it('throws NotFoundException when exercise is not in routine', async () => {
      prismaMock.routine.findFirst.mockResolvedValue(routine);
      prismaMock.routineExercise.findFirst.mockResolvedValue(null);

      await expect(
        service.updateExercise(routineId, exerciseId, userId, { sets: 4 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates routine exercise when found', async () => {
      prismaMock.routine.findFirst.mockResolvedValue(routine);
      prismaMock.routineExercise.findFirst.mockResolvedValue({ id: 're-1' });
      prismaMock.routineExercise.update.mockResolvedValue({
        id: 're-1',
        routineId,
        exerciseId,
        sets: 4,
      });

      const result = await service.updateExercise(routineId, exerciseId, userId, {
        sets: 4,
      });

      expect(prismaMock.routineExercise.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 're-1' }, data: { sets: 4 } }),
      );
      expect(result.sets).toBe(4);
    });
  });

  describe('removeExercise', () => {
    it('deletes routine exercise when found', async () => {
      prismaMock.routine.findFirst.mockResolvedValue(routine);
      prismaMock.routineExercise.findFirst.mockResolvedValue({ id: 're-1' });
      prismaMock.routineExercise.delete.mockResolvedValue({ id: 're-1' });

      const result = await service.removeExercise(routineId, exerciseId, userId);

      expect(prismaMock.routineExercise.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 're-1' } }),
      );
      expect(result).toEqual({ id: 're-1' });
    });
  });
});
