import { Column, Entity, ManyToOne } from "typeorm";
import { BaseModel } from "./base.entity";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { join } from "path";
import { POST_PUBLIC_IMAGE_PATH } from "../const/path.const";
import { PostsModel } from "src/posts/entity/posts.entity";

export enum ImageModelType {
    POST_IMAGE,
}

@Entity()
export class ImageModel extends BaseModel {
    @Column({
        default: 0,
    })
    @IsInt()
    @IsOptional()
    order: number;

    /**
     * UsersModel -> 사용자 프로필 이미지
     * PostsModel -> 포스트 이미지
     */
    @Column({
        enum: ImageModelType,
    })
    @IsEnum(ImageModelType)
    type: ImageModelType;

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

    @ManyToOne(() => PostsModel, (post) => post.images)
    post?: PostsModel;
}