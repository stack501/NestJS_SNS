import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, LessThan, MoreThan, QueryRunner, Repository } from 'typeorm';
import { PostsModel } from './entity/posts.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { CommonService } from 'src/common/common.service';
import { ImageModel } from 'src/common/entity/image.entity';
import { DEFAULT_POST_FIND_OPTIONS } from './const/default-post-find-options.const';
import { ConfigType } from '@nestjs/config';
import appConfig from 'src/configs/app.config';
import { RedisService } from 'src/redis/redis.service';
import { UsersService } from 'src/users/users.service';
import { REDIS_KEYS_MAPPER } from 'src/redis/redis.keys-mapper';

/**
 * 게시물 데이터 응답 타입
 */
type PostsResult =
  | { data: PostsModel[]; total: number }
  | { data: PostsModel[]; cursor: { after: number | null }; count: number; next: string | null };

/**
 * 게시물 데이터 관리 서비스
 * 
 * 게시물의 생성, 조회, 수정, 삭제 기능과 관련 비즈니스 로직을 처리합니다.
 * 페이지네이션, 캐싱, 사용자 인증 등의 기능을 포함합니다.
 */
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostsModel)
    private readonly postsRepository: Repository<PostsModel>,
    @InjectRepository(ImageModel)
    private readonly imageRepository: Repository<ImageModel>,
    private readonly commonServices: CommonService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * 모든 게시물을 조회합니다.
   * 
   * @returns {Promise<PostsModel[]>} 모든 게시물 목록
   */
  async getAllPosts() {
    return this.postsRepository.find();
  }

  /**
   * 테스트용 게시물을 다량 생성합니다.
   * 
   * @param {number} userId - 게시물을 생성할 사용자 ID
   * @returns {Promise<void>}
   */
  async generatePosts(userId: number) {
    for(let i = 0; i < 100; i++) {
      await this.createPost(userId, {
        title: `임의로 생성된 포스트 제목 ${i}`,
        content: `임의로 생성된 포스트 내용 ${i}`,
        images: [],
      });
    }
  }

  /**
   * DTO 기반으로 게시물을 페이지네이션하여 조회합니다.
   * 팔로우 중인 사용자 게시물만 조회하는 기능을 지원합니다.
   * 
   * @param {PaginatePostDto} dto - 페이지네이션 옵션
   * @param {FindOptionsWhere<PostsModel>} additionalWhere - 추가 필터 조건
   * @param {number} userId - 요청 사용자 ID (팔로우 필터링용)
   * @returns {Promise<PostsResult>} 페이지네이션된 게시물 결과
   */
  async paginatePosts(
    dto: PaginatePostDto,
    additionalWhere?: FindOptionsWhere<PostsModel>,
    userId?: number
  ): Promise<PostsResult> {
    if (!dto.isOnlyFollowingPosts || userId == null) {
      return this.commonServices.paginate<PostsModel, PostsResult>(
        dto,
        this.postsRepository,
        { ...DEFAULT_POST_FIND_OPTIONS },
        'posts',
        additionalWhere,
      );
    }

    const cacheKey = REDIS_KEYS_MAPPER.followingPosts(userId);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached as PostsResult;
    }
    const result = await this.commonServices.paginate<PostsModel, PostsResult>(
      dto,
      this.postsRepository,
      { ...DEFAULT_POST_FIND_OPTIONS },
      'posts',
      additionalWhere,
    );
    await this.redisService.set(cacheKey, result, 60000);
    return result;
  }

  /**
   * 페이지 기반 게시물 페이지네이션을 수행합니다.
   * 
   * @param {PaginatePostDto} dto - 페이지네이션 옵션
   * @returns {Promise<{data: PostsModel[], total: number}>} 페이징된 게시물과 총 개수
   */
  async pagePaginatePosts(dto: PaginatePostDto) {
    /**
     * data: Data[],
     * total: number,
     * 
     * [1] [2] [3] [4]
    */
    const [posts, count] = await this.postsRepository.findAndCount({
      skip: dto.take * ((dto.page ?? 1) - 1),
      take: dto.take,
      order: {
        createdAt: dto.order__createdAt,
      }
    });

    return {
      data: posts,
      total: count,
    }
  }

  /**
   * 커서 기반 게시물 페이지네이션을 수행합니다.
   * 
   * @param {PaginatePostDto} dto - 페이지네이션 옵션
   * @returns {Promise<{data: PostsModel[], cursor: {after: number | null}, count: number, next: string | null}>} 커서 페이징 결과
   */
  async cursorPaginatePosts(dto: PaginatePostDto) {
    const where: FindOptionsWhere<PostsModel> = {}

    if(dto.where__id__less_than) {
      where.id = LessThan(dto.where__id__less_than);
    } else if(dto.where__id__more_than) {
      where.id = MoreThan(dto.where__id__more_than);
    }

    const posts = await this.postsRepository.find({
      where,
      order:{
        createdAt: dto.order__createdAt,
      },
      take: dto.take,
    });

    /**
     * 해당되는 포스트가 0개 이상이면
     * 마지막 포스트를 가져오고
     * 아니면 null을 반환한다.
     */
    const lastItem = posts.length > 0 && posts.length === dto.take ? posts[posts.length - 1] : null;

    const protocol = this.config.http.protocol
    const host = this.config.http.host;

    const nextURL = lastItem && new URL(`${protocol}://${host}/posts`);

    if(nextURL) {
      for(const key of Object.keys(dto)) {
         if(dto[key]) {
          if(key !== 'where__id__more_than' && key !== 'where__id__less_than') {
            nextURL.searchParams.append(key, dto[key]);
          } 
         }
      }

      let key: string | null = null;

      if(dto.order__createdAt === 'ASC') {
        key = 'where__id__more_than';
      } else {
        key = 'where__id__less_than';
      }

      nextURL.searchParams.append(key, lastItem.id.toString());
    }

    /**
     * Response
     * 
     * data: Data[],
     * cursor: {
     *  after: 마지막 Data의 ID
     * },
     * count: 응답한 데이터의 개수,
     * next: 다음 요청에 사용할 URL
     */

    return {
      data: posts,
      cursor: {
        after: lastItem?.id ?? null,
      },
      count: posts.length,
      next: nextURL?.toString() ?? null,
    }
  }

  /**
   * 특정 ID의 게시물을 조회합니다.
   * 
   * @param {number} id - 조회할 게시물 ID
   * @param {QueryRunner} qr - 선택적 QueryRunner (트랜잭션 처리용)
   * @returns {Promise<PostsModel>} 조회된 게시물
   * @throws {NotFoundException} 게시물이 존재하지 않을 경우
   */
  async getPostById(id: number, qr?: QueryRunner) {
    const repository = this.getRepository(qr);
    
    const post = await repository.findOne({
      where: {
        id,
      },
      relations: ['author'],
    });

    if (!post) {
      throw new NotFoundException();
    }

    return post;
  }

  /**
   * QueryRunner 유무에 따라 적절한 Repository를 반환합니다.
   * 
   * @param {QueryRunner} qr - 선택적 QueryRunner
   * @returns {Repository<PostsModel>} 게시물 Repository
   */
  getRepository(qr?: QueryRunner) {
    return qr ? qr.manager.getRepository<PostsModel>(PostsModel) : this.postsRepository;
  }

  /**
   * 특정 게시물의 카운트 필드를 증가시킵니다.
   * 
   * @param {number} postId - 대상 게시물 ID
   * @param {keyof Pick<PostsModel, 'commentCount'>} fieldName - 증가시킬 필드명
   * @param {number} incrementCount - 증가시킬 값
   * @param {QueryRunner} qr - 선택적 QueryRunner (트랜잭션 처리용)
   * @returns {Promise<void>}
   */
  async incrementFollowerCount(
    postId: number,
    fieldName: keyof Pick<PostsModel, 'commentCount'>,
    incrementCount: number,
    qr?: QueryRunner,
  ) {
    const repository = this.getRepository(qr);

    await repository.increment(
      {
        id: postId,
      },
      fieldName,
      incrementCount,
    );
  }

  /**
   * 특정 게시물의 카운트 필드를 감소시킵니다.
   * 
   * @param {number} postId - 대상 게시물 ID
   * @param {keyof Pick<PostsModel, 'commentCount'>} fieldName - 감소시킬 필드명
   * @param {number} decrementCount - 감소시킬 값
   * @param {QueryRunner} qr - 선택적 QueryRunner (트랜잭션 처리용)
   * @returns {Promise<void>}
   */
  async decrementFollowerCount(
    postId: number,
    fieldName: keyof Pick<PostsModel, 'commentCount'>,
    decrementCount: number,
    qr?: QueryRunner,
  ) {
    const repository = this.getRepository(qr);

    await repository.decrement(
      {
        id: postId,
      },
      fieldName,
      decrementCount,
    );
  }

  /**
   * 새 게시물을 생성합니다.
   * 게시물이 생성되면 작성자의 팔로워들의 캐시를 갱신합니다.
   * 
   * @param {number} authorId - 작성자 ID
   * @param {CreatePostDto} postDTO - 게시물 생성 DTO
   * @param {QueryRunner} qr - 선택적 QueryRunner (트랜잭션 처리용)
   * @returns {Promise<PostsModel>} 생성된 게시물
   */
  async createPost(authorId: number, postDTO: CreatePostDto, qr?: QueryRunner) {
    // 1) create -> 저장할 객체를 생성한다.
    // 2) save -> 객체를 저장한다 (create 메서드로 생성한 객체로)
    const repository = this.getRepository(qr);

    const post = repository.create({
      author: {
        id: authorId,
      },
      ...postDTO,
      images: [],
      likeCount: 0,
      commentCount: 0,
    });

    const newPost = await repository.save(post);

    const followers = await this.usersService.getFollowers(authorId, false);
    for (const follower of followers) {
      const cacheKey = REDIS_KEYS_MAPPER.followingPosts(follower.id);
      await this.redisService.delByPattern(cacheKey);
    }
    
    return newPost;
  }

  /**
   * 기존 게시물을 업데이트합니다.
   * 
   * @param {number} id - 업데이트할 게시물 ID
   * @param {UpdatePostDto} postDto - 게시물 업데이트 DTO
   * @returns {Promise<PostsModel>} 업데이트된 게시물
   * @throws {NotFoundException} 게시물이 존재하지 않을 경우
   */
  async updatePost(
    id: number,
    postDto: UpdatePostDto,
  ) {
    const { title, content } = postDto;
    // save의 기능
    // 1) 만약에 데이터가 존재하지 않는다면 (id 기준으로) 새로 생성한다.
    // 2) 만약에 데이터가 존재한다면 (같은 id의 값이 존재한다면) 존재하던 값을 업데이트한다/

    const post = await this.postsRepository.findOne({
      where: {
        id,
      },
    });

    if (!post) {
      throw new NotFoundException();
    }

    if (title) {
      post.title = title;
    }

    if (content) {
      post.content = content;
    }

    const newPost = await this.postsRepository.save(post);

    return newPost;
  }

  /**
   * 게시물을 삭제합니다.
   * 
   * @param {number} id - 삭제할 게시물 ID
   * @returns {Promise<number>} 삭제된 게시물 ID
   * @throws {NotFoundException} 게시물이 존재하지 않을 경우
   */
  async deletePost(id: number) {
    const post = await this.postsRepository.findOne({
      where: {
        id,
      },
    });

    if (!post) {
      throw new NotFoundException();
    }

    await this.postsRepository.delete(id);

    return id;
  }

  /**
   * 게시물 ID로 존재 여부를 확인합니다.
   * 
   * @param {number} id - 확인할 게시물 ID
   * @returns {Promise<boolean>} 존재 여부
   */
  async checkPostExistsById(id: number) {
    return await this.postsRepository.exists({
      where: {
        id,
      },
    });
  }

  /**
   * 특정 게시물이 요청 사용자의 것인지 확인합니다.
   * 
   * @param {number} userId - 사용자 ID
   * @param {number} postId - 게시물 ID
   * @returns {Promise<boolean>} 소유 여부
   */
  async isPostMine(userId: number, postId: number) {
    return await this.postsRepository.exists({
      where: {
        id: postId,
        author: {
          id: userId,
        }
      },
      relations: {
        author: true,
      }
    });
  }
}
