import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma.service.mock';

const userId = 'user-uuid-1';

const dbProfile = {
  id: userId,
  email: 'alice@test.com',
  username: 'alice',
  fullName: 'Alice',
  avatarUrl: null,
  dateOfBirth: null,
  gender: null,
  heightCm: null,
  weightKg: null,
  fitnessGoal: null,
  experienceLevel: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: PrismaMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the user profile when found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(dbProfile);

      const result = await service.findById(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userId } }),
      );
      expect(result).toEqual(dbProfile);
    });

    it('throws NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates and returns the profile', async () => {
      const updated = { ...dbProfile, fullName: 'Alice Updated' };
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: userId }) // existence check
        .mockResolvedValueOnce(updated);
      prismaMock.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile(userId, { fullName: 'Alice Updated' });

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userId } }),
      );
      expect(result.fullName).toBe('Alice Updated');
    });

    it('converts dateOfBirth string to Date object', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: userId });
      prismaMock.user.update.mockResolvedValue({
        ...dbProfile,
        dateOfBirth: new Date('1995-06-15'),
      });

      await service.updateProfile(userId, { dateOfBirth: '1995-06-15' });

      const updateCall = prismaMock.user.update.mock.calls[0][0];
      expect(updateCall.data.dateOfBirth).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('ghost-id', { fullName: 'Ghost' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
