// src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from 'keyv-redis';
import { RedisService } from './redis.service';
import { KEYV_TOKEN } from './redis.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KEYV_TOKEN,
      useFactory: (cs: ConfigService) => {
        const host = cs.get<string>('app.redis.host');
        const port = cs.get<number>('app.redis.port');
        return new Keyv({
          store: new KeyvRedis({ host, port }),
          ttl: 60_000,
        });
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService, KEYV_TOKEN],
})
export class RedisModule {}