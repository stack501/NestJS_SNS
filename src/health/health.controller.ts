import { Controller, Get } from '@nestjs/common';
import { IsPublicEnum } from 'src/common/const/is-public.const';
import { IsPublic } from 'src/common/decorator/is-public.decorator';

@Controller('health')
export class HealthController {
    @IsPublic(IsPublicEnum.IS_PUBLIC)
    @Get()
    check() {
        return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'dev'
        };
    }

    @IsPublic(IsPublicEnum.IS_PUBLIC)
    @Get('db')
    checkDatabase() {
    return { 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  }
}