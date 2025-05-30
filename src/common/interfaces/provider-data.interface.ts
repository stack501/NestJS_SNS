import { AuthProvider } from "../enums/auth-provider.enum";

/**
 * 외부 인증 제공자(OAuth)로부터 받은 사용자 데이터 인터페이스
 * 
 * 소셜 로그인 시 Google, Kakao 등의 제공자로부터 전달받는 
 * 사용자 정보를 표준화된 형태로 정의합니다.
 * 
 * @example
 * ```typescript
 * const googleData: ProviderData = {
 *   email: 'user@gmail.com',
 *   nickname: 'John Doe',
 *   providerId: '123456789',
 *   providerKey: AuthProvider.GOOGLE
 * };
 * ```
 */
export interface ProviderData {
    /** 사용자 이메일 주소 (필수) */
    email: string;
    /** 사용자 닉네임 (선택적, 제공자에 따라 없을 수 있음) */
    nickname?: string;
    /** 인증 제공자에서 발급한 고유 사용자 ID */
    providerId: string;
    /** 인증 제공자 유형 (Google, Kakao 등) */
    providerKey: AuthProvider;
}