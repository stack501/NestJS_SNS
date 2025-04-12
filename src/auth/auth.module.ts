import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { ConfigModule } from '@nestjs/config';
import googleConfig from 'src/configs/google.config';

@Module({
  imports: [
    ConfigModule.forFeature(googleConfig),
    JwtModule.register({}),
    UsersModule,
  ],
  exports: [AuthService],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
})
export class AuthModule {}
