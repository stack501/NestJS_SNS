import { PickType } from "@nestjs/mapped-types";
import { PostsModel } from "../entity/posts.entity";
import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePostDto extends PickType(PostsModel, ['title', 'content'] as const) {
    // 상속된 필드들을 명시적으로 재선언
  @ApiProperty({ description: '포스트 제목' })
  title: string;

  @ApiProperty({ description: '포스트 내용' })
  content: string;

  @ApiProperty({
    description: '포스트에 첨부할 이미지 URL 배열',
    required: false,
    default: [],
  })
  @IsString({ each: true })
  @IsOptional()
  images: string[] = [];
}