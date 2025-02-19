import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import {GroupMember } from './group-participant.schema'; // Adjust import paths as needed
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
    const groupMembers = userIds.map(userId => ({
      groupId,
      userId,
      role: 'member', 
    }))

    return  this.groupMemberModel.insertMany(groupMembers);;
  }
  createAdmin(groupId:ObjectId,creatorId:ObjectId){
    return this.groupMemberModel.create({
        groupId: groupId,
        userId: creatorId,
        role: 'admin',
      })
  }

  checkIfUserIsAdmin(groupId:ObjectId,userId:ObjectId){
    return this.groupMemberModel.findOne({groupId:groupId,userId:userId,role:"admin"}).exec();
  }
 
}
