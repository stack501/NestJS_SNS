import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import {  BaseWsExceptionFilter } from '@nestjs/websockets';

/**
 * WebSocket 예외 필터
 * 
 * WebSocket 통신 중 발생하는 HTTP 예외를 처리합니다.
 * 예외 정보를 클라이언트에게 'exception' 이벤트로 전달합니다.
 */
@Catch(HttpException)
export class WsErrorFilter extends BaseWsExceptionFilter<HttpException> {
  /**
   * 예외 처리 메서드
   * 
   * WebSocket 연결에서 발생한 HTTP 예외를 처리하고
   * 클라이언트에게 예외 정보를 전달합니다.
   * 
   * @param exception 발생한 HTTP 예외
   * @param host 실행 컨텍스트 호스트
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const socket = host.switchToWs().getClient();

    socket.emit(
        'exception',
        {
            data: exception.getResponse(),
        }
    )
  }
}