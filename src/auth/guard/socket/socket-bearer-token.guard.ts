import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { AuthService } from "src/auth/auth.service";
import { UsersService } from "src/users/users.service";

/**
 * WebSocket 연결에 대한 Bearer 토큰 인증 가드
 * 
 * WebSocket 핸드셰이크 과정에서 Authorization 헤더의 Bearer 토큰을 검증하고,
 * 유효한 토큰인 경우 사용자 정보를 소켓 객체에 첨부합니다.
 * 
 * @example
 * ```typescript
 * @UseGuards(SocketBearerTokenGuard)
 * @SubscribeMessage('join-room')
 * handleJoinRoom(client: Socket, data: any) { ... }
 * ```
 */
@Injectable()
export class SocketBearerTokenGuard implements CanActivate {
    /**
     * SocketBearerTokenGuard 생성자
     * 
     * @param authService - 인증 서비스, 토큰 추출 및 검증에 사용
     * @param usersService - 사용자 서비스, 토큰에서 추출한 이메일로 사용자 정보 조회에 사용
     */
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
    ) {}

    /**
     * WebSocket 연결에 대한 토큰 인증을 수행합니다.
     * 
     * 인증 과정:
     * 1. WebSocket 핸드셰이크에서 Authorization 헤더 추출
     * 2. Bearer 토큰 형식 검증 및 토큰 추출
     * 3. 토큰 유효성 검증 및 페이로드 디코딩
     * 4. 사용자 정보 조회 및 소켓 객체에 첨부
     * 
     * @param context - WebSocket 실행 컨텍스트
     * @returns 인증 성공 여부를 나타내는 Promise<boolean>
     * @throws WsException - 토큰이 없거나 유효하지 않은 경우
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const socket = context.switchToWs().getClient();

        const headers = socket.handshake.headers;

        const rawToken = headers['authorization']

        if(!rawToken) {
            throw new WsException('토큰이 없습니다!');
        }

        try {
            const token = this.authService.extractTokenFromHeader(rawToken, true);

            const payload = await this.authService.verifyToken(token);
            const user = await this.usersService.getUserByEmail(payload.email);

            socket.user = user;
            socket.token = token;
            socket.tokenType = payload.tokenType;

            return true;
        } catch (error) {
            throw new WsException(`${error} : 토큰이 유효하지 않습니다.`);
        }
    }
}