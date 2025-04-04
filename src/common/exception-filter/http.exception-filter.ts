import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception.getStatus();

        const res = exception.getResponse();
        const error = typeof res === 'object' && (res as any).error ? (res as any).error : exception.message;
        const message = typeof res === 'object' && (res as any).message ? (res as any).message : exception.message;

        response.status(status).json({
            statusCode: status,
            error,        // 예: "Bad Request"
            message,      // 예: "테스트"
            timeStamp: new Date().toLocaleString('kr'),
            path: request.url,
        });
    }
}