import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommentsModel } from './entity/comments.entity';
import { CommonService } from 'src/common/common.service';
import { Repository, QueryRunner } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { CreateCommentsDto } from './dto/create-comments.dto';
import { UpdateCommentsDto } from './dto/update-comments.dto';
import { PaginateCommentsDto } from './dto/paginate-comments.dto';
import { UsersModel, RoleEnum } from 'src/users/entity/users.entity';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepository: Repository<CommentsModel>;

  // Mock 데이터
  const mockUser: UsersModel = {
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

  // Mock functions to avoid unbound method errors
  const mockPaginateFn = jest.fn();
  const mockGetRepositoryFn = jest.fn();

  const mockQueryRunner = {
    manager: {
      getRepository: mockGetRepositoryFn,
    },
  } as unknown as QueryRunner;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    delete: jest.fn(),
    exist: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(CommentsModel),
          useValue: mockRepository,
        },
        {
          provide: CommonService,
          useValue: {
            paginate: mockPaginateFn,
          },
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentsRepository = module.get<Repository<CommentsModel>>(getRepositoryToken(CommentsModel));

    // 각 테스트 전에 mock 초기화
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('paginateComments', () => {
    it('특정 게시물의 댓글 목록을 페이징하여 반환해야 함', async () => {
      const postId = 1;
      const dto: PaginateCommentsDto = {
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

      // Mock the paginate method directly
      mockPaginateFn.mockResolvedValue(expectedResult);

      const result = await service.paginateComments(dto, postId);

      expect(mockPaginateFn).toHaveBeenCalledWith(
        dto,
        commentsRepository,
        {
          where: {
            post: {
              id: postId,
            }
          },
          relations: {
            author: true,
            post: true,
          },
          select: {
            author: {
              id: true,
              nickname: true,
            },
            post: {
              id: true,
            }
          }
        },
        `posts/${postId}/comments`,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getCommentById', () => {
    it('존재하는 댓글을 성공적으로 조회해야 함', async () => {
      const postId = 1;
      const commentId = 1;

      const mockFindOne = jest.mocked(mockRepository.findOne);
      mockFindOne.mockResolvedValue(mockComment);

      const result = await service.getCommentById(postId, commentId);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: {
          post: {
            id: postId,
          },
          id: commentId,
        },
        relations: {
          author: true,
          post: true,
        },
        select: {
          author: {
            id: true,
            nickname: true,
          },
          post: {
            id: true,
          }
        }
      });
      expect(result.comment).toEqual(mockComment);
      expect(result.repository).toBe(mockRepository);
    });

    it('존재하지 않는 댓글 조회 시 BadRequestException을 발생시켜야 함', async () => {
      const postId = 1;
      const commentId = 999;

      const mockFindOne = jest.mocked(mockRepository.findOne);
      mockFindOne.mockResolvedValue(null);

      await expect(service.getCommentById(postId, commentId)).rejects.toThrow(
        new BadRequestException(`id: ${commentId} Comment는 존재하지 않습니다.`)
      );
    });

    it('QueryRunner를 사용할 때 올바른 repository를 반환해야 함', async () => {
      const postId = 1;
      const commentId = 1;
      const mockQrRepository = { ...mockRepository };

      // Mock getRepository to return the mock repository
      mockGetRepositoryFn.mockReturnValue(mockQrRepository as unknown as Repository<CommentsModel>);
      
      const mockFindOne = jest.mocked(mockQrRepository.findOne);
      mockFindOne.mockResolvedValue(mockComment);

      const result = await service.getCommentById(postId, commentId, mockQueryRunner);

      expect(mockGetRepositoryFn).toHaveBeenCalledWith(CommentsModel);
      expect(result.repository).toBe(mockQrRepository);
    });
  });

  describe('getRepository', () => {
    it('QueryRunner가 없을 때 기본 repository를 반환해야 함', () => {
      const result = service.getRepository();
      expect(result).toBe(commentsRepository);
    });

    it('QueryRunner가 있을 때 QueryRunner의 repository를 반환해야 함', () => {
      const mockQrRepository = { ...mockRepository };
      
      // Mock getRepository to return the mock repository
      mockGetRepositoryFn.mockReturnValue(mockQrRepository as unknown as Repository<CommentsModel>);

      const result = service.getRepository(mockQueryRunner);

      expect(mockGetRepositoryFn).toHaveBeenCalledWith(CommentsModel);
      expect(result).toBe(mockQrRepository);
    });
  });

  describe('createComment', () => {
    it('새로운 댓글을 성공적으로 생성해야 함', async () => {
      const postId = 1;
      const dto: CreateCommentsDto = {
        comment: 'New test comment'
      };
      const createdComment = { ...mockComment, comment: dto.comment };

      const mockSave = jest.mocked(mockRepository.save);
      mockSave.mockResolvedValue(createdComment);

      const result = await service.createComment(dto, postId, mockUser);

      expect(mockSave).toHaveBeenCalledWith({
        ...dto,
        post: {
          id: postId,
        },
        author: mockUser,
      });
      expect(result).toEqual(createdComment);
    });

    it('QueryRunner를 사용하여 댓글을 생성해야 함', async () => {
      const postId = 1;
      const dto: CreateCommentsDto = {
        comment: 'New test comment'
      };
      const createdComment = { ...mockComment, comment: dto.comment };
      const mockQrRepository = { ...mockRepository };

      // Mock getRepository to return the mock repository
      mockGetRepositoryFn.mockReturnValue(mockQrRepository as unknown as Repository<CommentsModel>);

      const mockSave = jest.mocked(mockQrRepository.save);
      mockSave.mockResolvedValue(createdComment);

      const result = await service.createComment(dto, postId, mockUser, mockQueryRunner);

      expect(mockGetRepositoryFn).toHaveBeenCalledWith(CommentsModel);
      expect(mockSave).toHaveBeenCalledWith({
        ...dto,
        post: {
          id: postId,
        },
        author: mockUser,
      });
      expect(result).toEqual(createdComment);
    });
  });

  describe('updateComment', () => {
    it('댓글을 성공적으로 수정해야 함', async () => {
      const postId = 1;
      const commentId = 1;
      const dto: UpdateCommentsDto = {
        comment: 'Updated comment'
      };
      const updatedComment = { ...mockComment, comment: dto.comment };

      // getCommentById 메서드 모킹
      const mockGetCommentById = jest.spyOn(service, 'getCommentById');
      mockGetCommentById.mockResolvedValue({
        repository: mockRepository as any,
        comment: mockComment
      });

      const mockPreload = jest.mocked(mockRepository.preload);
      mockPreload.mockResolvedValue(updatedComment);

      const mockSave = jest.mocked(mockRepository.save);
      mockSave.mockResolvedValue(updatedComment);

      const result = await service.updateComment(dto, postId, commentId);

      expect(mockGetCommentById).toHaveBeenCalledWith(postId, commentId, undefined);
      expect(mockPreload).toHaveBeenCalledWith({
        id: commentId,
        ...dto,
      });
      expect(mockSave).toHaveBeenCalledWith(updatedComment);
      expect(result).toEqual(updatedComment);
    });

    it('존재하지 않는 댓글 수정 시 BadRequestException을 발생시켜야 함', async () => {
      const postId = 1;
      const commentId = 999;
      const dto: UpdateCommentsDto = {
        comment: 'Updated comment'
      };

      // getCommentById 메서드 모킹
      const mockGetCommentById = jest.spyOn(service, 'getCommentById');
      mockGetCommentById.mockResolvedValue({
        repository: mockRepository as any,
        comment: mockComment
      });

      const mockPreload = jest.mocked(mockRepository.preload);
      mockPreload.mockResolvedValue(null);

      await expect(service.updateComment(dto, postId, commentId)).rejects.toThrow(
        new BadRequestException(`댓글을 찾을 수 없습니다. id: ${commentId}`)
      );
    });
  });

  describe('deleteComment', () => {
    it('댓글을 성공적으로 삭제해야 함', async () => {
      const postId = 1;
      const commentId = 1;
      const deleteResult = { affected: 1, raw: [] };

      // getCommentById 메서드 모킹
      const mockGetCommentById = jest.spyOn(service, 'getCommentById');
      mockGetCommentById.mockResolvedValue({
        repository: mockRepository as any,
        comment: mockComment
      });

      const mockDelete = jest.mocked(mockRepository.delete);
      mockDelete.mockResolvedValue(deleteResult as any);

      const result = await service.deleteComment(postId, commentId);

      expect(mockGetCommentById).toHaveBeenCalledWith(postId, commentId, undefined);
      expect(mockDelete).toHaveBeenCalledWith(commentId);
      expect(result).toEqual(deleteResult);
    });

    it('QueryRunner를 사용하여 댓글을 삭제해야 함', async () => {
      const postId = 1;
      const commentId = 1;
      const deleteResult = { affected: 1, raw: [] };
      const mockQrRepository = { ...mockRepository };

      // getCommentById 메서드 모킹
      const mockGetCommentById = jest.spyOn(service, 'getCommentById');
      mockGetCommentById.mockResolvedValue({
        repository: mockQrRepository as any,
        comment: mockComment
      });

      const mockDelete = jest.mocked(mockQrRepository.delete);
      mockDelete.mockResolvedValue(deleteResult as any);

      const result = await service.deleteComment(postId, commentId, mockQueryRunner);

      expect(mockGetCommentById).toHaveBeenCalledWith(postId, commentId, mockQueryRunner);
      expect(mockDelete).toHaveBeenCalledWith(commentId);
      expect(result).toEqual(deleteResult);
    });
  });

  describe('isCommentMine', () => {
    it('사용자의 댓글인 경우 true를 반환해야 함', async () => {
      const userId = 1;
      const commentId = 1;

      const mockExist = jest.mocked(mockRepository.exist);
      mockExist.mockResolvedValue(true);

      const result = await service.isCommentMine(userId, commentId);

      expect(mockExist).toHaveBeenCalledWith({
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
      expect(result).toBe(true);
    });

    it('사용자의 댓글이 아닌 경우 false를 반환해야 함', async () => {
      const userId = 2;
      const commentId = 1;

      const mockExist = jest.mocked(mockRepository.exist);
      mockExist.mockResolvedValue(false);

      const result = await service.isCommentMine(userId, commentId);

      expect(mockExist).toHaveBeenCalledWith({
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
      expect(result).toBe(false);
    });
  });
});
