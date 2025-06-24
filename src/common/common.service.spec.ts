/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CommonService } from './common.service';
import { BasePaginationDto } from './dto/base-pagination.dto';
import { Repository } from 'typeorm';
import { BaseModel } from './entity/base.entity';
import appConfig from 'src/configs/app.config';

// Mock 엔티티 클래스
class MockEntity extends BaseModel {
  title: string;
  content: string;
}

// Mock 리포지토리 생성
const createMockRepository = () => ({
  find: jest.fn(),
  findAndCount: jest.fn(),
});

// Mock 데이터 생성 헬퍼
const createMockEntity = (data: Partial<MockEntity>): MockEntity => ({
  id: 1,
  title: 'Test',
  content: 'Content',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...data,
} as MockEntity);

// Mock 설정 객체
const mockConfig = {
  http: {
    protocol: 'http',
    host: 'localhost:3000',
  },
};

describe('CommonService', () => {
  let service: CommonService;
  let mockRepository: jest.Mocked<Repository<MockEntity>>;

  beforeEach(async () => {
    mockRepository = createMockRepository() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommonService,
        {
          provide: appConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<CommonService>(CommonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('paginate', () => {
    it('should call pagePaginate when page is provided', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'ASC',
      };

      const mockData = [createMockEntity({ id: 1, title: 'Test', content: 'Content' })];
      mockRepository.findAndCount.mockResolvedValue([mockData, 1]);

      const result = await service.paginate(
        dto,
        mockRepository,
        {},
        '/api/test',
      );

      expect(mockRepository.findAndCount).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockData,
        total: 1,
      });
    });

    it('should call cursorPaginate when page is not provided', async () => {
      const dto: BasePaginationDto = {
        take: 10,
        order__createdAt: 'ASC',
      };

      const mockData = [
        createMockEntity({ id: 1, title: 'Test', content: 'Content' })
      ];
      mockRepository.find.mockResolvedValue(mockData);

      const result = await service.paginate(
        dto,
        mockRepository,
        {},
        'api/test',
      );

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('cursor');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('next');
    });

    it('should pass additional where conditions to paginate', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'ASC',
      };

      const additionalWhere = { title: 'Test' };
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.paginate(
        dto,
        mockRepository,
        {},
        '/api/test',
        additionalWhere,
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining(additionalWhere),
        }),
      );
    });

    it('should merge override find options', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'ASC',
      };

      const overrideFindOptions = {
        relations: ['user'],
        select: ['id', 'title'] as (keyof MockEntity)[],
      };

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.paginate(
        dto,
        mockRepository,
        overrideFindOptions,
        '/api/test',
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining(overrideFindOptions),
      );
    });
  });

  describe('Page-based Pagination', () => {
    it('should return correct pagination result for page-based pagination', async () => {
      const dto: BasePaginationDto = {
        page: 2,
        take: 5,
        order__createdAt: 'DESC',
      };

      const mockData = [
        createMockEntity({ id: 1, title: 'Test1', content: 'Content1' }),
        createMockEntity({ id: 2, title: 'Test2', content: 'Content2' }),
      ];
      mockRepository.findAndCount.mockResolvedValue([mockData, 10]);

      const result = await service.paginate(
        dto,
        mockRepository,
        {},
        '/api/test',
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        take: 5,
        skip: 5, // (page - 1) * take = (2 - 1) * 5 = 5
      });

      expect(result).toEqual({
        data: mockData,
        total: 10,
      });
    });

    it('should handle first page correctly', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'ASC',
      };

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.paginate(dto, mockRepository, {}, '/api/test');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'ASC' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('Cursor-based Pagination', () => {
    it('should return correct pagination result for cursor-based pagination', async () => {
      const dto: BasePaginationDto = {
        take: 2,
        order__createdAt: 'ASC',
      };

      const mockData = [
        createMockEntity({ id: 1, title: 'Test1', content: 'Content1' }),
        createMockEntity({ id: 2, title: 'Test2', content: 'Content2' }),
      ];
      mockRepository.find.mockResolvedValue(mockData);

      const result = await service.paginate(
        dto,
        mockRepository,
        {},
        'api/test',
      );

      expect(result).toEqual({
        data: mockData,
        cursor: { after: 2 },
        count: 2,
        next: expect.stringContaining('http://localhost:3000/api/test'),
      });
    });

    it('should handle empty results in cursor pagination', async () => {
      const dto: BasePaginationDto = {
        take: 10,
        order__createdAt: 'ASC',
      };

      mockRepository.find.mockResolvedValue([]);

      const result = await service.paginate(
        dto,
        mockRepository,
        {},
        'api/test',
      );

      expect(result).toEqual({
        data: [],
        cursor: { after: null },
        count: 0,
        next: null,
      });
    });

    it('should generate correct next URL for ASC order', async () => {
      const dto: BasePaginationDto = {
        take: 1,
        order__createdAt: 'ASC',
        where__id__more_than: 5,
      };

      const mockData = [
        createMockEntity({ id: 10, title: 'Test', content: 'Content' }),
      ];
      mockRepository.find.mockResolvedValue(mockData);

      const result: any = await service.paginate(
        dto,
        mockRepository,
        {},
        'api/test',
      );

      expect(result.next).toContain('where__id__more_than=10');
      expect(result.next).toContain('take=1');
      expect(result.next).toContain('order__createdAt=ASC');
    });

    it('should generate correct next URL for DESC order', async () => {
      const dto: BasePaginationDto = {
        take: 1,
        order__createdAt: 'DESC',
      };

      const mockData = [
        createMockEntity({ id: 10, title: 'Test', content: 'Content' }),
      ];
      mockRepository.find.mockResolvedValue(mockData);

      const result: any = await service.paginate(
        dto,
        mockRepository,
        {},
        'api/test',
      );

      expect(result.next).toContain('where__id__less_than=10');
    });

    it('should not generate next URL when results are less than take', async () => {
      const dto: BasePaginationDto = {
        take: 5,
        order__createdAt: 'ASC',
      };

      const mockData = [
        createMockEntity({ id: 1, title: 'Test', content: 'Content' }),
      ];
      mockRepository.find.mockResolvedValue(mockData);

      const result: any = await service.paginate(
        dto,
        mockRepository,
        {},
        'api/test',
      );

      expect(result.next).toBeNull();
    });
  });

  describe('Filter Parsing', () => {
    it('should parse where filters correctly', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'ASC',
      };

      // where__ 필터를 dto에 추가 (실제로는 런타임에 추가됨)
      (dto as any).where__title__like = 'test';
      (dto as any).where__id__more_than = 5;

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.paginate(dto, mockRepository, {}, '/api/test');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          title: expect.any(Object), // TypeORM Like operator
          id: expect.any(Object),    // TypeORM MoreThan operator
        }),
        order: { createdAt: 'ASC' },
        take: 10,
        skip: 0,
      });
    });

    it('should parse order filters correctly', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'DESC',
      };

      // order__ 필터를 dto에 추가
      (dto as any).order__title = 'ASC';

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.paginate(dto, mockRepository, {}, '/api/test');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: expect.objectContaining({
          createdAt: 'DESC',
          title: 'ASC',
        }),
        take: 10,
        skip: 0,
      });
    });

    it('should handle i_like filter correctly', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'ASC',
      };

      (dto as any).where__title__i_like = 'test';

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.paginate(dto, mockRepository, {}, '/api/test');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          title: expect.any(Object), // ILike('%test%')
        }),
        order: { createdAt: 'ASC' },
        take: 10,
        skip: 0,
      });
    });

    it('should throw BadRequestException for invalid filter format', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'ASC',
      };

      // 잘못된 형식의 필터 (너무 많은 __)
      (dto as any).where__title__like__invalid = 'test';

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await expect(
        service.paginate(dto, mockRepository, {}, '/api/test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle filters that do not start with where__ or order__', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'ASC',
      };

      // where__나 order__로 시작하지 않는 필터는 무시됨
      (dto as any).someOtherFilter = 'test';

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.paginate(dto, mockRepository, {}, '/api/test');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'ASC' },
        take: 10,
        skip: 0,
      });

      expect(result).toEqual({
        data: [],
        total: 0,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty where conditions', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'ASC',
      };

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.paginate(dto, mockRepository, {}, '/api/test');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'ASC' },
        take: 10,
        skip: 0,
      });
    });

    it('should handle default take value', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        order__createdAt: 'ASC',
        take: 20, // 기본값
      };

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.paginate(dto, mockRepository, {}, '/api/test');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'ASC' },
        take: 20,
        skip: 0,
      });
    });

    it('should handle complex filter combinations', async () => {
      const dto: BasePaginationDto = {
        page: 1,
        take: 10,
        order__createdAt: 'DESC',
      };

      (dto as any).where__title__like = 'test';
      (dto as any).where__id__more_than = 5;
      (dto as any).where__status = 'active';
      (dto as any).order__title = 'ASC';

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.paginate(dto, mockRepository, {}, '/api/test');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: expect.objectContaining({
          title: expect.any(Object),
          id: expect.any(Object),
          status: 'active',
        }),
        order: expect.objectContaining({
          createdAt: 'DESC',
          title: 'ASC',
        }),
        take: 10,
        skip: 0,
      });
    });
  });
});
