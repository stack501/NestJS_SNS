import { PickType } from "@nestjs/mapped-types";
import { CommentsModel } from "../entity/comments.entity";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCommentsDto extends PickType(CommentsModel, [
    'comment'
]) {
    @ApiProperty({ description: '댓글 내용' })
    comment: string;
}