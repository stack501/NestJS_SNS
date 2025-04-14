import { Body, Controller, Post, UseGuards, Req, Get, Inject, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RefreshTokenGuard } from './guard/bearer-token.guard';
import { RegisterUserDto } from './dto/register-user.dto';
import { IsPublic } from 'src/common/decorator/is-public.decorator';
import { IsPublicEnum } from 'src/common/const/is-public.const';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AuthScheme } from 'src/common/const/auth-schema.const';
import { GoogleAuthGuard } from './guard/google-auth.guard';
import { User } from 'src/users/decorator/user.decorator';
import { UsersModel } from 'src/users/entity/users.entity';
import { KakaoAuthGuard } from './guard/kakao-auth.guard';
import kakaoConfig from 'src/configs/kakao.config';
import { ConfigType } from '@nestjs/config';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(kakaoConfig.KEY)
    private readonly config: ConfigType<typeof kakaoConfig>
  ) {}

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

  @Get("login/google")
  @UseGuards(GoogleAuthGuard)
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  googleAuth() {
    console.log('GET google/login')
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  googleAuthRedirect(@User() user: UsersModel) {
    return this.authService.loginUser(user);
  }

  @Get('login/kakao')
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  @UseGuards(KakaoAuthGuard)
  kakaoAuth() {
    // 이 엔드포인트는 KakaoAuthGuard가 리다이렉션 처리합니다.
    console.log('GET kakao/login');
  }

  @Get('kakao/callback')
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  @UseGuards(KakaoAuthGuard)
  kakaoAuthRedirect(@User() user: UsersModel) {
    return this.authService.loginUser(user);
  }

  @Get('logout/kakao')
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  kakaoAuthLogout(@Res() res: Response) {
    const restApiKey = this.config.clientId;
    // 로그아웃 후 사용자에게 리다이렉트할 URL 설정 (예: 홈 페이지 또는 로그인 페이지)
    const logoutRedirectUri = this.config.logoutCallbackUrl as string;
    const logoutUrl = `https://kauth.kakao.com/oauth/logout?client_id=${restApiKey}&logout_redirect_uri=${encodeURIComponent(logoutRedirectUri)}`;
    return res.redirect(logoutUrl);
  }

  @Get('kakao/logout/callback')
  @IsPublic(IsPublicEnum.IS_PUBLIC)
  kakaoAuthLogoutRedirect(@Res() res: Response) {
    res.send('<html><body><h1>카카오계정이 로그아웃 되었습니다.</h1></body></html>');
  }
}
