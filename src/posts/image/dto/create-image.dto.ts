import { PickType } from "@nestjs/mapped-types";
import { ImageModel } from "src/common/entity/image.entity";

/**
 * 포스트 이미지 생성 DTO
 * ImageModel에서 필요한 필드들만 선택하여 사용
 */
export class CreatePostImageDto extends PickType(ImageModel, [
    'path',      // 이미지 파일 경로
    'post',      // 연관된 포스트
    'order',     // 이미지 순서
    'type',      // 이미지 타입
]) {}