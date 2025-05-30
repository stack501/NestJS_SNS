import { PickType } from "@nestjs/mapped-types";
import { CommentsModel } from "../entity/comments.entity";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 댓글 생성 DTO
 * 새로운 댓글을 생성할 때 필요한 데이터를 정의
 */
export class CreateCommentsDto extends PickType(CommentsModel, [
    'comment'  // 댓글 내용
]) {
    /**
     * 댓글 내용
     * CommentsModel에서 상속받은 필드를 명시적으로 재선언
     */
    @ApiProperty({ description: '댓글 내용' })
    comment: string;
}