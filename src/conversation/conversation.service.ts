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
import { Http2ServerRequest } from 'http2';
import mongoose, { Model, Types, ObjectId } from 'mongoose';
import { ResponseInterface } from 'src/auth/interface/ResponseInterface';
import { pagination } from 'src/common/pagination/pagination';
import { GroupService } from 'src/group-participant/group-participant.service';
import { pipeline } from 'stream';

console.log('I just changed the values now .');
@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupMember.name)
    private readonly groupMemberModel: Model<GroupMember>,
    private readonly groupService: GroupService,
    // private readonly groupParticipantService: GroupMember,
  ) {}

  async checkGroupExist(name: string) {
    return this.groupModel.findOne({ name: name });
  }
  async createGroup(
    name: string,
    avatar: string,
    type: string,
    createdBy: string,
    users?: string[],
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
      type,
      createdBy: creatorId,
      admins: [creatorId],
    });
    await Promise.all([
      this.groupMemberModel.create({
        groupId: newGroup._id,
        userId: creatorId,
        role: 'admin',
      }),

      this.groupService.addAllUsersToGroup(
        new mongoose.Types.ObjectId(newGroup._id.toString()),
        users.map((u) => new mongoose.Types.ObjectId(u)),
      ),
    ]);

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

    // Create a new group member with ObjectId for groupId and userId
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
  ) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    console.log(userIds);

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

    // Check and add all users
    const addedMembers = [];
    for (const userId of userIds) {
      const existingMember = await this.groupMemberModel.findOne({
        groupId: new Types.ObjectId(groupId), // Ensure groupId is ObjectId
        userId: new Types.ObjectId(userId), // Ensure userId is ObjectId
      });
      if (existingMember) {
        throw new ForbiddenException(`An User is already in the group`);
      }

      // Add user to the group if they aren't already a member
      const newMember = await this.groupMemberModel.create({
        groupId: new Types.ObjectId(groupId),
        userId: new Types.ObjectId(userId),
        role: 'member',
      });

      addedMembers.push(newMember);
    }

    return {
      message: 'Members Added Successfully',
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
  ) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    // console.log(group)
    const remover = await this.groupService.checkMyRole(groupId, removedBy);
    console.log(groupId, userId, remover);
    if (!remover || remover.role !== 'admin')
      throw new ForbiddenException('Only admins can remove members');

    const targetUser = await this.groupService.checkMyRole(groupId, userId);
    if (!targetUser) throw new NotFoundException('User not found in the group');
    console.log(targetUser.id, userId);
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

    await this.groupMemberModel.create({
      groupId,
      userId,
      role: 'member',
    });
    return {
      message: 'User joined the group successfully',
      data: { groupId, userId },
    };
  }

  updateLastMessage(groupId: ObjectId, messageID: ObjectId): void {
    this.groupModel.findByIdAndUpdate(groupId, { lastMessage: messageID });
  }
  async getAllConversations(
    userId: string,
    page: number = 1,
    limit: number = 10,
    searchTerm?: string,
  ) {
    const userObjectId = new Types.ObjectId(userId);
    // Step 1: Find all groups where the user is a member
    const userGroupIds = await this.groupMemberModel
      .find({ userId: userObjectId })
      .select('groupId')
      .lean();

    const involvedGroupIds = userGroupIds.map((g) => g.groupId);
    // Step 2: Fetch groups, prioritizing the user's groups
    const pipeline: any = [
      {
        $match: {
          name: { $regex: new RegExp(searchTerm, 'i') },
          isActive: true,
        }, // Fetch only active groups
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
        $sort: { isUserInvolved: -1, lastActiveAt: -1 }, // User's groups first, then by last active
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
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessage',
          pipeline: [
            {
              $limit: 1,
            },
            {
              $sort: { createdAt: -1 },
            },
          ],
        },
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ['$lastMessage', null] },
          // sendAt: { $arrayElemAt: ['$sendAt', null] },
        },
      },
      {
        $project: {
          name: 1,
          avatar: 1,
          type: 1,
          lastActiveAt: 1,
          lastMessage: 1,
          isUserInvolved: 1,
        },
      },
    ];

    const [groups, totalGroups] = await Promise.all([
      this.groupModel.aggregate(pipeline).exec(),
      this.groupModel.countDocuments({
        isActive: true,
        name: { $regex: new RegExp(searchTerm, 'i') },
      }), // Count total groups
    ]);

    return {
      message: `${totalGroups} conversations found!`,
      data: groups,
      pagination: pagination(limit, page, totalGroups),
    };
  }

  async leaveGroup(
    groupId: string,
    userId: string,
  ): Promise<ResponseInterface<{ groupId: string; userId: string }>> {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    // console.log(groupId, userId);
    const user = await this.groupMemberModel.findOne({
      groupId:new mongoose.Types.ObjectId(groupId),
      userId:new mongoose.Types.ObjectId(userId)
    });

    if (!user) {
      throw new BadRequestException('User Not Found!');
    }
    await this.groupMemberModel.deleteOne({
      groupId:new mongoose.Types.ObjectId(groupId),
      userId:new mongoose.Types.ObjectId(userId)
    });
    return {
      message: 'Leave Successfully',
      data: { groupId, userId },
    };
  }
}
