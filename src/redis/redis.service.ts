import { Injectable, Inject } from '@nestjs/common';
import Keyv from 'keyv';
import { KEYV_TOKEN } from './redis.constants';
import KeyvRedis from 'keyv-redis';
import type { Redis } from 'ioredis';

/**
 * Redis 캐싱 기능을 제공하는 서비스
 * 
 * 키-값 저장소 기반으로 데이터의 캐싱, 삭제, 패턴 기반 삭제 등의 기능을 제공합니다.
 */
@Injectable()
export class RedisService {
  constructor(
    @Inject(KEYV_TOKEN)
    private readonly keyv: Keyv,
  ) { }

  /**
   * 키에 해당하는 데이터를 조회합니다
   * @param key 조회할 키
   * @returns 저장된 데이터 또는 undefined
   */
  async get<T = any>(key: string): Promise<T | undefined> {
    return this.keyv.get(key);
  }

  /**
   * 키-값 쌍을 저장합니다
   * @param key 저장할 키
   * @param value 저장할 값
   * @param ttlMs 만료 시간(밀리초, 옵션)
   */
  async set<T = any>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.keyv.set(key, value, ttlMs);
  }

  /**
   * 키에 해당하는 데이터를 삭제합니다
   * @param key 삭제할 키
   */
  async del(key: string): Promise<void> {
    await this.keyv.delete(key);
  }

  /**
   * 패턴에 일치하는 모든 키를 삭제합니다
   * @param pattern 삭제할 키의 패턴
   */
  async delByPattern(pattern: string): Promise<void> {
    const adapter = this.keyv.store as KeyvRedis;
    const client = adapter.redis as Redis;
    const namespaceSet = (adapter as any)._getNamespace();
    const allKeys: string[] = await client.smembers(namespaceSet);

    // Match keys where the part after the first colon starts with the given pattern
    const matched = allKeys.filter((key) => {
      // Split on the first colon only
      const [, rest] = key.split(/:(.+)/, 2);
      return rest.startsWith(pattern);
    });

    if (matched.length > 0) {
      await client.del(...matched);
      await client.srem(namespaceSet, ...matched);
    }
  }

  /**
   * 모든 키-값 쌍을 삭제합니다
   */
  async clear(): Promise<void> {
    await this.keyv.clear();
  }
}