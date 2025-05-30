# Users 모듈

## 개요
사용자 관리와 팔로우 시스템을 담당하는 핵심 모듈입니다. 일반 회원가입뿐만 아니라 Google, Kakao 소셜 로그인을 지원하며, 사용자 간의 팔로우 관계를 관리합니다.

## 구성요소

### 모듈
- `users.module.ts`: UsersModel, UserFollowersModel 엔티티와 서비스를 등록하는 모듈 정의

### 컨트롤러
- `users.controller.ts`: 사용자 관련 REST API 엔드포인트 정의
  - 사용자 조회, 팔로우/언팔로우, 팔로우 요청 관리

### 서비스
- `users.service.ts`: 사용자 및 팔로우 관련 비즈니스 로직 구현
  - 사용자 CRUD, 소셜 로그인 처리, 팔로우 시스템

### 엔티티
- `entity/users.entity.ts`: 사용자 정보를 저장하는 메인 엔티티
- `entity/user-followers.entity.ts`: 사용자 간 팔로우 관계를 저장하는 엔티티

### 데코레이터
- `decorator/user.decorator.ts`: 현재 로그인한 사용자 정보 추출
- `decorator/roles.decorator.ts`: 역할 기반 접근 제어

## 주요 기능

### 1. 사용자 관리
- **일반 회원가입**: 이메일, 닉네임, 비밀번호를 이용한 계정 생성
- **소셜 로그인**: Google, Kakao OAuth를 통한 간편 가입/로그인
- **사용자 조회**: 전체 사용자 목록 조회 (관리자 권한)
- **중복 검증**: 이메일, 닉네임 중복 확인

### 2. 팔로우 시스템
- **팔로우 요청**: 다른 사용자에게 팔로우 요청 전송
- **팔로우 수락**: 받은 팔로우 요청 승인
- **팔로우 취소**: 보낸 팔로우 요청 취소
- **언팔로우**: 기존 팔로우 관계 해제
- **팔로워 조회**: 나를 팔로우하는 사용자 목록 확인
- **팔로우 카운트**: 팔로워/팔로잉 수 자동 관리

### 3. 권한 관리
- **역할 기반 접근**: USER, ADMIN 역할 구분
- **인증 필요 API**: JWT 토큰을 통한 사용자 인증

## API 엔드포인트

### 사용자 관리
```http
GET /users
- 설명: 모든 사용자 조회 (관리자 전용)
- 권한: ADMIN
- 응답: 사용자 목록
```

### 팔로우 관리
```http
GET /users/follow/me
- 설명: 내 팔로워 목록 조회
- 쿼리: includeNotConfirmed (boolean) - 미승인 팔로우 포함 여부
- 응답: 팔로워 정보 배열

POST /users/follow/:id
- 설명: 특정 사용자 팔로우 요청
- 파라미터: id (number) - 팔로우할 사용자 ID
- 응답: 성공 여부

PATCH /users/follow/:id/confirm
- 설명: 팔로우 요청 수락
- 파라미터: id (number) - 팔로우를 요청한 사용자 ID
- 응답: 성공 여부

DELETE /users/follow/:id
- 설명: 팔로우 관계 해제 (언팔로우)
- 파라미터: id (number) - 언팔로우할 사용자 ID
- 응답: 성공 여부

DELETE /users/follow/:id/cancel
- 설명: 팔로우 요청 취소
- 파라미터: id (number) - 요청 취소할 사용자 ID
- 응답: 성공 여부

GET /users/follow/me/requests
- 설명: 내가 보낸 팔로우 요청 목록
- 응답: 팔로우 요청 정보 배열
```

## 사용 예시

### 서비스 사용
```typescript
// 사용자 생성
const newUser = await usersService.createUser({
  email: 'user@example.com',
  nickname: 'username',
  password: 'hashedPassword'
});

// 소셜 로그인 사용자 찾기/생성
const googleUser = await usersService.findOrCreateByGoogle({
  email: 'user@gmail.com',
  displayName: 'User Name',
  googleId: 'google_user_id'
});

// 팔로우 요청
await usersService.followUser(followerId, followeeId);

// 팔로우 수락
await usersService.confirmFollow(followerId, followeeId);
```

### 컨트롤러 사용
```typescript
// 팔로워 목록 조회
@Get('follow/me')
async getFollow(
  @User('id') userId: number,
  @Query('includeNotConfirmed') includeNotConfirmed: boolean
) {
  return this.usersService.getFollowers(userId, includeNotConfirmed);
}
```

## 데이터베이스 스키마

### UsersModel
- `id`: 기본키
- `google`: Google OAuth ID (unique, nullable)
- `kakao`: Kakao OAuth ID (unique, nullable)
- `nickname`: 사용자 닉네임 (unique, 1-20자)
- `email`: 이메일 주소 (unique)
- `password`: 비밀번호 (3-8자, 응답 시 제외)
- `role`: 사용자 역할 (USER/ADMIN)
- `followerCount`: 팔로워 수
- `followeeCount`: 팔로잉 수

### UserFollowersModel
- `follower`: 팔로우하는 사용자 (UsersModel 참조)
- `followee`: 팔로우 받는 사용자 (UsersModel 참조)
- `isConfirmed`: 팔로우 승인 여부

## 트랜잭션 관리
팔로우 관련 작업에서는 `TransactionInterceptor`를 사용하여 데이터 일관성을 보장합니다:
- 팔로우 수락 시 관계 업데이트 + 카운트 증가
- 언팔로우 시 관계 삭제 + 카운트 감소

## 보안 고려사항
- 비밀번호는 응답에서 자동 제외 (`@Exclude` 데코레이터)
- JWT 토큰 기반 인증
- 역할 기반 접근 제어 (RBAC)
- 이메일/닉네임 중복 검증
