import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma.service.mock';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;
  let prismaMock: PrismaMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-14T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('weeklyVolume', () => {
    it('returns weekly volume rows from raw query', async () => {
      const rows = [
        { week: new Date('2026-05-04T00:00:00.000Z'), totalVolumeKg: 1234 },
      ];
      prismaMock.$queryRaw.mockResolvedValue(rows);

      const result = await service.weeklyVolume('user-1', 4);

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual(rows);
    });
  });

  describe('exerciseProgress', () => {
    it('returns daily progress rows from raw query', async () => {
      const rows = [
        { date: new Date('2026-05-10T00:00:00.000Z'), maxWeightKg: 100, totalVolume: 500 },
      ];
      prismaMock.$queryRaw.mockResolvedValue(rows);

      const result = await service.exerciseProgress('user-1', 'exercise-1');

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual(rows);
    });
  });

  describe('muscleFrequency', () => {
    it('returns muscle frequency rows from raw query', async () => {
      const rows = [
        { muscle: 'chest', count: 10 },
        { muscle: 'triceps', count: 7 },
      ];
      prismaMock.$queryRaw.mockResolvedValue(rows);

      const result = await service.muscleFrequency('user-1', 14);

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual(rows);
    });
  });

  describe('workoutStreak', () => {
    it('returns zero streaks when no completed workout dates exist', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await service.workoutStreak('user-1');

      expect(result).toEqual({ currentStreak: 0, longestStreak: 0 });
    });

    it('calculates current streak when latest workout is today', async () => {
      prismaMock.$queryRaw.mockResolvedValue([
        { workout_date: new Date('2026-05-14T00:00:00.000Z') },
        { workout_date: new Date('2026-05-13T00:00:00.000Z') },
        { workout_date: new Date('2026-05-12T00:00:00.000Z') },
        { workout_date: new Date('2026-05-10T00:00:00.000Z') },
      ]);

      const result = await service.workoutStreak('user-1');

      expect(result).toEqual({ currentStreak: 3, longestStreak: 3 });
    });

    it('keeps current streak at zero when latest workout is older than yesterday', async () => {
      prismaMock.$queryRaw.mockResolvedValue([
        { workout_date: new Date('2026-05-11T00:00:00.000Z') },
        { workout_date: new Date('2026-05-10T00:00:00.000Z') },
        { workout_date: new Date('2026-05-09T00:00:00.000Z') },
      ]);

      const result = await service.workoutStreak('user-1');

      expect(result).toEqual({ currentStreak: 0, longestStreak: 3 });
    });

    it('computes longest streak independently from current streak', async () => {
      prismaMock.$queryRaw.mockResolvedValue([
        { workout_date: new Date('2026-05-13T00:00:00.000Z') },
        { workout_date: new Date('2026-05-10T00:00:00.000Z') },
        { workout_date: new Date('2026-05-09T00:00:00.000Z') },
        { workout_date: new Date('2026-05-08T00:00:00.000Z') },
      ]);

      const result = await service.workoutStreak('user-1');

      expect(result).toEqual({ currentStreak: 1, longestStreak: 3 });
    });
  });
});
