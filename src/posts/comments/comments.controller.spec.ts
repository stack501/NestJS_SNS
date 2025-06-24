import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PostsService } from '../posts.service';
import { CreateCommentsDto } from './dto/create-comments.dto';
import { UpdateCommentsDto } from './dto/update-comments.dto';
import { PaginateCommentsDto } from './dto/paginate-comments.dto';
import { UsersModel, RoleEnum } from 'src/users/entity/users.entity';
import { CommentsModel } from './entity/comments.entity';
import { QueryRunner, DataSource } from 'typeorm';

describe('CommentsController', () => {
  let controller: CommentsController;
  let commentsService: CommentsService;
  let postsService: PostsService;

  // Mock data
  const mockUser = {
    id: 1,
    nickname: 'testuser',
    email: 'test@test.com',
    password: 'hashedpassword',
    role: RoleEnum.USER,
    followerCount: 0,
    followeeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    google: 'google-id',
    kakao: 'kakao-id',
    posts: [],
    comments: [],
    followers: [],
    followees: [],
    chats: [],
    messages: [],
    whisperMessages: []
  } as UsersModel;

  const mockComment: CommentsModel = {
    id: 1,
    comment: 'Test comment',
    likeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockUser,
    post: { id: 1 } as any
  } as CommentsModel;

  const mockQueryRunner = {
    release: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
  } as any;

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: {
            paginateComments: jest.fn(),
            getCommentById: jest.fn(),
            createComment: jest.fn(),
            updateComment: jest.fn(),
            deleteComment: jest.fn(),
          },
        },
        {
          provide: PostsService,
          useValue: {
            incrementFollowerCount: jest.fn(),
            decrementFollowerCount: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    commentsService = module.get<CommentsService>(CommentsService);
    postsService = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getComments', () => {
    it('should return paginated comments for a post', async () => {
      const postId = 1;
      const query: PaginateCommentsDto = {
        take: 20,
        order__createdAt: 'ASC'
      };
      const expectedResult = {
        data: [mockComment],
        meta: {
          total: 1,
          page: 1,
          lastPage: 1
        }
      };

      (commentsService.paginateComments as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getComments(postId, query);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockPaginateComments = commentsService.paginateComments as jest.Mock;
      expect(mockPaginateComments).toHaveBeenCalledWith(query, postId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getComment', () => {
    it('should return a specific comment', async () => {
      const postId = 1;
      const commentId = 1;
      const mockServiceResult = {
        comment: mockComment,
        repository: {} as any
      };

      (commentsService.getCommentById as jest.Mock).mockResolvedValue(mockServiceResult);

      const result = await controller.getComment(postId, commentId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockGetCommentById = commentsService.getCommentById as jest.Mock;
      expect(mockGetCommentById).toHaveBeenCalledWith(postId, commentId);
      expect(result).toEqual(mockComment);
    });
  });

  describe('postComment', () => {
    it('should create a new comment and increment post comment count', async () => {
      const postId = 1;
      const createCommentDto: CreateCommentsDto = {
        comment: 'New test comment'
      };
      const createdComment = { ...mockComment, comment: createCommentDto.comment };

      (commentsService.createComment as jest.Mock).mockResolvedValue(createdComment);
      (postsService.incrementFollowerCount as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.postComment(postId, createCommentDto, mockUser, mockQueryRunner as QueryRunner);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockCreateComment = commentsService.createComment as jest.Mock;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockIncrementFollowerCount = postsService.incrementFollowerCount as jest.Mock;
      expect(mockCreateComment).toHaveBeenCalledWith(createCommentDto, postId, mockUser, mockQueryRunner);
      expect(mockIncrementFollowerCount).toHaveBeenCalledWith(postId, 'commentCount', 1, mockQueryRunner);
      expect(result).toEqual(createdComment);
    });
  });

  describe('patchComment', () => {
    it('should update a comment', async () => {
      const postId = 1;
      const commentId = 1;
      const updateCommentDto: UpdateCommentsDto = {
        comment: 'Updated comment'
      };
      const updatedComment = { ...mockComment, comment: updateCommentDto.comment };

      (commentsService.updateComment as jest.Mock).mockResolvedValue(updatedComment);

      const result = await controller.patchComment(postId, commentId, updateCommentDto, mockQueryRunner as QueryRunner);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockUpdateComment = commentsService.updateComment as jest.Mock;
      expect(mockUpdateComment).toHaveBeenCalledWith(updateCommentDto, postId, commentId, mockQueryRunner);
      expect(result).toEqual(updatedComment);
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment and decrement post comment count', async () => {
      const postId = 1;
      const commentId = 1;
      const deleteResult = { affected: 1, raw: [] };

      (commentsService.deleteComment as jest.Mock).mockResolvedValue(deleteResult);
      (postsService.decrementFollowerCount as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.deleteComment(postId, commentId, mockQueryRunner as QueryRunner);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockDeleteComment = commentsService.deleteComment as jest.Mock;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockDecrementFollowerCount = postsService.decrementFollowerCount as jest.Mock;
      expect(mockDeleteComment).toHaveBeenCalledWith(postId, commentId, mockQueryRunner);
      expect(mockDecrementFollowerCount).toHaveBeenCalledWith(postId, 'commentCount', 1, mockQueryRunner);
      expect(result).toEqual(deleteResult);
    });
  });
});
