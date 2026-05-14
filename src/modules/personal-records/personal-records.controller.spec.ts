import { Test, TestingModule } from '@nestjs/testing';
import { PersonalRecordsController } from './personal-records.controller';
import { PersonalRecordsService } from './personal-records.service';

describe('PersonalRecordsController', () => {
  let controller: PersonalRecordsController;

  const personalRecordsServiceMock = {
    findAll: jest.fn(),
    findByExercise: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonalRecordsController],
      providers: [{ provide: PersonalRecordsService, useValue: personalRecordsServiceMock }],
    }).compile();

    controller = module.get<PersonalRecordsController>(PersonalRecordsController);
    jest.clearAllMocks();
  });

  it('findAll forwards userId and optional exerciseId', async () => {
    personalRecordsServiceMock.findAll.mockResolvedValue([{ id: 'pr-1' }]);

    const result = await controller.findAll('user-1', 'exercise-1');

    expect(personalRecordsServiceMock.findAll).toHaveBeenCalledWith('user-1', 'exercise-1');
    expect(result).toEqual([{ id: 'pr-1' }]);
  });

  it('findByExercise forwards userId and exerciseId', async () => {
    personalRecordsServiceMock.findByExercise.mockResolvedValue([{ id: 'pr-2' }]);

    const result = await controller.findByExercise('user-1', 'exercise-1');

    expect(personalRecordsServiceMock.findByExercise).toHaveBeenCalledWith('user-1', 'exercise-1');
    expect(result).toEqual([{ id: 'pr-2' }]);
  });
});
