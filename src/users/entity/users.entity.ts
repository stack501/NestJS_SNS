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

/**
 * 사용자 역할 열거형
 * 
 * 시스템 내에서 사용자가 가질 수 있는 역할을 정의합니다.
 * 
 * @enum {string}
 */
export enum RoleEnum {
    /** 일반 사용자 */
    USER = 'user',
    /** 관리자 */
    ADMIN = 'admin',
}

registerEnumType(RoleEnum, {
    name: 'RoleEnum', // GraphQL 스키마에 표시될 Enum의 이름
    description: 'User roles', // 선택적 설명
});

/**
 * 사용자 엔티티 모델
 * 
 * 시스템의 사용자 정보를 저장하고 관리하는 메인 엔티티입니다.
 * BaseModel을 상속받아 기본 필드들(id, createdAt, updatedAt)을 포함합니다.
 * GraphQL의 ObjectType으로도 사용되며, TypeORM Entity로 데이터베이스 테이블과 매핑됩니다.
 * 
 * @class UsersModel
 * @extends BaseModel
 */
@ObjectType()
@Entity()
export class UsersModel extends BaseModel {
    /**
     * Google OAuth 식별자
     * 
     * Google 소셜 로그인을 통해 가입한 사용자의 고유 식별자입니다.
     * null 값을 허용하며, 시스템 내에서 고유해야 합니다.
     * 
     * @type {string}
     * @memberof UsersModel
     */
    @Field({ nullable: true })
    @Column({
        unique: true,
        nullable: true,
    })
    @IsString()
    google: string;

    /**
     * Kakao OAuth 식별자
     * 
     * Kakao 소셜 로그인을 통해 가입한 사용자의 고유 식별자입니다.
     * null 값을 허용하며, 시스템 내에서 고유해야 합니다.
     * 
     * @type {string}
     * @memberof UsersModel
     */
    @Field({ nullable: true })
    @Column({
        unique: true,
        nullable: true,
    })
    @IsString()
    kakao: string;

    /**
     * 사용자 닉네임
     * 
     * 사용자가 설정한 별명으로, 시스템 내에서 고유해야 합니다.
     * 최소 1자에서 최대 20자까지 허용됩니다.
     * 
     * @type {string}
     * @memberof UsersModel
     */
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

    /**
     * 사용자 이메일 주소
     * 
     * 사용자의 이메일 주소로, 로그인 및 인증에 사용됩니다.
     * 시스템 내에서 고유해야 하며, 유효한 이메일 형식이어야 합니다.
     * 
     * @type {string}
     * @memberof UsersModel
     */
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

    /**
     * 사용자 비밀번호
     * 
     * 사용자 계정의 비밀번호입니다.
     * 요청 시에는 받지만 응답 시에는 보안상 제외됩니다.
     * 최소 3자에서 최대 8자까지 허용됩니다.
     * 
     * @type {string}
     * @memberof UsersModel
     */
    @Field()
    @Column()
    @IsString({
        message: stringValidationMessage,
    })
    @Length(3, 8, {
        message: lengthValidationMessage,
    })
    
    @Exclude({
        toPlainOnly: true,
    })
    password: string;

    /**
     * 사용자 역할
     * 
     * 사용자의 시스템 내 권한 수준을 나타냅니다.
     * RoleEnum 타입을 사용하며, 기본값은 일반 사용자(USER)입니다.
     * 
     * @type {RoleEnum}
     * @memberof UsersModel
     */
    @Field(() => RoleEnum)
    @Column({
        type: 'enum',
        enum: RoleEnum,
        default: RoleEnum.USER,
    })
    role: RoleEnum;

    /**
     * 사용자가 작성한 게시물 목록
     * 
     * PostsModel과의 일대다 관계입니다.
     * 한 사용자는 여러 개의 게시물을 작성할 수 있습니다.
     * 
     * @type {PostsModel[]}
     * @memberof UsersModel
     */
    @OneToMany(() => PostsModel, (post) => post.author)
    posts: PostsModel[]

    /**
     * 사용자가 참여 중인 채팅방 목록
     * 
     * ChatsModel과의 다대다 관계입니다.
     * 한 사용자는 여러 채팅방에 참여할 수 있고, 한 채팅방에는 여러 사용자가 참여할 수 있습니다.
     * 
     * @type {ChatsModel[]}
     * @memberof UsersModel
     */
    @ManyToMany(() => ChatsModel, (chat) => chat.users)
    @JoinTable()
    chats: ChatsModel[];

    /**
     * 사용자가 전송한 메시지 목록
     * 
     * MessagesModel과의 일대다 관계입니다.
     * 한 사용자는 여러 개의 메시지를 보낼 수 있습니다.
     * 
     * @type {MessagesModel[]}
     * @memberof UsersModel
     */
    @OneToMany(() => MessagesModel, (message) => message.author)
    messages: MessagesModel[];

    /**
     * 사용자가 받은 귓속말 메시지 목록
     * 
     * MessagesModel과의 일대다 관계입니다.
     * 특정 사용자를 대상으로 하는 개인 메시지들을 나타냅니다.
     * 
     * @type {MessagesModel[]}
     * @memberof UsersModel
     */
    @OneToMany(() => MessagesModel, (message) => message.whisperTargetUser)
    whisperMessages : MessagesModel[];

    /**
     * 사용자가 작성한 댓글 목록
     * 
     * CommentsModel과의 일대다 관계입니다.
     * 한 사용자는 여러 개의 댓글을 작성할 수 있습니다.
     * 
     * @type {CommentsModel[]}
     * @memberof UsersModel
     */
    @OneToMany(() => CommentsModel, (comment) => comment.author)
    comments: CommentsModel[];

    /**
     * 이 사용자를 팔로우하는 사용자들의 관계 정보
     * 
     * UserFollowersModel과의 일대다 관계입니다.
     * 이 사용자를 팔로우하는 다른 사용자들과의 관계를 나타냅니다.
     * 
     * @type {UserFollowersModel[]}
     * @memberof UsersModel
     */
    // 나를 팔로우하고 있는 사람들
    @OneToMany(() => UserFollowersModel, (ufm) => ufm.follower)
    followers: UserFollowersModel[];

    /**
     * 이 사용자가 팔로우하는 사용자들의 관계 정보
     * 
     * UserFollowersModel과의 일대다 관계입니다.
     * 이 사용자가 팔로우하는 다른 사용자들과의 관계를 나타냅니다.
     * 
     * @type {UserFollowersModel[]}
     * @memberof UsersModel
     */
    // 내가 팔로우하고 있는 사람들
    @OneToMany(() => UserFollowersModel, (ufm) => ufm.followee)
    followees: UserFollowersModel[];

    /**
     * 팔로워 수
     * 
     * 이 사용자를 팔로우하는 사람들의 총 개수입니다.
     * 기본값은 0이며, 팔로우 관계가 생성/삭제될 때 업데이트됩니다.
     * 
     * @type {number}
     * @memberof UsersModel
     */
    @Field()
    @Column({
        default: 0,
    })
    followerCount: number;

    /**
     * 팔로잉 수
     * 
     * 이 사용자가 팔로우하는 사람들의 총 개수입니다.
     * 기본값은 0이며, 팔로우 관계가 생성/삭제될 때 업데이트됩니다.
     * 
     * @type {number}
     * @memberof UsersModel
     */
    @Field()
    @Column({
        default: 0,
    })
    followeeCount: number;
}