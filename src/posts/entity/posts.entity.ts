import { IsString } from 'class-validator';
import { BaseModel } from 'src/common/entity/base.entity';
import { ImageModel } from 'src/common/entity/image.entity';
import { stringValidationMessage } from 'src/common/validation-message/string-validation.message';
import { UsersModel } from 'src/users/entity/users.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, RelationId } from 'typeorm';
import { CommentsModel } from '../comments/entity/comments.entity';

@Entity()
export class PostsModel extends BaseModel {
  @ManyToOne(() => UsersModel, (user) => user.posts, {
    nullable: false,
  })
  @JoinColumn( {name: 'authorId'})
  author: UsersModel;

  @Column()
  @Index('idx_post_author_id')
  @RelationId((post: PostsModel) => post.author)
  authorId: number;

  @Column()
  @IsString({
    message: stringValidationMessage,
  })
  title: string;

  @Column()
  @IsString({
    message: stringValidationMessage,
  })
  content: string;

  @Column({
    default: 0,
  })
  likeCount: number;

  @Column({
    default: 0,
  })
  commentCount: number;

  @OneToMany(() => ImageModel, (image) => image.post)
  images: ImageModel[];

  @OneToMany(() => CommentsModel, (comment) => comment.post)
  comments: CommentsModel[];
}
