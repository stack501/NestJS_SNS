import { IsString } from "class-validator";
import { ChatsModel } from "src/chats/entity/chats.entity";
import { BaseModel } from "src/common/entity/base.entity";
import { UsersModel } from "src/users/entity/users.entity";
import { Column, Entity, ManyToOne } from "typeorm";

/**
 * 채팅 메시지 엔티티 모델 (MessagesModel)
 * 
 * 채팅방 내에서 주고받는 메시지 정보를 나타냅니다. BaseModel을 상속받습니다.
 */
@Entity()
export class MessagesModel extends BaseModel {
    /**
     * 메시지가 속한 채팅방
     * 
     * ChatsModel과의 다대일(ManyToOne) 관계입니다.
     * 이 메시지가 어떤 채팅방에 속해있는지를 나타냅니다.
     * ChatsModel의 'messages' 필드와 연결됩니다.
     */
    @ManyToOne(() => ChatsModel, (chat) => chat.messages)
    chat: ChatsModel;

    /**
     * 메시지 작성자
     * 
     * UsersModel과의 다대일(ManyToOne) 관계입니다.
     * 이 메시지를 작성한 사용자를 나타냅니다.
     * UsersModel의 'messages' 필드와 연결됩니다. (일반 메시지용)
     */
    @ManyToOne(() => UsersModel, (user) => user.messages)
    author: UsersModel;

    /**
     * 귓속말 대상 사용자 (선택적)
     * 
     * UsersModel과의 다대일(ManyToOne) 관계입니다.
     * 메시지가 특정 사용자에게 보내는 귓속말인 경우, 그 대상 사용자를 나타냅니다.
     * 일반 메시지의 경우 null일 수 있습니다.
     */
    @ManyToOne(() => UsersModel, (user) => user.whisperMessages)
    whisperTargetUser: UsersModel;

    /**
     * 메시지 내용
     * 
     * 실제 메시지의 텍스트 내용입니다.
     * 문자열 타입이어야 합니다.
     */
    @Column()
    @IsString()
    message: string;
}