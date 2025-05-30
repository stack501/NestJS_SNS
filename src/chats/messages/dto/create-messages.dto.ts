import { PickType } from "@nestjs/mapped-types";
import { MessagesModel } from "../entity/messages.entity";
import { IsNumber, IsOptional } from "class-validator";

/**
 * 메시지 생성 DTO
 * 일반 채팅 메시지와 귓속말 메시지 생성을 모두 지원
 */
export class CreateMessagesDto extends PickType(MessagesModel, [
    'message',  // 메시지 내용
]) {
    /**
     * 귓속말 대상 사용자 ID
     * 귓속말을 보낼 때만 사용 (선택적)
     */
    @IsNumber()
    @IsOptional()
    whisperTargetId?: number;

    /**
     * 채팅방 ID
     * 일반 채팅 메시지를 보낼 때 사용 (선택적)
     */
    @IsNumber()
    @IsOptional()
    chatId?: number;
}