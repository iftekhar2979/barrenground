import { GroupMember } from './../group-participant/group-participant.schema';
import { Group } from './conversation.schema';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AbstractWsAdapter } from '@nestjs/websockets';
import { Http2ServerRequest } from 'http2';
import mongoose, { Model, Types, ObjectId } from 'mongoose';
import { ResponseInterface } from 'src/auth/interface/ResponseInterface';
import { Conversation } from 'src/chat/chat.schema';
import { pagination } from 'src/common/pagination/pagination';
import { GroupService } from 'src/group-participant/group-participant.service';
import { CreateMessageDto } from 'src/message/dto/createMessage.dto';
import { Message } from 'src/message/message.schema';
import { NotificationService } from 'src/notification/notification.service';
import { SocketService } from 'src/socket/socket.service';
import { User } from 'src/users/users.schema';
import { UserService } from 'src/users/users.service';
// import { pipeline, pipeline } from 'stream';

console.log('I just changed the values now .');
@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    @InjectModel(GroupMember.name)
    private readonly groupMemberModel: Model<GroupMember>,
    private readonly groupService: GroupService,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
    private readonly socketService: SocketService,
  ) {}

  async checkGroupExist(name: string) {
    return this.groupModel.findOne({ name: name });
  }
  async createGroup(
    user,
    name: string,
    avatar: string,
    type: string,
    description: string,
    createdBy: string,
    users: string[],
  ) {
    // console.time('GROUP CREATION');
    const creatorId = new mongoose.Types.ObjectId(createdBy); // Ensure it's an ObjectId
    const groupExist = await this.checkGroupExist(name);
    if (groupExist) {
      throw new HttpException('Group already exist', 400);
    }
    const newGroup = await this.groupModel.create({
      name,
      avatar,
      description,
      type,
      createdBy: creatorId,
      admins: [creatorId],
      isAccepted: false,
    });

    await Promise.all([
      this.groupMemberModel.create({
        groupId: newGroup._id,
        userId: creatorId,
        role: 'admin',
      }),

      this.notificationService.createNotification({
        userID: new mongoose.Types.ObjectId(creatorId) as unknown as ObjectId,
        message: `${name} Group Is Created Successfully `,
        key: newGroup._id as ObjectId,
        routingType: 'group',
      }),
    ]);
    console.log("users",users ,users.length);
    if (users) {
      if(users[0]==='' && users.length===1){
        return { message: 'Group Created Successfully', data: newGroup };
      }
      if (users.length > 0) {
        await Promise.all([
          await this.groupService.addAllUsersToGroup(
            new mongoose.Types.ObjectId(newGroup._id.toString()),
            users ? users.map((u) => new mongoose.Types.ObjectId(u)) : [],
          ),
          this.notificationService.batchUpdateNotificationsBulk(
            users
              ? (users.map(
                  (u) => new mongoose.Types.ObjectId(u),
                ) as unknown as ObjectId[])
              : [],
            {
              message: `You are added to ${name} group by ${user.name} `,
              routingType: 'group',
              key: newGroup._id as unknown as ObjectId,
            },
          ),
        ]);
      }
    }

    console.timeEnd('GROUP CREATION');
    return { message: 'Group Created Successfully', data: newGroup };
  }

  async addUserToGroup(groupId: string, userId: string, addedBy: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    // Public group: Anyone can join | Private group: Only members can add
    if (group.type === 'private') {
      const member = await this.groupMemberModel.findOne({
        groupId: new Types.ObjectId(groupId), // Ensure groupId is ObjectId
        userId: new Types.ObjectId(addedBy),
      });
      if (!member)
        throw new ForbiddenException(
          'Only members can add users to a private group',
        );
    }
    // Prevent duplicate entries
    const existingMember = await this.groupMemberModel.findOne({
      groupId: new Types.ObjectId(groupId), // Ensure groupId is ObjectId
      userId: new Types.ObjectId(userId), // Ensure userId is ObjectId
    });
    if (existingMember)
      throw new ForbiddenException('User is already in the group');
    await this.notificationService.createNotification({
      userID: new mongoose.Types.ObjectId(userId) as unknown as ObjectId,
      message: `You Have Added to a ${group.name} `,
      key: new Types.ObjectId(groupId) as unknown as ObjectId,
      routingType: 'group',
    });
    return {
      message: 'Member Added Successfully',
      data: await this.groupMemberModel.create({
        groupId: new Types.ObjectId(groupId), // Ensure groupId is ObjectId
        userId: new Types.ObjectId(userId), // Ensure userId is ObjectId
        role: 'member',
      }),
    };
  }
  async addAllUsersToGroup(
    groupId: string,
    userIds: string[],
    addedBy: string,
    name: string,
  ) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    // Private group: Only members can add users
    if (group.type === 'private') {
      const isMember = await this.groupMemberModel.exists({
        groupId: new Types.ObjectId(groupId),
        userId: new Types.ObjectId(addedBy),
      });

      if (!isMember)
        throw new ForbiddenException(
          'Only members can add users to a private group',
        );
    }

    const groupObjectId = new Types.ObjectId(groupId);
    const userObjectIds = userIds.map((id) => new Types.ObjectId(id));
    const [existingMembers, userInfos] = await Promise.all([
      this.groupMemberModel.find({
        groupId: groupObjectId,
        userId: { $in: userObjectIds },
      }),
      this.userModel.find({ _id: { $in: userObjectIds } }, { name: 1, _id: 1 }),
    ]);
    const existingUserIds = new Set(
      existingMembers.map((member) => member.userId.toString()),
    );

    const newUsers = userObjectIds.filter(
      (userId) => !existingUserIds.has(userId.toString()),
    );

    if (newUsers.length === 0) {
      throw new ForbiddenException('All users are already in the group');
    }

    const membersToInsert = newUsers.map((userId) => ({
      groupId: groupObjectId,
      userId,
      role: 'member',
    }));

    const [addedMembers] = await Promise.all([
      this.groupMemberModel.insertMany(membersToInsert),
    ]);
    const notifications = newUsers.map((userId) => ({
      userID: userId as unknown as ObjectId,
      message: `You have been added to ${group.name} by ${name}`,
      key: groupObjectId as unknown as mongoose.Schema.Types.ObjectId,
      routingType: 'group',
    }));
    const messagesToInsert = newUsers.map((msg) => ({
      groupId: groupObjectId as unknown as ObjectId,
      conversationId: null,
      sender: new mongoose.Types.ObjectId(addedBy) as unknown as ObjectId,
      content: `${userInfos.find((item) => item._id.toString() === msg._id.toString()).name} is Added by ${name}`,
      type: 'added',
    }));
    await Promise.all([
      this.notificationService.createNotificationsBulk(notifications),
      this.bulkCreateMessages(messagesToInsert),
    ]);
    // this.socketService
    //   .getSocketByUserId(addedBy)
    //   .to(groupId)
    //   .emit(`conversation-${groupId}`, messagesToInsert);
    // this.socketService
    //   .getSocketByUserId(addedBy)
    //   .emit(`conversation-${groupId}`, messagesToInsert);
    return {
      message: 'Members added successfully',
      data: addedMembers,
    };
  }

  /** 3️⃣ Promote a user to admin */
  async promoteUserToAdmin(
    groupId: string,
    userId: string,
    promotedBy: string,
  ) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    let groupID = new mongoose.Types.ObjectId(groupId);
    let userID = new mongoose.Types.ObjectId(userId);
    let adminID = new mongoose.Types.ObjectId(promotedBy);
    const query = {
      groupId: groupID,
      userId: adminID,
      role: { $in: ['admin', 'moderator'] },
    };
    // Only an existing admin can promote
    const isAdmin = await this.groupMemberModel.findOne(query);

    if (!isAdmin)
      throw new ForbiddenException('Only an admin can promote users');

    await this.groupMemberModel.updateOne(
      { groupId: groupID, userId: userID },
      { role: 'moderator' },
    );
    return {
      message: 'Promoted to Moderator Successfully',
      data: { groupId, userId },
    };
  }
  /** 4️⃣ Get all participants of a group */
  async getGroup(groupId: string, skip: number, limit: number) {
    return await this.groupMemberModel
      .find({ groupId: new mongoose.Types.ObjectId(groupId) })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email profilePicture');
  }
  async getGroupById(groupId: string, userId: string) {
    const userGroupIds = await this.groupMemberModel
      .find({ userId: new mongoose.Types.ObjectId(userId) })
      .select('groupId')
      .lean();
    const involvedGroupIds = userGroupIds.map((g) => g.groupId);
    let group = await this.groupModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(groupId) } },
      {
        $addFields: {
          isUserInvolved: {
            $cond: {
              if: { $in: ['$_id', involvedGroupIds] },
              then: true,
              else: false,
            },
          },
        },
      },
    ]);
    return group;
  }

  async getGroupParticipants(groupId: string, page: number, limit: number) {
    let skip = (page - 1) * limit;
    const participants = await this.getGroup(groupId, skip, limit);
    const count = await this.groupService.count(groupId);
    if (!participants || participants.length === 0) {
      throw new HttpException('No Group Found', 404);
    }
    return {
      message: 'Participants Retrived Successfully',
      data: participants,
      pagination: pagination(limit, page, count),
    };
  }

  /** 5️⃣ Admin removes a user (but not another admin) */
  async removeUserFromGroup(
    groupId: string,
    userId: string,
    removedBy: string,
    name: string,
  ) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    // console.log(group)
    const remover = await this.groupService.checkMyRole(groupId, removedBy);
    if (!remover || remover.role !== 'admin')
      throw new ForbiddenException('Only admins can remove members');

    const targetUser = await this.groupService.checkMyRole(groupId, userId);
    if (!targetUser) throw new NotFoundException('User not found in the group');
    const userInfos = await this.userModel.findById(userId).select('name');
    if (targetUser.id === userId) {
      throw new BadRequestException("You Can't Remove Your Self");
    }
    if (
      targetUser.role === 'admin' &&
      group.createdBy.toString() !== removedBy
    ) {
      throw new ForbiddenException(
        'Only the group creator can remove an admin',
      );
    }
    await this.groupService.deleteUser(groupId, userId);

    // If the user is an admin, remove them from the `admins` array
    if (targetUser.role === 'admin') {
      await this.groupModel.updateOne(
        { _id: groupId },
        { $pull: { admins: userId } },
      );
    }
    this.notificationService.createNotification({
      userID: new mongoose.Types.ObjectId(userId) as unknown as ObjectId,
      message: `You are removed by ${name}`,
      key: new Types.ObjectId(groupId) as unknown as ObjectId,
      routingType: 'group',
    });
    let bulkMessage = [
      {
        groupId: new Types.ObjectId(groupId) as unknown as ObjectId,
        conversationId: null,
        sender: new Types.ObjectId(userId) as unknown as ObjectId,
        content: `${userInfos.name} is removed by ${name}`,
        type: 'removed',
      },
    ];
    this.bulkCreateMessages(bulkMessage);

    //  console.log( this.socketService
    // .getSocketByUserId(removedBy));

    // this.socketService
    //   .getSocketByUserId(removedBy)
    //   .to(groupId)
    //   .emit(`conversation-${groupId}`, bulkMessage);
    // this.socketService
    //   .getSocketByUserId(removedBy)
    //   .emit(`conversation-${groupId}`, bulkMessage);
    return {
      message: 'User removed from the group',
      data: { groupId, userId },
    };
  }

  /** 6️⃣ Only the Super Admin can degrade an admin */
  async degradeAdmin(groupId: string, userId: string, degradedBy: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    if (group.createdBy.toString() !== degradedBy) {
      throw new ForbiddenException(
        'Only the group creator can degrade an admin',
      );
    }

    await this.groupMemberModel.updateOne(
      { groupId, userId },
      { role: 'member' },
    );
    return this.groupModel.updateOne(
      { _id: groupId },
      { $pull: { admins: userId } },
    );
  }

  /** 7️⃣ Join a Public Group */
  async joinPublicGroup(
    groupId: string,
    userId: string,
  ): Promise<ResponseInterface<{ groupId: string; userId: string }>> {
    console.log(userId);
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    if (group.type !== 'public') {
      throw new ForbiddenException('This is not a public group');
    }

    const existingMember = await this.groupMemberModel.findOne({
      groupId,
      userId,
    });

    if (existingMember) {
      throw new ForbiddenException('User is already in the group');
    }

    const userInfos = await this.userModel.findById(userId).select('name');

    let bulkMessage = [
      {
        groupId: new Types.ObjectId(groupId) as unknown as ObjectId,
        conversationId: null,
        sender: new Types.ObjectId(userId) as unknown as ObjectId,
        content: `${userInfos.name} joined the group`,
        type: 'added',
      },
    ];

    await this.groupMemberModel.create({
      groupId,
      userId,
      role: 'member',
    });
    await this.notificationService.createNotification({
      userID: new mongoose.Types.ObjectId(userId) as unknown as ObjectId,
      message: `Joined ${group.name} successfully`,
      key: new Types.ObjectId(groupId) as unknown as ObjectId,
      routingType: 'group',
    });

    this.bulkCreateMessages(bulkMessage);
    // this.socketService
    //   .getSocketByUserId(userId)
    //   .to(groupId)
    //   .emit(`conversation-${groupId}`, bulkMessage);
    // this.socketService
    //   .getSocketByUserId(userId)
    //   .emit(`conversation-${groupId}`, bulkMessage);
    return {
      message: 'User joined the group successfully',
      data: { groupId, userId },
    };
  }

  updateLastMessage(groupId: ObjectId, messageID: ObjectId) {
    return this.groupModel.findByIdAndUpdate(
      groupId,
      { lastMessage: messageID },
      { new: true },
    );
  }
  async getAllConversations(
    userId: string,
    page: number = 1,
    limit: number = 10,
    searchTerm?: string,
    query: { isUserInvolved: boolean } = { isUserInvolved: false },
    isAccepted: { isAccepted?: boolean } = { isAccepted: false },
  ) {
    try {
      console.log(isAccepted);
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const userGroupIds = await this.groupMemberModel
        .find({ userId: userObjectId })
        .select('groupId')
        .lean();
      const involvedGroupIds = userGroupIds.map((g) => g.groupId);
      const pipeline: any = [
        {
          $match: {
            name: { $regex: new RegExp(searchTerm, 'i') },
            isActive: true,
            ...isAccepted,
          },
        },
        {
          $addFields: {
            isUserInvolved: {
              $cond: {
                if: { $in: ['$_id', involvedGroupIds] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            ...query,
          },
        },

        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy',
          },
        },
        {
          $lookup: {
            from: 'groupmembers',
            localField: '_id',
            foreignField: 'groupId',
            as: 'members',
            pipeline: [{ $count: 'totalMembers' }],
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
            totalMembers: { $arrayElemAt: ['$members', 0] },
          },
        },
        {
          $project: {
            name: 1,
            avatar: 1,
            type: 1,
            description: 1,
            lastMessage: '$lastMessage.content',
            lastActiveAt: '$lastMessage.createdAt',
            totalMember: '$totalMembers.totalMembers',
            updatedAt: 1,
            createdAt: 1,
          },
        },
        {
          $sort: { updatedAt: -1 },
        },
      ];

      const count_pipline = [
        {
          $match: {
            name: { $regex: new RegExp(searchTerm, 'i') },
            isActive: true,
            ...isAccepted,
          },
        },
        {
          $addFields: {
            isUserInvolved: {
              $cond: {
                if: { $in: ['$_id', involvedGroupIds] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $match: {
            ...query,
          },
        },
        {
          $count: 'totalGroups',
        },
      ];
      const [groups, totalGroups] = await Promise.all([
        this.groupModel.aggregate(pipeline).exec(),
        this.groupModel.aggregate(count_pipline), // Count total groups
      ]);
      console.log(totalGroups);
      if (totalGroups.length === 0) {
        return {
          message: `No conversations found!`,
          data: groups,
          pagination: pagination(limit, page, 0),
        };
      }
      return {
        message: `${totalGroups[0].totalGroups} conversations found!`,
        data: groups,
        pagination: pagination(limit, page, totalGroups[0].totalGroups),
      };
    } catch (error) {
      console.log(error);
    }
  }

  async leaveGroup(
    groupId: string,
    userId: string,
  ): Promise<ResponseInterface<{ groupId: string; userId: string }>> {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    const user = await this.groupMemberModel.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!user) {
      throw new BadRequestException('User Not Found!');
    }
    await this.groupMemberModel.deleteOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    return {
      message: 'Leave Successfully',
      data: { groupId, userId },
    };
  }

  async getUsers({
    groupId,
    userId,
    page = 1,
    limit = 10,
  }: {
    groupId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    let groupUsers = await this.groupMemberModel
      .aggregate([
        {
          $match: {
            groupId: new mongoose.Types.ObjectId(groupId),
            userId: { $ne: new mongoose.Types.ObjectId(userId) }, // Exclude current user
          },
        },
        {
          $project: { _id: 1, name: 1 }, // Only the _id field (userId)
        },
      ])
      .exec();

    const friends: any = await this.conversationModel
      .aggregate([
        {
          $match: {
            participants: { $in: [new mongoose.Types.ObjectId(userId)] },
          },
        },
        {
          $project: { participants: 1 }, // Only project participants
        },
      ])
      .exec();
    const friendsList = friends
      .flatMap((conversation) =>
        conversation.participants.map((participant: any) =>
          participant.toString(),
        ),
      )
      .filter((friend) => friend !== userId);
    const friendsNotInGroup = friendsList.filter(
      (friend) => !groupUsers.includes(friend),
    );
    const totalFriends = friendsList.length;
    const skip = (page - 1) * limit;
    const friendDetails = await this.userModel
      .find({ _id: { $in: friendsNotInGroup } }) // Fetch users based on the friend IDs
      .select('name email profilePicture')
      .skip(skip)
      .limit(limit) // Only select the required fields
      .exec();

    return {
      message: 'Users Retrived',
      data: friendDetails,
      pagination: pagination(limit, page, totalFriends),
    }; // Return friends with their details
  }

  async getMyFriends({
    userId,
    page = 1,
    limit = 10,
  }: {
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const friends: any = await this.conversationModel
      .aggregate([
        {
          $match: {
            participants: { $in: [new mongoose.Types.ObjectId(userId)] },
          },
        },
        {
          $project: { participants: 1 },
        },
      ])
      .exec();

    const friendsList = friends.flatMap((conversation) =>
      conversation.participants.map((participant: any) =>
        participant.toString(),
      ),
    );

    const skip = (page - 1) * limit;
    const totalFriends = friendsList.length;
    const friendsDetails = await this.userModel
      .find({ _id: { $in: friendsList } })
      .select('name email profilePicture')
      .skip(skip)
      .limit(limit)
      .exec();

    // Return paginated results
    return {
      message: 'Users Retrived',
      data: friendsDetails,
      pagination: pagination(limit, page, totalFriends),
    };
  }

  async getAllGroupsAndUsers({
    year = 2025,
  }: {
    year: number;
    limit?: number;
    page?: number;
  }) {
    console.log(year);
    const [totalUsers, totalGroups, analytics] = await Promise.all([
      this.userService.totalAccount(),
      this.groupModel.countDocuments(),
      this.userModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(`${year}-01-01T00:00:00.000Z`),
              $lte: new Date(`${year}-12-31T23:59:59.999Z`),
            },
          },
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const chart = [
      { name: 'Jan', count: 0 },
      { name: 'Feb', count: 0 },
      { name: 'Mar', count: 0 },
      { name: 'Apr', count: 0 },
      { name: 'May', count: 0 },
      { name: 'Jun', count: 0 },
      { name: 'Jul', count: 0 },
      { name: 'Aug', count: 0 },
      { name: 'Sep', count: 0 },
      { name: 'Oct', count: 0 },
      { name: 'Nov', count: 0 },
      { name: 'Dec', count: 0 },
    ];
    analytics.forEach(({ _id, count }) => {
      chart[_id - 1].count = count;
    });

    return {
      message: '',
      data: {
        chart: chart,
        totalGroups,
        totalUsers,
      },
    };
  }
  async bulkCreateMessages(messages: CreateMessageDto[]) {
    if (!messages.length) return { message: 'No messages to create', data: [] };
    try {
      // Perform bulk insert
      const createdMessages = await this.messageModel.insertMany(messages);
      return {
        message: 'Messages created successfully',
        data: createdMessages,
      };
    } catch (error) {
      console.error('Error creating messages:', error);
      throw new Error('Failed to create messages');
    }
  }
  async verifyGroup(groupId: string) {
    await this.groupModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(groupId) },
      { isAccepted: true },
    );
    return { message: 'Group Accepted', data: {} };
  }
}
