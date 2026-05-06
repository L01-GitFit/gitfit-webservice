import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockCallHandler: CallHandler;
  const mockContext = {} as ExecutionContext;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('wraps a plain value in { success: true, data }', (done) => {
    mockCallHandler = { handle: () => of({ id: '1', name: 'test' }) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({ success: true, data: { id: '1', name: 'test' } });
      done();
    });
  });

  it('unwraps paginated payload into { success, data, meta }', (done) => {
    const payload = { data: [{ id: '1' }], meta: { total: 1, page: 1 } };
    mockCallHandler = { handle: () => of(payload) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: [{ id: '1' }],
        meta: { total: 1, page: 1 },
      });
      done();
    });
  });

  it('wraps null value', (done) => {
    mockCallHandler = { handle: () => of(null) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({ success: true, data: null });
      done();
    });
  });

  it('wraps string value', (done) => {
    mockCallHandler = { handle: () => of('ok') };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({ success: true, data: 'ok' });
      done();
    });
  });

  it('treats object with meta but no data as a plain value', (done) => {
    // Object has meta but no data — should NOT be treated as paginated
    const value = { meta: { page: 1 }, message: 'done' };
    mockCallHandler = { handle: () => of(value) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({ success: true, data: value });
      done();
    });
  });
});
