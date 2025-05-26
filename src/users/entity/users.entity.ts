import { Exclude } from "class-transformer";
import { IsEmail, IsString, Length } from "class-validator";
import { MessagesModel } from "src/chats/messages/entity/messages.entity";
import { ChatsModel } from "src/chats/entity/chats.entity";
import { BaseModel } from "src/common/entity/base.entity";
import { emailValidationMessage } from "src/common/validation-message/email-validation.message";
import { lengthValidationMessage } from "src/common/validation-message/length-validation.message";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";
import { PostsModel } from "src/posts/entity/posts.entity";
import { Column, Entity, JoinTable, ManyToMany, OneToMany } from "typeorm";
import { CommentsModel } from "src/posts/comments/entity/comments.entity";
import { UserFollowersModel } from "./user-followers.entity";
import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";

export enum RoleEnum {
    USER = 'user',
    ADMIN = 'admin',
}

registerEnumType(RoleEnum, {
    name: 'RoleEnum', // GraphQL 스키마에 표시될 Enum의 이름
    description: 'User roles', // 선택적 설명
});

@ObjectType()
@Entity()
export class UsersModel extends BaseModel {
    @Field({ nullable: true })
    @Column({
        unique: true,
        nullable: true,
    })
    @IsString()
    google: string;

    @Field({ nullable: true })
    @Column({
        unique: true,
        nullable: true,
    })
    @IsString()
    kakao: string;

    @Field()
    @Column({
        length: 20,
        unique: true,
    })
    @IsString({
        message: stringValidationMessage,
    })
    @Length(1, 20, {
        message: lengthValidationMessage,
    })
    nickname: string;

    @Field()
    @Column({
        unique: true,
    })
    @IsString({
        message: stringValidationMessage,
    })
    @IsEmail({}, {
        message: emailValidationMessage,
    })
    email: string;

    @Field()
    @Column()
    @IsString({
        message: stringValidationMessage,
    })
    @Length(3, 8, {
        message: lengthValidationMessage,
    })
    /**
     * Request
     * frontent -> backend
     * plain object (JSON) -> class instance (dto)
     * 
     * Response
     * backend -> frontend
     * class instance (dto) -> plain object (JSON)
     * 
     * toClassOnly -> class instance로 변환될때만 (요청)
     * toPlainOnly -> plain object로 변환될때만 (응답)
     * 
     * 비밀번호는 요청은 받아야하고 응답은 제외하여야한다.
     */
    @Exclude({
        toPlainOnly: true,
    })
    password: string;

    @Field(() => RoleEnum)
    @Column({
        type: 'enum',
        enum: RoleEnum,
        default: RoleEnum.USER,
    })
    role: RoleEnum;

    @OneToMany(() => PostsModel, (post) => post.author)
    posts: PostsModel[]

    @ManyToMany(() => ChatsModel, (chat) => chat.users)
    @JoinTable()
    chats: ChatsModel[];

    @OneToMany(() => MessagesModel, (message) => message.author)
    messages: MessagesModel[];

    @OneToMany(() => MessagesModel, (message) => message.whisperTargetUser)
    whisperMessages : MessagesModel[];

    @OneToMany(() => CommentsModel, (comment) => comment.author)
    comments: CommentsModel[];

    // 나를 팔로우하고 있는 사람들
    @OneToMany(() => UserFollowersModel, (ufm) => ufm.follower)
    followers: UserFollowersModel[];

    // 내가 팔로우하고 있는 사람들
    @OneToMany(() => UserFollowersModel, (ufm) => ufm.followee)
    followees: UserFollowersModel[];

    @Field()
    @Column({
        default: 0,
    })
    followerCount: number;

    @Field()
    @Column({
        default: 0,
    })
    followeeCount: number;
}