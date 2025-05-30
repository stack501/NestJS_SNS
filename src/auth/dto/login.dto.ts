import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

/**
 * 로그인 데이터 전송 객체
 * 
 * 사용자 로그인 요청 시 필요한 데이터 구조를 정의합니다.
 * 이메일과 비밀번호를 통한 인증 방식을 사용합니다.
 */
export class LoginDto {
    /**
     * 사용자 이메일 주소
     * 
     * 로그인 시 사용자 식별에 사용되는 고유한 이메일 주소입니다.
     * 유효한 이메일 형식이어야 하며, 시스템에 등록된 이메일이어야 합니다.
     */
    @IsString()
    @ApiProperty({ description: '사용자 이메일 주소', example: 'user@example.com' })
    email: string;
  
    /**
     * 사용자 비밀번호
     * 
     * 로그인 인증에 사용되는 비밀번호입니다.
     * 보안을 위해 적절한 복잡도를 가져야 합니다.
     */
    @IsString()
    @ApiProperty({ description: '사용자 비밀번호', example: 'SecurePassword123!' })
    password: string;
}