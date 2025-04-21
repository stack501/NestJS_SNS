// src/guards/rate-limiter.guard.ts
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Inject,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import type { Redis } from 'ioredis';
  import {
    RATE_LIMITER_KEY,
    RateLimitOptions,
  } from '../decorator/rate-limiter.decorator';
  import { IORedisToken } from 'src/redis/redis.constants';
  
  @Injectable()
  export class RateLimiterGuard implements CanActivate {
    private readonly keyPrefix = 'token_bucket:';
  
    private readonly luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local requested = tonumber(ARGV[4])
  
      -- 기존 상태 조회
      local bucket = redis.call("HMGET", key, "tokens", "last_refill")
      local tokens = bucket[1]
      local last_refill = bucket[2]
  
      if not tokens or tokens == false then
        tokens = capacity
        last_refill = now
      else
        tokens = tonumber(tokens)
        last_refill = tonumber(last_refill)
      end
  
      -- 토큰 보충
      local delta = math.max(0, now - last_refill)
      local tokensToAdd = delta * refillRate
      tokens = math.min(capacity, tokens + tokensToAdd)
  
      -- TTL 계산: capacity가 모두 리필되는 데 걸리는 초
      local ttl = math.ceil(capacity / refillRate)
  
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
      const req = context.switchToHttp().getRequest();
  
      // 1) 키 전략: 인증된 사용자면 user:{id}, 아니면 ip:{ip}
      const identifier = req.user?.id
        ? `user:${req.user.id}`
        : `ip:${req.ip}`;
  
      // 2) 동적 경로 처리: route.path 우선, 없으면 쿼리 제거한 URL
      const routePath = req.route?.path ?? req.url.split('?')[0];
  
      // 최종 Redis 키
      const key = `${this.keyPrefix}${identifier}:${routePath}`;
  
      // 3) 데코레이터 옵션 가져오기
      const options: RateLimitOptions =
        this.reflector.get(RATE_LIMITER_KEY, context.getHandler()) || {};
  
      // 4) 기본 한도 (예: 인증/비인증 구분)
      // Guard에 옵션값이 없고, 로그인이 된 경우 요청 제한 횟수 100번, 미로그인 시 10번
      const baseCapacity = req.user ? 100 : 10;
      // Guard 옵션이 없고, 로그인이 된 경우 초당 20개 토큰이 채워짐, 미로그인 시 초당 1개
      const baseRefill = req.user ? 20 : 1;
  
      // 5) 데코레이터로 오버라이드 가능
      const capacity = options.capacity ?? baseCapacity;
      const refillRate = options.refillRate ?? baseRefill;
  
      const now = Math.floor(Date.now() / 1000);
      const requested = 1;
  
      try {
        const result = await this.redis.eval(
          this.luaScript,
          1,
          key,
          capacity,
          refillRate,
          now,
          requested,
        );
  
        if (result === 1) return true;
  
        throw new HttpException(
          `Too many requests to ${routePath}`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } catch (err) {
        if (err instanceof HttpException) throw err;
        throw new HttpException(
          'Rate Limiter Internal Error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }