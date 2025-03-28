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
    private messageService: MessageService,
  ) {}
  async createConversation(
    participants: string[],
    userId: string,
    lastMessage: ObjectId | null = null,
    message: string,
  ): Promise<any> {
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
      const cnv = await this.conversationModel.aggregate([
        {
          $match: {
            participants: {
              $all: participants.map((item) => new mongoID(item)),
            },
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
      ]);
      return {
        statusCode: 409,
        message: 'Conversation Exist',
        data: cnv[0],
      };
      // throw new ConflictException(
      //   'Conversation already exists between these participants.',
      // );
    }

    let msg: any = new this.messageModel({
      content: message,
      sender: new mongoID(userId),
    });

    // Create a new conversation document
    const conversation = new this.conversationModel({
      participants,
      lastMessage: msg._id,
      deletedBy: [],
      isBlocked: false,
      requestedBy: new mongoID(userId),
    });

    msg.conversationId = conversation._id;

    await Promise.all([msg.save(), conversation.save()]);
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
    term?: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    let lookupPipeline = [];
    if (term && term.trim() !== '') {
      lookupPipeline.push({
        $match: {
          name: { $regex: term, $options: 'i' },
        },
      });
    }
    let pipeline: any = [
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
          pipeline: lookupPipeline,
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
          updatedAt: 1,
        },
      },
      { $skip: skip },
      { $limit: limit },
      { $sort: { updatedAt: -1 } },
    ];

    // Create the base count pipeline
    let count_pipline: any = [
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
          pipeline: lookupPipeline,
        },
      },
    ];

    // Apply the condition based on the `type`
    if (type === 'pending') {
      // Modify the $match for the 'pending' type
      pipeline[0] = {
        $match: {
          participants: new mongoID(userId),
          deletedBy: { $nin: [new mongoID(userId)] },
          requestedBy: { $ne: new mongoID(userId) },
          isAccepted: false,
        },
      };

      count_pipline[0] = {
        $match: {
          participants: new mongoID(userId),
          deletedBy: { $nin: [new mongoID(userId)] },
          requestedBy: { $ne: new mongoID(userId) },
          isAccepted: false,
        },
      };
    } else {
      // Modify the $match for the other types
      pipeline[0] = {
        $match: {
          participants: new mongoID(userId),
          deletedBy: { $nin: [new mongoID(userId)] },
          $or: [
            { isAccepted: true },
            { requestedBy: { $eq: new mongoID(userId) } },
          ],
        },
      };
      count_pipline[0] = {
        $match: {
          participants: new mongoID(userId),
          deletedBy: { $nin: [new mongoID(userId)] },
          $or: [
            { isAccepted: true },
            { requestedBy: { $eq: new mongoID(userId) } },
          ],
        },
      };
      // count_pipeline[0] = {
      //   $match: {
      //     participants: new mongoID(userId),
      //     deletedBy: { $nin: [new mongoID(userId)] },
      //     $or: [
      //       { isAccepted: true },
      //       { requestedBy: { $eq: new mongoID(userId) } },
      //     ],
      //   },
      // };
    }
    let totalConversations =
      await this.conversationModel.countDocuments(count_pipline);

    // console.log("From Cache")
    let conversations = await this.conversationModel.aggregate(pipeline);
    // console.log(conversations)

    return {
      message: 'Conversations retrieved successfully',
      data: conversations,
      pagination: pagination(limit, page, totalConversations),
    };
  }
  async requestedConversation(userId: string) {
    let totalConversations = await this.conversationModel.countDocuments({
      participants: new mongoID(userId),
      deletedBy: { $nin: [new mongoID(userId)] },
      requestedBy: { $ne: new mongoID(userId) },
      isAccepted: false,
    });
    return { requests: totalConversations };
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
    type: string,
  ) {
    try {
      let skip = (page - 1) * limit;
      console.log(type);
      let matchQuery: {
        conversationId?: ObjectId;
        groupId?: ObjectId;
      } = {
        conversationId: new mongoID(conversationID) as unknown as ObjectId,
      };
      if (type === 'group') {
        delete matchQuery.conversationId;
        matchQuery.groupId = new mongoID(conversationID) as unknown as ObjectId;
      }
      let pipeline = [
        {
          $match: {
            ...matchQuery,
            type: { $in: ['image', 'video'] },
          },
        },
        {
          $unwind: {
            path: '$attachments', // Flatten the `file` array into individual elements
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
            allFiles: { $push: '$attachments' }, // Combine paginated files into a single array
          },
        },
        {
          $project: {
            _id: 0, // Exclude `_id`
            files: '$allFiles', // Rename `allFiles` to `files`
          },
        },
      ];
      console.log(pipeline[0].$match);
      let count = [
        {
          $match: {
            ...matchQuery,
            type: { $in: ['image', 'video'] }, // Filter message types
          },
        },
        {
          $unwind: {
            path: '$attachments', // Flatten the `file` array into individual elements
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
      console.log(medias);
      if (totalItems[0].totalItems === 0) {
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
    if (conversation.isAccepted) {
      throw new HttpException(
        'Conversation already accepted',
        HttpStatus.BAD_REQUEST,
      );
    }

    console.log(
      !conversation.requestedBy ||
        conversation.requestedBy.toString() == userId,
    );

    if (
      !conversation.requestedBy ||
      conversation.requestedBy.toString() == userId
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
  async updateConversation(conversationId: ObjectId, lastMessage: ObjectId) {
    let vals = await this.conversationModel.findById(conversationId);
    vals.lastMessage = lastMessage;
    await vals.save();
  }
}
