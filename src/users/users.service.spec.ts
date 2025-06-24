import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersModel, RoleEnum } from './entity/users.entity';
import { UserFollowersModel } from './entity/user-followers.entity';
import { Repository, QueryRunner } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Repository<UsersModel>;
  let userFollowersRepository: Repository<UserFollowersModel>;

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

  const mockFollowRelation: UserFollowersModel = {
    id: 1,
    follower: { id: 2, nickname: 'follower1' } as UsersModel,
    followee: { id: 1, nickname: 'testuser' } as UsersModel,
    isConfirmed: true,
    createdAt: new Date(),
    updatedAt: new Date()
  } as UserFollowersModel;

  // Mock functions to avoid unbound method errors
  const mockGetRepositoryFn = jest.fn();

  const mockQueryRunner = {
    manager: {
      getRepository: mockGetRepositoryFn,
    },
  } as unknown as QueryRunner;

  const mockUsersRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
  };

  const mockUserFollowersRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UsersModel),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(UserFollowersModel),
          useValue: mockUserFollowersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<UsersModel>>(getRepositoryToken(UsersModel));
    userFollowersRepository = module.get<Repository<UserFollowersModel>>(getRepositoryToken(UserFollowersModel));

    // 각 테스트 전에 mock 초기화
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsersRepository', () => {
    it('QueryRunner가 없을 때 기본 repository를 반환해야 함', () => {
      const result = service.getUsersRepository();
      expect(result).toBe(usersRepository);
    });

    it('QueryRunner가 있을 때 QueryRunner의 repository를 반환해야 함', () => {
      const mockQrRepository = { ...mockUsersRepository };
      mockGetRepositoryFn.mockReturnValue(mockQrRepository as unknown as Repository<UsersModel>);

      const result = service.getUsersRepository(mockQueryRunner);

      expect(mockGetRepositoryFn).toHaveBeenCalledWith(UsersModel);
      expect(result).toBe(mockQrRepository);
    });
  });

  describe('getUserFollowersRepository', () => {
    it('QueryRunner가 없을 때 기본 repository를 반환해야 함', () => {
      const result = service.getUserFollowersRepository();
      expect(result).toBe(userFollowersRepository);
    });

    it('QueryRunner가 있을 때 QueryRunner의 repository를 반환해야 함', () => {
      const mockQrRepository = { ...mockUserFollowersRepository };
      mockGetRepositoryFn.mockReturnValue(mockQrRepository as unknown as Repository<UserFollowersModel>);

      const result = service.getUserFollowersRepository(mockQueryRunner);

      expect(mockGetRepositoryFn).toHaveBeenCalledWith(UserFollowersModel);
      expect(result).toBe(mockQrRepository);
    });
  });

  describe('checkIfUserExists', () => {
    it('사용자가 존재할 때 true를 반환해야 함', async () => {
      const userId = 1;
      const mockExists = jest.mocked(mockUsersRepository.exists);
      mockExists.mockResolvedValue(true);

      const result = await service.checkIfUserExists(userId);

      expect(mockExists).toHaveBeenCalledWith({
        where: { id: userId }
      });
      expect(result).toBe(true);
    });

    it('사용자가 존재하지 않을 때 false를 반환해야 함', async () => {
      const userId = 999;
      const mockExists = jest.mocked(mockUsersRepository.exists);
      mockExists.mockResolvedValue(false);

      const result = await service.checkIfUserExists(userId);

      expect(mockExists).toHaveBeenCalledWith({
        where: { id: userId }
      });
      expect(result).toBe(false);
    });
  });

  describe('createUser', () => {
    it('새로운 사용자를 성공적으로 생성해야 함', async () => {
      const newUserData = {
        nickname: 'newuser',
        email: 'new@test.com',
        password: 'password123'
      };

      const mockExists = jest.mocked(mockUsersRepository.exists);
      mockExists.mockResolvedValue(false);

      const mockCreate = jest.mocked(mockUsersRepository.create);
      mockCreate.mockReturnValue(mockUser);

      const mockSave = jest.mocked(mockUsersRepository.save);
      mockSave.mockResolvedValue(mockUser);

      const result = await service.createUser(newUserData);

      expect(mockExists).toHaveBeenCalledTimes(2); // nickname, email 체크
      expect(mockCreate).toHaveBeenCalledWith({
        nickname: newUserData.nickname,
        email: newUserData.email,
        password: newUserData.password,
        google: undefined,
        kakao: undefined,
      });
      expect(mockSave).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('중복된 닉네임으로 사용자 생성 시 BadRequestException을 발생시켜야 함', async () => {
      const newUserData = {
        nickname: 'duplicated',
        email: 'new@test.com',
        password: 'password123'
      };

      const mockExists = jest.mocked(mockUsersRepository.exists);
      mockExists.mockResolvedValue(true);

      await expect(service.createUser(newUserData)).rejects.toThrow(
        new BadRequestException('이미 존재하는 nickname 입니다!')
      );
    });

    it('중복된 이메일로 사용자 생성 시 BadRequestException을 발생시켜야 함', async () => {
      const newUserData = {
        nickname: 'newuser',
        email: 'existing@test.com',
        password: 'password123'
      };

      const mockExists = jest.mocked(mockUsersRepository.exists);
      mockExists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      await expect(service.createUser(newUserData)).rejects.toThrow(
        new BadRequestException('이미 존재하는 email 입니다!')
      );
    });
  });

  describe('getAllUsers', () => {
    it('모든 사용자 목록을 반환해야 함', async () => {
      const expectedUsers = [mockUser];
      const mockFind = jest.mocked(mockUsersRepository.find);
      mockFind.mockResolvedValue(expectedUsers);

      const result = await service.getAllUsers();

      expect(mockFind).toHaveBeenCalled();
      expect(result).toEqual(expectedUsers);
    });
  });

  describe('getUserByEmail', () => {
    it('이메일로 사용자를 성공적으로 조회해야 함', async () => {
      const email = 'test@test.com';
      const mockFindOne = jest.mocked(mockUsersRepository.findOne);
      mockFindOne.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail(email);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { email }
      });
      expect(result).toEqual(mockUser);
    });

    it('존재하지 않는 이메일로 조회 시 null을 반환해야 함', async () => {
      const email = 'nonexistent@test.com';
      const mockFindOne = jest.mocked(mockUsersRepository.findOne);
      mockFindOne.mockResolvedValue(null);

      const result = await service.getUserByEmail(email);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { email }
      });
      expect(result).toBeNull();
    });
  });

  describe('followUser', () => {
    it('사용자를 성공적으로 팔로우해야 함', async () => {
      const followerId = 1;
      const followeeId = 2;
      
      const mockSave = jest.mocked(mockUserFollowersRepository.save);
      mockSave.mockResolvedValue(mockFollowRelation);

      const result = await service.followUser(followerId, followeeId);

      expect(mockSave).toHaveBeenCalledWith({
        follower: { id: followerId },
        followee: { id: followeeId }
      });
      expect(result).toBe(true);
    });

    it('QueryRunner를 사용하여 팔로우해야 함', async () => {
      const followerId = 1;
      const followeeId = 2;
      const mockQrRepository = { ...mockUserFollowersRepository };
      
      mockGetRepositoryFn.mockReturnValue(mockQrRepository as unknown as Repository<UserFollowersModel>);
      
      const mockSave = jest.mocked(mockQrRepository.save);
      mockSave.mockResolvedValue(mockFollowRelation);

      const result = await service.followUser(followerId, followeeId, mockQueryRunner);

      expect(mockGetRepositoryFn).toHaveBeenCalledWith(UserFollowersModel);
      expect(mockSave).toHaveBeenCalledWith({
        follower: { id: followerId },
        followee: { id: followeeId }
      });
      expect(result).toBe(true);
    });
  });

  describe('getFollowers', () => {
    it('확인된 팔로워 목록을 반환해야 함', async () => {
      const userId = 1;
      const includeNotConfirmed = false;
      const expectedFollowers = [mockFollowRelation];
      const expectedResult = [{
        id: mockFollowRelation.follower.id,
        nickname: mockFollowRelation.follower.nickname,
        email: undefined,
        isConfirmed: mockFollowRelation.isConfirmed,
      }];
      
      const mockFind = jest.mocked(mockUserFollowersRepository.find);
      mockFind.mockResolvedValue(expectedFollowers);

      const result = await service.getFollowers(userId, includeNotConfirmed);

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          followee: { id: userId },
          isConfirmed: true
        },
        relations: {
          follower: true,
          followee: true,
        }
      });
      expect(result).toEqual(expectedResult);
    });

    it('미확인 팔로워 포함하여 목록을 반환해야 함', async () => {
      const userId = 1;
      const includeNotConfirmed = true;
      const expectedFollowers = [mockFollowRelation];
      const expectedResult = [{
        id: mockFollowRelation.follower.id,
        nickname: mockFollowRelation.follower.nickname,
        email: undefined,
        isConfirmed: mockFollowRelation.isConfirmed,
      }];
      
      const mockFind = jest.mocked(mockUserFollowersRepository.find);
      mockFind.mockResolvedValue(expectedFollowers);

      const result = await service.getFollowers(userId, includeNotConfirmed);

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          followee: { id: userId }
        },
        relations: {
          follower: true,
          followee: true,
        }
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getRequestAllFollowee', () => {
    it('팔로우 요청 목록을 반환해야 함', async () => {
      const followerId = 1;
      const expectedRequests = [mockFollowRelation];
      
      const mockFind = jest.mocked(mockUserFollowersRepository.find);
      mockFind.mockResolvedValue(expectedRequests);

      const result = await service.getRequestAllFollowee(followerId);

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          follower: { id: followerId }
        },
        relations: {
          follower: true,
          followee: true,
        }
      });
      expect(result).toEqual(expectedRequests);
    });
  });

  describe('getExistingFollow', () => {
    it('기존 팔로우 관계를 성공적으로 조회해야 함', async () => {
      const followerId = 1;
      const followeeId = 2;
      
      const mockFindOne = jest.mocked(mockUserFollowersRepository.findOne);
      mockFindOne.mockResolvedValue(mockFollowRelation);

      const result = await service.getExistingFollow(followerId, followeeId);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: {
          follower: { id: followerId },
          followee: { id: followeeId },
          isConfirmed: true
        },
        relations: {
          follower: true,
          followee: true,
        }
      });
      expect(result.repository).toBe(userFollowersRepository);
      expect(result.existing).toEqual(mockFollowRelation);
    });

    it('존재하지 않는 팔로우 관계 조회 시 null을 반환해야 함', async () => {
      const followerId = 1;
      const followeeId = 999;
      
      const mockFindOne = jest.mocked(mockUserFollowersRepository.findOne);
      mockFindOne.mockResolvedValue(null);

      const result = await service.getExistingFollow(followerId, followeeId);

      expect(result.repository).toBe(userFollowersRepository);
      expect(result.existing).toBeNull();
    });
  });

  describe('confirmFollow', () => {
    it('팔로우 요청을 성공적으로 수락해야 함', async () => {
      const followerId = 1;
      const followeeId = 2;
      
      // getExistingFollow 메서드 모킹
      const mockGetExistingFollow = jest.spyOn(service, 'getExistingFollow');
      mockGetExistingFollow.mockResolvedValue({
        repository: mockUserFollowersRepository as any,
        existing: mockFollowRelation
      });

      const mockSave = jest.mocked(mockUserFollowersRepository.save);
      mockSave.mockResolvedValue({ ...mockFollowRelation, isConfirmed: true });

      const result = await service.confirmFollow(followerId, followeeId);

      expect(mockGetExistingFollow).toHaveBeenCalledWith(followerId, followeeId, undefined, false);
      expect(mockSave).toHaveBeenCalledWith({
        ...mockFollowRelation,
        isConfirmed: true
      });
      expect(result).toBe(true);
    });
  });

  describe('deleteFollow', () => {
    it('팔로우 관계를 성공적으로 삭제해야 함', async () => {
      const followerId = 1;
      const followeeId = 2;
      
      // getExistingFollow 메서드 모킹
      const mockGetExistingFollow = jest.spyOn(service, 'getExistingFollow');
      mockGetExistingFollow.mockResolvedValue({
        repository: mockUserFollowersRepository as any,
        existing: mockFollowRelation
      });

      const mockDelete = jest.mocked(mockUserFollowersRepository.delete);
      mockDelete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.deleteFollow(followerId, followeeId);

      expect(mockGetExistingFollow).toHaveBeenCalledWith(followerId, followeeId, undefined, true);
      expect(mockDelete).toHaveBeenCalledWith({
        follower: { id: followerId },
        followee: { id: followeeId }
      });
      expect(result).toBe(true);
    });

    it('존재하지 않는 팔로우 관계 삭제 시 BadRequestException을 발생시켜야 함', async () => {
      const followerId = 1;
      const followeeId = 999;
      
      // getExistingFollow 메서드 모킹
      const mockGetExistingFollow = jest.spyOn(service, 'getExistingFollow');
      mockGetExistingFollow.mockResolvedValue({
        repository: mockUserFollowersRepository as any,
        existing: null
      });

      await expect(service.deleteFollow(followerId, followeeId)).rejects.toThrow(
        new BadRequestException('팔로우 하지 않은 사용자입니다.')
      );
    });
  });

  describe('incrementFollowerCount', () => {
    it('팔로워 카운트를 성공적으로 증가시켜야 함', async () => {
      const userId = 1;
      const fieldName = 'followerCount' as const;
      const incrementCount = 1;
      
      const mockIncrement = jest.mocked(mockUsersRepository.increment);
      mockIncrement.mockResolvedValue({ affected: 1 } as any);

      await service.incrementFollowerCount(userId, fieldName, incrementCount);

      expect(mockIncrement).toHaveBeenCalledWith(
        { id: userId },
        fieldName,
        incrementCount
      );
    });
  });

  describe('decrementFollowerCount', () => {
    it('팔로워 카운트를 성공적으로 감소시켜야 함', async () => {
      const userId = 1;
      const fieldName = 'followeeCount' as const;
      const decrementCount = 1;
      
      const mockDecrement = jest.mocked(mockUsersRepository.decrement);
      mockDecrement.mockResolvedValue({ affected: 1 } as any);

      await service.decrementFollowerCount(userId, fieldName, decrementCount);

      expect(mockDecrement).toHaveBeenCalledWith(
        { id: userId },
        fieldName,
        decrementCount
      );
    });
  });

  describe('findOrCreateUserByProvider', () => {
    it('기존 사용자를 찾아 provider 정보를 업데이트해야 함', async () => {
      const providerData = {
        email: 'test@test.com',
        nickname: 'testuser',
        providerId: 'google123',
        providerKey: AuthProvider.GOOGLE
      };

      const existingUser = { ...mockUser, google: null };
      
      const mockFindOne = jest.mocked(mockUsersRepository.findOne);
      // First call searches by provider field, second call searches by email
      mockFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existingUser);

      const mockSave = jest.mocked(mockUsersRepository.save);
      mockSave.mockResolvedValue({ ...existingUser, google: providerData.providerId });

      const result = await service.findOrCreateUserByProvider(providerData);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { [providerData.providerKey]: providerData.providerId }
      });
      expect(mockFindOne).toHaveBeenCalledWith({
        where: { email: providerData.email }
      });
      expect(mockSave).toHaveBeenCalledWith({
        ...existingUser,
        [providerData.providerKey]: providerData.providerId
      });
      expect(result).toBeDefined();
    });

    it('새로운 사용자를 생성해야 함', async () => {
      const providerData = {
        email: 'newuser@test.com',
        nickname: 'newuser',
        providerId: 'google123',
        providerKey: AuthProvider.GOOGLE
      };

      const mockFindOne = jest.mocked(mockUsersRepository.findOne);
      mockFindOne.mockResolvedValue(null);

      // createUser 메서드 모킹
      const mockCreateUser = jest.spyOn(service, 'createUser');
      mockCreateUser.mockResolvedValue(mockUser);

      const result = await service.findOrCreateUserByProvider(providerData);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { email: providerData.email }
      });
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: providerData.email,
        nickname: providerData.nickname,
        password: '',
        [providerData.providerKey]: providerData.providerId
      });
      expect(result).toEqual(mockUser);
    });
  });
});
