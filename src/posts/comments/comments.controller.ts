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

/**
 * 댓글 관련 API 엔드포인트를 제공하는 컨트롤러
 * 게시물에 대한 댓글 CRUD 엔드포인트를 관리합니다
 */
@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly postService: PostsService,
  ) {}

  /**
   * 특정 게시물의 모든 댓글을 페이징하여 조회합니다
   * @param postId 게시물 ID
   * @param query 페이징 정보가 담긴 쿼리 파라미터
   * @returns 페이징된 댓글 목록
   */
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

  /**
   * 특정 게시물의 특정 댓글을 조회합니다
   * @param postId 게시물 ID
   * @param commentId 댓글 ID
   * @returns 댓글 정보
   */
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

  /**
   * 특정 게시물에 새로운 댓글을 작성합니다
   * @param postId 게시물 ID
   * @param body 댓글 생성 정보가 담긴 DTO
   * @param user 현재 인증된 사용자 정보
   * @param qr 트랜잭션 처리를 위한 쿼리 러너
   * @returns 생성된 댓글 정보
   */
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

  /**
   * 특정 게시물의 특정 댓글을 수정합니다
   * @param postId 게시물 ID
   * @param commentId 댓글 ID
   * @param body 댓글 수정 정보가 담긴 DTO
   * @param qr 트랜잭션 처리를 위한 쿼리 러너
   * @returns 수정된 댓글 정보
   */
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

  /**
   * 특정 게시물의 특정 댓글을 삭제합니다
   * @param postId 게시물 ID
   * @param commentId 댓글 ID
   * @param qr 트랜잭션 처리를 위한 쿼리 러너
   * @returns 삭제 결과
   */
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
