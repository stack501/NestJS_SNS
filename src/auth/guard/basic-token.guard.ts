import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";

/**
 * Basic 토큰 인증 가드
 * 
 * @description HTTP Basic Authentication을 처리하는 가드입니다.
 * Authorization 헤더에서 Basic 토큰을 추출하여 이메일과 비밀번호를 검증합니다.
 * 
 * 구현 기능:
 * 1. 요청 객체에서 authorization header로부터 토큰을 가져옴
 * 2. authService.extractTokenFromHeader를 이용해서 사용할 수 있는 형태의 토큰을 추출
 * 3. authService.decodedBasicToken을 실행해서 email과 password를 추출
 * 4. email과 password를 이용해서 사용자를 가져옴 (authService.authenticateWithEmailAndPassword)
 * 5. 찾아낸 사용자를 요청 객체에 붙여줌 (req.user = user)
 */
@Injectable()
export class BasicTokenGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    /**
     * 가드 활성화 여부를 확인하는 메서드
     * 
     * @param context - 실행 컨텍스트
     * @returns 인증 성공 여부
     * @throws {UnauthorizedException} 토큰이 없거나 인증에 실패할 때
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        // { authorization: Basic asdfaldsfadlskfj }
        const rawToken = req.headers['authorization'];

        if(!rawToken) {
            throw new UnauthorizedException('토큰이 없습니다!');
        }

        const token = this.authService.extractTokenFromHeader(rawToken, false);

        const { email, password } = this.authService.decodeBasicToken(token);

        const user = await this.authService.authenticateWithEmailAndPassword({
            email,
            password,
        });

        req.user = user;

        return true;
    }
}