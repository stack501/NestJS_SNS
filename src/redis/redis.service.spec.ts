import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { KEYV_TOKEN } from './redis.constants';

describe('RedisService', () => {
  let service: RedisService;
  let mockKeyv: any;

  beforeEach(async () => {
    // Mock Keyv 인스턴스
    mockKeyv = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      store: {
        redis: {
          smembers: jest.fn(),
          del: jest.fn(),
          srem: jest.fn(),
        },
        _getNamespace: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: KEYV_TOKEN,
          useValue: mockKeyv,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('정의 테스트', () => {
    it('서비스가 정의되어야 합니다', () => {
      expect(service).toBeDefined();
    });
  });

  describe('get', () => {
    it('키로 데이터를 조회해야 합니다', async () => {
      const testKey = 'test:key';
      const testValue = { data: 'test data' };
      mockKeyv.get.mockResolvedValue(testValue);

      const result = await service.get(testKey);

      expect(mockKeyv.get).toHaveBeenCalledWith(testKey);
      expect(result).toEqual(testValue);
    });

    it('존재하지 않는 키에 대해 undefined를 반환해야 합니다', async () => {
      const testKey = 'nonexistent:key';
      mockKeyv.get.mockResolvedValue(undefined);

      const result = await service.get(testKey);

      expect(mockKeyv.get).toHaveBeenCalledWith(testKey);
      expect(result).toBeUndefined();
    });

    it('다양한 타입의 데이터를 조회할 수 있어야 합니다', async () => {
      const testCases = [
        { key: 'string:key', value: 'test string' },
        { key: 'number:key', value: 123 },
        { key: 'boolean:key', value: true },
        { key: 'array:key', value: [1, 2, 3] },
        { key: 'object:key', value: { name: 'test', age: 30 } },
      ];

      for (const testCase of testCases) {
        mockKeyv.get.mockResolvedValue(testCase.value);
        const result = await service.get(testCase.key);
        expect(result).toEqual(testCase.value);
      }
    });
  });

  describe('set', () => {
    it('키-값 쌍을 저장해야 합니다', async () => {
      const testKey = 'test:key';
      const testValue = { data: 'test data' };
      mockKeyv.set.mockResolvedValue(true);

      await service.set(testKey, testValue);

      expect(mockKeyv.set).toHaveBeenCalledWith(testKey, testValue, undefined);
    });

    it('TTL과 함께 키-값 쌍을 저장해야 합니다', async () => {
      const testKey = 'test:key';
      const testValue = { data: 'test data' };
      const ttl = 5000; // 5초
      mockKeyv.set.mockResolvedValue(true);

      await service.set(testKey, testValue, ttl);

      expect(mockKeyv.set).toHaveBeenCalledWith(testKey, testValue, ttl);
    });

    it('다양한 타입의 데이터를 저장할 수 있어야 합니다', async () => {
      const testCases = [
        { key: 'string:key', value: 'test string' },
        { key: 'number:key', value: 123 },
        { key: 'boolean:key', value: true },
        { key: 'array:key', value: [1, 2, 3] },
        { key: 'object:key', value: { name: 'test', age: 30 } },
      ];

      mockKeyv.set.mockResolvedValue(true);

      for (const testCase of testCases) {
        await service.set(testCase.key, testCase.value);
        expect(mockKeyv.set).toHaveBeenCalledWith(testCase.key, testCase.value, undefined);
      }
    });
  });

  describe('del', () => {
    it('키에 해당하는 데이터를 삭제해야 합니다', async () => {
      const testKey = 'test:key';
      mockKeyv.delete.mockResolvedValue(true);

      await service.del(testKey);

      expect(mockKeyv.delete).toHaveBeenCalledWith(testKey);
    });

    it('여러 키를 개별적으로 삭제할 수 있어야 합니다', async () => {
      const testKeys = ['key1', 'key2', 'key3'];
      mockKeyv.delete.mockResolvedValue(true);

      for (const key of testKeys) {
        await service.del(key);
        expect(mockKeyv.delete).toHaveBeenCalledWith(key);
      }

      expect(mockKeyv.delete).toHaveBeenCalledTimes(testKeys.length);
    });
  });

  describe('delByPattern', () => {
    it('패턴에 일치하는 키들을 삭제해야 합니다', async () => {
      const pattern = 'user:';
      const namespaceSet = 'keyv:set';
      const allKeys = ['keyv:user:1', 'keyv:user:2', 'keyv:post:1', 'keyv:comment:1'];
      const matchedKeys = ['keyv:user:1', 'keyv:user:2'];

      const mockRedis = mockKeyv.store.redis;
      const mockStore = mockKeyv.store;
      
      mockStore._getNamespace.mockReturnValue(namespaceSet);
      mockRedis.smembers.mockResolvedValue(allKeys);
      mockRedis.del.mockResolvedValue(2);
      mockRedis.srem.mockResolvedValue(2);

      await service.delByPattern(pattern);

      expect(mockRedis.smembers).toHaveBeenCalledWith(namespaceSet);
      expect(mockRedis.del).toHaveBeenCalledWith(...matchedKeys);
      expect(mockRedis.srem).toHaveBeenCalledWith(namespaceSet, ...matchedKeys);
    });

    it('일치하는 키가 없으면 삭제 작업을 수행하지 않아야 합니다', async () => {
      const pattern = 'nonexistent:';
      const namespaceSet = 'keyv:set';
      const allKeys = ['keyv:user:1', 'keyv:post:1'];

      const mockRedis = mockKeyv.store.redis;
      const mockStore = mockKeyv.store;
      
      mockStore._getNamespace.mockReturnValue(namespaceSet);
      mockRedis.smembers.mockResolvedValue(allKeys);

      await service.delByPattern(pattern);

      expect(mockRedis.smembers).toHaveBeenCalledWith(namespaceSet);
      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(mockRedis.srem).not.toHaveBeenCalled();
    });

    it('빈 키 목록에 대해서도 안전하게 처리해야 합니다', async () => {
      const pattern = 'test:';
      const namespaceSet = 'keyv:set';
      const allKeys: string[] = [];

      const mockRedis = mockKeyv.store.redis;
      const mockStore = mockKeyv.store;
      
      mockStore._getNamespace.mockReturnValue(namespaceSet);
      mockRedis.smembers.mockResolvedValue(allKeys);

      await service.delByPattern(pattern);

      expect(mockRedis.smembers).toHaveBeenCalledWith(namespaceSet);
      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(mockRedis.srem).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('모든 키-값 쌍을 삭제해야 합니다', async () => {
      mockKeyv.clear.mockResolvedValue(undefined);

      await service.clear();

      expect(mockKeyv.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('통합 테스트', () => {
    it('set -> get -> del 시나리오가 정상 작동해야 합니다', async () => {
      const testKey = 'integration:test';
      const testValue = { message: 'integration test data' };

      // Set
      mockKeyv.set.mockResolvedValue(true);
      await service.set(testKey, testValue);
      expect(mockKeyv.set).toHaveBeenCalledWith(testKey, testValue, undefined);

      // Get
      mockKeyv.get.mockResolvedValue(testValue);
      const retrievedValue = await service.get(testKey);
      expect(retrievedValue).toEqual(testValue);

      // Delete
      mockKeyv.delete.mockResolvedValue(true);
      await service.del(testKey);
      expect(mockKeyv.delete).toHaveBeenCalledWith(testKey);
    });

    it('TTL이 있는 데이터 저장 및 조회가 정상 작동해야 합니다', async () => {
      const testKey = 'ttl:test';
      const testValue = 'temporary data';
      const ttl = 1000; // 1초

      mockKeyv.set.mockResolvedValue(true);
      await service.set(testKey, testValue, ttl);
      expect(mockKeyv.set).toHaveBeenCalledWith(testKey, testValue, ttl);

      mockKeyv.get.mockResolvedValue(testValue);
      const result = await service.get(testKey);
      expect(result).toEqual(testValue);
    });
  });
});
