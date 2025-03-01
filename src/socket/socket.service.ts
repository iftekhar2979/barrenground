import { Conversation } from './../chat/chat.schema';
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'http';
import mongoose, { Model, ObjectId } from 'mongoose';
import { Socket } from 'socket.io';
import { CreateMessageDto } from 'src/message/dto/createMessage.dto';
import { ObjectId as mongoId } from 'mongodb';
import { Message } from 'src/message/message.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Group } from 'src/conversation/conversation.schema';
import { GroupMember } from 'src/group-participant/group-participant.schema';

@Injectable()
@Injectable()
export class SocketService {
  public io: Socket;
  public connectedClients: Map<string, Socket> = new Map();
  public connectedUsers: Map<
    string,
    { name: string; socketID: string; profilePicture: string }
  > = new Map();
  private writeInterval: NodeJS.Timeout;
  constructor(
    private readonly jwtService: JwtService,
    // private readonly messageService: MessageService,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(GroupMember.name)
    private readonly groupMemberModel: Model<GroupMember>,
  ) {}
  afterInit(server: Server) {
    console.log('Socket server initialized');
    server.on('error', (error) => {
      console.error('Socket server error:', error.message);
    });
  }

 async handleConnection(socket: Socket) {
    try {
      const clientId = socket.id;
      const token = socket.handshake.headers.authorization;
      console.log(
        `${socket.handshake.headers['user-agent']} Connected`,
        socket.id,
      );
      // console.log(socket.handshake.headers)
      if (!token) {
        socket.emit('error', 'You are not authorized to access this resource!');
        throw new UnauthorizedException(
          'You are not authorized to access this resource!',
        );
      }
      const jwt = token.split(' ')[1];
      const payload = this.jwtService.verify(jwt);
      console.log(token);

      this.connectedUsers.set(payload.id, {
        name: payload.name,
        socketID: clientId,
        profilePicture: payload.profilePicture,
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
        console.log('user Joined');
      });
        socket.broadcast.emit(`active-users`,{
          "message": `${payload.name} is Online .`,
          "isActive": true,
          "id": payload.id
      })
   
      socket.on('disconnect', () => {
        // console.log(this.connectedUsers)
        socket.broadcast.emit(`active-users`,{
          "message": `${payload.name} is offline .`,
          "isActive": false,
          "id": payload.id
      })
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
  async isSenderMember(
      conversationId: ObjectId,
      senderId: ObjectId,
    ): Promise<boolean> {
      const conversation = await this.conversationModel
        .findOne({
          _id: conversationId,
          participants: senderId,
        })
        .exec();
      if (!conversation) {
        throw new NotFoundException(
          ` sender is not a member of the conversation`,
        );
      }
  
      return true;
    }
   checkMyRole(groupId:string ,userId:string){
     return this.groupMemberModel.findOne({
           groupId: new mongoose.Types.ObjectId(groupId),
           userId: new mongoose.Types.ObjectId(userId),
         });
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
        let userExist = await this.checkMyRole(
          data.groupId,
          payload.id,
        );
        console.log("USER EXIST ",userExist)
        if (!userExist) {
          socket.emit('error', 'User Is Not From This Group');
          throw new Error('User Is Not From This Group');
        }
      } else {
        let userExist = await this.isSenderMember(groupId, userId);
        if (!userExist) {
          socket.emit('error', 'User Is Not From This Conversation');
          throw new Error('User Is Not From This Conversation');
        }
        msgBody.groupId = null;
      }
      socket.join(room);
      console.log('User Joined');
      let vals = this.connectedUsers.get(payload.id);
      let event = `conversation-${data.groupId}`;
      // this.connectedUsers
      console.log(vals);
      socket.to(room).emit(event, {
        senderName: vals.name,
        profilePicture: vals.profilePicture,
        ...msgBody,
      });
      socket.emit(event, {
        senderName: vals.name,
        profilePicture: vals.profilePicture,
        ...msgBody,
      });
      let msg = await this.messageModel.create(msgBody);
      if (data.messageOn === 'group') {
        let helo = await this.updateLastMessage(
          groupId,
          msg._id as unknown as ObjectId,
        );
        console.log(helo);
      } else {
        await this.updateConversation(
          groupId,
          msg._id as unknown as ObjectId,
        );
      }

      // let conversationUpdate = {
      //   _id: msgBody.groupId,
      //   participantName: '',
      //   messageType: 'text',
      //   lastMessage: data.content,
      //   lastMessageCreatedAt: new Date().toISOString(),
      //   profilePicture: '',
      // };
    } catch (error) {
      console.log(error);
      console.error('Error handling send-message:', error.message);
      socket.emit(`error:${data.groupId}`, {
        message: 'Failed to send message.',
      });
    }
  }
  updateLastMessage(groupId: ObjectId, messageID: ObjectId) {
    return this.groupMemberModel.findByIdAndUpdate(
      groupId,
      { lastMessage: messageID },
      { new: true },
    );
  }
  async updateConversation(conversationId: ObjectId, lastMessage: ObjectId) {
    let vals = await this.conversationModel.findById(conversationId);
    vals.lastMessage = lastMessage;
    await vals.save();
  }
  async myFriend(id: string) {
    try {
      let allFriends: any[] = [];
      //   const conversation = JSON.parse(cachedConversation as string);
      //   if (!conversation) return;
      //   if (conversation.length === 0) return;
      //   conversation.forEach((element) => {
      //     const friends = element.participants.filter(
      //       (participant: any) => participant._id.toString() !== id,
      //     );
      //     allFriends = [...allFriends, ...friends];
      //   });
      //   console.log(conversation);
      //   const friendsInfo = allFriends.map((friend: any) => ({
      //     id: friend._id,
      //     name: friend.name,
      //   }));

      //   return friendsInfo;
      // } else {
      const conversation: any = await this.conversationModel
        .find({
          participants: new mongoose.Types.ObjectId(id),
        })
        .populate({
          path: 'participants',
          select: 'id name',
        });
      if (!conversation) {
        return [];
      }
      conversation.forEach((element) => {
        const friends = element.participants.filter(
          (participant: any) => participant._id.toString() !== id,
        );
        allFriends = [...allFriends, ...friends];
      });
      const friendsInfo = allFriends.map((friend: any) => ({
        id: friend._id,
        name: friend.name,
      }));
      return friendsInfo;
    } catch (error) {
      console.error(
        'Error retrieving friends involved in conversation:',
        error,
      );
      throw error;
    }
  }
  async userActiveStatus(id: string, socket, friendsInfo: any[]) {
    friendsInfo.forEach((friend: any) => {
      if (this.connectedUsers.get(friend.id.toString())) {
        socket.emit('active-users', {
          message: `${friend.name} is online now.`,
          isActive: true,
          id: friend.id,
        });
      }
    });
    console.log(friendsInfo)
  }
  async userDisconnect(id: string, socket, friendsInfo: any[]) {
    try {
      friendsInfo.forEach((friend: any) => {
        const friendId = friend.id.toString();
        const friendSocket: any = this.connectedUsers.get(friendId);
        if (!friendSocket) {
          socket.emit('active-users', {
            message: `${friend.name} is offline .`,
            isActive: false, // Indicates the friend is no longer online
            id: friend.id, // The id of the disconnected user
          });
        }
      });
    } catch (error) {
      console.error('Error in userDisconnect:', error);
    }
  }

  getSocketByUserId(userId: string): Socket | undefined {
    const socketID = this.connectedUsers.get(userId)?.socketID;
    return socketID ? this.connectedClients.get(socketID) : undefined;
  }
}
