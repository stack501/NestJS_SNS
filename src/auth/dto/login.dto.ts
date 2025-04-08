import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LoginDto {
    @IsString()
    @ApiProperty({ description: '사용자 이메일', example: '' })
    email: string;
  
    @IsString()
    @ApiProperty({ description: '사용자 비밀번호', example: '' })
    password: string;
}