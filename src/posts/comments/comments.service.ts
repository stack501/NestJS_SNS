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

@Injectable()
export class CommentsService {
    constructor(
    @InjectRepository(CommentsModel)
    private readonly commentsRepository: Repository<CommentsModel>,
    private readonly commonService: CommonService,
    ) {}

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

    getRepository(qr?: QueryRunner) {
        return qr ? qr.manager.getRepository<CommentsModel>(CommentsModel) : this.commentsRepository;
      }

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

    async deleteComment(
        postId: number,
        commentId: number,
        qr?: QueryRunner
    ) {
        const { repository } = await this.getCommentById(postId, commentId, qr);

        return await repository.delete(commentId);
    }

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
