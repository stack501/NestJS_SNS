import { BasePaginationDto } from "src/common/dto/base-pagination.dto";

/**
 * 댓글 페이지네이션 데이터 전송 객체
 * 
 * 댓글 목록 조회 시 페이지네이션을 위한 데이터 구조를 정의합니다.
 * 기본 페이지네이션 DTO를 확장하여 댓글 목록 조회에 사용됩니다.
 */
export class PaginateCommentsDto extends BasePaginationDto {

}