import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockResponse = { status: mockStatus };
const mockHost = {
  switchToHttp: () => ({ getResponse: () => mockResponse }),
} as unknown as ArgumentsHost;

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    jest.clearAllMocks();
  });

  describe('Prisma known errors', () => {
    it('maps P2002 (unique constraint) to 409 Conflict', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['email'] },
      });

      filter.catch(error, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: HttpStatus.CONFLICT }),
      );
    });

    it('maps P2025 (record not found) to 404', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      filter.catch(error, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('maps P2003 (foreign key) to 400', () => {
      const error = new Prisma.PrismaClientKnownRequestError('FK failed', {
        code: 'P2003',
        clientVersion: '5.0.0',
      });

      filter.catch(error, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('maps unknown Prisma code to 500', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unknown', {
        code: 'P9999',
        clientVersion: '5.0.0',
      });

      filter.catch(error, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('HttpException pass-through', () => {
    it('forwards HttpException status and message string', () => {
      const error = new HttpException('Not allowed', HttpStatus.FORBIDDEN);

      filter.catch(error, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: HttpStatus.FORBIDDEN }),
      );
    });

    it('joins array messages from validation errors', () => {
      const error = new HttpException(
        { message: ['field is required', 'email must be valid'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(error, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'field is required, email must be valid',
        }),
      );
    });
  });

  describe('Unknown errors', () => {
    it('returns 500 for unknown errors', () => {
      filter.catch(new Error('something unexpected'), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Internal server error' }),
      );
    });
  });
});
