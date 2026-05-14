import { Test, TestingModule } from '@nestjs/testing';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';

describe('RoutinesController', () => {
  let controller: RoutinesController;

  const routinesServiceMock = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addExerciseToRoutine: jest.fn(),
    updateExercise: jest.fn(),
    removeExercise: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutinesController],
      providers: [{ provide: RoutinesService, useValue: routinesServiceMock }],
    }).compile();

    controller = module.get<RoutinesController>(RoutinesController);
    jest.clearAllMocks();
  });

  it('findAll forwards userId and programId', async () => {
    routinesServiceMock.findAll.mockResolvedValue([]);

    await controller.findAll('user-1', 'program-1');

    expect(routinesServiceMock.findAll).toHaveBeenCalledWith('user-1', 'program-1');
  });

  it('create forwards dto and userId', async () => {
    routinesServiceMock.create.mockResolvedValue({ id: 'r-1' });

    const result = await controller.create({ name: 'Push Day' } as never, 'user-1');

    expect(routinesServiceMock.create).toHaveBeenCalledWith({ name: 'Push Day' }, 'user-1');
    expect(result.id).toBe('r-1');
  });

  it('findOne forwards id and userId', async () => {
    routinesServiceMock.findOne.mockResolvedValue({ id: 'r-1' });

    const result = await controller.findOne('r-1', 'user-1');

    expect(routinesServiceMock.findOne).toHaveBeenCalledWith('r-1', 'user-1');
    expect(result.id).toBe('r-1');
  });

  it('update forwards id, userId, dto', async () => {
    routinesServiceMock.update.mockResolvedValue({ id: 'r-1', name: 'Updated' });

    const result = await controller.update('r-1', 'user-1', { name: 'Updated' } as never);

    expect(routinesServiceMock.update).toHaveBeenCalledWith('r-1', 'user-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('remove forwards id and userId', async () => {
    routinesServiceMock.remove.mockResolvedValue({ id: 'r-1' });

    const result = await controller.remove('r-1', 'user-1');

    expect(routinesServiceMock.remove).toHaveBeenCalledWith('r-1', 'user-1');
    expect(result.id).toBe('r-1');
  });

  it('addExercise forwards params', async () => {
    routinesServiceMock.addExerciseToRoutine.mockResolvedValue({ id: 're-1' });

    const result = await controller.addExercise('r-1', 'user-1', { orderIndex: 0 } as never);

    expect(routinesServiceMock.addExerciseToRoutine).toHaveBeenCalledWith('r-1', 'user-1', { orderIndex: 0 });
    expect(result.id).toBe('re-1');
  });

  it('updateExercise forwards params', async () => {
    routinesServiceMock.updateExercise.mockResolvedValue({ id: 're-1', sets: 4 });

    const result = await controller.updateExercise('r-1', 'ex-1', 'user-1', { sets: 4 } as never);

    expect(routinesServiceMock.updateExercise).toHaveBeenCalledWith('r-1', 'ex-1', 'user-1', { sets: 4 });
    expect(result.sets).toBe(4);
  });

  it('removeExercise forwards params', async () => {
    routinesServiceMock.removeExercise.mockResolvedValue({ id: 're-1' });

    const result = await controller.removeExercise('r-1', 'ex-1', 'user-1');

    expect(routinesServiceMock.removeExercise).toHaveBeenCalledWith('r-1', 'ex-1', 'user-1');
    expect(result.id).toBe('re-1');
  });
});
