import { IsNumber } from "class-validator";

/**
 * 채팅방 입장 DTO
 * 하나 이상의 채팅방에 동시 입장할 때 사용
 */
export class EnterChatDto {
    /**
     * 입장할 채팅방 ID 배열
     * 각 요소는 숫자(채팅방 ID)여야 함
     */
    @IsNumber({}, {each: true})
    chatIds: number[];
}