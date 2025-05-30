import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { PostsModel } from '../entity/posts.entity';
import { PostsService } from '../posts.service';

/**
 * 게시물 GraphQL 리졸버
 * 
 * 게시물 관련 GraphQL 쿼리와 뮤테이션을 처리합니다.
 * 클라이언트의 GraphQL 요청을 받아 PostsService를 통해 비즈니스 로직을 실행합니다.
 */
@Resolver(() => PostsModel)
export class PostsResolver {
  /**
   * PostsResolver 생성자
   * @param postsService 게시물 서비스 인스턴스
   */
  constructor(private readonly postsService: PostsService) {}

  /**
   * 단일 게시물 조회 쿼리
   * 
   * 주어진 ID에 해당하는 게시물을 조회합니다.
   * 
   * @param id 조회할 게시물의 고유 식별자
   * @returns 조회된 게시물 정보 또는 null (게시물이 존재하지 않는 경우)
   */
  @Query(() => PostsModel, { nullable: true })
  getPost(@Args('id', { type: () => Int }) id: number): Promise<PostsModel | null> {
    // PostsService를 사용하여 ID로 게시물 조회 로직 구현
    return this.postsService.getPostById(id);
  }
}