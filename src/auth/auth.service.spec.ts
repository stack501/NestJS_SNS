/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UsersModel, RoleEnum } from '../users/entity/users.entity';

// bcrypt를 전역적으로 모킹
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

/**
 * AuthService 테스트
 * 인증 관련 비즈니스 로직들의 동작을 검증합니다
 */
describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let usersService: UsersService;

  // Mock JwtService
  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  // Mock UsersService
  const mockUsersService = {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
  };

  // Mock 설정 객체
  const mockConfig = {
    jwt: {
      secretKey: 'test-secret-key',
    },
    encrypt: {
      hash_Rounds: '10',
    },
  };

  // Mock Logger
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  // 테스트용 사용자 데이터
  const mockUser: UsersModel = {
    id: 1,
    email: 'test@example.com',
    nickname: 'testuser',
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: 'CONFIGURATION(app)',
          useValue: mockConfig,
        },
        {
          provide: 'winston',
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('서비스 초기화', () => {
    it('AuthService가 정의되어야 합니다', () => {
      expect(service).toBeDefined();
    });

    it('JwtService가 정의되어야 합니다', () => {
      expect(jwtService).toBeDefined();
    });

    it('UsersService가 정의되어야 합니다', () => {
      expect(usersService).toBeDefined();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('Bearer 토큰을 성공적으로 추출해야 합니다', () => {
      // Given
      const header = 'Bearer valid-token';

      // When
      const result = service.extractTokenFromHeader(header, true);

      // Then
      expect(result).toBe('valid-token');
    });

    it('Basic 토큰을 성공적으로 추출해야 합니다', () => {
      // Given
      const header = 'Basic base64-encoded-token';

      // When
      const result = service.extractTokenFromHeader(header, false);

      // Then
      expect(result).toBe('base64-encoded-token');
    });

    it('잘못된 Bearer 토큰 형식에 대해 예외를 발생시켜야 합니다', () => {
      // Given
      const header = 'Invalid token-format';

      // When & Then
      expect(() => service.extractTokenFromHeader(header, true)).toThrow(
        UnauthorizedException
      );
      expect(() => service.extractTokenFromHeader(header, true)).toThrow(
        '잘못된 토큰입니다.'
      );
    });

    it('잘못된 Basic 토큰 형식에 대해 예외를 발생시켜야 합니다', () => {
      // Given
      const header = 'Bearer token-instead-of-basic';

      // When & Then
      expect(() => service.extractTokenFromHeader(header, false)).toThrow(
        UnauthorizedException
      );
    });

    it('토큰 부분이 누락된 경우 예외를 발생시켜야 합니다', () => {
      // Given
      const header = 'Bearer';

      // When & Then
      expect(() => service.extractTokenFromHeader(header, true)).toThrow(
        UnauthorizedException
      );
    });
  });

  describe('decodeBasicToken', () => {
    it('올바른 Basic 토큰을 성공적으로 디코딩해야 합니다', () => {
      // Given
      const base64String = Buffer.from('test@example.com:password123').toString('base64');

      // When
      const result = service.decodeBasicToken(base64String);

      // Then
      expect(result).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('잘못된 형식의 Basic 토큰에 대해 예외를 발생시켜야 합니다', () => {
      // Given
      const base64String = Buffer.from('invalid-format').toString('base64');

      // When & Then
      expect(() => service.decodeBasicToken(base64String)).toThrow(
        UnauthorizedException
      );
      expect(() => service.decodeBasicToken(base64String)).toThrow(
        '잘못된 유형의 토큰입니다.'
      );
    });

    it('잘못된 Base64 인코딩에 대해 예외를 발생시켜야 합니다', () => {
      // Given
      const invalidBase64 = 'invalid-base64!@#';

      // When & Then
      expect(() => service.decodeBasicToken(invalidBase64)).toThrow(
        UnauthorizedException
      );
    });
  });

  describe('verifyToken', () => {
    it('유효한 JWT 토큰을 성공적으로 검증해야 합니다', () => {
      // Given
      const token = 'valid-jwt-token';
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        type: 'access',
      };

      mockJwtService.verify.mockReturnValue(mockDecoded);

      // When
      const result = service.verifyToken(token);

      // Then
      expect(jwtService.verify).toHaveBeenCalledWith(token, {
        secret: mockConfig.jwt.secretKey,
      });
      expect(result).toEqual(mockDecoded);
    });

    it('만료된 토큰에 대해 예외를 발생시켜야 합니다', () => {
      // Given
      const token = 'expired-jwt-token';
      const error = new Error('jwt expired');

      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      // When & Then
      expect(() => service.verifyToken(token)).toThrow(UnauthorizedException);
      expect(() => service.verifyToken(token)).toThrow(
        'Error: jwt expired : 토큰이 만료되었거나 잘못된 토큰입니다.'
      );
    });

    it('잘못된 토큰에 대해 예외를 발생시켜야 합니다', () => {
      // Given
      const token = 'invalid-jwt-token';
      const error = new Error('invalid signature');

      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      // When & Then
      expect(() => service.verifyToken(token)).toThrow(UnauthorizedException);
    });
  });

  describe('rotateToken', () => {
    it('리프레시 토큰으로 새 액세스 토큰을 성공적으로 발급해야 합니다', () => {
      // Given
      const refreshToken = 'valid-refresh-token';
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        type: 'refresh',
      };
      const newAccessToken = 'new-access-token';

      jest.spyOn(service, 'verifyToken').mockReturnValue(mockDecoded);
      jest.spyOn(service, 'signToken').mockReturnValue(newAccessToken);

      // When
      const result = service.rotateToken(refreshToken, false);

      // Then
      expect(service.verifyToken).toHaveBeenCalledWith(refreshToken);
      expect(service.signToken).toHaveBeenCalledWith(mockDecoded, false);
      expect(result).toBe(newAccessToken);
    });

    it('리프레시 토큰으로 새 리프레시 토큰을 성공적으로 발급해야 합니다', () => {
      // Given
      const refreshToken = 'valid-refresh-token';
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        type: 'refresh',
      };
      const newRefreshToken = 'new-refresh-token';

      jest.spyOn(service, 'verifyToken').mockReturnValue(mockDecoded);
      jest.spyOn(service, 'signToken').mockReturnValue(newRefreshToken);

      // When
      const result = service.rotateToken(refreshToken, true);

      // Then
      expect(service.signToken).toHaveBeenCalledWith(mockDecoded, true);
      expect(result).toBe(newRefreshToken);
    });

    it('액세스 토큰으로 토큰 갱신 시 예외를 발생시켜야 합니다', () => {
      // Given
      const accessToken = 'access-token';
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        type: 'access',
      };

      jest.spyOn(service, 'verifyToken').mockReturnValue(mockDecoded);

      // When & Then
      expect(() => service.rotateToken(accessToken, false)).toThrow(
        UnauthorizedException
      );
      expect(() => service.rotateToken(accessToken, false)).toThrow(
        '토큰 재발급은 Refresh 토큰으로만 가능합니다!'
      );
    });
  });

  describe('signToken', () => {
    it('액세스 토큰을 성공적으로 생성해야 합니다', () => {
      // Given
      const user = { id: 1, email: 'test@example.com' };
      const expectedToken = 'signed-access-token';

      mockJwtService.sign.mockReturnValue(expectedToken);

      // When
      const result = service.signToken(user, false);

      // Then
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: user.email,
          sub: user.id,
          type: 'access',
        },
        {
          secret: mockConfig.jwt.secretKey,
          expiresIn: 3600,
        }
      );
      expect(result).toBe(expectedToken);
    });

    it('리프레시 토큰을 성공적으로 생성해야 합니다', () => {
      // Given
      const user = { id: 1, email: 'test@example.com' };
      const expectedToken = 'signed-refresh-token';

      mockJwtService.sign.mockReturnValue(expectedToken);

      // When
      const result = service.signToken(user, true);

      // Then
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: user.email,
          sub: user.id,
          type: 'refresh',
        },
        {
          secret: mockConfig.jwt.secretKey,
          expiresIn: 2592000,
        }
      );
      expect(result).toBe(expectedToken);
    });
  });

  describe('loginUser', () => {
    it('사용자 로그인 토큰들을 성공적으로 생성해야 합니다', () => {
      // Given
      const user = { id: 1, email: 'test@example.com' };
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      jest.spyOn(service, 'signToken')
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

      // When
      const result = service.loginUser(user);

      // Then
      expect(service.signToken).toHaveBeenCalledWith(user, false);
      expect(service.signToken).toHaveBeenCalledWith(user, true);
      expect(result).toEqual({
        accessToken,
        refreshToken,
      });
    });
  });

  describe('authenticateWithEmailAndPassword', () => {
    it('올바른 이메일과 비밀번호로 사용자를 성공적으로 인증해야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUsersService.getUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // When
      const result = await service.authenticateWithEmailAndPassword(loginDto);

      // Then
      expect(usersService.getUserByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(result).toEqual(mockUser);
    });

    it('존재하지 않는 사용자에 대해 예외를 발생시켜야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUsersService.getUserByEmail.mockResolvedValue(null);

      // When & Then
      await expect(service.authenticateWithEmailAndPassword(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.authenticateWithEmailAndPassword(loginDto)).rejects.toThrow(
        '존재하지 않는 사용자입니다.'
      );
    });

    it('잘못된 비밀번호에 대해 예외를 발생시켜야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUsersService.getUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // When & Then
      await expect(service.authenticateWithEmailAndPassword(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.authenticateWithEmailAndPassword(loginDto)).rejects.toThrow(
        '비밀번호가 틀렸습니다.'
      );
    });

    it('데이터베이스 오류 시 예외를 그대로 전파해야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUsersService.getUserByEmail.mockRejectedValue(new Error('DB 연결 오류'));

      // When & Then
      await expect(service.authenticateWithEmailAndPassword(loginDto)).rejects.toThrow(
        'DB 연결 오류'
      );
    });
  });

  describe('loginWithEmail', () => {
    it('이메일 로그인을 성공적으로 처리해야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      jest.spyOn(service, 'authenticateWithEmailAndPassword').mockResolvedValue(mockUser);
      jest.spyOn(service, 'loginUser').mockReturnValue(tokens);

      // When
      const result = await service.loginWithEmail(loginDto);

      // Then
      expect(service.authenticateWithEmailAndPassword).toHaveBeenCalledWith(loginDto);
      expect(service.loginUser).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(tokens);
    });

    it('인증 실패 시 예외를 그대로 전파해야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      jest
        .spyOn(service, 'authenticateWithEmailAndPassword')
        .mockRejectedValue(new UnauthorizedException('비밀번호가 틀렸습니다.'));

      // When & Then
      await expect(service.loginWithEmail(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('registerWithEmail', () => {
    it('이메일 회원가입을 성공적으로 처리해야 합니다', async () => {
      // Given
      const registerDto: RegisterUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        nickname: 'newuser',
      };
      const hashedPassword = 'hashed-password';
      const createdUser = { ...mockUser, ...registerDto, password: hashedPassword };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.createUser.mockResolvedValue(createdUser);
      jest.spyOn(service, 'loginUser').mockReturnValue(tokens);

      // When
      const result = await service.registerWithEmail(registerDto);

      // Then
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(usersService.createUser).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
      expect(service.loginUser).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(tokens);
    });

    it('중복된 이메일로 회원가입 시 예외를 발생시켜야 합니다', async () => {
      // Given
      const registerDto: RegisterUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        nickname: 'testuser',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.createUser.mockRejectedValue(
        new Error('이미 존재하는 이메일입니다.')
      );

      // When & Then
      await expect(service.registerWithEmail(registerDto)).rejects.toThrow(
        '이미 존재하는 이메일입니다.'
      );
    });

    it('비밀번호 해싱 실패 시 예외를 발생시켜야 합니다', async () => {
      // Given
      const registerDto: RegisterUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        nickname: 'newuser',
      };

      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('해싱 실패'));

      // When & Then
      await expect(service.registerWithEmail(registerDto)).rejects.toThrow('해싱 실패');
    });
  });

  describe('이메일 마스킹 기능', () => {
    it('이메일을 올바르게 마스킹해야 합니다', () => {
      // Given
      const email = 'test@example.com';

      // When
      const result = (service as any).maskEmail(email);

      // Then
      expect(result).toBe('t***@example.com');
    });

    it('잘못된 이메일 형식에 대해 기본값을 반환해야 합니다', () => {
      // Given
      const invalidEmail = 'invalid-email';

      // When
      const result = (service as any).maskEmail(invalidEmail);

      // Then
      expect(result).toBe('invalid-email');
    });

    it('빈 이메일에 대해 기본값을 반환해야 합니다', () => {
      // Given
      const emptyEmail = '';

      // When
      const result = (service as any).maskEmail(emptyEmail);

      // Then
      expect(result).toBe('invalid-email');
    });
  });

  describe('로깅 기능', () => {
    it('토큰 추출 시 적절한 로그를 남겨야 합니다', () => {
      // Given
      const header = 'Bearer valid-token';

      // When
      service.extractTokenFromHeader(header, true);

      // Then
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Auth: Extracting token from header',
        expect.any(Object)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Auth: Token extracted successfully',
        expect.any(Object)
      );
    });

    it('토큰 검증 성공 시 적절한 로그를 남겨야 합니다', () => {
      // Given
      const token = 'valid-jwt-token';
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        type: 'access',
      };

      mockJwtService.verify.mockReturnValue(mockDecoded);

      // When
      service.verifyToken(token);

      // Then
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Auth: Verifying JWT token',
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth: Token verified successfully',
        expect.any(Object)
      );
    });

    it('인증 실패 시 적절한 경고 로그를 남겨야 합니다', async () => {
      // Given
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUsersService.getUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // When
      try {
        await service.authenticateWithEmailAndPassword(loginDto);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // 예외 무시 - 로깅만 확인
      }

      // Then
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Auth: Password verification failed',
        expect.any(Object)
      );
    });
  });
});
