import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ChatsMessagesService } from "./messages.service";
import { BasePaginationDto } from "src/common/dto/base-pagination.dto";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthScheme } from "src/common/const/auth-schema.const";

@Controller('chats/:cid/messages')
export class MessagesController {
    constructor(
        private readonly messagesService: ChatsMessagesService,
    ) {}

    @Get()
    @ApiBearerAuth(AuthScheme.ACCESS)
    @ApiOperation({ 
        summary: '특정 채팅방의 메세지 불러오기', 
        description: 'chatId에 해당되는 곳의 모든 메세지를 불러옵니다.' 
    })
    paginateMessage(
        @Param('cid', ParseIntPipe) id: number,
        @Query() dto: BasePaginationDto,
    ) {
        return this.messagesService.paginateMessages(
            dto,
            {
                where: {
                    chat: {
                        id,
                    }
                },
                relations: {
                    author: true,
                    chat: true,
                }
            }
        );
    }
}