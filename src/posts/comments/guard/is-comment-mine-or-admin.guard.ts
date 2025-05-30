import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { RoleEnum } from "src/users/entity/users.entity";
import { CommentsService } from "../comments.service";

/**
 * 댓글 소유자 또는 관리자 권한 가드
 * 
 * @description 사용자가 댓글의 소유자이거나 관리자 권한을 가지고 있는지 확인합니다.
 * 관리자는 모든 댓글에 대한 권한을 가지며, 일반 사용자는 자신의 댓글에만 접근 가능합니다.
 */
@Injectable()
export class IsCommentMineOrAdminGuard implements CanActivate{
    constructor(
        private readonly commentService: CommentsService,
    ){

    }

    /**
     * 가드 활성화 여부를 확인하는 메서드
     * 
     * @param context - 실행 컨텍스트
     * @returns 접근 허용 여부
     * @throws {UnauthorizedException} 사용자 정보가 없을 때
     * @throws {ForbiddenException} 권한이 없을 때
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        const {user} = req;

        if(!user){
            throw new UnauthorizedException(
                '사용자 정보를 가져올 수 없습니다.',
            );
        }

        if(user.role === RoleEnum.ADMIN){
            return true;
        }

        const commentId = req.params.commentId;

        const isOk = await this.commentService.isCommentMine(
            user.id,
            parseInt(commentId),
        );

        if(!isOk){
            throw new ForbiddenException(
                '권한이 없습니다.',
            );
        }

        return true;
    }
}