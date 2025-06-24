import { Test, TestingModule } from '@nestjs/testing';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { PaginateChatDto } from './dto/paginate-chat.dto';

describe('ChatsController', () => {
  let controller: ChatsController;

  // Mock functions to avoid unbound method errors
  const mockPaginateChatsFn = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [
        {
          provide: ChatsService,
          useValue: {
            paginateChats: mockPaginateChatsFn,
          },
        },
      ],
    }).compile();

    controller = module.get<ChatsController>(ChatsController);

    // 각 테스트 전에 mock 초기화
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('paginateChat', () => {
    it('채팅방 목록을 성공적으로 페이징하여 반환해야 함', async () => {
      const dto: PaginateChatDto = {
        take: 20,
        order__createdAt: 'ASC'
      };
      const expectedResult = {
        data: [
          {
            id: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            users: [
              { id: 1, nickname: 'user1' },
              { id: 2, nickname: 'user2' }
            ]
          }
        ],
        meta: {
          total: 1,
          page: 1,
          lastPage: 1
        }
      };

      mockPaginateChatsFn.mockResolvedValue(expectedResult);

      const result = await controller.paginateChat(dto);

      expect(mockPaginateChatsFn).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });

    it('빈 채팅방 목록을 반환해야 함', async () => {
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

      mockPaginateChatsFn.mockResolvedValue(expectedResult);

      const result = await controller.paginateChat(dto);

      expect(mockPaginateChatsFn).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });

    it('커서 기반 페이징 파라미터로 채팅방 목록을 반환해야 함', async () => {
      const dto: PaginateChatDto = {
        take: 10,
        where__id__less_than: 50,
        order__createdAt: 'DESC'
      };
      const expectedResult = {
        data: [
          {
            id: 49,
            createdAt: new Date(),
            updatedAt: new Date(),
            users: [
              { id: 3, nickname: 'user3' }
            ]
          }
        ],
        meta: {
          total: 1,
          page: 1,
          lastPage: 1
        }
      };

      mockPaginateChatsFn.mockResolvedValue(expectedResult);

      const result = await controller.paginateChat(dto);

      expect(mockPaginateChatsFn).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });
});
