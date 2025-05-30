import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";

/**
 * HTTP 예외 필터
 * 
 * HTTP 요청 처리 중 발생하는 예외를 전역적으로 처리합니다.
 * 예외 정보를 일관된 형태로 클라이언트에게 응답합니다.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    /**
     * 예외 처리 메서드
     * 
     * HTTP 예외를 캐치하여 구조화된 에러 응답을 생성합니다.
     * 상태 코드, 에러 메시지, 타임스탬프, 요청 경로 등을 포함합니다.
     * 
     * @param exception 발생한 HTTP 예외
     * @param host 실행 컨텍스트 호스트
     */
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