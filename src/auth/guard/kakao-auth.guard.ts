import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * 카카오 인증 가드
 * 
 * @description 카카오 OAuth 2.0을 통한 사용자 인증을 처리하는 가드입니다.
 * Passport의 kakao 전략을 사용합니다.
 */
@Injectable()
export class KakaoAuthGuard extends AuthGuard("kakao") {
  /**
   * 가드 활성화 여부를 확인하는 메서드
   * 
   * @param context - 실행 컨텍스트
   * @returns 인증 성공 여부
   */
  async canActivate(context: any): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    return result;
  }
}