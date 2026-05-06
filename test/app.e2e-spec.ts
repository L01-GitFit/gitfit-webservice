import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new PrismaExceptionFilter());

    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Auth endpoints ─────────────────────────────────────────────────────────

  describe('/auth/register (POST)', () => {
    const dto = {
      email: `e2e-${Date.now()}@test.com`,
      username: `e2e_user_${Date.now()}`,
      password: 'Password123!',
    };

    afterAll(async () => {
      await prismaService.user.deleteMany({ where: { email: dto.email } });
    });

    it('registers a new user and returns 201 with tokens', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data).toHaveProperty('user');
        });
    });

    it('returns 409 when email is already taken', async () => {
      await request(app.getHttpServer()).post('/auth/register').send(dto);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(409);
    });

    it('returns 400 for invalid body (missing fields)', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'bad' })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    const credentials = {
      email: `login-e2e-${Date.now()}@test.com`,
      username: `login_e2e_${Date.now()}`,
      password: 'Password123!',
    };
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials);
      accessToken = res.body.data?.accessToken;
      refreshToken = res.body.data?.refreshToken;
    });

    afterAll(async () => {
      await prismaService.user.deleteMany({ where: { email: credentials.email } });
    });

    it('returns tokens on valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
        });
    });

    it('returns 401 on wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: credentials.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('returns 401 on unknown email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'anypassword' })
        .expect(401);
    });

    // ── Refresh token ──────────────────────────────────────────────────────

    it('returns new access token via /auth/refresh', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
        });
    });

    // ── Protected route (users/me) ─────────────────────────────────────────

    it('GET /users/me returns profile with valid JWT', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('email', credentials.email);
        });
    });

    it('GET /users/me returns 401 without JWT', () => {
      return request(app.getHttpServer()).get('/users/me').expect(401);
    });

    // ── Logout ─────────────────────────────────────────────────────────────

    it('logs out via /auth/logout', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);
    });
  });

  // ── Exercises endpoints ────────────────────────────────────────────────────

  describe('/exercises (GET)', () => {
    it('returns 200 with paginated exercises (public endpoint)', () => {
      return request(app.getHttpServer())
        .get('/exercises')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toHaveProperty('total');
        });
    });
  });
});
