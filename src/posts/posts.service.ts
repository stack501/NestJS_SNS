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

type PostsResult =
  | { data: PostsModel[]; total: number }
  | { data: PostsModel[]; cursor: { after: number | null }; count: number; next: string | null };

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
  async getAllPosts() {
    return this.postsRepository.find();
  }

  async generatePosts(userId: number) {
    for(let i = 0; i < 100; i++) {
      await this.createPost(userId, {
        title: `임의로 생성된 포스트 제목 ${i}`,
        content: `임의로 생성된 포스트 내용 ${i}`,
        images: [],
      });
    }
  }

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

  getRepository(qr?: QueryRunner) {
    return qr ? qr.manager.getRepository<PostsModel>(PostsModel) : this.postsRepository;
  }

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

  async checkPostExistsById(id: number) {
    return await this.postsRepository.exists({
      where: {
        id,
      },
    });
  }

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
