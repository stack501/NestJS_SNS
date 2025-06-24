/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshTokenGuard } from './guard/bearer-token.guard';
import { UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UsersModel, RoleEnum } from '../users/entity/users.entity';
import { Response } from 'express';

/**
 * AuthController 테스트
 * 인증 관련 컨트롤러의 엔드포인트들의 동작을 검증합니다
 */
describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Mock AuthService
  const mockAuthService = {
    extractTokenFromHeader: jest.fn(),
    rotateToken: jest.fn(),
    loginWithEmail: jest.fn(),
    registerWithEmail: jest.fn(),
    loginUser: jest.fn(),
  };

  // Mock UsersService
  const mockUsersService = {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
  };

  // Mock 카카오 설정
  const mockKakaoConfig = {
    clientId: 'test-client-id',
    logoutCallbackUrl: 'http://localhost:3000/logout/callback',
  };

  // Mock RefreshTokenGuard
  const mockRefreshTokenGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: 'CONFIGURATION(kakao)',
          useValue: mockKakaoConfig,
        },
      ],
    })
      .overrideGuard(RefreshTokenGuard)
      .useValue(mockRefreshTokenGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('컨트롤러 초기화', () => {
    it('AuthController가 정의되어야 합니다', () => {
      expect(controller).toBeDefined();
    });

    it('AuthService가 정의되어야 합니다', () => {
      expect(authService).toBeDefined();
    });
  });

  describe('postTokenAccess', () => {
    it('액세스 토큰을 성공적으로 재발급해야 합니다', () => {
      // Given
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-refresh-token',
        },
      } as unknown as Request;
      const mockToken = 'valid-refresh-token';
      const mockNewToken = 'new-access-token';

      mockAuthService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthService.rotateToken.mockReturnValue(mockNewToken);

      // When
      const result = controller.postTokenAccess(mockRequest);

      // Then
      expect(authService.extractTokenFromHeader).toHaveBeenCalledWith(
        'Bearer valid-refresh-token',
        true
      );
      expect(authService.rotateToken).toHaveBeenCalledWith(mockToken, false);
      expect(result).toEqual({ accessToken: mockNewToken });
    });

    it('잘못된 토큰으로 요청 시 예외를 발생시켜야 합니다', () => {
      // Given
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as unknown as Request;

      mockAuthService.extractTokenFromHeader.mockImplementation(() => {
        throw new UnauthorizedException('잘못된 토큰입니다.');
      });

      // When & Then
      expect(() => controller.postTokenAccess(mockRequest)).toThrow(
        UnauthorizedException
      );
    });
  });

  describe('postTokenRefresh', () => {
    it('리프레시 토큰을 성공적으로 재발급해야 합니다', () => {
      // Given
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-refresh-token',
        },
      } as any;
      const mockToken = 'valid-refresh-token';
      const mockNewToken = 'new-refresh-token';

      mockAuthService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthService.rotateToken.mockReturnValue(mockNewToken);

      // When
      const result = controller.postTokenRefresh(mockRequest);

      // Then
      expect(authService.extractTokenFromHeader).toHaveBeenCalledWith(
        'Bearer valid-refresh-token',
        true
      );
      expect(authService.rotateToken).toHaveBeenCalledWith(mockToken, true);
      expect(result).toEqual({ refreshToken: mockNewToken });
    });

    it('잘못된 리프레시 토큰으로 요청 시 예외를 발생시켜야 합니다', () => {
      // Given
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-refresh-token',
        },
      } as any;

      mockAuthService.extractTokenFromHeader.mockImplementation(() => {
        throw new UnauthorizedException('잘못된 토큰입니다.');
      });

      // When & Then
      expect(() => controller.postTokenRefresh(mockRequest)).toThrow(
        UnauthorizedException
      );
    });
  });

  describe('postLoginEmail', () => {
    it('이메일로 로그인을 성공적으로 처리해야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.loginWithEmail.mockResolvedValue(mockTokens);

      // When
      const result = await controller.postLoginEmail(loginDto);

      // Then
      expect(authService.loginWithEmail).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockTokens);
    });

    it('잘못된 로그인 정보로 요청 시 예외를 발생시켜야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.loginWithEmail.mockRejectedValue(
        new UnauthorizedException('존재하지 않는 사용자입니다.')
      );

      // When & Then
      await expect(controller.postLoginEmail(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('postRegisterEmail', () => {
    it('이메일로 회원가입을 성공적으로 처리해야 합니다', async () => {
      // Given
      const registerDto: RegisterUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.registerWithEmail.mockResolvedValue(mockTokens);

      // When
      const result = await controller.postRegisterEmail(registerDto);

      // Then
      expect(authService.registerWithEmail).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockTokens);
    });

    it('중복된 이메일로 회원가입 시 예외를 발생시켜야 합니다', async () => {
      // Given
      const registerDto: RegisterUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        nickname: 'testuser',
      };

      mockAuthService.registerWithEmail.mockRejectedValue(
        new Error('이미 존재하는 이메일입니다.')
      );

      // When & Then
      await expect(controller.postRegisterEmail(registerDto)).rejects.toThrow(
        '이미 존재하는 이메일입니다.'
      );
    });
  });

  describe('googleAuth', () => {
    it('구글 OAuth 로그인을 시작해야 합니다', () => {
      // Given
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // When
      controller.googleAuth();

      // Then
      expect(consoleLogSpy).toHaveBeenCalledWith('GET google/login');
      consoleLogSpy.mockRestore();
    });
  });

  describe('googleAuthRedirect', () => {
    it('구글 OAuth 콜백을 성공적으로 처리해야 합니다', () => {
      // Given
      const mockUser: UsersModel = {
        id: 1,
        email: 'google@example.com',
        nickname: 'googleuser',
        password: 'hashed-password',
        role: RoleEnum.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        google: 'google-oauth-id',
        kakao: 'kakao-oauth-id',
        posts: [],
        chats: [],
        messages: [],
        whisperMessages: [],
        comments: [],
        followers: [],
        followees: [],
        followerCount: 0,
        followeeCount: 0,
      };
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.loginUser.mockReturnValue(mockTokens);

      // When
      const result = controller.googleAuthRedirect(mockUser);

      // Then
      expect(authService.loginUser).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('kakaoAuth', () => {
    it('카카오 OAuth 로그인을 시작해야 합니다', () => {
      // Given
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // When
      controller.kakaoAuth();

      // Then
      expect(consoleLogSpy).toHaveBeenCalledWith('GET kakao/login');
      consoleLogSpy.mockRestore();
    });
  });

  describe('kakaoAuthRedirect', () => {
    it('카카오 OAuth 콜백을 성공적으로 처리해야 합니다', () => {
      // Given
      const mockUser: UsersModel = {
        id: 2,
        email: 'kakao@example.com',
        nickname: 'kakaouser',
        password: 'hashed-password',
        role: RoleEnum.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        google: 'google-oauth-id',
        kakao: 'kakao-oauth-id',
        posts: [],
        chats: [],
        messages: [],
        whisperMessages: [],
        comments: [],
        followers: [],
        followees: [],
        followerCount: 0,
        followeeCount: 0,
      };
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.loginUser.mockReturnValue(mockTokens);

      // When
      const result = controller.kakaoAuthRedirect(mockUser);

      // Then
      expect(authService.loginUser).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('kakaoAuthLogout', () => {
    it('카카오 로그아웃 페이지로 리디렉션해야 합니다', () => {
      // Given
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      const expectedUrl = `https://kauth.kakao.com/oauth/logout?client_id=${mockKakaoConfig.clientId}&logout_redirect_uri=${encodeURIComponent(mockKakaoConfig.logoutCallbackUrl)}`;

      // When
      const result = controller.kakaoAuthLogout(mockResponse);

      // Then
      expect(mockResponse.redirect).toHaveBeenCalledWith(expectedUrl);
      expect(result).toEqual(mockResponse.redirect(expectedUrl));
    });
  });

  describe('kakaoAuthLogoutRedirect', () => {
    it('카카오 로그아웃 완료 페이지를 반환해야 합니다', () => {
      // Given
      const mockResponse = {
        send: jest.fn(),
      } as unknown as Response;

      const expectedHtml = '<html><body><h1>카카오계정이 로그아웃 되었습니다.</h1></body></html>';

      // When
      controller.kakaoAuthLogoutRedirect(mockResponse);

      // Then
      expect(mockResponse.send).toHaveBeenCalledWith(expectedHtml);
    });
  });

  describe('에러 처리', () => {
    it('Authorization 헤더가 없을 때 적절한 예외를 발생시켜야 합니다', () => {
      // Given
      const mockRequest = {
        headers: {},
      } as any;

      mockAuthService.extractTokenFromHeader.mockImplementation(() => {
        throw new UnauthorizedException('잘못된 토큰입니다.');
      });

      // When & Then
      expect(() => controller.postTokenAccess(mockRequest)).toThrow(
        UnauthorizedException
      );
    });

    it('서비스 메서드 호출 시 발생하는 예외를 그대로 전파해야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.loginWithEmail.mockRejectedValue(
        new Error('데이터베이스 연결 오류')
      );

      // When & Then
      await expect(controller.postLoginEmail(loginDto)).rejects.toThrow(
        '데이터베이스 연결 오류'
      );
    });
  });
});
