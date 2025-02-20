import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class GroupMember extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: true, index: true })
  groupId: Types.ObjectId; 

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId; 

  @Prop({ enum: ['admin', 'member',"moderator"], default: 'member' })
  role: string;
}

export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);
