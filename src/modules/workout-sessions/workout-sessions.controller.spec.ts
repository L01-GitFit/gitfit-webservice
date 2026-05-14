import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutSessionsController } from './workout-sessions.controller';
import { WorkoutSessionsService } from './workout-sessions.service';

describe('WorkoutSessionsController', () => {
  let controller: WorkoutSessionsController;

  const workoutSessionsServiceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    finish: jest.fn(),
    cancel: jest.fn(),
    logSet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkoutSessionsController],
      providers: [{ provide: WorkoutSessionsService, useValue: workoutSessionsServiceMock }],
    }).compile();

    controller = module.get<WorkoutSessionsController>(WorkoutSessionsController);
    jest.clearAllMocks();
  });

  it('findAll forwards userId and query', async () => {
    workoutSessionsServiceMock.findAll.mockResolvedValue({ data: [] });

    const result = await controller.findAll('user-1', { page: 1, limit: 20 });

    expect(workoutSessionsServiceMock.findAll).toHaveBeenCalledWith('user-1', { page: 1, limit: 20 });
    expect(result.data).toEqual([]);
  });

  it('findOne forwards id and userId', async () => {
    workoutSessionsServiceMock.findOne.mockResolvedValue({ id: 's-1' });

    const result = await controller.findOne('s-1', 'user-1');

    expect(workoutSessionsServiceMock.findOne).toHaveBeenCalledWith('s-1', 'user-1');
    expect(result.id).toBe('s-1');
  });

  it('create forwards dto and userId', async () => {
    workoutSessionsServiceMock.create.mockResolvedValue({ id: 's-1' });

    const result = await controller.create({ notes: 'good' } as never, 'user-1');

    expect(workoutSessionsServiceMock.create).toHaveBeenCalledWith({ notes: 'good' }, 'user-1');
    expect(result.id).toBe('s-1');
  });

  it('finish forwards id and userId', async () => {
    workoutSessionsServiceMock.finish.mockResolvedValue({ id: 's-1', status: 'COMPLETED' });

    const result = await controller.finish('s-1', 'user-1');

    expect(workoutSessionsServiceMock.finish).toHaveBeenCalledWith('s-1', 'user-1');
    expect(result.status).toBe('COMPLETED');
  });

  it('cancel forwards id and userId', async () => {
    workoutSessionsServiceMock.cancel.mockResolvedValue({ id: 's-1', status: 'CANCELLED' });

    const result = await controller.cancel('s-1', 'user-1');

    expect(workoutSessionsServiceMock.cancel).toHaveBeenCalledWith('s-1', 'user-1');
    expect(result.status).toBe('CANCELLED');
  });

  it('logSet forwards userId, sessionId, dto', async () => {
    workoutSessionsServiceMock.logSet.mockResolvedValue({ id: 'set-1' });

    const result = await controller.logSet('s-1', 'user-1', { setNumber: 1 } as never);

    expect(workoutSessionsServiceMock.logSet).toHaveBeenCalledWith('user-1', 's-1', { setNumber: 1 });
    expect(result.id).toBe('set-1');
  });
});
