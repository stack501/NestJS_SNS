import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorator/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate{
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

        // Roles Annotaion이 등록되어있지 않음
        if(!requiredRole) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if(!user) {
            throw new UnauthorizedException(
                `토큰을 제공해주세요.`
            );
        }

        if(user.role !== requiredRole) {
            throw new ForbiddenException(
                `이 작업을 수행할 권한이 없습니다. ${requiredRole} 권한이 필요합니다.`
            );
        }

        return true;
    }
}