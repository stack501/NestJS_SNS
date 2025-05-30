import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql"; // GraphQL 실행 컨텍스트 임포트
import { ROLES_KEY } from "../decorator/roles.decorator";

/**
 * 사용자 역할(Role) 기반 접근 제어를 담당하는 가드
 * 
 * HTTP 요청과 GraphQL 요청 모두를 지원하며, 
 * 데코레이터로 지정된 역할 요구사항을 검증합니다.
 * 
 * @example
 * ```typescript
 * @UseGuards(RolesGuard)
 * @Roles(RoleEnum.ADMIN)
 * async deleteUser() { ... }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
    /**
     * RolesGuard 생성자
     * 
     * @param reflector - 메타데이터 리플렉터, 데코레이터에서 설정된 역할 정보를 추출하는 데 사용
     */
    constructor(
        private readonly reflector: Reflector,
    ) {}

    /**
     * 사용자의 역할이 요구사항을 충족하는지 검증합니다.
     * 
     * - Roles 데코레이터가 없으면 통과
     * - HTTP와 GraphQL 요청 모두 지원
     * - 사용자 인증 상태 및 역할 권한 검증
     * 
     * @param context - 실행 컨텍스트 (HTTP 또는 GraphQL)
     * @returns 접근 허용 여부
     * @throws UnauthorizedException - 토큰이 없거나 요청 컨텍스트에 접근할 수 없는 경우
     * @throws ForbiddenException - 사용자 역할이 요구사항과 일치하지 않는 경우
     */
    canActivate(context: ExecutionContext): boolean {
        const requiredRole = this.reflector.getAllAndOverride(
            ROLES_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ]
        );

        // Roles Annotation이 등록되어있지 않음
        if (!requiredRole) {
            return true;
        }

        let request;

        // HTTP 요청과 GraphQL 요청 모두 처리
        if (context.getType() === 'http') {
            // REST API 요청인 경우
            request = context.switchToHttp().getRequest();
        } else {
            // GraphQL 요청인 경우
            const gqlContext = GqlExecutionContext.create(context);
            request = gqlContext.getContext().req;
        }

        // 요청 객체가 없는 경우 (예상치 못한 컨텍스트)
        if (!request) {
            throw new UnauthorizedException('요청 컨텍스트에 접근할 수 없습니다.');
        }

        const { user } = request;

        if (!user) {
            throw new UnauthorizedException(
                `토큰을 제공해주세요.`
            );
        }

        if (user.role !== requiredRole) {
            throw new ForbiddenException(
                `이 작업을 수행할 권한이 없습니다. ${requiredRole} 권한이 필요합니다.`
            );
        }

        return true;
    }
}