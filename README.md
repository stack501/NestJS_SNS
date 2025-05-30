# NestJS SNS 플랫폼

실시간 채팅, 소셜 인증, 파일 업로드, 포괄적인 캐싱 기능을 갖춘 NestJS 기반 완전한 소셜 미디어 플랫폼입니다.

## 🚀 주요 기능

### 핵심 기능
- **사용자 관리**: 이메일/비밀번호 및 OAuth (Google, Kakao) 인증
- **소셜 네트워크**: 승인 워크플로우가 있는 팔로우/언팔로우 시스템
- **게시물 & 미디어**: 이미지 첨부 및 페이지네이션 지원으로 게시물 작성
- **실시간 채팅**: WebSocket 기반 메시징 및 귓속말 기능
- **GraphQL & REST**: 유연한 클라이언트 통합을 위한 이중 API 지원

### 고급 기능
- **Redis 캐싱**: 지능적인 캐시 관리로 성능 최적화
- **파일 업로드**: 검증 기능이 있는 안전한 이미지 업로드
- **역할 기반 접근**: 관리자 및 사용자 역할 관리
- **트랜잭션 지원**: 데이터베이스 트랜잭션으로 데이터 일관성 보장
- **페이지네이션**: 커서 기반 및 페이지 기반 페이지네이션 모두 지원

## 🏗️ 아키텍처

### 전체 시스템 구조
```
NestJS SNS 플랫폼
│
├── 🔐 Auth 모듈 (인증)
│   ├── JWT 토큰 관리
│   ├── OAuth 2.0 (Google, Kakao)
│   └── 비밀번호 인증
│
├── 👥 Users 모듈 (사용자)
│   ├── 사용자 CRUD
│   ├── 팔로우/언팔로우 시스템
│   └── 역할 기반 접근 제어
│
├── 📝 Posts 모듈 (게시물)
│   ├── 게시물 CRUD
│   ├── 이미지 업로드
│   ├── GraphQL & REST API
│   └── Redis 캐싱
│
├── 💬 Chats 모듈 (채팅)
│   ├── WebSocket 실시간 통신
│   ├── 그룹 채팅
│   └── 귓속말 메시징
│
├── 🔧 Common 모듈 (공통)
│   ├── 페이지네이션
│   ├── 파일 업로드
│   └── 유틸리티 함수
│
└── ⚡ Redis 모듈 (캐싱)
    ├── 성능 최적화
    ├── 캐시 관리
    └── TTL 설정
```

### 레이어 아키텍처
```
📱 클라이언트 레이어
   │
   ├── React/Vue/Angular
   ├── Mobile Apps
   └── API 클라이언트
   │
📡 API 게이트웨이 레이어
   │
   ├── REST API 엔드포인트
   ├── GraphQL 스키마 & 리졸버
   ├── WebSocket 게이트웨이
   └── 파일 업로드 핸들러
   │
🛡️ 미들웨어 & 가드 레이어
   │
   ├── JWT 인증 가드
   ├── 역할 기반 가드
   ├── 입력 검증 파이프
   └── 예외 필터
   │
🔄 비즈니스 로직 레이어
   │
   ├── Auth Service
   ├── Users Service  
   ├── Posts Service
   ├── Chats Service
   └── Common Service
   │
💾 데이터 액세스 레이어
   │
   ├── TypeORM Repository
   ├── Redis Service
   └── 파일 시스템
   │
🗄️ 저장소 레이어
   │
   ├── PostgreSQL 데이터베이스
   ├── Redis 캐시 서버
   └── 파일 저장소
```

### 모듈 간 의존성
```
Auth Module
   │
   └── Users Module
       │
       ├── Posts Module
       │   └── Redis Module
       │
       └── Chats Module
           └── Common Module
               └── Redis Module
```

### 데이터 플로우
```
요청 흐름:
클라이언트 → 컨트롤러/게이트웨이 → 가드/미들웨어 → 서비스 → Repository → 데이터베이스

응답 흐름:
데이터베이스 → Repository → 서비스 → 인터셉터 → 클라이언트

캐시 흐름:
서비스 → Redis 확인 → 캐시 히트 시 반환 / 미스 시 DB 조회 → 캐시 업데이트
```

## 🛠️ 기술 스택

### 백엔드
- **프레임워크**: NestJS (Node.js)
- **데이터베이스**: PostgreSQL with TypeORM
- **캐시**: Redis with Keyv
- **인증**: JWT + Passport (Google/Kakao OAuth)
- **실시간 통신**: Socket.IO
- **API**: REST + GraphQL
- **파일 업로드**: Multer
- **검증**: class-validator

### 개발 환경
- **언어**: TypeScript
- **테스팅**: Jest
- **문서화**: 모듈별 자동 생성
- **보안**: bcrypt, CORS, Guards

## 🚀 빠른 시작

### 사전 요구사항
- Node.js (v18+)
- PostgreSQL
- Redis

### 설치
```bash
# 저장소 클론
git clone https://github.com/yourusername/nestjs-sns.git
cd nestjs-sns

# 의존성 설치
npm install

# 환경 설정
cp .env.example .env
# 데이터베이스 및 OAuth 자격 증명 설정

# 데이터베이스 설정
npm run db:migrate

# 개발 서버 시작
npm run start:dev
```

## 📚 API 문서

