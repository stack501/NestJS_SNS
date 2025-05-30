import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ChatsMessagesService } from "./messages.service";
import { BasePaginationDto } from "src/common/dto/base-pagination.dto";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthScheme } from "src/common/const/auth-schema.const";

/**
 * 채팅 메시지 관련 API 엔드포인트를 제공하는 컨트롤러
 * 특정 채팅방의 메시지 조회 기능을 제공합니다
 */
@Controller('chats/:cid/messages')
export class MessagesController {
    constructor(
        private readonly messagesService: ChatsMessagesService,
    ) {}

    /**
     * 특정 채팅방의 메시지 목록을 페이징하여 조회합니다
     * @param id 채팅방 ID
     * @param dto 페이징 정보가 담긴 DTO
     * @returns 페이징된 메시지 목록
     */
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