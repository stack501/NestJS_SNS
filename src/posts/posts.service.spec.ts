import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';  // ← 추가
import { PostsService } from './posts.service';
import { PostsModel } from './entity/posts.entity';
import { ImageModel } from '../common/entity/image.entity';
import { CommonService } from '../common/common.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import appConfig from 'src/configs/app.config';

describe('PostsService', () => {
  let service: PostsService;
  let module: TestingModule;   // ← 밖에서 선언

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getRepositoryToken(PostsModel),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
              getMany: jest.fn().mockResolvedValue([]),
              getOne: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(ImageModel),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: CommonService,
          useValue: {
            paginate: jest.fn(),
            uploadFile: jest.fn(),
            generateFileName: jest.fn(),
            validateCursor: jest.fn(),
          },
        },
        {
          provide: appConfig.KEY,
          useValue: {
            host: 'localhost',
            port: 3000,
            env: 'test',
            http: {
              protocol: 'http',   // PostsService에서 protocol, host를 참조하므로 추가
              host: 'localhost',
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            expire: jest.fn(),
            hget: jest.fn(),
            hset: jest.fn(),
            delByPattern: jest.fn(), // createPost 시 사용하므로 바인딩
          },
        },
        {
          provide: UsersService,
          useValue: {
            findUserById: jest.fn(),
            getUsersById: jest.fn(),
            createUser: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            getFollowers: jest.fn(),  // createPost에서 호출되도록 mock 추가
          },
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPostById', () => {
    it('존재하는 postId인 경우, 레포지토리 findOne 결과를 반환해야 한다', async () => {
      // 1) findOne이 항상 특정 객체를 반환하도록 mock 설정
      const fakePost = { id: 1, title: '제목', content: '내용', author: { id: 1 } };
      const postsRepo = module.get(getRepositoryToken(PostsModel));
      (postsRepo.findOne as jest.Mock).mockResolvedValue(fakePost);

      // 2) 실제 메서드 호출
      const result = await service.getPostById(1);

      // 3) findOne이 id 기준으로 호출됐는지 확인
      expect(postsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['author'],
      });
      // 4) 반환값 검증
      expect(result).toBe(fakePost);
    });

    it('존재하지 않는 postId인 경우, NotFoundException을 던져야 한다', async () => {
      // findOne이 null 또는 undefined를 반환하도록 mock
      const postsRepo = module.get(getRepositoryToken(PostsModel));
      (postsRepo.findOne as jest.Mock).mockResolvedValue(null);

      // getPostById를 호출했을 때 예외가 발생해야 함
      await expect(service.getPostById(999)).rejects.toThrow(NotFoundException);
    });
  });
});