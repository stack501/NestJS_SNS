import { PickType } from "@nestjs/mapped-types";
import { MessagesModel } from "../entity/messages.entity";
import { IsNumber, IsOptional } from "class-validator";

export class CreateMessagesDto extends PickType(MessagesModel, [
    'message',
]) {
    @IsNumber()
    @IsOptional()
    whisperTargetId?: number;

    @IsNumber()
    @IsOptional()
    chatId?: number;
}