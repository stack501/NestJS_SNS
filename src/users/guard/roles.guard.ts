import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql"; // GraphQL 실행 컨텍스트 임포트
import { ROLES_KEY } from "../decorator/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
    ) {}

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