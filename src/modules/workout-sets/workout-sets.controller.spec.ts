import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutSetsController } from './workout-sets.controller';
import { WorkoutSetsService } from './workout-sets.service';

describe('WorkoutSetsController', () => {
  let controller: WorkoutSetsController;

  const workoutSetsServiceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkoutSetsController],
      providers: [{ provide: WorkoutSetsService, useValue: workoutSetsServiceMock }],
    }).compile();

    controller = module.get<WorkoutSetsController>(WorkoutSetsController);
    jest.clearAllMocks();
  });

  it('findAll forwards sessionId, userId, query', async () => {
    workoutSetsServiceMock.findAll.mockResolvedValue({ data: [] });

    const result = await controller.findAll('session-1', 'user-1', { page: 1, limit: 20 });

    expect(workoutSetsServiceMock.findAll).toHaveBeenCalledWith('session-1', 'user-1', {
      page: 1,
      limit: 20,
    });
    expect(result.data).toEqual([]);
  });

  it('findOne forwards sessionId, setId, userId', async () => {
    workoutSetsServiceMock.findOne.mockResolvedValue({ id: 'set-1' });

    const result = await controller.findOne('session-1', 'set-1', 'user-1');

    expect(workoutSetsServiceMock.findOne).toHaveBeenCalledWith('session-1', 'set-1', 'user-1');
    expect(result.id).toBe('set-1');
  });

  it('create forwards params', async () => {
    workoutSetsServiceMock.create.mockResolvedValue({ id: 'set-1' });

    const result = await controller.create('session-1', { setNumber: 1 } as never, 'user-1');

    expect(workoutSetsServiceMock.create).toHaveBeenCalledWith('session-1', 'user-1', { setNumber: 1 });
    expect(result.id).toBe('set-1');
  });

  it('update forwards params', async () => {
    workoutSetsServiceMock.update.mockResolvedValue({ id: 'set-1', reps: 8 });

    const result = await controller.update('session-1', 'set-1', { reps: 8 } as never, 'user-1');

    expect(workoutSetsServiceMock.update).toHaveBeenCalledWith('session-1', 'set-1', 'user-1', { reps: 8 });
    expect(result.reps).toBe(8);
  });

  it('remove forwards params', async () => {
    workoutSetsServiceMock.remove.mockResolvedValue({ id: 'set-1' });

    const result = await controller.remove('session-1', 'set-1', 'user-1');

    expect(workoutSetsServiceMock.remove).toHaveBeenCalledWith('session-1', 'set-1', 'user-1');
    expect(result.id).toBe('set-1');
  });
});
