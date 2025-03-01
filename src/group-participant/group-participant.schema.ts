import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, ObjectId, Types } from 'mongoose';

@Schema({ timestamps: true })
export class GroupMember extends Document {
  @Prop({ type:mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true })
  groupId:mongoose.Schema.Types.ObjectId; 

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: mongoose.Schema.Types.ObjectId; 

  @Prop({ enum: ['admin', 'member',"moderator"], default: 'member' })
  role: string;
}

export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);
