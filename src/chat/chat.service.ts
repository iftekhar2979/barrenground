import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { pagination } from 'src/common/pagination/pagination';
import { Conversation } from './chat.schema';
import { Model, ObjectId } from 'mongoose';
import { Message } from 'src/message/message.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId as mongoID } from 'mongodb';
import { User } from 'src/users/users.schema';
import { MessageService } from 'src/message/message.service';
import { pipeline } from 'node:stream';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private messageService:MessageService,
  ) {}
  async createConversation(
    participants: string[],
    userId: string,
    lastMessage: ObjectId | null = null,
    message:string
  ): Promise<Conversation> {
    // Validate that participants array is not empty and contains at least 2 users
    if (!participants || participants.length < 2) {
      throw new Error(
        'At least two participants are required to create a conversation.',
      );
    }
    // Optionally, you could check if participants already have an existing conversation
    const existingConversation = await this.conversationModel.findOne({
      participants: { $all: participants }, 
    });

    if (existingConversation) {
      throw new ConflictException(
        'Conversation already exists between these participants.',
      );
    }

let msg = await this.messageModel.create({
    content:message,
    sender:new mongoID(userId)
})

    // Create a new conversation document
    const conversation = await this.conversationModel.create({
      participants,
      lastMessage:msg._id,
      deletedBy: [],
      isBlocked: false,
      requestedBy: new mongoID(userId),
    });

    // Save and return the conversation
    return conversation;
  }

  async checkConversation(
    participants: ObjectId[],
  ): Promise<Conversation | null> {
    const conversationExist = await this.conversationModel
      .findOne({
        participants: { $all: participants },
      })
      .exec();
    return conversationExist;
  }

  // 2. Get full conversations for a user with pagination
  async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 10,
    type: 'pending' | 'accepted' = 'accepted',
    term?:string
  ): Promise<any> {
    const skip = (page - 1) * limit;
    let lookupPipeline = [];
if (term && term.trim() !== '') {
  lookupPipeline.push({
    $match: {
      name: { $regex: term, $options: 'i' }
    }
  });
}
    let pipeline = [
      {
        $match: {
          participants: new mongoID(userId),
          deletedBy: { $nin: [new mongoID(userId)] },
        },
      },
      { $unwind: '$participants' },
      { $match: { participants: { $ne: new mongoID(userId) } } },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participantDetails',
          pipeline: lookupPipeline
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessage',
        },
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ['$lastMessage', 0] },
        },
      },
      { $unwind: '$participantDetails' },
      {
        $lookup: {
          from: 'activestatuses',
          localField: 'participantDetails._id',
          foreignField: 'userID',
          as: 'userStatus',
        },
      },
      {
        $addFields: {
          userActiveStatus: { $arrayElemAt: ['$userStatus', 0] },
        },
      },
      {
        $project: {
          _id: 1,
          participantName: '$participantDetails.name',
          participantEmail: '$participantDetails.email',
          receiverID: '$participantDetails._id',
          profilePicture: '$participantDetails.profilePicture',
          lastMessage: '$lastMessage.content',
          lastMessageCreatedAt: '$lastMessage.createdAt',
          messageType: '$lastMessage.messageType',
          isActive: '$userActiveStatus.isActive',
          lastActive: '$userActiveStatus.updatedAt',
        },
      },
      { $skip: skip },
      { $limit: limit },
      { $sort: { updatedAt: -1 } },
    ] as any[];
    let count_pipeline ={
        participants: userId,
      }
      
    if (type === 'pending') {
        pipeline[0].$match.isAccepted = false;
        pipeline[0].$match.requestedBy={$ne:new mongoID(userId)}
        count_pipeline['isAccepted'] = false;
        count_pipeline['requestedBy'] ={$ne:new mongoID(userId)}
      } else {
        pipeline[0].$match.requestedBy=new mongoID(userId)
        // pipeline[0].$match.isAccepted = true;
        count_pipeline['isAccepted'] = true;
        count_pipeline['requestedBy'] =new mongoID(userId)
      }
     
    // let conversations = await this.cacheManager.get(`conversations-${userId}`);
    let totalConversations = await this.conversationModel.countDocuments(count_pipeline);
   
    // console.log("From Cache")
    let conversations = await this.conversationModel.aggregate(pipeline);

    return {
      message: 'Conversations retrieved successfully',
      data: conversations,
      pagination: pagination(limit, page, totalConversations),
    };
  }

  // 3. Delete a conversation (soft delete or hard delete)
  async deleteConversation(
    conversationId: ObjectId,
    userId: ObjectId,
  ): Promise<any> {
    const conversation = (await this.conversationModel.findById(
      conversationId,
    )) as any;
    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }

    if (!conversation.participants.includes(userId)) {
      throw new BadRequestException(
        "You can't delete this conversation you are not part of it",
      );
    }
    // Mark the conversation as deleted by the current user
    if (!conversation.deletedBy.includes(userId)) {
      conversation.deletedBy.push(userId);
      await conversation.save();
    }
    // Check if both participants have deleted the conversation
    if (
      conversation.deletedBy.length === 2 &&
      conversation.participants.length === 2
    ) {
      // Hard delete the conversation (completely remove it)
      await this.conversationModel.findByIdAndDelete(conversationId);
    }
    // Soft delete: Mark it but do not remove it
    return { message: 'Conversation deleted successfully', data: {} };
  }
  async mediasFromConversation(
    conversationID: string,
    page = 1,
    limit = 10,
  ) {
    try {

      console.log(page,limit)
      let skip = (page - 1) * limit ;
      let pipeline = [
        {
          $match: {
            conversationID: new mongoID(conversationID), // Match conversation ID
            messageType: { $in: ['image', 'video'] }, // Filter message types
          },
        },
        {
          $unwind: {
            path: '$file', // Flatten the `file` array into individual elements
          },
        },
        {
          $skip: skip, // Apply pagination (skip the first `skip` files)
        },
        {
          $limit: limit, // Limit the result to `limit` files
        },
        {
          $group: {
            _id: null, // Group all documents into one group
            allFiles: { $push: '$file' }, // Combine paginated files into a single array
          },
        },
        {
          $project: {
            _id: 0, // Exclude `_id`
            files: '$allFiles', // Rename `allFiles` to `files`
          },
        },
      ];
      let count = [
        {
          $match: {
            conversationID: new mongoID(conversationID), // Match conversation ID
            messageType: { $in: ['image', 'video'] }, // Filter message types
          },
        },
        {
          $unwind: {
            path: '$file', // Flatten the `file` array into individual elements
          },
        },
        {
          $group: {
            _id: null, 
            totalItems: { $sum: 1 }, 
          },
        },
      ];
      const [medias, totalItems] = await Promise.all([
        this.messageModel.aggregate(pipeline),
        this.messageModel.aggregate(count),
      ]);
      if(totalItems[0].totalItems===0){
        throw new HttpException('No Data Found', HttpStatus.NOT_FOUND);
      }
      return {
        message: `Found ${totalItems[0].totalItems}`,
        data: medias[0].files,
        pagination: pagination(limit, page, totalItems[0].totalItems),
      };
    } catch (error) {
      console.log(error);
      throw new HttpException('No Data Found', HttpStatus.NOT_FOUND);
    }
  }

  async blockConversation(
    userId: ObjectId,
    conversationID: ObjectId,
  ): Promise<any> {
    const conversations = await this.conversationModel.findOne({
      participants: userId,
      _id: conversationID,
    });
    if (!conversations) {
      throw new NotFoundException('Conversation Not Exist!');
    }
    if (
      conversations.isBlocked &&
      conversations.isBlockedBy.toString() === userId.toString()
    ) {
      conversations.isBlocked = false;
      conversations.isBlockedBy = null;
      await conversations.save();
      return {
        message: ' Unblocked Successfully',
        data: conversations,
      };
    }
    if (
      conversations.isBlocked &&
      conversations.isBlockedBy.toString() !== userId.toString()
    ) {
      throw new BadRequestException('Sorry it can be possible!');
    }
    conversations.isBlocked = true;
    conversations.isBlockedBy = userId;
    await conversations.save();
    return {
      message: 'Blocked Successfully',
      data: conversations,
    };
  }

  async searchUserConversation(
    user: User,
    userName: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    // console.log(page,limit,userName)
    const escapeRegex = (string) =>
      string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sanitizedUserName = escapeRegex(userName);
    try {
      let userID = user.id;
      const query = [
        {
          $addFields: {
            opposite: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$participants',
                    // The array to filter
                    as: 'participant',
                    cond: {
                      $ne: ['$$participant', new mongoID(userID)],
                    }, // Exclude `myId`
                  },
                },
                0, // Get the first element of the filtered array
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'opposite',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $addFields: {
            userInfo: {
              $arrayElemAt: ['$user', 0],
            },
          },
        },
        {
          $match: {
            $or: [
              {
                'userInfo.name': {
                  $regex: sanitizedUserName,
                  $options: 'i',
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'messages',
            localField: 'lastMessage',
            foreignField: '_id',
            as: 'messages',
            pipeline: [
              {
                $project: {
                  content: 1,
                  messageType: 1,
                  createdAt: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            message: {
              $arrayElemAt: ['$messages', 0],
            },
          },
        },
        {
          $lookup: {
            from: 'activestatuses',
            localField: 'participantDetails._id',
            foreignField: 'userID',
            as: 'userStatus',
          },
        },
        {
          $addFields: {
            userActiveStatus: { $arrayElemAt: ['$userStatus', 0] },
          },
        },
        {
          $project: {
            _id: 1,
            participantName: '$userInfo.name',
            receiverID: '$userInfo._id',
            lastMessage: '$message.content',
            messageType: '$message.messageType',
            lastMessageCreatedAt: '$message.createdAt',
            profilePicture: '$userInfo.profilePicture',
            userActiveStatus: 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ];
      const count = [
        {
          $addFields: {
            opposite: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$participants',
                    // The array to filter
                    as: 'participant',
                    cond: {
                      $ne: ['$$participant', new mongoID(userID)],
                    }, // Exclude `myId`
                  },
                },
                0, // Get the first element of the filtered array
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'opposite',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $addFields: {
            userInfo: {
              $arrayElemAt: ['$user', 0],
            },
          },
        },
        {
          $match: {
            $or: [
              {
                'userInfo.name': {
                  $regex: userName,
                  $options: 'i',
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'messages',
            localField: 'lastMessage',
            foreignField: '_id',
            as: 'messages',
          },
        },
        {
          $addFields: {
            message: {
              $arrayElemAt: ['$messages', 0],
            },
          },
        },
        {
          $count: 'totalCount',
        },
      ];

      let countDocuments = (await this.conversationModel.aggregate(
        count,
      )) as unknown as { totalCount: [] };
      // fs.writeFileSync(path.join(__dirname, '../../', 'query.json'), JSON.stringify(query, null, 2));
      let conversation = await this.conversationModel.aggregate(query);
      return {
        message: `found  successfully`,
        data: conversation,
        pagination: pagination(limit, page, countDocuments[0].totalCount),
      };
    } catch (error) {
      throw new Error('Found No Document');
    }
  }
  async acceptMessageRequest(chatId: string, userId: string) {
    const conversation = await this.conversationModel.findById(chatId);
    
    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    if(conversation.isAccepted){
      throw new HttpException('Conversation already accepted', HttpStatus.BAD_REQUEST);
    }
    if (
      !conversation.requestedBy ||
      conversation.requestedBy.toString() !== userId
    ) {
      throw new HttpException(
        'You are not authorized to accept this request',
        HttpStatus.UNAUTHORIZED,
      );
    }
    conversation.isAccepted = true;
    await conversation.save();
    return {
      message: 'Conversation .accepted successfully',
      data: conversation,
    };
  }
}
