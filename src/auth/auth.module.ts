import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { ConfigModule } from '@nestjs/config';
import googleConfig from 'src/configs/google.config';
import kakaoConfig from 'src/configs/kakao.config';
import { KakaoStrategy } from './strategies/kakao.strategy';

@Module({
  imports: [
    ConfigModule.forFeature(googleConfig),
    ConfigModule.forFeature(kakaoConfig),
    JwtModule.register({}),
    UsersModule,
  ],
  exports: [AuthService],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, KakaoStrategy],
})
export class AuthModule {}
