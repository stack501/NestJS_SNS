import { IsString } from "class-validator";
import { LoginDto } from "./login.dto";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 사용자 등록 데이터 전송 객체
 * 
 * 새로운 사용자 등록 요청 시 필요한 데이터 구조를 정의합니다.
 * 로그인 DTO를 확장하여 추가적인 사용자 등록 필드를 포함합니다.
 * 이메일, 비밀번호와 함께 닉네임 정보가 필요합니다.
 */
export class RegisterUserDto extends LoginDto {
    /**
     * 사용자 닉네임
     * 
     * 사용자의 프로필 식별을 위한 고유한 닉네임입니다.
     * 다른 사용자들에게 표시되는 사용자명으로 사용됩니다.
     */
    @IsString()
    @ApiProperty({ description: '사용자 닉네임', example: 'user123'})
    nickname: string;
}