import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { RateLimiterGuard } from '../guards/rate-limiter.guard';

/**
 * 속도 제한 옵션 인터페이스
 * 
 * 토큰 버켓 알고리즘의 동작을 제어하는 설정값들을 정의합니다.
 */
export interface RateLimitOptions {
  /** 
   * 최대 토큰 개수 (버켓 용량)
   * @default 30
   * @example 100 - 최대 100개의 요청을 버스트로 허용
   */
  capacity?: number;
  /** 
   * 초당 채워지는 토큰 개수 (리필 속도)
   * @default 10
   * @example 5 - 초당 5개의 토큰이 충전됨 (즉, 초당 5개 요청 허용)
   */
  refillRate?: number;
}

/** 속도 제한 메타데이터 키 */
export const RATE_LIMITER_KEY = 'rate_limiter_options';

/**
 * 속도 제한 데코레이터
 * 
 * 토큰 버켓 알고리즘을 사용하여 API 엔드포인트에 속도 제한을 적용합니다.
 * 인증된 사용자는 사용자 ID 기반으로, 비인증 사용자는 IP 기반으로 제한됩니다.
 * 
 * @param options - 속도 제한 설정 옵션
 * @param options.capacity - 최대 토큰 개수 (기본값: 30)
 * @param options.refillRate - 초당 리필되는 토큰 개수 (기본값: 10)
 * 
 * @example
 * ```typescript
 * // 기본 설정 사용 (초당 10개, 최대 30개 버스트)
 * @RateLimiter()
 * async basicEndpoint() { ... }
 * 
 * // 커스텀 설정 (초당 5개, 최대 100개 버스트)
 * @RateLimiter({ capacity: 100, refillRate: 5 })
 * async restrictedEndpoint() { ... }
 * 
 * // 매우 제한적인 설정 (초당 1개, 최대 3개 버스트)
 * @RateLimiter({ capacity: 3, refillRate: 1 })
 * async sensitiveEndpoint() { ... }
 * ```
 */
export const RateLimiter = (options: RateLimitOptions = {}) =>
  applyDecorators(
    SetMetadata(RATE_LIMITER_KEY, options),
    UseGuards(RateLimiterGuard),
  );