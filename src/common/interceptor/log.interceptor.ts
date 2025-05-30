import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
  import { Observable, tap } from 'rxjs';

/**
 * 로그 인터셉터
 * 
 * @description HTTP 요청과 GraphQL 요청을 모두 처리하여 요청/응답 정보를 로그로 출력합니다.
 * 실행 시간을 측정하여 성능 모니터링에 도움을 줍니다.
 */
@Injectable()
export class LogInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LogInterceptor.name);

    /**
     * 인터셉터 실행 메서드
     * 
     * @param context - 실행 컨텍스트 (HTTP 또는 GraphQL)
     * @param next - 다음 핸들러
     * @returns Observable 형태의 응답
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const now = new Date();

      // GraphQL 요청인지 확인하고, 맞다면 GqlExecutionContext 사용
      const gqlCtx = GqlExecutionContext.create(context);
      const info = gqlCtx.getInfo(); // GraphQL 요청의 경우 info 객체에서 정보 추출 가능
      const req = gqlCtx.getContext().req || context.switchToHttp().getRequest(); // 가드에서와 동일한 방식으로 req 객체 가져오기

      let requestInfo = 'Request - ';
      if (info && info.parentType && info.fieldName) { // GraphQL 요청인 경우
          requestInfo += `Type: ${info.parentType}, Field: ${info.fieldName}`;
          if (req && req.ip) { // req 객체가 있고 ip 정보가 있다면 추가
              requestInfo += `, IP: ${req.ip}`;
          }
      } else if (req) { // HTTP 요청인 경우 (기존 로직)
          const { method, originalUrl, ip } = req;
          requestInfo += `Method: ${method}, URL: ${originalUrl}, IP: ${ip}`;
      } else {
          requestInfo += 'Unknown request type';
      }

      console.log(`${requestInfo} - ${now.toLocaleString('kr')}`);

      return next.handle().pipe(
          tap(() => {
              // 응답 로깅 (필요한 경우)
              // GraphQL의 경우 응답 구조가 다를 수 있으므로, 응답 로깅 방식도 고려해야 합니다.
              // const res = gqlCtx.getContext().res || context.switchToHttp().getResponse();
              console.log(`Response - ${requestInfo} - ${new Date().toLocaleString('kr')} (Execution time: ${new Date().getMilliseconds() - now.getMilliseconds()}ms)`);
          })
      );
    }
  }