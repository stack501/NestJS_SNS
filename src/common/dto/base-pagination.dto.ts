import { IsIn, IsNumber, IsOptional } from "class-validator";

/**
 * 기본 페이지네이션 DTO
 * 커서 기반 페이지네이션과 오프셋 기반 페이지네이션을 지원
 */
export class BasePaginationDto {
    /**
     * 페이지 번호 (오프셋 기반 페이지네이션)
     * 선택적 필드
     */
    @IsNumber()
    @IsOptional()
    page?: number;

    /**
     * 커서 기반 페이지네이션 - 이전 페이지 조회
     * 입력된 ID보다 작은 ID를 가진 데이터들을 조회
     */
    @IsNumber()
    @IsOptional()
    where__id__less_than?: number;
    
    /**
     * 커서 기반 페이지네이션 - 다음 페이지 조회
     * 이전 마지막 데이터의 ID
     * 이 프로퍼티에 입력된 ID 보다 높은 ID 부터 값을 가져오기
     */
    @IsNumber()
    @IsOptional()
    where__id__more_than?: number;

    /**
     * 정렬 순서 (생성일시 기준)
     * ASC: 오름차순, DESC: 내림차순
     * 기본값: ASC
     */
    @IsIn(['ASC', 'DESC'])
    @IsOptional()
     
    order__createdAt: 'ASC' | 'DESC' = 'ASC';

    /**
     * 한 번에 가져올 데이터 개수
     * 기본값: 20개
     */
    @IsNumber()
    @IsOptional()
    take: number = 20;
}