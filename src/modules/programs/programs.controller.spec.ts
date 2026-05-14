import { Test, TestingModule } from '@nestjs/testing';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';

describe('ProgramsController', () => {
  let controller: ProgramsController;

  const programsServiceMock = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramsController],
      providers: [{ provide: ProgramsService, useValue: programsServiceMock }],
    }).compile();

    controller = module.get<ProgramsController>(ProgramsController);
    jest.clearAllMocks();
  });

  it('findAll forwards userId to service', async () => {
    programsServiceMock.findAll.mockResolvedValue([{ id: 'program-1' }]);

    const result = await controller.findAll('user-1');

    expect(programsServiceMock.findAll).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([{ id: 'program-1' }]);
  });

  it('create forwards dto and userId to service', async () => {
    const dto = { name: 'Hypertrophy' };
    programsServiceMock.create.mockResolvedValue({ id: 'program-1', ...dto });

    const result = await controller.create(dto, 'user-1');

    expect(programsServiceMock.create).toHaveBeenCalledWith(dto, 'user-1');
    expect(result).toEqual({ id: 'program-1', ...dto });
  });

  it('findOne forwards id and userId to service', async () => {
    programsServiceMock.findOne.mockResolvedValue({ id: 'program-1' });

    const result = await controller.findOne('program-1', 'user-1');

    expect(programsServiceMock.findOne).toHaveBeenCalledWith('program-1', 'user-1');
    expect(result).toEqual({ id: 'program-1' });
  });

  it('update forwards params to service', async () => {
    const dto = { name: 'Updated Plan' };
    programsServiceMock.update.mockResolvedValue({ id: 'program-1', ...dto });

    const result = await controller.update('program-1', 'user-1', dto);

    expect(programsServiceMock.update).toHaveBeenCalledWith('program-1', 'user-1', dto);
    expect(result.name).toBe('Updated Plan');
  });

  it('remove forwards params to service', async () => {
    programsServiceMock.remove.mockResolvedValue({ id: 'program-1' });

    const result = await controller.remove('program-1', 'user-1');

    expect(programsServiceMock.remove).toHaveBeenCalledWith('program-1', 'user-1');
    expect(result).toEqual({ id: 'program-1' });
  });

  it('activate forwards params to service', async () => {
    programsServiceMock.activate.mockResolvedValue({ id: 'program-1', isActive: true });

    const result = await controller.activate('program-1', 'user-1');

    expect(programsServiceMock.activate).toHaveBeenCalledWith('program-1', 'user-1');
    expect(result.isActive).toBe(true);
  });
});
