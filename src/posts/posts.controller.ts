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
import { DataSource, Not, QueryRunner } from 'typeorm';
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

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly dataSource: DataSource,
    private readonly postsImagesService: PostsImagesService,
  ) {}

  // 1) GET /posts
  //  모든 posts를 가져온다
  @Get()
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
    summary: '모든 게시글 가져오기', 
    description: '모든 게시글을 Paginate 하게 가져옵니다.' 
  })
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  // @UseInterceptors(LogInterceptor)
  // @UseFilters(HttpExceptionFilter)
  getPosts(
    @Query() query: PaginatePostDto,
  ) { 
    return this.postsService.paginatePosts(query);
  }

  // 내가 팔로우한 사용자들의 피드(게시글)을 모두 가져온다.
  // 팔로우 요청을 확인한 사용자들의 피드들만을 가져온다.
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
      });
    }
    return this.postsService.paginatePosts(query);
  }

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

  // 2) GET /posts/:id
  // id에 해당되는 post를 가져온다.
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

  // 3) POST /posts
  //  post를 생성한다.
  //
  // DTO - Data Transfer Object (데이터 전송 객체)
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
    // @Body('title') title: string,
    // @Body('content') content: string,
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

  // 4) Patch /posts:id
  //  id에 해당되는 post를 변경한다.
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
    // @Body('title') title?: string,
    // @Body('content') content?: string,
  ) {
    return this.postsService.updatePost(id, body);
  }

  // 5) DELETE /posts:id
  //  id에 해당되는 post를 삭제한다.
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
