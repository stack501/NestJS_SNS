import { PartialType } from "@nestjs/mapped-types";
import { CreatePostDto } from "./create-post.dto";
import { IsOptional, IsString } from "class-validator";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";

/**
 * 게시물 수정 데이터 전송 객체
 * 
 * 게시물 수정 요청 시 필요한 데이터 구조를 정의합니다.
 * CreatePostDto를 부분적으로 상속받아 모든 필드를 선택적으로 만듭니다.
 */
export class UpdatePostDto extends PartialType(CreatePostDto) {
    /**
     * 게시물 제목
     * 
     * 수정할 게시물의 새로운 제목입니다.
     * 문자열 형태여야 하며 선택적 필드입니다.
     */
    @IsString({
        message: stringValidationMessage,
    })
    @IsOptional()
    title?: string;

    /**
     * 게시물 내용
     * 
     * 수정할 게시물의 새로운 내용입니다.
     * 문자열 형태여야 하며 선택적 필드입니다.
     */
    @IsString({
        message: stringValidationMessage,
    })
    @IsOptional()
    content?: string;
}