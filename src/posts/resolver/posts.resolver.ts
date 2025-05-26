import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { PostsModel } from '../entity/posts.entity';
import { PostsService } from '../posts.service';

@Resolver(() => PostsModel)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Query(() => PostsModel, { nullable: true }) // 단일 게시물 조회
  getPost(@Args('id', { type: () => Int }) id: number): Promise<PostsModel | null> {
    // PostsService를 사용하여 ID로 게시물 조회 로직 구현
    return this.postsService.getPostById(id);
  }
}