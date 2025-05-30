import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-kakao';
import { ConfigType } from '@nestjs/config';
import kakaoConfig from 'src/configs/kakao.config';
import { UsersService } from 'src/users/users.service';

/**
 * 카카오 OAuth 인증을 처리하는 전략 클래스
 * 카카오 계정으로 로그인 및 회원가입을 처리합니다
 */
@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    @Inject(kakaoConfig.KEY)
    private readonly config: ConfigType<typeof kakaoConfig>,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: config.clientId,
      callbackURL: config.callbackUrl,
    });
  }

  /**
   * 카카오 인증 후 사용자 정보를 검증하고 처리합니다
   * @param accessToken 카카오로부터 받은 액세스 토큰
   * @param refreshToken 카카오로부터 받은 리프레시 토큰
   * @param profile 카카오로부터 받은 사용자 프로필 정보
   * @param done 인증 완료 콜백 함수
   * @returns 인증된 사용자 정보
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    // profile에서 필요한 정보를 추출합니다.
    // passport-kakao는 profile 객체 내 _json 속성에 추가 정보를 포함합니다.
    const { id, username, _json } = profile;
    const email =
      _json?.kakao_account && _json.kakao_account.email
        ? _json.kakao_account.email
        : null;

    /*
      UsersService에 kakaOAuth 전용 메소드 (예: findOrCreateByKakao())를 만들어서
      기존 사용자와의 중복 검사 및 신규 생성 로직을 처리할 수 있습니다.
      예)
      async findOrCreateByKakao({ kakaoId, email, nickname }: { kakaoId: string; email?: string; nickname: string; }): Promise<UsersModel>;
    */
    const user = await this.usersService.findOrCreateByKakao({
      email,
      nickname: username,
      kakaoId: id,
    });

    done(null, user);
  }
}