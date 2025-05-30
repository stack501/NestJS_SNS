import { BaseModel } from "src/common/entity/base.entity";
import { UsersModel } from "src/users/entity/users.entity";
import { Entity, ManyToMany, OneToMany } from "typeorm";
import { MessagesModel } from "../messages/entity/messages.entity";

/**
 * 채팅방 엔티티 모델
 * 
 * 사용자 간의 채팅방 또는 대화를 나타냅니다
 * 참여자와 그들의 메시지를 포함합니다
 */
@Entity()
export class ChatsModel extends BaseModel {
    /**
     * 이 채팅에 참여하는 사용자들
     * UsersModel과의 다대다(Many-to-Many) 관계
     */
    @ManyToMany(() => UsersModel, (user) => user.chats)
    users: UsersModel[];

    /**
     * 이 채팅에서 보낸 메시지들
     * MessagesModel과의 일대다(One-to-Many) 관계
     */
    @OneToMany(() => MessagesModel, (message) => message.chat)
    messages: MessagesModel[];
}