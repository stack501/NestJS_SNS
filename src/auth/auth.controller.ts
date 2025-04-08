import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RefreshTokenGuard } from './guard/bearer-token.guard';
import { RegisterUserDto } from './dto/register-user.dto';
import { IsPublic } from 'src/common/decorator/is-public.decorator';
import { IsPublicEnum } from 'src/common/const/is-public.const';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AuthScheme } from 'src/common/const/auth-schema.const';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token/access')
  @ApiBearerAuth(AuthScheme.REFRESH)
  @ApiOperation({ 
    summary: 'AccessToken 재발급', 
    description: 'login/email 이후, AccessToken을 재발급 받는 엔드포인트입니다.' 
  })
  @IsPublic(IsPublicEnum.IS_REFRESH_TOKEN)
  @UseGuards(RefreshTokenGuard)
  postTokenAccess(
    @Req() req: Request
  ) {
    const rawToken = req.headers['authorization'] as string;
    const token = this.authService.extractTokenFromHeader(rawToken, true);

    const newToken = this.authService.rotateToken(token, false);

    /**
     * {accessToken: {token}}
     */
    return {
      accessToken: newToken,
    }
  }

  @Post('token/refresh')
  @ApiBearerAuth(AuthScheme.REFRESH)
  @ApiOperation({ 
    summary: 'RefreshToken 재발급', 
    description: 'login/email 이후, RrefreshToken을 재발급 받는 엔드포인트입니다.' 
  })
  @IsPublic(IsPublicEnum.IS_REFRESH_TOKEN)
  @UseGuards(RefreshTokenGuard)
  postTokenRefresh(
    @Req() req: Request
  ) {
    const rawToken = req.headers['authorization'] as string;
    const token = this.authService.extractTokenFromHeader(rawToken, true);

    const newToken = this.authService.rotateToken(token, true);

    /**
     * {refreshToken: {token}}
     */
    return {
      refreshToken: newToken,
    }
  }

  
  @Post('login/email')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiBody({ type: LoginDto })
  @ApiOperation({ 
    summary: '로그인', 
    description: '사용자가 이메일, 비밀번호로 로그인합니다. AccessToken과 RefreshToken이 반환됩니다.' 
  })
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  postLoginEmail(@Body() loginDto: LoginDto) {
    return this.authService.loginWithEmail(loginDto);
  }

  @Post('register/email')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiBody({ type: RegisterUserDto })
  @ApiOperation({ 
    summary: '회원가입', 
    description: '사용자가 이메일, 비밀번호, 닉네임을 입력하여 회원가입합니다. AccessToken과 RefreshToken이 반환됩니다.' 
  })
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  postRegisterEmail(
    @Body() body: RegisterUserDto,
  ) {
    return this.authService.registerWithEmail(body);
  }
}
