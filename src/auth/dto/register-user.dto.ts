import { IsString } from "class-validator";
import { LoginDto } from "./login.dto";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterUserDto extends LoginDto {
    @IsString()
    @ApiProperty({ description: '닉네임', example: ''})
    nickname: string;
}