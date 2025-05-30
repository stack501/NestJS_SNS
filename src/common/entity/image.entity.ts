import { Column, Entity, ManyToOne } from "typeorm";
import { BaseModel } from "./base.entity";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { join } from "path";
import { POST_PUBLIC_IMAGE_PATH } from "../const/path.const";
import { PostsModel } from "src/posts/entity/posts.entity";

/**
 * 이미지 모델 타입 열거형 (ImageModelType)
 * 
 * 이미지의 종류를 구분하기 위한 열거형입니다.
 * 현재는 POST_IMAGE (게시물 이미지)만 정의되어 있습니다.
 */
export enum ImageModelType {
    /** 게시물에 첨부된 이미지 */
    POST_IMAGE,
}

/**
 * 이미지 엔티티 모델 (ImageModel)
 * 
 * 시스템에서 사용되는 이미지 정보를 나타냅니다. BaseModel을 상속받습니다.
 */
@Entity()
export class ImageModel extends BaseModel {
    /**
     * 이미지 순서
     * 
     * 여러 이미지가 있을 경우 표시되는 순서를 나타냅니다.
     * 기본값은 0이며, 선택적으로 사용될 수 있습니다.
     * 정수형(Int)입니다.
     */
    @Column({
        default: 0,
    })
    @IsInt()
    @IsOptional()
    order: number;

    /**
     * 이미지 타입
     * 
     * 이미지의 종류를 나타냅니다 (예: 게시물 이미지, 사용자 프로필 이미지 등).
     * ImageModelType 열거형 값을 가집니다.
     * 이 값에 따라 이미지 경로 변환 로직 등이 달라질 수 있습니다.
     * 
     * 예시:
     * - UsersModel -> 사용자 프로필 이미지
     * - PostsModel -> 포스트 이미지
     */
    @Column({
        enum: ImageModelType,
    })
    @IsEnum(ImageModelType)
    type: ImageModelType;

    /**
     * 이미지 경로
     * 
     * 이미지 파일의 실제 저장 경로 또는 접근 가능한 URL 경로입니다.
     * Transform 데코레이터를 사용하여 객체 변환 시 동적으로 경로를 가공합니다.
     * 예를 들어, POST_IMAGE 타입인 경우 POST_PUBLIC_IMAGE_PATH를 기준으로 전체 URL을 생성합니다.
     */
    @Column()
    @IsString()
    @Transform(({value, obj}) => {
        if(obj.type === ImageModelType.POST_IMAGE) {
            return `/${join(
                POST_PUBLIC_IMAGE_PATH,
                value,
            )}`;
        } else {
            return value as string;
        }
    })
    path: string;

    /**
     * 관련 게시물 (선택적)
     * 
     * 이미지가 특정 게시물에 속한 경우, 해당 PostsModel과의 다대일(ManyToOne) 관계를 나타냅니다.
     * 게시물 이미지가 아닌 경우 null일 수 있습니다 (예: 사용자 프로필 이미지).
     * PostsModel의 'images' 필드와 연결됩니다.
     */
    @ManyToOne(() => PostsModel, (post) => post.images)
    post?: PostsModel;
}