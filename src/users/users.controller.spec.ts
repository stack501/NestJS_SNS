import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DataSource } from 'typeorm';
import { UsersModel, RoleEnum } from './entity/users.entity';

describe('UsersController', () => {
  let controller: UsersController;

  // Mock 데이터
  const mockUser: UsersModel = {
    id: 1,
    nickname: 'testuser',
    email: 'test@test.com',
    password: 'hashedpassword',
    role: RoleEnum.USER,
    followerCount: 5,
    followeeCount: 3,
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

  const mockFollower = {
    id: 2,
    follower: { id: 2, nickname: 'follower1' },
    followee: { id: 1, nickname: 'testuser' },
    isConfirmed: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock functions to avoid unbound method errors
  const mockGetAllUsersFn = jest.fn();
  const mockGetFollowersFn = jest.fn();
  const mockFollowUserFn = jest.fn();
  const mockDeleteFollowFn = jest.fn();
  const mockGetRequestAllFolloweeFn = jest.fn();
  const mockConfirmFollowFn = jest.fn();
  const mockIncrementFollowerCountFn = jest.fn();
  const mockDecrementFollowerCountFn = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            getAllUsers: mockGetAllUsersFn,
            getFollowers: mockGetFollowersFn,
            followUser: mockFollowUserFn,
            deleteFollow: mockDeleteFollowFn,
            getRequestAllFollowee: mockGetRequestAllFolloweeFn,
            confirmFollow: mockConfirmFollowFn,
            incrementFollowerCount: mockIncrementFollowerCountFn,
            decrementFollowerCount: mockDecrementFollowerCountFn,
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                getRepository: jest.fn(),
              },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);

    // 각 테스트 전에 mock 초기화
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('모든 사용자 목록을 성공적으로 반환해야 함', async () => {
      const expectedUsers = [mockUser];
      mockGetAllUsersFn.mockResolvedValue(expectedUsers);

      const result = await controller.getUsers();

      expect(mockGetAllUsersFn).toHaveBeenCalled();
      expect(result).toEqual(expectedUsers);
    });
  });

  describe('getFollow', () => {
    it('팔로워 목록을 성공적으로 반환해야 함', async () => {
      const userId = 1;
      const includeNotConfirmed = false;
      const expectedFollowers = [mockFollower];
      
      mockGetFollowersFn.mockResolvedValue(expectedFollowers);

      const result = await controller.getFollow(userId, includeNotConfirmed);

      expect(mockGetFollowersFn).toHaveBeenCalledWith(userId, includeNotConfirmed);
      expect(result).toEqual(expectedFollowers);
    });

    it('미확인 팔로우 포함하여 팔로워 목록을 반환해야 함', async () => {
      const userId = 1;
      const includeNotConfirmed = true;
      const expectedFollowers = [mockFollower];
      
      mockGetFollowersFn.mockResolvedValue(expectedFollowers);

      const result = await controller.getFollow(userId, includeNotConfirmed);

      expect(mockGetFollowersFn).toHaveBeenCalledWith(userId, includeNotConfirmed);
      expect(result).toEqual(expectedFollowers);
    });
  });

  describe('postFollow', () => {
    it('사용자 팔로우를 성공적으로 처리해야 함', async () => {
      const userId = 1;
      const followeeId = 2;
      
      mockFollowUserFn.mockResolvedValue(true);

      const result = await controller.postFollow(userId, followeeId);

      expect(mockFollowUserFn).toHaveBeenCalledWith(userId, followeeId);
      expect(result).toBe(true);
    });
  });

  describe('deleteFollowCancel', () => {
    it('팔로우 요청을 성공적으로 취소해야 함', async () => {
      const userId = 1;
      const followeeId = 2;
      const mockQueryRunner = {
        manager: { getRepository: jest.fn() }
      } as any;
      
      mockDeleteFollowFn.mockResolvedValue(true);

      const result = await controller.deleteFollowCancel(userId, followeeId, mockQueryRunner);

      expect(mockDeleteFollowFn).toHaveBeenCalledWith(userId, followeeId, mockQueryRunner, false);
      expect(result).toBe(true);
    });
  });

  describe('getRequestsFollow', () => {
    it('팔로우 요청 목록을 성공적으로 반환해야 함', async () => {
      const userId = 1;
      const expectedRequests = [mockFollower];
      
      mockGetRequestAllFolloweeFn.mockResolvedValue(expectedRequests);

      const result = await controller.getRequestsFollow(userId);

      expect(mockGetRequestAllFolloweeFn).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedRequests);
    });
  });

  describe('patchFollowConfirm', () => {
    it('팔로우 요청을 성공적으로 수락해야 함', async () => {
      const userId = 1;
      const followerId = 2;
      const mockQueryRunner = {
        manager: { getRepository: jest.fn() }
      } as any;
      
      mockConfirmFollowFn.mockResolvedValue(true);
      mockIncrementFollowerCountFn.mockResolvedValue(undefined);

      const result = await controller.patchFollowConfirm(userId, followerId, mockQueryRunner);

      expect(mockConfirmFollowFn).toHaveBeenCalledWith(followerId, userId, mockQueryRunner);
      expect(mockIncrementFollowerCountFn).toHaveBeenCalledWith(userId, 'followerCount', 1, mockQueryRunner);
      expect(mockIncrementFollowerCountFn).toHaveBeenCalledWith(followerId, 'followeeCount', 1, mockQueryRunner);
      expect(result).toBe(true);
    });
  });

  describe('deleteFollow', () => {
    it('팔로우를 성공적으로 해제해야 함', async () => {
      const userId = 1;
      const followeeId = 2;
      const mockQueryRunner = {
        manager: { getRepository: jest.fn() }
      } as any;
      
      mockDeleteFollowFn.mockResolvedValue(true);
      mockDecrementFollowerCountFn.mockResolvedValue(undefined);

      const result = await controller.deleteFollow(userId, followeeId, mockQueryRunner);

      expect(mockDeleteFollowFn).toHaveBeenCalledWith(userId, followeeId);
      expect(mockDecrementFollowerCountFn).toHaveBeenCalledWith(userId, 'followeeCount', 1, mockQueryRunner);
      expect(mockDecrementFollowerCountFn).toHaveBeenCalledWith(followeeId, 'followerCount', 1, mockQueryRunner);
      expect(result).toBe(true);
    });
  });
});
