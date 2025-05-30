import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { User } from 'src/users/decorator/user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { ImageModelType } from 'src/common/entity/image.entity';
import { Not, QueryRunner } from 'typeorm';
import { PostsImagesService } from './image/images.service';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { QueryRunnerDecorator } from 'src/common/decorator/query-runner.decorator';
import { Roles } from 'src/users/decorator/roles.decorator';
import { RoleEnum } from 'src/users/entity/users.entity';
import { IsPublic } from 'src/common/decorator/is-public.decorator';
import { IsPublicEnum } from 'src/common/const/is-public.const';
import { IsPostMineOrAdminGuard } from './guard/is-post-mine-or-admin.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthScheme } from 'src/common/const/auth-schema.const';
import { RateLimiter } from 'src/common/decorator/rate-limiter.decorator';

/**
 * 게시물 관련 API 엔드포인트를 제공하는 컨트롤러
 * 
 * 게시물의 조회, 생성, 수정, 삭제 등의 기능을 처리합니다.
 */
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly postsImagesService: PostsImagesService,
  ) {}

  /**
   * 모든 게시물을 페이지네이션 형식으로 조회합니다
   * @param query 페이지네이션 옵션
   * @returns 페이지네이션된 게시물 목록
   */
  @Get()
  @ApiOperation({ 
    summary: '모든 게시글 가져오기', 
    description: '모든 게시글을 Paginate 하게 가져옵니다.' 
  })
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  @RateLimiter() // 비로그인 사용자 1초당 1토큰 회복, 최대 제한 횟수 10번
  getPosts(
    @Query() query: PaginatePostDto,
  ) { 
    return this.postsService.paginatePosts(query);
  }

  /**
   * 팔로우 중인 사용자들의 게시물을 조회합니다
   * @param userId 로그인된 사용자 ID
   * @param query 페이지네이션 옵션
   * @returns 팔로워들의 게시물 목록
   */
  @Get('following')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
    summary: '팔로워 게시글들 가져오기', 
    description: '팔로우 요청이 수락된 팔로워들의 게시글들을 모두 가져옵니다.' 
  })
  getFollowingPosts(
    @User('id') userId: number, 
    @Query() query: PaginatePostDto
  ) {
    if (query.isOnlyFollowingPosts) {
      return this.postsService.paginatePosts(query, {
        author: {
          followees: {
            isConfirmed: true,
          },
          id: Not(userId),
        },
      }, 
      userId);
    }
    return this.postsService.paginatePosts(query);
  }

  /**
   * 테스트용 게시물을 대량 생성합니다
   * @param userId 로그인된 사용자 ID
   * @returns 성공 여부
   */
  @Post('random')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
    summary: '게시글 100개 자동 생성하기 (테스트 목적용)', 
    description: '게시글을 임의로 100개를 생성합니다. 테스트 목적 외 사용금지' 
  })
  async postPostsRandom(
    @User('id') userId: number,
  ) {
    await this.postsService.generatePosts(userId);
    return true;
  }

  /**
   * ID로 특정 게시물을 조회합니다
   * @param id 게시물 ID
   * @returns 조회된 게시물
   */
  @Get(':postId')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
    summary: '게시글 1개 가져오기', 
    description: 'Post Id 값과 일치하는 게시글 1개를 가져옵니다.' 
  })
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  getPost(@Param('postId', ParseIntPipe) id: number) {
    return this.postsService.getPostById(id);
  }

  /**
   * 새로운 게시물을 생성합니다
   * @param userId 로그인된 사용자 ID
   * @param body 게시물 내용
   * @param qr QueryRunner 인스턴스
   * @returns 생성된 게시물
   */
  @Post()
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '게시글 작성', 
      description: '게시글 하나를 작성합니다. (title, content, images)' 
  })
  @UseInterceptors(TransactionInterceptor)
  async postPosts(
    @User('id') userId: number,
    @Body() body: CreatePostDto,
    @QueryRunnerDecorator() qr: QueryRunner,
  ) {
      const post = await this.postsService.createPost(userId, body, qr);

      for(let i = 0; i < body.images.length; i++) {
        await this.postsImagesService.createPostImage({
          post,
          order: i,
          path: body.images[i],
          type: ImageModelType.POST_IMAGE,
        }, qr);
      }

      return this.postsService.getPostById(post.id, qr);
  }

  /**
   * 게시물을 수정합니다
   * @param id 게시물 ID
   * @param body 수정할 내용
   * @returns 수정된 게시물
   */
  @Patch(':postId')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '게시글 수정', 
      description: 'Post Id 값과 일치하는 게시글을 수정합니다.' 
  })
  @UseGuards(IsPostMineOrAdminGuard)
  patchPost(
    @Param('postId', ParseIntPipe) id: number,
    @Body() body: UpdatePostDto,
  ) {
    return this.postsService.updatePost(id, body);
  }

  /**
   * 게시물을 삭제합니다
   * @param id 게시물 ID
   * @returns 삭제된 게시물 ID
   */
  @Delete(':postId')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '게시글 삭제', 
      description: 'Post Id 값과 일치하는 게시글을 삭제합니다.' 
  })
  @Roles(RoleEnum.ADMIN)
  deletePost(@Param('postId', ParseIntPipe) id: number) {
    return this.postsService.deletePost(id);
  }
}
