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
// import { pipeline } from 'node:stream';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    // private readonly socketService:SocketService
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
    // console.log(group)

    let queryObj: {groupId?:ObjectId,conversationId?:ObjectId} = {
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
    receiverID: string,
    file: any[],
  ): Promise<ResponseInterface<Message>> {
    if (file.length < 1) {
      throw new BadRequestException('Please select a file to send');
    }
    // console.log(file);
    const images = file.map((singleFile) => {
      return {
        url: `${singleFile.destination.slice(7, singleFile.destination.length)}/${singleFile.filename}`,
        type: singleFile.mimetype,
      };
    });
    let msgType: 'image' | 'video' =
      images[0].type.includes('image') ||
      images[0].type.includes('octet-stream')
        ? 'image'
        : 'video';
    let msgBody = {
      conversationID: conversationID,
      senderID: userID,
      receiverID: receiverID,
      attachment: images,
      messageType: msgType,
      seenBy: [userID],
    };

    // let receiver = this.socketService.getSocketByUserId(receiverID);
    // // console.log(userID)
    // let sender = this.socketService.getSocketByUserId(userID);
    // console.log(sender)
    let conversationUpdate = {
      _id: msgBody.conversationID,
      participantName: '',
      receiverID,
      messageType: msgType,
      lastMessage: `Shared ${msgType}`,
      lastMessageCreatedAt: new Date().toISOString(),
      profilePicture: '',
    };
    // if(sender){
    //   sender.emit(`conversation-${conversationID}`, msgBody);
    //   sender.emit(`conversation-list-update`, conversationUpdate);
    // }

    let message = await this.messageModel.create(msgBody);
    // if (receiver) {
    //   receiver.emit(`conversation-${conversationID}`, msgBody);
    //   receiver.emit(`conversation-list-update`, conversationUpdate);
    // }
    // await this.conversationServ
    return { message: 'File sent successfully', data: message };
  }
}
