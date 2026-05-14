import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

describe('StatsController', () => {
  let controller: StatsController;

  const statsServiceMock = {
    weeklyVolume: jest.fn(),
    exerciseProgress: jest.fn(),
    muscleFrequency: jest.fn(),
    workoutStreak: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [{ provide: StatsService, useValue: statsServiceMock }],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    jest.clearAllMocks();
  });

  it('weeklyVolume forwards userId and weeks', async () => {
    statsServiceMock.weeklyVolume.mockResolvedValue([]);

    await controller.weeklyVolume('user-1', 8);

    expect(statsServiceMock.weeklyVolume).toHaveBeenCalledWith('user-1', 8);
  });

  it('exerciseProgress forwards userId and exerciseId', async () => {
    statsServiceMock.exerciseProgress.mockResolvedValue([]);

    await controller.exerciseProgress('user-1', 'exercise-1');

    expect(statsServiceMock.exerciseProgress).toHaveBeenCalledWith('user-1', 'exercise-1');
  });

  it('muscleFrequency forwards userId and days', async () => {
    statsServiceMock.muscleFrequency.mockResolvedValue([]);

    await controller.muscleFrequency('user-1', 30);

    expect(statsServiceMock.muscleFrequency).toHaveBeenCalledWith('user-1', 30);
  });

  it('workoutStreak forwards userId', async () => {
    statsServiceMock.workoutStreak.mockResolvedValue({ currentStreak: 1, longestStreak: 2 });

    const result = await controller.workoutStreak('user-1');

    expect(statsServiceMock.workoutStreak).toHaveBeenCalledWith('user-1');
    expect(result.currentStreak).toBe(1);
  });
});
