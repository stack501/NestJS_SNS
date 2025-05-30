import { IsArray, IsNumber } from "class-validator";

/**
 * 채팅방 생성 DTO
 * 새로운 채팅방을 생성할 때 참여할 사용자들의 ID 목록을 받음
 */
export class CreateChatDto {
    /**
     * 채팅방에 참여할 사용자 ID 배열
     * 각 요소는 숫자(사용자 ID)여야 함
     */
    @IsArray()
    @IsNumber({}, {each: true})
    userIds: number[];
}