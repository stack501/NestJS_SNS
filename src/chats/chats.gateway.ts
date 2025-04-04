import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { CreateChatDto } from "./dto/create-chat.dto";
import { ChatsService } from "./chats.service";
import { EnterChatDto } from "./dto/enter-chat.dto";
import { UseFilters, UsePipes, ValidationPipe } from "@nestjs/common";
import { WsErrorFilter } from "src/common/exception-filter/ws.exception-filter";
import { CreateMessagesDto } from "./messages/dto/create-messages.dto";
import { ChatsMessagesService } from "./messages/messages.service";
import { MessagesModel } from "./messages/entity/messages.entity";
import { UsersModel } from "src/users/entity/users.entity";
import { AuthService } from "src/auth/auth.service";
import { UsersService } from "src/users/users.service";

@UsePipes(
    new ValidationPipe({
      transform: true, 
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true, 
      forbidNonWhitelisted: true,
    }),
  )
@WebSocketGateway({
    // ws://localhost:3000/chats
    namespace: 'chats'
})
@UseFilters(WsErrorFilter)
export class ChatsGateway implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect {
    constructor(
        private readonly chatsService: ChatsService,
        private readonly messagesService: ChatsMessagesService,
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
    ) {}

    @WebSocketServer()
    server: Server;

    afterInit(server: any) {
        console.log(`${server} after gateway init`);
    }

    handleDisconnect(socket: Socket) {
        console.log(`on disconnect called : ${socket.id}`);
    }

    async handleConnection(socket: Socket & {user: UsersModel}) {
        console.log(`on connect called : ${socket.id}`);

        const headers = socket.handshake.headers;

        // Bearer xxxxxx
        const rawToken = headers['authorization'] as string;

        if (!rawToken) {
            socket.disconnect();
        }

        try {
            const token = this.authService.extractTokenFromHeader(
                rawToken,
                true,
            );

            const payload = this.authService.verifyToken(token);
            const user = await this.usersService.getUserByEmail(payload.email) as UsersModel;

            socket.user = user;

            return true;
        } catch (e) {
            console.log(e);
            socket.disconnect();
        }
    }

    @SubscribeMessage('create_chat')
    async createChat(
        @MessageBody() data: CreateChatDto,
        @ConnectedSocket() socket: Socket & {user: UsersModel},
    ) {
        const chat = await this.chatsService.createChat(
            data,
        );
    }

    @SubscribeMessage('enter_chat')
    async enterChat(
        // 방의 chat ID들을 리스트로 받는다.
        @MessageBody() data: EnterChatDto,
        @ConnectedSocket() socket: Socket & {user: UsersModel},
    ) {
        for(const chatId of data.chatIds) {
            const exists = await this.chatsService.checkIfChatExists(chatId);

            if(!exists) {
                throw new WsException({
                    code: 100,
                    message: `존재하지 않는 chat 입니다. chatId: ${chatId}`,
                });
            }
        }

        await socket.join(data.chatIds.map((x) => x.toString()));
    }

    // socket.on('send_message', (message) => { console.log(message) });
    @SubscribeMessage('send_message')
    async sendMessage(
        @MessageBody() dto: CreateMessagesDto,
        @ConnectedSocket() socket: Socket & {user: UsersModel},
    ) {
        const chatExists = await this.chatsService.checkIfChatExists(dto.chatId);

        if(!chatExists) {
            throw new WsException({
                code: 100,
                message: `존재하지 않는 chat 입니다. chatId: ${dto.chatId}`,
            });
        }

        const message = await this.messagesService.createMessage(dto, socket.user.id) as MessagesModel;

        // broadcast
        socket.to(message.chat.id.toString()).emit('receive_message', message.message);

        // room 통신
        // this.server.in(message.chatId.toString()).emit('receive_message', message.message);
    }
}