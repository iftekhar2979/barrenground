import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { group } from 'console';
import { Server } from 'http';
import mongoose, { ObjectId } from 'mongoose';
import { Socket } from 'socket.io';
import { ConversationService } from 'src/conversation/conversation.service';
import { CreateMessageDto } from 'src/message/dto/createMessage.dto';
import { MessageService } from 'src/message/message.service';
import { ObjectId as mongoId } from 'mongodb';
import { ChatService } from 'src/chat/chat.service';
import { GroupService } from 'src/group-participant/group-participant.service';
// import { GroupService } from 'src/group-participant/group-participant.service';
// import { ProfileService } from 'src/profile/profile.service';

@Injectable()
@Injectable()
export class SocketService {
  public io: Socket;
  public connectedClients: Map<string, Socket> = new Map();
  public connectedUsers: Map<string, { name: string; socketID: string }> =
    new Map();
  private writeInterval: NodeJS.Timeout;
  constructor(
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
    private readonly chatService: ChatService,
    private readonly groupService: GroupService,
    // private readonly groupParticipant:GroupService
  ) {}
  afterInit(server: Server) {
    console.log('Socket server initialized');
    server.on('error', (error) => {
      console.error('Socket server error:', error.message);
    });
  }

  handleConnection(socket: Socket): void {
    try {
      const clientId = socket.id;
      const token = socket.handshake.headers.authorization;
      console.log('Connected', socket.id);
      if (!token) {
        throw new UnauthorizedException(
          'You are not authorized to access this resource!',
        );
      }
      const jwt = token.split(' ')[1];
      const payload = this.jwtService.verify(jwt);

      this.connectedUsers.set(payload.id, {
        name: payload.name,
        socketID: clientId,
      });

      this.connectedClients.set(clientId, socket);
      // console.log(this.connectedClients.size);
      socket.on('send-message', (data) => {
        this.handleSendMessage(payload, data, socket);
      });
      socket.on('join', ({ groupId }) => {
        if (!groupId) {
          throw new Error('Invalid GroupId');
        }
        socket.join(groupId);
      });
      //   console.log(this.connectedUsers);
      // socket.on('seen', (data) => {
      //   // console.log(data);
      //   this.handleMessageSeen(payload.id, data.conversationID);
      // });
      //   socket.on('call-end', (data) => {
      //     this.handleCallEnd(payload, data, socket);
      //   });
      //   socket.on('swipes', () => {
      //     console.log("swipes",payload)
      //     this.handleSwipesCount(payload, socket);
      //   });
      // socket.on("conversations",(data))
      socket.on('disconnect', () => {
        // console.log(this.connectedUsers)
        console.log('disconnected', this.connectedUsers.get(payload.id));
        // this.profileService.createBulkDisconnect(this.connectedUsers);
        this.connectedClients.delete(clientId);
        this.connectedUsers.delete(payload.id);
      });
    } catch (error) {
      console.error('Error handling connection:', error.message);

      socket.disconnect(true); // Disconnect the socket if an error occurs
    }
  }
  handleDisconnection(socket: Socket, userId: string): void {
    this.connectedClients.delete(socket.id);
    this.connectedUsers.delete(userId);
  }
  async handleSendMessage(
    payload: { id: string },
    data: {
      groupId: string;
      content: string;
      messageOn: 'group' | 'individual';
    },
    socket: Socket,
  ): Promise<void> {
    try {
      let room = data.groupId.toString();
      if (!data.groupId || !data.content || !data.messageOn) {
        throw new Error('Invalid message data!');
      }
      let groupId = new mongoId(data.groupId) as unknown as ObjectId;
      let userId = new mongoId(payload.id.toString()) as unknown as ObjectId;
      let msgBody: CreateMessageDto = {
        sender: userId,
        groupId: groupId,
        conversationId: groupId,
        content: data.content,
        type: 'text',
      };

      if (data.messageOn === 'group') {
        msgBody.conversationId = null;
        let userExist = await this.groupService.checkMyRole(
          data.groupId,
          payload.id,
        );
        if (!userExist) {
          socket.emit('error', 'User Is Not From This Group');
          throw new Error('User Is Not From This Group');
        }
      } else {
        let userExist = await this.chatService.isSenderMember(groupId, userId);
        console.log(userExist)
        if (!userExist) {
          socket.emit('error', 'User Is Not From This Conversation');
          throw new Error('User Is Not From This Conversation');
        }
        msgBody.groupId = null;
      }
      socket.join(room);

      let event = `conversation-${data.groupId}`;

      
      socket.to(room).emit(event, msgBody);
      socket.emit(event, msgBody);
      await this.messageService.create(msgBody)
      // let conversationUpdate = {
      //   _id: msgBody.groupId,
      //   participantName: '',
      //   messageType: 'text',
      //   lastMessage: data.content,
      //   lastMessageCreatedAt: new Date().toISOString(),
      //   profilePicture: '',
      // };
    } catch (error) {
      console.log(error)
      console.error('Error handling send-message:', error.message);
      socket.emit(`error:${data.groupId}`, {
        message: 'Failed to send message.',
      });
    }
  }
}
