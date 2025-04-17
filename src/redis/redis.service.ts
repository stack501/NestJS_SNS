import { Injectable, Inject } from '@nestjs/common';
import Keyv from 'keyv';
import { KEYV_TOKEN } from './redis.constants';

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

  async clear(): Promise<void> {
    await this.keyv.clear();
  }
}