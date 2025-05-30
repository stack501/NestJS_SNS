import { BadRequestException, Injectable } from '@nestjs/common';
import { PaginateCommentsDto } from './dto/paginate-comments.dto';
import { CommonService } from 'src/common/common.service';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentsModel } from './entity/comments.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CreateCommentsDto } from './dto/create-comments.dto';
import { UsersModel } from 'src/users/entity/users.entity';
import { DEFAULT_COMMENT_FIND_OPTIONS } from './const/default-comment-find-options.const';
import { UpdateCommentsDto } from './dto/update-comments.dto';

/**
 * 댓글 관련 비즈니스 로직을 처리하는 서비스
 * 게시물에 대한 댓글 CRUD 기능을 제공합니다
 */
@Injectable()
export class CommentsService {
    constructor(
    @InjectRepository(CommentsModel)
    private readonly commentsRepository: Repository<CommentsModel>,
    private readonly commonService: CommonService,
    ) {}

    /**
     * 특정 게시물에 대한 댓글 목록을 페이징하여 조회합니다
     * @param dto 페이징 정보가 담긴 DTO
     * @param postId 게시물 ID
     * @returns 페이징된 댓글 목록
     */
    async paginateComments(dto: PaginateCommentsDto, postId: number) {
        return this.commonService.paginate(
            dto,
            this.commentsRepository,
            {
                where: {
                    post: {
                        id: postId,
                    }
                },
                ...DEFAULT_COMMENT_FIND_OPTIONS,
            },
            `posts/${postId}/comments`,
            );
    }

    /**
     * 특정 게시물의 특정 댓글을 조회합니다
     * @param postId 게시물 ID
     * @param commentId 댓글 ID
     * @param qr 쿼리 러너 (트랜잭션 처리용)
     * @returns 댓글 정보와 해당 댓글의 리포지토리
     * @throws BadRequestException 댓글이 존재하지 않을 경우
     */
    async getCommentById(postId: number, commentId: number, qr?: QueryRunner) {
        const repository = this.getRepository(qr);
        const comment = await repository.findOne({
            where: {
                post: {
                    id: postId,
                },
                id: commentId,
            },
            ...DEFAULT_COMMENT_FIND_OPTIONS,
        });

        if (!comment) {
            throw new BadRequestException(
                `id: ${commentId} Comment는 존재하지 않습니다.`
            )
        }

        return { repository, comment };
    }

    /**
     * 쿼리 러너 유무에 따라 적절한 리포지토리를 반환합니다
     * @param qr 쿼리 러너 (트랜잭션 처리용)
     * @returns 댓글 모델 리포지토리
     */
    getRepository(qr?: QueryRunner) {
        return qr ? qr.manager.getRepository<CommentsModel>(CommentsModel) : this.commentsRepository;
      }

    /**
     * 새로운 댓글을 생성합니다
     * @param dto 댓글 생성 정보가 담긴 DTO
     * @param postId 게시물 ID
     * @param author 작성자 정보
     * @param qr 쿼리 러너 (트랜잭션 처리용)
     * @returns 생성된 댓글 정보
     */
    async createComment(
        dto: CreateCommentsDto,
        postId: number,
        author: UsersModel,
        qr?: QueryRunner,
    ) {
        const repository = this.getRepository(qr);

        return repository.save({
            ...dto,
            post: {
                id: postId,
            },
            author,
        });
    }

    /**
     * 댓글을 수정합니다
     * @param dto 댓글 수정 정보가 담긴 DTO
     * @param postId 게시물 ID
     * @param commentId 댓글 ID
     * @param qr 쿼리 러너 (트랜잭션 처리용)
     * @returns 수정된 댓글 정보
     * @throws BadRequestException 댓글이 존재하지 않을 경우
     */
    async updateComment(
        dto: UpdateCommentsDto,
        postId: number,
        commentId: number,
        qr?: QueryRunner
    ) {
        const { repository } = await this.getCommentById(postId, commentId, qr);
        
        const prevComment = await repository.preload({
            id: commentId,
            ...dto,
        });

        if (!prevComment) {
            throw new BadRequestException(`댓글을 찾을 수 없습니다. id: ${commentId}`);
        }

        const newComment = await repository.save(
            {
                ...prevComment,
            }
        );

        return newComment;
    }

    /**
     * 댓글을 삭제합니다
     * @param postId 게시물 ID
     * @param commentId 댓글 ID
     * @param qr 쿼리 러너 (트랜잭션 처리용)
     * @returns 삭제 결과
     */
    async deleteComment(
        postId: number,
        commentId: number,
        qr?: QueryRunner
    ) {
        const { repository } = await this.getCommentById(postId, commentId, qr);

        return await repository.delete(commentId);
    }

    /**
     * 해당 댓글이 특정 사용자의 것인지 확인합니다
     * @param userId 사용자 ID
     * @param commentId 댓글 ID
     * @returns 사용자의 댓글인 경우 true, 아닌 경우 false
     */
    async isCommentMine(userId: number, commentId: number) {
        return await this.commentsRepository.exist({
            where: {
                id: commentId,
                author: {
                    id: userId,
                }
            },
            relations: {
                author: true,
            }
        });
    }
}
