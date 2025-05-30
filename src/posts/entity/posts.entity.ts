import { IsString } from 'class-validator';
import { BaseModel } from 'src/common/entity/base.entity';
import { ImageModel } from 'src/common/entity/image.entity';
import { stringValidationMessage } from 'src/common/validation-message/string-validation.message';
import { UsersModel } from 'src/users/entity/users.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, RelationId } from 'typeorm';
import { CommentsModel } from '../comments/entity/comments.entity';
import { Field, ObjectType } from '@nestjs/graphql';

/**
 * 게시물 엔티티 모델
 * 
 * 사용자가 작성한 게시물의 데이터 구조를 정의합니다.
 * BaseModel을 상속하여 기본 필드(id, createdAt, updatedAt 등)를 포함합니다.
 */
@ObjectType()
@Entity()
export class PostsModel extends BaseModel {

  /**
   * 게시물 작성자
   * 
   * UsersModel과의 다대일(ManyToOne) 관계를 정의합니다.
   * null을 허용하지 않습니다.
   * GraphQL 스키마에 UsersModel 타입으로 노출됩니다.
   */
  @Field(() => UsersModel)
  @ManyToOne(() => UsersModel, (user) => user.posts, {
    nullable: false,
  })
  @JoinColumn( {name: 'authorId'})
  author: UsersModel;

  /**
   * 작성자 ID
   * 
   * 작성자의 외래키로, 데이터베이스에서 'authorId' 컬럼에 저장됩니다.
   * 'idx_post_author_id' 인덱스를 통해 조회 성능을 향상시킵니다.
   * PostsModel 엔티티의 author 관계를 통해 ID를 가져옵니다.
   * GraphQL 스키마에 숫자 타입으로 노출됩니다.
   */
  @Field(() => Number)
  @Column()
  @Index('idx_post_author_id')
  @RelationId((post: PostsModel) => post.author)
  authorId: number;

  /**
   * 게시물 제목
   * 
   * 문자열 타입이며, stringValidationMessage에 정의된 유효성 검사 메시지를 사용합니다.
   * GraphQL 스키마에 노출됩니다.
   */
  @Field()
  @Column()
  @IsString({
    message: stringValidationMessage,
  })
  title: string;

  /**
   * 게시물 내용
   * 
   * 문자열 타입이며, stringValidationMessage에 정의된 유효성 검사 메시지를 사용합니다.
   * GraphQL 스키마에 노출됩니다.
   */
  @Field()
  @Column()
  @IsString({
    message: stringValidationMessage,
  })
  content: string;

  /**
   * 좋아요 수
   * 
   * 게시물이 받은 좋아요의 총 개수입니다. 기본값은 0입니다.
   * GraphQL 스키마에 숫자 타입으로 노출됩니다.
   */
  @Field(() => Number)
  @Column({
    default: 0,
  })
  likeCount: number;

  /**
   * 댓글 수
   * 
   * 게시물에 작성된 댓글의 총 개수입니다. 기본값은 0입니다.
   * GraphQL 스키마에 숫자 타입으로 노출됩니다.
   */
  @Field(() => Number)
  @Column({
    default: 0,
  })
  commentCount: number;

  /**
   * 게시물 이미지 목록
   * 
   * ImageModel과의 일대다(OneToMany) 관계입니다.
   * 게시물에 첨부된 이미지들을 나타냅니다.
   */
  @OneToMany(() => ImageModel, (image) => image.post)
  images: ImageModel[];

  /**
   * 게시물 댓글 목록
   * 
   * CommentsModel과의 일대다(OneToMany) 관계입니다.
   * 게시물에 달린 댓글들을 나타냅니다.
   */
  @OneToMany(() => CommentsModel, (comment) => comment.post)
  comments: CommentsModel[];
}
