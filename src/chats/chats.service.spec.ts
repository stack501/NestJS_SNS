import { Test, TestingModule } from '@nestjs/testing';
import { ChatsService } from './chats.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatsModel } from './entity/chats.entity';
import { CommonService } from 'src/common/common.service';
import { Repository } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';
import { PaginateChatDto } from './dto/paginate-chat.dto';
import { UsersModel, RoleEnum } from 'src/users/entity/users.entity';

describe('ChatsService', () => {
  let service: ChatsService;
  let chatsRepository: Repository<ChatsModel>;

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

  const mockChat: ChatsModel = {
    id: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [mockUser],
    messages: []
  } as ChatsModel;

  // Mock functions to avoid unbound method errors
  const mockPaginateFn = jest.fn();

  const mockRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        {
          provide: getRepositoryToken(ChatsModel),
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

    service = module.get<ChatsService>(ChatsService);
    chatsRepository = module.get<Repository<ChatsModel>>(getRepositoryToken(ChatsModel));

    // 각 테스트 전에 mock 초기화
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('paginateChats', () => {
    it('채팅방 목록을 페이징하여 성공적으로 반환해야 함', async () => {
      const dto: PaginateChatDto = {
        take: 20,
        order__createdAt: 'ASC'
      };
      const expectedResult = {
        data: [mockChat],
        meta: {
          total: 1,
          page: 1,
          lastPage: 1
        }
      };

      mockPaginateFn.mockResolvedValue(expectedResult);

      const result = await service.paginateChats(dto);

      expect(mockPaginateFn).toHaveBeenCalledWith(
        dto,
        chatsRepository,
        {
          relations: {
            users: true,
          }
        },
        'chats',
      );
      expect(result).toEqual(expectedResult);
    });

    it('빈 결과를 반환해야 함', async () => {
      const dto: PaginateChatDto = {
        take: 20,
        order__createdAt: 'DESC'
      };
      const expectedResult = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          lastPage: 1
        }
      };

      mockPaginateFn.mockResolvedValue(expectedResult);

      const result = await service.paginateChats(dto);

      expect(mockPaginateFn).toHaveBeenCalledWith(
        dto,
        chatsRepository,
        {
          relations: {
            users: true,
          }
        },
        'chats',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createChat', () => {
    it('새로운 채팅방을 성공적으로 생성해야 함', async () => {
      const dto: CreateChatDto = {
        userIds: [1, 2, 3]
      };
      const savedChat = { id: 1 };
      const foundChat = {
        id: 1,
        users: [
          { id: 1, nickname: 'user1' },
          { id: 2, nickname: 'user2' },
          { id: 3, nickname: 'user3' }
        ]
      };

      const mockSave = jest.mocked(mockRepository.save);
      mockSave.mockResolvedValue(savedChat);

      const mockFindOne = jest.mocked(mockRepository.findOne);
      mockFindOne.mockResolvedValue(foundChat);

      const result = await service.createChat(dto);

      expect(mockSave).toHaveBeenCalledWith({
        users: dto.userIds.map((id) => ({ id })),
      });
      expect(mockFindOne).toHaveBeenCalledWith({
        where: {
          id: savedChat.id,
        }
      });
      expect(result).toEqual(foundChat);
    });

    it('단일 사용자로 채팅방을 생성해야 함', async () => {
      const dto: CreateChatDto = {
        userIds: [1]
      };
      const savedChat = { id: 2 };
      const foundChat = {
        id: 2,
        users: [
          { id: 1, nickname: 'user1' }
        ]
      };

      const mockSave = jest.mocked(mockRepository.save);
      mockSave.mockResolvedValue(savedChat);

      const mockFindOne = jest.mocked(mockRepository.findOne);
      mockFindOne.mockResolvedValue(foundChat);

      const result = await service.createChat(dto);

      expect(mockSave).toHaveBeenCalledWith({
        users: [{ id: 1 }],
      });
      expect(mockFindOne).toHaveBeenCalledWith({
        where: {
          id: savedChat.id,
        }
      });
      expect(result).toEqual(foundChat);
    });

    it('여러 사용자로 그룹 채팅방을 생성해야 함', async () => {
      const dto: CreateChatDto = {
        userIds: [1, 2, 3, 4, 5]
      };
      const savedChat = { id: 3 };
      const foundChat = {
        id: 3,
        users: [
          { id: 1, nickname: 'user1' },
          { id: 2, nickname: 'user2' },
          { id: 3, nickname: 'user3' },
          { id: 4, nickname: 'user4' },
          { id: 5, nickname: 'user5' }
        ]
      };

      const mockSave = jest.mocked(mockRepository.save);
      mockSave.mockResolvedValue(savedChat);

      const mockFindOne = jest.mocked(mockRepository.findOne);
      mockFindOne.mockResolvedValue(foundChat);

      const result = await service.createChat(dto);

      expect(mockSave).toHaveBeenCalledWith({
        users: dto.userIds.map((id) => ({ id })),
      });
      expect(result).toEqual(foundChat);
    });
  });

  describe('checkIfChatExists', () => {
    it('존재하는 채팅방에 대해 true를 반환해야 함', async () => {
      const chatId = 1;

      const mockExists = jest.mocked(mockRepository.exists);
      mockExists.mockResolvedValue(true);

      const result = await service.checkIfChatExists(chatId);

      expect(mockExists).toHaveBeenCalledWith({
        where: {
          id: chatId,
        }
      });
      expect(result).toBe(true);
    });

    it('존재하지 않는 채팅방에 대해 false를 반환해야 함', async () => {
      const chatId = 999;

      const mockExists = jest.mocked(mockRepository.exists);
      mockExists.mockResolvedValue(false);

      const result = await service.checkIfChatExists(chatId);

      expect(mockExists).toHaveBeenCalledWith({
        where: {
          id: chatId,
        }
      });
      expect(result).toBe(false);
    });

    it('여러 채팅방 ID로 존재 여부를 확인해야 함', async () => {
      const chatIds = [1, 2, 3];

      const mockExists = jest.mocked(mockRepository.exists);
      mockExists
        .mockResolvedValueOnce(true)   // chatId 1: 존재
        .mockResolvedValueOnce(false)  // chatId 2: 존재하지 않음
        .mockResolvedValueOnce(true);  // chatId 3: 존재

      const results = await Promise.all(
        chatIds.map(chatId => service.checkIfChatExists(chatId))
      );

      expect(mockExists).toHaveBeenCalledTimes(3);
      expect(mockExists).toHaveBeenNthCalledWith(1, {
        where: { id: 1 }
      });
      expect(mockExists).toHaveBeenNthCalledWith(2, {
        where: { id: 2 }
      });
      expect(mockExists).toHaveBeenNthCalledWith(3, {
        where: { id: 3 }
      });
      expect(results).toEqual([true, false, true]);
    });

    it('유효하지 않은 ID(0 이하)에 대해서도 정상적으로 처리해야 함', async () => {
      const invalidChatIds = [0, -1, -100];

      const mockExists = jest.mocked(mockRepository.exists);
      mockExists.mockResolvedValue(false);

      for (const chatId of invalidChatIds) {
        const result = await service.checkIfChatExists(chatId);
        expect(result).toBe(false);
      }

      expect(mockExists).toHaveBeenCalledTimes(invalidChatIds.length);
    });
  });
});
