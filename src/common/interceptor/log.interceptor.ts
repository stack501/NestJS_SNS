import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
  import { Observable, tap } from 'rxjs';
  
  @Injectable()
  export class LogInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LogInterceptor.name);
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const req = context.switchToHttp().getRequest();
      const res = context.switchToHttp().getResponse();
      const { method, originalUrl: path } = req;
      const start = Date.now();
  
      this.logger.log(`[REQ] ${method} ${path} – ${new Date().toLocaleString('ko-KR')}`);
  
      return next.handle().pipe(
        tap(() => {
          const duration = Date.now() - start;
          this.logger.log(
            `[RES] ${method} ${path} – ${res.statusCode} – ${duration}ms`
          );
        })
      );
    }
  }