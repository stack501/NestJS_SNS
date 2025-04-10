import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MessagesModel } from "./entity/messages.entity";
import { FindManyOptions, Repository } from "typeorm";
import { CommonService } from "src/common/common.service";
import { BasePaginationDto } from "src/common/dto/base-pagination.dto";
import { CreateMessagesDto } from "./dto/create-messages.dto";

interface SavePayload {
    author: { id: number };
    message: string;
    chat?: { id: number };
    whisperTargetUser?: { id: number };
}

@Injectable()
export class ChatsMessagesService {
    constructor(
        @InjectRepository(MessagesModel)
        private readonly messagesRepository: Repository<MessagesModel>,
        private readonly commonService: CommonService,
    ) {}

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