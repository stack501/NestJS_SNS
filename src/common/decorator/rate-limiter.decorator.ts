import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { RateLimiterGuard } from '../guards/rate-limiter.guard';

export interface RateLimitOptions {
  capacity?: number;   // 최대 토큰 개수
  refillRate?: number; // 초당 채워지는 토큰 개수
}

export const RATE_LIMITER_KEY = 'rate_limiter_options';

export const RateLimiter = (options: RateLimitOptions = {}) =>
  applyDecorators(
    SetMetadata(RATE_LIMITER_KEY, options),
    UseGuards(RateLimiterGuard),
  );