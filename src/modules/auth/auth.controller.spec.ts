import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    loginWithGoogle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('register forwards dto', async () => {
    authServiceMock.register.mockResolvedValue({ accessToken: 'a' });
    const dto = { email: 'a@test.com', username: 'a', password: '123456' };

    const result = await controller.register(dto);

    expect(authServiceMock.register).toHaveBeenCalledWith(dto);
    expect(result.accessToken).toBe('a');
  });

  it('login forwards dto', async () => {
    authServiceMock.login.mockResolvedValue({ accessToken: 'a' });

    const result = await controller.login({ email: 'a@test.com', password: '123456' });

    expect(authServiceMock.login).toHaveBeenCalled();
    expect(result.accessToken).toBe('a');
  });

  it('refresh throws UnauthorizedException when Bearer token is missing', async () => {
    expect(() => controller.refresh({ headers: {} } as never)).toThrow(
      UnauthorizedException,
    );
  });

  it('refresh forwards parsed bearer token', async () => {
    authServiceMock.refreshToken.mockResolvedValue({ accessToken: 'new-token' });

    const result = await controller.refresh({
      headers: { authorization: 'Bearer refresh-123' },
    } as never);

    expect(authServiceMock.refreshToken).toHaveBeenCalledWith('refresh-123');
    expect(result.accessToken).toBe('new-token');
  });

  it('logout forwards userId and refreshToken', async () => {
    authServiceMock.logout.mockResolvedValue({ message: 'ok' });

    const result = await controller.logout('user-1', 'rt-1');

    expect(authServiceMock.logout).toHaveBeenCalledWith('user-1', 'rt-1');
    expect(result.message).toBe('ok');
  });

  it('loginWithGoogle forwards idToken', async () => {
    authServiceMock.loginWithGoogle.mockResolvedValue({ accessToken: 'a' });

    const result = await controller.loginWithGoogle({ idToken: 'google-token' });

    expect(authServiceMock.loginWithGoogle).toHaveBeenCalledWith('google-token');
    expect(result.accessToken).toBe('a');
  });
});
