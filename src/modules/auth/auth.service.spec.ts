import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma.service.mock';

// ── Mock google-auth-library so no real HTTP calls occur ──────────────────────
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// ── Shared test data ──────────────────────────────────────────────────────────

const userId = 'user-uuid-1';
const userEmail = 'alice@test.com';
const userUsername = 'alice';
const rawPassword = 'password123';
const hashedPassword = '$2b$12$hashedpassword';

const dbUser = {
  id: userId,
  email: userEmail,
  username: userUsername,
  passwordHash: hashedPassword,
  fullName: 'Alice',
  avatarUrl: null,
  createdAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: PrismaMock;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      sign: jest.fn().mockReturnValue('signed-access-token'),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    // Re-assign after clearAllMocks so signAsync stub still works
    jwtService.signAsync.mockResolvedValue('signed-token');
    jwtService.sign.mockReturnValue('signed-access-token');
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a new user and returns tokens', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: userId,
        email: userEmail,
        username: userUsername,
        createdAt: new Date(),
      });
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: userEmail,
        username: userUsername,
        password: rawPassword,
      });

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ email: userEmail }, { username: userUsername }] },
        }),
      );
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('throws ConflictException when email or username is already taken', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register({
          email: userEmail,
          username: userUsername,
          password: rawPassword,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prismaMock.user.findUnique.mockResolvedValue(dbUser);
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: userEmail, password: rawPassword });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UnauthorizedException when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: rawPassword }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      prismaMock.user.findUnique.mockResolvedValue(dbUser);

      await expect(
        service.login({ email: userEmail, password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refreshToken ────────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    const rawToken = 'valid-refresh-token';
    const jwtPayload = { sub: userId, email: userEmail };

    it('returns new access token for a valid refresh token', async () => {
      jwtService.verify.mockReturnValue(jwtPayload);
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: rawToken,
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      const result = await service.refreshToken(rawToken);

      expect(result).toHaveProperty('accessToken');
    });

    it('throws ForbiddenException when JWT verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when token is not in DB', async () => {
      jwtService.verify.mockReturnValue(jwtPayload);
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(rawToken)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException and deletes token when expired', async () => {
      jwtService.verify.mockReturnValue(jwtPayload);
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: rawToken,
        userId,
        expiresAt: new Date(Date.now() - 1000),
      });
      prismaMock.refreshToken.delete.mockResolvedValue({});

      await expect(service.refreshToken(rawToken)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      });
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes the refresh token and returns success message', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout(userId, 'some-token');

      expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token', userId },
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  // ── loginWithGoogle ─────────────────────────────────────────────────────────

  describe('loginWithGoogle', () => {
    const googlePayload = {
      email: 'bob@gmail.com',
      name: 'Bob',
      picture: 'https://pic.example.com/bob.jpg',
      sub: 'google-sub-123',
    };

    const buildTicket = (payload: typeof googlePayload) => ({
      getPayload: () => payload,
    });

    it('creates a new user and returns tokens', async () => {
      mockVerifyIdToken.mockResolvedValue(buildTicket(googlePayload));
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: googlePayload.email,
        username: 'bob',
        fullName: googlePayload.name,
        avatarUrl: googlePayload.picture,
      });
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.loginWithGoogle('google-id-token');

      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('returns existing user without creating a new one', async () => {
      mockVerifyIdToken.mockResolvedValue(buildTicket(googlePayload));
      const existingUser = {
        id: userId,
        email: googlePayload.email,
        username: 'existing',
        fullName: 'Existing User',
        avatarUrl: 'https://pic.example.com/existing.jpg',
      };
      prismaMock.user.findUnique.mockResolvedValue(existingUser);
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.loginWithGoogle('google-id-token');

      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(result.user).toEqual(existingUser);
    });

    it('throws UnauthorizedException when Google verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.loginWithGoogle('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
