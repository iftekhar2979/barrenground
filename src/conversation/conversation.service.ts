import { GroupMember } from './../group-participant/group-participant.schema';
import { Group } from './conversation.schema';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Http2ServerRequest } from 'http2';
import mongoose, { Model, Types, ObjectId } from 'mongoose';
import { pagination } from 'src/common/pagination/pagination';
import { pipeline } from 'stream';
// import { ObjectId } from 'mongoose'; 

console.log("VALEISE")
@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupMember.name)
    private readonly groupMemberModel: Model<GroupMember>,
  ) {}

  async createGroup(
    name: string,
    avatar: string,
    type: string,
    createdBy: string,
  ) {
    console.time('GROUP CREATION');
    const creatorId = new mongoose.Types.ObjectId(createdBy); // Ensure it's an ObjectId

    const newGroup = await this.groupModel.create({
      name,
      avatar,
      type,
      createdBy: creatorId,
      admins: [creatorId],
    });
    await this.groupMemberModel.create({
      groupId: newGroup._id,
      userId: creatorId,
      role: 'admin',
    });
    console.timeEnd('GROUP CREATION');
    return { message: 'Group Created Successfully', data: newGroup };
  }
  async addUserToGroup(groupId: string, userId: string, addedBy: string) {
    const group = await this.groupModel.findById(groupId);
    console.log(group);
    if (!group) throw new NotFoundException('Group not found');

    // Public group: Anyone can join | Private group: Only members can add
    if (group.type === 'private') {
      const member = await this.groupMemberModel.findOne({
        groupId: new Types.ObjectId(groupId), // Ensure groupId is ObjectId
        userId: new Types.ObjectId(addedBy), // Ensure addedBy is ObjectId
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

  /** 3️⃣ Promote a user to admin */
  async promoteUserToAdmin(
    groupId: string,
    userId: string,
    promotedBy: string,
  ) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    // Only an existing admin can promote
    const isAdmin = await this.groupMemberModel.findOne({
      groupId,
      userId: promotedBy,
      role: 'admin',
    });
    if (!isAdmin)
      throw new ForbiddenException('Only an admin can promote users');

    // Update user role to admin
    await this.groupMemberModel.updateOne(
      { groupId, userId },
      { role: 'admin' },
    );

    // Ensure the admin list is updated in the Group document
    return this.groupModel.updateOne(
      { _id: groupId },
      { $addToSet: { admins: userId } },
    );
  }
  /** 4️⃣ Get all participants of a group */
  async getGroup(groupId: string) {
  return await this.groupMemberModel
      .find({groupId:new mongoose.Types.ObjectId(groupId) })
      .populate('userId', 'name email');
  }

  async getGroupParticipants(groupId: string) {
    const participants = await this.getGroup(groupId)
    if (!participants || participants.length === 0) {
      throw new HttpException("No Group Found",404)
    }
  
    return participants;
  }
  
  /** 5️⃣ Admin removes a user (but not another admin) */
  async removeUserFromGroup(
    groupId: string,
    userId: string,
    removedBy: string,
  ) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    const remover = await this.groupMemberModel.findOne({
      groupId,
      userId: removedBy,
    });
    if (!remover || remover.role !== 'admin')
      throw new ForbiddenException('Only admins can remove members');

    const targetUser = await this.groupMemberModel.findOne({ groupId, userId });
    if (!targetUser) throw new NotFoundException('User not found in the group');

    if (
      targetUser.role === 'admin' &&
      group.createdBy.toString() !== removedBy
    ) {
      throw new ForbiddenException(
        'Only the group creator can remove an admin',
      );
    }

    await this.groupMemberModel.deleteOne({ groupId, userId });

    // If the user is an admin, remove them from the `admins` array
    if (targetUser.role === 'admin') {
      await this.groupModel.updateOne(
        { _id: groupId },
        { $pull: { admins: userId } },
      );
    }

    return { message: 'User removed from the group' };
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
  async joinPublicGroup(groupId: string, userId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    if (group.type !== 'public')
      throw new ForbiddenException('This is not a public group');

    const existingMember = await this.groupMemberModel.findOne({
      groupId,
      userId,
    });
    if (existingMember)
      throw new ForbiddenException('User is already in the group');

    return await this.groupMemberModel.create({
      groupId,
      userId,
      role: 'member',
    });
  }

  async getAllConversations(userId: string, page: number = 1, limit: number = 10) {
    console.log(page,limit)
    const userObjectId = new Types.ObjectId(userId);

    // Step 1: Find all groups where the user is a member
    const userGroupIds = await this.groupMemberModel
      .find({ userId: userObjectId })
      .select('groupId')
      .lean();

    const involvedGroupIds = userGroupIds.map((g) => g.groupId);
    // Step 2: Fetch groups, prioritizing the user's groups
    const pipeline :any = [
      {
        $match: { isActive: true }, // Fetch only active groups
      },
      {
        $addFields: {
          isUserInvolved: {
            $cond: {
              if: { $in: ["$_id", involvedGroupIds] },
              then: 1,
              else: 0,
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
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $lookup: {
          from: "groupmembers",
          localField: "_id",
          foreignField: "groupId",
          as: "members",
          
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "lastMessage",
          foreignField: "_id",
          as: "lastMessage",
        },
      },
      {
        $project: {
          name: 1,
          avatar: 1,
          type: 1,
          lastActiveAt: 1,
          // createdBy:0,
          // members: { _id: 1, userId: 1, role: 1 }, // Include members
          lastMessage: { _id: 1, content: 1, sentAt: 1 },
          isUserInvolved: 1,
        },
      },
    ];

    const [groups, totalGroups] = await Promise.all([
      this.groupModel.aggregate(pipeline).exec(),
      this.groupModel.countDocuments({ isActive: true }), // Count total groups
    ]);

    return {
      message: `${totalGroups} conversations found!`,
      data: groups,
      pagination: pagination(limit,page,totalGroups)
    };
}
}
