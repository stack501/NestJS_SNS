 
 

// filepath: /Users/h2k/NestJS/2_cf_sns/src/posts/posts.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostsImagesService } from './image/images.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { PostsModel } from './entity/posts.entity';
import { QueryRunner } from 'typeorm';
import { IsPostMineOrAdminGuard } from './guard/is-post-mine-or-admin.guard';
import { RoleEnum } from '../users/entity/users.entity';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard';
import { IORedisToken } from '../redis/redis.constants';
import { Reflector } from '@nestjs/core';
import { TransactionInterceptor } from '../common/interceptor/transaction.interceptor';

describe('PostsController', () => {
  let controller: PostsController;
  let postsService: PostsService;
  let postsImagesService: PostsImagesService;

  // Mock 데이터
  const mockPost: PostsModel = {
    id: 1,
    title: '테스트 게시글',
    content: '테스트 내용',
    authorId: 1,
    author: {
      id: 1,
      email: 'test@test.com',
      nickname: 'testuser',
      password: 'hashedPassword',
      role: RoleEnum.USER,
      google: '',
      kakao: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      followers: [],
      followees: [],
      posts: [],
      comments: [],
      messages: [],
      whisperMessages: [],
      chats: [],
      followerCount: 0,
      followeeCount: 0,
    },
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
    comments: [],
  };

  const mockPaginatedResult = {
    data: [mockPost],
    cursor: { after: null },
    count: 1,
    next: null,
  };

  // Mock Services
  const mockPostsService = {
    paginatePosts: jest.fn(),
    generatePosts: jest.fn(),
    getPostById: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
  };

  const mockPostsImagesService = {
    createPostImage: jest.fn(),
  };

  const mockRedisClient = {
    eval: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
        {
          provide: PostsImagesService,
          useValue: mockPostsImagesService,
        },
        {
          provide: IORedisToken,
          useValue: mockRedisClient,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    })
    .overrideGuard(IsPostMineOrAdminGuard)
    .useValue({
      canActivate: () => true,
    })
    .overrideGuard(RateLimiterGuard)
    .useValue({
      canActivate: () => true,
    })
    .overrideInterceptor(TransactionInterceptor)
    .useValue({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      intercept: (context, next) => next.handle(),
    })
    .compile();

    controller = module.get<PostsController>(PostsController);
    postsService = module.get<PostsService>(PostsService);
    postsImagesService = module.get<PostsImagesService>(PostsImagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('정의 테스트', () => {
    it('컨트롤러가 정의되어야 합니다', () => {
      expect(controller).toBeDefined();
    });

    it('PostsService가 정의되어야 합니다', () => {
      expect(postsService).toBeDefined();
    });

    it('PostsImagesService가 정의되어야 합니다', () => {
      expect(postsImagesService).toBeDefined();
    });
  });

  describe('getPosts', () => {
    it('모든 게시글을 페이지네이션으로 가져와야 합니다', async () => {
      const query: PaginatePostDto = { 
        page: 1,
        order__createdAt: 'ASC',
        take: 20,
      };
      mockPostsService.paginatePosts.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getPosts(query);

      expect(mockPostsService.paginatePosts).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('getFollowingPosts', () => {
    it('팔로워 게시글만 가져와야 합니다', async () => {
      const userId = 1;
      const query: PaginatePostDto = { 
        page: 1, 
        isOnlyFollowingPosts: true,
        order__createdAt: 'ASC',
        take: 20,
      };
      mockPostsService.paginatePosts.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getFollowingPosts(userId, query);

      expect(mockPostsService.paginatePosts).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          author: expect.objectContaining({
            followees: { isConfirmed: true },
            id: expect.any(Object),
          }),
        }),
        userId
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it('모든 게시글을 가져와야 합니다 (팔로워 필터링 없음)', async () => {
      const userId = 1;
      const query: PaginatePostDto = { 
        page: 1, 
        isOnlyFollowingPosts: false,
        order__createdAt: 'ASC',
        take: 20,
      };
      mockPostsService.paginatePosts.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getFollowingPosts(userId, query);

      expect(mockPostsService.paginatePosts).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('postPostsRandom', () => {
    it('테스트용 게시글 100개를 생성해야 합니다', async () => {
      const userId = 1;
      mockPostsService.generatePosts.mockResolvedValue(undefined);

      const result = await controller.postPostsRandom(userId);

      expect(mockPostsService.generatePosts).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });
  });

  describe('getPost', () => {
    it('ID로 특정 게시글을 가져와야 합니다', async () => {
      const postId = 1;
      mockPostsService.getPostById.mockResolvedValue(mockPost);

      const result = await controller.getPost(postId);

      expect(mockPostsService.getPostById).toHaveBeenCalledWith(postId);
      expect(result).toEqual(mockPost);
    });
  });

  describe('postPosts', () => {
    it('새 게시글을 생성해야 합니다', async () => {
      const userId = 1;
      const createPostDto: CreatePostDto = {
        title: '새 게시글',
        content: '새 내용',
        images: ['image1.jpg', 'image2.jpg'],
      };
      const mockQueryRunner = {} as QueryRunner;
      
      mockPostsService.createPost.mockResolvedValue(mockPost);
      mockPostsImagesService.createPostImage.mockResolvedValue(undefined);
      mockPostsService.getPostById.mockResolvedValue(mockPost);

      const result = await controller.postPosts(userId, createPostDto, mockQueryRunner);

      expect(mockPostsService.createPost).toHaveBeenCalledWith(userId, createPostDto, mockQueryRunner);
      expect(mockPostsImagesService.createPostImage).toHaveBeenCalledTimes(2);
      expect(mockPostsService.getPostById).toHaveBeenCalledWith(mockPost.id, mockQueryRunner);
      expect(result).toEqual(mockPost);
    });

    it('이미지가 없는 게시글을 생성해야 합니다', async () => {
      const userId = 1;
      const createPostDto: CreatePostDto = {
        title: '새 게시글',
        content: '새 내용',
        images: [],
      };
      const mockQueryRunner = {} as QueryRunner;
      
      mockPostsService.createPost.mockResolvedValue(mockPost);
      mockPostsService.getPostById.mockResolvedValue(mockPost);

      const result = await controller.postPosts(userId, createPostDto, mockQueryRunner);

      expect(mockPostsService.createPost).toHaveBeenCalledWith(userId, createPostDto, mockQueryRunner);
      expect(mockPostsImagesService.createPostImage).not.toHaveBeenCalled();
      expect(mockPostsService.getPostById).toHaveBeenCalledWith(mockPost.id, mockQueryRunner);
      expect(result).toEqual(mockPost);
    });
  });

  describe('patchPost', () => {
    it('게시글을 수정해야 합니다', async () => {
      const postId = 1;
      const updatePostDto: UpdatePostDto = {
        title: '수정된 제목',
        content: '수정된 내용',
      };
      const updatedPost = { ...mockPost, ...updatePostDto };
      
      mockPostsService.updatePost.mockResolvedValue(updatedPost);

      const result = await controller.patchPost(postId, updatePostDto);

      expect(mockPostsService.updatePost).toHaveBeenCalledWith(postId, updatePostDto);
      expect(result).toEqual(updatedPost);
    });
  });

  describe('deletePost', () => {
    it('게시글을 삭제해야 합니다', async () => {
      const postId = 1;
      mockPostsService.deletePost.mockResolvedValue(postId);

      const result = await controller.deletePost(postId);

      expect(mockPostsService.deletePost).toHaveBeenCalledWith(postId);
      expect(result).toBe(postId);
    });
  });
});
