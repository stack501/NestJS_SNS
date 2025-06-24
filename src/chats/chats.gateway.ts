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

/**
 * 채팅 웹소켓 게이트웨이
 * 
 * 실시간 채팅 기능을 제공하는 WebSocket 게이트웨이입니다.
 * 채팅방 생성, 입장, 메시지 전송 및 귓속말 기능을 지원합니다.
 * 
 * @namespace chats
 */
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
    /**
     * 채팅 게이트웨이 생성자
     * 
     * @param chatsService 채팅 서비스
     * @param messagesService 메시지 서비스
     * @param authService 인증 서비스
     * @param usersService 사용자 서비스
     */
    constructor(
        private readonly chatsService: ChatsService,
        private readonly messagesService: ChatsMessagesService,
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
    ) {}

    /**
     * WebSocket 서버 인스턴스
     */
    @WebSocketServer()
    server: Server;

    /**
     * 게이트웨이 초기화 후 실행되는 메서드
     * 
     * @param server WebSocket 서버 인스턴스
     */
    afterInit(server: any) {
        console.log(`${server} after gateway init`);
    }

    /**
     * 클라이언트 연결 해제 시 실행되는 메서드
     * 
     * @param socket 연결 해제된 소켓
     */
    handleDisconnect(socket: Socket) {
        console.log(`on disconnect called : ${socket.id}`);
    }

    /**
     * 클라이언트 연결 시 실행되는 메서드
     * 
     * JWT 토큰을 검증하고 사용자 정보를 소켓에 저장합니다.
     * 각 사용자를 고유한 룸에 참여시켜 개별 메시지 전송을 가능하게 합니다.
     * 
     * @param socket 연결된 소켓 (사용자 정보 포함)
     * @returns 연결 성공 여부
     */
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

            // 각 사용자에게 고유한 룸(예: user id)을 할당하여 join 시킵니다.
            await socket.join(user.id.toString());

            return true;
        } catch (e) {
            console.log(e);
            socket.disconnect();
        }
    }

    /**
     * 새 채팅방 생성
     * 
     * @param data 채팅방 생성 데이터
     * @param socket 요청한 클라이언트 소켓
     * @returns 생성된 채팅방 정보
     */
    @SubscribeMessage('create_chat')
    async createChat(
        @MessageBody() data: CreateChatDto,
    ) {
        await this.chatsService.createChat(
            data,
        );
    }

    /**
     * 채팅방 입장
     * 
     * 지정된 채팅방 ID 목록의 유효성을 검사하고,
     * 유효한 채팅방들에 소켓을 참여시킵니다.
     * 
     * @param data 입장할 채팅방 ID 목록
     * @param socket 요청한 클라이언트 소켓
     * @throws WsException 존재하지 않는 채팅방 ID가 있을 경우
     */
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

    /**
     * 메시지 전송
     * 
     * 채팅방 메시지 또는 귓속말을 전송합니다.
     * 채팅방 메시지는 해당 채팅방의 모든 참여자에게 브로드캐스트되고,
     * 귓속말은 지정된 사용자에게만 전송됩니다.
     * 
     * @param dto 메시지 생성 데이터 (채팅방 ID 또는 귓속말 대상 ID 포함)
     * @param socket 메시지를 전송하는 클라이언트 소켓
     * @throws WsException 존재하지 않는 채팅방 또는 사용자일 경우
     * @returns 생성된 메시지 정보
     */
    @SubscribeMessage('send_message')
    async sendMessage(
        @MessageBody() dto: CreateMessagesDto,
        @ConnectedSocket() socket: Socket & {user: UsersModel},
    ) {
        if(dto.chatId !== undefined && dto.chatId !== null) {
            const chatExists = await this.chatsService.checkIfChatExists(dto.chatId);

            if(!chatExists) {
                throw new WsException({
                    code: 100,
                    message: `존재하지 않는 chat 입니다. chatId: ${dto.chatId}`,
                });
            }
        }

        if(dto.whisperTargetId !== undefined && dto.whisperTargetId !== null) {
            const userExists = await this.usersService.checkIfUserExists(dto.whisperTargetId);

            if(!userExists) {
                throw new WsException({
                    code: 100,
                    message: `존재하지 않는 user 입니다. whisperTargetId: ${dto.whisperTargetId}`,
                });
            }
        }

        const message = await this.messagesService.createMessage(dto, socket.user.id) as MessagesModel;

        // broadcast
        if (message.chat && message.chat.id) {
            // 해당 채팅방에 join된 모든 사용자에게 메시지 전달.
            socket.to(message.chat.id.toString()).emit('receive_message', message.message);
        }

        // 귓속말인 경우 (whisperTargetId가 있을 때)
        if (dto.whisperTargetId) {
            // 대상 사용자는 연결 시 자신을 user id로 join 했으므로, 해당 룸으로 emit 하면 귓속말이 전달됩니다.
            this.server.to(dto.whisperTargetId.toString()).emit('receive_whisper', {
                message: message.message,
                from: socket.user.id,
            });
    
            // 발신자에게도 귓속말 전송(본인도 귓속말 내역을 확인하도록)
            socket.emit('receive_whisper', {
                message: message.message,
                from: socket.user.id,
            });
        }

        // room 통신 (특정 room에 속해있는 소켓들에게 브로드캐스트)
        // this.server.in(message.chatId.toString()).emit('receive_message', message.message);
    }
}