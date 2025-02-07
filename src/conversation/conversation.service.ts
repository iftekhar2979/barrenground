import { GroupMember } from './../group-participant/group-participant.schema';
import { Group } from './conversation.schema';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupMember.name)
    private readonly groupMemberModel: Model<GroupMember>,
  ) {}

  /** 1️⃣ Create a new group */
  async createGroup(
    name: string,
    avatar: string,
    type: string,
    createdBy: string,
  ) {
    const newGroup = await this.groupModel.create({
      name,
      avatar,
      type,
      createdBy,
      admins: [createdBy],
    });

    // Add creator as a Group Member (Super Admin)
    await this.groupMemberModel.create({
      groupId: newGroup._id,
      userId: createdBy,
      role: 'admin',
    });

    return newGroup;
  }

  /** 2️⃣ Add a user to a group */
  async addUserToGroup(groupId: string, userId: string, addedBy: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    // Public group: Anyone can join | Private group: Only members can add
    if (group.type === 'private') {
      const member = await this.groupMemberModel.findOne({
        groupId,
        userId: addedBy,
      });
      if (!member)
        throw new ForbiddenException(
          'Only members can add users to a private group',
        );
    }

    // Prevent duplicate entries
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
  async getGroupParticipants(groupId: string) {
    return await this.groupMemberModel
      .find({ groupId })
      .populate('userId', 'username email');
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
}
