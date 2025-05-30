# Auth 모듈

## 개요
사용자 인증 및 권한 관리를 담당하는 모듈입니다. JWT 토큰 기반 인증과 OAuth(Google, Kakao) 소셜 로그인을 지원합니다.

## 구성요소

### 모듈
- `auth.module.ts`: 모듈 정의 및 종속성 설정 (JWT, Google/Kakao OAuth 설정 포함)

### 컨트롤러
- `auth.controller.ts`: 인증 관련 API 엔드포인트 정의

### 서비스
- `auth.service.ts`: 인증 비즈니스 로직 구현

### DTO
- `login.dto.ts`: 로그인 요청 데이터 전송 객체
- `register-user.dto.ts`: 회원가입 요청 데이터 전송 객체

### 가드 (Guards)
- `bearer-token.guard.ts`: JWT 토큰 검증 가드
- `google-auth.guard.ts`: Google OAuth 인증 가드
- `kakao-auth.guard.ts`: Kakao OAuth 인증 가드

### 전략 (Strategies)
- `google.strategy.ts`: Google OAuth 인증 전략
- `kakao.strategy.ts`: Kakao OAuth 인증 전략

## 주요 기능

### 1. JWT 토큰 인증
- **Access Token**: 리소스 접근용 단기 토큰 (1시간)
- **Refresh Token**: 토큰 갱신용 장기 토큰 (30일)
- 토큰 생성, 검증, 갱신 기능

### 2. 이메일/비밀번호 인증
- 회원가입 (`POST /auth/register/email`)
- 로그인 (`POST /auth/login/email`)
- bcrypt를 사용한 비밀번호 해싱

### 3. OAuth 소셜 로그인
- **Google OAuth**: `/auth/login/google`
- **Kakao OAuth**: `/auth/login/kakao`
- 로그아웃 지원 (`/auth/logout/kakao`)

### 4. 토큰 관리
- Access Token 재발급: `POST /auth/token/access`
- Refresh Token 재발급: `POST /auth/token/refresh`

## 인증 플로우

### Basic 인증 플로우
```
1. 클라이언트 로그인 요청 (이메일/비밀번호)
2. 서버에서 사용자 검증
3. Access Token + Refresh Token 발급
4. 클라이언트가 Authorization 헤더에 Bearer 토큰 포함하여 API 호출
5. 서버에서 토큰 검증 후 리소스 제공
```

### 토큰 갱신 플로우
```
1. Access Token 만료 시
2. Refresh Token을 사용하여 새 Access Token 요청
3. 새 Access Token 발급
4. 필요시 Refresh Token도 갱신
```

## API 엔드포인트

### 인증
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login/email` | 이메일 로그인 | No |
| POST | `/auth/register/email` | 이메일 회원가입 | No |

### 토큰 관리
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/token/access` | Access Token 재발급 | Refresh Token |
| POST | `/auth/token/refresh` | Refresh Token 재발급 | Refresh Token |

### OAuth
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/login/google` | Google 로그인 시작 | No |
| GET | `/auth/google/callback` | Google 콜백 | No |
| GET | `/auth/login/kakao` | Kakao 로그인 시작 | No |
| GET | `/auth/kakao/callback` | Kakao 콜백 | No |
| GET | `/auth/logout/kakao` | Kakao 로그아웃 | No |
| GET | `/auth/kakao/logout/callback` | Kakao 로그아웃 콜백 | No |

## 사용 예시

### 1. 회원가입
```typescript
// POST /auth/register/email
const registerData = {
  email: "user@example.com",
  password: "password123",
  nickname: "사용자닉네임"
};

const response = await fetch('/auth/register/email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams(registerData)
});

// Response: { accessToken: "...", refreshToken: "..." }
```

### 2. 로그인
```typescript
// POST /auth/login/email
const loginData = {
  email: "user@example.com",
  password: "password123"
};

const response = await fetch('/auth/login/email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams(loginData)
});

// Response: { accessToken: "...", refreshToken: "..." }
```

### 3. 인증이 필요한 API 호출
```typescript
const response = await fetch('/protected-resource', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### 4. Access Token 재발급
```typescript
// POST /auth/token/access
const response = await fetch('/auth/token/access', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${refreshToken}`
  }
});

// Response: { accessToken: "..." }
```

### 5. 서비스에서 토큰 검증
```typescript
@Injectable()
export class SomeService {
  constructor(private readonly authService: AuthService) {}

  validateToken(token: string) {
    try {
      const decoded = this.authService.verifyToken(token);
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰');
    }
  }
}
```

## 토큰 구조

### JWT Payload
```typescript
{
  email: string,      // 사용자 이메일
  sub: number,        // 사용자 ID
  type: 'access' | 'refresh',  // 토큰 타입
  iat: number,        // 발급 시간
  exp: number         // 만료 시간
}
```

## 설정

### 환경 변수
- `JWT_SECRET_KEY`: JWT 서명용 비밀키
- `HASH_ROUNDS`: bcrypt 해시 라운드 수
- `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 클라이언트 시크릿
- `KAKAO_CLIENT_ID`: Kakao OAuth 클라이언트 ID
- `KAKAO_CLIENT_SECRET`: Kakao OAuth 클라이언트 시크릿

## 보안 고려사항

1. **토큰 저장**: 클라이언트에서 토큰을 안전하게 저장 (httpOnly 쿠키 권장)
2. **토큰 만료**: Access Token은 짧은 만료 시간, Refresh Token은 긴 만료 시간 설정
3. **HTTPS 사용**: 프로덕션 환경에서는 반드시 HTTPS 사용
4. **비밀번호 해싱**: bcrypt를 사용하여 비밀번호 안전하게 저장
5. **토큰 무효화**: 로그아웃 시 토큰 블랙리스트 처리 (선택사항)
