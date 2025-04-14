import { registerAs } from '@nestjs/config';

export default registerAs('kakao', () => ({
  clientId: process.env.KAKAO_CLIENT_ID,         // 카카오 앱의 REST API 키
  callbackUrl: process.env.KAKAO_CALLBACK_URL,
  logoutCallbackUrl: process.env.KAKAO_LOGOUT_REDIRECT_URI,
}));