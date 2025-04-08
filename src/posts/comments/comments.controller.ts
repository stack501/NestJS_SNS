import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PaginateCommentsDto } from './dto/paginate-comments.dto';
import { CreateCommentsDto } from './dto/create-comments.dto';
import { User } from 'src/users/decorator/user.decorator';
import { UsersModel } from 'src/users/entity/users.entity';
import { UpdateCommentsDto } from './dto/update-comments.dto';
import { IsPublic } from 'src/common/decorator/is-public.decorator';
import { IsPublicEnum } from 'src/common/const/is-public.const';
import { IsCommentMineOrAdminGuard } from './guard/is-comment-mine-or-admin.guard';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { QueryRunnerDecorator } from 'src/common/decorator/query-runner.decorator';
import { QueryRunner } from 'typeorm';
import { PostsService } from '../posts.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthScheme } from 'src/common/const/auth-schema.const';

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly postService: PostsService,
  ) {}

  @Get()
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '모든 댓글 가져오기', 
      description: '작성된 모든 댓글을 가져옵니다.' 
  })
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  getComments(
    @Param('postId', ParseIntPipe) postId: number,
    @Query() query: PaginateCommentsDto
  ) {
    return this.commentsService.paginateComments(query, postId);
  }

  @Get(':commentId')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '특정 댓글 가져오기', 
      description: '입력된 댓글 Id와 일치하는 댓글을 가져옵니다.' 
  })
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  async getComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    const { comment } = await this.commentsService.getCommentById(postId, commentId);
    return comment;
  }

  @Post()
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '댓글 작성', 
      description: '댓글 하나를 작성합니다.' 
  })
  @UseInterceptors(TransactionInterceptor)
  async postComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() body: CreateCommentsDto,
    @User() user: UsersModel,
    @QueryRunnerDecorator() qr: QueryRunner,
  ) {
    const resp = await this.commentsService.createComment(body, postId, user, qr);

    await this.postService.incrementFollowerCount(postId, 'commentCount', 1, qr);

    return resp;
  }

  @Patch(':commentId')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '댓글 수정', 
      description: '댓글 Id와 일치하는 댓글을 수정합니다.' 
  })
  @UseGuards(IsCommentMineOrAdminGuard)
  @UseInterceptors(TransactionInterceptor)
  patchComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() body: UpdateCommentsDto,
    @QueryRunnerDecorator() qr: QueryRunner,
  ) {
    return this.commentsService.updateComment(body, postId, commentId, qr);
  }

  @Delete(':commentId')
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
      summary: '댓글 삭제', 
      description: '댓글 Id와 일치하는 댓글을 삭제합니다.' 
  })
  @UseGuards(IsCommentMineOrAdminGuard)
  @UseInterceptors(TransactionInterceptor)
  async deleteComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @QueryRunnerDecorator() qr: QueryRunner,
  ) {
    const resp = await this.commentsService.deleteComment(postId, commentId, qr);

    await this.postService.decrementFollowerCount(postId, 'commentCount', 1, qr);

    return resp;
  }
}
