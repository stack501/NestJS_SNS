# Common 모듈

## 개요
애플리케이션 전반에서 사용되는 공통 기능을 제공하는 모듈입니다. 페이지네이션, 파일 업로드, 필터링 등의 공통 유틸리티를 포함합니다.

## 구성요소

### 모듈
- `common.module.ts`: 모듈 정의, MulterModule 설정, 종속성 관리

### 컨트롤러
- `common.controller.ts`: 이미지 업로드 API 엔드포인트

### 서비스
- `common.service.ts`: 페이지네이션 및 필터링 비즈니스 로직

### DTO
- `dto/base-pagination.dto`: 페이지네이션 기본 DTO

### 엔티티
- `entity/base.entity`: 기본 엔티티 클래스

### 상수
- `const/filter-mapper.const`: 필터 매핑 상수
- `const/path.const`: 파일 경로 상수

## 주요 기능

### 1. 페이지네이션
두 가지 페이지네이션 방식을 지원합니다:

#### 페이지 번호 기반 페이지네이션
- `page` 파라미터 사용
- 전체 개수와 함께 결과 반환

#### 커서 기반 페이지네이션
- ID 기반 커서 사용
- 다음 페이지 URL 자동 생성
- 무한 스크롤 구현에 적합

### 2. 동적 필터링
URL 쿼리 파라미터를 통한 동적 필터링을 지원합니다:

- `where__필드명`: 정확한 값 매칭
- `where__필드명__연산자`: 특정 연산자 사용
- `order__필드명`: 정렬 옵션

지원하는 연산자:
- `i_like`: 대소문자 구분 없는 부분 일치
- `more_than`: 초과
- `less_than`: 미만
- 기타 TypeORM 지원 연산자

### 3. 이미지 업로드
Multer를 사용한 이미지 파일 업로드 기능:

- 지원 형식: JPG, JPEG, PNG
- 파일 크기 제한: 10MB
- UUID 기반 파일명 생성
- 임시 폴더에 저장

## 사용 예시

### 페이지네이션 사용

```typescript
// 서비스에서 페이지네이션 사용
@Injectable()
export class PostsService {
  constructor(
    private readonly commonService: CommonService,
    @InjectRepository(PostsModel)
    private readonly postsRepository: Repository<PostsModel>,
  ) {}

  async getPosts(dto: BasePaginationDto) {
    return this.commonService.paginate(
      dto,
      this.postsRepository,
      {},
      'posts',
    );
  }
}
```

### 컨트롤러에서 페이지네이션 적용

```typescript
@Controller('posts')
export class PostsController {
  @Get()
  getPosts(@Query() dto: BasePaginationDto) {
    return this.postsService.getPosts(dto);
  }
}
```

### 이미지 업로드

```typescript
// 클라이언트에서 FormData 사용
const formData = new FormData();
formData.append('image', file);

fetch('/common/image', {
  method: 'POST',
  body: formData,
});
```

### 필터링 쿼리 예시

```
// 제목에 "hello"가 포함된 게시물 검색
GET /posts?where__title__i_like=hello

// ID가 10보다 큰 게시물
GET /posts?where__id__more_than=10

// 생성일 기준 내림차순 정렬
GET /posts?order__createdAt=DESC

// 페이지 기반 페이지네이션 (2페이지, 페이지당 5개)
GET /posts?page=2&take=5

// 커서 기반 페이지네이션 (ID 10 이후 5개)
GET /posts?where__id__more_than=10&take=5
```

## 설정

### 환경 변수
- `HTTP_PROTOCOL`: HTTP 프로토콜 (http/https)
- `HTTP_HOST`: 호스트 주소

### 파일 업로드 설정
- 임시 폴더: `TEMP_FOLDER_PATH` 상수에 정의
- 허용 파일 크기: 10MB
- 허용 확장자: .jpg, .jpeg, .png

## 의존성
- `@nestjs/common`
- `@nestjs/platform-express`
- `@nestjs/config`
- `typeorm`
- `multer`
- `uuid`

## 타입 안정성
모든 메서드는 제네릭 타입을 사용하여 타입 안정성을 보장합니다:
- `T extends BaseModel`: 엔티티 타입
- `R`: 반환 타입

이를 통해 컴파일 타임에 타입 오류를 방지할 수 있습니다.
