import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, mongo, ObjectId, Types } from 'mongoose';
import { GroupMember } from './group-participant.schema'; // Adjust import paths as needed
// import { group } from 'console';
// import { Group } from 'src/conversation/conversation.schema';
// import { GroupMember } from './'; // Adjust import paths as needed

@Injectable()
export class GroupService {
  constructor(
    // @InjectModel(Group.name) private groupModel: Model<Group>,
    @InjectModel(GroupMember.name) private groupMemberModel: Model<GroupMember>,
  ) {}

  // Method to add all users to a group as members
  addAllUsersToGroup(groupId: Types.ObjectId, userIds: Types.ObjectId[]) {
    const groupMembers = userIds.map((userId) => ({
      groupId,
      userId,
      role: 'member',
    }));

    return this.groupMemberModel.insertMany(groupMembers);
  }
  createAdmin(groupId: ObjectId, creatorId: ObjectId) {
    return this.groupMemberModel.create({
      groupId: groupId,
      userId: creatorId,
      role: 'admin',
    });
  }

  checkIfUserIsAdmin(groupId: ObjectId, userId: ObjectId) {
    return this.groupMemberModel
      .findOne({ groupId: groupId, userId: userId, role: 'admin' })
      .exec();
  }
  checkMyRole(groupId: string, userId: string) {
    return this.groupMemberModel.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId: new mongoose.Types.ObjectId(userId),
    });
  }
  count(groupId: string): Promise<number> {
    return this.groupMemberModel.countDocuments({
      groupId: new mongoose.Types.ObjectId(groupId),
    });
  }
  deleteUser(groupId: string, userId: string) {
    return this.groupMemberModel.deleteOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  // async getUsers({ groupId, userId }: { groupId: string; userId: string }) {
  //   return await this.groupMemberModel.aggregate([
  //     {
  //       $match:{
  //         groupId:new mongoose.Types.ObjectId(groupId),
  //         userId:new mongoose.Types.ObjectId(userId)
  //       }
  //     },
  //     {
  //       $project:{
  //         _id:1
  //       }
  //     }
  //   ])
  // }
}
