import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginatedPayload<T> {
  data: T[];
  meta: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        // Paginated response: service returns { data: [], meta: {} }
        if (
          result !== null &&
          typeof result === 'object' &&
          'meta' in result &&
          'data' in result
        ) {
          const paginated = result as PaginatedPayload<unknown>;
          return {
            success: true,
            data: paginated.data as unknown as T,
            meta: paginated.meta,
          };
        }

        return { success: true, data: result };
      }),
    );
  }
}
