import { Inject, Injectable } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20'
import googleConfig from 'src/configs/google.config'
import { UsersService } from 'src/users/users.service'

/**
 * 구글 OAuth 인증을 처리하는 전략 클래스
 * 구글 계정으로 로그인 및 회원가입을 처리합니다
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(googleConfig.KEY)
    private readonly config: ConfigType<typeof googleConfig>,
    private usersService: UsersService,
  ) {
    super({
      clientID: config.clientId as string,
      clientSecret: config.clientSecret as string,
      callbackURL: config.callbackUrl as string,
      scope: ['email', 'profile'],
    })
  }

  /**
   * 리프레시 토큰을 얻기 위한 인증 파라미터를 설정합니다
   * @returns 구글 OAuth 인증 파라미터
   */
  authorizationParams(): {[key: string]: string; } {
    return ({
      access_type: 'offline',
      prompt: 'select_account',
    });
  }

  /**
   * 구글 인증 후 사용자 정보를 검증하고 처리합니다
   * @param accessToken 구글로부터 받은 액세스 토큰
   * @param refreshToken 구글로부터 받은 리프레시 토큰
   * @param profile 구글로부터 받은 사용자 프로필 정보
   * @param done 인증 완료 콜백 함수
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { id, displayName, emails } = profile;
    const googleId = id;
    const email = emails && emails.length > 0 ? emails[0].value : '';

    // 사용자를 조회하거나 생성하는 로직을 실행합니다.
    const user = await this.usersService.findOrCreateByGoogle({
        email,
        displayName,
        googleId,
    });

    done(null, user);
  }
}