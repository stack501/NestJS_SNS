# Posts 모듈

## 개요
SNS 플랫폼의 게시물 관리를 담당하는 핵심 모듈입니다. 게시물의 생성, 조회, 수정, 삭제(CRUD) 기능과 함께 페이지네이션, 캐싱, 이미지 첨부, 댓글 관리 등의 고급 기능을 제공합니다.

## 아키텍처

### 구성요소

#### 모듈
- `posts.module.ts`: 모듈 정의 및 종속성 설정, TypeORM 엔티티 등록

#### 컨트롤러
- `posts.controller.ts`: REST API 엔드포인트 정의 및 HTTP 요청 처리

#### GraphQL 리졸버
- `posts.resolver.ts`: GraphQL 쿼리 및 뮤테이션 처리

#### 서비스
- `posts.service.ts`: 핵심 비즈니스 로직 구현
- `posts/image/images.service.ts`: 게시물 이미지 관리 서비스

#### 엔티티
- `posts.entity.ts`: 게시물 데이터 모델 정의

#### 가드
- `guard/is-post-mine-or-admin.guard.ts`: 게시물 소유권 및 관리자 권한 검증

## 주요 기능

### 1. 게시물 관리
- **생성**: 제목, 내용, 이미지를 포함한 게시물 생성
- **조회**: 단일/목록 조회, 페이지네이션 지원
- **수정**: 게시물 내용 업데이트 (소유자/관리자만)
- **삭제**: 게시물 제거 (관리자만)

### 2. 페이지네이션
- **페이지 기반**: 전통적인 페이지 번호 방식
- **커서 기반**: 무한 스크롤을 위한 효율적인 방식
- **필터링**: 팔로우 중인 사용자 게시물만 조회

### 3. 성능 최적화
- **Redis 캐싱**: 팔로우 피드 캐싱으로 조회 성능 향상
- **인덱싱**: 작성자 ID 기반 데이터베이스 인덱스
- **관계 최적화**: 필요한 관계만 선택적 로딩

### 4. 권한 관리
- **인증**: JWT 기반 사용자 인증
- **인가**: 게시물 소유권 및 역할 기반 권한 제어
- **레이트 리미팅**: API 호출 빈도 제한

## API 엔드포인트

### REST API

#### 게시물 조회
```http
GET /posts
```
- **설명**: 모든 게시물을 페이지네이션으로 조회
- **인증**: 불필요 (공개)
- **파라미터**: PaginatePostDto (페이지네이션 옵션)

#### 팔로우 피드 조회
```http
GET /posts/following
```
- **설명**: 팔로우 중인 사용자들의 게시물 조회
- **인증**: 필요
- **캐싱**: Redis를 통한 성능 최적화

#### 단일 게시물 조회
```http
GET /posts/:postId
```
- **설명**: 특정 ID의 게시물 조회
- **인증**: 불필요 (공개)

#### 게시물 생성
```http
POST /posts
```
- **설명**: 새 게시물 작성
- **인증**: 필요
- **트랜잭션**: 게시물 생성과 이미지 첨부를 원자적으로 처리

#### 게시물 수정
```http
PATCH /posts/:postId
```
- **설명**: 게시물 내용 수정
- **인증**: 필요 (소유자 또는 관리자)
- **가드**: IsPostMineOrAdminGuard

#### 게시물 삭제
```http
DELETE /posts/:postId
```
- **설명**: 게시물 삭제
- **인증**: 필요 (관리자만)
- **권한**: ADMIN 역할 필요

#### 테스트 데이터 생성
```http
POST /posts/random
```
- **설명**: 테스트용 게시물 100개 자동 생성
- **인증**: 필요
- **용도**: 개발/테스트 환경

### GraphQL API

#### 게시물 조회 쿼리
```graphql
query GetPost($id: Int!) {
  getPost(id: $id) {
    id
    title
    content
    author {
      id
      email
      nickname
    }
    likeCount
    commentCount
    createdAt
    updatedAt
  }
}
```

## 데이터 모델

### PostsModel 엔티티
```typescript
{
  id: number;              // 게시물 고유 ID
  title: string;           // 게시물 제목
  content: string;         // 게시물 내용
  authorId: number;        // 작성자 ID (인덱싱됨)
  author: UsersModel;      // 작성자 정보
  likeCount: number;       // 좋아요 수 (기본값: 0)
  commentCount: number;    // 댓글 수 (기본값: 0)
  images: ImageModel[];    // 첨부 이미지 목록
  comments: CommentsModel[]; // 댓글 목록
  createdAt: Date;         // 생성일시
  updatedAt: Date;         // 수정일시
}
```

## 사용 예시

### 기본 게시물 조회
```typescript
// 컨트롤러에서 서비스 사용
@Get()
async getPosts(@Query() query: PaginatePostDto) {
  return this.postsService.paginatePosts(query);
}
```

### 게시물 생성 (트랜잭션)
```typescript
@Post()
@UseInterceptors(TransactionInterceptor)
async createPost(
  @User('id') userId: number,
  @Body() body: CreatePostDto,
  @QueryRunnerDecorator() qr: QueryRunner,
) {
  const post = await this.postsService.createPost(userId, body, qr);
  
  // 이미지 첨부 처리
  for(let i = 0; i < body.images.length; i++) {
    await this.postsImagesService.createPostImage({
      post,
      order: i,
      path: body.images[i],
      type: ImageModelType.POST_IMAGE,
    }, qr);
  }
  
  return this.postsService.getPostById(post.id, qr);
}
```

### GraphQL 쿼리 예시
```typescript
// GraphQL 리졸버에서 서비스 호출
@Query(() => PostsModel, { nullable: true })
getPost(@Args('id', { type: () => Int }) id: number): Promise<PostsModel | null> {
  return this.postsService.getPostById(id);
}
```

### 페이지네이션 사용
```typescript
// 커서 기반 페이지네이션
const paginationDto: PaginatePostDto = {
  take: 10,
  order__createdAt: 'DESC',
  where__id__less_than: lastPostId
};

const result = await postsService.paginatePosts(paginationDto);
```

## 의존성

### 내부 모듈
- `AuthModule`: 사용자 인증
- `UsersModule`: 사용자 관리
- `CommonModule`: 공통 유틸리티
- `RedisModule`: 캐싱 서비스

### 외부 라이브러리
- `@nestjs/typeorm`: ORM 지원
- `@nestjs/graphql`: GraphQL 통합
- `class-validator`: 데이터 유효성 검사
- `class-transformer`: 데이터 변환

## 보안 고려사항

1. **권한 검증**: 게시물 수정/삭제 시 소유권 확인
2. **입력 검증**: DTO를 통한 데이터 유효성 검사
3. **레이트 리미팅**: API 남용 방지
4. **트랜잭션**: 데이터 일관성 보장
5. **캐시 무효화**: 사용자별 피드 캐시 적절한 갱신

## 성능 특징

- **인덱싱**: authorId 필드에 대한 데이터베이스 인덱스
- **캐싱**: Redis를 통한 팔로우 피드 캐싱
- **페이지네이션**: 대용량 데이터 효율적 처리
- **관계 로딩**: 필요시에만 관련 데이터 로드
- **카운트 최적화**: 좋아요/댓글 수 증감 연산 최적화
