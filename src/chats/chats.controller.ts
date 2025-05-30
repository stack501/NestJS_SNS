import { Controller, Get, Query } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { PaginateChatDto } from './dto/paginate-chat.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthScheme } from 'src/common/const/auth-schema.const';

/**
 * 채팅방 관련 API 엔드포인트를 제공하는 컨트롤러
 * 채팅방 조회 기능을 제공합니다
 */
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  /**
   * 채팅방 목록을 페이징하여 조회합니다
   * @param dto 페이징 정보가 담긴 DTO
   * @returns 페이징된 채팅방 목록
   */
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
