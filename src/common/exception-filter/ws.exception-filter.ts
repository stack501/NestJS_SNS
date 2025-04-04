import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import {  BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch(HttpException)
export class WsErrorFilter extends BaseWsExceptionFilter<HttpException> {
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