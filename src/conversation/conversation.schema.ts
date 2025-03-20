import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Group extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({required:true,})
  avatar : string
  @Prop({ enum: ['public', 'private'], required: true })
  type: string; 
  @Prop({ default: false })
  isAccepted: boolean; 
  @Prop({ required: false })
  description: string; 

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId; 

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  admins: Types.ObjectId[]; 

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  lastMessage: Types.ObjectId; 

  @Prop({ type: Date, default: Date.now })
  lastActiveAt: Date; 

  @Prop({ default: true })
  isActive: boolean; 

}
export const GroupSchema = SchemaFactory.createForClass(Group);
GroupSchema.index({ updatedAt: 1 });