### 인증 엔드포인트
```http
POST /auth/register/email     # 이메일 회원가입
POST /auth/login/email        # 이메일 로그인
GET  /auth/login/google       # Google OAuth
GET  /auth/login/kakao        # Kakao OAuth
POST /auth/token/access       # Access 토큰 갱신
POST /auth/token/refresh      # Refresh 토큰 갱신
```
📖 **자세한 API 문서**: [Auth 모듈 README](./src/auth/README.md)

### 사용자 관리
```http
GET    /users                 # 사용자 목록 (관리자)
GET    /users/follow/me       # 내 팔로워
POST   /users/follow/:id      # 사용자 팔로우
PATCH  /users/follow/:id/confirm  # 팔로우 승인
DELETE /users/follow/:id      # 언팔로우
```
📖 **자세한 API 문서**: [Users 모듈 README](./src/users/README.md)

### 게시물 & 콘텐츠
```http
GET    /posts                 # 게시물 목록 (페이지네이션)
GET    /posts/following       # 팔로잉 사용자 게시물
POST   /posts                 # 게시물 작성
PATCH  /posts/:id             # 게시물 수정
DELETE /posts/:id             # 게시물 삭제 (관리자)
POST   /common/image          # 이미지 업로드
```
📖 **자세한 API 문서**: [Posts 모듈 README](./src/posts/README.md) | [Common 모듈 README](./src/common/README.md)

### 실시간 채팅 (WebSocket)
```typescript
// /chats 네임스페이스에 연결
socket.emit('create_chat', { userIds: [1, 2, 3] });
socket.emit('enter_chat', { chatIds: [1, 2] });
socket.emit('send_message', { chatId: 1, message: '안녕하세요!' });
socket.on('receive_message', (message) => { /* 처리 */ });
```
📖 **자세한 API 문서**: [Chats 모듈 README](./src/chats/README.md)

### GraphQL 쿼리
```graphql
query GetPost($id: Int!) {
  getPost(id: $id) {
    id
    title
    content
    author { nickname }
    likeCount
    commentCount
  }
}
```
📖 **자세한 API 문서**: [Posts 모듈 README](./src/posts/README.md)

### 캐싱 시스템
Redis를 통한 성능 최적화 시스템
📖 **자세한 문서**: [Redis 모듈 README](./src/redis/README.md)

## 📁 모듈 개요

### 🔐 Auth 모듈
**JWT + OAuth 인증 시스템**
- 이메일/비밀번호 회원가입 및 로그인
- Google 및 Kakao 소셜 로그인
- Access/Refresh 토큰 관리
- 역할 기반 접근 제어

### 👥 Users 모듈
**사용자 관리 및 소셜 기능**
- 사용자 프로필 관리
- 승인 워크플로우가 있는 팔로우/언팔로우 시스템
- 소셜 로그인 통합
- 관리자 사용자 관리

### 📝 Posts 모듈
**미디어 지원 콘텐츠 관리**
- 게시물 CRUD 작업
- 이미지 첨부 지원
- 페이지네이션 (커서 & 페이지 기반)
- GraphQL 및 REST API
- 성능을 위한 Redis 캐싱

### 💬 Chats 모듈
**실시간 메시징 시스템**
- WebSocket 기반 실시간 채팅
- 그룹 채팅방
- 귓속말 메시지
- WebSocket 연결을 위한 JWT 인증

### 🔧 Common 모듈
**공유 유틸리티 및 서비스**
- 동적 페이지네이션 시스템
- 파일 업로드 처리
- 쿼리 필터링 유틸리티
- 기본 엔티티 및 DTO

### ⚡ Redis 모듈
**캐싱 및 성능 최적화**
- TTL이 있는 키-값 캐싱
- 패턴 기반 캐시 무효화
- 피드를 위한 성능 최적화
- 앱 전체 사용을 위한 글로벌 모듈

## 🔧 개발

### 스크립트
```bash
npm run start:dev      # 개발 서버
npm run build          # 프로덕션 빌드
npm run test           # 테스트 실행
npm run test:e2e       # End-to-end 테스트
npm run db:migrate     # 데이터베이스 마이그레이션
```

### 코드 구조
```
src/
├── auth/              # 인증 모듈
├── users/             # 사용자 관리
├── posts/             # 게시물 관리
├── chats/             # 실시간 메시징
├── common/            # 공유 유틸리티
├── redis/             # 캐싱 모듈
└── main.ts           # 애플리케이션 진입점
```

## 🚦 성능 특징

- **Redis 캐싱**: 최적 성능을 위한 팔로잉 피드 캐싱
- **데이터베이스 인덱싱**: 자주 조회되는 필드에 대한 전략적 인덱스
- **커서 페이지네이션**: 대용량 데이터셋의 효율적 처리
- **트랜잭션 관리**: TypeORM 트랜잭션을 통한 데이터 일관성
- **WebSocket 최적화**: 효율적인 실시간 메시지 브로드캐스팅

## 🔒 보안

- **JWT 인증**: 안전한 토큰 기반 인증
- **비밀번호 해싱**: 안전한 비밀번호 저장을 위한 bcrypt
- **입력 검증**: 요청 검증을 위한 class-validator
- **CORS 구성**: 적절한 교차 출처 요청 처리
- **역할 기반 접근**: 관리자 및 사용자 역할 분리
- **파일 업로드 보안**: 업로드를 위한 타입 및 크기 검증

## 🤝 기여하기

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m '놀라운 기능 추가'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 열기

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 라이선스가 부여됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙋‍♂️ 지원

질문 및 지원:
- GitHub에서 이슈 생성
- `/src/{module}/README.md`에서 모듈별 README 파일 확인
- 실행 시 `/api/docs`에서 API 문서 검토

