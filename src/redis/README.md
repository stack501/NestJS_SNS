# Redis 모듈

## 개요
NestJS 애플리케이션에서 Redis 캐싱 기능을 제공하는 글로벌 모듈입니다. Keyv와 ioredis를 활용하여 효율적인 키-값 저장소 기능을 구현합니다.

## 구성요소

### 모듈
- `redis.module.ts`: Redis 모듈 정의 및 의존성 주입 설정
  - IORedis 클라이언트 프로바이더
  - Keyv 인스턴스 프로바이더
  - 글로벌 모듈로 설정되어 전역에서 사용 가능

### 서비스
- `redis.service.ts`: Redis 캐싱 비즈니스 로직 구현
  - 기본 CRUD 연산 (get, set, del)
  - 패턴 기반 키 삭제
  - 전체 캐시 삭제

### 상수 및 유틸리티
- `redis.constants.ts`: 의존성 주입 토큰 정의
- `redis.keys-mapper.ts`: Redis 키 생성 헬퍼 함수

## 주요 기능

### 1. 기본 캐시 연산
- **get**: 키로 데이터 조회
- **set**: 키-값 쌍 저장 (TTL 지원)
- **del**: 특정 키 삭제
- **clear**: 모든 키 삭제

### 2. 고급 기능
- **delByPattern**: 패턴 매칭으로 여러 키 일괄 삭제
- **TTL 지원**: 만료 시간 설정 가능
- **타입 안전성**: 제네릭을 통한 타입 지원

### 3. 키 관리
- 구조화된 키 패턴 관리
- 네임스페이스 기반 키 조직화

## 설정

### 환경 변수
```typescript
// config에서 다음 값들이 필요합니다:
app.redis.host: string  // Redis 서버 호스트
app.redis.port: number  // Redis 서버 포트
```

### 기본 TTL
- 기본 TTL: 60초 (60,000ms)
- 개별 set 연산에서 TTL 오버라이드 가능

## 사용 예시

### 기본 사용법
```typescript
import { RedisService } from './redis/redis.service';

@Injectable()
export class SomeService {
  constructor(private readonly redisService: RedisService) {}

  async cacheUserData(userId: number, userData: any) {
    // 1시간 캐시 (3600초)
    await this.redisService.set(`user:${userId}`, userData, 3600000);
  }

  async getUserData(userId: number) {
    return await this.redisService.get(`user:${userId}`);
  }

  async deleteUserCache(userId: number) {
    await this.redisService.del(`user:${userId}`);
  }
}
```

### 키 매퍼 활용
```typescript
import { REDIS_KEYS_MAPPER } from './redis/redis.keys-mapper';

@Injectable()
export class PostService {
  constructor(private readonly redisService: RedisService) {}

  async cacheFollowingPosts(userId: number, posts: any[]) {
    const key = REDIS_KEYS_MAPPER.followingPosts(userId);
    await this.redisService.set(key, posts, 300000); // 5분 캐시
  }

  async getFollowingPosts(userId: number) {
    const key = REDIS_KEYS_MAPPER.followingPosts(userId);
    return await this.redisService.get(key);
  }
}
```

### 패턴 기반 삭제
```typescript
// 특정 사용자의 모든 캐시 삭제
await this.redisService.delByPattern(`user:${userId}`);

// 모든 following-posts 캐시 삭제
await this.redisService.delByPattern('following-posts/');
```

### 타입 안전 사용
```typescript
interface UserProfile {
  id: number;
  name: string;
  email: string;
}

// 타입 안전한 캐시 저장/조회
await this.redisService.set<UserProfile>('user:123', userProfile);
const profile = await this.redisService.get<UserProfile>('user:123');
```

## 아키텍처

```
RedisModule (Global)
├── IORedis Client (단일 인스턴스)
├── Keyv Instance (IORedis 클라이언트 재사용)
└── RedisService (비즈니스 로직)
```

## 의존성
- `ioredis`: Redis 클라이언트
- `keyv`: 키-값 저장소 추상화 레이어
- `keyv-redis`: Keyv용 Redis 어댑터
- `@nestjs/config`: 설정 관리

## 주의사항
- 글로벌 모듈로 설정되어 있어 import 없이 어디서든 사용 가능
- Redis 서버 연결 정보는 ConfigService를 통해 주입
- 패턴 삭제 시 네임스페이스를 고려하여 안전하게 삭제 수행
