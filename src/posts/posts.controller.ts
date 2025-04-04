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
import { DataSource, QueryRunner } from 'typeorm';
import { PostsImagesService } from './image/images.service';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { QueryRunnerDecorator } from 'src/common/decorator/query-runner.decorator';
import { Roles } from 'src/users/decorator/roles.decorator';
import { RoleEnum } from 'src/users/entity/users.entity';
import { IsPublic } from 'src/common/decorator/is-public.decorator';
import { IsPublicEnum } from 'src/common/const/is-public.const';
import { IsPostMineOrAdminGuard } from './guard/is-post-mine-or-admin.guard';

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
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  // @UseInterceptors(LogInterceptor)
  // @UseFilters(HttpExceptionFilter)
  getPosts(
    @Query() query: PaginatePostDto,
  ) { 
    return this.postsService.paginatePosts(query);
  }

  @Post('random')
  async postPostsRandom(
    @User('id') userId: number,
  ) {
    await this.postsService.generatePosts(userId);
    return true;
  }

  // 2) GET /posts/:id
  // id에 해당되는 post를 가져온다.
  @Get(':id')
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  getPost(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getPostById(id);
  }

  // 3) POST /posts
  //  post를 생성한다.
  //
  // DTO - Data Transfer Object (데이터 전송 객체)
  @Post()
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
  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  deletePost(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.deletePost(id);
  }
}
