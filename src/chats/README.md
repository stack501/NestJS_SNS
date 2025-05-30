# Chats 모듈

## 개요
실시간 채팅 기능을 제공하는 NestJS 모듈입니다. WebSocket을 기반으로 한 실시간 메시징, 채팅방 관리, 그리고 귓속말 기능을 지원합니다.

## 구성요소

### 모듈
- `chats.module.ts`: 모듈 정의 및 종속성 설정
  - TypeORM 엔티티 등록 (ChatsModel, MessagesModel)
  - 공통 모듈, 인증 모듈, 사용자 모듈 임포트

### 컨트롤러
- `chats.controller.ts`: REST API 엔드포인트 정의
  - 채팅방 목록 페이징 조회

### 서비스
- `chats.service.ts`: 채팅방 관련 비즈니스 로직 구현
  - 채팅방 생성, 조회, 존재 확인

### 게이트웨이
- `chats.gateway.ts`: WebSocket 게이트웨이
  - 실시간 메시징 처리
  - 연결 관리 및 인증

### 엔티티
- `chats.entity.ts`: 채팅방 데이터베이스 모델
  - 사용자와의 다대다 관계
  - 메시지와의 일대다 관계

### 하위 모듈
- `messages/`: 메시지 관련 기능
  - 메시지 엔티티 및 서비스
  - 메시지 컨트롤러

## 주요 기능

### 1. 채팅방 관리
- **채팅방 생성**: 여러 사용자가 참여할 수 있는 채팅방 생성
- **채팅방 조회**: 페이징을 통한 채팅방 목록 조회
- **채팅방 존재 확인**: 채팅방 유효성 검증

### 2. 실시간 메시징
- **WebSocket 연결**: JWT 기반 인증을 통한 안전한 연결
- **메시지 전송**: 채팅방 내 실시간 메시지 전송
- **메시지 수신**: 브로드캐스트를 통한 실시간 메시지 수신

### 3. 귓속말 기능
- **개인 메시지**: 특정 사용자에게만 전송되는 귓속말
- **룸 기반 전송**: 사용자 ID 기반 개별 룸을 통한 메시지 전달

### 4. 보안 및 검증
- **JWT 인증**: WebSocket 연결 시 토큰 검증
- **데이터 검증**: ValidationPipe를 통한 요청 데이터 검증
- **예외 처리**: WsErrorFilter를 통한 에러 핸들링

## API 엔드포인트

### REST API
```http
GET /chats?page=1&limit=10
Authorization: Bearer {access_token}
```
- 채팅방 목록을 페이징하여 조회

### WebSocket Events

#### 연결
```typescript
// 네임스페이스: /chats
// 헤더에 Authorization: Bearer {token} 필요
```

#### 채팅방 생성
```typescript
socket.emit('create_chat', {
  userIds: [1, 2, 3]
});
```

#### 채팅방 입장
```typescript
socket.emit('enter_chat', {
  chatIds: [1, 2, 3]
});
```

#### 메시지 전송
```typescript
// 채팅방 메시지
socket.emit('send_message', {
  chatId: 1,
  message: '안녕하세요!'
});

// 귓속말
socket.emit('send_message', {
  whisperTargetId: 2,
  message: '비밀 메시지'
});
```

#### 메시지 수신
```typescript
// 채팅방 메시지 수신
socket.on('receive_message', (message) => {
  console.log('받은 메시지:', message);
});

// 귓속말 수신
socket.on('receive_whisper', (data) => {
  console.log('귓속말:', data.message, '발신자:', data.from);
});
```

## 사용 예시

### 클라이언트 측 WebSocket 연결
```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/chats', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});

// 채팅방 입장
socket.emit('enter_chat', {
  chatIds: [1, 2]
});

// 메시지 전송
socket.emit('send_message', {
  chatId: 1,
  message: '안녕하세요!'
});

// 메시지 수신
socket.on('receive_message', (message) => {
  console.log('새 메시지:', message);
});
```

### 서버 측 채팅방 생성
```typescript
import { ChatsService } from './chats.service';

// 채팅방 생성
const newChat = await chatsService.createChat({
  userIds: [1, 2, 3]
});

// 채팅방 목록 조회
const chats = await chatsService.paginateChats({
  page: 1,
  limit: 10
});
```

## 데이터베이스 스키마

### ChatsModel
```sql
CREATE TABLE chats_model (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 관계 테이블
- `chats_model_users_users_model`: 채팅방-사용자 다대다 관계
- `messages_model`: 메시지 테이블 (일대다 관계)

## 의존성
- `@nestjs/websockets`: WebSocket 지원
- `socket.io`: 실시간 통신
- `typeorm`: 데이터베이스 ORM
- `class-validator`: 데이터 검증
- 내부 모듈: CommonModule, AuthModule, UsersModule
