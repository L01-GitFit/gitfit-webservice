import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('getProfile forwards userId', async () => {
    usersServiceMock.findById.mockResolvedValue({ id: 'user-1' });

    const result = await controller.getProfile('user-1');

    expect(usersServiceMock.findById).toHaveBeenCalledWith('user-1');
    expect(result.id).toBe('user-1');
  });

  it('updateProfile forwards dto and userId', async () => {
    usersServiceMock.updateProfile.mockResolvedValue({ id: 'user-1', fullName: 'Updated' });
    const dto = { fullName: 'Updated' };

    const result = await controller.updateProfile('user-1', dto);

    expect(usersServiceMock.updateProfile).toHaveBeenCalledWith('user-1', dto);
    expect(result.fullName).toBe('Updated');
  });
});
