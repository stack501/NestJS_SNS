import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MessagesModel } from "./entity/messages.entity";
import { FindManyOptions, Repository } from "typeorm";
import { CommonService } from "src/common/common.service";
import { BasePaginationDto } from "src/common/dto/base-pagination.dto";
import { CreateMessagesDto } from "./dto/create-messages.dto";

/**
 * 메시지 저장 데이터 인터페이스
 */
interface SavePayload {
    author: { id: number };
    message: string;
    chat?: { id: number };
    whisperTargetUser?: { id: number };
}

/**
 * 채팅 메시지 관련 비즈니스 로직을 처리하는 서비스
 * 메시지 생성 및 조회 기능을 제공합니다
 */
@Injectable()
export class ChatsMessagesService {
    constructor(
        @InjectRepository(MessagesModel)
        private readonly messagesRepository: Repository<MessagesModel>,
        private readonly commonService: CommonService,
    ) {}

    /**
     * 새로운 메시지를 생성합니다
     * @param dto 메시지 생성 정보가 담긴 DTO
     * @param authorId 작성자 ID
     * @returns 생성된 메시지 정보
     */
    async createMessage(
        dto: CreateMessagesDto,
        authorId: number,
    ) {
        const savePayload: SavePayload = {
            author: { id: authorId },
            message: dto.message,
        };

        if (dto.chatId !== undefined && dto.chatId !== null) {
            savePayload.chat = { id: dto.chatId };
        }

        if (dto.whisperTargetId !== undefined && dto.whisperTargetId !== null) {
            savePayload.whisperTargetUser = { id: dto.whisperTargetId };
        }
    
        const message = await this.messagesRepository.save(savePayload);

        return this.messagesRepository.findOne({
            where: {
                id: message.id,
            },
            relations: {
                chat: true,
                whisperTargetUser: true,
            }
        });
    }

    /**
     * 메시지 목록을 페이징하여 조회합니다
     * @param dto 페이징 정보가 담긴 DTO
     * @param overrideFindOptions 추가적인 조회 옵션
     * @returns 페이징된 메시지 목록
     */
    paginateMessages(
        dto: BasePaginationDto,
        overrideFindOptions: FindManyOptions<MessagesModel>,
    ) {
        return this.commonService.paginate(
            dto,
            this.messagesRepository,
            overrideFindOptions,
            'messages',
        )
    }
}