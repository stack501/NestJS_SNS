import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { BasePaginationDto } from "src/common/dto/base-pagination.dto";

/**
 * 게시물 페이지네이션 데이터 전송 객체
 * 
 * 게시물 목록 조회 시 페이지네이션과 필터링을 위한 데이터 구조를 정의합니다.
 * 기본 페이지네이션 DTO를 확장하여 게시물 특화 필터링 옵션을 제공합니다.
 */
export class PaginatePostDto extends BasePaginationDto{
    /**
     * 좋아요 수 필터링
     * 
     * 지정된 값보다 많은 좋아요를 받은 게시물만 조회합니다.
     */
    @IsNumber()
    @IsOptional()
    where__likeCount__more_than?: number;

    /**
     * 제목 검색 필터링
     * 
     * 제목에 포함된 문자열로 게시물을 검색합니다. (대소문자 구분 없음)
     */
    @IsString()
    @IsOptional()
    where__title__i_like?: string;

    /**
     * 작성자 필터링
     * 
     * 특정 작성자의 게시물만 조회합니다.
     */
    @IsString()
    @IsOptional()
    where__author__equal?: string;

    /**
     * 팔로잉 게시물 필터링
     * 
     * true인 경우 팔로우하는 사용자들의 게시물만 조회합니다.
     */
    @IsBoolean()
    @IsOptional()
    isOnlyFollowingPosts?: boolean;
}