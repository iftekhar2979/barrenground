import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { group } from 'console';
import { Server } from 'http';
import { ObjectId } from 'mongoose';
import { Socket } from 'socket.io';
import { ConversationService } from 'src/conversation/conversation.service';
import { CreateMessageDto } from 'src/message/dto/createMessage.dto';
import { MessageService } from 'src/message/message.service';
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
    private readonly conversationService: ConversationService
  ) {
    
  }
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
      console.log(this.connectedClients.size);
      // socket.on('send-message', (data) => {
      //   this.handleSendMessage(payload, data, socket);
      // });
      socket.on('join', ({groupId}) => {
        if(!groupId){
            throw new Error("Invalid GroupId")
        }
        socket.join(groupId)
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
    payload: { id: ObjectId },
    data: CreateMessageDto,
    socket: Socket,
  ): Promise<void> {
    try {
        let room=data.groupId
      if (!data.groupId || !data.content) {
        throw new Error('Invalid message data!');
      }
      socket.join(room);
      let msgBody: CreateMessageDto = {
        sender: payload.id,
        groupId: data.groupId,
        content: data.content,
        type: 'text'
      }

    let event=`conversation-${data.groupId}`
    socket.to(room).emit(event,msgBody)
    socket.emit(event, msgBody);  
      let conversationUpdate = {
        _id: msgBody.groupId,
        participantName: '',
        messageType: 'text',
        lastMessage: data.content,
        lastMessageCreatedAt: new Date().toISOString(),
        profilePicture: '',
      };
    } catch (error) {
      console.error('Error handling send-message:', error.message);
      socket.emit(`error:${data.groupId}`, {
        message: 'Failed to send message.',
      });
    }
  }
}
