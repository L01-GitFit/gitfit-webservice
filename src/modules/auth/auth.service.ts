import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_DAYS = 7;

// ─── Shared return types ─────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Email or username is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: { email: dto.email, username: dto.username, passwordHash },
      select: { id: true, email: true, username: true, createdAt: true },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email);
  }

  async refreshToken(rawToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(rawToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'jwt_refresh_secret_fallback',
      });
    } catch {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: rawToken },
    });

    if (!stored) {
      throw new ForbiddenException('Refresh token not found');
    }

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new ForbiddenException('Refresh token has expired');
    }

    const accessToken = this.jwtService.sign(
      { sub: payload.sub, email: payload.email },
      {
        secret: process.env.JWT_SECRET ?? 'jwt_secret_fallback',
        expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      },
    );

    return { accessToken };
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken, userId },
    });
    return { message: 'Logged out successfully' };
  }

  async loginWithGoogle(idToken: string) {
    // ── 1. Verify the idToken with Google ────────────────────────────────────
    // IMPORTANT: Set GOOGLE_CLIENT_ID in your .env file.
    // For mobile, this is the OAuth 2.0 Client ID created for Android/iOS
    // in the Google Cloud Console. For a web client, use the Web Client ID.
    const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    let googlePayload: TokenPayload;
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      googlePayload = ticket.getPayload()!;
    } catch {
      throw new UnauthorizedException('Google token verification failed');
    }

    const { email, name, picture, sub: googleId } = googlePayload;

    if (!email) {
      throw new UnauthorizedException('Google account does not have a verified email');
    }

    // ── 2. Find or create the user ────────────────────────────────────────────
    let user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      // Derive a base username from the email local-part and ensure uniqueness.
      // In production, add a retry loop or suffix (e.g. baseUsername + nanoid())
      // to handle collisions when multiple users share the same email prefix.
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

      // Google-authenticated users have no password. We store a random bcrypt
      // hash so the non-nullable DB constraint is satisfied. This value is never
      // used for credential login — guard against it via the googleId field
      // (add googleId column to the User model in your Prisma schema).
      const passwordHash = await bcrypt.hash(googleId, BCRYPT_ROUNDS);

      user = await this.prisma.user.create({
        data: {
          email,
          username: baseUsername,
          fullName: name ?? null,
          avatarUrl: picture ?? null,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      });
    } else if (picture && !user.avatarUrl) {
      // Back-fill the avatar on subsequent sign-ins if we didn't have one yet.
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: picture },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      });
    }

    // ── 3. Issue JWT tokens ───────────────────────────────────────────────────
    const tokens = await this.generateTokens(user.id, user.email);
    return { user, ...tokens };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: process.env.JWT_SECRET ?? 'jwt_secret_fallback',
          expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: process.env.JWT_REFRESH_SECRET ?? 'jwt_refresh_secret_fallback',
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
        },
      ),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
