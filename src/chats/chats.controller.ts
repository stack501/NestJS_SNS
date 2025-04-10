import { Controller, Get, Query } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { PaginateChatDto } from './dto/paginate-chat.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthScheme } from 'src/common/const/auth-schema.const';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  @ApiBearerAuth(AuthScheme.ACCESS)
  @ApiOperation({ 
    summary: '생성된 모든 채팅방 보기', 
    description: 'create_chat 으로 생성된 모든 채팅방을 불러옵니다.' 
  })
  paginateChat(
    @Query() dto: PaginateChatDto,
  ) {
    return this.chatsService.paginateChats(dto);
  }
}
