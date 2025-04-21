import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Redis as RedisType } from 'ioredis';
import Keyv from 'keyv';
import KeyvRedis from 'keyv-redis';
import { RedisService } from './redis.service';
import { KEYV_TOKEN } from './redis.constants';
import { IORedisToken } from './redis.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // 1) ioredis 클라이언트 한 번만 생성
    {
      provide: IORedisToken,
      useFactory: (cs: ConfigService): RedisType => {
        return new Redis({
          host: cs.get<string>('app.redis.host'),
          port: cs.get<number>('app.redis.port'),
          // password, db 등 필요시 추가
        });
      },
      inject: [ConfigService],
    },
    // 2) Keyv 인스턴스는 위 클라이언트를 재활용
    {
      provide: KEYV_TOKEN,
      useFactory: (client: Redis) => {
        return new Keyv({
          store: new KeyvRedis({ client }),
          ttl: 60_000,
        });
      },
      inject: [IORedisToken],
    },
    // 3) 기존 RedisService (KEYV_TOKEN 주입)
    RedisService,
  ],
  exports: [RedisService, KEYV_TOKEN, IORedisToken],
})
export class RedisModule {}