import { Conversation } from './../chat/chat.schema';
import {
  ConflictException,
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
import { Message, PollVote, Reaction } from 'src/message/message.schema';
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
    @InjectModel(Reaction.name)
    private readonly reactionModel: Model<Reaction>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(GroupMember.name)
    private readonly groupMemberModel: Model<GroupMember>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
    @InjectModel(PollVote.name)
    private readonly pollVoteModel: Model<PollVote>,
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
      socket.on('vote', (data) => {
        this.handleVote(payload, data, socket);
      });
      const rooms = await this.handleUsersToJoinRoom(payload.id);
      socket.join(rooms);
      socket.on('join', ({ groupId }) => {
        if (!groupId) {
          throw new Error('Invalid GroupId');
        }
        socket.join(groupId);
        console.log('user Joined');
      });
      socket.broadcast.emit(`active-users`, {
        message: `${payload.name} is Online .`,
        isActive: true,
        id: payload.id,
      });

      socket.on(
        'reaction',
        (data: { messageId: string; reactionType: string }) => {
          this.handleReaction(payload, data, socket);
        },
      );
      socket.on('disconnect', () => {
        // console.log(this.connectedUsers)
        socket.broadcast.emit(`active-users`, {
          message: `${payload.name} is offline .`,
          isActive: false,
          id: payload.id,
        });
        console.log('disconnected', this.connectedUsers.get(payload.id));
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
  checkMyRole(groupId: string, userId: string) {
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
        let userExist = await this.checkMyRole(data.groupId, payload.id);
        console.log('USER EXIST ', userExist);
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
      let vals = this.connectedUsers.get(payload.id);
      let event = `conversation-${data.groupId}`;
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
      let updatedMessage;
      if (data.messageOn === 'group') {
        updatedMessage = await this.updateLastMessage(
          groupId,
          msg._id as unknown as ObjectId,
        );
      } else {
        updatedMessage = await this.updateConversation(
          groupId,
          msg._id as unknown as ObjectId,
        );
      }
      let conversationUpdate = {
        _id: data.groupId,
        name: data.messageOn === 'group' ? updatedMessage.name : vals.name,
        messageType: 'text',
        lastMessage: data.content,
        profilePicture:
          data.messageOn === 'group'
            ? updatedMessage.avatar
            : vals.profilePicture,
        lastMessageCreatedAt: new Date().toISOString(),
        updatedAt: new Date(),
        messageOn: data.messageOn,
      };
      if (data.messageOn === 'group') {
        socket.to(data.groupId).emit('groupListUpdate', conversationUpdate);
        socket.emit('groupListUpdate', conversationUpdate);
      } else {
        socket
          .to(data.groupId)
          .emit('conversationListUpdate', conversationUpdate);
        socket.emit('conversationListUpdate', conversationUpdate);
      }
    } catch (error) {
      console.log(error);
      console.error('Error handling send-message:', error.message);
      socket.emit(`error:${data.groupId}`, {
        message: 'Failed to send message.',
      });
    }
  }
  updateLastMessage(groupId: ObjectId, messageID: ObjectId) {
    // console.log(groupId,messageID)
    return this.groupModel.findByIdAndUpdate(
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
    console.log(friendsInfo);
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

  async handleVote(
    payload: { id: string },
    data: {
      groupId: string;
      optionIndex: number;
      msgId: string;
    },
    socket: Socket,
  ) {
    try {
      if (!data.msgId || !data.groupId || data.optionIndex === undefined) {
        throw new Error('Please provide Message ID, Group ID, and optionIndex');
      }

      const message = await this.messageModel.findById(data.msgId);
      if (!message || !message.poll) {
        throw new Error('Poll not found for this message');
      }

      if (
        data.optionIndex < 0 ||
        data.optionIndex >= message.poll.options.length
      ) {
        throw new Error('Invalid poll option index');
      }

      // ✅ Check if user has already voted
      const existingVote = await this.pollVoteModel.findOne({
        messageId: new mongoose.Types.ObjectId(data.msgId),
        userId: new mongoose.Types.ObjectId(payload.id),
      });

      if (existingVote) {
        // ✅ User has already voted, so unvote
        message.poll.options[existingVote.optionIndex].votes -= 1; // Decrease vote count
        await this.pollVoteModel.deleteOne({ _id: existingVote._id }); // Remove vote record
      } else {
        // ✅ User hasn't voted, register new vote
        await new this.pollVoteModel({
          messageId: new mongoose.Types.ObjectId(data.msgId),
          userId: new mongoose.Types.ObjectId(payload.id),
          optionIndex: data.optionIndex,
        }).save();

        message.poll.options[data.optionIndex].votes += 1; // Increase vote count
      }

      // ✅ Save updated message
      await message.save();

      // ✅ Broadcast updated poll to group
      socket.join(data.groupId);
      socket.to(data.groupId).emit(`conversation-${data.groupId}`, message);
      socket.emit(`conversation-${data.groupId}`, message);

      return message.poll;
    } catch (error) {
      console.log(error);
    }
  }

  async handleUsersToJoinRoom(userId: string): Promise<string[]> {
    const [rooms, conversations] = await Promise.all([
      this.groupMemberModel
        .find({ userId: new mongoId(userId) }, { groupId: 1, _id: 0 })
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean(),
      this.conversationModel
        .find({ participants: { $in: new mongoId(userId) } }, { _id: 1 })
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean(),
    ]);

    let conversation = [...rooms, ...conversations] as unknown as {
      groupId?: ObjectId;
      _id?: ObjectId;
    }[];

    const roomIds = conversation.map((room) =>
      room.groupId ? room.groupId.toString() : room._id.toString(),
    );
    return roomIds;
  }
  getSocketByUserId(userId: string): Socket | undefined {
    const socketID = this.connectedUsers.get(userId)?.socketID;
    return socketID ? this.connectedClients.get(socketID) : undefined;
  }
  async handleReaction(
    payload: { id: string; name: string; profilePicture: string },
    data: { messageId: string; reactionType: string },
    socket: Socket,
  ): Promise<void> {
    try {
      let messageId = new mongoId(data.messageId) as unknown as ObjectId;
      let userId = new mongoId(payload.id.toString()) as unknown as ObjectId;
  
      // Fetch the message
      let message = await this.messageModel.findById(messageId);
      if (!message) throw new Error('Message not found');
  
      // ✅ Convert reactions to a Map if it's not already
      if (!message.reactions || !(message.reactions instanceof Map)) {
        message.reactions = new Map(Object.entries({
          haha: 0,
          cancel: 0,
          like: 0,
          love: 0,
          angry: 0,
          ok: 0,
        }));
      }
  
      console.log("Message Before Reaction:", message);
  
      // Fetch the user's existing reaction
      let existingReaction: Reaction | null = await this.reactionModel.findOne({
        messageId,
        userId,
      });
  
      console.log('Existing Reaction:', existingReaction);
  
      const reactionType = String(data.reactionType); // Ensure it's a string
  
      if (existingReaction) {
        if (existingReaction.value === reactionType) {
          // ❌ If the user already reacted with the same type, remove the reaction
          const currentCount = message.reactions.get(reactionType) || 0;
          message.reactions.set(reactionType, Math.max(currentCount - 1, 0)); // Prevent negative values
          await this.reactionModel.deleteOne({ _id: existingReaction._id });
        } else {
          // 🔄 If the user changes the reaction, remove the old one and add the new one
          if (existingReaction.value) {
            const oldCount = message.reactions.get(existingReaction.value) || 0;
            message.reactions.set(existingReaction.value, Math.max(oldCount - 1, 0)); // Prevent negative values
          }
          const newCount = message.reactions.get(reactionType) || 0;
          message.reactions.set(reactionType, newCount + 1);
          existingReaction.value = reactionType;
          await existingReaction.save();
        }
      } else {
        // ➕ New reaction
        const newCount = message.reactions.get(reactionType) || 0;
        message.reactions.set(reactionType, newCount + 1);
  
        console.log("Message After Reaction:", message);
  
        const reaction = new this.reactionModel({
          messageId,
          userId,
          value: reactionType, // Ensure it's stored as a string
        });
  
        await Promise.all([reaction.save(), message.save()]);
      }
  
      // ✅ Ensure all values in `message.reactions` are numbers
      message.reactions.forEach((value, key) => {
        if (typeof value !== "number") {
          console.warn(`Invalid value in reactions for key: ${key}, resetting to 0`);
          message.reactions.set(key, 0);
        }
      });
  
      // ✅ Convert `Map` to a plain object before saving
      message.reactions = new Map(Object.entries(Object.fromEntries(message.reactions)));
  
      // Save the updated message
      await message.save();
  
      // Emit updated reaction data
      let room = message.groupId
        ? message.groupId.toString()
        : message.conversationId.toString();
  
      socket.to(room).emit('messageReactionUpdated', {
        messageId: data.messageId,
        reactions: Object.fromEntries(message.reactions), // Convert Map to JSON
      });
  
      socket.emit('messageReactionUpdated', {
        messageId: data.messageId,
        reactions: Object.fromEntries(message.reactions), // Convert Map to JSON
      });
  
    } catch (error) {
      console.error('Error handling message reaction:', error.message);
      socket.emit('error', { message: 'Failed to react to message.' });
    }
  }
  
  
  
}
