import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecordType, SessionStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma.service.mock';
import { ExercisesService } from '../exercises/exercises.service';
import { WorkoutSessionsService } from './workout-sessions.service';

describe('WorkoutSessionsService', () => {
  let service: WorkoutSessionsService;
  let prismaMock: PrismaMock;

  const exercisesServiceMock = {
    upsertFromExternalApi: jest.fn(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutSessionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ExercisesService, useValue: exercisesServiceMock },
      ],
    }).compile();

    service = module.get<WorkoutSessionsService>(WorkoutSessionsService);
    jest.clearAllMocks();
    prismaMock.$transaction.mockResolvedValue([]);
  });

  it('findAll returns paginated sessions', async () => {
    prismaMock.workoutSession.count.mockResolvedValue(3);
    prismaMock.workoutSession.findMany.mockResolvedValue([{ id: 's-1' }]);

    const result = await service.findAll('user-1', { page: 1, limit: 2 });

    expect(result.meta.total).toBe(3);
    expect(result.meta.totalPages).toBe(2);
  });

  it('create throws when routine is not owned by user', async () => {
    prismaMock.routine.findFirst.mockResolvedValue(null);

    await expect(
      service.create({ routineId: 'routine-1' }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('create creates session with IN_PROGRESS status', async () => {
    prismaMock.workoutSession.create.mockResolvedValue({ id: 's-1', status: SessionStatus.IN_PROGRESS });

    const result = await service.create({ notes: 'good day' }, 'user-1');

    expect(prismaMock.workoutSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', status: SessionStatus.IN_PROGRESS }),
      }),
    );
    expect(result.status).toBe(SessionStatus.IN_PROGRESS);
  });

  it('create sets default morning session name based on current hour', async () => {
    const hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(8);
    prismaMock.workoutSession.create.mockResolvedValue({ id: 's-1', status: SessionStatus.IN_PROGRESS });

    await service.create({ notes: 'morning' }, 'user-1');

    expect(prismaMock.workoutSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Morning exercise' }),
      }),
    );

    hourSpy.mockRestore();
  });

  it('create includes nested workout sets when dto.sets is provided', async () => {
    prismaMock.workoutSession.create.mockResolvedValue({ id: 's-1', status: SessionStatus.IN_PROGRESS });

    await service.create(
      {
        sets: [
          {
            exerciseId: 'e-1',
            setNumber: 1,
            reps: 10,
            weightKg: 60,
            isWarmup: true,
          },
        ],
      },
      'user-1',
    );

    const createArgs = prismaMock.workoutSession.create.mock.calls[0][0];
    expect(createArgs.data.workoutSets.create).toHaveLength(1);
    expect(createArgs.data.workoutSets.create[0]).toEqual(
      expect.objectContaining({ exerciseId: 'e-1', setNumber: 1, isWarmup: true }),
    );
  });

  it('create sets afternoon name for afternoon hour', async () => {
    const hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(13);
    prismaMock.workoutSession.create.mockResolvedValue({ id: 's-1', status: SessionStatus.IN_PROGRESS });

    await service.create({}, 'user-1');

    expect(prismaMock.workoutSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Afternoon exercise' }) }),
    );

    hourSpy.mockRestore();
  });

  it('create sets evening name for evening hour', async () => {
    const hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(18);
    prismaMock.workoutSession.create.mockResolvedValue({ id: 's-1', status: SessionStatus.IN_PROGRESS });

    await service.create({}, 'user-1');

    expect(prismaMock.workoutSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Evening exercise' }) }),
    );

    hourSpy.mockRestore();
  });

  it('create sets night name outside daytime ranges', async () => {
    const hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
    prismaMock.workoutSession.create.mockResolvedValue({ id: 's-1', status: SessionStatus.IN_PROGRESS });

    await service.create({}, 'user-1');

    expect(prismaMock.workoutSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Night exercise' }) }),
    );

    hourSpy.mockRestore();
  });

  it('findOne throws when session not found', async () => {
    prismaMock.workoutSession.findFirst.mockResolvedValue(null);

    await expect(service.findOne('missing', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('finish throws when status is not IN_PROGRESS', async () => {
    prismaMock.workoutSession.findFirst.mockResolvedValue({
      id: 's-1',
      userId: 'user-1',
      startedAt: new Date('2026-05-14T07:00:00.000Z'),
      status: SessionStatus.COMPLETED,
      workoutSets: [],
    });

    await expect(service.finish('s-1', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('finish throws when session does not exist', async () => {
    prismaMock.workoutSession.findFirst.mockResolvedValue(null);

    await expect(service.finish('s-1', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('finish sets totalVolumeKg to null when no valid weighted sets', async () => {
    prismaMock.workoutSession.findFirst.mockResolvedValue({
      id: 's-1',
      userId: 'user-1',
      startedAt: new Date(Date.now() - 300000),
      status: SessionStatus.IN_PROGRESS,
      workoutSets: [],
    });
    prismaMock.workoutSession.update.mockResolvedValue({ id: 's-1', status: SessionStatus.COMPLETED });

    await service.finish('s-1', 'user-1');

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.workoutSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalVolumeKg: null }),
      }),
    );
  });

  it('finish completes session and updates records transaction', async () => {
    const set1 = {
      id: 'set-1',
      sessionId: 's-1',
      exerciseId: 'e-1',
      reps: 8,
      weightKg: 100,
      isWarmup: false,
      loggedAt: new Date('2026-05-14T08:00:00.000Z'),
    };
    const set2 = {
      id: 'set-2',
      sessionId: 's-1',
      exerciseId: 'e-1',
      reps: 12,
      weightKg: 60,
      isWarmup: false,
      loggedAt: new Date('2026-05-14T08:01:00.000Z'),
    };

    prismaMock.workoutSession.findFirst.mockResolvedValue({
      id: 's-1',
      userId: 'user-1',
      startedAt: new Date(Date.now() - 600000),
      status: SessionStatus.IN_PROGRESS,
      workoutSets: [set1, set2],
    });
    prismaMock.personalRecord.findMany.mockResolvedValue([]);
    prismaMock.workoutSet.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.personalRecord.upsert.mockResolvedValue({ id: 'pr-1' });
    prismaMock.workoutSession.update.mockResolvedValue({ id: 's-1', status: SessionStatus.COMPLETED });

    const result = await service.finish('s-1', 'user-1');

    expect(prismaMock.personalRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_exerciseId_recordType: {
            userId: 'user-1',
            exerciseId: 'e-1',
            recordType: RecordType.MAX_WEIGHT,
          },
        },
      }),
    );
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(result.status).toBe(SessionStatus.COMPLETED);
  });

  it('cancel throws when session not found', async () => {
    prismaMock.workoutSession.findFirst.mockResolvedValue(null);

    await expect(service.cancel('s-1', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('cancel sets status to CANCELLED for active session', async () => {
    prismaMock.workoutSession.findFirst.mockResolvedValue({ id: 's-1', status: SessionStatus.IN_PROGRESS });
    prismaMock.workoutSession.update.mockResolvedValue({ id: 's-1', status: SessionStatus.CANCELLED });

    const result = await service.cancel('s-1', 'user-1');

    expect(result.status).toBe(SessionStatus.CANCELLED);
  });

  it('cancel throws when session is not IN_PROGRESS', async () => {
    prismaMock.workoutSession.findFirst.mockResolvedValue({
      id: 's-1',
      status: SessionStatus.COMPLETED,
    });

    await expect(service.cancel('s-1', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('logSet throws for missing session', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue(null);

    await expect(
      service.logSet('user-1', 's-1', {
        exercise: {
          exerciseDbId: '100',
          name: 'Bench Press',
          targetMuscles: ['chest'],
          bodyParts: ['upper body'],
          equipments: ['barbell'],
          secondaryMuscles: ['triceps'],
          instructions: ['Press up'],
        },
        setNumber: 1,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('logSet throws ForbiddenException for another user session', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue({
      id: 's-1',
      userId: 'other-user',
      status: SessionStatus.IN_PROGRESS,
    });

    await expect(
      service.logSet('user-1', 's-1', {
        exercise: {
          exerciseDbId: '100',
          name: 'Bench Press',
          targetMuscles: ['chest'],
          bodyParts: ['upper body'],
          equipments: ['barbell'],
          secondaryMuscles: ['triceps'],
          instructions: ['Press up'],
        },
        setNumber: 1,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('logSet throws when session is not active', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue({
      id: 's-1',
      userId: 'user-1',
      status: SessionStatus.COMPLETED,
    });

    await expect(
      service.logSet('user-1', 's-1', {
        exercise: {
          exerciseDbId: '100',
          name: 'Bench Press',
          targetMuscles: ['chest'],
          bodyParts: ['upper body'],
          equipments: ['barbell'],
          secondaryMuscles: ['triceps'],
          instructions: ['Press up'],
        },
        setNumber: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('logSet creates set when session is active and owned', async () => {
    prismaMock.workoutSession.findUnique.mockResolvedValue({
      id: 's-1',
      userId: 'user-1',
      status: SessionStatus.IN_PROGRESS,
    });
    exercisesServiceMock.upsertFromExternalApi.mockResolvedValue({ id: 'e-1' });
    prismaMock.workoutSet.create.mockResolvedValue({ id: 'set-1', exerciseId: 'e-1' });

    const result = await service.logSet('user-1', 's-1', {
      exercise: {
        exerciseDbId: '100',
        name: 'Bench Press',
        targetMuscles: ['chest'],
        bodyParts: ['upper body'],
        equipments: ['barbell'],
        secondaryMuscles: ['triceps'],
        instructions: ['Press up'],
      },
      setNumber: 1,
      reps: 8,
      weightKg: 80,
    });

    expect(exercisesServiceMock.upsertFromExternalApi).toHaveBeenCalled();
    expect(prismaMock.workoutSet.create).toHaveBeenCalled();
    expect(result.id).toBe('set-1');
  });
});
