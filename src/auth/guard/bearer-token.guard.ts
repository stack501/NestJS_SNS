import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { UsersService } from "src/users/users.service";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "src/common/decorator/is-public.decorator";
import { IsPublicEnum } from "src/common/const/is-public.const";
import { GqlExecutionContext } from "@nestjs/graphql";

@Injectable()
export class BearerTokenGuard implements CanActivate {
    constructor(
        protected readonly authService: AuthService,
        protected readonly usersService: UsersService,
        protected readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
          ]);
      
          if (isPublic) {
            return true;
          }

        // GraphQL 요청인지 확인하고, 맞다면 GqlExecutionContext 사용
        const gqlContext = GqlExecutionContext.create(context);
        const req = gqlContext.getContext().req || context.switchToHttp().getRequest(); // GraphQL 컨텍스트에서 req 가져오기, 없으면 HTTP 컨텍스트 시도

        if (!req) {
            // 요청 객체를 가져올 수 없는 경우 (예상치 못한 상황)
            throw new UnauthorizedException('Request object not found in context.');
        }

        const rawToken = req.headers['authorization']; // 여기서 req.headers 접근

        if (!rawToken) {
            throw new UnauthorizedException('토큰이 없습니다!');
        }

        const token = this.authService.extractTokenFromHeader(rawToken, true);
        const result = await this.authService.verifyToken(token);
        const user = await this.usersService.getUserByEmail(result.email);

        // req에 user 정보 주입 (GraphQL 컨텍스트와 HTTP 컨텍스트 모두에)
        if (gqlContext.getContext().req) {
            gqlContext.getContext().req.user = user;
            gqlContext.getContext().req.token = token;
            gqlContext.getContext().req.tokenType = result.type;
        } else {
            req.user = user;
            req.token = token;
            req.tokenType = result.type;
        }

        return true;
    }
}

@Injectable()
export class AccessTokenGuard extends BearerTokenGuard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 1. 현재 경로가 @IsPublic으로 지정되었는지 확인 (BearerTokenGuard와 동일한 방식)
        const isPublic = this.reflector.getAllAndOverride<IsPublicEnum>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic === IsPublicEnum.IS_PUBLIC) {
            // 공개 경로이면 AccessTokenGuard도 즉시 통과
            return true;
        }

        // 2. 공개 경로가 아니라면, BearerTokenGuard의 로직 실행
        // (토큰 추출, 기본 검증. 실패 시 BearerTokenGuard에서 예외 발생)
        await super.canActivate(context);

        // 3. BearerTokenGuard가 성공적으로 완료되었다면, req 객체를 올바르게 가져옴
        const gqlContext = GqlExecutionContext.create(context);
        const req = gqlContext.getContext().req || context.switchToHttp().getRequest();

        if (!req) {
            // 이 경우는 super.canActivate()가 req를 설정하지 않았거나, 컨텍스트에서 req를 찾을 수 없는 예외적 상황
            throw new UnauthorizedException('Request object not found in AccessTokenGuard.');
        }

        if (!req.tokenType) {
            // BearerTokenGuard에서 tokenType을 설정해야 함
            throw new UnauthorizedException('Token type not found on request.');
        }

        if (req.tokenType !== 'access') {
            throw new UnauthorizedException('Access Token이 아닙니다.');
        }

        return true;
    }
}

@Injectable()
export class RefreshTokenGuard extends BearerTokenGuard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<IsPublicEnum>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Refresh 토큰 경로는 일반적으로 공개되지 않으므로, 이 조건은 거의 해당되지 않을 수 있습니다.
        if (isPublic === IsPublicEnum.IS_PUBLIC) {
            return true;
        }

        await super.canActivate(context);

        const gqlContext = GqlExecutionContext.create(context);
        const req = gqlContext.getContext().req || context.switchToHttp().getRequest();

        if (!req) {
            throw new UnauthorizedException('Request object not found in RefreshTokenGuard.');
        }

        if (!req.tokenType) {
            throw new UnauthorizedException('Token type not found on request.');
        }

        if (req.tokenType !== 'refresh') {
            throw new UnauthorizedException('Refresh Token이 아닙니다.');
        }

        return true;
    }
}