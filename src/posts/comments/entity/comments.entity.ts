import { IsNumber, IsString } from "class-validator";
import { BaseModel } from "src/common/entity/base.entity";
import { PostsModel } from "src/posts/entity/posts.entity";
import { UsersModel } from "src/users/entity/users.entity";
import { Column, Entity, ManyToOne } from "typeorm";

/**
 * 댓글 엔티티 모델
 * 
 * 게시물에 대한 사용자 댓글을 나타냅니다
 * 댓글 내용, 작성자, 연관된 게시물 및 참여 지표를 저장합니다
 */
@Entity()
export class CommentsModel extends BaseModel {
    /**
     * 댓글 작성자
     * UsersModel과의 다대일(Many-to-One) 관계
     */
    @ManyToOne(() => UsersModel, (user) => user.comments)
    author: UsersModel;

    /**
     * 이 댓글이 속한 게시물
     * PostsModel과의 다대일(Many-to-One) 관계
     */
    @ManyToOne(() => PostsModel, (post) => post.comments)
    post: PostsModel;

    /**
     * 댓글의 텍스트 내용
     */
    @Column()
    @IsString()
    comment: string;

    /**
     * 이 댓글에 받은 좋아요 수
     */
    @Column({
        default: 0,
    })
    @IsNumber()
    likeCount: number;
}