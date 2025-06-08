import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

// 요청 본문 타입 정의
interface RequestBody {
  [key: string]: unknown;
}

// 민감한 정보가 제거된 본문 타입
interface SanitizedBody {
  [key: string]: unknown;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception.getStatus();

        const res = exception.getResponse();
        const error = typeof res === 'object' && res !== null && 'error' in res 
            ? (res as { error: string }).error 
            : exception.message;
        const message = typeof res === 'object' && res !== null && 'message' in res 
            ? (res as { message: string | string[] }).message 
            : exception.message;

        // 상세 로그 정보
        const logData = {
            statusCode: status,
            error,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            userId: request.user?.id || 'anonymous',
            ip: request.ip,
            userAgent: request.headers?.['user-agent'] || '',
            body: this.sanitizeRequestBody(request.body as RequestBody),
        };

        // 로그 레벨 분리
        if (status >= 500) {
            this.logger.error('HTTP Server Error', logData);
        } else if (status >= 400) {
            this.logger.warn('HTTP Client Error', logData);
        }

        // 클라이언트 응답
        response.status(status).json({
            statusCode: status,
            error,
            message,
            timeStamp: new Date().toLocaleString('kr'),
            path: request.url,
        });
    }

    /**
     * 요청 본문에서 민감한 정보를 제거합니다
     * @param body 요청 본문
     * @returns 민감한 정보가 제거된 본문
     */
    private sanitizeRequestBody(body: RequestBody | null | undefined): SanitizedBody | null {
        if (!body || typeof body !== 'object') {
            return body as null;
        }
        
        const sensitiveFields = ['password', 'token', 'secret', 'accessToken', 'refreshToken'];
        const sanitized: SanitizedBody = { ...body };
        
        sensitiveFields.forEach(field => {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }
}