import { PickType } from "@nestjs/mapped-types";
import { PostsModel } from "../entity/posts.entity";
import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 포스트 생성 DTO
 * 새로운 포스트를 생성할 때 필요한 데이터를 정의
 */
export class CreatePostDto extends PickType(PostsModel, ['title', 'content'] as const) {
    /**
     * 포스트 제목
     * PostsModel에서 상속받은 필드를 명시적으로 재선언
     */
  @ApiProperty({ description: '포스트 제목' })
  title: string;

  /**
   * 포스트 내용
   * PostsModel에서 상속받은 필드를 명시적으로 재선언
   */
  @ApiProperty({ description: '포스트 내용' })
  content: string;

  /**
   * 포스트에 첨부할 이미지 URL 배열
   * 선택적 필드로, 기본값은 빈 배열
   */
  @ApiProperty({
    description: '포스트에 첨부할 이미지 URL 배열',
    required: false,
    default: [],
  })
  @IsString({ each: true })
  @IsOptional()
  images: string[] = [];
}