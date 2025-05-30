import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatsModel } from './entity/chats.entity';
import { Repository } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';
import { CommonService } from 'src/common/common.service';
import { PaginateChatDto } from './dto/paginate-chat.dto';

/**
 * 채팅방 관련 비즈니스 로직을 처리하는 서비스
 * 채팅방 생성 및 조회 기능을 제공합니다
 */
@Injectable()
export class ChatsService {
    constructor(
        @InjectRepository(ChatsModel)
        private readonly chatsRepository: Repository<ChatsModel>,
        private readonly commonService: CommonService,
    ){}

    /**
     * 채팅방 목록을 페이징하여 조회합니다
     * @param dto 페이징 정보가 담긴 DTO
     * @returns 페이징된 채팅방 목록
     */
    paginateChats(dto: PaginateChatDto) {
        return this.commonService.paginate(dto,
            this.chatsRepository,
            {
                relations: {
                    users: true,
                }
            },
            'chats',
        )
    }

    /**
     * 새로운 채팅방을 생성합니다
     * @param dto 채팅방 생성 정보가 담긴 DTO
     * @returns 생성된 채팅방 정보
     */
    async createChat(dto: CreateChatDto) {
        const chat = await this.chatsRepository.save({
            users: dto.userIds.map((id) => ({id})),
        });

        return this.chatsRepository.findOne({
            where: {
                id: chat.id,
            }
        });
    }

    /**
     * 특정 ID의 채팅방 존재 여부를 확인합니다
     * @param chatId 채팅방 ID
     * @returns 채팅방 존재 여부
     */
    async checkIfChatExists(chatId: number) {
        const exists = this.chatsRepository.exists({
            where: {
                id: chatId,
            }
        });

        return exists;
    }
}
