import { Inject, Injectable } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20'
import googleConfig from 'src/configs/google.config'
import { UsersService } from 'src/users/users.service'

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

  // refreshToken를 얻기 위한 필수 코드
  authorizationParams(): {[key: string]: string; } {
    return ({
      access_type: 'offline',
      prompt: 'select_account',
    });
  }

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