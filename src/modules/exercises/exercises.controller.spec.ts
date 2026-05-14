import { Test, TestingModule } from '@nestjs/testing';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

describe('ExercisesController', () => {
  let controller: ExercisesController;

  const exercisesServiceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExercisesController],
      providers: [{ provide: ExercisesService, useValue: exercisesServiceMock }],
    }).compile();

    controller = module.get<ExercisesController>(ExercisesController);
    jest.clearAllMocks();
  });

  it('findAll forwards query', async () => {
    exercisesServiceMock.findAll.mockResolvedValue({ data: [] });

    const result = await controller.findAll({ page: 1, limit: 20 });

    expect(exercisesServiceMock.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result.data).toEqual([]);
  });

  it('findOne forwards id', async () => {
    exercisesServiceMock.findOne.mockResolvedValue({ id: 'ex-1' });

    const result = await controller.findOne('ex-1');

    expect(exercisesServiceMock.findOne).toHaveBeenCalledWith('ex-1');
    expect(result.id).toBe('ex-1');
  });

  it('create forwards dto and userId', async () => {
    exercisesServiceMock.create.mockResolvedValue({ id: 'ex-1' });

    const result = await controller.create({ name: 'Bench' } as never, 'user-1');

    expect(exercisesServiceMock.create).toHaveBeenCalledWith({ name: 'Bench' }, 'user-1');
    expect(result.id).toBe('ex-1');
  });

  it('update forwards id, dto, userId', async () => {
    exercisesServiceMock.update.mockResolvedValue({ id: 'ex-1', name: 'Updated' });

    const result = await controller.update('ex-1', { name: 'Updated' } as never, 'user-1');

    expect(exercisesServiceMock.update).toHaveBeenCalledWith('ex-1', { name: 'Updated' }, 'user-1');
    expect(result.name).toBe('Updated');
  });

  it('remove forwards id and userId', async () => {
    exercisesServiceMock.remove.mockResolvedValue({ message: 'ok' });

    const result = await controller.remove('ex-1', 'user-1');

    expect(exercisesServiceMock.remove).toHaveBeenCalledWith('ex-1', 'user-1');
    expect(result.message).toBe('ok');
  });
});
