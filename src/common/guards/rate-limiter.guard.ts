import { BadRequestException, CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql'; // GraphQL 컨텍스트 임포트
import Redis from 'ioredis';
import { IORedisToken } from 'src/redis/redis.constants';
import { RATE_LIMITER_KEY } from '../decorator/rate-limiter.decorator';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly script = `
    -- 속도 제한 구현 Lua 스크립트
    -- 토큰 버켓 알고리즘을 사용합니다
    
    -- 키 및 매개변수 설정
    local key = KEYS[1]
    local max_tokens = tonumber(ARGV[1])
    local refill_rate = tonumber(ARGV[2])  -- 초당 리필되는 토큰 수
    local requested = tonumber(ARGV[3])    -- 요청에 필요한 토큰 수
    local ttl = tonumber(ARGV[4])          -- 버킷 만료 시간(초)
    local now = tonumber(ARGV[5])          -- 현재 시간(초)
    
    -- 현재 버킷 상태 조회
    local exists = redis.call("EXISTS", key)
    local tokens, last_refill
    
    if exists == 1 then
      -- 기존 버킷 데이터 가져오기
      tokens = tonumber(redis.call("HGET", key, "tokens"))
      last_refill = tonumber(redis.call("HGET", key, "last_refill"))
    else
      -- 새 버킷 생성
      tokens = max_tokens
      last_refill = now
    end
    
    -- 토큰 리필 계산
    local elapsed = now - last_refill
    if elapsed > 0 then
      -- 경과 시간에 따라 토큰 추가
      local new_tokens = math.min(max_tokens, tokens + elapsed * refill_rate)
      tokens = new_tokens
    end
    
    -- 요청 처리 (토큰이 충분한지 확인)
    if tokens < requested then
      -- 토큰 부족: 상태만 업데이트하고 거부
      redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
      redis.call("EXPIRE", key, ttl)
      return 0
    else
      -- 토큰 소모: 상태 업데이트 후 허용
      tokens = tokens - requested
      redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
      redis.call("EXPIRE", key, ttl)
      return 1
    end
  `;

  constructor(
    private readonly reflector: Reflector,
    @Inject(IORedisToken) 
    private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // HTTP 요청과 GraphQL 요청 모두 지원하기 위해 요청 객체 가져오기
    let req;
    let isGraphQL = false;

    if (context.getType() === 'http') {
      // REST API 요청인 경우
      req = context.switchToHttp().getRequest();
    } else {
      // GraphQL 요청인 경우
      const gqlContext = GqlExecutionContext.create(context);
      req = gqlContext.getContext().req;
      isGraphQL = true;
    }

    // 요청 객체가 없는 경우
    if (!req) {
      console.warn('Rate Limiter Guard: 요청 컨텍스트에 접근할 수 없습니다.');
      return true; // 안전하게 통과 (또는 필요에 따라 예외를 던질 수도 있음)
    }

    // 1) 키 전략: 인증된 사용자면 user:{id}, 아니면 ip:{ip}
    const identifier = req.user?.id
      ? `user:${req.user.id}`
      : `ip:${req.ip}`;

    // GraphQL 작업 정보 추가 (GraphQL 요청인 경우)
    let operationKey = '';
    if (isGraphQL) {
      const gqlCtx = GqlExecutionContext.create(context);
      const info = gqlCtx.getInfo();
      // 쿼리/뮤테이션 타입과 필드 이름을 기준으로 키 생성 (예: "Query:getUser")
      if (info && info.parentType && info.fieldName) {
        operationKey = `${info.parentType}:${info.fieldName}`;
      }
    } else {
      // REST API 요청인 경우 메소드와 경로를 기준으로 키 생성
      operationKey = `${req.method}:${req.route?.path || req.path}`;
    }

    // 최종 키는 사용자/IP + 작업 유형을 조합하여 생성
    const key = `rate_limit:${identifier}:${operationKey}`;

    // 2) 레이트 리미트 설정값 가져오기
    const rateLimit = this.reflector.getAllAndOverride(RATE_LIMITER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? {
      // 기본값: 초당 10개 요청, 버스트는 최대 30개까지
      refillRate: 10,
      capacity: 30,
      requested: 1,
      ttl: 60,
    };

    const { refillRate, capacity, requested, ttl } = rateLimit;

    // 3) Redis Lua 스크립트를 사용하여 레이트 리미트 적용
    const now = Math.floor(Date.now() / 1000); // 현재 시간(초)
    const result = await this.redis.eval(
      this.script,
      1, // 키 개수
      key, // 키
      capacity, // 최대 토큰 수
      refillRate, // 초당 리필되는 토큰 수
      requested, // 요청당 필요한 토큰 수
      ttl, // 버킷 만료 시간(초)
      now, // 현재 시간(초)
    );

    if (result === 0) {
      // 토큰 부족: 레이트 리미트 초과
      throw new BadRequestException('너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.');
    }

    return true;
  }
}