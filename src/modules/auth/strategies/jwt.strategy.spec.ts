import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../prisma/prisma.service.mock';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaMock: PrismaMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('returns user when token payload is valid', async () => {
    const user = { id: 'user-1', email: 'a@test.com', username: 'alice' };
    prismaMock.user.findUnique.mockResolvedValue(user);

    const result = await strategy.validate({ sub: 'user-1', email: 'a@test.com' });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, email: true, username: true },
    });
    expect(result).toEqual(user);
  });

  it('throws UnauthorizedException when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'ghost', email: 'ghost@test.com' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
