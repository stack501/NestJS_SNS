import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PostsService } from "../posts.service";
import { RoleEnum } from "src/users/entity/users.entity";

/**
 * 게시물 소유권 또는 관리자 권한을 검증하는 가드
 * 
 * 다음 조건 중 하나라도 만족하면 접근을 허용합니다:
 * - 사용자가 ADMIN 역할을 가진 경우
 * - 해당 게시물의 작성자인 경우
 * 
 * @example
 * ```typescript
 * @UseGuards(IsPostMineOrAdminGuard)
 * async updatePost(@Param('postId') postId: string) { ... }
 * ```
 */
@Injectable()
export class IsPostMineOrAdminGuard implements CanActivate{
    /**
     * IsPostMineOrAdminGuard 생성자
     * 
     * @param postService - 게시물 서비스, 게시물 소유권 검증에 사용
     */
    constructor(
        private readonly postService: PostsService,
    ){}

    /**
     * 게시물에 대한 접근 권한을 검증합니다.
     * 
     * 검증 단계:
     * 1. 사용자 인증 상태 확인
     * 2. ADMIN 역할이면 즉시 허용
     * 3. postId 파라미터 존재 여부 확인
     * 4. 게시물 소유권 검증
     * 
     * @param context - 실행 컨텍스트 (HTTP 요청)
     * @returns 접근 허용 여부를 나타내는 Promise<boolean>
     * @throws UnauthorizedException - 사용자 정보를 가져올 수 없는 경우
     * @throws BadRequestException - Post ID가 파라미터로 제공되지 않은 경우
     * @throws ForbiddenException - 게시물 소유권이 없고 관리자가 아닌 경우
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        const {user} = req;

        if(!user){
            throw new UnauthorizedException(
                '사용자 정보를 가져올 수 없습니다.',
            )
        }

        /**
         * Admin일 경우 그냥 패스
         */
        if(user.role === RoleEnum.ADMIN){
            return true;
        }

        const postId = req.params.postId;

        if(!postId){
            throw new BadRequestException(
                'Post ID가 파라미터로 제공 돼야합니다.',
            );
        }

        const isOk = await this.postService.isPostMine(
            user.id,
            parseInt(postId),
        );

        if(!isOk){
            throw new ForbiddenException(
                '권한이 없습니다.',
            );
        }

        return true;
    }
}