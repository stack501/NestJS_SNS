import { Injectable, Inject } from '@nestjs/common';
import Keyv from 'keyv';
import { KEYV_TOKEN } from './redis.constants';
import KeyvRedis from 'keyv-redis';
import type { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(
    @Inject(KEYV_TOKEN)
    private readonly keyv: Keyv,
  ) { }

  async get<T = any>(key: string): Promise<T | undefined> {
    return this.keyv.get(key);
  }

  async set<T = any>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.keyv.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.keyv.delete(key);
  }

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

  async clear(): Promise<void> {
    await this.keyv.clear();
  }
}