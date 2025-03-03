// import { CreateMessageDto } from 'src/message/dto/createMessage.dto';
// import { pipeline } from 'stream';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Message } from './message.schema';
import mongoose, { Model, ObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'aws-sdk/clients/acm';
import { group } from 'node:console';
import { CreateMessageDto } from './dto/createMessage.dto';
import { limits } from 'argon2';
import { pagination } from 'src/common/pagination/pagination';
import { ResponseInterface } from 'src/auth/interface/ResponseInterface';
import { FileType } from 'aws-sdk/clients/iot';
import { SocketService } from 'src/socket/socket.service';
import { Conversation } from 'src/chat/chat.schema';
import { Group } from 'src/conversation/conversation.schema';
import { GroupMember } from 'src/group-participant/group-participant.schema';
// import { pipeline } from 'node:stream';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(GroupMember.name)
    private readonly groupMemberModel: Model<GroupMember>,
    private readonly socketService: SocketService,
  ) {}
  create(createMessageDto: CreateMessageDto) {
    return this.messageModel.create(createMessageDto);
  }
  async deleteMessage(id: string): Promise<Message> {
    if (!id) {
      throw new NotFoundException(`Message with id ${id} is invalid`);
    }

    const deletedMessage = await this.messageModel.findByIdAndDelete(id).exec();

    if (!deletedMessage) {
      throw new NotFoundException(`Message with id ${id} not found`);
    }

    return deletedMessage;
  }
  findAllForGroupPaginated(
    groupId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<Message[]> {
    if (!groupId) {
      throw new NotFoundException(`Group with id ${groupId} is invalid`);
    }

    const skip = (page - 1) * limit;

    return this.messageModel
      .find({ groupId: new mongoose.Types.ObjectId(groupId), isDeleted: false })
      .populate('sender', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
  async getMessages(query: {
    userId?: ObjectId;
    conversationId?: ObjectId;
    isGroup?: boolean;
    groupId?: ObjectId;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const limit = query.limit || 10;
    const page = query.page || 1;
    const skip = (page - 1) * limit;
    let queryObj: { groupId?: ObjectId; conversationId?: ObjectId } = {
      conversationId: query.conversationId,
    };
    if (query.groupId) {
      queryObj.groupId = query.groupId;
    } else {
      queryObj.conversationId = query.conversationId;
    }

    // let skip = ((query.page || 1) -1)* query.limit || 10
    const pipeline = [
      {
        $match: {
          isDeleted: false,
          ...queryObj,
        },
      },
      {
        $lookup: {
          from: 'users', // Collection where sender info is stored
          localField: 'sender', // Field in the current collection that references the sender
          foreignField: '_id', // The _id field of the "users" collection
          as: 'senderInfo', // Alias for the lookup result (an array)
          pipeline: [
            {
              $project: {
                name: 1,
                profilePicture: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          senderName: { $arrayElemAt: ['$senderInfo.name', 0] },
          profilePicture: { $arrayElemAt: ['$senderInfo.profilePicture', 0] },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: query.limit,
      },
      {
        $project: {
          senderInfo: 0,
        },
      },
    ];

    const count_pipeline = {
      isDeleted: false,
      ...queryObj,
    };

    console.log(pipeline[0]);
    const [messages, count] = await Promise.all([
      this.messageModel.aggregate(pipeline as any),
      this.messageModel.countDocuments(count_pipeline),
    ]);
    // console.log("===>",messages);

    return {
      message: 'Message Retrived Successfully',
      data: messages,
      pagination: pagination(limit, page, count),
    };
  }
  async sendFileAsMessageWithRest(
    userID: string,
    conversationID: string,
    file: any[],
    messageOn: string,
  ): Promise<ResponseInterface<Message>> {
    if (file.length < 1) {
      throw new BadRequestException('Please select a file to send');
    }
    const images = file.map((singleFile) => {
      return {
        fileUrl: `${singleFile.destination.slice(7, singleFile.destination.length)}/${singleFile.filename}`,
        type: singleFile.mimetype,
      };
    });
    let msgType: 'image' | 'video' =
      images[0].type.includes('image') ||
      images[0].type.includes('octet-stream')
        ? 'image'
        : 'video';

    let groupId = new mongoose.Types.ObjectId(
      conversationID,
    ) as unknown as ObjectId;
    let userId = new mongoose.Types.ObjectId(userID) as unknown as ObjectId;
    let msgBody: CreateMessageDto = {
      sender: userId,
      groupId: groupId,
      conversationId: groupId,
      attachments: images,
      type: msgType,
    };
    if (messageOn === 'group') {
      msgBody.conversationId = null;
      let userExist = await this.checkMyRole(
        groupId.toString(),
        userID.toString(),
      );
      console.log(userExist)
      if (!userExist) {
        // this.socketService
        //   .getSocketByUserId(userID)
        //   .emit('error', 'User Is Not From This Group');
          throw new BadRequestException('User Is Not From This Group');
      }
    } else {
      let userExist = await this.isSenderMember(groupId, userId);
      if (!userExist) {
        // this.socketService
        //   .getSocketByUserId(userID)
        //   .emit('error', 'User Is Not From This Group');
          throw new BadRequestException('User Is Not From This Group');
      }
      msgBody.groupId = null;
    }
    // let msgBody = {
    //   conversationID: conversationID,
    //   senderID: userID,
    //   receiverID: receiverID,
    //   attachment: images,
    //   messageType: msgType,
    //   seenBy: [userID],
    // };

    // let receiver = this.socketService.getSocketByUserId(receiverID);
    // // console.log(userID)
    // let sender = this.socketService.getSocketByUserId(userID);
    // console.log(sender)
    // let conversationUpdate = {
    //   _id: msgBody.conversationID,
    //   participantName: '',
    //   receiverID,
    //   messageType: msgType,
    //   lastMessage: `Shared ${msgType}`,
    //   lastMessageCreatedAt: new Date().toISOString(),
    //   profilePicture: '',
    // };
    // if(sender){
    //   sender.emit(`conversation-${conversationID}`, msgBody);
    //   sender.emit(`conversation-list-update`, conversationUpdate);
    // }
    // console.log(this.socketService.getSocketByUserId(userID))
    if (this.socketService.getSocketByUserId(userID)) {
      this.socketService.getSocketByUserId(userID).join(conversationID);
      this.socketService
        .getSocketByUserId(userID)
        .to(conversationID)
        .emit(`conversation-${conversationID}`, msgBody);
        this.socketService
          .getSocketByUserId(userID)
          .emit(`conversation-${conversationID}`, msgBody);
    }
    let message = await this.messageModel.create(msgBody);

    return { message: 'File sent successfully', data: message };
  }
async createPoll(  userID: string,
  conversationID: string,
  question:string,
  options:  { optionText: string; votes?: number }[]
){
  let userExist = await this.checkMyRole(
    conversationID.toString(),
    userID.toString(),
  );
  if (!userExist) {
    // this.socketService
    //   .getSocketByUserId(userID)
    //   .emit('error', 'User Is Not From This Group');
    throw new BadRequestException('User Is Not From This Group');
  }
  let msgBody :CreateMessageDto= {
    groupId: new mongoose.Types.ObjectId(conversationID) as unknown as ObjectId,
    conversationId:null,
    sender:  new mongoose.Types.ObjectId(userID) as unknown as ObjectId,
    poll: {
      question:question,
      options
    },
    type: "poll"
  };
  let msg = await this.messageModel.create(msgBody);
  if (this.socketService.getSocketByUserId(userID)) {
    this.socketService.getSocketByUserId(userID).join(conversationID);
    this.socketService
      .getSocketByUserId(userID)
      .to(conversationID)
      .emit(`conversation-${conversationID}`, msg);
      this.socketService
        .getSocketByUserId(userID)
        .emit(`conversation-${conversationID}`, msg);
  }
   
   return msg
}
  checkMyRole(groupId: string, userId: string) {
    return this.groupMemberModel.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId: new mongoose.Types.ObjectId(userId),
    });
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

  
}
